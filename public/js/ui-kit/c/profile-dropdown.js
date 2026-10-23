// Menu da conta — porte em JS puro do componente "Account Menu" (profile-dropdown) do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, spring, loop, reduced, disposer, PALETTE } from '../kit.js';

const PANEL_MAX = 288, RADIUS = 16, HOLD_MS = 1200;
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

const P = (d) => ['path', { d }];
const ICONS = {
  updown: [P('m7 15 5 5 5-5'), P('m7 9 5-5 5 5')],
  right: [P('m9 18 6-6-6-6')], left: [P('m15 18-6-6 6-6')], check: [P('M20 6 9 17l-5-5')], plus: [P('M5 12h14'), P('M12 5v14')],
  user: [P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), ['circle', { cx: 12, cy: 7, r: 4 }]],
  settings: [P('M20 7h-9'), P('M14 17H5'), ['circle', { cx: 17, cy: 17, r: 3 }], ['circle', { cx: 7, cy: 7, r: 3 }]],
  card: [['rect', { width: 20, height: 14, x: 2, y: 5, rx: 2 }], P('M2 10h20')],
  out: [P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), P('m16 17 5-5-5-5'), P('M21 12H9')],
  sun: [['circle', { cx: 12, cy: 12, r: 4 }], P('M12 2v2'), P('M12 20v2'), P('m4.93 4.93 1.41 1.41'), P('m17.66 17.66 1.41 1.41'), P('M2 12h2'), P('M20 12h2'), P('m6.34 17.66-1.41 1.41'), P('m19.07 4.93-1.41 1.41')],
  moon: [P('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')],
  monitor: [['rect', { width: 20, height: 14, x: 2, y: 3, rx: 2 }], P('M8 21h8'), P('M12 17v4')],
};
const ico = (n, size = 16) => svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, ICONS[n].map(([t, a]) => svg(t, a)));

const STATUSES = [
  { id: 'online', label: 'Online', name: 'Online', dot: '#1f9d6b' },
  { id: 'away', label: 'Ausente', name: 'Ausente', dot: '#e0a526' },
  { id: 'busy', label: 'Ocupado', name: 'Não perturbe', dot: PALETTE.bad },
];
const THEMES = [{ id: 'light', label: 'Claro', icon: 'sun' }, { id: 'dark', label: 'Escuro', icon: 'moon' }, { id: 'system', label: 'Sistema', icon: 'monitor' }];
const ITEMS = [{ id: 'perfil', label: 'Perfil', icon: 'user' }, { id: 'config', label: 'Configurações', icon: 'settings', value: 'Ctrl ,' }, { id: 'cobranca', label: 'Cobrança', icon: 'card' }];
const initialsOf = (a) => a.initials || a.name.split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();

export default function mount(stage, ctx) {
  ensureStyle('profile-dropdown', `
.kk-profile-dropdown-root{--pd-bg:#fff;--pd-bd:${PALETTE.line};--pd-tx:${PALETTE.ink};--pd-mu:${PALETTE.mut};--pd-hv:${PALETTE.ice100};--pd-sub:${PALETTE.ice400};--pd-pill:${PALETTE.ice100};--pd-sel:#fff;
  width:100%;box-sizing:border-box;padding:12px 8px 8px;min-height:450px;display:flex;flex-direction:column;align-items:center;gap:14px;container-type:inline-size;position:relative}
.kk-profile-dropdown-root[data-th=dark]{--pd-bg:#0f2438;--pd-bd:#24425f;--pd-tx:#e8f2fb;--pd-mu:#8fb0cf;--pd-hv:#183450;--pd-sub:#5d83a8;--pd-pill:#183450;--pd-sel:#2b4f73}
.kk-profile-dropdown-wrap{position:relative;isolation:isolate;display:block;width:min(240px,100%)}
.kk-profile-dropdown-wrap.live{z-index:50}
.kk-profile-dropdown-trg{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px 8px 8px;box-sizing:border-box;border:1px solid var(--pd-bd);border-radius:16px;background:var(--pd-bg);color:var(--pd-tx);text-align:left;font:inherit;cursor:pointer;outline:none;transition:background .15s,border-color .15s}
.kk-profile-dropdown-trg:hover{border-color:${PALETTE.ice300};background:var(--pd-hv)}
.kk-profile-dropdown-trg:focus-visible{box-shadow:0 0 0 2px var(--pd-bg),0 0 0 4px ${PALETTE.ice500}}
.kk-profile-dropdown-chev{flex:none;color:var(--pd-sub);transition:opacity .15s}.kk-profile-dropdown-wrap.live .kk-profile-dropdown-chev{opacity:0}
.kk-profile-dropdown-id{display:flex;min-width:0;flex:1;align-items:center;gap:10px}.kk-profile-dropdown-id.st{flex-direction:column;align-items:flex-start;gap:12px;flex:none}
.kk-profile-dropdown-id.hid>*{visibility:hidden}
.kk-profile-dropdown-av{position:relative;flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;font-size:11px;font-weight:600;letter-spacing:.03em;user-select:none}
.kk-profile-dropdown-id.st .kk-profile-dropdown-av{width:40px;height:40px}
.kk-profile-dropdown-av.t0{background:${PALETTE.ink};color:#fff}.kk-profile-dropdown-av.t1{background:${PALETTE.ice300};color:${PALETTE.ice900}}.kk-profile-dropdown-av.t2{background:${PALETTE.ice100};color:${PALETTE.ice800};box-shadow:inset 0 0 0 1px ${PALETTE.ice200}}
.kk-profile-dropdown-root[data-th=dark] .kk-profile-dropdown-av.t0{background:${PALETTE.ice200};color:${PALETTE.ink}}
.kk-profile-dropdown-dot{position:absolute;right:0;bottom:0;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px var(--pd-bg);transition:background .2s}
.kk-profile-dropdown-nm{display:flex;flex-direction:column;min-width:0;text-align:left}
.kk-profile-dropdown-nm b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;line-height:20px;color:var(--pd-tx)}
.kk-profile-dropdown-nm span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;color:var(--pd-mu)}
.kk-profile-dropdown-pan{position:absolute;top:0;right:0;z-index:10;pointer-events:none}
.kk-profile-dropdown-pan.act{pointer-events:auto}
.kk-profile-dropdown-sh{position:absolute;inset:0;filter:drop-shadow(0 12px 24px rgba(15,53,96,.16)) drop-shadow(0 2px 4px rgba(15,53,96,.08))}
.kk-profile-dropdown-sh i{position:absolute;inset:0}
.kk-profile-dropdown-clip{position:relative;overflow:clip}
.kk-profile-dropdown-pages{display:flex;width:max-content;align-items:flex-start}
.kk-profile-dropdown-page{flex:none;padding:6px;box-sizing:border-box;transition:opacity .3s cubic-bezier(.23,1,.32,1)}
.kk-profile-dropdown-page.off{opacity:0}
.kk-profile-dropdown-head{display:flex;align-items:flex-start;justify-content:space-between;padding:10px 10px 12px}
.kk-profile-dropdown-plan{padding-top:2px;font-size:12px;color:var(--pd-sub)}
.kk-profile-dropdown-menu{outline:none}
.kk-profile-dropdown-it{display:flex;align-items:center;gap:10px;width:100%;min-height:38px;padding:8px 10px;box-sizing:border-box;border:0;border-radius:10px;background:none;color:var(--pd-tx);font:inherit;font-size:14px;text-align:left;cursor:default;outline:none;transition:background .1s}
.kk-profile-dropdown-it:focus{background:var(--pd-hv)}
.kk-profile-dropdown-it .ic{color:var(--pd-sub);display:flex}.kk-profile-dropdown-it .gr{flex:1}.kk-profile-dropdown-it .vl{font-size:12px;color:var(--pd-sub)}
.kk-profile-dropdown-sep{height:1px;margin:6px 10px;border:0;background:var(--pd-hv)}
.kk-profile-dropdown-row{display:flex;align-items:center;justify-content:space-between;margin:0;padding:4px 4px 4px 10px;border:0;min-width:0}
.kk-profile-dropdown-row>span:first-child{font-size:14px;color:var(--pd-mu)}
.kk-profile-dropdown-st{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 8px;border:0;border-radius:8px;background:none;color:var(--pd-mu);font:inherit;font-size:12px;cursor:pointer;outline:none}
.kk-profile-dropdown-st:focus{background:var(--pd-hv)}.kk-profile-dropdown-st[aria-checked=true]{color:var(--pd-tx)}
.kk-profile-dropdown-st i{width:8px;height:8px;border-radius:50%;background:${PALETTE.ice200};transition:background .2s}
.kk-profile-dropdown-th{position:relative;display:flex;padding:2px;border-radius:10px;background:var(--pd-pill)}
.kk-profile-dropdown-thb{position:relative;display:grid;place-items:center;width:38px;height:34px;border:0;border-radius:8px;background:none;color:var(--pd-mu);cursor:pointer;outline:none;transition:color .15s}
.kk-profile-dropdown-thb:focus-visible{box-shadow:0 0 0 2px ${PALETTE.ice500}}.kk-profile-dropdown-thb[aria-checked=true]{color:var(--pd-tx)}
.kk-profile-dropdown-thb svg{position:relative}
.kk-profile-dropdown-pl{position:absolute;left:0;top:2px;width:38px;height:34px;border-radius:8px;background:var(--pd-sel);box-shadow:0 1px 2px rgba(15,53,96,.15)}
.kk-profile-dropdown-pl.sl{transition:transform .25s cubic-bezier(.23,1,.32,1)}
.kk-profile-dropdown-two{display:flex;margin-left:-6px}.kk-profile-dropdown-two .kk-profile-dropdown-av{width:20px;height:20px;font-size:8px;box-shadow:0 0 0 2px var(--pd-bg)}.kk-profile-dropdown-two .kk-profile-dropdown-av+.kk-profile-dropdown-av{margin-left:-6px}
.kk-profile-dropdown-two{margin-left:0}
.kk-profile-dropdown-so{position:relative;touch-action:none;user-select:none;-webkit-user-select:none}
.kk-profile-dropdown-fill{position:absolute;inset:0;display:flex;align-items:center;gap:10px;padding:0 10px;border-radius:10px;background:${PALETTE.ink};color:#fff;clip-path:inset(0 100% 0 0 round 10px);transition:clip-path 240ms cubic-bezier(.23,1,.32,1);pointer-events:none}
.kk-profile-dropdown-root[data-th=dark] .kk-profile-dropdown-fill{background:${PALETTE.ice200};color:${PALETTE.ink}}
.kk-profile-dropdown-so.hold .kk-profile-dropdown-fill{clip-path:inset(0 0 0 0 round 10px);transition:clip-path ${HOLD_MS}ms linear}
.kk-profile-dropdown-so.done .kk-profile-dropdown-fill{clip-path:inset(0 0 0 0 round 10px)}
.kk-profile-dropdown-dash{display:grid;place-items:center;width:28px;height:28px;border:1px dashed ${PALETTE.ice300};border-radius:50%;color:var(--pd-sub)}
.kk-profile-dropdown-log{margin-top:auto;width:100%;max-width:300px;padding:12px 14px;box-sizing:border-box;border-radius:12px;background:rgba(255,255,255,.7);border:1px solid ${PALETTE.line};font-size:13px;color:${PALETTE.mut};line-height:1.5}
.kk-profile-dropdown-log b{color:${PALETTE.ink}}
.kk-profile-dropdown-back{margin-top:8px;min-height:36px;padding:0 14px;border:1px solid ${PALETTE.line};border-radius:10px;background:#fff;color:${PALETTE.ink};font:inherit;font-size:13px;cursor:pointer}
.kk-profile-dropdown-back:hover{background:${PALETTE.ice100}}.kk-profile-dropdown-back:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
@media (prefers-reduced-motion:reduce){.kk-profile-dropdown-so.hold .kk-profile-dropdown-fill{transition-duration:${HOLD_MS}ms}}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  // ---- estado ----
  const accounts = [
    { id: 'pessoal', name: 'Marina Duarte', email: 'marina@duarte.com.br', plan: 'Pro' },
    { id: 'loja', name: 'Duarte Cosméticos', email: 'contato@duartecosmeticos.com.br', plan: 'Equipe' },
    { id: 'bairro', name: 'Loja do Bairro', email: 'ola@lojadobairro.com.br', plan: 'Grátis' },
  ];
  let accountId = accounts[0].id, status = 'online', theme = 'system', phase = 'closed', page = 'main', instant = false, signedOut = false, extra = 0;
  let PANEL_W = PANEL_MAX, targetH = 0, closeSeq = 0, intent = { focus: 'menu', resume: false }, pageFocus = null;
  const cur = () => accounts.find((a) => a.id === accountId) || accounts[0];
  const toneOf = (a) => accounts.indexOf(a) % 3;

  // ---- molas do recorte do painel ----
  const w = spring(0, { k: 520, c: 42 }), hh = spring(0, { k: 520, c: 42 }), pageX = spring(0, { k: 520, c: 42 }), bodyOp = spring(1, { k: 300, c: 34 });
  let stopLoop = null, onSettle = null;

  const avatar = (a, { dot = false, cls = '' } = {}) => {
    const el = h('span', { class: `kk-profile-dropdown-av t${toneOf(a)} ${cls}`, 'aria-hidden': 'true' }, initialsOf(a));
    if (dot) el.append(h('span', { class: 'kk-profile-dropdown-dot', style: `background:${STATUSES.find((s) => s.id === status).dot}` }));
    return el;
  };
  const identity = (stacked) => {
    const a = cur(), av = avatar(a, { dot: true });
    const nm = h('b', a.name), em = h('span', a.email);
    return { box: h('span', { class: 'kk-profile-dropdown-id' + (stacked ? ' st' : '') }, av, h('span', { class: 'kk-profile-dropdown-nm' }, nm, em)), parts: [av, nm, em] };
  };

  // ---- gatilho ----
  const trgId = h('span', { style: 'min-width:0;flex:1;display:flex' });
  const trg = h('button', { class: 'kk-profile-dropdown-trg', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: (e) => { const via = e.detail === 0 ? 'keyboard' : 'pointer'; openMenu(via, via === 'keyboard' ? 'first' : 'menu'); },
    onkeydown: (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu('keyboard', e.key === 'ArrowDown' ? 'first' : 'last'); } } },
    trgId, h('span', { class: 'kk-profile-dropdown-chev' }, ico('updown')));

  // ---- painel ----
  const mainPage = h('div', { class: 'kk-profile-dropdown-page' }), accPage = h('div', { class: 'kk-profile-dropdown-page off' });
  const pages = h('div', { class: 'kk-profile-dropdown-pages' }, mainPage, accPage);
  const clipEl = h('div', { class: 'kk-profile-dropdown-clip' }, pages);
  const outerLayer = h('i', { style: `background:var(--pd-bd)` }), innerLayer = h('i', { style: 'background:var(--pd-bg)' });
  const pan = h('div', { class: 'kk-profile-dropdown-pan', style: 'display:none' }, h('div', { class: 'kk-profile-dropdown-sh', 'aria-hidden': 'true' }, outerLayer, innerLayer), clipEl);
  const wrap = h('div', { class: 'kk-profile-dropdown-wrap' }, trg, pan);
  const log = h('div', { class: 'kk-profile-dropdown-log', 'aria-live': 'polite' });
  const root = h('div', { class: 'kk-profile-dropdown-root' }, wrap, log);
  stage.append(root);

  const setLog = (html) => { log.replaceChildren(...html); };
  const say = (...parts) => setLog(parts);

  const items = (el) => [...el.querySelectorAll('[data-menu-item]')];
  const pageEl = (p) => (p === 'main' ? mainPage : accPage);

  function renderClip() {
    const W = w.value, H = hh.value;
    const outer = `inset(0px 0px calc(100% - ${H}px) calc(100% - ${W}px) round ${RADIUS}px)`;
    const inner = `inset(1px 1px calc(100% - ${H}px + 1px) calc(100% - ${W}px + 1px) round ${RADIUS - 1}px)`;
    outerLayer.style.clipPath = outer; innerLayer.style.clipPath = inner; clipEl.style.clipPath = inner;
    pages.style.transform = `translate3d(${pageX.value}px,0,0)`;
    for (const m of pan.querySelectorAll('[data-body]')) m.style.opacity = bodyOp.value;
  }
  function ensureLoop() {
    if (stopLoop) return;
    stopLoop = loop((dt) => {
      let all = true;
      for (const s of [w, hh, pageX, bodyOp]) { s.step(dt); if (!s.settled) all = false; }
      renderClip();
      if (all) { stopLoop(); stopLoop = null; const f = onSettle; onSettle = null; f?.(); }
    });
  }
  d(() => stopLoop?.());
  const go = (s, t, hard) => { if (hard || rm) s.set(t); else s.to(t); };

  // ---- construção das páginas ----
  let sharedParts = null, holdApi = null;
  function build() {
    const a = cur(), others = accounts.filter((x) => x.id !== a.id);
    // página principal
    const idP = identity(true); sharedParts = idP.parts;
    const head = h('div', { class: 'kk-profile-dropdown-head' }, idP.box, a.plan && h('span', { class: 'kk-profile-dropdown-plan', 'data-body': '' }, a.plan));
    const statusRow = h('fieldset', { class: 'kk-profile-dropdown-row', 'aria-label': 'Status' }, h('span', 'Status'),
      h('span', { style: 'display:flex' }, STATUSES.map((s) => h('button', { class: 'kk-profile-dropdown-st', type: 'button', role: 'menuitemradio', 'aria-checked': String(s.id === status), 'aria-label': s.name, 'data-menu-item': '', 'data-row': 'status', tabindex: '-1', onclick: () => { status = s.id; rebuildKeep(); } },
        h('i', { style: s.id === status ? `background:${s.dot}` : '' }), s.label))));
    const pl = h('span', { class: 'kk-profile-dropdown-pl', 'aria-hidden': 'true' });
    const idx = THEMES.findIndex((t) => t.id === theme);
    pl.style.transform = `translateX(${2 + idx * 38}px)`;
    const themeRow = h('fieldset', { class: 'kk-profile-dropdown-row', 'aria-label': 'Tema' }, h('span', 'Tema'),
      h('span', { class: 'kk-profile-dropdown-th' }, pl, THEMES.map((t, i) => h('button', { class: 'kk-profile-dropdown-thb', type: 'button', role: 'menuitemradio', 'aria-checked': String(t.id === theme), 'aria-label': t.label, 'data-menu-item': '', 'data-row': 'theme', tabindex: '-1',
        onclick: () => { theme = t.id; pl.classList.add('sl'); pl.style.transform = `translateX(${2 + i * 38}px)`; themeRow.querySelectorAll('.kk-profile-dropdown-thb').forEach((b, j) => b.setAttribute('aria-checked', String(j === i))); applyTheme(); } }, ico(t.icon, 14)))));
    const links = ITEMS.map((it, i) => h('button', { class: 'kk-profile-dropdown-it', type: 'button', role: 'menuitem', 'data-menu-item': '', 'data-row': 'item-' + i, tabindex: '-1', onclick: (e) => { say('Você abriu ', h('b', it.label), ' da conta ', h('b', cur().name), '.'); closeMenu(e.detail === 0 ? 'keyboard' : 'pointer', true); } },
      h('span', { class: 'ic' }, ico(it.icon)), h('span', { class: 'gr' }, it.label), it.value && h('span', { class: 'vl' }, it.value)));
    const sw = h('button', { class: 'kk-profile-dropdown-it', type: 'button', role: 'menuitem', 'aria-haspopup': 'menu', 'data-menu-item': '', 'data-row': 'switch', 'data-switch': '', tabindex: '-1', onclick: () => goTo('accounts') },
      h('span', { class: 'kk-profile-dropdown-two' }, others.slice(0, 2).map((o) => avatar(o))), h('span', { class: 'gr' }, 'Trocar de conta'), h('span', { class: 'ic' }, ico('right')));
    const so = holdSignOut();
    const menu = h('div', { class: 'kk-profile-dropdown-menu', role: 'menu', 'aria-label': a.name, tabindex: '-1', 'data-body': '' }, statusRow, themeRow, h('hr', { class: 'kk-profile-dropdown-sep' }), links, sw, h('hr', { class: 'kk-profile-dropdown-sep' }), so);
    mainPage.replaceChildren(head, menu);
    // página de contas
    const back = h('button', { class: 'kk-profile-dropdown-it', type: 'button', role: 'menuitem', 'data-menu-item': '', 'data-row': 'back', tabindex: '-1', style: 'font-weight:600;gap:6px;padding-left:6px', onclick: () => goTo('main') },
      h('span', { class: 'ic' }, ico('left')), 'Trocar de conta');
    const rows = accounts.map((x) => {
      const checked = x.id === a.id;
      return h('button', { class: 'kk-profile-dropdown-it', type: 'button', role: 'menuitemradio', 'aria-checked': String(checked), 'data-menu-item': '', 'data-row': 'account-' + x.id, tabindex: '-1',
        onclick: () => { if (!checked) { accountId = x.id; say('Conta ativa: ', h('b', x.name), '.'); refreshAll(); } goTo('main'); } },
        avatar(x, { dot: checked, cls: '' }), h('span', { style: 'display:flex;flex-direction:column;flex:1;min-width:0' }, h('span', { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, x.name), h('span', { style: `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--pd-mu)` }, x.email)),
        checked && h('span', { class: 'ic', style: 'color:var(--pd-tx)' }, ico('check')));
    });
    const add = h('button', { class: 'kk-profile-dropdown-it', type: 'button', role: 'menuitem', 'data-menu-item': '', 'data-row': 'add', tabindex: '-1',
      onclick: (e) => { extra += 1; const n = { id: 'nova' + extra, name: 'Nova conta ' + extra, email: `conta${extra}@exemplo.com.br`, plan: 'Grátis' }; accounts.push(n); say('Conta ', h('b', n.name), ' adicionada.'); closeMenu(e.detail === 0 ? 'keyboard' : 'pointer', true); refreshAll(); } },
      h('span', { class: 'kk-profile-dropdown-dash' }, ico('plus', 14)), 'Adicionar conta');
    accPage.replaceChildren(h('div', { class: 'kk-profile-dropdown-menu', role: 'menu', 'aria-label': 'Trocar de conta', tabindex: '-1', 'data-body': '' }, back, h('hr', { class: 'kk-profile-dropdown-sep' }), rows, h('hr', { class: 'kk-profile-dropdown-sep' }), add));
    mainPage.classList.toggle('off', page !== 'main'); accPage.classList.toggle('off', page !== 'accounts');
    mainPage.toggleAttribute('inert', page !== 'main'); accPage.toggleAttribute('inert', page !== 'accounts');
  }
  // Troca de status mantém o foco no item atual.
  function rebuildKeep() {
    const row = document.activeElement?.dataset?.row; build();
    if (phase === 'open') items(pageEl(page)).find((i) => i.dataset.row === row && i.getAttribute('aria-checked') === 'true')?.focus({ preventScroll: true });
    drawTrigger();
  }
  function drawTrigger() {
    const idT = identity(false); trgId.replaceChildren(idT.box);
    trgId.firstChild.classList.toggle('hid', phase === 'open');
    sharedTrg = idT.parts;
  }
  let sharedTrg = [];
  function refreshAll() { build(); drawTrigger(); if (phase === 'open') { targetH = pageEl(page).offsetHeight; go(hh, targetH); ensureLoop(); } }
  function applyTheme() {
    const t = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    root.dataset.th = t;
  }
  const mq = matchMedia('(prefers-color-scheme: dark)'); on(mq, 'change', applyTheme);

  // ---- segurar para sair ----
  function holdSignOut() {
    let holding = false, done = false, nudge = false, timer, nTimer;
    const lbl = () => [h('span', { class: 'ic', style: 'display:flex' }, ico('out')), h('span', { class: 'gr' }, 'Sair'), h('span', { class: 'vl', 'data-hint': '' }, 'Segure')];
    const btn = h('button', { class: 'kk-profile-dropdown-it kk-profile-dropdown-so', type: 'button', role: 'menuitem', 'data-menu-item': '', 'data-row': 'sign-out', tabindex: '-1' },
      ...lbl(), h('span', { style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' }, ', pressione e segure para confirmar'), h('span', { class: 'kk-profile-dropdown-fill', 'aria-hidden': 'true' }, ...lbl()));
    const setHint = (t) => btn.querySelectorAll('[data-hint]').forEach((e) => { e.textContent = t; });
    const start = (via) => {
      if (timer !== undefined || done) return;
      clearTimeout(nTimer); nudge = false; setHint('Segure'); holding = true; btn.classList.add('hold');
      timer = setTimeout(() => { timer = undefined; holding = false; done = true; btn.classList.remove('hold'); btn.classList.add('done'); signOut(via); }, HOLD_MS);
    };
    const cancel = () => {
      if (timer === undefined) return;
      clearTimeout(timer); timer = undefined; holding = false; btn.classList.remove('hold'); setHint('Continue segurando');
      nTimer = setTimeout(() => setHint('Segure'), 1400);
    };
    d(() => { clearTimeout(timer); clearTimeout(nTimer); });
    btn.addEventListener('blur', cancel); btn.addEventListener('click', (e) => e.preventDefault()); btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) start('keyboard'); } });
    btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cancel(); } });
    btn.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; btn.setPointerCapture(e.pointerId); start('pointer'); });
    btn.addEventListener('pointerup', cancel); btn.addEventListener('pointercancel', cancel);
    return btn;
  }
  function signOut(via) {
    closeMenu(via, true);
    signedOut = true;
    wrap.style.display = 'none';
    setLog([h('b', 'Sessão encerrada.'), ' Você segurou "Sair" até o fim para confirmar. ', h('br'), h('button', { class: 'kk-profile-dropdown-back', type: 'button', onclick: () => { signedOut = false; wrap.style.display = ''; setLog([h('span', 'Você voltou para a conta '), h('b', cur().name), '.']); build(); drawTrigger(); trg.focus(); } }, 'Entrar de novo')]);
    root.querySelector('.kk-profile-dropdown-back')?.focus();
  }

  // ---- abrir / fechar com a transformação do cartão em menu ----
  function flip(fromParts, toParts, reverse) {
    if (rm || instant) return;
    fromParts.forEach((fr, i) => {
      const to = toParts[i]; if (!to) return;
      const a = fr.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const dx = a.left - b.left, dy = a.top - b.top, sc = a.width / b.width;
      const kf = [{ transform: `translate(${dx}px,${dy}px) scale(${i === 0 ? sc : 1})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }];
      to.animate(reverse ? kf.reverse() : kf, { duration: 300, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'both' }).onfinish = (ev) => { ev.target.cancel(); };
    });
  }
  function sizePanel() {
    const rootW = root.clientWidth;
    PANEL_W = Math.min(PANEL_MAX, Math.max(220, rootW - 16));
    pan.style.width = PANEL_W + 'px';
    for (const p of [mainPage, accPage]) p.style.width = PANEL_W + 'px';
    // Mantém o painel dentro da cena quando o gatilho está perto da borda esquerda.
    const left = wrap.offsetLeft + wrap.offsetWidth - PANEL_W;
    pan.style.right = left < 4 ? `${left - 4}px` : '0';
  }
  function openMenu(via, focus) {
    if (phase === 'open') return;
    intent = { focus, resume: phase === 'closing' };
    closeSeq++; instant = via === 'keyboard' || rm; page = 'main';
    pan.style.display = ''; phase = 'open';
    wrap.classList.add('live'); pan.classList.add('act'); trg.setAttribute('aria-expanded', 'true');
    build(); sizePanel();
    pageX.set(0); targetH = mainPage.offsetHeight;
    drawTrigger();
    if (instant) { w.set(PANEL_W); hh.set(targetH); bodyOp.set(1); renderClip(); }
    else {
      if (!intent.resume) { w.set(trg.offsetWidth); hh.set(trg.offsetHeight); bodyOp.set(0); }
      w.to(PANEL_W); hh.to(targetH); bodyOp.to(1); renderClip(); ensureLoop();
      flip(sharedTrg, sharedParts, false);
    }
    const list = items(mainPage), menu = mainPage.querySelector('[role=menu]');
    ({ first: list[0], last: list[list.length - 1], menu }[focus])?.focus({ preventScroll: true });
    instant = false;
  }
  function closeMenu(via, returnFocus) {
    if (phase !== 'open') return;
    if (returnFocus) trg.focus({ preventScroll: true });
    const fin = () => { phase = 'closed'; pan.style.display = 'none'; wrap.classList.remove('live'); drawTrigger(); };
    trg.setAttribute('aria-expanded', 'false'); pan.classList.remove('act');
    if (via === 'keyboard' || rm) { stopLoop?.(); stopLoop = null; fin(); return; }
    phase = 'closing';
    const seq = ++closeSeq;
    flip(sharedTrg, sharedParts, true);
    bodyOp.to(0); w.to(trg.offsetWidth); hh.to(trg.offsetHeight); ensureLoop();
    onSettle = () => { if (closeSeq === seq) fin(); };
    // O gatilho volta a mostrar a identidade quando o painel termina de encolher.
    trgId.firstChild?.classList.add('hid');
  }
  function goTo(target) {
    pageFocus = target === 'accounts' ? 'first' : 'switch'; page = target;
    mainPage.classList.toggle('off', page !== 'main'); accPage.classList.toggle('off', page !== 'accounts');
    mainPage.toggleAttribute('inert', page !== 'main'); accPage.toggleAttribute('inert', page !== 'accounts');
    const el = pageEl(page); targetH = el.offsetHeight;
    go(pageX, page === 'main' ? 0 : -PANEL_W); go(hh, targetH); if (rm) renderClip(); else ensureLoop();
    const f = pageFocus; pageFocus = null;
    if (f === 'first') { const l = items(el); (l.find((i) => i.getAttribute('aria-checked') === 'true') || l[0])?.focus({ preventScroll: true }); }
    else el.querySelector('[data-switch]')?.focus({ preventScroll: true });
  }

  // ---- teclado: linhas sobem/descem, rádios vão para os lados ----
  const rowTarget = (list, curEl, step) => {
    const rows = [...new Set(list.map((i) => i.dataset.row))], idx = rows.indexOf(curEl.dataset.row), next = rows[(idx + step + rows.length) % rows.length];
    const c = list.filter((i) => i.dataset.row === next); return c.find((i) => i.getAttribute('aria-checked') === 'true') || c[0];
  };
  function nextTarget(list, active, key) {
    if (key === 'Home') return list[0]; if (key === 'End') return list[list.length - 1];
    const c = list.find((i) => i === active);
    if (!c) return key === 'ArrowUp' ? list[list.length - 1] : list[0];
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const row = list.filter((i) => i.dataset.row === c.dataset.row); if (row.length < 2) return undefined;
      return row[(row.indexOf(c) + (key === 'ArrowRight' ? 1 : -1) + row.length) % row.length];
    }
    return rowTarget(list, c, key === 'ArrowDown' ? 1 : -1);
  }
  on(clipEl, 'keydown', (e) => {
    if (phase !== 'open') return;
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu('keyboard', true); return; }
    if (page === 'accounts' && e.key === 'Backspace') { e.preventDefault(); goTo('main'); return; }
    if (!NAV_KEYS.has(e.key)) return;
    e.preventDefault();
    const active = document.activeElement, t = nextTarget(items(pageEl(page)), active, e.key);
    if (t) t.focus({ preventScroll: true });
    else if (page === 'accounts' && e.key === 'ArrowLeft') goTo('main');
    else if (e.key === 'ArrowRight' && active instanceof HTMLElement && active.dataset.switch !== undefined) goTo('accounts');
  });
  // Passar o mouse num item o foca: ponteiro e teclado dividem o mesmo destaque.
  on(clipEl, 'pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const it = e.target.closest?.('[data-menu-item]');
    if (it && document.activeElement !== it) it.focus({ preventScroll: true });
  });
  on(document, 'pointerdown', (e) => { if (phase === 'open' && !wrap.contains(e.target)) closeMenu('pointer', false); }, true);

  // O painel acompanha o tamanho da cena e da página aberta.
  const ro = new ResizeObserver(() => {
    if (phase !== 'open') return;
    sizePanel();
    const el = pageEl(page), next = el.offsetHeight;
    if (Math.abs(next - targetH) >= 0.5) { targetH = next; go(hh, next); if (rm) renderClip(); else ensureLoop(); }
    if (w.target !== PANEL_W) { go(w, PANEL_W); go(pageX, page === 'main' ? 0 : -PANEL_W, true); if (rm) renderClip(); else ensureLoop(); }
  });
  ro.observe(root); ro.observe(mainPage); ro.observe(accPage); d(() => ro.disconnect());

  applyTheme(); build(); drawTrigger();
  say('Clique no cartão para abrir o menu. Use ', h('b', 'Segure'), ' em "Sair" para encerrar a sessão.');
  return () => { d.run(); root.remove(); };
}
