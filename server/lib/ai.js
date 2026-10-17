const { HttpError } = require('./http');
const MODEL = () => process.env.NEVA_AI_MODEL || 'claude-sonnet-5-5';
const configured = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Modelos que o usuário pode escolher (lista fixa: o servidor nunca repassa um id arbitrário à API).
const EFFORTS = {
  low: { label: 'Baixo', hint: 'Resposta direta e rápida. Bom para ajustes e dúvidas curtas.', maxTokens: 4000, extra: ' Seja enxuto e direto.' },
  medium: { label: 'Médio', hint: 'Equilíbrio entre prazo e acabamento. Padrão para a maioria dos trabalhos.', maxTokens: 8000, extra: '' },
  high: { label: 'Alto', hint: 'Mais cuidado em problemas difíceis. Mais lento, usa mais tokens.', maxTokens: 12000, extra: ' Analise com mais profundidade antes de responder.' },
  xhigh: { label: 'Máximo', hint: 'Sem economia de detalhe. Só para as tarefas mais difíceis.', maxTokens: 16000, extra: ' Analise com a máxima profundidade e cubra todos os casos relevantes.' }
};
const MODELS = [
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', description: 'Mais capaz, para trabalho complexo', efforts: ['low', 'medium', 'high', 'xhigh'], defaultEffort: 'high' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', description: 'Rápido e capaz no dia a dia', efforts: ['low', 'medium', 'high'], defaultEffort: 'medium' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', description: 'O mais rápido, para respostas curtas', efforts: ['low', 'medium'], defaultEffort: 'low' }
];
const resolveModel = (id) => (MODELS.some((m) => m.id === id) ? id : MODEL());
/** Esforço válido para o modelo (se o nível não existir nele, cai para o padrão do modelo). */
function resolveEffort(modelId, effort) {
  const m = MODELS.find((x) => x.id === modelId);
  if (m && m.efforts.includes(effort)) return effort;
  return effort in EFFORTS && !m ? effort : (m?.defaultEffort || 'medium');
}
const publicModels = () => MODELS.map((m) => ({ ...m, efforts: m.efforts.map((k) => ({ id: k, label: EFFORTS[k].label, hint: EFFORTS[k].hint })) }));

async function complete({ system, messages, maxTokens = 4096, model }) {
  if (!configured()) throw new HttpError(503, 'IA não configurada. Defina ANTHROPIC_API_KEY no servidor.', 'ai_not_configured');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: resolveModel(model), max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(120000)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new HttpError(502, `Falha na API de IA: ${data?.error?.message || resp.status}`, 'ai_upstream');
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}
module.exports = { complete, configured, MODEL, EFFORTS, MODELS, resolveModel, resolveEffort, publicModels };
