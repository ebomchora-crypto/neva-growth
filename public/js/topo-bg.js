// Fundo de mapa topográfico vivo (porte em JS puro do TopoBackground do kokonutui, MIT, @dorianbaffier): curvas de nível
// por marching squares sobre um ruído de Perlin que deriva devagar; o cursor levanta uma colina e o clique manda uma onda.
// Diferenças do original: fica FIXO atrás do app inteiro (os eventos vêm do documento, não do elemento), sem rótulos de
// altitude (poluiriam as telas de dados) e com a cor vindo do CSS (`color` do canvas). Pausa com a aba escondida, e com
// prefers-reduced-motion desenha um único quadro parado.
const CELL = 12;
const TERRAIN_SCALE = 360;
const INDEX_EVERY = 5;
const HILL_HEIGHT = 0.5, HILL_SPREAD = 120, HILL_FOLLOW = 9, HILL_RISE = 5;
const RIPPLE_MS = 1800, RIPPLE_SPEED = 0.24, RIPPLE_WIDTH = 42, RIPPLE_HEIGHT = 0.2, RIPPLE_WAVELENGTH = 96;
const IDLE_FRAME_MS = 33;

/** Ruído de gradiente 3D com semente (Perlin melhorado), de -1 a 1 aproximadamente. */
function createNoise(seed) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let state = (seed >>> 0) || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (hash, x, y, z) => {
    const h = hash & 15; const u = h < 8 ? x : y; let v = z;
    if (h < 4) v = y; else if (h === 12 || h === 14) v = x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  return (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    const fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z);
    const u = fade(fx), v = fade(fy), w = fade(fz);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], fx, fy, fz), grad(perm[BA], fx - 1, fy, fz), u), lerp(grad(perm[AB], fx, fy - 1, fz), grad(perm[BB], fx - 1, fy - 1, fz), u), v),
      lerp(lerp(grad(perm[AA + 1], fx, fy, fz - 1), grad(perm[BA + 1], fx - 1, fy, fz - 1), u), lerp(grad(perm[AB + 1], fx, fy - 1, fz - 1), grad(perm[BB + 1], fx - 1, fy - 1, fz - 1), u), v),
      w);
  };
}

/** Segmento que uma curva desenha numa célula (bits: topo-esq 8, topo-dir 4, base-dir 2, base-esq 1). */
function cellSegments(path, index, box, cross) {
  const { x0, y0, x1, y1 } = box; const { top, right, bottom, left } = cross;
  const line = (ax, ay, bx, by) => { path.moveTo(ax, ay); path.lineTo(bx, by); };
  switch (index) {
    case 1: case 14: line(x0, left, bottom, y1); break;
    case 2: case 13: line(bottom, y1, x1, right); break;
    case 3: case 12: line(x0, left, x1, right); break;
    case 4: case 11: line(top, y0, x1, right); break;
    case 6: case 9: line(top, y0, bottom, y1); break;
    case 7: case 8: line(x0, left, top, y0); break;
    case 5: line(x0, left, top, y0); line(bottom, y1, x1, right); break;
    case 10: line(top, y0, x1, right); line(x0, left, bottom, y1); break;
    default: break;
  }
}

function traceContours(field, cols, rows, interval, minor, major) {
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
      const x0 = i * CELL, y0 = j * CELL;
      const first = Math.ceil(Math.min(a, b, c, d) / interval), last = Math.floor(Math.max(a, b, c, d) / interval);
      if (first > last) continue;
      const box = { x0, y0, x1: x0 + CELL, y1: y0 + CELL };
      for (let level = first; level <= last; level++) {
        const t = level * interval;
        const index = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
        if (index === 0 || index === 15) continue;
        cellSegments(level % INDEX_EVERY === 0 ? major : minor, index, box, {
          top: x0 + CELL * ((t - a) / (b - a)), right: y0 + CELL * ((t - b) / (c - b)),
          bottom: x0 + CELL * ((t - d) / (c - d)), left: y0 + CELL * ((t - a) / (d - a)),
        });
      }
    }
  }
}

/**
 * @param {HTMLCanvasElement} canvas  canvas já no DOM (fixo, atrás do conteúdo); a cor das linhas é o `color` dele
 * @returns {() => void} desmontagem
 */
export function topoBackground(canvas, { interval = 0.07, speed = 1, interactive = true, seed = 26, minorAlpha = 0.16, majorAlpha = 0.34 } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noise = createNoise(seed);
  let width = 0, height = 0, cols = 0, rows = 0, field = new Float32Array(0), color = '';
  const hill = { x: 0, y: 0, targetX: 0, targetY: 0, amount: 0, on: false };
  const ripples = [];
  let time = 0, last = 0, lastPaint = 0, raf = 0, visible = document.visibilityState === 'visible';

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / CELL) + 1; rows = Math.ceil(height / CELL) + 1;
    field = new Float32Array(cols * rows);
    color = getComputedStyle(canvas).color;
  };

  const sample = (now) => {
    const z = time * 0.05, drift = time * 6, hillOn = hill.amount > 0.001;
    const spread = 2 * HILL_SPREAD * HILL_SPREAD, ringWidth = 2 * RIPPLE_WIDTH * RIPPLE_WIDTH;
    for (let j = 0; j < rows; j++) {
      const y = j * CELL;
      for (let i = 0; i < cols; i++) {
        const x = i * CELL, nx = (x + drift) / TERRAIN_SCALE, ny = y / TERRAIN_SCALE;
        let v = noise(nx, ny, z) * 0.78 + noise(nx * 2.3 + 17.1, ny * 2.3 + 4.7, z * 1.4) * 0.22;
        if (hillOn) { const dx = x - hill.x, dy = y - hill.y; v += HILL_HEIGHT * hill.amount * Math.exp(-(dx * dx + dy * dy) / spread); }
        for (const ripple of ripples) {
          const age = now - ripple.start, d = Math.hypot(x - ripple.x, y - ripple.y) - age * RIPPLE_SPEED, fadeOut = 1 - age / RIPPLE_MS;
          v += RIPPLE_HEIGHT * fadeOut * fadeOut * Math.exp(-(d * d) / ringWidth) * Math.cos((d / RIPPLE_WAVELENGTH) * Math.PI * 2);
        }
        field[j * cols + i] = v;
      }
    }
  };

  const paint = (now) => {
    sample(now);
    const minor = new Path2D(), major = new Path2D();
    traceContours(field, cols, rows, interval, minor, major);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.globalAlpha = minorAlpha; ctx.lineWidth = 0.75; ctx.stroke(minor);
    ctx.globalAlpha = majorAlpha; ctx.lineWidth = 1.1; ctx.stroke(major);
    ctx.globalAlpha = 1;
  };

  const stepHill = (dt) => {
    hill.x += (hill.targetX - hill.x) * (1 - Math.exp(-HILL_FOLLOW * dt));
    hill.y += (hill.targetY - hill.y) * (1 - Math.exp(-HILL_FOLLOW * dt));
    const goal = hill.on ? 1 : 0;
    hill.amount += (goal - hill.amount) * (1 - Math.exp(-HILL_RISE * dt));
    return Math.abs(hill.targetX - hill.x) > 0.5 || Math.abs(hill.targetY - hill.y) > 0.5 || Math.abs(goal - hill.amount) > 0.002;
  };

  const frame = (now) => {
    raf = 0;
    if (!visible || !canvas.isConnected) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    const moving = stepHill(dt);
    while (ripples.length && now - ripples[0].start > RIPPLE_MS) ripples.shift();
    const settling = moving || ripples.length > 0;
    time += dt * speed;
    if (settling || now - lastPaint >= IDLE_FRAME_MS) { paint(now); lastPaint = now; }
    if (speed > 0 || settling) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !reduceMotion) { last = 0; raf = requestAnimationFrame(frame); } };

  resize(); paint(performance.now()); canvas.style.opacity = '1'; start();
  const onResize = () => { resize(); paint(performance.now()); };
  addEventListener('resize', onResize);
  const onVisible = () => { visible = document.visibilityState === 'visible'; if (visible) start(); };
  document.addEventListener('visibilitychange', onVisible);

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return; // toque não tem hover: a colina ficaria parada onde o dedo saiu
    const x = e.clientX, y = e.clientY;
    if (!hill.on) { hill.x = x; hill.y = y; }
    hill.targetX = x; hill.targetY = y; hill.on = true; start();
  };
  const onLeave = () => { hill.on = false; start(); };
  const onDown = (e) => {
    if (e.target.closest?.('a,button,input,textarea,select,summary,label,[role="button"],[role="dialog"],.modal,.drawer')) return;
    ripples.push({ x: e.clientX, y: e.clientY, start: performance.now() });
    if (ripples.length > 4) ripples.shift();
    start();
  };
  if (interactive && !reduceMotion) {
    document.addEventListener('pointermove', onMove); document.documentElement.addEventListener('pointerleave', onLeave); document.addEventListener('pointerdown', onDown);
  }

  return () => {
    cancelAnimationFrame(raf); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('pointerdown', onDown);
  };
}
