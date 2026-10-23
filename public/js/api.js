export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
async function request(method, url, body) {
  let res;
  try {
    res = await fetch('/api' + url, {
      method, credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-requested-with': 'neva' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch { throw new ApiError('Sem conexão com o servidor.', 0, 'network'); }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event('neva:unauth'));
    throw new ApiError(data?.error || 'Erro inesperado.', res.status, data?.code);
  }
  return data;
}
const qs = (o = {}) => {
  const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString(); return s ? '?' + s : '';
};
export const api = {
  get: (u, q) => request('GET', u + qs(q)), post: (u, b = {}) => request('POST', u, b),
  put: (u, b) => request('PUT', u, b), patch: (u, b) => request('PATCH', u, b), del: (u, q) => request('DELETE', u + qs(q))
};
