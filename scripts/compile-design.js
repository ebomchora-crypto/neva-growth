// Compila docs/design/DESIGN.md no system prompt do Builder (server/lib/codemaker/design-md.js).
//
// O DESIGN.md original tem ~2,4 MB: 30 capítulos, 309 temas e, para cada tema, as MESMAS 12
// verificações repetidas em 4 contextos (13.488 linhas que só trocam o nome do tema). Mandar o
// arquivo inteiro para a IA (~600 mil tokens) não cabe em nenhuma chamada e não acrescenta nada:
// aqui cada verificação aparece uma vez, como protocolo que vale para todos os temas, e todo o
// conteúdo que só existe uma vez no arquivo (regras, portões, critérios, contrato) entra inteiro.
//
// Uso: node scripts/compile-design.js   (rode de novo sempre que o DESIGN.md mudar)
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'docs', 'design', 'DESIGN.md');
const OUT = path.join(__dirname, '..', 'server', 'lib', 'codemaker', 'design-md.js');

function parse(text) {
  const lines = text.split('\n');
  const doc = { title: '', notes: [], chapters: [], contexts: [], fields: new Map(), contract: [] };
  let chapter = null; let topic = null; let context = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) { doc.title = line.slice(2).trim(); continue; }
    if (line.startsWith('> ')) { doc.notes.push(line.slice(2).trim()); continue; }
    if (line.startsWith('## ')) { chapter = { name: line.slice(3).trim(), intro: [], rules: [], topics: [], gate: [] }; doc.chapters.push(chapter); topic = null; context = null; continue; }
    if (line.startsWith('### ')) { topic = line.slice(4).trim(); context = null; if (topic !== 'Portão de qualidade do capítulo') chapter.topics.push(topic); continue; }
    if (line.startsWith('#### ')) { context = line.slice(5).replace(/^Contexto:\s*/, '').trim(); if (!doc.contexts.includes(context)) doc.contexts.push(context); continue; }
    if (!line.trim() || !chapter) continue;
    const field = line.match(/^- \*\*(.+?):\*\* (.*)$/);
    if (field && topic && context) {
      // Troca o tema e o contexto por marcadores para achar a frase-modelo de cada verificação.
      let t = field[2];
      const names = [topic, topic.toLowerCase(), topic[0].toLowerCase() + topic.slice(1)];
      for (const n of names.sort((a, b) => b.length - a.length)) t = t.split(n).join('{tema}');
      t = t.split(context).join('{contexto}');
      const counts = doc.fields.get(field[1]) || new Map();
      counts.set(t, (counts.get(t) || 0) + 1); doc.fields.set(field[1], counts);
      continue;
    }
    if (/^- \[ \]/.test(line)) { doc.contract.push(line.replace(/^- \[ \]\s*/, '')); continue; }
    if (line.startsWith('- ')) { (topic === 'Portão de qualidade do capítulo' ? chapter.gate : chapter.rules).push(line.slice(2)); continue; }
    if (!topic) chapter.intro.push(line.trim());
  }
  return doc;
}

function compile(doc) {
  const fields = [...doc.fields.entries()].map(([name, counts]) => [name, [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]]);
  const gates = [...new Set(doc.chapters.flatMap((c) => c.gate))];
  const rules = doc.chapters.flatMap((c) => c.rules);
  const topicsTotal = doc.chapters.reduce((n, c) => n + c.topics.length, 0);
  const out = [];
  out.push(`SISTEMA DE DESIGN — ${doc.title}`);
  out.push(...doc.notes.map((n) => `> ${n}`));
  out.push('', 'Este é o seu DESIGN.md (compilado: as verificações que o original repete em cada tema aparecem uma vez e valem para TODOS os temas). Ele manda no visual, no conteúdo e na qualidade do site.');
  out.push('', 'REGRAS GERAIS', ...rules.map((r) => `- ${r}`));
  out.push('', `CONTEXTOS: classifique o pedido em um deles e aplique as verificações nesse contexto: ${doc.contexts.join(' | ')}.`);
  out.push('', 'PROTOCOLO DE DECISÃO (aplique a cada tema da lista abaixo que existir no site; {tema} = o tema, {contexto} = o contexto escolhido)');
  out.push(...fields.map(([name, text]) => `- ${name}: ${text}`));
  out.push('', `TEMAS POR CAPÍTULO (${doc.chapters.length} capítulos, ${topicsTotal} temas)`);
  for (const c of doc.chapters) if (c.topics.length) out.push(`- ${c.name}: ${c.topics.join('; ')}.`);
  out.push('', 'PORTÃO DE QUALIDADE (vale para todo capítulo)', ...gates.map((g) => `- ${g}`));
  if (doc.contract.length) out.push('', 'CONTRATO DE ENTREGA E AUTOAVALIAÇÃO (confira antes de responder)', ...doc.contract.map((c) => `- [ ] ${c}`));
  return { text: out.join('\n'), stats: { chapters: doc.chapters.length, topics: topicsTotal, contexts: doc.contexts.length, fields: fields.length,
    templated: [...doc.fields.values()].reduce((n, m) => n + [...m.values()].reduce((a, b) => a + b, 0), 0), contract: doc.contract.length } };
}

const source = fs.readFileSync(SRC, 'utf8');
const { text, stats } = compile(parse(source));
const header = `// GERADO por scripts/compile-design.js a partir de docs/design/DESIGN.md — não edite à mão.\n`;
fs.writeFileSync(OUT, `${header}module.exports = ${JSON.stringify({ DESIGN_MD: text, STATS: { ...stats, sourceChars: source.length, compiledChars: text.length } }, null, 1)};\n`);
console.log(JSON.stringify({ ...stats, sourceChars: source.length, compiledChars: text.length }));
