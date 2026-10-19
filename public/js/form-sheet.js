import { h, icon, toast, fail } from './ui.js';

// Formulário em folha (como o "Registrar cliente" da referência): faixa de título, seções numeradas em moldura e botão grande.
// field: { k, l, ic, type: text|select|money|date|textarea|url, ph, req, opt, opts: [[valor, rótulo, subtítulo]], def, span }
// variant 'sheet' (faixa colorida, tela cheia) ou 'dialog' (janela compacta com cabeçalho simples).

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

function control(f, value) {
  const v = value ?? f.def ?? '';
  if (f.type === 'select') {
    const wrap = h('div', { class: 'fs-select' });
    const sel = h('select', { name: f.k, 'aria-label': f.l }, (f.opts || []).map(([val, lab]) => h('option', { value: val, selected: String(val) === String(v) }, lab)));
    const shown = h('div', { class: 'fs-shown' }, h('b'), h('small'), h('i', { class: 'fs-chev', 'aria-hidden': 'true' }));
    const draw = () => { const o = (f.opts || []).find((x) => String(x[0]) === String(sel.value)) || (f.opts || [])[0] || []; shown.firstChild.textContent = o[1] ?? ''; shown.children[1].textContent = o[2] ?? ''; };
    sel.addEventListener('change', draw); draw();
    wrap.append(shown, sel);
    return { el: wrap, input: sel };
  }
  if (f.type === 'profit') {
    const hid = h('input', { type: 'hidden', name: f.k, value: '' });
    const out = h('b', money(0));
    return { el: h('div', { class: 'fs-profit' }, h('small', 'Lucro estimado'), out, h('em', 'Calculado automaticamente'), hid), input: hid, out };
  }
  if (f.type === 'textarea') {
    const t = h('textarea', { name: f.k, rows: f.rows || 3, placeholder: f.ph || '' }, v);
    return { el: h('div', { class: 'fs-in area' }, t), input: t };
  }
  if (f.type === 'money') {
    const i = h('input', { name: f.k, type: 'number', step: '0.01', min: '0', inputmode: 'decimal', placeholder: '0,00', value: v === '' ? '' : v, required: !!f.req });
    return { el: h('div', { class: 'fs-in' }, h('span', { class: 'fs-pre' }, 'R$'), i), input: i };
  }
  if (f.type === 'date') {
    const i = h('input', { name: f.k, type: 'date', value: v, required: !!f.req, 'aria-label': f.l });
    return { el: h('div', { class: 'fs-in date' }, i, icon('calendar')), input: i };
  }
  const i = h('input', { name: f.k, type: f.type === 'url' ? 'text' : (f.type || 'text'), value: v, placeholder: f.ph || '', required: !!f.req, autocomplete: 'off', maxlength: f.max || null });
  return { el: h('div', { class: 'fs-in' }, i), input: i };
}

export function formSheet({ kicker, title, subtitle, ic = 'plus', sections, foot, ic2, submit = 'Salvar', cancel, danger, values = {}, variant = 'sheet', onSubmit, extra }) {
  const inputs = {};
  const back = h('div', { class: 'fs-back' });
  let closing = false;
  const close = () => { if (closing) return; closing = true; document.removeEventListener('keydown', esc); document.body.classList.remove('fs-open'); back.classList.add('out'); setTimeout(() => back.remove(), 180); };
  const esc = (e) => { if (e.key === 'Escape') close(); };

  const secEls = sections.map((s, i) => h('section', { class: 'fs-sec' },
    s.title && h('header', { class: 'fs-sechead' }, h('i', { class: 'fs-n' }, String(i + 1).padStart(2, '0')), h('div', h('b', s.title), s.sub && h('small', s.sub))),
    h('div', { class: 'fs-grid', style: `--cols:${s.cols || s.fields.length}` }, s.fields.map((f) => {
      const c = control(f, values[f.k]); inputs[f.k] = c.input; if (c.out) inputs[f.k].out = c.out;
      if (f.type === 'profit') return h('div', { class: 'fs-field profit' }, c.el);
      return h('label', { class: 'fs-field' + (f.type === 'select' ? ' sel' : ''), style: f.span ? `grid-column:span ${f.span}` : null },
        h('span', { class: 'fs-label' }, f.ic && icon(f.ic), h('em', f.l), f.opt && h('small', 'opcional')), c.el);
    })),
    s.extra && s.extra(inputs)));

  const err = h('p', { class: 'fs-err', role: 'alert', hidden: true });
  const btn = h('button', { type: 'submit', class: 'fs-submit' }, h('span', submit), !cancel && icon('arrow'));
  const form = h('form', { class: 'fs-form', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); err.hidden = true;
    const data = {}; for (const [k, el] of Object.entries(inputs)) if (el.type !== 'hidden') data[k] = el.value.trim();
    for (const s of sections) for (const f of s.fields) if (f.req && !data[f.k]) { err.textContent = `Preencha: ${f.l}.`; err.hidden = false; inputs[f.k].focus(); return; }
    btn.disabled = true; btn.classList.add('busy');
    try { const r = await onSubmit(data, close); if (r === false) return; } catch (x) { err.textContent = x?.message || 'Não foi possível salvar.'; err.hidden = false; }
    finally { btn.disabled = false; btn.classList.remove('busy'); }
  } }, secEls, err, h('footer', { class: 'fs-foot' + (cancel ? ' dlg' : '') }, cancel ? h('button', { type: 'button', class: 'fs-cancel', onclick: close }, cancel) : h('span', { class: 'fs-note' }, ic2 && icon(ic2), foot, danger && h('button', { type: 'button', class: 'fs-danger', onclick: async () => { if (await danger.run()) close(); } }, danger.label)), btn));

  const head = variant === 'sheet'
    ? h('header', { class: 'fs-banner' }, h('span', { class: 'fs-bico' }, icon(ic)), h('div', h('small', kicker), h('h2', title), subtitle && h('p', subtitle)), h('button', { type: 'button', class: 'fs-x', 'aria-label': 'Fechar', onclick: close }, icon('x')))
    : h('header', { class: 'fs-dhead' }, h('div', h('small', kicker), h('h2', title), subtitle && h('p', subtitle)), h('button', { type: 'button', class: 'fs-x', 'aria-label': 'Fechar', onclick: close }, icon('x')));
  const card = h('div', { class: 'fs-card ' + variant, role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, head, form);
  back.append(card);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc);
  document.body.append(back); document.body.classList.add('fs-open');
  requestAnimationFrame(() => { back.classList.add('in'); (card.querySelector('input:not([type=hidden]),textarea') || card).focus?.(); });
  extra?.({ inputs, card });
  return { close, inputs };
}

export { money, toast, fail };
