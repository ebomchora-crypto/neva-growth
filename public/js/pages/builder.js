// Builder com IA (Neva Code): conversa estilo chat para criar e alterar sites. À esquerda, os seus sites como conversas;
// no meio, a conversa com o agente (etapas ao vivo, plano, revisão de alterações por arquivo); à direita, a prévia.
// A criação usa o mesmo motor do Studio (plano → seções em paralelo → montagem → publicação) e o DESIGN.md da Neva;
// a direção de arte vem do DESIGN.md da Neva e de referências escolhidas automaticamente pelo agente.
import { api } from '../api.js';
import { h, mount, toast, fail, icon, modal, confirmBox, dtt, debounce } from '../ui.js';
import { composer } from '../neva-code/composer.js';
import { contextMeter } from '../neva-code/context-meter.js';
import { agentSteps } from '../neva-code/agent-steps.js';
import { diffReview, hunksOf } from '../diff-review.js';
import { composeDetails } from '../attach.js';
import { PARALLEL_PARTS, noEtapa, streamCM, actionsOf, partOrder, partLabel, runWithLimit, frameDoc } from '../site-stream.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const SAY = {
  start: ['Vou criar o seu site agora. Primeiro leio o pedido e defino a direção de arte; depois escrevo cada seção.', 'Certo! Começo pela direção de arte e pela estrutura, e depois escrevo as seções em paralelo.'],
  resume: ['Vou continuar de onde o site parou.', 'Retomando a criação: vou terminar as partes que faltam.'],
  done: ['Pronto! O site está no ar:', 'Prontinho, já publicado:'],
  editStart: ['Vou fazer essa alteração.', 'Certo, vou mexer nisso agora.', 'Entendi. Vou ajustar o site.'],
  editDone: ['Feito. Revise abaixo o que mudou em cada arquivo; dá para desfazer arquivo por arquivo.', 'Alteração aplicada. Confira cada arquivo abaixo e desfaça o que não quiser.'],
};
const IDEAS = [
  { t: 'Clínica odontológica', d: 'Site para clínica odontológica em Curitiba, com tratamentos, equipe, depoimentos e agendamento pelo WhatsApp.' },
  { t: 'Advocacia', d: 'Site institucional sóbrio para escritório de advocacia trabalhista em São Paulo, com áreas de atuação, sócios e contato.' },
  { t: 'Hamburgueria', d: 'Landing page para hamburgueria artesanal com cardápio, combos, horário, localização e pedido pelo WhatsApp.' },
  { t: 'SaaS', d: 'Landing page para um software de agendamento online, com recursos, planos e preços, perguntas frequentes e teste grátis.' },
];
const STAT = { ready: ['Pronto', 'ok'], building: ['Criando', 'run'], planning: ['Criando', 'run'], error: ['Parou', 'bad'] };
const day = (s) => { const d = new Date(String(s || '').replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z')); return isNaN(d) ? 0 : d.getTime(); };
const markSvg = () => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = '<path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6z" fill="currentColor"/>'; return s; };

export default {
  async render(box, ctx) {
    const id = Number(ctx.params?.[0]) || null;
    const canWrite = ctx.user.role !== 'viewer';
    const st = await api.get('/integrations/status').catch(() => ({ ai: {} }));
    const builderOn = st.builder?.configured ?? st.ai?.configured;
    let disposed = false;

    // ---------------- barra lateral: os sites como conversas
    let sites = [];
    const listEl = h('nav', { class: 'nc-list', 'aria-label': 'Seus sites' });
    const search = h('input', { type: 'search', class: 'nc-search', placeholder: 'Buscar nos seus sites', 'aria-label': 'Buscar nos seus sites', oninput: () => drawList() });
    function drawList() {
      const q = search.value.trim().toLowerCase();
      const items = sites.filter((p) => !q || p.name.toLowerCase().includes(q));
      if (!items.length) { mount(listEl, h('p', { class: 'nc-none' }, sites.length ? 'Nenhum site com esse nome.' : 'Seus sites aparecem aqui, como conversas.')); return; }
      const now = Date.now(); const groups = [['Hoje', []], ['Últimos 7 dias', []], ['Mais antigos', []]];
      for (const p of items) { const age = now - day(p.updated_at || p.created_at); groups[age < 864e5 ? 0 : age < 6048e5 ? 1 : 2][1].push(p); }
      mount(listEl, groups.filter(([, l]) => l.length).map(([t, l]) => h('div', { class: 'nc-group' }, h('p', t), l.map((p) => {
        const [lab, cls] = p.published ? ['No ar', 'pub'] : STAT[p.cm_status] || ['Pronto', 'ok'];
        return h('div', { class: 'nc-item' + (p.id === id ? ' on' : '') },
          h('a', { href: '#/builder/' + p.id, title: p.name, 'aria-current': p.id === id ? 'page' : null }, h('i', { class: 'nc-st ' + cls, title: lab }), h('span', p.name)),
          canWrite && h('button', { type: 'button', class: 'nc-more', 'aria-label': `Opções de ${p.name}`, onclick: (e) => itemMenu(e.currentTarget, p) }, '⋯'));
      }))));
    }
    function itemMenu(btn, p) {
      document.querySelector('.nc-pop')?.remove();
      const close = () => { pop.remove(); document.removeEventListener('pointerdown', away); };
      const away = (e) => { if (!pop.contains(e.target) && e.target !== btn) close(); };
      const it = (label, fn, cls = '') => h('button', { type: 'button', role: 'menuitem', class: cls, onclick: () => { close(); fn(); } }, label);
      const pop = h('div', { class: 'nc-pop', role: 'menu' },
        it('Renomear', () => rename(p)),
        it('Duplicar', async () => { try { const r = await api.post(`/projects/${p.id}/duplicate`); toast('Cópia criada.', 'ok'); await loadSites(); if (r?.id) location.hash = '#/builder/' + r.id; } catch (e) { fail(e); } }),
        it('Abrir no editor de código', () => { location.hash = '#/ide/' + p.id; }),
        it('Excluir', async () => { if (!await confirmBox(`Excluir o site "${p.name}"? Isso não pode ser desfeito.`)) return; try { await api.del('/projects/' + p.id); toast('Site excluído.', 'ok'); if (p.id === id) location.hash = '#/builder'; else loadSites(); } catch (e) { fail(e); } }, 'bad'));
      btn.parentElement.append(pop); document.addEventListener('pointerdown', away);
    }
    function rename(p) {
      const input = h('input', { value: p.name, maxlength: 80, 'aria-label': 'Nome do site' });
      modal({ title: 'Renomear site', body: h('label', { class: 'field' }, h('span', 'Nome'), input), actions: [{ label: 'Cancelar', kind: 'ghost' },
        { label: 'Salvar', onClick: async () => { await api.put('/projects/' + p.id, { name: input.value }); toast('Nome atualizado.', 'ok'); await loadSites(); if (p.id === id && site) { site.name = input.value; drawTop(); } } }] });
    }
    async function loadSites() {
      try { sites = (await api.get('/projects')).items.filter((p) => p.studio).sort((a, b) => day(b.updated_at || b.created_at) - day(a.updated_at || a.created_at)); } catch (e) { fail(e); }
      if (!disposed) drawList();
    }
    const side = h('aside', { class: 'nc-side' },
      h('div', { class: 'nc-brand' }, h('span', { class: 'nc-mark' }, markSvg()), h('b', 'Neva Code'), h('button', { type: 'button', class: 'nc-x', 'aria-label': 'Fechar lista', onclick: () => root.classList.remove('side-open') }, icon('x'))),
      h('a', { class: 'nc-new', href: '#/builder', onclick: () => root.classList.remove('side-open') }, icon('plus'), 'Novo site'),
      search, listEl,
      h('a', { class: 'nc-refs', href: '#/design' }, icon('palette'), 'Referências de design'));

    // ---------------- caixa de pedido + medidor de contexto
    const meter = contextMeter();
    const refreshMeter = debounce(async () => {
      try { meter.set(await api.get('/code-maker/context', { ...(id ? { site_id: id } : {}), })); } catch { /* sem medidor */ }
    }, 250);
    const cp = composer({
      models: st.ai?.models, defaultModel: st.ai?.defaultModel, disabled: !builderOn || !canWrite, meter,
      placeholder: id ? 'Peça uma alteração. Digite / para comandos' : 'Descreva o site que você quer. Digite / para comandos',
      upload: (dataUrl, name) => api.post('/code-maker/images', { dataUrl, name }),
      onSubmit: (text, meta) => (id ? edit(text, meta) : create(text, meta)),
      onStop: () => stop(),
    });

    // ---------------- tela inicial (sem site aberto)
    async function create(text, meta) {
      if (!text && !meta.files.length) { cp.shake(); return false; }
      const typed = (meta.command?.prefix || '') + (text || 'Crie o site com base nos arquivos anexados.');
      cp.setResponding(true);
      try {
        const r = await api.post('/code-maker', { action: 'create', brief: { details: composeDetails(typed, meta.files), style: 'auto' }, assets: meta.assets, model: meta.model, effort: meta.effort });
        if (r?.attachments?.length) toast(r.attachments.join(' '), 'ok');
        location.hash = '#/builder/' + r.site.id;
        return true;
      } catch (e) { fail(e); return false; } finally { cp.setResponding(false); }
    }
    function welcome() {
      const name = ctx.user.name.split(' ')[0];
      return h('div', { class: 'nc-welcome' },
        h('div', { class: 'nc-hello' }, h('span', { class: 'nc-kicker' + (builderOn ? '' : ' off') }, h('i'), builderOn ? 'Agente de sites pronto' : 'IA indisponível: configure CODEMAKER_API_KEY ou RIVER_API_KEY'),
          h('h1', `${name}, que site vamos construir?`),
          h('p', 'Converse como num chat: descreva o negócio e anexe fotos e logo. O agente escolhe a direção de arte, escreve, publica, e você ajusta pedindo.')),
        cp.el,
        h('div', { class: 'nc-ideas' }, IDEAS.map((i) => h('button', { type: 'button', class: 'nc-idea', onclick: () => { cp.setValue(i.d); cp.focus(); } }, h('b', i.t), h('span', i.d)))));
    }

    // ---------------- conversa (site aberto)
    let site = null; let versions = []; let stages = null; let stageTimer = null;
    let phase = 'idle'; let controller = null; let busy = false; let error = null;
    let log = []; let planText = ''; let editRun = null; let review = null; let progress = {};
    const thread = h('div', { class: 'nc-thread', 'aria-live': 'polite' });
    const createSteps = agentSteps({ title: 'Preparando a criação' });
    const nameEl = h('b', { class: 'nc-name' }); const statusEl = h('span', { class: 'nc-status' }); const actsEl = h('div', { class: 'nc-acts' });

    async function refresh() {
      const [s, v] = await Promise.all([api.get('/code-maker/' + id), api.get(`/code-maker/${id}/versions`)]);
      site = s.site; versions = v.items; return site;
    }
    async function loadStages() { try { stages = await api.get(`/code-maker/${id}/progress`); } catch { /* mantém */ } if (!disposed) drawThread(); return stages; }
    function pollStages() {
      clearInterval(stageTimer); loadStages();
      stageTimer = setInterval(async () => { if (disposed) return clearInterval(stageTimer); const s = await loadStages(); if (s?.finished || s?.status === 'error') clearInterval(stageTimer); }, 2500);
    }
    const say = (text, link) => { log.push({ t: 'say', text, link }); drawThread(); };
    // Ações ao vivo viram as linhas de log do passo em andamento.
    const act = (text) => { const e = { t: 'act', text, st: 'run' }; log.push(e); drawThread(); return { done: () => { e.st = 'done'; drawThread(); }, fail: () => { e.st = 'fail'; drawThread(); } }; };
    function stepsFromServer() {
      if (!stages?.stages?.length) return [];
      const lines = log.filter((e) => e.t === 'act').map((e) => e.text);
      return stages.stages.map((s) => {
        const status = s.status === 'skipped' ? 'done' : s.status === 'running' ? (phase === 'idle' && !busy ? 'error' : 'running') : s.status === 'error' ? 'error' : s.status === 'done' ? 'done' : 'pending';
        const extra = s.key === 'code' && s.detail?.total ? ` (${s.detail.feitas}/${s.detail.total})` : '';
        return { id: s.key, label: s.label + extra + (s.status === 'skipped' ? ' · não disponível aqui' : ''), status, ms: s.ms ?? undefined, detail: status === 'running' ? lines.slice(-6) : undefined };
      });
    }
    const userMsg = (text, when, designs) => {
      const cut = String(text).indexOf('\n\n=== '); const shown = cut > 0 ? String(text).slice(0, cut) : text;
      return h('div', { class: 'nc-msg me' }, h('div', { class: 'nc-bubble' }, h('p', shown),
        (cut > 0 || designs?.length > 0) && h('div', { class: 'nc-meta' }, cut > 0 && h('span', icon('file'), 'arquivos anexados'), (designs || []).map((d) => h('span', icon('palette'), d.title)))), when && h('time', dtt(when)));
    };
    const aiMsg = (...kids) => h('div', { class: 'nc-msg ai' }, h('span', { class: 'nc-av', 'aria-hidden': 'true' }, markSvg()), h('div', { class: 'nc-body' }, ...kids));
    const bullet = (items, title) => items?.length ? h('div', { class: 'nc-card' }, title && h('b', title), h('ul', items.map((a) => h('li', a)))) : null;
    const linkCard = (url) => h('a', { class: 'nc-live', href: url, target: '_blank', rel: 'noopener' }, icon('globe'), h('span', url.replace(/^https?:\/\//, '')), icon('external'));
    const liveLink = () => `${location.origin}/s/${site.slug}/`;
    const says = (list) => list.filter((e) => e.t === 'say').map((e) => [h('p', e.text), e.link && linkCard(e.link)]);

    function drawThread() {
      if (!site) return;
      const creating = phase === 'planning' || phase === 'building' || site.status !== 'ready';
      const steps = stepsFromServer(); createSteps.set(steps);
      const planActions = phase === 'planning' ? actionsOf(planText) : (site.plan?.actions || []);
      const createBlock = aiMsg(
        ...(log.length ? says(log.filter((e, i) => i === 0 || e.t === 'say')) : [h('p', site.status === 'ready' ? 'Criei o site a partir do seu pedido.' : 'Vou planejar a direção de arte, as cores, as fontes e as seções do seu site.')]),
        steps.length ? createSteps.el : null,
        bullet(planActions, 'Plano do site'),
        site.status === 'ready' && !creating && !log.length && site.published && linkCard(liveLink()),
        error && h('div', { class: 'nc-err' }, h('p', error), canWrite && phase === 'idle' && site.status !== 'ready' && h('button', { type: 'button', class: 'btn sm', onclick: generate }, 'Continuar criação')));
      const edits = versions.filter((v) => v.kind === 'edit' && v.instruction).slice().reverse();
      const lastId = edits.length ? edits[edits.length - 1].id : null;
      mount(thread, h('div', { class: 'nc-col' },
        userMsg(site.brief?.details || site.name, site.created_at),
        createBlock,
        edits.map((v) => {
          const live = editRun && !editRun.pending && editRun.version === v.id;
          return [userMsg(v.instruction, v.created_at), aiMsg(
            live ? editRun.steps.el : null,
            live ? says(editRun.log) : null,
            bullet(v.actions.filter((a) => !/^(Arquivo|Não aplicado|Revisão|Desfeito)/.test(a)), 'O que eu fiz'),
            review && v.id === lastId ? review.el : bullet(v.actions.filter((a) => /^(Arquivo|Não aplicado)/.test(a)), 'Arquivos'))];
        }),
        editRun?.pending && [userMsg(editRun.pending), aiMsg(editRun.steps.el, says(editRun.log), bullet(actionsOf(editRun.text), 'Plano da alteração'))]));
      thread.scrollTop = thread.scrollHeight;
      cp.setDisabled(!builderOn || !canWrite || site.status !== 'ready' || phase !== 'idle');
      cp.setResponding(phase !== 'idle');
      drawTop();
    }

    // ---------------- topo e prévia
    let page = ''; let scrollY = 0; let device = 'desktop'; let previewSeq = 0; let previewTimer = null;
    const frame = h('iframe', { title: 'Prévia do site', sandbox: 'allow-scripts allow-forms allow-popups allow-modals', hidden: true });
    const emptyView = h('div', { class: 'nc-vempty' }, h('span', { class: 'nc-orbit' }), h('b', 'A prévia aparece aqui'), h('span', 'As seções surgem assim que ficam prontas.'));
    const pageSel = h('select', { class: 'nc-pages', 'aria-label': 'Página', hidden: true, onchange: () => { page = pageSel.value; scrollY = 0; loadPreview(); } });
    async function loadPreview() {
      if (!id) return; const seq = ++previewSeq;
      try {
        const d = await api.get(`/code-maker/${id}/document`, { page });
        if (seq !== previewSeq || disposed) return;
        emptyView.hidden = Boolean(d.html); frame.hidden = !d.html;
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
    const devs = h('div', { class: 'nc-dev', role: 'group', 'aria-label': 'Tamanho da prévia' });
    const stage = h('div', { class: 'nc-stage', dataset: { device } }, emptyView, frame);
    const drawDev = () => mount(devs, [['desktop', 'monitor', 'Computador'], ['tablet', 'tablet', 'Tablet'], ['mobile', 'phone', 'Celular']].map(([k, ic, l]) =>
      h('button', { type: 'button', class: device === k ? 'on' : '', title: l, 'aria-label': l, 'aria-pressed': String(device === k), onclick: () => { device = k; stage.dataset.device = k; drawDev(); } }, icon(ic))));
    drawDev();
    function drawTop() {
      if (!site) return;
      nameEl.textContent = site.name;
      const [lab, cls] = phase !== 'idle' ? [{ planning: 'Planejando', building: 'Escrevendo seções', editing: 'Alterando' }[phase], 'run'] : site.published ? ['No ar', 'pub'] : STAT[site.status] || ['Pronto', 'ok'];
      statusEl.className = 'nc-status ' + cls; statusEl.textContent = lab;
      const ready = site.status === 'ready';
      mount(actsEl,
        h('button', { type: 'button', class: 'nc-tb', disabled: !versions.length, onclick: openVersions, title: 'Versões' }, icon('clock'), h('span', 'Versões')),
        h('a', { class: 'nc-tb' + (ready ? '' : ' off'), href: ready ? '#/ide/' + id : undefined, title: 'Código' }, icon('code'), h('span', 'Código')),
        h('a', { class: 'nc-tb' + (ready ? '' : ' off'), href: ready ? `/api/projects/${id}/zip` : undefined, download: ready ? `${site.slug}.zip` : undefined, title: 'Baixar .zip' }, icon('download'), h('span', 'Baixar')),
        h('button', { type: 'button', class: 'nc-pub' + (site.published ? ' on' : ''), disabled: !ready || !canWrite || phase !== 'idle', onclick: togglePublish }, site.published ? 'Despublicar' : 'Publicar'));
    }
    async function togglePublish() {
      try { const p = await api.post(`/projects/${id}/publish`, { published: !site.published }); site.published = Boolean(p.published); drawTop(); drawThread(); loadSites(); toast(site.published ? 'Site publicado.' : 'Site despublicado.', 'ok'); } catch (e) { fail(e); }
    }
    function openVersions() {
      const kinds = { create: 'Criação', edit: 'Alteração', restore: 'Restaurada', review: 'Revisão' };
      const body = h('div', { class: 'stu-versions' }, versions.map((v, i) => h('div', { class: 'stu-ver' },
        h('div', h('b', kinds[v.kind] || v.kind), i === 0 && h('span', { class: 'chip' }, 'atual'), h('div', { class: 'sm mut' }, dtt(v.created_at)), v.instruction && h('p', { class: 'sm' }, String(v.instruction).split('\n\n=== ')[0])),
        i > 0 && canWrite && h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
          if (!await confirmBox('O site volta a ficar como estava nesta versão. A versão atual continua guardada no histórico.', 'Restaurar')) return;
          try { await api.post('/code-maker', { action: 'restore', site_id: id, version_id: v.id }); await refresh(); m.close(); review = null; drawThread(); loadPreview(); toast('Versão restaurada.', 'ok'); } catch (e) { fail(e); }
        } }, 'Restaurar'))));
      const m = modal({ title: 'Versões do site', size: 'md', body, actions: [{ label: 'Fechar', kind: 'ghost' }] });
    }

    // ---------------- revisão da última alteração (AI Diff Review)
    async function loadReview() {
      try {
        const c = await api.get(`/code-maker/${id}/changes`);
        if (!c.version_id || !c.files.length) { review = null; return; }
        if (review?.version === c.version_id) return;
        const files = c.files.map((f) => ({ path: f.path, created: f.created, hunks: hunksOf(f.before, f.after) }));
        const initial = Object.fromEntries(c.files.filter((f) => f.state === 'rejected').map((f) => [f.path, 'rejected']));
        const note = h('p', { class: 'nc-revnote', hidden: true });
        const apply = debounce(async (dec) => {
          const rejected = Object.entries(dec).filter(([, v]) => v === 'rejected').map(([k]) => k);
          note.hidden = false; note.textContent = 'Atualizando o site…';
          try { await api.post('/code-maker', { action: 'review', site_id: id, version_id: c.version_id, rejected }); await refresh(); loadPreview(); note.textContent = rejected.length ? `${rejected.length} arquivo(s) desfeito(s). A prévia e o site publicado já mostram isso.` : 'Todas as mudanças mantidas.'; }
          catch (e) { note.textContent = e.message; }
        }, 350);
        const dr = diffReview(files, { initial, onChange: (_a, dec) => apply(dec) });
        review = { version: c.version_id, el: h('div', { class: 'nc-review' }, dr.el, note) };
      } catch { review = null; }
    }

    // ---------------- criação (mesmo motor do Studio)
    async function buildParts(current, signal) {
      const missing = partOrder(current.plan).filter((p) => !current.parts[p]);
      if (!missing.length) { if (current.status !== 'ready') await api.post('/code-maker', { action: 'finish', site_id: id }); return true; }
      phase = 'building'; progress = Object.fromEntries(missing.map((p) => [p, 'queued'])); drawThread();
      let failed = 0;
      await runWithLimit(missing, PARALLEL_PARTS, async (pid) => {
        const label = partLabel(current.plan, pid).toLowerCase(); let lastError = '';
        for (let attempt = 0; attempt < 2; attempt++) {
          if (signal.aborted) return;
          const step = act(`${attempt ? 'refazendo' : 'escrevendo'}: ${label}`);
          try {
            await streamCM({ action: 'part', site_id: id, part_id: pid, ...cp.selection() }, () => {}, signal, () => act(`continuando: ${label}`).done());
            step.done(); progress[pid] = 'done'; site.parts = { ...site.parts, [pid]: true }; drawThread(); schedulePreview();
            return;
          } catch (e) {
            step.fail(); if (e.name === 'AbortError') return;
            lastError = String(e.message || 'erro desconhecido').slice(0, 180);
            if (/limite|sess[aã]o/i.test(lastError)) { error = lastError; break; }
          }
        }
        failed++; error ||= `Não consegui concluir ${label}: ${lastError}. Clique em "Continuar criação" para tentar de novo.`; drawThread();
      });
      return failed === 0;
    }
    async function generate() {
      if (busy || !canWrite) return;
      busy = true; controller?.abort(); controller = new AbortController(); const signal = controller.signal; pollStages();
      error = null; log = []; progress = {};
      say(pick(site.plan ? SAY.resume : SAY.start));
      try {
        let current = site;
        if (!current.plan) {
          phase = 'planning'; planText = '';
          let a = act('lendo o seu pedido'); let stageN = 0;
          await streamCM({ action: 'plan', site_id: id, ...cp.selection() }, (t) => {
            const n = /<etapa>revisao<\/etapa>/.test(t) ? 3 : /<etapa>plano<\/etapa>/.test(t) || /<acoes>/i.test(t) ? 2 : /<etapa>analise<\/etapa>/.test(t) ? 1 : 0;
            if (n > stageN) { a?.done(); stageN = n; a = act(['', 'pensando na direção de arte', 'definindo cores, fontes e seções', 'revisando o plano com o seu pedido'][n]); }
            planText = noEtapa(t); drawThread();
          }, signal, () => act('continuando o plano').done());
          a?.done(); current = await refresh(); schedulePreview();
        }
        if (current?.plan) {
          const ok = await buildParts(current, signal);
          if (ok && !signal.aborted) {
            const fin = act('juntando tudo e conferindo o site');
            current = await refresh();
            if (current.status !== 'ready') { await api.post('/code-maker', { action: 'finish', site_id: id }); current = await refresh(); }
            fin.done();
          } else current = await refresh();
          if (current.status === 'ready' && !signal.aborted) {
            if (!site.published) { try { const p = await api.post(`/projects/${id}/publish`, { published: true }); site.published = Boolean(p.published); } catch (e) { say(`Não consegui publicar agora (${e.message}). Use o botão Publicar no topo.`); } }
            if (site.published) say(pick(SAY.done), liveLink());
            toast('Seu site está pronto!', 'ok'); loadSites();
          }
          if (!ok && !signal.aborted) error ||= 'Algumas partes não ficaram prontas. Clique em "Continuar criação" para terminar.';
        }
      } catch (e) {
        if (e.name !== 'AbortError') { error = e.message; await refresh().catch(() => {}); }
      } finally {
        busy = false; if (!signal.aborted) phase = 'idle'; await loadStages(); refreshMeter();
        if (!disposed) { drawThread(); loadPreview(); }
      }
    }

    // ---------------- alteração por conversa
    const EDIT_STEPS = [['read', 'Lendo os arquivos do site'], ['think', 'Entendendo o pedido'], ['exec', 'Aplicando a alteração'], ['check', 'Conferindo o resultado']];
    async function edit(text, meta) {
      if (!site || site.status !== 'ready' || busy) return false;
      const typed = (meta.command?.prefix || '') + (text || 'Use os arquivos anexados para alterar o site.');
      const instruction = composeDetails(typed, meta.files);
      busy = true; controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      error = null; phase = 'editing'; review = null;
      const status = Object.fromEntries(EDIT_STEPS.map(([k]) => [k, 'pending'])); const lines = [];
      const run = { pending: text || `(${meta.files.length} anexo(s))`, text: '', log: [], steps: agentSteps({ title: 'Preparando a alteração' }), version: null };
      editRun = run;
      const paintSteps = () => run.steps.set(EDIT_STEPS.map(([k, l]) => ({ id: k, label: l, status: status[k], detail: status[k] === 'running' ? lines.slice(-6) : undefined })));
      const go = (k) => { for (const [kk] of EDIT_STEPS) { if (kk === k) break; if (status[kk] === 'running' || status[kk] === 'pending') status[kk] = 'done'; } status[k] = 'running'; paintSteps(); };
      run.log.push({ t: 'say', text: pick(SAY.editStart) }); go('read'); drawThread();
      try {
        await streamCM({ action: 'edit', site_id: id, instruction, assets: meta.assets, ...cp.selection() }, (t) => {
          if (/<etapa>analise<\/etapa>/.test(t) && status.think === 'pending') go('think');
          const body = noEtapa(t);
          const acts = actionsOf(body);
          if (body.trim() && status.exec === 'pending') go('exec');
          if (acts.length > lines.length) { lines.splice(0, lines.length, ...acts); paintSteps(); }
          run.text = body; drawThread();
        }, signal, () => lines.push('continuando de onde parei'));
        go('check'); await refresh(); await loadReview(); loadPreview();
        status.check = 'done'; paintSteps();
        const v = versions.find((x) => x.kind === 'edit' && x.instruction === instruction) || versions.find((x) => x.kind === 'edit');
        run.version = v?.id ?? null; run.pending = null;
        run.log.push({ t: 'say', text: review ? pick(SAY.editDone) : 'Pronto! Alteração feita.' });
        if (site.published) run.log.push({ t: 'say', text: 'O site publicado já está atualizado:', link: liveLink() });
        loadSites();
      } catch (e) {
        for (const [k] of EDIT_STEPS) if (status[k] === 'running') status[k] = 'error';
        paintSteps();
        if (e.name !== 'AbortError') {
          const msg = String(e.message || 'Erro inesperado.');
          const nothing = /^Nenhum arquivo foi alterado\.\s*/.test(msg) && !/formato quebrado/.test(msg);
          run.log.push({ t: 'say', text: nothing ? `Não precisei mexer nos arquivos. ${msg.replace(/^Nenhum arquivo foi alterado\.\s*/, '')}` : `Não consegui aplicar esta alteração: ${msg}` });
          if (!nothing) { run.log.push({ t: 'say', text: 'Seu pedido voltou para a caixa: pode enviar de novo ou explicar de outro jeito.' }); cp.setValue(text); }
        }
        // O pedido que falhou não vira versão: fica como bloco pendente com o motivo.
        run.pending = run.pending || text;
      } finally {
        busy = false; if (!signal.aborted) phase = 'idle'; refreshMeter();
        if (!disposed) drawThread();
      }
      return true;
    }
    function stop() {
      controller?.abort(); busy = false; phase = 'idle';
      if (editRun?.pending) editRun.log.push({ t: 'say', text: 'Parei aqui, como você pediu.' });
      refresh().then(() => { drawThread(); loadPreview(); }).catch(() => {});
    }

    // ---------------- montagem da tela
    const root = h('div', { class: 'nc' + (id ? ' has-site' : '') });
    const sideBtn = h('button', { type: 'button', class: 'nc-tb nc-sidebtn', 'aria-label': 'Abrir lista de sites', onclick: () => root.classList.add('side-open') }, icon('menu'));
    const viewBtn = h('button', { type: 'button', class: 'nc-tb nc-viewbtn', 'aria-pressed': 'true', onclick: () => { const on = !root.classList.contains('no-view'); root.classList.toggle('no-view', on); viewBtn.setAttribute('aria-pressed', String(!on)); } }, icon('layout'), h('span', 'Prévia'));
    const tabs = h('div', { class: 'nc-tabs', role: 'tablist' }, [['chat', 'Conversa'], ['view', 'Prévia']].map(([k, l]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === 'chat'), onclick: (e) => { root.dataset.tab = k; tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget))); } }, l)));
    root.dataset.tab = 'chat';
    box.classList.add('fill');
    document.documentElement.classList.add('studio-lock');

    if (!id) {
      root.replaceChildren(side, h('section', { class: 'nc-main' }, h('header', { class: 'nc-top slim' }, sideBtn), h('div', { class: 'nc-scroll' }, welcome())), h('div', { class: 'nc-scrim', onclick: () => root.classList.remove('side-open') }));
      mount(box, root);
      cp.focus();
    } else {
      try { await refresh(); } catch (e) { mount(box, h('div', { class: 'empty' }, h('b', 'Site não encontrado.'), h('a', { href: '#/builder' }, 'Voltar ao Builder'))); document.documentElement.classList.remove('studio-lock'); return () => {}; }
      root.replaceChildren(side,
        h('section', { class: 'nc-main' },
          h('header', { class: 'nc-top' }, sideBtn, h('div', { class: 'nc-title' }, nameEl, statusEl), h('span', { class: 'grow' }), actsEl, viewBtn),
          tabs,
          h('div', { class: 'nc-split' },
            h('div', { class: 'nc-chat' }, thread, h('div', { class: 'nc-dock' }, cp.el)),
            h('section', { class: 'nc-view' }, h('div', { class: 'nc-vbar' }, devs, pageSel, h('span', { class: 'grow' }), h('button', { type: 'button', class: 'nc-tb', title: 'Recarregar prévia', 'aria-label': 'Recarregar prévia', onclick: loadPreview }, icon('refresh')), site.published && h('a', { class: 'nc-tb', href: liveLink(), target: '_blank', rel: 'noopener', title: 'Abrir site publicado' }, icon('external'))), stage))),
        h('div', { class: 'nc-scrim', onclick: () => root.classList.remove('side-open') }));
      mount(box, root);
      drawThread(); loadPreview();
      if (site.status === 'ready') loadReview().then(() => { if (!disposed) drawThread(); });
      loadStages();
      if (site.status !== 'ready' && canWrite && builderOn) generate();
    }
    loadSites(); refreshMeter();
    return () => {
      disposed = true; document.documentElement.classList.remove('studio-lock'); controller?.abort();
      clearTimeout(previewTimer); clearInterval(stageTimer); window.removeEventListener('message', onMsg); meter.destroy(); createSteps.destroy(); editRun?.steps.destroy();
    };
  }
};
