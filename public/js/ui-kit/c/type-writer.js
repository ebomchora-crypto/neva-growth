// Typing Text — porte em JS puro do componente "Typing Text" (type-writer) .
import { h, svg, ensureStyle, reduced, disposer } from '../kit.js';

const SEQUENCES = [
  { text: 'Mais clientes', deleteAfter: true },
  { text: 'Vendas no automático', deleteAfter: true },
  { text: 'Neva Growth', deleteAfter: false },
];
const TYPING_SPEED = 50, START_DELAY = 200, LOOP_DELAY = 1000, DELETE_SPEED = 30, PAUSE_BEFORE_DELETE = 1000;
const NEXT_DELAY = 100;
const CARET_IDLE_MS = 500;       // o cursor fica fixo enquanto digita e só pisca após esse tempo parado
const TYPO_NOTICE_MS = 250;      // erro de tecla: percebido após esta pausa, apagado e redigitado
const TYPO_RATE = 0.06;
const SELECT_SWEEP_MS = 120, SELECT_HOLD_MS = 220;
const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** Teclas vizinhas de uma letra num teclado QWERTY, na mesma caixa. */
function neighbours(char) {
  const lower = char.toLowerCase(), row = KEY_ROWS.findIndex((k) => k.includes(lower));
  if (row === -1) return '';
  const col = KEY_ROWS[row].indexOf(lower);
  const around = [KEY_ROWS[row][col - 1], KEY_ROWS[row][col + 1], KEY_ROWS[row - 1]?.[col], KEY_ROWS[row + 1]?.[col]].filter(Boolean).join('');
  return char === lower ? around : around.toUpperCase();
}
/** Gerador pseudoaleatório com semente (Park-Miller), de 0 a 1: toda visita digita igual. */
function createRandom(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function typingDelay(random) {
  const r = random();
  if (r < 0.1) return TYPING_SPEED * 2;   // hesitação
  if (r > 0.9) return TYPING_SPEED * 0.5; // rajada
  return TYPING_SPEED * (0.6 + random() * 0.8);
}
class Stopped extends Error {}

export default function mount(stage, ctx) {
  ensureStyle('type-writer', `
.kk-type-writer{width:100%;display:flex;flex-direction:column;align-items:center;gap:22px;padding:8px 4px;container-type:inline-size;color:var(--ink)}
.kk-type-writer-text{display:inline-grid;justify-items:start;white-space:pre;padding-right:.25em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;letter-spacing:-.02em;line-height:1.2;font-size:clamp(20px,7.4cqw,44px);max-width:100%}
.kk-type-writer-text>span{grid-column:1;grid-row:1}
.kk-type-writer-ghost{visibility:hidden}
.kk-type-writer-live{min-height:1.2em}
.kk-type-writer-caret{position:relative;display:inline-block;width:0}
.kk-type-writer-caret i{position:absolute;left:.04em;bottom:-.1em;width:.08em;min-width:2px;height:1.05em;background:var(--ice-600)}
.kk-type-writer-caret i[data-idle=true]{animation:kk-type-writer-blink 1s linear infinite}
@keyframes kk-type-writer-blink{0%,33.333%{opacity:1}66.667%,100%{opacity:0}}
.kk-type-writer-sel{border-radius:.08em;background:rgba(74,149,210,.3)}
.kk-type-writer-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-type-writer-ctl{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.kk-type-writer-b{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}
.kk-type-writer-b:hover{background:var(--ice-100)}
.kk-type-writer-b[aria-pressed=true]{background:var(--ice-100);border-color:var(--ice-400);color:var(--ice-800)}
.kk-type-writer-b:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-type-writer-b svg{width:14px;height:14px}
@media (prefers-reduced-motion:reduce){.kk-type-writer-caret i[data-idle=true]{animation:none}}
`);
  const dispose = disposer();
  const rm = reduced();
  const state = { paused: false, select: false, typos: true, visible: true };
  const pos = { sequence: 0, char: 0, deleting: false };
  const random = createRandom(7);
  let stop = null, idleTimer;

  const live = h('span', { class: 'kk-type-writer-live' });
  const caretI = h('i', { 'data-idle': 'true' });
  const caret = h('span', { class: 'kk-type-writer-caret' }, caretI);
  live.append(caret);
  const text = h('span', { class: 'kk-type-writer-text', 'aria-hidden': 'true' },
    SEQUENCES.map((s) => h('span', { class: 'kk-type-writer-ghost' }, s.text)), live);
  const sr = h('span', { class: 'kk-type-writer-sr' }, SEQUENCES.map((s) => s.text).join(', '));

  const pauseBtn = h('button', { class: 'kk-type-writer-b', type: 'button', onclick: () => { state.paused = !state.paused; drawCtl(); restart(); } });
  const selBtn = h('button', { class: 'kk-type-writer-b', type: 'button', onclick: () => { state.select = !state.select; drawCtl(); restart(); } }, 'Apagar selecionando');
  const typoBtn = h('button', { class: 'kk-type-writer-b', type: 'button', onclick: () => { state.typos = !state.typos; drawCtl(); restart(); } }, 'Errar e corrigir');
  const ctl = h('div', { class: 'kk-type-writer-ctl' }, pauseBtn, selBtn, typoBtn);
  const root = h('div', { class: 'kk-type-writer' }, sr, text, !rm && ctl);
  stage.append(root);

  const ico = (d) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'currentColor' }, svg('path', { d }));
  function drawCtl() {
    pauseBtn.replaceChildren(ico(state.paused ? 'M7 4l13 8-13 8z' : 'M6 4h4v16H6zM14 4h4v16h-4z'), state.paused ? 'Retomar' : 'Pausar');
    pauseBtn.setAttribute('aria-pressed', state.paused);
    selBtn.setAttribute('aria-pressed', state.select); typoBtn.setAttribute('aria-pressed', state.typos);
  }
  function show(t, selected = 0) {
    const kept = t.slice(0, t.length - selected), sel = t.slice(kept.length);
    live.replaceChildren(kept, caret, sel ? h('span', { class: 'kk-type-writer-sel' }, sel) : '');
  }
  // Cada tecla mantém o cursor fixo; ele volta a piscar quando fica parado.
  function keystroke() {
    caretI.dataset.idle = 'false'; clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { caretI.dataset.idle = 'true'; }, CARET_IDLE_MS);
  }

  function run() {
    let stopped = false; const timers = new Set();
    const wait = (ms) => new Promise((res, rej) => {
      if (stopped) return rej(new Stopped());
      const t = setTimeout(() => { timers.delete(t); stopped ? rej(new Stopped()) : res(); }, ms);
      timers.add(t);
    });
    const typeChar = async (t) => {
      const wrongKeys = neighbours(t[pos.char]);
      if (state.typos && wrongKeys && random() < TYPO_RATE) {
        show(t.slice(0, pos.char) + wrongKeys[Math.floor(random() * wrongKeys.length)]); keystroke();
        await wait(TYPO_NOTICE_MS + TYPING_SPEED);
        show(t.slice(0, pos.char)); keystroke();
        await wait(TYPING_SPEED * 1.5);
      }
      pos.char += 1; show(t.slice(0, pos.char)); keystroke();
      await wait(typingDelay(random));
    };
    const erase = async (t) => {
      if (state.select) {
        const len = pos.char, step = SELECT_SWEEP_MS / Math.max(len, 1);
        for (let s = 1; s <= len; s++) { show(t.slice(0, len), s); keystroke(); await wait(step); }
        await wait(SELECT_HOLD_MS); pos.char = 0; show(''); keystroke(); return;
      }
      while (pos.char > 0) { pos.char -= 1; show(t.slice(0, pos.char)); keystroke(); await wait(DELETE_SPEED); }
    };
    const advance = async (delay) => {
      const last = pos.sequence >= SEQUENCES.length - 1;
      pos.sequence = last ? 0 : pos.sequence + 1; pos.char = 0; pos.deleting = false; // avança antes: pausar na espera não redigita
      await wait(last ? LOOP_DELAY : delay); show(''); return true;
    };
    const phrase = async () => {
      const seq = SEQUENCES[pos.sequence], t = seq.text;
      pos.char = Math.min(pos.char, t.length); show(t.slice(0, pos.char)); // retomando após pausa
      if (!pos.deleting) {
        while (pos.char < t.length) await typeChar(t);
        const last = pos.sequence === SEQUENCES.length - 1;
        // No laço, a última frase também é apagada em vez de sumir.
        if (!(seq.deleteAfter || last)) return advance(PAUSE_BEFORE_DELETE);
        await wait(PAUSE_BEFORE_DELETE); pos.deleting = true;
      }
      await erase(t); return advance(NEXT_DELAY);
    };
    (async () => {
      try { await wait(START_DELAY); while (await phrase()); }
      catch (e) { if (!(e instanceof Stopped)) throw e; }
    })();
    return () => { stopped = true; timers.forEach(clearTimeout); clearTimeout(idleTimer); caretI.dataset.idle = 'true'; };
  }
  // Pausado ou fora da tela: mantém o texto; `pos` lembra onde parou e a digitação retoma dali (WCAG 2.2.2).
  function restart() { stop?.(); stop = null; if (!rm && !state.paused && state.visible) stop = run(); }

  if (rm) show(SEQUENCES.at(-1).text);
  else {
    drawCtl();
    const io = new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; restart(); });
    io.observe(root); dispose(() => io.disconnect());
    restart();
  }
  return () => { stop?.(); dispose.run(); clearTimeout(idleTimer); root.remove(); };
}
