// Cadastra uma referência de design REAL: confirma que a URL responde, renderiza num navegador, mede a primeira tela
// e grava em docs/referencias-verificadas.json (que o servidor carrega na partida). URL que não responde é recusada;
// nada é descrito à mão: o texto do item vem das medidas.
// Uso: CM_REF_BROWSER=1 node scripts/add-reference.js <url> --title "Nome" --niche "Advocacia" [--style "Editorial sóbrio"] [--type Institucional]
process.env.CM_REF_BROWSER = '1';
const fs = require('node:fs');
const path = require('node:path');
const R = require('../server/lib/codemaker/references');
const QA = require('../server/lib/codemaker/visual-qa');
const FILE = path.join(__dirname, '..', 'docs', 'referencias-verificadas.json');
const [url, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : null; };
(async () => {
  if (!url || !opt('title') || !opt('niche')) { console.error('Uso: add-reference.js <url> --title T --niche N [--style S] [--type X]'); process.exit(2); }
  if (!QA.available()) { console.error('Sem navegador: defina CM_BROWSER ou instale o Chromium.'); process.exit(3); }
  const f = await R.inspect(url);
  if (!f.ok) { console.error(`RECUSADA (${url}): ${f.error}`); process.exit(4); }
  const v = f.visual;
  if (!v || v.error) { console.error(`RECUSADA (${url}): não foi possível renderizar (${v?.error || 'sem medida'})`); process.exit(5); }
  if (!v.h1) { console.error(`RECUSADA (${url}): título principal não encontrado; medida incompleta`); process.exit(7); }
  const list = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [];
  if (list.some((x) => x.url === url || x.title === opt('title'))) { console.error('Já cadastrada.'); process.exit(6); }
  list.push({ title: opt('title'), url, niche: opt('niche'), style: opt('style') || `Institucional ${v.theme}`, site_type: opt('type') || 'Institucional', verifiedAt: new Date().toISOString(), measured: { colors: f.colors, fonts: f.fonts, ...v, shot: undefined } });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n');
  console.log(`OK ${opt('title')}: tema ${v.theme}, título ${v.h1?.px}px ${v.h1?.font}, mídia ${Math.round(v.mediaShare * 100)}%`);
})();
