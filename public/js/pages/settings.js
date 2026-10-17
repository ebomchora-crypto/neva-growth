import { api } from '../api.js';
import { h, mount, toast, fail, fieldEl, readForm, hero, dtt, confirmBox, downloadFile } from '../ui.js';
import { applyPrivacy } from '../app.js';

const SECTIONS = [['perfil', 'Meu perfil', 'Identidade e contato'], ['seguranca', 'Segurança', 'Senha e sessões'], ['notificacoes', 'Notificações', 'Alertas de vendas'], ['privacidade', 'Privacidade', 'Valores no painel'],
  ['crm', 'CRM', 'Prospecção e funil'], ['plano', 'Meu plano', 'Acesso e benefícios'], ['integracoes', 'Integrações', 'IA e prospecção'], ['dados', 'Dados', 'Exportação e backup']];

export default {
  async render(box, ctx) {
    let sec = (location.hash.split('?s=')[1]) || 'perfil'; if (!SECTIONS.some((s) => s[0] === sec)) sec = 'perfil';
    const isAdmin = ctx.user.role === 'admin';
    const [me, integ] = await Promise.all([api.get('/me'), api.get('/integrations/status')]);
    const content = h('div'); const nav = h('nav', { class: 'snav card pad', 'aria-label': 'Seções' });
    const switchRow = (key, title, desc) => { const cb = h('input', { type: 'checkbox', checked: me.settings[key] === '1', 'aria-label': title, onchange: async () => {
      try { await api.put('/me/settings', { [key]: cb.checked }); me.settings[key] = cb.checked ? '1' : '0'; if (key === 'hide_values') { ctx.me.settings.hide_values = me.settings[key]; applyPrivacy(cb.checked); } toast('Preferência salva.', 'ok'); } catch (e) { fail(e); cb.checked = !cb.checked; } } });
      return h('label', { class: 'switch' }, h('span', h('b', title), h('div', { class: 'sm mut' }, desc)), cb); };
    const card = (n, title, ...kids) => h('section', { class: 'card pad stack' }, h('div', { class: 'kicker' }, `${String(n).padStart(2, '0')} / ${title}`), ...kids);

    const views = {
      async perfil() {
        const defs = [{ k: 'name', l: 'Nome completo', req: true }, { k: 'username', l: 'Nome de usuário', ph: 'seu.usuario' }, { k: 'phone', l: 'Telefone' }];
        const f = h('form', { class: 'grid g2', onsubmit: async (e) => { e.preventDefault(); try { await api.put('/me', readForm(f, defs)); toast('Perfil salvo.', 'ok'); ctx.user.name = f.name.value; } catch (x) { fail(x); } } },
          defs.map((d) => fieldEl(d, me.user[d.k])), fieldEl({ k: 'email', l: 'E-mail (não editável)' }, me.user.email), h('div', { style: 'grid-column:1/-1' }, h('button', { class: 'btn' }, 'Salvar perfil')));
        f.email.disabled = true; return card(1, 'Identidade', f, h('p', { class: 'sm mut' }, 'Seu usuário identifica sua conta no painel.'));
      },
      async seguranca() {
        const pw = h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { const r = await api.put('/me/password', { current: pw.current.value, next: pw.next.value }); pw.reset(); toast(`Senha alterada. ${r.endedSessions} outra(s) sessão(ões) encerrada(s).`, 'ok'); views.render('seguranca'); } catch (x) { fail(x); } } },
          h('label', { class: 'field' }, h('span', 'Senha atual'), h('input', { name: 'current', type: 'password', required: true, autocomplete: 'current-password' })),
          h('label', { class: 'field' }, h('span', 'Nova senha (mín. 8 caracteres)'), h('input', { name: 'next', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' })), h('div', h('button', { class: 'btn' }, 'Alterar senha')));
        const sess = await api.get('/me/sessions');
        const list = h('div', sess.map((s) => h('div', { class: 'switch' }, h('span', h('b', s.current ? 'Esta sessão' : 'Outra sessão'), h('div', { class: 'sm mut' }, `${(s.user_agent || 'navegador desconhecido').slice(0, 70)} · ${s.ip || ''} · ${dtt(new Date(s.created_at).toISOString().slice(0, 19).replace('T', ' '))}`)),
          s.current ? h('span', { class: 'badge ok' }, 'atual') : h('button', { class: 'btn danger sm', onclick: async () => { await api.del('/me/sessions/' + s.id); toast('Sessão encerrada.', 'ok'); views.render('seguranca'); } }, 'Encerrar'))));
        return h('div', { class: 'stack' }, card(1, 'Senha', pw), card(2, 'Sessões ativas', list, sess.length > 1 && h('div', h('button', { class: 'btn ghost', onclick: async () => { const r = await api.post('/me/sessions/revoke-others'); toast(`${r.ended} sessão(ões) encerrada(s).`, 'ok'); views.render('seguranca'); } }, 'Encerrar todas as outras'))));
      },
      async notificacoes() { return card(3, 'Notificações', h('p', { class: 'sm mut', style: 'margin:0' }, 'Alertas aparecem no sino do topo (in-app). Você não recebe alertas de ações que você mesmo fez.'),
        switchRow('notify_sales', 'Vendas', 'Vendas pagas e oportunidades conquistadas.'), switchRow('notify_tasks', 'Tarefas', 'Tarefas atribuídas a você por outra pessoa.'), switchRow('notify_leads', 'Leads', 'Novos leads cadastrados por outros usuários.')); },
      async privacidade() { return card(4, 'Privacidade', switchRow('hide_values', 'Ocultar valores no painel', 'Desfoca valores monetários em todas as telas (também pelo ícone de olho no topo). Vale só para a sua conta.')); },
      async crm() {
        const radius = h('input', { type: 'range', min: 1, max: 50, value: me.settings.prospect_radius_km, 'aria-label': 'Raio padrão' }); const rv = h('b', `${me.settings.prospect_radius_km} km`);
        radius.oninput = () => { rv.textContent = radius.value + ' km'; }; radius.onchange = async () => { try { await api.put('/me/settings', { prospect_radius_km: radius.value }); toast('Raio padrão salvo.', 'ok'); } catch (e) { fail(e); } };
        const rating = h('select', { 'aria-label': 'Nota mínima', onchange: async () => { try { await api.put('/me/settings', { prospect_min_rating: rating.value }); toast('Salvo.', 'ok'); } catch (e) { fail(e); } } }, [0, 3, 3.5, 4, 4.5].map((v) => h('option', { value: v, selected: Number(me.settings.prospect_min_rating) === v }, v ? `${v}+ ★` : 'Qualquer nota')));
        const stages = await api.get('/pipeline/stages');
        return h('div', { class: 'stack' }, card(5, 'Prospecção (valores padrão)', h('div', { class: 'range' }, h('span', 'Raio das áreas'), radius, rv), h('label', { class: 'field' }, h('span', 'Nota mínima'), rating), switchRow('prospect_only_no_site', 'Somente empresas sem site', 'Filtra resultados que não têm site no Google.')),
          card(5, 'Etapas do funil', h('ol', stages.map((s) => h('li', `${s.label} `, h('span', { class: 'badge' }, { open: 'aberta', won: 'ganho', lost: 'perda' }[s.kind]), h('span', { class: 'sm mut' }, ` · ${s.leads_count} oportunidade(s)`)))),
            h('a', { class: 'btn ghost', href: '#/leads' }, isAdmin ? 'Editar funil no CRM' : 'Ver no CRM')));
      },
      async plano() { return card(6, 'Meu plano', h('p', h('b', me.plan.name), ' — ', me.plan.tagline), h('ul', (me.plan.benefits || '').split('\n').filter(Boolean).map((b) => h('li', b))), h('div', { class: 'sm mut' }, `IA: ${me.usage.ai.used}/${me.usage.ai.limit} · Builder: ${me.usage.builder.used}/${me.usage.builder.limit} · Créditos de prospecção: ${me.user.credits}`), h('a', { class: 'btn ghost', href: '#/associacao' }, 'Ver planos')); },
      async integracoes() {
        const row = (name, desc, s) => h('div', { class: 'switch' }, h('span', h('b', name), h('div', { class: 'sm mut' }, desc), !s.configured && h('div', { class: 'sm' }, 'Defina ', h('code', s.envVar), ' no servidor e reinicie.')), h('span', { class: 'badge ' + (s.configured ? 'ok' : 'warn') }, s.configured ? 'conectado' : 'não configurado'));
        return card(7, 'Integrações', row('Anthropic (IA)', `Assistente da IDE, Builder, resumos e prompts.${integ.ai.model ? ' Modelo: ' + integ.ai.model + '.' : ''}`, integ.ai), row('Google Places', 'Busca de empresas na Prospecção.', integ.places),
          h('p', { class: 'sm mut' }, 'Chaves ficam apenas no servidor (variáveis de ambiente) e nunca são enviadas ao navegador.'));
      },
      async dados() { return card(8, 'Dados', h('p', 'Exporte uma cópia dos dados do workspace (JSON, sem senhas).'), isAdmin ? h('div', h('button', { class: 'btn', onclick: async () => { try { const r = await fetch('/api/me/export', { credentials: 'same-origin', headers: { 'x-requested-with': 'neva' } }); if (!r.ok) throw new Error((await r.json()).error); downloadFile('neva-export.json', await r.blob()); } catch (e) { fail(e); } } }, 'Exportar dados (JSON)')) : h('div', { class: 'notice info' }, 'Somente administradores podem exportar os dados.'),
        h('p', { class: 'sm mut' }, 'O banco SQLite fica em DATA_DIR/neva.db. Antes de cada migração de esquema é criado um backup automático em DATA_DIR/backups/.')); }
    };
    views.render = async (key) => { sec = key; drawNav(); try { mount(content, await views[key]()); } catch (e) { mount(content, h('div', { class: 'empty' }, e.message)); } };
    const drawNav = () => mount(nav, SECTIONS.map(([k, l, d]) => h('button', { class: sec === k ? 'on' : '', onclick: () => views.render(k) }, h('b', l), h('small', d))));
    mount(box, hero({ kicker: 'Neva Growth / Central da conta', title: 'Configurações.', subtitle: 'Seu acesso, sua operação, suas escolhas. Tudo sob o seu controle.' }), h('div', { class: 'settings' }, nav, content));
    await views.render(sec);
  }
};
