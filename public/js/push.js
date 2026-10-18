// Alertas no aparelho (Notification API do navegador). Funcionam enquanto o Neva estiver aberto em alguma aba:
// o app consulta os alertas a cada 30 s e, havendo novos, mostra uma notificação do sistema.
const KEY = 'neva-push';
const ICON = '/img/mascote/boas-vindas.webp';
const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* sem armazenamento */ } } };

export const supported = () => typeof Notification !== 'undefined';
export const permission = () => (supported() ? Notification.permission : 'unsupported');
export const enabled = () => supported() && Notification.permission === 'granted' && store.get() === '1';

export async function enable() {
  if (!supported()) throw new Error('Este navegador não oferece notificações.');
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (p !== 'granted') throw new Error(p === 'denied' ? 'As notificações estão bloqueadas neste navegador. Libere nas configurações do site (cadeado ao lado do endereço).' : 'Permissão não concedida.');
  store.set('1');
}
export const disable = () => store.set('0');
export function show(title, body, link) {
  if (!supported() || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: ICON, tag: 'neva-' + (link || body) });
  n.onclick = () => { window.focus(); if (link) location.hash = link.replace(/^#?\/?/, '#/'); n.close(); };
}
export const test = () => show('Neva Growth', 'Tudo certo! É assim que os seus alertas vão aparecer neste aparelho.', '#/dashboard');

// chamada a cada consulta de alertas; só notifica o que chegou depois da primeira consulta da sessão
let seen = null;
export function pushNew(items) {
  const max = items.reduce((m, n) => Math.max(m, n.id), 0);
  if (seen === null) { seen = max; return; }
  const fresh = items.filter((n) => n.id > seen && !n.read).reverse();
  seen = Math.max(seen, max);
  if (!enabled()) return;
  fresh.slice(0, 3).forEach((n) => show('Neva Growth', n.text, n.link));
  if (fresh.length > 3) show('Neva Growth', `+${fresh.length - 3} alertas novos`, '#/dashboard');
}
export const resetPush = () => { seen = null; };
