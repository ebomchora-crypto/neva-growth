import { api, ApiError } from '../api.js';
import { h, mount, toast, fail, icon, modal, confirmBox, dtt, debounce } from '../ui.js';
import { modelSelector } from '../model-selector.js';
import { diffReview, hunksOf } from '../diff-review.js';

// A IA vai contando o que faz, como o Claude: frases curtas (com variações) ligadas às etapas reais da criação.
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const SAY = {
  start: ['Vou começar agora a criação do seu site.', 'Bora lá! Vou começar a montar o seu site agora.', 'Certo, vou criar o seu site a partir do seu pedido.', 'Começando a criação do seu site agora mesmo.'],
  resume: ['Vou continuar de onde o site parou.', 'Retomando a criação de onde parou.', 'Vou terminar as partes que ficaram faltando.'],
  planned: ['Plano pronto. Agora vou escrever cada parte do site.', 'Já sei o caminho. Partindo para as seções.', 'Direção definida! Agora vou escrever as seções.'],
  notice: ['Percebi que ainda falta uma coisa.', 'Opa, uma parte não ficou como eu queria.', 'Encontrei um detalhe para ajustar.', 'Uma seção precisa de mais uma passada.'],
  done: ['Pronto! Está feito, aqui o link já publicado:', 'Prontinho! Seu site já está no ar:', 'Tudo certo! O site está publicado neste link:'],
  editStart: ['Vou fazer essa alteração.', 'Certo, vou mexer nisso agora.', 'Entendi! Vou ajustar o site.', 'Beleza, já vou alterar.'],
  editDone: ['Pronto! Alteração feita. Confira abaixo o que mudou em cada arquivo.', 'Feito! Abaixo está cada arquivo que mudou — aceite ou desfaça o que quiser.', 'Alteração aplicada. Revise as mudanças por arquivo logo abaixo.'],
  live: ['O site publicado já está atualizado:', 'Já está no ar com a mudança:']
};
const ACT = {
  think: ['pensando', 'lendo o seu pedido', 'entendendo o negócio'],
  context: ['criando contexto', 'analisando o pedido com calma', 'pensando na direção de arte'],
  plan: ['planejando cores, fontes e seções', 'definindo a direção de arte', 'desenhando a estrutura do site'],
  part: ['criando', 'escrevendo', 'montando'],
  fixed: ['executando ação', 'preparando'],
  fix: ['corrigindo', 'refazendo', 'ajustando'],
  more: ['continuando de onde parei', 'escrevendo o restante'],
  review: ['revisando o texto', 'conferindo com o seu pedido', 'lendo de novo com olhar crítico'],
  finish: ['preparando', 'juntando tudo', 'conferindo o site montado'],
  publish: ['publicando', 'colocando no ar'],
  read: ['lendo os arquivos do site', 'abrindo os arquivos do site'],
  exec: ['executando ação', 'aplicando a alteração'],
  check: ['conferindo o resultado', 'conferindo cada arquivo']
};

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
const noEtapa = (t) => t.replace(/<etapa>[^<]*<\/etapa>\n?/g, '');
// Junta a continuação sem repetir o trecho que a IA reescreve no começo.
function joinContinuation(previous, next) {
  let addition = next.replace(/^\s*```html[^\S\n]*\n?/i, '');
  const max = Math.min(600, previous.length, addition.length);
  for (let size = max; size >= 12; size--) if (previous.endsWith(addition.slice(0, size))) { addition = addition.slice(size); break; }
  return previous + addition;
}
async function streamCM(body, onText, signal, onRound) {
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
    const st0 = await api.get('/integrations/status').catch(() => ({ ai: {} }));
    const selector = modelSelector({ models: st0.ai?.models, defaultModel: st0.ai?.defaultModel, theme: 'light', placement: 'up' });
    const composer = h('div', { class: 'stu-composer' }, input, h('div', { class: 'row' }, selector.el, h('span', { class: 'grow' }), stopBtn, sendBtn));

    // Narração ao vivo: cada entrada é uma frase ("say") ou uma ação em andamento ("act", em itálico com indicador).
    let log = []; let editLog = [];
    const liveLink = () => `${location.origin}/s/${site.slug}/`;
    const push = (list, entry) => { list.push(entry); drawThread(); return entry; };
    const say = (list, text, link) => push(list, { t: 'say', text, link });
    const act = (list, text) => {
      const e = push(list, { t: 'act', text, st: 'run' });
      return { done: (t) => { if (t) e.text = t; e.st = 'done'; drawThread(); }, fail: () => { e.st = 'fail'; drawThread(); } };
    };
    const narration = (list) => h('ul', { class: 'stu-log' }, list.map((e) => e.t === 'say'
      ? h('li', { class: 'say' }, h('p', e.text), e.link && h('a', { class: 'stu-link', href: e.link, target: '_blank', rel: 'noopener' }, icon('globe'), e.link))
      : e.t === 'list' ? h('li', { class: 'lst' }, e.title && h('b', e.title), h('ul', { class: 'stu-list' }, e.items.map((x) => h('li', x))))
        : h('li', { class: 'act ' + e.st }, h('i', { 'aria-hidden': 'true' }), h('em', `${e.text}${e.st === 'run' ? '…' : ''}`))));

    // Revisão da última alteração (arquivos que mudaram, aceitar/rejeitar/desfazer por arquivo).
    let review = null; // { version, el }
    async function loadReview() {
      try {
        const c = await api.get(`/code-maker/${id}/changes`);
        if (!c.version_id || !c.files.length) { review = null; return; }
        if (review?.version === c.version_id) return;
        const files = c.files.map((f) => ({ path: f.path, created: f.created, hunks: hunksOf(f.before, f.after) }));
        const initial = Object.fromEntries(c.files.filter((f) => f.state === 'rejected').map((f) => [f.path, 'rejected']));
        const note = h('p', { class: 'stu-revnote', hidden: true });
        const apply = debounce(async (dec) => {
          const rejected = Object.entries(dec).filter(([, v]) => v === 'rejected').map(([k]) => k);
          note.hidden = false; note.textContent = 'Atualizando o site…';
          try { await api.post('/code-maker', { action: 'review', site_id: id, version_id: c.version_id, rejected }); await refresh(); loadPreview(); note.textContent = rejected.length ? `${rejected.length} arquivo(s) desfeito(s). A prévia e o site publicado já mostram isso.` : 'Todas as mudanças mantidas.'; }
          catch (e) { note.textContent = e.message; }
        }, 350);
        const dr = diffReview(files, { initial, onChange: (_acc, dec) => apply(dec) });
        review = { version: c.version_id, el: h('div', { class: 'stu-review' }, dr.el, note) };
      } catch { review = null; }
    }

    const bubbleUser = (text, when) => h('div', { class: 'stu-msg me' }, h('p', text), when && h('time', dtt(when)));
    const list = (items, cls = '') => items.length ? h('ul', { class: 'stu-list ' + cls }, items.map((a) => h('li', a))) : null;
    const who = (running) => h('div', { class: 'stu-who' }, h('span', { class: 'stu-dot' + (running ? ' run' : '') }), 'Neva Studio');
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
      const createBlock = h('div', { class: 'stu-msg ai' }, who(phase === 'planning' || phase === 'building'),
        log.length ? narration(log) : !plan && site.status !== 'ready' && h('p', 'Vou planejar a direção de arte, as cores, as fontes e as seções do seu site.'),
        !log.length && planActions.length ? h('div', { class: 'stu-plan' }, h('b', 'Plano do site'), list(planActions)) : null,
        log.length && phase === 'planning' && planActions.length ? h('div', { class: 'stu-plan' }, h('b', 'Plano do site'), list(planActions)) : null,
        plan && creating && h('div', h('b', `Seções (${parts.filter((p) => site.parts?.[p] || progress[p]?.status === 'done').length}/${parts.length})`), h('ul', { class: 'stu-parts' }, parts.map(partRow))),
        site.status === 'ready' && !creating && !log.length && h('div', h('p', { class: 'stu-ok' }, icon('check'), ' Site pronto! Peça qualquer alteração abaixo.'),
          site.published && h('a', { class: 'stu-link', href: liveLink(), target: '_blank', rel: 'noopener' }, icon('globe'), liveLink())),
        error && h('div', { class: 'stu-err' }, h('p', error), canWrite && phase === 'idle' && site.status !== 'ready' && h('button', { type: 'button', class: 'btn sm', onclick: generate }, 'Continuar criação')));
      const edits = versions.filter((v) => v.kind === 'edit' && v.instruction).slice().reverse();
      const lastEditId = edits.length ? edits[edits.length - 1].id : null;
      mount(thread,
        intro && bubbleUser(intro, site.created_at),
        createBlock,
        edits.map((v) => {
          const live = !pending && v.id === lastEditId && editLog.length;
          return [bubbleUser(v.instruction, v.created_at), h('div', { class: 'stu-msg ai' }, who(false),
            live ? narration(editLog) : list(v.actions.filter((a) => !/^(Arquivo|Não aplicado)/.test(a))),
            !(review && v.id === lastEditId && !pending) && list(v.actions.filter((a) => /^(Arquivo|Não aplicado)/.test(a)), 'files'),
            review && v.id === lastEditId && !pending ? review.el : null)];
        }),
        pending && [bubbleUser(pending), h('div', { class: 'stu-msg ai' }, who(true), narration(editLog),
          actionsOf(editText).length ? list(actionsOf(editText)) : null)]);
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
        const label = partLabel(current.plan, pid).toLowerCase();
        const fixed = pid === 'header' || pid === 'footer';
        for (let attempt = 0; attempt < 2; attempt++) {
          if (signal.aborted) return;
          progress[pid] = { status: 'writing' };
          const step = attempt === 0 ? act(log, `${pick(fixed ? ACT.fixed : ACT.part)}: ${label}`) : act(log, `${pick(ACT.fix)}: ${label}`);
          try {
            let more = null; let review = null;
            await streamCM({ action: 'part', site_id: id, part_id: pid, ...selector.get() }, (t) => {
              if (!review && /<etapa>revisao<\/etapa>/.test(t)) review = act(log, `${pick(ACT.review)} (${label})`);
            }, signal, () => { more ||= act(log, `${pick(ACT.more)} (${label})`); });
            more?.done(); review?.done();
            step.done(); progress[pid] = { status: 'done' }; site.parts = { ...site.parts, [pid]: true };
            drawThread(); schedulePreview();
            return;
          } catch (e) {
            step.fail();
            if (e.name === 'AbortError') return;
            if (/limite|sess[aã]o/i.test(e.message)) { error = e.message; break; }
            if (attempt === 0) say(log, pick(SAY.notice));
          }
        }
        failed++; progress[pid] = { status: 'error' }; drawThread();
      });
      return failed === 0;
    }

    async function publishNow() {
      if (site.published) return true;
      const step = act(log, pick(ACT.publish));
      try { const p = await api.post(`/projects/${id}/publish`, { published: true }); site.published = Boolean(p.published); step.done(); return site.published; }
      catch (e) { step.fail(); say(log, `Não consegui publicar agora (${e.message}). Use o botão Publicar no topo.`); return false; }
    }

    // Gera o site do zero ou continua de onde parou (plano pronto, partes faltando).
    async function generate() {
      if (busy || !canWrite) return;
      busy = true; controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      error = null; progress = {}; log = [];
      say(log, pick(site.plan ? SAY.resume : SAY.start));
      try {
        let current = site;
        if (!current.plan) {
          phase = 'planning'; planText = '';
          let thinking = act(log, pick(ACT.think)); let context = null; let planning = null;
          await streamCM({ action: 'plan', site_id: id, ...selector.get() }, (t) => {
            if (/<etapa>analise<\/etapa>/.test(t) && !context) { thinking?.done(); thinking = null; context = act(log, pick(ACT.context)); }
            if (/<etapa>plano<\/etapa>/.test(t) && context && !planning) { context.done(); planning = act(log, pick(ACT.plan)); }
            if (!planning && !context && /<acoes>/i.test(t)) { thinking?.done(); thinking = null; planning = act(log, pick(ACT.plan)); }
            planText = noEtapa(t); drawThread();
          }, signal, () => act(log, pick(ACT.more)).done());
          thinking?.done(); context?.done(); planning?.done();
          current = await refresh(); schedulePreview();
          if (current.plan?.actions?.length) push(log, { t: 'list', title: 'Plano do site', items: current.plan.actions });
          say(log, pick(SAY.planned));
        }
        if (current?.plan) {
          const ok = await buildParts(current, signal);
          if (ok && !signal.aborted) {
            const fin = act(log, pick(ACT.finish));
            current = await refresh();
            if (current.status !== 'ready') { await api.post('/code-maker', { action: 'finish', site_id: id }).catch(() => {}); current = await refresh(); }
            fin.done();
          } else current = await refresh();
          if (current.status === 'ready' && !signal.aborted) {
            if (await publishNow()) say(log, pick(SAY.done), liveLink());
            toast('Seu site está pronto!', 'ok');
          }
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
      error = null; phase = 'editing'; pending = instruction; editText = ''; input.value = ''; review = null; editLog = [];
      say(editLog, pick(SAY.editStart));
      let reading = act(editLog, pick(ACT.read)); let context = null; let exec = null;
      try {
        await streamCM({ action: 'edit', site_id: id, instruction, ...selector.get() }, (t) => {
          if (/<etapa>analise<\/etapa>/.test(t) && !context) { reading?.done(); reading = null; context = act(editLog, pick(ACT.context)); }
          const body = noEtapa(t);
          if (!exec && body.trim()) { reading?.done(); reading = null; context?.done(); exec = act(editLog, pick(ACT.exec)); }
          editText = body; drawThread();
        }, signal, () => act(editLog, pick(ACT.more)).done());
        reading?.done(); context?.done(); exec?.done();
        const check = act(editLog, pick(ACT.check));
        await refresh(); await loadReview(); loadPreview(); check.done();
        const done = versions.find((v) => v.kind === 'edit' && v.instruction === instruction);
        const items = (done?.actions || []).filter((a) => !/^(Arquivo|Não aplicado)/.test(a));
        if (items.length) push(editLog, { t: 'list', title: 'O que eu fiz', items });
        say(editLog, review ? pick(SAY.editDone) : 'Pronto! Alteração feita.');
        if (site.published) say(editLog, pick(SAY.live), liveLink());
      } catch (e) {
        reading?.fail(); exec?.fail();
        if (e.name !== 'AbortError') { toast(e.message, 'err'); input.value = instruction; editLog = []; }
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
      const kinds = { create: 'Criação', edit: 'Alteração', restore: 'Restaurada', review: 'Revisão' };
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
    // Como no Lovable: a tela do Studio tem tamanho fixo (a página não rola; só a conversa e o site dentro da prévia).
    document.documentElement.classList.add('studio-lock');
    const root = h('div', { class: 'stu', dataset: { tab: 'view' } });
    const tabs = h('div', { class: 'stu-tabs', role: 'tablist' }, [['chat', 'Conversa'], ['view', 'Prévia']].map(([k, l]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === 'view'), onclick: (e) => { root.dataset.tab = k; tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget))); } }, l)));
    root.append(
      h('header', { class: 'stu-top' }, h('a', { href: '#/sites', class: 'stu-back', 'aria-label': 'Voltar aos sites' }, '←'), nameEl, statusEl, h('span', { class: 'grow' }), pageSel, devBtns, actionsEl),
      tabs,
      h('div', { class: 'stu-body' },
        h('aside', { class: 'stu-chat' }, thread, composer),
        h('section', { class: 'stu-view' }, stage)));
    mount(box, root);
    drawThread();
    loadPreview();
    if (site.status === 'ready') loadReview().then(() => { if (!disposed) drawThread(); });
    // Como no Lovable: abriu um site ainda não terminado, a criação começa (ou continua) sozinha.
    if (site.status !== 'ready' && canWrite) generate();
    return () => { disposed = true; document.documentElement.classList.remove('studio-lock'); controller?.abort(); clearTimeout(previewTimer); window.removeEventListener('message', onMsg); };
  }
};
