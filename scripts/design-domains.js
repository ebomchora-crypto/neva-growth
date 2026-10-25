// Lê scripts/design-domains-*.txt ("Título => domínio" ou "Título ~ início do resumo => domínio") e liga cada linha aos itens do catálogo.
const fs = require('node:fs');
const path = require('node:path');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
const baseTitle = (t) => String(t || '').replace(/\s*\(arquivo \d+\)\s*$/i, '');

function loadMap() {
  const map = new Map(); // chave do título -> [{ prefix, domain }]
  for (const f of fs.readdirSync(__dirname).filter((x) => /^design-domains-\d+\.txt$/.test(x)).sort()) {
    for (const line of fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const i = line.lastIndexOf(' => '); if (i < 0) continue;
      const left = line.slice(0, i).trim(); const domain = line.slice(i + 4).trim().toLowerCase();
      const [title, prefix] = left.split(' ~ ').map((x) => x.trim());
      const k = norm(title); if (!map.has(k)) map.set(k, []); map.get(k).push({ prefix: prefix ? norm(prefix) : null, domain });
    }
  }
  return map;
}
/** Domínio do item do catálogo, ou null. Itens de mesmo nome se distinguem pelo começo do resumo. */
function domainOf(map, item) {
  const list = map.get(norm(baseTitle(item.title))); if (!list) return null;
  if (list.length === 1 && !list[0].prefix) return list[0].domain;
  const sum = norm(item.summary);
  return (list.find((x) => x.prefix && sum.startsWith(x.prefix)) || list.find((x) => x.prefix && sum.includes(x.prefix)) || list.find((x) => !x.prefix))?.domain || null;
}
module.exports = { loadMap, domainOf, norm };
