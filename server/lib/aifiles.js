// Extrai arquivos de uma resposta de IA: blocos de código marcados com "FILE: caminho" na 1ª linha do bloco
// ou na linha logo antes dele (alguns modelos fazem assim). O que não é arquivo vira o texto da resposta.
const FILE_IN = /^\s*(?:<!--|\/\/|\/\*|#)\s*FILE:\s*([^\s>*]+)\s*(?:-->|\*\/)?\s*\n/;
const FILE_BEFORE = /(?:^|\n)\s*(?:<!--|\/\/|\/\*|#)?\s*\**FILE:\s*`?([^\s>*`]+)`?\s*\**\s*(?:-->|\*\/)?\s*$/;

function extractFiles(text) {
  const re = /```[\w-]*\n([\s\S]*?)```/g; const files = []; let prose = ''; let last = 0; let m;
  while ((m = re.exec(text))) {
    let before = text.slice(last, m.index); let body = m[1]; let path = null;
    const fm = body.match(FILE_IN);
    if (fm) { path = fm[1]; body = body.replace(FILE_IN, ''); }
    else { const pm = before.match(FILE_BEFORE); if (pm) { path = pm[1]; before = before.slice(0, pm.index); } }
    prose += before;
    if (path) files.push({ path, content: body.replace(/\n$/, '') + '\n' }); else prose += '```\n' + m[1] + '```';
    last = re.lastIndex;
  }
  prose += text.slice(last);
  return { files, prose: prose.replace(/\n{3,}/g, '\n\n').trim() };
}
module.exports = { extractFiles };
