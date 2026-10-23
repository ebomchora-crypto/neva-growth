// Team Selector — porte em JS puro do componente "Team Selector" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, spring, loop, disposer, clamp, reduced } from '../kit.js';
import { icon } from '../../ui.js';

const SCRUB_PX = 24;        // pixels de arraste por passo ao "esfregar" o número
const RUBBER_PX = 14;       // quanto o número estica além do limite, por mais que se puxe
const VISIBLE = 5, OVERLAP = 8, ROLL = 10, SHAKE_MS = 280;
const EASE = 'cubic-bezier(.23,1,.32,1)';
const MEMBERS = ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Prado'];
const PRICE = 49, MIN = 1, MAX = 12;

const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
// Matiz estável por nome (só na faixa azul (200-230) da marca): a mesma pessoa sempre ganha o mesmo tom.
const hue = (n) => { let x = 0; for (const c of n) x = (x * 31 + c.codePointAt(0)) % 3600000; return 200 + x % 30; };
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export default function mount(stage, ctx) {
  ensureStyle('team-selector', `
.kk-team-selector-root{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:14px 10px;min-height:240px}
.kk-team-selector-card{width:100%;max-width:320px;box-sizing:border-box;padding:20px;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;box-shadow:0 1px 4px rgba(14,34,54,.05);color:var(--ink,#0e2236)}
.kk-team-selector-lab{display:block;font-size:13px;font-weight:600;color:var(--mut,#4a6f93)}
.kk-team-selector-stack{position:relative;margin:16px 0 22px;height:40px;display:flex;align-items:center;justify-content:center}
.kk-team-selector-av{width:40px;height:40px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff;font-size:12px;font-weight:600;position:relative;box-sizing:border-box}
.kk-team-selector-av.open{background:#fff;color:var(--ice-400,#7fb4e0);font-size:12px;border:1.5px dashed var(--ice-300,#a5cdee)}
.kk-team-selector-more{height:40px;min-width:40px;padding:0 8px;border-radius:999px;background:var(--ice-100,#e3f0fb);color:var(--ice-800,#164a7c);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff;box-sizing:border-box}
.kk-team-selector-ctl{display:flex;align-items:center;justify-content:center;gap:14px}
.kk-team-selector-step{width:40px;height:40px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--mut,#4a6f93);cursor:pointer;padding:0;transition:color .15s,background .15s,border-color .15s,opacity .15s}
.kk-team-selector-step .ico{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-team-selector-step:hover{background:var(--ice-50,#f2f8fe);color:var(--ink,#0e2236);border-color:var(--ice-300,#a5cdee)}
.kk-team-selector-step[aria-disabled=true]{opacity:.4;cursor:not-allowed}
.kk-team-selector-step:focus-visible,.kk-team-selector-scrub:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-team-selector-scrub{min-width:84px;display:flex;flex-direction:column;align-items:center;padding:4px 8px;border-radius:12px;touch-action:pan-y;user-select:none;-webkit-user-select:none;outline:none;transition:background .15s}
@media (pointer:fine){.kk-team-selector-scrub{cursor:ew-resize}}
.kk-team-selector-scrub:hover,.kk-team-selector-scrub.on{background:var(--ice-50,#f2f8fe)}
.kk-team-selector-scrub.on{background:var(--ice-100,#e3f0fb)}
.kk-team-selector-unit{font-size:12px;color:var(--mut,#4a6f93)}
.kk-team-selector-roll{display:inline-flex;font-variant-numeric:tabular-nums}
.kk-team-selector-place{position:relative;display:inline-flex;overflow:hidden}
.kk-team-selector-place>span{display:inline-block}
.kk-team-selector-place .gone{position:absolute;left:0;top:0}
.kk-team-selector-big{height:36px;line-height:36px;font-size:30px;font-weight:700;letter-spacing:-.02em}
.kk-team-selector-price{margin:20px 0 0;padding-top:16px;border-top:1px solid var(--ice-100,#e3f0fb);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;font-size:13px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-team-selector-price b{color:var(--ink,#0e2236);font-weight:600}
.kk-team-selector-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`);
  const d = disposer(); const rm = reduced();
  let count = 3, dir = 1, vib = false, vibT = 0, scrub = null, stopStretch = null;
  const labelId = 'kk-team-selector-l' + Math.random().toString(36).slice(2, 7);

  // ---- número que rola, caractere a caractere (casas contadas da direita: 12→13 só mexe no último dígito)
  function roller(cls) {
    const el = h('span', { class: 'kk-team-selector-roll ' + (cls || '') });
    let prefix = '', places = new Map();  // casa → { el, ch }
    const anim = (node, from, to) => rm ? null : node.animate([from, to], { duration: from.opacity === 0 ? 200 : 120, easing: EASE, fill: 'both' });
    function set(text, offset) {
      const pre = (text.match(/^[^\d]+/) || [''])[0];
      if (pre !== prefix) { prefix = pre; el.firstChild?.nodeType === 3 && el.firstChild.remove(); if (pre) el.prepend(document.createTextNode(pre)); }
      const digits = [...text.slice(pre.length)], n = digits.length, keep = new Set();
      digits.forEach((ch, i) => {
        const place = n - i; keep.add(place);
        let p = places.get(place);
        if (!p) {
          p = { el: h('span', { class: 'kk-team-selector-place' }), ch: '' }; places.set(place, p);
          const s = h('span', ch); p.el.append(s); p.ch = ch; anim(p.el, { opacity: 0, transform: `translateY(${offset}px)` }, { opacity: 1, transform: 'translateY(0)' });
        } else if (p.ch !== ch) {
          const prev = p.el.firstChild, next = h('span', ch);
          prev.classList.add('gone'); const a = anim(prev, { opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: `translateY(${-offset}px)` });
          if (a) a.onfinish = () => prev.remove(); else prev.remove();
          p.el.append(next); anim(next, { opacity: 0, transform: `translateY(${offset}px)` }, { opacity: 1, transform: 'translateY(0)' }); p.ch = ch;
        }
      });
      for (const [place, p] of [...places]) if (!keep.has(place)) {  // casa que some (10 → 9): sai rolando
        places.delete(place); const a = anim(p.el, { opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: `translateY(${-offset}px)` });
        if (a) a.onfinish = () => p.el.remove(); else p.el.remove();
      }
      // Reordena as casas da esquerda para a direita (a ordem do DOM define a leitura).
      [...places.keys()].sort((a, b) => b - a).forEach((k) => el.append(places.get(k).el));
    }
    return { el, set };
  }

  // ---- pilha de avatares, com saída/entrada animada e deslocamento suave dos vizinhos
  const stack = h('div', { class: 'kk-team-selector-stack', 'aria-hidden': 'true' });
  const nodes = new Map();  // id → elemento
  const seatOf = (i) => i < MEMBERS.length ? { id: 'm' + i, name: MEMBERS[i], open: false } : { id: 'o' + (i + 1), name: `Assento ${i + 1}`, open: true };
  function avatar(seat, index) {
    if (seat.open) return h('span', { class: 'kk-team-selector-av open' }, String(index + 1));
    const hu = hue(seat.name);
    return h('span', { class: 'kk-team-selector-av', style: `background:hsl(${hu} 70% 92%);color:hsl(${hu} 55% 28%)` }, initials(seat.name));
  }
  const more = roller(''); const moreChip = h('div', { class: 'kk-team-selector-more' }, '+', more.el);
  function renderStack() {
    const seats = Array.from({ length: count }, (_, i) => seatOf(i));
    const overflow = count > VISIBLE ? count - (VISIBLE - 1) : 0;
    const vis = overflow ? seats.slice(0, VISIBLE - 1) : seats;
    const want = vis.map((s) => s.id); if (overflow) want.push('more');
    const before = new Map([...nodes].map(([k, el]) => [k, el.getBoundingClientRect().left]));
    const sr = stack.getBoundingClientRect();
    // Quem sai fica solto na posição antiga e encolhe; quem entra cresce.
    for (const [k, el] of [...nodes]) if (!want.includes(k)) {
      nodes.delete(k);
      if (rm) { el.remove(); continue; }
      el.style.cssText += `;position:absolute;left:${before.get(k) - sr.left}px;top:0;margin:0`;
      el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.85)' }], { duration: 160, easing: EASE }).onfinish = () => el.remove();
    }
    want.forEach((k, idx) => {
      let el = nodes.get(k);
      if (!el) {
        el = k === 'more' ? moreChip : avatar(vis[idx], idx); el.dataset.k = k; nodes.set(k, el);
        if (!rm) el.animate([{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.4,.64,1)' });
      }
      el.style.marginLeft = idx === 0 ? '0' : -OVERLAP + 'px'; el.style.zIndex = k === 'more' ? 0 : VISIBLE - idx;
      el.title = k === 'more' ? '' : vis[idx].name;
      stack.append(el);  // append em ordem reordena os nós existentes
    });
    if (overflow) more.set(String(overflow), dir * (rm ? 0 : ROLL));
    if (!rm) for (const [k, el] of nodes) {  // FLIP: os vizinhos deslizam da posição antiga para a nova
      if (!before.has(k)) continue; const dx = before.get(k) - el.getBoundingClientRect().left;
      if (Math.abs(dx) > .5) el.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: 200, easing: EASE });
    }
  }

  // ---- controles
  const big = roller('kk-team-selector-big'), unitEl = h('span', { class: 'kk-team-selector-unit' });
  const mk = (name, aria, delta) => h('button', { type: 'button', class: 'kk-team-selector-step', 'aria-label': aria, onclick: () => step(delta) }, icon(name));
  const bMinus = mk('minus', 'Remover um assento', -1), bPlus = mk('plus', 'Adicionar um assento', 1);
  // O ícone "minus" não existe no kit do app: desenhamos o traço no lugar.
  bMinus.firstChild.firstChild.setAttribute('d', 'M5 12h14');
  const scrubEl = h('div', { class: 'kk-team-selector-scrub', role: 'spinbutton', tabindex: '0', 'aria-labelledby': labelId, 'aria-valuemin': MIN, 'aria-valuemax': MAX }, big.el, unitEl);
  const ctl = h('div', { class: 'kk-team-selector-ctl' }, bMinus, scrubEl, bPlus);
  const pricePer = h('span'), total = roller(''), totalWrap = h('b', total.el);
  const price = h('p', { class: 'kk-team-selector-price' }, pricePer, h('span', { 'aria-hidden': 'true' }, '·'), h('span', totalWrap, ' / mês'));
  const live = h('output', { class: 'kk-team-selector-sr', 'aria-live': 'polite' });
  const card = h('div', { class: 'kk-team-selector-card' }, h('span', { class: 'kk-team-selector-lab', id: labelId }, 'Tamanho da equipe'), stack, ctl, price, live);
  stage.append(h('div', { class: 'kk-team-selector-root' }, card)); d(() => stage.firstChild?.remove());
  pricePer.textContent = `${brl(PRICE)} / assento`;

  function paint(first) {
    const unit = count === 1 ? 'assento' : 'assentos', off = dir * (rm ? 0 : ROLL);
    big.set(String(count), first ? 0 : off); unitEl.textContent = unit; total.set(brl(PRICE * count), first ? 0 : off);
    scrubEl.setAttribute('aria-valuenow', count); scrubEl.setAttribute('aria-valuetext', `${count} ${unit}`);
    bMinus.setAttribute('aria-disabled', String(count <= MIN)); bPlus.setAttribute('aria-disabled', String(count >= MAX));
    live.textContent = `${count} ${unit}, ${brl(PRICE * count)} por mês`;
    renderStack();
  }
  function change(next) {
    const c = clamp(next, MIN, MAX); if (c === count) return;
    dir = c > count ? 1 : -1; count = c; paint(false);
  }
  // Passo que esbarra no limite sacode os controles em vez de ficar mudo.
  function step(delta) {
    const n = count + delta;
    if (n < MIN || n > MAX) { shake(); return; }
    change(n);
  }
  function shake() {
    if (rm || vib) return; vib = true;
    ctl.animate({ transform: ['translateX(-3px)', 'translateX(3px)', 'translateX(-2px)', 'translateX(2px)', 'translateX(0)'] }, { duration: SHAKE_MS, easing: EASE });
    vibT = setTimeout(() => { vib = false; }, SHAKE_MS);
  }
  d(() => clearTimeout(vibT));

  // ---- arrastar sobre o número (como o campo numérico de um editor de design)
  const stretch = spring(0, { k: 600, c: 32 });
  const setStretch = (v) => { stretch.set(v); scrubEl.style.transform = v ? `translateX(${v}px)` : ''; };
  scrubEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    scrubEl.setPointerCapture(e.pointerId); scrub = { x: e.clientX, n: count }; scrubEl.classList.add('on'); stopStretch?.(); stopStretch = null;
  });
  scrubEl.addEventListener('pointermove', (e) => {
    if (!scrub) return;
    const raw = scrub.n + (e.clientX - scrub.x) / SCRUB_PX; change(Math.round(raw));
    // Além do limite o número segue o ponteiro com resistência exponencial: nunca passa de RUBBER_PX.
    const over = raw < MIN ? (raw - MIN) * SCRUB_PX : raw > MAX ? (raw - MAX) * SCRUB_PX : 0;
    setStretch(Math.sign(over) * RUBBER_PX * (1 - Math.exp(-Math.abs(over) / (RUBBER_PX * 4))));
  });
  const end = () => {
    if (!scrub) return; scrub = null; scrubEl.classList.remove('on');
    if (rm) { setStretch(0); return; }
    stretch.to(0); stopStretch = loop((dt) => { const v = stretch.step(dt); scrubEl.style.transform = `translateX(${v}px)`; if (stretch.settled) { setStretch(0); stopStretch(); stopStretch = null; } });
  };
  scrubEl.addEventListener('pointerup', end); scrubEl.addEventListener('pointercancel', end); scrubEl.addEventListener('lostpointercapture', end);
  d(() => stopStretch?.());
  scrubEl.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowRight') step(1); else if (k === 'ArrowDown' || k === 'ArrowLeft') step(-1);
    else if (k === 'PageUp') change(count + 5); else if (k === 'PageDown') change(count - 5);
    else if (k === 'Home') change(MIN); else if (k === 'End') change(MAX); else return;
    e.preventDefault();
  });

  paint(true);
  return () => d.run();
}
