import { api } from '../api.js';
import { h, mount, toast } from '../ui.js';

export default {
  async render(box, ctx) {
    const st = await api.get('/integrations/status');
    const pf = h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { await api.put('/auth/me', { name: pf.name.value }); toast('Perfil atualizado. Recarregue para ver o nome atualizado.', 'ok'); } catch (x) { toast(x.message, 'err'); } } },
      h('label', { class: 'field' }, h('span', 'Nome'), h('input', { name: 'name', value: ctx.user.name, required: true, minlength: 2 })),
      h('label', { class: 'field' }, h('span', 'E-mail'), h('input', { value: ctx.user.email, disabled: true })), h('div', h('button', { class: 'btn' }, 'Salvar perfil')));
    const pw = h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { await api.put('/auth/me/password', { current: pw.current.value, next: pw.next.value }); pw.reset(); toast('Senha alterada.', 'ok'); } catch (x) { toast(x.message, 'err'); } } },
      h('label', { class: 'field' }, h('span', 'Senha atual'), h('input', { name: 'current', type: 'password', required: true, autocomplete: 'current-password' })),
      h('label', { class: 'field' }, h('span', 'Nova senha (mín. 8 caracteres)'), h('input', { name: 'next', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' })), h('div', h('button', { class: 'btn' }, 'Alterar senha')));
    const integ = (name, desc, s) => h('li', h('div', h('b', name), h('div', { class: 'sm mut' }, desc), !s.configured && h('div', { class: 'sm' }, 'Defina ', h('code', s.envVar), ' no servidor e reinicie.')),
      h('span', { class: 'badge ' + (s.configured ? 'ok' : 'warn') }, s.configured ? 'conectado' : 'não configurado'));
    mount(box, h('div', { class: 'pagehead' }, h('div', h('h1', 'Configurações'), h('p', 'Conta e integrações.'))),
      h('div', { class: 'grid g2' }, h('section', { class: 'card pad stack' }, h('h2', 'Perfil'), pf), h('section', { class: 'card pad stack' }, h('h2', 'Segurança'), pw)),
      h('section', { class: 'card pad', style: 'margin-top:14px' }, h('h2', 'Integrações'),
        h('ul', { class: 'list-plain' }, integ('Anthropic (IA)', 'Assistente da IDE e geração de sites/sistemas com IA.' + (st.ai.model ? ` Modelo: ${st.ai.model}.` : ''), st.ai),
          integ('Google Places', 'Busca de empresas na Prospecção.', st.places)),
        h('p', { class: 'sm mut' }, 'Chaves ficam apenas no servidor (variáveis de ambiente) e nunca são enviadas ao navegador.')));
  }
};
