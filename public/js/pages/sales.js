import { api } from '../api.js';
import { h, mount, hero, pills, statCard, money, toast, fail, icon, confirmBox } from '../ui.js';
import { formSheet, money as brlf } from '../form-sheet.js';

const SVIEWS = [['todas', 'Todas'], ['margem', 'Melhor margem'], ['proxima', 'Entrega próxima'], ['atrasadas', 'Atrasadas'], ['entregues', 'Entregues'], ['sem_cliente', 'Sem cliente']];
const TYPES = [['Site institucional', 'Site institucional', 'Presença digital completa'], ['Landing page', 'Landing page', 'Página focada em conversão'], ['E-commerce', 'E-commerce', 'Loja virtual completa'], ['Sistema web', 'Sistema web', 'Aplicação sob medida'], ['Aplicativo', 'Aplicativo', 'App para celular'], ['Outro', 'Outro', 'Serviço personalizado']];
const DAY_BRT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
const today = () => DAY_BRT.format(new Date());
const day = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const late = (s) => s.delivery_status === 'pendente' && s.status !== 'cancelado' && s.delivery_date && s.delivery_date < today();

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    box.classList.add('pg-compact');
    const st = { view: 'todas', q: '', sel: null };
    let items = []; let summary = null; let clients = [];
    const none = () => !items.length && st.view === 'todas' && !st.q;
    const statsBox = h('div', { class: 'hero-stats' });
    const bar = h('div', { class: 'card orgbar' }); const grid = h('div', { class: 'sv-grid' }); const queue = h('section', { class: 'card sv-queue' }); const panel = h('aside', { class: 'card sv-panel' });

    // ---- formulário (registrar / editar)
    function sheet(rec) {
      const clientOpts = [['', 'Projeto independente', 'Sem cliente vinculado'], ...clients.map((c) => [c.id, c.company || c.name, c.company ? c.name : 'Cliente da carteira'])];
      formSheet({
        kicker: 'Neva Growth / Nova operação', title: rec ? 'Editar venda.' : 'Registrar venda.', subtitle: 'Organize o projeto, os valores e a entrega em um único lançamento.', ic: 'briefcase',
        values: { description: rec?.description, client_id: rec?.client_id ?? '', amount: rec?.amount, cost: rec?.cost, project_type: rec?.project_type || 'Site institucional', sold_at: rec?.sold_at || today(), delivery_date: rec?.delivery_date, status: rec?.status || 'pago', delivery_status: rec?.delivery_status || 'pendente' },
        submit: rec ? 'Salvar alterações' : 'Registrar venda', foot: 'O lucro entra na sua carteira após o registro.', ic2: 'dollar',
        sections: [
          { title: 'Identificação', sub: 'O que foi vendido e para quem.', cols: 2, fields: [{ k: 'description', l: 'Projeto', ic: 'briefcase', ph: 'Ex.: Landing page premium', req: true, max: 160 }, { k: 'client_id', l: 'Cliente', ic: 'user', opt: true, type: 'select', opts: clientOpts }] },
          { title: 'Resultado financeiro', sub: 'Informe receita e custo para prever o lucro.', cols: 3, fields: [{ k: 'amount', l: 'Valor vendido', type: 'money', req: true }, { k: 'cost', l: 'Custo do projeto', type: 'money' }, { k: 'profit', l: 'Lucro', type: 'profit' }] },
          { title: 'Entrega', sub: 'Classifique o projeto e organize as datas.', cols: 3, fields: [{ k: 'project_type', l: 'Tipo de projeto', ic: 'layers', type: 'select', opts: TYPES }, { k: 'sold_at', l: 'Data da venda', ic: 'calendar', type: 'date' }, { k: 'delivery_date', l: 'Previsão de entrega', ic: 'calendar', type: 'date', opt: true }] },
          ...(rec ? [{ title: 'Situação', sub: 'Pagamento e entrega desta venda.', cols: 2, fields: [{ k: 'status', l: 'Pagamento', type: 'select', opts: [['pendente', 'Pendente', 'Ainda não recebido'], ['pago', 'Pago', 'Entrou no caixa'], ['cancelado', 'Cancelado', 'Venda desfeita']] }, { k: 'delivery_status', l: 'Entrega', type: 'select', opts: [['pendente', 'Pendente', 'Em produção'], ['entregue', 'Entregue', 'Projeto finalizado']] }] }] : [])],
        extra: ({ inputs }) => { const calc = () => { const v = (Number(inputs.amount.value) || 0) - (Number(inputs.cost.value) || 0); inputs.profit.out.textContent = brlf(v); inputs.profit.out.style.color = v < 0 ? '#ffb4b8' : ''; }; inputs.amount.addEventListener('input', calc); inputs.cost.addEventListener('input', calc); calc(); },
        onSubmit: async (d, close) => {
          const amount = Number(d.amount); const cost = Number(d.cost || 0);
          if (d.amount === '' || !(amount >= 0)) throw new Error('Informe o valor vendido.');
          if (cost > amount) throw new Error('O custo não pode ser maior que o valor da venda.');
          const body = { description: d.description, client_id: d.client_id === '' ? null : Number(d.client_id), amount, cost, project_type: d.project_type, sold_at: d.sold_at || today(), delivery_date: d.delivery_date || null, status: rec ? d.status : 'pago', ...(rec ? { delivery_status: d.delivery_status } : {}) };
          const saved = rec ? await api.put('/sales/' + rec.id, body) : await api.post('/sales', body);
          toast(rec ? 'Alterações salvas.' : 'Venda registrada.', 'ok'); close(); st.sel = saved?.id ?? rec?.id ?? null; load();
        } });
    }
    const patch = async (s, body, msg) => { try { await api.put('/sales/' + s.id, body); toast(msg, 'ok'); await load(); } catch (e) { fail(e); } };
    const removeSale = async (s) => { if (!(await confirmBox(`Excluir "${s.description}"? Esta ação não pode ser desfeita.`, 'Excluir venda'))) return; try { await api.del('/sales/' + s.id); toast('Venda excluída.', 'ok'); st.sel = null; await load(); } catch (e) { fail(e); } };

    // ---- fila
    function drawQueue() {
      const best = items.reduce((m, s) => Math.max(m, s.profit), 0);
      const pill = (s) => { if (s.delivery_status === 'entregue') return h('span', { class: 'sv-pill ok' }, icon('check'), 'Entregue'); if (!s.delivery_date) return h('span', { class: 'sv-pill' }, icon('clock'), 'Sem prazo'); return h('span', { class: 'sv-pill' + (late(s) ? ' bad' : '') }, icon('clock'), late(s) ? 'Atrasada' : day(s.delivery_date)); };
      mount(queue,
        h('header', { class: 'sv-qhead' }, h('div', h('small', { class: 'k' }, 'FILA DE PROJETOS'), h('h2', st.view === 'todas' ? 'Todas as vendas' : SVIEWS.find((v) => v[0] === st.view)[1]), h('p', 'Projetos recentes, com resultado e prazo no mesmo lugar.')),
          h('div', { class: 'sv-best' }, h('small', 'Maior lucro da carteira'), h('b', money(best)))),
        !items.length ? (none()
          ? h('div', { class: 'emptyart withglyph' }, h('span', { class: 'bigglyph', 'aria-hidden': 'true' }, 'N'), h('span', { class: 'eico' }, icon('target')), h('b', 'A primeira venda abre o painel.'), canWrite ? 'Registre receita, custo e prazo. A análise financeira nasce automaticamente.' : '', canWrite && h('button', { class: 'btn whitepill', style: 'margin-top:10px', onclick: () => sheet(null) }, '+ Registrar primeira venda'))
          : h('div', { class: 'emptyart' }, h('span', { class: 'eico' }, icon('target')), h('b', 'Nenhum resultado'), 'Nada neste recorte.'))
          : h('div', { class: 'sv-list' }, h('div', { class: 'sv-row head' }, h('i'), h('span', 'Projeto'), h('span', 'Lucro'), h('span', 'Margem'), h('span', 'Entrega'), h('i')),
            items.map((s) => h('button', { type: 'button', class: 'sv-row' + (s.id === st.sel ? ' on' : ''), onclick: () => { st.sel = s.id; drawQueue(); drawPanel(); } },
              h('i', { class: 'sv-ico' }, icon('layers')),
              h('span', { class: 'sv-name' }, h('b', s.description, s.id === st.sel && h('em', 'SELECIONADO')), h('small', `${s.client_name || 'Projeto independente'} · ${s.project_type || 'Site institucional'}`)),
              h('strong', { class: 'sv-n' }, money(s.profit)), h('strong', { class: 'sv-n' }, `${Math.round(Number(s.margin) || 0)}%`), pill(s), h('i', { class: 'sv-go' }, '›')))));
    }

    // ---- projeto selecionado
    function drawPanel() {
      const s = items.find((x) => x.id === st.sel);
      if (!s) return mount(panel, h('div', { class: 'sv-none' }, h('i', { class: 'sv-ico' }, icon('layers')), h('b', 'Nenhum projeto selecionado'), h('small', 'Escolha uma venda na fila para ver o resultado e a entrega.')));
      const m = Math.max(0, Math.min(100, Number(s.margin) || 0)); const R = 44; const C = 2 * Math.PI * R;
      const NS = 'http://www.w3.org/2000/svg'; const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
      const ring = mk('svg', { viewBox: '0 0 110 110', class: 'sv-ring' }); ring.append(mk('circle', { cx: 55, cy: 55, r: R, class: 'bg' }), mk('circle', { cx: 55, cy: 55, r: R, class: 'fg', 'stroke-dasharray': `${(C * m) / 100} ${C}`, transform: 'rotate(-90 55 55)' }));
      const amount = Number(s.amount) || 1; const bar = (v, cls) => h('i', { class: 'sv-bar ' + cls }, h('b', { style: `width:${Math.max(v > 0 ? 3 : 0, Math.min(100, (v / amount) * 100))}%` }));
      const tile = (ic, l, v) => h('div', { class: 'sv-tile' }, h('small', icon(ic), l), h('b', v));
      mount(panel,
        h('div', { class: 'sv-top' }, h('small', { class: 'k' }, 'PROJETO SELECIONADO'), canWrite && h('button', { type: 'button', class: 'sv-edit', onclick: () => sheet(s) }, icon('pencil'), 'Editar'),
          h('h2', s.description), h('p', `${s.client_name || 'Projeto independente'} · ${s.project_type || 'Site institucional'}`),
          h('div', { class: 'sv-hero' }, h('div', { class: 'sv-donut' }, ring, h('div', h('b', `${Math.round(m)}%`), h('small', 'margem'))),
            h('div', h('small', 'Lucro deste projeto'), h('strong', money(s.profit)), h('span', { class: 'sv-pill' + (late(s) ? ' bad' : s.delivery_status === 'entregue' ? ' ok' : '') }, icon(s.delivery_status === 'entregue' ? 'check' : 'clock'), s.delivery_status === 'entregue' ? 'Entregue' : s.delivery_date ? (late(s) ? 'Atrasada · ' : '') + day(s.delivery_date) : 'Sem prazo')))),
        h('div', { class: 'sv-body' },
          h('small', { class: 'k' }, 'RESUMO FINANCEIRO'), h('div', { class: 'sv-fh' }, h('b', 'Como o lucro foi formado'), h('small', 'Receita − custo = lucro')),
          h('div', { class: 'sv-fin' }, h('div', h('span', 'Receita bruta'), h('b', money(s.amount)), bar(s.amount, 'a')), h('div', h('span', 'Custo de produção'), h('b', money(s.cost)), bar(s.cost, 'c')), h('div', h('span', 'Lucro líquido'), h('b', money(s.profit)), bar(Math.max(0, s.profit), 'l'))),
          h('div', { class: 'sv-tiles' }, tile('user', 'Cliente', s.client_name || 'Independente'), tile('layers', 'Tipo', s.project_type || 'Site institucional'), tile('check', 'Venda', day(s.sold_at)), tile('calendar', 'Prazo de entrega', s.delivery_date ? day(s.delivery_date) : 'Sem data')),
          h('div', { class: 'sv-deliv' }, s.delivery_status === 'entregue'
            ? [h('div', h('b', 'Projeto entregue'), h('small', `Confirmado em ${s.delivered_at ? day(s.delivered_at) : day(String(s.updated_at).slice(0, 10))}`)), canWrite && h('button', { type: 'button', class: 'btn ghost', onclick: () => patch(s, { delivery_status: 'pendente' }, 'Entrega reaberta.') }, icon('check'), ' Reabrir entrega')]
            : [h('div', h('b', 'Entrega pendente'), h('small', 'Confirme quando o projeto estiver nas mãos do cliente.')), canWrite && s.status !== 'cancelado' && h('button', { type: 'button', class: 'btn', onclick: () => patch(s, { delivery_status: 'entregue' }, 'Entrega registrada.') }, icon('check'), ' Marcar como entregue')]),
          h('div', { class: 'sv-reg' }, h('i', { class: 'sv-ico' }, icon('layers')), h('div', h('b', 'Registro financeiro'), h('small', `Criado em ${day(String(s.created_at).slice(0, 10))}`)),
            s.status === 'pendente' && canWrite ? h('button', { type: 'button', class: 'sv-chip warn', onclick: () => patch(s, { status: 'pago' }, 'Venda marcada como paga.') }, 'Pendente · marcar pago') : h('span', { class: 'sv-chip ' + (s.status === 'cancelado' ? 'bad' : 'ok') }, icon('check'), s.status === 'cancelado' ? 'Cancelado' : 'Confirmado')),
          canWrite && h('button', { type: 'button', class: 'sv-del', onclick: () => removeSale(s) }, icon('trash'), 'Excluir esta venda')));
    }

    async function load() {
      const [r, sm] = await Promise.all([api.get('/sales', { q: st.q, view: st.view, limit: 200 }), api.get('/sales/summary', { q: st.q })]);
      items = r.items; summary = sm;
      if (!items.some((x) => x.id === st.sel)) st.sel = items[0]?.id ?? null;
      mount(statsBox, statCard('Faturamento', money(sm.faturamento), [money(sm.pendente), ' a receber']), statCard('Lucro líquido', money(sm.lucro)), statCard('Margem média', sm.margem + '%'), statCard('Ticket médio', money(sm.ticket), `${sm.pagas} paga(s)`));
      mount(bar, h('div', { class: 'lab' }, h('b', 'Organizar projetos'), h('small', 'Escolha uma visão da fila')), pills({ items: SVIEWS, value: st.view, counts: sm.counts, onChange: (v) => { st.view = v; st.sel = null; load(); } }),
        h('div', { class: 'sum' }, h('span', h('b', items.length), ' no recorte'), h('span', { class: 'chip' }, '● ', h('b', sm.atrasadas ?? 0), ' atrasadas')));
      grid.classList.toggle('empty', none()); drawQueue(); drawPanel();
    }

    clients = (await api.get('/clients', { limit: 500 }).catch(() => ({ items: [] }))).items;
    mount(box, hero({ kicker: 'Neva Growth / Result Room', title: 'Projetos que viraram resultado.', subtitle: 'Abra cada venda, entenda a margem e acompanhe o que precisa ser entregue.', art: 'chart', stats: statsBox,
      actions: [canWrite && h('button', { class: 'btn', onclick: () => sheet(null) }, icon('plus'), 'Nova venda')] }), bar, grid);
    grid.append(queue, panel);
    await load();
  }
};
