const express = require('express');
const { all, get, run } = require('../lib/db');
const S = require('../lib/services');
const ai = require('../lib/ai');
const { HttpError, bad } = require('../lib/http');
const r = express.Router();

const SYSTEM = (mode, format) => `Você é especialista em engenharia de prompts. ${mode === 'improve'
  ? 'O usuário colará um prompt que já escreveu: melhore clareza, contexto, restrições e formato de saída, preservando a intenção.'
  : 'O usuário descreverá uma ideia: transforme-a em um prompt completo e pronto para colar em uma IA (objetivo, contexto, requisitos, restrições, formato de saída).'}
Escreva o prompt final em português do Brasil. ${format === 'json' ? 'Entregue o prompt como um objeto JSON válido (chaves como objetivo, contexto, requisitos, restricoes, formato_saida), sem texto fora do JSON.' : 'Entregue apenas o texto do prompt, sem comentários antes ou depois.'}
Não invente fatos sobre o usuário; se faltar informação, inclua marcadores [ENTRE COLCHETES] para ele preencher.`;

r.post('/generate', async (req, res) => {
  const mode = req.body?.mode === 'improve' ? 'improve' : 'idea';
  const format = req.body?.format === 'json' ? 'json' : 'text';
  const input = String(req.body?.input || '').trim();
  if (input.length < 10) throw bad('Escreva ao menos 10 caracteres.');
  if (input.length > 8000) throw bad('Texto muito longo (máx. 8000 caracteres).');
  if (!ai.configured()) throw new HttpError(503, ai.NOT_CONFIGURED, 'ai_not_configured');
  await S.checkAiQuota(req.user, 'prompt');
  const output = await ai.complete({ system: SYSTEM(mode === 'improve' ? 'improve' : 'idea', format), maxTokens: 2500, messages: [{ role: 'user', content: input }] });
  await S.recordAiUse(req.user, 'prompt');
  res.json({ output, usage: (await S.usageOf(req.user)).ai });
});
r.get('/', async (req, res) => res.json({ items: await all('SELECT id,title,mode,format,input,output,created_at FROM saved_prompts WHERE user_id=? ORDER BY id DESC LIMIT 200', req.user.id) }));
r.post('/', async (req, res) => {
  const b = req.body || {};
  const input = String(b.input || '').trim(), output = String(b.output || '').trim();
  if (!input || !output) throw bad('Nada para salvar.');
  const title = String(b.title || input).trim().slice(0, 80);
  const info = await run('INSERT INTO saved_prompts(user_id,title,mode,format,input,output) VALUES (?,?,?,?,?,?)', req.user.id, title, b.mode === 'improve' ? 'improve' : 'idea', b.format === 'json' ? 'json' : 'text', input.slice(0, 8000), output.slice(0, 40000));
  res.status(201).json(await get('SELECT * FROM saved_prompts WHERE id=?', info.lastInsertRowid));
});
r.delete('/:id', async (req, res) => {
  if (!(await run('DELETE FROM saved_prompts WHERE id=? AND user_id=?', Number(req.params.id), req.user.id)).changes) throw new HttpError(404, 'Prompt não encontrado.');
  res.json({ ok: true });
});
module.exports = r;
