import { api } from '../api.js';
import { h, mount, brl } from '../ui.js';
import { rise, riseMoney } from '../motion.js';

const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.flat().forEach((k) => e.append(k instanceof Node ? k : document.createTextNode(String(k)))); return e; };
const day = (iso) => iso.split('-').reverse().join('/');
const num = (v) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
const tick = (v) => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + ' mil' : String(Math.round(v * 10) / 10).replace('.', ','));
const BACK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
const LIVE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>';
const raw = (html, cls) => { const s = h('span', { class: cls }); s.innerHTML = html; return s; };

// Acumulado (linha com ponto brilhante no fim) contra o período anterior (linha cinza). Hoje: 24 horas; Tudo: 12 meses. Desenhado no tamanho real do quadro.
function chart(d, W, H) {
  const L = W < 600 ? 36 : 80, R = W < 600 ? 34 : 46, T = 14, B = 26;
  const all = Boolean(d.labels); const N = all ? d.labels.length : 24;
  const max = Math.max(...d.series.today, ...d.series.yesterday); const top = max > 0 ? max : 1;
  const x = (i) => L + ((W - L - R) * i) / (all ? N - 1 : N); const y = (v) => T + (H - T - B) * (1 - v / top);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'lv-chart', role: 'img', 'aria-label': all ? 'Vendas acumuladas por mês' : 'Vendas acumuladas por horário, hoje e ontem' });
  const lbl = ['0', '0,3', '0,5', '0,8', '1'];
  [0, 0.25, 0.5, 0.75, 1].forEach((f, i) => { const v = top * f; svg.append(sv('line', { class: 'g', x1: L, x2: W - R, y1: y(v), y2: y(v) }), sv('text', { class: 't', x: L - (W < 600 ? 8 : 26), y: y(v) + 3, 'text-anchor': 'end' }, max > 0 ? tick(v) : lbl[i])); });
  if (all) d.labels.forEach((m, i) => { if (N <= 6 || i % 2 === (N - 1) % 2) svg.append(sv('text', { class: 't', x: x(i), y: H - 6, 'text-anchor': 'middle' }, m)); });
  else { for (let hr = 0; hr <= 24; hr += 2) svg.append(sv('text', { class: 't', x: x(hr), y: H - 6, 'text-anchor': 'middle' }, String(hr).padStart(2, '0'))); svg.append(sv('text', { class: 't', x: W - R + 8, y: H - 6, 'text-anchor': 'start' }, 'Hora')); }
  const path = (arr) => { if (all) return arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' '); let p = `M${x(0)},${y(0)}`; for (let hr = 0; hr < 24; hr++) p += ` L${x(hr + 1)},${y(arr[hr])}`; return p; };
  const ex = x(all ? N - 1 : 24); const ey = y(d.series.today[N - 1]);
  if (!all) svg.append(sv('path', { class: 'yd', d: path(d.series.yesterday) }));
  svg.append(sv('line', { class: 'nw', x1: ex, x2: ex, y1: T, y2: H - B }), sv('path', { class: 'td', d: path(d.series.today) }));
  svg.append(sv('circle', { class: 'halo', cx: ex, cy: ey, r: 13 }), sv('circle', { class: 'dot', cx: ex, cy: ey, r: 8 }), sv('line', { class: 'dash', x1: ex - 4, x2: ex + 4, y1: ey, y2: ey }));
  return svg;
}

export default {
  async render(box) {
    let all = false; try { all = localStorage.getItem('neva.live.scope') === 'all'; } catch { /* sem armazenamento */ }
    const fetchLive = () => api.get('/dashboard/live', all ? { scope: 'all' } : {});
    let d = await fetchLive();
    const clock = h('b');
    const setClock = () => { clock.textContent = new Date(Date.now() - 3 * 3600e3).toISOString().slice(11, 19); };
    const plot = h('div', { class: 'lv-plot' }); const cbox = h('div', { class: 'lv-cbox' }, h('small', { class: 'lv-yl' }, 'Vendas (R$)'), plot);
    const paintChart = () => { const r = plot.getBoundingClientRect(); if (r.width > 40 && r.height > 40) mount(plot, chart(d, Math.round(r.width), Math.round(r.height))); };
    const ro = new ResizeObserver(paintChart); ro.observe(plot);
    // A página é montada uma vez; trocar Hoje/Tudo só muda textos e faz os números subirem (nada recarrega).
    const bigNum = h('strong', num(0)); const varB = h('b'); const varS = h('small');
    const cnt = h('b', '0'); const tick$ = h('b', { class: 'money', 'data-v': 0 }, brl(0)); const prof = h('b', { class: 'money', 'data-v': 0 }, brl(0));
    const titleH1 = h('h1'); const kLabel = h('small', { class: 'lv-k' }); const subP = h('p'); const legA = h('span'); const legB = h('span'); const profLbl = h('small');
    const modeBtns = [[false, 'Hoje'], [true, 'Tudo']].map(([v, l]) => h('button', { type: 'button', onclick: () => setScope(v) }, l));
    const fmtM = (n) => brl(n);
    function setMoney(el, v, animate) { el.dataset.v = String(v); el.dataset.counted = '1'; if (animate) rise(el, v, fmtM); else el.textContent = fmtM(v); }
    function draw(animate = false) {
      const v = d.variation; varB.textContent = v === null ? (d.revenue > 0 ? 'novo' : '+0%') : `${v >= 0 ? '+' : ''}${v.toLocaleString('pt-BR')}%`; varB.className = v !== null && v < 0 ? 'neg' : '';
      varS.textContent = all ? ' vs. mês anterior' : ' vs. ontem';
      titleH1.textContent = all ? 'Vendas totais' : 'Vendas hoje'; kLabel.textContent = all ? 'DESEMPENHO POR MÊS' : 'DESEMPENHO POR HORÁRIO';
      subP.textContent = all ? 'Vendas registradas acumuladas nos últimos 12 meses' : 'Vendas registradas ao longo do dia';
      legA.replaceChildren(h('i', { class: 'a' }), all ? 'Acumulado' : 'Hoje'); legB.replaceChildren(...(all ? [] : [h('i', { class: 'b' }), day(d.yesterday)])); legB.hidden = all;
      profLbl.textContent = all ? 'LUCRO TOTAL' : 'LUCRO DE HOJE';
      modeBtns.forEach((bt, i) => { const on = all === (i === 1); bt.classList.toggle('on', on); bt.setAttribute('aria-pressed', String(on)); });
      paintChart();
      if (animate) { rise(bigNum, d.revenue, num, 1.4); rise(cnt, d.count); } else { bigNum.textContent = num(d.revenue); cnt.textContent = String(d.count); }
      setMoney(tick$, d.ticket, animate); setMoney(prof, d.profit, animate);
    }
    const setScope = async (v) => { if (v === all) return; all = v; try { localStorage.setItem('neva.live.scope', all ? 'all' : 'today'); } catch { /* ok */ } try { d = await fetchLive(); } catch { all = !all; return; } draw(true); };
    mount(box, h('div', { class: 'lv' },
      h('header', { class: 'lv-top' },
        h('a', { class: 'lv-back', href: '#/dashboard' }, raw(BACK), 'Voltar à dashboard'),
        h('div', { class: 'lv-brand' }, h('i', { class: 'lv-wing l' }), h('div', { class: 'lv-plate' }, h('span', { class: 'lv-mark' }, 'N'), h('b', 'NEVA GROWTH')), h('i', { class: 'lv-wing r' })),
        h('div', { class: 'lv-mode', role: 'group', 'aria-label': 'Período' }, modeBtns)),
      h('div', { class: 'lv-hero' }, h('i', { class: 'lv-chev', 'aria-hidden': 'true' }),
        h('small', { class: 'lv-kick' }, 'SALA DE RECEITA', h('em', '✦'), h('strong', (d.name || '').split(' ')[0].toUpperCase())),
        titleH1, h('div', { class: 'lv-time' }, h('i'), h('span', day(d.today)), h('em', '✦'), clock, h('small', 'GMT-03'), h('i'))),
      h('div', { class: 'lv-wrap' },
        h('div', h('section', { class: 'lv-panel' }, h('i', { class: 'lv-rail l' }), h('i', { class: 'lv-rail r' }),
          h('div', { class: 'lv-ptop' }, h('small', 'VALOR VENDIDO REGISTRADO'), h('small', 'NG · LIVE 01')),
          h('div', { class: 'lv-big money' }, h('span', 'R$'), bigNum),
          h('div', { class: 'lv-pfoot' }, h('span', { class: 'lv-auto' }, raw(LIVE), 'Atualização automática'), h('i', { class: 'lv-sep' }), h('span', varB, varS))), h('div', { class: 'lv-glow' })),
        h('section', { class: 'lv-sec' }, kLabel,
          h('div', { class: 'lv-sh' }, h('div', h('h2', 'Tendência de vendas'), subP), h('div', { class: 'lv-leg' }, legA, legB)),
          h('div', { class: 'lv-trend' }, cbox),
          h('div', { class: 'lv-stats' }, [['VENDAS REGISTRADAS', cnt], ['TICKET MÉDIO', tick$], [profLbl, prof]].map(([l, val]) => h('div', typeof l === 'string' ? h('small', l) : l, val))))),
      h('i', { class: 'lv-water', 'aria-hidden': 'true' })));
    box.classList.add('lvbox'); setClock(); draw(true);
    const t1 = setInterval(setClock, 1000);
    const t2 = setInterval(async () => { try { d = await fetchLive(); draw(); } catch { /* tenta de novo no próximo ciclo */ } }, 15000);
    return () => { clearInterval(t1); clearInterval(t2); ro.disconnect(); box.classList.remove('lvbox'); };
  }
};
