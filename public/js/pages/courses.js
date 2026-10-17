import { api } from '../api.js';
import { h, mount, modal, confirmBox, fieldEl, readForm, toast, fail } from '../ui.js';

const LEVELS = [['iniciante', 'Iniciante'], ['intermediario', 'Intermediário'], ['avancado', 'Avançado']];

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const grid = h('div', { class: 'grid g3' });
    async function load() {
      const { items } = await api.get('/courses');
      mount(grid, !items.length ? h('div', { class: 'card empty', style: 'grid-column:1/-1' }, h('b', 'Nenhum curso ainda'), canWrite ? 'Crie o primeiro curso e adicione aulas.' : '') :
        items.filter((c) => c.published || canWrite).map((c) => {
          const pct = c.lessons_count ? Math.round((c.done_count / c.lessons_count) * 100) : 0;
          return h('article', { class: 'card pad stack' }, h('div', { class: 'row' }, h('span', { class: 'badge' }, LEVELS.find((l) => l[0] === c.level)[1]), !c.published && h('span', { class: 'badge warn' }, 'rascunho')),
            h('h2', c.title), h('p', { class: 'mut', style: 'margin:0' }, c.description || 'Sem descrição.'),
            h('div', h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${pct}%` })), h('div', { class: 'sm mut' }, `${c.done_count}/${c.lessons_count} aulas · ${pct}%`)),
            h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => open(c.id) }, 'Abrir'),
              canWrite && h('button', { class: 'btn ghost', onclick: () => edit(c) }, 'Editar'),
              canWrite && h('button', { class: 'btn danger', onclick: async () => { if (!(await confirmBox(`Excluir o curso "${c.title}" e todas as aulas?`))) return; try { await api.del('/courses/' + c.id); toast('Curso excluído.', 'ok'); load(); } catch (e) { fail(e); } } }, 'Excluir')));
        }));
    }
    function edit(c) {
      const defs = [{ k: 'title', l: 'Título', req: true, wide: true }, { k: 'level', l: 'Nível', type: 'select', opts: LEVELS, default: 'iniciante' }, { k: 'published', l: 'Publicado', type: 'checkbox', default: 1 }, { k: 'description', l: 'Descrição', type: 'textarea', wide: true }];
      const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, c?.[d.k])));
      modal({ title: c ? 'Editar curso' : 'Novo curso', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
        if (!f.reportValidity()) return false; const data = readForm(f, defs);
        if (c) await api.put('/courses/' + c.id, data); else await api.post('/courses', data); toast('Curso salvo.', 'ok'); close(); load(); } }] });
    }
    async function open(id) {
      const c = await api.get(`/courses/${id}/full`);
      let cur = c.lessons.find((l) => !l.completed) || c.lessons[0];
      const side = h('div'); const main = h('div', { class: 'stack' });
      const draw = () => {
        const done = c.lessons.filter((l) => l.completed).length;
        mount(side, h('div', { class: 'progress' }, h('i', { style: `width:${c.lessons.length ? (done / c.lessons.length) * 100 : 0}%` })), h('p', { class: 'sm mut' }, `${done}/${c.lessons.length} concluídas`),
          h('ul', { class: 'list-plain' }, c.lessons.map((l) => h('li', { style: 'cursor:pointer;align-items:center', onclick: () => { cur = l; draw(); } },
            h('span', { style: l === cur ? 'font-weight:700;color:var(--ice-700)' : '' }, `${l.completed ? '✓ ' : ''}${l.title}`),
            canWrite && h('span', { class: 'row' }, h('button', { class: 'btn ghost sm', 'aria-label': 'Editar aula', onclick: (e) => { e.stopPropagation(); lessonForm(l); } }, '✎'),
              h('button', { class: 'btn ghost sm', 'aria-label': 'Excluir aula', onclick: async (e) => { e.stopPropagation(); if (!(await confirmBox(`Excluir a aula "${l.title}"?`))) return; await api.del('/lessons/' + l.id); reopen(); } }, '✕'))))),
          canWrite && h('button', { class: 'btn ghost sm', onclick: () => lessonForm(null) }, '+ Nova aula'));
        mount(main, !cur ? h('div', { class: 'empty' }, h('b', 'Curso sem aulas'), canWrite ? 'Adicione a primeira aula.' : '') : h('div', { class: 'stack' },
          h('h2', cur.title), cur.video_url && videoEl(cur.video_url),
          h('div', { style: 'white-space:pre-wrap' }, cur.content || h('span', { class: 'mut' }, 'Sem conteúdo textual.')),
          h('div', h('button', { class: 'btn' + (cur.completed ? ' ghost' : ''), onclick: async () => { try { await api.post(`/lessons/${cur.id}/complete`, { completed: !cur.completed }); cur.completed = cur.completed ? 0 : 1; draw(); } catch (e) { fail(e); } } }, cur.completed ? 'Desmarcar conclusão' : 'Marcar como concluída'))));
      };
      function lessonForm(l) {
        const defs = [{ k: 'title', l: 'Título', req: true, wide: true }, { k: 'video_url', l: 'Link do vídeo (YouTube ou Vimeo)', wide: true }, { k: 'position', l: 'Ordem', type: 'number' }, { k: 'content', l: 'Conteúdo', type: 'textarea', rows: 8, wide: true }];
        const f = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d, l?.[d.k])));
        modal({ title: l ? 'Editar aula' : 'Nova aula', body: f, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Salvar', keepOpen: true, onClick: async (close) => {
          if (!f.reportValidity()) return false; const data = readForm(f, defs); if (data.position === '') delete data.position;
          if (l) await api.put('/lessons/' + l.id, data); else await api.post('/lessons', { ...data, course_id: id });
          toast('Aula salva.', 'ok'); close(); reopen(); } }] });
      }
      let m;
      const reopen = () => { m.close(); open(id); load(); };
      draw();
      m = modal({ title: c.title, size: 'lg', body: h('div', { class: 'grid', style: 'grid-template-columns:minmax(180px,1fr) 2fr' }, side, main), onClose: load });
    }
    function videoEl(url) {
      let src = null;
      try {
        const u = new URL(url);
        if (/youtube\.com$|youtu\.be$/.test(u.hostname.replace(/^www\./, ''))) { const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v'); if (/^[\w-]{6,20}$/.test(id || '')) src = `https://www.youtube-nocookie.com/embed/${id}`; }
        else if (u.hostname.endsWith('vimeo.com')) { const id = u.pathname.split('/').filter(Boolean).pop(); if (/^\d+$/.test(id)) src = `https://player.vimeo.com/video/${id}`; }
      } catch { /* url inválida */ }
      return src ? h('iframe', { src, style: 'width:100%;aspect-ratio:16/9;border:0;border-radius:10px', allowfullscreen: true, referrerpolicy: 'no-referrer', title: 'Vídeo da aula' })
        : h('a', { href: /^https?:\/\//.test(url) ? url : '#', target: '_blank', rel: 'noopener noreferrer' }, 'Abrir vídeo');
    }
    mount(box, h('div', { class: 'pagehead' }, h('div', h('h1', 'Academia'), h('p', 'Cursos e trilhas de aprendizado com acompanhamento de progresso.')),
      canWrite && h('button', { class: 'btn', onclick: () => edit(null) }, '+ Novo curso')), grid);
    await load();
  }
};
