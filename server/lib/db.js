/**
 * Camada de dados PostgreSQL.
 *  - Produção/Vercel: DATABASE_URL (Supabase/Postgres) via `pg`.
 *  - Desenvolvimento e testes: PGlite (Postgres em WASM, persistido em DATA_DIR/pgdata).
 * API assíncrona: all/get/run/tx. Escreva SQL com `?`; é convertido para $1, $2…
 * Datas são TEXT (UTC) no formato 'YYYY-MM-DD HH:MM:SS' / 'YYYY-MM-DD', compatíveis com o frontend.
 */
const fs = require('node:fs');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');

const als = new AsyncLocalStorage();
const NOW = "to_char(now() AT TIME ZONE 'utc','YYYY-MM-DD HH24:MI:SS')";
const TODAY = "to_char((now() AT TIME ZONE 'utc')::date,'YYYY-MM-DD')";
const ID_TABLES = new Set(['users', 'leads', 'clients', 'activities', 'tasks', 'products', 'sales', 'courses', 'lessons', 'projects', 'project_files',
  'pipeline_stages', 'notifications', 'library_items', 'play_items', 'saved_prompts', 'file_versions', 'ai_conversations', 'ai_usage', 'credit_ledger', 'play_suggestions', 'prospect_searches', 'site_versions', 'ai_calls', 'build_events', 'chats', 'potentials']);

// Tradução mínima de construções herdadas do SQLite + placeholders
function translate(sql) {
  let s = sql
    .replace(/datetime\('now'\)/gi, NOW)
    .replace(/datetime\('now',\s*'(-?\d+)\s*minutes?'\)/gi, (_m, n) => `to_char((now() AT TIME ZONE 'utc') + interval '${Number(n)} minute','YYYY-MM-DD HH24:MI:SS')`)
    .replace(/date\('now',\s*'([+-]?\d+)\s*days?'\)/gi, (_m, n) => `to_char((now() AT TIME ZONE 'utc')::date + ${Number(n)},'YYYY-MM-DD')`)
    .replace(/date\('now'\)/gi, TODAY)
    .replace(/group_concat\(/gi, 'string_agg(')
    .replace(/(?<![A-Za-z])LIKE\b/g, 'ILIKE');   // busca sem diferenciar maiúsculas, como no SQLite
  let ignore = false;
  if (/^\s*INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) { s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO'); ignore = true; }
  let out = '', n = 0, q = false;
  for (const ch of s) {
    if (ch === "'") q = !q;
    if (ch === '?' && !q) out += '$' + (++n); else out += ch;
  }
  if (ignore) out += ' ON CONFLICT DO NOTHING';
  return out;
}

let driver = null;
let readyPromise = null;

function pgDriver(url) {
  const { Pool, types } = require('pg');
  types.setTypeParser(20, (v) => Number(v));    // int8 (COUNT, bigint)
  types.setTypeParser(1700, (v) => Number(v));  // numeric (ROUND, AVG)
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 3 : 10), idleTimeoutMillis: 10000 });
  pool.on('error', (e) => console.error('[db] erro em conexão ociosa:', e.message));   // sem isto, um erro ocioso derruba o processo
  return {
    name: 'postgres',
    query: async (sql, params, client) => { const r = await (client || pool).query(sql, params); return { rows: r.rows, count: r.rowCount ?? 0 }; },
    exec: async (sql, client) => { await (client || pool).query(sql); },
    tx: async (fn) => {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const out = await fn(client); await client.query('COMMIT'); return out; }
      catch (e) { try { await client.query('ROLLBACK'); } catch { /* ignore */ } throw e; }
      finally { client.release(); }
    }
  };
}
function pgliteDriver(dataDir) {
  const { PGlite } = require('@electric-sql/pglite');
  const dir = dataDir === ':memory:' ? undefined : path.join(dataDir, 'pgdata');
  if (dir) fs.mkdirSync(dataDir, { recursive: true });
  const db = new PGlite(dir, { parsers: { 20: (v) => Number(v), 1700: (v) => Number(v) } });
  return {
    name: 'pglite',
    query: async (sql, params, client) => { const r = await (client || db).query(sql, params); return { rows: r.rows, count: r.affectedRows ?? r.rows.length }; },
    exec: async (sql, client) => { await (client || db).exec(sql); },
    tx: async (fn) => db.transaction(async (t) => fn(t))
  };
}

async function q(sql, params = []) {
  await ready();
  const client = als.getStore();
  const clean = params.map((p) => (p === undefined ? null : p));
  try { return await driver.query(translate(sql), clean, client); }
  catch (e) { e.sql = sql; throw e; }
}
async function all(sql, ...p) { return (await q(sql, p)).rows; }
async function get(sql, ...p) { return (await q(sql, p)).rows[0]; }
async function run(sql, ...p) {
  let s = sql; let returning = false;
  const m = /^\s*INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)/i.exec(sql);
  if (m && ID_TABLES.has(m[1].toLowerCase()) && !/RETURNING/i.test(sql)) { s = `${sql} RETURNING id`; returning = true; }
  const r = await q(s, p);
  return { changes: r.count, lastInsertRowid: returning ? r.rows[0]?.id : undefined };
}
/** Executa fn dentro de uma transação; queries feitas dentro dela (mesmo indiretamente) usam a mesma conexão. */
async function tx(fn) {
  await ready();
  if (als.getStore()) return fn();   // já dentro de uma transação
  return driver.tx((client) => als.run(client, fn));
}
const exec = async (sql) => { await ready(); await driver.exec(sql); };

// ---------------------------------------------------------------------------
// Esquema e migrações versionadas (apenas aditivas). Em Postgres gerenciado, os backups
// são do provedor (ex.: Supabase); migrações rodam sob advisory lock para evitar corrida entre instâncias.
// ---------------------------------------------------------------------------
const ID = 'INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY';
const TS = `TEXT NOT NULL DEFAULT (${NOW})`;
const DAY = `TEXT NOT NULL DEFAULT (${TODAY})`;
const REAL = 'DOUBLE PRECISION';

const MIGRATIONS = [{ v: 1, name: 'v1-esquema-completo', sql: `
CREATE TABLE IF NOT EXISTS users (id ${ID}, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
  active INTEGER NOT NULL DEFAULT 1, username TEXT, phone TEXT, plan TEXT NOT NULL DEFAULT 'member', credits INTEGER NOT NULL DEFAULT 100, created_at ${TS});
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL,
  created_at BIGINT, user_agent TEXT, ip TEXT);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS leads (id ${ID}, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, website TEXT, source TEXT, status TEXT NOT NULL DEFAULT 'novo',
  value ${REAL} NOT NULL DEFAULT 0, notes TEXT, owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL, priority TEXT NOT NULL DEFAULT 'media', due_date TEXT,
  archived INTEGER NOT NULL DEFAULT 0, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS clients (id ${ID}, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, document TEXT, address TEXT, notes TEXT,
  stage TEXT NOT NULL DEFAULT 'cliente', lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS activities (id ${ID}, lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'nota', text TEXT NOT NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at ${TS});
CREATE TABLE IF NOT EXISTS tasks (id ${ID}, title TEXT NOT NULL, due_date TEXT, priority TEXT NOT NULL DEFAULT 'media', done INTEGER NOT NULL DEFAULT 0,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL, assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL, notes TEXT, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS products (id ${ID}, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'servico', price ${REAL} NOT NULL DEFAULT 0, description TEXT,
  active INTEGER NOT NULL DEFAULT 1, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS sales (id ${ID}, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL, amount ${REAL} NOT NULL DEFAULT 0, cost ${REAL} NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pendente', sold_at ${DAY}, paid_at TEXT,
  delivery_date TEXT, delivery_status TEXT NOT NULL DEFAULT 'pendente', created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS courses (id ${ID}, title TEXT NOT NULL, description TEXT, level TEXT NOT NULL DEFAULT 'iniciante', published INTEGER NOT NULL DEFAULT 1, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS lessons (id ${ID}, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE, title TEXT NOT NULL, content TEXT, video_url TEXT,
  position INTEGER NOT NULL DEFAULT 0, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS lesson_progress (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at ${TS}, PRIMARY KEY (user_id, lesson_id));
CREATE TABLE IF NOT EXISTS projects (id ${ID}, name TEXT NOT NULL, description TEXT, kind TEXT NOT NULL DEFAULT 'site', slug TEXT NOT NULL UNIQUE, published INTEGER NOT NULL DEFAULT 0,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL, archived INTEGER NOT NULL DEFAULT 0, domain TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS project_files (id ${ID}, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, path TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
  updated_at ${TS}, UNIQUE(project_id, path));
CREATE TABLE IF NOT EXISTS pipeline_stages (id ${ID}, key TEXT NOT NULL UNIQUE, label TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'open' CHECK (kind IN ('open','won','lost')));
CREATE TABLE IF NOT EXISTS user_settings (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id, key));
CREATE TABLE IF NOT EXISTS notifications (id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, text TEXT NOT NULL, link TEXT,
  read INTEGER NOT NULL DEFAULT 0, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
CREATE TABLE IF NOT EXISTS plans (key TEXT PRIMARY KEY, name TEXT NOT NULL, rank INTEGER NOT NULL, tagline TEXT, benefits TEXT,
  ai_monthly_limit INTEGER NOT NULL DEFAULT 0, builder_monthly_limit INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS library_items (id ${ID}, kind TEXT NOT NULL CHECK (kind IN ('prompt','skill','animation','design')), title TEXT NOT NULL, category TEXT, summary TEXT,
  content TEXT NOT NULL DEFAULT '', min_plan TEXT NOT NULL DEFAULT 'member', niche TEXT, style TEXT, site_type TEXT, url TEXT, published INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS play_items (id ${ID}, title TEXT NOT NULL, description TEXT, category TEXT, video_url TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, created_at ${TS}, updated_at ${TS});
CREATE TABLE IF NOT EXISTS play_progress (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id INTEGER NOT NULL REFERENCES play_items(id) ON DELETE CASCADE,
  seen_at ${TS}, PRIMARY KEY (user_id, item_id));
CREATE TABLE IF NOT EXISTS saved_prompts (id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, mode TEXT NOT NULL, format TEXT NOT NULL,
  input TEXT NOT NULL, output TEXT NOT NULL, created_at ${TS});
CREATE TABLE IF NOT EXISTS file_versions (id ${ID}, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, path TEXT NOT NULL, content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'save', user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_versions ON file_versions(project_id, path, id);
CREATE TABLE IF NOT EXISTS ai_conversations (id ${ID}, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, content TEXT NOT NULL, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_aiconv ON ai_conversations(project_id, user_id, id);
CREATE TABLE IF NOT EXISTS ai_usage (id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_aiusage ON ai_usage(user_id, kind, created_at);
CREATE TABLE IF NOT EXISTS credit_ledger (id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, delta INTEGER NOT NULL, reason TEXT NOT NULL, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
INSERT INTO pipeline_stages(key,label,position,kind) VALUES ('novo','Novos contatos',1,'open'),('contato','Em contato',2,'open'),('proposta','Proposta enviada',3,'open'),
  ('negociacao','Em negociação',4,'open'),('ganho','Conquistados',5,'won'),('perdido','Perdidos',6,'lost') ON CONFLICT (key) DO NOTHING;
INSERT INTO plans(key,name,rank,tagline,benefits,ai_monthly_limit,builder_monthly_limit) VALUES
  ('member','Member',1,'Porta de entrada','CRM, vendas, sites e IDE
Biblioteca de recursos básicos
Assistente de IA com limite mensal',30,5),
  ('creator','Creator',2,'Círculo de criação','Tudo do Member
Recursos avançados da biblioteca
Mais gerações de IA e do Builder',150,25),
  ('elite','Elite',3,'Círculo elite','Tudo do Creator
Acesso a todos os recursos
Limites ampliados de IA e Builder',600,100) ON CONFLICT (key) DO NOTHING;
-- Segurança: o app acessa o banco com a role do DATABASE_URL (que ignora RLS). Habilitar RLS sem políticas
-- impede qualquer acesso pela API pública do Supabase (chaves anon/publishable) às tabelas.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated'; END IF;
END $$;
` }
, { v: 2, name: 'v2-sugestoes-play-e-buscas-salvas', sql: `
CREATE TABLE IF NOT EXISTS play_suggestions (id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, topic TEXT NOT NULL, outcome TEXT,
  status TEXT NOT NULL DEFAULT 'novo', created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_play_sug_user ON play_suggestions(user_id, created_at);
CREATE TABLE IF NOT EXISTS prospect_searches (id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, query TEXT, location TEXT, areas TEXT NOT NULL DEFAULT '[]',
  radius_km REAL, only_no_site INTEGER NOT NULL DEFAULT 0, min_rating REAL NOT NULL DEFAULT 0, found INTEGER NOT NULL DEFAULT 0, qualified INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0, no_site INTEGER NOT NULL DEFAULT 0, potential INTEGER, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_prospect_user ON prospect_searches(user_id, id);
ALTER TABLE public.play_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.play_suggestions, public.prospect_searches FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.play_suggestions, public.prospect_searches FROM authenticated'; END IF;
END $$;
` }
, { v: 3, name: 'v3-redefinicao-de-senha', sql: `
CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_resets(user_id);
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.password_resets FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.password_resets FROM authenticated'; END IF;
END $$;
` }
, { v: 4, name: 'v4-espacos-de-trabalho-por-conta', sql: `
ALTER TABLE users ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_leads_ws ON leads(ws);
CREATE INDEX IF NOT EXISTS idx_clients_ws ON clients(ws);
CREATE INDEX IF NOT EXISTS idx_tasks_ws ON tasks(ws);
CREATE INDEX IF NOT EXISTS idx_products_ws ON products(ws);
CREATE INDEX IF NOT EXISTS idx_sales_ws ON sales(ws);
CREATE INDEX IF NOT EXISTS idx_projects_ws ON projects(ws);
-- Contas do cadastro público (perfil 'student' da v anterior) passam a ter espaço próprio e funções completas.
UPDATE users SET ws=id, role='member' WHERE role='student';
` }
, { v: 5, name: 'v5-configuracoes-de-integracao-e-prospeccao-apify', sql: `
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', description TEXT, updated_at ${TS});
INSERT INTO app_settings(key, value, description) VALUES
  ('APIFY_API_TOKEN', '', 'Token da Apify usado na Prospecção (Google Maps Scraper). Troque aqui quando quiser.'),
  ('APIFY_MAX_PLACES', '', 'Máximo de empresas por área/busca. Vazio = sem limite (o máximo que o Google Maps mostrar).'),
  ('APIFY_MAX_USD_PER_RUN', '', 'Gasto máximo em US$ por área/busca na Apify. Vazio = sem limite.'),
  ('APIFY_SCRAPE_CONTACTS', 'true', 'true/false: buscar e-mails e redes sociais no site de cada empresa (custa a mais por empresa).'),
  ('RIVER_API_KEY', '', 'Chave da River (IA). Vazio = usa a variável de ambiente da Vercel.'),
  ('RIVER_MODEL', '', 'Modelo da River (ex.: deepseek-ai/DeepSeek-V4.1-Flash). Vazio = variável de ambiente.')
ON CONFLICT (key) DO NOTHING;
ALTER TABLE prospect_searches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done';
ALTER TABLE prospect_searches ADD COLUMN IF NOT EXISTS run_ids TEXT;
ALTER TABLE prospect_searches ADD COLUMN IF NOT EXISTS params TEXT;
ALTER TABLE prospect_searches ADD COLUMN IF NOT EXISTS results TEXT;
ALTER TABLE prospect_searches ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.app_settings FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.app_settings FROM authenticated'; END IF;
END $$;
` }
, { v: 6, name: 'v6-code-maker-sites-por-ia', sql: `
-- Code Maker: o site gerado por IA guardado como plano, partes (seções) e arquivos-fonte; o HTML montado vai para project_files.
CREATE TABLE IF NOT EXISTS code_sites (project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  brief TEXT NOT NULL DEFAULT '{}', plan TEXT, parts TEXT NOT NULL DEFAULT '{}', files TEXT NOT NULL DEFAULT '{}', html TEXT, pages_html TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planning', rev INTEGER NOT NULL DEFAULT 0, created_at ${TS}, updated_at ${TS});
CREATE INDEX IF NOT EXISTS idx_code_sites_user ON code_sites(user_id, created_at);
CREATE TABLE IF NOT EXISTS site_versions (id ${ID}, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL, instruction TEXT, actions TEXT NOT NULL DEFAULT '[]', plan TEXT, parts TEXT, files TEXT NOT NULL DEFAULT '{}', created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_site_versions ON site_versions(project_id, id);
ALTER TABLE public.code_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.code_sites, public.site_versions FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.code_sites, public.site_versions FROM authenticated'; END IF;
END $$;
` }
, { v: 7, name: 'v7-formularios-cliente-venda-site', sql: `
ALTER TABLE clients ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS site_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vercel_url TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_url TEXT;
` }
, { v: 8, name: 'v8-funil-por-conta', sql: `
-- Cada conta tem o seu funil (etapas com descrição e probabilidade).
ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS ws INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS probability INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_ws_key ON pipeline_stages(ws, key);
UPDATE pipeline_stages SET description='A conversa começa aqui', probability=10 WHERE key='novo' AND description IS NULL;
UPDATE pipeline_stages SET description='Problema e intenção claros', probability=25 WHERE key='contato' AND description IS NULL;
UPDATE pipeline_stages SET description='Uma solução na mesa', probability=50 WHERE key='proposta' AND description IS NULL;
UPDATE pipeline_stages SET description='Alinhando o próximo sim', probability=75 WHERE key='negociacao' AND description IS NULL;
UPDATE pipeline_stages SET description='Relações que viram projetos', probability=100 WHERE key='ganho' AND description IS NULL;
UPDATE pipeline_stages SET description='Aprendizados para o próximo', probability=0 WHERE key='perdido' AND description IS NULL;
INSERT INTO pipeline_stages(key, label, position, kind, ws, description, probability)
  SELECT s.key, s.label, s.position, s.kind, u.ws, s.description, s.probability FROM pipeline_stages s CROSS JOIN (SELECT DISTINCT ws FROM users WHERE ws <> 1) u WHERE s.ws = 1
  ON CONFLICT (ws, key) DO NOTHING;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id INTEGER;
` }
, { v: 9, name: 'v9-keys-de-acesso-e-planos-sem-limites', sql: `
UPDATE plans SET benefits = replace(replace(replace(benefits, 'Assistente de IA com limite mensal', 'Assistente de IA sem limites'), 'Mais gerações de IA e do Builder', 'IA e Builder sem limites'), 'Limites ampliados de IA e Builder', 'Prioridade em novos recursos');
CREATE TABLE IF NOT EXISTS access_keys (code TEXT PRIMARY KEY, plan TEXT NOT NULL, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at ${TS}, used_by INTEGER REFERENCES users(id) ON DELETE SET NULL, used_at TEXT);
ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.access_keys FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.access_keys FROM authenticated'; END IF;
END $$;
` }
, { v: 10, name: 'v10-beneficios-sem-mencao-a-limites', sql: `
UPDATE plans SET benefits = replace(replace(benefits, 'Assistente de IA sem limites', 'Assistente de IA'), 'IA e Builder sem limites', 'IA e Builder');
` }
, { v: 11, name: 'v11-medicao-de-chamadas-de-ia-e-ajustes-de-modelo', sql: `
CREATE TABLE IF NOT EXISTS ai_calls (id ${ID}, user_id INTEGER, kind TEXT NOT NULL, model TEXT, effort TEXT, provider_model TEXT, ms INTEGER,
  prompt_tokens INTEGER, completion_tokens INTEGER, reasoning_tokens INTEGER, ok INTEGER NOT NULL DEFAULT 1, note TEXT, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_ai_calls_created ON ai_calls(created_at);
ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.ai_calls FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.ai_calls FROM authenticated'; END IF;
END $$;
INSERT INTO app_settings(key, value, description) VALUES
  ('NEVA_MODEL_MAP', '', 'JSON com o modelo da River de cada nome público, ex.: {"neva-1-0":"modelo-rapido","neva-1-2":"modelo-padrao","neva-1-5":"modelo-maior"}. Vazio = todos usam RIVER_MODEL.'),
  ('RIVER_REASONING', '', 'Parâmetro nativo de raciocínio aceito pela River: vazio (nenhum), reasoning_effort, reasoning ou thinking.'),
  ('QA_TOKEN', '', 'Token temporário da sonda de testes de IA (/api/qa/ai-probe). Vazio = sonda desligada.')
ON CONFLICT (key) DO NOTHING;
` }
, { v: 12, name: 'v12-telemetria-do-builder-por-site', sql: `
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS site_id INTEGER;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS finish_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_calls_site ON ai_calls(site_id);
CREATE TABLE IF NOT EXISTS build_events (id ${ID}, site_id INTEGER NOT NULL, user_id INTEGER, stage TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'done', ms INTEGER, detail TEXT, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_build_events_site ON build_events(site_id);
ALTER TABLE public.build_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.build_events FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.build_events FROM authenticated'; END IF;
END $$;
` }, { v: 13, name: 'v13-imagens-enviadas-pelo-cliente', sql: `
CREATE TABLE IF NOT EXISTS site_images (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, ws INTEGER NOT NULL DEFAULT 1, name TEXT, mime TEXT NOT NULL, data TEXT NOT NULL, bytes INTEGER NOT NULL DEFAULT 0, created_at ${TS});
CREATE INDEX IF NOT EXISTS idx_site_images_user ON site_images(user_id);
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.site_images FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.site_images FROM authenticated'; END IF;
END $$;
` }, { v: 14, name: 'v14-chat-com-ia', sql: `
CREATE TABLE IF NOT EXISTS chats (id ${ID}, user_id INTEGER NOT NULL, title TEXT NOT NULL DEFAULT 'Nova conversa', messages TEXT NOT NULL DEFAULT '[]', created_at ${TS}, updated_at ${TS});
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.chats FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.chats FROM authenticated'; END IF;
END $$;
` }, { v: 15, name: 'v15-potenciais', sql: `
CREATE TABLE IF NOT EXISTS potentials (id ${ID}, ws INTEGER NOT NULL DEFAULT 1, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, phone TEXT, store TEXT,
  value ${REAL} NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'aberta', lead_id INTEGER, client_id INTEGER, created_at ${TS}, updated_at ${TS});
CREATE INDEX IF NOT EXISTS idx_potentials_user ON potentials(user_id, status);
ALTER TABLE public.potentials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.potentials FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.potentials FROM authenticated'; END IF;
END $$;
` }];

async function migrate() {
  await driver.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const lock = driver.name === 'postgres';
  const run1 = async (client) => {
    const cur = Number((await driver.query("SELECT value FROM meta WHERE key='schema_version'", [], client)).rows[0]?.value || 0);
    for (const m of MIGRATIONS.filter((x) => x.v > cur)) {
      await driver.exec(m.sql, client);
      await driver.query("INSERT INTO meta(key,value) VALUES ('schema_version',$1) ON CONFLICT (key) DO UPDATE SET value=excluded.value", [String(m.v)], client);
      console.log(`[db] migração ${m.name} aplicada (${driver.name})`);
    }
  };
  if (lock) await driver.tx(async (client) => { await driver.query('SELECT pg_advisory_xact_lock(727274)', [], client); await run1(client); });
  else await driver.tx(async (client) => run1(client));
}

function ready() {
  readyPromise ||= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url && process.env.VERCEL) throw new Error('DATABASE_URL não configurada. Defina a string de conexão do Postgres (Supabase, pooler em modo transaction) nas variáveis de ambiente da Vercel.');
    driver = url ? pgDriver(url) : pgliteDriver(process.env.DATA_DIR === ':memory:' ? ':memory:' : path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data')));
    await migrate();
    return driver.name;
  })();
  // Se a inicialização falhar (ex.: DATABASE_URL ausente/inválida), não guarda a falha para sempre: a próxima requisição tenta de novo.
  readyPromise.catch((e) => { console.error('[db] falha na inicialização:', e.message); readyPromise = null; driver = null; });
  return readyPromise;
}
const close = async () => { /* pool é encerrado pelo processo */ };
module.exports = { all, get, run, tx, exec, ready, close, NOW, TODAY, translate, MIGRATIONS };
