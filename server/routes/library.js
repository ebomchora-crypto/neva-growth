const express = require('express');
const { all, get, run } = require('../lib/db');
const A = require('../lib/auth');
const S = require('../lib/services');
const { HttpError, bad, wrap } = require('../lib/http');

const r = express.Router();
const KINDS = ['prompt', 'skill', 'animation', 'design'];
const like = (q) => '%' + String(q).replace(/[\\%_]/g, '\\$&') + '%';
const locked = (item, user) => S.planRank(item.min_plan) > S.planRank(user.plan) && user.role !== 'admin';
const strip = (it, user) => (locked(it, user) ? { ...it, content: undefined, locked: true } : { ...it, locked: false });

r.get('/meta', (req, res) => {
  const kind = KINDS.includes(req.query.kind) ? req.query.kind : null;
  const col = (c) => all(`SELECT DISTINCT ${c} v FROM library_items WHERE published=1 AND ${c} IS NOT NULL AND ${c}<>'' ${kind ? 'AND kind=?' : ''} ORDER BY v`, ...(kind ? [kind] : [])).map((x) => x.v);
  res.json({ categories: col('category'), niches: col('niche'), styles: col('style'), siteTypes: col('site_type'), plans: all('SELECT key,name,rank FROM plans ORDER BY rank') });
});

r.get('/', (req, res) => {
  const w = []; const p = [];
  if (KINDS.includes(req.query.kind)) { w.push('kind=?'); p.push(req.query.kind); }
  if (req.user.role !== 'admin' || req.query.all !== '1') w.push('published=1');
  for (const [param, col] of [['category', 'category'], ['niche', 'niche'], ['style', 'style'], ['site_type', 'site_type']]) if (req.query[param]) { w.push(`${col}=?`); p.push(req.query[param]); }
  if (req.query.q) { w.push("(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')"); p.push(like(req.query.q), like(req.query.q), like(req.query.q)); }
  const sort = req.query.sort === 'recent' ? 'id DESC' : 'title COLLATE NOCASE ASC';
  const items = all(`SELECT id,kind,title,category,summary,min_plan,niche,style,site_type,url,published,created_at,updated_at FROM library_items ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY ${sort}`, ...p)
    .map((it) => ({ ...it, locked: locked(it, req.user) }));
  res.json({ items, total: items.length });
});

r.get('/:id', wrap((req, res) => {
  const it = get('SELECT * FROM library_items WHERE id=?', Number(req.params.id));
  if (!it || (!it.published && req.user.role !== 'admin')) throw new HttpError(404, 'Recurso não encontrado.');
  if (locked(it, req.user)) throw new HttpError(403, `Este recurso exige o plano ${S.planOf(it.min_plan).name} ou superior.`, 'plan_required');
  res.json(strip(it, req.user));
}));

const FIELDS = (b, old = {}) => {
  const kind = b.kind ?? old.kind; if (!KINDS.includes(kind)) throw bad('Tipo inválido.');
  const title = String(b.title ?? old.title ?? '').trim(); if (!title || title.length > 150) throw bad('Informe um título (até 150 caracteres).');
  const content = String(b.content ?? old.content ?? ''); if (content.length > 200000) throw bad('Conteúdo muito grande.');
  const min_plan = b.min_plan ?? old.min_plan ?? 'member'; if (!get('SELECT 1 x FROM plans WHERE key=?', min_plan)) throw bad('Plano inválido.');
  const opt = (k, n = 120) => { const v = b[k] !== undefined ? b[k] : old[k]; return v ? String(v).trim().slice(0, n) || null : null; };
  const url = opt('url', 500); if (url && !/^https?:\/\//i.test(url)) throw bad('URL deve começar com http:// ou https://.');
  return [kind, title, opt('category'), opt('summary', 400), content, min_plan, opt('niche'), opt('style'), opt('site_type'), url, (b.published ?? old.published ?? 1) ? 1 : 0];
};
r.post('/', A.requireRole('admin'), wrap((req, res) => {
  const f = FIELDS(req.body || {});
  const info = run('INSERT INTO library_items(kind,title,category,summary,content,min_plan,niche,style,site_type,url,published,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', ...f, req.user.id);
  res.status(201).json(get('SELECT * FROM library_items WHERE id=?', Number(info.lastInsertRowid)));
}));
r.put('/:id', A.requireRole('admin'), wrap((req, res) => {
  const old = get('SELECT * FROM library_items WHERE id=?', Number(req.params.id)); if (!old) throw new HttpError(404, 'Recurso não encontrado.');
  run("UPDATE library_items SET kind=?,title=?,category=?,summary=?,content=?,min_plan=?,niche=?,style=?,site_type=?,url=?,published=?,updated_at=datetime('now') WHERE id=?", ...FIELDS(req.body || {}, old), old.id);
  res.json(get('SELECT * FROM library_items WHERE id=?', old.id));
}));
r.delete('/:id', A.requireRole('admin'), wrap((req, res) => {
  if (!run('DELETE FROM library_items WHERE id=?', Number(req.params.id)).changes) throw new HttpError(404, 'Recurso não encontrado.');
  res.json({ ok: true });
}));
module.exports = r;
