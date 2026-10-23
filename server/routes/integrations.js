const express = require('express');
const { all, get, run } = require('../lib/db');
const { HttpError, bad } = require('../lib/http');
const S = require('../lib/services');
const config = require('../lib/config');
const ai = require('../lib/ai');

const r = express.Router();
r.get('/status', async (_req, res) => res.json({
  ai: { configured: ai.configured(), model: ai.configured() ? ai.MODELS.find((m) => m.id === ai.DEFAULT_ID()).name : null, models: ai.publicModels(), defaultModel: ai.DEFAULT_ID(), envVar: 'RIVER_API_KEY' },
  builder: { configured: Boolean(config.get('CODEMAKER_API_KEY')) || ai.configured() },
  places: { configured: Boolean(config.get('APIFY_API_TOKEN')), envVar: 'APIFY_API_TOKEN', provider: 'Apify (Google Maps)' }
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
  if (!ai.configured()) throw new HttpError(503, ai.NOT_CONFIGURED, 'ai_not_configured');
  const pid = await canAccess(projectId, req);
  await S.checkAiQuota(req.user, 'chat');
  const hist = (await all('SELECT role, content FROM ai_conversations WHERE project_id=? AND user_id=? ORDER BY id DESC LIMIT 16', pid, req.user.id)).reverse();
  const files = await all('SELECT path, content FROM project_files WHERE project_id=? ORDER BY (path=?) DESC, path', pid, String(activePath || ''));
  let ctx = ''; let budget = 40000;
  const tree = files.map((f) => f.path).join(', ');
  for (const f of files) { if (budget <= 0) break; const chunk = `\n--- ${f.path} ---\n${f.content.slice(0, Math.min(budget, 12000))}`; ctx += chunk; budget -= chunk.length; }
  const model = ai.resolveModel(req.body?.model); const effort = ai.resolveEffort(model, req.body?.effort);
  const reply = await ai.complete({
    model, effort, kind: 'ide', userId: req.user.id, maxTokens: ai.EFFORTS[effort].maxTokens,
    system: 'Você é o assistente de programação da IDE Neva Growth. Responda em português do Brasil, de forma objetiva. ' +
      'Ao criar ou modificar arquivos, devolva cada arquivo COMPLETO em um bloco de código cuja PRIMEIRA LINHA DENTRO DO BLOCO é um comentário no formato "FILE: caminho/do/arquivo.ext" (ex.: ```html\n<!-- FILE: index.html -->\n... ou ```js\n// FILE: main.js\n...). ' +
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

r.get('/prospect/searches', async (req, res) => res.json({ items: (await all('SELECT id,user_id,query,location,areas,radius_km,only_no_site,min_rating,found,qualified,delivered,no_site,potential,status,created_at FROM prospect_searches WHERE user_id=? ORDER BY id DESC LIMIT 30', req.user.id)).map((x) => ({ ...x, areas: JSON.parse(x.areas || '[]') })) }));
r.delete('/prospect/searches/:id', async (req, res) => { await run('DELETE FROM prospect_searches WHERE id=? AND user_id=?', Number(req.params.id), req.user.id); res.json({ ok: true }); });

// ---- Busca na Apify (actor compass/crawler-google-places). Assíncrona: inicia uma execução por área,
// o navegador consulta o andamento e, quando todas terminam, os resultados são processados uma única vez.
const APIFY = 'https://api.apify.com/v2';
const ACTOR = 'compass~crawler-google-places';
const TERMINAL = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];
async function apify(path, opts = {}) {
  const resp = await fetch(APIFY + path, { ...opts, headers: { authorization: `Bearer ${config.get('APIFY_API_TOKEN')}`, 'content-type': 'application/json', ...(opts.headers || {}) }, signal: AbortSignal.timeout(25000) });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new HttpError(502, `Apify: ${data?.error?.message || resp.status}`, 'places_upstream');
  return data;
}
const parse = (x, d) => { try { return JSON.parse(x); } catch { return d; } };

r.post('/prospect/search', async (req, res) => {
  if (!config.get('APIFY_API_TOKEN')) throw new HttpError(503, 'Prospecção não configurada. Preencha APIFY_API_TOKEN na tabela app_settings do banco (ou na Vercel).', 'places_not_configured');
  const b = req.body || {};
  const query = String(b.query || '').trim().slice(0, 120); const location = String(b.location || '').trim().slice(0, 160);
  const areas = Array.isArray(b.areas) ? b.areas.slice(0, 3).map((a) => ({ lat: Number(a.lat), lng: Number(a.lng), radius_km: Number(a.radius_km) })) : [];
  if (areas.some((a) => !(Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180 && a.radius_km >= 1 && a.radius_km <= 50))) throw bad('Área inválida (raio de 1 a 50 km).');
  if (!areas.length && !location) throw bad('Marque ao menos uma área no mapa ou informe a localidade.');
  if (!areas.length && query.length < 2) throw bad('Informe o segmento.');
  const onlyNoSite = b.onlyNoSite === true || b.onlyNoSite === '1'; const minRating = Math.max(0, Math.min(5, Number(b.minRating) || 0));
  if (await get("SELECT 1 x FROM prospect_searches WHERE user_id=? AND status='running'", req.user.id)) throw new HttpError(409, 'Você já tem uma busca em andamento. Aguarde ela terminar.', 'search_running');
  const max = Number(config.get('APIFY_MAX_PLACES')) || 0; const usd = Number(config.get('APIFY_MAX_USD_PER_RUN')) || 0;
  const base = { searchStringsArray: [query || 'empresas'], language: 'pt-BR', countryCode: 'br', scrapeContacts: config.get('APIFY_SCRAPE_CONTACTS') !== 'false', ...(max ? { maxCrawledPlacesPerSearch: max } : {}) };
  const inputs = areas.length ? areas.map((a) => ({ ...base, customGeolocation: { type: 'Point', coordinates: [a.lng, a.lat], radiusKm: a.radius_km } })) : [{ ...base, locationQuery: location }];
  const runs = [];
  for (const input of inputs) runs.push((await apify(`/acts/${ACTOR}/runs${usd ? `?maxTotalChargeUsd=${usd}` : ''}`, { method: 'POST', body: JSON.stringify(input) })).data.id);
  const info = await run('INSERT INTO prospect_searches(user_id,query,location,areas,radius_km,only_no_site,min_rating,status,run_ids,params) VALUES (?,?,?,?,?,?,?,?,?,?)',
    req.user.id, query || null, location || null, JSON.stringify(areas), areas[0]?.radius_km ?? null, onlyNoSite ? 1 : 0, minRating, 'running', JSON.stringify(runs), JSON.stringify({ onlyNoSite, minRating }));
  res.status(202).json({ id: Number(info.lastInsertRowid), status: 'running', runs: runs.length });
});

// Andamento / resultado de uma busca
r.get('/prospect/search/:id', async (req, res) => {
  const row = await get('SELECT * FROM prospect_searches WHERE id=? AND user_id=?', Number(req.params.id), req.user.id);
  if (!row) throw new HttpError(404, 'Busca não encontrada.');
  if (row.status === 'done') return res.json({ status: 'done', ...parse(row.results, { items: [] }) });
  if (row.status === 'failed') return res.json({ status: 'failed', error: row.error || 'A busca falhou.' });
  const runIds = parse(row.run_ids, []);
  const states = await Promise.all(runIds.map((id) => apify(`/actor-runs/${id}`).then((x) => x.data)));
  const counts = await Promise.all(states.map((s) => apify(`/datasets/${s.defaultDatasetId}`).then((x) => x.data.itemCount || 0).catch(() => 0)));
  const found = counts.reduce((a, n) => a + n, 0);
  if (!states.every((s) => TERMINAL.includes(s.status))) return res.json({ status: 'running', found, runs: states.map((s) => s.status) });
  // só um processamento por busca, mesmo com consultas simultâneas
  const lock = await run("UPDATE prospect_searches SET status='processing' WHERE id=? AND status='running'", row.id);
  if (!Number(lock.changes)) return res.json({ status: 'running', found });
  try {
    if (!states.some((s) => s.status === 'SUCCEEDED') && !found) throw new Error(`A busca na Apify terminou com status ${states.map((s) => s.status).join(', ')}.`);
    const fields = 'placeId,title,address,phone,website,totalScore,reviewsCount,location,url,permanentlyClosed,categoryName,emails,instagrams,facebooks,linkedIns,whatsapps,neighborhood,city';
    const areas = parse(row.areas, []); const raw = new Map();
    for (let i = 0; i < states.length; i++) {
      const items = await apify(`/datasets/${states[i].defaultDatasetId}/items?clean=true&format=json&fields=${fields}`).catch(() => []);
      for (const p of Array.isArray(items) ? items : []) {
        const a = areas[i]; const loc = p.location && { lat: p.location.lat, lng: p.location.lng };
        if (a && loc && km({ lat: a.lat, lng: a.lng }, loc) > a.radius_km * 1.05) continue;
        if (p.placeId || p.title) raw.set(p.placeId || `${p.title}|${p.address}`, p);
      }
    }
    const known = new Set((await all('SELECT name, phone FROM leads WHERE ws=?', req.user.ws)).map((l) => `${l.name}|${l.phone || ''}`));
    const all1 = [...raw.values()].map((p) => ({ id: p.placeId, name: p.title || '', address: p.address || null, phone: p.phone || null, website: p.website || null, rating: p.totalScore ?? null, reviews: p.reviewsCount ?? null,
      lat: p.location?.lat ?? null, lng: p.location?.lng ?? null, maps_url: p.url || null, category: p.categoryName || null, closed: Boolean(p.permanentlyClosed),
      email: (p.emails || [])[0] || null, instagram: (p.instagrams || [])[0] || null, facebook: (p.facebooks || [])[0] || null, linkedin: (p.linkedIns || [])[0] || null, whatsapp: (p.whatsapps || [])[0] || null,
      exists: known.has(`${p.title || ''}|${p.phone || ''}`) }));
    const prm = parse(row.params, {});
    const qualified = all1.filter((i) => !i.closed && (!prm.onlyNoSite || !i.website) && (i.rating ?? 0) >= (prm.minRating || 0));
    let imported = 0;
    if ((await S.getSettings(req.user.id)).prospect_auto_import === '1') {
      const first = await S.firstOpenOf(req.user.ws);
      for (const i of qualified) {
        if (i.exists || !i.name) continue;
        await run('INSERT INTO leads(name,phone,email,website,source,notes,owner_id,status,ws) VALUES (?,?,?,?,?,?,?,?,?)', i.name.slice(0, 300), i.phone, i.email, i.website, 'Prospecção (Google Maps)',
          [i.category, i.address, i.instagram, i.maps_url].filter(Boolean).join('\n') || null, req.user.id, first, req.user.ws);
        i.exists = true; imported++;
      }
    }
    const out = { items: qualified, imported, found: all1.length, qualified: qualified.length, noSite: all1.filter((i) => !i.website).length,
      potential: all1.length ? Math.round((qualified.length / all1.length) * 100) : 0, partial: states.some((s) => s.status !== 'SUCCEEDED') };
    await run("UPDATE prospect_searches SET status='done', found=?, qualified=?, delivered=?, no_site=?, potential=?, results=? WHERE id=?", out.found, out.qualified, out.qualified, out.noSite, out.potential, JSON.stringify(out), row.id);
    res.json({ status: 'done', ...out });
  } catch (e) {
    await run("UPDATE prospect_searches SET status='failed', error=? WHERE id=?", String(e.message).slice(0, 300), row.id);
    res.json({ status: 'failed', error: e.message });
  }
});

module.exports = r;
