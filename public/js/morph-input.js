// Input de pedido estilo "AI thinking orb + input" (porte em JS puro do MorphOrb): uma pílula com o texto, o seletor de
// modelo/raciocínio e o botão de enviar. Ao enviar, a pílula encolhe numa bola, voa para o centro e vira o orbe de
// pontos enquanto o trabalho REAL acontece (criar o projeto); no fim o chamador segue para o Studio. Se o trabalho
// falha, a pílula volta ao lugar com o texto intacto. Paleta da Neva (azul-gelo), sem o verde do original.
// Com prefers-reduced-motion não há voo: só um fade curto.
import { h } from './ui.js';
import { generatingOrb } from './generating-orb.js';

const EASE = { io: 'cubic-bezier(.65,0,.35,1)', out: 'cubic-bezier(.22,1,.36,1)', in: 'cubic-bezier(.4,0,1,1)' };
const ORB = 132;

const sendIcon = () => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M12 19V5"/><path d="M5.5 11.5L12 5l6.5 6.5"/>';
  return s;
};
const sparkIcon = () => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.5');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'mi-spark');
  s.innerHTML = '<path d="M10 3.5l1.7 4.8 4.8 1.7-4.8 1.7L10 16.5l-1.7-4.8L3.5 10l4.8-1.7L10 3.5z"/><path d="M18 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"/>';
  return s;
};

/**
 * @param {{ field: HTMLTextAreaElement, tools?: Node[], send: HTMLButtonElement, maxHeight?: number }} o
 * @returns {{ el: HTMLElement, grow(): void, shake(): void, launch<T>(task: () => Promise<T>, labels?: {working?: string, done?: string}): Promise<T> }}
 */
export function morphInput({ field, tools = [], send, maxHeight = 260 }) {
  send.classList.add('mi-send'); send.replaceChildren(sendIcon());
  const bar = h('div', { class: 'mi-bar' }, tools, h('span', { class: 'grow' }), send);
  const pill = h('div', { class: 'mi-pill' }, h('div', { class: 'mi-row' }, sparkIcon(), field), bar);
  const el = h('div', { class: 'mi-wrap' }, h('i', { class: 'mi-glow', 'aria-hidden': 'true' }), pill);

  field.classList.add('mi-field'); field.rows = 1;
  const grow = () => { field.style.height = 'auto'; field.style.height = Math.min(maxHeight, field.scrollHeight) + 'px'; send.toggleAttribute('data-ready', field.value.trim().length > 0); };
  field.addEventListener('input', grow);
  requestAnimationFrame(grow);

  const shake = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pill.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: EASE.out });
  };

  let running = false;
  async function launch(task, labels = {}) {
    if (running) return undefined;
    running = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = pill.getBoundingClientRect();
    const veil = h('div', { class: 'mi-veil' });
    const label = h('div', { class: 'mi-label', role: 'status', 'aria-live': 'polite' });
    const setLabel = (t, done) => { label.replaceChildren(...[h('span', { class: done ? 'mi-lab-done' : 'mi-lab-t' }, t), done ? null : h('span', { class: 'mi-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))].filter(Boolean)); };
    setLabel(labels.working || 'Criando o projeto');
    const glass = h('div', { class: 'mi-fly-glass' }); const core = h('div', { class: 'mi-fly-core' });
    const fly = h('div', { class: 'mi-fly', 'aria-hidden': 'true' }, glass, core);
    Object.assign(fly.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '30px' });
    document.body.append(veil, fly, label);
    pill.style.visibility = 'hidden'; pill.style.pointerEvents = 'none';
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 150 : 350, fill: 'forwards', easing: EASE.out });

    const cx = innerWidth / 2 - ORB / 2, cy = Math.max(70, innerHeight * 0.44 - ORB / 2);
    let orb = null;
    const animate = async () => {
      if (reduce) {
        fly.style.cssText += `;left:${cx}px;top:${cy}px;width:${ORB}px;height:${ORB}px;border-radius:${ORB / 2}px`;
        core.style.opacity = '1'; glass.style.opacity = '0';
      } else {
        const ballL = r.left + r.width / 2 - 30, ballT = r.top + r.height / 2 - 30;
        glass.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, fill: 'forwards', easing: EASE.out });
        core.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, delay: 240, fill: 'forwards', easing: EASE.out });
        await fly.animate([{ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '30px' }, { left: ballL + 'px', top: ballT + 'px', width: '60px', height: '60px', borderRadius: '30px' }], { duration: 480, fill: 'forwards', easing: EASE.io }).finished;
        await fly.animate([{ left: ballL + 'px', top: ballT + 'px', width: '60px', height: '60px', borderRadius: '30px' }, { left: cx + 'px', top: cy + 'px', width: ORB + 'px', height: ORB + 'px', borderRadius: ORB / 2 + 'px' }], { duration: 720, fill: 'forwards', easing: EASE.io }).finished;
      }
      orb = generatingOrb({ size: ORB - 8, showText: false }); orb.setRunning(true); orb.el.classList.add('mi-orb');
      fly.append(orb.el);
      label.style.left = '50%'; label.style.top = cy + ORB + 22 + 'px';
      label.animate([{ opacity: 0, transform: 'translate(-50%,6px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 300, fill: 'forwards', easing: EASE.out });
    };
    label.style.left = '50%'; label.style.top = cy + ORB + 22 + 'px'; label.style.opacity = '0';

    const cleanup = () => { veil.remove(); fly.remove(); label.remove(); };
    try {
      const [, result] = await Promise.all([animate(), task()]);
      setLabel(labels.done || 'Pronto', true);
      if (!reduce) await fly.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 380, easing: EASE.out }).finished;
      await new Promise((res) => setTimeout(res, reduce ? 120 : 260));
      veil.style.transition = 'opacity .25s'; fly.style.transition = label.style.transition = 'opacity .25s';
      veil.style.opacity = fly.style.opacity = label.style.opacity = '0';
      setTimeout(cleanup, 280);
      return result;
    } catch (error) {
      // Voltou atrás: a pílula reaparece com o texto como estava.
      if (!reduce) { await fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.catch(() => {}); }
      cleanup(); pill.style.visibility = ''; pill.style.pointerEvents = '';
      throw error;
    } finally { running = false; }
  }

  return { el, grow, shake, launch };
}
