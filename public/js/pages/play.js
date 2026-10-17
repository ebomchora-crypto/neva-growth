import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, hero, statCard, pills } from '../ui.js';

export function embedUrl(url) {
  try {
    const u = new URL(url); const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return /^[\w-]{6,20}$/.test(u.pathname.slice(1)) ? `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` : null;
    if (host.endsWith('youtube.com')) { const id = u.searchParams.get('v') || (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null); return /^[\w-]{6,20}$/.test(id || '') ? `https://www.youtube-nocookie.com/embed/${id}` : null; }
    if (host.endsWith('vimeo.com')) { const id = u.pathname.split('/').filter(Boolean).pop(); return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null; }
  } catch { /* inválida */ }
  return null;
}

export default {
  async render(box, ctx) {
    const isAdmin = ctx.user.role === 'admin'; let cat = '';
    const grid = h('div', { class: 'cards' }); const statsBox = h('div', { class: 'hero-stats' }); const bar = h('div');
    let data;
    async function load() { data = await api.get('/play', { all: isAdmin ? 1 : '' }); draw(); }
    function draw() {
      const s = data.stats;
      mount(statsBox, statCard('Conteúdos vistos', `${s.percent}%`, `${s.seen} de ${s.total} conteúdo(s)`), h('div', { class: 'stat' }, h('small', 'Progresso'), h('div', { class: 'progress', style: 'margin-top:8px' }, h('i', { style: `width:${s.percent}%` }))));
      mount(bar, pills({ items: [['', 'Todos'], ...data.categories.map((c) => [c, c])], value: cat, onChange: (v) => { cat = v; draw(); } }));
      const items = data.items.filter((i) => !cat || i.category === cat);
      mount(grid, items.length ? items.map((i) => h('article', { class: 'card pad stack' }, h('div', { class: 'row' }, i.category && h('span', { class: 'badge' }, i.category), i.seen ? h('span', { class: 'badge ok' }, '✓ visto') : null, !i.published && h('span', { class: 'badge warn' }, 'rascunho')),
        h('h2', i.title), h('p', { class: 'mut sm', style: 'margin:0' }, i.description || ''),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => watch(i) }, 'Assistir'), isAdmin && h('button', { class: 'btn ghost sm', onclick: () => edit(i) }, 'Editar'))))
        : h('div', { class: 'card empty', style: 'grid-column:1/-1' }, h('b', 'Nenhum conteúdo ainda'), isAdmin ? 'Cadastre vídeos em "+ Novo conteúdo".' : 'Em breve.'));
    }
    function watch(i) {
      const src = embedUrl(i.video_url);
      const m = modal({ title: i.title, size: 'lg', onClose: load, body: h('div', { class: 'stack' }, src ? h('iframe', { src, style: 'width:100%;aspect-ratio:16/9;border:0;border-radius:10px', allowfullscreen: true, referrerpolicy: 'no-referrer', title: i.title })
        : h('a', { class: 'btn', href: i.video_url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir vídeo em nova aba'), i.description && h('p', i.description)),
        actions: [{ label: i.seen ? 'Marcar como não visto' : 'Marcar como visto', keepOpen: true, onClick: async (close) => { try { await api.post(`/play/${i.id}/seen`, { seen: !i.seen }); close(); } catch (e) { fail(e); return false; } } }] });
    }
    function edit(rec) {
      const defs = [{ k: 'title', l: 'Título', req: true, wide: true }, { k: 'category', l: 'Categoria' }, { k: 'video_url', l: 'Link do vídeo (YouTube/Vimeo)', req: true }, { k: 'description', l: 'Descrição', type: 'textarea', wide: true }, { k: 'published', l: 'Publicado', type: 'checkbox', default: 1 }];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, rec?.[d.k])));
      modal({ title: rec ? 'Editar conteúdo' : 'Novo conteúdo', size: 'lg', body: f, actions: [rec && { label: 'Excluir', kind: 'danger', keepOpen: true, onClick: async (close) => { if (!(await confirmBox(`Excluir "${rec.title}"?`))) return false; await api.del('/play/' + rec.id); close(); load(); } },
        { label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => { if (!f.reportValidity()) return false; const d = readForm(f, defs); if (rec) await api.put('/play/' + rec.id, d); else await api.post('/play', d); toast('Conteúdo salvo.', 'ok'); close(); load(); } }].filter(Boolean) });
    }
    mount(box, hero({ kicker: 'Neva Growth / Play', title: 'Conhecimento para criar sem parar.', subtitle: 'Vídeos, análises e práticas. Explore no seu ritmo, sem etapas obrigatórias.', actions: [isAdmin && h('button', { class: 'btn', onclick: () => edit(null) }, '+ Novo conteúdo')], stats: statsBox }),
      h('div', { class: 'card pad', style: 'margin-bottom:14px' }, bar), grid);
    await load();
  }
};
