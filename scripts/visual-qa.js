// Revisão visual de um HTML: node scripts/visual-qa.js site.html [pasta-das-capturas]
const fs = require('node:fs');
const QA = require('../server/lib/codemaker/visual-qa');
(async () => {
  const [file, shots] = process.argv.slice(2);
  if (!file) { console.error('Uso: visual-qa.js site.html [pasta-das-capturas]'); process.exit(2); }
  const r = await QA.inspectHtml(fs.readFileSync(file, 'utf8'), { shotsDir: shots });
  if (!r.available) { console.error('Sem navegador:', r.reason); process.exit(3); }
  r.findings.forEach((f) => console.log(`${f.severity.padEnd(7)} ${f.viewport.padEnd(8)} ${f.kind}: ${f.detail}`));
  console.log(`\n${r.findings.length} achados (${JSON.stringify(r.summary)}); críticos: ${r.critical}`);
  process.exit(r.critical ? 1 : 0);
})();
