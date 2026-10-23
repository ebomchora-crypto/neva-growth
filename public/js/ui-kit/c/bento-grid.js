// Widget Grid — porte em JS puro do componente "Widget Grid" (bento-grid) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, onResize, clamp } from '../kit.js';
import { icon } from '../../ui.js';

const COLUMNS = 6, NARROW_COLUMNS = 2, MIN_SPAN = 2, GAP = 12;
const NARROW_BELOW = 576;      // largura do palco abaixo da qual o grid vira 2 colunas
const LONG_PRESS_MS = 350, PRESS_SLOP = 8;
const LIFT_Z = 18, MAX_TILT = 7;
const ROW_HEIGHT = 172;
const SIZE_LABEL = { s: 'pequeno', m: 'médio', l: 'grande' };

const sizeForSpan = (span, narrow = false) => (narrow ? (span <= MIN_SPAN ? 's' : 'm') : span <= 2 ? 's' : span <= 4 ? 'm' : 'l');
const clampSpan = (s) => Math.min(COLUMNS, Math.max(MIN_SPAN, Math.round(s)));
const narrowSpan = (s) => (s <= MIN_SPAN ? 1 : 2); // no grid de 2 colunas, widget pequeno ocupa uma coluna e os demais as duas
const moveItem = (list, from, to) => { const n = list.slice(); const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; };
const contains = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ---- Física de molas
const spring = (k, zeta) => ({ k, c: 2 * Math.sqrt(k) * zeta });
const MOVE_SPRING = spring(420, 0.76), LIFT_SPRING = spring(520, 0.82), TILT_SPRING = spring(260, 0.6);
const STEP = 1 / 120;
const createBody = () => ({ ox: 0, oy: 0, vx: 0, vy: 0, sx: 1, sy: 1, vsx: 0, vsy: 0, lift: 0, vlift: 0, liftTarget: 0, rx: 0, ry: 0, vrx: 0, vry: 0, pvx: 0, pvy: 0, hold: 0, pinned: false });
const integrate = (x, v, target, cfg, dt) => { const nv = v + (-cfg.k * (x - target) - cfg.c * v) * dt; return [x + nv * dt, nv]; };
const clampTilt = (v) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
function stepBody(b, dt) {
  // Inclina para a direção do arrasto: a borda direita afunda ao ir para a direita.
  const tiltY = b.pinned ? clampTilt(b.pvx * 9) : 0, tiltX = b.pinned ? clampTilt(-b.pvy * 9) : 0;
  [b.ry, b.vry] = integrate(b.ry, b.vry, tiltY, TILT_SPRING, dt); [b.rx, b.vrx] = integrate(b.rx, b.vrx, tiltX, TILT_SPRING, dt);
  [b.lift, b.vlift] = integrate(b.lift, b.vlift, b.liftTarget, LIFT_SPRING, dt);
  b.pvx *= Math.exp(-dt * 10); b.pvy *= Math.exp(-dt * 10); // com o ponteiro parado a velocidade decai e a inclinação assenta
  if (b.hold > 0) { b.hold -= dt; return; }
  if (!b.pinned) { [b.ox, b.vx] = integrate(b.ox, b.vx, 0, MOVE_SPRING, dt); [b.oy, b.vy] = integrate(b.oy, b.vy, 0, MOVE_SPRING, dt); }
  [b.sx, b.vsx] = integrate(b.sx, b.vsx, 1, MOVE_SPRING, dt); [b.sy, b.vsy] = integrate(b.sy, b.vsy, 1, MOVE_SPRING, dt);
}
const near = (x, v, t, eps) => Math.abs(x - t) < eps && Math.abs(v) < eps * 10;
const isSettled = (b) => !b.pinned && b.hold <= 0 && near(b.ox, b.vx, 0, 0.2) && near(b.oy, b.vy, 0, 0.2) && near(b.sx, b.vsx, 1, 0.001) && near(b.sy, b.vsy, 1, 0.001) && near(b.lift, b.vlift, b.liftTarget, 0.002) && near(b.rx, b.vrx, 0, 0.02) && near(b.ry, b.vry, 0, 0.02);
function snapBody(b) {
  if (!b.pinned) { b.ox = 0; b.oy = 0; }
  Object.assign(b, { vx: 0, vy: 0, sx: 1, sy: 1, vsx: 0, vsy: 0, lift: b.liftTarget, vlift: 0, rx: 0, ry: 0, vrx: 0, vry: 0, hold: 0 });
}
const r2 = (n) => Math.round(n * 100) / 100, r3 = (n) => Math.round(n * 1000) / 1000;

// ---- Widgets de exemplo (negócio)
const REVENUE_SERIES = [31, 34, 33, 36, 35, 39, 38, 41, 40, 43, 42, 45, 44, 48];
const SPARK = REVENUE_SERIES.map((v, i) => `${Math.round((i / (REVENUE_SERIES.length - 1)) * 1000) / 10},${Math.round((1 - (v - 30) / 19) * 300) / 10 + 1}`).join(' ');
const USERS_SERIES = [1820, 1960, 2010, 1890, 2240, 1450, 1380, 2120, 2380, 2290, 2510, 2640, 1720, 2841];
const DAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const EVENTS = [{ time: '09:41', text: 'Proposta enviada à Padaria Bom Grão' }, { time: '09:12', text: 'Fatura 2041 paga' }, { time: '08:55', text: 'Novo lead pelo site' }, { time: 'Seg', text: 'Backup noturno verificado' }];
const EVENT_COUNT = { s: 1, m: 3, l: 4 };
const NOTES = [{ text: 'Revisar o funil do trimestre', done: true }, { text: 'Responder propostas abertas', done: true }, { text: 'Definir preço do plano anual', done: true }, { text: 'Agendar reunião com a Aurora', done: false }, { text: 'Compartilhar plano de contratação', done: false }];
const NOTES_DONE = NOTES.filter((n) => n.done).length;
const UPTIME_INCIDENT_AGO = 18;
const STORAGE = [{ label: 'Mídia', gb: 182, tone: 'kk-bento-grid-t-a' }, { label: 'Documentos', gb: 96, tone: 'kk-bento-grid-t-b' }, { label: 'Backups', gb: 64, tone: 'kk-bento-grid-t-c' }];
const STORAGE_TOTAL = 500, STORAGE_USED = STORAGE.reduce((s, x) => s + x.gb, 0);

const head = (value, delta, tail, big) => h('div', h('p', { class: 'kk-bento-grid-val' + (big ? ' big' : '') }, value), h('p', { class: 'kk-bento-grid-sub' }, h('span', { class: 'kk-bento-grid-acc' }, delta), h('span', { class: 'kk-bento-grid-mut' }, tail)));
const spark = () => svg('svg', { class: 'kk-bento-grid-spark', 'aria-hidden': 'true', preserveAspectRatio: 'none', viewBox: '0 0 100 32' }, svg('polyline', { fill: 'none', points: SPARK, stroke: 'var(--wg-accent)', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.75, 'vector-effect': 'non-scaling-stroke' }));
const bars = (values, labels) => {
  const max = Math.max(...values);
  return h('div', { class: 'kk-bento-grid-bars' },
    h('div', { class: 'cols' }, values.map((v, i) => h('i', { class: i === values.length - 1 ? 'on' : '', style: `height:${Math.round((v / max) * 100)}%` }))),
    h('div', { class: 'lbl' }, labels.map((l) => h('span', l))));
};
const nf = (n) => new Intl.NumberFormat('pt-BR').format(n);
const WIDGETS = [
  { id: 'revenue', title: 'Receita', icon: 'trend', defaultSpan: 2, render: (size) => {
    const hd = head('R$ 48.210', '+12,4%', ' vs mês passado', size !== 's');
    if (size === 's') return h('div', { class: 'kk-bento-grid-col end' }, hd);
    if (size === 'm') return h('div', { class: 'kk-bento-grid-col between' }, hd, spark());
    return h('div', { class: 'kk-bento-grid-rev' }, h('div', { class: 'kk-bento-grid-col between', style: 'min-width:0' }, hd, spark()),
      h('dl', { class: 'kk-bento-grid-dl' }, [['Novos', 'R$ 6.140'], ['Expansão', 'R$ 2.380'], ['Cancelamentos', '−R$ 1.190']].map(([l, v]) => h('div', h('dt', l), h('dd', v)))));
  } },
  { id: 'users', title: 'Clientes ativos', icon: 'users', defaultSpan: 4, render: (size) => {
    if (size === 's') return h('div', { class: 'kk-bento-grid-col end gap' }, h('p', { class: 'kk-bento-grid-val big' }, nf(2841)), h('p', { class: 'kk-bento-grid-sub' }, h('span', { class: 'kk-bento-grid-acc' }, '+6,2%'), h('span', { class: 'kk-bento-grid-mut' }, ' hoje')));
    return h('div', { class: 'kk-bento-grid-col gap3' },
      h('div', { class: 'kk-bento-grid-base' }, h('p', { class: 'kk-bento-grid-val big' }, nf(2841)), h('p', { class: 'kk-bento-grid-sub' }, h('span', { class: 'kk-bento-grid-acc' }, '+6,2%'), h('span', { class: 'kk-bento-grid-mut' }, ' ativos hoje'))),
      h('div', { style: 'min-height:0;flex:1' }, size === 'm' ? bars(USERS_SERIES.slice(-7), DAYS) : bars(USERS_SERIES, [...DAYS, ...DAYS])));
  } },
  { id: 'activity', title: 'Atividade', icon: 'clock', defaultSpan: 3, render: (size) => {
    const count = EVENT_COUNT[size];
    return h('ol', { class: 'kk-bento-grid-tl' }, EVENTS.slice(0, count).map((ev, i) => h('li',
      h('span', { class: 'dotw' }, h('span', { class: 'dot' + (i === 0 ? ' on' : '') }), i < count - 1 ? h('span', { class: 'ln' }) : null),
      h('span', { class: 'tx' }, h('span', { class: 'tt' }, ev.text), size === 's' ? h('span', { class: 'kk-bento-grid-mut' }, `Hoje, ${ev.time}`) : null),
      size === 's' ? null : h('span', { class: 'tm' }, ev.time))));
  } },
  { id: 'notes', title: 'Tarefas', icon: 'file', defaultSpan: 3, render: (size) => {
    if (size === 's') return h('div', { class: 'kk-bento-grid-col end gap2' }, h('p', { class: 'kk-bento-grid-ntitle' }, 'Planejamento T4'), h('p', { class: 'kk-bento-grid-sub kk-bento-grid-mut' }, `${NOTES_DONE} de ${NOTES.length} concluídas`),
      h('div', { class: 'kk-bento-grid-prog' }, h('i', { style: `width:${(NOTES_DONE / NOTES.length) * 100}%` })));
    const list = size === 'm' ? NOTES.slice(2) : NOTES;
    return h('ul', { class: 'kk-bento-grid-nl' + (size === 'l' ? ' two' : '') }, list.map((n) => h('li',
      h('span', { class: 'chk' + (n.done ? ' on' : '') }, n.done ? svg('svg', { viewBox: '0 0 10 10', 'aria-hidden': 'true' }, svg('path', { d: 'M2 5.2 4.1 7.2 8 3', fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.6 })) : null),
      h('span', { class: 'nt' + (n.done ? ' done' : '') }, n.text))));
  } },
  { id: 'uptime', title: 'Loja online', icon: 'pulse', defaultSpan: 4, render: (size) => {
    const ticks = size === 'l' ? 45 : 30;
    return h('div', { class: 'kk-bento-grid-col end gap3' },
      h('div', { class: 'kk-bento-grid-base' }, h('p', { class: 'kk-bento-grid-val big' }, '99,98%'), size === 's' ? null : h('p', { class: 'kk-bento-grid-sub kk-bento-grid-mut' }, `últimos ${ticks} dias`)),
      size === 's' ? h('p', { class: 'kk-bento-grid-sub kk-bento-grid-mut' }, 'Tudo funcionando')
        : h('div', { class: 'kk-bento-grid-ticks' }, Array.from({ length: ticks }, (_, i) => h('i', { class: i === ticks - UPTIME_INCIDENT_AGO ? 'on' : '' }))),
      size === 'l' ? h('p', { class: 'kk-bento-grid-sub kk-bento-grid-mut' }, `Um incidente há ${UPTIME_INCIDENT_AGO} dias: lentidão nas respostas por 4 minutos.`) : null);
  } },
  { id: 'storage', title: 'Arquivos', icon: 'archive', defaultSpan: 2, render: (size) => {
    const segs = size === 's' ? [{ label: 'Usado', gb: STORAGE_USED, tone: 'kk-bento-grid-t-a' }] : STORAGE;
    return h('div', { class: 'kk-bento-grid-col end gap25' },
      h('p', { class: 'kk-bento-grid-base' }, h('span', { class: 'kk-bento-grid-val big' }, `${STORAGE_USED} GB`), h('span', { class: 'kk-bento-grid-sub kk-bento-grid-mut' }, ` de ${STORAGE_TOTAL}`)),
      h('div', { class: 'kk-bento-grid-seg' }, segs.map((s) => h('span', { class: s.tone, style: `width:${(s.gb / STORAGE_TOTAL) * 100}%` }))),
      size === 's' ? null : h('ul', { class: 'kk-bento-grid-leg' }, STORAGE.map((s) => h('li', h('i', { class: s.tone }), h('span', { class: 'kk-bento-grid-mut' }, s.label), size === 'l' ? h('b', `${s.gb} GB`) : null))));
  } },
];

const GRIP = () => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'grip' }, ...[[9, 6], [15, 6], [9, 12], [15, 12], [9, 18], [15, 18]].map(([cx, cy]) => svg('circle', { cx, cy, r: 1.3, fill: 'currentColor' })));

const CSS = `
.kk-bento-grid-wrap{--wg-accent:#2f7bbd;width:100%;padding:8px 0 6px;container-type:inline-size}
.kk-bento-grid-grid{position:relative;display:grid;grid-auto-flow:row dense;perspective:1400px;grid-template-columns:repeat(2,minmax(0,1fr))}
.kk-bento-grid-grid.wide{grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-flow:row}
.kk-bento-grid-cell{position:relative;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:opacity .2s ease-out}
.kk-bento-grid-cell.dim{opacity:.45}
.kk-bento-grid-cell.lifted{z-index:20}
.kk-bento-grid-surface{pointer-events:none;position:absolute;inset:0;transform-origin:top left;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;transition:border-color .2s}
.lifted .kk-bento-grid-surface{border-color:var(--ice-300,#a5cdee)}
.kk-bento-grid-shadow{position:absolute;inset:0;border-radius:16px;opacity:0;box-shadow:0 24px 48px -16px rgba(15,53,96,.3),0 8px 16px -8px rgba(15,53,96,.18)}
.kk-bento-grid-inner{position:relative;display:flex;flex-direction:column;height:100%;padding:12px 14px 14px}
.kk-bento-grid-head{display:flex;align-items:center;gap:8px;height:28px;margin-bottom:8px;flex:none}
.kk-bento-grid-head>svg.ico{width:14px;height:14px;flex:none;fill:none;stroke:#8aa7c4;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-bento-grid-title{font-size:13px;font-weight:500;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-bento-grid-gripbtn{margin:0 -8px 0 auto;display:flex;align-items:center;justify-content:center;width:36px;height:36px;margin-top:-4px;margin-bottom:-4px;flex:none;border:0;border-radius:8px;background:none;color:#8aa7c4;cursor:grab;touch-action:none;outline:none;transition:background .15s,color .15s}
.kk-bento-grid-gripbtn:hover{background:var(--ice-100,#e3f0fb);color:var(--ice-800,#164a7c)}
.kk-bento-grid-gripbtn:focus-visible{box-shadow:0 0 0 2px var(--wg-accent)}
.lifted .kk-bento-grid-gripbtn{cursor:grabbing;background:var(--ice-100,#e3f0fb);color:var(--ice-800,#164a7c)}
.kk-bento-grid-gripbtn .grip{width:16px;height:16px}
.kk-bento-grid-body{position:relative;flex:1;min-height:0}
.kk-bento-grid-layer{position:absolute;inset:0}
.kk-bento-grid-rz{position:absolute;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:flex-end;width:36px;height:36px;padding:8px;border:0;border-radius:0 0 16px 0;background:none;color:#8aa7c4;cursor:ew-resize;touch-action:none;outline:none;opacity:0;transition:opacity .15s,color .15s}
.kk-bento-grid-cell:hover .kk-bento-grid-rz,.kk-bento-grid-rz:focus-visible{opacity:1}
@media (hover:none){.kk-bento-grid-rz{opacity:.7}}
.kk-bento-grid-rz:hover{color:var(--ice-800,#164a7c)}
.kk-bento-grid-rz:focus-visible{color:var(--wg-accent)}
.kk-bento-grid-rz svg{width:10px;height:10px}
.kk-bento-grid-slots{position:absolute;pointer-events:none;overflow:visible;color:var(--ice-300,#a5cdee)}
.kk-bento-grid-val{margin:0;font-size:24px;font-weight:600;letter-spacing:-.02em;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums}
.kk-bento-grid-val.big{font-size:24px}
.kk-bento-grid-sub{margin:4px 0 0;font-size:12px}
.kk-bento-grid-mut{color:var(--mut,#4a6f93)}
.kk-bento-grid-acc{font-weight:500;color:var(--wg-accent)}
.kk-bento-grid-base{display:flex;align-items:baseline;gap:8px;margin:0}
.kk-bento-grid-base .kk-bento-grid-sub{margin:0}
.kk-bento-grid-col{display:flex;flex-direction:column;height:100%}
.kk-bento-grid-col.end{justify-content:flex-end}.kk-bento-grid-col.between{justify-content:space-between;gap:8px}
.kk-bento-grid-col.gap{gap:4px}.kk-bento-grid-col.gap2{gap:8px}.kk-bento-grid-col.gap25{gap:10px}.kk-bento-grid-col.gap3{gap:12px}
.kk-bento-grid-spark{display:block;width:100%;height:40px;overflow:visible}
.kk-bento-grid-rev{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;height:100%}
.kk-bento-grid-dl{display:flex;flex-direction:column;justify-content:flex-end;gap:6px;margin:0;font-size:12px}
.kk-bento-grid-dl div{display:flex;align-items:baseline;justify-content:space-between;gap:8px;border-bottom:1px solid var(--ice-100,#e3f0fb);padding-bottom:6px}
.kk-bento-grid-dl div:last-child{border:0;padding:0}
.kk-bento-grid-dl dt{color:var(--mut,#4a6f93)}.kk-bento-grid-dl dd{margin:0;font-weight:500;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums;white-space:nowrap}
.kk-bento-grid-bars{display:flex;flex-direction:column;gap:4px;height:100%;min-height:0}
.kk-bento-grid-bars .cols{display:flex;flex:1;min-height:0;align-items:flex-end;gap:4px}
.kk-bento-grid-bars .cols i{flex:1;border-radius:3px;background:var(--ice-200,#c9e1f6)}
.kk-bento-grid-bars .cols i.on{background:var(--wg-accent)}
.kk-bento-grid-bars .lbl{display:flex;gap:4px}
.kk-bento-grid-bars .lbl span{flex:1;text-align:center;font-size:11px;line-height:12px;color:var(--mut,#4a6f93)}
.kk-bento-grid-tl{display:flex;flex-direction:column;justify-content:flex-end;height:100%;margin:0;padding:0;list-style:none}
.kk-bento-grid-tl li{position:relative;display:flex;gap:12px;padding-bottom:8px}
.kk-bento-grid-tl li:last-child{padding-bottom:0}
.kk-bento-grid-tl .dotw{position:relative;display:flex;flex:none;justify-content:center;width:8px;padding-top:6px}
.kk-bento-grid-tl .dot{width:8px;height:8px;border-radius:50%;border:1px solid var(--ice-300,#a5cdee);background:#fff}
.kk-bento-grid-tl .dot.on{background:var(--wg-accent);border-color:var(--wg-accent)}
.kk-bento-grid-tl .ln{position:absolute;top:16px;bottom:-6px;width:1px;background:var(--ice-200,#c9e1f6)}
.kk-bento-grid-tl .tx{min-width:0;flex:1;font-size:12px;line-height:20px}
.kk-bento-grid-tl .tt{display:block;color:var(--ink,#0e2236);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-bento-grid-tl .tm{flex:none;font-size:12px;line-height:20px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-bento-grid-ntitle{margin:0;font-size:14px;font-weight:500;color:var(--ink,#0e2236)}
.kk-bento-grid-prog{height:4px;overflow:hidden;border-radius:999px;background:var(--ice-100,#e3f0fb)}
.kk-bento-grid-prog i{display:block;height:100%;border-radius:999px;background:var(--wg-accent)}
.kk-bento-grid-nl{display:grid;align-content:flex-end;gap:8px 24px;height:100%;margin:0;padding:0;list-style:none;font-size:12px}
.kk-bento-grid-nl.two{grid-template-columns:1fr 1fr}
.kk-bento-grid-nl li{display:flex;align-items:center;gap:8px;min-width:0}
.kk-bento-grid-nl .chk{display:flex;flex:none;align-items:center;justify-content:center;width:14px;height:14px;border:1px solid var(--ice-300,#a5cdee);border-radius:4px;color:#fff}
.kk-bento-grid-nl .chk.on{background:var(--wg-accent);border-color:var(--wg-accent)}
.kk-bento-grid-nl .chk svg{width:10px;height:10px}
.kk-bento-grid-nl .nt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink,#0e2236)}
.kk-bento-grid-nl .nt.done{color:#8aa7c4;text-decoration:line-through}
.kk-bento-grid-ticks{display:flex;gap:3px;height:28px}
.kk-bento-grid-ticks i{flex:1;border-radius:2px;background:var(--ice-200,#c9e1f6)}
.kk-bento-grid-ticks i.on{background:var(--wg-accent)}
.kk-bento-grid-seg{display:flex;gap:1px;height:6px;overflow:hidden;border-radius:999px;background:var(--ice-100,#e3f0fb)}
.kk-bento-grid-seg span{height:100%}
.kk-bento-grid-t-a{background:var(--wg-accent)}.kk-bento-grid-t-b{background:var(--ice-700,#1f5f9b)}.kk-bento-grid-t-c{background:var(--ice-300,#a5cdee)}
.kk-bento-grid-leg{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0;padding:0;list-style:none;font-size:12px}
.kk-bento-grid-leg li{display:flex;align-items:center;gap:6px}
.kk-bento-grid-leg i{width:8px;height:8px;border-radius:50%}
.kk-bento-grid-leg b{font-weight:400;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums}
.kk-bento-grid-hint{margin:10px 2px 0;font-size:12px;color:var(--mut,#4a6f93)}
.kk-bento-grid-bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.kk-bento-grid-bar button{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px inherit;cursor:pointer}
.kk-bento-grid-bar button:hover{background:var(--ice-100,#e3f0fb)}
.kk-bento-grid-bar button:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-bento-grid-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
`;

export default function mount(stage, ctx) {
  ensureStyle('bento-grid', CSS);
  const items = new Map(WIDGETS.map((w) => [w.id, w]));
  const defaultLayout = WIDGETS.map((w) => ({ id: w.id, span: clampSpan(w.defaultSpan) }));
  let layout = defaultLayout.map((x) => ({ ...x }));
  let narrow = true, liftedId = null, resizingId = null, pointedId = null;
  let drag = null, press = null, resizeId = null, resizeStart = null, reordering = false, pendingFlip = null;
  let rects = new Map(), motionOff = false;
  const cells = new Map(); // id -> { el, surface, shadow, grip, rz, body, size, titleEl, layer }
  const bodies = new Map();
  let raf = 0, last = 0;

  const grid = h('div', { class: 'kk-bento-grid-grid' });
  grid.style.gridAutoRows = ROW_HEIGHT + 'px'; grid.style.gap = GAP + 'px';
  const msg = h('p', { class: 'kk-bento-grid-sr', 'aria-live': 'assertive' });
  const hintId = 'kk-bento-grid-hint-' + Math.random().toString(36).slice(2, 7);
  const hint = h('p', { class: 'kk-bento-grid-sr', id: hintId }, 'Pressione Espaço para pegar. Use as setas para mover, Espaço para soltar e Esc para cancelar. Com o ponteiro, segure um widget e arraste.');
  const resetBtn = h('button', { type: 'button', onclick: resetLayout }, 'Restaurar layout');
  const wrap = h('div', { class: 'kk-bento-grid-wrap' }, grid, h('p', { class: 'kk-bento-grid-hint' }, 'Segure e arraste pelo ícone ⋮⋮, ou use a alça no canto para redimensionar.'), h('div', { class: 'kk-bento-grid-bar' }, resetBtn), hint, msg);
  stage.append(wrap);

  let announceN = 0;
  const announce = (t) => { msg.textContent = (announceN++ % 2) ? t + ' ' : t; }; // espaço final faz uma mensagem repetida ser lida de novo
  const titleOf = (id) => items.get(id)?.title ?? id;
  const posText = (id) => `posição ${layout.findIndex((c) => c.id === id) + 1} de ${layout.length}`;

  // ---- Motor: cada cartão tem sua mola; as transformações vão direto ao DOM, e o laço dorme ao assentar.
  const body = (id) => { let b = bodies.get(id); if (!b) { b = createBody(); bodies.set(id, b); } return b; };
  function write(id, b) {
    const c = cells.get(id); if (!c) return;
    const atRest = b.ox === 0 && b.oy === 0 && b.lift === 0 && b.rx === 0 && b.ry === 0;
    c.el.style.transform = atRest ? '' : `translate3d(${r2(b.ox)}px,${r2(b.oy)}px,${r2(b.lift * LIFT_Z)}px) rotateX(${r2(b.rx)}deg) rotateY(${r2(b.ry)}deg)`;
    c.surface.style.transform = b.sx === 1 && b.sy === 1 ? '' : `scale(${r3(b.sx)},${r3(b.sy)})`;
    c.shadow.style.opacity = String(r2(clamp(b.lift, 0, 1)));
  }
  function advance(b, elapsed) {
    if (motionOff) { snapBody(b); return false; }
    let t = elapsed; while (t > 0) { const dt = Math.min(STEP, t); stepBody(b, dt); t -= dt; }
    if (isSettled(b)) { snapBody(b); return false; }
    return true;
  }
  const tick = (now) => {
    const elapsed = Math.min(0.05, (now - last) / 1000); last = now;
    let active = false;
    for (const [id, b] of bodies) { active = advance(b, elapsed) || active; write(id, b); }
    raf = active ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => { if (raf) return; last = performance.now(); raf = requestAnimationFrame(tick); };

  // ---- Células
  function buildCell(w) {
    const id = w.id;
    const grip = h('button', { type: 'button', class: 'kk-bento-grid-gripbtn', 'aria-describedby': hintId, 'aria-pressed': 'false', 'data-no-press': '' }, GRIP());
    const rz = h('button', { type: 'button', class: 'kk-bento-grid-rz', 'data-no-press': '' }, svg('svg', { viewBox: '0 0 10 10', 'aria-hidden': 'true', fill: 'none' }, ...[[8.5, 3.5], [6, 6], [3.5, 8.5]].map(([cx, cy]) => svg('circle', { cx, cy, r: 1.1, fill: 'currentColor' }))));
    const shadow = h('div', { class: 'kk-bento-grid-shadow' });
    const surface = h('div', { class: 'kk-bento-grid-surface' }, shadow);
    const bodyEl = h('div', { class: 'kk-bento-grid-body' });
    const el = h('div', { class: 'kk-bento-grid-cell', dataset: { id } }, surface,
      h('div', { class: 'kk-bento-grid-inner' }, h('div', { class: 'kk-bento-grid-head' }, icon(w.icon), h('span', { class: 'kk-bento-grid-title' }, w.title), grip), bodyEl), rz);
    const c = { el, surface, shadow, grip, rz, body: bodyEl, size: null, layer: null };
    cells.set(id, c);
    el.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) setPointed(id, true); });
    el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) setPointed(id, false); });
    el.addEventListener('contextmenu', (e) => { if (liftedId === id || e.pointerType === 'touch') e.preventDefault(); }); // segurar com o dedo abriria o menu do sistema
    el.addEventListener('pointerdown', (e) => startPress(e, id));
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPointed(id, true); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setPointed(id, false); });
    grip.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); cancelPress(); liftPointer(id, e.pointerId, e.clientX, e.clientY); } });
    grip.addEventListener('keydown', (e) => onGripKey(e, id));
    grip.addEventListener('blur', () => { if (drag?.mode === 'keyboard' && drag.id === id && !reordering) endDrag(false); });
    rz.addEventListener('pointerdown', (e) => startResize(e, id));
    rz.addEventListener('keydown', (e) => onResizeKey(e, id));
    return c;
  }
  WIDGETS.forEach((w) => buildCell(w));

  const setPointed = (id, on) => { pointedId = on ? id : (pointedId === id ? null : pointedId); paintDim(); };
  function paintDim() {
    const active = liftedId ?? resizingId ?? pointedId;
    for (const [id, c] of cells) { c.el.classList.toggle('dim', active !== null && active !== id); c.el.classList.toggle('lifted', liftedId === id); }
  }

  // Troca o conteúdo ao mudar de tamanho: o novo entra e o antigo sai, em fade cruzado.
  function setSize(id, size) {
    const c = cells.get(id), w = items.get(id);
    if (c.size === size) return;
    const prev = c.layer, first = c.size === null;
    c.size = size;
    const layer = h('div', { class: 'kk-bento-grid-layer' }, w.render(size));
    c.layer = layer; c.body.append(layer);
    if (!first && !motionOff) {
      layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
      if (prev) { const a = prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' }); a.onfinish = () => prev.remove(); }
    } else prev?.remove();
  }

  function renderLayout() {
    const cols = narrow ? NARROW_COLUMNS : COLUMNS;
    grid.classList.toggle('wide', !narrow);
    layout.forEach((entry, i) => {
      const c = cells.get(entry.id), size = sizeForSpan(entry.span, narrow), shown = narrow ? narrowSpan(entry.span) : entry.span;
      if (grid.children[i] !== c.el) grid.insertBefore(c.el, grid.children[i] || null);
      c.el.style.gridColumn = `span ${shown}`;
      setSize(entry.id, size);
      c.grip.setAttribute('aria-label', `Mover ${titleOf(entry.id)} (${SIZE_LABEL[size]})`);
      c.rz.setAttribute('aria-label', `Redimensionar ${titleOf(entry.id)}, ${shown} de ${cols} colunas`);
    });
  }

  // offset* ignoram transformações: são os espaços de repouso das células.
  function measure() {
    const next = new Map();
    for (const [id, c] of cells) next.set(id, { x: c.el.offsetLeft, y: c.el.offsetTop, w: c.el.offsetWidth, h: c.el.offsetHeight });
    rects = next; return next;
  }
  const toGrid = (cx, cy) => { const box = grid.getBoundingClientRect(); return { x: cx - box.left, y: cy - box.top }; };
  // Mantém a célula presa ao ponteiro sob ele, mesmo depois de o espaço dela mudar.
  function placeDragged() {
    const rect = drag ? rects.get(drag.id) : undefined;
    if (!drag || !rect || drag.mode !== 'pointer') return;
    const p = toGrid(drag.lastX, drag.lastY), b = body(drag.id);
    b.ox = p.x - drag.grabX - rect.x; b.oy = p.y - drag.grabY - rect.y;
    write(drag.id, b); kick();
  }
  // FLIP: cada célula movida começa onde estava desenhada e volta à mola para casa.
  function flip(prev, next, movedId) {
    const origin = next.get(movedId), cx = origin ? origin.x + origin.w / 2 : 0, cy = origin ? origin.y + origin.h / 2 : 0;
    const pinnedId = drag?.mode === 'pointer' ? drag.id : null;
    for (const [id, n] of next) {
      const p = prev.get(id); if (!p || id === pinnedId) continue;
      const b = body(id), moved = Math.abs(p.x - n.x) > 0.5 || Math.abs(p.y - n.y) > 0.5 || p.w !== n.w;
      b.ox += p.x - n.x; b.oy += p.y - n.y; b.sx = (p.w * b.sx) / n.w; b.sy = (p.h * b.sy) / n.h;
      if (moved && id !== movedId) b.hold = Math.min(0.1, Math.hypot(n.x + n.w / 2 - cx, n.y + n.h / 2 - cy) * 0.00016); // vizinhos mais perto saem primeiro: a troca ondula para fora
      write(id, b);
    }
    kick();
  }
  function afterLayout() {
    const next = measure(), pending = pendingFlip; pendingFlip = null;
    if (pending) flip(pending.prev, next, pending.movedId);
    placeDragged();
    if (drag?.mode === 'keyboard') { const g = cells.get(drag.id)?.grip; if (g && document.activeElement !== g) g.focus({ preventScroll: true }); } // reordenar pode tirar o foco do nó
    reordering = false;
    updateSlots();
  }
  function commit(next, movedId) {
    pendingFlip = { prev: new Map(rects), movedId };
    layout = next; renderLayout(); afterLayout();
  }

  // ---- Pontos de encaixe (tapete de corte) enquanto algo é segurado ou redimensionado
  const slotsSvg = svg('svg', { class: 'kk-bento-grid-slots', 'aria-hidden': 'true' });
  slotsSvg.style.cssText = `top:${-GAP / 2}px;left:${-GAP / 2}px;width:calc(100% + ${GAP}px);height:calc(100% + ${GAP}px)`;
  function updateSlots() {
    const show = liftedId !== null || resizingId !== null;
    slotsSvg.replaceChildren();
    if (!show) { slotsSvg.remove(); return; }
    if (!slotsSvg.isConnected) grid.prepend(slotsSvg);
    const cols = narrow ? NARROW_COLUMNS : COLUMNS, rows = Math.max(1, Math.round((grid.offsetHeight + GAP) / (ROW_HEIGHT + GAP)));
    for (let col = 0; col <= cols; col++) for (let row = 0; row <= rows; row++) slotsSvg.append(svg('circle', { cx: `${(col / cols) * 100}%`, cy: `${(row / rows) * 100}%`, fill: 'currentColor', r: 1.5 }));
  }

  // ---- Arrasto com ponteiro
  function hitTest(x, y) {
    if (!drag) return;
    // Ignora a célula com que acabou de trocar até o ponteiro sair dela, para larguras diferentes não oscilarem.
    if (drag.skipId) { const sr = rects.get(drag.skipId); if (sr && contains(sr, x, y)) return; drag.skipId = null; }
    const from = layout.findIndex((c) => c.id === drag.id);
    const to = layout.findIndex((c) => { const r = rects.get(c.id); return c.id !== drag.id && r !== undefined && contains(r, x, y); });
    if (to < 0) return;
    drag.skipId = layout[to].id;
    commit(moveItem(layout, from, to), drag.id);
    announce(`${titleOf(drag.id)} movido para a posição ${to + 1} de ${layout.length}.`);
  }
  function onDragMove(e) {
    if (!drag || drag.mode !== 'pointer' || e.pointerId !== drag.pointerId) return;
    const now = performance.now(), dt = Math.max(1, now - drag.lastT), b = body(drag.id);
    b.pvx += ((e.clientX - drag.lastX) / dt - b.pvx) * 0.35; b.pvy += ((e.clientY - drag.lastY) / dt - b.pvy) * 0.35;
    drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = now;
    placeDragged();
    const p = toGrid(e.clientX, e.clientY); hitTest(p.x, p.y);
  }
  const onDragUp = (e) => { if (e.pointerId === drag?.pointerId) endDrag(false); };
  const onDragKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); endDrag(true); } };
  const removeDragListeners = () => { window.removeEventListener('pointermove', onDragMove); window.removeEventListener('pointerup', onDragUp); window.removeEventListener('pointercancel', onDragUp); window.removeEventListener('keydown', onDragKey); };
  function endDrag(cancel) {
    if (!drag) return;
    const d = drag; removeDragListeners();
    const b = body(d.id);
    if (d.mode === 'pointer') { b.vx = b.pvx * 400; b.vy = b.pvy * 400; } // leva parte do arremesso para a mola de assentamento
    b.pinned = false; b.liftTarget = 0; drag = null;
    if (cancel) commit(d.snapshot, d.id);
    kick(); liftedId = null; paintDim(); updateSlots(); cells.get(d.id).grip.setAttribute('aria-pressed', 'false');
    if (cancel) announce(`Movimento cancelado. ${titleOf(d.id)} voltou para a posição ${d.snapshot.findIndex((c) => c.id === d.id) + 1} de ${d.snapshot.length}.`);
    else announce(`${titleOf(d.id)} solto na ${posText(d.id)}.`);
  }
  function liftPointer(id, pointerId, cx, cy) {
    const rect = rects.get(id); if (!rect || drag) return;
    const b = body(id), p = toGrid(cx, cy);
    drag = { id, mode: 'pointer', pointerId, grabX: p.x - (rect.x + b.ox), grabY: p.y - (rect.y + b.oy), lastX: cx, lastY: cy, lastT: performance.now(), skipId: null, snapshot: layout };
    Object.assign(b, { pinned: true, hold: 0, vx: 0, vy: 0, pvx: 0, pvy: 0 }); b.liftTarget = 1;
    kick(); liftedId = id; paintDim(); updateSlots(); cells.get(id).grip.setAttribute('aria-pressed', 'true');
    announce(`${titleOf(id)} levantado, ${posText(id)}.`);
    navigator.vibrate?.(8);
    window.addEventListener('pointermove', onDragMove); window.addEventListener('pointerup', onDragUp); window.addEventListener('pointercancel', onDragUp); window.addEventListener('keydown', onDragKey);
  }

  // ---- Toque longo
  function onPressMove(e) {
    if (!press || e.pointerId !== press.pointerId) return;
    press.x = e.clientX; press.y = e.clientY;
    if (Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > PRESS_SLOP) cancelPress(); // mexer primeiro é rolar (toque) ou selecionar (mouse), não levantar
  }
  function cancelPress() {
    if (press) clearTimeout(press.timer);
    press = null;
    window.removeEventListener('pointermove', onPressMove); window.removeEventListener('pointerup', cancelPress); window.removeEventListener('pointercancel', cancelPress);
  }
  function startPress(e, id) {
    if (drag || resizeId || e.button !== 0 || e.target.closest('[data-no-press]')) return;
    cancelPress();
    press = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, timer: setTimeout(() => { const p = press; cancelPress(); if (p) liftPointer(p.id, p.pointerId, p.x, p.y); }, LONG_PRESS_MS) };
    window.addEventListener('pointermove', onPressMove); window.addEventListener('pointerup', cancelPress); window.addEventListener('pointercancel', cancelPress);
  }
  // touchmove não passivo impede a página de rolar enquanto uma célula está segura; antes do toque longo a rolagem fica livre.
  const blockTouch = (e) => { if (drag?.mode === 'pointer' || resizeId) e.preventDefault(); };
  grid.addEventListener('touchmove', blockTouch, { passive: false });

  // ---- Redimensionar
  const spanText = (span) => { const sh = narrow ? narrowSpan(span) : span, cols = narrow ? NARROW_COLUMNS : COLUMNS; return `${sh} de ${cols} colunas, ${SIZE_LABEL[sizeForSpan(span, narrow)]}`; };
  function applySpan(id, span) {
    const entry = layout.find((c) => c.id === id); if (!entry || entry.span === span) return;
    commit(layout.map((c) => (c.id === id ? { ...c, span } : c)), id);
    announce(`${titleOf(id)} redimensionado para ${spanText(span)}.`);
  }
  // Span em colunas inteiras a partir do quanto a alça andou desde o toque; usar o delta (e não a borda esquerda) é estável quando a célula muda de linha.
  function spanFromPointer(cx) {
    if (!resizeStart) return null;
    const cols = narrow ? NARROW_COLUMNS : COLUMNS, colW = (grid.clientWidth + GAP) / cols, steps = Math.round((cx - resizeStart.x) / colW);
    if (!narrow) return clampSpan(resizeStart.span + steps);
    const n = Math.max(1, Math.min(2, narrowSpan(resizeStart.span) + steps));
    return n === 1 ? MIN_SPAN : Math.max(3, resizeStart.span);
  }
  const onResizeMove = (e) => { const s = spanFromPointer(e.clientX); if (resizeId && s !== null) applySpan(resizeId, s); };
  function onResizeUp() {
    resizeId = null; resizingId = null; paintDim(); updateSlots();
    window.removeEventListener('pointermove', onResizeMove); window.removeEventListener('pointerup', onResizeUp); window.removeEventListener('pointercancel', onResizeUp);
  }
  function startResize(e, id) {
    if (drag || e.button !== 0) return;
    e.preventDefault(); cancelPress();
    resizeId = id; resizingId = id; resizeStart = { x: e.clientX, span: layout.find((c) => c.id === id)?.span ?? MIN_SPAN };
    paintDim(); updateSlots();
    window.addEventListener('pointermove', onResizeMove); window.addEventListener('pointerup', onResizeUp); window.addEventListener('pointercancel', onResizeUp);
  }
  function onResizeKey(e, id) {
    const entry = layout.find((c) => c.id === id);
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!entry || !delta) return;
    e.preventDefault();
    let span = clampSpan(entry.span + delta);
    if (narrow) span = delta > 0 ? Math.max(3, entry.span) : MIN_SPAN;
    applySpan(id, span);
  }

  // ---- Teclado
  function verticalNeighbor(id, up) {
    const cur = rects.get(id); let best = -1, bestDy = Infinity, bestDx = Infinity; if (!cur) return best;
    const cx = cur.x + cur.w / 2;
    layout.forEach((c, i) => {
      const r = rects.get(c.id);
      if (!r || !(up ? r.y + r.h <= cur.y + 1 : r.y >= cur.y + cur.h - 1)) return;
      const dy = Math.abs(r.y - cur.y), dx = Math.abs(r.x + r.w / 2 - cx);
      if (dy < bestDy - 1 || (Math.abs(dy - bestDy) <= 1 && dx < bestDx)) { best = i; bestDy = dy; bestDx = dx; }
    });
    return best;
  }
  function neighborIndex(id, key) {
    const index = layout.findIndex((c) => c.id === id);
    if (key === 'ArrowLeft') return Math.max(0, index - 1);
    if (key === 'ArrowRight') return Math.min(layout.length - 1, index + 1);
    if (key === 'ArrowUp' || key === 'ArrowDown') { const f = verticalNeighbor(id, key === 'ArrowUp'); return f < 0 ? index : f; }
    return null;
  }
  function liftKeyboard(id) {
    drag = { id, mode: 'keyboard', pointerId: -1, grabX: 0, grabY: 0, lastX: 0, lastY: 0, lastT: 0, skipId: null, snapshot: layout };
    body(id).liftTarget = 1; kick(); liftedId = id; paintDim(); updateSlots(); cells.get(id).grip.setAttribute('aria-pressed', 'true');
    announce(`${titleOf(id)} levantado, ${posText(id)}. Setas movem, Espaço solta, Esc cancela.`);
  }
  function moveByKey(id, key) {
    const to = neighborIndex(id, key); if (to === null) return false;
    const from = layout.findIndex((c) => c.id === id);
    if (to === from) { announce(`${titleOf(id)} está na ${posText(id)}.`); return true; }
    reordering = true; commit(moveItem(layout, from, to), id);
    announce(`${titleOf(id)} movido para a posição ${to + 1} de ${layout.length}.`); return true;
  }
  function onGripKey(e, id) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (drag?.id === id) endDrag(false); else if (!drag) liftKeyboard(id); return; }
    if (drag?.id !== id || drag.mode !== 'keyboard') return;
    if (e.key === 'Escape') { e.preventDefault(); reordering = true; endDrag(true); return; }
    if (moveByKey(id, e.key)) e.preventDefault();
  }
  function resetLayout() {
    if (drag) endDrag(true);
    commit(defaultLayout.map((x) => ({ ...x })), layout[0].id);
    announce('Layout restaurado.');
  }

  // ---- Tamanho do palco decide 2 ou 6 colunas
  const offResize = onResize(wrap, () => {
    narrow = wrap.clientWidth < NARROW_BELOW;
    renderLayout(); measure(); placeDragged(); updateSlots();
  });
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => { motionOff = mq.matches; };
  syncMotion(); mq.addEventListener('change', syncMotion);
  renderLayout(); measure();

  return () => {
    cancelPress(); removeDragListeners(); onResizeUp();
    cancelAnimationFrame(raf); raf = 0; offResize(); mq.removeEventListener('change', syncMotion);
    grid.removeEventListener('touchmove', blockTouch); wrap.remove();
  };
}
