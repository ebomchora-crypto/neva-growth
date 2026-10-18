const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva-auth-'));
process.env.DATA_DIR = dir;
process.env.NODE_ENV = 'test';
const { createApp } = require('../server/index.js');
const mail = require('../server/lib/mail');

let server, base;
const call = async (method, url, body, cookie = '') => {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const sc = res.headers.get('set-cookie');
  return { status: res.status, setCookie: sc, cookie: sc ? sc.split(';')[0] : '', body: (res.headers.get('content-type') || '').includes('json') ? await res.json() : null };
};
before(async () => { await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

let admin;
test('prepara administrador', async () => {
  const r = await call('POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' });
  assert.equal(r.status, 201); admin = r.cookie;
});

test('status informa cadastro aberto e e-mail', async () => {
  const s = (await call('GET', '/api/auth/status')).body;
  assert.equal(s.signupOpen, true); assert.equal(typeof s.mailConfigured, 'boolean');
});

let bia, adminIds = {};
test('cadastro público cria Membro com espaço próprio e funções completas', async () => {
  // dados reais do administrador
  const c = (await call('POST', '/api/clients', { name: 'Cliente Secreto', email: 'seg@x.com' }, admin)).body;
  const l = (await call('POST', '/api/leads', { name: 'Lead Secreto', company: 'Segredo SA', value: 500 }, admin)).body;
  const p = (await call('POST', '/api/products', { name: 'Produto Secreto', price: 10 }, admin)).body;
  const s = (await call('POST', '/api/sales', { description: 'Venda Secreta', amount: 900, cost: 100, status: 'pago', client_id: c.id }, admin)).body;
  const t = (await call('POST', '/api/tasks', { title: 'Tarefa Secreta' }, admin)).body;
  const pr = (await call('POST', '/api/projects', { name: 'Site Secreto' }, admin)).body;
  const act = (await call('POST', `/api/leads/${l.id}/activities`, { text: 'nota secreta' }, admin)).body;
  adminIds = { c: c.id, l: l.id, p: p.id, s: s.id, t: t.id, pr: pr.id, act: act.id };

  const r = await call('POST', '/api/auth/signup', { name: 'Bia Aluna', username: 'Bia.Aluna', email: 'Bia@X.com', password: 'Abcd1234!x', remember: true });
  assert.equal(r.status, 201); assert.equal(r.body.user.role, 'member'); assert.equal(r.body.user.username, 'bia.aluna');
  assert.match(r.setCookie, /Max-Age=/);
  bia = r.cookie;
  assert.equal((await call('GET', '/api/me', undefined, bia)).body.user.credits, 100);

  // tudo vazio: nenhuma listagem enxerga dados do administrador
  for (const u of ['/api/clients', '/api/leads', '/api/sales', '/api/tasks', '/api/products', '/api/projects']) {
    const x = await call('GET', u, undefined, bia); assert.equal(x.status, 200, u);
    const items = x.body.items; assert.equal(items.length, 0, u + ' deveria estar vazio');
  }
  assert.equal((await call('GET', '/api/clients/summary', undefined, bia)).body.total, 0);
  assert.equal((await call('GET', '/api/sales/summary', undefined, bia)).body.faturamento, 0);
  const d = (await call('GET', '/api/dashboard', undefined, bia)).body;
  assert.equal(d.kpis.clients, 0); assert.equal(d.kpis.leads, 0); assert.equal(d.kpis.projects, 0); assert.equal(d.wallet.revenueTotal, 0);
  assert.equal(d.tasksDue.length, 0); assert.equal(d.recentSales.length, 0); assert.equal(d.recentActivities.length, 0);
  assert.equal((await call('GET', '/api/search?q=Secret', undefined, bia)).body.groups.filter((g) => g.label !== 'Biblioteca').length, 0);
  assert.equal((await call('GET', '/api/users/options', undefined, bia)).body.length, 1);

  // acesso direto por id (IDOR): 404 em leitura, edição, exclusão e sub-recursos
  for (const [u, id] of [['clients', adminIds.c], ['leads', adminIds.l], ['products', adminIds.p], ['sales', adminIds.s], ['tasks', adminIds.t]]) {
    assert.equal((await call('GET', `/api/${u}/${id}`, undefined, bia)).status, 404, 'GET ' + u);
    assert.equal((await call('PUT', `/api/${u}/${id}`, { name: 'x', title: 'x', description: 'x', amount: 1 }, bia)).status, 404, 'PUT ' + u);
    assert.equal((await call('DELETE', `/api/${u}/${id}`, undefined, bia)).status, 404, 'DELETE ' + u);
  }
  assert.equal((await call('GET', `/api/leads/${adminIds.l}/activities`, undefined, bia)).body.length, 0);
  assert.equal((await call('POST', `/api/leads/${adminIds.l}/activities`, { text: 'invasão' }, bia)).status, 404);
  assert.equal((await call('POST', `/api/leads/${adminIds.l}/stage`, { status: 'ganho' }, bia)).status, 404);
  assert.equal((await call('POST', `/api/leads/${adminIds.l}/convert`, {}, bia)).status, 404);
  await call('DELETE', `/api/activities/${adminIds.act}`, undefined, bia);
  assert.equal((await call('GET', `/api/leads/${adminIds.l}/activities`, undefined, admin)).body.length, 1);
  for (const u of [`/api/projects/${adminIds.pr}`, `/api/projects/${adminIds.pr}/files`, `/api/projects/${adminIds.pr}/file?path=index.html`, `/api/projects/${adminIds.pr}/search?q=a`, `/api/integrations/ai/history?projectId=${adminIds.pr}`])
    assert.equal((await call('GET', u, undefined, bia)).status, 404, u);
  assert.equal((await call('POST', `/api/projects/${adminIds.pr}/publish`, { published: true }, bia)).status, 404);
  assert.equal((await call('POST', `/api/projects/${adminIds.pr}/duplicate`, {}, bia)).status, 404);
  assert.equal((await call('DELETE', `/api/projects/${adminIds.pr}`, undefined, bia)).status, 404);
  // referências cruzadas entre contas são recusadas
  assert.equal((await call('POST', '/api/sales', { description: 'x', amount: 5, client_id: adminIds.c }, bia)).status, 400);
  assert.equal((await call('POST', '/api/tasks', { title: 'x', lead_id: adminIds.l }, bia)).status, 400);
  assert.equal((await call('POST', '/api/projects', { name: 'Meu site', client_id: adminIds.c }, bia)).status, 400);
  assert.equal((await call('POST', '/api/leads', { name: 'x', owner_id: 1 }, bia)).status, 400);

  // áreas só do administrador continuam fechadas
  for (const u of ['/api/users']) assert.equal((await call('GET', u, undefined, bia)).status, 403, u);
  assert.equal((await call('GET', '/api/me/export', undefined, bia)).status, 403);
  assert.equal((await call('PUT', '/api/courses/1', { title: 'x' }, bia)).status, 403);
  assert.equal((await call('POST', '/api/lessons', { title: 'x', course_id: 1 }, bia)).status, 403);
  assert.equal((await call('PUT', '/api/pipeline/stages', { stages: [] }, bia)).status, 403);
  for (const u of ['/api/me', '/api/library', '/api/play', '/api/courses', '/api/prompts', '/api/integrations/status']) assert.equal((await call('GET', u, undefined, bia)).status, 200, u);
});

test('o Membro novo usa o sistema completo, só com os próprios dados', async () => {
  const c = await call('POST', '/api/clients', { name: 'Meu Cliente' }, bia); assert.equal(c.status, 201);
  const l = await call('POST', '/api/leads', { name: 'Meu Lead', value: 100 }, bia); assert.equal(l.status, 201);
  const s = await call('POST', '/api/sales', { description: 'Minha venda', amount: 300, cost: 50, status: 'pago', client_id: c.body.id }, bia); assert.equal(s.status, 201);
  assert.equal((await call('POST', '/api/tasks', { title: 'Minha tarefa' }, bia)).status, 201);
  assert.equal((await call('POST', '/api/products', { name: 'Meu produto', price: 5 }, bia)).status, 201);
  const pr = await call('POST', '/api/projects', { name: 'Meu site', client_id: c.body.id }, bia); assert.equal(pr.status, 201);
  assert.equal((await call('POST', `/api/leads/${l.body.id}/activities`, { text: 'minha nota' }, bia)).status, 201);
  assert.equal((await call('POST', `/api/leads/${l.body.id}/convert`, { createSale: true }, bia)).status, 201);
  assert.equal((await call('GET', '/api/sales', undefined, bia)).body.items.length, 2);
  const d = (await call('GET', '/api/dashboard', undefined, bia)).body;
  assert.equal(d.wallet.revenueTotal, 300); assert.equal(d.kpis.clients, 2);
  // o administrador não enxerga nada disso
  assert.equal((await call('GET', '/api/clients', undefined, admin)).body.items.some((x) => x.name === 'Meu Cliente'), false);
  assert.equal((await call('GET', '/api/projects', undefined, admin)).body.items.some((x) => x.name === 'Meu site'), false);
  assert.equal((await call('GET', '/api/dashboard', undefined, admin)).body.wallet.revenueTotal, 900);
  const exp = (await call('GET', '/api/me/export', undefined, admin)).body;
  assert.equal(exp.clients.some((x) => x.name === 'Meu Cliente'), false); assert.equal(exp.projects.some((x) => x.name === 'Meu site'), false);
  assert.equal((await call('GET', `/api/projects/${pr.body.id}`, undefined, admin)).status, 404);
});

test('cadastro valida dados, duplicidade e isca de robô', async () => {
  const ok = { name: 'Caio', username: 'caio', email: 'caio@x.com', password: 'Abcd1234!x' };
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, email: 'ruim' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, password: 'curta' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, password: '12345678' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, username: 'a b' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, website: 'http://spam' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, email: 'bia@x.com' })).status, 409);
  assert.equal((await call('POST', '/api/auth/signup', { ...ok, username: 'bia.aluna' })).status, 409);
});

test('cadastro limita tentativas por IP', async () => {
  let last;
  for (let i = 0; i < 8; i++) last = await call('POST', '/api/auth/signup', { name: 'Zé', username: 'ze' + i, email: `ze${i}@x.com`, password: 'Abcd1234!x' });
  assert.equal(last.status, 429);
});

test('salvar sessão: sem marcar vira cookie de sessão; marcado persiste', async () => {
  const a = await call('POST', '/api/auth/login', { email: 'ana@x.com', password: 'senha-forte-1', remember: false });
  assert.equal(a.status, 200); assert.doesNotMatch(a.setCookie, /Max-Age=|Expires=/i);
  const b = await call('POST', '/api/auth/login', { email: 'ana@x.com', password: 'senha-forte-1', remember: true });
  assert.match(b.setCookie, /Max-Age=2592000/);
  assert.equal((await call('POST', '/api/auth/login', { email: 'ana@x.com', password: 'errada-123' })).status, 401);
});

test('recuperação de senha: link único, expira, troca a senha e encerra sessões', async () => {
  const old = (await call('POST', '/api/auth/login', { email: 'bia@x.com', password: 'Abcd1234!x' })).cookie;
  mail.outbox.length = 0;
  assert.equal((await call('POST', '/api/auth/forgot', { email: 'ninguem@x.com' })).status, 200);
  assert.equal(mail.outbox.length, 0); // mesma resposta, nada enviado
  assert.equal((await call('POST', '/api/auth/forgot', { email: 'bia@x.com' })).status, 200);
  assert.equal(mail.outbox.length, 1); assert.equal(mail.outbox[0].to, 'bia@x.com');
  const token = mail.outbox[0].text.match(/token=([\w-]+)/)[1];
  assert.equal((await call('POST', '/api/auth/reset', { token: 'invalido', password: 'NovaSenha123!' })).status, 400);
  assert.equal((await call('POST', '/api/auth/reset', { token, password: 'curta' })).status, 400);
  const r = await call('POST', '/api/auth/reset', { token, password: 'NovaSenha123!' });
  assert.equal(r.status, 200); assert.equal(r.body.user.email, 'bia@x.com');
  assert.equal((await call('GET', '/api/me', undefined, old)).status, 401); // sessão antiga encerrada
  assert.equal((await call('GET', '/api/me', undefined, r.cookie)).status, 200);
  assert.equal((await call('POST', '/api/auth/reset', { token, password: 'OutraSenha123!' })).status, 400); // uso único
  assert.equal((await call('POST', '/api/auth/login', { email: 'bia@x.com', password: 'Abcd1234!x' })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { email: 'bia@x.com', password: 'NovaSenha123!' })).status, 200);
});

test('SIGNUP_OPEN=0 fecha o cadastro', async () => {
  process.env.SIGNUP_OPEN = '0';
  try {
    assert.equal((await call('GET', '/api/auth/status')).body.signupOpen, false);
    assert.equal((await call('POST', '/api/auth/signup', { name: 'Dani', username: 'dani', email: 'dani@x.com', password: 'Abcd1234!x' })).status, 403);
  } finally { delete process.env.SIGNUP_OPEN; }
});

test('admin vê a conta pública em Usuários e gerencia', async () => {
  const list = (await call('GET', '/api/users', undefined, admin)).body.items;
  const bia = list.find((u) => u.email === 'bia@x.com'); assert.equal(bia.role, 'member');
  assert.equal((await call('PUT', `/api/users/${bia.id}`, { plan: 'creator' }, admin)).status, 200);
});
