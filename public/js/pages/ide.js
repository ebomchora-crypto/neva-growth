import { api } from '../api.js';
import { h, mount, modal, confirmBox, promptBox, toast, fail, debounce, diffEl, dtt } from '../ui.js';

const MONACO = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';
const LANGS = { html: 'html', css: 'css', js: 'javascript', mjs: 'javascript', json: 'json', md: 'markdown', svg: 'xml', xml: 'xml', txt: 'plaintext' };
const langOf = (p) => LANGS[p.split('.').pop().toLowerCase()] || 'plaintext';
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ok */ } } };

let monacoPromise;
function loadMonaco() {
  monacoPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = MONACO + '/loader.js';
    s.onload = () => {
      window.MonacoEnvironment = { getWorkerUrl: () => URL.createObjectURL(new Blob([`self.MonacoEnvironment={baseUrl:'${MONACO.replace(/vs$/, '')}'};importScripts('${MONACO}/base/worker/workerMain.js');`], { type: 'text/javascript' })) };
      window.require.config({ paths: { vs: MONACO } }); window.require(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
    };
    s.onerror = () => reject(new Error('Monaco indisponível')); document.head.append(s);
    setTimeout(() => reject(new Error('timeout')), 12000);
  });
  return monacoPromise;
}
const TEXT_EXT = /\.(html?|css|js|mjs|json|md|txt|svg|xml|csv|ts|tsx|jsx|vue|yml|yaml|webmanifest|gitignore)$/i;

export default {
  async render(box, ctx) {
    const id = Number(ctx.params[0]);
    const project = await api.get('/projects/' + id);
    const canWrite = ctx.user.role !== 'viewer' && (ctx.user.role === 'admin' || project.owner_id == null || project.owner_id === ctx.user.id);
    let files = await api.get(`/projects/${id}/files`);
    const buffers = new Map();   // path -> { content, saved, model? }
    let open = []; let active = null; let editor = null; let monaco = null; let fallback = null;
    let autosave = ls.get('ide.autosave') !== '0'; let previewBase = null; let openLink = null;

    const treeEl = h('div', { class: 'ftree' }); const tabsEl = h('div', { class: 'etabs' }); const editorEl = h('div', { id: 'editor' });
    const frame = h('iframe', { title: 'Preview', sandbox: 'allow-scripts allow-forms allow-popups allow-modals', src: 'about:blank' });
    const bottom = h('div', { class: 'ide-bottom' }); const status = h('span', { class: 'sm mut' });
    const dirty = (p) => buffers.get(p) && buffers.get(p).content !== buffers.get(p).saved;
    const autosaveSoon = debounce(() => { if (autosave && canWrite) save(false, true); }, 1500);
    const onChanged = () => { drawTabs(); drawTree(); autosaveSoon(); };

    // ---------- árvore de arquivos
    function drawTree() {
      const dirs = new Set(); files.forEach((f) => { const parts = f.path.split('/'); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/')); });
      const entries = [...[...dirs].map((d) => ({ path: d, dir: true })), ...files.map((f) => ({ path: f.path }))].sort((a, b) => a.path.localeCompare(b.path));
      mount(treeEl, entries.map((e) => {
        const depth = e.path.split('/').length - 1; const name = e.path.split('/').pop();
        return h('div', { class: 'f' + (e.path === active ? ' on' : ''), style: `padding-left:${12 + depth * 14}px`, onclick: () => !e.dir && openFile(e.path) },
          h('span', e.dir ? '📁' : '📄'), h('span', { class: 'grow' }, name, !e.dir && dirty(e.path) ? ' •' : ''),
          canWrite && h('span', { class: 'acts' }, !e.dir && h('button', { title: 'Renomear', 'aria-label': 'Renomear', onclick: (ev) => { ev.stopPropagation(); renameFile(e.path); } }, '✎'),
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
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => save(true));
      } catch {
        fallback = h('textarea', { class: 'fallback', spellcheck: 'false', readonly: !canWrite, 'aria-label': 'Editor de código' });
        fallback.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') { e.preventDefault(); fallback.setRangeText('  ', fallback.selectionStart, fallback.selectionEnd, 'end'); fallback.dispatchEvent(new Event('input')); }
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(true); }
        });
        mount(editorEl, fallback); toast('Editor avançado indisponível (CDN bloqueada). Usando editor simples.');
      }
    }
    function bind(p) {
      const b = buffers.get(p);
      if (editor) {
        if (!b.model) { b.model = monaco.editor.createModel(b.content, langOf(p)); b.model.onDidChangeContent(() => { b.content = b.model.getValue(); onChanged(); }); }
        editor.setModel(b.model);
      } else { fallback.value = b.content; fallback.oninput = () => { b.content = fallback.value; onChanged(); }; }
    }
    function setContent(p, content) { const b = buffers.get(p); if (!b) return; b.content = content; b.saved = content; if (b.model) b.model.setValue(content); if (active === p && fallback) fallback.value = content; drawTabs(); drawTree(); }
    async function openFile(p) {
      await ensureEditor();
      if (!buffers.has(p)) { try { const f = await api.get(`/projects/${id}/file`, { path: p }); buffers.set(p, { content: f.content, saved: f.content }); } catch (e) { return fail(e); } }
      if (!open.includes(p)) open.push(p);
      active = p; bind(p); drawTabs(); drawTree(); if (btab === 'history') drawBottom();
    }
    function closeTabQuiet(p) { const b = buffers.get(p); b?.model?.dispose(); buffers.delete(p); open = open.filter((x) => x !== p); if (active === p) { active = open.at(-1) || null; if (active) bind(active); else if (editor) editor.setModel(null); else if (fallback) { fallback.value = ''; fallback.oninput = null; } } drawTabs(); }
    function closeTab(p) { if (dirty(p) && !window.confirm(`"${p}" tem alterações não salvas. Fechar mesmo assim?`)) return; closeTabQuiet(p); drawTree(); }
    async function save(manualAll = false, quiet = false) {
      if (!canWrite) return;
      const targets = manualAll ? open.filter(dirty) : (active && dirty(active) ? [active] : []);
      for (const p of targets) { const b = buffers.get(p); const content = b.content;
        try { await api.put(`/projects/${id}/file`, { path: p, content }); b.saved = content; } catch (e) { return fail(e); } }
      if (targets.length) { status.textContent = (quiet ? 'Salvo automaticamente ' : 'Salvo ') + new Date().toLocaleTimeString('pt-BR'); drawTabs(); drawTree(); refreshPreview(); }
    }
    async function reloadFiles() { files = await api.get(`/projects/${id}/files`); drawTree(); }
    async function newFile() {
      const p = await promptBox('Novo arquivo', 'Caminho (ex.: css/estilo.css)'); if (!p) return;
      try { await api.put(`/projects/${id}/file`, { path: p, content: '' }); await reloadFiles(); openFile(p.replace(/^\/+/, '')); } catch (e) { fail(e); }
    }
    async function renameFile(p) {
      const to = await promptBox('Renomear / mover arquivo', 'Novo caminho', p); if (!to || to === p) return;
      if (dirty(p)) await save();
      try { await api.post(`/projects/${id}/rename`, { from: p, to }); closeTabQuiet(p); await reloadFiles(); refreshPreview(); } catch (e) { fail(e); }
    }
    async function deleteFile(p, dir) {
      if (!(await confirmBox(`Excluir ${dir ? 'a pasta' : 'o arquivo'} "${p}"?`))) return;
      try { await api.del(`/projects/${id}/file`, { path: p }); [...buffers.keys()].filter((k) => k === p || k.startsWith(p + '/')).forEach(closeTabQuiet); await reloadFiles(); refreshPreview(); } catch (e) { fail(e); }
    }
    async function refreshPreview() {
      try { previewBase ||= (await api.post(`/projects/${id}/preview-token`)).url; } catch (e) { return fail(e); }
      frame.src = `${previewBase}?t=${Date.now()}`; if (openLink) openLink.href = previewBase;
    }
    // ---------- importar arquivos/pastas
    async function importFiles(fileList) {
      const arr = [...fileList].slice(0, 150); if (!arr.length) return;
      const out = []; const skipped = [];
      for (const f of arr) {
        if (!TEXT_EXT.test(f.name) || f.size > 1_000_000) { skipped.push(f.name); continue; }
        out.push({ path: f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(1).join('/') || f.name : f.name, content: await f.text() });
      }
      if (!out.length) return toast('Nenhum arquivo de texto (até 1 MB) para importar.', 'err');
      const existing = out.filter((o) => files.some((x) => x.path === o.path)).length;
      let overwrite = false; if (existing) { overwrite = await confirmBox(`${existing} arquivo(s) já existem. Substituir? (a versão atual fica no histórico)`, 'Substituir'); }
      try { const r = await api.post(`/projects/${id}/import`, { files: out, overwrite }); toast(`Importados: ${r.created} novo(s), ${r.updated} atualizado(s)${r.skipped.length + skipped.length ? `, ${r.skipped.length + skipped.length} ignorado(s)` : ''}.`, 'ok');
        for (const o of out) if (buffers.has(o.path)) setContent(o.path, o.content); await reloadFiles(); refreshPreview(); } catch (e) { fail(e); }
    }
    const pickFiles = (dirMode) => { const inp = h('input', { type: 'file', multiple: true, webkitdirectory: dirMode ? '' : null, style: 'display:none' }); inp.onchange = () => importFiles(inp.files); document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000); };

    // ---------- painel inferior
    let btab = 'console'; const consoleLines = []; const consoleEl = h('div', { class: 'pane' });
    const onMsg = (ev) => { if (ev.source !== frame.contentWindow || !ev.data || ev.data.__neva !== 'console') return; consoleLines.push(ev.data); if (btab === 'console') drawConsole(); };
    window.addEventListener('message', onMsg);
    function drawConsole() { mount(consoleEl, consoleLines.length ? consoleLines.slice(-300).map((l) => h('div', { class: 'l ' + l.level }, `[${l.level}] ${l.text}`)) : h('span', { class: 'mut' }, 'O console do preview aparece aqui (console.log, avisos e erros do seu site).')); consoleEl.scrollTop = consoleEl.scrollHeight; }

    // buscar e substituir
    const searchOut = h('div', { class: 'pane' }); const searchIn = h('input', { placeholder: 'Buscar em todos os arquivos…', 'aria-label': 'Buscar nos arquivos' });
    const replIn = h('input', { placeholder: 'Substituir por…', 'aria-label': 'Substituir por' }); const cs = h('input', { type: 'checkbox', 'aria-label': 'Diferenciar maiúsculas' });
    const doSearch = debounce(async () => {
      if (searchIn.value.length < 2) return mount(searchOut, h('span', { class: 'mut' }, 'Digite ao menos 2 caracteres.'));
      try { const r = await api.get(`/projects/${id}/search`, { q: searchIn.value });
        mount(searchOut, r.length ? r.map((m) => h('div', { style: 'cursor:pointer', onclick: () => openFile(m.path) }, h('b', `${m.path}:${m.line}`), '  ', m.text)) : h('span', { class: 'mut' }, 'Nenhum resultado.')); } catch (e) { mount(searchOut, e.message); }
    }, 350);
    searchIn.addEventListener('input', doSearch);
    async function replaceAll() {
      if (!searchIn.value) return toast('Informe o texto a buscar.', 'err');
      try {
        const dry = await api.post(`/projects/${id}/replace`, { find: searchIn.value, replace: replIn.value, caseSensitive: cs.checked, dryRun: true });
        if (!dry.total) return toast('Nada para substituir.');
        if (!(await confirmBox(`Substituir ${dry.total} ocorrência(s) em ${dry.files.length} arquivo(s)? As versões anteriores ficam no histórico.`, 'Substituir'))) return;
        if (open.some(dirty)) await save(true);
        const r = await api.post(`/projects/${id}/replace`, { find: searchIn.value, replace: replIn.value, caseSensitive: cs.checked });
        for (const f of r.files) if (buffers.has(f.path)) { const c = await api.get(`/projects/${id}/file`, { path: f.path }); setContent(f.path, c.content); }
        toast(`${r.total} ocorrência(s) substituída(s).`, 'ok'); refreshPreview(); doSearch();
      } catch (e) { fail(e); }
    }

    // histórico de versões
    const histEl = h('div', { class: 'pane', style: 'font-family:inherit' });
    async function drawHistory() {
      if (!active) return mount(histEl, h('span', { class: 'mut' }, 'Abra um arquivo para ver o histórico.'));
      try { const vs = await api.get(`/projects/${id}/versions`, { path: active });
        mount(histEl, h('div', { class: 'sm mut' }, `Versões anteriores de ${active} (até 30).`), vs.length ? h('div', { class: 'vlist' }, vs.map((v) => h('button', { onclick: () => previewVersion(v) }, h('span', `${dtt(v.created_at)} · ${v.user_name || ''}`), h('span', { class: 'badge' }, { save: 'salvo', replace: 'substituição', ai: 'IA', import: 'importação', restore: 'restauração', undo: 'desfazer' }[v.source] || v.source)))) : h('p', { class: 'mut' }, 'Sem versões anteriores ainda. Elas surgem a cada alteração salva.'));
      } catch (e) { mount(histEl, e.message); }
    }
    async function previewVersion(v) {
      const full = await api.get(`/projects/${id}/versions/${v.id}`); const cur = buffers.get(active)?.content ?? '';
      modal({ title: `${active} — ${dtt(v.created_at)}`, size: 'lg', body: h('div', h('p', { class: 'sm mut' }, 'Diferença entre a versão antiga (−) e o conteúdo atual (+).'), diffEl(full.content, cur)),
        actions: canWrite ? [{ label: 'Fechar', kind: 'ghost' }, { label: 'Restaurar esta versão', keepOpen: true, onClick: async (close) => { await save(true); const r = await api.post(`/projects/${id}/versions/${v.id}/restore`); setContent(active, r.content); close(); toast('Versão restaurada.', 'ok'); refreshPreview(); drawHistory(); } }] : [{ label: 'Fechar', kind: 'ghost' }] });
    }

    // console JS isolado (executa em iframe descartável com sandbox)
    const replOut = h('div', { class: 'pane' }); const replJs = h('input', { placeholder: 'Execute JavaScript (isolado do app) e pressione Enter…', 'aria-label': 'Console JavaScript' });
    replJs.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !replJs.value.trim()) return; const code = replJs.value; replJs.value = ''; replOut.append(h('div', { class: 'l' }, '> ' + code));
      const sb = document.createElement('iframe'); sb.sandbox = 'allow-scripts'; sb.style.display = 'none'; const token = Math.random().toString(36).slice(2);
      const handler = (m) => { if (m.source !== sb.contentWindow || m.data?.token !== token) return; replOut.append(h('div', { class: 'l ' + (m.data.err ? 'err' : '') }, String(m.data.out))); replOut.scrollTop = replOut.scrollHeight; window.removeEventListener('message', handler); sb.remove(); };
      window.addEventListener('message', handler);
      sb.srcdoc = `<script>try{const r=(0,eval)(${JSON.stringify(code)});parent.postMessage({token:${JSON.stringify(token)},out:typeof r==='object'?JSON.stringify(r):String(r)},'*')}catch(e){parent.postMessage({token:${JSON.stringify(token)},out:String(e),err:true},'*')}<\/script>`;
      document.body.append(sb); setTimeout(() => { sb.remove(); window.removeEventListener('message', handler); }, 5000);
    });

    // ---------- Assistente de IA (histórico persistente, revisão por diff, desfazer)
    const st = await api.get('/integrations/status').catch(() => ({ ai: { configured: false, envVar: 'ANTHROPIC_API_KEY' } }));
    const chatMsgs = h('div', { class: 'msgs' }); let lastUndo = null; const undoBtn = h('button', { class: 'btn ghost sm hide', onclick: () => undoAi() }, 'Desfazer última aplicação da IA'); const usageEl = h('span', { class: 'sm mut' });
    const FILE_RE = /^\s*(?:<!--|\/\/|\/\*|#)\s*FILE:\s*([^\s>*]+)\s*(?:-->|\*\/)?\s*\n/;
    function parseBlocks(text) { const re = /```(\w*)\n([\s\S]*?)```/g; const out = []; let last = 0, m; while ((m = re.exec(text))) { out.push({ type: 'text', s: text.slice(last, m.index) }); const fm = m[2].match(FILE_RE); out.push({ type: 'code', s: m[2], file: fm ? fm[1] : null, body: fm ? m[2].replace(FILE_RE, '') : m[2] }); last = re.lastIndex; } out.push({ type: 'text', s: text.slice(last) }); return out; }
    function renderReply(text) {
      const blocks = parseBlocks(text); const frag = h('div'); const edits = blocks.filter((b) => b.file);
      for (const b of blocks) { if (b.type === 'text') b.s.trim() && frag.append(h('div', b.s.trim())); else frag.append(h('pre', { class: 'code' }, b.s)); }
      if (edits.length && canWrite) frag.append(h('button', { class: 'btn sm', onclick: () => reviewEdits(edits) }, `Revisar ${edits.length} alteração(ões) proposta(s)`));
      return frag;
    }
    async function reviewEdits(edits) {
      const olds = await Promise.all(edits.map(async (e) => { try { return (await api.get(`/projects/${id}/file`, { path: e.file })).content; } catch { return null; } }));
      const sel = edits.map(() => true);
      const body = h('div', { class: 'stack' }, h('p', { class: 'sm mut' }, 'Revise as diferenças. Nada é alterado até você aplicar; depois é possível desfazer.'), edits.map((e, i) => h('div', h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: true, onchange: (ev) => { sel[i] = ev.target.checked; } }), h('b', e.file), olds[i] == null && h('span', { class: 'badge ok' }, 'novo')), diffEl(olds[i], e.body))));
      modal({ title: 'Revisar alterações da IA', size: 'lg', body, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Aplicar selecionadas', keepOpen: true, onClick: async (close) => {
        const chosen = edits.filter((_, i) => sel[i]).map((e) => ({ path: e.file, content: e.body })); if (!chosen.length) return false;
        if (open.some(dirty)) await save(true);
        const r = await api.post(`/projects/${id}/ai-apply`, { files: chosen }); lastUndo = r.undo; undoBtn.classList.remove('hide'); close();
        for (const c of chosen) if (buffers.has(c.path)) setContent(c.path, c.content); await reloadFiles(); refreshPreview(); toast('Alterações aplicadas. Use "Desfazer última aplicação da IA" se precisar.', 'ok'); } }] });
    }
    async function undoAi() {
      if (!lastUndo || !(await confirmBox('Desfazer a última aplicação da IA? Os arquivos voltam ao estado anterior.', 'Desfazer'))) return;
      try { await api.post(`/projects/${id}/ai-undo`, { undo: lastUndo }); for (const u of lastUndo) { if (!u.existed) closeTabQuiet(u.path); else if (buffers.has(u.path)) setContent(u.path, (await api.get(`/projects/${id}/file`, { path: u.path })).content); }
        lastUndo = null; undoBtn.classList.add('hide'); await reloadFiles(); refreshPreview(); toast('Alterações desfeitas.', 'ok'); } catch (e) { fail(e); }
    }
    const chatIn = h('input', { placeholder: 'Peça ajuda, explicações ou alterações no código…', 'aria-label': 'Mensagem para a IA' });
    const chatForm = h('form', { onsubmit: async (e) => {
      e.preventDefault(); const text = chatIn.value.trim(); if (!text) return; chatIn.value = '';
      chatMsgs.append(h('div', { class: 'm u' }, text)); const wait = h('div', { class: 'm mut' }, 'Pensando…'); chatMsgs.append(wait); chatMsgs.scrollTop = chatMsgs.scrollHeight;
      try { await save(true); const r = await api.post('/integrations/ai/chat', { projectId: id, activePath: active, message: text }); wait.replaceChildren(renderReply(r.reply)); wait.classList.remove('mut'); usageEl.textContent = `Uso mensal: ${r.usage.used}/${r.usage.limit}`; }
      catch (x) { wait.textContent = x.message; wait.classList.add('err-text'); }
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    } }, h('div', { class: 'grow' }, chatIn), h('button', { class: 'btn' }, 'Enviar'));
    async function loadChat() {
      if (!st.ai.configured) return;
      try { const r = await api.get('/integrations/ai/history', { projectId: id }); usageEl.textContent = `Uso mensal: ${r.usage.used}/${r.usage.limit}`;
        mount(chatMsgs, r.items.length ? r.items.map((m) => (m.role === 'user' ? h('div', { class: 'm u' }, m.content) : h('div', { class: 'm' }, renderReply(m.content)))) : h('div', { class: 'm mut' }, 'Converse com a IA sobre este projeto. O histórico fica salvo por projeto e por usuário.')); chatMsgs.scrollTop = chatMsgs.scrollHeight; } catch { /* sem histórico */ }
    }
    const chatEl = st.ai.configured ? h('div', { class: 'chat' }, h('div', { class: 'row', style: 'padding:6px 12px;justify-content:space-between' }, usageEl, h('div', { class: 'row' }, undoBtn, h('button', { class: 'btn ghost sm', onclick: async () => { if (await confirmBox('Limpar o histórico desta conversa?', 'Limpar')) { await api.del('/integrations/ai/history', { projectId: id }); loadChat(); } } }, 'Limpar conversa'))), chatMsgs, chatForm)
      : h('div', { class: 'pane' }, h('div', { class: 'notice' }, `Assistente de IA não configurado. Defina ${st.ai.envVar} no servidor e reinicie para habilitar explicação de código, correções e geração de arquivos.`));

    function drawBottom() {
      const t = (k, l) => h('button', { class: btab === k ? 'on' : '', onclick: () => { btab = k; drawBottom(); } }, l);
      const pane = { console: consoleEl,
        search: h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' }, h('div', { class: 'row', style: 'padding:8px' }, h('div', { style: 'flex:1;min-width:160px' }, searchIn), h('div', { style: 'flex:1;min-width:160px' }, replIn), h('label', { class: 'row sm' }, cs, 'Aa'), canWrite && h('button', { class: 'btn ghost sm', onclick: replaceAll }, 'Substituir tudo')), searchOut),
        history: histEl, repl: h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' }, replOut, h('div', { style: 'padding:8px' }, replJs)), ai: chatEl }[btab];
      mount(bottom, h('div', { class: 'tabs' }, t('console', 'Console'), t('repl', 'JavaScript'), t('search', 'Buscar/Substituir'), t('history', 'Histórico'), t('ai', '✦ Assistente IA')), pane);
      if (btab === 'console') drawConsole(); if (btab === 'history') drawHistory(); if (btab === 'ai') loadChat();
    }

    // ---------- barra superior
    const pubBtn = h('button', { class: 'btn ghost sm', onclick: async () => { try { const p = await api.post(`/projects/${id}/publish`, { published: !project.published }); project.published = p.published; toast(p.published ? 'Publicado em /s/' + project.slug + '/' : 'Despublicado.', 'ok'); drawTop(); } catch (e) { fail(e); } } });
    const top = h('div', { class: 'ide-top' });
    function drawTop() {
      pubBtn.textContent = project.published ? 'Despublicar' : 'Publicar';
      const auto = h('label', { class: 'row sm', title: 'Salva automaticamente 1,5 s após parar de digitar' }, h('input', { type: 'checkbox', checked: autosave, onchange: (e) => { autosave = e.target.checked; ls.set('ide.autosave', autosave ? '1' : '0'); } }), 'Autosave');
      mount(top, h('a', { class: 'btn ghost sm', href: '#/sites' }, '← Projetos'), h('b', project.name), h('span', { class: 'badge' }, project.archived ? 'arquivado' : project.published ? 'publicado' : 'rascunho'), !canWrite && h('span', { class: 'badge warn' }, 'somente leitura'), status, h('span', { class: 'grow' }),
        canWrite && auto, canWrite && h('button', { class: 'btn sm', onclick: () => save(true) }, 'Salvar (Ctrl+S)'),
        canWrite && h('button', { class: 'btn ghost sm', onclick: () => pickFiles(false) }, 'Importar arquivos'), canWrite && h('button', { class: 'btn ghost sm', onclick: () => pickFiles(true) }, 'Importar pasta'),
        h('button', { class: 'btn ghost sm', onclick: refreshPreview }, '⟳ Preview'), (openLink = h('a', { class: 'btn ghost sm', href: previewBase || '#', target: '_blank', rel: 'noopener' }, 'Abrir preview')),
        !!project.published && h('a', { class: 'btn ghost sm', href: `/s/${project.slug}/`, target: '_blank', rel: 'noopener' }, 'Ver site'), canWrite && !project.archived && pubBtn, h('a', { class: 'btn ghost sm', href: `/api/projects/${id}/zip` }, 'Baixar .zip'));
    }
    const ideEl = h('div', { class: 'ide' }, top, h('div', { class: 'ide-files' }, h('div', { class: 'head' }, 'Arquivos', canWrite && h('button', { class: 'btn ghost sm', onclick: newFile }, '+ Novo')), treeEl), h('div', { class: 'ide-editor' }, tabsEl, editorEl), h('div', { class: 'ide-right' }, frame), bottom);
    mount(box, ideEl); drawTop(); drawTree(); drawTabs(); drawBottom(); refreshPreview();
    const beforeUnload = (e) => { if (open.some(dirty)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    const first = files.find((f) => f.path === 'index.html') || files[0]; if (first) await openFile(first.path);
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('beforeunload', beforeUnload); if (autosave && canWrite && open.some(dirty)) save(true, true); [...buffers.values()].forEach((b) => b.model?.dispose()); editor?.dispose(); };
  }
};
