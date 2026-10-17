const express = require('express');
const { all, get, run } = require('./db');
const { HttpError, bad, wrap } = require('./http');

/**
 * Fábrica de CRUD declarativo.
 * fields: { col: { type: 'string'|'text'|'number'|'int'|'bool'|'date'|'enum'|'ref', required, max, values, min } }
 */
function coerce(name, f, v) {
  const empty = v === undefined || v === null || v === '';
  if (empty) {
    if (f.required) throw bad(`Campo obrigatório: ${f.label || name}.`);
    return f.type === 'bool' ? 0 : f.default ?? null;
  }
  switch (f.type) {
    case 'string': case 'text': {
      const s = String(v).trim();
      if (s.length > (f.max || (f.type === 'text' ? 20000 : 300))) throw bad(`${f.label || name} muito longo.`);
      if (f.required && !s) throw bad(`Campo obrigatório: ${f.label || name}.`);
      return s;
    }
    case 'number': {
      const n = Number(v); if (!Number.isFinite(n)) throw bad(`${f.label || name} deve ser numérico.`);
      if (f.min !== undefined && n < f.min) throw bad(`${f.label || name} deve ser ≥ ${f.min}.`);
      return n;
    }
    case 'int': case 'ref': {
      const n = Number(v); if (!Number.isInteger(n)) throw bad(`${f.label || name} inválido.`); return n;
    }
    case 'bool': return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
    case 'date': {
      const s = String(v); if (!/^\d{4}-\d{2}-\d{2}/.test(s)) throw bad(`${f.label || name}: data inválida.`); return s.slice(0, 10);
    }
    case 'enum': {
      if (!f.values.includes(v)) throw bad(`${f.label || name}: valor inválido.`); return v;
    }
    case 'email': {
      const s = String(v).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad('E-mail inválido.'); return s;
    }
    default: return v;
  }
}

function crud(cfg) {
  const r = express.Router();
  const { table, fields, search = [], alias = 't', select, filters = [], order = `${alias}.id DESC`, touch = true } = cfg;
  const base = select || `SELECT ${alias}.* FROM ${table} ${alias}`;
  const names = Object.keys(fields);

  function parse(body, partial) {
    const out = {};
    for (const n of names) {
      if (partial && !(n in body)) continue;
      out[n] = coerce(n, fields[n], body[n]);
    }
    return out;
  }
  async function checkRefs(data) {
    for (const n of names) if (fields[n].type === 'ref' && data[n] != null && fields[n].table) {
      if (!get(`SELECT id FROM ${fields[n].table} WHERE id=?`, data[n])) throw bad(`${fields[n].label || n}: registro não encontrado.`);
    }
  }

  r.get('/', wrap((req, res) => {
    const where = []; const p = [];
    if (req.query.q && search.length) {
      where.push('(' + search.map((c) => `${alias}.${c} LIKE ? ESCAPE '\\'`).join(' OR ') + ')');
      const like = '%' + String(req.query.q).replace(/[\\%_]/g, '\\$&') + '%';
      search.forEach(() => p.push(like));
    }
    for (const f of filters) if (req.query[f] !== undefined && req.query[f] !== '') {
      where.push(`${alias}.${f} = ?`); p.push(req.query[f]);
    }
    const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 1000);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const total = get(`SELECT COUNT(*) n FROM (${base}${w})`, ...p).n;
    const items = all(`${base}${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...p, limit, (page - 1) * limit);
    res.json({ items, total, page, limit });
  }));

  r.get('/:id', wrap((req, res) => {
    const row = get(`${base} WHERE ${alias}.id=?`, Number(req.params.id));
    if (!row) throw new HttpError(404, 'Registro não encontrado.');
    res.json(row);
  }));

  r.post('/', wrap(async (req, res) => {
    const data = parse(req.body || {}, false);
    if (cfg.beforeCreate) cfg.beforeCreate(data, req);
    await checkRefs(data);
    const cols = Object.keys(data);
    const info = run(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, ...cols.map((c) => data[c]));
    const row = get(`${base} WHERE ${alias}.id=?`, Number(info.lastInsertRowid));
    if (cfg.afterSave) cfg.afterSave(row, req, 'create');
    res.status(201).json(row);
  }));

  r.put('/:id', wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!get(`SELECT id FROM ${table} WHERE id=?`, id)) throw new HttpError(404, 'Registro não encontrado.');
    const data = parse(req.body || {}, true);
    await checkRefs(data);
    const cols = Object.keys(data);
    if (cols.length) {
      const set = cols.map((c) => `${c}=?`).join(',') + (touch ? ",updated_at=datetime('now')" : '');
      run(`UPDATE ${table} SET ${set} WHERE id=?`, ...cols.map((c) => data[c]), id);
    }
    const row = get(`${base} WHERE ${alias}.id=?`, id);
    if (cfg.afterSave) cfg.afterSave(row, req, 'update');
    res.json(row);
  }));

  r.delete('/:id', wrap((req, res) => {
    const id = Number(req.params.id);
    const info = run(`DELETE FROM ${table} WHERE id=?`, id);
    if (!info.changes) throw new HttpError(404, 'Registro não encontrado.');
    res.json({ ok: true });
  }));
  return r;
}
module.exports = { crud, coerce };
