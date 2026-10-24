// Dot Field: membrana de pontos em meio-tom com ruído lento, esteira ao passar o mouse e onda de choque no clique.
// Port em JS puro do componente "Dot Field". Canvas 2D, sem dependências.
const NOISE_SCALE = 240, NOISE_SPEED = 0.07, TONE_STEP = 3, IDLE_FRAME_MS = 33;
const ANCHOR = 26, COUPLING = 340, DAMPING = 2.4, STEP = 1 / 120;
const POINTER_RADIUS = 72, POINTER_GAIN = 14, POINTER_MAX_SPEED = 2600, POINTER_PART = 0.45;
const SHOCK_SPEED = 620, SHOCK_WIDTH = 34, SHOCK_FORCE = 5200, SHOCK_LIFE = 1.3;
const COMPRESSION_GAIN = 3, BUCKETS = 10, REST_SPEED = 2, REST_OFFSET = 0.15;

function createNoise(seed) {
  const p = Array.from({ length: 256 }, (_, i) => i); let state = (seed >>> 0) || 1;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10); const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (hash, x, y, z) => { const h = hash & 15; const u = h < 8 ? x : y; let v = z; if (h < 4) v = y; else if (h === 12 || h === 14) v = x; return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v); };
  return (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; const fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z);
    const u = fade(fx), v = fade(fy), w = fade(fz); const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(lerp(lerp(grad(perm[AA], fx, fy, fz), grad(perm[BA], fx - 1, fy, fz), u), lerp(grad(perm[AB], fx, fy - 1, fz), grad(perm[BB], fx - 1, fy - 1, fz), u), v),
      lerp(lerp(grad(perm[AA + 1], fx, fy, fz - 1), grad(perm[BA + 1], fx - 1, fy, fz - 1), u), lerp(grad(perm[AB + 1], fx, fy - 1, fz - 1), grad(perm[BB + 1], fx - 1, fy - 1, fz - 1), u), v), w);
  };
}
function createField(width, height, spacing) {
  const cols = Math.ceil(width / spacing) + 3, rows = Math.ceil(height / spacing) + 3, size = cols * rows; const F = Float32Array;
  return { cols, rows, spacing, originX: (width - (cols - 1) * spacing) / 2, originY: (height - (rows - 1) * spacing) / 2, tone: new F(size),
    coarse: new F((Math.ceil((cols - 1) / TONE_STEP) + 1) * (Math.ceil((rows - 1) / TONE_STEP) + 1)), ox: new F(size), oy: new F(size), vx: new F(size), vy: new F(size), ax: new F(size), ay: new F(size) };
}
function sampleTone(field, noise, time) {
  const { cols, rows, spacing, originX, originY, tone, coarse } = field; const z = time * NOISE_SPEED; const step = spacing * TONE_STEP;
  const cc = Math.ceil((cols - 1) / TONE_STEP) + 1, cr = Math.ceil((rows - 1) / TONE_STEP) + 1;
  for (let j = 0; j < cr; j++) { const ny = (originY + j * step) / NOISE_SCALE; for (let i = 0; i < cc; i++) { const nx = (originX + i * step) / NOISE_SCALE;
    const n = noise(nx, ny, z) * 0.75 + noise(nx * 2.1 + 9.3, ny * 2.1 + 3.7, z * 1.3) * 0.25; coarse[j * cc + i] = Math.min(1, Math.max(0, 0.5 + n * 1.1)); } }
  for (let j = 0; j < rows; j++) { const cj = Math.min(Math.floor(j / TONE_STEP), cr - 2); const fy = j / TONE_STEP - cj;
    for (let i = 0; i < cols; i++) { const ci = Math.min(Math.floor(i / TONE_STEP), cc - 2); const fx = i / TONE_STEP - ci; const a = cj * cc + ci;
      const top = coarse[a] + (coarse[a + 1] - coarse[a]) * fx; const bottom = coarse[a + cc] + (coarse[a + cc + 1] - coarse[a + cc]) * fx; tone[j * cols + i] = top + (bottom - top) * fy; } }
}
function neighbours(values, field, i, j) { const { cols, rows } = field; const k = j * cols + i; let s = 0; if (i > 0) s += values[k - 1]; if (i < cols - 1) s += values[k + 1]; if (j > 0) s += values[k - cols]; if (j < rows - 1) s += values[k + cols]; return s; }
function accelerate(field) {
  const { cols, rows, ox, oy, vx, vy, ax, ay } = field;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i; const sx = neighbours(ox, field, i, j), sy = neighbours(oy, field, i, j);
    ax[k] += -ANCHOR * ox[k] + COUPLING * (sx - 4 * ox[k]) - DAMPING * vx[k]; ay[k] += -ANCHOR * oy[k] + COUPLING * (sy - 4 * oy[k]) - DAMPING * vy[k]; }
}
function applyShocks(field, shocks) {
  const { cols, rows, spacing, originX, originY, ax, ay } = field;
  for (const sh of shocks) {
    const reach = sh.age * SHOCK_SPEED; const fade = 1 - sh.age / SHOCK_LIFE; const force = SHOCK_FORCE * fade * fade; const outer = reach + SHOCK_WIDTH; const inner = Math.max(0, reach - SHOCK_WIDTH);
    const i0 = Math.max(0, Math.floor((sh.x - outer - originX) / spacing)), i1 = Math.min(cols - 1, Math.ceil((sh.x + outer - originX) / spacing));
    const j0 = Math.max(0, Math.floor((sh.y - outer - originY) / spacing)), j1 = Math.min(rows - 1, Math.ceil((sh.y + outer - originY) / spacing));
    for (let j = j0; j <= j1; j++) { const dy = originY + j * spacing - sh.y; for (let i = i0; i <= i1; i++) { const dx = originX + i * spacing - sh.x; const dist = Math.hypot(dx, dy);
      if (dist < inner || dist > outer || dist === 0) continue; const band = 1 - Math.abs(dist - reach) / SHOCK_WIDTH; const k = j * cols + i; ax[k] += (dx / dist) * force * band; ay[k] += (dy / dist) * force * band; } }
  }
}
function applyPointer(field, ptr, dt) {
  const segX = ptr.x - ptr.lastX, segY = ptr.y - ptr.lastY; ptr.lastX = ptr.x; ptr.lastY = ptr.y; const length = Math.hypot(segX, segY);
  if (!ptr.inside || length < 0.5 || dt <= 0) return false;
  const speed = Math.min(length / dt, POINTER_MAX_SPEED); const pvx = (segX / length) * speed, pvy = (segY / length) * speed;
  const { cols, rows, spacing, originX, originY, vx, vy } = field; const startX = ptr.x - segX, startY = ptr.y - segY;
  const i0 = Math.max(0, Math.floor((Math.min(startX, ptr.x) - POINTER_RADIUS - originX) / spacing)), i1 = Math.min(cols - 1, Math.ceil((Math.max(startX, ptr.x) + POINTER_RADIUS - originX) / spacing));
  const j0 = Math.max(0, Math.floor((Math.min(startY, ptr.y) - POINTER_RADIUS - originY) / spacing)), j1 = Math.min(rows - 1, Math.ceil((Math.max(startY, ptr.y) + POINTER_RADIUS - originY) / spacing));
  const lengthSq = length * length; const gain = Math.min(1, POINTER_GAIN * dt);
  for (let j = j0; j <= j1; j++) { const py = originY + j * spacing; for (let i = i0; i <= i1; i++) { const px = originX + i * spacing;
    const t = Math.min(1, Math.max(0, ((px - startX) * segX + (py - startY) * segY) / lengthSq)); const awayX = px - startX - segX * t, awayY = py - startY - segY * t; const dist = Math.hypot(awayX, awayY);
    if (dist >= POINTER_RADIUS) continue; const falloff = 1 - dist / POINTER_RADIUS; const k = j * cols + i; const amount = gain * falloff * falloff; const side = dist > 0 ? (speed * POINTER_PART) / dist : 0;
    vx[k] += (pvx + awayX * side - vx[k]) * amount; vy[k] += (pvy + awayY * side - vy[k]) * amount; } }
  return true;
}
function integrate(field, shocks, hh) {
  const { ox, oy, vx, vy, ax, ay } = field; ax.fill(0); ay.fill(0); applyShocks(field, shocks); accelerate(field); let moving = false;
  for (let k = 0; k < ox.length; k++) { vx[k] += ax[k] * hh; vy[k] += ay[k] * hh; ox[k] += vx[k] * hh; oy[k] += vy[k] * hh;
    if (!moving && (Math.abs(vx[k]) > REST_SPEED || Math.abs(vy[k]) > REST_SPEED || Math.abs(ox[k]) > REST_OFFSET || Math.abs(oy[k]) > REST_OFFSET)) moving = true; }
  return moving;
}
function compression(field, i, j) { const { cols, rows, spacing, ox, oy } = field; const k = j * cols + i; const l = i > 0 ? ox[k - 1] : 0, r = i < cols - 1 ? ox[k + 1] : 0, u = j > 0 ? oy[k - cols] : 0, d = j < rows - 1 ? oy[k + cols] : 0; return -(r - l + d - u) / (2 * spacing); }
function draw(ctx, field, size, moving) {
  const { cols, rows, spacing, originX, originY, tone, ox, oy } = field; const maxRadius = spacing * 0.42; const paths = Array.from({ length: BUCKETS }, () => new Path2D()); const filled = new Uint8Array(BUCKETS);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i; let amount = 0.12 + 0.6 * tone[k]; if (moving) amount *= 1 + COMPRESSION_GAIN * compression(field, i, j);
    const b = Math.round(Math.min(1, Math.max(0, amount)) * (BUCKETS - 1)); if (b === 0) continue; const r = (maxRadius * b) / (BUCKETS - 1); const x = originX + i * spacing + ox[k], y = originY + j * spacing + oy[k];
    paths[b].moveTo(x + r, y); paths[b].arc(x, y, r, 0, Math.PI * 2); filled[b] = 1; }
  ctx.clearRect(0, 0, size.width, size.height); ctx.fillStyle = size.color;
  for (let b = 1; b < BUCKETS; b++) if (filled[b]) { ctx.globalAlpha = 0.2 + (0.32 * b) / (BUCKETS - 1); ctx.fill(paths[b]); }
  ctx.globalAlpha = 1;
}

/** Monta o campo dentro de `host` (position:relative). Devolve a função de limpeza. */
export function dotField(host, { spacing = 16, interactive = true, seed = 7, color = 'rgb(200,228,255)', animate = true } = {}) {
  const wrap = document.createElement('div'); wrap.className = 'dotfield'; wrap.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas'); wrap.append(canvas); host.prepend(wrap);
  const ctx = canvas.getContext('2d'); if (!ctx) { wrap.remove(); return () => {}; }
  const reduce = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noise = createNoise(seed); const gap = Math.max(6, spacing); const size = { width: 0, height: 0, color }; let field = createField(0, 0, gap);
  const ptr = { x: 0, y: 0, lastX: 0, lastY: 0, inside: false }; const shocks = [];
  let time = 0, last = 0, lastTone = 0, carry = 0, stirring = false, awake = false, raf = 0, visible = true;
  const resize = () => { const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); size.width = rect.width; size.height = rect.height;
    canvas.width = Math.round(size.width * dpr); canvas.height = Math.round(size.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); field = createField(size.width, size.height, gap); sampleTone(field, noise, time); awake = false; };
  const physics = (dt) => {
    const pushed = applyPointer(field, ptr, dt); carry = Math.min(carry + dt, STEP * 6);
    while (carry >= STEP) { carry -= STEP; for (const s of shocks) s.age += STEP; while (shocks.length && shocks[0].age > SHOCK_LIFE) shocks.shift(); stirring = integrate(field, shocks, STEP); }
    if (!(pushed || stirring || shocks.length)) { field.ox.fill(0); field.oy.fill(0); field.vx.fill(0); field.vy.fill(0); awake = false; }
  };
  const frame = (now) => { raf = 0; if (!visible) return; const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now; time += dt; const was = awake; if (awake) physics(dt);
    const due = now - lastTone >= IDLE_FRAME_MS; if (due) { sampleTone(field, noise, time); lastTone = now; } if (was || due) draw(ctx, field, size, was); raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && visible && !reduce) { last = 0; raf = requestAnimationFrame(frame); } };
  const wake = () => { if (!awake) { awake = true; carry = 0; stirring = true; } start(); };
  resize(); draw(ctx, field, size, false); start();
  const ro = new ResizeObserver(() => { resize(); draw(ctx, field, size, false); }); ro.observe(canvas);
  let onScreen = true; const upd = () => { visible = onScreen && document.visibilityState === 'visible'; if (visible) start(); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; upd(); }); io.observe(host); document.addEventListener('visibilitychange', upd);
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onMove = (e) => { const p = local(e); if (!ptr.inside) { ptr.lastX = p.x; ptr.lastY = p.y; ptr.inside = true; } ptr.x = p.x; ptr.y = p.y; if (Math.abs(ptr.x - ptr.lastX) > 0.5 || Math.abs(ptr.y - ptr.lastY) > 0.5) wake(); };
  const onLeave = () => { ptr.inside = false; };
  const onDown = (e) => { if (e.button !== 0 || e.target.closest("a, button, input, textarea, select, label, [role='button'], .composer, .effwrap")) return; const p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.lastX = p.x; ptr.lastY = p.y; ptr.inside = true; shocks.push({ ...p, age: 0 }); if (shocks.length > 3) shocks.shift(); wake(); };
  if (interactive && !reduce) { host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave); host.addEventListener('pointerdown', onDown); }
  return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', upd); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); host.removeEventListener('pointerdown', onDown); wrap.remove(); };
}
