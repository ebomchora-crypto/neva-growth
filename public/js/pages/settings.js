import { api } from '../api.js';
import { h, mount, toast, fail, fieldEl, readForm, dtt, confirmBox, downloadFile, icon } from '../ui.js';
import { applyPrivacy } from '../app.js';
import { motionEnabled, setMotion } from '../motion.js';

// [chave, rótulo, subtítulo, ícone, título da seção, descrição]
const SECTIONS = [
  ['perfil', 'Meu perfil', 'Identidade e contato', 'user', ['Seu ', 'perfil'], 'Defina como você aparece na Neva Growth e cuide do seu acesso.'],
  ['seguranca', 'Segurança', 'Senha e sessões', 'shield', ['Sua ', 'segurança'], 'Troque a senha e controle onde a sua conta está aberta.'],
  ['notificacoes', 'Notificações', 'Alertas de vendas', 'bell', ['Seus ', 'alertas'], 'Escolha o que aparece no sino do topo.'],
  ['privacidade', 'Privacidade', 'Valores no painel', 'eye', ['Sua ', 'privacidade'], 'Esconda valores e ajuste os efeitos visuais deste navegador.'],
  ['crm', 'CRM', 'Prospecção e funil', 'kanban', ['Seu ', 'CRM'], 'Valores padrão da Prospecção e as etapas do seu funil.'],
  ['plano', 'Meu plano', 'Acesso e benefícios', 'card', ['Seu ', 'plano'], 'O que o seu plano libera e quanto você já usou neste mês.'],
  ['integracoes', 'Integrações', 'IA e prospecção', 'gridplus', ['Suas ', 'integrações'], 'Serviços conectados ao servidor que alimentam a IA e a Prospecção.'],
  ['dados', 'Dados', 'Exportação e backup', 'box', ['Seus ', 'dados'], 'Leve uma cópia do que é seu.']
];

export default {
  async render(box, ctx) {
    let sec = (location.hash.split('?s=')[1]) || 'perfil'; if (!SECTIONS.some((s) => s[0] === sec)) sec = 'perfil';
    const isAdmin = ctx.user.role === 'admin';
    const [me, integ] = await Promise.all([api.get('/me'), api.get('/integrations/status')]);
    const content = h('div', { class: 'scontent' }); const nav = h('nav', { class: 'snav', 'aria-label': 'Seções' });
    const switchRow = (key, title, desc) => { const cb = h('input', { type: 'checkbox', checked: me.settings[key] === '1', 'aria-label': title, onchange: async () => {
      try { await api.put('/me/settings', { [key]: cb.checked }); me.settings[key] = cb.checked ? '1' : '0'; if (key === 'hide_values') { ctx.me.settings.hide_values = me.settings[key]; applyPrivacy(cb.checked); } toast('Preferência salva.', 'ok'); } catch (e) { fail(e); cb.checked = !cb.checked; } } });
      return h('label', { class: 'switch' }, h('span', h('b', title), h('div', { class: 'sm mut' }, desc)), cb); };
    const card = (n, title, ...kids) => h('section', { class: 'scard stack' }, h('div', { class: 'skick' }, `${String(n).padStart(2, '0')} / ${title.toUpperCase()}`), ...kids);

    const views = {
      async perfil() {
        const defs = [{ k: 'name', l: 'Nome completo', req: true }, { k: 'username', l: 'Nome de usuário', ph: 'seu.usuario' }, { k: 'phone', l: 'Telefone' }];
        const f = h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { await api.put('/me', readForm(f, defs)); toast('Perfil salvo.', 'ok'); ctx.user.name = f.name.value; } catch (x) { fail(x); } } },
          h('div', { class: 'grid g2' }, defs.map((d) => fieldEl(d, me.user[d.k]))),
          h('div', { class: 'sfoot' }, h('span', { class: 'sm mut' }, 'Seu usuário identifica sua conta no painel.'), h('button', { class: 'btn' }, 'Salvar perfil', h('i', { class: 'bico' }, icon('arrow')))));
        const ef = h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { const r = await api.put('/me/email', { email: ef.email.value, password: ef.password.value }); toast('E-mail de acesso alterado.', 'ok'); me.user.email = r.user.email; ctx.user.email = r.user.email; views.render('perfil'); } catch (x) { fail(x); } } },
          h('div', { class: 'srow' }, h('span', me.user.email), h('span', { class: 'badge ok' }, 'Atual')),
          h('div', { class: 'grid g2' }, h('label', { class: 'field' }, h('span', 'Novo e-mail'), h('input', { name: 'email', type: 'email', required: true, placeholder: 'novo@email.com', autocomplete: 'email' })),
            h('label', { class: 'field' }, h('span', 'Senha atual'), h('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password' }))),
          h('div', { class: 'sfoot' }, h('span', { class: 'sm mut' }, 'Confirme com a sua senha atual. A mudança vale na hora e você passa a entrar com o novo e-mail.'), h('button', { class: 'btn ghost' }, 'Alterar e-mail')));
        return h('div', { class: 'stack' }, card(1, 'Identidade', f), card(2, 'Acesso', h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon('mail')), h('div', h('b', 'E-mail de acesso'), h('div', { class: 'sm mut' }, 'Para entrar, recuperar sua senha e receber avisos de segurança.'))), ef));
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
      async privacidade() {
        const mcb = h('input', { type: 'checkbox', checked: motionEnabled(), 'aria-label': 'Animações', onchange: () => { setMotion(mcb.checked); toast(mcb.checked ? 'Animações ligadas.' : 'Animações desligadas.', 'ok'); } });
        const sys = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        return h('div', { class: 'stack' }, card(4, 'Privacidade', switchRow('hide_values', 'Ocultar valores no painel', 'Desfoca valores monetários em todas as telas (também pelo ícone de olho no topo). Vale só para a sua conta.')),
          card(4, 'Animações', h('label', { class: 'switch' }, h('span', h('b', 'Animações e efeitos de fundo'), h('div', { class: 'sm mut' }, sys ? 'Seu sistema pede para reduzir movimento, então elas ficam desligadas.' : 'Transições, entradas e fundo animado. Vale só para este navegador. Desligue se o aparelho estiver lento.')), mcb)));
      },
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
        h('p', { class: 'sm mut' }, 'Os dados ficam no banco PostgreSQL do projeto. Faça cópias pelo painel do provedor do banco e use a exportação acima para ter um arquivo seu.')); }
    };
    const cur = () => SECTIONS.findIndex((x) => x[0] === sec);
    const head = h('div', { class: 'shead2' });
    const drawHead = () => { const i = cur(); const [, , , , t, d] = SECTIONS[i]; mount(head, h('div', { class: 'skicker' }, h('span', '/ CONFIGURAÇÕES'), h('b', '/'), h('span', `${String(i + 1).padStart(2, '0')} DE ${String(SECTIONS.length).padStart(2, '0')}`)),
      h('h2', t[0], h('em', t[1] + '.')), h('p', d), h('span', { class: 'sbig', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')), h('div', { class: 'srule' }, h('i'))); };
    views.render = async (key) => { sec = key; drawNav(); drawHead(); try { mount(content, await views[key]()); } catch (e) { mount(content, h('div', { class: 'empty' }, e.message)); } };
    const drawNav = () => mount(nav, h('div', { class: 'snavhead' }, h('span', '/ SUA CONTA'), h('span', 'CONFIGURAÇÕES')), ...SECTIONS.map(([k, l, d, ic]) => h('button', { class: sec === k ? 'on' : '', onclick: () => views.render(k) }, h('i', { class: 'snico' }, icon(ic)), h('span', h('b', l), h('small', d)))),
      h('div', { class: 'snavhead', style: 'margin-top:14px' }, h('span', '/ ATALHOS DE GESTÃO')), ...[['tarefas', 'Tarefas'], ['produtos', 'Produtos'], ['cursos', 'Academia'], ...(isAdmin ? [['usuarios', 'Usuários']] : [])].map(([p2, l]) => h('a', { class: 'snlink', href: '#/' + p2 }, l, h('i', icon('arrow')))));
    const top = h('header', { class: 'shero' }, h('div', { class: 'shl' }, h('div', { class: 'skick2' }, h('i', { class: 'brandmk' }, 'N'), h('span', '/ NEVA GROWTH'), h('span', '/ CENTRAL DA CONTA')),
      h('h1', 'Configurações.'), h('p', 'Seu acesso, sua operação, suas escolhas. Tudo sob o seu controle.')),
      h('div', { class: 'shr', 'aria-hidden': 'true' }, h('b', 'NG', h('em', '/')), h('small', 'SEU SISTEMA'), h('small', 'SOB CONTROLE')),
      h('a', { class: 'sclose', href: '#/dashboard', 'aria-label': 'Fechar configurações', title: 'Fechar' }, icon('x')));
    mount(box, h('div', { class: 'setshell' }, top, h('div', { class: 'settings' }, nav, h('div', { class: 'spane' }, head, content))));
    await views.render(sec);
  }
};
