// River falsa (API compatível com OpenAI) para o e2e do Builder/Studio sem gastar IA de verdade.
// Responde cada etapa do Code Maker no formato que o servidor espera: requisitos, análise, plano, partes e alteração.
// Uso: PORT=3299 node test/e2e/mock-river.mjs   →   RIVER_BASE_URL=http://127.0.0.1:3299/v1 RIVER_API_KEY=teste npm start
import http from 'node:http';

const PORT = Number(process.env.PORT || 3299);
const seen = [];

const PLAN = {
  title: 'Padaria Sol — pães de fermentação natural em Recife', description: 'Pães artesanais de fermentação natural, feitos todo dia em Recife.',
  direction: 'Acolhedor e artesanal, com tons de farinha e crosta tostada.', theme: 'light', lang: 'pt-BR',
  palette: { brand: '#b45309', brandDark: '#7c2d12', accent: '#f59e0b', ink: '#1c1917', paper: '#fafaf9', surface: '#f1ece4', muted: '#57534e' },
  fonts: { display: 'Fraunces', body: 'Figtree' }, radius: 'soft', cta: 'Pedir no WhatsApp', tagline: 'Pão de verdade, feito devagar.',
  favicon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#b45309"/><circle cx="32" cy="34" r="16" fill="#f59e0b"/></svg>',
  signature: 'Título do topo enorme sobre a foto do pão saindo do forno.', signatureSection: 'hero', header: 'menu-pilula', effects: [],
  sections: [
    { id: 'hero', label: 'Início', layout: 'hero-dividido', headline: 'Pão de fermentação natural todo dia', brief: 'Topo com foto do forno e botão de pedido.', bg: 'paper' },
    { id: 'paes', label: 'Pães', layout: 'cards-foto', headline: 'Pães que saem do forno às 7h', brief: '3 pães: italiano, integral, centeio.', bg: 'surface' },
    { id: 'como-funciona', label: 'Como pedir', layout: 'passos', headline: 'Peça hoje, retire amanhã cedo', brief: '3 etapas do pedido.', bg: 'paper' },
    { id: 'contato', label: 'Contato', layout: 'faixa-destaque', headline: 'Fale com a padaria', brief: 'Chamada para o WhatsApp.', bg: 'brand' }
  ],
  business: { name: 'Padaria Sol', niche: 'padaria', city: 'Recife', phone: null }
};
const PART = (id) => ({
  hero: { kicker: 'Padaria artesanal', title: 'Pão de fermentação natural todo dia', highlight: 'fermentação natural', subtitle: 'Massa descansada por 24 horas e assada cedo, do jeito que pão deve ser.', primary: 'Pedir no WhatsApp', secondary: 'Ver os pães' },
  paes: { title: 'Pães que saem do forno às 7h', items: [{ title: 'Italiano', text: 'Casca crocante e miolo aberto.' }, { title: 'Integral', text: 'Farinha integral moída na pedra.' }, { title: 'Centeio', text: 'Sabor marcante e leve acidez.' }] },
  'como-funciona': { title: 'Peça hoje, retire amanhã cedo', items: [{ title: 'Escolha', text: 'Veja os pães do dia.' }, { title: 'Peça', text: 'Mande a lista pelo WhatsApp.' }, { title: 'Retire', text: 'Pegue quentinho a partir das 7h.' }] },
  contato: { title: 'Fale com a padaria', subtitle: 'Mande seu pedido e retire amanhã cedo.', primary: 'Pedir no WhatsApp' }
}[id] || { title: 'Seção', subtitle: 'Texto da seção.' });

const EDIT = `<acoes>
- Troquei o texto da chamada final para falar da retirada.
- Criei um estilo para destacar os botões.
</acoes>
<escrever arquivo="secoes/contato.html">
<section id="contato" class="py-20 bg-brand text-white"><div class="mx-auto max-w-6xl px-5"><h2 class="font-display text-4xl">Retire amanhã a partir das 7h</h2><p class="mt-3">Mande seu pedido hoje pelo WhatsApp.</p></div></section>
</escrever>
<escrever arquivo="estilos.css">
.btn-destaque{box-shadow:0 8px 24px rgba(180,83,9,.35)}
</escrever>`;

function stageOf(body) {
  const sys = body.messages?.find((m) => m.role === 'system')?.content || '';
  const user = body.messages?.filter((m) => m.role === 'user').pop()?.content || '';
  if (/Você vai planejar este site\. ANTES/.test(user) || /Você vai alterar este site\. ANTES/.test(user)) return 'analise';
  if (/escolhe quais arquivos/.test(sys)) return 'select';
  if (/diretor de arte do Code Maker/.test(sys)) return 'plan';
  if (/redator publicitário sênior/.test(sys)) return 'part';
  if (/está alterando um projeto de site/.test(sys)) return 'edit';
  if (/Resolva o problema/.test(sys)) return 'qa';
  return 'spec';
}
function textFor(stage, body) {
  if (stage === 'spec') return JSON.stringify({ objective: 'Site da padaria', requirements: [{ id: 'R1', text: 'Mostrar os pães e o pedido pelo WhatsApp', scope: 'frontend', validation: 'seções visíveis' }], constraints: [], forbiddenChanges: [], relevantFiles: [], dependencies: [], validation: [], limitations: [] });
  if (stage === 'select') return '{"arquivos":["secoes/contato.html"]}';
  if (stage === 'analise') return '- Contexto: landing page institucional\n- Ação principal: pedir pelo WhatsApp\n- Não inventar preços nem avaliações';
  if (stage === 'plan') return `<acoes>\n- É uma landing page institucional; a ação principal é pedir pelo WhatsApp.\n- Cores de farinha e crosta tostada.\n- Fontes Fraunces e Figtree.\n</acoes>\n<plano>\n${JSON.stringify(PLAN)}\n</plano>`;
  if (stage === 'part') {
    const user = body.messages.filter((m) => m.role === 'user').pop().content;
    const label = user.match(/SEÇÃO QUE VOCÊ ESCREVE: "([^"]+)"/)?.[1];
    const id = PLAN.sections.find((x) => x.label === label)?.id || 'hero';
    return '```json\n' + JSON.stringify(PART(id)) + '\n```';
  }
  if (stage === 'edit') return EDIT;
  if (stage === 'qa') return 'Raciocínio curto.\nRESPOSTA: 301';
  return 'ok';
}

http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (req.url.endsWith('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'mock/rapido' }, { id: 'mock/padrao' }] })); return; }
    if (req.url === '/__seen') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(seen)); return; }
    const body = JSON.parse(raw || '{}');
    const stage = stageOf(body);
    seen.push({ stage, model: body.model, max_tokens: body.max_tokens, temperature: body.temperature, reasoning: body.reasoning_effort || body.reasoning || body.thinking || null, system: (body.messages?.[0]?.content || '').slice(0, 120) });
    const text = textFor(stage, body);
    const usage = { prompt_tokens: Math.round(JSON.stringify(body.messages || []).length / 4), completion_tokens: Math.round(text.length / 4) };
    if (!body.stream) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: 'stop' }], usage })); return; }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const pieces = text.match(/[\s\S]{1,60}/g) || [''];
    let i = 0;
    const tick = () => {
      if (i < pieces.length) { res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: pieces[i++] } }] })}\n\n`); setTimeout(tick, 8); return; }
      res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ choices: [], usage })}\n\n`);
      res.end('data: [DONE]\n\n');
    };
    tick();
  });
}).listen(PORT, () => console.log(`mock river on ${PORT}`));
