// Componentes UI: galeria de componentes em JavaScript puro,
// no azul da Neva. Cada cartão monta o componente ao entrar na tela e o desmonta ao sair (animações e canvas não ficam rodando fora de vista).
// Abrir em tela grande: botão "Ampliar" (ou #/componentes/<nome>).
import { heroWaves } from '../hero-waves.js';
import { h, mount, icon, modal, hero, copyText, downloadFile, toast } from '../ui.js';
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
    let cat = 'Todos'; let q = ''; const live = new Map(); // stage -> { item, stop, on }
    const items = () => KIT.filter((i) => (cat === 'Todos' || i.cat === cat) && (!q || norm(`${i.name} ${i.desc} ${i.cat} ${i.slug} ${i.src === 'mp' ? 'motion primitives react' : ''}`).includes(norm(q))));
    const grid = h('div', { class: 'kk-list' });
    const count = h('span', { class: 'kk-count' });
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const rec = live.get(en.target); if (!rec) continue;
        if (en.isIntersecting && !rec.on) { rec.on = true; run(en.target, rec.item, false).then((stop) => { if (rec.on) rec.stop = stop; else stop(); }); }
        else if (!en.isIntersecting && rec.on) { rec.on = false; rec.stop?.(); rec.stop = null; en.target.replaceChildren(); }
      }
    }, { rootMargin: '240px 0px' });
    const release = () => { for (const [stage, rec] of live) { rec.on = false; rec.stop?.(); io.unobserve(stage); } live.clear(); };

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
    const card = (item) => {
      const stage = h('div', { class: 'kk-stage' + (item.src === 'mp' ? ' mp' : ''), 'data-slug': item.slug }, h('span', { class: 'kk-skel', 'aria-hidden': 'true' }));
      live.set(stage, { item, on: false, stop: null });
      return h('article', { class: 'kk-card' + (WIDE.has(item.slug) ? ' wide' : '') + (TALL.has(item.slug) ? ' tall' : ''), id: 'kk-' + item.slug },
        h('div', { class: 'kk-frame' }, stage),
        h('div', { class: 'kk-foot' },
          h('div', { class: 'kk-meta' },
            h('div', { class: 'kk-name' }, h('b', item.name), h('span', { class: 'kk-cat' }, item.cat), item.src === 'mp' && h('span', { class: 'kk-badge', title: 'Motion Primitives · licença MIT' }, 'Motion Primitives')),
            h('p', item.desc)),
          h('div', { class: 'kk-acts' },
            item.src === 'mp' && h('button', { type: 'button', class: 'kk-ic', title: 'Copiar o código-fonte', 'aria-label': `Copiar o código de ${item.name}`, onclick: () => copyCode(item) }, icon('code')),
            h('button', { type: 'button', class: 'kk-ic', title: 'Copiar o prompt de integração', 'aria-label': `Copiar o prompt de ${item.name}`, onclick: () => openPrompt(item) }, icon('copy')),
            h('button', { type: 'button', class: 'kk-open', onclick: () => expand(item) }, icon('expand'), 'Abrir'))));
    };
    const draw = () => {
      release(); const list = items();
      count.textContent = `${list.length} de ${KIT.length}`;
      if (!list.length) mount(grid, h('div', { class: 'empty' }, h('b', 'Nenhum componente encontrado'), 'Tente outra palavra ou categoria.'));
      else if (cat === 'Todos' && !q) {
        // visão geral: uma seção por categoria, com título e contagem (fica mais fácil de achar e menos repetitivo)
        mount(grid, CATS.slice(1).map((c) => { const part = list.filter((i) => i.cat === c); return part.length && h('section', { class: 'kk-sec' },
          h('header', { class: 'kk-sechead' }, h('h2', c, h('span', part.length)), h('p', CAT_INFO[c] || '')), h('div', { class: 'kk-grid' }, part.map(card))); }));
      } else mount(grid, h('div', { class: 'kk-grid' }, list.map(card)));
      for (const stage of live.keys()) io.observe(stage);
    };
    const search = h('input', { type: 'search', class: 'kk-q', placeholder: 'Buscar componente: botão, cartão, IA…', 'aria-label': 'Buscar componente', oninput: (e) => { q = e.target.value; draw(); } });
    const pills = h('div', { class: 'pills kk-pills', role: 'tablist' }, CATS.map((c) => h('button', { type: 'button', class: 'pill' + (c === cat ? ' on' : ''), role: 'tab', onclick: (e) => { cat = c; pills.querySelectorAll('.pill').forEach((p) => p.classList.toggle('on', p === e.currentTarget)); draw(); } }, c)));
    const bar = h('div', { class: 'kk-bar' }, h('div', { class: 'kk-sbox' }, icon('search'), search), pills, count);
    const heroEl = hero({ kicker: 'Neva Growth / Componentes UI', title: 'Componentes prontos para o seu site.', subtitle: 'Componentes de interface no azul da Neva: os nossos em JavaScript puro e os do Motion Primitives em React + Motion. Interaja com cada um e abra em tela grande.',
        stats: h('div', { class: 'chips3' }, h('span', { class: 'chipk' }, icon('layers'), `${KIT.length} componentes`), h('span', { class: 'chipk' }, icon('code'), `${KIT.filter((i) => i.src !== 'mp').length} em JavaScript puro · ${KIT.filter((i) => i.src === 'mp').length} Motion Primitives`)) });
    mount(box, heroEl, bar, grid);
    const fx = heroWaves(heroEl);
    draw();
    const open = ctx.params?.[0] && KIT.find((i) => i.slug === ctx.params[0]);
    if (open) { document.getElementById('kk-' + open.slug)?.scrollIntoView({ block: 'center' }); expand(open); }
    return () => { release(); io.disconnect(); fx.destroy(); };
  }
};
