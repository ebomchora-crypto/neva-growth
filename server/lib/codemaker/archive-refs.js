// Acervo de DESIGN.md (1.289 referências em server/lib/design-references): para cada site novo, o Builder escolhe
// sozinho a que mais combina com o pedido (ramo, tema claro/escuro, palavras do pedido) e passa um trecho dela ao plano.
// O usuário não escolhe nada; a escolha fica registrada no rastro do site (brief.designTrace.archive).
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../design-references/catalog.json');
const { sectorOf } = require('./design-context');

const FILES = path.join(__dirname, '..', 'design-references', 'files');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Ramo (em português, do pedido) → palavras que aparecem nas descrições (em inglês) do acervo.
const SECTOR_WORDS = {
  juridico: ['law', 'legal', 'editorial', 'serif', 'trust', 'institutional', 'quiet', 'sober', 'classic', 'consult'],
  energia: ['energy', 'solar', 'industrial', 'engineering', 'clean', 'sustainab', 'green', 'technical'],
  saas: ['software', 'saas', 'product', 'dashboard', 'developer', 'platform', 'app', 'interface', 'tech', 'ai'],
  imobiliaria: ['architecture', 'interior', 'property', 'real estate', 'home', 'space', 'build', 'material'],
  saude: ['health', 'clinic', 'care', 'medical', 'wellness', 'calm', 'soft', 'gentle', 'dental', 'spa'],
  comida: ['restaurant', 'food', 'menu', 'warm', 'kitchen', 'coffee', 'bakery', 'drink', 'appetite', 'hospitality'],
  loja: ['shop', 'store', 'commerce', 'product', 'fashion', 'retail', 'catalog', 'boutique', 'luxury'],
  auto: ['car', 'automotive', 'motor', 'speed', 'vehicle', 'engine', 'performance'],
  criativo: ['studio', 'agency', 'portfolio', 'photography', 'music', 'creative', 'art', 'event', 'culture'],
  geral: ['clean', 'modern', 'friendly', 'clear'],
};
const PT_EN = [[/escur|dark|noturn/, ['dark', 'night', 'black']], [/minimal|clean|limp/, ['minimal', 'clean', 'quiet']], [/luxo|premium|sofistic|elegant/, ['luxury', 'premium', 'elegant', 'refined']],
  [/colorid|vibrant|alegr|divertid/, ['vibrant', 'playful', 'colorful', 'bold']], [/editorial|revista|jornal/, ['editorial', 'magazine', 'serif']], [/tecnolog|digital|futur/, ['tech', 'digital', 'futur']],
  [/natureza|organic|sustent|verde/, ['organic', 'natural', 'earth', 'green']], [/infantil|crianc|escola|educa/, ['playful', 'education', 'learning', 'kids']]];

const text = (it) => norm(`${it.title} ${it.summary} ${it.hero?.description || ''}`);
const hash = (s) => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

/** Escolhe uma referência do acervo para o pedido. `seed` varia entre os melhores candidatos (sites parecidos não saem iguais). */
function pickArchive(brief = {}, seed = '') {
  const ask = norm(`${brief.niche || ''} ${brief.businessName || ''} ${brief.style || ''} ${(brief.details || '').slice(0, 1200)}`);
  const words = [...(SECTOR_WORDS[sectorOf(brief).id] || SECTOR_WORDS.geral)];
  for (const [re, w] of PT_EN) if (re.test(ask)) words.push(...w);
  const wantDark = brief.style === 'dark' || /escur|dark|noturn|preto/.test(ask);
  const wantLight = /claro|branco|clean|limp|leve/.test(ask);
  const scored = catalog.filter((it) => it.published !== 0 && it.file).map((it) => {
    const t = text(it); let score = 0;
    for (const w of words) if (t.includes(w)) score += 2;
    if (wantDark) score += it.theme === 'dark' ? 3 : -2; else if (wantLight || !/escur|dark/.test(ask)) score += it.theme === 'light' ? 1 : 0;
    if (/[^\x00-\x7f]/.test(it.title) && !/[^\x00-\x7f]/.test(brief.businessName || 'a')) score -= 1; // títulos em outro alfabeto: menos legíveis para o modelo
    return { it, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored.slice(0, 5);
  return top[hash(seed) % top.length];
}

/** Trecho útil do DESIGN.md: visão geral + tokens de cor + tipografia (sem tabelas enormes). */
function excerpt(content, max = 1800) {
  const parts = String(content).split(/\n(?=## )/);
  const keep = [parts[0], ...parts.slice(1).filter((p) => /color|cor|typograph|tipograf|font|layout|spacing|component/i.test(p.split('\n')[0]))].join('\n');
  return keep.replace(/\n{3,}/g, '\n\n').slice(0, max);
}

function archiveBlock(brief, seed) {
  const pick = pickArchive(brief, seed);
  if (!pick) return null;
  let content = '';
  try { content = fs.readFileSync(path.join(FILES, pick.it.file), 'utf8'); } catch { return null; }
  const block = `### Referência do acervo de DESIGN.md: ${pick.it.title} — usar como base de direção visual (paleta, tipografia, ritmo), adaptada ao negócio\n` +
    `Regras: NÃO copie marca, nome, textos nem imagens dela; troque as cores de marca se não combinarem com o ramo; mantenha contraste AA.\n${excerpt(content)}`;
  return { block, trace: { id: pick.it.id, title: pick.it.title, file: pick.it.file, theme: pick.it.theme, score: pick.score } };
}

module.exports = { pickArchive, archiveBlock, excerpt };
