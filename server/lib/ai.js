const { HttpError } = require('./http');
const MODEL = () => process.env.NEVA_AI_MODEL || 'claude-sonnet-5-5';
const configured = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function complete({ system, messages, maxTokens = 4096 }) {
  if (!configured()) throw new HttpError(503, 'IA não configurada. Defina ANTHROPIC_API_KEY no servidor.', 'ai_not_configured');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(120000)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new HttpError(502, `Falha na API de IA: ${data?.error?.message || resp.status}`, 'ai_upstream');
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}
module.exports = { complete, configured, MODEL };
