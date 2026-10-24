// Gradient Button — porte em JS puro do componente "Gradient Button" .
import { h, svg, ensureStyle } from '../kit.js';
import { toast } from '../../ui.js';

// Os três tons do original (esmeralda/roxo/laranja) viram três azuis da Neva.
const TONES = {
  ceu:    { rgb: '74,149,210', border: ['#7fb4e0', '#a5cdee', '#c9e1f6'], base: '#f2f8fe', text: ['#1f5f9b', '#164a7c'], ring: 'rgba(74,149,210,.6)' },
  mar:    { rgb: '47,123,189', border: ['#4a95d2', '#7fb4e0', '#a5cdee'], base: '#e3f0fb', text: ['#164a7c', '#0f3560'], ring: 'rgba(47,123,189,.6)' },
  noite:  { rgb: '22,74,124',  border: ['#2f7bbd', '#4a95d2', '#7fb4e0'], base: '#d7e9f8', text: ['#0f3560', '#0e2236'], ring: 'rgba(22,74,124,.6)' },
};

const ICONS = {
  hand: 'M7 11V6a1.5 1.5 0 0 1 3 0v4m0-5a1.5 1.5 0 0 1 3 0v5m0-4a1.5 1.5 0 0 1 3 0v6c0 4-2 7-6 7-3 0-4.5-1.5-6-4l-2-3a1.5 1.5 0 0 1 2.4-1.8L7 14',
  chart: 'M4 20V10m6 10V4m6 16v-7m5 7H3',
  send: 'M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z',
};
const ico = (d) => svg('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));

export default function mount(stage, ctx) {
  ensureStyle('gradient-button', `
.kk-gradient-button-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px 16px;width:100%}
.kk-gradient-button-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;height:48px;min-width:44px;max-width:100%;padding:0 14px;border:2px solid transparent;border-radius:10px;cursor:pointer;font-family:inherit;background:linear-gradient(to bottom,var(--b0),var(--b1),var(--b2)) border-box;background-origin:border-box;transition:transform .15s cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.kk-gradient-button-btn.sm{height:40px}
.kk-gradient-button-btn.lg{height:56px;padding:0 20px}
.kk-gradient-button-btn.round{border-radius:999px}
.kk-gradient-button-btn:active{transform:scale(.97)}
.kk-gradient-button-btn:focus-visible{outline:none;box-shadow:0 0 0 3px var(--ring)}
.kk-gradient-button-btn:disabled{opacity:.5;cursor:not-allowed}
.kk-gradient-button-l{position:absolute;inset:0;pointer-events:none}
.kk-gradient-button-s{background:#fff}
.kk-gradient-button-b{background:linear-gradient(to right,var(--base),color-mix(in srgb,var(--base) 80%,transparent),color-mix(in srgb,var(--base) 90%,transparent));opacity:.9}
.kk-gradient-button-o{background:linear-gradient(to bottom,rgba(var(--rgb),.3),rgba(var(--rgb),.2),rgba(var(--rgb),.2));opacity:.8}
.kk-gradient-button-a{background:linear-gradient(to bottom right,rgba(var(--rgb),.2),rgba(var(--rgb),.1),rgba(var(--rgb),.3))}
.kk-gradient-button-g{box-shadow:inset 0 0 10px rgba(var(--rgb),.2)}
.kk-gradient-button-h{background:linear-gradient(to right,rgba(var(--rgb),.3),rgba(var(--rgb),.2),rgba(var(--rgb),.3));opacity:0;transition:opacity .2s ease-out}
@media(hover:hover){.kk-gradient-button-btn:hover .kk-gradient-button-h{opacity:1}}
.kk-gradient-button-c{position:relative;display:flex;align-items:center;gap:8px;color:var(--t1)}
.kk-gradient-button-t{font-size:18px;font-weight:300;letter-spacing:-.04em;background:linear-gradient(to bottom,var(--t0),var(--t1));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap}
.kk-gradient-button-btn.sm .kk-gradient-button-t{font-size:16px}
.kk-gradient-button-i{display:flex;color:var(--t0)}
.kk-gradient-button-cap{font-size:12px;color:var(--mut,#4a6f93);text-align:center;margin:0}
@media(prefers-reduced-motion:reduce){.kk-gradient-button-btn{transition:none}.kk-gradient-button-btn:active{transform:none}.kk-gradient-button-h{transition:none}}
`);
  function make(tone, label, iconKey, opts = {}) {
    const t = TONES[tone];
    const btn = h('button', { type: 'button', class: 'kk-gradient-button-btn' + (opts.cls ? ' ' + opts.cls : ''), onclick: () => toast(opts.msg, 'ok') },
      ...['s', 'b', 'o', 'a', 'g', 'h'].map((k) => h('span', { class: 'kk-gradient-button-l kk-gradient-button-' + k, 'aria-hidden': 'true' })),
      h('span', { class: 'kk-gradient-button-c' }, iconKey ? h('span', { class: 'kk-gradient-button-i', 'aria-hidden': 'true' }, ico(ICONS[iconKey])) : null, h('span', { class: 'kk-gradient-button-t' }, label)));
    btn.style.cssText = `--b0:${t.border[0]};--b1:${t.border[1]};--b2:${t.border[2]};--rgb:${t.rgb};--base:${t.base};--t0:${t.text[0]};--t1:${t.text[1]};--ring:${t.ring}`;
    return btn;
  }
  const row = h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:12px;max-width:100%' },
    make('ceu', 'Boas-vindas', 'hand', { msg: 'Bem-vindo à Neva Growth!' }),
    make('mar', 'Ver relatório', 'chart', { msg: 'Relatório de vendas aberto no painel.' }),
    make('noite', 'Enviar proposta', 'send', { cls: 'round', msg: 'Proposta enviada ao cliente.' }));
  stage.append(h('div', { class: 'kk-gradient-button-wrap' }, row, h('p', { class: 'kk-gradient-button-cap' }, 'Três tons de azul, borda em degradê e brilho interno.')));
  return () => {};
}
