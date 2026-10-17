const express = require('express');
const { all, get, run } = require('../lib/db');
const A = require('../lib/auth');
const { HttpError, bad, wrap } = require('../lib/http');
const r = express.Router();

r.get('/', (req, res) => {
  const items = all(`SELECT i.*, (SELECT 1 FROM play_progress p WHERE p.item_id=i.id AND p.user_id=?) AS seen FROM play_items i ${req.user.role === 'admin' && req.query.all === '1' ? '' : 'WHERE i.published=1'} ORDER BY i.category, i.id DESC`, req.user.id);
  const published = items.filter((i) => i.published);
  const seen = published.filter((i) => i.seen).length;
  res.json({ items, stats: { total: published.length, seen, percent: published.length ? Math.round((seen / published.length) * 100) : 0 }, categories: [...new Set(items.map((i) => i.category).filter(Boolean))] });
});
r.post('/:id/seen', wrap((req, res) => {
  const id = Number(req.params.id); if (!get('SELECT 1 x FROM play_items WHERE id=?', id)) throw new HttpError(404, 'Conteúdo não encontrado.');
  if (req.body?.seen === false) run('DELETE FROM play_progress WHERE user_id=? AND item_id=?', req.user.id, id);
  else run('INSERT OR IGNORE INTO play_progress(user_id,item_id) VALUES (?,?)', req.user.id, id);
  res.json({ ok: true, seen: req.body?.seen !== false });
}));
const val = (b, old = {}) => {
  const title = String(b.title ?? old.title ?? '').trim(); if (!title || title.length > 150) throw bad('Informe um título.');
  const url = String(b.video_url ?? old.video_url ?? '').trim(); if (!/^https?:\/\//i.test(url)) throw bad('Informe o link do vídeo (http/https).');
  return [title, String(b.description ?? old.description ?? '').slice(0, 1000) || null, String(b.category ?? old.category ?? '').trim().slice(0, 60) || null, url.slice(0, 500), (b.published ?? old.published ?? 1) ? 1 : 0];
};
r.post('/', A.requireRole('admin'), wrap((req, res) => {
  const info = run('INSERT INTO play_items(title,description,category,video_url,published) VALUES (?,?,?,?,?)', ...val(req.body || {}));
  res.status(201).json(get('SELECT * FROM play_items WHERE id=?', Number(info.lastInsertRowid)));
}));
r.put('/:id', A.requireRole('admin'), wrap((req, res) => {
  const old = get('SELECT * FROM play_items WHERE id=?', Number(req.params.id)); if (!old) throw new HttpError(404, 'Conteúdo não encontrado.');
  run("UPDATE play_items SET title=?,description=?,category=?,video_url=?,published=?,updated_at=datetime('now') WHERE id=?", ...val(req.body || {}, old), old.id);
  res.json(get('SELECT * FROM play_items WHERE id=?', old.id));
}));
r.delete('/:id', A.requireRole('admin'), wrap((req, res) => {
  if (!run('DELETE FROM play_items WHERE id=?', Number(req.params.id)).changes) throw new HttpError(404, 'Conteúdo não encontrado.');
  res.json({ ok: true });
}));
module.exports = r;
