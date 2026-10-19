import { api } from '../api.js';
import { h, mount, modal, fieldEl, readForm, toast, fail, hero, icon, mascotImg, copyText, dt } from '../ui.js';

const TIER = { 1: 'PORTA DE ENTRADA', 2: 'CÍRCULO DE CRIAÇÃO', 3: 'CÍRCULO ELITE' };

export default {
  async render(box, ctx) {
    const me = await api.get('/me'); const isAdmin = ctx.user.role === 'admin';
    const cur = me.plan; const plans = me.plans;
    const full = (p) => `Neva ${p.name}`;
    const higher = plans.filter((p) => p.rank > cur.rank);
    const keyInput = h('input', { placeholder: 'Cole sua key aqui', 'aria-label': 'Sua key', autocomplete: 'off', spellcheck: 'false' });
    const activate = h('button', { type: 'button', class: 'mk-go', onclick: async () => {
      if (!keyInput.value.trim()) { keyInput.focus(); return; }
      activate.disabled = true;
      try { const r = await api.post('/me/redeem', { code: keyInput.value }); toast(`Acesso ${full(r.plan)} ativado!`, 'ok'); await ctx.reloadMe?.(); this.render(box, ctx); }
      catch (e) { fail(e); activate.disabled = false; }
    } }, 'Ativar acesso', icon('arrow'));
    function editPlan(p) {
      const defs = [{ k: 'name', l: 'Nome', req: true }, { k: 'tagline', l: 'Subtítulo' }, { k: 'benefits', l: 'Benefícios (um por linha)', type: 'textarea', rows: 5, wide: true }];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, p[d.k])));
      modal({ title: `Editar plano ${p.name}`, size: 'lg', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => { if (!f.reportValidity()) return false; await api.put('/me/plans/' + p.key, readForm(f, defs)); toast('Plano atualizado.', 'ok'); close(); this.render(box, ctx); } }] });
    }
    const planCard = (p) => {
      const mine = p.key === cur.key; const above = p.rank > cur.rank;
      return h('article', { class: `mc t${Math.min(3, p.rank)}` + (mine ? ' cur' : '') },
        h('div', { class: 'mc-art' }, h('small', 'NEVA GROWTH'), h('em', 'MEMBERS CLUB'), h('span', { class: 'mc-no' }, `0${p.rank} / ${TIER[p.rank] || (p.tagline || '').toUpperCase()}`), h('b', full(p)), h('i', { class: 'mc-deco', 'aria-hidden': 'true' })),
        h('div', { class: 'mc-body' },
          h('div', { class: 'mc-kick' }, h('span', `0${p.rank} / ${TIER[p.rank] || (p.tagline || '').toUpperCase()}`), h('span', { class: mine ? 'on' : '' }, mine ? 'SEU CARTÃO' : above ? 'ACESSO RESERVADO' : 'INCLUÍDO NO SEU PLANO')),
          h('h2', full(p)), h('p', p.tagline || ''),
          h('ul', (p.benefits || '').split('\n').filter(Boolean).map((b) => h('li', icon('check'), b))),
          mine ? h('div', { class: 'mc-now' }, h('i'), 'Seu acesso atual')
            : above ? h('button', { type: 'button', class: 'mk-go wide', onclick: () => { toast('Pagamentos em breve. Por enquanto, ative com uma key de acesso.', 'ok'); keyInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); keyInput.focus(); } }, icon('lock'), `Conhecer ${full(p)}`, icon('arrow')) : null,
          isAdmin && h('button', { type: 'button', class: 'mc-edit', onclick: () => editPlan.call({ render: this.render }, p) }, 'Editar plano')));
    };

    // Admin: gerar keys e ver as últimas
    const adminBox = h('section', { class: 'card pad stack mk-admin' });
    async function drawAdmin() {
      if (!isAdmin) return;
      const sel = h('select', { 'aria-label': 'Plano da key' }, plans.filter((p) => p.rank > 1).map((p) => h('option', { value: p.key }, full(p)))); const qty = h('input', { type: 'number', min: 1, max: 20, value: 1, 'aria-label': 'Quantidade', style: 'width:80px' });
      let rows = []; try { rows = await api.get('/me/keys'); } catch { /* ok */ }
      mount(adminBox, h('div', { class: 'k' }, 'Painel do administrador'), h('h2', 'Keys de acesso'),
        h('div', { class: 'row' }, sel, qty, h('button', { type: 'button', class: 'btn', onclick: async () => { try { const r = await api.post('/me/keys', { plan: sel.value, count: Number(qty.value) || 1 }); copyText(r.codes.join('\n'), `${r.codes.length} key(s) gerada(s) e copiada(s).`); drawAdmin(); } catch (e) { fail(e); } } }, 'Gerar keys')),
        rows.length ? h('div', { class: 'tablewrap' }, h('table', h('thead', h('tr', ['Key', 'Plano', 'Criada', 'Situação'].map((t) => h('th', t)))),
          h('tbody', rows.map((k) => h('tr', h('td', h('code', k.code), ' ', h('button', { class: 'btn ghost sm', onclick: () => copyText(k.code, 'Key copiada.') }, 'Copiar')), h('td', k.plan), h('td', dt(String(k.created_at).slice(0, 10))), h('td', k.used_at ? `Resgatada por ${k.used_by_name || '—'}` : 'Disponível'))))))
          : h('p', { class: 'sm mut', style: 'margin:0' }, 'Nenhuma key gerada ainda.'));
    }

    mount(box, hero({ kicker: h('a', { class: 'mk-back', href: '#/dashboard' }, '← Voltar à central'), title: 'Seu lugar dentro da Neva Growth.', art: 'membership', subtitle: null,
      stats: h('div', { class: 'mk-pill' }, h('i'), h('div', h('b', 'ASSOCIAÇÃO ATIVA'), h('small', 'Acesso concedido pela Neva Growth')), h('span', 'SEU CARTÃO'), h('strong', full(cur))) }),
      h('div', { class: 'mplans' }, plans.map(planCard)),
      h('div', { class: 'mk-info' }, h('span', h('b', String(me.user.credits)), ' créditos de prospecção'), h('a', { href: '#/configuracoes' }, 'Ver meu uso')),
      h('section', { class: 'mk-key' }, h('div', h('small', 'ACESSO CONCEDIDO / NEVA GROWTH'), h('h2', 'Tem uma key de acesso?'), h('p', 'Ative sua credencial nesta conta e entre no próximo nível da Neva Growth. Cada código é pessoal e pode ser resgatado uma única vez.'), h('span', { class: 'mk-shield' }, icon('shield'), 'Resgate protegido · vinculado à sua conta')),
        h('div', { class: 'mk-box' }, h('small', 'SUA KEY'), h('div', { class: 'mk-in' }, icon('lock'), keyInput, activate), h('small', { class: 'mk-hint' }, higher.length ? `Sua conta ${full(cur)} aceita keys ${higher.map(full).join(' ou ')}.` : 'Você já está no plano mais alto.'))),
      h('p', { class: 'mk-foot' }, 'Acesso pessoal e vinculado à sua conta Neva Growth. O plano é liberado na hora, ao ativar a key.'), adminBox);
    drawAdmin();
  }
};
