// Cradle Text — porte em JS puro do componente "Cradle Text" .
import { h, ensureStyle, reduced, disposer } from '../kit.js';

const TEXT = 'Impulso';
const BOUNCE = 0.97;                 // quanto da velocidade uma colisão preserva (aço ≈ 0,95)
// Cada letra pende do trilho por um fio, pêndulos do mesmo comprimento: como as bolas do pêndulo de Newton,
// letras que se tocam passam a batida adiante e a da ponta voa.
const SUBSTEPS = 8, ITERATIONS = 3;
const PERIOD = 0.72;                 // uma oscilação completa, qualquer que seja a fonte: brinquedo de mesa com fios de ~12 cm
const DRAG = 0.3, SETTLE_DRAG = 1.6, SETTLE_BELOW = 0.02; // a maior parte da energia vai nos estalos; o balanço final é amortecido mais forte
const MAX_ANGLE = 1.15;
const SWEEP_PUSH = 0.22, MAX_SWEEP = 900;
const TAP_ANGLE = 0.38;
const INTRO_ANGLE = 0.62, INTRO_PULL = 520;
const REST = 0.0004;

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const easeOut = (t) => 1 - (1 - t) ** 4;

export default function mount(stage, ctx) {
  ensureStyle('cradle-text', `
.kk-cradle-text{width:100%;display:flex;flex-direction:column;align-items:center;gap:12px;container-type:inline-size;color:var(--ink)}
.kk-cradle-text-stage{position:relative;max-width:100%;padding:1.5em .9em .45em;font-size:clamp(30px,12cqi,68px);font-weight:700;line-height:1;letter-spacing:-.02em;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.kk-cradle-text-stage[data-grabbing]{cursor:grabbing}
.kk-cradle-text-rail{position:absolute;left:0;right:0;top:.3em;height:2px;border-radius:2px;background:var(--ice-300);pointer-events:none}
.kk-cradle-text-letters{position:relative;display:block;white-space:pre}
.kk-cradle-text-letter{position:relative;display:inline-block;transform-origin:0 0;will-change:transform}
.kk-cradle-text-thread{position:absolute;width:1px;background:var(--ice-400)}
.kk-cradle-text-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-cradle-text-b{min-height:36px;padding:0 16px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.kk-cradle-text-b:hover{background:var(--ice-100)}
.kk-cradle-text-b:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-cradle-text-hint{margin:0;font-size:12px;color:var(--mut);text-align:center}
`);
  const dispose = disposer();
  const rm = reduced();
  const restitution = clamp(BOUNCE, 0, 1), w0 = (2 * Math.PI) / PERIOD;

  const letters = h('span', { class: 'kk-cradle-text-letters', 'aria-hidden': 'true' },
    Array.from(TEXT).map((c) => c === ' ' ? h('span', { style: 'display:inline-block;width:.32em' })
      : h('span', { class: 'kk-cradle-text-letter', 'data-letter': c }, h('span', { class: 'kk-cradle-text-thread' }), c)),
    h('span', { style: 'display:inline-block;height:0;width:0' }));
  const rail = h('span', { class: 'kk-cradle-text-rail', 'aria-hidden': 'true' });
  const box = h('div', { class: 'kk-cradle-text-stage' }, h('span', { class: 'kk-cradle-text-sr' }, TEXT), rail, letters);
  const release = h('button', { class: 'kk-cradle-text-b', type: 'button', onclick: () => { const f = bobs[0]; if (f && !hand) { pull = { bob: f, start: performance.now(), to: -INTRO_ANGLE }; start(); } } }, 'Soltar a primeira letra');
  const root = h('div', { class: 'kk-cradle-text' }, box, !rm && release, h('p', { class: 'kk-cradle-text-hint' }, rm ? 'Animação reduzida: as letras ficam paradas.' : 'Arraste, toque ou passe o mouse pelas letras.'));
  stage.append(root);

  const ink = document.createElement('canvas').getContext('2d');
  const spans = Array.from(letters.querySelectorAll('[data-letter]'));
  let bobs = [], railY = 0, radius = 1, raf = 0, last = 0, visible = true, pull = null, hand = null, sweep = null;

  function measure() {
    const sb = box.getBoundingClientRect(), probe = letters.lastElementChild;
    const baseline = probe.getBoundingClientRect().bottom - sb.top, style = getComputedStyle(letters), em = parseFloat(style.fontSize);
    ink.font = style.font;
    railY = rail.getBoundingClientRect().top - sb.top + 1;
    radius = Math.max(baseline - em * 0.35 - railY, 1);
    bobs = spans.map((el) => {
      el.style.transform = '';
      const b = el.getBoundingClientRect(), m = ink.measureText(el.dataset.letter);
      const boxLeft = b.left - sb.left, left = boxLeft - m.actualBoundingBoxLeft, right = boxLeft + m.actualBoundingBoxRight;
      const top = baseline - m.actualBoundingBoxAscent, center = (left + right) / 2;
      const th = el.firstElementChild; // o fio vai do trilho ao topo da tinta
      th.style.left = `${center - boxLeft - 0.5}px`; th.style.top = `${railY - (b.top - sb.top)}px`; th.style.height = `${Math.max(top - railY, 0)}px`;
      return { el, left, right, center, top, bottom: baseline + m.actualBoundingBoxDescent, boxLeft, boxTop: b.top - sb.top, gap: 0, phi: 0, omega: 0, held: false };
    });
    for (let i = 0; i + 1 < bobs.length; i++) bobs[i].gap = Math.max(bobs[i + 1].left - bobs[i].right, 0); // folga até a próxima letra; colidem quando fecha
    pull = null; hand = null;
  }
  function draw() {
    for (const b of bobs) {
      if (b.phi === 0) { b.el.style.transform = ''; continue; }
      const px = b.center - b.boxLeft, py = railY - b.boxTop;
      // Balançar para a direita gira a letra no sentido anti-horário em torno do trilho.
      b.el.style.transform = `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) rotate(${(-b.phi).toFixed(4)}rad) translate3d(${(-px).toFixed(2)}px,${(-py).toFixed(2)}px,0)`;
    }
  }
  const energy = () => bobs.reduce((e, b) => e + (b.omega / w0) ** 2 + 2 * (1 - Math.cos(b.phi)), 0);
  /** Afasta duas letras que se tocam, se estiverem se aproximando. */
  function bounceApart(a, b, wa, wb) {
    const ca = Math.max(Math.cos(a.phi), 0.2), cb = Math.max(Math.cos(b.phi), 0.2);
    const va = a.omega * radius * ca, vb = b.omega * radius * cb, closing = va - vb;
    if (closing <= 0) return;
    const impulse = ((1 + restitution) * closing) / (wa + wb);
    a.omega = (va - wa * impulse) / (radius * ca); // letra segurada (peso 0) mantém a velocidade da mão
    b.omega = (vb + wb * impulse) / (radius * cb);
  }
  function collide(a, b) {
    const xa = radius * Math.sin(a.phi), xb = radius * Math.sin(b.phi), depth = xa - xb - a.gap;
    const wa = a.held ? 0 : 1, wb = b.held ? 0 : 1;
    if (depth <= 0 || wa + wb === 0) return;
    const share = depth / (wa + wb);
    a.phi = Math.asin(clamp((xa - wa * share) / radius, -1, 1)); b.phi = Math.asin(clamp((xb + wb * share) / radius, -1, 1));
    bounceApart(a, b, wa, wb);
  }
  function swing(k, drag) {
    for (const b of bobs) if (!b.held) { b.omega -= w0 * w0 * Math.sin(b.phi) * k; b.omega *= 1 - drag * k; b.phi += b.omega * k; }
  }
  function step(dt) {
    const k = dt / SUBSTEPS, drag = energy() < SETTLE_BELOW ? SETTLE_DRAG : DRAG;
    for (let s = 0; s < SUBSTEPS; s++) {
      swing(k, drag);
      // Varre nos dois sentidos para a batida cruzar a fileira num passo, como num pêndulo de verdade.
      for (let it = 0; it < ITERATIONS; it++) {
        for (let i = 0; i + 1 < bobs.length; i++) collide(bobs[i], bobs[i + 1]);
        for (let i = bobs.length - 2; i >= 0; i--) collide(bobs[i], bobs[i + 1]);
      }
    }
  }
  function runPull(now) {
    if (!pull) return;
    const t = (now - pull.start) / INTRO_PULL;
    if (t >= 1.25) { pull.bob.held = false; pull.bob.omega = 0; pull = null; return; }
    pull.bob.held = true; pull.bob.phi = pull.to * easeOut(Math.min(t, 1)); pull.bob.omega = 0;
  }
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    runPull(now); step(dt); draw();
    if (hand || pull || energy() > REST) { raf = requestAnimationFrame(frame); return; }
    for (const b of bobs) { b.phi = 0; b.omega = 0; }
    draw();
  }
  function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  const local = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const bobAt = (x, y, slack) => bobs.find((b) => { const sh = radius * Math.sin(b.phi); return x > b.left + sh - slack && x < b.right + sh + slack && y > b.top - slack && y < b.bottom + slack; });

  const onDown = (e) => {
    if (hand || e.button !== 0) return;
    const p = local(e), em = parseFloat(getComputedStyle(letters).fontSize), b = bobAt(p.x, p.y, em * 0.1);
    if (!b) return;
    box.setPointerCapture(e.pointerId); pull = null; b.held = true; b.omega = 0;
    hand = { id: e.pointerId, bob: b, startX: p.x - radius * Math.sin(b.phi), startTime: e.timeStamp, moved: false, prev: b.phi, prevTime: e.timeStamp, spin: 0 };
    box.dataset.grabbing = ''; start();
  };
  const onMove = (e) => {
    const p = local(e);
    if (hand && e.pointerId === hand.id) {
      const dx = p.x - hand.startX;
      if (Math.abs(dx) > 3) hand.moved = true;
      // A letra segue o dedo de lado ao longo do arco.
      const phi = Math.asin(clamp(dx / radius, -Math.sin(MAX_ANGLE), Math.sin(MAX_ANGLE)));
      const dt = Math.max(e.timeStamp - hand.prevTime, 8) / 1000;
      hand.spin = hand.spin * 0.4 + ((phi - hand.prev) / dt) * 0.6;
      hand.prev = phi; hand.prevTime = e.timeStamp; hand.bob.phi = phi;
      hand.bob.omega = hand.spin; // levada às vizinhas, a mão as empurra
      start(); return;
    }
    if (e.pointerType !== 'mouse') { sweep = null; return; }
    const over = bobAt(p.x, p.y, 0) ?? null;
    if (sweep && over && over !== sweep.over && !over.held) {
      // Roçar numa letra a empurra no sentido em que o cursor andou.
      const dt = Math.max(e.timeStamp - sweep.t, 8) / 1000;
      over.omega += (SWEEP_PUSH * clamp((p.x - sweep.x) / dt, -MAX_SWEEP, MAX_SWEEP)) / radius; pull = null; start();
    }
    sweep = { x: p.x, t: e.timeStamp, over };
  };
  const onUp = (e) => {
    if (!hand || e.pointerId !== hand.id) return;
    const { bob } = hand; bob.held = false; delete box.dataset.grabbing;
    if (hand.moved) {
      const idle = e.timeStamp - hand.prevTime > 60; // soltou parado se a mão parou antes
      bob.omega = idle ? 0 : clamp(hand.spin, -w0 * 1.5, w0 * 1.5);
    } else {
      const p = local(e); // um toque afasta a letra do lado tocado
      bob.omega += (p.x < bob.center + radius * Math.sin(bob.phi) ? 1 : -1) * w0 * TAP_ANGLE;
    }
    hand = null; start();
  };
  const onLeave = () => { sweep = null; };

  measure(); draw();
  let width = box.clientWidth;
  const ro = new ResizeObserver(() => { if (box.clientWidth === width) return; width = box.clientWidth; measure(); draw(); }); ro.observe(box);
  document.fonts?.ready.then(() => { measure(); draw(); });
  let greeted = rm, greetTimer = 0;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && document.visibilityState === 'visible';
    if (!visible) return;
    if (!greeted && e.intersectionRatio > 0.6) {
      greeted = true; // primeira vez à vista: levanta a primeira letra e solta, para mostrar que mexe
      greetTimer = setTimeout(() => { const f = bobs[0]; if (f && !hand) { pull = { bob: f, start: performance.now(), to: -INTRO_ANGLE }; start(); } }, 400);
    }
    start();
  }, { threshold: [0, 0.6] });
  io.observe(box);
  const onVis = () => { visible = document.visibilityState === 'visible'; if (visible) start(); };
  document.addEventListener('visibilitychange', onVis);
  if (!rm) {
    box.addEventListener('pointerdown', onDown); box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp); box.addEventListener('pointercancel', onUp); box.addEventListener('pointerleave', onLeave);
  }
  dispose(() => { cancelAnimationFrame(raf); clearTimeout(greetTimer); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); });
  return () => { dispose.run(); root.remove(); };
}
