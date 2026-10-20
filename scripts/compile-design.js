// Compila docs/design/SYSTEM_PROMPT.md e docs/design/DESIGN.md (V2) em server/lib/codemaker/design-md.js.
// docs/ não vai para a Vercel (.vercelignore), então o conteúdo é embutido em JS. O servidor NÃO manda o DESIGN.md
// inteiro a cada chamada: server/lib/codemaker/design-context.js escolhe as seções certas de cada etapa.
// Uso: node scripts/compile-design.js   (rode de novo sempre que um dos dois arquivos mudar)
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'docs', 'design');
const OUT = path.join(__dirname, '..', 'server', 'lib', 'codemaker', 'design-md.js');

const prompt = fs.readFileSync(path.join(DIR, 'SYSTEM_PROMPT.md'), 'utf8');
const body = prompt.split('--- BEGIN SYSTEM PROMPT ---')[1]?.split('--- END SYSTEM PROMPT ---')[0]?.trim();
if (!body) throw new Error('SYSTEM_PROMPT.md: marcadores BEGIN/END SYSTEM PROMPT não encontrados');
const IDENTITY = {}; const IDENTITY_ORDER = [];
for (const chunk of body.split(/^(?=# )/m)) {
  const m = chunk.match(/^# (.+)\n/); if (!m) continue;
  IDENTITY[m[1].trim()] = chunk.slice(m[0].length).trim(); IDENTITY_ORDER.push(m[1].trim());
}

const lines = fs.readFileSync(path.join(DIR, 'DESIGN.md'), 'utf8').split('\n');
const DESIGN = {}; let key = null;
for (const line of lines) {
  const h2 = line.match(/^## (\d+)\.\s+(.+)$/); const h3 = line.match(/^### (\d+\.\d+)\s+(.+)$/);
  if (h2) { key = h2[1]; DESIGN[key] = { title: `${h2[1]}. ${h2[2]}`, text: '' }; continue; }
  if (h3) { key = h3[1]; DESIGN[key] = { title: `${h3[1]} ${h3[2]}`, text: '' }; continue; }
  if (/^# /.test(line)) { key = null; continue; }
  if (key) DESIGN[key].text += line + '\n';
}
for (const k of Object.keys(DESIGN)) DESIGN[k].text = DESIGN[k].text.trim();

const stats = { identitySections: IDENTITY_ORDER.length, designSections: Object.keys(DESIGN).length, identityChars: body.length };
fs.writeFileSync(OUT, `// GERADO por scripts/compile-design.js a partir de docs/design/SYSTEM_PROMPT.md e DESIGN.md — não edite à mão.\nmodule.exports = ${JSON.stringify({ IDENTITY, IDENTITY_ORDER, DESIGN, STATS: stats })};\n`);
console.log('compilado:', stats);
