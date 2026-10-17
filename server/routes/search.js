const express = require('express');
const { all } = require('../lib/db');
const r = express.Router();

// Busca global (paleta de comandos)
r.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ groups: [] });
  const l = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
  const E = " ESCAPE '\\'";
  const find = async (label, sql, params, link) => ({ label, items: (await all(sql, ...params)).map((x) => ({ ...x, link: typeof link === 'function' ? link(x) : link })) });
  const groups = (await Promise.all([
    find('Leads', `SELECT id, name AS title, COALESCE(company,email,phone,'') AS sub FROM leads WHERE (name LIKE ?${E} OR company LIKE ?${E} OR email LIKE ?${E} OR phone LIKE ?${E}) AND archived=0 LIMIT 5`, [l, l, l, l], '#/leads'),
    find('Clientes', `SELECT id, name AS title, COALESCE(company,email,phone,'') AS sub FROM clients WHERE name LIKE ?${E} OR company LIKE ?${E} OR email LIKE ?${E} OR phone LIKE ?${E} LIMIT 5`, [l, l, l, l], '#/clientes'),
    find('Vendas', `SELECT id, description AS title, status AS sub FROM sales WHERE description LIKE ?${E} LIMIT 5`, [l], '#/vendas'),
    find('Projetos e sites', `SELECT id, name AS title, COALESCE(domain,slug) AS sub FROM projects WHERE name LIKE ?${E} OR domain LIKE ?${E} LIMIT 5`, [l, l], (x) => `#/ide/${x.id}`),
    find('Tarefas', `SELECT id, title, COALESCE(due_date,'') AS sub FROM tasks WHERE title LIKE ?${E} LIMIT 5`, [l], '#/tarefas'),
    find('Biblioteca', `SELECT id, title, kind AS sub FROM library_items WHERE published=1 AND (title LIKE ?${E} OR summary LIKE ?${E}) LIMIT 5`, [l, l], '#/acervo')
  ])).filter((g) => g.items.length);
  res.json({ groups });
});
module.exports = r;
