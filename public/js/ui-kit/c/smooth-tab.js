// Abas deslizantes — porte em JS puro do componente "Swipe Tabs" (smooth-tab) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, loop, spring, clamp, lerp, reduced, disposer, PALETTE } from '../kit.js';

const RUBBER_BAND = 0.35;      // além da primeira/última aba o painel anda esta fração do arrasto
const SWIPE_VELOCITY = 0.11;   // px/ms: solta rápido troca de aba mesmo com arrasto curto
const AXIS_LOCK = 6;           // movimento antes de decidir entre deslizar e rolar a página
const VELOCITY_WINDOW = 100;
const NEIGHBOUR_OPACITY = 0.35;

// Posição do indicador (retângulo) para um índice fracionário de aba.
function indicatorRect(rects, progress) {
  const last = rects.length - 1; if (last < 0) return null;
  const p = clamp(progress, 0, last), i = Math.min(Math.floor(p), Math.max(last - 1, 0));
  const a = rects[i], b = rects[Math.min(i + 1, last)], t = p - i;
  let left = lerp(a.left, b.left, t), width = lerp(a.width, b.width, t);
  // Elástico nas pontas: a pílula encosta na parede e cede do outro lado.
  const over = progress < 0 ? -progress : progress - last;
  if (over > 0) { const sq = width * Math.min(over, 0.5) * 0.4; width -= sq; if (progress > last) left += sq; }
  return { left, width, top: a.top, height: a.height };
}
const rubberBand = (raw, last) => (raw < 0 ? raw * RUBBER_BAND : raw > last ? last + (raw - last) * RUBBER_BAND : raw);

const BARS = [38, 52, 44, 61, 57, 72, 66, 80, 74, 88, 69, 92];
const ACTIVITY = [['Pedido #4182 pago via Pix', '2 min'], ['Novo lead vindo do Instagram', '14 min'], ['Proposta enviada para a Padaria Aurora', '1 h'], ['Cobrança de R$ 890 conciliada', '3 h']];
const MEMBERS = [['AL', 'Ana Lima', 'Dona'], ['JR', 'João Ribeiro', 'Administrador'], ['SK', 'Sofia Kato', 'Vendas'], ['RM', 'Rafael Moura', 'Leitura']];

export default function mount(stage, ctx) {
  ensureStyle('smooth-tab', `
.kk-smooth-tab-root{width:100%;box-sizing:border-box;padding:12px;display:flex;flex-direction:column;gap:12px;container-type:inline-size}
.kk-smooth-tab-wrap{display:flex;justify-content:center}
.kk-smooth-tab-list{position:relative;display:inline-flex;max-width:100%;padding:4px;border-radius:999px;background:${PALETTE.ice100}}
.kk-smooth-tab-tab{position:relative;flex:none;display:flex;align-items:center;min-height:36px;padding:0 11px;border:0;border-radius:999px;background:none;font:inherit;font-size:13px;font-weight:500;color:${PALETTE.mut};cursor:pointer;transition:color .15s;outline:none;white-space:nowrap}
.kk-smooth-tab-tab:hover{color:${PALETTE.ink}}
.kk-smooth-tab-tab:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
.kk-smooth-tab-over{position:absolute;inset:0;display:flex;padding:4px;background:${PALETTE.ink};pointer-events:none;clip-path:inset(0 100% 0 0)}
.kk-smooth-tab-over span{flex:none;display:flex;align-items:center;min-height:36px;padding:0 11px;font-size:13px;font-weight:500;color:#fff;white-space:nowrap}
@container (min-width:400px){.kk-smooth-tab-tab,.kk-smooth-tab-over span{padding:0 16px;font-size:14px}}
.kk-smooth-tab-view{position:relative;overflow:hidden;border-radius:16px;border:1px solid var(--line,${PALETTE.line});background:#fff;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.kk-smooth-tab-view[data-dragging]{cursor:grabbing}
.kk-smooth-tab-track{display:flex;will-change:transform}
.kk-smooth-tab-panel{min-height:220px;padding:18px;box-sizing:border-box;outline:none;font-size:14px;color:${PALETTE.ink}}
.kk-smooth-tab-panel:focus-visible{box-shadow:inset 0 0 0 2px ${PALETTE.ice500}}
.kk-smooth-tab-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.kk-smooth-tab-stat{padding:10px 12px;border-radius:10px;background:${PALETTE.ice50}}
.kk-smooth-tab-stat p{margin:0;font-size:11px;color:${PALETTE.mut}}.kk-smooth-tab-stat b{display:block;margin-top:2px;font-size:14px;font-variant-numeric:tabular-nums}
.kk-smooth-tab-bars{display:flex;align-items:flex-end;gap:5px;height:96px;margin-top:16px}
.kk-smooth-tab-bars span{flex:1;border-radius:3px;background:${PALETTE.ice200}}.kk-smooth-tab-bars span:last-child{background:${PALETTE.ice600}}
.kk-smooth-tab-ol{margin:0;padding:0;list-style:none}
.kk-smooth-tab-ol li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid ${PALETTE.ice100};font-size:13px}
.kk-smooth-tab-ol li:first-child{padding-top:0}.kk-smooth-tab-ol li:last-child{border:0}
.kk-smooth-tab-ol span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kk-smooth-tab-ol span:last-child{flex:none;color:${PALETTE.mut};font-size:12px}
.kk-smooth-tab-mem{display:flex;align-items:center;gap:12px;padding:6px 0}
.kk-smooth-tab-av{flex:none;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${PALETTE.ice100};color:${PALETTE.ice800};font-size:11px;font-weight:600}
.kk-smooth-tab-mem span:nth-child(2){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kk-smooth-tab-mem span:last-child{font-size:12px;color:${PALETTE.mut}}
.kk-smooth-tab-plan{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}
.kk-smooth-tab-meter{height:6px;border-radius:99px;background:${PALETTE.ice100};overflow:hidden;margin-top:6px}.kk-smooth-tab-meter i{display:block;height:100%;width:64%;border-radius:99px;background:${PALETTE.ice600}}
.kk-smooth-tab-sm{display:flex;justify-content:space-between;font-size:12px;color:${PALETTE.mut}}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  const panels = [
    ['Resumo', h('div', h('div', { class: 'kk-smooth-tab-stats' },
      ...[['Visitas', '24,1 mil'], ['Conversão', '3,8%'], ['Ticket', 'R$ 182']].map(([l, v]) => h('div', { class: 'kk-smooth-tab-stat' }, h('p', l), h('b', v)))),
      h('div', { class: 'kk-smooth-tab-bars', 'aria-hidden': 'true' }, BARS.map((v) => h('span', { style: `height:${v}%` }))))],
    ['Atividade', h('ol', { class: 'kk-smooth-tab-ol' }, ACTIVITY.map(([t, w]) => h('li', h('span', t), h('span', w))))],
    ['Equipe', h('ul', { class: 'kk-smooth-tab-ol' }, MEMBERS.map(([i, n, r]) => h('li', { class: 'kk-smooth-tab-mem' }, h('span', { class: 'kk-smooth-tab-av' }, i), h('span', n), h('span', r))))],
    ['Plano', h('div', h('div', { class: 'kk-smooth-tab-plan' }, h('b', 'Plano Crescimento'), h('span', { style: `color:${PALETTE.mut}` }, 'R$ 97 / mês')),
      h('div', h('div', { class: 'kk-smooth-tab-sm' }, h('span', 'Mensagens enviadas'), h('span', '6.400 / 10.000')), h('div', { class: 'kk-smooth-tab-meter' }, h('i'))),
      h('p', { class: 'kk-smooth-tab-sm', style: 'margin-top:22px' }, 'Próxima cobrança em 1º de novembro'))],
  ];
  const count = panels.length;
  let selected = 0, target = 0, drag = null, suppress = false;
  const prog = spring(0, { k: 420, c: 38 });
  let rects = [], size = { width: 0, height: 0 };

  const tabs = panels.map(([title], i) => h('button', { class: 'kk-smooth-tab-tab', type: 'button', role: 'tab', id: `kk-st-t${i}`, 'aria-controls': `kk-st-p${i}`, onclick: () => select(i), onkeydown: (e) => onKey(e, i) }, title));
  const overlay = h('div', { class: 'kk-smooth-tab-over', 'aria-hidden': 'true' }, panels.map(([t]) => h('span', t)));
  const list = h('div', { class: 'kk-smooth-tab-list', role: 'tablist', 'aria-label': 'Seções' }, ...tabs, overlay);
  const panelEls = panels.map(([, content], i) => h('div', { class: 'kk-smooth-tab-panel', role: 'tabpanel', id: `kk-st-p${i}`, 'aria-labelledby': `kk-st-t${i}`, style: `width:${100 / count}%` }, content));
  const track = h('div', { class: 'kk-smooth-tab-track', style: `width:${count * 100}%` }, ...panelEls);
  const view = h('div', { class: 'kk-smooth-tab-view' }, track);
  const root = h('div', { class: 'kk-smooth-tab-root' }, h('div', { class: 'kk-smooth-tab-wrap' }, list), view);
  stage.append(root);

  // Pinta a posição fracionária no trilho, nos painéis e no recorte do rótulo ativo.
  function paint(p) {
    track.style.transform = `translate3d(${(-p * 100) / count}%,0,0)`;
    panelEls.forEach((el, i) => { el.style.opacity = String(1 - Math.min(Math.abs(p - i), 1) * (1 - NEIGHBOUR_OPACITY)); });
    const r = indicatorRect(rects, p);
    if (r) overlay.style.clipPath = `inset(${r.top}px ${size.width - r.left - r.width}px ${size.height - r.top - r.height}px ${r.left}px round ${r.height / 2}px)`;
  }
  function measure() {
    const box = list.getBoundingClientRect();
    size = { width: box.width, height: box.height };
    rects = tabs.map((t) => { const r = t.getBoundingClientRect(); return { left: r.left - box.left, width: r.width, top: r.top - box.top, height: r.height }; });
    paint(prog.value);
  }
  const ro = new ResizeObserver(measure); ro.observe(list); d(() => ro.disconnect());
  document.fonts?.ready.then(measure).catch(() => {});

  let stopLoop = null;
  function run() {
    if (stopLoop) return;
    stopLoop = loop((dt) => { paint(prog.step(dt)); if (prog.settled) { prog.set(prog.target); paint(prog.value); stopLoop(); stopLoop = null; } });
  }
  d(() => stopLoop?.());
  function settle(index, { instant, velocity = 0 } = {}) {
    target = index;
    if (instant || rm) { stopLoop?.(); stopLoop = null; prog.set(index); paint(index); return; }
    prog.to(index); prog.kick(velocity); run();
  }
  function syncA11y() {
    tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === selected)); t.tabIndex = i === selected ? 0 : -1; });
    panelEls.forEach((p, i) => { p.toggleAttribute('inert', i !== selected); p.tabIndex = i === selected ? 0 : -1; });
  }
  function select(index, opts) {
    const next = clamp(index, 0, count - 1);
    settle(next, opts);
    if (next !== selected) { selected = next; syncA11y(); }
  }
  function onKey(e, i) {
    const keys = { ArrowRight: (i + 1) % count, ArrowLeft: (i - 1 + count) % count, Home: 0, End: count - 1 };
    const next = keys[e.key]; if (next === undefined) return;
    e.preventDefault(); tabs[next].focus();
    // Tecla segurada repete mais rápido que a mola assenta: pula direto.
    select(next, { instant: e.repeat });
  }

  on(view, 'pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startProgress: prog.value, axis: null, width: view.clientWidth || 1, samples: [{ x: e.clientX, t: e.timeStamp }] };
  });
  on(view, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.axis === null) {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK) return;
      // Vertical vence empates: a rolagem da página é o que a maioria quer.
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'x') {
        stopLoop?.(); stopLoop = null; drag.startProgress = prog.value; drag.startX = e.clientX; drag.samples = [{ x: e.clientX, t: e.timeStamp }];
        view.setPointerCapture(e.pointerId); view.dataset.dragging = '';
      }
    }
    if (drag.axis !== 'x') return;
    drag.samples.push({ x: e.clientX, t: e.timeStamp });
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > VELOCITY_WINDOW) drag.samples.shift();
    const v = rubberBand(drag.startProgress - (e.clientX - drag.startX) / drag.width, count - 1);
    prog.set(v); paint(v);
  });
  const end = (e, cancelled) => {
    if (!drag || drag.id !== e.pointerId) return;
    const cur = drag; drag = null; delete view.dataset.dragging;
    if (cur.axis !== 'x') return;
    // Engole o clique que o soltar pode gerar; no toque não vem clique, então a flag limpa no próximo ciclo.
    if (!cancelled) { suppress = true; setTimeout(() => { suppress = false; }, 0); }
    const f = cur.samples[0], vx = (e.clientX - f.x) / Math.max(e.timeStamp - f.t, 1), p = prog.value;
    let next = Math.round(p);
    if (!cancelled && Math.abs(vx) > SWIPE_VELOCITY) next = vx < 0 ? Math.floor(p) + 1 : Math.ceil(p) - 1;
    // A mola parte da velocidade do dedo, então a passagem é contínua.
    select(next, { velocity: (-vx * 1000) / cur.width });
  };
  on(view, 'pointerup', (e) => end(e, false));
  on(view, 'pointercancel', (e) => end(e, true));
  on(view, 'lostpointercapture', (e) => end(e, false));
  on(view, 'click', (e) => { if (suppress) { suppress = false; e.preventDefault(); e.stopPropagation(); } }, true);

  syncA11y(); measure(); paint(0);
  return () => { d.run(); root.remove(); };
}
