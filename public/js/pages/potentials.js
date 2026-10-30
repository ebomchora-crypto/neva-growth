// Potenciais: lista rápida de quem pode fechar (nome, telefone, loja e valor). Quando fecha, um clique envia ao CRM.
import { api } from '../api.js';
import { h, mount, icon, brl, modal, confirmBox, toast, fail, pills } from '../ui.js';

const stat = (label, value, hint, ic) => h('div', { class: 'pt-stat' }, h('span', { class: 'pt-sico' }, icon(ic)), h('div', h('small', label), h('b', value), h('em', hint)));

const STATUS = [['aberta', 'Em aberto'], ['enviada', 'Enviadas ao CRM'], ['descartada', 'Descartadas']];
const waLink = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 10 ? `https://wa.me/${d.length <= 11 ? '55' + d : d}` : null; };

export default {
  async render(box) {
    let data = { items: [], counts: { aberta: 0, enviada: 0, descartada: 0 }, open_value: 0 }; let tab = 'aberta'; let busy = false;
    const list = h('div', { class: 'pt-list' }); const stats = h('div', { class: 'pt-stats' }); const tabs = h('div');

    const form = h('form', { class: 'pt-form', autocomplete: 'off', onsubmit: async (e) => {
      e.preventDefault(); if (busy) return;
      const frm = e.currentTarget; const f = frm.elements; const body = { name: f.name.value, phone: f.phone.value, store: f.store.value, value: f.value.value || 0 };
      busy = true; try { await api.post('/potentials', body); frm.reset(); f.name.focus(); toast('Adicionado à lista.'); await load(); } catch (err) { fail(err); } finally { busy = false; }
    } },
      h('label', { class: 'field' }, h('span', 'Nome *'), h('input', { name: 'name', required: true, maxlength: 200, placeholder: 'Maria Souza' })),
      h('label', { class: 'field' }, h('span', 'Telefone'), h('input', { name: 'phone', type: 'tel', inputmode: 'tel', maxlength: 40, placeholder: '(11) 99999-0000' })),
      h('label', { class: 'field' }, h('span', 'Loja'), h('input', { name: 'store', maxlength: 200, placeholder: 'Nome da loja' })),
      h('label', { class: 'field' }, h('span', 'Valor (R$)'), h('input', { name: 'value', type: 'number', min: '0', step: '0.01', inputmode: 'decimal', placeholder: '0,00' })),
      h('button', { class: 'btn pt-add', type: 'submit' }, icon('plus'), 'Adicionar'));

    async function load() { data = await api.get('/potentials'); draw(); }
    async function send(item, link = false) {
      try {
        const out = await api.post(`/potentials/${item.id}/close`, link ? { link: true } : {});
        toast(out.linked ? 'Vinculado ao contato que já estava no CRM e movido para ganho.' : 'Enviado ao CRM como cliente.');
        await load();
      } catch (e) {
        if (e.status === 409 || e.code === 'duplicate') { if (await confirmBox(`${e.message} Quer vincular a este contato em vez de criar outro?`, 'Vincular e enviar')) return send(item, true); return; }
        fail(e);
      }
    }
    function edit(item) {
      const form2 = h('form', { class: 'grid2', autocomplete: 'off' },
        h('label', { class: 'field wide', style: 'grid-column:1/-1' }, h('span', 'Nome *'), h('input', { name: 'name', value: item.name, required: true, maxlength: 200 })),
        h('label', { class: 'field' }, h('span', 'Telefone'), h('input', { name: 'phone', type: 'tel', value: item.phone || '', maxlength: 40 })),
        h('label', { class: 'field' }, h('span', 'Loja'), h('input', { name: 'store', value: item.store || '', maxlength: 200 })),
        h('label', { class: 'field' }, h('span', 'Valor (R$)'), h('input', { name: 'value', type: 'number', min: '0', step: '0.01', value: item.value })));
      const m = modal({ title: 'Editar oportunidade', body: form2, actions: [h('button', { class: 'btn', type: 'button', onclick: async () => {
        const f = form2.elements; try { await api.put(`/potentials/${item.id}`, { name: f.name.value, phone: f.phone.value, store: f.store.value, value: f.value.value || 0 }); m.close(); await load(); } catch (e) { fail(e); } } }, 'Salvar')] });
    }
    const row = (it) => {
      const wa = waLink(it.phone);
      return h('article', { class: 'pt-row' + (it.status !== 'aberta' ? ' done' : '') },
        h('div', { class: 'pt-main' },
          h('b', it.name), h('span', { class: 'pt-meta' }, it.store ? h('span', icon('building'), it.store) : null,
            it.phone ? (wa ? h('a', { href: wa, target: '_blank', rel: 'noopener', title: 'Chamar no WhatsApp' }, icon('phone'), it.phone) : h('span', icon('phone'), it.phone)) : null)),
        h('strong', { class: 'pt-val' }, brl(it.value)),
        h('div', { class: 'pt-acts' },
          it.status === 'aberta' && h('button', { class: 'btn pt-close', type: 'button', onclick: () => send(it) }, icon('check'), 'Fechou → enviar ao CRM'),
          it.status === 'enviada' && h('a', { class: 'btn ghost sm', href: '#/leads' }, 'Ver no CRM'),
          it.status === 'descartada' && h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { try { await api.put(`/potentials/${it.id}`, { status: 'aberta' }); await load(); } catch (e) { fail(e); } } }, 'Reabrir'),
          it.status === 'aberta' && h('button', { class: 'kx-ic', type: 'button', title: 'Editar', 'aria-label': `Editar ${it.name}`, onclick: () => edit(it) }, icon('pencil')),
          it.status === 'aberta' && h('button', { class: 'kx-ic', type: 'button', title: 'Não fechou (descartar)', 'aria-label': `Descartar ${it.name}`, onclick: async () => { try { await api.put(`/potentials/${it.id}`, { status: 'descartada' }); await load(); } catch (e) { fail(e); } } }, icon('archive')),
          it.status !== 'enviada' && h('button', { class: 'kx-ic', type: 'button', title: 'Excluir', 'aria-label': `Excluir ${it.name}`, onclick: async () => { if (await confirmBox(`Excluir ${it.name} da lista?`)) { try { await api.del(`/potentials/${it.id}`); await load(); } catch (e) { fail(e); } } } }, icon('trash'))));
    };
    function draw() {
      mount(stats, stat('Em aberto', String(data.counts.aberta), 'oportunidades na lista', 'target'), stat('Valor em aberto', brl(data.open_value), 'se todas fecharem', 'dollar'), stat('Enviadas ao CRM', String(data.counts.enviada), 'já viraram cliente', 'users'));
      mount(tabs, pills({ items: STATUS, value: tab, counts: data.counts, onChange: (v) => { tab = v; draw(); } }));
      const items = data.items.filter((x) => x.status === tab);
      mount(list, items.length ? items.map(row) : h('div', { class: 'empty' }, h('b', tab === 'aberta' ? 'Nenhuma oportunidade em aberto' : 'Nada por aqui'), tab === 'aberta' ? 'Anote nome, telefone, loja e valor acima. Quando fechar, é só um clique para mandar ao CRM.' : ''));
    }
    mount(box,
      h('header', { class: 'pt-head' }, h('div', h('div', { class: 'k' }, 'Potenciais'), h('h1', 'Quem pode fechar'), h('p', { class: 'mut' }, 'Anote rápido e, se fechar, envie ao CRM com um clique. Só você vê esta lista.'))),
      stats, h('section', { class: 'card pad pt-card' }, form), tabs, list);
    await load();
  }
};
