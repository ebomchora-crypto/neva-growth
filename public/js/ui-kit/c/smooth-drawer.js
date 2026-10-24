// Gaveta suave — porte em JS puro do componente "Smooth Drawer" (smooth-drawer) .
import { h, svg, ensureStyle, spring, loop, clamp, reduced, onResize, disposer, PALETTE } from '../kit.js';

const PEEK = 200, TOP_GAP = 24, MAX_SHEET = 680;
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const ITEMS = [
  { id: 'camiseta', name: 'Camiseta de linho', detail: 'Areia · M', price: 189 },
  { id: 'meias', name: 'Meias de algodão', detail: 'Grafite · 2 pares', price: 29, qty: 2 },
  { id: 'ecobag', name: 'Ecobag de lona', detail: 'Natural', price: 64 },
];
const DELIVERY = { padrao: { label: 'Padrão', price: 0, eta: '3 a 5 dias úteis' }, expresso: { label: 'Expresso', price: 24, eta: 'Amanhã' } };
const PAY = { cartao: { label: 'Cartão final 4242', note: 'Padrão', off: 0 }, pix: { label: 'Pix', note: '5% de desconto', off: 0.05 } };
const TAX = 0.06;

// Cada dígito desliza na direção em que o total se moveu.
function rollingAmount() {
  const root = h('span', { class: 'kk-smooth-drawer-roll' });
  const sr = h('span', { class: 'kk-smooth-drawer-sr' }), vis = h('span', { 'aria-hidden': 'true', style: 'display:inline-flex' });
  root.append(sr, vis);
  let prev = 0, slots = [];
  const rm = reduced();
  return {
    el: root,
    set(value) {
      const text = brl.format(value).replace(/\s/g, ' '), chars = [...text], dir = value >= prev ? 1 : -1; prev = value;
      sr.textContent = text;
      // Chaveado pela direita: os centavos ficam parados quando os reais ganham um dígito.
      const next = [];
      chars.forEach((ch, i) => {
        const key = chars.length - i, old = slots.find((s) => s.key === key);
        const isDigit = ch >= '0' && ch <= '9';
        if (old && old.ch === ch) { next.push(old); return; }
        const box = old?.el || h('span', { class: 'kk-smooth-drawer-slot' });
        const inner = h('span', { class: 'kk-smooth-drawer-dg' }, ch);
        if (old && isDigit && old.digit) {
          const out = old.inner;
          out.style.cssText = 'position:absolute;left:0;top:0';
          const kf = (a, b) => (rm ? [{ opacity: a }, { opacity: b }] : [{ transform: `translateY(${a * dir * 70}%)`, opacity: 1 - Math.abs(a) }, { transform: `translateY(${b * dir * 70}%)`, opacity: 1 - Math.abs(b) }]);
          out.animate(rm ? kf(1, 0) : kf(0, -1), { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' }).onfinish = () => out.remove();
          inner.animate(rm ? kf(0, 1) : kf(1, 0), { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
        } else box.replaceChildren();
        box.append(inner);
        next.push({ key, ch, el: box, inner, digit: isDigit });
      });
      slots = next; vis.replaceChildren(...slots.map((s) => s.el));
    },
  };
}

export default function mount(stage, ctx) {
  ensureStyle('smooth-drawer', `
.kk-smooth-drawer-root{position:relative;width:100%;height:${ctx?.big ? 'min(62vh,560px)' : '430px'};overflow:hidden;container-type:inline-size}
.kk-smooth-drawer-main{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center}
.kk-smooth-drawer-main p{margin:0;max-width:260px;font-size:13px;line-height:1.5;color:${PALETTE.mut}}
.kk-smooth-drawer-trg{min-height:44px;padding:0 18px;border:1px solid var(--line,${PALETTE.line});border-radius:10px;background:#fff;color:${PALETTE.ink};font:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:background .15s}
.kk-smooth-drawer-trg:hover{background:${PALETTE.ice100}}
.kk-smooth-drawer-trg:focus-visible,.kk-smooth-drawer-pay:focus-visible,.kk-smooth-drawer-more:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:2px}
.kk-smooth-drawer-done{display:none;flex-direction:column;align-items:center;gap:6px}
.kk-smooth-drawer-done b{font-size:15px;color:${PALETTE.ink}}
.kk-smooth-drawer-scrim{position:absolute;inset:0;background:rgba(14,34,54,.42);opacity:0;pointer-events:none;z-index:5}
.kk-smooth-drawer-sheet{position:absolute;left:0;right:0;bottom:0;margin:0 auto;width:100%;max-width:420px;z-index:6;display:flex;flex-direction:column;border:1px solid var(--line,${PALETTE.line});border-bottom:0;border-radius:18px 18px 0 0;background:#fff;box-shadow:0 -10px 30px -12px rgba(15,53,96,.3);will-change:transform;visibility:hidden}
.kk-smooth-drawer-head{flex:none;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}.kk-smooth-drawer-sheet.drag .kk-smooth-drawer-head{cursor:grabbing}
.kk-smooth-drawer-grab{display:flex;align-items:center;justify-content:center;height:24px}.kk-smooth-drawer-grab i{width:36px;height:4px;border-radius:99px;background:${PALETTE.ice200}}
.kk-smooth-drawer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:4px 20px 0}
.kk-smooth-drawer-top h3{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;color:${PALETTE.ink}}
.kk-smooth-drawer-top p{margin:2px 0 0;font-size:13px;color:${PALETTE.mut}}
.kk-smooth-drawer-tot{flex:none;text-align:right}.kk-smooth-drawer-tot small{display:block;font-size:13px;color:${PALETTE.mut}}
.kk-smooth-drawer-tot b{display:block;margin-top:2px;font-size:18px;line-height:24px;font-weight:600;letter-spacing:-.01em;color:${PALETTE.ink}}
.kk-smooth-drawer-roll{position:relative;display:inline-flex;font-variant-numeric:tabular-nums}
.kk-smooth-drawer-slot{position:relative;display:inline-flex;overflow:hidden}.kk-smooth-drawer-dg{display:inline-block}
.kk-smooth-drawer-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.kk-smooth-drawer-acts{padding:0 20px}
.kk-smooth-drawer-pay{display:flex;align-items:center;justify-content:center;width:100%;height:44px;margin-top:16px;border:0;border-radius:12px;background:${PALETTE.ink};color:#fff;font:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:background .15s}
.kk-smooth-drawer-pay:hover{background:${PALETTE.ice900}}.kk-smooth-drawer-pay:active{background:${PALETTE.ice800}}
.kk-smooth-drawer-more{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:40px;margin-top:4px;border:0;border-radius:8px;background:none;color:${PALETTE.mut};font:inherit;font-size:13px;cursor:pointer;transition:color .15s}
.kk-smooth-drawer-more:hover{color:${PALETTE.ink}}.kk-smooth-drawer-more svg{transition:transform .3s cubic-bezier(.32,.72,0,1)}.kk-smooth-drawer-more[aria-expanded=true] svg{transform:rotate(180deg)}
.kk-smooth-drawer-det{flex:1;min-height:0;padding:0 20px 24px;overflow:hidden;opacity:0;touch-action:pan-y;overscroll-behavior:contain}
.kk-smooth-drawer-det.on{overflow-y:auto}
.kk-smooth-drawer-det>div{padding-top:16px;border-top:1px solid ${PALETTE.line}}
.kk-smooth-drawer-ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px}
.kk-smooth-drawer-ul li{display:flex;align-items:center;gap:12px}
.kk-smooth-drawer-ic{flex:none;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:1px solid ${PALETTE.line};border-radius:10px;background:${PALETTE.ice50};font-size:14px;font-weight:500;color:${PALETTE.mut}}
.kk-smooth-drawer-nm{flex:1;min-width:0}.kk-smooth-drawer-nm p{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;color:${PALETTE.ink}}.kk-smooth-drawer-nm p+p{font-size:13px;font-weight:400;color:${PALETTE.mut}}
.kk-smooth-drawer-pr{flex:none;font-size:14px;color:${PALETTE.ink};font-variant-numeric:tabular-nums}
.kk-smooth-drawer-fs{margin:20px 0 0;padding:0;border:0;min-width:0}.kk-smooth-drawer-fs legend{padding:0;font-size:13px;font-weight:500;color:${PALETTE.mut}}
.kk-smooth-drawer-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.kk-smooth-drawer-opt{position:relative;display:flex;flex-direction:column;padding:10px 12px;border:1px solid var(--line,${PALETTE.line});border-radius:12px;cursor:pointer;transition:border-color .15s,background .15s;min-height:44px}
.kk-smooth-drawer-opt:hover{border-color:${PALETTE.ice300}}.kk-smooth-drawer-opt.on{border-color:${PALETTE.ink};background:${PALETTE.ice50}}.kk-smooth-drawer-opt:focus-within{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
.kk-smooth-drawer-opt input{position:absolute;opacity:0;width:1px;height:1px}
.kk-smooth-drawer-opt span:first-of-type{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:500;color:${PALETTE.ink}}.kk-smooth-drawer-opt span:first-of-type em{font-style:normal;font-size:13px;font-weight:400;font-variant-numeric:tabular-nums}
.kk-smooth-drawer-opt span+span{margin-top:2px;font-size:13px;color:${PALETTE.mut}}
.kk-smooth-drawer-dl{margin:20px 0 0;display:flex;flex-direction:column;gap:6px;font-size:14px;font-variant-numeric:tabular-nums}
.kk-smooth-drawer-dl div{display:flex;justify-content:space-between;color:${PALETTE.mut}}.kk-smooth-drawer-dl div:last-child{padding-top:8px;border-top:1px solid ${PALETTE.line};font-weight:500;color:${PALETTE.ink}}
.kk-smooth-drawer-dl dt,.kk-smooth-drawer-dl dd{margin:0}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  let isOpen = false, expanded = false, delivery = 'padrao', payment = 'cartao', sheetH = 0, rootH = 0, drag = null, lastTrigger = null;
  const y = spring(0, { k: 330, c: 36 });
  const positions = () => ({ full: 0, peek: sheetH - PEEK, closed: sheetH + 2 });

  const subtotal = ITEMS.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const calc = () => { const shipping = DELIVERY[delivery].price, tax = Math.round(subtotal * TAX * 100) / 100, disc = Math.round(subtotal * PAY[payment].off * 100) / 100; return { shipping, tax, disc, total: subtotal + shipping + tax - disc }; };
  const itemCount = ITEMS.reduce((s, i) => s + (i.qty || 1), 0);

  // ---- DOM ----
  const amount = rollingAmount(), subLine = h('p');
  const detBody = h('div');
  const det = h('div', { class: 'kk-smooth-drawer-det', inert: true }, detBody);
  const moreBtn = h('button', { class: 'kk-smooth-drawer-more', type: 'button', 'aria-expanded': 'false', onclick: () => setSnap(!expanded) }, h('span', 'Detalhes do pedido'), svg('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: 'm18 15-6-6-6 6' })));
  const title = h('h3', { id: 'kk-sd-title', tabindex: '-1', style: 'outline:none' }, 'Resumo do pedido');
  const head = h('div', { class: 'kk-smooth-drawer-head' },
    h('div', { class: 'kk-smooth-drawer-grab', 'aria-hidden': 'true' }, h('i')),
    h('div', { class: 'kk-smooth-drawer-top' }, h('div', { style: 'min-width:0' }, title, subLine), h('div', { class: 'kk-smooth-drawer-tot' }, h('small', 'Total'), h('b', amount.el))));
  const sheet = h('div', { class: 'kk-smooth-drawer-sheet', role: 'dialog', 'aria-labelledby': 'kk-sd-title', 'aria-modal': 'false' }, head,
    h('div', { class: 'kk-smooth-drawer-acts' }, h('button', { class: 'kk-smooth-drawer-pay', type: 'button', onclick: confirm }, 'Pagar'), moreBtn), det);
  const scrim = h('div', { class: 'kk-smooth-drawer-scrim', onclick: () => close(true) });
  const doneMsg = h('div', { class: 'kk-smooth-drawer-done', 'aria-live': 'polite' });
  const trigger = h('button', { class: 'kk-smooth-drawer-trg', type: 'button', onclick: (e) => { lastTrigger = e.currentTarget; openSheet(); } }, 'Revisar pedido');
  const intro = h('p', 'Toque para ver o resumo da compra. Arraste a gaveta para cima para ver os detalhes.');
  const main = h('div', { class: 'kk-smooth-drawer-main' }, intro, trigger, doneMsg);
  const root = h('div', { class: 'kk-smooth-drawer-root' }, main, scrim, sheet);
  stage.append(root);

  function drawDetails() {
    const t = calc();
    detBody.replaceChildren(
      h('ul', { class: 'kk-smooth-drawer-ul' }, ITEMS.map((it) => h('li', h('span', { class: 'kk-smooth-drawer-ic' }, it.name[0]), h('div', { class: 'kk-smooth-drawer-nm' }, h('p', it.name), h('p', it.detail)), h('span', { class: 'kk-smooth-drawer-pr' }, brl.format(it.price * (it.qty || 1)))))),
      h('fieldset', { class: 'kk-smooth-drawer-fs' }, h('legend', 'Entrega'),
        h('div', { class: 'kk-smooth-drawer-opts' }, Object.entries(DELIVERY).map(([k, o]) => radio('entrega', k, o.label, o.price ? brl.format(o.price) : 'Grátis', o.eta, delivery === k, () => { delivery = k; update(); })))),
      h('fieldset', { class: 'kk-smooth-drawer-fs' }, h('legend', 'Pagamento'),
        h('div', { class: 'kk-smooth-drawer-opts' }, Object.entries(PAY).map(([k, o]) => radio('pagamento', k, o.label, '', o.note, payment === k, () => { payment = k; update(); })))),
      h('dl', { class: 'kk-smooth-drawer-dl' },
        row('Subtotal', brl.format(subtotal)), row('Entrega', t.shipping ? brl.format(t.shipping) : 'Grátis'), row('Impostos estimados', brl.format(t.tax)), t.disc ? row('Desconto Pix', '− ' + brl.format(t.disc)) : null, row('Total', brl.format(t.total))));
  }
  const row = (a, b) => h('div', h('dt', a), h('dd', b));
  function radio(name, value, label, price, note, checked, onChange) {
    return h('label', { class: 'kk-smooth-drawer-opt' + (checked ? ' on' : '') }, h('input', { type: 'radio', name: 'kk-sd-' + name, value, checked, onchange: onChange }), h('span', label, price && h('em', price)), h('span', note));
  }
  function update() {
    const t = calc();
    amount.set(t.total);
    subLine.textContent = `${itemCount} itens · ${delivery === 'expresso' ? 'Chega amanhã' : 'Chega em 3 a 5 dias'}`;
    const keep = document.activeElement?.value && document.activeElement.name;
    drawDetails();
    if (keep) detBody.querySelector(`input[name="${keep}"]:checked`)?.focus({ preventScroll: true });
  }

  // ---- posição da gaveta ----
  let stopLoop = null;
  function render() {
    const p = positions(), v = y.value;
    sheet.style.transform = `translate3d(0,${v}px,0)`;
    // O fundo escurece a partir do primeiro ponto (espiada); a área de detalhes aparece conforme sobe.
    scrim.style.opacity = String(clamp((p.closed - v) / (p.closed - p.peek), 0, 1));
    const prog = clamp((p.peek - v) / (p.peek - p.full || 1), 0, 1);
    det.style.opacity = String(prog); det.style.translate = rm ? '' : `0 ${Math.round((1 - prog) * 12)}px`;
  }
  function go(target, hard) {
    if (hard || rm) { stopLoop?.(); stopLoop = null; y.set(target); render(); return; }
    y.to(target);
    if (!stopLoop) stopLoop = loop((dt) => { y.step(dt); render(); if (y.settled) { y.set(y.target); render(); stopLoop(); stopLoop = null; afterSettle(); } });
  }
  d(() => stopLoop?.());
  function afterSettle() { if (!isOpen) sheet.style.visibility = 'hidden'; }
  function setSnap(next) {
    expanded = next; moreBtn.setAttribute('aria-expanded', String(next));
    moreBtn.firstChild.textContent = next ? 'Ocultar detalhes' : 'Detalhes do pedido';
    det.inert = !next; det.classList.toggle('on', next);
    if (!next) det.scrollTop = 0;
    go(next ? positions().full : positions().peek);
  }
  function openSheet() {
    if (isOpen) return;
    isOpen = true; expanded = false; sheet.style.visibility = 'visible'; scrim.style.pointerEvents = 'auto';
    det.inert = true; det.classList.remove('on'); moreBtn.setAttribute('aria-expanded', 'false'); moreBtn.firstChild.textContent = 'Detalhes do pedido';
    y.set(positions().closed); render(); go(positions().peek);
    title.focus({ preventScroll: true });
  }
  function close(returnFocus) {
    if (!isOpen) return;
    isOpen = false; scrim.style.pointerEvents = 'none'; go(positions().closed);
    if (returnFocus) (lastTrigger || trigger).focus({ preventScroll: true });
  }
  function confirm() {
    const t = calc();
    close(false);
    intro.style.display = 'none'; trigger.style.display = 'none';
    doneMsg.style.display = 'flex';
    doneMsg.replaceChildren(h('b', 'Pedido confirmado'), h('p', `${brl.format(t.total)} via ${PAY[payment].label}. ${delivery === 'expresso' ? 'Entrega amanhã.' : 'Entrega em 3 a 5 dias úteis.'}`),
      h('button', { class: 'kk-smooth-drawer-trg', type: 'button', style: 'margin-top:8px', onclick: () => { doneMsg.style.display = 'none'; intro.style.display = ''; trigger.style.display = ''; trigger.focus(); } }, 'Novo pedido'));
    doneMsg.querySelector('button').focus();
  }

  // ---- arrasto com pontos de parada e velocidade ----
  const samples = [];
  on(head, 'pointerdown', (e) => {
    if (!isOpen || (e.pointerType === 'mouse' && e.button !== 0)) return;
    head.setPointerCapture(e.pointerId); stopLoop?.(); stopLoop = null;
    drag = { id: e.pointerId, startY: e.clientY, startV: y.value }; samples.length = 0; samples.push({ t: e.timeStamp, y: e.clientY });
    sheet.classList.add('drag');
  });
  on(head, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const p = positions(), v = clamp(drag.startV + e.clientY - drag.startY, p.full - 24, p.closed);
    // Acima do topo há resistência, como numa folha de verdade.
    y.set(v < p.full ? p.full + (v - p.full) * 0.3 : v); render();
    samples.push({ t: e.timeStamp, y: e.clientY }); while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    drag = null; sheet.classList.remove('drag');
    const f = samples[0], l = samples[samples.length - 1], vy = l && f && l.t > f.t ? ((l.y - f.y) / (l.t - f.t)) * 1000 : 0;
    const p = positions(), projected = y.value + vy * 0.18;
    const best = [['full', p.full], ['peek', p.peek], ['closed', p.closed]].reduce((b, c) => (Math.abs(c[1] - projected) < Math.abs(b[1] - projected) ? c : b));
    y.kick(vy);
    if (best[0] === 'closed') close(true); else setSnap(best[0] === 'full');
  };
  on(head, 'pointerup', endDrag); on(head, 'pointercancel', endDrag);
  // Com o mouse, também dá para puxar a gaveta pelos detalhes quando estão no topo.
  on(det, 'wheel', (e) => { if (expanded && det.scrollTop <= 0 && e.deltaY < -20) setSnap(false); }, { passive: true });
  on(root, 'keydown', (e) => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(true); } });

  d(onResize(root, ({ height }) => {
    rootH = height; sheetH = Math.max(PEEK, Math.min(MAX_SHEET, rootH - TOP_GAP));
    sheet.style.height = sheetH + 'px';
    go(isOpen ? (expanded ? positions().full : positions().peek) : positions().closed, true);
  }));
  update();
  return () => { d.run(); root.remove(); };
}
