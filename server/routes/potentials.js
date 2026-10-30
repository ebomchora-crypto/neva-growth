// Potenciais: lista rápida (nome, telefone, loja, valor) de quem pode fechar. Cada usuário tem a sua.
// Quando fecha, "Fechou → enviar ao CRM" cria o lead na etapa de ganho e o cliente ligado a ele.
const express = require('express');
const { all, get, run, tx } = require('../lib/db');
const { HttpError, bad } = require('../lib/http');
const { wonStageOf, notify } = require('../lib/services');

const r = express.Router();
const digits = (s) => String(s || '').replace(/\D/g, '');
// compara pelos últimos 10 dígitos (ignora +55, zeros e máscara)
const phoneKey = (s) => digits(s).slice(-10);
const clean = (body, partial) => {
  const out = {};
  if (!partial || 'name' in body) { out.name = String(body.name || '').trim().slice(0, 200); if (!out.name) throw bad('Informe o nome.'); }
  if (!partial || 'phone' in body) out.phone = String(body.phone || '').trim().slice(0, 40) || null;
  if (!partial || 'store' in body) out.store = String(body.store || '').trim().slice(0, 200) || null;
  if (!partial || 'value' in body) { const v = Number(String(body.value ?? 0).replace(',', '.')); if (!Number.isFinite(v) || v < 0) throw bad('Valor inválido.'); out.value = v; }
  return out;
};
const mine = async (req) => {
  const row = await get('SELECT * FROM potentials WHERE id=? AND user_id=?', Number(req.params.id), req.user.id);
  if (!row) throw new HttpError(404, 'Oportunidade não encontrada.');
  return row;
};

r.get('/', async (req, res) => {
  const items = await all('SELECT * FROM potentials WHERE user_id=? ORDER BY id DESC', req.user.id);
  const count = (st) => items.filter((x) => x.status === st).length;
  const openValue = items.filter((x) => x.status === 'aberta').reduce((a, x) => a + Number(x.value || 0), 0);
  res.json({ items, counts: { aberta: count('aberta'), enviada: count('enviada'), descartada: count('descartada') }, open_value: openValue });
});

r.post('/', async (req, res) => {
  const d = clean(req.body || {}, false);
  const info = await run('INSERT INTO potentials(user_id,ws,name,phone,store,value) VALUES (?,?,?,?,?,?)', req.user.id, req.user.ws, d.name, d.phone, d.store, d.value);
  res.status(201).json(await get('SELECT * FROM potentials WHERE id=?', Number(info.lastInsertRowid)));
});

r.put('/:id', async (req, res) => {
  const row = await mine(req);
  const d = clean(req.body || {}, true);
  if ('status' in (req.body || {})) {
    if (!['aberta', 'descartada'].includes(req.body.status)) throw bad('Estado inválido.');
    if (row.status === 'enviada') throw bad('Esta oportunidade já foi enviada ao CRM.');
    d.status = req.body.status;
  }
  const keys = Object.keys(d); if (!keys.length) return res.json(row);
  await run(`UPDATE potentials SET ${keys.map((k) => `${k}=?`).join(', ')}, updated_at=datetime('now') WHERE id=?`, ...keys.map((k) => d[k]), row.id);
  res.json(await get('SELECT * FROM potentials WHERE id=?', row.id));
});

r.delete('/:id', async (req, res) => {
  const row = await mine(req);
  await run('DELETE FROM potentials WHERE id=?', row.id);
  res.json({ ok: true });
});

// Fechou: cria o lead (etapa de ganho) e o cliente. Se o telefone já existe no CRM, avisa (409) e só segue com { link: true }.
r.post('/:id/close', async (req, res) => {
  const row = await mine(req);
  if (row.status === 'enviada') throw bad('Esta oportunidade já foi enviada ao CRM.');
  const ws = req.user.ws;
  const won = await wonStageOf(ws);
  if (!won) throw bad('Seu funil não tem uma etapa de ganho. Defina uma em CRM e funil.');
  const key = phoneKey(row.phone);
  let dup = null;
  if (key.length >= 8) {
    const leads = await all('SELECT id, name, phone, client_id FROM leads WHERE ws=? AND phone IS NOT NULL', ws);
    dup = leads.find((l) => phoneKey(l.phone) === key) || null;
  }
  if (dup && !req.body?.link) throw Object.assign(new HttpError(409, `Já existe no CRM um contato com este telefone: ${dup.name}.`, 'duplicate'), { details: { lead_id: dup.id, lead_name: dup.name } });
  const out = await tx(async () => {
    let leadId; let clientId = null;
    if (dup) {
      leadId = dup.id; clientId = dup.client_id || null;
      await run("UPDATE leads SET status=?, value=CASE WHEN value=0 THEN ? ELSE value END, updated_at=datetime('now') WHERE id=?", won, row.value, leadId);
    } else {
      const l = await run('INSERT INTO leads(name,company,phone,value,source,status,owner_id,ws) VALUES (?,?,?,?,?,?,?,?)', row.name.slice(0, 300), row.store, row.phone, row.value, 'potenciais', won, req.user.id, ws);
      leadId = Number(l.lastInsertRowid);
    }
    if (!clientId) {
      const existing = await get('SELECT id FROM clients WHERE lead_id=?', leadId);
      if (existing) clientId = existing.id;
      else { const c = await run("INSERT INTO clients(name,company,phone,lead_id,stage,ws) VALUES (?,?,?,?,'cliente',?)", row.name, row.store, row.phone, leadId, ws); clientId = Number(c.lastInsertRowid); }
    }
    await run("UPDATE leads SET client_id=? WHERE id=? AND client_id IS NULL", clientId, leadId);
    await run('INSERT INTO activities(lead_id,client_id,type,text,user_id) VALUES (?,?,?,?,?)', leadId, clientId, 'etapa', 'Fechou na lista de potenciais e foi enviado ao CRM', req.user.id);
    await run("UPDATE potentials SET status='enviada', lead_id=?, client_id=?, updated_at=datetime('now') WHERE id=?", leadId, clientId, row.id);
    return { lead_id: leadId, client_id: clientId, linked: !!dup };
  });
  res.json({ ...out, item: await get('SELECT * FROM potentials WHERE id=?', row.id) });
});

module.exports = r;
