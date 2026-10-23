// Autocomplete de IA — porte em JS puro do componente "AI Autocomplete" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, PALETTE } from '../kit.js';
import { toast } from '../../ui.js';

const NS = 'kk-ai-autocomplete-';
const WORD = /^\s*\S+\s?/, WORDS = /\s*\S+\s*/g;
const nextWord = (ghost) => ghost.match(WORD)?.[0] ?? ghost;

// O "modelo" do demo: acha em que ponto do roteiro você está e oferece o resto da frase
const SCRIPT = [
  'Oi Maya,\n\n',
  'Obrigado pela atualização sobre o cronograma do lançamento. ',
  'Quinta-feira funciona para mim, então vamos mover a revisão para as 15h e manter o restante do plano como está. ',
  'Compartilho a apresentação atualizada com o time antes disso. ',
  'Me avise se algo mudar por aí.\n\n',
  'Abraço,\nSam',
];
const FULL = SCRIPT.join('');
const START = 'Oi Maya,\n\nObrigado pela atualização sobre o ';

function demoSuggest(text) {
  return new Promise((resolve) => setTimeout(() => {
    const tail = text.slice(-24).toLowerCase(), at = FULL.toLowerCase().lastIndexOf(tail);
    if (!tail.trim() || at < 0) return resolve(null);
    const from = at + tail.length; let end = from, sum = 0;
    for (const part of SCRIPT) { sum += part.length; if (sum > from) { end = sum; break; } }
    const rest = FULL.slice(from, end).replace(/\s+$/, (s) => (s.includes('\n') ? s : ' '));
    resolve(rest.trim() ? rest : null);
  }, 180 + Math.random() * 220));
}

export default function mount(stage) {
  ensureStyle('ai-autocomplete', `
  .${NS}root{width:100%;max-width:512px;margin:auto;min-width:0;box-sizing:border-box;overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line};color:${PALETTE.ink}}
  .${NS}meta{border-bottom:1px solid ${PALETTE.ice100};font-size:14px}
  .${NS}meta p{display:flex;gap:12px;margin:0;padding:10px 16px}.${NS}meta p+p{border-top:1px solid ${PALETTE.ice50}}
  .${NS}meta span:first-child{flex:none;width:56px;color:${PALETTE.ice400}}.${NS}meta span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .${NS}box{position:relative}
  .${NS}mirror,.${NS}ta{box-sizing:border-box;padding:12px 16px;font:16px/24px inherit;font-family:inherit;letter-spacing:normal;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}
  .${NS}mirror{min-height:128px;pointer-events:none;color:transparent}
  .${NS}ghost{color:${PALETTE.ice400}}
  .${NS}ta{position:absolute;inset:0;width:100%;height:100%;resize:none;overflow:hidden;border:0;background:transparent;color:${PALETTE.ink};caret-color:${PALETTE.ink};outline:none}
  .${NS}ta::placeholder{color:${PALETTE.ice400}}
  .${NS}box:focus-within{background:${PALETTE.ice50}}
  .${NS}w{animation:${NS}in .18s cubic-bezier(.23,1,.32,1) both}.${NS}still .${NS}w{animation:none}
  @keyframes ${NS}in{from{opacity:0;filter:blur(2px)}}
  .${NS}last{white-space:nowrap}
  .${NS}kbd{display:inline-flex;align-items:center;height:20px;padding:0 5px;border:1px solid ${PALETTE.ice200};border-radius:4px;font:11px/1 inherit;font-family:inherit;color:${PALETTE.ice500}}
  .${NS}mirror .${NS}kbd{margin-left:6px;vertical-align:middle;transform:translateY(-1px)}
  .${NS}bar{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:0 12px 8px;font-size:12px;color:${PALETTE.mut};transition:opacity .15s}
  .${NS}bar.off{opacity:0;pointer-events:none}
  .${NS}bar button{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 8px;border:0;border-radius:8px;background:transparent;font:12px/1 inherit;font-family:inherit;color:inherit;cursor:pointer}
  .${NS}bar button:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}
  .${NS}bar .${NS}kbd{height:auto;padding:1px 5px;font-size:11px}
  .${NS}esc{display:none;margin-left:4px}
  @container (min-width:400px){.${NS}esc{display:inline}}
  .${NS}foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-top:1px solid ${PALETTE.ice100}}
  .${NS}foot small{font-size:12px;color:${PALETTE.mut}}
  .${NS}send{white-space:nowrap;min-height:36px;padding:0 16px;border:0;border-radius:8px;background:${PALETTE.ice700};color:#fff;font:600 13px/1 inherit;font-family:inherit;cursor:pointer}
  .${NS}send:hover{background:${PALETTE.ice800}}.${NS}send:focus-visible,.${NS}bar button:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
  .${NS}sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  @media (prefers-reduced-motion:reduce){.${NS}w{animation-duration:1ms}.${NS}bar{transition:none}}
  `);
  stage.style.containerType = 'inline-size';

  const DELAY = 400;
  let value = START, ghost = '', atEnd = true, request = 0, timer = 0, animate = false;

  const mirrorText = h('span'), mirrorGhost = h('span', { class: NS + 'ghost' });
  const mirror = h('div', { class: NS + 'mirror', 'aria-hidden': 'true' }, mirrorText, mirrorGhost);
  const ta = h('textarea', { class: NS + 'ta', 'aria-label': 'Resposta para Maya', placeholder: 'Comece a escrever…', spellcheck: 'false' });
  ta.value = value;
  const live = h('p', { class: NS + 'sr', 'aria-live': 'polite' });
  const keep = (e) => e.preventDefault(); // mantém o foco e o cursor na caixa de texto
  const bar = h('div', { class: NS + 'bar off' },
    h('button', { type: 'button', tabindex: -1, onmousedown: keep, onclick: () => accept(ghost) }, h('kbd', { class: NS + 'kbd' }, 'Tab'), 'Aceitar'),
    h('button', { type: 'button', tabindex: -1, onmousedown: keep, onclick: () => accept(nextWord(ghost)) }, h('kbd', { class: NS + 'kbd' }, '→'), 'Palavra'),
    h('span', { class: NS + 'esc' }, h('kbd', { class: NS + 'kbd' }, 'Esc'), ' Dispensar'));
  const send = h('button', { type: 'button', class: NS + 'send', onclick: sendMail }, 'Enviar resposta');
  const root = h('div', { class: NS + 'root' },
    h('div', { class: NS + 'meta' }, h('p', h('span', 'Para'), h('span', 'Maya Chen')), h('p', h('span', 'Assunto'), h('span', 'Re: Revisão do lançamento'))),
    h('div', { class: NS + 'box' }, mirror, ta), live, bar,
    h('div', { class: NS + 'foot' }, h('small', 'A sugestão aparece quando você pausa a digitação.'), send));
  stage.append(root);

  const showGhost = () => ghost.length > 0 && atEnd;
  const caretAtEnd = () => ta.selectionStart === ta.selectionEnd && ta.selectionEnd === ta.value.length;

  // O espelho repete o texto sob a caixa e põe a sugestão depois: ele define a altura, então a caixa cresce junto
  function paint() {
    mirrorText.textContent = value || '​';
    const trail = value.endsWith('\n') ? '​' : '';
    mirrorGhost.replaceChildren(trail);
    mirror.classList.toggle(NS + 'still', !animate);
    if (showGhost()) {
      const words = ghost.match(WORDS) ?? [];
      words.forEach((w, i) => {
        const last = i === words.length - 1;
        const el = h('span', { class: NS + 'w' + (last ? ' ' + NS + 'last' : ''), style: `animation-delay:${Math.min(i, 12) * 28}ms` }, last ? w.trimEnd() : w);
        if (last) el.append(h('kbd', { class: NS + 'kbd' }, 'Tab'));
        mirrorGhost.append(el);
      });
    }
    bar.classList.toggle('off', !showGhost());
    live.textContent = showGhost() ? `Sugestão: ${ghost}. Pressione Tab para aceitar.` : '';
    ta.style.height = ''; // a altura vem do espelho (inset:0), nada a medir
  }

  function ask(text) {
    clearTimeout(timer);
    const id = ++request;
    timer = setTimeout(async () => {
      if (!text.trim()) return;
      const result = await demoSuggest(text);
      // Resposta para um texto que já mudou é descartada
      if (id === request && result) { ghost = result; animate = true; paint(); animate = false; }
    }, DELAY);
  }

  ta.addEventListener('input', () => {
    const next = ta.value, added = next.startsWith(value) ? next.slice(value.length) : null;
    value = next; atEnd = caretAtEnd();
    // Digitar o que a sugestão diz consome a sugestão em vez de trocá-la
    if (atEnd && added && ghost.startsWith(added)) {
      ghost = ghost.slice(added.length); paint();
      if (!ghost) ask(next);
      return;
    }
    request++; ghost = ''; paint();
    if (atEnd) ask(next);
  });

  function accept(part) {
    if (!part) return;
    const rest = ghost.length - part.length;
    value += part; ta.value = value; ghost = ghost.slice(part.length); atEnd = true; paint();
    ta.focus(); ta.setSelectionRange(value.length, value.length);
    if (rest <= 0) ask(value);
  }

  ta.addEventListener('keydown', (e) => {
    if (!showGhost()) return;
    const plain = !(e.metaKey || e.ctrlKey || e.altKey);
    if (e.key === 'Tab' && plain && !e.shiftKey) { e.preventDefault(); accept(ghost); }
    else if (e.key === 'ArrowRight' && plain && caretAtEnd()) { e.preventDefault(); accept(nextWord(ghost)); }
    else if (e.key === 'Escape') { e.preventDefault(); request++; ghost = ''; paint(); }
  });
  // Tirar o cursor do fim esconde a sugestão; de volta ao fim, ela volta
  const onSelect = () => { const end = caretAtEnd(); if (end !== atEnd) { atEnd = end; paint(); } };
  for (const ev of ['select', 'keyup', 'mouseup', 'touchend', 'focus']) ta.addEventListener(ev, onSelect);

  function sendMail() {
    if (!value.trim()) { toast('Escreva a resposta antes de enviar.', 'err'); ta.focus(); return; }
    toast('Resposta enviada para Maya Chen.');
    request++; ghost = ''; value = START; ta.value = value; atEnd = true; paint(); ask(value);
  }

  paint(); ask(value);
  return () => { clearTimeout(timer); request++; };
}
