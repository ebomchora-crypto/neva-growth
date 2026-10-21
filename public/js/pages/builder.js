import { api } from '../api.js';
import { dotField } from '../dot-field.js';
import { generatingOrb } from '../generating-orb.js';
import { motionEnabled } from '../motion.js';
import { modelSelector } from '../model-selector.js';
import { morphInput } from '../morph-input.js';
import { h, mount, toast, fail, icon, confirmBox, modal, dtt } from '../ui.js';

// Estilos do Code Maker (mesmas chaves do servidor: auto, dark, minimal, elegant, vibrant).
const STYLES = [['auto', 'A IA escolhe'], ['dark', 'Moderno escuro'], ['minimal', 'Minimalista claro'], ['elegant', 'Elegante'], ['vibrant', 'Vibrante']];
const IDEAS = [
  { t: 'Barbearia', p: 'Site para a barbearia Navalha de Ouro em Curitiba, com serviços de corte, barba e sobrancelha, galeria e agendamento pelo WhatsApp (41) 99888-7766.' },
  { t: 'Clínica odontológica', p: 'Site para uma clínica odontológica em Recife com tratamentos (implante, clareamento, ortodontia), equipe, perguntas frequentes e botão de agendamento pelo WhatsApp.' },
  { t: 'Restaurante', p: 'Site para um restaurante italiano familiar em São Paulo, com cardápio em destaque, ambiente, horários de funcionamento, localização e reservas pelo WhatsApp.' },
  { t: 'Advocacia', p: 'Site institucional para um escritório de advocacia trabalhista em Belo Horizonte, sóbrio e confiável, com áreas de atuação, como funciona o atendimento e contato.' },
  { t: 'Academia', p: 'Landing page para uma academia de bairro em Porto Alegre com modalidades, horários e aula experimental grátis pelo WhatsApp.' },
  { t: 'Pet shop', p: 'Site para um pet shop com banho e tosa em Fortaleza, serviços, diferenciais, perguntas frequentes e agendamento pelo WhatsApp.' }
];
const ST = { ready: ['Pronto', 'ok'], building: ['Em criação', 'run'], planning: ['Em criação', 'run'], error: ['Parou no meio', 'bad'] };

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const st = await api.get('/integrations/status');
    const aiOn = st.ai.configured;
    let style = 'auto';
    let tab = (() => { try { return sessionStorage.getItem('builderTab') || 'create'; } catch { return 'create'; } })();
    const selector = modelSelector({ models: st.ai.models, defaultModel: st.ai.defaultModel, theme: 'dark', placement: 'up' });

    const brief = h('textarea', { rows: 6, placeholder: 'Descreva o site que você quer. Ex.: site para uma clínica odontológica em Curitiba, com tratamentos, depoimentos e botão de agendamento pelo WhatsApp.', 'aria-label': 'O que você quer no site' });
    const field = (name, label, ph) => h('label', { class: 'field' }, h('span', label), h('input', { name, placeholder: ph, autocomplete: 'off' }));
    const form = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() },
      field('businessName', 'Nome do negócio (opcional)', 'A IA descobre pelo pedido'),
      field('niche', 'Ramo (opcional)', 'barbearia, clínica, restaurante…'),
      field('city', 'Cidade (opcional)', 'Curitiba'),
      field('phone', 'WhatsApp (opcional)', '(41) 99999-9999'));
    // "Já tem site?": lê o site atual do cliente e preenche o pedido com os textos e contatos dele.
    const siteUrl = h('input', { placeholder: 'www.empresa.com.br', 'aria-label': 'Endereço do site atual', autocomplete: 'off' });
    const btnRead = h('button', { type: 'button', class: 'btn ghost sm', disabled: !canWrite, onclick: async () => {
      if (!siteUrl.value.trim()) { siteUrl.focus(); return; }
      btnRead.disabled = true; btnRead.textContent = 'Lendo o site…';
      try {
        const r = await api.post('/code-maker', { action: 'read_site', url: siteUrl.value.trim() });
        brief.value = [brief.value.trim(), r.details].filter(Boolean).join('\n\n'); mi.grow();
        if (r.name && !form.businessName.value) form.businessName.value = r.name;
        if (r.phone && !form.phone.value) form.phone.value = r.phone;
        toast('Li o site atual e coloquei as informações no pedido.', 'ok');
      } catch (e) { fail(e); } finally { btnRead.disabled = false; btnRead.textContent = 'Ler site'; }
    } }, 'Ler site');
    const details = h('div', { class: 'bdetails hide' }, form, h('div', { class: 'bimport' }, h('span', { class: 'sm' }, 'Já tem site? A IA aproveita os textos e contatos dele.'), h('div', { class: 'row' }, siteUrl, btnRead)));
    const plusBtn = h('button', { type: 'button', class: 'bicon', title: 'Detalhes do negócio e site atual', 'aria-label': 'Detalhes do negócio e site atual', onclick: () => details.classList.toggle('hide') }, icon('plus'));

    const chips = h('div', { class: 'bstyles', role: 'radiogroup', 'aria-label': 'Estilo do site' });
    const drawChips = () => mount(chips, STYLES.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(style === k), class: 'bchip' + (style === k ? ' on' : ''), onclick: () => { style = k; drawChips(); } }, l)));
    drawChips();

    const btnOpt = h('button', { type: 'button', class: 'btn ghost', disabled: !aiOn || !canWrite, onclick: async () => {
      btnOpt.disabled = true; btnOpt.textContent = 'Otimizando…';
      try { const r = await api.post('/projects/optimize-prompt', { brief: brief.value }); brief.value = r.brief; mi.grow(); toast('Pedido otimizado.', 'ok'); } catch (e) { fail(e); } finally { btnOpt.disabled = !aiOn; btnOpt.textContent = 'Otimizar pedido'; }
    } }, 'Otimizar pedido');

    const orb = generatingOrb({ text: 'Neva Studio', size: 150 });
    // Botão de enviar da pílula: valida, anima pílula → orbe enquanto o projeto é criado de verdade e abre o Studio.
    const btnCreate = h('button', { type: 'button', class: 'btn', title: 'Criar site (Ctrl+Enter)', 'aria-label': 'Criar site', disabled: !aiOn || !canWrite, onclick: async () => {
      const d = Object.fromEntries(new FormData(form));
      if (!brief.value.trim() && !d.businessName.trim()) { brief.focus(); mi.shake(); toast('Escreva o que você quer no site.', 'err'); return; }
      btnCreate.disabled = true;
      try {
        const r = await mi.launch(() => api.post('/code-maker', { action: 'create', brief: { ...d, details: brief.value, style }, ...selector.get() }), { working: 'Criando o projeto', done: 'Abrindo o Studio' });
        if (r?.site) location.hash = '#/studio/' + r.site.id;
      } catch (e) { fail(e); } finally { btnCreate.disabled = !aiOn || !canWrite; }
    } });
    const mi = morphInput({ field: brief, tools: [plusBtn, selector.el, btnOpt], send: btnCreate });
    brief.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) btnCreate.click(); });

    const ideas = h('div', { class: 'bideas mi-ideas' }, h('b', 'Ideias para começar'),
      IDEAS.map((i) => h('button', { type: 'button', class: 'bidea', onclick: () => { brief.value = i.p; mi.grow(); brief.focus(); } }, i.t)));
    const status = aiOn
      ? h('span', { class: 'bstatus ok' }, h('i'), 'Só o pedido é obrigatório. A IA planeja, escreve cada seção e publica o site ao vivo.')
      : h('span', { class: 'bstatus' }, h('i'), 'IA indisponível: preencha RIVER_API_KEY na tabela app_settings do banco.');

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
      h('div', { class: 'mi-stack' }, mi.el, h('div', { class: 'mi-extra' }, details, chips, status, ideas)));
    const sitesView = h('div', { class: 'bview sites' }, h('div', { class: 'bs-head' }, h('h1', 'Meus sites'), h('p', 'Veja, edite e publique os sites criados com a IA.')), sitesBox);
    const tabs = h('div', { class: 'btabs', role: 'tablist', 'aria-label': 'Builder' });
    function setTab(t) {
      tab = t; try { sessionStorage.setItem('builderTab', t); } catch { /* ok */ }
      mount(tabs, [['create', 'Criar site', null], ['sites', 'Meus sites', countEl]].map(([k, l, extra]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === k), class: tab === k ? 'on' : '', onclick: () => setTab(k) }, l, extra)));
      createView.hidden = tab !== 'create'; sitesView.hidden = tab !== 'sites';
      if (tab === 'sites') loadSites(); else brief.focus();
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
