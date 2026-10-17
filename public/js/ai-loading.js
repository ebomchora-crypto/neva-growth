// Estado de carregamento da IA em etapas (port em JS puro do "AI Loading State" do KokonutUI).
// As etapas refletem estados REAIS (enviando, aguardando a IA, aplicando): quem usa chama update() quando algo muda.
import { h, mount, icon } from './ui.js';

const fmt = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
const fmtStep = (ms) => (ms < 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`);
const wave = (text) => Array.from(text).map((c, i) => h('span', { class: 'al-w', style: `animation-delay:${i * 0.05}s` }, c));

/** steps: [{id,label,status:'pending'|'running'|'done'|'error',detail?:string[]}] */
export function aiLoading(initial = [], { collapseWhenDone = true } = {}) {
  let steps = initial; let open = true; const starts = {}; const times = {}; let t0 = 0; let timer = 0; let seconds = 0; let finished = false;
  const root = h('div', { class: 'ailoading' }); const header = h('button', { type: 'button', class: 'al-head', 'aria-expanded': 'true' }); const list = h('ol', { class: 'al-list' });
  header.addEventListener('click', () => { open = !open; paint(); });
  mount(root, header, list);
  const icoFor = (s) => ({ pending: h('i', { class: 'al-dot' }), running: h('i', { class: 'al-spin' }), done: icon('check'), error: icon('alert') }[s]);
  function paint() {
    const running = steps.find((s) => s.status === 'running'); const failed = steps.find((s) => s.status === 'error');
    const done = steps.length > 0 && steps.every((s) => s.status === 'done');
    let title = 'Preparando'; if (failed) title = `Parou em: ${failed.label}`; else if (done) title = `Concluído em ${fmt(seconds)}`; else if (running) title = running.label;
    mount(header, h('output', { class: 'al-title' }, title), running && h('span', { class: 'al-sec' }, fmt(seconds)), done && h('span', { class: 'al-sec' }, `· ${steps.length} etapas`), h('span', { class: 'al-car' + (open ? ' open' : '') }, icon('chevron')));
    header.setAttribute('aria-expanded', String(open)); list.classList.toggle('hide', !open);
    mount(list, steps.map((s, i) => h('li', { class: 'al-row ' + s.status },
      i < steps.length - 1 && h('span', { class: 'al-rail' }, h('i', { class: s.status === 'done' ? 'on' : '' })),
      h('span', { class: 'al-ico ' + s.status }, icoFor(s.status)),
      h('div', { class: 'al-body' }, h('div', { class: 'al-line' }, h('span', { class: 'al-label' }, s.status === 'running' ? wave(s.label) : s.label), times[s.id] !== undefined && h('small', fmtStep(times[s.id]))),
        s.status === 'running' && s.detail?.length ? h('div', { class: 'al-log' }, s.detail.slice(-3).map((l, k, a) => h('div', h('span', String(s.detail.length - a.length + k + 1)), l))) : null))));
  }
  function update(next) {
    const now = Date.now(); steps = next;
    for (const s of steps) {
      if (s.status === 'pending') { delete starts[s.id]; delete times[s.id]; continue; }
      starts[s.id] ??= now;
      if ((s.status === 'done' || s.status === 'error') && times[s.id] === undefined) times[s.id] = now - starts[s.id];
    }
    const active = steps.some((s) => s.status === 'running'); const done = steps.length > 0 && steps.every((s) => s.status === 'done');
    if (active && !timer) { if (finished) { finished = false; t0 = 0; } t0 ||= now; timer = setInterval(() => { seconds = Math.floor((Date.now() - t0) / 1000); paint(); }, 500); }
    if (!active && timer) { clearInterval(timer); timer = 0; }
    if (done) { finished = true; if (collapseWhenDone) open = false; }
    seconds = t0 ? Math.floor((now - t0) / 1000) : seconds; paint();
  }
  update(initial);
  return { el: root, update, stop() { clearInterval(timer); timer = 0; } };
}
