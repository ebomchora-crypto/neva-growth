import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, dt, pills, hero, statCard, debounce, icon } from '../ui.js';

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
      mount(grid, !items.length ? h('div', { class: 'emptyart dashed', style: 'grid-column:1/-1' }, h('span', { class: 'eico' }, icon('layout')), h('b', st.q || st.status !== 'todos' ? 'Nenhum projeto neste recorte' : 'Seu próximo site merece uma vitrine'), canWrite && !st.q ? 'Crie um site, aplicação ou sistema a partir de um modelo ou com IA.' : '') :
        items.map((p) => h('article', { class: 'card siteCard' },
          h('div', { class: 'row' }, h('span', { class: 'badge' }, { site: 'Site', app: 'Aplicação', system: 'Sistema' }[p.kind]), h('span', { class: 'badge ' + STATUS[p.status][1] }, STATUS[p.status][0])),
          h('h2', p.name), h('p', { class: 'mut sm', style: 'margin:0' }, p.description || 'Sem descrição.'),
          h('dl', { class: 'kv sm' }, p.domain && [h('dt', 'Domínio'), h('dd', p.domain)], p.client_name && [h('dt', 'Cliente'), h('dd', p.client_name)], [h('dt', 'Responsável'), h('dd', p.owner_name || '—')]),
          h('div', { class: 'sm mut' }, `${p.files_count} arquivo(s) · atualizado em ${dt(p.updated_at)}`),
          !!p.published && h('a', { class: 'sm', href: `/s/${p.slug}/`, target: '_blank', rel: 'noopener' }, `${location.origin}/s/${p.slug}/`),
          h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/ide/' + p.id }, p.can_edit ? 'Abrir na IDE' : 'Ver na IDE'),
            canWrite && p.can_edit && h('button', { class: 'btn ghost sm', onclick: () => info(p) }, 'Dados'),
            canWrite && p.can_edit && !p.archived && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.post(`/projects/${p.id}/publish`, { published: !p.published }); toast(p.published ? 'Site despublicado.' : 'Site publicado.', 'ok'); load(); } catch (e) { fail(e); } } }, p.published ? 'Despublicar' : 'Publicar'),
            canWrite && p.can_edit && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.put('/projects/' + p.id, { archived: !p.archived }); toast(p.archived ? 'Projeto desarquivado.' : 'Projeto arquivado (saiu do ar).', 'ok'); load(); } catch (e) { fail(e); } } }, p.archived ? 'Desarquivar' : 'Arquivar'),
            canWrite && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.post(`/projects/${p.id}/duplicate`); toast('Projeto duplicado.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Duplicar'),
            canWrite && p.can_edit && h('button', { class: 'btn danger sm', onclick: async () => { if (!(await confirmBox(`Excluir o projeto "${p.name}" e todos os arquivos?`))) return; try { await api.del('/projects/' + p.id); toast('Projeto excluído.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Excluir')))));
    }
    const metaFields = () => [{ k: 'name', l: 'Nome', req: true }, { k: 'domain', l: 'Domínio', ph: 'meusite.com.br' }, { k: 'client_id', l: 'Cliente', type: 'select', empty: '—', opts: clients.items.map((c) => [c.id, c.name]) }, { k: 'description', l: 'Descrição', type: 'textarea', rows: 3, wide: true }];
    function info(p) {
      const defs = metaFields(); const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, p[d.k])));
      modal({ title: 'Dados do projeto', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
        if (!f.reportValidity()) return false; await api.put('/projects/' + p.id, readForm(f, defs)); toast('Projeto atualizado.', 'ok'); close(); load(); } }] });
    }
    function wizard() {
      const defs = [{ k: 'kind', l: 'Tipo', type: 'select', opts: KINDS, wide: true }, ...metaFields().slice(0, 3), { k: 'color', l: 'Cor principal', type: 'color', default: '#2f7bbd' },
        { k: 'tagline', l: 'Chamada principal (sites)', wide: true, ph: 'Ex.: Cuidamos do seu sorriso com tecnologia' }, { k: 'description', l: 'Descrição', type: 'textarea', rows: 3, wide: true },
        { k: 'whatsapp', l: 'WhatsApp (com DDD)' }, { k: 'email', l: 'E-mail de contato', type: 'email' }];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d)));
      f.append(h('div', { style: 'grid-column:1/-1' }, h('span', { class: 'sm mut' }, 'Seções (sites)'), h('div', { class: 'row' }, SECTIONS.map(([k, l]) => h('label', { class: 'row' }, h('input', { type: 'checkbox', name: 'sec_' + k, checked: k !== 'faq' }), l)))));
      let tab = 'tpl'; const tabs = h('div', { class: 'tabs' });
      const draw = () => mount(tabs, [['tpl', 'Modelo pronto'], ['blank', 'Em branco']].map(([k, l]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l)));
      draw();
      modal({ title: 'Novo projeto a partir de modelo', size: 'lg', body: h('div', tabs, h('p', { class: 'sm mut' }, 'Para gerar com IA a partir de um pedido em texto, use o ', h('a', { href: '#/builder', onclick: () => document.querySelector('.modal-back')?.remove() }, 'Builder com IA'), '.'), f),
        actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Criar projeto', keepOpen: true, onClick: async (close) => {
          if (!f.reportValidity()) return false; const d = readForm(f, defs); const sections = SECTIONS.map((s) => s[0]).filter((k) => f.elements['sec_' + k]?.checked);
          const p = await api.post('/projects', { ...d, sections, blank: tab === 'blank' }); close(); location.hash = '#/ide/' + p.id; } }] });
    }
    mount(box, hero({ kicker: 'Neva Growth / Portfólio web', title: 'Sites que falam por você.', subtitle: 'Uma galeria viva para abrir, apresentar e organizar cada entrega.', art: 'site',
      actions: [canWrite && h('button', { class: 'btn', onclick: wizard }, icon('plus'), 'Adicionar site')], stats: statsBox }),
      bar, grid);
    await load();
  }
};
