const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva-'));
process.env.DATA_DIR = dir;
const { createApp } = require('../server/index.js');

let server, base; let cookie = '';
const call = async (method, url, body, opts = {}) => {
  const res = await fetch(base + url, {
    method, redirect: 'manual',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', ...(opts.cookie ?? cookie ? { cookie: opts.cookie ?? cookie } : {}), ...(opts.headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const sc = res.headers.get('set-cookie'); if (sc && !opts.noStore) cookie = sc.split(';')[0];
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, headers: res.headers, body: ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};
before(async () => { await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('exige setup, autenticação e CSRF', async () => {
  assert.equal((await call('GET', '/api/auth/status')).body.needsSetup, true);
  assert.equal((await call('GET', '/api/leads')).status, 401);
  assert.equal((await call('POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'curta' })).status, 400);
  assert.equal((await call('POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' }, { headers: { 'x-requested-with': 'x' } })).status, 403);
  const ok = await call('POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' });
  assert.equal(ok.status, 201); assert.equal(ok.body.user.role, 'admin');
  assert.equal((await call('POST', '/api/auth/setup', { name: 'B', email: 'b@x.com', password: 'senha-forte-1' })).status, 403);
});

test('login, logout e senha errada', async () => {
  assert.equal((await call('POST', '/api/auth/login', { email: 'ana@x.com', password: 'errada' }, { cookie: '', noStore: true })).status, 401);
  await call('POST', '/api/auth/logout'); cookie = '';
  assert.equal((await call('GET', '/api/leads')).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { email: 'ana@x.com', password: 'senha-forte-1' })).status, 200);
  assert.equal((await call('GET', '/api/auth/me')).body.user.email, 'ana@x.com');
});

test('CRUD de leads, validação, estágio, atividades e conversão', async () => {
  assert.equal((await call('POST', '/api/leads', { name: '' })).status, 400);
  assert.equal((await call('POST', '/api/leads', { name: 'X', email: 'invalido' })).status, 400);
  const l = (await call('POST', '/api/leads', { name: 'Clínica Sol', company: 'Sol', value: 1500, email: 'a@sol.com' })).body;
  assert.equal(l.status, 'novo');
  assert.equal((await call('POST', `/api/leads/${l.id}/stage`, { status: 'xx' })).status, 400);
  assert.equal((await call('POST', `/api/leads/${l.id}/stage`, { status: 'proposta' })).body.status, 'proposta');
  await call('POST', `/api/leads/${l.id}/activities`, { type: 'ligacao', text: 'Ligou' });
  assert.equal((await call('GET', `/api/leads/${l.id}/activities`)).body.length, 2);
  assert.equal((await call('GET', '/api/leads?q=sol')).body.total, 1);
  assert.equal((await call('GET', '/api/leads?q=%25')).body.total, 0);
  assert.equal((await call('PUT', `/api/leads/${l.id}`, { value: 2000 })).body.value, 2000);
  const conv = await call('POST', `/api/leads/${l.id}/convert`, { createSale: true });
  assert.equal(conv.status, 201); assert.ok(conv.body.saleId);
  assert.equal((await call('POST', `/api/leads/${l.id}/convert`, {})).status, 400);
  assert.equal((await call('GET', `/api/leads/${l.id}`)).body.status, 'ganho');
  const imp = await call('POST', '/api/leads/import', { rows: [{ name: 'A' }, { name: '' }, { name: 'B', value: '10' }] });
  assert.deepEqual([imp.body.created, imp.body.skipped], [2, [2]]);
  assert.equal((await call('GET', '/api/leads/99999')).status, 404);
});

test('vendas, dashboard e clientes', async () => {
  const sales = (await call('GET', '/api/sales')).body.items;
  assert.equal(sales[0].status, 'pendente');
  const paid = (await call('PUT', `/api/sales/${sales[0].id}`, { status: 'pago' })).body;
  assert.equal(paid.status, 'pago');
  const d = (await call('GET', '/api/dashboard')).body;
  assert.equal(d.wallet.revenueTotal, 2000); assert.equal(d.kpis.clients, 1); assert.equal(d.metrics.series.length >= 6, true); assert.equal(d.metrics.revenue, 2000);
  assert.equal((await call('GET', '/api/clients')).body.items[0].total_paid, 2000);
});

test('tarefas, produtos e cursos com progresso', async () => {
  const t = (await call('POST', '/api/tasks', { title: 'Ligar', due_date: '2030-01-01' })).body;
  assert.equal((await call('PUT', `/api/tasks/${t.id}`, { done: true })).body.done, 1);
  assert.equal((await call('POST', '/api/products', { name: 'Site', price: 990 })).status, 201);
  const c = (await call('POST', '/api/courses', { title: 'Vendas' })).body;
  const l1 = (await call('POST', '/api/lessons', { course_id: c.id, title: 'A1' })).body;
  await call('POST', '/api/lessons', { course_id: c.id, title: 'A2' });
  await call('POST', `/api/lessons/${l1.id}/complete`, {});
  const list = (await call('GET', '/api/courses')).body.items[0];
  assert.deepEqual([list.lessons_count, list.done_count], [2, 1]);
  assert.equal((await call('POST', '/api/lessons', { course_id: 9999, title: 'x' })).status, 400);
});

test('usuários e perfis (viewer é somente leitura)', async () => {
  assert.equal((await call('POST', '/api/users', { name: 'Vi', email: 'v@x.com', password: 'senha-forte-2', role: 'viewer' })).status, 201);
  assert.equal((await call('POST', '/api/users', { name: 'Vi', email: 'v@x.com', password: 'senha-forte-2' })).status, 400);
  const admin = cookie;
  const v = await call('POST', '/api/auth/login', { email: 'v@x.com', password: 'senha-forte-2' }, { cookie: '', noStore: true });
  const vc = v.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('GET', '/api/leads', undefined, { cookie: vc })).status, 200);
  assert.equal((await call('POST', '/api/leads', { name: 'Z' }, { cookie: vc })).status, 403);
  assert.equal((await call('GET', '/api/users', undefined, { cookie: vc })).status, 403);
  const id = (await call('GET', '/api/users', undefined, { cookie: admin })).body.items.find((u) => u.email === 'v@x.com').id;
  await call('PUT', `/api/users/${id}`, { active: false }, { cookie: admin });
  assert.equal((await call('GET', '/api/leads', undefined, { cookie: vc })).status, 401);
  assert.equal((await call('DELETE', '/api/users/1', undefined, { cookie: admin })).status, 400);
});

test('projetos: arquivos, segurança de caminho, zip, preview e publicação', async () => {
  const p = (await call('POST', '/api/projects', { name: 'Meu Site', kind: 'site', tagline: 'Olá <b>', color: '#2f7bbd' })).body;
  assert.equal(p.slug, 'meu-site');
  const files = (await call('GET', `/api/projects/${p.id}/files`)).body.map((f) => f.path);
  assert.deepEqual(files, ['index.html', 'main.js', 'style.css']);
  const idx = (await call('GET', `/api/projects/${p.id}/file?path=index.html`)).body.content;
  assert.ok(idx.includes('Olá &lt;b&gt;'), 'conteúdo deve ser escapado');
  for (const bad of ['../x', '/etc/passwd', 'a/../../b', '.env', 'a\\..\\b']) {
    const r = await call('PUT', `/api/projects/${p.id}/file`, { path: bad, content: 'x' });
    // ou rejeita, ou normaliza para um caminho relativo seguro dentro do projeto
    assert.ok(r.status === 400 || (r.status === 200 && !/^\.\.|^\/|\.\./.test(r.body.path)), `caminho inseguro aceito: ${bad}`);
  }
  assert.equal((await call('PUT', `/api/projects/${p.id}/file`, { path: 'js/a.js', content: 'console.log(1)' })).status, 200);
  assert.equal((await call('POST', `/api/projects/${p.id}/rename`, { from: 'js/a.js', to: 'js/b.js' })).status, 200);
  assert.equal((await call('GET', `/api/projects/${p.id}/search?q=console`)).body[0].path, 'js/b.js');
  const zip = await call('GET', `/api/projects/${p.id}/zip`);
  assert.equal(zip.body.readUInt32LE(0), 0x04034b50);
  const tok = (await call('POST', `/api/projects/${p.id}/preview-token`)).body.url;
  const prev = await call('GET', tok, undefined, { cookie: '' });
  assert.equal(prev.status, 200); assert.match(prev.headers.get('content-security-policy'), /sandbox/); assert.ok(prev.body.toString().includes('__neva'));
  assert.equal((await call('GET', `/s/${p.slug}/`, undefined, { cookie: '' })).status, 404);
  await call('POST', `/api/projects/${p.id}/publish`, { published: true });
  const pub = await call('GET', `/s/${p.slug}/`, undefined, { cookie: '' });
  assert.equal(pub.status, 200); assert.ok(!pub.body.toString().includes('__neva'));
  assert.equal((await call('GET', `/preview/${p.id}/`, undefined, { cookie: '' })).status, 403);
  assert.equal((await call('GET', tok.replace(/.\/$/, (m) => (m[0] === 'a' ? 'b' : 'a') + '/') + 'index.html', undefined, { cookie: '' })).status, 403);
  assert.equal((await call('GET', tok + 'style.css', undefined, { cookie: '' })).status, 200);
  assert.equal((await call('DELETE', `/api/projects/${p.id}/file?path=js`)).body.removed, 1);
  const dup = await call('POST', `/api/projects/${p.id}/duplicate`);
  assert.equal(dup.body.slug, 'meu-site-copia');
  for (const kind of ['app', 'system']) assert.equal((await call('POST', '/api/projects', { name: 'K ' + kind, kind })).status, 201);
});

test('integrações sem credenciais respondem 503 explicando o motivo', async () => {
  const s = (await call('GET', '/api/integrations/status')).body;
  assert.equal(s.ai.configured, false);
  assert.equal((await call('POST', '/api/integrations/ai/chat', { projectId: 1, message: 'oi' })).body.code, 'ai_not_configured');
  assert.equal((await call('POST', '/api/projects/generate-ai', { name: 'Xy', brief: 'uma landing page completa' })).status, 503);
  assert.equal((await call('POST', '/api/integrations/prospect/search', { query: 'dentista' })).body.code, 'places_not_configured');
});

test('venda sem data cai no dia de Brasília, não no UTC (depois das 21h a data UTC já é amanhã)', async () => {
  const { todayBRT } = require('../server/lib/brt.js');
  assert.equal(todayBRT(new Date('2026-10-26T01:30:00Z')), '2026-10-25');
  assert.equal(todayBRT(new Date('2026-10-26T12:00:00Z')), '2026-10-26');
  const before = (await call('GET', '/api/dashboard?period=hoje')).body.metrics.sales;
  const s = (await call('POST', '/api/sales', { description: 'Venda de hoje', amount: 500, cost: 100, status: 'pago' })).body;
  assert.equal(s.sold_at, todayBRT());
  assert.equal(s.paid_at, todayBRT());
  const d = (await call('GET', '/api/dashboard?period=hoje')).body;
  assert.equal(d.metrics.sales, before + 1);
  assert.equal(d.metrics.range.end, todayBRT());
});
