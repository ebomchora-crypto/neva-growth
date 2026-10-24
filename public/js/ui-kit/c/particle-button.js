// Particle Button — porte em JS puro do componente "Particle Button" .
import { h, svg, ensureStyle, reduced, clamp, disposer, PALETTE } from '../kit.js';

const EASE = 'cubic-bezier(0.23,1,0.32,1)';
const PARTICLES = 18, GRAVITY = 0.0016, DRAG = 0.0022, LIFETIME = 650, BLEED = 64;

export default function mount(stage, ctx) {
  ensureStyle('particle-button', `
.kk-particle-button-wrap{display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px 16px;max-width:100%}
.kk-particle-button-row{display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.kk-particle-button-cap{font-size:12px;color:var(--mut,#4a6f93);text-align:center;margin:0;max-width:30ch}
.kk-particle-button-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;height:44px;min-width:44px;padding:0 18px;border:1px solid transparent;border-radius:12px;background:linear-gradient(180deg,#2f7bbd,#1f5f9b);color:#fff;font:600 14px/1 inherit;font-family:inherit;cursor:pointer;overflow:visible;transition:background-color .2s,color .2s,width .35s ${EASE},transform .15s;box-shadow:0 6px 16px -8px rgba(31,95,155,.7);-webkit-tap-highlight-color:transparent}
.kk-particle-button-btn.sec{background:#fff;color:#164a7c;border-color:#a5cdee;box-shadow:none}
.kk-particle-button-btn:active{transform:scale(.97)}
.kk-particle-button-btn:focus-visible{outline:2px solid #4a95d2;outline-offset:3px}
.kk-particle-button-btn[data-status=error]{background:#d1434b;color:#fff;border-color:transparent}
.kk-particle-button-btn[aria-busy=true]{cursor:progress}
.kk-particle-button-in{position:relative;display:flex;align-items:center;justify-content:center;align-self:stretch;margin:-8px 0;padding:8px 0;overflow:hidden}
.kk-particle-button-lab{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex-shrink:0}
.kk-particle-button-lab.out{position:absolute;left:50%;top:50%}
.kk-particle-button-lab svg{width:16px;height:16px;flex-shrink:0}
.kk-particle-button-spin{animation:kk-particle-button-rot .7s linear infinite}
@keyframes kk-particle-button-rot{to{transform:rotate(360deg)}}
.kk-particle-button-cv{position:absolute;pointer-events:none;display:block}
.kk-particle-button-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(prefers-reduced-motion:reduce){.kk-particle-button-spin{animation:none}.kk-particle-button-btn{transition:background-color .2s,color .2s}}
`);
  const d = disposer();

  const spinner = () => svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true', class: 'kk-particle-button-spin' },
    svg('circle', { cx: 8, cy: 8, r: 6, stroke: 'currentColor', 'stroke-width': 2, opacity: .25 }),
    svg('path', { d: 'M14 8a6 6 0 0 0-6-6', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }));
  // Check desenhado: anima o traço com stroke-dashoffset (equivale ao pathLength do original).
  const check = () => {
    const p = svg('path', { d: 'M3.5 8.5 6.5 11.5 12.5 4.5', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1 });
    if (!reduced()) p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 300, delay: 80, easing: EASE, fill: 'backwards' });
    return svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, p);
  };
  const alertIcon = () => svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    svg('circle', { cx: 8, cy: 8, r: 6.5, stroke: 'currentColor', 'stroke-width': 1.6 }),
    svg('path', { d: 'M8 4.8v3.8M8 11.2h.01', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  const sendIcon = () => svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    svg('path', { d: 'M2 8h11M9 4l4 4-4 4', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

  // Cada botão tem um estado próprio; `action` devolve uma Promise (rejeitada = erro).
  function makeButton({ idle, pending, success, error, action, secondary }) {
    const cfg = { idle, pending, success, error };
    let status = 'idle', pressX = null, resetT = 0, runId = 0, cur = null, burstStop = null;
    const inner = h('span', { class: 'kk-particle-button-in' });
    const live = h('span', { class: 'kk-particle-button-sr', 'aria-live': 'polite' });
    const btn = h('button', { type: 'button', class: 'kk-particle-button-btn' + (secondary ? ' sec' : ''), 'data-status': 'idle' }, inner, live);

    const content = (s) => {
      if (s === 'pending') return [spinner(), cfg.pending];
      if (s === 'success') return [check(), cfg.success];
      if (s === 'error') return [alertIcon(), cfg.error];
      return [cfg.idle, cfg.icon ? cfg.icon() : null];
    };
    function chrome() {
      const cs = getComputedStyle(btn);
      return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    }
    function setStatus(next) {
      if (next === status && cur) return;
      const prev = status; status = next;
      btn.dataset.status = next;
      btn.setAttribute('aria-busy', next === 'pending' ? 'true' : 'false');
      live.textContent = next === 'idle' ? '' : cfg[next];
      const old = cur;
      cur = h('span', { class: 'kk-particle-button-lab', 'data-label': next }, content(next));
      inner.append(cur);
      // A largura acompanha o rótulo que entra; o que sai flutua por cima.
      const w = Math.ceil(cur.scrollWidth + chrome());
      if (btn.dataset.sized) btn.style.width = w + 'px'; else { btn.style.width = w + 'px'; btn.dataset.sized = '1'; }
      const quick = reduced();
      if (old) {
        old.classList.add('out'); old.setAttribute('aria-hidden', 'true');
        const o = old.animate(quick ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translate(-50%,-50%)', filter: 'blur(0)' }, { opacity: 0, transform: 'translate(-50%,-50%) translateY(-8px)', filter: 'blur(2px)' }], { duration: quick ? 120 : 200, easing: EASE, fill: 'forwards' });
        o.onfinish = () => old.remove();
        cur.animate(quick ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: quick ? 120 : 200, easing: EASE });
      }
      if (prev !== next && !quick) {
        if (next === 'success') burst();
        if (next === 'error') inner.animate({ transform: ['translateX(0)', 'translateX(-5px)', 'translateX(5px)', 'translateX(-3px)', 'translateX(3px)', 'translateX(0)'] }, { duration: 320, easing: 'ease-out' });
      }
    }
    function burst() {
      burstStop?.();
      const w = btn.offsetWidth, hgt = btn.offsetHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      const cw = w + BLEED * 2, ch = hgt + BLEED * 2;
      const cv = h('canvas', { class: 'kk-particle-button-cv', 'aria-hidden': 'true' });
      cv.style.cssText = `left:${-BLEED}px;top:${-BLEED}px;width:${cw}px;height:${ch}px`;
      cv.width = cw * dpr; cv.height = ch * dpr;
      const c = cv.getContext('2d'); c.scale(dpr, dpr);
      btn.append(cv);
      const originX = pressX ?? w / 2;
      const ps = Array.from({ length: PARTICLES }, (_, i) => {
        const x = clamp(originX + (Math.random() - .5) * Math.min(w, 120), 4, w - 4);
        const side = x < w / 2 ? -1 : 1, speed = .18 + Math.random() * .22, a = -Math.PI / 2 + side * Math.random() * .9, chip = i % 3 === 0;
        return { x, y: 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, a: Math.random() * Math.PI, sp: (Math.random() - .5) * .02, w: chip ? 5 : 3, h: chip ? 2 : 3 };
      });
      const color = getComputedStyle(btn).backgroundColor;
      const t0 = performance.now(); let last = t0, raf = 0;
      const tick = (now) => {
        const dt = Math.min(now - last, 32); last = now;
        const t = (now - t0) / LIFETIME;
        c.clearRect(0, 0, cw, ch);
        if (t >= 1) { cv.remove(); burstStop = null; return; }
        c.fillStyle = color; c.globalAlpha = 1 - t * t;
        for (const p of ps) {
          p.vx *= 1 - DRAG * dt; p.vy = p.vy * (1 - DRAG * dt) + GRAVITY * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.sp * dt;
          c.save(); c.translate(p.x + BLEED, p.y + BLEED); c.rotate(p.a); c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      burstStop = () => { cancelAnimationFrame(raf); cv.remove(); burstStop = null; };
    }
    function settle(next) {
      setStatus(next);
      resetT = setTimeout(() => { resetT = 0; setStatus('idle'); }, next === 'success' ? 1600 : 3200);
    }
    btn.addEventListener('click', (e) => {
      if (status === 'pending') return;
      const r = btn.getBoundingClientRect();
      // Clique de teclado reporta 0,0: a explosão sai do centro.
      pressX = e.clientX === 0 && e.clientY === 0 ? null : e.clientX - r.left;
      clearTimeout(resetT);
      const run = ++runId;
      setStatus('pending');
      Promise.resolve().then(action).then(
        () => { if (run === runId) settle('success'); },
        () => { if (run === runId) settle('error'); });
    });
    cfg.icon = secondary ? null : sendIcon;
    setStatus('idle');
    // Largura inicial já medida; recalcula se a fonte carregar depois.
    document.fonts?.ready.then(() => { if (cur) btn.style.width = Math.ceil(cur.scrollWidth + chrome()) + 'px'; });
    d(() => { clearTimeout(resetT); burstStop?.(); runId++; });
    return btn;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let tentativas = 0;
  const salvar = makeButton({ idle: 'Salvar proposta', pending: 'Salvando', success: 'Proposta salva', error: 'Tentar de novo', action: () => wait(1200) });
  // Falha na primeira tentativa para mostrar o estado de erro; a seguinte conclui.
  const sync = makeButton({ idle: 'Sincronizar vendas', pending: 'Sincronizando', success: 'Vendas atualizadas', error: 'Falhou, tentar de novo', secondary: true,
    action: async () => { await wait(1000); if (tentativas++ % 2 === 0) throw new Error('timeout'); } });

  stage.append(h('div', { class: 'kk-particle-button-wrap' },
    h('div', { class: 'kk-particle-button-row' }, salvar, sync),
    h('p', { class: 'kk-particle-button-cap' }, 'Clique para ver o carregamento, o check desenhado e as partículas. O botão da direita falha na primeira vez.')));
  return () => d.run();
}
