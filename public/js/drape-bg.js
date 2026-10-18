// Cortina em WebGL (simulação de tecido com Verlet) para o fundo das telas de acesso.
// Porte para JS puro do "Drape Background" (KokonutUI, MIT, @dorianbaffier). Cores no tom gelo da Neva.
import { motionEnabled } from './motion.js';

const STEP = 1 / 60, GRAVITY = 980, DAMPING = 0.986, ITERATIONS = 4, COLUMNS = 46, MIN_CELL = 16, GATHER = 0.8, PLEAT_PERIOD = 4;
const HAND_RADIUS = 120, HAND_PUSH = 7, HAND_DRAG = 2.4, BEND = 0.35, FOCAL = 1400, REST = 0.02;

function createCloth(width, height, pleat) {
  const rest = Math.max(MIN_CELL, (width * 1.16) / COLUMNS / GATHER), spacing = rest * GATHER;
  const cols = Math.ceil((width * 1.16) / spacing) + 1, rows = Math.ceil((height * 1.12) / rest) + 1;
  const left = (width - (cols - 1) * spacing) / 2, top = -rest * 0.5, count = cols * rows;
  const pos = new Float32Array(count * 3), pinned = new Uint8Array(count), pins = new Float32Array(cols * 3);
  const folds = Array.from({ length: cols }, (_, i) => {
    let phase = 0;
    for (let c = 0; c < i; c++) phase += ((Math.PI * 2) / PLEAT_PERIOD) * (1 + 0.3 * Math.sin(c * 0.9));
    return pleat * Math.sin(phase) * (0.8 + 0.2 * Math.cos(i * 0.37));
  });
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = (j * cols + i) * 3, z = folds[i];
    pos[k] = left + i * spacing; pos[k + 1] = top + j * rest; pos[k + 2] = z;
    if (j === 0) { pinned[i] = 1; pins.set([pos[k], pos[k + 1], z], i * 3); }
  }
  const links = [], lengths = [], stiffness = [];
  const link = (a, b, len, st) => { links.push(a, b); lengths.push(len); stiffness.push(st); };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * cols + i;
    if (i + 1 < cols && j > 0) link(a, a + 1, rest, 1);
    if (j + 1 < rows) link(a, a + cols, rest, 1);
    if (i + 2 < cols && j > 0) link(a, a + 2, rest * 2, BEND);
    if (j + 2 < rows) link(a, a + cols * 2, rest * 2, BEND);
  }
  return { cols, rows, rest, pos, prev: pos.slice(), pinned, pins, links: Uint32Array.from(links), lengths: Float32Array.from(lengths), stiffness: Float32Array.from(stiffness) };
}

const accel = [0, 0, 0];
function accelerate(x, y, f) {
  const { time, wind, hand } = f;
  accel[0] = 0; accel[1] = GRAVITY; accel[2] = 0;
  if (wind > 0) {
    const gust = Math.sin(x * 0.006 + time * 0.9) * 0.6 + Math.sin(x * 0.013 - time * 1.7 + y * 0.004) * 0.4;
    const swell = 0.6 + 0.4 * Math.sin(time * 0.35);
    accel[2] += gust * swell * wind * 260 * (y / 600);
    accel[0] += Math.sin(time * 0.5 + y * 0.003) * wind * 30;
  }
  if (hand.on) {
    const dx = x - hand.x, dy = y - hand.y, d2 = dx * dx + dy * dy;
    if (d2 < HAND_RADIUS * HAND_RADIUS) {
      const fall = 1 - Math.sqrt(d2) / HAND_RADIUS, k = fall * fall;
      accel[2] += k * HAND_PUSH * 1000; accel[0] += k * hand.vx * HAND_DRAG * 60; accel[1] += k * hand.vy * HAND_DRAG * 60;
    }
  }
  return accel;
}

function integrate(cloth, f) {
  const { pos, prev, pinned } = cloth, dt2 = STEP * STEP; let motion = 0;
  for (let n = 0; n < pinned.length; n++) {
    if (pinned[n]) continue;
    const k = n * 3, x = pos[k], y = pos[k + 1], z = pos[k + 2];
    const [ax, ay, az] = accelerate(x, y, f);
    const vx = (x - prev[k]) * DAMPING, vy = (y - prev[k + 1]) * DAMPING, vz = (z - prev[k + 2]) * DAMPING;
    prev[k] = x; prev[k + 1] = y; prev[k + 2] = z;
    pos[k] = x + vx + ax * dt2; pos[k + 1] = y + vy + ay * dt2; pos[k + 2] = z + vz + az * dt2;
    motion += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
  }
  return motion / pinned.length;
}

function relax(cloth, grab) {
  const { pos, pinned, links, lengths, stiffness, pins } = cloth;
  for (let it = 0; it < ITERATIONS; it++) {
    for (let l = 0; l < lengths.length; l++) {
      const a = links[l * 2], b = links[l * 2 + 1], ka = a * 3, kb = b * 3;
      const dx = pos[kb] - pos[ka], dy = pos[kb + 1] - pos[ka + 1], dz = pos[kb + 2] - pos[ka + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, diff = (d - lengths[l]) / d;
      if (stiffness[l] < 1 && diff > 0) continue;
      const wa = 1 - pinned[a], wb = 1 - pinned[b], s = (diff * stiffness[l]) / (wa + wb);
      pos[ka] += dx * s * wa; pos[ka + 1] += dy * s * wa; pos[ka + 2] += dz * s * wa;
      pos[kb] -= dx * s * wb; pos[kb + 1] -= dy * s * wb; pos[kb + 2] -= dz * s * wb;
    }
    if (grab) { const k = grab.index * 3; pos[k] = grab.x; pos[k + 1] = grab.y; }
    for (let i = 0; i < cloth.cols; i++) pos.set(pins.subarray(i * 3, i * 3 + 3), i * 3);
  }
}

function writeVertices(cloth, out) {
  const { cols, rows, pos } = cloth;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const n = j * cols + i;
    const l = (j * cols + Math.max(i - 1, 0)) * 3, r = (j * cols + Math.min(i + 1, cols - 1)) * 3;
    const u = (Math.max(j - 1, 0) * cols + i) * 3, d = (Math.min(j + 1, rows - 1) * cols + i) * 3;
    const ax = pos[r] - pos[l], ay = pos[r + 1] - pos[l + 1], az = pos[r + 2] - pos[l + 2];
    const bx = pos[d] - pos[u], by = pos[d + 1] - pos[u + 1], bz = pos[d + 2] - pos[u + 2];
    let nx = by * az - bz * ay, ny = bz * ax - bx * az, nz = bx * ay - by * ax;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= len; ny /= len; nz /= len;
    const o = n * 6;
    out[o] = pos[n * 3]; out[o + 1] = pos[n * 3 + 1]; out[o + 2] = pos[n * 3 + 2]; out[o + 3] = nx; out[o + 4] = ny; out[o + 5] = nz;
  }
}

const VERTEX = `attribute vec3 aPos;attribute vec3 aNormal;uniform vec2 uSize;uniform float uFocal;varying vec3 vNormal;
void main(){float s=uFocal/(uFocal+aPos.z);vec2 p=uSize*0.5+(aPos.xy-uSize*0.5)*s;
gl_Position=vec4(p.x/uSize.x*2.0-1.0,1.0-p.y/uSize.y*2.0,clamp(aPos.z/4000.0,-1.0,1.0),1.0);vNormal=aNormal;}`;
const FRAGMENT = `precision mediump float;uniform vec3 uLit;uniform vec3 uShade;varying vec3 vNormal;
void main(){vec3 n=normalize(vNormal);if(n.z>0.0)n=-n;vec3 light=normalize(vec3(-0.45,-0.55,-0.7));
float diffuse=max(dot(n,light),0.0);float wrap=diffuse*0.8+0.2;
float sheen=pow(max(dot(reflect(-light,n),vec3(0.0,0.0,-1.0)),0.0),18.0);
float t=clamp(wrap*wrap+sheen*0.15,0.0,1.0);gl_FragColor=vec4(mix(uShade,uLit,t),1.0);}`;

function compile(gl, type, src) { const s = gl.createShader(type); if (!s) return null; gl.shaderSource(s, src); gl.compileShader(s); return s; }

function createRenderer(gl) {
  const program = gl.createProgram(), vs = compile(gl, gl.VERTEX_SHADER, VERTEX), fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!(program && vs && fs)) return null;
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const vb = gl.createBuffer(), ib = gl.createBuffer(), aPos = gl.getAttribLocation(program, 'aPos'), aNormal = gl.getAttribLocation(program, 'aNormal');
  gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.enableVertexAttribArray(aPos); gl.enableVertexAttribArray(aNormal);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  return {
    uSize: gl.getUniformLocation(program, 'uSize'), uFocal: gl.getUniformLocation(program, 'uFocal'),
    uLit: gl.getUniformLocation(program, 'uLit'), uShade: gl.getUniformLocation(program, 'uShade'),
    setMesh(cols, rows) {
      const idx = new Uint16Array((cols - 1) * (rows - 1) * 6); let o = 0;
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i; idx.set([a, a + 1, a + cols, a + 1, a + cols + 1, a + cols], o); o += 6; }
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW); return idx.length;
    },
    destroy() { gl.deleteBuffer(vb); gl.deleteBuffer(ib); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); },
  };
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/**
 * Monta a cortina dentro de `root` (precisa ser position:relative). Os eventos do mouse são
 * ouvidos em `root`; cliques em links, botões e campos nunca agarram o tecido.
 * Devolve `destroy()`, ou null quando não há WebGL (o CSS de fundo continua valendo).
 */
export function drapeBg(root, { wind = 1, pleat = 34, interactive = true, lit = '#f6fbff', shade = '#86b3dc', instant = false } = {}) {
  const canvas = document.createElement('canvas'); canvas.className = 'drape-canvas';
  const gl = canvas.getContext('webgl', { antialias: true });
  const renderer = gl && createRenderer(gl);
  if (!renderer) return null;
  const layer = document.createElement('div'); layer.className = 'drape'; layer.setAttribute('aria-hidden', 'true'); layer.append(canvas); root.prepend(layer);

  const animate = motionEnabled() && !navigator.webdriver;
  const forces = { time: 0, wind: animate ? wind : 0, hand: { x: 0, y: 0, vx: 0, vy: 0, on: false }, grab: null };
  let width = 0, height = 0, cloth = null, vertices = new Float32Array(0), indexCount = 0, raf = 0, last = 0, carry = 0, quiet = 0, visible = true, dead = false;

  gl.uniform3fv(renderer.uLit, rgb(lit)); gl.uniform3fv(renderer.uShade, rgb(shade)); gl.clearColor(0, 0, 0, 0);

  const draw = () => {
    if (!cloth) return;
    writeVertices(cloth, vertices); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  };
  const build = () => {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    if (width < 2 || height < 2) return;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(renderer.uSize, width, height); gl.uniform1f(renderer.uFocal, FOCAL);
    cloth = createCloth(width, height, pleat);
    vertices = new Float32Array(cloth.cols * cloth.rows * 6); indexCount = renderer.setMesh(cloth.cols, cloth.rows);
    const settle = { ...forces, hand: { ...forces.hand, on: false } };
    for (let i = 0; i < 180; i++) { settle.time = forces.time + i * STEP; integrate(cloth, settle); relax(cloth, null); }
    draw();
  };
  const frame = (now) => {
    raf = 0;
    if (dead || !visible || !cloth) return;
    carry += last ? Math.min((now - last) / 1000, 0.1) : STEP; last = now;
    let moved = 0, steps = 0;
    while (carry >= STEP && steps < 3) { forces.time += STEP; moved = integrate(cloth, forces); relax(cloth, forces.grab); carry -= STEP; steps++; }
    carry = Math.min(carry, STEP);
    forces.hand.vx *= 0.8; forces.hand.vy *= 0.8;
    draw();
    quiet = moved < REST ? quiet + 1 : 0;
    if (forces.wind > 0 || forces.hand.on || forces.grab || quiet < 30) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && animate && !dead) { last = 0; quiet = 0; raf = requestAnimationFrame(frame); } };

  build();
  canvas.style.opacity = instant ? '1' : '0';
  if (!instant) requestAnimationFrame(() => { canvas.style.transition = 'opacity .9s ease-out'; canvas.style.opacity = '1'; });
  start();

  const ro = new ResizeObserver(() => { build(); start(); }); ro.observe(canvas);
  const onVis = () => { visible = document.visibilityState === 'visible'; start(); };
  document.addEventListener('visibilitychange', onVis);

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const nearest = (x, y) => {
    if (!cloth) return -1;
    let best = -1, bestD = 70 * 70;
    for (let n = cloth.cols; n < cloth.pinned.length; n++) {
      const k = n * 3, s = FOCAL / (FOCAL + cloth.pos[k + 2]);
      const px = width / 2 + (cloth.pos[k] - width / 2) * s, py = height / 2 + (cloth.pos[k + 1] - height / 2) * s;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  };
  const onMove = (e) => {
    const p = local(e), hand = forces.hand;
    if (forces.grab) { forces.grab.x = p.x; forces.grab.y = p.y; }
    else if (e.pointerType === 'mouse') { if (hand.on) { hand.vx = hand.vx * 0.5 + (p.x - hand.x) * 0.5; hand.vy = hand.vy * 0.5 + (p.y - hand.y) * 0.5; } hand.on = true; }
    hand.x = p.x; hand.y = p.y; start();
  };
  const onLeave = () => { forces.hand.on = false; };
  const onDown = (e) => {
    if (e.pointerType !== 'mouse' || e.target.closest('a,button,input,textarea,label,select')) return;
    const p = local(e), index = nearest(p.x, p.y);
    if (index < 0) return;
    e.preventDefault(); root.setPointerCapture(e.pointerId);
    forces.grab = { index, ...p }; forces.hand.on = false; root.dataset.grabbing = ''; start();
  };
  const onUp = () => { forces.grab = null; delete root.dataset.grabbing; };
  if (interactive && animate) {
    root.addEventListener('pointermove', onMove); root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp);
  }
  return () => {
    dead = true; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
    root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onUp);
    delete root.dataset.grabbing; renderer.destroy(); layer.remove();
  };
}
