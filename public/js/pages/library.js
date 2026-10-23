import { api } from '../api.js';
import { animTile, isPromptAnim, animOrder } from '../anim-tiles.js';
import { h, mount, mascotImg, modal, confirmBox, fieldEl, readForm, toast, fail, debounce, copyText, downloadFile, pills, hero, statCard, icon } from '../ui.js';

const KIND = { prompt: ['Prompt Lab', 'Prompts prontos para usar'], skill: ['Skill Vault', 'Métodos e instalação'], animation: ['Animações', 'Movimento para sites'], design: ['Design', 'Referências'] };
const EXT = { prompt: 'txt', skill: 'md', animation: 'html', design: 'md' };
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const siteUrl = (url) => /^https?:\/\//i.test(url) ? url : 'https://' + url;

function referenceHero(it, large = false) {
  const visual = it.hero || {};
  const colors = visual.palette?.length ? visual.palette : ['#eaf3fc', '#7fb4e0', '#2f7bbd'];
  const title = it.title.replace(/ \(arquivo \d+\)$/, '');
  const preview = h('div', { class: 'reference-hero' + (large ? ' large' : '') + (title === '10X HUB' ? ' tenx' : ''), style: `--ref-bg:${visual.background || '#eaf3fc'};--ref-fg:${visual.foreground || '#0e2236'};--ref-accent:${visual.accent || '#2f7bbd'}` },
    h('div', { class: 'rh-nav', 'aria-hidden': 'true' }, h('span', { class: 'rh-mark' }, title.slice(0, 1).toUpperCase()), h('span', { class: 'rh-lines' }, h('i'), h('i'), h('i'))),
    h('div', { class: 'rh-copy' }, h('small', 'PRÉVIA DO DESIGN.MD'), h('strong', title), h('p', visual.description || it.summary || 'Referência visual para projetos digitais.')),
    h('div', { class: 'rh-art', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('div', { class: 'rh-palette', 'aria-label': 'Cores documentadas' }, colors.slice(0, 5).map((color) => h('i', { style: `background:${color}`, title: color }))));
  if (visual.screenshot || (it.url && title !== '10X HUB')) {
    const abs = siteUrl(it.url);
    const sources = [visual.screenshot, `https://s.wordpress.com/mshots/v1/${encodeURIComponent(abs)}?w=${large ? 1400 : 900}`, `https://image.thum.io/get/width/${large ? 1400 : 900}/crop/${large ? 820 : 560}/${abs}`].filter(Boolean);
    let source = 0;
    const img = h('img', { class: 'rh-screenshot', src: sources[source], alt: `Captura do site ${title}`, loading: large ? 'eager' : 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => { if (++source < sources.length) img.src = sources[source]; else img.remove(); });
    preview.append(img);
  }
  return preview;
}

function designDetail(full, back, isAdmin, reload) {
  const url = full.url && siteUrl(full.url);
  const colors = full.hero?.palette || [];
  return h('section', { class: 'reference-page' },
    h('nav', { class: 'reference-page-nav', 'aria-label': 'Navegação da referência' },
      h('button', { type: 'button', class: 'ref-back', onclick: back }, icon('arrow'), 'Voltar ao catálogo'),
      h('span', { class: 'ref-breadcrumb' }, 'Neva Design', h('i', '/'), full.title),
      url && h('a', { class: 'ref-site-top', href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Site original', icon('external'))),
    h('div', { class: 'reference-columns' },
      h('div', { class: 'reference-left' },
        h('div', { class: 'reference-live' }, referenceHero(full, true)),
        h('article', { class: 'reference-info' },
          h('div', { class: 'ref-kicker' }, 'NEVA DESIGN · REFERÊNCIA ', full.style || 'VISUAL'),
          h('div', { class: 'ref-info-heading' }, h('div', h('h1', full.title), h('p', full.summary || 'Direção visual extraída do DESIGN.md.')), h('span', { class: 'ref-monogram' }, full.title.slice(0, 2).toUpperCase())),
          h('div', { class: 'ref-info-tags' }, [full.niche, full.style, full.site_type].filter(Boolean).map((tag) => h('span', tag))),
          h('p', { class: 'ref-source-note' }, url ? 'Captura do site quando disponível; o conceito do DESIGN.md aparece se o serviço de captura falhar.' : 'O arquivo não informa um endereço verificável para capturar o site. A prévia acima foi criada a partir do DESIGN.md.'),
          h('div', { class: 'ref-facts' }, h('span', url ? new URL(url).hostname.replace(/^www\./, '') : 'Endereço não identificado'), h('span', `${colors.length} cores documentadas`), h('span', 'DESIGN.md original')),
          url && h('a', { class: 'ref-visit', href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Visitar site', icon('external')))),
      h('div', { class: 'reference-document' },
        h('div', { class: 'ref-doc-head' }, h('strong', 'DESIGN.md'), h('span', 'DESIGN ORIGINAL'),
          h('div', { class: 'ref-doc-actions' },
            isAdmin && full.source !== 'archive' && h('button', { type: 'button', onclick: () => itemForm(full, reload) }, 'Editar'),
            h('button', { type: 'button', onclick: () => copyText(full.content, 'Conteúdo copiado.') }, icon('copy'), 'Copiar'),
            h('button', { type: 'button', onclick: () => downloadFile(`${slug(full.title)}.md`, full.content) }, icon('download'), '.md'))),
        h('pre', { class: 'ref-doc-content' }, full.content))));
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
    const st = { q: '', niche: '', style: '', site_type: '', sort: 'title', visible: 60 }; const PLURAL = { niche: 'nichos', style: 'estilos', site_type: 'tipos' };
    const imported = (await api.get('/design-references')).items;
    const grid = h('div', { class: 'dgrid' }); const count = h('b'); const filtersBox = h('div', { class: 'dfilters' }); const shortcuts = h('div', { class: 'shortcuts' });
    let catalogView; let catalogScroll = 0;
    async function showReference(it) {
      if (it.locked) return toast('Recurso de um plano superior.', 'err');
      const full = await api.get(it.source === 'archive' ? '/design-references/' + it.id : '/library/' + it.id);
      catalogScroll = window.scrollY;
      const back = () => { mount(box, catalogView); requestAnimationFrame(() => window.scrollTo(0, catalogScroll)); };
      mount(box, designDetail(full, back, isAdmin, load));
      window.scrollTo(0, 0);
    }
    let meta = { niches: [], styles: [], siteTypes: [] };
    const sel = (key, label, ic, opts) => h('label', { class: 'dfield' }, icon(ic), h('span', label), h('select', { 'aria-label': label, onchange: (e) => { st[key] = e.target.value; st.visible = 60; load(); } }, h('option', { value: '' }, `Todos os ${PLURAL[key]}`), opts.map((o) => h('option', { value: o, selected: st[key] === o }, o))));
    // Cartões grandes com prévia do site, faixa de repertório depois de 12 referências e rodapé "O repertório continua".
    const hostOf = (u) => { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).host.replace(/^www\./, ''); } catch { return null; } };
    const shot = (it) => { const wrap = h('div', { class: 'dc-shot' }, referenceHero(it));
      wrap.append(h('span', { class: 'dc-chip' }, 'REFERÊNCIA')); return wrap; };
    const dcard = (it) => h('article', { class: 'dcard2' + (it.locked ? ' lock' : ''), tabindex: 0, onclick: () => showReference(it).catch(fail), onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } },
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
    function designCards(items) { const out = []; items.slice(0, st.visible).forEach((it, i) => { if (i === 12) out.push(promo()); out.push(dcard(it)); });
      if (items.length > st.visible) out.push(moreButton(items));
      out.push(endcap(items.length)); return out; }
    function moreButton(items) { return h('button', { class: 'dmore', type: 'button', onclick: (event) => {
      const start = st.visible; st.visible = Math.min(items.length, st.visible + 60);
      event.currentTarget.remove(); grid.querySelector('.dend')?.remove();
      grid.append(...items.slice(start, st.visible).map(dcard));
      if (items.length > st.visible) grid.append(moreButton(items));
      grid.append(endcap(items.length));
    } }, `Mostrar mais referências (${st.visible} de ${items.length})`); }
    function drawShortcuts() {
      const quick = meta.niches.slice(0, 6);
      mount(shortcuts, h('span', { class: 'k' }, 'Atalhos'), pills({ items: [['', 'Tudo'], ...quick.map((n) => [n, n])], value: st.niche, onChange: (v) => { st.niche = v; st.visible = 60; load(); } }),
        h('button', { class: 'btn ghost sm', style: 'margin-left:auto', onclick: () => { Object.assign(st, { q: '', niche: '', style: '', site_type: '', visible: 60 }); design.render(box, ctx); } }, '✕ Limpar filtros'));
    }
    async function load() {
      meta = await api.get('/library/meta', { kind: 'design' });
      meta.niches = [...new Set([...meta.niches, ...imported.map((i) => i.niche).filter(Boolean)])].sort();
      meta.styles = [...new Set([...meta.styles, ...imported.map((i) => i.style).filter(Boolean)])].sort();
      meta.siteTypes = [...new Set([...meta.siteTypes, ...imported.map((i) => i.site_type).filter(Boolean)])].sort();
      mount(filtersBox, sel('niche', 'Nicho', 'building', meta.niches), sel('style', 'Estilo visual', 'palette', meta.styles), sel('site_type', 'Tipo de site', 'layout', meta.siteTypes));
      drawShortcuts();
      const { items: saved } = await api.get('/library', { kind: 'design', q: st.q, niche: st.niche, style: st.style, site_type: st.site_type, sort: st.sort, all: isAdmin ? 1 : '' });
      const q = st.q.toLocaleLowerCase('pt-BR');
      const archiveItems = imported.filter((it) => (!st.niche || it.niche === st.niche) && (!st.style || it.style === st.style) && (!st.site_type || it.site_type === st.site_type)
        && (!q || [it.title, it.summary, it.file].some((v) => v?.toLocaleLowerCase('pt-BR').includes(q))));
      const items = [...saved, ...archiveItems].sort((a, b) => st.sort === 'recent' ? (b.created_at || '').localeCompare(a.created_at || '') || a.title.localeCompare(b.title, 'pt-BR') : a.title.localeCompare(b.title, 'pt-BR') || (a.source === 'archive' ? -1 : 1));
      count.textContent = `${items.length} referência${items.length === 1 ? '' : 's'}`;
      mount(grid, items.length ? designCards(items) : h('div', { class: 'emptyart dashed', style: 'grid-column:1/-1' }, h('span', { class: 'eico' }, icon('palette')), h('b', 'Nenhuma referência encontrada'), isAdmin ? 'Cadastre referências com DESIGN.md em "+ Nova referência".' : 'Peça a um administrador para cadastrar referências.'));
    }
    const sortSel = h('select', { 'aria-label': 'Ordenar', style: 'width:auto', onchange: (e) => { st.sort = e.target.value; st.visible = 60; load(); } }, [['title', 'Nome: A → Z'], ['recent', 'Mais recentes']].map(([v, l]) => h('option', { value: v }, l)));
    catalogView = h('div', hero({ kicker: 'Design Neva / Referências', title: 'Identidades reais. DESIGN.md prontos.', art: 'design', subtitle: 'Explore sites do mundo todo, encontre sua próxima referência e leve o DESIGN.md completo para o seu projeto.',
      actions: [isAdmin && h('button', { class: 'btn', onclick: () => itemForm(null, load, 'design') }, '+ Nova referência')] }),
      h('div', { class: 'dhead' }, h('span', { class: 'k' }, h('i', '/'), ' Explore por design'), h('div', { class: 'row' }, count, sortSel)),
      h('div', { class: 'card pad stack' }, h('div', { class: 'ksearch', style: 'max-width:420px' }, icon('search'), h('input', { type: 'search', placeholder: 'Buscar referência, estilo ou categoria', 'aria-label': 'Buscar', oninput: debounce((e) => { st.q = e.target.value; st.visible = 60; load(); }) })), filtersBox, shortcuts),
      h('div', { style: 'height:14px' }), grid);
    mount(box, catalogView);
    await load();
  }
};

// ---- Skill Vault: detalhe no estilo "arquivo da skill + método + instalação"
const SKILL_ORDER = ['code performance', 'code accessibility', 'code testing', 'code responsive', 'code architecture', 'code database', 'code auth', 'code integrations', 'code ads', 'code copywriting', 'code funnel builder', 'code security', 'code pentest'];
const skillRank = (it) => { const t = String(it.title || '').toLowerCase(); const i = SKILL_ORDER.findIndex((k) => t.startsWith(k)); return i < 0 ? 99 : i; };
const skillSlug = (content, title) => (/^name:\s*([\w-]+)/m.exec(content || '') || [])[1] || slug(title);
/** Texto de uma seção "## Título" até o próximo "## " (sem cercas de código). */
const mdSection = (content, name) => { const m = new RegExp(`^##\\s+${name}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im').exec(content || ''); return m ? m[1].trim() : ''; };
const mdParas = (text) => String(text || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).slice(0, 4).map((x) => h('p', x.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')));
const tagChips = (it) => String(it.niche || '').split(',').filter(Boolean).map((t) => h('span', { class: 'skt' }, t));

function skillDetail(full, isAdmin, reload) {
  const file = skillSlug(full.content, full.title);
  const ver = (/version:\s*"?([\d.]+)"?/.exec(full.content || '') || [])[1] || String(full.style || 'v1.0.0').replace(/^v/, '');
  const what = mdSection(full.content, 'O que ela faz') || full.summary || ''; const when = mdSection(full.content, 'Quando usar');
  return h('div', { class: 'dpane skillpane' },
    h('div', { class: 'dbanner' }, h('div', { class: 'dk' }, h('span', icon('box')), `SKILL / ${String(full.category || 'Geral').toUpperCase()}`), h('h2', full.title), full.summary && h('p', full.summary)),
    h('div', { class: 'dbody stack' },
      h('div', { class: 'dnotice' }, h('b', 'USO RESTRITO'), h('span', 'É proibido divulgar, compartilhar ou redistribuir este conteúdo. O descumprimento está sujeito à perda de acesso e ao banimento da plataforma.')),
      h('section', { class: 'skfile' },
        h('div', { class: 'skart', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i')),
        h('div', { class: 'skinfo' }, h('small', { class: 'skk' }, 'ARQUIVO DA SKILL', h('span', `v${ver}`)), h('b', `${file}.md`), h('code', file), h('p', 'O método completo em um único arquivo.')),
        h('div', { class: 'skact' }, h('button', { class: 'btn', type: 'button', onclick: () => downloadFile(`${file}.md`, full.content) }, 'Baixar skill', icon('download')), h('button', { class: 'btn ghost', type: 'button', onclick: () => copyText(full.content, 'Skill copiada.') }, 'Copiar'), isAdmin && h('button', { class: 'btn ghost', type: 'button', onclick: () => itemForm(full, reload) }, 'Editar'))),
      h('div', { class: 'skcols' },
        h('section', h('small', { class: 'skk2' }, '01 / MÉTODO'), h('h3', 'O que ela faz'), ...mdParas(what), when && h('div', { class: 'skwhen' }, h('b', 'Quando usar'), ...mdParas(when).slice(0, 2))),
        h('section', h('small', { class: 'skk2' }, '02 / INSTALAÇÃO'), h('h3', 'Como instalar'),
          h('ol', { class: 'skol' }, h('li', h('span', 'Baixe o arquivo ', h('b', `${file}.md`), '.')), h('li', h('span', 'Salve-o na pasta de skills do seu agente com o nome SKILL.md.')), h('li', h('span', 'Peça ao agente para usar a skill ao iniciar a tarefa.'))),
          h('div', { class: 'skex' }, h('small', 'Exemplo no Codex'), h('code', `.agents/skills/${file}/SKILL.md`))))));
}

// ---- Acervo: Prompt Lab · Skill Vault · Animações
export const acervo = {
  async render(box, ctx) {
    const isAdmin = ctx.user.role === 'admin'; let kind = 'prompt'; let selected = null; const st = { q: '', category: '' };
    let lib; const listBox = h('div'); const detail = h('div'); const galleryBox = h('div', { class: 'galleryBox' }); const tabs = h('div'); const toolbar = h('div');
    async function load() {
      const meta = await api.get('/library/meta', { kind });
      const { items } = await api.get('/library', { kind, q: st.q, category: st.category, all: isAdmin ? 1 : '' });
      total = items.filter((x) => x.published).length; try { drawHero(); } catch { /* ainda não montado */ } const c2 = document.getElementById('cnt2'); if (c2) c2.textContent = String(items.length).padStart(2, '0');
      mount(toolbar, h('div', { class: 'row' }, h('input', { type: 'search', style: 'max-width:340px', placeholder: 'Buscar por objetivo, área ou palavra-chave', 'aria-label': 'Buscar', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) }),
        pills({ items: [['', 'Todos'], ...meta.categories.map((c) => [c, c])], value: st.category, onChange: (v) => { st.category = v; load(); } }), h('span', { class: 'sm mut' }, `${items.length} encontrado(s)`)));
      lib.classList.toggle('gallery', kind === 'animation');
      if (kind === 'animation') { // galeria: o efeito rodando em miniatura + "Copiar prompt"
        const full = async (it) => { try { return (await api.get('/library/' + it.id)).content; } catch (e) { fail(e); return null; } };
        mount(galleryBox, items.length ? h('div', { class: 'an-grid' }, [...items].sort((a, b) => animOrder(a) - animOrder(b)).map((it) => h('article', { class: 'an-card' }, animTile(it),
          h('button', { class: 'an-copy', type: 'button', disabled: !!it.locked, onclick: async () => { const c = await full(it); if (c) copyText(c, 'Prompt copiado.'); } }, icon('copy'), it.locked ? 'Plano superior' : isPromptAnim(it) ? 'Copiar prompt' : 'Copiar código')))) : h('div', { class: 'empty' }, h('b', 'Nenhum recurso'), isAdmin ? 'Use "+ Novo recurso" para cadastrar.' : 'Nada publicado ainda.'));
        mount(listBox); mount(detail); return;
      }
      mount(galleryBox);
      if (kind === 'skill') items.sort((a, b) => skillRank(a) - skillRank(b));
      mount(listBox, items.length ? items.map((it, i) => h('button', { class: 'libitem' + (selected === it.id ? ' on' : '') + (it.locked ? ' lock' : ''), onclick: () => show(it) }, h('span', { class: 'lnum' }, String(i + 1).padStart(2, '0')), h('span', { class: 'lbody' }, h('span', { class: 'lcat' }, `${it.category || KIND[kind][0]}${kind === 'skill' && it.style ? ' | ' + it.style : ''}${it.locked ? ' · 🔒' : ''}${it.published ? '' : ' · rascunho'}`), h('b', { class: 't' }, it.title), it.summary && h('span', { class: 'lsum' }, it.summary), kind === 'skill' && it.niche && h('span', { class: 'sktags' }, ...tagChips(it))), h('span', { class: 'larr' }, icon('chevron'))))
        : h('div', { class: 'empty' }, h('b', 'Nenhum recurso'), isAdmin ? 'Use "+ Novo recurso" para cadastrar.' : 'Nada publicado ainda.'));
      if (!selected && items[0] && !items[0].locked) show(items[0]); else if (!items.length) mount(detail, h('div', { class: 'empty' }, 'Selecione um recurso.'));
    }
    async function show(it) {
      selected = it.id; listBox.querySelectorAll('.libitem').forEach((b) => b.classList.remove('on'));
      if (it.locked) return mount(detail, h('div', { class: 'empty' }, h('b', '🔒 Recurso de plano superior'), 'Peça a um administrador para alterar seu plano em Associação.'));
      try { const full = await api.get('/library/' + it.id);
        if (full.kind === 'skill') return mount(detail, skillDetail(full, isAdmin, load));
        mount(detail, h('div', { class: 'dpane' },
          h('div', { class: 'dbanner' }, h('div', { class: 'dk' }, h('span', icon('box')), `${KIND[full.kind][0].toUpperCase()} / ${full.category || 'Geral'}`), h('h2', full.title), full.summary && h('p', full.summary)),
          h('div', { class: 'dbody stack' },
            h('div', { class: 'dnotice' }, h('b', 'USO RESTRITO'), h('span', 'É proibido divulgar, compartilhar ou redistribuir este conteúdo. O descumprimento está sujeito à perda de acesso e ao banimento da plataforma.')),
            h('section', { class: 'dcard' }, h('div', { class: 'k' }, `Neva / ${KIND[full.kind][0]}`), h('h3', full.kind === 'prompt' ? 'Prompt final' : 'Conteúdo'), h('p', { class: 'sm mut', style: 'margin:2px 0 10px' }, 'Texto completo para copiar e adaptar no seu chat.'),
              h('pre', { class: 'code', style: 'white-space:pre-wrap;max-height:55vh' }, full.content),
              h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(full.content, 'Copiado.') }, 'Copiar'), h('button', { class: 'btn ghost', onclick: () => downloadFile(`${slug(full.title)}.${EXT[full.kind]}`, full.content) }, 'Baixar'), isAdmin && h('button', { class: 'btn ghost', onclick: () => itemForm(full, load) }, 'Editar'))))));
      } catch (e) { mount(detail, h('div', { class: 'empty' }, e.message)); }
    }
    const TITLES = { prompt: ['Prompts para sair do rascunho.', 'Escolha um prompt completo, copie ou baixe e ajuste os detalhes no seu próprio chat.'], skill: ['Skills para operar em outro nível.', 'Escolha uma skill, entenda o método e baixe o arquivo pronto para instalar.'], animation: ['Movimento para dar vida ao seu site.', 'Explore as animações, copie o prompt completo e ajuste os detalhes no editor do seu projeto.'] };
    const heroBox = h('div'); let total = 0;
    const drawHero = () => mount(heroBox, hero({ kicker: `Neva Growth / ${KIND[kind][0]}`, title: TITLES[kind][0], art: 'acervo', subtitle: TITLES[kind][1],
      stats: h('div', { class: 'chips3' }, h('span', { class: 'chipk' }, icon('box'), `${total} recurso(s) publicado(s)`), h('span', { class: 'chipk' }, icon('check'), kind === 'skill' ? 'Conteúdo versionado' : 'Texto completo'), h('span', { class: 'chipk' }, icon('refresh'), 'Sincronizado')),
      actions: [isAdmin && h('button', { class: 'btn', onclick: () => itemForm(null, load, kind) }, '+ Novo recurso')] }));
    const drawTabs = () => mount(tabs, h('div', { class: 'card acervobar' }, h('span', { class: 'ex' }, 'ACERVO NEVA'), h('div', { class: 'atabs' }, ['prompt', 'skill', 'animation'].map((k) => h('button', { class: kind === k ? 'on' : '', onclick: () => { kind = k; selected = null; st.category = ''; drawTabs(); load(); } }, h('b', KIND[k][0]), h('small', KIND[k][1])))),
      h('a', { class: 'btn', href: '#/prompts' }, '✦ Gerar com IA')));
    drawTabs();
    mount(box, tabs, heroBox, h('div', { class: 'card pad stack', style: 'margin:14px 0' }, toolbar), (lib = h('div', { class: 'lib' }, h('div', { class: 'card', style: 'overflow:hidden' }, h('div', { class: 'pad libhead' }, h('div', h('div', { class: 'k' }, 'Neva / Biblioteca'), h('b', { style: 'font-size:1.2rem' }, 'Explore os recursos')), h('span', { class: 'cnt2', id: 'cnt2' }, '00')), listBox), h('div', { class: 'card' }, detail))), galleryBox);
    drawHero();
    await load();
  }
};
