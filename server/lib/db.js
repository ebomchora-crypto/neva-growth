const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'));
fs.mkdirSync(dataDir, { recursive: true });
const file = process.env.DB_FILE || path.join(dataDir, 'neva.db');
const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, website TEXT,
  source TEXT, status TEXT NOT NULL DEFAULT 'novo', value REAL NOT NULL DEFAULT 0, notes TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, document TEXT,
  address TEXT, notes TEXT, lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY, lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, type TEXT NOT NULL DEFAULT 'nota',
  text TEXT NOT NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, due_date TEXT, priority TEXT NOT NULL DEFAULT 'media',
  done INTEGER NOT NULL DEFAULT 0, lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'servico', price REAL NOT NULL DEFAULT 0,
  description TEXT, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pendente', sold_at TEXT NOT NULL DEFAULT (date('now')),
  paid_at TEXT, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT, level TEXT NOT NULL DEFAULT 'iniciante',
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, content TEXT, video_url TEXT, position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT, kind TEXT NOT NULL DEFAULT 'site',
  slug TEXT NOT NULL UNIQUE, published INTEGER NOT NULL DEFAULT 0, owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, path)
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
`);


// ---------------------------------------------------------------------------
// Migrações versionadas. Só adicionam colunas/tabelas (nunca removem dados).
// Antes de aplicar migrações pendentes em um banco que já tem usuários, é feito um backup consistente
// (VACUUM INTO) em <DATA_DIR>/backups/.
// ---------------------------------------------------------------------------
db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
const hasCol = (t, c) => db.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === c);
const addCol = (t, c, def) => { if (!hasCol(t, c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };

const MIGRATIONS = [
  { v: 2, name: 'v2-referencias', up() {
    addCol('sales', 'cost', 'REAL NOT NULL DEFAULT 0');
    addCol('sales', 'delivery_date', 'TEXT');
    addCol('sales', 'delivery_status', "TEXT NOT NULL DEFAULT 'pendente'");
    addCol('clients', 'stage', "TEXT NOT NULL DEFAULT 'cliente'");
    addCol('projects', 'archived', 'INTEGER NOT NULL DEFAULT 0');
    addCol('projects', 'domain', 'TEXT');
    addCol('projects', 'client_id', 'INTEGER REFERENCES clients(id) ON DELETE SET NULL');
    addCol('leads', 'priority', "TEXT NOT NULL DEFAULT 'media'");
    addCol('leads', 'due_date', 'TEXT');
    addCol('leads', 'archived', 'INTEGER NOT NULL DEFAULT 0');
    addCol('users', 'username', 'TEXT');
    addCol('users', 'phone', 'TEXT');
    addCol('users', 'plan', "TEXT NOT NULL DEFAULT 'member'");
    addCol('users', 'credits', 'INTEGER NOT NULL DEFAULT 100');
    addCol('sessions', 'created_at', 'INTEGER');
    addCol('sessions', 'user_agent', 'TEXT');
    addCol('sessions', 'ip', 'TEXT');
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, label TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
        kind TEXT NOT NULL DEFAULT 'open' CHECK (kind IN ('open','won','lost')));
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, value TEXT NOT NULL,
        PRIMARY KEY (user_id, key));
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL,
        text TEXT NOT NULL, link TEXT, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
      CREATE TABLE IF NOT EXISTS plans (
        key TEXT PRIMARY KEY, name TEXT NOT NULL, rank INTEGER NOT NULL, tagline TEXT, benefits TEXT,
        ai_monthly_limit INTEGER NOT NULL DEFAULT 0, builder_monthly_limit INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS library_items (
        id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('prompt','skill','animation','design')),
        title TEXT NOT NULL, category TEXT, summary TEXT, content TEXT NOT NULL DEFAULT '', min_plan TEXT NOT NULL DEFAULT 'member',
        niche TEXT, style TEXT, site_type TEXT, url TEXT, published INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS play_items (
        id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT, category TEXT, video_url TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS play_progress (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES play_items(id) ON DELETE CASCADE,
        seen_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, item_id));
      CREATE TABLE IF NOT EXISTS saved_prompts (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL,
        mode TEXT NOT NULL, format TEXT NOT NULL, input TEXT NOT NULL, output TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS file_versions (
        id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, path TEXT NOT NULL,
        content TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'save', user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_versions ON file_versions(project_id, path, id);
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_aiconv ON ai_conversations(project_id, user_id, id);
      CREATE TABLE IF NOT EXISTS ai_usage (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_aiusage ON ai_usage(user_id, kind, created_at);
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, delta INTEGER NOT NULL,
        reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);
    const ins = db.prepare('INSERT OR IGNORE INTO pipeline_stages(key,label,position,kind) VALUES (?,?,?,?)');
    [['novo', 'Novos contatos', 1, 'open'], ['contato', 'Em contato', 2, 'open'], ['proposta', 'Proposta enviada', 3, 'open'],
      ['negociacao', 'Em negociação', 4, 'open'], ['ganho', 'Conquistados', 5, 'won'], ['perdido', 'Perdidos', 6, 'lost']].forEach((r) => ins.run(...r));
    const pl = db.prepare('INSERT OR IGNORE INTO plans(key,name,rank,tagline,benefits,ai_monthly_limit,builder_monthly_limit) VALUES (?,?,?,?,?,?,?)');
    pl.run('member', 'Member', 1, 'Porta de entrada', 'CRM, vendas, sites e IDE\nBiblioteca de recursos básicos\nAssistente de IA com limite mensal', 30, 5);
    pl.run('creator', 'Creator', 2, 'Círculo de criação', 'Tudo do Member\nRecursos avançados da biblioteca\nMais gerações de IA e do Builder', 150, 25);
    pl.run('elite', 'Elite', 3, 'Círculo elite', 'Tudo do Creator\nAcesso a todos os recursos\nLimites ampliados de IA e Builder', 600, 100);
  } }
];

function migrate() {
  const cur = Number(db.prepare("SELECT value FROM meta WHERE key='schema_version'").get()?.value || 1);
  const pending = MIGRATIONS.filter((m) => m.v > cur);
  if (!pending.length) return;
  const hasData = db.prepare('SELECT COUNT(*) n FROM users').get().n > 0;
  if (hasData && file !== ':memory:') {
    const dir = path.join(path.dirname(file), 'backups'); fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `neva-pre-v${pending.at(-1).v}-${Date.now()}.db`);
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    console.log(`[db] backup criado em ${dest}`);
  }
  for (const m of pending) {
    db.exec('BEGIN');
    try { m.up(); db.prepare("INSERT INTO meta(key,value) VALUES ('schema_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(m.v)); db.exec('COMMIT'); console.log(`[db] migração ${m.name} aplicada`); }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }
}
migrate();

const all = (sql, ...p) => db.prepare(sql).all(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { db, all, get, run, tx };
