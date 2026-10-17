import { api } from '../api.js';
import { h, mount, clear, modal, confirmBox, promptBox, toast, fail, debounce } from '../ui.js';

const MONACO = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';
const LANGS = { html: 'html', css: 'css', js: 'javascript', mjs: 'javascript', json: 'json', md: 'markdown', svg: 'xml', xml: 'xml', txt: 'plaintext' };
const langOf = (p) => LANGS[p.split('.').pop().toLowerCase()] || 'plaintext';

let monacoPromise;
function loadMonaco() {
  monacoPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = MONACO + '/loader.js';
    s.onload = () => { window.MonacoEnvironment = { getWorkerUrl: () => URL.createObjectURL(new Blob([`self.MonacoEnvironment={baseUrl:'${MONACO.replace(/vs$/, '')}'};importScripts('${MONACO}/base/worker/workerMain.js');`], { type: 'text/javascript' })) };
    window.require.config({ paths: { vs: MONACO } }); window.require(['vs/editor/editor.main'], () => resolve(window.monaco), reject); };
    s.onerror = () => reject(new Error('Monaco indisponível')); document.head.append(s);
    setTimeout(() => reject(new Error('timeout')), 12000);
  });
  return monacoPromise;
}

export default {
  async render(box, ctx) {
    const id = Number(ctx.params[0]);
    const canWrite = ctx.user.role !== 'viewer';
    const project = await api.get('/projects/' + id);
    let files = await api.get(`/projects/${id}/files`);
    const buffers = new Map();   // path -> { content, saved, model? }
    let open = []; let active = null; let editor = null; let monaco = null; let fallback = null;

    const treeEl = h('div', { class: 'ftree' });
    const tabsEl = h('div', { class: 'etabs' });
    const editorEl = h('div', { id: 'editor' });
    const frame = h('iframe', { title: 'Preview', sandbox: 'allow-scripts allow-forms allow-popups allow-modals', src: 'about:blank' });
    const bottom = h('div', { class: 'ide-bottom' });
    const status = h('span', { class: 'sm mut' });
    const dirty = (p) => buffers.get(p) && buffers.get(p).content !== buffers.get(p).saved;

    // ---------- árvore de arquivos
    function drawTree() {
      const dirs = new Set(); files.forEach((f) => { const parts = f.path.split('/'); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/')); });
      const entries = [...[...dirs].map((d) => ({ path: d, dir: true })), ...files.map((f) => ({ path: f.path }))].sort((a, b) => a.path.localeCompare(b.path));
      mount(treeEl, entries.map((e) => {
        const depth = e.path.split('/').length - 1; const name = e.path.split('/').pop();
        return h('div', { class: 'f' + (e.path === active ? ' on' : ''), style: `padding-left:${12 + depth * 14}px`, onclick: () => !e.dir && openFile(e.path) },
          h('span', e.dir ? '📁' : '📄'), h('span', { class: 'grow' }, name, !e.dir && dirty(e.path) ? ' •' : ''),
          canWrite && h('span', { class: 'acts' },
            !e.dir && h('button', { title: 'Renomear', 'aria-label': 'Renomear', onclick: (ev) => { ev.stopPropagation(); renameFile(e.path); } }, '✎'),
            h('button', { title: 'Excluir', 'aria-label': 'Excluir', onclick: (ev) => { ev.stopPropagation(); deleteFile(e.path, e.dir); } }, '✕')));
      }));
    }
    function drawTabs() {
      mount(tabsEl, open.map((p) => h('div', { class: 'etab' + (p === active ? ' on' : ''), onclick: () => openFile(p) }, p.split('/').pop(), dirty(p) && h('span', { class: 'dot' }),
        h('button', { class: 'x', style: 'font-size:1rem', 'aria-label': 'Fechar aba', onclick: (ev) => { ev.stopPropagation(); closeTab(p); } }, '×'))));
    }

    // ---------- editor
    async function ensureEditor() {
      if (editor || fallback) return;
      try {
        monaco = await loadMonaco();
        editor = monaco.editor.create(editorEl, { automaticLayout: true, minimap: { enabled: false }, fontSize: 13, tabSize: 2, readOnly: !canWrite, theme: 'vs', scrollBeyondLastLine: false });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => save());
      } catch {
        fallback = h('textarea', { class: 'fallback', spellcheck: 'false', readonly: !canWrite, 'aria-label': 'Editor de código' });
        fallback.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') { e.preventDefault(); const s = fallback.selectionStart; fallback.setRangeText('  ', s, fallback.selectionEnd, 'end'); fallback.dispatchEvent(new Event('input')); }
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
        });
        mount(editorEl, fallback);
        toast('Editor avançado indisponível (CDN bloqueada). Usando editor simples.');
      }
    }
    function bind(p) {
      const b = buffers.get(p);
      if (editor) {
        if (!b.model) { b.model = monaco.editor.createModel(b.content, langOf(p)); b.model.onDidChangeContent(() => { b.content = b.model.getValue(); drawTabs(); drawTree(); }); }
        editor.setModel(b.model);
      } else {
        fallback.value = b.content; fallback.oninput = () => { b.content = fallback.value; drawTabs(); drawTree(); };
      }
    }
    async function openFile(p) {
      await ensureEditor();
      if (!buffers.has(p)) {
        try { const f = await api.get(`/projects/${id}/file`, { path: p }); buffers.set(p, { content: f.content, saved: f.content }); } catch (e) { return fail(e); }
      }
      if (!open.includes(p)) open.push(p);
      active = p; bind(p); drawTabs(); drawTree(); editorEl.hidden = false;
    }
    function closeTab(p) {
      if (dirty(p) && !window.confirm(`"${p}" tem alterações não salvas. Fechar mesmo assim?`)) return;
      const b = buffers.get(p); b?.model?.dispose(); buffers.delete(p);
      open = open.filter((x) => x !== p);
      if (active === p) { active = open.at(-1) || null; if (active) bind(active); else if (editor) editor.setModel(null); else if (fallback) { fallback.value = ''; fallback.oninput = null; } }
      drawTabs(); drawTree();
    }
    async function save(all = false) {
      if (!canWrite) return;
      const targets = all ? open.filter(dirty) : active && dirty(active) ? [active] : [];
      for (const p of targets) {
        const b = buffers.get(p);
        try { await api.put(`/projects/${id}/file`, { path: p, content: b.content }); b.saved = b.content; } catch (e) { return fail(e); }
      }
      if (targets.length) { status.textContent = 'Salvo ' + new Date().toLocaleTimeString('pt-BR'); drawTabs(); drawTree(); refreshPreview(); }
    }
    async function reloadFiles() { files = await api.get(`/projects/${id}/files`); drawTree(); }
    async function newFile() {
      const p = await promptBox('Novo arquivo', 'Caminho (ex.: css/estilo.css)'); if (!p) return;
      try { await api.put(`/projects/${id}/file`, { path: p, content: '' }); await reloadFiles(); openFile(p.replace(/^\/+/, '')); } catch (e) { fail(e); }
    }
    async function renameFile(p) {
      const to = await promptBox('Renomear arquivo', 'Novo caminho', p); if (!to || to === p) return;
      if (dirty(p)) await save();
      try { await api.post(`/projects/${id}/rename`, { from: p, to }); closeTabQuiet(p); await reloadFiles(); refreshPreview(); } catch (e) { fail(e); }
    }
    function closeTabQuiet(p) { const b = buffers.get(p); b?.model?.dispose(); buffers.delete(p); open = open.filter((x) => x !== p); if (active === p) { active = open.at(-1) || null; if (active) bind(active); } drawTabs(); }
    async function deleteFile(p, dir) {
      if (!(await confirmBox(`Excluir ${dir ? 'a pasta' : 'o arquivo'} "${p}"?`))) return;
      try { await api.del(`/projects/${id}/file`, { path: p }); [...buffers.keys()].filter((k) => k === p || k.startsWith(p + '/')).forEach(closeTabQuiet); await reloadFiles(); refreshPreview(); } catch (e) { fail(e); }
    }
    let previewBase = null;
    async function refreshPreview() {
      try { previewBase ||= (await api.post(`/projects/${id}/preview-token`)).url; } catch (e) { return fail(e); }
      frame.src = `${previewBase}?t=${Date.now()}`; if (openLink) openLink.href = previewBase;
    }
    let openLink = null;

    // ---------- painel inferior: busca, console, IA
    let btab = 'console'; const consoleLines = []; const consoleEl = h('div', { class: 'pane' });
    const onMsg = (ev) => {
      if (ev.source !== frame.contentWindow || !ev.data || ev.data.__neva !== 'console') return;
      consoleLines.push(ev.data); if (btab === 'console') drawConsole();
    };
    window.addEventListener('message', onMsg);
    function drawConsole() {
      mount(consoleEl, consoleLines.length ? consoleLines.slice(-300).map((l) => h('div', { class: 'l ' + l.level }, `[${l.level}] ${l.text}`)) : h('span', { class: 'mut' }, 'O console do preview aparece aqui (console.log, erros e avisos).'));
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    const searchOut = h('div', { class: 'pane' });
    const searchIn = h('input', { placeholder: 'Buscar em todos os arquivos…', 'aria-label': 'Buscar nos arquivos' });
    const doSearch = debounce(async () => {
      if (searchIn.value.length < 2) return mount(searchOut, h('span', { class: 'mut' }, 'Digite ao menos 2 caracteres.'));
      try { const r = await api.get(`/projects/${id}/search`, { q: searchIn.value });
        mount(searchOut, r.length ? r.map((m) => h('div', { style: 'cursor:pointer', onclick: () => openFile(m.path) }, h('b', `${m.path}:${m.line}`), '  ', m.text)) : h('span', { class: 'mut' }, 'Nenhum resultado.'));
      } catch (e) { mount(searchOut, e.message); }
    }, 350);
    searchIn.addEventListener('input', doSearch);

    // Console JS isolado: executa código em um iframe sandbox descartável
    const replOut = h('div', { class: 'pane' }); const replIn = h('input', { placeholder: 'Execute JavaScript (isolado do app) e pressione Enter…', 'aria-label': 'Console JavaScript' });
    replIn.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !replIn.value.trim()) return;
      const code = replIn.value; replIn.value = '';
      replOut.append(h('div', { class: 'l' }, '> ' + code));
      const sb = document.createElement('iframe'); sb.sandbox = 'allow-scripts'; sb.style.display = 'none';
      const token = Math.random().toString(36).slice(2);
      const handler = (m) => { if (m.source !== sb.contentWindow || m.data?.token !== token) return; replOut.append(h('div', { class: 'l ' + (m.data.err ? 'err' : '') }, String(m.data.out))); replOut.scrollTop = replOut.scrollHeight; window.removeEventListener('message', handler); sb.remove(); };
      window.addEventListener('message', handler);
      sb.srcdoc = `<script>try{const r=(0,eval)(${JSON.stringify(code)});parent.postMessage({token:${JSON.stringify(token)},out:typeof r==='object'?JSON.stringify(r):String(r)},'*')}catch(e){parent.postMessage({token:${JSON.stringify(token)},out:String(e),err:true},'*')}<\/script>`;
      document.body.append(sb); setTimeout(() => { sb.remove(); window.removeEventListener('message', handler); }, 5000);
    });

    // Assistente de IA
    const st = await api.get('/integrations/status').catch(() => ({ ai: { configured: false, envVar: 'ANTHROPIC_API_KEY' } }));
    const chatMsgs = h('div', { class: 'msgs' }); const history = [];
    function renderReply(text) {
      const frag = h('div'); const re = /```(\w*)\n([\s\S]*?)```/g; let last = 0, m;
      const push = (t) => t.trim() && frag.append(h('div', t.trim()));
      while ((m = re.exec(text))) {
        push(text.slice(last, m.index)); last = re.lastIndex;
        const code = m[2]; const fm = code.match(/^\s*(?:<!--|\/\/|\/\*|#)\s*FILE:\s*([^\s>*]+)/);
        frag.append(h('pre', { class: 'code' }, code), fm && canWrite ? h('button', { class: 'btn sm', onclick: async () => {
          if (!(await confirmBox(`Substituir o conteúdo de "${fm[1]}" pelo código sugerido?`, 'Aplicar'))) return;
          try { await api.put(`/projects/${id}/file`, { path: fm[1], content: code.replace(/^.*FILE:.*\n/, '') }); closeTabQuiet(fm[1]); await reloadFiles(); await openFile(fm[1]); refreshPreview(); toast('Alteração aplicada.', 'ok'); } catch (e) { fail(e); }
        } }, `Aplicar em ${fm[1]}`) : null);
      }
      push(text.slice(last)); return frag;
    }
    const chatForm = h('form', { onsubmit: async (e) => {
      e.preventDefault(); const text = chatIn.value.trim(); if (!text) return; chatIn.value = '';
      history.push({ role: 'user', content: text }); chatMsgs.append(h('div', { class: 'm u' }, text));
      const wait = h('div', { class: 'm mut' }, 'Pensando…'); chatMsgs.append(wait); chatMsgs.scrollTop = chatMsgs.scrollHeight;
      try { await save(true); const r = await api.post('/integrations/ai/chat', { projectId: id, activePath: active, messages: history }); history.push({ role: 'assistant', content: r.reply }); wait.replaceChildren(renderReply(r.reply)); wait.classList.remove('mut'); }
      catch (x) { wait.textContent = x.message; history.pop(); }
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    } });
    const chatIn = h('input', { placeholder: 'Peça ajuda, explicações ou alterações no código…', 'aria-label': 'Mensagem para a IA' });
    chatForm.append(h('div', { class: 'grow' }, chatIn), h('button', { class: 'btn' }, 'Enviar'));
    const chatEl = st.ai.configured ? h('div', { class: 'chat' }, chatMsgs, chatForm) :
      h('div', { class: 'pane' }, h('div', { class: 'notice' }, `Assistente de IA não configurado. Defina ${st.ai.envVar} no servidor e reinicie para habilitar explicação de código, correções e geração de arquivos.`));

    function drawBottom() {
      const t = (k, l) => h('button', { class: btab === k ? 'on' : '', onclick: () => { btab = k; drawBottom(); } }, l);
      const pane = { console: consoleEl, search: h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' }, h('div', { style: 'padding:8px' }, searchIn), searchOut),
        repl: h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' }, replOut, h('div', { style: 'padding:8px' }, replIn)), ai: chatEl }[btab];
      mount(bottom, h('div', { class: 'tabs' }, t('console', 'Console'), t('repl', 'JavaScript'), t('search', 'Buscar'), t('ai', '✦ Assistente IA')), pane);
      if (btab === 'console') drawConsole();
    }

    // ---------- barra superior
    const pubBtn = h('button', { class: 'btn ghost sm', onclick: async () => {
      try { const p = await api.post(`/projects/${id}/publish`, { published: !project.published }); project.published = p.published; toast(p.published ? 'Publicado em /s/' + project.slug + '/' : 'Despublicado.', 'ok'); drawTop(); } catch (e) { fail(e); } } });
    const top = h('div', { class: 'ide-top' });
    function drawTop() {
      pubBtn.textContent = project.published ? 'Despublicar' : 'Publicar';
      mount(top, h('a', { class: 'btn ghost sm', href: '#/sites' }, '← Projetos'), h('b', project.name), h('span', { class: 'badge' }, project.published ? 'publicado' : 'rascunho'), status, h('span', { class: 'grow' }),
        canWrite && h('button', { class: 'btn sm', onclick: () => save(true) }, 'Salvar (Ctrl+S)'), h('button', { class: 'btn ghost sm', onclick: refreshPreview }, '⟳ Recarregar preview'),
        (openLink = h('a', { class: 'btn ghost sm', href: previewBase || '#', target: '_blank', rel: 'noopener' }, 'Abrir preview')),
        !!project.published && h('a', { class: 'btn ghost sm', href: `/s/${project.slug}/`, target: '_blank', rel: 'noopener' }, 'Ver site'),
        canWrite && pubBtn, h('a', { class: 'btn ghost sm', href: `/api/projects/${id}/zip` }, 'Baixar .zip'));
    }

    const ideEl = h('div', { class: 'ide' }, top,
      h('div', { class: 'ide-files' }, h('div', { class: 'head' }, 'Arquivos', canWrite && h('button', { class: 'btn ghost sm', onclick: newFile }, '+ Novo')), treeEl),
      h('div', { class: 'ide-editor' }, tabsEl, editorEl),
      h('div', { class: 'ide-right' }, frame), bottom);
    mount(box, ideEl);
    drawTop(); drawTree(); drawTabs(); drawBottom(); refreshPreview();
    // Captura de console no preview: injeta ponte via srcdoc não é possível (origem opaca) — o servidor injeta o script em HTML do preview
    const beforeUnload = (e) => { if (open.some(dirty)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    const first = files.find((f) => f.path === 'index.html') || files[0];
    if (first) await openFile(first.path);
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('beforeunload', beforeUnload); [...buffers.values()].forEach((b) => b.model?.dispose()); editor?.dispose(); };
  }
};
