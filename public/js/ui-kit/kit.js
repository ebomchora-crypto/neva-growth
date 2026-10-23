// Utilidades comuns dos componentes portados do Kokonut UI (JavaScript puro, sem React/Tailwind/Motion).
// Cada componente é um módulo em ./c/<slug>.js com `export default function mount(stage, ctx) { ...; return cleanup }`.
import { h, icon } from '../ui.js';
export { h, icon };

/** Injeta o CSS de um componente uma única vez (use classes com prefixo `kk-<slug>-`). */
export function ensureStyle(id, css) {
  if (document.getElementById('kk-style-' + id)) return;
  const s = document.createElement('style'); s.id = 'kk-style-' + id; s.textContent = css; document.head.append(s);
}
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = () => matchMedia('(pointer: fine)').matches;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = lerp;
export const rand = (a, b) => a + Math.random() * (b - a);

/** Cria um elemento SVG (atributos em objeto; filhos opcionais). */
export function svg(tag, attrs = {}, ...kids) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v));
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}

/** Laço de animação que para sozinho quando o componente sai de cena. `fn(dt, t)` em segundos; devolve `stop()`. */
export function loop(fn, { fps = 60 } = {}) {
  let raf = 0, last = 0, t = 0, on = true; const min = 1000 / fps;
  const tick = (now) => {
    if (!on) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) { last = 0; return; }
    if (last && now - last < min - 1) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now; t += dt; fn(dt, t);
  };
  raf = requestAnimationFrame(tick);
  return () => { on = false; cancelAnimationFrame(raf); };
}

/** Mola crítica simples: `s = spring(valor, { k, c })`; `s.to(alvo)`; `s.step(dt)` devolve o valor atual. */
export function spring(value = 0, { k = 170, c = 22 } = {}) {
  let x = value, v = 0, target = value;
  return {
    get value() { return x; }, get target() { return target; }, get settled() { return Math.abs(target - x) < 0.001 && Math.abs(v) < 0.001; },
    to(t) { target = t; }, set(t) { x = target = t; v = 0; },
    kick(dv) { v += dv; },
    step(dt) { const n = Math.max(1, Math.ceil(dt / 0.008)); const h2 = dt / n; for (let i = 0; i < n; i++) { v += (-k * (x - target) - c * v) * h2; x += v * h2; } return x; },
  };
}

/** Eventos de ponteiro com captura; devolve `off()`. */
export function drag(el, { start, move, end } = {}) {
  const down = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    el.setPointerCapture?.(e.pointerId); const o = { x: e.clientX, y: e.clientY, t: performance.now() };
    start?.(e, o);
    const mv = (ev) => move?.(ev, { dx: ev.clientX - o.x, dy: ev.clientY - o.y, ox: o.x, oy: o.y, t: performance.now() - o.t });
    const up = (ev) => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); end?.(ev, { dx: ev.clientX - o.x, dy: ev.clientY - o.y, t: performance.now() - o.t }); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  el.addEventListener('pointerdown', down);
  return () => el.removeEventListener('pointerdown', down);
}

/** Observa o tamanho do elemento; `fn({width,height})` roda já na primeira medida. */
export function onResize(el, fn) {
  const ro = new ResizeObserver(() => fn({ width: el.clientWidth, height: el.clientHeight }));
  ro.observe(el); fn({ width: el.clientWidth, height: el.clientHeight });
  return () => ro.disconnect();
}

/** Junta funções de limpeza. */
export const disposer = () => { const fns = []; const d = (fn) => { if (fn) fns.push(fn); return fn; }; d.run = () => { while (fns.length) { try { fns.pop()(); } catch { /* ok */ } } }; return d; };

/** Cores da Neva para os componentes (não use verde/roxo/laranja de marca). */
export const PALETTE = { ink: '#0e2236', mut: '#4a6f93', line: '#d3e6f6', ice50: '#f2f8fe', ice100: '#e3f0fb', ice200: '#c9e1f6', ice300: '#a5cdee', ice400: '#7fb4e0', ice500: '#4a95d2', ice600: '#2f7bbd', ice700: '#1f5f9b', ice800: '#164a7c', ice900: '#0f3560', ok: '#1f9d6b', bad: '#d1434b' };
