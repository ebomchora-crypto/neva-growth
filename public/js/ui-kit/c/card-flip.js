// Flick Card — porte em JS puro do componente "Flick Card" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, reduced, PALETTE } from '../kit.js';

const DEG_PER_PX = 0.6;      // graus de giro por px arrastado
const STIFFNESS = 170, DAMPING = 20; // mola que pousa o cartão numa face
const PROJECTION = 0.22;     // quanto da velocidade de soltura "olha à frente" ao escolher a face
const FLICK_SPEED = 450;     // soltura mais rápida que isso sempre vira pelo menos uma face
const MAX_HALF_TURNS = 6;
const DRAG_SLOP = 4;         // abaixo disso é clique, não arrasto
const LIFT = 36;             // quanto o cartão se aproxima do espectador a 90°
const TILT = 6;              // inclinação de hover
const THICKNESS = 6, SLICES = 7;
const SUBSTEP = 1 / 240;
const VELOCITY_WINDOW = 80;
const INTERACTIVE = 'button, a, input, select, textarea, [data-no-flip]';

const mod2 = (n) => ((n % 2) + 2) % 2;
const sideOf = (a) => mod2(Math.round(a / 180)) === 1;
const nearestFace = (a) => Math.round(a / 180) * 180;

// Código "QR" determinístico: três marcadores de canto e módulos pseudoaleatórios fixos.
function qrPath(size, seed) {
  let st = seed;
  const rnd = () => { st = (st * 16807) % 2147483647; return st / 2147483647; };
  const far = size - 7;
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= far - 1 && y < 8) || (x < 8 && y >= far - 1);
  const finderCell = (x, y) => {
    const fx = x >= far ? x - far : x, fy = y >= far ? y - far : y;
    if (fx > 6 || fy > 6 || fx < 0 || fy < 0) return false;
    return Math.max(Math.abs(fx - 3), Math.abs(fy - 3)) !== 2;
  };
  let d = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (inFinder(x, y) ? finderCell(x, y) : rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  }
  return d;
}

const TICKET = { evento: 'Workshop de Vendas', edicao: 'Turma 04', data: 'Sáb, 21 nov', hora: '09:30', local: 'Sala 2, Hub Neva', nome: 'Marina Duarte', num: '004182', portao: 'B', setor: 'Plateia', fila: 'F', lugar: '14' };

const CSS = `
.kk-card-flip-wrap{width:100%;min-height:340px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:18px 8px 26px}
.kk-card-flip-root{position:relative;aspect-ratio:7/10;width:min(240px,70%);user-select:none;-webkit-user-select:none;border-radius:16px;outline:none;perspective:1100px;touch-action:pan-y}
.kk-card-flip-root.x{touch-action:pan-x}
.kk-card-flip-root:focus-visible{box-shadow:0 0 0 3px var(--ice-500,#4a95d2);outline-offset:4px}
.kk-card-flip-shadow{position:absolute;left:8%;right:8%;bottom:-26px;height:22px;border-radius:50%;background:rgba(15,53,96,.28);filter:blur(9px);pointer-events:none}
.kk-card-flip-tilt{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.23,1,.32,1)}
.kk-card-flip-card{position:relative;width:100%;height:100%;border-radius:16px;transform-style:preserve-3d;cursor:grab}
.kk-card-flip-root.drag .kk-card-flip-card{cursor:grabbing}
.kk-card-flip-slice{position:absolute;inset:0;border-radius:16px;background:#a5cdee}
.kk-card-flip-face{position:absolute;inset:0;overflow:hidden;border-radius:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fff;border:1px solid var(--line,#d3e6f6);color:var(--ink,#0e2236)}
.kk-card-flip-in{display:flex;flex-direction:column;height:100%;padding:18px}
.kk-card-flip-row{display:flex;align-items:center;justify-content:space-between}
.kk-card-flip-kick{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mut,#4a6f93)}
.kk-card-flip-tag{background:var(--ice-600,#2f7bbd);color:#fff;font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px}
.kk-card-flip-ed{margin:22px 0 0;font-size:12px;font-weight:600;color:var(--ice-600,#2f7bbd)}
.kk-card-flip-h{margin:4px 0 0;font-size:24px;line-height:1.08;font-weight:700;letter-spacing:-.02em}
.kk-card-flip-dl{margin:auto 0 0;display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
.kk-card-flip-dl.four{grid-template-columns:repeat(4,1fr);text-align:center}
.kk-card-flip-dl div.wide{grid-column:span 2}
.kk-card-flip-dl dt{font-size:11px;color:var(--mut,#4a6f93)}
.kk-card-flip-dl dd{margin:0;font-size:13.5px;font-weight:600}
.kk-card-flip-cut{margin:14px -18px;border-top:1px dashed var(--ice-300,#a5cdee)}
.kk-card-flip-hold small{display:block;font-size:11px;color:var(--mut,#4a6f93)}
.kk-card-flip-hold b{font-size:13.5px}
.kk-card-flip-mono{font-family:ui-monospace,monospace;font-size:12px;color:var(--mut,#4a6f93)}
.kk-card-flip-qr{width:62%;margin:14px auto 0;background:#fff;border-radius:10px;padding:9px;box-shadow:0 0 0 1px var(--line,#d3e6f6)}
.kk-card-flip-qr svg{display:block;width:100%;height:auto}
.kk-card-flip-note{margin:12px 0 0;border-top:1px solid var(--line,#d3e6f6);padding-top:9px;font-size:11px;line-height:1.35;color:var(--mut,#4a6f93)}
.kk-card-flip-lights{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden}
.kk-card-flip-shade{position:absolute;inset:0;background:#0f3560;opacity:0}
.kk-card-flip-band{height:220%;width:33%;flex:none;background:#fff;opacity:0}
.kk-card-flip-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.kk-card-flip-bar button{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px inherit;cursor:pointer}
.kk-card-flip-bar button:hover{background:var(--ice-100,#e3f0fb)}
.kk-card-flip-bar button:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-card-flip-bar button[aria-pressed=true]{background:var(--ice-600,#2f7bbd);border-color:var(--ice-600,#2f7bbd);color:#fff}
.kk-card-flip-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

export default function mount(stage, ctx) {
  ensureStyle('card-flip', CSS);
  const motionOff = reduced();
  let axis = 'y', flippedState = false, backVisible = false;
  const s = { angle: 0, velocity: 0, target: 0, raf: 0, last: 0, pointerId: null, startX: 0, startY: 0, startAngle: 0, dragging: false, samples: [] };

  const field = (l, v, wide) => h('div', { class: wide ? 'wide' : '' }, h('dt', l), h('dd', v));
  const band = () => h('div', { class: 'kk-card-flip-band' });
  const shade = () => h('div', { class: 'kk-card-flip-shade' });
  const lights = (b, sh) => h('div', { class: 'kk-card-flip-lights', 'aria-hidden': 'true' }, sh, b);

  const fb = band(), fs = shade(), bb = band(), bs = shade();
  const front = h('div', { class: 'kk-card-flip-face' },
    h('div', { class: 'kk-card-flip-in' },
      h('div', { class: 'kk-card-flip-row' }, h('span', { class: 'kk-card-flip-kick' }, 'Ingresso'), h('span', { class: 'kk-card-flip-tag' }, 'VIP')),
      h('p', { class: 'kk-card-flip-ed' }, TICKET.edicao), h('h3', { class: 'kk-card-flip-h' }, TICKET.evento),
      h('dl', { class: 'kk-card-flip-dl' }, field('Data', TICKET.data), field('Abertura', TICKET.hora), field('Local', TICKET.local, true)),
      h('div', { class: 'kk-card-flip-cut' }),
      h('div', { class: 'kk-card-flip-row' },
        h('div', { class: 'kk-card-flip-hold' }, h('small', 'Participante'), h('b', TICKET.nome)),
        h('span', { class: 'kk-card-flip-mono' }, 'Nº ' + TICKET.num))),
    lights(fb, fs));

  const SZ = 21;
  const qr = svg('svg', { viewBox: `0 0 ${SZ} ${SZ}`, role: 'img', 'aria-label': 'Código de entrada ' + TICKET.num, 'shape-rendering': 'crispEdges' }, svg('path', { d: qrPath(SZ, 4182), fill: PALETTE.ink }));
  const back = h('div', { class: 'kk-card-flip-face', style: `transform:rotate${axis.toUpperCase()}(180deg) translateZ(${THICKNESS / 2}px)` },
    h('div', { class: 'kk-card-flip-in' },
      h('div', { class: 'kk-card-flip-row' }, h('span', { class: 'kk-card-flip-kick' }, 'Apresente na entrada'), h('span', { class: 'kk-card-flip-mono' }, '#' + TICKET.num)),
      h('div', { class: 'kk-card-flip-qr' }, qr),
      h('dl', { class: 'kk-card-flip-dl four' }, field('Portão', TICKET.portao), field('Setor', TICKET.setor), field('Fila', TICKET.fila), field('Lugar', TICKET.lugar)),
      h('p', { class: 'kk-card-flip-note' }, 'Válido para uma entrada. Para voltar ao evento, use a pulseira.')),
    lights(bb, bs));

  const slices = Array.from({ length: SLICES }, (_, i) => {
    const z = -THICKNESS / 2 + (THICKNESS * (i + 0.5)) / SLICES;
    return h('div', { class: 'kk-card-flip-slice', 'aria-hidden': 'true', style: `transform:translateZ(${z.toFixed(3)}px)` });
  });
  front.style.transform = `translateZ(${THICKNESS / 2}px)`;
  const card = h('div', { class: 'kk-card-flip-card' }, slices, front, back);
  const tilt = h('div', { class: 'kk-card-flip-tilt' }, card);
  const shadow = h('div', { class: 'kk-card-flip-shadow', 'aria-hidden': 'true' });
  const hint = h('span', { class: 'kk-card-flip-sr', id: 'kk-card-flip-hint' });
  const root = h('div', { class: 'kk-card-flip-root', role: 'group', tabindex: '0', 'aria-roledescription': 'cartão virável', 'aria-label': 'Ingresso do Workshop de Vendas', 'aria-describedby': 'kk-card-flip-hint' }, shadow, tilt, hint);

  const status = h('span', { class: 'kk-card-flip-sr', 'aria-live': 'polite' });
  const bFlip = h('button', { type: 'button', onclick: () => flipBy(1) }, 'Virar cartão');
  const bAxis = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => setAxis(axis === 'y' ? 'x' : 'y') }, 'Girar na vertical');
  const wrap = h('div', { class: 'kk-card-flip-wrap' }, root, h('div', { class: 'kk-card-flip-bar' }, bFlip, bAxis), status);
  stage.append(wrap);

  const setHint = () => { hint.textContent = `Mostrando o ${flippedState ? 'verso' : 'frente'}. Pressione Enter ou Espaço, ou arraste, para virar.`.replace('o frente', 'a frente'); };
  setHint();

  function render() {
    const rad = (s.angle * Math.PI) / 180, sin = Math.sin(rad), turn = Math.abs(sin), facing = Math.abs(Math.cos(rad));
    card.style.transform = `translateZ(${(turn * LIFT).toFixed(2)}px) rotate${axis === 'y' ? 'Y' : 'X'}(${s.angle.toFixed(2)}deg)`;
    const narrow = (0.16 + 0.84 * facing).toFixed(3), soft = (1 - turn * 0.12).toFixed(3);
    shadow.style.transform = axis === 'y' ? `scale(${narrow},${soft})` : `scale(${soft},${narrow})`;
    shadow.style.opacity = (1 - turn * 0.45).toFixed(3);
    // Faixa de luz varre a face visível; a face escurece ao se afastar da luz.
    const shift = `${(sin * 140).toFixed(1)}%`;
    const tr = axis === 'y' ? `translateX(${shift}) rotate(18deg)` : `translateY(${shift}) rotate(72deg)`;
    for (const b of [fb, bb]) { b.style.opacity = (turn * 0.12).toFixed(3); b.style.transform = tr; }
    for (const sh of [fs, bs]) sh.style.opacity = (turn * 0.14).toFixed(3);
    const showsBack = sideOf(s.angle);
    if (showsBack !== backVisible) {
      backVisible = showsBack;
      front.inert = backVisible; back.inert = !backVisible;
      front.setAttribute('aria-hidden', backVisible ? 'true' : 'false'); back.setAttribute('aria-hidden', backVisible ? 'false' : 'true');
    }
  }

  function step(now) {
    const dt = Math.min(0.05, (now - s.last) / 1000); s.last = now;
    const n = Math.max(1, Math.ceil(dt / SUBSTEP)), hh = dt / n;
    for (let i = 0; i < n; i++) { s.velocity += (-STIFFNESS * (s.angle - s.target) - DAMPING * s.velocity) * hh; s.angle += s.velocity * hh; }
    if (Math.abs(s.angle - s.target) < 0.05 && Math.abs(s.velocity) < 0.5) {
      // Assentou: fixa em 0 ou 180 para os números não crescerem.
      s.target = sideOf(s.target) ? 180 : 0; s.angle = s.target; s.velocity = 0; s.raf = 0; render(); return;
    }
    render(); s.raf = requestAnimationFrame(step);
  }
  function settle() {
    if (motionOff) { cancelAnimationFrame(s.raf); s.raf = 0; s.target = sideOf(s.target) ? 180 : 0; s.angle = s.target; s.velocity = 0; render(); return; }
    if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(step); }
  }
  function aim(target) {
    s.target = target;
    const next = sideOf(target);
    if (next !== flippedState) { flippedState = next; setHint(); status.textContent = next ? 'Verso do ingresso' : 'Frente do ingresso'; }
    settle();
  }
  const flipBy = (dir) => aim(nearestFace(s.target) + 180 * dir);
  function setAxis(a) {
    axis = a; root.classList.toggle('x', a === 'x'); bAxis.setAttribute('aria-pressed', String(a === 'x'));
    bAxis.textContent = a === 'x' ? 'Girar na horizontal' : 'Girar na vertical';
    back.style.transform = `rotate${a === 'y' ? 'Y' : 'X'}(180deg) translateZ(${THICKNESS / 2}px)`;
    render();
  }

  const setTilt = (x, y) => { tilt.style.transform = `rotateX(${(-y * TILT).toFixed(2)}deg) rotateY(${(x * TILT).toFixed(2)}deg)`; };
  const releaseVel = (now) => {
    const last = s.samples.at(-1);
    if (!last || now - last.t > VELOCITY_WINDOW) return 0;
    const first = s.samples.find((p) => last.t - p.t <= VELOCITY_WINDOW);
    if (!first || last.t <= first.t) return 0;
    return ((last.a - first.a) / (last.t - first.t)) * 1000;
  };
  const onDown = (e) => {
    if (s.pointerId !== null || e.button !== 0 || e.target.closest(INTERACTIVE)) return;
    s.pointerId = e.pointerId; s.startX = e.clientX; s.startY = e.clientY; s.startAngle = s.angle; s.dragging = false;
    s.samples = [{ t: e.timeStamp, a: s.angle }];
    root.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (s.pointerId !== e.pointerId) {
      if (e.pointerType !== 'mouse') return;
      const r = root.getBoundingClientRect();
      setTilt(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      return;
    }
    const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
    if (!s.dragging) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      s.dragging = true; root.classList.add('drag'); cancelAnimationFrame(s.raf); s.raf = 0; s.velocity = 0; setTilt(0, 0);
    }
    s.angle = s.startAngle + (axis === 'y' ? dx : -dy) * DEG_PER_PX; // 1:1, o cartão fica sob o dedo
    s.samples.push({ t: e.timeStamp, a: s.angle }); if (s.samples.length > 8) s.samples.shift();
    render();
  };
  const release = (e, cancelled) => {
    if (s.pointerId !== e.pointerId) return;
    s.pointerId = null; root.classList.remove('drag');
    if (!s.dragging) {
      if (!cancelled) {
        const r = root.getBoundingClientRect();
        const pushed = axis === 'y' ? e.clientX > r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
        flipBy(pushed ? 1 : -1); // clique empurra a metade pressionada para longe
      }
      return;
    }
    s.dragging = false;
    const v = cancelled ? 0 : releaseVel(e.timeStamp);
    const from = nearestFace(s.startAngle);
    let t = nearestFace(s.angle + v * PROJECTION);
    if (Math.abs(v) > FLICK_SPEED && t === from) t = from + 180 * Math.sign(v);
    const lim = MAX_HALF_TURNS * 180;
    s.velocity = v; aim(Math.max(from - lim, Math.min(from + lim, t)));
  };
  const onKey = (e) => { if (e.target === root && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flipBy(1); } };
  const onLeave = () => { if (s.pointerId === null) setTilt(0, 0); };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', (e) => release(e, false));
  root.addEventListener('pointercancel', (e) => release(e, true));
  root.addEventListener('lostpointercapture', (e) => release(e, true));
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('keydown', onKey);
  render();
  back.inert = true; back.setAttribute('aria-hidden', 'true');

  return () => { cancelAnimationFrame(s.raf); s.raf = 0; wrap.remove(); };
}
