const express = require('express');
const { all, get, run } = require('../lib/db');
const A = require('../lib/auth');
const S = require('../lib/services');
const { HttpError, bad } = require('../lib/http');

const r = express.Router();
const crypto = require('node:crypto');
const sidShort = (hash) => hash.slice(0, 16);

r.get('/', async (req, res) => {
  const u = await get('SELECT id,name,email,role,username,phone,plan,credits,created_at FROM users WHERE id=?', req.user.id);
  const plans = await all('SELECT * FROM plans ORDER BY rank');
  res.json({ user: u, settings: await S.getSettings(u.id), plan: await S.planOf(u.plan), plans, usage: await S.usageOf(req.user),
    unread: (await get('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0', u.id)).n });
});

r.put('/', async (req, res) => {
  const b = req.body || {};
  const u = await get('SELECT * FROM users WHERE id=?', req.user.id);
  const name = b.name !== undefined ? String(b.name).trim() : u.name;
  if (name.length < 2 || name.length > 100) throw bad('Informe seu nome (2 a 100 caracteres).');
  let username = b.username !== undefined ? String(b.username).trim().replace(/^@/, '').toLowerCase() : u.username;
  if (username === '') username = null;
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) throw bad('Nome de usuário: 3 a 30 caracteres (letras minúsculas, números, ponto, hífen ou _).');
  if (username && (await get('SELECT id FROM users WHERE username=? AND id<>?', username, u.id))) throw bad('Este nome de usuário já está em uso.');
  const phone = b.phone !== undefined ? (String(b.phone).trim().slice(0, 30) || null) : u.phone;
  await run('UPDATE users SET name=?, username=?, phone=? WHERE id=?', name, username, phone, u.id);
  res.json({ user: await get('SELECT id,name,email,role,username,phone,plan,credits FROM users WHERE id=?', u.id) });
});

// Troca de e-mail de acesso: exige a senha atual (não depende de envio de e-mail) e vale na hora.
r.put('/email', async (req, res) => {
  const th = A.loginThrottle(`email|${req.user.id}`, 5, 15 * 60e3);
  const u = await get('SELECT * FROM users WHERE id=?', req.user.id);
  if (!A.verifyPassword(String(req.body?.password || ''), u.password_hash)) { th.fail(); throw bad('Senha atual incorreta.'); }
  const email = A.validateEmail(req.body?.email);
  if (email === u.email) throw bad('Este já é o seu e-mail de acesso.');
  if (await get('SELECT id FROM users WHERE email=? AND id<>?', email, u.id)) throw bad('Já existe uma conta com este e-mail.');
  await run('UPDATE users SET email=? WHERE id=?', email, u.id);
  th.ok();
  res.json({ user: await get('SELECT id,name,email,role,username,phone,plan,credits FROM users WHERE id=?', u.id) });
});

r.put('/password', async (req, res) => {
  const { current, next } = req.body || {};
  const u = await get('SELECT * FROM users WHERE id=?', req.user.id);
  if (!A.verifyPassword(String(current || ''), u.password_hash)) throw bad('Senha atual incorreta.');
  A.validatePassword(next);
  await run('UPDATE users SET password_hash=? WHERE id=?', A.hashPassword(next), u.id);
  // encerra as demais sessões por segurança
  const info = await run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', u.id, req.sid);
  res.json({ ok: true, endedSessions: Number(info.changes) });
});

r.put('/settings', async (req, res) => {
  const b = req.body || {};
  for (const [k, v] of Object.entries(b)) {
    if (!(k in S.SETTING_DEFAULTS)) throw bad(`Configuração desconhecida: ${k}`);
    let val = v;
    if (k === 'prospect_radius_km') { val = Number(v); if (!(val >= 1 && val <= 50)) throw bad('Raio deve estar entre 1 e 50 km.'); }
    else if (k === 'prospect_min_rating') { val = Number(v); if (!(val >= 0 && val <= 5)) throw bad('Nota mínima deve estar entre 0 e 5.'); }
    else val = v === true || v === 1 || v === '1' || v === 'true' ? '1' : '0';
    await S.setSetting(req.user.id, k, val);
  }
  res.json(await S.getSettings(req.user.id));
});

// ---- Sessões
r.get('/sessions', async (req, res) => res.json((await all('SELECT token_hash,created_at,user_agent,ip,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC', req.user.id, Date.now()))
  .map((s) => ({ id: sidShort(s.token_hash), current: s.token_hash === req.sid, created_at: s.created_at, user_agent: s.user_agent, ip: s.ip }))));
r.delete('/sessions/:id', async (req, res) => {
  const row = (await all('SELECT token_hash FROM sessions WHERE user_id=?', req.user.id)).find((s) => sidShort(s.token_hash) === req.params.id);
  if (!row) throw new HttpError(404, 'Sessão não encontrada.');
  if (row.token_hash === req.sid) throw bad('Use "Sair" para encerrar a sessão atual.');
  await run('DELETE FROM sessions WHERE token_hash=?', row.token_hash); res.json({ ok: true });
});
r.post('/sessions/revoke-others', async (req, res) => res.json({ ended: Number((await run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', req.user.id, req.sid)).changes) }));

// ---- Notificações
r.get('/notifications', async (req, res) => res.json({
  items: await all('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50', req.user.id),
  unread: (await get('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0', req.user.id)).n }));
r.post('/notifications/read', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : null;
  if (ids) for (const id of ids) await run('UPDATE notifications SET read=1 WHERE id=? AND user_id=?', id, req.user.id);
  else await run('UPDATE notifications SET read=1 WHERE user_id=?', req.user.id);
  res.json({ ok: true });
});
r.delete('/notifications', async (req, res) => { await run('DELETE FROM notifications WHERE user_id=?', req.user.id); res.json({ ok: true }); });

// ---- Planos (edição somente admin)
r.put('/plans/:key', A.requireRole('admin'), async (req, res) => {
  const p = await get('SELECT * FROM plans WHERE key=?', req.params.key);
  if (!p) throw new HttpError(404, 'Plano não encontrado.');
  const b = req.body || {};
  const num = (v, d) => (v === undefined ? d : (Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : (() => { throw bad('Limites devem ser inteiros ≥ 0.'); })()));
  await run('UPDATE plans SET name=?, tagline=?, benefits=?, ai_monthly_limit=?, builder_monthly_limit=? WHERE key=?',
    String(b.name ?? p.name).slice(0, 40), String(b.tagline ?? p.tagline ?? '').slice(0, 80), String(b.benefits ?? p.benefits ?? '').slice(0, 1000),
    num(b.ai_monthly_limit, p.ai_monthly_limit), num(b.builder_monthly_limit, p.builder_monthly_limit), p.key);
  res.json(await get('SELECT * FROM plans WHERE key=?', p.key));
});

// ---- Exportação dos dados do workspace (admin)
r.get('/export', A.requireRole('admin'), async (req, res) => {
  const ws = req.user.ws; const t = (sql, ...p) => all(sql, ...p);   // só os dados do próprio espaço de trabalho
  const data = { exported_at: new Date().toISOString(), schema_version: (await get("SELECT value FROM meta WHERE key='schema_version'"))?.value,
    pipeline_stages: await t('SELECT * FROM pipeline_stages WHERE ws=?', ws), leads: await t('SELECT * FROM leads WHERE ws=?', ws), clients: await t('SELECT * FROM clients WHERE ws=?', ws),
    activities: await t('SELECT * FROM activities WHERE lead_id IN (SELECT id FROM leads WHERE ws=?) OR client_id IN (SELECT id FROM clients WHERE ws=?)', ws, ws),
    tasks: await t('SELECT * FROM tasks WHERE ws=?', ws), products: await t('SELECT * FROM products WHERE ws=?', ws), sales: await t('SELECT * FROM sales WHERE ws=?', ws),
    courses: await t('SELECT * FROM courses'), lessons: await t('SELECT * FROM lessons'),
    projects: await t('SELECT * FROM projects WHERE ws=?', ws), project_files: await t('SELECT project_id,path,content FROM project_files WHERE project_id IN (SELECT id FROM projects WHERE ws=?)', ws),
    library_items: await t('SELECT * FROM library_items'), play_items: await t('SELECT * FROM play_items'),
    users: await t('SELECT id,name,email,role,active,username,plan,credits,created_at FROM users WHERE ws=?', ws) };   // sem hashes de senha
  res.set({ 'content-disposition': 'attachment; filename="neva-export.json"' }).json(data);
});

module.exports = r;
