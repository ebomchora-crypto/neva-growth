// Dynamic Text — porte em JS puro do componente "Dynamic Text" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, disposer } from '../kit.js';

const MODES = {
  morph: { label: 'Morfar', words: ['Captar', 'Atender', 'Fechar', 'Crescer'], interval: 2200, loop: true },
  decode: { label: 'Decodificar', words: ['Pedido #4096 pago', 'Cliente novo: Marina', 'Meta do mês: 87%'], interval: 2800, loop: true },
  cycle: { label: 'Ciclo', words: [{ t: 'Olá', lang: 'pt' }, { t: 'Hello', lang: 'en' }, { t: 'Bonjour', lang: 'fr' }, { t: 'Hola', lang: 'es' }, { t: 'Ciao', lang: 'it' }, { t: 'Hallo', lang: 'de' }, { t: 'Olá', lang: 'pt' }], interval: 900, loop: false },
};
const PRICES = ['R$ 297', 'R$ 249', 'R$ 1.980', 'R$ 97'];

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
/** Divide em caracteres percebidos, para emoji e acentos combinados ficarem inteiros. */
const graphemes = (s) => seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);
const isDigit = (c) => c >= '0' && c <= '9';
const isBlank = (c) => c.trim() === '';
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const toWord = (w) => typeof w === 'string' ? { t: w } : w;

// O ritmo do ciclo: primeira palavra longa, do meio acelerando, última segura.
function holdFor(mode, i, n, interval) {
  if (mode !== 'cycle' || i === 0) return interval;
  if (i === n - 1) return interval * 2;
  return Math.max(90, interval * 0.36 * 0.8 ** (i - 1));
}

/* ---- Física do morph ---- */
const STEP = 1 / 120;
const damping = (k, z) => 2 * z * Math.sqrt(k);
const TRAVEL_K = 140, TRAVEL_C = damping(TRAVEL_K, 0.8);
const LIFT_K = 300, LIFT_C = damping(LIFT_K, 0.9);
const ROLL_K = 200, ROLL_C = damping(ROLL_K, 0.86);
const SQUASH_K = 1400, SQUASH_C = damping(SQUASH_K, 0.6);
const TILT_K = 140, TILT_C = damping(TILT_K, 0.7);
const WIDTH_K = 220, WIDTH_C = damping(WIDTH_K, 1);
// Distâncias em em, para o movimento escalar com a fonte.
const GRAVITY = 32, DROP = 0.7, FALL_FADE = 0.9, ROLL = 0.75, LAND_SQUASH = -0.16, ENTER_STAGGER = 0.035, MAX_ENTER_SPREAD = 0.45, FADE_RATE = 7;

function paint(g) {
  const sy = 1 + g.sq, sx = 1 - g.sq * 0.6;
  g.el.style.transform = `translate3d(${g.x.toFixed(2)}px,${g.y.toFixed(2)}px,0) rotate(${g.r.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
  g.el.style.opacity = g.o.toFixed(3);
}
function stepSquash(g, k) {
  if (g.sq === 0 && g.vsq === 0) return;
  g.vsq += (-SQUASH_K * g.sq - SQUASH_C * g.vsq) * k; g.sq += g.vsq * k;
  if (Math.abs(g.sq) < 0.001 && Math.abs(g.vsq) < 0.01) { g.sq = 0; g.vsq = 0; }
}
function stepTravel(g, k) {
  // Sobe num arco raso que atinge o pico no meio: letras que se cruzam passam por cima/baixo, não através.
  const span = Math.abs(g.tx - g.x0), p = span < 0.5 ? 1 : clamp01(1 - Math.abs(g.tx - g.x) / span);
  g.ty = g.arc * 4 * p * (1 - p);
  g.vx += (-TRAVEL_K * (g.x - g.tx) - TRAVEL_C * g.vx) * k; g.x += g.vx * k;
  g.vy += (-LIFT_K * (g.y - g.ty) - LIFT_C * g.vy) * k; g.y += g.vy * k;
  g.o = Math.min(1, g.o + FADE_RATE * k);
}
function stepDrop(g, k, em) {
  g.vy += GRAVITY * em * k; g.y += g.vy * k;
  if (g.y >= 0) { g.y = 0; g.vy = 0; g.sq = LAND_SQUASH; g.phase = 'rest'; } // pouso: um amassado e a mola devolve
  g.o = clamp01(1 + g.y / (DROP * em));
}
function stepFall(g, k, em) {
  g.vy += GRAVITY * em * k; g.y += g.vy * k; g.x += g.vx * k;
  g.vr += (-TILT_K * (g.r - g.tr) - TILT_C * g.vr) * k; g.r += g.vr * k;
  g.o = Math.min(g.o, clamp01(1 - g.y / (FALL_FADE * em)));
}
function stepRoll(g, k, em) {
  g.vy += (-ROLL_K * (g.y - g.ty) - ROLL_C * g.vy) * k; g.y += g.vy * k;
  g.o = clamp01(1 - Math.abs(g.y) / (ROLL * em));
}
const stepFade = (g, k) => { g.o = clamp01(g.o + (g.leaving ? -FADE_RATE : FADE_RATE) * k); };
function stepGlyph(g, k, em) {
  if (g.phase === 'travel') stepTravel(g, k);
  else if (g.phase === 'drop') stepDrop(g, k, em);
  else if (g.phase === 'fall') stepFall(g, k, em);
  else if (g.phase === 'roll') stepRoll(g, k, em);
  else if (g.phase === 'fade') stepFade(g, k);
  stepSquash(g, k);
}
const isGone = (g) => g.leaving && g.o <= 0.002;
/** Põe o glifo em repouso quando chega; devolve true enquanto se mexe. */
function settle(g) {
  if (g.leaving) return !isGone(g);
  const arrived = Math.abs(g.x - g.tx) < 0.05 && Math.abs(g.vx) < 0.5 && Math.abs(g.y) < 0.05 && Math.abs(g.vy) < 0.5;
  if ((g.phase === 'travel' && arrived) || (g.phase === 'roll' && arrived) || (g.phase === 'fade' && g.o >= 1)) {
    Object.assign(g, { x: g.tx, y: 0, vx: 0, vy: 0, o: 1, phase: 'rest' });
  }
  return g.phase !== 'rest' || g.sq !== 0;
}
// Direção do rolar: 1 se o número cresceu (o velho sobe, o novo sobe).
const rollDirection = (prev, tokens) => Number(tokens.filter((t) => t.digit).map((t) => t.char).join('')) < Number(prev.filter((g) => g.digit).map((g) => g.char).join('')) ? -1 : 1;

class MorphEngine {
  constructor(root) { this.root = root; this.glyphs = []; this.order = []; this.reduced = false; this.started = false; this.em = 16; this.w = 0; this.vw = 0; this.tw = 0; this.id = 0; this.raf = 0; this.last = 0; this.tick = this.tick.bind(this); }
  create(t) {
    const g = { id: this.id++, char: t.char, digit: t.digit, slot: t.slot, el: h('span', { class: 'kk-dynamic-text-g', 'aria-hidden': 'true' }, t.char), phase: 'rest', leaving: false, delay: 0, x: t.x, vx: 0, tx: t.x, x0: t.x, arc: 0, y: 0, vy: 0, ty: 0, r: 0, vr: 0, tr: 0, sq: 0, vsq: 0, o: 1 };
    this.glyphs.push(g); this.root.append(g.el); return g;
  }
  move(g, t, instant) {
    g.slot = t.slot; g.tx = t.x;
    if (instant) { Object.assign(g, { x: t.x, y: 0, vx: 0, vy: 0, phase: g.o < 1 ? 'fade' : 'rest' }); return; }
    if (g.phase === 'rest' && Math.abs(t.x - g.x) < 0.5) { g.x = t.x; return; }
    g.x0 = g.x; g.delay = 0; // redirecionar mantém posição e velocidade: sem reiniciar
    const d = t.x - g.x;
    g.arc = -Math.sign(d) * Math.min(0.22 * this.em, Math.abs(d) * 0.14); g.phase = 'travel';
  }
  enter(g, dir, instant, index) {
    g.o = 0;
    if (instant) { g.phase = 'fade'; return; }
    if (g.digit) { g.y = dir * ROLL * this.em; g.ty = 0; g.phase = 'roll'; return; }
    g.y = -DROP * this.em; g.phase = 'drop'; g.delay = index * ENTER_STAGGER;
  }
  leave(g, dir, instant) {
    g.leaving = true; g.delay = 0;
    if (instant) { g.phase = 'fade'; return; }
    if (g.digit) { g.phase = 'roll'; g.ty = -dir * ROLL * 1.2 * this.em; return; }
    // Inclina para o lado em que está, 5–15°, e deriva um pouco.
    const side = g.x + this.em * 0.3 < this.tw / 2 ? -1 : 1;
    g.tr = side * (5 + ((g.id * 7) % 11)); g.vx = side * 0.4 * this.em; g.vy = Math.max(g.vy, 0); g.phase = 'fall';
  }
  /** Reposiciona o texto atual após redimensionar ou carregar a fonte. */
  place(tokens, width) {
    if (tokens.length !== this.order.length) return;
    tokens.forEach((t, i) => { const g = this.order[i]; g.tx = t.x; if (g.phase === 'rest') { g.x = t.x; paint(g); } });
    this.tw = width;
    if (!this.raf) { this.w = width; this.paintWidth(); }
  }
  update(tokens, width) {
    if (!this.started) {
      this.started = true; this.order = tokens.map((t) => this.create(t)); this.order.forEach(paint);
      this.w = this.tw = width; this.paintWidth(); return;
    }
    const instant = this.reduced, letters = new Map(), slots = new Map();
    for (const g of this.order) {
      if (g.digit) slots.set(g.slot, g); else letters.set(g.char, [...(letters.get(g.char) ?? []), g]);
    }
    const dir = rollDirection(this.order, tokens), next = []; let entering = 0;
    for (const t of tokens) {
      let old;
      if (t.digit) { old = slots.get(t.slot); slots.delete(t.slot); } else old = letters.get(t.char)?.shift();
      if (old && old.char === t.char) { this.move(old, t, instant); next.push(old); continue; }
      if (old) this.leave(old, dir, instant);
      const g = this.create(t); this.enter(g, dir, instant, entering++); next.push(g);
    }
    // Strings longas dividem o mesmo atraso total, para a última letra não chegar tarde.
    const spread = entering * ENTER_STAGGER;
    if (spread > MAX_ENTER_SPREAD) for (const g of next) g.delay *= MAX_ENTER_SPREAD / spread;
    for (const list of letters.values()) for (const g of list) this.leave(g, dir, instant);
    for (const g of slots.values()) this.leave(g, dir, instant);
    this.order = next; this.tw = width; this.glyphs.forEach(paint);
    if (instant) { this.w = width; this.vw = 0; this.paintWidth(); }
    this.kick();
  }
  paintWidth() { this.root.style.width = `${this.w.toFixed(2)}px`; }
  stepWidth(dt) {
    if (Math.abs(this.w - this.tw) < 0.1 && Math.abs(this.vw) < 0.1) {
      if (this.w !== this.tw) { this.w = this.tw; this.vw = 0; this.paintWidth(); }
      return false;
    }
    let t = dt;
    while (t > 1e-6) { const k = Math.min(STEP, t); this.vw += (-WIDTH_K * (this.w - this.tw) - WIDTH_C * this.vw) * k; this.w += this.vw * k; t -= k; }
    this.paintWidth(); return true;
  }
  stepAll(dt) {
    let moving = false;
    for (const g of this.glyphs) {
      if (g.delay > 0) { g.delay -= dt; moving = true; continue; }
      let t = dt;
      while (t > 1e-6) { const k = Math.min(STEP, t); stepGlyph(g, k, this.em); t -= k; }
      if (settle(g)) moving = true;
      paint(g);
    }
    return moving;
  }
  tick(now) {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60; this.last = now;
    const moving = this.stepAll(dt), resizing = this.stepWidth(dt);
    if (this.glyphs.some(isGone)) {
      this.glyphs.filter(isGone).forEach((g) => g.el.remove());
      this.glyphs = this.glyphs.filter((g) => !isGone(g));
    }
    this.raf = moving || resizing ? requestAnimationFrame(this.tick) : 0; // dorme quando tudo assentou
  }
  kick() { if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(this.tick); } }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
}

/** Lê onde cada caractere está, na linha de medição invisível. */
function measureTokens(measure, text) {
  const tokens = [];
  graphemes(text).forEach((char, i) => {
    const cell = measure.children[i];
    if (!cell || isBlank(char)) return;
    tokens.push({ char, x: cell.offsetLeft, digit: isDigit(char), slot: 0 });
  });
  let slot = 0;
  for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].digit) tokens[i].slot = slot++; // dígitos contados da direita: preços rolam como contador
  return { tokens, width: measure.offsetWidth };
}

function morphLayer(rm) {
  const measure = h('span', { class: 'kk-dynamic-text-measure', 'aria-hidden': 'true' });
  const root = h('span', { class: 'kk-dynamic-text-morph' }, measure, h('span', { class: 'kk-dynamic-text-strut', 'aria-hidden': 'true' }, '​'));
  const engine = new MorphEngine(root); engine.reduced = rm;
  let current = '', ro = null;
  const set = (text) => {
    current = text;
    measure.replaceChildren(...graphemes(text).map((c) => h('span', c)));
    engine.em = parseFloat(getComputedStyle(root).fontSize) || 16;
    const { tokens, width } = measureTokens(measure, text);
    engine.update(tokens, width);
  };
  // Carregar fonte ou mudar o tamanho move as letras: reposiciona.
  const attach = () => {
    ro = new ResizeObserver(() => { engine.em = parseFloat(getComputedStyle(root).fontSize) || 16; const { tokens, width } = measureTokens(measure, current); engine.place(tokens, width); });
    ro.observe(measure);
  };
  return { el: root, set, attach, destroy: () => { engine.stop(); ro?.disconnect(); } };
}

/* ---- Decodificar ---- */
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=<>/', LOWER = 'abcdefghijklmnopqrstuvwxyz#%&*+=<>/', DIGITS = '0123456789';
const SWAP_EVERY = 0.05, FLASH_FOR = 0.05;
const poolFor = (c) => isDigit(c) ? DIGITS : c.toLowerCase() === c ? LOWER : UPPER;
const randomFrom = (p) => p[Math.floor(Math.random() * p.length)] ?? '';
const write = (cell, c) => { const n = cell?.firstChild; if (n && n.nodeValue !== c) n.nodeValue = c; };

function decodeLayer(rm) {
  const host = h('span', { class: 'kk-dynamic-text-decode', 'aria-hidden': 'true' });
  let shown = null, raf = 0, cells = [];
  const cleanup = () => { cancelAnimationFrame(raf); raf = 0; for (const c of cells) { write(c.el, c.char); c.el.removeAttribute('data-scramble'); c.el.removeAttribute('data-flash'); } cells = []; };
  const set = (text) => {
    cleanup();
    const next = graphemes(text), prev = shown; shown = next;
    // Células novas se ajustam ao tamanho do texto; as excedentes sobem como vazias.
    while (host.children.length < next.length) host.append(h('span', { class: 'kk-dynamic-text-cell' }, ' '));
    const els = Array.from(host.children);
    els.forEach((el, i) => { el.style.display = i < next.length ? '' : 'none'; write(el, next[i] ?? ''); el.removeAttribute('data-scramble'); el.removeAttribute('data-flash'); });
    const changed = next.map((char, i) => ({ char, i })).filter(({ char, i }) => !isBlank(char) && prev?.[i] !== char);
    if (!changed.length) return;
    if (rm) { host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }); return; }
    const stagger = Math.min(0.05, 0.75 / changed.length);
    changed.forEach(({ char, i }, rank) => {
      els[i].setAttribute('data-scramble', '');
      cells.push({ el: els[i], char, lockAt: 0.15 + rank * stagger, swapAt: 0, state: 'scramble' });
    });
    let start = 0;
    const tick = (now) => {
      start ||= now; const t = (now - start) / 1000;
      for (const c of cells) {
        if (c.state === 'flash') { if (t >= c.lockAt + FLASH_FOR) { c.el.removeAttribute('data-flash'); c.state = 'done'; } continue; }
        if (t >= c.lockAt) { write(c.el, c.char); c.el.removeAttribute('data-scramble'); c.el.setAttribute('data-flash', ''); c.state = 'flash'; continue; }
        if (t >= c.swapAt) { write(c.el, randomFrom(poolFor(c.char))); c.swapAt = t + SWAP_EVERY; }
      }
      raf = cells.every((c) => c.state === 'done') ? 0 : requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  return { el: host, set, attach() {}, destroy: cleanup };
}

export default function mount(stage, ctx) {
  ensureStyle('dynamic-text', `
.kk-dynamic-text{width:100%;display:flex;flex-direction:column;align-items:center;gap:18px;padding:8px 4px;container-type:inline-size;color:var(--ink)}
.kk-dynamic-text-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:4px;border-radius:99px;background:var(--ice-100)}
.kk-dynamic-text-tab{min-height:36px;padding:0 14px;border:0;border-radius:99px;background:none;color:var(--mut);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.kk-dynamic-text-tab[aria-selected=true]{background:#fff;color:var(--ice-800);box-shadow:0 1px 4px rgba(15,53,96,.16)}
.kk-dynamic-text button:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-dynamic-text-view{display:flex;align-items:center;justify-content:center;min-height:84px;max-width:100%;overflow:hidden;padding:6px 10px;font-size:clamp(28px,12cqw,56px);font-weight:700;letter-spacing:-.02em;line-height:1.25}
.kk-dynamic-text-word{display:inline-block;white-space:pre;font-variant-numeric:tabular-nums;--dt-accent:var(--ice-600)}
.kk-dynamic-text-morph{position:relative;display:inline-block;vertical-align:baseline}
.kk-dynamic-text-measure{position:absolute;left:0;top:0;visibility:hidden;pointer-events:none}
.kk-dynamic-text-strut{display:inline-block;width:0}
.kk-dynamic-text-g{position:absolute;left:0;top:0;transform-origin:50% 80%}
.kk-dynamic-text-decode{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.62em}
.kk-dynamic-text-cell{display:inline-block;width:1ch;text-align:center}
.kk-dynamic-text-cell[data-flash]{color:var(--dt-accent)}
.kk-dynamic-text-cell[data-scramble]{opacity:.45}
.kk-dynamic-text-price{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px}
.kk-dynamic-text-price .kk-dynamic-text-word{font-size:clamp(20px,8cqw,30px);font-weight:700;color:var(--ice-800)}
.kk-dynamic-text-b{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.kk-dynamic-text-b:hover{background:var(--ice-100)}
.kk-dynamic-text-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`);
  const dispose = disposer();
  const rm = reduced();
  let mode = 'morph', layer = null, step = 0, running = false, timer = 0, priceI = 0, priceLayer = null;
  let inView = false;

  const sr = h('span', { class: 'kk-dynamic-text-sr', 'aria-live': 'polite' });
  const word = h('span', { class: 'kk-dynamic-text-word' });
  const view = h('div', { class: 'kk-dynamic-text-view' }, word);
  const priceWord = h('span', { class: 'kk-dynamic-text-word' });
  const priceBtn = h('button', { class: 'kk-dynamic-text-b', type: 'button', onclick: () => { priceI = (priceI + 1) % PRICES.length; priceLayer.set(PRICES[priceI]); } }, 'Trocar plano');
  const price = h('div', { class: 'kk-dynamic-text-price' }, priceWord, priceBtn);
  const replay = h('button', { class: 'kk-dynamic-text-b', type: 'button', onclick: () => { step = 0; show(); schedule(); } }, 'Repetir');
  const tabs = h('div', { class: 'kk-dynamic-text-tabs', role: 'tablist', 'aria-label': 'Modo da animação' }, Object.entries(MODES).map(([k, m]) =>
    h('button', { class: 'kk-dynamic-text-tab', type: 'button', role: 'tab', 'data-mode': k, onclick: () => setMode(k) }, m.label)));
  const root = h('div', { class: 'kk-dynamic-text' }, sr, tabs, view, price, replay);
  stage.append(root);

  const list = () => MODES[mode].words.map(toWord);
  const idx = () => { const n = list().length, m = MODES[mode]; return m.loop ? step % n : Math.min(step, n - 1); };
  function show() {
    const w = list()[idx()];
    word.lang = w.lang || '';
    sr.textContent = mode === 'cycle' ? '' : w.t; // ciclo rápido inundaria o leitor de tela
    layer.set(w.t);
  }
  function schedule() {
    clearTimeout(timer);
    const m = MODES[mode], n = list().length, i = idx();
    const done = !m.loop && i === n - 1;
    replay.style.visibility = mode === 'cycle' ? '' : 'hidden'; replay.disabled = mode !== 'cycle';
    if (done || !running || n < 2) return;
    timer = setTimeout(() => { step++; show(); schedule(); }, holdFor(mode, i, n, m.interval));
  }
  function setMode(k) {
    mode = k; step = 0;
    tabs.querySelectorAll('.kk-dynamic-text-tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === k));
    layer?.destroy(); word.replaceChildren();
    layer = k === 'decode' ? decodeLayer(rm) : morphLayer(rm);
    word.append(layer.el); layer.attach();
    price.style.display = k === 'morph' ? '' : 'none';
    show(); schedule();
  }
  priceLayer = morphLayer(rm); priceWord.append(priceLayer.el);
  priceLayer.attach(); priceLayer.set(PRICES[0]);
  priceWord.setAttribute('aria-label', 'Preço do plano');
  setMode('morph');

  // Só roda com o componente na tela e a aba visível.
  const sync = () => { const r = inView && document.visibilityState === 'visible'; if (r !== running) { running = r; schedule(); } };
  const io = new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting); sync(); });
  io.observe(root); document.addEventListener('visibilitychange', sync);
  dispose(() => { io.disconnect(); document.removeEventListener('visibilitychange', sync); });
  return () => { clearTimeout(timer); layer.destroy(); priceLayer.destroy(); dispose.run(); root.remove(); };
}
