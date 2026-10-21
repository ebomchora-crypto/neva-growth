// AI Prompt (porte em JS puro do "ai-prompt" do KokonutUI, MIT): cartão com o texto, menu de modelo, menu de esforço
// (barras de sinal) e o botão de enviar. Troquei só o que o pedido mandou: a cor (azul da Neva) e os modelos (Neva 1.0, 1.2
// e 1.5, cada um com seus níveis de raciocínio). Sem anexos, comandos "/" nem faixa promocional: nada que não funcione aqui.
// A seleção é guardada em localStorage na mesma chave do seletor do Studio, então os dois sempre concordam.
import { h, icon, toast } from './ui.js';
import { attachControls } from './attach.js';
import { api } from './api.js';

const KEY = 'neva-ai-selection';
const svg = (paths, cls = '', sw = 1.8) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', String(sw)); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls); s.innerHTML = paths; return s; };
const arrowUp = () => svg('<path d="M12 19V5"/><path d="M5.5 11.5L12 5l6.5 6.5"/>', 'ap-ico', 2.25);
const clip = () => svg('<path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.9-8.9a3.7 3.7 0 015.2 5.2l-8.9 8.9a1.8 1.8 0 01-2.6-2.6l8.2-8.2"/>', 'ap-ico', 1.9);
const chevron = () => svg('<path d="M6 9l6 6 6-6"/>', 'ap-chev', 2);
const check = () => svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'ap-check', 2.25);
const bars = (count, level) => h('span', { class: 'ap-bars', 'aria-hidden': 'true' }, Array.from({ length: count }, (_, i) => h('i', { class: i <= level ? 'on' : '', style: `height:${((i + 1) / count) * 100}%` })));

/** Menu suspenso que abre para cima e fecha com Esc, clique fora ou ao escolher. */
function dropdown({ trigger, title, items, width }) {
  const panel = h('div', { class: 'ap-menu hide', role: 'menu', style: width ? `width:${width}px` : '' });
  const root = h('div', { class: 'ap-dd' }, trigger, panel);
  const open = () => { panel.classList.remove('hide'); trigger.setAttribute('aria-expanded', 'true'); root.classList.add('open'); panel.querySelector('[aria-checked="true"]')?.focus(); };
  const close = (focus) => { panel.classList.add('hide'); trigger.setAttribute('aria-expanded', 'false'); root.classList.remove('open'); if (focus) trigger.focus(); };
  trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => (panel.classList.contains('hide') ? open() : close()));
  const onDoc = (e) => { if (!root.isConnected) return document.removeEventListener('pointerdown', onDoc, true); if (!panel.classList.contains('hide') && !root.contains(e.target)) close(); };
  document.addEventListener('pointerdown', onDoc, true);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hide')) { e.preventDefault(); close(true); return; }
    const opts = [...panel.querySelectorAll('[role="menuitemradio"]')];
    const i = opts.indexOf(document.activeElement); const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (d !== undefined && !panel.classList.contains('hide') && opts.length) { e.preventDefault(); opts[(i + d + opts.length) % opts.length].focus(); }
  });
  const paint = () => { panel.replaceChildren(h('div', { class: 'ap-menu-title' }, title), ...items(close)); };
  return { el: root, paint, close };
}

/**
 * @param {{ models: Array<{id,name,description,efforts:Array<{id,label,hint}>,defaultEffort}>, defaultModel?: string, placeholder?: string,
 *   disabled?: boolean, onSubmit: (text: string, sel: {model:string, effort:string}) => unknown }} o
 */
export function aiPrompt({ models, defaultModel, placeholder = 'Descreva o site que você quer', disabled = false, onSubmit }) {
  const list = models?.length ? models : [{ id: 'neva', name: 'Neva IA', efforts: [{ id: 'medium', label: 'Médio', hint: '' }], defaultEffort: 'medium' }];
  const find = (id) => list.find((m) => m.id === id);
  let sel = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
  if (!sel || !find(sel.model)) { const m = find(defaultModel) || list[0]; sel = { model: m.id, effort: m.defaultEffort || m.efforts[0].id }; }
  const model = () => find(sel.model);
  const level = () => Math.max(0, model().efforts.findIndex((e) => e.id === sel.effort));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch { /* ok */ } };
  const carry = (from, to, effort) => {
    if (to.efforts.some((e) => e.id === effort)) return effort;
    const share = from.efforts.length > 1 ? from.efforts.findIndex((e) => e.id === effort) / (from.efforts.length - 1) : 0;
    return to.efforts[Math.round(share * (to.efforts.length - 1))]?.id || to.defaultEffort || to.efforts[0].id;
  };

  const field = h('textarea', { class: 'ap-field', rows: 1, placeholder, 'aria-label': 'O que você quer no site', disabled });
  const send = h('button', { type: 'button', class: 'ap-send', 'aria-label': 'Criar site', title: 'Criar site (Ctrl+Enter)', disabled: true }, arrowUp());
  const modelBtn = h('button', { type: 'button', class: 'ap-ghost ap-model' });
  const effortBtn = h('button', { type: 'button', class: 'ap-ghost ap-effort' });

  const modelMenu = dropdown({ trigger: modelBtn, title: 'Modelo', width: 288, items: (close) => list.map((m) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(m.id === sel.model), class: 'ap-item', onclick: () => { if (m.id !== sel.model) { sel = { model: m.id, effort: carry(model(), m, sel.effort) }; save(); paint(); } close(true); } },
    h('span', { class: 'ap-item-t' }, h('b', m.name), m.description && h('small', m.description)), check())) });
  const effortMenu = dropdown({ trigger: effortBtn, title: 'Raciocínio', width: 252, items: (close) => [...model().efforts].reverse().map((e) => { const idx = model().efforts.findIndex((x) => x.id === e.id);
    return h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(e.id === sel.effort), class: 'ap-item', onclick: () => { sel.effort = e.id; save(); paint(); close(true); } },
      bars(model().efforts.length, idx), h('span', { class: 'ap-item-t' }, h('b', e.label), e.hint && h('small', e.hint)), check()); }) });

  function paint() {
    const m = model(); const e = m.efforts[level()];
    modelBtn.replaceChildren(h('span', { class: 'ap-model-name' }, m.name), chevron());
    modelBtn.setAttribute('aria-label', `Modelo: ${m.name}. Alterar`);
    effortBtn.replaceChildren(bars(m.efforts.length, level()), h('span', { class: 'ap-effort-name' }, e.label));
    effortBtn.setAttribute('aria-label', `Raciocínio: ${e.label}. Alterar`);
    effortBtn.hidden = m.efforts.length < 2;
    modelMenu.paint(); effortMenu.paint();
  }

  const canSend = () => (field.value.trim().length > 0 || att.files.length > 0) && !disabled;
  const grow = () => { field.style.height = '56px'; field.style.height = Math.max(56, Math.min(280, field.scrollHeight)) + 'px'; send.disabled = !canSend(); send.toggleAttribute('data-ready', canSend()); };
  field.addEventListener('input', grow);
  const coarse = matchMedia('(pointer: coarse)').matches; // no celular, Enter quebra linha (o pedido é longo): enviar é o botão
  const fire = () => { if (canSend()) onSubmit(field.value, { ...sel }); };
  send.addEventListener('click', fire);
  field.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (!e.shiftKey && !coarse))) { e.preventDefault(); fire(); }
  });
  window.addEventListener('resize', grow);

  // Anexos (texto, Word, PDF, imagens): imagens vão para o servidor na hora e voltam com a URL que o site vai usar.
  const att = attachControls({ disabled, upload: (dataUrl, name) => api.post('/code-maker/images', { dataUrl, name }), onChange: () => grow() });
  const card = h('div', { class: 'ap-card' }, field, att.chips, h('div', { class: 'ap-bar' }, att.button, modelMenu.el, effortMenu.el, h('span', { class: 'grow' }), send), att.picker);
  field.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); att.take(f); } });
  ['dragenter', 'dragover'].forEach((ev) => card.addEventListener(ev, (e) => { if (disabled || !e.dataTransfer?.types?.includes('Files')) return; e.preventDefault(); card.classList.add('drop'); }));
  ['dragleave', 'drop'].forEach((ev) => card.addEventListener(ev, () => card.classList.remove('drop')));
  card.addEventListener('drop', (e) => { if (disabled || !e.dataTransfer?.files?.length) return; e.preventDefault(); att.take(e.dataTransfer.files); });
  const el = h('div', { class: 'ap-shell' }, card);
  paint(); requestAnimationFrame(grow);
  return {
    el, card, field,
    get: () => ({ model: sel.model, effort: sel.effort }),
    files: () => att.files.slice(),
    assets: () => att.assets(),
    attachReady: () => att.ready(),
    clearFiles: () => att.clear(),
    setValue(v) { field.value = v; grow(); },
    grow,
    focus: () => field.focus(),
    shake() { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' }); },
    setBusy(on) { send.disabled = on || !canSend(); },
  };
}
