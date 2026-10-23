import { h, icon, toast, fail } from './ui.js';

// Formulário em folha (como o "Registrar cliente" da referência): faixa de título, seções numeradas em moldura e botão grande.
// field: { k, l, ic, type: text|select|money|date|textarea|url, ph, req, opt, opts: [[valor, rótulo, subtítulo]], def, span }
// variant 'sheet' (faixa colorida, tela cheia) ou 'dialog' (janela compacta com cabeçalho simples).

// Ajusta a folha à altura da tela do usuário (sem rolagem): reduz a escala só o necessário, até 70%.
export function fitToViewport(card) {
  const run = () => { card.style.zoom = ''; const avail = window.innerHeight - 24; const hgt = card.getBoundingClientRect().height; const z = hgt > 0 ? Math.max(0.7, Math.min(1, avail / hgt)) : 1; card.style.zoom = z < 1 ? String(z) : ''; };
  run(); requestAnimationFrame(run); window.addEventListener('resize', run);
  const mo = new MutationObserver(run); mo.observe(card, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  return () => { window.removeEventListener('resize', run); mo.disconnect(); };
}

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export function control(f, value) {
  const v = value ?? f.def ?? '';
  if (f.type === 'select') {
    const opts = f.opts || [];
    const wrap = h('div', { class: 'fs-select' });
    const sel = h('select', { name: f.k, 'aria-hidden': 'true', tabindex: '-1' }, opts.map(([val, lab]) => h('option', { value: val, selected: String(val) === String(v) }, lab)));
    const tTitle = h('b'); const tSub = h('small');
    const trigger = h('button', { type: 'button', class: 'fs-shown', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': f.l }, h('span', { class: 'fs-tt' }, tTitle, tSub), h('i', { class: 'fs-chev', 'aria-hidden': 'true' }));
    const rows = opts.map(([val, lab, sub]) => h('button', { type: 'button', role: 'option', class: 'fs-opt', dataset: { v: String(val) }, onclick: () => pick(val) },
      h('i', { class: 'fs-oav' }, String(lab).trim()[0]?.toUpperCase() || '·'), h('span', { class: 'fs-ot' }, h('b', lab), sub && h('small', sub)), h('i', { class: 'fs-ock', 'aria-hidden': 'true' })));
    const panel = h('div', { class: 'fs-panel', role: 'listbox', hidden: true }, h('div', { class: 'fs-phead' }, h('span', 'Selecione uma opção'), h('small', `${opts.length} disponíve${opts.length === 1 ? 'l' : 'is'}`)), h('div', { class: 'fs-plist' }, rows));
    const draw = () => { const cur = opts.find((o) => String(o[0]) === String(sel.value)) || opts[0] || []; tTitle.textContent = cur[1] ?? ''; tSub.textContent = cur[2] ?? ''; tSub.hidden = !cur[2];
      rows.forEach((r) => { const on = r.dataset.v === String(sel.value); r.classList.toggle('on', on); r.setAttribute('aria-selected', String(on)); }); };
    let open = false; let onDoc;
    const close = () => { if (!open) return; open = false; panel.hidden = true; wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', onDoc, true); };
    // O painel cabe no recorte do contêiner (gaveta/modal com overflow escondido), não só na janela.
    const fit = (r) => {
      let c = wrap.parentElement; while (c && c !== document.body && getComputedStyle(c).overflow === 'visible' && getComputedStyle(c).overflowX === 'visible') c = c.parentElement;
      const box = c && c !== document.body ? c.getBoundingClientRect() : { left: 0, right: window.innerWidth };
      const lo = Math.max(box.left, 0) + 8; const hi = Math.min(box.right, window.innerWidth) - 8;
      const want = Math.max(r.width, Math.min(380, hi - lo));
      const right = hi - r.left; const left = r.right - lo;
      const alignRight = right < want && left > right;
      wrap.classList.toggle('ral', alignRight);
      panel.style.width = `${Math.max(r.width, Math.min(want, alignRight ? left : right))}px`;
    };
    const show = () => { open = true; panel.hidden = false; wrap.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
      const r = trigger.getBoundingClientRect(); const need = Math.min(panel.offsetHeight, 330) + 14; fit(r); wrap.classList.toggle('up', window.innerHeight - r.bottom < need && r.top > window.innerHeight - r.bottom);
      panel.querySelector('.fs-opt.on')?.scrollIntoView({ block: 'nearest' });
      onDoc = (e) => { if (!wrap.contains(e.target)) close(); }; document.addEventListener('mousedown', onDoc, true); };
    function pick(val) { sel.value = String(val); sel.dispatchEvent(new Event('change', { bubbles: true })); close(); trigger.focus(); }
    sel.addEventListener('change', draw);
    trigger.addEventListener('click', () => (open ? close() : show()));
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) { e.stopPropagation(); close(); trigger.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) show(); const i = opts.findIndex((o) => String(o[0]) === String(sel.value)); const n = Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); sel.value = String(opts[n][0]); draw(); panel.querySelector('.fs-opt.on')?.scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter' && open) { e.preventDefault(); e.stopPropagation(); close(); }
    });
    draw(); wrap.append(trigger, panel, sel);
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
  let unfit = () => {};
  const close = () => { if (closing) return; closing = true; unfit(); document.removeEventListener('keydown', esc); document.body.classList.remove('fs-open'); back.classList.add('out'); setTimeout(() => back.remove(), 180); };
  const esc = (e) => { if (e.key === 'Escape') close(); };

  const secEls = sections.map((s, i) => h('section', { class: 'fs-sec' },
    s.title && h('header', { class: 'fs-sechead' }, h('i', { class: 'fs-n' }, String(i + 1).padStart(2, '0')), h('div', h('b', s.title), s.sub && h('small', s.sub))),
    h('div', { class: 'fs-grid', style: `--cols:${s.cols || s.fields.length}` }, s.fields.map((f) => {
      const c = control(f, values[f.k]); inputs[f.k] = c.input; if (c.out) inputs[f.k].out = c.out;
      if (f.type === 'profit') return h('div', { class: 'fs-field profit' }, c.el);
      return h(f.type === 'select' ? 'div' : 'label', { class: 'fs-field' + (f.type === 'select' ? ' sel' : ''), style: f.span ? `grid-column:span ${f.span}` : null },
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
  unfit = fitToViewport(card);
  requestAnimationFrame(() => { back.classList.add('in'); if (!card.contains(document.activeElement)) (card.querySelector('input:not([type=hidden]),textarea') || card).focus?.(); });
  extra?.({ inputs, card });
  return { close, inputs };
}

export { money, toast, fail };
