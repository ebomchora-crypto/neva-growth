// Background Paths — porte em JS puro do componente "Background Paths" .
import { h, ensureStyle, reduced, clamp, disposer, PALETTE } from '../kit.js';

const SAMPLES = 64;
const OVERSCAN = 0.06;         // as linhas passam das bordas, então as pontas nunca aparecem
const DRAW_MS = 1400, DRAW_STAGGER_MS = 40;
const PART_RADIUS = 150, PART_PUSH = 56;
// Três camadas de profundidade: a da frente é mais forte, mais rápida e abre mais com o cursor.
const LAYERS = [
  { width: 1, opacity: 0.16, phase: 0.6, pace: 0.7, part: 0.45 },
  { width: 1.25, opacity: 0.26, phase: 0.3, pace: 0.85, part: 0.75 },
  { width: 1.5, opacity: 0.4, phase: 0, pace: 1, part: 1 },
];
const EASE_OUT = (t) => 1 - (1 - t) ** 3;

/** Altura da linha `s` (-0.5..0.5 na fita) em `u` (0..1 ao longo dela); a fita vira onde `twist` cruza zero. */
function lineY(s, u, layer, frame, shape, band) {
  const t = frame.time * layer.pace, x = u * frame.width;
  const center = frame.height * 0.5 + shape.slope * (x - frame.width / 2) + band * 0.1 * Math.sin(Math.PI * 2 * (0.75 * u + 0.1) + layer.phase + t * 0.35);
  const turn = 0.22 + 0.09 * Math.sin(t * 0.21 + layer.phase);
  const breathe = 0.3 * Math.sin(t * 0.5 + s * 4 + layer.phase);
  const twist = Math.cos(Math.PI * (u - turn) + s * (0.6 + breathe) + layer.phase);
  return center + s * shape.spread * band * twist;
}
/** Afasta o ponto do cursor na vertical, com queda suave. */
function part(x, y, frame, strength) {
  const { pointer } = frame;
  if (pointer.amount < 0.001) return y;
  const dx = x - pointer.x, dy = y - pointer.y;
  const falloff = Math.exp(-(dx * dx + dy * dy) / (PART_RADIUS * PART_RADIUS));
  return y + (dy / (Math.abs(dy) + 24)) * falloff * PART_PUSH * strength * pointer.amount; // sinal suave: linhas sob o cursor se abrem sem estalo
}
function drawLines(ctx, frame, shape, color) {
  const { width, height } = frame;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const band = Math.min(height, width * 1.1); // em telas altas e estreitas a fita inclinaria demais
  const perLayer = Math.max(1, Math.round(shape.count / LAYERS.length));
  const xs = new Float32Array(SAMPLES + 1), ys = new Float32Array(SAMPLES + 1);
  LAYERS.forEach((layer, li) => {
    ctx.lineWidth = layer.width;
    for (let i = 0; i < perLayer; i++) {
      const drawn = frame.drawn[li * perLayer + i] ?? 1;
      if (drawn <= 0) continue;
      const s = perLayer === 1 ? 0 : i / (perLayer - 1) - 0.5, last = Math.max(1, Math.ceil(SAMPLES * drawn));
      for (let k = 0; k <= last; k++) {
        const u = -OVERSCAN + (k / SAMPLES) * (1 + OVERSCAN * 2), x = u * width, y = lineY(s, u, layer, frame, shape, band);
        xs[k] = x; ys[k] = shape.interactive ? part(x, y, frame, layer.part) : y;
      }
      ctx.globalAlpha = layer.opacity * (0.45 + 0.55 * (1 - Math.abs(s) * 2)); // bordas da fita esmaecem, o meio leva o peso
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
      for (let k = 1; k < last; k++) ctx.quadraticCurveTo(xs[k], ys[k], (xs[k] + xs[k + 1]) / 2, (ys[k] + ys[k + 1]) / 2); // curvas pelos pontos médios ficam lisas em qualquer amostragem
      ctx.lineTo(xs[last], ys[last]); ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}

const CSS = `
.kk-background-paths-root{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:pan-y;background:#fff;color:${PALETTE.ice700}}
.kk-background-paths-mask{position:absolute;inset:0;pointer-events:none;
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 15%,#000 85%,transparent);mask-image:linear-gradient(to bottom,transparent,#000 15%,#000 85%,transparent)}
.kk-background-paths-canvas{display:block;width:100%;height:100%;opacity:0;transition:opacity .5s ease-out}
.kk-background-paths-text{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 20px;text-align:center;max-width:30em;pointer-events:none}
.kk-background-paths-text h3{margin:0;font-size:clamp(22px,8cqw,48px);line-height:1.05;letter-spacing:-.03em;font-weight:700;color:var(--ink,${PALETTE.ink});text-wrap:balance}
.kk-background-paths-text p{margin:0;max-width:22em;font-size:clamp(12px,3.3cqw,16px);line-height:1.45;color:var(--mut,${PALETTE.mut})}
.kk-background-paths-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.kk-background-paths-chip{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:rgba(255,255,255,.88);color:${PALETTE.ice800};font-family:inherit;font-weight:600;font-size:12px;line-height:1;cursor:pointer;backdrop-filter:blur(4px)}
.kk-background-paths-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-background-paths-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('background-paths', CSS);
  const off = disposer();
  const reduceMotion = reduced();

  const canvas = h('canvas', { class: 'kk-background-paths-canvas' });
  const mask = h('div', { class: 'kk-background-paths-mask', 'aria-hidden': 'true' }, canvas);
  const ctx = canvas.getContext('2d');
  // Densidade e movimento são ajustáveis nos botões; os valores iniciais são os do original.
  const shape = { count: 42, spread: 1, slope: Math.tan((-8 * Math.PI) / 180), interactive: !reduceMotion };
  const cfg = { speed: 1 };
  const perLayerOf = () => Math.max(1, Math.round(shape.count / LAYERS.length));
  const frame = { width: 0, height: 0, time: 40, drawn: new Array(perLayerOf() * LAYERS.length).fill(reduceMotion ? 1 : 0), pointer: { x: 0, y: 0, amount: 0, on: false } };
  let color = ctx ? getComputedStyle(canvas).color : '#000', start = 0, last = 0, raf = 0, visible = true;

  const root = h('div', { class: 'kk-background-paths-root' }, mask,
    h('div', { class: 'kk-background-paths-text' },
      h('h3', {}, 'Fluxo constante de clientes'),
      h('p', {}, 'Uma fita de linhas que não para de fluir. Passe o cursor e as linhas se abrem ao seu redor.')));
  const bar = h('div', { class: 'kk-background-paths-bar' });
  const chip = (label, pressed, fn) => {
    const b = h('button', { type: 'button', class: 'kk-background-paths-chip', 'aria-pressed': String(pressed), onclick: () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); fn(on); } }, label);
    return b;
  };
  const paint = () => ctx && drawLines(ctx, frame, shape, color);
  const play = () => { if (!raf && visible && !reduceMotion) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  bar.append(
    chip('Mais linhas', false, (on) => { shape.count = on ? 72 : 42; frame.drawn = new Array(perLayerOf() * LAYERS.length).fill(1); paint(); }),
    chip('Pausar', false, (on) => { cfg.speed = on ? 0 : 1; play(); }),
    chip('Inclinar', false, (on) => { shape.slope = Math.tan(((on ? 10 : -8) * Math.PI) / 180); paint(); }));
  if (reduceMotion) bar.querySelector('button:nth-child(2)').disabled = true;
  root.append(bar);
  stage.append(root);
  if (!ctx) return () => root.remove();

  const resize = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    frame.width = r.width; frame.height = r.height;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint();
  };
  function tick(now) {
    raf = 0;
    if (!start) { start = now; last = now; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    frame.time += dt * cfg.speed;
    const elapsed = now - start, perLayer = perLayerOf();
    // A entrada desenha cada linha uma vez, da esquerda para a direita, escalonada.
    for (let i = 0; i < frame.drawn.length; i++) if (frame.drawn[i] < 1) frame.drawn[i] = EASE_OUT(clamp((elapsed - (i % perLayer) * DRAW_STAGGER_MS) / DRAW_MS, 0, 1));
    const p = frame.pointer; p.amount += ((p.on ? 1 : 0) - p.amount) * 0.08;
    paint();
    const settling = frame.drawn.some((d) => d < 1) || p.amount > 0.001 || p.on;
    if (visible && (cfg.speed > 0 || settling)) raf = requestAnimationFrame(tick);
  }

  resize(); canvas.style.opacity = '1';
  const ro = new ResizeObserver(resize); ro.observe(canvas); off(() => ro.disconnect());
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) play(); });
  io.observe(root); off(() => io.disconnect());
  const onVis = () => { visible = !document.hidden; if (visible) play(); };
  document.addEventListener('visibilitychange', onVis); off(() => document.removeEventListener('visibilitychange', onVis));
  // O tema só muda a cor herdada do texto; confere de vez em quando.
  const timer = setInterval(() => { const c = getComputedStyle(canvas).color; if (c !== color) { color = c; paint(); } }, 500); off(() => clearInterval(timer));

  const onMove = (e) => {
    if (!shape.interactive) return;
    const r = canvas.getBoundingClientRect(); frame.pointer.x = e.clientX - r.left; frame.pointer.y = e.clientY - r.top; frame.pointer.on = true; play();
  };
  const onLeave = () => { frame.pointer.on = false; play(); };
  const onTouchEnd = (e) => { if (e.pointerType !== 'mouse') onLeave(); };
  root.addEventListener('pointermove', onMove); root.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointerup', onTouchEnd); root.addEventListener('pointercancel', onLeave); // no toque não há hover: solta ao levantar o dedo
  play();

  return () => {
    cancelAnimationFrame(raf); off.run();
    root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointerup', onTouchEnd); root.removeEventListener('pointercancel', onLeave); root.remove();
  };
}
