// Apple Activity Card — porte em JS puro do componente "Apple Activity Card" .
import { h, svg, ensureStyle, loop, clamp, reduced } from '../kit.js';

const STROKE = 16;
const STAGGER = 0.18;   // anéis desenham um após o outro, com este intervalo (s)
const DRAW_S = 1.2;     // tempo da primeira volta; passar da meta soma até OVER_S
const OVER_S = 0.6;
const MAX_LAPS = 3;     // mais de três voltas viraria um anel sólido
const easeOut = (t) => 1 - (1 - t) ** 5;

// Anéis em tons de azul da Neva (do mais escuro, o externo, ao mais claro).
const DEFAULTS = [
  { label: 'VENDAS', color: '#1f5f9b', colorEnd: '#4a95d2', size: 200, current: 47, target: 80, unit: 'R$ MIL' },
  { label: 'LEADS', color: '#2f7bbd', colorEnd: '#7fb4e0', size: 160, current: 42, target: 30, unit: 'NOVOS' },
  { label: 'REUNIÕES', color: '#3aa0e8', colorEnd: '#8fd0f5', size: 120, current: 6, target: 12, unit: 'FEITAS' },
];
const ratioOf = (d) => (d.target > 0 ? Math.min(Math.max(d.current / d.target, 0), MAX_LAPS) : 0);
const drawSeconds = (ratio) => DRAW_S + OVER_S * Math.min(Math.max(ratio - 1, 0), 1);

const CSS = `
.kk-apple-activity-card-wrap{container-type:inline-size;width:100%;padding:18px 8px 14px;position:relative}
.kk-apple-activity-card-in{display:flex;flex-direction:column;align-items:center;gap:20px}
.kk-apple-activity-card-title{margin:0;font-size:20px;font-weight:600;color:var(--ink,#0e2236);opacity:0;transform:translateY(-12px)}
.kk-apple-activity-card-main{display:flex;flex-direction:column;align-items:center;gap:22px;width:100%}
@container (min-width:440px){.kk-apple-activity-card-main{flex-direction:row;justify-content:center}.kk-apple-activity-card-list{grid-template-columns:1fr!important;gap:22px!important;width:auto!important;text-align:left!important}}
.kk-apple-activity-card-rings{position:relative;flex:none}
.kk-apple-activity-card-ringbox{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.96)}
.kk-apple-activity-card-svg{transform:rotate(-90deg);overflow:visible;border-radius:50%;outline:none;transition:opacity .2s ease-out;pointer-events:none}
.kk-apple-activity-card-svg:focus-visible{box-shadow:0 0 0 2px var(--ice-500,#4a95d2)}
.kk-apple-activity-card-svg.dim{opacity:.25}
.kk-apple-activity-card-track{pointer-events:stroke}
.kk-apple-activity-card-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;gap:14px 10px;text-align:center;opacity:0;transform:translateX(16px)}
.kk-apple-activity-card-li{display:flex;flex-direction:column;transition:opacity .2s ease-out}
.kk-apple-activity-card-li.dim{opacity:.4}
.kk-apple-activity-card-lbl{font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--mut,#4a6f93)}
.kk-apple-activity-card-val{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
.kk-apple-activity-card-val small{display:block;margin:0;font-size:11px;font-weight:500;color:var(--mut,#4a6f93)}
.kk-apple-activity-card-in.go .kk-apple-activity-card-title{animation:kk-apple-activity-card-t .5s cubic-bezier(.23,1,.32,1) forwards}
.kk-apple-activity-card-in.go .kk-apple-activity-card-ringbox{animation:kk-apple-activity-card-r .3s cubic-bezier(.23,1,.32,1) forwards;animation-delay:calc(var(--i)*.18s)}
.kk-apple-activity-card-in.go .kk-apple-activity-card-list{animation:kk-apple-activity-card-l .5s .3s cubic-bezier(.23,1,.32,1) forwards}
@keyframes kk-apple-activity-card-t{to{opacity:1;transform:none}}
@keyframes kk-apple-activity-card-r{to{opacity:1;transform:none}}
@keyframes kk-apple-activity-card-l{to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.kk-apple-activity-card-in.go .kk-apple-activity-card-title,.kk-apple-activity-card-in.go .kk-apple-activity-card-ringbox,.kk-apple-activity-card-in.go .kk-apple-activity-card-list{animation:none;opacity:1;transform:none}.kk-apple-activity-card-title,.kk-apple-activity-card-ringbox,.kk-apple-activity-card-list{opacity:1;transform:none}}
.kk-apple-activity-card-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:16px}
.kk-apple-activity-card-bar button{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px inherit;cursor:pointer}
.kk-apple-activity-card-bar button:hover{background:var(--ice-100,#e3f0fb)}
.kk-apple-activity-card-bar button:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
`;

export default function mount(stage, ctx) {
  ensureStyle('apple-activity-card', CSS);
  const acts = DEFAULTS.map((d) => ({ ...d }));
  const boxSize = Math.max(...acts.map((a) => a.size));
  let active = null, started = false, shown = acts.map(() => null);
  const tweens = []; // { i, from, to, dur, delay, t, pulsed }
  const rings = [], counts = [], lis = [];

  // ---- Um anel
  function makeRing(a, i) {
    const radius = (a.size - STROKE) / 2, circ = radius * 2 * Math.PI, c = a.size / 2, uid = `kk-aac-${Math.random().toString(36).slice(2, 7)}`;
    const label = () => `${a.label}: ${a.current} de ${a.target} ${a.unit}, ${Math.round(ratioOf(a) * 100)}%`;
    const base = svg('circle', { cx: c, cy: c, r: radius, fill: 'none', stroke: `url(#${uid}g)`, 'stroke-dasharray': circ, 'stroke-dashoffset': circ, 'stroke-linecap': 'round', 'stroke-width': STROKE, 'pointer-events': 'none' });
    const lap = svg('circle', { cx: c, cy: c, r: radius, fill: 'none', stroke: a.colorEnd, 'stroke-dasharray': circ, 'stroke-dashoffset': circ, 'stroke-linecap': 'round', 'stroke-width': STROKE, 'pointer-events': 'none', style: 'opacity:0' });
    const cap = svg('g', { 'pointer-events': 'none', style: 'opacity:0;transform-box:view-box;transform-origin:center' }, svg('circle', { cx: c + radius, cy: c, r: STROKE / 2, fill: a.colorEnd, filter: `url(#${uid}s)` }));
    const pulse = svg('circle', { cx: c + radius, cy: c, r: STROKE / 2, fill: 'none', 'stroke-width': 2, stroke: a.colorEnd, 'pointer-events': 'none', style: 'opacity:0;transform-box:fill-box;transform-origin:center' });
    const track = svg('circle', { class: 'kk-apple-activity-card-track', cx: c, cy: c, r: radius, fill: 'none', stroke: '#d3e6f6', 'stroke-opacity': '.6', 'stroke-width': STROKE });
    track.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setActive(i); });
    track.addEventListener('pointerleave', () => setActive(null, i));
    const title = svg('title'); title.textContent = label();
    const el = svg('svg', { class: 'kk-apple-activity-card-svg', width: a.size, height: a.size, viewBox: `0 0 ${a.size} ${a.size}`, role: 'img', tabindex: '0', 'aria-label': label() },
      title,
      svg('defs', {},
        svg('linearGradient', { id: uid + 'g', x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, svg('stop', { offset: '0%', 'stop-color': a.color }), svg('stop', { offset: '100%', 'stop-color': a.colorEnd })),
        // Faz a segunda volta parecer deitada sobre a primeira.
        svg('filter', { id: uid + 's', x: '-100%', y: '-100%', width: '300%', height: '300%' }, svg('feDropShadow', { dx: 0, dy: -2.5, 'flood-color': '#0f3560', 'flood-opacity': 0.5, stdDeviation: 2 }))),
      track, base, lap, cap, pulse);
    el.addEventListener('focus', () => setActive(i)); el.addEventListener('blur', () => setActive(null, i));
    const box = h('div', { class: 'kk-apple-activity-card-ringbox', style: `--i:${i}` }, el);
    return { box, el, base, lap, cap, pulse, radius, circ, title, label };
  }

  // Desenha um quadro do anel: p = progresso em voltas (1 = meta). Passando da meta, a primeira volta fica cheia
  // e um segundo círculo desenha o excedente por cima, puxado por uma ponta com sombra, como no Watch.
  function paint(i, p, ratio) {
    const r = rings[i], a = acts[i];
    r.base.setAttribute('stroke-dashoffset', String((1 - Math.min(p, 1)) * r.circ));
    const over = p > 1, rest = over ? p - Math.floor(p) || 1 : 0;
    r.lap.setAttribute('stroke-dashoffset', String((1 - rest) * r.circ)); r.lap.style.opacity = over ? '1' : '0';
    r.cap.style.transform = `rotate(${rest * 360}deg)`; r.cap.style.opacity = over ? '1' : '0';
    counts[i].textContent = p >= ratio ? String(a.current) : String(Math.round((p / ratio) * a.current)); // conta junto com o anel e pousa no valor real
  }

  function drawTo(i, first) {
    const a = acts[i], ratio = ratioOf(a), from = shown[i];
    for (let k = tweens.length - 1; k >= 0; k--) if (tweens[k].i === i) tweens.splice(k, 1);
    rings[i].el.setAttribute('aria-label', rings[i].label()); rings[i].title.textContent = rings[i].label();
    if (reduced() || ratio === 0) { paint(i, ratio, ratio); shown[i] = ratio; return; }
    if (from === null) paint(i, 0, ratio); // primeira vez: o número não mostra o valor final enquanto o anel espera a vez
    tweens.push({ i, from: from ?? 0, to: ratio, dur: drawSeconds(ratio), delay: first ? i * STAGGER : 0, t: 0, pulsed: (from ?? 0) >= 1 });
  }

  const stopLoop = loop((dt) => {
    if (!tweens.length) return;
    for (let k = tweens.length - 1; k >= 0; k--) {
      const tw = tweens[k];
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t += dt;
      const u = clamp(tw.t / tw.dur, 0, 1), p = tw.from + (tw.to - tw.from) * easeOut(u);
      shown[tw.i] = p; paint(tw.i, p, tw.to);
      if (!tw.pulsed && p >= 1) { // a meta foi batida: a ponta pulsa uma vez no topo
        tw.pulsed = true;
        rings[tw.i].pulse.animate([{ transform: 'scale(1)', opacity: 0.6 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(0.23,1,0.32,1)' });
      }
      if (u >= 1) tweens.splice(k, 1);
    }
  });

  function setActive(i, from) {
    if (i === null) { if (from !== undefined && active !== from) return; active = null; } else active = i;
    rings.forEach((r, k) => r.el.classList.toggle('dim', active !== null && active !== k));
    lis.forEach((l, k) => l.classList.toggle('dim', active !== null && active !== k));
  }

  // ---- DOM
  acts.forEach((a, i) => rings.push(makeRing(a, i)));
  const listItems = acts.map((a, i) => {
    const num = h('span', { 'aria-hidden': 'true' }, String(a.current)); counts.push(num);
    const li = h('li', { class: 'kk-apple-activity-card-li', onpointerenter: (e) => { if (e.pointerType === 'mouse') setActive(i); }, onpointerleave: () => setActive(null, i) },
      h('span', { class: 'kk-apple-activity-card-lbl' }, a.label),
      h('span', { class: 'kk-apple-activity-card-val', style: `color:${a.color}` },
        h('span', { class: 'kk-sr', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' }, `${a.current} de ${a.target} ${a.unit}`),
        h('span', { 'aria-hidden': 'true' }, num, '/' + a.target, h('small', a.unit))));
    lis.push(li); return li;
  });
  const sr = h('span', { 'aria-live': 'polite', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' });
  const add = (i, n, msg) => () => { acts[i].current += n; drawTo(i, false); refreshSr(); sr.textContent = msg; };
  const refreshSr = () => lis.forEach((l, i) => { l.querySelector('.kk-sr').textContent = `${acts[i].current} de ${acts[i].target} ${acts[i].unit}`; });
  const reset = () => { DEFAULTS.forEach((d, i) => { acts[i].current = d.current; drawTo(i, false); }); refreshSr(); sr.textContent = 'Valores restaurados'; };
  const bar = h('div', { class: 'kk-apple-activity-card-bar' },
    h('button', { type: 'button', onclick: add(0, 5, 'Venda registrada: mais 5 mil') }, '+ Venda de R$ 5 mil'),
    h('button', { type: 'button', onclick: add(1, 5, 'Mais 5 leads') }, '+ 5 leads'),
    h('button', { type: 'button', onclick: add(2, 1, 'Mais uma reunião') }, '+ Reunião'),
    h('button', { type: 'button', onclick: reset }, 'Zerar'));
  const inner = h('div', { class: 'kk-apple-activity-card-in' },
    h('h3', { class: 'kk-apple-activity-card-title' }, 'Metas da semana'),
    h('div', { class: 'kk-apple-activity-card-main' },
      h('div', { class: 'kk-apple-activity-card-rings', style: `width:${boxSize}px;height:${boxSize}px` }, rings.map((r) => r.box)),
      h('ul', { class: 'kk-apple-activity-card-list' }, listItems)));
  const wrap = h('div', { class: 'kk-apple-activity-card-wrap' }, inner, bar, sr);
  stage.append(wrap);

  // Só desenha quando entra na tela, como o useInView do original.
  const start = () => { if (started) return; started = true; inner.classList.add('go'); acts.forEach((_, i) => drawTo(i, true)); };
  const io = new IntersectionObserver(([en]) => { if (en?.isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '-40px' });
  io.observe(wrap);

  return () => { stopLoop(); io.disconnect(); wrap.remove(); };
}
