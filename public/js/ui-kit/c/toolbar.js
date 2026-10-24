// Dock de ferramentas — porte em JS puro do componente "Tool Dock" (toolbar) .
import { h, svg, ensureStyle, spring, loop, clamp, reduced, onResize, disposer, PALETTE } from '../kit.js';

const EDGE_GAP = 12, TIP_DELAY = 400, TIP_WARM = 300, TIP_OFFSET = 8, LONG_PRESS = 350, VELOCITY_WINDOW = 100;
const PROJECTION = 0.998 / (1 - 0.998); // desaceleração estilo iOS: projeta o arremesso ~0,5 s à frente
const NEXT_EDGE = { bottom: 'left', left: 'top', top: 'right', right: 'bottom' };
const vertical = (e) => e === 'left' || e === 'right';
const cl = (v, a, b) => (a > b ? (a + b) / 2 : Math.min(b, Math.max(a, v)));

// Ícones (traços do lucide) como listas de elementos SVG.
const P = (d) => ['path', { d }];
const ICONS = {
  select: [P('M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z')],
  hand: [P('M18 11V6a2 2 0 0 0-4 0'), P('M14 10V4a2 2 0 0 0-4 0v2'), P('M10 10.5V6a2 2 0 0 0-4 0v8'), P('M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15')],
  rect: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }]],
  ellipse: [['circle', { cx: 12, cy: 12, r: 10 }]],
  line: [P('M22 2 2 22')],
  pen: [P('M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z'), P('m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18'), P('m2.3 2.3 7.286 7.286'), ['circle', { cx: 11, cy: 11, r: 2 }]],
  text: [P('M12 4v16'), P('M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2'), P('M9 20h6')],
  comment: [P('M7.9 20A9 9 0 1 0 4 16.1L2 22Z')],
  gripV: [[1, 9, 12], [1, 9, 5], [1, 9, 19], [1, 15, 12], [1, 15, 5], [1, 15, 19]].map(([r, cx, cy]) => ['circle', { cx, cy, r }]),
  gripH: [[12, 9], [19, 9], [5, 9], [12, 15], [19, 15], [5, 15]].map(([cx, cy]) => ['circle', { cx, cy, r: 1 }]),
};
const ico = (name, size = 18) => svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, ICONS[name].map(([t, a]) => svg(t, a)));

const TOOLS = [
  { id: 'select', label: 'Selecionar', icon: 'select', shortcut: 'V', cursor: 'default' },
  { id: 'hand', label: 'Mão', icon: 'hand', shortcut: 'H', cursor: 'grab' },
  { id: 'shapes', label: 'Formas', icon: 'rect', tools: [
    { id: 'rect', label: 'Retângulo', icon: 'rect', shortcut: 'R', cursor: 'crosshair' },
    { id: 'ellipse', label: 'Elipse', icon: 'ellipse', shortcut: 'O', cursor: 'crosshair' },
    { id: 'line', label: 'Linha', icon: 'line', shortcut: 'L', cursor: 'crosshair' },
  ] },
  { id: 'pen', label: 'Caneta', icon: 'pen', shortcut: 'P', cursor: 'crosshair' },
  { id: 'text', label: 'Texto', icon: 'text', shortcut: 'T', cursor: 'text' },
  { id: 'comment', label: 'Comentário', icon: 'comment', shortcut: 'C', cursor: 'crosshair' },
];
const leaves = TOOLS.flatMap((t) => t.tools || [t]);
const parentOf = new Map(TOOLS.flatMap((t) => (t.tools || []).map((s) => [s.id, t.id])));

const edgeTarget = (edge, W, H, w, hh) => edge === 'top' ? { x: W / 2, y: EDGE_GAP + hh / 2 } : edge === 'left' ? { x: EDGE_GAP + w / 2, y: H / 2 } : edge === 'right' ? { x: W - EDGE_GAP - w / 2, y: H / 2 } : { x: W / 2, y: H - EDGE_GAP - hh / 2 };
const nearestEdge = (x, y, W, H) => [['bottom', H - y], ['top', y], ['left', x], ['right', W - x]].reduce((b, e) => (e[1] < b[1] ? e : b))[0];
// Onde começa a mola após girar o dock: o lado que encara a parede fica parado.
function reflowStart(edge, x, y, from, to, W, H) {
  let nx = x, ny = y;
  if (edge === 'left') nx = x - from.w / 2 + to.w / 2; else if (edge === 'right') nx = x + from.w / 2 - to.w / 2;
  else if (edge === 'top') ny = y - from.h / 2 + to.h / 2; else ny = y + from.h / 2 - to.h / 2;
  return { x: cl(nx, to.w / 2, W - to.w / 2), y: cl(ny, to.h / 2, H - to.h / 2) };
}
const isEditable = (t) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || ['textbox', 'searchbox', 'combobox', 'spinbutton'].includes(t.getAttribute('role') || ''));
const isTyping = (e) => e.isComposing || isEditable(e.composedPath()[0]) || isEditable(document.activeElement);

export default function mount(stage, ctx) {
  ensureStyle('toolbar', `
.kk-toolbar-root{width:100%;display:flex;flex-direction:column;gap:8px;padding:8px;box-sizing:border-box}
.kk-toolbar-canvas{position:relative;height:300px;overflow:hidden;border-radius:12px;border:1px solid var(--line,${PALETTE.line});background:#f8fbff radial-gradient(circle,${PALETTE.ice300} 1px,transparent 1.4px) 0 0/20px 20px}
.kk-toolbar-root.big .kk-toolbar-canvas{height:min(52vh,460px)}
.kk-toolbar-svg{position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y}
.kk-toolbar-svg.cap{touch-action:none}
.kk-toolbar-svg [data-sid]{touch-action:none}
.kk-toolbar-dock{position:absolute;top:0;left:0;z-index:10;cursor:auto;will-change:transform}
.kk-toolbar-bar{display:flex;align-items:center;gap:2px;padding:4px;border-radius:14px;border:1px solid var(--line,${PALETTE.line});background:#fff;box-shadow:0 4px 16px -6px rgba(15,53,96,.25);transition:box-shadow .2s;position:relative}
.kk-toolbar-bar.v{flex-direction:column}.kk-toolbar-bar.drag{box-shadow:0 12px 32px -8px rgba(15,53,96,.38)}
.kk-toolbar-plate{position:absolute;left:0;top:0;width:36px;height:36px;border-radius:10px;background:${PALETTE.ink};pointer-events:none;z-index:0}
.kk-toolbar-slot{position:relative;z-index:1;width:36px;height:36px;flex:none}
.kk-toolbar-btn{position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:0;border-radius:10px;background:transparent;color:${PALETTE.mut};cursor:pointer;transition:color .15s,background .15s;outline:none}
.kk-toolbar-btn:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-toolbar-btn.sel,.kk-toolbar-btn.sel:hover{background:transparent;color:#fff}
.kk-toolbar-btn:focus-visible,.kk-toolbar-mi:focus-visible,.kk-toolbar-grip:focus-visible{box-shadow:0 0 0 2px ${PALETTE.ice500}}
.kk-toolbar-more{position:absolute;right:5px;bottom:5px;width:10px;height:10px;padding:0;border:0;background:none;color:${PALETTE.ice400};cursor:pointer;display:flex;align-items:flex-end;justify-content:flex-end}
.kk-toolbar-more::before{content:'';position:absolute;inset:-9px}
.kk-toolbar-more.sel{color:rgba(255,255,255,.7)}.kk-toolbar-more:hover{color:${PALETTE.ice700}}.kk-toolbar-more.sel:hover{color:#fff}
.kk-toolbar-grip{display:flex;align-items:center;justify-content:center;width:20px;height:36px;padding:0;border:0;border-radius:6px;background:none;color:${PALETTE.ice400};cursor:grab;touch-action:none;outline:none}
.kk-toolbar-bar.v .kk-toolbar-grip{width:36px;height:20px}.kk-toolbar-grip:hover{color:${PALETTE.ink}}.kk-toolbar-bar.drag .kk-toolbar-grip{cursor:grabbing}
.kk-toolbar-sep{flex:none;width:1px;height:20px;margin:0 2px;background:${PALETTE.line}}
.kk-toolbar-bar.v .kk-toolbar-sep{width:20px;height:1px;margin:2px 0}
.kk-toolbar-tip{position:absolute;z-index:20;pointer-events:none;display:flex;align-items:center;gap:8px;white-space:nowrap;padding:5px 8px;border-radius:7px;background:${PALETTE.ink};color:#fff;font-size:12px;font-weight:500;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.kk-toolbar-tip.anim,.kk-toolbar-fly>div{animation:kk-toolbar-pop .15s cubic-bezier(.23,1,.32,1)}
@keyframes kk-toolbar-pop{from{opacity:0;transform:scale(.96)}}
.kk-toolbar-kbd{min-width:16px;padding:0 4px;border:1px solid currentColor;border-radius:4px;opacity:.7;font:11px/16px ui-monospace,monospace;text-align:center}
.kk-toolbar-fly{position:absolute;z-index:30}
.kk-toolbar-fly>div{width:176px;padding:4px;border-radius:12px;border:1px solid var(--line,${PALETTE.line});background:#fff;box-shadow:0 10px 28px -8px rgba(15,53,96,.3)}
.kk-toolbar-mi{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border:0;border-radius:8px;background:none;color:${PALETTE.mut};font-size:14px;text-align:left;cursor:pointer;outline:none;min-height:36px}
.kk-toolbar-mi span{flex:1}.kk-toolbar-mi:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-toolbar-mi[aria-checked=true]{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-toolbar-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--mut,${PALETTE.mut})}
.kk-toolbar-clear{min-height:36px;padding:0 12px;border:1px solid var(--line,${PALETTE.line});border-radius:10px;background:#fff;color:${PALETTE.ink};font-size:13px;cursor:pointer}
.kk-toolbar-clear:hover{background:${PALETTE.ice100}}.kk-toolbar-clear:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-toolbar-field{position:absolute;z-index:5;min-width:120px;padding:4px 6px;border:1.5px solid ${PALETTE.ice500};border-radius:6px;background:#fff;color:${PALETTE.ink};font-size:16px;outline:none}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  // ---- estado ----
  let current = 'select', edge = 'bottom', dragging = false, flyout = null, focusIndex = 1, hovering = false, jump = false;
  const choices = {};
  const bounds = { W: 0, H: 0, w: 0, h: 0 };
  const px = spring(0, { k: 380, c: 32 }), py = spring(0, { k: 380, c: 32 });
  const plX = spring(0, { k: 630, c: 50 }), plY = spring(0, { k: 630, c: 50 });

  // ---- DOM base ----
  const world = svg('g'), selBox = svg('rect', { fill: 'none', stroke: PALETTE.ice500, 'stroke-width': 1.5, 'stroke-dasharray': '4 3', 'pointer-events': 'none', display: 'none' });
  const layer = svg('svg', { class: 'kk-toolbar-svg', 'aria-label': 'Tela de desenho', role: 'img' }, world, selBox);
  const dock = h('div', { class: 'kk-toolbar-dock' });
  const bar = h('div', { class: 'kk-toolbar-bar', role: 'toolbar', 'aria-label': 'Ferramentas', 'aria-orientation': 'horizontal' });
  const plate = h('span', { class: 'kk-toolbar-plate', 'aria-hidden': 'true' });
  const canvas = h('div', { class: 'kk-toolbar-canvas' }, layer, dock);
  const status = h('span', { 'aria-live': 'polite' }), clearBtn = h('button', { class: 'kk-toolbar-clear', type: 'button', onclick: () => { shapes.splice(0).forEach((s) => s.el.remove()); select(null); countUp(); } }, 'Limpar tela');
  const root = h('div', { class: 'kk-toolbar-root' + (ctx?.big ? ' big' : '') }, canvas, h('div', { class: 'kk-toolbar-foot' }, status, clearBtn));
  stage.append(root);
  dock.append(bar);

  // ---- dica (tooltip) em grupo: a primeira espera, as próximas são instantâneas ----
  const tipEl = h('div', { class: 'kk-toolbar-tip', 'aria-hidden': 'true', style: 'display:none' });
  dock.append(tipEl);
  let tipTimer = 0, tipOpen = false, warmUntil = 0;
  const hideTip = () => { clearTimeout(tipTimer); if (tipOpen) warmUntil = performance.now() + TIP_WARM; tipOpen = false; tipEl.style.display = 'none'; };
  function showTip(el, label, shortcut) {
    if (dragging) return;
    clearTimeout(tipTimer);
    const reveal = (animated) => {
      const b = el.getBoundingClientRect(), dk = dock.getBoundingClientRect();
      const mx = Math.round(b.left + b.width / 2 - dk.left), my = Math.round(b.top + b.height / 2 - dk.top);
      tipEl.replaceChildren(label, shortcut ? h('kbd', { class: 'kk-toolbar-kbd' }, shortcut) : '');
      const pos = edge === 'top' ? [mx, dk.height + TIP_OFFSET, '-50%,0'] : edge === 'left' ? [dk.width + TIP_OFFSET, my, '0,-50%'] : edge === 'right' ? [-TIP_OFFSET, my, '-100%,-50%'] : [mx, -TIP_OFFSET, '-50%,-100%'];
      Object.assign(tipEl.style, { display: 'flex', left: pos[0] + 'px', top: pos[1] + 'px', transform: `translate(${pos[2]})` });
      tipEl.classList.toggle('anim', animated && !rm); tipOpen = true;
    };
    if (tipOpen || performance.now() < warmUntil) reveal(false); else tipTimer = setTimeout(() => reveal(true), TIP_DELAY);
  }
  d(() => clearTimeout(tipTimer));

  // ---- construção do dock ----
  const slots = new Map(); // id da ferramenta -> { slot, btn, tool }
  const shown = (t) => (t.tools ? (t.tools.find((s) => s.id === current) || t.tools.find((s) => s.id === choices[t.id]) || t.tools[0]) : t);
  const gripBtn = h('button', { class: 'kk-toolbar-grip', type: 'button', 'aria-label': 'Mover barra de ferramentas', 'data-dock-item': '', tabindex: '-1' });
  bar.append(gripBtn, h('span', { class: 'kk-toolbar-sep', 'aria-hidden': 'true' }));
  const renderGrip = () => gripBtn.replaceChildren(ico(vertical(edge) ? 'gripH' : 'gripV', 16));
  TOOLS.forEach((t, i) => {
    const btn = h('button', { class: 'kk-toolbar-btn', type: 'button', 'data-dock-item': '', tabindex: '-1' });
    const slot = h('div', { class: 'kk-toolbar-slot', 'data-slot': t.id }, btn);
    let more = null;
    if (t.tools) {
      more = h('button', { class: 'kk-toolbar-more', type: 'button', tabindex: '-1', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': `Mais ${t.label.toLowerCase()}`, onpointerdown: hideTip, onclick: () => toggleFlyout(t.id, false) },
        svg('svg', { viewBox: '0 0 5 5', width: 5, height: 5, 'aria-hidden': 'true' }, svg('path', { d: 'M5 0V5H0Z', fill: 'currentColor' })));
      slot.append(more);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    const press = { timer: 0, x: 0, y: 0, fired: false };
    const cancel = () => clearTimeout(press.timer);
    btn.addEventListener('pointerdown', (e) => {
      hideTip(); if (!t.tools || e.button !== 0) return;
      press.fired = false; press.x = e.clientX; press.y = e.clientY; clearTimeout(press.timer);
      press.timer = setTimeout(() => { press.fired = true; toggleFlyout(t.id, false, true); }, LONG_PRESS);
    });
    btn.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) cancel(); });
    btn.addEventListener('pointerup', cancel); btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('pointerleave', () => { cancel(); hideTip(); });
    btn.addEventListener('pointerenter', () => { const s = shown(t); showTip(btn, s.label, s.shortcut); });
    btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) { const s = shown(t); showTip(btn, s.label, s.shortcut); } });
    btn.addEventListener('blur', hideTip);
    btn.addEventListener('click', () => { if (press.fired) { press.fired = false; return; } pick(shown(t).id, false); });
    // A seta que cruza o dock abre o submenu; as que correm ao longo dele percorrem os botões.
    btn.addEventListener('keydown', (e) => {
      const across = vertical(edge) ? e.key === 'ArrowLeft' || e.key === 'ArrowRight' : e.key === 'ArrowUp' || e.key === 'ArrowDown';
      if (t.tools && across) { e.preventDefault(); toggleFlyout(t.id, true, true); }
    });
    slots.set(t.id, { slot, btn, tool: t, more });
    bar.append(slot);
  });
  bar.append(plate);

  function updateSlots() {
    for (const { btn, tool, more } of slots.values()) {
      const s = shown(tool), sel = s.id === current;
      btn.replaceChildren(ico(s.icon)); btn.classList.toggle('sel', sel);
      btn.setAttribute('aria-label', s.label); btn.setAttribute('aria-pressed', String(sel));
      if (s.shortcut) btn.setAttribute('aria-keyshortcuts', s.shortcut);
      more?.classList.toggle('sel', sel);
    }
    const act = leaves.find((l) => l.id === current);
    canvas.style.cursor = dragging ? 'grabbing' : act.cursor;
    status.textContent = `${act.label}${act.shortcut ? ' (' + act.shortcut + ')' : ''} · ${shapes.length} ${shapes.length === 1 ? 'objeto' : 'objetos'}`;
    layer.classList.toggle('cap', current !== 'select');
  }
  const countUp = () => updateSlots();

  // ---- seleção ----
  function pick(id, viaKey) {
    jump = viaKey || rm;
    current = id;
    const p = parentOf.get(id); if (p) choices[p] = id;
    if (id !== 'select') select(null);
    updateSlots(); placePlate(jump);
  }
  const itemEls = () => [...bar.querySelectorAll('[data-dock-item]')];
  const syncTab = () => itemEls().forEach((el, i) => { el.tabIndex = i === focusIndex ? 0 : -1; });

  // ---- placa deslizante ----
  function placePlate(instant) {
    const top = parentOf.get(current) || current, s = slots.get(top).slot;
    if (instant || rm) { plX.set(s.offsetLeft); plY.set(s.offsetTop); render(); } else { plX.to(s.offsetLeft); plY.to(s.offsetTop); ensureLoop(); }
  }

  // ---- submenu (flyout) ----
  let flyEl = null;
  function closeFlyout(returnFocus) {
    if (!flyout) return;
    const id = flyout.id; flyout = null;
    const old = flyEl; flyEl = null;
    slots.get(id).more?.setAttribute('aria-expanded', 'false');
    if (old) { if (rm) old.remove(); else old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100 }).onfinish = () => old.remove(); }
    if (returnFocus) slots.get(id).btn.focus();
  }
  function toggleFlyout(id, byKey, forceOpen) {
    hideTip();
    if (flyout?.id === id && !forceOpen) { closeFlyout(false); return; }
    if (flyout) closeFlyout(false);
    const { slot, tool, more } = slots.get(id);
    flyout = { id, byKey }; more.setAttribute('aria-expanded', 'true');
    const side = { bottom: 'bottom:100%;left:50%;margin-bottom:12px;', top: 'top:100%;left:50%;margin-top:12px;', left: 'left:100%;top:50%;margin-left:12px;', right: 'right:100%;top:50%;margin-right:12px;' }[edge];
    const origin = { bottom: '50% 100%', top: '50% 0%', left: '0% 50%', right: '100% 50%' }[edge];
    const menu = h('div', { role: 'menu', 'aria-label': tool.label, style: `transform-origin:${origin}` },
      tool.tools.map((sub) => h('button', { class: 'kk-toolbar-mi', type: 'button', role: 'menuitemradio', tabindex: '-1', 'aria-checked': String(sub.id === current), 'aria-keyshortcuts': sub.shortcut, onclick: () => { pick(sub.id, false); closeFlyout(byKey); } },
        ico(sub.icon, 16), h('span', sub.label), sub.shortcut && h('kbd', { class: 'kk-toolbar-kbd' }, sub.shortcut))));
    flyEl = h('div', { class: 'kk-toolbar-fly', style: side + (vertical(edge) ? 'transform:translateY(-50%)' : 'transform:translateX(-50%)') }, menu);
    slot.append(flyEl);
    // Mantém o submenu dentro da tela mesmo com o dock perto de uma quina.
    const cr = canvas.getBoundingClientRect(), mr = menu.getBoundingClientRect();
    const sx = mr.left < cr.left + 4 ? cr.left + 4 - mr.left : mr.right > cr.right - 4 ? cr.right - 4 - mr.right : 0;
    const sy = mr.top < cr.top + 4 ? cr.top + 4 - mr.top : mr.bottom > cr.bottom - 4 ? cr.bottom - 4 - mr.bottom : 0;
    if (sx || sy) flyEl.style.translate = `${sx}px ${sy}px`;
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFlyout(true); return; }
      if (e.key === 'Tab') { closeFlyout(false); return; }
      const all = [...menu.querySelectorAll('[role=menuitemradio]')], i = all.indexOf(e.target), n = all.length;
      const nx = e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowUp' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (nx !== -1) { e.preventDefault(); e.stopPropagation(); all[nx].focus(); }
    });
    if (byKey) { const all = [...menu.querySelectorAll('[role=menuitemradio]')]; (all.find((x) => x.getAttribute('aria-checked') === 'true') || all[0]).focus(); }
  }
  on(document, 'pointerdown', (e) => {
    if (!flyout) return;
    const s = e.target instanceof Element ? e.target.closest('[data-slot]') : null;
    if (s?.getAttribute('data-slot') !== flyout.id) closeFlyout(false);
  });

  // ---- posição do dock e animação ----
  let stopLoop = null;
  function render() {
    const b = bounds;
    dock.style.transform = `translate3d(${cl(px.value, b.w / 2, b.W - b.w / 2)}px,${cl(py.value, b.h / 2, b.H - b.h / 2)}px,0) translate(-50%,-50%)`;
    plate.style.transform = `translate(${plX.value}px,${plY.value}px)`;
  }
  function ensureLoop() {
    if (stopLoop) return;
    stopLoop = loop((dt) => {
      let all = true;
      for (const s of [px, py, plX, plY]) { s.step(dt); if (!s.settled) all = false; }
      render();
      if (all) { stopLoop(); stopLoop = null; }
    });
  }
  d(() => stopLoop?.());
  let fromSize = null, pendingV = { x: 0, y: 0 };
  function settle(velocity) {
    const W = canvas.clientWidth, H = canvas.clientHeight, size = { w: dock.offsetWidth, h: dock.offsetHeight };
    Object.assign(bounds, { W, H, ...size });
    const tg = edgeTarget(edge, W, H, size.w, size.h);
    if (!velocity || rm) { px.set(tg.x); py.set(tg.y); render(); placePlate(true); return; }
    const from = fromSize; fromSize = null;
    if (from && (from.w !== size.w || from.h !== size.h)) { const st = reflowStart(edge, px.value, py.value, from, size, W, H); px.set(st.x); py.set(st.y); }
    px.to(tg.x); py.to(tg.y); px.kick(velocity.x); py.kick(velocity.y);
    placePlate(false); ensureLoop();
  }
  function applyEdge() {
    bar.classList.toggle('v', vertical(edge)); bar.setAttribute('aria-orientation', vertical(edge) ? 'vertical' : 'horizontal');
    renderGrip(); syncTab();
  }
  function dockTo(next, velocity) {
    if (next === edge) { settle(velocity); return; }
    closeFlyout(false); hideTip();
    fromSize = { w: dock.offsetWidth, h: dock.offsetHeight };
    edge = next; applyEdge(); settle(velocity);
  }
  d(onResize(canvas, () => { if (!dragging) settle(null); }));

  // ---- arrastar a alça ----
  let dr = null;
  const velocityOf = (samples, now) => {
    const rec = samples.filter((s) => now - s.t <= VELOCITY_WINDOW), f = rec[0], l = rec[rec.length - 1];
    if (!f || !l || rec.length < 2) return { x: 0, y: 0, cx: 0, cy: 0 };
    const dt = Math.max(1, l.t - f.t);
    return { x: (l.x - f.x) / dt, y: (l.y - f.y) / dt, cx: (l.cx - f.cx) / dt, cy: (l.cy - f.cy) / dt };
  };
  gripBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); gripBtn.setPointerCapture(e.pointerId);
    px.set(px.value); py.set(py.value);
    const r = canvas.getBoundingClientRect(), b = bounds;
    const x = cl(px.value, b.w / 2, b.W - b.w / 2), y = cl(py.value, b.h / 2, b.H - b.h / 2);
    px.set(x); py.set(y);
    dr = { dx: e.clientX - r.left - x, dy: e.clientY - r.top - y, left: r.left, top: r.top, samples: [{ t: e.timeStamp, x, y, cx: x, cy: y }] };
    hideTip(); closeFlyout(false); dragging = true; bar.classList.add('drag'); updateSlots();
  });
  gripBtn.addEventListener('pointermove', (e) => {
    if (!dr) return;
    const hw = dock.offsetWidth / 2, hh = dock.offsetHeight / 2;
    const x = e.clientX - dr.left - dr.dx, y = e.clientY - dr.top - dr.dy;
    const cx = cl(x, hw, canvas.clientWidth - hw), cy = cl(y, hh, canvas.clientHeight - hh);
    px.set(cx); py.set(cy); render();
    dr.samples.push({ t: e.timeStamp, x, y, cx, cy }); if (dr.samples.length > 8) dr.samples.shift();
  });
  const gripUp = (e) => {
    if (!dr) return;
    const s = dr; dr = null; dragging = false; bar.classList.remove('drag'); updateSlots();
    const v = velocityOf(s.samples, e.timeStamp), w = canvas.clientWidth, hgt = canvas.clientHeight, from = s.samples[s.samples.length - 1];
    // Projeta para onde o arremesso ia (pelo ponteiro, para poder lançar ao longo de uma parede) e encaixa na borda mais próxima.
    dockTo(nearestEdge(cl(from.x + v.x * PROJECTION, 0, w), cl(from.y + v.y * PROJECTION, 0, hgt), w, hgt), { x: v.cx * 1000, y: v.cy * 1000 });
  };
  gripBtn.addEventListener('pointerup', gripUp); gripBtn.addEventListener('lostpointercapture', gripUp);
  gripBtn.addEventListener('pointerenter', () => showTip(gripBtn, 'Arraste para encaixar'));
  gripBtn.addEventListener('pointerleave', hideTip); gripBtn.addEventListener('blur', hideTip);
  gripBtn.addEventListener('focus', () => { if (gripBtn.matches(':focus-visible')) showTip(gripBtn, 'Arraste, ou Enter para mover'); });
  gripBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dockTo(NEXT_EDGE[edge], { x: 0, y: 0 }); } });

  // ---- foco itinerante ----
  on(bar, 'keydown', (e) => {
    const items = itemEls(), i = items.indexOf(e.target); if (i === -1) return;
    const v = vertical(edge), n = items.length;
    const to = e.key === (v ? 'ArrowDown' : 'ArrowRight') ? (i + 1) % n : e.key === (v ? 'ArrowUp' : 'ArrowLeft') ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to !== -1) { e.preventDefault(); items[to].focus(); }
  });
  on(bar, 'focusin', (e) => { const i = itemEls().indexOf(e.target); if (i !== -1) { focusIndex = i; syncTab(); } });

  // ---- atalhos de tecla única (só com foco/ponteiro sobre a tela) ----
  const shortcutMap = new Map(leaves.filter((l) => l.shortcut).map((l) => [l.shortcut.toLowerCase(), l.id]));
  on(root, 'pointerenter', (e) => { hovering = e.pointerType !== 'touch'; });
  on(root, 'pointerleave', () => { hovering = false; });
  on(window, 'keydown', (e) => {
    if (e.key === 'Escape') { closeFlyout(false); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.defaultPrevented || isTyping(e)) return;
    const f = document.activeElement, idle = !f || f === document.body, inside = root.contains(f) || (hovering && idle);
    if (!inside) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); removeShape(selected); return; }
    const id = shortcutMap.get(e.key.toLowerCase());
    if (id) { e.preventDefault(); pick(id, true); }
  });

  // ---- tela de desenho: as ferramentas fazem de verdade ----
  const shapes = []; let selected = null, pan = { x: 0, y: 0 }, sid = 0, comments = 0;
  const STROKE = PALETTE.ice700, FILL = 'rgba(79,149,210,.22)';
  function build(s) {
    const g = svg('g', { 'data-sid': s.id, transform: `translate(${s.tx},${s.ty})` });
    let body;
    if (s.type === 'rect') body = svg('rect', { rx: 6, fill: FILL, stroke: STROKE, 'stroke-width': 2 });
    else if (s.type === 'ellipse') body = svg('ellipse', { fill: FILL, stroke: STROKE, 'stroke-width': 2 });
    else if (s.type === 'line') body = svg('line', { stroke: STROKE, 'stroke-width': 3, 'stroke-linecap': 'round' });
    else if (s.type === 'pen') body = svg('path', { fill: 'none', stroke: PALETTE.ink, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    else if (s.type === 'text') body = svg('text', { fill: PALETTE.ink, 'font-size': 18, 'font-weight': 600, 'dominant-baseline': 'hanging', style: 'user-select:none' });
    else { body = svg('g', {}, svg('circle', { r: 13, fill: PALETTE.ice600, stroke: '#fff', 'stroke-width': 2 }), svg('text', { fill: '#fff', 'font-size': 12, 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: 'user-select:none' }, String(s.n)), svg('text', { x: 20, fill: PALETTE.ink, 'font-size': 13, 'dominant-baseline': 'central', style: 'user-select:none;paint-order:stroke;stroke:#fff;stroke-width:4px' }, s.text)); }
    g.append(body); s.body = body; s.el = g; world.append(g); paint(s);
  }
  function paint(s) {
    const b = s.body;
    if (s.type === 'rect') { b.setAttribute('x', Math.min(s.x, s.x2)); b.setAttribute('y', Math.min(s.y, s.y2)); b.setAttribute('width', Math.abs(s.x2 - s.x)); b.setAttribute('height', Math.abs(s.y2 - s.y)); }
    else if (s.type === 'ellipse') { b.setAttribute('cx', (s.x + s.x2) / 2); b.setAttribute('cy', (s.y + s.y2) / 2); b.setAttribute('rx', Math.abs(s.x2 - s.x) / 2); b.setAttribute('ry', Math.abs(s.y2 - s.y) / 2); }
    else if (s.type === 'line') { b.setAttribute('x1', s.x); b.setAttribute('y1', s.y); b.setAttribute('x2', s.x2); b.setAttribute('y2', s.y2); }
    else if (s.type === 'pen') b.setAttribute('d', 'M' + s.pts.map((p) => p.join(' ')).join('L'));
    else if (s.type === 'text') { b.setAttribute('x', s.x); b.setAttribute('y', s.y); b.textContent = s.text; }
    else b.setAttribute('transform', `translate(${s.x},${s.y})`);
  }
  function add(s) { s.id = ++sid; s.tx = 0; s.ty = 0; shapes.push(s); build(s); updateSlots(); return s; }
  function removeShape(s) { s.el.remove(); shapes.splice(shapes.indexOf(s), 1); select(null); updateSlots(); }
  function select(s) {
    selected = s;
    if (!s) { selBox.setAttribute('display', 'none'); return; }
    const bb = s.el.getBBox(), pad = 5;
    selBox.setAttribute('transform', `translate(${pan.x + s.tx},${pan.y + s.ty})`);
    selBox.setAttribute('x', bb.x - pad); selBox.setAttribute('y', bb.y - pad); selBox.setAttribute('width', bb.width + pad * 2); selBox.setAttribute('height', bb.height + pad * 2); selBox.setAttribute('display', 'block');
  }
  const applyPan = () => { world.setAttribute('transform', `translate(${pan.x},${pan.y})`); canvas.style.backgroundPosition = `${pan.x}px ${pan.y}px`; if (selected) select(selected); };

  function field(x, y, placeholder, done) {
    const inp = h('input', { class: 'kk-toolbar-field', type: 'text', placeholder, 'aria-label': placeholder, maxlength: '40' });
    inp.style.left = Math.min(x, canvas.clientWidth - 140) + 'px'; inp.style.top = y + 'px';
    let finished = false;
    const end = (ok) => { if (finished) return; finished = true; const v = inp.value.trim(); inp.remove(); if (ok && v) done(v); };
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false); });
    inp.addEventListener('blur', () => end(true));
    canvas.append(inp); setTimeout(() => inp.focus(), 0);
  }

  let act = null;
  layer.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = layer.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, wx = x - pan.x, wy = y - pan.y;
    if (current === 'select') {
      const g = e.target.closest?.('[data-sid]'), s = g && shapes.find((q) => q.id === +g.dataset.sid);
      select(s || null);
      if (s) { layer.setPointerCapture(e.pointerId); act = { kind: 'move', s, ox: x - s.tx, oy: y - s.ty }; }
      return;
    }
    layer.setPointerCapture(e.pointerId);
    if (current === 'hand') { act = { kind: 'pan', ox: x - pan.x, oy: y - pan.y }; canvas.style.cursor = 'grabbing'; return; }
    if (current === 'text') { field(x, y - 14, 'Digite o texto', (v) => add({ type: 'text', x: wx, y: wy - 9, text: v })); act = null; return; }
    if (current === 'comment') { field(x + 18, y - 14, 'Escreva um comentário', (v) => add({ type: 'comment', x: wx, y: wy, text: v, n: ++comments })); act = null; return; }
    if (current === 'pen') { act = { kind: 'draw', s: add({ type: 'pen', pts: [[wx, wy]] }) }; return; }
    const s = add({ type: current, x: wx, y: wy, x2: wx, y2: wy });
    act = { kind: 'draw', s, sx: wx, sy: wy, moved: false };
  });
  layer.addEventListener('pointermove', (e) => {
    if (!act) return;
    const r = layer.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (act.kind === 'pan') { pan = { x: x - act.ox, y: y - act.oy }; applyPan(); }
    else if (act.kind === 'move') { act.s.tx = x - act.ox; act.s.ty = y - act.oy; act.s.el.setAttribute('transform', `translate(${act.s.tx},${act.s.ty})`); select(act.s); }
    else if (act.s.type === 'pen') { act.s.pts.push([x - pan.x, y - pan.y]); paint(act.s); }
    else { act.s.x2 = x - pan.x; act.s.y2 = y - pan.y; if (Math.hypot(act.s.x2 - act.sx, act.s.y2 - act.sy) > 4) act.moved = true; paint(act.s); }
  });
  const endAct = () => {
    if (!act) return;
    const a = act; act = null; updateSlots();
    if (a.kind !== 'draw') return;
    const s = a.s;
    if (s.type === 'pen') { if (s.pts.length < 3) removeShape(s); return; }
    if (a.moved) return;
    // Um clique simples cria uma forma de tamanho padrão (útil no toque).
    if (s.type === 'line') { removeShape(s); return; }
    s.x2 = s.x + 90; s.y2 = s.y + 60; s.x -= 0; paint(s);
  };
  layer.addEventListener('pointerup', endAct); layer.addEventListener('pointercancel', endAct);

  // Peças iniciais para a tela não nascer vazia.
  const seed = (s) => add(s);
  seed({ type: 'rect', x: 34, y: 38, x2: 138, y2: 104 });
  seed({ type: 'ellipse', x: 170, y: 52, x2: 244, y2: 118 });
  seed({ type: 'text', x: 38, y: 122, text: 'Campanha de abril' });
  seed({ type: 'comment', x: 196, y: 140, text: 'Revisar meta', n: ++comments });

  applyEdge(); updateSlots(); syncTab(); settle(null);
  // O dock é medido na primeira pintura (fontes/ícones já no lugar).
  requestAnimationFrame(() => settle(null));
  return () => { d.run(); root.remove(); };
}
