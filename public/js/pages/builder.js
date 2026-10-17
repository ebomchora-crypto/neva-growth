import { api } from '../api.js';
import { h, mount, toast, fail, fieldEl, icon, mascotImg } from '../ui.js';

const TEMPLATES = [
  { id: 'inst', title: 'Site institucional', desc: 'Apresentação da empresa com benefícios, serviços, depoimentos e contato.', kind: 'site', sections: ['beneficios', 'servicos', 'depoimentos', 'contato'] },
  { id: 'land', title: 'Landing de captação', desc: 'Página focada em conversão: benefícios, prova social, FAQ e formulário.', kind: 'site', sections: ['beneficios', 'depoimentos', 'faq', 'contato'] },
  { id: 'serv', title: 'Site de serviços', desc: 'Lista de serviços, perguntas frequentes e contato direto.', kind: 'site', sections: ['servicos', 'faq', 'contato'] },
  { id: 'app', title: 'Aplicação de tarefas', desc: 'Interface interativa com persistência local.', kind: 'app' },
  { id: 'sys', title: 'Sistema de cadastros', desc: 'CRUD com várias entidades definidas por um esquema editável.', kind: 'system' }
];
const thumb = (t) => h('div', { class: 'th' }, [14, 34, 54, 74].map((top, i) => h('i', { style: `top:${top}px;width:${[60, 80, 45, 70][i]}%` })));

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const [st, me, refs] = await Promise.all([api.get('/integrations/status'), api.get('/me'), api.get('/library', { kind: 'design' }).catch(() => ({ items: [] }))]);
    const aiOn = st.ai.configured; let tpl = TEMPLATES[0]; const U = me.usage;
    const brief = h('textarea', { rows: 6, placeholder: 'Descreva o site que você quer criar. Ex.: Landing page para uma clínica odontológica em Curitiba, com tratamentos, depoimentos e botão de agendamento pelo WhatsApp.', 'aria-label': 'Descrição do site' });
    const defs = [{ k: 'name', l: 'Nome do projeto', req: true }, { k: 'kind', l: 'Tipo', type: 'select', opts: [['site', 'Site'], ['app', 'Aplicação'], ['system', 'Sistema']] }, { k: 'color', l: 'Cor principal', type: 'color', default: '#2f7bbd' },
      { k: 'style', l: 'Estilo visual', ph: 'minimalista, editorial, tecnológico…' },
      { k: 'reference', l: 'Referência de design (DESIGN.md)', type: 'select', empty: 'Nenhuma', opts: refs.items.filter((r) => !r.locked).map((r) => [r.id, r.title]) }];
    const form = h('form', { class: 'grid g2', onsubmit: (e) => e.preventDefault() }, defs.map((d) => fieldEl(d)));
    const gal = h('div', { class: 'cards' });
    const drawGal = () => mount(gal, TEMPLATES.map((t) => h('button', { type: 'button', class: 'card tpl' + (tpl.id === t.id ? ' on' : ''), style: 'text-align:left', onclick: () => { tpl = t; form.kind.value = t.kind; drawGal(); } }, thumb(t), h('div', { class: 'body' }, h('b', t.title), h('div', { class: 'sm mut' }, t.desc)))));
    drawGal();
    const quota = h('span', { class: 'sm mut' }, aiOn ? `Geração com IA: ${U.builder.used}/${U.builder.limit} no mês · Prompts/assistente: ${U.ai.used}/${U.ai.limit}` : '');
    const btnOpt = h('button', { type: 'button', class: 'btn ghost', disabled: !aiOn || !canWrite, onclick: async () => {
      btnOpt.disabled = true; btnOpt.textContent = 'Otimizando…';
      try { const r = await api.post('/projects/optimize-prompt', { brief: brief.value }); brief.value = r.brief; toast('Prompt otimizado.', 'ok'); } catch (e) { fail(e); } finally { btnOpt.disabled = !aiOn; btnOpt.textContent = 'Otimizar prompt'; } } }, 'Otimizar prompt');
    const name = () => form.name.value.trim();
    const btnAi = h('button', { type: 'button', class: 'btn', disabled: !aiOn || !canWrite, onclick: async () => {
      if (!form.reportValidity()) return;
      btnAi.disabled = true; btnAi.textContent = 'Gerando… (pode levar 1–2 min)';
      try {
        let reference; if (form.reference.value) reference = (await api.get('/library/' + form.reference.value)).content;
        const p = await api.post('/projects/generate-ai', { name: name(), kind: form.kind.value, brief: brief.value, style: form.style.value, color: form.color.value, reference });
        toast('Projeto gerado. Revise o código na IDE.', 'ok'); location.hash = '#/ide/' + p.id;
      } catch (e) { fail(e); btnAi.disabled = false; btnAi.textContent = '✦ Criar com IA'; } } }, '✦ Criar com IA');
    const btnTpl = h('button', { type: 'button', class: 'btn ghost', disabled: !canWrite, onclick: async () => {
      if (!form.reportValidity()) return;
      try { const p = await api.post('/projects', { name: name(), kind: tpl.kind, color: form.color.value, sections: tpl.sections, tagline: brief.value.trim().split('\n')[0].slice(0, 90) || name(), description: brief.value.slice(0, 300) });
        location.hash = '#/ide/' + p.id; } catch (e) { fail(e); } } }, 'Criar a partir do modelo');
    // detalhes do projeto (nome, tipo, cor, estilo, referência) ficam recolhidos sob o botão "+"
    const details = h('div', { class: 'bdetails hide' }, form);
    const toggleDetails = () => details.classList.toggle('hide');
    const colorBtn = h('button', { type: 'button', class: 'bicon', title: 'Escolher a cor principal', 'aria-label': 'Escolher a cor principal', onclick: () => { details.classList.remove('hide'); form.color.focus(); form.color.click?.(); } }, icon('palette'));
    const plusBtn = h('button', { type: 'button', class: 'bicon', title: 'Detalhes do projeto: nome, tipo, estilo e referência', 'aria-label': 'Detalhes do projeto', onclick: toggleDetails }, icon('plus'));
    // modelos: 4 por página, setas reais
    let page = 0; const PER = 4; const models = h('div', { class: 'bmodels' }); const pager = h('div', { class: 'bpager' });
    const drawModels = () => {
      const pages = Math.ceil(TEMPLATES.length / PER);
      mount(models, TEMPLATES.slice(page * PER, page * PER + PER).map((t) => h('button', { type: 'button', class: 'bmodel' + (tpl.id === t.id ? ' on' : ''), onclick: () => { tpl = t; form.kind.value = t.kind; drawModels(); drawGal(); } }, thumb(t), h('span', t.title))));
      mount(pager, h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { page = 0; drawModels(); document.getElementById('allmodels')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Ver todos os modelos →'),
        h('span', { class: 'row' }, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Modelos anteriores', disabled: page === 0, onclick: () => { page--; drawModels(); } }, '‹'), h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Próximos modelos', disabled: page >= pages - 1, onclick: () => { page++; drawModels(); } }, '›')));
    };
    drawModels();
    mount(box, h('div', { class: 'builder stack' },
      h('div', { class: 'bstage' },
        h('div', { class: 'btop' }, h('a', { href: '#/sites' }, '← Voltar aos sites'), h('span', { class: 'k' }, h('i', '●'), ' Builder de sites')),
        mascotImg('dashboard'),
        h('h1', `O que vamos criar, ${ctx.user.name.split(' ')[0]}?`),
        !aiOn && h('div', { class: 'notice' }, `Geração com IA indisponível: defina ${st.ai.envVar} no servidor. Os modelos prontos abaixo funcionam sem IA.`),
        h('div', { class: 'composer' },
          h('div', { class: 'cleft' }, brief, details, h('div', { class: 'cbar' }, plusBtn, btnOpt, h('span', { class: 'grow' }), colorBtn, btnTpl, btnAi)),
          h('div', { class: 'cright' }, models, pager)),
        quota),
      h('h2', { id: 'allmodels' }, 'Modelos iniciais'), gal, h('p', { class: 'sm mut' }, 'Os modelos são originais da Neva Growth e geram HTML/CSS/JS editáveis na IDE.')));
  }
};
