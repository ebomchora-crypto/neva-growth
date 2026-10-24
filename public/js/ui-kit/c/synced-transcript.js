// Synced Transcript — porte em JS puro do componente "Synced Transcript" .
import { h, svg, ensureStyle, loop, clamp, reduced, disposer } from '../kit.js';

const SPEEDS = [1, 1.5, 2];
const TITLE = 'Reunião de vendas · Clínica Aurora';

// Cada trecho é cronometrado pelo nº de palavras, com um respiro entre falantes.
function timed(lines) {
  const out = []; let t = 0.6;
  for (const [speaker, text] of lines) {
    const end = t + text.split(/\s+/).length / 2.7;
    out.push({ speaker, start: t, end, text }); t = end + 0.7;
  }
  return out;
}
const SEGMENTS = timed([
  ['Carla', 'Obrigada por reservar esse horário. Hoje quero entender como vocês acompanham os clientes depois do primeiro contato.'],
  ['Rafael', 'Hoje é tudo em planilha. Quando a equipe cresceu, começamos a perder retornos e ninguém sabe quem ficou de ligar de volta.'],
  ['Carla', 'E quantos clientes novos chegam por semana?'],
  ['Rafael', 'Uns quarenta, mais ou menos. Metade vem do Instagram e o resto por indicação. O problema é responder rápido, porque quem demora perde a venda.'],
  ['Carla', 'Então o primeiro passo é um funil simples, com lembrete automático para cada etapa.'],
  ['Rafael', 'Perfeito. Se a gente conseguir responder em até dez minutos, já fecho o plano anual hoje.'],
]);

// Reparte o tempo do trecho entre as palavras pelo tamanho, para palavras longas durarem mais.
function splitWords(segments) {
  let index = 0;
  return segments.map((seg) => {
    const parts = seg.text.split(/\s+/).filter(Boolean);
    const total = parts.reduce((s, w) => s + w.length + 1, 0);
    let t = seg.start;
    return parts.map((text) => {
      const w = { text, start: t, index: index++ };
      t += ((text.length + 1) / total) * (seg.end - seg.start);
      return w;
    });
  });
}
const fmt = (sec) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const ic = (d, fill) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: fill ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg('path', { d }));

export default function mount(stage, ctx) {
  ensureStyle('synced-transcript', `
.kk-synced-transcript{width:100%;max-width:448px;margin:0 auto;box-sizing:border-box;border:1px solid var(--line);border-radius:22px;background:#fff;color:var(--ink);user-select:none;-webkit-user-select:none;overflow:hidden}
.kk-synced-transcript svg{width:16px;height:16px;display:block}
.kk-synced-transcript-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 0}
.kk-synced-transcript-top small{display:block;font-size:12px;color:var(--mut)}
.kk-synced-transcript-top b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-synced-transcript-speed{flex:none;min-width:44px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);font:600 13px/1 inherit;font-family:inherit;font-variant-numeric:tabular-nums;cursor:pointer;transition:background .15s}
.kk-synced-transcript-speed:hover{background:var(--ice-100)}
.kk-synced-transcript button:focus-visible,.kk-synced-transcript-scroll:focus-visible,.kk-synced-transcript-seek:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-synced-transcript-box{position:relative}
.kk-synced-transcript-scroll{height:288px;overflow-y:auto;padding:24px 18px;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 24px,calc(100% - 24px),transparent);mask-image:linear-gradient(to bottom,transparent,#000 24px,calc(100% - 24px),transparent);overscroll-behavior:contain}
.kk-synced-transcript-content{position:relative;isolation:isolate}
.kk-synced-transcript-mark{position:absolute;left:0;top:0;z-index:-1;border-radius:6px;background:var(--ice-100);opacity:0;pointer-events:none}
.kk-synced-transcript-seg+.kk-synced-transcript-seg{margin-top:20px}
.kk-synced-transcript-who{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px}
.kk-synced-transcript-av{width:22px;height:22px;border-radius:50%;background:var(--ice-100);color:var(--ice-700);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.kk-synced-transcript-who b{font-weight:600}
.kk-synced-transcript-ts{min-height:28px;padding:0 6px;border:0;border-radius:6px;background:none;color:var(--mut);font:inherit;font-size:12px;font-variant-numeric:tabular-nums;cursor:pointer}
.kk-synced-transcript-ts:hover{color:var(--ink)}
.kk-synced-transcript-text{display:block;width:100%;padding:0;border:0;background:none;text-align:left;font:inherit;font-size:15px;line-height:28px;cursor:pointer;color:inherit}
.kk-synced-transcript-text span{color:var(--ice-300);transition:color .15s}
.kk-synced-transcript-text span.on{color:var(--ink)}
.kk-synced-transcript-back{position:absolute;left:50%;bottom:12px;display:flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border:0;border-radius:99px;background:var(--ink);color:#fff;font:600 12px/1 inherit;font-family:inherit;box-shadow:0 4px 14px rgba(14,34,54,.25);cursor:pointer;transform:translate(-50%,8px);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s cubic-bezier(.23,1,.32,1)}
.kk-synced-transcript-back.show{transform:translate(-50%,0);opacity:1;pointer-events:auto}
.kk-synced-transcript-bar{display:flex;align-items:center;gap:10px;padding:10px 18px;border-top:1px solid var(--line)}
.kk-synced-transcript-play{flex:none;width:40px;height:40px;border:0;border-radius:50%;background:var(--ice-700);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
.kk-synced-transcript-play:hover{background:var(--ice-800)}
.kk-synced-transcript-bar>span{flex:none;width:36px;font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums}
.kk-synced-transcript-bar>span:last-child{text-align:right}
.kk-synced-transcript-seek{position:relative;flex:1;min-width:0;height:36px;display:flex;align-items:center;cursor:pointer;touch-action:none;border-radius:6px}
.kk-synced-transcript-track{width:100%;height:4px;border-radius:99px;background:var(--ice-200);overflow:hidden}
.kk-synced-transcript-fill{width:100%;height:100%;border-radius:99px;background:var(--ice-600);transform-origin:left;transform:scaleX(0)}
@media (max-width:360px){.kk-synced-transcript-bar{gap:6px;padding:10px 12px}.kk-synced-transcript-bar>span{width:32px}}
`);
  const dispose = disposer();
  const words = splitWords(SEGMENTS), flat = words.flat();
  const duration = Math.ceil(SEGMENTS.at(-1).end + 0.6);
  const rm = reduced();
  let time = 0, playing = false, speedI = 0, following = true, away = null, active = -2, lastTop = null, activeSeg = -1;

  const speedBtn = h('button', { class: 'kk-synced-transcript-speed', type: 'button', onclick: () => { speedI = (speedI + 1) % SPEEDS.length; drawSpeed(); } });
  const mark = h('div', { class: 'kk-synced-transcript-mark', 'aria-hidden': 'true' });
  const content = h('div', { class: 'kk-synced-transcript-content' }, mark);
  const spans = [];
  SEGMENTS.forEach((seg, i) => {
    const textBtn = h('button', { class: 'kk-synced-transcript-text', type: 'button', tabindex: '-1', onclick: (e) => {
      const idx = Number(e.target.closest('[data-index]')?.dataset.index ?? -1);
      // Teclado não tem palavra sob o ponteiro: começa o parágrafo.
      seek(idx >= 0 ? flat[idx].start : seg.start); following = true;
    } });
    words[i].forEach((w) => { const s = h('span', { dataset: { index: w.index } }, w.text, ' '); spans[w.index] = s; textBtn.append(s); });
    content.append(h('div', { class: 'kk-synced-transcript-seg' },
      h('div', { class: 'kk-synced-transcript-who' },
        h('span', { class: 'kk-synced-transcript-av', 'aria-hidden': 'true' }, seg.speaker[0]), h('b', seg.speaker),
        h('button', { class: 'kk-synced-transcript-ts', type: 'button', 'aria-label': `Tocar a partir de ${fmt(seg.start)}`, onclick: () => { seek(seg.start); following = true; } }, fmt(seg.start))),
      textBtn));
  });
  const scroll = h('section', { class: 'kk-synced-transcript-scroll', 'aria-label': 'Transcrição', tabindex: '0' }, content);
  const backIcon = h('span', { style: 'display:flex' });
  const back = h('button', { class: 'kk-synced-transcript-back', type: 'button', tabindex: '-1', onclick: () => { following = true; setAway(null); const el = spans[active]; if (el) scrollTo(el, true); } }, backIcon, 'Voltar ao agora');

  const playBtn = h('button', { class: 'kk-synced-transcript-play', type: 'button', onclick: () => { if (!playing && time >= duration) seek(0); playing = !playing; drawPlay(); } });
  const timeEl = h('span'), fill = h('div', { class: 'kk-synced-transcript-fill' });
  const seekEl = h('div', { class: 'kk-synced-transcript-seek', role: 'slider', tabindex: '0', 'aria-label': 'Posição do áudio', 'aria-valuemin': 0, 'aria-valuemax': duration }, h('div', { class: 'kk-synced-transcript-track' }, fill));
  const root = h('div', { class: 'kk-synced-transcript' },
    h('div', { class: 'kk-synced-transcript-top' }, h('div', { style: 'min-width:0' }, h('small', 'Transcrição'), h('b', TITLE)), speedBtn),
    h('div', { class: 'kk-synced-transcript-box' }, scroll, back),
    h('div', { class: 'kk-synced-transcript-bar' }, playBtn, timeEl, seekEl, h('span', fmt(duration))));
  stage.append(root);

  function drawSpeed() { speedBtn.textContent = `${SPEEDS[speedI]}×`; speedBtn.setAttribute('aria-label', `Velocidade de reprodução ${SPEEDS[speedI]}x`); }
  function drawPlay() {
    playBtn.replaceChildren(ic(playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l13 8-13 8z', true));
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
  }
  function setAway(v) {
    away = v; back.classList.toggle('show', !!v); back.tabIndex = v ? 0 : -1;
    if (v) backIcon.replaceChildren(ic(v === 'up' ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M19 12l-7 7-7-7'));
  }
  const seek = (s) => { time = clamp(s, 0, duration); draw(); };
  function scrollTo(el, smooth) {
    // Mantém a fala a um terço da altura, como letra de música.
    const top = scroll.scrollTop + el.getBoundingClientRect().top - scroll.getBoundingClientRect().top - scroll.clientHeight / 3;
    scroll.scrollTo({ top, behavior: smooth && !rm ? 'smooth' : 'auto' });
  }
  function checkAway() {
    const el = spans[active];
    if (!el || following) return setAway(null);
    const w = el.getBoundingClientRect(), v = scroll.getBoundingClientRect();
    setAway(w.bottom < v.top ? 'up' : w.top > v.bottom ? 'down' : null);
  }
  function draw() {
    let a = -1;
    for (const w of flat) { if (w.start <= time) a = w.index; else break; }
    if (a !== active) {
      active = a;
      spans.forEach((s, i) => s.classList.toggle('on', i <= a));
      const el = spans[a];
      if (!el) { mark.style.opacity = 0; lastTop = null; }
      else {
        const same = lastTop === el.offsetTop;
        mark.style.transition = same && !rm ? 'transform 140ms cubic-bezier(.23,1,.32,1),width 140ms cubic-bezier(.23,1,.32,1),opacity 150ms' : 'opacity 150ms';
        const space = parseFloat(getComputedStyle(el).fontSize) * 0.28; // o espaço final faz parte do span
        mark.style.transform = `translate(${el.offsetLeft - 3}px,${el.offsetTop}px)`;
        mark.style.width = `${el.offsetWidth - space + 6}px`; mark.style.height = `${el.offsetHeight}px`; mark.style.opacity = 1;
        if (!same && following) scrollTo(el, lastTop !== null);
        lastTop = el.offsetTop;
      }
      checkAway();
    }
    timeEl.textContent = fmt(time);
    fill.style.transform = `scaleX(${time / duration})`;
    seekEl.setAttribute('aria-valuenow', Math.round(time));
    seekEl.setAttribute('aria-valuetext', `${fmt(time)} de ${fmt(duration)}`);
  }

  const take = () => { following = false; };
  scroll.addEventListener('wheel', take, { passive: true });
  scroll.addEventListener('touchmove', take, { passive: true });
  scroll.addEventListener('scroll', checkAway, { passive: true });
  const prog = (e) => {
    if (e.type === 'pointerdown') seekEl.setPointerCapture(e.pointerId);
    else if (!seekEl.hasPointerCapture(e.pointerId)) return;
    const r = seekEl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * duration); following = true;
  };
  seekEl.addEventListener('pointerdown', prog); seekEl.addEventListener('pointermove', prog);
  seekEl.addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); playing = !playing; drawPlay(); return; }
    const mv = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, Home: -duration, End: duration }[e.key];
    if (mv !== undefined) { e.preventDefault(); seek(time + mv); following = true; }
  });

  // Relógio simulado: avança de verdade enquanto toca, na velocidade escolhida.
  dispose(loop((dt) => {
    if (!playing) return;
    time = Math.min(duration, time + dt * SPEEDS[speedI]);
    if (time >= duration) { playing = false; drawPlay(); }
    draw();
  }));
  drawSpeed(); drawPlay(); draw();
  return () => { dispose.run(); root.remove(); };
}
