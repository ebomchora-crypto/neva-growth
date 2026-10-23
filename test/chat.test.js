const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os'); const fs = require('node:fs'); const path = require('node:path'); const http = require('node:http');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva-chat-'));
process.env.DATA_DIR = dir; process.env.NODE_ENV = 'test';
let stub, server, base, cookie = '';
before(async () => {
  // IA falsa compatível com OpenAI: responde ao vivo em pedaços.
  stub = http.createServer((req, res) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
    const j = JSON.parse(b || '{}');
    if (!j.stream) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ choices: [{ message: { content: 'notas' }, finish_reason: 'stop' }] })); }
    res.setHeader('content-type', 'text/event-stream');
    for (const d of ['Olá, ', 'tudo ', 'certo?']) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: d } }] })}\n\n`);
    res.end('data: [DONE]\n\n');
  }); });
  await new Promise((r) => stub.listen(0, r));
  process.env.RIVER_API_KEY = 'teste'; process.env.RIVER_BASE_URL = `http://127.0.0.1:${stub.address().port}/v1`;
  const { createApp } = require('../server/index.js');
  await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(base + '/api/auth/setup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'neva' }, body: JSON.stringify({ name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' }) });
  cookie = res.headers.get('set-cookie').split(';')[0];
});
after(() => { server.close(); stub.close(); fs.rmSync(dir, { recursive: true, force: true }); });
const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const ct = res.headers.get('content-type') || ''; return { status: res.status, body: ct.includes('json') && !ct.includes('ndjson') ? await res.json() : await res.text() };
};

test('chat: responde ao vivo, guarda a conversa, renomeia e exclui', async () => {
  assert.equal((await call('POST', '/api/chat', { message: '  ' })).status, 400);
  const r = await call('POST', '/api/chat', { message: 'Oi, Neva', effort: 'low' });
  assert.equal(r.status, 200);
  const ev = r.body.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(ev[0].t, 'start'); assert.equal(ev.at(-1).t, 'done');
  assert.equal(ev.filter((e) => e.t === 'd').map((e) => e.d).join(''), 'Olá, tudo certo?');
  const id = ev[0].id;
  const c = (await call('GET', '/api/chat/' + id)).body;
  assert.equal(c.title, 'Oi, Neva'); assert.deepEqual(c.messages.map((m) => m.role), ['user', 'assistant']);
  await call('POST', '/api/chat', { chat_id: id, message: 'E agora?', effort: 'low' });
  assert.equal((await call('GET', '/api/chat/' + id)).body.messages.length, 4);
  assert.equal((await call('PATCH', '/api/chat/' + id, { title: 'Conversa teste' })).status, 200);
  assert.equal((await call('GET', '/api/chat')).body.items[0].title, 'Conversa teste');
  assert.equal((await call('DELETE', '/api/chat/' + id)).status, 200);
  assert.equal((await call('GET', '/api/chat/' + id)).status, 404);
});
