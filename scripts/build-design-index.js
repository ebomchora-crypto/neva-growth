// Gera server/lib/design-references/index.json a partir dos 1.289 DESIGN.md: título, frase-resumo, tema, visão geral, fontes e cores.
// O Builder usa esse índice para escolher a referência que melhor combina com cada pedido. Rode: node scripts/build-design-index.js
const fs = require('node:fs'); const path = require('node:path');
const dir = path.join(__dirname, '..', 'server', 'lib', 'design-references');
const catalog = require(path.join(dir, 'catalog.json'));
const out = [];
for (const it of catalog) {
  if (!it.file || it.published === 0) continue;
  let t; try { t = fs.readFileSync(path.join(dir, 'files', it.file), 'utf8'); } catch { continue; }
  const lines = t.split('\n');
  const title = (lines[0] || '').replace(/^#\s*/, '').replace(/\s*[—-]\s*Style Reference.*$/i, '').trim() || it.title;
  const tag = ((lines.find((l) => l.startsWith('> ')) || '').slice(2) || it.summary || '').trim();
  const theme = (t.match(/\*\*Theme:\*\*\s*(\w+)/i) || [])[1] || it.theme || 'mixed';
  const ov = (t.split('\n\n').find((p, i) => i > 1 && p.length > 120 && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('**Theme')) || it.summary || '').replace(/\s+/g, ' ').slice(0, 520);
  const typo = (t.match(/## Tokens — Typography([\s\S]*?)(?=\n## )/) || [])[1] || '';
  const fonts = [...typo.matchAll(/^### ([^—\n·]+?)(?: \(|\s+—| ·|$)/gm)].map((m) => m[1].trim()).filter((f) => f && !/type scale|detected/i.test(f)).slice(0, 4);
  const colors = [...t.matchAll(/^\|\s*([^|\n]+?)\s*\|\s*`(#[0-9a-fA-F]{3,8})`/gm)].map((m) => [m[1].trim(), m[2].toLowerCase()]).slice(0, 8);
  const similar = ((t.match(/## Similar Brands([\s\S]*?)(?=\n## |$)/) || [])[1] || '').replace(/\s+/g, ' ').slice(0, 240);
  out.push({ id: it.id, file: it.file, t: title, tag, th: theme, ov, f: fonts, c: colors, s: similar });
}
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(out));
console.log(out.length, 'referências indexadas;', (fs.statSync(path.join(dir, 'index.json')).size / 1024).toFixed(0), 'KB');
