const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva-cm-'));
process.env.DATA_DIR = dir;
process.env.NODE_ENV = 'test';
delete process.env.RIVER_API_KEY;
const { createApp } = require('../server/index.js');
const { run, get } = require('../server/lib/db');
const E = require('../server/lib/codemaker/engine');
const { repairDsml } = require('../server/routes/codemaker');

let server, base, admin;
const call = async (method, url, body, cookie = admin) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const sc = res.headers.get('set-cookie');
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, cookie: sc ? sc.split(';')[0] : '', body: ct.includes('json') ? await res.json() : await res.text() };
};
before(async () => {
  await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`;
  admin = (await call('POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' }, '')).cookie;
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const brief = { businessName: 'Padaria Sol', niche: 'padaria', city: 'Recife', phone: '81999990000', style: 'auto', details: 'Padaria artesanal com pães de fermentação natural.', assets: [] };
const plan = E.normalizePlan({ title: 'Padaria Sol', description: 'Pães artesanais', direction: 'acolhedor', theme: 'light',
  palette: { brand: '#c2410c', brandDark: '#9a3412', accent: '#f59e0b', ink: '#111827', paper: '#fafaf9', surface: '#f1efe9', muted: '#6b7280' },
  fonts: { display: 'Fraunces', body: 'Inter' }, sections: [{ id: 'hero', label: 'Topo', brief: 'b', bg: 'paper' }, { id: 'contato', label: 'Contato', brief: 'c', bg: 'surface' }] }, brief);

let id;
test('cria site só com o pedido (sem nome obrigatório)', async () => {
  assert.equal((await call('POST', '/api/code-maker', { action: 'create', brief: {} })).status, 400);
  const r = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para uma padaria artesanal em Recife' } });
  assert.equal(r.status, 200); id = r.body.site.id;
  assert.equal(r.body.site.name, 'Novo site'); assert.match(r.body.site.slug, /^site-[0-9a-f]{8}$/);
  const s = (await call('GET', '/api/code-maker/' + id)).body.site;
  assert.equal(s.status, 'planning'); assert.equal(s.brief.details, 'Site para uma padaria artesanal em Recife');
  const list = (await call('GET', '/api/projects')).body.items;
  assert.ok(list.find((p) => p.id === id).studio);
});

test('sem chave da IA o plano avisa (sem travar o site)', async () => {
  const r = await call('POST', '/api/code-maker', { action: 'plan', site_id: id });
  assert.equal(r.status, 503); assert.match(r.body.error, /RIVER_API_KEY/);
});

test('cabeçalho sai do plano sem IA; finish monta, sincroniza os arquivos e publica', async () => {
  await run("UPDATE code_sites SET plan=?, brief=?, status='building' WHERE project_id=?", JSON.stringify(plan), JSON.stringify(brief), id);
  // Chave lida da tabela app_settings (o cabeçalho não chama a IA, então nada sai para a rede).
  await run("UPDATE app_settings SET value='chave-de-teste' WHERE key='RIVER_API_KEY'");
  await require('../server/lib/config').refresh(true);
  // A parte fixa (cabeçalho) responde no formato ao vivo, mesmo sem IA.
  const head = await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: 'header' });
  assert.equal(head.status, 200); assert.match(head.body, /<<<OK>>>\s*$/);
  assert.equal((await call('POST', '/api/code-maker', { action: 'finish', site_id: id })).status, 409);
  const parts = JSON.parse((await get('SELECT parts FROM code_sites WHERE project_id=?', id)).parts);
  assert.ok(parts.header);
  parts.hero = '<section id="hero"><h1>Pão quentinho</h1></section>'; parts.contato = '<section id="contato"><p>Fale conosco</p></section>';
  await run('UPDATE code_sites SET parts=? WHERE project_id=?', JSON.stringify(parts), id);
  const footer = await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: 'footer' });
  assert.match(footer.body, /<<<OK>>>\s*$/, 'a última parte responde sem esperar a inspeção visual');
  assert.equal((await get('SELECT status FROM code_sites WHERE project_id=?', id)).status, 'building');
  const fin = await call('POST', '/api/code-maker', { action: 'finish', site_id: id });
  assert.equal(fin.status, 200); assert.equal(fin.body.site.status, 'ready');
  const file = await get("SELECT content FROM project_files WHERE project_id=? AND path='index.html'", id);
  assert.match(file.content, /Pão quentinho/);
  const doc = (await call('GET', `/api/code-maker/${id}/document`)).body;
  assert.match(doc.html, /<main id="conteudo">/);
  assert.equal((await call('GET', `/api/code-maker/${id}/versions`)).body.items[0].kind, 'create');
  await call('POST', `/api/projects/${id}/publish`, { published: true });
  const slug = (await call('GET', '/api/code-maker/' + id)).body.site.slug;
  const pub = await call('GET', `/s/${slug}/`, undefined, '');
  assert.equal(pub.status, 200); assert.match(pub.body, /Pão quentinho/);
  // Link de página a partir de outra página (paginas/index.html) cai na página certa.
  assert.equal((await call('GET', `/s/${slug}/paginas/index.html`, undefined, '')).status, 200);
});

test('edição exige pedido e restauração exige versão válida', async () => {
  assert.equal((await call('POST', '/api/code-maker', { action: 'restore', site_id: id, version_id: 999 })).status, 404);
  assert.equal((await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: 'hero' })).status, 409);
  assert.equal((await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: '  ' })).status, 400);
});

test('outra conta não vê o site', async () => {
  const bia = (await call('POST', '/api/auth/signup', { name: 'Bia', username: 'bia.cm', email: 'bia@x.com', password: 'Abcd1234!x', remember: true }, '')).cookie;
  assert.equal((await call('GET', '/api/code-maker/' + id, undefined, bia)).status, 404);
});

test('repara os marcadores da DeepSeek e o fechamento trocado', () => {
  const raw = '<editar arquivo="secoes/hero.html">\n<antes>\nA\n</antes>\n<depois>\nB\n</antes>\n</editar>\n</editar>\n' +
    '<editar arquivo="secoes/hero.html">\n<antes>\nC</｜DSML｜ parameter>\n<｜DSML｜ parameter name="depois">\nD\n</｜DSML｜ parameter>\n</editar>';
  const edit = E.parseProjectEdit(repairDsml(raw));
  assert.equal(edit.operations.length, 2); assert.equal(edit.invalid, 0);
  assert.equal(repairDsml('texto normal'), 'texto normal');
});

test('medidor de contexto do Builder: segmentos com tokens estimados', async () => {
  const r = await call('GET', `/api/code-maker/context?site_id=${id}`);
  assert.equal(r.status, 200); assert.equal(r.body.limit, 200000);
  assert.deepEqual(r.body.segments.map((s) => s.id), ['system', 'refs', 'files', 'talk']);
  assert.ok(r.body.segments[0].tokens > 1000, 'as regras e o DESIGN.md contam');
  assert.ok(r.body.segments[2].tokens > 0, 'os arquivos do site contam');
});

test('referência de design escolhida no Builder fica no pedido (até 3)', async () => {
  const r = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para estúdio de pilates', designIds: [5, 'x', 7, 9, 11] } });
  assert.equal(r.status, 200);
  const s = (await call('GET', '/api/code-maker/' + r.body.site.id)).body.site;
  assert.deepEqual(s.brief.designIds, [5, 7, 9]);
});

test('referências escolhidas pelo usuário entram no bloco mesmo fora do ramo', async () => {
  process.env.CM_REF_INSPECT = '0';
  const refs = require('../server/lib/codemaker/references');
  const { all } = require('../server/lib/db');
  const designs = await all("SELECT id,title FROM library_items WHERE kind='design' AND published=1 ORDER BY id LIMIT 2");
  assert.ok(designs.length >= 2);
  const out = await refs.buildReferences({ details: 'Padaria artesanal em Recife', niche: 'padaria', designIds: designs.map((d) => d.id) });
  assert.deepEqual(out.trace.selected.map((s) => s.title), designs.map((d) => d.title));
  assert.ok(out.trace.selected.every((s) => s.why.includes('escolhida pelo usuário no Builder')));
  for (const d of designs) assert.match(out.block, new RegExp(d.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
