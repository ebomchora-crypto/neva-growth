// AI Context Meter — porte em JS puro do componente "AI Context Meter" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Anel no rodapé do prompt que mostra quanto da janela de contexto está cheia; abre um detalhamento por fonte e compacta ao encher.
// A conversa de exemplo cresce sozinha (e por botão); tudo é simulado.
import { h, svg, ensureStyle, disposer, reduced, PALETTE } from '../kit.js';

const LIMIT = 200000, COMPACT_AT = 0.8, TICK = 1100, AUTO_DELAY = 1400, SUMMARY = 5800, START_MSG = 61000;
const BASE = [{ id: 'system', label: 'Instruções do sistema', tokens: 3100 }, { id: 'tools', label: 'Ferramentas', tokens: 14200 }, { id: 'files', label: 'Arquivos', tokens: 38600 }];
const COLORS = { system: PALETTE.ice200, tools: PALETTE.ice300, files: PALETTE.ice500, summary: PALETTE.ice700, messages: PALETTE.ice900 };
const fmtK = (t) => (t >= 1000 ? `${(t / 1000).toFixed(t >= 10000 ? 0 : 1).replace('.', ',')}k` : `${Math.round(t)}`);
const pct = (v, d = 0) => (v * 100).toFixed(d).replace('.', ',');
const levelColor = (s) => (s >= COMPACT_AT + (1 - COMPACT_AT) / 2 ? PALETTE.bad : s >= COMPACT_AT - 0.1 ? '#b7791f' : PALETTE.ink);

const CSS = `
.kk-ai-context-meter-root{min-width:0;box-sizing:border-box;width:100%;min-height:330px;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;font-family:inherit;color:var(--ink,#0e2236)}
.kk-ai-context-meter-chat{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;font-size:12px;color:${PALETTE.mut};padding:0 2px}
.kk-ai-context-meter-chat p{margin:0}
.kk-ai-context-meter-bar{position:relative;display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:44px;padding:0 6px 0 12px;border-radius:14px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px ${PALETTE.line}}
.kk-ai-context-meter-model{font-size:12px;color:${PALETTE.mut};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-context-meter-right{display:flex;align-items:center;gap:2px}
.kk-ai-context-meter-add{min-height:36px;padding:0 10px;border:0;border-radius:10px;background:none;font:inherit;font-size:12px;color:${PALETTE.mut};cursor:pointer;white-space:nowrap}
.kk-ai-context-meter-add:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}
.kk-ai-context-meter-ring{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 8px;border:0;border-radius:10px;background:none;font:inherit;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer}
.kk-ai-context-meter-ring:hover,.kk-ai-context-meter-ring[aria-expanded=true]{background:${PALETTE.ice100}}
.kk-ai-context-meter-bar button:focus-visible,.kk-ai-context-meter-panel button:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-ai-context-meter-ring svg{width:16px;height:16px;transform:rotate(-90deg)}
.kk-ai-context-meter-ring circle:last-child{transition:stroke-dashoffset .5s cubic-bezier(.23,1,.32,1)}
.kk-ai-context-meter-panel{position:absolute;right:0;bottom:calc(100% + 8px);z-index:5;width:288px;max-width:100%;box-sizing:border-box;padding:12px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px ${PALETTE.line},0 14px 30px -10px rgba(15,53,96,.35);transform-origin:bottom right;animation:kk-ai-context-meter-in .16s cubic-bezier(.23,1,.32,1) both}
.kk-ai-context-meter-panel[hidden]{display:none}
@keyframes kk-ai-context-meter-in{from{opacity:0;transform:scale(.97) translateY(4px)}}
.kk-ai-context-meter-top{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px}
.kk-ai-context-meter-top b{font-size:14px}.kk-ai-context-meter-top span{font-size:12px;color:${PALETTE.mut};font-variant-numeric:tabular-nums}
.kk-ai-context-meter-track{position:relative}
.kk-ai-context-meter-segs{display:flex;height:8px;overflow:hidden;border-radius:999px;background:${PALETTE.ice100}}
.kk-ai-context-meter-segs span{height:100%;transition:width .5s cubic-bezier(.23,1,.32,1),opacity .15s}
.kk-ai-context-meter-segs span+span{margin-left:1px}.kk-ai-context-meter-segs span.dim{opacity:.3}
.kk-ai-context-meter-tick{position:absolute;top:-4px;bottom:-4px;width:1px;background:${PALETTE.mut}}
.kk-ai-context-meter-note{margin:6px 0 0;text-align:right;font-size:11px;color:${PALETTE.mut}}
.kk-ai-context-meter-list{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}
.kk-ai-context-meter-list li{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;font-size:12px;transition:background .15s}
.kk-ai-context-meter-list li.act{background:${PALETTE.ice50}}
.kk-ai-context-meter-list i{width:8px;height:8px;border-radius:3px;flex:none}.kk-ai-context-meter-list i.free{box-shadow:inset 0 0 0 1px ${PALETTE.ice300}}
.kk-ai-context-meter-list em{font-style:normal;margin-left:auto;color:${PALETTE.mut};font-variant-numeric:tabular-nums}
.kk-ai-context-meter-list u{width:40px;text-align:right;text-decoration:none;color:#7d97b3;font-variant-numeric:tabular-nums}
.kk-ai-context-meter-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid ${PALETTE.ice100}}
.kk-ai-context-meter-foot p{margin:0;font-size:12px;color:${PALETTE.mut}}
.kk-ai-context-meter-go{min-height:36px;padding:0 14px;border:0;border-radius:10px;background:${PALETTE.ice800};color:#fff;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.kk-ai-context-meter-go:hover:not(:disabled){background:${PALETTE.ice900}}.kk-ai-context-meter-go:disabled{background:${PALETTE.ice100};color:#8aa5c0;cursor:default}
@media (prefers-reduced-motion:reduce){.kk-ai-context-meter-panel{animation:none}.kk-ai-context-meter-segs span,.kk-ai-context-meter-ring circle:last-child{transition:none}}
`;

export default function mount(stage) {
  ensureStyle('ai-context-meter', CSS);
  const dis = disposer();
  let messages = START_MSG, summary = 0, turn = 0, onScreen = true, open = true, active = null, shownUsed = 0, shownShare = 0, tween = 0, autoTimer = 0, compactTimer = 0, compactions = 0;
  const base = BASE.reduce((s, x) => s + x.tokens, 0);
  const segs = () => [...BASE, { id: 'summary', label: 'Resumo', tokens: summary }, { id: 'messages', label: 'Mensagens', tokens: messages }];
  const total = () => base + summary + messages;

  const chat = h('div', { class: 'kk-ai-context-meter-chat', 'aria-live': 'polite' });
  const ringSvg = svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 6, stroke: PALETTE.ice200, 'stroke-width': 2 }), svg('circle', { cx: 8, cy: 8, r: 6, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-dasharray': 2 * Math.PI * 6 }));
  const ringTxt = h('span');
  const ring = h('button', { type: 'button', class: 'kk-ai-context-meter-ring', 'aria-haspopup': 'dialog', 'aria-expanded': 'true' }, ringSvg, ringTxt);
  const addBtn = h('button', { type: 'button', class: 'kk-ai-context-meter-add' }, '+ Turno');
  const panel = h('div', { class: 'kk-ai-context-meter-panel', role: 'dialog', 'aria-label': 'Detalhamento do contexto' });
  const bar = h('div', { class: 'kk-ai-context-meter-bar' }, panel, h('span', { class: 'kk-ai-context-meter-model' }, 'Neva 1.5'), h('div', { class: 'kk-ai-context-meter-right' }, addBtn, ring));
  const root = h('div', { class: 'kk-ai-context-meter-root' }, chat, bar);
  stage.append(root);

  // Números que rolam em vez de pular (sem rolagem se o usuário reduziu o movimento).
  function tweenTo() {
    cancelAnimationFrame(tween);
    const from = { u: shownUsed, s: shownShare }, to = { u: total(), s: total() / LIMIT };
    if (reduced()) { shownUsed = to.u; shownShare = to.s; paint(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 450), e = 1 - (1 - t) ** 3;
      shownUsed = from.u + (to.u - from.u) * e; shownShare = from.s + (to.s - from.s) * e; paint();
      if (t < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }
  const els = {};
  function buildPanel() {
    els.top = h('span'); els.segs = h('div', { class: 'kk-ai-context-meter-segs' }); els.list = h('ul', { class: 'kk-ai-context-meter-list' });
    els.go = h('button', { type: 'button', class: 'kk-ai-context-meter-go', onclick: compact }, 'Compactar agora');
    const track = h('div', { class: 'kk-ai-context-meter-track' }, els.segs, h('span', { class: 'kk-ai-context-meter-tick', 'aria-hidden': 'true', style: `left:${COMPACT_AT * 100}%` }));
    track.addEventListener('pointerleave', () => setActive(null));
    panel.append(h('div', { class: 'kk-ai-context-meter-top' }, h('b', 'Contexto'), els.top), track, h('p', { class: 'kk-ai-context-meter-note' }, `Compacta em ${Math.round(COMPACT_AT * 100)}%`), els.list,
      h('div', { class: 'kk-ai-context-meter-foot' }, h('p', 'Resumir turnos antigos'), els.go));
  }
  function setActive(id) { if (active === id) return; active = id; paintPanel(); }
  function paintPanel() {
    const ss = segs(), used = total(), free = Math.max(0, LIMIT - used);
    els.top.textContent = `${fmtK(shownUsed)} de ${fmtK(LIMIT)}`;
    // Segmentos fixos (resumo sempre listado) para a largura animar a partir de zero.
    if (els.segs.children.length !== ss.length) els.segs.replaceChildren(...ss.map((s) => h('span', { 'data-id': s.id, style: `background:${COLORS[s.id]}`, onpointerenter: () => setActive(s.id) })));
    ss.forEach((s, i) => { const e = els.segs.children[i]; e.style.width = `${(s.tokens / LIMIT) * 100}%`; e.classList.toggle('dim', !!active && active !== s.id); });
    els.list.replaceChildren(...ss.filter((s) => s.tokens > 0).map((s) => h('li', { class: active === s.id ? 'act' : '', onpointerenter: () => setActive(s.id), onpointerleave: () => setActive(null) },
      h('i', { style: `background:${COLORS[s.id]}` }), h('span', s.label), h('em', fmtK(s.tokens)), h('u', pct(s.tokens / LIMIT, 1) + '%'))),
      h('li', h('i', { class: 'free' }), h('span', { style: `color:${PALETTE.mut}` }, 'Livre'), h('em', fmtK(free)), h('u', pct(free / LIMIT, 1) + '%')));
    els.go.disabled = used / LIMIT < 0.4;
  }
  function paint() {
    const share = total() / LIMIT;
    ring.style.color = levelColor(share);
    ringSvg.lastChild.setAttribute('stroke-dashoffset', String(2 * Math.PI * 6 * (1 - Math.min(1, shownShare))));
    ringTxt.textContent = `${Math.round(shownShare * 100)}%`;
    ring.setAttribute('aria-label', `Contexto ${Math.round(share * 100)}% cheio. ${open ? 'Ocultar' : 'Mostrar'} detalhamento`);
    ring.setAttribute('aria-expanded', String(open)); panel.hidden = !open;
    if (open) paintPanel();
  }

  const MSGS = ['Pedido: resumir as vendas da semana', 'Resposta: 128 pedidos, ticket médio R$ 214', 'Pedido: comparar com setembro', 'Resposta: recompra subiu 9 pontos'];
  const log = (t) => { chat.append(h('p', t)); while (chat.children.length > 3) chat.firstChild.remove(); };
  function grow(size) { turn++; messages += size ?? (turn % 3 === 0 ? 9400 : 2600 + (turn % 4) * 900); log(MSGS[turn % MSGS.length] + ` (+${fmtK(size ?? 2600)} tokens)`); tweenTo(); schedule(); }
  function compact() {
    clearTimeout(compactTimer); summary = SUMMARY; messages = 0; compactions++;
    log(`Conversa compactada: ${compactions}x. Os turnos antigos viraram um resumo.`); tweenTo(); schedule();
  }
  addBtn.addEventListener('click', () => grow(5200));
  ring.addEventListener('click', () => { open = !open; paint(); });
  // Fecha com Esc ou ao tocar fora, como qualquer popover.
  const onDoc = (e) => { if (open && !root.contains(e.target)) { open = false; paint(); } };
  const onKey = (e) => { if (e.key === 'Escape' && open && root.contains(document.activeElement)) { open = false; paint(); ring.focus(); } };
  document.addEventListener('pointerdown', onDoc); document.addEventListener('keydown', onKey);
  dis(() => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); });

  // Cresce um turno por vez; ao chegar no limite, compacta sozinha. Pausa fora da tela e com a aba oculta.
  function schedule() {
    clearTimeout(autoTimer); clearTimeout(compactTimer);
    if (!onScreen || document.hidden) return;
    if (total() >= LIMIT * COMPACT_AT) { compactTimer = setTimeout(compact, AUTO_DELAY); return; }
    autoTimer = setTimeout(() => grow(), TICK);
  }
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; schedule(); }); io.observe(root);
  const vis = () => schedule(); document.addEventListener('visibilitychange', vis);
  dis(() => { io.disconnect(); document.removeEventListener('visibilitychange', vis); });

  buildPanel(); shownUsed = total(); shownShare = total() / LIMIT; log('Conversa carregada com 3 arquivos anexados.'); paint(); schedule();
  return () => { clearTimeout(autoTimer); clearTimeout(compactTimer); cancelAnimationFrame(tween); dis.run(); stage.replaceChildren(); };
}
