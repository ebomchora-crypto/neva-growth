// Fundo animado "Waves" (o mesmo do Builder de sites) para os banners das páginas. Sem WebGL, o banner fica com o degradê de sempre.
// Uso: const fx = heroWaves(elementoDoBanner); ... fx.destroy() ao sair da página.
import { wavesBackground } from './neva-code/waves-bg.js';

export function heroWaves(el) {
  if (!el) return { destroy() {} };
  const bg = wavesBackground({ className: 'hero-bg', pixelRatio: 0.7, onFirstFrame: () => el.classList.add('gl-on') });
  el.classList.add('fx');
  if (!bg) return { destroy() { el.classList.remove('fx'); } };
  const veil = document.createElement('i'); veil.className = 'hero-veil'; veil.setAttribute('aria-hidden', 'true');
  el.prepend(bg.el, veil);
  return { destroy() { bg.destroy(); bg.el.remove(); veil.remove(); el.classList.remove('fx', 'gl-on'); } };
}
