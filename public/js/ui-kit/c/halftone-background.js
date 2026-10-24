// Halftone Background — porte em JS puro do componente "Halftone Background" .
import { h, ensureStyle, reduced, clamp, disposer, PALETTE } from '../kit.js';

const LOUPE = 110, LOUPE_DETAIL = 2.2; // raio da lupa (px) e quanto sua retícula é mais fina
const LOUPE_LAG = 0.08;                // a lupa segue o cursor com essa constante de tempo (s)
const PAPER = 0.025;                   // textura de papel: o tom mais fraco, impresso em toda parte
const INTRO_MS = 900;

/** Esfera iluminada de cima à esquerda, com sombra suave no chão. Devolve quanta tinta (0..1) cada ponto leva. */
function sphereField(width, height) {
  const wide = width >= 560; // larga: esfera ao lado do texto; estreita: acima dele
  const r = wide ? Math.min(width, height) * 0.34 : Math.min(width * 0.34, height * 0.22);
  const cx = wide ? width * 0.7 : width * 0.54, cy = height * (wide ? 0.48 : 0.27);
  const sun = { x: -0.55, y: -0.6, z: 0.58 };
  const shadow = { x: cx + r * 0.35, y: cy + r * 1.02, rx: r * 1.15, ry: r * 0.24 };
  return (x, y) => {
    const nx = (x - cx) / r, ny = (y - cy) / r, d2 = nx * nx + ny * ny;
    if (d2 < 1) {
      const lambert = Math.max(nx * sun.x + ny * sun.y + Math.sqrt(1 - d2) * sun.z, 0);
      return Math.max(1 - (0.12 + 0.88 * lambert), PAPER);
    }
    const s = 1 - Math.hypot((x - shadow.x) / shadow.rx, (y - shadow.y) / shadow.ry);
    return s > 0 ? Math.max(PAPER, 0.55 * s * s) : PAPER;
  };
}
/** Imagem (aqui, um canvas gerado: nada de URL externa) cobrindo a caixa e amostrada pela escuridão. */
function imageField(source, width, height) {
  const scale = 0.5, w = Math.max(1, Math.round(width * scale)), hh = Math.max(1, Math.round(height * scale));
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.canvas.width = w; ctx.canvas.height = hh;
  const fit = Math.max(w / source.width, hh / source.height), dw = source.width * fit, dh = source.height * fit;
  ctx.drawImage(source, (w - dw) / 2, (hh - dh) / 2, dw, dh);
  const data = ctx.getImageData(0, 0, w, hh).data;
  return (x, y) => {
    const i = clamp(Math.round(x * scale), 0, w - 1), j = clamp(Math.round(y * scale), 0, hh - 1), k = (j * w + i) * 4;
    return Math.max(1 - (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255, PAPER);
  };
}
/** Gráfico de barras em ascensão, desenhado em canvas: serve de "foto" para imprimir em pontos. */
function chartPicture() {
  const c = document.createElement('canvas'); c.width = 480; c.height = 360;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 360); bg.addColorStop(0, '#fbfbfb'); bg.addColorStop(1, '#d9d9d9');
  g.fillStyle = bg; g.fillRect(0, 0, 480, 360);
  const bars = [0.22, 0.3, 0.38, 0.52, 0.6, 0.78, 0.95];
  bars.forEach((v, i) => {
    const bh = v * 270, x = 40 + i * 58, fill = g.createLinearGradient(0, 330 - bh, 0, 330);
    fill.addColorStop(0, `rgb(${70 - i * 8},${70 - i * 8},${70 - i * 8})`); fill.addColorStop(1, '#9a9a9a');
    g.fillStyle = fill; g.beginPath(); g.roundRect(x, 330 - bh, 40, bh, 6); g.fill();
  });
  g.strokeStyle = '#111'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(50, 250); g.lineTo(150, 205); g.lineTo(230, 215); g.lineTo(330, 130); g.lineTo(430, 50); g.stroke();
  g.fillStyle = '#111'; g.beginPath(); g.moveTo(448, 28); g.lineTo(404, 40); g.lineTo(436, 76); g.closePath(); g.fill();
  return c;
}

/** Acrescenta ao caminho atual uma grade girada de pontos, com tamanho dado por `field`. `grow` (0..1) escala cada ponto na entrada. */
function screen(ctx, field, { width, height, cell, angle, grow }) {
  const c = Math.cos(angle), s = Math.sin(angle), n = Math.ceil((Math.hypot(width, height) / 2 + cell) / cell);
  const ox = width / 2, oy = height / 2, max = cell * 0.5 * 1.18;
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const x = ox + (i * c - j * s) * cell, y = oy + (i * s + j * c) * cell;
    if (x < -cell || y < -cell || x > width + cell || y > height + cell) continue;
    const r = max * Math.sqrt(field(x, y)) * (grow ? grow(x, y) : 1);
    if (r > 0.25) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
  }
}

const CSS = `
.kk-halftone-background-root{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;touch-action:pan-y;color:${PALETTE.ice800};background:#fff;container-type:inline-size}
.kk-halftone-background-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .3s ease-out;pointer-events:none}
.kk-halftone-background-text{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:26em;padding:0 20px 54px;text-align:center;pointer-events:none}
.kk-halftone-background-text h3{margin:0;font-size:clamp(22px,7cqw,44px);line-height:1.05;letter-spacing:-.03em;font-weight:700;color:var(--ink,${PALETTE.ink});text-shadow:0 0 14px #fff,0 0 4px #fff}
.kk-halftone-background-text p{margin:0;max-width:24em;font-size:clamp(12px,3.2cqw,16px);line-height:1.4;color:var(--mut,${PALETTE.mut});text-shadow:0 0 10px #fff,0 0 3px #fff}
.kk-halftone-background-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:6px;justify-content:center}
.kk-halftone-background-chip{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid ${PALETTE.ice300};background:rgba(255,255,255,.92);color:${PALETTE.ice800};font-family:inherit;font-weight:600;font-size:12px;line-height:1;cursor:pointer}
.kk-halftone-background-chip[aria-pressed=true]{background:${PALETTE.ice700};border-color:${PALETTE.ice700};color:#fff}
.kk-halftone-background-chip:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
`;

export default function mount(stage) {
  ensureStyle('halftone-background', CSS);
  const off = disposer();
  const reduceMotion = reduced();

  const canvas = h('canvas', { class: 'kk-halftone-background-canvas', 'aria-hidden': 'true' });
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas'), baseCtx = base.getContext('2d');
  const root = h('div', { class: 'kk-halftone-background-root' }, canvas,
    h('div', { class: 'kk-halftone-background-text' },
      h('h3', {}, 'Impresso em pontos'),
      h('p', {}, 'Passe o mouse ou arraste o dedo: a lupa mostra o detalhe.')));
  const cfg = { source: 'sphere', loupe: true, pitch: 9 };
  const picture = chartPicture();
  const bar = h('div', { class: 'kk-halftone-background-bar' });
  const mk = (label, pressed, fn) => { const b = h('button', { type: 'button', class: 'kk-halftone-background-chip', 'aria-pressed': String(pressed), onclick: () => fn(b) }, label); return b; };
  const pick = (kind) => (b) => { cfg.source = kind; for (const s of bar.querySelectorAll('[data-src]')) s.setAttribute('aria-pressed', String(s === b)); build(); };
  const sphereBtn = mk('Esfera', true, pick('sphere')), chartBtn = mk('Gráfico', false, pick('chart'));
  sphereBtn.dataset.src = 'sphere'; chartBtn.dataset.src = 'chart';
  const loupeBtn = mk('Lupa', true, (b) => { cfg.loupe = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(cfg.loupe)); if (!cfg.loupe) hide(); });
  const coarseBtn = mk('Grosso', false, (b) => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); cfg.pitch = on ? 14 : 9; build(); });
  bar.append(sphereBtn, chartBtn, loupeBtn, coarseBtn); root.append(bar); stage.append(root);
  if (!ctx || !baseCtx) return () => root.remove();

  let width = 0, height = 0, dpr = 1, field = null, raf = 0, last = 0, visible = true, introStart = reduceMotion ? -1 : 0;
  const theta = Math.PI / 4;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, r: 0, target: 0, placed: false };
  const ink = () => getComputedStyle(root).color;

  // Entrada: varredura diagonal, cada ponto cresce ao ser alcançado pela frente.
  const introGrow = (now) => {
    if (introStart === 0) return () => 0; // esperando entrar na tela: nada impresso ainda
    if (introStart < 0) return undefined;
    const t = (now - introStart) / INTRO_MS;
    return (x, y) => { const k = clamp((t * 1.5 - (x + y) / (width + height)) * 3, 0, 1); return 1 - (1 - k) ** 3; };
  };
  // A impressão cheia é feita uma vez por tamanho/imagem e copiada a cada quadro.
  const renderBase = (now = performance.now()) => {
    if (!field) return;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0); baseCtx.clearRect(0, 0, width, height);
    baseCtx.fillStyle = ink(); baseCtx.beginPath();
    screen(baseCtx, field, { width, height, cell: cfg.pitch, angle: theta, grow: introGrow(now) });
    baseCtx.fill();
  };
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(base, 0, 0);
    if (!field || lens.r < 1) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Sob a lupa: apaga a retícula grossa e imprime de novo, mais fina.
    ctx.save(); ctx.beginPath(); ctx.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2); ctx.clip();
    ctx.clearRect(lens.x - lens.r, lens.y - lens.r, lens.r * 2, lens.r * 2);
    ctx.fillStyle = ink(); ctx.beginPath();
    const size = lens.r * 2 + cfg.pitch;
    ctx.translate(lens.x - size / 2, lens.y - size / 2);
    screen(ctx, (x, y) => field(x + lens.x - size / 2, y + lens.y - size / 2), { width: size, height: size, cell: cfg.pitch / LOUPE_DETAIL, angle: theta });
    ctx.fill(); ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.beginPath(); ctx.arc(lens.x, lens.y, lens.r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = ink(); ctx.globalAlpha = 0.25; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
  };
  function build() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    width = r.width; height = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = base.width = Math.round(width * dpr); canvas.height = base.height = Math.round(height * dpr);
    field = (cfg.source === 'chart' ? imageField(picture, width, height) : null) ?? sphereField(width, height);
    renderBase(); draw();
  }
  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60; last = now;
    let busy = false;
    if (introStart > 0) {
      renderBase(now);
      if (now - introStart > INTRO_MS * 1.6) { introStart = -1; renderBase(now); } else busy = true;
    }
    const k = 1 - Math.exp(-dt / LOUPE_LAG);
    lens.x += (lens.tx - lens.x) * k; lens.y += (lens.ty - lens.y) * k;
    lens.r += (lens.target - lens.r) * (1 - Math.exp(-dt / 0.06)); // a lupa abre e fecha rápido, e nunca do nada
    if (lens.target === 0 && lens.r < LOUPE * 0.4) lens.r = 0;
    busy ||= Math.abs(lens.tx - lens.x) + Math.abs(lens.ty - lens.y) > 0.3 || Math.abs(lens.target - lens.r) > 0.3;
    draw();
    if (busy) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } };

  build(); canvas.style.opacity = '1';
  let sizeKey = '';
  const ro = new ResizeObserver(() => { const k = `${canvas.clientWidth}x${canvas.clientHeight}`; if (k !== sizeKey) { sizeKey = k; build(); } });
  ro.observe(canvas); off(() => ro.disconnect());
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && document.visibilityState === 'visible';
    if (visible && introStart === 0 && e.intersectionRatio > 0.3) introStart = performance.now();
    start();
  }, { threshold: [0, 0.3] });
  io.observe(root); off(() => io.disconnect());
  const onVis = () => { visible = document.visibilityState === 'visible'; start(); };
  document.addEventListener('visibilitychange', onVis); off(() => document.removeEventListener('visibilitychange', onVis));

  function place(e) {
    if (!cfg.loupe || e.target.closest?.('button')) return;
    const r = canvas.getBoundingClientRect();
    lens.tx = e.clientX - r.left; lens.ty = e.clientY - r.top;
    if (!lens.placed || reduceMotion) { lens.x = lens.tx; lens.y = lens.ty; lens.placed = true; }
    lens.target = LOUPE; if (reduceMotion) lens.r = LOUPE;
    start();
  }
  function hide() { lens.target = 0; lens.placed = false; if (reduceMotion) lens.r = 0; start(); }
  const onMove = (e) => { if (e.pointerType === 'mouse' || e.buttons) place(e); };
  const onUp = (e) => { if (e.pointerType !== 'mouse') hide(); };
  root.addEventListener('pointermove', onMove); root.addEventListener('pointerdown', place); root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', hide); root.addEventListener('pointerleave', hide);

  return () => {
    cancelAnimationFrame(raf); off.run();
    root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerdown', place); root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', hide); root.removeEventListener('pointerleave', hide); root.remove();
  };
}
