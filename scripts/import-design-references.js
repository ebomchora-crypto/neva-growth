// Importa o pacote de DESIGN.md como dados de referência, sem escrever no banco.
// Uso: node scripts/import-design-references.js <diretório extraído>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const source = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.statSync(source).isDirectory()) throw new Error('Informe o diretório dos DESIGN.md extraídos.');
const root = path.join(__dirname, '..', 'server', 'lib', 'design-references');
const files = path.join(root, 'files');
fs.mkdirSync(files, { recursive: true });
// URLs já presentes na curadoria do projeto; não inferir domínio a partir do nome.
const known = [
  ...require('../docs/referencias-verificadas.json'),
  ...require('../server/lib/seed-content').ITEMS.filter((item) => item.kind === 'design')
];
const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const knownUrls = new Map(known.filter((item) => item.url).map((item) => [normalize(item.title), item.url]));
// Domínio exibido na captura da referência fornecida pelo usuário.
knownUrls.set(normalize('10X HUB'), 'https://10xdesigners.co');

const luminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((n) => parseInt(n, 16) / 255);
  const linear = channels.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};
const colorful = (hex) => {
  const c = hex.slice(1).match(/../g).map((n) => parseInt(n, 16));
  return Math.max(...c) - Math.min(...c) > 35;
};

const entries = fs.readdirSync(source).filter((name) => /^[^/\\]+\.md$/i.test(name)).sort().map((file) => {
  const content = fs.readFileSync(path.join(source, file), 'utf8');
  const heading = content.match(/^#\s+(.+?)\s+[—–-]\s+Style Reference\s*$/m);
  const title = (heading?.[1] || content.match(/^#\s+(.+)/m)?.[1] || file).trim();
  const description = (content.match(/^>\s+(.+)/m)?.[1] || '').replace(/\\n.*$/, '').trim();
  const theme = (content.match(/^\*\*Theme:\*\*\s*(light|dark|mixed)/m)?.[1] || 'mixed').toLowerCase();
  const colorsSection = content.match(/^## Tokens [—–-] Colors\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] || '';
  const rows = [...colorsSection.matchAll(/^\|([^\n]+)$/gm)].map((m) => ({ line: m[1], color: m[1].match(/#[\da-f]{6}\b/i)?.[0]?.toLowerCase() })).filter((r) => r.color);
  const palette = [...new Set(rows.map((r) => r.color))].slice(0, 6);
  const candidates = rows.filter((r) => /canvas|background|page|surface|fundo/i.test(r.line));
  const background = (candidates.find((r) => theme === 'dark' ? luminance(r.color) < 0.25 : luminance(r.color) > 0.7) || candidates[0]
    || rows.find((r) => theme === 'dark' ? luminance(r.color) < 0.13 : luminance(r.color) > 0.85))?.color || (theme === 'dark' ? '#101820' : '#ffffff');
  const accent = rows.find((r) => colorful(r.color) && r.color !== background)?.color
    || (theme === 'dark' ? palette.find((color) => luminance(color) > 0.6) : palette.find((color) => luminance(color) < 0.2))
    || (theme === 'dark' ? '#ffffff' : '#111111');
  const foreground = theme === 'dark'
    ? palette.find((color) => luminance(color) > 0.7) || '#ffffff'
    : palette.find((color) => luminance(color) < 0.18) || '#111111';
  const variant = file.match(/\((\d+)\)\.md$/)?.[1];
  const id = crypto.createHash('sha256').update(file).digest('hex').slice(0, 16);
  const url = knownUrls.get(normalize(title)) || null;
  const screenshotFile = url && crypto.createHash('sha256').update(url).digest('hex').slice(0, 16) + '.png';
  const screenshot = screenshotFile && fs.existsSync(path.join(__dirname, '..', 'public', 'img', 'design-references', screenshotFile))
    ? '/img/design-references/' + screenshotFile : null;
  fs.writeFileSync(path.join(files, file), content);
  return {
    id, file, kind: 'design', source: 'archive', title: variant ? `${title} (arquivo ${Number(variant) + 1})` : title,
    category: 'Arquivo importado', summary: description.slice(0, 400), niche: 'Sites', url,
    style: { light: 'Claro', dark: 'Escuro', mixed: 'Misto' }[theme], site_type: 'Referência visual',
    theme, hero: { description, background, foreground, accent, palette, screenshot },
    published: 1, locked: false
  };
});

fs.writeFileSync(path.join(root, 'catalog.json'), JSON.stringify(entries));
console.log(`Importados ${entries.length} DESIGN.md para ${root}`);
