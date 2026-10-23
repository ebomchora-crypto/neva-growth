// Slide Text Button — porte em JS puro do componente "Slide Text Button" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced } from '../kit.js';
import { toast } from '../../ui.js';

export default function mount(stage, ctx) {
  ensureStyle('slide-text-button', `
.kk-slide-text-button-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px 16px;width:100%}
.kk-slide-text-button-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;height:44px;min-width:min(224px,100%);padding:0 28px;border-radius:10px;font:600 15px/1 inherit;letter-spacing:-.02em;cursor:pointer;text-decoration:none;border:1px solid transparent;
  transition:background-color .15s cubic-bezier(.23,1,.32,1),transform .15s cubic-bezier(.23,1,.32,1),opacity .2s,translate .2s;animation:kk-slide-text-button-in .35s cubic-bezier(.23,1,.32,1) both}
.kk-slide-text-button-btn.is-default{background:var(--ice-800,#164a7c);color:#fff}
.kk-slide-text-button-btn.is-default:hover{background:var(--ice-700,#1f5f9b)}
.kk-slide-text-button-btn.is-ghost{background:transparent;color:var(--ink,#0e2236);border-color:var(--ice-300,#a5cdee)}
.kk-slide-text-button-btn.is-ghost:hover{background:rgba(74,149,210,.1)}
.kk-slide-text-button-btn:active{transform:scale(.97)}
.kk-slide-text-button-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-slide-text-button-roll{display:grid;justify-items:center;transition:transform .2s cubic-bezier(.77,0,.175,1)}
.kk-slide-text-button-roll>span{grid-area:1/1;white-space:nowrap;transition:opacity .2s}
.kk-slide-text-button-roll>span+span{transform:translateY(100%);opacity:0}
.kk-slide-text-button-btn:hover .kk-slide-text-button-roll,.kk-slide-text-button-btn:focus-visible .kk-slide-text-button-roll{transform:translateY(-100%)}
.kk-slide-text-button-btn:hover .kk-slide-text-button-roll>span:first-child,.kk-slide-text-button-btn:focus-visible .kk-slide-text-button-roll>span:first-child{opacity:0}
.kk-slide-text-button-btn:hover .kk-slide-text-button-roll>span+span,.kk-slide-text-button-btn:focus-visible .kk-slide-text-button-roll>span+span{opacity:1}
@keyframes kk-slide-text-button-in{from{opacity:0;translate:8px 0}to{opacity:1;translate:0 0}}
.kk-slide-text-button-note{font-size:12px;color:var(--mut,#4a6f93);text-align:center;margin:0}
@media (prefers-reduced-motion:reduce){.kk-slide-text-button-btn{animation:none}.kk-slide-text-button-roll{transition:none}.kk-slide-text-button-btn:active{transform:none}}
`);
  const items = [
    { variant: 'default', text: 'Ver relatório de vendas', hover: 'Abrir relatório', msg: 'Relatório de vendas aberto' },
    { variant: 'ghost', text: 'Falar com a equipe', hover: 'Enviar mensagem', msg: 'Mensagem enviada à equipe' },
    { variant: 'default', text: 'Criar campanha', hover: 'Começar agora', msg: 'Nova campanha criada' },
  ].slice(0, ctx.big ? 3 : 2);
  const btn = (it) => h('button', { type: 'button', class: `kk-slide-text-button-btn is-${it.variant}`, onClick: () => toast(it.msg, 'ok') },
    h('span', { class: 'kk-slide-text-button-roll' },
      h('span', it.text),
      h('span', { 'aria-hidden': 'true' }, it.hover)));
  const root = h('div', { class: 'kk-slide-text-button-wrap' }, items.map(btn),
    h('p', { class: 'kk-slide-text-button-note' }, reduced() ? 'Passe o mouse ou use Tab para ver o texto alternar.' : 'Passe o mouse (ou use Tab) para o texto deslizar.'));
  stage.append(root);
  return () => root.remove();
}
