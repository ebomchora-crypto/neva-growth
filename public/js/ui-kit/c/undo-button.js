// Undo Button — porte em JS puro do componente "Undo Button" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, reduced } from '../kit.js';

const STROKE = 1.5;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');

// Contorno de pílula que começa no topo e corre no sentido horário, para a contagem "esvaziar" até onde começou.
function pillPath(w, hh) {
  const s = STROKE / 2, r = hh / 2 - s, left = s + r, right = w - s - r;
  return `M ${w / 2} ${s} H ${right} A ${r} ${r} 0 0 1 ${right} ${hh - s} H ${left} A ${r} ${r} 0 0 1 ${left} ${s} Z`;
}
const ico = (d, extra = {}) => svg('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', ...extra }, svg('path', { d }));
const ICONS = {
  archive: 'M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
};

// Um botão desfazível; `opts` define textos e duração.
function undoButton(opts, onMsg) {
  const { label, doneLabel, icon, duration = 5000 } = opts;
  let phase = 'idle', elapsed = 0, hovered = false, raf = 0, last = 0, resetT = 0, seconds = Math.ceil(duration / 1000), remaining = 1;
  const content = h('span', { class: 'kk-undo-button-content' });
  const btn = h('button', { type: 'button', class: 'kk-undo-button-btn' }, content);
  const path = svg('path', { fill: 'none', 'stroke-width': STROKE, 'stroke-linecap': 'round', class: 'kk-undo-button-ring' });
  const ring = svg('svg', { class: 'kk-undo-button-svg', 'aria-hidden': 'true' }, path);
  const live = h('span', { class: 'kk-undo-button-sr', 'aria-live': 'polite' });
  const root = h('span', { class: 'kk-undo-button' }, btn, ring, live);

  const paint = () => { const len = path.getTotalLength(); path.style.strokeDasharray = `${len * remaining} ${len}`; };
  const fitRing = () => { path.setAttribute('d', pillPath(btn.offsetWidth, btn.offsetHeight)); paint(); };
  const ro = new ResizeObserver(fitRing); ro.observe(btn);
  const fitWidth = () => { btn.style.width = (content.offsetWidth + 2) + 'px'; };
  const ro2 = new ResizeObserver(fitWidth); ro2.observe(content);

  const countdown = h('span', { class: 'kk-undo-button-count' }, String(seconds));
  const render = () => {
    const kids = {
      idle: [ico(ICONS[icon]), label],
      pending: [h('span', { class: 'kk-undo-button-dim' }, doneLabel), h('span', { class: 'kk-undo-button-sep', 'aria-hidden': 'true' }), ico(ICONS.undo), 'Desfazer', countdown,
        h('kbd', { class: 'kk-undo-button-kbd' }, isMac ? '⌘Z' : 'Ctrl Z')],
      done: [ico(ICONS.check), doneLabel],
    }[phase];
    const inner = h('span', { class: 'kk-undo-button-inner' }, kids);
    content.replaceChildren(inner);
    if (!reduced()) inner.animate([{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    btn.setAttribute('aria-label', { idle: label, pending: `${doneLabel}. Desfazer, ${seconds} segundo${seconds === 1 ? '' : 's'} restantes`, done: doneLabel }[phase]);
    btn.setAttribute('aria-disabled', String(phase === 'done'));
    btn.classList.toggle('is-done', phase === 'done');
    path.style.opacity = phase === 'pending' ? 1 : 0;
    live.textContent = phase === 'pending' ? `${doneLabel}. Pressione o botão ou ${isMac ? 'Command' : 'Control'} Z para desfazer.` : phase === 'done' ? doneLabel : '';
  };
  const stopTick = () => { cancelAnimationFrame(raf); raf = 0; };
  const undo = () => { stopTick(); phase = 'idle'; render(); onMsg(`Ação desfeita: ${label.toLowerCase()}`); };
  const tick = (now) => {
    // Passar o mouse ou sair da aba congela o relógio: ninguém perde a chance de desfazer enquanto lê.
    if (!(hovered || document.hidden)) elapsed += now - last;
    last = now;
    const left = Math.max(0, duration - elapsed);
    remaining = left / duration; paint();
    const s = Math.ceil(left / 1000);
    if (s !== seconds) { seconds = s; countdown.textContent = String(s); }
    if (left === 0) { phase = 'done'; render(); onMsg(`${doneLabel} com sucesso`); resetT = setTimeout(() => { phase = 'idle'; render(); }, 2400); return; }
    raf = requestAnimationFrame(tick);
  };
  btn.addEventListener('click', () => {
    if (phase === 'idle') { phase = 'pending'; elapsed = 0; remaining = 1; seconds = Math.ceil(duration / 1000); countdown.textContent = String(seconds); render(); last = performance.now(); raf = requestAnimationFrame(tick); }
    else if (phase === 'pending') undo();
  });
  btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovered = true; });
  btn.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hovered = false; });
  const key = (e) => {
    const t = e.target;
    const editable = t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    if (phase === 'pending' && (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !editable) { e.preventDefault(); undo(); }
  };
  window.addEventListener('keydown', key);
  render();
  return { root, dispose: () => { stopTick(); clearTimeout(resetT); ro.disconnect(); ro2.disconnect(); window.removeEventListener('keydown', key); } };
}

export default function mount(stage, ctx) {
  ensureStyle('undo-button', `
.kk-undo-button-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px 12px;width:100%}
.kk-undo-button{position:relative;display:inline-flex}
.kk-undo-button-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;height:44px;overflow:hidden;white-space:nowrap;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 14px/1 inherit;cursor:pointer;outline:none;transition:background-color .15s,border-color .15s,color .15s,width .42s cubic-bezier(.23,1,.32,1)}
.kk-undo-button-btn:hover{background:var(--ice-50,#f2f8fe)}
.kk-undo-button-btn:active{background:var(--ice-100,#e3f0fb)}
.kk-undo-button-btn:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-500,#4a95d2)}
.kk-undo-button-btn.is-done{cursor:default;background:var(--ice-50,#f2f8fe);color:var(--mut,#4a6f93)}
.kk-undo-button-content{display:inline-flex;flex:none;padding:0 18px}.kk-undo-button-inner>svg{flex:none}
.kk-undo-button-inner{display:inline-flex;align-items:center;gap:8px}
.kk-undo-button-dim,.kk-undo-button-count{color:var(--mut,#4a6f93)}
.kk-undo-button-count{font-variant-numeric:tabular-nums;min-width:1ch;text-align:center}
.kk-undo-button-sep{width:1px;height:16px;background:var(--line,#d3e6f6)}
.kk-undo-button-kbd{border:1px solid var(--line,#d3e6f6);border-radius:4px;padding:1px 4px;font:11px/1.3 inherit;color:var(--mut,#4a6f93)}
@container (max-width:380px){.kk-undo-button-kbd{display:none}}
.kk-undo-button-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.kk-undo-button-ring{stroke:var(--ice-600,#2f7bbd);transition:opacity .15s}
.kk-undo-button-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.kk-undo-button-hint{font-size:12px;color:var(--mut,#4a6f93);margin:0;text-align:center;max-width:290px}
.kk-undo-button-log{font-size:12px;color:var(--ink,#0e2236);min-height:16px;margin:0}
@media (prefers-reduced-motion:reduce){.kk-undo-button-btn{transition:none}}
`);
  const log = h('p', { class: 'kk-undo-button-log', role: 'status' });
  const say = (m) => { log.textContent = m; };
  const defs = [
    { label: 'Arquivar pedido', doneLabel: 'Pedido arquivado', icon: 'archive' },
    { label: 'Excluir lead', doneLabel: 'Lead excluído', icon: 'trash' },
    { label: 'Enviar proposta', doneLabel: 'Proposta enviada', icon: 'send' },
  ].slice(0, ctx.big ? 3 : 2).map((d) => undoButton(d, say));
  const root = h('div', { class: 'kk-undo-button-wrap' }, defs.map((d) => d.root),
    h('p', { class: 'kk-undo-button-hint' }, `Clique para executar. Você tem 5 s para desfazer — clique de novo ou use ${isMac ? '⌘Z' : 'Ctrl+Z'}. O mouse sobre o botão pausa o tempo.`), log);
  stage.append(root);
  return () => { defs.forEach((d) => d.dispose()); root.remove(); };
}
