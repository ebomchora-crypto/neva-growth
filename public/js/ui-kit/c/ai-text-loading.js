// AI Text Loading — porte em JS puro do componente "AI Text Loading" do Kokonut UI (MIT, @kokonutui, https://kokonutui.com).
import { h, ensureStyle, reduced, disposer, PALETTE } from '../kit.js';

const EASE_OUT = 'cubic-bezier(.23,1,.32,1)';
const WAVE_STEP = 0.07;       // atraso entre letras vizinhas na onda
const LETTER_STAGGER = 18;    // ms entre as letras ao entrar uma palavra nova
const TEXTS = ['Pensando…', 'Lendo seus leads…', 'Cruzando vendas…', 'Calculando o funil…', 'Quase pronto…'];

const CSS = `
@keyframes kk-ai-text-loading-wave{50%{opacity:.3}}
.kk-ai-text-loading-root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:16px;background:linear-gradient(160deg,#fff,${PALETTE.ice50})}
.kk-ai-text-loading-line{display:flex;align-items:baseline;justify-content:center;gap:12px;font-weight:700;color:var(--ink,${PALETTE.ink});font-size:clamp(20px,7.4cqw,34px);letter-spacing:-.02em;max-width:100%}
.kk-ai-text-loading-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.kk-ai-text-loading-words{position:relative;display:flex;justify-content:center;min-height:1.3em}
.kk-ai-text-loading-word{display:flex;justify-content:center;white-space:pre;min-width:max-content}
.kk-ai-text-loading-word.out{position:absolute;left:50%;top:0;transform:translateX(-50%);pointer-events:none}
.kk-ai-text-loading-letter{display:inline-block}
.kk-ai-text-loading-wave{display:inline-block;animation:kk-ai-text-loading-wave 1.6s ease-in-out infinite both}
.kk-ai-text-loading-root[data-still] .kk-ai-text-loading-wave{animation:none}
.kk-ai-text-loading-secs{font-size:max(13px,.5em);font-weight:500;color:${PALETTE.ice400};font-variant-numeric:tabular-nums}
.kk-ai-text-loading-bar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.kk-ai-text-loading-chip{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:#fff;color:${PALETTE.ice800};font-family:inherit;font-weight:600;font-size:12px;line-height:1;cursor:pointer}
.kk-ai-text-loading-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-ai-text-loading-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('ai-text-loading', CSS);
  const off = disposer();
  const still = reduced(); // sem movimento: a palavra troca só com um fade e as letras ficam paradas

  const state = { index: 0, seconds: 0, showElapsed: false, paused: false };
  const words = h('span', { class: 'kk-ai-text-loading-words', 'aria-hidden': 'true' });
  const secs = h('span', { class: 'kk-ai-text-loading-secs', 'aria-hidden': 'true', hidden: true }, '0s');
  // <output> é região viva: o rótulo fixo é lido, as frases que giram ficam escondidas dos leitores de tela.
  const line = h('output', { class: 'kk-ai-text-loading-line', 'aria-live': 'polite' },
    h('span', { class: 'kk-ai-text-loading-sr' }, 'Analisando seus dados'), words, secs);

  const buildWord = (text) => {
    const el = h('span', { class: 'kk-ai-text-loading-word' });
    el.append(...Array.from(text).map((ch, i) => h('span', { class: 'kk-ai-text-loading-letter' },
      h('span', { class: 'kk-ai-text-loading-wave', style: `animation-delay:${i * WAVE_STEP}s` }, ch))));
    return el;
  };
  const show = (initial) => {
    const prev = words.firstElementChild, next = buildWord(TEXTS[state.index]);
    if (prev) { // a palavra anterior sai por cima (popLayout), sem empurrar a nova
      prev.classList.add('out');
      const a = prev.animate(still ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translateX(-50%) translateY(0)', filter: 'blur(0)' }, { opacity: 0, transform: 'translateX(-50%) translateY(-6px)', filter: 'blur(3px)' }], { duration: still ? 120 : 150, easing: EASE_OUT, fill: 'forwards' });
      a.onfinish = () => prev.remove();
    }
    words.append(next);
    if (initial) return;
    [...next.children].forEach((letter, i) => letter.animate(
      still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
      { duration: still ? 160 : 280, delay: still ? 0 : i * LETTER_STAGGER, easing: EASE_OUT, fill: 'backwards' }));
  };
  const advance = () => { state.index = (state.index + 1) % TEXTS.length; show(false); };

  let timer = 0;
  const schedule = () => { clearInterval(timer); if (!state.paused) timer = setInterval(advance, 1500); };
  const startedAt = Date.now();
  const tick = setInterval(() => { if (!state.showElapsed || state.paused) return; secs.textContent = Math.floor((Date.now() - startedAt) / 1000) + 's'; }, 500);

  const toggle = (label, key, after) => {
    const b = h('button', { type: 'button', class: 'kk-ai-text-loading-chip', 'aria-pressed': 'false', onclick: () => { state[key] = !state[key]; b.setAttribute('aria-pressed', String(state[key])); after?.(); } }, label);
    return b;
  };
  const bar = h('div', { class: 'kk-ai-text-loading-bar' },
    toggle('Mostrar tempo', 'showElapsed', () => { secs.hidden = !state.showElapsed; if (state.showElapsed) secs.textContent = Math.floor((Date.now() - startedAt) / 1000) + 's'; }),
    toggle('Pausar', 'paused', schedule),
    h('button', { type: 'button', class: 'kk-ai-text-loading-chip', onclick: () => { advance(); schedule(); } }, 'Próxima frase'));

  const root = h('div', { class: 'kk-ai-text-loading-root' }, line, bar);
  if (still) root.dataset.still = '';
  stage.append(root);
  show(true); schedule();

  return () => { clearInterval(timer); clearInterval(tick); off.run(); root.remove(); };
}
