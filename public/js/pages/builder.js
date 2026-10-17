import { api } from '../api.js';
import { magneticDots } from '../magnetic-dots.js';
import { h, mount, toast, fail, fieldEl, icon, mascotImg, modal } from '../ui.js';

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
    const quota = h('span', { class: 'sm mut' }, aiOn ? `Geração com IA: ${U.builder.used}/${U.builder.limit} no mês · Prompts/assistente: ${U.ai.used}/${U.ai.limit}` : '');
    const btnOpt = h('button', { type: 'button', class: 'btn ghost', disabled: !aiOn || !canWrite, onclick: async () => {
      btnOpt.disabled = true; btnOpt.textContent = 'Otimizando…';
      try { const r = await api.post('/projects/optimize-prompt', { brief: brief.value }); brief.value = r.brief; toast('Prompt otimizado.', 'ok'); } catch (e) { fail(e); } finally { btnOpt.disabled = !aiOn; btnOpt.textContent = 'Otimizar prompt'; } } }, 'Otimizar prompt');
    const name = () => form.name.value.trim();
    // um único botão, como no original: com IA configurada gera pelo pedido; sem IA cria a partir do modelo escolhido
    const btnCreate = h('button', { type: 'button', class: 'btn', disabled: !canWrite, title: aiOn ? 'Gera o projeto com IA a partir da sua descrição' : 'IA não configurada: cria a partir do modelo selecionado', onclick: async () => {
      if (!form.reportValidity()) { details.classList.remove('hide'); form.reportValidity(); return; }
      btnCreate.disabled = true; const old = btnCreate.textContent; btnCreate.textContent = aiOn ? 'Gerando… (1–2 min)' : 'Criando…';
      try {
        if (aiOn) {
          let reference; if (form.reference.value) reference = (await api.get('/library/' + form.reference.value)).content;
          const p = await api.post('/projects/generate-ai', { name: name(), kind: form.kind.value, brief: brief.value, style: form.style.value, color: form.color.value, effort: effort.k, reference });
          toast('Projeto gerado. Revise o código na IDE.', 'ok'); location.hash = '#/ide/' + p.id;
        } else {
          const p = await api.post('/projects', { name: name(), kind: tpl.kind, color: form.color.value, sections: tpl.sections, tagline: brief.value.trim().split('\n')[0].slice(0, 90) || name(), description: brief.value.slice(0, 300) });
          location.hash = '#/ide/' + p.id;
        }
      } catch (e) { fail(e); btnCreate.disabled = false; btnCreate.textContent = old; } } }, 'Criar site →');
    // detalhes do projeto (nome, tipo, cor, estilo, referência) ficam recolhidos sob o botão "+"
    const details = h('div', { class: 'bdetails hide' }, form);
    const toggleDetails = () => details.classList.toggle('hide');
    const colorBtn = h('button', { type: 'button', class: 'bicon', title: 'Escolher a cor principal', 'aria-label': 'Escolher a cor principal', onclick: () => { details.classList.remove('hide'); form.color.focus(); form.color.click?.(); } }, icon('palette'));
    const plusBtn = h('button', { type: 'button', class: 'bicon', title: 'Detalhes do projeto: nome, tipo, estilo e referência', 'aria-label': 'Detalhes do projeto', onclick: toggleDetails }, icon('plus'));
    // modelos: 4 por página (grade 2x2 com o título sobre a miniatura), setas reais e "Ver todos"
    let page = 0; const PER = 4; const models = h('div', { class: 'bmodels' }); const pager = h('div', { class: 'bpager' });
    const pick = (t) => { tpl = t; form.kind.value = t.kind; drawModels(); };
    const drawModels = () => {
      const pages = Math.ceil(TEMPLATES.length / PER);
      mount(models, TEMPLATES.slice(page * PER, page * PER + PER).map((t) => h('button', { type: 'button', class: 'bmodel' + (tpl.id === t.id ? ' on' : ''), title: t.desc, onclick: () => pick(t) }, thumb(t), h('span', t.title))));
      mount(pager, h('button', { type: 'button', class: 'bmore', onclick: allModels }, 'Ver todos os modelos ', h('i', '→')),
        h('span', { class: 'row' }, h('button', { type: 'button', class: 'bround', 'aria-label': 'Modelos anteriores', disabled: page === 0, onclick: () => { page--; drawModels(); } }, '‹'), h('button', { type: 'button', class: 'bround', 'aria-label': 'Próximos modelos', disabled: page >= pages - 1, onclick: () => { page++; drawModels(); } }, '›')));
    };
    function allModels() {
      const list = h('div', { class: 'cards' }, TEMPLATES.map((t) => h('button', { type: 'button', class: 'card tpl' + (tpl.id === t.id ? ' on' : ''), style: 'text-align:left', onclick: () => { pick(t); m.close(); } }, thumb(t), h('div', { class: 'body' }, h('b', t.title), h('div', { class: 'sm mut' }, t.desc)))));
      const m = modal({ title: 'Todos os modelos', size: 'lg', body: list, actions: [{ label: 'Fechar', kind: 'ghost' }] });
    }
    drawModels();
    // nível de esforço da IA (de verdade: muda o limite de saída e as instruções enviadas ao gerar)
    const LEVELS = [{ k: 'low', l: 'Baixo', d: 'Projeto enxuto e mais veloz' }, { k: 'medium', l: 'Médio', d: 'Equilíbrio entre prazo e acabamento' }, { k: 'high', l: 'Alto', d: 'Acabamento caprichado, leva mais tempo' }, { k: 'xhigh', l: 'Extra-alto', d: 'Máximo de detalhe e arquivos; é o mais demorado' }];
    const effort = { k: (() => { try { return localStorage.getItem('neva-effort') || 'medium'; } catch { return 'medium'; } })() }; if (!LEVELS.some((x) => x.k === effort.k)) effort.k = 'medium';
    const modelName = (st.ai.model || 'Neva IA').replace(/^claude-/i, '').replace(/-/g, ' ');
    const N = LEVELS.length; const idx = () => LEVELS.findIndex((x) => x.k === effort.k);
    const chip = h('button', { type: 'button', class: 'effchip', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'Nível de esforço da IA' });
    const eLabel = h('b', { class: 'elabel' }); const eDesc = h('div', { class: 'ed' }); const fill = h('i', { class: 'efill' }); const thumbEl = h('i', { class: 'ethumb' });
    const track = h('div', { class: 'etrack', role: 'slider', tabindex: 0, 'aria-label': 'Nível de esforço da IA', 'aria-valuemin': 1, 'aria-valuemax': N, onkeydown: (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (d) { e.preventDefault(); setLevel(idx() + d); } else if (e.key === 'Home') setLevel(0); else if (e.key === 'End') setLevel(N - 1); } },
      fill, ...LEVELS.map((_, i) => h('span', { class: 'estop', style: `left:${(i / (N - 1)) * 100}%` })), thumbEl);
    const ticks = h('div', { class: 'eticks' }, LEVELS.map((x, i) => h('button', { type: 'button', class: 'etick', style: `left:${(i / (N - 1)) * 100}%`, onclick: () => setLevel(i) }, x.l)));
    function paint() {
      const i = idx(); const pct = (i / (N - 1)) * 100; const cur = LEVELS[i];
      fill.style.width = pct + '%'; thumbEl.style.left = pct + '%'; track.setAttribute('aria-valuenow', i + 1); track.setAttribute('aria-valuetext', cur.l);
      eLabel.textContent = cur.l; eDesc.textContent = cur.d; ticks.querySelectorAll('.etick').forEach((t, j) => t.classList.toggle('on', j === i));
      mount(chip, h('i', { class: 'slash' }), h('b', modelName), h('span', { class: 'sep' }, '/'), h('span', { class: 'lv' }, cur.l), h('span', { class: 'car' }, '⌃'));
    }
    function setLevel(i) { i = Math.max(0, Math.min(N - 1, i)); if (LEVELS[i].k === effort.k) return; effort.k = LEVELS[i].k; try { localStorage.setItem('neva-effort', effort.k); } catch { /* ok */ } paint(); }
    // arrastar com o mouse/dedo: segue o ponteiro e encaixa no nível mais próximo
    const fromPointer = (e) => { const r = track.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); setLevel(Math.round(x * (N - 1))); };
    track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); track.classList.add('drag'); fromPointer(e); track.focus(); });
    track.addEventListener('pointermove', (e) => { if (track.hasPointerCapture(e.pointerId)) fromPointer(e); });
    const endDrag = (e) => { track.classList.remove('drag'); try { track.releasePointerCapture(e.pointerId); } catch { /* ok */ } };
    track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag);
    const pop = h('div', { class: 'effpop hide', role: 'dialog', 'aria-label': 'Nível de esforço' },
      h('div', { class: 'eh' }, h('span'), eLabel, h('button', { type: 'button', class: 'erst', title: 'Voltar ao padrão (Médio)', 'aria-label': 'Voltar ao padrão', onclick: () => setLevel(1) }, icon('refresh'))),
      h('div', { class: 'em' }, modelName, ' ›'), h('div', { class: 'eslide' }, track, ticks), eDesc, !aiOn && h('div', { class: 'ed muted2' }, 'Vale quando a IA estiver configurada.'));
    paint();
    chip.addEventListener('click', () => { const open = pop.classList.toggle('hide') === false; chip.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('mousedown', (e) => { if (!pop.classList.contains('hide') && !pop.contains(e.target) && !chip.contains(e.target)) { pop.classList.add('hide'); chip.setAttribute('aria-expanded', 'false'); } });
    const status = aiOn ? h('span', { class: 'bstatus ok' }, h('i'), quota.textContent) : h('span', { class: 'bstatus' }, h('i'), 'IA indisponível: defina ', h('code', st.ai.envVar), ' no servidor. Os modelos funcionam sem IA.');
    box.classList.add('fill');
    mount(box, h('div', { class: 'bstage' },
      h('div', { class: 'btop' }, h('a', { href: '#/sites' }, '← Voltar aos sites'), h('span', { class: 'k' }, h('i', '●'), ' Builder de sites')),
      h('div', { class: 'bhero' }, mascotImg('dashboard'), h('h1', `O que vamos criar, ${ctx.user.name.split(' ')[0]}?`)),
      h('div', { class: 'composer' },
        h('div', { class: 'cleft' }, brief, details, status, h('div', { class: 'effwrap' }, pop, chip), h('div', { class: 'cbar' }, plusBtn, btnOpt, h('span', { class: 'grow' }), colorBtn, btnCreate)),
        h('div', { class: 'cright' }, models, pager))));
    return magneticDots(box.querySelector('.bstage'));
  }
};
