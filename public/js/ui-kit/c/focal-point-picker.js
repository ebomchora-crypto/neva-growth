// Focal Point Picker — porte em JS puro do componente "Focal Point Picker" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, clamp, disposer } from '../kit.js';

const IMAGE_RATIO = 3 / 2;
const DEFAULT = { x: 0.68, y: 0.38 };
const CROPS = [{ label: 'Avatar', ratio: 1 }, { label: 'Banner', ratio: 16 / 9 }, { label: 'Story', ratio: 9 / 16 }];
const EASE = 'cubic-bezier(.23,1,.32,1)';

// "Foto" gerada em SVG: veleiro ao entardecer; o assunto fica perto do ponto padrão.
function photo() {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1000"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#164a7c"/><stop offset=".55" stop-color="#4a95d2"/><stop offset="1" stop-color="#c9e1f6"/></linearGradient><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bbd"/><stop offset="1" stop-color="#0f3560"/></linearGradient></defs><rect width="1500" height="1000" fill="url(#s)"/><circle cx="330" cy="520" r="110" fill="#f2f8fe" opacity=".92"/><path d="M0 560 L260 430 L470 540 L700 400 L930 560 L1500 470 V640 H0Z" fill="#164a7c" opacity=".45"/><rect y="600" width="1500" height="400" fill="url(#w)"/><g stroke="#e3f0fb" stroke-width="4" opacity=".4" stroke-linecap="round"><path d="M120 700h220M420 760h300M900 720h260M1180 820h200M200 880h260"/></g><path d="M1020 790 L1020 330 L1230 740Z" fill="#f2f8fe"/><path d="M1000 760 L1000 420 L860 740Z" fill="#e3f0fb"/><rect x="1015" y="320" width="10" height="480" fill="#0e2236"/><path d="M840 790 H1260 L1190 850 H910Z" fill="#0e2236"/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
}

// Janela que um recorte "cover" mostra, em frações da imagem, centrada no ponto até onde as bordas deixam.
function cropWindow(p, ratio) {
  const w = Math.min(1, ratio / IMAGE_RATIO), hh = Math.min(1, IMAGE_RATIO / ratio);
  const left = clamp(p.x - w / 2, 0, 1 - w), top = clamp(p.y - hh / 2, 0, 1 - hh);
  return { left, top, w, h: hh, position: `${w < 1 ? (left / (1 - w)) * 100 : 50}% ${hh < 1 ? (top / (1 - hh)) * 100 : 50}%` };
}
const pct = (v) => `${Math.round(v * 100)}%`;

function corners(cls) {
  return h('span', { class: `kk-focal-point-picker-corners ${cls}`, 'aria-hidden': 'true' }, ['tl', 'tr', 'bl', 'br'].map((c) => h('i', { class: c })));
}

export default function mount(stage, ctx) {
  ensureStyle('focal-point-picker', `
.kk-focal-point-picker{width:100%;max-width:576px;margin:0 auto;box-sizing:border-box;padding:14px;border:1px solid var(--line);border-radius:22px;background:#fff;color:var(--ink);user-select:none;-webkit-user-select:none}
.kk-focal-point-picker-frame{position:relative;overflow:hidden;border-radius:14px;background:var(--ice-100) center/cover;cursor:crosshair;touch-action:none}
.kk-focal-point-picker-win{position:absolute;pointer-events:none;box-shadow:0 0 0 9999px rgba(14,34,54,.5);outline:1px solid rgba(255,255,255,.65);opacity:0;transition:left .2s ${EASE},top .2s ${EASE},width .2s ${EASE},height .2s ${EASE},opacity .2s}
.kk-focal-point-picker-win.on{opacity:1}
.kk-focal-point-picker-corners{position:absolute;pointer-events:none}
.kk-focal-point-picker-corners i{position:absolute;width:10px;height:10px;border:0 solid #fff;filter:drop-shadow(0 0 1px rgba(0,0,0,.6))}
.kk-focal-point-picker-corners i.tl{top:0;left:0;border-top-width:1px;border-left-width:1px}
.kk-focal-point-picker-corners i.tr{top:0;right:0;border-top-width:1px;border-right-width:1px}
.kk-focal-point-picker-corners i.bl{bottom:0;left:0;border-bottom-width:1px;border-left-width:1px}
.kk-focal-point-picker-corners i.br{bottom:0;right:0;border-bottom-width:1px;border-right-width:1px}
.kk-focal-point-picker-corners.a{inset:6px}.kk-focal-point-picker-corners.b{inset:4px}
.kk-focal-point-picker-layer{position:absolute;inset:0;pointer-events:none}
.kk-focal-point-picker-pt{position:absolute;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;padding:0;border:0;border-radius:50%;background:none;cursor:grab;pointer-events:auto}
.kk-focal-point-picker-pt.drag{cursor:grabbing}
.kk-focal-point-picker-pt:focus-visible{outline:2px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px rgba(14,34,54,.45)}
.kk-focal-point-picker-pt span{position:absolute;background:#fff;filter:drop-shadow(0 0 1px rgba(0,0,0,.7))}
.kk-focal-point-picker-pt .l,.kk-focal-point-picker-pt .r{top:50%;height:1px;width:16px;margin-top:-.5px}
.kk-focal-point-picker-pt .l{left:0}.kk-focal-point-picker-pt .r{right:0}
.kk-focal-point-picker-pt .t,.kk-focal-point-picker-pt .b{left:50%;width:1px;height:16px;margin-left:-.5px}
.kk-focal-point-picker-pt .t{top:0}.kk-focal-point-picker-pt .b{bottom:0}
.kk-focal-point-picker-pt .dot{left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--ice-600);box-shadow:0 0 0 1px #fff;filter:none}
.kk-focal-point-picker-crops{display:flex;align-items:flex-end;gap:12px;margin-top:16px}
.kk-focal-point-picker-crop{min-width:0;padding:0;border:0;background:none;text-align:left;cursor:pointer;font:inherit}
.kk-focal-point-picker-thumb{position:relative;display:block;overflow:hidden;border-radius:9px;background:var(--ice-100) no-repeat;background-size:cover;transition:box-shadow .15s}
.kk-focal-point-picker-crop.on .kk-focal-point-picker-thumb{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-700)}
.kk-focal-point-picker-crop:focus-visible{outline:none}
.kk-focal-point-picker-crop:focus-visible .kk-focal-point-picker-thumb{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-500)}
.kk-focal-point-picker-crop em{display:block;margin-top:6px;font-style:normal;font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-focal-point-picker-foot{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--mut)}
.kk-focal-point-picker-foot>span{flex:1 1 140px}
.kk-focal-point-picker-foot code{font:600 12px ui-monospace,monospace;color:var(--ink);font-variant-numeric:tabular-nums}
.kk-focal-point-picker-reset{min-height:36px;padding:0 14px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.kk-focal-point-picker-reset:hover{background:var(--ice-100)}
.kk-focal-point-picker-reset:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
`);
  const dispose = disposer();
  const bg = photo();
  let point = { ...DEFAULT }, dragging = false, gliding = false, shown = null;

  const sty = (el, o) => (Object.assign(el.style, o), el);
  const frame = sty(h('div', { class: 'kk-focal-point-picker-frame', role: 'group', 'aria-label': 'Foto de um veleiro ao entardecer' }), { aspectRatio: IMAGE_RATIO, backgroundImage: bg });
  const win = h('div', { class: 'kk-focal-point-picker-win', 'aria-hidden': 'true' }, corners('a'));
  const layer = h('div', { class: 'kk-focal-point-picker-layer' });
  const pt = h('button', { class: 'kk-focal-point-picker-pt', type: 'button' }, h('span', { class: 'l' }), h('span', { class: 'r' }), h('span', { class: 't' }), h('span', { class: 'b' }), h('span', { class: 'dot' }));
  layer.append(pt); frame.append(win, layer);

  const thumbs = CROPS.map((c, i) => {
    const th = sty(h('span', { class: 'kk-focal-point-picker-thumb' }, corners('b')), { aspectRatio: c.ratio, backgroundImage: bg });
    const btn = sty(h('button', {
      class: 'kk-focal-point-picker-crop', type: 'button', 'aria-label': `Recorte ${c.label}: mostrar a área na foto`, 'aria-pressed': 'false',
      onfocus: () => setShown(i), onblur: () => setShown(null),
      onpointerenter: (e) => { if (e.pointerType === 'mouse') setShown(i); },
      onpointerleave: (e) => { if (e.pointerType === 'mouse') setShown(null); },
      // No toque não existe "passar o mouse": o toque alterna a área destacada.
      onclick: (e) => { if (e.detail !== 0 && matchMedia('(pointer: coarse)').matches) setShown(shown === i ? null : i); },
    }, th, h('em', c.label)), { flex: `${c.ratio} 1 0` });
    return { btn, th };
  });
  const code = h('code');
  const reset = h('button', { class: 'kk-focal-point-picker-reset', type: 'button', onclick: () => { gliding = true; point = { ...DEFAULT }; draw(); } }, 'Centralizar no veleiro');
  const root = h('div', { class: 'kk-focal-point-picker' }, frame,
    h('div', { class: 'kk-focal-point-picker-crops' }, thumbs.map((t) => t.btn)),
    h('div', { class: 'kk-focal-point-picker-foot' }, h('span', 'Arraste o ponto, ou passe o mouse (toque) num recorte'), code, reset));
  stage.append(root);

  function setShown(i) { shown = i; draw(); }
  function draw() {
    layer.style.transition = gliding ? `transform 280ms ${EASE}` : 'none';
    layer.style.transform = `translate(${point.x * 100}%,${point.y * 100}%)`;
    pt.classList.toggle('drag', dragging);
    pt.setAttribute('aria-label', `Ponto focal, ${pct(point.x)} da esquerda, ${pct(point.y)} do topo. Mova com as setas do teclado.`);
    thumbs.forEach((t, i) => {
      const c = cropWindow(point, CROPS[i].ratio);
      t.th.style.backgroundPosition = c.position;
      t.th.style.transition = gliding ? `background-position 280ms ${EASE}` : 'none';
      t.btn.classList.toggle('on', shown === i);
      t.btn.setAttribute('aria-pressed', shown === i);
    });
    const w = shown === null ? null : cropWindow(point, CROPS[shown].ratio);
    win.classList.toggle('on', !!w);
    if (w) Object.assign(win.style, { left: pct(w.left), top: pct(w.top), width: pct(w.w), height: pct(w.h) });
    code.textContent = `${pct(point.x)} ${pct(point.y)}`;
  }
  const at = (x, y) => { const r = frame.getBoundingClientRect(); return { x: clamp((x - r.left) / r.width, 0, 1), y: clamp((y - r.top) / r.height, 0, 1) }; };
  frame.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    frame.setPointerCapture(e.pointerId);
    gliding = !pt.contains(e.target); // clique desliza; arrasto segue o dedo
    dragging = true; point = at(e.clientX, e.clientY); draw();
  });
  frame.addEventListener('pointermove', (e) => { if (!dragging) return; gliding = false; point = at(e.clientX, e.clientY); draw(); });
  const end = () => { if (dragging) { dragging = false; draw(); } };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) frame.addEventListener(ev, end);
  pt.addEventListener('keydown', (e) => {
    const s = e.shiftKey ? 0.1 : 0.01;
    const m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    if (!m) return;
    e.preventDefault(); gliding = false;
    point = { x: clamp(Math.round((point.x + m[0]) * 100) / 100, 0, 1), y: clamp(Math.round((point.y + m[1]) * 100) / 100, 0, 1) }; draw();
  });
  draw();
  return () => { dispose.run(); root.remove(); };
}
