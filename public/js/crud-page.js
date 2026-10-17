// Página CRUD genérica: busca, filtros, paginação, criar/editar/excluir, exportação CSV.
import { api } from './api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, debounce, downloadFile, toCSV, pills, hero, icon, mascotImg } from './ui.js';

export function crudPage(cfg) {
  return {
    async render(box, ctx) {
      const canWrite = ctx.user.role !== 'viewer';
      const st = { q: '', page: 1, filter: {}, limit: 20, pill: cfg.pills?.default ?? '' };
      const variant = cfg.pills?.variant || 'plain';
      const pillsBox = h('div', variant === 'plain' ? { class: 'pad', style: 'padding-bottom:0' } : { class: variant === 'board' ? 'bigtabs' : 'grow' }); const statsBox = h('div', { class: 'hero-stats ' + (cfg.statsClass || '') });
      let lastTotal = 0; let lastCounts = null; const sumBox = h('div', { class: 'sum' }); const boardInfo = h('small');
      async function refreshMeta() {
        if (cfg.stats) try { mount(statsBox, await cfg.stats(st)); } catch { /* indicadores são opcionais */ }
        if (cfg.pills) { let counts = null; if (cfg.pills.counts) try { counts = await cfg.pills.counts(st); } catch { /* sem contadores */ }
          lastCounts = counts;
          mount(pillsBox, pills({ items: cfg.pills.items, value: st.pill, counts: variant === 'board' ? null : counts, onChange: (v) => { st.pill = v; st.page = 1; load(); } }));
          drawSummary(); }
      }
      function drawSummary() {
        if (variant === 'bar' && cfg.pills.summary) mount(sumBox, cfg.pills.summary(lastTotal, lastCounts || {}));
        if (variant === 'board') mount(boardInfo, `${lastTotal} de ${lastCounts?.[''] ?? lastTotal} empresas no radar`);
      }
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
          const r = await api.get(cfg.api, { q: st.q, page: st.page, limit: st.limit, ...st.filter, ...(cfg.pills ? { [cfg.pills.param]: st.pill } : {}) });
          lastTotal = r.total; renderTable(r); refreshMeta();
        } catch (e) { mount(body, h('div', { class: 'empty' }, e.message)); }
      }
      function renderTable(r) {
        if (!r.items.length) {
          const filtered = st.q || Object.values(st.filter).some(Boolean) || (cfg.pills && st.pill !== cfg.pills.default);
          const art = cfg.emptyMascot ? mascotImg(cfg.emptyMascot, cfg.emptyFramed) : (canWrite && !filtered && cfg.canCreate !== false ? h('button', { class: 'eico', style: 'cursor:pointer', title: `Novo ${cfg.singular}`, 'aria-label': `Novo ${cfg.singular}`, onclick: () => openForm(null) }, icon(cfg.emptyIcon || 'userplus')) : h('span', { class: 'eico' }, icon(cfg.emptyIcon || 'userplus')));
          mount(body, h('div', { class: 'emptyart' }, art, h('b', filtered ? 'Nenhum resultado' : cfg.emptyTitle || 'Nada por aqui ainda'),
            filtered ? 'Nada neste recorte.' : (canWrite ? `Crie o primeiro ${cfg.singular} para começar.` : ''),
            )); mount(pager); return;
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
          const r = await api.get(cfg.api, { q: st.q, limit: 1000, ...st.filter, ...(cfg.pills ? { [cfg.pills.param]: st.pill } : {}) });
          const cols = cfg.exportCols || cfg.columns.filter((c) => c.k).map((c) => ({ k: c.k, l: c.l }));
          downloadFile(`${cfg.api.slice(1)}.csv`, toCSV(r.items, cols), 'text/csv;charset=utf-8');
        } catch (e) { fail(e); }
      }
      const actions = [cfg.csv !== false && h('button', { class: 'btn ghost', onclick: exportCSV }, 'Exportar CSV'),
        canWrite && cfg.canCreate !== false && h('button', { class: 'btn', onclick: () => openForm(null) }, icon('plus'), cfg.newLabel || `Novo ${cfg.singular}`)];
      const tools = h('div', { class: 'toolbar' }, search, filters);
      const head = variant === 'board' ? h('div', { class: 'boardhead' }, h('div', h('div', { class: 'k' }, cfg.board?.kicker || 'Board'), h('h2', cfg.board?.title || cfg.title_page), boardInfo), pillsBox)
        : variant === 'plain' && cfg.pills ? pillsBox : null;
      const bar = variant === 'bar' ? h('div', { class: 'card orgbar' }, h('div', { class: 'lab' }, h('b', cfg.pills.bar?.label || 'Visões'), h('small', cfg.pills.bar?.sub || '')), pillsBox, sumBox) : null;
      mount(box,
        cfg.hero ? hero({ kicker: cfg.hero.kicker, title: cfg.hero.title, subtitle: cfg.subtitle, actions, stats: cfg.stats ? statsBox : null, art: cfg.hero.art })
          : h('div', { class: 'pagehead' }, h('div', h('h1', cfg.title_page), cfg.subtitle && h('p', cfg.subtitle)), h('div', { class: 'row' }, actions)),
        bar, h('div', { class: 'card' + (variant === 'board' ? ' board' : '') }, head, tools, body, pager));
      await load();
    }
  };
}
