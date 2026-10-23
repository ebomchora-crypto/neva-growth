// Etapas do agente (port em JS puro do "AI Loading State" do Kokonut UI, MIT): título com o passo atual e o tempo,
// lista com trilho que se preenche, ícone por estado (fila, girando, check que se desenha, erro), texto em onda no passo
// em andamento, as últimas linhas de log rolando e o tempo de cada passo. Recolhe sozinho quando tudo termina.
import { h, mount } from '../ui.js';

const LINE = 22; const VISIBLE = 3;
const dur = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
const stepTime = (ms) => (ms < 10000 ? `${(ms / 1000).toFixed(1).replace('.', ',')}s` : `${Math.round(ms / 1000)}s`);
const svg = (html, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('fill', 'none'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls); s.innerHTML = html; return s; };
const ICON = {
  pending: () => h('span', { class: 'as-dot' }),
  running: () => svg('<circle cx="8" cy="8" r="6.25" class="trk" stroke-width="1.6"/><path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" class="arc" stroke-width="1.6" stroke-linecap="round"/>', 'as-spin'),
  done: () => svg('<path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="as-draw"/>', 'as-ok'),
  error: () => svg('<path d="M4.5 4.5l7 7m0-7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', 'as-err'),
};
const wave = (text) => Array.from(text).map((c, i) => h('span', { class: 'as-wave', style: `animation-delay:${i * 0.05}s` }, c));

/**
 * steps: [{ id, label, status: 'pending'|'running'|'done'|'error', detail?: string[], ms?: number }]
 * Devolve { el, set(steps) }.
 */
export function agentSteps({ collapseWhenDone = true, title = 'Preparando' } = {}) {
  let steps = []; let open = true; let userToggled = false;
  let t0 = null; let elapsed = 0; let timer = null; let wasDone = false;
  const starts = {}; const times = {};
  const head = h('button', { type: 'button', class: 'as-head', 'aria-expanded': 'true' });
  const list = h('ol', { class: 'as-list' });
  const root = h('div', { class: 'as' }, head, list);
  head.addEventListener('click', () => { open = !open; userToggled = true; paint(); });

  const tick = () => { elapsed = t0 ? Math.floor((Date.now() - t0) / 1000) : 0; paintHead(); };
  function track() {
    const now = Date.now();
    for (const s of steps) {
      if (s.status === 'pending') { delete starts[s.id]; delete times[s.id]; continue; }
      if (s.status === 'running') starts[s.id] ??= now;
      // Tempo só quando é medido de verdade: veio do servidor ou o passo foi visto rodando aqui.
      if ((s.status === 'done' || s.status === 'error') && times[s.id] == null && (s.ms != null || starts[s.id] != null)) times[s.id] = s.ms ?? now - starts[s.id];
    }
  }
  function paintHead() {
    const running = steps.find((s) => s.status === 'running'); const failed = steps.find((s) => s.status === 'error');
    const done = steps.length > 0 && steps.every((s) => s.status === 'done');
    const total = done && !t0 ? Math.round(Object.values(times).reduce((a, b) => a + b, 0) / 1000) : elapsed;
    const label = failed ? `Parou em: ${failed.label}` : done ? `Trabalhou por ${dur(total)}` : running ? running.label : title;
    mount(head, h('output', { class: 'as-title' }, label),
      running && h('span', { class: 'as-time' }, dur(elapsed)),
      done && h('span', { class: 'as-time' }, `· ${steps.length} etapas`),
      svg('<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', 'as-chev' + (open ? ' up' : '')));
    head.setAttribute('aria-expanded', String(open));
  }
  function log(lines) {
    const off = Math.max(0, lines.length - VISIBLE);
    return h('div', { class: 'as-log', 'aria-hidden': 'true', style: `height:${LINE * Math.min(lines.length, VISIBLE)}px${lines.length > VISIBLE - 1 ? ';-webkit-mask-image:linear-gradient(to bottom,rgb(0 0 0/.25),#000 70%);mask-image:linear-gradient(to bottom,rgb(0 0 0/.25),#000 70%)' : ''}` },
      h('div', { class: 'as-login', style: `transform:translateY(${-off * LINE}px)` }, lines.map((l, i) => h('div', { class: 'as-line', style: `height:${LINE}px` }, h('span', String(i + 1)), h('em', l)))));
  }
  function paint() {
    paintHead();
    list.hidden = !open; list.classList.toggle('closed', !open);
    mount(list, steps.map((s, i) => h('li', { class: 'as-step ' + s.status },
      i < steps.length - 1 && h('span', { class: 'as-rail', 'aria-hidden': 'true' }, h('i', { class: s.status === 'done' ? 'full' : '' })),
      h('span', { class: 'as-ico' }, ICON[s.status]()),
      h('div', { class: 'as-body' },
        h('div', { class: 'as-row' }, h('p', s.status === 'running' ? [h('span', { class: 'sr-only' }, s.label), h('span', { 'aria-hidden': 'true' }, wave(s.label))] : s.label),
          times[s.id] != null && h('small', stepTime(times[s.id]))),
        s.status === 'running' && s.detail?.length ? log(s.detail) : null))));
  }
  return {
    el: root,
    set(next) {
      steps = next || []; track();
      const running = steps.some((s) => s.status === 'running');
      const done = steps.length > 0 && steps.every((s) => s.status === 'done');
      if (running && !timer) { if (!t0 || wasDone) { t0 = Date.now(); wasDone = false; } timer = setInterval(tick, 500); tick(); }
      if (!running && timer) { clearInterval(timer); timer = null; tick(); }
      if (done && !wasDone) { wasDone = true; if (collapseWhenDone && !userToggled) open = false; }
      if (!done && !userToggled) open = true;
      paint();
    },
    destroy() { clearInterval(timer); },
  };
}
