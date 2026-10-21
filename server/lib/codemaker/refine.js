// Ciclo de refinamento visual: RENDER -> INSPECIONAR -> CORRIGIR -> VERIFICAR (até 3 ciclos). As correções são
// determinísticas e geradas pelo sistema (CSS em plan.qaCss), nunca texto escrito pela IA. Sem navegador no ambiente
// (ex.: produção serverless), devolve available:false: a inspeção não é simulada.
const QA = require('./visual-qa');

const MAX_CYCLES = 3;

// Correção determinística: troca a COR DO TEXTO que falha pelo tom (escuro ou claro) que contrasta com o fundo medido
// nos pixels atrás dele. O seletor é o caminho estrutural do elemento; a regra vai em plan.qaCss (gerada pelo sistema).
const DARK = '#141311';
const LIGHT = '#f6f2ea';
// Fundo uniforme: troca a cor do texto. Fundo movimentado (foto) ou que continuou falhando: véu escuro atrás do texto.
function contrastRules(items, known) {
  const rules = [];
  for (const item of items) {
    if (!item.path || rules.length >= 60) continue;
    const level = known.get(item.path) || 0;
    if (level >= 2) continue;
    // Escolhe o tom (escuro ou claro) que falha em MENOS pixels do fundo medido; se ainda falha em muitos e o texto é
    // pequeno, 2ª tentativa com véu escuro atrás dele. Título grande não ganha véu (vira uma caixa enorme).
    const color = (item.darkBad ?? 50) <= (item.lightBad ?? 50) ? DARK : LIGHT;
    const best = Math.min(item.darkBad ?? 50, item.lightBad ?? 50);
    const scrim = !item.big && (level === 1 || best >= 20);
    if (level === 1 && item.big) continue;
    known.set(item.path, scrim ? 2 : level + 1);
    rules.push(scrim ? { path: item.path, scrim: true } : { path: item.path, color });
  }
  return rules;
}
const cssFor = (rule) => (rule.scrim
  ? `${rule.path}{color:${LIGHT}!important;-webkit-text-fill-color:${LIGHT}!important;background:rgba(10,9,8,.74)!important;padding:.12em .45em;-webkit-box-decoration-break:clone;box-decoration-break:clone;text-shadow:none!important}`
  : `${rule.path}{color:${rule.color}!important;-webkit-text-fill-color:${rule.color}!important;text-shadow:none!important}`);

/** @param {{plan:object, parts:object, assemble:(plan:object, parts:object)=>string, inspect?:Function, onStep?:Function, shotsDir?:string}} o */
async function refineVisually({ plan, parts, assemble, inspect = QA.inspectHtml, onStep = () => {}, shotsDir }) {
  if (process.env.CM_RENDER_QA === '0') return { available: false, plan, cycles: [], reason: 'inspeção visual desligada (CM_RENDER_QA=0)' };
  if (inspect === QA.inspectHtml && !QA.available()) return { available: false, plan, cycles: [], reason: 'navegador de inspeção indisponível neste ambiente' };
  const cycles = [];
  let current = { ...plan };
  const applied = new Map();
  let report = null;
  for (let cycle = 0; cycle <= MAX_CYCLES; cycle++) {
    const t0 = Date.now();
    report = await inspect(assemble(current, parts), { shotsDir, name: `ciclo${cycle}` });
    const contrast = [];
    for (const r of report.results || []) for (const it of r.pixelContrast || []) contrast.push(it);
    const summary = { cycle, ms: Date.now() - t0, findings: report.findings.length, critico: report.critical, contraste: contrast.length, resumo: report.summary };
    cycles.push(summary);
    await onStep('inspect', summary);
    const rules = contrastRules(contrast, applied);
    const overflow = report.findings.some((f) => f.kind === 'overflow-horizontal') && !applied.has('overflow');
    if (cycle === MAX_CYCLES || (!rules.length && !overflow)) break;
    let css = current.qaCss || '';
    for (const rule of rules) { css += cssFor(rule); }
    if (overflow) { applied.set('overflow', 1); css += 'html,body{overflow-x:clip}'; }
    current = { ...current, qaCss: css };
    await onStep('refine', { cycle: cycle + 1, regras: rules.length, overflow });
  }
  const left = (report?.findings || []).filter((f) => f.severity !== 'medio');
  return { available: true, plan: current, cycles, remaining: left.map((f) => ({ severity: f.severity, viewport: f.viewport, kind: f.kind, detail: String(f.detail).slice(0, 200) })) };
}

module.exports = { refineVisually, MAX_CYCLES };
