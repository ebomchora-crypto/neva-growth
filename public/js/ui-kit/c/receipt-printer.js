// Receipt Printer — porte em JS puro do componente "Receipt Printer" .
import { h, ensureStyle, reduced, disposer } from '../kit.js';

const SLOT_Y = 64;            // onde o papel sai, a partir do topo do cartão
const LINE = 15, FEED_RATE = 34, LINE_PAUSE = 0.055, LINE_JITTER = 0.05; // a impressora avança uma linha e para um instante
const STEP = 1 / 120, GRAVITY = 2600, DAMPING = 0.996;
// Pendurado no corte, o puxão estica só até aqui (com resistência) e rasga acima de TEAR_DRAG.
const MAX_PULL = 18, TEAR_DRAG = 72, TEAR_SPEED = 900; // um tranco para baixo também rasga (px/s)
const GLIDE = 0.35, REST_EPSILON = 0.02;
const BARS = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2];

const ITEMS = [
  { name: 'Café coado', quantity: 2, price: 6.5 },
  { name: 'Pão de queijo', quantity: 3, price: 4.2 },
  { name: 'Suco de laranja', quantity: 1, price: 9 },
  { name: 'Bolo de fubá', quantity: 1, price: 8.5 },
];
const SERVICE = 0.1;
const brl = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const damp = (d, max) => max * (1 - Math.exp(-d / max));
// Ponto local p numa folha girada por `angle`, relativo ao canto.
const turn = (px, py, a) => { const c = Math.cos(a), s = Math.sin(a); return [px * c - py * s, px * s + py * c]; };

// Bordas serrilhadas: a de baixo foi rasgada do último recibo; a de cima ganha o mesmo recorte depois de rasgar.
const TOOTH = 8;
const edge = (side) => `conic-gradient(from ${side === 'bottom' ? '-45deg at 50% 100%' : '135deg at 50% 0'}, #0000, #000 1deg 89deg, #0000 90deg) 50% ${side === 'bottom' ? '100%' : '0'} / ${TOOTH}px ${TOOTH / 2}px repeat-x`;
const FILL = `linear-gradient(#000 0 0) 0 ${TOOTH / 2}px / 100% calc(100% - ${TOOTH}px) no-repeat`;
const MASK_RESTING = `${edge('bottom')}, linear-gradient(#000 0 0) 0 0 / 100% calc(100% - ${TOOTH / 2}px) no-repeat`;
const MASK_TORN = `${edge('top')}, ${edge('bottom')}, ${FILL}`;

function receiptNode() {
  const subtotal = ITEMS.reduce((s, i) => s + i.quantity * i.price, 0), fee = subtotal * SERVICE;
  const dash = () => h('p', { class: 'kk-receipt-printer-dash', 'aria-hidden': 'true' }, '- '.repeat(40));
  return h('div', { class: 'kk-receipt-printer-rc' },
    h('p', { class: 'kk-receipt-printer-merchant' }, 'PADARIA BOM DIA'),
    h('p', { class: 'kk-receipt-printer-mut c' }, '14/10/2026 · 08:42'),
    h('p', { class: 'kk-receipt-printer-mut c' }, 'Pedido #4182'),
    dash(),
    ...ITEMS.map((i) => h('p', { class: 'kk-receipt-printer-row' }, h('span', { class: 'tr' }, `${i.quantity} × ${i.name}`), h('span', { class: 'tn' }, brl(i.quantity * i.price)))),
    dash(),
    h('p', { class: 'kk-receipt-printer-row kk-receipt-printer-mut' }, h('span', {}, 'Subtotal'), h('span', { class: 'tn' }, brl(subtotal))),
    h('p', { class: 'kk-receipt-printer-row kk-receipt-printer-mut' }, h('span', {}, 'Serviço 10%'), h('span', { class: 'tn' }, brl(fee))),
    h('p', { class: 'kk-receipt-printer-row kk-receipt-printer-total' }, h('span', {}, 'Total'), h('span', { class: 'tn' }, 'R$ ' + brl(subtotal + fee))),
    h('div', { class: 'kk-receipt-printer-bars', 'aria-hidden': 'true' }, BARS.map((w, i) => h('span', { style: `width:${w}px;background:${i % 2 ? 'transparent' : '#14304d'}` }))),
    h('p', { class: 'kk-receipt-printer-mut c', style: 'margin-top:12px' }, 'Obrigado, volte sempre'));
}

export default function mount(stage, ctx) {
  ensureStyle('receipt-printer', `
.kk-receipt-printer-wrap{display:flex;justify-content:center;width:100%;padding:8px 0}
.kk-receipt-printer-card{position:relative;width:min(100%,300px);height:${ctx.big ? 520 : 480}px;overflow:hidden;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:var(--ice-50,#f2f8fe);color:var(--ink,#0e2236);user-select:none;-webkit-user-select:none}
.kk-receipt-printer-clip{position:absolute;left:0;right:0;bottom:0;top:${SLOT_Y}px;overflow:hidden}
.kk-receipt-printer-clip.torn{overflow:visible}
.kk-receipt-printer-paper{position:absolute;top:0;left:50%;margin-left:-112px;width:224px;transform-origin:0 0;background:#fff;box-shadow:0 1px 2px rgba(15,53,96,.08),0 8px 24px -12px rgba(15,53,96,.3);touch-action:none;outline:none}
.kk-receipt-printer-paper.hang{cursor:grab}
.kk-receipt-printer-paper.held{cursor:grabbing}
.kk-receipt-printer-paper.gone{visibility:hidden}
.kk-receipt-printer-paper:focus-visible{box-shadow:0 0 0 2px var(--ice-500,#4a95d2)}
.kk-receipt-printer-perf{position:absolute;left:4px;right:4px;top:4px;border-top:2px dotted #b9d3ec}
.kk-receipt-printer-rc{padding:24px 20px 32px;font:11px/15px ui-monospace,SFMono-Regular,Menlo,monospace;color:#14304d}
.kk-receipt-printer-rc p{margin:0}
.kk-receipt-printer-merchant{text-align:center;font-weight:700;font-size:12px;letter-spacing:.2em}
.kk-receipt-printer-mut{color:#5b7a99}.kk-receipt-printer-mut.c{text-align:center}
.kk-receipt-printer-dash{margin:7px 0!important;overflow:hidden;white-space:nowrap;color:#a9bfd6}
.kk-receipt-printer-row{display:flex;justify-content:space-between;gap:12px}
.kk-receipt-printer-row .tr{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-receipt-printer-row .tn{font-variant-numeric:tabular-nums}
.kk-receipt-printer-total{margin-top:4px!important;font-weight:700;font-size:13px}
.kk-receipt-printer-bars{display:flex;justify-content:center;gap:1px;height:36px;margin-top:16px}
.kk-receipt-printer-housing{position:absolute;inset:0 0 auto 0;height:${SLOT_Y}px;background:#fff;border-bottom:1px solid var(--line,#d3e6f6)}
.kk-receipt-printer-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0;font-size:12px}
.kk-receipt-printer-top b{font-weight:600}.kk-receipt-printer-top span{color:var(--mut,#4a6f93)}
.kk-receipt-printer-slot{position:absolute;left:32px;right:32px;bottom:8px;height:4px;border-radius:999px;background:var(--ice-900,#0f3560)}
.kk-receipt-printer-tearbtn{position:absolute;right:12px;bottom:12px;min-height:36px;padding:0 14px;border:0;border-radius:999px;background:var(--ice-800,#164a7c);color:#fff;font:600 12px/1 inherit;font-family:inherit;cursor:pointer;z-index:3}
.kk-receipt-printer-tearbtn:hover{background:var(--ice-900,#0f3560)}
.kk-receipt-printer-tearbtn:focus-visible,.kk-receipt-printer-print:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-receipt-printer-foot{position:absolute;inset:auto 0 0 0;display:flex;justify-content:center;padding:20px;transition:opacity .2s ease-out}
.kk-receipt-printer-foot.off{opacity:0;pointer-events:none}
.kk-receipt-printer-print{min-height:44px;padding:0 20px;border:0;border-radius:999px;background:var(--ice-800,#164a7c);color:#fff;font:600 14px/1 inherit;font-family:inherit;cursor:pointer;transition:background .15s}
.kk-receipt-printer-print:hover{background:var(--ice-900,#0f3560)}
`);
  const dispose = disposer();
  const noMotion = reduced();
  const s = {
    phase: 'idle', width: 0, height: 0, slotX: 0,
    cx: 0, cy: 0, pcx: 0, pcy: 0, angle: 0, spin: 0,      // centro de massa agora e um passo atrás (Verlet) e ângulo
    hx: 0, hy: 0, hingeX: 0, hingeY: 0,                   // a dobradiça: ponto do mundo de onde a folha pende e onde ele está na folha
    hidden: 0, feedTarget: 0, pause: 0,                   // impressão: quanto papel ainda está dentro
    pointerId: -1, grabX: 0, grabY: 0, startX: 0, startY: 0, samples: [],
    raf: 0, last: 0, carry: 0, visible: false,
  };
  let torn = false;

  const status = h('span', { 'aria-live': 'polite' });
  const paper = h('div', { class: 'kk-receipt-printer-paper', role: 'document', 'aria-label': 'Recibo da Padaria Bom Dia, pedido #4182' }, receiptNode());
  const perf = h('span', { class: 'kk-receipt-printer-perf', 'aria-hidden': 'true' });
  paper.prepend(perf);
  const clip = h('div', { class: 'kk-receipt-printer-clip' }, paper);
  const housing = h('div', { class: 'kk-receipt-printer-housing' },
    h('div', { class: 'kk-receipt-printer-top' }, h('b', {}, 'Padaria Bom Dia'), status), h('div', { class: 'kk-receipt-printer-slot' }));
  const tearBtn = h('button', { type: 'button', class: 'kk-receipt-printer-tearbtn', onClick: () => { if (s.phase === 'hanging') { s.spin = 1.2; s.pcy = s.cy - 3; tear(false); } } }, 'Rasgar recibo');
  const printBtn = h('button', { type: 'button', class: 'kk-receipt-printer-print', onClick: () => print() }, 'Imprimir recibo');
  const foot = h('div', { class: 'kk-receipt-printer-foot' }, printBtn);
  const card = h('div', { class: 'kk-receipt-printer-card' }, clip, housing, tearBtn, foot);
  stage.append(h('div', { class: 'kk-receipt-printer-wrap' }, card));

  function setPhase(next) {
    s.phase = next;
    status.textContent = next === 'printing' ? 'Imprimindo…' : next === 'hanging' ? 'Puxe para baixo' : 'Pronto';
    paper.classList.toggle('hang', next === 'hanging');
    paper.classList.toggle('held', next === 'held');
    paper.classList.toggle('gone', next === 'idle' && torn);
    tearBtn.hidden = next !== 'hanging'; // atalho de teclado para quem não arrasta
    foot.classList.toggle('off', next !== 'idle');
    printBtn.disabled = next !== 'idle'; printBtn.tabIndex = next === 'idle' ? 0 : -1;
    printBtn.textContent = torn ? 'Imprimir outro' : 'Imprimir recibo';
  }
  const setTorn = (v) => {
    torn = v;
    clip.classList.toggle('torn', v);
    const m = v ? MASK_TORN : MASK_RESTING;
    paper.style.mask = m; paper.style.webkitMask = m;
    perf.hidden = v;
  };

  const draw = () => {
    // Posiciona a folha para o centro de massa cair em (cx, cy), girada em torno do canto superior esquerdo.
    const [ox, oy] = turn(s.width / 2, s.height / 2, s.angle);
    const tx = s.cx - ox - (s.slotX - s.width / 2), ty = s.cy - oy - SLOT_Y;
    paper.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) rotate(${s.angle.toFixed(4)}rad)`;
  };
  const hangAt = (angle) => { const [dx, dy] = turn(s.width / 2 - s.hingeX, s.height / 2 - s.hingeY, angle); return [s.hx + dx, s.hy + dy]; };
  const placeAtSlot = (pull) => {
    s.hingeX = s.width / 2; s.hingeY = 0; s.hx = s.slotX; s.hy = SLOT_Y + pull;
    const [cx, cy] = hangAt(0);
    s.cx = s.pcx = cx; s.cy = s.pcy = cy; s.angle = 0;
  };

  // Impressora térmica anda em rajadas curtas: avança uma linha, para, avança.
  const stepPrinting = (dt) => {
    if (s.pause > 0) s.pause -= dt;
    else if (s.feedTarget > 0) { s.feedTarget = Math.max(0, s.feedTarget - LINE); s.pause = LINE_PAUSE + Math.random() * LINE_JITTER; }
    s.hidden += (s.feedTarget - s.hidden) * Math.min(1, FEED_RATE * dt);
    if (Math.abs(s.hidden - s.feedTarget) < 0.05) s.hidden = s.feedTarget;
    placeAtSlot(-s.hidden);
    // A carcaça vibra enquanto o motor roda.
    housing.style.transform = `translate3d(${(s.pause > 0 ? 0 : Math.sin(performance.now() / 9) * 0.4).toFixed(2)}px,0,0)`;
    if (s.hidden === 0 && s.feedTarget === 0) { housing.style.transform = ''; setPhase('hanging'); return 0; }
    return 1;
  };
  // Pendurada na dobradiça: o centro de massa balança numa haste de comprimento fixo e a folha gira junto.
  const stepPendulum = () => {
    const vx = (s.cx - s.pcx) * DAMPING, vy = (s.cy - s.pcy) * DAMPING;
    s.pcx = s.cx; s.pcy = s.cy;
    s.cx += vx; s.cy += vy + GRAVITY * STEP * STEP;
    const rod = Math.hypot(s.width / 2 - s.hingeX, s.height / 2 - s.hingeY);
    const dx = s.cx - s.hx, dy = s.cy - s.hy, dist = Math.hypot(dx, dy) || 1;
    s.cx = s.hx + (dx / dist) * rod; s.cy = s.hy + (dy / dist) * rod;
    s.angle = Math.atan2(s.cy - s.hy, s.cx - s.hx) - Math.atan2(s.height / 2 - s.hingeY, s.width / 2 - s.hingeX);
    return Math.abs(vx) + Math.abs(vy);
  };
  // Queda livre: gravidade, um pouco de ar, e folha inclinada deriva de lado.
  const stepFalling = () => {
    let vx = (s.cx - s.pcx) * DAMPING;
    const vy = (s.cy - s.pcy) * DAMPING;
    vx += Math.sin(s.angle) * Math.max(vy, 0) * GLIDE * STEP * 10;
    s.pcx = s.cx; s.pcy = s.cy;
    s.cx += vx; s.cy += vy + GRAVITY * STEP * STEP;
    s.angle += s.spin * STEP; s.spin *= 0.995;
    return s.cy > card.clientHeight + Math.hypot(s.width, s.height) / 2 ? 0 : 1; // saiu pela base do cartão
  };
  const stepPhysics = (elapsed) => {
    let busy = 0; s.carry += elapsed;
    while (s.carry >= STEP) {
      s.carry -= STEP;
      if (s.phase === 'falling') busy = stepFalling();
      else if (s.phase === 'hanging' || s.phase === 'held') busy = stepPendulum();
    }
    return busy;
  };
  const tick = (now) => {
    s.raf = 0;
    const elapsed = s.last ? Math.min((now - s.last) / 1000, 0.05) : STEP;
    s.last = now;
    const busy = s.phase === 'printing' ? stepPrinting(elapsed) : stepPhysics(elapsed);
    draw();
    if (s.phase === 'falling' && busy === 0) { setPhase('idle'); s.last = 0; return; }
    if ((s.phase === 'printing' || s.phase === 'falling' || s.pointerId >= 0 || busy > REST_EPSILON) && s.visible) s.raf = requestAnimationFrame(tick);
    else s.last = 0;
  };
  const wake = () => { if (!s.raf && s.visible) s.raf = requestAnimationFrame(tick); };
  const measure = () => { s.width = paper.offsetWidth; s.height = paper.offsetHeight; s.slotX = card.clientWidth / 2; };

  function print() {
    measure(); setTorn(false);
    if (noMotion) { placeAtSlot(0); draw(); setPhase('hanging'); return; }
    s.hidden = s.height; s.feedTarget = s.height; s.pause = 0.25;
    placeAtSlot(-s.hidden); draw(); setPhase('printing'); wake();
  }
  function tear(held) {
    setTorn(true); navigator.vibrate?.(14);
    housing.animate([{ transform: 'translate3d(0,1.5px,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: 220, easing: 'cubic-bezier(0.23,1,0.32,1)' });
    if (noMotion) { setPhase('idle'); return; }
    setPhase(held ? 'held' : 'falling'); wake();
  }

  // Imprime quando entra na tela; fora dela o laço espera.
  measure(); placeAtSlot(-s.height); draw(); setPhase('idle');
  let printed = false, onScreen = false;
  const update = () => {
    s.visible = onScreen && !document.hidden;
    if (!s.visible) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; return; }
    if (!printed) { printed = true; print(); }
    wake();
  };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { threshold: 0.4 });
  io.observe(card); dispose(() => io.disconnect());
  document.addEventListener('visibilitychange', update); dispose(() => document.removeEventListener('visibilitychange', update));
  dispose(() => cancelAnimationFrame(s.raf));
  const ro = new ResizeObserver(() => { if (s.phase === 'idle' || s.phase === 'hanging') { measure(); if (s.phase === 'hanging') placeAtSlot(0); else placeAtSlot(-s.height); draw(); } });
  ro.observe(card); dispose(() => ro.disconnect());

  const local = (e) => { const r = card.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const toSheet = (x, y) => { const [ox, oy] = turn(s.width / 2, s.height / 2, s.angle); return turn(x - (s.cx - ox), y - (s.cy - oy), -s.angle); };

  paper.addEventListener('pointerdown', (e) => {
    if (s.phase !== 'hanging' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const { x, y } = local(e);
    paper.setPointerCapture(e.pointerId);
    s.pointerId = e.pointerId; s.startX = x; s.startY = y;
    [s.grabX, s.grabY] = toSheet(x, y);
    s.samples = [{ t: e.timeStamp, x, y }];
    wake();
  });
  // Ainda presa: a folha gira em torno do corte para o ponto agarrado seguir a mão, e estica um pouco para baixo.
  const dragAttached = (x, y) => {
    const pull = damp(Math.max(0, y - s.startY), MAX_PULL);
    s.hingeX = s.width / 2; s.hingeY = 0; s.hx = s.slotX; s.hy = SLOT_Y + pull;
    const reach = Math.max(s.grabY, 24);
    const angle = -Math.atan2(x - s.slotX - (s.grabX - s.width / 2), reach);
    const [cx, cy] = hangAt(angle * 0.7);
    s.pcx = s.cx; s.pcy = s.cy; s.cx = cx; s.cy = cy; s.angle = angle * 0.7;
  };
  paper.addEventListener('pointermove', (e) => {
    if (s.pointerId !== e.pointerId) return;
    const { x, y } = local(e);
    s.samples.push({ t: e.timeStamp, x, y });
    if (s.samples.length > 5) s.samples.shift();
    if (s.phase === 'hanging') {
      if (y - s.startY > TEAR_DRAG) { // rasga no corte e fica na mão, balançando de onde foi agarrada
        s.hingeX = s.grabX; s.hingeY = s.grabY; s.hx = x; s.hy = y; tear(true);
      } else dragAttached(x, y);
    } else if (s.phase === 'held') { s.hx = x; s.hy = y; }
    wake();
  });
  const release = (e) => {
    if (s.pointerId !== e.pointerId) return;
    s.pointerId = -1;
    const first = s.samples[0], last = s.samples[s.samples.length - 1] ?? first, dt = Math.max((last.t - first.t) / 1000, 0.016);
    const vx = (last.x - first.x) / dt, vy = (last.y - first.y) / dt;
    if (s.phase === 'held') { // arremessada: mantém a velocidade da mão e gira pelo balanço
      const prev = s.angle; stepPendulum();
      s.spin = (s.angle - prev) / STEP + vx * 0.002;
      s.pcx = s.cx - vx * STEP * 0.6; s.pcy = s.cy - vy * STEP * 0.6;
      setPhase('falling');
    } else if (s.phase === 'hanging' && vy > TEAR_SPEED) { // tranco rasga de vez
      s.pcx = s.cx - vx * STEP * 0.5; s.pcy = s.cy - vy * STEP * 0.5; s.spin = vx * 0.004; tear(false);
    } else if (s.phase === 'hanging') { s.hy = SLOT_Y; s.pcx = s.cx; s.pcy = s.cy; } // soltou: volta para o corte e o balanço termina
    wake();
  };
  paper.addEventListener('pointerup', release);
  paper.addEventListener('pointercancel', release);
  paper.addEventListener('lostpointercapture', release);

  return () => dispose.run();
}
