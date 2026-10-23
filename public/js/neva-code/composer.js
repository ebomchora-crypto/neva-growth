// Caixa de pedido do Builder (port em JS puro do "AI Prompt Input" do Kokonut UI, MIT), adaptada à Neva:
// anexos (botão, arrastar e colar), modelo, esforço com barras, referência de design (DESIGN.md), comandos com "/",
// enviar que vira parar, ↑ recupera o último pedido, Esc para a resposta. O medidor de contexto entra no rodapé.
import { h, mount, toast } from '../ui.js';
import { attachControls } from '../attach.js';

const KEY = 'neva-ai-selection';
const sv = (html, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls); s.innerHTML = html; return s; };
const I = {
  plus: () => sv('<path d="M12 5v14M5 12h14"/>'), up: () => sv('<path d="M12 19V5M5 12l7-7 7 7"/>', 'up'),
  chev: () => sv('<path d="m6 9 6 6 6-6"/>', 'chev'), check: () => sv('<path d="M20 6 9 17l-5-5"/>', 'ck'), x: () => sv('<path d="M18 6 6 18M6 6l12 12"/>'),
  slash: () => sv('<path d="M15 4 9 20"/>'), page: () => sv('<path d="M7 3h7l5 5v13H7zM14 3v5h5"/>'), layers: () => sv('<path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/>'),
  palette: () => sv('<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  text: () => sv('<path d="M4 6h16M4 12h10M4 18h14"/>'), phone: () => sv('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'),
  search: () => sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'), spark: () => sv('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  book: () => sv('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h7M8 11h5"/>'), doc: () => sv('<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>'),
  neva: () => sv('<path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6z"/>', 'nv'),
};
export const COMMANDS = [
  { id: 'pagina', label: 'Nova página', hint: 'Criar outra página no site', icon: I.page, prefix: 'Crie uma nova página no site: ' },
  { id: 'secao', label: 'Nova seção', hint: 'Adicionar um bloco à página', icon: I.layers, prefix: 'Adicione uma nova seção: ' },
  { id: 'cores', label: 'Cores e fontes', hint: 'Trocar paleta ou tipografia', icon: I.palette, prefix: 'Mude as cores e/ou as fontes do site: ' },
  { id: 'textos', label: 'Reescrever textos', hint: 'Texto mais claro e vendedor', icon: I.text, prefix: 'Reescreva os textos do site: ' },
  { id: 'mobile', label: 'Ajustar no celular', hint: 'Revisar a versão mobile', icon: I.phone, prefix: 'Melhore a versão para celular: ' },
  { id: 'seo', label: 'SEO', hint: 'Títulos, descrições e headings', icon: I.search, prefix: 'Melhore o SEO do site (títulos, descrições e hierarquia de títulos): ' },
  { id: 'animar', label: 'Animações', hint: 'Movimento sutil ao rolar', icon: I.spark, prefix: 'Adicione animações sutis e elegantes, respeitando "reduzir movimento": ' },
];
const levelBars = (count, level) => h('span', { class: 'cp-bars', 'aria-hidden': 'true' }, Array.from({ length: count }, (_, i) => h('i', { class: i <= level ? 'on' : '', style: `height:${((i + 1) / count) * 100}%` })));

/** Abre para baixo quando não cabe acima (ex.: caixa no alto da tela inicial). */
function flip(el) {
  el.classList.remove('down');
  const clip = el.closest('.nc-scroll,.nc-main') || document.body; const top = clip.getBoundingClientRect().top;
  if (el.getBoundingClientRect().top < top + 6) el.classList.add('down');
}
/** Menu flutuante que abre para cima a partir do botão. */
function popMenu(trigger, build, { cls = '', label = '' } = {}) {
  let el = null;
  const close = () => { if (!el) return; const m = el; el = null; m.classList.add('out'); setTimeout(() => m.remove(), 120); trigger.setAttribute('aria-expanded', 'false'); trigger.classList.remove('on'); document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  const away = (e) => { if (el && !el.contains(e.target) && !trigger.contains(e.target)) close(); };
  const key = (e) => {
    if (!el) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); return; }
    const items = [...el.querySelectorAll('[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox]')]; const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = items.length; items[(i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n]?.focus(); }
  };
  const open = () => {
    el = h('div', { class: 'cp-menu ' + cls, role: 'menu', 'aria-label': label }, build(close));
    trigger.after(el); trigger.setAttribute('aria-expanded', 'true'); trigger.classList.add('on'); flip(el);
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', key);
    requestAnimationFrame(() => (el?.querySelector('[aria-checked=true]') || el?.querySelector('[role^=menuitem]'))?.focus());
  };
  trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => (el ? close() : open()));
  return { close, refresh: () => { if (el) { const b = build(close); mount(el, b); } } };
}

/**
 * opts: { models, defaultModel, placeholder, disabled, upload, loadDesigns, onSubmit(text, meta), onStop, meter }
 * meta = { model, effort, command, designs:[{id,title}], files, assets }
 */
export function composer(opts) {
  const models = opts.models?.length ? opts.models : [{ id: 'neva', name: 'Neva IA', description: '', efforts: [{ id: 'medium', label: 'Médio', hint: '' }], defaultEffort: 'medium' }];
  const find = (id) => models.find((m) => m.id === id);
  let sel = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
  if (!sel || !find(sel.model)) { const m = find(opts.defaultModel) || models[0]; sel = { model: m.id, effort: m.defaultEffort || m.efforts[0].id }; }
  if (!find(sel.model).efforts.some((e) => e.id === sel.effort)) sel.effort = find(sel.model).defaultEffort || find(sel.model).efforts[0].id;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch { /* ok */ } };
  let command = null; let designs = []; let designList = null; let responding = false; let lastSent = '';
  let menuIndex = 0; let menuDismissed = false; let disabled = Boolean(opts.disabled);

  const ta = h('textarea', { class: 'cp-ta', rows: 1, placeholder: opts.placeholder || 'Descreva o que você quer', 'aria-label': 'Mensagem', 'aria-autocomplete': 'list' });
  const fit = (reset) => { ta.style.height = 'auto'; if (reset) { ta.style.height = ''; return; } ta.style.height = `${Math.min(280, Math.max(56, ta.scrollHeight))}px`; };
  const att = attachControls({ disabled, label: false, upload: opts.upload, onChange: () => { paintTray(); paintSend(); } });
  att.button.classList.add('cp-attach'); att.button.replaceChildren(I.plus()); att.button.title = 'Anexar fotos, logo ou arquivos (ou arraste e cole aqui)';

  // ---- bandeja: comando, referências e anexos
  const tray = h('div', { class: 'cp-tray', hidden: true });
  const pill = (cls, text, onX, lead) => h('span', { class: 'cp-pill ' + cls }, lead, h('b', text), h('button', { type: 'button', 'aria-label': `Remover ${text}`, onclick: () => { onX(); ta.focus(); } }, I.x()));
  function paintTray() {
    mount(tray,
      command && pill('cmd', command.label, () => { command = null; paintTray(); }, h('i', '/')),
      designs.map((d) => pill('ref', d.title, () => { designs = designs.filter((x) => x.id !== d.id); paintTray(); paintDesignBtn(); opts.onDesigns?.(designs); }, I.book())),
      att.chips);
    tray.hidden = !command && !designs.length && !att.files.length;
  }

  // ---- menu de comandos "/"
  const slash = h('div', { class: 'cp-slash', role: 'listbox', 'aria-label': 'Comandos', hidden: true });
  const query = () => (!command && ta.value.startsWith('/') && !/\s/.test(ta.value) ? ta.value.slice(1).toLowerCase() : null);
  const cmds = opts.commands || COMMANDS;
  const matches = () => { const q = query(); return q === null ? [] : cmds.filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q)); };
  function paintSlash() {
    const list = matches(); const show = list.length > 0 && !menuDismissed;
    slash.hidden = !show; if (!show) { ta.removeAttribute('aria-activedescendant'); return; }
    menuIndex = Math.min(menuIndex, list.length - 1); const q = query();
    const mark = (label) => { const i = q ? label.toLowerCase().indexOf(q) : -1; return i < 0 ? label : [label.slice(0, i), h('b', label.slice(i, i + q.length)), label.slice(i + q.length)]; };
    mount(slash, list.map((c, i) => h('div', { class: 'cp-opt' + (i === menuIndex ? ' on' : ''), id: `cp-opt-${c.id}`, role: 'option', 'aria-selected': String(i === menuIndex),
      onmousedown: (e) => e.preventDefault(), onpointermove: () => { if (menuIndex !== i) { menuIndex = i; paintSlash(); } }, onclick: () => pickCommand(c) },
    h('span', { class: 'ic' }, c.icon()), h('span', { class: 'lb' }, mark(c.label)), h('small', c.hint))),
    h('div', { class: 'cp-keys' }, h('span', h('kbd', '↑'), h('kbd', '↓'), ' mover'), h('span', h('kbd', '↵'), ' escolher'), h('span', h('kbd', 'esc'), ' fechar')));
    ta.setAttribute('aria-activedescendant', `cp-opt-${list[menuIndex].id}`);
    flip(slash);
  }
  function pickCommand(c) {
    ta.value = ''; menuIndex = 0; fit(true); slash.hidden = true;
    if (c.picker) designBtn.click();
    else { command = c; paintTray(); }
    ta.focus(); paintSend();
  }

  // ---- modelo e esforço
  const modelBtn = h('button', { type: 'button', class: 'cp-ghost cp-model' });
  const effortBtn = h('button', { type: 'button', class: 'cp-ghost cp-effort' });
  const curModel = () => find(sel.model); const lvl = () => Math.max(0, curModel().efforts.findIndex((e) => e.id === sel.effort));
  const carry = (from, to, effort) => {
    if (to.efforts.some((e) => e.id === effort)) return effort;
    const share = from.efforts.length > 1 ? from.efforts.findIndex((e) => e.id === effort) / (from.efforts.length - 1) : 0;
    return to.efforts[Math.round(share * (to.efforts.length - 1))]?.id || to.defaultEffort || to.efforts[0].id;
  };
  function paintModel() {
    const m = curModel(); const swap = h('span', { class: 'cp-swap' }, m.name);
    mount(modelBtn, I.neva(), swap, I.chev()); modelBtn.setAttribute('aria-label', `Modelo: ${m.name}. Trocar`);
    effortBtn.hidden = m.efforts.length < 2;
    mount(effortBtn, levelBars(m.efforts.length, lvl()), h('span', m.efforts[lvl()].label)); effortBtn.setAttribute('aria-label', `Esforço: ${m.efforts[lvl()].label}. Trocar`);
    opts.onModel?.({ ...sel }, m);
  }
  popMenu(modelBtn, (close) => [h('p', { class: 'cp-mlabel' }, 'Modelo'), models.map((m) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(m.id === sel.model), class: 'cp-mi',
    onclick: () => { if (m.id !== sel.model) { sel = { model: m.id, effort: carry(curModel(), m, sel.effort) }; save(); paintModel(); } close(); modelBtn.focus(); } },
  h('span', { class: 'ic' }, I.neva()), h('span', { class: 'tx' }, h('b', m.name), m.description && h('small', m.description)), I.check()))], { cls: 'w72', label: 'Modelo' });
  popMenu(effortBtn, (close) => { const m = curModel(); return [h('p', { class: 'cp-mlabel' }, 'Esforço'), [...m.efforts].reverse().map((e) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(e.id === sel.effort), class: 'cp-mi',
    onclick: () => { sel.effort = e.id; save(); paintModel(); close(); effortBtn.focus(); } },
  h('span', { class: 'ic' }, levelBars(m.efforts.length, m.efforts.indexOf(e))), h('span', { class: 'tx' }, h('b', e.label), e.hint && h('small', e.hint)), I.check()))]; }, { cls: 'w60', label: 'Esforço' });

  // ---- referência de design (DESIGN.md da página Referências de design)
  const designBtn = h('button', { type: 'button', class: 'cp-ghost cp-design', title: 'Usar uma referência de design (DESIGN.md)' });
  const paintDesignBtn = () => mount(designBtn, I.book(), h('span', designs.length ? `Design · ${designs.length}` : 'Design'));
  const designMenu = popMenu(designBtn, (close) => {
    if (!designList) {
      Promise.resolve(opts.loadDesigns?.()).then((l) => { designList = l || []; designMenu.refresh(); }).catch(() => { designList = []; designMenu.refresh(); });
      return [h('p', { class: 'cp-mlabel' }, 'Referências de design'), h('p', { class: 'cp-mempty' }, 'Carregando…')];
    }
    if (!designList.length) return [h('p', { class: 'cp-mlabel' }, 'Referências de design'), h('p', { class: 'cp-mempty' }, 'Nenhuma referência publicada ainda.')];
    return [h('p', { class: 'cp-mlabel' }, 'Referências de design · até 3'), h('div', { class: 'cp-mscroll' }, designList.map((d) => {
      const on = designs.some((x) => x.id === d.id);
      return h('button', { type: 'button', role: 'menuitemcheckbox', 'aria-checked': String(on), class: 'cp-mi',
        onclick: () => {
          if (on) designs = designs.filter((x) => x.id !== d.id);
          else if (designs.length >= 3) { toast('Escolha no máximo 3 referências.', 'err'); return; } else designs = [...designs, { id: d.id, title: d.title }];
          paintTray(); paintDesignBtn(); designMenu.refresh(); opts.onDesigns?.(designs);
        } },
      h('span', { class: 'ic' }, I.book()), h('span', { class: 'tx' }, h('b', d.title), (d.style || d.niche) && h('small', [d.style, d.niche].filter(Boolean).join(' · '))), I.check());
    })), h('a', { class: 'cp-mfoot', href: '#/design', onclick: close }, 'Ver todas em Referências de design →')];
  }, { cls: 'w80', label: 'Referências de design' });

  // ---- enviar / parar
  const send = h('button', { type: 'button', class: 'cp-send' }, h('span', { class: 'f go' }, I.up()), h('span', { class: 'f st' }, h('i')));
  const canSend = () => !disabled && !responding && (ta.value.trim().length > 0 || att.files.length > 0) && !matches().length;
  function paintSend() {
    send.classList.toggle('ready', canSend() || responding); send.classList.toggle('stop', responding);
    send.disabled = !(responding || canSend()); send.setAttribute('aria-label', responding ? 'Parar resposta' : 'Enviar mensagem');
  }
  async function submit() {
    if (!canSend()) return;
    if (!att.ready()) { toast('Espere o envio das imagens terminar.', 'err'); return; }
    const text = ta.value.trim(); const meta = { ...sel, command, designs: designs.slice(), files: att.files.slice(), assets: att.assets() };
    const ok = await opts.onSubmit?.(text, meta);
    if (ok === false) return;
    lastSent = text; ta.value = ''; command = null; att.clear(); fit(true); paintTray(); paintSend();
  }
  send.addEventListener('click', () => (responding ? opts.onStop?.() : submit()));

  ta.addEventListener('input', () => { menuDismissed = false; menuIndex = 0; fit(); paintSlash(); paintSend(); });
  ta.addEventListener('blur', () => { menuDismissed = true; paintSlash(); });
  ta.addEventListener('focus', () => { menuDismissed = false; paintSlash(); });
  ta.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); att.take(f); } });
  ta.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const list = matches();
    if (list.length && !menuDismissed) {
      const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); menuIndex = (menuIndex + step + list.length) % list.length; paintSlash(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickCommand(list[menuIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); menuDismissed = true; paintSlash(); return; }
    }
    if (ta.value === '') {
      if (e.key === 'ArrowUp' && lastSent) { e.preventDefault(); ta.value = lastSent; fit(); paintSend(); requestAnimationFrame(() => ta.setSelectionRange(ta.value.length, ta.value.length)); return; }
      if (e.key === 'Backspace' && command) { e.preventDefault(); command = null; paintTray(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape' && responding) { e.preventDefault(); opts.onStop?.(); }
  });

  const drop = h('div', { class: 'cp-drop', 'aria-hidden': 'true' }, 'Solte para anexar');
  const box = h('div', { class: 'cp-box' }, tray, slash, ta,
    h('div', { class: 'cp-bar' }, att.button, modelBtn, effortBtn, opts.loadDesigns ? designBtn : null, h('span', { class: 'cp-grow' }), opts.meter?.el, send), drop, att.picker);
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  box.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); box.classList.add('drag'); } });
  box.addEventListener('dragleave', (e) => { if (!box.contains(e.relatedTarget)) box.classList.remove('drag'); });
  box.addEventListener('drop', (e) => { if (hasFiles(e)) { e.preventDefault(); box.classList.remove('drag'); att.take(e.dataTransfer.files); } });
  const root = h('div', { class: 'cp' }, box);
  paintModel(); paintDesignBtn(); paintTray(); paintSend();

  return {
    el: root, textarea: ta,
    focus: () => ta.focus(),
    setValue(v) { ta.value = v; fit(); paintSend(); },
    setResponding(v) { responding = v; ta.placeholder = v ? 'Trabalhando… Esc para parar' : (opts.placeholder || ''); paintSend(); },
    setDisabled(v) { disabled = v; ta.disabled = v; att.button.disabled = v; paintSend(); },
    setPlaceholder(p) { opts.placeholder = p; if (!responding) ta.placeholder = p; },
    selection: () => ({ ...sel }),
    designs: () => designs.slice(),
    setDesigns(list) { designs = list.slice(0, 3); paintTray(); paintDesignBtn(); },
    shake() { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); },
  };
}
