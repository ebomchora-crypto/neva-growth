import { api } from './api.js';
import { h, mount, icon, toast, fail, debounce, dtt, mascotImg } from './ui.js';
import { initMotion, routeStart, routeEnd, navIndicator, shellIn, snow, authIn, shake, kill } from './motion.js';

const state = { user: null, me: null, cleanup: null, syncAt: null };
initMotion();
const root = document.getElementById('app');
const lazy = (file, name) => () => import(file).then((m) => (name ? m[name] : m));

// Ordem do menu = ordem do menu lateral de referência: portal/associação, início, clientes, vendas, sites, CRM, builder | ferramentas | gestão.
const ROUTES = [
  { sec: 'Principal' },
  { path: 'associacao', label: 'Associação', icon: 'card', page: lazy('./pages/membership.js') },
  { path: 'dashboard', search: 'Buscar cliente ou projeto', label: 'Dashboard', icon: 'home', page: lazy('./pages/dashboard.js') },
  { path: 'clientes', search: 'Buscar cliente, empresa ou telefone', label: 'Clientes', icon: 'users', page: lazy('./pages/resources.js', 'clients') },
  { path: 'vendas', search: 'Buscar venda, projeto ou cliente', label: 'Vendas', icon: 'wallet', page: lazy('./pages/resources.js', 'sales') },
  { path: 'sites', search: 'Buscar site, domínio ou cliente', label: 'Sites e sistemas', icon: 'layout', page: lazy('./pages/sites.js') },
  { path: 'leads', search: 'Buscar oportunidade, cliente ou empresa', label: 'CRM e funil', icon: 'kanban', page: lazy('./pages/leads.js') },
  { path: 'builder', search: 'Buscar site, modelo ou projeto', label: 'Builder com IA', icon: 'gridplus', page: lazy('./pages/builder.js') },
  { path: 'ide/:id', hidden: true, wide: true, page: lazy('./pages/ide.js') },
  { sec: 'Ferramentas' },
  { path: 'design', search: 'Buscar referência, estilo ou categoria', tool: true, label: 'Referências de design', icon: 'palette', page: lazy('./pages/library.js', 'design') },
  { path: 'acervo', search: 'Buscar recurso, prompt ou animação', tool: true, label: 'Acervo', icon: 'box', page: lazy('./pages/library.js', 'acervo') },
  { path: 'play', search: 'Buscar conteúdo', tool: true, label: 'Play', icon: 'play', page: lazy('./pages/play.js') },
  { path: 'prospeccao', tool: true, label: 'Prospecção', icon: 'target', page: lazy('./pages/prospect.js') },
  { path: 'prompts', tool: true, label: 'Gerador de prompts', icon: 'wand', page: lazy('./pages/promptgen.js') },
  { sec: 'Gestão' },
  { path: 'tarefas', norail: true, label: 'Tarefas', icon: 'check', page: lazy('./pages/resources.js', 'tasks') },
  { path: 'produtos', norail: true, label: 'Produtos', icon: 'tag', page: lazy('./pages/resources.js', 'products') },
  { path: 'cursos', norail: true, label: 'Academia', icon: 'book', page: lazy('./pages/courses.js') },
  { path: 'usuarios', norail: true, label: 'Usuários', icon: 'shield', admin: true, page: lazy('./pages/resources.js', 'users') },
  { path: 'configuracoes', label: 'Configurações', icon: 'cog', page: lazy('./pages/settings.js') }
];

function match() {
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [base, ...rest] = hash.split('/');
  return { route: ROUTES.find((x) => x.path && x.path.split('/')[0] === base), params: rest };
}
export const applyPrivacy = (on) => document.documentElement.classList.toggle('hide-values', !!on);

async function loadMe() {
  state.me = await api.get('/me');
  applyPrivacy(state.me.settings.hide_values === '1');
}

async function boot() {
  let st;
  try { st = await api.get('/auth/status'); } catch (e) { mount(root, h('div', { class: 'boot', style: 'text-align:center;padding:20px' }, h('div', mascotImg('erro'), h('p', 'Não foi possível iniciar o servidor.'), h('p', { class: 'mut sm' }, e.message), h('button', { class: 'btn', onclick: boot }, 'Tentar novamente')))); return; }
  state.user = st.user;
  if (st.needsSetup) return authScreen('setup', st);
  if (!st.user) return authScreen('login');
  await loadMe().catch(() => {});
  shell();
}

// Cadastro e recuperação de senha: apenas interface. O backend ainda não existe,
// então o envio não cria conta nem manda e-mail — ele informa isso com clareza.
const authPending = (what) => { throw new Error(`${what} ainda não está ativo: esta tela é só a interface, o backend entra na próxima etapa.`); };

function pwStrength(v) {
  let n = 0;
  if (v.length >= 8) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v)) n++;
  if (/^(12345678|password|senha123|qwertyui|11111111)/i.test(v)) n = Math.min(n, 1);
  return v ? Math.max(1, n) : 0;
}

function authScreen(mode, st = {}, swapped = false) {
  kill();
  snow(true);
  const setup = mode === 'setup', signup = mode === 'signup', forgot = mode === 'forgot';
  const go = (m) => (e) => { e.preventDefault(); authScreen(m, st, true); };
  const err = h('p', { class: 'err-text', role: 'alert' });
  const ok = h('p', { class: 'notice', role: 'status', hidden: true });
  const fld = (label, name, type, ic, attrs, eyeBtn) => { const inp = h('input', { name, type, ...attrs }); return h('label', { class: 'field' }, h('span', label), h('span', { class: 'fwrap' }, h('i', { class: 'fico' }, icon(ic)), inp, eyeBtn && h('button', { type: 'button', class: 'pweye', 'aria-label': 'Mostrar ou ocultar a senha', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; } }, icon('eye')))); };
  const meter = h('div', { class: 'pwmeter', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
  const pwField = fld(signup ? 'Senha' : 'Senha' + (setup ? ' (mín. 8 caracteres)' : ''), 'password', 'password', 'lock', { required: true, minlength: setup || signup ? 8 : null, autocomplete: setup || signup ? 'new-password' : 'current-password', placeholder: '••••••••', oninput: signup ? (e) => { meter.dataset.s = pwStrength(e.target.value); } : null }, true);
  const submitLabel = setup ? 'Criar conta de administrador' : signup ? 'Criar minha conta' : forgot ? 'Enviar link de recuperação' : 'Entrar na plataforma';
  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; ok.hidden = true;
    const d = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button.loginbtn'); btn.disabled = true;
    try {
      if (signup) authPending('O cadastro público');
      if (forgot) authPending('O envio do link de recuperação');
      const r = await api.post(setup ? '/auth/setup' : '/auth/login', d); state.user = r.user; await loadMe().catch(() => {}); shell();
    } catch (ex) { err.textContent = ex.message; shake(form); } finally { btn.disabled = false; }
  } },
    setup && st.setupBlocked && h('div', { class: 'notice' }, 'Instalação bloqueada: defina SETUP_TOKEN nas variáveis de ambiente do servidor e faça um novo deploy.'),
    (setup || signup) && fld('Nome', 'name', 'text', 'user', { required: true, autocomplete: 'name', placeholder: 'Seu nome' }),
    signup && fld('Nome de usuário', 'username', 'text', 'user', { required: true, autocomplete: 'username', placeholder: 'seu.usuario', pattern: '[a-zA-Z0-9._\\-]{3,30}', title: '3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado' }),
    fld('E-mail', 'email', 'email', 'mail', { required: true, autocomplete: forgot || signup ? 'email' : 'username', placeholder: 'voce@empresa.com' }),
    !forgot && pwField,
    signup && h('div', { class: 'pwhint' }, meter, h('small', 'Use 8 caracteres ou mais. Combine letras, números e símbolos e evite senhas comuns.')),
    setup && st.setupTokenRequired && fld('Token de instalação (SETUP_TOKEN)', 'setupToken', 'password', 'shield', { required: true, autocomplete: 'off' }),
    mode === 'login' && h('div', { class: 'loginopts' },
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', name: 'remember', checked: true }), h('span', 'Salvar sessão')),
      h('a', { href: '#', onclick: go('forgot') }, 'Esqueci a senha')),
    forgot && h('p', { class: 'mut sm', style: 'margin:0' }, 'Informe o e-mail da conta. Quando o envio estiver ativo, você receberá um link para criar uma nova senha.'),
    err, ok, h('button', { class: 'btn loginbtn', disabled: setup && st.setupBlocked }, h('span', submitLabel), h('i', icon('arrow'))));
  const foot = signup ? h('div', { class: 'afoot' }, 'Já faz parte? ', h('a', { href: '#', onclick: go('login') }, 'Voltar para o login'))
    : forgot ? h('div', { class: 'afoot' }, 'Lembrou a senha? ', h('a', { href: '#', onclick: go('login') }, 'Voltar para o login'))
    : setup ? h('div', { class: 'afoot' }, 'Depois de criar, convide a equipe em Usuários.')
    : h('div', { class: 'afoot' }, 'Ainda não é Neva? ', h('a', { href: '#', onclick: go('signup') }, 'Criar minha conta'));
  const alabel = setup || signup ? ' COMECE SUA OPERAÇÃO' : forgot ? ' RECUPERAR ACESSO' : ' ACESSE SUA CONTA';
  const title = setup ? ['Crie seu ', 'acesso.'] : signup ? ['Crie sua ', 'conta.'] : forgot ? ['Esqueceu a ', 'senha?'] : ['Entre na ', 'plataforma.'];
  const sub = setup ? 'Primeiro acesso: configure a conta do administrador para começar com uma operação organizada.' : signup ? 'Cadastre-se para organizar clientes, vendas e projetos em um só lugar.' : forgot ? 'Vamos ajudar você a voltar para a sua central.' : 'Use suas credenciais para abrir a sua central Neva Growth.';
  const left = h('section', { class: 'auth-form' }, h('div', { class: 'brand' }, h('i', 'N'), 'Neva Growth'), h('div', { class: 'alabel' }, h('span', '/'), alabel),
    h('h1', title[0], h('em', title[1])), h('p', { class: 'asub' }, sub), form, foot);
  const rev = setup || signup;
  const right = h('section', { class: 'auth-art' }, h('i', { class: 'wave w1' }), h('i', { class: 'wave w2' }), h('i', { class: 'wave w3' }), h('div', { class: 'dust', 'aria-hidden': 'true' }, Array.from({ length: 14 }, (_, i) => h('i', { style: `left:${(i * 37 + 8) % 92}%;top:${(i * 53 + 10) % 88}%;--s:${4 + (i % 4) * 2}px` }))),
    h('div', { class: 'aart-in' }, h('div', { class: 'akick' }, 'NEVA GROWTH / OPERATING SYSTEM'), h('h2', rev ? 'Comece sua ' : forgot ? 'Acesso ' : 'Bem-vindo ', h('em', rev ? 'operação.' : forgot ? 'seguro.' : 'de volta.')),
      h('p', rev ? 'Clientes, projetos e resultados organizados desde o primeiro acesso.' : forgot ? 'Recupere sua conta sem perder nada do que já está na plataforma.' : 'Sua central continua exatamente do ponto em que você parou.'), h('div', { class: 'asafe' }, h('i'), 'AMBIENTE PROTEGIDO'), mascotImg('boas-vindas', true)));
  const main = h('main', { class: 'auth2' + (rev ? ' rev' : '') }, left, right);
  mount(root, main); authIn(main, swapped);
  main.querySelector('input:not([type=checkbox])')?.focus({ preventScroll: true });
}

// ---------- paleta de comandos / busca global (Ctrl/⌘ + Espaço ou Ctrl/⌘ + K)
function openPalette() {
  if (document.querySelector('.palette-back')) return;
  const input = h('input', { placeholder: 'Buscar leads, clientes, vendas, projetos… ou ir para uma página', 'aria-label': 'Busca global', autocomplete: 'off' });
  const res = h('div', { class: 'res', role: 'listbox' });
  const back = h('div', { class: 'palette-back', onmousedown: (e) => { if (e.target === back) close(); } }, h('div', { class: 'palette' }, input, res));
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); };
  let links = []; let sel = 0;
  const highlight = () => links.forEach((a, i) => a.classList.toggle('sel', i === sel));
  const draw = (groups) => {
    mount(res, groups.length ? groups.map((g) => [h('div', { class: 'grp' }, g.label), g.items.map((i) => h('a', { href: i.link, onclick: close }, h('span', i.title), h('span', { class: 'mut sm' }, i.sub || '')))]) : h('div', { class: 'empty' }, 'Nada encontrado.'));
    links = [...res.querySelectorAll('a')]; sel = 0; highlight();
  };
  const pages = () => ROUTES.filter((r) => r.path && !r.hidden && (!r.admin || state.user.role === 'admin'));
  const showPages = (q) => draw([{ label: 'Ir para', items: pages().filter((r) => r.label.toLowerCase().includes(q.toLowerCase())).map((r) => ({ title: r.label, link: '#/' + r.path })) }].filter((g) => g.items.length));
  const search = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) return showPages(q);
    try { const r = await api.get('/search', { q }); const pg = pages().filter((p) => p.label.toLowerCase().includes(q.toLowerCase())).map((p) => ({ title: p.label, link: '#/' + p.path }));
      draw([...(pg.length ? [{ label: 'Ir para', items: pg }] : []), ...r.groups]); } catch (e) { mount(res, h('div', { class: 'empty' }, e.message)); }
  }, 200);
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, links.length - 1); highlight(); links[sel]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); highlight(); links[sel]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && links[sel]) { e.preventDefault(); links[sel].click(); location.hash = links[sel].getAttribute('href'); }
  }
  document.addEventListener('keydown', onKey, true);
  input.addEventListener('input', () => { if (input.value.trim().length < 2) showPages(input.value.trim()); else showPages(input.value.trim()); search(); }); document.body.append(back); input.focus(); showPages('');
}
document.addEventListener('keydown', (e) => {
  if (!state.user) return;
  if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key.toLowerCase() === 'k')) { e.preventDefault(); openPalette(); }
});

// ---------- notificações
async function openNotifications(btn, badge) {
  const existing = document.querySelector('.dropdown'); if (existing) { existing.remove(); return; }
  const dd = h('div', { class: 'dropdown', role: 'dialog', 'aria-label': 'Notificações' }, h('div', { class: 'empty' }, 'Carregando…'));
  btn.parentElement.append(dd);
  const close = (e) => { if (!dd.contains(e.target) && !btn.contains(e.target)) { dd.remove(); document.removeEventListener('mousedown', close); } };
  document.addEventListener('mousedown', close);
  try {
    const r = await api.get('/me/notifications');
    mount(dd, h('header', h('b', 'Notificações'), h('div', { class: 'row' },
      h('button', { class: 'btn ghost sm', onclick: async () => { await api.post('/me/notifications/read', {}); dd.remove(); pollNotifications(); } }, 'Marcar como lidas'),
      h('button', { class: 'btn ghost sm', onclick: async () => { await api.del('/me/notifications'); dd.remove(); pollNotifications(); } }, 'Limpar'))),
      r.items.length ? r.items.map((n) => h('a', { class: 'it' + (n.read ? '' : ' unread'), href: n.link || '#/dashboard', onclick: async () => { await api.post('/me/notifications/read', { ids: [n.id] }).catch(() => {}); dd.remove(); pollNotifications(); } }, n.text, h('small', dtt(n.created_at))))
        : h('div', { class: 'empty' }, h('b', 'Tudo em dia'), 'Alertas de vendas, tarefas e leads aparecem aqui. Ajuste em Configurações → Notificações.'));
  } catch (e) { mount(dd, h('div', { class: 'empty' }, e.message)); }
}
let pollTimer = null;
async function pollNotifications() {
  const badge = document.getElementById('notif-badge'); if (!badge || !state.user) return;
  try { const r = await api.get('/me/notifications'); badge.textContent = r.unread > 99 ? '99+' : r.unread; badge.classList.toggle('hide', !r.unread); state.syncAt = new Date(); const s = document.getElementById('syncinfo'); if (s) s.lastChild.textContent = 'Sincronizado ' + state.syncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { /* offline: mantém */ }
}

function shell() {
  snow(false);
  const side = h('aside', { class: 'side', id: 'side' });
  const scrim = h('div', { class: 'scrim hide', onclick: () => toggle(false) });
  const toggle = (open) => { side.classList.toggle('open', open); scrim.classList.toggle('hide', !open); };
  const links = ROUTES.filter((r) => !r.hidden && (!r.admin || state.user.role === 'admin'));
  const logout = async () => { await api.post('/auth/logout').catch(() => {}); clearInterval(pollTimer); state.user = null; state.me = null; applyPrivacy(false); boot(); };
  const navLink = (r) => h('a', { href: '#/' + r.path, class: (r.tool ? 'tool' : '') + (r.norail ? ' norail' : ''), dataset: { path: r.path }, title: r.label, 'aria-label': r.label, onclick: () => toggle(false) }, icon(r.icon), r.tool && h('i', { class: 'tbadge', 'aria-hidden': 'true' }, 'N'), h('span', { class: 'lbl' }, r.label));
  const cfg = links.find((r) => r.path === 'configuracoes');
  side.append(h('a', { class: 'brand', href: '#/dashboard', title: 'Neva Growth' }, h('i', 'N'), h('span', { class: 'lbl' }, 'Neva Growth')),
    h('nav', { class: 'nav', 'aria-label': 'Principal' }, links.filter((r) => r.path !== 'configuracoes').map((r) => r.sec ? h('div', { class: 'nav-sec', title: r.sec }, h('span', r.sec)) : navLink(r))),
    h('div', { class: 'railfoot' }, cfg && navLink(cfg), h('button', { class: 'railbtn', title: 'Sair', 'aria-label': 'Sair', onclick: logout }, icon('logout'), h('span', { class: 'lbl' }, 'Sair'))));
  const hidden = () => state.me?.settings.hide_values === '1';
  const eye = h('button', { class: 'iconbtn', title: 'Ocultar/mostrar valores', 'aria-label': 'Ocultar ou mostrar valores', onclick: async () => {
    const on = !hidden(); try { await api.put('/me/settings', { hide_values: on }); state.me.settings.hide_values = on ? '1' : '0'; applyPrivacy(on); eye.replaceChildren(icon(on ? 'eyeoff' : 'eye')); } catch (e) { fail(e); } } }, icon(hidden() ? 'eyeoff' : 'eye'));
  const bell = h('button', { class: 'iconbtn', 'aria-label': 'Notificações', onclick: () => openNotifications(bell) }, icon('bell'), h('span', { class: 'dot hide', id: 'notif-badge' }, '0'));
  const view = h('div', { id: 'view' });
  const roleName = { admin: 'Administrador', member: 'Membro', viewer: 'Leitura' }[state.user.role];
  const top = h('div', { class: 'topbar2' },
    h('button', { class: 'iconbtn menu-btn', 'aria-label': 'Abrir menu', onclick: () => toggle(true) }, icon('menu')),
    h('button', { class: 'searchbtn', onclick: openPalette }, icon('search'), h('span', { id: 'searchlbl' }, 'Buscar cliente ou projeto'), h('span', { class: 'kbd' }, icon('cmd'), '+ Espaço')),
    h('span', { class: 'grow' }), h('span', { class: 'livepill', id: 'syncinfo', title: 'Os dados são atualizados a cada 30 s e ao abrir cada página; não há tempo real contínuo.' }, h('i'), h('span', 'Sincronizado')), eye,
    h('button', { class: 'iconbtn', title: 'Atualizar a página atual', 'aria-label': 'Atualizar dados', onclick: () => route() }, icon('refresh')),
    h('div', { style: 'position:relative' }, bell),
    h('a', { class: 'userpill', href: '#/configuracoes', title: 'Minha conta' }, h('span', { class: 'avatar' }, state.user.name.slice(0, 1).toUpperCase()),
      h('span', { class: 'who' }, h('b', state.user.name.split(' ')[0]), h('small', `${roleName} · ${state.me?.plan?.name || ''}`))));
  mount(root, h('div', { class: 'shell' }, side, scrim, h('div', { class: 'main' }, top, view)));
    clearInterval(pollTimer); pollNotifications(); pollTimer = setInterval(pollNotifications, 30000);
  shellIn(); route();
}

async function route() {
  const view = document.getElementById('view'); if (!view) return;
  const { route: r, params } = match();
  if (!r) { location.hash = '#/dashboard'; return; }
  if (r.admin && state.user.role !== 'admin') { location.hash = '#/dashboard'; return; }
  document.querySelectorAll('.side a[data-path]').forEach((a) => a.classList.toggle('on', a.dataset.path === r.path.split('/')[0]));
  navIndicator(document.querySelector('.nav'), document.querySelector('.nav a.on'));
  const sl = document.getElementById('searchlbl'); if (sl) sl.textContent = r.search || 'Buscar cliente, lead, venda ou projeto';
  state.cleanup?.(); state.cleanup = null;
  await routeStart(view);
  const box = h('div', { class: 'content' + (r.wide ? ' wide' : '') }, h('p', { class: 'mut' }, 'Carregando…'));
  mount(view, box);
  try {
    const mod = await r.page(); const page = mod.default || mod;
    const out = await page.render(box, { user: state.user, me: state.me, params, navigate: (p) => { location.hash = '#/' + p; }, reloadMe: loadMe });
    if (typeof out === 'function') state.cleanup = out;
    pollNotifications(); routeEnd();
  } catch (e) {
    routeEnd();
    if (e.status === 401) return;
    mount(box, h('div', { class: 'empty' }, mascotImg('erro'), h('b', 'Não foi possível carregar esta página'), e.message || 'Erro inesperado.', h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn ghost', onclick: route }, 'Tentar novamente'))));
    console.error(e);
  }
}

window.addEventListener('resize', debounce(() => navIndicator(document.querySelector('.nav'), document.querySelector('.nav a.on')), 150));
window.addEventListener('hashchange', () => { if (state.user) route(); });
window.addEventListener('neva:unauth', () => { if (state.user) { state.user = null; clearInterval(pollTimer); toast('Sessão expirada. Entre novamente.', 'err'); boot(); } });
boot();
