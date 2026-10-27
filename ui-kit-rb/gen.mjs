// Gera demos/<slug>.tsx para cada componente do React Bits em src/, a partir da tabela de ajustes em rb-config.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONF, IMGS } from './rb-config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const slugOf = (name) => 'rb-' + name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
fs.rmSync(path.join(HERE, 'demos'), { recursive: true, force: true }); fs.mkdirSync(path.join(HERE, 'demos'));
const out = [];
for (const cat of fs.readdirSync(path.join(HERE, 'src'))) for (const name of fs.readdirSync(path.join(HERE, 'src', cat))) {
  const key = `${cat}/${name}`; const c = CONF[key] || {};
  if (c.skip) continue;
  const file = fs.readdirSync(path.join(HERE, 'src', cat, name)).find((f) => f === `${name}.jsx`) || fs.readdirSync(path.join(HERE, 'src', cat, name)).find((f) => f.endsWith('.jsx'));
  const slug = slugOf(name);
  const dark = c.dark ?? (cat === 'Backgrounds');
  const body = c.body || `<Comp ${c.props || ''} />`;
  const pre = c.pre || '';
  const src = `// gerado por gen.mjs (${key})
import * as React from 'react';
import Comp from '../src/${cat}/${name}/${file.replace(/\.jsx$/, '')}';
import { defineDemo, Box } from '../runtime';
const IMGS = ${JSON.stringify(IMGS)};
${pre}
function Demo() {
  return (
    <Box dark={${dark}}${c.boxClass ? ` className='${c.boxClass}'` : ''}>
      ${body}
    </Box>
  );
}
export default defineDemo(Demo);
`;
  fs.writeFileSync(path.join(HERE, 'demos', `${slug}.tsx`), src);
  out.push({ slug, name, cat, key });
}
fs.writeFileSync(path.join(HERE, '.generated.json'), JSON.stringify(out, null, 1));
console.log(out.length, 'demos');
