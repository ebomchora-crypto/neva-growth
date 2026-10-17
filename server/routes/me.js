const express = require('express');
const { all, get, run } = require('../lib/db');
const A = require('../lib/auth');
const S = require('../lib/services');
const { HttpError, bad, wrap } = require('../lib/http');

const r = express.Router();
const crypto = require('node:crypto');
const sidShort = (hash) => hash.slice(0, 16);

r.get('/', (req, res) => {
  const u = get('SELECT id,name,email,role,username,phone,plan,credits,created_at FROM users WHERE id=?', req.user.id);
  const plans = all('SELECT * FROM plans ORDER BY rank');
  res.json({ user: u, settings: S.getSettings(u.id), plan: S.planOf(u.plan), plans, usage: S.usageOf(req.user),
    unread: get('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0', u.id).n });
});

r.put('/', wrap((req, res) => {
  const b = req.body || {};
  const u = get('SELECT * FROM users WHERE id=?', req.user.id);
  const name = b.name !== undefined ? String(b.name).trim() : u.name;
  if (name.length < 2 || name.length > 100) throw bad('Informe seu nome (2 a 100 caracteres).');
  let username = b.username !== undefined ? String(b.username).trim().replace(/^@/, '').toLowerCase() : u.username;
  if (username === '') username = null;
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) throw bad('Nome de usuário: 3 a 30 caracteres (letras minúsculas, números, ponto, hífen ou _).');
  if (username && get('SELECT id FROM users WHERE username=? AND id<>?', username, u.id)) throw bad('Este nome de usuário já está em uso.');
  const phone = b.phone !== undefined ? (String(b.phone).trim().slice(0, 30) || null) : u.phone;
  run('UPDATE users SET name=?, username=?, phone=? WHERE id=?', name, username, phone, u.id);
  res.json({ user: get('SELECT id,name,email,role,username,phone,plan,credits FROM users WHERE id=?', u.id) });
}));

r.put('/password', wrap((req, res) => {
  const { current, next } = req.body || {};
  const u = get('SELECT * FROM users WHERE id=?', req.user.id);
  if (!A.verifyPassword(String(current || ''), u.password_hash)) throw bad('Senha atual incorreta.');
  A.validatePassword(next);
  run('UPDATE users SET password_hash=? WHERE id=?', A.hashPassword(next), u.id);
  // encerra as demais sessões por segurança
  const info = run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', u.id, req.sid);
  res.json({ ok: true, endedSessions: Number(info.changes) });
}));

r.put('/settings', wrap((req, res) => {
  const b = req.body || {};
  for (const [k, v] of Object.entries(b)) {
    if (!(k in S.SETTING_DEFAULTS)) throw bad(`Configuração desconhecida: ${k}`);
    let val = v;
    if (k === 'prospect_radius_km') { val = Number(v); if (!(val >= 1 && val <= 50)) throw bad('Raio deve estar entre 1 e 50 km.'); }
    else if (k === 'prospect_min_rating') { val = Number(v); if (!(val >= 0 && val <= 5)) throw bad('Nota mínima deve estar entre 0 e 5.'); }
    else val = v === true || v === 1 || v === '1' || v === 'true' ? '1' : '0';
    S.setSetting(req.user.id, k, val);
  }
  res.json(S.getSettings(req.user.id));
}));

// ---- Sessões
r.get('/sessions', (req, res) => res.json(all('SELECT token_hash,created_at,user_agent,ip,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC', req.user.id, Date.now())
  .map((s) => ({ id: sidShort(s.token_hash), current: s.token_hash === req.sid, created_at: s.created_at, user_agent: s.user_agent, ip: s.ip }))));
r.delete('/sessions/:id', wrap((req, res) => {
  const row = all('SELECT token_hash FROM sessions WHERE user_id=?', req.user.id).find((s) => sidShort(s.token_hash) === req.params.id);
  if (!row) throw new HttpError(404, 'Sessão não encontrada.');
  if (row.token_hash === req.sid) throw bad('Use "Sair" para encerrar a sessão atual.');
  run('DELETE FROM sessions WHERE token_hash=?', row.token_hash); res.json({ ok: true });
}));
r.post('/sessions/revoke-others', (req, res) => res.json({ ended: Number(run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', req.user.id, req.sid).changes) }));

// ---- Notificações
r.get('/notifications', (req, res) => res.json({
  items: all('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50', req.user.id),
  unread: get('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0', req.user.id).n }));
r.post('/notifications/read', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : null;
  if (ids) ids.forEach((id) => run('UPDATE notifications SET read=1 WHERE id=? AND user_id=?', id, req.user.id));
  else run('UPDATE notifications SET read=1 WHERE user_id=?', req.user.id);
  res.json({ ok: true });
});
r.delete('/notifications', (req, res) => { run('DELETE FROM notifications WHERE user_id=?', req.user.id); res.json({ ok: true }); });

// ---- Planos (edição somente admin)
r.put('/plans/:key', A.requireRole('admin'), wrap((req, res) => {
  const p = get('SELECT * FROM plans WHERE key=?', req.params.key);
  if (!p) throw new HttpError(404, 'Plano não encontrado.');
  const b = req.body || {};
  const num = (v, d) => (v === undefined ? d : (Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : (() => { throw bad('Limites devem ser inteiros ≥ 0.'); })()));
  run('UPDATE plans SET name=?, tagline=?, benefits=?, ai_monthly_limit=?, builder_monthly_limit=? WHERE key=?',
    String(b.name ?? p.name).slice(0, 40), String(b.tagline ?? p.tagline ?? '').slice(0, 80), String(b.benefits ?? p.benefits ?? '').slice(0, 1000),
    num(b.ai_monthly_limit, p.ai_monthly_limit), num(b.builder_monthly_limit, p.builder_monthly_limit), p.key);
  res.json(get('SELECT * FROM plans WHERE key=?', p.key));
}));

// ---- Exportação dos dados do workspace (admin)
r.get('/export', A.requireRole('admin'), (_req, res) => {
  const t = (sql) => all(sql);
  const data = { exported_at: new Date().toISOString(), schema_version: get("SELECT value FROM meta WHERE key='schema_version'")?.value,
    pipeline_stages: t('SELECT * FROM pipeline_stages'), leads: t('SELECT * FROM leads'), clients: t('SELECT * FROM clients'), activities: t('SELECT * FROM activities'),
    tasks: t('SELECT * FROM tasks'), products: t('SELECT * FROM products'), sales: t('SELECT * FROM sales'), courses: t('SELECT * FROM courses'), lessons: t('SELECT * FROM lessons'),
    projects: t('SELECT * FROM projects'), project_files: t('SELECT project_id,path,content FROM project_files'), library_items: t('SELECT * FROM library_items'), play_items: t('SELECT * FROM play_items'),
    users: t('SELECT id,name,email,role,active,username,plan,credits,created_at FROM users') };   // sem hashes de senha
  res.set({ 'content-disposition': 'attachment; filename="neva-export.json"' }).json(data);
});

module.exports = r;
