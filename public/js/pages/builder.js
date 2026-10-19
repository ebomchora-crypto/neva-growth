import { api } from '../api.js';
import { dotField } from '../dot-field.js';
import { generatingOrb } from '../generating-orb.js';
import { motionEnabled } from '../motion.js';
import { h, mount, toast, fail, icon } from '../ui.js';

// Estilos do Code Maker (mesmas chaves do servidor: auto, dark, minimal, elegant, vibrant).
const STYLES = [['auto', 'A IA escolhe'], ['dark', 'Moderno escuro'], ['minimal', 'Minimalista claro'], ['elegant', 'Elegante'], ['vibrant', 'Vibrante']];
const IDEAS = [
  { t: 'Barbearia', p: 'Site para a barbearia Navalha de Ouro em Curitiba, com serviços de corte, barba e sobrancelha, preços, galeria e agendamento pelo WhatsApp (41) 99888-7766.' },
  { t: 'Clínica odontológica', p: 'Site para uma clínica odontológica em Recife com tratamentos (implante, clareamento, ortodontia), equipe, perguntas frequentes e botão de agendamento pelo WhatsApp.' },
  { t: 'Restaurante', p: 'Site para um restaurante italiano familiar em São Paulo, com cardápio em destaque, ambiente, horários de funcionamento, localização e reservas pelo WhatsApp.' },
  { t: 'Advocacia', p: 'Site institucional para um escritório de advocacia trabalhista em Belo Horizonte, sóbrio e confiável, com áreas de atuação, como funciona o atendimento e contato.' },
  { t: 'Academia', p: 'Landing page para uma academia de bairro em Porto Alegre com modalidades, planos mensais, horários e aula experimental grátis pelo WhatsApp.' },
  { t: 'Pet shop', p: 'Site para um pet shop com banho e tosa em Fortaleza, serviços, diferenciais, perguntas frequentes e agendamento pelo WhatsApp.' }
];

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const st = await api.get('/integrations/status');
    const aiOn = st.ai.configured;
    let style = 'auto';

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
        brief.value = [brief.value.trim(), r.details].filter(Boolean).join('\n\n');
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
      try { const r = await api.post('/projects/optimize-prompt', { brief: brief.value }); brief.value = r.brief; toast('Pedido otimizado.', 'ok'); } catch (e) { fail(e); } finally { btnOpt.disabled = !aiOn; btnOpt.textContent = 'Otimizar pedido'; }
    } }, 'Otimizar pedido');

    const orb = generatingOrb({ text: 'Neva Studio', size: 150 });
    const btnCreate = h('button', { type: 'button', class: 'btn', disabled: !aiOn || !canWrite, onclick: async () => {
      const d = Object.fromEntries(new FormData(form));
      if (!brief.value.trim() && !d.businessName.trim()) { brief.focus(); toast('Escreva o que você quer no site.', 'err'); return; }
      btnCreate.disabled = true; btnCreate.textContent = 'Criando…'; orb.setRunning(true);
      try {
        const r = await api.post('/code-maker', { action: 'create', brief: { ...d, details: brief.value, style } });
        location.hash = '#/studio/' + r.site.id;
      } catch (e) { fail(e); orb.setRunning(false); btnCreate.disabled = false; btnCreate.textContent = 'Criar site →'; }
    } }, 'Criar site →');
    brief.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) btnCreate.click(); });

    const ideas = h('div', { class: 'bideas' }, h('b', 'Ideias para começar'),
      IDEAS.map((i) => h('button', { type: 'button', class: 'bidea', onclick: () => { brief.value = i.p; brief.focus(); } }, h('span', i.t), h('small', i.p))));
    const status = aiOn
      ? h('span', { class: 'bstatus ok' }, h('i'), 'Só o pedido é obrigatório. A IA planeja, escreve cada seção e monta o site ao vivo.')
      : h('span', { class: 'bstatus' }, h('i'), 'IA indisponível: preencha RIVER_API_KEY na tabela app_settings do banco.');
    box.classList.add('fill');
    mount(box, h('div', { class: 'bstage' },
      h('div', { class: 'btop' }, h('a', { href: '#/sites' }, '← Voltar aos sites'), h('span', { class: 'k' }, h('i', '●'), ' Builder de sites')),
      h('div', { class: 'bhero' }, orb.el, h('h1', `O que vamos criar, ${ctx.user.name.split(' ')[0]}?`)),
      h('div', { class: 'composer' },
        h('div', { class: 'cleft' }, brief, details, chips, status, h('div', { class: 'cbar' }, plusBtn, btnOpt, h('span', { class: 'grow' }), btnCreate)),
        h('div', { class: 'cright' }, ideas))));
    brief.focus();
    return dotField(box.querySelector('.bstage'), { animate: motionEnabled(), color: 'rgb(205,230,255)' });
  }
};
