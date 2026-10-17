const express = require('express');
const { get, run } = require('../lib/db');
const A = require('../lib/auth');
const { HttpError, bad } = require('../lib/http');

const r = express.Router();
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, username: u.username || null, plan: u.plan || 'member' });
// Em produção defina SETUP_TOKEN: sem ele qualquer visitante poderia criar o primeiro administrador.
// Na Vercel (site público) o token é obrigatório: sem ele a criação do admin fica bloqueada.
const setupToken = () => process.env.SETUP_TOKEN || '';
const setupBlocked = () => Boolean(process.env.VERCEL) && !setupToken();

r.get('/status', async (req, res) => res.json({ needsSetup: (await A.countUsers()) === 0, setupTokenRequired: Boolean(setupToken()), setupBlocked: setupBlocked(), user: req.user }));

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
  await A.createSession(res, u.id, req);
  res.json({ user: pub(u) });
});

r.post('/logout', async (req, res) => { await A.destroySession(req, res); res.json({ ok: true }); });
r.get('/me', A.requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = r;
