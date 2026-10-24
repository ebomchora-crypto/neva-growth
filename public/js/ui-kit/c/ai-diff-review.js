// Revisão de diff por IA — porte em JS puro do componente "AI Diff Review" .
import { h, svg, icon, ensureStyle, reduced, PALETTE } from '../kit.js';

// Ícones de traço próprios (o ícone 'check' do app é uma caixa marcada)
const I = (d) => svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const CHECK = 'M5 12.5l4.5 4.5L19 7';

const L = (type, text) => ({ type, text });
// Alterações simuladas de um agente que mexe no checkout de uma loja
const DEMO = [
  { path: 'lib/validar.js', created: true, hunks: [{ start: 1, lines: [
    L('add', 'const CEP = /^\\d{5}-?\\d{3}$/;'), L('add', ''), L('add', 'export function cepValido(valor) {'),
    L('add', "  return CEP.test(String(valor).trim());"), L('add', '}')] }] },
  { path: 'app/checkout/formulario.js', hunks: [{ start: 18, lines: [
    L('context', '  const enviar = (dados) => {'), L('remove', '    if (!dados.cep) {'), L('remove', "      return erro('Obrigatório');"),
    L('add', '    if (!cepValido(dados.cep)) {'), L('add', "      return erro('Informe um CEP válido');"),
    L('context', '    }'), L('context', '    finalizar(dados);')] }] },
  { path: 'app/checkout/formulario.test.js', hunks: [{ start: 31, lines: [
    L('context', "  it('rejeita CEP vazio', () => {"), L('remove', "    expect(erroPara('')).toBe('Obrigatório');"),
    L('add', "    expect(erroPara('')).toBe('Informe um CEP válido');"), L('add', '  });'), L('add', ''),
    L('add', "  it('aceita CEP com hífen', () => {"), L('add', "    expect(erroPara('01310-100')).toBeNull();"), L('context', '  });')] }] },
];
const TOTAL = DEMO.reduce((s, f) => s + f.hunks.reduce((a, k) => a + k.lines.length, 0), 0);
const LINE_MS = 90, START_MS = 320;
const SIGN = { add: '+', remove: '−', context: ' ' };

const count = (hunks) => { let added = 0, removed = 0; for (const k of hunks) for (const l of k.lines) { if (l.type === 'add') added++; else if (l.type === 'remove') removed++; } return { added, removed }; };
// Corta os arquivos nas primeiras `shown` linhas, na ordem
function takeLines(files, shown) {
  let left = shown; const out = [];
  for (const f of files) {
    if (left <= 0) break;
    const hunks = [];
    for (const k of f.hunks) { if (left <= 0) break; hunks.push({ ...k, lines: k.lines.slice(0, left) }); left -= k.lines.length; }
    out.push({ ...f, hunks });
  }
  return out;
}

export default function mount(stage, ctx) {
  ensureStyle('ai-diff-review', `
  .kk-ai-diff-review-root{width:100%;min-width:0;box-sizing:border-box;max-width:520px;margin:auto;color:${PALETTE.ink};font-family:inherit}
  .kk-ai-diff-review-card{min-width:0;background:${PALETTE.ice100};border-radius:16px;padding:6px}
  .kk-ai-diff-review-head{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 8px;flex-wrap:wrap}
  .kk-ai-diff-review-title{font-weight:600;font-size:14px;display:inline-block;white-space:nowrap}
  .kk-ai-diff-review-title.in{animation:kk-ai-diff-review-fade .2s ease-out}
  .kk-ai-diff-review-sum{font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
  .kk-ai-diff-review-add{color:${PALETTE.ok}}.kk-ai-diff-review-rem{color:${PALETTE.bad}}
  .kk-ai-diff-review-actions{margin-left:auto;display:flex;gap:4px}
  .kk-ai-diff-review-btn{min-height:36px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:${PALETTE.mut};font:500 12px/1 inherit;font-family:inherit;cursor:pointer}
  .kk-ai-diff-review-btn:hover{background:${PALETTE.ice200};color:${PALETTE.ink}}
  .kk-ai-diff-review-btn.solid{background:${PALETTE.ice700};color:#fff}.kk-ai-diff-review-btn.solid:hover{background:${PALETTE.ice800}}
  .kk-ai-diff-review-btn:focus-visible,.kk-ai-diff-review-ic:focus-visible,.kk-ai-diff-review-name:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
  .kk-ai-diff-review-list{list-style:none;margin:0;padding:0;background:#fff;border-radius:12px;box-shadow:0 0 0 1px rgba(14,34,54,.06)}
  .kk-ai-diff-review-file{border-top:1px solid ${PALETTE.ice100};overflow:hidden}
  .kk-ai-diff-review-file:first-child{border-top:0}
  .kk-ai-diff-review-file.enter{animation:kk-ai-diff-review-row .22s ease-out}
  .kk-ai-diff-review-row{display:flex;align-items:center;gap:6px;min-height:44px;padding:0 6px 0 4px}
  .kk-ai-diff-review-name{flex:1;min-width:0;display:flex;align-items:center;gap:6px;min-height:36px;padding:0 6px;border:0;background:transparent;border-radius:8px;text-align:left;cursor:pointer;font-family:inherit;color:inherit}
  .kk-ai-diff-review-name:disabled{cursor:default}
  .kk-ai-diff-review-chev{width:14px;height:14px;flex:none;color:${PALETTE.ice400};transition:transform .2s cubic-bezier(.23,1,.32,1),opacity .2s}
  .kk-ai-diff-review-chev svg{width:14px;height:14px;display:block}
  .kk-ai-diff-review-chev.open{transform:rotate(90deg)}.kk-ai-diff-review-chev.off{opacity:0}
  .kk-ai-diff-review-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
  .kk-ai-diff-review-path small{color:${PALETTE.ice400};font-size:inherit}
  .kk-ai-diff-review-file.rejected .kk-ai-diff-review-path{color:${PALETTE.ice400};text-decoration:line-through}
  .kk-ai-diff-review-new{flex:none;font-size:11px;line-height:16px;padding:0 5px;border-radius:4px;background:${PALETTE.ice100};color:${PALETTE.ice700}}
  .kk-ai-diff-review-ctl{display:flex;align-items:center;gap:6px;flex:none;animation:kk-ai-diff-review-fade .18s ease-out}
  .kk-ai-diff-review-bar{display:flex;gap:1px}.kk-ai-diff-review-bar i{width:6px;height:6px;border-radius:1px;background:${PALETTE.ice200}}
  .kk-ai-diff-review-bar i.g{background:${PALETTE.ok}}.kk-ai-diff-review-bar i.r{background:${PALETTE.bad}}
  @container (max-width:360px){.kk-ai-diff-review-bar{display:none}}
  .kk-ai-diff-review-icons{display:flex;gap:0;transition:opacity .2s}.kk-ai-diff-review-icons.busy{opacity:0;pointer-events:none}
  .kk-ai-diff-review-ic{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:${PALETTE.ice500};cursor:pointer}
  .kk-ai-diff-review-ic svg{width:15px;height:15px}
  .kk-ai-diff-review-ic.rej:hover{background:#fdecee;color:${PALETTE.bad}}.kk-ai-diff-review-ic.acc:hover{background:#e6f6ef;color:${PALETTE.ok}}
  .kk-ai-diff-review-ic.und:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}
  .kk-ai-diff-review-state{font-size:12px;color:${PALETTE.mut}}.kk-ai-diff-review-state.accepted{color:${PALETTE.ok}}
  .kk-ai-diff-review-wrap{display:grid;grid-template-rows:0fr;grid-template-columns:minmax(0,1fr);opacity:0;transition:grid-template-rows .32s cubic-bezier(.23,1,.32,1),opacity .15s}
  .kk-ai-diff-review-wrap.open{grid-template-rows:1fr;opacity:1}
  .kk-ai-diff-review-wrap>div{min-height:0;overflow:hidden}
  .kk-ai-diff-review-diff{margin:0 8px 8px;overflow-x:auto;border-radius:10px;background:${PALETTE.ice50};box-shadow:inset 0 0 0 1px rgba(14,34,54,.06);padding:4px 0}
  .kk-ai-diff-review-line{display:flex;font:12px/20px ui-monospace,SFMono-Regular,Menlo,monospace;animation:kk-ai-diff-review-line .2s ease-out}
  .kk-ai-diff-review-line.add{background:rgba(31,157,107,.1);color:#0f5c3f}.kk-ai-diff-review-line.remove{background:rgba(209,67,75,.1);color:#8f2330}
  .kk-ai-diff-review-line.context{color:${PALETTE.mut}}
  .kk-ai-diff-review-ln{width:36px;flex:none;padding-right:8px;text-align:right;color:${PALETTE.ice400};user-select:none;font-variant-numeric:tabular-nums}
  .kk-ai-diff-review-sg{width:16px;flex:none;text-align:center;opacity:.6;user-select:none}
  .kk-ai-diff-review-tx{white-space:pre;padding-right:12px}
  .kk-ai-diff-review-wait{padding:0 12px;min-height:44px;display:flex;align-items:center;font-size:14px;color:${PALETTE.ice400}}
  @keyframes kk-ai-diff-review-fade{from{opacity:0}to{opacity:1}}
  @keyframes kk-ai-diff-review-line{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
  @keyframes kk-ai-diff-review-row{from{opacity:0;max-height:0}to{opacity:1;max-height:60px}}
  @media (prefers-reduced-motion:reduce){.kk-ai-diff-review-wrap,.kk-ai-diff-review-chev{transition:none}.kk-ai-diff-review-line,.kk-ai-diff-review-file.enter,.kk-ai-diff-review-title.in,.kk-ai-diff-review-ctl{animation:none}}
  `);
  stage.style.containerType = 'inline-size';

  let shown = 0, run = 0, visible = false, timer = 0;
  const dec = {}, opened = {};
  const writing = () => shown < TOTAL;
  const decisionOf = (p) => dec[p] || 'pending';

  const root = h('div', { class: 'kk-ai-diff-review-root' });
  const head = h('div', { class: 'kk-ai-diff-review-head' });
  const list = h('ul', { class: 'kk-ai-diff-review-list' });
  root.append(h('div', { class: 'kk-ai-diff-review-card' }, head, list));
  stage.append(root);

  // Mantém os elementos de cada arquivo entre redesenhos para as linhas novas animarem só uma vez
  const rows = new Map();
  let lastTitle = '';

  function paint() {
    const files = takeLines(DEMO, shown);
    const w = writing();
    const tot = files.reduce((a, f) => { const c = count(f.hunks); return { added: a.added + c.added, removed: a.removed + c.removed }; }, { added: 0, removed: 0 });
    const pending = files.filter((f) => decisionOf(f.path) === 'pending');
    const acc = files.filter((f) => decisionOf(f.path) === 'accepted').length;
    const allDecided = !w && files.length > 0 && pending.length === 0;
    const writingPath = w ? files.at(-1)?.path : undefined;
    const isOpen = (p) => (writingPath !== undefined ? p === writingPath : (opened[p] ?? p === files.at(-1)?.path));

    let title = `${files.length} arquivo${files.length === 1 ? '' : 's'} alterado${files.length === 1 ? '' : 's'}`;
    if (w) title = 'Editando arquivos'; else if (allDecided) title = `${acc} de ${files.length} mantido${acc === 1 ? '' : 's'}`;
    const t = h('output', { class: 'kk-ai-diff-review-title' + (title !== lastTitle ? ' in' : '') }, title); lastTitle = title;

    const act = h('div', { class: 'kk-ai-diff-review-actions' });
    if (allDecided) act.append(h('button', { type: 'button', class: 'kk-ai-diff-review-btn', onclick: replay }, 'Repetir'));
    else if (!w) act.append(
      h('button', { type: 'button', class: 'kk-ai-diff-review-btn', onclick: () => pending.forEach((f) => decide(f.path, 'rejected')) }, 'Rejeitar tudo'),
      h('button', { type: 'button', class: 'kk-ai-diff-review-btn solid', onclick: () => pending.forEach((f) => decide(f.path, 'accepted')) }, 'Aceitar tudo'));
    head.replaceChildren(t, h('span', { class: 'kk-ai-diff-review-sum' }, h('span', { class: 'kk-ai-diff-review-add' }, `+${tot.added}`), ' ', h('span', { class: 'kk-ai-diff-review-rem' }, `−${tot.removed}`)), act);

    if (!files.length) { list.replaceChildren(h('li', { class: 'kk-ai-diff-review-wait' }, 'Aguardando alterações…')); rows.clear(); return; }
    list.querySelector('.kk-ai-diff-review-wait')?.remove();
    files.forEach((f, i) => {
      let r = rows.get(f.path);
      if (!r) {
        r = { li: h('li', { class: 'kk-ai-diff-review-file enter' }), lines: 0 };
        rows.set(f.path, r); list.append(r.li);
      }
      renderFile(r, f, decisionOf(f.path), isOpen(f.path), f.path === writingPath);
    });
  }

  function renderFile(r, f, d, open, busy) {
    const { added, removed } = count(f.hunks);
    const sl = f.path.lastIndexOf('/'); const isOpen = open && d === 'pending';
    const total = added + removed, green = total ? Math.round((added / total) * 5) : 0;
    r.li.className = 'kk-ai-diff-review-file ' + d + (r.li.classList.contains('enter') ? ' enter' : '');
    const wrapId = 'kk-diff-' + run + '-' + f.path.replace(/\W/g, '');
    const nameBtn = h('button', { type: 'button', class: 'kk-ai-diff-review-name', 'aria-controls': wrapId, 'aria-expanded': String(isOpen), disabled: d !== 'pending' || busy,
      onclick: () => { opened[f.path] = !isOpen; paint(); } },
      h('span', { class: 'kk-ai-diff-review-chev' + (isOpen ? ' open' : '') + (d !== 'pending' ? ' off' : ''), 'aria-hidden': 'true' }, I('M9 6l6 6-6 6')),
      h('span', { class: 'kk-ai-diff-review-path' }, h('small', f.path.slice(0, sl + 1)), f.path.slice(sl + 1)),
      f.created && d !== 'rejected' && h('span', { class: 'kk-ai-diff-review-new' }, 'novo'));
    const ctl = d === 'pending'
      ? h('div', { class: 'kk-ai-diff-review-ctl' },
        h('span', { class: 'kk-ai-diff-review-sum' }, h('span', { class: 'kk-ai-diff-review-add' }, `+${added}`), ' ', h('span', { class: 'kk-ai-diff-review-rem' }, `−${removed}`)),
        h('span', { class: 'kk-ai-diff-review-bar', 'aria-hidden': 'true' }, Array.from({ length: 5 }, (_, i) => h('i', { class: !total ? '' : i < green ? 'g' : 'r' }))),
        // reservados no layout durante a escrita para os contadores não pularem
        h('span', { class: 'kk-ai-diff-review-icons' + (busy ? ' busy' : '') },
          h('button', { type: 'button', class: 'kk-ai-diff-review-ic rej', tabindex: busy ? -1 : 0, 'aria-label': `Rejeitar ${f.path}`, onclick: () => decide(f.path, 'rejected') }, icon('x')),
          h('button', { type: 'button', class: 'kk-ai-diff-review-ic acc', tabindex: busy ? -1 : 0, 'aria-label': `Aceitar ${f.path}`, onclick: () => decide(f.path, 'accepted') }, I(CHECK))))
      : h('div', { class: 'kk-ai-diff-review-ctl' }, h('span', { class: 'kk-ai-diff-review-state ' + d }, d === 'accepted' ? 'Aceito' : 'Revertido'),
        h('button', { type: 'button', class: 'kk-ai-diff-review-ic und', 'aria-label': `Desfazer decisão de ${f.path}`, onclick: () => decide(f.path, 'pending') }, icon('undo')));

    // Reaproveita o corpo do diff: só acrescenta linhas novas (a animação roda uma vez por linha)
    let wrap = r.wrap;
    if (!wrap) {
      r.body = h('div', { class: 'kk-ai-diff-review-diff' });
      wrap = r.wrap = h('div', { class: 'kk-ai-diff-review-wrap' }, h('div', r.body));
    }
    wrap.id = wrapId; wrap.classList.toggle('open', isOpen); wrap.inert = !isOpen;
    const flat = f.hunks.flatMap((k) => { let n = k.start; return k.lines.map((l) => ({ ...l, n: l.type === 'remove' ? '' : n++ })); });
    if (flat.length < r.lines) { r.body.replaceChildren(); r.lines = 0; }
    for (const l of flat.slice(r.lines)) r.body.append(h('div', { class: 'kk-ai-diff-review-line ' + l.type }, h('span', { class: 'kk-ai-diff-review-ln' }, String(l.n)), h('span', { class: 'kk-ai-diff-review-sg' }, SIGN[l.type]), h('span', { class: 'kk-ai-diff-review-tx' }, l.text || ' ')));
    r.lines = flat.length;
    r.li.replaceChildren(h('div', { class: 'kk-ai-diff-review-row' }, nameBtn, ctl), wrap);
    r.li.addEventListener('animationend', () => r.li.classList.remove('enter'), { once: true });
  }

  function decide(path, d) { dec[path] = d; paint(); }
  function replay() {
    clearTimeout(timer); shown = 0; run++;
    for (const k of Object.keys(dec)) delete dec[k];
    for (const k of Object.keys(opened)) delete opened[k];
    rows.clear(); list.replaceChildren(); paint(); schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (!writing() || !visible) return;
    // Sem movimento: mostra tudo de uma vez
    if (reduced()) { shown = TOTAL; paint(); return; }
    timer = setTimeout(() => { shown = Math.min(TOTAL, shown + 1); paint(); schedule(); }, shown === 0 ? START_MS : LINE_MS);
  }

  paint();
  // Só escreve enquanto o palco estiver visível
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) schedule(); else clearTimeout(timer); });
  io.observe(stage);

  return () => { clearTimeout(timer); io.disconnect(); };
}
