// Alternativas por palavra — porte em JS puro do componente "AI Token Alternatives" .
import { h, svg, icon, ensureStyle, reduced, PALETTE } from '../kit.js';

// Ícones de traço próprios (o ícone 'check' do app é uma caixa marcada)
const I = (d) => svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const CHECK = 'M5 12.5l4.5 4.5L19 7';

const PROMPT = 'A Carla quer adiar a reunião de revisão do lançamento. Pode rascunhar uma resposta rápida?';
// Cada "slot" é uma palavra em que o modelo ficou em dúvida; a primeira opção é a que ele escreveu
const SLOTS = [
  { id: 'saudacao', options: [{ text: 'Claro', p: 0.58 }, { text: 'Sim', p: 0.23 }, { text: 'Boa ideia', p: 0.12 }] },
  { id: 'dia', options: [{ text: 'quinta-feira', p: 0.41 }, { text: 'sexta-feira', p: 0.34 }, { text: 'segunda-feira', p: 0.17 }] },
  { id: 'hora', options: [{ text: '14h', p: 0.38 }, { text: '10h', p: 0.31 }, { text: 'depois do almoço', p: 0.22 }] },
  { id: 'duracao', options: [{ text: '30 minutos', p: 0.52 }, { text: 'uma hora', p: 0.29 }, { text: '15 minutos', p: 0.13 }] },
];
const MOTIVO = {
  'sexta-feira': ', já que a versão fica pronta na quinta à noite.',
  'segunda-feira': ', assim temos o fim de semana para corrigir os últimos erros.',
};
// A resposta se reescreve a partir da palavra trocada, porque o texto depois dela depende da escolha
const compose = (c) => [
  { slot: 'saudacao' }, ', ', { slot: 'dia' }, ' funciona melhor para mim', MOTIVO[c.dia] ?? ', e dá um dia para o design finalizar os fluxos.',
  ' Que tal ', { slot: 'hora' }, c.hora === 'depois do almoço' ? ', quando todos já tiverem voltado' : '',
  '? Vamos limitar a ', { slot: 'duracao' },
  c.duracao === '15 minutos' ? ' e revisar só os bloqueios.' : ' e passar pelo checklist do lançamento juntos.',
];

// Palavras comuns em que o modelo tinha menos certeza, para a visão de confiança ter textura
const SOFT = { design: 0.62, fluxos: 0.71, versão: 0.68, erros: 0.64, bloqueios: 0.6, checklist: 0.57, juntos: 0.74, todos: 0.7 };
// Probabilidade alta e estável para uma palavra comum, para o desenho não mudar a cada render
const plainP = (word, index) => {
  if (SOFT[word] !== undefined) return SOFT[word];
  let k = index * 31;
  for (const ch of word) k = (k * 33 + ch.charCodeAt(0)) % 997;
  return 0.86 + (k % 13) / 100;
};

const TOKEN_RE = /\s+|[^\s,.?!]+|[,.?!]/g, SPACE = /^\s+$/;
function tokenize(pieces, choice) {
  const tokens = []; let lead = '';
  const push = (word, p, slot) => { tokens.push({ key: `${tokens.length}:${word}`, lead, word, p, slot }); lead = ''; };
  for (const piece of pieces) {
    if (typeof piece === 'string') {
      for (const part of piece.match(TOKEN_RE) ?? []) { if (SPACE.test(part)) lead += part; else push(part, plainP(part, tokens.length)); }
      continue;
    }
    const slot = SLOTS.find((s) => s.id === piece.slot);
    const picked = slot.options.find((o) => o.text === choice[piece.slot]) ?? slot.options[0];
    push(picked.text, picked.p, piece.slot);
  }
  return tokens;
}
const defaults = () => Object.fromEntries(SLOTS.map((s) => [s.id, s.options[0].text]));

export default function mount(stage) {
  ensureStyle('ai-token-alternatives', `
  .kk-ai-token-alternatives-root{width:100%;max-width:448px;margin:auto;min-width:0;box-sizing:border-box;border-radius:16px;background:#fff;box-shadow:0 0 0 1px rgba(14,34,54,.1);color:${PALETTE.ink}}
  .kk-ai-token-alternatives-q{display:flex;justify-content:flex-end;padding:16px 16px 0}
  .kk-ai-token-alternatives-q p{margin:0;max-width:85%;padding:8px 14px;border-radius:16px 16px 6px 16px;background:${PALETTE.ice100};font-size:13px;line-height:1.4;color:${PALETTE.ink}}
  .kk-ai-token-alternatives-ans{position:relative;padding:16px 16px 20px}
  .kk-ai-token-alternatives-txt{margin:0;font-size:15px;line-height:28px}
  .kk-ai-token-alternatives-w{border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone;transition:background-color .3s}
  .kk-ai-token-alternatives-in{animation:kk-ai-token-alternatives-in .28s cubic-bezier(.23,1,.32,1)}
  @keyframes kk-ai-token-alternatives-in{from{opacity:0;filter:blur(3px)}to{opacity:1;filter:none}}
  .kk-ai-token-alternatives-slot{margin:0 -2px;padding:0 2px;border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;border-radius:4px;text-decoration:underline dotted ${PALETTE.ice400} 1.5px;text-underline-offset:5px;box-decoration-break:clone;-webkit-box-decoration-break:clone;transition:background-color .15s}
  .kk-ai-token-alternatives-slot:hover{background:rgba(15,53,96,.06)}.kk-ai-token-alternatives-slot.active{background:rgba(15,53,96,.1)}
  .kk-ai-token-alternatives-slot.edited{text-decoration:underline solid ${PALETTE.ice600} 1.5px;text-underline-offset:5px}
  .kk-ai-token-alternatives-slot:focus-visible,.kk-ai-token-alternatives-opt:focus-visible,.kk-ai-token-alternatives-sw:focus-visible,.kk-ai-token-alternatives-chip button:focus-visible,.kk-ai-token-alternatives-reset:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
  .kk-ai-token-alternatives-cur{display:inline-block;width:7px;height:16px;margin-left:2px;transform:translateY(3px);border-radius:2px;background:${PALETTE.ice800};animation:kk-ai-token-alternatives-pulse 1s ease-in-out infinite}
  @keyframes kk-ai-token-alternatives-pulse{50%{opacity:.35}}
  .kk-ai-token-alternatives-menu{position:absolute;z-index:20;box-sizing:border-box;padding:6px;border-radius:12px;background:#fff;box-shadow:0 12px 32px -12px rgba(14,34,54,.35),0 0 0 1px rgba(14,34,54,.1);transform-origin:top left;animation:kk-ai-token-alternatives-pop .16s cubic-bezier(.23,1,.32,1)}
  .kk-ai-token-alternatives-menu.out{opacity:0;transition:opacity .1s}
  @keyframes kk-ai-token-alternatives-pop{from{opacity:0;transform:translateY(-4px) scale(.97)}to{opacity:1;transform:none}}
  .kk-ai-token-alternatives-mh{margin:0;padding:4px 8px 6px;font-size:11px;color:${PALETTE.mut}}
  .kk-ai-token-alternatives-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:6px 8px;border:0;border-radius:8px;background:transparent;text-align:left;cursor:pointer;font-family:inherit;color:inherit}
  .kk-ai-token-alternatives-opt:hover,.kk-ai-token-alternatives-opt:focus-visible{background:${PALETTE.ice50}}
  .kk-ai-token-alternatives-ot{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:13px}
  .kk-ai-token-alternatives-bar{flex:none;width:56px;height:4px;border-radius:99px;overflow:hidden;background:${PALETTE.ice100}}
  .kk-ai-token-alternatives-bar i{display:block;height:100%;border-radius:99px;background:${PALETTE.ice300};transform-origin:left;transform:scaleX(0);transition:transform .4s cubic-bezier(.23,1,.32,1) .05s}
  .kk-ai-token-alternatives-opt.sel .kk-ai-token-alternatives-bar i{background:${PALETTE.ice700}}
  .kk-ai-token-alternatives-pct{flex:none;width:32px;text-align:right;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:${PALETTE.mut}}
  .kk-ai-token-alternatives-ck{flex:none;width:14px;height:14px;color:${PALETTE.ink}}.kk-ai-token-alternatives-ck svg{width:14px;height:14px;display:block}
  .kk-ai-token-alternatives-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:48px;padding:6px 16px;border-top:1px solid ${PALETTE.ice100}}
  .kk-ai-token-alternatives-sw{display:flex;align-items:center;gap:8px;min-height:36px;padding:0;border:0;background:transparent;font:12px/1 inherit;font-family:inherit;color:${PALETTE.mut};cursor:pointer;border-radius:6px}
  .kk-ai-token-alternatives-sw span{position:relative;width:28px;height:16px;border-radius:99px;background:${PALETTE.ice200};transition:background-color .2s}
  .kk-ai-token-alternatives-sw span::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .2s cubic-bezier(.23,1,.32,1)}
  .kk-ai-token-alternatives-sw[aria-checked=true] span{background:${PALETTE.ice600}}.kk-ai-token-alternatives-sw[aria-checked=true] span::after{transform:translateX(12px)}
  .kk-ai-token-alternatives-chips{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px}
  .kk-ai-token-alternatives-hintx{margin:0;font-size:12px;color:${PALETTE.mut}}
  .kk-ai-token-alternatives-chip{display:flex;align-items:center;gap:4px;min-height:28px;padding:0 4px 0 10px;border-radius:99px;background:${PALETTE.ice100};font-size:11px;color:${PALETTE.mut};animation:kk-ai-token-alternatives-in .18s}
  .kk-ai-token-alternatives-chip s{color:${PALETTE.ice400}}.kk-ai-token-alternatives-chip b{color:${PALETTE.ink};font-weight:600}
  .kk-ai-token-alternatives-chip button{width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:${PALETTE.ice500};cursor:pointer}
  .kk-ai-token-alternatives-chip button:hover{background:${PALETTE.ice200};color:${PALETTE.ink}}.kk-ai-token-alternatives-chip svg{width:12px;height:12px}
  .kk-ai-token-alternatives-reset{display:flex;align-items:center;gap:4px;min-height:28px;padding:0 10px;border:0;border-radius:99px;background:transparent;font:11px/1 inherit;font-family:inherit;color:${PALETTE.mut};cursor:pointer}
  .kk-ai-token-alternatives-reset:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-ai-token-alternatives-reset svg{width:12px;height:12px}
  .kk-ai-token-alternatives-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  @media (prefers-reduced-motion:reduce){.kk-ai-token-alternatives-in,.kk-ai-token-alternatives-menu,.kk-ai-token-alternatives-chip{animation:none}.kk-ai-token-alternatives-cur{animation:none}.kk-ai-token-alternatives-bar i{transition:none}}
  `);

  let choice = defaults(), shown = 0, openSlot = null, heat = false, timer = 0, tokens = tokenize(compose(choice), choice);
  const rendered = []; // { key, nodes, el, token }
  const slotEls = new Map();

  const txt = h('p', { class: 'kk-ai-token-alternatives-txt' });
  const cursor = h('span', { class: 'kk-ai-token-alternatives-cur', 'aria-hidden': 'true' });
  const ans = h('div', { class: 'kk-ai-token-alternatives-ans' }, txt);
  const live = h('p', { class: 'kk-ai-token-alternatives-sr', 'aria-live': 'polite' });
  const footL = h('button', { type: 'button', class: 'kk-ai-token-alternatives-sw', role: 'switch', 'aria-checked': 'false', onclick: () => { heat = !heat; footL.setAttribute('aria-checked', String(heat)); refresh(); } }, h('span'), 'Confiança');
  const chips = h('div', { class: 'kk-ai-token-alternatives-chips' });
  const root = h('div', { class: 'kk-ai-token-alternatives-root' },
    h('div', { class: 'kk-ai-token-alternatives-q' }, h('p', PROMPT)), ans, h('footer', { class: 'kk-ai-token-alternatives-foot' }, footL, chips), live);
  stage.append(root);

  const streaming = () => shown < tokens.length;
  const edits = () => SLOTS.filter((s) => choice[s.id] !== s.options[0].text);

  // Mais incerto = mais azul no modo confiança
  const heatBg = (p) => `rgba(47,123,189,${(Math.max(0, (0.95 - p) / 0.75) * 0.32).toFixed(3)})`;

  function makeToken(t) {
    const lead = document.createTextNode(t.lead);
    let el;
    if (t.slot) {
      el = h('button', { type: 'button', class: 'kk-ai-token-alternatives-slot kk-ai-token-alternatives-in', 'aria-haspopup': 'listbox', 'aria-expanded': 'false',
        'aria-label': `${t.word}, ${Math.round(t.p * 100)}% provável. Mostrar alternativas`, onclick: () => toggle(t.slot) }, t.word);
      slotEls.set(t.slot, el);
    } else el = h('span', { class: 'kk-ai-token-alternatives-w kk-ai-token-alternatives-in' }, t.word);
    return { key: t.key, nodes: [lead, el], el, token: t };
  }

  // Só acrescenta/remove o que mudou, para a animação de entrada rodar uma vez por palavra
  function sync() {
    let m = 0;
    while (m < rendered.length && m < shown && rendered[m].key === tokens[m].key) m++;
    while (rendered.length > m) { const r = rendered.pop(); r.nodes.forEach((n) => n.remove()); if (r.token.slot && slotEls.get(r.token.slot) === r.el) slotEls.delete(r.token.slot); }
    for (let i = rendered.length; i < shown; i++) { const r = makeToken(tokens[i]); rendered.push(r); txt.append(...r.nodes); }
    cursor.remove(); if (streaming()) txt.append(cursor);
    refresh();
  }
  function refresh() {
    const ed = edits();
    for (const r of rendered) {
      const t = r.token;
      if (t.slot) {
        r.el.classList.toggle('edited', ed.some((s) => s.id === t.slot)); r.el.classList.toggle('active', openSlot === t.slot);
        r.el.setAttribute('aria-expanded', String(openSlot === t.slot)); r.el.style.backgroundColor = heat && openSlot !== t.slot ? heatBg(t.p) : '';
      } else r.el.style.backgroundColor = heat ? heatBg(t.p) : '';
    }
    chips.replaceChildren(...(ed.length === 0 ? [h('p', { class: 'kk-ai-token-alternatives-hintx' }, 'Toque numa palavra pontilhada para trocá-la')] : [
      ...ed.map((s) => h('span', { class: 'kk-ai-token-alternatives-chip' }, h('s', s.options[0].text), h('b', choice[s.id]),
        h('button', { type: 'button', 'aria-label': `Voltar para ${s.options[0].text}`, onclick: () => pick(s.id, s.options[0].text) }, icon('x')))),
      ...(ed.length > 1 ? [h('button', { type: 'button', class: 'kk-ai-token-alternatives-reset', onclick: resetAll }, icon('undo'), 'Refazer tudo')] : [])]));
    live.textContent = streaming() ? '' : 'Resposta atualizada';
  }

  function tick() {
    clearTimeout(timer);
    if (!streaming()) { txt.style.minHeight = ''; return; }
    if (reduced()) { shown = tokens.length; sync(); txt.style.minHeight = ''; return; }
    const word = tokens[shown]?.word ?? '';
    timer = setTimeout(() => { shown++; sync(); tick(); }, 26 + Math.min(40, word.length * 6));
  }

  // Segura a altura enquanto reescreve, para o cartão não pular
  const holdHeight = () => { txt.style.minHeight = txt.offsetHeight + 'px'; };
  function pick(slotId, text) {
    const index = tokens.findIndex((t) => t.slot === slotId);
    closeMenu();
    if (choice[slotId] === text) return;
    holdHeight(); choice = { ...choice, [slotId]: text }; tokens = tokenize(compose(choice), choice); shown = index + 1;
    sync(); tick(); slotEls.get(slotId)?.focus({ preventScroll: true });
  }
  function resetAll() {
    const first = tokens.findIndex((t) => t.slot && edits().some((s) => s.id === t.slot));
    holdHeight(); choice = defaults(); tokens = tokenize(compose(choice), choice); shown = Math.max(0, first); sync(); tick();
  }

  let menu = null;
  function closeMenu(refocus = false) {
    const slot = openSlot; openSlot = null; menu?.remove(); menu = null; refresh();
    if (refocus && slot) slotEls.get(slot)?.focus({ preventScroll: true });
  }
  function toggle(slotId) {
    if (openSlot === slotId) { closeMenu(); return; }
    menu?.remove();
    const btn = slotEls.get(slotId), slot = SLOTS.find((s) => s.id === slotId);
    const b = btn.getBoundingClientRect(), r = ans.getBoundingClientRect();
    const width = Math.min(252, r.width);
    openSlot = slotId; refresh();
    const opts = [...slot.options].sort((a, b2) => b2.p - a.p);
    menu = h('div', { class: 'kk-ai-token-alternatives-menu', role: 'listbox', 'aria-label': 'Outras palavras que o modelo considerou',
      style: `left:${Math.max(0, Math.min(b.left - r.left - 10, r.width - width))}px;top:${b.bottom - r.top + 6}px;width:${width}px`,
      onkeydown: onMenuKey },
      h('p', { class: 'kk-ai-token-alternatives-mh' }, 'Palavras que ele pesou aqui'),
      opts.map((o) => { const sel = o.text === choice[slotId];
        const bar = h('i'); requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transform = `scaleX(${o.p})`; }));
        return h('button', { type: 'button', class: 'kk-ai-token-alternatives-opt' + (sel ? ' sel' : ''), role: 'option', 'aria-selected': String(sel), onclick: () => pick(slotId, o.text) },
          h('span', { class: 'kk-ai-token-alternatives-ot' }, o.text), h('span', { class: 'kk-ai-token-alternatives-bar' }, bar), h('span', { class: 'kk-ai-token-alternatives-pct' }, `${Math.round(o.p * 100)}%`),
          h('span', { class: 'kk-ai-token-alternatives-ck', style: sel ? '' : 'visibility:hidden' }, I(CHECK))); }));
    ans.append(menu);
    (menu.querySelector('[aria-selected="true"]') || menu.querySelector('[role=option]')).focus({ preventScroll: true });
  }
  function onMenuKey(e) {
    const items = [...menu.querySelectorAll('[role=option]')], at = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(true); }
  }
  // Clique fora fecha a lista
  const onDown = (e) => { if (openSlot && !ans.contains(e.target)) closeMenu(); };
  document.addEventListener('pointerdown', onDown);

  sync(); tick();
  return () => { clearTimeout(timer); document.removeEventListener('pointerdown', onDown); };
}
