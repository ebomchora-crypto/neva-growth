// Build das pré-visualizações do React Bits (React 19) para a galeria /#/componentes.
//   node ui-kit-rb/gen.mjs && node ui-kit-rb/build.mjs
// Gera: public/js/ui-kit/rb/*.js (um módulo por demo + pedaços comuns) e public/css/ui-kit-rb.css (Tailwind só das classes usadas, confinado em .rb-scope).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import postcss from 'postcss';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_JS = path.join(ROOT, 'public/js/ui-kit/rb');
const OUT_CSS = path.join(ROOT, 'public/css/ui-kit-rb.css');
const DEMOS = path.join(HERE, 'demos');

const raw = path.join(HERE, '.tw-out.css');
execFileSync(process.execPath, [path.join(HERE, 'node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', path.join(HERE, 'styles.css'), '-o', raw, '--minify'], { cwd: HERE, stdio: 'inherit' });

const S = '.rb-scope';
function splitSelectors(sel) { const out = []; let depth = 0; let cur = ''; for (const ch of sel) { if (ch === '(' || ch === '[') depth++; if (ch === ')' || ch === ']') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
function scopeOne(sel) {
  if (/^(:root|:host|html|body)$/.test(sel)) return [S];
  if (/^(html|:host|body)\b/.test(sel)) return [S + sel.replace(/^(html|:host|body)/, '')];
  if (sel === '*') return [S, `${S} *`];
  if (/^::/.test(sel)) return [`${S}${sel}`, `${S} ${sel}`];
  if (/^\*/.test(sel)) return [`${S}${sel.slice(1)}`, `${S} ${sel}`];
  if (sel.startsWith('.') || sel.startsWith(':') || sel.startsWith('[')) return [`:is(${S},${S} *)${sel}`];
  return [`${S} ${sel}`];
}
const scopePlugin = { postcssPlugin: 'rb-scope', Rule(rule) { if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return; if (rule.__scoped) return; rule.__scoped = true; rule.selectors = [...new Set(splitSelectors(rule.selector).flatMap(scopeOne))]; } };
const unlayer = { postcssPlugin: 'rb-unlayer', AtRule: { layer(at) { if (at.nodes) at.replaceWith(at.nodes); else at.remove(); } } };
const css = (await postcss([unlayer, scopePlugin]).process(fs.readFileSync(raw, 'utf8'), { from: undefined })).css
  + '\n.rb-host{position:absolute;inset:0;overflow:hidden}';
fs.rmSync(raw, { force: true });
fs.writeFileSync(OUT_CSS, css);
const cssVer = createHash('sha1').update(css).digest('hex').slice(0, 10);

const entries = fs.readdirSync(DEMOS).filter((f) => f.endsWith('.tsx')).map((f) => path.join(DEMOS, f));
fs.rmSync(OUT_JS, { recursive: true, force: true });
await esbuild.build({
  entryPoints: entries, outdir: OUT_JS, bundle: true, splitting: true, format: 'esm', minify: true, target: ['es2020'],
  jsx: 'automatic', loader: { '.js': 'jsx', '.jsx': 'jsx', '.glsl': 'text' }, chunkNames: 'chunks/[name]-[hash]', legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', __RB_CSS__: JSON.stringify(`/css/ui-kit-rb.css?v=${cssVer}`) },
  logLevel: 'warning',
});
fs.copyFileSync(path.join(HERE, 'LICENSE-react-bits.md'), path.join(OUT_JS, 'LICENSE-react-bits.md'));
const size = fs.readdirSync(OUT_JS, { recursive: true }).filter((f) => String(f).endsWith('.js')).reduce((a, f) => a + fs.statSync(path.join(OUT_JS, String(f))).size, 0);
console.log(`ok: ${entries.length} demos, JS ${(size / 1024).toFixed(0)} KB, CSS ${(css.length / 1024).toFixed(0)} KB`);
