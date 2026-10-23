// Ilha de status — porte em JS puro do componente "Status Island" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, reduced, disposer, PALETTE } from '../kit.js';

const MAX_PEEK = 2, DISMISS_AFTER = 4000;
const EASE = 'cubic-bezier(.23,1,.32,1)';
const CIRC = 2 * Math.PI * 6;
const describe = (t) => [t.label, t.detail].filter(Boolean).join(', ');

const DEMO_ACTIONS = [
  { kind: 'upload', label: 'Enviar fotos' }, { kind: 'export', label: 'Exportar relatório' },
  { kind: 'archive', label: 'Arquivar conversa' }, { kind: 'sync', label: 'Sincronizar agenda' },
];

// Número cujos dígitos rolam até o novo valor.
function rollingNumber() {
  const el = h('span', { class: 'kk-status-island-roll', 'aria-hidden': 'true' });
  let cols = [];
  return {
    el,
    set(value) {
      const text = String(value), n = text.length;
      // Chaveado pela direita: as unidades continuam sendo unidades quando entra um dígito.
      while (cols.length < n) { const col = h('span', { class: 'kk-status-island-col' }, ...[...'0123456789'].map((d) => h('span', d))); cols.unshift({ el: h('span', { class: 'kk-status-island-dg' }, col), col }); }
      cols = cols.slice(cols.length - n);
      el.replaceChildren(...cols.map((c) => c.el));
      [...text].forEach((ch, i) => { cols[i].col.style.transform = `translateY(${-Number(ch) * 10}%)`; });
    },
  };
}

function taskIcon(task) {
  if (task.status === 'done') {
    const path = svg('path', { d: 'M4.75 8.25 7 10.5l4.25-4.75', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.75, fill: 'none' });
    const el = svg('svg', { class: 'kk-status-island-ic ok', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 8, fill: 'currentColor', opacity: 0.18 }), path);
    if (!reduced()) { path.setAttribute('pathLength', '1'); path.style.strokeDasharray = '1'; path.style.strokeDashoffset = '1'; path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 300, delay: 80, easing: EASE, fill: 'forwards' }); }
    return { el };
  }
  if (task.status === 'error') {
    return { el: svg('svg', { class: 'kk-status-island-ic bad', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 8, fill: 'currentColor', opacity: 0.18 }), svg('path', { d: 'M8 4.5v4', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-width': 1.75 }), svg('circle', { cx: 8, cy: 11.25, r: 1, fill: 'currentColor' })) };
  }
  const known = typeof task.progress === 'number';
  const arc = svg('circle', { cx: 8, cy: 8, r: 6, stroke: 'currentColor', 'stroke-dasharray': CIRC, 'stroke-linecap': 'round', 'stroke-width': 2, fill: 'none' });
  const el = svg('svg', { class: 'kk-status-island-ic run' + (known ? '' : ' spin'), viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 6, stroke: 'currentColor', 'stroke-opacity': 0.18, 'stroke-width': 2, fill: 'none' }), arc);
  const set = (p) => arc.setAttribute('stroke-dashoffset', CIRC * (1 - (known ? Math.min(1, Math.max(0, p ?? 0)) : 0.25)));
  set(task.progress); arc.style.transition = `stroke-dashoffset 250ms ${EASE}`;
  return { el, set };
}

export default function mount(stage, ctx) {
  ensureStyle('status-island', `
.kk-status-island-root{position:relative;width:100%;height:${ctx?.big ? 'min(62vh,560px)' : '340px'};box-sizing:border-box;padding:20px 12px 24px;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.kk-status-island-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.kk-status-island-btn{min-height:36px;padding:0 14px;border:1px solid var(--line,${PALETTE.line});border-radius:999px;background:#fff;color:${PALETTE.ink};font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s}
.kk-status-island-btn:hover{background:${PALETTE.ice100}}.kk-status-island-btn:active{background:${PALETTE.ice200}}
.kk-status-island-btn:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
.kk-status-island-note{margin:0;max-width:280px;text-align:center;font-size:13px;line-height:1.5;color:${PALETTE.mut}}
.kk-status-island-wrap{position:relative;display:flex;flex-direction:column;align-items:center;min-height:42px;width:100%}
.kk-status-island-pos{position:relative}
.kk-status-island-back{position:absolute;inset:0;border-radius:20px;background:${PALETTE.ice800};box-shadow:0 0 0 1px rgba(255,255,255,.06);transition:transform .45s cubic-bezier(.3,1.3,.5,1),opacity .3s}
.kk-status-island-isl{position:relative;overflow:hidden;border-radius:20px;background:${PALETTE.ink};color:#fff;box-shadow:0 8px 20px -8px rgba(14,34,54,.55),0 0 0 1px rgba(0,0,0,.05)}
.kk-status-island-isl.mv{transition:width .45s cubic-bezier(.3,1.25,.5,1),height .45s cubic-bezier(.3,1.25,.5,1)}
.kk-status-island-pill{display:flex;align-items:center;height:42px;max-width:calc(100cqw - 24px);padding:0 16px;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;outline:none}
.kk-status-island-pill:focus-visible{box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);border-radius:20px}
.kk-status-island-in{display:flex;align-items:center;gap:10px;min-width:192px;min-height:16px}
.kk-status-island-lb{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:16px}.kk-status-island-lb em{font-style:normal;color:rgba(255,255,255,.55)}
.kk-status-island-ic{flex:none;width:16px;height:16px}.kk-status-island-ic.ok{color:#5be2a8}.kk-status-island-ic.bad{color:#ff8087}.kk-status-island-ic.run{color:#fff;transform:rotate(-90deg)}
.kk-status-island-ic.spin{animation:kk-si-spin 1s linear infinite}@keyframes kk-si-spin{to{transform:rotate(270deg)}}
.kk-status-island-tail{flex:none;padding-left:12px;display:flex;align-items:center}
.kk-status-island-pct{display:flex;align-items:center;font-size:12px;color:rgba(255,255,255,.6)}
.kk-status-island-roll{display:inline-flex;font-variant-numeric:tabular-nums}.kk-status-island-roll .kk-status-island-dg{display:inline-block;height:16px;overflow:hidden}
.kk-status-island-roll .kk-status-island-col{display:flex;flex-direction:column;transition:transform .2s cubic-bezier(.23,1,.32,1)}.kk-status-island-roll .kk-status-island-col span{height:16px;line-height:16px}
.kk-status-island-act{flex:none;margin:-4px 0;min-height:28px;padding:0 10px;border:0;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:background .15s}
.kk-status-island-act:hover{background:rgba(255,255,255,.24)}.kk-status-island-act:focus-visible{outline:2px solid rgba(255,255,255,.7)}
span.kk-status-island-act{display:inline-flex;align-items:center;cursor:inherit}
.kk-status-island-list{margin:0;padding:14px 16px;list-style:none;display:flex;flex-direction:column;gap:14px;width:min(320px,calc(100cqw - 24px));box-sizing:border-box}
.kk-status-island-list .kk-status-island-in{min-width:0;min-height:28px}
.kk-status-island-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (prefers-reduced-motion:reduce){.kk-status-island-ic.spin{animation:none}}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  // ---- estado ----
  let tasks = [], open = false, announcement = '', counter = 0, noteText = '';
  const timers = new Set(), doneAt = new Map(), lastStatus = new Map();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  d(() => timers.forEach((t) => { clearInterval(t); clearTimeout(t); }));
  const patch = (id, p) => { tasks = tasks.map((t) => (t.id === id ? { ...t, ...p } : t)); sync(); };
  const remove = (id) => { tasks = tasks.filter((t) => t.id !== id); sync(); };
  const setNote = (t) => { noteText = t; note.textContent = t || (tasks.length ? 'Passe o mouse (ou toque) na ilha para ver tudo em andamento.' : 'Inicie uma tarefa e depois passe o mouse na ilha.'); };

  // ---- DOM ----
  const note = h('p', { class: 'kk-status-island-note', 'aria-live': 'polite' });
  const live = h('output', { class: 'kk-status-island-sr', 'aria-live': 'polite' });
  const btns = h('div', { class: 'kk-status-island-btns' }, DEMO_ACTIONS.map((a) => h('button', { class: 'kk-status-island-btn', type: 'button', onclick: () => start(a.kind) }, a.label)));
  const islandBox = h('div', { class: 'kk-status-island-isl' });
  const backs = h('span', { style: 'display:contents' });
  const pos = h('div', { class: 'kk-status-island-pos', style: 'display:none' }, backs, islandBox);
  const wrap = h('div', { class: 'kk-status-island-wrap' }, live, pos);
  const root = h('div', { class: 'kk-status-island-root' }, btns, note, wrap);
  stage.append(root);
  root.style.containerType = 'inline-size';

  // ---- linha de tarefa (persistente: o progresso atualiza no lugar, sem reiniciar a rolagem de dígitos) ----
  function buildRow(task, interactive) {
    const icon = taskIcon(task), roll = rollingNumber();
    const lb = h('span', { class: 'kk-status-island-lb' }, task.label, task.detail && h('em', ' · ' + task.detail));
    let tail = null;
    if (task.action) {
      tail = interactive
        ? h('button', { class: 'kk-status-island-act', type: 'button', onclick: (e) => { e.stopPropagation(); task.action.onClick(); } }, task.action.label)
        : h('span', { class: 'kk-status-island-act' }, task.action.label);
    } else if (task.status === 'running' && typeof task.progress === 'number') {
      tail = h('span', { class: 'kk-status-island-pct' }, roll.el, '%');
      roll.set(Math.round(Math.min(1, Math.max(0, task.progress)) * 100));
    }
    const el = h('div', { class: 'kk-status-island-in' }, icon.el, lb, tail && h('span', { class: 'kk-status-island-tail' }, tail));
    return { el, update(t) { icon.set?.(t.progress); if (typeof t.progress === 'number') roll.set(Math.round(Math.min(1, Math.max(0, t.progress)) * 100)); } };
  }
  const sig = (t) => `${t.id}|${t.status}|${t.label}|${t.detail || ''}|${t.action ? t.action.label : ''}|${typeof t.progress === 'number'}`;

  let curSig = '', curRow = null, listSig = '', listRows = [], pill = null, listEl = null;
  function morph(change) {
    const a = islandBox.getBoundingClientRect(), had = pos.style.display !== 'none' && a.width > 0;
    change();
    if (rm || !had) return;
    const prevW = islandBox.style.width;
    islandBox.style.width = ''; islandBox.style.height = '';
    const b = islandBox.getBoundingClientRect();
    if (Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1) return;
    islandBox.classList.remove('mv'); islandBox.style.width = a.width + 'px'; islandBox.style.height = a.height + 'px'; void islandBox.offsetWidth;
    islandBox.classList.add('mv'); islandBox.style.width = b.width + 'px'; islandBox.style.height = b.height + 'px';
    const end = () => { islandBox.classList.remove('mv'); islandBox.style.width = ''; islandBox.style.height = ''; };
    clearTimeout(islandBox._t); islandBox._t = setTimeout(end, 480);
    void prevW;
  }
  function renderBacks() {
    const n = open ? 0 : Math.min(tasks.length - 1, MAX_PEEK), expanded = open && tasks.length > 0;
    while (backs.children.length < Math.min(tasks.length - 1, MAX_PEEK)) backs.append(h('div', { class: 'kk-status-island-back', 'aria-hidden': 'true', style: `z-index:${-1 - backs.children.length}` }));
    while (backs.children.length > Math.min(tasks.length - 1, MAX_PEEK)) backs.lastChild.remove();
    [...backs.children].forEach((el, i) => {
      el.style.opacity = expanded ? 0 : String(1 - (i + 1) * 0.3);
      el.style.transform = expanded ? 'none' : `translateY(${-(i + 1) * 5}px) scale(${1 - (i + 1) * 0.06})`;
    });
    void n;
  }

  function sync() {
    const cur = tasks[tasks.length - 1], expanded = open && tasks.length > 0;
    // anúncios para leitores de tela: só tarefas novas e mudanças de estado, não cada avanço
    for (const t of tasks) if (lastStatus.get(t.id) !== t.status) { lastStatus.set(t.id, t.status); announcement = describe(t); live.textContent = announcement; }
    const ids = new Set(tasks.map((t) => t.id));
    for (const id of [...lastStatus.keys()]) if (!ids.has(id)) { lastStatus.delete(id); doneAt.delete(id); }

    if (!cur) {
      if (pos.style.display !== 'none') {
        const out = rm ? null : pos.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }], { duration: 220, easing: EASE });
        const hide = () => { pos.style.display = 'none'; islandBox.replaceChildren(); curSig = ''; listSig = ''; pill = null; listEl = null; };
        if (out) out.onfinish = hide; else hide();
      }
      renderBacks(); setNote(noteText); schedule(); return;
    }
    const entering = pos.style.display === 'none';
    if (entering) {
      pos.style.display = '';
      if (!rm) pos.animate([{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 220, easing: EASE });
    }
    if (expanded) {
      const s = tasks.map(sig).join(';');
      if (s !== listSig || !listEl) {
        morph(() => {
          listSig = s; pill = null; curSig = '';
          listRows = tasks.map((t) => ({ id: t.id, ...buildRow(t, true) }));
          listEl = h('ul', { class: 'kk-status-island-list' }, listRows.map((r) => h('li', r.el)));
          islandBox.replaceChildren(listEl);
          if (!rm) listEl.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 220, delay: 50, easing: EASE, fill: 'backwards' });
        });
      } else tasks.forEach((t, i) => listRows[i]?.update(t));
    } else {
      const s = sig(cur);
      if (s !== curSig || !pill) {
        const swapped = curSig !== '' && curSig.split('|')[0] + curSig.split('|')[1] !== s.split('|')[0] + s.split('|')[1];
        morph(() => {
          curSig = s; listEl = null; listSig = '';
          curRow = buildRow(cur, false);
          pill = h('button', { class: 'kk-status-island-pill', type: 'button', 'aria-expanded': 'false', 'aria-label': `${describe(cur)}. ${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}, mostrar todas`, onclick: () => setOpen(true) }, curRow.el);
          islandBox.replaceChildren(pill);
          if (swapped && !rm) curRow.el.animate([{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 220, easing: EASE });
        });
      } else curRow.update(cur);
    }
    renderBacks(); setNote(noteText); schedule();
  }
  function setOpen(v) { if (open === v) return; open = v; if (v) for (const id of doneAt.keys()) doneAt.set(id, Date.now()); sync(); }

  // Tarefas concluídas saem sozinhas, mas nunca enquanto alguém lê a lista.
  let dismissTimers = [];
  function schedule() {
    dismissTimers.forEach(clearTimeout); dismissTimers = [];
    if (open && tasks.length) return;
    const now = Date.now();
    for (const t of tasks) {
      if (t.status !== 'done') continue;
      const since = doneAt.get(t.id) ?? now; doneAt.set(t.id, since);
      dismissTimers.push(setTimeout(() => remove(t.id), Math.max(0, DISMISS_AFTER - (now - since))));
    }
  }
  d(() => dismissTimers.forEach(clearTimeout));

  // Abre com o mouse, foco ou toque; fecha ao sair, perder o foco ou com Esc.
  on(islandBox, 'pointerenter', (e) => { if (e.pointerType === 'mouse') setOpen(true); });
  on(islandBox, 'pointerleave', (e) => { if (e.pointerType === 'mouse') setOpen(false); });
  on(islandBox, 'focusin', () => setOpen(true));
  on(islandBox, 'focusout', (e) => { if (!islandBox.contains(e.relatedTarget)) setOpen(false); });
  on(islandBox, 'keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  on(document, 'pointerdown', (e) => { if (open && !islandBox.contains(e.target)) setOpen(false); });

  // ---- tarefas de demonstração ----
  function run(id, { speed, failAt, onDone }) {
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(1, progress + speed * (0.5 + Math.random()));
      if (failAt !== undefined && progress >= failAt) {
        clearInterval(timer); timers.delete(timer);
        patch(id, { status: 'error', label: 'Falha ao sincronizar', detail: 'Agenda sem conexão', progress: undefined, action: { label: 'Tentar de novo', onClick: () => { patch(id, { status: 'running', label: 'Sincronizando agenda', detail: undefined, progress: 0, action: undefined }); run(id, { speed, onDone }); } } });
        return;
      }
      patch(id, { progress });
      if (progress >= 1) { clearInterval(timer); timers.delete(timer); later(onDone, 250); }
    }, 180);
    timers.add(timer);
  }
  function start(kind) {
    const id = `${kind}-${++counter}`;
    if (kind === 'archive') {
      tasks = [...tasks, { id, status: 'done', label: 'Conversa arquivada', action: { label: 'Desfazer', onClick: () => { patch(id, { label: 'Conversa restaurada', action: undefined }); setNote('A conversa voltou para a caixa de entrada.'); } } }];
      setNote(''); sync(); return;
    }
    if (kind === 'upload') {
      tasks = [...tasks, { id, status: 'running', label: 'Enviando', detail: '12 fotos', progress: 0 }]; sync();
      run(id, { speed: 0.045, onDone: () => patch(id, { status: 'done', label: '12 fotos enviadas', detail: undefined, action: { label: 'Ver', onClick: () => { remove(id); setNote('Galeria aberta: 12 fotos da campanha de abril.'); } } }) });
      return;
    }
    if (kind === 'export') {
      tasks = [...tasks, { id, status: 'running', label: 'Exportando relatório', progress: 0 }]; sync();
      run(id, { speed: 0.07, onDone: () => patch(id, { status: 'done', label: 'Relatório pronto', detail: 'vendas-t3.csv', action: { label: 'Abrir', onClick: () => { remove(id); setNote('Relatório vendas-t3.csv aberto.'); } } }) });
      return;
    }
    tasks = [...tasks, { id, status: 'running', label: 'Sincronizando agenda', progress: 0 }]; sync();
    run(id, { speed: 0.06, failAt: counter % 2 === 0 ? undefined : 0.62, onDone: () => patch(id, { status: 'done', label: 'Agenda sincronizada', detail: undefined, action: undefined }) });
  }

  setNote('');
  return () => { d.run(); root.remove(); };
}
