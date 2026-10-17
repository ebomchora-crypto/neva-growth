import { api } from '../api.js';
import { h, mount, confirmBox, toast, fail, copyText, downloadFile, hero, dtt } from '../ui.js';

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const [st, me] = await Promise.all([api.get('/integrations/status'), api.get('/me')]);
    const aiOn = st.ai.configured; let tab = 'criar'; let mode = 'idea'; let format = 'text'; let output = ''; let lastInput = '';
    const body = h('div');
    const input = h('textarea', { rows: 7, placeholder: 'Ex.: Quero criar um site para uma pizzaria, bem elaborado, profissional e com animações bonitas. Preciso de cardápio, fotos dos produtos e pedido pelo WhatsApp.', 'aria-label': 'Sua ideia' });
    const outBox = h('div');
    const drawOut = () => mount(outBox, output ? h('div', { class: 'stack' }, h('pre', { class: 'code', style: 'white-space:pre-wrap;max-height:55vh' }, output),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(output, 'Prompt copiado.') }, 'Copiar'), h('button', { class: 'btn ghost', onclick: () => downloadFile(`prompt.${format === 'json' ? 'json' : 'txt'}`, output) }, 'Baixar'),
        canWrite && h('button', { class: 'btn ghost', onclick: async () => { try { await api.post('/prompts', { input: lastInput, output, mode, format }); toast('Salvo em "Meus prompts".', 'ok'); } catch (e) { fail(e); } } }, 'Salvar')))
      : h('div', { class: 'empty' }, h('b', 'Sua ideia entra aqui. O prompt sai pronto.'), 'Pode escrever de forma simples. A IA cuida da estrutura sem perder a sua intenção.'));
    const seg = (items, value, set) => h('div', { class: 'seg' }, items.map(([v, l]) => h('button', { type: 'button', class: value === v ? 'on' : '', onclick: () => { set(v); drawCreate(); } }, l)));
    const gen = h('button', { class: 'btn', disabled: !aiOn || !canWrite, onclick: async () => {
      lastInput = input.value; gen.disabled = true; gen.textContent = 'Gerando…';
      try { const r = await api.post('/prompts/generate', { mode, format, input: lastInput }); output = r.output.trim(); drawOut(); } catch (e) { fail(e); } finally { gen.disabled = !aiOn; gen.textContent = mode === 'idea' ? '✦ Gerar prompt' : '✦ Melhorar prompt'; } } }, '✦ Gerar prompt');
    function drawCreate() {
      input.placeholder = mode === 'idea' ? 'Ex.: Quero criar um site para uma pizzaria, bem elaborado, profissional e com animações bonitas. Preciso de cardápio, fotos dos produtos e pedido pelo WhatsApp.' : 'Cole aqui o prompt que você já escreveu.';
      gen.textContent = mode === 'idea' ? '✦ Gerar prompt' : '✦ Melhorar prompt';
      mount(body, h('div', { class: 'grid g2', style: 'align-items:start' }, h('div', { class: 'card pad stack' },
        seg([['idea', 'Criar a partir de uma ideia'], ['improve', 'Melhorar meu prompt']], mode, (v) => { mode = v; }),
        h('div', h('b', 'Formato do prompt final'), h('div', { class: 'row', style: 'margin-top:6px' }, seg([['text', 'Texto'], ['json', 'JSON']], format, (v) => { format = v; }), h('span', { class: 'sm mut' }, 'JSON organiza as instruções, mas não garante uma resposta melhor da IA.'))),
        h('h2', mode === 'idea' ? 'Qual é a sua ideia?' : 'Cole seu prompt'), input,
        !aiOn && h('div', { class: 'notice' }, `IA não configurada: defina ${st.ai.envVar} no servidor para gerar prompts.`),
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', { class: 'sm mut' }, aiOn ? `Uso mensal de IA: ${me.usage.ai.used}/${me.usage.ai.limit}` : ''), gen)),
        h('div', { class: 'card pad stack' }, h('div', { class: 'kicker' }, 'Prompt final'), outBox)));
      drawOut();
    }
    async function drawMine() {
      const { items } = await api.get('/prompts');
      mount(body, items.length ? h('div', { class: 'stack' }, items.map((p) => h('article', { class: 'card pad stack' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', p.title), h('span', { class: 'sm mut' }, `${p.format === 'json' ? 'JSON' : 'Texto'} · ${dtt(p.created_at)}`)),
        h('pre', { class: 'code', style: 'white-space:pre-wrap;max-height:220px' }, p.output), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => copyText(p.output) }, 'Copiar'),
          h('button', { class: 'btn ghost sm', onclick: () => { input.value = p.input; mode = p.mode; format = p.format; output = p.output; lastInput = p.input; tab = 'criar'; draw(); } }, 'Abrir'),
          h('button', { class: 'btn danger sm', onclick: async () => { if (!(await confirmBox('Excluir este prompt?'))) return; await api.del('/prompts/' + p.id); drawMine(); } }, 'Excluir')))))
        : h('div', { class: 'card empty' }, h('b', 'Nenhum prompt salvo'), 'Gere um prompt e use "Salvar".'));
    }
    const tabs = h('div', { class: 'tabs' });
    function draw() { mount(tabs, [['criar', 'Criar prompt'], ['meus', 'Meus prompts']].map(([k, l]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l)), h('span', { class: 'grow' }), h('span', { class: 'sm mut', style: 'align-self:center' }, 'Salvos na sua conta')); tab === 'criar' ? drawCreate() : drawMine(); }
    mount(box, hero({ kicker: 'Neva Growth / Prompts', title: 'Gerador de Prompts.', subtitle: 'Descreva uma ideia ou cole seu prompt. A IA prepara uma versão pronta para usar.' }), tabs, body);
    draw();
  }
};
