// Command Button — porte em JS puro do componente "Command Button" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, disposer } from '../kit.js';
import { toast } from '../../ui.js';

const APPLE = /mac|iphone|ipad|ipod/i;
const MODIFIERS = new Set(['mod', 'ctrl', 'alt', 'shift']);
const MAC_LABELS = { mod: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' };
const PC_LABELS = { mod: 'Ctrl', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };
const SPOKEN = { mod: ['Command', 'Control'], ctrl: ['Control', 'Control'], alt: ['Option', 'Alt'], shift: ['Shift', 'Shift'] };

function parseShortcut(s) {
  const parts = s.toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
  return { modifiers: parts.filter((p) => MODIFIERS.has(p)), key: parts.find((p) => !MODIFIERS.has(p)) ?? 'k' };
}
const keyLabel = (k) => (k === 'enter' ? '↵' : k === 'space' ? 'Espaço' : k.length === 1 ? k.toUpperCase() : k);
// Compara também pela tecla física: Option no Mac muda `event.key` (Option+K digita "˚").
const isKey = (e, key) => {
  if (key === 'space') return e.code === 'Space';
  return e.key.toLowerCase() === key || e.code === `Key${key.toUpperCase()}` || e.code === `Digit${key}`;
};
const modDown = (m, e, mac) => (m === 'mod' ? (mac ? e.metaKey : e.ctrlKey) : m === 'ctrl' ? e.ctrlKey : m === 'alt' ? e.altKey : e.shiftKey);
function matches(e, { modifiers, key }, mac) {
  if (!isKey(e, key)) return false;
  return e.metaKey === (modifiers.includes('mod') && mac)
    && e.ctrlKey === (modifiers.includes('ctrl') || (modifiers.includes('mod') && !mac))
    && e.altKey === modifiers.includes('alt') && e.shiftKey === modifiers.includes('shift');
}
const isTyping = (t) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

const CLIENTES = ['Padaria Brasa', 'Loja Aurora', 'Clínica Vida Plena', 'Oficina Torque', 'Studio Maré', 'Mercado Bom Preço'];

export default function mount(stage, ctx) {
  ensureStyle('command-button', `
.kk-command-button-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px 16px;width:100%}
.kk-command-button-btn{display:inline-flex;align-items:center;gap:12px;min-height:40px;max-width:100%;padding:4px 8px 4px 14px;border:1px solid #c9e1f6;border-radius:12px;background:#fff;color:#164a7c;font:600 14px/1 inherit;font-family:inherit;cursor:pointer;transition:background-color .15s,border-color .15s;-webkit-tap-highlight-color:transparent}
.kk-command-button-btn:hover{background:#f2f8fe;border-color:#a5cdee}
.kk-command-button-btn:active{background:#e3f0fb}
.kk-command-button-btn:focus-visible{outline:2px solid #4a95d2;outline-offset:3px}
.kk-command-button-keys{display:flex;align-items:center;gap:4px;padding-bottom:2px}
.kk-command-button-keys.hide{opacity:0}
.kk-command-button-key{display:inline-flex;align-items:center;justify-content:center;height:24px;min-width:24px;padding:0 6px;border:1px solid #c9e1f6;border-radius:6px;background:#fff;color:#2f7bbd;font:600 11px/1 inherit;font-family:inherit;box-shadow:0 2px 0 0 #c9e1f6;transition:transform .15s cubic-bezier(.23,1,.32,1),box-shadow .15s cubic-bezier(.23,1,.32,1)}
.kk-command-button-btn:active .kk-command-button-key,.kk-command-button-key[data-pressed]{transform:translateY(2px);box-shadow:none;transition-duration:.075s}
.kk-command-button-cap{font-size:12px;color:var(--mut,#4a6f93);text-align:center;margin:0;max-width:32ch}
.kk-command-button-pal{position:absolute;inset:0;z-index:2;display:flex;align-items:flex-start;justify-content:center;padding:14px;background:rgba(15,53,96,.28);backdrop-filter:blur(2px)}
.kk-command-button-box{width:100%;max-width:300px;background:#fff;border:1px solid #c9e1f6;border-radius:14px;box-shadow:0 18px 40px -16px rgba(15,53,96,.5);overflow:hidden}
.kk-command-button-in{width:100%;box-sizing:border-box;height:44px;padding:0 14px;border:0;border-bottom:1px solid #d3e6f6;font:400 16px/1 inherit;font-family:inherit;color:#0e2236;background:#fff;outline:none}
.kk-command-button-list{list-style:none;margin:0;padding:6px;max-height:132px;overflow:auto}
.kk-command-button-list button{display:block;width:100%;min-height:36px;padding:0 10px;text-align:left;border:0;border-radius:8px;background:none;color:#0e2236;font:500 13px/1 inherit;font-family:inherit;cursor:pointer}
.kk-command-button-list button:hover,.kk-command-button-list button:focus-visible{background:#e3f0fb;outline:none}
.kk-command-button-vazio{padding:10px;font-size:13px;color:#4a6f93}
`);
  const d = disposer();
  const nav = navigator.userAgentData?.platform ?? navigator.platform ?? '';
  const mac = APPLE.test(nav);
  const labels = mac ? MAC_LABELS : PC_LABELS;
  const clientes = [...CLIENTES];
  let leads = 0;

  // Paleta de busca de verdade: filtra os clientes e confirma com Enter ou clique.
  function openSearch() {
    if (stage.querySelector('.kk-command-button-pal')) return;
    const input = h('input', { class: 'kk-command-button-in', type: 'text', placeholder: 'Buscar cliente…', 'aria-label': 'Buscar cliente', autocomplete: 'off' });
    const list = h('ul', { class: 'kk-command-button-list', role: 'listbox' });
    const pal = h('div', { class: 'kk-command-button-pal', onclick: (e) => { if (e.target === pal) close(); } }, h('div', { class: 'kk-command-button-box', role: 'dialog', 'aria-label': 'Buscar clientes' }, input, list));
    const prevFocus = document.activeElement;
    function close() { pal.remove(); prevFocus?.focus?.(); }
    function fill() {
      const q = input.value.trim().toLowerCase();
      const found = clientes.filter((c) => c.toLowerCase().includes(q));
      list.replaceChildren(...(found.length ? found.map((c) => h('li', { role: 'option' }, h('button', { type: 'button', onclick: () => { close(); toast(`Abrindo ficha de ${c}.`, 'ok'); } }, c))) : [h('li', { class: 'kk-command-button-vazio' }, 'Nenhum cliente encontrado.')]));
    }
    input.addEventListener('input', fill);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Enter') list.querySelector('button')?.click();
    });
    fill(); stage.append(pal); input.focus();
  }
  function novoLead() {
    leads++;
    const nome = `Lead ${leads} — Café Horizonte`;
    clientes.unshift(nome);
    toast(`${nome} adicionado à lista.`, 'ok');
  }

  function commandButton(label, shortcut, action) {
    const parsed = parseShortcut(shortcut);
    const caps = [...parsed.modifiers.map((m) => ({ k: m, label: labels[m] })), { k: 'key', label: keyLabel(parsed.key) }]
      .map((c) => ({ ...c, el: h('kbd', { class: 'kk-command-button-key' }, c.label) }));
    const spoken = [...parsed.modifiers.map((m) => SPOKEN[m][mac ? 0 : 1]), keyLabel(parsed.key)].join('+');
    const btn = h('button', { type: 'button', class: 'kk-command-button-btn', 'aria-keyshortcuts': spoken, onclick: action }, label,
      h('span', { class: 'kk-command-button-keys', 'aria-hidden': 'true' }, caps.map((c) => c.el)));
    const sync = (e, down) => {
      for (const c of caps) {
        const on = c.k === 'key' ? down && isKey(e, parsed.key) : modDown(c.k, e, mac);
        if (on) c.el.dataset.pressed = ''; else delete c.el.dataset.pressed;
      }
    };
    const needsMod = parsed.modifiers.some((m) => m !== 'shift');
    const kd = (e) => {
      if (!needsMod && isTyping(e.target)) return;
      sync(e, true);
      if (!e.repeat && matches(e, parsed, mac)) { e.preventDefault(); btn.click(); }
    };
    const ku = (e) => sync(e, false);
    const release = () => caps.forEach((c) => delete c.el.dataset.pressed);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', release);
    d(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', release); });
    return btn;
  }

  stage.append(h('div', { class: 'kk-command-button-wrap' },
    commandButton('Buscar clientes', 'mod+/', openSearch),
    commandButton('Novo lead', 'alt+n', novoLead),
    h('p', { class: 'kk-command-button-cap' }, 'Aperte as teclas de verdade: os keycaps afundam e o botão é acionado.')));
  return () => d.run();
}
