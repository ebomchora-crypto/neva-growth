// Anexos do pedido do site: o texto de cada arquivo é extraído NO NAVEGADOR e vai junto com o pedido; imagens são reduzidas e
// seguem para o servidor, que pede a um modelo com visão para descrevê-las (se nenhum modelo da chave enxergar, o servidor avisa).
// Tipos: texto (txt, md, csv, json, html, xml, css, js), Word (.docx), PDF e imagens (png, jpg, webp).
export const LIMITS = { files: 5, bytes: 10 * 1024 * 1024, textPerFile: 40000, textTotal: 100000, images: 6, imageSide: 1600 };
import { h, toast } from './ui.js';
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
    const draw = (side, png) => {
      const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86);
    };
    // PNG (logos com fundo transparente) continua PNG enquanto couber; fotos viram JPEG.
    if (file.type === 'image/png' || /\.png$/i.test(file.name)) { const png = draw(1200, true); if (png.length < 1.5e6) return png; }
    let out = draw(LIMITS.imageSide, false); if (out.length > 1.7e6) out = draw(1200, false);
    return out;
  } finally { URL.revokeObjectURL(url); }
}

/** Lê um arquivo e devolve { name, size, kind: 'text'|'image', text? , dataUrl? } ou lança Error com a razão em português. */
export async function readAttachment(file) {
  if (file.size > LIMITS.bytes) throw new Error(`"${file.name}" tem ${pretty(file.size)}; o máximo é ${pretty(LIMITS.bytes)}.`);
  const base = { name: file.name, size: file.size };
  try {
    if (IMG_EXT.test(file.name) || file.type.startsWith('image/')) return { ...base, kind: 'image', dataUrl: await shrink(file), logo: /logo|marca|brand/i.test(file.name) };
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

/**
 * Botão de anexar + chips + leitura, para qualquer campo de pedido (criador e Studio).
 * Imagens são enviadas na hora (`upload(dataUrl, name) => { url }`) e ficam com a URL guardada; texto/PDF/Word ficam em memória.
 */
export function attachControls({ disabled = false, upload, onChange = () => {}, label = true } = {}) {
  let files = [];
  const chips = h('div', { class: 'ap-files', hidden: true });
  const picker = h('input', { type: 'file', multiple: true, accept: ACCEPT, style: 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none', tabindex: '-1', 'aria-hidden': 'true' });
  const clip = () => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('class', 'ap-ico'); s.innerHTML = '<path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.9-8.9a3.7 3.7 0 015.2 5.2l-8.9 8.9a1.8 1.8 0 01-2.6-2.6l8.2-8.2"/>'; return s; };
  const button = h('button', { type: 'button', class: 'ap-ghost ap-attach', 'aria-label': 'Anexar fotos e arquivos', title: 'Anexar fotos, logo, textos, Word ou PDF', disabled }, clip(), label && h('span', { class: 'ap-attach-t' }, 'Anexar'));
  const draw = () => {
    chips.hidden = !files.length;
    chips.replaceChildren(...files.map((f, i) => h('span', { class: 'ap-file' + (f.kind === 'image' ? ' img' : '') + (f.busy ? ' busy' : '') }, f.kind === 'image' ? h('img', { src: f.dataUrl, alt: '' }) : h('i', { 'aria-hidden': 'true' }, 'DOC'),
      h('b', { title: f.name }, f.name), h('small', f.busy ? 'enviando…' : sizeLabel(f.size)), h('button', { type: 'button', 'aria-label': `Remover ${f.name}`, onclick: () => { files.splice(i, 1); draw(); onChange(); } }, '×'))));
  };
  const take = async (list) => {
    for (const file of [...list]) {
      if (files.length >= LIMITS.files) { toast(`No máximo ${LIMITS.files} arquivos por pedido.`, 'err'); break; }
      const isImg = file.type.startsWith('image/') || IMG_EXT.test(file.name);
      if (isImg && files.filter((f) => f.kind === 'image').length >= LIMITS.images) { toast(`No máximo ${LIMITS.images} imagens por pedido.`, 'err'); continue; }
      button.classList.add('busy');
      try {
        const item = await readAttachment(file);
        if (item.kind === 'image') {
          item.busy = true; files.push(item); draw();
          try { const up = await upload(item.dataUrl, item.name); item.url = up.url; item.busy = false; } catch (e) { files.splice(files.indexOf(item), 1); throw e; }
        } else files.push(item);
        draw(); onChange();
      } catch (e) { toast(e.message || 'Não consegui anexar.', 'err'); draw(); }
    }
    button.classList.remove('busy'); picker.value = '';
  };
  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => take(picker.files));
  return {
    button, chips, picker, take, draw,
    get files() { return files; },
    ready: () => !files.some((f) => f.busy),
    assets: () => files.filter((f) => f.kind === 'image' && f.url).map((f) => ({ url: f.url, name: f.name, kind: f.logo ? 'logo' : 'photo' })),
    clear() { files = []; draw(); onChange(); },
  };
}
