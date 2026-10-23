// Paleta de comandos — porte em JS puro do componente "Command Palette" (action-search-bar) do Kokonut UI (MIT, @kokonutui, https://kokonutui.com).
import { h, svg, ensureStyle, reduced, disposer, PALETTE } from '../kit.js';
import { copyText } from '../../ui.js';

const HOLD_MS = 400, RECENT_LIMIT = 3;
const WORD_BREAK = /[\s\-_/.]/;
const isMac = /mac|iphone|ipad/i.test(navigator.userAgent);

const P = (d) => ['path', { d }];
const ICONS = {
  search: [['circle', { cx: 11, cy: 11, r: 8 }], P('m21 21-4.3-4.3')],
  user: [P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), ['circle', { cx: 12, cy: 7, r: 4 }]],
  copy: [['rect', { width: 14, height: 14, x: 8, y: 8, rx: 2 }], P('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2')],
  folder: [P('M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1'), P('M2 13h10'), P('m9 16 3-3-3-3')],
  theme: [P('M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4'), P('M12 2v2'), P('M12 20v2'), P('m4.9 4.9 1.4 1.4'), P('m17.7 17.7 1.4 1.4'), P('M2 12h2'), P('M20 12h2'), P('m6.3 17.7-1.4 1.4'), P('m19.1 4.9-1.4 1.4')],
  userplus: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('M19 8v6'), P('M22 11h-6')],
  link: [P('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'), P('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')],
  users: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('M22 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
  trend: [P('M16 7h6v6'), P('m22 7-8.5 8.5-5-5L2 17')],
  chart: [P('M3 3v16a2 2 0 0 0 2 2h16'), P('M18 17V9'), P('M13 17V5'), P('M8 17v-3')],
  right: [P('m9 18 6-6-6-6')], up: [P('M7 7h10v10'), P('M7 17 17 7')], check: [P('M20 6 9 17l-5-5')], loader: [P('M21 12a9 9 0 1 1-6.219-8.56')],
};
const ico = (n, size = 16, cls) => svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: cls }, ICONS[n].map(([t, a]) => svg(t, a)));

const ITEMS = [
  { id: 'novo-cliente', label: 'Novo cliente', icon: 'user', group: 'Ações', keywords: ['criar', 'cadastrar', 'lead'], shortcut: ['Ctrl', 'N'] },
  { id: 'duplicar', label: 'Duplicar proposta', icon: 'copy', group: 'Ações', keywords: ['copiar', 'clonar'], shortcut: ['Ctrl', 'D'] },
  { id: 'mover', label: 'Mover para…', icon: 'folder', group: 'Ações', keywords: ['pasta', 'funil', 'etapa'], placeholder: 'Mover para qual etapa?', children: [
    { id: 'mover-negociacao', label: 'Em negociação', icon: 'folder' }, { id: 'mover-fechadas', label: 'Fechadas', icon: 'folder' }, { id: 'mover-arquivo', label: 'Arquivo', icon: 'folder' } ] },
  { id: 'tema', label: 'Alterar tema', icon: 'theme', group: 'Ações', keywords: ['aparência', 'escuro', 'claro', 'modo'], placeholder: 'Escolha um tema…', children: [
    { id: 'tema-claro', label: 'Claro', icon: 'theme' }, { id: 'tema-escuro', label: 'Escuro', icon: 'theme' }, { id: 'tema-auto', label: 'Automático', icon: 'theme' } ] },
  { id: 'convidar', label: 'Convidar integrante', icon: 'userplus', group: 'Ações', keywords: ['equipe', 'compartilhar', 'adicionar'] },
  { id: 'copiar-link', label: 'Copiar link', icon: 'link', group: 'Ações', keywords: ['url', 'compartilhar'], shortcut: ['Ctrl', 'L'] },
  { id: 'leads', label: 'Leads', icon: 'users', group: 'Ir para', keywords: ['contatos', 'prospecção'], href: '#/leads' },
  { id: 'vendas', label: 'Vendas', icon: 'trend', group: 'Ir para', keywords: ['pedidos', 'faturamento'], href: '#/sales' },
  { id: 'painel', label: 'Painel', icon: 'chart', group: 'Ir para', keywords: ['início', 'resumo', 'indicadores'], href: '#/dashboard' },
];

/* ---- busca aproximada ---- */
const isWordStart = (t, i) => i === 0 || WORD_BREAK.test(t[i - 1] || '');
const nextWordStart = (t, ch, from) => { for (let j = from; j < t.length; j++) if (t[j] === ch && isWordStart(t, j)) return j; return from; };
function subsequence(t, q, preferWordStarts) {
  const matches = []; let score = 0, from = 0;
  for (const ch of q) {
    let i = t.indexOf(ch, from); if (i < 0) return null;
    const prev = matches[matches.length - 1];
    // A menos que continue uma sequência, salta para o início de palavra que tenha `ch`.
    if (preferWordStarts && (prev === undefined || i !== prev + 1)) i = nextWordStart(t, ch, i);
    score += prev !== undefined && i === prev + 1 ? 6 : 1; score += isWordStart(t, i) ? 8 : 0;
    score -= prev === undefined ? i * 0.5 : (i - prev - 1) * 0.2;
    matches.push(i); from = i + 1;
  }
  return { score, matches };
}
// Prefere trechos contíguos, inícios de palavra e acertos cedo; null se `query` não é subsequência.
function fuzzyMatch(text, query) {
  const t = text.toLowerCase(), q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return { score: 0, matches: [] };
  const at = t.indexOf(q);
  if (at >= 0) return { score: 100 - at + (isWordStart(t, at) ? 30 : 0), matches: Array.from({ length: q.length }, (_, k) => at + k) };
  return subsequence(t, q, true) || subsequence(t, q, false);
}
function scoreEntry(entry, query) {
  const on = fuzzyMatch(entry.item.label, query); if (on) return on;
  let best = null;
  for (const w of [...entry.path.map((p) => p.label), ...(entry.item.keywords || [])]) { const hit = fuzzyMatch(w, query); if (hit && (best === null || hit.score > best)) best = hit.score; }
  return best === null ? null : { score: best / 2, matches: [] };
}
const flatten = (items, path = []) => items.flatMap((item) => [{ item, path }, ...(item.children ? flatten(item.children, [...path, item]) : [])]);
function groupRows(rows, fallback) {
  const by = new Map();
  for (const r of rows) { const l = r.path[0]?.group || r.item.group || fallback || ''; (by.get(l) || by.set(l, []).get(l)).push(r); }
  return [...by].map(([label, list]) => ({ key: label || 'items', label: label || undefined, rows: list }));
}
function buildSections(page, rootItems, query, recent) {
  const items = page?.children || rootItems, fallback = page?.label;
  if (!query.trim()) {
    const sections = groupRows(items.map((item) => ({ item, path: [], key: item.id, matches: [], score: 0 })), fallback);
    if (!page && recent.length) sections.unshift({ key: 'recentes', label: 'Recentes', rows: recent.map((e) => ({ ...e, key: 'recent-' + e.item.id, matches: [], score: 0 })) });
    return sections;
  }
  // Buscar dentro de uma página alcança também as linhas aninhadas.
  const rows = [];
  for (const e of flatten(items)) { const hit = scoreEntry(e, query); if (hit) rows.push({ ...e, key: e.item.id, ...hit }); }
  const sections = groupRows(rows, fallback);
  sections.forEach((s) => s.rows.sort((a, b) => b.score - a.score));
  return sections;
}

export default function mount(stage, ctx) {
  ensureStyle('action-search-bar', `
.kk-action-search-bar-root{--as-bg:#fff;--as-bd:${PALETTE.line};--as-tx:${PALETTE.ink};--as-mu:${PALETTE.mut};--as-hv:${PALETTE.ice100};--as-kb:${PALETTE.ice50};--as-sub:${PALETTE.ice400};
  position:relative;width:100%;box-sizing:border-box;padding:12px 8px;height:430px;container-type:inline-size}
.kk-action-search-bar-root[data-th=dark]{--as-bg:#0f2438;--as-bd:#24425f;--as-tx:#e8f2fb;--as-mu:#8fb0cf;--as-hv:#183450;--as-kb:#183450;--as-sub:#5d83a8}
.kk-action-search-bar-box{position:absolute;left:8px;right:8px;top:12px;z-index:30;overflow:hidden;border-radius:14px;border:1px solid var(--as-bd);background:var(--as-bg);box-shadow:0 1px 2px rgba(15,53,96,.08);transition:box-shadow .2s}
.kk-action-search-bar-box.open{box-shadow:0 16px 40px -16px rgba(15,53,96,.4)}
.kk-action-search-bar-bar{display:flex;align-items:center;gap:8px;height:46px;padding:0 12px}
.kk-action-search-bar-bar>svg{flex:none;color:var(--as-sub)}
.kk-action-search-bar-root .kk-action-search-bar-in{flex:1;min-width:0;height:100%;border:0!important;outline:0!important;box-shadow:none!important;padding:0!important;border-radius:0!important;background:transparent!important;color:var(--as-tx);font:inherit;font-size:16px}
.kk-action-search-bar-in::placeholder{color:var(--as-sub)}
.kk-action-search-bar-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 4px;border:1px solid var(--as-bd);border-radius:4px;background:var(--as-kb);color:var(--as-mu);font:inherit;font-size:11px}
.kk-action-search-bar-keys{display:flex;gap:2px;flex:none}
.kk-action-search-bar-crumb{flex:none;height:28px;padding:0 8px;border:0;border-radius:7px;background:var(--as-hv);color:var(--as-tx);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.kk-action-search-bar-crumb:hover{background:${PALETTE.ice200}}
.kk-action-search-bar-line{border-top:1px solid var(--as-hv)}
.kk-action-search-bar-body{overflow:hidden}
.kk-action-search-bar-body.fit{transition:height .32s cubic-bezier(.23,1,.32,1)}
.kk-action-search-bar-list{position:relative;max-height:min(288px,46vh);overflow-y:auto;overscroll-behavior:contain;padding:6px}
.kk-action-search-bar-grp{padding:8px 8px 4px;font-size:11px;font-weight:500;color:var(--as-mu)}
.kk-action-search-bar-row{display:flex;align-items:center;gap:10px;min-height:38px;padding:0 8px;border-radius:7px;color:var(--as-tx);font-size:14px;cursor:default}
.kk-action-search-bar-row[aria-selected=true]{background:var(--as-hv)}.kk-action-search-bar-row[aria-disabled=true]{opacity:.5}
.kk-action-search-bar-ic{display:flex;flex:none;color:var(--as-sub)}.kk-action-search-bar-row[aria-selected=true] .kk-action-search-bar-ic{color:var(--as-tx)}
.kk-action-search-bar-lb{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kk-action-search-bar-lb em{font-style:normal;color:var(--as-sub)}
.kk-action-search-bar-lb b{font-weight:700}
.kk-action-search-bar-end{display:flex;flex:none;align-items:center;color:var(--as-sub)}
.kk-action-search-bar-spin{animation:kk-asb-spin .8s linear infinite;color:var(--as-mu)}@keyframes kk-asb-spin{to{transform:rotate(360deg)}}
.kk-action-search-bar-none{margin:0;padding:4px 12px 22px;text-align:center;font-size:14px;color:var(--as-mu)}
.kk-action-search-bar-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border-top:1px solid var(--as-hv);font-size:11px;color:var(--as-mu)}
.kk-action-search-bar-foot span{display:flex;align-items:center;gap:6px}
.kk-action-search-bar-nav{display:none!important}@container (min-width:400px){.kk-action-search-bar-nav{display:flex!important}}
.kk-action-search-bar-log{position:absolute;left:8px;right:8px;bottom:8px;padding:12px 14px;box-sizing:border-box;border-radius:12px;background:rgba(255,255,255,.7);border:1px solid ${PALETTE.line};font-size:13px;color:${PALETTE.mut};line-height:1.6}
.kk-action-search-bar-log b{color:${PALETTE.ink}}.kk-action-search-bar-log ul{margin:6px 0 0;padding:0;list-style:none}
.kk-action-search-bar-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };
  const uid = 'kk-asb' + Math.random().toString(36).slice(2, 7), inputId = uid + '-in', listId = uid + '-lb', optId = (i) => `${uid}-o${i}`;

  // ---- estado ----
  let open = false, query = '', stack = [], activeIndex = 0, running = null, recentIds = ['copiar-link', 'tema-escuro'], hovering = false, onScreen = true;
  let fadeNextOpen = false, slideNext = 0, springUntil = 0, returnFocus = null, holdTimer = 0, runToken = 0, sections = [], rows = [];
  const stats = { clientes: 214, propostas: 38, equipe: 4 }; const events = [];
  const findEntry = (id) => flatten(ITEMS).find((e) => e.item.id === id);

  // ---- DOM ----
  const input = h('input', { class: 'kk-action-search-bar-in', id: inputId, type: 'text', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Buscar comandos',
    placeholder: 'Buscar ou ir para…', oninput: () => { query = input.value; activeIndex = 0; openPalette('keyboard'); update(); }, onkeydown, onpointerdown: (e) => { if (e.button === 0) openPalette('pointer'); } });
  const crumbs = h('span', { style: 'display:contents' }), kbdHint = h('span', { class: 'kk-action-search-bar-keys', 'aria-hidden': 'true' }, h('kbd', { class: 'kk-action-search-bar-kbd' }, isMac ? '⌘' : 'Ctrl'), h('kbd', { class: 'kk-action-search-bar-kbd' }, 'K'));
  const bar = h('div', { class: 'kk-action-search-bar-bar' }, ico('search'), crumbs, h('label', { class: 'kk-action-search-bar-sr', for: inputId }, 'Buscar comandos'), input, kbdHint);
  const list = h('div', { class: 'kk-action-search-bar-list', id: listId, role: 'listbox' });
  const none = h('p', { class: 'kk-action-search-bar-none' });
  const content = h('div', list, none);
  const body = h('div', { class: 'kk-action-search-bar-body' }, content);
  const foot = h('div', { class: 'kk-action-search-bar-foot' });
  const panel = h('div', { style: 'display:none', onpointerdown: (e) => e.preventDefault() }, h('div', { class: 'kk-action-search-bar-line' }), body, foot);
  const live = h('span', { class: 'kk-action-search-bar-sr', 'aria-live': 'polite' });
  const box = h('div', { class: 'kk-action-search-bar-box' }, bar, panel);
  const logEl = h('div', { class: 'kk-action-search-bar-log' });
  const root = h('div', { class: 'kk-action-search-bar-root', onfocusout: (e) => { if (open && !(e.relatedTarget instanceof Node && root.contains(e.relatedTarget))) { returnFocus = null; closePalette(false); } } }, box, logEl, live);
  stage.append(root);
  on(root, 'pointerenter', (e) => { hovering = e.pointerType === 'mouse'; }); on(root, 'pointerleave', () => { hovering = false; });
  const io = new IntersectionObserver(([en]) => { onScreen = en?.isIntersecting ?? true; }); io.observe(root); d(() => io.disconnect());
  d(() => clearTimeout(holdTimer));

  const page = () => stack[stack.length - 1];
  const recentEntries = () => recentIds.map(findEntry).filter((e) => e && !e.item.children).slice(0, RECENT_LIMIT);
  const say = (t) => { live.textContent = t; };
  const log = (text) => { events.unshift(text); events.length = Math.min(events.length, 3); drawLog(); };
  function drawLog() {
    logEl.replaceChildren(h('span', `${stats.clientes} clientes · ${stats.propostas} propostas · ${stats.equipe} integrantes`), events.length ? h('ul', events.map((e) => h('li', '• ' + e))) : h('div', 'Abra a paleta (clique ou ', h('b', (isMac ? '⌘' : 'Ctrl') + ' K'), ') e execute um comando.'));
  }

  // ---- renderização ----
  function highlighted(text, matches) {
    if (!matches.length) return text;
    const hit = new Set(matches), out = []; let cur = null;
    [...text].forEach((ch, i) => { const on = hit.has(i); if (cur && cur.on === on) cur.t += ch; else out.push(cur = { on, t: ch }); });
    return out.map((p) => (p.on ? h('b', p.t) : p.t));
  }
  function rowEnd(item, status) {
    if (status === 'pending') return ico('loader', 16, 'kk-action-search-bar-spin');
    if (status === 'done') return h('span', { style: 'color:var(--as-tx);display:flex' }, ico('check'));
    if (item.children) return ico('right');
    if (item.href) return ico('up');
    if (item.shortcut) return h('span', { class: 'kk-action-search-bar-keys', 'aria-hidden': 'true' }, item.shortcut.map((k) => h('kbd', { class: 'kk-action-search-bar-kbd' }, k)));
    return null;
  }
  function update() {
    sections = buildSections(page(), ITEMS, query, recentEntries()); rows = sections.flatMap((s) => s.rows);
    const hi = Math.min(activeIndex, rows.length - 1), activeRow = open ? rows[hi] : undefined;
    input.placeholder = page() ? page().placeholder || `Buscar em ${page().label.toLowerCase()}…` : 'Buscar ou ir para…';
    input.value = query; input.readOnly = running !== null;
    input.setAttribute('aria-expanded', String(open)); input.toggleAttribute('aria-controls', open); if (open) input.setAttribute('aria-controls', listId);
    if (activeRow) input.setAttribute('aria-activedescendant', optId(hi)); else input.removeAttribute('aria-activedescendant');
    crumbs.replaceChildren(...stack.map((p, i) => h('button', { class: 'kk-action-search-bar-crumb', type: 'button', 'aria-label': `Voltar de ${p.label}`, tabindex: '-1', onpointerdown: (e) => e.preventDefault(), onclick: () => { if (i === stack.length - 1 && !running) popPage('pointer'); } }, p.label)));
    kbdHint.style.display = open ? 'none' : '';
    box.classList.toggle('open', open); panel.style.display = open ? '' : 'none';
    if (!open) return;
    list.setAttribute('aria-busy', String(running?.phase === 'pending')); list.setAttribute('aria-label', page() ? page().label : 'Comandos');
    let idx = -1;
    list.replaceChildren(...sections.map((s) => {
      const gid = `${uid}-${s.key}`;
      return h('div', { role: 'group', 'aria-labelledby': s.label ? gid : null },
        s.label && h('div', { class: 'kk-action-search-bar-grp', id: gid, role: 'presentation' }, s.label),
        s.rows.map((row) => {
          const index = ++idx, status = running?.key === row.key ? running.phase : undefined;
          return h('div', { class: 'kk-action-search-bar-row', role: 'option', id: optId(index), 'aria-selected': String(index === hi), 'aria-disabled': String(running !== null && !status),
            onclick: () => choose(row, 'pointer'), onpointermove: (e) => { if (e.pointerType === 'mouse' && !running && index !== activeIndex) { activeIndex = index; markActive(); } } },
            h('span', { class: 'kk-action-search-bar-ic', 'aria-hidden': 'true' }, ico(row.item.icon)),
            h('span', { class: 'kk-action-search-bar-lb' }, row.path.map((p) => h('em', p.label + ' › ')), highlighted(row.item.label, row.matches), row.item.children && h('span', { class: 'kk-action-search-bar-sr' }, ', abre uma página')),
            h('span', { class: 'kk-action-search-bar-end' }, rowEnd(row.item, status)));
        }));
    }));
    none.textContent = rows.length ? '' : `Nada encontrado para “${query.trim()}”`; none.style.display = rows.length ? 'none' : '';
    foot.replaceChildren(
      h('span', h('span', { class: 'kk-action-search-bar-nav', style: 'align-items:center;gap:6px;margin-right:6px' }, kbd('↑'), kbd('↓'), 'Navegar'), kbd('↵'), activeRow?.item.children ? 'Abrir' : 'Executar'),
      h('span', stack.length ? [kbd('⌫'), h('span', { style: 'margin-right:6px' }, 'Voltar')] : null, kbd('esc'), 'Fechar'));
    scrollActive(hi);
  }
  const kbd = (t) => h('kbd', { class: 'kk-action-search-bar-kbd' }, t);
  // Só troca o destaque, sem refazer a lista (o ponteiro passa por muitas linhas).
  function markActive() {
    const hi = Math.min(activeIndex, rows.length - 1);
    list.querySelectorAll('[role=option]').forEach((el, i) => el.setAttribute('aria-selected', String(i === hi)));
    if (rows[hi]) input.setAttribute('aria-activedescendant', optId(hi));
    foot.querySelector('span:first-child').lastChild.textContent = rows[hi]?.item.children ? 'Abrir' : 'Executar';
  }
  // Mantém a linha destacada dentro da rolagem da lista (nunca da página).
  function scrollActive(hi) {
    const row = document.getElementById(optId(hi)); if (!row) return;
    const top = row.offsetTop, bottom = top + row.offsetHeight;
    if (top < list.scrollTop + 6) list.scrollTop = top - 30; else if (bottom > list.scrollTop + list.clientHeight - 6) list.scrollTop = bottom - list.clientHeight + 6;
  }
  // Altura do corpo acompanha o conteúdo; com mola só nas trocas de página por ponteiro.
  const ro = new ResizeObserver(() => {
    if (!open) return;
    body.classList.toggle('fit', !rm && performance.now() < springUntil);
    body.style.height = content.offsetHeight + 'px';
  });
  ro.observe(content); d(() => ro.disconnect());

  // ---- abrir / fechar ----
  function openPalette(source) {
    if (open) return;
    fadeNextOpen = source === 'pointer'; activeIndex = 0; open = true; update();
    body.style.height = content.offsetHeight + 'px';
    if (fadeNextOpen && !rm) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'cubic-bezier(.23,1,.32,1)' });
    fadeNextOpen = false;
  }
  function closePalette(restoreFocus) {
    clearTimeout(holdTimer); runToken++; running = null; open = false; query = ''; stack = []; activeIndex = 0; update();
    const t = returnFocus; returnFocus = null;
    if (restoreFocus && t?.isConnected) t.focus();
  }
  // ⌘K / Ctrl+K só vale com o foco ou o ponteiro sobre a paleta (a página mantém o seu).
  on(window, 'keydown', (e) => {
    if (!((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') || !onScreen || e.defaultPrevented) return;
    const f = document.activeElement, inside = f instanceof Node && root.contains(f);
    if (!(inside || hovering)) return;
    if (f?.closest?.('[aria-modal="true"]') && !f.closest('[aria-modal="true"]').contains(root)) return;
    e.preventDefault(); e.stopPropagation();
    if (open) { closePalette(true); return; }
    if (f instanceof HTMLElement && !inside) returnFocus = f;
    input.focus(); input.select(); openPalette('keyboard');
  }, true);

  // ---- páginas ----
  function pushPage(item, source) {
    if (source === 'pointer') { slideNext = 1; springUntil = performance.now() + 150; }
    stack.push(item); query = ''; activeIndex = 0; update(); slide(); say(`${item.label}, ${item.children.length} opções`);
  }
  function popPage(source) {
    const left = stack[stack.length - 1]; if (!left) return;
    if (source === 'pointer') { slideNext = -1; springUntil = performance.now() + 150; }
    stack = stack.slice(0, -1); query = '';
    const back = buildSections(page(), ITEMS, '', recentEntries()).flatMap((s) => s.rows).findIndex((r) => r.key === left.id);
    activeIndex = Math.max(0, back); update(); slide(); say(page()?.label || 'Todos os comandos'); input.focus();
  }
  function slide() {
    const dir = slideNext; slideNext = 0;
    if (dir) list.animate([{ transform: rm ? 'none' : `translateX(${dir * 14}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' });
  }

  // ---- execução: cada comando faz algo de verdade na cena ----
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function perform(item) {
    switch (item.id) {
      case 'novo-cliente': return wait(700).then(() => { stats.clientes++; log('Cliente cadastrado com sucesso.'); });
      case 'duplicar': return wait(600).then(() => { stats.propostas++; log('Proposta duplicada.'); });
      case 'convidar': return wait(700).then(() => { stats.equipe++; log('Convite enviado para a equipe.'); });
      case 'copiar-link': copyText(location.href.split('#')[0] + '#/componentes', 'Link copiado.'); log('Link copiado para a área de transferência.'); return undefined;
      case 'tema-claro': case 'tema-escuro': case 'tema-auto': {
        const t = item.id === 'tema-auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : item.id === 'tema-escuro' ? 'dark' : 'light';
        root.dataset.th = t; log(`Tema: ${item.label.toLowerCase()}.`); return undefined;
      }
      default:
        if (item.id.startsWith('mover-')) { log(`Proposta movida para ${item.label}.`); return wait(500); }
        if (item.href) { location.hash = item.href; return undefined; }
        return undefined;
    }
  }
  function finishRun(row, token) {
    if (token !== runToken) return;
    running = { key: row.key, phase: 'done' }; say(`${row.item.label}, concluído`); update();
    holdTimer = setTimeout(() => {
      if (token !== runToken) return;
      recentIds = [row.item.id, ...recentIds.filter((id) => id !== row.item.id)].slice(0, RECENT_LIMIT);
      closePalette(returnFocus !== null);
    }, HOLD_MS);
  }
  function runRow(row) {
    const token = ++runToken, result = perform(row.item);
    if (!(result instanceof Promise)) { finishRun(row, token); return; }
    running = { key: row.key, phase: 'pending' }; say(`Executando ${row.item.label}`); update();
    result.then(() => finishRun(row, token), () => { if (token === runToken) { running = null; say(`${row.item.label} falhou`); update(); } });
  }
  function choose(row, source) {
    if (running) return;
    if (row.item.children) pushPage(row.item, source); else runRow(row);
  }

  // ---- teclado ----
  function onkeydown(e) {
    if (running && e.key !== 'Tab') { e.preventDefault(); return; }
    const n = rows.length, hi = Math.max(Math.min(activeIndex, n - 1), 0);
    switch (e.key) {
      case 'ArrowDown': case 'ArrowUp': case 'Home': case 'End':
        if (!open) { e.preventDefault(); openPalette('keyboard'); return; }
        if (!n) return;
        e.preventDefault();
        activeIndex = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (hi + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
        markActive(); scrollActive(activeIndex); break;
      case 'Enter':
        e.preventDefault();
        if (!open) openPalette('keyboard'); else if (rows[hi]) choose(rows[hi], 'keyboard');
        break;
      case 'Backspace':
        if (open && query === '' && stack.length) { e.preventDefault(); popPage('keyboard'); }
        break;
      case 'Escape':
        if (open) { e.preventDefault(); closePalette(true); } else if (query) { query = ''; update(); }
        break;
      default: break;
    }
  }

  drawLog(); update();
  return () => { d.run(); root.remove(); };
}
