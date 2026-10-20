// Orbe de estado "gerando": esfera de pontos 3D que gira, com "pop" escalonado ponto a ponto e texto em ondas.
// Port em JS puro das props do GeneratingOrb (21st.dev): depth, speed, duration, stagger, pop, restOpacity, cores.
// Paleta da Neva (azul-gelo): nada de roxo/vermelho do demo original.
import { h } from './ui.js';

const DEFAULTS = {
  size: 160, text: 'Neva Studio', showText: true, depth: 1, speed: 2, duration: 2000, stagger: 100, pop: 1.15, restOpacity: 0.4, dots: 150,
  highlightColor: '#ffffff', haloColor: '#bfe3ff', coreColor: '#2f7bbd', coreColorAlt: '#1d5fa8', textColor: '#ffffff',
};

/** @returns {{ el: HTMLElement, setRunning(on:boolean):void }} */
export function generatingOrb(options = {}) {
  const o = { ...DEFAULTS, ...options };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const letters = Array.from(o.text).map((c, i) => h('span', { class: 'orb-l', style: `animation-duration:${o.duration}ms;animation-delay:${i * o.stagger}ms` }, c));
  const canvas = h('canvas', { class: 'orb-dots', 'aria-hidden': 'true' });
  const orbEl = h('div', { class: 'orb', style: `--orb:${o.size}px;--orb-halo:${o.haloColor};--orb-core:${o.coreColor};--orb-core2:${o.coreColorAlt}` },
    h('i', { class: 'orb-halo' }), h('i', { class: 'orb-core' }), canvas, h('i', { class: 'orb-gloss' }));
  const el = h('div', { class: 'orbwrap', role: 'img', 'aria-label': o.text }, orbEl, o.showText && h('div', { class: 'orb-text', style: `color:${o.textColor}`, 'aria-hidden': 'true' }, letters));

  // Pontos numa esfera (espiral de Fibonacci): posição fixa, a esfera inteira gira.
  const pts = Array.from({ length: o.dots }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / o.dots, r = Math.sqrt(1 - y * y), a = i * 2.399963; return { x: Math.cos(a) * r, y, z: Math.sin(a) * r }; });
  const ctx = canvas.getContext('2d');
  let angle = 0, last = 0, mult = 1, raf = 0, t0 = 0;
  const frame = (now) => {
    if (!el.isConnected && last) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; t0 += dt * 1000;
    const w = canvas.clientWidth, hh = canvas.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (!w || !hh) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, hh);
    if (!reduce) angle += dt * 0.32 * o.speed * mult;
    const R = (w / 2) * 0.9, cx = w / 2, cy = hh / 2, ca = Math.cos(angle), sa = Math.sin(angle), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
    const items = pts.map((p, i) => {
      const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca, y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
      const persp = 1 / (1 - z2 * 0.28 * o.depth);
      const phase = reduce ? 0.5 : (((t0 - i * o.stagger * 0.35) % o.duration) + o.duration) % o.duration / o.duration;
      const bump = Math.max(0, Math.sin(Math.min(1, phase * 2.2) * Math.PI)) * (phase < 0.45 ? 1 : 0);
      return { sx: cx + x1 * R * persp, sy: cy + y2 * R * persp, z: z2, persp, bump };
    }).sort((a, b) => a.z - b.z);
    ctx.fillStyle = o.highlightColor;
    for (const d of items) {
      const front = (d.z + 1) / 2, base = 0.22 + front * 0.78;
      const radius = (w * 0.021) * (0.55 + front * 0.65) * d.persp * (1 + (o.pop - 1) * d.bump * 3);
      ctx.globalAlpha = Math.min(1, (o.restOpacity + (1 - o.restOpacity) * d.bump) * base + d.bump * 0.2);
      ctx.beginPath(); ctx.arc(d.sx, d.sy, Math.max(0.6, radius), 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  raf = requestAnimationFrame(frame);
  return { el, setRunning(on) { mult = on ? 2.4 : 1; el.classList.toggle('running', !!on); } };
}
