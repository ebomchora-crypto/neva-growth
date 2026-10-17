const express = require('express');
const { all, get } = require('../lib/db');
const r = express.Router();

r.get('/', (req, res) => {
  const stages = all(`SELECT status, COUNT(*) n, COALESCE(SUM(value),0) total FROM leads GROUP BY status`);
  const totalLeads = stages.reduce((a, s) => a + s.n, 0);
  const won = stages.find((s) => s.status === 'ganho')?.n || 0;
  const lost = stages.find((s) => s.status === 'perdido')?.n || 0;
  const open = stages.filter((s) => !['ganho', 'perdido'].includes(s.status));
  const revenueByMonth = all(`SELECT strftime('%Y-%m', COALESCE(paid_at, sold_at)) m, SUM(amount) total
    FROM sales WHERE status='pago' AND COALESCE(paid_at, sold_at) >= date('now','start of month','-5 months')
    GROUP BY m ORDER BY m`);
  const months = [];
  const d = new Date(); d.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
    months.push({ month: key, total: revenueByMonth.find((m) => m.m === key)?.total || 0 });
  }
  res.json({
    kpis: {
      leads: totalLeads,
      openValue: open.reduce((a, s) => a + s.total, 0),
      clients: get('SELECT COUNT(*) n FROM clients').n,
      revenue: get("SELECT COALESCE(SUM(amount),0) n FROM sales WHERE status='pago'").n,
      pending: get("SELECT COALESCE(SUM(amount),0) n FROM sales WHERE status='pendente'").n,
      conversion: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      projects: get('SELECT COUNT(*) n FROM projects').n,
      publishedSites: get('SELECT COUNT(*) n FROM projects WHERE published=1').n
    },
    stages, revenueByMonth: months,
    tasksDue: all(`SELECT t.id,t.title,t.due_date,t.priority FROM tasks t WHERE t.done=0 ORDER BY COALESCE(t.due_date,'9999'), t.id LIMIT 6`),
    recentActivities: all(`SELECT a.id,a.type,a.text,a.created_at,l.name lead_name,u.name user_name FROM activities a
      LEFT JOIN leads l ON l.id=a.lead_id LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 8`),
    recentSales: all(`SELECT s.id,s.description,s.amount,s.status,s.sold_at,c.name client_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id ORDER BY s.id DESC LIMIT 5`)
  });
});
module.exports = r;
