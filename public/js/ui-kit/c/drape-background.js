// Drape Background — porte em JS puro do componente "Drape Background" .
// A cortina (tecido simulado com Verlet, em WebGL) vem do módulo do app; aqui fica o demo no palco.
import { h, ensureStyle, disposer, PALETTE } from '../kit.js';
import { drapeBg } from '../../drape-bg.js';

const WINDS = [['Calmo', 0.4], ['Brisa', 1], ['Vento forte', 2.2]];
const PLEATS = [['Pregas finas', 22], ['Pregas largas', 44]];

const CSS = `
.kk-drape-background-root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 16px 92px;overflow:hidden;touch-action:pan-y;background:linear-gradient(160deg,${PALETTE.ice100},#fff)}
/* o app deixa .drape fixo em telas estreitas (tela de acesso); no palco ele precisa ficar preso ao cartão */
.kk-drape-background-root .drape{position:absolute}
.kk-drape-background-root[data-grabbing]{cursor:grabbing}
.kk-drape-background-text{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;max-width:24em;text-align:center;pointer-events:none}
.kk-drape-background-text h3{margin:0;font-size:clamp(22px,8cqw,44px);line-height:1.05;letter-spacing:-.03em;font-weight:700;color:var(--ink,${PALETTE.ink});text-wrap:balance}
.kk-drape-background-text p{margin:0;max-width:22em;font-size:clamp(12px,3.3cqw,16px);line-height:1.45;color:var(--mut,${PALETTE.mut})}
.kk-drape-background-bar{position:absolute;z-index:1;left:10px;right:10px;bottom:10px;display:flex;flex-direction:column;gap:6px;align-items:center}
.kk-drape-background-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.kk-drape-background-chip{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:rgba(255,255,255,.92);color:${PALETTE.ice800};font-family:inherit;font-weight:600;font-size:12px;line-height:1;cursor:pointer}
.kk-drape-background-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-drape-background-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('drape-background', CSS);
  const off = disposer();
  const opts = { wind: 1, pleat: 34 };
  let stop = null;
  // Vento e largura das pregas são fixados na criação da cortina: mudar um recria o tecido.
  const remount = () => { stop?.(); stop = drapeBg(root, { ...opts, instant: true }); };

  const group = (list, key, label) => {
    const btns = list.map(([text, v]) => h('button', {
      type: 'button', class: 'kk-drape-background-chip', 'aria-pressed': String(opts[key] === v),
      onclick: () => { opts[key] = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(list[i][1] === v))); remount(); },
    }, text));
    return h('div', { class: 'kk-drape-background-row', role: 'group', 'aria-label': label }, ...btns);
  };
  const root = h('div', { class: 'kk-drape-background-root' },
    h('div', { class: 'kk-drape-background-text' },
      h('h3', {}, 'Uma cortina ao vento'),
      h('p', {}, 'Mexa o cursor para balançar o tecido. Segure e arraste para puxar uma prega.')),
    h('div', { class: 'kk-drape-background-bar' }, group(WINDS, 'wind', 'Intensidade do vento'), group(PLEATS, 'pleat', 'Largura das pregas')));
  stage.append(root);
  remount();
  return () => { stop?.(); off.run(); root.remove(); };
}
