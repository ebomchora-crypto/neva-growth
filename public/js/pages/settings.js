import { api } from '../api.js';
import { h, mount, toast, fail, fieldEl, readForm, dtt, icon } from '../ui.js';
import { motionEnabled, setMotion } from '../motion.js';
import * as push from '../push.js';

const applyPrivacy = (on) => document.documentElement.classList.toggle('hide-values', !!on);

// [chave, rótulo, subtítulo, ícone, título da seção, descrição]
const SECTIONS = [
  ['perfil', 'Meu perfil', 'Identidade e contato', 'user', ['Seu ', 'perfil'], 'Defina como você aparece na Neva Growth e cuide do seu acesso.'],
  ['seguranca', 'Segurança', 'Senha e sessões', 'shield', ['Segurança da ', 'conta'], 'Controle sua senha e sessões sem expor credenciais no painel.'],
  ['notificacoes', 'Notificações', 'Alertas de vendas', 'bell', ['Notificações', ''], 'Receba os alertas importantes para sua operação, nos dispositivos compatíveis.'],
  ['privacidade', 'Privacidade', 'Valores no painel', 'eye', ['Privacidade', ''], 'Escolha o que fica visível quando você abre a dashboard.'],
  ['crm', 'CRM', 'Prospecção e funil', 'kanban', ['CRM e ', 'prospecção'], 'Decida quando os resultados da Prospecção passam a fazer parte do seu funil comercial.'],
  ['plano', 'Meu plano', 'Acesso e benefícios', 'card', ['Plano e ', 'acesso'], 'Veja sua condição atual e gerencie sua experiência como membro.'],
  ['pagamentos', 'Pagamentos', 'Integração de pagamentos', 'wallet', ['Pagamentos', ''], 'Conecte sua conta de pagamentos para trazer recebimentos para a Neva Growth.', true],
  ['suporte', 'Suporte', 'Ajuda e relato de bugs', 'mail', ['Como podemos ', 'ajudar?'], 'Dúvidas, problemas e relatos de bug chegam direto à equipe da Neva Growth.', true]
];

export default {
  async render(box, ctx) {
    let sec = (location.hash.split('?s=')[1]) || 'perfil'; if (!SECTIONS.some((s) => s[0] === sec)) sec = 'perfil';
    const isAdmin = ctx.user.role === 'admin';
    const me = await api.get('/me');
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
        const st = await api.get('/auth/status').catch(() => ({}));
        const pw = h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { const r = await api.put('/me/password', { current: pw.current.value, next: pw.next.value }); pw.reset(); toast(`Senha alterada. ${r.endedSessions} outra(s) sessão(ões) encerrada(s).`, 'ok'); views.render('seguranca'); } catch (x) { fail(x); } } },
          h('div', { class: 'grid g2' }, h('label', { class: 'field' }, h('span', 'Senha atual'), h('input', { name: 'current', type: 'password', required: true, autocomplete: 'current-password' })),
            h('label', { class: 'field' }, h('span', 'Nova senha (mín. 8 caracteres)'), h('input', { name: 'next', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' }))),
          h('div', { class: 'sfoot' }, h('span', { class: 'sm mut' }, 'Ao trocar a senha, as outras sessões abertas são encerradas.'),
            h('div', { class: 'row' }, st.mailConfigured && h('button', { type: 'button', class: 'btn ghost', onclick: async () => { try { await api.post('/auth/forgot', { email: me.user.email }); toast('Enviamos um link de redefinição para o seu e-mail.', 'ok'); } catch (x) { fail(x); } } }, 'Receber link por e-mail'),
              h('button', { class: 'btn' }, 'Alterar senha', h('i', { class: 'bico' }, icon('arrow'))))));
        const sess = await api.get('/me/sessions');
        const when = (s) => dtt(new Date(s.created_at).toISOString().slice(0, 19).replace('T', ' '));
        const last = [...sess].filter((s) => !s.current).sort((x, y) => y.created_at - x.created_at)[0] || sess.find((s) => s.current);
        const others = sess.filter((s) => !s.current);
        const rows = h('div', { class: 'stack' },
          h('div', { class: 'kvrow' }, h('span', 'Último acesso'), h('b', last ? when(last) : '—')),
          h('div', { class: 'kvrow' }, h('span', 'Conexão atual'), h('b', 'Este dispositivo')),
          ...others.map((s) => h('div', { class: 'kvrow' }, h('span', `${(s.user_agent || 'navegador desconhecido').slice(0, 60)} · ${s.ip || ''}`), h('span', { class: 'row' }, h('small', { class: 'mut' }, when(s)),
            h('button', { class: 'btn danger sm', onclick: async () => { await api.del('/me/sessions/' + s.id); toast('Sessão encerrada.', 'ok'); views.render('seguranca'); } }, 'Encerrar')))),
          others.length > 0 && h('div', h('button', { class: 'btn ghost', onclick: async () => { const r = await api.post('/me/sessions/revoke-others'); toast(`${r.ended} sessão(ões) encerrada(s).`, 'ok'); views.render('seguranca'); } }, 'Encerrar outras sessões')),
          h('p', { class: 'sm mut', style: 'margin:0' }, 'Sessões encerradas deixam de funcionar na hora. Se não reconhecer um dispositivo, encerre-o e troque a senha.'),
          h('button', { class: 'slink', onclick: () => document.querySelector('.railbtn')?.click() }, icon('logout'), 'Sair deste dispositivo'));
        const head = (ic, t, d) => h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon(ic)), h('div', h('b', t), h('div', { class: 'sm mut' }, d)));
        const sc = (...kids) => h('section', { class: 'scard stack' }, ...kids);
        return h('div', { class: 'stack' }, sc(head('lock', 'Redefinir senha', 'Escolha uma senha nova confirmando a atual. Use 8 caracteres ou mais, com letras, números e símbolos.'), pw),
          sc(head('shield', 'Sessões e dispositivos', 'Confira seu último acesso e desconecte dispositivos que não reconhece.'), rows),
          sc(head('user', 'Métodos de entrada', 'Provedores vinculados a esta conta.'), h('div', h('span', { class: 'chipm' }, 'E-mail e senha'))));
      },
      async notificacoes() {
        const sup = push.supported(), on = push.enabled(), denied = push.permission() === 'denied';
        const badge = h('span', { class: 'badge ' + (on ? 'ok' : denied || !sup ? 'warn' : '') }, !sup ? 'Indisponível' : denied ? 'Bloqueadas' : on ? 'Ativadas' : 'Desativadas');
        const toggle = h('button', { class: 'btn bigbtn' + (on ? ' ghost' : ''), disabled: !sup, onclick: async () => { try { if (on) { push.disable(); toast('Notificações do aparelho desativadas.', 'ok'); } else { await push.enable(); toast('Notificações ativadas neste aparelho.', 'ok'); push.test(); } views.render('notificacoes'); } catch (e) { fail(e); views.render('notificacoes'); } } }, on ? 'Desativar notificações' : 'Ativar notificações');
        const testBtn = h('button', { class: 'btn ghost bigbtn', disabled: !on, onclick: () => { push.test(); toast('Teste enviado.', 'ok'); } }, 'Enviar teste');
        const head = h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon('bell')), h('div', { style: 'flex:1' }, h('b', 'Notificações no aparelho'), h('div', { class: 'sm mut' }, 'Receba um alerta do sistema, com o mascote da Neva, sempre que chegar um aviso novo (venda paga, tarefa ou lead, conforme as preferências abaixo).')), badge);
        return h('div', { class: 'stack' },
          h('section', { class: 'scard stack' }, head, h('div', { class: 'bigrow' }, toggle, testBtn),
            h('p', { class: 'sm mut', style: 'margin:0' }, sup ? 'Funciona enquanto o Neva estiver aberto em alguma aba do navegador. Vale só para este navegador.' : 'Este navegador não oferece notificações do sistema.')),
          card(2, 'Quais alertas', h('p', { class: 'sm mut', style: 'margin:0' }, 'Alertas aparecem no sino do topo e, se ativado acima, também no aparelho. Você não recebe alertas de ações que você mesmo fez.'),
            switchRow('notify_sales', 'Vendas', 'Vendas pagas e oportunidades conquistadas.'), switchRow('notify_tasks', 'Tarefas', 'Tarefas atribuídas a você por outra pessoa.'), switchRow('notify_leads', 'Leads', 'Novos leads cadastrados por outros usuários.')));
      },
      async privacidade() {
        const mcb = h('input', { type: 'checkbox', checked: motionEnabled(), 'aria-label': 'Animações', onchange: () => { setMotion(mcb.checked); toast(mcb.checked ? 'Animações ligadas.' : 'Animações desligadas.', 'ok'); } });
        const sys = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const hidden = me.settings.hide_values === '1';
        const lbl = h('b', hidden ? 'Valores ocultos' : 'Valores visíveis');
        const hcb = h('input', { type: 'checkbox', checked: hidden, 'aria-label': 'Ocultar valores financeiros', onchange: async () => {
          try { await api.put('/me/settings', { hide_values: hcb.checked }); me.settings.hide_values = hcb.checked ? '1' : '0'; ctx.me.settings.hide_values = me.settings.hide_values; applyPrivacy(hcb.checked); lbl.textContent = hcb.checked ? 'Valores ocultos' : 'Valores visíveis'; toast('Preferência salva.', 'ok'); } catch (e) { fail(e); hcb.checked = !hcb.checked; } } });
        const head = (ic, t, d) => h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon(ic)), h('div', h('b', t), h('div', { class: 'sm mut' }, d)));
        return h('div', { class: 'stack' },
          h('section', { class: 'scard stack' }, head('eye', 'Ocultar valores financeiros', 'Esconde valores de receita, lucro e vendas em todas as telas (também pelo ícone de olho no topo).'),
            h('label', { class: 'switch' }, h('span', lbl, h('div', { class: 'sm mut' }, 'Esta preferência fica salva na sua conta e vale em qualquer navegador.')), hcb),
            h('p', { class: 'sm mut', style: 'margin:0' }, 'Isso protege a visualização em público; não altera seus dados nem substitui sair da conta em computadores compartilhados.')),
          h('section', { class: 'scard stack' }, head('sparkle', 'Animações e efeitos de fundo', 'Transições, entradas e fundos animados.'),
            h('label', { class: 'switch' }, h('span', h('b', 'Animações ligadas'), h('div', { class: 'sm mut' }, sys ? 'Seu sistema pede para reduzir movimento, então elas ficam desligadas.' : 'Vale só para este navegador. Desligue se o aparelho estiver lento.')), mcb)),
          h('details', { class: 'credits' }, h('summary', 'Créditos e licenças'),
            h('ul', [['GSAP', 'animações (licença padrão GreenSock)'], ['Leaflet', 'mapa da Prospecção (BSD-2)'], ['OpenStreetMap', 'dados do mapa © colaboradores do OpenStreetMap (ODbL)'], ['Monaco Editor', 'editor da IDE (MIT)'], ['KokonutUI / 21st.dev', 'componentes de fundo, seletor de modelo, carregamento e revisão de alterações, adaptados para JS puro (MIT)']].map(([n, d]) => h('li', h('b', n), ' — ', d)))));
      },
      async crm() {
        const radius = h('input', { type: 'range', min: 1, max: 50, value: me.settings.prospect_radius_km, 'aria-label': 'Raio padrão' }); const rv = h('b', `${me.settings.prospect_radius_km} km`);
        radius.oninput = () => { rv.textContent = radius.value + ' km'; }; radius.onchange = async () => { try { await api.put('/me/settings', { prospect_radius_km: radius.value }); toast('Raio padrão salvo.', 'ok'); } catch (e) { fail(e); } };
        const rating = h('select', { 'aria-label': 'Nota mínima', onchange: async () => { try { await api.put('/me/settings', { prospect_min_rating: rating.value }); toast('Salvo.', 'ok'); } catch (e) { fail(e); } } }, [0, 3, 3.5, 4, 4.5].map((v) => h('option', { value: v, selected: Number(me.settings.prospect_min_rating) === v }, v === 0 ? 'Qualquer nota' : `${v}+ estrelas`)));
        const stages = await api.get('/pipeline/stages');
        const first = stages.find((x) => x.kind === 'open')?.label || 'Novos contatos';
        const on = me.settings.prospect_auto_import === '1';
        const sub = h('div', { class: 'sm mut' }, on ? `Ligado · novas buscas entram em "${first}"` : 'Desligado · você mantém o controle do funil');
        const acb = h('input', { type: 'checkbox', checked: on, 'aria-label': 'Importar resultados automaticamente', onchange: async () => {
          try { await api.put('/me/settings', { prospect_auto_import: acb.checked }); me.settings.prospect_auto_import = acb.checked ? '1' : '0'; sub.textContent = acb.checked ? `Ligado · novas buscas entram em "${first}"` : 'Desligado · você mantém o controle do funil'; toast('Preferência salva.', 'ok'); } catch (e) { fail(e); acb.checked = !acb.checked; } } });
        const head = (ic, t, d) => h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon(ic)), h('div', h('b', t), h('div', { class: 'sm mut' }, d)));
        const step = (n, t, d) => h('div', { class: 'fstep' }, h('small', n), h('b', t), h('span', d));
        return h('div', { class: 'stack' },
          h('section', { class: 'scard stack' }, head('target', 'Prospecção → CRM', 'Envie automaticamente cada nova busca para a etapa inicial do seu funil.'),
            h('label', { class: 'switch' }, h('span', h('b', 'Importar resultados automaticamente'), sub), acb),
            h('div', { class: 'flow' }, step('01', 'BUSCA', 'Prospecção'), h('i', icon('arrow')), step('02', 'ENTRADA', first), h('i', icon('arrow')), step('03', 'EVOLUÇÃO', 'Seu funil')),
            h('p', { class: 'sm mut', style: 'margin:0' }, 'Resultados com o mesmo nome e telefone entram uma única vez. Novas buscas não mudam a etapa, as notas ou as tarefas de cards existentes. Desligar esta opção não apaga oportunidades.')),
          card(2, 'Prospecção (valores padrão)', h('div', { class: 'range' }, h('span', 'Raio das áreas'), radius, rv), h('label', { class: 'field' }, h('span', 'Nota mínima'), rating), switchRow('prospect_only_no_site', 'Somente empresas sem site', 'Filtra resultados que não têm site no Google.')),
          card(3, 'Etapas do funil', h('ol', stages.map((s) => h('li', `${s.label} `, h('span', { class: 'badge' }, { open: 'aberta', won: 'ganho', lost: 'perda' }[s.kind]), h('span', { class: 'sm mut' }, ` · ${s.leads_count} oportunidade(s)`)))),
            h('a', { class: 'btn ghost', href: '#/leads' }, isAdmin ? 'Editar funil no CRM' : 'Ver no CRM')));
      },
      async plano() {
        const key = me.user.plan; const tag = { member: '01 / PORTA DE ENTRADA', creator: '02 / CÍRCULO DE CRIAÇÃO', elite: '03 / CÍRCULO ELITE' }[key] || '';
        const u = me.usage;
        const cardArt = h('div', { class: 'pcardart' }, h('div', { class: 'pca-top' }, h('b', 'NEVA GROWTH', h('small', 'MEMBERS CLUB')), h('span', tag)), h('i', { class: 'pca-arch' }), h('div', { class: 'pca-name' }, me.plan.name));
        return h('div', { class: 'stack' }, h('section', { class: 'scard planrow' }, cardArt, h('div', { class: 'stack' },
          h('div', { class: 'skick' }, 'NEVA GROWTH / MEMBERSHIP'), h('h3', { class: 'planname' }, me.plan.name), h('p', { class: 'sm mut', style: 'margin:0' }, `${me.plan.tagline ? me.plan.tagline + '. ' : ''}Seu acesso atual é definido por um administrador. Consulte benefícios e peça uma mudança na área de membros.`),
          h('ul', { class: 'sm' }, (me.plan.benefits || '').split('\n').filter(Boolean).map((b) => h('li', b))),
          h('div', { class: 'kvrow' }, h('span', 'Uso de IA neste mês'), h('b', String(u.ai.used))), h('div', { class: 'kvrow' }, h('span', 'Gerações do Builder neste mês'), h('b', String(u.builder.used))),
          h('div', { class: 'kvrow' }, h('span', 'Créditos de prospecção'), h('b', String(me.user.credits))),
          h('div', h('a', { class: 'btn', href: '#/associacao' }, 'Abrir área de membros', h('i', { class: 'bico' }, icon('arrow')))))));
      },
      async pagamentos() {
        return h('section', { class: 'scard stack soon' }, h('div', { class: 'skick' }, 'PAGAMENTOS / INTEGRAÇÃO'), h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon('wallet')), h('div', h('b', 'Conecte em poucos passos'), h('div', { class: 'sm mut' }, 'Os recebimentos passam a atualizar o painel automaticamente.')), h('span', { class: 'soonbadge' }, 'Em breve')),
          h('p', { class: 'sm mut', style: 'margin:0' }, 'Estamos preparando a integração de pagamentos. Quando estiver pronta, você conecta sua conta aqui, sem compartilhar chaves de API, e as vendas pagas entram no painel sozinhas.'));
      },
      async suporte() {
        return h('div', { class: 'stack' }, h('section', { class: 'scard stack soon' }, h('div', { class: 'skick' }, 'SUPORTE / CONTATO DIRETO'), h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon('mail')), h('div', h('b', 'Fale com o suporte.'), h('div', { class: 'sm mut' }, 'Se algo não funcionar como esperado ou você precisar de ajuda, envie uma mensagem.')), h('span', { class: 'soonbadge' }, 'Em breve')),
          h('p', { class: 'sm mut', style: 'margin:0' }, 'O canal oficial de suporte ainda está a caminho. Enquanto isso, fale com o administrador da sua conta.')),
          h('section', { class: 'scard stack soon' }, h('div', { class: 'shead' }, h('i', { class: 'sico' }, icon('alert')), h('div', h('b', 'Encontrou um bug?'), h('div', { class: 'sm mut' }, 'O relato de bugs, com a tela e uma captura, chega em breve.')), h('span', { class: 'soonbadge' }, 'Em breve'))));
      }
    };
    const cur = () => SECTIONS.findIndex((x) => x[0] === sec);
    const head = h('div', { class: 'shead2' });
    const drawHead = () => { const i = cur(); const [, , , , t, d] = SECTIONS[i]; mount(head, h('div', { class: 'skicker' }, h('span', '/ CONFIGURAÇÕES'), h('b', '/'), h('span', `${String(i + 1).padStart(2, '0')} DE ${String(SECTIONS.length).padStart(2, '0')}`)),
      h('h2', t[0], h('em', /[?!.]$/.test(t[1]) ? t[1] : t[1] + '.')), h('p', d), h('span', { class: 'sbig', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')), h('div', { class: 'srule' }, h('i'))); };
    views.render = async (key) => { sec = key; drawNav(); drawHead(); try { mount(content, await views[key]()); } catch (e) { mount(content, h('div', { class: 'empty' }, e.message)); } };
    const drawNav = () => mount(nav, h('div', { class: 'snavhead' }, h('span', '/ SUA CONTA'), h('span', 'CONFIGURAÇÕES')), ...SECTIONS.map(([k, l, d, ic, , , soon]) => h('button', { class: sec === k ? 'on' : '', onclick: () => views.render(k) }, h('i', { class: 'snico' }, icon(ic)), h('span', h('b', l, soon && h('em', { class: 'soonpill' }, 'EM BREVE')), h('small', d)))),
      h('div', { class: 'snavhead', style: 'margin-top:14px' }, h('span', '/ CONTA CONECTADA')), h('div', { class: 'whoami' }, h('i', (me.user.name || '?')[0].toUpperCase()), h('span', h('b', me.user.name), h('small', `${me.plan.name} · ${me.user.email}`))),
      h('div', { class: 'snavhead', style: 'margin-top:14px' }, h('span', '/ ATALHOS DE GESTÃO')), ...[['tarefas', 'Tarefas'], ['produtos', 'Produtos'], ['cursos', 'Academia'], ...(isAdmin ? [['usuarios', 'Usuários']] : [])].map(([p2, l]) => h('a', { class: 'snlink', href: '#/' + p2 }, l, h('i', icon('arrow')))));
    const top = h('header', { class: 'shero' }, h('div', { class: 'shl' }, h('div', { class: 'skick2' }, h('i', { class: 'brandmk' }, 'N'), h('span', '/ NEVA GROWTH'), h('span', '/ CENTRAL DA CONTA')),
      h('h1', 'Configurações.'), h('p', 'Seu acesso, sua operação, suas escolhas. Tudo sob o seu controle.')),
      h('div', { class: 'shr', 'aria-hidden': 'true' }, h('b', 'NG', h('em', '/')), h('small', 'SEU SISTEMA'), h('small', 'SOB CONTROLE')),
      h('a', { class: 'sclose', href: '#/dashboard', 'aria-label': 'Fechar configurações', title: 'Fechar' }, icon('x')));
    mount(box, h('div', { class: 'setshell' }, top, h('div', { class: 'settings' }, nav, h('div', { class: 'spane' }, head, content))));
    await views.render(sec);
  }
};
