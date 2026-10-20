// Conteúdo inicial ORIGINAL da Neva Growth para a biblioteca (criado uma única vez; admins podem editar/excluir).
const { get, run, tx } = require('./db');

const ITEMS = [
  { kind: 'prompt', title: 'Direção de landing page', category: 'Design e produto', summary: 'Briefing completo para gerar uma landing page de conversão.',
    content: `Atue como designer de produto e redator de conversão sênior.\n\nObjetivo: criar a landing page de [NOME DA EMPRESA], que vende [PRODUTO/SERVIÇO] para [PÚBLICO].\n\nEntregue:\n1. Proposta de valor em uma frase e subtítulo de apoio.\n2. Estrutura de seções (hero, problema, solução, prova social, preço, FAQ, CTA final) com o objetivo de cada uma.\n3. Textos prontos para cada seção, em tom [TOM DE VOZ].\n4. Direção visual: paleta, tipografia, espaçamento e estilo de imagens.\n5. Lista de microinterações discretas (hover, scroll, foco).\n\nRestrições: mobile-first, acessível (contraste AA), sem promessas que não possam ser cumpridas.` },
  { kind: 'prompt', title: 'Briefing de identidade visual', category: 'Design e produto', summary: 'Define marca, paleta e tom antes de desenhar.',
    content: `Você é diretor de arte. Com base no negócio abaixo, proponha uma identidade visual coerente.\n\nNegócio: [DESCRIÇÃO]\nPúblico: [PÚBLICO]\nSensação desejada: [PALAVRAS-CHAVE]\n\nResponda com: conceito em 2 frases; paleta (hex, uso de cada cor); par tipográfico; regras de logotipo; 5 exemplos de aplicação; o que evitar.` },
  { kind: 'prompt', title: 'Revisão de código para publicar', category: 'Desenvolvimento', summary: 'Checklist de problemas comuns antes de ir ao ar.',
    content: `Revise o código a seguir como engenheiro sênior. Aponte, por prioridade: bugs, falhas de segurança (XSS, injeção, segredos expostos), acessibilidade, desempenho e legibilidade. Para cada item: arquivo/linha, por que é um problema, correção sugerida em código. Se algo estiver correto, diga explicitamente.\n\n[COLE O CÓDIGO]` },
  { kind: 'skill', title: 'Método: revisão de alterações em 5 passos', category: 'Desenvolvimento', summary: 'Instruções reutilizáveis para um agente de código revisar mudanças.',
    content: `# Skill: revisão de alterações\n\n## Quando usar\nSempre que houver um diff ou PR para avaliar.\n\n## Passos\n1. Leia o diff completo antes de comentar.\n2. Entenda a intenção (título, descrição, testes).\n3. Procure bugs reais: caminhos de erro, nulos, concorrência, limites.\n4. Verifique segurança e dados sensíveis.\n5. Resuma: o que está bom, o que bloqueia, o que é opcional.\n\n## Instalação\nSalve este arquivo como \`SKILL.md\` na pasta de skills do seu agente de código e peça: "revise as alterações atuais".` },
  { kind: 'animation', title: 'Revelar ao rolar (scroll reveal)', category: 'Movimento', summary: 'Elementos surgem suavemente ao entrar na tela; respeita "reduzir movimento".',
    content: `<style>\n.reveal{opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease}\n.reveal.in{opacity:1;transform:none}\n@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}\n</style>\n<script>\nconst io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });\ndocument.querySelectorAll('.reveal').forEach((el) => io.observe(el));\n</script>\n<!-- uso: <section class="reveal">…</section> -->` },
  { kind: 'animation', title: 'Cartão com elevação no hover', category: 'Movimento', summary: 'Microinteração sutil para cartões clicáveis.',
    content: `.card{transition:transform .2s ease,box-shadow .2s ease}\n.card:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(47,123,189,.14)}\n.card:focus-visible{outline:2px solid #4a95d2;outline-offset:3px}\n@media (prefers-reduced-motion:reduce){.card{transition:none}.card:hover{transform:none}}` },
  { kind: 'design', title: 'Neva Growth — azul-gelo', category: 'Referência', niche: 'SaaS', style: 'Minimalista claro', site_type: 'Aplicação', summary: 'Tokens e regras da identidade da própria plataforma.',
    content: `# DESIGN.md — Neva Growth (azul-gelo)\n\n## Princípios\nClareza, respiro, hierarquia por tipografia e espaço; bordas discretas; sombras suaves azuladas.\n\n## Cores\n- Fundo: #f4f9fd · Cartão: #ffffff · Linha: #dbe8f5\n- Primária: #2f7bbd (hover #255f93) · Realce: #4a95d2\n- Texto: #0e2236 · Texto secundário: #5b7087\n- Sucesso #1f9d6b · Aviso #c98a12 · Erro #d1434b\n\n## Tipografia\nFamília sem serifa do sistema (Inter quando disponível). Títulos 600–700, corpo 400, 15px base, entrelinha 1.5.\n\n## Forma e movimento\nRaio 12px (cartões) e 10px (controles). Transições de 150–250 ms; respeitar prefers-reduced-motion.\n\n## Componentes\nBotão primário preenchido; secundário com borda; estados de foco com anel azul 3px translúcido; tabelas com cabeçalho em caixa-alta pequena.` },
  { kind: 'design', title: 'Editorial minimalista (modelo original)', category: 'Referência', niche: 'Agências', style: 'Editorial', site_type: 'Portfólio', summary: 'Grade ampla, tipografia grande e muito espaço branco.',
    content: `# DESIGN.md — Editorial minimalista\n\n## Princípios\nTipografia como imagem; grade de 12 colunas; uma ação principal por tela.\n\n## Cores\nFundo #fbfcfe, texto #101820, destaque único #2f7bbd.\n\n## Tipografia\nTítulos em escala fluida (clamp(2.2rem, 6vw, 5rem)), peso 700, letter-spacing -0.02em. Corpo 17–18px.\n\n## Layout\nSeções com 96–140px de respiro vertical; imagens em proporção 4:3 e 16:9; navegação simples no topo.\n\n## Movimento\nRevelar ao rolar com 400–600 ms; sem parallax pesado.` }
];

async function seedLibrary() {
  if (await get("SELECT 1 x FROM meta WHERE key='library_seeded'")) return;
  await tx(async () => {
    if (await get("SELECT 1 x FROM meta WHERE key='library_seeded'")) return;
    for (const i of ITEMS) await run('INSERT INTO library_items(kind,title,category,summary,content,niche,style,site_type,min_plan) VALUES (?,?,?,?,?,?,?,?,?)', i.kind, i.title, i.category || null, i.summary || null, i.content, i.niche || null, i.style || null, i.site_type || null, 'member');
    await run("INSERT INTO meta(key,value) VALUES ('library_seeded','1') ON CONFLICT (key) DO NOTHING");
  });
}
// Conteúdo ampliado (referências de design, prompts, skills e animações): entra uma vez, só os títulos que ainda não existem.
async function seedLibraryV2() {
  if (await get("SELECT 1 x FROM meta WHERE key='library_seed_v2'")) return;
  const { ITEMS: MORE } = require('./seed-content');
  await tx(async () => {
    if (await get("SELECT 1 x FROM meta WHERE key='library_seed_v2'")) return;
    for (const i of MORE) {
      if (await get('SELECT 1 x FROM library_items WHERE kind=? AND title=?', i.kind, i.title)) continue;
      await run('INSERT INTO library_items(kind,title,category,summary,content,niche,style,site_type,url,min_plan) VALUES (?,?,?,?,?,?,?,?,?,?)', i.kind, i.title, i.category || null, i.summary || null, i.content, i.niche || null, i.style || null, i.site_type || null, i.url || null, i.min_plan || 'member');
    }
    await run("INSERT INTO meta(key,value) VALUES ('library_seed_v2','1') ON CONFLICT (key) DO NOTHING");
  });
}

// Referências verificadas (docs/referencias-verificadas.json, criado por scripts/add-reference.js): só entra URL que
// respondeu e foi medida; o texto vem das medidas, nunca de descrição inventada. Idempotente: roda a cada partida.
async function seedVerifiedReferences() {
  const file = require('node:path').join(__dirname, '..', '..', 'docs', 'referencias-verificadas.json');
  let list = [];
  try { list = JSON.parse(require('node:fs').readFileSync(file, 'utf8')); } catch { return; }
  for (const r of list) {
    if (!r.verifiedAt || !r.url || !r.title || !r.measured) continue;
    if (await get("SELECT 1 x FROM library_items WHERE kind='design' AND title=?", r.title)) continue;
    const m = r.measured;
    const content = [`# DESIGN.md — ${r.title}`, '', `> Medido em ${r.verifiedAt.slice(0, 10)} no site real (${r.url}). Leitura objetiva da primeira tela, não é cópia nem as medidas exatas.`, '',
      '## Cores (medidas no CSS)', (m.colors || []).join(' · ') || 'não detectadas', '',
      '## Tipografia (fonte realmente renderizada)', `Títulos: ${m.h1?.font || m.fonts?.[0] || 'n/d'}${m.h1 ? `, ${m.h1.px}px, peso ${m.h1.weight}, alinhado ${m.h1.align === 'centro' ? 'ao centro' : 'à esquerda'}${m.h1.upper ? ', caixa alta' : ''}` : ''}. Texto: ${m.bodyFont || 'n/d'}.`, '',
      '## Composição (primeira tela, 1440px)', `Tema ${m.theme}; imagem/vídeo ocupa ${Math.round((m.mediaShare || 0) * 100)}% da tela; menu ${m.navFixed ? 'fixo' : 'rola junto'} (${m.navLinks} links); página com ${m.screens} telas e ${m.sections} seções.`].join('\n');
    await run('INSERT INTO library_items(kind,title,category,summary,content,niche,style,site_type,url,min_plan) VALUES (?,?,?,?,?,?,?,?,?,?)', 'design', r.title, 'Referência verificada', `${r.niche} · ${r.style} (medido em site real)`, content, r.niche, r.style, r.site_type || 'Institucional', r.url, 'member');
  }
}
module.exports = { seedLibrary, seedLibraryV2, seedVerifiedReferences };
