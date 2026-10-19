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
// Sem limite mensal: o uso é só contado (limit: null = ilimitado). Fica apenas a proteção contra rajadas.
async function usageOf(user) {
  const count = async (kinds) => (await get(`SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>=? AND kind IN (${kinds.map(() => '?').join(',')})`, user.id, monthStart(), ...kinds)).n;
  return { ai: { used: await count(POOLS.ai), limit: null }, builder: { used: await count(POOLS.builder), limit: null } };
}
async function checkAiQuota(user) {
  const recent = (await get("SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>=datetime('now','-1 minute')", user.id)).n;
  if (recent >= 40) throw new HttpError(429, 'Muitas requisições de IA em pouco tempo. Aguarde um instante.', 'throttled');
}
const recordAiUse = (user, kind) => run('INSERT INTO ai_usage(user_id,kind) VALUES (?,?)', user.id, kind);

// ---- Funil por conta: cada espaço de trabalho tem as suas etapas (criadas na primeira vez que são usadas).
const DEFAULT_STAGES = [['novo', 'Novos contatos', 'open', 'A conversa começa aqui', 10], ['contato', 'Em contato', 'open', 'Problema e intenção claros', 25], ['proposta', 'Proposta enviada', 'open', 'Uma solução na mesa', 50],
  ['negociacao', 'Em negociação', 'open', 'Alinhando o próximo sim', 75], ['ganho', 'Conquistados', 'won', 'Relações que viram projetos', 100], ['perdido', 'Encerrados', 'lost', 'Aprendizados para o próximo', 0]];
async function stagesOf(ws) {
  let rows = await all('SELECT * FROM pipeline_stages WHERE ws=? ORDER BY position, id', ws);
  if (!rows.length) {
    for (const [i, [key, label, kind, description, probability]] of DEFAULT_STAGES.entries()) await run('INSERT INTO pipeline_stages(key,label,position,kind,ws,description,probability) VALUES (?,?,?,?,?,?,?) ON CONFLICT (ws,key) DO NOTHING', key, label, i + 1, kind, ws, description, probability);
    rows = await all('SELECT * FROM pipeline_stages WHERE ws=? ORDER BY position, id', ws);
  }
  return rows;
}
const stageKeysOf = async (ws) => (await stagesOf(ws)).map((s) => s.key);
const stageKindOf = async (key, ws) => (await stagesOf(ws)).find((s) => s.key === key)?.kind;
const firstOpenOf = async (ws) => (await stagesOf(ws)).find((s) => s.kind === 'open')?.key;
const wonStageOf = async (ws) => (await stagesOf(ws)).find((s) => s.kind === 'won')?.key;

module.exports = { stagesOf, stageKeysOf, stageKindOf, firstOpenOf, wonStageOf, SETTING_DEFAULTS, getSettings, setSetting, notify, planOf, planRank, usageOf, checkAiQuota, recordAiUse };
