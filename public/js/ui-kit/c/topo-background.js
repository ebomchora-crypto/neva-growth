// Topo Background — porte em JS puro do componente "Topo Background" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Diferente do topo-bg.js do app (fixo atrás da tela inteira, sem rótulos), este vive só dentro do palco e imprime as altitudes.
import { h, ensureStyle, reduced, disposer, PALETTE } from '../kit.js';

const CELL = 12;                 // distância entre amostras do campo (px): as curvas são traçadas por essa grade
const TERRAIN_SCALE = 360;       // largura de uma colina do terreno (px)
const INDEX_EVERY = 5;           // a cada 5 curvas, uma "mestra" mais grossa, como em mapa de verdade
const HILL_HEIGHT = 0.5, HILL_SPREAD = 120, HILL_FOLLOW = 9, HILL_RISE = 5; // colina que segue o cursor
const RIPPLE_MS = 1800, RIPPLE_SPEED = 0.24, RIPPLE_WIDTH = 42, RIPPLE_HEIGHT = 0.2, RIPPLE_WAVELENGTH = 96; // onda do clique
const IDLE_FRAME_MS = 33;        // só a deriva: um quadro a cada 33 ms basta
const LABEL_BASE = 500, LABEL_STEP = 20; // altitude do nível n = BASE + n*STEP, então as mestras leem centenas redondas
const LABEL_MARGIN = 0.16, MAX_LABEL_ANGLE = Math.PI / 3;
const LABEL_FONT = '500 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

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

/** Segmento que uma curva desenha numa célula (bits: topo-esq 8, topo-dir 4, base-dir 2, base-esq 1). */
function cellSegments(path, index, box, cross) {
  const { x0, y0, x1, y1 } = box, { top, right, bottom, left } = cross;
  const line = (ax, ay, bx, by) => { path.moveTo(ax, ay); path.lineTo(bx, by); };
  switch (index) {
    case 1: case 14: line(x0, left, bottom, y1); break;
    case 2: case 13: line(bottom, y1, x1, right); break;
    case 3: case 12: line(x0, left, x1, right); break;
    case 4: case 11: line(top, y0, x1, right); break;
    case 6: case 9: line(top, y0, bottom, y1); break;
    case 7: case 8: line(x0, left, top, y0); break;
    case 5: line(x0, left, top, y0); line(bottom, y1, x1, right); break; // as duas selas: cantos opostos altos, o nível cruza a célula duas vezes
    case 10: line(top, y0, x1, right); line(x0, left, bottom, y1); break;
    default: break;
  }
}

/** Oferece um ponto de curva mestra como lugar de rótulo. Os "espaços" ficam no espaço do terreno (derivam com o mapa) e linhas alternadas são deslocadas meio espaço, para não formar grade. */
function offerLabel(slots, label) {
  const { x, y } = label;
  if (y < slots.height * LABEL_MARGIN || y > slots.height * (1 - LABEL_MARGIN) || x < 24 || x > slots.width - 24 || slots.avoid.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1)) return;
  const sp = slots.spacing, row = Math.floor(y / sp), shifted = x + slots.drift + (row % 2) * (sp / 2), col = Math.floor(shifted / sp);
  const score = (shifted - (col + 0.5) * sp) ** 2 + (y - (row + 0.5) * sp) ** 2;
  if (score > (sp * 0.32) ** 2) return; // longe do centro: um vizinho poderia ficar colado
  const key = row * 100000 + col, cur = slots.best.get(key);
  if (!cur || score < cur.score) slots.best.set(key, { ...label, score });
}
function offerCellLabel(slots, [a, b, c, d], x0, y0, level, t) {
  // A curva corre atravessando a encosta; o gradiente da célula dá direção mais estável que o segmento curto.
  const gx = b - a + c - d, gy = d - a + c - b, px = gx / (2 * CELL), py = gy / (2 * CELL), g2 = px * px + py * py;
  const lift = g2 > 0 ? (t - (a + b + c + d) / 4) / g2 : 0, half = CELL / 2;
  const ox = Math.max(-half, Math.min(half, lift * px)), oy = Math.max(-half, Math.min(half, lift * py));
  let angle = Math.atan2(gx, -gy);
  if (angle > Math.PI / 2) angle -= Math.PI; else if (angle < -Math.PI / 2) angle += Math.PI; // texto sempre em pé
  if (Math.abs(angle) > MAX_LABEL_ANGLE) return; // número deitado é difícil de ler: pula trechos íngremes
  offerLabel(slots, { x: x0 + half + ox, y: y0 + half + oy, angle, level });
}
/** Marching squares: cada nível que passa por uma célula; curvas mestras vão num traçado só, e viram candidatas a rótulo. */
function traceContours(field, cols, rows, interval, minor, major, slots) {
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
    const x0 = i * CELL, y0 = j * CELL, first = Math.ceil(Math.min(a, b, c, d) / interval), last = Math.floor(Math.max(a, b, c, d) / interval);
    if (first > last) continue;
    const box = { x0, y0, x1: x0 + CELL, y1: y0 + CELL };
    for (let level = first; level <= last; level++) {
      const t = level * interval, index = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (index === 0 || index === 15) continue;
      const isIndex = level % INDEX_EVERY === 0;
      cellSegments(isIndex ? major : minor, index, box, {
        top: x0 + CELL * ((t - a) / (b - a)), right: y0 + CELL * ((t - b) / (c - b)),
        bottom: x0 + CELL * ((t - d) / (c - d)), left: y0 + CELL * ((t - a) / (d - a)),
      });
      if (isIndex && slots && index !== 5 && index !== 10) offerCellLabel(slots, [a, b, c, d], x0, y0, level, t); // selas são maus lugares: a linha vira de repente
    }
  }
}

const CSS = `
.kk-topo-background-root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;touch-action:pan-y;color:${PALETTE.ice700};background:#fff}
.kk-topo-background-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .5s ease-out;pointer-events:none;
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent)}
.kk-topo-background-text{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;max-width:26em;padding:0 20px 40px;text-align:center;pointer-events:none}
.kk-topo-background-text h3{margin:0;font-size:clamp(22px,8cqw,46px);line-height:1.05;letter-spacing:-.03em;font-weight:700;color:var(--ink,${PALETTE.ink});text-wrap:balance}
.kk-topo-background-text p{margin:0;max-width:22em;font-size:clamp(12px,3.3cqw,16px);line-height:1.45;color:var(--mut,${PALETTE.mut})}
.kk-topo-background-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.kk-topo-background-chip{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:rgba(255,255,255,.92);color:${PALETTE.ice800};font:600 12px/1 inherit;font-family:inherit;cursor:pointer}
.kk-topo-background-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-topo-background-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('topo-background', CSS);
  const off = disposer();
  const reduceMotion = reduced();
  const cfg = { interval: 0.05, speed: 1, labels: true };
  const noise = createNoise(26);

  const canvas = h('canvas', { class: 'kk-topo-background-canvas', 'aria-hidden': 'true' });
  const text = h('div', { class: 'kk-topo-background-text' },
    h('h3', {}, 'Encontre seu rumo'),
    h('p', {}, 'Um mapa de curvas de nível vivo. Passe o cursor para erguer uma colina e clique para mandar uma onda.'));
  const bar = h('div', { class: 'kk-topo-background-bar' });
  const root = h('div', { class: 'kk-topo-background-root' }, canvas, text, bar);
  const chip = (label, pressed, fn) => {
    const b = h('button', { type: 'button', class: 'kk-topo-background-chip', 'aria-pressed': String(pressed), onclick: () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); fn(on); } }, label);
    return b;
  };
  bar.append(
    chip('Altitudes', true, (on) => { cfg.labels = on; repaint(); }),
    chip('Mais curvas', false, (on) => { cfg.interval = on ? 0.035 : 0.05; repaint(); }),
    chip('Pausar', false, (on) => { cfg.speed = on ? 0 : 1; start(); }));
  if (reduceMotion) bar.lastElementChild.disabled = true;
  stage.append(root);
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => root.remove();

  let width = 0, height = 0, cols = 0, rows = 0, field = new Float32Array(0), color = getComputedStyle(canvas).color;
  const hill = { x: 0, y: 0, targetX: 0, targetY: 0, amount: 0, on: false }, ripples = [];
  let time = 0, last = 0, lastPaint = 0, raf = 0, visible = true;
  const slots = { spacing: 150, drift: 0, width: 0, height: 0, best: new Map(), avoid: [] };

  // Mantém os números longe do texto e dos botões por cima do mapa.
  const measureContent = () => {
    const o = canvas.getBoundingClientRect();
    slots.spacing = Math.min(210, Math.max(110, width * 0.42)); // o palco é pequeno: espaços menores que os do original
    slots.avoid = [text, bar].map((el) => { const r = el.getBoundingClientRect(); return { x0: r.left - o.left - 8, y0: r.top - o.top - 6, x1: r.right - o.left + 8, y1: r.bottom - o.top + 6 }; });
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = r.width; height = r.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / CELL) + 1; rows = Math.ceil(height / CELL) + 1; field = new Float32Array(cols * rows);
    color = getComputedStyle(canvas).color; measureContent();
  };
  const sample = (now) => {
    const z = time * 0.05, drift = time * 6, hillOn = hill.amount > 0.001, spread = 2 * HILL_SPREAD * HILL_SPREAD, ringWidth = 2 * RIPPLE_WIDTH * RIPPLE_WIDTH;
    for (let j = 0; j < rows; j++) {
      const y = j * CELL;
      for (let i = 0; i < cols; i++) {
        const x = i * CELL, nx = (x + drift) / TERRAIN_SCALE, ny = y / TERRAIN_SCALE;
        let v = noise(nx, ny, z) * 0.78 + noise(nx * 2.3 + 17.1, ny * 2.3 + 4.7, z * 1.4) * 0.22;
        if (hillOn) { const dx = x - hill.x, dy = y - hill.y; v += HILL_HEIGHT * hill.amount * Math.exp(-(dx * dx + dy * dy) / spread); }
        for (const rp of ripples) { // trem de cristas e vales, como uma pedra na água: as curvas se juntam em anéis quando passa
          const age = now - rp.start, d = Math.hypot(x - rp.x, y - rp.y) - age * RIPPLE_SPEED, fadeOut = 1 - age / RIPPLE_MS;
          v += RIPPLE_HEIGHT * fadeOut * fadeOut * Math.exp(-(d * d) / ringWidth) * Math.cos((d / RIPPLE_WAVELENGTH) * Math.PI * 2);
        }
        field[j * cols + i] = v;
      }
    }
  };
  /** Abre um vão nas linhas sob cada número e imprime a altitude, como num mapa topográfico. */
  const drawLabels = () => {
    ctx.font = LABEL_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of slots.best.values()) {
      const t = `${LABEL_BASE + l.level * LABEL_STEP}`, w = ctx.measureText(t).width + 8;
      ctx.save(); ctx.translate(Math.round(l.x), Math.round(l.y)); ctx.rotate(l.angle);
      ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.fillRect(-w / 2, -7, w, 14);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6; ctx.fillText(t, 0, 0.5); ctx.restore();
    }
  };
  const paint = (now) => {
    sample(now);
    const minor = new Path2D(), major = new Path2D();
    slots.best.clear(); slots.drift = time * 6; slots.width = width; slots.height = height;
    traceContours(field, cols, rows, cfg.interval, minor, major, cfg.labels ? slots : null);
    ctx.clearRect(0, 0, width, height); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.28; ctx.lineWidth = 0.75; ctx.stroke(minor);
    ctx.globalAlpha = 0.55; ctx.lineWidth = 1.1; ctx.stroke(major);
    if (cfg.labels) drawLabels();
    ctx.globalAlpha = 1;
  };
  const repaint = () => { paint(performance.now()); start(); };
  const stepHill = (dt) => {
    const follow = 1 - Math.exp(-HILL_FOLLOW * dt);
    hill.x += (hill.targetX - hill.x) * follow; hill.y += (hill.targetY - hill.y) * follow;
    const goal = hill.on ? 1 : 0; hill.amount += (goal - hill.amount) * (1 - Math.exp(-HILL_RISE * dt));
    return Math.abs(hill.targetX - hill.x) > 0.5 || Math.abs(hill.targetY - hill.y) > 0.5 || Math.abs(goal - hill.amount) > 0.002;
  };
  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    const moving = stepHill(dt);
    while (ripples.length && now - ripples[0].start > RIPPLE_MS) ripples.shift();
    const settling = moving || ripples.length > 0;
    time += dt * cfg.speed;
    if (settling || now - lastPaint >= IDLE_FRAME_MS) { paint(now); lastPaint = now; } // seguindo a mão: todo quadro; só deriva: metade
    if (cfg.speed > 0 || settling) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !reduceMotion) { last = 0; raf = requestAnimationFrame(frame); } }

  resize(); paint(performance.now()); canvas.style.opacity = '1'; start();
  const ro = new ResizeObserver(() => { resize(); paint(performance.now()); }); ro.observe(canvas); off(() => ro.disconnect());
  let onScreen = true;
  const update = () => { visible = onScreen && document.visibilityState === 'visible'; if (visible) start(); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }); io.observe(root); off(() => io.disconnect());
  document.addEventListener('visibilitychange', update); off(() => document.removeEventListener('visibilitychange', update));
  const timer = setInterval(() => { if (!visible) return; const c = getComputedStyle(canvas).color; if (c !== color) { color = c; if (reduceMotion || !raf) paint(performance.now()); } }, 500); off(() => clearInterval(timer));

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onMove = (e) => {
    if (e.pointerType !== 'mouse' && !e.buttons) return; // dedo só ergue a colina enquanto toca
    const p = local(e);
    if (!hill.on) { hill.x = p.x; hill.y = p.y; } // sobe onde o cursor entrou, em vez de deslizar de onde saiu
    hill.targetX = p.x; hill.targetY = p.y; hill.on = true; start();
  };
  const onLeave = () => { hill.on = false; start(); };
  const onUp = (e) => { if (e.pointerType !== 'mouse') onLeave(); };
  const onDown = (e) => {
    if (e.target.closest?.('a,button,input,textarea')) return;
    ripples.push({ ...local(e), start: performance.now() }); if (ripples.length > 4) ripples.shift(); start();
  };
  if (!reduceMotion) {
    root.addEventListener('pointermove', onMove); root.addEventListener('pointerleave', onLeave); root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onLeave);
    off(() => { root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave); root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onLeave); });
  }

  return () => { cancelAnimationFrame(raf); off.run(); root.remove(); };
}
