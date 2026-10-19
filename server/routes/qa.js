// Sonda de testes da IA (só para medir; desligada por padrão).
// Liga com app_settings.QA_TOKEN (24+ caracteres) e exige o cabeçalho x-qa-token igual. Nunca devolve chaves.
//   POST /api/qa/ai-probe { mode: 'models' }                         → modelos que a River oferece
//   POST /api/qa/ai-probe { mode: 'native', model? }                 → quais parâmetros de raciocínio a River aceita (e se mudam algo)
//   POST /api/qa/ai-probe { mode: 'effort', model, effort, items? }  → acertos, tempo e tokens de um modelo/esforço num conjunto de problemas
const express = require('express');
const crypto = require('node:crypto');
const config = require('../lib/config');
const ai = require('../lib/ai');
const { all } = require('../lib/db');
const { HttpError } = require('../lib/http');

const r = express.Router();

r.use((req, _res, next) => {
  const token = config.get('QA_TOKEN');
  const sent = String(req.get('x-qa-token') || '');
  if (!token || token.length < 24 || sent.length !== token.length || !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(token))) return next(new HttpError(404, 'Rota não encontrada.'));
  next();
});

// Problemas com resposta única e conferível (aritmética, lógica, contagem, planejamento).
const PROBLEMS = [
  { q: 'Uma loja vende camisetas a R$ 35. Levando 3, a terceira sai pela metade do preço. Quanto custam 7 camisetas, montando o máximo de trios? Responda só o número em reais.', a: /\b210\b/ },
  { q: 'Ana é mais velha que Bruno. Carla é mais nova que Bruno. Diego é mais velho que Ana. Quem é o segundo mais novo?', a: /bruno/i },
  { q: 'Quantos números inteiros de 1 a 100 (inclusive) são divisíveis por 3 ou por 5?', a: /\b47\b/ },
  { q: 'Um site tem 4 seções; cada uma leva 12 minutos para escrever e só 2 podem ser escritas ao mesmo tempo. A revisão final leva 9 minutos e só começa quando tudo está pronto. Qual o tempo mínimo total em minutos?', a: /\b33\b/ },
  { q: 'Se hoje é quarta-feira, que dia da semana será daqui a 100 dias?', a: /sexta/i },
  { q: 'Três caixas têm os rótulos "maçãs", "laranjas" e "mistas", e todos os rótulos estão errados. Você tira uma fruta da caixa "mistas" e é uma laranja. O que há na caixa com o rótulo "maçãs"?', a: /mistas|misturad/i },
  { q: 'Qual é o menor inteiro positivo que deixa resto 1 quando dividido por 2, 3, 4, 5 e 6 e é divisível por 7?', a: /\b301\b/ },
  { q: 'Uma escada tem 10 degraus e você sobe 1 ou 2 degraus por vez. De quantas formas diferentes chega ao topo?', a: /\b89\b/ },
  { q: 'Um taco e uma bola custam R$ 1,10 juntos. O taco custa R$ 1,00 a mais que a bola. Quanto custa a bola, em centavos?', a: /\b5\b/ },
  { q: 'Quantas vezes a letra "r" aparece na palavra "arrecadarrr"?', a: /\b5\b/ }
];
const SYSTEM = 'Resolva o problema. Termine a resposta com uma linha no formato "RESPOSTA: <valor>".';
const finalAnswer = (text) => (String(text).match(/RESPOSTA:\s*(.+)\s*$/im)?.[1] || String(text).split('\n').filter(Boolean).pop() || '').trim();

r.post('/ai-probe', async (req, res) => {
  const mode = String(req.body?.mode || '');
  const key = config.get('RIVER_API_KEY');
  if (!key) throw new HttpError(503, ai.NOT_CONFIGURED);
  const base = ai.RIVER_URL();
  const call = async (body) => {
    const t = Date.now();
    const resp = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    const data = await resp.json().catch(() => ({}));
    const msg = data.choices?.[0]?.message || {};
    return { status: resp.status, ms: Date.now() - t, error: resp.ok ? null : String(data?.error?.message || data?.message || '').slice(0, 300), usage: data.usage || null,
      finish: data.choices?.[0]?.finish_reason || null, answer: finalAnswer(msg.content || '').slice(0, 120), reasoningChars: String(msg.reasoning_content || msg.reasoning || '').length };
  };

  if (mode === 'models') {
    const resp = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
    const data = await resp.json().catch(() => ({}));
    const ids = (data.data || data.models || []).map((m) => m.id || m.name).filter(Boolean);
    return res.json({ status: resp.status, configured: config.get('RIVER_MODEL') || null, count: ids.length, ids });
  }

  if (mode === 'native') {
    const model = String(req.body?.model || '') || ai.providerModelFor('neva-1-2');
    const p = PROBLEMS[6];
    const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: p.q }];
    const variants = {
      nenhum: {}, reasoning_effort_low: { reasoning_effort: 'low' }, reasoning_effort_high: { reasoning_effort: 'high' },
      reasoning_low: { reasoning: { effort: 'low' } }, reasoning_high: { reasoning: { effort: 'high' } },
      thinking_disabled: { thinking: { type: 'disabled' } }, thinking_enabled: { thinking: { type: 'enabled' } }
    };
    const out = {};
    for (const [name, extra] of Object.entries(variants)) {
      const result = await call({ model, max_tokens: 6000, temperature: 0.6, messages, ...extra });
      out[name] = { ...result, correct: p.a.test(result.answer) };
    }
    return res.json({ model, problem: 'menor inteiro com restos (resposta 301)', variants: out });
  }

  if (mode === 'effort') {
    const sel = ai.selection(req.body);
    const items = (Array.isArray(req.body?.items) ? req.body.items : PROBLEMS.map((_, i) => i)).filter((i) => PROBLEMS[i]);
    const since = new Date(Date.now() - 1000).toISOString().slice(0, 19).replace('T', ' ');
    const results = [];
    for (const i of items) {
      const t = Date.now();
      try {
        const text = await ai.complete({ system: SYSTEM, messages: [{ role: 'user', content: PROBLEMS[i].q }], maxTokens: ai.EFFORTS[sel.effort].maxTokens, model: sel.model, effort: sel.effort, kind: `qa:${sel.model}:${sel.effort}` });
        const answer = finalAnswer(text);
        results.push({ item: i, ok: PROBLEMS[i].a.test(answer), ms: Date.now() - t, answer: answer.slice(0, 80), chars: text.length });
      } catch (e) { results.push({ item: i, ok: false, ms: Date.now() - t, error: String(e.message).slice(0, 160) }); }
    }
    const calls = await all('SELECT kind, ms, prompt_tokens, completion_tokens, reasoning_tokens, ok FROM ai_calls WHERE kind LIKE ? AND created_at>=? ORDER BY id', `qa:${sel.model}:${sel.effort}%`, since).catch(() => []);
    return res.json({ ...sel, providerModel: ai.providerModelFor(sel.model), native: config.get('RIVER_REASONING') || null, results,
      correct: results.filter((x) => x.ok).length, total: results.length, ms: results.reduce((a, x) => a + x.ms, 0), calls });
  }

  throw new HttpError(400, 'Modo inválido.');
});

module.exports = r;
