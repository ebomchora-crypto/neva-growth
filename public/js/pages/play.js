import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail, hero, statCard, pills, icon } from '../ui.js';

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
    const grid = h('div', { class: 'cards playgrid', id: 'playgrid' }); const statsBox = h('div', { class: 'hero-stats' }); const bar = h('div'); const band = h('section', { class: 'card playband' });
    let data; let sug = { items: [], limit: 3, remaining: 3, used: 0 }; const askBand = h('section', { class: 'card askband' }); const adminBox = h('section', { class: 'card pad stack' });
    async function load() { [data, sug] = await Promise.all([api.get('/play', { all: isAdmin ? 1 : '' }), api.get('/play/suggestions', { all: isAdmin ? 1 : '' })]); draw(); }
    function draw() {
      const s = data.stats;
      mount(statsBox, h('div', { class: 'stat' }, h('span', { class: 'sico' }, icon('play')), h('div', { class: 'sbody', style: 'min-width:220px' }, h('small', 'Conteúdos vistos'), h('b', `${s.percent}%`), h('div', { class: 'progress', style: 'margin:6px 0 4px' }, h('i', { style: `width:${s.percent}%` })), h('span', { class: 'shint' }, `${s.seen} de ${s.total} conteúdo(s) visto(s)`))));
      mount(band, h('div', { class: 'pb-l' }, h('div', { class: 'k' }, 'Conteúdo para explorar'), h('h2', 'Entre no Play.'), h('p', { class: 'sm mut', style: 'margin:4px 0 0' }, 'Crie melhor, venda com clareza e tome decisões mais inteligentes.')),
        h('div', { class: 'pb-r' }, h('div', { class: 'pb-p' }, h('b', `${s.percent}%`), h('div', { class: 'progress' }, h('i', { style: `width:${s.percent}%` })), h('small', { class: 'mut' }, `${s.seen} de ${s.total} conteúdo(s)`)), h('button', { class: 'btn', onclick: () => document.getElementById('playgrid')?.scrollIntoView({ behavior: 'smooth' }) }, 'Explorar conteúdos →')));
      mount(bar, data.categories.length > 1 ? pills({ items: [['', 'Todos'], ...data.categories.map((c) => [c, c])], value: cat, onChange: (v) => { cat = v; draw(); } }) : null);
      const items = data.items.filter((i) => !cat || i.category === cat);
      mount(grid, items.length ? items.map((i) => h('article', { class: 'card vcard pcard' },
        h('button', { class: 'poster', type: 'button', 'aria-label': `Assistir: ${i.title}`, onclick: () => watch(i) }, h('span', { class: 'pbtn' }, icon('play')), h('strong', i.title), i.category && h('em', i.category)),
        h('div', { class: 'row pfoot' }, i.seen ? h('span', { class: 'badge ok' }, '✓ visto') : null, !i.published && h('span', { class: 'badge warn' }, 'rascunho'), h('span', { class: 'grow' }),
          h('button', { class: 'btn sm', onclick: () => watch(i) }, 'Assistir'), isAdmin && h('button', { class: 'btn ghost sm', onclick: () => edit(i) }, 'Editar'))))
        : h('div', { class: 'emptyart dashed', style: 'grid-column:1/-1' }, h('span', { class: 'eico' }, icon('play')), h('b', 'Nenhum conteúdo ainda'), isAdmin ? 'Cadastre vídeos em "+ Novo conteúdo".' : 'Em breve.'));
      drawAsk();
    }
    function drawAsk() {
      const canAsk = ctx.user.role !== 'viewer';
      mount(askBand, h('div', { class: 'ab-l' }, h('h2', 'O que você quer aprender?'), h('p', { class: 'sm mut', style: 'margin:6px 0 0;max-width:60ch' }, 'Conte o tema e o resultado que gostaria de alcançar. A equipe editorial recebe cada pedido dentro do painel do Play.')),
        h('div', { class: 'ab-r' }, h('div', { class: 'ab-n' }, h('b', String(sug.remaining)), h('span', h('b', { style: 'display:block' }, 'sugestões disponíveis'), h('small', `limite de ${sug.limit} por semana`))),
          canAsk && h('button', { class: 'btn', disabled: sug.remaining < 1, title: sug.remaining < 1 ? 'Você usou as sugestões desta semana.' : '', onclick: suggest }, 'Sugerir uma aula →')));
      adminBox.classList.toggle('hide', !isAdmin);
      mount(adminBox, isAdmin ? [h('div', { class: 'k' }, 'Painel editorial'), h('h2', 'Pedidos de aulas'),
        sug.items.length ? h('div', { class: 'tablewrap' }, h('table', h('thead', h('tr', ['Quando', 'Quem', 'Tema', 'Resultado esperado', 'Situação', ''].map((c) => h('th', c)))),
          h('tbody', sug.items.map((x) => h('tr', h('td', { class: 'nowrap' }, new Date(String(x.created_at).replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR')), h('td', x.user_name), h('td', h('b', x.topic)), h('td', x.outcome || '—'),
            h('td', h('select', { 'aria-label': 'Situação', onchange: async (e) => { try { await api.put('/play/suggestions/' + x.id, { status: e.target.value }); toast('Situação atualizada.', 'ok'); } catch (er) { fail(er); } } }, [['novo', 'Novo'], ['em_analise', 'Em análise'], ['publicado', 'Publicado'], ['recusado', 'Recusado']].map(([v, l]) => h('option', { value: v, selected: x.status === v }, l)))),
            h('td', h('button', { class: 'btn danger sm', onclick: async () => { if (!(await confirmBox('Excluir este pedido?'))) return; try { await api.del('/play/suggestions/' + x.id); load(); } catch (er) { fail(er); } } }, 'Excluir'))))))) : h('p', { class: 'mut' }, 'Nenhum pedido ainda.')] : null);
    }
    function suggest() {
      const defs = [{ k: 'topic', l: 'Tema da aula', req: true, wide: true, ph: 'Ex.: Como precificar um site para clínicas' }, { k: 'outcome', l: 'Resultado que você quer alcançar', type: 'textarea', rows: 4, wide: true, ph: 'Ex.: Fechar meus 3 primeiros clientes' }];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d)));
      modal({ title: 'Sugerir uma aula', body: h('div', { class: 'stack' }, h('p', { class: 'sm mut', style: 'margin:0' }, `Você ainda pode enviar ${sug.remaining} sugestão(ões) nesta semana.`), f),
        actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Enviar sugestão', keepOpen: true, onClick: async (close) => { if (!f.reportValidity()) return false; const d = readForm(f, defs); await api.post('/play/suggestions', d); toast('Sugestão enviada para a equipe.', 'ok'); close(); load(); } }] });
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
    mount(box, hero({ kicker: 'Neva Growth / Play', title: 'Conhecimento para criar sem parar.', art: 'play', subtitle: 'Vídeos, análises e práticas para criar melhor. Explore os assuntos no seu ritmo, sem etapas obrigatórias.', actions: [isAdmin && h('button', { class: 'btn', onclick: () => edit(null) }, '+ Novo conteúdo')], stats: statsBox }),
      band, h('div', { style: 'margin:14px 0' }, bar), grid, askBand, adminBox, h('div', { class: 'playfoot' }, h('span', 'NEVA GROWTH / PLAY'), h('span', 'Explore · aprenda · crie')));
    await load();
  }
};
