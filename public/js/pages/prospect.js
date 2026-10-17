import { api } from '../api.js';
import { h, mount, toast, fail } from '../ui.js';

export default {
  async render(box, ctx) {
    const st = await api.get('/integrations/status');
    const results = h('div');
    const canWrite = ctx.user.role !== 'viewer';
    let items = [];
    const draw = () => mount(results, !items.length ? null : h('div', { class: 'card tablewrap', style: 'margin-top:14px' },
      h('div', { class: 'toolbar' }, h('b', `${items.length} resultado(s)`), h('span', { class: 'grow' }),
        canWrite && h('button', { class: 'btn', onclick: importAll }, 'Importar selecionados como leads')),
      h('table', h('thead', h('tr', h('th'), ['Empresa', 'Endereço', 'Telefone', 'Site', 'Avaliação'].map((c) => h('th', c)))),
        h('tbody', items.map((i, n) => h('tr', h('td', h('input', { type: 'checkbox', checked: i.sel, disabled: i.exists, 'aria-label': 'Selecionar', onchange: (e) => { items[n].sel = e.target.checked; } })),
          h('td', h('b', i.name), i.exists && h('span', { class: 'badge', style: 'margin-left:6px' }, 'já é lead')), h('td', i.address || '—'), h('td', i.phone || '—'),
          h('td', i.website ? h('a', { href: i.website, target: '_blank', rel: 'noopener noreferrer' }, 'abrir') : '—'), h('td', i.rating ? `${i.rating} ★ (${i.reviews})` : '—')))))));
    async function importAll() {
      const rows = items.filter((i) => i.sel && !i.exists).map((i) => ({ name: i.name, phone: i.phone, website: i.website, source: 'Prospecção (Google Places)', notes: i.address }));
      if (!rows.length) return toast('Selecione ao menos um resultado.', 'err');
      try { const r = await api.post('/leads/import', { rows }); toast(`${r.created} lead(s) criado(s).`, 'ok'); items.forEach((i) => { if (i.sel) { i.exists = true; i.sel = false; } }); draw(); } catch (e) { fail(e); }
    }
    const form = h('form', { class: 'row', onsubmit: async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(form)); const b = form.querySelector('button'); b.disabled = true; b.textContent = 'Buscando…';
      try { const r = await api.post('/integrations/prospect/search', d); items = r.items.map((i) => ({ ...i, sel: !i.exists })); if (!items.length) toast('Nenhum resultado encontrado.'); draw(); } catch (x) { fail(x); } finally { b.disabled = false; b.textContent = 'Buscar'; }
    } }, h('input', { name: 'query', placeholder: 'Segmento (ex.: clínica odontológica)', required: true, style: 'flex:2;min-width:220px' }),
      h('input', { name: 'location', placeholder: 'Cidade / região (ex.: Curitiba, PR)', style: 'flex:1;min-width:180px' }), h('button', { class: 'btn' }, 'Buscar'));
    mount(box, h('div', { class: 'pagehead' }, h('div', h('h1', 'Prospecção'), h('p', 'Encontre empresas por segmento e região e envie-as direto para o funil.'))),
      st.places.configured ? h('div', { class: 'card pad' }, form) :
        h('div', { class: 'notice' }, h('b', 'Integração não configurada. '), `Defina a variável de ambiente ${st.places.envVar} (chave da Google Places API) no servidor e reinicie para habilitar a busca de empresas. Enquanto isso, cadastre leads manualmente ou importe um CSV em `, h('a', { href: '#/leads' }, 'Leads e funil'), '.'),
      results);
  }
};
