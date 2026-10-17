// Utilitários de UI: construtor DOM seguro (sem innerHTML), modais, toasts, formatação.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...kids) => { clear(el); append(el, kids); };

export const brl = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
export const dt = (s) => {
  if (!s) return '—';
  const d = new Date(String(s).length <= 10 ? s + 'T12:00:00' : String(s).replace(' ', 'T') + 'Z');
  return isNaN(d) ? s : d.toLocaleDateString('pt-BR');
};
export const dtt = (s) => { const d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
export const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export function toast(msg, type = '') {
  const t = h('div', { class: 'toast ' + type }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), type === 'err' ? 6000 : 3200);
}
export const fail = (e) => toast(e?.message || 'Erro inesperado.', 'err');

export function modal({ title, body, actions = [], size = '', onClose }) {
  const back = h('div', { class: 'modal-back' });
  const close = () => { back.remove(); document.removeEventListener('keydown', esc); onClose?.(); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'modal ' + size, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', h('h2', title), h('button', { class: 'x', 'aria-label': 'Fechar', onclick: close }, '×')),
    h('div', { class: 'body' }, body),
    actions.length ? h('footer', actions.map((a) => h('button', {
      class: 'btn ' + (a.kind || ''), type: 'button', onclick: async (ev) => {
        const b = ev.currentTarget; b.disabled = true;
        try { const r = await a.onClick?.(close); if (r !== false && !a.keepOpen) close(); } catch (e) { fail(e); } finally { b.disabled = false; }
      }
    }, a.label))) : null);
  back.append(box);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc);
  document.body.append(back);
  (box.querySelector('input,select,textarea,button.btn') || box).focus?.();
  return { close, box };
}
export const confirmBox = (message, label = 'Excluir') => new Promise((res) => {
  let done = false;
  modal({ title: 'Confirmar', body: h('p', message), onClose: () => { if (!done) res(false); },
    actions: [{ label: 'Cancelar', kind: 'ghost', onClick: () => { done = true; res(false); } }, { label, kind: 'danger', onClick: () => { done = true; res(true); } }] });
});
export const promptBox = (title, label, value = '') => new Promise((res) => {
  const input = h('input', { value, autocomplete: 'off' });
  let done = false;
  const m = modal({ title, body: h('label', { class: 'field' }, h('span', label), input), onClose: () => { if (!done) res(null); },
    actions: [{ label: 'Cancelar', kind: 'ghost', onClick: () => { done = true; res(null); } },
      { label: 'OK', onClick: () => { done = true; res(input.value.trim() || null); } }] });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { done = true; res(input.value.trim() || null); m.close(); } });
});

/** Campo de formulário a partir de definição {k,l,type,opts,req} */
export function fieldEl(f, value) {
  let input;
  const v = value ?? f.default ?? '';
  if (f.type === 'select') {
    input = h('select', { name: f.k }, (f.empty ? [h('option', { value: '' }, f.empty)] : []).concat((f.opts || []).map((o) => {
      const [val, lab] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: val, selected: String(val) === String(v) }, lab);
    })));
  } else if (f.type === 'textarea') input = h('textarea', { name: f.k, rows: f.rows || 4 }, v);
  else if (f.type === 'checkbox') {
    input = h('input', { type: 'checkbox', name: f.k, checked: !!Number(v) || v === true });
    return h('label', { class: 'row' }, input, h('span', f.l));
  } else input = h('input', { name: f.k, type: f.type || 'text', value: v, required: !!f.req, step: f.type === 'number' ? 'any' : null, placeholder: f.ph || '', autocomplete: 'off' });
  if (f.req && f.type !== 'checkbox') input.required = true;
  return h('label', { class: 'field' + (f.wide ? ' wide' : ''), style: f.wide ? 'grid-column:1/-1' : null }, h('span', f.l + (f.req ? ' *' : '')), input);
}
export function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k]; if (!el) continue;
    out[f.k] = f.type === 'checkbox' ? el.checked : el.value;
  }
  return out;
}
export function downloadFile(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCSV(rows, cols) {
  const q = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + [cols.map((c) => q(c.l)).join(','), ...rows.map((r) => cols.map((c) => q(r[c.k])).join(','))].join('\r\n');
}
export function parseCSV(text) {
  const rows = []; let row = [], cur = '', inQ = false;
  text = text.replace(/^﻿/, '');
  const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}
export const icon = (name) => {
  const paths = {
    home: 'M3 11l9-8 9 8M5 10v10h14V10', users: 'M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7M21 20v-2a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
    funnel: 'M3 4h18l-7 8v6l-4 2v-8z', check: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h9', cart: 'M3 4h2l2.4 11h10.2L20 8H6M9 20a1 1 0 100-2 1 1 0 000 2M17 20a1 1 0 100-2 1 1 0 000 2',
    tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M9 7h6', globe: 'M12 21a9 9 0 100-18 9 9 0 000 18M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
    code: 'M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16', search: 'M11 18a7 7 0 100-14 7 7 0 000 14M21 21l-5-5', cog: 'M12 15a3 3 0 100-6 3 3 0 000 6M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.7h4l.4-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', menu: 'M4 6h16M4 12h16M4 18h16', logout: 'M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M16 17l5-5-5-5M21 12H9', wand: 'M15 4V2M15 10V8M11 6H9M21 6h-2M5 21l11-11M18 8l-2-2'
  };
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', paths[name] || paths.home); s.append(p);
  return s;
};
