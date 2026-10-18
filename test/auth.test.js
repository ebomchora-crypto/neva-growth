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
  await call('POST', '/api/clients', { name: 'Cliente Secreto' }, admin);
});

test('status informa cadastro aberto e e-mail', async () => {
  const s = (await call('GET', '/api/auth/status')).body;
  assert.equal(s.signupOpen, true); assert.equal(typeof s.mailConfigured, 'boolean');
});

test('cadastro público cria aluno sem acesso aos dados da operação', async () => {
  const r = await call('POST', '/api/auth/signup', { name: 'Bia Aluna', username: 'Bia.Aluna', email: 'Bia@X.com', password: 'Abcd1234!x', remember: true });
  assert.equal(r.status, 201); assert.equal(r.body.user.role, 'student'); assert.equal(r.body.user.username, 'bia.aluna');
  assert.match(r.setCookie, /Max-Age=/); // remember padrão no cadastro
  const c = r.cookie;
  assert.equal((await call('GET', '/api/me', undefined, c)).body.user.credits, 0);
  for (const u of ['/api/clients', '/api/leads', '/api/sales', '/api/tasks', '/api/products', '/api/projects', '/api/users', '/api/users/options', '/api/dashboard', '/api/search?q=abc']) {
    const x = await call('GET', u, undefined, c); assert.equal(x.status, 403, u);
  }
  assert.equal((await call('POST', '/api/clients', { name: 'x' }, c)).status, 403);
  assert.equal((await call('POST', '/api/projects', { name: 'x' }, c)).status, 403);
  assert.equal((await call('PUT', '/api/courses/1', { title: 'x' }, c)).status, 403);
  for (const u of ['/api/me', '/api/library', '/api/play', '/api/courses', '/api/prompts', '/api/integrations/status']) assert.equal((await call('GET', u, undefined, c)).status, 200, u);
  assert.equal((await call('POST', '/api/play/1/seen', {}, c)).status !== 403, true);
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

test('admin vê o aluno em Usuários e pode promovê-lo', async () => {
  const list = (await call('GET', '/api/users', undefined, admin)).body.items;
  const bia = list.find((u) => u.email === 'bia@x.com'); assert.equal(bia.role, 'student');
  assert.equal((await call('PUT', `/api/users/${bia.id}`, { role: 'member' }, admin)).status, 200);
});
