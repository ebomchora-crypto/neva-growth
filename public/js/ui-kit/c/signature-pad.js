// Signature Pad — porte em JS puro do componente "Signature Pad" .
import { h, ensureStyle, loop, onResize, disposer, clamp, reduced } from '../kit.js';
import { downloadFile, copyText } from '../../ui.js';

// A ponta da caneta segue o ponteiro numa mola: tira o tremor da mão e dá balanço à tinta.
const STEP = 1 / 240, TIP_K = 2600, TIP_C = 78;
const MAX_W = 3.6, MIN_W = 1.1, SPEED_MIN = 1800, W_EASE = 0.08;  // largura segue a velocidade, como num bico de pena
const MIN_GAP = 0.6, TAPER = 7, CLEAR_MS = 420;
const INK = '#0f3560';

/** Largura no ponto i, afinada nas duas pontas. */
function taperedWidth(stroke, i, open) {
  const n = stroke.length, start = Math.min(1, (i + 1) / TAPER), end = open ? 1 : Math.min(1, (n - i) / TAPER);
  return stroke[i].w * (0.35 + 0.65 * Math.min(start, end));
}
/** Adiciona um quadrilátero com o mesmo sentido do `arc`, para um único fill unir tudo. */
function quad(ctx, pts) {
  let area = 0;
  for (let k = 0; k < 8; k += 2) { const j = (k + 2) % 8; area += pts[k] * pts[j + 1] - pts[j] * pts[k + 1]; }
  const o = area >= 0 ? [0, 2, 4, 6] : [6, 4, 2, 0];
  ctx.moveTo(pts[o[0]], pts[o[0] + 1]);
  for (let k = 1; k < 4; k++) ctx.lineTo(pts[o[k]], pts[o[k] + 1]);
  ctx.closePath();
}
/** Pinta os pontos [from, to) como segmentos arredondados, num só preenchimento (sem emendas). */
function paint(ctx, stroke, from, to, open) {
  ctx.beginPath();
  for (let i = Math.max(from, 0); i < to; i++) {
    const p = stroke[i], w = stroke.length === 1 && !open ? p.w * 0.8 : taperedWidth(stroke, i, open);  // ponto isolado ganha um pouco mais de tinta
    if (i > 0) {
      const q = stroke[i - 1], qw = taperedWidth(stroke, i - 1, open), dx = p.x - q.x, dy = p.y - q.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      quad(ctx, [q.x + nx * qw / 2, q.y + ny * qw / 2, p.x + nx * w / 2, p.y + ny * w / 2, p.x - nx * w / 2, p.y - ny * w / 2, q.x - nx * qw / 2, q.y - ny * qw / 2]);
    }
    ctx.moveTo(p.x + w / 2, p.y); ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
  }
  ctx.fill();
}
/** A assinatura como SVG autônomo: um contorno preenchido por traço. */
function toSvg(strokes, width, height) {
  const paths = strokes.map((st) => {
    if (st.length === 1) return `<circle cx="${st[0].x.toFixed(1)}" cy="${st[0].y.toFixed(1)}" r="${(st[0].w * 0.4).toFixed(2)}"/>`;
    const left = [], right = [];
    for (let i = 0; i < st.length; i++) {
      const p = st[i], q = st[Math.max(i - 1, 0)], r = st[Math.min(i + 1, st.length - 1)], dx = r.x - q.x, dy = r.y - q.y, len = Math.hypot(dx, dy) || 1, w = taperedWidth(st, i, false) / 2;
      left.push(`${(p.x - dy / len * w).toFixed(1)} ${(p.y + dx / len * w).toFixed(1)}`);
      right.push(`${(p.x + dy / len * w).toFixed(1)} ${(p.y - dx / len * w).toFixed(1)}`);
    }
    return `<path d="M${left.join('L')}L${right.reverse().join('L')}Z"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(width)} ${Math.round(height)}" fill="${INK}">${paths}</svg>`;
}

export default function mount(stage, ctx) {
  ensureStyle('signature-pad', `
.kk-signature-pad-root{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:14px 10px;min-height:240px}
.kk-signature-pad-card{width:100%;max-width:380px;overflow:hidden;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);user-select:none;-webkit-user-select:none}
.kk-signature-pad-wrap{position:relative;height:${ctx.big ? 260 : 200}px}
.kk-signature-pad-line{position:absolute;left:24px;right:24px;bottom:48px;display:flex;align-items:flex-end;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--ice-300,#a5cdee);pointer-events:none}
.kk-signature-pad-line i{font-style:normal;font-size:18px;line-height:1;color:var(--ice-400,#7fb4e0)}
.kk-signature-pad-line span{font-size:14px;color:var(--ice-400,#7fb4e0);transition:opacity .2s,filter .2s}
.kk-signature-pad-line span.off{opacity:0;filter:blur(2px)}
.kk-signature-pad-cv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;outline:none}
.kk-signature-pad-cv:focus-visible{box-shadow:inset 0 0 0 2px var(--ice-500,#4a95d2)}
.kk-signature-pad-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--line,#d3e6f6);padding:8px 10px 8px 14px}
.kk-signature-pad-st{flex:1 1 110px;margin:0;font-size:13px;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.kk-signature-pad-acts{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:2px;flex-shrink:0}
.kk-signature-pad-b{min-height:36px;min-width:36px;padding:0 10px;border:0;border-radius:8px;background:none;color:var(--mut,#4a6f93);font:inherit;font-size:13px;cursor:pointer;transition:background .15s,color .15s}
.kk-signature-pad-b:hover:not(:disabled){background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-signature-pad-b:focus-visible{outline:2px solid var(--ice-500,#4a95d2)}
.kk-signature-pad-b:disabled{opacity:.4;cursor:default}
.kk-signature-pad-out{margin:0;padding:8px 14px;border-top:1px solid var(--line,#d3e6f6);font-size:11.5px;line-height:1.4;color:var(--mut,#4a6f93);background:var(--ice-50,#f2f8fe)}
`);
  const d = disposer(); const rm = reduced();
  const s = { strokes: [], painted: 0, held: false, pressure: .5, usesPressure: false, tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, width: MAX_W, carry: 0, w: 0, h: 0 };
  let clearing = false, svgText = null, stopTick = null, clearRaf = 0, dpr = 1;

  const cv = h('canvas', { class: 'kk-signature-pad-cv', role: 'img', tabindex: '0' });
  const hint = h('span', 'Assine aqui');
  const wrap = h('div', { class: 'kk-signature-pad-wrap' }, h('div', { class: 'kk-signature-pad-line', 'aria-hidden': 'true' }, h('i', '×'), hint), cv);
  const status = h('p', { class: 'kk-signature-pad-st', 'aria-live': 'polite' });
  const bUndo = h('button', { type: 'button', class: 'kk-signature-pad-b', onclick: () => undo() }, 'Desfazer');
  const bClear = h('button', { type: 'button', class: 'kk-signature-pad-b', onclick: () => clear() }, 'Limpar');
  const bCopy = h('button', { type: 'button', class: 'kk-signature-pad-b', onclick: () => svgText && copyText(svgText, 'SVG da assinatura copiado.') }, 'Copiar SVG');
  const bSave = h('button', { type: 'button', class: 'kk-signature-pad-b', onclick: () => svgText && downloadFile('assinatura.svg', new Blob([svgText], { type: 'image/svg+xml' })) }, 'Baixar SVG');
  const out = h('p', { class: 'kk-signature-pad-out', hidden: true });
  const card = h('div', { class: 'kk-signature-pad-card' }, wrap, h('div', { class: 'kk-signature-pad-bar' }, status, h('div', { class: 'kk-signature-pad-acts' }, bUndo, bClear, bCopy, bSave)), out);
  stage.append(h('div', { class: 'kk-signature-pad-root' }, card)); d(() => stage.firstChild?.remove());

  const g = () => { const c = cv.getContext('2d'); c.fillStyle = INK; return c; };
  function redraw(fraction = 1) {
    const c = g(); c.clearRect(0, 0, s.w, s.h);
    let budget = Math.round(s.strokes.reduce((a, st) => a + st.length, 0) * fraction);
    for (let k = 0; k < s.strokes.length && budget > 0; k++) {
      paint(c, s.strokes[k], 0, Math.min(s.strokes[k].length, budget), s.held && k === s.strokes.length - 1); budget -= s.strokes[k].length;
    }
  }
  function emit() {
    const n = s.strokes.length;
    svgText = n ? toSvg(s.strokes, s.w, s.h) : null;
    status.textContent = n ? `Assinado · ${n} ${n === 1 ? 'traço' : 'traços'}` : 'Desenhe sua assinatura';
    cv.setAttribute('aria-label', `Assinatura, ${n ? n + (n === 1 ? ' traço' : ' traços') : 'vazia'}. Ctrl+Z desfaz, Delete limpa.`);
    hint.classList.toggle('off', n > 0 || s.held);
    bUndo.disabled = bClear.disabled = bCopy.disabled = bSave.disabled = !n || clearing;
    out.hidden = !n;
    if (n) out.textContent = `SVG pronto: ${Math.round(s.w)}×${Math.round(s.h)} px, ${(svgText.length / 1024).toFixed(1).replace('.', ',')} KB. Use "Baixar SVG" ou "Copiar SVG".`;
  }
  d(onResize(wrap, ({ width, height }) => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    s.w = width; s.h = height; cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); redraw();
  }));

  // Um passo da caneta: a ponta corre atrás do ponteiro e solta um ponto ao andar o bastante, com largura pela velocidade.
  function stepPen() {
    s.vx += ((s.tx - s.x) * TIP_K - s.vx * TIP_C) * STEP; s.vy += ((s.ty - s.y) * TIP_K - s.vy * TIP_C) * STEP;
    s.x += s.vx * STEP; s.y += s.vy * STEP;
    const speed = Math.hypot(s.vx, s.vy), press = s.usesPressure ? .45 + s.pressure * .9 : 1;
    s.width += ((MAX_W - (MAX_W - MIN_W) * clamp(speed / SPEED_MIN, 0, 1)) * press - s.width) * W_EASE;
    const st = s.strokes[s.strokes.length - 1], prev = st && st[st.length - 1];
    if (st && prev && Math.hypot(s.x - prev.x, s.y - prev.y) >= MIN_GAP) st.push({ x: s.x, y: s.y, w: s.width });
    return speed;
  }
  function startTick() {
    if (stopTick) return;
    stopTick = loop((dt) => {
      s.carry += dt; let speed = 0;
      while (s.carry >= STEP) { speed = stepPen(); s.carry -= STEP; }
      const st = s.strokes[s.strokes.length - 1];
      if (st) { paint(g(), st, s.painted - 1, st.length, true); s.painted = st.length; }  // só a tinta nova; o ponto anterior é repintado para emendar
      if (!s.held && Math.hypot(s.tx - s.x, s.ty - s.y) < .3 && speed < 5) { stopTick(); stopTick = null; redraw(); emit(); }  // caneta levantada e alcançada: fecha o traço com a ponta fina
    });
  }
  d(() => { stopTick?.(); cancelAnimationFrame(clearRaf); });

  const pt = (e) => { const r = wrap.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', (e) => {
    if (clearing || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId); cv.focus({ preventScroll: true });
    if (stopTick) { stopTick(); stopTick = null; emit(); }  // ainda assentando o traço anterior: termina já
    const p = pt(e);
    s.held = true; s.usesPressure = e.pointerType === 'pen'; s.pressure = e.pressure || .5;
    s.x = s.tx = p.x; s.y = s.ty = p.y; s.vx = s.vy = 0; s.width = MAX_W;
    s.strokes.push([{ x: p.x, y: p.y, w: MAX_W }]); s.painted = 0; redraw(); hint.classList.add('off'); startTick();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!s.held) return;
    const p = pt(e); s.tx = p.x; s.ty = p.y;
    if (s.usesPressure) s.pressure = e.pressure;
    if (rm) { s.x = p.x; s.y = p.y; s.vx = s.vy = 0; }  // sem ponta atrasada: a tinta vai exatamente onde está o ponteiro
  });
  const up = () => { if (!s.held) return; s.held = false; startTick(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);

  function undo() { if (s.held || !s.strokes.length || clearing) return; s.strokes.pop(); redraw(); emit(); }
  // A tinta se desfaz na ordem inversa da que foi escrita.
  function clear() {
    if (s.held || !s.strokes.length || clearing) return;
    const done = () => { s.strokes = []; redraw(); clearing = false; emit(); };
    if (rm) { done(); return; }
    clearing = true; emit();
    const t0 = performance.now();
    const frame = (now) => {
      const t = clamp((now - t0) / CLEAR_MS, 0, 1), eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      redraw(1 - eased);
      if (t < 1) clearRaf = requestAnimationFrame(frame); else { clearRaf = 0; done(); }
    };
    clearRaf = requestAnimationFrame(frame);
  }
  card.addEventListener('keydown', (e) => {
    if (e.target.closest('button')) return;
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undo(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clear(); }
  });
  emit();
  return () => d.run();
}
