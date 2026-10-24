// Page Flip — porte em JS puro do componente "Page Flip" .
import { h, svg, ensureStyle, reduced, disposer } from '../kit.js';

const SINGLE_BELOW = 520;   // abaixo desta largura (px) o livro mostra uma página por vez
const HIDDEN = Symbol('hidden');
const PEEK_ZONE = 64, PEEK_MAX = 34, DRAG_SLOP = 4;
const TURN = { duration: 600, ease: [0.32, 0.72, 0, 1] };
const SETTLE = { duration: 320, ease: [0.23, 1, 0.32, 1] };

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const len = (a) => Math.hypot(a.x, a.y);
const mixPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// Curva cubic-bezier (mesma convenção do CSS) para reproduzir as easings do original.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const d = (3 * ax * t * t + 2 * bx * t + cx); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; }
    return Y(Math.min(1, Math.max(0, t)));
  };
}

// Mantém o ponto a no máximo `radius` do centro.
function within(p, c, radius) {
  const d = sub(p, c), l = len(d);
  return l <= radius ? p : { x: c.x + (d.x / l) * radius, y: c.y + (d.y / l) * radius };
}

// A parte do polígono de um lado da reta que passa por m com normal n.
function clipPolygon(poly, m, n, keepNegative) {
  const side = (p) => { const d = dot(sub(p, m), n); return keepNegative ? -d : d; };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = side(a), db = side(b);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) out.push(mixPt(a, b, da / (da - db)));
  }
  return out;
}
const polygon = (pts, dx) => pts.length ? `polygon(${pts.map((p) => `${(p.x - dx).toFixed(2)}px ${p.y.toFixed(2)}px`).join(', ')})` : 'polygon(0 0)';

// A dobra é a reta no meio entre o canto parado e onde ele está; a página fica do lado da lombada
// e o verso (flap) é espelhado pela dobra.
function foldStyles(turn, w, hgt) {
  const x0 = turn.dir === 1 ? w : 0;
  const page = [{ x: x0, y: 0 }, { x: x0 + w, y: 0 }, { x: x0 + w, y: hgt }, { x: x0, y: hgt }];
  const d = sub(turn.at, turn.corner), l = len(d);
  if (l < 0.5) return null;
  const n = { x: d.x / l, y: d.y / l }, m = mixPt(turn.corner, turn.at, 0.5);
  const front = clipPolygon(page, m, n, false), flap = clipPolygon(page, m, n, true);
  const a = 1 - 2 * n.x * n.x, bc = -2 * n.x * n.y, dd = 1 - 2 * n.y * n.y, k = 2 * dot(m, n);
  const e = a * x0 + k * n.x - x0, f = bc * x0 + k * n.y;
  return { front: { clipPath: polygon(front, x0) }, flap: { clipPath: polygon(flap, x0), transform: `matrix(${a}, ${bc}, ${bc}, ${dd}, ${e}, ${f})` }, progress: Math.min(1, l / (2 * w)) };
}

// Duas páginas abertas: a capa sozinha à direita, depois pares.
function twoPages(pages, spread, dir) {
  const leftOf = (s) => (s > 0 ? pages[2 * s - 1] : undefined), rightOf = (s) => pages[2 * s];
  if (!dir) return { left: leftOf(spread), right: rightOf(spread) };
  const target = spread + dir; // durante a virada, embaixo aparece o par seguinte
  return dir === 1
    ? { left: leftOf(spread), right: rightOf(target), turning: rightOf(spread), back: leftOf(target) }
    : { left: leftOf(target), right: rightOf(spread), turning: leftOf(spread), back: rightOf(target) };
}
// Uma página por vez: vira para a esquerda com papel em branco no verso; voltar traz a anterior por cima.
function onePage(pages, page, dir) {
  if (dir === 1) return { right: pages[page + 1], turning: pages[page], back: null };
  if (dir === -1) return { right: pages[page], back: pages[page - 1] ?? HIDDEN };
  return { right: pages[page] };
}
const centerShift = ({ left, right }) => (left === undefined ? -0.25 : right === undefined ? 0.25 : 0);

/* ---------- Conteúdo do demo: o manual de crescimento de uma loja ---------- */
const guideList = (title, items, page) => h('div', { class: 'kk-page-flip-course' },
  h('p', { class: 'kk-page-flip-kicker' }, title),
  h('div', { class: 'kk-page-flip-rule' }),
  h('ul', {}, items.map(([name, note, meta]) => h('li', {},
    h('p', { class: 'kk-page-flip-row' }, h('span', { class: 'kk-page-flip-name' }, name), h('span', { class: 'kk-page-flip-dots' }), h('span', { class: 'kk-page-flip-meta' }, meta)),
    h('p', { class: 'kk-page-flip-note' }, note)))),
  h('p', { class: 'kk-page-flip-num' }, String(page)));

function buildPages() {
  const logo = svg('svg', { viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'aria-hidden': 'true', class: 'kk-page-flip-logo' },
    svg('rect', { x: 6, y: 28, width: 7, height: 14, rx: 1.5 }), svg('rect', { x: 20, y: 18, width: 7, height: 24, rx: 1.5 }),
    svg('rect', { x: 34, y: 6, width: 7, height: 36, rx: 1.5 }), svg('path', { d: 'M6 20 20 11l10 4 12-9' }));
  return [
    h('div', { class: 'kk-page-flip-cover' }, logo, h('p', { class: 'kk-page-flip-title' }, 'Manual de crescimento'), h('p', { class: 'kk-page-flip-sub' }, 'Edição de primavera'), h('p', { class: 'kk-page-flip-hint' }, 'Vire pelo canto')),
    h('div', { class: 'kk-page-flip-course kk-page-flip-welcome' },
      h('p', { class: 'kk-page-flip-h1' }, 'Boas-vindas'),
      h('p', { class: 'kk-page-flip-p' }, 'Este manual reúne o que funciona para lojas e prestadores de serviço de bairro: atrair quem está perto, responder rápido e fazer o cliente voltar.'),
      h('dl', {}, h('dt', {}, 'Revisão'), h('dd', {}, 'Toda segunda, 9h'), h('dt', {}, 'Meta'), h('dd', {}, '+20% em 90 dias'), h('dt', {}, 'Dono'), h('dd', {}, 'Marina Duarte')),
      h('p', { class: 'kk-page-flip-num' }, '1')),
    guideList('Captar', [['Anúncio local', 'Raio de 8 km, foto real da fachada', 'R$ 30/dia'], ['Perfil no Google', 'Horário, fotos e respostas em dia', '5 min'], ['Indicação', 'Cupom para quem traz um amigo', '10% off'], ['Página de captura', 'Um formulário curto, só nome e WhatsApp', '3 campos']], 2),
    guideList('Converter', [['Resposta em 5 min', 'Quem espera mais esfria; use mensagem pronta', '5 min'], ['Orçamento claro', 'Valor, prazo e forma de pagamento juntos', '1 msg'], ['Prova social', 'Três avaliações reais no topo da conversa', '3 prints'], ['Lembrete', 'Segundo contato depois de dois dias', 'D+2']], 3),
    guideList('Reter', [['Pós-venda', 'Mensagem de agradecimento no mesmo dia', 'D+0'], ['Recompra', 'Aviso quando o produto costuma acabar', '30 dias'], ['Aniversário', 'Um mimo simples no mês do cliente', '1 vez'], ['Clube', 'Lista de WhatsApp com novidades quinzenais', '2/mês']], 4),
    guideList('Medir', [['Novos contatos', 'Quantos chamaram esta semana', 'semanal'], ['Taxa de resposta', 'Respondidos em até 5 minutos', '90%'], ['Ticket médio', 'Receita dividida pelos pedidos', 'R$ 148'], ['Clientes que voltam', 'Segunda compra em 60 dias', '35%']], 5),
    h('div', { class: 'kk-page-flip-cover kk-page-flip-end' }, h('p', { class: 'kk-page-flip-thanks' }, 'Bom crescimento'), h('p', { class: 'kk-page-flip-sub' }, 'Dúvidas? Fale com o time',
      h('br'), 'pelo chat do aplicativo')),
  ];
}

export default function mount(stage, ctx) {
  ensureStyle('page-flip', `
.kk-page-flip-frame{display:flex;flex-direction:column;align-items:center;width:100%;overflow-x:clip;padding:8px 0}
.kk-page-flip-bookwrap{flex-shrink:0;border-radius:2px}
.kk-page-flip-bookwrap.two{width:100%;transition:transform .5s cubic-bezier(.32,.72,0,1)}
.kk-page-flip-bookwrap.one{width:200%;align-self:flex-start;transform:translateX(-50%)}
.kk-page-flip-book{position:relative;width:100%;aspect-ratio:3/2;touch-action:none;user-select:none;-webkit-user-select:none}
.kk-page-flip-paper{position:absolute;top:0;height:100%;width:50%;transform-origin:0 0;overflow:hidden;container-type:inline-size;color:var(--ink,#0e2236);background:#fbfdff;box-shadow:0 0 0 1px rgba(15,53,96,.08)}
.kk-page-flip-paper.back{background:#eaf2fa}
.kk-page-flip-paper.left{left:0;border-radius:2px 0 0 2px;box-shadow:inset -1px 0 0 rgba(15,53,96,.08),0 0 0 1px rgba(15,53,96,.08)}
.kk-page-flip-paper.right{left:50%;border-radius:0 2px 2px 0;box-shadow:inset 1px 0 0 rgba(15,53,96,.08),0 0 0 1px rgba(15,53,96,.08)}
.kk-page-flip-inner{width:100%;height:100%}
.kk-page-flip-paper.back .kk-page-flip-inner{transform:scaleX(-1)}
.kk-page-flip-gutter{position:absolute;top:0;bottom:0;width:8%;pointer-events:none}
.kk-page-flip-paper.left .kk-page-flip-gutter{right:0;background:linear-gradient(to left,rgba(15,53,96,.09),transparent)}
.kk-page-flip-paper.right .kk-page-flip-gutter{left:0;background:linear-gradient(to right,rgba(15,53,96,.09),transparent)}
.kk-page-flip-shadow{position:absolute;inset:0;pointer-events:none}
.kk-page-flip-course{display:flex;flex-direction:column;width:100%;height:100%;padding:10cqw 9cqw 7cqw}
.kk-page-flip-kicker{margin:0;font-size:max(11px,3.4cqw);text-transform:uppercase;letter-spacing:.2em;color:var(--mut,#4a6f93)}
.kk-page-flip-rule{margin-top:3cqw;height:1px;width:10cqw;background:rgba(31,95,155,.45)}
.kk-page-flip-course ul{list-style:none;margin:6cqw 0 0;padding:0;display:flex;flex-direction:column;gap:5.5cqw}
.kk-page-flip-row{margin:0;display:flex;align-items:baseline;gap:2cqw}
.kk-page-flip-name{font-weight:600;font-size:4.6cqw;line-height:1.2}
.kk-page-flip-dots{flex:1;align-self:flex-end;margin-bottom:.8cqw;border-bottom:1px dotted #a5cdee}
.kk-page-flip-meta{font-size:max(11px,3.6cqw);font-variant-numeric:tabular-nums;color:var(--ice-700,#1f5f9b);white-space:nowrap}
.kk-page-flip-note{margin:1cqw 0 0;font-size:max(11px,3.4cqw);line-height:1.35;color:var(--mut,#4a6f93)}
.kk-page-flip-num{margin:auto 0 0;text-align:center;font-size:max(11px,3cqw);color:#8fb0cf;font-variant-numeric:tabular-nums}
.kk-page-flip-h1{margin:2cqw 0 0;font-weight:700;font-size:6.5cqw;letter-spacing:-.01em}
.kk-page-flip-p{margin:5cqw 0 0;font-size:max(11px,3.8cqw);line-height:1.5;color:#35597e}
.kk-page-flip-welcome dl{margin:8cqw 0 0;display:grid;grid-template-columns:auto 1fr;gap:2.5cqw 5cqw;font-size:max(11px,3.5cqw)}
.kk-page-flip-welcome dt{color:var(--mut,#4a6f93)}.kk-page-flip-welcome dd{margin:0}
.kk-page-flip-cover{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:0 10cqw;text-align:center;color:#eef6fd;background:linear-gradient(160deg,#1f5f9b,#0f3560)}
.kk-page-flip-logo{width:22cqw}
.kk-page-flip-title{margin:8cqw 0 0;font-weight:700;font-size:8cqw;line-height:1.05;letter-spacing:-.01em}
.kk-page-flip-sub{margin:3cqw 0 0;font-size:max(11px,3.4cqw);text-transform:uppercase;letter-spacing:.3em;opacity:.75;line-height:1.6}
.kk-page-flip-end .kk-page-flip-sub{text-transform:none;letter-spacing:0;font-size:max(11px,3.6cqw)}
.kk-page-flip-hint{position:absolute;bottom:8cqw;margin:0;font-size:max(11px,3cqw);opacity:.7}
.kk-page-flip-thanks{margin:0;font-weight:700;font-size:6cqw}
.kk-page-flip-nav{display:flex;align-items:center;gap:12px;margin-top:18px;font-size:13px;color:var(--mut,#4a6f93)}
.kk-page-flip-nav span{min-width:90px;text-align:center;font-variant-numeric:tabular-nums}
.kk-page-flip-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);cursor:pointer;transition:background .15s}
.kk-page-flip-btn:hover:not(:disabled){background:var(--ice-100,#e3f0fb)}
.kk-page-flip-btn:disabled{color:#b7cfe6;cursor:default}
.kk-page-flip-btn:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-page-flip-btn svg{width:16px;height:16px}
@media (prefers-reduced-motion:reduce){.kk-page-flip-bookwrap.two{transition:none}}
`);
  const dispose = disposer();
  const noMotion = reduced();
  const pages = buildPages();

  const st = { size: { w: 0, h: 0 }, single: false, spread: 0, turn: null, heading: null, press: null, anim: null, playing: false, committing: false };

  const book = h('div', { class: 'kk-page-flip-book' });
  const wrap = h('div', { class: 'kk-page-flip-bookwrap two' }, book);
  const frame = h('div', { class: 'kk-page-flip-frame' });
  const counter = h('span', { 'aria-live': 'polite' });
  const navBtn = (label, path, dir) => h('button', { type: 'button', class: 'kk-page-flip-btn', 'aria-label': label, onClick: () => go(dir), onKeydown: onKey },
    svg('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: path })));
  const prev = navBtn('Página anterior', 'M10 4 6 8l4 4', -1), next = navBtn('Próxima página', 'm6 4 4 4-4 4', 1);
  frame.append(wrap, h('div', { class: 'kk-page-flip-nav' }, prev, counter, next));
  stage.append(frame);

  const spreadsCount = () => (st.single ? pages.length : Math.floor(pages.length / 2) + 1);
  const canTurn = (dir) => (dir === 1 ? st.spread < spreadsCount() - 1 : st.spread > 0);

  // Monta uma folha: undefined = sem folha, null = papel em branco.
  const paper = (side, content, { back = false, style } = {}) => {
    const inner = h('div', { class: 'kk-page-flip-inner' });
    if (content) inner.append(content.cloneNode(true));
    const el = h('div', { class: `kk-page-flip-paper ${side}${back ? ' back' : ''}` }, inner, h('span', { class: 'kk-page-flip-gutter', 'aria-hidden': 'true' }));
    if (style) Object.assign(el.style, style);
    return el;
  };

  function render() {
    const { turn, size } = st;
    const fold = turn && size.w ? foldStyles(turn, size.w, size.h) : null;
    const { left, right, turning, back } = st.single ? onePage(pages, st.spread, turn?.dir) : twoPages(pages, st.spread, turn?.dir);
    const shift = st.single ? 0 : centerShift(twoPages(pages, st.heading ?? st.spread));
    wrap.className = `kk-page-flip-bookwrap ${st.single ? 'one' : 'two'}`;
    wrap.style.transform = st.single ? '' : `translateX(${shift * 100}%)`;
    const kids = [];
    if (left !== undefined) kids.push(paper('left', left));
    if (right !== undefined) kids.push(paper('right', right));
    const side = turn?.dir === 1 ? 'right' : 'left';
    if (turn && fold && turning !== undefined) kids.push(paper(side, turning, { style: fold.front }));
    if (turn && !fold && turning !== undefined) kids.push(paper(side, turning));
    if (turn && fold && back !== undefined && back !== HIDDEN) {
      // A sombra fica num invólucro: o clip no mesmo elemento a cortaria.
      const sh = h('div', { class: 'kk-page-flip-shadow' }, paper(side, back, { back: true, style: fold.flap }));
      sh.style.filter = `drop-shadow(0 ${2 + fold.progress * 6}px ${6 + fold.progress * 10}px rgba(15,53,96,${0.14 + (1 - fold.progress) * 0.1}))`;
      kids.push(sh);
    }
    book.replaceChildren(...kids);
    const first = st.single ? st.spread + 1 : Math.max(1, 2 * st.spread);
    const last = st.single ? st.spread + 1 : Math.min(pages.length, 2 * st.spread + 1);
    counter.textContent = `${first === last ? first : `${first}–${last}`} de ${pages.length}`;
    prev.disabled = st.spread === 0; next.disabled = st.spread === spreadsCount() - 1;
  }
  const setAt = (t) => { st.turn = t; render(); };

  // Tween próprio (substitui o animate do motion).
  function animate(opts, onUpdate, onComplete) {
    const ease = bezier(...opts.ease), t0 = performance.now();
    let raf = 0, on = true;
    const tick = (now) => {
      if (!on) return;
      const t = Math.min(1, (now - t0) / opts.duration);
      onUpdate(ease(t));
      if (t < 1) raf = requestAnimationFrame(tick); else { on = false; onComplete(); }
    };
    raf = requestAnimationFrame(tick);
    return { stop() { on = false; cancelAnimationFrame(raf); } };
  }
  const stop = () => { st.anim?.stop(); st.playing = false; };
  dispose(stop);

  // Mantém o canto onde o papel alcança: a página fica presa à lombada.
  const reach = (p, corner) => {
    const { w, h: hh } = st.size;
    return within(within(p, { x: w, y: corner.y }, w), { x: w, y: corner.y === 0 ? hh : 0 }, Math.hypot(w, hh));
  };
  const cornerFor = (dir, y) => ({ x: dir === 1 ? 2 * st.size.w : 0, y: y < st.size.h / 2 ? 0 : st.size.h });

  // Leva o canto de onde está até `to`, levantando no caminho.
  function run(from, to, complete) {
    stop();
    const start = from.at, lift = complete ? st.size.h * 0.14 * (from.corner.y === 0 ? 1 : -1) : 0;
    st.committing = complete;
    if (complete) { st.heading = st.spread + from.dir; }
    st.playing = true;
    st.anim = animate(complete ? TURN : SETTLE, (t) => {
      const p = mixPt(start, to, t);
      setAt({ ...from, at: { x: p.x, y: p.y + Math.sin(Math.PI * t) * lift } });
    }, () => {
      st.playing = false; st.committing = false; st.turn = null; st.heading = null;
      if (complete) st.spread += from.dir;
      render();
    });
  }

  function go(dir) {
    if (!canTurn(dir) || !st.size.w || st.committing) return;
    if (noMotion) { st.spread += dir; render(); return; }
    const corner = cornerFor(dir, st.size.h);
    run({ dir, corner, at: { x: corner.x - dir, y: corner.y - 1 } }, { x: corner.x - dir * 2 * st.size.w, y: corner.y }, true);
  }
  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
  }
  // Setas também funcionam com o foco no livro.
  book.tabIndex = 0;
  book.setAttribute('role', 'group'); book.setAttribute('aria-label', 'Livro: use as setas para virar a página');
  book.addEventListener('keydown', onKey);

  const local = (e) => { const r = book.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  book.addEventListener('pointerdown', (e) => {
    if ((e.button !== undefined && e.button !== 0) || !st.size.w || noMotion || st.committing) return;
    const p = local(e);
    // Com uma página só, a borda esquerda volta e o resto avança.
    const backZone = st.single && p.x < st.size.w * 1.3;
    const dir = p.x >= st.size.w && !backZone ? 1 : -1;
    if (!canTurn(dir)) return;
    stop();
    book.setPointerCapture(e.pointerId);
    st.press = { start: p, dragging: false };
    if (st.single && dir === -1) { st.press.back = true; return; }
    const cur = st.turn;
    const corner = cur?.dir === dir ? cur.corner : cornerFor(dir, p.y);
    setAt({ dir, corner, at: cur?.dir === dir ? cur.at : corner });
  });

  // Um canto perto do cursor levanta um pouco, convidando a virar.
  function peek(p) {
    const dir = p.x >= st.size.w ? 1 : -1, corner = cornerFor(dir, p.y);
    const near = canTurn(dir) && len(sub(p, corner)) < PEEK_ZONE, cur = st.turn;
    if (!near) { if (cur) run(cur, cur.corner, false); return; }
    stop();
    const toward = sub(p, corner), l = Math.max(1, len(toward)), lift = Math.min(PEEK_MAX, l * 0.6 + 14);
    setAt({ dir, corner, at: reach({ x: corner.x + (toward.x / l) * lift, y: corner.y + (toward.y / l) * lift }, corner) });
  }

  book.addEventListener('pointermove', (e) => {
    const p = local(e), press = st.press, cur = st.turn;
    if (press?.back) { press.dragging ||= len(sub(p, press.start)) >= DRAG_SLOP; return; }
    if (press && cur) {
      if (!press.dragging && len(sub(p, press.start)) < DRAG_SLOP) return;
      press.dragging = true;
      setAt({ ...cur, at: reach(p, cur.corner) });
      return;
    }
    if (e.pointerType === 'mouse' && !st.playing && !noMotion) peek(p);
  });

  const up = () => {
    const press = st.press, cur = st.turn;
    st.press = null;
    if (press?.back) { if (!press.dragging) go(-1); return; }
    if (!cur) return;
    // Um toque vira a página; um arrasto vira se o canto cruzou a lombada.
    const crossed = cur.dir === 1 ? cur.at.x < st.size.w : cur.at.x > st.size.w;
    const complete = press?.dragging ? crossed : true;
    run(cur, complete ? { x: cur.corner.x - cur.dir * 2 * st.size.w, y: cur.corner.y } : cur.corner, complete);
  };
  book.addEventListener('pointerup', up);
  book.addEventListener('pointercancel', up);
  book.addEventListener('pointerleave', () => { if (!st.press && st.turn && !st.playing) run(st.turn, st.turn.corner, false); });

  const measure = () => {
    const narrow = frame.clientWidth < SINGLE_BELOW;
    if (st.single !== narrow) st.spread = narrow ? Math.max(0, 2 * st.spread - 1) : Math.ceil(st.spread / 2); // mantém a mesma página à vista
    st.single = narrow;
    st.size = { w: book.clientWidth / 2, h: book.clientHeight };
    render();
  };
  const ro = new ResizeObserver(measure);
  ro.observe(frame); ro.observe(book); dispose(() => ro.disconnect());
  measure();
  return () => dispose.run();
}
