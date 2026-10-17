import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// Uso: DATA_DIR=$(mktemp -d) PORT=3111 npm start  (banco VAZIO)  e  npm run test:e2e
const base = process.env.BASE_URL || 'http://127.0.0.1:3111';
const OUT = process.env.E2E_OUT || os.tmpdir();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage(); page.setDefaultTimeout(7000);
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|boom|cdn\.jsdelivr|openstreetmap|cdnjs/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200) + ' @ ' + m.location().url.split('/').slice(-2).join('/')); });
let pass = 0, fail = 0;
const step = async (n, fn) => { try { await fn(); pass++; console.log('OK  ', n); } catch (e) { fail++; console.log('FAIL', n, '-', e.message.split('\n').slice(0,2).join(' | ')); try { await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); } catch {} } };
const nav = async (p) => { await page.goto(`${base}/#/${p}`); await page.waitForTimeout(150); };
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);

await page.goto(base);
await step('setup admin + dashboard', async () => {
  await page.fill('input[name=name]', 'Ana Teste'); await page.fill('input[name=email]', 'ana@neva.test'); await page.fill('input[name=password]', 'senha-forte-123');
  await page.click('button:has-text("Criar conta")'); await page.waitForSelector('text=Lucro no período'); await page.waitForSelector('text=Minha carteira');
});
await step('dashboard: períodos e estado vazio honesto', async () => {
  await page.click('.pill:has-text("7 dias")'); await page.waitForSelector('text=Nenhuma venda paga neste período');
  await page.click('.pill:has-text("1 ano")'); await page.waitForSelector('svg.chart');
  await page.waitForSelector('button:has-text("Resumo por IA (não configurado)")[disabled]');
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
await step('CRM: criar oportunidade com prioridade e prazo', async () => {
  await nav('leads'); await page.click('button:has-text("Nova oportunidade")');
  await page.fill('.modal input[name=name]', 'Clínica Aurora'); await page.fill('.modal input[name=value]', '3000'); await page.selectOption('.modal select[name=priority]', 'alta'); await page.fill('.modal input[name=due_date]', yesterday);
  await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.lcard:has-text("Clínica Aurora")'); await page.waitForSelector('.lcard .late');
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
await step('CRM: editar funil (renomear + nova etapa)', async () => {
  await page.click('button:has-text("Editar funil")');
  await page.fill('.modal input[aria-label="Nome da etapa"] >> nth=1', 'Qualificados'); await page.click('.modal button:has-text("+ Etapa")');
  await page.fill('.modal input[aria-label="Nome da etapa"] >> nth=6', 'Pós-venda'); await page.click('.modal button:has-text("Salvar funil")');
  await page.waitForSelector('.col .colhead:has-text("Qualificados")'); await page.waitForSelector('.col .colhead:has-text("Pós-venda")');
  await page.reload(); await page.waitForSelector('.col .colhead:has-text("Pós-venda")');
});
await step('CRM: minimizar header + lista + converter em cliente', async () => {
  await page.click('button:has-text("Minimizar header")'); await page.waitForSelector('button:has-text("Expandir header")'); await page.click('button:has-text("Expandir header")');
  await page.click('.kseg button[aria-label="Lista"]'); await page.waitForSelector('tbody tr:has-text("Clínica Aurora")'); await page.click('.kseg button[aria-label="Quadro"]');
  await page.click('.lcard:has-text("Clínica Aurora")'); await page.click('.modal button:has-text("Converter em cliente")'); await page.waitForSelector('.col[data-stage=ganho] .lcard:has-text("Clínica Aurora")');
});
await step('Clientes: indicadores, abas por estágio, entrega digital', async () => {
  await nav('clientes'); await page.waitForSelector('.stat:has-text("Clientes cadastrados")'); await page.waitForSelector('.stat:has-text("Clientes cadastrados") b:text-is("1")');
  await page.click('.pill:has-text("Lead")'); await page.waitForSelector('text=Nenhum resultado'); await page.click('.pill:has-text("Cliente")'); await page.waitForSelector('td:has-text("Clínica Aurora")');
  await page.waitForSelector('th:has-text("Entrega digital")'); await page.waitForSelector('th:has-text("Resultado")');
});
await step('Vendas: custo, margem, entrega, pílulas e indicadores', async () => {
  await nav('vendas'); await page.click('button:has-text("Nova venda")');
  await page.fill('.modal input[name=description]', 'Site Aurora'); await page.fill('.modal input[name=amount]', '3000'); await page.fill('.modal input[name=cost]', '1200'); await page.fill('.modal input[name=delivery_date]', yesterday);
  await page.selectOption('.modal select[name=client_id]', { label: 'Clínica Aurora' }); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('td:has-text("Site Aurora")');
  await page.waitForSelector('.pill:has-text("Atrasadas") .cnt:text-is("1")'); await page.waitForSelector('td:has-text("atrasada")');
  await page.click('button:has-text("Marcar pago")'); await page.waitForSelector('.stat:has-text("Lucro líquido") b:has-text("1.800,00")'); await page.waitForSelector('.stat:has-text("Margem média") b:has-text("60%")');
  await page.click('tbody button:has-text("Entregue")'); await page.waitForSelector('.badge:has-text("entregue")'); await page.click('.pill:has-text("Entregues")'); await page.waitForSelector('td:has-text("Site Aurora")');
  await page.click('.pill:has-text("Sem cliente")'); await page.waitForSelector('text=Nenhum resultado');
});
await step('Dashboard com lucro real', async () => {
  await nav('dashboard'); await page.click('.pill:has-text("7 dias")'); await page.waitForSelector('b:has-text("1.800,00")'); await page.waitForSelector('text=Ticket médio');
});
await step('notificações (sino)', async () => { await page.click('button[aria-label="Notificações"]'); await page.waitForSelector('.dropdown'); await page.waitForSelector('text=Tudo em dia'); await page.click('button[aria-label="Notificações"]'); });
let projUrl;
await step('Sites: criar por modelo, abrir IDE', async () => {
  await nav('sites'); await page.click('button:has-text("Adicionar site")'); await page.fill('.modal input[name=name]', 'Studio Aurora'); await page.fill('.modal input[name=tagline]', 'Sorrisos que encantam');
  await page.click('.modal button:has-text("Criar projeto")'); await page.waitForURL(/#\/ide\/\d+/); projUrl = page.url();
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
await step('Sites: domínio, cliente, arquivar, filtros', async () => {
  await nav('sites'); await page.click('article:has-text("Studio Aurora") >> button:has-text("Dados")'); await page.fill('.modal input[name=domain]', 'https://studioaurora.com.br/'); await page.selectOption('.modal select[name=client_id]', { label: 'Clínica Aurora' });
  await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('article:has-text("studioaurora.com.br")'); await page.waitForSelector('article:has-text("Clínica Aurora")');
  await page.click('article:has-text("Studio Aurora") >> button:has-text("Publicar")'); await page.waitForSelector('article >> .badge.ok:has-text("publicado")');
  const r = await page.request.get(base + '/s/studio-aurora/'); if (r.status() !== 200) throw new Error('site público ' + r.status());
  await page.click('.pill:has-text("Publicado")'); await page.waitForSelector('article:has-text("Studio Aurora")');
  await page.click('article:has-text("Studio Aurora") >> button:has-text("Arquivar")'); await page.waitForSelector('text=Nenhum projeto neste recorte');
  const r2 = await page.request.get(base + '/s/studio-aurora/'); if (r2.status() !== 404) throw new Error('arquivado ainda no ar');
  await page.click('.pill:has-text("Arquivado")'); await page.waitForSelector('article:has-text("Studio Aurora")');
});
await step('Builder: IA não configurada, criar de modelo', async () => {
  await nav('builder'); await page.waitForSelector('text=Geração com IA indisponível'); await page.waitForSelector('button:has-text("Criar com IA")[disabled]'); await page.waitForSelector('button:has-text("Otimizar prompt")[disabled]');
  await page.fill('input[name=name]', 'App de tarefas'); await page.click('.tpl:has-text("Aplicação de tarefas")'); await page.click('button:has-text("Criar a partir do modelo")'); await page.waitForURL(/#\/ide\/\d+/);
});
await step('Referências de design: criar, filtrar, abrir', async () => {
  await nav('design'); await page.waitForSelector('.refcard:has-text("Neva Growth — azul-gelo")'); await page.click('button:has-text("+ Nova referência")');
  await page.fill('.modal input[name=title]', 'Editorial Verde'); await page.fill('.modal input[name=niche]', 'Fintech'); await page.fill('.modal input[name=style]', 'Escuro'); await page.fill('.modal textarea[name=content]', '# DESIGN.md\nCores: #0a0');
  await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.refcard:has-text("Editorial Verde")');
  await page.selectOption('select >> nth=0', 'Fintech'); await page.waitForFunction(() => document.querySelectorAll('.refcard').length === 1); await page.click('.refcard'); await page.waitForSelector('.modal pre:has-text("Cores: #0a0")'); await page.click('.modal button:has-text("Baixar")'); await page.keyboard.press('Escape');
});
await step('Acervo: recursos iniciais e novo recurso', async () => {
  await nav('acervo'); await page.waitForSelector('.libitem:has-text("Direção de landing page")'); await page.click('.libitem:has-text("Direção de landing page")'); await page.waitForSelector('pre.code:has-text("designer de produto")');
  await page.click('.tabs button:has-text("Animações")'); await page.waitForSelector('.libitem:has-text("Revelar ao rolar")');
  await page.click('button:has-text("Novo recurso")'); await page.fill('.modal input[name=title]', 'Pulse botão'); await page.fill('.modal textarea[name=content]', '.pulse{animation:p 1s}'); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.libitem:has-text("Pulse botão")');
});
await step('Play: cadastrar vídeo e marcar como visto', async () => {
  await nav('play'); await page.click('button:has-text("Novo conteúdo")'); await page.fill('.modal input[name=title]', 'Como vender sites'); await page.fill('.modal input[name=video_url]', 'https://youtu.be/dQw4w9WgXcQ'); await page.fill('.modal input[name=category]', 'Vendas');
  await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('article:has-text("Como vender sites")'); await page.click('article:has-text("Como vender sites") >> button:has-text("Assistir")');
  await page.waitForSelector('.modal iframe'); await page.click('.modal button:has-text("Marcar como visto")'); await page.waitForSelector('.stat:has-text("Conteúdos vistos") b:text-is("100%")'); await page.waitForSelector('.badge:has-text("visto")');
});
await step('Gerador de prompts: IA não configurada + Meus prompts', async () => {
  await nav('prompts'); await page.waitForSelector('text=IA não configurada'); await page.waitForSelector('button:has-text("Gerar prompt")[disabled]'); await page.click('.seg button:has-text("JSON")');
  await page.click('.tabs button:has-text("Meus prompts")'); await page.waitForSelector('text=Nenhum prompt salvo');
});
await step('Associação: planos e edição por admin', async () => {
  await nav('associacao'); await page.waitForSelector('text=Seu plano: Member'); await page.waitForSelector('.plan:has-text("Elite")');
  await page.click('.plan:has-text("Creator") >> button:has-text("Editar plano")'); await page.fill('.modal input[name=ai_monthly_limit]', '200'); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('.plan:has-text("IA: 200/mês")');
});
await step('Usuários: plano e créditos', async () => {
  await nav('usuarios'); await page.waitForSelector('th:has-text("Créditos")'); await page.click('button:has-text("Novo usuário")'); await page.fill('.modal input[name=name]', 'Bia'); await page.fill('.modal input[name=email]', 'bia@neva.test'); await page.fill('.modal input[name=password]', 'senha-forte-456');
  await page.selectOption('.modal select[name=plan]', 'creator'); await page.fill('.modal input[name=credits]', '50'); await page.click('.modal button:has-text("Salvar")'); await page.waitForSelector('tr:has-text("bia@neva.test"):has-text("creator")');
});
await step('Configurações: 8 seções, perfil, sessões, notificações, privacidade, crm, dados', async () => {
  await nav('configuracoes'); await page.waitForSelector('.snav button >> nth=7');
  await page.fill('input[name=username]', 'ana.teste'); await page.fill('input[name=phone]', '41999990000'); await page.click('button:has-text("Salvar perfil")'); await page.waitForSelector('text=Perfil salvo');
  await page.click('.snav button:has-text("Segurança")'); await page.waitForSelector('text=Esta sessão');
  await page.click('.snav button:has-text("Notificações")'); await page.click('.switch:has-text("Vendas") input'); await page.waitForSelector('text=Preferência salva');
  await page.click('.snav button:has-text("Privacidade")'); await page.waitForSelector('text=Ocultar valores no painel');
  await page.click('.snav button:has-text("CRM")'); await page.waitForSelector('text=Etapas do funil'); await page.waitForSelector('li:has-text("Pós-venda")');
  await page.click('.snav button:has-text("Meu plano")'); await page.waitForSelector('text=Créditos de prospecção');
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
await step('logout/login', async () => { await page.click('.railbtn'); await page.waitForSelector('input[name=password]'); await page.fill('input[name=email]', 'ana@neva.test'); await page.fill('input[name=password]', 'senha-forte-123'); await page.click('button:has-text("Entrar")'); await page.waitForSelector('.side'); });
console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`); console.log('Erros de console/página:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(fail ? 1 : 0);
