// Hold Button — porte em JS puro do componente "Hold Button" .
import { h, svg, ensureStyle, reduced, disposer, lerp } from '../kit.js';
import { toast } from '../../ui.js';

const EASE = 'cubic-bezier(0.23,1,0.32,1)';
const DRAIN_MS = 300, LABEL_DELAY_MS = 150, HOLD_KEYS = new Set([' ', 'Enter']);

const I = (d) => () => svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const ICONS = {
  trash: I('M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5'),
  send: I('M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z'),
  archive: I('M3 5h18v4H3zM5 9v10h14V9m-9 4h4'),
};
// Vermelho só na ação destrutiva (semântica); as demais usam tons de azul.
const VARIANTS = {
  red:  { icon: 'trash', label: 'Segure para excluir', done: 'Cliente excluído', fg: '#b3323a', bg: '#fdf0f1', bd: '#f3c5c8', hov: '#fbe3e5', solid: '#d1434b', toast: 'Cliente Padaria Brasa excluído.' },
  blue: { icon: 'send', label: 'Segure para enviar', done: 'Proposta enviada', fg: '#1f5f9b', bg: '#e8f3fc', bd: '#bcd9f1', hov: '#d9eaf9', solid: '#2f7bbd', toast: 'Proposta enviada para Loja Aurora.' },
  navy: { icon: 'archive', label: 'Segure para arquivar', done: 'Campanha arquivada', fg: '#164a7c', bg: '#eef3f8', bd: '#c3d3e3', hov: '#e1eaf3', solid: '#0f3560', toast: 'Campanha de outubro arquivada.' },
};

export default function mount(stage, ctx) {
  ensureStyle('hold-button', `
.kk-hold-button-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px;width:100%}
.kk-hold-button-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;height:44px;min-width:180px;max-width:100%;padding:0 16px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--fg);font:600 14px/1 inherit;font-family:inherit;overflow:hidden;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:background-color .15s,border-color .15s,color .15s}
.kk-hold-button-btn:hover{background:var(--hov)}
.kk-hold-button-btn:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.kk-hold-button-btn[data-complete]{background:var(--solid);border-color:var(--solid);color:#fff}
.kk-hold-button-fill{position:absolute;inset:0;background:currentColor;opacity:.15;clip-path:inset(0 100% 0 0);pointer-events:none;transition:opacity .15s}
.kk-hold-button-btn[data-complete] .kk-hold-button-fill{opacity:0}
.kk-hold-button-in{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.kk-hold-button-lab{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.kk-hold-button-lab.out{position:absolute;left:50%;top:50%}
.kk-hold-button-lab svg{width:16px;height:16px;flex-shrink:0}
.kk-hold-button-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-hold-button-cap{font-size:12px;color:var(--mut,#4a6f93);text-align:center;margin:0;max-width:32ch}
`);
  const d = disposer();

  function holdButton(key, holdDuration) {
    const v = VARIANTS[key];
    let phase = 'idle', showHolding = false, labelT = 0, resetT = 0, raf = 0, progress = 0, labelKey = null, cur = null;
    const fill = h('span', { class: 'kk-hold-button-fill', 'aria-hidden': 'true' });
    const inner = h('span', { class: 'kk-hold-button-in' });
    const live = h('span', { class: 'kk-hold-button-sr', 'aria-live': 'polite' });
    const btn = h('button', { type: 'button', class: 'kk-hold-button-btn' }, fill, inner, live);
    btn.style.cssText = `--fg:${v.fg};--bg:${v.bg};--bd:${v.bd};--hov:${v.hov};--solid:${v.solid}`;

    const check = () => {
      const p = svg('path', { d: 'M3.5 8.5 6.5 11.5 12.5 4.5', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1 });
      if (!reduced()) p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 300, delay: 100, easing: EASE, fill: 'backwards' });
      return svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, p);
    };
    function showLabel(k, text, icon) {
      if (k === labelKey) return;
      labelKey = k;
      const old = cur;
      cur = h('span', { class: 'kk-hold-button-lab' }, icon, text);
      inner.append(cur);
      const quick = reduced();
      if (old) {
        old.classList.add('out'); old.setAttribute('aria-hidden', 'true');
        const o = old.animate(quick ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translate(-50%,-50%)', filter: 'blur(0)' }, { opacity: 0, transform: 'translate(-50%,-50%) translateY(-10px)', filter: 'blur(2px)' }], { duration: quick ? 100 : 200, easing: EASE, fill: 'forwards' });
        o.onfinish = () => old.remove();
        cur.animate(quick ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: quick ? 100 : 200, easing: EASE });
      }
    }
    const paint = () => { fill.style.clipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`; };
    function render() {
      if (phase === 'complete') showLabel('complete', v.done, check());
      else if (phase === 'holding' && showHolding) showLabel('holding', 'Continue segurando', ICONS[v.icon]());
      else showLabel('idle', v.label, ICONS[v.icon]());
      live.textContent = phase === 'complete' ? v.done : '';
    }
    function setPhase(next) {
      phase = next;
      if (next === 'complete') btn.dataset.complete = ''; else delete btn.dataset.complete;
      if (next === 'holding') btn.dataset.holding = ''; else delete btn.dataset.holding;
      btn.setAttribute('aria-disabled', next === 'complete' ? 'true' : 'false');
      clearTimeout(labelT); labelT = 0;
      // O rótulo "segurando" espera um pouco para um toque rápido não piscar.
      if (next === 'holding') labelT = setTimeout(() => { showHolding = true; render(); }, LABEL_DELAY_MS);
      else showHolding = false;
      render();
    }
    // Anima `progress` até `to` com duração em ms; `ease` opcional; chama `done` ao fim.
    function run(to, ms, easeOut, done) {
      cancelAnimationFrame(raf);
      const from = progress, t0 = performance.now();
      if (ms <= 0) { progress = to; paint(); done?.(); return; }
      const tick = (now) => {
        const t = Math.min((now - t0) / ms, 1);
        const e = easeOut ? 1 - Math.pow(1 - t, 3) : t;
        progress = lerp(from, to, e); paint();
        if (t < 1) raf = requestAnimationFrame(tick); else done?.();
      };
      raf = requestAnimationFrame(tick);
    }
    function complete() {
      setPhase('complete');
      toast(v.toast, 'ok');
      resetT = setTimeout(() => { resetT = 0; progress = 0; paint(); setPhase('idle'); }, 1800);
    }
    function start() {
      if (phase !== 'idle') return;
      setPhase('holding');
      // Retoma de onde um dreno anterior deixou o preenchimento.
      run(1, (1 - progress) * holdDuration, false, () => { if (phase === 'holding') complete(); });
    }
    function end() {
      if (phase !== 'holding') return;
      setPhase('idle');
      // Quase lá: o preenchimento recua visivelmente; um toque curto mal se mexe.
      run(0, reduced() ? 0 : progress * DRAIN_MS, true);
    }
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // Toque captura o ponteiro implicitamente; solta para o pointerleave cancelar ao sair do botão.
      if (btn.hasPointerCapture?.(e.pointerId)) btn.releasePointerCapture(e.pointerId);
      start();
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) btn.addEventListener(ev, end);
    btn.addEventListener('keydown', (e) => { if (HOLD_KEYS.has(e.key)) { e.preventDefault(); if (!e.repeat) start(); } });
    btn.addEventListener('keyup', (e) => { if (HOLD_KEYS.has(e.key)) end(); });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    render();
    d(() => { cancelAnimationFrame(raf); clearTimeout(labelT); clearTimeout(resetT); });
    return btn;
  }

  stage.append(h('div', { class: 'kk-hold-button-wrap' },
    holdButton('red', 1200), holdButton('blue', 900), holdButton('navy', 1500),
    h('p', { class: 'kk-hold-button-cap' }, 'Segure o botão (ou Espaço/Enter) até completar. Soltar antes desfaz.')));
  return () => d.run();
}
