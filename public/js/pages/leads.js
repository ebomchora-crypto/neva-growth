import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, brl, money, dt, dtt, debounce, downloadFile, toCSV, parseCSV, pills, hero, statCard } from '../ui.js';

const ACT = { nota: 'Nota', ligacao: 'Ligação', email: 'E-mail', reuniao: 'Reunião', whatsapp: 'WhatsApp', etapa: 'Etapa' };
const PRI = [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']];
const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ok */ } } };
const today = () => new Date().toISOString().slice(0, 10);

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer'; const isAdmin = ctx.user.role === 'admin';
    let stages = await api.get('/pipeline/stages');
    const users = await api.get('/users/options');
    const st = { view: ss.get('leadsView') || 'kanban', tab: 'todas', q: '', archived: false, priority: '', source: '', owner: '', min: ss.get('crmMin') === '1' };
    let leads = [];
    const area = h('div'); const statsBox = h('div', { class: 'hero-stats' }); const heroBox = h('div'); const bar = h('div', { class: 'stack', style: 'margin-bottom:14px' });
    const stageLabel = (k) => stages.find((s) => s.key === k)?.label || k;
    const firstOpen = () => stages.find((s) => s.kind === 'open')?.key;
    const late = (l) => l.due_date && l.due_date < today() && !l.archived && stages.find((s) => s.key === l.status)?.kind === 'open';

    async function load() {
      const p = { limit: 1000, q: st.q, archived: st.archived ? 1 : 0 };
      if (st.priority) p.priority = st.priority; if (st.source) p.source = st.source; if (st.owner) p.owner_id = st.owner;
      if (st.tab === 'minhas') p.owner_id = ctx.user.id; if (st.tab === 'prioritarias') p.priority = 'alta'; if (st.tab === 'atraso') p.overdue = 1;
      leads = (await api.get('/leads', p)).items; draw();
    }
    function drawHero() {
      const open = leads.filter((l) => stages.find((s) => s.key === l.status)?.kind === 'open');
      mount(heroBox, hero({ kicker: 'Neva Growth / Pipeline', title: 'CRM Kanban', subtitle: st.min ? null : `Organize o funil, priorize oportunidades e avance cada negociação com clareza. ${leads.length} oportunidade(s) no recorte.`,
        actions: [h('button', { class: 'btn ghost sm', onclick: () => { st.min = !st.min; ss.set('crmMin', st.min ? '1' : '0'); drawHero(); } }, st.min ? 'Expandir header' : 'Minimizar header'),
          isAdmin && h('button', { class: 'btn ghost sm', onclick: editFunnel }, 'Editar funil'), canWrite && h('button', { class: 'btn ghost sm', onclick: importCSV }, 'Importar carteira'), canWrite && h('button', { class: 'btn sm', onclick: () => form(null) }, '+ Nova oportunidade')],
        stats: st.min ? null : h('div', { class: 'hero-stats' }, stages.slice(0, 5).map((s) => statCard(s.label, leads.filter((l) => l.status === s.key).length))) }));
    }
    function draw() {
      drawHero(); drawBar();
      mount(area, st.view === 'kanban' ? kanban() : list());
    }
    function drawBar() {
      const counts = {};
      mount(bar, h('div', { class: 'row', style: 'justify-content:space-between' },
        pills({ items: [['todas', 'Todas'], ['minhas', 'Minhas'], ['atraso', 'Em atraso'], ['prioritarias', 'Prioritárias']], value: st.tab, counts, onChange: (v) => { st.tab = v; load(); } }),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost sm', onclick: () => { st.archived = !st.archived; load(); } }, st.archived ? '← Voltar ao quadro' : 'Arquivados'),
          h('div', { class: 'seg' }, ['kanban', 'lista'].map((v) => h('button', { class: st.view === v ? 'on' : '', onclick: () => { st.view = v; ss.set('leadsView', v); draw(); } }, v === 'kanban' ? 'Quadro' : 'Lista'))),
          h('input', { type: 'search', style: 'width:220px', placeholder: 'Buscar no quadro', 'aria-label': 'Buscar no quadro', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) }),
          h('button', { class: 'btn ghost sm', onclick: filtersModal }, `Filtros${[st.priority, st.source, st.owner].filter(Boolean).length ? ' •' : ''}`),
          h('button', { class: 'btn ghost sm', onclick: exportCSV }, 'Exportar'))));
    }
    function filtersModal() {
      const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() },
        fieldEl({ k: 'priority', l: 'Prioridade', type: 'select', empty: 'Todas', opts: PRI }, st.priority), fieldEl({ k: 'owner', l: 'Responsável', type: 'select', empty: 'Todos', opts: users.map((u) => [u.id, u.name]) }, st.owner),
        fieldEl({ k: 'source', l: 'Origem', type: 'select', empty: 'Todas', opts: sources }, st.source));
      modal({ title: 'Filtros', body: f, actions: [{ label: 'Limpar', kind: 'ghost', onClick: () => { st.priority = st.source = st.owner = ''; load(); } }, { label: 'Aplicar', onClick: () => { st.priority = f.priority.value; st.owner = f.owner.value; st.source = f.source.value; load(); } }] });
    }
    function card(l) {
      const el = h('div', { class: 'lcard', draggable: canWrite && !st.archived ? 'true' : null, tabindex: 0, onclick: () => openLead(l.id), onkeydown: (e) => { if (e.key === 'Enter') openLead(l.id); } },
        h('div', h('span', { class: 'pri ' + l.priority, title: `Prioridade ${l.priority}` }), h('b', l.name)), l.company && h('div', { class: 'sm mut' }, l.company),
        h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' }, h('span', { class: 'sm' }, money(l.value)), l.due_date && h('span', { class: 'sm ' + (late(l) ? 'late' : 'mut') }, (late(l) ? '⚠ ' : '') + dt(l.due_date))),
        l.owner_name && h('span', { class: 'badge', style: 'margin-top:6px' }, l.owner_name.split(' ')[0]));
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(l.id)); el.classList.add('drag'); });
      el.addEventListener('dragend', () => el.classList.remove('drag'));
      return el;
    }
    function kanban() {
      return h('div', { class: 'kanban' }, stages.map((s) => {
        const items = leads.filter((l) => l.status === s.key);
        const quick = h('input', { placeholder: '+ Adicionar oportunidade', 'aria-label': `Adicionar em ${s.label}`, onkeydown: async (e) => {
          if (e.key !== 'Enter' || !quick.value.trim()) return;
          try { await api.post('/leads', { name: quick.value.trim(), status: s.key }); toast('Oportunidade criada.', 'ok'); load(); } catch (x) { fail(x); } } });
        const col = h('div', { class: 'col', dataset: { stage: s.key } },
          h('h3', h('span', s.label), h('span', { class: 'mut sm' }, `${items.length} · `, money(items.reduce((a, l) => a + l.value, 0)))), items.map(card),
          !items.length && h('p', { class: 'sm mut', style: 'text-align:center' }, st.archived ? 'Nada arquivado aqui' : 'Arraste cards para cá'),
          canWrite && !st.archived && h('div', { class: 'qadd' }, quick));
        if (canWrite && !st.archived) {
          col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
          col.addEventListener('dragleave', () => col.classList.remove('over'));
          col.addEventListener('drop', async (e) => {
            e.preventDefault(); col.classList.remove('over');
            const id = Number(e.dataTransfer.getData('text/plain')); const l = leads.find((x) => x.id === id);
            if (!l || l.status === s.key) return;
            const prev = l.status; l.status = s.key; draw();
            try { await api.post(`/leads/${id}/stage`, { status: s.key }); } catch (ex) { l.status = prev; draw(); fail(ex); }
          });
        }
        return col;
      }));
    }
    function list() {
      if (!leads.length) return h('div', { class: 'card empty' }, h('b', st.archived ? 'Nenhuma oportunidade arquivada' : 'Nenhuma oportunidade'), st.q || st.tab !== 'todas' ? 'Nada neste recorte.' : 'Cadastre, importe um CSV ou use a Prospecção.');
      return h('div', { class: 'card tablewrap' }, h('table', h('thead', h('tr', ['Nome', 'Empresa', 'Contato', 'Etapa', 'Prioridade', 'Prazo', 'Valor', 'Responsável'].map((c) => h('th', c)))),
        h('tbody', leads.map((l) => h('tr', { style: 'cursor:pointer', onclick: () => openLead(l.id) }, h('td', h('b', l.name)), h('td', l.company || '—'), h('td', l.email || l.phone || '—'),
          h('td', h('span', { class: 'badge ' + ({ won: 'ok', lost: 'bad' }[stages.find((s) => s.key === l.status)?.kind] || '') }, stageLabel(l.status))), h('td', l.priority), h('td', { class: late(l) ? 'late' : '' }, dt(l.due_date)), h('td', money(l.value)), h('td', l.owner_name || '—'))))));
    }
    const FIELDS = () => [
      { k: 'name', l: 'Nome', req: true }, { k: 'company', l: 'Empresa' }, { k: 'email', l: 'E-mail', type: 'email' }, { k: 'phone', l: 'Telefone' },
      { k: 'website', l: 'Site' }, { k: 'source', l: 'Origem', ph: 'Indicação, Instagram, Google…' }, { k: 'value', l: 'Valor estimado (R$)', type: 'number', default: 0 },
      { k: 'status', l: 'Etapa', type: 'select', opts: stages.map((s) => [s.key, s.label]), default: firstOpen() }, { k: 'priority', l: 'Prioridade', type: 'select', opts: PRI, default: 'media' },
      { k: 'due_date', l: 'Prazo de retorno', type: 'date' }, { k: 'owner_id', l: 'Responsável', type: 'select', empty: '—', opts: users.map((u) => [u.id, u.name]) },
      { k: 'notes', l: 'Observações', type: 'textarea', wide: true }];
    function form(rec) {
      const defs = FIELDS();
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, rec?.[d.k] ?? (d.k === 'owner_id' ? ctx.user.id : undefined))));
      modal({ title: rec ? 'Editar oportunidade' : 'Nova oportunidade', size: 'lg', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
        if (!f.reportValidity()) return false;
        const data = readForm(f, defs); for (const d of defs) if (data[d.k] === '' && !d.req) data[d.k] = null;
        if (rec) await api.put('/leads/' + rec.id, data); else await api.post('/leads', data);
        toast('Oportunidade salva.', 'ok'); close(); load(); } }] });
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
      modal({ title: l.name, size: 'lg', body: h('div', { class: 'stack' },
        l.archived ? h('div', { class: 'notice' }, 'Esta oportunidade está arquivada.') : null,
        h('dl', { class: 'kv' }, [['Empresa', l.company], ['E-mail', l.email], ['Telefone', l.phone], ['Site', l.website], ['Origem', l.source], ['Valor', brl(l.value)], ['Etapa', stageLabel(l.status)], ['Prioridade', l.priority], ['Prazo', l.due_date && dt(l.due_date)], ['Responsável', l.owner_name], ['Observações', l.notes]]
          .filter(([, v]) => v).flatMap(([k, v]) => [h('dt', k), h('dd', v)])),
        myTasks.length ? h('div', h('b', 'Tarefas abertas'), h('ul', { class: 'list-plain' }, myTasks.map((t) => h('li', t.title)))) : null, h('h3', 'Atividades'), addAct, actList),
        actions: canWrite ? [
          { label: 'Excluir', kind: 'danger', keepOpen: true, onClick: async (close) => { if (!(await confirmBox(`Excluir "${l.name}" definitivamente?`))) return false; await api.del('/leads/' + id); toast('Excluído.', 'ok'); close(); load(); } },
          { label: l.archived ? 'Desarquivar' : 'Arquivar', kind: 'ghost', keepOpen: true, onClick: async (close) => { await api.put('/leads/' + id, { archived: !l.archived }); toast(l.archived ? 'Desarquivada.' : 'Arquivada.', 'ok'); close(); load(); } },
          { label: 'Converter em cliente', kind: 'ghost', keepOpen: true, onClick: async (close) => { await api.post(`/leads/${id}/convert`, { createSale: l.value > 0 }); toast('Convertida em cliente' + (l.value > 0 ? ' e venda pendente criada.' : '.'), 'ok'); close(); load(); } },
          { label: 'Editar', keepOpen: true, onClick: (close) => { close(); form(l); } }] : [] });
    }
    function editFunnel() {
      let list = stages.map((s) => ({ ...s }));
      const body = h('div', { class: 'stack' });
      const draw2 = () => mount(body, h('p', { class: 'sm mut', style: 'margin:0' }, 'Arraste a ordem com ↑/↓. Deve haver exatamente uma etapa de ganho e uma de perda. Etapas com oportunidades não podem ser excluídas.'),
        list.map((s, i) => h('div', { class: 'row' },
          h('input', { value: s.label, 'aria-label': 'Nome da etapa', style: 'flex:1', oninput: (e) => { s.label = e.target.value; } }),
          h('select', { style: 'width:auto', 'aria-label': 'Tipo', onchange: (e) => { s.kind = e.target.value; } }, [['open', 'Aberta'], ['won', 'Ganho'], ['lost', 'Perda']].map(([v, l]) => h('option', { value: v, selected: s.kind === v }, l))),
          h('button', { class: 'btn ghost sm', disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw2(); } }, '↑'),
          h('button', { class: 'btn ghost sm', disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw2(); } }, '↓'),
          h('button', { class: 'btn danger sm', disabled: s.leads_count > 0, title: s.leads_count ? `${s.leads_count} oportunidade(s) nesta etapa` : 'Excluir etapa', onclick: () => { list.splice(i, 1); draw2(); } }, '✕'))),
        h('button', { class: 'btn ghost sm', onclick: () => { list.push({ label: 'Nova etapa', kind: 'open', leads_count: 0 }); draw2(); } }, '+ Etapa'));
      draw2();
      modal({ title: 'Editar funil', size: 'lg', body, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar funil', keepOpen: true, onClick: async (close) => {
        stages = await api.put('/pipeline/stages', { stages: list.map((s) => ({ key: s.key, label: s.label, kind: s.kind })) }); stages = await api.get('/pipeline/stages'); toast('Funil atualizado.', 'ok'); close(); load(); } }] });
    }
    async function exportCSV() {
      try { const r = await api.get('/leads', { limit: 1000, archived: st.archived ? 1 : 0 });
        downloadFile('oportunidades.csv', toCSV(r.items.map((l) => ({ ...l, etapa: stageLabel(l.status) })), [['name', 'nome'], ['company', 'empresa'], ['email', 'email'], ['phone', 'telefone'], ['website', 'site'], ['source', 'origem'], ['etapa', 'etapa'], ['priority', 'prioridade'], ['due_date', 'prazo'], ['value', 'valor'], ['notes', 'observações']].map(([k, l]) => ({ k, l }))), 'text/csv;charset=utf-8'); } catch (e) { fail(e); }
    }
    async function importCSV() {
      const file = h('input', { type: 'file', accept: '.csv,text/csv' });
      const preview = h('p', { class: 'mut sm' }, 'Colunas aceitas: nome, empresa, email, telefone, site, origem, valor, observações. A primeira linha deve ser o cabeçalho.');
      let rows = [];
      file.addEventListener('change', async () => {
        const t = parseCSV(await file.files[0].text()); const head = t.shift().map((x) => x.trim().toLowerCase());
        const idx = (...names) => head.findIndex((x) => names.includes(x));
        const map = { name: idx('nome', 'name'), company: idx('empresa', 'company'), email: idx('email', 'e-mail'), phone: idx('telefone', 'phone'), website: idx('site', 'website'), source: idx('origem', 'source'), value: idx('valor', 'value'), notes: idx('observações', 'observacoes', 'notes') };
        if (map.name < 0) { preview.textContent = 'Cabeçalho "nome" não encontrado.'; rows = []; return; }
        rows = t.map((r) => Object.fromEntries(Object.entries(map).map(([k, i]) => [k, i >= 0 ? r[i] : null]))); preview.textContent = `${rows.length} linha(s) prontas para importar.`;
      });
      modal({ title: 'Importar carteira (CSV)', body: h('div', { class: 'stack' }, file, preview), actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Importar', keepOpen: true, onClick: async (close) => {
        if (!rows.length) { toast('Selecione um CSV válido.', 'err'); return false; }
        const r = await api.post('/leads/import', { rows }); toast(`${r.created} importado(s)${r.skipped.length ? `, ${r.skipped.length} ignorado(s)` : ''}.`, 'ok'); close(); load(); } }] });
    }
    mount(box, heroBox, bar, area);
    await load();
  }
};
