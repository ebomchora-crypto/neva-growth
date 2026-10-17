const express = require('express');
const { get, run, all } = require('../lib/db');
const A = require('../lib/auth');
const { HttpError, bad, wrap } = require('../lib/http');

const r = express.Router();
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, username: u.username || null, plan: u.plan || 'member' });

r.get('/status', (req, res) => res.json({ needsSetup: A.countUsers() === 0, user: req.user }));

// Primeiro acesso: cria o administrador. Depois disso, o cadastro público é fechado.
r.post('/setup', wrap((req, res) => {
  if (A.countUsers() > 0) throw new HttpError(403, 'A instalação já foi concluída.');
  const { name, password } = req.body || {};
  const email = A.validateEmail(req.body?.email);
  if (!name || String(name).trim().length < 2) throw bad('Informe seu nome.');
  A.validatePassword(password);
  const info = run('INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)', String(name).trim(), email, A.hashPassword(password), 'admin');
  A.createSession(res, Number(info.lastInsertRowid), req);
  res.status(201).json({ user: pub(get('SELECT * FROM users WHERE id=?', Number(info.lastInsertRowid))) });
}));

r.post('/login', wrap((req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const th = A.loginThrottle(`${req.ip}|${email}`);
  const u = get('SELECT * FROM users WHERE email=?', email);
  if (!u || !u.active || !A.verifyPassword(password, u.password_hash)) { th.fail(); throw new HttpError(401, 'E-mail ou senha incorretos.'); }
  th.ok();
  A.createSession(res, u.id, req);
  res.json({ user: pub(u) });
}));

r.post('/logout', (req, res) => { A.destroySession(req, res); res.json({ ok: true }); });

r.get('/me', A.requireAuth, (req, res) => res.json({ user: req.user }));


module.exports = r;
