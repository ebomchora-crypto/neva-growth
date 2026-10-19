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
    const grid = h('div', { class: 'grid g3' }); const bar = h('div', { class: 'card sitebar' }); const statsBox = h('div', { class: 'hero-stats big' }); const bu = ctx.me?.usage?.builder;
    async function load() {
      const { items, stats } = await api.get('/projects', { q: st.q, status: st.status === 'todos' ? '' : st.status });
      mount(statsBox, statCard('No acervo', String(stats.acervo).padStart(2, '0')), statCard('Publicados', String(stats.publicados).padStart(2, '0')));
      mount(bar, h('span', { class: 'ex' }, 'EXIBIR'), h('div', { class: 'grow' }, pills({ items: [['todos', 'Todos'], ['publicado', 'Publicado'], ['desenvolvimento', 'Em desenvolvimento'], ['arquivado', 'Arquivado']], value: st.status, onChange: (v) => { st.status = v; load(); } })),
        h('input', { type: 'search', style: 'width:220px', placeholder: 'Buscar site, domínio ou cliente', 'aria-label': 'Buscar', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) }),
        h('a', { class: 'kbtn', href: '#/builder', title: st0.ai.configured ? 'Gerações com IA usadas neste mês' : 'Builder com IA (IA não configurada)' }, icon('layout'), 'Builder de Sites', bu && h('span', { class: 'n' }, `${bu.used}/${bu.limit}`)),
        h('span', { class: 'found' }, h('b', String(items.length).padStart(2, '0')), 'projetos encontrados'));
      mount(grid, !items.length ? h('div', { class: 'emptyart dashed', style: 'grid-column:1/-1' }, (st.q || st.status !== 'todos' ? h('span', { class: 'eico' }, icon('layout')) : mascotImg('vazio-sites', true)), h('b', st.q || st.status !== 'todos' ? 'Nenhum projeto neste recorte' : 'Seu próximo site merece uma vitrine'), canWrite && !st.q ? 'Adicione o link da entrega e a Neva monta o card de apresentação para você.' : '', canWrite && !st.q && st.status === 'todos' && h('button', { class: 'btn whitepill', style: 'margin-top:10px', onclick: wizard }, '+ Adicionar primeiro site')) :
        items.map((p) => h('article', { class: 'card siteCard' }, p.cover_url && h('img', { class: 'sitecover', src: p.cover_url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', onerror: (e) => e.target.remove() }),
          h('div', { class: 'row' }, h('span', { class: 'badge' }, { site: 'Site', app: 'Aplicação', system: 'Sistema' }[p.kind]), h('span', { class: 'badge ' + STATUS[p.status][1] }, STATUS[p.status][0])),
          h('h2', p.name), h('p', { class: 'mut sm', style: 'margin:0' }, p.description || 'Sem descrição.'),
          h('dl', { class: 'kv sm' }, (p.site_url || p.domain) && [h('dt', 'Link'), h('dd', p.site_url ? h('a', { href: p.site_url, target: '_blank', rel: 'noopener' }, p.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '')) : p.domain)], p.client_name && [h('dt', 'Cliente'), h('dd', p.client_name)], [h('dt', 'Responsável'), h('dd', p.owner_name || '—')]),
          h('div', { class: 'sm mut' }, `${p.files_count} arquivo(s) · atualizado em ${dt(p.updated_at)}`),
          !!p.published && p.files_count > 0 && h('a', { class: 'sm', href: `/s/${p.slug}/`, target: '_blank', rel: 'noopener' }, `${location.origin}/s/${p.slug}/`),
          h('div', { class: 'row' }, p.studio ? [h('a', { class: 'btn', href: '#/studio/' + p.id }, 'Abrir no Studio'), h('a', { class: 'btn ghost sm', href: '#/ide/' + p.id }, 'Código')] : h('a', { class: 'btn', href: '#/ide/' + p.id }, p.can_edit ? 'Abrir na IDE' : 'Ver na IDE'),
            canWrite && p.can_edit && h('button', { class: 'btn ghost sm', onclick: () => info(p) }, 'Dados'),
            canWrite && p.can_edit && !p.archived && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.post(`/projects/${p.id}/publish`, { published: !p.published }); toast(p.published ? 'Site despublicado.' : 'Site publicado.', 'ok'); load(); } catch (e) { fail(e); } } }, p.published ? 'Despublicar' : 'Publicar'),
            canWrite && p.can_edit && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.put('/projects/' + p.id, { archived: !p.archived }); toast(p.archived ? 'Projeto desarquivado.' : 'Projeto arquivado (saiu do ar).', 'ok'); load(); } catch (e) { fail(e); } } }, p.archived ? 'Desarquivar' : 'Arquivar'),
            canWrite && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.post(`/projects/${p.id}/duplicate`); toast('Projeto duplicado.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Duplicar'),
            canWrite && p.can_edit && h('button', { class: 'btn danger sm', onclick: async () => { if (!(await confirmBox(`Excluir o projeto "${p.name}" e todos os arquivos?`))) return; try { await api.del('/projects/' + p.id); toast('Projeto excluído.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Excluir')))));
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
          { k: 'cover_url', l: 'Imagem de capa (opcional)', ic: 'image', ph: 'Link público da captura' },
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
