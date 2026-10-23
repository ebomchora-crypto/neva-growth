// AI Inline Citations — porte em JS puro do componente "AI Inline Citations" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Resposta com chips de fonte ao lado de cada afirmação: uma única prévia desliza entre os chips e destaca a frase que ela sustenta.
// As fontes são documentos de exemplo da própria empresa; clicar numa fonte da lista abre o trecho e permite copiar a referência.
import { h, svg, ensureStyle, disposer, reduced, PALETTE } from '../kit.js';
import { copyText } from '../../ui.js';

const OPEN_DELAY = 120, CLOSE_DELAY = 90, WARM = 400, CARD_W = 288;
const SOURCES = [
  { id: 'vendas', title: 'Relatório de vendas de outubro', site: 'Financeiro', ref: 'financeiro/vendas-2026-10.pdf', snippet: 'Foram 128 pedidos pagos no mês, somando R$ 41.905,00. O ticket médio subiu de R$ 187 para R$ 214 em relação a setembro.' },
  { id: 'nps', title: 'Pesquisa de satisfação (NPS)', site: 'Clientes', ref: 'clientes/nps-3t-2026.pdf', snippet: 'A nota média foi 8,7. Clientes que receberam resposta em menos de 1 hora recompraram 2,1 vezes mais.' },
  { id: 'recompra', title: 'Painel de recompra', site: 'Marketing', ref: 'marketing/recompra.xlsx', snippet: 'A taxa de recompra em 60 dias passou de 21% para 30% depois da campanha de reativação por e-mail.' },
  { id: 'estoque', title: 'Planilha de estoque', site: 'Operações', ref: 'operacoes/estoque.xlsx', snippet: 'Os 12 itens da linha Premium têm cobertura de 9 dias. Reposição prevista para a próxima terça-feira.' },
];
const PARTS = [
  { text: 'O mês fechou bem. ' },
  { text: 'As vendas chegaram a R$ 41,9 mil em 128 pedidos, e o ticket médio subiu para R$ 214.', cite: ['vendas'] },
  { text: ' ' },
  { text: 'A campanha de reativação elevou a recompra em 60 dias de 21% para 30%, e quem foi atendido em até uma hora comprou de novo com mais frequência.', cite: ['recompra', 'nps'] },
  { text: ' ' },
  { text: 'O ponto de atenção é a linha Premium, que tem estoque para apenas 9 dias', cite: ['estoque'] },
  { text: ', então vale antecipar o pedido de reposição antes do próximo envio.' },
];
const initial = (s) => s.site.charAt(0);

const CSS = `
.kk-ai-citations-root{position:relative;width:100%;font-family:inherit;color:var(--ink,#0e2236)}
.kk-ai-citations-text{margin:0;font-size:15px;line-height:1.9}
.kk-ai-citations-claim{border-radius:3px;text-decoration:underline;text-decoration-color:transparent;text-decoration-thickness:1px;text-underline-offset:4px;transition:background-color .15s,text-decoration-color .15s}
.kk-ai-citations-claim.on{background:${PALETTE.ice100};text-decoration-color:${PALETTE.ice400}}
.kk-ai-citations-chip{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 6px 0 2px;margin:0 1px;border:0;border-radius:999px;vertical-align:middle;transform:translateY(-1px);background:${PALETTE.ice100};color:${PALETTE.ink};font:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:background .15s,color .15s;position:relative}
.kk-ai-citations-chip::after{content:'';position:absolute;inset:-7px -2px}
.kk-ai-citations-chip:hover{background:${PALETTE.ice200}}.kk-ai-citations-chip.on{background:${PALETTE.ice800};color:#fff}
.kk-ai-citations-chip:focus-visible,.kk-ai-citations-toggle:focus-visible,.kk-ai-citations-src:focus-visible,.kk-ai-citations-copy:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-ai-citations-chip small{opacity:.65;font-size:11px}
.kk-ai-citations-mono{flex:none;width:16px;height:16px;border-radius:50%;background:${PALETTE.ice300};color:${PALETTE.ice900};display:grid;place-items:center;font-size:9px;font-weight:700;text-transform:uppercase}
.kk-ai-citations-mono.sq{border-radius:4px}.kk-ai-citations-mono.lg{width:20px;height:20px;font-size:10px;box-shadow:0 0 0 2px #fff}
.kk-ai-citations-pv{position:absolute;top:0;left:0;z-index:10;pointer-events:none;opacity:0;transition:opacity .14s}
.kk-ai-citations-pv.on{opacity:1}.kk-ai-citations-pv.glide{transition:opacity .14s,transform .22s cubic-bezier(.23,1,.32,1)}
.kk-ai-citations-card{padding:4px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line},0 12px 26px -10px rgba(15,53,96,.4)}
.kk-ai-citations-card>div{padding:10px;border-radius:8px;animation:kk-ai-citations-in .16s both}
@keyframes kk-ai-citations-in{from{opacity:0;filter:blur(2px)}}
.kk-ai-citations-card .top{display:flex;align-items:center;gap:6px;font-size:12px;color:${PALETTE.mut}}.kk-ai-citations-card .top b{margin-left:auto;font-weight:400;font-variant-numeric:tabular-nums}
.kk-ai-citations-card h4{margin:6px 0 0;font-size:14px;font-weight:600;line-height:1.3}
.kk-ai-citations-card p{margin:4px 0 0;font-size:12px;line-height:1.5;color:${PALETTE.mut}}
.kk-ai-citations-toggle{display:flex;align-items:center;gap:8px;min-height:36px;margin-top:12px;padding:0 10px 0 4px;border:0;border-radius:999px;background:none;font:inherit;font-size:12px;color:${PALETTE.mut};cursor:pointer}
.kk-ai-citations-toggle:hover{background:${PALETTE.ice100}}
.kk-ai-citations-stack{display:flex}.kk-ai-citations-stack .kk-ai-citations-mono+.kk-ai-citations-mono{margin-left:-4px}
.kk-ai-citations-toggle svg{width:14px;height:14px;transition:transform .2s cubic-bezier(.23,1,.32,1)}.kk-ai-citations-toggle[aria-expanded=true] svg{transform:rotate(180deg)}
.kk-ai-citations-list{list-style:none;margin:0;padding:0;overflow:hidden;transition:max-height .25s cubic-bezier(.23,1,.32,1),opacity .2s}
.kk-ai-citations-list li{padding-top:4px}
.kk-ai-citations-src{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:4px 8px;border:0;border-radius:10px;background:none;font:inherit;text-align:left;color:inherit;cursor:pointer}
.kk-ai-citations-src:hover,.kk-ai-citations-src[aria-expanded=true]{background:${PALETTE.ice50}}
.kk-ai-citations-src .n{width:12px;text-align:right;font-size:12px;color:#8aa5c0;font-variant-numeric:tabular-nums;flex:none}
.kk-ai-citations-src .t{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
.kk-ai-citations-src .s{font-size:12px;color:#7d97b3;flex:none}
.kk-ai-citations-det{margin:2px 8px 4px 30px;padding:10px 12px;border-radius:10px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line};font-size:12px;line-height:1.5;color:${PALETTE.mut}}
.kk-ai-citations-det[hidden]{display:none}
.kk-ai-citations-det code{display:block;margin-top:6px;font:11px ui-monospace,monospace;color:${PALETTE.ink};overflow-wrap:anywhere}
.kk-ai-citations-copy{margin-top:8px;min-height:36px;padding:0 12px;border:1px solid ${PALETTE.line};border-radius:999px;background:#fff;font:inherit;font-size:12px;font-weight:600;color:${PALETTE.ink};cursor:pointer}.kk-ai-citations-copy:hover{background:${PALETTE.ice100}}
@media (prefers-reduced-motion:reduce){.kk-ai-citations-pv.glide,.kk-ai-citations-list,.kk-ai-citations-card>div{transition:none;animation:none}}
`;

export default function mount(stage) {
  ensureStyle('ai-citations', CSS);
  const dis = disposer();
  const byId = new Map(SOURCES.map((s) => [s.id, s]));
  const order = []; for (const p of PARTS) for (const id of p.cite || []) if (!order.includes(id)) order.push(id);
  const cited = order.map((id) => byId.get(id));
  const uid = Math.random().toString(36).slice(2, 7);
  let current = -1, linked = null, listOpen = false, openSrc = null, lastClosed = 0, openT = 0, closeT = 0;

  const mono = (s, cls = '') => h('span', { class: 'kk-ai-citations-mono ' + cls, 'aria-hidden': 'true' }, initial(s));
  const claims = [], chips = [];
  const text = h('p', { class: 'kk-ai-citations-text' });
  PARTS.forEach((p, i) => {
    if (!p.cite) { text.append(p.text); return; }
    const ss = p.cite.map((id) => byId.get(id));
    const claim = h('span', { class: 'kk-ai-citations-claim' }, p.text); claims[i] = claim;
    const chip = h('button', { type: 'button', class: 'kk-ai-citations-chip', 'aria-label': `Fontes: ${ss.map((s) => s.site).join(', ')}` }, mono(ss[0]), ss[0].site, ss.length > 1 && h('small', `+${ss.length - 1}`));
    chips[i] = chip;
    chip.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
    chip.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    chip.addEventListener('focus', () => show(i, true));
    chip.addEventListener('blur', () => hide(true));
    chip.addEventListener('click', () => show(i, true));
    text.append(claim, ' ', chip);
  });

  const pvId = 'kk-acp-' + uid;
  const card = h('div', { class: 'kk-ai-citations-card' });
  const pv = h('div', { class: 'kk-ai-citations-pv', role: 'tooltip', id: pvId }, card);
  const list = h('ol', { class: 'kk-ai-citations-list', id: 'kk-acl-' + uid });
  const caret = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: 'M6 9l6 6 6-6' }));
  const toggle = h('button', { type: 'button', class: 'kk-ai-citations-toggle', 'aria-controls': list.id, 'aria-expanded': 'false' }, h('span', { class: 'kk-ai-citations-stack' }, cited.slice(0, 4).map((s) => mono(s, 'lg'))), `${cited.length} fontes`, caret);
  const root = h('div', { class: 'kk-ai-citations-root' }, text, pv, h('div', toggle, list));
  stage.append(root);

  function paintLinks() {
    PARTS.forEach((p, i) => {
      if (!p.cite) return;
      const on = current === i || p.cite.includes(linked);
      claims[i].classList.toggle('on', on); chips[i].classList.toggle('on', on);
      if (current === i) chips[i].setAttribute('aria-describedby', pvId); else chips[i].removeAttribute('aria-describedby');
    });
  }
  // A prévia fica sobre o chip; se não houver espaço acima, abre abaixo dele.
  function place(i) {
    const rr = root.getBoundingClientRect(), cr = chips[i].getBoundingClientRect();
    const w = Math.min(CARD_W, rr.width); pv.style.width = w + 'px';
    const ch = card.offsetHeight || 120;
    const left = Math.min(Math.max(0, cr.left - rr.left + cr.width / 2 - w / 2), Math.max(0, rr.width - w));
    const above = cr.top - rr.top - 8 - ch >= -4;
    return { x: left, y: above ? cr.top - rr.top - 8 - ch : cr.bottom - rr.top + 8 };
  }
  function fill(i) {
    const ss = PARTS[i].cite.map((id) => byId.get(id));
    card.replaceChildren(...ss.map((s) => h('div', h('div', { class: 'top' }, mono(s, 'sq'), h('span', s.site), h('b', order.indexOf(s.id) + 1)), h('h4', s.title), h('p', s.snippet))));
  }
  function show(i, immediate = false) {
    clearTimeout(openT); clearTimeout(closeT);
    const warm = current >= 0, isWarm = warm || Date.now() - lastClosed < WARM;
    const go = () => {
      const had = current >= 0; current = i; fill(i);
      const { x, y } = place(i);
      pv.classList.toggle('glide', had && !reduced());
      pv.style.transform = `translate(${x}px,${y}px)`; pv.classList.add('on'); paintLinks();
    };
    if (immediate || isWarm) go(); else openT = setTimeout(go, OPEN_DELAY);
  }
  function hide(immediate = false) {
    clearTimeout(openT); clearTimeout(closeT);
    const close = () => { lastClosed = Date.now(); current = -1; pv.classList.remove('on', 'glide'); paintLinks(); };
    if (immediate) close(); else closeT = setTimeout(close, CLOSE_DELAY);
  }
  const onKey = (e) => { if (e.key === 'Escape' && current >= 0) hide(true); };
  document.addEventListener('keydown', onKey); dis(() => document.removeEventListener('keydown', onKey));
  // Toque fora fecha a prévia aberta por toque.
  const onDoc = (e) => { if (current >= 0 && !chips.some((c) => c?.contains(e.target))) hide(true); };
  document.addEventListener('pointerdown', onDoc); dis(() => document.removeEventListener('pointerdown', onDoc));

  function paintList() {
    toggle.setAttribute('aria-expanded', String(listOpen));
    list.style.maxHeight = listOpen ? '600px' : '0'; list.style.opacity = listOpen ? '1' : '0'; list.inert = !listOpen;
    list.replaceChildren(...cited.map((s, i) => {
      const open = openSrc === s.id, did = `kk-acd-${uid}-${s.id}`;
      const det = h('div', { class: 'kk-ai-citations-det', id: did, hidden: !open }, s.snippet, h('code', s.ref),
        h('button', { type: 'button', class: 'kk-ai-citations-copy', onclick: () => copyText(`${s.title} (${s.ref})`, 'Referência copiada.') }, 'Copiar referência'));
      return h('li', h('button', { type: 'button', class: 'kk-ai-citations-src', 'aria-expanded': String(open), 'aria-controls': did,
        onclick: () => { openSrc = open ? null : s.id; paintList(); },
        onpointerenter: () => { linked = s.id; paintLinks(); }, onpointerleave: () => { linked = null; paintLinks(); }, onfocus: () => { linked = s.id; paintLinks(); }, onblur: () => { linked = null; paintLinks(); } },
        h('span', { class: 'n' }, i + 1), mono(s, 'sq'), h('span', { class: 't' }, s.title), h('span', { class: 's' }, s.site)), det);
    }));
  }
  toggle.addEventListener('click', () => { listOpen = !listOpen; paintList(); });
  paintList(); paintLinks();
  return () => { clearTimeout(openT); clearTimeout(closeT); dis.run(); stage.replaceChildren(); };
}
