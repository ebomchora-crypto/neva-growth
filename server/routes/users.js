const express = require('express');
const { get, run, all } = require('../lib/db');
const A = require('../lib/auth');
const { HttpError, bad } = require('../lib/http');

const r = express.Router();
// Lista básica (para selects de responsável) — qualquer usuário autenticado
r.get('/options', async (_req, res) => res.json(await all('SELECT id,name FROM users WHERE active=1 ORDER BY name')));
const COLS = 'id,name,email,role,active,plan,credits,username,created_at';

r.use(A.requireRole('admin'));
r.get('/', async (_req, res) => { const items = await all(`SELECT ${COLS} FROM users ORDER BY id`); res.json({ items, total: items.length, page: 1, limit: items.length || 1 }); });

r.post('/', async (req, res) => {
  const { name, password, role = 'member' } = req.body || {};
  const email = A.validateEmail(req.body?.email);
  if (!name || String(name).trim().length < 2) throw bad('Informe o nome.');
  if (!A.ROLES.includes(role)) throw bad('Perfil inválido.');
  A.validatePassword(password);
  if (await get('SELECT id FROM users WHERE email=?', email)) throw bad('Já existe um usuário com este e-mail.');
  const plan = req.body?.plan ?? 'member'; if (!(await get('SELECT 1 x FROM plans WHERE key=?', plan))) throw bad('Plano inválido.');
  const credits = req.body?.credits === undefined || req.body.credits === null || req.body.credits === '' ? 100 : Number(req.body.credits);
  if (!Number.isInteger(credits) || credits < 0 || credits > 1000000) throw bad('Créditos devem ser um inteiro ≥ 0.');
  const info = await run('INSERT INTO users(name,email,password_hash,role,plan,credits) VALUES (?,?,?,?,?,?)', String(name).trim(), email, A.hashPassword(password), role, plan, credits);
  res.status(201).json(await get(`SELECT ${COLS} FROM users WHERE id=?`, info.lastInsertRowid));
});

r.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const u = await get('SELECT * FROM users WHERE id=?', id);
  if (!u) throw new HttpError(404, 'Usuário não encontrado.');
  const b = req.body || {};
  const role = b.role ?? u.role;
  const active = b.active === undefined ? u.active : (b.active ? 1 : 0);
  if (!A.ROLES.includes(role)) throw bad('Perfil inválido.');
  if (id === req.user.id && (role !== 'admin' || !active)) throw bad('Você não pode rebaixar ou desativar a si mesmo.');
  const name = b.name !== undefined ? String(b.name).trim() : u.name;
  if (name.length < 2) throw bad('Informe o nome.');
  await run('UPDATE users SET name=?, role=?, active=? WHERE id=?', name, role, active, id);
  if (b.plan !== undefined) { if (!(await get('SELECT 1 x FROM plans WHERE key=?', b.plan))) throw bad('Plano inválido.'); await run('UPDATE users SET plan=? WHERE id=?', b.plan, id); }
  if (b.credits !== undefined && b.credits !== null && b.credits !== '') {
    const c = Number(b.credits); if (!Number.isInteger(c) || c < 0 || c > 1000000) throw bad('Créditos devem ser um inteiro ≥ 0.');
    await run('INSERT INTO credit_ledger(user_id,delta,reason) VALUES (?,?,?)', id, c - u.credits, `ajuste por ${req.user.email}`);
    await run('UPDATE users SET credits=? WHERE id=?', c, id);
  }
  if (b.password) { A.validatePassword(b.password); await run('UPDATE users SET password_hash=? WHERE id=?', A.hashPassword(b.password), id); }
  if (!active) await run('DELETE FROM sessions WHERE user_id=?', id);
  res.json(await get(`SELECT ${COLS} FROM users WHERE id=?`, id));
});

r.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw bad('Você não pode excluir a si mesmo.');
  const info = await run('DELETE FROM users WHERE id=?', id);
  if (!info.changes) throw new HttpError(404, 'Usuário não encontrado.');
  res.json({ ok: true });
});
module.exports = r;
