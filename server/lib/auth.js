const crypto = require('node:crypto');
const { get, run, all } = require('./db');
const { HttpError, bad } = require('./http');

const SESSION_DAYS = 14;
const COOKIE = 'neva_sid';
const ROLES = ['admin', 'member', 'viewer'];

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

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const exp = Date.now() + SESSION_DAYS * 864e5;
  run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)', sha(token), userId, exp);
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === '1', maxAge: SESSION_DAYS * 864e5, path: '/'
  });
}
function destroySession(req, res) {
  const t = readCookie(req, COOKIE);
  if (t) run('DELETE FROM sessions WHERE token_hash=?', sha(t));
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
function loadUser(req, _res, next) {
  req.user = null;
  const t = readCookie(req, COOKIE);
  if (t) {
    const row = get(
      `SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`,
      sha(t));
    if (row && row.expires_at > Date.now() && row.active) req.user = { id: row.id, name: row.name, email: row.email, role: row.role };
    else if (row) run('DELETE FROM sessions WHERE token_hash=?', sha(t));
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

// Limite simples de tentativas de login por IP+e-mail
const attempts = new Map();
function loginThrottle(key) {
  const now = Date.now();
  const a = (attempts.get(key) || []).filter((t) => now - t < 15 * 60e3);
  if (a.length >= 8) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.', 'throttled');
  return { fail() { a.push(now); attempts.set(key, a); }, ok() { attempts.delete(key); } };
}

const countUsers = () => get('SELECT COUNT(*) n FROM users').n;
module.exports = {
  ROLES, hashPassword, verifyPassword, validatePassword, validateEmail, createSession, destroySession,
  loadUser, requireAuth, requireRole, blockViewerWrites, csrfGuard, loginThrottle, countUsers, all
};
