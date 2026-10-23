// Chat com a IA (página /chat): conversas guardadas por usuário; a resposta chega ao vivo em linhas JSON (NDJSON):
// {"t":"start","id"} · {"t":"d","d":"pedaço"} · {"t":"done","id","title"} · {"t":"error","e":"motivo"}.
const express = require('express');
const ai = require('../lib/ai');
const { all, get, run } = require('../lib/db');
const { HttpError } = require('../lib/http');

const r = express.Router();
const J = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
const MAX_MSG = 20000;
const titleOf = (text) => { const t = String(text).replace(/\s+/g, ' ').trim(); return t.length > 60 ? `${t.slice(0, 57).trimEnd()}…` : t || 'Nova conversa'; };
const systemFor = (user) => `Você é a Neva, assistente de IA da plataforma Neva Growth (para quem vende e entrega sites, landing pages e sistemas para pequenas empresas no Brasil).
Converse em português do Brasil, com clareza e objetividade. Use Markdown leve quando ajudar (listas, **negrito**, blocos de código com a linguagem).
Ajude com qualquer assunto: vendas, prospecção, propostas, copy, marketing, código, design, estratégia, dúvidas gerais.
Não invente dados, números ou fatos que você não sabe; diga quando não tiver certeza. Quem fala com você: ${user.name}.`;

async function own(id, user) {
  const row = await get('SELECT id, title, messages, created_at, updated_at FROM chats WHERE id=? AND user_id=?', Number(id) || 0, user.id);
  if (!row) throw new HttpError(404, 'Conversa não encontrada.');
  return { ...row, messages: J(row.messages, []) };
}

r.get('/', async (req, res) => {
  const items = await all('SELECT id, title, created_at, updated_at FROM chats WHERE user_id=? ORDER BY updated_at DESC, id DESC LIMIT 200', req.user.id);
  res.json({ items });
});
r.get('/:id(\\d+)', async (req, res) => res.json(await own(req.params.id, req.user)));
r.patch('/:id(\\d+)', async (req, res) => {
  const c = await own(req.params.id, req.user);
  const title = String(req.body?.title || '').trim().slice(0, 80);
  if (!title) throw new HttpError(400, 'Dê um nome à conversa.');
  await run('UPDATE chats SET title=? WHERE id=?', title, c.id);
  res.json({ ok: true, title });
});
r.delete('/:id(\\d+)', async (req, res) => {
  const c = await own(req.params.id, req.user);
  await run('DELETE FROM chats WHERE id=?', c.id);
  res.json({ ok: true });
});

r.post('/', async (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (!text) throw new HttpError(400, 'Escreva uma mensagem.');
  if (text.length > MAX_MSG) throw new HttpError(400, `A mensagem passou de ${MAX_MSG.toLocaleString('pt-BR')} caracteres.`);
  if (!ai.configured()) throw new HttpError(503, ai.NOT_CONFIGURED, 'ai_not_configured');
  const sel = ai.selection(req.body);
  let chat;
  if (req.body?.chat_id) chat = await own(req.body.chat_id, req.user);
  else {
    const info = await run('INSERT INTO chats(user_id,title,messages) VALUES (?,?,?)', req.user.id, titleOf(text), '[]');
    chat = { id: Number(info.lastInsertRowid), title: titleOf(text), messages: [] };
  }
  // Refazer a última resposta: o cliente manda regenerate=true e a mesma pergunta.
  if (req.body?.regenerate && chat.messages.at(-1)?.role === 'assistant') chat.messages.pop();
  if (req.body?.regenerate && chat.messages.at(-1)?.role === 'user') chat.messages.pop();
  const userMsg = { role: 'user', content: text, at: new Date().toISOString() };
  const history = [...chat.messages, userMsg].slice(-30).map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_MSG) }));

  res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('x-accel-buffering', 'no');
  const send = (o) => res.write(`${JSON.stringify(o)}\n`);
  send({ t: 'start', id: chat.id, title: chat.title });
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ctrl.abort(); });
  let full = ''; let got = '';
  try {
    full = await ai.stream({ system: systemFor(req.user), messages: history, maxTokens: 6000, model: sel.model, effort: sel.effort, kind: 'chat', userId: req.user.id,
      signal: ctrl.signal, onDelta: (d) => { got += d; send({ t: 'd', d }); } });
  } catch (e) {
    // Parou no meio (o usuário apertou parar): guarda o que já veio.
    if (ctrl.signal.aborted && got) full = got; else {
      if (!chat.messages.length) await run('DELETE FROM chats WHERE id=? AND messages=?', chat.id, '[]');
      else await run("UPDATE chats SET messages=?, updated_at=datetime('now') WHERE id=?", JSON.stringify([...chat.messages, userMsg]), chat.id);
      send({ t: 'error', e: e.message || 'Não consegui responder agora.' }); return res.end();
    }
  }
  const messages = [...chat.messages, userMsg, { role: 'assistant', content: full, at: new Date().toISOString(), model: sel.model }];
  await run("UPDATE chats SET messages=?, updated_at=datetime('now') WHERE id=?", JSON.stringify(messages), chat.id);
  send({ t: 'done', id: chat.id, title: chat.title });
  res.end();
});

module.exports = r;
