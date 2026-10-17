// Seletor de modelo e esforço (port em JS puro do "AI Model Selector" do KokonutUI).
// Lista de modelos com seleção, trilho de esforço arrastável (encaixa em cada nível) e dica do nível.
import { h, mount, icon } from './ui.js';

const KEY = 'neva-ai-selection';
const glyph = (count, level) => h('span', { class: 'ms-glyph', 'aria-hidden': 'true' }, Array.from({ length: count }, (_, i) => h('i', { class: i <= level ? 'on' : '', style: `height:${((i + 1) / count) * 100}%` })));

/** @param models [{id,name,description,efforts:[{id,label,hint}],defaultEffort}] */
export function modelSelector({ models, defaultModel, theme = 'dark', placement = 'up', onChange } = {}) {
  const list = models?.length ? models : [{ id: 'neva', name: 'Neva IA', efforts: [{ id: 'medium', label: 'Médio', hint: '' }], defaultEffort: 'medium' }];
  const find = (id) => list.find((m) => m.id === id);
  let sel = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
  if (!sel || !find(sel.model)) { const m = find(defaultModel) || list[0]; sel = { model: m.id, effort: m.defaultEffort || m.efforts[0].id }; }
  const model = () => find(sel.model); const lvl = () => Math.max(0, model().efforts.findIndex((e) => e.id === sel.effort));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch { /* ok */ } onChange?.({ ...sel }); };
  // ao trocar de modelo, mantém o mesmo nível se existir; senão, o nível na mesma altura relativa do novo trilho
  const carry = (from, to, effort) => {
    if (to.efforts.some((e) => e.id === effort)) return effort;
    const share = from.efforts.length > 1 ? from.efforts.findIndex((e) => e.id === effort) / (from.efforts.length - 1) : 0;
    return to.efforts[Math.round(share * (to.efforts.length - 1))]?.id || to.defaultEffort || to.efforts[0].id;
  };

  const root = h('div', { class: `msel ${theme} ${placement}` });
  const trigger = h('button', { type: 'button', class: 'ms-trigger', 'aria-haspopup': 'true', 'aria-expanded': 'false' });
  const panel = h('div', { class: 'ms-panel hide', role: 'dialog', 'aria-label': 'Modelo e esforço' });
  const hint = h('p', { class: 'ms-hint' }); const radios = h('div', { class: 'ms-list', role: 'radiogroup', 'aria-label': 'Modelo' });
  const thumb = h('i', { class: 'ms-thumb', 'aria-hidden': 'true' }); const labels = h('div', { class: 'ms-labels' });
  const track = h('div', { class: 'ms-track', role: 'slider', tabindex: 0, 'aria-label': 'Nível de esforço', 'aria-valuemin': 0,
    onkeydown: (e) => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]; if (d !== undefined) { e.preventDefault(); setEffort(lvl() + d); } else if (e.key === 'Home') { e.preventDefault(); setEffort(0); } else if (e.key === 'End') { e.preventDefault(); setEffort(model().efforts.length - 1); } } },
    thumb, labels);
  const effortAt = (x) => { const r = labels.getBoundingClientRect(); const n = model().efforts.length; return Math.min(n - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * n))); };
  let dragging = false;
  track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); dragging = true; track.classList.add('drag'); setEffort(effortAt(e.clientX)); track.focus(); });
  track.addEventListener('pointermove', (e) => { if (dragging) setEffort(effortAt(e.clientX)); });
  const end = () => { dragging = false; track.classList.remove('drag'); };
  track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end); track.addEventListener('lostpointercapture', end);

  function setEffort(i) { const m = model(); i = Math.max(0, Math.min(m.efforts.length - 1, i)); if (m.efforts[i].id === sel.effort) return; sel.effort = m.efforts[i].id; save(); paint(); }
  function pickModel(m) { if (m.id === sel.model) return; const from = model(); sel = { model: m.id, effort: carry(from, m, sel.effort) }; save(); paint(); }
  function paint() {
    const m = model(); const i = lvl(); const e = m.efforts[i]; const n = m.efforts.length;
    mount(trigger, h('b', m.name), h('span', { class: 'ms-eff' }, glyph(n, i), e.label), h('span', { class: 'ms-car' }, icon('chevron')));
    trigger.setAttribute('aria-label', `Modelo: ${m.name}, esforço ${e.label}. Alterar`);
    mount(radios, list.map((o, k) => { const on = o.id === m.id; return h('button', { type: 'button', class: 'ms-opt' + (on ? ' on' : ''), role: 'radio', 'aria-checked': on, tabindex: on ? 0 : -1,
      onclick: () => pickModel(o), onkeydown: (ev) => { const d = { ArrowDown: 1, ArrowUp: -1 }[ev.key]; if (d === undefined) return; ev.preventDefault(); const nx = (k + d + list.length) % list.length; pickModel(list[nx]); radios.children[nx]?.focus(); } },
      h('span', { class: 'ms-name' }, h('b', o.name), o.description && h('small', o.description)), h('span', { class: 'ms-check' }, on && icon('check'))); }));
    mount(labels, m.efforts.map((x, k) => h('span', { class: k === i ? 'on' : '' }, x.label)));
    thumb.style.left = `${(i / n) * 100}%`; thumb.style.width = `${100 / n}%`; track.setAttribute('aria-valuemax', n - 1); track.setAttribute('aria-valuenow', i); track.setAttribute('aria-valuetext', e.label);
    hint.textContent = e.hint || '';
  }
  const setOpen = (o) => { panel.classList.toggle('hide', !o); trigger.setAttribute('aria-expanded', String(o)); root.classList.toggle('open', o); };
  trigger.addEventListener('click', () => setOpen(panel.classList.contains('hide')));
  const onDoc = (e) => { if (!root.isConnected) { document.removeEventListener('pointerdown', onDoc, true); return; } if (!panel.classList.contains('hide') && !root.contains(e.target)) setOpen(false); };
  document.addEventListener('pointerdown', onDoc, true);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.classList.contains('hide')) { setOpen(false); trigger.focus(); } });
  mount(panel, radios, h('div', { class: 'ms-sep' }), h('div', { class: 'ms-eh' }, h('b', 'Esforço'), h('small', '← → para ajustar')), track, hint);
  mount(root, panel, h('div', { class: 'ms-bar' }, trigger));
  paint();
  return { el: root, get: () => ({ model: sel.model, effort: sel.effort }), label: () => `${model().name} · ${model().efforts[lvl()].label}` };
}
