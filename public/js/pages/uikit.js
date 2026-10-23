// Componentes UI: galeria dos componentes do Kokonut UI (MIT, https://kokonutui.com) reescritos em JavaScript puro,
// no azul da Neva. Cada cartão monta o componente ao entrar na tela e o desmonta ao sair (animações e canvas não ficam rodando fora de vista).
// Abrir em tela grande: botão "Ampliar" (ou #/componentes/<nome>).
import { h, mount, icon, modal } from '../ui.js';
import { KIT } from '../ui-kit/manifest.js';

const CATS = ['Todos', 'Fundos', 'Cartões', 'Navegação', 'Campos', 'IA', 'Mídia', 'Textos', 'Botões'];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function load(slug) {
  try { return (await import(`../ui-kit/c/${slug}.js`)).default; } catch (e) { if (/Failed to fetch|Cannot find|Unexpected token|404|error loading/i.test(String(e?.message))) return null; console.error('[ui-kit]', slug, e); return 'erro'; }
}

/** Monta um componente num palco; devolve a limpeza. */
async function run(stage, item, big) {
  const fn = await load(item.slug);
  if (typeof fn !== 'function') { stage.replaceChildren(h('p', { class: 'kk-empty' }, fn === 'erro' ? 'Este componente falhou ao abrir.' : item.pro ? 'Exclusivo do Kokonut UI Pro (código não público).' : 'Em breve.')); return () => {}; }
  stage.replaceChildren();
  try { const out = await fn(stage, { big, theme: 'light' }); return typeof out === 'function' ? out : () => {}; }
  catch (e) { console.error('[ui-kit]', item.slug, e); stage.replaceChildren(h('p', { class: 'kk-empty' }, 'Este componente falhou ao abrir.')); return () => {}; }
}

export default {
  async render(box, ctx) {
    let cat = 'Todos'; let q = ''; const live = new Map(); // stage -> { item, stop, on }
    const items = () => KIT.filter((i) => (cat === 'Todos' || i.cat === cat) && (!q || norm(`${i.name} ${i.desc} ${i.cat} ${i.slug}`).includes(norm(q))));
    const grid = h('div', { class: 'kk-grid' });
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
      const stage = h('div', { class: 'kk-stage big' }); let stop = () => {};
      modal({ title: item.name, size: 'kk-modal', body: h('div', { class: 'kk-big' }, stage, h('p', { class: 'kk-desc' }, item.desc)), onClose: () => stop() });
      run(stage, item, true).then((s) => { stop = s; });
      history.replaceState(null, '', `#/componentes/${item.slug}`);
    };
    const card = (item) => {
      const stage = h('div', { class: 'kk-stage', 'data-slug': item.slug });
      live.set(stage, { item, on: false, stop: null });
      return h('article', { class: 'kk-card', id: 'kk-' + item.slug },
        stage,
        h('div', { class: 'kk-meta' }, h('div', h('b', item.name), h('span', { class: 'kk-tag' }, item.cat)), h('p', item.desc)),
        h('div', { class: 'kk-acts' },
          h('button', { type: 'button', class: 'btn sm ghost', disabled: item.pro, onclick: () => expand(item) }, icon('expand'), 'Ampliar'),
          h('a', { class: 'kk-src', href: item.url, target: '_blank', rel: 'noopener' }, 'Original ↗')));
    };
    const draw = () => {
      release(); const list = items();
      count.textContent = `${list.length} de ${KIT.length} componentes`;
      mount(grid, ...(list.length ? list.map(card) : [h('div', { class: 'empty' }, h('b', 'Nenhum componente encontrado'), 'Tente outra palavra ou categoria.')]));
      for (const stage of live.keys()) io.observe(stage);
    };
    const search = h('input', { type: 'search', class: 'kk-q', placeholder: 'Buscar componente (ex.: botão, cartão, IA)', 'aria-label': 'Buscar componente', oninput: (e) => { q = e.target.value; draw(); } });
    const pills = h('div', { class: 'pills kk-pills', role: 'tablist' }, CATS.map((c) => h('button', { type: 'button', class: 'pill' + (c === cat ? ' on' : ''), role: 'tab', onclick: (e) => { cat = c; pills.querySelectorAll('.pill').forEach((p) => p.classList.toggle('on', p === e.currentTarget)); draw(); } }, c)));
    mount(box,
      h('div', { class: 'kk-head' }, h('div', h('h1', 'Componentes UI'), h('p', 'Os componentes do Kokonut UI (licença MIT) reescritos em JavaScript puro, no azul da Neva. Interaja com cada um; "Ampliar" abre em tela grande.')), count),
      h('div', { class: 'kk-bar' }, search, pills), grid);
    draw();
    const open = ctx.params?.[0] && KIT.find((i) => i.slug === ctx.params[0]);
    if (open && !open.pro) { document.getElementById('kk-' + open.slug)?.scrollIntoView({ block: 'center' }); expand(open); }
    return () => { release(); io.disconnect(); };
  }
};
