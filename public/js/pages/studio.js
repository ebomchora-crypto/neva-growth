import { api, ApiError } from '../api.js';
import { h, mount, toast, fail, icon, modal, confirmBox, dtt } from '../ui.js';

// Neva Studio: o site nasce do pedido (plano → seções em paralelo → pronto) e muda por conversa.
// Mesmo protocolo do Code Maker: a resposta ao vivo termina com <<<OK>>>, <<<CONTINUA>>> ou <<<ERRO:…>>>.
const PARALLEL_PARTS = 4;
const MAX_CONTINUATIONS = 5;
const END = /\n?<<<(OK|CONTINUA|ERRO:([\s\S]*?))>>>\s*$/;

function splitEnd(raw) {
  const m = raw.match(END);
  if (!m) return { text: raw, end: null };
  const text = raw.slice(0, m.index);
  if (m[1] === 'OK') return { text, end: 'ok' };
  if (m[1] === 'CONTINUA') return { text, end: 'continue' };
  return { text, end: 'error', message: (m[2] || '').trim() || 'Algo deu errado. Tente de novo.' };
}
// Esconde a linha de controle mesmo chegando pela metade.
const visible = (raw) => splitEnd(raw).text.replace(/\n<<<[^\n]*$/, '').replace(/\n<{1,2}$/, '');
// Junta a continuação sem repetir o trecho que a IA reescreve no começo.
function joinContinuation(previous, next) {
  let addition = next.replace(/^\s*```html[^\S\n]*\n?/i, '');
  const max = Math.min(600, previous.length, addition.length);
  for (let size = max; size >= 12; size--) if (previous.endsWith(addition.slice(0, size))) { addition = addition.slice(size); break; }
  return previous + addition;
}
async function streamCM(body, onText, signal) {
  let partial = '';
  for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
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
const actionsOf = (text) => (text.match(/<acoes>([\s\S]*?)(?:<\/acoes>|$)/i)?.[1] || '').split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
const filesReport = (text) => (text.match(/<arquivos>([\s\S]*?)<\/arquivos>/i)?.[1] || '').split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
const partOrder = (plan) => ['header', ...plan.sections.map((s) => s.id), 'footer'];
const partLabel = (plan, id) => (id === 'header' ? 'Cabeçalho e menu' : id === 'footer' ? 'Rodapé' : plan.sections.find((s) => s.id === id)?.label || id);
async function runWithLimit(items, limit, task) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => { while (queue.length) await task(queue.shift()); }));
}

// Só na prévia: links "#secao" rolam dentro do quadro, links entre páginas trocam a página e a rolagem volta ao mesmo lugar.
const frameDoc = (html, { page = '', scrollY = 0 } = {}) => {
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

export default {
  async render(box, ctx) {
    const id = Number(ctx.params[0]);
    let site = (await api.get('/code-maker/' + id)).site;
    let versions = (await api.get(`/code-maker/${id}/versions`)).items;
    const canWrite = ctx.user.role !== 'viewer';
    let phase = 'idle'; let planText = ''; let editText = ''; let pending = null; let error = null;
    let progress = {}; let controller = null; let busy = false; let disposed = false;
    let page = ''; let scrollY = 0; let device = 'desktop';

    // ---- prévia
    const frame = h('iframe', { title: 'Prévia do site', sandbox: 'allow-scripts allow-forms allow-popups allow-modals' });
    const empty = h('div', { class: 'stu-empty' }, h('div', { class: 'stu-spin' }), h('b', 'Planejando o seu site…'), h('span', 'As seções aparecem aqui assim que ficam prontas.'));
    const pageSel = h('select', { class: 'stu-pages', 'aria-label': 'Página', onchange: () => { page = pageSel.value; scrollY = 0; loadPreview(); } });
    let previewTimer = null; let previewSeq = 0;
    async function loadPreview() {
      const seq = ++previewSeq;
      try {
        const d = await api.get(`/code-maker/${id}/document`, { page });
        if (seq !== previewSeq || disposed) return;
        empty.hidden = Boolean(d.html); frame.hidden = !d.html;
        if (d.html) frame.srcdoc = frameDoc(d.html, { page, scrollY });
        mount(pageSel, h('option', { value: '' }, 'Página inicial'), (d.pages || []).map((p) => h('option', { value: p, selected: p === page }, p.replace(/-/g, ' '))));
        pageSel.hidden = !(d.pages || []).length;
      } catch (e) { if (seq === previewSeq) fail(e); }
    }
    const schedulePreview = () => { clearTimeout(previewTimer); previewTimer = setTimeout(loadPreview, 250); };
    const onMsg = (e) => {
      if (e.source !== frame.contentWindow || !e.data?.nevaStudio) return;
      if (typeof e.data.scroll === 'number') scrollY = e.data.scroll;
      if (typeof e.data.page === 'string') { page = e.data.page; scrollY = 0; loadPreview(); }
    };
    window.addEventListener('message', onMsg);

    // ---- topo
    const nameEl = h('b', { class: 'stu-name' });
    const statusEl = h('span', { class: 'stu-status' });
    const devBtns = h('div', { class: 'stu-dev', role: 'group', 'aria-label': 'Tamanho da prévia' });
    const drawDev = () => mount(devBtns, [['desktop', 'monitor', 'Computador'], ['tablet', 'tablet', 'Tablet'], ['mobile', 'phone', 'Celular']].map(([k, ic, l]) =>
      h('button', { type: 'button', class: device === k ? 'on' : '', title: l, 'aria-label': l, 'aria-pressed': String(device === k), onclick: () => { device = k; stage.dataset.device = k; drawDev(); } }, icon(ic))));
    drawDev();
    const actionsEl = h('div', { class: 'stu-acts' });
    function drawTop() {
      nameEl.textContent = site.name;
      const st = phase !== 'idle' ? { planning: 'Planejando', building: 'Escrevendo seções', editing: 'Alterando' }[phase] : { ready: 'Pronto', error: 'Parou no meio', planning: 'Na fila', building: 'Incompleto' }[site.status];
      statusEl.className = 'stu-status ' + (phase !== 'idle' ? 'run' : site.status);
      statusEl.textContent = st;
      const ready = site.status === 'ready';
      mount(actionsEl,
        h('button', { type: 'button', class: 'btn ghost sm', disabled: !versions.length, onclick: openVersions }, icon('clock'), ' Versões'),
        h('a', { class: 'btn ghost sm' + (ready ? '' : ' disabled'), href: ready ? '#/ide/' + id : undefined, 'aria-disabled': String(!ready) }, icon('code'), ' Código'),
        h('a', { class: 'btn ghost sm' + (ready ? '' : ' disabled'), href: ready ? `/api/projects/${id}/zip` : undefined, download: ready ? `${site.slug}.zip` : undefined, 'aria-disabled': String(!ready) }, icon('download'), ' Baixar'),
        site.published && h('a', { class: 'btn ghost sm', href: `/s/${site.slug}/`, target: '_blank', rel: 'noopener' }, icon('external'), ' Ver online'),
        h('button', { type: 'button', class: 'btn sm', disabled: !ready || !canWrite || phase !== 'idle', onclick: togglePublish }, site.published ? 'Despublicar' : 'Publicar'));
    }
    async function togglePublish() {
      try {
        const p = await api.post(`/projects/${id}/publish`, { published: !site.published });
        site.published = Boolean(p.published); drawTop();
        toast(site.published ? 'Site publicado.' : 'Site despublicado.', 'ok');
      } catch (e) { fail(e); }
    }

    // ---- conversa
    const thread = h('div', { class: 'stu-thread', 'aria-live': 'polite' });
    const input = h('textarea', { rows: 3, placeholder: 'Peça uma alteração. Ex.: troque o título do topo, crie uma página de preços, deixe o botão verde…', 'aria-label': 'Pedido de alteração' });
    const sendBtn = h('button', { type: 'button', class: 'btn', onclick: () => edit(input.value) }, 'Enviar');
    const stopBtn = h('button', { type: 'button', class: 'btn ghost', onclick: stop }, 'Parar');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); edit(input.value); } });
    const composer = h('div', { class: 'stu-composer' }, input, h('div', { class: 'row' }, h('span', { class: 'sm mut grow' }, 'Enter envia · Shift+Enter quebra a linha'), stopBtn, sendBtn));

    const bubbleUser = (text, when) => h('div', { class: 'stu-msg me' }, h('p', text), when && h('time', dtt(when)));
    const list = (items, cls = '') => items.length ? h('ul', { class: 'stu-list ' + cls }, items.map((a) => h('li', a))) : null;
    function drawThread() {
      const plan = site.plan;
      const intro = site.brief?.details || site.brief?.businessName || '';
      const planActions = phase === 'planning' ? actionsOf(planText) : (plan?.actions || []);
      const parts = plan ? partOrder(plan) : [];
      const creating = phase === 'planning' || phase === 'building' || site.status !== 'ready';
      const partRow = (pid) => {
        const st = progress[pid]?.status || (site.parts?.[pid] ? 'done' : 'queued');
        return h('li', { class: 'stu-part ' + st }, h('i', { 'aria-hidden': 'true' }), h('span', partLabel(plan, pid)), h('small', { done: 'pronta', writing: 'escrevendo…', queued: 'na fila', error: 'falhou' }[st]));
      };
      const createBlock = h('div', { class: 'stu-msg ai' },
        h('div', { class: 'stu-who' }, h('span', { class: 'stu-dot' }), 'Neva Studio'),
        !plan && phase !== 'planning' && site.status !== 'ready' && h('p', 'Vou planejar a direção de arte, as cores, as fontes e as seções do seu site.'),
        planActions.length ? h('div', h('b', 'Plano do site'), list(planActions)) : phase === 'planning' && h('p', { class: 'stu-typing' }, 'Lendo o seu pedido e planejando…'),
        plan && h('div', h('b', `Seções (${parts.filter((p) => site.parts?.[p] || progress[p]?.status === 'done').length}/${parts.length})`), h('ul', { class: 'stu-parts' }, parts.map(partRow))),
        site.status === 'ready' && !creating && h('p', { class: 'stu-ok' }, icon('check'), ' Site pronto! Peça qualquer alteração abaixo.'),
        error && h('div', { class: 'stu-err' }, h('p', error), canWrite && phase === 'idle' && site.status !== 'ready' && h('button', { type: 'button', class: 'btn sm', onclick: generate }, 'Continuar criação')));
      const edits = versions.filter((v) => v.kind === 'edit' && v.instruction).slice().reverse();
      mount(thread,
        intro && bubbleUser(intro, site.created_at),
        createBlock,
        edits.map((v) => [bubbleUser(v.instruction, v.created_at), h('div', { class: 'stu-msg ai' }, h('div', { class: 'stu-who' }, h('span', { class: 'stu-dot' }), 'Neva Studio'),
          list(v.actions.filter((a) => !/^(Arquivo|Não aplicado)/.test(a))), list(v.actions.filter((a) => /^(Arquivo|Não aplicado)/.test(a)), 'files'))]),
        pending && [bubbleUser(pending), h('div', { class: 'stu-msg ai' }, h('div', { class: 'stu-who' }, h('span', { class: 'stu-dot run' }), 'Neva Studio'),
          actionsOf(editText).length ? list(actionsOf(editText)) : h('p', { class: 'stu-typing' }, 'Lendo os arquivos do site e preparando a alteração…'),
          filesReport(editText).length ? list(filesReport(editText), 'files') : null)]);
      thread.scrollTop = thread.scrollHeight; requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
      const ready = site.status === 'ready';
      input.disabled = !canWrite || !ready || phase !== 'idle';
      sendBtn.disabled = input.disabled; stopBtn.hidden = phase === 'idle';
      drawTop();
    }

    async function refresh() {
      const [s, v] = await Promise.all([api.get('/code-maker/' + id), api.get(`/code-maker/${id}/versions`)]);
      site = s.site; versions = v.items;
      return site;
    }

    async function buildParts(current, signal) {
      const missing = partOrder(current.plan).filter((p) => !current.parts[p]);
      if (!missing.length) { if (current.status !== 'ready') await api.post('/code-maker', { action: 'finish', site_id: id }); return true; }
      phase = 'building';
      progress = Object.fromEntries(missing.map((p) => [p, { status: 'queued' }])); drawThread();
      let failed = 0;
      await runWithLimit(missing, PARALLEL_PARTS, async (pid) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (signal.aborted) return;
          progress[pid] = { status: 'writing' }; drawThread();
          try {
            await streamCM({ action: 'part', site_id: id, part_id: pid }, () => {}, signal);
            progress[pid] = { status: 'done' }; site.parts = { ...site.parts, [pid]: true };
            drawThread(); schedulePreview();
            return;
          } catch (e) {
            if (e.name === 'AbortError') return;
            if (/limite|sess[aã]o/i.test(e.message)) { error = e.message; break; }
          }
        }
        failed++; progress[pid] = { status: 'error' }; drawThread();
      });
      return failed === 0;
    }

    // Gera o site do zero ou continua de onde parou (plano pronto, partes faltando).
    async function generate() {
      if (busy || !canWrite) return;
      busy = true; controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      error = null; progress = {};
      try {
        let current = site;
        if (!current.plan) {
          phase = 'planning'; planText = ''; drawThread();
          await streamCM({ action: 'plan', site_id: id }, (t) => { planText = t; drawThread(); }, signal);
          current = await refresh(); schedulePreview();
        }
        if (current?.plan) {
          const ok = await buildParts(current, signal);
          current = await refresh();
          if (current.status === 'ready' && !signal.aborted) toast('Seu site está pronto!', 'ok');
          if (!ok && !signal.aborted) error ||= 'Algumas partes não ficaram prontas. Clique em "Continuar criação" para terminar.';
        }
      } catch (e) {
        if (e.name !== 'AbortError') { error = e.message; await refresh().catch(() => {}); }
      } finally {
        busy = false; if (!signal.aborted) phase = 'idle';
        if (!disposed) { drawThread(); loadPreview(); }
      }
    }

    async function edit(text) {
      const instruction = String(text || '').trim();
      if (!instruction || busy || site.status !== 'ready') return;
      busy = true; controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      error = null; phase = 'editing'; pending = instruction; editText = ''; input.value = ''; drawThread();
      try {
        await streamCM({ action: 'edit', site_id: id, instruction }, (t) => { editText = t; drawThread(); }, signal);
        await refresh(); loadPreview();
      } catch (e) {
        if (e.name !== 'AbortError') { toast(e.message, 'err'); input.value = instruction; }
      } finally {
        busy = false; pending = null; if (!signal.aborted) phase = 'idle';
        if (!disposed) drawThread();
      }
    }

    function stop() {
      controller?.abort(); busy = false; phase = 'idle'; pending = null;
      refresh().then(() => { drawThread(); loadPreview(); }).catch(() => {});
    }

    function openVersions() {
      const kinds = { create: 'Criação', edit: 'Alteração', restore: 'Restaurada' };
      const body = h('div', { class: 'stu-versions' }, versions.map((v, i) => h('div', { class: 'stu-ver' },
        h('div', h('b', kinds[v.kind] || v.kind), i === 0 && h('span', { class: 'chip' }, 'atual'), h('div', { class: 'sm mut' }, dtt(v.created_at)), v.instruction && h('p', { class: 'sm' }, v.instruction)),
        i > 0 && canWrite && h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
          if (!await confirmBox('O site volta a ficar como estava nesta versão. A versão atual continua guardada no histórico.', 'Restaurar')) return;
          try { await api.post('/code-maker', { action: 'restore', site_id: id, version_id: v.id }); await refresh(); m.close(); drawThread(); loadPreview(); toast('Versão restaurada.', 'ok'); } catch (e) { fail(e); }
        } }, 'Restaurar'))));
      const m = modal({ title: 'Versões do site', size: 'md', body, actions: [{ label: 'Fechar', kind: 'ghost' }] });
    }

    const stage = h('div', { class: 'stu-stage', dataset: { device } }, empty, frame);
    frame.hidden = true;
    box.classList.add('fill');
    mount(box, h('div', { class: 'stu' },
      h('header', { class: 'stu-top' }, h('a', { href: '#/sites', class: 'stu-back', 'aria-label': 'Voltar aos sites' }, '←'), nameEl, statusEl, h('span', { class: 'grow' }), pageSel, devBtns, actionsEl),
      h('div', { class: 'stu-body' },
        h('aside', { class: 'stu-chat' }, thread, composer),
        h('section', { class: 'stu-view' }, stage))));
    drawThread();
    loadPreview();
    // Como no Lovable: abriu um site ainda não terminado, a criação começa (ou continua) sozinha.
    if (site.status !== 'ready' && canWrite) generate();
    return () => { disposed = true; controller?.abort(); clearTimeout(previewTimer); window.removeEventListener('message', onMsg); };
  }
};
