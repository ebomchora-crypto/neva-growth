const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva-pot-'));
process.env.DATA_DIR = dir;
const { createApp } = require('../server/index.js');

let server, base;
const jar = { a: '', b: '' };
const call = async (who, method, url, body) => {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const sc = res.headers.get('set-cookie'); if (sc) jar[who] = sc.split(';')[0];
  return { status: res.status, body: (res.headers.get('content-type') || '').includes('json') ? await res.json() : null };
};
before(async () => {
  await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await call('a', 'POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' })).status, 201);
  assert.equal((await call('b', 'POST', '/api/auth/signup', { name: 'Beto Silva', username: 'beto', email: 'beto@x.com', password: 'Zq9!kLm2xPw' })).status, 201);
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('potenciais: cada usuário vê só a sua lista e valida os campos', async () => {
  assert.equal((await call('a', 'POST', '/api/potentials', { name: '', value: 1 })).status, 400);
  assert.equal((await call('a', 'POST', '/api/potentials', { name: 'Maria', value: -5 })).status, 400);
  const c = await call('a', 'POST', '/api/potentials', { name: 'Maria Souza', phone: '(11) 99999-0000', store: 'Loja da Maria', value: '1500,50' });
  assert.equal(c.status, 201); assert.equal(c.body.value, 1500.5);
  const mineA = (await call('a', 'GET', '/api/potentials')).body;
  assert.equal(mineA.items.length, 1); assert.equal(mineA.counts.aberta, 1); assert.equal(mineA.open_value, 1500.5);
  assert.equal((await call('b', 'GET', '/api/potentials')).body.items.length, 0);
  assert.equal((await call('b', 'PUT', `/api/potentials/${c.body.id}`, { name: 'X' })).status, 404);
  assert.equal((await call('b', 'POST', `/api/potentials/${c.body.id}/close`)).status, 404);
});

test('potenciais: "Fechou" cria lead em ganho e cliente; telefone repetido pede confirmação', async () => {
  const p1 = (await call('a', 'GET', '/api/potentials')).body.items[0];
  const r = await call('a', 'POST', `/api/potentials/${p1.id}/close`);
  assert.equal(r.status, 200); assert.equal(r.body.item.status, 'enviada');
  const lead = (await call('a', 'GET', `/api/leads/${r.body.lead_id}`)).body;
  assert.equal(lead.company, 'Loja da Maria'); assert.equal(lead.value, 1500.5);
  const stages = (await call('a', 'GET', '/api/pipeline/stages')).body;
  assert.equal(stages.find((s) => s.key === lead.status).kind, 'won');
  const clients = (await call('a', 'GET', '/api/clients')).body;
  assert.ok((clients.items || clients).some((c) => c.lead_id === r.body.lead_id));
  assert.equal((await call('a', 'POST', `/api/potentials/${p1.id}/close`)).status, 400);
  assert.equal((await call('a', 'PUT', `/api/potentials/${p1.id}`, { status: 'descartada' })).status, 400);
  // mesmo telefone, outro formato
  const p2 = (await call('a', 'POST', '/api/potentials', { name: 'João', phone: '+55 11 99999 0000', value: 300 })).body;
  const dup = await call('a', 'POST', `/api/potentials/${p2.id}/close`);
  assert.equal(dup.status, 409); assert.equal(dup.body.code, 'duplicate');
  const linked = await call('a', 'POST', `/api/potentials/${p2.id}/close`, { link: true });
  assert.equal(linked.status, 200); assert.equal(linked.body.linked, true); assert.equal(linked.body.lead_id, r.body.lead_id);
});

test('potenciais: descartar, reabrir e excluir', async () => {
  const p = (await call('a', 'POST', '/api/potentials', { name: 'Carla' })).body;
  assert.equal((await call('a', 'PUT', `/api/potentials/${p.id}`, { status: 'descartada' })).body.status, 'descartada');
  assert.equal((await call('a', 'PUT', `/api/potentials/${p.id}`, { status: 'aberta' })).body.status, 'aberta');
  assert.equal((await call('a', 'DELETE', `/api/potentials/${p.id}`)).status, 200);
  assert.equal((await call('a', 'DELETE', `/api/potentials/${p.id}`)).status, 404);
});
