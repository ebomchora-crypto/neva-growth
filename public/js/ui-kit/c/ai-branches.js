// Ramificações de conversa — porte em JS puro do componente "AI Conversation Branches" .
import { h, svg, ensureStyle, reduced, onResize, PALETTE } from '../kit.js';

const ROOT = 'root', ROW = 30, LANE = 18, PAD = 12, WORD_GAP = /(\s+)/;
const NS = 'kk-ai-branches-';

// Ícones de traço próprios
const I = (d) => svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const PENCIL = 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', LEFT = 'M15 6l-6 6 6 6', RIGHT = 'M9 6l6 6-6 6';

const DEMO = [
  { id: 'u1', role: 'user', text: 'Monte um plano de campanha de 3 semanas para o Dia das Mães.' },
  { id: 'a1', role: 'assistant', parent: 'u1', text: 'Semana 1: aquecimento com conteúdo de bastidores e lista de espera.\nSemana 2: lançamento da oferta por e-mail e anúncios.\nSemana 3: urgência com contagem regressiva e frete grátis.' },
  { id: 'u2', role: 'user', parent: 'a1', text: 'Deixe a semana 3 menos promocional.' },
  { id: 'a2', role: 'assistant', parent: 'u2', text: 'Troque a urgência por histórias de clientes: depoimentos em vídeo, um guia de presentes e um sorteio simples, sem contagem regressiva.' },
  { id: 'u2b', role: 'user', parent: 'a1', text: 'Dê à semana 3 um foco em e-mail marketing.' },
  { id: 'a2b', role: 'assistant', parent: 'u2b', text: 'Use a semana 3 só para e-mail: lembrete para quem abriu e não comprou, oferta segmentada para clientes antigos e uma última chamada na véspera.' },
  { id: 'u1b', role: 'user', text: 'Monte um plano de campanha de 3 semanas para a Black Friday.' },
  { id: 'a1b', role: 'assistant', parent: 'u1b', text: 'Semana 1: pré-lançamento com cupom para a lista VIP.\nSemana 2: ofertas escalonadas por categoria.\nSemana 3: a semana da Black Friday, com remarketing diário.' },
];
const demoReply = (prompt) => {
  const q = prompt.replace(/[.!?]+$/, ''); const short = q.length > 48 ? q.slice(0, 48) + '…' : q;
  return `Aqui vai uma versão pensada em “${short}”. Mantive três semanas e deixei as ações maiores no início, para o fim ficar livre para ajustes.`;
};

function buildTree(messages) {
  const tree = { [ROOT]: { id: ROOT, role: 'root', text: '', parent: null, children: [] } };
  for (const m of messages) tree[m.id] = { id: m.id, role: m.role, text: m.text, parent: m.parent ?? ROOT, children: [] };
  for (const m of messages) tree[m.parent ?? ROOT]?.children.push(m.id);
  return tree;
}
// Segue o filho escolhido em cada bifurcação, do topo até uma folha
function pathOf(tree, picked) {
  const path = []; let node = tree[ROOT];
  while (node.children.length) { const next = node.children[Math.min(picked[node.id] ?? 0, node.children.length - 1)]; path.push(next); node = tree[next]; }
  return path;
}
// Linhas por profundidade; o primeiro filho mantém a faixa do pai, os outros abrem à direita
function layout(tree) {
  const pos = {}; let lanes = 1, rows = 1;
  const visit = (id, row, lane) => {
    pos[id] = { row, lane }; rows = Math.max(rows, row + 1);
    tree[id].children.forEach((c, i) => { if (i === 0) visit(c, row + 1, lane); else { visit(c, row + 1, lanes); lanes++; } });
  };
  visit(ROOT, 0, 0);
  return { pos, lanes, rows };
}

export default function mount(stage, ctx = {}) {
  ensureStyle('ai-branches', `
  .${NS}root{display:flex;flex-direction:column;width:100%;max-width:576px;height:${ctx.big ? 520 : 440}px;margin:auto;min-width:0;box-sizing:border-box;overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 0 0 1px rgba(14,34,54,.1);color:${PALETTE.ink}}
  .${NS}head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${PALETTE.ice100}}
  .${NS}head h3{margin:0;font-size:14px;font-weight:600}.${NS}head p{margin:0;font-size:12px;color:${PALETTE.mut};font-variant-numeric:tabular-nums}
  .${NS}body{position:relative;display:flex;flex:1;min-height:0}
  .${NS}chat{flex:1;min-width:0;overflow-y:auto;overscroll-behavior:contain;padding:16px}
  .${NS}chat ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
  .${NS}asst{margin:0 -8px;padding:4px 8px;border-radius:8px;white-space:pre-line;font-size:14px;line-height:1.6;color:${PALETTE.ink};transition:background-color .15s}
  li.lit .${NS}asst{background:${PALETTE.ice50}}
  .${NS}usr{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
  .${NS}bub{margin:0;max-width:85%;padding:8px 14px;border-radius:16px 16px 6px 16px;background:${PALETTE.ice100};font-size:14px;line-height:1.35;transition:background-color .15s}
  li.lit .${NS}bub{background:${PALETTE.ice200}}
  .${NS}tools{display:flex;align-items:center;gap:2px;min-height:36px;color:${PALETTE.ice500}}
  .${NS}tb{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer;transition:background-color .15s,color .15s,opacity .15s}
  .${NS}tb svg{width:14px;height:14px}
  .${NS}tb:not(:disabled):hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.${NS}tb:disabled{opacity:.4;cursor:default}
  .${NS}edit{opacity:0}li:hover .${NS}edit,.${NS}edit:focus-visible{opacity:1}
  @media (hover:none){.${NS}edit{opacity:1}}
  .${NS}tb:focus-visible,.${NS}node:focus-visible,.${NS}btn:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
  .${NS}cnt{min-width:32px;text-align:center;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
  .${NS}cur{display:inline-block;width:6px;height:14px;margin-left:2px;transform:translateY(2px);border-radius:2px;background:${PALETTE.ice800};animation:${NS}pulse 1s ease-in-out infinite}
  @keyframes ${NS}pulse{50%{opacity:.35}}
  .${NS}box{width:100%;max-width:85%;box-sizing:border-box;padding:8px;border-radius:16px;background:${PALETTE.ice100}}
  .${NS}box textarea{display:block;width:100%;box-sizing:border-box;resize:none;border:0;background:transparent;padding:4px 6px;font:16px/1.35 inherit;font-family:inherit;color:${PALETTE.ink};outline:none}
  .${NS}bar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:4px}
  .${NS}bar p{margin:0 0 0 6px;font-size:11px;color:${PALETTE.mut}}
  .${NS}acts{display:flex;gap:6px;margin-left:auto}
  .${NS}btn{min-height:36px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:${PALETTE.mut};font:500 12px/1 inherit;font-family:inherit;cursor:pointer}
  .${NS}btn:hover{background:#fff;color:${PALETTE.ink}}.${NS}btn.solid{background:${PALETTE.ice700};color:#fff}.${NS}btn.solid:hover{background:${PALETTE.ice800}}.${NS}btn:disabled{opacity:.4;cursor:default}
  .${NS}rail{position:relative;flex:none;width:76px;overflow:auto;border-left:1px solid ${PALETTE.ice100};background:${PALETTE.ice50};scrollbar-width:none}
  @media (min-width:420px){.${NS}rail{width:92px}}
  .${NS}rail>div{position:relative;margin:0 auto}
  .${NS}rail svg.g{display:block;overflow:visible}
  .${NS}edge{fill:none;stroke:${PALETTE.ice200};stroke-width:1.25;stroke-dasharray:1;stroke-dashoffset:0;transition:stroke .3s,stroke-width .3s}
  .${NS}edge.new{animation:${NS}draw .4s cubic-bezier(.23,1,.32,1)}
  @keyframes ${NS}draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
  .${NS}edge.lit{stroke:${PALETTE.ice900};stroke-width:1.75}
  .${NS}dot{stroke:${PALETTE.ice200};stroke-width:1.5;fill:${PALETTE.ice50};transform-box:fill-box;transform-origin:center;transition:fill .3s,stroke .3s,transform .2s cubic-bezier(.23,1,.32,1)}
  .${NS}dot.asst{fill:${PALETTE.ice200}}.${NS}dot.lit{stroke:${PALETTE.ice900}}.${NS}dot.asst.lit{fill:${PALETTE.ice900}}.${NS}dot.hv{transform:scale(1.45)}
  .${NS}dot.new{animation:${NS}pop .2s cubic-bezier(.23,1,.32,1)}
  @keyframes ${NS}pop{from{transform:scale(0);opacity:0}to{transform:none;opacity:1}}
  .${NS}node{position:absolute;width:36px;height:30px;transform:translate(-50%,-50%);border:0;border-radius:50%;background:transparent;padding:0;cursor:pointer}
  .${NS}tip{position:absolute;right:${76 + 8}px;z-index:10;width:min(208px,calc(100% - 100px));margin:0;padding:8px 12px;border-radius:8px;background:#fff;box-shadow:0 8px 24px -10px rgba(14,34,54,.35),0 0 0 1px rgba(14,34,54,.1);font-size:12px;line-height:1.35;color:${PALETTE.mut};pointer-events:none;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;animation:${NS}tipin .15s cubic-bezier(.23,1,.32,1)}
  @media (min-width:420px){.${NS}tip{right:${92 + 8}px}}
  .${NS}tip b{display:block;margin-bottom:2px;font-size:11px;color:${PALETTE.ink}}
  @keyframes ${NS}tipin{from{opacity:0;transform:translateX(4px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.${NS}edge,.${NS}dot,.${NS}tip,.${NS}cur{animation:none!important;transition:none!important}}
  `);

  let tree = buildTree(DEMO), picked = {}, dir = 1, hover = null, editing = null, writing = null, count = 0, timer = 0, firstRender = true;
  let path = [], map = layout(tree);
  const lis = new Map();

  const chat = h('div', { class: NS + 'chat' }); const ol = h('ol'); chat.append(ol);
  const countEl = h('p', { 'aria-live': 'polite' });
  const body = h('div', { class: NS + 'body' });
  const rail = h('nav', { class: NS + 'rail', 'aria-label': 'Ramificações' });
  const railIn = h('div'); const g = svg('svg', { class: 'g', 'aria-hidden': 'true' }); railIn.append(g); rail.append(railIn);
  let tip = null;
  body.append(chat, rail);
  const root = h('div', { class: NS + 'root' }, h('header', { class: NS + 'head' }, h('h3', 'Campanha do Dia das Mães'), countEl), body);
  stage.append(root);

  const edgeEls = new Map(), dotEls = new Map(), nodeEls = new Map();

  // Aponta todas as bifurcações acima de `id` para ele, para o chat mostrar esse ramo
  function show(id, by) {
    const lane = (n) => (n ? map.pos[n]?.lane ?? 0 : 0);
    dir = by ?? (lane(id) >= lane(path.at(-1)) ? 1 : -1);
    let child = id, parent = tree[id].parent;
    while (parent) { picked[parent] = tree[parent].children.indexOf(child); child = parent; parent = tree[parent].parent; }
    render();
  }
  function step(id, by) {
    const siblings = tree[tree[id].parent ?? ROOT].children; const next = siblings[siblings.indexOf(id) + by];
    if (next) show(next, by);
  }
  function submitEdit(id, text) {
    editing = null;
    const t = text.trim();
    if (!t || t === tree[id].text) { render(); return; }
    count++;
    const user = `edit-${count}`, answer = `${user}-reply`, parent = tree[id].parent ?? ROOT;
    picked[parent] = tree[parent].children.length;
    tree[parent].children.push(user);
    tree[user] = { id: user, role: 'user', text: t, parent, children: [answer] };
    tree[answer] = { id: answer, role: 'assistant', text: demoReply(t), parent: user, children: [] };
    dir = 1; writing = { id: answer, words: 0 };
    render(); stream();
  }
  // Escreve a resposta da ramificação nova duas palavras por vez
  function stream() {
    clearTimeout(timer);
    if (!writing) return;
    const total = tree[writing.id].text.split(WORD_GAP).length;
    if (reduced() || writing.words >= total) { const id = writing.id; writing = null; fill(lis.get(id), id); return; }
    timer = setTimeout(() => { writing.words += 2; fill(lis.get(writing.id), writing.id); chat.scrollTo({ top: chat.scrollHeight }); stream(); }, 45);
  }

  function msgView(id) {
    const node = tree[id];
    if (node.role === 'assistant') {
      let text = node.text; const w = writing?.id === id ? writing.words : undefined;
      if (w !== undefined) text = node.text.split(WORD_GAP).slice(0, w).join('');
      return h('p', { class: NS + 'asst' }, text, w !== undefined && h('span', { class: NS + 'cur', 'aria-hidden': 'true' }));
    }
    const siblings = tree[node.parent ?? ROOT].children, index = siblings.indexOf(id);
    if (editing === id) {
      const ta = h('textarea', { 'aria-label': 'Editar mensagem', rows: 3 }, node.text); ta.value = node.text;
      const send = h('button', { type: 'button', class: NS + 'btn solid', onclick: () => submitEdit(id, ta.value) }, 'Enviar');
      ta.addEventListener('input', () => { send.disabled = !ta.value.trim(); });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(id, ta.value); }
        else if (e.key === 'Escape') { editing = null; render(); }
      });
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
      return h('div', { class: NS + 'usr' }, h('div', { class: NS + 'box' }, ta, h('div', { class: NS + 'bar' }, h('p', 'Enviar cria uma nova ramificação'),
        h('div', { class: NS + 'acts' }, h('button', { type: 'button', class: NS + 'btn', onclick: () => { editing = null; render(); } }, 'Cancelar'), send))));
    }
    return h('div', { class: NS + 'usr' }, h('p', { class: NS + 'bub' }, node.text),
      h('div', { class: NS + 'tools' },
        h('button', { type: 'button', class: NS + 'tb ' + NS + 'edit', 'aria-label': 'Editar mensagem', onclick: () => { editing = id; render(); } }, I(PENCIL)),
        siblings.length > 1 && [
          h('button', { type: 'button', class: NS + 'tb', 'aria-label': 'Versão anterior', disabled: index === 0, onclick: () => step(id, -1) }, I(LEFT)),
          h('span', { class: NS + 'cnt' }, `${index + 1}/${siblings.length}`),
          h('button', { type: 'button', class: NS + 'tb', 'aria-label': 'Próxima versão', disabled: index === siblings.length - 1, onclick: () => step(id, 1) }, I(RIGHT))]));
  }
  function fill(li, id) { if (li) li.replaceChildren(msgView(id)); }

  function renderChat() {
    const keep = new Set(path);
    for (const [id, li] of lis) if (!keep.has(id)) { li.remove(); lis.delete(id); }
    for (const id of path) {
      let li = lis.get(id), fresh = false;
      if (!li) {
        fresh = true;
        li = h('li', { onpointerenter: () => setHover(id), onpointerleave: () => setHover(null) }); lis.set(id, li);
      }
      // Não refaz a caixa de edição enquanto o texto está sendo digitado
      if (fresh || editing === id || li.querySelector('textarea') || writing?.id !== id) fill(li, id);
      ol.append(li);
      if (fresh && !firstRender && !reduced()) li.animate([{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }

  const at = (id) => ({ x: PAD + map.pos[id].lane * LANE, y: PAD + map.pos[id].row * ROW });
  function renderRail() {
    const on = new Set([ROOT, ...path]);
    const w = PAD * 2 + (map.lanes - 1) * LANE, hgt = PAD * 2 + (map.rows - 1) * ROW;
    railIn.style.width = w + 'px'; railIn.style.height = hgt + 'px'; g.setAttribute('width', w); g.setAttribute('height', hgt);
    const nodes = Object.values(tree);
    for (const n of nodes) for (const c of n.children) {
      const key = n.id + '>' + c, a = at(n.id), b = at(c); let e = edgeEls.get(key);
      if (!e) { e = svg('path', { class: NS + 'edge' + (firstRender ? '' : ' new'), pathLength: 1 }); g.prepend(e); edgeEls.set(key, e); }
      e.setAttribute('d', a.x === b.x ? `M ${a.x} ${a.y} L ${b.x} ${b.y}` : `M ${a.x} ${a.y} C ${a.x} ${a.y + ROW * 0.7} ${b.x} ${b.y - ROW * 0.7} ${b.x} ${b.y}`);
      e.classList.toggle('lit', on.has(n.id) && on.has(c));
    }
    for (const n of nodes) {
      const p = at(n.id); let d = dotEls.get(n.id);
      if (!d) { d = svg('circle', { r: n.role === ROOT ? 2.5 : 3.5 }); g.append(d); dotEls.set(n.id, d); if (!firstRender) d.classList.add('new'); }
      d.setAttribute('class', NS + 'dot' + (n.role === 'assistant' ? ' asst' : '') + (on.has(n.id) ? ' lit' : '') + (hover === n.id ? ' hv' : '') + (d.classList.contains('new') ? ' new' : ''));
      d.setAttribute('cx', p.x); d.setAttribute('cy', p.y);
      if (n.role === ROOT) continue;
      let b = nodeEls.get(n.id);
      if (!b) {
        b = h('button', { type: 'button', class: NS + 'node', onclick: () => show(n.id), onfocus: () => setHover(n.id), onblur: () => setHover(null), onpointerenter: () => setHover(n.id), onpointerleave: () => setHover(null) });
        railIn.append(b); nodeEls.set(n.id, b);
      }
      b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
      b.setAttribute('aria-label', `${n.role === 'user' ? 'Você' : 'Resposta'}: ${n.text.slice(0, 60)}`);
      if (on.has(n.id)) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    }
  }
  function setHover(id) {
    hover = id;
    for (const [k, li] of lis) li.classList.toggle('lit', k === id);
    for (const [k, d] of dotEls) d.classList.toggle('hv', k === id);
    tip?.remove(); tip = null;
    if (id && tree[id] && !path.includes(id)) {
      tip = h('p', { class: NS + 'tip', style: `top:${PAD + (map.pos[id]?.row ?? 0) * ROW - 6}px` }, h('b', tree[id].role === 'user' ? 'Você perguntou' : 'Resposta'), tree[id].text);
      body.append(tip);
    }
  }
  function render() {
    path = pathOf(tree, picked); map = layout(tree);
    const leaves = Object.values(tree).filter((n) => !n.children.length && n.id !== ROOT).length;
    countEl.textContent = `${leaves} ramificaç${leaves === 1 ? 'ão' : 'ões'}`;
    renderChat(); renderRail(); firstRender = false;
  }

  // A trilha de ramos precisa caber no palco: rolagem própria quando faltar altura
  const stopResize = onResize(stage, () => { rail.style.maxHeight = ''; });
  render();
  return () => { clearTimeout(timer); stopResize(); };
}
