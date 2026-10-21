// Card com inclinação 3D e brilho que segue o mouse (porte, em JS puro, do TiltCard do be-ui: perspective + rotateX/rotateY
// com mola e um radial-gradient de brilho). Só liga com mouse de verdade (hover + ponteiro fino) e respeita
// prefers-reduced-motion: em toque ou com movimento reduzido o card fica parado, como antes.
const SPRING = { stiffness: 200, damping: 15, mass: 0.3 }; // mesmos valores do SPRING_MOUSE

export function tiltCard(el, { max = 12, glare = true } = {}) {
  if (!el || !window.matchMedia) return () => {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  if (reduce.matches || !hover.matches) return () => {};

  el.style.transformStyle = 'preserve-3d';
  el.style.willChange = 'transform';
  let shine = null;
  if (glare) {
    shine = document.createElement('div');
    shine.setAttribute('aria-hidden', 'true');
    shine.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:.15;z-index:2;background:radial-gradient(circle at 50% 50%,#fff,transparent 50%)';
    el.appendChild(shine);
  }

  const s = { rx: 0, ry: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  let raf = 0; let last = 0;
  const apply = () => {
    el.style.transform = `perspective(1000px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`;
  };
  const step = (now) => {
    const dt = Math.min(0.032, (now - (last || now)) / 1000 || 0.016); last = now;
    for (const [p, v, t] of [['rx', 'vx', 'tx'], ['ry', 'vy', 'ty']]) {
      const force = -SPRING.stiffness * (s[p] - s[t]) - SPRING.damping * s[v];
      s[v] += (force / SPRING.mass) * dt; s[p] += s[v] * dt;
    }
    apply();
    const still = Math.abs(s.rx - s.tx) < 0.005 && Math.abs(s.ry - s.ty) < 0.005 && Math.abs(s.vx) < 0.01 && Math.abs(s.vy) < 0.01;
    if (still) { raf = 0; last = 0; s.rx = s.tx; s.ry = s.ty; apply(); return; }
    raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

  const onMove = (e) => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
    s.ty = (px - 0.5) * max; s.tx = (0.5 - py) * max;
    if (shine) shine.style.background = `radial-gradient(circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%,#fff,transparent 50%)`;
    kick();
  };
  const onLeave = () => { s.tx = 0; s.ty = 0; kick(); };
  el.addEventListener('mousemove', onMove); el.addEventListener('mouseleave', onLeave);
  return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); shine?.remove(); el.style.transform = ''; };
}
