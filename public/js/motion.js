// Animações da Neva Growth (GSAP). Tudo é opcional: sem GSAP, com "reduzir movimento" do sistema
// ou com a preferência desligada em Configurações, nada é escondido nem animado.
import { shaderBg } from './shader-bg.js';
const G = window.gsap;
const KEY = 'neva-motion';
const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const motionEnabled = () => Boolean(G) && !mq.matches && stored() !== 'off' && !/[?&]nomotion/.test(location.search);
export function setMotion(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* sem storage */ }
  document.documentElement.classList.toggle('motion', motionEnabled());
  shaderBg.setAnimated(on);
  if (!on) { kill(); G?.globalTimeline.clear(); bg?.remove(); bg = null; mo?.disconnect(); mo = null; document.querySelectorAll('.navind').forEach((n) => { n.style.display = 'none'; }); }
  else { startBackground(); observeView(); magnetic(); document.querySelectorAll('.navind').forEach((n) => { n.style.display = ''; }); }
}
const fine = () => window.matchMedia?.('(hover:hover) and (pointer:fine)').matches;
const small = () => innerWidth < 860;
let bg = null; let mo = null; let magOn = false; let parOn = false;
const loops = new Set();
const track = (t) => { loops.add(t); return t; };
export function kill() { loops.forEach((t) => t.kill?.()); loops.clear(); }

// ---------- fundo: manchas de luz à deriva + parallax do ponteiro
function startBackground() {
  if (!motionEnabled() || bg) return;
  bg = document.createElement('div'); bg.className = 'bgfx'; bg.setAttribute('aria-hidden', 'true');
  document.body.prepend(bg);
  // neve leve só na tela de entrada
  const snow = document.createElement('div'); snow.className = 'snow'; bg.append(snow);
  const count = small() ? 14 : 34;
  for (let i = 0; i < count; i++) {
    const f = document.createElement('b'); snow.append(f);
    const s = G.utils.random(3, 8);
    G.set(f, { width: s, height: s, x: G.utils.random(0, innerWidth), y: -20, opacity: G.utils.random(0.35, 0.9) });
    G.to(f, { y: innerHeight + 30, x: `+=${G.utils.random(-80, 80)}`, duration: G.utils.random(9, 18), ease: 'none', repeat: -1, delay: -G.utils.random(0, 18) });
  }
  snow.style.opacity = '0';
}
export function snow(on) { if (!bg) return; const s = bg.querySelector('.snow'); if (s) G.to(s, { opacity: on ? 1 : 0, duration: 0.8 }); }

// ---------- utilidades
const brl = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
function splitWords(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.w')];
  el.dataset.split = '1';
  const out = [];
  const walk = (node) => {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3 && c.textContent.trim()) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((t) => { if (!t) return; if (/^\s+$/.test(t)) { frag.append(' '); return; } const w = document.createElement('span'); w.className = 'w'; w.textContent = t; out.push(w); frag.append(w); });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && !c.classList.contains('badge')) walk(c);
    });
  };
  walk(el); return out;
}
function countUp(el) {
  const v = Number(el.dataset.v); if (!Number.isFinite(v) || el.dataset.counted) return;
  el.dataset.counted = '1'; const o = { n: 0 };
  G.to(o, { n: v, duration: 1.2, ease: 'power2.out', delay: 0.15, onUpdate: () => { el.textContent = brl(o.n); }, onComplete: () => { el.textContent = brl(v); } });
}
const inView = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 1.05 && r.bottom > -40; };

// ---------- entrada de elementos (observador): tudo que aparece em #view ganha entrada suave
// Mascotes são sempre fixos: nenhum contêiner que os carrega (promo, vazio, builder, login) é animado.
const SEL = '.hero,.card:not(.modal),.col,.lcard,tbody tr,.refcard,.siteCard,.vcard,.libitem,.tpl,.bmodel,.walletpanel,.composer,.auth>.card,.palette,.dropdown';
let queue = []; let raf = 0; const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
  es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); reveal([e.target]); } });
}, { rootMargin: '0px 0px -6% 0px' }) : null;
function prep(el) { return !el.closest('.ide,.modal-back') && !el.dataset.fx; }
function reveal(els) {
  els = els.filter((e) => e.isConnected);
  if (!els.length) return;
  G.fromTo(els, { y: 22, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', stagger: { each: 0.045, amount: 0.5 }, clearProps: 'transform,opacity', overwrite: 'auto' });
}
function flush() {
  raf = 0; const els = queue.filter((e) => e.isConnected && prep(e)); queue = [];
  const now = []; const later = [];
  els.forEach((e) => { e.dataset.fx = '1'; (inView(e) ? now : later).push(e); });
  // hero tem coreografia própria
  now.filter((e) => e.classList.contains('hero')).forEach(heroIn);
  reveal(now.filter((e) => !e.classList.contains('hero')));
  later.forEach((e) => { G.set(e, { opacity: 0, y: 22 }); io?.observe(e); setTimeout(() => { if (e.isConnected && G.getProperty(e, 'opacity') < 1) { io?.unobserve(e); G.to(e, { opacity: 1, y: 0, duration: 0.3, clearProps: 'transform,opacity' }); } }, 2500); });
  document.querySelectorAll('.money[data-v]').forEach(countUp);
  document.querySelectorAll('.progress i,.track i').forEach((i) => { if (!i.dataset.fx && !i.closest('.ide')) { i.dataset.fx = '1'; G.from(i, { width: 0, duration: 1, ease: 'power3.out', delay: 0.2 }); } });
  document.querySelectorAll('svg.chart').forEach((s) => { if (!s.dataset.fx) { s.dataset.fx = '1'; chartIn(s); } });
  document.querySelectorAll('.pill.on,.ktabs button.on,.atabs button.on').forEach((p) => { if (!p.dataset.fx) { p.dataset.fx = '1'; G.fromTo(p, { scale: 0.9 }, { scale: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform' }); } });
}
function heroIn(hero) {
  // só o texto e os indicadores entram; o bloco, a ilustração e o mascote ficam parados
  const tl = G.timeline({ defaults: { ease: 'power3.out' } });
  const k = hero.querySelector('.kicker'); if (k) tl.from(k, { x: -18, opacity: 0, duration: 0.5, clearProps: 'transform,opacity' }, 0);
  const h1 = hero.querySelector('h1');
  if (h1) { const w = splitWords(h1); tl.from(w, { yPercent: 70, opacity: 0, rotate: 2.5, duration: 0.7, stagger: 0.06, ease: 'power4.out', clearProps: 'transform,opacity' }, 0.05); }
  const p = hero.querySelector('.hero-main>p'); if (p) tl.from(p, { y: 14, opacity: 0, duration: 0.55, clearProps: 'transform,opacity' }, 0.35);
  const acts = hero.querySelectorAll('.hero-actions>*'); if (acts.length) tl.from(acts, { y: -14, opacity: 0, scale: 0.92, duration: 0.5, stagger: 0.08, ease: 'back.out(1.8)', clearProps: 'transform,opacity' }, 0.4);
  const stats = hero.querySelectorAll('.hero-stats .stat,.pstrip .ps,.chips3>*'); if (stats.length) tl.from(stats, { y: 18, opacity: 0, duration: 0.55, stagger: 0.07, clearProps: 'transform,opacity' }, 0.5);
}
function chartIn(svg) {
  svg.querySelectorAll('path').forEach((p) => { try { const L = p.getTotalLength(); G.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', delay: 0.25, clearProps: 'strokeDasharray,strokeDashoffset' }); } catch { /* sem geometria */ } });
  svg.querySelectorAll('circle').forEach((c, i) => G.from(c, { scale: 0, transformOrigin: '50% 50%', duration: 0.4, delay: 0.6 + i * 0.03, ease: 'back.out(3)' }));
  svg.querySelectorAll('rect').forEach((r, i) => G.from(r, { scaleY: 0, transformOrigin: '50% 100%', transformBox: 'fill-box', duration: 0.8, delay: 0.1 + i * 0.07, ease: 'elastic.out(1,0.7)' }));
}

export function observeView() {
  if (!motionEnabled() || mo) return;
  const view = document.getElementById('view') || document.getElementById('app'); if (!view) return;
  mo = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.matches?.(SEL)) queue.push(n);
      n.querySelectorAll?.(SEL).forEach((e) => queue.push(e));
      if (n.matches?.('.money[data-v],svg.chart,.progress i,.track i,.pill.on') || n.querySelector?.('.money[data-v],svg.chart,.progress i,.track i,.pill.on')) queue.push(n);
    });
    if (queue.length && !raf) raf = requestAnimationFrame(flush);
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

// ---------- transição entre páginas + barra de progresso
let bar = null;
export function routeStart(view) {
  if (!motionEnabled()) return Promise.resolve();
  kill();
  if (!bar) { bar = document.createElement('div'); bar.className = 'rbar'; document.body.append(bar); }
  G.killTweensOf(bar); G.set(bar, { opacity: 1, scaleX: 0, transformOrigin: '0 50%' }); G.to(bar, { scaleX: 0.8, duration: 1.2, ease: 'power2.out' });
  const cur = view?.firstElementChild; if (!cur) return Promise.resolve();
  return new Promise((res) => G.to(cur, { opacity: 0, y: -10, duration: 0.14, ease: 'power1.in', onComplete: res }));
}
export function routeEnd() {
  if (!bar || !motionEnabled()) return;
  G.to(bar, { scaleX: 1, duration: 0.25, ease: 'power2.out', onComplete: () => G.to(bar, { opacity: 0, duration: 0.3 }) });
}

// ---------- indicador deslizante do menu
export function navIndicator(nav, link) {
  if (!nav) return;
  if (!link) { const o = nav.querySelector('.navind'); if (o) { if (G) G.to(o, { opacity: 0, duration: 0.2 }); else o.style.opacity = '0'; } return; }
  let ind = nav.querySelector('.navind');
  if (!ind) { ind = document.createElement('i'); ind.className = 'navind'; nav.prepend(ind); G.set(ind, { opacity: 0 }); }
  const go = (animate) => {
    if (ind.style.opacity === '0') ind.style.opacity = '';
    const props = { x: link.offsetLeft, y: link.offsetTop, width: link.offsetWidth, height: link.offsetHeight, opacity: 1 };
    if (animate && motionEnabled()) G.to(ind, { ...props, duration: 0.5, ease: 'back.out(1.5)' }); else G.set(ind, props);
  };
  go(ind.dataset.ready === '1'); ind.dataset.ready = '1';
  if (motionEnabled()) G.fromTo(link.querySelector('svg'), { scale: 0.7, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
}
export function shellIn() {
  if (!motionEnabled()) return;
  G.from('.side .brand', { scale: 0, rotate: -90, duration: 0.7, ease: 'back.out(2)' });
  G.from('.nav a,.railbtn', { x: -24, opacity: 0, duration: 0.5, stagger: 0.03, delay: 0.15, ease: 'power3.out', clearProps: 'transform,opacity' });
  G.from('.topbar2>*', { y: -18, opacity: 0, duration: 0.5, stagger: 0.06, delay: 0.1, ease: 'power3.out', clearProps: 'transform,opacity' });
}

// ---------- telas de acesso (login / cadastro / recuperação)
const wordsOf = (el) => {
  const out = [];
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 1) return walk(n);
    if (n.nodeType !== 3) return;
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach((w) => {
      if (!w) return;
      if (/^\s+$/.test(w)) return frag.append(w);
      const o = document.createElement('span'), i = document.createElement('span');
      o.className = 'aw'; i.textContent = w; o.append(i); frag.append(o); out.push(i);
    });
    n.replaceWith(frag);
  });
  walk(el); return out;
};
export function authIn(main, swapped) {
  if (!motionEnabled() || !main) return;
  const form = main.querySelector('.auth-form'), art = main.querySelector('.auth-art'), rev = main.classList.contains('rev');
  const dir = rev ? 1 : -1, tl = G.timeline({ defaults: { ease: 'power3.out' } });
  if (swapped) tl.from(form, { opacity: 0, x: 30 * -dir, duration: 0.45 }, 0);
  else { tl.from(form, { opacity: 0, x: 80 * dir, duration: 0.8 }, 0).from(art, { opacity: 0, x: -80 * dir, scale: 0.97, duration: 0.9 }, 0); }
  tl.from(form.querySelectorAll('.brand,.alabel,.asub,.field,.pwhint,.loginopts,.err-text,.loginbtn,.afoot'), { y: 22, opacity: 0, duration: 0.55, stagger: 0.06, clearProps: 'transform,opacity' }, 0.2);
  const h1 = form.querySelector('h1'); if (h1) { const w = wordsOf(h1); tl.from(w, { yPercent: 110, duration: 0.7, stagger: 0.08, clearProps: 'transform' }, 0.15); }
  const h2 = art.querySelector('h2'); if (h2) { const w = wordsOf(h2); tl.from(w, { yPercent: 110, rotate: 4, duration: 0.9, stagger: 0.1, ease: 'power4.out', clearProps: 'transform' }, 0.35); }
  tl.from(art.querySelectorAll('.akick,.aart-in p,.asafe,.mascot-img'), { y: 18, opacity: 0, duration: 0.6, stagger: 0.08, clearProps: 'transform,opacity' }, 0.5);
  tl.from(art.querySelectorAll('.dust i'), { scale: 0, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'back.out(2)' }, 0.4);
  art.querySelectorAll('.dust i').forEach((d, i) => loops.add(G.to(d, { y: -(14 + (i % 4) * 8), x: (i % 2 ? 1 : -1) * (8 + (i % 3) * 5), duration: 4 + (i % 5), ease: 'sine.inOut', yoyo: true, repeat: -1 })));
  // brilho do botão e inclinação suave do painel de arte seguindo o mouse
  const btn = form.querySelector('.loginbtn'); if (btn && !btn.disabled) loops.add(G.fromTo(btn, { '--shine': '-30%' }, { '--shine': '130%', duration: 2.4, ease: 'power1.inOut', repeat: -1, repeatDelay: 2.4 }));
  if (!small()) { const mv = (e) => { const r = art.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5; G.to(art.querySelectorAll('.wave'), { x: nx * 40, y: ny * 30, duration: 1.2, ease: 'power2.out', overwrite: 'auto' }); G.to(art.querySelector('.aart-in'), { x: nx * -10, y: ny * -8, duration: 1.2, ease: 'power2.out' }); };
    main.addEventListener('pointermove', mv); }
}
export function shake(el) { if (motionEnabled() && el) G.fromTo(el, { x: -10 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.2,0.25)', clearProps: 'transform' }); }

// ---------- micro-interações
export function pop(el) { if (motionEnabled() && el) G.fromTo(el, { scale: 0.94, boxShadow: '0 0 0 0 rgba(47,123,189,.5)' }, { scale: 1, boxShadow: '0 0 0 14px rgba(47,123,189,0)', duration: 0.6, ease: 'back.out(3)', clearProps: 'transform,boxShadow' }); }
export function modalIn(back, box) {
  if (!motionEnabled()) return;
  G.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: 'opacity' });
  G.fromTo(box, small() ? { y: 80, opacity: 0 } : { y: 28, scale: 0.95, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' });
}
export function modalOut(back, box, done) {
  if (!motionEnabled()) return done();
  G.to(box, { y: small() ? 60 : 16, opacity: 0, scale: small() ? 1 : 0.97, duration: 0.18, ease: 'power2.in' });
  G.to(back, { opacity: 0, duration: 0.18, onComplete: done });
}
export function toastIn(el) { if (motionEnabled()) G.fromTo(el, { x: small() ? 0 : 60, y: small() ? 40 : 0, opacity: 0, scale: 0.9 }, { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'transform,opacity' }); }
export function toastOut(el, done) { if (!motionEnabled()) return done(); G.to(el, { opacity: 0, y: 12, duration: 0.25, onComplete: done }); }

// botões magnéticos nos blocos de abertura (só com mouse)
export function magnetic() {
  if (!motionEnabled() || !fine() || magOn) return; magOn = true;
  document.addEventListener('pointermove', (e) => {
    if (!motionEnabled()) return; const b = e.target.closest?.('.hero .btn,.promo .btn,.walletpanel .btn'); if (!b) return;
    const r = b.getBoundingClientRect(); const dx = (e.clientX - (r.left + r.width / 2)) * 0.18; const dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
    G.to(b, { x: dx, y: dy, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { const b = e.target.closest?.('.hero .btn,.promo .btn,.walletpanel .btn'); if (b) G.to(b, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.5)', clearProps: 'transform' }); }, { passive: true });
  // inclinação 3D suave nos cartões de galeria
  document.addEventListener('pointermove', (e) => {
    if (!motionEnabled()) return; const c = e.target.closest?.('.refcard,.siteCard,.vcard,.bmodel'); if (!c) return;
    const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5; const py = (e.clientY - r.top) / r.height - 0.5;
    G.to(c, { rotationY: px * 6, rotationX: -py * 6, transformPerspective: 700, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { const c = e.target.closest?.('.refcard,.siteCard,.vcard,.bmodel'); if (c && !c.contains(e.relatedTarget)) G.to(c, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }); }, { passive: true });
}

export function initMotion() {
  document.documentElement.classList.toggle('motion', motionEnabled());
  shaderBg.init(motionEnabled());
  if (!motionEnabled()) return;
  G.defaults({ ease: 'power3.out', duration: 0.6 });
  startBackground(); observeView(); magnetic();
}
