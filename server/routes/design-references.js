const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { HttpError } = require('../lib/http');
const catalog = require('../lib/design-references/catalog.json');

// Capturas do hero do site real (geradas por scripts/capture-heroes.js); ficam à parte para uma nova importação do catálogo não apagá-las.
let heroes = {};
try { heroes = require('../lib/design-references/heroes.json'); } catch { /* ainda sem capturas */ }
const withHero = (item) => { const h = heroes[item.id]; return h ? { ...item, url: item.url || h.url, hero: { ...item.hero, screenshot: item.hero?.screenshot || h.shot } } : item; };
const items = catalog.map(withHero);

const r = express.Router();
const byId = new Map(items.map((item) => [item.id, item]));
const files = path.join(__dirname, '..', 'lib', 'design-references', 'files');

r.get('/', (_req, res) => res.json({ items, total: items.length }));
r.get('/:id', (req, res) => {
  const item = byId.get(req.params.id);
  if (!item) throw new HttpError(404, 'Referência não encontrada.');
  const content = fs.readFileSync(path.join(files, item.file), 'utf8');
  res.json({ ...item, content });
});

module.exports = r;
