// Peças de arte do Acervo > Animações: cada cartão mostra o PRÓPRIO efeito rodando em miniatura (CSS puro, em loop),
// em azul da Neva. Com prefers-reduced-motion o efeito fica parado no quadro final.
import { h } from './ui.js';

const CSS = `
.an-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:16px}
.an-card{display:flex;flex-direction:column;gap:10px;min-width:0}
.an-tile{position:relative;aspect-ratio:4/5;border-radius:20px;overflow:hidden;isolation:isolate;color:#fff;background:linear-gradient(155deg,#0b2a4d 0%,#12426f 55%,#2a73b5 120%);border:1px solid rgba(170,210,245,.28);box-shadow:0 14px 34px rgba(12,48,92,.28)}
.an-tile::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 70% at 85% 0%,rgba(150,205,255,.35),transparent 60%),repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 22px);z-index:-1}
.an-stage{position:absolute;inset:0 0 34% 0;display:grid;place-items:center;perspective:700px;overflow:hidden}
.an-cap{position:absolute;left:14px;right:14px;bottom:14px}.an-cap b{display:block;font-size:clamp(1.15rem,3.4vw,1.55rem);line-height:.98;letter-spacing:-.02em;font-weight:900;text-transform:uppercase}.an-cap small{display:block;margin-top:5px;font-size:12px;color:#cfe6fb}
.an-copy{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-radius:14px;background:linear-gradient(135deg,#2f7bbd,#164a7c);color:#fff;font-weight:700;font-size:.88rem;cursor:pointer;box-shadow:0 8px 20px rgba(47,123,189,.3)}.an-copy:hover{filter:brightness(1.08)}.an-copy svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9}.an-copy[disabled]{opacity:.6}
.an-o{width:46%;aspect-ratio:1;border-radius:22%;background:linear-gradient(145deg,#cfe8ff,#4a95d2);box-shadow:0 10px 30px rgba(120,190,255,.4)}
.an-row{display:flex;gap:7px}.an-row i{width:20px;height:54px;border-radius:7px;background:linear-gradient(#e3f2ff,#6fb0e6)}
@keyframes an-rot{0%,15%{opacity:0;transform:rotate(-8deg) scale(.96)}45%,85%{opacity:1;transform:none}100%{opacity:0;transform:rotate(-8deg) scale(.96)}}
@keyframes an-zoom{0%,15%{opacity:0;transform:scale(.6)}45%,85%{opacity:1;transform:none}100%{opacity:0;transform:scale(.6)}}
@keyframes an-fade{0%,15%{opacity:0}45%,85%{opacity:1}100%{opacity:0}}
@keyframes an-slide{0%,15%{opacity:0;transform:translateX(-44px)}45%,85%{opacity:1;transform:none}100%{opacity:0;transform:translateX(-44px)}}
@keyframes an-stag{0%,10%{opacity:0;transform:translateY(22px)}35%,85%{opacity:1;transform:none}100%{opacity:0;transform:translateY(22px)}}
@keyframes an-flip{0%,20%{transform:rotateY(0)}45%,70%{transform:rotateY(180deg)}95%,100%{transform:rotateY(360deg)}}
@keyframes an-rev{0%,10%{clip-path:inset(0 100% 0 0)}45%,85%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 0 0 100%)}}
@keyframes an-par1{0%,100%{transform:translateY(-14px)}50%{transform:translateY(14px)}}@keyframes an-par2{0%,100%{transform:translateY(-6px)}50%{transform:translateY(6px)}}
@keyframes an-hov{0%,20%,100%{transform:none;box-shadow:0 6px 14px rgba(0,0,0,.2)}45%,75%{transform:translateY(-10px) scale(1.04);box-shadow:0 22px 34px rgba(0,0,0,.35)}}
@keyframes an-morph{0%,10%{border-radius:50%;clip-path:none;transform:rotate(0)}40%{border-radius:0;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);transform:rotate(0)}70%,85%{clip-path:polygon(0 0,100% 18%,82% 100%,10% 84%);border-radius:0}100%{border-radius:50%;clip-path:none}}
@keyframes an-scr{0%{transform:translateY(40%)}100%{transform:translateY(-40%)}}
@keyframes an-path{0%{offset-distance:0%}100%{offset-distance:100%}}
@keyframes an-split{0%,10%{transform:translateY(105%)}40%,85%{transform:none}100%{transform:translateY(-105%)}}
@keyframes an-mag{0%,100%{transform:translate(0,0)}30%{transform:translate(9px,-5px)}60%{transform:translate(-7px,6px)}}
@keyframes an-pin{0%,100%{opacity:.3;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
.ant-rotate .an-o{animation:an-rot 3.4s ease-in-out infinite}.ant-zoom .an-o{animation:an-zoom 3.4s cubic-bezier(.22,1,.36,1) infinite}.ant-fade .an-o{animation:an-fade 3.4s ease-out infinite}.ant-slide .an-o{animation:an-slide 3.4s cubic-bezier(.22,1,.36,1) infinite}
.ant-stagger .an-row i{animation:an-stag 3.4s cubic-bezier(.22,1,.36,1) infinite}.ant-stagger .an-row i:nth-child(2){animation-delay:.12s}.ant-stagger .an-row i:nth-child(3){animation-delay:.24s}.ant-stagger .an-row i:nth-child(4){animation-delay:.36s}
.ant-flip .an-o{animation:an-flip 3.8s ease-in-out infinite;width:42%;aspect-ratio:3/4;border-radius:14px}
.ant-reveal .an-o{animation:an-rev 3.6s cubic-bezier(.76,0,.24,1) infinite;width:62%;aspect-ratio:4/3;border-radius:14px}
.an-px{position:absolute;inset:0}.an-px .an-o{position:absolute;width:26%}.an-px .p1{left:18%;top:20%;animation:an-par1 4s ease-in-out infinite}.an-px .p2{left:46%;top:36%;width:18%;animation:an-par2 4s ease-in-out infinite;opacity:.8}.an-px .p3{left:66%;top:14%;width:14%;animation:an-par1 4s ease-in-out infinite reverse;opacity:.6}
.ant-hover .an-o{width:56%;aspect-ratio:3/2;border-radius:14px;animation:an-hov 3.2s cubic-bezier(.22,1,.36,1) infinite}
.ant-morph .an-o{animation:an-morph 3.8s ease-in-out infinite}
.an-sc{position:absolute;inset:0;display:grid;place-items:center}.an-sc .col{display:grid;gap:9px;width:62%;animation:an-scr 3.4s cubic-bezier(.45,0,.2,1) infinite alternate}.an-sc .col i{height:34px;border-radius:9px;background:linear-gradient(90deg,#e3f2ff,#8cc3f0)}
.an-mo{position:absolute;inset:0}.an-mo svg{position:absolute;inset:8% 6% 6% 6%;width:88%;height:86%}.an-mo .dot{position:absolute;left:0;top:0;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 0 16px #9fd0ff;offset-path:path("M 10 150 C 40 20, 110 20, 140 90 S 190 150, 210 40");animation:an-path 3.4s cubic-bezier(.45,0,.2,1) infinite alternate;offset-rotate:0deg}
.ant-split-text .ln{overflow:hidden;line-height:1.05;font-weight:900;font-size:1.5rem}.ant-split-text .ln span{display:block;animation:an-split 3.4s cubic-bezier(.22,1,.36,1) infinite}.ant-split-text .ln:nth-child(2) span{animation-delay:.12s}
.ant-magnetic-button .btn2{padding:11px 20px;border-radius:99px;background:#fff;color:#164a7c;font-weight:800;font-size:.8rem;animation:an-mag 3.2s ease-in-out infinite}
.an-pn{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;padding:0 16px}.an-pn .pan{aspect-ratio:1;border-radius:14px;background:linear-gradient(145deg,#cfe8ff,#4a95d2);box-shadow:0 10px 24px rgba(120,190,255,.4)}.an-pn .st{display:grid;gap:8px}.an-pn .st i{height:12px;border-radius:6px;background:rgba(255,255,255,.28);animation:an-pin 3.2s ease-in-out infinite}.an-pn .st i:nth-child(2){animation-delay:1s}.an-pn .st i:nth-child(3){animation-delay:2s}
.ant-generic .an-o{animation:an-fade 3.4s ease-out infinite}
.an-photo{background:#06182c}.an-photo::before{display:none}.an-photo img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(.22,1,.36,1)}.an-card:hover .an-photo img{transform:scale(1.04)}
@media(prefers-reduced-motion:reduce){.an-card:hover .an-photo img{transform:none}}
@media(prefers-reduced-motion:reduce){.an-tile *{animation:none!important}.an-tile .an-o,.an-tile .an-row i{opacity:1}}
`;
const FLAG = 'an-style';
const o = () => h('div', { class: 'an-o' });
const ART = {
  rotate: () => o(), zoom: () => o(), fade: () => o(), slide: () => o(), morph: () => o(), flip: () => o(), reveal: () => o(), hover: () => o(),
  stagger: () => h('div', { class: 'an-row' }, h('i'), h('i'), h('i'), h('i')),
  parallax: () => h('div', { class: 'an-px' }, h('div', { class: 'an-o p1' }), h('div', { class: 'an-o p2' }), h('div', { class: 'an-o p3' })),
  'smooth-scroll': () => h('div', { class: 'an-sc' }, h('div', { class: 'col' }, ...Array.from({ length: 7 }, () => h('i')))),
  'motion-path': () => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 220 170'); s.innerHTML = '<path d="M 10 150 C 40 20, 110 20, 140 90 S 190 150, 210 40" fill="none" stroke="rgba(190,225,255,.45)" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>'; return h('div', { class: 'an-mo' }, s, h('i', { class: 'dot' })); },
  'split-text': () => h('div', {}, h('div', { class: 'ln' }, h('span', 'Palavras')), h('div', { class: 'ln' }, h('span', 'em cena.'))),
  'magnetic-button': () => h('div', { class: 'btn2' }, 'Falar agora'),
  'scroll-pin': () => h('div', { class: 'an-pn' }, h('div', { class: 'pan' }), h('div', { class: 'st' }, h('i'), h('i'), h('i'))),
};
const key = (title) => String(title || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Cartão-miniatura de uma animação: arte viva + nome + frase. */
const IMG = new Set(['rotate', 'zoom', 'fade', 'slide', 'stagger', 'flip', 'reveal', 'parallax', 'hover', 'morph', 'smooth-scroll', 'motion-path', 'split-text', 'magnetic-button', 'scroll-pin']);
export function animTile(item) {
  // Os 15 efeitos principais têm arte própria (já com o nome e a frase na imagem); os demais usam a miniatura animada em CSS.
  if (isPromptAnim(item) && IMG.has(key(item.title))) {
    if (!document.getElementById(FLAG)) { const s = document.createElement('style'); s.id = FLAG; s.textContent = CSS; document.head.append(s); }
    return h('div', { class: 'an-tile an-photo' }, h('img', { src: `/img/anim/${key(item.title)}.webp`, alt: `${item.title}: ${item.summary || ''}`, loading: 'lazy', decoding: 'async', width: 430, height: 538 }));
  }
  if (!document.getElementById(FLAG)) { const s = document.createElement('style'); s.id = FLAG; s.textContent = CSS; document.head.append(s); }
  const k = key(item.title); const make = ART[k];
  return h('div', { class: `an-tile ant-${make ? k : 'generic'}`, role: 'img', 'aria-label': `Prévia da animação ${item.title}` },
    h('div', { class: 'an-stage' }, make ? make() : o()),
    h('div', { class: 'an-cap' }, h('b', item.title), item.summary && h('small', item.summary)));
}
export const isPromptAnim = (it) => it.category === 'Prompt de animação';
const ORDER = ['rotate', 'zoom', 'fade', 'slide', 'stagger', 'flip', 'reveal', 'parallax', 'hover', 'morph', 'smooth-scroll', 'motion-path', 'split-text', 'magnetic-button', 'scroll-pin'];
/** Ordem do Acervo: os 15 prompts na sequência da vitrine, depois o resto. */
export const animOrder = (it) => { const i = ORDER.indexOf(key(it.title)); return isPromptAnim(it) && i >= 0 ? i : 100; };
