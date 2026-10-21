// Revisão visual: renderiza o site num navegador de verdade e mede o que é mensurável (overflow, texto pequeno,
// contraste, alvos de toque, imagens quebradas, hierarquia de títulos, composição efetiva). Estética (se está
// bonito) NÃO é medida aqui: isso exige olhar as capturas (shots). Sem navegador, devolve available:false.
const fs = require('node:fs');

const CANDIDATES = [process.env.CM_BROWSER, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
function browserPath() { return CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null; }
function playwright() { try { return require('playwright-core'); } catch { return null; } }
function available() { return Boolean(browserPath() && playwright()); }

const VIEWPORTS = [{ name: 'celular', width: 390, height: 844 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'desktop', width: 1440, height: 900 }];

// Roda dentro da página.
function measure() {
  const vw = document.documentElement.clientWidth;
  const lum = (r, g, b) => { const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : ''}`;
  const out = { overflowX: document.documentElement.scrollWidth - vw, overflowers: [], small: [], contrast: [], taps: [], brokenImages: [], headingClips: [], emptySections: [] };
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 && out.overflowers.length < 6 && !el.closest('[class*="overflow-x"],[class*="snap-x"],.overflow-hidden')) out.overflowers.push({ el: label(el), right: Math.round(r.right) });
  });
  const seen = new Set();
  document.querySelectorAll('p,li,a,button,span,h1,h2,h3,h4,summary,label,small,td,dd,dt').forEach((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own.length || !visible(el)) return;
    const cs = getComputedStyle(el); const size = parseFloat(cs.fontSize);
    if (size < 12 && out.small.length < 8) out.small.push({ el: label(el), px: size, text: own[0].textContent.trim().slice(0, 30) });
    const fg = parse(cs.color); const bg = bgOf(el);
    if (!fg || !bg || fg.a < 0.5) return;
    const er = el.getBoundingClientRect(); const overImage = [...document.querySelectorAll('img,video,canvas,svg[class*="absolute"]')].some((m) => { if (m.contains(el)) return false; const r = m.getBoundingClientRect(); return r.width > 80 && r.height > 60 && er.left < r.right && er.right > r.left && er.top < r.bottom && er.bottom > r.top; });
    if (overImage) return;
    const l1 = lum(fg.r, fg.g, fg.b), l2 = lum(bg.r, bg.g, bg.b);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const key = `${cs.color}|${bg.r},${bg.g},${bg.b}|${Math.round(size)}`;
    if (ratio < (large ? 3 : 4.5) && !seen.has(key) && out.contrast.length < 10) { seen.add(key); out.contrast.push({ el: label(el), ratio: Math.round(ratio * 100) / 100, text: own[0].textContent.trim().slice(0, 30) }); }
  });
  if (vw <= 480) document.querySelectorAll('a[href],button,summary,input,select').forEach((el) => {
    if (!visible(el) || el.closest('nav details')) return; const r = el.getBoundingClientRect();
    if ((r.height < 24 || r.width < 24) && out.taps.length < 8 && getComputedStyle(el).display !== 'inline') out.taps.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
  });
  document.querySelectorAll('img').forEach((img) => { if (visible(img) && img.complete && img.naturalWidth === 0 && out.brokenImages.length < 6) out.brokenImages.push(img.getAttribute('src')?.slice(0, 60)); });
  document.querySelectorAll('h1,h2').forEach((h) => { if (visible(h) && h.scrollWidth > h.clientWidth + 2 && out.headingClips.length < 6) out.headingClips.push({ el: label(h), text: h.textContent.trim().slice(0, 40) }); });
  document.querySelectorAll('main>section').forEach((s) => { if (s.getBoundingClientRect().height < 48) out.emptySections.push(s.id || label(s)); });
  const sections = [...document.querySelectorAll('main>section')];
  const inner = document.querySelector('main>section:nth-of-type(2) [class*="max-w"]');
  out.h1 = document.querySelectorAll('h1').length;
  out.metrics = {
    pageHeight: document.documentElement.scrollHeight, sections: sections.length,
    contentWidth: inner ? Math.round(inner.getBoundingClientRect().width) : null,
    sectionPadY: sections[1] ? Math.round(parseFloat(getComputedStyle(sections[1]).paddingTop)) : null,
    h2Transform: document.querySelector('main section h2') ? getComputedStyle(document.querySelector('main section h2')).textTransform : null,
    h2Weight: document.querySelector('main section h2') ? getComputedStyle(document.querySelector('main section h2')).fontWeight : null,
    fontDisplay: getComputedStyle(document.querySelector('h1,h2') || document.body).fontFamily.split(',')[0].replace(/["']/g, ''),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
  return out;
}


// Roda dentro da página: texto visível com cor, tamanho e retângulo (em coordenadas da página).
function collectText() {
  const out = [];
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  document.querySelectorAll('p,li,a,button,span,h1,h2,h3,h4,summary,label,small,td,dd,dt,div').forEach((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own.length) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return;
    const fg = parse(cs.color); if (!fg || fg.a < 0.5) return;
    const range = document.createRange(); range.selectNodeContents(own[0]); const tr = range.getBoundingClientRect();
    if (tr.width < 6 || tr.height < 6) return;
    if (tr.bottom + scrollY <= 0 || tr.right <= 0 || tr.top + scrollY < 0 || el.closest('.sr-only,[class*="skip"]')) return; // fora da tela (skip-link) não conta
    const size = parseFloat(cs.fontSize);
    out.push({ section: el.closest('main>section,section')?.id || null, el: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : ''}`, text: own[0].textContent.trim().slice(0, 30), fg, size, bold: Number(cs.fontWeight) >= 700, x: tr.left + scrollX, y: tr.top + scrollY, w: tr.width, h: tr.height });
  });
  return out.slice(0, 400);
}

// Roda dentro da página: com o texto apagado, amostra os pixels reais atrás de cada texto (inclui fotos, degradês e vídeo)
// e calcula o contraste. `shot` é a captura (dataURL) da página inteira sem texto.
async function pixelContrast({ shot, items }) {
  const img = new Image(); img.src = shot; await img.decode();
  const dpr = img.width / document.documentElement.scrollWidth || 1;
  const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const lum = (r, g, b) => { const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const bad = [];
  for (const it of items) {
    const need = it.size >= 24 || (it.size >= 18.66 && it.bold) ? 3 : 4.5;
    const lf = lum(it.fg.r, it.fg.g, it.fg.b);
    const x0 = Math.max(0, Math.round(it.x * dpr)), y0 = Math.max(0, Math.round(it.y * dpr));
    const w = Math.min(Math.round(it.w * dpr), img.width - x0), h = Math.min(Math.round(it.h * dpr), img.height - y0);
    if (w < 4 || h < 4) continue;
    const data = ctx.getImageData(x0, y0, w, h).data;
    const stepX = Math.max(1, Math.floor(w / 28)), stepY = Math.max(1, Math.floor(h / 8));
    let n = 0, below = 0; const ratios = [];
    for (let yy = 0; yy < h; yy += stepY) for (let xx = 0; xx < w; xx += stepX) {
      const i = (yy * w + xx) * 4; const l = lum(data[i], data[i + 1], data[i + 2]);
      const ratio = (Math.max(l, lf) + 0.05) / (Math.min(l, lf) + 0.05); ratios.push(ratio); n++; if (ratio < need) below++;
    }
    ratios.sort((a, b) => a - b);
    if (n && below / n >= 0.2) bad.push({ section: it.section, light: lf > 0.4, el: it.el, text: it.text, need, p10: Math.round(ratios[Math.floor(n * 0.1)] * 100) / 100, share: Math.round((below / n) * 100) });
  }
  return bad;
}

/** Renderiza e mede. `shotsDir` (opcional) salva capturas por largura para a inspeção estética. */
async function inspectHtml(html, { shotsDir, name = 'site', timeout = 30000 } = {}) {
  if (!available()) return { available: false, reason: browserPath() ? 'playwright-core ausente' : 'nenhum navegador encontrado (defina CM_BROWSER)' };
  const { chromium } = playwright();
  const browser = await chromium.launch({ executablePath: browserPath(), args: ['--no-sandbox'] });
  const results = []; const findings = [];
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: 'networkidle', timeout }).catch(() => {});
      await page.waitForTimeout(600);
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
      const m = await page.evaluate(measure);
      // Contraste por pixels reais: apaga o texto, captura a página e amostra o que fica atrás de cada texto.
      try {
        await page.evaluate(() => window.scrollTo(0, 0));
        const items = await page.evaluate(collectText);
        const style = await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}' });
        const buf = await page.screenshot({ fullPage: true, type: 'png' });
        await style.evaluate((el) => el.remove());
        m.pixelContrast = await page.evaluate(pixelContrast, { shot: `data:image/png;base64,${buf.toString('base64')}`, items });
      } catch { m.pixelContrast = null; }
      if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: `${shotsDir}/${name}-${vp.name}.png`, fullPage: vp.name !== 'desktop' || true }); }
      results.push({ viewport: vp.name, width: vp.width, ...m });
      const add = (severity, kind, detail) => findings.push({ severity, viewport: vp.name, kind, detail });
      if (m.overflowX > 2) add('critico', 'overflow-horizontal', `${m.overflowX}px além da tela; ex.: ${m.overflowers.map((o) => o.el).slice(0, 3).join(', ')}`);
      if (m.headingClips.length) add('critico', 'titulo-cortado', m.headingClips.map((h) => h.text).join(' | '));
      if (m.brokenImages.length) add('critico', 'imagem-quebrada', m.brokenImages.join(', '));
      if (m.h1 !== 1) add('alto', 'h1', `${m.h1} títulos h1 (esperado 1)`);
      if (m.contrast.length) add('alto', 'contraste-baixo', m.contrast.slice(0, 4).map((c) => `${c.el} ${c.ratio}:1 "${c.text}"`).join(' | '));
      if (m.pixelContrast?.length) add('alto', 'contraste-sobre-imagem', m.pixelContrast.slice(0, 5).map((c) => `${c.el} "${c.text}" p10 ${c.p10}:1 (precisa ${c.need}; ${c.share}% da área abaixo)`).join(' | '));
      if (m.small.length) add('medio', 'texto-pequeno', m.small.slice(0, 4).map((s) => `${s.px}px "${s.text}"`).join(' | '));
      if (m.taps.length) add('medio', 'alvo-de-toque', m.taps.slice(0, 4).map((t) => `${t.el} ${t.w}x${t.h}`).join(' | '));
      if (m.emptySections.length) add('medio', 'secao-vazia', m.emptySections.join(', '));
      await ctx.close();
    }
  } finally { await browser.close(); }
  const rank = { critico: 3, alto: 2, medio: 1 };
  return { available: true, findings, critical: findings.filter((f) => f.severity === 'critico').length, results, summary: findings.reduce((a, f) => ({ ...a, [f.severity]: (a[f.severity] || 0) + 1 }), {}), worst: findings.sort((a, b) => rank[b.severity] - rank[a.severity])[0] || null };
}

const PRIVATE = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?$|0\.0\.0\.0)/i;

// Mede a COMPOSIÇÃO renderizada de uma referência (primeira tela em 1440px). Não é "entender o design": são medidas
// objetivas (tema, tamanho e alinhamento do título, quanto da tela é imagem, menu fixo, fonte realmente usada).
async function measureReference(url, { shotsDir, name = 'ref', timeout = 25000 } = {}) {
  if (!available()) return { ok: false, error: 'sem navegador' };
  const { chromium } = playwright();
  const browser = await chromium.launch({ executablePath: browserPath(), args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'pt-BR' });
    const page = await ctx.newPage();
    await page.route('**/*', (route) => { try { return PRIVATE.test(new URL(route.request().url()).hostname) ? route.abort() : route.continue(); } catch { return route.abort(); } });
    await page.goto(url, { waitUntil: 'networkidle', timeout }).catch(() => page.goto(url, { waitUntil: 'domcontentloaded', timeout }));
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const lum = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (a < 0.5) return null; const f = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const under = (x, y) => { for (let n = document.elementFromPoint(x, y); n; n = n.parentElement) { const l = lum(getComputedStyle(n).backgroundColor); if (l !== null) return l; } return lum(getComputedStyle(document.documentElement).backgroundColor) ?? 1; };
      const samples = [[vw * 0.5, vh * 0.5], [vw * 0.15, vh * 0.35], [vw * 0.85, vh * 0.65]].map(([x, y]) => under(x, y));
      const bgL = samples.sort((p, q) => p - q)[1];
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const h1 = [...document.querySelectorAll('h1')].find(vis);
      const h1r = h1?.getBoundingClientRect(); const h1s = h1 ? getComputedStyle(h1) : null;
      let media = 0;
      document.querySelectorAll('img,video,canvas,picture').forEach((e) => { if (!vis(e)) return; const r = e.getBoundingClientRect(); const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)); if (w * h > 20000) media += w * h; });
      const nav = document.querySelector('header,nav'); const navPos = nav ? getComputedStyle(nav).position : null;
      const first = (f) => (f || '').split(',')[0].replace(/["']/g, '').trim();
      return { theme: bgL < 0.25 ? 'escuro' : 'claro', bgLuminance: Math.round(bgL * 100) / 100,
        h1: h1 ? { text: h1.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), px: Math.round(parseFloat(h1s.fontSize)), weight: h1s.fontWeight, align: h1s.textAlign === 'center' ? 'centro' : h1s.textAlign === 'right' || h1s.textAlign === 'end' ? 'direita' : 'esquerda', leftPx: Math.round(h1r.left), font: first(h1s.fontFamily), upper: h1s.textTransform === 'uppercase' } : null,
        bodyFont: first(getComputedStyle(document.body).fontFamily), mediaShare: Math.min(1, Math.round((media / (vw * vh)) * 100) / 100),
        navFixed: navPos === 'fixed' || navPos === 'sticky', navLinks: nav ? nav.querySelectorAll('a').length : 0,
        sections: document.querySelectorAll('section').length, screens: Math.round((document.documentElement.scrollHeight / vh) * 10) / 10, hasVideo: !!document.querySelector('video') };
    });
    if (shotsDir) { require('node:fs').mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: `${shotsDir}/${name}.png` }); m.shot = `${name}.png`; }
    return { ok: true, ...m };
  } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 140) }; } finally { await browser.close(); }
}

module.exports = { measureReference, inspectHtml, available, browserPath, VIEWPORTS };
