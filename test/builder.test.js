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
process.env.CM_RENDER_QA = '0';
const MOCK_PORT = 3400 + Math.floor(Math.random() * 400);
process.env.RIVER_BASE_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;
const { createApp } = require('../server/index.js');
const { run, all } = require('../server/lib/db');
const DM = require('../server/lib/codemaker/design-md');
const DC = require('../server/lib/codemaker/design-context');
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

test('SYSTEM_PROMPT + DESIGN.md V2 compilados: 15 blocos de identidade, 60+ seções, contrato §29 e seleção por etapa e ramo', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'docs', 'design', 'DESIGN.md'), 'utf8');
  assert.equal(DM.STATS.identitySections, 15); assert.ok(DM.STATS.designSections >= 60);
  for (const m of src.match(/^## \d+\./gm)) assert.ok(DM.DESIGN[m.match(/\d+/)[0]], m);
  assert.match(DM.DESIGN['29'].text, /"schemaVersion": "2\.0"/); assert.ok(DM.IDENTITY['ANTI-GENERIC VISUAL RULES'].includes('Reject default site-builder output'));
  const law = DC.contextFor('plan', { niche: 'advocacia empresarial', details: 'escritório de advocacia' }), solar = DC.contextFor('plan', { details: 'energia solar fotovoltaica' }), saas = DC.contextFor('plan', { details: 'plataforma de inteligência artificial' });
  assert.ok(law.text.startsWith('SYSTEM PROMPT — NEVA BUILDER (V2)'));
  assert.deepEqual([law.used.sector, solar.used.sector, saas.used.sector], ['juridico', 'energia', 'saas']);
  assert.ok(law.used.sections.includes('33') && law.used.sections.includes('21.1') && !law.used.sections.includes('34'));
  assert.ok(solar.used.sections.includes('34') && solar.used.sections.includes('21.7')); assert.ok(saas.used.sections.includes('35') && saas.used.sections.includes('21.6'));
  assert.ok(law.used.chars < 40000, 'o plano não recebe o arquivo inteiro'); assert.ok(DC.contextFor('part', {}).used.chars < 20000); assert.ok(DC.contextFor('edit', {}).used.chars < 8000);
  assert.ok(!/```/.test(law.text), 'blocos de código de exemplo ficam de fora');
  assert.notEqual(law.text, solar.text);
  assert.ok(src.length < 60000 && DM.DESIGN['16'].text.includes('purple-to-blue gradient hero'));
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
  assert.equal((await call('POST', '/api/code-maker', { action: 'finish', site_id: siteId })).status, 200);
  site = (await call('GET', '/api/code-maker/' + siteId)).body.site;
  assert.equal(site.status, 'ready');
  const calls = await seen();
  const planCall = calls.find((c) => c.stage === 'plan');
  assert.ok(planCall.system.startsWith('SYSTEM PROMPT — NEVA BUILDER (V2)'), 'o DESIGN.md é o começo do system prompt');
  assert.equal(planCall.max_tokens, 16000); assert.equal(planCall.temperature, 0.7);
  assert.equal(calls.find((c) => c.stage === 'analise').max_tokens, 3000);
  const writes = calls.filter((c) => c.stage === 'part'), reviews = calls.filter((c) => c.stage === 'review');
  assert.ok(writes.every((c) => c.max_tokens === 10000 && c.system.startsWith('SYSTEM PROMPT — NEVA BUILDER (V2)')));
  // Revisão: cada seção escrita pela IA (cabeçalho e rodapé saem sem IA) passa por uma segunda leitura crítica.
  // Modo livre: a IA escreve a seção inteira em HTML (regras do Dyad no prompt); a revisão JSON de blocos não se aplica.
  assert.equal(reviews.length, 0); assert.ok(writes.length >= 3);
  assert.ok(writes.every((c) => c.hasRefs === false));
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
  await call('POST', '/api/code-maker', { action: 'finish', site_id: id });
  const before = (await seen()).length;
  const edit = await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: 'Troque a chamada final (QUEBRAR_FORMATO)' });
  assert.match(edit.body, /<<<OK>>>\s*$/, edit.body.slice(-300));
  const calls = (await seen()).slice(before).filter((c) => c.stage === 'edit');
  assert.equal(calls.length, 2, 'uma resposta quebrada + uma de correção');
  const changes = (await call('GET', `/api/code-maker/${id}/changes`)).body;
  assert.ok(changes.files.some((f) => f.path === 'secoes/contato.html'));
});

async function builtSite() {
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site para a Padaria Tres em Recife, pedidos pelo WhatsApp.' }, model: 'neva-1-0', effort: 'medium' });
  const id = created.body.site.id;
  await call('POST', '/api/code-maker', { action: 'plan', site_id: id });
  const site = (await call('GET', '/api/code-maker/' + id)).body.site;
  for (const pid of E.partOrder(site.plan)) await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: pid });
  await call('POST', '/api/code-maker', { action: 'finish', site_id: id });
  return id;
}
test('alteração cujo trecho "antes" não bate: o servidor pede o arquivo inteiro reescrito e a alteração é aplicada', async () => {
  const id = await builtSite();
  const edit = await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: 'Troque a chamada final (ANTES_ERRADO)' });
  assert.match(edit.body, /<<<OK>>>\s*$/, edit.body.slice(-300));
  const changes = (await call('GET', `/api/code-maker/${id}/changes`)).body;
  assert.ok(changes.files.some((f) => f.path === 'secoes/contato.html' && /REESCRITO/.test(f.after)), 'o arquivo reescrito foi gravado');
});
test('alteração que volta sem nenhuma operação: o servidor cobra as operações e aplica', async () => {
  const id = await builtSite();
  const edit = await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: 'Troque a chamada final (RESPOSTA_VAZIA)' });
  assert.match(edit.body, /<<<OK>>>\s*$/, edit.body.slice(-300));
  assert.ok((await call('GET', `/api/code-maker/${id}/changes`)).body.files.length > 0);
});

test('alteração em site de modo livre usa o modelo de código (o mesmo que escreve as seções) e pede a seção inteira', async () => {
  const cfg = require('../server/lib/config');
  const id = await builtSite();
  const site = (await call('GET', '/api/code-maker/' + id)).body.site;
  const free = Object.keys(site.parts || {}).some((pid) => E.isFreeSection(site.plan, pid, site.brief));
  await run("INSERT INTO app_settings(key,value) VALUES ('NEVA_CODE_MODEL','mock/padrao') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value");
  await cfg.refresh(true);
  try {
    const before = (await seen()).length;
    await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: 'Troque a chamada final' });
    const edits = (await seen()).slice(before).filter((c) => c.stage === 'edit');
    assert.ok(edits.length);
    if (free) assert.ok(edits.every((c) => c.model === 'mock/padrao'), 'modo livre: modelo de código nas alterações');
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server/lib/codemaker/engine.js'), 'utf8'), /REESCREVA O ARQUIVO INTEIRO/, 'o prompt de alteração manda reescrever a seção inteira');
  } finally {
    await run("DELETE FROM app_settings WHERE key='NEVA_CODE_MODEL'"); await cfg.refresh(true);
  }
});
test('fotos enviadas pelo cliente: ficam guardadas, são servidas em /u/<id>, entram no site como fotos do negócio e chegam ao pedido de alteração', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  assert.equal((await call('POST', '/api/code-maker/images', { dataUrl: 'data:text/html;base64,PGI+', name: 'x.html' })).status, 400, 'só PNG, JPG e WebP');
  const up = await call('POST', '/api/code-maker/images', { dataUrl: png, name: 'fachada.png' });
  assert.equal(up.status, 200); assert.match(up.body.url, /^\/u\/[a-f0-9]{24}\.png$/);
  const pub = await fetch(base + up.body.url);
  assert.equal(pub.status, 200); assert.equal(pub.headers.get('content-type'), 'image/png'); assert.ok((await pub.arrayBuffer()).byteLength > 20, 'público, sem login');
  assert.equal((await fetch(base + '/u/' + '0'.repeat(24) + '.png')).status, 404);
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site da Padaria Quatro em Recife, pedidos pelo WhatsApp.' }, assets: [{ url: up.body.url, name: 'fachada.png', kind: 'photo' }, { url: '/u/' + 'f'.repeat(24) + '.png', kind: 'photo' }, { url: 'https://evil.example/x.png', kind: 'photo' }] });
  const id = created.body.site.id;
  const row = await all('SELECT brief FROM code_sites WHERE project_id=?', id);
  const brief = JSON.parse(row[0].brief);
  assert.deepEqual(brief.assets, [{ url: up.body.url, kind: 'photo' }], 'só imagens nossas e do próprio usuário');
  assert.match(brief.details, /IMAGENS ENVIADAS PELO CLIENTE[\s\S]*fachada\.png/);
  await call('POST', '/api/code-maker', { action: 'plan', site_id: id });
  const site = (await call('GET', '/api/code-maker/' + id)).body.site;
  for (const pid of E.partOrder(site.plan)) await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: pid });
  await call('POST', '/api/code-maker', { action: 'finish', site_id: id });
  const before = (await seen()).length;
  await call('POST', '/api/code-maker', { action: 'edit', site_id: id, instruction: 'Use minha foto no topo', assets: [{ url: up.body.url, name: 'fachada.png', kind: 'photo' }] });
  const edit = (await seen()).slice(before).find((c) => c.stage === 'edit');
  assert.equal(edit.userHasImages, up.body.url, 'a URL da foto vai no pedido de alteração');
  const v = await all("SELECT instruction FROM site_versions WHERE project_id=? AND kind='edit' ORDER BY id DESC LIMIT 1", id);
  assert.equal(v[0]?.instruction, 'Use minha foto no topo', 'o histórico guarda só o que a pessoa escreveu');
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

// ---- Composição, banco de fotos e revisão visual (navegador real; pula se não houver navegador) ----
const QA = require('../server/lib/codemaker/visual-qa');
test('composição: o ramo define contêiner, respiro e títulos; sem histórico o tema não cai sempre no escuro', () => {
  const r = (details, style) => E.siteRecipe({ businessName: 'X', details, style }, [], 'a');
  const adv = r('escritório de advocacia empresarial', 'auto'), tech = r('plataforma de inteligência artificial para startups', 'auto'), solar = r('energia solar fotovoltaica residencial', 'auto');
  assert.deepEqual([adv.composition.container, adv.composition.density], ['narrow', 'airy']);
  assert.deepEqual([tech.composition.container, tech.composition.density], ['wide', 'compact']);
  assert.notEqual(solar.composition.headings, 'upper'); assert.ok(['sentence', 'tight'].includes(solar.composition.headings));
  assert.equal(new Set([adv, tech, solar].map((x) => JSON.stringify(x.composition))).size, 3);
  assert.equal(adv.theme, 'light'); assert.equal(tech.theme, 'dark');
  const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((s) => E.siteRecipe({ businessName: 'Y', details: 'um negócio qualquer sem ramo definido' }, [], s).theme);
  assert.ok(seeds.includes('light') && seeds.includes('dark'), 'sem ramo, o tema varia com a semente');
  assert.equal(E.cleanComposition({ container: 'gigante', density: 'airy', headings: 'upper', rhythm: 'x' }).density, 'airy');
  assert.deepEqual(Object.keys(E.cleanComposition({ container: 'gigante', rhythm: 'x' })), []);
});
test('composição: chega ao HTML final (tema do Tailwind e CSS) e o padrão não muda sites antigos', () => {
  const brief = { businessName: 'Sol', details: 'energia solar' };
  const base = E.normalizePlan({ title: 't', description: 'd', direction: 'x', theme: 'light', palette: { brand: '#0f3b57', brandDark: '#0a2a3f', accent: '#f2a900', ink: '#10202b', paper: '#fbf8f0', surface: '#f1ebdc', muted: '#566470' }, fonts: { display: 'Inter', body: 'Inter' }, sections: [{ id: 'hero', label: 'Início', layout: 'hero-brilho', headline: 'Sol', brief: 'b', bg: 'paper' }] }, brief);
  const old = E.assembleSite(base, { header: '', footer: '', hero: '<section id="hero"></section>' });
  assert.match(old, /"maxWidth":\{"7xl":"80rem"\}/); assert.doesNotMatch(old, /text-transform:uppercase!important/);
  const art = E.assembleSite({ ...base, composition: { container: 'wide', density: 'compact', headings: 'upper', rhythm: 'rule' } }, { header: '', footer: '', hero: '<section id="hero"></section>' });
  assert.match(art, /"maxWidth":\{"7xl":"96rem"\}/); assert.match(art, /"spacing":\{"24":"4\.25rem","32":"5\.5rem"\}/);
  assert.match(art, /text-transform:uppercase!important/); assert.match(art, /main>section\+section\{border-top/);
});
test('fotos: solar não cai em fotos de escritório e o jurídico não abre com a estátua da Justiça', () => {
  assert.doesNotMatch(E.photoCatalog('energia solar'), /escritório moderno/);
  assert.match(E.photoCatalog('energia solar'), /casa/);
  assert.doesNotMatch(E.photoCatalog('advocacia').split('\n')[0], /estátua/);
});
test('revisão visual: mede um site real renderizado e acusa overflow e contraste de verdade', { skip: !QA.available() && 'sem navegador' }, async () => {
  const ok = '<!doctype html><meta name=viewport content="width=device-width"><main><section id=a style="background:#fff;color:#111;padding:24px"><h1>Título</h1><p style="font-size:16px">Texto legível</p></section></main>';
  const good = await QA.inspectHtml(ok);
  assert.equal(good.available, true); assert.equal(good.critical, 0); assert.equal(good.results.length, 3);
  const bad = await QA.inspectHtml('<!doctype html><meta name=viewport content="width=device-width"><main><section style="background:#fff;color:#ccc;padding:24px"><h1>A</h1><h1>B</h1><p style="font-size:10px;color:#ddd">pequeno</p><div style="width:900px;height:20px;background:red"></div></section></main>');
  const kinds = new Set(bad.findings.map((f) => f.kind));
  for (const k of ['overflow-horizontal', 'contraste-baixo', 'texto-pequeno', 'h1']) assert.ok(kinds.has(k), k);
  assert.ok(bad.critical >= 1);
});

test('biblioteca: referências verificadas entram só com medida, sem descrição inventada, e a seleção as encontra por ramo', async () => {
  const list = require('../docs/referencias-verificadas.json');
  assert.ok(list.length >= 5 && list.every((r) => r.verifiedAt && r.measured && r.measured.h1 && /^https:\/\//.test(r.url)));
  const rows = await all("SELECT title,content,url FROM library_items WHERE kind='design' AND category='Referência verificada'");
  assert.equal(rows.length, list.length);
  assert.ok(rows.every((r) => /Medido em \d{4}-\d{2}-\d{2}/.test(r.content) && /fonte realmente renderizada/.test(r.content)));
  await require('../server/lib/seed').seedVerifiedReferences();
  assert.equal((await all("SELECT id FROM library_items WHERE category='Referência verificada'")).length, list.length, 'idempotente');
  const items = await all("SELECT id,title,niche,style,site_type,url,content FROM library_items WHERE kind='design' AND published=1");
  const top = (details) => REF.pickDesigns({ businessName: 'X', details }, items).selected.map((s) => s.it.title);
  assert.ok(top('Escritório de advocacia empresarial em Goiânia').includes('Mattos Filho'));
  assert.ok(top('Empresa de energia solar fotovoltaica residencial').includes('Sunrun'));
  assert.ok(top('Clínica de saúde e bem-estar com especialistas').includes('Cleveland Clinic'));
  assert.ok(top('Imobiliária com imóveis para comprar e alugar').some((t) => ['QuintoAndar', 'Zillow'].includes(t)));
});

test('composição: a decisão chega às partes que a IA escreve', () => {
  const brief = { businessName: 'Sol', details: 'x' };
  const plan = E.normalizePlan({ title: 't', description: 'd', direction: 'dir', theme: 'light', palette: { brand: '#0f3b57', brandDark: '#0a2a3f', accent: '#f2a900', ink: '#10202b', paper: '#fbf8f0', surface: '#f1ebdc', muted: '#566470' }, fonts: { display: 'Inter', body: 'Inter' }, sections: [{ id: 'hero', label: 'Início', layout: 'hero-brilho', headline: 'Sol', brief: 'b', bg: 'paper' }, { id: 'faq', label: 'FAQ', layout: 'faq', headline: 'Dúvidas', brief: 'b', bg: 'surface' }] }, brief);
  const msg = (c) => E.buildPartMessage('faq', { ...plan, composition: c }, brief);
  assert.match(msg({ headings: 'upper', container: 'narrow' }), /CAIXA ALTA[\s\S]*coluna estreita/);
  assert.doesNotMatch(msg({ headings: 'sentence', container: 'wide' }), /CAIXA ALTA|coluna estreita/);
});

test('receita: guarda-corpos de diversidade respeitam a direção da IA e não injetam seções genéricas', () => {
  const brief = { businessName: 'Sol', details: 'energia solar' };
  const plan = E.normalizePlan({ title: 't', description: 'd', direction: 'x', theme: 'light', palette: { brand: '#0f3b57', brandDark: '#0a2a3f', accent: '#f2a900', ink: '#10202b', paper: '#fbf8f0', surface: '#f1ebdc', muted: '#566470' }, fonts: { display: 'Fraunces', body: 'Figtree' }, header: 'menu-pilula', effects: ['split-text'],
    creative: { thesis: 'Engenharia precisa com caráter editorial ensolarado.', primaryDirection: 'arquitetural', principles: ['fotografia grande'], forbiddenPatterns: ['orbe brilhante'], signatureElement: 'grade de painéis' },
    sections: [{ id: 'hero', label: 'Início', layout: 'hero-editorial', headline: 'Sol', brief: 'b', bg: 'paper', businessPurpose: 'mostrar o que a empresa instala', singleMessage: 'Instalação com projeto e homologação.', proofStatus: 'none' }, { id: 'faq', label: 'FAQ', layout: 'faq', headline: 'Dúvidas', brief: 'b', bg: 'surface' }] }, brief);
  assert.equal(plan.creative.primaryDirection, 'arquitetural'); assert.equal(plan.sections[0].proofStatus, 'none');
  const recipe = E.siteRecipe(brief, [], 'x');
  const kept = E.applyRecipe(plan, { ...recipe, recentHeroes: [] }, brief);
  assert.equal(kept.sections[0].layout, 'hero-editorial'); assert.equal(kept.header, 'menu-pilula'); assert.equal(kept.fonts.display, 'Fraunces'); assert.deepEqual(kept.effects, ['split-text']);
  assert.equal(kept.sections.length, 2, 'nada de letreiro, faixa ou galeria injetados'); assert.ok(!kept.sections.some((s) => ['letreiro', 'faixa-destaque'].includes(s.layout)));
  const swapped = E.applyRecipe(plan, { ...recipe, recentHeroes: ['hero-editorial'] }, brief);
  assert.equal(swapped.sections[0].layout, recipe.hero, 'repetir o topo de um site recente troca só o topo');
  assert.match(E.buildPartMessage('faq', { ...plan }, brief), /Tese criativa do site: Engenharia precisa/);
  assert.match(E.buildPartMessage('hero', { ...plan }, brief), /Mensagem única da seção: "Instalação com projeto e homologação\."[\s\S]*Prova nesta seção: nenhuma/);
  const spec = DC.designSpec({ ...kept, business: { phone: '5562991234567' } }, { ...brief, designUsed: { stage: 'plan' } });
  assert.equal(spec.schemaVersion, '2.0'); assert.equal(spec.creative.signatureElement, 'grade de painéis'); assert.equal(spec.qa.visualReview, 'not_verified'); assert.equal(spec.qa.build, 'not_run');
  assert.equal(spec.integrations[0].status, 'configured'); assert.equal(spec.referenceSelectionLog.retrievalStatus, 'unavailable');
});
test('referências: ramo sem cobertura declara a ausência em vez de forçar layout SaaS', async () => {
  const none = await REF.buildReferences({ businessName: 'Flor & Cia', details: 'Floricultura de bairro com entregas e arranjos para casamentos' });
  assert.equal(none.trace.coverage, 'missing'); assert.match(none.block, /cobertura ausente/); assert.equal(none.trace.selected.length, 0);
  const law = await REF.buildReferences({ businessName: 'X', details: 'Escritório de advocacia empresarial', style: 'elegant' });
  assert.deepEqual(law.trace.selected.map((s) => s.title), ['Mattos Filho']);
  assert.ok(law.trace.discarded.some((d) => /cobertura de setor ausente/.test(d.reason)));
  const tech = await REF.buildReferences({ businessName: 'Nexo', details: 'Plataforma de inteligência artificial para startups', style: 'dark' });
  assert.ok(tech.trace.selected.length >= 1 && tech.trace.selected.length <= 3);
});

test('modo livre (estilo Dyad): seções escritas em HTML; blocos só onde precisa funcionar; regras do Dyad e HTML saneado', () => {
  const brief = { businessName: 'Clínica Aurora', niche: 'clínica odontológica', city: 'São Paulo', phone: '5511991234567', details: 'Clínica odontológica em São Paulo.' };
  const mk = (sections) => E.normalizePlan({ title: 't', description: 'd', direction: 'dir', theme: 'light', palette: { brand: '#1f4e4a', brandDark: '#143532', accent: '#c9a96e', ink: '#15201f', paper: '#f8f6f1', surface: '#e9eee9', muted: '#5a6764' }, fonts: { display: 'Fraunces', body: 'Figtree' }, sections }, brief);
  const plan = mk([{ id: 'hero', label: 'Início', layout: 'hero-editorial', headline: 'Sorriso cuidado', brief: 'b', bg: 'paper', layoutFamily: 'split editorial' }, { id: 'tratamentos', label: 'Tratamentos', layout: 'bento', headline: 'Tratamentos', brief: 'b', bg: 'surface', layoutFamily: 'grade assimétrica de pesos diferentes' }, { id: 'agendar', label: 'Agendar', layout: 'formulario', headline: 'Agende', brief: 'b', bg: 'paper' }]);
  assert.equal(E.isFreeSection(plan, 'hero', brief), true); assert.equal(E.isFreeSection(plan, 'tratamentos', brief), true);
  assert.equal(E.isFreeSection(plan, 'agendar', brief), false, 'formulário continua sendo bloco funcional');
  assert.equal(E.isFreeSection(plan, 'header', brief), false); assert.equal(E.isFreeSection(plan, 'tratamentos', { ...brief, generation: 'blocos' }), false);
  const msg = E.buildFreePartMessage('tratamentos', plan, brief);
  assert.match(msg, /FAMÍLIA DE COMPOSIÇÃO desta seção: grade assimétrica de pesos diferentes/); assert.match(msg, /Vizinhas \(não repita a estrutura\): anterior = hero → split editorial/);
  assert.match(msg, /CATÁLOGO DE FOTOS[\s\S]*images\.unsplash\.com\/photo-/); assert.match(msg, /href="https:\/\/wa\.me\/5511991234567/); assert.match(E.buildFreePartMessage('hero', plan, brief), /É O TOPO: use <h1>/);
  assert.match(E.FREE_PART_SYSTEM, /MODO LIVRE/); assert.match(E.FREE_PART_SYSTEM, /Proibido: grade de três cartões iguais/);
  const dirty = E.normalizePart('faq', E.parsePart('```html\n<section id="faq"><script>alert(1)</script><h2 onclick="x()">Dúvidas</h2><style>*{}</style></section>\n```').html);
  assert.doesNotMatch(dirty, /<script|onclick|<style/i); assert.match(dirty, /<h2>Dúvidas<\/h2>/);
  const DY = require('../server/lib/codemaker/dyad-rules');
  assert.equal(DY.SOURCE.license, 'Apache-2.0'); assert.match(DY.ADDITIONAL_GUIDELINES, /NEVER make partial changes/); assert.match(DY.ADDITIONAL_GUIDELINES, /ALWAYS generate responsive designs/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'docs', 'dyad', 'LICENSE')) && fs.existsSync(path.join(__dirname, '..', 'docs', 'dyad', 'system_prompt.ts')));
});

test('modo livre: conserta HTML da IA que esvaziou um site real (div autofechada estilo JSX e camada -z sem isolate)', () => {
  const bad = '<section id="hero" class="bg-paper py-24"><div class="relative"><div class="absolute inset-0 -z-10"><img src="x" alt="a" /><div class="absolute inset-0 bg-black/50" /></div><div class="max-w-3xl"><h1>Título</h1><p>Texto</p></div></div></section>';
  const fixed = E.normalizePart('hero', E.parsePart('```html\n' + bad + '\n```').html);
  assert.ok(fixed.includes('<div class="absolute inset-0 bg-black/50"></div></div><div class="max-w-3xl">'), 'a camada decorativa fecha antes do conteúdo');
  assert.match(fixed, /^<section id="hero" class="bg-paper py-24 relative isolate">/);
  assert.equal(E.expandSelfClosing('<svg><path d="M0"/></svg><br/><img src="x"/><span class="a"/>'), '<svg><path d="M0"/></svg><br/><img src="x"/><span class="a"></span>');
  assert.equal(E.ensureStackingContext('<section id="a" class="relative isolate"><div class="absolute"></div></section>'), '<section id="a" class="relative isolate"><div class="absolute"></div></section>');
  assert.equal(E.ensureStackingContext('<section id="a"><p>sem camadas</p></section>'), '<section id="a"><p>sem camadas</p></section>');
  assert.match(E.FREE_PART_SYSTEM, /NUNCA escreva <div \.\.\. \/>/); assert.match(E.FREE_PART_SYSTEM, /colchetes de modelo como \[NOME\]/);
});

test('modelo das seções livres: escolhe o melhor modelo de código liberado para a chave, sem inventar', () => {
  const AI = require('../server/lib/ai');
  assert.equal(AI.chooseCodeModel(['deepseek-ai/DeepSeek-V4.1-Flash', 'nvidia/Kimi-K2.6-NVFP4', 'Qwen/Qwen3.5-397B-A17B-FP8']), 'nvidia/Kimi-K2.6-NVFP4');
  assert.equal(AI.chooseCodeModel(['nvidia/Kimi-K2.6-NVFP4-262K', 'nvidia/Kimi-K2.6-NVFP4']), 'nvidia/Kimi-K2.6-NVFP4-262K');
  assert.equal(AI.chooseCodeModel(['Qwen/Qwen3.5-397B-A17B-FP8', 'nvidia/GLM-5.2-NVFP4']), 'nvidia/GLM-5.2-NVFP4');
  assert.equal(AI.chooseCodeModel(['deepseek-ai/DeepSeek-V4.1-Flash', 'zai-org/GLM-5.3-Flash']), null, 'só modelos pequenos: usa o do nível');
  assert.equal(AI.chooseCodeModel(null), null);
});

test('provedor do Builder: com CODEMAKER_API_KEY o Code Maker usa URL, chave e modelo próprios; sem ela segue na River', async () => {
  const cfg = require('../server/lib/config');
  const before = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site da Padaria Lua em Recife, pedidos pelo WhatsApp.' } });
  const id = before.body.site.id;
  await run("INSERT INTO app_settings(key,value) VALUES ('CODEMAKER_API_KEY','chave-do-provedor-de-teste') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value");
  await run("INSERT INTO app_settings(key,value) VALUES ('CODEMAKER_BASE_URL','http://127.0.0.1:" + MOCK_PORT + "/v1') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value");
  await run("INSERT INTO app_settings(key,value) VALUES ('CODEMAKER_MODEL','zai-org/GLM-5.3-Flash') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value");
  await cfg.refresh(true);
  try {
    assert.match((await call('POST', '/api/code-maker', { action: 'plan', site_id: id })).body, /<<<OK>>>\s*$/);
    const calls = await seen();
    const last = calls.filter((c) => c.stage === 'plan').pop();
    assert.equal(last.model, 'zai-org/GLM-5.3-Flash', 'o modelo do provedor do Builder é o que vai na chamada');
    const logged = await all("SELECT provider_model FROM ai_calls WHERE kind='cm_plan' ORDER BY id DESC LIMIT 1");
    assert.equal(logged[0].provider_model, 'zai-org/GLM-5.3-Flash');
  } finally {
    await run("DELETE FROM app_settings WHERE key IN ('CODEMAKER_API_KEY','CODEMAKER_BASE_URL','CODEMAKER_MODEL')");
    await cfg.refresh(true);
  }
});

test('telemetria: cada chamada fica ligada ao site com etapa, tokens, motivo de encerramento e custo estimado; sem prompts nos registros', async () => {
  const T = require('../server/lib/telemetry');
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site da Mercearia Estrela em Olinda, pedidos pelo WhatsApp.' }, model: 'neva-1-2', effort: 'medium' });
  const id = created.body.site.id;
  assert.match((await call('POST', '/api/code-maker', { action: 'plan', site_id: id, model: 'neva-1-2', effort: 'medium' })).body, /<<<OK>>>\s*$/);
  const plan = (await call('GET', '/api/code-maker/' + id)).body.site.plan;
  for (const pid of E.partOrder(plan)) await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: pid, model: 'neva-1-2', effort: 'medium' });
  const tl = (await call('GET', `/api/code-maker/${id}/telemetry`)).body;
  assert.equal(tl.site, id); assert.ok(tl.totals.calls >= 5);
  assert.ok(tl.calls.every((c) => c.stage && c.provider_model), 'toda chamada tem etapa e modelo');
  for (const stage of ['brief', 'direction', 'code']) assert.ok(tl.byStage[stage]?.calls >= 1, stage);
  assert.ok(tl.calls.some((c) => c.finish_reason), 'motivo de encerramento registrado');
  assert.ok(tl.events.some((e) => e.stage === 'references' && e.detail && 'cobertura' in e.detail), 'tempo da etapa de referências');
  assert.ok(tl.totals.tokensIn > 0 && tl.totals.tokensOut > 0);
  assert.ok(tl.totals.costUsd > 0 && tl.totals.costUsd < 1, 'modelo com preço público: custo estimado pelos tokens reais');
  assert.equal(T.costOf({ provider_model: 'zai-org/GLM-5.3-Flash', prompt_tokens: 1_000_000, completion_tokens: 1_000_000 }), 0.52);
  assert.equal(T.costOf({ provider_model: 'modelo-sem-preco', prompt_tokens: 10, completion_tokens: 10 }), null);
  const raw = JSON.stringify(tl); assert.ok(!/RIVER_API_KEY|chave-de-teste|Bearer|system prompt|SYSTEM PROMPT/i.test(raw), 'a telemetria não carrega prompts nem credenciais');
});

test('regressão Brasa Burger: paleta com texto da cor do fundo é consertada (tema, contraste mínimo 7:1 no texto principal)', () => {
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const plan = E.normalizePlan({ title: 'Brasa', description: 'd', direction: 'x', theme: 'dark', palette: { brand: '#141311', brandDark: '#0a0908', accent: '#FF5A24', ink: '#F3EBDD', paper: '#F3EBDD', surface: '#E8DFCE', muted: '#F3EBDD' }, fonts: { display: 'Anton', body: 'DM Sans' }, sections: [{ id: 'hero', label: 'Início', layout: 'hero-brilho', headline: 'h', brief: 'b', bg: 'paper' }] }, { businessName: 'BRASA BURGER', details: 'Hamburgueria artesanal', style: 'auto', assets: [] });
  assert.ok(ratio(plan.palette.ink, plan.palette.paper) >= 7, 'texto x fundo');
  assert.ok(ratio(plan.palette.ink, plan.palette.surface) >= 4.5, 'texto x superfície');
  assert.ok(ratio(plan.palette.muted, plan.palette.paper) >= 4.5, 'texto secundário x fundo');
  assert.ok(Array.isArray(plan.paletteFixes) && plan.paletteFixes.length > 0, 'correções registradas');
  const dark = E.normalizePlan({ title: 'B', description: 'd', direction: 'x', theme: 'dark', palette: { brand: '#ff6b3a', brandDark: '#c2410c', accent: '#F6BD36', ink: '#F3EBDD', paper: '#141311', surface: '#302019', muted: '#A99C8B' }, fonts: { display: 'Anton', body: 'DM Sans' }, sections: [{ id: 'hero', label: 'Início', layout: 'hero-cinema', headline: 'h', brief: 'b', bg: 'ink' }] }, { businessName: 'B', details: 'x', style: 'auto', assets: [] });
  assert.equal(dark.sections[0].bg, 'paper', 'topo de site escuro não usa o fundo creme (ink)');
});

test('regressão Brasa Burger: a mesma foto em 12 lugares vira fotos diferentes; URL inventada é trocada pelo banco verificado', () => {
  const brief = { businessName: 'BRASA BURGER', niche: 'hamburgueria artesanal', details: 'x', style: 'auto', assets: [] };
  const plan = { sections: ['hero', 'menu', 'fogo', 'historia'].map((id) => ({ id, label: id, layout: 'cards-foto', headline: 'h', brief: 'b', bg: 'paper' })) };
  const one = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80';
  const parts = { hero: `<img src="${one}">`, menu: `<img src="${one}"><img src="${one}"><div style="background-image:url(${one})"></div>`, fogo: `<img src="https://images.unsplash.com/photo-0000000000-inventada?w=800">`, historia: `<img src="${one}">` };
  const ids = E.partOrder(plan);
  const r = E.dedupeImages(plan, Object.fromEntries(ids.map((id) => [id, parts[id] ?? '<p>x</p>'])), brief);
  const urls = Object.values(r.parts).flatMap((h) => [...h.matchAll(/photo-[\w-]+/g)].map((m) => m[0]));
  assert.equal(new Set(urls).size, urls.length, 'nenhuma foto repetida');
  assert.ok(!urls.includes('photo-0000000000-inventada'), 'URL fora do banco removida');
  assert.equal(r.unresolved, 0);
  assert.ok(r.fixes.length >= 4);
});

test('fotos seguem o ramo descrito no pedido e URLs inventadas não sobrevivem ao catálogo esgotado', () => {
  const brief = { businessName: 'Casa do Pão', niche: '', details: 'Site de padaria artesanal com fotos dos pães', style: 'auto', assets: [] };
  const plan = { sections: [{ id: 'hero', layout: 'hero-cinema', bg: 'paper' }] };
  const photos = E.photoPlan(plan, brief).hero;
  assert.ok(photos.length > 0);
  assert.match(photos[0].about, /pães|pão|padaria|forno/i);
  const invented = 'https://images.unsplash.com/photo-0000000000-inventada?w=800';
  const many = Array.from({ length: 30 }, () => `<img src="${invented}">`).join('');
  const result = E.dedupeImages(plan, { hero: many }, brief);
  assert.doesNotMatch(result.parts.hero, /photo-0000000000-inventada/);
});

test('refino visual: corrige texto sobre foto em ciclos, verifica e para quando não há pendência; sem navegador não simula', async () => {
  const { refineVisually } = require('../server/lib/codemaker/refine');
  const plan = { title: 'x' };
  const bad = { findings: [{ severity: 'alto', kind: 'contraste-sobre-imagem', viewport: 'desktop' }], critical: 0, summary: { alto: 1 }, results: [{ pixelContrast: [{ path: '#hero>h1:nth-of-type(1)', bgLum: 0.04, darkBad: 100, lightBad: 0, el: 'h1', text: 'T', p10: 1.1, need: 3 }] }] };
  const clean = { findings: [], critical: 0, summary: {}, results: [{ pixelContrast: [] }] };
  let calls = 0; const seenCss = [];
  const inspect = async (html) => { calls += 1; seenCss.push(html); return calls === 1 ? bad : clean; };
  process.env.CM_RENDER_QA = '1';
  try {
    const out = await refineVisually({ plan, parts: {}, assemble: (pl) => String(pl.qaCss || ''), inspect, onStep: () => {} });
    assert.equal(out.available, true); assert.equal(calls, 2, 'inspeciona, corrige e verifica');
    assert.match(out.plan.qaCss, /#hero>h1:nth-of-type\(1\)\{color:#f6f2ea!important/, 'fundo escuro: texto claro');
    assert.equal(out.remaining.length, 0);
    assert.equal(seenCss[0], ''); assert.match(seenCss[1], /#hero/, 'a verificação roda sobre o HTML já corrigido');
    // pendência que nenhuma regra resolve: para no limite de 3 ciclos
    calls = 0; const stuck = async () => { calls += 1; return { ...bad, results: [{ pixelContrast: [{ path: `#s${calls}>p`, bgLum: 0.8, darkBad: 0, lightBad: 100, el: 'p', text: 't', p10: 1, need: 4.5 }] }] }; };
    const out2 = await refineVisually({ plan, parts: {}, assemble: () => '', inspect: stuck, onStep: () => {} });
    assert.equal(out2.cycles.length, 4, 'ciclo 0 + 3 correções'); assert.ok(out2.remaining.length > 0, 'pendência registrada, não escondida');
  } finally { process.env.CM_RENDER_QA = '0'; }
  const off = await refineVisually({ plan, parts: {}, assemble: () => '', inspect: async () => clean, onStep: () => {} });
  assert.equal(off.available, false);
});

test('hero de tema escuro que usa ink como fundo/véu (creme) é invertido para o escuro', () => {
  const plan = { theme: 'dark', sections: [] };
  const hero = '<section id="hero" class="relative bg-ink text-paper"><div class="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"></div><h1 class="text-paper">T</h1><a class="border-paper/30 text-brand">x</a></section>';
  const r = E.fixDarkHero(plan, { hero });
  assert.ok(r.changed);
  assert.match(r.parts.hero, /bg-paper text-ink/); assert.match(r.parts.hero, /from-paper\/90 via-paper\/40/); assert.match(r.parts.hero, /border-ink\/30 text-brand/);
  assert.equal(E.fixDarkHero({ theme: 'light' }, { hero }).changed, false, 'tema claro não muda');
  assert.equal(E.fixDarkHero(plan, { hero: '<section class="bg-paper text-ink"></section>' }).changed, false, 'hero já escuro não muda');
});

test('pedido online: botões data-cart-add viram carrinho real (extras, observação, retirada/entrega, total) e abrem o WhatsApp com a mensagem', async () => {
  const QA = require('../server/lib/codemaker/visual-qa');
  const plan = E.normalizePlan({ title: 'Brasa Burger', description: 'd', direction: 'x', theme: 'dark', palette: { brand: '#ff6b3a', brandDark: '#c2410c', accent: '#F6BD36', ink: '#F3EBDD', paper: '#141311', surface: '#302019', muted: '#A99C8B' }, fonts: { display: 'Anton', body: 'DM Sans' }, sections: [{ id: 'hero', label: 'Início', layout: 'hero-cinema', headline: 'h', brief: 'b', bg: 'paper' }] }, { businessName: 'Brasa Burger', details: 'x', style: 'auto', assets: [] });
  plan.business = { name: 'Brasa Burger', phone: '5511999998888' };
  const parts = { hero: '<section id="hero"><div data-cart-item><label><input type="checkbox" data-extra-name="Bacon" data-extra-price="6"> Bacon</label><input data-cart-note><button type="button" data-cart-add data-name="Brasa Original" data-price="32.90">Adicionar</button></div><button type="button" data-cart-open>Pedido (<span data-cart-count>0</span>)</button><h1>t</h1></section>' };
  const html = E.assembleSite(plan, parts);
  assert.match(html, /neva-cart:/, 'script do pedido injetado quando há botão de adicionar');
  assert.ok(!/neva-cart:/.test(E.assembleSite(plan, { hero: '<section id="hero"><h1>t</h1></section>' })), 'sem botão de adicionar, sem script');
  assert.match(E.cleanFragment('<button data-cart-add data-name="x" data-price="1" onclick="alert(1)">a</button><script>alert(1)</script>'), /data-cart-add/, 'atributos data-* sobrevivem à limpeza');
  assert.ok(!/onclick|<script/i.test(E.cleanFragment('<button data-cart-add onclick="alert(1)">a</button><script>alert(1)</script>')), 'handler e script da IA continuam removidos');
  if (!QA.available()) return;
  const browser = await QA.launchBrowser();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.route('http://site.test/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('http://site.test/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { window.open = (u) => { window.__opened = u; return {}; }; });
    await page.fill('[data-cart-note]', 'sem cebola'); await page.check('input[data-extra-name]');
    await page.click('[data-cart-add]'); await page.click('[data-cart-add]');
    assert.equal(await page.textContent('[data-cart-count]'), '2');
    await page.click('[data-cart-open]');
    await page.click('button:has-text("Entrega")');
    await page.click('text=Enviar pedido pelo WhatsApp');
    assert.ok(!(await page.evaluate(() => window.__opened)), 'sem endereço não abre o WhatsApp');
    await page.fill('textarea', 'Rua A, 10'); await page.click('text=Enviar pedido pelo WhatsApp');
    const url = decodeURIComponent(await page.evaluate(() => window.__opened));
    assert.match(url, /^https:\/\/wa\.me\/5511999998888\?text=/);
    assert.match(url, /1x Brasa Original \(\+ Bacon\) — R\$ 38,90/); assert.match(url, /Obs: sem cebola/); assert.match(url, /1x Brasa Original — R\$ 32,90/);
    assert.match(url, /Modalidade: Entrega/); assert.match(url, /Endereço: Rua A, 10/); assert.match(url, /\*Total: R\$ 71,80\*/);
  } finally { await browser.close(); }
});

test('progresso real: etapas derivadas do que foi gravado (briefing, referências, direção, seções n/m, fotos, inspeção, pronto), sem porcentagem inventada', async () => {
  const created = await call('POST', '/api/code-maker', { action: 'create', brief: { details: 'Site da Padaria Trigo Bom em Recife, pedidos pelo WhatsApp.' }, model: 'neva-1-2', effort: 'medium' });
  const id = created.body.site.id;
  const first = (await call('GET', `/api/code-maker/${id}/progress`)).body;
  assert.deepEqual(first.stages.map((s) => s.key), ['brief', 'references', 'direction', 'code', 'assets', 'inspect', 'publish']);
  assert.equal(first.finished, false); assert.ok(first.stages.every((s) => s.label && !('percent' in s)));
  assert.notEqual(first.stages.find((s) => s.key === 'direction').status, 'done', 'sem plano a direção de arte ainda não está feita');
  await call('POST', '/api/code-maker', { action: 'plan', site_id: id, model: 'neva-1-2', effort: 'medium' });
  const afterPlan = (await call('GET', `/api/code-maker/${id}/progress`)).body;
  for (const k of ['brief', 'direction']) assert.equal(afterPlan.stages.find((s) => s.key === k).status, 'done', k);
  assert.equal(afterPlan.current, 'code'); assert.equal(afterPlan.parts.done < afterPlan.parts.total, true);
  const plan = (await call('GET', '/api/code-maker/' + id)).body.site.plan;
  const ids = E.partOrder(plan);
  await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: ids[0], model: 'neva-1-2', effort: 'medium' });
  const mid = (await call('GET', `/api/code-maker/${id}/progress`)).body;
  assert.equal(mid.parts.done, 1); assert.equal(mid.stages.find((s) => s.key === 'code').detail.feitas, 1);
  for (const pid of ids.slice(1)) await call('POST', '/api/code-maker', { action: 'part', site_id: id, part_id: pid, model: 'neva-1-2', effort: 'medium' });
  await call('POST', '/api/code-maker', { action: 'finish', site_id: id });
  const end = (await call('GET', `/api/code-maker/${id}/progress`)).body;
  assert.equal(end.finished, true); assert.equal(end.current, null);
  assert.ok(end.stages.every((s) => ['done', 'skipped'].includes(s.status)), JSON.stringify(end.stages.map((s) => [s.key, s.status])));
  assert.equal(end.stages.find((s) => s.key === 'inspect').status, 'skipped', 'sem navegador/desligada a inspeção aparece como pulada, com motivo');
  assert.ok(end.stages.find((s) => s.key === 'inspect').detail.motivo);
  assert.equal((await call('GET', '/api/code-maker/999999/progress')).status, 404);
});
