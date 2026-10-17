import { api } from '../api.js';
import { h, mount, brl, dt, dtt } from '../ui.js';

const STAGES = { novo: 'Novo', contato: 'Contato', proposta: 'Proposta', negociacao: 'Negociação', ganho: 'Ganho', perdido: 'Perdido' };
const MONTH = (m) => new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

export default {
  async render(box, ctx) {
    const d = await api.get('/dashboard');
    const k = d.kpis;
    const kpi = (label, value, hint) => h('div', { class: 'card kpi' }, h('small', label), h('b', value), hint && h('div', { class: 'sm mut' }, hint));
    const max = Math.max(1, ...d.revenueByMonth.map((m) => m.total));
    const maxStage = Math.max(1, ...Object.keys(STAGES).map((s) => d.stages.find((x) => x.status === s)?.n || 0));
    mount(box,
      h('div', { class: 'pagehead' }, h('div', h('h1', `Olá, ${ctx.user.name.split(' ')[0]}`), h('p', 'Resumo da sua operação.')),
        h('div', { class: 'row' }, h('a', { class: 'btn ghost', href: '#/leads' }, 'Ver funil'), h('a', { class: 'btn', href: '#/sites' }, 'Criar site'))),
      h('div', { class: 'grid g4' },
        kpi('Receita recebida', brl(k.revenue), `${brl(k.pending)} a receber`), kpi('Leads', k.leads, `${brl(k.openValue)} em aberto`),
        kpi('Clientes', k.clients), kpi('Conversão', k.conversion + '%', 'ganhos ÷ (ganhos + perdidos)'),
        kpi('Projetos', k.projects, `${k.publishedSites} publicado(s)`)),
      h('div', { class: 'grid g2', style: 'margin-top:14px' },
        h('section', { class: 'card pad' }, h('h2', 'Receita — últimos 6 meses'),
          h('div', { class: 'bars', role: 'img', 'aria-label': 'Gráfico de receita mensal' }, d.revenueByMonth.map((m) =>
            h('div', { class: 'b', title: brl(m.total) }, h('span', { class: 'sm mut' }, m.total ? brl(m.total).replace(/ /g, ' ').replace(',00', '') : ''), h('i', { style: `height:${Math.round((m.total / max) * 100)}%` }), h('span', { class: 'sm' }, MONTH(m.month)))))),
        h('section', { class: 'card pad funnel' }, h('h2', 'Funil de vendas'),
          Object.entries(STAGES).map(([key, label]) => { const s = d.stages.find((x) => x.status === key) || { n: 0, total: 0 };
            return h('div', { class: 'fr', title: brl(s.total) }, h('span', label), h('div', { class: 'track' }, h('i', { style: `width:${(s.n / maxStage) * 100}%` })), h('b', s.n)); }))),
      h('div', { class: 'grid g3', style: 'margin-top:14px' },
        h('section', { class: 'card pad' }, h('h2', 'Próximas tarefas'), d.tasksDue.length ? h('ul', { class: 'list-plain' }, d.tasksDue.map((t) =>
          h('li', h('span', t.title), h('span', { class: 'sm mut nowrap' }, dt(t.due_date))))) : h('p', { class: 'mut' }, 'Nenhuma tarefa aberta.'), h('a', { href: '#/tarefas' }, 'Ver todas')),
        h('section', { class: 'card pad' }, h('h2', 'Atividade recente'), d.recentActivities.length ? h('ul', { class: 'list-plain' }, d.recentActivities.map((a) =>
          h('li', h('span', `${a.lead_name || 'Lead'}: ${a.text}`), h('span', { class: 'sm mut nowrap' }, dtt(a.created_at))))) : h('p', { class: 'mut' }, 'Sem atividades ainda.')),
        h('section', { class: 'card pad' }, h('h2', 'Últimas vendas'), d.recentSales.length ? h('ul', { class: 'list-plain' }, d.recentSales.map((s) =>
          h('li', h('span', s.description), h('b', brl(s.amount))))) : h('p', { class: 'mut' }, 'Nenhuma venda registrada.'), h('a', { href: '#/vendas' }, 'Ver vendas'))));
  }
};
