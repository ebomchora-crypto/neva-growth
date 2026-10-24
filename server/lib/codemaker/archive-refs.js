// Acervo de DESIGN.md (1.289 referências em server/lib/design-references): TODO site novo parte de uma delas. O Builder escolhe
// sozinho a que melhor combina com o pedido (ramo, clima, claro/escuro, palavras do pedido) por busca BM25 no índice
// (index.json, gerado por scripts/build-design-index.js) e entrega ao plano a base de direção visual: paleta, tipografia,
// ritmo e o que fazer/evitar. O usuário não escolhe nada; a escolha fica no rastro do site (brief.designTrace.archive).
const fs = require('node:fs');
const path = require('node:path');
const { sectorOf } = require('./design-context');

const DIR = path.join(__dirname, '..', 'design-references');
let INDEX = null; let STATS = null;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
const STOP = new Set('the and for with that this from are its into over under not but has have was were will can all any one two out per via each more most than then them they their such only also very just like what when where which while who whom why how about above after again against been before being below between both could did does doing down during further here itself other our ours same should some too until used using your site page web design'.split(' '));

function load() {
  if (INDEX) return INDEX;
  INDEX = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
  const df = new Map(); let total = 0;
  for (const d of INDEX) {
    const tf = new Map();
    const add = (text, w) => { for (const t of words(text)) if (!STOP.has(t)) tf.set(t, (tf.get(t) || 0) + w); };
    add(d.t, 2); add(d.tag, 3); add(d.ov, 1); add(d.s, 1);
    d.tf = tf; d.len = [...tf.values()].reduce((a, b) => a + b, 0); total += d.len;
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  }
  STATS = { df, avg: total / INDEX.length, n: INDEX.length };
  return INDEX;
}
const idf = (t) => { const n = STATS.df.get(t) || 0; return Math.log(1 + (STATS.n - n + 0.5) / (n + 0.5)); };

// Ramo → palavras que aparecem nas descrições (em inglês) das referências.
const SECTOR_WORDS = {
  juridico: ['law', 'legal', 'editorial', 'serif', 'trust', 'institutional', 'sober', 'classic', 'consulting', 'authority', 'refined'],
  energia: ['energy', 'solar', 'industrial', 'engineering', 'clean', 'sustainable', 'technical', 'infrastructure', 'blueprint'],
  saas: ['software', 'saas', 'product', 'dashboard', 'developer', 'platform', 'interface', 'technology', 'startup', 'api', 'automation'],
  imobiliaria: ['architecture', 'interior', 'property', 'real', 'estate', 'home', 'space', 'material', 'gallery', 'editorial'],
  saude: ['health', 'clinic', 'care', 'medical', 'wellness', 'calm', 'soft', 'gentle', 'dental', 'friendly', 'trust', 'clean'],
  comida: ['restaurant', 'food', 'menu', 'warm', 'kitchen', 'coffee', 'bakery', 'drink', 'hospitality', 'appetite', 'poster'],
  loja: ['shop', 'store', 'commerce', 'product', 'fashion', 'retail', 'catalog', 'boutique', 'luxury', 'gallery'],
  auto: ['car', 'automotive', 'motor', 'speed', 'vehicle', 'engine', 'performance', 'dark'],
  criativo: ['studio', 'agency', 'portfolio', 'photography', 'music', 'creative', 'art', 'event', 'culture', 'poster', 'experimental'],
  geral: ['clean', 'modern', 'friendly', 'clear', 'editorial'],
};
// Palavras do pedido (português) → palavras de estilo/ramo das referências.
const PT_EN = [
  [/joia|joalh|semijoia|relogio|bijuteria/, ['jewelry', 'jewellery', 'luxury', 'fashion', 'editorial', 'serif', 'boutique', 'elegant']], [/pizz/, ['pizza', 'restaurant', 'food', 'warm', 'rustic', 'italian']],
  [/hambur|churrasc|steak|lanchon/, ['burger', 'restaurant', 'food', 'bold', 'warm', 'street']], [/crossfit|academia|fitness|treino|muscula|personal/, ['fitness', 'gym', 'sport', 'athletic', 'bold', 'energy', 'dark']],
  [/casamento|noiv|fotograf|ensaio|video/, ['wedding', 'photography', 'portfolio', 'editorial', 'romantic', 'gallery']], [/ingles|idioma|curso|escola/, ['learning', 'education', 'course', 'friendly', 'playful']],
  [/odont|dent[ai]|ortodon/, ['dental', 'clinic', 'health', 'care', 'clean', 'trust']], [/clinic|medic|saude|psico|terap|fisio|nutri/, ['health', 'clinic', 'care', 'calm', 'trust']],
  [/estetic|beleza|spa\b|salao|barbear|cabelo/, ['beauty', 'soft', 'elegant', 'wellness', 'luxury']], [/advog|jurid|direito|escritorio|contab/, ['law', 'legal', 'trust', 'serif', 'institutional']],
  [/restaur|pizz|hambur|lanch|cafe|padar|confeit|bar\b|doceria|gastron/, ['restaurant', 'food', 'warm', 'menu', 'hospitality']], [/loja|e-?commerce|moda|roupa|joia|boutique/, ['shop', 'fashion', 'retail', 'product', 'boutique']],
  [/software|saas|\bapp\b|plataforma|startup|automac|\bia\b|inteligencia artificial|api\b/, ['software', 'product', 'platform', 'developer', 'technology', 'dashboard']],
  [/imobil|arquitet|interiores|constru|reforma/, ['architecture', 'interior', 'property', 'space', 'material']], [/solar|energia|engenharia|eletric/, ['energy', 'industrial', 'engineering', 'technical']],
  [/fotograf|estudio|musica|banda|evento|casamento|portfolio|agencia/, ['studio', 'portfolio', 'photography', 'creative', 'agency']], [/academia|fitness|treino|esporte|crossfit/, ['fitness', 'sport', 'energy', 'bold', 'dark']],
  [/escola|curso|educa|infantil|crianc|ensino/, ['education', 'learning', 'playful', 'friendly', 'colorful']], [/viagem|turismo|hotel|pousada/, ['travel', 'hospitality', 'photography', 'editorial', 'warm']],
  [/pet|veterin|animal/, ['friendly', 'playful', 'warm', 'care']], [/banco|financ|invest|fintech|cripto|seguro/, ['finance', 'fintech', 'trust', 'precise', 'dark']],
  [/escur|dark|noturn|preto/, ['dark', 'black', 'night', 'cinematic']], [/minimal|clean|limp|simples/, ['minimal', 'clean', 'quiet', 'whitespace']],
  [/luxo|premium|sofistic|elegan|exclusiv/, ['luxury', 'premium', 'elegant', 'refined', 'serif']], [/colorid|vibrant|alegr|divertid|jovem/, ['vibrant', 'playful', 'colorful', 'bold']],
  [/editorial|revista|jornal|conteudo|blog/, ['editorial', 'magazine', 'serif', 'typographic']], [/tecnolog|digital|futur|inovac/, ['technology', 'futuristic', 'digital', 'precise']],
  [/natur|organic|sustent|verde|eco\b/, ['organic', 'natural', 'earth', 'green', 'calm']], [/rustic|artesan|tradicion|familia/, ['warm', 'craft', 'earthy', 'handmade', 'classic']],
  [/moderno|ousad|impact|forte/, ['bold', 'modern', 'strong', 'contrast']], [/confian|seguran|profission|corporativ|empresa|b2b/, ['trust', 'corporate', 'professional', 'clear']],
];

/** Escolhe a melhor referência do acervo para o pedido (sempre devolve uma). `seed` desempata entre as quase iguais. */
function pickArchive(brief = {}, seed = '') {
  const idx = load();
  const ask = norm(`${brief.niche || ''} ${brief.businessName || ''} ${brief.style || ''} ${(brief.details || '').slice(0, 1500)}`);
  const q = new Map(); const bump = (w, v) => q.set(w, (q.get(w) || 0) + v);
  for (const w of SECTOR_WORDS[sectorOf(brief).id] || SECTOR_WORDS.geral) bump(w, 1);
  for (const [re, ws] of PT_EN) if (re.test(ask)) for (const w of ws) bump(w, 1.6);
  for (const w of words(`${brief.style || ''} ${brief.niche || ''}`)) bump(w, 0.6);
  if (brief.style === 'minimal') for (const w of ['minimal', 'clean', 'quiet']) bump(w, 1.4);
  if (brief.style === 'elegant') for (const w of ['luxury', 'elegant', 'serif', 'refined']) bump(w, 1.4);
  if (brief.style === 'vibrant') for (const w of ['vibrant', 'bold', 'colorful', 'playful']) bump(w, 1.4);
  const wantDark = brief.style === 'dark' || /escur|dark|noturn|preto/.test(ask);
  const wantLight = !wantDark && (brief.style === 'minimal' || /claro|branco|leve|limp|clean|clinic|saude|odont/.test(ask));
  // Palavras de clima (genéricas) valem menos que as do ramo: "warm" aparece em metade do acervo, "gym" não.
  const GENERIC = new Set(['clean', 'modern', 'friendly', 'clear', 'warm', 'bold', 'soft', 'calm', 'trust', 'premium', 'elegant', 'refined', 'professional', 'strong', 'contrast', 'classic', 'energy', 'dark', 'black', 'light', 'minimal', 'quiet', 'colorful', 'playful', 'vibrant', 'precise', 'natural', 'editorial', 'serif', 'gallery', 'product', 'technology', 'digital', 'creative', 'luxury']);
  for (const [w, v] of q) q.set(w, GENERIC.has(w) ? v * 0.45 : v * 1.6);
  const k1 = 1.2; const b = 0.75;
  const scored = idx.map((d) => {
    let s = 0;
    for (const [t, w] of q) { const f = d.tf.get(t); if (!f) continue; s += w * idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.len / STATS.avg)))); }
    if (wantDark) s *= d.th === 'dark' ? 1.3 : d.th === 'light' ? 0.55 : 0.9;
    else if (wantLight) s *= d.th === 'light' ? 1.2 : d.th === 'dark' ? 0.6 : 0.95;
    if (d.c.length < 3 || !d.f.length) s *= 0.6;            // arquivo incompleto: menos útil como base
    if (/[^\x00-\x7f]/.test(d.t) && !/[^\x00-\x7f]/.test(brief.businessName || 'a')) s *= 0.9;
    return { d, s };
  }).sort((a, b2) => b2.s - a.s);
  const top = scored.filter((x) => x.s >= scored[0].s * 0.9).slice(0, 4);
  let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const pick = top[(h >>> 0) % top.length] || scored[0];
  return { it: pick.d, score: Math.round(pick.s * 100) / 100, alternatives: top.filter((x) => x !== pick).map((x) => x.d.t) };
}

const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
/** Trecho do DESIGN.md que orienta o plano: visão geral, cores, tipografia, fazer/evitar e variáveis (≈3,8 mil caracteres). */
function excerpt(content, max = 3800) {
  const sec = (name) => (String(content).match(new RegExp(`## ${name}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`)) || [])[1] || '';
  const parts = [];
  const ov = String(content).split('\n\n').find((p, i) => i > 1 && p.length > 120 && !/^[#|*]/.test(p));
  if (ov) parts.push(`Visão geral: ${cut(ov, 700)}`);
  const cols = [...sec('Tokens — Colors').matchAll(/^\|\s*([^|\n]+?)\s*\|\s*`(#[0-9a-fA-F]{3,8})`\s*\|[^|\n]*\|\s*([^|\n]*)\|/gm)].slice(0, 9);
  if (cols.length) parts.push(`Cores: ${cols.map((m) => `${m[1].trim()} ${m[2]} (${cut(m[3], 90)})`).join('; ')}`);
  const typ = [...sec('Tokens — Typography').matchAll(/^### ([^\n]+)$/gm)].map((m) => cut(m[1].replace(/·.*$/, ''), 170)).filter((x) => !/detected in extracted|Type Scale/i.test(x)).slice(0, 4);
  if (typ.length) parts.push(`Tipografia: ${typ.join(' | ')}`);
  const lay = cut(sec('Layout'), 420); if (lay) parts.push(`Layout: ${lay}`);
  const dos = sec("Do's and Don'ts");
  const bullets = (txt) => [...txt.matchAll(/^[-*]\s+(.+)$/gm)].map((m) => cut(m[1], 150)).slice(0, 4);
  const doPart = (dos.match(/### Do\b([\s\S]*?)(?=### Don|$)/) || [])[1] || ''; const dontPart = (dos.match(/### Don'?t([\s\S]*)$/) || [])[1] || '';
  if (bullets(doPart).length) parts.push(`Faça: ${bullets(doPart).join(' · ')}`);
  if (bullets(dontPart).length) parts.push(`Evite: ${bullets(dontPart).join(' · ')}`);
  return parts.join('\n').slice(0, max);
}

function archiveBlock(brief, seed) {
  let pick; try { pick = pickArchive(brief, seed); } catch { return null; }
  let content = '';
  try { content = fs.readFileSync(path.join(DIR, 'files', pick.it.file), 'utf8'); } catch { return null; }
  const block = `### BASE DE DIREÇÃO VISUAL (obrigatória): "${pick.it.t}" — ${cut(pick.it.tag, 160)}\n` +
    'O site deve nascer desta referência: use a paleta, a tipografia (ou o par de fontes mais próximo disponível), a densidade, o ritmo de espaçamento e o clima dela, adaptados ao negócio e ao pedido. ' +
    'Se o usuário pediu cores, fontes ou estilo, o pedido dele manda; o que ele não definiu vem desta base. NÃO copie marca, nome, textos nem imagens da referência; troque cores de marca que não combinem com o ramo; mantenha contraste AA.\n' +
    excerpt(content);
  return { block, trace: { id: pick.it.id, title: pick.it.t, file: pick.it.file, theme: pick.it.th, score: pick.score, alternatives: pick.alternatives } };
}

module.exports = { pickArchive, archiveBlock, excerpt };
