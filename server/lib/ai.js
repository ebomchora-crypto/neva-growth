const { HttpError } = require('./http');
const config = require('./config');
// Provedor de IA: River (API compatível com OpenAI) quando RIVER_API_KEY existe; senão Anthropic (legado).
const river = () => Boolean(config.get('RIVER_API_KEY'));
const RIVER_URL = () => (config.get('RIVER_BASE_URL') || 'https://api.river.ai/v1').replace(/\/$/, '');
const RIVER_MODEL = () => config.get('RIVER_MODEL') || 'deepseek-ai/DeepSeek-V4.1-Flash';
const MODEL = () => process.env.NEVA_AI_MODEL || 'claude-sonnet-5-5';
const configured = () => river() || Boolean(process.env.ANTHROPIC_API_KEY);
const NOT_CONFIGURED = 'IA não configurada. Defina RIVER_API_KEY (e RIVER_MODEL) no servidor.';

// Modelos que o usuário pode escolher (lista fixa: o servidor nunca repassa um id arbitrário à API).
const EFFORTS = {
  low: { label: 'Baixo', hint: 'Resposta direta e rápida. Bom para ajustes e dúvidas curtas.', maxTokens: 4000, extra: ' Seja enxuto e direto.' },
  medium: { label: 'Médio', hint: 'Equilíbrio entre prazo e acabamento. Padrão para a maioria dos trabalhos.', maxTokens: 8000, extra: '' },
  high: { label: 'Alto', hint: 'Mais cuidado em problemas difíceis. Mais lento, usa mais tokens.', maxTokens: 12000, extra: ' Analise com mais profundidade antes de responder.' },
  xhigh: { label: 'Máximo', hint: 'Sem economia de detalhe. Só para as tarefas mais difíceis.', maxTokens: 16000, extra: ' Analise com a máxima profundidade e cubra todos os casos relevantes.' }
};
// Nomes públicos Neva 1.0/1.2/1.5: o navegador só conhece estes ids; o modelo real fica no servidor.
const MODELS = [
  { id: 'neva-1-0', api: 'claude-haiku-5-5', name: 'Neva 1.0', description: 'O mais rápido, para respostas curtas', efforts: ['low', 'medium'], defaultEffort: 'low' },
  { id: 'neva-1-2', api: 'claude-sonnet-5-5', name: 'Neva 1.2', description: 'Rápida e capaz no dia a dia', efforts: ['low', 'medium', 'high'], defaultEffort: 'medium' },
  { id: 'neva-1-5', api: 'claude-opus-5-5', name: 'Neva 1.5', description: 'A mais capaz, para trabalho complexo', efforts: ['low', 'medium', 'high', 'xhigh'], defaultEffort: 'high' }
];
const DEFAULT_ID = () => (MODELS.find((m) => m.api === MODEL()) || MODELS[1]).id;
/** Id público → id real da API (qualquer valor desconhecido cai no padrão). */
const resolveModel = (id) => (MODELS.find((m) => m.id === id) || MODELS.find((m) => m.id === DEFAULT_ID())).id;
const apiModel = (id) => MODELS.find((m) => m.id === id)?.api || MODEL();
/** Esforço válido para o modelo (se o nível não existir nele, cai para o padrão do modelo). */
function resolveEffort(modelId, effort) {
  const m = MODELS.find((x) => x.id === modelId);
  if (m && m.efforts.includes(effort)) return effort;
  return effort in EFFORTS && !m ? effort : (m?.defaultEffort || 'medium');
}
const publicModels = () => MODELS.map(({ api, ...m }) => ({ ...m, efforts: m.efforts.map((k) => ({ id: k, label: EFFORTS[k].label, hint: EFFORTS[k].hint })) }));

const asText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((b) => b?.text || '').join('') : String(c ?? ''));
// Temperatura por nome público: Neva 1.0 mais objetiva, 1.5 com um pouco mais de liberdade (o modelo real é o mesmo na River).
const TEMP = { 'neva-1-0': 0.4, 'neva-1-2': 0.6, 'neva-1-5': 0.7 };

async function completeRiver({ system, messages, maxTokens, model }) {
  const body = { model: RIVER_MODEL(), max_tokens: maxTokens, temperature: TEMP[resolveModel(model)] ?? 0.6,
    messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: asText(m.content) }))] };
  let resp, data;
  for (let attempt = 0; attempt < 3; attempt++) {
    resp = await fetch(`${RIVER_URL()}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.get('RIVER_API_KEY')}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(170000) });
    data = await resp.json().catch(() => ({}));
    if (![429, 500, 502, 503, 504].includes(resp.status)) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!resp.ok) throw new HttpError(502, `Falha na API de IA: ${data?.error?.message || data?.message || resp.status}`, 'ai_upstream');
  const choice = data.choices?.[0];
  const text = asText(choice?.message?.content).trim();
  if (!text) throw new HttpError(502, choice?.finish_reason === 'length' ? 'A IA atingiu o limite de tamanho antes de responder. Tente um esforço maior ou um pedido menor.' : 'A IA não retornou texto. Tente novamente.', 'ai_empty');
  return text;
}

// Raciocínio de verdade: nos níveis alto e máximo a IA primeiro analisa o pedido (rascunho interno, nunca mostrado) e só depois responde usando essa análise.
// Baixo e médio respondem direto. O orçamento de análise cresce com o nível.
const THINK = {
  high: { tokens: 1500, ask: 'Antes de responder, analise o pedido por dentro: o que o usuário realmente quer, o que o contexto já tem, os passos na ordem certa e os erros mais prováveis. Escreva só essa análise, em tópicos curtos, sem a resposta final.' },
  xhigh: { tokens: 3000, ask: 'Antes de responder, analise o pedido a fundo por dentro: objetivo real, restrições, alternativas e por que escolher uma, passos na ordem certa, casos de borda e riscos. Depois critique a própria análise e corrija o que estiver fraco. Escreva só essa análise, em tópicos, sem a resposta final.' }
};
async function think({ system, messages, effort, model }) {
  const cfg = THINK[effort]; if (!cfg) return '';
  try {
    const notes = await complete({ model, maxTokens: cfg.tokens, system: `${system || ''}\n\n${cfg.ask}`, messages, noThink: true });
    return notes.slice(0, 9000);
  } catch { return ''; } // sem a análise o pedido ainda é respondido normalmente
}
async function answer({ system, messages, maxTokens, model, effort }) {
  const notes = await think({ system, messages, effort, model });
  const sys = notes ? `${system || ''}\n\nSua análise interna deste pedido (use para acertar; não a repita nem mencione):\n${notes}` : system;
  return complete({ system: sys, messages, maxTokens, model, noThink: true });
}

async function complete({ system, messages, maxTokens = 4096, model, effort, noThink }) {
  if (effort && !noThink && THINK[effort]) return answer({ system, messages, maxTokens, model, effort });
  if (!configured()) throw new HttpError(503, NOT_CONFIGURED, 'ai_not_configured');
  if (river()) return completeRiver({ system, messages, maxTokens, model });
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
module.exports = { complete, THINK, configured, NOT_CONFIGURED, providerModel: () => (river() ? RIVER_MODEL() : MODEL()), MODEL, EFFORTS, MODELS, resolveModel, apiModel, DEFAULT_ID, resolveEffort, publicModels };
