const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { HttpError } = require('../lib/http');
const catalog = require('../lib/design-references/catalog.json');

const r = express.Router();
const byId = new Map(catalog.map((item) => [item.id, item]));
const files = path.join(__dirname, '..', 'lib', 'design-references', 'files');

r.get('/', (_req, res) => res.json({ items: catalog, total: catalog.length }));
r.get('/:id', (req, res) => {
  const item = byId.get(req.params.id);
  if (!item) throw new HttpError(404, 'Referência não encontrada.');
  const content = fs.readFileSync(path.join(files, item.file), 'utf8');
  res.json({ ...item, content });
});

module.exports = r;
