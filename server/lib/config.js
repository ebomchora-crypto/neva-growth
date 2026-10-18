// Configurações de integração editáveis no banco (tabela app_settings, pelo Table Editor do Supabase).
// Valor preenchido na tabela vence a variável de ambiente; vazio cai para a variável de ambiente.
const { all } = require('./db');

let cache = {}; let at = 0;
async function refresh(force = false) {
  if (!force && Date.now() - at < 30000) return;
  try { cache = Object.fromEntries((await all('SELECT key, value FROM app_settings')).map((r) => [r.key, r.value])); at = Date.now(); }
  catch { /* tabela ainda não migrada: segue com as variáveis de ambiente */ }
}
const get = (k) => { const v = cache[k]; return v != null && String(v).trim() !== '' ? String(v).trim() : (process.env[k] || ''); };
module.exports = { refresh, get };
