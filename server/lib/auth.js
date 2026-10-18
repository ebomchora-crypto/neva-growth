const crypto = require('node:crypto');
const { get, run } = require('./db');
const { HttpError, bad } = require('./http');

const COOKIE = 'neva_sid';
const ROLES = ['admin', 'member', 'viewer', 'student'];
const REMEMBER_DAYS = 30;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(keyHex, 'hex');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) throw bad('A senha deve ter ao menos 8 caracteres.');
  if (pw.length > 200) throw bad('Senha muito longa.');
}
function validateEmail(e) {
  if (typeof e !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) throw bad('E-mail inválido.');
  return e.trim().toLowerCase();
}

// remember=true: cookie persistente por 30 dias. false: cookie de sessão (some ao fechar o navegador) e validade de 1 dia no servidor.
async function createSession(res, userId, req, remember = true) {
  const token = crypto.randomBytes(32).toString('base64url');
  const days = remember ? REMEMBER_DAYS : 1;
  const exp = Date.now() + days * 864e5;
  await run('INSERT INTO sessions(token_hash,user_id,expires_at,created_at,user_agent,ip) VALUES (?,?,?,?,?,?)', sha(token), userId, exp, Date.now(), String(req?.headers?.['user-agent'] || '').slice(0, 200), String(req?.ip || '').slice(0, 64));
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: Boolean(req?.secure) || process.env.COOKIE_SECURE === '1', path: '/', ...(remember ? { maxAge: days * 864e5 } : {})
  });
}
async function destroySession(req, res) {
  const t = readCookie(req, COOKIE);
  if (t) await run('DELETE FROM sessions WHERE token_hash=?', sha(t));
  res.clearCookie(COOKIE, { path: '/' });
}
function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// Anexa req.user quando há sessão válida
async function loadUser(req, _res, next) {
  req.user = null;
  const t = readCookie(req, COOKIE);
  if (t) {
    const row = await get(
      `SELECT u.id,u.name,u.email,u.role,u.active,u.username,u.plan,s.expires_at,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`,
      sha(t));
    if (row && row.expires_at > Date.now() && row.active) {
      req.user = { id: row.id, name: row.name, email: row.email, role: row.role, username: row.username, plan: row.plan };
      req.sid = row.token_hash;
    } else if (row) await run('DELETE FROM sessions WHERE token_hash=?', sha(t));
  }
  next();
}
function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sessão expirada. Entre novamente.', 'unauthenticated'));
  next();
}
const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Você não tem permissão para esta ação.', 'forbidden'));

// Visualizadores só leem; mutações exigem admin/member
function blockViewerWrites(req, _res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.user?.role === 'viewer')
    return next(new HttpError(403, 'Seu perfil é somente leitura.', 'forbidden'));
  next();
}
// Proteção CSRF: mutações exigem cabeçalho customizado (não enviável por formulário cross-site)
function csrfGuard(req, _res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-requested-with'] !== 'neva')
    return next(new HttpError(403, 'Requisição rejeitada (CSRF).', 'csrf'));
  next();
}

// Contas de cadastro público (role 'student') só alcançam as áreas abertas: perfil, biblioteca, Play, prompts, Academia e prospecção própria.
// Todo o resto (CRM, vendas, sites, usuários, painel, busca) são dados da operação e ficam restritos à equipe.
const STUDENT_READ = /^\/(me|library|play|prompts|courses|lessons|integrations\/status|integrations\/prospect)(\/|$)/;
const STUDENT_WRITE = /^\/(me|prompts|integrations\/prospect|play\/\d+\/seen|lessons\/\d+\/complete)(\/|$)/;
function studentGuard(req, _res, next) {
  if (req.user?.role !== 'student') return next();
  const ok = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? STUDENT_READ.test(req.path) : STUDENT_WRITE.test(req.path);
  if (!ok) return next(new HttpError(403, 'Esta área é exclusiva da equipe.', 'team_only'));
  next();
}

// Limite simples de tentativas de login por IP+e-mail
const attempts = new Map();
function loginThrottle(key, max = 8, windowMs = 15 * 60e3) {
  const now = Date.now();
  const a = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  if (a.length >= max) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.', 'throttled');
  return { fail() { a.push(now); attempts.set(key, a); }, ok() { attempts.delete(key); } };
}

const countUsers = async () => (await get('SELECT COUNT(*) n FROM users')).n;
module.exports = {
  ROLES, hashPassword, verifyPassword, validatePassword, validateEmail, createSession, destroySession,
  loadUser, studentGuard, requireAuth, requireRole, blockViewerWrites, csrfGuard, loginThrottle, countUsers
};
