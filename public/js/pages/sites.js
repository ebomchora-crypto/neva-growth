import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, dt } from '../ui.js';

const KINDS = [['site', 'Site institucional / landing page'], ['app', 'Aplicação (interface interativa)'], ['system', 'Sistema (CRUD com várias entidades)']];
const SECTIONS = [['beneficios', 'Benefícios'], ['servicos', 'Serviços'], ['depoimentos', 'Depoimentos'], ['faq', 'Perguntas frequentes'], ['contato', 'Contato']];

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const st = await api.get('/integrations/status');
    const grid = h('div', { class: 'grid g3' });
    async function load() {
      const { items } = await api.get('/projects');
      mount(grid, !items.length ? h('div', { class: 'card empty', style: 'grid-column:1/-1' }, h('b', 'Nenhum projeto ainda'), canWrite ? 'Crie um site, aplicação ou sistema a partir de um modelo ou com IA.' : '') :
        items.map((p) => h('article', { class: 'card siteCard' },
          h('div', { class: 'row' }, h('span', { class: 'badge' }, { site: 'Site', app: 'Aplicação', system: 'Sistema' }[p.kind]), p.published ? h('span', { class: 'badge ok' }, 'publicado') : h('span', { class: 'badge' }, 'rascunho')),
          h('h2', p.name), h('p', { class: 'mut sm', style: 'margin:0' }, p.description || 'Sem descrição.'),
          h('div', { class: 'sm mut' }, `${p.files_count} arquivo(s) · atualizado em ${dt(p.updated_at)}`),
          !!p.published && h('a', { class: 'sm', href: `/s/${p.slug}/`, target: '_blank', rel: 'noopener' }, `${location.origin}/s/${p.slug}/`),
          h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/ide/' + p.id }, 'Abrir na IDE'),
            canWrite && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.post(`/projects/${p.id}/publish`, { published: !p.published }); toast(p.published ? 'Site despublicado.' : 'Site publicado.', 'ok'); load(); } catch (e) { fail(e); } } }, p.published ? 'Despublicar' : 'Publicar'),
            canWrite && h('button', { class: 'btn ghost sm', onclick: async () => { try { await api.post(`/projects/${p.id}/duplicate`); toast('Projeto duplicado.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Duplicar'),
            canWrite && h('button', { class: 'btn danger sm', onclick: async () => { if (!(await confirmBox(`Excluir o projeto "${p.name}" e todos os arquivos?`))) return; try { await api.del('/projects/' + p.id); toast('Projeto excluído.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Excluir')))));
    }
    function wizard() {
      const defs = [
        { k: 'kind', l: 'Tipo', type: 'select', opts: KINDS, wide: true }, { k: 'name', l: 'Nome do projeto / marca', req: true }, { k: 'color', l: 'Cor principal', type: 'color', default: '#2f7bbd' },
        { k: 'tagline', l: 'Chamada principal (sites)', wide: true, ph: 'Ex.: Cuidamos do seu sorriso com tecnologia' }, { k: 'description', l: 'Descrição', type: 'textarea', rows: 3, wide: true },
        { k: 'whatsapp', l: 'WhatsApp (com DDD)' }, { k: 'email', l: 'E-mail de contato', type: 'email' }
      ];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d)));
      const secs = SECTIONS.map(([k, l]) => h('label', { class: 'row' }, h('input', { type: 'checkbox', name: 'sec_' + k, checked: k !== 'faq', value: k }), l));
      f.append(h('div', { style: 'grid-column:1/-1' }, h('span', { class: 'sm mut' }, 'Seções (sites)'), h('div', { class: 'row' }, secs)));
      const brief = h('textarea', { rows: 5, placeholder: 'Descreva o que você precisa. Ex.: Landing page para uma clínica odontológica em Curitiba, com seção de tratamentos, depoimentos e botão de agendamento.', 'aria-label': 'Pedido para a IA' });
      const aiPane = st.ai.configured ? h('div', { class: 'stack' }, h('p', { class: 'mut sm' }, 'A IA gera os arquivos do projeto a partir do seu pedido (usa o nome e o tipo acima).'), brief)
        : h('div', { class: 'notice' }, `Geração com IA indisponível: defina ${st.ai.envVar} no servidor. Use os modelos prontos ao lado.`);
      let tab = 'tpl'; const tabs = h('div', { class: 'tabs' }); const body = h('div');
      const draw = () => { mount(tabs, [['tpl', 'Modelo pronto'], ['ai', 'Gerar com IA'], ['blank', 'Em branco']].map(([k, l]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l)));
        mount(body, tab === 'ai' ? aiPane : tab === 'blank' ? h('p', { class: 'mut' }, 'Cria index.html, style.css e main.js vazios para você começar do zero.') : null); f.classList.toggle('hide', tab === 'blank' ? false : false); };
      draw();
      modal({ title: 'Novo projeto', size: 'lg', body: h('div', tabs, body, f), actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Criar projeto', keepOpen: true, onClick: async (close) => {
        if (!f.reportValidity()) return false;
        const d = readForm(f, defs); const sections = SECTIONS.map((s) => s[0]).filter((k) => f.elements['sec_' + k]?.checked);
        let p;
        if (tab === 'ai') {
          if (!st.ai.configured) { toast('IA não configurada.', 'err'); return false; }
          if (brief.value.trim().length < 10) { toast('Descreva o que deseja criar.', 'err'); return false; }
          toast('Gerando com IA… isso pode levar até 1–2 minutos.');
          p = await api.post('/projects/generate-ai', { name: d.name, kind: d.kind, brief: brief.value });
        } else p = await api.post('/projects', { ...d, sections, blank: tab === 'blank' });
        close(); location.hash = '#/ide/' + p.id;
      } }] });
    }
    mount(box, h('div', { class: 'pagehead' }, h('div', h('h1', 'Sites e sistemas'), h('p', 'Crie, edite na IDE, visualize e publique sites, aplicações e sistemas.')),
      canWrite && h('button', { class: 'btn', onclick: wizard }, '+ Novo projeto')), grid);
    await load();
  }
};
