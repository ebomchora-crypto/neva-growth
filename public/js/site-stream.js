// Protocolo de geração do Neva Studio/Builder (compartilhado): leitura ao vivo da resposta da IA, continuações e prévia.
import { ApiError } from './api.js';

// Neva Studio: o site nasce do pedido (plano → seções em paralelo → pronto) e muda por conversa.
// Mesmo protocolo do Code Maker: a resposta ao vivo termina com <<<OK>>>, <<<CONTINUA>>> ou <<<ERRO:…>>>.
export const PARALLEL_PARTS = 4;
const MAX_CONTINUATIONS = 5;
const END = /\n?<<<(OK|CONTINUA|ERRO:([\s\S]*?))>>>\s*$/;

export function splitEnd(raw) {
  const m = raw.match(END);
  if (!m) return { text: raw, end: null };
  const text = raw.slice(0, m.index);
  if (m[1] === 'OK') return { text, end: 'ok' };
  if (m[1] === 'CONTINUA') return { text, end: 'continue' };
  return { text, end: 'error', message: (m[2] || '').trim() || 'Algo deu errado. Tente de novo.' };
}
// Esconde a linha de controle mesmo chegando pela metade.
const visible = (raw) => splitEnd(raw).text.replace(/\n<<<[^\n]*$/, '').replace(/\n<{1,2}$/, '');
export const noEtapa = (t) => t.replace(/<etapa>[^<]*<\/etapa>\n?/g, '');
// Junta a continuação sem repetir o trecho que a IA reescreve no começo.
function joinContinuation(previous, next) {
  let addition = next.replace(/^\s*```html[^\S\n]*\n?/i, '');
  const max = Math.min(600, previous.length, addition.length);
  for (let size = max; size >= 12; size--) if (previous.endsWith(addition.slice(0, size))) { addition = addition.slice(size); break; }
  return previous + addition;
}
export async function streamCM(body, onText, signal, onRound) {
  let partial = '';
  for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
    if (round > 0) onRound?.(round);
    let res;
    try {
      res = await fetch('/api/code-maker', { method: 'POST', credentials: 'same-origin', signal,
        headers: { 'content-type': 'application/json', 'x-requested-with': 'neva' }, body: JSON.stringify(partial ? { ...body, partial } : body) });
    } catch (e) { if (e.name === 'AbortError') throw e; throw new ApiError('Sem conexão com o servidor.', 0, 'network'); }
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new ApiError(d.error || 'Erro inesperado.', res.status, d.code); }
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let raw = '';
    try {
      for (;;) { const { value, done } = await reader.read(); if (done) break; raw += decoder.decode(value, { stream: true }); const v = visible(raw); onText(partial ? joinContinuation(partial, v) : v); }
      raw += decoder.decode();
    } catch (e) {
      if (e.name === 'AbortError' || signal?.aborted) throw e;
      raw = visible(raw);   // a conexão caiu no meio: continua do que já chegou
    }
    const { text, end, message } = splitEnd(raw);
    const full = partial ? joinContinuation(partial, text) : text;
    if (end === 'ok') return full;
    if (end === 'error') throw new Error(message);
    partial = full;
  }
  throw new Error('A IA demorou demais para terminar. Tente de novo.');
}
export const actionsOf = (text) => (text.match(/<acoes>([\s\S]*?)(?:<\/acoes>|$)/i)?.[1] || '').split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
export const filesReport = (text) => (text.match(/<arquivos>([\s\S]*?)<\/arquivos>/i)?.[1] || '').split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
export const partOrder = (plan) => ['header', ...plan.sections.map((s) => s.id), 'footer'];
export const partLabel = (plan, id) => (id === 'header' ? 'Cabeçalho e menu' : id === 'footer' ? 'Rodapé' : plan.sections.find((s) => s.id === id)?.label || id);
export async function runWithLimit(items, limit, task) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => { while (queue.length) await task(queue.shift()); }));
}

// Só na prévia: links "#secao" rolam dentro do quadro, links entre páginas trocam a página e a rolagem volta ao mesmo lugar.
export const frameDoc = (html, { page = '', scrollY = 0 } = {}) => {
  const extra = `<style>[id]{scroll-margin-top:84px}</style><script>(function(){var page=${JSON.stringify(page)};function post(m){try{parent.postMessage(Object.assign({nevaStudio:1},m),'*')}catch(_){}}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var href=(a.getAttribute('href')||'').trim();
if(href.charAt(0)==='#'){e.preventDefault();var el=href.length>1?document.getElementById(decodeURIComponent(href.slice(1))):null;if(el)el.scrollIntoView({behavior:'smooth'});else if(page)post({page:'',hash:href.slice(1)});else window.scrollTo({top:0,behavior:'smooth'});return}
var m=href.match(/^(?:\\.\\/|\\/)?(?:paginas\\/)?([a-z0-9-]+)\\.html(#[^?]*)?$/i);if(m){e.preventDefault();var p=m[1].toLowerCase();post({page:p==='index'?'':p,hash:(m[2]||'').slice(1)});return}
if(!a.getAttribute('target'))a.setAttribute('target','_blank');a.setAttribute('rel','noopener')},true);
document.addEventListener('submit',function(e){e.preventDefault();var f=e.target,p=document.createElement('p');p.style.cssText='margin:10px 0 0;font:600 14px system-ui;color:#15803d';p.textContent='Prévia: no site publicado este formulário envia de verdade.';f.appendChild(p)},true);
var last=0;window.addEventListener('scroll',function(){var n=Date.now();if(n-last<150)return;last=n;post({scroll:window.scrollY})},{passive:true});
window.addEventListener('load',function(){setTimeout(function(){${scrollY > 0 ? `window.scrollTo(0,${Math.round(scrollY)})` : ''}},60)});})();</script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${extra}</body>`) : html + extra;
};

