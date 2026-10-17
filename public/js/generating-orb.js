// Orbe de estado "gerando" com texto em ondas (inspirado no GeneratingOrb do 21st.dev; feito em CSS puro).
import { h } from './ui.js';

/** @param text palavra exibida abaixo do orbe, @param size diâmetro em px */
export function generatingOrb({ text = 'Neva Studio', size = 160 } = {}) {
  const letters = Array.from(text).map((c, i) => h('span', { class: 'orb-l', style: `animation-delay:${i * 0.1}s` }, c));
  const el = h('div', { class: 'orbwrap', role: 'img', 'aria-label': text },
    h('div', { class: 'orb', style: `--orb:${size}px` }, h('i', { class: 'orb-halo' }), h('i', { class: 'orb-spin' }), h('i', { class: 'orb-core' }), h('i', { class: 'orb-gloss' })),
    h('div', { class: 'orb-text', 'aria-hidden': 'true' }, letters));
  return { el, setRunning(on) { el.classList.toggle('running', !!on); } };
}
