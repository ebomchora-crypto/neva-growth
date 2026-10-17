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
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', menu: 'M4 6h16M4 12h16M4 18h16', logout: 'M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M16 17l5-5-5-5M21 12H9', wand: 'M15 4V2M15 10V8M11 6H9M21 6h-2M5 21l11-11M18 8l-2-2', bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 100-6 3 3 0 000 6', eyeoff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.6 6.6C3.7 8.4 2 12 2 12s4 6 10 6a9.6 9.6 0 004-.9', refresh: 'M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5', card: 'M3 5h18v14H3zM3 10h18M7 15h4', play: 'M5 4l14 8-14 8z', palette: 'M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s-.5-2 1-2H17a4 4 0 004-4c0-5-4-10-9-10M7.5 11h.01M10 7.5h.01M14 7.5h.01', target: 'M12 21a9 9 0 100-18 9 9 0 000 18M12 16a4 4 0 100-8 4 4 0 000 8M12 12h.01', sparkle: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', kanban: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z'
  };
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', paths[name] || paths.home); s.append(p);
  return s;
};

// ---- Valores monetários ocultáveis (preferência de privacidade)
export const money = (n) => h('span', { class: 'money' }, brl(n));
export function pills({ items, value, counts, onChange }) {
  return h('div', { class: 'pills', role: 'tablist' }, items.map(([v, l]) => h('button', { type: 'button', role: 'tab', class: 'pill' + (String(value) === String(v) ? ' on' : ''), 'aria-selected': String(value) === String(v), onclick: () => onChange(v) },
    l, counts && counts[v] !== undefined && h('span', { class: 'cnt' }, counts[v]))));
}
export const statCard = (label, value, hint) => h('div', { class: 'stat' }, h('small', label), h('b', value), hint && h('span', { class: 'sm mut' }, hint));
export function hero({ kicker, title, subtitle, actions, stats }) {
  return h('section', { class: 'hero' }, h('div', { class: 'hero-main' }, kicker && h('div', { class: 'kicker' }, kicker), h('h1', title), subtitle && h('p', subtitle), actions && h('div', { class: 'row' }, actions)),
    stats && h('div', { class: 'hero-stats' }, stats));
}
export const copyText = async (text, okMsg = 'Copiado.') => {
  try { await navigator.clipboard.writeText(text); toast(okMsg, 'ok'); }
  catch { const t = h('textarea', { style: 'position:fixed;opacity:0' }, text); document.body.append(t); t.select(); try { document.execCommand('copy'); toast(okMsg, 'ok'); } catch { toast('Não foi possível copiar.', 'err'); } t.remove(); }
};
/** Diff de linhas simples (LCS) para pré-visualizar alterações propostas pela IA. */
export function diffLines(a, b) {
  const x = a.split('\n'), y = b.split('\n');
  if (x.length * y.length > 4_000_000) return [{ t: 'chg', s: `(arquivo grande: ${x.length} → ${y.length} linhas)` }];
  const dp = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < x.length && j < y.length) { if (x[i] === y[j]) { out.push({ t: 'eq', s: x[i] }); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ t: 'del', s: x[i++] }); else out.push({ t: 'add', s: y[j++] }); }
  while (i < x.length) out.push({ t: 'del', s: x[i++] }); while (j < y.length) out.push({ t: 'add', s: y[j++] });
  return out;
}
export function diffEl(a, b) {
  const d = diffLines(a ?? '', b); const add = d.filter((l) => l.t === 'add').length, del = d.filter((l) => l.t === 'del').length;
  // mostra só trechos alterados com 2 linhas de contexto
  const keep = new Set(); d.forEach((l, i) => { if (l.t !== 'eq') for (let k = i - 2; k <= i + 2; k++) keep.add(k); });
  const rows = []; let skipped = false;
  d.forEach((l, i) => { if (l.t === 'eq' && !keep.has(i)) { if (!skipped) rows.push(h('div', { class: 'dl skip' }, '⋯')); skipped = true; return; } skipped = false;
    rows.push(h('div', { class: 'dl ' + l.t }, (l.t === 'add' ? '+ ' : l.t === 'del' ? '- ' : '  ') + l.s)); });
  return h('div', h('div', { class: 'sm mut' }, a == null ? 'Arquivo novo' : `+${add} −${del} linhas`), h('pre', { class: 'diff' }, rows));
}
