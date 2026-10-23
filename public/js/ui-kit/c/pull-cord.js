// Pull Cord — porte em JS puro do componente "Pull Cord" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, reduced } from '../kit.js';

const WIDTH = 288, HEIGHT = 360;
const ANCHOR = { x: WIDTH / 2 + 36, y: 116 };   // de onde o cordão pende, sob a cúpula
const LINKS = 12, LINK = 8.5;                    // o cordão é uma corrente de pontos com elos de tamanho fixo
const STEP = 1 / 120;                            // passo fixo: estável em qualquer taxa de quadros
const GRAVITY = 1400, DAMPING = 0.992;
const MAX_SPEED = 4;                             // sem isso, soltar o cordão esticado o lançaria para dentro da cúpula
const BEND_MIN = LINK * 1.9, BEND_STIFFNESS = 0.8, ITERATIONS = 14; // rigidez leve: curva em vez de dobrar em quinas
const CLICK_PULL = 22, MAX_STRETCH = 34;
const REST_EPSILON = 0.015, REST_STEPS = 24;

const damp = (d, max) => max * (1 - Math.exp(-d / max));
const haptic = () => { try { navigator.vibrate?.(8); } catch { /* sem vibração */ } };

// Aproxima a e b de `length`; a restrição de curvatura só empurra para longe, e só em parte.
function relax(c, a, b, length, bend) {
  const { xs, ys, held } = c;
  const aFixed = a === 0 || a === held, bFixed = b === held;
  if (aFixed && bFixed) return;
  const dx = xs[b] - xs[a], dy = ys[b] - ys[a], dist = Math.hypot(dx, dy) || 0.0001;
  if (bend && dist >= length) return;
  const diff = ((dist - length) / dist) * (bend ? BEND_STIFFNESS : 1);
  const wa = aFixed ? 0 : bFixed ? 1 : 0.5;
  xs[a] += dx * diff * wa; ys[a] += dy * diff * wa;
  xs[b] -= dx * diff * (1 - wa); ys[b] -= dy * diff * (1 - wa);
}
function cordPath(xs, ys) {
  let d = `M${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 1; i < xs.length - 1; i++) d += ` Q${xs[i].toFixed(2)} ${ys[i].toFixed(2)} ${((xs[i] + xs[i + 1]) / 2).toFixed(2)} ${((ys[i] + ys[i + 1]) / 2).toFixed(2)}`;
  const n = xs.length - 1;
  return d + ` L${xs[n].toFixed(2)} ${ys[n].toFixed(2)}`;
}
const REST = { xs: new Float64Array(LINKS + 1).fill(ANCHOR.x), ys: Float64Array.from({ length: LINKS + 1 }, (_, i) => ANCHOR.y + i * LINK) };
const REST_PATH = cordPath(REST.xs, REST.ys);

export default function mount(stage, ctx) {
  ensureStyle('pull-cord', `
.kk-pull-cord{position:relative;width:min(${WIDTH}px,calc(100% - 24px));aspect-ratio:${WIDTH}/${HEIGHT};margin:12px 0;border-radius:24px;border:1px solid var(--ice-200,#c9e1f6);overflow:hidden;user-select:none;-webkit-user-select:none;background:#fff;color:var(--ink,#0e2236);transition:background-color .3s,border-color .3s,color .3s}
.kk-pull-cord.is-off{background:#0b1b2e;border-color:#16304d;color:#e6f1fb}
.kk-pull-cord-svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.kk-pull-cord-wire{stroke:var(--ice-300,#a5cdee);transition:stroke .3s}.is-off .kk-pull-cord-wire{stroke:#2a4a6b}
.kk-pull-cord-shade{fill:var(--ice-800,#164a7c);transition:fill .3s}.is-off .kk-pull-cord-shade{fill:#1b3552}
.kk-pull-cord-bulb{fill:var(--ice-200,#c9e1f6);transition:fill .3s,filter .3s;filter:drop-shadow(0 6px 10px rgba(74,149,210,.7))}.is-off .kk-pull-cord-bulb{fill:#2a4a6b;filter:none}
.kk-pull-cord-glow{fill:url(#kk-pull-cord-g);opacity:1;transition:opacity .3s}.is-off .kk-pull-cord-glow{opacity:0}
.kk-pull-cord-rope{stroke:var(--ice-500,#4a95d2);transition:stroke .3s}.is-off .kk-pull-cord-rope{stroke:#4a6f93}
.kk-pull-cord-pull{fill:var(--ice-800,#164a7c);transition:fill .3s}.is-off .kk-pull-cord-pull{fill:var(--ice-300,#a5cdee)}
.kk-pull-cord-focus{fill:none;stroke:var(--ice-500,#4a95d2);stroke-width:2}
.kk-pull-cord-grab{cursor:grab}.kk-pull-cord.is-grabbing .kk-pull-cord-grab,.kk-pull-cord.is-grabbing .kk-pull-cord-svg{cursor:grabbing}
.kk-pull-cord-txt{position:absolute;left:0;right:0;bottom:0;padding:20px 22px;pointer-events:none}
.kk-pull-cord-txt b{display:block;font-size:14px}.kk-pull-cord-txt span{font-size:13px;opacity:.65}
.kk-pull-cord-sw{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
`);
  const s = { xs: Float64Array.from(REST.xs), ys: Float64Array.from(REST.ys), pxs: Float64Array.from(REST.xs), pys: Float64Array.from(REST.ys),
    raf: 0, last: 0, carry: 0, still: 0, held: -1, tx: 0, ty: 0, armed: true };
  let checked = true;

  const cord = svg('path', { class: 'kk-pull-cord-rope', d: REST_PATH, fill: 'none', 'stroke-linecap': 'round', 'stroke-width': 1.5 });
  const hit = svg('path', { class: 'kk-pull-cord-grab', d: REST_PATH, fill: 'none', stroke: 'transparent', 'stroke-width': 26, 'pointer-events': 'stroke' });
  const focusRing = svg('rect', { class: 'kk-pull-cord-focus', x: -10, y: -4, width: 20, height: 30, rx: 9, style: 'display:none' });
  const bead = svg('g', { class: 'kk-pull-cord-grab', transform: `translate(${ANCHOR.x} ${ANCHOR.y + LINKS * LINK})` },
    svg('circle', { fill: 'transparent', r: 22 }), focusRing, svg('rect', { class: 'kk-pull-cord-pull', x: -5, y: 1, width: 10, height: 20, rx: 5 }));
  const cx = WIDTH / 2;
  const grad = svg('radialGradient', { id: 'kk-pull-cord-g', cx: '50%', cy: '0%', r: '100%' }, svg('stop', { offset: '0', 'stop-color': '#7fb4e0', 'stop-opacity': '.45' }), svg('stop', { offset: '1', 'stop-color': '#7fb4e0', 'stop-opacity': '0' }));
  const svgEl = svg('svg', { class: 'kk-pull-cord-svg', viewBox: `0 0 ${WIDTH} ${HEIGHT}`, 'aria-hidden': 'true' },
    svg('defs', {}, grad),
    svg('path', { class: 'kk-pull-cord-glow', d: `M${cx - 15} 120 L${cx - 120} ${HEIGHT} H${cx + 120} L${cx + 15} 120 Z` }),
    svg('line', { class: 'kk-pull-cord-wire', 'stroke-width': 1.5, x1: cx, x2: cx, y1: 0, y2: 62 }),
    svg('path', { class: 'kk-pull-cord-shade', d: `M${cx - 14} 62 h28 l38 50 q2 4 -3 4 h-98 q-5 0 -3 -4 Z` }),
    svg('path', { class: 'kk-pull-cord-bulb', d: `M${cx - 15} 116 a15 13 0 0 0 30 0 Z` }),
    cord, hit, bead);
  const title = h('b', 'Luz do escritório'), sub = h('span');
  const sw = h('button', { type: 'button', role: 'switch', class: 'kk-pull-cord-sw', 'aria-label': 'Luz do escritório' });
  const root = h('div', { class: 'kk-pull-cord' }, svgEl, h('div', { class: 'kk-pull-cord-txt' }, title, sub), sw);
  const paint = () => { root.classList.toggle('is-off', !checked); sub.textContent = `${checked ? 'Ligada' : 'Desligada'} · puxe o cordão`; sw.setAttribute('aria-checked', String(checked)); };
  const toggle = () => { checked = !checked; paint(); };
  paint();
  stage.append(root);

  const draw = () => {
    const d = cordPath(s.xs, s.ys); cord.setAttribute('d', d); hit.setAttribute('d', d);
    const n = LINKS, ang = Math.atan2(s.xs[n] - s.xs[n - 1], s.ys[n] - s.ys[n - 1]) * 180 / Math.PI;
    bead.setAttribute('transform', `translate(${s.xs[n].toFixed(2)} ${s.ys[n].toFixed(2)}) rotate(${(-ang).toFixed(2)})`);
  };
  // Verlet: cada elo livre mantém a velocidade do passo anterior mais a gravidade; o elo segurado vai à mão.
  const integrate = () => {
    let moved = 0;
    for (let i = 1; i <= LINKS; i++) {
      if (i === s.held) continue;
      let vx = (s.xs[i] - s.pxs[i]) * DAMPING, vy = (s.ys[i] - s.pys[i]) * DAMPING;
      const sp = Math.hypot(vx, vy);
      if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
      s.pxs[i] = s.xs[i]; s.pys[i] = s.ys[i];
      s.xs[i] += vx; s.ys[i] += vy + GRAVITY * STEP * STEP;
      moved = Math.max(moved, Math.abs(vx) + Math.abs(vy));
    }
    if (s.held > 0) {
      const i = s.held;
      moved = Math.max(moved, Math.abs(s.tx - s.xs[i]) + Math.abs(s.ty - s.ys[i]));
      s.pxs[i] = s.xs[i]; s.pys[i] = s.ys[i]; s.xs[i] = s.tx; s.ys[i] = s.ty;
    }
    return moved;
  };
  const constrain = () => {
    for (let k = 0; k < ITERATIONS; k++) {
      for (let i = 0; i < LINKS; i++) relax(s, i, i + 1, LINK, false);
      for (let i = 0; i + 2 <= LINKS; i++) relax(s, i, i + 2, BEND_MIN, true);
    }
  };
  const tick = (now) => {
    s.raf = 0;
    if (document.hidden) { s.last = 0; s.raf = requestAnimationFrame(tick); return; }
    s.carry += s.last ? Math.min((now - s.last) / 1000, 0.05) : STEP; s.last = now;
    let moved = 0;
    while (s.carry >= STEP) { moved = Math.max(moved, integrate()); constrain(); s.carry -= STEP; }
    draw();
    s.still = moved < REST_EPSILON ? s.still + 1 : 0;
    if (s.held > 0 || s.still < REST_STEPS) s.raf = requestAnimationFrame(tick); else s.last = 0;
  };
  const wake = () => { s.still = 0; if (!s.raf) s.raf = requestAnimationFrame(tick); };

  const local = (e) => {
    const r = svgEl.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * WIDTH, y: (e.clientY - r.top) / r.height * HEIGHT };
  };
  // A mão estica o cordão um pouco além do comprimento, com resistência crescente, mas nunca o arranca da âncora.
  const reach = (index, x, y) => {
    const dx = x - ANCHOR.x, dy = y - ANCHOR.y, dist = Math.hypot(dx, dy) || 0.0001, len = index * LINK;
    if (dist <= len) return { x, y, pull: 0 };
    const allowed = len + damp(dist - len, MAX_STRETCH);
    return { x: ANCHOR.x + dx / dist * allowed, y: ANCHOR.y + dy / dist * allowed, pull: dy > 0 ? (allowed - len) * (dy / dist) : 0 };
  };
  const down = (e) => {
    if (s.held > 0 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const p = local(e);
    let nearest = LINKS, best = Infinity;
    for (let i = 1; i <= LINKS; i++) { const d = Math.hypot(s.xs[i] - p.x, s.ys[i] - p.y); if (d < best) { best = d; nearest = i; } }
    svgEl.setPointerCapture(e.pointerId);
    s.held = nearest; s.tx = s.xs[nearest]; s.ty = s.ys[nearest]; s.armed = true;
    root.classList.add('is-grabbing'); wake();
  };
  const move = (e) => {
    if (s.held < 0) return;
    const t = reach(s.held, ...Object.values(local(e)));
    s.tx = t.x; s.ty = t.y;
    // O interruptor clica uma vez por puxada, assim que o cordão passa do ponto, e rearma quando ele volta.
    if (s.armed && t.pull > CLICK_PULL) { s.armed = false; haptic(); toggle(); }
    else if (!s.armed && t.pull < CLICK_PULL * 0.4) s.armed = true;
    wake();
  };
  const up = () => {
    if (s.held < 0) return;
    s.held = -1; root.classList.remove('is-grabbing');
    if (reduced()) { // sem balanço: o cordão cai direto ao repouso
      s.xs.set(REST.xs); s.ys.set(REST.ys); s.pxs.set(REST.xs); s.pys.set(REST.ys); draw(); return;
    }
    wake();
  };
  hit.addEventListener('pointerdown', down); bead.addEventListener('pointerdown', down);
  svgEl.addEventListener('pointermove', move); svgEl.addEventListener('pointerup', up);
  svgEl.addEventListener('pointercancel', up); svgEl.addEventListener('lostpointercapture', up);
  sw.addEventListener('click', () => {
    toggle();
    if (!reduced()) { s.pys[LINKS] = s.ys[LINKS] - 5; wake(); } // um puxãozinho: o cordão responde ao teclado também
  });
  sw.addEventListener('focus', () => { focusRing.style.display = sw.matches(':focus-visible') ? '' : 'none'; });
  sw.addEventListener('blur', () => { focusRing.style.display = 'none'; });
  return () => { cancelAnimationFrame(s.raf); s.raf = 0; root.remove(); };
}
