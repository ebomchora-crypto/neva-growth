// Decide quais demos entram (sem erro e com algo visível), grava keep.json e gera public/js/ui-kit/manifest-rb.js.
//   node ui-kit-rb/finalize.mjs <pasta-smoke-1> [<pasta-smoke-2> ...]   (o último resultado de cada demo vale)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { META } from './rb-meta.mjs';
const dirs = process.argv.slice(2);
const gen = JSON.parse(fs.readFileSync(new URL('./.generated.json', import.meta.url)));
const res = {}; const shot = {};
for (const d of dirs) { const p = `${d}/results.json`; if (!fs.existsSync(p)) continue; const r = JSON.parse(fs.readFileSync(p)); for (const [k, v] of Object.entries(r)) { res[k] = v; shot[k] = `${d}/${k}.png`; } }
const sd = (f) => { try { return parseFloat(execFileSync('convert', [f, '-colorspace', 'Gray', '-format', '%[fx:standard_deviation]', 'info:']).toString()); } catch { return 0; } };
const keep = []; const dropped = [];
for (const g of gen) {
  const r = res[g.slug]; const meta = META[g.key];
  if (!r || !meta) { dropped.push([g.slug, 'sem teste ou sem metadados']); continue; }
  if (r.failed || r.ok === false || (r.errs || []).some((e) => /TypeError|ReferenceError|IMPORT|PAGE/.test(e))) { dropped.push([g.slug, 'erro: ' + (r.errs || [])[0]?.slice(0, 80)]); continue; }
  const s = sd(shot[g.slug]);
  if (s < 0.012) { dropped.push([g.slug, 'vazio (' + s.toFixed(4) + ')']); continue; }
  keep.push(g);
}
fs.writeFileSync(new URL('./keep.json', import.meta.url), JSON.stringify(keep.map((k) => k.slug), null, 1));
const toTitle = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').replace(/^ASCII /, 'ASCII ').replace('C R T', 'CRT');
const kebab = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
const PATHS = { Backgrounds: 'backgrounds', Animations: 'animations', Components: 'components', Micro: 'micro', TextAnimations: 'text-animations' };
const items = keep.map((g) => ({ slug: g.slug, name: toTitle(g.name), cat: META[g.key][0], desc: META[g.key][1], src: 'rb', rbPath: `${PATHS[g.cat]}/${kebab(g.name)}` }));
fs.writeFileSync(new URL('../public/js/ui-kit/manifest-rb.js', import.meta.url), `// Pré-visualizações do React Bits (https://reactbits.dev, © David Haz, MIT + Commons Clause): só visualização, sem exportar código.\n// Gerado por ui-kit-rb/finalize.mjs.\nexport const RB = ${JSON.stringify(items, null, 1)};\n`);
console.log(`mantidos ${keep.length}, descartados ${dropped.length}`); for (const [s, why] of dropped) console.log(' -', s, why);
