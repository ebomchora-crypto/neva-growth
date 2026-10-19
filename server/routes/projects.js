const express = require('express');
const path = require('node:path');
const { all, get, run, tx } = require('../lib/db');
const { HttpError, bad, wrap } = require('../lib/http');
const { generate, KINDS } = require('../lib/templates');
const { zip } = require('../lib/zip');
const ai = require('../lib/ai');
const S = require('../lib/services');
const { extractFiles } = require('../lib/aifiles');

const crypto = require('node:crypto');
// Segredo estável entre instâncias serverless: PREVIEW_SECRET, ou derivado de DATABASE_URL; aleatório só em dev local.
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || (process.env.DATABASE_URL ? crypto.createHash('sha256').update('neva-preview:' + process.env.DATABASE_URL).digest('hex') : crypto.randomBytes(32).toString('hex'));
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
async function uniqueSlug(base) {
  let slug = base, i = 2;
  while (await get('SELECT 1 x FROM projects WHERE slug=?', slug)) slug = `${base}-${i++}`;
  return slug;
}
async function createProject({ name, description, kind, owner, files, ws }) {
  return await tx(async () => {
    const info = await run('INSERT INTO projects(name,description,kind,slug,owner_id,ws) VALUES (?,?,?,?,?,?)', name, description || null, kind, await uniqueSlug(slugify(name)), owner, ws);
    const id = Number(info.lastInsertRowid);
    for (const [p, c] of Object.entries(files)) await run('INSERT INTO project_files(project_id,path,content) VALUES (?,?,?)', id, cleanPath(p), String(c));
    return await get('SELECT * FROM projects WHERE id=?', id);
  });
}
async function extraMeta(id, b, old = {}, ws) {
  const domain = b.domain !== undefined ? (String(b.domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null) : old.domain;
  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw bad('Domínio inválido (ex.: meusite.com.br).');
  let client_id = b.client_id !== undefined ? (b.client_id === '' || b.client_id === null ? null : Number(b.client_id)) : old.client_id;
  if (client_id != null && !await get('SELECT 1 x FROM clients WHERE id=? AND ws=?', client_id, ws)) throw bad('Cliente não encontrado.');
  await run('UPDATE projects SET domain=?, client_id=? WHERE id=?', domain ?? null, client_id ?? null, id);
}
// Portfólio: link do site, capa e situação (publicado / em desenvolvimento / arquivado).
const cleanUrl = (v, label) => {
  const raw = String(v ?? '').trim(); if (!raw) return null;
  const u = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try { const x = new URL(u); if (!/^https?:$/.test(x.protocol) || !x.hostname.includes('.')) throw 0; return x.href.slice(0, 500); } catch { throw bad(`${label} inválido (ex.: https://seusite.com.br).`); }
};
async function portfolioMeta(id, b, old = {}) {
  const site_url = b.site_url !== undefined ? cleanUrl(b.site_url, 'Link do site') : old.site_url ?? null;
  const cover_url = b.cover_url !== undefined ? cleanUrl(b.cover_url, 'Imagem de capa') : old.cover_url ?? null;
  await run('UPDATE projects SET site_url=?, cover_url=? WHERE id=?', site_url, cover_url, id);
  if (b.status !== undefined) {
    if (!['publicado', 'desenvolvimento', 'arquivado'].includes(b.status)) throw bad('Status inválido.');
    const hasIndex = await get("SELECT 1 x FROM project_files WHERE project_id=? AND path='index.html'", id);
    if (b.status === 'publicado' && !hasIndex && !site_url) throw bad('Para marcar como publicado, informe o link do site.');
    await run('UPDATE projects SET published=?, archived=? WHERE id=?', b.status === 'publicado' ? 1 : 0, b.status === 'arquivado' ? 1 : 0, id);
  }
}
// `req` ausente só no preview público (token assinado); com req, o projeto precisa ser do espaço de trabalho do usuário.
async function projectOr404(id, req) {
  const p = await get('SELECT * FROM projects WHERE id=?', Number(id));
  if (!p || (req && p.ws !== req.user.ws)) throw new HttpError(404, 'Projeto não encontrado.');
  return p;
}
function assertEdit(req, p) {
  if (req.user.role === 'admin' || p.owner_id == null || p.owner_id === req.user.id) return;
  throw new HttpError(403, 'Somente o responsável pelo projeto ou um administrador pode alterá-lo.', 'forbidden');
}
const editable = async (req) => { const p = await projectOr404(req.params.id, req); assertEdit(req, p); return p; };
const statusOf = (p) => (p.archived ? 'arquivado' : p.published ? 'publicado' : 'desenvolvimento');
async function saveVersion(projectId, filePath, oldContent, source, userId) {
  await run('INSERT INTO file_versions(project_id,path,content,source,user_id) VALUES (?,?,?,?,?)', projectId, filePath, oldContent, source, userId);
  await run('DELETE FROM file_versions WHERE project_id=? AND path=? AND id NOT IN (SELECT id FROM file_versions WHERE project_id=? AND path=? ORDER BY id DESC LIMIT 30)', projectId, filePath, projectId, filePath);
}
/** Grava arquivo guardando a versão anterior. Retorna { versionId } (id da versão anterior, para desfazer) */
async function writeFile(project, fp, content, source, userId) {
  const old = await get('SELECT content FROM project_files WHERE project_id=? AND path=?', project.id, fp);
  let versionId = null;
  if (old && old.content !== content) { await saveVersion(project.id, fp, old.content, source, userId); versionId = (await get('SELECT MAX(id) id FROM file_versions WHERE project_id=? AND path=?', project.id, fp)).id; }
  await run(`INSERT INTO project_files(project_id,path,content) VALUES (?,?,?)
       ON CONFLICT(project_id,path) DO UPDATE SET content=excluded.content, updated_at=datetime('now')`, project.id, fp, content);
  return { existed: Boolean(old), versionId };
}
const touch = async (id) => await run("UPDATE projects SET updated_at=datetime('now') WHERE id=?", id);

r.get('/', async (req, res) => {
  const rows = (await all(`SELECT p.*, u.name owner_name, c.name client_name, (SELECT COUNT(*) FROM project_files f WHERE f.project_id=p.id) files_count, EXISTS (SELECT 1 FROM code_sites cs WHERE cs.project_id=p.id) studio
    FROM projects p LEFT JOIN users u ON u.id=p.owner_id LEFT JOIN clients c ON c.id=p.client_id WHERE p.ws=? ORDER BY p.updated_at DESC`, req.user.ws)).map((p) => ({ ...p, status: statusOf(p), can_edit: req.user.role === 'admin' || p.owner_id == null || p.owner_id === req.user.id }));
  const q = String(req.query.q || '').toLowerCase();
  let items = rows.filter((p) => !q || [p.name, p.domain, p.client_name, p.slug].some((x) => x && x.toLowerCase().includes(q)));
  const stats = { acervo: rows.filter((p) => !p.archived).length, publicados: rows.filter((p) => p.status === 'publicado').length,
    desenvolvimento: rows.filter((p) => p.status === 'desenvolvimento').length, arquivados: rows.filter((p) => p.archived).length };
  if (['publicado', 'desenvolvimento', 'arquivado'].includes(req.query.status)) items = items.filter((p) => p.status === req.query.status);
  else items = items.filter((p) => !p.archived);
  res.json({ items, stats });
});
r.get('/meta/kinds', async (_req, res) => res.json(KINDS));

r.post('/', async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (name.length < 2 || name.length > 80) throw bad('Informe um nome (2 a 80 caracteres).');
  const kind = ['site', 'app', 'system'].includes(b.kind) ? b.kind : 'site';
  // link:true = entrada de portfólio (só o link e os dados do site, sem arquivos)
  const files = b.link === true ? {} : generate(kind, { name, description: b.description, tagline: b.tagline, color: b.color, blank: b.blank === true, sections: b.sections, whatsapp: b.whatsapp, email: b.email });
  const proj = await createProject({ name, description: b.description, kind, owner: req.user.id, files, ws: req.user.ws });
  await extraMeta(proj.id, b, {}, req.user.ws);
  await portfolioMeta(proj.id, b);
  res.status(201).json(await get('SELECT * FROM projects WHERE id=?', proj.id));
});

// Geração com IA no estilo Lovable: só o pedido é obrigatório; a IA dá o nome, o resumo e os arquivos.
const STUDIO_STYLE = 'Design moderno e caprichado, responsivo (mobile primeiro), com hierarquia visual clara, espaçamentos generosos, tipografia boa (pode usar Google Fonts via <link>), ' +
  'microinterações em CSS e conteúdo realista em português do Brasil (sem lorem ipsum). Imagens: use somente SVG inline, gradientes, formas em CSS ou emojis — nunca URLs de imagens externas. ' +
  'HTML, CSS e JavaScript puros, sem build e sem bibliotecas externas. localStorage só dentro de try/catch.';
const BUILD_EXTRA = { low: ' Nível rápido: projeto enxuto, até 3 arquivos.', medium: ' Projeto completo, com todas as seções que o pedido sugere.', high: ' Acabamento alto: mais seções, estados (hover, foco, vazio), animações sutis e copy persuasiva.', xhigh: ' Capricho máximo: estrutura completa em até 8 arquivos, muitas seções e estados, animações sutis, acessibilidade cuidada e copy persuasiva.' };
const BUILD_TOKENS = { low: 8000, medium: 14000, high: 20000, xhigh: 28000 };
const fileContext = (files, budget = 60000) => { let ctx = ''; for (const f of files) { if (budget <= 0) break; const chunk = `\n--- ${f.path} ---\n${f.content.slice(0, Math.min(budget, 20000))}`; ctx += chunk; budget -= chunk.length; } return ctx; };

r.post('/generate-ai', async (req, res) => {
  const b = req.body || {};
  const brief = String(b.brief || '').trim();
  if (brief.length < 4) throw bad('Descreva o que você quer criar.');
  const kind = ['site', 'app', 'system'].includes(b.kind) ? b.kind : 'site';
  await S.checkAiQuota(req.user, 'builder');
  const style = String(b.style || '').slice(0, 200); const color = /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : null;
  const model = ai.resolveModel(b.model); const effort = ai.resolveEffort(model, b.effort);
  const text = await ai.complete({
    model, effort, maxTokens: BUILD_TOKENS[effort],
    system: 'Você é o Neva Studio, um criador de sites e apps por conversa (como o Lovable). Crie a primeira versão do projeto pedido. ' + STUDIO_STYLE + BUILD_EXTRA[effort] +
      '\nFormato da resposta, exatamente nesta ordem:\nNOME: <nome curto e bonito para o projeto>\nRESUMO: <2 a 4 frases contando o que você criou e sugerindo próximos passos>\n' +
      'Depois, cada arquivo COMPLETO em um bloco de código cuja PRIMEIRA LINHA DENTRO DO BLOCO é o comentário FILE (ex.: ```html\n<!-- FILE: index.html -->\n...``` ou ```css\n/* FILE: style.css */\n...```). Sempre inclua index.html. Máximo de 8 arquivos.',
    messages: [{ role: 'user', content: `Tipo: ${kind}${b.name ? `\nNome: ${String(b.name).slice(0, 80)}` : ''}\nPedido: ${brief.slice(0, 6000)}${style ? `\nEstilo visual: ${style}` : ''}${color ? `\nCor principal: ${color}` : ''}${b.reference ? `\nReferência de design (DESIGN.md):\n${String(b.reference).slice(0, 8000)}` : ''}` }]
  });
  await S.recordAiUse(req.user, 'builder');
  const { files, prose } = extractFiles(text);
  const clean = {}; for (const f of files.slice(0, 8)) { try { clean[cleanPath(f.path)] = f.content.slice(0, MAX_FILE); } catch { /* caminho inválido: ignora */ } }
  if (!clean['index.html']) throw new HttpError(502, 'A IA não entregou um index.html. Tente de novo (ou use um esforço maior).', 'ai_bad_output');
  const aiName = (prose.match(/NOME:\s*(.+)/i)?.[1] || '').replace(/[*_`#]/g, '').trim();
  const summary = (prose.match(/RESUMO:\s*([\s\S]+)/i)?.[1] || '').trim() || 'Criei a primeira versão do projeto.';
  const name = (String(b.name || '').trim() || aiName || brief.split(/\s+/).slice(0, 5).join(' ')).slice(0, 80);
  const proj = await createProject({ name, description: brief.slice(0, 300), kind, owner: req.user.id, files: clean, ws: req.user.ws });
  await extraMeta(proj.id, b, {}, req.user.ws);
  await run('INSERT INTO ai_conversations(project_id,user_id,role,content) VALUES (?,?,?,?)', proj.id, req.user.id, 'user', brief.slice(0, 20000));
  await run('INSERT INTO ai_conversations(project_id,user_id,role,content) VALUES (?,?,?,?)', proj.id, req.user.id, 'assistant', `${summary}\n\nArquivos criados: ${Object.keys(clean).join(', ')}`);
  res.status(201).json({ ...(await get('SELECT * FROM projects WHERE id=?', proj.id)), summary, files: Object.keys(clean), usage: (await S.usageOf(req.user)).builder });
});

// Otimizar prompt do builder (IA)
r.post('/optimize-prompt', async (req, res) => {
  const brief = String(req.body?.brief || '').trim();
  if (brief.length < 10) throw bad('Descreva o site (mínimo 10 caracteres).');
  if (!ai.configured()) throw new HttpError(503, ai.NOT_CONFIGURED, 'ai_not_configured');
  await S.checkAiQuota(req.user, 'optimize');
  const out = await ai.complete({ maxTokens: 1200, system: 'Reescreva o pedido do usuário como um briefing claro para gerar um site: objetivo, público, seções, tom, chamadas para ação e requisitos. Português do Brasil. Não invente dados da empresa; use [COLCHETES] onde faltar informação. Responda só com o briefing.', messages: [{ role: 'user', content: brief.slice(0, 4000) }] });
  await S.recordAiUse(req.user, 'optimize');
  res.json({ brief: out.trim(), usage: (await S.usageOf(req.user)).ai });
});

r.get('/:id', async (req, res) => res.json(await projectOr404(req.params.id, req)));
r.put('/:id', async (req, res) => {
  const p = await editable(req); const b = req.body || {};
  const name = b.name !== undefined ? String(b.name).trim() : p.name;
  if (name.length < 2 || name.length > 80) throw bad('Nome inválido.');
  const archived = b.archived === undefined ? p.archived : (b.archived ? 1 : 0);
  await run("UPDATE projects SET name=?, description=?, archived=?, published=CASE WHEN ?=1 THEN 0 ELSE published END, updated_at=datetime('now') WHERE id=?", name, b.description !== undefined ? String(b.description).slice(0, 500) : p.description, archived, archived, p.id);
  await extraMeta(p.id, b, p, req.user.ws);
  await portfolioMeta(p.id, b, p);
  res.json(await get('SELECT * FROM projects WHERE id=?', p.id));
});
r.delete('/:id', async (req, res) => { const p = await editable(req); await run('DELETE FROM projects WHERE id=?', p.id); res.json({ ok: true }); });
r.post('/:id/preview-token', async (req, res) => { const p = await projectOr404(req.params.id, req); res.json({ url: `/preview/${previewToken(p.id)}/` }); });
r.post('/:id/publish', async (req, res) => {
  const p = await editable(req);
  if (p.archived) throw bad('Desarquive o projeto antes de publicar.');
  const pub = req.body?.published ? 1 : 0;
  if (pub && !await get("SELECT 1 x FROM project_files WHERE project_id=? AND path='index.html'", p.id)) throw bad('Crie um index.html antes de publicar.');
  await run("UPDATE projects SET published=?, updated_at=datetime('now') WHERE id=?", pub, p.id);
  res.json(await get('SELECT * FROM projects WHERE id=?', p.id));
});
r.post('/:id/duplicate', async (req, res) => {
  const p = await projectOr404(req.params.id, req);
  const files = Object.fromEntries((await all('SELECT path,content FROM project_files WHERE project_id=?', p.id)).map((f) => [f.path, f.content]));
  res.status(201).json(await createProject({ name: `${p.name} (cópia)`.slice(0, 80), description: p.description, kind: p.kind, owner: req.user.id, files, ws: req.user.ws }));
});

// ---- Arquivos
r.get('/:id/files', async (req, res) => {
  const p = await projectOr404(req.params.id, req);
  res.json(await all('SELECT path, length(content) size, updated_at FROM project_files WHERE project_id=? ORDER BY path', p.id));
});
r.get('/:id/file', async (req, res) => {
  const p = await projectOr404(req.params.id, req);
  const f = await get('SELECT path, content, updated_at FROM project_files WHERE project_id=? AND path=?', p.id, cleanPath(req.query.path));
  if (!f) throw new HttpError(404, 'Arquivo não encontrado.');
  res.json(f);
});
r.put('/:id/file', async (req, res) => {
  const p = await editable(req);
  const fp = cleanPath(req.body?.path); const content = req.body?.content;
  if (typeof content !== 'string') throw bad('Conteúdo inválido.');
  if (Buffer.byteLength(content) > MAX_FILE) throw bad('Arquivo maior que 1 MB.');
  const exists = await get('SELECT 1 x FROM project_files WHERE project_id=? AND path=?', p.id, fp);
  if (!exists && (await get('SELECT COUNT(*) n FROM project_files WHERE project_id=?', p.id)).n >= MAX_FILES) throw bad('Limite de arquivos do projeto atingido.');
  await writeFile(p, fp, content, 'save', req.user.id);
  await touch(p.id);
  res.json({ ok: true, path: fp });
});
r.delete('/:id/file', async (req, res) => {
  const p = await editable(req); const fp = cleanPath(req.query.path);
  // permite excluir pasta inteira com prefixo "dir/"
  const info = await run('DELETE FROM project_files WHERE project_id=? AND (path=? OR path LIKE ? ESCAPE \'\\\')', p.id, fp, fp.replace(/[\\%_]/g, '\\$&') + '/%');
  if (!info.changes) throw new HttpError(404, 'Arquivo não encontrado.');
  await touch(p.id); res.json({ ok: true, removed: Number(info.changes) });
});
r.post('/:id/rename', async (req, res) => {
  const p = await editable(req); const from = cleanPath(req.body?.from); const to = cleanPath(req.body?.to);
  if (await get('SELECT 1 x FROM project_files WHERE project_id=? AND path=?', p.id, to)) throw bad('Já existe um arquivo com esse nome.');
  const info = await run('UPDATE project_files SET path=? WHERE project_id=? AND path=?', to, p.id, from);
  if (!info.changes) throw new HttpError(404, 'Arquivo não encontrado.');
  await touch(p.id); res.json({ ok: true });
});

// ---- Histórico de versões
r.get('/:id/versions', async (req, res) => {
  const p = await projectOr404(req.params.id, req); const fp = cleanPath(req.query.path);
  res.json(await all(`SELECT v.id, v.source, v.created_at, length(v.content) size, u.name user_name FROM file_versions v LEFT JOIN users u ON u.id=v.user_id
    WHERE v.project_id=? AND v.path=? ORDER BY v.id DESC`, p.id, fp));
});
r.get('/:id/versions/:vid', async (req, res) => {
  const p = await projectOr404(req.params.id, req);
  const v = await get('SELECT id, path, content, source, created_at FROM file_versions WHERE id=? AND project_id=?', Number(req.params.vid), p.id);
  if (!v) throw new HttpError(404, 'Versão não encontrada.'); res.json(v);
});
r.post('/:id/versions/:vid/restore', async (req, res) => {
  const p = await editable(req);
  const v = await get('SELECT * FROM file_versions WHERE id=? AND project_id=?', Number(req.params.vid), p.id);
  if (!v) throw new HttpError(404, 'Versão não encontrada.');
  await writeFile(p, v.path, v.content, 'restore', req.user.id); await touch(p.id);
  res.json({ ok: true, path: v.path, content: v.content });
});

// ---- Buscar e substituir
r.post('/:id/replace', async (req, res) => {
  const p = await editable(req); const b = req.body || {};
  const find = String(b.find ?? ''); const rep = String(b.replace ?? '');
  if (find.length < 1) throw bad('Informe o texto a buscar.');
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc, b.caseSensitive ? 'g' : 'gi');
  const only = Array.isArray(b.paths) ? new Set(b.paths.map(String)) : null;
  const out = [];
  await tx(async () => {
    for (const f of await all('SELECT path, content FROM project_files WHERE project_id=?', p.id)) {
      if (only && !only.has(f.path)) continue;
      const n = (f.content.match(re) || []).length; if (!n) continue;
      out.push({ path: f.path, count: n });
      if (!b.dryRun) await writeFile(p, f.path, f.content.replace(re, () => rep), 'replace', req.user.id);
    }
  });
  if (!b.dryRun && out.length) await touch(p.id);
  res.json({ files: out, total: out.reduce((a, x) => a + x.count, 0), applied: !b.dryRun });
});

// ---- Importar arquivos (vários de uma vez)
r.post('/:id/import', async (req, res) => {
  const p = await editable(req); const list = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!list.length) throw bad('Nenhum arquivo enviado.'); if (list.length > 150) throw bad('Máximo de 150 arquivos por importação.');
  const existing = new Set((await all('SELECT path FROM project_files WHERE project_id=?', p.id)).map((x) => x.path));
  const skipped = []; let created = 0, updated = 0;
  await tx(async () => {
    for (const f of list) {
      let fp; try { fp = cleanPath(f.path); } catch { skipped.push({ path: String(f.path), reason: 'caminho inválido' }); continue; }
      if (typeof f.content !== 'string' || f.content.includes('\0') || Buffer.byteLength(f.content) > MAX_FILE) { skipped.push({ path: fp, reason: 'arquivo binário ou maior que 1 MB' }); continue; }
      if (existing.has(fp) && !req.body.overwrite) { skipped.push({ path: fp, reason: 'já existe' }); continue; }
      if (!existing.has(fp) && existing.size >= MAX_FILES) { skipped.push({ path: fp, reason: 'limite de arquivos' }); continue; }
      await writeFile(p, fp, f.content, 'import', req.user.id); if (existing.has(fp)) updated++; else { created++; existing.add(fp); }
    }
  });
  await touch(p.id); res.json({ created, updated, skipped });
});

// ---- Aplicar/Desfazer alterações propostas pela IA (com histórico)
r.post('/:id/ai-apply', async (req, res) => {
  const p = await editable(req); const list = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!list.length || list.length > 20) throw bad('Informe de 1 a 20 arquivos.');
  const undo = [];
  await tx(async () => {
    for (const f of list) {
      const fp = cleanPath(f.path); if (typeof f.content !== 'string' || Buffer.byteLength(f.content) > MAX_FILE) throw bad(`Conteúdo inválido para ${fp}.`);
      const r1 = await writeFile(p, fp, f.content, 'ai', req.user.id);
      undo.push({ path: fp, existed: r1.existed, versionId: r1.versionId });
    }
  });
  await touch(p.id); res.json({ ok: true, undo });
});
r.post('/:id/ai-undo', async (req, res) => {
  const p = await editable(req); const list = Array.isArray(req.body?.undo) ? req.body.undo : [];
  await tx(async () => {
    for (const u of list) {
      const fp = cleanPath(u.path);
      if (!u.existed) await run('DELETE FROM project_files WHERE project_id=? AND path=?', p.id, fp);
      else if (u.versionId) { const v = await get('SELECT content FROM file_versions WHERE id=? AND project_id=? AND path=?', Number(u.versionId), p.id, fp); if (v) await writeFile(p, fp, v.content, 'undo', req.user.id); }
    }
  });
  await touch(p.id); res.json({ ok: true });
});

r.get('/:id/search', async (req, res) => {
  const p = await projectOr404(req.params.id, req); const q = String(req.query.q || '');
  if (q.length < 2) throw bad('Digite ao menos 2 caracteres.');
  const out = [];
  for (const f of await all('SELECT path, content FROM project_files WHERE project_id=? ORDER BY path', p.id)) {
    f.content.split('\n').forEach((line, i) => { if (line.toLowerCase().includes(q.toLowerCase()) && out.length < 200) out.push({ path: f.path, line: i + 1, text: line.trim().slice(0, 200) }); });
  }
  res.json(out);
});
r.get('/:id/zip', async (req, res) => {
  const p = await projectOr404(req.params.id, req);
  const files = Object.fromEntries((await all('SELECT path, content FROM project_files WHERE project_id=?', p.id)).map((f) => [f.path, f.content]));
  res.set({ 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${p.slug}.zip"` }).send(zip(files));
});

// ---- Serviço de arquivos (preview autenticado e site público). Executa em sandbox opaco.
const BRIDGE = `<script>(function(){function s(l,a){try{parent.postMessage({__neva:'console',level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k==='error'?'err':k==='warn'?'warn':'log',arguments);o.apply(console,arguments)}});
window.addEventListener('error',function(e){s('err',[e.message+' ('+(e.filename||'').split('/').pop()+':'+e.lineno+')'])});
window.addEventListener('unhandledrejection',function(e){s('err',['Promise rejeitada: '+e.reason])});})();<\/script>`;
async function serve(project, rel, res, preview = false) {
  let fp = rel ? decodeURIComponent(rel) : 'index.html';
  if (fp.endsWith('/')) fp += 'index.html';
  try { fp = cleanPath(fp); } catch { return res.status(404).type('text').send('Não encontrado'); }
  let f = await get('SELECT content FROM project_files WHERE project_id=? AND path=?', project.id, fp);
  // Sites do Code Maker: links entre páginas ("paginas/x.html", "index.html#contato") funcionam de qualquer página.
  const page = !f && fp.match(/(?:^|\/)([a-z0-9-]+)\.html$/i)?.[1]?.toLowerCase();
  if (page) { fp = page === 'index' ? 'index.html' : `paginas/${page}.html`; f = await get('SELECT content FROM project_files WHERE project_id=? AND path=?', project.id, fp); }
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
previewRouter.get(/^\/([\w.\-]+)\/(.*)$/, async (req, res) => {
  const id = verifyPreviewToken(req.params[0]);
  if (!id) return res.status(403).type('text').send('Link de preview inválido ou expirado. Recarregue a IDE.');
  await serve(await projectOr404(id), req.params[1], res, true);
});
const publicRouter = express.Router();
publicRouter.get(/^\/([a-z0-9-]+)\/(.*)$/, async (req, res) => {
  const p = await get('SELECT * FROM projects WHERE slug=? AND published=1', req.params[0]);
  if (!p) return res.status(404).type('text').send('Site não encontrado ou não publicado.');
  await serve(p, req.params[1], res);
});

publicRouter.get('/:slug', async (req, res) => res.redirect(`/s/${req.params.slug}/`));

module.exports = { router: r, previewRouter, publicRouter };
