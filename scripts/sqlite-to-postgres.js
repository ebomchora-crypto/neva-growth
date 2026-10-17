#!/usr/bin/env node
/**
 * Importa os dados de um banco SQLite antigo da Neva Growth (versões anteriores) para o Postgres atual.
 *   node scripts/sqlite-to-postgres.js caminho/neva.db            (usa DATABASE_URL, ou PGlite em DATA_DIR)
 * Preserva ids e relacionamentos. O destino deve estar com o esquema criado e SEM dados de usuários.
 */
const { DatabaseSync } = require('node:sqlite');
const db = require('../server/lib/db');

const ORDER = ['users', 'pipeline_stages', 'plans', 'leads', 'clients', 'activities', 'tasks', 'products', 'sales', 'courses', 'lessons', 'lesson_progress',
  'projects', 'project_files', 'file_versions', 'library_items', 'play_items', 'play_progress', 'saved_prompts', 'ai_conversations', 'ai_usage', 'credit_ledger',
  'notifications', 'user_settings', 'sessions'];
const SKIP_SESSIONS = true;      // sessões antigas não são migradas: todos entram de novo
const REPLACE = new Set(['pipeline_stages', 'plans', 'library_items']);   // tabelas com seed: substitui pelo conteúdo antigo

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('Uso: node scripts/sqlite-to-postgres.js caminho/neva.db'); process.exit(1); }
  const src = new DatabaseSync(file, { readOnly: true });
  await db.ready();
  if ((await db.get('SELECT COUNT(*) n FROM users')).n > 0) { console.error('O destino já tem usuários; abortando para não misturar dados.'); process.exit(2); }
  const srcTables = new Set(src.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));
  const report = {};
  await db.tx(async () => {
    for (const t of ORDER) {
      if (!srcTables.has(t) || (t === 'sessions' && SKIP_SESSIONS)) continue;
      const rows = src.prepare(`SELECT * FROM ${t}`).all();
      if (REPLACE.has(t)) await db.run(`DELETE FROM ${t}`);
      const dstCols = new Set((await db.all("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=?", t)).map((r) => r.column_name));
      let n = 0;
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => dstCols.has(c));
        await db.run(`INSERT INTO ${t}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')}) ON CONFLICT DO NOTHING`, ...cols.map((c) => row[c]));
        n++;
      }
      if (dstCols.has('id') && rows.length) await db.run(`SELECT setval(pg_get_serial_sequence('${t}','id'), (SELECT COALESCE(MAX(id),1) FROM ${t}))`);
      report[t] = n;
    }
  });
  console.log('Importação concluída:', report);
  process.exit(0);
})().catch((e) => { console.error('Falhou (nada foi gravado):', e.message); process.exit(1); });
