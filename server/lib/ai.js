const { HttpError } = require('./http');
const config = require('./config');
// Provedor de IA: River (API compatível com OpenAI) quando RIVER_API_KEY existe; senão Anthropic (legado).
const river = () => Boolean(config.get('RIVER_API_KEY'));
const RIVER_URL = () => (config.get('RIVER_BASE_URL') || 'https://api.river.ai/v1').replace(/\/$/, '');
const RIVER_MODEL = () => config.get('RIVER_MODEL') || 'deepseek-ai/DeepSeek-V4.1-Flash';
const MODEL = () => process.env.NEVA_AI_MODEL || 'claude-sonnet-5-5';
const configured = () => river() || Boolean(process.env.ANTHROPIC_API_KEY);
const NOT_CONFIGURED = 'IA não configurada. Defina RIVER_API_KEY (e RIVER_MODEL) no servidor.';

// Níveis de esforço (mesmos textos do AI Model Selector, em português). O que cada nível muda de verdade:
// - orçamento de resposta (maxTokens);
// - etapa de análise antes de responder (alto e máximo: a IA pensa primeiro, numa chamada à parte);
// - parâmetro nativo de raciocínio do provedor, quando ele aceita (app_settings RIVER_REASONING).
const EFFORTS = {
  low: { label: 'Baixo', hint: 'Responde na hora. Melhor para ajustes rápidos e consultas.', maxTokens: 4000, extra: ' Seja enxuto e direto.', native: 'low' },
  medium: { label: 'Médio', hint: 'Pensa um pouco antes. Um bom padrão para a maioria dos trabalhos.', maxTokens: 8000, extra: '', native: 'medium' },
  high: { label: 'Alto', hint: 'Pensa mais em problemas difíceis. Mais lento, usa mais tokens.', maxTokens: 12000, extra: ' Analise com mais profundidade antes de responder.', native: 'high' },
  xhigh: { label: 'Máximo', hint: 'Sem economia de raciocínio. Só para as tarefas mais difíceis.', maxTokens: 16000, extra: ' Analise com a máxima profundidade e cubra todos os casos relevantes.', native: 'high' }
};
// Nomes públicos Neva 1.0/1.2/1.5: o navegador só conhece estes ids; o modelo real fica no servidor.
// Na River, cada um pode apontar para um modelo diferente (app_settings NEVA_MODEL_MAP); sem mapa, todos usam RIVER_MODEL.
const MODELS = [
  { id: 'neva-1-0', api: 'claude-haiku-5-5', name: 'Neva 1.0', description: 'O mais rápido, para respostas curtas', efforts: ['low', 'medium'], defaultEffort: 'low', temperature: 0.4 },
  { id: 'neva-1-2', api: 'claude-sonnet-5-5', name: 'Neva 1.2', description: 'Rápido e capaz no dia a dia', efforts: ['low', 'medium', 'high'], defaultEffort: 'medium', temperature: 0.6 },
  { id: 'neva-1-5', api: 'claude-opus-5-5', name: 'Neva 1.5', description: 'O mais capaz, para trabalho complexo', efforts: ['low', 'medium', 'high', 'xhigh'], defaultEffort: 'high', temperature: 0.7 }
];
const DEFAULT_ID = () => (MODELS.find((m) => m.api === MODEL()) || MODELS[1]).id;
/** Id público → id público válido (qualquer valor desconhecido cai no padrão). */
const resolveModel = (id) => (MODELS.find((m) => m.id === id) || MODELS.find((m) => m.id === DEFAULT_ID())).id;
const apiModel = (id) => MODELS.find((m) => m.id === id)?.api || MODEL();
/** Esforço válido para o modelo (se o nível não existir nele, cai para o padrão do modelo). */
function resolveEffort(modelId, effort) {
  const m = MODELS.find((x) => x.id === modelId);
  if (m && m.efforts.includes(effort)) return effort;
  return effort in EFFORTS && !m ? effort : (m?.defaultEffort || 'medium');
}
const publicModels = () => MODELS.map(({ api, temperature, ...m }) => ({ ...m, efforts: m.efforts.map((k) => ({ id: k, label: EFFORTS[k].label, hint: EFFORTS[k].hint })) }));
/** Seleção pedida pelo navegador (ou a guardada) → { model, effort } válidos. */
function selection(input = {}, fallback = {}) {
  const model = resolveModel(input?.model || fallback?.model);
  return { model, effort: resolveEffort(model, input?.effort || fallback?.effort) };
}

/** Modelo real da River para o nome público (NEVA_MODEL_MAP em JSON; senão RIVER_MODEL). */
function providerModelFor(id) {
  try {
    const map = JSON.parse(config.get('NEVA_MODEL_MAP') || '{}');
    const name = map && map[resolveModel(id)];
    if (typeof name === 'string' && name.trim()) return name.trim();
  } catch { /* mapa inválido: usa o padrão */ }
  return RIVER_MODEL();
}
const temperatureOf = (id) => MODELS.find((m) => m.id === resolveModel(id))?.temperature ?? 0.6;

// Parâmetro nativo de raciocínio (só vai se configurado e se a River não recusou antes nesta instância).
let nativeRefused = false;
// Medido na River (sonda /api/qa/ai-probe, out/2026): no DeepSeek o parâmetro só liga/desliga o raciocínio
// ("medium" desliga e "low" ≈ "high"); no GLM e no Nemotron ele regula a profundidade. Por isso a escada muda por família.
const DEEPSEEK_LEVELS = { low: null, medium: 'low', high: 'high', xhigh: 'high' };
function reasoningParams(effort, providerModel = '') {
  const kind = config.get('RIVER_REASONING');
  if (!kind || nativeRefused || !EFFORTS[effort]) return {};
  const level = /deepseek/i.test(providerModel) ? DEEPSEEK_LEVELS[effort] : EFFORTS[effort].native;
  if (!level) return {};
  if (kind === 'reasoning_effort') return { reasoning_effort: level };
  if (kind === 'reasoning') return { reasoning: { effort: level } };
  if (kind === 'thinking') return effort === 'low' ? { thinking: { type: 'disabled' } } : { thinking: { type: 'enabled' } };
  return {};
}
const markRefused = () => { nativeRefused = true; };
const hasNative = (body) => ['reasoning_effort', 'reasoning', 'thinking'].some((k) => k in body);
const withoutNative = ({ reasoning_effort, reasoning, thinking, ...rest }) => rest;

// Registro de cada chamada (tempo, tokens, modelo e esforço) — base das medições dos testes.
async function logCall(entry) {
  try {
    const { run } = require('./db');
    const u = entry.usage || {};
    await run('INSERT INTO ai_calls(user_id,kind,model,effort,provider_model,ms,prompt_tokens,completion_tokens,reasoning_tokens,ok,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      entry.userId ?? null, String(entry.kind || 'chat').slice(0, 40), entry.model ?? null, entry.effort ?? null, entry.providerModel ?? null, Math.round(entry.ms || 0),
      u.prompt_tokens ?? null, u.completion_tokens ?? null, u.completion_tokens_details?.reasoning_tokens ?? entry.reasoningTokens ?? null, entry.ok === false ? 0 : 1, entry.note ? String(entry.note).slice(0, 300) : null);
  } catch { /* tabela ainda não migrada: não atrapalha a resposta */ }
}

const asText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((b) => b?.text || '').join('') : String(c ?? ''));

async function completeRiver({ system, messages, maxTokens, model, effort, kind, userId }) {
  const started = Date.now();
  let body = { model: providerModelFor(model), max_tokens: maxTokens, temperature: temperatureOf(model), ...reasoningParams(effort, providerModelFor(model)),
    messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: asText(m.content) }))] };
  let resp, data;
  for (let attempt = 0; attempt < 4; attempt++) {
    resp = await fetch(`${RIVER_URL()}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.get('RIVER_API_KEY')}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(170000) });
    data = await resp.json().catch(() => ({}));
    // A River recusou o parâmetro de raciocínio: tira e tenta de novo (e não manda mais nesta instância).
    if (resp.status === 400 && hasNative(body)) { markRefused(); body = withoutNative(body); continue; }
    if (![429, 500, 502, 503, 504].includes(resp.status)) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  const ms = Date.now() - started;
  if (!resp.ok) {
    logCall({ kind, userId, model, effort, providerModel: body.model, ms, ok: false, note: `HTTP ${resp.status}` });
    throw new HttpError(502, `Falha na API de IA: ${data?.error?.message || data?.message || resp.status}`, 'ai_upstream');
  }
  const choice = data.choices?.[0];
  const text = asText(choice?.message?.content).trim();
  const reasoningText = asText(choice?.message?.reasoning_content || choice?.message?.reasoning || '');
  logCall({ kind, userId, model, effort, providerModel: body.model, ms, usage: data.usage, reasoningTokens: reasoningText ? Math.round(reasoningText.length / 4) : null, ok: Boolean(text) });
  if (!text) throw new HttpError(502, choice?.finish_reason === 'length' ? 'A IA atingiu o limite de tamanho antes de responder. Tente um esforço maior ou um pedido menor.' : 'A IA não retornou texto. Tente novamente.', 'ai_empty');
  return text;
}

// Raciocínio de verdade: nos níveis alto e máximo a IA primeiro analisa o pedido (rascunho interno, nunca mostrado) e só depois responde usando essa análise.
// Baixo e médio respondem direto. O orçamento de análise cresce com o nível.
const THINK = {
  high: { tokens: 1500, ask: 'Antes de responder, analise o pedido por dentro: o que o usuário realmente quer, o que o contexto já tem, os passos na ordem certa e os erros mais prováveis. Escreva só essa análise, em tópicos curtos, sem a resposta final.' },
  xhigh: { tokens: 3000, ask: 'Antes de responder, analise o pedido a fundo por dentro: objetivo real, restrições, alternativas e por que escolher uma, passos na ordem certa, casos de borda e riscos. Depois critique a própria análise e corrija o que estiver fraco. Escreva só essa análise, em tópicos, sem a resposta final.' }
};
async function think({ system, messages, effort, model, kind, userId }) {
  const cfg = THINK[effort]; if (!cfg) return '';
  try {
    const notes = await complete({ model, effort, maxTokens: cfg.tokens, system: `${system || ''}\n\n${cfg.ask}`, messages, noThink: true, kind: `${kind || 'chat'}:analise`, userId });
    return notes.slice(0, 9000);
  } catch { return ''; } // sem a análise o pedido ainda é respondido normalmente
}
async function answer({ system, messages, maxTokens, model, effort, kind, userId }) {
  const notes = await think({ system, messages, effort, model, kind, userId });
  const sys = notes ? `${system || ''}\n\nSua análise interna deste pedido (use para acertar; não a repita nem mencione):\n${notes}` : system;
  return complete({ system: sys, messages, maxTokens, model, effort, noThink: true, kind, userId });
}

async function complete({ system, messages, maxTokens = 4096, model, effort, noThink, kind, userId }) {
  if (effort && !noThink && THINK[effort]) return answer({ system, messages, maxTokens, model, effort, kind, userId });
  if (!configured()) throw new HttpError(503, NOT_CONFIGURED, 'ai_not_configured');
  if (river()) return completeRiver({ system, messages, maxTokens, model, effort, kind, userId });
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: apiModel(resolveModel(model)), max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(120000)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new HttpError(502, `Falha na API de IA: ${data?.error?.message || resp.status}`, 'ai_upstream');
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}
module.exports = { complete, think, THINK, configured, NOT_CONFIGURED, providerModel: () => (river() ? RIVER_MODEL() : MODEL()), providerModelFor, temperatureOf, reasoningParams, markRefused, hasNative, withoutNative,
  logCall, MODEL, EFFORTS, MODELS, resolveModel, apiModel, DEFAULT_ID, resolveEffort, publicModels, selection, RIVER_URL };
