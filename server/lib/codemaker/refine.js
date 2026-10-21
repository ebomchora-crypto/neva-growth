// Ciclo de refinamento visual: RENDER -> INSPECIONAR -> CORRIGIR -> VERIFICAR (até 3 ciclos). As correções são
// determinísticas e geradas pelo sistema (CSS em plan.qaCss), nunca texto escrito pela IA. Sem navegador no ambiente
// (ex.: produção serverless), devolve available:false: a inspeção não é simulada.
const QA = require('./visual-qa');

const MAX_CYCLES = 3;

// Regras para texto sobre foto sem contraste: escurece a foto quando o texto é claro, clareia quando é escuro.
function contrastRules(findings, known) {
  const rules = new Map();
  for (const f of findings) {
    for (const item of f.items || []) {
      if (!item.section) continue;
      const key = `${item.section}:${item.light ? 'l' : 'd'}`;
      if (known.has(key)) continue;
      rules.set(key, { section: item.section, light: item.light });
    }
  }
  return [...rules.values()];
}

function cssFor(rule) {
  const id = String(rule.section).replace(/[^\w-]/g, '');
  const filter = rule.light ? 'brightness(.42) saturate(1.05)' : 'brightness(1.65) saturate(.85)';
  return `#${id} :is(img,video){filter:${filter}}#${id} :is(div,span)[style*="background-image"]:empty{filter:${filter}}`;
}

/** @param {{plan:object, parts:object, assemble:(plan:object, parts:object)=>string, inspect?:Function, onStep?:Function, shotsDir?:string}} o */
async function refineVisually({ plan, parts, assemble, inspect = QA.inspectHtml, onStep = () => {}, shotsDir }) {
  if (process.env.CM_RENDER_QA === '0') return { available: false, plan, cycles: [], reason: 'inspeção visual desligada (CM_RENDER_QA=0)' };
  if (inspect === QA.inspectHtml && !QA.available()) return { available: false, plan, cycles: [], reason: 'navegador de inspeção indisponível neste ambiente' };
  const cycles = [];
  let current = { ...plan };
  const applied = new Set();
  let report = null;
  for (let cycle = 0; cycle <= MAX_CYCLES; cycle++) {
    const t0 = Date.now();
    report = await inspect(assemble(current, parts), { shotsDir, name: `ciclo${cycle}` });
    const contrast = [];
    for (const r of report.results || []) if (r.pixelContrast?.length) contrast.push({ items: r.pixelContrast });
    const summary = { cycle, ms: Date.now() - t0, findings: report.findings.length, critico: report.critical, contraste: contrast.reduce((n, c) => n + c.items.length, 0), resumo: report.summary };
    cycles.push(summary);
    await onStep('inspect', summary);
    const rules = contrastRules(contrast, applied);
    const overflow = report.findings.some((f) => f.kind === 'overflow-horizontal') && !applied.has('overflow');
    if (cycle === MAX_CYCLES || (!rules.length && !overflow)) break;
    let css = current.qaCss || '';
    for (const rule of rules) { applied.add(`${rule.section}:${rule.light ? 'l' : 'd'}`); css += cssFor(rule); }
    if (overflow) { applied.add('overflow'); css += 'html,body{overflow-x:clip}'; }
    current = { ...current, qaCss: css };
    await onStep('refine', { cycle: cycle + 1, regras: rules.length, overflow });
  }
  const left = (report?.findings || []).filter((f) => f.severity !== 'medio');
  return { available: true, plan: current, cycles, remaining: left.map((f) => ({ severity: f.severity, viewport: f.viewport, kind: f.kind, detail: String(f.detail).slice(0, 200) })) };
}

module.exports = { refineVisually, MAX_CYCLES };
