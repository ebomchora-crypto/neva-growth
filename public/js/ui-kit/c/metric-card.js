// Metric Card — porte em JS puro do componente "Metric Card" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, clamp, reduced, disposer, PALETTE } from '../kit.js';

// A caixa de desenho do gráfico; ela estica até a largura do cartão.
const W = 400, H = 120, PAD_Y = 10;
// Todo período é reamostrado para este número de pontos, para uma forma poder virar outra.
const SAMPLES = 90, MORPH_MS = 420, DAY = 86400000, SNAP_PX = 6;
const DIGIT = /\d/;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
// Cores do detalhamento, da mais escura para a mais clara.
const SWATCHES = [PALETTE.ice900, PALETTE.ice600, PALETTE.ice300, PALETTE.ice200];
const SEGMENTS = ['Mensalidades', 'Vendas avulsas', 'Serviços'];
const PERIODS = [7, 30, 90];
const sum = (v) => v.reduce((a, b) => a + b, 0);

// Dados de exemplo com semente fixa: planos sobem aos poucos, uma promoção e um reajuste deixam marca.
function demoData(days, end) {
  let seed = 42;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const last = Date.parse(`${end}T00:00:00Z`), out = [];
  let plans = 820, usage = 380;
  for (let i = 0; i < days; i++) {
    const t = last - (days - 1 - i) * DAY, wd = new Date(t).getUTCDay(), weekend = wd === 0 || wd === 6;
    plans += 1.6 + (random() - 0.5) * 9;
    if (i === days - 12) plans *= 1.09; // o novo preço levanta os planos de vez
    usage += 0.9 + (random() - 0.5) * 14;
    const promo = i >= days - 27 && i <= days - 22;
    const services = 150 * (promo ? 2.1 : 1) * (0.7 + random() * 0.6);
    out.push({ date: new Date(t).toISOString().slice(0, 10), parts: [Math.round(plans * (0.97 + random() * 0.06)), Math.round(usage * (weekend ? 0.72 : 1) * (0.9 + random() * 0.2)), Math.round(services * (weekend ? 0.5 : 1))] });
  }
  return out;
}
const DATA = demoData(180, '2026-10-14');
const EVENTS = [{ date: DATA[180 - 27].date, label: 'Promo de outono' }, { date: DATA[180 - 12].date, label: 'Novo preço' }];

const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/\./g, '');
const fmtShort = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/\./g, '');
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// Reamostra `values` linearmente para `count` pontos igualmente espaçados.
function resample(values, count) {
  return Array.from({ length: count }, (_, i) => {
    const at = (i / (count - 1)) * (values.length - 1), lo = Math.floor(at), hi = Math.min(values.length - 1, lo + 1);
    return values[lo] + (values[hi] - values[lo]) * (at - lo);
  });
}
const yOf = (height) => PAD_Y + (1 - height) * (H - PAD_Y * 2);
// Alturas 0..1 viram um caminho SVG suavizado por spline de Catmull-Rom.
function toPath(heights) {
  const pts = heights.map((v, i) => [(i / (heights.length - 1)) * W, yOf(v)]);
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}
const toArea = (line) => `${line}L${W} ${H}L0 ${H}Z`;

// Números e forma de um período, para a métrica toda ou um segmento só.
function buildPeriod(data, days, focus) {
  const current = data.slice(-days), previous = data.slice(-days * 2, -days);
  const pick = (p) => (focus === null ? sum(p.parts) : p.parts[focus] ?? 0);
  const now = current.map(pick), before = previous.map(pick), all = [...now, ...before];
  const lo = Math.min(...all) * 0.85, hi = Math.max(...all) * 1.04;
  const norm = (v) => (v - lo) / (hi - lo || 1);
  return {
    current, previous, now, before, norm,
    shape: { current: resample(now.map(norm), SAMPLES), previous: resample(before.map(norm), SAMPLES) },
    // Desenhado pelos dias reais quando assenta, para os pontos ficarem sobre a linha.
    paths: { current: toPath(now.map(norm)), previous: toPath(before.map(norm)) },
  };
}
const totalOf = (values, span) => sum(span ? values.slice(span.lo, span.hi + 1) : values);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export default function mount(stage, ctx) {
  ensureStyle('metric-card', `
.kk-metric-card-wrap{width:100%;display:flex;justify-content:center;padding:4px 0}
.kk-metric-card{width:100%;max-width:420px;padding:18px;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);user-select:none;-webkit-user-select:none;container-type:inline-size}
.kk-metric-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.kk-metric-card-label{margin:0;font-size:14px;color:var(--mut,#4a6f93);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-metric-card-label b{font-weight:500;color:var(--ink,#0e2236)}
.kk-metric-card-seg{position:relative;display:flex;flex-shrink:0;padding:2px;border-radius:999px;background:var(--ice-100,#e3f0fb)}
.kk-metric-card-pill{position:absolute;top:2px;bottom:2px;left:2px;width:48px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(15,53,96,.15);transition:transform .2s cubic-bezier(.23,1,.32,1)}
.kk-metric-card-seg button{position:relative;width:48px;white-space:nowrap;min-height:36px;border:0;border-radius:999px;background:none;font:600 12px/1 inherit;font-family:inherit;font-variant-numeric:tabular-nums;color:var(--mut,#4a6f93);cursor:pointer;transition:color .2s}
.kk-metric-card-seg button[aria-pressed=true]{color:var(--ink,#0e2236)}
.kk-metric-card button:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:1px}
.kk-metric-card-value{margin:10px 0 0;font-weight:700;font-size:36px;line-height:1.1;letter-spacing:-.02em}
.kk-metric-card-roll{display:inline-flex;font-variant-numeric:tabular-nums}
.kk-metric-card-wheel{position:relative;display:inline-block;height:1em;overflow:hidden;line-height:1}
.kk-metric-card-wheel i{visibility:hidden;font-style:normal}
.kk-metric-card-wheel div{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;transition:transform .38s cubic-bezier(.23,1,.32,1)}
.kk-metric-card-wheel span{display:block;height:1em;line-height:1}
.kk-metric-card-delta{display:flex;align-items:center;gap:8px;min-height:22px;margin-top:6px;font-size:13px;font-variant-numeric:tabular-nums}
.kk-metric-card-delta b{flex-shrink:0;font-weight:600}
.kk-metric-card-delta .up{color:var(--ok,#1f9d6b)}.kk-metric-card-delta .down{color:var(--bad,#d1434b)}
.kk-metric-card-cap{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mut,#4a6f93)}
.kk-metric-card-cap em{font-style:normal;color:var(--ice-600,#2f7bbd);font-weight:600}
.kk-metric-card-clear{margin-left:auto;flex-shrink:0;min-height:36px;padding:0 10px;border:0;border-radius:999px;background:none;font:500 12px/1 inherit;font-family:inherit;color:var(--mut,#4a6f93);cursor:pointer}
.kk-metric-card-clear:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-metric-card-chart{position:relative;margin-top:14px;height:128px;border-radius:8px;cursor:crosshair;touch-action:pan-y;outline:none}
.kk-metric-card-chart:focus-visible{box-shadow:0 0 0 2px var(--ice-500,#4a95d2)}
.kk-metric-card-chart>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.kk-metric-card-abs{position:absolute;pointer-events:none}
.kk-metric-card-pin{top:0;bottom:0;width:1px;transform:translateX(-50%)}
.kk-metric-card-pin::before{content:"";position:absolute;inset:0 auto 0 0;border-left:1px dashed rgba(47,123,189,.4)}
.kk-metric-card-pin::after{content:"";position:absolute;left:50%;bottom:0;width:6px;height:6px;border-radius:50%;background:var(--ice-600,#2f7bbd);box-shadow:0 0 0 2px #fff;transform:translate(-50%,50%)}
.kk-metric-card-vline{top:0;bottom:0;width:1px;background:var(--ice-200,#c9e1f6)}
.kk-metric-card-dot{border-radius:50%;transform:translate(-50%,-50%)}
.kk-metric-card-dot.now{width:10px;height:10px;background:var(--ice-900,#0f3560);box-shadow:0 0 0 4px #fff}
.kk-metric-card-dot.twin{width:8px;height:8px;background:#fff;border:1px solid var(--ice-300,#a5cdee)}
.kk-metric-card-dot.end{right:0;width:8px;height:8px;background:var(--ice-900,#0f3560);box-shadow:0 0 0 4px #fff;transform:translate(50%,-50%);transition:top .42s cubic-bezier(.65,0,.35,1),opacity .2s}
.kk-metric-card-axis{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px;color:#7d9bb9;font-variant-numeric:tabular-nums}
.kk-metric-card-axis span{display:flex;align-items:center;gap:6px}
.kk-metric-card-axis i{display:block;width:12px;border-top:1px dashed var(--ice-300,#a5cdee)}
.kk-metric-card-bd{margin-top:14px;padding-top:14px;border-top:1px solid var(--ice-100,#e3f0fb)}
.kk-metric-card-bar{display:flex;height:6px;gap:2px}
.kk-metric-card-bar span{min-width:0;border-radius:999px;transition:flex-grow .3s cubic-bezier(.23,1,.32,1),opacity .3s}
.kk-metric-card-bd ul{list-style:none;margin:8px -8px 0;padding:0}
.kk-metric-card-bd li button{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:0 8px;border:0;border-radius:10px;background:none;text-align:left;font:14px/1.2 inherit;font-family:inherit;color:var(--ink,#0e2236);cursor:pointer;transition:background-color .15s,opacity .15s}
.kk-metric-card-bd li button:hover{background:var(--ice-50,#f2f8fe)}
.kk-metric-card-bd li button[aria-pressed=true]{background:var(--ice-100,#e3f0fb)}
.kk-metric-card-bd li button.dim{opacity:.5}
.kk-metric-card-bd li i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.kk-metric-card-bd li .n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#35597e}
.kk-metric-card-bd li .v{font-weight:600;font-variant-numeric:tabular-nums}
.kk-metric-card-bd li .p{width:40px;text-align:right;color:#7d9bb9;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.kk-metric-card-pill,.kk-metric-card-wheel div,.kk-metric-card-bar span,.kk-metric-card-dot.end{transition:none}}
`);
  const dispose = disposer();
  const noMotion = reduced();
  const clipId = 'kk-metric-card-lit-' + Math.random().toString(36).slice(2, 8);

  const st = { period: 30, focus: null, cursor: null, range: null, drag: null, info: null, shown: null, raf: 0 };
  st.info = buildPeriod(DATA, st.period, null);
  st.shown = st.info.shape;

  /* ---------- estrutura ---------- */
  const labelEl = h('p', { class: 'kk-metric-card-label' });
  const pill = h('span', { class: 'kk-metric-card-pill', 'aria-hidden': 'true' });
  const periodBtns = PERIODS.map((d) => h('button', { type: 'button', onClick: () => choosePeriod(d) }, `${d} d`));
  const valueSr = h('span', { style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' });
  const roll = h('span', { class: 'kk-metric-card-roll', 'aria-hidden': 'true' });
  const deltaEl = h('b', {});
  const capEl = h('span', { class: 'kk-metric-card-cap', 'aria-live': 'polite' });
  const clearBtn = h('button', { type: 'button', class: 'kk-metric-card-clear', onClick: () => clearRead() }, 'Limpar');
  clearBtn.hidden = true;

  const pathPrev = svg('path', { fill: 'none', stroke: PALETTE.ice300, 'stroke-dasharray': '3 4', 'stroke-width': 1.25, 'vector-effect': 'non-scaling-stroke' });
  const clipRect = svg('rect', { height: H + 20, y: -10, x: 0, width: W });
  const area = svg('path', { fill: 'rgba(15,53,96,.06)', 'clip-path': `url(#${clipId})` });
  const lineDim = svg('path', { fill: 'none', stroke: 'rgba(15,53,96,.25)', 'stroke-width': 2, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
  const line = svg('path', { fill: 'none', stroke: PALETTE.ice900, 'stroke-width': 2, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'clip-path': `url(#${clipId})` });
  const chartSvg = svg('svg', { 'aria-hidden': 'true', preserveAspectRatio: 'none', viewBox: `0 0 ${W} ${H}` },
    svg('defs', {}, svg('clipPath', { id: clipId }, clipRect)),
    svg('line', { x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, stroke: PALETTE.ice100, 'vector-effect': 'non-scaling-stroke' }),
    pathPrev, area, lineDim, line);

  const pinsEl = h('div', { 'aria-hidden': 'true' });
  const rangeLo = h('div', { class: 'kk-metric-card-abs kk-metric-card-vline' }), rangeHi = h('div', { class: 'kk-metric-card-abs kk-metric-card-vline' });
  const dayLine = h('div', { class: 'kk-metric-card-abs kk-metric-card-vline' });
  const twinDot = h('div', { class: 'kk-metric-card-abs kk-metric-card-dot twin' });
  const nowDot = h('div', { class: 'kk-metric-card-abs kk-metric-card-dot now' });
  const endDot = h('div', { class: 'kk-metric-card-abs kk-metric-card-dot end', 'aria-hidden': 'true' });
  for (const e of [rangeLo, rangeHi, dayLine, twinDot, nowDot]) e.hidden = true;

  const chart = h('div', { class: 'kk-metric-card-chart', role: 'slider', tabindex: '0', 'aria-valuemin': '1' }, chartSvg, pinsEl, rangeLo, rangeHi, dayLine, twinDot, nowDot, endDot);
  const axisA = h('span', {}), axisB = h('span', {});
  const axis = h('div', { class: 'kk-metric-card-axis' }, axisA, h('span', {}, h('i'), 'Período anterior'), axisB);

  const barEls = SEGMENTS.map(() => h('span'));
  const rows = SEGMENTS.map((name, i) => {
    const sw = h('i'), v = h('span', { class: 'v' }), p = h('span', { class: 'p' });
    const btn = h('button', { type: 'button', onClick: () => { st.focus = st.focus === i ? null : i; rebuild(); } }, sw, h('span', { class: 'n' }, name), v, p);
    return { btn, sw, v, p };
  });
  const bd = h('div', { class: 'kk-metric-card-bd' }, h('div', { class: 'kk-metric-card-bar', 'aria-hidden': 'true' }, ...barEls), h('ul', {}, rows.map((r) => h('li', {}, r.btn))));

  stage.append(h('div', { class: 'kk-metric-card-wrap' }, h('div', { class: 'kk-metric-card' },
    h('div', { class: 'kk-metric-card-top' }, labelEl, h('div', { class: 'kk-metric-card-seg' }, pill, ...periodBtns)),
    h('p', { class: 'kk-metric-card-value' }, valueSr, roll),
    h('div', { class: 'kk-metric-card-delta' }, deltaEl, capEl, clearBtn),
    chart, axis, bd)));

  /* ---------- número que rola: cada dígito numa roda, separadores parados ---------- */
  const cache = new Map();
  function setRoll(text) {
    const chars = [...text], seen = [];
    chars.forEach((ch, i) => {
      const key = (DIGIT.test(ch) ? 'd' : 's') + (chars.length - i); // chave pela direita: unidades ficam no lugar quando o tamanho muda
      let el = cache.get(key);
      if (DIGIT.test(ch)) {
        if (!el) {
          const strip = h('div', {}, DIGITS.map((d) => h('span', {}, d)));
          el = h('span', { class: 'kk-metric-card-wheel' }, h('i', {}, '0'), strip); el.strip = strip; cache.set(key, el);
        }
        el.strip.style.transform = `translateY(-${Number(ch) * 10}%)`;
      } else {
        if (!el) { el = h('span', {}); cache.set(key, el); }
        el.textContent = ch;
      }
      seen.push(el);
    });
    seen.forEach((el, i) => { if (roll.children[i] !== el) roll.insertBefore(el, roll.children[i] ?? null); });
    while (roll.children.length > seen.length) roll.lastChild.remove();
  }

  /* ---------- leitura do cartão: intervalo, um dia ou o período todo ---------- */
  const last = () => st.info.current.length - 1;
  function spanOf() {
    const { range, cursor } = st;
    if (range && range.a !== range.b) return { span: { lo: Math.min(range.a, range.b), hi: Math.max(range.a, range.b) }, ranged: true };
    if (cursor !== null && cursor <= last()) return { span: { lo: cursor, hi: cursor }, ranged: false };
    return { span: null, ranged: false };
  }
  const xOf = (i) => (last() ? (i / last()) * W : W);
  const pct = (i) => (xOf(i) / W) * 100;

  function update() {
    const { info } = st, { span, ranged } = spanOf();
    const day = span && !ranged ? info.current[span.lo] : undefined, twin = span && !ranged ? info.previous[span.lo] : undefined;
    const value = totalOf(info.now, span), compare = totalOf(info.before, span);
    const delta = compare ? (value - compare) / compare : 0;
    const event = day ? EVENTS.find((e) => e.date === day.date) : undefined;
    let caption = `vs ${st.period} dias anteriores`;
    if (ranged) caption = `${fmtShort(info.current[span.lo].date)} – ${fmtShort(info.current[span.hi].date)} vs ${span.hi - span.lo + 1} dias antes`;
    else if (day) caption = `${fmtDay(day.date)} vs ${fmtShort(twin?.date ?? day.date)}`;
    const formatted = money.format(value);

    labelEl.replaceChildren('Receita', ...(st.focus !== null ? [' · ', h('b', {}, SEGMENTS[st.focus])] : []));
    valueSr.textContent = formatted; setRoll(formatted);
    const up = delta >= 0;
    deltaEl.className = up ? 'up' : 'down';
    deltaEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(delta * 100).toFixed(1).replace('.', ',')}%`;
    capEl.replaceChildren(caption, ...(event ? [' · ', h('em', {}, event.label)] : []));
    clearBtn.hidden = !ranged;

    // Parte iluminada da linha: até o dia lido, sobre o intervalo ou tudo.
    const litFrom = ranged ? xOf(span.lo) : 0, litTo = span ? xOf(span.hi) : W;
    clipRect.setAttribute('x', litFrom); clipRect.setAttribute('width', Math.max(0, litTo - litFrom));
    const place = (el, i, y) => { el.style.left = `${pct(i)}%`; if (y !== undefined) el.style.top = `${(y / H) * 100}%`; };
    rangeLo.hidden = rangeHi.hidden = !ranged;
    if (ranged) { place(rangeLo, span.lo); place(rangeHi, span.hi); }
    dayLine.hidden = nowDot.hidden = !day; twinDot.hidden = !(day && twin);
    if (day) {
      place(dayLine, span.lo); place(nowDot, span.lo, yOf(info.norm(info.now[span.lo])));
      if (twin) place(twinDot, span.lo, yOf(info.norm(info.before[span.lo])));
    }
    endDot.style.top = `${((info.now.length ? yOf(info.norm(info.now[last()])) : 0) / H) * 100}%`;
    endDot.style.opacity = span ? '0' : '1';

    const first = info.current[0], lastDay = info.current[last()];
    axisA.textContent = first ? fmtShort(first.date) : ''; axisB.textContent = lastDay ? fmtShort(lastDay.date) : '';
    chart.setAttribute('aria-label', `Receita nos últimos ${st.period} dias. Setas leem cada dia; com Shift, selecionam um intervalo.`);
    chart.setAttribute('aria-valuemax', String(info.current.length));
    chart.setAttribute('aria-valuenow', String(span ? span.hi + 1 : info.current.length));
    chart.setAttribute('aria-valuetext', ranged ? `${caption}: ${formatted}` : day ? `${fmtDay(day.date)}: ${formatted}${event ? `, ${event.label}` : ''}` : `${formatted} no total`);

    // Detalhamento segue o que o cartão lê.
    const parts = new Array(SEGMENTS.length).fill(0);
    for (const pt of span ? info.current.slice(span.lo, span.hi + 1) : info.current) pt.parts.forEach((v, i) => { parts[i] += v ?? 0; });
    const tot = sum(parts), swatch = (i) => SWATCHES[st.focus === i ? 0 : i % SWATCHES.length];
    rows.forEach((r, i) => {
      r.sw.style.background = swatch(i); barEls[i].style.background = swatch(i);
      barEls[i].style.flexGrow = parts[i]; barEls[i].style.opacity = st.focus !== null && st.focus !== i ? '.25' : '1';
      r.v.textContent = money.format(parts[i]); r.p.textContent = `${(tot ? (parts[i] / tot) * 100 : 0).toFixed(0)}%`;
      r.btn.setAttribute('aria-pressed', String(st.focus === i));
      r.btn.setAttribute('aria-label', st.focus === i ? 'Mostrar toda a receita' : `Mostrar só ${SEGMENTS[i]}`);
      r.btn.classList.toggle('dim', st.focus !== null && st.focus !== i);
    });
    periodBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(PERIODS[i] === st.period)));
    pill.style.transform = `translateX(${PERIODS.indexOf(st.period) * 100}%)`;
  }

  /* ---------- troca de período ou segmento: as linhas se transformam a partir de onde estão ---------- */
  const paint = (paths) => {
    line.setAttribute('d', paths.current); lineDim.setAttribute('d', paths.current);
    area.setAttribute('d', toArea(paths.current)); pathPrev.setAttribute('d', paths.previous);
  };
  function morph() {
    cancelAnimationFrame(st.raf);
    const from = st.shown, to = st.info.shape, info = st.info;
    const land = () => { st.shown = to; paint(info.paths); };
    if (from === to || noMotion) { land(); return; }
    const t0 = performance.now();
    const frame = (now) => {
      const t = easeInOut(Math.min(1, (now - t0) / MORPH_MS)), mixA = (a, b) => a.map((v, i) => v + (b[i] - v) * t);
      st.shown = { current: mixA(from.current, to.current), previous: mixA(from.previous, to.previous) };
      if (t < 1) { paint({ current: toPath(st.shown.current), previous: toPath(st.shown.previous) }); st.raf = requestAnimationFrame(frame); } else land();
    };
    st.raf = requestAnimationFrame(frame);
  }
  dispose(() => cancelAnimationFrame(st.raf));

  function rebuild() {
    st.info = buildPeriod(DATA, st.period, st.focus);
    pinsEl.replaceChildren(...EVENTS.map((e) => ({ ...e, at: st.info.current.findIndex((p) => p.date === e.date) })).filter((e) => e.at >= 0)
      .map((e) => { const el = h('div', { class: 'kk-metric-card-abs kk-metric-card-pin' }); el.style.left = `${pct(e.at)}%`; return el; }));
    morph(); update();
  }
  function clearRead() { st.range = null; st.cursor = null; update(); }
  function choosePeriod(d) { st.range = null; st.cursor = null; st.period = d; rebuild(); }

  /* ---------- ponteiro e teclado ---------- */
  const indexAt = (clientX) => {
    const r = chart.getBoundingClientRect(), t = clamp((clientX - r.left) / r.width, 0, 1), l = last() || 1;
    // Dias marcados puxam o cursor, para ser fácil cair na nota deles.
    const near = EVENTS.map((e) => st.info.current.findIndex((p) => p.date === e.date)).find((at) => at >= 0 && Math.abs((at / l - t) * r.width) < SNAP_PX);
    return near !== undefined ? near : Math.round(t * last());
  };
  chart.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    chart.setPointerCapture(e.pointerId);
    const at = indexAt(e.clientX); st.drag = at; st.range = null; st.cursor = at; update();
  });
  chart.addEventListener('pointermove', (e) => {
    const at = indexAt(e.clientX);
    if (st.drag !== null) { // arrastar além do primeiro dia transforma a leitura em intervalo
      const anchor = st.drag; st.range = st.range || at !== anchor ? { a: anchor, b: at } : null; st.cursor = at; update();
    } else if (e.pointerType === 'mouse' && !st.range) { st.cursor = at; update(); }
  });
  const release = (e) => { st.drag = null; if (e.pointerType !== 'mouse') { st.cursor = null; update(); } };
  chart.addEventListener('pointerup', release);
  chart.addEventListener('pointercancel', release);
  chart.addEventListener('lostpointercapture', release);
  chart.addEventListener('pointerleave', () => { if (st.drag === null && !st.range) { st.cursor = null; update(); } });
  chart.addEventListener('blur', () => { st.cursor = null; update(); });
  chart.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { clearRead(); return; }
    const l = last(), move = { ArrowLeft: -1, ArrowRight: 1, Home: -l, End: l }[e.key];
    if (move === undefined) return;
    e.preventDefault();
    const from = st.range ? st.range.b : st.cursor ?? l, to = clamp(from + move, 0, l);
    st.range = e.shiftKey ? { a: st.range ? st.range.a : from, b: to } : null;
    st.cursor = to; update();
  });

  rebuild();
  return () => dispose.run();
}
