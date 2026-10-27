// Abre cada demo isolada num navegador (WebGL por software) e registra erros; salva uma imagem por demo.
import { createRequire } from 'node:module'; const { chromium } = createRequire('/opt/node-tools/')('playwright');
import fs from 'node:fs';
const [,, outDir, only] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const list = JSON.parse(fs.readFileSync(new URL('./.generated.json', import.meta.url))).filter((d) => !only || only.split(',').includes(d.slug) || d.slug.includes(only));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const res = {}; let i = 0;
async function worker() {
  const ctx = await b.newContext({ viewport: { width: 540, height: 420 } });
  while (i < list.length) {
    const d = list[i++]; const p = await ctx.newPage(); const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200))); p.on('pageerror', (e) => errs.push('PAGE ' + String(e).slice(0, 200)));
    try { await p.goto(`http://localhost:3000/rb-test.html?slug=${d.slug}`, { timeout: 20000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); } catch (e) { errs.push('NAV ' + e.message.slice(0, 100)); }
    const info = await p.evaluate(() => { const s = document.getElementById('s'); return { ok: window.__ok, kids: s.querySelectorAll('*').length, canvas: s.querySelectorAll('canvas').length, text: (s.innerText || '').trim().length, failed: /falhou ao abrir/.test(s.innerText || '') }; }).catch(() => ({}));
    await p.screenshot({ path: `${outDir}/${d.slug}.png`, clip: { x: 0, y: 0, width: 522, height: 402 } }).catch(() => {});
    res[d.slug] = { ...info, errs: [...new Set(errs)].slice(0, 3) }; await p.close();
  }
  await ctx.close();
}
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(`${outDir}/results.json`, JSON.stringify(res, null, 1));
const bad = Object.entries(res).filter(([, r]) => r.failed || r.ok === false || r.errs.length || !r.kids);
console.log(`${list.length} testados, ${bad.length} com problema`);
for (const [k, r] of bad) console.log(k, JSON.stringify({ kids: r.kids, failed: r.failed, errs: r.errs }));
await b.close();
