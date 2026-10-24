// Lightbox Grid — porte em JS puro do componente "Lightbox Grid" .
import { h, svg, ensureStyle, clamp, reduced, disposer } from '../kit.js';

/* ---------- Imagens do demo: paisagens em SVG, geradas aqui em tons de azul (nada externo) ---------- */
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// Crista de montanha suave: pontos aleatórios ligados por curvas quadráticas e fechados até a base.
function ridge(w, h, base, amp, seed, steps = 9) {
  const r = rng(seed), pts = Array.from({ length: steps + 1 }, (_, i) => [(i / steps) * w, base - r() * amp]);
  let d = `M0 ${h}L${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return `${d}L${w} ${pts[pts.length - 1][1].toFixed(1)}L${w} ${h}Z`;
}
const stops = (cols) => cols.map((c, i) => `<stop offset="${(i / (cols.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
const circle = (cx, cy, r, fill, op = 1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${op}"/>`;

function scene({ w, h, sky, layers, sun, extra = () => '', seed }) {
  const layerSvg = layers.map((c, i) => `<path d="${ridge(w, h, h * (0.5 + i * 0.1), h * (0.2 - i * 0.02), seed + i * 7)}" fill="${c}"/>`).join('');
  const sunSvg = sun ? `<defs><radialGradient id="s"><stop offset="0" stop-color="${sun.color}" stop-opacity=".9"/><stop offset="1" stop-color="${sun.color}" stop-opacity="0"/></radialGradient></defs>${circle(w * sun.x, h * sun.y, sun.r * 2.6, 'url(#s)')}${circle(w * sun.x, h * sun.y, sun.r, sun.color, 0.95)}` : '';
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops(sky)}</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${sunSvg}${layerSvg}${extra(w, h, rng(seed + 99))}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
}
const clouds = (n, y0, y1, op) => (w, h, r) => Array.from({ length: n }, () => {
  const cx = r() * w, cy = h * (y0 + r() * (y1 - y0)), rx = w * (0.14 + r() * 0.18);
  return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * 0.22).toFixed(0)}" fill="#fff" opacity="${op}"/>`;
}).join('');
const trees = (w, h, r) => Array.from({ length: 34 }, () => {
  const x = r() * w, y = h * (0.62 + r() * 0.36), s = h * (0.05 + r() * 0.06);
  return `<path d="M${x.toFixed(0)} ${(y - s * 2).toFixed(0)}L${(x + s * 0.7).toFixed(0)} ${y.toFixed(0)}L${(x - s * 0.7).toFixed(0)} ${y.toFixed(0)}Z" fill="${r() > 0.5 ? '#0f3560' : '#164a7c'}"/>`;
}).join('');
const lake = (w, h) => `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#7fb4e0"/><rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#2f7bbd" opacity=".35"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${w * (0.2 + i * 0.1)}" y="${h * (0.76 + i * 0.03)}" width="${w * 0.18}" height="3" rx="1.5" fill="#fff" opacity=".35"/>`).join('')}`;
const falls = (w, h) => `<path d="M${w * 0.38} ${h * 0.18}H${w * 0.62}L${w * 0.66} ${h}H${w * 0.34}Z" fill="#fff" opacity=".85"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${w * (0.41 + i * 0.04)}" y="${h * 0.2}" width="3" height="${h * 0.75}" fill="#a5cdee" opacity=".7"/>`).join('')}<ellipse cx="${w * 0.5}" cy="${h * 0.94}" rx="${w * 0.24}" ry="${h * 0.035}" fill="#fff" opacity=".6"/>`;
const rays = (w, h) => Array.from({ length: 5 }, (_, i) => `<path d="M${w * (0.2 + i * 0.14)} 0L${w * (0.26 + i * 0.14)} 0L${w * (0.1 + i * 0.2)} ${h}L${w * (0.02 + i * 0.2)} ${h}Z" fill="#e3f0fb" opacity=".1"/>`).join('');

const L = { w: 1200, h: 800 }, P = { w: 900, h: 1200 };
const IMAGES = [
  { ...L, alt: 'Lago ao pé das montanhas', caption: 'Margem do lago, de manhã cedo', src: scene({ ...L, seed: 11, sky: ['#7fb4e0', '#c9e1f6', '#f2f8fe'], layers: ['#a5cdee', '#4a95d2', '#1f5f9b'], sun: { x: 0.72, y: 0.3, r: 46, color: '#fff' }, extra: (w, h) => lake(w, h) }) },
  { ...P, alt: 'Picos acima das nuvens', caption: 'Acima da linha de nuvens', src: scene({ ...P, seed: 23, sky: ['#0f3560', '#2f7bbd', '#a5cdee'], layers: ['#164a7c', '#1f5f9b'], sun: { x: 0.3, y: 0.22, r: 40, color: '#e3f0fb' }, extra: clouds(9, 0.55, 0.95, 0.75) }) },
  { ...L, alt: 'Colinas na névoa', caption: 'Névoa sobre as colinas', src: scene({ ...L, seed: 37, sky: ['#c9e1f6', '#e3f0fb', '#f2f8fe'], layers: ['#c9e1f6', '#a5cdee', '#7fb4e0', '#4a95d2'], sun: { x: 0.25, y: 0.28, r: 34, color: '#fff' }, extra: clouds(6, 0.45, 0.8, 0.35) }) },
  { ...P, alt: 'Luz atravessando uma floresta', caption: 'Floresta, fim de tarde', src: scene({ ...P, seed: 41, sky: ['#0f3560', '#164a7c', '#4a95d2'], layers: ['#1f5f9b', '#164a7c'], sun: { x: 0.65, y: 0.18, r: 38, color: '#c9e1f6' }, extra: (w, h, r) => rays(w, h) + trees(w, h, r) }) },
  { ...L, alt: 'Sol se pondo sobre um vale', caption: 'Vale ao pôr do sol', src: scene({ ...L, seed: 53, sky: ['#0f3560', '#2f7bbd', '#a5cdee', '#e3f0fb'], layers: ['#4a95d2', '#1f5f9b', '#164a7c', '#0f3560'], sun: { x: 0.5, y: 0.42, r: 70, color: '#f2f8fe' } }) },
  { ...P, alt: 'Cachoeira', caption: 'Cachoeira depois da chuva', src: scene({ ...P, seed: 67, sky: ['#a5cdee', '#7fb4e0', '#2f7bbd'], layers: ['#1f5f9b', '#0f3560'], extra: (w, h) => falls(w, h) }) },
];

/* ---------- Animação: molas e transições sobre um conjunto de valores ---------- */
const OPEN_RADIUS = 10, MARGIN = 48, MARGIN_SMALL = 12, CAPTION_ROOM = 56;
const DISMISS_DISTANCE = 110, DISMISS_SPEED = 0.55, SWIPE_SPEED = 0.45, AXIS_LOCK = 6;
const OPEN = { type: 'spring', duration: 0.5, bounce: 0.12 }, CLOSE = { type: 'spring', duration: 0.42, bounce: 0.08 }, SETTLE = { type: 'spring', duration: 0.35, bounce: 0.2 };
const EASE = (t) => 1 - (1 - t) ** 3.2; // saída suave, parecida com cubic-bezier(.23,1,.32,1)

function fitRect(img) {
  const vw = innerWidth, vh = innerHeight, margin = vw < 640 ? MARGIN_SMALL : MARGIN;
  const scale = Math.min((vw - margin * 2) / img.w, (vh - margin * 2 - CAPTION_ROOM) / img.h), width = img.w * scale, height = img.h * scale;
  return { left: (vw - width) / 2, top: (vh - CAPTION_ROOM - height) / 2, width, height };
}
// A transformação e o recorte que fazem a imagem aberta parecer exatamente a miniatura:
// reduzida ao tamanho "cover" da miniatura, levada até ela e cortada na sua caixa.
function thumbFrame(open, thumb, img, radius) {
  const imgRatio = img.w / img.h, thumbRatio = thumb.width / thumb.height;
  const cover = imgRatio > thumbRatio ? thumb.height * imgRatio : thumb.width, scale = cover / open.width;
  return {
    x: thumb.left + thumb.width / 2 - (open.left + open.width / 2), y: thumb.top + thumb.height / 2 - (open.top + open.height / 2), scale,
    ix: (open.width - thumb.width / scale) / 2, iy: (open.height - thumb.height / scale) / 2, ir: radius / scale,
  };
}
const isVisible = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

const icon = (d) => svg('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true', width: 16, height: 16 }, svg('path', { d, stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

export default function mount(stage, ctx) {
  ensureStyle('lightbox-grid', `
.kk-lightbox-grid-wrap{width:100%;padding:8px 0}
.kk-lightbox-grid-grid{list-style:none;margin:0 auto;padding:0;max-width:420px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.kk-lightbox-grid-grid li:first-child{grid-column:span 2;grid-row:span 2}
.kk-lightbox-grid-thumb{position:relative;display:block;width:100%;aspect-ratio:1;padding:0;border:0;overflow:hidden;border-radius:12px;background:var(--ice-100,#e3f0fb);cursor:zoom-in;outline-offset:2px}
.kk-lightbox-grid-thumb:focus-visible{outline:2px solid var(--ice-700,#1f5f9b)}
.kk-lightbox-grid-thumb img{display:block;width:100%;height:100%;object-fit:cover;transition:filter .2s}
.kk-lightbox-grid-thumb:hover img{filter:brightness(.95)}
.kk-lightbox-grid-hint{margin:12px 0 0;text-align:center;font-size:12px;color:var(--mut,#4a6f93)}
.kk-lightbox-grid-view{position:fixed;inset:0;z-index:400;font-family:inherit}
.kk-lightbox-grid-back{position:absolute;inset:0;background:#06182b}
.kk-lightbox-grid-photo{position:absolute;overflow:hidden;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform,clip-path}
.kk-lightbox-grid-photo:active{cursor:grabbing}
.kk-lightbox-grid-photo img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}
.kk-lightbox-grid-ui{position:absolute;inset:0;pointer-events:none}
.kk-lightbox-grid-top{position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:12px;pointer-events:auto}
.kk-lightbox-grid-count{font-size:14px;color:rgba(255,255,255,.7);font-variant-numeric:tabular-nums}
.kk-lightbox-grid-ib{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;pointer-events:auto;transition:background .15s}
.kk-lightbox-grid-ib:hover{background:rgba(255,255,255,.22)}
.kk-lightbox-grid-ib:focus-visible{outline:2px solid #fff}
.kk-lightbox-grid-ib:disabled{opacity:.3;pointer-events:none}
.kk-lightbox-grid-nav{position:absolute;top:50%;transform:translateY(-50%);display:none}
.kk-lightbox-grid-nav.l{left:16px}.kk-lightbox-grid-nav.r{right:16px}
.kk-lightbox-grid-nav.l svg{transform:rotate(180deg)}
.kk-lightbox-grid-cap{position:absolute;left:16px;right:16px;margin:0;text-align:center;font-size:14px;color:rgba(255,255,255,.85)}
@media (min-width:640px){.kk-lightbox-grid-top{top:16px;right:16px}.kk-lightbox-grid-nav{display:flex}}
`);
  const dispose = disposer();
  const noMotion = reduced();

  /* valores animáveis; cada um tem mola ou transição própria */
  const vals = { x: 0, y: 0, scale: 1, ix: 0, iy: 0, ir: OPEN_RADIUS, alpha: 1, fade: 0 };
  const anims = new Map();
  let raf = 0, view = null;

  function apply() {
    if (!view) return;
    view.photo.style.transform = `translate(${vals.x}px,${vals.y}px) scale(${vals.scale})`;
    view.photo.style.clipPath = `inset(${vals.iy}px ${vals.ix}px ${vals.iy}px ${vals.ix}px round ${vals.ir}px)`;
    view.photo.style.opacity = vals.alpha;
    view.back.style.opacity = vals.fade * 0.92;
    view.ui.style.opacity = vals.fade;
  }
  function frame(now) {
    raf = 0;
    for (const [name, a] of [...anims]) {
      const dt = Math.min((now - a.last) / 1000, 1 / 30); a.last = now;
      if (a.type === 'spring') {
        const w0 = (2 * Math.PI) / a.duration, k = w0 * w0, c = 2 * (1 - a.bounce) * w0, n = Math.max(1, Math.ceil(dt / 0.004)), hh = dt / n;
        for (let i = 0; i < n; i++) { a.v += (-k * (vals[name] - a.to) - c * a.v) * hh; vals[name] += a.v * hh; }
        if (Math.abs(vals[name] - a.to) < 0.005 && Math.abs(a.v) < 0.02) { vals[name] = a.to; anims.delete(name); a.done?.(); }
      } else {
        a.t += dt;
        const p = Math.min(1, a.t / a.duration);
        vals[name] = a.from + (a.to - a.from) * EASE(p);
        if (p >= 1) { vals[name] = a.to; anims.delete(name); a.done?.(); }
      }
    }
    apply();
    if (anims.size) raf = requestAnimationFrame(frame);
  }
  function animate(name, to, cfg, velocity = 0, done) {
    anims.set(name, { ...cfg, to, from: vals[name], v: velocity, t: 0, last: performance.now(), done });
    if (!raf) raf = requestAnimationFrame(frame);
  }
  const set = (patch) => { for (const k of Object.keys(patch)) anims.delete(k); Object.assign(vals, patch); apply(); };
  dispose(() => { cancelAnimationFrame(raf); anims.clear(); });

  /* ---------- grade ---------- */
  let active = null, rect = null, settled = false, closing = false, closeTimer = 0;
  const thumbs = IMAGES.map((img, i) => {
    const el = h('button', { type: 'button', class: 'kk-lightbox-grid-thumb', 'aria-label': `Abrir: ${img.alt}`, onClick: () => open(i) }, h('img', { src: img.src, alt: '', draggable: 'false' }));
    return el;
  });
  stage.append(h('div', { class: 'kk-lightbox-grid-wrap' }, h('ul', { class: 'kk-lightbox-grid-grid' }, thumbs.map((t) => h('li', {}, t))),
    h('p', { class: 'kk-lightbox-grid-hint' }, 'Toque numa foto; arraste para baixo para devolvê-la ao lugar.')));

  const frameFor = (index, openRect) => {
    const box = thumbs[index].getBoundingClientRect();
    if (!isVisible(box)) return null;
    return thumbFrame(openRect, box, IMAGES[index], parseFloat(getComputedStyle(thumbs[index]).borderTopLeftRadius) || 0);
  };
  const syncThumbs = () => thumbs.forEach((t, i) => { t.style.opacity = active === i ? '0' : '1'; }); // o espaço fica vazio enquanto a foto está fora dele

  /* ---------- visualizador (anexado ao body, por cima de tudo) ---------- */
  function buildView() {
    const img = h('img', { draggable: 'false', alt: '' });
    const photo = h('div', { class: 'kk-lightbox-grid-photo' }, img);
    const back = h('div', { class: 'kk-lightbox-grid-back', 'aria-hidden': 'true', onClick: () => close() });
    const count = h('span', { class: 'kk-lightbox-grid-count' });
    const closeBtn = h('button', { type: 'button', class: 'kk-lightbox-grid-ib', 'aria-label': 'Fechar', onClick: () => close() }, icon('m4 4 8 8M12 4l-8 8'));
    const prev = h('button', { type: 'button', class: 'kk-lightbox-grid-ib kk-lightbox-grid-nav l', 'aria-label': 'Foto anterior', onClick: () => step(-1) }, icon('m6 3.5 4.5 4.5L6 12.5'));
    const next = h('button', { type: 'button', class: 'kk-lightbox-grid-ib kk-lightbox-grid-nav r', 'aria-label': 'Próxima foto', onClick: () => step(1) }, icon('m6 3.5 4.5 4.5L6 12.5'));
    const cap = h('p', { class: 'kk-lightbox-grid-cap' });
    const ui = h('div', { class: 'kk-lightbox-grid-ui' }, h('div', { class: 'kk-lightbox-grid-top' }, count, closeBtn), prev, next, cap);
    const root = h('div', { class: 'kk-lightbox-grid-view', role: 'dialog', 'aria-modal': 'true' }, back, photo, ui);
    return { root, photo, img, back, ui, count, closeBtn, prev, next, cap };
  }
  function paintView() {
    const im = IMAGES[active];
    view.img.src = im.src;
    view.root.setAttribute('aria-label', im.caption ?? im.alt);
    view.img.alt = im.alt;
    Object.assign(view.photo.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    view.count.textContent = `${active + 1} / ${IMAGES.length}`;
    view.prev.disabled = active === 0; view.next.disabled = active === IMAGES.length - 1;
    view.cap.textContent = im.caption; view.cap.style.top = rect.top + rect.height + 18 + 'px';
  }

  let drag = null, prevOverflow = '';
  function open(index) {
    if (view) return;
    clearTimeout(closeTimer);
    const target = fitRect(IMAGES[index]), from = frameFor(index, target);
    active = index; rect = target; closing = false; settled = false;
    view = buildView(); document.body.append(view.root);
    prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; // trava a página atrás
    paintView(); syncThumbs(); wireView();
    view.closeBtn.focus({ preventScroll: true });
    if (!from || noMotion) {
      set({ x: 0, y: 0, scale: 1, ix: 0, iy: 0, ir: OPEN_RADIUS, fade: 0, alpha: 0 });
      animate('alpha', 1, { type: 'tween', duration: 0.18 });
      animate('fade', 1, { type: 'tween', duration: 0.18 }, 0, () => { settled = true; });
      return;
    }
    set({ x: from.x, y: from.y, scale: from.scale, ix: from.ix, iy: from.iy, ir: from.ir, fade: 0, alpha: 1 });
    for (const k of ['x', 'y']) animate(k, 0, OPEN);
    animate('scale', 1, OPEN); animate('ix', 0, OPEN); animate('iy', 0, OPEN); animate('ir', OPEN_RADIUS, OPEN);
    animate('fade', 1, { type: 'tween', duration: 0.3 }, 0, () => { settled = true; });
  }
  function close(velocity) {
    if (!view || closing) return;
    closing = true;
    const index = active;
    thumbs[index].scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' }); // instantâneo, para medir o lugar onde ele vai ficar
    const to = frameFor(index, rect);
    const finish = () => {
      teardownView(); active = null; rect = null; closing = false; syncThumbs();
      thumbs[index].focus({ preventScroll: true });
    };
    if (!to || noMotion) { animate('alpha', 0, { type: 'tween', duration: 0.16 }); animate('fade', 0, { type: 'tween', duration: 0.16 }, 0, finish); return; }
    // Um arremesso leva a velocidade para o voo de volta.
    animate('x', to.x, CLOSE, (velocity?.x ?? 0) * 1000); animate('y', to.y, CLOSE, (velocity?.y ?? 0) * 1000);
    animate('scale', to.scale, CLOSE); animate('ix', to.ix, CLOSE); animate('iy', to.iy, CLOSE); animate('ir', to.ir, CLOSE);
    animate('fade', 0, { type: 'tween', duration: 0.28 });
    closeTimer = setTimeout(finish, 420); // a mola do recorte assenta por último; revela a miniatura quando pousa
  }
  function step(dir) {
    const next = active + dir;
    if (!view || next < 0 || next >= IMAGES.length) return;
    active = next; rect = fitRect(IMAGES[next]); paintView(); syncThumbs();
    set({ y: 0, scale: 1, ix: 0, iy: 0, ir: OPEN_RADIUS, fade: 1 });
    if (noMotion) { set({ x: 0, alpha: 1 }); return; }
    set({ x: dir * 72, alpha: 0 }); // a próxima foto entra pelo lado de onde foi deslizada
    animate('x', 0, { type: 'tween', duration: 0.32 }); animate('alpha', 1, { type: 'tween', duration: 0.22 });
  }
  function teardownView() {
    if (!view) return;
    view.root.remove(); view = null; anims.clear(); cancelAnimationFrame(raf); raf = 0;
    document.documentElement.style.overflow = prevOverflow;
    removeEventListener('resize', onWinResize);
  }
  const onWinResize = () => { if (view && !closing) { rect = fitRect(IMAGES[active]); paintView(); } };

  function wireView() {
    addEventListener('resize', onWinResize);
    const { photo, root } = view;
    photo.addEventListener('pointerdown', (e) => {
      if (!settled || closing || (e.button !== undefined && e.button !== 0)) return;
      photo.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, axis: null, samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
    });
    // Puxar para longe encolhe a foto e deixa a página aparecer.
    const followVertical = (dx, dy) => set({ x: dx, y: dy, scale: 1 - Math.min(Math.abs(dy) / innerHeight, 1) * 0.45, fade: 1 - Math.min(Math.abs(dy) / 360, 1) * 0.85 });
    // Além da primeira ou da última foto o arrasto só cede um pouco.
    const followHorizontal = (dx) => set({ x: (dx > 0 && active === 0) || (dx < 0 && active === IMAGES.length - 1) ? dx * 0.25 : dx });
    photo.addEventListener('pointermove', (e) => {
      const d = drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
      if (!d.axis) { if (Math.hypot(dx, dy) < AXIS_LOCK) return; d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
      d.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      if (d.samples.length > 5) d.samples.shift();
      if (d.axis === 'y') followVertical(dx, dy); else followHorizontal(dx);
    });
    const up = (e) => {
      const d = drag;
      if (!d || d.id !== e.pointerId) return;
      drag = null;
      const first = d.samples[0], last = d.samples[d.samples.length - 1] ?? first, dt = Math.max(1, last.t - first.t);
      const vel = { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
      if (d.axis === 'y') {
        if (Math.abs(e.clientY - d.startY) > DISMISS_DISTANCE || Math.abs(vel.y) > DISMISS_SPEED) { close(vel); return; }
        animate('x', 0, SETTLE); animate('y', 0, SETTLE); animate('scale', 1, SETTLE); animate('fade', 1, { type: 'tween', duration: 0.2 });
      } else if (d.axis === 'x') {
        const dx = e.clientX - d.startX, far = Math.abs(dx) > rect.width * 0.22 || Math.abs(vel.x) > SWIPE_SPEED;
        if (far && dx < 0 && active < IMAGES.length - 1) step(1);
        else if (far && dx > 0 && active > 0) step(-1);
        else animate('x', 0, SETTLE);
      }
    };
    photo.addEventListener('pointerup', up);
    photo.addEventListener('pointercancel', up);
    photo.addEventListener('lostpointercapture', up);
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') { // mantém o foco dentro do visualizador
        const f = [...root.querySelectorAll('button:not(:disabled)')], first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  return () => {
    clearTimeout(closeTimer);
    teardownView();
    dispose.run();
  };
}
