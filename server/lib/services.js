const { all, get, run } = require('./db');
const { HttpError } = require('./http');

const SETTING_DEFAULTS = {
  hide_values: '0', notify_sales: '1', notify_tasks: '1', notify_leads: '1',
  prospect_radius_km: '10', prospect_only_no_site: '1', prospect_min_rating: '0', prospect_auto_import: '0'
};
async function getSettings(userId) {
  const out = { ...SETTING_DEFAULTS };
  for (const r of await all('SELECT key,value FROM user_settings WHERE user_id=?', userId)) if (r.key in SETTING_DEFAULTS) out[r.key] = r.value;
  return out;
}
const setSetting = (userId, key, value) =>
  run('INSERT INTO user_settings(user_id,key,value) VALUES (?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value', userId, key, String(value));

/** Cria notificação in-app para os usuários ativos (exceto `exceptUserId`) que não desativaram esse tipo. */
async function notify({ type, pref, text, link, only, exceptUserId, ws }) {
  // sem `only`, avisa só quem está no mesmo espaço de trabalho (ws) — nunca outras contas
  const users = only ? only.map((id) => ({ id })) : await all('SELECT id FROM users WHERE active=1 AND ws=?', ws ?? -1);
  for (const u of users) {
    if (u.id === exceptUserId) continue;
    if (pref && (await getSettings(u.id))[pref] === '0') continue;
    await run('INSERT INTO notifications(user_id,type,text,link) VALUES (?,?,?,?)', u.id, type, String(text).slice(0, 300), link || null);
  }
}

const planOf = async (key) => (await get('SELECT * FROM plans WHERE key=?', key)) || (await get("SELECT * FROM plans WHERE key='member'"));
const planRank = async (key) => (await planOf(key)).rank;

// ---- Limites de uso de IA / Builder (por plano, por mês) e proteção contra rajadas
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01 00:00:00';
const POOLS = { ai: ['chat', 'summary', 'prompt', 'optimize'], builder: ['builder'] };
async function usageOf(user) {
  const plan = await planOf(user.plan);
  const count = async (kinds) => (await get(`SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>=? AND kind IN (${kinds.map(() => '?').join(',')})`, user.id, monthStart(), ...kinds)).n;
  return { ai: { used: await count(POOLS.ai), limit: plan.ai_monthly_limit }, builder: { used: await count(POOLS.builder), limit: plan.builder_monthly_limit } };
}
async function checkAiQuota(user, kind) {
  const pool = POOLS.builder.includes(kind) ? 'builder' : 'ai';
  const u = (await usageOf(user))[pool];
  if (u.used >= u.limit) throw new HttpError(429, `Limite mensal do seu plano atingido (${u.used}/${u.limit}). Fale com um administrador para ampliar.`, 'quota_exceeded');
  const recent = (await get("SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>=datetime('now','-1 minute')", user.id)).n;
  if (recent >= 8) throw new HttpError(429, 'Muitas requisições de IA em pouco tempo. Aguarde um minuto.', 'throttled');
}
const recordAiUse = (user, kind) => run('INSERT INTO ai_usage(user_id,kind) VALUES (?,?)', user.id, kind);

module.exports = { SETTING_DEFAULTS, getSettings, setSetting, notify, planOf, planRank, usageOf, checkAiQuota, recordAiUse };
