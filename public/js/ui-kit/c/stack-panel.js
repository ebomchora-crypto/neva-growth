// Painel em pilha — porte em JS puro do componente "Stack Panel" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle, spring, loop, clamp, reduced, onResize, disposer, PALETTE } from '../kit.js';

const PARALLAX = 0.3;       // a página de baixo anda um terço do que a de cima
const POP_DISTANCE = 0.35;  // soltar além desta fração da largura, ou arremessar mais rápido, volta a página
const POP_VELOCITY = 500;
const EASE = 'cubic-bezier(.23,1,.32,1)';
const PUSH_EASE = 'cubic-bezier(.32,.72,0,1)';

const ico = (d, size = 16, cls) => svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: cls }, svg('path', { d }));
const CHEV_R = 'm9 18 6-6-6-6', CHEV_L = 'm15 18-6-6 6-6', CHECK = 'M20 6 9 17l-5-5';

export default function mount(stage, ctx) {
  ensureStyle('stack-panel', `
.kk-stack-panel-root{width:100%;box-sizing:border-box;padding:12px 8px}
.kk-stack-panel-panel{--sp-bg:#fff;--sp-bd:${PALETTE.line};--sp-tx:${PALETTE.ink};--sp-mu:${PALETTE.mut};--sp-row:${PALETTE.ice50};--sp-hv:${PALETTE.ice100};--sp-dv:${PALETTE.ice100};--sp-sub:${PALETTE.ice400};--sp-on:${PALETTE.ink};--sp-off:${PALETTE.ice200};
  position:relative;width:100%;max-width:384px;margin:0 auto;overflow:hidden;border:1px solid var(--sp-bd);border-radius:16px;background:var(--sp-bg);color:var(--sp-tx)}
.kk-stack-panel-panel[data-th=dark]{--sp-bg:#0f2438;--sp-bd:#24425f;--sp-tx:#e8f2fb;--sp-mu:#8fb0cf;--sp-row:#162e47;--sp-hv:#1d3a58;--sp-dv:#24425f;--sp-sub:#6a8fb3;--sp-on:${PALETTE.ice300};--sp-off:#2b4f73}
.kk-stack-panel-bar{position:relative;z-index:10;display:flex;align-items:center;height:48px;padding:0 8px;border-bottom:1px solid var(--sp-dv);background:var(--sp-bg)}
.kk-stack-panel-back{position:relative;z-index:10;display:flex;align-items:center;max-width:32%;min-height:36px;padding:0 8px 0 4px;border:0;border-radius:8px;background:none;color:var(--sp-mu);font:inherit;font-size:14px;cursor:pointer;outline:none;transition:background .15s,color .15s}
.kk-stack-panel-back:hover{background:var(--sp-hv);color:var(--sp-tx)}.kk-stack-panel-back:focus-visible{box-shadow:0 0 0 2px ${PALETTE.ice500}}
.kk-stack-panel-back span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kk-stack-panel-back svg{flex:none}
.kk-stack-panel-title{position:absolute;left:0;right:0;top:50%;width:fit-content;max-width:55%;margin:0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:600;transform:translateY(-50%);transform-origin:left center;pointer-events:none}
.kk-stack-panel-body{position:relative;overflow:hidden;transition:height .38s ${PUSH_EASE}}
.kk-stack-panel-under{position:absolute;left:0;right:0;top:0;pointer-events:none}
.kk-stack-panel-shade{position:absolute;inset:0;background:#000;pointer-events:none}
.kk-stack-panel-top{position:relative;background:var(--sp-bg);touch-action:pan-y}
.kk-stack-panel-pg{display:flex;flex-direction:column;gap:20px;padding:8px 12px 16px}
.kk-stack-panel-sec h3{margin:0 0 6px;padding:0 12px;font-size:12px;font-weight:500;color:var(--sp-mu)}
.kk-stack-panel-sec ul{margin:0;padding:0;list-style:none;overflow:hidden;border-radius:12px;background:var(--sp-row)}
.kk-stack-panel-sec li+li{border-top:1px solid var(--sp-dv)}
.kk-stack-panel-sec p{margin:6px 0 0;padding:0 12px;font-size:12px;line-height:1.5;color:var(--sp-sub)}
.kk-stack-panel-row{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:8px 12px;box-sizing:border-box;border:0;background:none;color:inherit;font:inherit;text-align:left}
[data-dense] .kk-stack-panel-row{min-height:38px;padding-top:4px;padding-bottom:4px}
button.kk-stack-panel-row{cursor:pointer;outline:none;transition:background .15s}
button.kk-stack-panel-row:hover,button.kk-stack-panel-row:focus-visible,button.kk-stack-panel-row:active{background:var(--sp-hv)}
.kk-stack-panel-lb{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
.kk-stack-panel-row.bad .kk-stack-panel-lb{color:${PALETTE.bad}}
.kk-stack-panel-dt{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;color:var(--sp-mu)}
.kk-stack-panel-ch{flex:none;margin-right:-4px;color:var(--sp-sub);display:flex}
.kk-stack-panel-ck{flex:none;color:var(--sp-tx);display:flex}.kk-stack-panel-ck.no{visibility:hidden}
.kk-stack-panel-sw{position:relative;flex:none;width:36px;height:22px;border-radius:99px;background:var(--sp-off);transition:background .2s}
.kk-stack-panel-sw i{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .2s ${EASE}}
.kk-stack-panel-sw.on{background:var(--sp-on)}.kk-stack-panel-sw.on i{transform:translateX(14px)}
`);
  const d = disposer();
  const rm = reduced();
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  // ---- dados do demo ----
  const st = { theme: 'Sistema', density: 'Confortável', mentions: true, payments: true, digest: false, quiet: '22:00 – 07:00', signedOut: false };
  const flip = (k) => () => { st[k] = !st[k]; };
  const choice = (value, key) => ({ id: value, label: value, selected: st[key] === value, onSelect: () => { st[key] = value; if (key === 'theme') applyTheme(); if (key === 'density') panel.toggleAttribute('data-dense', st.density === 'Compacta'); } });
  const toggle = (id, label) => ({ id, label, checked: st[id], onSelect: flip(id) });
  const pages = () => ({
    settings: { title: 'Configurações', sections: [
      { rows: [{ id: 'account', label: 'Conta', detail: st.signedOut ? 'Visitante' : 'Marina Duarte', to: 'account' }, { id: 'appearance', label: 'Aparência', detail: st.theme, to: 'appearance' }, { id: 'notifications', label: 'Notificações', to: 'notifications' }] },
      { rows: [{ id: 'billing', label: 'Cobrança', detail: 'Pro', to: 'billing' }, { id: 'shortcuts', label: 'Atalhos de teclado', detail: '34' }] }] },
    account: { title: 'Conta', sections: [
      { rows: [{ id: 'name', label: 'Nome', detail: st.signedOut ? 'Visitante' : 'Marina Duarte' }, { id: 'email', label: 'E-mail', detail: st.signedOut ? '—' : 'marina@duarte.com.br' }, { id: 'security', label: 'Senha e segurança', to: 'security' }] },
      { rows: [{ id: 'sign-out', label: st.signedOut ? 'Entrar de novo' : 'Sair', tone: st.signedOut ? undefined : 'danger', onSelect: () => { st.signedOut = !st.signedOut; } }] }] },
    security: { title: 'Senha e segurança', sections: [
      { rows: [{ id: 'password', label: 'Senha', detail: 'Alterada há 3 meses' }, { id: '2fa', label: 'Verificação em duas etapas', detail: 'App autenticador' }, { id: 'sessions', label: 'Sessões ativas', detail: '3' }], footer: 'Encerrar uma sessão vale a partir da próxima requisição dela.' }] },
    appearance: { title: 'Aparência', sections: [
      { title: 'Tema', rows: ['Claro', 'Escuro', 'Sistema'].map((v) => choice(v, 'theme')) },
      { title: 'Densidade', rows: ['Confortável', 'Compacta'].map((v) => choice(v, 'density')) }] },
    notifications: { title: 'Notificações', sections: [
      { rows: [toggle('mentions', 'Menções'), toggle('payments', 'Pagamentos recusados'), toggle('digest', 'Resumo semanal')] },
      { rows: [{ id: 'quiet', label: 'Horário silencioso', detail: st.quiet, to: 'quiet' }], footer: 'Em horário silencioso, só pagamentos recusados chegam até você.' }] },
    quiet: { title: 'Horário silencioso', sections: [{ rows: ['Desligado', '22:00 – 07:00', '20:00 – 09:00', 'Fins de semana'].map((v) => choice(v, 'quiet')) }] },
    billing: { title: 'Cobrança', sections: [{ rows: [{ id: 'plan', label: 'Plano', detail: 'Pro, anual' }, { id: 'next', label: 'Próxima fatura', detail: '1º nov · R$ 480' }, { id: 'card', label: 'Cartão', detail: 'Visa ·· 4242' }] }] },
  });

  // ---- estrutura ----
  const stack = ['settings'];
  let busy = false, width = 360, direction = 1, drag = null, curHeight = 0;
  const x = spring(0, { k: 250, c: 32 });
  const barBack = h('span', { style: 'display:contents' });
  const titleBox = h('span', { style: 'display:contents' });
  const bar = h('div', { class: 'kk-stack-panel-bar' }, barBack, titleBox);
  const body = h('div', { class: 'kk-stack-panel-body' });
  const panel = h('div', { class: 'kk-stack-panel-panel', onkeydown: (e) => { if (e.key === 'Escape' && stack.length > 1) { e.preventDefault(); pop(); backBtn?.focus({ preventScroll: true }); } } }, bar, body);
  const root = h('div', { class: 'kk-stack-panel-root' }, panel);
  stage.append(root);

  let topWrap = null, underWrap = null, shade = null, backBtn = null, titleEl = null, heightRO = null;
  const applyTheme = () => { panel.dataset.th = st.theme === 'Escuro' ? 'dark' : st.theme === 'Claro' ? 'light' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
  on(matchMedia('(prefers-color-scheme: dark)'), 'change', applyTheme);

  // ---- página ----
  function pageEl(id, interactive) {
    const pg = pages()[id];
    return h('div', { class: 'kk-stack-panel-pg' }, pg.sections.map((s) => h('section', { class: 'kk-stack-panel-sec' },
      s.title && h('h3', s.title),
      h('ul', s.rows.map((r) => h('li', rowEl(r, interactive)))),
      s.footer && h('p', s.footer))));
  }
  function rowEl(row, interactive) {
    const lb = h('span', { class: 'kk-stack-panel-lb' }, row.label);
    const kids = [lb, row.detail && h('span', { class: 'kk-stack-panel-dt' }, row.detail),
      row.checked !== undefined && h('span', { class: 'kk-stack-panel-sw' + (row.checked ? ' on' : ''), 'aria-hidden': 'true' }, h('i')),
      row.selected !== undefined && h('span', { class: 'kk-stack-panel-ck' + (row.selected ? '' : ' no'), 'aria-hidden': 'true' }, ico(CHECK)),
      row.to && h('span', { class: 'kk-stack-panel-ch' }, ico(CHEV_R))];
    const cls = 'kk-stack-panel-row' + (row.tone === 'danger' ? ' bad' : '');
    if (!(row.to || row.onSelect) || !interactive) return h('div', { class: cls }, ...kids);
    const attrs = { class: cls, type: 'button', onclick: () => open(row, lb) };
    if (row.checked !== undefined) { attrs.role = 'switch'; attrs['aria-checked'] = String(row.checked); } else if (row.selected !== undefined) attrs['aria-pressed'] = String(row.selected);
    return h('button', attrs, ...kids);
  }
  // Recria o conteúdo das páginas depois de uma mudança de estado, sem mexer na animação.
  function refill() {
    if (!topWrap) return;
    const act = document.activeElement, idx = act?.closest?.('.kk-stack-panel-top') ? [...topWrap.querySelectorAll('button')].indexOf(act) : -1;
    topWrap.replaceChildren(pageEl(stack[stack.length - 1], true));
    if (idx >= 0) topWrap.querySelectorAll('button')[idx]?.focus({ preventScroll: true });
    if (underWrap) { underWrap.firstChild.replaceChildren(pageEl(stack[stack.length - 2], false)); underWrap.firstChild.append(shade); }
    drawBar(false); watchHeight();
  }
  const unitX = () => { const v = x.value; return { under: -PARALLAX * (width - v), shade: 0.06 * clamp(1 - v / width, 0, 1) }; };
  function paint() {
    topWrap.style.transform = `translate3d(${x.value}px,0,0)`;
    if (underWrap) { const u = unitX(); underWrap.style.transform = `translate3d(${u.under}px,0,0)`; shade.style.opacity = u.shade; }
  }

  // ---- título: ao empurrar, o rótulo da linha voa até o cabeçalho ----
  function drawBar(animate, origin) {
    const pg = pages(), id = stack[stack.length - 1], parent = stack.length > 1 ? pg[stack[stack.length - 2]] : null;
    if (!parent) { barBack.replaceChildren(); backBtn = null; }
    else if (!backBtn || backBtn.dataset.page !== stack[stack.length - 2]) {
      backBtn = h('button', { class: 'kk-stack-panel-back', type: 'button', 'data-page': stack[stack.length - 2], onclick: pop }, ico(CHEV_L), h('span', parent.title));
      barBack.replaceChildren(backBtn);
      if (!rm) backBtn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    } else backBtn.lastChild.textContent = parent.title;
    const text = pg[id].title;
    if (!animate) { if (titleEl) titleEl.textContent = text; return; }
    const old = titleEl, el = h('span', { class: 'kk-stack-panel-title' }, text);
    titleBox.append(el); titleEl = el;
    if (old) {
      if (rm) old.remove(); else old.animate([{ opacity: 1, transform: 'translateY(-50%)' }, { opacity: 0, transform: `translate(${direction * -40}px,-50%)` }], { duration: 180, easing: EASE }).onfinish = () => old.remove();
    }
    if (!origin || rm) {
      if (!rm) el.animate([{ opacity: 0, transform: `translate(${direction * 24}px,-50%)` }, { opacity: 1, transform: 'translate(0,-50%)' }], { duration: 280, easing: EASE });
      return;
    }
    const box = panel.getBoundingClientRect(), own = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize), sc = origin.fontSize / fs;
    const dx = origin.left - (own.left - box.left), dy = origin.top + origin.height / 2 - (own.top - box.top + own.height / 2);
    el.animate([{ transform: `translate(${dx}px,${dy}px) translateY(-50%) scale(${sc})` }, { transform: 'translateY(-50%)' }], { duration: 420, easing: PUSH_EASE });
  }

  // ---- altura do corpo segue a página do topo ----
  function watchHeight() {
    heightRO?.disconnect();
    const pgEl = topWrap.firstChild;
    heightRO = new ResizeObserver(() => { curHeight = topWrap.offsetHeight; body.style.height = curHeight + 'px'; });
    heightRO.observe(pgEl);
    curHeight = topWrap.offsetHeight; body.style.height = curHeight + 'px';
  }
  d(() => heightRO?.disconnect());

  let stopLoop = null;
  function animateX(target, then) {
    if (rm) { stopLoop?.(); stopLoop = null; x.set(target); paint(); then?.(); return; }
    x.to(target);
    stopLoop?.();
    stopLoop = loop((dt) => { x.step(dt); paint(); if (Math.abs(x.value - target) < 0.3) { x.set(target); paint(); stopLoop(); stopLoop = null; then?.(); } });
  }
  d(() => stopLoop?.());

  function mountTop(id) {
    topWrap = h('div', { class: 'kk-stack-panel-top', style: stack.length > 1 ? 'box-shadow:-8px 0 24px -12px rgba(15,53,96,.3)' : '' }, pageEl(id, true));
    attachDrag(topWrap);
    body.append(topWrap); watchHeight();
  }
  function open(row, labelEl) {
    row.onSelect?.();
    const target = row.to && pages()[row.to];
    if (!target) { refill(); return; }
    if (busy) return;
    const box = panel.getBoundingClientRect(), rect = labelEl.getBoundingClientRect();
    const origin = { left: rect.left - box.left, top: rect.top - box.top, height: rect.height, fontSize: parseFloat(getComputedStyle(labelEl).fontSize) };
    direction = 1; busy = true;
    // A página atual vira a de baixo (cópia inerte) e a nova entra pela direita.
    underWrap?.remove();
    topWrap.removeEventListener('pointerdown', topWrap._down);
    heightRO?.disconnect();
    const prev = topWrap; prev.remove();
    stack.push(row.to);
    shade = h('div', { class: 'kk-stack-panel-shade' });
    underWrap = h('div', { class: 'kk-stack-panel-under', 'aria-hidden': 'true', inert: true }, h('div', { style: 'position:relative' }, pageEl(stack[stack.length - 2], false), shade));
    body.append(underWrap);
    x.set(width); mountTop(row.to); paint(); drawBar(true, origin);
    animateX(0, () => { busy = false; });
    backBtn?.focus({ preventScroll: true });
  }
  function pop() {
    if (stack.length < 2 || busy) return;
    direction = -1; busy = true;
    animateX(width, () => {
      // Tudo no mesmo quadro: o topo antigo sai enquanto o deslocamento zera.
      topWrap.remove(); stack.pop();
      underWrap?.remove(); underWrap = null; shade = null; x.set(0);
      mountTop(stack[stack.length - 1]);
      if (stack.length > 1) { shade = h('div', { class: 'kk-stack-panel-shade' }); underWrap = h('div', { class: 'kk-stack-panel-under', 'aria-hidden': 'true', inert: true }, h('div', { style: 'position:relative' }, pageEl(stack[stack.length - 2], false), shade)); body.prepend(underWrap); }
      paint(); drawBar(true); busy = false;
    });
  }

  // ---- arrastar para a direita volta a página (trava no eixo horizontal) ----
  function attachDrag(el) {
    const down = (e) => {
      if (stack.length < 2 || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, startX: x.value, axis: null, samples: [{ t: e.timeStamp, x: e.clientX }] };
      const move = (ev) => {
        if (!drag || ev.pointerId !== drag.id) return;
        if (!drag.axis) {
          const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
          drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (drag.axis === 'x') { el.setPointerCapture(ev.pointerId); stopLoop?.(); stopLoop = null; }
        }
        if (drag.axis !== 'x') return;
        drag.samples.push({ t: ev.timeStamp, x: ev.clientX }); while (drag.samples.length > 2 && ev.timeStamp - drag.samples[0].t > 100) drag.samples.shift();
        const raw = drag.startX + ev.clientX - drag.sx;
        x.set(raw < 0 ? raw * 0.1 : raw); paint(); // elástico para a esquerda
      };
      const up = (ev) => {
        if (!drag || ev.pointerId !== drag.id) return;
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        const dr = drag; drag = null;
        if (dr.axis !== 'x') return;
        const f = dr.samples[0], l = dr.samples[dr.samples.length - 1], vx = l.t > f.t ? ((l.x - f.x) / (l.t - f.t)) * 1000 : 0;
        if (x.value > width * POP_DISTANCE || vx > POP_VELOCITY) pop(); else animateX(0);
      };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    };
    el._down = down; el.addEventListener('pointerdown', down);
  }

  // ---- delegação: estado mudou numa linha sem página (alterna, escolhe) ----
  on(body, 'click', () => { requestAnimationFrame(() => { if (!busy) refill(); }); });

  d(onResize(body, ({ width: w }) => { width = w || 360; if (topWrap) paint(); }));
  applyTheme(); mountTop('settings'); drawBar(true); titleEl?.getAnimations().forEach((a) => a.cancel());
  return () => { d.run(); root.remove(); };
}
