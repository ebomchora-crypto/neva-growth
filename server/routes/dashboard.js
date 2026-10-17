const express = require('express');
const { all, get } = require('../lib/db');
const S = require('../lib/services');
const ai = require('../lib/ai');
const { bad, wrap } = require('../lib/http');
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
const totals = (a, b) => get(`SELECT COALESCE(SUM(amount),0) revenue, COALESCE(SUM(amount-cost),0) profit, COUNT(*) n FROM sales WHERE status='pago' AND ${PAID_DATE} BETWEEN ? AND ?`, a, b);
const variation = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? null : 0)); // null = sem base de comparação

function series(rg) {
  const buckets = [];
  if (rg.cfg.bucket === 'day') for (let d = rg.startD; d <= rg.endD; d = addDays(d, 1)) buckets.push({ key: iso(d), label: iso(d).slice(8) + '/' + iso(d).slice(5, 7) });
  else { // meses cobertos pelo intervalo
    const d = new Date(Date.UTC(rg.startD.getUTCFullYear(), rg.startD.getUTCMonth(), 1));
    while (d <= rg.endD) { buckets.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '') }); d.setUTCMonth(d.getUTCMonth() + 1); }
  }
  const fmt = rg.cfg.bucket === 'day' ? 10 : 7;
  const rows = all(`SELECT substr(${PAID_DATE},1,${fmt}) k, SUM(amount) revenue, SUM(amount-cost) profit FROM sales WHERE status='pago' AND ${PAID_DATE} BETWEEN ? AND ? GROUP BY k`, rg.start, rg.end);
  return buckets.map((b) => ({ ...b, revenue: rows.find((x) => x.k === b.key)?.revenue || 0, profit: rows.find((x) => x.k === b.key)?.profit || 0 }));
}

function metrics(period) {
  const rg = range(period);
  const cur = totals(rg.start, rg.end); const prev = totals(rg.prevStart, rg.prevEnd);
  return { period: PERIODS[period] ? period : '6m', range: { start: rg.start, end: rg.end },
    revenue: cur.revenue, profit: cur.profit, sales: cur.n, ticket: cur.n ? cur.revenue / cur.n : 0,
    profitVariation: variation(cur.profit, prev.profit), revenueVariation: variation(cur.revenue, prev.revenue), previous: { revenue: prev.revenue, profit: prev.profit },
    series: series(rg) };
}

r.get('/', (req, res) => {
  const m = metrics(req.query.period);
  const stages = all(`SELECT s.key, s.label, s.kind, s.position, COUNT(l.id) n, COALESCE(SUM(l.value),0) total FROM pipeline_stages s
    LEFT JOIN leads l ON l.status=s.key AND l.archived=0 GROUP BY s.key ORDER BY s.position`);
  const won = stages.filter((s) => s.kind === 'won').reduce((a, s) => a + s.n, 0), lost = stages.filter((s) => s.kind === 'lost').reduce((a, s) => a + s.n, 0);
  const open = stages.filter((s) => s.kind === 'open');
  res.json({
    metrics: m,
    wallet: { profitTotal: get("SELECT COALESCE(SUM(amount-cost),0) n FROM sales WHERE status='pago'").n, revenueTotal: get("SELECT COALESCE(SUM(amount),0) n FROM sales WHERE status='pago'").n,
      pending: get("SELECT COALESCE(SUM(amount),0) n FROM sales WHERE status='pendente'").n },
    kpis: {
      leads: stages.reduce((a, s) => a + s.n, 0), openLeads: open.reduce((a, s) => a + s.n, 0), openValue: open.reduce((a, s) => a + s.total, 0),
      clients: get('SELECT COUNT(*) n FROM clients').n, conversion: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      projects: get('SELECT COUNT(*) n FROM projects WHERE archived=0').n, publishedSites: get('SELECT COUNT(*) n FROM projects WHERE published=1 AND archived=0').n
    },
    stages,
    tasksDue: all(`SELECT t.id,t.title,t.due_date,t.priority FROM tasks t WHERE t.done=0 ORDER BY COALESCE(t.due_date,'9999'), t.id LIMIT 6`),
    recentActivities: all(`SELECT a.id,a.type,a.text,a.created_at,l.name lead_name,u.name user_name FROM activities a
      LEFT JOIN leads l ON l.id=a.lead_id LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 8`),
    recentSales: all(`SELECT s.id,s.description,s.amount,s.cost,s.status,s.sold_at,c.name client_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id ORDER BY s.id DESC LIMIT 5`)
  });
});

// Resumo do período escrito por IA a partir dos números reais (exige ANTHROPIC_API_KEY)
r.post('/summary', wrap(async (req, res) => {
  if (!ai.configured()) throw new (require('../lib/http').HttpError)(503, 'IA não configurada. Defina ANTHROPIC_API_KEY no servidor.', 'ai_not_configured');
  S.checkAiQuota(req.user, 'summary');
  const m = metrics(req.body?.period);
  const top = all(`SELECT s.description, s.amount, s.amount-s.cost AS profit FROM sales s WHERE s.status='pago' AND ${PAID_DATE.replace(/(paid_at|sold_at)/g, 's.$1')} BETWEEN ? AND ? ORDER BY profit DESC LIMIT 5`, m.range.start, m.range.end);
  const open = get("SELECT COUNT(*) n, COALESCE(SUM(value),0) v FROM leads WHERE archived=0 AND status IN (SELECT key FROM pipeline_stages WHERE kind='open')");
  const text = await ai.complete({ maxTokens: 700,
    system: 'Você é analista comercial. Escreva em português do Brasil, em no máximo 6 linhas, um resumo objetivo do período com base SOMENTE nos números fornecidos. Não invente dados; se algo for zero ou ausente, diga isso. Termine com 1 sugestão prática.',
    messages: [{ role: 'user', content: JSON.stringify({ periodo: m.range, receita: m.revenue, lucro: m.profit, vendas_pagas: m.sales, ticket_medio: m.ticket, variacao_lucro_pct: m.profitVariation, periodo_anterior: m.previous, maiores_vendas: top, oportunidades_abertas: open }) }] });
  S.recordAiUse(req.user, 'summary');
  res.json({ summary: text, usage: S.usageOf(req.user).ai });
}));
module.exports = r;
