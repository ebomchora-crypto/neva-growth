// Liquid Slider — porte em JS puro do componente "Liquid Slider" .
import { h, svg, ensureStyle, loop, disposer, clamp, reduced } from '../kit.js';

const W = 280, H = 360;
// O copo é um cilindro visto de cima: borda e fundo são elipses de altura RY.
const LEFT = 84, RIGHT = 196, CX = (LEFT + RIGHT) / 2, RADIUS = (RIGHT - LEFT) / 2, RY = 9;
const RIM_Y = 104, FLOOR_Y = 312, EMPTY_Y = FLOOR_Y, FULL_Y = RIM_Y + 16;
// A superfície é uma fileira de colunas que balançam e puxam as vizinhas (onda 1D).
const COLS = 34, STEP = 1 / 120, SPREAD = 2600, TENSION = 30, DAMPING = 2.4;
const VISCOSITY = 22;  // arrasto entre vizinhas: alisa ondas curtas e deixa as longas
const MAX_WAVE = 16, GRAB = 900, GRAB_REACH = 2.6, GRAB_MAX = 14, STIR = 0.55;
const LEVEL_K = 220, LEVEL_C = 26, MAX_BUBBLES = 14, REST = 0.02;

const f = (n) => n.toFixed(2);
const COL_X = [], DEPTH = [];
for (let i = 0; i < COLS; i++) {
  const x = LEFT + i / (COLS - 1) * (RIGHT - LEFT); COL_X.push(Math.round(x * 100) / 100);
  const u = (x - CX) / RADIUS; DEPTH.push(Math.round(RY * Math.sqrt(Math.max(0, 1 - u * u)) * 100) / 100);
}
const levelToY = (l) => EMPTY_Y - l * (EMPTY_Y - FULL_Y);
const frontY = (ly, hs, i) => Math.min(ly + hs[i] + DEPTH[i], FLOOR_Y + DEPTH[i]);
function surfacePath(ly, hs) {
  let d = '';
  for (let i = 0; i < COLS; i++) d += `${i ? 'L' : 'M'}${f(COL_X[i])} ${f(Math.min(ly + hs[i] - DEPTH[i], FLOOR_Y))}`;
  for (let i = COLS - 1; i >= 0; i--) d += `L${f(COL_X[i])} ${f(frontY(ly, hs, i))}`;
  return d + 'Z';
}
function bodyPath(ly, hs) {
  let d = '';
  for (let i = 0; i < COLS; i++) d += `${i ? 'L' : 'M'}${f(COL_X[i])} ${f(frontY(ly, hs, i))}`;
  return d + `L${RIGHT} ${FLOOR_Y} A${RADIUS} ${RY} 0 0 1 ${LEFT} ${FLOOR_Y}Z`;
}
function lipPath(ly, hs) { let d = ''; for (let i = 1; i < COLS - 1; i++) d += `${i === 1 ? 'M' : 'L'}${f(COL_X[i])} ${f(frontY(ly, hs, i))}`; return d; }
function heightAt(hs, x) { const t = clamp((x - LEFT) / (RIGHT - LEFT), 0, 1) * (COLS - 1), i = Math.floor(t), j = Math.min(i + 1, COLS - 1); return hs[i] + (hs[j] - hs[i]) * (t - i); }

export default function mount(stage, ctx) {
  ensureStyle('liquid-slider', `
.kk-liquid-slider-root{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 12px;min-height:240px}
.kk-liquid-slider-card{position:relative;width:100%;max-width:${W}px;aspect-ratio:${W}/${H};overflow:hidden;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);user-select:none;-webkit-user-select:none;outline:none}
.kk-liquid-slider-card:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-liquid-slider-head{position:absolute;left:0;right:0;top:0;padding:20px 22px;pointer-events:none}
.kk-liquid-slider-lab{margin:0;font-size:13px;color:var(--mut,#4a6f93)}
.kk-liquid-slider-val{margin:2px 0 0;font-size:24px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.kk-liquid-slider-val small{margin-left:4px;font-size:15px;font-weight:500;color:var(--ice-400,#7fb4e0)}
.kk-liquid-slider-svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
.kk-liquid-slider-svg.grab{cursor:grabbing}
.kk-liquid-slider-svg text{font-size:10px;fill:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-liquid-slider-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.kk-liquid-slider-btn{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:inherit;font-size:13px;cursor:pointer}
.kk-liquid-slider-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
`);
  const d = disposer(); const rm = reduced();
  // Demo: faturamento do mês em R$ mil, de 0 a 100, de 5 em 5.
  const min = 0, max = 100, inc = 5, label = 'Faturamento do mês';
  const fmt = (v) => v.toLocaleString('pt-BR');
  let value = 65;
  const gid = 'kk-liquid-slider-g' + Math.random().toString(36).slice(2, 7);

  const fraction = () => (value - min) / (max - min);
  const s = { hs: new Float64Array(COLS), vs: new Float64Array(COLS), as: new Float64Array(COLS), level: fraction(), lv: 0, target: fraction(), bubbles: [], carry: 0, held: false, px: 0, py: 0, pvx: 0, lastPx: 0, lastT: 0, seed: 1 };
  const rnd = () => { s.seed = (s.seed * 16807) % 2147483647; return s.seed / 2147483647; };  // determinístico: bolhas sempre iguais

  // ---- SVG
  const NS = (t, a, ...k) => svg(t, a, ...k);
  const flat = new Float64Array(COLS), y0 = levelToY(fraction());
  const body = NS('path', { d: bodyPath(y0, flat), fill: '#4a95d2' });
  const surf = NS('path', { d: surfacePath(y0, flat), fill: '#a5cdee' });
  const lip = NS('path', { d: lipPath(y0, flat), fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-linecap': 'round', 'stroke-width': 1 });
  const bubbleEls = Array.from({ length: MAX_BUBBLES }, () => NS('circle', { cx: CX, cy: FLOOR_Y, r: 1, fill: 'rgba(255,255,255,.25)', stroke: 'rgba(255,255,255,.7)', 'stroke-width': .75, style: 'opacity:0' }));
  const glass = `M${LEFT} ${RIM_Y} A${RADIUS} ${RY} 0 0 1 ${RIGHT} ${RIM_Y} L${RIGHT} ${FLOOR_Y} A${RADIUS} ${RY} 0 0 1 ${LEFT} ${FLOOR_Y} Z`;
  const ticks = [0, .25, .5, .75, 1].map((t) => {
    const y = Math.round(levelToY(t) + RY * .55);
    return NS('g', {}, NS('line', { x1: RIGHT - 14, x2: RIGHT - 4, y1: y, y2: y, stroke: 'rgba(14,34,54,.25)' }),
      NS('text', { x: RIGHT + 8, y, 'dominant-baseline': 'middle' }, fmt(min + t * (max - min))));
  });
  const svgEl = NS('svg', { class: 'kk-liquid-slider-svg', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' },
    NS('defs', {}, NS('clipPath', { id: gid }, NS('path', { d: `M${LEFT} ${RIM_Y} L${RIGHT} ${RIM_Y} L${RIGHT} ${FLOOR_Y} A${RADIUS} ${RY} 0 0 1 ${LEFT} ${FLOOR_Y} Z` }))),
    NS('path', { d: glass, fill: '#f2f8fe' }),
    NS('path', { d: `M${LEFT} ${FLOOR_Y} A${RADIUS} ${RY} 0 0 1 ${RIGHT} ${FLOOR_Y}`, fill: 'none', stroke: '#d3e6f6' }),
    NS('g', { 'clip-path': `url(#${gid})` }, body, bubbleEls, surf, lip),
    ticks,
    NS('ellipse', { cx: CX, cy: RIM_Y, rx: RADIUS, ry: RY, fill: 'none', stroke: '#a5cdee', 'stroke-width': 1.5 }),
    NS('path', { d: `M${LEFT} ${RIM_Y} L${LEFT} ${FLOOR_Y} A${RADIUS} ${RY} 0 0 0 ${RIGHT} ${FLOOR_Y} L${RIGHT} ${RIM_Y}`, fill: 'none', stroke: '#a5cdee', 'stroke-width': 1.5 }),
    NS('line', { x1: LEFT + 9, x2: LEFT + 9, y1: RIM_Y + 22, y2: FLOOR_Y - 14, stroke: 'rgba(255,255,255,.6)', 'stroke-linecap': 'round', 'stroke-width': 3 }));

  const labId = gid + '-l';
  const valNum = h('span'), valUnit = h('small', 'mil');
  const card = h('div', { class: 'kk-liquid-slider-card', role: 'slider', tabindex: '0', 'aria-labelledby': labId, 'aria-orientation': 'vertical', 'aria-valuemin': min, 'aria-valuemax': max },
    h('div', { class: 'kk-liquid-slider-head' }, h('p', { class: 'kk-liquid-slider-lab', id: labId }, label), h('p', { class: 'kk-liquid-slider-val' }, h('span', 'R$ '), valNum, valUnit)), svgEl);
  const preset = (txt, v) => h('button', { type: 'button', class: 'kk-liquid-slider-btn', onclick: () => { commit(v); s.target = fraction(); splash(v > 0 ? -90 : 90); wake(); } }, txt);
  const root = h('div', { class: 'kk-liquid-slider-root' }, card, h('div', { class: 'kk-liquid-slider-btns' }, preset('Zerar', 0), preset('Metade', 50), preset('Meta batida', 100)));
  stage.append(root); d(() => root.remove());
  function paintValue() { valNum.textContent = fmt(value); card.setAttribute('aria-valuenow', value); card.setAttribute('aria-valuetext', `R$ ${fmt(value)} mil`); }
  paintValue();

  function commit(next) {
    const sn = clamp(Number((Math.round((next - min) / inc) * inc + min).toFixed(10)), min, max);
    if (sn === value) return;
    const q = (max - min) / 4;
    if (Math.floor((sn - min) / q) !== Math.floor((value - min) / q)) navigator.vibrate?.(4);  // toque leve a cada quarto
    value = sn; paintValue();
  }
  function splash(v) { if (!rm) s.vs[Math.floor(COLS / 2)] += v; }

  // ---- simulação
  function stepLevel() {
    s.lv += ((s.target - s.level) * LEVEL_K - s.lv * LEVEL_C) * STEP; s.level += s.lv * STEP;
    // Quando o nível sobe rápido, o "despejo" arrasta bolhas do fundo.
    if (s.lv > 0.5 && s.bubbles.length < MAX_BUBBLES && rnd() < s.lv * 0.05)
      s.bubbles.push({ x: LEFT + 10 + rnd() * (RIGHT - LEFT - 20), y: FLOOR_Y + 2, r: 1.2 + rnd() * 2, speed: 40 + rnd() * 50, phase: rnd() * Math.PI * 2 });
  }
  function stepWaves() {
    const { hs, vs, as } = s, ly = levelToY(s.level); let mean = 0;
    for (let i = 0; i < COLS; i++) {
      const l = i === 0 ? 0 : i - 1, r = i === COLS - 1 ? i : i + 1;
      let a = SPREAD * (hs[l] + hs[r] - 2 * hs[i]) + VISCOSITY * (vs[l] + vs[r] - 2 * vs[i]) - TENSION * hs[i] - DAMPING * vs[i];
      if (s.held) {
        const reach = (COL_X[i] - s.px) / ((RIGHT - LEFT) / COLS), wt = Math.exp(-(reach * reach) / (GRAB_REACH * GRAB_REACH));
        a += GRAB * clamp(s.py - (ly + hs[i]), -GRAB_MAX, GRAB_MAX) * wt * 0.05;
        a -= STIR * s.pvx * ((i - (COLS - 1) / 2) / COLS) * 60;  // a velocidade lateral empilha o líquido à frente do dedo
      }
      as[i] = a;
    }
    for (let i = 0; i < COLS; i++) { vs[i] += as[i] * STEP; hs[i] = clamp(hs[i] + vs[i] * STEP, -MAX_WAVE, MAX_WAVE); mean += hs[i]; }
    mean /= COLS; let energy = 0;
    for (let i = 0; i < COLS; i++) { hs[i] -= mean; energy += Math.abs(hs[i]) + Math.abs(vs[i]) * STEP; }  // volume conservado: onda só move líquido
    return energy / COLS;
  }
  function stepBubbles() {
    const ly = levelToY(s.level);
    for (let i = s.bubbles.length - 1; i >= 0; i--) {
      const b = s.bubbles[i]; b.y -= b.speed * STEP; b.phase += STEP * 9;
      if (b.y <= ly + heightAt(s.hs, b.x) + 1) {  // estoura na superfície e deixa uma ondulação
        s.vs[clamp(Math.round((b.x - LEFT) / (RIGHT - LEFT) * (COLS - 1)), 0, COLS - 1)] -= 30 * b.r; s.bubbles.splice(i, 1);
      }
    }
  }
  function draw() {
    const y = levelToY(s.level);
    body.setAttribute('d', bodyPath(y, s.hs)); surf.setAttribute('d', surfacePath(y, s.hs)); lip.setAttribute('d', lipPath(y, s.hs));
    bubbleEls.forEach((el, i) => {
      const b = s.bubbles[i];
      if (b) { el.setAttribute('cx', f(b.x + Math.sin(b.phase) * 1.6)); el.setAttribute('cy', f(b.y)); el.setAttribute('r', f(b.r)); el.style.opacity = '1'; } else el.style.opacity = '0';
    });
  }
  let stop = null;
  function wake() {
    if (rm) { s.level = s.target; s.lv = 0; s.hs.fill(0); s.vs.fill(0); s.bubbles.length = 0; draw(); return; }
    if (stop) return;
    stop = loop((dt) => {
      s.carry += dt; let energy = 0;
      while (s.carry >= STEP) { stepLevel(); energy = stepWaves(); stepBubbles(); s.carry -= STEP; }
      s.pvx *= 0.85; draw();
      if (!s.held && energy < REST && Math.abs(s.target - s.level) < .0005 && Math.abs(s.lv) < .001 && !s.bubbles.length) {
        s.level = s.target; s.hs.fill(0); s.vs.fill(0); draw(); stop?.(); stop = null;  // em repouso não gasta quadros
      }
    });
  }
  d(() => stop?.());
  draw();

  // ---- ponteiro e teclado
  const local = (e) => { const r = svgEl.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  function follow(e) {
    const p = local(e);
    if (s.lastT && e.timeStamp > s.lastT) s.pvx = s.pvx * .6 + clamp((p.x - s.lastPx) / (e.timeStamp - s.lastT) * 1000, -900, 900) * .4;
    s.lastPx = p.x; s.lastT = e.timeStamp; s.px = clamp(p.x, LEFT, RIGHT); s.py = clamp(p.y, FULL_Y, EMPTY_Y);
    const raw = clamp((EMPTY_Y - p.y) / (EMPTY_Y - FULL_Y), 0, 1); s.target = raw; commit(min + raw * (max - min)); wake();
  }
  svgEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); card.focus({ preventScroll: true }); svgEl.setPointerCapture(e.pointerId);
    s.held = true; s.lastT = 0; s.pvx = 0; svgEl.classList.add('grab'); follow(e);
  });
  svgEl.addEventListener('pointermove', (e) => { if (s.held) follow(e); });
  const up = () => { if (!s.held) return; s.held = false; svgEl.classList.remove('grab'); s.target = fraction(); wake(); };  // assenta no degrau mostrado
  svgEl.addEventListener('pointerup', up); svgEl.addEventListener('pointercancel', up); svgEl.addEventListener('lostpointercapture', up);
  card.addEventListener('keydown', (e) => {
    const big = Math.max(inc, (max - min) / 10);
    const m = { ArrowUp: value + inc, ArrowRight: value + inc, ArrowDown: value - inc, ArrowLeft: value - inc, PageUp: value + big, PageDown: value - big, Home: min, End: max };
    if (!Object.hasOwn(m, e.key)) return;
    e.preventDefault(); const before = value; commit(m[e.key]); s.target = fraction(); splash(m[e.key] > before ? -90 : 90); wake();  // gota no meio: a tecla também faz ondular
  });
  return () => d.run();
}
