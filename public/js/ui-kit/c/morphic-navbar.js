// Barra dividida — porte em JS puro do componente "Split Nav" (morphic-navbar) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, spring, loop, clamp, reduced, onResize, disposer, PALETTE } from '../kit.js';

const SPLIT = 8, HOVER_SPLIT = 2, DRAG_SLOP = 4, PROJECTION = 0.16, VELOCITY_WINDOW = 90, COMPACT_AFTER = 80, CHEV = 36, CHEV_GAP = 4;
const r2 = (v) => Math.round(v * 100) / 100;
const bump = (focus, k) => Math.max(0, 1 - Math.abs(focus - k));

// Deslocamento x de cada link para uma divisão centrada em `focus` (pode ser fracionário ao arrastar).
function splitOffsets(count, focus, hover) {
  const cum = [0]; let total = 0;
  for (let j = 0; j < count - 1; j++) {
    let gap = SPLIT * Math.max(bump(focus, j), bump(focus, j + 1));
    if (hover !== null && hover !== Math.round(focus) && (j === hover - 1 || j === hover)) gap = Math.max(gap, HOVER_SPLIT);
    total += gap; cum.push(total);
  }
  return cum.map((x) => r2(x - total / 2));
}
// Dobrada: o link ativo vai ao meio com o chevron ao lado; os demais se escondem atrás dele.
function foldedOffsets({ centers, widths, rowWidth }, active) {
  const aw = widths[active] || 0, group = aw + CHEV_GAP + CHEV;
  const ac = rowWidth / 2 - group / 2 + aw / 2;
  return { xs: centers.map((c) => r2(ac - c)), chevron: r2(ac + aw / 2 + CHEV_GAP + CHEV / 2) };
}
function indexAt(centers, x) {
  const last = centers.length - 1;
  if (last <= 0 || x <= centers[0]) return 0;
  for (let k = 0; k < last; k++) if (x < centers[k + 1]) return k + (x - centers[k]) / Math.max(1, centers[k + 1] - centers[k]);
  return last;
}
const capScale = (gap, fold) => `scaleX(${r2(clamp(1 - gap / 1.5, 0, 1) * (1 - clamp(fold * 4, 0, 1)))})`;

const ITEMS = [
  { id: 'inicio', name: 'Início', title: 'Resumo do dia', text: 'Visão geral das vendas, leads novos e tarefas de hoje.' },
  { id: 'vendas', name: 'Vendas', title: 'Vendas do mês', text: 'R$ 48.320 faturados, 12% acima do mês passado.' },
  { id: 'clientes', name: 'Clientes', title: 'Carteira de clientes', text: '214 clientes ativos e 18 novos nesta semana.' },
  { id: 'funil', name: 'Funil', title: 'Funil comercial', text: '63 oportunidades abertas, 9 em negociação final.' },
  { id: 'ajuda', name: 'Ajuda', title: 'Central de ajuda', text: 'Guias rápidos e atalhos para a sua equipe.' },
];
const KEY_MOVES = { ArrowLeft: (i) => i - 1, ArrowRight: (i) => i + 1, Home: () => 0, End: (_, n) => n - 1 };

export default function mount(stage, ctx) {
  ensureStyle('morphic-navbar', `
.kk-morphic-navbar-root{width:100%;box-sizing:border-box;padding:8px;display:flex;flex-direction:column;height:100%;min-height:240px;gap:10px;container-type:inline-size}
.kk-morphic-navbar-nav{display:flex;justify-content:center;padding:4px 0}
@container (min-width:420px){.kk-morphic-navbar-link{padding:0 14px}}
.kk-morphic-navbar-row{position:relative;display:flex;align-items:center;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.kk-morphic-navbar-seg{position:relative;z-index:10;will-change:transform}
.kk-morphic-navbar-seg.pin{z-index:20}.kk-morphic-navbar-seg.off{pointer-events:none}
.kk-morphic-navbar-link{position:relative;display:flex;align-items:center;height:36px;padding:0 10px;border-radius:12px;font-weight:500;font-size:13px;font-family:inherit;color:${PALETTE.ice300};background:${PALETTE.ink};text-decoration:none;transition:color .15s;outline:none;white-space:nowrap}
.kk-morphic-navbar-link:hover{color:#fff}.kk-morphic-navbar-link.hl{color:#fff}
.kk-morphic-navbar-link:focus-visible,.kk-morphic-navbar-chev:focus-visible{box-shadow:inset 0 0 0 2px ${PALETTE.ice400}}
.kk-morphic-navbar-lbl{position:relative}
.kk-morphic-navbar-cap{position:absolute;top:0;bottom:0;width:12px;background:${PALETTE.ink}}
.kk-morphic-navbar-cap.l{left:-1px;transform-origin:left}.kk-morphic-navbar-cap.r{right:-1px;transform-origin:right}
.kk-morphic-navbar-dot{position:absolute;left:50%;bottom:6px;width:12px;height:2px;margin-left:-6px;border-radius:2px;background:${PALETTE.ice400};transform:scaleX(0);transition:transform .2s cubic-bezier(.23,1,.32,1)}
.kk-morphic-navbar-link.hl .kk-morphic-navbar-dot{transform:scaleX(1)}
.kk-morphic-navbar-chev{position:absolute;top:0;left:0;z-index:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:0;border-radius:12px;background:${PALETTE.ink};color:${PALETTE.ice300};cursor:pointer;opacity:0;pointer-events:none;outline:none}
.kk-morphic-navbar-chev:hover{color:#fff}.kk-morphic-navbar-chev.on{pointer-events:auto;z-index:30}
.kk-morphic-navbar-chev svg{width:16px;height:16px}
.kk-morphic-navbar-scroll{flex:1;min-height:150px;max-height:260px;overflow:auto;border:1px solid var(--line,${PALETTE.line});border-radius:12px;background:#fff;padding:14px;scroll-behavior:auto}
.kk-morphic-navbar-root.big .kk-morphic-navbar-scroll{max-height:380px}
.kk-morphic-navbar-scroll h4{margin:0 0 4px;font-size:15px;color:var(--ink,${PALETTE.ink})}
.kk-morphic-navbar-scroll p{margin:0 0 10px;font-size:13px;line-height:1.5;color:var(--mut,${PALETTE.mut})}
.kk-morphic-navbar-line{height:10px;border-radius:5px;background:${PALETTE.ice100};margin-bottom:8px}
.kk-morphic-navbar-hint{font-size:12px;color:var(--mut,${PALETTE.mut});text-align:center;margin:0}
`);
  const d = disposer();
  const n = ITEMS.length;
  let active = 0, preview = null, hover = null, keyboardInside = false, scrubbing = false, userOpenAt = null, scrolledPast = false;
  let layout = null, drag = null, instant = false, suppressClick = false;

  const fold = spring(0, { k: 420, c: 32 });
  const xs = ITEMS.map(() => spring(0, { k: 420, c: 32 }));
  const chevX = spring(0, { k: 420, c: 32 });

  const links = [], segs = [], lcaps = [], rcaps = [];
  ITEMS.forEach((it, i) => {
    const a = h('a', { class: 'kk-morphic-navbar-link', href: '#' + it.id, draggable: 'false', onfocus: (e) => onLinkFocus(i, e), onclick: (e) => { e.preventDefault(); active = i; refresh(); } },
      i > 0 && (lcaps[i] = h('span', { class: 'kk-morphic-navbar-cap l', 'aria-hidden': 'true' })),
      i < n - 1 && (rcaps[i] = h('span', { class: 'kk-morphic-navbar-cap r', 'aria-hidden': 'true' })),
      h('span', { class: 'kk-morphic-navbar-lbl' }, it.name), h('span', { class: 'kk-morphic-navbar-dot', 'aria-hidden': 'true' }));
    a.addEventListener('dragstart', (e) => e.preventDefault());
    const seg = h('div', { class: 'kk-morphic-navbar-seg', onpointerenter: (e) => onHover(i, e, true), onpointerleave: (e) => onHover(i, e, false) }, a);
    links.push(a); segs.push(seg);
  });
  const chev = h('button', { class: 'kk-morphic-navbar-chev', type: 'button', 'aria-label': 'Mostrar todos os links', 'aria-expanded': 'true', 'data-chevron': '', tabindex: '-1', onclick: () => { userOpenAt = scroller.scrollTop; refresh(); links[active].focus({ preventScroll: true }); } },
    svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: 'm6 9 6 6 6-6' })));
  const row = h('div', { class: 'kk-morphic-navbar-row' }, ...segs, chev);
  const nav = h('nav', { class: 'kk-morphic-navbar-nav', 'aria-label': 'Principal' }, row);

  const pTitle = h('h4'), pText = h('p');
  const scroller = h('div', { class: 'kk-morphic-navbar-scroll', tabindex: '0', role: 'region', 'aria-label': 'Conteúdo da seção' },
    pTitle, pText, ...Array.from({ length: 14 }, (_, i) => h('div', { class: 'kk-morphic-navbar-line', style: `width:${90 - (i % 4) * 14}%` })));
  const root = h('div', { class: 'kk-morphic-navbar-root' + (ctx?.big ? ' big' : '') }, nav, scroller,
    h('p', { class: 'kk-morphic-navbar-hint' }, 'Arraste a barra, use as setas ou role o conteúdo para dobrá-la.'));
  stage.append(root);

  const folded = () => scrolledPast && userOpenAt === null && !keyboardInside && !scrubbing;
  const highlight = () => (preview ?? active);

  function measure() {
    layout = { centers: segs.map((s) => s.offsetLeft + s.offsetWidth / 2), widths: segs.map((s) => s.offsetWidth), rowWidth: row.offsetWidth };
  }
  let stopLoop = null;
  function render() {
    const fv = fold.value;
    segs.forEach((seg, i) => {
      const x = xs[i].value, pinned = i === active, hid = folded() && !pinned;
      seg.style.transform = `translate3d(${x}px,0,0)`;
      seg.style.opacity = pinned ? 1 : r2(clamp(1 - fv * 1.8, 0, 1));
      seg.classList.toggle('pin', pinned); seg.classList.toggle('off', hid);
      links[i].toggleAttribute('inert', hid);
      if (lcaps[i]) lcaps[i].style.transform = capScale(x - xs[i - 1].value, fv);
      if (rcaps[i]) rcaps[i].style.transform = capScale(xs[i + 1].value - x, fv);
    });
    chev.style.transform = `translate3d(${chevX.value}px,0,0)`; chev.style.opacity = clamp(fv, 0, 1);
  }
  function ensureLoop() {
    if (stopLoop) return;
    stopLoop = loop((dt) => {
      let all = true;
      for (const s of [...xs, fold, chevX]) { s.step(dt); if (!s.settled) all = false; }
      render();
      if (all) { stopLoop(); stopLoop = null; }
    });
  }
  d(() => stopLoop?.());

  // Envia cada deslocamento para onde o estado atual manda.
  function retarget(jump) {
    const fl = folded();
    let targets, chevron;
    if (fl && layout) { const r = foldedOffsets(layout, active); targets = r.xs; chevron = r.chevron; }
    else {
      const focus = drag?.scrubbing ? drag.focus : highlight();
      targets = splitOffsets(n, focus, drag?.scrubbing ? null : hover);
      chevron = (layout?.centers[active] || 0) + (targets[active] || 0);
    }
    const hard = jump || reduced();
    const go = (s, t) => (hard ? s.set(t) : s.to(t));
    xs.forEach((s, i) => go(s, targets[i] || 0));
    go(chevX, r2(chevron - CHEV / 2)); go(fold, fl ? 1 : 0);
    if (hard) render(); else ensureLoop();
  }
  function refresh() {
    const fl = folded();
    links.forEach((a, i) => {
      a.classList.toggle('hl', i === highlight());
      if (i === active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    chev.classList.toggle('on', fl); chev.tabIndex = fl ? 0 : -1;
    chev.setAttribute('aria-expanded', String(!fl)); chev.setAttribute('aria-hidden', String(!fl));
    pTitle.textContent = ITEMS[active].title; pText.textContent = ITEMS[active].text;
    retarget(instant); instant = false;
  }

  const toFocus = (clientX, dr) => clamp(indexAt(layout?.centers || [], clientX - dr.rowLeft), 0, n - 1);
  const velocity = (samples, now) => {
    const rec = samples.filter((s) => now - s.t <= VELOCITY_WINDOW); const f = rec[0], l = rec[rec.length - 1];
    return !f || !l || l.t === f.t ? 0 : ((l.x - f.x) / (l.t - f.t)) * 1000;
  };
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  on(row, 'pointerdown', (e) => {
    if (e.button !== 0 || folded() || e.target.closest('[data-chevron]')) return;
    drag = { id: e.pointerId, startX: e.clientX, rowLeft: row.getBoundingClientRect().left, scrubbing: false, focus: highlight(), samples: [{ x: e.clientX, t: e.timeStamp }] };
  });
  on(row, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.scrubbing) {
      if (Math.abs(e.clientX - drag.startX) < DRAG_SLOP) return;
      drag.scrubbing = true; row.setPointerCapture(e.pointerId); scrubbing = true; hover = null;
    }
    drag.samples.push({ x: e.clientX, t: e.timeStamp }); if (drag.samples.length > 12) drag.samples.shift();
    drag.focus = toFocus(e.clientX, drag); preview = Math.round(drag.focus);
    links.forEach((a, i) => a.classList.toggle('hl', i === preview));
    retarget(false);
  });
  const endDrag = (e, commit) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dr = drag; drag = null;
    if (!dr.scrubbing) return;
    scrubbing = false; preview = null;
    if (!commit) { refresh(); return; }
    // O arremesso cai onde a velocidade o levaria, podendo pular links.
    const idx = Math.round(toFocus(e.clientX + velocity(dr.samples, e.timeStamp) * PROJECTION, dr));
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    active = idx; refresh();
  };
  on(row, 'pointerup', (e) => endDrag(e, true));
  on(row, 'pointercancel', (e) => endDrag(e, false));
  on(row, 'click', (e) => { if (suppressClick && e.isTrusted) { suppressClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
  on(row, 'keydown', (e) => {
    const move = KEY_MOVES[e.key], from = links.indexOf(document.activeElement);
    if (!move || from < 0) return;
    e.preventDefault();
    const next = clamp(move(from, n), 0, n - 1);
    instant = true; preview = next; links[next].focus(); refresh();
  });
  function onLinkFocus(i, e) {
    if (e.currentTarget.matches(':focus-visible')) { instant = true; keyboardInside = true; preview = i; refresh(); }
  }
  on(row, 'focusout', (e) => {
    if (!row.contains(e.relatedTarget)) { instant = true; keyboardInside = false; preview = null; refresh(); }
  });
  function onHover(i, e, entering) {
    if (e.pointerType !== 'mouse' || drag?.scrubbing) return;
    hover = entering ? i : (hover === i ? null : hover);
    retarget(false);
  }

  // Dobra a barra após rolar o conteúdo; reabre depois de outra rolagem equivalente.
  let ticking = false;
  on(scroller, 'scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      scrolledPast = scroller.scrollTop > COMPACT_AFTER;
      if (userOpenAt !== null && (!scrolledPast || Math.abs(scroller.scrollTop - userOpenAt) > COMPACT_AFTER)) userOpenAt = null;
      refresh();
    });
  }, { passive: true });

  d(onResize(row, () => { measure(); retarget(true); }));
  measure(); xs.forEach((s, i) => s.set(splitOffsets(n, active, null)[i])); refresh(); retarget(true);
  return () => { d.run(); root.remove(); };
}
