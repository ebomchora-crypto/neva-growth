import { api } from '../api.js';
import { h, mount, brl, dt, dtt, money, toast, fail, pills } from '../ui.js';

const PERIODS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['1m', '1 mês'], ['3m', '3 meses'], ['6m', '6 meses'], ['1a', '1 ano']];
const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.flat().forEach((k) => e.append(k instanceof Node ? k : document.createTextNode(k))); return e; };
const short = (n) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1).replace('.', ',') + ' mil' : String(Math.round(n)));

function delta(v) {
  if (v === null) return h('span', { class: 'delta', title: 'Sem lucro no período anterior para comparar' }, 'novo');
  return h('span', { class: 'delta ' + (v > 0 ? 'up' : v < 0 ? 'down' : '') }, `${v > 0 ? '▲' : v < 0 ? '▼' : '•'} ${Math.abs(v).toLocaleString('pt-BR')}%`);
}
function lineChart(series) {
  const W = 640, H = 230, L = 52, R = 12, T = 12, B = 28;
  const max = Math.max(1, ...series.map((s) => Math.max(s.revenue, s.profit))); const step = series.length > 1 ? (W - L - R) / (series.length - 1) : 0;
  const x = (i) => (series.length > 1 ? L + i * step : (W + L - R) / 2); const y = (v) => T + (H - T - B) * (1 - v / max);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Receita e lucro no período' });
  for (let g = 0; g <= 4; g++) { const v = (max * g) / 4; svg.append(sv('line', { class: 'grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }), sv('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, 'R$ ' + short(v))); }
  const every = Math.ceil(series.length / 8);
  series.forEach((s, i) => { if (i % every === 0 || series.length < 9) svg.append(sv('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, s.label)); });
  const path = (k) => series.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s[k])}`).join(' ');
  const line = (k, color) => { if (series.length > 1) svg.append(sv('path', { d: path(k), fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    series.forEach((s, i) => svg.append(sv('circle', { cx: x(i), cy: y(s[k]), r: series.length > 40 ? 0 : 3.5, fill: color }, sv('title', {}, `${s.label}: ${brl(s[k])}`)))); };
  line('revenue', '#aacfee'); line('profit', '#2f7bbd');
  return svg;
}
function barChart(series) {
  const W = 420, H = 200, L = 8, R = 8, T = 10, B = 24; const max = Math.max(1, ...series.map((s) => s.profit)); const bw = Math.max(4, ((W - L - R) / series.length) * 0.6);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', style: 'height:200px', role: 'img', 'aria-label': 'Lucro por período' });
  const slot = (W - L - R) / series.length; const every = Math.ceil(series.length / 10);
  svg.append(sv('line', { class: 'grid', x1: L, x2: W - R, y1: H - B, y2: H - B }));
  series.forEach((s, i) => { const hh = Math.max(s.profit > 0 ? 3 : 0, ((H - T - B) * Math.max(s.profit, 0)) / max); const cx = L + slot * i + slot / 2;
    svg.append(sv('rect', { x: cx - bw / 2, y: H - B - hh, width: bw, height: hh, rx: 4, fill: '#4a95d2' }, sv('title', {}, `${s.label}: ${brl(s.profit)}`)));
    if (i % every === 0 || series.length < 11) svg.append(sv('text', { x: cx, y: H - 8, 'text-anchor': 'middle' }, s.label)); });
  return svg;
}

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    let period = (() => { try { return sessionStorage.getItem('dashPeriod') || '6m'; } catch { return '6m'; } })();
    const area = h('div');
    const aiOn = (await api.get('/integrations/status').catch(() => null))?.ai.configured;
    async function load() {
      mount(area, h('p', { class: 'mut' }, 'Carregando…'));
      const d = await api.get('/dashboard', { period }); draw(d);
    }
    const summaryBox = h('div');
    async function genSummary(btn) {
      btn.disabled = true; btn.textContent = 'Gerando…';
      try { const r = await api.post('/dashboard/summary', { period }); mount(summaryBox, h('div', { class: 'notice info', style: 'white-space:pre-wrap;margin-top:12px' }, r.summary, h('div', { class: 'sm mut' }, `Gerado por IA a partir dos números do período · uso mensal: ${r.usage.used}/${r.usage.limit}`))); }
      catch (e) { fail(e); } finally { btn.disabled = false; btn.textContent = '✦ Gerar resumo do período'; }
    }
    function draw(d) {
      const m = d.metrics; const k = d.kpis;
      mount(area,
        h('div', { class: 'grid dashgrid' },
          h('div', { class: 'stack' },
            h('section', { class: 'card pad stack' },
              h('div', { class: 'row', style: 'justify-content:space-between' },
                h('div', h('small', { class: 'mut' }, 'Lucro no período'), h('div', { class: 'row' }, h('b', { style: 'font-size:1.9rem' }, money(m.profit)), delta(m.profitVariation))),
                h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', disabled: !aiOn, title: aiOn ? 'Resumo escrito por IA com base nos números do período' : 'IA não configurada: defina ANTHROPIC_API_KEY no servidor', onclick: (e) => genSummary(e.currentTarget) }, aiOn ? '✦ Gerar resumo do período' : 'Resumo por IA (não configurado)'))),
              summaryBox,
              lineChart(m.series),
              h('div', { class: 'row', style: 'justify-content:space-between' }, h('div', { class: 'legend' }, h('span', h('i', { style: 'background:#2f7bbd' }), 'Lucro líquido'), h('span', h('i', { style: 'background:#aacfee' }), 'Receita total')),
                h('div', { class: 'sm mut' }, 'Ticket médio ', money(m.ticket), ' · ', `${m.sales} venda(s) paga(s) · ${dt(m.range.start)} a ${dt(m.range.end)}`)),
              !m.sales && h('p', { class: 'sm mut', style: 'margin:0' }, 'Nenhuma venda paga neste período. Registre vendas em Vendas e marque como pagas para ver lucro e receita.')),
            h('div', { class: 'grid g2' },
              h('section', { class: 'card pad stack' }, h('h2', 'Lucro por período'), barChart(m.series)),
              h('section', { class: 'card pad funnel' }, h('h2', 'Funil de vendas'), (() => { const mx = Math.max(1, ...d.stages.map((s) => s.n));
                return d.stages.map((s) => h('div', { class: 'fr', title: brl(s.total) }, h('span', s.label), h('div', { class: 'track' }, h('i', { style: `width:${(s.n / mx) * 100}%` })), h('b', s.n))); })()))),
          h('aside', { class: 'stack' },
            h('section', { class: 'wallet' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', 'Minha carteira'), canWrite && h('a', { class: 'btn ghost sm', href: '#/vendas' }, '+ Nova venda')),
              h('small', 'Lucro acumulado (vendas pagas)'), h('b', money(d.wallet.profitTotal)), h('small', h('span', 'Receita '), money(d.wallet.revenueTotal), ' · a receber ', money(d.wallet.pending)),
              canWrite && h('div', { class: 'row', style: 'margin-top:8px' }, h('a', { class: 'btn ghost sm', href: '#/clientes' }, 'Cliente'), h('a', { class: 'btn ghost sm', href: '#/vendas' }, 'Venda'))),
            h('section', { class: 'card pad' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', 'Vendas recentes'), h('a', { href: '#/vendas', class: 'sm' }, 'Ver todas')),
              d.recentSales.length ? h('ul', { class: 'list-plain' }, d.recentSales.map((s) => h('li', h('span', s.description, h('div', { class: 'sm mut' }, s.client_name || '')), h('b', money(s.amount)))))
                : h('div', { class: 'empty' }, h('b', 'Nenhuma venda registrada'), h('a', { class: 'btn ghost sm', href: '#/vendas' }, 'Registrar primeira venda'))),
            h('section', { class: 'card pad' }, h('h2', 'Sua próxima venda começa agora'), h('p', { class: 'mut' }, `${k.openLeads} oportunidade(s) abertas · ${brl(k.openValue)} em aberto`), h('div', { class: 'row' }, h('a', { class: 'btn sm', href: '#/prospeccao' }, 'Prospectar'), h('a', { class: 'btn ghost sm', href: '#/leads' }, 'Abrir CRM'))))),
        h('div', { class: 'grid g3', style: 'margin-top:14px' },
          h('section', { class: 'card pad' }, h('h2', 'Próximas tarefas'), d.tasksDue.length ? h('ul', { class: 'list-plain' }, d.tasksDue.map((t) => h('li', h('span', t.title), h('span', { class: 'sm mut nowrap' }, dt(t.due_date))))) : h('p', { class: 'mut' }, 'Nenhuma tarefa aberta.'), h('a', { href: '#/tarefas' }, 'Ver todas')),
          h('section', { class: 'card pad' }, h('h2', 'Atividade recente'), d.recentActivities.length ? h('ul', { class: 'list-plain' }, d.recentActivities.map((a) => h('li', h('span', `${a.lead_name || 'Lead'}: ${a.text}`), h('span', { class: 'sm mut nowrap' }, dtt(a.created_at))))) : h('p', { class: 'mut' }, 'Sem atividades ainda.')),
          h('section', { class: 'card pad' }, h('h2', 'Resumo'), h('dl', { class: 'kv' }, [['Leads', k.leads], ['Clientes', k.clients], ['Conversão', k.conversion + '%'], ['Projetos', k.projects], ['Sites publicados', k.publishedSites]].flatMap(([a, b]) => [h('dt', a), h('dd', b)])))));
    }
    mount(box, h('div', { class: 'pagehead' }, h('div', h('h1', `Olá, ${ctx.user.name.split(' ')[0]}`), h('p', 'Resultados reais da sua operação, calculados a partir das vendas pagas.')),
      h('div', { id: 'periodbar' })), area);
    const bar = box.querySelector('#periodbar');
    const drawBar = () => mount(bar, pills({ items: PERIODS, value: period, onChange: (v) => { period = v; try { sessionStorage.setItem('dashPeriod', v); } catch { /* ok */ } drawBar(); load().catch(fail); } }));
    drawBar(); await load();
  }
};
