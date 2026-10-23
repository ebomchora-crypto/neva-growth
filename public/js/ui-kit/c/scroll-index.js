// Índice de rolagem — porte em JS puro do componente "Scroll Index" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, reduced, disposer, PALETTE } from '../kit.js';

// A trilha tem no máximo esta altura (px); cada marca fica na posição de rolagem do seu título.
const RAIL = 280;
const OFFSET = 16;          // o título pousa a esta distância do topo ao saltar
const SWELL = 1.6, REACH = 26; // as marcas incham perto do ponteiro, como um dock
const SNAP = 18;            // arrasto solto perto de uma marca assenta nela
const FLASH = 900;          // quanto tempo o nome da seção fica visível ao entrar nela
const easeInOut = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

const ARTICLE = [
  ['meta', 'Notas de campo · 8 min de leitura'],
  ['h2', 'Como organizar sua operação comercial', 'first'],
  ['p', 'Vender bem é repetir um processo que o time inteiro entende. Estas notas reúnem o que aprendemos organizando equipes de vendas pequenas ao longo de dois anos.'],
  ['p', 'Quase tudo se resume a dizer não: cada etapa extra no funil é uma decisão a mais para alguém tomar e uma chance a mais de o cliente esfriar.'],
  ['h2', 'Princípios'],
  ['p', 'Três regras resolveram a maior parte das discussões antes de começarem. Escreva-as cedo e volte a elas com frequência.'],
  ['h3', 'Simplicidade'],
  ['p', 'Comece com o menor funil que resolve o problema à sua frente. Cinco etapas bem definidas são mais fáceis de manter do que nove, e ninguém jamais pediu a décima.'],
  ['h3', 'Resposta rápida'],
  ['p', 'O primeiro contato decide a venda. Responder em minutos, e não em horas, costuma dobrar a chance de conversa. Combine um prazo e meça todo mês.'],
  ['h2', 'Dados do cliente'],
  ['p', 'Os dados são o vocabulário da operação. Nome, origem, interesse e próximo passo ficam num só lugar, para que trocar de ferramenta seja um fim de semana, e não um trimestre.'],
  ['h3', 'Origem'],
  ['p', 'Registre de onde veio cada contato: anúncio, indicação, site ou balcão. Sem isso, é impossível saber o que vale investir.'],
  ['h3', 'Próximo passo'],
  ['p', 'Todo cliente aberto precisa de uma data e de uma ação. Um lead sem próximo passo é um lead esquecido.'],
  ['h2', 'Propostas'],
  ['p', 'Monte as propostas de dentro para fora: primeiro o preço e o prazo, depois a apresentação. Uma proposta clara cabe em uma tela e responde à pergunta "quanto e quando?".'],
  ['p', 'Mantenha um modelo para cada tipo de serviço. Personalizar o texto leva minutos; refazer do zero leva a tarde.'],
  ['h2', 'Acompanhamento'],
  ['p', 'Cliente que não responde não é cliente perdido. Um lembrete gentil depois de dois dias e outro depois de uma semana recuperam boa parte das propostas paradas.'],
  ['h2', 'Indicadores'],
  ['p', 'Acompanhe poucos números, sempre os mesmos: contatos novos, propostas enviadas, vendas fechadas e tempo de resposta. Veja-os toda segunda-feira.'],
  ['p', 'Cada indicador ganha uma nota curta: o que mudou, por quê e o que fazer a respeito, nessa ordem.'],
  ['h2', 'Próximos passos'],
  ['p', 'Automatizar as mensagens repetitivas, ligar o funil ao financeiro e ter menos etapas, não mais.'],
  ['p', 'Obrigado por ler. Arraste a trilha à direita para percorrer estas notas, ou passe o mouse sobre ela para ver onde cada seção começa.', 'end'],
];

export default function mount(stage, ctx) {
  ensureStyle('scroll-index', `
.kk-scroll-index-root{position:relative;width:100%;height:${ctx?.big ? 'min(62vh,560px)' : '420px'};box-sizing:border-box;padding:10px}
.kk-scroll-index-box{position:relative;height:100%;border:1px solid var(--line,${PALETTE.line});border-radius:16px;background:#fff;overflow:hidden}
.kk-scroll-index-scroll{height:100%;overflow-y:auto;overscroll-behavior:contain}
.kk-scroll-index-scroll:focus-visible{outline:2px solid ${PALETTE.ice500};outline-offset:-2px;border-radius:16px}
.kk-scroll-index-content{padding:28px 64px 28px 20px}
.kk-scroll-index-content h2{margin:48px 0 0;font-size:20px;line-height:1.25;font-weight:600;letter-spacing:-.01em;color:${PALETTE.ink}}
.kk-scroll-index-content h2.first{margin-top:8px;font-size:24px}
.kk-scroll-index-content h3{margin:32px 0 0;font-size:16px;font-weight:500;color:${PALETTE.ink}}
.kk-scroll-index-content p{margin:12px 0 0;font-size:15px;line-height:1.65;color:${PALETTE.mut}}
.kk-scroll-index-content p.meta{margin:0;font-size:12px;font-weight:500;color:${PALETTE.ice400}}
.kk-scroll-index-content p.end{padding-bottom:140px}
.kk-scroll-index-nav{position:absolute;top:50%;right:6px;z-index:10;display:flex;justify-content:flex-end;width:48px;transform:translateY(-50%)}
.kk-scroll-index-rail{position:relative;width:100%;height:${RAIL}px;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.kk-scroll-index-rail[data-dragging]{cursor:grabbing}
.kk-scroll-index-tick{position:absolute;right:0;height:16px;width:8px;padding:0;border:0;border-radius:3px;background:none;transform:translateY(-50%);outline:none}
.kk-scroll-index-tick.l2{width:14px}
.kk-scroll-index-tick:focus-visible{box-shadow:0 0 0 2px ${PALETTE.ice500}}
.kk-scroll-index-tick i{position:absolute;top:50%;right:0;width:100%;height:1.5px;border-radius:2px;background:${PALETTE.ice200};transform:translateY(-50%) scaleX(var(--swell,1));transform-origin:right;transition:background-color .2s}
.kk-scroll-index-tick[data-state=current] i{background:${PALETTE.ice500}}.kk-scroll-index-tick[data-state=passed] i{background:${PALETTE.ink}}
.kk-scroll-index-head{position:absolute;top:0;right:0;width:24px;height:2px;margin-top:-1px;border-radius:2px;background:${PALETTE.ink};pointer-events:none;will-change:transform}
.kk-scroll-index-label{position:absolute;top:0;right:36px;padding:5px 8px;border:1px solid var(--line,${PALETTE.line});border-radius:7px;background:#fff;box-shadow:0 1px 4px rgba(15,53,96,.15);font-size:12px;font-weight:500;color:${PALETTE.ink};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s}
@container (min-width:420px){.kk-scroll-index-content{padding-left:32px}}
`);
  const d = disposer();
  const rm = reduced();

  const content = h('div', { class: 'kk-scroll-index-content' }, ARTICLE.map(([t, text, cls]) => t === 'meta' ? h('p', { class: 'meta' }, text) : h(t, { class: cls || false }, text)));
  const box = h('div', { class: 'kk-scroll-index-scroll', tabindex: '0', role: 'region', 'aria-label': 'Artigo' }, content);
  const head = h('span', { class: 'kk-scroll-index-head', 'aria-hidden': 'true' }), label = h('span', { class: 'kk-scroll-index-label', 'aria-hidden': 'true' });
  const rail = h('div', { class: 'kk-scroll-index-rail' });
  rail.append(head, label);
  const nav = h('nav', { class: 'kk-scroll-index-nav', 'aria-label': 'Seções' }, rail);
  const root = h('div', { class: 'kk-scroll-index-root' }, h('div', { class: 'kk-scroll-index-box' }, box, nav));
  stage.append(root);

  let list = [], end = 1, active = -1, height = RAIL, raf = 0, tween = 0, flashTimer = 0, painted = false, hover = null, drag = null;
  const swell = [], ticks = [];
  const getScroll = () => box.scrollTop;

  // Mede os títulos: cada um vira uma marca na posição proporcional da rolagem.
  function measure() {
    end = Math.max(box.scrollHeight - box.clientHeight, 1);
    const scroll = getScroll(), origin = box.getBoundingClientRect().top - scroll;
    list = [...content.querySelectorAll('h2, h3')].map((el) => {
      const at = Math.min(Math.max(el.getBoundingClientRect().top + scroll - origin - OFFSET, 0), end);
      return { el, text: el.textContent.trim(), level: Number(el.tagName.slice(1)) || 2, at, pos: at / end };
    });
    height = rail.clientHeight || RAIL;
    ticks.splice(0).forEach((t) => t.remove());
    list.forEach((s, i) => {
      const t = h('button', { class: 'kk-scroll-index-tick' + (s.level <= 2 ? ' l2' : ''), type: 'button', 'aria-label': s.text, 'data-state': 'ahead', style: `top:${(s.pos * 100).toFixed(3)}%`,
        onfocus: () => { hover = s.pos * height; placeLabel(i, true); schedule(); }, onblur: () => { label.style.opacity = '0'; },
        // Cliques do ponteiro são tratados pela trilha; este é o caminho do teclado.
        onclick: (e) => { if (e.detail === 0) jump(i); },
        onkeydown: (e) => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault(); ticks[Math.min(Math.max(i + (e.key === 'ArrowDown' ? 1 : -1), 0), list.length - 1)]?.focus(); } }, h('i'));
      ticks.push(t); rail.insertBefore(t, head);
    });
    active = -2;
  }
  const fraction = () => Math.min(Math.max(getScroll() / end, 0), 1);
  const nearest = (y) => {
    let best = -1, dist = Infinity;
    list.forEach((s, i) => { const dd = Math.abs(s.pos * height - y); if (dd < dist) { dist = dd; best = i; } });
    return { index: best, distance: dist };
  };
  function placeLabel(index, visible) {
    const s = list[index];
    if (!s) { label.style.opacity = '0'; return; }
    if (label.textContent !== s.text) label.textContent = s.text;
    label.style.transform = `translate3d(0,${(s.pos * height).toFixed(1)}px,0) translateY(-50%)`;
    label.style.opacity = visible ? '1' : '0';
  }
  // Seção atual: o último título que está no topo ou acima dele.
  const current = () => { const sc = getScroll() + 1; let idx = -1; for (let i = 0; i < list.length; i++) if (list[i].at <= sc) idx = i; return idx; };

  function paint() {
    raf = 0;
    head.style.transform = `translate3d(0,${(fraction() * height).toFixed(1)}px,0)`;
    const now = current();
    if (now !== active) {
      active = now;
      ticks.forEach((t, i) => { t.dataset.state = i === active ? 'current' : i < active ? 'passed' : 'ahead'; });
      // Entrar numa seção nova mostra o nome dela por um instante.
      if (painted && hover === null && !drag && active >= 0) {
        placeLabel(active, true); clearTimeout(flashTimer);
        flashTimer = setTimeout(() => { if (hover === null && !drag) label.style.opacity = '0'; }, FLASH);
      }
    }
    // As marcas se aproximam do inchaço aos poucos, então a ampliação segue o ponteiro com suavidade.
    let moving = false;
    ticks.forEach((t, i) => {
      const y = (list[i]?.pos ?? 0) * height;
      const target = hover === null || rm ? 1 : 1 + SWELL * Math.exp(-((hover - y) ** 2) / (2 * REACH * REACH));
      const v = (swell[i] ?? 1) + (target - (swell[i] ?? 1)) * 0.35;
      swell[i] = Math.abs(v - target) < 0.005 ? target : v;
      moving ||= swell[i] !== target;
      t.style.setProperty('--swell', swell[i].toFixed(3));
    });
    painted = true;
    if (moving) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(paint); }
  const stopTween = () => { cancelAnimationFrame(tween); tween = 0; };
  function scrollTo(target) {
    stopTween();
    const from = getScroll(), to = Math.min(Math.max(target, 0), end);
    if (rm || Math.abs(to - from) < 2) { box.scrollTop = to; return; }
    const duration = Math.min(Math.max(260 + Math.abs(to - from) * 0.12, 300), 650), begin = performance.now();
    const step = (now) => { const t = Math.min((now - begin) / duration, 1); box.scrollTop = from + (to - from) * easeInOut(t); tween = t < 1 ? requestAnimationFrame(step) : 0; };
    tween = requestAnimationFrame(step);
  }
  const jump = (i) => { if (list[i]) scrollTo(list[i].at); };

  const railY = (e) => Math.min(Math.max(e.clientY - rail.getBoundingClientRect().top, 0), height);
  const scrub = (y) => { box.scrollTop = (y / height) * end; };
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); d(() => el.removeEventListener(ev, fn, o)); };

  on(rail, 'pointerdown', (e) => {
    if (drag || e.button !== 0) return;
    e.preventDefault(); rail.setPointerCapture(e.pointerId); stopTween();
    const y = railY(e); drag = { id: e.pointerId, moved: false, y, t: e.timeStamp, v: 0 }; hover = y; rail.dataset.dragging = '';
    placeLabel(nearest(y).index, true); schedule();
  });
  on(rail, 'pointermove', (e) => {
    const y = railY(e);
    if (drag && e.pointerId === drag.id) {
      const dt = Math.max(e.timeStamp - drag.t, 1);
      drag.v = drag.v * 0.4 + ((y - drag.y) / dt) * 0.6; drag.moved ||= Math.abs(y - drag.y) > 3; drag.y = y; drag.t = e.timeStamp;
      if (drag.moved) scrub(y); // arrastar a trilha varre a página embaixo dela
    } else if (e.pointerType !== 'mouse') return;
    hover = y; placeLabel(nearest(y).index, true); schedule();
  });
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, y, v } = drag; drag = null; delete rail.dataset.dragging;
    if (e.pointerType !== 'mouse') { hover = null; placeLabel(-1, false); }
    // Para onde o arremesso ia, e então a marca mais próxima disso.
    const hit = nearest(moved ? y + v * 120 : y);
    if (hit.index >= 0 && (!moved || hit.distance < SNAP)) jump(hit.index);
    schedule();
  };
  on(rail, 'pointerup', up); on(rail, 'pointercancel', up);
  on(rail, 'pointerleave', () => { if (drag) return; hover = null; placeLabel(-1, false); schedule(); });
  on(box, 'scroll', schedule, { passive: true });
  // Qualquer rolagem do próprio leitor cancela um salto em andamento.
  on(box, 'wheel', stopTween, { passive: true }); on(box, 'touchstart', stopTween, { passive: true });

  const ro = new ResizeObserver(() => { measure(); schedule(); });
  ro.observe(content); ro.observe(box); d(() => ro.disconnect());
  d(() => { cancelAnimationFrame(raf); stopTween(); clearTimeout(flashTimer); });
  measure(); paint();
  return () => { d.run(); root.remove(); };
}
