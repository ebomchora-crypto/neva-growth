// Seletor de modelo — porte em JS puro do componente "AI Model Selector" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, icon, ensureStyle, PALETTE } from '../kit.js';

const NIVEL = {
  baixo: { id: 'low', label: 'Baixo', hint: 'Responde na hora. Ideal para ajustes rápidos e consultas.' },
  medio: { id: 'medium', label: 'Médio', hint: 'Pensa um pouco antes. Bom padrão para a maioria das tarefas.' },
  alto: { id: 'high', label: 'Alto', hint: 'Pensa mais em problemas difíceis. Mais lento e gasta mais créditos.' },
  max: { id: 'max', label: 'Máx.', hint: 'Sem limite de raciocínio. Só para as tarefas mais difíceis.' },
};
// Modelos fictícios de exemplo: cada um com uma trilha de esforço de tamanho diferente
const MODELS = [
  { id: 'aurora', name: 'Aurora Pro', description: 'Mais capaz, para análises complexas', efforts: [NIVEL.baixo, NIVEL.medio, NIVEL.alto, NIVEL.max], defaultEffort: 'high' },
  { id: 'brisa', name: 'Brisa', description: 'Rápido e capaz no dia a dia', efforts: [NIVEL.baixo, NIVEL.medio, NIVEL.alto], defaultEffort: 'medium' },
  { id: 'faisca', name: 'Faísca', description: 'O mais veloz, para respostas curtas', efforts: [NIVEL.baixo, NIVEL.medio], defaultEffort: 'low' },
  { id: 'atlas', name: 'Atlas 2', description: 'Forte em agentes e automações', efforts: [{ id: 'minimal', label: 'Mín.', hint: 'Quase não raciocina. Menor latência.' }, NIVEL.baixo, NIVEL.medio, NIVEL.alto], defaultEffort: 'medium' },
];

// Mantém o mesmo nível se o novo modelo tiver; senão, o nível na mesma altura relativa da trilha
function carry(from, to, effort) {
  if (to.efforts.some((e) => e.id === effort)) return effort;
  const share = from.efforts.length > 1 ? from.efforts.findIndex((e) => e.id === effort) / (from.efforts.length - 1) : 0;
  return to.efforts[Math.round(share * (to.efforts.length - 1))]?.id ?? to.defaultEffort ?? to.efforts[0].id;
}

export default function mount(stage) {
  ensureStyle('ai-model-selector', `
  .kk-ai-model-selector-root{width:100%;max-width:384px;margin:auto;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;min-height:330px;color:${PALETTE.ink}}
  .kk-ai-model-selector-out{margin:0 4px 10px;font-size:13px;color:${PALETTE.mut}}.kk-ai-model-selector-out b{color:${PALETTE.ink}}
  .kk-ai-model-selector-bar{position:relative;display:flex;align-items:center;height:48px;padding:0 6px;border-radius:12px;background:${PALETTE.ice100}}
  .kk-ai-model-selector-trigger{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:${PALETTE.ink};font:12px/1 inherit;font-family:inherit;cursor:pointer;max-width:100%;min-width:0}
  .kk-ai-model-selector-trigger:hover,.kk-ai-model-selector-trigger.open{background:${PALETTE.ice200}}
  .kk-ai-model-selector-trigger:focus-visible,.kk-ai-model-selector-opt:focus-visible,.kk-ai-model-selector-track:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:1px}
  .kk-ai-model-selector-trigger b{font-weight:600;white-space:nowrap}
  .kk-ai-model-selector-eff{display:flex;align-items:center;gap:6px;color:${PALETTE.mut};white-space:nowrap}
  .kk-ai-model-selector-glyph{display:flex;align-items:flex-end;gap:2px;height:12px}
  .kk-ai-model-selector-glyph i{width:3px;border-radius:1px;background:${PALETTE.ice300};transition:background-color .2s}.kk-ai-model-selector-glyph i.on{background:${PALETTE.ice800}}
  .kk-ai-model-selector-car{width:12px;height:12px;color:${PALETTE.ice400};transition:transform .2s cubic-bezier(.23,1,.32,1)}.kk-ai-model-selector-car svg{width:12px;height:12px;display:block}
  .kk-ai-model-selector-trigger.open .kk-ai-model-selector-car{transform:rotate(180deg)}
  .kk-ai-model-selector-panel{position:absolute;left:0;bottom:calc(100% + 8px);z-index:5;width:min(288px,100%);box-sizing:border-box;padding:4px;border-radius:12px;background:#fff;box-shadow:0 8px 24px -8px rgba(14,34,54,.28),0 0 0 1px rgba(14,34,54,.1);transform-origin:bottom left;transition:opacity .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}
  .kk-ai-model-selector-panel.hide{opacity:0;transform:translateY(4px) scale(.97);pointer-events:none;visibility:hidden;transition:opacity .16s,transform .16s,visibility 0s .16s}
  .kk-ai-model-selector-opt{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:6px 10px;border:0;border-radius:8px;background:transparent;text-align:left;cursor:pointer;font-family:inherit;color:inherit}
  .kk-ai-model-selector-opt:hover,.kk-ai-model-selector-opt:focus-visible{background:${PALETTE.ice50}}
  .kk-ai-model-selector-name{flex:1;min-width:0}.kk-ai-model-selector-name b{display:block;font-weight:400;font-size:14px}
  .kk-ai-model-selector-name small{display:block;font-size:12px;color:${PALETTE.mut};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .kk-ai-model-selector-check{width:16px;height:16px;flex:none;color:${PALETTE.ice700}}.kk-ai-model-selector-check svg{width:16px;height:16px;display:block}
  .kk-ai-model-selector-sep{height:1px;margin:4px 6px;background:${PALETTE.ice100}}
  .kk-ai-model-selector-eh{display:flex;justify-content:space-between;align-items:baseline;padding:6px 6px 8px}.kk-ai-model-selector-eh b{font-size:12px}.kk-ai-model-selector-eh small{font-size:11px;color:${PALETTE.ice400}}
  .kk-ai-model-selector-track{position:relative;height:36px;margin:0 6px;padding:2px;box-sizing:border-box;border-radius:8px;background:${PALETTE.ice100};cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
  .kk-ai-model-selector-inner{position:relative;display:flex;height:100%}
  .kk-ai-model-selector-thumb{position:absolute;top:0;bottom:0;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(14,34,54,.14),0 0 0 1px rgba(14,34,54,.05);transition:left .25s cubic-bezier(.23,1,.32,1),width .25s cubic-bezier(.23,1,.32,1)}
  .kk-ai-model-selector-track.drag .kk-ai-model-selector-thumb{transition-duration:.15s}
  .kk-ai-model-selector-lab{position:relative;flex:1;display:flex;align-items:center;justify-content:center;font-size:12px;color:${PALETTE.mut};transition:color .15s}.kk-ai-model-selector-lab.on{color:${PALETTE.ink};font-weight:600}
  .kk-ai-model-selector-hint{min-height:32px;margin:8px 6px 6px;font-size:12px;line-height:16px;color:${PALETTE.mut}}
  .kk-ai-model-selector-hint.in{animation:kk-ai-model-selector-hint .15s cubic-bezier(.23,1,.32,1)}
  @keyframes kk-ai-model-selector-hint{from{opacity:0;filter:blur(2px)}to{opacity:1;filter:none}}
  @media (prefers-reduced-motion:reduce){.kk-ai-model-selector-thumb,.kk-ai-model-selector-panel,.kk-ai-model-selector-car{transition:none!important}.kk-ai-model-selector-hint.in{animation:none}}
  `);

  const first = MODELS[0];
  let sel = { model: first.id, effort: first.defaultEffort };
  let open = true, dragging = false, lastHint = '';
  const model = () => MODELS.find((m) => m.id === sel.model) || first;
  const lvl = () => Math.max(0, model().efforts.findIndex((e) => e.id === sel.effort));

  const root = h('div', { class: 'kk-ai-model-selector-root' });
  const out = h('p', { class: 'kk-ai-model-selector-out', 'aria-live': 'polite' });
  const trigger = h('button', { type: 'button', class: 'kk-ai-model-selector-trigger', 'aria-haspopup': 'true', 'aria-expanded': 'true', onclick: () => setOpen(!open) });
  const panel = h('div', { class: 'kk-ai-model-selector-panel', role: 'dialog', 'aria-label': 'Modelo e esforço' });
  const radios = h('div', { role: 'radiogroup', 'aria-label': 'Modelo' });
  const thumb = h('span', { class: 'kk-ai-model-selector-thumb', 'aria-hidden': 'true' });
  const inner = h('div', { class: 'kk-ai-model-selector-inner' }, thumb);
  const hint = h('p', { class: 'kk-ai-model-selector-hint' });
  const labelId = 'kk-ms-effort-' + Math.random().toString(36).slice(2, 7);
  const track = h('div', { class: 'kk-ai-model-selector-track', role: 'slider', tabindex: '0', 'aria-labelledby': labelId, 'aria-valuemin': '0' }, inner);
  let panelOpen = open;

  const indexAt = (x) => { const r = inner.getBoundingClientRect(); const n = model().efforts.length; return Math.min(n - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * n))); };
  const setEffort = (i) => { const m = model(); i = Math.min(m.efforts.length - 1, Math.max(0, i)); if (m.efforts[i].id === sel.effort) return; sel.effort = m.efforts[i].id; paint(); };
  const pickModel = (m) => { if (m.id === sel.model) return; sel = { model: m.id, effort: carry(model(), m, sel.effort) }; paint(); };

  track.addEventListener('keydown', (e) => {
    const n = model().efforts.length; const moves = { ArrowLeft: lvl() - 1, ArrowDown: lvl() - 1, ArrowRight: lvl() + 1, ArrowUp: lvl() + 1, Home: 0, End: n - 1 };
    if (e.key in moves) { e.preventDefault(); setEffort(moves[e.key]); }
  });
  track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); dragging = true; track.classList.add('drag'); setEffort(indexAt(e.clientX)); });
  track.addEventListener('pointermove', (e) => { if (dragging) setEffort(indexAt(e.clientX)); });
  const endDrag = () => { dragging = false; track.classList.remove('drag'); };
  track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag); track.addEventListener('lostpointercapture', endDrag);

  function paint() {
    const m = model(), i = lvl(), n = m.efforts.length, e = m.efforts[i];
    trigger.replaceChildren(h('b', m.name), h('span', { class: 'kk-ai-model-selector-eff' },
      h('span', { class: 'kk-ai-model-selector-glyph', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, k) => h('i', { class: k <= i ? 'on' : '', style: `height:${((k + 1) / n) * 100}%` }))), e.label),
      h('span', { class: 'kk-ai-model-selector-car', 'aria-hidden': 'true' }, icon('chevron')));
    trigger.setAttribute('aria-label', `Modelo: ${m.name}, esforço ${e.label}. Alterar`);
    // Rádio com foco preservado: refaz só o conteúdo, não os botões, para o foco não se perder ao navegar por setas
    if (radios.children.length !== MODELS.length) {
      MODELS.forEach((o, k) => radios.append(h('button', { type: 'button', class: 'kk-ai-model-selector-opt', role: 'radio',
        onclick: () => pickModel(o),
        onkeydown: (ev) => { const d = { ArrowDown: 1, ArrowUp: -1 }[ev.key]; if (d === undefined) return; ev.preventDefault(); const nx = (k + d + MODELS.length) % MODELS.length; radios.children[nx].focus(); pickModel(MODELS[nx]); } },
        h('span', { class: 'kk-ai-model-selector-name' }, h('b', o.name), h('small', o.description)), h('span', { class: 'kk-ai-model-selector-check' }))));
    }
    MODELS.forEach((o, k) => { const b = radios.children[k], on = o.id === m.id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; b.lastChild.replaceChildren(...(on ? [icon('check')] : [])); });
    inner.replaceChildren(thumb, ...m.efforts.map((x, k) => h('span', { class: 'kk-ai-model-selector-lab' + (k === i ? ' on' : ''), 'aria-hidden': 'true' }, x.label)));
    thumb.style.left = `${(i / n) * 100}%`; thumb.style.width = `${100 / n}%`;
    track.setAttribute('aria-valuemax', String(n - 1)); track.setAttribute('aria-valuenow', String(i)); track.setAttribute('aria-valuetext', e.label);
    const hk = m.id + e.id; hint.textContent = e.hint || ''; if (hk !== lastHint) { hint.classList.remove('in'); void hint.offsetWidth; hint.classList.add('in'); lastHint = hk; }
    out.replaceChildren('Usando ', h('b', m.name), ` com esforço ${e.label.toLowerCase()}.`);
  }
  function setOpen(o) { open = o; panel.classList.toggle('hide', !o); panel.inert = !o; trigger.setAttribute('aria-expanded', String(o)); trigger.classList.toggle('open', o); }

  const onDoc = (e) => { if (open && !root.contains(e.target)) setOpen(false); };
  const onKey = (e) => { if (e.key === 'Escape' && open && root.contains(document.activeElement)) { setOpen(false); trigger.focus(); } };
  document.addEventListener('pointerdown', onDoc, true); document.addEventListener('keydown', onKey);

  panel.append(radios, h('div', { class: 'kk-ai-model-selector-sep' }),
    h('div', { class: 'kk-ai-model-selector-eh' }, h('b', { id: labelId }, 'Esforço'), h('small', '← → para ajustar')), track, hint);
  root.append(out, h('div', { class: 'kk-ai-model-selector-bar' }, panel, trigger));
  stage.append(root); paint(); setOpen(true);
  return () => { document.removeEventListener('pointerdown', onDoc, true); document.removeEventListener('keydown', onKey); };
}
