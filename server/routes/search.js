const express = require('express');
const { all } = require('../lib/db');
const S = require('../lib/services');
const r = express.Router();

// Busca global (paleta de comandos)
r.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ groups: [] });
  const l = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
  const E = " ESCAPE '\\'";
  const groups = [
    { label: 'Leads', items: all(`SELECT id, name AS title, COALESCE(company,email,phone,'') AS sub FROM leads WHERE (name LIKE ?${E} OR company LIKE ?${E} OR email LIKE ?${E} OR phone LIKE ?${E}) AND archived=0 LIMIT 5`, l, l, l, l).map((x) => ({ ...x, link: '#/leads' })) },
    { label: 'Clientes', items: all(`SELECT id, name AS title, COALESCE(company,email,phone,'') AS sub FROM clients WHERE name LIKE ?${E} OR company LIKE ?${E} OR email LIKE ?${E} OR phone LIKE ?${E} LIMIT 5`, l, l, l, l).map((x) => ({ ...x, link: '#/clientes' })) },
    { label: 'Vendas', items: all(`SELECT id, description AS title, status AS sub FROM sales WHERE description LIKE ?${E} LIMIT 5`, l).map((x) => ({ ...x, link: '#/vendas' })) },
    { label: 'Projetos e sites', items: all(`SELECT id, name AS title, COALESCE(domain,slug) AS sub FROM projects WHERE name LIKE ?${E} OR domain LIKE ?${E} LIMIT 5`, l, l).map((x) => ({ ...x, link: `#/ide/${x.id}` })) },
    { label: 'Tarefas', items: all(`SELECT id, title, COALESCE(due_date,'') AS sub FROM tasks WHERE title LIKE ?${E} LIMIT 5`, l).map((x) => ({ ...x, link: '#/tarefas' })) },
    { label: 'Biblioteca', items: all(`SELECT id, title, kind AS sub FROM library_items WHERE published=1 AND (title LIKE ?${E} OR summary LIKE ?${E}) LIMIT 5`, l, l).map((x) => ({ ...x, link: '#/acervo' })) }
  ].filter((g) => g.items.length);
  res.json({ groups });
});
module.exports = r;
