// Now Playing — porte em JS puro do componente "Now Playing" (liquid-glass-card) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, loop, clamp, reduced, PALETTE } from '../kit.js';

const TRACKS = [
  { title: 'Maré Baixa', artist: 'Porto Pálido', duration: 192, art: 0 },
  { title: 'Flor Estática', artist: 'Fio de Junípero', duration: 167, art: 1 },
  { title: 'Sinal Noturno', artist: 'As Horas Quietas', duration: 245, art: 2 },
];
const CRUISE = 200, CRUISE_MS = 1800;   // 33⅓ rpm = 200°/s
const MAX_OMEGA = 2160;                 // giro máximo de um flick: 6 voltas/s
const COAST_TAU = 0.45, SPIN_UP_TAU = 0.22, SPIN_DOWN_TAU = 0.2, SETTLE_EPSILON = 2;
const DEAD_ZONE = 10;                   // perto do centro o ângulo do ponteiro dá saltos absurdos
const VELOCITY_WINDOW_MS = 80, STALE_MOVE_MS = 60, HOLD_SETTLE_S = 0.05;
const BAR_COUNT = 5, BAR_REST = 0.14, BAR_DECAY_S = 0.3, BAR_ATTACK_S = 0.08;
const RUBBER_MAX = 18, SEEK_STEP = 5, RESTART_THRESHOLD = 3, ROLL_MS = 220;
const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';

const damp = (d, max) => max * (1 - Math.exp(-d / max));
const fmt = (sec) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Ruído 1D determinístico: o medidor é função do tempo da faixa, então voltar a um trecho repete os níveis.
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
const barLevel = (i, t) => 0.6 * noise(t * 4.3 + i * 17.3) + 0.4 * noise(t * 9.1 + i * 31.7 + 100);
// Até a velocidade de cruzeiro o disco mapeia 1:1 com a faixa, como um disco de verdade; acima disso acelera.
const scrubGain = (sp) => 1 + 1.5 * (Math.max(0, Math.abs(sp) - CRUISE) / CRUISE) ** 1.5;
const trackRate = (om) => (om / CRUISE) * scrubGain(om);
const rot = (a) => `rotate(${Math.round((a % 360) * 100) / 100}deg)`;

const A = PALETTE.ice600, INK = PALETTE.ice900;
function labelArt(v) {
  const g = svg('g');
  if (v === 1) g.append(svg('path', { d: 'M50 50 L50 8 A42 42 0 0 1 92 50 Z', fill: A }), svg('path', { d: 'M50 50 L8 50 A42 42 0 0 1 50 8 Z', fill: INK }), svg('rect', { x: 50, y: 62, width: 30, height: 6, rx: 1, fill: INK }), svg('rect', { x: 50, y: 72, width: 20, height: 6, rx: 1, fill: INK }));
  else if (v === 2) for (let i = 0; i < 25; i++) g.append(svg('circle', { cx: 26 + (i % 5) * 12, cy: 26 + Math.floor(i / 5) * 12, r: i === 8 ? 5.5 : 2.6, fill: i === 8 ? A : INK }));
  else g.append(svg('circle', { cx: 64, cy: 36, r: 20, fill: A }), ...[[60, 64], [70, 52], [80, 40]].map(([y, w]) => svg('rect', { x: 18, y, width: w, height: 5, fill: INK })));
  return g;
}
function discSvg(art) {
  const clipId = 'kk-lgc-clip-' + Math.random().toString(36).slice(2, 8);
  const g = svg('g', { 'clip-path': `url(#${clipId})`, transform: 'translate(26 26) scale(0.48)' }, labelArt(art));
  return svg('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', class: 'kk-liquid-glass-card-discsvg' },
    svg('circle', { cx: 50, cy: 50, r: 50, fill: '#0b2340' }),
    ...[28, 31, 34, 37, 40, 43, 46].map((r) => svg('circle', { cx: 50, cy: 50, r, fill: 'none', stroke: 'rgba(255,255,255,.1)', 'stroke-width': .6 })),
    svg('circle', { cx: 50, cy: 50, r: 49, fill: 'none', stroke: 'rgba(255,255,255,.2)', 'stroke-width': .8 }),
    svg('clipPath', { id: clipId }, svg('circle', { cx: 50, cy: 50, r: 24 })),
    svg('circle', { cx: 50, cy: 50, r: 24, fill: PALETTE.ice100 }), g, svg('circle', { cx: 50, cy: 50, r: 1.8, fill: '#fff' }));
}
const tonearm = () => svg('svg', { viewBox: '0 0 40 110', 'aria-hidden': 'true', class: 'kk-liquid-glass-card-arm' },
  svg('circle', { cx: 31, cy: 11, r: 8, fill: PALETTE.ice100, stroke: PALETTE.ice300 }), svg('circle', { cx: 31, cy: 11, r: 3, fill: PALETTE.ice400 }),
  svg('path', { d: 'M31 11 L31 70 L18 92', fill: 'none', stroke: PALETTE.ice400, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  svg('rect', { x: 12.5, y: 90, width: 7, height: 12, rx: 1.5, transform: 'rotate(32 16 96)', fill: PALETTE.ice700 }));
const glyph = (d, filled = true) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'kk-liquid-glass-card-gl' }, svg('path', { d, fill: filled ? 'currentColor' : 'none' }));
const G_PLAY = 'M8 5v14l11-7z', G_PAUSE = 'M7 5h4v14H7zM13 5h4v14h-4z', G_PREV = 'M7 5h2v14H7zM20 5v14L10 12z', G_NEXT = 'M15 5h2v14h-2zM4 5v14l10-7z';

const CSS = `
.kk-liquid-glass-card-wrap{width:100%;min-height:300px;padding:18px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border-radius:14px;container-type:inline-size;position:relative;overflow:hidden}
.kk-liquid-glass-card-wrap.glass{background:radial-gradient(circle at 18% 22%,#7fb4e0 0 22%,transparent 23%),radial-gradient(circle at 82% 78%,#2f7bbd 0 26%,transparent 27%),linear-gradient(135deg,#c9e1f6,#4a95d2)}
.kk-liquid-glass-card-card{position:relative;width:100%;max-width:384px;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;padding:20px;box-shadow:0 1px 3px rgba(15,53,96,.1);color:var(--ink,#0e2236)}
.glass .kk-liquid-glass-card-card{background:rgba(255,255,255,.42);border-color:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);box-shadow:0 0 6px rgba(15,53,96,.05),0 2px 6px rgba(15,53,96,.12),inset 3px 3px .5px -3px rgba(255,255,255,.95),inset -3px -3px .5px -3px rgba(255,255,255,.85),inset 1px 1px 1px -.5px rgba(255,255,255,.7),inset -1px -1px 1px -.5px rgba(255,255,255,.7),inset 0 0 6px 6px rgba(255,255,255,.2),0 0 12px rgba(15,53,96,.12)}
.kk-liquid-glass-card-top{display:flex;align-items:center;gap:18px}
.kk-liquid-glass-card-dwrap{position:relative;flex:none;width:104px;height:104px}
@container (min-width:352px){.kk-liquid-glass-card-dwrap{width:124px;height:124px}}
.kk-liquid-glass-card-disc{width:100%;height:100%;border-radius:50%;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 6px 16px -6px rgba(15,53,96,.55);outline:none}
.kk-liquid-glass-card-disc:active{cursor:grabbing}
.kk-liquid-glass-card-discsvg{display:block;width:100%;height:100%}
.kk-liquid-glass-card-arm{position:absolute;top:-4px;right:-16px;height:80%;width:auto;pointer-events:none;transform-origin:77.5% 10%;transition:transform .5s cubic-bezier(.77,0,.175,1)}
.kk-liquid-glass-card-info{min-width:0;flex:1}
.kk-liquid-glass-card-tag{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--mut,#4a6f93)}
.kk-liquid-glass-card-meter{display:flex;align-items:flex-end;gap:2px;height:14px}
.kk-liquid-glass-card-meter i{display:block;height:100%;width:3px;border-radius:1px;background:var(--ice-600,#2f7bbd);transform-origin:bottom;transform:scaleY(.14)}
.kk-liquid-glass-card-title{margin:8px 0 0;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-liquid-glass-card-artist{margin:0;font-size:14px;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-liquid-glass-card-rpm{display:inline-block;margin-top:8px;font:11px ui-monospace,monospace;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-liquid-glass-card-seek{margin:20px 0 0;padding:14px 0;cursor:pointer;touch-action:none;outline:none}
.kk-liquid-glass-card-seekbox{height:6px}
.kk-liquid-glass-card-rail{height:100%;overflow:hidden;border-radius:999px;background:var(--ice-200,#c9e1f6)}
.kk-liquid-glass-card-seek:focus-visible .kk-liquid-glass-card-rail{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-500,#4a95d2)}
.kk-liquid-glass-card-fill{height:100%;width:100%;transform-origin:left;transform:scaleX(0);background:var(--ice-600,#2f7bbd)}
.kk-liquid-glass-card-times{display:flex;justify-content:space-between;margin-top:-4px;font-size:12px;font-weight:500;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-liquid-glass-card-clock{display:inline-flex;flex-direction:row-reverse}
.kk-liquid-glass-card-dig{position:relative;display:inline-block;height:1lh;overflow:hidden}
.kk-liquid-glass-card-dig>span{display:block}
.kk-liquid-glass-card-dig>span.p{position:absolute;inset:0}
.kk-liquid-glass-card-ctl{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px}
.kk-liquid-glass-card-ib{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:var(--mut,#4a6f93);cursor:pointer;transition:background .15s,color .15s}
.kk-liquid-glass-card-ib:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-liquid-glass-card-ib:active{background:var(--ice-200,#c9e1f6)}
.kk-liquid-glass-card-pp{background:var(--ice-900,#0f3560);color:#fff}
.kk-liquid-glass-card-pp:hover{background:var(--ice-700,#1f5f9b);color:#fff}
.kk-liquid-glass-card-ib:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-liquid-glass-card-pp{width:52px;height:52px}
.kk-liquid-glass-card-gl{width:20px;height:20px}
.kk-liquid-glass-card-opt{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px inherit;cursor:pointer}
.kk-liquid-glass-card-opt[aria-pressed=true]{background:var(--ice-600,#2f7bbd);border-color:var(--ice-600,#2f7bbd);color:#fff}
.kk-liquid-glass-card-opt:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-liquid-glass-card-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes kk-liquid-glass-card-inup{from{transform:translateY(90%);opacity:0}to{transform:none;opacity:1}}
@keyframes kk-liquid-glass-card-outup{from{transform:none;opacity:1}to{transform:translateY(-90%);opacity:0}}
@keyframes kk-liquid-glass-card-indown{from{transform:translateY(-90%);opacity:0}to{transform:none;opacity:1}}
@keyframes kk-liquid-glass-card-outdown{from{transform:none;opacity:1}to{transform:translateY(90%);opacity:0}}
@media (prefers-reduced-motion:reduce){.kk-liquid-glass-card-dig span{animation:none!important}.kk-liquid-glass-card-dig span.p{display:none}.kk-liquid-glass-card-arm{transition:none}}
`;

export default function mount(stage, ctx) {
  ensureStyle('liquid-glass-card', CSS);
  const e = { angle: 0, omega: CRUISE, time: 0, duration: TRACKS[0].duration, playing: true, held: false, barDrag: false, pointerId: null, visible: true, env: 0, scrubOmega: 0, pointerAngle: 0, center: { x: 0, y: 0 }, lastMoveAt: 0, samples: [], cruise: null, cruiseAngle: 0 };
  let trackIndex = 0, clockS = 0, motionOff = reduced();

  // ---- DOM
  const discHolder = h('div', { class: 'kk-liquid-glass-card-disc', title: 'Gire para avançar ou voltar a faixa' });
  const arm = tonearm();
  const bars = Array.from({ length: BAR_COUNT }, () => h('i'));
  const tagText = h('span', 'Tocando agora');
  const titleEl = h('h3', { class: 'kk-liquid-glass-card-title' }), artistEl = h('p', { class: 'kk-liquid-glass-card-artist' });
  const rpmEl = h('span', { class: 'kk-liquid-glass-card-rpm', 'aria-hidden': 'true' }, '33⅓ rpm');
  const fill = h('div', { class: 'kk-liquid-glass-card-fill' }), rail = h('div', { class: 'kk-liquid-glass-card-rail' }, fill);
  const seek = h('div', { class: 'kk-liquid-glass-card-seek', role: 'slider', tabindex: '0', 'aria-label': 'Posição da faixa', 'aria-valuemin': '0' }, h('div', { class: 'kk-liquid-glass-card-seekbox' }, rail));
  const clockEl = h('span', { class: 'kk-liquid-glass-card-clock', 'aria-hidden': 'true' }), durEl = h('span');
  const ppIcon = glyph(G_PAUSE);
  const ppBtn = h('button', { type: 'button', class: 'kk-liquid-glass-card-ib kk-liquid-glass-card-pp', 'aria-label': 'Pausar', onclick: togglePlay }, ppIcon);
  const card = h('div', { class: 'kk-liquid-glass-card-card' },
    h('div', { class: 'kk-liquid-glass-card-top' },
      h('div', { class: 'kk-liquid-glass-card-dwrap' }, discHolder, arm),
      h('div', { class: 'kk-liquid-glass-card-info' }, h('div', { class: 'kk-liquid-glass-card-tag' }, h('span', { class: 'kk-liquid-glass-card-meter', 'aria-hidden': 'true' }, bars), tagText), titleEl, artistEl, rpmEl)),
    seek, h('div', { class: 'kk-liquid-glass-card-times' }, clockEl, durEl),
    h('div', { class: 'kk-liquid-glass-card-ctl' },
      h('button', { type: 'button', class: 'kk-liquid-glass-card-ib', 'aria-label': 'Faixa anterior', onclick: previous }, glyph(G_PREV)), ppBtn,
      h('button', { type: 'button', class: 'kk-liquid-glass-card-ib', 'aria-label': 'Próxima faixa', onclick: () => loadTrack(trackIndex + 1) }, glyph(G_NEXT))));
  const live = h('span', { class: 'kk-liquid-glass-card-sr', 'aria-live': 'polite' });
  const glassBtn = h('button', { type: 'button', class: 'kk-liquid-glass-card-opt', 'aria-pressed': 'false', onclick: toggleGlass }, 'Efeito vidro');
  const wrap = h('div', { class: 'kk-liquid-glass-card-wrap' }, card, glassBtn, live);
  stage.append(wrap);

  // ---- Efeito vidro: refração SVG (só Chromium aplica url() em backdrop-filter); nos outros fica o desfoque simples.
  const fid = 'kk-lgc-f-' + Math.random().toString(36).slice(2, 8);
  const defs = svg('svg', { 'aria-hidden': 'true', width: 0, height: 0, style: 'position:absolute' },
    svg('defs', {}, svg('filter', { id: fid, x: '-50%', y: '-50%', width: '200%', height: '200%', 'color-interpolation-filters': 'sRGB' },
      svg('feTurbulence', { baseFrequency: '0.05 0.05', numOctaves: 1, result: 'turbulence', seed: 1, type: 'fractalNoise' }),
      svg('feGaussianBlur', { in: 'turbulence', result: 'blurredNoise', stdDeviation: 2 }),
      svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'blurredNoise', result: 'displaced', scale: 30, xChannelSelector: 'R', yChannelSelector: 'B' }),
      svg('feGaussianBlur', { in: 'displaced', stdDeviation: 4 }))));
  wrap.append(defs);
  function toggleGlass() {
    const on = !wrap.classList.contains('glass');
    wrap.classList.toggle('glass', on); glassBtn.setAttribute('aria-pressed', String(on));
    card.style.backdropFilter = ''; card.style.webkitBackdropFilter = '';
    if (on && window.CSS.supports('backdrop-filter', `url("#${fid}")`)) card.style.backdropFilter = `url("#${fid}")`;
  }

  // ---- Relógio com dígitos que rolam
  const digits = [];
  function setClock(sec, dir) {
    const chars = fmt(sec).split('').reverse(); // contados da direita: segundos mantêm identidade quando os minutos ganham dígito
    while (clockEl.childNodes.length > chars.length) clockEl.lastChild.remove(), digits.pop();
    chars.forEach((ch, slot) => {
      if (!clockEl.childNodes[slot]) { const w = h('span', ch === ':' ? {} : { class: 'kk-liquid-glass-card-dig' }, h('span', ch)); w.dataset.v = ch; clockEl.append(w); return; }
      const w = clockEl.childNodes[slot];
      if (w.dataset.v === ch) return;
      const old = w.dataset.v; w.dataset.v = ch;
      if (ch === ':' || old === ':') { w.textContent = ch; return; }
      const up = dir > 0, timing = `${ROLL_MS}ms ${EASE_OUT} both`;
      const prev = h('span', { class: 'p' }, old), cur = h('span', ch);
      w.replaceChildren(prev, cur);
      if (!motionOff) { prev.style.animation = `kk-liquid-glass-card-${up ? 'outup' : 'outdown'} ${timing}`; cur.style.animation = `kk-liquid-glass-card-${up ? 'inup' : 'indown'} ${timing}`; }
      else prev.remove();
    });
    seek.setAttribute('aria-valuenow', String(Math.floor(sec)));
    seek.setAttribute('aria-valuetext', `${fmt(sec)} de ${fmt(TRACKS[trackIndex].duration)}`);
  }

  // ---- Motor do disco
  const readAngle = () => (e.cruise && e.cruise.currentTime !== null ? e.cruiseAngle + (Number(e.cruise.currentTime) / CRUISE_MS) * 360 : e.angle);
  function stopCruise() {
    if (!e.cruise) return;
    e.angle = readAngle(); discHolder.style.transform = rot(e.angle); // fixa o ângulo antes de cancelar para o disco não piscar
    e.cruise.cancel(); e.cruise = null;
  }
  // Rotação constante via WAAPI (compositor): o disco gira liso mesmo com a thread principal ocupada.
  function startCruise() {
    if (e.cruise || motionOff) return;
    e.angle %= 360; e.cruiseAngle = e.angle;
    e.cruise = discHolder.animate([{ transform: `rotate(${e.angle}deg)` }, { transform: `rotate(${e.angle + 360}deg)` }], { duration: CRUISE_MS, iterations: Infinity });
    if (!e.visible) e.cruise.pause();
  }
  function integrateDisc(dt) {
    const target = e.playing ? CRUISE : 0;
    if (motionOff) { e.omega = target; if (e.playing) e.time += dt; return; }
    if (e.cruise) { e.omega = CRUISE; e.time += dt; return; }
    let tau = SPIN_UP_TAU; if (Math.abs(e.omega) > Math.abs(target)) tau = e.playing ? COAST_TAU : SPIN_DOWN_TAU;
    e.omega = target + (e.omega - target) * Math.exp(-dt / tau);
    if (Math.abs(e.omega - target) < SETTLE_EPSILON) e.omega = target;
    e.angle += e.omega * dt; e.time += trackRate(e.omega) * dt;
    if (e.playing && e.omega === CRUISE) startCruise();
  }
  const meterTarget = () => clamp(Math.abs(e.held ? e.scrubOmega : e.omega) / CRUISE, 0, 1);
  function updateMeter(dt) {
    const tg = meterTarget();
    if (motionOff) e.env = e.playing ? 1 : 0;
    else if (tg > e.env) e.env = Math.min(tg, e.env + dt / BAR_ATTACK_S);
    else e.env = Math.max(tg, e.env - dt / BAR_DECAY_S); // queda linear: medidor cheio leva 300 ms para repousar
    const t = motionOff ? 0.37 : e.time; // movimento reduzido mostra um quadro parado do medidor
    bars.forEach((b, i) => { b.style.transform = `scaleY(${(BAR_REST + (1 - BAR_REST) * barLevel(i, t) * e.env).toFixed(3)})`; });
  }
  const rpmLabel = () => (e.held ? `${Math.round(e.scrubOmega / 6)} rpm` : e.omega === CRUISE ? '33⅓ rpm' : `${Math.round(e.omega / 6)} rpm`);
  function paint() {
    if (!e.cruise) discHolder.style.transform = rot(e.angle);
    fill.style.transform = `scaleX(${(e.duration > 0 ? clamp(e.time / e.duration, 0, 1) : 0).toFixed(4)})`;
    const l = rpmLabel(); if (rpmEl.textContent !== l) rpmEl.textContent = l;
    const s = Math.floor(e.time);
    if (s !== clockS) { const dir = s > clockS ? 1 : -1; clockS = s; setClock(s, dir); }
  }
  function handleEnds() {
    if (e.time >= e.duration) {
      if (e.playing && !e.held && !e.barDrag) { loadTrack(trackIndex + 1); return; }
      e.time = e.duration;
    }
    if (e.time < 0) e.time = 0;
  }
  const awake = () => e.playing || e.held || e.barDrag || e.omega !== 0 || e.env > 0;
  const stopLoop = loop((dt) => {
    if (!e.visible || !awake()) return;
    if (e.held) e.scrubOmega *= Math.exp(-dt / HOLD_SETTLE_S); else if (!e.barDrag) integrateDisc(dt);
    handleEnds(); updateMeter(dt); paint();
  });
  const wake = () => { updateMeter(0); paint(); };

  function loadTrack(index) {
    trackIndex = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    const t = TRACKS[trackIndex];
    e.time = 0; e.duration = t.duration; clockS = -1;
    discHolder.replaceChildren(discSvg(t.art));
    titleEl.textContent = t.title; artistEl.textContent = t.artist; durEl.textContent = fmt(t.duration);
    seek.setAttribute('aria-valuemax', String(t.duration));
    live.textContent = `${t.title}, ${t.artist}`;
    wake();
  }
  function togglePlay() {
    if (!e.playing && e.time >= e.duration) e.time = 0;
    e.playing = !e.playing;
    if (!e.playing) stopCruise(); // devolve o disco ao laço para ele desacelerar
    syncPlay(); wake();
  }
  function syncPlay() {
    ppBtn.setAttribute('aria-label', e.playing ? 'Pausar' : 'Tocar');
    ppIcon.firstChild.setAttribute('d', e.playing ? G_PAUSE : G_PLAY);
    arm.style.transform = e.playing ? 'rotate(11deg)' : 'rotate(-8deg)';
    tagText.textContent = e.playing ? 'Tocando agora' : 'Pausado';
  }
  function previous() { if (e.time > RESTART_THRESHOLD) { e.time = 0; wake(); return; } loadTrack(trackIndex - 1); }

  // ---- Girar o disco
  const ptr = (cx, cy) => { const dx = cx - e.center.x, dy = cy - e.center.y; return { angle: (Math.atan2(dy, dx) * 180) / Math.PI, distance: Math.hypot(dx, dy) }; };
  discHolder.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || e.pointerId !== null) return;
    e.pointerId = ev.pointerId; discHolder.setPointerCapture(ev.pointerId);
    const r = discHolder.getBoundingClientRect(); e.center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    stopCruise(); // dedo no disco para ele na hora, animação de cruzeiro incluída
    e.held = true; e.omega = 0; e.scrubOmega = 0; e.pointerAngle = ptr(ev.clientX, ev.clientY).angle;
    e.lastMoveAt = performance.now(); e.samples = [{ t: e.lastMoveAt, a: e.angle }]; wake();
  });
  discHolder.addEventListener('pointermove', (ev) => {
    if (!e.held || e.pointerId !== ev.pointerId) return;
    const { angle, distance } = ptr(ev.clientX, ev.clientY);
    if (distance < DEAD_ZONE) { e.pointerAngle = angle; return; }
    let delta = angle - e.pointerAngle; delta -= Math.round(delta / 360) * 360; e.pointerAngle = angle; // desfaz a costura de ±180°
    const now = performance.now(), dt = Math.max(now - e.lastMoveAt, 1) / 1000; e.lastMoveAt = now;
    e.scrubOmega += (clamp(delta / dt, -MAX_OMEGA, MAX_OMEGA) - e.scrubOmega) * 0.35;
    e.angle += delta; e.time = clamp(e.time + (delta / CRUISE) * scrubGain(e.scrubOmega), 0, e.duration); // o tempo segue o ângulo
    e.samples.push({ t: now, a: e.angle });
    while (e.samples.length > 2 && now - e.samples[0].t > VELOCITY_WINDOW_MS) e.samples.shift();
    discHolder.style.transform = rot(e.angle);
  });
  const discUp = (ev) => {
    if (!e.held || e.pointerId !== ev.pointerId) return;
    e.pointerId = null; if (discHolder.hasPointerCapture(ev.pointerId)) discHolder.releasePointerCapture(ev.pointerId);
    e.held = false;
    const now = performance.now(), first = e.samples[0]; let v = 0;
    if (first && now - e.lastMoveAt < STALE_MOVE_MS && now > first.t) v = ((e.angle - first.a) / (now - first.t)) * 1000;
    e.omega = motionOff ? 0 : clamp(v, -MAX_OMEGA, MAX_OMEGA); // mantém o giro que você deu e volta ao cruzeiro
    e.scrubOmega = 0; wake();
  };
  discHolder.addEventListener('pointerup', discUp); discHolder.addEventListener('pointercancel', discUp); discHolder.addEventListener('lostpointercapture', discUp);

  // ---- Barra de busca (elástica nas pontas)
  const RUBBER_RETURN = 'transform 450ms cubic-bezier(0.34,1.4,0.64,1)';
  function seekTo(cx) {
    const rect = seek.firstChild.getBoundingClientRect(), x = cx - rect.left; // mede o pai, que não estica
    e.time = clamp(x / rect.width, 0, 1) * e.duration;
    let over = 0; if (x < 0) over = -damp(-x, RUBBER_MAX); else if (x > rect.width) over = damp(x - rect.width, RUBBER_MAX);
    rail.style.transition = 'none'; rail.style.transformOrigin = over < 0 ? 'right center' : 'left center';
    rail.style.transform = over === 0 ? '' : `scale(${(1 + Math.abs(over) / rect.width).toFixed(4)},${(1 - (0.35 * Math.abs(over)) / RUBBER_MAX).toFixed(3)})`;
    wake();
  }
  seek.addEventListener('pointerdown', (ev) => { if (ev.button !== 0 || e.pointerId !== null) return; e.pointerId = ev.pointerId; seek.setPointerCapture(ev.pointerId); e.barDrag = true; seekTo(ev.clientX); });
  seek.addEventListener('pointermove', (ev) => { if (e.barDrag && e.pointerId === ev.pointerId) seekTo(ev.clientX); });
  const seekUp = (ev) => { if (!e.barDrag || e.pointerId !== ev.pointerId) return; e.pointerId = null; e.barDrag = false; rail.style.transition = motionOff ? 'none' : RUBBER_RETURN; rail.style.transform = ''; wake(); };
  seek.addEventListener('pointerup', seekUp); seek.addEventListener('pointercancel', seekUp); seek.addEventListener('lostpointercapture', seekUp);
  seek.addEventListener('keydown', (ev) => {
    const t = { ArrowRight: e.time + SEEK_STEP, ArrowUp: e.time + SEEK_STEP, ArrowLeft: e.time - SEEK_STEP, ArrowDown: e.time - SEEK_STEP, Home: 0, End: e.duration - 1 }[ev.key];
    if (t === undefined) return; ev.preventDefault(); e.time = clamp(t, 0, e.duration); wake();
  });

  // ---- Visibilidade e movimento reduzido
  let inView = true;
  const sync = () => { e.visible = inView && !document.hidden; if (e.visible) { e.cruise?.play(); wake(); } else e.cruise?.pause(); };
  const io = new IntersectionObserver(([en]) => { inView = en?.isIntersecting ?? true; sync(); }); io.observe(card);
  document.addEventListener('visibilitychange', sync);
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = () => { motionOff = mq.matches; if (motionOff) stopCruise(); wake(); };
  mq.addEventListener('change', onMotion);

  loadTrack(0); syncPlay(); startCruise(); wake();
  return () => { stopLoop(); io.disconnect(); document.removeEventListener('visibilitychange', sync); mq.removeEventListener('change', onMotion); e.cruise?.cancel(); e.cruise = null; wrap.remove(); };
}
