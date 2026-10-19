const express = require('express');
const { all, get } = require('../lib/db');
const S = require('../lib/services');
const ai = require('../lib/ai');
const r = express.Router();

const PERIODS = { hoje: { days: 1, bucket: 'day' }, '7d': { days: 7, bucket: 'day' }, '1m': { days: 30, bucket: 'day' }, '3m': { days: 91, bucket: 'month' }, '6m': { days: 183, bucket: 'month' }, '1a': { days: 365, bucket: 'month' } };
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const PAID_DATE = 'COALESCE(paid_at, sold_at)';

function range(period) {
  const cfg = PERIODS[period] || PERIODS['6m'];
  const end = new Date(iso(new Date()) + 'T00:00:00Z');
  const start = addDays(end, -(cfg.days - 1));
  const prevEnd = addDays(start, -1); const prevStart = addDays(prevEnd, -(cfg.days - 1));
  return { cfg, start: iso(start), end: iso(end), prevStart: iso(prevStart), prevEnd: iso(prevEnd), startD: start, endD: end };
}
const totals = (a, b, ws) => get(`SELECT COALESCE(SUM(amount),0) revenue, COALESCE(SUM(amount-cost),0) profit, COUNT(*) n FROM sales WHERE status='pago' AND ws=? AND ${PAID_DATE} BETWEEN ? AND ?`, ws, a, b);
const variation = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? null : 0)); // null = sem base de comparação

async function series(rg, ws) {
  const buckets = [];
  if (rg.cfg.bucket === 'day') for (let d = rg.startD; d <= rg.endD; d = addDays(d, 1)) buckets.push({ key: iso(d), label: iso(d).slice(8) + '/' + iso(d).slice(5, 7) });
  else { // meses cobertos pelo intervalo
    const d = new Date(Date.UTC(rg.startD.getUTCFullYear(), rg.startD.getUTCMonth(), 1));
    while (d <= rg.endD) { buckets.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '') }); d.setUTCMonth(d.getUTCMonth() + 1); }
  }
  const fmt = rg.cfg.bucket === 'day' ? 10 : 7;
  const rows = await all(`SELECT substr(${PAID_DATE},1,${fmt}) k, SUM(amount) revenue, SUM(amount-cost) profit FROM sales WHERE status='pago' AND ws=? AND ${PAID_DATE} BETWEEN ? AND ? GROUP BY k`, ws, rg.start, rg.end);
  return buckets.map((b) => ({ ...b, revenue: rows.find((x) => x.k === b.key)?.revenue || 0, profit: rows.find((x) => x.k === b.key)?.profit || 0 }));
}

async function metrics(period, ws) {
  const rg = range(period);
  const cur = await totals(rg.start, rg.end, ws); const prev = await totals(rg.prevStart, rg.prevEnd, ws);
  return { period: PERIODS[period] ? period : '6m', range: { start: rg.start, end: rg.end },
    revenue: cur.revenue, profit: cur.profit, sales: cur.n, ticket: cur.n ? cur.revenue / cur.n : 0,
    profitVariation: variation(cur.profit, prev.profit), revenueVariation: variation(cur.revenue, prev.revenue), previous: { revenue: prev.revenue, profit: prev.profit },
    series: await series(rg, ws) };
}

r.get('/', async (req, res) => {
  const ws = req.user.ws;
  const m = await metrics(req.query.period, ws);
  const stages = await all(`SELECT s.key, s.label, s.kind, s.position, COUNT(l.id) n, COALESCE(SUM(l.value),0) total FROM pipeline_stages s
    LEFT JOIN leads l ON l.status=s.key AND l.archived=0 AND l.ws=s.ws WHERE s.ws=? GROUP BY s.id, s.key, s.label, s.kind, s.position ORDER BY s.position`, ws);
  const won = stages.filter((s) => s.kind === 'won').reduce((a, s) => a + s.n, 0), lost = stages.filter((s) => s.kind === 'lost').reduce((a, s) => a + s.n, 0);
  const open = stages.filter((s) => s.kind === 'open');
  res.json({
    metrics: m,
    wallet: { profitTotal: (await get("SELECT COALESCE(SUM(amount-cost),0) n FROM sales WHERE status='pago' AND ws=?", ws)).n, revenueTotal: (await get("SELECT COALESCE(SUM(amount),0) n FROM sales WHERE status='pago' AND ws=?", ws)).n,
      pending: (await get("SELECT COALESCE(SUM(amount),0) n FROM sales WHERE status='pendente' AND ws=?", ws)).n },
    kpis: {
      leads: stages.reduce((a, s) => a + s.n, 0), openLeads: open.reduce((a, s) => a + s.n, 0), openValue: open.reduce((a, s) => a + s.total, 0),
      clients: (await get('SELECT COUNT(*) n FROM clients WHERE ws=?', ws)).n, conversion: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      projects: (await get('SELECT COUNT(*) n FROM projects WHERE archived=0 AND ws=?', ws)).n, publishedSites: (await get('SELECT COUNT(*) n FROM projects WHERE published=1 AND archived=0 AND ws=?', ws)).n
    },
    stages,
    tasksDue: await all(`SELECT t.id,t.title,t.due_date,t.priority FROM tasks t WHERE t.done=0 AND t.ws=? ORDER BY COALESCE(t.due_date,'9999'), t.id LIMIT 6`, ws),
    recentActivities: await all(`SELECT a.id,a.type,a.text,a.created_at,l.name lead_name,u.name user_name FROM activities a
      LEFT JOIN leads l ON l.id=a.lead_id LEFT JOIN users u ON u.id=a.user_id
      WHERE a.lead_id IN (SELECT id FROM leads WHERE ws=?) OR a.client_id IN (SELECT id FROM clients WHERE ws=?) ORDER BY a.id DESC LIMIT 8`, ws, ws),
    recentSales: await all(`SELECT s.id,s.description,s.amount,s.cost,s.status,s.sold_at,c.name client_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id WHERE s.ws=? ORDER BY s.id DESC LIMIT 5`, ws)
  });
});

// "Vendas hoje" ao vivo: valor do dia (horário de Brasília), comparação com ontem e acumulado por hora.
const brt = (ms) => new Date(ms - 3 * 3600 * 1000);
const hourOf = (created) => { const t = Date.parse(String(created || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(created)) ? '' : 'Z')); return Number.isFinite(t) ? brt(t).getUTCHours() : 12; };
// Modo "tudo": total de todas as vendas pagas, acumulado mês a mês (até 12 meses) e comparação do mês atual com o anterior.
async function liveAll(req, res) {
  const ws = req.user.ws; const now = brt(Date.now()); const today = iso(now); const ym = today.slice(0, 7);
  const rows = await all(`SELECT s.id, s.description, s.amount, s.cost, ${PAID_DATE} d, c.name client_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id WHERE s.status='pago' AND s.ws=? ORDER BY ${PAID_DATE} DESC, s.id DESC`, ws);
  const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); months.push(d.toISOString().slice(0, 7)); }
  const before = rows.filter((x) => String(x.d).slice(0, 7) < months[0]).reduce((a, x) => a + Number(x.amount), 0);
  let acc = before; const cum = months.map((m) => { acc += rows.filter((x) => String(x.d).slice(0, 7) === m).reduce((a, x) => a + Number(x.amount), 0); return acc; });
  const monthSum = (m) => rows.filter((x) => String(x.d).slice(0, 7) === m).reduce((a, x) => a + Number(x.amount), 0);
  const prevM = months[10]; const cur = monthSum(ym); const prev = monthSum(prevM);
  const revenue = rows.reduce((a, x) => a + Number(x.amount), 0); const cost = rows.reduce((a, x) => a + Number(x.cost), 0);
  res.json({ scope: 'all', today, name: req.user.name, hour: 23, now: now.toISOString().slice(11, 19), revenue, profit: revenue - cost, count: rows.length, ticket: rows.length ? revenue / rows.length : 0,
    variation: prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null, previous: prev, yesterday: prevM + '-01',
    labels: months.map((m) => new Date(m + '-15T12:00:00Z').toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')), series: { today: cum, yesterday: cum.map(() => 0) },
    recent: rows.slice(0, 8).map(({ id, description, amount, client_name }) => ({ id, description, amount, client_name })) });
}
r.get('/live', async (req, res) => {
  if (req.query.scope === 'all') return liveAll(req, res);
  const ws = req.user.ws; const now = brt(Date.now()); const today = iso(now); const yest = iso(addDays(now, -1));
  const rows = await all(`SELECT s.id, s.description, s.amount, s.cost, s.created_at, ${PAID_DATE} d, c.name client_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id
    WHERE s.status='pago' AND s.ws=? AND ${PAID_DATE} IN (?, ?) ORDER BY s.id DESC`, ws, today, yest);
  const cum = (list) => { const per = Array(24).fill(0); for (const x of list) per[hourOf(x.created_at)] += Number(x.amount) || 0; let a = 0; return per.map((v) => (a += v)); };
  const t = rows.filter((x) => x.d === today); const y = rows.filter((x) => x.d === yest);
  const sum = (l, k) => l.reduce((a, x) => a + (k === 'profit' ? x.amount - x.cost : Number(x[k]) || 0), 0);
  const revenue = sum(t, 'amount'); const prev = sum(y, 'amount');
  res.json({ today, name: req.user.name, hour: now.getUTCHours(), now: now.toISOString().slice(11, 19), revenue, profit: sum(t, 'profit'), count: t.length, ticket: t.length ? revenue / t.length : 0,
    variation: prev > 0 ? Math.round(((revenue - prev) / prev) * 1000) / 10 : null, previous: prev, yesterday: yest, series: { today: cum(t), yesterday: cum(y) },
    recent: t.slice(0, 8).map(({ id, description, amount, client_name }) => ({ id, description, amount, client_name })) });
});

// Resumo do período escrito por IA a partir dos números reais (exige RIVER_API_KEY)
r.post('/summary', async (req, res) => {
  if (!ai.configured()) throw new (require('../lib/http').HttpError)(503, ai.NOT_CONFIGURED, 'ai_not_configured');
  await S.checkAiQuota(req.user, 'summary');
  const m = await metrics(req.body?.period, req.user.ws);
  const top = await all(`SELECT s.description, s.amount, s.amount-s.cost AS profit FROM sales s WHERE s.status='pago' AND s.ws=? AND ${PAID_DATE.replace(/(paid_at|sold_at)/g, 's.$1')} BETWEEN ? AND ? ORDER BY profit DESC LIMIT 5`, req.user.ws, m.range.start, m.range.end);
  const open = await get("SELECT COUNT(*) n, COALESCE(SUM(value),0) v FROM leads WHERE archived=0 AND ws=? AND status IN (SELECT key FROM pipeline_stages WHERE kind='open' AND ws=?)", req.user.ws, req.user.ws);
  const text = await ai.complete({ maxTokens: 700,
    system: 'Você é analista comercial. Escreva em português do Brasil, em no máximo 6 linhas, um resumo objetivo do período com base SOMENTE nos números fornecidos. Não invente dados; se algo for zero ou ausente, diga isso. Termine com 1 sugestão prática.',
    messages: [{ role: 'user', content: JSON.stringify({ periodo: m.range, receita: m.revenue, lucro: m.profit, vendas_pagas: m.sales, ticket_medio: m.ticket, variacao_lucro_pct: m.profitVariation, periodo_anterior: m.previous, maiores_vendas: top, oportunidades_abertas: open }) }] });
  await S.recordAiUse(req.user, 'summary');
  res.json({ summary: text, usage: (await S.usageOf(req.user)).ai });
});
module.exports = r;
