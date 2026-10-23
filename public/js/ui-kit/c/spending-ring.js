// Spending Ring — porte em JS puro do componente "Spending Ring" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, clamp, reduced, disposer, PALETTE } from '../kit.js';

const SIZE = 240, C = SIZE / 2, R = 90, STROKE = 22;
const GAP = 2.4;          // graus vazios entre categorias
// Mola do ângulo: taxa em rad/s e razão de amortecimento; um pouco abaixo do crítico, para o arremesso assentar com folga.
const RATE = 11, DAMPING = 0.78;
const PROJECT = 0.2;      // quanto à frente (s) o arremesso é projetado para escolher onde pousa
const TAP_SLOP = 5;       // movimento menor que isso (px) é toque, não giro

const CATEGORIES = [
  { name: 'Anúncios', amount: 1250, change: 0, color: PALETTE.ice900 },
  { name: 'Equipe', amount: 486.2, change: -6.1, color: PALETTE.ice500 },
  { name: 'Embalagens', amount: 398.1, change: 22.4, color: PALETTE.ice700 },
  { name: 'Fornecedores', amount: 312.75, change: 12.8, color: PALETTE.ice300 },
  { name: 'Frete', amount: 214.4, change: -3.5, color: PALETTE.ice600 },
  { name: 'Ferramentas', amount: 86.97, change: 0, color: PALETTE.ice400 },
];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyShort = (n) => money.format(Math.round(n)).replace(',00', '');

const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180; // ângulo para -180..180
// Ponto no anel, com 0° no topo e ângulos no sentido horário.
const polar = (deg, r = R) => { const rad = (deg * Math.PI) / 180; return [C + r * Math.sin(rad), C - r * Math.cos(rad)]; };
function arc(from, to) {
  const [x0, y0] = polar(from), [x1, y1] = polar(to);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const sliceAt = (spans, deg) => { const a = ((deg % 360) + 360) % 360; const i = spans.findIndex((s) => a >= s.from && a < s.to); return i === -1 ? 0 : i; };
// Um passo da mola amortecida, em fatias pequenas para ficar estável.
function springStep(state, target, dt) {
  const slices = Math.ceil(dt / (1 / 240)), hh = dt / slices;
  for (let i = 0; i < slices; i++) {
    state.v += (-RATE * RATE * (state.a - target) - 2 * DAMPING * RATE * state.v) * hh;
    state.a += state.v * hh;
  }
  return Math.abs(state.a - target) < 0.05 && Math.abs(state.v) < 2;
}

export default function mount(stage, ctx) {
  ensureStyle('spending-ring', `
.kk-spending-ring-wrap{width:100%;display:flex;justify-content:center;padding:4px 0}
.kk-spending-ring{width:100%;max-width:380px;padding:18px;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236)}
.kk-spending-ring-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.kk-spending-ring-top p{margin:0;font-size:14px}.kk-spending-ring-top p:first-child{color:var(--mut,#4a6f93)}
.kk-spending-ring-top p:last-child{font-weight:600;font-variant-numeric:tabular-nums}
.kk-spending-ring-dial{position:relative;width:100%;max-width:240px;aspect-ratio:1;margin:12px auto 0;border-radius:50%;touch-action:none;user-select:none;-webkit-user-select:none;outline:none;cursor:grab}
.kk-spending-ring-dial.spin{cursor:grabbing}
.kk-spending-ring-dial:focus-visible{box-shadow:0 0 0 2px var(--ice-500,#4a95d2),0 0 0 6px #fff}
.kk-spending-ring-dial>svg{position:absolute;inset:0;width:100%;height:100%}
.kk-spending-ring-dial path.seg{transition:stroke-width .2s cubic-bezier(.23,1,.32,1),opacity .2s}
.kk-spending-ring-mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none}
.kk-spending-ring-mid>div{animation:kk-spending-ring-in .2s ease-out}
@keyframes kk-spending-ring-in{from{opacity:0;transform:translateY(4px)}}
.kk-spending-ring-mid p{margin:2px 0 0;font-size:12px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-spending-ring-mid .nm{display:flex;align-items:center;justify-content:center;gap:6px;margin:0}
.kk-spending-ring-mid .nm i{width:6px;height:6px;border-radius:50%}
.kk-spending-ring-mid .amt{margin:2px 0 0;font-weight:700;font-size:24px;letter-spacing:-.02em;color:var(--ink,#0e2236)}
.kk-spending-ring-mid .up{color:var(--bad,#d1434b)}.kk-spending-ring-mid .down{color:var(--ok,#1f9d6b)}.kk-spending-ring-mid .same{color:#7d9bb9}
.kk-spending-ring-list{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
.kk-spending-ring-list button{display:flex;align-items:center;gap:8px;width:100%;min-height:40px;padding:0 8px;border:0;border-radius:10px;background:none;text-align:left;font:12px/1.2 inherit;font-family:inherit;color:var(--mut,#4a6f93);cursor:pointer;transition:background-color .15s,color .15s}
.kk-spending-ring-list button:hover{background:var(--ice-50,#f2f8fe);color:var(--ink,#0e2236)}
.kk-spending-ring-list button[aria-pressed=true]{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-spending-ring-list button:focus-visible{outline:2px solid var(--ice-500,#4a95d2)}
.kk-spending-ring-list i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.kk-spending-ring-list .tx{display:flex;flex-direction:column;gap:2px;min-width:0}
.kk-spending-ring-list .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-spending-ring-list .v{font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink,#0e2236)}
@media (prefers-reduced-motion:reduce){.kk-spending-ring-mid>div{animation:none}.kk-spending-ring-dial path.seg{transition:none}}
`);
  const dispose = disposer();
  const noMotion = reduced();
  const total = CATEGORIES.reduce((s, c) => s + c.amount, 0);
  let at = 0;
  const spans = CATEGORIES.map((c) => { const sweep = (c.amount / total) * 360, span = { from: at, to: at + sweep, mid: at + sweep / 2 }; at += sweep; return span; });

  // O anel gira para a fatia escolhida ficar sob o marcador, no topo.
  const s = { a: -spans[0].mid, v: 0, target: -spans[0].mid, raf: 0, last: 0, coast: false, drag: null };
  let selected = 0, spinning = false;

  const segs = CATEGORIES.map((c, i) => svg('path', { class: 'seg', d: arc(spans[i].from + GAP / 2, spans[i].to - GAP / 2), fill: 'none', stroke: c.color }));
  const ring = svg('g', {}, ...segs);
  const dial = h('div', { class: 'kk-spending-ring-dial', role: 'slider', tabindex: '0', 'aria-valuemin': '1', 'aria-valuemax': String(CATEGORIES.length), 'aria-label': 'Gastos por categoria. Use as setas para girar o anel.' });
  const mid = h('div', { class: 'kk-spending-ring-mid' });
  dial.append(svg('svg', { 'aria-hidden': 'true', viewBox: `0 0 ${SIZE} ${SIZE}` }, ring, svg('path', { fill: PALETTE.ink, d: `M${C - 5} 2 L${C + 5} 2 L${C} 8 Z` })), mid);

  const items = CATEGORIES.map((c, i) => {
    const btn = h('button', { type: 'button', onClick: () => turnTo(i) }, h('i', { style: `background:${c.color}`, 'aria-hidden': 'true' }), h('span', { class: 'tx' }, h('span', { class: 'n' }, c.name), h('span', { class: 'v' }, moneyShort(c.amount))));
    return btn;
  });
  stage.append(h('div', { class: 'kk-spending-ring-wrap' }, h('div', { class: 'kk-spending-ring' },
    h('div', { class: 'kk-spending-ring-top' }, h('p', {}, 'Gastos de outubro'), h('p', {}, money.format(total))),
    dial, h('ul', { class: 'kk-spending-ring-list' }, items.map((b) => h('li', {}, b))))));

  const paint = () => ring.setAttribute('transform', `rotate(${s.a.toFixed(3)} ${C} ${C})`);

  function renderSelection() {
    const c = CATEGORIES[selected], share = (c.amount / total) * 100, ch = c.change;
    segs.forEach((p, i) => { p.setAttribute('stroke-width', i === selected ? STROKE + 8 : STROKE); p.style.opacity = i === selected ? '1' : '.4'; });
    items.forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)));
    dial.setAttribute('aria-valuenow', String(selected + 1));
    dial.setAttribute('aria-valuetext', `${c.name}, ${money.format(c.amount)}`);
    dial.classList.toggle('spin', spinning);
    mid.replaceChildren(h('div', {},
      h('p', { class: 'nm' }, h('i', { style: `background:${c.color}` }), c.name),
      h('p', { class: 'amt' }, money.format(c.amount)),
      h('p', {}, `${share.toFixed(0)}% do total`),
      h('p', { class: ch > 0 ? 'up' : ch < 0 ? 'down' : 'same' }, ch === 0 ? 'Igual ao mês passado' : `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(1).replace('.', ',')}% vs mês passado`)));
  }
  const select = (i) => { if (i !== selected) { selected = i; renderSelection(); } };
  const setSpinning = (v) => { if (v !== spinning) { spinning = v; dial.classList.toggle('spin', v); } };
  // Durante o arremesso a leitura segue o que passa pelo marcador.
  const track = () => select(sliceAt(spans, -s.a));

  const tick = (now) => {
    s.raf = 0;
    if (s.drag) return;
    const dt = s.last ? Math.min((now - s.last) / 1000, 1 / 30) : 1 / 60;
    s.last = now;
    const state = { a: s.a, v: s.v }, settled = springStep(state, s.target, dt);
    s.a = settled ? s.target : state.a; s.v = settled ? 0 : state.v;
    paint();
    if (s.coast) track();
    if (settled) { s.last = 0; s.coast = false; setSpinning(false); } else s.raf = requestAnimationFrame(tick);
  };
  dispose(() => cancelAnimationFrame(s.raf));

  // Gira até uma fatia pelo caminho curto a partir de onde pararia sozinho (o arremesso segue no sentido jogado).
  function turnTo(index, rest = s.a, coast = false) {
    s.target = rest + wrap(-spans[index].mid - rest);
    s.coast = coast;
    if (!coast) select(index);
    if (noMotion) { s.a = s.target; s.v = 0; s.coast = false; paint(); track(); return; }
    setSpinning(true);
    if (!s.raf) { s.last = 0; s.raf = requestAnimationFrame(tick); }
  }

  const pointerAngle = (e) => { const r = dial.getBoundingClientRect(); return (Math.atan2(e.clientX - r.left - r.width / 2, -(e.clientY - r.top - r.height / 2)) * 180) / Math.PI; };
  dial.addEventListener('pointerdown', (e) => {
    if (s.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dial.setPointerCapture(e.pointerId);
    cancelAnimationFrame(s.raf); s.raf = 0; s.v = 0;
    s.drag = { id: e.pointerId, angle: pointerAngle(e), time: e.timeStamp, moved: 0, x: e.clientX, y: e.clientY };
  });
  dial.addEventListener('pointermove', (e) => {
    const d = s.drag;
    if (!d || d.id !== e.pointerId) return;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y));
    if (d.moved < TAP_SLOP) return;
    const angle = pointerAngle(e), delta = wrap(angle - d.angle), dt = Math.max((e.timeStamp - d.time) / 1000, 1 / 240);
    s.a += delta;
    s.v = s.v * 0.6 + (delta / dt) * 0.4; // velocidade angular suavizada, para o arremesso ao soltar
    d.angle = angle; d.time = e.timeStamp;
    setSpinning(true); paint(); track();
  });
  const release = (e) => {
    const d = s.drag;
    if (!d || d.id !== e.pointerId) return;
    s.drag = null;
    if (d.moved < TAP_SLOP) {
      // Toque no anel escolhe a fatia sob o dedo; o miolo é só leitura.
      const r = dial.getBoundingClientRect();
      if (Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) > ((R - STROKE) / SIZE) * r.width) turnTo(sliceAt(spans, pointerAngle(e) - s.a));
      return;
    }
    if (e.timeStamp - d.time > 80) s.v = 0; // parou antes de soltar: sem arremesso
    s.v = clamp(s.v, -1440, 1440);
    const rest = s.a + s.v * PROJECT;
    turnTo(sliceAt(spans, -rest), rest, true);
  };
  dial.addEventListener('pointerup', release);
  dial.addEventListener('pointercancel', release);
  dial.addEventListener('lostpointercapture', release);
  dial.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = null;
    if (e.key in step) next = (selected + step[e.key] + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = CATEGORIES.length - 1;
    if (next !== null) { e.preventDefault(); turnTo(next); }
  });

  paint(); renderSelection();
  return () => dispose.run();
}
