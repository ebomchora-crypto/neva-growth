import { api } from '../api.js';
import { h, mount, brl, dt, dtt, money, toast, fail, pills, icon, heroArt } from '../ui.js';
import { riseMoney, still } from '../motion.js';
import { openSummary } from '../summary-card.js';
import { openInsight } from '../insight.js';
import { tiltCard } from '../tilt-card.js';

const PERIODS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['1m', '1 mês'], ['3m', '3 meses'], ['6m', '6 meses'], ['1a', '1 ano']];
const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.flat().forEach((k) => e.append(k instanceof Node ? k : document.createTextNode(k))); return e; };
const short = (n) => { const a = Math.abs(n); if (a >= 1000) return (n / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',') + ' mil'; if (a > 0 && a < 10 && n % 1) return n.toFixed(1).replace('.', ','); return String(Math.round(n)); };
const brl0 = (v) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');

function delta(v) {
  if (v === null) return h('span', { class: 'delta', title: 'Sem lucro no período anterior para comparar' }, 'novo');
  return h('span', { class: 'dchip ' + (v > 0 ? 'up' : v < 0 ? 'down' : '') }, h('i', icon(v < 0 ? 'trend' : 'trend')), `${Math.abs(v).toLocaleString('pt-BR')}%`);
}
// Linha de lucro e receita: eixo de valores à direita, meses embaixo e uma faixa por mês (como na referência)
function lineChart(series, avail = 760) {
  const W = Math.max(320, Math.min(900, avail)), H = 168, L = 6, R = 64, T = 14, B = 8;
  const max = Math.max(1, ...series.map((s) => Math.max(s.revenue, s.profit))); const step = series.length > 1 ? (W - L - R) / (series.length - 1) : 0;
  const x = (i) => (series.length > 1 ? L + i * step : (W - R + L) / 2); const y = (v) => T + (H - T - B) * (1 - v / max);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart lchart', role: 'img', 'aria-label': 'Receita e lucro no período' });
  svg.append(sv('defs', {},
    sv('linearGradient', { id: 'dash-area', x1: '0', y1: '0', x2: '0', y2: '1' },
      sv('stop', { offset: '0%', 'stop-color': '#f43940', 'stop-opacity': '.58' }),
      sv('stop', { offset: '100%', 'stop-color': '#6b080d', 'stop-opacity': '.02' }))));
  for (let g = 0; g <= 4; g++) { const v = (max * g) / 4; svg.append(sv('line', { class: 'grid', x1: L, x2: W - R + 8, y1: y(v), y2: y(v) }), sv('text', { x: W - R + 16, y: y(v) + 4, 'text-anchor': 'start' }, 'R$ ' + short(v))); }
  const path = (k) => series.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s[k])}`).join(' ');
  if (series.length > 1) {
    svg.append(sv('path', { d: `${path('revenue')} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`, class: 'area' }));
    svg.append(sv('path', { d: path('revenue'), class: 'ln rev' }), sv('path', { d: path('profit'), class: 'ln prof' }));
  }
  series.forEach((s, i) => svg.append(sv('circle', { cx: x(i), cy: y(s.profit), r: series.length > 40 ? 0 : 3, class: 'pt' }, sv('title', {}, `${s.label}: lucro ${brl(s.profit)} · receita ${brl(s.revenue)}`))));
  const every = Math.ceil(series.length / 8);
  const months = h('div', { class: 'lmonths', style: `padding-right:${(R / W) * 100}%` }, series.filter((_, i) => i % every === 0 || series.length < 9).map((s, i, arr) => h('div', { class: 'lm' + (i === arr.length - 1 ? ' cur' : '') }, h('span', s.label), h('i'))));
  return h('div', { class: 'lwrap' }, svg, months);
}
function barChart(series) {
  const max = Math.max(1, ...series.map((s) => s.profit));
  const pick = series.length > 12 ? series.filter((_, i) => i % Math.ceil(series.length / 12) === 0) : series;
  return h('div', { class: 'bchart', role: 'img', 'aria-label': 'Lucro por período' }, pick.map((s) => h('div', { class: 'bcol', title: `${s.label}: ${brl(s.profit)}` },
    h('small', brl0(s.profit)), h('i', { style: `height:${Math.max(6, (Math.max(s.profit, 0) / max) * 100)}%` }), h('span', s.label))));
}

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    let period = (() => { try { return sessionStorage.getItem('dashPeriod') || '6m'; } catch { return '6m'; } })();
    const area = h('div');
    const aiOn = (await api.get('/integrations/status').catch(() => null))?.ai.configured;
    async function load() {
      const first = !area.firstChild;
      if (first) mount(area, h('p', { class: 'mut' }, 'Carregando…'));
      const d = await api.get('/dashboard', { period });
      const y = window.scrollY; const sc = document.querySelector('.main'); const st = sc?.scrollTop;
      draw(d);
      if (!first) { still(area); riseMoney(area); if (sc) sc.scrollTop = st; window.scrollTo(0, y); }
    }
    const genSummary = () => openInsight({ period, load: () => api.post('/dashboard/summary', { period }) });
    function draw(d) {
      const m = d.metrics; const k = d.kpis;
      const monthsSel = h('select', { class: 'monthsel', 'aria-label': 'Período do gráfico', onchange: async (e) => { period = e.target.value; try { sessionStorage.setItem('dashPeriod', period); } catch { /* ok */ } await load().catch(fail); } },
        [['3m', '3 meses'], ['6m', '6 meses'], ['1a', '12 meses']].map(([v, l]) => h('option', { value: v, selected: v === period }, l)));
      const W = area.clientWidth || 1000;
      mount(area,
        h('div', { class: 'dash3' },
          h('div', { class: 'mainc' },
            h('section', { class: 'card pad stack profit' },
              h('div', { class: 'top' },
                h('div', h('div', { class: 'ptitle' }, h('span', { class: 'dotk' }), 'Lucro no período'), h('div', { class: 'row' }, h('span', { class: 'big' }, money(m.profit)), delta(m.profitVariation))),
                h('div', { class: 'row' },
                  h('button', { class: 'aibtn', title: 'Abre a arte do seu resultado, pronta para compartilhar', onclick: () => openSummary({ name: ctx.user.name, metrics: m, period }) }, h('i', icon('trend')), 'Gerar resumo do período'),
                  aiOn && h('button', { class: 'aibtn ghost', title: 'Resumo escrito por IA com base nos números do período', onclick: genSummary }, 'Texto com IA'),
                  h('div', { id: 'periodbar' }))),
              lineChart(m.series, W * 0.66 - 60),
              h('div', { class: 'foot' },
                h('span', { class: 'chip', title: `${m.sales} venda(s) paga(s) · ${dt(m.range.start)} a ${dt(m.range.end)}` }, 'Ticket médio ', h('b', money(m.ticket))),
                h('div', { class: 'row' }, h('span', { class: 'chip' }, h('i', { class: 'lgd prof' }), 'Lucro líquido'), h('span', { class: 'chip' }, h('i', { class: 'lgd rev' }), 'Receita total')))),
            h('div', { class: 'row2' },
              h('section', { class: 'promo' }, h('h2', 'Sua próxima venda começa agora.'), h('p', `${k.openLeads} ${k.openLeads === 1 ? 'empresa esperando' : 'empresas esperando'} seu próximo movimento.`),
                canWrite && h('a', { class: 'plus', href: '#/leads', title: 'Nova oportunidade no CRM', 'aria-label': 'Nova oportunidade no CRM' }, icon('plus')),
                heroArt('dashboard'),
                canWrite && h('a', { class: 'bigwhite', href: '#/clientes' }, 'Registrar cliente')),
              h('section', { class: 'card pad stack lucroper' },
                h('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start' }, h('div', h('h2', 'Lucro por período'), h('div', { class: 'row' }, h('b', { class: 'mid' }, money(m.profit)), delta(m.profitVariation))), monthsSel),
                barChart(m.series)))),
          h('aside', { class: 'walletpanel' },
            h('div', { class: 'wh' }, h('h2', 'Minha carteira'), canWrite && h('a', { class: 'npill', href: '#/vendas' }, '+ Nova venda')),
            h('div', { class: 'cardstack' },
              h('div', { class: 'ghost g2', 'aria-hidden': 'true' }), h('div', { class: 'ghost', 'aria-hidden': 'true' }),
              h('div', { class: 'cardvis' }, h('span', { class: 'chipic' }), h('span', { class: 'mk' }, h('i', { class: 'logo' }, h('img', { src: '/img/logo-128.png', alt: '', width: 128, height: 128 }))),
                h('div', h('small', 'Lucro estimado'), h('div', { class: 'row', style: 'gap:10px' }, h('b', money(d.wallet.profitTotal)), delta(m.profitVariation)), h('small', { class: 'rc' }, 'Receita ', money(d.wallet.revenueTotal), d.wallet.pending ? [' · a receber ', money(d.wallet.pending)] : '')))),
            canWrite && h('div', { class: 'two' }, h('a', { class: 'wbtn dark', href: '#/clientes' }, h('i', { class: 'arr dl' }, icon('arrow')), 'Cliente'), h('a', { class: 'wbtn light', href: '#/vendas' }, h('i', { class: 'arr ur' }, icon('arrow')), 'Venda')),
            h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' }, h('h2', 'Vendas recentes'), h('a', { href: '#/vendas', class: 'vt' }, 'Ver todas')),
            h('div', { class: 'recent' }, d.recentSales.length ? h('ul', { class: 'list-plain' }, d.recentSales.map((s) => h('li',
              h('span', { class: 'sale-avatar', 'aria-hidden': 'true' }, (s.client_name || s.description || 'V').slice(0, 2).toUpperCase()),
              h('span', { class: 'sale-info' }, h('strong', s.description), h('small', s.client_name || (s.sold_at ? dt(s.sold_at) : ''))),
              h('b', { class: 'sale-amount' }, money(s.amount)))))
              : h('div', { class: 'empty' }, h('b', 'Nenhuma venda registrada'), h('span', 'Seus resultados aparecerão aqui.'), canWrite && h('a', { class: 'npill', href: '#/vendas', style: 'margin-top:14px' }, 'Registrar primeira venda'))))));
      drawBar();
      // Card da carteira com inclinação 3D e brilho (porte do TiltCard); a cada redesenho o card é novo, então liga de novo.
      const wallet = box.querySelector('.cardvis'); if (wallet) tiltCard(wallet, { max: 10 });
    }
    mount(box, area);
    const drawBar = () => { const bar = box.querySelector('#periodbar'); if (bar) mount(bar, h('div', { class: 'periodbar' }, pills({ items: PERIODS, value: period, onChange: (v) => { period = v; try { sessionStorage.setItem('dashPeriod', v); } catch { /* ok */ } load().catch(fail); } }))); };
    await load();
  }
};
