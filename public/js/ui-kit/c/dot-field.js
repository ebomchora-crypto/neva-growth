// Dot Field — porte em JS puro do componente "Dot Field" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// A física (ruído lento, esteira do ponteiro, onda de choque no clique) vem do módulo do app; aqui fica o demo no palco.
import { h, ensureStyle, disposer, PALETTE } from '../kit.js';
import { dotField } from '../../dot-field.js';

// Espaçamento entre pontos por botão: [rótulo, px]
const DENSITIES = [['Fino', 12], ['Médio', 16], ['Grosso', 24]];

const CSS = `
.kk-dot-field-root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px 16px 92px;overflow:hidden;touch-action:pan-y;background:#fff}
.kk-dot-field-root>.dotfield{z-index:0}
.kk-dot-field-text{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;max-width:26em;text-align:center;pointer-events:none}
.kk-dot-field-text h3{margin:0;font-size:clamp(22px,8cqw,46px);line-height:1.05;letter-spacing:-.03em;font-weight:700;color:var(--ink,${PALETTE.ink});text-wrap:balance}
.kk-dot-field-text p{margin:0;max-width:22em;font-size:clamp(12px,3.3cqw,16px);line-height:1.45;color:var(--mut,${PALETTE.mut})}
.kk-dot-field-bar{position:absolute;z-index:1;left:10px;right:10px;bottom:10px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.kk-dot-field-chip{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:rgba(255,255,255,.92);color:${PALETTE.ice800};font:600 12px/1 inherit;font-family:inherit;cursor:pointer}
.kk-dot-field-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-dot-field-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('dot-field', CSS);
  const off = disposer();
  let stop = null, seed = 7, spacing = 16;
  // Recria o campo quando a densidade ou a semente muda (o campo é calculado na criação).
  const remount = () => { stop?.(); stop = dotField(root, { spacing, seed, color: 'rgb(47,123,189)' }); };

  const chips = DENSITIES.map(([label, px]) => h('button', {
    type: 'button', class: 'kk-dot-field-chip', 'aria-pressed': String(px === spacing),
    onclick: () => { spacing = px; chips.forEach((c, i) => c.setAttribute('aria-pressed', String(DENSITIES[i][1] === px))); remount(); },
  }, label));
  const root = h('div', { class: 'kk-dot-field-root' },
    h('div', { class: 'kk-dot-field-text' },
      h('h3', {}, 'Meio-tom em movimento'),
      h('p', {}, 'Passe o cursor para deixar uma esteira; clique para soltar uma onda.')),
    h('div', { class: 'kk-dot-field-bar', role: 'group', 'aria-label': 'Densidade dos pontos' }, ...chips,
      h('button', { type: 'button', class: 'kk-dot-field-chip', onclick: () => { seed = (seed * 7 + 3) % 97 + 1; remount(); } }, 'Novo desenho')));
  stage.append(root);
  remount();
  off(() => stop?.());
  return () => { off.run(); root.remove(); };
}
