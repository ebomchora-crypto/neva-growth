import { api } from '../api.js';
import { h, mount, mascotImg, modal, confirmBox, fieldEl, readForm, toast, fail, debounce, copyText, downloadFile, pills, hero, statCard, icon } from '../ui.js';

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
    const st = { q: '', niche: '', style: '', site_type: '', sort: 'title' }; const PLURAL = { niche: 'nichos', style: 'estilos', site_type: 'tipos' };
    const grid = h('div', { class: 'dgrid' }); const count = h('b'); const filtersBox = h('div', { class: 'dfilters' }); const shortcuts = h('div', { class: 'shortcuts' });
    let meta = { niches: [], styles: [], siteTypes: [] };
    const sel = (key, label, ic, opts) => h('label', { class: 'dfield' }, icon(ic), h('span', label), h('select', { 'aria-label': label, onchange: (e) => { st[key] = e.target.value; load(); } }, h('option', { value: '' }, `Todos os ${PLURAL[key]}`), opts.map((o) => h('option', { value: o, selected: st[key] === o }, o))));
    // Cartões grandes com prévia do site, faixa de repertório depois de 12 referências e rodapé "O repertório continua".
    const hostOf = (u) => { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).host.replace(/^www\./, ''); } catch { return null; } };
    const shot = (it) => { const wrap = h('div', { class: 'dc-shot' }, h('div', { class: 'swatch' }, h('b', it.title)));
      if (it.url) { const abs = /^https?:\/\//i.test(it.url) ? it.url : 'https://' + it.url; const img = h('img', { src: `https://image.thum.io/get/width/900/crop/560/${abs}`, alt: `Prévia de ${it.title}`, loading: 'lazy', referrerpolicy: 'no-referrer' }); img.addEventListener('error', () => img.remove()); wrap.append(img); }
      wrap.append(h('span', { class: 'dc-chip' }, 'REFERÊNCIA')); return wrap; };
    const dcard = (it) => h('article', { class: 'dcard2' + (it.locked ? ' lock' : ''), tabindex: 0, onclick: () => (it.locked ? toast('Recurso de um plano superior.', 'err') : openItem(it, ctx, load).catch(fail)), onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } },
      shot(it), h('div', { class: 'dc-body' }, h('div', { class: 'dc-top' }, h('i', { class: 'cav' }, (it.title || '?')[0].toUpperCase()), h('div', h('b', it.title), h('p', it.summary || 'Uma direção visual selecionada pela Neva Design.')),
        it.url ? h('a', { class: 'dc-ext', href: /^https?:\/\//i.test(it.url) ? it.url : 'https://' + it.url, target: '_blank', rel: 'noopener noreferrer', title: 'Abrir o site', 'aria-label': 'Abrir o site', onclick: (e) => e.stopPropagation() }, icon('external')) : h('span', { class: 'dc-ext' }, icon('external'))),
        h('div', { class: 'dc-meta' }, h('span', (it.url && hostOf(it.url)) || 'neva.growth'), h('i', '·'), h('span', 'DESIGN.md')),
        h('div', { class: 'dc-tags' }, [it.site_type || 'Site', it.niche, it.style || 'Curadoria'].filter(Boolean).map((t) => h('span', t)), it.locked && h('span', { class: 'warn' }, 'plano superior'), !it.published && h('span', { class: 'warn' }, 'rascunho')),
        h('div', { class: 'dc-bar' }, h('i'), h('i'), h('i'))));
    const promo = () => h('section', { class: 'dpromo' }, h('div', { class: 'dp-l' }, h('span', { class: 'k' }, h('i', '/'), ' Neva Growth / Design'), h('h2', 'Repertório não é ornamento. É direção.'),
      h('p', 'Explore sites reais, encontre padrões e leve um DESIGN.md para orientar sua próxima criação.'), h('div', { class: 'dp-row' }, h('button', { type: 'button', class: 'dp-btn', onclick: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); box.querySelector('.ksearch input')?.focus(); } }, 'Refinar busca', h('i', icon('search'))), h('small', 'Sites reais. Decisões melhores.'))),
      h('div', { class: 'dp-r' }, mascotImg('design'), h('em', 'NG / 18—01')));
    const endcap = (n) => h('section', { class: 'dend' }, h('div', { class: 'de-n' }, h('small', 'SELEÇÃO ABERTA'), h('b', String(n)), h('small', n === 1 ? 'REFERÊNCIA EXIBIDA' : 'REFERÊNCIAS EXIBIDAS')),
      h('div', { class: 'de-m' }, h('span', { class: 'k' }, '— O REPERTÓRIO CONTINUA'), h('h2', 'Seu acervo de referências.', h('em', ' Direção pronta para construir.')), h('p', 'Explore o acervo completo com referências organizadas, leitura visual e arquivos DESIGN.md preparados para levar ao seu próximo projeto.'),
        h('div', { class: 'de-chips' }, h('span', icon('globe'), 'Curadoria internacional'), h('span', icon('file'), 'DESIGN.md pronto para copiar'))),
      h('a', { class: 'de-cta', href: '#/acervo' }, h('small', 'CONTINUAR EXPLORANDO'), h('b', 'Ver o Acervo', icon('external'))));
    function designCards(items) { const out = []; items.forEach((it, i) => { if (i === 12) out.push(promo()); out.push(dcard(it)); }); out.push(endcap(items.length)); return out; }
    function drawShortcuts() {
      const quick = meta.niches.slice(0, 6);
      mount(shortcuts, h('span', { class: 'k' }, 'Atalhos'), pills({ items: [['', 'Tudo'], ...quick.map((n) => [n, n])], value: st.niche, onChange: (v) => { st.niche = v; load(); } }),
        h('button', { class: 'btn ghost sm', style: 'margin-left:auto', onclick: () => { Object.assign(st, { q: '', niche: '', style: '', site_type: '' }); design.render(box, ctx); } }, '✕ Limpar filtros'));
    }
    async function load() {
      meta = await api.get('/library/meta', { kind: 'design' });
      mount(filtersBox, sel('niche', 'Nicho', 'building', meta.niches), sel('style', 'Estilo visual', 'palette', meta.styles), sel('site_type', 'Tipo de site', 'layout', meta.siteTypes));
      drawShortcuts();
      const { items } = await api.get('/library', { kind: 'design', q: st.q, niche: st.niche, style: st.style, site_type: st.site_type, sort: st.sort, all: isAdmin ? 1 : '' }); count.textContent = `${items.length} referência${items.length === 1 ? '' : 's'}`;
      mount(grid, items.length ? designCards(items) : h('div', { class: 'emptyart dashed', style: 'grid-column:1/-1' }, h('span', { class: 'eico' }, icon('palette')), h('b', 'Nenhuma referência encontrada'), isAdmin ? 'Cadastre referências com DESIGN.md em "+ Nova referência".' : 'Peça a um administrador para cadastrar referências.'));
    }
    const sortSel = h('select', { 'aria-label': 'Ordenar', style: 'width:auto', onchange: (e) => { st.sort = e.target.value; load(); } }, [['title', 'Nome: A → Z'], ['recent', 'Mais recentes']].map(([v, l]) => h('option', { value: v }, l)));
    mount(box, hero({ kicker: 'Design Neva / Referências', title: 'Identidades reais. DESIGN.md prontos.', art: 'design', subtitle: 'Explore sites do mundo todo, encontre sua próxima referência e leve o DESIGN.md completo para o seu projeto.',
      actions: [isAdmin && h('button', { class: 'btn', onclick: () => itemForm(null, load, 'design') }, '+ Nova referência')] }),
      h('div', { class: 'dhead' }, h('span', { class: 'k' }, h('i', '/'), ' Explore por design'), h('div', { class: 'row' }, count, sortSel)),
      h('div', { class: 'card pad stack' }, h('div', { class: 'ksearch', style: 'max-width:420px' }, icon('search'), h('input', { type: 'search', placeholder: 'Buscar referência, estilo ou categoria', 'aria-label': 'Buscar', oninput: debounce((e) => { st.q = e.target.value; load(); }) })), filtersBox, shortcuts),
      h('div', { style: 'height:14px' }), grid);
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
      total = items.filter((x) => x.published).length; try { drawHero(); } catch { /* ainda não montado */ } const c2 = document.getElementById('cnt2'); if (c2) c2.textContent = String(items.length).padStart(2, '0');
      mount(toolbar, h('div', { class: 'row' }, h('input', { type: 'search', style: 'max-width:340px', placeholder: 'Buscar por objetivo, área ou palavra-chave', 'aria-label': 'Buscar', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) }),
        pills({ items: [['', 'Todos'], ...meta.categories.map((c) => [c, c])], value: st.category, onChange: (v) => { st.category = v; load(); } }), h('span', { class: 'sm mut' }, `${items.length} encontrado(s)`)));
      mount(listBox, items.length ? items.map((it, i) => h('button', { class: 'libitem' + (selected === it.id ? ' on' : '') + (it.locked ? ' lock' : ''), onclick: () => show(it) }, h('span', { class: 'lnum' }, String(i + 1).padStart(2, '0')), h('span', { class: 'lbody' }, h('span', { class: 'lcat' }, `${it.category || KIND[kind][0]}${it.locked ? ' · 🔒' : ''}${it.published ? '' : ' · rascunho'}`), h('b', { class: 't' }, it.title), it.summary && h('span', { class: 'lsum' }, it.summary)), h('span', { class: 'larr' }, icon('chevron'))))
        : h('div', { class: 'empty' }, h('b', 'Nenhum recurso'), isAdmin ? 'Use "+ Novo recurso" para cadastrar.' : 'Nada publicado ainda.'));
      if (!selected && items[0] && !items[0].locked) show(items[0]); else if (!items.length) mount(detail, h('div', { class: 'empty' }, 'Selecione um recurso.'));
    }
    async function show(it) {
      selected = it.id; listBox.querySelectorAll('.libitem').forEach((b) => b.classList.remove('on'));
      if (it.locked) return mount(detail, h('div', { class: 'empty' }, h('b', '🔒 Recurso de plano superior'), 'Peça a um administrador para alterar seu plano em Associação.'));
      try { const full = await api.get('/library/' + it.id);
        mount(detail, h('div', { class: 'dpane' },
          h('div', { class: 'dbanner' }, h('div', { class: 'dk' }, h('span', icon('box')), `${KIND[full.kind][0].toUpperCase()} / ${full.category || 'Geral'}`), h('h2', full.title), full.summary && h('p', full.summary)),
          h('div', { class: 'dbody stack' },
            h('div', { class: 'dnotice' }, h('b', 'USO RESTRITO'), h('span', 'É proibido divulgar, compartilhar ou redistribuir este conteúdo. O descumprimento está sujeito à perda de acesso e ao banimento da plataforma.')),
            h('section', { class: 'dcard' }, h('div', { class: 'k' }, `Neva / ${KIND[full.kind][0]}`), h('h3', full.kind === 'prompt' ? 'Prompt final' : 'Conteúdo'), h('p', { class: 'sm mut', style: 'margin:2px 0 10px' }, 'Texto completo para copiar e adaptar no seu chat.'),
              h('pre', { class: 'code', style: 'white-space:pre-wrap;max-height:55vh' }, full.content),
              h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(full.content, 'Copiado.') }, 'Copiar'), h('button', { class: 'btn ghost', onclick: () => downloadFile(`${slug(full.title)}.${EXT[full.kind]}`, full.content) }, 'Baixar'), isAdmin && h('button', { class: 'btn ghost', onclick: () => itemForm(full, load) }, 'Editar'))))));
      } catch (e) { mount(detail, h('div', { class: 'empty' }, e.message)); }
    }
    const TITLES = { prompt: ['Prompts para sair do rascunho.', 'Escolha um prompt completo, copie ou baixe e ajuste os detalhes no seu próprio chat.'], skill: ['Métodos prontos para instalar.', 'Guias e skills para repetir bons resultados com a sua IA, sem começar do zero.'], animation: ['Movimento para sites.', 'Animações em HTML e CSS para copiar, ajustar e colocar nos seus projetos.'] };
    const heroBox = h('div'); let total = 0;
    const drawHero = () => mount(heroBox, hero({ kicker: `Neva Growth / ${KIND[kind][0]}`, title: TITLES[kind][0], art: 'acervo', subtitle: TITLES[kind][1],
      stats: h('div', { class: 'chips3' }, h('span', { class: 'chipk' }, icon('box'), `${total} recurso(s) publicado(s)`), h('span', { class: 'chipk' }, icon('check'), 'Texto completo'), h('span', { class: 'chipk' }, icon('refresh'), 'Sincronizado')),
      actions: [isAdmin && h('button', { class: 'btn', onclick: () => itemForm(null, load, kind) }, '+ Novo recurso')] }));
    const drawTabs = () => mount(tabs, h('div', { class: 'card acervobar' }, h('span', { class: 'ex' }, 'ACERVO NEVA'), h('div', { class: 'atabs' }, ['prompt', 'skill', 'animation'].map((k) => h('button', { class: kind === k ? 'on' : '', onclick: () => { kind = k; selected = null; st.category = ''; drawTabs(); load(); } }, h('b', KIND[k][0]), h('small', KIND[k][1])))),
      h('a', { class: 'btn', href: '#/prompts' }, '✦ Gerar com IA')));
    drawTabs();
    mount(box, tabs, heroBox, h('div', { class: 'card pad stack', style: 'margin:14px 0' }, toolbar), h('div', { class: 'lib' }, h('div', { class: 'card', style: 'overflow:hidden' }, h('div', { class: 'pad libhead' }, h('div', h('div', { class: 'k' }, 'Neva / Biblioteca'), h('b', { style: 'font-size:1.2rem' }, 'Explore os recursos')), h('span', { class: 'cnt2', id: 'cnt2' }, '00')), listBox), h('div', { class: 'card' }, detail)));
    drawHero();
    await load();
  }
};
