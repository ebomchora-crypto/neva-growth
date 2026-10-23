// Raias de agentes — porte em JS puro do componente "AI Agent Lanes" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, loop, reduced, clamp, onResize, PALETTE } from '../kit.js';

const NS = 'kk-ai-agent-lanes-', LANE_H = 36, TICK = 2;
const I = (d, fill) => svg('svg', { viewBox: '0 0 24 24', fill: fill ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));
const ICON = { play: () => I('M7 5l12 7-12 7z', true), pause: () => I('M8 5v14M16 5v14'), replay: () => I('M3 12a9 9 0 109-9 9.8 9.8 0 00-6.7 2.7L3 8M3 3v5h5'), check: () => I('M5 12.5l4.5 4.5L19 7') };

const TASK = 'Onde nossa equipe de 30 pessoas deve fazer o encontro de agosto?';
const LANES = [
  { id: 'lead', name: 'Líder', steps: [
    { tool: 'think', label: 'Dividir a pergunta', start: 0, end: 1.4, result: 'Três partes: como chegar, onde se reunir e o clima.' },
    { tool: 'write', label: 'Escrever a resposta', start: 10.4, end: 13.6 }] },
  { id: 'voos', name: 'Voos', summary: 'Salvador e Recife têm mais voos diretos', steps: [
    { tool: 'search', label: 'Voos diretos das 11 filiais', start: 1.6, end: 3.3, result: '142 rotas em 6 cidades' },
    { tool: 'read', label: 'mapas de rotas das companhias', start: 3.3, end: 5.5, result: 'Salvador 10/11, Recife 9/11, Natal 7/11' },
    { tool: 'think', label: 'Ordenar por voos diretos', start: 5.5, end: 6.8 }] },
  { id: 'locais', name: 'Locais', summary: '3 locais abaixo de R$ 450 por pessoa', steps: [
    { tool: 'search', label: 'Locais para 30 pessoas', start: 1.7, end: 2.9, result: '24 locais' },
    { tool: 'read', label: 'páginas dos locais de Salvador', start: 2.9, end: 4.5, result: 'Pelourinho Hall, Casarão do Rio Vermelho' },
    { tool: 'read', label: 'páginas dos locais de Recife', start: 4.5, end: 6.2, result: 'Casarão do Pina' },
    { tool: 'think', label: 'Comparar preço por pessoa', start: 6.2, end: 9.6 }] },
  { id: 'clima', name: 'Clima', summary: '25–26 °C e pouca chuva em agosto', steps: [
    { tool: 'search', label: 'Temperatura média em agosto', start: 1.8, end: 2.8, result: '6 cidades' },
    { tool: 'read', label: 'tabelas climáticas', start: 2.8, end: 4.6, result: 'Salvador 25 °C, Recife 26 °C' },
    { tool: 'think', label: 'Checar dias de chuva', start: 4.6, end: 5.4 }] },
];
const ANSWER = 'Vá de Salvador. Dez das suas onze filiais voam direto para lá, o Pelourinho Hall comporta 30 pessoas a R$ 420 por pessoa e agosto tem média de 25 °C com chuva leve. Recife é a segunda opção se preferirem mais voos.';
const TOOL_NAME = { think: 'Pensando', search: 'Busca', read: 'Leitura', write: 'Escrita' };

const laneEnd = (l) => l.steps.at(-1)?.end ?? 0;
const fmt = (s) => `${s.toFixed(1)}s`.replace('.', ',');
const clamp01 = (n) => clamp(n, 0, 1);

export default function mount(stage) {
  ensureStyle('ai-agent-lanes', `
  .${NS}root{--lw:84px;width:100%;max-width:672px;margin:auto;min-width:0;box-sizing:border-box;border-radius:16px;background:#fff;box-shadow:0 0 0 1px rgba(14,34,54,.1);color:${PALETTE.ink}}
  @container (min-width:480px){.${NS}root{--lw:112px}.${NS}legend{display:flex!important}}
  .${NS}head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 16px;border-bottom:1px solid ${PALETTE.ice100}}
  .${NS}head>div{min-width:0}.${NS}head p{margin:0;font-size:12px;color:${PALETTE.mut}}.${NS}head h3{margin:2px 0 0;font-size:14px;font-weight:600;line-height:1.35}
  .${NS}play{flex:none;width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:10px;background:#fff;box-shadow:0 0 0 1px rgba(14,34,54,.15);color:${PALETTE.ink};cursor:pointer}
  .${NS}play:hover{background:${PALETTE.ice50}}.${NS}play svg{width:15px;height:15px}
  .${NS}play:focus-visible,.${NS}lab:focus-visible,.${NS}step:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
  .${NS}body{padding:16px 16px 0}.${NS}row{display:flex}
  .${NS}labels{list-style:none;margin:0;padding:0;width:var(--lw);flex:none}.${NS}labels li{height:${LANE_H}px}
  .${NS}lab{display:flex;align-items:center;gap:6px;height:32px;max-width:100%;margin-left:-6px;padding:0 6px;border:0;border-radius:6px;background:transparent;font:12px/1 inherit;font-family:inherit;color:${PALETTE.mut};cursor:pointer;text-align:left;transition:background-color .15s,color .15s,opacity .15s}
  .${NS}lab:hover{color:${PALETTE.ink}}.${NS}lab.on{background:${PALETTE.ice100};color:${PALETTE.ink};font-weight:600}.${NS}lab.idle{opacity:.5}
  .${NS}lab span.t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .${NS}ind{position:relative;width:14px;height:14px;flex:none;display:grid;place-items:center}
  .${NS}ind i{width:8px;height:8px;border-radius:50%;box-shadow:inset 0 0 0 1.5px ${PALETTE.ice400}}.${NS}ind i.lead{background:${PALETTE.ice900};box-shadow:none}
  .${NS}ind b{width:14px;height:14px;display:grid;place-items:center;border-radius:50%;background:${PALETTE.ice600};color:#fff;animation:${NS}pop .25s cubic-bezier(.23,1,.32,1)}.${NS}ind b svg{width:10px;height:10px;stroke-width:3}
  @keyframes ${NS}pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
  .${NS}area{position:relative;flex:1;min-width:0}
  .${NS}lane{position:relative;height:${LANE_H}px;border-bottom:1px dashed ${PALETTE.ice100}}.${NS}lane:last-of-type{border-bottom:0}
  .${NS}step{position:absolute;top:50%;height:16px;transform:translateY(-50%);padding:0 1px;border:0;background:transparent;border-radius:4px;cursor:pointer;display:none}
  .${NS}step:before{content:"";position:absolute;inset:-10px 0}
  .${NS}step span{display:block;height:100%;border-radius:3px}
  .${NS}t-think span{background:repeating-linear-gradient(135deg,rgba(74,149,210,.4) 0 2px,transparent 2px 5px);box-shadow:inset 0 0 0 1px ${PALETTE.ice400}}
  .${NS}t-search span{background:${PALETTE.ice500}}.${NS}t-read span{background:${PALETTE.ice300}}.${NS}t-write span{background:${PALETTE.ice900}}
  .${NS}head-line{position:absolute;top:0;bottom:0;width:1px;background:rgba(14,34,54,.7);pointer-events:none}
  .${NS}cn{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
  .${NS}tip{position:absolute;z-index:20;width:208px;max-width:calc(100vw - 48px);box-sizing:border-box;transform:translateY(-100%);padding:8px 12px;border-radius:8px;background:${PALETTE.ice900};color:${PALETTE.ice200};font-size:12px;line-height:1.35;box-shadow:0 8px 20px -8px rgba(14,34,54,.5);pointer-events:none;animation:${NS}tip .14s cubic-bezier(.23,1,.32,1)}
  .${NS}tip p{margin:0}.${NS}tip .m{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:${PALETTE.ice300}}.${NS}tip .m span:last-child{font-family:ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
  .${NS}tip .l{margin-top:2px;font-weight:600;color:#fff}.${NS}tip .r{margin-top:4px;color:${PALETTE.ice300}}
  @keyframes ${NS}tip{from{opacity:0;margin-top:3px}to{opacity:1;margin-top:0}}
  .${NS}scrub{position:relative;flex:1;min-width:0;padding:4px 0 12px}
  .${NS}ticks{position:relative;height:16px;font:10px ui-monospace,Menlo,monospace;color:${PALETTE.ice400};font-variant-numeric:tabular-nums}
  .${NS}ticks span{position:absolute;transform:translateX(-50%)}.${NS}ticks span:first-child{transform:none}
  .${NS}knob{position:absolute;top:-3px;width:7px;height:7px;margin-left:-3.5px;border-radius:50%;background:${PALETTE.ice900};pointer-events:none}
  .${NS}scrub input{position:absolute;left:0;right:0;top:-12px;width:100%;height:36px;margin:0;opacity:0;cursor:ew-resize;touch-action:pan-y}
  .${NS}scrub:focus-within .${NS}knob{box-shadow:0 0 0 3px rgba(74,149,210,.5)}
  .${NS}tr{min-height:148px;padding:12px 16px;border-top:1px solid ${PALETTE.ice100}}
  .${NS}trh{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
  .${NS}trh p{margin:0;font-size:12px;color:${PALETTE.mut}}.${NS}trh p b{font-weight:400;color:${PALETTE.ink}}
  .${NS}legend{display:none;align-items:center;gap:12px;margin:0;padding:0;list-style:none;font-size:11px;color:${PALETTE.mut}}
  .${NS}legend li{display:flex;align-items:center;gap:4px}.${NS}legend i{width:12px;height:8px;border-radius:2px;display:block}
  .${NS}tr ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .${NS}tr li{display:flex;align-items:baseline;gap:8px;font-size:12px}
  .${NS}d{flex:none;width:6px;height:6px;border-radius:50%;background:${PALETTE.ice200};transform:translateY(-1px)}.${NS}d.run{background:${PALETTE.ice600};animation:${NS}pulse 1s ease-in-out infinite}
  @keyframes ${NS}pulse{50%{opacity:.35}}
  .${NS}tn{flex:none;width:58px;color:${PALETTE.ice400}}.${NS}tx{min-width:0;color:${PALETTE.ink}}.${NS}tx em{font-style:normal;color:${PALETTE.mut}}
  .${NS}empty{color:${PALETTE.ice400}}
  .${NS}ans{margin:0;font-size:13px;line-height:1.6}.${NS}cur{display:inline-block;width:6px;height:12px;margin-left:2px;transform:translateY(2px);border-radius:2px;background:${PALETTE.ice900}}
  @media (prefers-reduced-motion:reduce){.${NS}ind b,.${NS}tip,.${NS}d.run{animation:none}.${NS}lab{transition:none}}
  `);
  stage.style.containerType = 'inline-size';

  const total = Math.max(...LANES.flatMap((l) => l.steps.map((s) => s.end)));
  const lead = LANES[0], subs = LANES.slice(1);
  let now = 0, playing = false, selected = lead.id, hover = null, stopLoop = null, areaW = 0, startTimer = 0;
  const xPct = (t) => `${(t / total) * 100}%`;

  const status = h('p', { 'aria-live': 'off' });
  const playBtn = h('button', { type: 'button', class: NS + 'play', onclick: toggle });
  const labelEls = LANES.map((l, i) => {
    const ind = h('span', { class: NS + 'ind' });
    const b = h('button', { type: 'button', class: NS + 'lab', 'aria-pressed': 'false', onclick: () => select(l.id) }, ind, h('span', { class: 't' }, l.name));
    return { b, ind, lane: l, lead: i === 0, fin: null };
  });
  const cn = svg('svg', { class: NS + 'cn', 'aria-hidden': 'true' });
  const head = h('div', { class: NS + 'head-line', 'aria-hidden': 'true' });
  const stepEls = [];
  const rows = LANES.map((l, li) => h('div', { class: NS + 'lane' }, l.steps.map((s, si) => {
    const fill = h('span');
    const b = h('button', { type: 'button', class: `${NS}step ${NS}t-${s.tool}`, 'aria-label': `${TOOL_NAME[s.tool]}: ${s.label}`,
      style: `left:${xPct(s.start)};width:${xPct(s.end - s.start)}`,
      onclick: () => select(l.id), onfocus: () => setHover(li, si), onblur: () => setHover(null), onpointerenter: () => setHover(li, si), onpointerleave: () => setHover(null) }, fill);
    stepEls.push({ b, fill, s, li, si, shown: false });
    return b;
  })));
  const area = h('div', { class: NS + 'area' }, cn, rows, head);
  const knob = h('span', { class: NS + 'knob', 'aria-hidden': 'true' });
  const range = h('input', { type: 'range', 'aria-label': 'Tempo da execução', min: 0, max: total, step: 0.1, value: 0,
    oninput: (e) => { pause(); now = Number(e.target.value); render(); } });
  const scrub = h('div', { class: NS + 'scrub' }, h('div', { class: NS + 'ticks', 'aria-hidden': 'true' },
    Array.from({ length: Math.floor(total / TICK) + 1 }, (_, i) => h('span', { style: `left:${xPct(i * TICK)}` }, `${i * TICK}s`))), knob, range);
  const tr = h('div', { class: NS + 'tr' });
  const root = h('div', { class: NS + 'root' },
    h('header', { class: NS + 'head' }, h('div', status, h('h3', TASK)), playBtn),
    h('div', { class: NS + 'body' }, h('div', { class: NS + 'row' }, h('ul', { class: NS + 'labels' }, labelEls.map((e) => h('li', e.b))), area), h('div', { class: NS + 'row' }, h('span', { class: NS + 'labels' }), scrub)),
    tr);
  stage.append(root);

  // Conectores do líder para cada sub-agente (e de volta quando reportam)
  const cnPaths = [];
  let leadLine = null;
  function buildConnectors() {
    cn.replaceChildren(); cnPaths.length = 0;
    if (!areaW) return;
    const xAt = (t) => (t / total) * areaW, yAt = (i) => i * LANE_H + LANE_H / 2;
    const fork = lead.steps[0].end, join = lead.steps.at(-1).start, top = yAt(0), fx = xAt(fork), jx = xAt(join);
    leadLine = svg('line', { x1: fx, y1: top, y2: top, stroke: PALETTE.ice200, 'stroke-dasharray': '2 3' }); cn.append(leadLine);
    subs.forEach((l, i) => {
      const y = yAt(i + 1), sx = xAt(l.steps[0].start), ex = xAt(laneEnd(l));
      const mk = (d) => svg('path', { d, pathLength: 1, fill: 'none', stroke: PALETTE.ice300, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 });
      const out = mk(`M ${fx} ${top} C ${fx + 6} ${top} ${fx + 2} ${y} ${sx} ${y}`), back = mk(`M ${ex} ${y} C ${jx - 18} ${y} ${jx - 12} ${top} ${jx} ${top}`);
      cn.append(out, back); cnPaths.push({ out, back });
    });
  }
  const stopResize = onResize(area, ({ width }) => { areaW = width; buildConnectors(); render(); });

  let tip = null;
  function setHover(li, si) {
    hover = li == null ? null : { li, si };
    tip?.remove(); tip = null;
    if (hover) { tip = h('div', { class: NS + 'tip' }); area.append(tip); paintTip(); }
  }
  function paintTip() {
    if (!tip || !hover) return;
    const s = LANES[hover.li].steps[hover.si];
    tip.replaceChildren(h('p', { class: 'm' }, h('span', TOOL_NAME[s.tool]), h('span', fmt(Math.min(now, s.end) - s.start))), h('p', { class: 'l' }, s.label),
      s.result && h('p', { class: 'r' }, now >= s.end ? s.result : 'Aguardando resultados…'));
    // Ancora pelo lado que sobra espaço e mantém a dica dentro do cartão
    const w = tip.offsetWidth, mid = (s.start + s.end) / 2 / total, lw = labelEls[0].b.parentElement.offsetWidth;
    const px = (t) => (t / total) * areaW;
    const left = mid > 0.6 ? px(s.end) - w : px(s.start);
    tip.style.left = clamp(left, -lw, Math.max(-lw, areaW - w)) + 'px'; tip.style.top = hover.li * LANE_H + 4 + 'px';
  }

  function select(id) { selected = id; sigTr = ''; render(); }
  function pause() { playing = false; stopLoop?.(); stopLoop = null; }
  function play() {
    playing = true; stopLoop?.();
    stopLoop = loop((dt) => { now = Math.min(total, now + dt); if (now >= total) pause(); render(); });
    render();
  }
  function toggle() { if (now >= total) { now = 0; play(); } else if (playing) { pause(); render(); } else play(); }

  const running = () => subs.filter((l) => now >= (l.steps[0]?.start ?? 0) && now < laneEnd(l)).length;
  let sigTr = '', lastBtn = '';
  function render() {
    const done = now >= total, run = running();
    status.textContent = done ? `Concluído em ${fmt(total)}` : run > 0 ? `${run} ${run === 1 ? 'agente trabalhando' : 'agentes trabalhando'} · ${fmt(now)}` : now === 0 ? 'Pronto' : `Agente líder · ${fmt(now)}`;
    const bs = done ? 'replay' : playing ? 'pause' : 'play';
    if (bs !== lastBtn) { playBtn.replaceChildren(ICON[bs]()); playBtn.setAttribute('aria-label', done ? 'Repetir execução' : playing ? 'Pausar' : 'Reproduzir'); lastBtn = bs; }
    // Labels
    for (const e of labelEls) {
      const fin = !e.lead && now >= laneEnd(e.lane);
      e.b.classList.toggle('on', selected === e.lane.id); e.b.setAttribute('aria-pressed', String(selected === e.lane.id));
      e.b.classList.toggle('idle', now < (e.lane.steps[0]?.start ?? 0));
      if (fin !== e.fin) { e.fin = fin; e.ind.replaceChildren(fin ? h('b', ICON.check()) : h('i', { class: e.lead ? 'lead' : '' })); }
    }
    // Barras
    for (const e of stepEls) {
      const p = clamp01((now - e.s.start) / (e.s.end - e.s.start));
      const show = p > 0; if (show !== e.shown) { e.b.style.display = show ? 'block' : 'none'; e.shown = show; }
      if (show) e.fill.style.width = `${p * 100}%`;
    }
    const pxAt = (t) => (t / total) * areaW;
    head.style.left = xPct(now); knob.style.left = xPct(now); range.value = now;
    range.setAttribute('aria-valuetext', fmt(now));
    if (leadLine) {
      const fork = lead.steps[0].end, join = lead.steps.at(-1).start;
      leadLine.setAttribute('x2', pxAt(Math.min(Math.max(now, fork), join)));
      const reach = (a, b) => clamp01((now - a) / (b - a));
      cnPaths.forEach((c) => { c.out.setAttribute('stroke-dashoffset', 1 - reach(fork, fork + 0.2)); c.back.setAttribute('stroke-dashoffset', 1 - reach(join - 0.35, join)); });
    }
    paintTip(); renderTranscript();
  }

  function renderTranscript() {
    const lane = LANES.find((l) => l.id === selected) || lead, isLead = lane === lead;
    const steps = lane.steps.filter((s) => now >= s.start), writing = isLead ? lane.steps.at(-1) : undefined;
    const written = writing && now >= writing.start ? ANSWER.slice(0, Math.round(ANSWER.length * clamp01((now - writing.start) / (writing.end - writing.start)))) : '';
    // Só refaz o DOM quando o texto visível mudou
    const sig = [lane.id, written.length, steps.map((s) => (now >= s.end ? 1 : 0)).join(''), steps.length, now >= laneEnd(lane) ? 1 : 0].join('|');
    if (sig === sigTr) return; sigTr = sig;
    const fin = now >= laneEnd(lane);
    const legend = h('ul', { class: NS + 'legend', 'aria-hidden': 'true' }, ['search', 'read', 'think', 'write'].map((k) => h('li', h('i', { class: `${NS}t-${k}`, style: legendStyle(k) }), TOOL_NAME[k])));
    tr.replaceChildren(h('div', { class: NS + 'trh' }, h('p', lane.name, lane.summary && fin && h('b', ` · ${lane.summary}`)), legend),
      written ? h('p', { class: NS + 'ans' }, written, now < writing.end && h('span', { class: NS + 'cur' }))
        : h('ol', steps.length ? steps.map((s) => { const f = now >= s.end;
          return h('li', h('span', { class: NS + 'd' + (f ? '' : ' run') }), h('span', { class: NS + 'tn' }, TOOL_NAME[s.tool]), h('span', { class: NS + 'tx' }, s.label, f && s.result && h('em', ` → ${s.result}`))); })
          : [h('li', { class: NS + 'empty' }, 'Ainda não começou')]));
  }
  const legendStyle = (k) => ({ search: `background:${PALETTE.ice500}`, read: `background:${PALETTE.ice300}`, write: `background:${PALETTE.ice900}`, think: `background:repeating-linear-gradient(135deg,rgba(74,149,210,.45) 0 2px,transparent 2px 4px);box-shadow:inset 0 0 0 1px ${PALETTE.ice400}` })[k];

  // Sem movimento: já mostra a execução concluída; senão começa sozinha após meio segundo
  if (reduced()) now = total; else startTimer = setTimeout(play, 500);
  render();
  return () => { clearTimeout(startTimer); stopLoop?.(); stopResize(); };
}
