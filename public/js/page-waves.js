// Fundo da página: o mesmo "Waves" do Builder, fixo atrás do app, no lugar das linhas topográficas (#topo-bg).
// app.js chama pageWaves(true/false) a cada troca de rota; o canvas só existe enquanto a rota pede.
import { wavesBackground } from './neva-code/waves-bg.js';

let cur = null;
export function pageWaves(on) {
  const html = document.documentElement;
  if (!on) { cur?.bg.destroy(); cur?.bg.el.remove(); cur?.veil.remove(); cur = null; html.classList.remove('waves-page', 'waves-on'); return; }
  if (cur) return;
  const bg = wavesBackground({ className: 'page-waves', pixelRatio: 0.6, onFirstFrame: () => html.classList.add('waves-on') });
  if (!bg) return; // sem WebGL ficam as linhas de sempre
  const veil = document.createElement('i'); veil.className = 'page-waves-veil'; veil.setAttribute('aria-hidden', 'true');
  document.body.prepend(bg.el, veil); html.classList.add('waves-page'); cur = { bg, veil };
}
