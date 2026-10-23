// Shape Hero — porte em JS puro do componente "Shape Hero" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, clamp, disposer, PALETTE } from '../kit.js';

/* Mini motor de corpos rígidos para "pílulas" (cápsulas: um segmento com raio).
   Passos fixos de 120 Hz, impulsos sequenciais com atrito; a pilha dorme quando assenta e o hero parado não gasta CPU. */
const STEP = 1 / 120, GRAVITY = 2600, ITERATIONS = 16, FRICTION = 0.5, RESTITUTION = 0.22, BOUNCE_THRESHOLD = 140;
const SLOP = 0.4, CORRECTION = 0.3, MAX_SPEED = 3200, MAX_SPIN = 18, SLEEP_SPEED = 9, SLEEP_STEPS = 40, REST_SPEED = 30, DRAG_REACH = 0.28;

const ends = (b) => {
  if (b.half === 0) return [[b.x, b.y]];
  const c = Math.cos(b.a) * b.half, s = Math.sin(b.a) * b.half;
  return [[b.x - c, b.y - s], [b.x + c, b.y + s]];
};
const closest = (p, seg) => {
  const [a, b = a] = seg; const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len, 0, 1);
  return [a[0] + dx * t, a[1] + dy * t];
};
const contact = (a, b, nx, ny, px, py, depth) => ({
  a, b, nx, ny, rax: px - a.x, ray: py - a.y, rbx: b ? px - b.x : 0, rby: b ? py - b.y : 0,
  depth, correct: true, target: 0, kn: 0, kt: 0, jn: 0, jt: 0,
});

/** Contatos entre duas pílulas: cada ponta de uma contra a espinha da outra. */
function collidePair(a, b, out) {
  const reach = a.r + b.r, spineA = ends(a), spineB = ends(b), found = [];
  const test = (p, q, fromB) => {
    const dx = fromB ? q[0] - p[0] : p[0] - q[0], dy = fromB ? q[1] - p[1] : p[1] - q[1];
    const dist = Math.hypot(dx, dy);
    if (dist >= reach + 0.5) return;
    const nx = dist > 1e-6 ? dx / dist : 0, ny = dist > 1e-6 ? dy / dist : -1;
    const [ax, ay] = fromB ? q : p; // ponto de contato a meio caminho entre as superfícies
    found.push(contact(a, b, nx, ny, ax - nx * (a.r - (reach - dist) / 2), ay - ny * (a.r - (reach - dist) / 2), reach - dist));
  };
  for (const p of spineA) test(p, closest(p, spineB), false);
  for (const p of spineB) test(p, closest(p, spineA), true);
  if (!found.length) { const p = closest([b.x, b.y], spineA); test(p, closest(p, spineB), false); } // espinhas que se cruzam no meio
  let deepest = null; // só o contato mais fundo afasta o par, para não exagerar a correção
  for (const c of found) { c.correct = false; if (!deepest || c.depth > deepest.depth) deepest = c; out.push(c); }
  if (deepest) deepest.correct = true;
}
function collideWalls(body, width, height, out) {
  let deepest = null;
  const add = (c) => { c.correct = false; if (!deepest || c.depth > deepest.depth) deepest = c; out.push(c); };
  for (const [x, y] of ends(body)) {
    if (y + body.r - height > -0.5) add(contact(body, null, 0, -1, x, height, y + body.r - height));
    if (body.r - x > -0.5) add(contact(body, null, 1, 0, 0, y, body.r - x));
    if (x + body.r - width > -0.5) add(contact(body, null, -1, 0, width, y, x + body.r - width));
  }
  if (deepest) deepest.correct = true;
}
function relVel(c) {
  const { a, b } = c; let vx = a.vx - a.w * c.ray, vy = a.vy + a.w * c.rax;
  if (b) { vx -= b.vx - b.w * c.rby; vy -= b.vy + b.w * c.rbx; }
  return [vx, vy];
}
function impulse(c, jx, jy) {
  const { a, b } = c;
  a.vx += jx * a.invMass; a.vy += jy * a.invMass; a.w += a.invInertia * (c.rax * jy - c.ray * jx);
  if (b) { b.vx -= jx * b.invMass; b.vy -= jy * b.invMass; b.w -= b.invInertia * (c.rbx * jy - c.rby * jx); }
}
function effMass(c, nx, ny) {
  const { a, b } = c; const ra = c.rax * ny - c.ray * nx; let k = a.invMass + a.invInertia * ra * ra;
  if (b) { const rb = c.rbx * ny - c.rby * nx; k += b.invMass + b.invInertia * rb * rb; }
  return k;
}
function prepare(c) {
  c.kn = effMass(c, c.nx, c.ny); c.kt = effMass(c, -c.ny, c.nx);
  const [vx, vy] = relVel(c), vn = vx * c.nx + vy * c.ny;
  c.target = c.depth < 0 ? c.depth / STEP : (vn < -BOUNCE_THRESHOLD ? -RESTITUTION * vn : 0); // sem tocar ainda: só fecha a folga deste passo
}
function solve(c) {
  let [vx, vy] = relVel(c); const vn = vx * c.nx + vy * c.ny;
  const jn = Math.max(c.jn + (c.target - vn) / c.kn, 0), dn = jn - c.jn; c.jn = jn; impulse(c, c.nx * dn, c.ny * dn);
  [vx, vy] = relVel(c); const tx = -c.ny, ty = c.nx, limit = FRICTION * c.jn;
  const jt = clamp(c.jt - (vx * tx + vy * ty) / c.kt, -limit, limit), dt = jt - c.jt; c.jt = jt; impulse(c, tx * dt, ty * dt);
}
function correct(c) {
  if (!c.correct || c.depth <= SLOP) return;
  const { a, b } = c; const push = ((c.depth - SLOP) * CORRECTION) / (a.invMass + (b ? b.invMass : 0));
  a.x += c.nx * push * a.invMass; a.y += c.ny * push * a.invMass;
  if (b) { b.x -= c.nx * push * b.invMass; b.y -= c.ny * push * b.invMass; }
}
/** Puxa o ponto agarrado em direção ao ponteiro, passando pela massa do corpo. */
function applyDrag(d) {
  const { body } = d, cos = Math.cos(body.a), sin = Math.sin(body.a);
  const rx = d.lx * cos - d.ly * sin, ry = d.lx * sin + d.ly * cos;
  const handle = contact(body, null, 0, 0, body.x + rx, body.y + ry, 0);
  const [vx] = relVel(handle);
  impulse(handle, (((d.tx - body.x - rx) / STEP) * DRAG_REACH - vx) / effMass(handle, 1, 0), 0);
  const [, vy] = relVel(handle);
  impulse(handle, 0, (((d.ty - body.y - ry) / STEP) * DRAG_REACH - vy) / effMass(handle, 0, 1));
  body.w *= 0.96; // pendura calmo no ponto agarrado em vez de girar
}
function clampSpeed(b) {
  const s = Math.hypot(b.vx, b.vy);
  if (s > MAX_SPEED) { b.vx *= MAX_SPEED / s; b.vy *= MAX_SPEED / s; }
  b.w = clamp(b.w, -MAX_SPIN, MAX_SPIN);
}
/** Avança um passo fixo. Devolve true quando tudo repousou. */
function step(world) {
  const { bodies, width, height, drag } = world;
  for (const b of bodies) { b.vy += GRAVITY * STEP; b.vx *= 0.999; b.w *= 0.995; }
  if (drag) applyDrag(drag);
  const contacts = [];
  for (let i = 0; i < bodies.length; i++) {
    collideWalls(bodies[i], width, height, contacts);
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j], near = a.half + a.r + b.half + b.r;
      if (Math.abs(a.x - b.x) < near && Math.abs(a.y - b.y) < near) collidePair(a, b, contacts);
    }
  }
  for (const c of contacts) prepare(c);
  for (let k = 0; k < ITERATIONS; k++) for (const c of contacts) solve(c);
  let fastest = 0;
  for (const b of bodies) {
    clampSpeed(b);
    if (b !== drag?.body && Math.hypot(b.vx, b.vy) + Math.abs(b.w) * b.r < REST_SPEED) { b.vx *= 0.8; b.vy *= 0.8; b.w *= 0.8; } // quase parado: amortece para a pilha não rastejar
    b.x += b.vx * STEP; b.y += b.vy * STEP; b.a += b.w * STEP;
    fastest = Math.max(fastest, Math.hypot(b.vx, b.vy) + Math.abs(b.w) * (b.half + b.r));
  }
  for (const c of contacts) correct(c);
  world.still = fastest < SLEEP_SPEED && !drag ? world.still + 1 : 0;
  return world.still > SLEEP_STEPS;
}
const render = (bodies) => {
  for (const b of bodies) b.el.style.transform = `translate3d(${(b.x - b.width / 2).toFixed(2)}px, ${(b.y - b.height / 2).toFixed(2)}px, 0) rotate(${b.a.toFixed(4)}rad)`;
};
/** Espalhamento determinístico: a queda é igual a cada visita. */
const scatter = (n) => (Math.sin(n * 12.9898) * 43758.5453) % 1;

function createBodies(elements, width, height, fill) {
  const bodies = []; let area = 0;
  elements.forEach((el, index) => {
    const w = el.offsetWidth, hh = el.offsetHeight;
    if (area + w * hh > width * height * fill) { el.style.visibility = 'hidden'; return; }
    area += w * hh;
    const mass = (w * hh) / 1000;
    bodies.push({
      x: width * (0.2 + 0.6 * Math.abs(scatter(index + 1))), y: -hh - index * 64, a: scatter(index + 7) * 0.9,
      vx: scatter(index + 3) * 120, vy: 0, w: scatter(index + 5) * 2, half: Math.max(w - hh, 0) / 2, r: Math.min(w, hh) / 2,
      invMass: 1 / mass, invInertia: 12 / (mass * (w * w + hh * hh)), width: w, height: hh, el,
    });
    el.style.visibility = 'visible';
  });
  return bodies;
}
function hitTest(bodies, x, y) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i], [qx, qy] = closest([x, y], ends(b));
    if (Math.hypot(x - qx, y - qy) <= b.r) return b;
  }
  return null;
}

// Peças do demo: vocabulário de uma agência de crescimento. 'o' = bolinha sem texto.
const SHAPES = [
  ['Leads', 'solid'], ['Funil de vendas', 'line'], ['', 'accent', 2.2], ['Tráfego pago', 'line'], ['Conversão', 'accent'],
  ['CRM', 'line'], ['', 'solid', 1.6], ['Campanhas', 'line'], ['Automação', 'solid'], ['', 'line', 2.6], ['Retenção', 'line'],
  ['Clientes', 'line'], ['Receita', 'solid'], ['', 'line', 1.9], ['Remarketing', 'line'], ['Landing pages', 'line'],
  ['Pós-venda', 'solid'], ['', 'accent', 1.6], ['Relatórios', 'line'], ['Atendimento', 'line'], ['', 'solid', 2.2], ['Indicadores', 'line'],
];

const CSS = `
.kk-shape-hero-root{position:absolute;inset:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;overflow:hidden;
  padding:clamp(14px,6cqw,48px) 16px 14px;box-sizing:border-box;color:var(--ink,${PALETTE.ink});background:linear-gradient(160deg,#fff,${PALETTE.ice100})}
.kk-shape-hero-layer{position:absolute;inset:0;touch-action:pan-y}
.kk-shape-hero-layer[data-dragging]{cursor:grabbing}
.kk-shape-hero-shape{position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;border-radius:999px;
  cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform;visibility:hidden;font-weight:600;letter-spacing:-.01em;
  height:var(--kk-ph,34px);padding:0 calc(var(--kk-ph,34px)*.5);font-size:max(11px,calc(var(--kk-ph,34px)*.38))}
.kk-shape-hero-shape.dot{padding:0;width:calc(var(--kk-ph,34px)*var(--k,1))!important;height:calc(var(--kk-ph,34px)*var(--k,1))!important}
.kk-shape-hero-shape.line{background:#fff;border:1px solid ${PALETTE.ice300};color:${PALETTE.ice800}}
.kk-shape-hero-shape.solid{background:${PALETTE.ice800};color:#fff}
.kk-shape-hero-shape.accent{background:${PALETTE.ice500};color:#fff}
.kk-shape-hero-text{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;max-width:30em;pointer-events:none}
.kk-shape-hero-text h3{margin:0;font-size:clamp(20px,6.4cqw,44px);line-height:1.05;letter-spacing:-.03em;text-wrap:balance;font-weight:700}
.kk-shape-hero-text p{margin:10px 0 0;max-width:24em;font-size:clamp(12px,3.2cqw,16px);line-height:1.45;color:var(--mut,${PALETTE.mut});text-wrap:pretty}
.kk-shape-hero-actions{pointer-events:auto;margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.kk-shape-hero-btn{min-height:38px;padding:0 16px;border-radius:999px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;border:1px solid ${PALETTE.ice300};background:#fff;color:${PALETTE.ice800};transition:background .15s,transform .15s}
.kk-shape-hero-btn:hover{background:${PALETTE.ice50}}.kk-shape-hero-btn:active{transform:scale(.97)}
.kk-shape-hero-btn.main{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}.kk-shape-hero-btn.main:hover{background:${PALETTE.ice800}}
.kk-shape-hero-btn:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('shape-hero', CSS);
  const off = disposer();
  const reduceMotion = reduced();
  const fill = 0.26;

  const layer = h('div', { class: 'kk-shape-hero-layer', 'aria-hidden': 'true' });
  const elements = SHAPES.map(([label, tone, k]) => h('div', { class: `kk-shape-hero-shape ${tone}${label ? '' : ' dot'}`, style: k ? `--k:${k}` : '' }, label));
  layer.append(...elements);

  const world = { bodies: [], width: 0, height: 0, drag: null, still: 0 };
  let raf = 0, last = 0, carry = 0, started = false, visible = false, dead = false;

  const frame = (now) => {
    raf = 0;
    carry += Math.min((now - last) / 1000, 0.05); last = now;
    let asleep = false;
    while (carry >= STEP) { asleep = step(world); carry -= STEP; }
    render(world.bodies);
    if (!asleep && visible) raf = requestAnimationFrame(frame);
  };
  const wake = () => { world.still = 0; if (!raf && started && visible && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  // Escala as peças ao tamanho do palco (o original é uma página inteira; aqui o palco tem ~340 px).
  const scaleShapes = () => { root.style.setProperty('--kk-ph', clamp(Math.round(world.width / 17), 26, 48) + 'px'); };

  // Solta (ou solta de novo) todas as peças do alto.
  const drop = () => {
    world.drag = null; carry = 0;
    world.width = layer.clientWidth; world.height = layer.clientHeight;
    scaleShapes();
    world.bodies = createBodies(elements, world.width, world.height, fill);
    started = true;
    if (reduceMotion) { // sem movimento: assenta a pilha de uma vez e mostra em repouso
      let n = 0; while (n < 2400 && !step(world)) n++;
      render(world.bodies); return;
    }
    render(world.bodies); wake();
  };
  // Sacudir: lança todas as peças para cima, com giro, para a pilha se refazer.
  const shake = () => {
    for (const b of world.bodies) { b.vy -= 900 + Math.abs(scatter(b.x)) * 700; b.vx += (Math.random() - 0.5) * 700; b.w += (Math.random() - 0.5) * 8; }
    wake();
  };

  const again = h('button', { type: 'button', class: 'kk-shape-hero-btn main', onclick: drop }, 'Soltar de novo');
  const shaker = h('button', { type: 'button', class: 'kk-shape-hero-btn', onclick: reduceMotion ? drop : shake }, 'Sacudir');
  const root = h('section', { class: 'kk-shape-hero-root', 'aria-label': 'Hero com formas que caem e podem ser arremessadas' },
    layer,
    h('div', { class: 'kk-shape-hero-text' },
      h('h3', {}, 'Crescimento com um pouco de gravidade'),
      h('p', {}, 'As peças do seu funil caem e se empilham. Agarre uma e arremesse.'),
      h('div', { class: 'kk-shape-hero-actions' }, again, shaker)));
  stage.append(root);

  const begin = () => { if (started || dead) return; drop(); };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (visible) { (document.fonts?.ready ?? Promise.resolve()).then(begin); wake(); }
  }, { threshold: 0.3 });
  io.observe(root); off(() => io.disconnect());
  const onVis = () => { visible = !document.hidden; wake(); };
  document.addEventListener('visibilitychange', onVis); off(() => document.removeEventListener('visibilitychange', onVis));
  const ro = new ResizeObserver(() => { world.width = layer.clientWidth; world.height = layer.clientHeight; wake(); });
  ro.observe(layer); off(() => ro.disconnect());

  const local = (e) => { const r = layer.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onDown = (e) => {
    if (!started || world.drag || e.button !== 0) return;
    const [x, y] = local(e), body = hitTest(world.bodies, x, y);
    if (!body) return;
    e.preventDefault();
    const dx = x - body.x, dy = y - body.y, cos = Math.cos(-body.a), sin = Math.sin(-body.a);
    world.drag = { body, lx: dx * cos - dy * sin, ly: dx * sin + dy * cos, tx: x, ty: y, id: e.pointerId };
    layer.setPointerCapture(e.pointerId); layer.dataset.dragging = ''; wake();
  };
  const onMove = (e) => { if (world.drag?.id === e.pointerId) { [world.drag.tx, world.drag.ty] = local(e); wake(); } };
  const onUp = (e) => { if (world.drag?.id === e.pointerId) { world.drag = null; delete layer.dataset.dragging; wake(); } };
  layer.addEventListener('pointerdown', onDown); layer.addEventListener('pointermove', onMove);
  layer.addEventListener('pointerup', onUp); layer.addEventListener('pointercancel', onUp);

  return () => {
    dead = true; cancelAnimationFrame(raf); off.run();
    layer.removeEventListener('pointerdown', onDown); layer.removeEventListener('pointermove', onMove);
    layer.removeEventListener('pointerup', onUp); layer.removeEventListener('pointercancel', onUp);
    root.remove();
  };
}
