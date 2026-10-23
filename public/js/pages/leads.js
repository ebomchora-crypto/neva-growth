import { api } from '../api.js';
import { pop } from '../motion.js';
import { drawer, field } from '../drawer.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, brl, money, dt, dtt, debounce, downloadFile, toCSV, parseCSV, pills, hero, statCard, icon } from '../ui.js';

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
    let leads = []; let archivedCount = 0; let justId = null;
    const area = h('div'); const statsBox = h('div', { class: 'hero-stats' }); const heroBox = h('div'); const bar = h('div', { class: 'stack', style: 'margin-bottom:14px' });
    const stageLabel = (k) => stages.find((s) => s.key === k)?.label || k;
    const firstOpen = () => stages.find((s) => s.kind === 'open')?.key;
    const late = (l) => l.due_date && l.due_date < today() && !l.archived && stages.find((s) => s.key === l.status)?.kind === 'open';

    async function load() {
      const p = { limit: 1000, q: st.q, archived: st.archived ? 1 : 0 };
      if (st.priority) p.priority = st.priority; if (st.source) p.source = st.source; if (st.owner) p.owner_id = st.owner;
      if (st.tab === 'minhas') p.owner_id = ctx.user.id; if (st.tab === 'prioritarias') p.priority = 'alta'; if (st.tab === 'atraso') p.overdue = 1;
      leads = (await api.get('/leads', p)).items; draw();
      api.get('/leads', { limit: 1, archived: 1 }).then((r) => { archivedCount = r.total; drawBar(); }).catch(() => {});
    }
    function drawHero() {
      mount(heroBox, hero({ kicker: 'Neva Growth / Pipeline Studio', title: 'CRM Kanban.', badge: h('span', { class: 'badge' }, `${leads.length} oportunidade${leads.length === 1 ? '' : 's'}`),
        subtitle: st.min ? null : 'Organize o funil, priorize oportunidades e avance cada negociação com clareza.', art: st.min ? null : 'kanban', actionsClass: 'inflow',
        actions: [h('div', { class: 'hero-group' },
          canWrite && h('button', { class: 'btn sm', onclick: editFunnel }, icon('filter'), 'Editar funil'), canWrite && h('button', { class: 'btn sm', onclick: importCarteira }, icon('userplus'), 'Importar carteira'), canWrite && h('button', { class: 'btn sm white', onclick: () => form(null) }, icon('plus'), 'Nova oportunidade')),
          h('button', { class: 'btn ghost sm', onclick: () => { st.min = !st.min; ss.set('crmMin', st.min ? '1' : '0'); drawHero(); } }, st.min ? 'Expandir header' : '▲ Minimizar header')],
        stats: st.min ? null : h('div', { class: 'pstrip' }, stages.slice(0, 5).map((s, i) => h('div', { class: 'ps' }, h('div', h('em', String(i + 1).padStart(2, '0')), h('small', s.label)), h('span', leads.filter((l) => l.status === s.key).length)))) }));
    }
    function draw() {
      drawHero(); drawBar();
      mount(area, st.view === 'kanban' ? kanban() : list());
    }
    function drawBar() {
      const menu = h('div', { class: 'menu hide' }, h('button', { onclick: () => { menu.classList.add('hide'); exportCSV(); } }, 'Exportar CSV'));
      mount(bar, h('div', { class: 'card ktool' },
        h('div', { class: 'ktabs' }, [['todas', 'Todas'], ['minhas', 'Minhas'], ['atraso', 'Em atraso'], ['prioritarias', 'Prioritárias']].map(([v, l]) => h('button', { class: st.tab === v ? 'on' : '', onclick: () => { st.tab = v; load(); } }, l))),
        h('div', { class: 'kright' },
          h('button', { class: 'kbtn', onclick: () => { st.archived = !st.archived; load(); } }, icon('archive'), st.archived ? '← Voltar ao quadro' : 'Arquivados', !st.archived && h('span', { class: 'n' }, archivedCount)),
          h('div', { class: 'kseg' }, [['kanban', 'grid', 'Quadro'], ['lista', 'list', 'Lista']].map(([v, ic, l]) => h('button', { class: st.view === v ? 'on' : '', title: l, 'aria-label': l, onclick: () => { st.view = v; ss.set('leadsView', v); draw(); } }, icon(ic)))),
          h('div', { class: 'ksearch' }, icon('search'), h('input', { type: 'search', placeholder: 'Buscar no quadro', 'aria-label': 'Buscar no quadro', value: st.q, oninput: debounce((e) => { st.q = e.target.value; load(); }) })),
          h('button', { class: 'kbtn', onclick: filtersModal }, icon('filter'), `Filtros${[st.priority, st.source, st.owner].filter(Boolean).length ? ' •' : ''}`),
          h('div', { class: 'menuwrap' }, h('button', { class: 'kbtn', 'aria-label': 'Exportar', title: 'Exportar', onclick: () => menu.classList.toggle('hide') }, icon('download'), icon('chevron')), menu))));
    }
    function filtersModal() {
      const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() },
        fieldEl({ k: 'priority', l: 'Prioridade', type: 'select', empty: 'Todas', opts: PRI }, st.priority), fieldEl({ k: 'owner', l: 'Responsável', type: 'select', empty: 'Todos', opts: users.map((u) => [u.id, u.name]) }, st.owner),
        fieldEl({ k: 'source', l: 'Origem', type: 'select', empty: 'Todas', opts: sources }, st.source));
      modal({ title: 'Filtros', body: f, actions: [{ label: 'Limpar', kind: 'ghost', onClick: () => { st.priority = st.source = st.owner = ''; load(); } }, { label: 'Aplicar', onClick: () => { st.priority = f.priority.value; st.owner = f.owner.value; st.source = f.source.value; load(); } }] });
    }
    function card(l) {
      const el = h('div', { class: 'lcard' + (l.id === justId ? ' just' : ''), draggable: canWrite && !st.archived ? 'true' : null, tabindex: 0, onclick: () => openLead(l.id), onkeydown: (e) => { if (e.key === 'Enter') openLead(l.id); } },
        h('div', h('span', { class: 'pri ' + l.priority, title: `Prioridade ${l.priority}` }), h('b', l.name)), l.company && h('div', { class: 'sm mut' }, l.company),
        h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' }, h('span', { class: 'sm' }, money(l.value)), l.due_date && h('span', { class: 'sm ' + (late(l) ? 'late' : 'mut') }, (late(l) ? '⚠ ' : '') + dt(l.due_date))),
        l.owner_name && h('span', { class: 'badge', style: 'margin-top:6px' }, l.owner_name.split(' ')[0]));
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(l.id)); e.dataTransfer.effectAllowed = 'move'; el.classList.add('drag'); dragging = true; });
      el.addEventListener('dragend', () => { el.classList.remove('drag'); dragging = false; });
      return el;
    }
    // O quadro é mais largo que a tela: durante o arrasto, perto das bordas ele rola sozinho (sem isso as colunas do lado de fora não dá para alcançar).
    let dragging = false;
    function autoScroll(board) {
      board.addEventListener('dragover', (e) => {
        if (!dragging) return; const r = board.getBoundingClientRect(); const edge = 90;
        if (e.clientX > r.right - edge) board.scrollLeft += 22; else if (e.clientX < r.left + edge) board.scrollLeft -= 22;
      });
    }
    function dragToScroll(board) {
      let start = null;
      const finish = (e) => {
        if (!start || e.pointerId !== start.id) return;
        start = null; board.classList.remove('panning');
        if (board.hasPointerCapture(e.pointerId)) board.releasePointerCapture(e.pointerId);
      };
      board.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || board.scrollWidth <= board.clientWidth) return;
        if (e.target.closest('.lcard,button,input,textarea,select,a,[contenteditable]')) return;
        if (e.clientY >= board.getBoundingClientRect().top + board.clientHeight) return;
        start = { id: e.pointerId, x: e.clientX, left: board.scrollLeft };
        board.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      board.addEventListener('pointermove', (e) => {
        if (!start || e.pointerId !== start.id) return;
        const distance = e.clientX - start.x;
        if (Math.abs(distance) < 4 && !board.classList.contains('panning')) return;
        board.classList.add('panning');
        board.scrollLeft = start.left - distance;
        e.preventDefault();
      });
      board.addEventListener('pointerup', finish);
      board.addEventListener('pointercancel', finish);
      board.addEventListener('lostpointercapture', finish);
    }
    function kanban() {
      const board = h('div', { class: 'kanban' }, stages.map((s) => {
        const items = leads.filter((l) => l.status === s.key);
        const foot = h('div');
        const openQuick = () => {
          const quick = h('input', { placeholder: 'Nome da oportunidade e Enter', 'aria-label': `Adicionar em ${s.label}`, onkeydown: async (e) => {
            if (e.key === 'Escape') { drawFoot(); return; }
            if (e.key !== 'Enter' || !quick.value.trim()) return;
            try { await api.post('/leads', { name: quick.value.trim(), status: s.key }); toast('Oportunidade criada.', 'ok'); load(); } catch (x) { fail(x); } } });
          mount(foot, h('div', { class: 'qadd' }, quick)); quick.focus();
        };
        const drawFoot = () => mount(foot, canWrite && !st.archived && h('button', { class: 'addopp', onclick: openQuick }, icon('plus'), 'Adicionar oportunidade'));
        drawFoot();
        const col = h('div', { class: 'col', dataset: { stage: s.key } },
          h('div', { class: 'colhead' }, h('div', { class: 't' }, h('span', s.label), h('span', { class: 'cn' }, h('span', items.length), canWrite && !st.archived && h('button', { title: `Nova oportunidade em ${s.label}`, 'aria-label': `Nova oportunidade em ${s.label}`, onclick: openQuick }, icon('plus')))),
            h('div', { class: 'v' }, money(items.reduce((a, l) => a + l.value, 0)), h('small', 'valor previsto'))),
          h('div', { class: 'colbody' }, items.map(card), !items.length && h('p', { class: 'sm mut', style: 'text-align:center;margin:8px 0' }, st.archived ? 'Nada arquivado aqui' : 'Arraste cards para cá'), foot));
        if (canWrite && !st.archived) {
          col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
          col.addEventListener('dragleave', () => col.classList.remove('over'));
          col.addEventListener('drop', async (e) => {
            e.preventDefault(); col.classList.remove('over');
            const id = Number(e.dataTransfer.getData('text/plain')); const l = leads.find((x) => x.id === id);
            if (!l || l.status === s.key) return;
            const prev = l.status; l.status = s.key; justId = id; draw(); pop(document.querySelector('.lcard.just')); justId = null;
            try { await api.post(`/leads/${id}/stage`, { status: s.key }); } catch (ex) { l.status = prev; draw(); fail(ex); }
          });
        }
        return col;
      }));
      autoScroll(board);
      dragToScroll(board);
      return h('div', null, board, h('div', { class: 'kfoot' }, h('span', `● Sincronizado com sua conta · ${archivedCount} arquivada(s)`), h('span', canWrite && !st.archived ? 'Arraste os cards entre etapas' : '')));
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
    const SOURCES = ['Indicação', 'Instagram', 'Google', 'Site', 'WhatsApp', 'Prospecção', 'Evento', 'Outro'];
    // Nova / editar oportunidade: gaveta lateral "O próximo projeto começa aqui."
    function form(rec) {
      const srcOpts = [...new Set([...(rec?.source ? [rec.source] : []), ...SOURCES])].map((x) => [x, x]);
      const F = {
        status: field({ k: 'status', l: 'Etapa', type: 'select', opts: stages.map((s) => [s.key, s.label, `${s.probability ?? 0}% de probabilidade`]) }, rec?.status || firstOpen()),
        name: field({ k: 'name', l: 'Projeto / oportunidade', req: true, ph: 'Ex.: Novo site institucional', full: true, max: 200 }, rec?.name),
        company: field({ k: 'company', l: 'Empresa', req: true, ph: 'Nome da empresa' }, rec?.company), contact: field({ k: 'contact', l: 'Pessoa de contato', ph: 'Com quem você conversa?' }, rec?.contact),
        phone: field({ k: 'phone', l: 'Telefone / WhatsApp', ph: '(11) 99999-9999' }, rec?.phone), email: field({ k: 'email', l: 'E-mail', ph: 'contato@empresa.com', type: 'email' }, rec?.email),
        value: field({ k: 'value', l: 'Valor previsto (R$)', type: 'money' }, rec?.value ?? 0), owner_id: field({ k: 'owner_id', l: 'Responsável', type: 'select', opts: users.map((u) => [u.id, u.name]) }, rec?.owner_id ?? ctx.user.id),
        priority: field({ k: 'priority', l: 'Prioridade', type: 'select', opts: [['baixa', 'Baixa'], ['media', 'Normal'], ['alta', 'Alta']] }, rec?.priority || 'media'), source: field({ k: 'source', l: 'Origem', type: 'select', opts: srcOpts }, rec?.source || 'Indicação'),
        due_date: field({ k: 'due_date', l: 'Próxima ação', type: 'date' }, rec?.due_date), tags: field({ k: 'tags', l: 'Tags', opt: 'separe por vírgula', ph: 'SaaS, redesign, landing page' }, rec?.tags),
        notes: field({ k: 'notes', l: 'Notas', type: 'textarea', rows: 7, ph: 'Contexto da conversa, combinados, próximos passos…', full: true }, rec?.notes) };
      const pane = h('div'); let tab = 'det'; let acts = []; let myTasks = [];
      const startStatus = rec?.status;
      const tabsEl = h('div', { class: 'dw-tabs', role: 'tablist' });
      const drawTabs = () => mount(tabsEl, [['det', 'user', 'Detalhes'], ['tar', 'check', 'Tarefas', myTasks.length], ['not', 'file', 'Notas'], ['his', 'clock', 'Histórico']].map(([k, ic, l, n]) => h('button', { type: 'button', role: 'tab', class: tab === k ? 'on' : '', onclick: () => { tab = k; drawTabs(); drawPane(); } }, icon(ic), l, n !== undefined && h('em', String(n)))));
      const detail = h('div', { class: 'dw-form' }, F.name.el, F.company.el, F.contact.el, F.phone.el, F.email.el, h('div', { class: 'dw-sep' }, 'Contexto comercial'), F.value.el, F.owner_id.el, F.priority.el, F.source.el, F.due_date.el, F.tags.el,
        h('div', { class: 'dw-warn' }, 'Conquistar uma oportunidade não registra uma venda automaticamente. O financeiro continua na seção Vendas.'));
      const notes = h('div', { class: 'dw-form' }, F.notes.el);
      const empty = (ic, t, d) => h('div', { class: 'dw-empty' }, icon(ic), h('b', t), h('small', d));
      function drawPane() {
        mount(pane, tab === 'det' ? detail : tab === 'not' ? notes
          : tab === 'tar' ? (!rec ? empty('check', 'Tarefas depois de criar', 'Crie a oportunidade para vincular tarefas a ela.') : myTasks.length ? h('ul', { class: 'list-plain' }, myTasks.map((t) => h('li', t.title))) : empty('check', 'Nenhuma tarefa aberta', 'Crie tarefas em Tarefas e vincule a esta oportunidade.'))
          : (!rec ? empty('clock', 'Histórico vazio', 'As atividades aparecem aqui depois que a oportunidade existir.') : h('div', actForm(), acts.length ? h('ul', { class: 'list-plain dw-acts' }, acts.map((a) => h('li', h('span', { class: 'badge' }, ACT[a.type] || a.type), ' ', a.text, h('div', { class: 'sm mut' }, `${a.user_name || 'Sistema'} · ${dtt(a.created_at)}`)))) : empty('clock', 'Sem atividades', 'Registre ligações, e-mails e reuniões aqui.'))));
      }
      // Registrar atividade direto no dossiê (nota, ligação, e-mail, reunião, WhatsApp).
      function actForm() {
        if (!canWrite) return null;
        const type = h('select', { 'aria-label': 'Tipo de atividade' }, Object.entries(ACT).filter(([k]) => k !== 'etapa').map(([k, v]) => h('option', { value: k }, v)));
        const txt = h('input', { placeholder: 'Registrar atividade…', 'aria-label': 'Atividade' });
        return h('form', { class: 'dw-actform', onsubmit: async (e) => { e.preventDefault(); if (!txt.value.trim()) return;
          try { await api.post(`/leads/${rec.id}/activities`, { type: type.value, text: txt.value }); txt.value = ''; acts = await api.get(`/leads/${rec.id}/activities`); drawTabs(); drawPane(); toast('Atividade registrada.', 'ok'); } catch (x) { fail(x); } } }, type, txt, h('button', { class: 'btn sm' }, 'Adicionar'));
      }
      if (rec) Promise.all([api.get(`/leads/${rec.id}/activities`), api.get('/tasks', { limit: 100 })]).then(([a, t]) => { acts = a; myTasks = t.items.filter((x) => x.lead_id === rec.id && !x.done); drawTabs(); drawPane(); }).catch(() => {});
      const note = h('span', { class: 'dw-note' }, icon('check'), rec ? 'Dados salvos na sua conta' : 'Preencha os dados para começar');
      const go = h('button', { type: 'button', class: 'dw-go', disabled: true }, icon('check'), rec ? 'Salvar alterações' : 'Criar oportunidade');
      const ready = () => F.name.input.value.trim() && F.company.input.value.trim();
      let touched = false;
      const sync = () => { const ok = Boolean(ready()); go.disabled = !ok; note.classList.toggle('ok', ok); note.lastChild.textContent = !ok ? 'Preencha os dados para começar' : rec && !touched ? 'Dados salvos na sua conta' : rec ? 'Há alterações para salvar' : 'Tudo pronto para salvar'; };
      // Ações do dossiê: arquivar, converter em cliente e excluir (só em oportunidade que já existe).
      const act = (ic, t, d, kind, fn) => h('button', { type: 'button', class: 'dw-act ' + kind, onclick: fn }, icon(ic), h('span', h('b', t), h('small', d)));
      const actions = rec && canWrite ? h('div', { class: 'dw-acts2' },
        act('archive', rec.archived ? 'Desarquivar oportunidade' : 'Arquivar oportunidade', 'Preserva os dados e o histórico', '', async () => { try { await api.put('/leads/' + rec.id, { archived: !rec.archived }); toast(rec.archived ? 'Desarquivada.' : 'Arquivada.', 'ok'); D.close(); load(); } catch (e) { fail(e); } }),
        !rec.client_id && act('userplus', 'Converter em cliente', rec.value > 0 ? 'Cria o cliente e uma venda pendente' : 'Cria o cliente com os dados desta oportunidade', '', async () => { try { await api.post(`/leads/${rec.id}/convert`, { createSale: rec.value > 0 }); toast('Convertida em cliente' + (rec.value > 0 ? ' e venda pendente criada.' : '.'), 'ok'); D.close(); load(); } catch (e) { fail(e); } }),
        act('trash', 'Excluir do CRM', 'Cliente, vendas e lead original são preservados', 'danger', async () => { if (!(await confirmBox(`Excluir "${rec.name}" definitivamente?`))) return; try { await api.del('/leads/' + rec.id); toast('Excluída.', 'ok'); D.close(); load(); } catch (e) { fail(e); } })) : null;
      const D = drawer({ kicker: rec ? 'Dossiê da oportunidade' : 'Novo relacionamento', title: rec ? rec.name : 'O próximo projeto começa aqui.', subtitle: rec ? [...new Set([rec.company, rec.contact].filter(Boolean))].join(' · ') || 'Sem empresa informada' : 'Dê contexto à conversa. O restante ganha forma no caminho.',
        body: h('div', F.status.el, tabsEl, pane, actions), footer: h('div', { class: 'dw-foot' }, note, go) });
      D.panel.addEventListener('input', () => { touched = true; sync(); }); D.panel.addEventListener('change', () => { touched = true; sync(); });
      for (const k of ['name', 'company']) F[k].input.addEventListener('input', sync);
      drawTabs(); drawPane(); sync();
      go.onclick = async () => {
        go.disabled = true;
        try {
          const g = (k) => F[k].input.value.trim();
          const data = { name: g('name'), company: g('company'), contact: g('contact') || null, phone: g('phone') || null, email: g('email') || null, value: Number(g('value')) || 0, owner_id: g('owner_id') ? Number(g('owner_id')) : null, priority: g('priority'), source: g('source') || null, due_date: g('due_date') || null, tags: g('tags') || null, notes: g('notes') || null, status: g('status') };
          if (rec) { await api.put('/leads/' + rec.id, data); if (data.status !== startStatus) await api.post(`/leads/${rec.id}/stage`, { status: data.status }).catch(() => {}); } else await api.post('/leads', data);
          toast('Oportunidade salva.', 'ok'); D.close(); load();
        } catch (e) { fail(e); go.disabled = false; }
      };
    }
    // Clicar numa oportunidade abre o dossiê (gaveta lateral), como no Code Makers.
    async function openLead(id) {
      try { form(await api.get('/leads/' + id)); } catch (e) { fail(e); }
    }
    // Editar funil: gaveta "Seu funil. Suas regras."
    function editFunnel() {
      let list = stages.map((s) => ({ ...s }));
      const KIND = [['open', 'Em andamento'], ['won', 'Ganha'], ['lost', 'Perdida']];
      const flow = h('div', { class: 'dw-flow' }); const cards = h('div');
      const drawAll = () => {
        mount(flow, list.map((s, i) => h('span', h('em', String(i + 1).padStart(2, '0')), s.label || '—', i < list.length - 1 && h('i', '→'))));
        mount(cards, list.map((s, i) => {
          const nm = field({ k: 'label', l: 'Nome', max: 40 }, s.label); nm.input.addEventListener('input', (e) => { s.label = e.target.value; mount(flow, list.map((x, j) => h('span', h('em', String(j + 1).padStart(2, '0')), x.label || '—', j < list.length - 1 && h('i', '→')))); });
          const ds = field({ k: 'description', l: 'Descrição', max: 80 }, s.description || ''); ds.input.addEventListener('input', (e) => { s.description = e.target.value; });
          const pr = field({ k: 'probability', l: 'Probabilidade (%)', type: 'number' }, s.probability ?? 0); pr.input.addEventListener('input', (e) => { s.probability = Number(e.target.value) || 0; });
          const kd = field({ k: 'kind', l: 'Resultado', type: 'select', opts: KIND }, s.kind); kd.input.addEventListener('change', (e) => { s.kind = e.target.value; });
          return h('section', { class: 'dw-stage' }, h('div', { class: 'dw-stagehead' }, h('b', `ETAPA ${String(i + 1).padStart(2, '0')}`), h('div',
            h('button', { type: 'button', class: 'dw-ib', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; drawAll(); } }, '↑'),
            h('button', { type: 'button', class: 'dw-ib', 'aria-label': 'Descer', disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; drawAll(); } }, '↓'),
            h('button', { type: 'button', class: 'dw-ib', 'aria-label': 'Excluir etapa', disabled: s.leads_count > 0, title: s.leads_count ? `${s.leads_count} oportunidade(s) nesta etapa` : 'Excluir etapa', onclick: () => { list.splice(i, 1); drawAll(); } }, icon('x')))),
            h('div', { class: 'dw-form' }, h('div', { class: 'full' }, nm.el), h('div', { class: 'full' }, ds.el), pr.el, kd.el));
        }));
      };
      drawAll();
      const save = h('button', { type: 'button', class: 'dw-go' }, icon('check'), 'Salvar funil');
      const D = drawer({ kicker: 'Arquitetura do seu fluxo', title: 'Seu funil. Suas regras.', subtitle: 'Desenhe as etapas da primeira conversa ao fechamento. Os cards acompanham seu fluxo.',
        body: h('div', flow, cards, h('button', { type: 'button', class: 'dw-add', onclick: () => { list.push({ label: 'Nova etapa', description: '', probability: 0, kind: 'open', leads_count: 0 }); drawAll(); } }, icon('plus'), 'Adicionar etapa'),
          h('div', { class: 'dw-fnote' }, 'Sincronizado com a sua conta. Etapas que ainda têm oportunidades não podem ser excluídas. Cancelar descarta as alterações do funil.')),
        footer: h('div', { class: 'dw-foot' }, h('span', { class: 'dw-note' }, icon('check'), 'Exatamente uma etapa Ganha e uma Perdida'), h('div', { style: 'display:flex;gap:10px' }, h('button', { type: 'button', class: 'dw-ghost', onclick: () => D.close() }, 'Cancelar'), save)) });
      save.onclick = async () => {
        save.disabled = true;
        try { await api.put('/pipeline/stages', { stages: list.map((s) => ({ key: s.key, label: s.label, kind: s.kind, description: s.description, probability: s.probability })) }); stages = await api.get('/pipeline/stages'); toast('Funil atualizado.', 'ok'); D.close(); load(); }
        catch (e) { fail(e); save.disabled = false; }
      };
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
    // Importar carteira: traz clientes cadastrados e leads da Prospecção para a primeira etapa do funil.
    async function importCarteira() {
      let src = { clients: [], prospects: [] };
      try { src = await api.get('/leads/import/sources'); } catch (e) { return fail(e); }
      let tab = 'clients'; let q = ''; const sel = new Set();
      const seg = h('div', { class: 'dw-seg' }); const info = h('div', { class: 'dw-sel' }); const list = h('div', { class: 'dw-list' });
      const search = h('input', { type: 'search', placeholder: 'Buscar empresa ou contato', 'aria-label': 'Buscar', oninput: (e) => { q = e.target.value.toLowerCase(); drawList(); } });
      const cur = () => src[tab].filter((x) => !q || `${x.name} ${x.sub || ''}`.toLowerCase().includes(q));
      const go = h('button', { type: 'button', class: 'dw-go', disabled: true }, icon('plus'), 'Importar leads');
      const MAX = 60;
      function drawList() {
        const items = cur();
        mount(seg, [['clients', 'building', 'Clientes', src.clients.length], ['prospects', 'pin', 'Carteira de leads', src.prospects.length]].map(([k, ic, l, n]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; sel.clear(); q = ''; search.value = ''; drawList(); } }, icon(ic), l, h('em', String(n)))));
        const all = items.slice(0, MAX); const allOn = all.length && all.every((x) => sel.has(x.key));
        mount(info, h('span', `${sel.size} selecionados · ${items.length} disponíveis${tab === 'prospects' ? ` · até ${MAX} por lote` : ''}`), h('button', { type: 'button', disabled: !items.length, onclick: () => { if (allOn) all.forEach((x) => sel.delete(x.key)); else all.forEach((x) => sel.add(x.key)); drawList(); } }, icon('check'), allOn ? 'Limpar seleção' : 'Selecionar todos'));
        mount(list, items.length ? items.slice(0, 300).map((x) => h('button', { type: 'button', class: 'dw-item' + (sel.has(x.key) ? ' on' : ''), onclick: () => { if (sel.has(x.key)) sel.delete(x.key); else if (sel.size < MAX) sel.add(x.key); else toast(`Importe até ${MAX} por vez.`, 'err'); drawList(); } },
          h('i', { class: 'cav' }, (x.name || '?')[0].toUpperCase()), h('span', h('b', x.name), h('small', x.sub || '—')), h('i', { class: 'fs-ock', 'aria-hidden': 'true' })))
          : h('div', { class: 'dw-empty' }, icon(tab === 'clients' ? 'users' : 'pin'), h('b', tab === 'clients' ? 'Nenhum cliente disponível.' : 'Nenhum lead disponível.'), h('small', tab === 'clients' ? 'Os clientes já importados não são duplicados.' : 'Faça uma busca na Prospecção e todos os leads desta carteira já estão no CRM.')));
        go.disabled = !sel.size; go.lastChild.textContent = tab === 'clients' ? `Importar clientes${sel.size ? ` (${sel.size})` : ''}` : `Importar leads${sel.size ? ` (${sel.size})` : ''}`;
      }
      const D = drawer({ kicker: 'Carteira / CRM Kanban', title: 'Traga as relações que já começaram.', subtitle: 'Escolha clientes cadastrados ou leads encontrados na Prospecção. Cada item entra como uma oportunidade na primeira etapa disponível.',
        body: h('div', seg, h('label', { class: 'dw-search' }, icon('search'), search), info, list, h('p', { class: 'sm mut', style: 'margin-top:14px' }, 'Tem uma planilha? ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); D.close(); importCSV(); } }, 'Importar de um arquivo CSV'), '.')),
        footer: h('div', { class: 'dw-foot' }, h('span', { class: 'dw-note' }, icon('check'), 'Itens já importados não são duplicados'), go) });
      go.onclick = async () => {
        go.disabled = true;
        try { const r = await api.post('/leads/import/batch', { type: tab, keys: [...sel] }); toast(`${r.created} oportunidade(s) importada(s).`, 'ok'); D.close(); load(); } catch (e) { fail(e); go.disabled = false; }
      };
      drawList();
    }
    mount(box, heroBox, bar, area);
    await load();
  }
};
