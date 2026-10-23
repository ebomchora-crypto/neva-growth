// Timezone Planner — porte em JS puro do componente "Timezone Planner" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, loop, spring, disposer, clamp, reduced } from '../kit.js';
import { copyText } from '../../ui.js';

const DAY = 1440, STEP = 15, MIN_DUR = 30, MAX_DUR = 480;
const NIGHT_FROM = 22, NIGHT_TO = 7;  // horas locais que contam como "dormindo", seja qual for o expediente
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];  // só para ler o Intl; a tela usa português
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const OFFSET = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/;
const TAU = Math.PI * 2;
const SIZE = 340, C = SIZE / 2, R_OUT = 134, R_IN = 60, RING_GAP = 4, WEDGE_IN = R_IN - 7, WEDGE_OUT = R_OUT + 6, LABEL_R = 160;
const EDGE_REACH = 13;   // até onde (unid. do viewBox) além da borda da cunha ainda "pega" a borda
const COAST = 0.14;      // projeção do arremesso: segundos de velocidade que a cunha ainda percorre

const PEOPLE = [
  { id: 'voce', name: 'Você', city: 'São Paulo', timeZone: 'America/Sao_Paulo' },
  { id: 'ines', name: 'Inês Carvalho', city: 'Lisboa', timeZone: 'Europe/Lisbon' },
  { id: 'rafael', name: 'Rafael Costa', city: 'Nova York', timeZone: 'America/New_York' },
  { id: 'karim', name: 'Karim Haddad', city: 'Dubai', timeZone: 'Asia/Dubai' },
  { id: 'aiko', name: 'Aiko Tanaka', city: 'Tóquio', timeZone: 'Asia/Tokyo' },
];
const STATUS_LABEL = { working: 'Em horário', early: 'Cedo', late: 'Tarde', asleep: 'Dormindo' };

const mod = (v, m) => ((v % m) + m) % m;
const snap = (v) => Math.round(v / STEP) * STEP;
const pad = (x) => String(x).padStart(2, '0');
const turn = (from, to) => mod(to - from + DAY / 2, DAY) - DAY / 2;  // o caminho mais curto no mostrador, em minutos
const round = (x) => Math.round(x * 100) / 100;
const clock = (m) => { const q = mod(Math.round(m), DAY); return `${pad(Math.floor(q / 60))}:${pad(q % 60)}`; };

function offsetOf(timeZone, at) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = OFFSET.exec(name); if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}
const shiftLabel = (s) => { if (s === 0) return 'mesmo horário'; const a = Math.abs(s), mi = a % 60; return `${s > 0 ? '+' : '−'}${Math.floor(a / 60)}h${mi ? pad(mi) : ''}`; };
function fieldsIn(timeZone, at) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '0';
  return { year: +get('year'), month: +get('month'), day: +get('day'), minutes: +get('hour') * 60 + +get('minute'), weekday: WEEKDAYS_EN.indexOf(get('weekday')) };
}
function buildDay(people, date, today) {
  const ref = people[0].timeZone, f = fieldsIn(ref, date);
  const noon = new Date(Date.UTC(f.year, f.month - 1, f.day, 12));  // meio-dia do dia planejado: os deslocamentos são os desse dia (horário de verão incluso)
  const refOff = offsetOf(ref, noon), shifts = people.map((p) => offsetOf(p.timeZone, noon) - refOff), t = fieldsIn(ref, today);
  return {
    shifts, shiftLabels: shifts.map(shiftLabel), weekday: f.weekday,
    label: new Intl.DateTimeFormat('pt-BR', { timeZone: ref, weekday: 'short', day: 'numeric', month: 'short' }).format(noon).replace('.', ''),
    now: t.year === f.year && t.month === f.month && t.day === f.day ? t.minutes : null,
    midnight: Date.UTC(f.year, f.month - 1, f.day) - refOff * 60000,
  };
}
function kindAt(local, start, end) {
  const hr = mod(local, DAY) / 60;
  if (hr >= start && hr < end) return 'work';
  return hr >= NIGHT_FROM || hr < NIGHT_TO ? 'night' : 'off';
}
/** O anel de cada pessoa, cortado onde o dia dela muda de tipo. */
function segmentsFor(p, shift) {
  const segs = [];
  for (let m = 0; m < DAY; m += STEP) {
    const kind = kindAt(m + shift, p.workStart ?? 9, p.workEnd ?? 18), last = segs[segs.length - 1];
    if (last && last.kind === kind) last.to = m + STEP; else segs.push({ from: m, to: m + STEP, kind });
  }
  return segs;
}
function statusFor(p, shift, start, dur) {
  const ws = (p.workStart ?? 9) * 60, we = (p.workEnd ?? 18) * 60, local = start + shift, day = Math.floor(local / DAY) * DAY;
  if (local >= day + ws && local + dur <= day + we) return 'working';
  if (kindAt(local, ws / 60, we / 60) === 'night') return 'asleep';
  return mod(local, DAY) < ws ? 'early' : 'late';
}
function outsideMinutes(p, shift, start, dur) {
  let out = 0;
  for (let m = start; m < start + dur; m += STEP) if (kindAt(m + shift, p.workStart ?? 9, p.workEnd ?? 18) !== 'work') out += STEP;
  return out;
}
/** O horário que mantém mais gente dentro do expediente. */
function bestStart(people, shifts, dur) {
  let best = 0, bestScore = -Infinity;
  for (let s = 0; s < DAY; s += STEP) {
    let score = 0;
    people.forEach((p, i) => { const sh = shifts[i] ?? 0; if (statusFor(p, sh, s, dur) === 'working') score += 10000; score -= outsideMinutes(p, sh, s, dur); });
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best;
}
/** Ponto no mostrador: os minutos correm no sentido horário, a partir da meia-noite no topo. */
const polar = (r, m) => { const a = m / DAY * TAU; return [round(C + r * Math.sin(a)), round(C - r * Math.cos(a))]; };
function slice(r0, r1, from, to) {
  const span = to - from;
  if (span >= DAY) return `M ${C} ${C - r1} A ${r1} ${r1} 0 1 1 ${C} ${C + r1} A ${r1} ${r1} 0 1 1 ${C} ${C - r1} M ${C} ${C - r0} A ${r0} ${r0} 0 1 0 ${C} ${C + r0} A ${r0} ${r0} 0 1 0 ${C} ${C - r0} Z`;
  const large = span > DAY / 2 ? 1 : 0, [ax, ay] = polar(r1, from), [bx, by] = polar(r1, to), [cx, cy] = polar(r0, to), [dx, dy] = polar(r0, from);
  return `M ${ax} ${ay} A ${r1} ${r1} 0 ${large} 1 ${bx} ${by} L ${cx} ${cy} A ${r0} ${r0} 0 ${large} 0 ${dx} ${dy} Z`;
}
function ringBounds(i, count) { const w = (R_OUT - R_IN - RING_GAP * (count - 1)) / count, outer = R_OUT - i * (w + RING_GAP); return { outer, inner: outer - w }; }

/** Cada dígito gira na sua própria roda; separadores ficam parados. Casas contadas da direita. */
function makeRolling() {
  const el = h('span', { class: 'kk-timezone-planner-roll', 'aria-hidden': 'true' }); let map = new Map();
  return {
    el, set(value) {
      const chars = [...value], keep = new Set();
      chars.forEach((ch, i) => {
        const key = chars.length - i, digit = /\d/.test(ch); keep.add(key);
        let it = map.get(key);
        if (it && it.digit !== digit) { it.node.remove(); map.delete(key); it = null; }
        if (!it) {
          let node, wheel = null;
          if (digit) {
            wheel = h('span', { class: 'kk-timezone-planner-wheel' }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((q) => h('span', String(q))));
            node = h('span', { class: 'kk-timezone-planner-digit' }, h('span', { style: 'visibility:hidden' }, '0'), wheel);
          } else node = h('span', { style: 'white-space:pre' });
          it = { node, wheel, digit, ch: '' }; map.set(key, it);
        }
        if (it.ch !== ch) { it.ch = ch; if (digit) it.wheel.style.transform = `translateY(-${Number(ch) * 10}%)`; else it.node.textContent = ch; }
      });
      for (const [k, it] of [...map]) if (!keep.has(k)) { it.node.remove(); map.delete(k); }
      [...map.keys()].sort((a, b) => b - a).forEach((k) => el.append(map.get(k).node));
    },
  };
}

export default function mount(stage, ctx) {
  ensureStyle('timezone-planner', `
.kk-timezone-planner-root{width:100%;box-sizing:border-box;container-type:inline-size;padding:10px 6px}
.kk-timezone-planner-card{box-sizing:border-box;width:100%;max-width:42rem;margin:0 auto;padding:14px;border-radius:16px;background:#fff;color:var(--ink,#0e2236);box-shadow:0 0 0 1px var(--line,#d3e6f6);user-select:none;-webkit-user-select:none}
.kk-timezone-planner-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kk-timezone-planner-head h3{margin:0;font-size:14px;font-weight:600}
.kk-timezone-planner-head p{margin:0;font-size:12px;color:var(--mut,#4a6f93)}
.kk-timezone-planner-acts{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.kk-timezone-planner-btn{min-height:36px;padding:0 12px;border:0;border-radius:9px;background:#fff;box-shadow:inset 0 0 0 1px var(--line,#d3e6f6);color:var(--ink,#0e2236);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.kk-timezone-planner-btn:hover:not(:disabled){background:var(--ice-50,#f2f8fe)}
.kk-timezone-planner-btn:disabled{color:var(--mut,#4a6f93);opacity:.7;cursor:default}
.kk-timezone-planner-btn:focus-visible,.kk-timezone-planner-step:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:1px}
.kk-timezone-planner-grid{margin-top:14px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:center}
@container (min-width:34rem){.kk-timezone-planner-grid{grid-template-columns:minmax(0,19rem) minmax(0,1fr);gap:24px}.kk-timezone-planner-dialbox{max-width:19rem}}
.kk-timezone-planner-dialbox{position:relative;width:100%;max-width:16rem;margin:0 auto;aspect-ratio:1}
.kk-timezone-planner-svg{width:100%;height:100%;overflow:visible;touch-action:none;cursor:grab}
.kk-timezone-planner-svg.drag{cursor:grabbing}
.kk-timezone-planner-svg text{font-size:9.5px;font-weight:600;fill:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-timezone-planner-svg .tick{stroke:var(--ice-300,#a5cdee)}
.kk-timezone-planner-svg .ring{transition:opacity .15s}
.kk-timezone-planner-svg .ring.dim{opacity:.35}
.kk-timezone-planner-svg .base.work{fill:rgba(47,123,189,.2)}.kk-timezone-planner-svg .base.off{fill:#eaf3fb}.kk-timezone-planner-svg .base.night{fill:#d3e3f1}
.kk-timezone-planner-svg .lit.work{fill:#2f7bbd}.kk-timezone-planner-svg .lit.off{fill:#a5cdee}.kk-timezone-planner-svg .lit.night{fill:#7f9bb5}
.kk-timezone-planner-svg .midl{stroke:var(--mut,#4a6f93);stroke-width:1.25}
.kk-timezone-planner-svg .wedge{fill:rgba(14,34,54,.03);stroke:var(--ink,#0e2236);stroke-width:1.5;stroke-linejoin:round;transition:stroke .2s}
.kk-timezone-planner-svg .wedge.all{stroke:var(--ok,#1f9d6b)}
.kk-timezone-planner-svg .wedge.keyed{stroke-width:2.75}
.kk-timezone-planner-svg .knob{fill:#fff;stroke:var(--ink,#0e2236);stroke-width:1.5}
.kk-timezone-planner-svg .nowhand{stroke:var(--ice-900,#0f3560);stroke-width:1.5;stroke-linecap:round;pointer-events:none}
.kk-timezone-planner-svg .nowdot{fill:var(--ice-900,#0f3560);pointer-events:none}
.kk-timezone-planner-svg .hov{stroke:rgba(14,34,54,.3);stroke-width:1;pointer-events:none}
.kk-timezone-planner-read{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;outline:none}
.kk-timezone-planner-big{font-size:22px;font-weight:700;line-height:1;letter-spacing:-.02em}
.kk-timezone-planner-sm{margin-top:4px;font-size:12px;line-height:1;color:var(--mut,#4a6f93)}
.kk-timezone-planner-dots{margin-top:8px;display:flex;gap:4px}
.kk-timezone-planner-dots i{width:6px;height:6px;border-radius:50%;background:var(--ice-200,#c9e1f6);transition:background .2s}
.kk-timezone-planner-dots i.on{background:var(--ice-600,#2f7bbd)}
.kk-timezone-planner-roll{display:inline-flex;height:1.25em;align-items:flex-start;vertical-align:top;font-variant-numeric:tabular-nums;line-height:1.25em}
.kk-timezone-planner-digit{position:relative;display:inline-block;height:1.25em;overflow:hidden;line-height:1.25em}
.kk-timezone-planner-wheel{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;transition:transform .3s cubic-bezier(.23,1,.32,1)}
.kk-timezone-planner-wheel span{display:block;height:1.25em;line-height:1.25em}
@media (prefers-reduced-motion:reduce){.kk-timezone-planner-wheel{transition:none}}
.kk-timezone-planner-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.kk-timezone-planner-li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--ice-100,#e3f0fb);transition:opacity .15s}
.kk-timezone-planner-li:last-child{border-bottom:0}
.kk-timezone-planner-li.dim{opacity:.45}
.kk-timezone-planner-li svg{width:16px;height:16px;flex-shrink:0}
.kk-timezone-planner-who{min-width:0;flex:1;display:flex;flex-direction:column}
.kk-timezone-planner-city{display:flex;align-items:baseline;gap:6px;min-width:0}
.kk-timezone-planner-city b{font-size:13px;font-weight:600;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-timezone-planner-city small,.kk-timezone-planner-nm{font-size:11px;color:var(--mut,#4a6f93)}
.kk-timezone-planner-nm{line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-timezone-planner-rg{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end}
.kk-timezone-planner-rg>span:first-child{font-size:12px;line-height:20px}
.kk-timezone-planner-stt{font-size:11px;line-height:16px;color:var(--mut,#4a6f93);transition:color .15s}
.kk-timezone-planner-stt.working{color:var(--ok,#1f9d6b)}
.kk-timezone-planner-foot{margin-top:14px;padding-top:12px;border-top:1px solid var(--ice-100,#e3f0fb);display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-size:12px;color:var(--mut,#4a6f93)}
.kk-timezone-planner-dur{display:flex;align-items:center;border-radius:9px;box-shadow:inset 0 0 0 1px var(--line,#d3e6f6)}
.kk-timezone-planner-dur span{min-width:64px;text-align:center;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums}
.kk-timezone-planner-step{width:36px;height:36px;border:0;border-radius:9px;background:none;color:var(--mut,#4a6f93);font:inherit;font-size:16px;cursor:pointer}
.kk-timezone-planner-step:hover:not(:disabled){color:var(--ink,#0e2236)}
.kk-timezone-planner-step:disabled{opacity:.35;cursor:default}
.kk-timezone-planner-cnt{margin-left:auto;transition:color .15s}
.kk-timezone-planner-cnt.all{color:var(--ok,#1f9d6b)}
.kk-timezone-planner-cnt b{color:var(--ink,#0e2236);font-weight:600;font-variant-numeric:tabular-nums}
`);
  const d = disposer(); const rm = reduced();
  const people = PEOPLE, N = people.length;
  const now = new Date(), day = buildDay(people, now, now);
  const segments = people.map((p, i) => segmentsFor(p, day.shifts[i]));
  let start = 16 * 60, dur = 60, hover = null, focus = null, dragging = false, keyed = false, grab = null, last = 0;
  let sp = null, slotKey = '', samples = [], lastSlot = null;
  const S = (t, a, ...k) => svg(t, a, ...k);
  const clipId = 'kk-tz-' + Math.random().toString(36).slice(2, 8);

  // ---- mostrador (SVG)
  const wedgeClip = S('path'), wedgeOutline = S('path', { class: 'wedge' });
  const knobA = S('circle', { class: 'knob', r: 4.5 }), knobB = S('circle', { class: 'knob', r: 4.5 });
  const marks = S('g');
  for (let hr = 0; hr < 24; hr++) {
    if (hr % 3 === 0) { const [x, y] = polar(LABEL_R - 6, hr * 60); marks.append(S('text', { x, y, 'dominant-baseline': 'central', 'text-anchor': 'middle' }, pad(hr))); }
    else { const [x0, y0] = polar(R_OUT + 11, hr * 60), [x1, y1] = polar(R_OUT + 15, hr * 60); marks.append(S('line', { class: 'tick', x1: x0, y1: y0, x2: x1, y2: y1, 'stroke-width': 1 })); }
  }
  const ringGroups = people.map((p, i) => {
    const { outer, inner } = ringBounds(i, N), mid = mod(-day.shifts[i], DAY), [x0, y0] = polar(inner, mid), [x1, y1] = polar(outer, mid);
    const base = segments[i].map((sg) => S('path', { class: 'base ' + sg.kind, d: slice(inner, outer, sg.from, sg.to) }));
    const lit = segments[i].map((sg) => S('path', { class: 'lit ' + sg.kind, d: slice(inner, outer, sg.from, sg.to) }));
    return S('g', { class: 'ring' }, base, day.shifts[i] !== 0 ? S('line', { class: 'midl', x1: x0, y1: y0, x2: x1, y2: y1 }) : null, S('g', { 'clip-path': `url(#${clipId})` }, lit));
  });
  const hoverHand = S('line', { class: 'hov', style: 'display:none' });
  let nowHand = null;
  if (day.now !== null) {
    const [x0, y0] = polar(WEDGE_IN - 2, day.now), [x1, y1] = polar(R_OUT + 14, day.now);
    nowHand = S('g', {}, S('line', { class: 'nowhand', x1: x0, y1: y0, x2: x1, y2: y1 }), S('circle', { class: 'nowdot', cx: x1, cy: y1, r: 2.5 }));
  }
  const svgEl = S('svg', { class: 'kk-timezone-planner-svg', viewBox: `0 0 ${SIZE} ${SIZE}`, 'aria-hidden': 'true' },
    S('defs', {}, S('clipPath', { id: clipId }, wedgeClip)), marks, ringGroups, nowHand, hoverHand, S('g', {}, wedgeOutline, knobA, knobB));

  // ---- leitura central (também é a alça do teclado)
  const bigRoll = makeRolling(), endRoll = makeRolling(), dots = people.map(() => h('i'));
  const read = h('div', { class: 'kk-timezone-planner-read', role: 'slider', tabindex: '0', 'aria-label': 'Horário da reunião', 'aria-valuemin': 0, 'aria-valuemax': DAY - STEP, onblur: () => { keyed = false; paintWedge(); }, onfocus: (e) => { keyed = e.currentTarget.matches(':focus-visible'); paintWedge(); }, onkeydown: onKey },
    h('span', { class: 'kk-timezone-planner-big' }, bigRoll.el), h('span', { class: 'kk-timezone-planner-sm' }, 'até ', endRoll.el), h('span', { class: 'kk-timezone-planner-dots', 'aria-hidden': 'true' }, dots));
  const dialBox = h('div', { class: 'kk-timezone-planner-dialbox' }, svgEl, read);

  // ---- lista de pessoas
  const rows = people.map((p, i) => {
    const glyph = S('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, Array.from({ length: N }, (_, k) => S('circle', { cx: 8, cy: 8, r: 7 - k * 4.5 / Math.max(1, N - 1), fill: 'none', stroke: k === i ? '#0e2236' : '#c9e1f6', 'stroke-width': k === i ? 1.5 : 1 })));
    const rangeRoll = makeRolling(), stt = h('span', { class: 'kk-timezone-planner-stt' }), sr = h('span', { class: 'kk-timezone-planner-nm', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' });
    const li = h('li', { class: 'kk-timezone-planner-li', title: p.name, onpointerenter: (e) => e.pointerType === 'mouse' && setFocus(i), onpointerleave: () => setFocus(null) },
      glyph, h('div', { class: 'kk-timezone-planner-who' }, h('span', { class: 'kk-timezone-planner-city' }, h('b', p.city), h('small', i === 0 ? 'você' : day.shiftLabels[i])), h('span', { class: 'kk-timezone-planner-nm' }, p.name === 'Você' ? 'Seu relógio' : p.name)),
      h('div', { class: 'kk-timezone-planner-rg' }, h('span', rangeRoll.el), stt), sr);
    return { li, rangeRoll, stt, sr };
  });

  // ---- cabeçalho e rodapé
  const sub = h('p'), bestBtn = h('button', { type: 'button', class: 'kk-timezone-planner-btn', onclick: () => glideTo(bestStart(people, day.shifts, dur)) });
  const copyBtn = h('button', { type: 'button', class: 'kk-timezone-planner-btn', onclick: () => copyInvite() }, 'Copiar convite');
  const bMinus = h('button', { type: 'button', class: 'kk-timezone-planner-step', 'aria-label': 'Reunião mais curta', onclick: () => resize(-STEP) }, '−');
  const bPlus = h('button', { type: 'button', class: 'kk-timezone-planner-step', 'aria-label': 'Reunião mais longa', onclick: () => resize(STEP) }, '+');
  const lenEl = h('span'), cntNum = h('b'), cnt = h('span', { class: 'kk-timezone-planner-cnt', 'aria-live': 'polite' });
  const card = h('div', { class: 'kk-timezone-planner-card' },
    h('div', { class: 'kk-timezone-planner-head' }, h('div', h('h3', 'Encontre um horário'), sub), h('div', { class: 'kk-timezone-planner-acts' }, bestBtn, copyBtn)),
    h('div', { class: 'kk-timezone-planner-grid' }, dialBox, h('ul', { class: 'kk-timezone-planner-list' }, rows.map((r) => r.li))),
    h('div', { class: 'kk-timezone-planner-foot' }, h('span', 'Horário de São Paulo'), h('div', { class: 'kk-timezone-planner-dur' }, bMinus, lenEl, bPlus), cnt));
  stage.append(h('div', { class: 'kk-timezone-planner-root' }, card)); d(() => stage.firstChild?.remove());
  sub.textContent = `${day.label} · ${N} pessoas`;

  // ---- desenho
  function paintWedge() {
    const w = slice(WEDGE_IN, WEDGE_OUT, start, start + dur);
    wedgeClip.setAttribute('d', w); wedgeOutline.setAttribute('d', w);
    const [ax, ay] = polar(WEDGE_OUT, start), [bx, by] = polar(WEDGE_OUT, start + dur);
    knobA.setAttribute('cx', ax); knobA.setAttribute('cy', ay); knobB.setAttribute('cx', bx); knobB.setAttribute('cy', by);
    wedgeOutline.classList.toggle('keyed', keyed);
  }
  function paintFocus() {
    ringGroups.forEach((g, i) => g.classList.toggle('dim', focus !== null && focus !== i));
    rows.forEach((r, i) => r.li.classList.toggle('dim', focus !== null && focus !== i));
  }
  function localRange(i, s) {
    const local = s + day.shifts[i], ds = Math.floor(local / DAY);
    return `${ds !== 0 ? WEEKDAYS[mod(day.weekday + ds, 7)] + ' ' : ''}${clock(local)}–${clock(local + dur)}`;
  }
  const slotNow = () => ({ s: mod(snap(start), DAY), dur });
  function paintInfo() {
    const { s } = slotNow(), end = s + dur;
    const statuses = people.map((p, i) => statusFor(p, day.shifts[i], s, dur)), avail = statuses.filter((x) => x === 'working').length, everyone = avail === N;
    const best = bestStart(people, day.shifts, dur), atBest = best === s;
    bigRoll.set(clock(s)); endRoll.set(clock(end)); dots.forEach((el, i) => el.classList.toggle('on', statuses[i] === 'working'));
    rows.forEach((r, i) => { const rg = localRange(i, s); r.rangeRoll.set(rg); r.stt.textContent = STATUS_LABEL[statuses[i]]; r.stt.className = 'kk-timezone-planner-stt ' + statuses[i]; r.sr.textContent = `${people[i].name}, ${rg} ${STATUS_LABEL[statuses[i]]}`; });
    const hrs = dur / 60;
    lenEl.textContent = dur % 60 ? `${hrs >= 1 ? Math.floor(hrs) + ' h ' : ''}${dur % 60} min` : `${hrs} h`;
    bMinus.disabled = dur <= MIN_DUR; bPlus.disabled = dur >= MAX_DUR;
    bestBtn.disabled = atBest; bestBtn.textContent = atBest ? 'Melhor horário' : 'Encontrar o melhor';
    cntNum.textContent = String(avail); cnt.replaceChildren(cntNum, ` de ${N} no expediente`); cnt.classList.toggle('all', everyone);
    wedgeOutline.classList.toggle('all', everyone);
    read.setAttribute('aria-valuenow', s); read.setAttribute('aria-valuetext', `${clock(s)} às ${clock(end)}, horário de São Paulo, ${avail} de ${N} no expediente`);
    lastSlot = { s, dur, statuses };
  }
  function changed() { paintWedge(); const k = mod(snap(start), DAY) + ':' + dur; if (k !== slotKey) { slotKey = k; paintInfo(); } }

  // ---- movimento: a cunha desliza (com mola) até um horário, pelo caminho mais curto, levando o arremesso
  function stopGlide() { sp?.(); sp = null; }
  d(stopGlide);
  function glideTo(target, velocity = 0) {
    stopGlide();
    const from = start, to = from + turn(from, snap(target));
    if (rm) { start = to; changed(); return; }
    const m = spring(from, { k: 158, c: 21.4 }); m.to(to); m.kick(velocity);
    sp = loop((dt) => { start = m.step(dt); changed(); if (m.settled) { start = to; changed(); stopGlide(); } });
  }
  function resize(by) { dur = clamp(dur + by, MIN_DUR, MAX_DUR); changed(); }
  const setFocus = (i) => { if (focus !== i) { focus = i; paintFocus(); } };

  // ---- ponteiro
  function pointAt(cx, cy) {
    const r = svgEl.getBoundingClientRect(), k = SIZE / r.width, dx = (cx - r.left) * k - C, dy = (cy - r.top) * k - C;
    return { minutes: mod(Math.atan2(dx, -dy) / TAU * DAY, DAY), r: Math.hypot(dx, dy) };
  }
  function grabFor(minutes, r) {
    // As bordas alcançam um pouco para fora da cunha e só um pouco para dentro: reunião curta ainda tem meio para segurar.
    const reach = EDGE_REACH / Math.max(r, R_IN) * (DAY / TAU), inside = Math.min(reach / 2, dur / 4), fs = turn(start, minutes), fe = turn(start + dur, minutes);
    if (fs >= -reach && fs <= inside) return { mode: 'start', end: start + dur };
    if (fe >= -inside && fe <= reach) return { mode: 'end' };
    const into = mod(minutes - start, DAY); return into < dur ? { mode: 'move', offset: into } : null;
  }
  function ringAt(r) { for (let i = 0; i < N; i++) { const { outer, inner } = ringBounds(i, N); if (r <= outer + RING_GAP / 2 && r >= inner - RING_GAP / 2) return i; } return null; }
  const setStart = (v, t) => { start = v; samples.push({ t, v }); while (samples.length > 2 && t - samples[0].t > 80) samples.shift(); changed(); };

  svgEl.addEventListener('pointerdown', (e) => {
    if (grab || e.button !== 0) return;
    const { minutes, r } = pointAt(e.clientX, e.clientY);
    if (r < WEDGE_IN - 4 || r > LABEL_R + 8) return;  // o miolo guarda a leitura; além dos rótulos é fora do mostrador
    svgEl.setPointerCapture(e.pointerId); last = minutes; samples = [{ t: e.timeStamp, v: start }];
    const g = grabFor(minutes, r);
    if (g) { stopGlide(); grab = g; }
    else { glideTo(minutes - dur / 2); grab = { mode: 'move', offset: dur / 2 }; }  // um toque em outro lugar traz a reunião para lá e continua seguindo se arrastar
    dragging = true; svgEl.classList.add('drag'); hover = null; hoverHand.style.display = 'none';
  });
  function dragTo(minutes, g, t) {
    const pointer = last + turn(last, minutes); last = pointer;  // desenrola o ponteiro: passar da meia-noite mantém o sentido
    if (g.mode === 'move') { setStart(pointer - g.offset, t); return; }
    if (g.mode === 'end') { const span = mod(pointer - start, DAY); dur = clamp(snap(span > (MAX_DUR + DAY) / 2 ? MIN_DUR : span), MIN_DUR, MAX_DUR); changed(); return; }  // arrastar para antes do início mantém o mínimo
    const span = mod(g.end - pointer, DAY), nd = clamp(snap(span > (MAX_DUR + DAY) / 2 ? MIN_DUR : span), MIN_DUR, MAX_DUR);
    start = g.end - nd; dur = nd; changed();
  }
  svgEl.addEventListener('pointermove', (e) => {
    const { minutes, r } = pointAt(e.clientX, e.clientY);
    if (grab) { stopGlide(); dragTo(minutes, grab, e.timeStamp); return; }
    if (e.pointerType !== 'mouse') return;
    const onDial = r >= WEDGE_IN - 4 && r <= WEDGE_OUT + 4;
    hover = onDial ? minutes : null;
    if (onDial) { const [x0, y0] = polar(WEDGE_IN, minutes), [x1, y1] = polar(WEDGE_OUT, minutes); hoverHand.setAttribute('x1', x0); hoverHand.setAttribute('y1', y0); hoverHand.setAttribute('x2', x1); hoverHand.setAttribute('y2', y1); }
    hoverHand.style.display = onDial ? '' : 'none'; setFocus(onDial ? ringAt(r) : null);
  });
  const up = (e) => {
    if (!grab) return;
    const g = grab; grab = null; dragging = false; svgEl.classList.remove('drag');
    if (g.mode !== 'move') return;
    // Arremesso: segue um pouco e assenta no quarto de hora.
    const f = samples[0], l = samples[samples.length - 1], el = (l.t - f.t) / 1000;
    const vel = el > 0 && e.timeStamp - l.t <= 80 ? (l.v - f.v) / el : 0;
    glideTo(start + clamp(vel * COAST, -120, 120), vel);
  };
  svgEl.addEventListener('pointerup', up); svgEl.addEventListener('pointercancel', up);
  svgEl.addEventListener('pointerleave', () => { hover = null; hoverHand.style.display = 'none'; setFocus(null); });

  function onKey(e) {
    const s = snap(start), st = e.shiftKey ? 60 : STEP;
    if (e.key === '-' || e.key === '+' || e.key === '=') { e.preventDefault(); resize(e.key === '-' ? -STEP : STEP); return; }
    const mv = { ArrowLeft: s - st, ArrowDown: s - st, ArrowRight: s + st, ArrowUp: s + st, PageDown: s - 60, PageUp: s + 60 }[e.key];
    if (mv === undefined) return;
    e.preventDefault(); stopGlide(); start = mv; changed();  // teclas movem na hora: repetem rápido demais para animar
  }

  // ---- convite em texto: horário de cada pessoa, pronto para colar numa conversa
  function copyInvite() {
    const { s } = slotNow(), lines = people.map((p, i) => `${p.city}: ${localRange(i, s)} (${STATUS_LABEL[statusFor(p, day.shifts[i], s, dur)].toLowerCase()})`);
    copyText(`Reunião · ${day.label} · ${clock(s)}–${clock(s + dur)} (horário de São Paulo)\n${lines.join('\n')}`, 'Convite copiado.');
  }

  paintWedge(); paintInfo(); slotKey = mod(snap(start), DAY) + ':' + dur;
  return () => d.run();
}
