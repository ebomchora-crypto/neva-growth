// Revisão de alterações propostas pela IA (port em JS puro do "AI Diff Review" do KokonutUI).
// Cada arquivo tem blocos de diff expansíveis e decisão própria (aceitar / rejeitar / desfazer).
import { h, mount, icon, diffLines } from './ui.js';

/** Converte (antigo, novo) em blocos com 2 linhas de contexto e numeração do arquivo novo. */
export function hunksOf(oldText, newText) {
  const d = diffLines(oldText ?? '', newText); const keep = new Set();
  d.forEach((l, i) => { if (l.t !== 'eq') for (let k = i - 2; k <= i + 2; k++) keep.add(k); });
  const hunks = []; let cur = null; let n = 1;
  d.forEach((l, i) => {
    const num = l.t === 'del' ? null : n; if (l.t !== 'del') n++;
    if (!keep.has(i)) { cur = null; return; }
    if (!cur) { cur = { start: num ?? n, lines: [] }; hunks.push(cur); }
    cur.lines.push({ type: l.t === 'add' ? 'add' : l.t === 'del' ? 'remove' : 'context', text: l.s, n: num });
  });
  return hunks;
}
const count = (hunks) => hunks.reduce((a, hk) => { for (const l of hk.lines) { if (l.type === 'add') a.added++; else if (l.type === 'remove') a.removed++; } return a; }, { added: 0, removed: 0 });
const SIGN = { add: '+', remove: '−', context: ' ' };

/** files: [{path, created?, hunks}] → { el, accepted(): paths, onChange } */
export function diffReview(files, { onChange, initial = {} } = {}) {
  const dec = Object.fromEntries(files.map((f) => [f.path, initial[f.path] || 'pending'])); const openSet = new Set(files.length === 1 ? [files[0].path] : []);
  const root = h('div', { class: 'dreview' }); const head = h('div', { class: 'dr-head' }); const ul = h('ul', { class: 'dr-list' });
  const pending = () => files.filter((f) => dec[f.path] === 'pending'); const accepted = () => files.filter((f) => dec[f.path] === 'accepted');
  const decide = (p, v) => { dec[p] = v; if (v !== 'pending') openSet.delete(p); paint(); onChange?.(accepted().map((f) => f.path), { ...dec }); };
  function paint() {
    const tot = files.reduce((a, f) => { const c = count(f.hunks); return { added: a.added + c.added, removed: a.removed + c.removed }; }, { added: 0, removed: 0 });
    const all = pending().length === 0;
    mount(head, h('output', { class: 'dr-title' }, all ? `${accepted().length} de ${files.length} aceita(s)` : `${files.length} arquivo(s) alterado(s)`), h('span', { class: 'dr-cnt' }, h('b', { class: 'add' }, `+${tot.added}`), ' ', h('b', { class: 'rem' }, `−${tot.removed}`)),
      h('span', { class: 'grow' }), !all && h('button', { type: 'button', class: 'dr-btn', onclick: () => { pending().forEach((f) => { dec[f.path] = 'rejected'; }); paint(); onChange?.(accepted().map((f) => f.path), { ...dec }); } }, 'Rejeitar tudo'),
      !all && h('button', { type: 'button', class: 'dr-btn solid', onclick: () => { pending().forEach((f) => { dec[f.path] = 'accepted'; }); paint(); onChange?.(accepted().map((f) => f.path), { ...dec }); } }, 'Aceitar tudo'));
    mount(ul, files.map((f) => {
      const d = dec[f.path]; const { added, removed } = count(f.hunks); const sl = f.path.lastIndexOf('/'); const isOpen = openSet.has(f.path) && d === 'pending';
      const total = added + removed; const green = total ? Math.round((added / total) * 5) : 0;
      return h('li', { class: 'dr-file ' + d },
        h('div', { class: 'dr-row' },
          h('button', { type: 'button', class: 'dr-name', 'aria-expanded': isOpen, disabled: d !== 'pending', onclick: () => { if (openSet.has(f.path)) openSet.delete(f.path); else openSet.add(f.path); paint(); } },
            h('span', { class: 'dr-chev' + (isOpen ? ' open' : '') + (d !== 'pending' ? ' off' : '') }, icon('chevron')),
            h('span', { class: 'dr-path' }, h('small', f.path.slice(0, sl + 1)), h('b', f.path.slice(sl + 1))), f.created && d !== 'rejected' && h('span', { class: 'dr-new' }, 'novo')),
          d === 'pending' ? h('span', { class: 'dr-act' }, h('span', { class: 'dr-n' }, h('b', { class: 'add' }, `+${added}`), ' ', h('b', { class: 'rem' }, `−${removed}`)),
            h('span', { class: 'dr-bar', 'aria-hidden': 'true' }, Array.from({ length: 5 }, (_, i) => h('i', { class: !total ? '' : i < green ? 'g' : 'r' }))),
            h('button', { type: 'button', class: 'dr-ic rej', 'aria-label': `Rejeitar ${f.path}`, onclick: () => decide(f.path, 'rejected') }, icon('x')),
            h('button', { type: 'button', class: 'dr-ic acc', 'aria-label': `Aceitar ${f.path}`, onclick: () => decide(f.path, 'accepted') }, icon('check')))
            : h('span', { class: 'dr-act' }, h('span', { class: 'dr-state ' + d }, d === 'accepted' ? 'Aceita' : 'Rejeitada'), h('button', { type: 'button', class: 'dr-ic', 'aria-label': `Desfazer decisão de ${f.path}`, onclick: () => decide(f.path, 'pending') }, icon('undo')))),
        isOpen && h('div', { class: 'dr-diff' }, f.hunks.map((hk) => h('div', { class: 'dr-hunk' }, hk.lines.map((l) => h('div', { class: 'dr-line ' + l.type }, h('span', { class: 'ln' }, l.n ?? ''), h('span', { class: 'sg' }, SIGN[l.type]), h('span', { class: 'tx' }, l.text || ' ')))))));
    }));
  }
  mount(root, h('div', { class: 'dr-box' }, head, ul)); paint();
  return { el: root, accepted: () => accepted().map((f) => f.path) };
}
