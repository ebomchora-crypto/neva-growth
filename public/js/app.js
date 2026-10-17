import { api } from './api.js';
import { h, mount, icon, toast, fail } from './ui.js';

const state = { user: null, cleanup: null };
const root = document.getElementById('app');

const ROUTES = [
  { sec: 'Visão geral' },
  { path: 'dashboard', label: 'Dashboard', icon: 'home', page: () => import('./pages/dashboard.js') },
  { sec: 'Comercial' },
  { path: 'prospeccao', label: 'Prospecção', icon: 'search', page: () => import('./pages/prospect.js') },
  { path: 'leads', label: 'Leads e funil', icon: 'funnel', page: () => import('./pages/leads.js') },
  { path: 'clientes', label: 'Clientes', icon: 'users', page: () => import('./pages/resources.js').then((m) => m.clients) },
  { path: 'tarefas', label: 'Tarefas', icon: 'check', page: () => import('./pages/resources.js').then((m) => m.tasks) },
  { path: 'vendas', label: 'Vendas', icon: 'cart', page: () => import('./pages/resources.js').then((m) => m.sales) },
  { path: 'produtos', label: 'Produtos', icon: 'tag', page: () => import('./pages/resources.js').then((m) => m.products) },
  { sec: 'Criação' },
  { path: 'sites', label: 'Sites e sistemas', icon: 'globe', page: () => import('./pages/sites.js') },
  { path: 'ide/:id', hidden: true, wide: true, page: () => import('./pages/ide.js') },
  { path: 'cursos', label: 'Academia', icon: 'book', page: () => import('./pages/courses.js') },
  { sec: 'Administração' },
  { path: 'usuarios', label: 'Usuários', icon: 'shield', admin: true, page: () => import('./pages/resources.js').then((m) => m.users) },
  { path: 'configuracoes', label: 'Configurações', icon: 'cog', page: () => import('./pages/settings.js') }
];

function match() {
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [base, ...rest] = hash.split('/');
  const r = ROUTES.find((x) => x.path && x.path.split('/')[0] === base);
  return { route: r, params: rest, hash };
}

async function boot() {
  let st;
  try { st = await api.get('/auth/status'); } catch (e) { mount(root, h('div', { class: 'boot' }, 'Não foi possível conectar ao servidor. ', h('button', { class: 'btn', onclick: boot }, 'Tentar novamente'))); return; }
  state.user = st.user;
  if (st.needsSetup) return authScreen('setup');
  if (!st.user) return authScreen('login');
  shell();
}

function authScreen(mode) {
  const setup = mode === 'setup';
  const err = h('p', { class: 'err-text', role: 'alert' });
  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    const d = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button'); btn.disabled = true;
    try {
      const r = await api.post(setup ? '/auth/setup' : '/auth/login', d);
      state.user = r.user; shell();
    } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
  } },
    setup && h('label', { class: 'field' }, h('span', 'Seu nome'), h('input', { name: 'name', required: true, autocomplete: 'name' })),
    h('label', { class: 'field' }, h('span', 'E-mail'), h('input', { name: 'email', type: 'email', required: true, autocomplete: 'username' })),
    h('label', { class: 'field' }, h('span', 'Senha' + (setup ? ' (mín. 8 caracteres)' : '')), h('input', { name: 'password', type: 'password', required: true, minlength: setup ? 8 : null, autocomplete: setup ? 'new-password' : 'current-password' })),
    err, h('button', { class: 'btn' }, setup ? 'Criar conta de administrador' : 'Entrar'));
  mount(root, h('main', { class: 'auth' }, h('div', { class: 'card' },
    h('div', { class: 'brand' }, h('i', 'N'), 'Neva Growth'),
    h('h1', setup ? 'Bem-vindo' : 'Entrar'),
    h('p', { class: 'mut' }, setup ? 'Primeiro acesso: crie a conta do administrador para configurar a plataforma.' : 'Acesse sua conta para continuar.'), form)));
}

function shell() {
  const side = h('aside', { class: 'side', id: 'side' });
  const scrim = h('div', { class: 'scrim hide', onclick: () => toggle(false) });
  const toggle = (open) => { side.classList.toggle('open', open); scrim.classList.toggle('hide', !open); };
  const links = ROUTES.filter((r) => !r.hidden && (!r.admin || state.user.role === 'admin'));
  side.append(h('div', { class: 'brand' }, h('i', 'N'), 'Neva Growth'),
    h('nav', { class: 'nav', 'aria-label': 'Principal' }, links.map((r) => r.sec ? h('div', { class: 'nav-sec' }, r.sec) :
      h('a', { href: '#/' + r.path, dataset: { path: r.path }, onclick: () => toggle(false) }, icon(r.icon), r.label))),
    h('div', { class: 'me' }, h('div', { class: 'avatar' }, state.user.name.slice(0, 1).toUpperCase()),
      h('div', { class: 'grow' }, h('div', { style: 'font-weight:600' }, state.user.name), h('div', { class: 'sm mut' }, { admin: 'Administrador', member: 'Membro', viewer: 'Leitura' }[state.user.role])),
      h('button', { class: 'btn ghost sm', title: 'Sair', 'aria-label': 'Sair', onclick: async () => { await api.post('/auth/logout').catch(() => {}); state.user = null; boot(); } }, icon('logout'))));
  side.querySelectorAll('svg').forEach((s) => { s.style.cssText = 'width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round'; });
  const view = h('div', { id: 'view' });
  mount(root, h('div', { class: 'shell' }, side, scrim, h('div', { class: 'main' },
    h('div', { class: 'topbar' }, h('button', { class: 'btn ghost sm', 'aria-label': 'Abrir menu', onclick: () => toggle(true) }, icon('menu')), h('b', 'Neva Growth')), view)));
  route();
}

async function route() {
  const view = document.getElementById('view'); if (!view) return;
  const { route: r, params, hash } = match();
  if (!r) { location.hash = '#/dashboard'; return; }
  if (r.admin && state.user.role !== 'admin') { location.hash = '#/dashboard'; return; }
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.path === r.path.split('/')[0]));
  state.cleanup?.(); state.cleanup = null;
  const box = h('div', { class: 'content' + (r.wide ? ' wide' : '') }, h('p', { class: 'mut' }, 'Carregando…'));
  mount(view, box);
  try {
    const mod = await r.page();
    const page = mod.default || mod;
    const out = await page.render(box, { user: state.user, params, navigate: (p) => { location.hash = '#/' + p; } });
    if (typeof out === 'function') state.cleanup = out;
  } catch (e) {
    if (e.status === 401) return;
    mount(box, h('div', { class: 'empty' }, h('b', 'Não foi possível carregar esta página'), e.message || 'Erro inesperado.', h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn ghost', onclick: route }, 'Tentar novamente'))));
    console.error(e);
  }
}

window.addEventListener('hashchange', () => { if (state.user) route(); });
window.addEventListener('neva:unauth', () => { if (state.user) { state.user = null; toast('Sessão expirada. Entre novamente.', 'err'); boot(); } });
boot();
