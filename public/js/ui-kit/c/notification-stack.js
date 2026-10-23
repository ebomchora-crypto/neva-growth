// Notification Stack — porte em JS puro do componente "Notification Stack" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced } from '../kit.js';
import { icon } from '../../ui.js';

const SEED = [
  { app: 'Mensagens', title: 'Camila Rocha', body: 'Aprovei a proposta! Dá para enviar o contrato ainda hoje?', time: 'agora', ic: 'message', tone: '#2f7bbd' },
  { app: 'Agenda', title: 'Reunião com a Aurora em 10 min', body: 'Sala 2 · Revisão do plano de vendas do trimestre', time: '9:50', ic: 'calendar', tone: '#164a7c' },
  { app: 'E-mail', title: 'Fatura #2041 paga', body: 'A Distribuidora Aurora pagou R$ 1.280,00. O recibo está em anexo.', time: '9:12', ic: 'mail', tone: '#4a95d2' },
  { app: 'Carteira', title: 'Pix recebido', body: 'R$ 450,00 de Loja Maré Azul', time: '8:31', ic: 'card', tone: '#0f3560' },
];
const MORE = [
  { app: 'Leads', title: 'Novo lead pelo site', body: 'Rafael Lima pediu um orçamento de automação de atendimento.', time: 'agora', ic: 'userplus', tone: '#2f7bbd' },
  { app: 'Metas', title: 'Meta semanal batida', body: 'A equipe passou de R$ 80 mil em vendas. Parabéns!', time: 'agora', ic: 'target', tone: '#164a7c' },
  { app: 'Funil', title: 'Proposta visualizada', body: 'Padaria Bom Grão abriu a proposta 3 vezes nas últimas horas.', time: 'agora', ic: 'funnel', tone: '#4a95d2' },
];

const PEEK = 10, VISIBLE_BEHIND = 2, GAP = 8; // atrás do cartão da frente, quanto de cada um aparece
const FALLBACK_HEIGHT = 76;
const DISMISS_DISTANCE = 100, DISMISS_VELOCITY = 0.11; // um flick rápido não precisa ir longe
const AXIS_LOCK = 6;                  // movimento antes de decidir entre deslize horizontal e rolagem vertical
const SPRING_STIFFNESS = 520, SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS); // criticamente amortecida: não oscila, mas carrega o embalo
const FLIGHT_MIN_SPEED = 1400, FLIGHT_ACCEL = 4200;
const VELOCITY_WINDOW_MS = 80, EXIT_MS = 200;
const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';

const opacityFor = (x) => Math.max(1 - Math.abs(x) / 240, 0.3);
function releaseVelocity(samples) {
  const last = samples.at(-1); if (!last) return 0;
  let first = last;
  for (let i = samples.length - 1; i >= 0; i--) { if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break; first = samples[i]; }
  const dt = last.t - first.t; return dt > 0 ? (last.x - first.x) / dt : 0;
}
// Para que lado o cartão sai (0 = volta). Flick só vale se afasta do repouso.
function dismissDirection(dx, v) {
  const flick = Math.abs(v) > DISMISS_VELOCITY && Math.sign(v) === Math.sign(dx);
  if (Math.abs(dx) < DISMISS_DISTANCE && !flick) return 0;
  return (dx === 0 ? v : dx) > 0 ? 1 : -1;
}

const CSS = `
.kk-notification-stack-wrap{width:100%;padding:14px 10px 10px;overflow-x:clip}
.kk-notification-stack-head{display:flex;align-items:center;justify-content:space-between;height:36px;margin-bottom:8px;padding:0 4px}
.kk-notification-stack-head p{margin:0;font-size:14px;font-weight:600;color:var(--ink,#0e2236)}
.kk-notification-stack-head p span{margin-left:8px;font-weight:500;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-notification-stack-btn{min-height:36px;padding:0 10px;border:0;border-radius:8px;background:none;color:var(--mut,#4a6f93);font:500 14px inherit;cursor:pointer;transition:background .15s,color .15s}
.kk-notification-stack-btn:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-notification-stack-btn:focus-visible,.kk-notification-stack-add:focus-visible,.kk-notification-stack-x:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-notification-stack-list{position:relative;margin:0;padding:0;list-style:none;outline:none;transition:height .3s ${EASE_OUT}}
.kk-notification-stack-li{position:absolute;left:0;right:0;top:0;transform-origin:top;transition:transform .3s ${EASE_OUT},opacity .3s ${EASE_OUT}}
.kk-notification-stack-sw{touch-action:pan-y}
.kk-notification-stack-card{position:relative;display:flex;gap:12px;padding:14px;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;box-shadow:0 1px 3px rgba(15,53,96,.1);user-select:none;-webkit-user-select:none;outline:none}
.kk-notification-stack-card:focus-visible{box-shadow:0 0 0 2px var(--ice-500,#4a95d2)}
.kk-notification-stack-card.tap{cursor:pointer}
.kk-notification-stack-body{display:flex;flex:1;min-width:0;gap:12px;transition:opacity .2s}
.kk-notification-stack-card.muted .kk-notification-stack-body{opacity:0}
.kk-notification-stack-ico{flex:none;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;color:#fff}
.kk-notification-stack-ico svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-notification-stack-txt{min-width:0;flex:1}
.kk-notification-stack-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.kk-notification-stack-t{margin:0;font-size:14px;font-weight:600;color:var(--ink,#0e2236);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-notification-stack-time{flex:none;font-size:12px;color:#6f8eab;font-variant-numeric:tabular-nums}
.kk-notification-stack-b{margin:0;font-size:14px;line-height:1.35;color:var(--mut,#4a6f93);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.kk-notification-stack-x{position:absolute;top:-10px;left:-6px;display:flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;opacity:0;transition:opacity .15s}
.kk-notification-stack-x::before{content:"";position:absolute;inset:6px;border-radius:50%;border:1px solid var(--line,#d3e6f6);background:#fff;box-shadow:0 1px 3px rgba(15,53,96,.15)}
.kk-notification-stack-x svg{position:relative;width:12px;height:12px;fill:none;stroke:var(--mut,#4a6f93);stroke-width:2.4;stroke-linecap:round}
.kk-notification-stack-card:hover .kk-notification-stack-x,.kk-notification-stack-x:focus-visible,.kk-notification-stack-card:focus-within .kk-notification-stack-x{opacity:1}
@media (hover:none){.kk-notification-stack-x{opacity:1}}
.kk-notification-stack-card.muted .kk-notification-stack-x{display:none}
.kk-notification-stack-empty{margin:0;padding:22px 0 8px;text-align:center;font-size:14px;color:var(--mut,#4a6f93)}
.kk-notification-stack-foot{display:flex;justify-content:center;margin-top:14px}
.kk-notification-stack-add{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px inherit;cursor:pointer}
.kk-notification-stack-add:hover{background:var(--ice-100,#e3f0fb)}
.kk-notification-stack-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (prefers-reduced-motion:reduce){.kk-notification-stack-li{transition:opacity .2s}.kk-notification-stack-list{transition:none}}
`;

export default function mount(stage, ctx) {
  ensureStyle('notification-stack', CSS);
  let uid = 0, moreIdx = 0, hovered = false, focused = false, pinned = false;
  const items = [];              // { id, data, li, sw, card, body, btn, h }
  const leaving = new Set(), dismissed = new Set();
  const lastY = new Map(), swipeX = new Map(), frames = new Map(), timers = [];
  let drag = null, suppressClick = false, stopListening = null;

  const count = h('span'), toggle = h('button', { type: 'button', class: 'kk-notification-stack-btn', 'aria-expanded': 'false', onclick: () => { pinned = !pinned; layout(); } });
  const head = h('div', { class: 'kk-notification-stack-head' }, h('p', 'Notificações', count), toggle);
  const list = h('ol', { class: 'kk-notification-stack-list', 'aria-label': 'Notificações', tabindex: '-1' });
  const empty = h('p', { class: 'kk-notification-stack-empty' }, 'Tudo em dia por aqui.');
  const live = h('span', { class: 'kk-notification-stack-sr', 'aria-live': 'polite' });
  const addBtn = h('button', { type: 'button', class: 'kk-notification-stack-add', onclick: addNew }, 'Receber notificação');
  const root = h('div', { class: 'kk-notification-stack-wrap' }, head, list, empty, h('div', { class: 'kk-notification-stack-foot' }, addBtn), live);
  stage.append(root);

  // Hover só abre com mouse de verdade (toque dispara pointerenter ao tocar).
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = true; layout(); } });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovered = false; layout(); } });
  root.addEventListener('focusin', () => { focused = true; layout(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { focused = false; layout(); } });

  const heightOf = (it) => it.h || FALLBACK_HEIGHT;
  const ro = new ResizeObserver((entries) => {
    let changed = false;
    for (const en of entries) { const it = items.find((x) => x.li === en.target); const v = Math.round(en.borderBoxSize?.[0]?.blockSize ?? en.target.offsetHeight); if (it && v && it.h !== v) { it.h = v; changed = true; } }
    if (changed) layout();
  });

  function build(data) {
    const id = 'n-' + ++uid;
    const btn = h('button', { type: 'button', class: 'kk-notification-stack-x', 'aria-label': `Dispensar ${data.title}`, onclick: (e) => { e.stopPropagation(); dismiss(id, 1); } }, icon('x'));
    const body = h('div', { class: 'kk-notification-stack-body' },
      h('div', { class: 'kk-notification-stack-ico', style: `background:${data.tone}` }, icon(data.ic)),
      h('div', { class: 'kk-notification-stack-txt' },
        h('div', { class: 'kk-notification-stack-row' }, h('p', { class: 'kk-notification-stack-t' }, data.title), h('span', { class: 'kk-notification-stack-time' }, data.time)),
        h('p', { class: 'kk-notification-stack-b' }, data.body)));
    const card = h('article', { class: 'kk-notification-stack-card', 'aria-label': `${data.app}: ${data.title}. ${data.body}`, tabindex: '0',
      onclick: () => { if (suppressClick) { suppressClick = false; return; } if (!expanded()) { pinned = true; layout(); } },
      onkeydown: (e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (e.repeat) return; dismiss(id, 1); } } }, body, btn);
    const sw = h('div', { class: 'kk-notification-stack-sw' }, card);
    const li = h('li', { class: 'kk-notification-stack-li' }, sw);
    const it = { id, data, li, sw, card, btn, h: 0 };
    sw.addEventListener('lostpointercapture', (e) => { if (e.target === sw) up(e, it); }); // captura implícita do toque não é o fim do deslize
    sw.addEventListener('pointercancel', (e) => up(e, it));
    sw.addEventListener('pointerdown', (e) => down(e, it));
    sw.addEventListener('pointermove', (e) => move(e, it));
    sw.addEventListener('pointerup', (e) => up(e, it));
    return it;
  }

  const expanded = () => (hovered || focused || pinned) && items.filter((i) => !leaving.has(i.id)).length > 1;

  function layout() {
    const laid = items.filter((i) => !leaving.has(i.id)), exp = expanded();
    const frontH = laid[0] ? heightOf(laid[0]) : 0;
    const stackH = exp ? laid.reduce((s, i) => s + heightOf(i), 0) + Math.max(laid.length - 1, 0) * GAP : frontH + Math.min(laid.length - 1, VISIBLE_BEHIND) * PEEK;
    const offsets = []; let run = 0; for (const i of laid) { offsets.push(run); run += heightOf(i) + GAP; }
    list.style.height = stackH + 'px';
    count.textContent = String(laid.length);
    toggle.hidden = laid.length <= 1; toggle.textContent = exp ? 'Mostrar menos' : 'Mostrar todas'; toggle.setAttribute('aria-expanded', String(exp));
    empty.hidden = laid.length > 0;
    items.forEach((it) => {
      const index = laid.indexOf(it), isLeaving = index === -1, depth = Math.max(index, 0);
      const hiddenBehind = !(exp || depth <= VISIBLE_BEHIND), scale = exp || isLeaving ? 1 : 1 - depth * 0.05;
      // Alinha pela base os cartões de trás para uma tira de cada aparecer sob o da frente, seja qual for a altura.
      const restY = exp ? offsets[depth] : frontH + depth * PEEK - heightOf(it) * scale;
      const y = isLeaving ? (lastY.get(it.id) ?? 0) : restY;
      if (!isLeaving) lastY.set(it.id, restY);
      it.li.style.transform = `translateY(${y}px) scale(${scale})`;
      it.li.style.opacity = hiddenBehind ? '0' : '1';
      it.li.style.zIndex = String(items.length - depth);
      it.li.style.pointerEvents = hiddenBehind ? 'none' : '';
      it.card.tabIndex = hiddenBehind ? -1 : 0; it.btn.tabIndex = hiddenBehind ? -1 : 0;
      it.card.classList.toggle('muted', !exp && depth > 0); // atrás só aparece a borda: o conteúdo some
      it.card.classList.toggle('tap', !exp && depth === 0 && laid.length > 1);
    });
  }

  function addNew() {
    const data = { ...MORE[moreIdx++ % MORE.length] };
    const it = build(data); items.unshift(it);
    list.prepend(it.li); ro.observe(it.li); it.h = it.li.offsetHeight;
    // Entra de cima: começa acima e transparente, depois assenta.
    it.li.style.transition = 'none'; it.li.style.opacity = '0'; it.li.style.transform = 'translateY(-16px)';
    lastY.set(it.id, -16); void it.li.offsetHeight; it.li.style.transition = '';
    layout(); live.textContent = `Nova notificação: ${data.title}`;
  }

  // ---- Simulações por cartão em rAF
  const stopFrame = (id) => { const f = frames.get(id); if (f !== undefined) { cancelAnimationFrame(f); frames.delete(id); } };
  function paint(it, x) {
    swipeX.set(it.id, x);
    it.sw.style.transition = 'none'; it.sw.style.transform = x === 0 ? '' : `translateX(${x}px)`; it.sw.style.opacity = x === 0 ? '' : String(opacityFor(x));
  }
  function run(it, step, onDone) {
    stopFrame(it.id); let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now; // limita o passo: aba em segundo plano não arremessa a simulação
      if (step(dt)) { frames.delete(it.id); onDone?.(); return; }
      frames.set(it.id, requestAnimationFrame(tick));
    };
    frames.set(it.id, requestAnimationFrame(tick));
  }
  function snapBack(it, velocity) {
    let x = swipeX.get(it.id) ?? 0, v = velocity * 1000;
    if (reduced()) { paint(it, 0); return; }
    run(it, (dt) => {
      v += (-SPRING_STIFFNESS * x - SPRING_DAMPING * v) * dt; x += v * dt;
      if (Math.abs(x) < 0.5 && Math.abs(v) < 10) { paint(it, 0); return true; }
      paint(it, x); return false;
    });
  }
  function finishDismiss(it) {
    const i = items.indexOf(it); if (i >= 0) items.splice(i, 1);
    ro.unobserve(it.li); it.li.remove(); lastY.delete(it.id); swipeX.delete(it.id); leaving.delete(it.id);
    layout();
  }
  // Joga o cartão para o lado. Deslize mantém a velocidade da soltura; botão/teclado parte do repouso na velocidade mínima.
  function dismiss(id, direction, velocity = 0) {
    if (dismissed.has(id)) return;
    const it = items.find((x) => x.id === id); if (!it) return;
    // Teclado e botão mantêm o foco na pilha: vai para o próximo cartão (ou anterior, ou o botão de receber).
    if (it.sw.contains(document.activeElement)) {
      const laid = items.filter((x) => !leaving.has(x.id)), at = laid.indexOf(it), nxt = laid[at + 1] ?? laid[at - 1];
      (nxt ? nxt.card : addBtn).focus();
    }
    dismissed.add(id); leaving.add(id);
    live.textContent = `${it.data.title} dispensada`;
    layout();
    if (reduced()) {
      stopFrame(id); it.sw.style.transition = `opacity ${EXIT_MS}ms ${EASE_OUT}`; it.sw.style.opacity = '0';
      timers.push(setTimeout(() => finishDismiss(it), EXIT_MS)); return;
    }
    const distance = it.sw.offsetWidth * 1.1; let x = swipeX.get(id) ?? 0, speed = Math.max(Math.abs(velocity) * 1000, FLIGHT_MIN_SPEED);
    run(it, (dt) => {
      speed += FLIGHT_ACCEL * dt; x += direction * speed * dt;
      const done = Math.abs(x) >= distance;
      paint(it, done ? direction * distance : x); it.sw.style.opacity = String(Math.max(1 - Math.abs(x) / distance, 0));
      return done;
    }, () => finishDismiss(it));
  }

  // ---- Gesto
  function down(e, it) {
    const depth = items.filter((x) => !leaving.has(x.id)).indexOf(it);
    // Com a pilha fechada só o da frente desliza; um segundo dedo nunca assume um arrasto em curso.
    if (drag || leaving.has(it.id) || (!expanded() && depth > 0)) return;
    suppressClick = false;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button')) return;
    stopFrame(it.id); // pega um cartão que ainda volta da última soltura
    const pid = e.pointerId;
    const release = (u) => {
      if (u.pointerId !== pid) return;
      stopListening?.();
      // Os handlers do cartão rodam antes; isto só limpa um gesto que terminou fora dele.
      if (drag?.pointerId === pid) { drag = null; if (swipeX.get(it.id)) snapBack(it, 0); }
    };
    stopListening?.();
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
    stopListening = () => { window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); stopListening = null; };
    drag = { pointerId: pid, startX: e.clientX, startY: e.clientY, originX: swipeX.get(it.id) ?? 0, dx: 0, axis: null, samples: [] };
  }
  function move(e, it) {
    const d = drag; if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (d.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.axis === 'x') it.sw.setPointerCapture(e.pointerId); // mantém o deslize vivo quando o ponteiro sai do cartão
    }
    if (d.axis !== 'x') return;
    d.dx = d.originX + dx; d.samples.push({ t: e.timeStamp, x: d.dx }); if (d.samples.length > 12) d.samples.shift();
    paint(it, d.dx); // direto no elemento: sem redesenhar a cada movimento
  }
  function up(e, it) {
    const d = drag; if (!d || d.pointerId !== e.pointerId) return;
    drag = null;
    if (d.axis !== 'x') { if (swipeX.get(it.id)) snapBack(it, 0); return; }
    suppressClick = true;
    const v = releaseVelocity(d.samples), dir = dismissDirection(d.dx, v);
    if (dir === 0) { snapBack(it, v); return; }
    dismiss(it.id, dir, Math.sign(v) === dir ? v : 0); // nunca leva para o voo uma velocidade apontando de volta à pilha
  }

  SEED.forEach((d) => { const it = build(d); items.push(it); list.append(it.li); ro.observe(it.li); it.h = it.li.offsetHeight; });
  layout();

  return () => {
    ro.disconnect(); timers.forEach(clearTimeout); frames.forEach((f) => cancelAnimationFrame(f)); stopListening?.(); root.remove();
  };
}
