// Spoiler Text — porte em JS puro do componente "Spoiler Text" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, disposer } from '../kit.js';

// Grãos por px² de texto escondido (~1 a cada 6 px², como a raspadinha): até uma palavra curta vira mancha sólida.
const DENSITY = 1 / 6, MAX_SPECKS = 2400;
const DRIFT = 7;       // quanto um grão vagueia (px/s) enquanto cintila no lugar
const WAVE_MS = 520;   // a onda de revelação cruza o spoiler inteiro neste tempo, qualquer que seja o tamanho
const FADE_MS = 360;   // passada a onda, o grão é jogado para fora e some neste tempo
const THROW = 70;

const easeOut = (t) => 1 - (1 - t) ** 3;
const farthestCorner = (a, w, hh) => Math.max(Math.hypot(a.x, a.y), Math.hypot(w - a.x, a.y), Math.hypot(a.x, hh - a.y), Math.hypot(w - a.x, hh - a.y));
const union = (rs) => ({ left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) });

/** Põe o canvas sobre o texto e devolve a caixa de cada linha dentro dele. Um inline quebrado em linhas não tem caixa única, então o canvas
 *  é estacionado em 0,0, medido e deslocado pela diferença: cai sobre a caixa do texto em qualquer navegador. */
function fitCanvas(canvas, ctx, text) {
  const lines = Array.from(text.getClientRects());
  if (!lines.length) return null;
  const b = union(lines);
  canvas.style.left = '0px'; canvas.style.top = '0px';
  const o = canvas.getBoundingClientRect();
  canvas.style.left = `${b.left - o.left}px`; canvas.style.top = `${b.top - o.top}px`;
  const width = b.right - b.left, height = b.bottom - b.top, dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height, boxes: lines.map((r) => ({ left: r.left - b.left, top: r.top - b.top, right: r.right - b.left, bottom: r.bottom - b.top })) };
}
function makeSpecks(boxes) {
  const specks = [], area = boxes.reduce((s, b) => s + (b.right - b.left) * (b.bottom - b.top), 0);
  const scale = Math.min(1, MAX_SPECKS / Math.max(1, area * DENSITY));
  boxes.forEach((b, index) => {
    const w = b.right - b.left, hh = b.bottom - b.top, count = Math.round(w * hh * DENSITY * scale);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = DRIFT * (0.3 + Math.random() * 0.7);
      specks.push({ x: b.left + Math.random() * w, y: b.top + Math.random() * hh, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, phase: Math.random(), rate: 0.35 + Math.random() * 0.9, size: Math.random() < 0.18 ? 1.5 : 1, box: index, hit: 0 });
    }
  });
  return specks;
}
/** Avança um grão um quadro; devolve a opacidade, 0 quando sumiu. */
function step(s, { now, dt, wave, radius, boxes, reduced: rm }) {
  if (wave && !s.hit && Math.hypot(s.x - wave.x, s.y - wave.y) <= radius) {
    s.hit = now;
    const dx = s.x - wave.x, dy = s.y - wave.y, len = Math.hypot(dx, dy) || 1, push = THROW * (0.5 + Math.random());
    s.vx += dx / len * push; s.vy += dy / len * push;
  }
  const fade = s.hit ? 1 - (now - s.hit) / FADE_MS : 1;
  if (fade <= 0) return 0;
  if (!rm || s.hit) { s.x += s.vx * dt; s.y += s.vy * dt; s.phase = (s.phase + s.rate * dt) % 1; }
  const box = s.hit ? undefined : boxes[s.box]; // até ser atingido, o grão quica dentro da própria linha
  if (box) {
    if (s.x < box.left || s.x > box.right) { s.vx = -s.vx; s.x = Math.min(box.right, Math.max(box.left, s.x)); }
    if (s.y < box.top || s.y > box.bottom) { s.vy = -s.vy; s.y = Math.min(box.bottom, Math.max(box.top, s.y)); }
  }
  // Cada grão cintila entre fraco e cheio fora de compasso com os outros: a mancha brilha em vez de piscar.
  return (0.35 + 0.65 * Math.abs(Math.sin(s.phase * Math.PI))) * fade * 0.9;
}

/** Texto em linha escondido sob um campo de grãos, como spoiler de chat. Clique (ou Enter) sopra os grãos a partir do ponto tocado. */
function spoiler(content, onRevealed, label = 'Texto oculto. Ative para revelar.') {
  const rm = reduced();
  let revealed = false, clearing = false, wave = null, canvas = null, stopSpecks = null;
  const text = h('span', { class: 'kk-spoiler-text-t' }, content);
  const root = h('span', { class: 'kk-spoiler-text-s' }, text);
  root.addEventListener('click', (e) => { if (!revealed) reveal(e.detail === 0 ? undefined : e.clientX, e.detail === 0 ? undefined : e.clientY); }); // clique de teclado não tem posição
  root.addEventListener('keydown', (e) => { if (!revealed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); reveal(); } });

  function paint() {
    root.classList.toggle('open', revealed);
    if (revealed) { root.removeAttribute('role'); root.removeAttribute('tabindex'); root.removeAttribute('aria-label'); text.removeAttribute('aria-hidden'); }
    else { root.setAttribute('role', 'button'); root.tabIndex = 0; root.setAttribute('aria-label', label); text.setAttribute('aria-hidden', 'true'); }
    const show = !revealed || clearing;
    if (show && !canvas) { canvas = h('canvas', { class: 'kk-spoiler-text-c', 'aria-hidden': 'true' }); root.append(canvas); stopSpecks = runSpecks(); }
    else if (!show && canvas) { stopSpecks?.(); stopSpecks = null; canvas.remove(); canvas = null; }
  }
  function reveal(cx, cy) {
    if (revealed) return;
    const rect = canvas?.getBoundingClientRect(), first = text.getClientRects()[0];
    if (rect) {
      // Revelar pelo teclado começa no início da primeira linha.
      const x = cx ?? (first ? first.left + 4 : rect.left), y = cy ?? (first ? first.top + first.height / 2 : rect.top);
      wave = { x: x - rect.left, y: y - rect.top, start: performance.now() }; clearing = true;
    }
    revealed = true; paint(); onRevealed?.();
  }
  function hide() { revealed = false; clearing = false; wave = null; paint(); }

  function runSpecks() {
    const ctx = canvas.getContext('2d'), cv = canvas;
    let boxes = [], specks = [], width = 0, height = 0, color = 'currentColor', frame = 0, last = 0, visible = true;
    const layout = () => {
      const f = fitCanvas(cv, ctx, text);
      if (!f) return;
      ({ width, height, boxes } = f); specks = makeSpecks(boxes); color = getComputedStyle(root).color;
    };
    const draw = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      ctx.clearRect(0, 0, width, height); ctx.fillStyle = color;
      const radius = wave ? farthestCorner(wave, width, height) * easeOut(Math.min(1, (now - wave.start) / WAVE_MS)) : -1;
      let alive = 0;
      for (const s of specks) {
        const a = step(s, { now, dt, wave, radius, boxes, reduced: rm });
        if (a > 0) { alive++; ctx.globalAlpha = a; ctx.fillRect(s.x, s.y, s.size, s.size); }
      }
      ctx.globalAlpha = 1;
      if (wave && alive === 0) { wave = null; clearing = false; paint(); return; }
      if ((!rm || wave) && visible) frame = requestAnimationFrame(draw);
    };
    const restart = () => { cancelAnimationFrame(frame); last = 0; frame = requestAnimationFrame(draw); };
    layout(); restart();
    // O texto reflui quando o contêiner muda de largura: reposiciona os grãos.
    const ro = new ResizeObserver(() => { if (!wave) { layout(); restart(); } });
    ro.observe(root.parentElement ?? root);
    const io = new IntersectionObserver(([e]) => { visible = e?.isIntersecting ?? true; if (visible) restart(); else cancelAnimationFrame(frame); }); // fora da tela o brilho para
    io.observe(root);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); };
  }
  paint();
  return { el: root, hide, destroy: () => stopSpecks?.() };
}

const MESSAGES = (mk) => [
  { name: 'Carla', initial: 'C', time: '10:04', body: ['Fechei a proposta da Clínica Aurora ontem à noite. Ainda estou comemorando.'] },
  { name: 'Rafael', initial: 'R', time: '10:06', body: ['Boa! Quando contei pro financeiro, descobri que ', mk('o contrato anual saiu por R$ 18.400, com 12% de desconto'), ' e ninguém reclamou.'] },
  { name: 'Você', initial: 'V', time: '10:07', own: true, body: ['Não conta! Quero ouvir na reunião das 15h. Já sei que ', mk('eles vão pedir mais duas unidades'), ' depois, mas deixa surpresa.'] },
];

export default function mount(stage, ctx) {
  ensureStyle('spoiler-text', `
.kk-spoiler-text{width:100%;max-width:448px;margin:0 auto;box-sizing:border-box;padding:14px;border:1px solid var(--line);border-radius:18px;background:#fff;color:var(--ink)}
.kk-spoiler-text-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
.kk-spoiler-text-top b{font-size:14px}
.kk-spoiler-text-again{min-height:36px;padding:0 12px;border:0;border-radius:8px;background:none;color:var(--mut);font:inherit;font-size:13px;cursor:pointer;transition:background .15s,color .15s,opacity .15s}
.kk-spoiler-text-again:hover{background:var(--ice-100);color:var(--ink)}
.kk-spoiler-text-again[hidden]{display:block;visibility:hidden}
.kk-spoiler-text-again:focus-visible{outline:2px solid var(--ice-500);outline-offset:2px}
.kk-spoiler-text ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.kk-spoiler-text li{display:flex;gap:10px}
.kk-spoiler-text-av{flex:none;width:28px;height:28px;margin-top:2px;border-radius:50%;background:var(--ice-100);color:var(--ice-700);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.kk-spoiler-text li.own .kk-spoiler-text-av{background:var(--ice-700);color:#fff}
.kk-spoiler-text li>div{min-width:0}
.kk-spoiler-text-meta{margin:0;display:flex;align-items:baseline;gap:8px}
.kk-spoiler-text-meta b{font-size:14px}
.kk-spoiler-text-meta small{font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums}
.kk-spoiler-text p.kk-spoiler-text-body{margin:0;font-size:15px;line-height:24px;color:var(--ink);overflow-wrap:anywhere}
.kk-spoiler-text-s{position:relative;border-radius:3px;-webkit-box-decoration-break:clone;box-decoration-break:clone;cursor:pointer;background:rgba(15,53,96,.08);outline:none;transition:background .15s}
.kk-spoiler-text-s:hover{background:rgba(15,53,96,.14)}
.kk-spoiler-text-s:focus-visible{outline:2px solid var(--ice-500);outline-offset:1px}
.kk-spoiler-text-s.open{cursor:auto;background:none}
.kk-spoiler-text-t{opacity:0;filter:blur(6px);user-select:none;-webkit-user-select:none;transition:opacity .45s cubic-bezier(.23,1,.32,1),filter .45s cubic-bezier(.23,1,.32,1)}
.kk-spoiler-text-s.open .kk-spoiler-text-t{opacity:1;filter:none;user-select:auto;-webkit-user-select:auto}
.kk-spoiler-text-c{position:absolute;pointer-events:none}
@media (prefers-reduced-motion:reduce){.kk-spoiler-text-t{transition:opacity .2s}}
`);
  const dispose = disposer();
  let shown = 0, spoilers = [];
  const again = h('button', { class: 'kk-spoiler-text-again', type: 'button', hidden: true, onclick: () => { spoilers.forEach((s) => s.hide()); shown = 0; sync(); } }, 'Esconder de novo');
  const list = h('ul');
  const root = h('div', { class: 'kk-spoiler-text' }, h('div', { class: 'kk-spoiler-text-top' }, h('b', '# fechamentos'), again), list);
  stage.append(root);
  const mk = (t) => { const s = spoiler(t, () => { shown++; sync(); }); spoilers.push(s); return s.el; };
  for (const m of MESSAGES(mk)) {
    list.append(h('li', { class: m.own ? 'own' : '' },
      h('span', { class: 'kk-spoiler-text-av', 'aria-hidden': 'true' }, m.initial),
      h('div', h('p', { class: 'kk-spoiler-text-meta' }, h('b', m.name), h('small', m.time)), h('p', { class: 'kk-spoiler-text-body' }, m.body))));
  }
  function sync() { again.hidden = shown === 0; again.tabIndex = shown === 0 ? -1 : 0; }
  sync();
  return () => { spoilers.forEach((s) => s.destroy()); dispose.run(); root.remove(); };
}
