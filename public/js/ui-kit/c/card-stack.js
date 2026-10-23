// Throw Deck — porte em JS puro do componente "Throw Deck" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, reduced, clamp, PALETTE } from '../kit.js';
import { toast } from '../../ui.js';

// Pose de repouso de cada posição da pilha: a de cima fica reta, as de baixo mantêm uma inclinação fixa.
const TILTS = [0, -2, 1.5, -1];
const SLOT_Y = 9, SLOT_SCALE = 0.035, MAX_SLOT = TILTS.length - 1;
const MAX_DRAG_ROTATION = 18;       // graus ao arrastar a largura do cartão
const THROW_VELOCITY = 0.5;         // px/ms
const THROW_DISTANCE = 0.35;        // fração da largura
const TAP_SLOP = 5;
const VELOCITY_WINDOW = 90;
const HOME = { k: 420, c: 30 };     // levemente subamortecida: soltura forte "passa" do ponto
const FLIGHT = { k: 150, c: 15 };   // voo mais solto, flick rápido viaja mais
const RETURN = { k: 240, c: 26 };
const TOP_Z = 1000;

const slotPose = (depth) => { const d = Math.min(depth, MAX_SLOT); return { x: 0, y: d * SLOT_Y, r: TILTS[d] ?? 0, s: 1 - d * SLOT_SCALE }; };
const lerpPose = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: a.r + (b.r - a.r) * t, s: a.s + (b.s - a.s) * t });
const poseTransform = ({ x, y, r, s }) => `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
const makeBody = (depth) => { const p = slotPose(depth); return { ...p, vx: 0, vy: 0, vr: 0, vs: 0, phase: 'rest', out: p, dx: 1, dy: 0, z: null, apexZ: null }; };

function springAxis(v, vel, target, sp, dt) { const nv = vel + (-sp.k * (v - target) - sp.c * vel) * dt; return [v + nv * dt, nv]; }
function stepBody(b, target, dt) {
  const sp = b.phase === 'out' ? FLIGHT : b.phase === 'return' ? RETURN : HOME;
  const n = Math.max(1, Math.ceil(dt * 240)), hh = dt / n; // sub-passos mantêm a mola rígida estável
  for (let i = 0; i < n; i++) {
    [b.x, b.vx] = springAxis(b.x, b.vx, target.x, sp, hh); [b.y, b.vy] = springAxis(b.y, b.vy, target.y, sp, hh);
    [b.r, b.vr] = springAxis(b.r, b.vr, target.r, sp, hh); [b.s, b.vs] = springAxis(b.s, b.vs, target.s, sp, hh);
  }
}
const isSettled = (b, t) => Math.abs(b.x - t.x) < 0.1 && Math.abs(b.y - t.y) < 0.1 && Math.abs(b.r - t.r) < 0.02 && Math.abs(b.s - t.s) < 0.0005 && Math.abs(b.vx) + Math.abs(b.vy) < 2 && Math.abs(b.vr) < 1 && Math.abs(b.vs) < 0.01;
// Distância ao longo de (ux,uy) a partir da qual um cartão w×h não cobre mais a pilha.
const clearance = (w, hh, ux, uy) => Math.min(ux === 0 ? Infinity : w / Math.abs(ux), uy === 0 ? Infinity : hh / Math.abs(uy)) + 24;
function releaseVelocity(samples) {
  const last = samples.at(-1); const first = samples.find((p) => last && last.t - p.t <= VELOCITY_WINDOW);
  if (!first || !last || last.t - first.t < 8) return { vx: 0, vy: 0 };
  const dt = last.t - first.t; return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

// ---- Arte própria (SVG inline, tons de azul)
const C = { bg: PALETTE.ice100, mid: PALETTE.ice300, soft: PALETTE.ice200, ink: PALETTE.ink, acc: PALETTE.ice600, dark: PALETTE.ice900 };
const art = (kids, bg = C.bg) => svg('svg', { viewBox: '0 0 320 320', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', class: 'kk-card-stack-art' }, svg('rect', { width: 320, height: 320, fill: bg }), ...kids);
const R = (a) => svg('rect', a), Ci = (a) => svg('circle', a), Pg = (a) => svg('polygon', a);
const ARTS = {
  sol: () => art([Ci({ cx: 160, cy: 176, r: 72, fill: C.acc }), R({ y: 176, width: 320, height: 144, fill: C.mid }), ...Array.from({ length: 7 }, (_, i) => R({ x: 100 + i * 7, y: 190 + i * 14, width: 120 - i * 14, height: 4 - i * 0.4, fill: C.acc }))]),
  cume: () => art([Ci({ cx: 232, cy: 108, r: 22, fill: C.acc }), Pg({ points: '0,200 64,132 112,172 176,96 248,164 320,120 320,320 0,320', fill: C.mid }), Pg({ points: '0,240 88,176 148,220 224,160 320,236 320,320 0,320', fill: C.ink })]),
  mare: () => art([...[24, 48, 72, 96, 120, 144, 168, 192].map((r) => Ci({ cx: 132, cy: 188, r, fill: 'none', stroke: C.mid, 'stroke-width': 2 })), Ci({ cx: 132, cy: 188, r: 14, fill: C.acc }), Ci({ cx: 244, cy: 104, r: 6, fill: C.ink })]),
  noite: () => art(Array.from({ length: 30 }, (_, i) => R({ x: 52 + (i % 5) * 46, y: 52 + Math.floor(i / 5) * 40, width: 30, height: 30, rx: 2, fill: [7, 16, 23].includes(i) ? PALETTE.ice400 : PALETTE.ice800 })), C.dark),
  sal: () => art([Ci({ cx: 96, cy: 108, r: 14, fill: C.acc }), R({ y: 172, width: 320, height: 148, fill: C.soft }), Pg({ points: '214,172 40,196 40,200 218,173', fill: C.mid }), R({ x: 212, y: 116, width: 4, height: 56, fill: C.ink })]),
};

const CARDS = [
  { id: 'sol', title: 'Sol Baixo', sub: 'Pôster 01 · Risografia', price: 'R$ 148', desc: 'Os últimos dez minutos de luz sobre a água, impressos em duas passadas em papel creme.', specs: [['Tamanho', 'A3'], ['Papel', 'Creme 120g'], ['Tiragem', '50 un.']] },
  { id: 'cume', title: 'Linha de Cume', sub: 'Pôster 02 · Serigrafia', price: 'R$ 220', desc: 'Duas serras e um sol. Impresso à mão em três camadas, com um leve desalinho proposital.', specs: [['Tamanho', '50 × 70'], ['Papel', 'Natural 300g'], ['Tiragem', '30 un.']] },
  { id: 'mare', title: 'Poças de Maré', sub: 'Pôster 03 · Risografia', price: 'R$ 124', desc: 'Anéis deixados por uma única pedra, em oito linhas finas ao redor de um ponto de destaque.', specs: [['Tamanho', 'A3'], ['Papel', 'Branco 120g'], ['Tiragem', '80 un.']] },
  { id: 'noite', title: 'Feira Noturna', sub: 'Pôster 04 · Giclée', price: 'R$ 172', desc: 'Um bloco de janelas depois do expediente. Três ainda estão acesas; as outras já foram para casa.', specs: [['Tamanho', '40 × 50'], ['Papel', 'Algodão 310g'], ['Tiragem', 'Aberta']] },
  { id: 'sal', title: 'Salinas', sub: 'Pôster 05 · Serigrafia', price: 'R$ 196', desc: 'Um marco e sua sombra sobre um leito seco de lago. Quase vazio, e é essa a graça.', specs: [['Tamanho', '50 × 70'], ['Papel', 'Branco 300g'], ['Tiragem', '25 un.']] },
];

const CSS = `
.kk-card-stack-wrap{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;min-height:420px;padding:28px 0 18px;overflow:hidden;container-type:inline-size}
.kk-card-stack-deck{position:relative;aspect-ratio:4/5;width:min(256px,calc(100% - 80px))}
.kk-card-stack-card{position:absolute;inset:0;transform-origin:bottom;touch-action:pan-y;user-select:none;-webkit-user-select:none;border-radius:16px;border:0;padding:0;background:none;text-align:left;font:inherit;color:inherit;outline:none;will-change:transform;box-shadow:0 1px 2px rgba(15,53,96,.08),0 4px 12px -4px rgba(15,53,96,.2);transition:box-shadow .2s ease-out}
.kk-card-stack-card[data-top=true]{cursor:grab}
.kk-card-stack-card[data-state=drag]{cursor:grabbing}
.kk-card-stack-card[data-state=drag],.kk-card-stack-card[data-state=fly]{box-shadow:0 2px 4px rgba(15,53,96,.08),0 28px 48px -16px rgba(15,53,96,.4)}
.kk-card-stack-card:focus-visible{box-shadow:0 0 0 3px var(--ice-500,#4a95d2)}
.kk-card-stack-face{display:flex;flex-direction:column;height:100%;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;padding:8px}
.kk-card-stack-card.open .kk-card-stack-face{opacity:0}
.kk-card-stack-artbox{position:relative;display:block;flex:1;min-height:0;overflow:hidden;border-radius:11px}
.kk-card-stack-art{position:absolute;inset:0;width:100%;height:100%}
.kk-card-stack-meta{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:10px 6px 4px}
.kk-card-stack-meta>span{min-width:0}
.kk-card-stack-t{display:block;font-size:14px;font-weight:600;color:var(--ink,#0e2236);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-card-stack-s{display:block;font-size:12px;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-card-stack-p{flex:none;font-size:14px;font-variant-numeric:tabular-nums;color:var(--ink,#0e2236)}
.kk-card-stack-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:30px;width:min(256px,calc(100% - 80px))}
.kk-card-stack-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex:none;border-radius:50%;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--mut,#4a6f93);cursor:pointer;transition:background .15s,color .15s}
.kk-card-stack-btn:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-card-stack-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-card-stack-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-card-stack-count{margin:0;min-width:0;text-align:center;font-size:12px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-card-stack-count b{font-weight:600;color:var(--ink,#0e2236)}
.kk-card-stack-over{position:absolute;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(242,248,254,.88);animation:kk-card-stack-fade .2s ease-out both}
.kk-card-stack-over.out{animation:kk-card-stack-fadeout .2s ease-in both}
@keyframes kk-card-stack-fade{from{opacity:0}}
@keyframes kk-card-stack-fadeout{to{opacity:0}}
.kk-card-stack-dlg{position:relative;display:flex;flex-direction:column;max-height:100%;width:100%;max-width:370px;overflow:hidden;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;padding:8px;box-shadow:0 24px 48px -12px rgba(15,53,96,.3)}
.kk-card-stack-dart{position:relative;aspect-ratio:2/1;flex:none;overflow:hidden;border-radius:11px}
.kk-card-stack-body{min-height:0;overflow-y:auto;padding:12px 8px 4px}
.kk-card-stack-dh{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.kk-card-stack-dh h3{margin:0;font-size:16px;color:var(--ink,#0e2236)}
.kk-card-stack-dp{margin:2px 0 0;font-size:12px;color:var(--mut,#4a6f93)}
.kk-card-stack-dd{margin:8px 0 0;font-size:14px;line-height:1.5;color:var(--mut,#4a6f93)}
.kk-card-stack-specs{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin:12px 0 0;overflow:hidden;border-radius:10px;border:1px solid var(--line,#d3e6f6);background:var(--line,#d3e6f6)}
.kk-card-stack-specs div{min-width:0;background:#fff;padding:8px 10px}
.kk-card-stack-specs dt{font-size:11px;color:var(--mut,#4a6f93)}
.kk-card-stack-specs dd{margin:0;font-size:12px;color:var(--ink,#0e2236);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-card-stack-act{margin:12px 0 0;width:100%;height:40px;border:0;border-radius:10px;background:var(--ice-600,#2f7bbd);color:#fff;font:600 14px inherit;cursor:pointer}
.kk-card-stack-act:hover{filter:brightness(1.1)}
.kk-card-stack-act:focus-visible,.kk-card-stack-x:focus-visible{outline:2px solid var(--ice-800,#164a7c);outline-offset:2px}
.kk-card-stack-x{position:absolute;top:14px;right:14px;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;border-radius:50%;background:#fff;color:var(--mut,#4a6f93);cursor:pointer;box-shadow:0 1px 4px rgba(15,53,96,.25)}
.kk-card-stack-x svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
@media (prefers-reduced-motion:reduce){.kk-card-stack-over{animation:none}}
`;

export default function mount(stage, ctx) {
  ensureStyle('card-stack', CSS);
  const count = CARDS.length;
  let order = CARDS.map((_, i) => i);
  let openId = null, raf = 0, last = 0, progress = 0, suppressClick = false, focusTop = false, drag = null, dialogEl = null;
  const bodies = CARDS.map((_, i) => makeBody(i));
  const nodes = [];

  const deck = h('div', { class: 'kk-card-stack-deck', role: 'region', 'aria-label': 'Pilha de cartões. Arraste um cartão para o lado ou use as setas do teclado para alternar.' });
  CARDS.forEach((c, index) => {
    const artBox = h('span', { class: 'kk-card-stack-artbox' }, ARTS[c.id]());
    const face = h('span', { class: 'kk-card-stack-face' }, artBox,
      h('span', { class: 'kk-card-stack-meta' }, h('span', h('span', { class: 'kk-card-stack-t' }, c.title), h('span', { class: 'kk-card-stack-s' }, c.sub)), h('span', { class: 'kk-card-stack-p' }, c.price)));
    const node = h('button', { type: 'button', class: 'kk-card-stack-card', 'data-state': 'rest', 'aria-label': `${c.title}, ${c.sub}. Abrir detalhes`, onclick: () => onClick(index), onkeydown: onKey,
      onlostpointercapture: (e) => up(e, true), onpointercancel: (e) => up(e, true), onpointerdown: (e) => down(e, index), onpointermove: move, onpointerup: (e) => up(e) }, face);
    node.style.transform = poseTransform(slotPose(index)); node.style.zIndex = String(count - index);
    nodes[index] = node; deck.append(node);
  });

  const counter = h('p', { class: 'kk-card-stack-count', 'aria-live': 'polite' });
  const navBtn = (label, ic, fn) => h('button', { type: 'button', class: 'kk-card-stack-btn', 'aria-label': label, onclick: fn }, ic);
  const chev = (d) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d }));
  const nav = h('div', { class: 'kk-card-stack-nav' }, navBtn('Cartão anterior', chev('M15 6l-6 6 6 6'), () => cycle(-1)), counter, navBtn('Próximo cartão', chev('M9 6l6 6-6 6'), () => cycle(1)));
  const wrap = h('div', { class: 'kk-card-stack-wrap' }, deck, nav);
  stage.append(wrap);

  function updateCounter() {
    const ti = order[0];
    counter.replaceChildren(h('b', String(ti + 1).padStart(2, '0')), ' / ' + String(count).padStart(2, '0'), h('span', { style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' }, ': ' + CARDS[ti].title));
    order.forEach((idx, depth) => { nodes[idx].tabIndex = depth === 0 ? 0 : -1; nodes[idx].inert = depth !== 0; nodes[idx].dataset.top = String(depth === 0); });
  }

  const cardState = (p) => (p === 'drag' ? 'drag' : p === 'rest' ? 'rest' : 'fly');
  function write(index, depth) {
    const node = nodes[index], b = bodies[index];
    node.style.transform = poseTransform(b); node.style.zIndex = String(b.z ?? order.length - depth);
    const st = cardState(b.phase); if (node.dataset.state !== st) node.dataset.state = st;
  }
  function targetFor(b, depth) {
    if (b.phase === 'out') return b.out;
    const pose = slotPose(depth);
    // O cartão de baixo sobe para encontrar o que está sendo arrastado.
    return depth > 0 && progress > 0 ? lerpPose(pose, slotPose(depth - 1), progress * 0.6) : pose;
  }
  function advance(index, depth, dt) {
    const b = bodies[index];
    if (b.phase === 'drag') { write(index, depth); return true; }
    if (reduced() && b.phase === 'out') { b.phase = 'rest'; b.z = null; }
    const target = targetFor(b, depth);
    if (reduced()) Object.assign(b, target, { vx: 0, vy: 0, vr: 0, vs: 0 }); else stepBody(b, target, dt);
    // Topo do arco: o cartão para de se afastar, troca de camada livre da pilha e volta.
    if (b.phase === 'out' && b.vx * b.dx + b.vy * b.dy <= 0) { b.phase = 'return'; b.z = b.apexZ; }
    const settled = isSettled(b, target);
    if (settled && b.phase !== 'out') { b.phase = 'rest'; b.z = null; }
    write(index, depth); return !settled;
  }
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    let active = false;
    order.forEach((index, depth) => { if (advance(index, depth, dt)) active = true; });
    raf = active ? requestAnimationFrame(tick) : 0;
  }
  // O laço dorme quando tudo assentou; qualquer movimento o acorda.
  const kick = () => { if (raf) return; last = performance.now(); raf = requestAnimationFrame(tick); };
  function commitOrder(next) { order = next; updateCounter(); kick(); }

  function throwTop(vx, vy, fx, fy) {
    const index = order[0]; if (index === undefined || order.length < 2) return;
    const b = bodies[index], node = nodes[index];
    const speed = Math.hypot(vx, vy);
    const rx = speed > 0.05 ? vx : fx, ry = speed > 0.05 ? vy : fy, norm = Math.hypot(rx, ry) || 1, ux = rx / norm, uy = ry / norm;
    const dist = clearance(node.offsetWidth || 256, node.offsetHeight || 320, ux, uy) + Math.min(speed * 50, 90);
    const launch = Math.max(speed, 0.9) * 1000; // mantém velocidade: arrasto lento mas longo sai com intenção
    b.phase = 'out'; b.dx = ux; b.dy = uy;
    b.out = { x: ux * dist, y: uy * dist, r: clamp(b.r + ux * 26, -40, 40), s: 1 };
    b.vx = ux * launch; b.vy = uy * launch; b.vr += ux * launch * 0.05; b.z = TOP_Z; b.apexZ = null;
    commitOrder([...order.slice(1), index]);
  }
  // O de baixo escapa pela esquerda, troca para o topo no ápice e pousa como novo topo.
  function bringBack() {
    const index = order.at(-1); if (index === undefined || order.length < 2) return;
    const b = bodies[index], node = nodes[index];
    const ux = -0.97, uy = -0.24, dist = clearance(node.offsetWidth || 256, node.offsetHeight || 320, ux, uy) + 20;
    b.phase = 'out'; b.dx = ux; b.dy = uy; b.out = { x: ux * dist, y: uy * dist, r: -16, s: 1 };
    b.vx = ux * 1100; b.vy = uy * 1100; b.z = 0; b.apexZ = TOP_Z - 1;
    commitOrder([index, ...order.slice(0, -1)]);
  }
  const cycle = (dir) => { if (openId) return; if (dir === 1) throwTop(1.3, -0.35, 1, 0); else bringBack(); };
  const focusTopCard = () => nodes[order[0]]?.focus({ preventScroll: true });

  function down(e, index) {
    suppressClick = false;
    if (drag || order[0] !== index) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const b = bodies[index], node = e.currentTarget, rect = node.getBoundingClientRect();
    node.setPointerCapture(e.pointerId);
    drag = { pointerId: e.pointerId, index, startX: e.clientX, startY: e.clientY, baseX: b.x, baseY: b.y, width: node.offsetWidth, lever: e.clientY - rect.top < rect.height / 2 ? 1 : -1, moved: false, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
  }
  function move(e) {
    const d = drag; if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < TAP_SLOP) return;
      // Eixo travado no toque: gesto mais vertical é rolagem de página, então solta o cartão.
      if (e.pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx)) { drag = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); return; }
    }
    const b = bodies[d.index]; d.moved = true;
    d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }); if (d.samples.length > 24) d.samples.shift();
    b.phase = 'drag'; b.x = d.baseX + dx; b.y = d.baseY + dy; b.s = 1;
    // Pivô na borda de baixo: pegar pela metade de cima gira para um lado, pela de baixo para o outro.
    b.r = clamp(b.x / d.width, -1, 1) * MAX_DRAG_ROTATION * d.lever;
    b.vx = b.vy = b.vr = b.vs = 0;
    progress = Math.min(Math.hypot(b.x, b.y) / (d.width * THROW_DISTANCE), 1);
    kick();
  }
  function up(e, cancelled = false) {
    const d = drag; if (!d || d.pointerId !== e.pointerId) return;
    drag = null; progress = 0;
    const b = bodies[d.index];
    if (!d.moved) { kick(); return; }
    if (cancelled) { b.phase = 'rest'; kick(); return; } // o navegador tomou o gesto: volta pra casa sem arremesso
    suppressClick = true;
    const { vx, vy } = releaseVelocity(d.samples), speed = Math.hypot(vx, vy), distance = Math.hypot(b.x, b.y);
    const heading = distance > 0 ? (vx * b.x + vy * b.y) / distance : 0; // flick de volta à pilha é desistência
    if ((speed > THROW_VELOCITY && heading > -0.2) || (distance > d.width * THROW_DISTANCE && heading > -0.3)) { throwTop(vx, vy, b.x / (distance || 1), b.y / (distance || 1)); focusTop = false; return; }
    b.phase = 'rest'; b.vx = vx * 1000; b.vy = vy * 1000; b.vr = ((vx * 1000) / d.width) * MAX_DRAG_ROTATION * d.lever;
    kick();
  }
  function onKey(e) {
    suppressClick = false;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); cycle(1); queueMicrotask(focusTopCard); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); cycle(-1); queueMicrotask(focusTopCard); }
  }
  function onClick(index) {
    if (suppressClick) { suppressClick = false; return; }
    if (order[0] === index) openDetails(CARDS[index]);
  }

  // Detalhes: o painel "cresce" a partir do cartão (FLIP) e volta para ele ao fechar.
  function flip(el, from, to, opts) {
    if (reduced() || !from) return null;
    const dx = from.left - to.left, dy = from.top - to.top;
    return el.animate([{ transformOrigin: 'top left', transform: `translate(${dx}px,${dy}px) scale(${from.width / to.width},${from.height / to.height})` }, { transformOrigin: 'top left', transform: 'none' }], opts);
  }
  function openDetails(card) {
    const idx = CARDS.indexOf(card), node = nodes[idx], from = node.getBoundingClientRect();
    openId = card.id; node.classList.add('open');
    const close = h('button', { type: 'button', class: 'kk-card-stack-x', 'aria-label': 'Fechar detalhes', onclick: closeDetails }, svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: 'M6 6l12 12M18 6L6 18' })));
    const body = h('div', { class: 'kk-card-stack-body' },
      h('div', { class: 'kk-card-stack-dh' }, h('h3', card.title), h('span', { class: 'kk-card-stack-p' }, card.price)),
      h('p', { class: 'kk-card-stack-dp' }, card.sub), h('p', { class: 'kk-card-stack-dd' }, card.desc),
      h('dl', { class: 'kk-card-stack-specs' }, card.specs.map(([l, v]) => h('div', h('dt', l), h('dd', v)))),
      h('button', { type: 'button', class: 'kk-card-stack-act', onclick: () => toast(`"${card.title}" adicionado ao carrinho.`) }, 'Adicionar ao carrinho'));
    const dlg = h('div', { class: 'kk-card-stack-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': card.title }, h('div', { class: 'kk-card-stack-dart' }, ARTS[card.id]()), body, close);
    const over = h('div', { class: 'kk-card-stack-over', onclick: (e) => { if (e.target === over) closeDetails(); }, onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDetails(); } } }, dlg);
    dialogEl = over; wrap.append(over);
    flip(dlg, from, dlg.getBoundingClientRect(), { duration: 450, easing: 'cubic-bezier(.23,1,.32,1)' });
    body.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 250, delay: 80, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' });
    close.focus({ preventScroll: true });
  }
  function closeDetails() {
    if (!dialogEl || !openId) return;
    const over = dialogEl, dlg = over.firstChild, idx = CARDS.findIndex((c) => c.id === openId), node = nodes[idx];
    openId = null; dialogEl = null;
    const finish = () => { over.remove(); node.classList.remove('open'); focusTopCard(); };
    over.classList.add('out');
    const a = flip(dlg, node.getBoundingClientRect(), dlg.getBoundingClientRect(), { duration: 300, easing: 'cubic-bezier(.23,1,.32,1)', direction: 'reverse', fill: 'forwards' });
    if (a) a.onfinish = finish; else finish();
  }

  updateCounter();
  return () => { cancelAnimationFrame(raf); raf = 0; wrap.remove(); };
}
