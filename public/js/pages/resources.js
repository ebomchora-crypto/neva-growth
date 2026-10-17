import { crudPage } from '../crud-page.js';
import { api } from '../api.js';
import { h, brl, dt, fail, toast } from '../ui.js';

const badge = (text, kind = '') => h('span', { class: 'badge ' + kind }, text);

export const clients = crudPage({
  api: '/clients', singular: 'cliente', title_page: 'Clientes', subtitle: 'Base de clientes e histórico de compras.',
  title: (c) => c.name, searchPlaceholder: 'Buscar por nome, empresa, e-mail, telefone…',
  fields: [
    { k: 'name', l: 'Nome', req: true }, { k: 'company', l: 'Empresa' }, { k: 'email', l: 'E-mail', type: 'email' },
    { k: 'phone', l: 'Telefone' }, { k: 'document', l: 'CPF/CNPJ' }, { k: 'address', l: 'Endereço' }, { k: 'notes', l: 'Observações', type: 'textarea', wide: true }
  ],
  columns: [
    { k: 'name', l: 'Nome', render: (c) => h('div', h('b', c.name), c.company && h('div', { class: 'sm mut' }, c.company)) },
    { k: 'email', l: 'E-mail' }, { k: 'phone', l: 'Telefone' },
    { k: 'sales_count', l: 'Vendas', right: true }, { k: 'total_paid', l: 'Total pago', right: true, render: (c) => brl(c.total_paid) }
  ]
});

export const tasks = crudPage({
  api: '/tasks', singular: 'tarefa', title_page: 'Tarefas', subtitle: 'Acompanhamentos e próximos passos da equipe.',
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
  api: '/products', singular: 'produto', title_page: 'Produtos e serviços', subtitle: 'Catálogo usado nas vendas.',
  title: (p) => p.name, filters: [{ k: 'type', l: 'Tipo', opts: [['servico', 'Serviço'], ['produto', 'Produto'], ['assinatura', 'Assinatura'], ['curso', 'Curso']] }],
  fields: [
    { k: 'name', l: 'Nome', req: true }, { k: 'type', l: 'Tipo', type: 'select', opts: [['servico', 'Serviço'], ['produto', 'Produto'], ['assinatura', 'Assinatura'], ['curso', 'Curso']] },
    { k: 'price', l: 'Preço (R$)', type: 'number', req: true, default: 0 }, { k: 'active', l: 'Ativo', type: 'checkbox', default: 1 },
    { k: 'description', l: 'Descrição', type: 'textarea', wide: true }
  ],
  columns: [{ k: 'name', l: 'Nome' }, { k: 'type', l: 'Tipo', render: (p) => badge(p.type) }, { k: 'price', l: 'Preço', right: true, render: (p) => brl(p.price) },
    { k: 'active', l: 'Situação', render: (p) => badge(p.active ? 'ativo' : 'inativo', p.active ? 'ok' : '') }]
});

export const sales = crudPage({
  api: '/sales', singular: 'venda', title_page: 'Vendas', subtitle: 'Receita registrada e pendências de pagamento.',
  title: (s) => s.description, filters: [{ k: 'status', l: 'Status', opts: ['pendente', 'pago', 'cancelado'] }],
  fields: [
    { k: 'description', l: 'Descrição', req: true, wide: true },
    { k: 'client_id', l: 'Cliente', lookup: { url: '/clients', label: (c) => c.name } },
    { k: 'product_id', l: 'Produto', lookup: { url: '/products', label: (p) => `${p.name} — ${brl(p.price)}` } },
    { k: 'amount', l: 'Valor (R$)', type: 'number', req: true }, { k: 'sold_at', l: 'Data', type: 'date', default: new Date().toISOString().slice(0, 10) },
    { k: 'status', l: 'Status', type: 'select', opts: ['pendente', 'pago', 'cancelado'], default: 'pendente' }
  ],
  columns: [
    { k: 'sold_at', l: 'Data', render: (s) => dt(s.sold_at) }, { k: 'description', l: 'Descrição' }, { k: 'client_name', l: 'Cliente' },
    { k: 'amount', l: 'Valor', right: true, render: (s) => brl(s.amount) },
    { k: 'status', l: 'Status', render: (s) => badge(s.status, { pago: 'ok', pendente: 'warn', cancelado: 'bad' }[s.status]) }
  ],
  rowActions: [{ l: 'Marcar pago', show: (s) => s.status === 'pendente', run: async (s, reload) => { await api.put('/sales/' + s.id, { status: 'pago' }); toast('Venda marcada como paga.', 'ok'); reload(); } }]
});

export const users = crudPage({
  api: '/users', singular: 'usuário', title_page: 'Usuários', subtitle: 'Gerencie acessos e perfis da equipe.', csv: false,
  title: (u) => u.email, canDelete: (u, me) => u.id !== me.id,
  fields: [
    { k: 'name', l: 'Nome', req: true }, { k: 'email', l: 'E-mail', type: 'email', req: true, createOnly: true },
    { k: 'password', l: 'Senha (mín. 8) — em branco mantém', type: 'password', reqCreate: true },
    { k: 'role', l: 'Perfil', type: 'select', opts: [['admin', 'Administrador'], ['member', 'Membro'], ['viewer', 'Somente leitura']], default: 'member' },
    { k: 'active', l: 'Ativo', type: 'checkbox', default: 1 }
  ],
  columns: [{ k: 'name', l: 'Nome' }, { k: 'email', l: 'E-mail' }, { k: 'role', l: 'Perfil', render: (u) => badge({ admin: 'Administrador', member: 'Membro', viewer: 'Leitura' }[u.role]) },
    { k: 'active', l: 'Situação', render: (u) => badge(u.active ? 'ativo' : 'desativado', u.active ? 'ok' : 'bad') }]
});
