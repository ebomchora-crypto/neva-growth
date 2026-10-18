const express = require('express');
const { get, run } = require('../lib/db');
const A = require('../lib/auth');
const { HttpError, bad } = require('../lib/http');
const crypto = require('node:crypto');
const mail = require('../lib/mail');

const r = express.Router();
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, username: u.username || null, plan: u.plan || 'member' });
// Em produção defina SETUP_TOKEN: sem ele qualquer visitante poderia criar o primeiro administrador.
// Na Vercel (site público) o token é obrigatório: sem ele a criação do admin fica bloqueada.
const setupToken = () => process.env.SETUP_TOKEN || '';
const setupBlocked = () => Boolean(process.env.VERCEL) && !setupToken();
// Cadastro público aberto por padrão; SIGNUP_OPEN=0 fecha.
const signupOpen = () => process.env.SIGNUP_OPEN !== '0';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const remember = (b) => b?.remember === true || b?.remember === 'on' || b?.remember === 'true';
const baseUrl = (req) => (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

r.get('/status', async (req, res) => res.json({ needsSetup: (await A.countUsers()) === 0, setupTokenRequired: Boolean(setupToken()), setupBlocked: setupBlocked(), signupOpen: signupOpen(), mailConfigured: mail.configured(), user: req.user }));

// Primeiro acesso: cria o administrador. Depois disso, o cadastro público é fechado.
r.post('/setup', async (req, res) => {
  if ((await A.countUsers()) > 0) throw new HttpError(403, 'A instalação já foi concluída.');
  if (setupBlocked()) throw new HttpError(503, 'Instalação bloqueada: defina a variável de ambiente SETUP_TOKEN na Vercel e faça um novo deploy.', 'setup_blocked');
  if (setupToken() && String(req.body?.setupToken || '') !== setupToken()) throw new HttpError(403, 'Token de instalação inválido.', 'bad_setup_token');
  const { name, password } = req.body || {};
  const email = A.validateEmail(req.body?.email);
  if (!name || String(name).trim().length < 2) throw bad('Informe seu nome.');
  A.validatePassword(password);
  const info = await run('INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)', String(name).trim(), email, A.hashPassword(password), 'admin');
  await A.createSession(res, info.lastInsertRowid, req);
  res.status(201).json({ user: pub(await get('SELECT * FROM users WHERE id=?', info.lastInsertRowid)) });
});

r.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const th = A.loginThrottle(`${req.ip}|${email}`);
  const u = await get('SELECT * FROM users WHERE email=?', email);
  if (!u || !u.active || !A.verifyPassword(password, u.password_hash)) { th.fail(); throw new HttpError(401, 'E-mail ou senha incorretos.'); }
  th.ok();
  await A.createSession(res, u.id, req, remember(req.body));
  res.json({ user: pub(u) });
});

// Cadastro público: cria uma conta de aluno (sem acesso aos dados da operação e sem créditos pagos).
r.post('/signup', async (req, res) => {
  if (!signupOpen()) throw new HttpError(403, 'O cadastro está fechado no momento.', 'signup_closed');
  if (req.body?.website) throw bad('Não foi possível concluir o cadastro.'); // campo-isca para robôs
  const th = A.loginThrottle(`signup|${req.ip}`, 6, 60 * 60e3); // 6 contas novas por hora por IP
  const name = String(req.body?.name || '').trim();
  if (name.length < 2 || name.length > 100) throw bad('Informe seu nome (2 a 100 caracteres).');
  const username = String(req.body?.username || '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw bad('Nome de usuário: 3 a 30 caracteres (letras minúsculas, números, ponto, hífen ou _).');
  const email = A.validateEmail(req.body?.email);
  A.validatePassword(req.body?.password);
  if (/^(12345678|123456789|password|senha123|qwertyui|11111111|00000000)$/i.test(req.body.password)) throw bad('Esta senha é muito comum. Escolha outra.');
  if (await get('SELECT id FROM users WHERE email=?', email)) throw new HttpError(409, 'Já existe uma conta com este e-mail.', 'email_taken');
  if (await get('SELECT id FROM users WHERE username=?', username)) throw new HttpError(409, 'Este nome de usuário já está em uso.', 'username_taken');
  const info = await run('INSERT INTO users(name,email,username,password_hash,role,plan,credits) VALUES (?,?,?,?,?,?,?)', name, email, username, A.hashPassword(req.body.password), 'student', 'member', 0);
  th.fail();
  await A.createSession(res, info.lastInsertRowid, req, remember(req.body));
  res.status(201).json({ user: pub(await get('SELECT * FROM users WHERE id=?', info.lastInsertRowid)) });
});

// Recuperação de senha: gera um link de uso único (1 hora) e envia por e-mail. A resposta é a mesma exista ou não a conta.
r.post('/forgot', async (req, res) => {
  if (!mail.configured()) throw new HttpError(503, 'O envio de e-mails ainda não foi configurado neste servidor. Peça ao administrador para redefinir sua senha em Usuários.', 'mail_not_configured');
  const email = String(req.body?.email || '').trim().toLowerCase();
  A.loginThrottle(`forgot|${req.ip}`, 5, 60 * 60e3).fail();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const u = await get('SELECT id,name,email,active FROM users WHERE email=?', email);
    const th = A.loginThrottle(`forgot-mail|${email}`, 3, 60 * 60e3);
    if (u?.active) {
      th.fail();
      const token = crypto.randomBytes(32).toString('base64url');
      await run('DELETE FROM password_resets WHERE user_id=?', u.id);
      await run('INSERT INTO password_resets(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)', sha(token), u.id, Date.now() + 3600e3, Date.now());
      const link = `${baseUrl(req)}/#/redefinir-senha?token=${token}`;
      try {
        await mail.send({ to: u.email, subject: 'Redefinir sua senha — Neva Growth',
          text: `Olá, ${u.name}.\n\nPara criar uma nova senha, abra o link (vale por 1 hora e funciona uma única vez):\n${link}\n\nSe você não pediu isso, ignore este e-mail.`,
          html: `<p>Olá, ${u.name.replace(/[<>&]/g, '')}.</p><p>Para criar uma nova senha, use o botão abaixo. O link vale por 1 hora e funciona uma única vez.</p><p><a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#2f7bbd;color:#fff;text-decoration:none;font-weight:600">Criar nova senha</a></p><p style="color:#667">Se você não pediu isso, ignore este e-mail.</p>` });
      } catch (e) { console.error('[auth] falha ao enviar e-mail de redefinição:', e.message); }
    }
  }
  res.json({ ok: true });
});

r.post('/reset', async (req, res) => {
  const token = String(req.body?.token || '');
  A.loginThrottle(`reset|${req.ip}`, 10, 15 * 60e3).fail();
  A.validatePassword(req.body?.password);
  const row = token ? await get('SELECT * FROM password_resets WHERE token_hash=?', sha(token)) : null;
  if (!row || row.expires_at < Date.now()) throw new HttpError(400, 'Link inválido ou expirado. Peça um novo.', 'bad_reset_token');
  const u = await get('SELECT * FROM users WHERE id=?', row.user_id);
  if (!u || !u.active) throw new HttpError(400, 'Link inválido ou expirado. Peça um novo.', 'bad_reset_token');
  await run('UPDATE users SET password_hash=? WHERE id=?', A.hashPassword(req.body.password), u.id);
  await run('DELETE FROM password_resets WHERE user_id=?', u.id);
  await run('DELETE FROM sessions WHERE user_id=?', u.id); // encerra todas as sessões antigas
  await A.createSession(res, u.id, req, true);
  res.json({ user: pub(u) });
});

r.post('/logout', async (req, res) => { await A.destroySession(req, res); res.json({ ok: true }); });
r.get('/me', A.requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = r;
