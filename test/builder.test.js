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
process.env.CM_REF_INSPECT = '0';
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
  const writes = calls.filter((c) => c.stage === 'part'), reviews = calls.filter((c) => c.stage === 'review');
  assert.ok(writes.every((c) => c.max_tokens === 10000 && c.system.startsWith('SISTEMA DE DESIGN')));
  // Revisão: cada seção escrita pela IA (cabeçalho e rodapé saem sem IA) passa por uma segunda leitura crítica.
  assert.equal(reviews.length, writes.length); assert.ok(reviews.length >= 1);
  assert.ok(reviews.every((c) => c.system.startsWith('SISTEMA DE DESIGN')));
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
  const before2 = (await seen()).length;
  await call('POST', '/api/code-maker', { action: 'part', site_id: created.body.site.id, part_id: 'hero' });
  assert.ok(!(await seen()).slice(before2).some((c) => c.stage === 'review'), 'nível baixo não revisa');
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
  const NEMO = 'nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-NVFP4';
  assert.deepEqual(ai.reasoningParams('low', NEMO), { reasoning_effort: 'none' });
  assert.deepEqual(ai.reasoningParams('xhigh', NEMO), { reasoning_effort: 'high' });
  // Escrita do site (e a análise em texto): Nemotron desligado, GLM no mínimo, DeepSeek sem parâmetro.
  assert.deepEqual(ai.streamParams(NEMO), { reasoning_effort: 'none' });
  assert.deepEqual(ai.streamParams('zai-org/GLM-5.3-Flash'), { reasoning_effort: 'low' });
  assert.deepEqual(ai.streamParams('deepseek-ai/DeepSeek-V4.1-Flash'), {});
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

test('DESIGN.md contraste AA: cor da marca clara demais vira texto legível (mesmo tom, só mais escura)', () => {
  const pal = { brand: '#0ea5b7', brandDark: '#0b7f8c', accent: '#f2735f', ink: '#12355b', paper: '#ffffff', surface: '#eef7f8', muted: '#5b7285' };
  const fixed = E.readableBrand(pal, 'light');
  assert.ok(E.contrastRatio(fixed.brand, pal.paper) >= 4.5 && E.contrastRatio(fixed.brand, pal.surface) >= 4.5);
  assert.notEqual(fixed.brand, pal.brand);
  const good = { ...pal, brand: '#115e59' };
  assert.equal(E.readableBrand(good, 'light').brand, '#115e59');
  const dark = E.readableBrand({ ...pal, brand: '#1e3a8a', paper: '#0b0d12', surface: '#151821', ink: '#f4f2ee' }, 'dark');
  assert.ok(E.contrastRatio(dark.brand, '#0b0d12') >= 4.5);
});

test('DESIGN.md contraste AA: texto apagado da IA sobe para o secundário legível; enfeite grande fica', () => {
  assert.equal(E.liftFaintText('<p class="text-ink/50 text-xs">a</p><span class="text-white/60">b</span>'), '<p class="text-ink/70 text-xs">a</p><span class="text-white/70">b</span>');
  assert.equal(E.liftFaintText('<span aria-hidden="true" class="text-ink/10 text-9xl">01</span><p class="text-ink/80">c</p><div class="bg-ink/50">'), '<span aria-hidden="true" class="text-ink/10 text-9xl">01</span><p class="text-ink/80">c</p><div class="bg-ink/50">');
  const html = E.normalizePart('servicos', '<section id="servicos"><p class="text-ink/55">x</p></section>');
  assert.match(html, /text-ink\/70/);
  const footer = E.normalizePart('footer', '<footer>f</footer>\n<a class="fixed bottom-5" href="#">w</a>');
  assert.match(footer, /<aside aria-label="Atalho do WhatsApp"><a class="fixed/);
});

test('JSON da IA com texto em volta ainda é lido (sem raciocínio, o Nemotron abre com uma frase)', () => {
  const { parseJsonLoose } = require('../server/routes/codemaker');
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Aqui está a especificação:\n{"a":{"b":[1,2]}}\nPronto.'), { a: { b: [1, 2] } });
  assert.equal(parseJsonLoose('sem json aqui'), undefined);
});

test('blocos que funcionam: simulador e formulário montam, o script do site compila e os contatos vêm do pedido', () => {
  const details = 'Empresa de energia solar.\n- WhatsApp comercial: (62) 99123-4567. Telefone fixo: (62) 3251-7788.\n- E-mail: contato@exemplo.com.br\n- Endereço: Avenida T-63, 1500, sala 804, Setor Bueno, Goiânia - GO.\n- Instagram: @exemplosolar\nSimulador: economia estimada = 90% do valor da conta.\nQuero um formulário de orçamento.\nRuim (não use): "economize até 95%".';
  const contacts = E.extractContacts(details);
  assert.equal(contacts.address, 'Avenida T-63, 1500, sala 804, Setor Bueno, Goiânia - GO');
  assert.equal(E.phoneDigits(contacts.whatsapp), '5562991234567');
  assert.equal(E.phoneDigits(contacts.phone), '556232517788');
  assert.equal(contacts.instagram, 'exemplosolar');
  const brief = { businessName: 'Sol', city: 'Goiânia', details, style: 'auto', assets: [] };
  assert.equal(E.briefPhone(brief), '5562991234567');
  assert.equal(E.informedRate(brief, 90), true);
  assert.equal(E.informedRate(brief, 95), false, 'linha do que NÃO fazer não vale como regra');
  let plan = E.normalizePlan({ title: 'T', description: 'd', direction: 'x', theme: 'light', palette: { brand: '#1d4ed8', brandDark: '#1e40af', accent: '#f59e0b', ink: '#111827', paper: '#ffffff', surface: '#f3f4f6', muted: '#4b5563' }, fonts: { display: 'Sora', body: 'Figtree' },
    sections: [{ id: 'hero', label: 'Início', layout: 'hero-brilho', headline: 'h', brief: 'b', bg: 'paper' }, { id: 'simulador', label: 'Simulador', layout: 'lista-precos', brief: 'b', bg: 'surface' }, { id: 'orcamento', label: 'Orçamento', layout: 'contato', brief: 'b', bg: 'paper' }] }, brief);
  plan = E.ensureInteractive(plan, brief);
  assert.deepEqual(plan.sections.map((s) => s.layout), ['hero-brilho', 'simulador', 'formulario']);
  const C = (o) => E.parseContent(JSON.stringify(o));
  const calc = { label: 'Conta', button: 'Calcular', rate: 90, min: 100, max: 50000, month: 'Mês', year: 'Ano', empty: 'Vazio', range: 'Fora', disclaimer: 'Estimativa', message: 'Simulei {valor}' };
  const sim = E.renderPart('simulador', plan, brief, C({ title: 'Simule', primary: 'Quero', calc }));
  assert.match(sim, /data-nv-calc data-rate="0.9" data-min="100" data-max="50000" data-wa="https:\/\/wa.me\/5562991234567"/);
  assert.match(sim, /<label for="simulador-valor"/);
  // Regra que não está no pedido: o bloco não calcula (vira contato).
  assert.doesNotMatch(E.renderPart('simulador', plan, brief, C({ title: 'Simule', primary: 'Quero', calc: { ...calc, rate: 95 } })), /data-nv-calc/);
  const form = E.renderPart('orcamento', plan, brief, C({ title: 'Olá!', primary: 'Enviar pelo WhatsApp', badge: 'Pronto! Abrimos o WhatsApp com os seus dados. É só enviar a mensagem.',
    items: [{ title: 'Nome', meta: 'texto', text: 'Como podemos te chamar?' }, { title: 'Cidade', meta: 'escolha', list: ['Goiânia', 'Trindade'], text: 'Escolha a sua cidade.' }] }));
  assert.match(form, /data-nv-form/);
  assert.match(form, /aria-describedby="orcamento-campo-1-erro"/);
  assert.match(form, /É só enviar a mensagem\./);
  const footer = E.footerHtml(plan, brief);
  assert.match(footer, /google\.com\/maps\/search/);
  assert.match(footer, /instagram\.com\/exemplosolar/);
  // Todo <script> do site precisa compilar (um "\n" dentro do template já quebrou o site inteiro).
  const html = E.assembleSite(plan, { header: E.headerHtml(plan, brief), hero: '', simulador: sim, orcamento: form, footer });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 1);
  for (const code of scripts) assert.doesNotThrow(() => new Function(code));
  assert.match(html, /replace\(\/\[\^\\d,\.\]\/g/, 'regex do valor com \\d de verdade');
});

test('textos entre aspas do pedido vão como exatos; exemplo do que evitar não; fonte de reserva calibrada evita o pulo', () => {
  const details = 'Botão principal: "Pedir orçamento gratuito".\nO público desconfia de "conta zero".\nRuim (não use): "A melhor empresa de Goiás".\nMensagem: "Como podemos te chamar?"';
  const quoted = E.quotedTexts({ details });
  assert.match(quoted, /"Pedir orçamento gratuito"/);
  assert.match(quoted, /"Como podemos te chamar\?"/);
  assert.doesNotMatch(quoted, /conta zero|melhor empresa/);
  const plan = E.normalizePlan({ title: 'T', description: 'd', direction: 'x', theme: 'light', palette: { brand: '#1d4ed8', brandDark: '#1e40af', accent: '#f59e0b', ink: '#111827', paper: '#ffffff', surface: '#f3f4f6', muted: '#4b5563' }, fonts: { display: 'Oswald', body: 'Source Sans 3' },
    sections: [{ id: 'hero', label: 'Início', layout: 'hero-brilho', headline: 'h', brief: 'b', bg: 'paper' }] }, { businessName: 'X', details: 'x', style: 'auto', assets: [] });
  const head = E.buildHead(plan);
  assert.match(head, /@font-face\{font-family:"Oswald Reserva";src:local\("Arial"\)[^}]*size-adjust:83%\}/);
  assert.match(head, /"display":\["Oswald","Oswald Reserva"/);
  assert.match(head, /body\{font-family:'Source Sans 3','Source Sans 3 Reserva'/);
});

test('alteração com formato quebrado: o servidor pede a correção ao modelo e a alteração é aplicada (sem erro para a pessoa)', async () => {
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para a Padaria Dois em Recife, pedidos pelo WhatsApp.' }, model: 'neva-1-0', effort: 'medium' });
  const id = created.body.site.id;
  await call('POST', '/api/code-maker', { action: 'plan', site_id: id });
  const site = (await call('GET', '/api/code-maker/' + id)).body.site;
  for (const pid of E.partOrder(site.plan)) await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: pid });
  const before = (await seen()).length;
  const edit = await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: 'Troque a chamada final (QUEBRAR_FORMATO)' });
  assert.match(edit.body, /<<<OK>>>\s*$/, edit.body.slice(-300));
  const calls = (await seen()).slice(before).filter((c) => c.stage === 'edit');
  assert.equal(calls.length, 2, 'uma resposta quebrada + uma de correção');
  const changes = (await call('GET', `/api/code-maker/${id}/changes`)).body;
  assert.ok(changes.files.some((f) => f.path === 'secoes/contato.html'));
});

test('<antes> fechado com </depois> é lido como o modelo quis dizer', () => {
  const edit = E.parseProjectEdit('<editar arquivo="secoes/hero.html">\n<antes>\nTexto velho\n</depois>\n<depois>\nTexto novo\n</depois>\n</editar>');
  assert.equal(edit.invalid, 0); assert.equal(edit.operations.length, 1);
  const good = E.parseProjectEdit('<editar arquivo="secoes/hero.html">\n<antes>\nA\n</antes>\n<depois>\nB\n</depois>\n</editar>');
  assert.equal(good.invalid, 0); assert.equal(good.operations.length, 1);
});

// ---- Motor de referências: seleção contextual, medição de HTML real e rastro até o prompt do modelo ----
const REF = require('../server/lib/codemaker/references');
test('referências: a seleção muda com o ramo, descarta a identidade da plataforma e explica o porquê', async () => {
  const items = await all("SELECT id,title,niche,style,site_type,url,content FROM library_items WHERE kind='design' AND published=1");
  assert.ok(items.length >= 20, 'a biblioteca tem os itens de design');
  const pick = (b) => REF.pickDesigns(b, items);
  const law = pick({ businessName: 'Almeida & Prado Advogados', details: 'Escritório de advocacia premium, direito empresarial', style: 'elegant' });
  const tech = pick({ businessName: 'Nexo IA', details: 'Plataforma de inteligência artificial e automação para startups', style: 'dark' });
  const solar = pick({ businessName: 'Sol do Cerrado', details: 'Energia solar fotovoltaica residencial em Goiânia', style: 'auto' });
  for (const r of [law, tech, solar]) { assert.ok(r.selected.length >= 1 && r.selected.length <= 3); assert.ok(r.selected.every((s) => s.why.length && s.role)); assert.ok(!r.selected.some((s) => /^Neva Growth/.test(s.it.title))); assert.ok(r.discarded.some((d) => /plataforma/.test(d.reason))); }
  const ids = (r) => r.selected.map((s) => s.it.id).join(',');
  assert.notEqual(ids(law), ids(tech)); assert.notEqual(ids(tech), ids(solar)); assert.notEqual(ids(law), ids(solar));
  assert.ok(tech.selected.some((s) => /escuro|gradiente|anima/i.test(s.it.style)));
  assert.ok(law.selected.some((s) => /editorial|luxo|premium|elegante/i.test(s.it.style)));
});
test('referências: parseFacts mede fontes, cores, estrutura e bibliotecas de animação do HTML real', () => {
  const html = '<head><meta name="theme-color" content="#0a2540"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400&display=swap" rel="stylesheet"><script src="/js/gsap.min.js"></script></head><body><section><h1>Energia <b>limpa</b></h1></section><section><h2>A</h2><h2>B</h2></section><video></video>';
  const f = REF.parseFacts(html, 'a{color:#635bff;background:#635BFF} b{color:#ccc} i{background:#ff6b35;font-family:"DM Serif Display",serif}');
  assert.deepEqual(f.fonts.slice(0, 2), ['Playfair Display', 'Inter']); assert.ok(f.fonts.includes('DM Serif Display'));
  assert.equal(f.colors[0], '#635bff'); assert.ok(f.colors.includes('#ff6b35')); assert.ok(!f.colors.includes('#ccc'));
  assert.equal(f.themeColor, '#0a2540'); assert.deepEqual(f.libs, ['gsap']); assert.equal(f.h1, 'Energia limpa'); assert.equal(f.sections, 2); assert.equal(f.h2, 2); assert.equal(f.video, true);
  assert.deepEqual(REF.urlsIn('veja https://stripe.com/br, e http://exemplo.com.br.'), ['https://stripe.com/br', 'http://exemplo.com.br']);
});
test('referências: o bloco escolhido chega ao prompt do plano e o rastro fica no site', async () => {
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para o escritório de advocacia Almeida & Prado em Goiânia, visual elegante e editorial.', style: 'elegant' } });
  const id = created.body.site.id;
  assert.match((await call('POST', '/api/code-maker', { action: 'plan', site_id: id })).body, /<<<OK>>>\s*$/);
  const planCall = (await seen()).filter((c) => c.stage === 'plan').slice(-2).find((c) => c.hasRefs) || {};
  assert.equal(planCall.hasRefs, true); assert.ok(planCall.refTitles.length >= 1);
  const t = (await call('GET', '/api/code-maker/' + id)).body.site.brief.designTrace;
  assert.deepEqual(planCall.refTitles, t.selected.map((s) => s.title)); assert.ok(t.found >= 20 && t.discarded.length && t.chars > 300 && t.inspection === 'off');
});
