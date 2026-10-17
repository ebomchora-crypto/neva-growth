// Página CRUD genérica: busca, filtros, paginação, criar/editar/excluir, exportação CSV.
import { api } from './api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, debounce, downloadFile, toCSV } from './ui.js';

export function crudPage(cfg) {
  return {
    async render(box, ctx) {
      const canWrite = ctx.user.role !== 'viewer';
      const st = { q: '', page: 1, filter: {}, limit: 20 };
      const body = h('div'); const pager = h('div', { class: 'pager' });
      const search = h('input', { class: 'search', type: 'search', placeholder: cfg.searchPlaceholder || 'Buscar…', 'aria-label': 'Buscar',
        oninput: debounce((e) => { st.q = e.target.value; st.page = 1; load(); }) });
      const filters = (cfg.filters || []).map((f) => h('select', { 'aria-label': f.l, onchange: (e) => { st.filter[f.k] = e.target.value; st.page = 1; load(); } },
        h('option', { value: '' }, f.l + ': todos'), f.opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v }, l); })));
      const lookups = {};
      async function loadLookups() {
        for (const f of cfg.fields) if (f.lookup && !lookups[f.k]) {
          const r = await api.get(f.lookup.url, { limit: 500 });
          const items = r.items || r;
          lookups[f.k] = items.map((i) => [i.id, f.lookup.label(i)]);
        }
      }
      function fieldDefs(rec) {
        return cfg.fields.filter((f) => !(f.createOnly && rec) && !f.hideInForm).map((f) => ({ ...f, req: f.reqCreate ? !rec : f.req })).map((f) => f.lookup ? { ...f, type: 'select', empty: f.req ? null : '—', opts: lookups[f.k] || [] } : f);
      }
      async function openForm(rec) {
        await loadLookups().catch(fail);
        const defs = fieldDefs(rec);
        const form = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((f) => fieldEl(f, rec?.[f.k])));
        modal({ title: rec ? `Editar ${cfg.singular}` : `Novo ${cfg.singular}`, body: form, size: cfg.fields.length > 6 ? 'lg' : '',
          actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
            if (!form.reportValidity()) return false;
            const data = readForm(form, defs);
            for (const f of defs) if (data[f.k] === '' && !f.req) data[f.k] = null;
            if (rec) await api.put(`${cfg.api}/${rec.id}`, data); else await api.post(cfg.api, data);
            toast(rec ? 'Alterações salvas.' : `${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} criado.`, 'ok'); close(); load();
          } }] });
      }
      async function load() {
        try {
          const r = await api.get(cfg.api, { q: st.q, page: st.page, limit: st.limit, ...st.filter });
          renderTable(r);
        } catch (e) { mount(body, h('div', { class: 'empty' }, e.message)); }
      }
      function renderTable(r) {
        if (!r.items.length) {
          mount(body, h('div', { class: 'empty' }, h('b', st.q || Object.values(st.filter).some(Boolean) ? 'Nenhum resultado' : cfg.emptyTitle || 'Nada por aqui ainda'),
            st.q ? 'Tente outra busca.' : (canWrite ? `Crie o primeiro ${cfg.singular} para começar.` : ''))); mount(pager); return;
        }
        mount(body, h('div', { class: 'tablewrap' }, h('table',
          h('thead', h('tr', cfg.columns.map((c) => h('th', { class: c.right ? 'right' : '' }, c.l)), canWrite ? h('th') : null)),
          h('tbody', r.items.map((it) => h('tr', cfg.columns.map((c) => h('td', { class: c.right ? 'right nowrap' : '' }, c.render ? c.render(it, { reload: load, user: ctx.user }) : (it[c.k] ?? '—'))),
            canWrite ? h('td', { class: 'right nowrap' },
              (cfg.rowActions || []).map((a) => (a.show ? a.show(it) : true) && h('button', { class: 'btn ghost sm', onclick: async () => { try { await a.run(it, load); } catch (e) { fail(e); } } }, a.l)), ' ',
              h('button', { class: 'btn ghost sm', onclick: () => openForm(it) }, 'Editar'), ' ',
              (!cfg.canDelete || cfg.canDelete(it, ctx.user)) && h('button', { class: 'btn danger sm', onclick: async () => {
                if (!(await confirmBox(`Excluir "${cfg.title(it)}"? Esta ação não pode ser desfeita.`))) return;
                try { await api.del(`${cfg.api}/${it.id}`); toast('Excluído.', 'ok'); load(); } catch (e) { fail(e); }
              } }, 'Excluir')) : null))))));
        const pages = Math.max(1, Math.ceil(r.total / r.limit));
        mount(pager, h('span', `${r.total} registro(s)`), h('div', { class: 'row' },
          h('button', { class: 'btn ghost sm', disabled: r.page <= 1, onclick: () => { st.page--; load(); } }, '← Anterior'),
          h('span', `Página ${r.page} de ${pages}`),
          h('button', { class: 'btn ghost sm', disabled: r.page >= pages, onclick: () => { st.page++; load(); } }, 'Próxima →')));
      }
      async function exportCSV() {
        try {
          const r = await api.get(cfg.api, { q: st.q, limit: 1000, ...st.filter });
          const cols = cfg.exportCols || cfg.columns.filter((c) => c.k).map((c) => ({ k: c.k, l: c.l }));
          downloadFile(`${cfg.api.slice(1)}.csv`, toCSV(r.items, cols), 'text/csv;charset=utf-8');
        } catch (e) { fail(e); }
      }
      mount(box,
        h('div', { class: 'pagehead' }, h('div', h('h1', cfg.title_page), cfg.subtitle && h('p', cfg.subtitle)),
          h('div', { class: 'row' }, cfg.csv !== false && h('button', { class: 'btn ghost', onclick: exportCSV }, 'Exportar CSV'),
            canWrite && cfg.canCreate !== false && h('button', { class: 'btn', onclick: () => openForm(null) }, `+ Novo ${cfg.singular}`))),
        h('div', { class: 'card' }, h('div', { class: 'toolbar' }, search, filters), body, pager));
      await load();
    }
  };
}
