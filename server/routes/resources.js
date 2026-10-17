const express = require('express');
const { crud } = require('../lib/crud');
const { all, get, run, tx } = require('../lib/db');
const { HttpError, bad, wrap } = require('../lib/http');

const LEAD_STAGES = ['novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido'];
const r = express.Router();

// ---- Leads / Pipeline
const leads = crud({
  table: 'leads', alias: 'l',
  select: 'SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id=l.owner_id',
  search: ['name', 'company', 'email', 'phone'], filters: ['status', 'owner_id', 'source'],
  fields: {
    name: { type: 'string', required: true, label: 'Nome' }, company: { type: 'string' }, email: { type: 'email' },
    phone: { type: 'string', max: 40 }, website: { type: 'string' }, source: { type: 'string', max: 60 },
    status: { type: 'enum', values: LEAD_STAGES, default: 'novo', label: 'Etapa' },
    value: { type: 'number', min: 0, default: 0 }, notes: { type: 'text' },
    owner_id: { type: 'ref', table: 'users', label: 'Responsável' }
  },
  beforeCreate(d, req) { d.status = d.status || 'novo'; d.value = d.value ?? 0; d.owner_id = d.owner_id ?? req.user.id; }
});
// rotas específicas antes do CRUD genérico
r.post('/leads/import', wrap((req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 2000) : [];
  if (!rows.length) throw bad('Nenhuma linha para importar.');
  let created = 0; const skipped = [];
  tx(() => rows.forEach((x, i) => {
    const name = String(x.name || '').trim();
    if (!name) { skipped.push(i + 1); return; }
    run('INSERT INTO leads(name,company,email,phone,website,source,value,notes,owner_id) VALUES (?,?,?,?,?,?,?,?,?)',
      name.slice(0, 300), x.company || null, x.email || null, x.phone || null, x.website || null,
      x.source || 'importação', Number(x.value) || 0, x.notes || null, req.user.id);
    created++;
  }));
  res.json({ created, skipped });
}));
r.post('/leads/:id/stage', wrap((req, res) => {
  const { status } = req.body || {};
  if (!LEAD_STAGES.includes(status)) throw bad('Etapa inválida.');
  const id = Number(req.params.id);
  const l = get('SELECT * FROM leads WHERE id=?', id);
  if (!l) throw new HttpError(404, 'Lead não encontrado.');
  run("UPDATE leads SET status=?, updated_at=datetime('now') WHERE id=?", status, id);
  if (l.status !== status) run('INSERT INTO activities(lead_id,type,text,user_id) VALUES (?,?,?,?)', id, 'etapa', `Etapa alterada: ${l.status} → ${status}`, req.user.id);
  res.json(get('SELECT * FROM leads WHERE id=?', id));
}));
r.get('/leads/:id/activities', (req, res) =>
  res.json(all(`SELECT a.*, u.name AS user_name FROM activities a LEFT JOIN users u ON u.id=a.user_id WHERE a.lead_id=? ORDER BY a.id DESC`, Number(req.params.id))));
r.post('/leads/:id/activities', wrap((req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM leads WHERE id=?', id)) throw new HttpError(404, 'Lead não encontrado.');
  const text = String(req.body?.text || '').trim();
  const type = ['nota', 'ligacao', 'email', 'reuniao', 'whatsapp'].includes(req.body?.type) ? req.body.type : 'nota';
  if (!text) throw bad('Escreva o conteúdo da atividade.');
  const info = run('INSERT INTO activities(lead_id,type,text,user_id) VALUES (?,?,?,?)', id, type, text.slice(0, 5000), req.user.id);
  res.status(201).json(get('SELECT * FROM activities WHERE id=?', Number(info.lastInsertRowid)));
}));
r.delete('/activities/:id', wrap((req, res) => {
  run('DELETE FROM activities WHERE id=?', Number(req.params.id)); res.json({ ok: true });
}));
// Converter lead em cliente (e opcionalmente registrar venda)
r.post('/leads/:id/convert', wrap((req, res) => {
  const id = Number(req.params.id);
  const l = get('SELECT * FROM leads WHERE id=?', id);
  if (!l) throw new HttpError(404, 'Lead não encontrado.');
  const existing = get('SELECT * FROM clients WHERE lead_id=?', id);
  if (existing) throw bad('Este lead já foi convertido em cliente.');
  const out = tx(() => {
    const c = run('INSERT INTO clients(name,company,email,phone,notes,lead_id) VALUES (?,?,?,?,?,?)', l.name, l.company, l.email, l.phone, l.notes, id);
    const clientId = Number(c.lastInsertRowid);
    run("UPDATE leads SET status='ganho', updated_at=datetime('now') WHERE id=?", id);
    run('INSERT INTO activities(lead_id,client_id,type,text,user_id) VALUES (?,?,?,?,?)', id, clientId, 'etapa', 'Lead convertido em cliente', req.user.id);
    let saleId = null;
    if (req.body?.createSale && l.value > 0) {
      const s = run('INSERT INTO sales(client_id,description,amount,created_by) VALUES (?,?,?,?)', clientId, `Venda — ${l.company || l.name}`, l.value, req.user.id);
      saleId = Number(s.lastInsertRowid);
    }
    return { clientId, saleId };
  });
  res.status(201).json(out);
}));
r.use('/leads', leads);

// ---- Clientes
r.use('/clients', crud({
  table: 'clients', alias: 'c', search: ['name', 'company', 'email', 'phone', 'document'],
  select: `SELECT c.*, (SELECT COALESCE(SUM(amount),0) FROM sales s WHERE s.client_id=c.id AND s.status='pago') AS total_paid,
           (SELECT COUNT(*) FROM sales s WHERE s.client_id=c.id) AS sales_count FROM clients c`,
  fields: {
    name: { type: 'string', required: true, label: 'Nome' }, company: { type: 'string' }, email: { type: 'email' },
    phone: { type: 'string', max: 40 }, document: { type: 'string', max: 30 }, address: { type: 'string', max: 500 }, notes: { type: 'text' }
  }
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
  beforeCreate(d, req) { d.assignee_id = d.assignee_id ?? req.user.id; d.priority = d.priority || 'media'; }
}));

// ---- Produtos
r.use('/products', crud({
  table: 'products', alias: 'p', search: ['name', 'description'], filters: ['type', 'active'],
  fields: {
    name: { type: 'string', required: true, label: 'Nome' }, type: { type: 'enum', values: ['servico', 'produto', 'assinatura', 'curso'], default: 'servico' },
    price: { type: 'number', min: 0, default: 0, label: 'Preço' }, description: { type: 'text' }, active: { type: 'bool' }
  },
  beforeCreate(d) { d.type = d.type || 'servico'; d.price = d.price ?? 0; if (d.active === undefined) d.active = 1; }
}));

// ---- Vendas
r.use('/sales', crud({
  table: 'sales', alias: 's', search: ['description'], filters: ['status', 'client_id'],
  select: `SELECT s.*, c.name AS client_name, p.name AS product_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id LEFT JOIN products p ON p.id=s.product_id`,
  order: 's.sold_at DESC, s.id DESC',
  fields: {
    client_id: { type: 'ref', table: 'clients', label: 'Cliente' }, product_id: { type: 'ref', table: 'products', label: 'Produto' },
    description: { type: 'string', required: true, label: 'Descrição' }, amount: { type: 'number', min: 0, required: true, label: 'Valor' },
    status: { type: 'enum', values: ['pendente', 'pago', 'cancelado'], default: 'pendente' },
    sold_at: { type: 'date', label: 'Data da venda' }
  },
  beforeCreate(d, req) {
    d.status = d.status || 'pendente'; d.sold_at = d.sold_at || new Date().toISOString().slice(0, 10); d.created_by = req.user.id;
    if (d.status === 'pago') d.paid_at = d.sold_at;
  },
  afterSave(row) {
    // mantém paid_at coerente com o status
    if (row.status === 'pago' && !row.paid_at) run("UPDATE sales SET paid_at=date('now') WHERE id=?", row.id);
    if (row.status !== 'pago' && row.paid_at) run('UPDATE sales SET paid_at=NULL WHERE id=?', row.id);
  }
}));

// ---- Cursos e aulas
r.get('/courses', (req, res) => {
  const q = req.query.q ? `%${String(req.query.q).replace(/[\\%_]/g, '\\$&')}%` : '%';
  res.json({ items: all(`SELECT c.*,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lessons_count,
    (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE l.course_id=c.id AND p.user_id=?) AS done_count
    FROM courses c WHERE c.title LIKE ? ESCAPE '\\' ORDER BY c.id DESC`, req.user.id, q) });
});
r.get('/courses/:id/full', wrap((req, res) => {
  const id = Number(req.params.id);
  const course = get('SELECT * FROM courses WHERE id=?', id);
  if (!course) throw new HttpError(404, 'Curso não encontrado.');
  const lessons = all(`SELECT l.*, (SELECT 1 FROM lesson_progress p WHERE p.lesson_id=l.id AND p.user_id=?) AS completed
    FROM lessons l WHERE l.course_id=? ORDER BY l.position, l.id`, req.user.id, id);
  res.json({ ...course, lessons });
}));
r.post('/lessons/:id/complete', wrap((req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM lessons WHERE id=?', id)) throw new HttpError(404, 'Aula não encontrada.');
  const done = req.body?.completed !== false;
  if (done) run('INSERT OR IGNORE INTO lesson_progress(user_id,lesson_id) VALUES (?,?)', req.user.id, id);
  else run('DELETE FROM lesson_progress WHERE user_id=? AND lesson_id=?', req.user.id, id);
  res.json({ ok: true, completed: done });
}));
r.use('/courses', crud({
  table: 'courses', alias: 'c', search: ['title', 'description'],
  fields: {
    title: { type: 'string', required: true, label: 'Título' }, description: { type: 'text' },
    level: { type: 'enum', values: ['iniciante', 'intermediario', 'avancado'], default: 'iniciante' }, published: { type: 'bool' }
  },
  beforeCreate(d) { d.level = d.level || 'iniciante'; if (d.published === undefined) d.published = 1; }
}));
r.use('/lessons', crud({
  table: 'lessons', alias: 'l', search: ['title'], filters: ['course_id'], order: 'l.position, l.id',
  fields: {
    course_id: { type: 'ref', table: 'courses', required: true, label: 'Curso' }, title: { type: 'string', required: true, label: 'Título' },
    content: { type: 'text' }, video_url: { type: 'string', max: 500 }, position: { type: 'int', default: 0 }
  },
  beforeCreate(d) { d.position = d.position ?? (get('SELECT COALESCE(MAX(position),0)+1 n FROM lessons WHERE course_id=?', d.course_id).n); }
}));

module.exports = { router: r, LEAD_STAGES };
