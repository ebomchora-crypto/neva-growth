const { all, get, run } = require('./db');
const { HttpError } = require('./http');

const SETTING_DEFAULTS = {
  hide_values: '0', notify_sales: '1', notify_tasks: '1', notify_leads: '1',
  prospect_radius_km: '10', prospect_only_no_site: '1', prospect_min_rating: '0'
};
const getSettings = (userId) => {
  const out = { ...SETTING_DEFAULTS };
  for (const r of all('SELECT key,value FROM user_settings WHERE user_id=?', userId)) if (r.key in SETTING_DEFAULTS) out[r.key] = r.value;
  return out;
};
const setSetting = (userId, key, value) =>
  run('INSERT INTO user_settings(user_id,key,value) VALUES (?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value', userId, key, String(value));

/** Cria notificação in-app para os usuários ativos (exceto `exceptUserId`) que não desativaram esse tipo. */
function notify({ type, pref, text, link, only, exceptUserId }) {
  const users = only ? only.map((id) => ({ id })) : all("SELECT id FROM users WHERE active=1");
  for (const u of users) {
    if (u.id === exceptUserId) continue;
    if (pref && getSettings(u.id)[pref] === '0') continue;
    run('INSERT INTO notifications(user_id,type,text,link) VALUES (?,?,?,?)', u.id, type, String(text).slice(0, 300), link || null);
  }
}

const planOf = (key) => get('SELECT * FROM plans WHERE key=?', key) || get("SELECT * FROM plans WHERE key='member'");
const planRank = (key) => planOf(key).rank;

// ---- Limites de uso de IA / Builder (por plano, por mês) e proteção contra rajadas
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01 00:00:00';
const POOLS = { ai: ['chat', 'summary', 'prompt', 'optimize'], builder: ['builder'] };
function usageOf(user) {
  const plan = planOf(user.plan);
  const count = (kinds) => get(`SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>=? AND kind IN (${kinds.map(() => '?').join(',')})`, user.id, monthStart(), ...kinds).n;
  return { ai: { used: count(POOLS.ai), limit: plan.ai_monthly_limit }, builder: { used: count(POOLS.builder), limit: plan.builder_monthly_limit } };
}
function checkAiQuota(user, kind) {
  const pool = POOLS.builder.includes(kind) ? 'builder' : 'ai';
  const u = usageOf(user)[pool];
  if (u.used >= u.limit) throw new HttpError(429, `Limite mensal do seu plano atingido (${u.used}/${u.limit}). Fale com um administrador para ampliar.`, 'quota_exceeded');
  const recent = get("SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>=datetime('now','-1 minute')", user.id).n;
  if (recent >= 8) throw new HttpError(429, 'Muitas requisições de IA em pouco tempo. Aguarde um minuto.', 'throttled');
}
const recordAiUse = (user, kind) => run('INSERT INTO ai_usage(user_id,kind) VALUES (?,?)', user.id, kind);

module.exports = { SETTING_DEFAULTS, getSettings, setSetting, notify, planOf, planRank, usageOf, checkAiQuota, recordAiUse };
