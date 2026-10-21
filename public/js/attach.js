// Anexos do pedido do site: o texto de cada arquivo é extraído NO NAVEGADOR e vai junto com o pedido; imagens são reduzidas e
// seguem para o servidor, que pede a um modelo com visão para descrevê-las (se nenhum modelo da chave enxergar, o servidor avisa).
// Tipos: texto (txt, md, csv, json, html, xml, css, js), Word (.docx), PDF e imagens (png, jpg, webp).
export const LIMITS = { files: 5, bytes: 10 * 1024 * 1024, textPerFile: 40000, textTotal: 100000, images: 3, imageSide: 1100 };
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|html?|xml|css|js|ts|yml|yaml|svg|rtf|log)$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i;
export const ACCEPT = '.txt,.md,.csv,.tsv,.json,.html,.htm,.xml,.css,.js,.yml,.yaml,.docx,.pdf,.png,.jpg,.jpeg,.webp,.gif,image/*';

const pretty = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
export const sizeLabel = pretty;

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** Texto de um .docx: abre o zip, lê word/document.xml e junta os parágrafos. */
async function docxText(buffer) {
  const view = new DataView(buffer); const bytes = new Uint8Array(buffer);
  let end = -1; for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 70000); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('zip');
  const count = view.getUint16(end + 10, true); let p = view.getUint32(end + 16, true);
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true), csize = view.getUint32(p + 20, true), nameLen = view.getUint16(p + 28, true), extra = view.getUint16(p + 30, true), comment = view.getUint16(p + 32, true), offset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === 'word/document.xml') {
      const lh = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
      const data = bytes.subarray(lh, lh + csize); const raw = method === 0 ? data : await inflateRaw(data);
      const xml = new TextDecoder().decode(raw);
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + nameLen + extra + comment;
  }
  throw new Error('docx');
}
let pdfjs = null;
async function pdfText(buffer) {
  if (!pdfjs) {
    pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise; const out = [];
  for (let i = 1; i <= Math.min(doc.numPages, 40); i++) { const page = await doc.getPage(i); const c = await page.getTextContent(); out.push(c.items.map((x) => x.str + (x.hasEOL ? '\n' : '')).join(' ')); }
  return out.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();
}
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = url; });
    const k = Math.min(1, LIMITS.imageSide / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

/** Lê um arquivo e devolve { name, size, kind: 'text'|'image', text? , dataUrl? } ou lança Error com a razão em português. */
export async function readAttachment(file) {
  if (file.size > LIMITS.bytes) throw new Error(`"${file.name}" tem ${pretty(file.size)}; o máximo é ${pretty(LIMITS.bytes)}.`);
  const base = { name: file.name, size: file.size };
  try {
    if (IMG_EXT.test(file.name) || file.type.startsWith('image/')) return { ...base, kind: 'image', dataUrl: await shrink(file) };
    if (/\.docx$/i.test(file.name)) return { ...base, kind: 'text', text: await docxText(await file.arrayBuffer()) };
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      const text = await pdfText(await file.arrayBuffer());
      if (!text) throw new Error(`"${file.name}" parece um PDF escaneado (só imagem), sem texto para ler. Envie as páginas como imagem.`);
      return { ...base, kind: 'text', text };
    }
    if (TEXT_EXT.test(file.name) || file.type.startsWith('text/')) return { ...base, kind: 'text', text: await file.text() };
  } catch (e) {
    if (e.message?.includes('PDF escaneado')) throw e;
    throw new Error(`Não consegui ler "${file.name}".`);
  }
  throw new Error(`"${file.name}": tipo de arquivo não suportado. Use texto, Word, PDF ou imagem.`);
}

/** Junta o pedido e o texto dos anexos no formato que o planejador lê. */
export function composeDetails(text, files) {
  const docs = files.filter((f) => f.kind === 'text' && f.text?.trim()); let room = LIMITS.textTotal;
  if (!docs.length) return text;
  const blocks = docs.map((f) => { const t = f.text.trim().slice(0, Math.min(LIMITS.textPerFile, Math.max(0, room))); room -= t.length; return `### Arquivo anexado: ${f.name}\n${t}${f.text.trim().length > t.length ? '\n[... conteúdo cortado por tamanho]' : ''}`; });
  return `${text}\n\n=== MATERIAL ANEXADO PELO CLIENTE (use como fonte: nomes, textos, preços, dados e instruções) ===\n${blocks.join('\n\n')}`;
}
