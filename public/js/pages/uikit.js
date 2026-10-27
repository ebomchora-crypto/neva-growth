// Componentes UI: galeria de componentes em JavaScript puro,
// no azul da Neva. Cada cartão monta o componente ao entrar na tela e o desmonta ao sair (animações e canvas não ficam rodando fora de vista).
// Abrir em tela grande: botão "Ampliar" (ou #/componentes/<nome>).
import { h, mount, icon, modal, copyText, downloadFile, toast } from '../ui.js';
import { KIT } from '../ui-kit/manifest.js';

const CATS = ['Todos', 'Fundos', 'Cartões', 'Navegação', 'Campos', 'IA', 'Mídia', 'Textos', 'Botões', 'Efeitos'];
const CAT_INFO = { Fundos: 'Fundos animados para o topo da página e para seções.', 'Cartões': 'Cartões interativos para mostrar dados, mídia e conteúdo.', 'Navegação': 'Menus, abas, barras, gavetas e painéis.',
  Campos: 'Entradas, seletores e controles de formulário.', IA: 'Peças de interface para produtos com IA.', 'Mídia': 'Foto, vídeo, galerias e carrosséis.', Textos: 'Títulos e textos animados.',
  'Botões': 'Botões com resposta e microinterações.', Efeitos: 'Efeitos de interação para aplicar em qualquer elemento.' };
// Cartões largos (ocupam a linha toda): fundos e componentes que precisam de espaço horizontal para aparecer de verdade
const WIDE = new Set(['dot-field', 'background-paths', 'shape-hero', 'flow-field', 'topo-background', 'drape-background', 'halftone-background',
  'bento-grid', 'ai-agent-lanes', 'ai-diff-review', 'ai-citations', 'mp-infinite-slider', 'mp-image-comparison', 'mp-dock']);
// Cartões altos: componentes que abrem menus/painéis ou têm controles embaixo e ficariam cortados na altura padrão
const TALL = new Set(['card-flip', 'ai-model-selector', 'ai-context-meter', 'ai-loading', 'ai-prompt', 'ai-input-search', 'scroll-index', 'timezone-planner',
  'currency-transfer', 'receipt-printer', 'page-flip', 'avatar-picker', 'ai-autocomplete', 'synced-transcript', 'clip-trimmer']);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function load(item) {
  // Motion Primitives: módulos React gerados em ../ui-kit/mp (React e Motion carregados só aqui, sob demanda)
  try { return (await import(item.src === 'mp' ? `../ui-kit/mp/${item.mp}.js` : `../ui-kit/c/${item.slug}.js`)).default; } catch (e) { if (/Failed to fetch|Cannot find|Unexpected token|404|error loading/i.test(String(e?.message))) return null; console.error('[ui-kit]', item.slug, e); return 'erro'; }
}

/** Prompt de integração do componente (texto completo, com o código original e as dependências), em /ui-prompts/<slug>.txt. */
async function buildPrompt(item) {
  const r = await fetch(`/ui-prompts/${item.slug}.txt`);
  if (!r.ok) throw new Error('Não consegui carregar o prompt deste componente.');
  return r.text();
}
async function openPrompt(item) {
  let text;
  try { text = await buildPrompt(item); } catch (e) { toast(e.message, 'err'); return; }
  copyText(text, 'Prompt copiado.');
  modal({ title: `Prompt: ${item.name}`, size: 'kk-modal', body: h('div', { class: 'stack' },
    h('p', { class: 'sm mut' }, 'Já copiei para a área de transferência. Cole no seu assistente de código (Claude, ChatGPT, Cursor, Codex): o prompt leva o código completo do componente e as dependências.'),
    h('pre', { class: 'code kk-prompt', tabindex: 0 }, text),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => copyText(text, 'Prompt copiado.') }, icon('copy'), 'Copiar prompt'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => downloadFile(`${item.slug}-prompt.txt`, text) }, 'Baixar .txt'))) });
}

/** Código-fonte original (componentes do Motion Primitives), em /ui-code/<slug>.tsx. */
async function getCode(item) {
  const r = await fetch(`/ui-code/${item.slug}.tsx`);
  if (!r.ok) throw new Error('Não consegui carregar o código deste componente.');
  return r.text();
}
async function copyCode(item) {
  try { copyText(await getCode(item), 'Código copiado.'); } catch (e) { toast(e.message, 'err'); }
}

/** Monta um componente num palco; devolve a limpeza. */
async function run(stage, item, big) {
  const fn = await load(item);
  if (typeof fn !== 'function') { stage.replaceChildren(h('p', { class: 'kk-empty' }, fn === 'erro' ? 'Este componente falhou ao abrir.' : 'Em breve.')); return () => {}; }
  stage.replaceChildren();
  try { const out = await fn(stage, { big, theme: 'light' }); return typeof out === 'function' ? out : () => {}; }
  catch (e) { console.error('[ui-kit]', item.slug, e); stage.replaceChildren(h('p', { class: 'kk-empty' }, 'Este componente falhou ao abrir.')); return () => {}; }
}

export default {
  async render(box, ctx) {
    let cat = 'Todos'; let q = ''; let src = 'todos'; const live = new Map(); // stage -> { item, stop, on }
    const items = () => KIT.filter((i) => (cat === 'Todos' || i.cat === cat) && (src === 'todos' || (src === 'mp') === (i.src === 'mp')) && (!q || norm(`${i.name} ${i.desc} ${i.cat} ${i.slug} ${i.src === 'mp' ? 'motion primitives react' : ''}`).includes(norm(q))));
        const count = h('span', { class: 'kk-count' });
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const rec = live.get(en.target); if (!rec) continue;
        if (en.isIntersecting && !rec.on) { rec.on = true; run(en.target, rec.item, false).then((stop) => { if (rec.on) rec.stop = stop; else stop(); }); }
        else if (!en.isIntersecting && rec.on) { rec.on = false; rec.stop?.(); rec.stop = null; en.target.replaceChildren(); }
      }
    }, { rootMargin: '240px 0px' });
    const release = () => { scaler.disconnect(); for (const [stage, rec] of live) { rec.on = false; rec.stop?.(); io.unobserve(stage); } live.clear(); };

    const expand = (item) => {
      const stage = h('div', { class: 'kk-stage big' + (item.src === 'mp' ? ' mp' : '') }); let stop = () => {};
      const code = item.src === 'mp' && h('details', { class: 'kk-code', ontoggle: async (e) => {
        const pre = e.currentTarget.querySelector('pre'); if (!e.currentTarget.open || pre.dataset.loaded) return;
        try { pre.textContent = await getCode(item); pre.dataset.loaded = '1'; } catch (err) { pre.textContent = err.message; } } },
        h('summary', 'Código-fonte (', h('code', `components/core/${item.mp}.tsx`), ')'),
        h('div', { class: 'row', style: 'margin:8px 0' }, h('button', { type: 'button', class: 'btn sm', onclick: () => copyCode(item) }, icon('copy'), 'Copiar código'),
          h('a', { class: 'btn ghost sm', href: `https://motion-primitives.com/docs/${item.mp}`, target: '_blank', rel: 'noopener' }, 'Documentação oficial')),
        h('pre', { class: 'code kk-prompt', tabindex: 0 }, 'Carregando…'));
      modal({ title: item.name, size: 'kk-modal', body: h('div', { class: 'kk-big' }, stage, h('p', { class: 'kk-desc' }, item.desc,
        item.src === 'mp' ? h('span', { class: 'kk-src' }, ' · Motion Primitives (MIT, © ibelick)') : ''), code), onClose: () => stop() });
      run(stage, item, true).then((s) => { stop = s; });
      history.replaceState(null, '', `#/componentes/${item.slug}`);
    };
    const scaler = new ResizeObserver((es) => { for (const e of es) { const t = e.target; t.style.setProperty('--s', (e.contentRect.width / +t.style.getPropertyValue('--dw')).toFixed(4)); } });
    const card = (item, wide) => {
      const stage = h('div', { class: 'kk-stage' + (item.src === 'mp' ? ' mp' : ''), 'data-slug': item.slug }, h('span', { class: 'kk-skel', 'aria-hidden': 'true' }));
      live.set(stage, { item, on: false, stop: null });
      // a miniatura monta o componente num palco de tamanho "de verdade" (dw x dh) e o reduz para caber no cartão: nada fica cortado
      const isWide = wide && WIDE.has(item.slug); const isTall = wide && TALL.has(item.slug);
      const [dw, dh] = isWide ? [900, 440] : isTall ? [520, 650] : [520, 400];
      const thumb = h('div', { class: 'kx-thumb', style: `--dw:${dw};--dh:${dh}` }, stage);
      scaler.observe(thumb);
      return h('article', { class: 'kx-cell' + (isWide ? ' wide' : ''), id: 'kk-' + item.slug },
        thumb,
        h('div', { class: 'kx-foot' },
          h('button', { type: 'button', class: 'kx-name', title: item.desc, onclick: () => expand(item) }, h('b', item.name), item.src === 'mp' && h('span', { class: 'kx-tag' }, 'Motion')),
          h('div', { class: 'kx-acts' },
            item.src === 'mp' && h('button', { type: 'button', class: 'kx-ic', title: 'Copiar o código-fonte', 'aria-label': `Copiar o código de ${item.name}`, onclick: () => copyCode(item) }, icon('code')),
            h('button', { type: 'button', class: 'kx-ic', title: 'Copiar o prompt de integração', 'aria-label': `Copiar o prompt de ${item.name}`, onclick: () => openPrompt(item) }, icon('copy')),
            h('button', { type: 'button', class: 'kx-ic', title: 'Abrir em tela grande', 'aria-label': `Abrir ${item.name}`, onclick: () => expand(item) }, icon('expand')))));
    };
    const row = (title, sub, list, more, wide) => h('section', { class: 'kx-sec' },
      h('header', { class: 'kx-sechead' }, h('div', h('h2', title), sub && h('p', sub)), more && h('button', { type: 'button', class: 'kx-more', onclick: more }, 'Ver todos', icon('arrow'))),
      h('div', { class: 'kx-grid' + ' g3' }, list.map((i) => card(i, wide))));
    const go = (c) => { cat = c; q = ''; search.value = ''; draw(); main.scrollTo?.(0, 0); box.scrollIntoView?.({ block: 'start' }); };
    const draw = () => {
      release(); const list = items();
      count.textContent = `${list.length} de ${KIT.length}`;
      nav.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === cat && !q));
      tabs.querySelectorAll('[data-src]').forEach((b) => b.classList.toggle('on', b.dataset.src === src));
      if (!list.length) mount(content, h('div', { class: 'empty' }, h('b', 'Nenhum componente encontrado'), 'Tente outra palavra ou categoria.'));
      else if (cat === 'Todos' && !q) {
        const feat = CATS.slice(1).map((c) => list.find((i) => i.cat === c)).filter(Boolean).slice(0, 3); const used = new Set(feat.map((i) => i.slug));
        mount(content, row('Em destaque', 'Um de cada tipo, para começar.', feat, null, false),
          CATS.slice(1).map((c) => { const part = list.filter((i) => i.cat === c && !used.has(i.slug)); return part.length && row(c, CAT_INFO[c], part.slice(0, 3), () => go(c), false); }));
      } else mount(content, row(q ? `Resultados para “${q}”` : cat, q ? '' : CAT_INFO[cat], list, null, true));
      for (const stage of live.keys()) io.observe(stage);
    };
    const search = h('input', { type: 'search', class: 'kx-q', placeholder: 'Buscar', 'aria-label': 'Buscar componente', oninput: (e) => { q = e.target.value; draw(); } });
    const onKey = (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { e.preventDefault(); search.focus(); } };
    document.addEventListener('keydown', onKey);
    const side = KIT.reduce((m, i) => (m[i.cat] = (m[i.cat] || 0) + 1, m), {});
    const nav = h('nav', { class: 'kx-nav', 'aria-label': 'Categorias' },
      h('button', { type: 'button', class: 'kx-item', 'data-cat': 'Todos', onclick: () => go('Todos') }, icon('home'), h('span', 'Início')),
      h('p', { class: 'kx-lab' }, 'Explorar'),
      CATS.slice(1).map((c) => h('button', { type: 'button', class: 'kx-item', 'data-cat': c, onclick: () => go(c) }, h('span', c), h('em', side[c] || 0))));
    const SRC = [['todos', 'Todos'], ['js', 'JavaScript puro'], ['mp', 'Motion Primitives']];
    const tabs = h('div', { class: 'kx-tabs', role: 'tablist' }, SRC.map(([k, l]) => h('button', { type: 'button', role: 'tab', class: 'kx-tab', 'data-src': k, onclick: () => { src = k; draw(); } }, l)), count);
    const content = h('div', { class: 'kx-content' });
    const main = h('div', { class: 'kx-main' }, tabs, content);
    mount(box, h('div', { class: 'kx' }, h('aside', { class: 'kx-side' }, h('label', { class: 'kx-sbox' }, icon('search'), search, h('kbd', '/')), nav), main));
    draw();
    const open = ctx.params?.[0] && KIT.find((i) => i.slug === ctx.params[0]);
    if (open) { document.getElementById('kk-' + open.slug)?.scrollIntoView({ block: 'center' }); expand(open); }
    return () => { release(); io.disconnect(); scaler.disconnect(); document.removeEventListener('keydown', onKey); };
  }
};
