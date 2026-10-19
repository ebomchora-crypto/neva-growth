import { api } from '../api.js';
import { h, mount, money } from '../ui.js';

const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.flat().forEach((k) => e.append(k instanceof Node ? k : document.createTextNode(String(k)))); return e; };
const day = (iso) => iso.split('-').reverse().join('/');
const num = (v) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
const tick = (v) => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + ' mil' : String(Math.round(v * 10) / 10).replace('.', ','));
const BACK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
const LIVE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>';
const raw = (html, cls) => { const s = h('span', { class: cls }); s.innerHTML = html; return s; };

// Acumulado de hoje (linha até a hora atual, ponto brilhante no fim) contra o de ontem (linha cinza) — eixo 00 a 24.
function chart(d) {
  const W = 1180, H = 170, L = 80, R = 40, T = 12, B = 30;
  const max = Math.max(...d.series.today, ...d.series.yesterday); const top = max > 0 ? max : 1;
  const x = (hr) => L + ((W - L - R) * hr) / 24; const y = (v) => T + (H - T - B) * (1 - v / top);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lv-chart', role: 'img', 'aria-label': 'Vendas acumuladas por horário, hoje e ontem', preserveAspectRatio: 'none' });
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => { const v = top * f; svg.append(sv('line', { class: 'g', x1: L, x2: W - R, y1: y(v), y2: y(v) }), sv('text', { class: 't', x: L - 24, y: y(v) + 3, 'text-anchor': 'end' }, max > 0 ? tick(v) : String(f).replace('.', ',').replace('0,25', '0,3').replace('0,75', '0,8'))); });
  for (let hr = 0; hr <= 24; hr += 2) svg.append(sv('text', { class: 't', x: x(hr), y: H - 6, 'text-anchor': 'middle' }, String(hr).padStart(2, '0')));
  svg.append(sv('text', { class: 't', x: W - R + 6, y: H - 14, 'text-anchor': 'start' }, 'Hora'));
  const path = (arr, upto) => { let p = `M${x(0)},${y(0)}`; for (let hr = 0; hr <= upto; hr++) p += ` L${x(hr + 1)},${y(arr[hr])}`; return p; };
  const cur = Math.min(23, d.hour); const nx = x(cur + 1); const ny = y(d.series.today[cur]);
  svg.append(sv('path', { class: 'yd', d: path(d.series.yesterday, 23) }), sv('line', { class: 'nw', x1: nx, x2: nx, y1: T, y2: H - B }), sv('path', { class: 'td', d: path(d.series.today, cur) }));
  svg.append(sv('circle', { class: 'halo', cx: nx, cy: ny, r: 11 }), sv('circle', { class: 'dot', cx: nx, cy: ny, r: 7 }), sv('line', { class: 'dash', x1: nx - 3.5, x2: nx + 3.5, y1: ny, y2: ny }));
  return svg;
}

export default {
  async render(box) {
    let d = await api.get('/dashboard/live');
    const clock = h('b');
    const setClock = () => { clock.textContent = new Date(Date.now() - 3 * 3600e3).toISOString().slice(11, 19); };
    const panel = h('div'); const trend = h('div'); const stats = h('div');
    function draw() {
      const v = d.variation; const vtxt = v === null ? (d.revenue > 0 ? 'novo' : '+0%') : `${v >= 0 ? '+' : ''}${v.toLocaleString('pt-BR')}%`;
      mount(panel, h('section', { class: 'lv-panel' },
        h('i', { class: 'lv-rail l' }), h('i', { class: 'lv-rail r' }),
        h('div', { class: 'lv-ptop' }, h('small', 'VALOR VENDIDO REGISTRADO'), h('small', 'NG · LIVE 01')),
        h('div', { class: 'lv-big money' }, h('span', 'R$'), h('strong', num(d.revenue))),
        h('div', { class: 'lv-pfoot' }, h('span', { class: 'lv-auto' }, raw(LIVE), 'Atualização automática'), h('i', { class: 'lv-sep' }), h('span', h('b', { class: v !== null && v < 0 ? 'neg' : '' }, vtxt), h('small', ' vs. ontem')))),
        h('div', { class: 'lv-glow' }));
      mount(trend, h('div', { class: 'lv-cbox' }, h('small', { class: 'lv-yl' }, 'Vendas (R$)'), chart(d)));
      mount(stats, h('div', { class: 'lv-stats' }, [['VENDAS REGISTRADAS', h('b', String(d.count))], ['TICKET MÉDIO', h('b', money(d.ticket))], ['LUCRO DE HOJE', h('b', money(d.profit))]].map(([l, val]) => h('div', h('small', l), val))));
    }
    mount(box, h('div', { class: 'lv' },
      h('header', { class: 'lv-top' },
        h('a', { class: 'lv-back', href: '#/dashboard' }, raw(BACK), 'Voltar à dashboard'),
        h('div', { class: 'lv-brand' }, h('i', { class: 'lv-wing l' }), h('div', { class: 'lv-plate' }, h('span', { class: 'lv-mark' }, 'N'), h('b', 'NEVA GROWTH')), h('i', { class: 'lv-wing r' }))),
      h('div', { class: 'lv-hero' }, h('i', { class: 'lv-chev', 'aria-hidden': 'true' }),
        h('small', { class: 'lv-kick' }, 'SALA DE RECEITA', h('em', '✦'), h('strong', (d.name || '').split(' ')[0].toUpperCase())),
        h('h1', 'Vendas hoje'),
        h('div', { class: 'lv-time' }, h('i'), h('span', day(d.today)), h('em', '✦'), clock, h('small', 'GMT-03'), h('i'))),
      h('div', { class: 'lv-wrap' }, panel,
        h('section', { class: 'lv-sec' }, h('small', { class: 'lv-k' }, 'DESEMPENHO POR HORÁRIO'),
          h('div', { class: 'lv-sh' }, h('div', h('h2', 'Tendência de vendas'), h('p', 'Vendas registradas ao longo do dia')), h('div', { class: 'lv-leg' }, h('span', h('i', { class: 'a' }), 'Hoje'), h('span', h('i', { class: 'b' }), day(d.yesterday)))),
          trend, stats)),
      h('i', { class: 'lv-water', 'aria-hidden': 'true' }, 'N')));
    box.classList.add('lvbox'); setClock(); draw();
    const t1 = setInterval(setClock, 1000);
    const t2 = setInterval(async () => { try { d = await api.get('/dashboard/live'); draw(); } catch { /* tenta de novo no próximo ciclo */ } }, 15000);
    return () => { clearInterval(t1); clearInterval(t2); box.classList.remove('lvbox'); };
  }
};
