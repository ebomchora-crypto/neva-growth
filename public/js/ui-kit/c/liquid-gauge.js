// Liquid Gauge — porte em JS puro do componente "Liquid Gauge" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, clamp, reduced, disposer } from '../kit.js';

// A superfície é uma fileira de colunas ligadas por molas: um empurrão viaja de lado a lado.
const COLUMNS = 28, STEP = 1 / 120, SPREAD = 2600, RESTORE = 18, SURFACE_DAMPING = 2.2;
// A linha de nível segue o valor numa mola subamortecida (passa um pouco e assenta, como um copo servido).
const LEVEL_STIFFNESS = 90, LEVEL_DAMPING = 11;
const SLOSH = 4.5, STIR = 20, MAX_WAVE = 26, RIM = 3, BUBBLES = 10, BUBBLE_RATE = 0.06, REST_EPSILON = 0.02;
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export default function mount(stage, ctx) {
  ensureStyle('liquid-gauge', `
.kk-liquid-gauge-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;padding:8px 0}
.kk-liquid-gauge-root{position:relative;width:min(100%,300px);height:${ctx.big ? 400 : 340}px;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;outline:none;cursor:ns-resize}
.kk-liquid-gauge-root:focus-visible{box-shadow:0 0 0 3px var(--ice-400,#7fb4e0)}
.kk-liquid-gauge-root.ro{cursor:default}
.kk-liquid-gauge-root.drag{cursor:grabbing}
.kk-liquid-gauge-rim,.kk-liquid-gauge-liquid{position:absolute;inset:0;pointer-events:none;transition:background-color .3s ease-out}
.kk-liquid-gauge-rim{background:var(--ice-300,#a5cdee)}
.kk-liquid-gauge-liquid{background:var(--ice-700,#1f5f9b);color:#fff}
.kk-liquid-gauge-root.warn .kk-liquid-gauge-rim{background:#f0a3a8}
.kk-liquid-gauge-root.warn .kk-liquid-gauge-liquid{background:#d1434b}
.kk-liquid-gauge-top{position:absolute;inset:0 0 auto 0;padding:24px}
.kk-liquid-gauge-label{margin:0;font-weight:600;font-size:14px}
.kk-liquid-gauge-pct{margin:12px 0 0;font-weight:700;font-size:56px;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.kk-liquid-gauge-pct small{margin-left:2px;font-size:28px;font-weight:500;opacity:.6}
.kk-liquid-gauge-sub{margin:6px 0 0;font-size:13px;opacity:.65;font-variant-numeric:tabular-nums}
.kk-liquid-gauge-status{position:absolute;left:24px;bottom:24px;margin:0;font-weight:600;font-size:14px}
.kk-liquid-gauge-ticks{position:absolute;inset:0 0 0 auto;width:16px}
.kk-liquid-gauge-ticks i{position:absolute;right:0;height:1px;background:currentColor;opacity:.3;width:6px}
.kk-liquid-gauge-ticks i.mid{width:12px}
.kk-liquid-gauge-bubble{position:absolute;top:0;left:0;width:8px;height:8px;border-radius:50%;border:1px solid currentColor;background:rgba(255,255,255,.2);opacity:0}
.kk-liquid-gauge-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.kk-liquid-gauge-btn{min-height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--line,#d3e6f6);background:var(--ice-50,#f2f8fe);color:var(--ink,#0e2236);font:600 13px/1 inherit;font-family:inherit;cursor:pointer}
.kk-liquid-gauge-btn:hover{background:var(--ice-100,#e3f0fb)}
.kk-liquid-gauge-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-liquid-gauge-hint{margin:0;font-size:12px;color:var(--mut,#4a6f93);text-align:center}
`);
  const dispose = disposer();
  const label = 'Armazenamento de arquivos', total = 128, unit = 'GB', warnAt = 90;
  const noMotion = reduced();

  const s = {
    heights: new Float64Array(COLUMNS), speeds: new Float64Array(COLUMNS),
    level: 72, levelSpeed: 0, target: 72, width: 0, height: 0,
    bubbles: Array.from({ length: BUBBLES }, () => ({ x: 0, y: 0, r: 0, speed: 0, phase: 0, alive: false })),
    spawn: 0, shown: 72, raf: 0, last: 0, carry: 0, time: 0, pointerX: -1, pointerId: -1, visible: true,
  };
  let value = 72;

  // O texto existe duas vezes: uma na cor do fundo, outra (clipada junto com o líquido) em branco.
  const copies = [];
  const textBlock = () => {
    const pct = h('span', {}, '72'), used = h('span', {}, '');
    const top = h('div', { class: 'kk-liquid-gauge-top' },
      h('p', { class: 'kk-liquid-gauge-label' }, label),
      h('p', { class: 'kk-liquid-gauge-pct' }, pct, h('small', {}, '%')),
      h('p', { class: 'kk-liquid-gauge-sub' }, used, ` de ${total} ${unit} usados`));
    const status = h('p', { class: 'kk-liquid-gauge-status' }, '');
    const ticks = h('div', { class: 'kk-liquid-gauge-ticks' }, TICKS.map((t) => h('i', { class: t === 50 ? 'mid' : '', style: `top:${100 - t}%` })));
    copies.push({ pct, used, status });
    return [top, status, ticks];
  };

  const rim = h('div', { class: 'kk-liquid-gauge-rim', 'aria-hidden': 'true' });
  const bubbleEls = Array.from({ length: BUBBLES }, () => h('span', { class: 'kk-liquid-gauge-bubble' }));
  const liquid = h('div', { class: 'kk-liquid-gauge-liquid', 'aria-hidden': 'true' }, ...textBlock(), ...bubbleEls);
  const root = h('div', { class: 'kk-liquid-gauge-root', role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100' });
  root.append(...textBlock(), rim, liquid);

  const polygon = (levelY, lift) => {
    let p = '';
    for (let i = 0; i < COLUMNS; i++) {
      const x = (i / (COLUMNS - 1)) * s.width;
      const y = clamp(levelY + s.heights[i] - lift, -40, s.height + 40);
      p += `${x.toFixed(1)}px ${y.toFixed(1)}px,`;
    }
    return `polygon(${p}${s.width}px ${s.height + 40}px,0px ${s.height + 40}px)`;
  };
  const flat = (v, lift = 0) => `polygon(0% calc(${100 - v}% - ${lift}px),100% calc(${100 - v}% - ${lift}px),100% 100%,0% 100%)`;
  const usedText = (v) => ((Math.round(v) / 100) * total).toFixed(1).replace('.', ',');

  const syncTexts = () => {
    const warn = value >= warnAt;
    root.classList.toggle('warn', warn);
    const status = warn ? 'Quase cheio' : `${100 - Math.round(value)}% livre`;
    for (const c of copies) { c.status.textContent = status; c.used.textContent = usedText(s.shown); c.pct.textContent = String(s.shown); }
    root.setAttribute('aria-valuenow', String(Math.round(value)));
    root.setAttribute('aria-valuetext', `${Math.round(value)}%, ${usedText(value)} de ${total} ${unit} usados`);
  };

  const draw = () => {
    if (!s.width || !s.height) return;
    const levelY = s.height * (1 - s.level / 100);
    liquid.style.clipPath = polygon(levelY, 0);
    rim.style.clipPath = polygon(levelY, RIM);
    s.bubbles.forEach((b, i) => {
      const n = bubbleEls[i];
      if (!b.alive) { n.style.opacity = '0'; return; }
      const sway = Math.sin(s.time * 7 + b.phase) * 2.5;
      n.style.opacity = '1';
      n.style.transform = `translate3d(${(b.x + sway - b.r).toFixed(1)}px,${(b.y - b.r).toFixed(1)}px,0) scale(${(b.r / 4).toFixed(3)})`;
    });
    const shown = Math.round(clamp(s.level, 0, 100));
    if (shown !== s.shown) { s.shown = shown; for (const c of copies) { c.pct.textContent = String(shown); c.used.textContent = usedText(shown); } }
  };

  const spawnBubbles = (dt) => {
    s.spawn += Math.max(0, s.levelSpeed) * BUBBLE_RATE * dt;
    while (s.spawn >= 1) {
      s.spawn -= 1;
      const free = s.bubbles.find((b) => !b.alive);
      if (!free) { s.spawn = 0; break; }
      Object.assign(free, { alive: true, x: s.width * (0.12 + Math.random() * 0.76), y: s.height - 6, r: 1.5 + Math.random() * 2.5, speed: 70 + Math.random() * 80, phase: Math.random() * Math.PI * 2 });
    }
  };
  const advanceBubbles = (dt) => {
    const levelY = s.height * (1 - s.level / 100);
    let alive = 0;
    for (const b of s.bubbles) {
      if (!b.alive) continue;
      b.y -= b.speed * dt;
      const i = clamp(Math.round((b.x / s.width) * (COLUMNS - 1)), 0, COLUMNS - 1);
      // Ao chegar na superfície a bolha estoura e deixa uma covinha.
      if (b.y - b.r <= levelY + s.heights[i]) { b.alive = false; s.speeds[i] += b.r * 6; } else alive++;
    }
    return alive;
  };
  const step = () => {
    s.levelSpeed += ((s.target - s.level) * LEVEL_STIFFNESS - s.levelSpeed * LEVEL_DAMPING) * STEP;
    s.level += s.levelSpeed * STEP;
    let energy = Math.abs(s.target - s.level) + Math.abs(s.levelSpeed) * 0.1;
    for (let i = 0; i < COLUMNS; i++) {
      const l = s.heights[i > 0 ? i - 1 : i], r = s.heights[i < COLUMNS - 1 ? i + 1 : i];
      s.speeds[i] += ((l + r - 2 * s.heights[i]) * SPREAD - s.heights[i] * RESTORE - s.speeds[i] * SURFACE_DAMPING) * STEP;
    }
    for (let i = 0; i < COLUMNS; i++) {
      s.heights[i] = clamp(s.heights[i] + s.speeds[i] * STEP, -MAX_WAVE, MAX_WAVE);
      energy = Math.max(energy, Math.abs(s.heights[i]), Math.abs(s.speeds[i]) * 0.1);
    }
    s.time += STEP;
    return energy;
  };
  const tick = (now) => {
    s.raf = 0;
    const elapsed = s.last ? Math.min((now - s.last) / 1000, 0.05) : STEP;
    s.last = now; s.carry += elapsed;
    let energy = 0;
    while (s.carry >= STEP) { energy = Math.max(energy, step()); s.carry -= STEP; }
    spawnBubbles(elapsed);
    const bubbles = advanceBubbles(elapsed);
    draw();
    const busy = s.pointerId >= 0 || bubbles > 0 || energy > REST_EPSILON;
    if (busy && s.visible) s.raf = requestAnimationFrame(tick);
    else {
      s.last = 0;
      if (!busy) { // assenta exatamente, para a superfície em repouso ficar plana
        s.level = s.target; s.levelSpeed = 0; s.heights.fill(0); s.speeds.fill(0); draw();
      }
    }
  };
  const wake = () => { if (!s.raf && s.visible) s.raf = requestAnimationFrame(tick); };

  const setValue = (next) => {
    value = Math.round(clamp(next, 0, 100));
    s.target = value;
    syncTexts();
    if (noMotion) { s.level = value; s.levelSpeed = 0; s.shown = value; syncTexts(); draw(); } else wake();
  };

  // Visibilidade: fora da tela ou aba escondida, o laço espera.
  let onScreen = true;
  const updateVisible = () => {
    s.visible = onScreen && !document.hidden;
    if (!s.visible && s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; } else if (s.visible) wake();
  };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; updateVisible(); });
  io.observe(root); dispose(() => io.disconnect());
  document.addEventListener('visibilitychange', updateVisible); dispose(() => document.removeEventListener('visibilitychange', updateVisible));
  const ro = new ResizeObserver(([e]) => { s.width = e.contentRect.width; s.height = e.contentRect.height; draw(); });
  ro.observe(root); dispose(() => ro.disconnect());
  dispose(() => cancelAnimationFrame(s.raf));

  const valueAt = (y) => { const r = root.getBoundingClientRect(); return (1 - (y - r.top) / r.height) * 100; };
  // Empurra as colunas em torno de x, com queda suave.
  const disturb = (clientX, amount, reach = 3) => {
    if (noMotion) return;
    const r = root.getBoundingClientRect();
    const center = ((clientX - r.left) / r.width) * (COLUMNS - 1);
    for (let i = 0; i < COLUMNS; i++) { const f = 1 - Math.abs(i - center) / reach; if (f > 0) s.speeds[i] += amount * f; }
  };

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    root.setPointerCapture(e.pointerId);
    s.pointerId = e.pointerId; s.pointerX = e.clientX; root.classList.add('drag');
    disturb(e.clientX, 260, 2.5); // o toque cai como uma gota
    setValue(valueAt(e.clientY)); wake();
  });
  root.addEventListener('pointermove', (e) => {
    const dx = s.pointerX < 0 ? 0 : e.clientX - s.pointerX;
    s.pointerX = e.clientX;
    if (s.pointerId === e.pointerId) {
      // Arrastar de lado balança o corpo todo: um lado sobe, o outro desce.
      if (!noMotion) for (let i = 0; i < COLUMNS; i++) s.speeds[i] += ((i / (COLUMNS - 1)) * 2 - 1) * dx * SLOSH;
      setValue(valueAt(e.clientY)); return;
    }
    if (noMotion || e.pointerType !== 'mouse' || dx === 0) return;
    const r = root.getBoundingClientRect();
    if (e.clientY - r.top > r.height * (1 - s.level / 100) + 8) { disturb(e.clientX, Math.abs(dx) * STIR, 2); wake(); }
  });
  const release = (e) => {
    if (s.pointerId !== e.pointerId) return;
    s.pointerId = -1; root.classList.remove('drag'); navigator.vibrate?.(6); wake();
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('lostpointercapture', release);
  root.addEventListener('pointerleave', () => { if (s.pointerId < 0) s.pointerX = -1; });
  root.addEventListener('keydown', (e) => {
    const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };
    let next;
    if (e.key in steps) next = value + steps[e.key] * (e.shiftKey ? 10 : 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === undefined) return;
    e.preventDefault();
    const r = root.getBoundingClientRect();
    disturb(r.left + r.width / 2, next > value ? 120 : -120, 4); // tecla também faz uma marolinha
    setValue(next);
  });

  const btn = (text, delta) => h('button', { type: 'button', class: 'kk-liquid-gauge-btn', onClick: () => {
    const r = root.getBoundingClientRect();
    disturb(r.left + r.width / 2, delta > 0 ? 160 : -160, 5);
    setValue(value + delta);
  } }, text);

  stage.append(h('div', { class: 'kk-liquid-gauge-wrap' },
    root,
    h('div', { class: 'kk-liquid-gauge-btns' }, btn('Liberar 13 GB', -10), btn('Enviar 13 GB', 10), btn('Encher', 100 - value + 100)),
    h('p', { class: 'kk-liquid-gauge-hint' }, 'Arraste na vertical para ajustar; de lado, para balançar. Setas do teclado também funcionam.')));

  s.shown = 72; syncTexts(); draw();
  return () => dispose.run();
}
