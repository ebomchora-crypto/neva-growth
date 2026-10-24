// Flow Field — porte em JS puro do componente "Flow Field" .
import { h, ensureStyle, reduced, clamp, disposer, PALETTE } from '../kit.js';

const BASE_COUNT = 700;                 // partículas com densidade 1 (telas estreitas usam menos)
const WIND = 64, NOISE_SCALE = 340;     // velocidade do vento (px/s) e tamanho das curvas
const TURN = 1.15;                      // quanto o vento pode virar da esquerda para a direita (rad)
const RESPONSE = 9;                     // quão rápido a partícula assume o vento local (menor = mais inércia)
const TRAIL_TAU = 0.22;                 // constante de tempo do rastro (s)
const DISC_RADIUS = 64, DISC_FOLLOW = 18, DISC_RISE = 7; // o cursor é um disco que o ar contorna
const SHED_SPEED = 150, SHED_MS = 42, MAX_VORTICES = 30;  // acima dessa velocidade o disco solta vórtices
const VORTEX_CORE = 30, VORTEX_GAIN = 0.62 * Math.PI * 2 * VORTEX_CORE * 0.5, VORTEX_TAU = 1.1, VORTEX_SPREAD = 0.5, MAX_CURSOR_SPEED = 1600;
const GUST_MS = 1300, GUST_SPEED = 0.62, GUST_WIDTH = 64, GUST_STRENGTH = 560; // um clique manda um anel de vento
const BUCKETS = [0.18, 0.34, 0.54, 0.8]; // quatro níveis de alfa: cada um é um traçado só, então um quadro são 4 chamadas
const MAX_SEGMENT = 40;                  // segmentos maiores são um reaparecimento, não movimento
const IDLE_FRAME_MS = 33;                // só a deriva é lenta: metade dos quadros parece igual
const CLEANUP_MS = 1000, CLEANUP_ALPHA = 0.24; // destination-out não apaga os últimos níveis de alfa aos poucos; uma passada forte por segundo limpa o resíduo
const STILL_LINES = 340, STILL_STEPS = 18, STILL_DT = 0.05;

/** Ruído de gradiente 3D com semente (Perlin melhorado), de -1 a 1 aproximadamente. */
function createNoise(seed) {
  const p = Array.from({ length: 256 }, (_, i) => i); let state = (seed >>> 0) || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
  const grad = (hash, x, y, z) => { const k = hash & 15, u = k < 8 ? x : y; let v = z; if (k < 4) v = y; else if (k === 12 || k === 14) v = x; return ((k & 1) === 0 ? u : -u) + ((k & 2) === 0 ? v : -v); };
  return (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255, fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z);
    const u = fade(fx), v = fade(fy), w = fade(fz), A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], fx, fy, fz), grad(perm[BA], fx - 1, fy, fz), u), lerp(grad(perm[AB], fx, fy - 1, fz), grad(perm[BB], fx - 1, fy - 1, fz), u), v),
      lerp(lerp(grad(perm[AA + 1], fx, fy, fz - 1), grad(perm[BA + 1], fx - 1, fy, fz - 1), u), lerp(grad(perm[AB + 1], fx, fy - 1, fz - 1), grad(perm[BB + 1], fx - 1, fy - 1, fz - 1), u), v), w);
  };
}

// Vetor de rascunho que as funções do campo preenchem, para um quadro não alocar nada por partícula.
const out = { x: 0, y: 0 };

/** Vento sem perturbação: da esquerda para a direita, desviado por um ruído que deriva devagar. */
function baseWind(air, x, y) {
  const t = air.time, angle = air.noise((x - t * WIND * 0.6) / NOISE_SCALE, y / NOISE_SCALE, t * 0.06) * TURN;
  out.x = Math.cos(angle) * air.wind; out.y = Math.sin(angle) * air.wind;
}
/** Escoamento potencial em volta de um disco: o ar abre à frente, acelera nas laterais e fecha atrás (u - iv = conj(w) - (w - V) R²/z²). */
function addDisc(disc, x, y) {
  const radius = DISC_RADIUS * disc.amount, dx = x - disc.x, dy = y - disc.y, r2 = Math.max(dx * dx + dy * dy, radius * radius), k = (radius * radius) / (r2 * r2);
  const rx = out.x - disc.vx, ry = out.y - disc.vy, p = dx * dx - dy * dy, q = -2 * dx * dy;
  out.x -= k * (rx * p - ry * q); out.y += k * (rx * q + ry * p);
}
function addVortices(vortices, x, y) {
  for (const v of vortices) {
    const dx = x - v.x, dy = y - v.y, r2 = dx * dx + dy * dy + 1, core = VORTEX_CORE * VORTEX_CORE * (1 + v.age / VORTEX_SPREAD);
    const swirl = ((v.gamma * Math.exp(-v.age / VORTEX_TAU)) / (2 * Math.PI * r2)) * (1 - Math.exp(-r2 / core));
    out.x -= swirl * dy; out.y += swirl * dx;
  }
}
function addGusts(gusts, now, x, y) {
  for (const g of gusts) {
    const age = now - g.start, dx = x - g.x, dy = y - g.y, r = Math.hypot(dx, dy) + 0.001, d = r - age * GUST_SPEED, fadeOut = 1 - age / GUST_MS;
    const push = GUST_STRENGTH * fadeOut * fadeOut * Math.exp(-(d * d) / (2 * GUST_WIDTH * GUST_WIDTH));
    out.x += (push * dx) / r; out.y += (push * dy) / r;
  }
}
function velocityAt(air, x, y) {
  baseWind(air, x, y);
  if (air.disc.amount > 0.002) addDisc(air.disc, x, y);
  if (air.vortices.length) addVortices(air.vortices, x, y);
  if (air.gusts.length) addGusts(air.gusts, air.now, x, y);
}
/** Desliza o disco atrás do cursor e solta vórtices pelas laterais. */
function stepDisc(disc, vortices, dt, now) {
  const px = disc.x, py = disc.y, follow = 1 - Math.exp(-DISC_FOLLOW * dt);
  disc.x += (disc.targetX - disc.x) * follow; disc.y += (disc.targetY - disc.y) * follow;
  const goal = disc.on ? 1 : 0; disc.amount += (goal - disc.amount) * (1 - Math.exp(-DISC_RISE * dt));
  if (disc.amount < 0.002 && !disc.on) disc.amount = 0;
  const smooth = 1 - Math.exp(-14 * dt);
  disc.vx += ((disc.x - px) / dt - disc.vx) * smooth; disc.vy += ((disc.y - py) / dt - disc.vy) * smooth;
  const speed = Math.hypot(disc.vx, disc.vy);
  if (speed < SHED_SPEED || disc.amount < 0.5 || now - disc.lastShed < SHED_MS) return;
  disc.lastShed = now; disc.side = -disc.side; // alterna os lados, como a esteira de vórtices atrás de um cilindro
  const ux = disc.vx / speed, uy = disc.vy / speed, radius = DISC_RADIUS * disc.amount;
  vortices.push({ x: disc.x - ux * radius * 0.9 - uy * disc.side * radius * 0.55, y: disc.y - uy * radius * 0.9 + ux * disc.side * radius * 0.55, gamma: disc.side * VORTEX_GAIN * Math.min(speed, MAX_CURSOR_SPEED), age: 0 });
  if (vortices.length > MAX_VORTICES) vortices.shift();
}
/** Envelhece a esteira: vórtices vão a favor do vento e enfraquecem até sumir. */
function stepWake(air, dt) {
  for (const v of air.vortices) { baseWind(air, v.x, v.y); v.x += out.x * 0.85 * dt; v.y += out.y * 0.85 * dt; v.age += dt; }
  while (air.vortices.length && air.vortices[0].age > VORTEX_TAU * 3.5) air.vortices.shift();
  while (air.gusts.length && air.now - air.gusts[0].start > GUST_MS) air.gusts.shift();
}

/** Estado das partículas em arrays planos: barato de percorrer 700 vezes por quadro. */
class Particles {
  count = 0; width = 0; height = 0;
  x = new Float32Array(0); y = new Float32Array(0); vx = new Float32Array(0); vy = new Float32Array(0);
  life = new Float32Array(0); maxLife = new Float32Array(0); pace = new Float32Array(0);
  resize(count, width, height) {
    if (count === this.count) { // mesmo número, novo tamanho: estica as partículas para não abrir uma faixa vazia
      const sx = this.width > 0 ? width / this.width : 1, sy = this.height > 0 ? height / this.height : 1;
      for (let i = 0; i < count; i++) { this.x[i] *= sx; this.y[i] *= sy; }
      this.width = width; this.height = height; return;
    }
    this.width = width; this.height = height; this.count = count;
    for (const k of ['x', 'y', 'vx', 'vy', 'life', 'maxLife', 'pace']) this[k] = new Float32Array(count);
    for (let i = 0; i < count; i++) { this.spawn(i, width, height); this.life[i] = Math.random() * this.maxLife[i]; } // começam no meio da vida, para não sumirem todas juntas
  }
  spawn(i, width, height) {
    this.x[i] = Math.random() * width; this.y[i] = Math.random() * height; this.vx[i] = 0; this.vy[i] = 0;
    this.life[i] = 0; this.maxLife[i] = 3 + Math.random() * 5; this.pace[i] = 0.75 + Math.random() * 0.5;
  }
}
const envelope = (life, maxLife) => Math.min(1, life / 0.6, (maxLife - life) / 0.6); // surge e some suave, sem estalo
const bucketOf = (i) => clamp(Math.floor(i * 4), 0, BUCKETS.length - 1);
const wrap = (v, size) => (v < -8 ? v + size + 16 : v > size + 8 ? v - size - 16 : v);

function keepOutOfDisc(p, i, disc) {
  if (disc.amount === 0) return;
  const radius = DISC_RADIUS * disc.amount, dx = p.x[i] - disc.x, dy = p.y[i] - disc.y, r2 = dx * dx + dy * dy;
  if (r2 >= radius * radius || r2 < 0.0001) return;
  const r = Math.sqrt(r2); p.x[i] = disc.x + (dx / r) * radius; p.y[i] = disc.y + (dy / r) * radius;
}
function stepParticle(c, i) {
  const { air, particles: p, dt } = c;
  p.life[i] += dt;
  if (p.life[i] > p.maxLife[i]) { p.spawn(i, c.width, c.height); return; }
  const x0 = p.x[i], y0 = p.y[i];
  velocityAt(air, x0, y0);
  const take = 1 - Math.exp(-RESPONSE * dt);
  p.vx[i] += (out.x * p.pace[i] - p.vx[i]) * take; p.vy[i] += (out.y * p.pace[i] - p.vy[i]) * take;
  p.x[i] = wrap(x0 + p.vx[i] * dt, c.width); p.y[i] = wrap(y0 + p.vy[i] * dt, c.height);
  keepOutOfDisc(p, i, air.disc);
  const sx = p.x[i] - x0, sy = p.y[i] - y0;
  if (sx * sx + sy * sy > MAX_SEGMENT * MAX_SEGMENT) return;
  // Ar mais rápido desenha mais escuro: a esteira e as laterais do disco se destacam da deriva.
  const pace = Math.hypot(p.vx[i], p.vy[i]) / (air.wind * 2.4 + 1);
  const path = c.paths[bucketOf(envelope(p.life[i], p.maxLife[i]) * Math.min(1, 0.4 + pace))];
  path.moveTo(x0, y0); path.lineTo(p.x[i], p.y[i]);
}
function strokeBuckets(ctx, paths) { BUCKETS.forEach((a, b) => { ctx.globalAlpha = a; ctx.stroke(paths[b]); }); ctx.globalAlpha = 1; }

/** Linhas de corrente traçadas de sementes aleatórias: o retrato parado do vento (movimento reduzido). */
function drawStill(ctx, air, size, lines) {
  const paths = BUCKETS.map(() => new Path2D());
  for (let n = 0; n < lines; n++) {
    let x = Math.random() * size.width, y = Math.random() * size.height;
    for (let s = 0; s < STILL_STEPS; s++) {
      baseWind(air, x, y); const nx = x + out.x * STILL_DT, ny = y + out.y * STILL_DT;
      const path = paths[bucketOf((s / STILL_STEPS) * 0.75)]; path.moveTo(x, y); path.lineTo(nx, ny); x = nx; y = ny; // cada linha escurece rumo à cabeça, como um rastro
    }
  }
  strokeBuckets(ctx, paths);
}
const createAir = () => ({
  noise: createNoise(7), time: 0, wind: WIND,
  disc: { x: 0, y: 0, targetX: 0, targetY: 0, vx: 0, vy: 0, amount: 0, on: false, lastShed: 0, side: 1 },
  vortices: [], gusts: [], now: 0,
});

// Intensidade do vento por botão: [rótulo, velocidade, densidade]
const MODES = [['Brisa', 0.6, 0.7], ['Vento', 1, 1], ['Ventania', 1.7, 1.4]];

const CSS = `
.kk-flow-field-root{position:absolute;inset:0;overflow:hidden;touch-action:pan-y;color:${PALETTE.ice700};background:linear-gradient(160deg,#fff,${PALETTE.ice50})}
.kk-flow-field-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .7s ease-out}
.kk-flow-field-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:0 20px 36px;text-align:center;pointer-events:none}
.kk-flow-field-text h3{margin:0;font-size:clamp(22px,8cqw,46px);line-height:1.05;letter-spacing:-.03em;font-weight:700;color:var(--ink,${PALETTE.ink});text-wrap:balance}
.kk-flow-field-text p{margin:0;max-width:22em;font-size:clamp(12px,3.3cqw,16px);line-height:1.45;color:var(--mut,${PALETTE.mut})}
.kk-flow-field-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.kk-flow-field-chip{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:rgba(255,255,255,.9);color:${PALETTE.ice800};font-family:inherit;font-weight:600;font-size:12px;line-height:1;cursor:pointer}
.kk-flow-field-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-flow-field-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('flow-field', CSS);
  const off = disposer();
  const reduceMotion = reduced();

  const canvas = h('canvas', { class: 'kk-flow-field-canvas', 'aria-hidden': 'true' });
  const ctx = canvas.getContext('2d');
  const root = h('div', { class: 'kk-flow-field-root' }, canvas,
    h('div', { class: 'kk-flow-field-text' },
      h('h3', {}, 'Vento a favor das suas vendas'),
      h('p', {}, 'As correntes se abrem em volta do cursor, giram na esteira e se espalham no clique.')));
  const cfg = { speed: 1, density: 1 };
  const bar = h('div', { class: 'kk-flow-field-bar', role: 'group', 'aria-label': 'Intensidade do vento' });
  const chips = MODES.map(([label, speed, density], i) => h('button', {
    type: 'button', class: 'kk-flow-field-chip', 'aria-pressed': String(i === 1),
    onclick: () => { cfg.speed = speed; cfg.density = density; chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === i))); air.wind = WIND * speed; resize(); },
  }, label));
  bar.append(...chips); root.append(bar); stage.append(root);
  if (!ctx) return () => root.remove();

  const air = createAir(), particles = new Particles(), size = { width: 0, height: 0 };
  let color = getComputedStyle(canvas).color, raf = 0, lastStep = 0, lastCleanup = 0, visible = true;
  const countFor = (w) => Math.round(BASE_COUNT * cfg.density * (w < 520 ? 0.6 : 1));
  const paintStill = () => { ctx.clearRect(0, 0, size.width, size.height); ctx.strokeStyle = color; drawStill(ctx, air, size, Math.round((countFor(size.width) * STILL_LINES) / BASE_COUNT)); };
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    size.width = r.width; size.height = r.height; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'butt'; ctx.lineWidth = 1.2;
    color = getComputedStyle(canvas).color; particles.resize(countFor(size.width), size.width, size.height);
    if (reduceMotion) paintStill();
  }
  const isActive = () => air.disc.on || air.disc.amount > 0 || air.vortices.length > 0 || air.gusts.length > 0;
  // O rastro some apagando um pouco de alfa por quadro: o canvas fica transparente sobre o fundo do palco.
  const fade = (dt, now) => {
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - Math.exp(-dt / TRAIL_TAU);
    ctx.fillRect(0, 0, size.width, size.height);
    if (dt < 0.025 && now - lastCleanup > CLEANUP_MS) { lastCleanup = now; ctx.globalAlpha = CLEANUP_ALPHA; ctx.fillRect(0, 0, size.width, size.height); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    raf = requestAnimationFrame(frame);
    if (!isActive() && now - lastStep < IDLE_FRAME_MS - 4) return;
    const dt = lastStep ? Math.min((now - lastStep) / 1000, 0.05) : 1 / 60; lastStep = now;
    air.now = now; air.time += dt * cfg.speed;
    stepDisc(air.disc, air.vortices, dt, now); stepWake(air, dt); fade(dt, now);
    const step = { air, particles, paths: BUCKETS.map(() => new Path2D()), width: size.width, height: size.height, dt };
    for (let i = 0; i < particles.count; i++) stepParticle(step, i);
    ctx.strokeStyle = color; strokeBuckets(ctx, step.paths);
  };
  const start = () => { if (!raf && visible && !reduceMotion) { lastStep = 0; raf = requestAnimationFrame(frame); } };

  resize(); canvas.style.opacity = '1'; start();
  const ro = new ResizeObserver(resize); ro.observe(canvas); off(() => ro.disconnect());
  let onScreen = true;
  const update = () => { visible = onScreen && document.visibilityState === 'visible'; start(); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }); io.observe(root); off(() => io.disconnect());
  document.addEventListener('visibilitychange', update); off(() => document.removeEventListener('visibilitychange', update));
  const timer = setInterval(() => { if (!visible) return; const c = getComputedStyle(canvas).color; if (c !== color) { color = c; if (reduceMotion) paintStill(); } }, 500); off(() => clearInterval(timer));

  // Ponteiro na janela: o vento contorna o cursor mesmo com texto por cima. Dedo só mexe o ar enquanto está tocando.
  const local = (e) => { const r = root.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return { x, y, inside: x >= 0 && y >= 0 && x <= r.width && y <= r.height }; };
  const onLeave = () => { air.disc.on = false; };
  const onMove = (e) => {
    if (!visible || (e.pointerType === 'touch' && e.buttons === 0)) return;
    const pt = local(e), d = air.disc;
    if (!pt.inside) { d.on = false; return; }
    if (d.amount < 0.05) { d.x = pt.x; d.y = pt.y; d.vx = 0; d.vy = 0; } // aparece onde o cursor entrou, em vez de deslizar de onde saiu
    d.targetX = pt.x; d.targetY = pt.y; d.on = true; start();
  };
  const onOut = (e) => { if (!e.relatedTarget) onLeave(); };
  const onUp = (e) => { if (e.pointerType === 'touch') onLeave(); };
  const onDown = (e) => {
    if (!visible || e.button !== 0 || e.target.closest?.('a,button,input,textarea,select,label,[role="button"]')) return;
    const pt = local(e); if (!pt.inside) return;
    air.gusts.push({ x: pt.x, y: pt.y, start: performance.now() }); if (air.gusts.length > 4) air.gusts.shift();
    onMove(e); start();
  };
  if (!reduceMotion) {
    const o = { passive: true };
    addEventListener('pointermove', onMove, o); addEventListener('pointerdown', onDown, o); addEventListener('pointerup', onUp, o);
    addEventListener('pointercancel', onLeave, o); document.addEventListener('pointerout', onOut, o); addEventListener('blur', onLeave);
    off(() => { removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onLeave); document.removeEventListener('pointerout', onOut); removeEventListener('blur', onLeave); });
  }

  return () => { cancelAnimationFrame(raf); off.run(); root.remove(); };
}
