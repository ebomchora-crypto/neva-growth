// Utilitários de UI: construtor DOM seguro (sem innerHTML), modais, toasts, formatação.
import { modalIn, modalOut, toastIn, toastOut } from './motion.js';
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
  document.getElementById('toasts').append(t); toastIn(t);
  setTimeout(() => toastOut(t, () => t.remove()), type === 'err' ? 6000 : 3200);
}
export const fail = (e) => toast(e?.message || 'Erro inesperado.', 'err');

export function modal({ title, body, actions = [], size = '', onClose }) {
  const back = h('div', { class: 'modal-back' });
  let closing = false;
  const close = () => { if (closing) return; closing = true; document.removeEventListener('keydown', esc); modalOut(back, box, () => back.remove()); onClose?.(); };
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
  document.body.append(back); modalIn(back, box);
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
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', menu: 'M4 6h16M4 12h16M4 18h16', logout: 'M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M16 17l5-5-5-5M21 12H9', wand: 'M15 4V2M15 10V8M11 6H9M21 6h-2M5 21l11-11M18 8l-2-2', bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 100-6 3 3 0 000 6', eyeoff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.6 6.6C3.7 8.4 2 12 2 12s4 6 10 6a9.6 9.6 0 004-.9', refresh: 'M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5', card: 'M3 5h18v14H3zM3 10h18M7 15h4', play: 'M5 4l14 8-14 8z', palette: 'M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s-.5-2 1-2H17a4 4 0 004-4c0-5-4-10-9-10M7.5 11h.01M10 7.5h.01M14 7.5h.01', target: 'M12 21a9 9 0 100-18 9 9 0 000 18M12 16a4 4 0 100-8 4 4 0 000 8M12 12h.01', sparkle: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', kanban: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z',
    briefcase: 'M3 8h18v12H3zM8 8V5a1 1 0 011-1h6a1 1 0 011 1v3M3 13h18', github: 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 00-.8-2.3c2.700-.3 5.500-1.300 5.500-6a4.600 4.600 0 00-1.300-3.200 4.300 4.300 0 00-.1-3.200s-1-.3-3.300 1.300a11.400 11.400 0 00-6 0C7 2.500 6 2.800 6 2.800a4.300 4.300 0 00-.1 3.200A4.600 4.600 0 004.600 9.200c0 4.600 2.800 5.600 5.500 6a3 3 0 00-.8 2.300V21', rocket: 'M5 15c-1.500 1.300-2 5-2 5s3.700-.5 5-2M12 15l-3-3a22 22 0 012-4 12 12 0 019-5c0 3-1 6.500-5 9a22 22 0 01-4 2M9 12H4s.5-3 2-4c1.200-.8 4 0 4 0M12 15v5s3-.5 4-2c.8-1.200 0-4 0-4', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.500l9 5 9-5', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', link: 'M10 14a4 4 0 005.700 0l3-3a4 4 0 00-5.700-5.700l-1 1M14 10a4 4 0 00-5.700 0l-3 3a4 4 0 005.700 5.700l1-1', image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.500h.01',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', pencil: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
    file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', pin: 'M12 21s7-6.200 7-11a7 7 0 10-14 0c0 4.800 7 11 7 11zM12 12a2.500 2.500 0 100-5 2.500 2.500 0 000 5',
    clock: 'M12 21a9 9 0 100-18 9 9 0 000 18M12 7v5l3 2', external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5', monitor: 'M3 4h18v12H3zM8 20h8M12 16v4', tablet: 'M6 3h12v18H6zM11 18h2', phone: 'M8 2h8v20H8zM11 19h2',
    cmd: 'M9 6a3 3 0 10-3 3h12a3 3 0 10-3-3v12a3 3 0 103-3H6a3 3 0 103 3z', plus: 'M12 5v14M5 12h14', mail: 'M3 6h18v12H3zM3 7l9 7 9-7', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3M12 15v2', arrow: 'M5 12h14M13 6l6 6-6 6', gridplus: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM17 13v8M13 17h8', x: 'M6 6l12 12M18 6L6 18', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', binoculars: 'M7 7h3v10a3 3 0 11-6 0V10l1.5-3M17 7h-3v10a3 3 0 106 0V10l-1.5-3M10 11h4M7 4v3M17 4v3', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', download: 'M12 4v11M7 11l5 5 5-5M5 20h14', filter: 'M4 6h16M7 12h10M10 18h4', archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4', chevron: 'M6 9l6 6 6-6', alert: 'M12 3l10 18H2zM12 10v5M12 18h.01', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6', building: 'M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M17 13h.01M17 17h.01', wallet: 'M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2M16 14h.01', user: 'M12 12a4 4 0 100-8 4 4 0 000 8M4 21a8 8 0 0116 0', userplus: 'M15 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M8.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7M19 8v6M16 11h6', layout: 'M3 5h18v14H3zM3 9h18', pulse: 'M3 12h4l3-8 4 16 3-8h4', dollar: 'M12 3v18M16 7.5C16 6 14.2 5 12 5s-4 1-4 2.8c0 4.4 8 2.4 8 6.4 0 1.7-1.8 2.8-4 2.8s-4-1.2-4-2.8'
  };
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ico');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', paths[name] || paths.home); s.append(p);
  return s;
};

// ---- Valores monetários ocultáveis (preferência de privacidade)
export const money = (n) => h('span', { class: 'money', 'data-v': Number.isFinite(Number(n)) ? Number(n) : null }, brl(n));
export function pills({ items, value, counts, onChange }) {
  return h('div', { class: 'pills', role: 'tablist' }, items.map(([v, l]) => h('button', { type: 'button', role: 'tab', class: 'pill' + (String(value) === String(v) ? ' on' : ''), 'aria-selected': String(value) === String(v), onclick: () => onChange(v) },
    l, counts && counts[v] !== undefined && h('span', { class: 'cnt' }, counts[v]))));
}
export const statCard = (label, value, hint, ic) => h('div', { class: 'stat' }, ic && h('span', { class: 'sico' }, icon(ic)), h('div', { class: 'sbody' }, h('small', label), h('b', value), hint && h('span', { class: 'shint' }, hint)));
/** Ilustração geométrica própria da Neva (sem arte de terceiros) para o bloco de abertura. */
/** Mascote da Neva para estados vazios, erros e boas-vindas; some sem quebrar se o arquivo faltar. */
export function mascotImg(name, framed = false) {
  const img = h('img', { class: 'mascot-img' + (framed ? ' framed' : ''), src: `/img/mascote/${name}.webp`, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => img.remove());
  return img;
}
const MASCOT = { chart: 'vendas', people: 'clientes', site: 'sites', kanban: 'crm', dashboard: 'dashboard', play: 'play', acervo: 'acervo', design: 'design', prospect: 'prospeccao', prompts: 'prompts', settings: 'configuracoes', membership: 'associacao', tasks: 'tarefas', products: 'produtos', users: 'usuarios', courses: 'academia' };
export function heroArt(kind = 'chart') {
  const shape = drawShape(kind);
  if (!MASCOT[kind]) return shape;
  const img = h('img', { class: 'hero-mascot', src: `/img/mascote/${MASCOT[kind]}.webp`, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(shape));
  return img;
}
function drawShape(kind) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, ...k) => { const e = document.createElementNS(NS, t); for (const [x, v] of Object.entries(a || {})) e.setAttribute(x, v); k.forEach((c) => e.append(c)); return e; };
  const svg = el('svg', { viewBox: '0 0 320 240', class: 'hero-art', 'aria-hidden': 'true' });
  svg.append(el('circle', { cx: 190, cy: 120, r: 112, fill: 'none', stroke: 'rgba(255,255,255,.18)' }), el('circle', { cx: 190, cy: 120, r: 80, fill: 'none', stroke: 'rgba(255,255,255,.28)' }));
  const card = (x, y, w, hh, o = '.16') => el('rect', { x, y, width: w, height: hh, rx: 14, fill: `rgba(255,255,255,${o})`, stroke: 'rgba(255,255,255,.55)' });
  const bar = (x, y, w, o = '.7') => el('rect', { x, y, width: w, height: 8, rx: 4, fill: `rgba(255,255,255,${o})` });
  if (kind === 'chart') { svg.append(card(110, 60, 170, 130), ...[0, 1, 2, 3, 4].map((i) => el('rect', { x: 132 + i * 28, y: 170 - (30 + i * 18), width: 18, height: 30 + i * 18, rx: 5, fill: 'rgba(255,255,255,.8)' })), el('path', { d: 'M128 150 L170 120 L200 132 L262 84', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' })); }
  else if (kind === 'people') { svg.append(card(120, 50, 150, 150), ...[0, 1, 2].flatMap((i) => [el('circle', { cx: 148, cy: 88 + i * 40, r: 12, fill: 'rgba(255,255,255,.85)' }), bar(172, 82 + i * 40, 70), bar(172, 96 + i * 40, 44, '.4')])); }
  else if (kind === 'site') { svg.append(card(90, 56, 200, 136), el('line', { x1: 90, x2: 290, y1: 84, y2: 84, stroke: 'rgba(255,255,255,.55)' }), el('circle', { cx: 106, cy: 70, r: 4, fill: '#fff' }), el('circle', { cx: 120, cy: 70, r: 4, fill: 'rgba(255,255,255,.6)' }), card(106, 98, 80, 76, '.28'), bar(200, 100, 74), bar(200, 118, 56, '.45'), bar(200, 136, 66, '.45'), bar(200, 154, 40, '.45')); }
  else { svg.append(...[0, 1, 2].map((i) => card(96 + i * 66, 56 + (i % 2) * 14, 58, 130, '.14')), ...[0, 1, 2].flatMap((i) => [0, 1].map((j) => el('rect', { x: 104 + i * 66, y: 76 + (i % 2) * 14 + j * 44, width: 42, height: 32, rx: 8, fill: `rgba(255,255,255,${j ? '.45' : '.85'})` })))); }
  return svg;
}
export function hero({ kicker, title, subtitle, actions, stats, art, badge, aside, actionsClass = '' }) {
  return h('section', { class: 'hero' }, h('div', { class: 'hero-main' },
    h('div', { class: 'hero-head' }, h('div', kicker && h('div', { class: 'kicker' }, h('span', '/'), ' ', kicker), h('h1', title, badge)), actions && h('div', { class: 'hero-actions ' + actionsClass }, actions)),
    subtitle && h('p', subtitle), stats && (stats instanceof Element && /hero-stats|pstrip|chips3/.test(stats.className) ? stats : h('div', { class: 'hero-stats' }, stats))),
    h('div', { class: 'hero-side' }, aside, art ? heroArt(art) : null));
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
