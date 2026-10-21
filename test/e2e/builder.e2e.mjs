// E2E do Builder/Studio com a River falsa: seletor de modelo, narração, publicação com link, revisão por arquivo,
// aba Meus sites e barras de rolagem da Neva. Sobe o próprio servidor (banco vazio) e a River falsa.
// Uso: node test/e2e/builder.e2e.mjs   (E2E_OUT=pasta para as capturas)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const out = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'builder-e2e-'));
const PORT = 3600 + Math.floor(Math.random() * 300); const MOCK = PORT + 1;
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-db-'));
const mock = spawn(process.execPath, [path.join(root, 'test/e2e/mock-river.mjs')], { env: { ...process.env, PORT: String(MOCK) }, stdio: 'ignore' });
const app = spawn(process.execPath, [path.join(root, 'server/index.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: data, RIVER_BASE_URL: `http://127.0.0.1:${MOCK}/v1`, RIVER_API_KEY: 'teste' }, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/healthz')).ok) break; } catch { /* subindo */ } await new Promise((r) => setTimeout(r, 250)); }

const results = []; const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g|unsplash|images\./.test(m.text())) errors.push(m.text()); });
async function step(name, fn) {
  try { await fn(); results.push(['OK', name]); console.log('OK  ', name); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL', name, '-', e.message.split('\n')[0]); await page.screenshot({ path: path.join(out, `falha-${results.length}.png`) }).catch(() => {}); }
}

await page.request.post(base + '/api/auth/setup', { data: { name: 'Arthur Teste', email: 'a@x.com', password: 'senha-forte-1' }, headers: { 'x-requested-with': 'neva' } });

await step('Builder: só o AI Prompt (modelo, raciocínio, enviar) e Otimizar pedido; menus com os modelos da Neva', async () => {
  await page.goto(base + '/#/builder'); await page.waitForSelector('.btabs button.on:has-text("Criar site")'); await page.waitForSelector('.ap-card');
  // nada além do prompt e do botão de otimizar na tela de criação
  const labels = await page.$$eval('.bview:not([hidden]) button', (els) => els.filter((e) => e.offsetParent).map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ')));
  const extra = labels.filter((l) => !/^(Modelo:|Raciocínio:|Criar site|Otimizar pedido)/.test(l));
  if (extra.length) throw new Error('botões a mais na criação: ' + extra.join(' | '));
  await page.click('.ap-model'); await page.waitForSelector('.ap-menu:not(.hide) .ap-item:has-text("Neva 1.5")');
  const modelos = await page.$$eval('.ap-menu:not(.hide) .ap-item b', (e) => e.map((x) => x.textContent)); if (modelos.join() !== 'Neva 1.0,Neva 1.2,Neva 1.5') throw new Error('modelos: ' + modelos);
  await page.click('.ap-menu:not(.hide) .ap-item:has-text("Neva 1.5")');
  await page.click('.ap-effort'); await page.waitForSelector('.ap-menu:not(.hide) .ap-item:has-text("Máximo")'); await page.click('.ap-menu:not(.hide) .ap-item:has-text("Máximo")');
  const m = await page.textContent('.ap-model'); const e = await page.textContent('.ap-effort'); if (!/Neva 1\.5/.test(m) || !/Máximo/.test(e)) throw new Error('seleção não aplicada: ' + m + ' / ' + e);
  await page.screenshot({ path: path.join(out, 'builder-ai-prompt.png') });
});
await step('Criar site: narração por etapas, plano, seções e publicação automática com link', async () => {
  await page.fill('textarea[aria-label="O que você quer no site"]', 'Site para a Padaria Sol em Recife, pães de fermentação natural, pedidos pelo WhatsApp.');
  await page.click('.ap-send'); await page.waitForSelector('.mi-fly', { timeout: 5000 }); await page.screenshot({ path: path.join(out, 'builder-orbe.png') }); await page.waitForURL(/#\/studio\/\d+/);
  await page.waitForSelector('.stu-log li.act'); // ação em andamento aparece logo
  await page.waitForSelector('.stu-log li.say a.stu-link', { timeout: 60000 });
  const text = await page.textContent('.stu-log');
  for (const re of [/criação|criar|montar/i, /plano do site/i, /(criando|escrevendo|montando):/i, /(preparando|juntando|conferindo)/i, /(publicando|colocando no ar)/i, /\/s\/padaria-sol/]) if (!re.test(text)) throw new Error('faltou na narração: ' + re);
  await page.waitForSelector('.stu-stages', { timeout: 5000 }); await page.evaluate(() => { document.querySelector('.stu-stages').open = true; });
  await page.waitForFunction(() => document.querySelectorAll('.stu-stages .stg.done, .stu-stages .stg.skipped').length === 7, null, { timeout: 20000 }); // as 7 etapas reais, vindas do servidor
  const labels = await page.$$eval('.stu-stages .stg span', (els) => els.map((e) => e.textContent));
  if (!/Analisando o briefing/.test(labels[0]) || !/Escrevendo as seções \(\d+\/\d+\)/.test(labels.join('|'))) throw new Error('etapas com rótulos errados: ' + labels.join(' | '));
  const link = await page.getAttribute('.stu-log a.stu-link', 'href');
  const live = await page.request.get(link); if (live.status() !== 200 || !/Padaria Sol/.test(await live.text())) throw new Error('link publicado não abre');
  await page.screenshot({ path: path.join(out, 'studio-criado.png') });
});
await step('Alteração: narração, o que foi feito e revisão por arquivo (rejeitar e desfazer)', async () => {
  await page.fill('textarea[aria-label="Pedido de alteração"]', 'Troque a chamada final para falar da retirada às 7h e destaque os botões');
  await page.click('.stu-composer button:has-text("Enviar")');
  await page.waitForSelector('.stu-review .dr-file', { timeout: 60000 });
  if ((await page.$$('.stu-review .dr-file')).length !== 2) throw new Error('esperava 2 arquivos');
  await page.waitForSelector('.stu-log li.lst:has-text("O que eu fiz")');
  await page.click('.stu-review .dr-file:has-text("contato.html") .dr-ic.rej');
  await page.waitForSelector('.stu-revnote:has-text("1 arquivo(s) desfeito(s)")', { timeout: 15000 });
  await page.click('.stu-review .dr-file:has-text("contato.html") .dr-ic');
  await page.waitForSelector('.stu-revnote:has-text("Todas as mudanças mantidas")', { timeout: 15000 });
  await page.screenshot({ path: path.join(out, 'studio-revisao.png') });
});
await step('Meus sites: card com prévia, link publicado e ações (editar, publicar, renomear, duplicar, código, excluir)', async () => {
  await page.goto(base + '/#/builder'); await page.click('.btabs button:has-text("Meus sites")');
  await page.waitForSelector('.bs-card .bs-chip:has-text("Publicado")');
  for (const a of ['Editar', 'Despublicar', 'Renomear', 'Duplicar', 'Código', 'Excluir']) await page.waitForSelector(`.bs-card .bs-act:has-text("${a}")`);
  await page.click('.bs-card .bs-act:has-text("Duplicar")'); await page.waitForFunction(() => document.querySelectorAll('.bs-card').length === 2);
  await page.click('.bs-card >> nth=0 >> .bs-act:has-text("Renomear")'); await page.fill('.modal input[aria-label="Nome do site"]', 'Padaria Sol B'); await page.click('.modal button:has-text("Salvar")');
  await page.waitForSelector('.bs-card b:has-text("Padaria Sol B")');
  await page.screenshot({ path: path.join(out, 'meus-sites.png') });
});
await step('Barras de rolagem com a cor da Neva', async () => {
  const color = await page.evaluate(() => getComputedStyle(document.querySelector('.bview.sites')).scrollbarColor);
  if (!/127, 180, 224|159, 212, 255|7fb4e0/i.test(color)) throw new Error('scrollbar-color = ' + color);
});

await browser.close(); app.kill(); mock.kill();
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\nRESULTADO: ${results.length - fails} ok, ${fails} falhas`); console.log('Erros de console/página:', errors.length ? errors.join(' | ') : 'nenhum');
process.exit(fails || errors.length ? 1 : 0);
