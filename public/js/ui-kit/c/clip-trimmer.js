// Clip Trimmer — porte em JS puro do componente "Clip Trimmer" .
import { h, svg, ensureStyle, loop, clamp, reduced, disposer, PALETTE as P } from '../kit.js';

const FRAMES = 10, SNAP_PX = 5, DURATION = 12, MIN_LEN = 1, LABEL_EVERY = 5;
const DEFAULT = { start: 2.4, end: 9 };

// "Filmagem" gerada: panorama de uma cidade ao amanhecer, em SVG embutido (sem imagem externa).
function panorama() {
  let bld = '';
  let x = 0, i = 0;
  while (x < 2400) {
    const w = 60 + ((i * 37) % 70), hgt = 180 + ((i * 53) % 260);
    bld += `<rect x="${x}" y="${800 - hgt}" width="${w}" height="${hgt}" fill="${i % 3 ? '#164a7c' : '#0f3560'}"/>`;
    for (let r = 0; r < hgt - 30; r += 34) bld += `<rect x="${x + 10}" y="${800 - hgt + 14 + r}" width="${w - 20}" height="6" fill="#a5cdee" opacity=".${3 + ((i + r) % 4)}"/>`;
    x += w + 6; i++;
  }
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 800" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bbd"/><stop offset=".6" stop-color="#a5cdee"/><stop offset="1" stop-color="#e3f0fb"/></linearGradient></defs><rect width="2400" height="800" fill="url(#g)"/><circle cx="1500" cy="470" r="120" fill="#f2f8fe" opacity=".9"/><path d="M0 560 Q300 440 600 540 T1200 520 T1800 540 T2400 500 V800 H0Z" fill="#4a95d2" opacity=".55"/>${bld}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
}

// h() não aceita style em objeto: aplicamos depois da criação.
const sty = (el, o) => (Object.assign(el.style, o), el);
const fmt = (s) => { const t = Math.round(s * 10), w = Math.floor(t / 10); return `${Math.floor(w / 60)}:${String(w % 60).padStart(2, '0')}.${t % 10}`; };

export default function mount(stage, ctx) {
  ensureStyle('clip-trimmer', `
.kk-clip-trimmer{width:100%;max-width:512px;margin:0 auto;box-sizing:border-box;padding:14px;border:1px solid var(--line);border-radius:22px;background:#fff;color:var(--ink);user-select:none;-webkit-user-select:none}
.kk-clip-trimmer-view{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:var(--ice-100);background-size:cover}
.kk-clip-trimmer-time{position:absolute;left:10px;bottom:10px;padding:4px 9px;border-radius:99px;background:rgba(14,34,54,.62);color:#fff;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.kk-clip-trimmer-play{position:absolute;right:10px;bottom:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(14,34,54,.62);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
.kk-clip-trimmer-play:hover{background:rgba(14,34,54,.8)}
.kk-clip-trimmer-play:focus-visible,.kk-clip-trimmer-h:focus-visible,.kk-clip-trimmer-reset:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-clip-trimmer-play svg{width:15px;height:15px}
.kk-clip-trimmer-wrap{margin:22px 16px 0}
.kk-clip-trimmer-strip{position:relative;height:56px;cursor:pointer;touch-action:none}
.kk-clip-trimmer-film{position:absolute;inset:0;display:flex;overflow:hidden;border-radius:8px;background:var(--ice-200)}
.kk-clip-trimmer-film i{flex:1;border-right:1px solid rgba(14,34,54,.12);background-size:1000% 100%;background-repeat:no-repeat}
.kk-clip-trimmer-film i:last-child{border-right:0}
.kk-clip-trimmer-dim{position:absolute;inset:0;overflow:hidden;border-radius:8px;pointer-events:none}
.kk-clip-trimmer-dim b{position:absolute;inset:0;background:rgba(242,248,254,.78)}
.kk-clip-trimmer-head{position:absolute;left:0;top:-4px;bottom:-4px;width:0;pointer-events:none;transition:opacity .15s}
.kk-clip-trimmer-head i{position:absolute;left:0;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--ink)}
.kk-clip-trimmer-head i:before{content:"";position:absolute;left:50%;top:-2px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:var(--ink)}
.kk-clip-trimmer-range{position:absolute;top:0;bottom:0;border-top:3px solid var(--ice-600);border-bottom:3px solid var(--ice-600);cursor:grab}
.kk-clip-trimmer-range.on{cursor:grabbing}
.kk-clip-trimmer-h{position:absolute;top:-3px;bottom:-3px;width:18px;background:var(--ice-600);display:flex;align-items:center;justify-content:center;cursor:ew-resize}
.kk-clip-trimmer-h:before{content:"";width:3px;height:20px;border-radius:3px;background:rgba(255,255,255,.65);transition:background .15s}
.kk-clip-trimmer-h.on:before{background:#fff}
.kk-clip-trimmer-h[data-part=start]{left:-18px;border-radius:9px 0 0 9px}
.kk-clip-trimmer-h[data-part=end]{right:-18px;border-radius:0 9px 9px 0}
.kk-clip-trimmer-tip{position:absolute;top:-32px;padding:2px 7px;border-radius:6px;background:var(--ink);color:#fff;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s}
.kk-clip-trimmer-h.on .kk-clip-trimmer-tip{opacity:1}
.kk-clip-trimmer-ruler{position:relative;height:22px;margin-top:8px}
.kk-clip-trimmer-tick{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%)}
.kk-clip-trimmer-tick i{width:1px;background:var(--ice-300);transition:background .15s}
.kk-clip-trimmer-tick span{margin-top:2px;font-size:11px;color:var(--mut);font-variant-numeric:tabular-nums;transition:color .15s}
.kk-clip-trimmer-tick.snap i{background:var(--ice-600)}
.kk-clip-trimmer-tick.snap span{color:var(--ice-700);font-weight:700}
.kk-clip-trimmer-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;font-size:14px;color:var(--mut);font-variant-numeric:tabular-nums}
.kk-clip-trimmer-kept{margin:0}
.kk-clip-trimmer-foot b{color:var(--ink)}
.kk-clip-trimmer-reset{min-height:36px;padding:0 14px;border:0;border-radius:99px;background:transparent;color:var(--mut);font:inherit;font-size:13px;cursor:pointer}
.kk-clip-trimmer-reset:hover:not(:disabled){background:var(--ice-100);color:var(--ink)}
.kk-clip-trimmer-reset:disabled{opacity:.4;cursor:default}
`);
  const dispose = disposer();
  const pano = panorama();
  const rm = reduced();
  let range = { ...DEFAULT }, time = DEFAULT.start, playing = false, active = null, snapped = null, d = null;

  const view = sty(h('div', { class: 'kk-clip-trimmer-view', role: 'img', 'aria-label': 'Prévia do vídeo: panorama de uma cidade ao amanhecer' }), { backgroundImage: pano });
  const clock = h('span', { class: 'kk-clip-trimmer-time', 'aria-live': 'off' });
  const playBtn = h('button', { class: 'kk-clip-trimmer-play', type: 'button' });
  view.append(clock, playBtn);

  const strip = h('div', { class: 'kk-clip-trimmer-strip' });
  const film = h('div', { class: 'kk-clip-trimmer-film' }, Array.from({ length: FRAMES }, (_, i) =>
    sty(h('i'), { backgroundImage: pano, backgroundPosition: `${(i / (FRAMES - 1)) * 100}% 50%` })));
  const dimL = h('b'), dimR = h('b');
  const dim = h('div', { class: 'kk-clip-trimmer-dim' }, dimL, dimR);
  const head = h('div', { class: 'kk-clip-trimmer-head' }, h('i'));
  const tips = {}, handles = {};
  const mkHandle = (part) => {
    tips[part] = h('span', { class: 'kk-clip-trimmer-tip' });
    return handles[part] = h('div', {
      class: 'kk-clip-trimmer-h', 'data-part': part, role: 'slider', tabindex: '0',
      'aria-label': part === 'start' ? 'Início do corte' : 'Fim do corte', 'aria-valuemin': 0, 'aria-valuemax': DURATION,
      onkeydown: (e) => key(part, e),
    }, tips[part]);
  };
  const rangeEl = h('div', { class: 'kk-clip-trimmer-range', 'data-part': 'range' }, mkHandle('start'), mkHandle('end'));
  strip.append(film, dim, head, rangeEl);

  const ticks = Array.from({ length: DURATION + 1 }, (_, s) => {
    const big = s % LABEL_EVERY === 0;
    return sty(h('span', { class: 'kk-clip-trimmer-tick' },
      sty(h('i'), { height: big ? '8px' : '4px' }), big && h('span', `${s}s`)), { left: `${(s / DURATION) * 100}%` });
  });
  const ruler = h('div', { class: 'kk-clip-trimmer-ruler', 'aria-hidden': 'true' }, ticks);
  const keptEl = h('b'), resetBtn = h('button', { class: 'kk-clip-trimmer-reset', type: 'button', onclick: () => { range = { start: 0, end: DURATION }; seek(time); render(); } }, 'Redefinir');
  const foot = h('div', { class: 'kk-clip-trimmer-foot' }, h('p', { class: 'kk-clip-trimmer-kept' }, keptEl, ` de ${DURATION.toFixed(1)}s`), resetBtn);
  const root = h('div', { class: 'kk-clip-trimmer' }, view, h('div', { class: 'kk-clip-trimmer-wrap' }, strip, ruler), foot);
  stage.append(root);

  const pct = (t) => (t / DURATION) * 100;
  function render() {
    view.style.backgroundPosition = `${pct(time)}% 50%`;
    clock.textContent = fmt(time);
    playBtn.replaceChildren(svg('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, svg('path', { d: playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l13 8-13 8z' })));
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
    dimL.style.transform = `translateX(${pct(range.start) - 100}%)`;
    dimR.style.transform = `translateX(${pct(range.end)}%)`;
    head.style.left = `${pct(time)}%`;
    head.style.opacity = active === 'start' || active === 'end' ? 0 : 1;
    rangeEl.style.left = `${pct(range.start)}%`;
    rangeEl.style.width = `${pct(range.end - range.start)}%`;
    rangeEl.classList.toggle('on', active === 'range');
    for (const p of ['start', 'end']) {
      handles[p].classList.toggle('on', active === p);
      handles[p].setAttribute('aria-valuenow', Math.round(range[p] * 10) / 10);
      handles[p].setAttribute('aria-valuetext', `${range[p].toFixed(1)} segundos`);
      tips[p].textContent = fmt(range[p]);
    }
    ticks.forEach((t, s) => t.classList.toggle('snap', snapped === s));
    keptEl.textContent = `${(range.end - range.start).toFixed(1)}s`;
    resetBtn.disabled = range.start === 0 && range.end === DURATION;
  }
  const seek = (t) => { time = clamp(t, range.start, range.end); };
  const rect = () => strip.getBoundingClientRect();
  const pxPerSec = () => rect().width / DURATION;
  const secAt = (x) => { const r = rect(); return clamp(((x - r.left) / r.width) * DURATION, 0, DURATION); };
  // Alça perto de um segundo inteiro "gruda" nele, como um ímã.
  const snap = (t) => {
    const w = Math.round(t);
    if (Math.abs(w - t) * pxPerSec() < SNAP_PX) { snapped = w; return w; }
    snapped = null; return t;
  };
  function moveHandle(part, t) {
    range = part === 'start'
      ? { start: clamp(snap(t), 0, range.end - MIN_LEN), end: range.end }
      : { start: range.start, end: clamp(snap(t), range.start + MIN_LEN, DURATION) };
    time = range[part]; // a prévia mostra o quadro onde você corta
  }
  function key(part, e) {
    const step = e.shiftKey ? 1 : 0.1;
    const mv = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, Home: -DURATION, End: DURATION }[e.key];
    if (mv === undefined) return;
    e.preventDefault();
    const t = Math.round((range[part] + mv) * 10) / 10;
    range = part === 'start'
      ? { start: clamp(t, 0, range.end - MIN_LEN), end: range.end }
      : { start: range.start, end: clamp(t, range.start + MIN_LEN, DURATION) };
    seek(range[part]); render();
  }
  playBtn.addEventListener('click', () => {
    if (!playing && time >= range.end - 0.05) seek(range.start);
    playing = !playing; render();
  });

  const down = (e) => {
    if (!e.isPrimary || e.button !== 0 || d) return;
    const part = e.target.closest('[data-part]')?.getAttribute('data-part') ?? 'seek';
    strip.setPointerCapture(e.pointerId);
    d = { part, x: e.clientX, from: { ...range }, moved: false };
    active = part;
    if (part === 'start' || part === 'end') playing = false;
    else if (part === 'seek') seek(secAt(e.clientX));
    render();
  };
  const move = (e) => {
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 3) d.moved = true;
    if (d.part === 'start' || d.part === 'end') moveHandle(d.part, d.from[d.part] + dx / pxPerSec());
    else if (d.part === 'range' && d.moved) {
      const len = d.from.end - d.from.start, s = clamp(d.from.start + dx / pxPerSec(), 0, DURATION - len);
      range = { start: s, end: s + len }; seek(time);
    } else if (d.part === 'seek') seek(secAt(e.clientX));
    render();
  };
  const end = (e) => {
    if (!d) return;
    if (d.part === 'range' && !d.moved) seek(secAt(e.clientX)); // toque dentro do trecho move o cursor
    if (d.part === 'start' || d.part === 'end') seek(range.start);
    d = null; active = null; snapped = null; render();
  };
  strip.addEventListener('pointerdown', down);
  strip.addEventListener('pointermove', move);
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
  strip.addEventListener('lostpointercapture', end);

  // Reprodução em laço dentro do trecho mantido; com movimento reduzido só avança sob demanda.
  dispose(loop((dt) => {
    if (!playing) return;
    let n = time + dt;
    if (n >= range.end || n < range.start) n = range.start;
    time = n; render();
  }));
  render();
  return () => { dispose.run(); root.remove(); };
}
