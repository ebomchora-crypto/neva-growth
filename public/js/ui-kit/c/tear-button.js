// Tear Button — porte em JS puro do componente "Tear Button" .
import { h, svg, ensureStyle, clamp, reduced } from '../kit.js';

const HEIGHT = 68, BODY_WIDTH = 236, STUB_WIDTH = 76, TOTAL = BODY_WIDTH + STUB_WIDTH;
const TEAR_ANGLE = 34;       // quanto (graus) a ponta gira, em torno do pé da picotagem, antes da última fibra ceder
// A picotagem rasga furo a furo: cada um resiste um instante e cede. Esse "agarra e solta" dá a sensação de papel.
const HOLES = 7, HOLD = 0.55, HOLD_SHARE = 0.3;
const SWING_K = 900, SWING_C = 42, RETURN_K = 520, RETURN_C = 22;
const GRAVITY = 2600, FALL_DISTANCE = 220, STEP = 1 / 120;
const FIBRES = [1.6, 0.4, 2.2, 0.9, 1.8, 0.2, 2.4, 1.1, 0.5, 2, 1.4, 0.3, 2.3, 0.8, 1.7, 0.1, 2.1, 1.2, 0.6, 1.9]; // borda irregular do rasgo
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const haptic = (ms) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } };

// Puxão bruto (0..1+) → quanto o rasgo avançou, parando em cada furo.
function stickSlip(pull) {
  const scaled = clamp(pull, 0, 1) * HOLES, hole = Math.min(Math.floor(scaled), HOLES - 1), f = scaled - hole;
  const given = f < HOLD ? (f / HOLD) * HOLD_SHARE : HOLD_SHARE + ((f - HOLD) / (1 - HOLD)) * (1 - HOLD_SHARE);
  return (hole + given) / HOLES;
}
// Um lado do rasgo como clip-path: irregular até `tip` (px do topo), reto abaixo. side 1 = borda direita do corpo; -1 = esquerda da ponta.
function tornEdge(tip, width, side) {
  const edge = side === 1 ? width : 0, far = side === 1 ? 0 : width, pts = [`${far}px 0px`];
  const rows = Math.ceil((tip / HEIGHT) * FIBRES.length);
  for (let k = 0; k <= rows; k++) pts.push(`${(edge - side * FIBRES[k % FIBRES.length]).toFixed(1)}px ${Math.min((k / FIBRES.length) * HEIGHT, tip).toFixed(1)}px`);
  pts.push(`${edge}px ${tip.toFixed(1)}px`, `${edge}px ${HEIGHT}px`, `${far}px ${HEIGHT}px`);
  return `polygon(${pts.join(',')})`;
}
// Entalhes do bilhete, onde a picotagem encontra as bordas de cima e de baixo.
const NOTCH = 7;
const mask = (x) => `radial-gradient(circle at ${x} 0, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px) top / 100% 51% no-repeat, radial-gradient(circle at ${x} 100%, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px) bottom / 100% 51% no-repeat`;
const bodyMask = mask('100%'), stubMask = mask('0');

const TONES = { default: 'Padrão', muted: 'Suave', danger: 'Perigo' };
const ICON_TRASH = 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3';
const ico = (d) => svg('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));

export default function mount(stage, ctx) {
  ensureStyle('tear-button', `
.kk-tear-button-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px 12px;width:100%}
.kk-tear-button-tones{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.kk-tear-button-tone{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px/1 inherit;cursor:pointer}
.kk-tear-button-tone[aria-pressed=true]{background:var(--ice-800,#164a7c);border-color:var(--ice-800,#164a7c);color:#fff}
.kk-tear-button-tone:focus-visible,.kk-tear-button-stub:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-tear-button-fit{position:relative}
.kk-tear-button{position:absolute;left:0;top:0;width:${TOTAL}px;height:${HEIGHT}px;transform-origin:0 0;user-select:none;-webkit-user-select:none}
.kk-tear-button-body,.kk-tear-button-stub{--paper:var(--ice-900,#0f3560);--fg:#fff;--chip:rgba(255,255,255,.12);--chipd:#fff;--chipdfg:var(--ice-900,#0f3560);--sub:rgba(255,255,255,.62);--perf:rgba(255,255,255,.35)}
.is-muted .kk-tear-button-body,.is-muted .kk-tear-button-stub{--paper:var(--ice-100,#e3f0fb);--fg:var(--ink,#0e2236);--chip:rgba(15,53,96,.08);--chipd:var(--ice-800,#164a7c);--chipdfg:#fff;--sub:var(--mut,#4a6f93);--perf:rgba(15,53,96,.3)}
.is-danger .kk-tear-button-body,.is-danger .kk-tear-button-stub{--paper:#c93a42;--fg:#fff;--chip:rgba(255,255,255,.16);--chipd:#fff;--chipdfg:#c93a42;--sub:rgba(255,255,255,.75);--perf:rgba(255,255,255,.45)}
.kk-tear-button-body{position:absolute;inset:0 auto 0 0;width:${BODY_WIDTH}px;display:flex;align-items:center;gap:12px;padding:0 16px;border-radius:16px 0 0 16px;background:var(--paper);color:var(--fg);mask:${bodyMask};-webkit-mask:${bodyMask}}
.kk-tear-button-chip{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--chip);transition:background-color .3s,color .3s}
.is-done .kk-tear-button-chip{background:var(--chipd);color:var(--chipdfg)}
.kk-tear-button-lines{position:relative;display:grid;min-width:0;flex:1}
.kk-tear-button-line{grid-area:1/1;min-width:0;transition:opacity .3s ${EASE},filter .3s ${EASE},translate .3s ${EASE}}
.kk-tear-button-line:not(.is-on){opacity:0;filter:blur(3px);translate:0 4px;pointer-events:none}
.kk-tear-button-line b,.kk-tear-button-line small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-tear-button-line b{font-size:14px}.kk-tear-button-line small{font-size:12px;color:var(--sub);margin-top:2px}
.kk-tear-button-stub{position:absolute;top:0;bottom:0;left:${BODY_WIDTH}px;width:${STUB_WIDTH}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;padding:0;border-radius:0 16px 16px 0;background:var(--paper);color:var(--fg);font:600 12px/1 inherit;cursor:grab;touch-action:none;transform-origin:0 100%;mask:${stubMask};-webkit-mask:${stubMask};animation:kk-tear-button-in .3s ${EASE} both}
.kk-tear-button-stub svg{opacity:.7}
.kk-tear-button-stub.is-tearing{cursor:grabbing}
.kk-tear-button-perf{position:absolute;top:10px;bottom:10px;left:0;border-left:2px dotted var(--perf)}
.kk-tear-button-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.kk-tear-button-hint{font-size:12px;color:var(--mut,#4a6f93);margin:0;text-align:center;max-width:300px}
@keyframes kk-tear-button-in{from{opacity:0;translate:-12px 0}to{opacity:1;translate:0 0}}
@media (prefers-reduced-motion:reduce){.kk-tear-button-stub{animation:none}.kk-tear-button-line{transition:opacity .2s}}
`);
  let tone = 'default', phase = 'idle', scale = 1, stub = null, resetT = 0, fadeT = 0, raf = 0, destroyed = false;
  const sim = { angle: 0, speed: 0, target: 0, held: false, grabAngle: 0, hole: 0, last: 0, carry: 0, x: 0, y: 0, vx: 0, vy: 0, spin: 0, px: 0, py: 0, pt: 0, pvx: 0, pvy: 0, auto: 0, flying: false };

  const root = h('div', { class: 'kk-tear-button' });
  const fit = h('div', { class: 'kk-tear-button-fit' }, root);
  const chip = h('span', { class: 'kk-tear-button-chip', 'aria-hidden': 'true' });
  const askLine = h('span', { class: 'kk-tear-button-line is-on' }, h('b', 'Excluir cliente'), h('small', 'Rasgue para confirmar'));
  const doneLine = h('span', { class: 'kk-tear-button-line', 'aria-hidden': 'true' }, h('b', 'Cliente excluído'), h('small', 'Fica na lixeira por 30 dias'));
  const body = h('div', { class: 'kk-tear-button-body' }, chip, h('span', { class: 'kk-tear-button-lines' }, askLine, doneLine));
  const live = h('span', { class: 'kk-tear-button-sr', 'aria-live': 'polite' });
  const hint = h('p', { class: 'kk-tear-button-hint' }, 'Segure o picote e puxe para baixo e para o lado. Pelo teclado: Enter ou Espaço.');
  const tonesRow = h('div', { class: 'kk-tear-button-tones', role: 'group', 'aria-label': 'Cor do papel' },
    Object.entries(TONES).map(([k, label]) => h('button', { type: 'button', class: 'kk-tear-button-tone', 'aria-pressed': String(k === tone), onClick: () => { tone = k; refreshTones(); applyTone(); } }, label)));
  const wrap = h('div', { class: 'kk-tear-button-wrap' }, tonesRow, fit, hint, live);
  stage.append(wrap);
  root.append(body);

  const refreshTones = () => tonesRow.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(Object.keys(TONES)[i] === tone)));
  const applyTone = () => { root.classList.remove('is-muted', 'is-danger'); if (tone !== 'default') root.classList.add('is-' + tone); };
  const setChip = (done) => chip.replaceChildren(done ? ico('M5 12.5l4.5 4.5L19 7.5') : ico(ICON_TRASH));

  const setPhase = (p) => {
    phase = p;
    const done = p === 'flying' || p === 'torn';
    root.classList.toggle('is-done', done);
    askLine.classList.toggle('is-on', !done); doneLine.classList.toggle('is-on', done);
    askLine.setAttribute('aria-hidden', String(done)); doneLine.setAttribute('aria-hidden', String(!done));
    setChip(done);
    stub?.classList.toggle('is-tearing', p === 'tearing');
    live.textContent = done ? 'Cliente excluído' : '';
    if (p === 'torn') { stub?.remove(); stub = null; if (!destroyed) resetT = setTimeout(newStub, 2400); }
  };
  setChip(false);

  const hinge = () => { const r = root.getBoundingClientRect(); return { x: r.left + BODY_WIDTH * scale, y: r.top + HEIGHT * scale }; };
  const drawTear = () => {
    const tip = clamp(sim.angle / TEAR_ANGLE, 0, 1) * HEIGHT;
    body.style.clipPath = tip > 0.5 ? tornEdge(tip, BODY_WIDTH, 1) : '';
    if (stub) { stub.style.clipPath = tip > 0.5 ? tornEdge(tip, STUB_WIDTH, -1) : ''; stub.style.transform = `rotate(${sim.angle.toFixed(2)}deg)`; }
  };
  const drawFlight = () => {
    if (!stub) return;
    const fade = clamp(1 - (sim.y - FALL_DISTANCE * 0.5) / (FALL_DISTANCE * 0.5), 0, 1);
    stub.style.transform = `translate(${sim.x.toFixed(1)}px, ${sim.y.toFixed(1)}px) rotate(${sim.angle.toFixed(1)}deg)`;
    stub.style.opacity = fade.toFixed(3);
  };
  const detach = () => {
    sim.held = false; haptic(14);
    // A ponta sai com o giro que tinha, mais o arremesso da mão.
    const rad = sim.angle * Math.PI / 180, tang = (sim.speed * Math.PI / 180) * HEIGHT;
    sim.x = 0; sim.y = 0;
    sim.vx = Math.cos(rad) * tang + clamp(sim.pvx, -900, 900) * 0.6 + 90;
    sim.vy = Math.sin(rad) * tang + clamp(sim.pvy, -900, 900) * 0.6 - 120;
    sim.spin = sim.speed * 0.6 + 140; sim.flying = true;
    if (stub) { stub.style.animation = 'none'; stub.style.transition = 'none'; }
    setPhase('flying');
    if (reduced()) { // em movimento reduzido a ponta não cai: some onde rasgou
      cancelAnimationFrame(raf); raf = 0; sim.last = 0;
      if (stub) { stub.style.transition = `opacity 180ms ${EASE}`; stub.style.opacity = '0'; }
      fadeT = setTimeout(() => setPhase('torn'), 180);
    }
  };
  const stepSwing = () => {
    const stiff = sim.held || sim.auto ? SWING_K : RETURN_K, damp = sim.held || sim.auto ? SWING_C : RETURN_C;
    sim.speed += ((sim.target - sim.angle) * stiff - sim.speed * damp) * STEP; sim.angle += sim.speed * STEP;
    const hole = Math.floor(clamp(sim.angle / TEAR_ANGLE, 0, 1) * HOLES);
    if (hole > sim.hole) haptic(3);
    sim.hole = hole;
    return sim.angle >= TEAR_ANGLE * 0.995;
  };
  const stepFlight = () => { sim.vy += GRAVITY * STEP; sim.x += sim.vx * STEP; sim.y += sim.vy * STEP; sim.angle += sim.spin * STEP; return sim.y > FALL_DISTANCE; };
  const advance = (el) => {
    sim.carry += el; let fin = false;
    while (sim.carry >= STEP && !fin) {
      sim.carry -= STEP;
      if (sim.flying) fin = stepFlight();
      else if (sim.auto) { sim.target = Math.min(sim.target + STEP * 60, TEAR_ANGLE * 1.05); fin = stepSwing(); }
      else fin = stepSwing() && sim.held;
    }
    return fin;
  };
  const tick = (now) => {
    raf = 0;
    if (document.hidden) { sim.last = 0; raf = requestAnimationFrame(tick); return; }
    const el = sim.last ? Math.min((now - sim.last) / 1000, 0.05) : STEP; sim.last = now;
    const flying = sim.flying, fin = advance(el);
    if (flying) {
      drawFlight();
      if (fin) { sim.last = 0; setPhase('torn'); return; }
      raf = requestAnimationFrame(tick); return;
    }
    drawTear();
    if (fin) { sim.auto = 0; detach(); if (!reduced()) raf = requestAnimationFrame(tick); return; }
    const resting = !(sim.held || sim.auto) && Math.abs(sim.angle) < 0.02 && Math.abs(sim.speed) < 0.05;
    if (!resting) { raf = requestAnimationFrame(tick); return; }
    sim.angle = 0; sim.speed = 0; sim.last = 0; drawTear(); setPhase('idle');
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  // Imprime uma ponta nova um instante depois da anterior sair.
  function newStub() {
    Object.assign(sim, { angle: 0, speed: 0, target: 0, hole: 0, flying: false, auto: 0, held: false });
    body.style.clipPath = '';
    stub?.remove();
    stub = h('button', { type: 'button', class: 'kk-tear-button-stub', 'aria-label': 'Excluir cliente: rasgue para confirmar' },
      h('span', { class: 'kk-tear-button-perf', 'aria-hidden': 'true' }), ico('M6 6c6 0 12 3 12 11M14 14l4 4 4-4'), 'Rasgar');
    stub.style.cssText = '';
    root.append(stub);
    stub.addEventListener('pointerdown', onDown); stub.addEventListener('pointermove', onMove);
    stub.addEventListener('pointerup', onUp); stub.addEventListener('pointercancel', onUp); stub.addEventListener('lostpointercapture', onUp);
    stub.addEventListener('keydown', onKey);
    setPhase('idle');
  }
  const ang = (e) => { const p = hinge(); return Math.atan2(e.clientY - p.y, e.clientX - p.x) * 180 / Math.PI; };
  function onDown(e) {
    if (phase === 'flying' || phase === 'torn' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); stub.setPointerCapture(e.pointerId);
    sim.grabAngle = ang(e) - sim.angle; sim.held = true;
    Object.assign(sim, { px: e.clientX, py: e.clientY, pt: e.timeStamp, pvx: 0, pvy: 0 });
    setPhase('tearing'); wake();
  }
  function onMove(e) {
    if (!sim.held) return;
    const dt = e.timeStamp - sim.pt;
    if (dt > 0) { sim.pvx = sim.pvx * 0.5 + ((e.clientX - sim.px) / dt) * 500; sim.pvy = sim.pvy * 0.5 + ((e.clientY - sim.py) / dt) * 500; }
    sim.px = e.clientX; sim.py = e.clientY; sim.pt = e.timeStamp;
    const raw = ang(e) - sim.grabAngle;
    // Empurrar a ponta de volta contra o corpo cede só um pouco.
    const pull = raw < 0 ? raw * 0.15 : raw;
    sim.target = pull >= TEAR_ANGLE ? TEAR_ANGLE * 1.05 : stickSlip(Math.max(pull, 0) / TEAR_ANGLE) * TEAR_ANGLE + Math.min(pull, 0);
    wake();
  }
  function onUp() { if (!sim.held) return; sim.held = false; sim.target = 0; wake(); } // não rasgou até o fim: volta e a picotagem aguenta
  function onKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (phase !== 'idle' || e.repeat) return;
    sim.auto = 1; sim.target = 0; setPhase('tearing'); wake(); // pelo teclado a ponta se rasga sozinha, furo a furo
  }

  const stopFit = (() => {
    const ro = new ResizeObserver(() => {
      scale = Math.min(1, (stage.clientWidth - 24) / TOTAL);
      root.style.transform = `scale(${scale})`; fit.style.width = TOTAL * scale + 'px'; fit.style.height = HEIGHT * scale + 'px';
    });
    ro.observe(stage); return () => ro.disconnect();
  })();
  applyTone(); newStub();
  return () => { destroyed = true; cancelAnimationFrame(raf); clearTimeout(resetT); clearTimeout(fadeT); stopFit(); wrap.remove(); };
}
