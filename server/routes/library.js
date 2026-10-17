const express = require('express');
const { all, get, run } = require('../lib/db');
const A = require('../lib/auth');
const S = require('../lib/services');
const { HttpError, bad } = require('../lib/http');

const r = express.Router();
const KINDS = ['prompt', 'skill', 'animation', 'design'];
const like = (q) => '%' + String(q).replace(/[\\%_]/g, '\\$&') + '%';
const locked = async (item, user) => user.role !== 'admin' && (await S.planRank(item.min_plan)) > (await S.planRank(user.plan));
const strip = async (it, user) => ((await locked(it, user)) ? { ...it, content: undefined, locked: true } : { ...it, locked: false });

r.get('/meta', async (req, res) => {
  const kind = KINDS.includes(req.query.kind) ? req.query.kind : null;
  const col = async (c) => (await all(`SELECT DISTINCT ${c} v FROM library_items WHERE published=1 AND ${c} IS NOT NULL AND ${c}<>'' ${kind ? 'AND kind=?' : ''} ORDER BY v`, ...(kind ? [kind] : []))).map((x) => x.v);
  res.json({ categories: await col('category'), niches: await col('niche'), styles: await col('style'), siteTypes: await col('site_type'), plans: await all('SELECT key,name,rank FROM plans ORDER BY rank') });
});

r.get('/', async (req, res) => {
  const w = []; const p = [];
  if (KINDS.includes(req.query.kind)) { w.push('kind=?'); p.push(req.query.kind); }
  if (req.user.role !== 'admin' || req.query.all !== '1') w.push('published=1');
  for (const [param, col] of [['category', 'category'], ['niche', 'niche'], ['style', 'style'], ['site_type', 'site_type']]) if (req.query[param]) { w.push(`${col}=?`); p.push(req.query[param]); }
  if (req.query.q) { w.push("(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')"); p.push(like(req.query.q), like(req.query.q), like(req.query.q)); }
  const sort = req.query.sort === 'recent' ? 'id DESC' : 'lower(title) ASC';
  const rows = await all(`SELECT id,kind,title,category,summary,min_plan,niche,style,site_type,url,published,created_at,updated_at FROM library_items ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY ${sort}`, ...p);
  const items = []; for (const it of rows) items.push({ ...it, locked: await locked(it, req.user) });
  res.json({ items, total: items.length });
});

r.get('/:id', async (req, res) => {
  const it = await get('SELECT * FROM library_items WHERE id=?', Number(req.params.id));
  if (!it || (!it.published && req.user.role !== 'admin')) throw new HttpError(404, 'Recurso não encontrado.');
  if (await locked(it, req.user)) throw new HttpError(403, `Este recurso exige o plano ${(await S.planOf(it.min_plan)).name} ou superior.`, 'plan_required');
  res.json(await strip(it, req.user));
});

const FIELDS = async (b, old = {}) => {
  const kind = b.kind ?? old.kind; if (!KINDS.includes(kind)) throw bad('Tipo inválido.');
  const title = String(b.title ?? old.title ?? '').trim(); if (!title || title.length > 150) throw bad('Informe um título (até 150 caracteres).');
  const content = String(b.content ?? old.content ?? ''); if (content.length > 200000) throw bad('Conteúdo muito grande.');
  const min_plan = b.min_plan ?? old.min_plan ?? 'member'; if (!(await get('SELECT 1 x FROM plans WHERE key=?', min_plan))) throw bad('Plano inválido.');
  const opt = (k, n = 120) => { const v = b[k] !== undefined ? b[k] : old[k]; return v ? String(v).trim().slice(0, n) || null : null; };
  const url = opt('url', 500); if (url && !/^https?:\/\//i.test(url)) throw bad('URL deve começar com http:// ou https://.');
  return [kind, title, opt('category'), opt('summary', 400), content, min_plan, opt('niche'), opt('style'), opt('site_type'), url, (b.published ?? old.published ?? 1) ? 1 : 0];
};
r.post('/', A.requireRole('admin'), async (req, res) => {
  const f = await FIELDS(req.body || {});
  const info = await run('INSERT INTO library_items(kind,title,category,summary,content,min_plan,niche,style,site_type,url,published,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', ...f, req.user.id);
  res.status(201).json(await get('SELECT * FROM library_items WHERE id=?', info.lastInsertRowid));
});
r.put('/:id', A.requireRole('admin'), async (req, res) => {
  const old = await get('SELECT * FROM library_items WHERE id=?', Number(req.params.id)); if (!old) throw new HttpError(404, 'Recurso não encontrado.');
  await run("UPDATE library_items SET kind=?,title=?,category=?,summary=?,content=?,min_plan=?,niche=?,style=?,site_type=?,url=?,published=?,updated_at=datetime('now') WHERE id=?", ...(await FIELDS(req.body || {}, old)), old.id);
  res.json(await get('SELECT * FROM library_items WHERE id=?', old.id));
});
r.delete('/:id', A.requireRole('admin'), async (req, res) => {
  if (!(await run('DELETE FROM library_items WHERE id=?', Number(req.params.id))).changes) throw new HttpError(404, 'Recurso não encontrado.');
  res.json({ ok: true });
});
module.exports = r;
