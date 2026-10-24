// Medidor de contexto: anel + porcentagem; ao clicar,
// abre o detalhamento por fonte (regras e DESIGN.md, referências, arquivos do site, conversa) com a marca de compactação.
import { h, mount } from '../ui.js';

const fmt = (t) => (t >= 1000 ? `${(t / 1000).toFixed(t >= 10000 ? 0 : 1).replace('.', ',')}k` : String(Math.round(t)));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = { system: 'var(--nc-seg1)', refs: 'var(--nc-seg2)', files: 'var(--nc-seg3)', talk: 'var(--nc-seg4)' };

/** Número que rola até o alvo (como o useTweened do original). */
function tween(onFrame, duration = 450) {
  let value = 0; let raf = 0;
  return {
    to(target) {
      cancelAnimationFrame(raf);
      if (reduce()) { value = target; onFrame(value); return; }
      const from = value; const t0 = performance.now();
      const step = (now) => { const t = Math.min(1, (now - t0) / duration); value = from + (target - from) * (1 - (1 - t) ** 3); onFrame(value); if (t < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    },
    stop() { cancelAnimationFrame(raf); },
  };
}

export function contextMeter({ label = '' } = {}) {
  let data = { limit: 200000, compactAt: 0.8, segments: [] };
  let open = false; let active = null;
  const R = 6; const C = 2 * Math.PI * R;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 16 16'); ring.setAttribute('class', 'cm-ring'); ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = `<circle cx="8" cy="8" r="${R}" class="bg"/><circle cx="8" cy="8" r="${R}" class="fg" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>`;
  const fg = ring.querySelector('.fg');
  const pctEl = h('span', { class: 'cm-pct' }, '0%');
  const trigger = h('button', { type: 'button', class: 'cm-trigger', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' }, ring, pctEl);
  const panel = h('div', { class: 'cm-panel', role: 'dialog', 'aria-label': 'Uso do contexto', hidden: true });
  const root = h('div', { class: 'cm' }, label && h('span', { class: 'cm-model' }, label), trigger, panel);

  const used = () => data.segments.reduce((n, s) => n + s.tokens, 0);
  const level = (share) => (share >= data.compactAt + (1 - data.compactAt) / 2 ? 'hot' : share >= data.compactAt - 0.1 ? 'warm' : '');
  const shareTw = tween((v) => {
    fg.setAttribute('stroke-dashoffset', String(C * (1 - Math.min(1, v))));
    pctEl.textContent = `${Math.round(v * 100)}%`;
  });
  const usedEl = h('span', { class: 'cm-used' });
  const usedTw = tween((v) => { usedEl.textContent = `${fmt(v)} de ${fmt(data.limit)}`; });

  function paintPanel() {
    const segs = data.segments; const free = Math.max(0, data.limit - used());
    const bar = h('div', { class: 'cm-bar' }, segs.map((s, i) => h('span', {
      class: 'cm-seg' + (active && active !== s.id ? ' dim' : ''), style: `width:${(s.tokens / data.limit) * 100}%;background:${COLORS[s.id] || 'var(--nc-seg3)'};${i > 0 && s.tokens > 0 ? 'margin-left:1px' : ''}`,
      onpointerenter: () => { active = s.id; paintPanel(); } })));
    mount(panel,
      h('div', { class: 'cm-head' }, h('b', 'Contexto'), usedEl),
      h('div', { class: 'cm-track', onpointerleave: () => { active = null; paintPanel(); } }, bar, ),
      h('p', { class: 'cm-note' }, `Janela do modelo: ${fmt(data.limit)} tokens`),
      h('ul', { class: 'cm-list' },
        segs.filter((s) => s.tokens > 0).map((s) => h('li', { class: active === s.id ? 'on' : '', onpointerenter: () => { active = s.id; paintPanel(); }, onpointerleave: () => { active = null; paintPanel(); } },
          h('i', { style: `background:${COLORS[s.id] || 'var(--nc-seg3)'}` }), h('span', s.label), h('em', fmt(s.tokens)), h('small', `${((s.tokens / data.limit) * 100).toFixed(1).replace('.', ',')}%`))),
        h('li', { class: 'free' }, h('i'), h('span', 'Livre'), h('em', fmt(free)), h('small', `${((free / data.limit) * 100).toFixed(1).replace('.', ',')}%`))),
      h('p', { class: 'cm-foot' }, 'Estimativa do que o modelo recebe no próximo pedido (cerca de 4 caracteres por token).'));
    usedTw.to(used());
  }
  const away = (e) => { if (!root.contains(e.target)) setOpen(false); };
  const esc = (e) => { if (e.key === 'Escape') { if (root.contains(document.activeElement)) trigger.focus(); setOpen(false); } };
  function setOpen(v) {
    open = v; trigger.setAttribute('aria-expanded', String(v)); trigger.classList.toggle('on', v);
    if (v) { panel.hidden = false; panel.classList.remove('out', 'down'); paintPanel(); { const clip = root.closest('.nc-scroll,.nc-main') || document.body; if (panel.getBoundingClientRect().top < clip.getBoundingClientRect().top + 6) panel.classList.add('down'); } document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc); }
    else { panel.classList.add('out'); setTimeout(() => { if (!open) panel.hidden = true; }, 130); document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); }
  }
  trigger.addEventListener('click', () => setOpen(!open));

  return {
    el: root,
    set(next) {
      data = { ...data, ...next };
      const share = used() / data.limit;
      trigger.className = 'cm-trigger ' + level(share) + (open ? ' on' : '');
      trigger.setAttribute('aria-label', `Contexto ${Math.round(share * 100)}% usado. Ver detalhes`);
      shareTw.to(share);
      if (open) paintPanel();
    },
    setLabel(t) { const m = root.querySelector('.cm-model'); if (m) m.textContent = t; },
    destroy() { shareTw.stop(); usedTw.stop(); document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); },
  };
}
