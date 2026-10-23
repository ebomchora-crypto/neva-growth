// AI Input Search — porte em JS puro do componente "AI Input Search" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Campo de pergunta com menu de Ferramentas (pesquisar, investigar, rascunhar, calcular, raciocinar), cabeçalho da ferramenta com tecla "Trocar",
// modelo, tecla Perguntar/Parar e um rastro ao vivo que empilha o avatar de cada fonte lida. A busca é simulada: nenhuma fonte é acessada de verdade.
import { h, svg, ensureStyle, disposer, PALETTE } from '../kit.js';

const P = (d, cls) => svg('svg', { class: cls, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const IC = {
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
  scope: 'M10 10l-6 10M10 10l6 10M4 20h12M13 3l5 3-2 4-5-3z',
  image: 'M4 5h16v14H4zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM20 15l-5-5-9 9',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  chev: 'M6 9l6 6 6-6', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14', file: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5',
  enter: 'M20 5v7a3 3 0 01-3 3H4M9 10l-5 5 5 5',
};
// Cada ferramenta tem seu tom de azul (a marca da Neva não usa outras cores).
const TOOLS = [
  { id: 'browse', label: 'Pesquisar fontes', hint: 'Responde com fontes que você pode conferir', icon: 'globe', color: PALETTE.ice500, activity: 'Pesquisando na web', placeholder: 'Pesquise algo', reads: true },
  { id: 'investigate', label: 'Investigar', hint: 'Lê bastante, leva alguns minutos', icon: 'scope', color: PALETTE.ice700, activity: 'Investigando', placeholder: 'O que devo aprofundar?', reads: true, limit: 3 },
  { id: 'visual', label: 'Rascunhar um visual', hint: 'Diagramas, mockups e capas', icon: 'image', color: PALETTE.ice600, activity: 'Esboçando o visual', placeholder: 'Descreva o que desenhar' },
  { id: 'code', label: 'Rodar um cálculo', hint: 'Faz as contas num ambiente isolado', icon: 'code', color: PALETTE.ice800, activity: 'Fazendo o cálculo', placeholder: 'O que o cálculo deve resolver?' },
  { id: 'reason', label: 'Raciocinar com calma', hint: 'Respostas mais lentas e cuidadosas', icon: 'bulb', color: PALETTE.ice400, activity: 'Pensando a respeito', placeholder: 'Pergunte algo difícil' },
];
const MODELS = ['Neva 1.5', 'Neva 1.2', 'Neva 1.0'];
const SOURCES = [
  ['sebrae.com.br', 'Como emitir nota fiscal de serviço', PALETTE.ice700], ['gov.br', 'Portal do Empreendedor: obrigações do MEI', PALETTE.ice900], ['receita.fazenda.gov.br', 'Emissão de nota fiscal de serviço', PALETTE.ice800],
  ['contabilizei.com.br', 'Nota fiscal: passo a passo para pequenas empresas', PALETTE.ice600], ['ibge.gov.br', 'Pequenos negócios em números', PALETTE.ice500], ['bcb.gov.br', 'Pix para empresas: regras e limites', PALETTE.ice700],
  ['abrasel.com.br', 'Guia de gestão para bares e restaurantes', PALETTE.ice600], ['endeavor.org.br', 'Fluxo de caixa: por onde começar', PALETTE.ice800], ['fgv.br', 'Índice de confiança do pequeno empresário', PALETTE.ice900],
  ['sebraeatende.com', 'Calendário de impostos do MEI', PALETTE.ice500], ['nuvemfiscal.com.br', 'Integração de notas fiscais por API', PALETTE.ice600], ['cnae.ibge.gov.br', 'Consulta de atividades econômicas', PALETTE.ice700],
];
const ANSWERS = {
  browse: 'Para emitir a nota de serviço como MEI, acesse o portal da prefeitura, cadastre o CNPJ e preencha o serviço prestado. As fontes ao lado explicam cada passo.',
  investigate: 'Depois de ler 12 fontes: a emissão varia por cidade, mas o caminho é o mesmo. O MEI emite pelo portal municipal e guarda as notas por cinco anos.',
  visual: 'Rascunho pronto: um fluxo em quatro quadros (pedido, nota, pagamento e entrega) com cores da sua marca.',
  code: 'Cálculo feito: com 128 pedidos e ticket médio de R$ 214, a receita do mês é R$ 27.392,00.',
  reason: 'Pensando com calma: comece pelo caixa dos próximos 30 dias, depois priorize o que vence primeiro e só então renegocie prazos.',
  none: 'Sem ferramenta, o modelo responde sozinho, com base no que já sabe. Escolha uma ferramenta para ver as fontes.',
};
const STACK_MAX = 5;
const hue = (d) => { let n = 0; for (const c of d) n = (n * 31 + c.charCodeAt(0)) % 360; return n; };
const secs = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')}s`;

const CSS = `
.kk-ai-input-search-root{width:100%;min-width:0;box-sizing:border-box;container-type:inline-size;min-height:380px;font-family:inherit;color:var(--ink,#0e2236)}
.kk-ai-input-search-frame{position:relative;min-width:0;border-radius:22px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line};padding:4px;cursor:text}
.kk-ai-input-search-band{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 6px 0 12px;font-size:12px;overflow:hidden}
.kk-ai-input-search-band .sw{min-width:0;flex:1;display:flex;align-items:center;gap:8px;animation:kk-ai-input-search-in .2s cubic-bezier(.23,1,.32,1) both}
.kk-ai-input-search-band .sw svg{width:14px;height:14px;flex:none}
.kk-ai-input-search-band .tx{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${PALETTE.mut}}
.kk-ai-input-search-band .runs{display:flex;align-items:center;gap:6px;flex:none;color:#7d97b3;font-variant-numeric:tabular-nums}
@keyframes kk-ai-input-search-in{from{opacity:0;filter:blur(2px);transform:translateY(6px)}}
.kk-ai-input-search-key{display:flex;align-items:center;gap:6px;flex:none;height:28px;padding:0 8px;border:0;border-radius:8px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line};font:inherit;font-size:11px;font-weight:600;color:${PALETTE.ink};cursor:pointer}
.kk-ai-input-search-key:hover{background:${PALETTE.ice50}}
.kk-ai-input-search-key kbd{display:grid;place-items:center;width:16px;height:16px;border-radius:4px;background:${PALETTE.ice100};font:inherit;font-size:11px;font-weight:400;color:${PALETTE.mut}}
.kk-ai-input-search-key svg{width:12px;height:12px;opacity:.5;transition:transform .2s}.kk-ai-input-search-key[aria-expanded=true] svg{transform:rotate(180deg)}
.kk-ai-input-search-frame button:focus-visible,.kk-ai-input-search-frame input:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-ai-input-search-card{display:flex;flex-direction:column;border-radius:18px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line},0 6px 20px -10px rgba(15,53,96,.25);transition:box-shadow .15s}
.kk-ai-input-search-card:focus-within{box-shadow:0 0 0 2px ${PALETTE.ice500},0 6px 20px -10px rgba(15,53,96,.25)}
.kk-ai-input-search-files{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:12px 12px 0;list-style:none}
.kk-ai-input-search-files li{display:flex;align-items:center;gap:6px;max-width:192px;height:36px;padding:0 4px 0 8px;border-radius:10px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line};font-size:12px;color:${PALETTE.mut};animation:kk-ai-input-search-in .18s both}
.kk-ai-input-search-files svg{width:14px;height:14px;flex:none}.kk-ai-input-search-files span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-input-search-files button{width:28px;height:28px;border:0;border-radius:6px;background:none;color:#7d97b3;display:grid;place-items:center;cursor:pointer;flex:none}.kk-ai-input-search-files button:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-ai-input-search-field{width:100%;box-sizing:border-box;min-height:56px;max-height:200px;resize:none;border:0;outline:0;background:transparent;padding:14px 16px 4px;font:inherit;font-size:16px;line-height:1.5;color:inherit}
.kk-ai-input-search-field::placeholder{color:#7d97b3}
.kk-ai-input-search-bar{display:flex;align-items:center;gap:4px;padding:4px 10px 10px}
.kk-ai-input-search-attach{position:relative;width:36px;height:36px;flex:none;border:0;border-radius:50%;background:none;box-shadow:inset 0 0 0 1px ${PALETTE.line};color:${PALETTE.mut};display:grid;place-items:center;cursor:pointer}
.kk-ai-input-search-attach:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-ai-input-search-attach svg{width:16px;height:16px}
.kk-ai-input-search-ghost{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 10px;border:0;border-radius:999px;background:none;font:inherit;font-size:12px;color:${PALETTE.mut};cursor:pointer;white-space:nowrap}
.kk-ai-input-search-ghost:hover,.kk-ai-input-search-ghost[aria-expanded=true]{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-ai-input-search-ghost svg{width:14px;height:14px;flex:none}.kk-ai-input-search-ghost .cv{width:12px;height:12px;opacity:.5;transition:transform .2s}.kk-ai-input-search-ghost[aria-expanded=true] .cv{transform:rotate(180deg)}
.kk-ai-input-search-pill{display:flex;align-items:center;flex:0 1 auto;min-width:0;overflow:hidden;border-radius:999px;transition:width .25s cubic-bezier(.23,1,.32,1)}
.kk-ai-input-search-pill .in{display:flex;align-items:center;width:max-content}
.kk-ai-input-search-pill .lb{max-width:104px;overflow:hidden;text-overflow:ellipsis}
.kk-ai-input-search-pill .tl svg:first-child{color:var(--tool,currentColor)}.kk-ai-input-search-pill.has .tl{font-weight:600;color:${PALETTE.ink}}
.kk-ai-input-search-rm{width:28px;height:28px;flex:none;border:0;border-radius:50%;background:none;color:#7d97b3;display:grid;place-items:center;cursor:pointer}.kk-ai-input-search-rm:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-ai-input-search-rm svg{width:14px;height:14px}
.kk-ai-input-search-grow{flex:1;min-width:0}
.kk-ai-input-search-ask{height:36px;flex:none;border:0;border-radius:10px;overflow:hidden;background:${PALETTE.ice100};color:#8aa5c0;cursor:pointer;transition:width .2s cubic-bezier(.23,1,.32,1),background .15s,color .15s}
.kk-ai-input-search-ask.on{background:${PALETTE.ice800};color:#fff}.kk-ai-input-search-ask.on:hover{background:${PALETTE.ice900}}.kk-ai-input-search-ask:disabled{cursor:default}
.kk-ai-input-search-ask .in{display:flex;align-items:center;gap:6px;width:max-content;padding:0 12px;height:100%;font-size:12px;font-weight:600}
.kk-ai-input-search-ask svg{width:16px;height:16px;opacity:.7}.kk-ai-input-search-ask .sq{width:8px;height:8px;border-radius:2px;background:currentColor}
.kk-ai-input-search-menu{position:absolute;z-index:30;top:calc(100% + 6px);left:0;width:288px;max-width:100%;box-sizing:border-box;padding:4px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line},0 14px 30px -10px rgba(15,53,96,.35);animation:kk-ai-input-search-pop .14s cubic-bezier(.23,1,.32,1) both;transform-origin:top left}
.kk-ai-input-search-menu.end{left:auto;right:0;width:176px;transform-origin:top right}.kk-ai-input-search-menu[hidden]{display:none}
@keyframes kk-ai-input-search-pop{from{opacity:0;transform:scale(.97) translateY(-4px)}}
.kk-ai-input-search-menu .ttl{display:flex;justify-content:space-between;padding:6px 8px 4px;font-size:11px;color:${PALETTE.mut}}
.kk-ai-input-search-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:4px 8px;border:0;border-radius:8px;background:none;font:inherit;text-align:left;color:inherit;cursor:pointer}
.kk-ai-input-search-opt:hover:not(:disabled),.kk-ai-input-search-opt:focus-visible{background:${PALETTE.ice100};outline:0}.kk-ai-input-search-opt:disabled{opacity:.5;cursor:default}
.kk-ai-input-search-opt>svg{width:16px;height:16px;flex:none;color:var(--tool,currentColor)}
.kk-ai-input-search-opt .t{min-width:0;flex:1}.kk-ai-input-search-opt .t b{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500}.kk-ai-input-search-opt .t small{display:block;font-size:11px;color:${PALETTE.mut};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-input-search-opt kbd{width:14px;text-align:center;font:inherit;font-size:11px;color:#8aa5c0}.kk-ai-input-search-opt .ck{width:14px;height:14px;color:${PALETTE.ink}}
.kk-ai-input-search-dots{display:flex;gap:2px}.kk-ai-input-search-dots i{width:6px;height:6px;border-radius:50%;background:${PALETTE.ice200}}.kk-ai-input-search-dots i.on{background:var(--tool,${PALETTE.ice600})}
.kk-ai-input-search-trace .row{display:flex;align-items:center;gap:10px;min-height:36px;padding:0 6px 0 12px;font-size:12px}
.kk-ai-input-search-stack{display:flex;align-items:center;flex:none}
.kk-ai-input-search-stack .av+.av{margin-left:-4px}
.kk-ai-input-search-av{flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#fff;font-weight:700;width:20px;height:20px;font-size:10px;box-shadow:0 0 0 2px ${PALETTE.ice50}}
.kk-ai-input-search-av.md{width:24px;height:24px;font-size:11px;box-shadow:0 0 0 1px ${PALETTE.line}}
.kk-ai-input-search-av.new{animation:kk-ai-input-search-in .2s both}
.kk-ai-input-search-empty{width:20px;height:20px;flex:none;border-radius:50%;border:1px dashed ${PALETTE.ice300}}
.kk-ai-input-search-toolav{width:20px;height:20px;flex:none;border-radius:50%;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line};color:var(--tool);display:grid;place-items:center}.kk-ai-input-search-toolav svg{width:12px;height:12px}
.kk-ai-input-search-trace .lb{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${PALETTE.mut}}
.kk-ai-input-search-trace .lb.fin{color:${PALETTE.ink}}
.kk-ai-input-search-trace .el{flex:none;color:#8aa5c0;font-variant-numeric:tabular-nums}
.kk-ai-input-search-list{list-style:none;margin:0;padding:4px 0;max-height:210px;overflow-y:auto;border-radius:18px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line}}
.kk-ai-input-search-list li{display:flex;align-items:center;gap:10px;min-height:36px;margin:0 4px;padding:0 10px;border-radius:10px;font-size:12px;animation:kk-ai-input-search-in .2s both}
.kk-ai-input-search-list li:hover{background:${PALETTE.ice50}}
.kk-ai-input-search-list .t{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kk-ai-input-search-list .d{flex:none;color:#7d97b3}.kk-ai-input-search-list .n{flex:none;width:20px;text-align:right;color:#8aa5c0;font-size:11px;font-variant-numeric:tabular-nums}
@media (max-width:360px){.kk-ai-input-search-list .d{display:none}}
.kk-ai-input-search-ans{margin:4px 4px 4px;padding:10px 12px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line};font-size:13px;line-height:1.5;color:${PALETTE.ink}}
.kk-ai-input-search-ans small{display:block;margin-bottom:2px;font-size:11px;color:${PALETTE.mut}}
.kk-ai-input-search-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@container (max-width:400px){.kk-ai-input-search-pill .lb{max-width:52px}.kk-ai-input-search-ask .tx{display:none}.kk-ai-input-search-ask .in{padding:0 10px}.kk-ai-input-search-ghost{padding:0 6px}.kk-ai-input-search-bar{padding:4px 6px 8px;gap:2px}.kk-ai-input-search-key{padding:0 6px}}
@media (prefers-reduced-motion:reduce){.kk-ai-input-search-pill,.kk-ai-input-search-ask,.kk-ai-input-search-band .sw,.kk-ai-input-search-menu,.kk-ai-input-search-list li,.kk-ai-input-search-av.new,.kk-ai-input-search-files li{transition:none;animation:none}}
`;

export default function mount(stage) {
  ensureStyle('ai-input-search', CSS);
  const dis = disposer();
  let toolId = 'browse', model = 'Neva 1.2', files = [], phase = 'idle', runTool = null, sources = [], elapsed = 0, expanded = false, menuOpen = false, modelOpen = false, abort = null, clock = 0, runs = { investigate: 3 }, answer = '';
  const find = (id) => TOOLS.find((t) => t.id === id) || null;
  const uid = Math.random().toString(36).slice(2, 6);

  const field = h('textarea', { class: 'kk-ai-input-search-field', rows: 1, 'aria-label': 'Pergunta' });
  const band = h('div', { class: 'kk-ai-input-search-band' });
  const filesEl = h('ul', { class: 'kk-ai-input-search-files', 'aria-label': 'Arquivos anexados', hidden: true });
  const fileIn = h('input', { type: 'file', multiple: true, tabindex: -1, hidden: true });
  const attach = h('button', { type: 'button', class: 'kk-ai-input-search-attach', 'aria-label': 'Anexar arquivos', onclick: () => fileIn.click() }, P(IC.plus));
  const pillBtn = h('button', { type: 'button', class: 'kk-ai-input-search-ghost tl', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
  const rm = h('button', { type: 'button', class: 'kk-ai-input-search-rm' }, P(IC.x));
  const pillIn = h('span', { class: 'in' }, pillBtn, rm);
  const pill = h('div', { class: 'kk-ai-input-search-pill' }, pillIn);
  const toolMenu = h('div', { class: 'kk-ai-input-search-menu', role: 'menu', hidden: true });
  const modelBtn = h('button', { type: 'button', class: 'kk-ai-input-search-ghost', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
  const modelMenu = h('div', { class: 'kk-ai-input-search-menu end', role: 'menu', hidden: true });
  const askIn = h('span', { class: 'in' });
  const ask = h('button', { type: 'button', class: 'kk-ai-input-search-ask' }, askIn);
  const traceBox = h('div', { class: 'kk-ai-input-search-trace', hidden: true });
  const live = h('output', { class: 'kk-ai-input-search-sr', 'aria-live': 'polite' });
  const bar = h('div', { class: 'kk-ai-input-search-bar' }, attach, fileIn, h('div', { style: 'position:relative;display:flex;min-width:0' }, pill, toolMenu), h('span', { class: 'kk-ai-input-search-grow' }), h('div', { style: 'position:relative' }, modelBtn, modelMenu), ask);
  const card = h('div', { class: 'kk-ai-input-search-card' }, filesEl, field, bar);
  const frame = h('div', { class: 'kk-ai-input-search-frame' }, band, card, traceBox);
  const root = h('div', { class: 'kk-ai-input-search-root' }, frame, live);
  stage.append(root);

  // Larguras que deslizam até o novo conteúdo em vez de dar um salto.
  const fit = (wrap, inner) => { const ro = new ResizeObserver(() => { wrap.style.width = inner.getBoundingClientRect().width + 'px'; }); ro.observe(inner); dis(() => ro.disconnect()); };
  fit(pill, pillIn); fit(ask, askIn);

  const avatar = (s, cls = '', fresh = false) => {
    const name = s[0].replace(/^www\./, '');
    return h('span', { class: `kk-ai-input-search-av ${cls}${fresh ? ' new' : ''}`, 'aria-hidden': 'true', style: `background:${s[2] || `hsl(${hue(name) % 40 + 200} 55% 45%)`}` }, name.charAt(0).toUpperCase());
  };
  const dots = (left, limit) => h('span', { class: 'kk-ai-input-search-dots', title: `${left} restantes hoje` }, Array.from({ length: limit }, (_, i) => h('i', { class: i < left ? 'on' : '' })));
  const tool = () => find(toolId);
  const running = () => phase === 'working';
  const canSend = () => field.value.trim().length > 0 && !running();
  const grow = () => { field.style.height = '56px'; field.style.height = Math.min(200, Math.max(56, field.scrollHeight)) + 'px'; };

  function paintBand() {
    const t = tool(), left = t ? runs[t.id] : undefined;
    const keyBtn = h('button', { type: 'button', class: 'kk-ai-input-search-key', 'aria-haspopup': 'menu', 'aria-expanded': String(menuOpen), onclick: (e) => { e.stopPropagation(); setMenu(!menuOpen); } }, t ? 'Trocar' : 'Escolher ferramenta', h('kbd', '/'));
    band.style.setProperty('--tool', t?.color || 'currentColor');
    band.replaceChildren(h('span', { class: 'sw' }, P(IC[t?.icon || 'sliders'], ''), h('span', { class: 'tx' }, t ? t.hint : 'Sem ferramenta, o modelo responde sozinho'),
      left !== undefined && t.limit ? h('span', { class: 'runs' }, dots(left, t.limit), `${left} restantes`) : null), keyBtn);
    band.firstChild.firstChild.style.color = t ? t.color : '#8aa5c0';
  }
  function paintPill() {
    const t = tool();
    pill.style.setProperty('--tool', t?.color || 'currentColor'); pill.classList.toggle('has', !!t);
    pillBtn.replaceChildren(P(IC[t?.icon || 'sliders']), h('span', { class: 'lb' }, t?.label || 'Ferramentas'), P(IC.chev, 'cv'));
    pillBtn.setAttribute('aria-label', t ? `Ferramenta: ${t.label}. Trocar` : 'Ferramentas'); pillBtn.setAttribute('aria-expanded', String(menuOpen));
    rm.hidden = !t; rm.setAttribute('aria-label', t ? `Remover ${t.label}` : '');
    field.placeholder = t?.placeholder || 'Pergunte qualquer coisa, ou digite / para ferramentas';
    field.style.caretColor = t ? t.color : '';
  }
  function paintMenus() {
    toolMenu.hidden = !menuOpen; modelMenu.hidden = !modelOpen;
    pillBtn.setAttribute('aria-expanded', String(menuOpen)); modelBtn.setAttribute('aria-expanded', String(modelOpen));
    if (menuOpen) toolMenu.replaceChildren(h('div', { class: 'ttl' }, h('span', 'Ferramentas'), h('span', `Tecle 1–${TOOLS.length}`)), ...TOOLS.map((t, i) => {
      const left = runs[t.id], spent = left !== undefined && left <= 0, sel = t.id === toolId;
      return h('button', { type: 'button', role: 'menuitemcheckbox', 'aria-checked': String(sel), disabled: spent, class: 'kk-ai-input-search-opt', style: `--tool:${t.color}`, onclick: () => { pick(sel ? null : t.id); setMenu(false, true); } },
        P(IC[t.icon]), h('span', { class: 't' }, h('b', t.label, t.limit ? dots(left, t.limit) : null), h('small', spent ? 'Sem usos hoje' : t.hint)), sel ? P(IC.check, 'ck') : h('kbd', i + 1));
    }));
    if (modelOpen) modelMenu.replaceChildren(...MODELS.map((m) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(m === model), class: 'kk-ai-input-search-opt', style: 'min-height:36px', onclick: () => { model = m; setModel(false, true); paintModel(); } },
      h('span', { class: 't' }, h('b', { style: m === model ? '' : `color:${PALETTE.mut}` }, m)), m === model ? P(IC.check, 'ck') : null)));
  }
  function paintModel() { modelBtn.replaceChildren(h('span', model), P(IC.chev, 'cv')); modelBtn.setAttribute('aria-label', `Modelo: ${model}. Trocar`); }
  function paintAsk() {
    const on = running() || canSend();
    ask.disabled = !on; ask.classList.toggle('on', on); ask.setAttribute('aria-label', running() ? 'Parar' : 'Perguntar');
    askIn.replaceChildren(...(running() ? [h('span', { class: 'tx' }, 'Parar'), h('i', { class: 'sq' })] : [h('span', { class: 'tx' }, 'Perguntar'), P(IC.enter)]));
  }
  function paintFiles() {
    filesEl.hidden = !files.length;
    filesEl.replaceChildren(...files.map((f) => h('li', P(IC.file), h('span', { title: f.name }, f.name), h('button', { type: 'button', 'aria-label': `Remover ${f.name}`, onclick: () => { files = files.filter((x) => x !== f); paintFiles(); field.focus(); } }, P(IC.x)))));
  }
  const label = () => {
    const n = sources.length, noun = n === 1 ? 'fonte' : 'fontes';
    if (phase === 'working') return n > 0 ? 'Lendo fontes' : runTool?.activity || 'Escrevendo a resposta';
    if (phase === 'stopped') return n > 0 ? `Parou após ${n} ${noun}` : 'Interrompido';
    return n > 0 ? `${n} ${noun} lida${n === 1 ? '' : 's'}` : 'Pronto';
  };
  let lastStackN = -1;
  function paintTrace() {
    traceBox.hidden = phase === 'idle'; if (phase === 'idle') return;
    const fin = phase !== 'working', canOpen = fin && sources.length > 0;
    const shown = sources.slice(-STACK_MAX);
    const lead = runTool?.reads || !runTool
      ? (shown.length ? h('span', { class: 'kk-ai-input-search-stack' }, shown.map((s, i) => h('span', { class: 'av' }, avatar(s, '', !fin && i === shown.length - 1 && sources.length !== lastStackN)))) : h('span', { class: 'kk-ai-input-search-empty' }))
      : h('span', { class: 'kk-ai-input-search-toolav', style: `--tool:${runTool.color}` }, P(IC[runTool.icon]));
    lastStackN = sources.length;
    const lb = h('span', { class: 'lb' + (fin ? ' fin' : '') }, label(), phase === 'working' && sources.length ? ` · ${sources.length}` : '');
    const key = canOpen ? h('button', { type: 'button', class: 'kk-ai-input-search-key', 'aria-expanded': String(expanded), 'aria-controls': 'kk-ais-l' + uid, onclick: (e) => { e.stopPropagation(); expanded = !expanded; paintTrace(); } }, expanded ? 'Ocultar' : 'Fontes', P(IC.chev)) : null;
    const list = expanded && sources.length ? h('ol', { class: 'kk-ai-input-search-list', id: 'kk-ais-l' + uid }, sources.map((s, i) => h('li', { style: `animation-delay:${Math.min(i, 8) * 30}ms` }, avatar(s, 'md'), h('span', { class: 't' }, s[1]), h('span', { class: 'd' }, s[0]), h('span', { class: 'n' }, i + 1)))) : null;
    const ans = phase === 'done' && answer ? h('div', { class: 'kk-ai-input-search-ans' }, h('small', 'Resposta simulada'), answer) : null;
    traceBox.replaceChildren(h('div', { class: 'row' }, lead, lb, h('span', { class: 'el' }, secs(elapsed)), key), list, ans);
  }
  const paintAll = () => { paintBand(); paintPill(); paintMenus(); paintAsk(); paintTrace(); };

  function setMenu(v, focusField) { menuOpen = v; if (v) modelOpen = false; paintMenus(); paintBand(); if (v) toolMenu.querySelector('[aria-checked=true]:not(:disabled), button:not(:disabled)')?.focus(); else if (focusField) field.focus(); }
  function setModel(v, focusField) { modelOpen = v; if (v) menuOpen = false; paintMenus(); if (v) modelMenu.querySelector('[aria-checked=true]')?.focus(); else if (focusField) field.focus(); }
  function pick(id) { toolId = id; paintBand(); paintPill(); field.focus(); }
  pillBtn.addEventListener('click', (e) => { e.stopPropagation(); setMenu(!menuOpen); });
  rm.addEventListener('click', (e) => { e.stopPropagation(); pick(null); });
  modelBtn.addEventListener('click', (e) => { e.stopPropagation(); setModel(!modelOpen); });
  // Fecha menus por clique fora ou Esc; setas e números navegam dentro deles.
  const onDoc = (e) => { if ((menuOpen || modelOpen) && !toolMenu.contains(e.target) && !modelMenu.contains(e.target) && !band.contains(e.target) && !pill.contains(e.target) && !modelBtn.contains(e.target)) { menuOpen = modelOpen = false; paintMenus(); paintBand(); } };
  document.addEventListener('pointerdown', onDoc); dis(() => document.removeEventListener('pointerdown', onDoc));
  root.addEventListener('keydown', (e) => {
    const m = menuOpen ? toolMenu : modelOpen ? modelMenu : null; if (!m) return;
    if (e.key === 'Escape') { e.preventDefault(); menuOpen = modelOpen = false; paintMenus(); paintBand(); field.focus(); return; }
    const items = [...m.querySelectorAll('button:not(:disabled)')], i = items.indexOf(document.activeElement), d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (d) { e.preventDefault(); items[(i + d + items.length) % items.length]?.focus(); return; }
    const t = menuOpen && TOOLS[Number(e.key) - 1];
    if (t && !(runs[t.id] <= 0)) { e.preventDefault(); pick(t.id === toolId ? null : t.id); setMenu(false, true); }
  });
  // Clicar na moldura foca o campo; os controles mantêm o próprio comportamento.
  frame.addEventListener('click', (e) => { if (!e.target.closest('button,[role=menu],input,li,ol')) field.focus(); });

  field.addEventListener('input', () => { grow(); paintAsk(); });
  field.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape' && running()) { e.preventDefault(); stop(); }
    else if (e.key === '/' && field.value === '') { e.preventDefault(); setMenu(true); }
    else if (e.key === 'Backspace' && field.value === '' && toolId) { e.preventDefault(); pick(null); }
  });
  ask.addEventListener('click', () => (running() ? stop() : submit()));
  fileIn.addEventListener('change', () => { files = files.concat([...fileIn.files]); fileIn.value = ''; paintFiles(); });

  const wait = (ms, signal) => new Promise((res, rej) => { const id = setTimeout(res, ms); signal.addEventListener('abort', () => { clearTimeout(id); rej(new DOMException('Stopped', 'AbortError')); }); });
  async function run(t, signal, onSource) {
    await wait(500, signal);
    if (!t?.reads) { await wait(1600, signal); return; }
    const deep = (t.limit || 0) > 0;
    for (const s of SOURCES.slice(0, deep ? 12 : 5)) { await wait(deep ? 200 : 260, signal); onSource(s); }
    await wait(700, signal);
  }
  async function submit() {
    if (!canSend()) return;
    const t = tool(); abort = new AbortController(); const my = abort;
    field.value = ''; files = []; grow(); paintFiles();
    sources = []; elapsed = 0; expanded = false; runTool = t; answer = ''; phase = 'working'; lastStackN = -1;
    // Ferramenta com limite gasta um uso; ao zerar, sai do campo.
    if (t && runs[t.id] !== undefined) { runs[t.id] -= 1; if (runs[t.id] <= 0) toolId = null; }
    const t0 = performance.now(); clearInterval(clock); clock = setInterval(() => { elapsed = performance.now() - t0; paintTrace(); }, 100);
    live.textContent = t?.activity || 'Trabalhando.'; paintAll();
    try {
      await run(t, my.signal, (s) => { if (!my.signal.aborted) { sources = [...sources.filter((x) => x[0] !== s[0]), s]; paintTrace(); } });
      if (!my.signal.aborted) { phase = 'done'; answer = ANSWERS[t?.id || 'none']; live.textContent = 'Pronto.'; }
    } catch { /* interrompido: stop() já ajustou a fase */ }
    finally { if (abort === my) { abort = null; clearInterval(clock); paintAll(); } }
  }
  function stop() { abort?.abort(); abort = null; clearInterval(clock); phase = 'stopped'; live.textContent = 'Interrompido.'; paintAll(); field.focus(); }

  paintModel(); paintAll(); requestAnimationFrame(grow);
  return () => { abort?.abort(); clearInterval(clock); dis.run(); stage.replaceChildren(); };
}
