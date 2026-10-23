// AI State Loading — porte em JS puro do componente "AI State Loading" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Progresso de um agente em etapas, com log ao vivo, tempo decorrido e resumo ao concluir. A execução é simulada e pausa fora da tela.
import { h, svg, ensureStyle, disposer, reduced, PALETTE } from '../kit.js';

const STEPS = [
  { id: 'busca', label: 'Buscando vendas do mês', detail: ['consulta: pedidos pagos de outubro', 'lendo 128 pedidos', 'agrupando por cliente', 'conferindo devoluções'] },
  { id: 'ler', label: 'Lendo 4 relatórios', detail: ['extraindo totais por canal', 'descartando 1 relatório repetido', 'ordenando por relevância'] },
  { id: 'comparar', label: 'Comparando com setembro', detail: ['ticket médio: R$ 214 contra R$ 187', 'recompra subiu 9 pontos', 'checando sazonalidade'] },
  { id: 'escrever', label: 'Escrevendo o resumo', detail: ['montando 3 seções'] },
];
const TICK = 750, REST = 3200, LINE_H = 24, VISIBLE = 3;
const fmt = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
const fmtStep = (ms) => (ms < 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`);

const CSS = `
.kk-ai-loading-root{min-width:0;box-sizing:border-box;width:100%;max-width:360px;margin:0 auto;display:flex;flex-direction:column;gap:12px;color:var(--ink,#0e2236);font-family:inherit}
.kk-ai-loading-head{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;min-height:36px;padding:4px 0;border:0;border-radius:8px;background:none;font:inherit;font-size:14px;font-weight:600;color:${PALETTE.ink};text-align:left;cursor:pointer}
.kk-ai-loading-head:focus-visible,.kk-ai-loading-btns button:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-ai-loading-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-loading-sec{font-weight:400;color:#7d97b3;font-variant-numeric:tabular-nums;white-space:nowrap}
.kk-ai-loading-car{margin-left:auto;width:16px;height:16px;flex:none;color:#7d97b3;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.kk-ai-loading-car.open{transform:rotate(180deg)}
.kk-ai-loading-list{list-style:none;margin:0;padding:0;overflow:hidden;transition:max-height .3s cubic-bezier(.23,1,.32,1),opacity .25s}
.kk-ai-loading-row{position:relative;display:flex;gap:12px;padding-top:14px}
.kk-ai-loading-rail{position:absolute;top:34px;bottom:-10px;left:7.5px;width:1px;background:${PALETTE.line};overflow:hidden}
.kk-ai-loading-rail i{display:block;height:100%;background:${PALETTE.ice500};transform:scaleY(0);transform-origin:top;transition:transform .5s cubic-bezier(.23,1,.32,1)}
.kk-ai-loading-rail i.on{transform:scaleY(1)}
.kk-ai-loading-ico{position:relative;width:16px;height:16px;flex:none;display:grid;place-items:center;animation:kk-ai-loading-pop .18s both}
.kk-ai-loading-ico svg{width:14px;height:14px}
.kk-ai-loading-dot{width:6px;height:6px;border-radius:50%;background:${PALETTE.ice200}}
.kk-ai-loading-spin{animation:kk-ai-loading-spin .8s linear infinite}
.kk-ai-loading-chk path{stroke-dasharray:14;stroke-dashoffset:14;animation:kk-ai-loading-draw .3s .05s cubic-bezier(.23,1,.32,1) forwards}
@keyframes kk-ai-loading-spin{to{transform:rotate(360deg)}}
@keyframes kk-ai-loading-draw{to{stroke-dashoffset:0}}
@keyframes kk-ai-loading-pop{from{opacity:0;filter:blur(2px)}}
@keyframes kk-ai-loading-wave{50%{opacity:.3}}
.kk-ai-loading-body{margin-top:-2px;min-width:0;flex:1}
.kk-ai-loading-line{display:flex;align-items:baseline;gap:8px}
.kk-ai-loading-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;transition:color .2s}
.kk-ai-loading-row.pending .kk-ai-loading-label{color:#8aa5c0}.kk-ai-loading-row.running .kk-ai-loading-label{color:${PALETTE.ink}}
.kk-ai-loading-row.done .kk-ai-loading-label{color:${PALETTE.mut}}.kk-ai-loading-row.error .kk-ai-loading-label{color:${PALETTE.bad}}
.kk-ai-loading-w{display:inline-block;white-space:pre;animation:kk-ai-loading-wave 1.6s ease-in-out infinite both}
.kk-ai-loading-time{margin-left:auto;font-size:12px;color:#8aa5c0;font-variant-numeric:tabular-nums;flex:none;animation:kk-ai-loading-pop .2s both}
.kk-ai-loading-log{position:relative;margin-top:4px;overflow:hidden;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;transition:height .24s cubic-bezier(.23,1,.32,1)}
.kk-ai-loading-log.fade{-webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.25),#000 70%);mask-image:linear-gradient(to bottom,rgba(0,0,0,.25),#000 70%)}
.kk-ai-loading-log>div{transition:transform .3s cubic-bezier(.23,1,.32,1)}
.kk-ai-loading-log p{margin:0;height:${LINE_H}px;display:flex;align-items:center;gap:8px;color:${PALETTE.mut};animation:kk-ai-loading-pop .2s both}
.kk-ai-loading-log p b{width:16px;text-align:right;font-weight:400;color:${PALETTE.ice300};font-variant-numeric:tabular-nums}
.kk-ai-loading-log p span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-ai-loading-btns{display:flex;gap:8px;flex-wrap:wrap;padding-top:4px}
.kk-ai-loading-btns button{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.line};background:#fff;font:inherit;font-size:12px;font-weight:600;color:${PALETTE.ink};cursor:pointer}
.kk-ai-loading-btns button:hover{background:${PALETTE.ice100}}
@media (prefers-reduced-motion:reduce){.kk-ai-loading-w,.kk-ai-loading-spin{animation:none}.kk-ai-loading-ico,.kk-ai-loading-log p,.kk-ai-loading-time{animation:none}.kk-ai-loading-chk path{animation:none;stroke-dashoffset:0}.kk-ai-loading-rail i,.kk-ai-loading-log>div,.kk-ai-loading-list{transition:none}}
`;

export default function mount(stage) {
  ensureStyle('ai-loading', CSS);
  const dis = disposer();
  let pos = { step: 0, line: 0 }, failAt = -1, open = true, onScreen = true, seconds = 0, t0 = 0, finished = false, timer = 0, paused = false;
  const starts = {}, times = {};
  const listId = 'kk-al-' + Math.random().toString(36).slice(2, 7);

  const title = h('output', { class: 'kk-ai-loading-title' });
  const sec = h('span', { class: 'kk-ai-loading-sec' });
  const sum = h('span', { class: 'kk-ai-loading-sec' });
  const car = svg('svg', { class: 'kk-ai-loading-car', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: 'M6 9l6 6 6-6' }));
  const head = h('button', { type: 'button', class: 'kk-ai-loading-head', 'aria-controls': listId, 'aria-expanded': 'true' }, title, sec, sum, car);
  const list = h('ol', { class: 'kk-ai-loading-list', id: listId });
  const btnRestart = h('button', { type: 'button' }, 'Repetir do início');
  const btnFail = h('button', { type: 'button' }, 'Simular falha');
  const btnPause = h('button', { type: 'button', 'aria-pressed': 'false' }, 'Pausar');
  const root = h('div', { class: 'kk-ai-loading-root' }, head, list, h('div', { class: 'kk-ai-loading-btns' }, btnRestart, btnFail, btnPause));
  stage.append(root);

  const statusOf = (i) => {
    if (failAt >= 0) return i < failAt ? 'done' : i === failAt ? 'error' : 'pending';
    return i < pos.step ? 'done' : i === pos.step ? 'running' : 'pending';
  };
  const stepsNow = () => STEPS.map((s, i) => ({ ...s, status: statusOf(i), detail: statusOf(i) === 'running' ? s.detail.slice(0, pos.line) : s.detail }));

  // Marca quando cada etapa começa e termina, para mostrar o tempo ao lado do nome.
  function track(steps) {
    const now = Date.now();
    for (const s of steps) {
      if (s.status === 'pending') { delete starts[s.id]; delete times[s.id]; continue; }
      starts[s.id] ??= now;
      if ((s.status === 'done' || s.status === 'error') && times[s.id] === undefined) times[s.id] = now - starts[s.id];
    }
  }
  const icoFor = (st) => {
    if (st === 'pending') return h('i', { class: 'kk-ai-loading-dot' });
    if (st === 'running') return svg('svg', { class: 'kk-ai-loading-spin', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('circle', { cx: 8, cy: 8, r: 6.25, stroke: PALETTE.ice200, 'stroke-width': 1.5 }), svg('path', { d: 'M8 1.75a6.25 6.25 0 0 1 6.25 6.25', stroke: PALETTE.ice700, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
    if (st === 'done') return svg('svg', { class: 'kk-ai-loading-chk', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: 'M3.5 8.5 6.5 11.5 12.5 4.5', stroke: PALETTE.ice700, 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: 'M4.5 4.5l7 7m0-7-7 7', stroke: PALETTE.bad, 'stroke-width': 1.75, 'stroke-linecap': 'round' }));
  };
  const rows = {}; // evita recriar a linha toda a cada tick: só muda o que mudou

  function paint() {
    const steps = stepsNow(); track(steps);
    const running = steps.find((s) => s.status === 'running'), failed = steps.find((s) => s.status === 'error'), done = steps.every((s) => s.status === 'done');
    title.textContent = failed ? `Parou em: ${failed.label}` : done ? `Concluído em ${fmt(seconds)}` : running ? running.label : 'Preparando';
    sec.textContent = running ? fmt(seconds) : ''; sum.textContent = done ? `· ${steps.length} etapas` : '';
    car.classList.toggle('open', open); head.setAttribute('aria-expanded', String(open));
    list.style.maxHeight = open ? '600px' : '0'; list.style.opacity = open ? '1' : '0'; list.inert = !open;
    steps.forEach((s, i) => {
      let r = rows[s.id];
      if (!r) {
        r = rows[s.id] = { st: '', li: h('li', { class: 'kk-ai-loading-row' }), ico: h('span', { class: 'kk-ai-loading-ico' }), rail: h('i'), label: h('p', { class: 'kk-ai-loading-label' }), time: null, logN: -1 };
        r.logWrap = h('div', { class: 'kk-ai-loading-log', 'aria-hidden': 'true' }); r.logIn = h('div'); r.logWrap.append(r.logIn); r.logWrap.hidden = true;
        r.line = h('div', { class: 'kk-ai-loading-line' }, r.label);
        r.li.append(...(i < STEPS.length - 1 ? [h('span', { class: 'kk-ai-loading-rail', 'aria-hidden': 'true' }, r.rail)] : []), r.ico, h('div', { class: 'kk-ai-loading-body' }, r.line, r.logWrap));
        list.append(r.li);
      }
      if (r.st !== s.status) {
        r.st = s.status; r.li.className = 'kk-ai-loading-row ' + s.status; r.ico.replaceChildren(icoFor(s.status)); r.rail.classList.toggle('on', s.status === 'done');
        // Etapa em andamento: letras com onda suave de brilho (sem onda se o usuário reduziu movimento).
        r.label.replaceChildren(...(s.status === 'running' && !reduced() ? [h('span', { class: 'sr-only', style: 'position:absolute;left:-9999px' }, s.label), ...Array.from(s.label).map((c, k) => h('span', { class: 'kk-ai-loading-w', 'aria-hidden': 'true', style: `animation-delay:${k * 0.05}s` }, c))] : [s.label]));
      }
      const t = times[s.id];
      if (t !== undefined && !r.time) { r.time = h('span', { class: 'kk-ai-loading-time' }, fmtStep(t)); r.line.append(r.time); }
      if (t === undefined && r.time) { r.time.remove(); r.time = null; }
      const lines = s.status === 'running' ? s.detail : [];
      r.logWrap.hidden = !lines.length;
      if (r.logN !== lines.length) {
        r.logN = lines.length;
        r.logIn.replaceChildren(...lines.map((l, k) => h('p', h('b', k + 1), h('span', l))));
        r.logWrap.style.height = LINE_H * Math.min(lines.length, VISIBLE) + 'px';
        r.logWrap.classList.toggle('fade', lines.length > VISIBLE - 1);
        r.logIn.style.transform = `translateY(${-Math.max(0, lines.length - VISIBLE) * LINE_H}px)`;
      }
    });
    // Cronômetro: roda só enquanto uma etapa está ativa; reinicia se tudo foi concluído antes.
    const active = !!running;
    if (active && !timer) { if (finished) { finished = false; t0 = 0; } t0 ||= Date.now(); timer = setInterval(() => { seconds = Math.floor((Date.now() - t0) / 1000); paint(); }, 500); }
    if (!active && timer) { clearInterval(timer); timer = 0; }
    if (done && !finished) { finished = true; open = false; paint(); }
  }

  head.addEventListener('click', () => { open = !open; paint(); });
  function reset() { pos = { step: 0, line: 0 }; failAt = -1; seconds = 0; t0 = 0; finished = false; open = true; for (const k in starts) delete starts[k]; for (const k in times) delete times[k]; paint(); schedule(); }
  btnRestart.addEventListener('click', reset);
  btnFail.addEventListener('click', () => { if (failAt < 0 && pos.step < STEPS.length) { failAt = pos.step; paint(); schedule(); } });
  btnPause.addEventListener('click', () => { paused = !paused; btnPause.setAttribute('aria-pressed', String(paused)); btnPause.textContent = paused ? 'Continuar' : 'Pausar'; schedule(); });

  // Avança uma linha de log por tick; no fim, descansa e recomeça. Pausa fora da tela, com a aba oculta ou pelo botão.
  let tick = 0;
  function schedule() {
    clearTimeout(tick);
    if (!onScreen || paused || document.hidden) return;
    if (failAt >= 0) { tick = setTimeout(reset, REST); return; }
    const finishedRun = pos.step >= STEPS.length;
    tick = setTimeout(() => {
      if (finishedRun) { reset(); return; }
      const n = STEPS[pos.step].detail.length;
      pos = pos.line < n ? { step: pos.step, line: pos.line + 1 } : { step: pos.step + 1, line: 0 };
      paint(); schedule();
    }, finishedRun ? REST : TICK);
  }
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; schedule(); });
  io.observe(root);
  const vis = () => schedule(); document.addEventListener('visibilitychange', vis);
  dis(() => { io.disconnect(); document.removeEventListener('visibilitychange', vis); clearTimeout(tick); clearInterval(timer); });

  paint(); schedule();
  return () => { dis.run(); stage.replaceChildren(); };
}
