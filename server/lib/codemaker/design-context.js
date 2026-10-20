// Seleciona, por etapa e por ramo, o que do SYSTEM_PROMPT e do DESIGN.md (V2) chega ao modelo.
// DESIGN.md §30: "uma arquivo longo é base de conhecimento, não substitui chamadas": aqui entram só as seções que
// a etapa usa; o rastro do que foi enviado (`used`) é guardado no design-spec do site.
const { IDENTITY, IDENTITY_ORDER, DESIGN } = require('./design-md');

const strip = (t) => t.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Ramo → direções do §21, receita do §33–35 e exemplo do §18–20.
const SECTORS = [
  { id: 'juridico', re: /advoc|jurid|direito|contab|consultor|escritorio/, dirs: ['21.1', '21.3'], recipe: '33', example: '19' },
  { id: 'energia', re: /solar|fotovolt|energia|eletric|engenharia/, dirs: ['21.7', '21.3'], recipe: '34', example: '18' },
  { id: 'saas', re: /\bia\b|inteligencia artificial|software|saas|startup|plataforma|automa[cç]ao|aplicativo|\bapp\b|desenvolv/, dirs: ['21.6', '21.3'], recipe: '35', example: '20' },
  { id: 'imobiliaria', re: /imobil|imove|arquitet|interiore|constru|reforma/, dirs: ['21.7', '21.1'] },
  { id: 'saude', re: /clinic|saude|estetic|odont|psicolog|terapia|nutri|fisio|bem-estar|spa\b/, dirs: ['21.5', '21.1'] },
  { id: 'comida', re: /restaurante|pizz|hambur|cafe|confeit|padar|gastronom|bar\b|doceria|lanchon/, dirs: ['21.5', '21.8'] },
  { id: 'loja', re: /loja|e-?commerce|moda|vestu|boutique|joalher|produtos/, dirs: ['21.8', '21.1'] },
  { id: 'auto', re: /carro|automotiv|oficina|moto|veicul|lava jato/, dirs: ['21.4', '21.3'] },
  { id: 'criativo', re: /estudio|fotograf|musica|evento|\bcultura|banda|festa|casamento/, dirs: ['21.2', '21.4'] },
];
function sectorOf(brief = {}) {
  const text = norm(`${brief.niche || ''} ${brief.businessName || ''} ${(brief.details || '').slice(0, 500)}`);
  return SECTORS.find((s) => s.re.test(text)) || { id: 'geral', dirs: ['21.1', '21.3'] };
}

const block = (...keys) => keys.filter((k) => DESIGN[k]).map((k) => `## ${DESIGN[k].title}\n${strip(DESIGN[k].text)}`).join('\n\n');
const ident = (...titles) => titles.filter((t) => IDENTITY[t]).map((t) => `# ${t}\n${IDENTITY[t]}`).join('\n\n');

const PLAN_KEYS = ['0', '2', '3', '4', '5', '16', '22', '23.2', '23.3', '23.4', '23.5', '25.2', '29', '31', '32'];
const PART_KEYS = ['0', '9', '23.4', '16'];
const EDIT_KEYS = ['0', '9', '15', '10'];

/** Texto de system prompt da etapa (identidade + seções do DESIGN.md) e o rastro do que foi incluído. */
function contextFor(stage, brief) {
  const sector = sectorOf(brief);
  let identity; let keys;
  if (stage === 'plan') {
    identity = IDENTITY_ORDER.map((t) => `# ${t}\n${IDENTITY[t]}`).join('\n\n');
    keys = [...PLAN_KEYS, ...sector.dirs, ...[sector.recipe, sector.example].filter(Boolean)];
  } else if (stage === 'part') {
    identity = ident('INSTRUCTION HIERARCHY AND TRUST', 'ANTI-GENERIC VISUAL RULES', 'COMPOSITION / TYPOGRAPHY / CONTENT DIRECTION', 'FUNCTIONALITY, LEGAL CLAIMS AND INTEGRITY');
    keys = [...PART_KEYS];
  } else {
    identity = ident('INSTRUCTION HIERARCHY AND TRUST', 'ANTI-GENERIC VISUAL RULES', 'FUNCTIONALITY, LEGAL CLAIMS AND INTEGRITY');
    keys = [...EDIT_KEYS];
  }
  const text = `SYSTEM PROMPT — NEVA BUILDER (V2)\n\n${identity}\n\n=== DESIGN.md (seções desta etapa) ===\n\n${block(...keys)}`;
  return { text, used: { stage, sector: sector.id, identity: stage === 'plan' ? IDENTITY_ORDER.length : 'subset', sections: [...new Set(keys)].filter((k) => DESIGN[k]), chars: text.length } };
}

/** design-spec.json V2 (DESIGN.md §29), montado a partir do plano e do rastro; o que não foi executado fica "not_run"/"not_verified". */
function designSpec(plan, brief = {}) {
  const trace = brief.designTrace || null;
  const phone = brief.phone || plan.business?.phone || null;
  return {
    schemaVersion: '2.0',
    generatedAt: new Date().toISOString(),
    project: { name: brief.businessName || plan.business?.name || null, industry: sectorOf(brief).id, type: 'landing-page', locale: plan.lang || 'pt-BR', primaryConversion: phone ? 'whatsapp' : 'contact', brandAssetsStatus: brief.assets?.length ? 'partial' : 'none' },
    creative: plan.creative || null,
    content: {
      knownFacts: [brief.businessName && 'nome do negócio', brief.city && 'cidade', phone && 'WhatsApp', brief.details && 'pedido do cliente'].filter(Boolean),
      missingFacts: [...new Set((plan.sections || []).filter((x) => x.proofStatus && x.proofStatus !== 'supplied').map((x) => `prova em "${x.label}" (${x.proofStatus})`))],
      claimVerificationPolicy: 'sem evidência no pedido: omitir ou marcar como placeholder',
    },
    designSystem: { theme: plan.theme, colors: plan.palette, typography: plan.fonts, radius: plan.radius || 'round', composition: plan.composition || null, look: plan.look || null },
    referenceSelectionLog: trace
      ? { retrievalStatus: trace.selected?.length ? 'available' : 'coverage_missing', selected: trace.selected || [], rejected: trace.discarded || [], inspected: trace.inspected || [], failures: trace.failures || [], inspection: trace.inspection }
      : { retrievalStatus: 'unavailable', selected: [], rejected: [], observations: [] },
    designContextUsed: brief.designUsed || null,
    sections: (plan.sections || []).map((x) => ({ id: x.id, businessPurpose: x.businessPurpose || null, singleMessage: x.singleMessage || null, layoutFamily: x.layout || null, proofStatus: x.proofStatus || 'none', bg: x.bg })),
    motionPlan: { tier: (plan.effects || []).length ? 1 : 0, library: 'css', effects: plan.effects || [], reducedMotion: 'conteúdo completo e ações funcionando sem animação' },
    integrations: [{ name: 'whatsapp', status: phone ? 'configured' : 'pending', requiredAction: phone ? null : 'informar o número do WhatsApp' }],
    testPlan: { viewports: [375, 768, 1440], interactionCases: ['navigation', 'cta'] },
    qa: { build: 'not_run', runtime: 'not_checked', visualReview: 'not_verified', openIssues: [] },
  };
}

module.exports = { contextFor, sectorOf, designSpec, SECTORS };
