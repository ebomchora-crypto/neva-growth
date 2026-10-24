// Momentum Rail — porte em JS puro do componente "Momentum Rail" (carousel-cards) .
import { h, svg, ensureStyle, clamp, reduced, PALETTE } from '../kit.js';
import { toast } from '../../ui.js';

// ---- Cenas desenhadas em camadas azuis; cada camada faz parallax na sua profundidade.
const T = { sun: '#ffffff', far: PALETTE.ice300, mid: PALETTE.ice500, near: PALETTE.ice800, sky: PALETTE.ice100 };
const P = (d, tone) => ['path', { d, fill: T[tone] }];
const Ci = (cx, cy, r, tone) => ['circle', { cx, cy, r, fill: T[tone] }];
const Re = (x, y, width, height, tone) => ['rect', { x, y, width, height, fill: T[tone] }];
const pines = (xs, base, height) => xs.map((x, i) => `M${x - 5} ${base}L${x} ${base - height - (i % 3) * 4}L${x + 5} ${base}Z`).join('');
const windows = (x, y, cols, rows) => { const out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r * 7 + c * 3) % 4 !== 0) out.push(Re(x + c * 7, y + r * 9, 3, 3, 'sky')); return out; };
const SCENES = {
  city: [
    { depth: 2, content: [Ci(150, 56, 16, 'sun')] },
    { depth: 4, content: [P('M0 128Q60 98 120 116T208 106V200H0Z', 'far')] },
    { depth: 7, content: [P('M0 152H18V138L26 130L34 138V146H48V128H62V140H76V132L84 124L92 132V150H110V136H126V146H140V126L150 118L160 126V148H176V138H192V150H208V200H0Z', 'mid')] },
    { depth: 11, content: [P('M0 180Q104 164 208 178V200H0Z', 'near'), P('M74 170V152Q74 148 78 148H118Q122 148 122 152V168Z', 'near'), Re(80, 152, 8, 7, 'sky'), Re(94, 152, 8, 7, 'sky'), Re(108, 152, 8, 7, 'sky')] },
  ],
  mountains: [
    { depth: 2, content: [Ci(54, 48, 12, 'sun')] },
    { depth: 4, content: [P('M0 122L30 92L52 108L84 60L112 100L140 72L172 110L208 86V200H0Z', 'far'), P('M74 75L84 60L94 75L88 71L83 77Z', 'sun'), P('M133 82L140 72L148 82L143 79Z', 'sun')] },
    { depth: 7, content: [P('M0 152L40 118L70 140L104 110L140 146L176 120L208 140V200H0Z', 'mid')] },
    { depth: 11, content: [P(`M0 182Q60 164 120 174T208 168V200H0Z${pines([18, 30, 42, 162, 176, 190], 178, 20)}`, 'near')] },
  ],
  dunes: [
    { depth: 2, content: [Ci(128, 66, 22, 'sun')] },
    { depth: 4, content: [P('M0 128Q50 104 100 124Q150 142 208 112V200H0Z', 'far')] },
    { depth: 7, content: [P('M0 158Q70 120 130 150Q170 168 208 146V200H0Z', 'mid')] },
    { depth: 11, content: [P('M0 188Q40 160 96 176Q150 194 208 170V200H0Z', 'near')] },
  ],
  lake: [
    { depth: 2, content: [Ci(160, 42, 8, 'sun')] },
    { depth: 4, content: [P(`M0 142V130H208V142Z${pines([8, 20, 32, 44, 56, 68, 80, 92, 104, 116, 128, 140, 152, 164, 176, 188, 200], 132, 14)}`, 'far')] },
    { depth: 7, content: [Re(0, 142, 208, 58, 'mid'), P('M40 156H96V158H40ZM120 166H184V168H120ZM24 176H76V178H24Z', 'sky')] },
    { depth: 11, content: [P('M0 184Q60 172 120 182T208 178V200H0Z', 'near'), P('M132 180V162L148 148L164 162V180Z', 'near'), Re(145, 166, 6, 6, 'sun')] },
  ],
  islands: [
    { depth: 2, content: [Ci(52, 54, 14, 'sun')] },
    { depth: 4, content: [Re(0, 130, 208, 70, 'mid'), P('M96 131Q130 104 176 126L188 131Z', 'far'), P('M10 131Q30 120 52 131Z', 'far')] },
    { depth: 7, content: [P('M52 160H88L82 167H58Z', 'near'), P('M70 157V122L90 157Z', 'sun'), P('M66 157V130L54 157Z', 'sky'), P('M20 178H60V180H20ZM110 172H170V174H110Z', 'far')] },
    { depth: 11, content: [P('M0 200V182Q20 170 44 180Q60 187 70 200ZM150 200Q170 176 208 176V200Z', 'near')] },
  ],
  skyline: [
    { depth: 2, content: [Ci(40, 40, 9, 'sun')] },
    { depth: 4, content: [P('M0 200V120H16V96H30V120H44V80H58V112H76V60H82V40H86V60H92V110H110V90H128V118H150V70H166V112H180V96H196V124H208V200Z', 'far')] },
    { depth: 7, content: [P('M0 200V140H24V118H50V146H70V108H100V150H120V126H148V134H170V112H196V144H208V200Z', 'mid'), ...windows(74, 116, 3, 4), ...windows(174, 120, 3, 3), ...windows(28, 126, 3, 2)] },
    { depth: 11, content: [P('M0 170H208V178H0ZM10 178H18V200H10ZM70 178H78V200H70ZM130 178H138V200H130ZM190 178H198V200H190Z', 'near')] },
  ],
  terraces: [
    { depth: 2, content: [Ci(104, 58, 15, 'sun')] },
    { depth: 4, content: [P('M0 108Q104 76 208 102V200H0Z', 'far')] },
    { depth: 7, content: [P('M0 136Q104 112 208 132V200H0ZM0 148Q104 126 208 146V150Q104 130 0 152ZM0 164Q104 142 208 162V166Q104 146 0 168Z', 'mid')] },
    { depth: 11, content: [P('M0 184Q104 162 208 180V200H0ZM24 184Q20 166 27 148H30Q24 166 28 184ZM28 148Q15 140 6 148Q16 143 28 151ZM28 148Q41 138 51 146Q39 142 28 151ZM28 148Q23 134 12 132Q24 136 29 149ZM28 148Q35 134 45 132Q33 138 29 149Z', 'near')] },
  ],
  coast: [
    { depth: 2, content: [Ci(56, 92, 13, 'sun')] },
    { depth: 4, content: [Re(0, 112, 208, 88, 'mid'), P('M118 200V122Q150 96 208 98V200Z', 'far')] },
    { depth: 7, content: [P('M208 200V128Q172 132 150 160Q136 182 112 200Z', 'near'), P('M208 146Q178 150 162 170Q150 186 136 200H140Q154 188 166 172Q182 154 208 150Z', 'sun')] },
    { depth: 11, content: [P('M0 200V172Q50 156 100 200Z', 'near')] },
  ],
};

const ITEMS = [
  { id: 'sp', title: 'Imersão de vendas', location: 'São Paulo, SP', scene: 'city', badge: '2 dias', dates: '24 – 26 out', price: 340, rating: 4.92, reviews: 318 },
  { id: 'gramado', title: 'Planejamento comercial 2027', location: 'Gramado, RS', scene: 'mountains', badge: '3 dias', dates: '3 – 6 nov', price: 610, rating: 4.97, reviews: 142 },
  { id: 'lencois', title: 'Oficina de ofertas e preços', location: 'Barreirinhas, MA', scene: 'dunes', badge: '2 dias', dates: '14 – 16 nov', price: 280, rating: 4.88, reviews: 96 },
  { id: 'bonito', title: 'Retiro de liderança comercial', location: 'Bonito, MS', scene: 'lake', badge: '3 dias', dates: '5 – 8 dez', price: 520, rating: 4.95, reviews: 210 },
  { id: 'noronha', title: 'Laboratório de pós-venda', location: 'Fernando de Noronha, PE', scene: 'islands', badge: '4 dias', dates: '9 – 13 mai', price: 740, rating: 4.9, reviews: 187 },
  { id: 'curitiba', title: 'Dados e metas para o time', location: 'Curitiba, PR', scene: 'skyline', badge: '2 dias', dates: '20 – 22 mar', price: 390, rating: 4.96, reviews: 402 },
  { id: 'vinhedos', title: 'Atendimento que fideliza', location: 'Bento Gonçalves, RS', scene: 'terraces', badge: '3 dias', dates: '12 – 15 jan', price: 450, rating: 4.91, reviews: 133 },
  { id: 'floripa', title: 'Marketing para pequenas lojas', location: 'Florianópolis, SC', scene: 'coast', badge: '3 dias', dates: '2 – 5 abr', price: 560, rating: 4.89, reviews: 158 },
];

const STIFFNESS = 170, DAMPING = 26;  // ~2·√170: criticamente amortecida, sem quique no cartão
const DECELERATION = 0.997;           // taxa normal do UIScrollView, por ms
const DRAG_THRESHOLD = 4;
const rubber = (over, size) => Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / size + 1)) * size;
const maxScroll = (sc) => sc.scrollWidth - sc.clientWidth;
const HEART = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';
const brl = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

/* Profundidade fora da thread principal: cada cartão é uma view timeline no eixo inline. Navegadores sem
   animações dirigidas por rolagem ficam com cartões planos e todos os detalhes visíveis. */
const CSS = `
.kk-carousel-cards-root{container-type:inline-size;container-name:kkrail;width:100%;padding:12px 0 8px;--rail-card:13.5rem}
@container kkrail (min-width:30rem){.kk-carousel-cards-root{--rail-card:15rem}}
.kk-carousel-cards-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:4px;padding:0 14px}
.kk-carousel-cards-head p{margin:0;font-size:12px;color:var(--mut,#4a6f93)}
.kk-carousel-cards-head h3{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em;color:var(--ink,#0e2236);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-carousel-cards-ctl{display:flex;flex:none;align-items:center;gap:6px}
.kk-carousel-cards-count{margin-right:4px;font-size:12px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-carousel-cards-arrow{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);cursor:pointer;transition:background-color .15s,opacity .15s}
.kk-carousel-cards-arrow:hover{background:var(--ice-100,#e3f0fb)}
.kk-carousel-cards-arrow[aria-disabled=true]{opacity:.4;cursor:default}
.kk-carousel-cards-arrow[aria-disabled=true]:hover{background:#fff}
.kk-carousel-cards-arrow:focus-visible,.kk-carousel-cards-go:focus-visible{outline:2px solid var(--ice-800,#164a7c);outline-offset:2px}
.kk-carousel-cards-arrow svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-carousel-cards-scroll{position:relative;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;padding:24px 0;outline:none;scrollbar-width:none}
.kk-carousel-cards-scroll::-webkit-scrollbar{display:none}
.kk-carousel-cards-scroll:focus-visible{box-shadow:inset 0 0 0 2px var(--ice-800,#164a7c)}
.kk-carousel-cards-scroll[data-free=true]{scroll-snap-type:none}
.kk-carousel-cards-scroll[data-dragging=true]{cursor:grabbing}
@media (pointer:fine){.kk-carousel-cards-scroll{cursor:grab;user-select:none;-webkit-user-select:none}}
.kk-carousel-cards-track{position:relative;display:flex;width:max-content;gap:16px;margin:0;list-style:none;padding:0 calc(50cqw - var(--rail-card)/2)}
.kk-carousel-cards-card{flex:none;width:var(--rail-card);scroll-snap-align:center}
.kk-carousel-cards-tilt{position:relative}
.kk-carousel-cards-img{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:16px;background:var(--ice-100,#e3f0fb)}
.kk-carousel-cards-has:focus-within .kk-carousel-cards-img{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-800,#164a7c)}
.kk-carousel-cards-scene{position:absolute;inset:0;background:var(--ice-100,#e3f0fb)}
.kk-carousel-cards-layer{position:absolute;top:0;bottom:0;left:-15%;width:130%}
.kk-carousel-cards-layer svg{width:100%;height:100%;display:block}
.kk-carousel-cards-badge{position:absolute;top:12px;left:12px;border-radius:6px;background:#fff;padding:2px 7px;font-size:11px;font-weight:600;color:var(--ink,#0e2236);box-shadow:0 1px 3px rgba(15,53,96,.2)}
.kk-carousel-cards-fav{position:absolute;top:8px;right:8px;z-index:2;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:50%;background:#fff;color:var(--ink,#0e2236);box-shadow:0 1px 3px rgba(15,53,96,.2);cursor:pointer;transition:background-color .15s}
.kk-carousel-cards-fav:hover{background:var(--ice-100,#e3f0fb)}
.kk-carousel-cards-fav:focus-visible{outline:2px solid var(--ice-800,#164a7c);outline-offset:2px}
.kk-carousel-cards-heart{position:relative;width:18px;height:18px}
.kk-carousel-cards-heart svg{position:absolute;inset:0;width:100%;height:100%;stroke-linejoin:round;stroke-width:2}
.kk-carousel-cards-heart .o{fill:none;stroke:currentColor;transition:color .2s}
.saved .kk-carousel-cards-heart .o{color:var(--ice-600,#2f7bbd)}
.kk-carousel-cards-heart .f{fill:var(--ice-600,#2f7bbd);stroke:var(--ice-600,#2f7bbd)}
.kk-carousel-cards-fill{position:absolute;inset:0;clip-path:inset(100% 0 0 0);transition:clip-path .3s cubic-bezier(.23,1,.32,1)}
.saved .kk-carousel-cards-fill{clip-path:inset(0 0 0 0)}
.kk-carousel-cards-info{padding:12px 2px 0}
.kk-carousel-cards-info h4{margin:0;font-size:14px;font-weight:600;letter-spacing:-.01em;color:var(--ink,#0e2236);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-carousel-cards-link{display:block;width:100%;padding:0;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;outline:none;white-space:inherit;overflow:hidden;text-overflow:ellipsis}
.kk-carousel-cards-link::after{content:"";position:absolute;inset:0;border-radius:16px}
.kk-carousel-cards-loc{margin:0;font-size:12px;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-carousel-cards-det{margin-top:8px;display:flex;align-items:center;gap:6px;font-size:12px}
.kk-carousel-cards-det .r{display:flex;align-items:center;gap:2px;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums}
.kk-carousel-cards-det .r svg{width:12px;height:12px;fill:currentColor}
.kk-carousel-cards-det .r span,.kk-carousel-cards-det .d{color:var(--mut,#4a6f93)}
.kk-carousel-cards-det .d{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-carousel-cards-det .p{margin-left:auto;flex:none;font-weight:600;color:var(--ink,#0e2236);font-variant-numeric:tabular-nums}
.kk-carousel-cards-det .p span{font-weight:400;color:var(--mut,#4a6f93)}
.kk-carousel-cards-sel{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 14px;padding:10px 12px;border-radius:12px;background:var(--ice-100,#e3f0fb);font-size:13px;color:var(--ink,#0e2236)}
.kk-carousel-cards-sel b{font-weight:600}
.kk-carousel-cards-go{flex:none;min-height:36px;padding:0 14px;border:0;border-radius:8px;background:var(--ice-800,#164a7c);color:#fff;font:600 13px inherit;cursor:pointer}
.kk-carousel-cards-go:hover{background:var(--ice-700,#1f5f9b)}
@keyframes kk-carousel-cards-tilt{0%{transform:perspective(900px) translateZ(-180px) rotateY(-14deg)}50%{transform:perspective(900px) translateZ(0) rotateY(0)}100%{transform:perspective(900px) translateZ(-180px) rotateY(14deg)}}
@keyframes kk-carousel-cards-parallax{from{transform:translate3d(calc(var(--rail-depth)*-1),0,0)}to{transform:translate3d(var(--rail-depth),0,0)}}
@keyframes kk-carousel-cards-details{0%,32%{opacity:0;transform:translate3d(0,6px,0)}45%,55%{opacity:1;transform:translate3d(0,0,0)}68%,100%{opacity:0;transform:translate3d(0,6px,0)}}
@supports (animation-timeline:view()){
.kk-carousel-cards-card{view-timeline:--kkrail inline}
.kk-carousel-cards-det{animation:kk-carousel-cards-details linear both;animation-timeline:--kkrail}
@media (prefers-reduced-motion:no-preference){
.kk-carousel-cards-tilt{animation:kk-carousel-cards-tilt linear both;animation-timeline:--kkrail}
.kk-carousel-cards-layer{animation:kk-carousel-cards-parallax linear both;animation-timeline:--kkrail}}}
`;

export default function mount(stage, ctx) {
  ensureStyle('carousel-cards', CSS);
  const saved = new Set();
  let active = 0;

  // ---- DOM
  const scene = (name) => h('div', { class: 'kk-carousel-cards-scene', 'aria-hidden': 'true' }, SCENES[name].map((layer) => {
    const d = h('div', { class: 'kk-carousel-cards-layer', style: `--rail-depth:${layer.depth}%` });
    d.append(svg('svg', { viewBox: '0 0 208 200', preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true' }, ...layer.content.map(([tag, a]) => svg(tag, a))));
    return d;
  }));
  const favBtn = (item) => {
    const wrap = h('span', { class: 'kk-carousel-cards-heart' },
      svg('svg', { class: 'o', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: HEART })),
      h('span', { class: 'kk-carousel-cards-fill' }, svg('svg', { class: 'f', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: HEART }))));
    const b = h('button', { type: 'button', class: 'kk-carousel-cards-fav', 'aria-label': `Salvar ${item.title}`, 'aria-pressed': 'false', onclick: () => {
      const on = !saved.has(item.id); on ? saved.add(item.id) : saved.delete(item.id);
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('saved', on);
    } }, wrap);
    return b;
  };
  const card = (item) => h('li', { class: 'kk-carousel-cards-card' },
    h('div', { class: 'kk-carousel-cards-tilt kk-carousel-cards-has' },
      h('div', { class: 'kk-carousel-cards-img' }, scene(item.scene), h('span', { class: 'kk-carousel-cards-badge' }, item.badge), favBtn(item)),
      h('div', { class: 'kk-carousel-cards-info' },
        // O link se estica sobre o cartão; o coração fica acima dele.
        h('h4', h('button', { type: 'button', class: 'kk-carousel-cards-link', 'data-rail-link': '', onclick: () => select(item) }, item.title)),
        h('p', { class: 'kk-carousel-cards-loc' }, item.location),
        h('div', { class: 'kk-carousel-cards-det' },
          h('span', { class: 'r' }, svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: STAR })), item.rating.toFixed(2).replace('.', ','), h('span', `(${item.reviews})`)),
          h('span', { class: 'd' }, '· ' + item.dates),
          h('span', { class: 'p', title: 'por pessoa' }, brl(item.price))))));
  const track = h('ul', { class: 'kk-carousel-cards-track' }, ITEMS.map(card));
  const scroller = h('section', { class: 'kk-carousel-cards-scroll', 'aria-label': 'Imersões, use as setas do teclado para navegar', tabindex: '0' }, track);
  const chev = (d) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d }));
  const counter = h('span', { class: 'kk-carousel-cards-count', 'aria-live': 'polite' });
  const prev = h('button', { type: 'button', class: 'kk-carousel-cards-arrow', 'aria-label': 'Anterior', onclick: () => step(-1) }, chev('M15 6l-6 6 6 6'));
  const next = h('button', { type: 'button', class: 'kk-carousel-cards-arrow', 'aria-label': 'Próxima', onclick: () => step(1) }, chev('M9 6l6 6-6 6'));
  const selBar = h('div', { class: 'kk-carousel-cards-sel', hidden: true });
  const root = h('section', { class: 'kk-carousel-cards-root', 'aria-label': 'Imersões para o seu time', 'aria-roledescription': 'carrossel' },
    h('div', { class: 'kk-carousel-cards-head' }, h('div', { style: 'min-width:0' }, h('p', 'Próximo trimestre'), h('h3', 'Imersões')), h('div', { class: 'kk-carousel-cards-ctl' }, counter, prev, next)),
    scroller, selBar);
  stage.append(root);

  function select(item) {
    selBar.hidden = false;
    selBar.replaceChildren(h('span', 'Selecionada: ', h('b', item.title)), h('button', { type: 'button', class: 'kk-carousel-cards-go', onclick: () => toast(`Vaga reservada em "${item.title}".`) }, 'Reservar vaga'));
  }

  // ---- Momentum: arrastar, projetar, mola até um cartão, elástico nas pontas
  const s = { mode: 'idle', pointerId: -1, startX: 0, startPos: 0, pos: 0, vel: 0, target: 0, samples: [], raf: 0, last: 0, suppressClick: false };
  const snapPoints = () => { const max = maxScroll(scroller); return Array.from(track.children, (c) => clamp(track.offsetLeft + c.offsetLeft + c.offsetWidth / 2 - scroller.clientWidth / 2, 0, max)); };
  const nearestIndex = (pts, pos) => { let b = 0; for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i] - pos) < Math.abs(pts[b] - pos)) b = i; return b; };
  const releaseVelocity = (samples, now) => { const f = samples[0], l = samples.at(-1) ?? f, dt = l.t - f.t; return dt <= 0 || now - l.t > 60 ? 0 : -(l.x - f.x) / dt; }; // pausa antes de soltar = sem flick
  // Posição virtual: a parte dentro do limite rola nativamente, o excesso vira um translate amortecido (o elástico).
  function apply(pos) {
    const inRange = clamp(pos, 0, maxScroll(scroller)); scroller.scrollLeft = inRange;
    const over = pos - inRange;
    track.style.transform = Math.abs(over) > 0.1 ? `translate3d(${(-rubber(over, scroller.clientWidth)).toFixed(2)}px,0,0)` : '';
  }
  const setFree = (free) => { scroller.dataset.free = String(free); }; // o snap nativo fica desligado enquanto o JS manda
  function stepSpring(now) {
    const dt = Math.min((now - s.last) / 1000, 1 / 30); s.last = now;
    const hh = dt / 4; // sub-passos de Euler semi-implícito mantêm a mola estável em qualquer taxa de quadros
    for (let i = 0; i < 4; i++) { s.vel += (-STIFFNESS * (s.pos - s.target) - DAMPING * s.vel) * hh; s.pos += s.vel * hh; }
    if (Math.abs(s.pos - s.target) < 0.5 && Math.abs(s.vel) < 8) { s.pos = s.target; s.vel = 0; s.mode = 'idle'; apply(s.target); setFree(false); return; }
    apply(s.pos); s.raf = requestAnimationFrame(stepSpring);
  }
  function springTo(target, velocity) {
    cancelAnimationFrame(s.raf);
    if (s.mode !== 'spring' && s.mode !== 'dragging') s.pos = scroller.scrollLeft;
    s.target = target; s.vel = velocity;
    if (reduced()) { s.mode = 'idle'; s.pos = target; apply(target); setFree(false); return; }
    s.mode = 'spring'; setFree(true); s.last = performance.now(); s.raf = requestAnimationFrame(stepSpring);
  }
  function goTo(index) { const pts = snapPoints(); springTo(pts[clamp(index, 0, pts.length - 1)], s.mode === 'spring' ? s.vel : 0); }
  const currentIndex = () => nearestIndex(snapPoints(), s.mode === 'spring' ? s.target : scroller.scrollLeft);
  const step = (d) => goTo(currentIndex() + d);

  let scrollRaf = 0;
  const onScroll = () => { cancelAnimationFrame(scrollRaf); scrollRaf = requestAnimationFrame(() => { active = nearestIndex(snapPoints(), scroller.scrollLeft); paintState(); }); };
  function paintState() {
    counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(ITEMS.length).padStart(2, '0')}`;
    prev.setAttribute('aria-disabled', String(active === 0)); next.setAttribute('aria-disabled', String(active === ITEMS.length - 1));
  }
  const onDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (e.target.closest('button:not([data-rail-link])')) return;
    cancelAnimationFrame(s.raf);
    s.pos = s.mode === 'spring' ? s.pos : scroller.scrollLeft; // pegar o trilho em movimento mantém a posição virtual, excesso incluído
    s.mode = 'pressing'; s.pointerId = e.pointerId; s.startX = e.clientX; s.startPos = s.pos; s.samples = [{ t: e.timeStamp, x: e.clientX }];
  };
  const onMove = (e) => {
    if (e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.startX;
    if (s.mode === 'pressing' && Math.abs(dx) > DRAG_THRESHOLD) { s.mode = 'dragging'; scroller.setPointerCapture(e.pointerId); scroller.dataset.dragging = 'true'; setFree(true); }
    if (s.mode !== 'dragging') return;
    s.pos = s.startPos - dx; apply(s.pos);
    s.samples.push({ t: e.timeStamp, x: e.clientX });
    while (s.samples.length > 2 && e.timeStamp - s.samples[0].t > 100) s.samples.shift();
  };
  const onRelease = (e) => {
    if (e.pointerId !== s.pointerId) return;
    s.pointerId = -1;
    if (s.mode !== 'dragging') { s.mode = 'idle'; setFree(false); return; } // clique que não virou arrasto devolve ao snap nativo
    scroller.dataset.dragging = 'false'; s.suppressClick = true; setTimeout(() => { s.suppressClick = false; }, 0);
    const v = releaseVelocity(s.samples, e.timeStamp), projected = s.pos + (v * DECELERATION) / (1 - DECELERATION), pts = snapPoints();
    springTo(pts[nearestIndex(pts, projected)], v * 1000);
  };
  const onClickCapture = (e) => { if (s.suppressClick) { e.preventDefault(); e.stopPropagation(); s.suppressClick = false; } }; // arrasto que termina sobre um cartão não o abre
  const onNative = () => { if (s.mode !== 'spring') return; cancelAnimationFrame(s.raf); s.mode = 'idle'; apply(clamp(s.pos, 0, maxScroll(scroller))); setFree(false); }; // roda/toque assume de uma mola em curso
  const onKey = (e) => {
    if (e.target !== scroller) return;
    const idx = currentIndex(), map = { ArrowLeft: idx - 1, ArrowRight: idx + 1, Home: 0, End: ITEMS.length - 1 };
    if (!(e.key in map)) return; e.preventDefault(); goTo(map[e.key]);
  };
  scroller.addEventListener('keydown', onKey); scroller.addEventListener('scroll', onScroll, { passive: true });
  scroller.addEventListener('pointerdown', onDown); scroller.addEventListener('pointermove', onMove);
  scroller.addEventListener('pointerup', onRelease); scroller.addEventListener('pointercancel', onRelease); scroller.addEventListener('lostpointercapture', onRelease);
  scroller.addEventListener('click', onClickCapture, true);
  scroller.addEventListener('wheel', onNative, { passive: true }); scroller.addEventListener('touchstart', onNative, { passive: true });
  paintState();

  return () => {
    cancelAnimationFrame(scrollRaf); cancelAnimationFrame(s.raf);
    scroller.removeEventListener('keydown', onKey); scroller.removeEventListener('scroll', onScroll);
    scroller.removeEventListener('pointerdown', onDown); scroller.removeEventListener('pointermove', onMove);
    scroller.removeEventListener('pointerup', onRelease); scroller.removeEventListener('pointercancel', onRelease); scroller.removeEventListener('lostpointercapture', onRelease);
    scroller.removeEventListener('click', onClickCapture, true);
    scroller.removeEventListener('wheel', onNative); scroller.removeEventListener('touchstart', onNative);
    root.remove();
  };
}
