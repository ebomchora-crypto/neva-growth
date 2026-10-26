// Tela inicial do Builder de sites: palco escuro com feixes de luz, saudação, caixa de pedido à esquerda e modelos à direita.
// Tudo aqui é real: "+" anexa fotos/logo/documentos, "Otimizar prompt" reescreve o pedido com a IA, a paleta define as cores
// da marca, o microfone dita por voz (só aparece se o navegador suportar) e o modelo escolhido vira a base visual do site.
import { api } from '../api.js';
import { h, mount, toast, fail } from '../ui.js';
import { attachControls, composeDetails } from '../attach.js';
import { shaderCanvas } from './shader-canvas.js';
import { SIRI_WAVE_NEVA, GIGABIT_NEVA } from './shaders.js';

const KEY = 'neva-ai-selection';
const sv = (html, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls); s.innerHTML = html; return s; };
const I = {
  back: () => sv('<path d="M19 12H5M11 18l-6-6 6-6"/>'), arrow: () => sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  plus: () => sv('<path d="M12 5v14M5 12h14"/>'), chev: () => sv('<path d="m6 9 6 6 6-6"/>'), refresh: () => sv('<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>'), left: () => sv('<path d="m15 18-6-6 6-6"/>'), right: () => sv('<path d="m9 18 6-6-6-6"/>'),
  palette: () => sv('<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  mic: () => sv('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'), x: () => sv('<path d="M18 6 6 18M6 6l12 12"/>'), check: () => sv('<path d="M20 6 9 17l-5-5"/>'),
};
// Modelos: referências do acervo com o hero real capturado. Escolher um faz dele a base visual obrigatória do site.
const MODELS = [
  { id: '26a93f7d95a980e9', label: 'Design de interiores', prompt: 'Site para estúdio de design de interiores, com projetos em destaque, ambientes, processo de trabalho, equipe e contato para orçamento.' },
  { id: 'cb6de64949b0bec6', label: 'Estúdio de tecnologia', prompt: 'Site para estúdio de tecnologia e experiências digitais imersivas, com trabalhos em destaque, serviços, equipe e contato.' },
  { id: 'a93756f0c0cb59fc', label: 'Atendimento com IA', prompt: 'Landing page para plataforma de atendimento ao cliente com IA, com recursos, integrações, casos de sucesso e pedido de demonstração.' },
  { id: '94d9841532f84af8', label: 'Agência criativa', prompt: 'Site para agência criativa, com portfólio de projetos, serviços, clientes atendidos, equipe e contato para novos projetos.' },
  { id: '3f5a569abcca0bbf', label: 'Moda e calçados', prompt: 'Loja de calçados confortáveis, com coleção em destaque, materiais, tabela de tamanhos, trocas e contato.' },
  { id: '0401e230bb9cda3a', label: 'Beleza e cosméticos', prompt: 'Site para marca de cosméticos, com linha de produtos, rotina de cuidados, depoimentos e onde comprar.' },
  { id: 'f64c0d544bffcec5', label: 'Velas e decoração', prompt: 'Loja de velas aromáticas e decoração, com coleções, aromas, kits para presente e compra.' },
  { id: 'cfebfdafc08fb11d', label: 'Saúde e clínicas', prompt: 'Site para clínica de saúde, com especialidades, equipe médica, convênios aceitos, depoimentos e agendamento pelo WhatsApp.' },
  { id: '3b24baef47b41477', label: 'Carros de luxo', prompt: 'Site para concessionária de carros de luxo, com modelos em destaque, ficha técnica, galeria, test drive e contato.' },
  { id: 'c595fd0b94371aa8', label: 'Revista e editorial', prompt: 'Site editorial para revista de cultura e estilo de vida, com edição atual, matérias em destaque e assinatura.' },
  { id: 'f99b584bac5ddeba', label: 'Finanças e fintech', prompt: 'Landing page para conta digital para empresas, com benefícios, como funciona, segurança, planos e abertura de conta.' },
  { id: 'a685a334d586f159', label: 'Software e SaaS', prompt: 'Landing page para software de gestão de produto, com recursos, integrações, planos e preços, perguntas frequentes e teste grátis.' },
];
const PER_PAGE = 4;

/**
 * opts: { name, models, defaultModel, disabled, offMessage, onCreate({ details, assets, model, effort, baseRef }) }
 */
export function launchpad(opts) {
  const disabled = !!opts.disabled;
  // ---- modelo e esforço (mesma escolha guardada que a caixa de pedido usa)
  const models = opts.models?.length ? opts.models : [{ id: 'neva', name: 'Neva IA', efforts: [{ id: 'medium', label: 'Médio' }], defaultEffort: 'medium' }];
  const find = (id) => models.find((m) => m.id === id);
  let sel = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
  if (!sel || !find(sel.model)) { const m = find(opts.defaultModel) || models[0]; sel = { model: m.id, effort: m.defaultEffort || m.efforts[0].id }; }
  if (!find(sel.model).efforts.some((e) => e.id === sel.effort)) sel.effort = find(sel.model).defaultEffort || find(sel.model).efforts[0].id;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch { /* ok */ } };

  let base = null; let colors = null; let undoText = null; let busy = false; let page = 0;
  const ta = h('textarea', { class: 'lp-input', placeholder: 'Descreva o site que você quer criar...', 'aria-label': 'Descreva o site que você quer criar', rows: 6, disabled });
  const att = attachControls({ disabled, label: false, upload: (dataUrl, name) => api.post('/code-maker/images', { dataUrl, name }), onChange: () => paint() });
  const chips = h('div', { class: 'lp-chips' });

  // ---- seletor "Modelo / Esforço"
  const modelBtn = h('button', { type: 'button', class: 'lp-model', disabled, 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
  const paintModel = () => { const m = find(sel.model); const e = m.efforts.find((x) => x.id === sel.effort) || m.efforts[0]; mount(modelBtn, h('i', { class: 'lp-slash', 'aria-hidden': 'true' }), h('b', m.name || m.label || m.id), h('span', '/'), h('em', e.label), I.chev()); modelBtn.setAttribute('aria-label', `Modelo ${m.name || m.id}, esforço ${e.label}. Trocar`); };
  const menu = popover(modelBtn, () => [effortCard()], 'lp-epop');
  // Cartão do seletor: nível de esforço em destaque, modelo logo abaixo (clique para trocar) e régua para escolher o esforço.
  function effortCard() {
    const m = () => find(sel.model); const n = () => m().efforts.length;
    const idxOf = () => Math.max(0, m().efforts.findIndex((e) => e.id === sel.effort));
    const label = h('b', { class: 'lp-elab' });
    const nameBtn = h('button', { type: 'button', class: 'lp-ename', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    const reset = h('button', { type: 'button', class: 'lp-ereset', title: 'Restaurar o padrão', 'aria-label': 'Restaurar o modelo e o esforço padrão' }, I.refresh());
    const dots = h('span', { class: 'lp-dots', 'aria-hidden': 'true' }); const fill = h('i', { class: 'lp-fill' }); const thumb = h('b', { class: 'lp-thumb' });
    const track = h('div', { class: 'lp-track', role: 'slider', tabindex: '0' }, fill, dots, thumb);
    const card = h('div', { class: 'lp-ecard' }, reset, label, nameBtn, track);
    let emenu = null;
    const closeMenu = () => { emenu?.remove(); emenu = null; nameBtn.setAttribute('aria-expanded', 'false'); };
    function paintText() {
      const i = idxOf(); const e = m().efforts[i];
      label.textContent = e.label; mount(nameBtn, h('span', m().name || m().id), I.right());
      track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(Math.max(0, n() - 1))); track.setAttribute('aria-valuenow', String(i)); track.setAttribute('aria-valuetext', e.label); track.setAttribute('aria-label', 'Esforço do modelo');
      track.classList.toggle('single', n() < 2);
      mount(dots, m().efforts.map((_, k) => h('i', { class: k <= i ? 'on' : '', style: `left:calc(18px + (100% - 36px) * ${n() > 1 ? k / (n() - 1) : 0})` })));
    }
    function sync() { track.style.setProperty('--lp-p', String(n() > 1 ? idxOf() / (n() - 1) : 0)); paintText(); paintModel(); }
    const setIdx = (i) => { const e = m().efforts[Math.min(n() - 1, Math.max(0, i))]; if (e && e.id !== sel.effort) { sel.effort = e.id; save(); } sync(); };
    // arrastar acompanha o dedo; ao soltar, encaixa no nível mais próximo
    const ratio = (ev) => { const r = track.getBoundingClientRect(); return Math.min(1, Math.max(0, (ev.clientX - r.left - 18) / (r.width - 36))); };
    const drag = (ev) => { if (n() < 2) return; const p = ratio(ev); track.style.setProperty('--lp-p', String(p)); const i = Math.round(p * (n() - 1)); if (m().efforts[i].id !== sel.effort) { sel.effort = m().efforts[i].id; save(); paintText(); paintModel(); } };
    track.addEventListener('pointerdown', (ev) => { if (n() < 2) return; track.setPointerCapture(ev.pointerId); track.classList.add('drag'); drag(ev); track.focus({ preventScroll: true }); });
    track.addEventListener('pointermove', (ev) => { if (track.classList.contains('drag')) drag(ev); });
    const drop = () => { if (!track.classList.contains('drag')) return; track.classList.remove('drag'); sync(); };
    track.addEventListener('pointerup', drop); track.addEventListener('pointercancel', drop);
    track.addEventListener('keydown', (ev) => {
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key];
      if (k) { ev.preventDefault(); setIdx(idxOf() + k); } else if (ev.key === 'Home') { ev.preventDefault(); setIdx(0); } else if (ev.key === 'End') { ev.preventDefault(); setIdx(n() - 1); }
    });
    nameBtn.addEventListener('click', () => {
      if (emenu) { closeMenu(); return; }
      emenu = h('div', { class: 'lp-emenu', role: 'menu' }, models.map((x) => item(x.name || x.id, x.description, x.id === sel.model, () => {
        sel = { model: x.id, effort: x.efforts.some((e) => e.id === sel.effort) ? sel.effort : (x.defaultEffort || x.efforts[0].id) }; save(); closeMenu(); sync();
      })));
      card.append(emenu); nameBtn.setAttribute('aria-expanded', 'true');
    });
    reset.addEventListener('click', () => { const d = find(opts.defaultModel) || models[0]; sel = { model: d.id, effort: d.defaultEffort || d.efforts[0].id }; save(); closeMenu(); sync(); });
    sync();
    return card;
  }

  // ---- cores da marca
  const c1 = h('input', { type: 'color', value: '#2f7bbd', 'aria-label': 'Cor principal' });
  const c2 = h('input', { type: 'color', value: '#0e2236', 'aria-label': 'Cor de apoio' });
  const palBtn = h('button', { type: 'button', class: 'lp-round', title: 'Cores da marca', 'aria-label': 'Cores da marca', disabled }, I.palette());
  const pal = popover(palBtn, (close) => [h('p', { class: 'lp-mlabel' }, 'Cores da marca'),
    h('div', { class: 'lp-colors' }, h('label', c1, h('span', 'Principal')), h('label', c2, h('span', 'Apoio'))),
    h('div', { class: 'lp-pop-acts' }, colors && h('button', { type: 'button', class: 'lp-link', onclick: () => { colors = null; paint(); close(); } }, 'Tirar cores'),
      h('button', { type: 'button', class: 'lp-pill sm', onclick: () => { colors = [c1.value, c2.value]; paint(); close(); } }, 'Usar no site'))], 'lp-pal');

  // ---- ditado por voz (Chrome/Edge/Safari); sem suporte, o botão não aparece
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  const micBtn = Rec ? h('button', { type: 'button', class: 'lp-round', title: 'Ditar por voz', 'aria-label': 'Ditar por voz', 'aria-pressed': 'false', disabled }, I.mic()) : null;
  micBtn?.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new Rec(); rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { const t = e.results[i][0].transcript.trim(); ta.value = (ta.value.trim() ? ta.value.trimEnd() + ' ' : '') + t; } paint(); };
    rec.onerror = (e) => { if (e.error === 'not-allowed') toast('Libere o microfone no navegador para ditar.', 'err'); };
    rec.onend = () => { rec = null; micBtn.classList.remove('on'); micBtn.setAttribute('aria-pressed', 'false'); };
    try { rec.start(); micBtn.classList.add('on'); micBtn.setAttribute('aria-pressed', 'true'); } catch { rec = null; }
  });

  // ---- otimizar prompt
  const optBtn = h('button', { type: 'button', class: 'lp-pill', disabled }, 'Otimizar prompt');
  optBtn.addEventListener('click', async () => {
    const text = ta.value.trim();
    if (!text) { toast('Escreva primeiro a ideia do site.', 'err'); ta.focus(); return; }
    optBtn.disabled = true; optBtn.classList.add('busy'); optBtn.textContent = 'Otimizando…';
    try { const r = await api.post('/code-maker', { action: 'optimize', text, model: sel.model, effort: sel.effort }); undoText = text; ta.value = r.text; paint(); ta.focus(); }
    catch (e) { fail(e); } finally { optBtn.disabled = disabled; optBtn.classList.remove('busy'); optBtn.textContent = 'Otimizar prompt'; }
  });

  const plusBtn = h('button', { type: 'button', class: 'lp-round', title: 'Anexar fotos, logo ou documentos', 'aria-label': 'Anexar fotos, logo ou documentos', disabled, onclick: () => att.picker.click() }, I.plus());
  const send = h('button', { type: 'button', class: 'lp-go' }, h('span', 'Criar site'), I.arrow());
  send.addEventListener('click', submit);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } });
  ta.addEventListener('input', () => { if (undoText != null) { undoText = null; } paint(); });
  ta.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); att.take(f); } });

  async function submit() {
    if (busy || disabled) return;
    const text = ta.value.trim();
    if (!text && !att.files.length) { compose.classList.remove('shake'); void compose.offsetWidth; compose.classList.add('shake'); ta.focus(); return; }
    if (!att.ready()) { toast('Espere as imagens terminarem de enviar.', 'err'); return; }
    let details = composeDetails(text || 'Crie o site com base nos arquivos anexados.', att.files);
    if (colors) details += `\n\nCores da marca (use como principais): principal ${colors[0]}, apoio ${colors[1]}.`;
    busy = true; paint();
    try { await opts.onCreate({ details, assets: att.assets(), model: sel.model, effort: sel.effort, baseRef: base?.id || null }); }
    finally { busy = false; paint(); }
  }

  // ---- chips: base escolhida, cores, voltar ao texto anterior, anexos
  function paint() {
    mount(chips,
      base && h('span', { class: 'lp-chip' }, h('img', { src: `/img/refs/${base.id}.webp`, alt: '' }), h('span', `Base: ${base.label}`), h('button', { type: 'button', 'aria-label': 'Tirar a base', onclick: () => choose(null) }, I.x())),
      colors && h('span', { class: 'lp-chip' }, h('i', { style: `background:${colors[0]}` }), h('i', { style: `background:${colors[1]}` }), h('span', 'Cores da marca'), h('button', { type: 'button', 'aria-label': 'Tirar as cores', onclick: () => { colors = null; paint(); } }, I.x())),
      undoText != null && h('button', { type: 'button', class: 'lp-chip undo', onclick: () => { ta.value = undoText; undoText = null; paint(); ta.focus(); } }, 'Voltar ao texto anterior'));
    chips.hidden = !chips.childNodes.length;
    palBtn.classList.toggle('on', !!colors);
    send.disabled = disabled || busy;
    send.classList.toggle('busy', busy);
    send.querySelector('span').textContent = busy ? 'Criando…' : 'Criar site';
  }

  // ---- modelos (carrossel de 4 por página)
  const grid = h('div', { class: 'lp-grid' });
  const prev = h('button', { type: 'button', class: 'lp-arrow', 'aria-label': 'Modelos anteriores', onclick: () => { page = (page - 1 + pages()) % pages(); drawModels(); } }, I.left());
  const next = h('button', { type: 'button', class: 'lp-arrow', 'aria-label': 'Próximos modelos', onclick: () => { page = (page + 1) % pages(); drawModels(); } }, I.right());
  const pages = () => Math.ceil(MODELS.length / PER_PAGE);
  function choose(m) {
    base = m && base?.id !== m.id ? m : null;
    if (base && !ta.value.trim()) { ta.value = base.prompt; }
    paint(); drawModels();
  }
  function drawModels() {
    mount(grid, MODELS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((m) => h('button', { type: 'button', class: 'lp-card' + (base?.id === m.id ? ' on' : ''), 'aria-pressed': String(base?.id === m.id), disabled, onclick: () => choose(m), title: base?.id === m.id ? 'Tirar como base' : 'Usar como base do site' },
      h('img', { src: `/img/refs/${m.id}.webp`, alt: '', loading: 'lazy', decoding: 'async' }), h('span', m.label), base?.id === m.id && h('em', I.check(), 'Base'))));
  }

  const compose = h('div', { class: 'lp-compose' + (disabled ? ' off' : '') }, chips, att.chips, ta, h('div', { class: 'lp-row' }, modelBtn),
    h('div', { class: 'lp-bar' }, plusBtn, optBtn, h('span', { class: 'lp-grow' }), palBtn, micBtn, send), att.picker);
  ['dragenter', 'dragover'].forEach((ev) => compose.addEventListener(ev, (e) => { if (disabled || !e.dataTransfer?.types?.includes('Files')) return; e.preventDefault(); compose.classList.add('drop'); }));
  compose.addEventListener('dragleave', (e) => { if (!compose.contains(e.relatedTarget)) compose.classList.remove('drop'); });
  compose.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); compose.classList.remove('drop'); att.take(e.dataTransfer.files); });

  const usage = h('span', { class: 'lp-usage' });
  api.get('/code-maker/usage').then((u) => { usage.textContent = `${u.sites_today}/${u.sites_limit} hoje`; usage.title = `Hoje: ${u.sites_today} de ${u.sites_limit} sites e ${u.edits_today} de ${u.edits_limit} alterações`; usage.classList.toggle('full', u.sites_today >= u.sites_limit); }).catch(() => { usage.hidden = true; });

  // Emblema (onda da Siri) e fundo (túnel gigabit) em WebGL2, nas cores da Neva; sem WebGL2 ficam o SVG e os feixes em CSS.
  const emblemEl = h('div', { class: 'lp-emblem', 'aria-hidden': 'true' });
  const orb = shaderCanvas(SIRI_WAVE_NEVA, { pixelRatio: 1.5, className: 'lp-orb lp-wave', onFirstFrame: () => emblemEl.classList.add('on') });
  if (orb) { emblemEl.classList.add('gl'); emblemEl.append(orb.el); } else emblemEl.append(emblem());
  const bg = shaderCanvas(GIGABIT_NEVA, { pixelRatio: 0.6, timeOffset: 18, className: 'lp-bg', onFirstFrame: () => el.querySelector('.lp-stage')?.classList.add('gl-on') });

  const el = h('section', { class: 'lp' },
    h('div', { class: 'lp-stage' },
      bg?.el, h('div', { class: 'lp-rays', 'aria-hidden': 'true' }), h('div', { class: 'lp-dust', 'aria-hidden': 'true' }),
      h('header', { class: 'lp-top' }, h('a', { class: 'lp-back', href: '#/sites' }, I.back(), 'Voltar aos sites'), h('span', { class: 'lp-grow' }),
        h('span', { class: 'lp-tag' }, h('i'), 'Builder de sites'), usage),
      emblemEl,
      h('h1', { class: 'lp-title' }, `O que vamos criar, ${opts.name}?`),
      disabled && opts.offMessage && h('p', { class: 'lp-off' }, opts.offMessage),
      h('div', { class: 'lp-panel' }, compose,
        h('div', { class: 'lp-models' }, grid,
          h('div', { class: 'lp-mfoot' }, h('a', { class: 'lp-pill dark', href: '#/design' }, 'Ver todos os modelos', I.arrow()), h('span', { class: 'lp-grow' }), prev, next)))));

  paintModel(); paint(); drawModels();
  return { el, focus: () => ta.focus(), destroy: () => { rec?.stop(); menu.close(); pal.close(); orb?.destroy(); bg?.destroy(); } };

  function item(label, hint, on, fn) {
    return h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(on), class: 'lp-mi', onclick: fn }, h('span', h('b', label), hint && h('small', hint)), on && I.check());
  }
}

// Menu flutuante preso ao botão (fecha com Esc e com clique fora).
function popover(trigger, build, cls = '') {
  let el = null;
  const close = () => { if (!el) return; el.remove(); el = null; trigger.setAttribute('aria-expanded', 'false'); trigger.classList.remove('open'); document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  const away = (e) => { if (el && !el.contains(e.target) && !trigger.contains(e.target)) close(); };
  const key = (e) => { if (e.key === 'Escape') { close(); trigger.focus(); } };
  const open = () => {
    el = h('div', { class: 'lp-pop ' + cls, role: 'menu' }, build(close));
    trigger.after(el); trigger.setAttribute('aria-expanded', 'true'); trigger.classList.add('open');
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', key);
  };
  trigger.addEventListener('click', () => (el ? close() : open()));
  return { close, refresh: () => { if (el) mount(el, build(close)); } };
}

// Emblema de luz (lente azul com brilho), no lugar do símbolo da referência.
function emblem() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 260 120');
  s.innerHTML = `<defs>
    <linearGradient id="lp-e1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f7bbd" stop-opacity="0"/><stop offset=".22" stop-color="#7fbdf2"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".78" stop-color="#7fbdf2"/><stop offset="1" stop-color="#2f7bbd" stop-opacity="0"/></linearGradient>
    <linearGradient id="lp-e2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e5f9e" stop-opacity="0"/><stop offset=".5" stop-color="#8fc6f5"/><stop offset="1" stop-color="#1e5f9e" stop-opacity="0"/></linearGradient>
    <filter id="lp-b1" x="-30%" y="-120%" width="160%" height="340%"><feGaussianBlur stdDeviation="11"/></filter>
    <filter id="lp-b2" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="4.5"/></filter>
  </defs>
  <ellipse cx="130" cy="62" rx="108" ry="24" fill="#4a95d2" opacity=".75" filter="url(#lp-b1)"/>
  <ellipse cx="130" cy="58" rx="74" ry="9" fill="#ffffff" opacity=".9" filter="url(#lp-b2)"/>
  <path d="M8 63 C 58 4, 202 4, 252 63 C 202 37, 58 37, 8 63 Z" fill="url(#lp-e1)"/>
  <path d="M28 67 C 86 104, 174 104, 232 67 C 174 83, 86 83, 28 67 Z" fill="url(#lp-e2)"/>
  <path d="M58 52 C 96 29, 164 29, 202 52" fill="none" stroke="#ffffff" stroke-opacity=".95" stroke-width="2.6" stroke-linecap="round"/>`;
  return s;
}
