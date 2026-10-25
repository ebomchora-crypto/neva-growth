#!/usr/bin/env node
// Captura o hero (topo da home) do site real de cada referência do catálogo.
// Para cada item sem captura: procura o endereço (domínio citado no DESIGN.md ou palpites pelo nome), só aceita se o
// título/og:site_name da página bater com a marca (descarta página à venda, bloqueio de robô e conteúdo adulto) e salva
// public/img/refs/<id>.webp. Resultado em server/lib/design-references/heroes.json (usado pela rota /api/design-references).
// Uso: node scripts/capture-heroes.js [--limit 40] [--workers 6] [--retry]   (precisa de Playwright e ImageMagick `convert`)
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'server', 'lib', 'design-references');
const out = path.join(root, 'public', 'img', 'refs');
const catalog = require(path.join(dir, 'catalog.json'));
const heroesFile = path.join(dir, 'heroes.json');
const triedFile = path.join(dir, 'heroes-tried.json');
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const heroes = read(heroesFile, {}); const tried = read(triedFile, {});
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? Number(args[i + 1]) : d; };
const LIMIT = opt('limit', Infinity); const WORKERS = opt('workers', 6); const RETRY = args.includes('--retry');
fs.mkdirSync(out, { recursive: true });

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const brandOf = (title) => String(title || '').replace(/\s*\(arquivo \d+\)\s*$/i, '').split(/\s[–—-]\s|[–—:|]/)[0].trim();
const TLDS = ['com', 'io', 'co', 'ai', 'app', 'studio', 'design', 'dev', 'org', 'net', 'so', 'me', 'xyz', 'com.br', 'agency', 'co.uk'];
const DOMAIN_RE = /\b((?:[a-z0-9-]+\.)+(?:com|ai|io|co|app|dev|so|design|studio|net|org|xyz|me|tech|fm|tv|gg|shop|store|world|ly|to|sh|cc|agency|cloud|space|bio|club|page|one|run|day|com\.br|co\.uk))\b/i;
const SKIP_HOSTS = /(^|\.)(figma|github|google|twitter|x|linkedin|facebook|instagram|youtube|apple|medium|notion|dribbble|behance)\.(com|so|co)$/i;
const BAD = /porn|xxx|casino|bet365|escort|adult|\bsex|gambl|viagra|onlyfans/i;
const PARKED = /domain (is )?for sale|buy this domain|this domain may be for sale|parked|sedo\.com|hugedomains|dan\.com|godaddy|afternic|domain name is available/i;
const WALL = /just a moment|attention required|access denied|verify you are human|are you a robot|captcha|forbidden|403|404|not found|error/i;

// Fontes documentadas no DESIGN.md (variáveis --font-* e títulos "### Fonte — uso"); as genéricas/comuns demais não provam nada.
const WEAK = /^(ui-|system|-apple|blinkmac|segoe|roboto|helvetica|arial|sans-serif|serif|monospace|georgia|times|courier|inherit|inter|open ?sans|lato|sf ?pro|noto|menlo|consolas|monaco|ui$|emoji)/i;
function docFonts(item) {
  let t = ''; try { t = fs.readFileSync(path.join(dir, 'files', item.file), 'utf8'); } catch { return []; }
  const names = new Set();
  for (const m of t.matchAll(/--font-[\w-]+:\s*['"]?([^'",;\n]+)/g)) names.add(m[1].trim());
  for (const m of t.matchAll(/^###\s+([^—\n]+?)\s+—/gm)) names.add(m[1].trim());
  return [...names].filter((n) => n.length >= 3 && n.length <= 40 && !WEAK.test(n) && !/^(display|body|heading|mono|sans|serif|primary|secondary)$/i.test(n));
}
function candidates(item) {
  const slug = item.file.replace(/-DESIGN\.md$/, '');
  const list = []; const add = (h) => { h = h.toLowerCase().replace(/^www\./, ''); if (h && !list.includes(h) && !SKIP_HOSTS.test(h)) list.push(h); };
  try { const t = fs.readFileSync(path.join(dir, 'files', item.file), 'utf8').slice(0, 2500); const m = t.match(DOMAIN_RE); if (m && !SKIP_HOSTS.test(m[1])) { add(m[1]); list.cited = m[1].toLowerCase().replace(/^www\./, ''); } } catch { /* sem arquivo */ }
  const words = slug.split('-').filter(Boolean); const joined = norm(words.join('')); const dashed = words.join('-');
  if (joined.length >= 2 && joined.length <= 22) for (const t of TLDS) add(`${joined}.${t}`);
  if (words.length > 1 && words.length <= 3) for (const t of ['com', 'io', 'co']) add(`${dashed}.${t}`);
  const res = list.slice(0, 14); res.cited = list.cited; return res;
}
async function probe(host) {
  for (const h of [host, 'www.' + host]) {
    try {
      const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 6000);
      const r = await fetch('https://' + h + '/', { redirect: 'follow', signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'accept-language': 'en-US,en;q=0.9' } });
      clearTimeout(timer);
      if (!r.ok || !/html/i.test(r.headers.get('content-type') || '')) continue;
      const html = (await r.text()).slice(0, 60000);
      return { html, url: r.url };
    } catch (e) { if (e?.cause?.code === 'ENOTFOUND' && h === host) { /* tenta www */ } }
  }
  return null;
}
const meta = (html, re) => (html.match(re) || [])[1] || '';
function verify(page, brand) {
  const title = meta(page.html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const site = meta(page.html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i) || meta(page.html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:site_name["']/i);
  const ogt = meta(page.html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const desc = meta(page.html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const host = new URL(page.url).hostname;
  const head = `${title} ${site} ${ogt} ${desc}`;
  if (BAD.test(head) || PARKED.test(title) || PARKED.test(page.html.slice(0, 4000).replace(/<[^>]+>/g, ' ')) || WALL.test(title)) return false;
  const hay = norm(`${title} ${site} ${ogt} ${host}`); const nb = norm(brand);
  if (nb.length < 3) return norm(host.split('.').slice(-2, -1)[0]) === nb || norm(host.split('.')[0]) === nb;
  if (hay.includes(nb)) return true;
  const tokens = brand.split(/\s+/).map(norm).filter((t) => t.length >= 3);
  return tokens.length > 1 && tokens.every((t) => hay.includes(t));
}
async function shoot(browser, url, file, fonts, trusted) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 800 / 1440, locale: 'en-US', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForLoadState('load', { timeout: 7000 }).catch(() => {});
    await page.waitForTimeout(1800);
    const t = await page.title().catch(() => '');
    if (WALL.test(t)) return false;
    await page.evaluate(() => {
      const ok = /^(accept( all)?( cookies)?|allow all|agree|i agree|got it|ok|okay|aceitar( todos)?|concordo|entendi)\b/i;
      for (const b of document.querySelectorAll('button,a[role=button]')) if (ok.test((b.textContent || '').trim())) { try { b.click(); } catch { /* ignora */ } }
    }).catch(() => {});
    await page.waitForTimeout(500);
    if (!trusted) { // o site certo usa as fontes que o DESIGN.md documenta; um homônimo não usa
      const fam = await page.evaluate(() => {
        const set = new Set(); const add = (v) => String(v || '').split(',').forEach((x) => { x = x.trim().replace(/^["']|["']$/g, ''); if (x) set.add(x); });
        for (const f of document.fonts) add(f.family);
        for (const sel of ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button', 'nav', 'header']) for (const el of [...document.querySelectorAll(sel)].slice(0, 3)) add(getComputedStyle(el).fontFamily);
        return [...set];
      }).catch(() => []);
      const have = fam.map(norm);
      const hit = fonts.some((d) => { const n = norm(d); return n.length >= 3 && have.some((h) => h.includes(n) || (h.length >= 5 && n.includes(h))); });
      if (!hit) return false;
    }
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
    const r = spawnSync('convert', ['png:-', '-quality', '72', '-define', 'webp:method=4', 'webp:-'], { input: png, maxBuffer: 20 * 1024 * 1024 });
    if (r.status !== 0 || r.stdout.length < 6000) return false; // quase vazio = página em branco ou bloqueada
    fs.writeFileSync(file, r.stdout);
    return true;
  } catch { return false; } finally { await ctx.close().catch(() => {}); }
}

(async () => {
  const todo = catalog.filter((it) => !it.hero?.screenshot && !heroes[it.id] && (RETRY || !tried[it.id])).slice(0, LIMIT);
  console.log(`catálogo ${catalog.length}, a processar ${todo.length}, já com captura ${Object.keys(heroes).length}`);
  const browser = await chromium.launch();
  let next = 0; let done = 0; let okCount = 0;
  const save = () => { fs.writeFileSync(heroesFile, JSON.stringify(heroes, null, 1)); fs.writeFileSync(triedFile, JSON.stringify(tried)); };
  const worker = async () => {
    while (next < todo.length) {
      const it = todo[next++]; const brand = brandOf(it.title); let found = null;
      try {
        const cands = candidates(it);
        for (let i = 0; i < cands.length && !found; i += 4) {
          const batch = await Promise.all(cands.slice(i, i + 4).map(async (h) => { const p = await probe(h); return p && verify(p, brand) ? { host: h, ...p } : null; }));
          found = batch.find(Boolean) || null;
        }
        if (found) {
          const file = path.join(out, `${it.id}.webp`);
          const trusted = !!cands.cited && found.host === cands.cited;
          if (await shoot(browser, found.url, file, docFonts(it), trusted)) { heroes[it.id] = { url: new URL(found.url).origin, shot: `/img/refs/${it.id}.webp` }; okCount++; } else found = null;
        }
      } catch (e) { found = null; }
      tried[it.id] = found ? 'ok' : 'none';
      if (++done % 10 === 0) { save(); console.log(`${done}/${todo.length} (ok ${okCount})`); }
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  save(); await browser.close();
  console.log(`fim: ${okCount} capturas novas de ${todo.length}; total com captura ${Object.keys(heroes).length}`);
})();
