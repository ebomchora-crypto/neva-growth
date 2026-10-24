// Switch Button — porte em JS puro do componente "Switch Button" .
import { h, svg, ensureStyle, reduced, disposer } from '../kit.js';

const EASE_REVEAL = 'cubic-bezier(0.4,0,0.2,1)';
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
  const r = (deg * Math.PI) / 180, at = (n) => [+(12 + n * Math.cos(r)).toFixed(2), +(12 + n * Math.sin(r)).toFixed(2)];
  return { from: at(7.5), to: at(10) };
});
let uid = 0;

export default function mount(stage, ctx) {
  ensureStyle('switch-button', `
.kk-switch-button-root{--bg:linear-gradient(160deg,#f6fbff,#e6f1fb);--card:#fff;--ink:#0e2236;--mut:#4a6f93;--line:#c9e1f6;--btnbg:#fff;--btnhov:#f2f8fe;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg);color:var(--ink);box-sizing:border-box}
.kk-switch-button-root.dark{--bg:linear-gradient(160deg,#0b1b2e,#0f3560);--card:#12253b;--ink:#e3f0fb;--mut:#8fb5d9;--line:#25456a;--btnbg:#12253b;--btnhov:#1a3452}
.kk-switch-button-card{width:100%;max-width:280px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 28px -16px rgba(15,53,96,.5)}
.kk-switch-button-card h4{margin:0;font-size:14px;font-weight:700;color:var(--ink)}
.kk-switch-button-card p{margin:0;font-size:12px;color:var(--mut)}
.kk-switch-button-val{font-size:26px;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
.kk-switch-button-bar{height:6px;border-radius:99px;background:var(--line);overflow:hidden}
.kk-switch-button-bar i{display:block;height:100%;width:68%;border-radius:99px;background:linear-gradient(90deg,#4a95d2,#1f5f9b)}
.kk-switch-button-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kk-switch-button-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--btnbg);color:var(--ink);font:600 14px/1 inherit;font-family:inherit;cursor:pointer;transition:background-color .15s,border-color .15s;-webkit-tap-highlight-color:transparent}
.kk-switch-button-btn:hover{background:var(--btnhov)}
.kk-switch-button-btn:focus-visible{outline:2px solid #4a95d2;outline-offset:3px}
.kk-switch-button-btn.sq{width:36px;padding:0}
.kk-switch-button-btn.sm{height:36px;font-size:13px;padding:0 10px}
.kk-switch-button-btn.lg{height:40px;font-size:15px;padding:0 14px}
.kk-switch-button-btn.lg.sq{width:40px;padding:0}
.kk-switch-button-ic{overflow:visible;flex-shrink:0;pointer-events:none}
.kk-switch-button-ic [data-p]{transform-box:view-box;transform-origin:12px 12px}
.kk-switch-button-ic [data-p=disc]{transition:transform .38s cubic-bezier(.23,1,.32,1) 0s}
.kk-switch-button-ic [data-p=bite]{transform:translate(10px,-10px);transition:transform .38s cubic-bezier(.65,0,.35,1) 0s}
.kk-switch-button-ic [data-p=ray]{transition:transform .26s cubic-bezier(.23,1,.32,1) calc(140ms + var(--i)*22ms),opacity .26s cubic-bezier(.23,1,.32,1) calc(140ms + var(--i)*22ms)}
.dark .kk-switch-button-ic [data-p=disc]{transform:scale(1.8);transition-delay:40ms}
.dark .kk-switch-button-ic [data-p=bite]{transform:none;transition-delay:60ms}
.dark .kk-switch-button-ic [data-p=ray]{transform:scale(.5);opacity:0;transition-delay:calc(var(--i)*18ms)}
.kk-switch-button-lbl{display:grid;line-height:1}
.kk-switch-button-lbl span{grid-area:1/1;transition:opacity .24s cubic-bezier(.23,1,.32,1),filter .24s cubic-bezier(.23,1,.32,1)}
.kk-switch-button-lbl .n{opacity:0;filter:blur(3px)}
.dark .kk-switch-button-lbl .l{opacity:0;filter:blur(3px)}
.dark .kk-switch-button-lbl .n{opacity:1;filter:none}
.kk-switch-button-root.nt *{transition:none!important}
.kk-switch-button-ov{position:absolute;inset:0;z-index:3;pointer-events:none}
@media(prefers-reduced-motion:reduce){.kk-switch-button-ic [data-p],.kk-switch-button-lbl span{transition:none!important}}
`);
  const d = disposer();
  let dark = false, running = false;

  function icon(px) {
    const id = 'kk-switch-moon-' + (++uid);
    const s = svg('svg', { class: 'kk-switch-button-ic', viewBox: '0 0 24 24', width: px, height: px, fill: 'none', 'aria-hidden': 'true' },
      svg('mask', { id }, svg('rect', { x: -4, y: -4, width: 32, height: 32, fill: 'white' }), svg('circle', { cx: 17, cy: 7, r: 7.5, fill: 'black', 'data-p': 'bite' })),
      svg('g', { mask: `url(#${id})` }, svg('circle', { cx: 12, cy: 12, r: 4.75, fill: 'currentColor', 'data-p': 'disc' })),
      svg('g', { stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' },
        RAYS.map((r, i) => { const l = svg('line', { x1: r.from[0], y1: r.from[1], x2: r.to[0], y2: r.to[1], 'data-p': 'ray' }); l.style.setProperty('--i', i); return l; })));
    return s;
  }

  const buttons = [];
  function makeBtn(size, showLabel, px) {
    const b = h('button', { type: 'button', class: `kk-switch-button-btn ${size}${showLabel ? '' : ' sq'}`, 'aria-label': 'Tema escuro do palco', 'aria-pressed': 'false', onclick: () => toggle(b) },
      icon(px), showLabel ? h('span', { class: 'kk-switch-button-lbl', 'aria-hidden': 'true' }, h('span', { class: 'l' }, 'Claro'), h('span', { class: 'n' }, 'Escuro')) : null);
    buttons.push(b);
    return b;
  }
  const card = h('div', { class: 'kk-switch-button-card' },
    h('div', null, h('h4', 'Vendas do mês'), p('Meta de outubro: R$ 48.000')),
    h('div', { class: 'kk-switch-button-val' }, 'R$ 32.640'),
    h('div', { class: 'kk-switch-button-bar', role: 'img', 'aria-label': '68% da meta' }, h('i')),
    h('div', { class: 'kk-switch-button-row' }, makeBtn('lg', true, 18), makeBtn('sm', false, 16), makeBtn('sm', true, 14)));
  function p(t) { return h('p', t); }
  const root = h('div', { class: 'kk-switch-button-root' }, card);
  stage.append(root);

  function apply(next) {
    dark = next;
    root.classList.toggle('dark', dark);
    for (const b of buttons) b.setAttribute('aria-pressed', String(dark));
  }

  // Revelação em círculo a partir do botão, só dentro do palco: um clone no tema novo
  // cresce por cima (clip-path) e depois vira o estado real. O tema do app não muda.
  function toggle(btn) {
    if (running) return;
    const next = !dark;
    if (reduced()) { apply(next); return; }
    running = true;
    const sr = root.getBoundingClientRect(), br = btn.getBoundingClientRect();
    const x = br.left + br.width / 2 - sr.left, y = br.top + br.height / 2 - sr.top;
    const radius = Math.hypot(Math.max(x, sr.width - x), Math.max(y, sr.height - y));
    const ghost = root.cloneNode(true);
    ghost.removeAttribute('aria-live'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    ghost.classList.add('kk-switch-button-ov');
    ghost.querySelectorAll('mask').forEach((m) => { const old = m.id, nid = old + '-g'; m.id = nid; ghost.querySelectorAll(`[mask="url(#${old})"]`).forEach((g) => g.setAttribute('mask', `url(#${nid})`)); });
    root.append(ghost);
    // O clone nasce no tema antigo e muda já, para o sol virar lua dentro do círculo.
    ghost.getBoundingClientRect();
    ghost.classList.toggle('dark', next);
    const a = ghost.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 500, easing: EASE_REVEAL, fill: 'forwards' });
    // Ao fim, o estado real assume sem transições (o clone já mostrou tudo).
    const done = () => { root.classList.add('nt'); apply(next); ghost.remove(); root.getBoundingClientRect(); root.classList.remove('nt'); running = false; };
    a.onfinish = done; a.oncancel = () => { ghost.remove(); running = false; };
    d(() => { a.cancel(); ghost.remove(); });
  }
  return () => d.run();
}
