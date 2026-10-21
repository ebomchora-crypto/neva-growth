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

// Catálogo da River liberado para a chave (GET /models), em cache por 1 h. Vários modelos da River são liberados por conta.
let modelsCache = { at: 0, ids: null };
async function availableModels() {
  if (!river()) return null;
  if (modelsCache.ids && Date.now() - modelsCache.at < 3600e3) return modelsCache.ids;
  try {
    const resp = await fetch(`${RIVER_URL()}/models`, { headers: { authorization: `Bearer ${config.get('RIVER_API_KEY')}` }, signal: AbortSignal.timeout(8000) });
    const data = await resp.json().catch(() => ({}));
    const ids = Array.isArray(data?.data) ? data.data.map((m) => m?.id).filter(Boolean) : null;
    modelsCache = { at: Date.now(), ids };
    return ids;
  } catch { return modelsCache.ids; }
}
// Ordem de preferência para ESCREVER CÓDIGO (modelos maiores primeiro). Só vale o que a chave realmente tem.
const CODE_PREFERENCE = ['nvidia/Kimi-K2.6-NVFP4-262K', 'nvidia/Kimi-K2.6-NVFP4', 'nvidia/GLM-5.2-NVFP4-262K', 'nvidia/GLM-5.2-NVFP4', 'Qwen/Qwen3.5-397B-A17B-FP8', 'deepseek-ai/DeepSeek-V4.1-Flash-1017', 'XiaomiMiMo/MiMo-V2.6-Pro-RL'];
const chooseCodeModel = (available) => (Array.isArray(available) ? CODE_PREFERENCE.find((id) => available.includes(id)) || null : null);
// Chamada mínima de teste: só usa um modelo novo se ele realmente responde nesta chave (cache de 1 h; falha vale 10 min).
const probeCache = new Map();
async function modelWorks(id) {
  const hit = probeCache.get(id);
  if (hit && Date.now() - hit.at < (hit.ok ? 3600e3 : 600e3)) return hit.ok;
  let ok = false;
  try {
    const resp = await fetch(`${RIVER_URL()}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.get('RIVER_API_KEY')}` },
      body: JSON.stringify({ model: id, max_tokens: 64, messages: [{ role: 'user', content: 'Responda apenas: ok' }] }), signal: AbortSignal.timeout(20000) });
    const data = await resp.json().catch(() => ({}));
    ok = resp.ok && Boolean(data?.choices?.[0]?.message);
  } catch { ok = false; }
  probeCache.set(id, { ok, at: Date.now() });
  return ok;
}
/** Modelo que escreve as seções livres: NEVA_CODE_MODEL (ou 'off'), senão o melhor da lista liberado e que responde, senão null (usa o do nível). */
async function pickCodeModel() {
  const set = String(config.get('NEVA_CODE_MODEL') || '').trim();
  if (set.toLowerCase() === 'off') return null;
  if (set) return set;
  const available = await availableModels();
  if (!Array.isArray(available)) return null;
  for (const id of CODE_PREFERENCE.filter((m) => available.includes(m)).slice(0, 3)) if (await modelWorks(id)) return id;
  return null;
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
// No Nemotron "low" não reduz nada (medido: 1.165 tokens pensando, mais que sem parâmetro); "none" desliga de verdade (0 tokens, 3× mais rápido).
// No GLM não dá para desligar ("none" volta 400); "low" é o mínimo (~50 tokens).
const DEEPSEEK_LEVELS = { low: null, medium: 'low', high: 'high', xhigh: 'high' };
const NEMOTRON_LEVELS = { low: 'none', medium: 'low', high: 'medium', xhigh: 'high' };
const family = (providerModel = '') => (/deepseek/i.test(providerModel) ? 'deepseek' : /nemotron/i.test(providerModel) ? 'nemotron' : 'other');
function reasoningParams(effort, providerModel = '') {
  const kind = config.get('RIVER_REASONING');
  if (!kind || nativeRefused || !EFFORTS[effort]) return {};
  const fam = family(providerModel);
  const level = fam === 'deepseek' ? DEEPSEEK_LEVELS[effort] : fam === 'nemotron' ? NEMOTRON_LEVELS[effort] : EFFORTS[effort].native;
  if (!level) return {};
  if (kind === 'reasoning_effort') return { reasoning_effort: level };
  if (kind === 'reasoning') return { reasoning: { effort: level } };
  if (kind === 'thinking') return effort === 'low' ? { thinking: { type: 'disabled' } } : { thinking: { type: 'enabled' } };
  return {};
}
// O raciocínio nativo conta no max_tokens: sem folga, ele come a resposta (medido: plano do DeepSeek com 8.319 de 9.000 tokens só pensando).
const HEADROOM = { low: 4000, medium: 8000, high: 12000, xhigh: 16000 };
const withHeadroom = (maxTokens, effort, params) => (params && Object.keys(params).length ? maxTokens + (HEADROOM[effort] || 0) : maxTokens);
// Escrita longa e com formato (plano, seções e alterações do site) sai com o mínimo de raciocínio nativo:
// medido em produção, GLM e Nemotron gastavam os 9.000 tokens do plano só pensando e não escreviam nada.
// O "pensar" fica na etapa de análise (chamada própria, com a escada completa).
// Também vale para a análise: ela é escrita em texto (orçamento próprio por nível), não escondida no raciocínio nativo,
// que no prompt grande do site não respeita limite (medido: DeepSeek e GLM gastaram 8.900 de 8.900 tokens e não escreveram a análise).
function streamParams(providerModel = '') {
  if (config.get('RIVER_REASONING') !== 'reasoning_effort' || nativeRefused) return {};
  const fam = family(providerModel);
  return fam === 'deepseek' ? {} : { reasoning_effort: fam === 'nemotron' ? 'none' : 'low' };
}
const markRefused = () => { nativeRefused = true; };
const hasNative = (body) => ['reasoning_effort', 'reasoning', 'thinking'].some((k) => k in body);
const withoutNative = ({ reasoning_effort, reasoning, thinking, ...rest }) => rest;

// Registro de cada chamada (tempo, tokens, modelo e esforço) — base das medições dos testes.
async function logCall(entry) {
  try {
    const { run } = require('./db');
    const u = entry.usage || {};
    await run('INSERT INTO ai_calls(user_id,kind,model,effort,provider_model,ms,prompt_tokens,completion_tokens,reasoning_tokens,ok,note,site_id,stage,finish_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      entry.userId ?? null, String(entry.kind || 'chat').slice(0, 40), entry.model ?? null, entry.effort ?? null, entry.providerModel ?? null, Math.round(entry.ms || 0),
      u.prompt_tokens ?? null, u.completion_tokens ?? null, u.completion_tokens_details?.reasoning_tokens ?? entry.reasoningTokens ?? null, entry.ok === false ? 0 : 1, entry.note ? String(entry.note).slice(0, 300) : null,
      entry.siteId ?? null, entry.stage ? String(entry.stage).slice(0, 30) : null, entry.finishReason ? String(entry.finishReason).slice(0, 30) : null);
  } catch { /* tabela ainda não migrada: não atrapalha a resposta */ }
}

const asText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((b) => b?.text || '').join('') : String(c ?? ''));

async function completeRiver({ system, messages, maxTokens, model, effort, kind, userId }) {
  const started = Date.now();
  const native = reasoningParams(effort, providerModelFor(model));
  let body = { model: providerModelFor(model), max_tokens: withHeadroom(maxTokens, effort, native), temperature: temperatureOf(model), ...native,
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

// Raciocínio de verdade: nos níveis médio, alto e máximo a IA primeiro analisa o pedido (rascunho interno, nunca mostrado) e só depois responde usando essa análise.
// Baixo responde direto; médio pensa rápido; alto e máximo pensam mais. O orçamento de análise cresce com o nível.
const THINK = {
  medium: { tokens: 800, ask: 'Antes de responder, analise rapidamente: o que o usuário quer e o principal cuidado para acertar. Escreva só 3 a 5 tópicos curtos, sem a resposta final.' },
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

// Visão: descreve imagens anexadas ao pedido. Tenta, em ordem, modelos da River que costumam enxergar (e que esta chave libera);
// o primeiro que responder vale. Sem nenhum, devolve { text: null } e o chamador avisa o usuário (nunca finge que leu).
const VISION_PREFERENCE = ['Qwen/Qwen3.5-397B-A17B-FP8', 'nvidia/Kimi-K2.6-NVFP4-262K', 'nvidia/Kimi-K2.6-NVFP4', 'nvidia/GLM-5.2-NVFP4-262K'];
async function describeImages(images) {
  if (!river() || !images?.length) return { text: null, reason: 'sem-ia' };
  const available = (await availableModels()) || [];
  const candidates = [...VISION_PREFERENCE.filter((m) => available.includes(m)), ...available.filter((m) => /(^|[-/_ ])(vl|vision|omni)([-/_ ]|$)/i.test(m) && !VISION_PREFERENCE.includes(m))].slice(0, 3);
  for (const model of candidates) {
    try {
      const resp = await fetch(`${RIVER_URL()}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.get('RIVER_API_KEY')}` },
        body: JSON.stringify({ model, max_tokens: 1400, temperature: 0.2, messages: [{ role: 'user', content: [
          { type: 'text', text: 'Descreva em português, de forma objetiva, cada imagem anexada a um pedido de criação de site: o que mostra, textos legíveis (transcreva), cores predominantes, logotipos, estilo visual e qualquer informação útil (nomes, preços, contatos). Numere as imagens (Imagem 1, Imagem 2...). Não invente o que não estiver visível.' },
          ...images.map((i) => ({ type: 'image_url', image_url: { url: i.dataUrl } }))] }] }), signal: AbortSignal.timeout(45000) });
      const data = await resp.json().catch(() => ({}));
      const text = String(data?.choices?.[0]?.message?.content || '').trim();
      if (resp.ok && text) return { text, model };
    } catch { /* tenta o próximo */ }
  }
  return { text: null, reason: candidates.length ? 'falhou' : 'sem-modelo' };
}
module.exports = { describeImages, family, complete, think, THINK, configured, NOT_CONFIGURED, providerModel: () => (river() ? RIVER_MODEL() : MODEL()), providerModelFor, temperatureOf, reasoningParams, streamParams, withHeadroom, markRefused, hasNative, withoutNative,
  availableModels, chooseCodeModel, pickCodeModel, CODE_PREFERENCE, logCall, MODEL, EFFORTS, MODELS, resolveModel, apiModel, DEFAULT_ID, resolveEffort, publicModels, selection, RIVER_URL };
