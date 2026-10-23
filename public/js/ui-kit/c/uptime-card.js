// Uptime Card — porte em JS puro do componente "Uptime Card" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, clamp, reduced, disposer } from '../kit.js';

// Quanto a barra sob o ponteiro alarga e até onde o inchaço se espalha, em barras.
const MAGNIFY = 5, SPREAD = 2.4;
const EASE = 18; // as barras caminham para a largura-alvo nesta taxa, por segundo
const DAY = 86400000, DAYS = 90;
const END = Date.parse('2026-10-14T00:00:00Z');

const SERVICES = [
  { name: 'Loja virtual', incidents: {
    19: { title: 'Erros ao finalizar pedidos', status: 'degraded', minutes: 18, updates: [
      { time: '14:02', label: 'Investigando', note: 'Falhas em 2% dos pedidos novos.' },
      { time: '14:11', label: 'Identificado', note: 'Uma configuração errada foi publicada.' },
      { time: '14:20', label: 'Resolvido', note: 'Voltamos a versão anterior; tudo normal.' }] },
    84: { title: 'Páginas lentas no sul do país', status: 'degraded', minutes: 23, updates: [
      { time: '09:41', label: 'Investigando', note: 'Tempo de carregamento 3x maior.' },
      { time: '09:52', label: 'Monitorando', note: 'Aumentamos a capacidade do servidor.' },
      { time: '10:04', label: 'Resolvido' }] } } },
  { name: 'Painel', incidents: {
    43: { title: 'Gráficos não carregavam', status: 'degraded', minutes: 12, updates: [
      { time: '18:30', label: 'Investigando' },
      { time: '18:42', label: 'Resolvido', note: 'Uma regra de cache foi desfeita.' }] } } },
  { name: 'Mensagens de WhatsApp', incidents: {
    69: { title: 'Envios atrasados', status: 'down', minutes: 48, updates: [
      { time: '02:15', label: 'Investigando', note: 'A fila de envio parou de andar.' },
      { time: '02:38', label: 'Identificado', note: 'Uma atualização falhou nos testes de saúde.' },
      { time: '03:03', label: 'Resolvido', note: 'Mensagens enviadas na ordem original.' }] } } },
  { name: 'Banco de dados', missing: 6, incidents: {
    27: { title: 'Troca para a réplica', status: 'down', minutes: 9, updates: [
      { time: '22:07', label: 'Investigando', note: 'O banco principal parou de gravar.' },
      { time: '22:16', label: 'Resolvido', note: 'Réplica promovida; nenhum dado perdido.' }] } } },
];

const COLOR = { up: '#1f9d6b', degraded: '#e0a526', down: '#d1434b', none: '#d3e6f6' };
const TEXT = { up: 'Operacional', degraded: 'Instável', down: 'Fora do ar', none: 'Sem dados' };
const fmtDay = (ms) => new Date(ms).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/\./g, '');
const dateOf = (day) => END - (DAYS - 1 - day) * DAY;

const statusOf = (s, day) => (day < (s.missing ?? 0) ? 'none' : s.incidents?.[day]?.status ?? 'up');
// Queda total conta inteira; instabilidade conta metade.
function uptimeOf(s) {
  const tracked = DAYS - (s.missing ?? 0);
  let lost = 0;
  for (const i of Object.values(s.incidents ?? {})) lost += i.minutes * (i.status === 'down' ? 1 : 0.5);
  return 100 * (1 - lost / (tracked * 1440));
}
// Larguras-alvo: inchaço em torno do foco, tudo reto sem foco.
function swell(count, focus, out) {
  for (let i = 0; i < count; i++) out[i] = focus === null ? 1 : 1 + MAGNIFY * Math.exp(-(((i - focus) / SPREAD) ** 2));
  return out;
}
// A barra sob x (0 a 1) quando as barras têm estas larguras.
function barAt(weights, x) {
  let total = 0; for (const w of weights) total += w;
  let at = x * total;
  for (let i = 0; i < weights.length; i++) { at -= weights[i]; if (at <= 0) return i; }
  return weights.length - 1;
}

const icon = (paths, cls) => svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: cls }, ...paths.map((d) => svg('path', { d })));
const CHECK = ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'];
const WARN = ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'];
const CLOSE = ['M18 6 6 18', 'M6 6l12 12'];

export default function mount(stage, ctx) {
  ensureStyle('uptime-card', `
.kk-uptime-card-wrap{width:100%;display:flex;justify-content:center;padding:4px 0}
.kk-uptime-card{width:100%;max-width:560px;padding:18px;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);user-select:none;-webkit-user-select:none}
.kk-uptime-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px 12px;flex-wrap:wrap}
.kk-uptime-card-title{margin:0;font-weight:600;font-size:14px}
.kk-uptime-card-state{display:flex;align-items:center;gap:6px;margin:0;font-size:13px}
.kk-uptime-card-state svg{width:16px;height:16px;flex-shrink:0}
.kk-uptime-card-state.ok{color:#17805a}.kk-uptime-card-state.warn{color:#a9740b}
.kk-uptime-card-sum{margin:4px 0 0;font-size:13px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums;min-height:18px}
.kk-uptime-card-bars{margin-top:16px;border-radius:8px;cursor:pointer;touch-action:pan-y;outline:none}
.kk-uptime-card-bars:focus-visible{box-shadow:0 0 0 2px var(--ice-500,#4a95d2),0 0 0 6px #fff}
.kk-uptime-card-svc+.kk-uptime-card-svc{margin-top:12px}
.kk-uptime-card-lab{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px}
.kk-uptime-card-lab b{font-weight:600}.kk-uptime-card-lab span{color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-uptime-card-row{display:flex;height:28px;gap:1px}
.kk-uptime-card-row i{flex:1 1 0;min-width:0;border-radius:2px;transition:opacity .15s ease-out}
.kk-uptime-card-row.dim i{opacity:.6}
.kk-uptime-card-row.dim i.lit{opacity:1}
.kk-uptime-card-axis{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#7d9bb9}
.kk-uptime-card-log{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .26s cubic-bezier(.23,1,.32,1),opacity .26s}
.kk-uptime-card-log.open{grid-template-rows:1fr;opacity:1}
.kk-uptime-card-log>div{overflow:hidden}
.kk-uptime-card-panel{margin-top:16px;padding:16px;border-radius:16px;background:var(--ice-50,#f2f8fe)}
.kk-uptime-card-ph{display:flex;align-items:center;justify-content:space-between}
.kk-uptime-card-ph p{margin:0;font-weight:600;font-size:14px}
.kk-uptime-card-x{display:flex;align-items:center;justify-content:center;width:36px;height:36px;margin:-8px -8px -8px 0;border:0;border-radius:50%;background:none;color:var(--mut,#4a6f93);cursor:pointer}
.kk-uptime-card-x:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-uptime-card-x:focus-visible{outline:2px solid var(--ice-500,#4a95d2)}
.kk-uptime-card-x svg{width:14px;height:14px}
.kk-uptime-card-none{margin:4px 0 0;font-size:14px;color:var(--mut,#4a6f93)}
.kk-uptime-card-inc{margin-top:12px}
.kk-uptime-card-inc>p{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:0;font-size:14px}
.kk-uptime-card-tag{padding:2px 8px;border-radius:999px;font-weight:600;font-size:11px}
.kk-uptime-card-tag.down{background:#fde3e5;color:#a32a31}.kk-uptime-card-tag.degraded{background:#fbefcf;color:#7c5508}
.kk-uptime-card-inc .m{color:var(--mut,#4a6f93)}
.kk-uptime-card-inc ol{list-style:none;margin:10px 0 0 4px;padding:0;border-left:1px solid var(--ice-200,#c9e1f6)}
.kk-uptime-card-inc li{position:relative;padding:0 0 10px 16px;font-size:14px;line-height:1.4}
.kk-uptime-card-inc li:last-child{padding-bottom:0}
.kk-uptime-card-inc li::before{content:"";position:absolute;left:-3.5px;top:7px;width:6px;height:6px;border-radius:50%;background:var(--ice-500,#4a95d2)}
.kk-uptime-card-inc li .t{color:#7d9bb9;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.kk-uptime-card-log{transition:none}}
`);
  const dispose = disposer();
  const noMotion = reduced();
  const st = { active: null, pinned: null, weights: new Float64Array(DAYS).fill(1), target: new Float64Array(DAYS).fill(1), raf: 0, last: 0 };

  const affected = SERVICES.filter((s) => { const t = statusOf(s, DAYS - 1); return t !== 'up' && t !== 'none'; });
  const stateEl = affected.length
    ? h('p', { class: 'kk-uptime-card-state warn' }, icon(WARN), `${affected.length} ${affected.length > 1 ? 'serviços afetados' : 'serviço afetado'}`)
    : h('p', { class: 'kk-uptime-card-state ok' }, icon(CHECK), 'Todos os sistemas operando');
  const summaryEl = h('p', { class: 'kk-uptime-card-sum', 'aria-live': 'polite' });

  const rows = SERVICES.map((svc) => {
    const bars = Array.from({ length: DAYS }, (_, d) => h('i', { style: `background:${COLOR[statusOf(svc, d)]}` }));
    const row = h('div', { class: 'kk-uptime-card-row' }, ...bars);
    return { svc, row, bars, el: h('div', { class: 'kk-uptime-card-svc' }, h('div', { class: 'kk-uptime-card-lab' }, h('b', {}, svc.name), h('span', {}, `${uptimeOf(svc).toFixed(2).replace('.', ',')}%`)), row) };
  });
  const bars = h('div', { class: 'kk-uptime-card-bars', role: 'slider', tabindex: '0', 'aria-valuemin': '1', 'aria-valuemax': String(DAYS) },
    ...rows.map((r) => r.el), h('div', { class: 'kk-uptime-card-axis' }, h('span', {}, `${DAYS} dias atrás`), h('span', {}, 'Hoje')));
  const logInner = h('div', {});
  const log = h('div', { class: 'kk-uptime-card-log' }, logInner);
  stage.append(h('div', { class: 'kk-uptime-card-wrap' }, h('div', { class: 'kk-uptime-card' },
    h('div', { class: 'kk-uptime-card-head' }, h('p', { class: 'kk-uptime-card-title' }, 'Status do sistema'), stateEl), summaryEl, bars, log)));

  // Larguras vão direto para as barras, um flex-grow por barra.
  const paint = () => { for (const r of rows) for (let i = 0; i < DAYS; i++) r.bars[i].style.flexGrow = st.weights[i].toFixed(3); };
  const tick = (now) => {
    st.raf = 0;
    const dt = st.last ? Math.min((now - st.last) / 1000, 1 / 30) : 1 / 60;
    st.last = now;
    const k = 1 - Math.exp(-EASE * dt);
    let moving = false;
    for (let i = 0; i < DAYS; i++) {
      const gap = st.target[i] - st.weights[i];
      if (Math.abs(gap) > 0.002) { st.weights[i] += gap * k; moving = true; } else st.weights[i] = st.target[i];
    }
    paint();
    if (moving && !document.hidden) st.raf = requestAnimationFrame(tick); else st.last = 0;
  };
  const focusOn = (focus) => {
    swell(DAYS, focus, st.target);
    if (noMotion) { st.weights.set(st.target); paint(); } else if (!st.raf) st.raf = requestAnimationFrame(tick);
  };
  dispose(() => cancelAnimationFrame(st.raf));

  const incidentsOf = (day) => SERVICES.flatMap((s) => (s.incidents?.[day] ? [{ service: s.name, incident: s.incidents[day] }] : []));

  function render() {
    const shown = st.active ?? st.pinned;
    let summary = 'Passe o cursor ou deslize sobre um dia para ver o que aconteceu';
    if (shown !== null) {
      const list = incidentsOf(shown), first = list[0];
      const what = first ? `${first.service} ${first.incident.status === 'down' ? 'fora do ar' : 'instável'} por ${first.incident.minutes} min${list.length > 1 ? `, +${list.length - 1}` : ''}` : 'Sem incidentes';
      summary = `${fmtDay(dateOf(shown))} · ${what}`;
    }
    summaryEl.textContent = summary;
    bars.setAttribute('aria-valuenow', String((shown ?? DAYS - 1) + 1));
    bars.setAttribute('aria-valuetext', summary);
    bars.setAttribute('aria-label', `Status diário dos últimos ${DAYS} dias. Use as setas para mudar de dia e Enter para abrir um.`);
    for (const r of rows) { r.row.classList.toggle('dim', shown !== null); r.bars.forEach((b, i) => b.classList.toggle('lit', i === shown)); }
    renderLog();
  }

  let loggedDay = null;
  function renderLog() {
    log.classList.toggle('open', st.pinned !== null);
    if (st.pinned === loggedDay) return;
    loggedDay = st.pinned;
    if (st.pinned === null) { logInner.replaceChildren(); return; }
    const list = incidentsOf(st.pinned);
    logInner.replaceChildren(h('div', { class: 'kk-uptime-card-panel' },
      h('div', { class: 'kk-uptime-card-ph' }, h('p', {}, fmtDay(dateOf(st.pinned))),
        h('button', { type: 'button', class: 'kk-uptime-card-x', 'aria-label': 'Fechar dia', onClick: () => { st.pinned = null; focusOn(null); render(); } }, icon(CLOSE))),
      list.length === 0 ? h('p', { class: 'kk-uptime-card-none' }, 'Nenhum incidente registrado. Todos os serviços operaram normalmente.') : null,
      ...list.map(({ service, incident }) => h('div', { class: 'kk-uptime-card-inc' },
        h('p', {}, h('span', { class: `kk-uptime-card-tag ${incident.status}` }, TEXT[incident.status]), h('b', {}, service), h('span', { class: 'm' }, `${incident.title} · ${incident.minutes} min`)),
        h('ol', {}, incident.updates.map((u) => h('li', {}, h('span', { class: 't' }, u.time), ' ', h('b', {}, u.label), u.note ? h('span', { class: 'm' }, ' ' + u.note) : null)))))));
  }

  // O dia sob o ponteiro, procurado no layout já inchado.
  const dayAt = (clientX) => {
    const r = bars.getBoundingClientRect(), x = clamp((clientX - r.left) / r.width, 0, 1), probe = new Float64Array(DAYS);
    let day = Math.round(x * (DAYS - 1));
    for (let pass = 0; pass < 3; pass++) day = barAt(swell(DAYS, day, probe), x); // centra o inchaço na barra que fica sob o ponteiro
    return day;
  };
  const point = (e) => { const d = dayAt(e.clientX); st.active = d; focusOn(d); render(); };
  const leave = () => { st.active = null; focusOn(st.pinned); render(); };

  bars.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && !bars.hasPointerCapture(e.pointerId)) return; point(e); });
  bars.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'mouse') bars.setPointerCapture(e.pointerId);
    point(e);
  });
  bars.addEventListener('click', () => { if (st.active !== null) { st.pinned = st.pinned === st.active ? null : st.active; render(); } });
  bars.addEventListener('lostpointercapture', leave);
  bars.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') leave(); });
  bars.addEventListener('keydown', (e) => {
    const from = st.active ?? st.pinned ?? DAYS - 1;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.pinned = st.pinned === from ? null : from; render(); return; }
    if (e.key === 'Escape') { st.pinned = null; leave(); return; }
    const move = { ArrowLeft: -1, ArrowRight: 1, Home: -DAYS, End: DAYS }[e.key];
    if (move === undefined) return;
    e.preventDefault();
    const day = clamp(from + move, 0, DAYS - 1);
    st.active = day; focusOn(day); render();
  });

  render();
  return () => dispose.run();
}
