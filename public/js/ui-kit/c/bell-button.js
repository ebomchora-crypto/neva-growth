// Bell Button — porte em JS puro do componente "Bell Button" .
import { h, svg, ensureStyle, reduced } from '../kit.js';

// O sino e o badalo são dois pêndulos no mesmo pivô; só colisões os acoplam. Ângulos em graus, tempo em segundos.
const STEP = 1 / 240;
const BELL_K = 380, BELL_C = 5, CLAP_K = 150, CLAP_C = 4;
const LIP = 13;              // folga do badalo antes de bater na borda do sino
const RESTITUTION = 0.45, RECOIL = 0.18, STRIKE_SPEED = 260;
const RING_KICK = 600, NUDGE_KICK = 160, MUTE_KICK = 300, REST = 0.05;
const PIVOT = { x: 12, y: 2.5 };
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const haptic = (ms) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } };

// Número cujos dígitos rolam até o novo valor, como um contador.
function rollingNumber() {
  const el = h('span', { class: 'kk-bell-button-roll', 'aria-hidden': 'true' });
  let cols = [];
  return {
    el,
    set(value) {
      const text = value.toLocaleString('pt-BR');
      // Chaves contadas da direita: as unidades continuam sendo unidades quando entra um dígito.
      if (cols.length !== text.length) {
        el.replaceChildren(); cols = [];
        for (const ch of text) {
          if (ch < '0' || ch > '9') { el.append(h('span', ch)); cols.push(null); continue; }
          const strip = h('span', { class: 'kk-bell-button-strip' }, [...'0123456789'].map((d) => h('span', d)));
          el.append(h('span', { class: 'kk-bell-button-digit' }, strip)); cols.push(strip);
        }
      }
      [...text].forEach((ch, i) => { if (cols[i]) cols[i].style.transform = `translateY(${-Number(ch) * 10}%)`; });
    },
  };
}

function bellButton(variant, count, label, subLabel, state) {
  const s = { bell: 0, bellSpeed: 0, clapper: 0, clapperSpeed: 0, muffled: true, raf: 0, last: 0, carry: 0, lastNudge: 0 };
  let subscribed = false;
  const mk = (cls, d) => svg('path', { class: cls, d });
  const rightWave = mk('kk-bell-button-wave', 'M21.5 4.5c1.2 1.6 1.8 3.4 1.8 5.5');
  const leftWave = mk('kk-bell-button-wave', 'M2.5 4.5C1.3 6.1.7 7.9.7 10');
  const clapperEl = svg('path', { d: 'M10.27 21a2 2 0 0 0 3.46 0' });
  const fillPath = svg('path', { class: 'kk-bell-button-body', d: 'M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33' });
  const slash = svg('path', { class: 'kk-bell-button-slash', d: 'M3 3l18 18', 'stroke-dasharray': 26, 'stroke-dashoffset': 0 });
  const bellEl = svg('g', {}, fillPath, slash);
  const ico = svg('svg', { class: 'kk-bell-button-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, rightWave, leftWave, clapperEl, bellEl);
  const num = rollingNumber();
  const badge = h('span', { class: 'kk-bell-button-count' }, num.el, h('span', { class: 'kk-bell-button-sr' }));
  const btn = h('button', { type: 'button', class: `kk-bell-button-btn is-${variant}`, 'aria-pressed': 'false', 'aria-label': variant === 'icon' ? label : null }, ico,
    variant === 'icon' ? null : h('span', { class: 'kk-bell-button-lines' },
      h('span', { class: 'is-on' }, label), h('span', { 'aria-hidden': 'true' }, subLabel)),
    variant === 'default' ? badge : null);
  const lines = btn.querySelectorAll('.kk-bell-button-lines span');

  const draw = () => {
    bellEl.setAttribute('transform', `rotate(${s.bell.toFixed(2)} ${PIVOT.x} ${PIVOT.y})`);
    clapperEl.setAttribute('transform', `rotate(${s.clapper.toFixed(2)} ${PIVOT.x} ${PIVOT.y})`);
  };
  // Dois arcos curtos abrem no lado atingido.
  const flare = (side, strength) => {
    const wave = side > 0 ? rightWave : leftWave;
    const peak = Math.min(1, 0.45 + strength * 0.55);
    wave.animate([{ opacity: peak, transform: 'translateX(0px)' }, { opacity: 0, transform: `translateX(${side * 3}px)` }], { duration: 420, easing: EASE });
  };
  const step = () => {
    s.bellSpeed += (-s.bell * BELL_K - s.bellSpeed * BELL_C) * STEP; s.bell += s.bellSpeed * STEP;
    if (s.muffled) { s.clapper = s.bell; s.clapperSpeed = s.bellSpeed; return; }
    s.clapperSpeed += (-s.clapper * CLAP_K - s.clapperSpeed * CLAP_C) * STEP; s.clapper += s.clapperSpeed * STEP;
    const rel = s.clapper - s.bell;
    if (Math.abs(rel) <= LIP) return;
    const side = rel > 0 ? 1 : -1;
    const impact = (s.clapperSpeed - s.bellSpeed) * side;
    s.clapper = s.bell + side * LIP;
    if (impact <= 0) return;
    s.clapperSpeed -= side * impact * (1 + RESTITUTION);
    s.bellSpeed += side * impact * RECOIL;
    if (impact > STRIKE_SPEED) { flare(side, impact / 1600); haptic(6); state.ding?.(impact); }
  };
  const tick = (now) => {
    s.raf = 0;
    const el = s.last ? Math.min((now - s.last) / 1000, 0.05) : STEP; s.last = now; s.carry += el;
    while (s.carry >= STEP) { step(); s.carry -= STEP; }
    draw();
    const energy = Math.abs(s.bell) + Math.abs(s.bellSpeed) * 0.02 + Math.abs(s.clapper) + Math.abs(s.clapperSpeed) * 0.02;
    if (energy < REST) { s.bell = s.bellSpeed = s.clapper = s.clapperSpeed = 0; s.last = 0; draw(); return; }
    s.raf = requestAnimationFrame(tick);
  };
  const kick = (v) => { if (reduced()) return; s.bellSpeed += v; if (!s.raf) s.raf = requestAnimationFrame(tick); };

  const paint = () => {
    btn.setAttribute('aria-pressed', String(subscribed));
    btn.classList.toggle('is-on', subscribed);
    slash.setAttribute('stroke-dashoffset', subscribed ? 26 : 0);
    fillPath.classList.toggle('is-filled', subscribed);
    if (lines.length) { lines[0].classList.toggle('is-on', !subscribed); lines[1].classList.toggle('is-on', subscribed); lines[0].setAttribute('aria-hidden', String(subscribed)); lines[1].setAttribute('aria-hidden', String(!subscribed)); }
    const n = count + (subscribed ? 1 : 0);
    num.set(n); badge.lastChild.textContent = `${n.toLocaleString('pt-BR')} inscritos`;
  };
  btn.addEventListener('click', () => {
    subscribed = !subscribed; paint(); state.change?.(subscribed);
    if (subscribed) {
      s.muffled = false;
      // Balança o sino para longe do badalo, para a primeira batida já soar.
      kick(s.bellSpeed >= 0 ? RING_KICK : -RING_KICK);
      if (reduced()) { flare(1, 0.6); flare(-1, 0.6); state.ding?.(1000); }
      haptic(10);
    } else { s.muffled = true; kick(-MUTE_KICK); }
  });
  btn.addEventListener('pointerenter', (e) => {
    // Um roçar do mouse faz o sino balançar um pouco; no toque o "enter" vem logo antes do toque.
    if (e.pointerType !== 'mouse' || s.muffled || e.timeStamp - s.lastNudge < 700) return;
    s.lastNudge = e.timeStamp; kick(s.bellSpeed >= 0 ? NUDGE_KICK : -NUDGE_KICK);
  });
  paint();
  return { el: btn, dispose: () => { cancelAnimationFrame(s.raf); s.raf = 0; } };
}

export default function mount(stage, ctx) {
  ensureStyle('bell-button', `
.kk-bell-button-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 12px;width:100%}
.kk-bell-button-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px}
.kk-bell-button-btn{display:inline-flex;align-items:center;gap:10px;height:44px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 14px/1 inherit;cursor:pointer;outline:none;transition:background-color .2s,border-color .2s,color .2s}
.kk-bell-button-btn.is-default{padding:0 6px 0 16px}.kk-bell-button-btn.is-compact{padding:0 16px}.kk-bell-button-btn.is-icon{width:44px;justify-content:center;padding:0}
.kk-bell-button-btn:hover{background:var(--ice-50,#f2f8fe)}.kk-bell-button-btn:active{background:var(--ice-100,#e3f0fb)}
.kk-bell-button-btn:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-500,#4a95d2)}
.kk-bell-button-btn.is-on{background:var(--ice-800,#164a7c);border-color:var(--ice-800,#164a7c);color:#fff}
.kk-bell-button-btn.is-on:hover{background:var(--ice-700,#1f5f9b)}
.kk-bell-button-ico{width:20px;height:20px;overflow:visible;flex:none}
.kk-bell-button-wave{opacity:0}
.kk-bell-button-body{fill:transparent;transition:fill .2s}.kk-bell-button-body.is-filled{fill:currentColor}
.kk-bell-button-slash{transition:stroke-dashoffset .3s cubic-bezier(.23,1,.32,1)}
.kk-bell-button-lines{display:grid}
.kk-bell-button-lines>span{grid-area:1/1;white-space:nowrap;opacity:0;filter:blur(2px);transition:opacity .2s,filter .2s}
.kk-bell-button-lines>span.is-on{opacity:1;filter:none}
.kk-bell-button-count{border-radius:999px;padding:6px 10px;font-size:12px;line-height:1;background:var(--ice-100,#e3f0fb);color:var(--mut,#4a6f93);transition:background-color .2s,color .2s}
.kk-bell-button-btn.is-on .kk-bell-button-count{background:rgba(255,255,255,.16);color:rgba(255,255,255,.85)}
.kk-bell-button-roll{display:inline-flex;font-variant-numeric:tabular-nums}
.kk-bell-button-digit{display:inline-block;position:relative;height:14px;overflow:hidden;line-height:14px}
.kk-bell-button-strip{display:flex;flex-direction:column;transition:transform .3s cubic-bezier(.23,1,.32,1)}
.kk-bell-button-strip span{height:14px;line-height:14px}
.kk-bell-button-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.kk-bell-button-hint{font-size:12px;color:var(--mut,#4a6f93);margin:0;text-align:center}
@media (prefers-reduced-motion:reduce){.kk-bell-button-strip,.kk-bell-button-slash{transition:none}}
`);
  // Som curto (WebAudio) só depois da interação do usuário; silencioso se o navegador recusar.
  let actx = null, muted = false;
  const ding = (impact) => {
    if (muted) return;
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = 1180; g.gain.setValueAtTime(Math.min(0.12, 0.03 + impact / 20000), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.4);
    } catch { /* sem áudio */ }
  };
  const hint = h('p', { class: 'kk-bell-button-hint', role: 'status' }, 'Clique no sino: ao ativar ele toca de verdade.');
  const mk = (v, c, l, sl) => bellButton(v, c, l, sl, { ding, change: (on) => { hint.textContent = on ? 'Avisos ativados: você será notificado de cada lançamento.' : 'Avisos desativados — o badalo fica preso ao sino.'; } });
  const parts = [mk('default', 1284, 'Avisar-me', 'Inscrito'), mk('compact', 0, 'Novos leads', 'Seguindo'), mk('icon', 0, 'Avisar-me sobre vendas', '')];
  const soundBtn = h('button', { type: 'button', class: 'kk-bell-button-btn is-compact', 'aria-pressed': 'false', onClick: (e) => { muted = !muted; e.currentTarget.setAttribute('aria-pressed', String(!muted)); e.currentTarget.textContent = muted ? 'Som desligado' : 'Som ligado'; } }, 'Som ligado');
  soundBtn.setAttribute('aria-pressed', 'true');
  const root = h('div', { class: 'kk-bell-button-wrap' },
    h('div', { class: 'kk-bell-button-row' }, parts[0].el), h('div', { class: 'kk-bell-button-row' }, parts[1].el, parts[2].el), soundBtn, hint);
  stage.append(root);
  return () => { parts.forEach((p) => p.dispose()); try { actx?.close(); } catch { /* ok */ } root.remove(); };
}
