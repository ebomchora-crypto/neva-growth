// Photo Straighten — porte em JS puro do componente "Photo Straighten" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, loop, spring, clamp, reduced, disposer } from '../kit.js';

const MAX = 45, PX = 9;          // PX = pixels por grau na régua
const THROW = 0.18;              // um arremesso continua por este tempo (s) na velocidade de soltura
const SNAP = 0.6;                // soltar perto do nível cai em 0
const TILT = 4.2;                // quanto a foto de exemplo já vem torta; o "Auto" corrige isso
const ASPECT = 4 / 3;
const TICKS = Array.from({ length: MAX * 2 + 1 }, (_, i) => i - MAX);

// "Foto" gerada: lago e montanhas com uma linha de horizonte bem marcada para alinhar.
function photo() {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bbd"/><stop offset="1" stop-color="#c9e1f6"/></linearGradient><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a95d2"/><stop offset="1" stop-color="#164a7c"/></linearGradient></defs><rect width="1600" height="1200" fill="url(#s)"/><circle cx="1180" cy="330" r="90" fill="#f2f8fe" opacity=".9"/><path d="M-100 620 L260 360 L520 560 L820 280 L1180 590 L1500 420 L1700 620Z" fill="#164a7c"/><path d="M-100 620 L260 360 L330 410 L180 620Z" fill="#0f3560"/><path d="M820 280 L900 345 L760 345Z" fill="#f2f8fe"/><rect x="-100" y="620" width="1800" height="700" fill="url(#l)"/><path d="M-100 620H1700" stroke="#f2f8fe" stroke-width="5" opacity=".8"/><g opacity=".35" stroke="#e3f0fb" stroke-width="5" stroke-linecap="round"><path d="M300 720h300M900 800h420M500 920h360M1100 1010h300"/></g><path d="M0 1200 L120 1010 L260 1200Z M1380 1200 L1500 1020 L1600 1200Z" fill="#0f3560"/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
}

// Passando do fim da régua ainda mexe, com resistência crescente.
const rubber = (a) => Math.abs(a) <= MAX ? a : Math.sign(a) * (MAX + 3 * (1 - Math.exp(-(Math.abs(a) - MAX) / 6)));
const fmtAngle = (a) => { const v = Math.round(a * 10) / 10; return v === 0 ? '0°' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}°`; };
const ico = (d) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg('path', { d }));

export default function mount(stage, ctx) {
  ensureStyle('photo-straighten', `
.kk-photo-straighten{width:100%;max-width:512px;margin:0 auto;box-sizing:border-box;padding:14px;border:1px solid var(--line);border-radius:22px;background:#fff;color:var(--ink);user-select:none;-webkit-user-select:none}
.kk-photo-straighten-view{position:relative;overflow:hidden;border-radius:14px;background:var(--ice-100)}
.kk-photo-straighten-img{position:absolute;inset:0;background-size:cover;background-position:center;will-change:transform}
.kk-photo-straighten-grid{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .2s}
.kk-photo-straighten-grid.on{opacity:1}
.kk-photo-straighten-grid i{position:absolute;background:rgba(255,255,255,.25)}
.kk-photo-straighten-grid i.m{background:rgba(255,255,255,.7)}
.kk-photo-straighten-grid i.hz{left:0;right:0;height:1px}.kk-photo-straighten-grid i.vt{top:0;bottom:0;width:1px}
.kk-photo-straighten-badge{position:absolute;top:10px;left:10px;padding:4px 10px;border-radius:99px;background:rgba(14,34,54,.6);color:#fff;font-size:12px;font-weight:600;transition:background .2s}
.kk-photo-straighten-badge.ok{background:rgba(31,157,107,.92)}
.kk-photo-straighten-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px}
.kk-photo-straighten-btn{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:0;border-radius:99px;background:none;color:var(--mut);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.kk-photo-straighten-btn svg{width:15px;height:15px}
.kk-photo-straighten-btn:hover:not(:disabled){background:var(--ice-100);color:var(--ink)}
.kk-photo-straighten-btn:disabled{opacity:.4;cursor:default}
.kk-photo-straighten-btn:focus-visible,.kk-photo-straighten-ruler:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-photo-straighten-val{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;transition:color .2s}
.kk-photo-straighten-val.ok{color:var(--ok)}
.kk-photo-straighten-ruler{position:relative;height:52px;margin-top:6px;overflow:hidden;border-radius:10px;cursor:ew-resize;touch-action:none;-webkit-mask-image:linear-gradient(to right,transparent,#000 20%,#000 80%,transparent);mask-image:linear-gradient(to right,transparent,#000 20%,#000 80%,transparent)}
.kk-photo-straighten-track{position:absolute;left:50%;top:0;height:100%;will-change:transform}
.kk-photo-straighten-tick{position:absolute;top:8px;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%)}
.kk-photo-straighten-tick i{width:1px;height:8px;background:var(--ice-200)}
.kk-photo-straighten-tick.maj i{height:12px;background:var(--ice-400)}
.kk-photo-straighten-tick.zero i{height:12px;background:var(--ok)}
.kk-photo-straighten-tick span{margin-top:3px;font-size:11px;color:var(--mut);font-variant-numeric:tabular-nums}
.kk-photo-straighten-tick.zero span{color:var(--ok);font-weight:700}
.kk-photo-straighten-center{position:absolute;left:50%;top:4px;width:2px;height:20px;margin-left:-1px;border-radius:2px;background:var(--ink);pointer-events:none}
`);
  const dispose = disposer();
  const rm = reduced();
  let angle = 0, adjusting = false, d = null, settling = false;
  const sp = spring(0, { k: 220, c: 24 }); // mola da acomodação (equivale ao spring de 0,45 s do original)

  const img = h('div', { class: 'kk-photo-straighten-img' });
  img.style.backgroundImage = photo();
  const grid = h('div', { class: 'kk-photo-straighten-grid', 'aria-hidden': 'true' },
    [1, 2, 3, 4, 5].map((i) => { const e = h('i', { class: `hz${i % 2 === 0 ? ' m' : ''}` }); e.style.top = `${(i / 6) * 100}%`; return e; }),
    [1, 2, 3, 4, 5].map((i) => { const e = h('i', { class: `vt${i % 2 === 0 ? ' m' : ''}` }); e.style.left = `${(i / 6) * 100}%`; return e; }));
  const badge = h('span', { class: 'kk-photo-straighten-badge' });
  const view = h('div', { class: 'kk-photo-straighten-view', role: 'img', 'aria-label': 'Foto de um lago diante de montanhas, com o horizonte torto' }, img, grid, badge);
  view.style.aspectRatio = ASPECT;

  const val = h('span', { class: 'kk-photo-straighten-val', 'aria-live': 'polite' });
  const autoBtn = h('button', { class: 'kk-photo-straighten-btn', type: 'button', onclick: () => settleTo(-TILT) }, ico('M15 4V2M15 10V8M11 6H9M21 6h-2M5 21l11-11M18 8l-2-2'), 'Auto');
  const resetBtn = h('button', { class: 'kk-photo-straighten-btn', type: 'button', onclick: () => settleTo(0) }, ico('M3 12a9 9 0 103-6.7L3 8M3 3v5h5'), 'Redefinir');
  const track = h('div', { class: 'kk-photo-straighten-track' }, TICKS.map((deg) => {
    const t = h('span', { class: `kk-photo-straighten-tick${deg === 0 ? ' zero' : deg % 5 === 0 ? ' maj' : ''}` }, h('i'), deg % 15 === 0 && h('span', String(deg)));
    t.style.left = `${(deg + MAX) * PX}px`; return t;
  }));
  track.style.width = `${MAX * 2 * PX}px`;
  const ruler = h('div', {
    class: 'kk-photo-straighten-ruler', role: 'slider', tabindex: '0', 'aria-label': 'Endireitar', 'aria-valuemin': -MAX, 'aria-valuemax': MAX,
    ondblclick: () => settleTo(0),
  }, track, h('span', { class: 'kk-photo-straighten-center', 'aria-hidden': 'true' }));
  const root = h('div', { class: 'kk-photo-straighten' }, view, h('div', { class: 'kk-photo-straighten-bar' }, autoBtn, val, resetBtn), ruler);
  stage.append(root);

  function draw() {
    // A foto gira pela própria inclinação mais a correção e cresce o bastante para nenhum canto mostrar vazio.
    const turn = TILT + angle, rad = Math.abs(turn) * Math.PI / 180, ratio = Math.max(ASPECT, 1 / ASPECT);
    img.style.transform = `rotate(${turn}deg) scale(${Math.cos(rad) + ratio * Math.sin(rad)})`;
    track.style.transform = `translateX(${-(angle + MAX) * PX}px)`;
    const v = Math.round(clamp(angle, -MAX, MAX) * 10) / 10, level = Math.abs(TILT + v) < 0.05;
    val.textContent = fmtAngle(v); val.classList.toggle('ok', level);
    badge.textContent = level ? 'Nivelada' : 'Torta'; badge.classList.toggle('ok', level);
    grid.classList.toggle('on', adjusting);
    resetBtn.disabled = v === 0;
    ruler.setAttribute('aria-valuenow', v); ruler.setAttribute('aria-valuetext', fmtAngle(v));
  }
  function settleTo(to) {
    if (rm) { angle = to; settling = false; adjusting = false; draw(); return; }
    sp.set(angle); sp.to(to); settling = true; adjusting = true;
  }
  dispose(loop((dt) => {
    if (!settling) return;
    angle = sp.step(dt);
    if (sp.settled) { angle = sp.target; settling = false; if (!d) adjusting = false; }
    draw();
  }));

  ruler.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || d) return;
    ruler.setPointerCapture(e.pointerId); settling = false;
    d = { x: e.clientX, from: angle, samples: [{ x: e.clientX, t: e.timeStamp }] }; adjusting = true; draw();
  });
  ruler.addEventListener('pointermove', (e) => {
    if (!d) return;
    // Arrastar a régua para a esquerda gira a foto no sentido horário, como um dial.
    angle = rubber(d.from - (e.clientX - d.x) / PX); draw();
    d.samples.push({ x: e.clientX, t: e.timeStamp }); if (d.samples.length > 5) d.samples.shift();
  });
  const end = (e) => {
    if (!d) return;
    const s = d; d = null;
    const first = s.samples[0], dt = (e.timeStamp - first.t) / 1000;
    const vel = dt > 0 && dt < 0.15 ? -(e.clientX - first.x) / PX / dt : 0; // graus/s na soltura
    let to = clamp(angle + vel * THROW, -MAX, MAX);
    to = Math.abs(to) < SNAP ? 0 : Math.round(to * 10) / 10;
    settleTo(to);
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) ruler.addEventListener(ev, end);
  ruler.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 1 : 0.1;
    if (e.key === 'Home' || e.key === '0') { e.preventDefault(); settleTo(0); return; }
    const mv = { ArrowLeft: -st, ArrowDown: -st, ArrowRight: st, ArrowUp: st }[e.key];
    if (mv === undefined) return;
    e.preventDefault(); settling = false;
    angle = clamp(Math.round((angle + mv) * 10) / 10, -MAX, MAX); draw();
  });
  draw();
  return () => { dispose.run(); root.remove(); };
}
