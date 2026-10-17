import { api } from '../api.js';
import { h, mount, brl, dt, dtt, money, toast, fail, pills, icon, heroArt } from '../ui.js';

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
      if (!area.firstChild) mount(area, h('p', { class: 'mut' }, 'Carregando…'));
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
      const monthsSel = h('select', { class: 'monthsel', 'aria-label': 'Período do gráfico', onchange: async (e) => { period = e.target.value; try { sessionStorage.setItem('dashPeriod', period); } catch { /* ok */ } drawBar(); await load().catch(fail); } },
        [['3m', '3 meses'], ['6m', '6 meses'], ['1a', '12 meses']].map(([v, l]) => h('option', { value: v, selected: v === period }, l)));
      mount(area,
        h('div', { class: 'dash3' },
          h('div', { class: 'mainc' },
            h('section', { class: 'card pad stack profit' },
              h('div', { class: 'top' },
                h('div', h('div', { class: 'sm', style: 'font-weight:600' }, h('span', { class: 'dotk' }), 'Lucro no período'), h('div', { class: 'row' }, h('span', { class: 'big' }, money(m.profit)), delta(m.profitVariation))),
                h('div', { class: 'row' },
                  h('button', { class: 'btn ghost sm pillbtn', disabled: !aiOn, title: aiOn ? 'Resumo escrito por IA com base nos números do período' : 'IA não configurada: defina ANTHROPIC_API_KEY no servidor', onclick: (e) => genSummary(e.currentTarget) }, aiOn ? '✦ Gerar resumo do período' : 'Resumo por IA (não configurado)'),
                  h('div', { id: 'periodbar' }))),
              summaryBox,
              lineChart(m.series),
              h('div', { class: 'foot' },
                h('span', { class: 'chip' }, 'Ticket médio ', h('b', money(m.ticket)), h('span', { class: 'mut sm' }, ` · ${m.sales} venda(s) paga(s) · ${dt(m.range.start)} a ${dt(m.range.end)}`)),
                h('div', { class: 'row' }, h('span', { class: 'chip' }, h('i', { style: 'background:#2f7bbd' }), 'Lucro líquido'), h('span', { class: 'chip' }, h('i', { style: 'background:#aacfee' }), 'Receita total'))),
              !m.sales && h('p', { class: 'sm mut', style: 'margin:0' }, 'Nenhuma venda paga neste período. Registre vendas em Vendas e marque como pagas para ver lucro e receita.')),
            h('div', { class: 'row2' },
              h('section', { class: 'promo' }, h('h2', 'Sua próxima venda começa agora.'), h('p', `${k.openLeads} empresa(s) esperando seu próximo movimento · ${brl(k.openValue)} em aberto`),
                canWrite && h('a', { class: 'plus', href: '#/leads', title: 'Abrir o CRM', 'aria-label': 'Abrir o CRM' }, icon('plus')),
                h('div', { class: 'go' }, h('a', { class: 'btn sm', href: '#/prospeccao' }, 'Prospectar'), h('a', { class: 'btn ghost sm', href: '#/leads' }, 'Abrir CRM')), heroArt('dashboard')),
              h('section', { class: 'card pad stack' },
                h('div', { class: 'row', style: 'justify-content:space-between' }, h('div', h('h2', 'Lucro por período'), h('div', { class: 'row' }, h('b', { style: 'font-size:1.5rem' }, money(m.profit)), delta(m.profitVariation))), monthsSel),
                barChart(m.series)))),
          h('aside', { class: 'walletpanel' },
            h('div', { class: 'wh' }, h('h2', 'Minha carteira'), canWrite && h('a', { class: 'btn sm', href: '#/vendas' }, '+ Nova venda')),
            h('div', { class: 'cardvis' }, h('span', { class: 'chipic' }), h('span', { class: 'mk' }, 'NEVA'),
              h('div', h('small', 'Lucro disponível'), h('div', h('b', money(d.wallet.profitTotal))), h('small', 'Receita ', money(d.wallet.revenueTotal), ' · a receber ', money(d.wallet.pending)))),
            canWrite && h('div', { class: 'two' }, h('a', { class: 'btn', href: '#/clientes' }, icon('user'), 'Cliente'), h('a', { class: 'btn solid', href: '#/vendas' }, icon('trend'), 'Venda')),
            h('div', { class: 'recent' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', 'Vendas recentes'), h('a', { href: '#/vendas', class: 'sm' }, 'Ver todas')),
              d.recentSales.length ? h('ul', { class: 'list-plain' }, d.recentSales.map((s) => h('li', h('span', s.description, h('div', { class: 'sm mut' }, s.client_name || '')), h('b', money(s.amount)))))
                : h('div', { class: 'empty' }, h('b', 'Nenhuma venda registrada'), 'Seus resultados aparecerão aqui.', h('div', { style: 'margin-top:10px' }, h('a', { class: 'btn sm', href: '#/vendas' }, 'Registrar primeira venda')))))),
        h('div', { class: 'grid g4', style: 'margin-top:16px' },
          h('section', { class: 'card pad funnel' }, h('h2', 'Funil de vendas'), (() => { const mx = Math.max(1, ...d.stages.map((s) => s.n));
            return d.stages.map((s) => h('div', { class: 'fr', title: brl(s.total) }, h('span', s.label), h('div', { class: 'track' }, h('i', { style: `width:${(s.n / mx) * 100}%` })), h('b', s.n))); })()),
          h('section', { class: 'card pad' }, h('h2', 'Próximas tarefas'), d.tasksDue.length ? h('ul', { class: 'list-plain' }, d.tasksDue.map((t) => h('li', h('span', t.title), h('span', { class: 'sm mut nowrap' }, dt(t.due_date))))) : h('p', { class: 'mut' }, 'Nenhuma tarefa aberta.'), h('a', { href: '#/tarefas' }, 'Ver todas')),
          h('section', { class: 'card pad' }, h('h2', 'Atividade recente'), d.recentActivities.length ? h('ul', { class: 'list-plain' }, d.recentActivities.map((a) => h('li', h('span', `${a.lead_name || 'Lead'}: ${a.text}`), h('span', { class: 'sm mut nowrap' }, dtt(a.created_at))))) : h('p', { class: 'mut' }, 'Sem atividades ainda.')),
          h('section', { class: 'card pad' }, h('h2', 'Resumo'), h('dl', { class: 'kv' }, [['Leads', k.leads], ['Clientes', k.clients], ['Conversão', k.conversion + '%'], ['Projetos', k.projects], ['Sites publicados', k.publishedSites]].flatMap(([a, b]) => [h('dt', a), h('dd', b)])))));
      drawBar();
    }
    mount(box, area);
    const drawBar = () => { const bar = box.querySelector('#periodbar'); if (bar) mount(bar, h('div', { class: 'periodbar' }, pills({ items: PERIODS, value: period, onChange: (v) => { period = v; try { sessionStorage.setItem('dashPeriod', v); } catch { /* ok */ } load().catch(fail); } }))); };
    await load();
  }
};
