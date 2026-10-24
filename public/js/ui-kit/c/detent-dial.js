// Detent Dial — porte em JS puro do componente "Detent Dial" .
import { h, svg, ensureStyle, spring, loop, onResize, disposer, clamp, reduced } from '../kit.js';

const SWEEP = 270, START = -135;       // o botão varre 270°, de 7h30 a 4h30
const MAX_OVERSHOOT = 16;              // quanto (graus) dá para girar além das pontas
const DETENT_PULL = 0.65;              // puxão para o entalhe mais próximo ao arrastar
const MAX_TICKS = 56, WAVE_H = 9, WAVE_W = 12, DEAD_ZONE = 14;
const FLICK = 0.4, VEL_WINDOW = 80, COAST = 0.3;

const damp = (d, m) => m * (1 - Math.exp(-d / m));
const snap = (v, min, step) => Number((Math.round((v - min) / step) * step + min).toFixed(10));
const polar = (c, r, a) => { const q = a * Math.PI / 180; return { x: Math.round((c + r * Math.sin(q)) * 100) / 100, y: Math.round((c - r * Math.cos(q)) * 100) / 100 }; };

export default function mount(stage, ctx) {
  ensureStyle('detent-dial', `
.kk-detent-dial-root{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px 12px;min-height:240px;justify-content:center}
.kk-detent-dial-wrap{position:relative;user-select:none;-webkit-user-select:none;max-width:100%}
.kk-detent-dial-wrap svg{position:absolute;inset:0}
.kk-detent-dial-end{position:absolute;transform:translateX(-50%);font-size:11px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none}
.kk-detent-dial-knob{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;touch-action:none;outline:none;cursor:grab;background:#fff;border:1px solid var(--line,#d3e6f6);box-shadow:0 1px 2px rgba(14,34,54,.06),0 12px 32px -12px rgba(14,34,54,.28);transition:border-color .15s}
.kk-detent-dial-knob.grab{cursor:grabbing;border-color:var(--ice-300,#a5cdee)}
.kk-detent-dial-knob:focus-visible{box-shadow:0 0 0 4px #fff,0 0 0 6px var(--ice-500,#4a95d2),0 12px 32px -12px rgba(14,34,54,.28)}
.kk-detent-dial-rot{position:absolute;inset:0;pointer-events:none}
.kk-detent-dial-rot i{position:absolute;top:10px;left:50%;width:3px;height:12px;margin-left:-1.5px;border-radius:3px;background:var(--ink,#0e2236)}
.kk-detent-dial-face{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.kk-detent-dial-lab{font-size:12px;color:var(--mut,#4a6f93)}
.kk-detent-dial-val{display:flex;font-size:28px;font-weight:600;letter-spacing:-.02em;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums}
.kk-detent-dial-slot{position:relative;display:inline-flex;overflow:hidden}
.kk-detent-dial-slot .out{position:absolute;left:0;top:0}
.kk-detent-dial-tick{transition:stroke .15s}
.kk-detent-dial-info{text-align:center;font-size:13px;color:var(--mut,#4a6f93);line-height:1.4}
.kk-detent-dial-info b{color:var(--ink,#0e2236)}
.kk-detent-dial-btn{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:inherit;font-size:13px;cursor:pointer}
.kk-detent-dial-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
`);
  // Demo: meta de vendas do mês, de R$ 10 mil a R$ 50 mil, de 500 em 500.
  const label = 'Meta do mês', min = 10, max = 50, step = 0.5, DEF = 25, range = max - min;
  const fmt = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 1 : 0, maximumFractionDigits: 1 }) + ' mil';
  const fmtFull = (v) => (v * 1000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const d = disposer(); const rm = reduced();

  let size = ctx.big ? 300 : 240, value = DEF, committed = DEF, dir = 1, pType = 'mouse';
  let dragSt = null, tickCount = 0;
  let pos = spring(DEF, { k: 322, c: 29 });  // `pos.value` = valor cru (pode passar de min/max)
  const labelId = 'kk-detent-dial-l' + Math.random().toString(36).slice(2, 7);

  const wrap = h('div', { class: 'kk-detent-dial-wrap' });
  const knob = h('div', { class: 'kk-detent-dial-knob', role: 'slider', tabindex: '0', 'aria-labelledby': labelId, 'aria-valuemin': min, 'aria-valuemax': max });
  const rot = h('div', { class: 'kk-detent-dial-rot', 'aria-hidden': 'true' }, h('i'));
  const valEl = h('span', { class: 'kk-detent-dial-val', 'aria-hidden': 'true' });
  knob.append(rot, h('div', { class: 'kk-detent-dial-face' }, h('span', { class: 'kk-detent-dial-lab', id: labelId }, label), valEl));
  const info = h('div', { class: 'kk-detent-dial-info', 'aria-live': 'polite' });
  const reset = h('button', { type: 'button', class: 'kk-detent-dial-btn', onclick: () => { pType = 'mouse'; settle(DEF); } }, 'Voltar para R$ 25 mil');
  const root = h('div', { class: 'kk-detent-dial-root' }, wrap, info, reset);
  stage.append(root); d(() => root.remove());

  // ---- geometria
  let svgEl, lines = [], lens = [], minL, maxL, center, outer;
  const angleOf = (r) => {
    const dpu = SWEEP / range;
    if (r < min) return START - damp((min - r) * dpu, MAX_OVERSHOOT);
    if (r > max) return START + SWEEP + damp((r - max) * dpu, MAX_OVERSHOOT);
    const notch = snap(r, min, step);
    return START + (notch + (r - notch) * (1 - DETENT_PULL) - min) * dpu;
  };
  const tickLen = (i, ia) => {
    const angle = START + (i / tickCount) * SWEEP;
    const anchor = i === 0 || i === tickCount || i * 2 === tickCount;
    const base = anchor ? 14 : i % 5 === 0 ? 10 : 6;
    const dist = (angle - ia) / WAVE_W;
    return Math.round((base + WAVE_H * Math.exp(-dist * dist)) * 10) / 10;  // 0,1 px: mudança menor não aparece
  };
  const tickGeo = (i, len) => { const a = START + (i / tickCount) * SWEEP; return { a: polar(center, outer - len, a), b: polar(center, outer, a) }; };

  function build() {
    center = size / 2; outer = size / 2 - 6; tickCount = Math.max(1, Math.min(Math.round(range / step), MAX_TICKS));
    wrap.style.width = wrap.style.height = size + 'px';
    wrap.textContent = ''; lines = []; lens = [];
    svgEl = svg('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' });
    for (let i = 0; i <= tickCount; i++) {
      const ln = svg('line', { class: 'kk-detent-dial-tick', 'stroke-linecap': 'round' }); lines.push(ln); svgEl.append(ln);
    }
    const lo = polar(center, outer + 2, START - 12), hi = polar(center, outer + 2, START + SWEEP + 12);
    minL = h('span', { class: 'kk-detent-dial-end', 'aria-hidden': 'true', style: `left:${lo.x}px;top:${lo.y}px` }, fmt(min));
    maxL = h('span', { class: 'kk-detent-dial-end', 'aria-hidden': 'true', style: `left:${hi.x}px;top:${hi.y}px` }, fmt(max));
    const ks = size * 0.64; knob.style.width = knob.style.height = ks + 'px';
    wrap.append(svgEl, minL, maxL, knob);
    paintTicks(); render();
  }

  function paintTicks() {
    const ia = angleOf(pos.value), active = Math.round((value - min) / range * tickCount);
    for (let i = 0; i <= tickCount; i++) {
      const ln = lines[i], len = tickLen(i, ia), cur = i === active;
      if (lens[i] !== len) { lens[i] = len; const g = tickGeo(i, len); ln.setAttribute('x1', g.a.x); ln.setAttribute('y1', g.a.y); ln.setAttribute('x2', g.b.x); ln.setAttribute('y2', g.b.y); }
      ln.setAttribute('stroke', cur ? PAL.ice500 : i <= active ? PAL.ink : PAL.ice200);
      ln.setAttribute('stroke-width', cur ? 2 : 1.5);
    }
    rot.style.transform = `rotate(${ia}deg)`;
  }
  const PAL = { ink: '#0e2236', ice200: '#c9e1f6', ice500: '#2f7bbd' };

  // ---- valor rolando, caractere a caractere
  let slots = [];
  function renderValue(text, animate) {
    const off = rm ? 0 : dir * 10;
    while (slots.length > text.length) slots.pop().el.remove();
    [...text].forEach((ch, i) => {
      let s = slots[i];
      if (!s) { s = { el: h('span', { class: 'kk-detent-dial-slot' }), ch: '' }; slots.push(s); valEl.append(s.el); }
      if (s.ch === ch) return;
      const next = h('span', ch === ' ' ? ' ' : ch);
      const prev = s.el.firstChild;
      if (prev && animate && !rm) {
        prev.classList.add('out');
        prev.animate([{ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }, { opacity: 0, transform: `translateY(${-off}px)`, filter: 'blur(2px)' }], { duration: 160, easing: 'cubic-bezier(.23,1,.32,1)' }).onfinish = () => prev.remove();
        next.animate([{ opacity: 0, transform: `translateY(${off}px)`, filter: 'blur(2px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { duration: 160, easing: 'cubic-bezier(.23,1,.32,1)' });
      } else if (prev) prev.remove();
      s.el.append(next); s.ch = ch;
    });
  }
  let first = true;
  function render() {
    renderValue(fmt(value), !first); first = false;
    knob.setAttribute('aria-valuenow', value); knob.setAttribute('aria-valuetext', fmt(value));
    info.replaceChildren('Meta de ', h('b', fmtFull(value)), ` · ≈ ${Math.round(value * 1000 / 30).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} por dia`);
  }

  // ---- movimento
  let stopLoop = null;
  function run() { if (stopLoop) return; stopLoop = loop((dt) => { pos.step(dt); onRaw(); if (!dragSt && pos.settled) { pos.set(pos.target); onRaw(); stop(); } }); }
  function stop() { stopLoop?.(); stopLoop = null; }
  d(stop);
  function onRaw() {
    const next = clamp(snap(pos.value, min, step), min, max);
    if (next !== committed) {
      dir = next > committed ? 1 : -1; committed = next; value = next; render();
      if (pType === 'touch') navigator.vibrate?.(1);
    }
    paintTicks();
  }
  function settle(target) { pos = spring(pos.value, { k: 322, c: 29 }); pos.to(target); if (rm) { pos.set(target); onRaw(); } else run(); }
  function jump(target) { stop(); pos.set(target); onRaw(); }

  d(onResize(root, ({ width }) => {
    const s = Math.round(clamp(width - 24 - 90, 190, ctx.big ? 300 : 240));  // reserva espaço para os rótulos laterais
    const next = Math.min(s, ctx.big ? 300 : 240);
    if (next !== size || !svgEl) { size = next; build(); }
  }));

  // ---- ponteiro
  const pAng = (e, r) => { const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); return { angle: Math.atan2(dx, -dy) * 180 / Math.PI, dist: Math.hypot(dx, dy) }; };
  const onDown = (e) => {
    if (dragSt || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const rect = knob.getBoundingClientRect(); stop(); pos.set(pos.value);
    pType = e.pointerType; knob.setPointerCapture(e.pointerId);
    dragSt = { id: e.pointerId, rect, last: pAng(e, rect).angle, samples: [{ t: e.timeStamp, v: pos.value }] };
    knob.classList.add('grab');
  };
  const onMove = (e) => {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    const { angle, dist } = pAng(e, dragSt.rect);
    if (dist < DEAD_ZONE) { dragSt.last = angle; return; }
    let dl = angle - dragSt.last; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;  // cruzar 6h não é salto de 360°
    dragSt.last = angle;
    const next = pos.value + dl / SWEEP * range; pos.set(next); onRaw();
    dragSt.samples.push({ t: e.timeStamp, v: next });
    while (dragSt.samples.length > 2 && e.timeStamp - dragSt.samples[0].t > VEL_WINDOW) dragSt.samples.shift();
  };
  const onUp = (e) => {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    const cur = dragSt; dragSt = null; knob.classList.remove('grab');
    const f = cur.samples[0], l = cur.samples[cur.samples.length - 1], el = (l.t - f.t) / 1000;
    const paused = e.timeStamp - l.t > VEL_WINDOW;
    const vel = el > 0 && !paused ? (l.v - f.v) / el : 0;
    const p = pos.value, inB = p >= min && p <= max;
    if (rm || !inB || Math.abs(vel) < range * FLICK) { settle(clamp(snap(p, min, step), min, max)); return; }
    // Arremesso: projeta onde pararia, crava num entalhe e vai até lá com a velocidade da soltura.
    const target = clamp(snap(p + vel * COAST, min, step), min, max);
    pos = spring(p, { k: 140, c: 24 });  // mola mais macia para o arremesso, como no original
    pos.to(target); pos.kick(vel); run();
  };
  knob.addEventListener('pointerdown', onDown); knob.addEventListener('pointermove', onMove);
  knob.addEventListener('pointerup', onUp); knob.addEventListener('pointercancel', onUp);
  knob.addEventListener('dblclick', () => { pType = 'mouse'; settle(DEF); });

  knob.addEventListener('keydown', (e) => {
    const big = Math.max(step, snap(range / 10, 0, step));
    const m = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: big, PageDown: -big, Home: min - committed, End: max - committed };
    if (!(e.key in m)) return;
    e.preventDefault(); pType = 'keyboard'; jump(clamp(snap(committed + m[e.key], min, step), min, max));
  });
  // A roda só gira o botão com foco, para rolar a página não mudar o valor sem querer.
  let acc = 0;
  const onWheel = (e) => {
    if (document.activeElement !== knob) return;
    e.preventDefault(); acc += e.deltaY;
    while (Math.abs(acc) >= 40) { const sg = Math.sign(acc); acc -= sg * 40; pType = 'keyboard'; jump(clamp(snap(committed - sg * step, min, step), min, max)); }
  };
  knob.addEventListener('wheel', onWheel, { passive: false });
  d(() => knob.removeEventListener('wheel', onWheel));
  return () => d.run();
}
