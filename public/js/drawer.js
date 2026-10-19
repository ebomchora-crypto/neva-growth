import { h, icon } from './ui.js';
import { control } from './form-sheet.js';

// Campo no estilo dos formulários em folha (rótulo + controle); devolve { el, input }.
export function field(f, value) {
  const c = control(f, value);
  return { input: c.input, el: h(f.type === 'select' ? 'div' : 'label', { class: 'fs-field' + (f.type === 'select' ? ' sel' : '') + (f.full ? ' full' : '') },
    h('span', { class: 'fs-label' }, f.ic && icon(f.ic), h('em', f.l), f.opt && h('small', f.opt === true ? 'opcional' : f.opt), f.req && h('small', 'obrigatório')), c.el) };
}

// Painel lateral (gaveta) à direita, como "O próximo projeto começa aqui." / "Seu funil. Suas regras." da referência.
export function drawer({ kicker, title, subtitle, body, footer, onClose, wide = false }) {
  const back = h('div', { class: 'dw-back' });
  let closing = false;
  const close = () => { if (closing) return; closing = true; document.removeEventListener('keydown', esc); document.body.classList.remove('fs-open'); back.classList.add('out'); setTimeout(() => { back.remove(); onClose?.(); }, 200); };
  const esc = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) close(); };
  const scroller = h('div', { class: 'dw-scroll' }, h('div', { class: 'dw-head' }, h('span', { class: 'dw-brand' }, h('i', '/'), 'NEVA CRM'), h('button', { type: 'button', class: 'dw-x', 'aria-label': 'Fechar', onclick: close }, icon('x'))),
    h('small', { class: 'dw-kicker' }, kicker), h('h2', title), subtitle && h('p', { class: 'dw-sub' }, subtitle), body);
  const panel = h('aside', { class: 'dw' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, scroller, footer || null);
  back.append(panel);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc);
  document.body.append(back); document.body.classList.add('fs-open');
  requestAnimationFrame(() => back.classList.add('in'));
  return { close, panel, scroller };
}
