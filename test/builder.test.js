// Builder de ponta a ponta contra uma River falsa (test/e2e/mock-river.mjs): DESIGN.md como system prompt,
// modelo/esforço chegando à IA, narração por etapas, publicação, revisão por arquivo e sonda de testes.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva-builder-'));
process.env.DATA_DIR = dir;
process.env.NODE_ENV = 'test';
const MOCK_PORT = 3400 + Math.floor(Math.random() * 400);
process.env.RIVER_BASE_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;
const { createApp } = require('../server/index.js');
const { run, all } = require('../server/lib/db');
const { DESIGN_MD, STATS } = require('../server/lib/codemaker/design-md');
const E = require('../server/lib/codemaker/engine');

let server, base, cookie, mock;
const call = async (method, url, body, extra = {}) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', ...(cookie ? { cookie } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const sc = res.headers.get('set-cookie');
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, cookie: sc ? sc.split(';')[0] : '', body: ct.includes('json') ? await res.json() : await res.text() };
};
const seen = async () => (await fetch(`http://127.0.0.1:${MOCK_PORT}/__seen`)).json();

before(async () => {
  mock = spawn(process.execPath, [path.join(__dirname, 'e2e', 'mock-river.mjs')], { env: { ...process.env, PORT: String(MOCK_PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${MOCK_PORT}/__seen`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`;
  cookie = (await call('POST', '/api/auth/setup', { name: 'Ana', email: 'ana@x.com', password: 'senha-forte-1' })).cookie;
  await run("UPDATE app_settings SET value='chave-de-teste' WHERE key='RIVER_API_KEY'");
  await require('../server/lib/config').refresh(true);
});
after(() => { server.close(); mock.kill(); fs.rmSync(dir, { recursive: true, force: true }); });

test('DESIGN.md compilado sem perder conteúdo: 30 capítulos, 281 temas, 12 verificações, contrato inteiro', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'docs', 'design', 'DESIGN.md'), 'utf8');
  assert.equal(STATS.chapters, 30); assert.equal(STATS.topics, 281); assert.equal(STATS.fields, 12); assert.equal(STATS.contract, 10);
  assert.equal(STATS.templated, 13488);
  for (const topic of source.match(/^### (.+)$/gm).map((l) => l.slice(4).trim()).filter((t) => t !== 'Portão de qualidade do capítulo')) assert.ok(DESIGN_MD.includes(topic), topic);
  for (const line of source.match(/^- \[ \] .+$/gm)) assert.ok(DESIGN_MD.includes(line.slice(6)), line);
  assert.ok(DESIGN_MD.includes('Em conflito: requisitos explícitos do produto > segurança e acessibilidade'));
  assert.ok(DESIGN_MD.length < 12000 && source.length > 2_000_000);
  // Conflito resolvido a favor do DESIGN.md: nada de preço "plausível" inventado.
  assert.doesNotMatch(E.PLAN_SYSTEM + E.PART_SYSTEM, /a partir de" plausível/);
});

let siteId;
test('criação com Neva 1.5 · Máximo: DESIGN.md vem primeiro, análise prévia, orçamento do nível e publicação', async () => {
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para a Padaria Sol em Recife, pedidos pelo WhatsApp.' }, model: 'neva-1-5', effort: 'xhigh' });
  assert.equal(created.status, 200); siteId = created.body.site.id;
  const plan = await call('POST', '/api/code-maker', { action: 'plan', site_id: siteId });
  assert.match(plan.body, /<etapa>analise<\/etapa>/); assert.match(plan.body, /<<<OK>>>\s*$/);
  let site = (await call('GET', '/api/code-maker/' + siteId)).body.site;
  assert.equal(site.brief.ai.effort, 'xhigh'); assert.ok(site.brief.analysis.notes.includes('Contexto'));
  for (const pid of E.partOrder(site.plan)) assert.match((await call('POST', '/api/code-maker', { action: 'part', site_id: siteId, part_id: pid })).body, /<<<OK>>>\s*$/);
  site = (await call('GET', '/api/code-maker/' + siteId)).body.site;
  assert.equal(site.status, 'ready');
  const calls = await seen();
  const planCall = calls.find((c) => c.stage === 'plan');
  assert.ok(planCall.system.startsWith('SISTEMA DE DESIGN — DESIGN.md'), 'o DESIGN.md é o começo do system prompt');
  assert.equal(planCall.max_tokens, 16000); assert.equal(planCall.temperature, 0.7);
  assert.equal(calls.find((c) => c.stage === 'analise').max_tokens, 3000);
  assert.ok(calls.filter((c) => c.stage === 'part').every((c) => c.max_tokens === 10000 && c.system.startsWith('SISTEMA DE DESIGN')));
  const logged = await all("SELECT kind, effort, model FROM ai_calls WHERE user_id IS NOT NULL");
  assert.ok(logged.some((c) => c.kind === 'cm_plan:analise' && c.effort === 'xhigh' && c.model === 'neva-1-5'));
  assert.equal((await call('POST', `/api/projects/${siteId}/publish`, { published: true })).body.published, 1);
});

test('nível baixo não faz análise e usa orçamento menor', async () => {
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para uma barbearia.' }, model: 'neva-1-0', effort: 'low' });
  const before = (await seen()).length;
  const plan = await call('POST', '/api/code-maker', { action: 'plan', site_id: created.body.site.id });
  assert.doesNotMatch(plan.body, /<etapa>analise/);
  const calls = (await seen()).slice(before);
  assert.ok(!calls.some((c) => c.stage === 'analise'));
  const p = calls.find((c) => c.stage === 'plan'); assert.equal(p.max_tokens, 7000); assert.equal(p.temperature, 0.4);
});

test('alteração + revisão por arquivo: rejeitar volta só aquele arquivo; desfazer a decisão reaplica', async () => {
  const edit = await call('POST', '/api/code-maker', { action: 'edit', site_id: siteId, instruction: 'Troque a chamada final e destaque os botões', model: 'neva-1-2', effort: 'medium' });
  assert.match(edit.body, /<<<OK>>>\s*$/);
  const ch = (await call('GET', `/api/code-maker/${siteId}/changes`)).body;
  assert.deepEqual(ch.files.map((f) => f.path).sort(), ['estilos.css', 'secoes/contato.html']);
  assert.ok(ch.files.find((f) => f.path === 'estilos.css').created);
  const rej = await call('POST', '/api/code-maker', { action: 'review', site_id: siteId, version_id: ch.version_id, rejected: ['secoes/contato.html'] });
  assert.equal(rej.status, 200);
  let site = rej.body.site;
  assert.doesNotMatch(site.parts.contato, /Retire amanhã/); assert.match(site.files['estilos.css'], /btn-destaque/);
  const pub = await call('GET', `/s/${site.slug}/`, undefined, { cookie: '' });
  assert.doesNotMatch(pub.body, /Retire amanhã a partir das 7h/);
  assert.match(pub.body, /"@type":"LocalBusiness","name":"Padaria Sol"/); // DESIGN.md cap. 21: dados estruturados só com o que o pedido trouxe
  const st = (await call('GET', `/api/code-maker/${siteId}/changes`)).body;
  assert.equal(st.files.find((f) => f.path === 'secoes/contato.html').state, 'rejected');
  site = (await call('POST', '/api/code-maker', { action: 'review', site_id: siteId, version_id: ch.version_id, rejected: [] })).body.site;
  assert.match(site.parts.contato, /Retire amanhã/);
  assert.equal((await call('POST', '/api/code-maker', { action: 'review', site_id: siteId, version_id: 1, rejected: [] })).status, 409);
});

test('Meus sites: a lista marca os sites do Builder e duplicar mantém o site editável no Studio', async () => {
  const items = (await call('GET', '/api/projects')).body.items.filter((p) => p.studio);
  assert.ok(items.some((p) => p.id === siteId && p.cm_status === 'ready'));
  const copy = (await call('POST', `/api/projects/${siteId}/duplicate`)).body;
  const s = (await call('GET', '/api/code-maker/' + copy.id)).body.site;
  assert.equal(s.status, 'ready'); assert.ok(s.plan.sections.length);
});

test('sonda de testes: desligada sem QA_TOKEN; ligada mede acertos por modelo/esforço', async () => {
  assert.equal((await call('POST', '/api/qa/ai-probe', { mode: 'models' })).status, 404);
  const token = 'x'.repeat(32);
  await run("UPDATE app_settings SET value=? WHERE key='QA_TOKEN'", token);
  await require('../server/lib/config').refresh(true);
  assert.equal((await call('POST', '/api/qa/ai-probe', { mode: 'models' }, { 'x-qa-token': 'y'.repeat(32) })).status, 404);
  const models = await call('POST', '/api/qa/ai-probe', { mode: 'models' }, { 'x-qa-token': token });
  assert.deepEqual(models.body.ids, ['mock/rapido', 'mock/padrao']);
  const eff = await call('POST', '/api/qa/ai-probe', { mode: 'effort', model: 'neva-1-5', effort: 'high', items: [6] }, { 'x-qa-token': token });
  assert.equal(eff.status, 200); assert.equal(eff.body.correct, 1); assert.ok(eff.body.calls.some((c) => /analise/.test(c.kind)));
  await run("UPDATE app_settings SET value='' WHERE key='QA_TOKEN'");
  await require('../server/lib/config').refresh(true);
});

test('escada de raciocínio nativo por família (medida na River): DeepSeek liga/desliga, GLM/Nemotron regulam', async () => {
  const ai = require('../server/lib/ai');
  await run("UPDATE app_settings SET value='reasoning_effort' WHERE key='RIVER_REASONING'");
  await require('../server/lib/config').refresh(true);
  assert.deepEqual(ai.reasoningParams('low', 'deepseek-ai/DeepSeek-V4.1-Flash'), {});
  assert.deepEqual(ai.reasoningParams('medium', 'deepseek-ai/DeepSeek-V4.1-Flash'), { reasoning_effort: 'low' });
  assert.deepEqual(ai.reasoningParams('xhigh', 'deepseek-ai/DeepSeek-V4.1-Flash'), { reasoning_effort: 'high' });
  assert.deepEqual(ai.reasoningParams('low', 'zai-org/GLM-5.3-Flash'), { reasoning_effort: 'low' });
  assert.deepEqual(ai.reasoningParams('medium', 'zai-org/GLM-5.3-Flash'), { reasoning_effort: 'medium' });
  await run("UPDATE app_settings SET value='' WHERE key='RIVER_REASONING'");
  await require('../server/lib/config').refresh(true);
  assert.deepEqual(ai.reasoningParams('high', 'zai-org/GLM-5.3-Flash'), {});
});

test('folga de tokens para o raciocínio nativo (ele conta no max_tokens)', () => {
  const ai = require('../server/lib/ai');
  assert.equal(ai.withHeadroom(9000, 'medium', {}), 9000);
  assert.equal(ai.withHeadroom(9000, 'medium', { reasoning_effort: 'low' }), 17000);
  assert.equal(ai.withHeadroom(9000, 'xhigh', { reasoning_effort: 'high' }), 25000);
});

test('DESIGN.md "preços verdadeiros": preço não informado sai do conteúdo; informado fica', () => {
  const none = E.informedPrices({ details: 'Clínica de fisioterapia em Campinas' });
  assert.equal(E.dropInventedPrices('A partir de R$ 120 por sessão.', none), '');
  assert.equal(E.dropInventedPrices('Pacote mensal: R$ 420/mês, sem fidelidade.', none), 'Pacote mensal, sem fidelidade.');
  assert.equal(E.dropInventedPrices('Inclui avaliação.', none), 'Inclui avaliação.');
  const some = E.informedPrices({ details: 'Corte R$ 45 e barba R$ 35,00' });
  assert.equal(E.dropInventedPrices('Corte por R$ 45 e barba por R$ 40', some), 'Corte por R$ 45 e barba');
  const brief = { businessName: 'Clínica', details: 'Clínica de fisioterapia', style: 'auto', assets: [] };
  const plan = E.normalizePlan({ title: 'C', description: 'd', direction: 'x', theme: 'light', palette: { brand: '#0f766e', brandDark: '#115e59', accent: '#f59e0b', ink: '#111827', paper: '#ffffff', surface: '#f3f4f6', muted: '#4b5563' }, fonts: { display: 'Fraunces', body: 'Figtree' },
    sections: [{ id: 'hero', label: 'Início', layout: 'hero-brilho', headline: 'h', brief: 'b', bg: 'paper' }, { id: 'programas', label: 'Programas', layout: 'planos', headline: 'h', brief: 'Sessão avulsa R$ 180', bg: 'surface' }] }, brief);
  assert.doesNotMatch(plan.sections[1].brief, /R\$/);
  const html = E.renderPart('programas', plan, brief, { title: 'Programas', items: [{ title: 'Sessão avulsa', text: 'A partir de R$ 180.', price: 'R$ 180', meta: '/sessão' }] });
  assert.doesNotMatch(html, /R\$/);
});
