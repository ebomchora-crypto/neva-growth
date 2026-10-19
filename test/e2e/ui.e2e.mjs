import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// Uso: DATA_DIR=$(mktemp -d) PORT=3111 npm start  (banco VAZIO)  e  npm run test:e2e
const base = process.env.BASE_URL || 'http://127.0.0.1:3111';
const OUT = process.env.E2E_OUT || os.tmpdir();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const REDUCED = !!process.env.REDUCED;
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage(); page.setDefaultTimeout(7000);
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|compute-pressure|boom|cdn\.jsdelivr|openstreetmap|cdnjs/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200) + ' @ ' + m.location().url.split('/').slice(-2).join('/')); });
let pass = 0, fail = 0;
const step = async (n, fn) => { try { await fn(); pass++; console.log('OK  ', n); } catch (e) { fail++; console.log('FAIL', n, '-', e.message.split('\n').slice(0,6).join(' | ')); try { await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); } catch {} } };
const nav = async (p) => { await page.goto(`${base}/#/${p}`); await page.waitForTimeout(150); };
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);

await page.goto(base);
await step('setup admin + dashboard', async () => {
  await page.fill('input[name=name]', 'Ana Teste'); await page.fill('input[name=email]', 'ana@neva.test'); await page.fill('input[name=password]', 'senha-forte-123');
  await page.click('button:has-text("Criar conta")'); await page.waitForSelector('text=Lucro no período'); await page.waitForSelector('text=Minha carteira');
});
await step(REDUCED ? 'animações: desligadas com reduzir movimento' : 'animações: GSAP ativo, entrada termina visível e interruptor funciona', async () => {
  if (REDUCED) { await page.waitForFunction(() => !document.documentElement.classList.contains('motion') && !document.querySelector('.bgfx') && !!document.querySelector('canvas.shaderbg')); return; }
  await page.waitForFunction(() => document.documentElement.classList.contains('motion') && !!document.querySelector('.bgfx') && !!window.gsap && !!document.querySelector('canvas.shaderbg'));
  await nav('clientes'); await page.waitForFunction(() => { const e = document.querySelector('.hero'); return e && getComputedStyle(e).opacity === '1'; }, null, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('.hero h1 .w') !== null);
  await page.waitForTimeout(2500);
  const fixo = await page.evaluate(() => { const m = document.querySelector('.hero-mascot'); if (!m) return 'sem mascote'; return gsap.getTweensOf(m).length === 0 && gsap.getTweensOf(m.parentElement).length === 0 && getComputedStyle(m).transform === 'none' && getComputedStyle(m).opacity === '1' && m.getAnimations().length === 0 ? 'ok' : 'mexendo'; });
  if (fixo !== 'ok') throw new Error('mascote não está fixo: ' + fixo);
  await nav('configuracoes'); await page.click('.snav button:has-text("Privacidade")'); await page.waitForSelector('input[aria-label="Animações"]'); await page.uncheck('input[aria-label="Animações"]');
  await page.waitForFunction(() => !document.documentElement.classList.contains('motion') && !document.querySelector('.bgfx'));
  await page.check('input[aria-label="Animações"]'); await page.waitForFunction(() => document.documentElement.classList.contains('motion') && !!document.querySelector('.bgfx')); await nav('dashboard');
});
await step('dashboard: períodos e estado vazio honesto', async () => {
  await page.click('.pill:has-text("7 dias")'); await page.waitForSelector('.periodbar .pill.on:has-text("7 dias")'); await page.waitForSelector('.lm span:has-text("/")');
  await page.click('.pill:has-text("1 ano")'); await page.waitForSelector('svg.chart');
  await page.waitForSelector('button.aibtn[disabled]');
});
await step('menu lateral na ordem de referência', async () => {
  const order = await page.$$eval('.side a[data-path]', (as) => as.filter((a) => a.offsetParent !== null).map((a) => a.dataset.path));
  const want = ['associacao', 'dashboard', 'clientes', 'vendas', 'sites', 'leads', 'builder', 'design', 'acervo', 'play', 'prospeccao', 'prompts', 'configuracoes'];
  if (order.join() !== want.join()) throw new Error('ordem do menu: ' + order.join());
});
await step('ocultar valores persiste', async () => {
  await page.click('button[aria-label="Ocultar ou mostrar valores"]'); await page.waitForFunction(() => document.documentElement.classList.contains('hide-values'));
  await page.reload(); await page.waitForSelector('text=Lucro no período'); await page.waitForFunction(() => document.documentElement.classList.contains('hide-values'));
  await page.click('button[aria-label="Ocultar ou mostrar valores"]'); await page.waitForFunction(() => !document.documentElement.classList.contains('hide-values'));
});
await step('paleta de comandos (Ctrl+Espaço)', async () => {
  await page.keyboard.press('Control+Space'); await page.waitForSelector('.palette input'); await page.fill('.palette input', 'Venda'); await page.waitForFunction(() => document.querySelector('.palette a')?.getAttribute('href') === '#/vendas');
  await page.keyboard.press('Enter'); await page.waitForURL(/#\/vendas/); 
});
await step('CRM: criar oportunidade na gaveta (campos, abas, prioridade e prazo)', async () => {
  await nav('leads'); await page.click('button:has-text("Nova oportunidade")');
  await page.waitForSelector('.dw h2:has-text("O próximo projeto começa aqui.")'); await page.waitForSelector('.dw-tabs:has-text("Detalhes"):has-text("Tarefas"):has-text("Notas"):has-text("Histórico")'); await page.waitForSelector('.dw-sep:has-text("Contexto comercial")');
  if (!(await page.isDisabled('.dw-go'))) throw new Error('criar deveria estar desligado sem dados');
  await page.fill('.dw input[name=name]', 'Clínica Aurora'); await page.fill('.dw input[name=company]', 'Clínica Aurora'); await page.fill('.dw input[name=value]', '3000'); await page.fill('.dw input[name=due_date]', yesterday);
  await page.click('.dw .fs-select:has(select[name=priority]) .fs-shown'); await page.click('.dw .fs-opt:has-text("Alta")');
  await page.waitForSelector('.dw-note.ok'); await page.click('.dw-go'); await page.waitForSelector('.lcard:has-text("Clínica Aurora")'); await page.waitForSelector('.lcard .late');
});
await step('CRM: quick-add na coluna + arrastar + abas', async () => {
  await page.click('.col[data-stage=novo] .addopp'); await page.fill('.col[data-stage=novo] .qadd input', 'Padaria Sol'); await page.keyboard.press('Enter'); await page.waitForSelector('.lcard:has-text("Padaria Sol")');
  await page.dragAndDrop('.lcard:has-text("Padaria Sol")', '.col[data-stage=negociacao]'); await page.waitForSelector('.col[data-stage=negociacao] .lcard:has-text("Padaria Sol")');
  await page.click('.ktabs button:has-text("Em atraso")'); await page.waitForSelector('.lcard:has-text("Clínica Aurora")'); await page.waitForFunction(() => !document.body.innerText.includes('Padaria Sol'));
  await page.click('.ktabs button:has-text("Prioritárias")'); await page.waitForSelector('.lcard:has-text("Clínica Aurora")');
  await page.click('.ktabs button:has-text("Todas")');
});
await step('CRM: arquivar e ver arquivados', async () => {
  await page.click('.lcard:has-text("Padaria Sol")'); await page.click('.modal button:has-text("Arquivar")'); await page.waitForFunction(() => !document.body.innerText.includes('Padaria Sol'));
  await page.click('button:has-text("Arquivados")'); await page.waitForSelector('.lcard:has-text("Padaria Sol")'); await page.click('button:has-text("Voltar ao quadro")');
});
await step('CRM: editar funil na gaveta (renomear + nova etapa)', async () => {
  await page.click('button:has-text("Editar funil")'); await page.waitForSelector('.dw h2:has-text("Seu funil. Suas regras.")'); await page.waitForSelector('.dw-flow:has-text("Novos contatos")'); await page.waitForSelector('.dw-stage:has-text("ETAPA 01")');
  await page.fill('.dw-stage >> nth=1 >> input[name=label]', 'Qualificados'); await page.click('.dw-add'); await page.fill('.dw-stage >> nth=6 >> input[name=label]', 'Pós-venda');
  await page.click('.dw-go:has-text("Salvar funil")');
  await page.waitForSelector('.col .colhead:has-text("Qualificados")'); await page.waitForSelector('.col .colhead:has-text("Pós-venda")');
  await page.reload(); await page.waitForSelector('.col .colhead:has-text("Pós-venda")');
});
await step('CRM: importar carteira (clientes e leads da prospecção)', async () => {
  await page.click('button:has-text("Importar carteira")'); await page.waitForSelector('.dw h2:has-text("Traga as relações que já começaram.")'); await page.waitForSelector('.dw-seg:has-text("Clientes"):has-text("Carteira de leads")');
  await page.click('.dw-seg button:has-text("Carteira de leads")'); await page.waitForSelector('.dw-empty:has-text("Nenhum lead disponível.")'); await page.click('.dw-x'); await page.waitForFunction(() => !document.querySelector('.dw-back'));
});
await step('CRM: minimizar header + lista + converter em cliente', async () => {
  await page.click('button:has-text("Minimizar header")'); await page.waitForSelector('button:has-text("Expandir header")'); await page.click('button:has-text("Expandir header")');
  await page.click('.kseg button[aria-label="Lista"]'); await page.waitForSelector('tbody tr:has-text("Clínica Aurora")'); await page.click('.kseg button[aria-label="Quadro"]');
  await page.click('.lcard:has-text("Clínica Aurora")'); await page.click('.modal button:has-text("Converter em cliente")'); await page.waitForSelector('.col[data-stage=ganho] .lcard:has-text("Clínica Aurora")');
});
await step('Clientes: indicadores, abas por estágio, entrega digital', async () => {
  await nav('clientes'); await page.waitForSelector('.stat:has-text("Clientes cadastrados")'); await page.waitForSelector('.stat:has-text("Clientes cadastrados") b:text-is("1")');
  await page.click('.pill:has-text("Lead")'); await page.waitForSelector('text=Nenhum resultado'); await page.click('.pill:has-text("Cliente")'); await page.waitForSelector('.crow:has-text("Clínica Aurora")');
  await page.waitForSelector('.pulse:has-text("Pulso da carteira")'); await page.waitForSelector('.next:has-text("Próximo movimento")'); await page.waitForSelector('.crow.head:has-text("Entrega digital")'); await page.waitForSelector('.crow.head:has-text("Resultado")'); await page.waitForSelector('.crow:has-text("Clínica Aurora") .dgrow:has-text("0/3")'); await page.waitForSelector('.crow:has-text("Clínica Aurora") button:has-text("Abrir dossiê")');
});
await step('Clientes: Registrar cliente (identidade, relacionamento, presença digital)', async () => {
  await nav('clientes'); await page.click('.hero button:has-text("Novo cliente")');
  await page.waitForSelector('.fs-banner h2:has-text("Registrar cliente.")'); await page.waitForSelector('.fs-sechead:has-text("Identidade")'); await page.waitForSelector('.fs-sechead:has-text("Relacionamento")'); await page.waitForSelector('.fs-sechead:has-text("Presença digital")');
  const opts = await page.$$eval('.fs-card select[name=stage] option', (o) => o.map((x) => x.textContent)); if (opts.join('|') !== 'Lead|Negociação|Proposta enviada|Cliente') throw new Error('status: ' + opts);
  await page.fill('.fs-card input[name=name]', 'Mariana Costa'); await page.fill('.fs-card input[name=company]', 'Nova Era'); await page.fill('.fs-card input[name=phone]', '(11) 99999-9999'); await page.fill('.fs-card input[name=github]', 'github.com/nova/era');
  await page.selectOption('.fs-card select[name=stage]', 'negociacao'); await page.click('.fs-submit'); await page.click('.pill:has-text("Negociação")'); await page.waitForSelector('.crow:has-text("Nova Era"):has-text("Mariana Costa") .dg.on[title="GitHub"]'); await page.waitForSelector('.crow:has-text("Nova Era") .dgrow:has-text("1/3")'); await page.selectOption('.crow:has-text("Nova Era") .cstage select', 'proposta'); await page.waitForSelector('text=Estágio atualizado'); await page.click('.pill:has-text("Todos")');
});
await step('Vendas: custo, margem, entrega, pílulas e indicadores', async () => {
  await nav('vendas'); await page.click('button:has-text("Nova venda")');
  await page.waitForSelector('.fs-banner h2:has-text("Registrar venda.")'); await page.waitForSelector('.fs-sechead:has-text("Resultado financeiro")'); await page.waitForSelector('.fs-sechead:has-text("Entrega")');
  await page.click('.fs-submit'); await page.waitForSelector('.fs-err:has-text("Preencha: Projeto")');
  await page.fill('.fs-card input[name=description]', 'Site Aurora'); await page.fill('.fs-card input[name=amount]', '3000'); await page.fill('.fs-card input[name=cost]', '1200'); await page.fill('.fs-card input[name=delivery_date]', yesterday);
  await page.waitForSelector('.fs-profit b:has-text("1.800,00")');
  await page.click('.fs-card .fs-select >> nth=0'); await page.waitForSelector('.fs-panel:not([hidden])'); await page.click('.fs-opt:has-text("Clínica Aurora")'); await page.click('.fs-card .fs-select >> nth=1'); await page.click('.fs-opt:has-text("Sistema web")');
  await page.click('.fs-submit'); await page.waitForSelector('.sv-row.on:has-text("Site Aurora")'); await page.waitForSelector('.sv-top h2:has-text("Site Aurora")'); await page.waitForSelector('.sv-top p:has-text("Clínica Aurora · Sistema web")');
  await page.waitForSelector('.pill:has-text("Atrasadas") .cnt:text-is("1")'); await page.waitForSelector('.sv-row:has-text("Atrasada")');
  await page.waitForSelector('.stat:has-text("Lucro líquido") b:has-text("1.800,00")'); await page.waitForSelector('.stat:has-text("Margem média") b:has-text("60%")'); await page.waitForSelector('.sv-donut b:text-is("60%")');
  await page.waitForSelector('.sv-fin:has-text("Receita bruta"):has-text("Custo de produção"):has-text("Lucro líquido")'); await page.waitForSelector('.sv-deliv:has-text("Entrega pendente")');
  await page.click('button:has-text("Marcar como entregue")'); await page.waitForSelector('.sv-deliv:has-text("Projeto entregue")'); await page.click('.pill:has-text("Entregues")'); await page.waitForSelector('.sv-row:has-text("Site Aurora")');
  await page.click('button:has-text("Reabrir entrega")'); await page.waitForSelector('text=Nenhum resultado'); await page.click('.pill:has-text("Todas")');
  await page.click('.pill:has-text("Sem cliente")'); await page.waitForSelector('text=Nenhum resultado'); await page.click('.pill:has-text("Todas")');
  await page.click('.sv-edit'); await page.waitForSelector('.fs-banner h2:has-text("Editar venda.")'); await page.click('.fs-x'); await page.waitForFunction(() => !document.querySelector('.fs-back'));
});
await step('Dashboard com lucro real', async () => {
  await nav('dashboard'); await page.click('.pill:has-text("7 dias")'); await page.waitForSelector('b:has-text("1.800,00")'); await page.waitForSelector('text=Ticket médio');
});
await step('AO VIVO: abre Vendas hoje com gráfico e volta', async () => {
  await nav('dashboard'); await page.click('.livepill'); await page.waitForSelector('.lv h1:has-text("Vendas hoje")'); await page.waitForSelector('.lv .lv-chart'); await page.waitForSelector('.lv-stats:has-text("Ticket médio")');
  await page.click('.lv-mode button:has-text("Tudo")'); await page.waitForSelector('.lv h1:has-text("Vendas totais")'); await page.waitForSelector('.lv-stats:has-text("Lucro total")'); await page.click('.lv-mode button:has-text("Hoje")'); await page.waitForSelector('.lv h1:has-text("Vendas hoje")');
  await page.click('.lv-back'); await page.waitForFunction(() => !document.querySelector('.lv') && location.hash === '#/dashboard');
});
await step('botão de alerta: dicas de venda no Dashboard/Clientes/Vendas e aviso some em 2,5 s', async () => {
  for (const r of ['dashboard', 'clientes', 'vendas']) { await nav(r); await page.waitForSelector('#tipsbtn:not(.hide)'); }
  await page.click('#tipsbtn'); await page.waitForSelector('.tips h2:has-text("Se você quer vender")'); await page.waitForFunction(() => document.querySelectorAll('.tips-card').length === 6);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.tips-back'));
  await nav('sites'); await page.waitForSelector('#tipsbtn.hide', { state: 'attached' });
  await page.evaluate(() => import('/js/ui.js').then((m) => m.toast('Teste de aviso.', 'ok'))); await page.waitForSelector('.toast .ttx:has-text("Teste de aviso.")'); await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 4500 });
});
await step('notificações (sino)', async () => { await page.click('button[aria-label="Notificações"]'); await page.waitForSelector('.dropdown'); await page.waitForSelector('text=Tudo em dia'); await page.click('button[aria-label="Notificações"]'); });
let projUrl;
await step('Sites: Adicionar site (link, status, cliente) e abrir IDE de um projeto com arquivos', async () => {
  await nav('sites'); await page.click('button:has-text("Adicionar site")');
  await page.waitForSelector('.fs-dhead h2:has-text("Adicionar site")'); await page.waitForSelector('.fs-select:has-text("Publicado")');
  await page.fill('.fs-card input[name=name]', 'Link Aurora'); await page.selectOption('.fs-card select[name=status]', 'publicado'); await page.click('.fs-submit'); await page.waitForSelector('.fs-err:has-text("informe o link")');
  await page.fill('.fs-card input[name=site_url]', 'aurora.com.br'); await page.selectOption('.fs-card select[name=client_id]', { label: 'Clínica Aurora' }); await page.fill('.fs-card textarea[name=description]', 'Landing da clínica');
  await page.click('.fs-submit'); await page.waitForSelector('article:has-text("Link Aurora") .sf-url:has-text("aurora.com.br")'); await page.waitForSelector('article:has-text("Link Aurora") .sf-chip.publicado'); await page.waitForSelector('article:has-text("Link Aurora") .sf-ext[href="https://aurora.com.br/"]'); await page.waitForSelector('article:has-text("Link Aurora") .sf-shot img');
  await page.click('.pill:has-text("Em desenvolvimento")'); await page.waitForSelector('text=Nenhum projeto neste recorte'); await page.click('.pill:has-text("Todos")');
  await page.click('article:has-text("Link Aurora") >> button:has-text("Editar")'); await page.selectOption('.fs-card select[name=status]', 'arquivado'); await page.click('.fs-submit');
  await page.click('.pill:has-text("Arquivado")'); await page.waitForSelector('article:has-text("Link Aurora")');
  const created = await page.request.post(base + '/api/projects', { headers: { 'x-requested-with': 'neva' }, data: { name: 'Studio Aurora', kind: 'site', tagline: 'Sorrisos que encantam', description: 'Clínica' } });
  const proj = await created.json(); await page.goto(`${base}/#/ide/${proj.id}`); await page.waitForURL(/#\/ide\/\d+/); projUrl = page.url();
});
await step('IDE: edição + autosave + preview', async () => {
  await page.waitForFunction(() => window.monaco?.editor.getEditors()[0]?.getValue().includes('Sorrisos que encantam'), null, { timeout: 20000 });
  await page.evaluate(() => { const e = window.monaco.editor.getEditors()[0]; e.setValue(e.getValue().replace(/Sorrisos que encantam/g, 'Sorrisos AUTOSAVE')); e.focus(); });
  await page.waitForSelector('text=Salvo automaticamente', { timeout: 6000 });
  await page.frameLocator('iframe[title=Preview]').locator('h1:has-text("Sorrisos AUTOSAVE")').waitFor({ timeout: 8000 });
});
await step('IDE: histórico de versões e restauração', async () => {
  await page.evaluate(() => { const e = window.monaco.editor.getEditors()[0]; e.setValue(e.getValue().replace(/AUTOSAVE/g, 'FINAL')); e.focus(); });
  await page.keyboard.press('Control+s'); await page.waitForSelector('text=Salvo ');
  await page.click('.ide-bottom .tabs >> text=Histórico'); await page.waitForSelector('.vlist button');
  await page.click('.vlist button >> nth=0'); await page.waitForSelector('.diff'); await page.click('.modal button:has-text("Restaurar esta versão")'); await page.waitForSelector('text=Versão restaurada');
  await page.waitForFunction(() => window.monaco.editor.getEditors()[0].getValue().includes('Sorrisos AUTOSAVE'));
});
await step('IDE: buscar e substituir em todos os arquivos', async () => {
  await page.click('.ide-bottom .tabs >> text=Buscar/Substituir'); await page.fill('input[aria-label="Buscar nos arquivos"]', 'AUTOSAVE'); await page.fill('input[aria-label="Substituir por"]', 'REVISADO'); await page.waitForSelector('.pane >> text=index.html');
  await page.click('button:has-text("Substituir tudo")'); await page.click('.modal button:has-text("Substituir")'); await page.waitForSelector('text=ocorrência(s) substituída(s)');
  await page.waitForFunction(() => window.monaco.editor.getEditors()[0].getValue().includes('Sorrisos REVISADO'));
});
await step('IDE: importar arquivos', async () => {
  const EXTRA = path.join(OUT, 'extra-import.js'); fs.writeFileSync(EXTRA, "console.log('importado');");
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Importar arquivos")')]); await chooser.setFiles(EXTRA);
  await page.waitForSelector('.ftree >> text=extra-import.js'); await page.waitForSelector('text=Importados: 1 novo');
});
await step('IDE: assistente de IA não configurado + console', async () => {
  await page.click('.ide-bottom .tabs >> text=Assistente IA'); await page.waitForSelector('text=Assistente de IA não configurado');
  await page.click('.ide-bottom .tabs >> text=Console');
});
await step('Sites: projeto em destaque, editar, publicar, arquivar, filtros', async () => {
  const edit = async (status, extra = async () => {}) => { await page.click('article:has-text("Studio Aurora") >> button:has-text("Editar")'); await extra(); await page.selectOption('.fs-card select[name=status]', status); await page.click('.fs-submit'); await page.waitForFunction(() => !document.querySelector('.fs-back')); };
  await nav('sites'); await page.waitForSelector('article:has-text("Studio Aurora") .sf-win'); await page.waitForSelector('article:has-text("Studio Aurora") .sf-bar em:has-text("NG/")'); await page.waitForSelector('article:has-text("Studio Aurora") .sf-side:has-text("PROJETO EM DESTAQUE")');
  await edit('desenvolvimento', async () => { await page.fill('.fs-card input[name=site_url]', 'https://studioaurora.com.br/'); await page.selectOption('.fs-card select[name=client_id]', { label: 'Clínica Aurora' }); });
  await page.waitForSelector('article:has-text("Studio Aurora") .sf-url:has-text("studioaurora.com.br")'); await page.waitForSelector('article:has-text("Studio Aurora") .sf-client:has-text("Clínica Aurora")'); await page.waitForSelector('article:has-text("Studio Aurora") .sf-chip.desenvolvimento');
  await page.waitForSelector('article:has-text("Studio Aurora") .sf-shot iframe');
  await edit('publicado'); await page.waitForSelector('article:has-text("Studio Aurora") .sf-chip.publicado');
  const r = await page.request.get(base + '/s/studio-aurora/'); if (r.status() !== 200) throw new Error('site público ' + r.status());
  await page.click('.pill:has-text("Publicado")'); await page.waitForSelector('article:has-text("Studio Aurora")');
  await edit('arquivado'); await page.waitForSelector('text=Nenhum projeto neste recorte');
  const r2 = await page.request.get(base + '/s/studio-aurora/'); if (r2.status() !== 404) throw new Error('arquivado ainda no ar');
  await page.click('.pill:has-text("Arquivado")'); await page.waitForSelector('article:has-text("Studio Aurora")');
});
await step('Builder: só o pedido, sem nome obrigatório (IA não configurada = botão desligado)', async () => {
  await nav('builder'); await page.waitForSelector('text=IA indisponível'); await page.waitForSelector('button:has-text("Criar site")[disabled]'); await page.waitForSelector('button:has-text("Otimizar pedido")[disabled]');
  await page.waitForSelector('.dotfield canvas'); await page.waitForSelector('.orb'); await page.waitForSelector('.orb-text:has-text("Neva Studio")');
  await page.mouse.move(400, 200); await page.mouse.move(520, 260, { steps: 5 });
  await page.waitForFunction(() => { const c = document.querySelector('.dotfield canvas'); return c && c.width > 0; });
  if (await page.locator('.mascot-img').count() !== 0) throw new Error('mascote ainda aparece no Builder');
  if (await page.locator('input[name=name][required]').count() !== 0) throw new Error('nome ainda é obrigatório');
  await page.click('.bidea:has-text("Barbearia")'); await page.waitForFunction(() => /Navalha de Ouro/.test(document.querySelector('.cleft textarea').value));
  await page.click('.bchip:has-text("Elegante")'); await page.waitForSelector('.bchip.on:has-text("Elegante")');
  await page.click('button[aria-label="Detalhes do negócio e site atual"]'); await page.waitForSelector('.bdetails:not(.hide) input[name=businessName]'); await page.waitForSelector('button:has-text("Ler site")');
});
await step('Referências de design: criar, filtrar, abrir', async () => {
  await nav('design'); await page.waitForSelector('.dcard2:has-text("Neva Growth — azul-gelo")'); await page.click('button:has-text("+ Nova referência")');
  await page.fill('.modal input[name=title]', 'Editorial Verde'); await page.fill('.modal input[name=niche]', 'Nicho Teste'); await page.fill('.modal input[name=style]', 'Escuro'); await page.fill('.modal textarea[name=content]', '# DESIGN.md\nCores: #0a0');
  await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.dcard2:has-text("Editorial Verde")');
  await page.selectOption('select[aria-label="Nicho"]', 'Nicho Teste'); await page.waitForFunction(() => document.querySelectorAll('.dcard2').length === 1); await page.click('.dcard2'); await page.waitForSelector('.modal pre:has-text("Cores: #0a0")'); await page.waitForFunction(() => document.querySelector('.modal').getBoundingClientRect().height > 250); await page.waitForFunction(() => { const r = document.querySelector('.modal pre').getBoundingClientRect(); return r.height > 20 && r.bottom <= window.innerHeight; }); await page.click('.modal button:has-text("Baixar")'); await page.keyboard.press('Escape');
});
await step('Acervo: recursos iniciais e novo recurso', async () => {
  await nav('acervo'); await page.waitForSelector('.libitem:has-text("Direção de landing page")'); await page.click('.libitem:has-text("Direção de landing page")'); await page.waitForSelector('pre.code:has-text("designer de produto")');
  await page.click('.atabs button:has-text("Animações")'); await page.waitForSelector('.libitem:has-text("Revelar ao rolar")');
  await page.click('button:has-text("Novo recurso")'); await page.fill('.modal input[name=title]', 'Pulse botão'); await page.fill('.modal textarea[name=content]', '.pulse{animation:p 1s}'); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.libitem:has-text("Pulse botão")');
});
await step('Play: cadastrar vídeo e marcar como visto', async () => {
  await nav('play'); await page.click('button:has-text("Novo conteúdo")'); await page.fill('.modal input[name=title]', 'Como vender sites'); await page.fill('.modal input[name=video_url]', 'https://youtu.be/dQw4w9WgXcQ'); await page.fill('.modal input[name=category]', 'Vendas');
  await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('article:has-text("Como vender sites")'); await page.click('article:has-text("Como vender sites") >> button:has-text("Assistir")');
  await page.waitForSelector('.modal iframe'); await page.click('.modal button:has-text("Marcar como visto")'); await page.waitForSelector('.stat:has-text("Conteúdos vistos") b:text-is("100%")'); await page.waitForSelector('.badge:has-text("visto")');
  await page.waitForSelector('.askband:has-text("ilimitadas")'); await page.click('button:has-text("Sugerir uma aula")'); await page.fill('.modal input[name=topic]', 'Como fechar o primeiro cliente'); await page.fill('.modal textarea[name=outcome]', 'Vender meu primeiro site');
  await page.click('.modal button:has-text("Enviar sugestão")'); await page.waitForSelector('.ab-n:has-text("∞")'); await page.waitForSelector('td:has-text("Como fechar o primeiro cliente")');
});
await step('Gerador de prompts: IA não configurada + Meus prompts', async () => {
  await nav('prompts'); await page.waitForSelector('text=IA não configurada'); await page.waitForSelector('button:has-text("Gerar prompt")[disabled]'); await page.click('.seg button:has-text("JSON")');
  await page.click('.tabs button:has-text("Meus prompts")'); await page.waitForSelector('text=Nenhum prompt salvo');
});
await step('Associação: cartões de plano, edição por admin e key de acesso', async () => {
  await nav('associacao'); await page.waitForSelector('.hero h1:has-text("Seu lugar dentro da Neva Growth.")'); await page.waitForSelector('.mk-pill:has-text("ASSOCIAÇÃO ATIVA"):has-text("Neva Member")'); await page.waitForSelector('.mc.cur:has-text("Seu acesso atual")'); await page.waitForSelector('.mc:has-text("Neva Elite") >> text=ACESSO RESERVADO');
  await page.click('.mc:has-text("Neva Creator") >> button:has-text("Editar plano")'); await page.fill('.modal input[name=tagline]', 'Plano para criadores'); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.mc:has-text("Plano para criadores")');
  await page.selectOption('select[aria-label="Plano da key"]', 'creator'); await page.click('button:has-text("Gerar keys")'); await page.waitForSelector('.mk-admin code:has-text("NEVA-")');
  const code = await page.textContent('.mk-admin code >> nth=0'); await page.fill('input[aria-label="Sua key"]', 'NEVA-ERRADA'); await page.click('button:has-text("Ativar acesso")'); await page.waitForSelector('text=Key não encontrada');
  await page.fill('input[aria-label="Sua key"]', code); await page.click('button:has-text("Ativar acesso")'); await page.waitForSelector('.mk-pill:has-text("Neva Creator")');
  await page.fill('input[aria-label="Sua key"]', code); await page.click('button:has-text("Ativar acesso")'); await page.waitForSelector('text=já foi resgatada');
});
await step('Usuários: plano e créditos', async () => {
  await nav('usuarios'); await page.waitForSelector('th:has-text("Créditos")'); await page.click('button:has-text("Novo usuário")'); await page.fill('.modal input[name=name]', 'Bia'); await page.fill('.modal input[name=email]', 'bia@neva.test'); await page.fill('.modal input[name=password]', 'senha-forte-456');
  await page.selectOption('.modal select[name=plan]', 'creator'); await page.fill('.modal input[name=credits]', '50'); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('tr:has-text("bia@neva.test"):has-text("creator")');
});
await step('Configurações: 8 seções, perfil, sessões, notificações, privacidade, crm, dados', async () => {
  await nav('configuracoes'); await page.waitForSelector('.snav button >> nth=7');
  await page.fill('input[name=username]', 'ana.teste'); await page.fill('input[name=phone]', '41999990000'); await page.click('button:has-text("Salvar perfil")'); await page.waitForSelector('text=Perfil salvo');
  for (const novo of ['ana2@neva.test', 'ana@neva.test']) { await page.fill('input[name=email]', novo); await page.fill('input[name=password]', 'senha-forte-123'); await page.click('button:has-text("Alterar e-mail")'); await page.waitForSelector(`.srow:has-text("${novo}")`); }
  await page.click('.snav button:has-text("Segurança")'); await page.waitForSelector('text=Sessões e dispositivos');
  await page.click('.snav button:has-text("Notificações")'); await page.waitForSelector('text=Notificações no aparelho'); await page.waitForSelector('.badge:has-text("Desativadas")'); if (!(await page.isDisabled('button:has-text("Enviar teste")'))) throw new Error('teste deveria estar desabilitado'); await page.click('.switch:has-text("Vendas") input'); await page.waitForSelector('text=Preferência salva');
  await page.click('.snav button:has-text("Privacidade")'); await page.waitForSelector('text=Ocultar valores financeiros');
  await page.click('.snav button:has-text("CRM")'); await page.waitForSelector('text=Etapas do funil'); await page.waitForSelector('li:has-text("Pós-venda")');
  await page.click('.snav button:has-text("Meu plano")'); await page.waitForSelector('text=Créditos de prospecção');
  await page.click('.snav button:has-text("Pagamentos")'); await page.waitForSelector('.soonbadge:has-text("Em breve")'); await page.click('.snav button:has-text("Suporte")'); await page.waitForSelector('.soonbadge:has-text("Em breve")');
  await page.click('.snav button:has-text("Integrações")'); await page.waitForSelector('text=não configurado');
  await page.click('.snav button:has-text("Dados")'); const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Exportar dados")')]); if (!dl.suggestedFilename().includes('neva-export')) throw new Error('export');
  await page.reload(); await page.waitForSelector('.snav'); await page.waitForFunction(() => document.querySelector('input[name=username]')?.value === 'ana.teste');
});
await step('Prospecção: mapa, áreas, raio e aviso de chave', async () => {
  await nav('prospeccao'); await page.waitForSelector('text=Busca de empresas não configurada'); await page.waitForSelector('#map .leaflet-tile', { timeout: 15000 }).catch(() => { throw new Error('mapa/tiles não carregaram (rede?)'); });
  await page.click('#map', { position: { x: 300, y: 250 } }); await page.waitForSelector('b:has-text("1 área selecionada")'); await page.click('#map', { position: { x: 120, y: 120 } }); await page.waitForSelector('b:has-text("2 áreas selecionadas")');
  await page.fill('input[aria-label="Raio das áreas"]', '25'); await page.waitForSelector('text=25 km'); await page.waitForSelector('button:has-text("Buscar empresas")[disabled]');
});
await step('responsivo (390px) sem overflow horizontal', async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const p of ['dashboard', 'leads', 'vendas', 'sites', 'acervo']) { await nav(p); await page.waitForTimeout(500); const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 4 && p !== 'leads') throw new Error(`overflow em ${p}: ${o}px`); }
  await page.click('.menu-btn'); await page.waitForSelector('.side.open'); await page.screenshot({ path: path.join(OUT, 'mobile2.png') });
});
await page.setViewportSize({ width: 1360, height: 900 });
await nav('dashboard'); await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, 'dash2.png') });
await nav('leads'); await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, 'crm2.png') });
await nav('vendas'); await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, 'vendas2.png') });
await step('cadastro público: conta nova entra com o sistema completo e espaço próprio', async () => {
  await page.click('.railbtn'); await page.waitForSelector('text=Salvar sessão');
  await page.click('text=Criar minha conta'); await page.waitForSelector('input[name=username]'); await page.waitForSelector('text=Use 8 caracteres ou mais');
  await page.screenshot({ path: path.join(OUT, 'signup.png') });
  await page.fill('input[name=name]', 'Conta Pública'); await page.fill('input[name=username]', 'conta.ui'); await page.fill('input[name=email]', 'publica@y.com'); await page.fill('input[name=password]', 'Abcd1234!x');
  await page.click('button:has-text("Criar minha conta")'); await page.waitForSelector('.side');
  const paths = await page.$$eval('.side a[data-path]', (as) => as.map((a) => a.dataset.path));
  for (const k of ['dashboard', 'clientes', 'vendas', 'sites', 'leads', 'builder', 'play', 'acervo']) if (!paths.includes(k)) throw new Error('falta ' + k + ': ' + paths);
  if (paths.includes('usuarios')) throw new Error('conta pública não pode ver Usuários');
  await page.evaluate(() => { location.hash = '#/clientes'; }); await page.waitForSelector('text=Sua carteira está vazia');
  const rows = await page.$$eval('table tbody tr', (r) => r.length).catch(() => 0);
  if (rows > 0) throw new Error('conta nova enxerga clientes de outra conta');
  await page.click('.railbtn'); await page.waitForSelector('text=Salvar sessão');
});
await step('esqueci a senha: pede e-mail e avisa quando o envio não está configurado', async () => {
  await page.click('text=Esqueci a senha'); await page.waitForSelector('button:has-text("Enviar link de recuperação")');
  await page.screenshot({ path: path.join(OUT, 'forgot.png') });
  await page.fill('input[name=email]', 'publica@y.com'); await page.click('button:has-text("Enviar link de recuperação")');
  await page.waitForSelector('.err-text:has-text("não foi configurado")');
  await page.click('text=Voltar para o login'); await page.waitForSelector('text=Salvar sessão');
});
await step('logout/login', async () => { await page.waitForSelector('input[name=password]'); await page.fill('input[name=email]', 'ana@neva.test'); await page.fill('input[name=password]', 'senha-forte-123'); await page.click('button:has-text("Entrar")'); await page.waitForSelector('.side'); });
console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`); console.log('Erros de console/página:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(fail ? 1 : 0);
