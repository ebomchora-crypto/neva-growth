// Currency Transfer — porte em JS puro do componente "Currency Transfer" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, svg, ensureStyle } from '../kit.js';
import { toast } from '../../ui.js';

const LOCALE = 'pt-BR';
const FROM = { amount: 500, currency: 'USD', symbol: 'US$', bank: 'Chase', last4: '4589' };
const TO = { amount: 2690, currency: 'BRL', symbol: 'R$', bank: 'Itaú', last4: '7823', name: 'Distribuidora Aurora' };
const RATE = 5.38;
const TXN = 'TXN-DAB3UL494';
const STAMP = '10:45';
const STEP_MS = 1100;     // cada etapa leva isso na demonstração
const FIRST_DONE = 1;     // o pagamento já foi recebido na primeira renderização
const WAIT_AT = 3;        // processando, a corrida espera na última etapa (chegada)
const DIGIT_STAGGER_MS = 30;
const DIGIT_ROLL_MS = 550; // mais longo que uma transição comum de propósito: é o único momento que o cartão explica (a moeda mudando)
const RAIL_MS = 350;       // o spinner da próxima etapa espera o trilho chegar
const COPIED_MS = 1500;
const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';

const fmt = (v) => new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const initials = (name) => name.split(/[^\p{L}]+/u).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
const PILL = { processing: 'Em andamento', completed: 'Concluída', failed: 'Falhou' };

const CSS = `
.kk-currency-transfer-wrap{width:100%;padding:6px 0 4px}
.kk-currency-transfer-card{border-radius:16px;background:#fff;padding:20px;box-shadow:0 0 0 1px rgba(15,53,96,.1),0 1px 2px rgba(15,53,96,.05),0 8px 24px -12px rgba(15,53,96,.2);color:var(--ink,#0e2236)}
.kk-currency-transfer-head{display:flex;align-items:center;gap:12px}
.kk-currency-transfer-av{display:flex;flex:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--ice-100,#e3f0fb);font-size:12px;font-weight:600;color:var(--ice-800,#164a7c)}
.kk-currency-transfer-who{min-width:0;flex:1;line-height:1.2}
.kk-currency-transfer-who b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-currency-transfer-who span{display:block;font-size:12px;color:var(--mut,#4a6f93);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-currency-transfer-pill{display:inline-grid;flex:none;align-items:center;height:24px;border-radius:999px;padding:0 9px;font-size:11px;font-weight:600;transition:background-color .2s ease-out,color .2s ease-out}
.kk-currency-transfer-pill.processing{background:var(--ice-100,#e3f0fb);color:var(--ice-800,#164a7c)}
.kk-currency-transfer-pill.completed{background:rgba(31,157,107,.12);color:#157a52}
.kk-currency-transfer-pill.failed{background:rgba(209,67,75,.12);color:#b3303a}
.kk-currency-transfer-pill span{grid-area:1/1;text-align:center;transition:opacity .2s ease-out,filter .2s ease-out;opacity:0;filter:blur(2px)}
.kk-currency-transfer-pill span.on{opacity:1;filter:none}
.kk-currency-transfer-amt{margin-top:22px}
.kk-currency-transfer-big{margin:0;font-size:34px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:baseline;gap:6px}
.kk-currency-transfer-sym{display:inline-grid}
.kk-currency-transfer-sym span{grid-area:1/1;text-align:right;transition:opacity .2s ease-out,filter .2s ease-out}
.kk-currency-transfer-sym span.off{opacity:0;filter:blur(3px)}
.kk-currency-transfer-num{display:inline-flex;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.kk-currency-transfer-col{position:relative;display:inline-block;height:1lh;overflow:hidden}
.kk-currency-transfer-col>i{visibility:hidden;font-style:normal}
.kk-currency-transfer-strip{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column}
.kk-currency-transfer-strip span{height:1lh}
.kk-currency-transfer-sub{margin:4px 0 0;font-size:12px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-currency-transfer-steps{list-style:none;margin:22px 0 0;padding:0}
.kk-currency-transfer-step{display:flex;gap:12px}
.kk-currency-transfer-rail{display:flex;flex-direction:column;align-items:center}
.kk-currency-transfer-node{position:relative;display:flex;flex:none;align-items:center;justify-content:center;width:20px;height:20px}
.kk-currency-transfer-ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--ice-200,#c9e1f6);transition:background-color .2s ease-out,border-color .2s ease-out}
.done .kk-currency-transfer-ring{border-color:var(--ice-900,#0f3560);background:var(--ice-900,#0f3560)}
.failed .kk-currency-transfer-ring{border-color:#d1434b;background:#d1434b}
.kk-currency-transfer-spin{position:absolute;inset:0;display:none;animation:kk-currency-transfer-in .2s ease-out both;animation-delay:${RAIL_MS - 100}ms}
.active .kk-currency-transfer-spin{display:block}
.kk-currency-transfer-spin svg{width:100%;height:100%;color:var(--ice-900,#0f3560);animation:kk-currency-transfer-turn .75s linear infinite}
.kk-currency-transfer-mark{position:relative;display:none;width:12px;height:12px;color:#fff}
.done .kk-currency-transfer-ok,.failed .kk-currency-transfer-x{display:block}
.kk-currency-transfer-ok path{stroke-dasharray:1;animation:kk-currency-transfer-draw .3s ${EASE_OUT} both}
.kk-currency-transfer-line{position:relative;margin:4px 0;width:1.5px;flex:1;overflow:hidden;border-radius:2px;background:var(--ice-200,#c9e1f6)}
.kk-currency-transfer-line i{position:absolute;inset:0;transform-origin:top;transform:scaleY(0);background:var(--ice-900,#0f3560);transition:transform ${RAIL_MS}ms cubic-bezier(.77,0,.175,1)}
.kk-currency-transfer-line.fill i{transform:scaleY(1)}
.kk-currency-transfer-txt{min-width:0;flex:1;padding-bottom:16px}
.kk-currency-transfer-step:last-child .kk-currency-transfer-txt{padding-bottom:0}
.kk-currency-transfer-t{margin:0;font-size:14px;line-height:20px;color:var(--ink,#0e2236);transition:color .2s ease-out}
.pending .kk-currency-transfer-t{color:#8aa7c4}
.failed .kk-currency-transfer-t{color:#b3303a}
.kk-currency-transfer-d{margin:2px 0 0;font-size:12px;color:var(--mut,#4a6f93);transition:color .2s ease-out}
.pending .kk-currency-transfer-d{color:#8aa7c4}
.kk-currency-transfer-t span,.kk-currency-transfer-d span{display:block;animation:kk-currency-transfer-in .2s ease-out both}
.kk-currency-transfer-retry{margin-top:8px;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:0;border-radius:8px;background:var(--ice-900,#0f3560);color:#fff;font:600 12px inherit;cursor:pointer;animation:kk-currency-transfer-in .2s ease-out .15s both}
.kk-currency-transfer-retry svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kk-currency-transfer-retry:hover{background:var(--ice-700,#1f5f9b)}
.kk-currency-transfer-foot{margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;border-top:1px solid var(--ice-100,#e3f0fb);padding-top:12px;font-size:12px}
.kk-currency-transfer-id{display:inline-flex;align-items:center;gap:6px;min-height:36px;margin:-8px -6px;padding:0 6px;border:0;border-radius:6px;background:none;color:var(--mut,#4a6f93);font:12px ui-monospace,monospace;cursor:pointer;transition:background .15s,color .15s}
.kk-currency-transfer-id:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-currency-transfer-ic{display:grid;width:12px;height:12px;place-items:center}
.kk-currency-transfer-ic svg{grid-area:1/1;width:12px;height:12px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;transition:opacity .15s,filter .15s}
.kk-currency-transfer-ic .a{stroke-width:2;opacity:.6}
.kk-currency-transfer-ic .b{stroke-width:3;color:#157a52;opacity:0;filter:blur(2px)}
.copied .kk-currency-transfer-ic .a{opacity:0;filter:blur(2px)}
.copied .kk-currency-transfer-ic .b{opacity:1;filter:none}
.kk-currency-transfer-stamp{color:#6f8eab}
.kk-currency-transfer-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px}
.kk-currency-transfer-bar button{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:600 13px inherit;cursor:pointer}
.kk-currency-transfer-bar button:hover{background:var(--ice-100,#e3f0fb)}
.kk-currency-transfer-id:focus-visible,.kk-currency-transfer-bar button:focus-visible,.kk-currency-transfer-retry:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:2px}
.kk-currency-transfer-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes kk-currency-transfer-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes kk-currency-transfer-in{from{opacity:0;filter:blur(2px)}}
@keyframes kk-currency-transfer-turn{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.kk-currency-transfer-strip{transition:none!important}.kk-currency-transfer-spin svg,.kk-currency-transfer-ok path,.kk-currency-transfer-t span,.kk-currency-transfer-d span,.kk-currency-transfer-retry{animation:none!important}.kk-currency-transfer-line i{transition:none}}
`;

export default function mount(stage, ctx) {
  ensureStyle('currency-transfer', CSS);
  let status = 'processing', progress = FIRST_DONE, timer = 0, copyTimer = 0;
  const done = () => (status === 'completed' ? 4 : progress);
  const fromAcc = `${FROM.bank} ••${FROM.last4}`, toAcc = `${TO.bank} ••${TO.last4}`;
  const rateText = `1 ${FROM.currency} = ${new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(RATE)} ${TO.currency}`;
  const stepsData = () => [
    { title: 'Pagamento recebido', detail: `De ${fromAcc}` },
    { title: `Convertido para ${TO.currency}`, detail: rateText },
    { title: `Enviado ao ${TO.bank}`, detail: toAcc },
    { title: status === 'completed' ? 'Chegou' : 'Chegando', detail: status === 'completed' ? `${TO.name} já pode usar` : 'Costuma levar menos de um minuto' },
  ];

  // ---- Número "odômetro": cada dígito é uma fita 0-9 numa janela de um dígito, movida com translateY.
  // Colunas indexadas da direita para manter o alinhamento quando o tamanho muda; a da direita anda primeiro.
  const numEl = h('span', { class: 'kk-currency-transfer-num', 'aria-hidden': 'true' });
  const cols = new Map();
  function setNumber(value) {
    const chars = Array.from(value), keep = new Set(), nodes = [];
    chars.forEach((ch, idx) => {
      const fr = chars.length - idx, digit = Number.parseInt(ch, 10), isD = !Number.isNaN(digit), key = (isD ? 'd' : 's') + fr + (isD ? '' : ch);
      keep.add(key);
      let c = cols.get(key);
      if (!c) {
        if (isD) {
          const strip = h('span', { class: 'kk-currency-transfer-strip' }, '0123456789'.split('').map((n) => h('span', n)));
          strip.style.transform = `translateY(${-digit * 10}%)`;
          c = { el: h('span', { class: 'kk-currency-transfer-col' }, h('i', '0'), strip), strip };
        } else c = { el: h('span', ch) };
        cols.set(key, c);
      }
      if (isD) { c.strip.style.transform = `translateY(${-digit * 10}%)`; c.strip.style.transition = `transform ${DIGIT_ROLL_MS}ms ${EASE_OUT} ${(fr - 1) * DIGIT_STAGGER_MS}ms`; }
      nodes.push(c.el);
    });
    for (const [k, c] of cols) if (!keep.has(k)) { c.el.remove(); cols.delete(k); }
    nodes.forEach((n, i) => { if (numEl.children[i] !== n) numEl.insertBefore(n, numEl.children[i] || null); });
  }

  // ---- DOM estático
  const pillSpans = Object.fromEntries(Object.entries(PILL).map(([k, v]) => [k, h('span', { 'aria-hidden': 'true' }, v)]));
  const pill = h('span', { class: 'kk-currency-transfer-pill' }, Object.values(pillSpans));
  const symFrom = h('span', FROM.symbol), symTo = h('span', { class: 'off' }, TO.symbol);
  const sub = h('p', { class: 'kk-currency-transfer-sub' }, `${fmt(FROM.amount)} ${FROM.currency} enviados · ${fmt(TO.amount)} ${TO.currency} recebidos`);
  const srAmount = h('span', { class: 'kk-currency-transfer-sr' });
  const live = h('output', { class: 'kk-currency-transfer-sr', 'aria-live': 'polite' });
  const steps = [0, 1, 2, 3].map((i) => {
    const t = h('p', { class: 'kk-currency-transfer-t' }), d = h('p', { class: 'kk-currency-transfer-d' });
    const holder = h('div');
    const check = svg('svg', { viewBox: '0 0 12 12', class: 'kk-currency-transfer-mark kk-currency-transfer-ok', 'aria-hidden': 'true', fill: 'none' }, svg('path', { d: 'M2.5 6.25 5 8.5l4.5-5', pathLength: 1, stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.75 }));
    const xmark = svg('svg', { viewBox: '0 0 12 12', class: 'kk-currency-transfer-mark kk-currency-transfer-x', 'aria-hidden': 'true', fill: 'none' }, svg('path', { d: 'M3 3l6 6M9 3L3 9', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-width': 2 }));
    const spin = h('span', { class: 'kk-currency-transfer-spin' }, svg('svg', { viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': 'true' }, svg('path', { d: 'M10 1.25A8.75 8.75 0 0 1 18.75 10', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-width': 1.5 })));
    const line = i < 3 ? h('span', { class: 'kk-currency-transfer-line' }, h('i')) : null;
    const li = h('li', { class: 'kk-currency-transfer-step pending' },
      h('div', { class: 'kk-currency-transfer-rail' }, h('span', { class: 'kk-currency-transfer-node' }, h('span', { class: 'kk-currency-transfer-ring' }), spin, check, xmark), line),
      h('div', { class: 'kk-currency-transfer-txt' }, t, d, holder));
    return { li, t, d, holder, line, tKey: '', dKey: '' };
  });
  const retryBtn = () => h('button', { type: 'button', class: 'kk-currency-transfer-retry', onclick: () => run('processing') }, svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' })), 'Tentar de novo');
  const idBtn = h('button', { type: 'button', class: 'kk-currency-transfer-id', 'aria-label': `Copiar referência ${TXN}`, onclick: copyId }, TXN,
    h('span', { class: 'kk-currency-transfer-ic', 'aria-hidden': 'true' }, svg('svg', { viewBox: '0 0 24 24', class: 'a' }, svg('path', { d: 'M9 9h11v11H9zM5 15V5a1 1 0 011-1h10' })), svg('svg', { viewBox: '0 0 24 24', class: 'b' }, svg('path', { d: 'M5 12.5l4.5 4.5L19 7' }))));
  const card = h('div', { class: 'kk-currency-transfer-card' }, live,
    h('div', { class: 'kk-currency-transfer-head' }, h('span', { class: 'kk-currency-transfer-av', 'aria-hidden': 'true' }, initials(TO.name)),
      h('div', { class: 'kk-currency-transfer-who' }, h('b', TO.name), h('span', toAcc)), pill),
    h('div', { class: 'kk-currency-transfer-amt' }, h('p', { class: 'kk-currency-transfer-big' }, srAmount, h('span', { class: 'kk-currency-transfer-sym', 'aria-hidden': 'true' }, symFrom, symTo), numEl), sub),
    h('ol', { class: 'kk-currency-transfer-steps' }, steps.map((s) => s.li)),
    h('div', { class: 'kk-currency-transfer-foot' }, idBtn, h('span', { class: 'kk-currency-transfer-stamp' }, `Cotação travada às ${STAMP}`)));
  const bar = h('div', { class: 'kk-currency-transfer-bar' },
    h('button', { type: 'button', onclick: () => run('processing') }, 'Reiniciar'),
    h('button', { type: 'button', onclick: () => run('failed') }, 'Simular falha'));
  const wrap = h('div', { class: 'kk-currency-transfer-wrap' }, card, bar);
  stage.append(wrap);

  function copyId() {
    navigator.clipboard?.writeText(TXN).then(() => {
      idBtn.classList.add('copied'); idBtn.setAttribute('aria-label', 'Referência copiada');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { idBtn.classList.remove('copied'); idBtn.setAttribute('aria-label', `Copiar referência ${TXN}`); }, COPIED_MS);
    }).catch(() => toast('Não foi possível copiar a referência.', 'err')); // área de transferência bloqueada
  }

  function render() {
    const d = done(), converted = d >= 2, shown = converted ? TO : FROM, data = stepsData();
    for (const [k, el] of Object.entries(pillSpans)) { el.classList.toggle('on', k === status); el.setAttribute('aria-hidden', String(k !== status)); }
    pill.className = 'kk-currency-transfer-pill ' + status;
    symFrom.classList.toggle('off', converted); symTo.classList.toggle('off', !converted);
    setNumber(fmt(shown.amount)); srAmount.textContent = `${fmt(shown.amount)} ${shown.currency}`;
    steps.forEach((s, i) => {
      const st = i < d ? 'done' : i === d ? (status === 'failed' ? 'failed' : 'active') : 'pending';
      s.li.className = 'kk-currency-transfer-step ' + st;
      s.line?.classList.toggle('fill', i < d);
      const tk = st === 'failed' ? 'failed' : data[i].title, dk = st === 'failed' ? 'failed' : data[i].detail;
      // Troca o texto com uma chave: palavras que mudam entram desfocadas em vez de piscar.
      if (s.tKey !== tk) { s.tKey = tk; s.t.replaceChildren(h('span', st === 'failed' ? 'Não foi possível concluir' : data[i].title)); }
      if (s.dKey !== dk) { s.dKey = dk; s.d.replaceChildren(h('span', st === 'failed' ? `Estornado para ${fromAcc}` : data[i].detail)); }
      const hasRetry = s.holder.firstChild !== null;
      if (st === 'failed' && !hasRetry) s.holder.append(retryBtn()); else if (st !== 'failed' && hasRetry) s.holder.replaceChildren();
    });
    live.textContent = status === 'completed' ? `Transferência concluída. ${fmt(TO.amount)} ${TO.currency} para ${TO.name}.` : status === 'failed' ? `A transferência falhou. Valor estornado para ${fromAcc}.` : data[Math.min(d, 3)].title;
  }

  // Avança uma etapa por vez; na demonstração, ao chegar na última o dinheiro chega.
  function schedule() {
    clearTimeout(timer);
    if (status !== 'processing') return;
    timer = setTimeout(() => {
      if (progress < WAIT_AT) progress++; else status = 'completed';
      render(); schedule();
    }, STEP_MS);
  }
  function run(next) {
    status = next;
    if (next === 'processing') progress = FIRST_DONE;
    render(); schedule();
  }

  render(); schedule();
  return () => { clearTimeout(timer); clearTimeout(copyTimer); wrap.remove(); };
}
