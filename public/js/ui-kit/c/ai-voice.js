// AI Voice — porte em JS puro do componente "AI Voice" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
// Onda que rola enquanto grava e depois uma revisão com ouvir, descartar ou enviar. Por padrão a onda é SIMULADA e o demo avisa isso;
// com "Usar microfone" (e só se o navegador/usuário permitir) a onda e o áudio são reais e ficam apenas no navegador.
import { h, svg, ensureStyle, disposer, reduced, PALETTE } from '../kit.js';
import { toast } from '../../ui.js';

const BAR_COUNT = 48, BAR_PITCH = 5, SAMPLE_MS = 70, REST = 0.12;
const STILL = Array.from({ length: BAR_COUNT + 1 }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)));
const fmt = (s) => { const w = Math.floor(s); return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`; };
const MASK = 'linear-gradient(to right,transparent,#000 18%,#000 92%,transparent)';

// Nível parecido com fala sem microfone: sílabas (~4-5/s) agrupadas em palavras com pausas.
function voiceSim() {
  let speaking = false, switchAt = 0, gate = 0;
  return (time) => {
    if (time >= switchAt) { speaking = !speaking; switchAt = time + (speaking ? 700 + Math.random() * 1600 : 180 + Math.random() * 500); }
    gate += ((speaking ? 1 : 0) - gate) * 0.35;
    const t = time / 1000, syl = Math.abs(Math.sin(t * Math.PI * 4.4 + Math.sin(t * 1.7) * 2));
    return REST + gate * syl * (0.65 + Math.random() * 0.35) * (1 - REST);
  };
}
// Espreme a gravação inteira em BAR_COUNT barras, guardando o pico de cada fatia.
const condense = (take) => (!take.length ? STILL.slice(0, BAR_COUNT) : Array.from({ length: BAR_COUNT }, (_, i) => {
  const a = Math.floor((i / BAR_COUNT) * take.length), b = Math.max(a + 1, Math.floor(((i + 1) / BAR_COUNT) * take.length));
  return Math.max(REST, ...take.slice(a, b));
}));

const ico = (d, fill) => svg('svg', { viewBox: '0 0 24 24', fill: fill ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d }));

const CSS = `
.kk-ai-voice-root{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0;font-family:inherit;color:var(--ink,#0e2236)}
.kk-ai-voice-btnwrap{position:relative}
.kk-ai-voice-ring{position:absolute;inset:0;border-radius:14px;background:${PALETTE.ice200};opacity:0;pointer-events:none}
.kk-ai-voice-main{position:relative;width:64px;height:64px;border:0;border-radius:14px;display:grid;place-items:center;background:transparent;color:${PALETTE.ink};cursor:pointer;transition:background .15s}
.kk-ai-voice-main:hover,.kk-ai-voice-main.act{background:${PALETTE.ice100}}
.kk-ai-voice-main:focus-visible,.kk-ai-voice-root button:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
.kk-ai-voice-main>*{grid-area:1/1;width:24px;height:24px;transition:opacity .2s,filter .2s,transform .2s cubic-bezier(.23,1,.32,1);opacity:0;filter:blur(3px);transform:scale(.5)}
.kk-ai-voice-main>.on{opacity:1;filter:none;transform:none}
.kk-ai-voice-main .sq{width:20px;height:20px;border-radius:5px;background:currentColor}
.kk-ai-voice-timer{position:relative;font:14px ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;color:#8aa5c0;transition:color .3s}
.kk-ai-voice-timer.on{color:${PALETTE.ink}}
.kk-ai-voice-rec{position:absolute;top:50%;right:100%;margin-right:8px;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:${PALETTE.bad};opacity:0;transition:opacity .15s}
.kk-ai-voice-timer.rec .kk-ai-voice-rec{opacity:1}
.kk-ai-voice-wave{position:relative;height:32px;width:240px;max-width:100%;overflow:hidden}
.kk-ai-voice-wave.rec{-webkit-mask-image:${MASK};mask-image:${MASK}}
.kk-ai-voice-row,.kk-ai-voice-played{display:flex;align-items:center;gap:2px;height:100%}
.kk-ai-voice-row i,.kk-ai-voice-played i{flex:none;width:3px;height:100%;border-radius:2px;background:${PALETTE.ice200};transform:scaleY(.12);transition:transform .5s cubic-bezier(.23,1,.32,1)}
.kk-ai-voice-wave.rec .kk-ai-voice-row i{background:${PALETTE.ice600};transition:none}
.kk-ai-voice-played{position:absolute;inset:0;clip-path:inset(0 100% 0 0);opacity:0;transition:opacity .2s}
.kk-ai-voice-played i{background:${PALETTE.ice800}}.kk-ai-voice-played.on{opacity:1}
.kk-ai-voice-foot{position:relative;min-height:36px;display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap}
.kk-ai-voice-cap{font-size:12px;color:${PALETTE.mut}}
.kk-ai-voice-act{display:flex;align-items:center;gap:4px;min-height:36px;padding:0 12px;border:0;border-radius:10px;background:none;font:inherit;font-size:12px;color:${PALETTE.mut};cursor:pointer}
.kk-ai-voice-act:hover{background:${PALETTE.ice100};color:${PALETTE.ink}}.kk-ai-voice-act svg{width:14px;height:14px}
.kk-ai-voice-act.send{background:${PALETTE.ice800};color:#fff}.kk-ai-voice-act.send:hover{background:${PALETTE.ice900}}
.kk-ai-voice-mode{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:2px}
.kk-ai-voice-mode small{font-size:11px;color:${PALETTE.mut};max-width:260px;text-align:center;line-height:1.35}
.kk-ai-voice-pill{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid ${PALETTE.line};background:#fff;font:inherit;font-size:12px;font-weight:600;color:${PALETTE.ink};cursor:pointer}
.kk-ai-voice-pill:hover{background:${PALETTE.ice100}}.kk-ai-voice-pill:disabled{opacity:.5;cursor:default}
.kk-ai-voice-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (prefers-reduced-motion:reduce){.kk-ai-voice-main>*,.kk-ai-voice-row i,.kk-ai-voice-played{transition:none}}
`;

export default function mount(stage) {
  ensureStyle('ai-voice', CSS);
  const dis = disposer();
  let mode = 'idle', playing = false, seconds = 0, duration = 0, playhead = 0, demo = true, onScreen = true;
  let take = [], startedAt = 0, frame = 0, playFrame = 0, timerId = 0, demoTimer = 0;
  // Fonte real (microfone): analisador + gravação; se não houver, tudo é simulado.
  let stream = null, actx = null, analyser = null, rec = null, chunks = [], audioUrl = '', audioEl = null, micState = 'sim';

  const ring = h('span', { class: 'kk-ai-voice-ring', 'aria-hidden': 'true' });
  const faces = { mic: ico('M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4'), stop: h('i', { class: 'sq' }), play: ico('M7 4l13 8-13 8z', true), pause: ico('M7 5v14M17 5v14', false) };
  faces.pause.setAttribute('stroke-width', 4);
  Object.values(faces).forEach((f) => f.setAttribute?.('aria-hidden', 'true'));
  const main = h('button', { type: 'button', class: 'kk-ai-voice-main' }, ...Object.values(faces));
  const timer = h('span', { class: 'kk-ai-voice-timer' }, h('i', { class: 'kk-ai-voice-rec', 'aria-hidden': 'true' }), h('span', '00:00'));
  const bars = Array.from({ length: BAR_COUNT + 1 }, () => h('i'));
  const pbars = Array.from({ length: BAR_COUNT + 1 }, () => h('i'));
  const row = h('div', { class: 'kk-ai-voice-row' }, bars);
  const played = h('div', { class: 'kk-ai-voice-played' }, pbars);
  const wave = h('div', { class: 'kk-ai-voice-wave', 'aria-hidden': 'true' }, row, played);
  const foot = h('div', { class: 'kk-ai-voice-foot' });
  const live = h('output', { class: 'kk-ai-voice-sr', 'aria-live': 'polite' });
  const note = h('small');
  const micBtn = h('button', { type: 'button', class: 'kk-ai-voice-pill' }, 'Usar microfone');
  const root = h('div', { class: 'kk-ai-voice-root' }, h('div', { class: 'kk-ai-voice-btnwrap' }, ring, main), timer, wave, foot, h('div', { class: 'kk-ai-voice-mode' }, micBtn, note), live);
  stage.append(root);

  const setScales = (els, lv) => els.forEach((b, i) => { b.style.transform = `scaleY(${(lv[i] ?? REST).toFixed(3)})`; });
  const real = () => micState === 'live';

  function paint() {
    const rv = mode === 'recording', rw = mode === 'review';
    const vis = { mic: mode === 'idle', stop: rv, play: rw && !playing, pause: rw && playing };
    for (const [k, el] of Object.entries(faces)) el.classList.toggle('on', vis[k]);
    main.classList.toggle('act', mode !== 'idle');
    main.setAttribute('aria-label', rv ? 'Parar gravação' : rw ? (playing ? 'Pausar' : 'Ouvir gravação') : 'Começar a gravar');
    timer.classList.toggle('on', mode !== 'idle'); timer.classList.toggle('rec', rv);
    timer.lastChild.textContent = fmt(rw ? (playing || playhead > 0 ? playhead : duration) : rv ? seconds : 0);
    wave.classList.toggle('rec', rv); played.classList.toggle('on', rw);
    foot.replaceChildren(...(rw
      ? [h('button', { type: 'button', class: 'kk-ai-voice-act', onclick: () => finish(false) }, ico('M6 6l12 12M18 6L6 18'), 'Descartar'),
         h('button', { type: 'button', class: 'kk-ai-voice-act send', onclick: () => finish(true) }, 'Enviar', ico('M12 19V5M5.5 11.5L12 5l6.5 6.5'))]
      : [h('span', { class: 'kk-ai-voice-cap' }, rv ? 'Ouvindo…' : 'Toque para falar')]));
    micBtn.hidden = micState === 'live' || micState === 'denied' || micState === 'none';
    micBtn.disabled = mode !== 'idle';
    note.textContent = micState === 'live' ? 'Microfone ligado: a onda é real e o áudio fica só neste navegador.'
      : micState === 'denied' ? 'Microfone não liberado: usando onda simulada. Nada é gravado de verdade.'
      : micState === 'none' ? 'Este navegador não tem microfone disponível: usando onda simulada. Nada é gravado de verdade.'
      : 'Onda simulada: nenhum som é captado nem gravado.';
  }

  async function askMic() {
    if (!navigator.mediaDevices?.getUserMedia) { micState = 'none'; paint(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC(); const src = actx.createMediaStreamSource(stream); analyser = actx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
      micState = 'live'; demo = false; clearTimeout(demoTimer);
    } catch { micState = 'denied'; }
    paint();
  }
  micBtn.addEventListener('click', askMic);

  const level = () => {
    const buf = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(buf);
    let s = 0; for (const v of buf) { const d = (v - 128) / 128; s += d * d; }
    return Math.min(1, Math.max(REST, Math.sqrt(s / buf.length) * 4));
  };

  function startRecording() {
    stopPlay(); mode = 'recording'; take = []; seconds = 0; startedAt = Date.now(); chunks = [];
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = ''; audioEl = null; }
    if (real()) { try { rec = new MediaRecorder(stream); rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.start(); } catch { rec = null; } }
    clearInterval(timerId); timerId = setInterval(() => { seconds = Math.floor((Date.now() - startedAt) / 1000); paint(); }, 250);
    live.textContent = demo ? '' : 'Gravando';
    paint(); runWave();
  }
  function stopRecording() {
    cancelAnimationFrame(frame); clearInterval(timerId);
    duration = Math.max((Date.now() - startedAt) / 1000, take.length * (SAMPLE_MS / 1000)); playhead = 0;
    played.style.clipPath = 'inset(0 100% 0 0)';
    ring.style.opacity = '0'; ring.style.transform = 'scale(1)';
    if (rec && rec.state !== 'inactive') { rec.onstop = () => { audioUrl = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); audioEl = new Audio(audioUrl); audioEl.onended = () => stopPlay(true); }; rec.stop(); }
    mode = 'review'; row.style.transform = 'translateX(0)';
    const lv = condense(take); setScales(bars, lv); setScales(pbars, lv);
    live.textContent = demo ? '' : 'Gravação pronta para enviar';
    paint();
  }
  function finish(sent) {
    stopPlay(); mode = 'idle'; rec = null;
    setScales(bars, bars.map(() => REST)); setScales(pbars, pbars.map(() => REST)); played.style.clipPath = 'inset(0 100% 0 0)';
    if (!demo) {
      if (sent && real()) toast(`Áudio de ${fmt(duration)} pronto. Ele não saiu do seu navegador.`, 'ok');
      else if (sent) toast('Demo: nenhum áudio foi gravado, a onda era simulada.');
    }
    if (audioUrl && !sent) { URL.revokeObjectURL(audioUrl); audioUrl = ''; audioEl = null; }
    paint();
  }

  // Gravação: um laço de rAF escreve direto nas barras; pausa fora da tela.
  function runWave() {
    cancelAnimationFrame(frame);
    const samples = bars.map(() => REST);
    if (reduced()) { setScales(bars, STILL); take = STILL.slice(); return; }
    const sim = voiceSim(); let phase = 0, smooth = 0, last = performance.now();
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      if (!onScreen || document.hidden) { last = now; return; }
      phase += Math.min(now - last, 100) / SAMPLE_MS; last = now;
      while (phase >= 1) { phase -= 1; const s = real() && analyser ? level() : sim(now); samples.shift(); samples.push(s); take.push(s); }
      row.style.transform = `translateX(${(-phase * BAR_PITCH).toFixed(2)}px)`;
      setScales(bars, samples);
      smooth += ((samples.at(-1) ?? REST) - smooth) * 0.18; const lift = Math.max(0, smooth - REST);
      ring.style.transform = `scale(${(1 + lift * 0.22).toFixed(3)})`; ring.style.opacity = (0.4 + lift * 0.8).toFixed(3);
    };
    frame = requestAnimationFrame(tick);
  }

  // Revisão: um cursor percorre a gravação; com microfone real toca o áudio de verdade, senão é só uma prévia visual.
  function togglePlay() {
    if (playing) { stopPlay(); paint(); return; }
    playing = true; played.style.clipPath = 'inset(0 100% 0 0)'; playhead = 0;
    if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); }
    const len = Math.max(duration, 1) * 1000, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / len, 1);
      played.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`; playhead = p * Math.max(duration, 1); timer.lastChild.textContent = fmt(playhead);
      if (p < 1) playFrame = requestAnimationFrame(tick); else stopPlay(true);
    };
    playFrame = requestAnimationFrame(tick); paint();
  }
  function stopPlay(ended) { cancelAnimationFrame(playFrame); if (audioEl) audioEl.pause(); if (playing || ended) { playing = false; if (mode === 'review') paint(); } }

  main.addEventListener('click', () => {
    if (demo) { demo = false; clearTimeout(demoTimer); if (mode !== 'idle') { stopPlay(); cancelAnimationFrame(frame); clearInterval(timerId); mode = 'idle'; } }
    if (mode === 'recording') stopRecording(); else if (mode === 'review') togglePlay(); else startRecording();
  });
  // Qualquer toque no componente encerra o roteiro automático.
  root.addEventListener('pointerdown', () => { if (demo) { demo = false; clearTimeout(demoTimer); } }, true);

  // Roteiro automático: grava, revisa com uma prévia, "envia" e descansa. Só até o primeiro toque.
  function demoStep() {
    if (!demo || !onScreen || document.hidden) { demoTimer = setTimeout(demoStep, 600); return; }
    if (mode === 'idle') { startRecording(); demoTimer = setTimeout(demoStep, 3400); }
    else if (mode === 'recording') { stopRecording(); demoTimer = setTimeout(demoStep, 600); }
    else if (!playing && playhead === 0) { togglePlay(); demoTimer = setTimeout(demoStep, Math.max(duration, 1) * 1000 + 900); }
    else { finish(true); demoTimer = setTimeout(demoStep, 1200); }
  }
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }); io.observe(root);

  setScales(bars, bars.map(() => REST)); setScales(pbars, pbars.map(() => REST));
  paint(); demoTimer = setTimeout(demoStep, 1200);

  return () => {
    demo = false; clearTimeout(demoTimer); cancelAnimationFrame(frame); cancelAnimationFrame(playFrame); clearInterval(timerId); io.disconnect();
    if (rec && rec.state !== 'inactive') { rec.onstop = null; try { rec.stop(); } catch { /* já parado */ } }
    stream?.getTracks().forEach((t) => t.stop()); actx?.close?.().catch(() => {}); audioEl?.pause(); if (audioUrl) URL.revokeObjectURL(audioUrl);
    dis.run(); stage.replaceChildren();
  };
}
