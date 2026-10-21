// Telemetria do Builder: cada chamada de IA (ai_calls: site, etapa, modelo, tokens, motivo de encerramento) e cada etapa que
// não é IA (build_events: referências, assets, validação, renderização, inspeção, refinamento, conclusão) viram uma linha do tempo
// por site. Nunca grava prompts, respostas, chaves nem dados do cliente: só nomes de etapa, tempos, contagens e motivos.
const { all, run } = require('./db');
const config = require('./config');

const STAGE_OF_KIND = [[/^cm_spec/, 'brief'], [/^cm_plan/, 'direction'], [/^cm_part|^cm_review/, 'code'], [/^cm_visual/, 'inspect'], [/^cm_refine/, 'refine'], [/^cm_edit/, 'edit']];
const stageOfKind = (kind = '') => STAGE_OF_KIND.find(([re]) => re.test(kind))?.[1] || 'other';

// USD por 1 milhão de tokens [entrada, saída]. Preços públicos da River (console.river.ai/api/public/pricing, consultados em 2026-10);
// provedores sem preço informado ficam fora e o custo aparece como null. AI_PRICING_JSON (app_settings) sobrescreve/estende.
const DEFAULT_PRICES = {
  'deepseek-ai/DeepSeek-V4.1-Flash': [0.12, 0.48], 'deepseek-ai/DeepSeek-V4.1-Flash-1017': [0.12, 0.48],
  'nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-NVFP4': [0.07, 0.37], 'zai-org/GLM-5.3-Flash': [0.12, 0.4], 'deepseek-ai/DeepSeek-V4-Flash-0731': [0.12, 0.48],
};
function prices() { try { return { ...DEFAULT_PRICES, ...JSON.parse(config.get('AI_PRICING_JSON') || '{}') }; } catch { return DEFAULT_PRICES; } }
function costOf(call, table = prices()) {
  const p = table[call.provider_model];
  if (!p || call.prompt_tokens == null || call.completion_tokens == null) return null;
  return (call.prompt_tokens * p[0] + call.completion_tokens * p[1]) / 1e6;
}


const STAGES = [
  ['brief', 'Analisando o briefing'],
  ['references', 'Buscando referências do ramo'],
  ['direction', 'Definindo a direção de arte'],
  ['code', 'Escrevendo as seções'],
  ['assets', 'Escolhendo fotos sem repetição'],
  ['inspect', 'Inspecionando celular, tablet e desktop e corrigindo a legibilidade'],
  ['publish', 'Site pronto'],
];

/** Progresso de criação derivado do que foi GRAVADO (chamadas de IA, eventos de etapa, plano, seções): sobrevive a
 *  recarregar a página e não depende de quem está olhando. Sem porcentagem inventada: cada etapa é feita, em andamento,
 *  pendente, pulada (com o motivo) ou com erro. */
async function progress(site, partIds = []) {
  const calls = await all('SELECT kind, ms, ok, created_at FROM ai_calls WHERE site_id=? ORDER BY id', site.id);
  const events = await all('SELECT stage, status, ms, detail FROM build_events WHERE site_id=? ORDER BY id', site.id);
  const ev = (stage) => events.filter((e) => e.stage === stage);
  const detailOf = (e) => { try { return e?.detail ? JSON.parse(e.detail) : null; } catch { return null; } };
  const sum = (list) => list.reduce((n, x) => n + (x.ms || 0), 0) || null;
  const callsOf = (re) => calls.filter((c) => re.test(c.kind || ''));
  const total = partIds.length;
  const doneParts = partIds.filter((id) => typeof site.parts?.[id] === 'string' ? site.parts[id].trim() : site.parts?.[id]).length;
  const ready = site.status === 'ready';
  const inspectEvents = [...ev('inspect'), ...ev('refine'), ...ev('verify')];
  const skipped = ev('inspect').find((e) => e.status === 'skipped');
  const verify = ev('verify')[0];
  const refineCycles = ev('refine').length;
  const state = {
    brief: { done: callsOf(/^cm_spec/).some((c) => c.ok) || Boolean(site.plan), ms: sum(callsOf(/^cm_spec/)) },
    references: { done: ev('references').length > 0 || Boolean(site.plan), ms: sum(ev('references')), detail: detailOf(ev('references')[0]) },
    direction: { done: Boolean(site.plan), ms: sum(callsOf(/^cm_plan/)) },
    code: { done: Boolean(site.plan) && total > 0 && doneParts >= total, ms: sum(callsOf(/^cm_part|^cm_review/)), detail: { feitas: doneParts, total } },
    assets: { done: ev('assets').length > 0 || ready, ms: sum(ev('assets')), detail: detailOf(ev('assets')[0]) },
    inspect: { done: Boolean(verify) || Boolean(skipped) || ready, ms: sum(inspectEvents), skipped: Boolean(skipped) && !verify, detail: skipped ? { motivo: detailOf(skipped)?.motivo || 'indisponível neste ambiente' } : { ciclos: refineCycles, pendencias: detailOf(verify)?.pendencias?.length ?? null } },
    publish: { done: ready, ms: null },
  };
  const failed = site.status === 'error';
  const working = ['planning', 'building'].includes(site.status);
  let current = null;
  const stages = STAGES.map(([key, label]) => {
    const s = state[key];
    let status = s.done ? (s.skipped ? 'skipped' : 'done') : 'pending';
    if (!s.done && current === null) { current = key; status = failed ? 'error' : working ? 'running' : 'pending'; }
    return { key, label, status, ms: s.ms ?? null, detail: s.detail ?? null };
  });
  return { site: site.id, status: site.status, current: ready ? null : current, stages, parts: { done: doneParts, total }, finished: ready };
}

/** Registra uma etapa que não é IA. `detail` só com números e rótulos curtos. */
async function event(siteId, userId, stage, { status = 'done', ms = null, detail = null } = {}) {
  try {
    await run('INSERT INTO build_events(site_id,user_id,stage,status,ms,detail) VALUES (?,?,?,?,?,?)', siteId, userId ?? null, String(stage).slice(0, 30), String(status).slice(0, 20), ms == null ? null : Math.round(ms), detail == null ? null : JSON.stringify(detail).slice(0, 1500));
  } catch { /* tabela ainda não migrada */ }
}
/** Mede e registra um trecho de trabalho. */
async function timed(siteId, userId, stage, fn, describe) {
  const t0 = Date.now();
  try { const out = await fn(); await event(siteId, userId, stage, { ms: Date.now() - t0, detail: describe ? describe(out) : null }); return out; }
  catch (error) { await event(siteId, userId, stage, { status: 'error', ms: Date.now() - t0, detail: { erro: String(error?.message || error).slice(0, 160) } }); throw error; }
}

async function timeline(siteId) {
  const calls = await all('SELECT id, kind, stage, model, effort, provider_model, ms, prompt_tokens, completion_tokens, reasoning_tokens, finish_reason, ok, note, created_at FROM ai_calls WHERE site_id=? ORDER BY id', siteId);
  const events = await all('SELECT id, stage, status, ms, detail, created_at FROM build_events WHERE site_id=? ORDER BY id', siteId);
  const table = prices(); const byStage = {};
  const add = (stage, key, v) => { const s = (byStage[stage] ||= { calls: 0, aiMs: 0, workMs: 0, tokensIn: 0, tokensOut: 0, errors: 0 }); s[key] += v || 0; };
  let cost = 0, costKnown = true, unmetered = 0;
  for (const c of calls) {
    const stage = c.stage || stageOfKind(c.kind); c.stage = stage; c.cost_usd = costOf(c, table);
    add(stage, 'calls', 1); add(stage, 'aiMs', c.ms); add(stage, 'tokensIn', c.prompt_tokens); add(stage, 'tokensOut', c.completion_tokens); if (!c.ok) add(stage, 'errors', 1);
    if (c.cost_usd == null && c.prompt_tokens == null && c.completion_tokens == null) unmetered += 1; // chamada sem uso informado (falha/timeout)
    else if (c.cost_usd == null) costKnown = false; else cost += c.cost_usd;
  }
  for (const e of events) { try { e.detail = e.detail ? JSON.parse(e.detail) : null; } catch { /* mantém texto */ } add(e.stage, 'workMs', e.ms); if (e.status === 'error') add(e.stage, 'errors', 1); }
  const times = [...calls, ...events].map((x) => Date.parse(String(x.created_at).replace(' ', 'T') + 'Z')).filter(Number.isFinite);
  const refine = events.filter((e) => e.stage === 'refine').length;
  return {
    site: siteId, calls, events, byStage,
    totals: { calls: calls.length, tokensIn: calls.reduce((n, c) => n + (c.prompt_tokens || 0), 0), tokensOut: calls.reduce((n, c) => n + (c.completion_tokens || 0), 0), aiMs: calls.reduce((n, c) => n + (c.ms || 0), 0),
      wallMs: times.length > 1 ? Math.max(...times) - Math.min(...times) : null, costUsd: costKnown && calls.length ? Math.round(cost * 1e5) / 1e5 : null, costNote: !costKnown ? 'preço do provedor/modelo não informado' : unmetered ? `${unmetered} chamada(s) sem uso informado (falha/timeout) fora do custo` : null, refineCycles: refine, truncated: calls.filter((c) => c.finish_reason === 'length').length },
  };
}

module.exports = { event, timed, timeline, progress, costOf, stageOfKind, prices };
