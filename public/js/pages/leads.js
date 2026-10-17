import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, brl, dtt, debounce, downloadFile, toCSV, parseCSV } from '../ui.js';

const STAGES = [['novo', 'Novo'], ['contato', 'Contato'], ['proposta', 'Proposta'], ['negociacao', 'Negociação'], ['ganho', 'Ganho'], ['perdido', 'Perdido']];
const FIELDS = [
  { k: 'name', l: 'Nome', req: true }, { k: 'company', l: 'Empresa' }, { k: 'email', l: 'E-mail', type: 'email' }, { k: 'phone', l: 'Telefone' },
  { k: 'website', l: 'Site' }, { k: 'source', l: 'Origem', ph: 'Indicação, Instagram, Google…' }, { k: 'value', l: 'Valor estimado (R$)', type: 'number', default: 0 },
  { k: 'status', l: 'Etapa', type: 'select', opts: STAGES, default: 'novo' }, { k: 'owner_id', l: 'Responsável', type: 'select' },
  { k: 'notes', l: 'Observações', type: 'textarea', wide: true }
];
const ACT = { nota: 'Nota', ligacao: 'Ligação', email: 'E-mail', reuniao: 'Reunião', whatsapp: 'WhatsApp', etapa: 'Etapa' };

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const users = await api.get('/users/options');
    let view = sessionStorageGet('leadsView') || 'kanban';
    let q = '';
    let leads = [];
    const area = h('div');

    async function load() {
      const r = await api.get('/leads', { q, limit: 1000 }); leads = r.items; draw();
    }
    function draw() {
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === view));
      mount(area, view === 'kanban' ? kanban() : list());
    }
    function card(l) {
      const el = h('div', { class: 'lcard', draggable: canWrite ? 'true' : null, tabindex: 0, dataset: { id: l.id }, onclick: () => openLead(l.id), onkeydown: (e) => { if (e.key === 'Enter') openLead(l.id); } },
        h('b', l.name), l.company && h('div', { class: 'sm mut' }, l.company),
        h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' }, h('span', { class: 'sm' }, brl(l.value)), l.owner_name && h('span', { class: 'badge' }, l.owner_name.split(' ')[0])));
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(l.id)); el.classList.add('drag'); });
      el.addEventListener('dragend', () => el.classList.remove('drag'));
      return el;
    }
    function kanban() {
      return h('div', { class: 'kanban' }, STAGES.map(([key, label]) => {
        const items = leads.filter((l) => l.status === key);
        const col = h('div', { class: 'col', dataset: { stage: key } },
          h('h3', h('span', label), h('span', { class: 'mut sm' }, `${items.length} · ${brl(items.reduce((a, l) => a + l.value, 0))}`)), items.map(card),
          !items.length && h('p', { class: 'sm mut', style: 'text-align:center' }, 'Arraste leads para cá'));
        if (canWrite) {
          col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
          col.addEventListener('dragleave', () => col.classList.remove('over'));
          col.addEventListener('drop', async (e) => {
            e.preventDefault(); col.classList.remove('over');
            const id = Number(e.dataTransfer.getData('text/plain')); const l = leads.find((x) => x.id === id);
            if (!l || l.status === key) return;
            const prev = l.status; l.status = key; draw();
            try { await api.post(`/leads/${id}/stage`, { status: key }); } catch (ex) { l.status = prev; draw(); fail(ex); }
          });
        }
        return col;
      }));
    }
    function list() {
      if (!leads.length) return h('div', { class: 'card empty' }, h('b', 'Nenhum lead'), q ? 'Nenhum resultado para a busca.' : 'Cadastre, importe um CSV ou use a Prospecção.');
      return h('div', { class: 'card tablewrap' }, h('table', h('thead', h('tr', ['Nome', 'Empresa', 'Contato', 'Etapa', 'Valor', 'Responsável'].map((c) => h('th', c)))),
        h('tbody', leads.map((l) => h('tr', { style: 'cursor:pointer', onclick: () => openLead(l.id) }, h('td', h('b', l.name)), h('td', l.company || '—'), h('td', l.email || l.phone || '—'),
          h('td', h('span', { class: 'badge ' + ({ ganho: 'ok', perdido: 'bad' }[l.status] || '') }, STAGES.find((s) => s[0] === l.status)[1])), h('td', brl(l.value)), h('td', l.owner_name || '—'))))));
    }
    function form(rec, onDone) {
      const defs = FIELDS.map((f) => f.k === 'owner_id' ? { ...f, empty: '—', opts: users.map((u) => [u.id, u.name]) } : f);
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, rec?.[d.k] ?? (d.k === 'owner_id' ? ctx.user.id : undefined))));
      modal({ title: rec ? 'Editar lead' : 'Novo lead', size: 'lg', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
        if (!f.reportValidity()) return false;
        const data = readForm(f, defs); for (const d of defs) if (data[d.k] === '' && !d.req) data[d.k] = null;
        if (rec) await api.put('/leads/' + rec.id, data); else await api.post('/leads', data);
        toast('Lead salvo.', 'ok'); close(); onDone?.(); load();
      } }] });
    }
    async function openLead(id) {
      const [l, acts, tasks] = await Promise.all([api.get('/leads/' + id), api.get(`/leads/${id}/activities`), api.get('/tasks', { limit: 100 })]);
      const myTasks = tasks.items.filter((t) => t.lead_id === id && !t.done);
      const actList = h('ul', { class: 'list-plain' });
      const drawActs = (arr) => mount(actList, arr.length ? arr.map((a) => h('li', h('div', h('span', { class: 'badge' }, ACT[a.type] || a.type), ' ', a.text, h('div', { class: 'sm mut' }, `${a.user_name || 'Sistema'} · ${dtt(a.created_at)}`)),
        canWrite && a.type !== 'etapa' && h('button', { class: 'btn ghost sm', 'aria-label': 'Excluir atividade', onclick: async () => { await api.del('/activities/' + a.id); drawActs(arr.filter((x) => x.id !== a.id)); } }, '✕'))) : h('li', { class: 'mut' }, 'Sem atividades.'));
      drawActs(acts);
      const type = h('select', { style: 'width:auto' }, Object.entries(ACT).filter(([k]) => k !== 'etapa').map(([k, v]) => h('option', { value: k }, v)));
      const txt = h('input', { placeholder: 'Registrar atividade…', 'aria-label': 'Atividade' });
      const addAct = canWrite && h('form', { class: 'row', onsubmit: async (e) => { e.preventDefault(); if (!txt.value.trim()) return;
        try { await api.post(`/leads/${id}/activities`, { type: type.value, text: txt.value }); txt.value = ''; drawActs(await api.get(`/leads/${id}/activities`)); } catch (x) { fail(x); } } }, type, h('div', { class: 'grow' }, txt), h('button', { class: 'btn' }, 'Adicionar'));
      const m = modal({ title: l.name, size: 'lg', body: h('div', { class: 'stack' },
        h('dl', { class: 'kv' }, [['Empresa', l.company], ['E-mail', l.email], ['Telefone', l.phone], ['Site', l.website], ['Origem', l.source], ['Valor', brl(l.value)], ['Etapa', STAGES.find((s) => s[0] === l.status)[1]], ['Responsável', l.owner_name], ['Observações', l.notes]]
          .filter(([, v]) => v).flatMap(([k, v]) => [h('dt', k), h('dd', v)])),
        myTasks.length ? h('div', h('b', 'Tarefas abertas'), h('ul', { class: 'list-plain' }, myTasks.map((t) => h('li', t.title)))) : null,
        h('h3', 'Atividades'), addAct, actList),
        actions: canWrite ? [
          { label: 'Excluir', kind: 'danger', keepOpen: true, onClick: async (close) => { if (!(await confirmBox(`Excluir o lead "${l.name}"?`))) return false; await api.del('/leads/' + id); toast('Lead excluído.', 'ok'); close(); load(); } },
          { label: 'Converter em cliente', kind: 'ghost', keepOpen: true, onClick: async (close) => {
            await api.post(`/leads/${id}/convert`, { createSale: l.value > 0 }); toast('Lead convertido em cliente' + (l.value > 0 ? ' e venda pendente criada.' : '.'), 'ok'); close(); load(); } },
          { label: 'Editar', keepOpen: true, onClick: (close) => { close(); form(l); } }] : [] });
    }
    async function importCSV() {
      const file = h('input', { type: 'file', accept: '.csv,text/csv' });
      const preview = h('p', { class: 'mut sm' }, 'Colunas aceitas: nome, empresa, email, telefone, site, origem, valor, observações. A primeira linha deve ser o cabeçalho.');
      let rows = [];
      file.addEventListener('change', async () => {
        const text = await file.files[0].text(); const t = parseCSV(text); const head = t.shift().map((x) => x.trim().toLowerCase());
        const idx = (...names) => head.findIndex((x) => names.includes(x));
        const map = { name: idx('nome', 'name'), company: idx('empresa', 'company'), email: idx('email', 'e-mail'), phone: idx('telefone', 'phone'), website: idx('site', 'website'), source: idx('origem', 'source'), value: idx('valor', 'value'), notes: idx('observações', 'observacoes', 'notes') };
        if (map.name < 0) { preview.textContent = 'Cabeçalho "nome" não encontrado.'; rows = []; return; }
        rows = t.map((r) => Object.fromEntries(Object.entries(map).map(([k, i]) => [k, i >= 0 ? r[i] : null])));
        preview.textContent = `${rows.length} linha(s) prontas para importar.`;
      });
      modal({ title: 'Importar leads (CSV)', body: h('div', { class: 'stack' }, file, preview), actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Importar', keepOpen: true, onClick: async (close) => {
        if (!rows.length) { toast('Selecione um CSV válido.', 'err'); return false; }
        const r = await api.post('/leads/import', { rows }); toast(`${r.created} lead(s) importado(s)${r.skipped.length ? `, ${r.skipped.length} ignorado(s)` : ''}.`, 'ok'); close(); load();
      } }] });
    }
    const tabs = h('div', { class: 'row' }, ['kanban', 'lista'].map((v) => h('button', { class: 'btn ghost sm', dataset: { v }, onclick: () => { view = v; sessionStorageSet('leadsView', v); draw(); } }, v === 'kanban' ? 'Funil' : 'Lista')));
    tabs.querySelectorAll('button').forEach((b) => (b.style.cssText = ''));
    mount(box, h('div', { class: 'pagehead' }, h('div', h('h1', 'Leads e funil'), h('p', 'Arraste os cards entre as etapas para atualizar o andamento.')),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: async () => {
        const r = await api.get('/leads', { limit: 1000 }); downloadFile('leads.csv', toCSV(r.items, [['name', 'nome'], ['company', 'empresa'], ['email', 'email'], ['phone', 'telefone'], ['website', 'site'], ['source', 'origem'], ['status', 'etapa'], ['value', 'valor'], ['notes', 'observações']].map(([k, l]) => ({ k, l }))), 'text/csv;charset=utf-8'); } }, 'Exportar CSV'),
        canWrite && h('button', { class: 'btn ghost', onclick: importCSV }, 'Importar CSV'), canWrite && h('button', { class: 'btn', onclick: () => form(null) }, '+ Novo lead'))),
      h('div', { class: 'row', style: 'margin-bottom:14px' }, tabs, h('input', { class: 'grow', type: 'search', style: 'max-width:340px', placeholder: 'Buscar leads…', 'aria-label': 'Buscar leads', oninput: debounce((e) => { q = e.target.value; load(); }) })), area);
    await load();
  }
};
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } }
