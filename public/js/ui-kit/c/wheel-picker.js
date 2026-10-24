// Wheel Picker — porte em JS puro do componente "Wheel Picker" .
import { h, ensureStyle, spring, loop, disposer, clamp, reduced } from '../kit.js';

const ITEM_H = 36, ITEM_ANGLE = 20;
// Raio do tambor em que linhas vizinhas se encostam exatamente.
const RADIUS = Math.round(ITEM_H / 2 / Math.tan(ITEM_ANGLE / 2 * Math.PI / 180) * 100) / 100;
const WINDOW = Math.ceil(90 / ITEM_ANGLE);          // linhas além de ±90° ficam de costas: não desenha
const VIEW_H = Math.round(RADIUS * 2) + ITEM_H / 2;
const MAX_OVERSCROLL = 1.2, VEL_WINDOW = 80, TAP_SLOP = 4, COAST = 0.32;
const mod = (n, m) => ((n % m) + m) % m;
const damp = (d, m) => m * (1 - Math.exp(-d / m));
const pad = (i) => String(i).padStart(2, '0');

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const diaLabel = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${DIAS[d.getDay()]} ${d.getDate()}`; };

export default function mount(stage, ctx) {
  ensureStyle('wheel-picker', `
.kk-wheel-picker-root{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:18px 12px;min-height:240px}
.kk-wheel-picker-box{position:relative;display:flex;justify-content:center;padding:0 12px;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;user-select:none;-webkit-user-select:none;max-width:100%}
.kk-wheel-picker-band{position:absolute;left:8px;right:8px;top:50%;transform:translateY(-50%);height:${ITEM_H}px;border-radius:8px;background:var(--ice-100,#e3f0fb);pointer-events:none}
.kk-wheel-picker-tick{position:absolute;top:50%;width:4px;height:1px;background:var(--ice-400,#7fb4e0);pointer-events:none}
.kk-wheel-picker-col{position:relative;cursor:grab;touch-action:none;border-radius:8px;outline:none;height:${VIEW_H}px}
.kk-wheel-picker-col:active{cursor:grabbing}
.kk-wheel-picker-col:focus-visible{box-shadow:inset 0 0 0 2px var(--ice-500,#4a95d2)}
.kk-wheel-picker-fade{position:absolute;inset:0;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 34%,#000 66%,transparent);mask-image:linear-gradient(to bottom,transparent,#000 34%,#000 66%,transparent)}
.kk-wheel-picker-drumwrap{position:absolute;inset:0;perspective:1000px;pointer-events:none}
.kk-wheel-picker-drumwrap.clip{clip-path:inset(calc(50% - ${ITEM_H / 2}px) 0 calc(50% - ${ITEM_H / 2}px) 0)}
.kk-wheel-picker-drum{position:absolute;left:0;right:0;top:50%;transform-style:preserve-3d}
.kk-wheel-picker-row{position:absolute;left:0;right:0;top:${-ITEM_H / 2}px;height:${ITEM_H}px;display:flex;align-items:center;justify-content:center;font-size:20px;font-variant-numeric:tabular-nums;backface-visibility:hidden;white-space:nowrap;color:var(--ice-400,#7fb4e0)}
.kk-wheel-picker-drumwrap.clip .kk-wheel-picker-row{color:var(--ink,#0e2236);font-weight:600}
.kk-wheel-picker-sum{text-align:center;font-size:14px;color:var(--mut,#4a6f93);line-height:1.4}
.kk-wheel-picker-sum b{color:var(--ink,#0e2236)}
.kk-wheel-picker-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.kk-wheel-picker-btn{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:inherit;font-size:13px;cursor:pointer}
.kk-wheel-picker-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
`);
  const d = disposer(); const rm = reduced();
  const MIN_STEP = 5;
  const columns = [
    { id: 'dia', label: 'Dia', w: 92, options: Array.from({ length: 14 }, (_, i) => ({ value: String(i), label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : diaLabel(i) })) },
    { id: 'hora', label: 'Horas', loop: true, w: 64, options: Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: pad(i) })) },
    { id: 'min', label: 'Minutos', loop: true, w: 64, options: Array.from({ length: 60 / MIN_STEP }, (_, i) => ({ value: String(i * MIN_STEP), label: pad(i * MIN_STEP) })) },
  ];
  const value = { dia: '1', hora: '14', min: '30' };
  const sum = h('div', { class: 'kk-wheel-picker-sum', 'aria-live': 'polite' });
  const writeSum = () => {
    const dt = new Date(); dt.setDate(dt.getDate() + Number(value.dia)); dt.setHours(Number(value.hora), Number(value.min), 0, 0);
    sum.replaceChildren('Reunião com o cliente em ', h('b', dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })), ' às ', h('b', `${pad(Number(value.hora))}:${pad(Number(value.min))}`));
  };
  const select = (id, v) => { if (value[id] === v) return; value[id] = v; writeSum(); };

  const views = columns.map((c) => makeColumn(c, select, d, rm));
  const box = h('div', { class: 'kk-wheel-picker-box', role: 'group', 'aria-label': 'Data e horário da reunião' },
    h('div', { class: 'kk-wheel-picker-band', 'aria-hidden': 'true' }),
    h('span', { class: 'kk-wheel-picker-tick', style: 'left:2px', 'aria-hidden': 'true' }),
    h('span', { class: 'kk-wheel-picker-tick', style: 'right:2px', 'aria-hidden': 'true' }),
    views.map((v) => v.el));
  const goTo = (vals) => views.forEach((v, i) => v.setValue(vals[columns[i].id]));
  const btns = h('div', { class: 'kk-wheel-picker-btns' },
    h('button', { type: 'button', class: 'kk-wheel-picker-btn', onclick: () => { const n = new Date(); goTo({ dia: '0', hora: String(n.getHours()), min: String(Math.round(n.getMinutes() / MIN_STEP) % 12 * MIN_STEP) }); } }, 'Agora'),
    h('button', { type: 'button', class: 'kk-wheel-picker-btn', onclick: () => goTo({ dia: '1', hora: '9', min: '0' }) }, 'Amanhã, 09:00'),
    h('button', { type: 'button', class: 'kk-wheel-picker-btn', onclick: () => goTo({ dia: '7', hora: '18', min: '30' }) }, 'Daqui a 7 dias'));
  const root = h('div', { class: 'kk-wheel-picker-root' }, box, sum, btns);
  writeSum(); stage.append(root); d(() => root.remove());
  views.forEach((v, i) => v.init(value[columns[i].id]));
  return () => d.run();
}

/** Uma coluna é um cilindro 3D: as linhas ficam em volta e o tambor inteiro gira com um único transform. */
function makeColumn(col, onSelect, d, rm) {
  const { options, loop: wrapAround = false } = col; const count = options.length;
  const idxOf = (v) => Math.max(options.findIndex((o) => o.value === v), 0);
  let pos = spring(0), center = 0, selected = 0, drag = null, running = null, onDone = null, ptype = 'mouse', wheelT = 0;
  const optAt = (i) => options[mod(i, count)];
  const clampIdx = (i) => wrapAround ? i : clamp(i, 0, count - 1);

  const drums = [false, true].map((clip) => {
    const drum = h('div', { class: 'kk-wheel-picker-drum' });
    return { clip, drum, wrap: h('div', { class: 'kk-wheel-picker-drumwrap' + (clip ? ' clip' : ''), 'aria-hidden': 'true' }, drum) };
  });
  const el = h('div', { class: 'kk-wheel-picker-col', role: 'spinbutton', tabindex: '0', 'aria-label': col.label, 'aria-valuemin': 0, 'aria-valuemax': count - 1, style: `width:${col.w}px` },
    h('div', { class: 'kk-wheel-picker-fade' }, drums.map((x) => x.wrap)));

  function rebuildRows() {
    for (const { drum } of drums) {
      drum.textContent = '';
      for (let i = center - WINDOW; i <= center + WINDOW; i++) {
        if (!wrapAround && (i < 0 || i >= count)) continue;
        drum.append(h('div', { class: 'kk-wheel-picker-row', style: `transform:rotateX(${-i * ITEM_ANGLE}deg) translateZ(${RADIUS}px)` }, optAt(i).label));
      }
    }
  }
  function paint() {
    const t = `translateZ(${-RADIUS}px) rotateX(${pos.value * ITEM_ANGLE}deg)`;
    for (const { drum } of drums) drum.style.transform = t;
    const r = Math.round(pos.value);
    if (r !== center) { center = r; rebuildRows(); if (ptype === 'touch') navigator.vibrate?.(1); }
  }
  function syncAria(i) { el.setAttribute('aria-valuenow', i); el.setAttribute('aria-valuetext', options[i].label); }
  function stopAnim() { running?.(); running = null; onDone = null; }
  function run(done) {
    onDone = done; running?.();
    running = loop((dt) => { pos.step(dt); paint(); if (!drag && pos.settled) { pos.set(pos.target); paint(); const f = onDone; stopAnim(); f?.(); } });
  }
  d(stopAnim); d(() => clearTimeout(wheelT));
  function settle() { const i = mod(Math.round(pos.value), count); selected = i; syncAria(i); onSelect(col.id, options[i].value); }
  function goTo(target) {
    stopAnim();
    if (rm) { pos.set(target); paint(); settle(); return; }
    pos = spring(pos.value, { k: 246, c: 27 }); pos.to(target); run(settle);
  }
  const overscroll = (raw) => wrapAround ? raw : raw < 0 ? -damp(-raw, MAX_OVERSCROLL) : raw > count - 1 ? count - 1 + damp(raw - (count - 1), MAX_OVERSCROLL) : raw;

  el.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stopAnim(); pos.set(pos.value); ptype = e.pointerType; el.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, startY: e.clientY, startPos: pos.value, moved: false, samples: [{ t: e.timeStamp, v: pos.value }] };
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) < TAP_SLOP) return;
    drag.moved = true;
    const raw = drag.startPos - dy / ITEM_H; pos.set(overscroll(raw)); paint();
    drag.samples.push({ t: e.timeStamp, v: raw });
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > VEL_WINDOW) drag.samples.shift();
  });
  const up = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const cur = drag; drag = null;
    if (!cur.moved) {
      // Toque: gira até a linha tocada; o asin desfaz o encurtamento do cilindro nas bordas.
      const r = el.getBoundingClientRect(), ratio = clamp((e.clientY - (r.top + r.height / 2)) / RADIUS, -1, 1);
      goTo(clampIdx(Math.round(pos.value) + Math.round(Math.asin(ratio) * 180 / Math.PI / ITEM_ANGLE))); return;
    }
    const f = cur.samples[0], l = cur.samples[cur.samples.length - 1], el2 = (l.t - f.t) / 1000;
    const paused = e.timeStamp - l.t > VEL_WINDOW;
    const vel = el2 > 0 && !paused ? (l.v - f.v) / el2 : 0;
    const p = pos.value, oob = !wrapAround && (p < 0 || p > count - 1);
    if (rm || oob || Math.abs(vel) < 2) { goTo(clampIdx(Math.round(p))); return; }
    // Arremesso: projeta onde pararia, crava numa linha inteira e vai com a velocidade da soltura.
    stopAnim();
    pos = spring(p, { k: 140, c: 24 }); pos.to(clampIdx(Math.round(p + vel * COAST))); pos.kick(vel); run(settle);
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

  // Teclado é instantâneo: repete rápido e uma animação por tecla ficaria sempre atrasada.
  el.addEventListener('keydown', (e) => {
    const i = Math.round(pos.value), moves = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    let t;
    if (e.key === 'Home') t = i - mod(i, count); else if (e.key === 'End') t = i - mod(i, count) + count - 1;
    else if (e.key in moves) t = clampIdx(i + moves[e.key]); else return;
    e.preventDefault(); stopAnim(); ptype = 'keyboard'; pos.set(t); paint(); settle();
  });
  // Roda/trackpad gira o tambor e assenta na linha mais próxima quando para.
  const onWheel = (e) => {
    e.preventDefault(); stopAnim(); ptype = 'mouse';
    const raw = pos.value + e.deltaY / ITEM_H * 0.4;
    pos.set(wrapAround ? raw : clamp(raw, -0.4, count - 1 + 0.4)); paint();
    clearTimeout(wheelT); wheelT = setTimeout(() => goTo(clampIdx(Math.round(pos.value))), 120);
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  d(() => el.removeEventListener('wheel', onWheel));

  return {
    el,
    init(v) { selected = idxOf(v); pos.set(selected); center = selected; rebuildRows(); paint(); syncAria(selected); },
    // Os botões giram a coluna pelo caminho mais curto (em colunas que dão a volta).
    setValue(v) {
      const target = idxOf(v), cur = mod(Math.round(pos.value), count); let delta = target - cur;
      if (wrapAround && Math.abs(delta) > count / 2) delta -= Math.sign(delta) * count;
      goTo(Math.round(pos.value) + delta);
    },
  };
}
