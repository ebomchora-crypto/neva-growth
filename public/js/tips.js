import { h, icon } from './ui.js';

// "Se você quer vender, você tem que aplicar isso." — seis cartões de dicas de venda, tela cheia e sem rolagem.
const B = (t) => h('b', t);
const CARDS = [
  () => h('div', { class: 'tp tp1' }, h('h3', 'PARE ', B('IMEDIATAMENTE'), ' DE ABORDAR COM TEXTO.'), h('p', 'É comprovado que você perde clientes por conta disso!'), h('span', { class: 'tpl' }, 'ABORDE APENAS COM ÁUDIO OU LIGAÇÃO!')),
  () => h('div', { class: 'tp tp2' }, h('h3', 'ABORDAGEM'), h('span', { class: 'pill' }, 'VALIDADA EM ÁUDIO'),
    h('p', 'Opa, tudo bem? Eu estava dando uma olhada em algumas empresas que têm potencial de melhorar a presença na internet e acabei encontrando vocês!'),
    h('p', 'E aí eu tomei a iniciativa de entrar em contato porque quero desenvolver um site pra vocês.'),
    h('p', 'A minha ideia é bem simples: eu faço uma prévia, sem compromisso nenhum, pra vocês conhecerem meu trabalho. Se gostarem, a gente combina um valor simbólico e, se ficarem satisfeitos, vocês podem me indicar pra algum conhecido.'),
    h('p', 'Posso preparar essa prévia pra vocês?')),
  () => h('div', { class: 'tp tp3' }, h('h3', 'FAÇA PRÉVIAS ', h('span', { class: 'pill' }, 'EM FORMATO DE'), ' IMAGEM SE ESTIVER PROSPECTANDO EM MASSA.')),
  () => h('div', { class: 'tp tp4' }, h('h3', 'ESTUDE A EMPRESA ANTES DE ABORDAR!'), h('i', { class: 'rule' }), h('p', 'É importante validar a presença da empresa no Instagram e em outras redes sociais.')),
  () => h('div', { class: 'tp tp5' }, h('h3', 'ELABORE SITES COM MUITAS IMAGENS GERADAS, PRINCIPALMENTE COMO IMAGENS DE FUNDO!'), h('span', { class: 'pill line' }, 'ISSO VAI ELEVAR O NÍVEL DO SEU SITE.')),
  () => h('div', { class: 'tp tp6' }, h('h3', 'SE O CLIENTE DEMONSTROU UM ', B('MÍNIMO DE INTERESSE'), ' E PAROU DE TE RESPONDER, FAÇA ', B('FOLLOW-UP QUANTAS VEZES FOR NECESSÁRIO.')), h('span', { class: 'pill solid' }, 'ESTÁ COMPROVADO QUE AS VENDAS ', B('ACONTECEM DEPOIS DO SÉTIMO FOLLOW-UP.')))
];

export function openTips() {
  if (document.querySelector('.tips-back')) return;
  const close = () => { document.removeEventListener('keydown', esc); back.classList.add('out'); setTimeout(() => back.remove(), 160); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const back = h('div', { class: 'tips-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Dicas de venda' },
    h('div', { class: 'tips' }, h('header', h('h2', 'Se você quer vender, você tem que aplicar isso.'), h('button', { type: 'button', class: 'tips-x', 'aria-label': 'Fechar', onclick: close }, icon('x'))),
      h('div', { class: 'tips-grid' }, CARDS.map((c) => h('article', { class: 'tips-card' }, c())))));
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc); document.body.append(back);
  back.querySelector('.tips-x').focus();
}
