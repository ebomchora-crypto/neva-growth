import { api } from '../api.js';
import { h, mount, money, icon } from '../ui.js';

const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.flat().forEach((k) => e.append(k instanceof Node ? k : document.createTextNode(String(k)))); return e; };
const day = (iso) => iso.split('-').reverse().join('/');
const short = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' mil' : String(Math.round(n * 10) / 10).replace('.', ','));

// Acumulado de hoje (linha cheia, até a hora atual) contra o de ontem (linha tracejada) — eixo 00 a 24.
function chart(d) {
  const W = 1100, H = 300, L = 70, R = 24, T = 16, B = 34;
  const max = Math.max(1, ...d.series.today, ...d.series.yesterday);
  const x = (hr) => L + ((W - L - R) * hr) / 24; const y = (v) => T + (H - T - B) * (1 - v / max);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lv-chart', role: 'img', 'aria-label': 'Vendas acumuladas por horário, hoje e ontem' });
  for (let g = 0; g <= 4; g++) { const v = (max * g) / 4; svg.append(sv('line', { class: 'g', x1: L, x2: W - R, y1: y(v), y2: y(v) }), sv('text', { class: 't', x: L - 10, y: y(v) + 4, 'text-anchor': 'end' }, g === 0 ? '0' : short(v))); }
  for (let hr = 0; hr <= 24; hr += 2) svg.append(sv('text', { class: 't', x: x(hr), y: H - 10, 'text-anchor': 'middle' }, String(hr).padStart(2, '0')));
  const pt = (arr, hr) => `${hr ? 'L' : 'M'}${x(hr + 1)},${y(arr[hr])}`;
  const line = (arr, upto) => { let p = `M${x(0)},${y(0)}`; for (let hr = 0; hr <= upto; hr++) p += ' ' + pt(arr, hr).replace(/^M/, 'L'); return p; };
  svg.append(sv('path', { class: 'yd', d: line(d.series.yesterday, 23) }));
  const cur = Math.min(23, d.hour); const nowX = x(cur + 1);
  svg.append(sv('path', { class: 'ar', d: `${line(d.series.today, cur)} L${nowX},${y(0)} L${x(0)},${y(0)} Z` }), sv('path', { class: 'td', d: line(d.series.today, cur) }));
  svg.append(sv('line', { class: 'nw', x1: nowX, x2: nowX, y1: T, y2: H - B }), sv('circle', { class: 'dot', cx: nowX, cy: y(d.series.today[cur]), r: 7 }));
  return svg;
}

export default {
  async render(box) {
    let d = await api.get('/dashboard/live');
    const clock = h('b'); const timer = h('div', { class: 'lv-time' }, h('span', day(d.today)), h('i', '✦'), clock, h('small', 'GMT-03'));
    const tick = () => { clock.textContent = new Date(Date.now() - 3 * 3600e3).toISOString().slice(11, 19); };
    const body = h('div', { class: 'lv-body' });
    function draw() {
      const v = d.variation; const vtxt = v === null ? (d.revenue > 0 ? 'novo' : '0%') : `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR')}%`;
      mount(body,
        h('section', { class: 'lv-panel' }, h('div', { class: 'lv-ptop' }, h('small', 'VALOR VENDIDO REGISTRADO'), h('small', 'NG · LIVE 01')),
          h('div', { class: 'lv-big' }, h('strong', money(d.revenue))),
          h('div', { class: 'lv-pfoot' }, h('span', h('i', { class: 'lv-dot' }), 'Atualização automática'), h('span', h('b', { class: v !== null && v < 0 ? 'neg' : '' }, vtxt), ' vs. ontem'))),
        h('section', { class: 'lv-sec' }, h('small', { class: 'lv-k' }, 'DESEMPENHO POR HORÁRIO'),
          h('div', { class: 'lv-sh' }, h('div', h('h2', 'Tendência de vendas'), h('p', 'Vendas registradas ao longo do dia')), h('div', { class: 'lv-leg' }, h('span', h('i', { class: 'a' }), 'Hoje'), h('span', h('i', { class: 'b' }), day(d.yesterday)))),
          h('div', { class: 'lv-cwrap' }, h('small', 'Vendas (R$)'), chart(d), h('small', { class: 'lv-hr' }, 'Hora'))),
        h('div', { class: 'lv-stats' }, [['VENDAS REGISTRADAS', String(d.count)], ['TICKET MÉDIO', null, d.ticket], ['LUCRO DE HOJE', null, d.profit]].map(([l, t, m]) => h('div', h('small', l), h('b', t ?? money(m))))),
        h('section', { class: 'lv-sec' }, h('small', { class: 'lv-k' }, 'ÚLTIMAS VENDAS'), h('h2', 'Vendas de hoje'),
          d.recent.length ? h('div', { class: 'lv-list' }, d.recent.map((s) => h('div', h('i', icon('wallet')), h('span', h('b', s.description), h('small', s.client_name || 'Independente')), money(s.amount)))) : h('p', { class: 'lv-empty' }, 'Nenhuma venda paga registrada hoje. Registre uma venda e ela aparece aqui em segundos.')));
    }
    mount(box, h('div', { class: 'lv' },
      h('header', { class: 'lv-top' }, h('a', { class: 'lv-back', href: '#/dashboard' }, icon('arrow'), 'Voltar à dashboard'), h('div', { class: 'lv-logo' }, h('i', 'N'), h('b', 'NEVA GROWTH'))),
      h('div', { class: 'lv-hero' }, h('small', 'SALA DE RECEITA ✦ ', h('em', (d.name || '').split(' ')[0].toUpperCase())), h('h1', 'Vendas hoje'), timer), body));
    box.classList.add('lvbox'); tick(); draw();
    const t1 = setInterval(tick, 1000);
    const t2 = setInterval(async () => { try { d = await api.get('/dashboard/live'); draw(); } catch { /* tenta de novo no próximo ciclo */ } }, 15000);
    return () => { clearInterval(t1); clearInterval(t2); box.classList.remove('lvbox'); };
  }
};
