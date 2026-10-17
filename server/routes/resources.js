const express = require('express');
const { crud } = require('../lib/crud');
const { all, get, run, tx } = require('../lib/db');
const { HttpError, bad } = require('../lib/http');
const wrap = (fn) => fn;
const A = require('../lib/auth');
const { notify } = require('../lib/services');

const stages = () => all('SELECT * FROM pipeline_stages ORDER BY position, id');
const stageKeys = async () => (await stages()).map((s) => s.key);
const stageKind = async (key) => (await get('SELECT kind FROM pipeline_stages WHERE key=?', key))?.kind;
const firstOpen = async () => (await get("SELECT key FROM pipeline_stages WHERE kind='open' ORDER BY position, id LIMIT 1"))?.key;
const today = () => new Date().toISOString().slice(0, 10);
const r = express.Router();


// ---- Etapas do funil personalizáveis
r.get('/pipeline/stages', async (_req, res) => res.json(await all(`SELECT s.*, (SELECT COUNT(*) FROM leads l WHERE l.status=s.key) AS leads_count FROM pipeline_stages s ORDER BY position, id`)));
r.put('/pipeline/stages', A.requireRole('admin'), async (req, res) => {
  const list = req.body?.stages;
  if (!Array.isArray(list) || list.length < 2 || list.length > 12) throw bad('Defina de 2 a 12 etapas.');
  const norm = list.map((x, i) => ({ key: x.key ? String(x.key) : null, label: String(x.label || '').trim().slice(0, 40), kind: x.kind, position: i + 1 }));
  if (norm.some((x) => !x.label)) throw bad('Toda etapa precisa de um nome.');
  if (norm.some((x) => !['open', 'won', 'lost'].includes(x.kind))) throw bad('Tipo de etapa inválido.');
  if (!norm.some((x) => x.kind === 'open')) throw bad('É necessária ao menos uma etapa aberta.');
  if (norm.filter((x) => x.kind === 'won').length !== 1 || norm.filter((x) => x.kind === 'lost').length !== 1) throw bad('Defina exatamente uma etapa de ganho e uma de perda.');
  const existing = new Set(await stageKeys());
  const keep = new Set(norm.filter((x) => x.key && existing.has(x.key)).map((x) => x.key));
  const removed = [...existing].filter((k) => !keep.has(k));
  for (const k of removed) {
    const n = (await get('SELECT COUNT(*) n FROM leads WHERE status=?', k)).n;
    if (n) throw bad(`A etapa "${k}" ainda tem ${n} oportunidade(s). Mova-as antes de excluir.`);
  }
  await tx(async () => {
    for (const k of removed) await run('DELETE FROM pipeline_stages WHERE key=?', k);
    for (const x of norm) {
      if (x.key && existing.has(x.key)) await run('UPDATE pipeline_stages SET label=?, kind=?, position=? WHERE key=?', x.label, x.kind, x.position, x.key);
      else {
        let base = x.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'etapa';
        let key = base, i = 2; while (await get('SELECT 1 x FROM pipeline_stages WHERE key=?', key)) key = `${base}-${i++}`;
        await run('INSERT INTO pipeline_stages(key,label,kind,position) VALUES (?,?,?,?)', key, x.label, x.kind, x.position);
      }
    }
  });
  res.json(await stages());
});

// ---- Leads / Pipeline
const leads = crud({
  table: 'leads', alias: 'l',
  select: 'SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id=l.owner_id',
  search: ['name', 'company', 'email', 'phone'], filters: ['status', 'owner_id', 'source', 'priority', 'archived'],
  extraWhere: (req) => (req.query.overdue === '1' ? ["l.due_date IS NOT NULL AND l.due_date < date('now') AND l.archived=0 AND l.status IN (SELECT key FROM pipeline_stages WHERE kind='open')"] : null),
  fields: {
    name: { type: 'string', required: true, label: 'Nome' }, company: { type: 'string' }, email: { type: 'email' },
    phone: { type: 'string', max: 40 }, website: { type: 'string' }, source: { type: 'string', max: 60 },
    status: { type: 'enum', values: stageKeys, label: 'Etapa' },
    priority: { type: 'enum', values: ['baixa', 'media', 'alta'], default: 'media', label: 'Prioridade' }, due_date: { type: 'date', label: 'Prazo' }, archived: { type: 'bool' },
    value: { type: 'number', min: 0, default: 0 }, notes: { type: 'text' },
    owner_id: { type: 'ref', table: 'users', label: 'Responsável' }
  },
  async beforeCreate(d, req) { d.status = d.status || await firstOpen(); d.priority = d.priority || 'media'; d.value = d.value ?? 0; d.owner_id = d.owner_id ?? req.user.id; },
  async afterSave(row, req, op) { if (op === 'create') await notify({ type: 'lead', pref: 'notify_leads', text: `Novo lead: ${row.name}`, link: '#/leads', exceptUserId: req.user.id }); }
});
// rotas específicas antes do CRUD genérico
r.post('/leads/import', async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 2000) : [];
  if (!rows.length) throw bad('Nenhuma linha para importar.');
  let created = 0; const skipped = [];
  await tx(async () => { for (let i = 0; i < rows.length; i++) { const x = rows[i];
    const name = String(x.name || '').trim();
    if (!name) { skipped.push(i + 1); continue; }
    await run('INSERT INTO leads(name,company,email,phone,website,source,value,notes,owner_id,status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      name.slice(0, 300), x.company || null, x.email || null, x.phone || null, x.website || null,
      x.source || 'importação', Number(x.value) || 0, x.notes || null, req.user.id, await firstOpen());
    created++;
  } });
  res.json({ created, skipped });
});
r.post('/leads/:id/stage', async (req, res) => {
  const { status } = req.body || {};
  if (!(await stageKeys()).includes(status)) throw bad('Etapa inválida.');
  const id = Number(req.params.id);
  const l = await get('SELECT * FROM leads WHERE id=?', id);
  if (!l) throw new HttpError(404, 'Lead não encontrado.');
  await run("UPDATE leads SET status=?, updated_at=datetime('now') WHERE id=?", status, id);
  if (l.status !== status) {
    await run('INSERT INTO activities(lead_id,type,text,user_id) VALUES (?,?,?,?)', id, 'etapa', `Etapa alterada: ${l.status} → ${status}`, req.user.id);
    if (await stageKind(status) === 'won') await notify({ type: 'lead', pref: 'notify_sales', text: `Oportunidade conquistada: ${l.name}`, link: '#/leads', exceptUserId: req.user.id });
  }
  res.json(await get('SELECT * FROM leads WHERE id=?', id));
});
r.get('/leads/:id/activities', async (req, res) =>
  res.json(await all(`SELECT a.*, u.name AS user_name FROM activities a LEFT JOIN users u ON u.id=a.user_id WHERE a.lead_id=? ORDER BY a.id DESC`, Number(req.params.id))));
r.post('/leads/:id/activities', async (req, res) => {
  const id = Number(req.params.id);
  if (!await get('SELECT id FROM leads WHERE id=?', id)) throw new HttpError(404, 'Lead não encontrado.');
  const text = String(req.body?.text || '').trim();
  const type = ['nota', 'ligacao', 'email', 'reuniao', 'whatsapp'].includes(req.body?.type) ? req.body.type : 'nota';
  if (!text) throw bad('Escreva o conteúdo da atividade.');
  const info = await run('INSERT INTO activities(lead_id,type,text,user_id) VALUES (?,?,?,?)', id, type, text.slice(0, 5000), req.user.id);
  res.status(201).json(await get('SELECT * FROM activities WHERE id=?', Number(info.lastInsertRowid)));
});
r.delete('/activities/:id', async (req, res) => {
  await run('DELETE FROM activities WHERE id=?', Number(req.params.id)); res.json({ ok: true });
});
// Converter lead em cliente (e opcionalmente registrar venda)
r.post('/leads/:id/convert', async (req, res) => {
  const id = Number(req.params.id);
  const l = await get('SELECT * FROM leads WHERE id=?', id);
  if (!l) throw new HttpError(404, 'Lead não encontrado.');
  const existing = await get('SELECT * FROM clients WHERE lead_id=?', id);
  if (existing) throw bad('Este lead já foi convertido em cliente.');
  const out = await tx(async () => {
    const c = await run("INSERT INTO clients(name,company,email,phone,notes,lead_id,stage) VALUES (?,?,?,?,?,?,'cliente')", l.name, l.company, l.email, l.phone, l.notes, id);
    const clientId = Number(c.lastInsertRowid);
    await run("UPDATE leads SET status=COALESCE((SELECT key FROM pipeline_stages WHERE kind='won' ORDER BY position LIMIT 1), status), updated_at=datetime('now') WHERE id=?", id);
    await run('INSERT INTO activities(lead_id,client_id,type,text,user_id) VALUES (?,?,?,?,?)', id, clientId, 'etapa', 'Lead convertido em cliente', req.user.id);
    let saleId = null;
    if (req.body?.createSale && l.value > 0) {
      const s = await run('INSERT INTO sales(client_id,description,amount,created_by) VALUES (?,?,?,?)', clientId, `Venda — ${l.company || l.name}`, l.value, req.user.id);
      saleId = Number(s.lastInsertRowid);
    }
    return { clientId, saleId };
  });
  res.status(201).json(out);
});
r.use('/leads', leads);

// ---- Clientes
const CLIENT_STAGES = ['lead', 'negociacao', 'proposta', 'cliente'];
r.get('/clients/summary', async (_req, res) => {
  const total = (await get('SELECT COUNT(*) n FROM clients')).n;
  const byStage = {}; for (const k of CLIENT_STAGES) byStage[k] = (await get('SELECT COUNT(*) n FROM clients WHERE stage=?', k)).n;
  const sales = await get("SELECT COUNT(*) n, COALESCE(SUM(amount),0) rev FROM sales WHERE status='pago' AND client_id IS NOT NULL");
  res.json({ total, byStage, emNegociacao: byStage.negociacao + byStage.proposta, fechados: byStage.cliente,
    conversao: total ? Math.round((byStage.cliente / total) * 100) : 0, receita: sales.rev, vendasPagas: sales.n });
});
r.use('/clients', crud({
  table: 'clients', alias: 'c', search: ['name', 'company', 'email', 'phone', 'document'], filters: ['stage'],
  select: `SELECT c.*,
    (SELECT COALESCE(SUM(amount),0) FROM sales s WHERE s.client_id=c.id AND s.status='pago') AS total_paid,
    (SELECT COALESCE(SUM(amount-cost),0) FROM sales s WHERE s.client_id=c.id AND s.status='pago') AS total_profit,
    (SELECT COUNT(*) FROM sales s WHERE s.client_id=c.id) AS sales_count,
    (SELECT COUNT(*) FROM projects p WHERE p.client_id=c.id) AS projects_count,
    (SELECT group_concat(p.name, ', ') FROM projects p WHERE p.client_id=c.id) AS project_names FROM clients c`,
  fields: {
    name: { type: 'string', required: true, label: 'Nome' }, company: { type: 'string' }, email: { type: 'email' },
    phone: { type: 'string', max: 40 }, document: { type: 'string', max: 30 }, address: { type: 'string', max: 500 }, notes: { type: 'text' },
    stage: { type: 'enum', values: CLIENT_STAGES, default: 'lead', label: 'Estágio' }
  },
  async beforeCreate(d) { d.stage = d.stage || 'lead'; }
}));

// ---- Tarefas
r.use('/tasks', crud({
  table: 'tasks', alias: 't', search: ['title', 'notes'], filters: ['done', 'priority', 'assignee_id'],
  select: `SELECT t.*, u.name AS assignee_name, l.name AS lead_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id LEFT JOIN leads l ON l.id=t.lead_id`,
  order: "t.done ASC, COALESCE(t.due_date,'9999') ASC, t.id DESC",
  fields: {
    title: { type: 'string', required: true, label: 'Título' }, due_date: { type: 'date', label: 'Prazo' },
    priority: { type: 'enum', values: ['baixa', 'media', 'alta'], default: 'media' }, done: { type: 'bool' },
    lead_id: { type: 'ref', table: 'leads', label: 'Lead' }, assignee_id: { type: 'ref', table: 'users', label: 'Responsável' }, notes: { type: 'text' }
  },
  async beforeCreate(d, req) { d.assignee_id = d.assignee_id ?? req.user.id; d.priority = d.priority || 'media'; },
  async afterSave(row, req, op) { if (op === 'create' && row.assignee_id && row.assignee_id !== req.user.id) await notify({ type: 'task', pref: 'notify_tasks', text: `Nova tarefa para você: ${row.title}`, link: '#/tarefas', only: [row.assignee_id] }); }
}));

// ---- Produtos
r.use('/products', crud({
  table: 'products', alias: 'p', search: ['name', 'description'], filters: ['type', 'active'],
  fields: {
    name: { type: 'string', required: true, label: 'Nome' }, type: { type: 'enum', values: ['servico', 'produto', 'assinatura', 'curso'], default: 'servico' },
    price: { type: 'number', min: 0, default: 0, label: 'Preço' }, description: { type: 'text' }, active: { type: 'bool' }
  },
  async beforeCreate(d) { d.type = d.type || 'servico'; d.price = d.price ?? 0; if (d.active === undefined) d.active = 1; }
}));

// ---- Vendas (projetos com custo, margem e entrega)
const SALE_VIEWS = {
  todas: '1=1',
  margem: "s.status<>'cancelado'",
  proxima: "s.status<>'cancelado' AND s.delivery_status='pendente' AND s.delivery_date IS NOT NULL AND s.delivery_date>=date('now') AND s.delivery_date<=date('now','+7 days')",
  atrasadas: "s.status<>'cancelado' AND s.delivery_status='pendente' AND s.delivery_date IS NOT NULL AND s.delivery_date<date('now')",
  entregues: "s.delivery_status='entregue'",
  sem_cliente: 's.client_id IS NULL'
};
const saleWhere = (req, view) => {
  const w = [SALE_VIEWS[view] || '1=1']; const p = [];
  if (req.query.q) { w.push("(s.description LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')"); const l = '%' + String(req.query.q).replace(/[\\%_]/g, '\\$&') + '%'; p.push(l, l); }
  if (req.query.status) { w.push('s.status=?'); p.push(req.query.status); }
  return [w.join(' AND '), p];
};
const SALE_FROM = 'FROM sales s LEFT JOIN clients c ON c.id=s.client_id';
r.get('/sales/summary', async (req, res) => {
  const [w, p] = saleWhere(req, req.query.view);
  const k = await get(`SELECT COALESCE(SUM(s.amount),0) fat, COALESCE(SUM(s.amount-s.cost),0) lucro, COUNT(*) n ${SALE_FROM} WHERE ${w} AND s.status='pago'`, ...p);
  const pend = (await get(`SELECT COALESCE(SUM(s.amount),0) v ${SALE_FROM} WHERE ${w} AND s.status='pendente'`, ...p)).v;
  const counts = {};
  for (const v of Object.keys(SALE_VIEWS)) { const [w2, p2] = saleWhere({ query: { q: req.query.q, status: req.query.status } }, v); counts[v] = (await get(`SELECT COUNT(*) n ${SALE_FROM} WHERE ${w2}`, ...p2)).n; }
  res.json({ faturamento: k.fat, lucro: k.lucro, margem: k.fat ? Math.round((k.lucro / k.fat) * 1000) / 10 : 0, ticket: k.n ? k.fat / k.n : 0, pagas: k.n, pendente: pend, counts,
    atrasadas: counts.atrasadas });
});
r.use('/sales', crud({
  table: 'sales', alias: 's', search: ['description'], filters: ['status', 'client_id', 'delivery_status'],
  select: `SELECT s.*, (s.amount - s.cost) AS profit, CASE WHEN s.amount>0 THEN ROUND(((s.amount-s.cost)*100.0/s.amount)::numeric,1) ELSE 0 END AS margin,
    c.name AS client_name, p.name AS product_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id LEFT JOIN products p ON p.id=s.product_id`,
  order: 's.sold_at DESC, s.id DESC',
  extraWhere: (req) => (req.query.view && SALE_VIEWS[req.query.view] ? [SALE_VIEWS[req.query.view]] : null),
  orderFor: (req) => (req.query.view === 'margem' ? 'CASE WHEN s.amount>0 THEN (s.amount-s.cost)*1.0/s.amount ELSE 0 END DESC, s.id DESC' : req.query.view === 'proxima' ? 's.delivery_date ASC' : req.query.view === 'atrasadas' ? 's.delivery_date ASC' : null),
  fields: {
    client_id: { type: 'ref', table: 'clients', label: 'Cliente' }, product_id: { type: 'ref', table: 'products', label: 'Produto' },
    description: { type: 'string', required: true, label: 'Descrição' }, amount: { type: 'number', min: 0, required: true, label: 'Valor' },
    cost: { type: 'number', min: 0, default: 0, label: 'Custo' },
    status: { type: 'enum', values: ['pendente', 'pago', 'cancelado'], default: 'pendente' },
    sold_at: { type: 'date', label: 'Data da venda' }, delivery_date: { type: 'date', label: 'Prazo de entrega' },
    delivery_status: { type: 'enum', values: ['pendente', 'entregue'], default: 'pendente', label: 'Entrega' }
  },
  async beforeCreate(d, req) {
    d.status = d.status || 'pendente'; d.cost = d.cost ?? 0; d.delivery_status = d.delivery_status || 'pendente';
    d.sold_at = d.sold_at || new Date().toISOString().slice(0, 10); d.created_by = req.user.id;
    if (d.cost > d.amount) throw bad('O custo não pode ser maior que o valor da venda.');
    if (d.status === 'pago') d.paid_at = d.sold_at;
  },
  async beforeUpdate(d, _req, old) {
    if ((d.cost ?? old.cost) > (d.amount ?? old.amount)) throw bad('O custo não pode ser maior que o valor da venda.');
  },
  async afterSave(row, req, op) {
    // mantém paid_at coerente com o status
    if (row.status === 'pago' && !row.paid_at) await run("UPDATE sales SET paid_at=date('now') WHERE id=?", row.id);
    if (row.status !== 'pago' && row.paid_at) await run('UPDATE sales SET paid_at=NULL WHERE id=?', row.id);
    if (row.status === 'pago' && (op === 'create' || req.prev?.status !== 'pago'))
      await notify({ type: 'sale', pref: 'notify_sales', text: `Venda paga: ${row.description} — R$ ${Number(row.amount).toFixed(2).replace('.', ',')}`, link: '#/vendas', exceptUserId: req.user.id });
  }
}));

// ---- Cursos e aulas
r.get('/courses', async (req, res) => {
  const q = req.query.q ? `%${String(req.query.q).replace(/[\\%_]/g, '\\$&')}%` : '%';
  res.json({ items: await all(`SELECT c.*,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lessons_count,
    (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE l.course_id=c.id AND p.user_id=?) AS done_count
    FROM courses c WHERE c.title LIKE ? ESCAPE '\\' ORDER BY c.id DESC`, req.user.id, q) });
});
r.get('/courses/:id/full', async (req, res) => {
  const id = Number(req.params.id);
  const course = await get('SELECT * FROM courses WHERE id=?', id);
  if (!course) throw new HttpError(404, 'Curso não encontrado.');
  const lessons = await all(`SELECT l.*, (SELECT 1 FROM lesson_progress p WHERE p.lesson_id=l.id AND p.user_id=?) AS completed
    FROM lessons l WHERE l.course_id=? ORDER BY l.position, l.id`, req.user.id, id);
  res.json({ ...course, lessons });
});
r.post('/lessons/:id/complete', async (req, res) => {
  const id = Number(req.params.id);
  if (!await get('SELECT id FROM lessons WHERE id=?', id)) throw new HttpError(404, 'Aula não encontrada.');
  const done = req.body?.completed !== false;
  if (done) await run('INSERT OR IGNORE INTO lesson_progress(user_id,lesson_id) VALUES (?,?)', req.user.id, id);
  else await run('DELETE FROM lesson_progress WHERE user_id=? AND lesson_id=?', req.user.id, id);
  res.json({ ok: true, completed: done });
});
r.use('/courses', crud({
  table: 'courses', alias: 'c', search: ['title', 'description'],
  fields: {
    title: { type: 'string', required: true, label: 'Título' }, description: { type: 'text' },
    level: { type: 'enum', values: ['iniciante', 'intermediario', 'avancado'], default: 'iniciante' }, published: { type: 'bool' }
  },
  async beforeCreate(d) { d.level = d.level || 'iniciante'; if (d.published === undefined) d.published = 1; }
}));
r.use('/lessons', crud({
  table: 'lessons', alias: 'l', search: ['title'], filters: ['course_id'], order: 'l.position, l.id',
  fields: {
    course_id: { type: 'ref', table: 'courses', required: true, label: 'Curso' }, title: { type: 'string', required: true, label: 'Título' },
    content: { type: 'text' }, video_url: { type: 'string', max: 500 }, position: { type: 'int', default: 0 }
  },
  async beforeCreate(d) { d.position = d.position ?? ((await get('SELECT COALESCE(MAX(position),0)+1 n FROM lessons WHERE course_id=?', d.course_id)).n); }
}));

module.exports = { router: r, stageKeys };
