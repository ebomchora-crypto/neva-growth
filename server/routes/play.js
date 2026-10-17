const express = require('express');
const { all, get, run } = require('../lib/db');
const A = require('../lib/auth');
const { HttpError, bad } = require('../lib/http');
const S = require('../lib/services');
const r = express.Router();
const SUG_LIMIT = 3;

r.get('/', async (req, res) => {
  const items = await all(`SELECT i.*, (SELECT 1 FROM play_progress p WHERE p.item_id=i.id AND p.user_id=?) AS seen FROM play_items i ${req.user.role === 'admin' && req.query.all === '1' ? '' : 'WHERE i.published=1'} ORDER BY i.category, i.id DESC`, req.user.id);
  const published = items.filter((i) => i.published);
  const seen = published.filter((i) => i.seen).length;
  res.json({ items, stats: { total: published.length, seen, percent: published.length ? Math.round((seen / published.length) * 100) : 0 }, categories: [...new Set(items.map((i) => i.category).filter(Boolean))] });
});

// ---- Sugestões de aula: o membro conta o tema e o resultado; a equipe vê os pedidos no painel do Play (limite semanal por usuário)
const weekAgo = "to_char((now() AT TIME ZONE 'utc') - interval '7 day','YYYY-MM-DD HH24:MI:SS')";
r.get('/suggestions', async (req, res) => {
  const admin = req.user.role === 'admin';
  const used = (await get(`SELECT COUNT(*) n FROM play_suggestions WHERE user_id=? AND created_at >= ${weekAgo}`, req.user.id)).n;
  const oldest = await get(`SELECT MIN(created_at) d FROM play_suggestions WHERE user_id=? AND created_at >= ${weekAgo}`, req.user.id);
  const items = await all(`SELECT s.*, u.name AS user_name FROM play_suggestions s JOIN users u ON u.id=s.user_id ${admin && req.query.all === '1' ? '' : 'WHERE s.user_id=' + Number(req.user.id)} ORDER BY s.id DESC LIMIT 100`);
  res.json({ items, limit: SUG_LIMIT, used: Number(used), remaining: Math.max(0, SUG_LIMIT - Number(used)), nextSlotFrom: Number(used) >= SUG_LIMIT ? oldest?.d : null });
});
r.post('/suggestions', A.requireRole('admin', 'member'), async (req, res) => {
  const topic = String(req.body?.topic || '').trim(); const outcome = String(req.body?.outcome || '').trim();
  if (topic.length < 3 || topic.length > 200) throw bad('Conte o tema da aula (3 a 200 caracteres).');
  if (outcome.length > 600) throw bad('O resultado esperado pode ter até 600 caracteres.');
  const used = Number((await get(`SELECT COUNT(*) n FROM play_suggestions WHERE user_id=? AND created_at >= ${weekAgo}`, req.user.id)).n);
  if (used >= SUG_LIMIT) throw new HttpError(429, `Você já enviou ${SUG_LIMIT} sugestões nos últimos 7 dias. Tente de novo em breve.`, 'suggestion_limit');
  const info = await run('INSERT INTO play_suggestions(user_id,topic,outcome) VALUES (?,?,?)', req.user.id, topic, outcome || null);
  await S.notify({ type: 'play', text: `${req.user.name} sugeriu uma aula: ${topic}`, link: '#/play', only: (await all("SELECT id FROM users WHERE role='admin' AND active=1")).map((u) => u.id), exceptUserId: req.user.id });
  res.status(201).json({ id: info.lastInsertRowid, remaining: SUG_LIMIT - used - 1 });
});
r.put('/suggestions/:id', A.requireRole('admin'), async (req, res) => {
  const status = String(req.body?.status || ''); if (!['novo', 'em_analise', 'publicado', 'recusado'].includes(status)) throw bad('Situação inválida.');
  if (!(await run('UPDATE play_suggestions SET status=? WHERE id=?', status, Number(req.params.id))).changes) throw new HttpError(404, 'Sugestão não encontrada.');
  res.json({ ok: true });
});
r.delete('/suggestions/:id', A.requireRole('admin'), async (req, res) => {
  if (!(await run('DELETE FROM play_suggestions WHERE id=?', Number(req.params.id))).changes) throw new HttpError(404, 'Sugestão não encontrada.');
  res.json({ ok: true });
});
r.post('/:id/seen', async (req, res) => {
  const id = Number(req.params.id); if (!(await get('SELECT 1 x FROM play_items WHERE id=?', id))) throw new HttpError(404, 'Conteúdo não encontrado.');
  if (req.body?.seen === false) await run('DELETE FROM play_progress WHERE user_id=? AND item_id=?', req.user.id, id);
  else await run('INSERT OR IGNORE INTO play_progress(user_id,item_id) VALUES (?,?)', req.user.id, id);
  res.json({ ok: true, seen: req.body?.seen !== false });
});
const val = (b, old = {}) => {
  const title = String(b.title ?? old.title ?? '').trim(); if (!title || title.length > 150) throw bad('Informe um título.');
  const url = String(b.video_url ?? old.video_url ?? '').trim(); if (!/^https?:\/\//i.test(url)) throw bad('Informe o link do vídeo (http/https).');
  return [title, String(b.description ?? old.description ?? '').slice(0, 1000) || null, String(b.category ?? old.category ?? '').trim().slice(0, 60) || null, url.slice(0, 500), (b.published ?? old.published ?? 1) ? 1 : 0];
};
r.post('/', A.requireRole('admin'), async (req, res) => {
  const info = await run('INSERT INTO play_items(title,description,category,video_url,published) VALUES (?,?,?,?,?)', ...val(req.body || {}));
  res.status(201).json(await get('SELECT * FROM play_items WHERE id=?', info.lastInsertRowid));
});
r.put('/:id', A.requireRole('admin'), async (req, res) => {
  const old = await get('SELECT * FROM play_items WHERE id=?', Number(req.params.id)); if (!old) throw new HttpError(404, 'Conteúdo não encontrado.');
  await run("UPDATE play_items SET title=?,description=?,category=?,video_url=?,published=?,updated_at=datetime('now') WHERE id=?", ...val(req.body || {}, old), old.id);
  res.json(await get('SELECT * FROM play_items WHERE id=?', old.id));
});
r.delete('/:id', A.requireRole('admin'), async (req, res) => {
  if (!(await run('DELETE FROM play_items WHERE id=?', Number(req.params.id))).changes) throw new HttpError(404, 'Conteúdo não encontrado.');
  res.json({ ok: true });
});
module.exports = r;
