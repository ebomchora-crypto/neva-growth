// AI Tool Approval — porte em JS puro do componente "AI Tool Approval" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Aprovar ou negar chamadas de ferramenta de um agente. Chamadas destrutivas exigem manter pressionado; as decididas viram uma linha
// de histórico com a saída. Tudo é simulado: nenhuma ferramenta é executada de verdade.
import { h, svg, ensureStyle, disposer, reduced, PALETTE } from '../kit.js';

const HOLD_MS = 900, TICK = 380;
const DEMO = [
  { id: 'vendas', tool: 'consultar_vendas', title: 'Consultar vendas', input: 'pedidos pagos de outubro por cliente', reason: 'Preciso do total por cliente antes de montar a lista de recompra.',
    output: ['128 pedidos pagos encontrados', 'Padaria Estrela  R$ 4.320,00', 'Studio Aurora  R$ 3.870,00', 'Total do mês: R$ 41.905,00'] },
  { id: 'precos', tool: 'editar_planilha', title: 'Atualizar preços', input: { arquivo: 'tabela-de-precos.xlsx', alteracao: '12 itens +5%' }, reason: 'Repassar o reajuste do fornecedor nos itens da linha Premium.',
    output: ['tabela-de-precos.xlsx atualizada (12 itens, +5%)'] },
  { id: 'email', tool: 'enviar_email', title: 'Enviar e-mail', input: { para: '38 clientes inativos', assunto: 'Sentimos sua falta: 10% na volta' }, reason: 'Reativar quem não compra há mais de 90 dias.',
    output: ['38 e-mails na fila', 'Enviados: 38 de 38'], destructive: false },
  { id: 'limpar', tool: 'excluir_cadastros', title: 'Excluir cadastros duplicados', input: 'remover 17 clientes repetidos (mesmo CPF)', reason: 'Limpar a base antes do envio. Esta ação não pode ser desfeita.', destructive: true,
    output: ['17 cadastros duplicados removidos', 'Base final: 1.204 clientes'] },
];
const KIND = [[/consult|buscar|web|fetch/, ['Consultando', 'Consultou'], 'M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z'], [/edit|planilha|arquivo|write/, ['Editando', 'Editou'], 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z'],
  [/mail|enviar|send/, ['Enviando', 'Enviou'], 'M22 2L11 13M22 2l-7 20-4-9-9-4z'], [/excluir|remov|delete/, ['Excluindo', 'Excluiu'], 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6']];
const kindOf = (tool) => KIND.find(([re]) => re.test(tool)) || [null, ['Usando', 'Usou'], 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z'];
const summary = (i) => (typeof i === 'string' ? i : String(Object.values(i)[0]));
const P = (d, cls) => svg('svg', { class: cls, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));

const CSS = `
.kk-ai-tool-approval-root{width:100%;font-family:inherit;color:var(--ink,#0e2236)}
.kk-ai-tool-approval-wrap{border-radius:16px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line};padding:6px}
.kk-ai-tool-approval-trace{padding:4px 8px 6px}
.kk-ai-tool-approval-line{display:flex;align-items:center;gap:10px;width:100%;min-height:36px;padding:0;border:0;background:none;font:inherit;font-size:13px;color:inherit;text-align:left;border-radius:6px;cursor:pointer}
.kk-ai-tool-approval-line:disabled{cursor:default}
.kk-ai-tool-approval-line:focus-visible,.kk-ai-tool-approval-wrap button:focus-visible,.kk-ai-tool-approval-wrap input:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-ai-tool-approval-st{width:16px;height:16px;flex:none;display:grid;place-items:center}.kk-ai-tool-approval-st svg{width:14px;height:14px}
.kk-ai-tool-approval-spin{animation:kk-ai-tool-approval-spin .8s linear infinite}@keyframes kk-ai-tool-approval-spin{to{transform:rotate(360deg)}}
.kk-ai-tool-approval-verb{flex:none;color:${PALETTE.mut}}.kk-ai-tool-approval-verb.den{color:#8aa5c0}
.kk-ai-tool-approval-sum{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace}
.kk-ai-tool-approval-sum.den{color:#8aa5c0;text-decoration:line-through}
.kk-ai-tool-approval-car{margin-left:auto;width:14px;height:14px;flex:none;color:#8aa5c0;transition:transform .2s cubic-bezier(.23,1,.32,1)}.kk-ai-tool-approval-car.open{transform:rotate(90deg)}
.kk-ai-tool-approval-out{margin:0 0 6px 26px;padding:8px 12px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px ${PALETTE.line};font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:${PALETTE.mut};white-space:pre-wrap;overflow-wrap:anywhere;animation:kk-ai-tool-approval-in .22s both}
@keyframes kk-ai-tool-approval-in{from{opacity:0;transform:translateY(6px)}}
.kk-ai-tool-approval-card{border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line};padding:12px;animation:kk-ai-tool-approval-in .22s both}
.kk-ai-tool-approval-queue{margin:0;padding:0 8px 6px;font-size:12px;color:${PALETTE.mut}}
.kk-ai-tool-approval-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.kk-ai-tool-approval-head .ic{width:28px;height:28px;border-radius:7px;background:${PALETTE.ice100};color:${PALETTE.ice700};display:grid;place-items:center;flex:none}.kk-ai-tool-approval-head .ic svg{width:16px;height:16px}
.kk-ai-tool-approval-head h3{margin:0;font-size:14px;font-weight:600}
.kk-ai-tool-approval-head code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#7d97b3}
.kk-ai-tool-approval-badge{margin-left:auto;padding:2px 8px;border-radius:6px;background:#fdecee;color:${PALETTE.bad};font-size:11px;font-weight:600}
.kk-ai-tool-approval-in{margin:0;padding:10px 12px;border-radius:8px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line};font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.kk-ai-tool-approval-in i{font-style:normal;color:#8aa5c0;user-select:none}
.kk-ai-tool-approval-dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0}.kk-ai-tool-approval-dl dt{color:${PALETTE.mut};font-family:inherit}.kk-ai-tool-approval-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.kk-ai-tool-approval-why{margin:8px 0 0;font-size:12px;line-height:1.5;color:${PALETTE.mut}}
.kk-ai-tool-approval-foot{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px}
.kk-ai-tool-approval-always{display:flex;align-items:center;gap:8px;min-height:36px;font-size:12px;color:${PALETTE.mut};cursor:pointer;user-select:none}
.kk-ai-tool-approval-always input{width:16px;height:16px;accent-color:${PALETTE.ice700};cursor:pointer}
.kk-ai-tool-approval-always code{font:inherit;font-family:ui-monospace,monospace}
.kk-ai-tool-approval-acts{margin-left:auto;display:flex;gap:6px}
.kk-ai-tool-approval-deny,.kk-ai-tool-approval-allow,.kk-ai-tool-approval-hold{min-height:36px;padding:0 14px;border-radius:10px;border:0;font:inherit;font-size:14px;cursor:pointer}
.kk-ai-tool-approval-deny{background:none;color:${PALETTE.mut}}.kk-ai-tool-approval-deny:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-ai-tool-approval-allow{background:${PALETTE.ice800};color:#fff;font-weight:600}.kk-ai-tool-approval-allow:hover{background:${PALETTE.ice900}}
.kk-ai-tool-approval-hold{position:relative;overflow:hidden;background:#fdecee;color:#a8272f;font-weight:600;box-shadow:inset 0 0 0 1px rgba(209,67,75,.25);user-select:none;touch-action:none;-webkit-touch-callout:none}
.kk-ai-tool-approval-hold b{position:absolute;inset:0;display:grid;place-items:center;background:${PALETTE.bad};color:#fff;font-weight:600;clip-path:inset(0 100% 0 0);transition:clip-path .2s cubic-bezier(.23,1,.32,1)}
.kk-ai-tool-approval-hold.hold b{clip-path:inset(0);transition:clip-path ${HOLD_MS}ms linear}
.kk-ai-tool-approval-again{display:flex;justify-content:flex-end;padding:0 8px 2px}
.kk-ai-tool-approval-again button{min-height:36px;padding:0 10px;border:0;border-radius:8px;background:none;font:inherit;font-size:12px;color:${PALETTE.mut};cursor:pointer}.kk-ai-tool-approval-again button:hover{color:${PALETTE.ink};background:${PALETTE.ice100}}
.kk-ai-tool-approval-hint{margin:6px 8px 2px;font-size:11px;color:${PALETTE.mut}}
@media (prefers-reduced-motion:reduce){.kk-ai-tool-approval-spin{animation:none}.kk-ai-tool-approval-card,.kk-ai-tool-approval-out{animation:none}}
`;

export default function mount(stage) {
  ensureStyle('ai-tool-approval', CSS);
  const dis = disposer();
  const root = h('div', { class: 'kk-ai-tool-approval-root' }); stage.append(root);
  let calls = [], always = new Set(), open = new Set(), timer = 0, nextTimer = 0;
  const reset = () => { clearTimeout(timer); clearTimeout(nextTimer); always = new Set(); open = new Set(); calls = [{ ...DEMO[0], state: 'ask', out: [] }]; render(); };

  function addNext() {
    const src = DEMO[calls.length]; if (!src) return;
    // Ferramentas marcadas como "sempre permitir" pulam a pergunta, menos as destrutivas.
    calls.push({ ...src, state: always.has(src.tool) && !src.destructive ? 'run' : 'ask', out: [] }); render(); stream();
  }
  // Mostra a saída da chamada em execução, linha a linha.
  function stream() {
    clearTimeout(timer);
    const run = calls.find((c) => c.state === 'run'); if (!run) return;
    timer = setTimeout(() => {
      const src = DEMO.find((d) => d.id === run.id);
      if (run.out.length < src.output.length) run.out = src.output.slice(0, run.out.length + 1);
      else { run.state = 'done'; render(); addNext(); return; }
      render(); stream();
    }, reduced() ? 120 : TICK);
  }
  function respond(c, ok, alwaysOn) {
    if (alwaysOn) always.add(c.tool);
    c.state = ok ? 'run' : 'denied'; render();
    if (ok) stream(); else nextTimer = setTimeout(addNext, 240);
  }

  function holdBtn(c) {
    let t = 0;
    const b = h('button', { type: 'button', class: 'kk-ai-tool-approval-hold', 'aria-label': 'Permitir. Mantenha pressionado para confirmar', 'aria-describedby': 'kk-tah-' + c.id }, 'Segure para permitir', h('b', { 'aria-hidden': 'true' }, 'Segure para permitir'));
    const start = () => { if (t) return; b.classList.add('hold'); t = setTimeout(() => { t = 0; b.classList.remove('hold'); respond(c, true, false); }, HOLD_MS); };
    const stop = () => { b.classList.remove('hold'); clearTimeout(t); t = 0; };
    b.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    b.addEventListener('blur', stop);
    return b;
  }

  function card(c) {
    const [, , ic] = kindOf(c.tool); let alw = false;
    const input = typeof c.input === 'string'
      ? h('pre', { class: 'kk-ai-tool-approval-in' }, h('i', { 'aria-hidden': 'true' }, '> '), c.input)
      : h('dl', { class: 'kk-ai-tool-approval-in kk-ai-tool-approval-dl' }, Object.entries(c.input).flatMap(([k, v]) => [h('dt', k), h('dd', String(v))]));
    const chk = h('input', { type: 'checkbox', onchange: (e) => { alw = e.target.checked; } });
    const el = h('section', { class: 'kk-ai-tool-approval-card', 'aria-labelledby': 'kk-tat-' + c.id, onkeydown: (e) => { if (e.key === 'Escape') respond(c, false, false); } },
      h('header', { class: 'kk-ai-tool-approval-head' }, h('span', { class: 'ic' }, P(ic)), h('h3', { id: 'kk-tat-' + c.id }, c.title), h('code', c.tool), c.destructive && h('span', { class: 'kk-ai-tool-approval-badge' }, 'Destrutiva')),
      input, c.reason && h('p', { class: 'kk-ai-tool-approval-why', id: 'kk-tah-' + c.id }, c.reason),
      h('div', { class: 'kk-ai-tool-approval-foot' },
        c.destructive ? h('span', { class: 'kk-ai-tool-approval-why', style: 'margin:0' }, 'Pergunta sempre')
          : h('label', { class: 'kk-ai-tool-approval-always' }, chk, h('span', 'Não perguntar de novo para ', h('code', c.tool))),
        h('div', { class: 'kk-ai-tool-approval-acts' },
          h('button', { type: 'button', class: 'kk-ai-tool-approval-deny', onclick: () => respond(c, false, false) }, 'Negar'),
          c.destructive ? holdBtn(c) : h('button', { type: 'button', class: 'kk-ai-tool-approval-allow', onclick: () => respond(c, true, alw) }, 'Permitir'))));
    return el;
  }

  function trace(c) {
    const [, verbs] = kindOf(c.tool), running = c.state === 'run', denied = c.state === 'denied';
    const hasOut = c.out.length > 0 && !denied, showOut = hasOut && (running || open.has(c.id)), oid = 'kk-tao-' + c.id;
    const st = running ? svg('svg', { class: 'kk-ai-tool-approval-spin', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 6.25, stroke: PALETTE.ice200, 'stroke-width': 1.5 }), svg('path', { d: 'M8 1.75a6.25 6.25 0 0 1 6.25 6.25', stroke: PALETTE.ice700, 'stroke-width': 1.5, 'stroke-linecap': 'round' }))
      : denied ? svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: 'M4.5 4.5l7 7m0-7-7 7', stroke: '#8aa5c0', 'stroke-width': 1.75, 'stroke-linecap': 'round' }))
      : svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: 'M3.5 8.5 6.5 11.5 12.5 4.5', stroke: PALETTE.ice700, 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const btn = h('button', { type: 'button', class: 'kk-ai-tool-approval-line', disabled: !hasOut || running, 'aria-expanded': hasOut ? String(showOut) : null, 'aria-controls': hasOut ? oid : null,
      onclick: () => { open.has(c.id) ? open.delete(c.id) : open.add(c.id); render(); } },
      h('span', { class: 'kk-ai-tool-approval-st' }, st), h('span', { class: 'kk-ai-tool-approval-verb' + (denied ? ' den' : '') }, running ? verbs[0] : denied ? 'Negado' : verbs[1]),
      h('code', { class: 'kk-ai-tool-approval-sum' + (denied ? ' den' : '') }, summary(c.input)),
      hasOut && !running && P('M9 6l6 6-6 6', 'kk-ai-tool-approval-car' + (open.has(c.id) ? ' open' : '')));
    return h('div', btn, showOut && h('pre', { class: 'kk-ai-tool-approval-out', id: oid }, c.out.join('\n')));
  }

  function render() {
    const pending = calls.filter((c) => c.state === 'ask'), decided = calls.filter((c) => c.state !== 'ask'), cur = pending[0];
    const finished = calls.length === DEMO.length && !pending.length && calls.every((c) => c.state !== 'run');
    // O cartão só é recriado quando muda a chamada atual, para não perder o estado da caixa de seleção.
    const keepCard = cur && root._cardId === cur.id ? root._card : null;
    const cardEl = cur ? keepCard || card(cur) : null; root._cardId = cur?.id; root._card = cardEl;
    root.replaceChildren(h('div', { class: 'kk-ai-tool-approval-wrap' },
      decided.length ? h('div', { class: 'kk-ai-tool-approval-trace', 'aria-live': 'polite' }, decided.map(trace)) : null,
      cur && pending.length > 1 ? h('p', { class: 'kk-ai-tool-approval-queue' }, `1 de ${pending.length} aguardando`) : null,
      cardEl, finished ? h('div', { class: 'kk-ai-tool-approval-again' }, h('button', { type: 'button', onclick: reset }, 'Repetir demo')) : null,
      cur ? h('p', { class: 'kk-ai-tool-approval-hint' }, 'Esc nega a chamada.') : null));
  }

  reset();
  return () => { clearTimeout(timer); clearTimeout(nextTimer); dis.run(); stage.replaceChildren(); };
}
