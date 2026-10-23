// Loader — porte em JS puro do componente "Loader" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced } from '../kit.js';

const SIZES = { sm: { px: 80, label: 'Pequeno' }, md: { px: 128, label: 'Médio' }, lg: { px: 160, label: 'Grande' } };
// Cada anel é uma máscara radial sobre um gradiente cônico, tingido por currentColor.
const ring = (stops) => `radial-gradient(circle at 50% 50%, ${stops})`;
const RINGS = [
  { bg: 'conic-gradient(from 0deg, transparent 0deg, currentColor 90deg, transparent 180deg)', mask: ring('transparent 35%, black 37%, black 39%, transparent 41%'), op: 0.8, dur: 3 },
  { bg: 'conic-gradient(from 0deg, transparent 0deg, currentColor 120deg, color-mix(in srgb, currentColor 50%, transparent) 240deg, transparent 360deg)', mask: ring('transparent 42%, black 44%, black 48%, transparent 50%'), op: 0.9, dur: 1.2 },
  { bg: 'conic-gradient(from 180deg, transparent 0deg, color-mix(in srgb, currentColor 60%, transparent) 45deg, transparent 90deg)', mask: ring('transparent 52%, black 54%, black 56%, transparent 58%'), op: 0.35, dur: 4, rev: true },
  { bg: 'conic-gradient(from 270deg, transparent 0deg, color-mix(in srgb, currentColor 40%, transparent) 20deg, transparent 40deg)', mask: ring('transparent 61%, black 62%, black 63%, transparent 64%'), op: 0.5, dur: 3.5 },
];
const TASKS = [
  ['Configurando sua conta...', 'Aguarde enquanto preparamos tudo para você'],
  ['Importando seus clientes...', 'Lemos 1.284 contatos da planilha'],
  ['Sincronizando as vendas...', 'Conferindo os pedidos dos últimos 30 dias'],
  ['Montando o relatório...', 'Quase lá, só faltam alguns gráficos'],
];

export default function mount(stage, ctx) {
  ensureStyle('loader', `
.kk-loader-root{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:18px 14px;min-height:240px;color:var(--ink,#0e2236)}
.kk-loader-orb{position:relative;color:var(--ice-700,#1f5f9b);transition:width .3s,height .3s}
.kk-loader-ring{position:absolute;inset:0;border-radius:50%;animation:kk-loader-spin linear infinite}
.kk-loader-rm .kk-loader-ring{animation:kk-loader-pulse 2s ease-in-out infinite}
.kk-loader-paused .kk-loader-ring{animation-play-state:paused}
@keyframes kk-loader-spin{to{transform:rotate(360deg)}}
@keyframes kk-loader-pulse{50%{opacity:.3}}
.kk-loader-txt{display:block;text-align:center;max-width:15rem;transition:opacity .2s}
.kk-loader-txt.out{opacity:0}
.kk-loader-t{display:block;font-weight:600;line-height:1.15;letter-spacing:-.02em;color:var(--ink,#0e2236)}
.kk-loader-s{display:block;margin-top:6px;font-size:13px;line-height:1.45;color:var(--mut,#4a6f93)}
.kk-loader-bar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.kk-loader-btn{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:inherit;font-size:13px;cursor:pointer}
.kk-loader-btn[aria-pressed=true]{background:var(--ice-700,#1f5f9b);border-color:var(--ice-700,#1f5f9b);color:#fff}
.kk-loader-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
`);
  let size = ctx.big ? 'lg' : 'md', task = 0, paused = false, timer = 0, swap = 0;
  const rm = reduced();

  const orb = h('div', { class: 'kk-loader-orb', 'aria-hidden': 'true' }, RINGS.map((r) => h('div', {
    class: 'kk-loader-ring',
    style: `background:${r.bg};-webkit-mask:${r.mask};mask:${r.mask};opacity:${r.op};animation-duration:${r.dur}s;${r.rev ? 'animation-direction:reverse' : ''}`,
  })));
  const title = h('span', { class: 'kk-loader-t' });
  const sub = h('span', { class: 'kk-loader-s' });
  const txt = h('output', { class: 'kk-loader-txt', 'aria-live': 'polite' }, title, sub);
  const sizeBtns = Object.entries(SIZES).map(([k, v]) => h('button', { type: 'button', class: 'kk-loader-btn', 'aria-pressed': String(k === size), onclick: () => { size = k; paint(); } }, v.label));
  const pauseBtn = h('button', { type: 'button', class: 'kk-loader-btn', 'aria-pressed': 'false', onclick: () => { paused = !paused; paint(); } }, 'Pausar');
  const nextBtn = h('button', { type: 'button', class: 'kk-loader-btn', onclick: () => { next(); schedule(); } }, 'Próxima etapa');
  const root = h('div', { class: 'kk-loader-root' + (rm ? ' kk-loader-rm' : '') }, orb, txt, h('div', { class: 'kk-loader-bar', role: 'group', 'aria-label': 'Controles do loader' }, sizeBtns, pauseBtn, nextBtn));

  function paint() {
    const s = SIZES[size];
    orb.style.width = orb.style.height = s.px + 'px';
    title.style.fontSize = size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px';
    sub.style.fontSize = size === 'sm' ? '12px' : size === 'md' ? '13px' : '14px';
    root.classList.toggle('kk-loader-paused', paused);
    pauseBtn.setAttribute('aria-pressed', String(paused)); pauseBtn.textContent = paused ? 'Retomar' : 'Pausar';
    Object.keys(SIZES).forEach((k, i) => sizeBtns[i].setAttribute('aria-pressed', String(k === size)));
    title.textContent = TASKS[task][0]; sub.textContent = TASKS[task][1];
  }
  // Troca o texto com um fade curto, como o "starting:opacity-0" do original.
  function next() {
    txt.classList.add('out'); clearTimeout(swap);
    swap = setTimeout(() => { task = (task + 1) % TASKS.length; paint(); txt.classList.remove('out'); }, 200);
  }
  function schedule() { clearInterval(timer); timer = setInterval(() => { if (!paused && !document.hidden) next(); }, 3200); }

  stage.append(root); paint(); schedule();
  return () => { clearInterval(timer); clearTimeout(swap); root.remove(); };
}
