// V0 Button — porte em JS puro do componente "V0 Button" .
import { h, svg, ensureStyle } from '../kit.js';

const LOGO_A = 'M23.3919 0H32.9188C36.7819 0 39.9136 3.13165 39.9136 6.99475V16.0805H36.0006V6.99475C36.0006 6.90167 35.9969 6.80925 35.9898 6.71766L26.4628 16.079C26.4949 16.08 26.5272 16.0805 26.5595 16.0805H36.0006V19.7762H26.5595C22.6964 19.7762 19.4788 16.6139 19.4788 12.7508V3.68923H23.3919V12.7508C23.3919 12.9253 23.4054 13.0977 23.4316 13.2668L33.1682 3.6995C33.0861 3.6927 33.003 3.68923 32.9188 3.68923H23.3919V0Z';
const LOGO_B = 'M13.7688 19.0956L0 3.68759H5.53933L13.6231 12.7337V3.68759H17.7535V17.5746C17.7535 19.6705 15.1654 20.6584 13.7688 19.0956Z';

export default function mount(stage) {
  ensureStyle('v0-button', `
.kk-v0-button-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px 16px}
.kk-v0-button-btn{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border-radius:10px;background:#0e2236;color:#fff;font:500 13px/1 inherit;font-family:inherit;text-decoration:none;transition:background-color .15s cubic-bezier(.23,1,.32,1),transform .15s cubic-bezier(.23,1,.32,1)}
.kk-v0-button-btn:hover{background:#164a7c}
.kk-v0-button-btn:active{transform:scale(.97)}
.kk-v0-button-btn:focus-visible{outline:2px solid #4a95d2;outline-offset:3px}
.kk-v0-button-btn svg{height:14px;width:auto;display:block}
.kk-v0-button-cap{font-size:12px;color:var(--mut,#4a6f93);text-align:center;margin:0;max-width:30ch}
@media(prefers-reduced-motion:reduce){.kk-v0-button-btn{transition:background-color .15s}.kk-v0-button-btn:active{transform:none}}
`);
  // Original abre o registro no v0.dev; aqui abre a página real do componente no .
  const a = h('a', { class: 'kk-v0-button-btn', href: 'https://.com/docs/buttons/v0-button', target: '_blank', rel: 'noreferrer noopener', 'aria-label': 'Abrir componente no  (nova aba)' },
    'Abrir no ', svg('svg', { viewBox: '0 0 40 20', fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: LOGO_A, fill: 'currentColor' }), svg('path', { d: LOGO_B, fill: 'currentColor' })));
  stage.append(h('div', { class: 'kk-v0-button-wrap' }, a, h));
  return () => a.remove();
}
