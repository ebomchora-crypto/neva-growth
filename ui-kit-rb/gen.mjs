// Gera demos/<slug>.tsx para cada componente do React Bits em src/, a partir da tabela de ajustes em rb-config.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONF, IMGS } from './rb-config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const slugOf = (name) => 'rb-' + name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
fs.rmSync(path.join(HERE, 'demos'), { recursive: true, force: true }); fs.mkdirSync(path.join(HERE, 'demos'));
const out = [];
const KEEP = fs.existsSync(path.join(HERE, 'keep.json')) && !process.argv.includes('--all') ? new Set(JSON.parse(fs.readFileSync(path.join(HERE, 'keep.json')))) : null;
for (const cat of fs.readdirSync(path.join(HERE, 'src'))) for (const name of fs.readdirSync(path.join(HERE, 'src', cat))) {
  const key = `${cat}/${name}`; const c = CONF[key] || {};
  if (c.skip) continue;
  const file = fs.readdirSync(path.join(HERE, 'src', cat, name)).find((f) => f === `${name}.jsx`) || fs.readdirSync(path.join(HERE, 'src', cat, name)).find((f) => f.endsWith('.jsx'));
  const slug = slugOf(name);
  if (KEEP && !KEEP.has(slug)) continue;
  const dark = c.dark ?? (cat !== 'TextAnimations');
  const center = c.center ?? (cat !== 'Backgrounds');
  const body = c.body || `<Comp ${c.props || ''} />`;
  const pre = c.pre || '';
  const src = `// gerado por gen.mjs (${key})
import * as React from 'react';
import ${c.named ? `{ ${c.named} as Comp }` : 'Comp'} from '../src/${cat}/${name}/${file.replace(/\.jsx$/, '')}';
import { defineDemo, Box, Cycle, ScrollStage, type DemoProps } from '../runtime';
${c.imp || ''}
const IMGS = ${JSON.stringify(IMGS)};
const T = ['Interiores', 'Tecnologia', 'Atendimento com IA', 'Agência criativa', 'Moda e calçados', 'Beleza', 'Velas e decoração', 'Saúde e clínicas'];
const ITEMS = IMGS.map((image, i) => ({ id: i + 1, image, src: image, img: image, url: image, title: T[i], text: T[i], label: T[i], alt: T[i], subtitle: 'Referência Neva', description: 'Referência de design da Neva Growth.', link: '#', href: '#', height: [300, 420, 260, 380, 320, 280, 400, 340][i], handle: 'neva', borderColor: '#48c8f5', gradient: 'linear-gradient(145deg,#48c8f5,#091629)' }));
${pre}
function Demo({ big }: DemoProps) {
  ${c.hooks || ''}
  return (
    <Box big={big} dark={${dark}} center={${center}} zoom={${c.zoom ?? (cat === 'Micro' ? 1.6 : 1)}} drive={${c.drive ? `'${c.drive}'` : 'false'}}${c.boxClass ? ` className='${c.boxClass}'` : ''}${c.hooks && c.hooks.includes('boxRef') ? ' boxRef={boxRef}' : ''}>
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
