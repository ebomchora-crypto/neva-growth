import { formSheet } from '../form-sheet.js';
import { api } from '../api.js';
import { h, mount, confirmBox, toast, fail, dt, pills, hero, statCard, debounce, icon, mascotImg } from '../ui.js';

export const KINDS = [['site', 'Site institucional / landing page'], ['app', 'Aplicação (interface interativa)'], ['system', 'Sistema (CRUD com várias entidades)']];
export const SECTIONS = [['beneficios', 'Benefícios'], ['servicos', 'Serviços'], ['depoimentos', 'Depoimentos'], ['faq', 'Perguntas frequentes'], ['contato', 'Contato']];
const STATUS = { publicado: ['publicado', 'ok'], desenvolvimento: ['em desenvolvimento', ''], arquivado: ['arquivado', 'warn'] };

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const [clients, st0] = await Promise.all([api.get('/clients', { limit: 500 }), api.get('/integrations/status')]);
    const st = { status: 'todos', q: '' };
    const grid = h('div', { class: 'sfeat-list' }); box.classList.add('pg-compact'); const bar = h('div', { class: 'card sitebar' }); const statsBox = h('div', { class: 'hero-stats big' }); const bu = ctx.me?.usage?.builder;
    // Projeto em destaque: janela de navegador com a prévia do site à esquerda e o painel do projeto à direita.
    const abs = (u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);
    const hostOf = (u) => { try { return new URL(abs(u)).host.replace(/^www\./, ''); } catch { return u; } };
    function preview(p) {
      const wrap = h('div', { class: 'sf-shot' });
      const none = () => mount(wrap, h('div', { class: 'sf-noshot' }, icon('layout'), h('small', 'Sem prévia disponível')));
      const img = (src, fallback) => { const im = h('img', { src, alt: `Prévia de ${p.name}`, loading: 'lazy', referrerpolicy: 'no-referrer', onerror: fallback }); mount(wrap, im); };
      const liveFrame = (src) => { const fr = h('iframe', { title: `Prévia de ${p.name}`, src, sandbox: 'allow-scripts', loading: 'lazy', tabindex: '-1' }); const fit = () => { const k = wrap.clientWidth / 1280; fr.style.transform = `scale(${k})`; wrap.style.setProperty('--fh', `${Math.round(800 * k)}px`); };
        mount(wrap, fr); requestAnimationFrame(fit); new ResizeObserver(fit).observe(wrap); };
      if (p.cover_url) img(p.cover_url, () => (p.site_url ? img(`https://image.thum.io/get/width/1200/crop/760/${abs(p.site_url)}`, none) : none()));
      else if (p.files_count > 0) { if (p.published) liveFrame(`/s/${p.slug}/`); else api.post(`/projects/${p.id}/preview-token`).then((t) => liveFrame(t.url)).catch(none); }
      else if (p.site_url) img(`https://image.thum.io/get/width/1200/crop/760/${abs(p.site_url)}`, none);
      else none();
      return wrap;
    }
    function feature(p, i) {
      const link = p.site_url ? abs(p.site_url) : (p.published && p.files_count > 0 ? `/s/${p.slug}/` : null);
      const host = p.site_url ? hostOf(p.site_url) : p.domain || `${p.slug}.neva`;
      const num = String(i + 1).padStart(2, '0');
      const desc = p.description || ({ publicado: 'Site publicado e pronto para ser apresentado aos próximos clientes.', desenvolvimento: 'Em desenvolvimento: finalize e publique para apresentar aos clientes.', arquivado: 'Projeto arquivado: fora do ar e do portfólio ativo.' }[p.status]);
      return h('article', { class: 'sfeat' },
        h('div', { class: 'sf-win' }, h('div', { class: 'sf-bar' }, h('i'), h('i'), h('i'), h('span', { class: 'sf-url' }, icon('globe'), host), h('em', `NG/${num}`)),
          h('div', { class: 'sf-view' }, preview(p), h('span', { class: 'sf-chip ' + p.status }, h('i'), STATUS[p.status][0].replace(/^./, (c) => c.toUpperCase())),
            link && h('a', { class: 'sf-ext', href: link, target: '_blank', rel: 'noopener', title: 'Abrir o site', 'aria-label': 'Abrir o site' }, icon('external')))),
        h('div', { class: 'sf-side' }, h('small', { class: 'k' }, 'PROJETO EM DESTAQUE'),
          h('div', { class: 'sf-title' }, h('i', { class: 'sf-num' }, num), h('h2', p.name)), h('p', desc),
          h('div', { class: 'sf-more' }, p.studio ? h('a', { href: '#/studio/' + p.id }, 'Studio') : null, p.files_count > 0 ? h('a', { href: '#/ide/' + p.id }, p.can_edit ? 'Código' : 'Ver código') : null,
            canWrite && p.files_count > 0 ? h('button', { type: 'button', onclick: async () => { try { await api.post(`/projects/${p.id}/duplicate`); toast('Projeto duplicado.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Duplicar') : null),
          h('div', { class: 'sf-foot' }, p.client_name ? h('span', { class: 'sf-client', title: 'Cliente' }, p.client_name) : h('span'),
            canWrite && p.can_edit && h('button', { type: 'button', class: 'sf-btn', onclick: () => siteForm(p) }, icon('pencil'), 'Editar'),
            canWrite && p.can_edit && h('button', { type: 'button', class: 'sf-btn', onclick: async () => { if (!(await confirmBox(`Excluir o projeto "${p.name}"${p.files_count ? ' e todos os arquivos' : ''}?`))) return; try { await api.del('/projects/' + p.id); toast('Projeto excluído.', 'ok'); load(); } catch (e) { fail(e); } } }, icon('trash'), 'Excluir'),
            link ? h('a', { class: 'sf-btn open', href: link, target: '_blank', rel: 'noopener' }, 'Abrir', icon('external')) : (p.files_count > 0 && h('a', { class: 'sf-btn open', href: (p.studio ? '#/studio/' : '#/ide/') + p.id }, 'Abrir', icon('external'))))));
    }
    async function load() {
      const { items, stats } = await api.get('/projects', { q: st.q, status: st.status === 'todos' ? '' : st.status });
      mount(statsBox, statCard('No acervo', String(stats.acervo).padStart(2, '0')), statCard('Publicados', String(stats.publicados).padStart(2, '0')));
      mount(bar, h('span', { class: 'ex' }, 'EXIBIR'), h('div', { class: 'grow' }, pills({ items: [['todos', 'Todos'], ['publicado', 'Publicado'], ['desenvolvimento', 'Em desenvolvimento'], ['arquivado', 'Arquivado']], value: st.status, onChange: (v) => { st.status = v; load(); } })),
        h('input', { type: 'search', style: 'width:220px', placeholder: 'Buscar site, domínio ou cliente', 'aria-label': 'Buscar', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) }),
        h('a', { class: 'kbtn', href: '#/builder', title: st0.ai.configured ? 'Builder com IA' : 'Builder com IA (IA não configurada)' }, icon('layout'), 'Builder de Sites'),
        h('span', { class: 'found' }, h('b', String(items.length).padStart(2, '0')), 'projetos encontrados'));
      mount(grid, !items.length ? h('div', { class: 'emptyart dashed', style: 'grid-column:1/-1' }, (st.q || st.status !== 'todos' ? h('span', { class: 'eico' }, icon('layout')) : mascotImg('vazio-sites', true)), h('b', st.q || st.status !== 'todos' ? 'Nenhum projeto neste recorte' : 'Seu próximo site merece uma vitrine'), canWrite && !st.q ? 'Adicione o link da entrega e a Neva monta o card de apresentação para você.' : '', canWrite && !st.q && st.status === 'todos' && h('button', { class: 'btn whitepill', style: 'margin-top:10px', onclick: wizard }, '+ Adicionar primeiro site')) :
        items.map((p, i) => feature(p, i)));
    }
    // Adicionar / editar site (entrada de portfólio): título, status, link, cliente, capa e descrição curta.
    function siteForm(p) {
      formSheet({ variant: 'dialog', kicker: 'Neva Growth / Portfólio', title: p ? 'Editar site' : 'Adicionar site', subtitle: 'Os links ficam salvos somente na sua conta.', ic: 'code',
        values: p ? { name: p.name, status: p.status, site_url: p.site_url, client_id: p.client_id ?? '', cover_url: p.cover_url, description: p.description } : { status: 'publicado', client_id: '' },
        submit: p ? 'Salvar alterações' : 'Adicionar site', cancel: 'Cancelar',
        sections: [{ cols: 2, fields: [
          { k: 'name', l: 'Título do projeto', ic: 'code', ph: 'Ex.: Landing page Nova Era', req: true, max: 80 },
          { k: 'status', l: 'Status', ic: 'rocket', type: 'select', opts: [['publicado', 'Publicado'], ['desenvolvimento', 'Em desenvolvimento'], ['arquivado', 'Arquivado']] },
          { k: 'site_url', l: 'Link do site', ic: 'globe', ph: 'https://seusite.com.br', span: 2 },
          { k: 'client_id', l: 'Cliente relacionado', ic: 'link', type: 'select', opts: [['', 'Projeto independente'], ...clients.items.map((c) => [c.id, c.name])] },
          { k: 'cover_url', l: 'Imagem de capa (opcional)', ic: 'image', type: 'image', ph: 'Link público da captura', span: 2 },
          { k: 'description', l: 'Descrição curta', ic: 'check', type: 'textarea', ph: 'O que foi criado e qual resultado esse site entrega?', span: 2 }] }],
        onSubmit: async (d, close) => {
          if (d.status === 'publicado' && !d.site_url && !(p && p.files_count)) throw new Error('Para marcar como publicado, informe o link do site.');
          const body = { name: d.name, status: d.status, site_url: d.site_url, cover_url: d.cover_url, description: d.description, client_id: d.client_id };
          if (p) await api.put('/projects/' + p.id, body); else await api.post('/projects', { ...body, link: true, kind: 'site' });
          toast(p ? 'Site atualizado.' : 'Site adicionado.', 'ok'); close(); load();
        } });
    }
    const info = siteForm; const wizard = () => siteForm(null);
    mount(box, hero({ kicker: 'Neva Growth / Portfólio web', title: 'Sites que falam por você.', subtitle: 'Uma galeria viva para abrir, apresentar e organizar cada entrega.', art: 'site',
      actions: [canWrite && h('button', { class: 'btn', onclick: wizard }, icon('plus'), 'Adicionar site')], stats: statsBox }),
      bar, grid);
    await load();
  }
};
