// Glitch Text — porte em JS puro do componente "Glitch Text" (Signal Text) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, disposer } from '../kit.js';

const TEXTS = ['Vendas em tempo real', 'Cliente novo no funil', 'Meta batida hoje'];
const INTENSITY = {
  subtle: { bands: 3, shift: 0.05, split: 1, frames: 5, frame: 55 },
  medium: { bands: 4, shift: 0.12, split: 2, frames: 6, frame: 55 },
  strong: { bands: 5, shift: 0.18, split: 3, frames: 7, frame: 50 },
};
const MAX_BANDS = 5;
const ACCENT = '#1f5f9b', CYAN = '#7fb4e0'; // os dois canais separados, em tons de azul da Neva
const HOLD = 'steps(1, end)';            // cada quadro segura até o próximo: glitch corta, não desliza
const FIRST_IDLE = 1200, IDLE_MIN = 4000, IDLE_SPREAD = 5000;
const STILL_CHANCE = 0.3;                // chance de uma faixa ficar parada num quadro, para parecer sinal quebrado

const round = (n) => Math.round(n * 1000) / 1000;
/** Quadros que seguram cada valor por um frame e terminam no último. */
const held = (frames) => [...frames.map((k, i) => ({ ...k, offset: i / frames.length, easing: HOLD })), { ...frames.at(-1), offset: 1 }];
/** Limites aleatórios das faixas de 0 a 100%, nenhuma muito mais fina que outra. */
function randomCuts(count) {
  const w = Array.from({ length: count }, () => 0.55 + Math.random()), total = w.reduce((a, b) => a + b, 0), cuts = [0];
  for (const x of w) cuts.push(round(cuts.at(-1) + (x / total) * 100));
  return cuts;
}
const jump = (max) => Math.random() < STILL_CHANCE ? 0 : round((Math.random() < 0.5 ? -1 : 1) * (0.25 + 0.75 * Math.random()) * max);
/** Posições laterais de uma faixa: fora no 1º quadro, em casa no último. */
const bandPath = (s, forceMove) => Array.from({ length: s.frames }, (_, f) => {
  if (f === s.frames - 1) return 0;
  const x = jump(s.shift);
  return f === 0 && forceMove && x === 0 ? round(s.shift * 0.6) : x;
});

export default function mount(stage, ctx) {
  ensureStyle('glitch-text', `
.kk-glitch-text{width:100%;display:flex;flex-direction:column;align-items:center;gap:22px;padding:8px 4px;container-type:inline-size;color:var(--ink)}
.kk-glitch-text-word{position:relative;display:inline-block;max-width:100%;text-align:center;font-size:clamp(26px,10cqw,46px);font-weight:800;letter-spacing:-.02em;line-height:1.15;touch-action:manipulation;cursor:default}
.kk-glitch-text-layers{position:relative;display:inline-grid}
.kk-glitch-text-layer{grid-column:1;grid-row:1;display:grid}
.kk-glitch-text-layer.ghost{pointer-events:none;user-select:none;opacity:0}
.kk-glitch-text-layer span{grid-column:1;grid-row:1}
.kk-glitch-text-layer [data-text=from]{opacity:0}
.kk-glitch-text-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-glitch-text-ctl{display:flex;flex-direction:column;align-items:center;gap:10px}
.kk-glitch-text-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:4px;border-radius:99px;background:var(--ice-100)}
.kk-glitch-text-chip{min-height:36px;padding:0 14px;border:0;border-radius:99px;background:none;color:var(--mut);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.kk-glitch-text-chip[aria-pressed=true]{background:#fff;color:var(--ice-800);box-shadow:0 1px 4px rgba(15,53,96,.16)}
.kk-glitch-text-b{min-height:36px;padding:0 16px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.kk-glitch-text-b:hover{background:var(--ice-100)}
.kk-glitch-text button:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
`);
  const dispose = disposer();
  const rm = reduced();
  const st = { trigger: 'idle', intensity: 'medium', i: 0, shown: { from: null, to: TEXTS[0] } };
  let anims = [], running = false, idleTimer, visible = false;

  const layerEl = (cls, color, layer) => {
    const el = h('span', { class: `kk-glitch-text-layer${cls}`, 'data-layer': layer });
    if (color) el.style.color = color;
    return el;
  };
  const base = layerEl('', null, 'base');
  const bands = Array.from({ length: MAX_BANDS }, () => layerEl(' ghost', null, 'band'));
  const channels = [layerEl(' ghost', ACCENT, 'channel'), layerEl(' ghost', CYAN, 'channel')];
  const layers = h('span', { class: 'kk-glitch-text-layers', 'aria-hidden': 'true' }, ...channels, base, ...bands);
  const sr = h('span', { class: 'kk-glitch-text-sr' });
  const word = h('span', { class: 'kk-glitch-text-word', onpointerdown: onPointer, onpointerenter: onPointer }, sr, layers);

  const chips = (name, opts, labels) => h('div', { class: 'kk-glitch-text-row', role: 'group', 'aria-label': name },
    opts.map((o) => h('button', { class: 'kk-glitch-text-chip', type: 'button', 'data-v': o, onclick: () => { st[name === 'Gatilho' ? 'trigger' : 'intensity'] = o; drawCtl(); scheduleIdle(true); } }, labels[o])));
  const trig = chips('Gatilho', ['idle', 'hover', 'change'], { idle: 'Sozinho', hover: 'Ao passar', change: 'Ao trocar' });
  const inten = chips('Intensidade', ['subtle', 'medium', 'strong'], { subtle: 'Suave', medium: 'Média', strong: 'Forte' });
  const swap = h('button', { class: 'kk-glitch-text-b', type: 'button', onclick: () => { st.i = (st.i + 1) % TEXTS.length; setText(TEXTS[st.i]); } }, 'Trocar texto');
  const root = h('div', { class: 'kk-glitch-text' }, word, h('div', { class: 'kk-glitch-text-ctl' }, trig, inten, swap));
  stage.append(root);

  function drawCtl() {
    trig.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === st.trigger));
    inten.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === st.intensity));
  }
  function fill(from, to) {
    sr.textContent = to;
    for (const el of [...channels, base, ...bands]) {
      el.replaceChildren(...(from !== null ? [h('span', { 'data-text': 'from' }, from)] : []), h('span', { 'data-text': 'to' }, to));
    }
  }
  function stop() { anims.forEach((a) => a.cancel()); anims = []; running = false; }

  /** Roda uma rajada; com `swapText`, as faixas cortam do texto velho para o novo no meio. */
  function burst(swapText, onDone) {
    stop();
    const s = INTENSITY[st.intensity], opts = { duration: s.frames * s.frame, fill: 'none' }, list = [];
    const run = (el, frames) => list.push(el.animate(held(frames), opts));
    run(base, [{ opacity: 0 }]);
    // As faixas ladrilham o texto de cima a baixo; em repouso reconstroem-no. As bordas extremas passam da caixa para manter hastes.
    const cuts = randomCuts(s.bands), mover = Math.floor(Math.random() * s.bands);
    bands.forEach((band, i) => {
      if (i >= s.bands) return;
      const top = i === 0 ? -50 : cuts[i], bottom = i === s.bands - 1 ? -50 : round(100 - cuts[i + 1]);
      band.style.clipPath = `inset(${top}% -25% ${bottom}% -25%)`;
      run(band, bandPath(s, i === mover).map((x) => ({ opacity: 1, transform: `translate3d(${x}em,0,0)` })));
    });
    // Cópias dos canais ficam atrás das faixas e aparecem nas laterais.
    const offs = Array.from({ length: s.frames }, () => Math.max(1, Math.ceil(Math.random() * s.split)));
    channels.forEach((ch, c) => run(ch, offs.map((d, f) => ({ opacity: f === s.frames - 1 ? 0 : 1, transform: `translate3d(${(c === 0 ? -1 : 1) * d}px,0,0)` }))));
    if (swapText) {
      const half = Math.ceil(s.frames / 2);
      const flip = (sel, before) => root.querySelectorAll(sel).forEach((el) => run(el, Array.from({ length: s.frames }, (_, f) => ({ opacity: f < half ? before : 1 - before }))));
      flip('[data-layer]:not([data-layer="base"]) [data-text="from"]', 1);
      flip('[data-layer]:not([data-layer="base"]) [data-text="to"]', 0);
    }
    anims = list; running = true;
    list.at(-1).onfinish = () => { anims = []; running = false; onDone?.(); };
  }
  function setText(to) {
    const from = st.shown.to; st.shown = { from, to };
    fill(from, to);
    const done = () => { if (st.shown.to === to) { st.shown.from = null; fill(null, to); } }; // a rajada é a transição
    if (rm) done(); else burst(true, done);
  }
  function onPointer(e) {
    // Mouse dispara ao entrar; toque e caneta, ao pressionar, pois não passam o mouse.
    const mouse = e.pointerType === 'mouse';
    if (st.trigger !== 'hover' || (e.type === 'pointerenter') !== mouse || running || rm) return;
    burst(false);
  }
  // Sozinho: rajada rara a cada 4–9 s, só com o componente visível.
  function scheduleIdle(reset) {
    clearTimeout(idleTimer); idleTimer = undefined;
    if (st.trigger !== 'idle' || !visible || document.hidden || rm) return;
    const tick = () => {
      if (!document.hidden && !running) burst(false);
      idleTimer = setTimeout(tick, IDLE_MIN + Math.random() * IDLE_SPREAD);
    };
    idleTimer = setTimeout(tick, reset ? 400 : FIRST_IDLE);
  }
  const io = new IntersectionObserver(([e]) => { visible = e?.isIntersecting ?? false; scheduleIdle(false); });
  io.observe(root);
  const vis = () => scheduleIdle(false);
  document.addEventListener('visibilitychange', vis);
  dispose(() => { io.disconnect(); document.removeEventListener('visibilitychange', vis); });

  fill(null, TEXTS[0]); drawCtl();
  return () => { clearTimeout(idleTimer); stop(); dispose.run(); root.remove(); };
}
