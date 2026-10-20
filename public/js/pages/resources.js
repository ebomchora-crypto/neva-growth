import { crudPage } from '../crud-page.js';
import { api } from '../api.js';
import { h, mount, brl, dt, fail, toast, money, statCard, icon, confirmBox } from '../ui.js';
import { formSheet } from '../form-sheet.js';

const waIcon = () => { const NS = 'http://www.w3.org/2000/svg'; const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('aria-hidden', 'true'); sv.setAttribute('class', 'waico');
  const pa = document.createElementNS(NS, 'path'); pa.setAttribute('d', 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'); sv.append(pa); return sv; };
const badge = (text, kind = '') => h('span', { class: 'badge ' + kind }, text);

const CSTAGES = [['lead', 'Lead'], ['negociacao', 'Negociação'], ['proposta', 'Proposta enviada'], ['cliente', 'Cliente']];
export const clients = crudPage({
  pageClass: 'pg-compact',
  api: '/clients', singular: 'cliente', title_page: 'Clientes', subtitle: 'Acompanhe relações, avance negociações e veja o resultado de cada cliente.',
  hero: { kicker: 'Neva Growth / Relationship Desk', title: 'Clientes que viram resultado.', art: 'people' }, statsClass: 'sep', emptyMascot: 'vazio-clientes', emptyTitle: 'Sua carteira está vazia', emptyText: 'Cadastre a primeira empresa e comece a vender.', emptyButton: 'Cadastrar cliente', board: { kicker: 'Relationship board', title: 'Sua carteira' },
  below: async ({ canWrite, openNew, setPill }) => {
    const s = await api.get('/clients/summary');
    const rows = [['lead', 'Lead'], ['negociacao', 'Negociação'], ['proposta', 'Proposta enviada'], ['cliente', 'Cliente']].map(([k, l]) => [k, l, s.byStage?.[k] || 0]);
    const max = Math.max(1, ...rows.map((r) => r[2]));
    const next = !s.total ? { t: 'Pronto para começar.', d: 'Cadastre uma empresa para criar sua primeira oportunidade.', b: '+ Novo cliente', go: openNew }
      : s.emNegociacao ? { t: 'Avance as negociações.', d: `${s.emNegociacao} empresa(s) em negociação ou proposta esperando o próximo passo.`, b: 'Ver em negociação', go: () => setPill('negociacao') }
      : s.byStage?.lead ? { t: 'Leads para qualificar.', d: `${s.byStage.lead} empresa(s) ainda como lead. Dê o primeiro retorno.`, b: 'Ver leads', go: () => setPill('lead') }
      : { t: 'Carteira em dia.', d: 'Nenhuma negociação aberta. Cadastre mais empresas ou prospecte novas.', b: '+ Novo cliente', go: openNew };
    return h('div', { class: 'grid g2', style: 'margin-top:16px' },
      h('section', { class: 'card pad pulse' }, h('div', { class: 'k' }, 'Funil / sinal ao vivo'), h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', 'Pulso da carteira'), h('span', { class: 'chip' }, `${s.total} contato(s)`)),
        h('div', { class: 'prows' }, rows.map(([k, l, n]) => h('button', { type: 'button', class: 'prow', onclick: () => setPill(k), title: `Filtrar: ${l}` }, h('span', { class: 'pdot ' + k }), h('span', l), h('i', { class: 'pbar' }, h('b', { style: `width:${(n / max) * 100}%` })), h('strong', String(n))))),
        h('button', { type: 'button', class: 'btn ghost', style: 'width:100%;margin-top:6px', onclick: () => setPill('') }, 'Ver carteira completa')),
      h('section', { class: 'next' }, h('div', { class: 'k' }, 'Próximo movimento'), h('h2', next.t), h('p', next.d), canWrite || !next.go ? h('button', { type: 'button', class: 'btn whitepill big', onclick: next.go }, next.b) : null));
  },
  sheet: ({ rec, reload, remove }) => formSheet({
    danger: rec && remove ? { label: 'Excluir cliente', run: () => remove(rec) } : null,
    kicker: 'Neva Growth / Novo contato', title: rec ? 'Editar cliente.' : 'Registrar cliente.', subtitle: 'Centralize a identidade, o relacionamento e os canais digitais do cliente.', ic: 'userplus',
    values: { ...rec, stage: rec?.stage || 'lead' }, submit: rec ? 'Salvar alterações' : 'Salvar cliente', foot: 'O contato ficará disponível para vendas e projetos.', ic2: 'userplus',
    sections: [
      { title: 'Identidade', sub: 'Quem é o contato e qual empresa ele representa.', cols: 2, fields: [{ k: 'name', l: 'Nome', ic: 'user', ph: 'Ex.: Mariana Costa', req: true, max: 120 }, { k: 'company', l: 'Empresa', ic: 'building', ph: 'Ex.: Clínica Nova Era', max: 120 }] },
      { title: 'Relacionamento', sub: 'Defina o canal principal e o momento comercial.', cols: 2, fields: [{ k: 'phone', l: 'WhatsApp', ic: 'phone', ph: '(11) 99999-9999', max: 40 },
        { k: 'stage', l: 'Status', ic: 'trend', type: 'select', opts: [['lead', 'Lead', 'Contato recém-adicionado'], ['negociacao', 'Negociação', 'Conversa comercial em andamento'], ['proposta', 'Proposta enviada', 'Aguardando retorno do cliente'], ['cliente', 'Cliente', 'Projeto fechado']] }] },
      { title: 'Presença digital', sub: 'Links úteis para acompanhar e entregar o projeto.', cols: 3, fields: [{ k: 'github', l: 'GitHub', ic: 'github', opt: true, ph: 'github.com/usuario/projeto' }, { k: 'site_url', l: 'Site publicado', ic: 'globe', opt: true, ph: 'empresa.com.br' }, { k: 'vercel_url', l: 'Vercel', ic: 'rocket', opt: true, ph: 'projeto.vercel.app' }] }],
    onSubmit: async (d, close) => {
      const body = { ...d }; for (const k of ['company', 'phone', 'github', 'site_url', 'vercel_url']) if (body[k] === '') body[k] = null;
      if (rec) await api.put('/clients/' + rec.id, body); else await api.post('/clients', body);
      toast(rec ? 'Alterações salvas.' : 'Cliente registrado.', 'ok'); close(); reload();
    } }),
  renderRows: (items, { reload, canWrite, openForm, remove }) => {
    const abs = (u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);
    const since = (d) => new Date(String(d).replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    const chan = (c, k, ic, l) => c[k] ? h('a', { class: 'dg on', href: abs(c[k]), target: '_blank', rel: 'noopener', title: l, 'aria-label': l }, icon(ic)) : h('span', { class: 'dg', title: l + ' (não informado)' }, icon(ic));
    // Excluir da carteira: um por vez (lixeira na linha) ou vários (caixas de seleção). Vendas e projetos continuam, só perdem o vínculo com o cliente.
    const sel = new Set();
    const bar = h('div', { class: 'selbar' }); const boxes = [];
    const note = 'As vendas continuam no financeiro e os projetos continuam em Sites, sem o vínculo com o cliente.';
    async function wipe(list, label) {
      if (!(await confirmBox(`Excluir ${label} da carteira? ${note} Esta ação não pode ser desfeita.`))) return;
      let ok = 0; for (const c of list) { try { await api.del('/clients/' + c.id); ok++; } catch (e) { fail(e); } }
      if (ok) toast(ok === 1 ? 'Cliente excluído.' : `${ok} clientes excluídos.`, 'ok'); reload();
    }
    const drawBar = () => { const all = items.length && sel.size === items.length; boxes.forEach((b) => { b.checked = sel.has(Number(b.dataset.id)); });
      mount(bar, canWrite && h('label', { class: 'selall' }, h('input', { type: 'checkbox', checked: all, 'aria-label': 'Selecionar todos', onchange: (e) => { sel.clear(); if (e.target.checked) items.forEach((c) => sel.add(c.id)); drawBar(); } }), sel.size ? `${sel.size} selecionado${sel.size === 1 ? '' : 's'}` : 'Selecionar todos'),
        canWrite && sel.size > 0 && h('button', { type: 'button', class: 'btn danger sm', onclick: () => wipe(items.filter((c) => sel.has(c.id)), sel.size === 1 ? 'o cliente selecionado' : `os ${sel.size} clientes selecionados`) }, icon('trash'), 'Excluir selecionados')); };
    const rows = h('div', { class: 'crows' }, bar, h('div', { class: 'crow head' }, ['Empresa', 'Contato', 'Estágio', 'Entrega digital', 'Resultado'].map((t, i) => h('span', { class: i === 4 ? 'right' : '' }, t))),
      items.map((c) => {
        const name = c.company || c.name; const n = ['github', 'vercel_url', 'site_url'].filter((k) => c[k]).length;
        const box = canWrite ? h('input', { type: 'checkbox', class: 'csel', 'data-id': String(c.id), 'aria-label': `Selecionar ${name}`, onchange: (e) => { if (e.target.checked) sel.add(c.id); else sel.delete(c.id); drawBar(); } }) : null; if (box) boxes.push(box);
        return h('div', { class: 'crow' },
          h('div', { class: 'ccell co' }, box, h('i', { class: 'cav' }, name.trim()[0]?.toUpperCase() || '?'), h('div', h('b', name), h('small', `${c.projects_count} projeto${c.projects_count === 1 ? '' : 's'} · desde ${since(c.created_at)}`))),
          h('div', { class: 'ccell ct' }, h('span', { class: 'wa', title: 'WhatsApp' }, waIcon()), h('div', h('b', c.name), h('small', c.phone || '—'))),
          h('div', { class: 'ccell st' }, h('div', { class: 'cstage' }, h('select', { 'aria-label': 'Estágio', disabled: !canWrite, onchange: async (e) => { try { await api.put('/clients/' + c.id, { stage: e.target.value }); toast('Estágio atualizado.', 'ok'); reload(); } catch (x) { fail(x); reload(); } } },
            CSTAGES.map(([k, l]) => h('option', { value: k, selected: c.stage === k }, l))), h('i', { class: 'fs-chev', 'aria-hidden': 'true' }))),
          h('div', { class: 'ccell dgc' }, h('div', { class: 'dgrow' }, chan(c, 'github', 'github', 'GitHub'), chan(c, 'vercel_url', 'rocket', 'Vercel'), chan(c, 'site_url', 'globe', 'Site publicado'), h('small', `${n}/3`))),
          h('div', { class: 'ccell rs' }, h('b', money(c.total_profit)), canWrite ? h('div', { class: 'racts' }, h('button', { type: 'button', class: 'dossie', onclick: () => openForm(c) }, 'Abrir dossiê ', icon('arrow')),
            h('button', { type: 'button', class: 'cdel', title: 'Excluir da carteira', 'aria-label': `Excluir ${name} da carteira`, onclick: () => wipe([c], `"${name}"`) }, icon('trash'))) : null));
      }));
    drawBar(); return rows;
  },
  title: (c) => c.name, searchPlaceholder: 'Buscar cliente, empresa ou telefone…',
  stats: async () => { const s = await api.get('/clients/summary'); return [statCard('Clientes cadastrados', s.total, 'na sua carteira', 'users'), statCard('Em negociação', s.emNegociacao, 'oportunidades abertas', 'trend'),
    statCard('Clientes ativos', s.fechados, `${s.conversao}% de conversão`, 'check'), statCard('Receita gerada', money(s.receita), `${s.vendasPagas} venda(s) registrada(s)`, 'building')]; },
  pills: { variant: 'board', param: 'stage', default: '', items: [['', 'Todos'], ...CSTAGES], counts: async () => { const s = await api.get('/clients/summary'); return { '': s.total, ...s.byStage }; } },
  fields: [
    { k: 'name', l: 'Nome', req: true }, { k: 'company', l: 'Empresa' }, { k: 'email', l: 'E-mail', type: 'email' },
    { k: 'phone', l: 'Telefone' }, { k: 'stage', l: 'Estágio', type: 'select', opts: CSTAGES, default: 'lead' }, { k: 'document', l: 'CPF/CNPJ' },
    { k: 'address', l: 'Endereço', wide: true }, { k: 'notes', l: 'Observações', type: 'textarea', wide: true }
  ],
  columns: [
    { k: 'name', l: 'Empresa', render: (c) => h('div', h('b', c.name), c.company && h('div', { class: 'sm mut' }, c.company)) },
    { l: 'Contato', render: (c) => h('div', c.email || '—', h('div', { class: 'sm mut' }, c.phone || '')) },
    { k: 'stage', l: 'Estágio', render: (c) => badge(CSTAGES.find((x) => x[0] === c.stage)?.[1] || c.stage, c.stage === 'cliente' ? 'ok' : '') },
    { l: 'Entrega digital', render: (c) => {
      const links = [['github', 'GitHub'], ['site_url', 'Site'], ['vercel_url', 'Vercel']].filter(([k]) => c[k]);
      const abs = (u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);
      return h('div', links.length ? h('span', links.map(([k, l]) => h('a', { class: 'sm', style: 'margin-right:8px', href: abs(c[k]), target: '_blank', rel: 'noopener' }, l))) : null,
        c.projects_count ? h('a', { href: '#/sites', class: 'sm' }, `${c.projects_count} site(s)`) : (!links.length && h('span', { class: 'mut' }, '—')), h('div', { class: 'sm mut' }, `${links.length + (c.projects_count ? 1 : 0)}/3`)); } },
    { l: 'Resultado', right: true, render: (c) => h('div', money(c.total_profit), h('div', { class: 'sm mut' }, `${c.sales_count} venda(s)`)) }
  ],
  exportCols: [['name', 'nome'], ['company', 'empresa'], ['email', 'email'], ['phone', 'telefone'], ['stage', 'estagio'], ['total_paid', 'total_pago'], ['total_profit', 'lucro']].map(([k, l]) => ({ k, l }))
});

export const tasks = crudPage({
  api: '/tasks', singular: 'tarefa', title_page: 'Tarefas', subtitle: 'Acompanhamentos e próximos passos da equipe.', hero: { kicker: 'Neva Growth / Rotina', title: 'Tarefas que andam.', art: 'tasks' },
  title: (t) => t.title, filters: [{ k: 'done', l: 'Situação', opts: [['0', 'Abertas'], ['1', 'Concluídas']] }, { k: 'priority', l: 'Prioridade', opts: ['baixa', 'media', 'alta'] }],
  fields: [
    { k: 'title', l: 'Título', req: true, wide: true }, { k: 'due_date', l: 'Prazo', type: 'date' },
    { k: 'priority', l: 'Prioridade', type: 'select', opts: [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']], default: 'media' },
    { k: 'lead_id', l: 'Lead relacionado', lookup: { url: '/leads', label: (l) => l.name } },
    { k: 'assignee_id', l: 'Responsável', lookup: { url: '/users/options', label: (u) => u.name } },
    { k: 'notes', l: 'Notas', type: 'textarea', wide: true }
  ],
  columns: [
    { l: '', render: (t, { reload, user }) => h('input', { type: 'checkbox', checked: !!t.done, disabled: user.role === 'viewer', 'aria-label': 'Concluir',
      onchange: async (e) => { try { await api.put('/tasks/' + t.id, { done: e.target.checked }); reload(); } catch (x) { fail(x); e.target.checked = !e.target.checked; } } }) },
    { k: 'title', l: 'Tarefa', render: (t) => h('span', { style: t.done ? 'text-decoration:line-through;color:var(--mut)' : '' }, t.title) },
    { k: 'due_date', l: 'Prazo', render: (t) => {
      const late = t.due_date && !t.done && t.due_date < new Date().toISOString().slice(0, 10);
      return h('span', { class: late ? 'err-text' : '' }, dt(t.due_date), late ? ' · atrasada' : '');
    } },
    { k: 'priority', l: 'Prioridade', render: (t) => badge(t.priority, t.priority === 'alta' ? 'bad' : t.priority === 'media' ? 'warn' : '') },
    { k: 'lead_name', l: 'Lead' }, { k: 'assignee_name', l: 'Responsável' }
  ]
});

export const products = crudPage({
  api: '/products', singular: 'produto', title_page: 'Produtos e serviços', subtitle: 'Catálogo usado nas vendas.', hero: { kicker: 'Neva Growth / Catálogo', title: 'Produtos e serviços.', art: 'products' },
  title: (p) => p.name, filters: [{ k: 'type', l: 'Tipo', opts: [['servico', 'Serviço'], ['produto', 'Produto'], ['assinatura', 'Assinatura'], ['curso', 'Curso']] }],
  fields: [
    { k: 'name', l: 'Nome', req: true }, { k: 'type', l: 'Tipo', type: 'select', opts: [['servico', 'Serviço'], ['produto', 'Produto'], ['assinatura', 'Assinatura'], ['curso', 'Curso']] },
    { k: 'price', l: 'Preço (R$)', type: 'number', req: true, default: 0 }, { k: 'active', l: 'Ativo', type: 'checkbox', default: 1 },
    { k: 'description', l: 'Descrição', type: 'textarea', wide: true }
  ],
  columns: [{ k: 'name', l: 'Nome' }, { k: 'type', l: 'Tipo', render: (p) => badge(p.type) }, { k: 'price', l: 'Preço', right: true, render: (p) => money(p.price) },
    { k: 'active', l: 'Situação', render: (p) => badge(p.active ? 'ativo' : 'inativo', p.active ? 'ok' : '') }]
});

export const users = crudPage({
  api: '/users', singular: 'usuário', title_page: 'Usuários', subtitle: 'Gerencie acessos e perfis da equipe.', csv: false, hero: { kicker: 'Neva Growth / Equipe', title: 'Quem faz a Neva acontecer.', art: 'users' },
  title: (u) => u.email, canDelete: (u, me) => u.id !== me.id,
  fields: [
    { k: 'name', l: 'Nome', req: true }, { k: 'email', l: 'E-mail', type: 'email', req: true, createOnly: true },
    { k: 'password', l: 'Senha (mín. 8) — em branco mantém', type: 'password', reqCreate: true },
    { k: 'role', l: 'Perfil', type: 'select', opts: [['admin', 'Administrador'], ['member', 'Membro'], ['viewer', 'Somente leitura']], default: 'member' },
    { k: 'plan', l: 'Plano', type: 'select', opts: [['member', 'Member'], ['creator', 'Creator'], ['elite', 'Elite']], default: 'member' },
    { k: 'credits', l: 'Créditos de prospecção', type: 'number', default: 100 },
    { k: 'active', l: 'Ativo', type: 'checkbox', default: 1 }
  ],
  columns: [{ k: 'name', l: 'Nome' }, { k: 'email', l: 'E-mail' }, { k: 'plan', l: 'Plano', render: (u) => badge(u.plan) }, { k: 'credits', l: 'Créditos', right: true }, { k: 'role', l: 'Perfil', render: (u) => badge({ admin: 'Administrador', member: 'Membro', viewer: 'Leitura' }[u.role]) },
    { k: 'active', l: 'Situação', render: (u) => badge(u.active ? 'ativo' : 'desativado', u.active ? 'ok' : 'bad') }]
});
