// Componentes UI: galeria de componentes em JavaScript puro,
// no azul da Neva. Cada cartão monta o componente ao entrar na tela e o desmonta ao sair (animações e canvas não ficam rodando fora de vista).
// Abrir em tela grande: botão "Ampliar" (ou #/componentes/<nome>).
import { h, mount, icon, modal, hero, copyText, downloadFile, toast } from '../ui.js';
import { KIT } from '../ui-kit/manifest.js';

const CATS = ['Todos', 'Fundos', 'Cartões', 'Navegação', 'Campos', 'IA', 'Mídia', 'Textos', 'Botões'];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function load(slug) {
  try { return (await import(`../ui-kit/c/${slug}.js`)).default; } catch (e) { if (/Failed to fetch|Cannot find|Unexpected token|404|error loading/i.test(String(e?.message))) return null; console.error('[ui-kit]', slug, e); return 'erro'; }
}

/** Prompt de integração do componente: pronto para colar no assistente de código (traz o código do componente e o arquivo de apoio). */
let kitSrc = null;
async function buildPrompt(item) {
  const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error('Não consegui ler o código deste componente.'); return (await r.text()).trim(); };
  const code = await get(`/js/ui-kit/c/${item.slug}.js`);
  kitSrc ||= await get('/js/ui-kit/kit.js');
  const usesH = /from '\.\.\/kit\.js'/.test(code);
  // Arquivos do app que alguns componentes importam: os motores (dot-field, drape-bg) vão junto; os helpers de ui.js são descritos.
  const engines = []; for (const m of code.matchAll(/from '\.\.\/\.\.\/((?:dot-field|drape-bg)\.js)'/g)) engines.push([m[1], await get('/js/' + m[1])]);
  const helpers = [...new Set([...code.matchAll(/import \{([^}]*)\} from '\.\.\/\.\.\/ui\.js'/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()).filter(Boolean)))];
  const HELP = { icon: 'icon(nome) devolve um ícone SVG (troque por qualquer biblioteca de ícones ou SVG inline)', toast: 'toast(mensagem, tipo) mostra um aviso rápido na tela', copyText: 'copyText(texto, mensagem) copia com navigator.clipboard.writeText e avisa', downloadFile: 'downloadFile(nome, conteúdo) baixa um arquivo de texto' };
  return `Você recebeu a tarefa de integrar um componente de interface neste projeto: "${item.name}" (${item.cat}).
${item.desc}

O projeto deve suportar:
- HTML, CSS e JavaScript puro (módulos ES), sem React, sem Tailwind e sem etapa de build.
- Se o projeto já usa React, Tailwind ou TypeScript, adapte o código: aqui o componente é uma função \`mount(stage, ctx)\` que recebe um elemento e devolve a função de limpeza.

Caminhos padrão:
- Componentes em /js/ui-kit/c/<nome>.js (exporta \`default function mount(stage, ctx)\`).
- Utilitários comuns em /js/ui-kit/kit.js (importado pelo componente como '../kit.js'). Se o projeto não tiver esse arquivo, crie-o com o conteúdo abaixo.
- Os estilos ficam dentro do próprio componente (ensureStyle injeta o CSS uma única vez, com classes prefixadas por kk-${item.slug}-). Não precisa de arquivo de CSS à parte.

Copie este componente para /js/ui-kit/c/${item.slug}.js:
\`\`\`js
${code}
\`\`\`
${helpers.length ? `
Este componente importa helpers do app ('../../ui.js'). No seu projeto, troque o import por equivalentes simples:
${helpers.map((x) => `- ${HELP[x] || x}`).join('\n')}
` : ''}${engines.map(([n, src]) => `
Este componente usa o motor /js/${n}. Copie para /js/${n} (ele pode importar motionEnabled de "./motion.js": troque por uma função que devolve !matchMedia("(prefers-reduced-motion: reduce)").matches) => !matchMedia('(prefers-reduced-motion: reduce)').matches\`):
\`\`\`js
${src}
\`\`\`
`).join('')}${usesH ? `
Copie estes utilitários para /js/ui-kit/kit.js (se ainda não existir):
\`\`\`js
${kitSrc}
\`\`\`
` : ''}
Como usar (demo):
\`\`\`js
import mount from '/js/ui-kit/c/${item.slug}.js';

const stage = document.querySelector('#palco'); // qualquer div com largura e altura definidas
const stop = await mount(stage, { big: false, theme: 'light' });
// ao desmontar / sair da tela:
stop?.();
\`\`\`

Dependências:
- Nenhum pacote npm.
- Cores no azul da Neva (use a paleta do kit.js); se o projeto tiver outra paleta, troque as cores no componente.

Diretrizes de implementação:
1. Analise a estrutura do componente e identifique tudo de que ele depende (kit.js, CSS injetado, eventos de ponteiro, canvas).
2. Revise os argumentos (stage, ctx) e o estado interno; sempre chame a função de limpeza ao desmontar (cancela animações, observers e listeners).
3. Respeite prefers-reduced-motion e funcione em tela de toque (390 px de largura).
4. Perguntas a fazer: quais dados entram no componente? onde ele fica na página? qual o comportamento responsivo esperado?

Passos para integrar:
0. Copie e cole os arquivos acima nos diretórios corretos.
1. Garanta que /js/ui-kit/kit.js exista e seja importável.
2. Troque textos e imagens de exemplo pelos do projeto (imagens reais do cliente ou fotos de banco de imagens que você saiba que existem).
3. Use ícones em SVG simples (traço 1.8, cantos arredondados) quando o componente pedir logos ou ícones.
`;
}
async function openPrompt(item) {
  let text;
  try { text = await buildPrompt(item); } catch (e) { toast(e.message, 'err'); return; }
  copyText(text, 'Prompt copiado.');
  modal({ title: `Prompt: ${item.name}`, size: 'kk-modal', body: h('div', { class: 'stack' },
    h('p', { class: 'sm mut' }, 'Já copiei para a área de transferência. Cole no seu assistente de código (Claude, ChatGPT, Cursor, Codex): o prompt leva o código completo do componente.'),
    h('pre', { class: 'code kk-prompt', tabindex: 0 }, text),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => copyText(text, 'Prompt copiado.') }, icon('copy'), 'Copiar prompt'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => downloadFile(`${item.slug}-prompt.txt`, text) }, 'Baixar .txt'))) });
}

/** Monta um componente num palco; devolve a limpeza. */
async function run(stage, item, big) {
  const fn = await load(item.slug);
  if (typeof fn !== 'function') { stage.replaceChildren(h('p', { class: 'kk-empty' }, fn === 'erro' ? 'Este componente falhou ao abrir.' : 'Em breve.')); return () => {}; }
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
      const stage = h('div', { class: 'kk-stage', 'data-slug': item.slug }, h('span', { class: 'kk-skel', 'aria-hidden': 'true' }));
      live.set(stage, { item, on: false, stop: null });
      return h('article', { class: 'kk-card', id: 'kk-' + item.slug },
        h('div', { class: 'kk-frame' }, stage, h('span', { class: 'kk-chip' }, item.cat)),
        h('div', { class: 'kk-meta' }, h('b', item.name), h('p', item.desc)),
        h('div', { class: 'kk-acts' },
          h('button', { type: 'button', class: 'kk-open', onclick: () => expand(item) }, icon('expand'), 'Ampliar'),
          h('button', { type: 'button', class: 'kk-prompt-btn', onclick: () => openPrompt(item) }, icon('copy'), 'Copiar prompt')));
    };
    const draw = () => {
      release(); const list = items();
      count.textContent = `${list.length} de ${KIT.length}`;
      mount(grid, ...(list.length ? list.map(card) : [h('div', { class: 'empty' }, h('b', 'Nenhum componente encontrado'), 'Tente outra palavra ou categoria.')]));
      for (const stage of live.keys()) io.observe(stage);
    };
    const search = h('input', { type: 'search', class: 'kk-q', placeholder: 'Buscar componente: botão, cartão, IA…', 'aria-label': 'Buscar componente', oninput: (e) => { q = e.target.value; draw(); } });
    const pills = h('div', { class: 'pills kk-pills', role: 'tablist' }, CATS.map((c) => h('button', { type: 'button', class: 'pill' + (c === cat ? ' on' : ''), role: 'tab', onclick: (e) => { cat = c; pills.querySelectorAll('.pill').forEach((p) => p.classList.toggle('on', p === e.currentTarget)); draw(); } }, c)));
    const bar = h('div', { class: 'kk-bar' }, h('div', { class: 'kk-sbox' }, icon('search'), search), pills, count);
    mount(box,
      hero({ kicker: 'Neva Growth / Componentes UI', title: 'Componentes prontos para o seu site.', subtitle: 'Componentes de interface em JavaScript puro, no azul da Neva. Interaja com cada um e abra em tela grande.',
        stats: h('div', { class: 'chips3' }, h('span', { class: 'chipk' }, icon('layers'), `${KIT.length} componentes`), h('span', { class: 'chipk' }, icon('code'), 'JavaScript puro')) }),
      bar, grid);
    draw();
    const open = ctx.params?.[0] && KIT.find((i) => i.slug === ctx.params[0]);
    if (open) { document.getElementById('kk-' + open.slug)?.scrollIntoView({ block: 'center' }); expand(open); }
    return () => { release(); io.disconnect(); };
  }
};
