// Morph Popover — porte em JS puro do componente "Morph Popover" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, onResize, reduced } from '../kit.js';

const BTN_H = 36, SENT_FOR = 1600;
const MORPH = '.42s cubic-bezier(.34,1.22,.64,1)';   // mola leve (sobe um pouco além do alvo, como bounce .14)
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
let uid = 0;

export default function mount(stage, ctx) {
  ensureStyle('morph-popover', `
.kk-morph-popover-wrap{position:relative;width:100%;min-height:240px;padding:28px 12px 12px;display:flex;flex-direction:column;align-items:center;gap:12px}
.kk-morph-popover-root{position:relative;height:${BTN_H}px}
.kk-morph-popover-panel{position:absolute;top:0;z-index:2;overflow:hidden;background:#fff;color:var(--ink,#0e2236);border:1px solid var(--line,#d3e6f6);box-shadow:0 1px 2px rgba(15,53,96,.08);
  transition:width ${MORPH},height ${MORPH},left ${MORPH},border-radius ${MORPH},box-shadow .3s}
.kk-morph-popover-panel.is-open{box-shadow:0 18px 40px -12px rgba(15,53,96,.35)}
.kk-morph-popover-view{position:absolute;top:0;left:0;opacity:0;visibility:hidden;transition:opacity .1s,visibility 0s .1s}
.kk-morph-popover-view.is-on{opacity:1;visibility:visible;transition:opacity .2s .1s,visibility 0s}
.kk-morph-popover-pill{display:flex;align-items:center;gap:8px;height:${BTN_H - 2}px;padding:0 14px;white-space:nowrap;font:600 14px/1 inherit;color:inherit;background:none;border:0;cursor:pointer;width:max-content}
.kk-morph-popover-pill:hover{background:var(--ice-50,#f2f8fe)}.kk-morph-popover-pill:active{background:var(--ice-100,#e3f0fb)}
button.kk-morph-popover-pill:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:-3px;border-radius:999px}
.kk-morph-popover-ico{color:var(--mut,#4a6f93);display:inline-flex}
.kk-morph-popover-form{display:flex;flex-direction:column}
.kk-morph-popover-title{display:flex;align-items:center;gap:8px;padding:10px 14px 0;font:600 14px/20px inherit}
.kk-morph-popover-panel .kk-morph-popover-ta,.kk-morph-popover-panel .kk-morph-popover-ta:focus{display:block;border:0;border-radius:0;box-shadow:none;margin:0;box-sizing:border-box;width:100%;height:112px;resize:none;border:0;outline:0;background:transparent;padding:8px 14px 0;font:400 16px/1.5 inherit;color:var(--ink,#0e2236)}
.kk-morph-popover-ta::placeholder{color:#8aa6c1}.kk-morph-popover-ta:disabled{opacity:.6}
.kk-morph-popover-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border-top:1px solid var(--ice-100,#e3f0fb);background:rgba(242,248,254,.8)}
.kk-morph-popover-keys{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--mut,#4a6f93)}
.kk-morph-popover-keys kbd{border:1px solid var(--line,#d3e6f6);background:#fff;border-radius:4px;padding:1px 5px;font:11px/1.4 inherit;color:var(--mut,#4a6f93)}
.kk-morph-popover-send{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border:0;border-radius:10px;background:var(--ice-800,#164a7c);color:#fff;font:600 13px/1 inherit;cursor:pointer;transition:background-color .15s}
.kk-morph-popover-send:hover:not(:disabled){background:var(--ice-700,#1f5f9b)}
.kk-morph-popover-send:disabled{background:var(--ice-200,#c9e1f6);color:var(--mut,#4a6f93);cursor:not-allowed}
.kk-morph-popover-send:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-morph-popover-spin{animation:kk-morph-popover-spin .8s linear infinite}
@keyframes kk-morph-popover-spin{to{transform:rotate(360deg)}}
.kk-morph-popover-ok{color:#1f9d6b}
.kk-morph-popover-last{margin:0;max-width:320px;font-size:12px;color:var(--mut,#4a6f93);text-align:center;overflow-wrap:anywhere}
.kk-morph-popover-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:360px){.kk-morph-popover-keys{display:none}}
@media (prefers-reduced-motion:reduce){.kk-morph-popover-panel{transition:none}.kk-morph-popover-spin{animation:none}}
`);
  const id = 'kk-morph-popover-' + (++uid);
  let phase = 'idle', W = 340, sizes = { idle: 120, sent: 100 }, formH = 190, sentT = 0, sendT = 0, wasOpen = false;
  const label = 'Sugestão', placeholder = 'O que podemos melhorar no painel de vendas?';

  const chat = () => svg('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: 'M2.75 4.25a1.5 1.5 0 0 1 1.5-1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H7l-2.75 2.5v-2.5a1.5 1.5 0 0 1-1.5-1.5v-5Z', stroke: 'currentColor', 'stroke-linejoin': 'round', 'stroke-width': 1.4 }));
  const spinner = () => svg('svg', { class: 'kk-morph-popover-spin', viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', 'aria-hidden': 'true' },
    svg('circle', { cx: 8, cy: 8, r: 6, stroke: 'currentColor', 'stroke-opacity': .25, 'stroke-width': 2 }), svg('path', { d: 'M14 8a6 6 0 0 0-6-6', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-width': 2 }));

  // Visão 1: o botão fechado.
  const idleIcon = h('span', { class: 'kk-morph-popover-ico' }, chat()), idleLabel = h('span', label);
  const idleBtn = h('button', { type: 'button', class: 'kk-morph-popover-pill', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onClick: () => open() }, idleIcon, idleLabel);
  const idleView = h('div', { class: 'kk-morph-popover-view is-on' }, idleBtn);
  // Visão 2: o formulário.
  const titleIcon = h('span', { class: 'kk-morph-popover-ico' }, chat()), titleLabel = h('span', label);
  const ta = h('textarea', { class: 'kk-morph-popover-ta', id: id + '-t', placeholder, onInput: () => syncSend() });
  const send = h('button', { type: 'submit', class: 'kk-morph-popover-send', disabled: true }, 'Enviar');
  const form = h('form', { class: 'kk-morph-popover-form', 'aria-label': label, onSubmit: (e) => { e.preventDefault(); submit(); } },
    h('div', { class: 'kk-morph-popover-title' }, titleIcon, titleLabel),
    h('label', { class: 'kk-morph-popover-sr', for: id + '-t' }, placeholder), ta,
    h('div', { class: 'kk-morph-popover-foot' },
      h('span', { class: 'kk-morph-popover-keys' }, h('kbd', isMac ? '⌘' : 'Ctrl'), h('kbd', '↵'), h('span', 'para enviar')), send));
  const formView = h('div', { class: 'kk-morph-popover-view' }, form);
  // Visão 3: confirmação.
  const check = svg('path', { d: 'M4.75 8.25 7 10.5l4.25-4.75', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.75, fill: 'none', pathLength: 1 });
  const sentPill = h('div', { class: 'kk-morph-popover-pill', role: 'status', style: 'cursor:default' },
    svg('svg', { class: 'kk-morph-popover-ok', viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 8, fill: 'currentColor', opacity: .15 }), check), 'Obrigado!');
  const sentView = h('div', { class: 'kk-morph-popover-view' }, sentPill);

  const panel = h('div', { class: 'kk-morph-popover-panel' }, idleView, formView, sentView);
  const root = h('div', { class: 'kk-morph-popover-root' }, panel);
  const last = h('p', { class: 'kk-morph-popover-last', role: 'status' }, 'Clique em "Sugestão", escreva e envie.');
  const wrap = h('div', { class: 'kk-morph-popover-wrap' }, root, last);
  stage.append(wrap);

  const expanded = () => phase === 'open' || phase === 'sending';
  const syncSend = () => { send.disabled = !ta.value.trim() || phase === 'sending'; };
  // O rótulo viaja junto: FLIP do ícone e do texto entre a posição antiga e a nova.
  const flip = (els, from) => {
    if (reduced()) return;
    els.forEach((el, i) => {
      const a = from[i], b = el.getBoundingClientRect();
      if (!a || !b.width) return;
      el.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.22,.64,1)' });
    });
  };
  const apply = (fromRects) => {
    root.style.width = W + 'px';
    let w, hh, left;
    if (expanded()) { w = W; hh = formH + 2; left = 0; }
    else if (phase === 'sent') { w = sizes.sent + 2; hh = BTN_H; left = (W - w) / 2; }
    else { w = sizes.idle + 2; hh = BTN_H; left = (W - w) / 2; }
    Object.assign(panel.style, { width: w + 'px', height: hh + 'px', left: left + 'px', borderRadius: (expanded() ? 16 : BTN_H / 2) + 'px' });
    panel.classList.toggle('is-open', expanded());
    formView.classList.toggle('is-on', expanded());
    idleView.classList.toggle('is-on', phase === 'idle');
    sentView.classList.toggle('is-on', phase === 'sent');
    idleBtn.setAttribute('aria-expanded', String(expanded()));
    form.style.width = (W - 2) + 'px';
    ta.disabled = phase === 'sending';
    send.replaceChildren(...(phase === 'sending' ? [spinner(), 'Enviando'] : ['Enviar']));
    syncSend();
    if (fromRects) flip(fromRects.els, fromRects.rects);
  };
  const go = (next) => {
    const prevOpen = expanded();
    // Guarda onde estava o rótulo (do botão ou do título) antes da troca.
    const src = prevOpen ? [titleIcon, titleLabel] : [idleIcon, idleLabel];
    const rects = src.map((e) => e.getBoundingClientRect());
    phase = next;
    const dest = expanded() === prevOpen ? null : (expanded() ? [titleIcon, titleLabel] : [idleIcon, idleLabel]);
    apply(dest ? { els: dest, rects } : null);
    if (next === 'open' && !prevOpen) { wasOpen = true; ta.focus({ preventScroll: true }); }
    else if (next === 'idle' && wasOpen) { wasOpen = false; idleBtn.focus({ preventScroll: true }); }
    if (next === 'sent') {
      if (!reduced()) check.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: 300, delay: 200, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' });
      sentT = setTimeout(() => go('idle'), SENT_FOR);
    }
  };
  const open = () => { if (phase === 'idle') go('open'); };
  // Simula o envio (700 ms) para mostrar o estado "Enviando".
  const submit = () => {
    const text = ta.value.trim();
    if (!text || phase !== 'open') return;
    go('sending');
    sendT = setTimeout(() => {
      last.textContent = `Última sugestão enviada: "${text.length > 90 ? text.slice(0, 90) + '…' : text}"`;
      ta.value = ''; go('sent');
    }, 700);
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && phase === 'open') { e.stopPropagation(); go('idle'); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };
  panel.addEventListener('keydown', onKey);
  const outside = (e) => { if (phase === 'open' && !root.contains(e.target)) go('idle'); };
  document.addEventListener('pointerdown', outside);

  const measure = () => {
    sizes = { idle: idleBtn.offsetWidth, sent: sentPill.offsetWidth };
    // o formulário só mede com largura definida; mede em modo visível mas fora de vista
    form.style.width = (W - 2) + 'px';
    formH = form.offsetHeight || formH;
    apply();
  };
  const off = onResize(stage, ({ width }) => { W = Math.max(240, Math.min(340, width - 24)); measure(); });
  // As larguras do botão dependem da fonte carregada.
  document.fonts?.ready.then(() => { if (wrap.isConnected) measure(); });
  return () => { clearTimeout(sentT); clearTimeout(sendT); document.removeEventListener('pointerdown', outside); off(); wrap.remove(); };
}
