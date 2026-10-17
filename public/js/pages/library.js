import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, debounce, copyText, downloadFile, pills, hero, statCard } from '../ui.js';

const KIND = { prompt: ['Prompt Lab', 'Prompts prontos para usar'], skill: ['Skill Vault', 'Métodos e instalação'], animation: ['Animações', 'Movimento para sites'], design: ['Design', 'Referências'] };
const EXT = { prompt: 'txt', skill: 'md', animation: 'html', design: 'md' };
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function openItem(it, ctx, reload) {
  const full = await api.get('/library/' + it.id);
  const isAdmin = ctx.user.role === 'admin';
  modal({ title: full.title, size: 'lg', body: h('div', { class: 'stack' }, h('div', { class: 'row' }, h('span', { class: 'badge' }, KIND[full.kind][0]), full.category && h('span', { class: 'badge' }, full.category), full.niche && h('span', { class: 'badge' }, full.niche), full.style && h('span', { class: 'badge' }, full.style), full.site_type && h('span', { class: 'badge' }, full.site_type)),
    full.summary && h('p', { class: 'mut', style: 'margin:0' }, full.summary), full.url && h('a', { href: full.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir site de referência'), h('pre', { class: 'code', style: 'max-height:50vh;white-space:pre-wrap' }, full.content)),
    actions: [isAdmin && { label: 'Editar', kind: 'ghost', keepOpen: true, onClick: (close) => { close(); itemForm(full, reload); } },
      { label: 'Baixar', kind: 'ghost', keepOpen: true, onClick: () => { downloadFile(`${slug(full.title)}.${EXT[full.kind]}`, full.content); return false; } }, { label: 'Copiar', keepOpen: true, onClick: () => { copyText(full.content, 'Conteúdo copiado.'); return false; } }].filter(Boolean) });
}
async function itemForm(rec, reload, kindDefault) {
  const meta = await api.get('/library/meta'); const kind = rec?.kind || kindDefault;
  const defs = [{ k: 'kind', l: 'Tipo', type: 'select', opts: Object.entries(KIND).map(([k, v]) => [k, v[0]]), default: kind }, { k: 'title', l: 'Título', req: true }, { k: 'category', l: 'Categoria' },
    { k: 'min_plan', l: 'Plano mínimo', type: 'select', opts: meta.plans.map((p) => [p.key, p.name]), default: 'member' }, { k: 'summary', l: 'Resumo', wide: true },
    ...(kind === 'design' ? [{ k: 'niche', l: 'Nicho' }, { k: 'style', l: 'Estilo visual' }, { k: 'site_type', l: 'Tipo de site' }, { k: 'url', l: 'URL de referência' }] : []),
    { k: 'content', l: kind === 'design' ? 'DESIGN.md' : 'Conteúdo', type: 'textarea', rows: 12, wide: true }, { k: 'published', l: 'Publicado', type: 'checkbox', default: 1 }];
  const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, rec?.[d.k])));
  modal({ title: rec ? 'Editar recurso' : 'Novo recurso', size: 'lg', body: f, actions: [
    rec && { label: 'Excluir', kind: 'danger', keepOpen: true, onClick: async (close) => { if (!(await confirmBox(`Excluir "${rec.title}"?`))) return false; await api.del('/library/' + rec.id); toast('Excluído.', 'ok'); close(); reload(); } },
    { label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
      if (!f.reportValidity()) return false; const d = readForm(f, defs); if (rec) await api.put('/library/' + rec.id, d); else await api.post('/library', d); toast('Recurso salvo.', 'ok'); close(); reload(); } }].filter(Boolean) });
}

// ---- Referências de design (DESIGN.md)
export const design = {
  async render(box, ctx) {
    const isAdmin = ctx.user.role === 'admin';
    const st = { q: '', niche: '', style: '', site_type: '', sort: 'title' };
    const grid = h('div', { class: 'cards' }); const count = h('span', { class: 'sm mut' }); const filtersBox = h('div', { class: 'grid g3' });
    const sel = (key, label, opts) => h('label', { class: 'field' }, h('span', label), h('select', { onchange: (e) => { st[key] = e.target.value; load(); } }, h('option', { value: '' }, 'Todos'), opts.map((o) => h('option', { value: o, selected: st[key] === o }, o))));
    async function load() {
      const meta = await api.get('/library/meta', { kind: 'design' });
      mount(filtersBox, sel('niche', 'Nicho', meta.niches), sel('style', 'Estilo visual', meta.styles), sel('site_type', 'Tipo de site', meta.siteTypes));
      const { items } = await api.get('/library', { kind: 'design', q: st.q, niche: st.niche, style: st.style, site_type: st.site_type, sort: st.sort, all: isAdmin ? 1 : '' }); count.textContent = `${items.length} referência(s)`;
      mount(grid, items.length ? items.map((it) => h('article', { class: 'card refcard' + (it.locked ? ' lock' : ''), tabindex: 0, onclick: () => (it.locked ? toast('Recurso de um plano superior.', 'err') : openItem(it, ctx, load).catch(fail)) },
        h('div', { class: 'swatch' }, it.title), h('div', { class: 'row' }, it.niche && h('span', { class: 'badge' }, it.niche), it.style && h('span', { class: 'badge' }, it.style), it.locked && h('span', { class: 'badge warn' }, '🔒 plano superior'), !it.published && h('span', { class: 'badge warn' }, 'rascunho')),
        h('p', { class: 'sm mut', style: 'margin:0' }, it.summary || ''))) : h('div', { class: 'card empty', style: 'grid-column:1/-1' }, h('b', 'Nenhuma referência encontrada'), isAdmin ? 'Cadastre referências com DESIGN.md em "+ Nova referência".' : 'Peça a um administrador para cadastrar referências.'));
    }
    mount(box, hero({ kicker: 'Neva Growth / Design', title: 'Identidades reais. DESIGN.md prontos.', subtitle: 'Explore referências, copie ou baixe o DESIGN.md e use como contexto no Builder e na IDE.',
      actions: [isAdmin && h('button', { class: 'btn', onclick: () => itemForm(null, load, 'design') }, '+ Nova referência')] }),
      h('div', { class: 'card pad stack' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('input', { type: 'search', style: 'max-width:380px', placeholder: 'Buscar referência, estilo ou categoria', 'aria-label': 'Buscar', oninput: debounce((e) => { st.q = e.target.value; load(); }) }), count), filtersBox,
        h('button', { class: 'btn ghost sm', style: 'align-self:flex-start', onclick: () => { Object.assign(st, { q: '', niche: '', style: '', site_type: '' }); design.render(box, ctx); } }, 'Limpar filtros')), h('div', { style: 'height:14px' }), grid);
    await load();
  }
};

// ---- Acervo: Prompt Lab · Skill Vault · Animações
export const acervo = {
  async render(box, ctx) {
    const isAdmin = ctx.user.role === 'admin'; let kind = 'prompt'; let selected = null; const st = { q: '', category: '' };
    const listBox = h('div'); const detail = h('div'); const tabs = h('div'); const toolbar = h('div');
    async function load() {
      const meta = await api.get('/library/meta', { kind });
      const { items } = await api.get('/library', { kind, q: st.q, category: st.category, all: isAdmin ? 1 : '' });
      mount(toolbar, h('div', { class: 'row' }, h('input', { type: 'search', style: 'max-width:340px', placeholder: 'Buscar por objetivo, área ou palavra-chave', 'aria-label': 'Buscar', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) }),
        pills({ items: [['', 'Todos'], ...meta.categories.map((c) => [c, c])], value: st.category, onChange: (v) => { st.category = v; load(); } }), h('span', { class: 'sm mut' }, `${items.length} encontrado(s)`)));
      mount(listBox, items.length ? items.map((it, i) => h('button', { class: 'libitem' + (selected === it.id ? ' on' : '') + (it.locked ? ' lock' : ''), onclick: () => show(it) }, h('div', { class: 'sm mut' }, `${String(i + 1).padStart(2, '0')} · ${it.category || KIND[kind][0]}${it.locked ? ' · 🔒' : ''}${it.published ? '' : ' · rascunho'}`), h('div', { class: 't' }, it.title)))
        : h('div', { class: 'empty' }, h('b', 'Nenhum recurso'), isAdmin ? 'Use "+ Novo recurso" para cadastrar.' : 'Nada publicado ainda.'));
      if (!selected && items[0] && !items[0].locked) show(items[0]); else if (!items.length) mount(detail, h('div', { class: 'empty' }, 'Selecione um recurso.'));
    }
    async function show(it) {
      selected = it.id; listBox.querySelectorAll('.libitem').forEach((b) => b.classList.remove('on'));
      if (it.locked) return mount(detail, h('div', { class: 'empty' }, h('b', '🔒 Recurso de plano superior'), 'Peça a um administrador para alterar seu plano em Associação.'));
      try { const full = await api.get('/library/' + it.id);
        mount(detail, h('div', { class: 'pad stack' }, h('div', { class: 'row' }, h('span', { class: 'badge' }, KIND[full.kind][0]), full.category && h('span', { class: 'badge' }, full.category)), h('h2', full.title), full.summary && h('p', { class: 'mut', style: 'margin:0' }, full.summary),
          h('pre', { class: 'code', style: 'white-space:pre-wrap;max-height:55vh' }, full.content),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(full.content, 'Copiado.') }, 'Copiar'), h('button', { class: 'btn ghost', onclick: () => downloadFile(`${slug(full.title)}.${EXT[full.kind]}`, full.content) }, 'Baixar'), isAdmin && h('button', { class: 'btn ghost', onclick: () => itemForm(full, load) }, 'Editar'))));
      } catch (e) { mount(detail, h('div', { class: 'empty' }, e.message)); }
    }
    const drawTabs = () => mount(tabs, h('div', { class: 'tabs' }, ['prompt', 'skill', 'animation'].map((k) => h('button', { class: kind === k ? 'on' : '', onclick: () => { kind = k; selected = null; st.category = ''; drawTabs(); load(); } }, KIND[k][0], h('span', { class: 'sm mut' }, ' · ' + KIND[k][1])))));
    drawTabs();
    mount(box, hero({ kicker: 'Neva Growth / Acervo', title: 'Prompts para sair do rascunho.', subtitle: 'Escolha um recurso completo, copie ou baixe e ajuste no seu próprio chat. Para criar com IA, use o Gerador de prompts.',
      actions: [h('a', { class: 'btn ghost', href: '#/prompts' }, '✦ Gerador de prompts'), isAdmin && h('button', { class: 'btn', onclick: () => itemForm(null, load, kind) }, '+ Novo recurso')] }),
      tabs, h('div', { class: 'card pad stack', style: 'margin-bottom:14px' }, toolbar), h('div', { class: 'lib' }, h('div', { class: 'card', style: 'overflow:hidden' }, h('div', { class: 'pad', style: 'padding-bottom:6px' }, h('b', 'Explore')), listBox), h('div', { class: 'card' }, detail)));
    await load();
  }
};
