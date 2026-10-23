// Componentes UI: galeria dos componentes do Kokonut UI (MIT, https://kokonutui.com) reescritos em JavaScript puro,
// no azul da Neva. Cada cartão monta o componente ao entrar na tela e o desmonta ao sair (animações e canvas não ficam rodando fora de vista).
// Abrir em tela grande: botão "Ampliar" (ou #/componentes/<nome>).
import { h, mount, icon, modal, copyText, downloadFile, toast } from '../ui.js';
import { KIT } from '../ui-kit/manifest.js';

const CATS = ['Todos', 'Fundos', 'Cartões', 'Navegação', 'Campos', 'IA', 'Mídia', 'Textos', 'Botões'];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function load(slug) {
  try { return (await import(`../ui-kit/c/${slug}.js`)).default; } catch (e) { if (/Failed to fetch|Cannot find|Unexpected token|404|error loading/i.test(String(e?.message))) return null; console.error('[ui-kit]', slug, e); return 'erro'; }
}

/** Prompt de integração no estilo "copiar prompt" do Kokonut, adaptado ao site da Neva (JavaScript puro, sem React/Tailwind). */
async function buildPrompt(item) {
  const r = await fetch(`/js/ui-kit/c/${item.slug}.js`); if (!r.ok) throw new Error('Não consegui ler o código deste componente.');
  const code = (await r.text()).trim();
  return `Você recebeu a tarefa de integrar um componente de interface existente neste projeto: "${item.name}" (${item.cat}).
${item.desc}

O projeto deve suportar:
- HTML, CSS e JavaScript puro (módulos ES), sem React, sem Tailwind e sem build.
- Se o projeto usar React, Tailwind ou TypeScript, adapte o código: o componente aqui é uma função \`mount(stage, ctx)\` que recebe um elemento e devolve a função de limpeza.

Caminhos padrão:
- Componentes em /js/ui-kit/c/ (um arquivo por componente, exporta \`default function mount(stage, ctx)\`).
- Utilitários comuns em /js/ui-kit/kit.js (h, svg, ensureStyle, spring, loop, drag, onResize, disposer, PALETTE). Se esse arquivo não existir no seu projeto, crie-o ou troque os imports por helpers próprios.
- Os estilos ficam dentro do próprio componente (ensureStyle injeta o CSS uma única vez, com classes prefixadas por kk-${item.slug}-).

Copie este componente para /js/ui-kit/c/${item.slug}.js:
\`\`\`js
${item.slug}.js
${code}
\`\`\`

Como usar (demo):
\`\`\`js
import mount from '/js/ui-kit/c/${item.slug}.js';

const stage = document.querySelector('#palco'); // qualquer div com largura/altura definidas
const stop = await mount(stage, { big: false, theme: 'light' });
// ao sair da tela / desmontar:
stop?.();
\`\`\`

Dependências:
- Nenhum pacote npm. Só o arquivo kit.js acima.
- Cores no azul da Neva (use as variáveis/PALETTE); não troque por verde, roxo ou laranja de marca.

Diretrizes de implementação:
1. Analise a estrutura do componente e identifique tudo de que ele depende (kit.js, CSS injetado, eventos de ponteiro).
2. Revise os argumentos (stage, ctx) e o estado interno; sempre chame a função de limpeza ao desmontar (cancela animações, observers e listeners).
3. Respeite prefers-reduced-motion e funcione em tela de toque (390 px de largura).
4. Perguntas a fazer: quais dados vão no componente? onde ele entra na página? qual o comportamento responsivo esperado?

Passos para integrar:
0. Copie e cole o código acima nos diretórios corretos.
1. Garanta que /js/ui-kit/kit.js exista e seja importável.
2. Troque imagens de exemplo por imagens reais do projeto (ou fotos de banco de imagens que você saiba que existem).
3. Use ícones em SVG simples (traço 1.8, cantos arredondados) quando o componente pedir logos ou ícones.
`;
}
async function openPrompt(item) {
  let text;
  try { text = await buildPrompt(item); } catch (e) { toast(e.message, 'err'); return; }
  const pre = h('pre', { class: 'code kk-prompt', tabindex: 0 }, text);
  modal({ title: `Prompt: ${item.name}`, size: 'kk-modal', body: h('div', { class: 'stack' },
    h('p', { class: 'sm mut' }, 'Cole este prompt no seu assistente de código (Claude, ChatGPT, Cursor, Codex). Ele já leva o código completo do componente.'), pre,
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => copyText(text, 'Prompt copiado.') }, icon('copy'), 'Copiar prompt'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => downloadFile(`${item.slug}-prompt.txt`, text) }, 'Baixar .txt'))) });
  copyText(text, 'Prompt copiado.');
}

/** Monta um componente num palco; devolve a limpeza. */
async function run(stage, item, big) {
  const fn = await load(item.slug);
  if (typeof fn !== 'function') { stage.replaceChildren(h('p', { class: 'kk-empty' }, fn === 'erro' ? 'Este componente falhou ao abrir.' : item.pro ? 'Exclusivo do Kokonut UI Pro (código não público).' : 'Em breve.')); return () => {}; }
  stage.replaceChildren();
  try { const out = await fn(stage, { big, theme: 'light' }); return typeof out === 'function' ? out : () => {}; }
  catch (e) { console.error('[ui-kit]', item.slug, e); stage.replaceChildren(h('p', { class: 'kk-empty' }, 'Este componente falhou ao abrir.')); return () => {}; }
}

export default {
  async render(box, ctx) {
    let cat = 'Todos'; let q = ''; const live = new Map(); // stage -> { item, stop, on }
    const items = () => KIT.filter((i) => (cat === 'Todos' || i.cat === cat) && (!q || norm(`${i.name} ${i.desc} ${i.cat} ${i.slug}`).includes(norm(q))));
    const grid = h('div', { class: 'kk-grid' });
    const count = h('span', { class: 'kk-count' });
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const rec = live.get(en.target); if (!rec) continue;
        if (en.isIntersecting && !rec.on) { rec.on = true; run(en.target, rec.item, false).then((stop) => { if (rec.on) rec.stop = stop; else stop(); }); }
        else if (!en.isIntersecting && rec.on) { rec.on = false; rec.stop?.(); rec.stop = null; en.target.replaceChildren(); }
      }
    }, { rootMargin: '240px 0px' });
    const release = () => { for (const [stage, rec] of live) { rec.on = false; rec.stop?.(); io.unobserve(stage); } live.clear(); };

    const expand = (item) => {
      const stage = h('div', { class: 'kk-stage big' }); let stop = () => {};
      modal({ title: item.name, size: 'kk-modal', body: h('div', { class: 'kk-big' }, stage, h('p', { class: 'kk-desc' }, item.desc)), onClose: () => stop() });
      run(stage, item, true).then((s) => { stop = s; });
      history.replaceState(null, '', `#/componentes/${item.slug}`);
    };
    const card = (item) => {
      const stage = h('div', { class: 'kk-stage', 'data-slug': item.slug });
      live.set(stage, { item, on: false, stop: null });
      return h('article', { class: 'kk-card', id: 'kk-' + item.slug },
        stage,
        h('div', { class: 'kk-meta' }, h('div', h('b', item.name), h('span', { class: 'kk-tag' }, item.cat)), h('p', item.desc)),
        h('div', { class: 'kk-acts' },
          h('button', { type: 'button', class: 'btn sm ghost', disabled: item.pro, onclick: () => expand(item) }, icon('expand'), 'Ampliar'),
          h('button', { type: 'button', class: 'btn sm', disabled: item.pro, onclick: () => openPrompt(item) }, icon('copy'), 'Copiar prompt'),
          h('a', { class: 'kk-src', href: item.url, target: '_blank', rel: 'noopener' }, 'Original ↗')));
    };
    const draw = () => {
      release(); const list = items();
      count.textContent = `${list.length} de ${KIT.length} componentes`;
      mount(grid, ...(list.length ? list.map(card) : [h('div', { class: 'empty' }, h('b', 'Nenhum componente encontrado'), 'Tente outra palavra ou categoria.')]));
      for (const stage of live.keys()) io.observe(stage);
    };
    const search = h('input', { type: 'search', class: 'kk-q', placeholder: 'Buscar componente (ex.: botão, cartão, IA)', 'aria-label': 'Buscar componente', oninput: (e) => { q = e.target.value; draw(); } });
    const pills = h('div', { class: 'pills kk-pills', role: 'tablist' }, CATS.map((c) => h('button', { type: 'button', class: 'pill' + (c === cat ? ' on' : ''), role: 'tab', onclick: (e) => { cat = c; pills.querySelectorAll('.pill').forEach((p) => p.classList.toggle('on', p === e.currentTarget)); draw(); } }, c)));
    mount(box,
      h('div', { class: 'kk-head' }, h('div', h('h1', 'Componentes UI'), h('p', 'Os componentes do Kokonut UI (licença MIT) reescritos em JavaScript puro, no azul da Neva. Interaja com cada um; "Ampliar" abre em tela grande.')), count),
      h('div', { class: 'kk-bar' }, search, pills), grid);
    draw();
    const open = ctx.params?.[0] && KIT.find((i) => i.slug === ctx.params[0]);
    if (open && !open.pro) { document.getElementById('kk-' + open.slug)?.scrollIntoView({ block: 'center' }); expand(open); }
    return () => { release(); io.disconnect(); };
  }
};
