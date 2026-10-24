// Plucked Text — porte em JS puro do componente "Plucked Text" .
import { h, svg, ensureStyle, reduced, disposer } from '../kit.js';

const TEXT = 'Boa vibração';
// A corda é simulada como soma das suas ondas estacionárias (modos), cada uma um oscilador amortecido
// resolvido de forma exata, então não "explode" em nenhuma taxa de quadros.
const MAX_MODES = 24;
const MAX_MODE_HZ = 22;     // acima disso uma tela de 60 Hz criaria aliasing (tremor)
const WAVE_SPEED = 1500;    // px/s na tensão 1: corda mais longa soa mais grave
const DAMP_BASE = 0.9, DAMP_HIGH = 0.012; // modos altos perdem energia muito mais rápido, como numa corda real
const STEP = 6;             // espaçamento das amostras do traçado, em px
const MAX_SWING = 0.6;      // deslocamentos achatam além desta fração da fonte: puxão forte dobra a linha sem arrancar letras
const STRUM_GAIN = 0.55, MAX_STRUM_SPEED = 2400;
const REST_ENERGY = 0.02;   // abaixo disso a corda está em repouso e o laço para
const TILT = 0.85;          // as letras inclinam com a corda, um pouco menos que a inclinação total

/** Avança um oscilador amortecido por `dt` segundos, de forma exata. */
function stepMode(m, dt) {
  const { q, v, omega, gamma, damped } = m;
  const decay = Math.exp(-gamma * dt), c = Math.cos(damped * dt), s = Math.sin(damped * dt);
  m.q = decay * (q * c + ((v + gamma * q) / damped) * s);
  m.v = decay * (v * c - ((omega * omega * q + gamma * v) / damped) * s);
}
/** A corda puxada num V com o vértice em `apex` e altura `height`, escrita em ondas estacionárias; cortar a série arredonda a ponta. */
function triangleModes(modes, length, apex, height) {
  const d = Math.min(Math.max(apex, 1), length - 1);
  modes.forEach((m, i) => {
    const n = i + 1;
    m.q = ((2 * height * length * length) / (n * n * Math.PI * Math.PI * d * (length - d))) * Math.sin((n * Math.PI * d) / length);
    m.v = 0;
  });
}
/** Elástico: cresce como `x` perto de zero e nunca passa de `max`. */
const soften = (x, max) => max * Math.tanh(x / max);

export default function mount(stage, ctx) {
  ensureStyle('plucked-text', `
.kk-plucked-text{width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;container-type:inline-size;color:var(--ink)}
.kk-plucked-text-stage{position:relative;max-width:100%;padding:.7em .5em;font-size:clamp(28px,11cqi,64px);font-weight:700;line-height:1;letter-spacing:-.02em;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.kk-plucked-text-stage[data-grabbing]{cursor:grabbing}
.kk-plucked-text-letters{position:relative;display:block;white-space:pre}
.kk-plucked-text-letters>span{display:inline-block;transform-origin:50% 100%;will-change:transform}
.kk-plucked-text-svg{position:absolute;left:.25em;width:calc(100% - .5em);height:1px;overflow:visible;pointer-events:none;color:var(--ice-500)}
.kk-plucked-text-dot{position:absolute;width:.12em;height:.12em;border-radius:50%;background:var(--ice-500);pointer-events:none;transform:translate(-50%,-50%)}
.kk-plucked-text-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-plucked-text-ctl{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;width:100%}
.kk-plucked-text-ctl label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--mut)}
.kk-plucked-text-ctl input[type=range]{width:120px;min-height:36px;accent-color:var(--ice-600)}
.kk-plucked-text-b{min-height:36px;padding:0 16px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.kk-plucked-text-b:hover{background:var(--ice-100)}
.kk-plucked-text-b:focus-visible,.kk-plucked-text-ctl input:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
`);
  const dispose = disposer();
  const rm = reduced();
  let tension = 1;

  const lettersEl = h('span', { class: 'kk-plucked-text-letters', 'aria-hidden': 'true' },
    Array.from(TEXT).map((c) => h('span', c)), h('span', { style: 'display:inline-block;height:0;width:0' }));
  const path = svg('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' });
  const ghost = svg('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.3 });
  const sv = svg('svg', { class: 'kk-plucked-text-svg', 'aria-hidden': 'true' }, ghost, path);
  const dotL = h('span', { class: 'kk-plucked-text-dot', 'aria-hidden': 'true' }), dotR = h('span', { class: 'kk-plucked-text-dot', 'aria-hidden': 'true' });
  dotL.style.left = '.25em'; dotR.style.right = '.25em'; dotR.style.transform = 'translate(50%,-50%)';
  const box = h('div', { class: 'kk-plucked-text-stage' }, h('span', { class: 'kk-plucked-text-sr' }, TEXT), lettersEl, sv, dotL, dotR);

  const tens = h('input', { type: 'range', min: '0.5', max: '2', step: '0.1', value: '1', 'aria-label': 'Tensão da corda', oninput: () => { tension = +tens.value; measure(); draw(); start(); } });
  const strumBtn = h('button', { class: 'kk-plucked-text-b', type: 'button', onclick: () => { triangleModes(modes, length, length * (0.2 + Math.random() * 0.6), -swing * 0.7); if (rm) release = { from: Float64Array.from(modes, (m) => m.q), start: performance.now() }; start(); } }, 'Dedilhar');
  const root = h('div', { class: 'kk-plucked-text' }, box, h('div', { class: 'kk-plucked-text-ctl' }, h('label', 'Tensão', tens), strumBtn));
  stage.append(root);

  const letters = Array.from(lettersEl.children).slice(0, -1);
  let length = 0, swing = 0, modes = [], pathBasis = [], letterBasis = [], raf = 0, last = 0, visible = true, lastPath = '';
  let grab = null, release = null, prev = null;

  function measure() {
    // A corda fica na linha de base do texto, achada com um inline-block vazio cujo fundo repousa nela.
    const probe = lettersEl.lastElementChild, baseline = `${lettersEl.offsetTop + probe.offsetTop + probe.offsetHeight}px`;
    for (const el of [sv, dotL, dotR]) el.style.top = baseline;
    const box0 = sv.getBoundingClientRect(), left = lettersEl.getBoundingClientRect().left - box0.left;
    length = box0.width;
    swing = parseFloat(getComputedStyle(box).fontSize) * MAX_SWING;
    const f0 = (WAVE_SPEED * tension) / (2 * length), count = Math.max(4, Math.min(MAX_MODES, Math.floor(MAX_MODE_HZ / f0))), old = modes;
    modes = Array.from({ length: count }, (_, i) => {
      const omega = 2 * Math.PI * f0 * (i + 1), gamma = (DAMP_BASE + DAMP_HIGH * (i + 1) ** 2) * Math.sqrt(tension);
      return { q: old[i]?.q ?? 0, v: old[i]?.v ?? 0, omega, gamma, damped: Math.sqrt(Math.max(omega * omega - gamma * gamma, 1)) };
    });
    const samples = Math.ceil(length / STEP) + 1;
    pathBasis = Array.from({ length: samples }, (_, i) => { const x = Math.min(i * STEP, length); return Float64Array.from(modes, (_m, k) => Math.sin(((k + 1) * Math.PI * x) / length)); });
    letterBasis = letters.map((l) => {
      const x = left + l.offsetLeft + l.offsetWidth / 2, k = (i) => ((i + 1) * Math.PI) / length; // offsets ignoram a transformação do laço
      return { sin: Float64Array.from(modes, (_m, i) => Math.sin(k(i) * x)), cos: Float64Array.from(modes, (_m, i) => k(i) * Math.cos(k(i) * x)) };
    });
  }
  const sum = (b) => { let y = 0; for (let i = 0; i < modes.length; i++) y += modes[i].q * b[i]; return y; };
  function draw() {
    let d = '';
    for (let i = 0; i < pathBasis.length; i++) d += `${i === 0 ? 'M' : 'L'}${Math.min(i * STEP, length).toFixed(1)} ${soften(sum(pathBasis[i]), swing).toFixed(2)}`;
    ghost.setAttribute('d', lastPath || d); path.setAttribute('d', d); lastPath = d; // o quadro anterior fica fraco atrás: corda vibrando borra
    for (let i = 0; i < letters.length; i++) {
      const { sin, cos } = letterBasis[i], raw = sum(sin), t = Math.tanh(raw / swing);
      const angle = Math.atan(sum(cos) * (1 - t * t)) * TILT; // inclinação da curva suavizada: o tilt cede com a oscilação
      letters[i].style.transform = `translate3d(0,${soften(raw, swing).toFixed(2)}px,0) rotate(${angle.toFixed(4)}rad)`;
    }
  }
  const energy = () => modes.reduce((e, m) => e + m.v * m.v + m.omega * m.omega * m.q * m.q, 0);
  const settle = () => { for (const m of modes) { m.q = 0; m.v = 0; } };
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    if (release) { // movimento reduzido: sem tilintar, a linha só volta plana
      const t = Math.min((now - release.start) / 260, 1), k = (1 - t) ** 3;
      modes.forEach((m, i) => { m.q = release.from[i] * k; });
      if (t >= 1) { release = null; settle(); }
    } else if (!grab) for (const m of modes) stepMode(m, dt);
    draw();
    if (grab || release || energy() > REST_ENERGY) { raf = requestAnimationFrame(frame); return; }
    settle(); draw(); ghost.setAttribute('d', path.getAttribute('d') ?? '');
  }
  function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  const local = (e) => { const r = sv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const lineAt = (x) => { let y = 0; for (let i = 0; i < modes.length; i++) y += modes[i].q * Math.sin(((i + 1) * Math.PI * x) / length); return soften(y, swing); };

  const onDown = (e) => {
    if (grab || e.button !== 0) return;
    const p = local(e);
    if (p.x < 0 || p.x > length) return;
    e.preventDefault(); box.setPointerCapture(e.pointerId); release = null;
    grab = { id: e.pointerId, x: p.x, y: p.y }; box.dataset.grabbing = '';
    triangleModes(modes, length, p.x, lineAt(p.x)); start();
  };
  const onMove = (e) => {
    const p = local(e);
    if (grab && e.pointerId === grab.id) {
      // Segue a mão ao longo da corda e para cima/baixo, com um puxão que endurece quanto mais longe.
      grab.x = Math.min(Math.max(p.x, 0), length); grab.y = soften(p.y, swing * 1.6);
      triangleModes(modes, length, grab.x, grab.y); start(); return;
    }
    if (e.pointerType !== 'mouse' || rm) { prev = null; return; }
    if (prev && p.x >= 0 && p.x <= length) {
      // O cursor cruzou a linha desde o último movimento? Então dedilha ali, tão forte quanto a velocidade.
      const before = prev.y - lineAt(prev.x), after = p.y - lineAt(p.x);
      if (before * after < 0) {
        const dt = Math.max(e.timeStamp - prev.t, 8) / 1000;
        const speed = Math.max(-MAX_STRUM_SPEED, Math.min(MAX_STRUM_SPEED, (p.y - prev.y) / dt));
        const where = prev.x + (p.x - prev.x) * (before / (before - after));
        modes.forEach((m, i) => { const n = i + 1; m.v += ((STRUM_GAIN * speed * 80) / length) * Math.sin((n * Math.PI * where) / length) * Math.exp(-((n / 14) ** 2)); });
        start();
      }
    }
    prev = { x: p.x, y: p.y, t: e.timeStamp };
  };
  const onUp = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    grab = null; delete box.dataset.grabbing;
    if (rm) release = { from: Float64Array.from(modes, (m) => m.q), start: performance.now() };
    start();
  };
  const onLeave = () => { prev = null; };

  measure(); draw();
  const ro = new ResizeObserver(() => { measure(); draw(); }); ro.observe(box);
  document.fonts?.ready.then(() => { measure(); draw(); });
  // Um dedilhar suave na primeira vez que a linha entra na tela, para mostrar que mexe.
  let greeted = rm;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && document.visibilityState === 'visible';
    if (!visible) return;
    if (!greeted && e.intersectionRatio > 0.6) { greeted = true; triangleModes(modes, length, length * 0.3, -swing * 0.5); }
    start();
  }, { threshold: [0, 0.6] });
  io.observe(box);
  const onVis = () => { visible = document.visibilityState === 'visible'; if (visible) start(); };
  document.addEventListener('visibilitychange', onVis);
  box.addEventListener('pointerdown', onDown); box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp); box.addEventListener('pointercancel', onUp); box.addEventListener('pointerleave', onLeave);
  dispose(() => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); });
  return () => { dispose.run(); root.remove(); };
}
