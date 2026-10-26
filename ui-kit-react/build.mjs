// Build dos componentes do Motion Primitives para a galeria /#/componentes.
//   node ui-kit-react/build.mjs
// Gera: public/js/ui-kit/mp/*.js (um módulo por demo + pedaços comuns: uma só cópia de React e Motion),
//       public/css/ui-kit-mp.css (Tailwind só das classes usadas, confinado em .mp-scope),
//       public/ui-prompts/mp-<slug>.txt (prompt de integração com o código original) e public/ui-code/mp-<slug>.tsx.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import postcss from 'postcss';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_JS = path.join(ROOT, 'public/js/ui-kit/mp');
const OUT_CSS = path.join(ROOT, 'public/css/ui-kit-mp.css');
const DEMOS = path.join(HERE, 'demos');

// ---------- CSS: Tailwind v4 e confinamento em .mp-scope ----------
const raw = path.join(HERE, '.tw-out.css');
execFileSync(process.execPath, [path.join(ROOT, 'node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', path.join(HERE, 'styles.css'), '-o', raw, '--minify'], { cwd: HERE, stdio: 'inherit' });

const S = '.mp-scope';
function splitSelectors(sel) { // divide por vírgula fora de parênteses/colchetes
  const out = []; let depth = 0; let cur = '';
  for (const ch of sel) { if (ch === '(' || ch === '[') depth++; if (ch === ')' || ch === ']') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  if (cur.trim()) out.push(cur.trim()); return out;
}
function scopeOne(sel) {
  if (/^(:root|:host|html|body)$/.test(sel)) return [S];
  if (/^(html|:host|body)\b/.test(sel)) return [S + sel.replace(/^(html|:host|body)/, '')];
  if (sel === '*') return [S, `${S} *`];
  if (/^::/.test(sel)) return [`${S}${sel}`, `${S} ${sel}`];
  if (/^\*/.test(sel)) return [`${S}${sel.slice(1)}`, `${S} ${sel}`];
  if (sel.startsWith('.') || sel.startsWith(':') || sel.startsWith('[')) return [`:is(${S},${S} *)${sel}`];
  return [`${S} ${sel}`]; // seletores de elemento do preflight (h1, button, img...)
}
const scopePlugin = { postcssPlugin: 'mp-scope', Rule(rule) {
  if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
  if (rule.__scoped) return; rule.__scoped = true;
  rule.selectors = [...new Set(splitSelectors(rule.selector).flatMap(scopeOne))];
} };
// Sem @layer: CSS em camada sempre perde para o CSS do app (que não usa camadas), qualquer que seja a especificidade.
// Achatando as camadas (na mesma ordem: theme, base, utilities), o confinamento em .mp-scope passa a decidir.
const unlayer = { postcssPlugin: 'mp-unlayer', AtRule: { layer(at) { if (at.nodes) at.replaceWith(at.nodes); else at.remove(); } } };
const css = (await postcss([unlayer, scopePlugin]).process(fs.readFileSync(raw, 'utf8'), { from: undefined })).css
  + '\nbody.overflow-hidden{overflow:hidden}'   // trava de rolagem que Dialog/Morphing Dialog põem no <body>
  + '\nbody>.mp-scope.fixed{z-index:200}'   // portais (Morphing Dialog) acima do modal da galeria (.modal-back usa z-index 100)
  + '\n.mp-host{position:absolute;inset:0;display:flex;align-items:stretch;justify-content:stretch;overflow:hidden}';
fs.rmSync(raw, { force: true });
fs.writeFileSync(OUT_CSS, css);
const cssVer = createHash('sha1').update(css).digest('hex').slice(0, 10);

// ---------- JS: um módulo por demo, React/Motion compartilhados ----------
const entries = fs.readdirSync(DEMOS).filter((f) => f.endsWith('.tsx') && !f.startsWith('_')).map((f) => path.join(DEMOS, f));
fs.rmSync(OUT_JS, { recursive: true, force: true });
await esbuild.build({
  entryPoints: entries, outdir: OUT_JS, bundle: true, splitting: true, format: 'esm', minify: true, target: ['es2020'],
  jsx: 'automatic', alias: { '@': HERE }, chunkNames: 'chunks/[name]-[hash]', legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', __MP_CSS__: JSON.stringify(`/css/ui-kit-mp.css?v=${cssVer}`) },
  logLevel: 'warning',
});

// Licenças do que vai no pacote (todas MIT): Motion Primitives, React, React DOM, Motion, react-use-measure, lucide-react, clsx, tailwind-merge
const lic = (p) => { try { return fs.readFileSync(path.join(ROOT, 'node_modules', p), 'utf8'); } catch { return ''; } };
fs.writeFileSync(path.join(OUT_JS, 'LICENSES.txt'), [['motion-primitives (components/core, demos adaptadas)', fs.readFileSync(path.join(HERE, 'LICENSE-motion-primitives.md'), 'utf8')],
  ['react', lic('react/LICENSE')], ['react-dom', lic('react-dom/LICENSE')], ['motion / framer-motion', lic('framer-motion/LICENSE.md') || lic('motion/LICENSE.md')],
  ['react-use-measure', lic('react-use-measure/LICENSE')], ['lucide-react', lic('lucide-react/LICENSE')], ['clsx', lic('clsx/license')], ['tailwind-merge', lic('tailwind-merge/LICENSE.md')]]
  .map(([n, t]) => `===== ${n} =====\n${t.trim()}\n`).join('\n'));

// ---------- Código e prompt de cada componente ----------
const META = JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));
fs.mkdirSync(path.join(ROOT, 'public/ui-code'), { recursive: true });
const LICENSE = fs.readFileSync(path.join(HERE, 'LICENSE-motion-primitives.md'), 'utf8');
for (const m of META) {
  const comp = fs.readFileSync(path.join(HERE, 'components/core', `${m.name}.tsx`), 'utf8');
  const extra = (m.hooks || []).map((h) => `\n\n${h}.tsx (hooks/${h}.tsx)\n` + fs.readFileSync(path.join(HERE, 'hooks', `${h}.tsx`), 'utf8')).join('');
  const code = `// ${m.title} — Motion Primitives (https://motion-primitives.com/docs/${m.name}), licença MIT, © ibelick\n// Arquivo original: components/core/${m.name}.tsx\n${comp}`;
  fs.writeFileSync(path.join(ROOT, 'public/ui-code', `mp-${m.name}.tsx`), code);
  const prompt = `You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles.
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder (or install it with: npx motion-primitives@latest add ${m.name}):
\`\`\`tsx
${m.name}.tsx
${comp}${extra}

lib/utils.ts
${fs.readFileSync(path.join(HERE, 'lib/utils.ts'), 'utf8')}
\`\`\`

Install NPM dependencies:
\`\`\`bash
${['motion', ...(m.deps || []), 'clsx', 'tailwind-merge'].join(', ')}
\`\`\`

Documentation and examples: https://motion-primitives.com/docs/${m.name}
Source: https://github.com/ibelick/motion-primitives (components/core/${m.name}.tsx)

License (keep this notice when you copy the code):
${LICENSE}
Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's arguments and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Use your own image assets
 3. Use lucide-react icons for svgs or logos if component requires them
`;
  fs.writeFileSync(path.join(ROOT, 'public/ui-prompts', `mp-${m.name}.txt`), prompt);
}
const size = fs.readdirSync(OUT_JS, { recursive: true }).filter((f) => String(f).endsWith('.js')).reduce((a, f) => a + fs.statSync(path.join(OUT_JS, String(f))).size, 0);
console.log(`ok: ${entries.length} demos, ${META.length} componentes, JS ${(size / 1024).toFixed(0)} KB, CSS ${(css.length / 1024).toFixed(0)} KB`);
