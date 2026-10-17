// Fundo "magnetic dots": grade de pontos que são atraídos pelo ponteiro e voltam com mola.
// Canvas 2D próprio, sem dependências. Sem movimento (reduzir movimento / preferência desligada) fica uma grade estática.
import { motionEnabled } from './motion.js';

export function magneticDots(host, { gap = 30, radius = 150, pull = 0.32, color = '190,233,255' } = {}) {
  const cv = document.createElement('canvas'); cv.className = 'mdots'; cv.setAttribute('aria-hidden', 'true'); host.prepend(cv);
  const ctx = cv.getContext('2d'); let w = 0, h = 0, dpr = 1, dots = [], raf = 0, running = false;
  const mouse = { x: -9999, y: -9999, active: false };
  function build() {
    const r = host.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); w = r.width; h = r.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = []; const cols = Math.ceil(w / gap) + 1, rows = Math.ceil(h / gap) + 1; const ox = (w - (cols - 1) * gap) / 2, oy = (h - (rows - 1) * gap) / 2;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const x = ox + i * gap, y = oy + j * gap; dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 }); }
  }
  function frame() {
    ctx.clearRect(0, 0, w, h); let moving = false;
    for (const d of dots) {
      let near = 0;
      if (mouse.active) { const dx = mouse.x - d.hx, dy = mouse.y - d.hy; const dist = Math.hypot(dx, dy);
        if (dist < radius) { near = 1 - dist / radius; const f = near * near * pull; d.vx += (dx * f - (d.x - d.hx) * 0.0) * 0.12; d.vy += (dy * f) * 0.12; } }
      d.vx += (d.hx - d.x) * 0.08; d.vy += (d.hy - d.y) * 0.08; d.vx *= 0.82; d.vy *= 0.82; d.x += d.vx; d.y += d.vy;
      if (Math.abs(d.vx) > 0.01 || Math.abs(d.vy) > 0.01 || near) moving = true;
      const a = 0.22 + near * 0.7; const rad = 1.3 + near * 2.2;
      ctx.beginPath(); ctx.arc(d.x, d.y, rad, 0, 6.2832); ctx.fillStyle = `rgba(${color},${a})`; ctx.fill();
    }
    raf = moving || mouse.active ? requestAnimationFrame(frame) : 0;
  }
  const kick = () => { if (!raf && motionEnabled()) raf = requestAnimationFrame(frame); };
  const move = (e) => { const r = host.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true; kick(); };
  const leave = () => { mouse.active = false; kick(); };
  host.addEventListener('pointermove', move, { passive: true }); host.addEventListener('pointerleave', leave); host.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') leave(); });
  const ro = new ResizeObserver(() => { build(); ctx.clearRect(0, 0, w, h); frame(); }); ro.observe(host);
  build(); frame();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); cv.remove(); };
}
