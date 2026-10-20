// "Texto com IA": o resumo escrito pela IA abre como as dicas de prospecção (tela cheia escura, cartão em degradê, tipografia pesada).
import { h, icon, toast } from './ui.js';
import { generatingOrb } from './generating-orb.js';

const LABEL = { hoje: 'hoje', '7d': '7 dias', '1m': '1 mês', '3m': '3 meses', '6m': '6 meses', '1a': '1 ano' };

export function openInsight({ period, load }) {
  if (document.querySelector('.tips-back.ins-back')) return;
  let closed = false;
  const close = () => { if (closed) return; closed = true; document.removeEventListener('keydown', esc, true); back.classList.add('out'); setTimeout(() => back.remove(), 160); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const orb = generatingOrb({ text: 'Lendo seus números', size: 110 });
  const body = h('div', { class: 'ins ins-wait' }, orb.el, h('p', 'A IA está lendo os números do período…'));
  orb.setRunning(true);
  const card = h('article', { class: 'tips-card ins-card', 'aria-live': 'polite' }, body);
  const back = h('div', { class: 'tips-back ins-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Resumo do período escrito por IA' },
    h('div', { class: 'tips ins-wrap' }, h('header', h('h2', 'Seu período, em palavras.'), h('button', { type: 'button', class: 'tips-x', 'aria-label': 'Fechar', onclick: close }, icon('x'))), card));
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc, true); document.body.append(back); back.querySelector('.tips-x').focus();

  load().then((r) => {
    if (closed) return;
    const d = r.data;
    const text = r.summary;
    const copy = h('button', { type: 'button', class: 'ins-btn', onclick: async () => { try { await navigator.clipboard.writeText(text); toast('Texto copiado.', 'ok'); } catch { toast('Não foi possível copiar.', 'err'); } } }, icon('copy'), 'Copiar texto');
    const done = d
      ? h('div', { class: 'ins' },
        h('span', { class: 'pill' }, `RESUMO DO PERÍODO · ${(LABEL[period] || period).toUpperCase()}`),
        h('h3', d.titulo), h('p', { class: 'lead' }, d.destaque),
        h('ol', d.pontos.map((p, i) => h('li', h('b', String(i + 1).padStart(2, '0')), h('div', h('strong', p.rotulo), h('span', p.texto))))),
        h('div', { class: 'next' }, h('span', 'PRÓXIMO PASSO'), h('p', d.proximo_passo)), h('div', { class: 'ins-foot' }, copy, h('small', 'Gerado por IA a partir dos números reais do período.')))
      : h('div', { class: 'ins' }, h('span', { class: 'pill' }, 'RESUMO DO PERÍODO'), h('p', { class: 'lead', style: 'white-space:pre-wrap' }, text), h('div', { class: 'ins-foot' }, copy));
    body.replaceWith(done);
  }).catch((e) => { if (closed) return; body.replaceWith(h('div', { class: 'ins' }, h('span', { class: 'pill' }, 'NÃO FOI POSSÍVEL'), h('p', { class: 'lead' }, e.message || 'Não consegui gerar o texto agora. Tente de novo em instantes.'), h('div', { class: 'ins-foot' }, h('button', { type: 'button', class: 'ins-btn', onclick: close }, 'Fechar')))); });
}
