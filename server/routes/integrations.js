const express = require('express');
const { all, get, run } = require('../lib/db');
const { HttpError, bad } = require('../lib/http');
const S = require('../lib/services');
const ai = require('../lib/ai');

const r = express.Router();
r.get('/status', async (_req, res) => res.json({
  ai: { configured: ai.configured(), model: ai.configured() ? ai.MODELS.find((m) => m.id === ai.DEFAULT_ID()).name : null, models: ai.publicModels(), defaultModel: ai.DEFAULT_ID(), envVar: 'ANTHROPIC_API_KEY' },
  places: { configured: Boolean(process.env.GOOGLE_PLACES_API_KEY), envVar: 'GOOGLE_PLACES_API_KEY' }
}));

// ---- Assistente de código com histórico persistente por projeto/usuário
const canAccess = async (pid, req) => { const p = await get('SELECT id FROM projects WHERE id=? AND ws=?', Number(pid), req.user.ws); if (!p) throw new HttpError(404, 'Projeto não encontrado.'); return p.id; };
r.get('/ai/history', async (req, res) => {
  const pid = await canAccess(req.query.projectId, req);
  res.json({ items: (await all('SELECT id, role, content, created_at FROM ai_conversations WHERE project_id=? AND user_id=? ORDER BY id DESC LIMIT 60', pid, req.user.id)).reverse(), usage: (await S.usageOf(req.user)).ai });
});
r.delete('/ai/history', async (req, res) => { const pid = await canAccess(req.query.projectId, req); await run('DELETE FROM ai_conversations WHERE project_id=? AND user_id=?', pid, req.user.id); res.json({ ok: true }); });

r.post('/ai/chat', async (req, res) => {
  const { projectId, activePath } = req.body || {};
  const message = String(req.body?.message || '').trim();
  if (!message) throw bad('Mensagem vazia.'); if (message.length > 20000) throw bad('Mensagem muito longa.');
  if (!ai.configured()) throw new HttpError(503, 'IA não configurada. Defina ANTHROPIC_API_KEY no servidor.', 'ai_not_configured');
  const pid = await canAccess(projectId, req);
  await S.checkAiQuota(req.user, 'chat');
  const hist = (await all('SELECT role, content FROM ai_conversations WHERE project_id=? AND user_id=? ORDER BY id DESC LIMIT 16', pid, req.user.id)).reverse();
  const files = await all('SELECT path, content FROM project_files WHERE project_id=? ORDER BY (path=?) DESC, path', pid, String(activePath || ''));
  let ctx = ''; let budget = 40000;
  const tree = files.map((f) => f.path).join(', ');
  for (const f of files) { if (budget <= 0) break; const chunk = `\n--- ${f.path} ---\n${f.content.slice(0, Math.min(budget, 12000))}`; ctx += chunk; budget -= chunk.length; }
  const model = ai.resolveModel(req.body?.model); const effort = ai.resolveEffort(model, req.body?.effort);
  const reply = await ai.complete({
    model, maxTokens: ai.EFFORTS[effort].maxTokens,
    system: 'Você é o assistente de programação da IDE Neva Growth. Responda em português do Brasil, de forma objetiva. ' +
      'Ao criar ou modificar arquivos, devolva cada arquivo COMPLETO em um bloco de código cuja primeira linha é um comentário no formato "FILE: caminho/do/arquivo.ext" (ex.: <!-- FILE: index.html --> ou // FILE: main.js). ' +
      'Nunca proponha excluir arquivos. Os projetos são estáticos (HTML/CSS/JS, sem build nem servidor).' + ai.EFFORTS[effort].extra + ' ' +
      `Arquivo ativo: ${activePath || 'nenhum'}.\nEstrutura: ${tree || '(vazio)'}\nConteúdo:${ctx || ' (nenhum)'}`,
    messages: [...hist.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: message }]
  });
  await run('INSERT INTO ai_conversations(project_id,user_id,role,content) VALUES (?,?,?,?)', pid, req.user.id, 'user', message);
  await run('INSERT INTO ai_conversations(project_id,user_id,role,content) VALUES (?,?,?,?)', pid, req.user.id, 'assistant', reply);
  await S.recordAiUse(req.user, 'chat');
  res.json({ reply, usage: (await S.usageOf(req.user)).ai });
});

// ---- Prospecção por mapa (Google Places API — New). Exige GOOGLE_PLACES_API_KEY.
const R_EARTH = 6371;
const km = (a, b) => { const t = (x) => (x * Math.PI) / 180; const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R_EARTH * Math.asin(Math.sqrt(h)); };

r.get('/prospect/credits', async (req, res) => res.json({ credits: (await get('SELECT credits FROM users WHERE id=?', req.user.id)).credits }));

r.get('/prospect/searches', async (req, res) => res.json({ items: (await all('SELECT * FROM prospect_searches WHERE user_id=? ORDER BY id DESC LIMIT 30', req.user.id)).map((x) => ({ ...x, areas: JSON.parse(x.areas || '[]') })) }));
r.delete('/prospect/searches/:id', async (req, res) => { await run('DELETE FROM prospect_searches WHERE id=? AND user_id=?', Number(req.params.id), req.user.id); res.json({ ok: true }); });

r.post('/prospect/search', async (req, res) => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new HttpError(503, 'Prospecção não configurada. Defina GOOGLE_PLACES_API_KEY no servidor.', 'places_not_configured');
  const b = req.body || {};
  const query = String(b.query || '').trim(); const location = String(b.location || '').trim();
  const areas = Array.isArray(b.areas) ? b.areas.slice(0, 3).map((a) => ({ lat: Number(a.lat), lng: Number(a.lng), radius_km: Number(a.radius_km) })) : [];
  if (areas.some((a) => !(Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180 && a.radius_km >= 1 && a.radius_km <= 50))) throw bad('Área inválida (raio de 1 a 50 km).');
  if (!areas.length && !location) throw bad('Marque ao menos uma área no mapa ou informe a localidade.');
  if (!areas.length && query.length < 2) throw bad('Informe o segmento.');
  const onlyNoSite = b.onlyNoSite === true || b.onlyNoSite === '1'; const minRating = Math.max(0, Math.min(5, Number(b.minRating) || 0));
  const credits = (await get('SELECT credits FROM users WHERE id=?', req.user.id)).credits;
  if (credits <= 0) throw new HttpError(402, 'Você não tem créditos de prospecção. Peça a um administrador para ampliar seu saldo.', 'no_credits');
  const mask = 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,places.googleMapsUri';
  const call = async (body) => {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST', signal: AbortSignal.timeout(30000),
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask }, body: JSON.stringify({ languageCode: 'pt-BR', pageSize: 20, ...body }) });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new HttpError(502, `Google Places: ${data?.error?.message || resp.status}`, 'places_upstream');
    return data.places || [];
  };
  const raw = new Map();
  if (areas.length) for (const a of areas) {
    const places = await call({ textQuery: query || 'empresas', locationBias: { circle: { center: { latitude: a.lat, longitude: a.lng }, radius: Math.round(a.radius_km * 1000) } } });
    for (const p of places) { const loc = p.location && { lat: p.location.latitude, lng: p.location.longitude };
      if (loc && km({ lat: a.lat, lng: a.lng }, loc) <= a.radius_km * 1.02) raw.set(p.id, p); }
  } else for (const p of await call({ textQuery: `${query} em ${location}` })) raw.set(p.id, p);
  const found = [...raw.values()];
  let items = await Promise.all(found.map(async (p) => {
    const name = p.displayName?.text || ''; const phone = p.nationalPhoneNumber || null;
    return { id: p.id, name, address: p.formattedAddress || null, phone, website: p.websiteUri || null, rating: p.rating ?? null, reviews: p.userRatingCount ?? null,
      lat: p.location?.latitude ?? null, lng: p.location?.longitude ?? null, maps_url: p.googleMapsUri || null,
      exists: Boolean(await get("SELECT 1 x FROM leads WHERE name=? AND COALESCE(phone,'')=? AND ws=?", name, phone || '', req.user.ws)) };
  }));
  const qualifies = (i) => (!onlyNoSite || !i.website) && (i.rating ?? 0) >= minRating;
  const qualified = items.filter(qualifies);
  items = qualified.slice(0, credits);                          // 1 crédito por resultado entregue
  if (items.length) { await run('UPDATE users SET credits=credits-? WHERE id=?', items.length, req.user.id); await run('INSERT INTO credit_ledger(user_id,delta,reason) VALUES (?,?,?)', req.user.id, -items.length, `busca: ${query || location}`.slice(0, 120)); }
  // Importação automática (Configurações > CRM): resultados entregues entram na 1ª etapa aberta do funil, uma única vez por nome+telefone.
  let imported = 0;
  if ((await S.getSettings(req.user.id)).prospect_auto_import === '1') {
    const first = (await get("SELECT key FROM pipeline_stages WHERE kind='open' ORDER BY position, id LIMIT 1"))?.key;
    for (const i of items) {
      if (i.exists || !i.name) continue;
      await run('INSERT INTO leads(name,phone,website,source,notes,owner_id,status,ws) VALUES (?,?,?,?,?,?,?,?)', i.name.slice(0, 300), i.phone, i.website, 'Prospecção (Google Places)', [i.address, i.maps_url].filter(Boolean).join('\n') || null, req.user.id, first, req.user.ws);
      i.exists = true; imported++;
    }
  }
  await run('INSERT INTO prospect_searches(user_id,query,location,areas,radius_km,only_no_site,min_rating,found,qualified,delivered,no_site,potential) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', req.user.id, query || null, location || null, JSON.stringify(areas), areas[0]?.radius_km ?? null, onlyNoSite ? 1 : 0, minRating, found.length, qualified.length, items.length, found.filter((p) => !p.websiteUri).length, found.length ? Math.round((qualified.length / found.length) * 100) : 0);
  res.json({ items, imported, found: found.length, qualified: qualified.length, noSite: found.filter((p) => !p.websiteUri).length, charged: items.length, truncated: qualified.length > items.length,
    potential: found.length ? Math.round((qualified.length / found.length) * 100) : 0, credits: (await get('SELECT credits FROM users WHERE id=?', req.user.id)).credits });
});

module.exports = r;
