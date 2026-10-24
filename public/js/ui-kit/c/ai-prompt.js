// AI Prompt — porte em JS puro do componente "AI Prompt" .
// Modelo + esforço, comandos "/", chips de arquivo (soltar, colar ou anexar), ↑ recupera a última mensagem e Parar durante a resposta.
// As respostas são simuladas localmente: o demo não chama nenhuma API.
import { h, svg, ensureStyle, disposer, reduced, PALETTE } from '../kit.js';

const MODELS = [
  { name: 'Neva 1.5', description: 'Mais capaz, para análises longas', efforts: ['Baixo', 'Médio', 'Alto', 'Máximo'], def: 'Alto' },
  { name: 'Neva 1.2', description: 'Rápido e esperto no dia a dia', efforts: ['Baixo', 'Médio', 'Alto'], def: 'Médio' },
  { name: 'Neva 1.0', description: 'O mais veloz, sem etapa de raciocínio' },
];
const HINTS = { Baixo: 'Responde na hora', Médio: 'Pensa um pouco antes', Alto: 'Pensa mais em problemas difíceis', Máximo: 'Sem limite de raciocínio' };
const P = (d, sw = 2) => svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const ICONS = {
  up: () => P('M12 19V5M5.5 11.5L12 5l6.5 6.5', 2.25), plus: () => P('M12 5v14M5 12h14'), x: () => P('M6 6l12 12M18 6L6 18'),
  chev: () => P('M6 9l6 6 6-6'), check: () => P('M5 12.5l4.5 4.5L19 7.5', 2.25), file: () => P('M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6'),
  sum: () => P('M4 6h16M4 12h10M4 18h14'), lang: () => P('M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c0 3-2 6-6 8M13 21l4-10 4 10M14.5 18h5'),
  bulb: () => P('M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z'), code: () => P('M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14'),
  spark: () => svg('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, svg('path', { d: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z' })),
};
const COMMANDS = [
  { id: 'resumir', label: 'Resumir', description: 'Encurta textos ou arquivos', icon: 'sum', reply: 'Resumo: as vendas cresceram 12% na semana, puxadas por 3 clientes recorrentes. Ponto de atenção: 4 faturas vencem na sexta.' },
  { id: 'traduzir', label: 'Traduzir', description: 'Para outro idioma', icon: 'lang', reply: 'Traduzido para o inglês: "Your order has been confirmed and will ship within two business days."' },
  { id: 'explicar', label: 'Explicar', description: 'Passo a passo, em palavras simples', icon: 'bulb', reply: 'Em 3 passos: 1) você define a meta de vendas; 2) acompanha o ritmo diário; 3) ajusta a oferta quando o ritmo cai.' },
  { id: 'rascunho', label: 'Escrever e-mail', description: 'Mensagens para clientes', icon: 'code', reply: 'Assunto: Sua proposta chegou\n\nOlá, Marina! Segue a proposta combinada. Qualquer ajuste, é só responder este e-mail.' },
];
const REPLIES = ['Entendi. Para esse pedido eu começaria separando os clientes por valor de compra e depois definiria uma oferta para cada grupo.', 'Boa pergunta. Pelos números de exemplo, o melhor dia para enviar a campanha é terça, por volta das 10h.', 'Posso montar isso em três etapas: levantar os dados, escolher a mensagem e agendar o envio.'];
const size = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

const CSS = `
.kk-ai-prompt-root{min-width:0;box-sizing:border-box;width:100%;display:flex;flex-direction:column;gap:10px;min-height:400px;container-type:inline-size;font-family:inherit;color:var(--ink,#0e2236)}
.kk-ai-prompt-thread{flex:1;display:flex;flex-direction:column;gap:8px;overflow-y:auto;max-height:220px;padding:2px}
.kk-ai-prompt-empty{margin:auto;text-align:center;font-size:13px;color:var(--mut,#4a6f93);padding:12px;line-height:1.5}
.kk-ai-prompt-msg{max-width:88%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
.kk-ai-prompt-msg.me{align-self:flex-end;background:${PALETTE.ice700};color:#fff;border-bottom-right-radius:4px}
.kk-ai-prompt-msg.ia{align-self:flex-start;background:${PALETTE.ice50};border:1px solid ${PALETTE.line};border-bottom-left-radius:4px}
.kk-ai-prompt-msg small{display:block;font-size:11px;opacity:.7;margin-bottom:2px}
.kk-ai-prompt-dots i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:${PALETTE.ice500};animation:kk-ai-prompt-b 1s infinite}
.kk-ai-prompt-dots i:nth-child(2){animation-delay:.15s}.kk-ai-prompt-dots i:nth-child(3){animation-delay:.3s}
@keyframes kk-ai-prompt-b{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}
.kk-ai-prompt-outer{border-radius:22px;background:${PALETTE.ice50};padding:4px}
.kk-ai-prompt-promo{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 6px 0 12px;font-size:12px;color:var(--mut,#4a6f93)}
.kk-ai-prompt-promo svg{width:14px;height:14px;color:${PALETTE.ice600};flex:none}
.kk-ai-prompt-promo p{margin:0;flex:1;min-width:0}
.kk-ai-prompt-promo button{min-height:36px;padding:0 10px;border:0;border-radius:8px;background:none;font:inherit;font-size:12px;font-weight:600;color:${PALETTE.ink};cursor:pointer}
.kk-ai-prompt-promo button:hover:not(:disabled){background:${PALETTE.ice100}}.kk-ai-prompt-promo button:disabled{color:var(--mut,#4a6f93);cursor:default}
.kk-ai-prompt-card{position:relative;display:flex;flex-direction:column;border-radius:18px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line},0 6px 20px -10px rgba(15,53,96,.25);transition:box-shadow .15s}
.kk-ai-prompt-card:focus-within{box-shadow:0 0 0 2px ${PALETTE.ice500},0 6px 20px -10px rgba(15,53,96,.25)}
.kk-ai-prompt-card.drop{box-shadow:0 0 0 2px ${PALETTE.ice500}}
.kk-ai-prompt-tray{display:flex;flex-wrap:wrap;gap:8px;padding:12px 12px 0;margin:0;list-style:none}
.kk-ai-prompt-chip{display:flex;align-items:center;gap:8px;height:44px;max-width:208px;padding:4px 6px 4px 4px;border-radius:12px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line};animation:kk-ai-prompt-in .2s both}
.kk-ai-prompt-chip .th{width:36px;height:36px;border-radius:8px;background:${PALETTE.ice100};color:${PALETTE.ice600};display:grid;place-items:center;overflow:hidden;flex:none}
.kk-ai-prompt-chip .th svg{width:16px;height:16px}.kk-ai-prompt-chip .th img{width:100%;height:100%;object-fit:cover}
.kk-ai-prompt-chip .nm{min-width:0;flex:1;line-height:1.2}.kk-ai-prompt-chip .nm b{display:block;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-prompt-chip .nm span{font-size:11px;color:var(--mut,#4a6f93)}
.kk-ai-prompt-chip.cmd{background:${PALETTE.ice100};color:${PALETTE.ice700};padding-left:10px;font-size:14px;gap:4px;box-shadow:none}
.kk-ai-prompt-rm{width:36px;height:36px;border:0;background:none;border-radius:8px;color:var(--mut,#4a6f93);display:grid;place-items:center;cursor:pointer;flex:none;margin:-6px -4px -6px 0}
.kk-ai-prompt-rm:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-ai-prompt-rm svg{width:14px;height:14px}
@keyframes kk-ai-prompt-in{from{opacity:0;transform:translateY(4px)}}
.kk-ai-prompt-field{width:100%;box-sizing:border-box;min-height:56px;max-height:200px;resize:none;border:0;outline:0;background:transparent;padding:14px 16px 4px;font:inherit;font-size:16px;line-height:1.5;color:inherit}
.kk-ai-prompt-field::placeholder{color:#7d97b3}
.kk-ai-prompt-bar{display:flex;align-items:center;gap:2px;padding:4px 8px 10px;flex-wrap:wrap}
.kk-ai-prompt-ghost{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 10px;border:0;border-radius:999px;background:none;font:inherit;font-size:12px;color:${PALETTE.mut};cursor:pointer;white-space:nowrap}
.kk-ai-prompt-ghost:hover,.kk-ai-prompt-ghost[aria-expanded=true]{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-ai-prompt-ghost svg{width:12px;height:12px;flex:none}.kk-ai-prompt-ghost b{font-weight:600}
.kk-ai-prompt-ghost .sp{width:14px;height:14px;color:${PALETTE.ice600}}
.kk-ai-prompt-attach{position:relative;width:36px;height:36px;flex:none;border-radius:50%;box-shadow:inset 0 0 0 1px ${PALETTE.line};display:grid;place-items:center;color:${PALETTE.mut};cursor:pointer}
.kk-ai-prompt-attach:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-ai-prompt-attach:focus-within{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-ai-prompt-attach svg{width:16px;height:16px}
.kk-ai-prompt-attach input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.kk-ai-prompt-grow{flex:1}
.kk-ai-prompt-send{position:relative;width:36px;height:36px;border:0;border-radius:50%;flex:none;cursor:pointer;background:${PALETTE.ice100};color:#8aa5c0;transition:background .15s,color .15s}
.kk-ai-prompt-send.on{background:${PALETTE.ice800};color:#fff}.kk-ai-prompt-send.on:hover{background:${PALETTE.ice900}}
.kk-ai-prompt-send:disabled{cursor:default}
.kk-ai-prompt-send span{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .2s,filter .2s}
.kk-ai-prompt-send svg{width:16px;height:16px}.kk-ai-prompt-send .sq{width:10px;height:10px;border-radius:2px;background:currentColor}
.kk-ai-prompt-send .stop{opacity:0;filter:blur(2px)}.kk-ai-prompt-send.busy .stop{opacity:1;filter:none}.kk-ai-prompt-send.busy .go{opacity:0;filter:blur(2px)}
.kk-ai-prompt-bars{display:flex;align-items:flex-end;gap:2px;height:12px}.kk-ai-prompt-bars i{width:3px;border-radius:1px;background:${PALETTE.ice200};transition:background .2s}.kk-ai-prompt-bars i.on{background:${PALETTE.ice800}}
.kk-ai-prompt-menu{position:absolute;z-index:20;bottom:calc(100% + 8px);left:8px;width:min(288px,calc(100% - 16px));box-sizing:border-box;padding:4px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line},0 12px 28px -10px rgba(15,53,96,.35);animation:kk-ai-prompt-in .12s both}
.kk-ai-prompt-menu[hidden]{display:none}
.kk-ai-prompt-menu .ttl{padding:6px 8px 4px;font-size:11px;color:var(--mut,#4a6f93)}
.kk-ai-prompt-item{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:6px 8px;border:0;border-radius:8px;background:none;font:inherit;text-align:left;cursor:pointer;color:inherit}
.kk-ai-prompt-item:hover,.kk-ai-prompt-item:focus-visible,.kk-ai-prompt-item.act{background:${PALETTE.ice100};outline:0}
.kk-ai-prompt-item .t{flex:1;min-width:0}.kk-ai-prompt-item .t b{display:block;font-size:12px;font-weight:500}.kk-ai-prompt-item .t small{display:block;font-size:11px;color:var(--mut,#4a6f93);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-prompt-item .ck{width:14px;height:14px;flex:none;color:${PALETTE.ink};visibility:hidden}.kk-ai-prompt-item[aria-checked=true] .ck{visibility:visible}
.kk-ai-prompt-item .ic{width:16px;height:16px;flex:none;color:${PALETTE.mut}}
.kk-ai-prompt-cmds{left:0;right:0;bottom:calc(100% + 8px)}
.kk-ai-prompt-cmds .hint{display:flex;gap:12px;margin-top:4px;padding:6px 8px 4px;border-top:1px solid ${PALETTE.line};font-size:11px;color:var(--mut,#4a6f93)}
.kk-ai-prompt-cmds kbd{display:inline-block;min-width:16px;padding:0 4px;border-radius:4px;background:${PALETTE.ice100};font:inherit;font-size:11px;text-align:center}
.kk-ai-prompt-cmds .m{color:${PALETTE.ink};font-weight:600}
.kk-ai-prompt-drop{position:absolute;inset:0;border-radius:18px;border:1px dashed ${PALETTE.ice500};background:rgba(255,255,255,.88);display:grid;place-items:center;font-size:12px;color:${PALETTE.ice700};opacity:0;pointer-events:none;transition:opacity .15s}
.kk-ai-prompt-card.drop .kk-ai-prompt-drop{opacity:1}
.kk-ai-prompt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.kk-ai-prompt-root button:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
@container (max-width:330px){.kk-ai-prompt-effort-n{display:none}.kk-ai-prompt-ghost{padding:0 8px}}
@media (prefers-reduced-motion:reduce){.kk-ai-prompt-chip,.kk-ai-prompt-menu{animation:none}.kk-ai-prompt-dots i{animation:none;opacity:.6}}
`;

export default function mount(stage, ctx = {}) {
  ensureStyle('ai-prompt', CSS);
  const dis = disposer();
  let model = MODELS[0].name, effort = MODELS[0].def, command = null, files = [], busy = false, lastSent = '', actIdx = 0, menuDismissed = false, abort = null, uid = 0;
  const cur = () => MODELS.find((m) => m.name === model);
  const efforts = () => cur().efforts || [];
  const startEffort = (m) => (m.efforts ? (m.efforts.includes(m.def) ? m.def : m.efforts.at(-1)) : null);
  // Ao trocar de modelo, mantém o mesmo nível ou o que fica na mesma altura da escala nova.
  const carry = (from, to, e) => {
    if (!to.efforts) return null;
    if (e && to.efforts.includes(e)) return e;
    if (!e || !from.efforts || from.efforts.length < 2) return startEffort(to);
    return to.efforts[Math.round((from.efforts.indexOf(e) / (from.efforts.length - 1)) * (to.efforts.length - 1))] || startEffort(to);
  };

  const thread = h('div', { class: 'kk-ai-prompt-thread', 'aria-live': 'polite', 'aria-label': 'Conversa' });
  const empty = () => h('div', { class: 'kk-ai-prompt-empty' }, 'Escreva uma mensagem ou digite / para ver os comandos. As respostas deste demo são simuladas.');
  thread.append(empty());
  const addMsg = (who, text) => { thread.querySelector('.kk-ai-prompt-empty')?.remove(); const m = h('div', { class: 'kk-ai-prompt-msg ' + who }, text); thread.append(m); thread.scrollTop = thread.scrollHeight; return m; };

  const field = h('textarea', { class: 'kk-ai-prompt-field', id: 'kk-ap-f' + Math.random().toString(36).slice(2, 7), rows: 1, role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-label': 'Mensagem', placeholder: 'Pergunte qualquer coisa. Digite / para comandos' });
  const tray = h('ul', { class: 'kk-ai-prompt-tray', 'aria-label': 'Anexos', hidden: true });
  const cmdMenu = h('div', { class: 'kk-ai-prompt-menu kk-ai-prompt-cmds', hidden: true });
  const sendBtn = h('button', { type: 'button', class: 'kk-ai-prompt-send', disabled: true }, h('span', { class: 'go' }, ICONS.up()), h('span', { class: 'stop' }, h('i', { class: 'sq' })));
  const fileIn = h('input', { type: 'file', multiple: true, 'aria-label': 'Anexar arquivos' });
  const attach = h('label', { class: 'kk-ai-prompt-attach', title: 'Anexe arquivos, ou solte e cole aqui' }, fileIn, ICONS.plus());
  const dropMsg = h('div', { class: 'kk-ai-prompt-drop', 'aria-hidden': 'true' }, 'Solte os arquivos para anexar');
  const card = h('div', { class: 'kk-ai-prompt-card' });

  // Menus suspensos que abrem para cima (o prompt fica no rodapé de um chat).
  const mkDropdown = (btn, title, build) => {
    const panel = h('div', { class: 'kk-ai-prompt-menu', role: 'menu', hidden: true });
    const wrap = h('div', btn, panel);
    btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
    const close = (focus) => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); };
    const open = () => { panel.replaceChildren(h('div', { class: 'ttl' }, title), ...build(close)); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); (panel.querySelector('[aria-checked=true]') || panel.querySelector('button'))?.focus(); };
    btn.addEventListener('click', () => (panel.hidden ? open() : close()));
    wrap.addEventListener('keydown', (e) => {
      if (panel.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
      const it = [...panel.querySelectorAll('button')], i = it.indexOf(document.activeElement), d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (d) { e.preventDefault(); it[(i + d + it.length) % it.length].focus(); }
    });
    const doc = (e) => { if (!panel.hidden && !wrap.contains(e.target)) close(); };
    document.addEventListener('pointerdown', doc, true); dis(() => document.removeEventListener('pointerdown', doc, true));
    return { wrap, close };
  };
  const bars = (n, lvl) => h('span', { class: 'kk-ai-prompt-bars', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('i', { class: i <= lvl ? 'on' : '', style: `height:${((i + 1) / n) * 100}%` })));

  const modelBtn = h('button', { type: 'button', class: 'kk-ai-prompt-ghost' });
  const effortBtn = h('button', { type: 'button', class: 'kk-ai-prompt-ghost' });
  const pickModel = (m) => { effort = carry(cur(), m, effort); model = m.name; paint(); };
  const modelDD = mkDropdown(modelBtn, 'Modelo', (close) => MODELS.map((m) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(m.name === model), class: 'kk-ai-prompt-item', onclick: () => { pickModel(m); close(true); } },
    h('span', { class: 'ic' }, ICONS.spark()), h('span', { class: 't' }, h('b', m.name), h('small', m.description)), (() => { const c = ICONS.check(); c.setAttribute('class', 'ck'); return c; })())));
  const effortDD = mkDropdown(effortBtn, 'Esforço', (close) => [...efforts()].reverse().map((e) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(e === effort), class: 'kk-ai-prompt-item', onclick: () => { effort = e; paint(); close(true); } },
    bars(efforts().length, efforts().indexOf(e)), h('span', { class: 't' }, h('b', e), h('small', HINTS[e] || '')), (() => { const c = ICONS.check(); c.setAttribute('class', 'ck'); return c; })())));

  const banner = h('div', { class: 'kk-ai-prompt-promo' }, ICONS.spark(), h('p', 'Neva 1.2 está liberado para testar neste fim de semana'));
  const promoBtn = h('button', { type: 'button' }); banner.append(promoBtn);
  promoBtn.addEventListener('click', () => { pickModel(MODELS[1]); field.focus(); });

  const hasText = () => field.value.trim().length > 0;
  const canSend = () => hasText() && !busy;
  const grow = () => { field.style.height = '56px'; field.style.height = Math.min(200, Math.max(56, field.scrollHeight)) + 'px'; };
  // "/" no começo abre o menu; o texto depois dele filtra.
  const slashQuery = () => (!command && field.value.startsWith('/') && !/\s/.test(field.value) ? field.value.slice(1).toLowerCase() : null);
  const matches = () => { const q = slashQuery(); return q === null ? [] : COMMANDS.filter((c) => c.label.toLowerCase().includes(q)); };

  function paintTray() {
    tray.hidden = !command && !files.length;
    tray.replaceChildren(...[
      command && h('li', { class: 'kk-ai-prompt-chip cmd' }, h('span', { 'aria-hidden': 'true', style: 'opacity:.6' }, '/'), command.label, h('button', { type: 'button', class: 'kk-ai-prompt-rm', 'aria-label': `Remover comando ${command.label}`, onclick: () => { command = null; paintTray(); field.focus(); } }, ICONS.x())),
      ...files.map((f) => h('li', { class: 'kk-ai-prompt-chip' },
        h('span', { class: 'th' }, f.url ? h('img', { alt: '', src: f.url }) : ICONS.file()),
        h('span', { class: 'nm' }, h('b', { title: f.file.name }, f.file.name), h('span', size(f.file.size))),
        h('button', { type: 'button', class: 'kk-ai-prompt-rm', 'aria-label': `Remover ${f.file.name}`, onclick: () => { if (f.url) URL.revokeObjectURL(f.url); files = files.filter((x) => x !== f); paintTray(); field.focus(); } }, ICONS.x())))].filter(Boolean));
  }
  function paintMenu() {
    const ms = matches(), open = ms.length > 0 && !menuDismissed;
    cmdMenu.hidden = !open; field.setAttribute('aria-expanded', String(open));
    if (!open) { field.removeAttribute('aria-activedescendant'); return; }
    actIdx = Math.min(actIdx, ms.length - 1); const q = slashQuery();
    cmdMenu.replaceChildren(h('div', { role: 'listbox', 'aria-label': 'Comandos' }, ms.map((c, i) => {
      const at = q ? c.label.toLowerCase().indexOf(q) : -1;
      const lab = at < 0 ? [c.label] : [c.label.slice(0, at), h('span', { class: 'm' }, c.label.slice(at, at + q.length)), c.label.slice(at + q.length)];
      const ic = ICONS[c.icon](); ic.setAttribute('class', 'ic');
      return h('div', { role: 'option', id: 'kk-ap-o-' + c.id, 'aria-selected': String(i === actIdx), class: 'kk-ai-prompt-item' + (i === actIdx ? ' act' : ''), onmousedown: (e) => e.preventDefault(), onclick: () => pickCommand(c), onpointermove: () => { if (actIdx !== i) { actIdx = i; paintMenu(); } } },
        ic, h('span', { class: 't' }, h('b', lab), h('small', c.description)));
    })), h('div', { class: 'hint' }, h('span', h('kbd', '↑'), ' ', h('kbd', '↓'), ' mover'), h('span', h('kbd', '↵'), ' escolher'), h('span', h('kbd', 'esc'), ' fechar')));
    field.setAttribute('aria-activedescendant', 'kk-ap-o-' + ms[actIdx].id);
  }
  function paintSend() {
    const on = busy || canSend();
    sendBtn.disabled = !on; sendBtn.classList.toggle('on', on); sendBtn.classList.toggle('busy', busy);
    sendBtn.setAttribute('aria-label', busy ? 'Parar resposta' : 'Enviar mensagem'); sendBtn.title = busy ? 'Parar (Esc)' : 'Enviar (Enter)';
  }
  function paint() {
    modelBtn.replaceChildren(h('span', { class: 'sp' }, ICONS.spark()), h('b', model), ICONS.chev());
    modelBtn.setAttribute('aria-label', `Modelo: ${model}. Alterar`);
    const es = efforts();
    effortBtn.hidden = !es.length;
    if (es.length) { effortBtn.replaceChildren(bars(es.length, Math.max(0, es.indexOf(effort))), h('span', { class: 'kk-ai-prompt-effort-n' }, effort)); effortBtn.setAttribute('aria-label', `Esforço: ${effort}. Alterar`); }
    const inUse = model === MODELS[1].name; promoBtn.disabled = inUse; promoBtn.textContent = inUse ? 'Em uso' : 'Testar';
    paintTray(); paintMenu(); paintSend();
  }
  function pickCommand(c) { command = c; field.value = ''; actIdx = 0; grow(); paintTray(); paintMenu(); paintSend(); field.focus(); }

  const wait = (ms, signal) => new Promise((res) => { const id = setTimeout(res, ms); signal.addEventListener('abort', () => { clearTimeout(id); res(); }); });
  async function submit() {
    if (!canSend()) return;
    const text = field.value.trim(), cmd = command, sent = files; abort = new AbortController(); const my = abort;
    lastSent = field.value; field.value = ''; files.forEach((f) => f.url && URL.revokeObjectURL(f.url)); files = []; command = null; grow();
    const info = [cmd && `/${cmd.label}`, sent.length && `${sent.length} arquivo${sent.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
    const me = addMsg('me', text); if (info) me.prepend(h('small', info));
    busy = true; paint();
    const typing = addMsg('ia', h('span', { class: 'kk-ai-prompt-dots', 'aria-label': 'Respondendo' }, h('i'), h('i'), h('i')));
    await wait(model === 'Neva 1.0' ? 900 : 1500 + (efforts().indexOf(effort) + 1) * 400, my.signal);
    if (my.signal.aborted) { typing.textContent = 'Resposta interrompida.'; typing.style.opacity = '.7'; }
    else {
      const full = cmd ? cmd.reply : sent.length ? `Recebi ${sent.length === 1 ? sent[0].file.name : sent.length + ' arquivos'}. ${REPLIES[0]}` : REPLIES[(text.length + uid++) % REPLIES.length];
      typing.textContent = '';
      // Escreve aos poucos, como a resposta de verdade chegaria; sem movimento se o usuário pediu menos animação.
      if (reduced()) typing.textContent = full;
      else for (let i = 0; i < full.length && !my.signal.aborted; i += 3) { typing.textContent = full.slice(0, i + 3); thread.scrollTop = thread.scrollHeight; await wait(18, my.signal); }
      if (my.signal.aborted) typing.textContent += ' …interrompida.';
    }
    if (abort === my) { abort = null; busy = false; paint(); }
  }
  function stop() { abort?.abort(); abort = null; busy = false; paint(); field.focus(); }

  field.addEventListener('input', () => { menuDismissed = false; actIdx = 0; grow(); paintMenu(); paintSend(); });
  field.addEventListener('focus', () => { menuDismissed = false; paintMenu(); });
  field.addEventListener('blur', () => { menuDismissed = true; paintMenu(); });
  field.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const ms = matches();
    if (ms.length && !menuDismissed) {
      const st = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (st) { e.preventDefault(); actIdx = (actIdx + st + ms.length) % ms.length; paintMenu(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickCommand(ms[actIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); menuDismissed = true; paintMenu(); return; }
    }
    if (field.value === '') {
      // ↑ num campo vazio traz a última mensagem de volta, como num terminal.
      if (e.key === 'ArrowUp' && lastSent) { e.preventDefault(); field.value = lastSent; grow(); paintSend(); field.setSelectionRange(lastSent.length, lastSent.length); return; }
      if (e.key === 'Backspace' && command) { e.preventDefault(); command = null; paintTray(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape' && busy) { e.preventDefault(); stop(); }
  });
  sendBtn.addEventListener('click', () => (busy ? stop() : submit()));

  const addFiles = (list) => {
    const arr = [...list]; if (!arr.length) return;
    files = files.concat(arr.map((file) => ({ file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null })));
    paintTray(); paintSend();
  };
  fileIn.addEventListener('change', () => { addFiles(fileIn.files); fileIn.value = ''; });
  field.addEventListener('paste', (e) => { if (e.clipboardData?.files?.length) { e.preventDefault(); addFiles(e.clipboardData.files); } });
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  card.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); card.classList.add('drop'); } });
  card.addEventListener('dragleave', (e) => { if (!card.contains(e.relatedTarget)) card.classList.remove('drop'); });
  card.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); card.classList.remove('drop'); addFiles(e.dataTransfer.files); });

  card.append(tray, h('label', { class: 'kk-ai-prompt-sr', for: field.id }, 'Mensagem'), cmdMenu, field,
    h('div', { class: 'kk-ai-prompt-bar' }, attach, modelDD.wrap, effortDD.wrap, h('span', { class: 'kk-ai-prompt-grow' }), sendBtn), dropMsg);
  stage.append(h('div', { class: 'kk-ai-prompt-root' }, thread, h('div', { class: 'kk-ai-prompt-outer' }, banner, card)));
  paint(); requestAnimationFrame(grow);

  return () => { abort?.abort(); files.forEach((f) => f.url && URL.revokeObjectURL(f.url)); dis.run(); stage.replaceChildren(); };
}
