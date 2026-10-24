// File Upload — porte em JS puro do componente "File Upload" .
import { h, svg, ensureStyle, disposer, reduced } from '../kit.js';
import { icon } from '../../ui.js';

const MAX_SIZE = 5 * 1024 * 1024, MAX_FILES = 5, CONCURRENCY = 3, TICK = 80, DURATION = 2200;
const ACCEPT = ['image/*', '.pdf', '.csv', '.xlsx'];
const EASE = 'cubic-bezier(.23,1,.32,1)';
const SIZES = ['B', 'KB', 'MB', 'GB', 'TB'];

const formatBytes = (b) => {
  if (!b) return '0 B';
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), SIZES.length - 1), v = b / 1024 ** i;
  return `${(v >= 10 || i === 0 ? String(Math.round(v)) : String(Number(v.toFixed(1))).replace('.', ','))} ${SIZES[i]}`;
};
// Aceita MIME exato, curinga ("image/*") e extensão (".pdf"), como o atributo `accept` do input.
const matches = (file, t) => {
  const a = t.trim().toLowerCase(); if (!a) return false;
  if (a.startsWith('.')) return file.name.toLowerCase().endsWith(a);
  const ft = file.type.toLowerCase();
  return a.endsWith('/*') ? ft.startsWith(a.slice(0, -1)) : ft === a;
};
const describe = (t) => {
  if (t.startsWith('.')) return t.slice(1).toUpperCase();
  const [kind, sub] = t.split('/'); return sub === '*' ? (kind === 'image' ? 'imagens' : kind + 's') : sub.split('+')[0].toUpperCase();
};
const describeAll = (ts) => { const l = ts.map(describe); const s = l.length > 1 ? `${l.slice(0, -1).join(', ')} ou ${l[l.length - 1]}` : l[0]; return s.charAt(0).toUpperCase() + s.slice(1); };
const extOf = (n) => { const i = n.lastIndexOf('.'); return i <= 0 || i === n.length - 1 ? 'ARQ' : n.slice(i + 1, i + 5).toUpperCase(); };
const isFileDrag = (e) => !!e.dataTransfer?.types?.includes('Files');
const countDragged = (dt) => { let n = 0; for (const it of dt.items || []) if (it.kind === 'file') n++; return n; };

export default function mount(stage, ctx) {
  ensureStyle('file-upload', `
.kk-file-upload-root{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:12px 8px;min-height:240px}
.kk-file-upload-card{width:100%;min-width:0;max-width:384px;box-sizing:border-box;padding:8px;border-radius:14px;border:1px solid var(--line,#d3e6f6);background:#fff;box-shadow:0 1px 2px rgba(14,34,54,.05);color:var(--ink,#0e2236)}
.kk-file-upload-zone{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 14px;border-radius:10px;border:1.5px dashed var(--ice-300,#a5cdee);background:var(--ice-50,#f2f8fe);font:inherit;color:inherit;text-align:center;cursor:pointer;outline:none;transition:border-color .15s,background .15s}
.kk-file-upload-zone:hover{border-color:var(--ice-500,#4a95d2);background:var(--ice-100,#e3f0fb)}
.kk-file-upload-zone:focus-visible{border-color:var(--ice-500,#4a95d2);box-shadow:0 0 0 3px rgba(74,149,210,.25)}
.kk-file-upload-zone.armed{border-color:var(--ice-500,#4a95d2);background:var(--ice-100,#e3f0fb)}
.kk-file-upload-zone.over{border-style:solid;border-color:var(--ice-700,#1f5f9b);background:var(--ice-200,#c9e1f6)}
.kk-file-upload-zone.full{cursor:not-allowed;background:var(--ice-50,#f2f8fe);border-color:var(--line,#d3e6f6)}
.kk-file-upload-ic{width:38px;height:38px;border-radius:10px;border:1px solid var(--line,#d3e6f6);background:#fff;display:flex;align-items:center;justify-content:center;color:var(--mut,#4a6f93);transition:color .15s,border-color .15s}
.kk-file-upload-ic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:translate .2s}
.armed .kk-file-upload-ic,.over .kk-file-upload-ic{color:var(--ice-700,#1f5f9b);border-color:var(--ice-400,#7fb4e0)}
.armed .kk-file-upload-ic svg,.over .kk-file-upload-ic svg{translate:0 -2px}
.kk-file-upload-ttl{display:block;font-size:14px;font-weight:600}
.full .kk-file-upload-ttl{color:var(--mut,#4a6f93)}
.kk-file-upload-ttl u{text-decoration-color:var(--ice-400,#7fb4e0);text-underline-offset:3px}
.kk-file-upload-hint{display:block;margin-top:4px;font-size:12px;color:var(--mut,#4a6f93)}
.kk-file-upload-note{margin:8px 4px 0;font-size:12px;color:var(--bad,#d1434b)}
.kk-file-upload-list{list-style:none;margin:4px 4px 0;padding:0}
.kk-file-upload-li{overflow:hidden}
.kk-file-upload-row{position:relative;display:flex;align-items:center;gap:10px;padding:10px 4px}
.kk-file-upload-th{width:36px;height:36px;flex-shrink:0;border-radius:7px;background:var(--ice-100,#e3f0fb) center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(14,34,54,.08);display:flex;align-items:center;justify-content:center;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.04em;color:var(--ice-800,#164a7c)}
.kk-file-upload-info{min-width:0;flex:1}
.kk-file-upload-nm{margin:0;font-size:13px;font-weight:600;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-file-upload-st{margin:0;font-size:12px;line-height:16px;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.kk-file-upload-st.bad{color:var(--bad,#d1434b)}
.kk-file-upload-act{display:flex;align-items:center;gap:2px;flex-shrink:0}
.kk-file-upload-btn{min-width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 8px;border:0;border-radius:8px;background:none;color:var(--mut,#4a6f93);font:inherit;font-size:12px;cursor:pointer;transition:background .15s,color .15s}
.kk-file-upload-btn:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-file-upload-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2)}
.kk-file-upload-btn .ico{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-file-upload-ok{width:36px;height:36px;display:flex;align-items:center;justify-content:center}
.kk-file-upload-ok path{stroke:var(--ok,#1f9d6b);fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:16;stroke-dashoffset:16;animation:kk-file-upload-chk .32s ${EASE} .05s forwards}
.kk-file-upload-rm .kk-file-upload-ok path{animation:none;stroke-dashoffset:0}
@keyframes kk-file-upload-chk{to{stroke-dashoffset:0}}
.kk-file-upload-bar{position:absolute;left:4px;right:4px;bottom:0;height:1px;background:var(--ice-100,#e3f0fb)}
.kk-file-upload-bar i{display:block;height:100%;transform-origin:left;transition:transform .2s linear,opacity .3s,background-color .2s;background:var(--ice-700,#1f5f9b)}
.kk-file-upload-bar i.done{background:var(--ok,#1f9d6b);opacity:0;transition-delay:0s,.3s,0s}
.kk-file-upload-bar i.bad{background:var(--bad,#d1434b)}
.kk-file-upload-bar i.nt{transition:none}
.kk-file-upload-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 6px 0 8px}
.kk-file-upload-foot[hidden]{display:none}
.kk-file-upload-sum{font-size:12px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-file-upload-sum b{font-weight:600;color:var(--ink,#0e2236)}
.kk-file-upload-sum .bad{color:var(--bad,#d1434b)}
`);
  const d = disposer(); const rm = reduced();
  const limit = MAX_FILES;
  let items = [], seq = 0, windowDrag = false, overZone = 0, notice = '', wasBusy = false;
  const controllers = new Map();
  const uid = 'kk-file-upload-' + Math.random().toString(36).slice(2, 7);

  const input = h('input', { type: 'file', multiple: true, accept: ACCEPT.join(','), hidden: true, tabindex: '-1' });
  const icTitle = h('span', { class: 'kk-file-upload-ttl' }), hintEl = h('span', { class: 'kk-file-upload-hint', id: uid + '-hint' });
  const upIc = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: 'M12 16V4M7 9l5-5 5 5M5 20h14' }));
  const zone = h('button', { type: 'button', class: 'kk-file-upload-zone', 'aria-describedby': uid + '-hint', onclick: () => { if (!isFull()) input.click(); } },
    h('span', { class: 'kk-file-upload-ic', 'aria-hidden': 'true' }, upIc), h('span', icTitle, hintEl));
  const noteEl = h('p', { class: 'kk-file-upload-note', role: 'alert', hidden: true });
  const list = h('ul', { class: 'kk-file-upload-list', 'aria-label': 'Arquivos' });
  const sum = h('output', { class: 'kk-file-upload-sum', 'aria-live': 'polite' });
  const clearBtn = h('button', { type: 'button', class: 'kk-file-upload-btn', onclick: () => clearAll() });
  const foot = h('div', { class: 'kk-file-upload-foot', hidden: true }, sum, clearBtn);
  const card = h('div', { class: 'kk-file-upload-card' }, zone, input, noteEl, list, foot);
  stage.append(h('div', { class: 'kk-file-upload-root' }, card)); d(() => stage.firstChild?.remove());

  const counted = () => items.filter((i) => i.status !== 'rejected').length;
  const isFull = () => counted() >= limit;

  // ---- validação e entrada de arquivos
  function validate(file) {
    if (!ACCEPT.some((t) => matches(file, t))) return { message: 'Tipo de arquivo não aceito', code: 'INVALID_FILE_TYPE' };
    if (file.size > MAX_SIZE) return { message: `Maior que ${formatBytes(MAX_SIZE)}`, code: 'FILE_TOO_LARGE' };
    return null;
  }
  function addFiles(fl) {
    const files = Array.from(fl || []); if (!files.length) return;
    let room = Math.max(0, limit - counted()), skipped = 0; const added = [];
    for (const file of files) {
      const error = validate(file);
      if (!error && room <= 0) { skipped++; continue; }
      if (!error) room--;
      const index = seq++;
      added.push({ id: `${uid}-${index}`, file, index, status: error ? 'rejected' : 'queued', progress: 0, attempts: 0, error, previewUrl: !error && file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined });
    }
    notice = skipped ? `${skipped} ${skipped === 1 ? 'arquivo não foi adicionado' : 'arquivos não foram adicionados'}. O limite é ${limit}.` : '';
    if (added.length) items.push(...added);
    update();
  }

  // ---- envio simulado (sem rede): avança em passos irregulares, como uma conexão real; a 1ª tentativa de cada 3º arquivo cai para mostrar o "Tentar de novo"
  function simulate(item, signal) {
    return new Promise((resolve, reject) => {
      const shouldFail = item.attempts === 1 && item.index % 3 === 1;
      let p = 0;
      const iv = setInterval(() => {
        p = Math.min(p + 100 * TICK * (0.4 + Math.random() * 1.2) / DURATION, 100);
        if (shouldFail && p >= 58) { clearInterval(iv); reject(new Error('Conexão perdida')); return; }
        if (!signal.aborted) { item.progress = p; paint(item); }
        if (p >= 100) { clearInterval(iv); resolve(); }
      }, TICK);
      signal.addEventListener('abort', () => { clearInterval(iv); reject(new DOMException('cancelado', 'AbortError')); });
    });
  }
  function run(item) {
    const ctl = new AbortController(); controllers.set(item.id, ctl);
    simulate(item, ctl.signal).then(() => {
      if (ctl.signal.aborted) return; controllers.delete(item.id); item.status = 'done'; item.progress = 100; update();
    }, (err) => {
      if (ctl.signal.aborted) return; controllers.delete(item.id); item.status = 'error'; item.error = { message: err?.message || 'Falha no envio', code: 'UPLOAD_FAILED' }; update();
    });
  }
  // Escalonador: mantém até CONCURRENCY envios em andamento.
  function schedule() {
    let active = items.filter((i) => i.status === 'uploading').length;
    for (const it of items) {
      if (active >= CONCURRENCY) break;
      if (it.status === 'queued' && !controllers.has(it.id)) { it.attempts++; it.status = 'uploading'; it.progress = 0; active++; run(it); }
    }
  }
  d(() => { for (const c of controllers.values()) c.abort(); controllers.clear(); for (const i of items) i.previewUrl && URL.revokeObjectURL(i.previewUrl); });

  function removeItem(id) {
    controllers.get(id)?.abort(); controllers.delete(id);
    const it = items.find((i) => i.id === id); if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
    items = items.filter((i) => i.id !== id); notice = ''; update();
  }
  function clearAll() { for (const i of [...items]) removeItem(i.id); }
  const retry = (id) => { const it = items.find((i) => i.id === id); if (it) { it.status = 'queued'; it.progress = 0; it.error = undefined; update(); } };

  // ---- linhas (uma por arquivo, reaproveitadas a cada atualização)
  const rows = new Map();
  function makeRow(item) {
    const th = h('span', { class: 'kk-file-upload-th', 'aria-hidden': 'true' });
    if (item.previewUrl) th.style.backgroundImage = `url("${item.previewUrl}")`; else th.textContent = extOf(item.file.name);
    const nm = h('p', { class: 'kk-file-upload-nm' }, item.file.name), sizeEl = h('span', formatBytes(item.file.size)), stEl = h('span');
    const st = h('p', { class: 'kk-file-upload-st' }, sizeEl, h('span', { 'aria-hidden': 'true', style: 'padding:0 4px;opacity:.5' }, '·'), stEl);
    const act = h('div', { class: 'kk-file-upload-act' });
    const fill = h('i', { class: 'nt', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': `Enviando ${item.file.name}` });
    const li = h('li', { class: 'kk-file-upload-li' }, h('div', { class: 'kk-file-upload-row' }, th, h('div', { class: 'kk-file-upload-info' }, nm, st), act, h('div', { class: 'kk-file-upload-bar' }, fill)));
    return { li, st, stEl, act, fill, key: '' };
  }
  const statusLine = (it) => it.status === 'queued' ? 'Aguardando' : it.status === 'uploading' ? `${Math.round(it.progress)}%` : it.status === 'done' ? 'Enviado' : it.error?.message || 'Falha no envio';
  function paint(item) {
    const r = rows.get(item.id); if (!r) return;
    const failed = item.status === 'error' || item.status === 'rejected', inFlight = item.status === 'uploading' || item.status === 'queued';
    r.stEl.textContent = statusLine(item); r.st.classList.toggle('bad', failed);
    r.fill.style.transform = `scaleX(${item.progress / 100})`; r.fill.setAttribute('aria-valuenow', Math.round(item.progress));
    r.fill.className = (item.status === 'done' ? 'done ' : failed ? 'bad ' : '') + (item.progress === 0 ? 'nt' : '');  // retomar parte do zero na hora, sem "rebobinar"
    // Botões só mudam quando o estado muda (evita refazer o DOM a cada passo de progresso).
    const key = item.status;
    if (r.key !== key) {
      r.key = key; r.act.textContent = '';
      if (item.status === 'done') r.act.append(h('span', { class: 'kk-file-upload-ok' }, svg('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true' }, svg('path', { d: 'M3.5 8.5 6.5 11.5 12.5 4.5' }))));
      if (item.status === 'error') r.act.append(h('button', { type: 'button', class: 'kk-file-upload-btn', 'aria-label': `Tentar de novo: ${item.file.name}`, onclick: () => retry(item.id) }, icon('refresh'), 'Repetir'));
      r.act.append(h('button', { type: 'button', class: 'kk-file-upload-btn', 'aria-label': `${inFlight ? 'Cancelar' : 'Remover'} ${item.file.name}`, onclick: () => removeItem(item.id) }, icon('x')));
    }
  }
  const grow = (el) => { if (rm) return; const hgt = el.scrollHeight; el.animate([{ height: '0px', opacity: 0 }, { height: hgt + 'px', opacity: 1 }], { duration: 300, easing: EASE }); };
  function shrink(el) {
    if (rm) { el.remove(); return; }
    el.style.pointerEvents = 'none';
    el.animate([{ height: el.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 200, easing: EASE, fill: 'forwards' }).onfinish = () => el.remove();
  }

  // ---- redesenho geral
  function zoneCopy() {
    if (isFull()) return { title: 'Limite de arquivos atingido', browse: false, hint: 'Remova um arquivo para adicionar outro' };
    const hint = `${describeAll(ACCEPT)} até ${formatBytes(MAX_SIZE)} · ${limit} no máximo`;
    if (overZone) return { title: `Solte para adicionar ${overZone} ${overZone === 1 ? 'arquivo' : 'arquivos'}`, browse: false, hint };
    if (windowDrag) return { title: 'Solte os arquivos aqui', browse: false, hint };
    return { title: 'Solte os arquivos aqui ou ', browse: true, hint };
  }
  function update() {
    schedule();
    const full = isFull(), c = zoneCopy();
    zone.className = 'kk-file-upload-zone' + (full ? ' full' : '') + (windowDrag && !full ? ' armed' : '') + (overZone && !full ? ' over' : '');
    full ? zone.setAttribute('aria-disabled', 'true') : zone.removeAttribute('aria-disabled');
    icTitle.textContent = c.title; if (c.browse) icTitle.append(h('u', 'procurar'));
    hintEl.textContent = c.hint;
    noteEl.hidden = !notice; noteEl.textContent = notice;
    const ids = new Set(items.map((i) => i.id));
    for (const [id, r] of [...rows]) if (!ids.has(id)) { rows.delete(id); shrink(r.li); }
    for (const it of items) {
      let r = rows.get(it.id);
      if (!r) { r = makeRow(it); rows.set(it.id, r); list.append(r.li); grow(r.li); }
      paint(it);
    }
    let done = 0, failed = 0, busy = false;
    for (const it of items) { if (it.status === 'done') done++; else if (it.status === 'error' || it.status === 'rejected') failed++; else busy = true; }
    foot.hidden = !items.length;
    sum.replaceChildren(h('b', String(done)), ` de ${items.length} enviados`, failed ? h('span', { class: 'bad' }, ` · ${failed} com falha`) : '');
    clearBtn.textContent = busy ? 'Cancelar tudo' : 'Limpar';
    wasBusy = busy;
  }

  // ---- entrada: input, soltar na zona, colar, arrastar sobre a janela
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
  const zoneDrag = (e) => { if (!isFileDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = isFull() ? 'none' : 'copy'; const n = Math.max(1, countDragged(e.dataTransfer)); if (n !== overZone) { overZone = n; update(); } };
  zone.addEventListener('dragenter', zoneDrag); zone.addEventListener('dragover', zoneDrag);
  zone.addEventListener('dragleave', (e) => { if (e.relatedTarget instanceof Node && zone.contains(e.relatedTarget)) return; overZone = 0; update(); });
  zone.addEventListener('drop', (e) => { e.preventDefault(); overZone = 0; windowDrag = false; if (!isFull()) addFiles(e.dataTransfer.files); else update(); });
  zone.addEventListener('paste', (e) => { if (e.clipboardData?.files.length) { e.preventDefault(); addFiles(e.clipboardData.files); } });
  // Um arquivo sobre qualquer parte da janela acorda a zona, e soltar fora dela não faz o navegador abrir o arquivo.
  let depth = 0;
  const on = (t, fn) => { window.addEventListener(t, fn); d(() => window.removeEventListener(t, fn)); };
  on('dragenter', (e) => { if (!isFileDrag(e)) return; depth++; if (!windowDrag) { windowDrag = true; update(); } });
  on('dragleave', (e) => { if (!isFileDrag(e)) return; depth = Math.max(0, depth - 1); if (!depth && windowDrag) { windowDrag = false; update(); } });
  on('dragover', (e) => { if (isFileDrag(e)) e.preventDefault(); });
  const endDrag = (e) => { if (isFileDrag(e)) e.preventDefault(); depth = 0; windowDrag = false; overZone = 0; update(); };
  on('drop', endDrag); on('dragend', endDrag);

  update();
  return () => d.run();
}
