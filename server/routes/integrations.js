const express = require('express');
const { all, get } = require('../lib/db');
const { HttpError, bad, wrap } = require('../lib/http');
const ai = require('../lib/ai');

const r = express.Router();
r.get('/status', (_req, res) => res.json({
  ai: { configured: ai.configured(), model: ai.configured() ? ai.MODEL() : null, envVar: 'ANTHROPIC_API_KEY' },
  places: { configured: Boolean(process.env.GOOGLE_PLACES_API_KEY), envVar: 'GOOGLE_PLACES_API_KEY' }
}));

// Assistente de código: contexto = arquivos do projeto (truncado)
r.post('/ai/chat', wrap(async (req, res) => {
  const { projectId, activePath, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) throw bad('Mensagem vazia.');
  const msgs = messages.slice(-20).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 20000) }));
  let ctx = '';
  if (projectId) {
    const files = all('SELECT path, content FROM project_files WHERE project_id=? ORDER BY (path=?) DESC, path', Number(projectId), String(activePath || ''));
    let budget = 40000;
    for (const f of files) { const chunk = `\n--- ${f.path} ---\n${f.content.slice(0, Math.min(budget, 12000))}`; if (budget <= 0) break; ctx += chunk; budget -= chunk.length; }
  }
  const text = await ai.complete({
    maxTokens: 6000,
    system: 'Você é o assistente de programação da IDE Neva Growth. Responda em português do Brasil, de forma objetiva. ' +
      'Ao propor alterações em arquivos, devolva o arquivo COMPLETO em um bloco de código cuja primeira linha é um comentário no formato "FILE: caminho/do/arquivo.ext" (ex.: <!-- FILE: index.html --> ou // FILE: main.js). ' +
      `Arquivo ativo: ${activePath || 'nenhum'}.\nArquivos do projeto:${ctx || ' (nenhum)'}`,
    messages: msgs
  });
  res.json({ reply: text });
}));

// Prospecção — Google Places API (New)
r.post('/prospect/search', wrap(async (req, res) => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new HttpError(503, 'Prospecção não configurada. Defina GOOGLE_PLACES_API_KEY no servidor.', 'places_not_configured');
  const query = String(req.body?.query || '').trim(); const location = String(req.body?.location || '').trim();
  if (query.length < 2) throw bad('Informe o segmento (ex.: clínica odontológica).');
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount' },
    body: JSON.stringify({ textQuery: location ? `${query} em ${location}` : query, languageCode: 'pt-BR', pageSize: 20 }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new HttpError(502, `Google Places: ${data?.error?.message || resp.status}`, 'places_upstream');
  const items = (data.places || []).map((p) => {
    const name = p.displayName?.text || '';
    const phone = p.nationalPhoneNumber || null;
    const exists = Boolean(get('SELECT 1 x FROM leads WHERE name=? AND COALESCE(phone,\'\')=?', name, phone || ''));
    return { name, address: p.formattedAddress || null, phone, website: p.websiteUri || null, rating: p.rating ?? null, reviews: p.userRatingCount ?? null, exists };
  });
  res.json({ items });
}));

module.exports = r;
