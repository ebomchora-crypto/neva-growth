// Chat com IA (neva-growth.vercel.app/chat): conversas como no ChatGPT, guardadas na conta; a resposta chega ao vivo.
import { api } from '../api.js';
import { h, mount, toast, fail, icon, confirmBox, copyText, modal } from '../ui.js';
import { composer } from '../neva-code/composer.js';
import { composeDetails } from '../attach.js';

const day = (s) => { const d = new Date(String(s || '').replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z')); return isNaN(d) ? 0 : d.getTime(); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STARTERS = [
  { ic: 'target', t: 'Escreva uma mensagem de prospecção para uma clínica que ainda não tem site' },
  { ic: 'file', t: 'Monte uma proposta comercial de landing page com 3 opções de preço' },
  { ic: 'code', t: 'Explique como colocar um domínio próprio num site publicado' },
  { ic: 'calendar', t: 'Organize minha semana: prospecção, follow-ups e entregas de sites' },
];

/** Markdown leve e seguro (o texto é escapado antes): blocos de código, títulos, listas, negrito, itálico, código e links. */
function md(src) {
  const blocks = []; let text = String(src || '');
  text = text.replace(/```([\w+-]*)\n?([\s\S]*?)(```|$)/g, (_m, lang, code) => { blocks.push({ lang, code: code.replace(/\n$/, '') }); return `\u0000${blocks.length - 1}\u0000`; });
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null;
  const flush = () => { if (list) { out.push(`<${list.t}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
  for (const line of text.split('\n')) {
    const cb = line.match(/^\u0000(\d+)\u0000$/);
    if (cb) { flush(); const b = blocks[Number(cb[1])]; out.push(`<div class="ch-code"><div class="ch-codebar"><span>${esc(b.lang || 'código')}</span><button type="button" data-copy="${cb[1]}">Copiar</button></div><pre><code>${esc(b.code)}</code></pre></div>`); continue; }
    const hd = line.match(/^(#{1,4})\s+(.*)$/); if (hd) { flush(); const n = Math.min(4, hd[1].length + 1); out.push(`<h${n}>${inline(hd[2])}</h${n}>`); continue; }
    const ul = line.match(/^\s*[-*•]\s+(.*)$/); const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) { const t = ul ? 'ul' : 'ol'; if (!list || list.t !== t) { flush(); list = { t, items: [] }; } list.items.push((ul || ol)[1]); continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }
    if (!line.trim()) { flush(); continue; }
    flush(); out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  // Bloco de código ainda aberto (resposta chegando) também aparece.
  return { html: out.join(''), blocks };
}

export default {
  async render(box, ctx) {
    const id = Number(ctx.params?.[0]) || null;
    const st = await api.get('/integrations/status').catch(() => ({ ai: {} }));
    const aiOn = Boolean(st.ai?.configured);
    let disposed = false; let chats = []; let chat = id ? null : { id: null, title: 'Nova conversa', messages: [] };
    let controller = null; let streaming = false;

    // ---------------- lista de conversas
    const listEl = h('nav', { class: 'ch-list', 'aria-label': 'Suas conversas' });
    const search = h('input', { type: 'search', class: 'nc-search', placeholder: 'Buscar conversas', 'aria-label': 'Buscar conversas', oninput: () => drawList() });
    function drawList() {
      const q = search.value.trim().toLowerCase(); const items = chats.filter((c) => !q || c.title.toLowerCase().includes(q));
      if (!items.length) { mount(listEl, h('p', { class: 'nc-none' }, chats.length ? 'Nada encontrado.' : 'Suas conversas aparecem aqui.')); return; }
      const now = Date.now(); const groups = [['Hoje', []], ['Últimos 7 dias', []], ['Mais antigas', []]];
      for (const c of items) { const age = now - day(c.updated_at || c.created_at); groups[age < 864e5 ? 0 : age < 6048e5 ? 1 : 2][1].push(c); }
      mount(listEl, groups.filter(([, l]) => l.length).map(([t, l]) => h('div', { class: 'nc-group' }, h('p', t), l.map((c) => h('div', { class: 'nc-item' + (c.id === (chat?.id ?? id) ? ' on' : '') },
        h('a', { href: '#/chat/' + c.id, title: c.title, onclick: () => root.classList.remove('side-open') }, h('span', c.title)),
        h('button', { type: 'button', class: 'nc-more', 'aria-label': `Opções de ${c.title}`, onclick: (e) => itemMenu(e.currentTarget, c) }, '⋯'))))));
    }
    function itemMenu(btn, c) {
      document.querySelector('.nc-pop')?.remove();
      const close = () => { pop.remove(); document.removeEventListener('pointerdown', away); };
      const away = (e) => { if (!pop.contains(e.target) && e.target !== btn) close(); };
      const it = (label, fn, cls = '') => h('button', { type: 'button', role: 'menuitem', class: cls, onclick: () => { close(); fn(); } }, label);
      const pop = h('div', { class: 'nc-pop', role: 'menu' },
        it('Renomear', () => {
          const input = h('input', { value: c.title, maxlength: 80, 'aria-label': 'Nome da conversa' });
          modal({ title: 'Renomear conversa', body: h('label', { class: 'field' }, h('span', 'Nome'), input), actions: [{ label: 'Cancelar', kind: 'ghost' },
            { label: 'Salvar', onClick: async () => { await api.patch('/chat/' + c.id, { title: input.value }); c.title = input.value.trim(); if (chat?.id === c.id) chat.title = c.title; drawList(); drawHead(); } }] });
        }),
        it('Excluir', async () => { if (!await confirmBox(`Excluir a conversa "${c.title}"?`)) return; try { await api.del('/chat/' + c.id); toast('Conversa excluída.', 'ok'); if (c.id === chat?.id) location.hash = '#/chat'; else loadList(); } catch (e) { fail(e); } }, 'bad'));
      btn.parentElement.append(pop); document.addEventListener('pointerdown', away);
    }
    async function loadList() { try { chats = (await api.get('/chat')).items; } catch (e) { fail(e); } if (!disposed) drawList(); }

    // ---------------- conversa
    const thread = h('div', { class: 'ch-thread', 'aria-live': 'polite' });
    const titleEl = h('b', { class: 'ch-title' });
    const drawHead = () => { titleEl.textContent = chat?.messages?.length ? chat.title : ''; };
    const cp = composer({
      models: st.ai?.models, defaultModel: st.ai?.defaultModel, disabled: !aiOn, commands: [],
      placeholder: 'Pergunte qualquer coisa à Neva',
      upload: () => Promise.reject(new Error('Por enquanto o chat lê arquivos de texto, Word e PDF; imagens ainda não.')),
      onSubmit: (text, meta) => send(composeDetails(text || 'Leia o arquivo anexado.', meta.files), meta),
      onStop: () => stop(),
    });
    function msgEl(m, i, live) {
      if (m.role === 'user') {
        const cut = String(m.content).indexOf('\n\n=== '); const shown = cut > 0 ? String(m.content).slice(0, cut) : m.content;
        return h('div', { class: 'ch-msg me' }, h('div', { class: 'ch-bubble' }, shown, cut > 0 && h('small', { class: 'ch-att' }, icon('file'), 'arquivo anexado')));
      }
      const { html, blocks } = md(m.content);
      const body = h('div', { class: 'ch-md' + (live ? ' live' : '') }); body.innerHTML = html || (live ? '<p class="ch-wait"><i></i><i></i><i></i></p>' : '');
      body.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copyText(blocks[Number(b.dataset.copy)].code, 'Código copiado.'); });
      const last = i === chat.messages.length - 1;
      return h('div', { class: 'ch-msg ai' }, body, !live && m.content && h('div', { class: 'ch-acts' },
        h('button', { type: 'button', title: 'Copiar resposta', 'aria-label': 'Copiar resposta', onclick: () => copyText(m.content, 'Resposta copiada.') }, icon('copy')),
        last && h('button', { type: 'button', title: 'Gerar de novo', 'aria-label': 'Gerar a resposta de novo', onclick: () => regenerate() }, icon('refresh'))),
      m.error && h('p', { class: 'ch-err' }, m.error));
    }
    const name = ctx.user.name.split(' ')[0];
    function drawThread(live = -1) {
      drawHead();
      const has = chat?.messages?.length > 0;
      root.classList.toggle('empty', !has);
      if (!has) {
        mount(thread, h('div', { class: 'ch-hello' }, h('h1', `O que vamos resolver hoje, ${name}?`),
          !aiOn && h('p', { class: 'ch-off' }, 'IA indisponível: configure RIVER_API_KEY em Configurações.'), cp.el,
          h('div', { class: 'ch-starters' }, STARTERS.map((s) => h('button', { type: 'button', onclick: () => { cp.setValue(s.t); cp.focus(); } }, icon(s.ic), h('span', s.t))))));
        return;
      }
      mount(thread, h('div', { class: 'ch-col' }, chat.messages.map((m, i) => msgEl(m, i, i === live))));
      if (cp.el.parentElement !== dock) dock.append(cp.el);
    }
    const scrollEnd = () => { thread.scrollTop = thread.scrollHeight; };

    async function send(text, meta = {}, regen = false) {
      if (streaming || !text.trim()) return false;
      streaming = true; cp.setResponding(true);
      if (!regen) chat.messages.push({ role: 'user', content: text });
      const reply = { role: 'assistant', content: '' }; chat.messages.push(reply);
      drawThread(chat.messages.length - 1); scrollEnd();
      controller = new AbortController();
      let paint = 0; const repaint = () => { if (paint) return; paint = requestAnimationFrame(() => { paint = 0; const near = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120; drawThread(chat.messages.length - 1); if (near) scrollEnd(); }); };
      try {
        const res = await fetch('/api/chat', { method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-requested-with': 'neva' },
          body: JSON.stringify({ chat_id: chat.id, message: text, model: meta.model || cp.selection().model, effort: meta.effort || cp.selection().effort, regenerate: regen }) });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Não consegui responder agora.'); }
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
            const ev = JSON.parse(line);
            if (ev.t === 'start' && !chat.id) { chat.id = ev.id; chat.title = ev.title; history.replaceState(null, '', '#/chat/' + ev.id); loadList(); }
            else if (ev.t === 'd') { reply.content += ev.d; repaint(); }
            else if (ev.t === 'error') throw new Error(ev.e);
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') { reply.error = e.message; if (!reply.content) chat.messages.pop(); toast(e.message, 'err'); if (!reply.content) { cp.setValue(text.split('\n\n=== ')[0]); } }
      } finally {
        cancelAnimationFrame(paint); streaming = false; controller = null; cp.setResponding(false);
        if (!disposed) { drawThread(); scrollEnd(); loadList(); }
      }
      return true;
    }
    function stop() { controller?.abort(); }
    function regenerate() {
      const lastUser = [...chat.messages].reverse().find((m) => m.role === 'user'); if (!lastUser || streaming) return;
      if (chat.messages.at(-1)?.role === 'assistant') chat.messages.pop();
      send(lastUser.content, {}, true);
    }

    // ---------------- tela
    const dock = h('div', { class: 'ch-dock' });
    const root = h('div', { class: 'nc ch' });
    const side = h('aside', { class: 'nc-side' },
      h('div', { class: 'nc-brand' }, h('span', { class: 'nc-mark' }, icon('message')), h('b', 'Chat Neva'), h('button', { type: 'button', class: 'nc-x', 'aria-label': 'Fechar lista', onclick: () => root.classList.remove('side-open') }, icon('x'))),
      h('a', { class: 'nc-new', href: '#/chat', onclick: () => root.classList.remove('side-open') }, icon('pencil'), 'Nova conversa'),
      search, listEl);
    root.append(side,
      h('section', { class: 'nc-main ch-main' },
        h('header', { class: 'ch-top' }, h('button', { type: 'button', class: 'nc-tb nc-sidebtn', 'aria-label': 'Abrir conversas', onclick: () => root.classList.add('side-open') }, icon('menu')), titleEl),
        thread, dock),
      h('div', { class: 'nc-scrim', onclick: () => root.classList.remove('side-open') }));
    box.classList.add('fill'); document.documentElement.classList.add('studio-lock');
    mount(box, root);
    if (id) {
      try { chat = await api.get('/chat/' + id); } catch (e) { fail(e); location.hash = '#/chat'; return () => {}; }
    }
    drawThread(); scrollEnd(); cp.focus(); loadList();
    return () => { disposed = true; controller?.abort(); document.documentElement.classList.remove('studio-lock'); };
  }
};
