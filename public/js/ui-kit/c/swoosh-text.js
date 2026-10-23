// Extruded Text — porte em JS puro do componente "Extruded Text" (swoosh-text) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, disposer } from '../kit.js';

// Mola da direção da luz: subamortecida de propósito, um movimento rápido passa do alvo antes de assentar.
const LIGHT_STIFFNESS = 170, LIGHT_DAMPING = 13, LIGHT_KICK = 9, LIGHT_MAX_SPEED = 30, LIGHT_MAX_LENGTH = 1.35;
// Mola de cada tecla: quase crítica, as letras afundam sem balançar.
const KEY_STIFFNESS = 420, KEY_DAMPING = 34, MAX_SINK = 0.72, PRESS_RADIUS = 0.75;
const REST = Math.SQRT1_2;       // repouso: luz no canto superior esquerdo, extrusão a 45° para baixo e à direita
const EPSILON = 0.0008;
const DEPTH = 12;

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = (s) => seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);
const round = (v) => Math.round(v * 10000) / 10000;
const clampAbs = (v, m) => Math.max(-m, Math.min(m, v));

function lightTarget(sim, rect) {
  if (sim.px === null) return [REST, REST];
  // A extrusão aponta para longe da luz (o ponteiro). Perto do centro a luz é zenital: encurta em vez de inverter.
  const dx = rect.left + rect.width / 2 - sim.px, dy = rect.top + rect.height / 2 - sim.py;
  const reach = Math.max(Math.hypot(dx, dy), sim.fontSize * 0.9);
  return [dx / reach, dy / reach];
}
function stepLight(sim, dt) {
  sim.vx += ((sim.tx - sim.lx) * LIGHT_STIFFNESS - sim.vx * LIGHT_DAMPING) * dt;
  sim.vy += ((sim.ty - sim.ly) * LIGHT_STIFFNESS - sim.vy * LIGHT_DAMPING) * dt;
  sim.lx += sim.vx * dt; sim.ly += sim.vy * dt;
  const len = Math.hypot(sim.lx, sim.ly);
  if (len > LIGHT_MAX_LENGTH) { sim.lx = sim.lx / len * LIGHT_MAX_LENGTH; sim.ly = sim.ly / len * LIGHT_MAX_LENGTH; } // um golpe brusco não estica demais
  const moving = Math.abs(sim.tx - sim.lx) > EPSILON || Math.abs(sim.ty - sim.ly) > EPSILON || Math.hypot(sim.vx, sim.vy) > EPSILON;
  if (!moving) { sim.lx = sim.tx; sim.ly = sim.ty; sim.vx = 0; sim.vy = 0; }
  return moving;
}
function keyTarget(sim, i, dx, dy) {
  if (i === sim.pressed) return 1;
  if (sim.px === null) return 0;
  const d = Math.hypot(dx, dy) / (sim.fontSize * PRESS_RADIUS);
  return d > 2.5 ? 0 : Math.exp(-d * d);
}
function stepKeys(sim, dt, rect) {
  let moving = false;
  const x = (sim.px ?? 0) - rect.left, y = (sim.py ?? 0) - rect.top;
  sim.keys.forEach((k, i) => {
    const target = keyTarget(sim, i, x - k.x, y - k.y) * MAX_SINK;
    k.v += ((target - k.p) * KEY_STIFFNESS - k.v * KEY_DAMPING) * dt; k.p += k.v * dt;
    if (Math.abs(target - k.p) < EPSILON && Math.abs(k.v) < EPSILON) { k.p = target; k.v = 0; } else moving = true;
  });
  return moving;
}
// A camada `index` fica `index` passos fundo; ao afundar (p→1) a coluna comprime rumo à mais funda, que nunca se move.
const layerTransform = (index, depth, step, light, p) => {
  const off = (index + (depth - index) * p) * step;
  return `translate3d(${round(light[0] * off)}em,${round(light[1] * off)}em,0)`;
};
// Escreve a transformação direto em cada camada; mudar uma variável CSS na raiz reestilizaria todos os filhos a cada quadro.
function drawKeys(sim) {
  const light = [round(sim.lx), round(sim.ly)];
  for (const k of sim.keys) {
    const p = round(Math.max(0, k.p)), sig = `${light[0]},${light[1]},${p}`;
    if (sig === k.drawn) continue;
    k.drawn = sig;
    const n = k.layers.length;
    for (let j = 0; j < n; j++) k.layers[j].style.transform = layerTransform(n - 1 - j, sim.depth, sim.step, light, p);
  }
}
const layerColor = (i, depth) => `color-mix(in oklab,var(--ex-far) ${Math.round((i - 1) / Math.max(1, depth - 1) * 100)}%,var(--ex-near))`;

function letter(char, depth, step) {
  const rest = [REST, REST];
  const layers = Array.from({ length: depth }, (_, i) => depth - i).map((i) => {
    const s = h('span', { class: 'kk-swoosh-text-l' }, char);
    s.style.color = layerColor(i, depth); s.style.transform = layerTransform(i, depth, step, rest, 0); return s;
  });
  const face = h('span', { class: 'kk-swoosh-text-face' }, char);
  face.style.transform = layerTransform(0, depth, step, rest, 0);
  return h('span', { class: 'kk-swoosh-text-key', 'data-key': '' }, ...layers, face);
}

export default function mount(stage, ctx) {
  ensureStyle('swoosh-text', `
.kk-swoosh-text{width:100%;display:flex;flex-direction:column;align-items:center;gap:22px;padding:8px 4px;container-type:inline-size;color:var(--ink)}
.kk-swoosh-text-word{position:relative;max-width:100%;text-align:center;font-size:clamp(34px,15cqw,64px);font-weight:800;letter-spacing:-.02em;line-height:1.2;user-select:none;-webkit-user-select:none;touch-action:manipulation;padding:0 .2em .2em 0;--ex-face:#fff;--ex-far:var(--ice-900);--ex-near:var(--ice-500)}
.kk-swoosh-text-w{display:inline-block;white-space:nowrap}
.kk-swoosh-text-key{position:relative;display:inline-block}
.kk-swoosh-text-l{position:absolute;inset:0}
.kk-swoosh-text-face{position:relative;display:inline-block;color:var(--ex-face)}
.kk-swoosh-text-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-swoosh-text-ctl{display:flex;flex-direction:column;gap:10px;width:100%;max-width:300px}
.kk-swoosh-text-ctl label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--mut)}
.kk-swoosh-text-ctl input[type=text]{min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font:inherit;font-size:16px}
.kk-swoosh-text-ctl input[type=range]{width:100%;min-height:36px;accent-color:var(--ice-600)}
.kk-swoosh-text-ctl input:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
`);
  const dispose = disposer();
  const rm = reduced();
  let text = 'Crescer', length = 0.16, teardown = null;

  const word = h('span', { class: 'kk-swoosh-text-word' });
  const input = h('input', { type: 'text', value: text, maxlength: '14', autocomplete: 'off', 'aria-label': 'Texto da demonstração', oninput: () => { text = input.value.trim() ? input.value : ' '; build(); } });
  const range = h('input', { type: 'range', min: '0.08', max: '0.35', step: '0.01', value: String(length), 'aria-label': 'Profundidade da extrusão', oninput: () => { length = +range.value; build(); } });
  const root = h('div', { class: 'kk-swoosh-text' }, word,
    h('div', { class: 'kk-swoosh-text-ctl' }, h('label', 'Texto', input), h('label', 'Profundidade', range),
      h('span', { class: 'kk-swoosh-text-sr' }, 'Passe o ponteiro sobre as letras: a luz acompanha e as teclas afundam.')));
  stage.append(root);

  function build() {
    teardown?.();
    const step = length / DEPTH;
    word.replaceChildren(h('span', { class: 'kk-swoosh-text-sr' }, text),
      h('span', { 'aria-hidden': 'true' }, text.split(/\s+/).filter(Boolean).map((w, i) =>
        h('span', i > 0 && ' ', h('span', { class: 'kk-swoosh-text-w' }, graphemes(w).map((c) => letter(c, DEPTH, step)))))));
    if (!rm) teardown = simulate(word, DEPTH, step); // movimento reduzido mantém a extrusão fixa em 45°
  }
  build();
  return () => { teardown?.(); dispose.run(); root.remove(); };
}

function simulate(root, depth, step) {
  const sim = { lx: REST, ly: REST, vx: 0, vy: 0, tx: REST, ty: REST, px: null, py: null, pressed: -1, fontSize: 16, depth, step, keys: [] };
  let frame = 0, last = 0, visible = true, onScreen = true;
  const tick = (now) => {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    const rect = root.getBoundingClientRect();
    [sim.tx, sim.ty] = lightTarget(sim, rect);
    const a = stepLight(sim, dt), b = stepKeys(sim, dt, rect);
    drawKeys(sim);
    if ((a || b) && visible) frame = requestAnimationFrame(tick); else last = 0; // dorme quando assenta ou fora da tela
  };
  const wake = () => { if (!frame && visible) frame = requestAnimationFrame(tick); };
  const onMove = (e) => {
    if (!visible) return;
    const rect = root.getBoundingClientRect();
    const [ax, ay] = lightTarget(sim, rect);
    sim.px = e.clientX; sim.py = e.clientY;
    const [bx, by] = lightTarget(sim, rect);
    sim.vx = clampAbs(sim.vx + (bx - ax) * LIGHT_KICK, LIGHT_MAX_SPEED); // a velocidade do ponteiro entra na mola
    sim.vy = clampAbs(sim.vy + (by - ay) * LIGHT_KICK, LIGHT_MAX_SPEED);
    wake();
  };
  const onLeave = () => { sim.px = sim.py = null; sim.pressed = -1; wake(); };
  const onDown = (e) => {
    const rect = root.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    let best = -1, bd = sim.fontSize * 0.8;
    sim.keys.forEach((k, i) => { const d = Math.hypot(k.x - x, k.y - y); if (d < bd) { best = i; bd = d; } });
    sim.pressed = best; sim.px = e.clientX; sim.py = e.clientY; wake();
  };
  const onUp = (e) => { sim.pressed = -1; if (e.pointerType !== 'mouse') { sim.px = sim.py = null; } wake(); }; // toque não tem hover: a luz volta ao levantar o dedo
  const onVis = () => { visible = onScreen && !document.hidden; wake(); };
  const measure = () => {
    const rect = root.getBoundingClientRect();
    sim.fontSize = parseFloat(getComputedStyle(root).fontSize) || 16;
    sim.keys = Array.from(root.querySelectorAll('[data-key]'), (el, i) => {
      const r = el.getBoundingClientRect(), prev = sim.keys[i];
      return { layers: Array.from(el.children), drawn: '', x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2, p: prev?.p ?? 0, v: prev?.v ?? 0 };
    });
  };
  measure();
  const ro = new ResizeObserver(measure); ro.observe(root);
  document.fonts?.ready.then(measure).catch(() => {});
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; visible = onScreen && !document.hidden; wake(); });
  io.observe(root);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  document.addEventListener('visibilitychange', onVis);
  return () => {
    cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
    window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    document.removeEventListener('visibilitychange', onVis);
  };
}
