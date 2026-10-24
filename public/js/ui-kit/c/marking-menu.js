// Menu radial — porte em JS puro do componente "Marking Menu" .
import { h, svg, ensureStyle, spring, loop, reduced, disposer, PALETTE } from '../kit.js';

// Segure ~180 ms sem mover e o menu aparece sob o dedo; mova mais que FLICK antes disso e só o traço decide.
const HOLD_MS = 180, FLICK = 36, DEAD_ZONE = 24, DISC = 112, RING = 78, HUB = 30, LEAN = 7, TRAIL_MS = 260;
const MOVE_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
const round = (n) => Math.round(n * 100) / 100;

const P = (d) => ['path', { d }];
const ICONS = {
  home: [P('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'), P('M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z')],
  inbox: [P('M22 12h-6l-2 3h-4l-2-3H2'), P('M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z')],
  calendar: [['rect', { width: 18, height: 18, x: 3, y: 4, rx: 2 }], P('M8 2v4'), P('M16 2v4'), P('M3 10h18'), P('M8 14h.01'), P('M12 14h.01'), P('M16 14h.01'), P('M8 18h.01'), P('M12 18h.01')],
  folder: [P('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z')],
  search: [['circle', { cx: 11, cy: 11, r: 8 }], P('m21 21-4.3-4.3')],
  pen: [P('M12 20h9'), P('M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z')],
  user: [P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), ['circle', { cx: 12, cy: 7, r: 4 }]],
  cog: [P('M12 15a3 3 0 100-6 3 3 0 000 6M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.7h4l.4-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2')],
};
const ico = (n, size = 18) => svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, ICONS[n].map(([t, a]) => svg(t, a)));

const ITEMS = [
  { id: 'inicio', label: 'Início', icon: 'home', title: 'Resumo do dia', text: 'Você tem 5 tarefas para hoje e 2 propostas aguardando resposta.' },
  { id: 'entrada', label: 'Entrada', icon: 'inbox', title: 'Caixa de entrada', text: '3 mensagens novas de clientes. A mais antiga chegou há 12 minutos.' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar', title: 'Agenda', text: 'Próxima reunião: demonstração com a Padaria Aurora, às 15h.' },
  { id: 'arquivos', label: 'Arquivos', icon: 'folder', title: 'Arquivos', text: '18 arquivos, entre contratos, propostas e planilhas de preço.' },
  { id: 'buscar', label: 'Buscar', icon: 'search', title: 'Busca', text: 'Encontre clientes, pedidos e conversas em um só lugar.' },
  { id: 'escrever', label: 'Escrever', icon: 'pen', title: 'Nova mensagem', text: 'Rascunho salvo: "Olá, segue a proposta que combinamos…"' },
  { id: 'perfil', label: 'Perfil', icon: 'user', title: 'Seu perfil', text: 'Marina Duarte · Plano Pro · membro desde março de 2024.' },
  { id: 'ajustes', label: 'Ajustes', icon: 'cog', title: 'Ajustes', text: 'Notificações ligadas, idioma português (Brasil).' },
];
const count = ITEMS.length, step = 360 / count;

// Índice do item para uma direção (sentido horário a partir do topo); -1 se o gesto for curto demais.
function pick(dx, dy) {
  if (Math.hypot(dx, dy) < DEAD_ZONE) return -1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return Math.round((((angle % 360) + 360) % 360) / step) % count;
}
// Setor de anel apontando para cima, com `span` graus de abertura.
function sectorPath(span) {
  const half = ((span / 2 - 1.5) * Math.PI) / 180, inner = HUB + 5, outer = DISC - 5;
  const pt = (r, a) => `${round(r * Math.sin(a))} ${round(-r * Math.cos(a))}`;
  return [`M${pt(inner, -half)}`, `L${pt(outer, -half)}`, `A${outer} ${outer} 0 0 1 ${pt(outer, half)}`, `L${pt(inner, half)}`, `A${inner} ${inner} 0 0 0 ${pt(inner, -half)}`, 'Z'].join(' ');
}
const haptic = () => { if ('vibrate' in navigator) navigator.vibrate(4); };

export default function mount(stage, ctx) {
  ensureStyle('marking-menu', `
.kk-marking-menu-root{position:relative;width:100%;height:${ctx?.big ? 'min(62vh,560px)' : '400px'};overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:crosshair;color:${PALETTE.ink}}
.kk-marking-menu-root.open{cursor:default}
.kk-marking-menu-page{position:absolute;inset:0;display:flex;flex-direction:column;padding:18px;pointer-events:none}
.kk-marking-menu-cur{display:flex;align-items:center;gap:10px;padding-right:76px}
.kk-marking-menu-cur i{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--line,${PALETTE.line});border-radius:10px;background:#fff;flex:none}
.kk-marking-menu-cur b{font-size:14px;font-weight:600}
.kk-marking-menu-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:0 8px}
.kk-marking-menu-mid p{margin:0;font-size:14px;line-height:1.5;color:${PALETTE.mut};max-width:280px}.kk-marking-menu-mid small{font-size:12px;color:${PALETTE.ice500}}
.kk-marking-menu-mid strong{font-size:15px;color:${PALETTE.ink}}
.kk-marking-menu-trail{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${PALETTE.ice400}}
.kk-marking-menu-btn{position:absolute;top:14px;right:14px;min-height:36px;padding:0 14px;border:1px solid var(--line,${PALETTE.line});border-radius:10px;background:#fff;color:${PALETTE.mut};font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:color .15s}
.kk-marking-menu-btn:hover{color:${PALETTE.ink}}.kk-marking-menu-btn:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
.kk-marking-menu-menu{position:absolute;outline:none}
.kk-marking-menu-disc{position:absolute;inset:0;border-radius:50%;border:1px solid var(--line,${PALETTE.line});background:#fff;box-shadow:0 8px 30px rgba(15,53,96,.2)}
.kk-marking-menu-wedge{position:absolute;inset:0;opacity:0;transition:opacity .12s}
.kk-marking-menu-wedge svg{overflow:visible}.kk-marking-menu-wedge path{fill:${PALETTE.ice100}}
.kk-marking-menu-it{position:absolute;top:50%;left:50%;display:flex;align-items:center;justify-content:center;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;color:${PALETTE.ice400};transition:transform .26s cubic-bezier(.34,1.45,.64,1),opacity .15s,color .15s}
.kk-marking-menu-it.on{color:${PALETTE.ink}}
.kk-marking-menu-hub{position:absolute;top:50%;left:50%;display:flex;align-items:center;justify-content:center;width:${HUB * 2}px;height:${HUB * 2}px;margin:-${HUB}px 0 0 -${HUB}px;border-radius:50%;border:1px solid var(--line,${PALETTE.line});background:${PALETTE.ice50}}
.kk-marking-menu-hub span{font-size:11px;font-weight:500;color:${PALETTE.mut};text-align:center;line-height:1.1;max-width:56px}
.kk-marking-menu-aim{position:absolute;inset:0;opacity:0;transition:opacity .1s}.kk-marking-menu-aim i{position:absolute;top:3px;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:${PALETTE.ink}}
.kk-marking-menu-flash{position:absolute;display:flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--line,${PALETTE.line});border-radius:999px;background:#fff;box-shadow:0 1px 4px rgba(15,53,96,.15);font-size:12px;font-weight:500;pointer-events:none}
@media (prefers-reduced-motion:reduce){.kk-marking-menu-it{transition:opacity .15s,color .15s}}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  let open = null, selected = -1, current = ITEMS[0], gesture = null, trailFrame = 0;
  const trailPoints = [];
  const wedge = spring(0, { k: 520, c: 36 });
  let stopWedge = null;

  // ---- DOM base ----
  const curIcon = h('i'), curLabel = h('b');
  const midBody = h('div', { class: 'kk-marking-menu-mid', 'aria-live': 'polite' });
  const page = h('div', { class: 'kk-marking-menu-page' }, h('div', { class: 'kk-marking-menu-cur' }, curIcon, curLabel), midBody);
  const trailPath = svg('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const trail = svg('svg', { class: 'kk-marking-menu-trail', 'aria-hidden': 'true' }, trailPath);
  const trigger = h('button', { class: 'kk-marking-menu-btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-marking-trigger': '', onclick: openFromKeyboard }, 'Menu');
  const root = h('div', { class: 'kk-marking-menu-root' }, page, trail, trigger);
  stage.append(root);

  const local = (e) => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // Onde desenhar o disco para ele ficar dentro da cena.
  const place = (x, y) => {
    const r = root.getBoundingClientRect(), pad = DISC + 8;
    return { x: r.width > pad * 2 ? Math.min(Math.max(x, pad), r.width - pad) : r.width / 2, y: r.height > pad * 2 ? Math.min(Math.max(y, pad), r.height - pad) : r.height / 2 };
  };

  function drawCurrent(animate) {
    curIcon.replaceChildren(ico(current.icon));
    const next = h('span', current.label);
    if (animate && !rm) { curLabel.animate([{ opacity: 0, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 180, easing: 'cubic-bezier(.23,1,.32,1)' }); }
    curLabel.replaceChildren(next);
    midBody.replaceChildren(h('strong', current.title), h('p', current.text), h('small', 'Segure em qualquer ponto, ou faça um gesto rápido · clique direito também abre'));
  }

  // ---- disco ----
  let menuEl = null, hubLabel = null, aimEl = null, wedgeEl = null, itemEls = [];
  function buildMenu(menu) {
    const id = 'kk-mm-menu';
    wedgeEl = h('div', { class: 'kk-marking-menu-wedge', 'aria-hidden': 'true' }, svg('svg', { width: DISC * 2, height: DISC * 2, viewBox: `${-DISC} ${-DISC} ${DISC * 2} ${DISC * 2}`, 'aria-hidden': 'true' }, svg('path', { d: sectorPath(step) })));
    itemEls = ITEMS.map((it, i) => {
      const a = ((i * step - 90) * Math.PI) / 180;
      const el = h('div', { class: 'kk-marking-menu-it', role: 'menuitem', id: `${id}-${it.id}`, 'aria-label': it.label, style: `opacity:0;transform:translate(${round(Math.cos(a) * RING * 0.55)}px,${round(Math.sin(a) * RING * 0.55)}px);transition-delay:${menu.mode === 'press' ? i * 15 : 0}ms` }, ico(it.icon));
      return el;
    });
    aimEl = h('div', { class: 'kk-marking-menu-aim' }, h('i'));
    hubLabel = h('span');
    const hub = h('div', { class: 'kk-marking-menu-hub' }, aimEl, hubLabel);
    menuEl = h('div', { class: 'kk-marking-menu-menu', id, role: 'menu', 'aria-label': 'Ir para', tabindex: '-1', style: `left:${menu.x - DISC}px;top:${menu.y - DISC}px;width:${DISC * 2}px;height:${DISC * 2}px`, onkeydown: onMenuKey },
      h('div', { class: 'kk-marking-menu-disc' }), wedgeEl, ...itemEls, hub);
    root.append(menuEl);
    if (!rm) menuEl.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'cubic-bezier(.23,1,.32,1)' });
    // Os itens saem do centro para o anel na primeira pintura seguinte.
    requestAnimationFrame(() => requestAnimationFrame(() => positionItems(true)));
    trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-controls', id);
  }
  function positionItems(enter) {
    itemEls.forEach((el, i) => {
      const a = ((i * step - 90) * Math.PI) / 180, r = RING + (i === selected ? LEAN : 0);
      if (enter) el.style.opacity = '1';
      el.style.transform = `translate(${round(Math.cos(a) * r)}px,${round(Math.sin(a) * r)}px)`;
      el.classList.toggle('on', i === selected);
    });
  }
  function removeMenu() {
    const el = menuEl; menuEl = null; itemEls = []; trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-controls');
    if (!el) return;
    if (rm) { el.remove(); return; }
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 120 }).onfinish = () => el.remove();
  }

  // A seleção gira o destaque pelo caminho mais curto, numa mola.
  function select(index) {
    if (index === selected) return;
    selected = index;
    if (index >= 0) {
      haptic();
      const from = wedge.value, to = index * step, delta = ((((to - from) % 360) + 540) % 360) - 180;
      wedge.to(from + delta);
      if (rm) { wedge.set(from + delta); drawWedge(); } else if (!stopWedge) stopWedge = loop((dt) => { wedge.step(dt); drawWedge(); if (wedge.settled) { stopWedge(); stopWedge = null; } });
    }
    if (menuEl) {
      wedgeEl.style.opacity = index >= 0 ? '1' : '0'; positionItems(false);
      hubLabel.textContent = index >= 0 ? ITEMS[index].label : '';
      if (index >= 0) menuEl.setAttribute('aria-activedescendant', `kk-mm-menu-${ITEMS[index].id}`); else menuEl.removeAttribute('aria-activedescendant');
    }
  }
  const drawWedge = () => { if (wedgeEl) wedgeEl.style.transform = `rotate(${wedge.value}deg)`; };
  d(() => stopWedge?.());

  // O tique do cubo segue o ponteiro exatamente; o destaque vem atrás na mola.
  function aim(x, y) {
    if (!open) return;
    const dx = x - open.x, dy = y - open.y;
    aimEl.style.opacity = Math.hypot(dx, dy) >= DEAD_ZONE ? '1' : '0';
    aimEl.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
    select(pick(dx, dy));
  }
  function show(x, y, mode, fromKeyboard = false) {
    if (menuEl) { menuEl.remove(); menuEl = null; }
    const at = place(x, y); open = { ...at, mode, fromKeyboard }; root.classList.add('open');
    buildMenu(open); selected = -2; select(fromKeyboard ? 0 : -1);
    if (fromKeyboard) menuEl.focus();
  }
  function close() {
    const m = open; open = null; root.classList.remove('open'); select(-1); removeMenu();
    if (m?.fromKeyboard) trigger.focus();
  }
  function commit(index, at) {
    const it = ITEMS[index];
    if (it) { current = it; drawCurrent(true); if (at) flashLabel(it, at); }
    close();
  }
  function flashLabel(it, at) {
    const el = h('div', { class: 'kk-marking-menu-flash', style: `left:${at.x + 12}px;top:${at.y - 32}px` }, ico(it.icon, 14), it.label);
    root.append(el);
    if (rm) { setTimeout(() => el.remove(), 900); return; }
    el.animate([{ opacity: 0, transform: 'translateY(4px)', offset: 0 }, { opacity: 1, transform: 'none', offset: .15 }, { opacity: 1, transform: 'none', offset: .7 }, { opacity: 0, transform: 'translateY(-4px)', offset: 1 }], { duration: 900 }).onfinish = () => el.remove();
  }

  // ---- traço que o ponteiro deixa enquanto pressionado ----
  function drawTrail() {
    trailFrame = 0;
    const now = performance.now();
    while (trailPoints.length && now - trailPoints[0].t > TRAIL_MS) trailPoints.shift();
    trailPath.setAttribute('d', trailPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(''));
    if (trailPoints.length) trailFrame = requestAnimationFrame(drawTrail);
  }
  function addTrail(x, y) { if (rm) return; trailPoints.push({ x, y, t: performance.now() }); if (!trailFrame) trailFrame = requestAnimationFrame(drawTrail); }
  d(() => { cancelAnimationFrame(trailFrame); clearTimeout(gesture?.timer); });

  // ---- gestos ----
  on(root, 'pointerdown', (e) => {
    if (e.button !== 0 || gesture || e.target.closest('[data-marking-trigger]')) return;
    const p = local(e);
    if (open?.mode === 'sticky') { aim(p.x, p.y); commit(selected); return; } // menu fixo (botão direito/teclado) escolhe com clique
    e.preventDefault(); root.setPointerCapture(e.pointerId);
    const g = { id: e.pointerId, x: p.x, y: p.y, stage: 'pending', timer: setTimeout(() => { if (gesture === g && g.stage === 'pending') { g.stage = 'menu'; show(g.x, g.y, 'press'); } }, HOLD_MS) };
    gesture = g; addTrail(p.x, p.y);
  });
  on(root, 'pointermove', (e) => {
    const p = local(e);
    if (!gesture) { if (open?.mode === 'sticky') aim(p.x, p.y); return; }
    if (e.pointerId !== gesture.id) return;
    addTrail(p.x, p.y);
    // Sair antes do menu aparecer: traço de especialista, sem menu; a direção decide.
    if (gesture.stage === 'pending' && Math.hypot(p.x - gesture.x, p.y - gesture.y) > FLICK) { clearTimeout(gesture.timer); gesture.stage = 'flick'; }
    if (gesture.stage === 'menu') aim(p.x, p.y);
  });
  on(root, 'pointerup', (e) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    const g = gesture; gesture = null; clearTimeout(g.timer);
    const p = local(e);
    if (g.stage === 'menu') { aim(p.x, p.y); commit(selected); }
    else if (g.stage === 'flick') commit(pick(p.x - g.x, p.y - g.y), p);
  });
  on(root, 'pointercancel', (e) => { if (gesture && e.pointerId === gesture.id) { clearTimeout(gesture.timer); gesture = null; close(); } });
  on(root, 'contextmenu', (e) => {
    e.preventDefault();
    if (gesture) { clearTimeout(gesture.timer); gesture = null; }
    const p = local(e); show(p.x, p.y, 'sticky');
  });

  function openFromKeyboard() { const r = root.getBoundingClientRect(); show(r.width / 2, r.height / 2, 'sticky', true); }
  function onMenuKey(e) {
    const move = MOVE_KEYS[e.key], digit = Number.parseInt(e.key, 10);
    if (move) {
      e.preventDefault();
      // Sem nada escolhido, o primeiro passo cai no item do topo.
      const from = selected < 0 ? (move > 0 ? -1 : 1) : selected;
      select((from + move + count) % count);
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(selected); }
    else if (e.key === 'Escape' || e.key === 'Tab') close();
    else if (digit >= 1 && digit <= count) { e.preventDefault(); commit(digit - 1); }
  }

  drawCurrent(false);
  return () => { d.run(); root.remove(); };
}
