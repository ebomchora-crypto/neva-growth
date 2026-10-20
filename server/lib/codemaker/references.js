// Motor de referências do Builder: escolhe os itens de design da biblioteca que combinam com o pedido,
// inspeciona de verdade as URLs (fontes, cores, estrutura, bibliotecas de animação) e monta o bloco que
// vai para o plano. Tudo que influencia o resultado fica registrado em `trace` (guardado no brief do site).
const { all } = require('../db');
const E = require('./engine');

const AFFINITY = [
  { re: /advoc|jur[ií]d|direito|contab|consultoria|escrit[oó]rio/i, hints: ['editorial elegante', 'luxo discreto', 'minimalismo premium', 'editorial amigável'] },
  { re: /tecnolog|\bia\b|intelig[eê]ncia artificial|software|saas|startup|\bapp\b|automa[cç][aã]o|dados/i, hints: ['escuro refinado', 'escuro com brilho', 'gradientes vivos', 'animação como identidade', 'preto e branco técnico', 'escuro com cor vibrante'] },
  { re: /solar|energia|fotovolt|el[eé]tric|engenharia|constru|reforma|imobili/i, hints: ['minimalismo premium', 'fotografia acolhedora', 'corporativo moderno', 'azul acessível', 'editorial elegante'] },
  { re: /cl[ií]nica|sa[uú]de|est[eé]tic|odont|psic|terap|bem-estar/i, hints: ['ilustração amigável', 'fotografia acolhedora', 'editorial amigável', 'luxo discreto'] },
  { re: /restaurante|pizz|hambur|caf[eé]|confeit|padar|bar\b|gastronom/i, hints: ['fotografia acolhedora', 'divertido amarelo', 'colorido orgânico', 'neo-brutalismo'] },
  { re: /loja|e-?commerce|moda|vestu[aá]rio|produtos/i, hints: ['fotografia urbana', 'minimalismo premium', 'corporativo moderno'] },
];
const STYLE_HINT = { dark: /escuro/i, minimal: /minimal/i, elegant: /editorial|luxo|elegante|premium/i, vibrant: /color|vibrante|gradiente|divertido/i };
const ROLES = [
  { id: 'tipografia', label: 'tipografia e hierarquia', section: /tipograf/i },
  { id: 'composicao', label: 'composição do topo (hero) e direção de arte', section: /layout|composi|princ[ií]pio/i },
  { id: 'movimento', label: 'ritmo, movimento e organização dos componentes', section: /movimento|anima|intera|componente/i },
];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (s) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3));

function pickDesigns(brief, items, limit = 3) {
  const text = `${brief.businessName || ''} ${brief.niche || ''} ${(brief.details || '').slice(0, 800)}`;
  const aff = AFFINITY.filter((a) => a.re.test(text)).flatMap((a) => a.hints);
  const wanted = words(`${brief.niche || ''} ${(brief.details || '').slice(0, 400)}`);
  const mentionsNeva = /neva/i.test(text);
  const scored = items.map((it) => {
    let score = 0; const why = [];
    if (!mentionsNeva && /^neva growth/i.test(it.title)) return { it, score: -1, why: ['identidade da própria plataforma'] };
    const st = norm(it.style);
    aff.forEach((h, i) => { if (st.includes(norm(h))) { score += Math.max(1, 5 - i * 0.6); why.push(`estilo "${it.style}" combina com o ramo`); } });
    if (STYLE_HINT[brief.style]?.test(it.style || '')) { score += 3; why.push(`estilo pedido (${brief.style})`); }
    const overlap = [...words(`${it.niche} ${it.site_type}`)].filter((w) => wanted.has(w));
    if (overlap.length) { score += overlap.length * 2; why.push(`mesmo nicho/tipo: ${overlap.join(', ')}`); }
    return { it, score, why };
  }).sort((a, b) => b.score - a.score);
  const selected = []; const seen = new Set();
  for (const s of scored) {
    if (s.score <= 0 || selected.length >= limit) continue;
    const key = norm(s.it.style).split(' ')[0];
    if (seen.has(key)) continue;
    seen.add(key); selected.push(s);
  }
  if (!selected.length) { const base = scored.find((s) => /editorial minimalista/i.test(s.it.title)); if (base) selected.push({ ...base, score: 0.5, why: ['modelo neutro: nenhuma referência combinou com o pedido'] }); }
  const chosen = new Set(selected.map((s) => s.it.id));
  const discarded = scored.filter((s) => !chosen.has(s.it.id)).sort((a, b) => (a.score < 0 ? -1 : 0) - (b.score < 0 ? -1 : 0)).slice(0, 6).map((s) => ({ id: s.it.id, title: s.it.title, score: Math.round(s.score * 10) / 10, reason: s.score < 0 ? s.why[0] : s.score === 0 ? 'sem afinidade com o pedido' : 'estilo repetido ou pontuação menor' }));
  return { selected: selected.map((s, i) => ({ ...s, role: ROLES[i % ROLES.length] })), discarded };
}

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const isGray = (hex) => { const h = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return Math.max(r, g, b) - Math.min(r, g, b) < 18; };

// Extrai fatos reais de um HTML (+ CSS). Função pura: testada com fixtures.
function parseFacts(html, css = '') {
  const all = `${html}\n${css}`;
  const fonts = new Set();
  for (const m of all.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'<>\s)]+)/gi)) for (const f of m[1].matchAll(/family=([^&:;"']+)/gi)) fonts.add(decodeURIComponent(f[1]).replace(/\+/g, ' '));
  for (const m of all.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) { const first = m[1].split(',')[0].replace(/["']/g, '').trim(); if (first && !/^(inherit|initial|sans-serif|serif|system-ui|monospace|-apple-system|var\()/i.test(first) && first.length < 40) fonts.add(first); }
  const counts = new Map();
  for (const h of all.match(HEX) || []) { const k = h.toLowerCase(); if (!isGray(k)) counts.set(k, (counts.get(k) || 0) + 1); }
  const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  const theme = (html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i) || [])[1] || null;
  const libs = ['gsap', 'lenis', 'three', 'framer-motion', 'lottie', 'swiper', 'locomotive', 'scrollreveal', 'aos'].filter((l) => new RegExp(`<script[^>]+src=["'][^"']*${l}`, 'i').test(html));
  const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').slice(0, 120);
  return { fonts: [...fonts].slice(0, 5), colors, themeColor: theme, libs, h1, h2: (html.match(/<h2[\b>]/gi) || []).length, sections: (html.match(/<section[\b>]/gi) || []).length,
    video: /<video[\b>]/i.test(html), canvas: /<canvas[\b>]/i.test(html) };
}

const cache = new Map();
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
async function inspect(rawUrl) {
  const hit = cache.get(rawUrl);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return hit.v;
  const t0 = Date.now();
  try {
    const start = E.normalizeSiteUrl(rawUrl);
    if (!start) throw new Error('endereço não permitido');
    const { bytes, url } = await withTimeout(E.fetchLimited(start, 'text/html,application/xhtml+xml', 700_000, true), 8000, 'tempo esgotado (8s)');
    const html = new TextDecoder('utf-8').decode(bytes);
    let css = '';
    const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => (m[0].match(/href=["']([^"']+)/i) || [])[1]).filter((h) => h && !/fonts\.googleapis/.test(h)).slice(0, 2);
    for (const href of sheets) {
      try { const abs = E.normalizeSiteUrl(new URL(href, url).href); if (abs) css += new TextDecoder('utf-8').decode((await withTimeout(E.fetchLimited(abs, 'text/css', 400_000, true), 6000, 'css lento')).bytes) + '\n'; } catch { /* folha opcional */ }
    }
    const v = { url: String(rawUrl), ok: true, ms: Date.now() - t0, cssRead: sheets.length, ...parseFacts(html, css) };
    cache.set(rawUrl, { at: Date.now(), v });
    return v;
  } catch (e) { return { url: String(rawUrl), ok: false, ms: Date.now() - t0, error: String(e.message || e).slice(0, 140) }; }
}

function urlsIn(text) { return [...new Set((String(text || '').match(/https?:\/\/[^\s)"'<>]+/gi) || []).map((u) => u.replace(/[.,;]+$/, '')))].slice(0, 2); }

const section = (content, re) => { const parts = String(content).split(/\n(?=## )/); return parts.filter((p) => re.test(p.split('\n')[0])).join('\n'); };
function describe(sel, facts) {
  const c = String(sel.it.content || '');
  const body = [section(c, /princ[ií]pio/i), section(c, /cores/i), section(c, sel.role.section)].filter(Boolean).join('\n').replace(/^> .*\n?/gm, '').trim().slice(0, 900) || c.slice(0, 700);
  const measured = facts?.ok ? `Medido no site real (${facts.url}): fontes ${facts.fonts.join(', ') || 'não detectadas'}; cores ${facts.colors.join(' ') || 'não detectadas'}; ${facts.sections} seções, ${facts.h2} subtítulos${facts.libs.length ? `; usa ${facts.libs.join(', ')}` : ''}${facts.video ? '; tem vídeo' : ''}${facts.canvas ? '; tem canvas' : ''}.`
    : sel.it.url ? 'Site original não pôde ser inspecionado agora: valem só as notas abaixo.' : '';
  return `### ${sel.it.title} — usar SÓ para: ${sel.role.label}\n${measured}\n${body}`;
}

// Monta o bloco de referências + o rastro do que foi encontrado, usado, descartado e falhou.
async function buildReferences(brief, { siteId } = {}) {
  const t0 = Date.now();
  const items = await all("SELECT id,title,niche,style,site_type,url,content FROM library_items WHERE kind='design' AND published=1");
  const { selected, discarded } = pickDesigns(brief, items);
  const targets = [...selected.map((s) => s.it.url).filter(Boolean), ...urlsIn(brief.details)].filter((u, i, a) => a.indexOf(u) === i);
  const inspectOn = process.env.CM_REF_INSPECT !== '0';
  const facts = inspectOn ? await Promise.all(targets.map(inspect)) : [];
  const byUrl = new Map(facts.map((f) => [f.url, f]));
  const own = facts.filter((f) => f.ok && !selected.some((s) => s.it.url === f.url));
  let block = [
    'REFERÊNCIAS DE DESIGN (escolhidas para ESTE pedido e medidas nos sites reais). Regras: cada referência vale só no papel indicado; NÃO copie layout, textos nem marca de nenhuma; combine os papéis numa direção de arte própria para o negócio.',
    'Quando o usuário não deu cores nem fontes, a paleta e as fontes do plano devem nascer destas referências (adaptadas ao ramo, com contraste AA). No <acoes>, diga em uma frase quais referências usou e para quê.',
    ...selected.map((s) => describe(s, byUrl.get(s.it.url))),
    ...own.map((f) => `### Referência enviada pelo usuário (${f.url})\nMedido: fontes ${f.fonts.join(', ') || 'n/d'}; cores ${f.colors.join(' ') || 'n/d'}; ${f.sections} seções${f.libs.length ? `; usa ${f.libs.join(', ')}` : ''}. Papel: o que o usuário pedir sobre ela no pedido.`),
  ].join('\n\n');
  const truncated = block.length > 4200;
  if (truncated) block = `${block.slice(0, 4200)}…`;
  const trace = {
    at: new Date().toISOString(), site: siteId ?? null, found: items.length, ms: Date.now() - t0, chars: block.length, truncated,
    selected: selected.map((s) => ({ id: s.it.id, title: s.it.title, score: Math.round(s.score * 10) / 10, role: s.role.id, why: s.why, url: s.it.url || null })),
    discarded, inspected: facts.filter((f) => f.ok).map(({ url, fonts, colors, libs, sections, ms }) => ({ url, fonts, colors, libs, sections, ms })),
    failures: facts.filter((f) => !f.ok).map(({ url, error }) => ({ url, error })), inspection: inspectOn ? 'on' : 'off'
  };
  console.log(JSON.stringify({ evt: 'cm_design_trace', site: trace.site, found: trace.found, selected: trace.selected.map((s) => s.title), failures: trace.failures.length, chars: trace.chars, truncated }));
  return { block, trace };
}

module.exports = { buildReferences, pickDesigns, parseFacts, inspect, urlsIn };
