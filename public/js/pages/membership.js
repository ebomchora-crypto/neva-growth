import { api } from '../api.js';
import { h, mount, modal, fieldEl, readForm, toast, hero } from '../ui.js';

export default {
  async render(box, ctx) {
    const me = await api.get('/me'); const isAdmin = ctx.user.role === 'admin';
    const cur = me.plan; const usage = me.usage;
    const bar = (u) => h('div', h('div', { class: 'progress' }, h('i', { style: `width:${u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0}%` })), h('div', { class: 'sm mut' }, `${u.used} usados neste mês · ilimitado`));
    function editPlan(p) {
      const defs = [{ k: 'name', l: 'Nome', req: true }, { k: 'tagline', l: 'Subtítulo' }, { k: 'benefits', l: 'Benefícios (um por linha)', type: 'textarea', rows: 5, wide: true }];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, p[d.k])));
      modal({ title: `Editar plano ${p.name}`, size: 'lg', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => { if (!f.reportValidity()) return false; await api.put('/me/plans/' + p.key, readForm(f, defs)); toast('Plano atualizado.', 'ok'); close(); this.render(box, ctx); } }] });
    }
    mount(box, hero({ kicker: 'Neva Growth / Associação', title: 'Seu lugar dentro da Neva Growth.', art: 'membership', subtitle: 'Planos definem limites de uso e o acesso a recursos da biblioteca. O plano é atribuído por um administrador.' }),
      h('div', { class: 'grid g2', style: 'margin-bottom:14px' },
        h('section', { class: 'card pad stack' }, h('div', { class: 'row' }, h('span', { class: 'badge ok' }, 'Associação ativa'), h('b', `Seu plano: ${cur.name}`)), h('div', { class: 'sm mut' }, cur.tagline), h('h3', 'Uso de IA'), bar(usage.ai), h('h3', 'Builder com IA'), bar(usage.builder)),
        h('section', { class: 'card pad stack' }, h('h3', 'Créditos de prospecção'), h('b', { style: 'font-size:1.8rem' }, me.user.credits), h('div', { class: 'sm mut' }, 'Cada empresa entregue em uma busca da Prospecção consome 1 crédito. Peça a um administrador para ampliar o saldo.'))),
      h('div', { class: 'plans' }, me.plans.map((p) => h('article', { class: 'card plan' + (p.key === cur.key ? ' cur' : '') },
        h('div', { class: 'sm mut' }, `0${p.rank} / ${p.tagline || ''}`), h('h2', p.name), h('ul', (p.benefits || '').split('\n').filter(Boolean).map((b) => h('li', b))),
        h('div', { class: 'sm mut' }, 'IA e Builder: ilimitados'),
        p.key === cur.key ? h('span', { class: 'badge ok' }, 'Seu plano') : p.rank > cur.rank ? h('span', { class: 'badge' }, 'Acesso reservado') : null,
        isAdmin && h('button', { class: 'btn ghost sm', onclick: () => editPlan.call({ render: this.render }, p) }, 'Editar plano')))));
  }
};
