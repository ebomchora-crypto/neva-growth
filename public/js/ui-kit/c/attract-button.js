// Magnet Button — porte em JS puro do componente "Magnet Button" (attract-button) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, reduced, disposer, PALETTE } from '../kit.js';
import { toast } from '../../ui.js';

const BASE_SPACING = 12, FILING_LENGTH = 7, LINE_WIDTH = 1.25, CLEARANCE = 6;
const STIFFNESS = 240, DAMPING = 21, PRESENCE_TAU = 0.07, PULL_TAU = 0.09, REST_ALPHA = 0.3, HALF_PI = Math.PI / 2;

const hash = (x, y, seed) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
const smoothstep = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
// Menor diferença entre dois ângulos sem sentido (limalhas não têm cabeça nem cauda).
const lineDelta = (target, current) => { const d = (target - current + HALF_PI) % Math.PI; return (d < 0 ? d + Math.PI : d) - HALF_PI; };

/** Um botão cercado de limalhas de ferro que se alinham ao campo do ímã e inclinam para o cursor. */
function magnetButton({ label, radius = 64, density = 1, onclick, d }) {
  const canvas = h('canvas', { class: 'kk-attract-button-cv' });
  const field = h('span', { class: 'kk-attract-button-field', 'aria-hidden': 'true' }, canvas);
  field.style.inset = -radius + 'px';
  const btn = h('button', { type: 'button', class: 'kk-attract-button-btn', onclick },
    svg('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
      svg('path', { d: 'm6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15' }), svg('path', { d: 'm5 8 4 4' }), svg('path', { d: 'm12 15 4 4' })),
    label);
  const wrap = h('div', { class: 'kk-attract-button-wrap' }, field, btn);
  const ctx = canvas.getContext('2d');
  const spacing = BASE_SPACING / Math.max(0.25, density);

  let filings = [], width = 0, height = 0, box = { left: 0, top: 0, right: 0, bottom: 0, cx: 0, cy: 0 };
  let ink = PALETTE.ink, raf = 0, last = 0, visible = true, calm = reduced();
  const pointer = { x: 0, y: 0 };
  let presence = 0, presenceTarget = 0, pull = 0, pullTarget = 0, focused = false, touchId = null;

  function layout() {
    const bw = wrap.offsetWidth, bh = wrap.offsetHeight;
    width = bw + radius * 2; height = bh + radius * 2;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    box = { left: radius, top: radius, right: radius + bw, bottom: radius + bh, cx: radius + bw / 2, cy: radius + bh / 2 };
    // Ímã de barra deitado ao longo do botão: polo norte à direita, sul à esquerda.
    const poleOffset = Math.max(bw / 2 - bh / 3, bw / 4);
    const nx = box.cx + poleOffset, sx = box.cx - poleOffset;
    filings = [];
    const cols = Math.ceil(width / spacing), rows = Math.ceil(height / spacing);
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
      const x = col * spacing + (hash(col, row, 1) - 0.5) * spacing * 0.45;
      const y = row * spacing + (hash(col, row, 2) - 0.5) * spacing * 0.45;
      const dx = Math.max(box.left - x, 0, x - box.right), dy = Math.max(box.top - y, 0, y - box.bottom);
      const edge = Math.hypot(dx, dy), t = edge / radius;
      if (edge < CLEARANCE || t > 1) continue;
      const ndx = x - nx, ndy = y - box.cy, sdx = x - sx, sdy = y - box.cy;
      const nd3 = Math.max(Math.hypot(ndx, ndy) ** 3, 1), sd3 = Math.max(Math.hypot(sdx, sdy) ** 3, 1);
      const rest = Math.atan2(ndy / nd3 - sdy / sd3, ndx / nd3 - sdx / sd3);
      const cdx = box.cx - x, cdy = box.cy - y, cd = Math.hypot(cdx, cdy) || 1;
      filings.push({ x, y, restX: Math.cos(rest * 2), restY: Math.sin(rest * 2), inX: cdx / cd, inY: cdy / cd, t, fade: 1 - smoothstep(0.4, 1, t), len: FILING_LENGTH * (0.8 + hash(col, row, 3) * 0.4), theta: rest, omega: 0, near: 0 });
    }
  }
  function targetAngle(f) {
    let vx = f.restX, vy = f.restY; f.near = 0;
    if (pull > 0.001) {
      const w = pull * 0.6 * (1 - f.t * 0.4), a = Math.atan2(f.inY, f.inX) * 2;
      vx = vx * (1 - w) + Math.cos(a) * w; vy = vy * (1 - w) + Math.sin(a) * w;
    }
    if (presence > 0.001) {
      const dx = pointer.x - f.x, dy = pointer.y - f.y, sigma = radius * 0.75;
      const w = presence * 0.92 * Math.exp(-(dx * dx + dy * dy) / sigma ** 2);
      f.near = w;
      if (w > 0.001) { const a = Math.atan2(dy, dx) * 2; vx = vx * (1 - w) + Math.cos(a) * w; vy = vy * (1 - w) + Math.sin(a) * w; }
    }
    return Math.atan2(vy, vx) / 2;
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = ink; ctx.lineWidth = LINE_WIDTH; ctx.lineCap = 'round';
    for (const f of filings) {
      const alpha = f.fade * (REST_ALPHA + f.near * 0.4 + pull * 0.2);
      if (alpha < 0.01) continue;
      const shift = pull * 2.5 * (1 - f.t), x = f.x + f.inX * shift, y = f.y + f.inY * shift;
      const hx = (Math.cos(f.theta) * f.len) / 2, hy = (Math.sin(f.theta) * f.len) / 2;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.beginPath(); ctx.moveTo(x - hx, y - hy); ctx.lineTo(x + hx, y + hy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const ease = (v, t, dt, tau) => { const n = v + (t - v) * (1 - Math.exp(-dt / tau)); return Math.abs(t - n) < 0.001 ? t : n; };
  function step(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    presence = ease(presence, presenceTarget, dt, PRESENCE_TAU); pull = ease(pull, pullTarget, dt, PULL_TAU);
    let active = presence !== presenceTarget || pull !== pullTarget;
    for (const f of filings) {
      const diff = lineDelta(targetAngle(f), f.theta);
      f.omega += (STIFFNESS * diff - DAMPING * f.omega) * dt; f.theta += f.omega * dt;
      if (Math.abs(diff) > 0.002 || Math.abs(f.omega) > 0.02) active = true;
    }
    draw();
    // Só roda enquanto há movimento: parado, não gasta quadros.
    raf = active && !document.hidden ? requestAnimationFrame(step) : 0;
  }
  function kick() { if (calm || !visible || raf) return; last = performance.now(); raf = requestAnimationFrame(step); }
  function settleNow() {
    cancelAnimationFrame(raf); raf = 0;
    presence = presenceTarget = 0; pullTarget = focused ? 1 : 0; pull = pullTarget;
    for (const f of filings) { f.theta = Math.atan2(f.restY, f.restX) / 2; f.omega = 0; f.near = 0; }
    draw();
  }
  function track(cx, cy) {
    const r = canvas.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
    const inField = x >= 0 && y >= 0 && x <= width && y <= height;
    const inButton = x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    if (inField) { pointer.x = x; pointer.y = y; }
    const np = inField ? 1 : 0, nl = inButton || focused ? 1 : 0;
    if (inField || np !== presenceTarget || nl !== pullTarget) { presenceTarget = np; pullTarget = nl; kick(); }
  }
  const release = () => { presenceTarget = 0; pullTarget = focused ? 1 : 0; kick(); };
  const onMove = (e) => { if (e.pointerType === 'touch') { if (e.pointerId === touchId) track(e.clientX, e.clientY); return; } track(e.clientX, e.clientY); };
  const onUp = (e) => { if (e.pointerId === touchId) { touchId = null; release(); } };
  const onOut = (e) => { if (!e.relatedTarget && e.pointerType !== 'touch') release(); };
  let listening = false;
  function listen(on) {
    if (on === listening) return; listening = on;
    const m = on ? 'addEventListener' : 'removeEventListener';
    window[m]('pointermove', onMove, { passive: true }); window[m]('pointerup', onUp); window[m]('pointercancel', onUp);
    document[m]('pointerout', onOut); window[m]('blur', release);
  }
  btn.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !calm) { touchId = e.pointerId; track(e.clientX, e.clientY); } });
  // Foco de teclado também puxa o campo; foco de mouse não segura.
  btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) { focused = true; if (presenceTarget === 0) { pointer.x = box.cx; pointer.y = box.cy; } pullTarget = 1; kick(); } });
  btn.addEventListener('blur', () => { focused = false; pullTarget = 0; kick(); });

  const ro = new ResizeObserver(() => { layout(); if (calm) draw(); else settleNow(); });
  ro.observe(wrap);
  const io = new IntersectionObserver(([en]) => { visible = en?.isIntersecting ?? true; listen(visible && !calm); if (!visible) settleNow(); });
  io.observe(canvas);
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => { calm = mq.matches; listen(visible && !calm); settleNow(); };
  mq.addEventListener('change', onMq);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener('visibilitychange', onVis);
  d(() => { cancelAnimationFrame(raf); raf = 0; listen(false); ro.disconnect(); io.disconnect(); mq.removeEventListener('change', onMq); document.removeEventListener('visibilitychange', onVis); });
  return wrap;
}

export default function mount(stage, ctx) {
  ensureStyle('attract-button', `
.kk-attract-button-root{display:flex;align-items:center;justify-content:center;width:100%;padding:12px 0}
.kk-attract-button-wrap{position:relative;display:inline-flex}
.kk-attract-button-field{position:absolute;pointer-events:none}
.kk-attract-button-cv{display:block;width:100%;height:100%;color:#164a7c}
.kk-attract-button-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;min-width:144px;padding:0 18px;border:0;border-radius:8px;background:#164a7c;color:#f2f8fe;font:600 14px/1 inherit;font-family:inherit;cursor:pointer;user-select:none;transition:background-color .15s cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.kk-attract-button-btn:hover{background:#1f5f9b}
.kk-attract-button-btn:active{background:#0f3560}
.kk-attract-button-btn:focus-visible{outline:2px solid #164a7c;outline-offset:3px}
`);
  const d = disposer();
  // Em palco estreito, reduz o raio do campo para não vazar do cartão.
  const radius = stage.clientWidth && stage.clientWidth < 330 ? 44 : 64;
  const btn = magnetButton({ label: 'Quero começar', radius, d, onclick: () => toast('Vamos montar o seu primeiro funil de vendas.', 'ok') });
  stage.append(h('div', { class: 'kk-attract-button-root' }, btn));
  return () => d.run();
}
