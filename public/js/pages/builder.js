import { api } from '../api.js';
import { dotField } from '../dot-field.js';
import { generatingOrb } from '../generating-orb.js';
import { motionEnabled } from '../motion.js';
import { launchOrb } from '../morph-input.js';
import { aiPrompt } from '../ai-prompt.js';
import { h, mount, toast, fail, icon, confirmBox, modal, dtt } from '../ui.js';

const ST = { ready: ['Pronto', 'ok'], building: ['Em criação', 'run'], planning: ['Em criação', 'run'], error: ['Parou no meio', 'bad'] };

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const st = await api.get('/integrations/status');
    const aiOn = st.ai.configured;
    let tab = (() => { try { return sessionStorage.getItem('builderTab') || 'create'; } catch { return 'create'; } })();

    // Só o AI Prompt (texto + modelo + raciocínio + enviar) e "Otimizar pedido". O Studio decide o resto (estilo, cores, seções).
    const orb = generatingOrb({ text: 'Neva Studio', size: 150 });
    let creating = false;
    const prompt = aiPrompt({ models: st.ai.models, defaultModel: st.ai.defaultModel, disabled: !aiOn || !canWrite,
      placeholder: 'Descreva o site que você quer. Ex.: site para uma clínica odontológica em Curitiba, com tratamentos, depoimentos e botão de agendamento pelo WhatsApp.',
      onSubmit: async (text, sel) => {
        if (creating) return;
        if (!text.trim()) { prompt.shake(); toast('Escreva o que você quer no site.', 'err'); return; }
        creating = true; prompt.setBusy(true);
        try {
          const r = await launchOrb(prompt.card, () => api.post('/code-maker', { action: 'create', brief: { details: text, style: 'auto' }, ...sel }), { working: 'Criando o projeto', done: 'Abrindo o Studio', radius: 18 });
          if (r?.site) location.hash = '#/studio/' + r.site.id;
        } catch (e) { fail(e); } finally { creating = false; prompt.setBusy(false); }
      } });
    const btnOpt = h('button', { type: 'button', class: 'btn ghost ap-opt', disabled: !aiOn || !canWrite, onclick: async () => {
      if (!prompt.field.value.trim()) { prompt.field.focus(); prompt.shake(); return; }
      btnOpt.disabled = true; btnOpt.textContent = 'Otimizando…';
      try { const r = await api.post('/projects/optimize-prompt', { brief: prompt.field.value }); prompt.setValue(r.brief); toast('Pedido otimizado.', 'ok'); } catch (e) { fail(e); } finally { btnOpt.disabled = !aiOn; btnOpt.textContent = 'Otimizar pedido'; }
    } }, 'Otimizar pedido');
    const status = aiOn ? null : h('span', { class: 'bstatus' }, h('i'), 'IA indisponível: preencha RIVER_API_KEY na tabela app_settings do banco.');

    // ---- Meus sites (como a aba de projetos do Lovable): prévia, editar, publicar, renomear, duplicar, excluir.
    const sitesBox = h('div', { class: 'bsites' });
    const countEl = h('em', { class: 'bt-n' });
    async function loadSites() {
      mount(sitesBox, h('p', { class: 'bs-empty' }, 'Carregando seus sites…'));
      let items = [];
      try { items = (await api.get('/projects')).items.filter((p) => p.studio); } catch (e) { fail(e); }
      countEl.textContent = String(items.length);
      if (!items.length) {
        mount(sitesBox, h('div', { class: 'bs-empty' }, h('b', 'Você ainda não criou sites aqui.'), h('span', 'Descreva o site na aba Criar e ele aparece nesta lista, pronto para editar e publicar.'),
          h('button', { type: 'button', class: 'btn sm', onclick: () => setTab('create') }, 'Criar meu primeiro site')));
        return;
      }
      const statusOf = (p) => (p.published ? ['Publicado', 'pub'] : ST[p.cm_status] || ['Pronto', 'ok']);
      const preview = (p) => {
        const wrap = h('div', { class: 'bs-shot' }, h('span', { class: 'bs-noshot' }, icon('layout')));
        const frame = (src) => { const fr = h('iframe', { title: `Prévia de ${p.name}`, src, sandbox: 'allow-scripts', loading: 'lazy', tabindex: '-1' });
          const fit = () => { fr.style.transform = `scale(${wrap.clientWidth / 1280})`; }; mount(wrap, fr); requestAnimationFrame(fit); new ResizeObserver(fit).observe(wrap); };
        if (p.files_count > 0) { if (p.published) frame(`/s/${p.slug}/`); else api.post(`/projects/${p.id}/preview-token`).then((t) => frame(t.url)).catch(() => {}); }
        return wrap;
      };
      const act = (label, ic, fn, cls = '') => h('button', { type: 'button', class: 'bs-act ' + cls, onclick: fn }, icon(ic), label);
      mount(sitesBox, h('div', { class: 'bs-grid' }, items.map((p) => {
        const [lab, cls] = statusOf(p);
        const link = p.published ? `${location.origin}/s/${p.slug}/` : null;
        return h('article', { class: 'bs-card' },
          h('a', { class: 'bs-open', href: '#/studio/' + p.id, 'aria-label': `Editar ${p.name}` }, preview(p), h('span', { class: 'bs-chip ' + cls }, h('i'), lab)),
          h('div', { class: 'bs-body' },
            h('div', { class: 'bs-top' }, h('b', p.name), h('small', `Atualizado ${dtt(p.updated_at)}`)),
            link && h('a', { class: 'bs-link', href: link, target: '_blank', rel: 'noopener' }, icon('globe'), `${location.host}/s/${p.slug}/`),
            h('div', { class: 'bs-acts' },
              h('a', { class: 'bs-act main', href: '#/studio/' + p.id }, icon('pencil'), 'Editar'),
              canWrite && act(p.published ? 'Despublicar' : 'Publicar', 'rocket', async () => { try { await api.post(`/projects/${p.id}/publish`, { published: !p.published }); toast(p.published ? 'Site despublicado.' : 'Site publicado.', 'ok'); loadSites(); } catch (e) { fail(e); } }),
              canWrite && act('Renomear', 'file', () => rename(p)),
              canWrite && act('Duplicar', 'layers', async () => { try { await api.post(`/projects/${p.id}/duplicate`); toast('Cópia criada.', 'ok'); loadSites(); } catch (e) { fail(e); } }),
              act('Código', 'code', () => { location.hash = '#/ide/' + p.id; }),
              canWrite && act('Excluir', 'trash', async () => { if (!await confirmBox(`Excluir o site "${p.name}"? Isso não pode ser desfeito.`)) return; try { await api.del('/projects/' + p.id); toast('Site excluído.', 'ok'); loadSites(); } catch (e) { fail(e); } }, 'danger'))));
      })));
    }
    function rename(p) {
      const input = h('input', { value: p.name, maxlength: 80, 'aria-label': 'Nome do site' });
      modal({ title: 'Renomear site', body: h('label', { class: 'field' }, h('span', 'Nome'), input), actions: [{ label: 'Cancelar', kind: 'ghost' },
        { label: 'Salvar', onClick: async () => { await api.put('/projects/' + p.id, { name: input.value }); toast('Nome atualizado.', 'ok'); loadSites(); } }] });
    }

    const createView = h('div', { class: 'bview' },
      h('div', { class: 'bhero' }, orb.el, h('h1', `O que vamos criar, ${ctx.user.name.split(' ')[0]}?`)),
      h('div', { class: 'ap-stack' }, prompt.el, btnOpt, status));
    const sitesView = h('div', { class: 'bview sites' }, h('div', { class: 'bs-head' }, h('h1', 'Meus sites'), h('p', 'Veja, edite e publique os sites criados com a IA.')), sitesBox);
    const tabs = h('div', { class: 'btabs', role: 'tablist', 'aria-label': 'Builder' });
    function setTab(t) {
      tab = t; try { sessionStorage.setItem('builderTab', t); } catch { /* ok */ }
      mount(tabs, [['create', 'Criar site', null], ['sites', 'Meus sites', countEl]].map(([k, l, extra]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === k), class: tab === k ? 'on' : '', onclick: () => setTab(k) }, l, extra)));
      createView.hidden = tab !== 'create'; sitesView.hidden = tab !== 'sites';
      if (tab === 'sites') loadSites(); else prompt.focus();
    }
    box.classList.add('fill');
    mount(box, h('div', { class: 'bstage' },
      h('div', { class: 'btop' }, h('a', { href: '#/sites' }, '← Voltar aos sites'), tabs, h('span', { class: 'k' }, h('i', '●'), ' Builder de sites')),
      createView, sitesView));
    setTab(tab);
    api.get('/projects').then((r) => { countEl.textContent = String(r.items.filter((p) => p.studio).length); }).catch(() => {});
    return dotField(box.querySelector('.bstage'), { animate: motionEnabled(), color: 'rgb(205,230,255)' });
  }
};
