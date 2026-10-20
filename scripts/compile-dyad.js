// Extrai de docs/dyad/system_prompt.ts (Dyad, Apache 2.0) o texto das regras de código e gera server/lib/codemaker/dyad-rules.js.
// O texto é copiado como está (só o escape de crase do template literal é desfeito).
const fs = require('node:fs');
const path = require('node:path');
const SRC = path.join(__dirname, '..', 'docs', 'dyad', 'system_prompt.ts');
const OUT = path.join(__dirname, '..', 'server', 'lib', 'codemaker', 'dyad-rules.js');
const text = fs.readFileSync(SRC, 'utf8');
const unescape = (s) => s.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
const between = (start, end) => { const a = text.indexOf(start); if (a < 0) throw new Error('não achei: ' + start); const b = text.indexOf(end, a); if (b < 0) throw new Error('não achei fim: ' + end); return unescape(text.slice(a, b)).trim(); };
const ADDITIONAL_GUIDELINES = between('# Additional Guidelines', '`;\n\nexport const BUILD_SYSTEM_POSTFIX');
const GUIDELINES = between('# Guidelines', '# Examples');
const THINKING_PROMPT = between('# Thinking Process', '`;\n\nexport const BUILD_SYSTEM_PREFIX');
const readme = fs.readFileSync(path.join(__dirname, '..', 'docs', 'dyad', 'README.md'), 'utf8');
const commit = (readme.match(/commit ([0-9a-f]{7,})/) || [])[1] || null;
fs.writeFileSync(OUT, `// GERADO por scripts/compile-dyad.js a partir de docs/dyad/system_prompt.ts (Dyad, Apache 2.0, https://github.com/dyad-sh/dyad) — não edite à mão.\nmodule.exports = ${JSON.stringify({ SOURCE: { repo: 'https://github.com/dyad-sh/dyad', commit, license: 'Apache-2.0' }, ADDITIONAL_GUIDELINES, GUIDELINES, THINKING_PROMPT })};\n`);
console.log('ok', { additional: ADDITIONAL_GUIDELINES.length, guidelines: GUIDELINES.length, thinking: THINKING_PROMPT.length, commit });
