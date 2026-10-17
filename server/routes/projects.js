const express = require('express');
const path = require('node:path');
const { all, get, run, tx } = require('../lib/db');
const { HttpError, bad, wrap } = require('../lib/http');
const { generate, KINDS } = require('../lib/templates');
const { zip } = require('../lib/zip');
const ai = require('../lib/ai');
const S = require('../lib/services');

const crypto = require('node:crypto');
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || crypto.randomBytes(32).toString('hex');
const PREVIEW_TTL = 12 * 3600e3;
const sign = (payload) => crypto.createHmac('sha256', PREVIEW_SECRET).update(payload).digest('base64url').slice(0, 32);
// Frames em sandbox têm origem opaca e não enviam cookies de sessão; o preview usa um token assinado no caminho.
function previewToken(projectId) { const exp = Date.now() + PREVIEW_TTL; const payload = `${projectId}.${exp}`; return `${payload}.${sign(payload)}`; }
function verifyPreviewToken(t) {
  const [id, exp, sig] = String(t).split('.');
  const good = sig && sig.length === 32 && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(`${id}.${exp}`)));
  return good && Number(exp) > Date.now() ? Number(id) : null;
}

const r = express.Router();
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const MAX_FILE = 1_000_000; const MAX_FILES = 300;

function cleanPath(p) {
  if (typeof p !== 'string') throw bad('Caminho inválido.');
  const n = path.posix.normalize(p.replace(/\\/g, '/')).replace(/^\/+/, '');
  if (!n || n.startsWith('..') || n.includes('\0') || n.length > 200 || n.endsWith('/') || !/^[\w.\-\/ ]+$/.test(n) || n.split('/').some((s) => s.startsWith('.') && s !== '.gitignore'))
    throw bad('Caminho de arquivo inválido. Use letras, números, ponto, hífen e barras.');
  return n;
}
const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'projeto';
function uniqueSlug(base) {
  let slug = base, i = 2;
  while (get('SELECT 1 x FROM projects WHERE slug=?', slug)) slug = `${base}-${i++}`;
  return slug;
}
function createProject({ name, description, kind, owner, files }) {
  return tx(() => {
    const info = run('INSERT INTO projects(name,description,kind,slug,owner_id) VALUES (?,?,?,?,?)', name, description || null, kind, uniqueSlug(slugify(name)), owner);
    const id = Number(info.lastInsertRowid);
    for (const [p, c] of Object.entries(files)) run('INSERT INTO project_files(project_id,path,content) VALUES (?,?,?)', id, cleanPath(p), String(c));
    return get('SELECT * FROM projects WHERE id=?', id);
  });
}
function extraMeta(id, b, old = {}) {
  const domain = b.domain !== undefined ? (String(b.domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null) : old.domain;
  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw bad('Domínio inválido (ex.: meusite.com.br).');
  let client_id = b.client_id !== undefined ? (b.client_id === '' || b.client_id === null ? null : Number(b.client_id)) : old.client_id;
  if (client_id != null && !get('SELECT 1 x FROM clients WHERE id=?', client_id)) throw bad('Cliente não encontrado.');
  run('UPDATE projects SET domain=?, client_id=? WHERE id=?', domain ?? null, client_id ?? null, id);
}
function projectOr404(id) {
  const p = get('SELECT * FROM projects WHERE id=?', Number(id));
  if (!p) throw new HttpError(404, 'Projeto não encontrado.');
  return p;
}
function assertEdit(req, p) {
  if (req.user.role === 'admin' || p.owner_id == null || p.owner_id === req.user.id) return;
  throw new HttpError(403, 'Somente o responsável pelo projeto ou um administrador pode alterá-lo.', 'forbidden');
}
const editable = (req) => { const p = projectOr404(req.params.id); assertEdit(req, p); return p; };
const statusOf = (p) => (p.archived ? 'arquivado' : p.published ? 'publicado' : 'desenvolvimento');
function saveVersion(projectId, filePath, oldContent, source, userId) {
  run('INSERT INTO file_versions(project_id,path,content,source,user_id) VALUES (?,?,?,?,?)', projectId, filePath, oldContent, source, userId);
  run('DELETE FROM file_versions WHERE project_id=? AND path=? AND id NOT IN (SELECT id FROM file_versions WHERE project_id=? AND path=? ORDER BY id DESC LIMIT 30)', projectId, filePath, projectId, filePath);
}
/** Grava arquivo guardando a versão anterior. Retorna { versionId } (id da versão anterior, para desfazer) */
function writeFile(project, fp, content, source, userId) {
  const old = get('SELECT content FROM project_files WHERE project_id=? AND path=?', project.id, fp);
  let versionId = null;
  if (old && old.content !== content) { saveVersion(project.id, fp, old.content, source, userId); versionId = get('SELECT MAX(id) id FROM file_versions WHERE project_id=? AND path=?', project.id, fp).id; }
  run(`INSERT INTO project_files(project_id,path,content) VALUES (?,?,?)
       ON CONFLICT(project_id,path) DO UPDATE SET content=excluded.content, updated_at=datetime('now')`, project.id, fp, content);
  return { existed: Boolean(old), versionId };
}
const touch = (id) => run("UPDATE projects SET updated_at=datetime('now') WHERE id=?", id);

r.get('/', (req, res) => {
  const rows = all(`SELECT p.*, u.name owner_name, c.name client_name, (SELECT COUNT(*) FROM project_files f WHERE f.project_id=p.id) files_count
    FROM projects p LEFT JOIN users u ON u.id=p.owner_id LEFT JOIN clients c ON c.id=p.client_id ORDER BY p.updated_at DESC`).map((p) => ({ ...p, status: statusOf(p), can_edit: req.user.role === 'admin' || p.owner_id == null || p.owner_id === req.user.id }));
  const q = String(req.query.q || '').toLowerCase();
  let items = rows.filter((p) => !q || [p.name, p.domain, p.client_name, p.slug].some((x) => x && x.toLowerCase().includes(q)));
  const stats = { acervo: rows.filter((p) => !p.archived).length, publicados: rows.filter((p) => p.status === 'publicado').length,
    desenvolvimento: rows.filter((p) => p.status === 'desenvolvimento').length, arquivados: rows.filter((p) => p.archived).length };
  if (['publicado', 'desenvolvimento', 'arquivado'].includes(req.query.status)) items = items.filter((p) => p.status === req.query.status);
  else items = items.filter((p) => !p.archived);
  res.json({ items, stats });
});
r.get('/meta/kinds', (_req, res) => res.json(KINDS));

r.post('/', wrap((req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (name.length < 2 || name.length > 80) throw bad('Informe um nome (2 a 80 caracteres).');
  const kind = ['site', 'app', 'system'].includes(b.kind) ? b.kind : 'site';
  const files = generate(kind, { name, description: b.description, tagline: b.tagline, color: b.color, blank: b.blank === true, sections: b.sections, whatsapp: b.whatsapp, email: b.email });
  const proj = createProject({ name, description: b.description, kind, owner: req.user.id, files });
  extraMeta(proj.id, b);
  res.status(201).json(get('SELECT * FROM projects WHERE id=?', proj.id));
}));

// Geração com IA (requer ANTHROPIC_API_KEY)
r.post('/generate-ai', wrap(async (req, res) => {
  const b = req.body || {};
  const brief = String(b.brief || '').trim();
  const name = String(b.name || '').trim();
  if (brief.length < 10) throw bad('Descreva o que deseja criar (mínimo 10 caracteres).');
  if (name.length < 2) throw bad('Informe um nome para o projeto.');
  const kind = ['site', 'app', 'system'].includes(b.kind) ? b.kind : 'site';
  S.checkAiQuota(req.user, 'builder');
  const style = String(b.style || '').slice(0, 200); const color = /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : null;
  const text = await ai.complete({
    maxTokens: 12000,
    system: 'Você gera projetos web estáticos completos (HTML, CSS e JavaScript puros, sem build, sem dependências externas). ' +
      'Responda APENAS com um objeto JSON: {"files":{"index.html":"...","style.css":"...","main.js":"..."}}. ' +
      'Código original, responsivo, acessível, em português do Brasil, paleta azul-gelo e branca minimalista. Máximo de 8 arquivos. Não use localStorage além de try/catch.',
    messages: [{ role: 'user', content: `Tipo: ${kind}\nNome: ${name}\nPedido: ${brief}${style ? `\nEstilo visual: ${style}` : ''}${color ? `\nCor principal: ${color}` : ''}${b.reference ? `\nReferência de design (DESIGN.md):\n${String(b.reference).slice(0, 8000)}` : ''}` }]
  });
  S.recordAiUse(req.user, 'builder');
  const m = text.match(/\{[\s\S]*\}/);
  let files;
  try { files = JSON.parse(m[0]).files; } catch { throw new HttpError(502, 'A IA não retornou um projeto válido. Tente novamente.', 'ai_bad_output'); }
  if (!files || typeof files !== 'object' || !files['index.html']) throw new HttpError(502, 'A IA não retornou um index.html.', 'ai_bad_output');
  const clean = {}; for (const [p, c] of Object.entries(files).slice(0, 8)) clean[cleanPath(p)] = String(c).slice(0, MAX_FILE);
  const proj = createProject({ name, description: brief.slice(0, 300), kind, owner: req.user.id, files: clean });
  extraMeta(proj.id, b);
  res.status(201).json({ ...get('SELECT * FROM projects WHERE id=?', proj.id), usage: S.usageOf(req.user).builder });
}));

// Otimizar prompt do builder (IA)
r.post('/optimize-prompt', wrap(async (req, res) => {
  const brief = String(req.body?.brief || '').trim();
  if (brief.length < 10) throw bad('Descreva o site (mínimo 10 caracteres).');
  if (!ai.configured()) throw new HttpError(503, 'IA não configurada. Defina ANTHROPIC_API_KEY no servidor.', 'ai_not_configured');
  S.checkAiQuota(req.user, 'optimize');
  const out = await ai.complete({ maxTokens: 1200, system: 'Reescreva o pedido do usuário como um briefing claro para gerar um site: objetivo, público, seções, tom, chamadas para ação e requisitos. Português do Brasil. Não invente dados da empresa; use [COLCHETES] onde faltar informação. Responda só com o briefing.', messages: [{ role: 'user', content: brief.slice(0, 4000) }] });
  S.recordAiUse(req.user, 'optimize');
  res.json({ brief: out.trim(), usage: S.usageOf(req.user).ai });
}));

r.get('/:id', wrap((req, res) => res.json(projectOr404(req.params.id))));
r.put('/:id', wrap((req, res) => {
  const p = editable(req); const b = req.body || {};
  const name = b.name !== undefined ? String(b.name).trim() : p.name;
  if (name.length < 2 || name.length > 80) throw bad('Nome inválido.');
  const archived = b.archived === undefined ? p.archived : (b.archived ? 1 : 0);
  run("UPDATE projects SET name=?, description=?, archived=?, published=CASE WHEN ?=1 THEN 0 ELSE published END, updated_at=datetime('now') WHERE id=?", name, b.description !== undefined ? String(b.description).slice(0, 500) : p.description, archived, archived, p.id);
  extraMeta(p.id, b, p);
  res.json(get('SELECT * FROM projects WHERE id=?', p.id));
}));
r.delete('/:id', wrap((req, res) => { const p = editable(req); run('DELETE FROM projects WHERE id=?', p.id); res.json({ ok: true }); }));
r.post('/:id/preview-token', wrap((req, res) => { const p = projectOr404(req.params.id); res.json({ url: `/preview/${previewToken(p.id)}/` }); }));
r.post('/:id/publish', wrap((req, res) => {
  const p = editable(req);
  if (p.archived) throw bad('Desarquive o projeto antes de publicar.');
  const pub = req.body?.published ? 1 : 0;
  if (pub && !get("SELECT 1 x FROM project_files WHERE project_id=? AND path='index.html'", p.id)) throw bad('Crie um index.html antes de publicar.');
  run("UPDATE projects SET published=?, updated_at=datetime('now') WHERE id=?", pub, p.id);
  res.json(get('SELECT * FROM projects WHERE id=?', p.id));
}));
r.post('/:id/duplicate', wrap((req, res) => {
  const p = projectOr404(req.params.id);
  const files = Object.fromEntries(all('SELECT path,content FROM project_files WHERE project_id=?', p.id).map((f) => [f.path, f.content]));
  res.status(201).json(createProject({ name: `${p.name} (cópia)`.slice(0, 80), description: p.description, kind: p.kind, owner: req.user.id, files }));
}));

// ---- Arquivos
r.get('/:id/files', wrap((req, res) => {
  const p = projectOr404(req.params.id);
  res.json(all('SELECT path, length(content) size, updated_at FROM project_files WHERE project_id=? ORDER BY path', p.id));
}));
r.get('/:id/file', wrap((req, res) => {
  const p = projectOr404(req.params.id);
  const f = get('SELECT path, content, updated_at FROM project_files WHERE project_id=? AND path=?', p.id, cleanPath(req.query.path));
  if (!f) throw new HttpError(404, 'Arquivo não encontrado.');
  res.json(f);
}));
r.put('/:id/file', wrap((req, res) => {
  const p = editable(req);
  const fp = cleanPath(req.body?.path); const content = req.body?.content;
  if (typeof content !== 'string') throw bad('Conteúdo inválido.');
  if (Buffer.byteLength(content) > MAX_FILE) throw bad('Arquivo maior que 1 MB.');
  const exists = get('SELECT 1 x FROM project_files WHERE project_id=? AND path=?', p.id, fp);
  if (!exists && get('SELECT COUNT(*) n FROM project_files WHERE project_id=?', p.id).n >= MAX_FILES) throw bad('Limite de arquivos do projeto atingido.');
  writeFile(p, fp, content, 'save', req.user.id);
  touch(p.id);
  res.json({ ok: true, path: fp });
}));
r.delete('/:id/file', wrap((req, res) => {
  const p = editable(req); const fp = cleanPath(req.query.path);
  // permite excluir pasta inteira com prefixo "dir/"
  const info = run('DELETE FROM project_files WHERE project_id=? AND (path=? OR path LIKE ? ESCAPE \'\\\')', p.id, fp, fp.replace(/[\\%_]/g, '\\$&') + '/%');
  if (!info.changes) throw new HttpError(404, 'Arquivo não encontrado.');
  touch(p.id); res.json({ ok: true, removed: Number(info.changes) });
}));
r.post('/:id/rename', wrap((req, res) => {
  const p = editable(req); const from = cleanPath(req.body?.from); const to = cleanPath(req.body?.to);
  if (get('SELECT 1 x FROM project_files WHERE project_id=? AND path=?', p.id, to)) throw bad('Já existe um arquivo com esse nome.');
  const info = run('UPDATE project_files SET path=? WHERE project_id=? AND path=?', to, p.id, from);
  if (!info.changes) throw new HttpError(404, 'Arquivo não encontrado.');
  touch(p.id); res.json({ ok: true });
}));

// ---- Histórico de versões
r.get('/:id/versions', wrap((req, res) => {
  const p = projectOr404(req.params.id); const fp = cleanPath(req.query.path);
  res.json(all(`SELECT v.id, v.source, v.created_at, length(v.content) size, u.name user_name FROM file_versions v LEFT JOIN users u ON u.id=v.user_id
    WHERE v.project_id=? AND v.path=? ORDER BY v.id DESC`, p.id, fp));
}));
r.get('/:id/versions/:vid', wrap((req, res) => {
  const p = projectOr404(req.params.id);
  const v = get('SELECT id, path, content, source, created_at FROM file_versions WHERE id=? AND project_id=?', Number(req.params.vid), p.id);
  if (!v) throw new HttpError(404, 'Versão não encontrada.'); res.json(v);
}));
r.post('/:id/versions/:vid/restore', wrap((req, res) => {
  const p = editable(req);
  const v = get('SELECT * FROM file_versions WHERE id=? AND project_id=?', Number(req.params.vid), p.id);
  if (!v) throw new HttpError(404, 'Versão não encontrada.');
  writeFile(p, v.path, v.content, 'restore', req.user.id); touch(p.id);
  res.json({ ok: true, path: v.path, content: v.content });
}));

// ---- Buscar e substituir
r.post('/:id/replace', wrap((req, res) => {
  const p = editable(req); const b = req.body || {};
  const find = String(b.find ?? ''); const rep = String(b.replace ?? '');
  if (find.length < 1) throw bad('Informe o texto a buscar.');
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc, b.caseSensitive ? 'g' : 'gi');
  const only = Array.isArray(b.paths) ? new Set(b.paths.map(String)) : null;
  const out = [];
  tx(() => {
    for (const f of all('SELECT path, content FROM project_files WHERE project_id=?', p.id)) {
      if (only && !only.has(f.path)) continue;
      const n = (f.content.match(re) || []).length; if (!n) continue;
      out.push({ path: f.path, count: n });
      if (!b.dryRun) writeFile(p, f.path, f.content.replace(re, () => rep), 'replace', req.user.id);
    }
  });
  if (!b.dryRun && out.length) touch(p.id);
  res.json({ files: out, total: out.reduce((a, x) => a + x.count, 0), applied: !b.dryRun });
}));

// ---- Importar arquivos (vários de uma vez)
r.post('/:id/import', wrap((req, res) => {
  const p = editable(req); const list = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!list.length) throw bad('Nenhum arquivo enviado.'); if (list.length > 150) throw bad('Máximo de 150 arquivos por importação.');
  const existing = new Set(all('SELECT path FROM project_files WHERE project_id=?', p.id).map((x) => x.path));
  const skipped = []; let created = 0, updated = 0;
  tx(() => {
    for (const f of list) {
      let fp; try { fp = cleanPath(f.path); } catch { skipped.push({ path: String(f.path), reason: 'caminho inválido' }); continue; }
      if (typeof f.content !== 'string' || f.content.includes('\0') || Buffer.byteLength(f.content) > MAX_FILE) { skipped.push({ path: fp, reason: 'arquivo binário ou maior que 1 MB' }); continue; }
      if (existing.has(fp) && !req.body.overwrite) { skipped.push({ path: fp, reason: 'já existe' }); continue; }
      if (!existing.has(fp) && existing.size >= MAX_FILES) { skipped.push({ path: fp, reason: 'limite de arquivos' }); continue; }
      writeFile(p, fp, f.content, 'import', req.user.id); if (existing.has(fp)) updated++; else { created++; existing.add(fp); }
    }
  });
  touch(p.id); res.json({ created, updated, skipped });
}));

// ---- Aplicar/Desfazer alterações propostas pela IA (com histórico)
r.post('/:id/ai-apply', wrap((req, res) => {
  const p = editable(req); const list = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!list.length || list.length > 20) throw bad('Informe de 1 a 20 arquivos.');
  const undo = [];
  tx(() => {
    for (const f of list) {
      const fp = cleanPath(f.path); if (typeof f.content !== 'string' || Buffer.byteLength(f.content) > MAX_FILE) throw bad(`Conteúdo inválido para ${fp}.`);
      const r1 = writeFile(p, fp, f.content, 'ai', req.user.id);
      undo.push({ path: fp, existed: r1.existed, versionId: r1.versionId });
    }
  });
  touch(p.id); res.json({ ok: true, undo });
}));
r.post('/:id/ai-undo', wrap((req, res) => {
  const p = editable(req); const list = Array.isArray(req.body?.undo) ? req.body.undo : [];
  tx(() => {
    for (const u of list) {
      const fp = cleanPath(u.path);
      if (!u.existed) run('DELETE FROM project_files WHERE project_id=? AND path=?', p.id, fp);
      else if (u.versionId) { const v = get('SELECT content FROM file_versions WHERE id=? AND project_id=? AND path=?', Number(u.versionId), p.id, fp); if (v) writeFile(p, fp, v.content, 'undo', req.user.id); }
    }
  });
  touch(p.id); res.json({ ok: true });
}));

r.get('/:id/search', wrap((req, res) => {
  const p = projectOr404(req.params.id); const q = String(req.query.q || '');
  if (q.length < 2) throw bad('Digite ao menos 2 caracteres.');
  const out = [];
  for (const f of all('SELECT path, content FROM project_files WHERE project_id=? ORDER BY path', p.id)) {
    f.content.split('\n').forEach((line, i) => { if (line.toLowerCase().includes(q.toLowerCase()) && out.length < 200) out.push({ path: f.path, line: i + 1, text: line.trim().slice(0, 200) }); });
  }
  res.json(out);
}));
r.get('/:id/zip', wrap((req, res) => {
  const p = projectOr404(req.params.id);
  const files = Object.fromEntries(all('SELECT path, content FROM project_files WHERE project_id=?', p.id).map((f) => [f.path, f.content]));
  res.set({ 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${p.slug}.zip"` }).send(zip(files));
}));

// ---- Serviço de arquivos (preview autenticado e site público). Executa em sandbox opaco.
const BRIDGE = `<script>(function(){function s(l,a){try{parent.postMessage({__neva:'console',level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k==='error'?'err':k==='warn'?'warn':'log',arguments);o.apply(console,arguments)}});
window.addEventListener('error',function(e){s('err',[e.message+' ('+(e.filename||'').split('/').pop()+':'+e.lineno+')'])});
window.addEventListener('unhandledrejection',function(e){s('err',['Promise rejeitada: '+e.reason])});})();<\/script>`;
function serve(project, rel, res, preview = false) {
  let fp = rel ? decodeURIComponent(rel) : 'index.html';
  if (fp.endsWith('/')) fp += 'index.html';
  try { fp = cleanPath(fp); } catch { return res.status(404).type('text').send('Não encontrado'); }
  const f = get('SELECT content FROM project_files WHERE project_id=? AND path=?', project.id, fp);
  if (!f) return res.status(404).type('text').send('Arquivo não encontrado');
  let out = f.content;
  if (preview && fp.endsWith('.html')) out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + BRIDGE) : BRIDGE + out;
  res.set({
    'content-type': MIME[path.extname(fp).toLowerCase()] || 'text/plain; charset=utf-8',
    'content-security-policy': 'sandbox allow-scripts allow-forms allow-popups allow-modals',
    'x-content-type-options': 'nosniff', 'cache-control': 'no-store'
  }).send(out);
}
const previewRouter = express.Router();
previewRouter.get(/^\/([\w.\-]+)\/(.*)$/, wrap((req, res) => {
  const id = verifyPreviewToken(req.params[0]);
  if (!id) return res.status(403).type('text').send('Link de preview inválido ou expirado. Recarregue a IDE.');
  serve(projectOr404(id), req.params[1], res, true);
}));
const publicRouter = express.Router();
publicRouter.get(/^\/([a-z0-9-]+)\/(.*)$/, (req, res) => {
  const p = get('SELECT * FROM projects WHERE slug=? AND published=1', req.params[0]);
  if (!p) return res.status(404).type('text').send('Site não encontrado ou não publicado.');
  serve(p, req.params[1], res);
});

publicRouter.get('/:slug', (req, res) => res.redirect(`/s/${req.params.slug}/`));

module.exports = { router: r, previewRouter, publicRouter };
