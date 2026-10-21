// Resumo do período: modal no meio da tela com uma arte (1080 × 1350) pronta para compartilhar, baixar ou copiar.
// Os números são os do painel (vendas pagas do período). A arte é desenhada num <canvas>, então o PNG baixado é exatamente o que aparece.
import { h, toast, icon } from './ui.js';

const W = 1080, H = 1350;
// Logo oficial usada na arte: carrega uma vez; a arte é redesenhada quando ela chega.
const LOGO = { img: null, ready: new Promise((res) => { const i = new Image(); i.onload = () => { LOGO.img = i; res(); }; i.onerror = res; i.src = '/img/logo.png'; }) };
const brl = (v) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
const compact = (v) => { const a = Math.abs(v || 0); if (a >= 1e9) return 'R$ ' + (v / 1e9).toFixed(1).replace('.', ',') + ' bi'; if (a >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mi'; if (a >= 1e4) return 'R$ ' + (v / 1e3).toFixed(0) + ' mil'; return brl(v); };
const dmy = (iso) => { const [y, m, d] = String(iso).split('-'); const mm = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]; return `${d} de ${mm}. de ${y}`; };
const LABEL = { hoje: 'Hoje', '7d': '7 dias', '1m': '1 mês', '3m': '3 meses', '6m': '6 meses', '1a': '1 ano' };
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'Você';

function summaryText({ name, m, period }) {
  const trend = m.profitVariation === null ? 'primeiro período com vendas' : `${m.profitVariation >= 0 ? '+' : ''}${m.profitVariation.toLocaleString('pt-BR')}% sobre o período anterior`;
  return [`${firstName(name)}, meu resultado na Neva Growth (${LABEL[period] || period}):`, '',
    `Lucro construído: ${brl(m.profit)} (${trend})`, `Faturamento: ${brl(m.revenue)}`, `Ticket médio: ${brl(m.ticket)}`, `Vendas: ${m.sales}`,
    m.top ? `Projeto destaque: ${m.top.description} (${brl(m.top.amount)})` : null, `Período: ${dmy(m.range.start)} a ${dmy(m.range.end)}`].filter((x) => x !== null).join('\n');
}

function wrap(ctx, text, max) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function rr(ctx, x, y, w, hgt, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r); ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

export function drawArt(canvas, { name, m, period }) {
  canvas.width = W; canvas.height = H; const c = canvas.getContext('2d');
  const F = 'Inter, "Segoe UI", system-ui, sans-serif';
  const INK = '#0e2a47', MUT = '#4a7aa8', BLUE = '#2f7bbd', px = 96;
  const card = (x, y, w, hh, r, a = 0.78) => { c.save(); c.shadowColor = 'rgba(30,90,160,.18)'; c.shadowBlur = 36; c.shadowOffsetY = 12; c.fillStyle = `rgba(255,255,255,${a})`; rr(c, x, y, w, hh, r); c.fill(); c.restore(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2; rr(c, x, y, w, hh, r); c.stroke(); };
  // fundo: céu azul-gelo com grade de pontos e uma esfera (a mesma do Builder)
  const bg = c.createLinearGradient(0, 0, W * 0.6, H); bg.addColorStop(0, '#f4faff'); bg.addColorStop(0.42, '#cfe7fb'); bg.addColorStop(1, '#7fb9e8'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(47,123,189,.16)'; for (let y = 30; y < H; y += 30) for (let x = 30; x < W; x += 30) { const d = Math.hypot(x - W * 0.78, y - 250) / 640; const r = Math.max(0, 4.2 - d * 4.6); if (r > 0.4) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
  const ox = W - 210, oy = 232, or = 128; const orb = c.createRadialGradient(ox - 40, oy - 46, 8, ox, oy, or); orb.addColorStop(0, '#ffffff'); orb.addColorStop(0.26, '#cfe9ff'); orb.addColorStop(0.7, '#4a95d2'); orb.addColorStop(1, '#1d5fa8');
  c.save(); c.shadowColor = 'rgba(30,90,160,.45)'; c.shadowBlur = 50; c.shadowOffsetY = 18; c.fillStyle = orb; c.beginPath(); c.arc(ox, oy, or, 0, 7); c.fill(); c.restore();
  c.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 46; k++) { const a = k * 2.399963, y = 1 - (2 * (k + 0.5)) / 46, rr0 = Math.sqrt(1 - y * y), z = Math.sin(a) * rr0; if (z < -0.1) continue; c.globalAlpha = 0.35 + z * 0.6; c.beginPath(); c.arc(ox + Math.cos(a) * rr0 * or * 0.9, oy + y * or * 0.9, 3 + z * 5, 0, 7); c.fill(); } c.globalAlpha = 1;
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; rr(c, 40, 40, W - 80, H - 80, 44); c.stroke();
  // marca: logo oficial (sem o quadrado azul antigo) + nome
  const lg = 132; c.save(); c.shadowColor = 'rgba(30,90,160,.35)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
  if (LOGO.img) c.drawImage(LOGO.img, px - 18, 74, lg, lg); c.restore();
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = INK; c.font = `800 38px ${F}`; c.fillText('Neva Growth', px + lg - 10, 128); c.fillStyle = MUT; c.font = `700 19px ${F}`; c.fillText('REGISTRO DE RESULTADO', px + lg - 8, 164);
  const tag = LABEL[period] || period; c.font = `700 22px ${F}`; const tw = c.measureText(tag).width + 44; c.fillStyle = 'rgba(255,255,255,.75)'; rr(c, px, 300, tw, 52, 26); c.fill(); c.fillStyle = BLUE; c.fillText(tag.toUpperCase(), px + 22, 327);
  // título
  c.fillStyle = BLUE; c.font = `700 22px ${F}`; c.fillText('EXECUÇÃO VIROU RESULTADO', px, 408);
  c.fillStyle = INK; c.font = `800 72px ${F}`; wrap(c, `${firstName(name)}, resultado em movimento.`, W - 2 * px).slice(0, 2).forEach((l, i) => c.fillText(l, px, 478 + i * 80));
  // lucro
  c.fillStyle = MUT; c.font = `700 22px ${F}`; c.fillText('LUCRO CONSTRUÍDO', px, 640);
  let size = 128; const value = brl(m.profit); do { c.font = `800 ${size}px ${F}`; size -= 4; } while (c.measureText(value).width > W - 2 * px - 190 && size > 56);
  const vg = c.createLinearGradient(px, 0, px + 600, 0); vg.addColorStop(0, INK); vg.addColorStop(1, BLUE); c.fillStyle = vg; c.fillText(value, px, 772);
  const vw = c.measureText(value).width; const delta = m.profitVariation === null ? 'novo' : `${Math.abs(m.profitVariation).toLocaleString('pt-BR')}%`; const up = (m.profitVariation ?? 1) >= 0;
  c.font = `800 26px ${F}`; const dw = c.measureText((up ? '↗ ' : '↘ ') + delta).width + 48; const dx = Math.min(px + vw + 24, W - px - dw); c.fillStyle = up ? 'rgba(31,157,107,.16)' : 'rgba(209,67,75,.14)'; rr(c, dx, 706, dw, 56, 28); c.fill();
  c.fillStyle = up ? '#17855a' : '#c23a42'; c.fillText((up ? '↗ ' : '↘ ') + delta, dx + 24, 735);
  // gráfico
  const gx = px, gy = 838, gw = W - 2 * px, gh = 236; card(gx, gy, gw, gh, 30);
  c.fillStyle = MUT; c.font = `700 18px ${F}`; c.fillText('TRAÇO DE EXECUÇÃO', gx + 28, gy + 38); c.textAlign = 'right'; c.fillText(`${m.sales} ${m.sales === 1 ? 'FECHAMENTO' : 'FECHAMENTOS'}`, gx + gw - 28, gy + 38); c.textAlign = 'left';
  if (!m.sales) { c.strokeStyle = 'rgba(47,123,189,.35)'; c.lineWidth = 3; c.setLineDash([10, 12]); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(gx + 40, gy + 88 + k * 52); c.lineTo(gx + gw - 40, gy + 88 + k * 52); c.stroke(); } c.setLineDash([]); c.fillStyle = MUT; c.font = `700 26px ${F}`; c.textAlign = 'center'; c.fillText('Seus fechamentos aparecem aqui', gx + gw / 2, gy + 150); c.textAlign = 'left'; }
  const ser = m.series.length ? m.series : [{ revenue: 0, profit: 0 }]; const max = Math.max(1, ...ser.map((s) => s.revenue)); const ix = gx + 40, iw = gw - 80, iy = gy + 72, ih = gh - 104;
  const X = (i) => ix + (ser.length > 1 ? (iw * i) / (ser.length - 1) : iw / 2), Y = (v) => iy + ih * (1 - v / max);
  const area = c.createLinearGradient(0, iy, 0, iy + ih); area.addColorStop(0, 'rgba(74,149,210,.45)'); area.addColorStop(1, 'rgba(74,149,210,0)');
  if (ser.length > 1) { c.beginPath(); ser.forEach((s, i) => (i ? c.lineTo(X(i), Y(s.revenue)) : c.moveTo(X(i), Y(s.revenue)))); c.lineTo(X(ser.length - 1), iy + ih); c.lineTo(X(0), iy + ih); c.closePath(); c.fillStyle = area; c.fill();
    c.beginPath(); ser.forEach((s, i) => (i ? c.lineTo(X(i), Y(s.revenue)) : c.moveTo(X(i), Y(s.revenue)))); c.strokeStyle = BLUE; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke(); }
  ser.forEach((s, i) => { const last = i === ser.length - 1; if (m.sales && (ser.length <= 14 || last)) { c.beginPath(); c.arc(X(i), Y(s.revenue), last ? 11 : 7, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = last ? 6 : 4; c.strokeStyle = BLUE; c.stroke(); } });
  // números
  const bx = px, by = 1092, bw = (W - 2 * px - 40) / 3; [['FATURAMENTO', compact(m.revenue)], ['TICKET MÉDIO', compact(m.ticket)], ['VENDAS', String(m.sales).padStart(2, '0')]].forEach(([l, v], i) => {
    const x = bx + i * (bw + 20); card(x, by, bw, 120, 26); c.fillStyle = MUT; c.font = `700 17px ${F}`; c.fillText(l, x + 24, by + 36); c.fillStyle = INK; c.font = `800 40px ${F}`; c.fillText(v, x + 24, by + 86); });
  // projeto destaque
  const pg = c.createLinearGradient(px, 0, W - px, 0); pg.addColorStop(0, '#2f7bbd'); pg.addColorStop(1, '#4a95d2'); c.fillStyle = pg; rr(c, px, 1230, W - 2 * px, 76, 26); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = `700 15px ${F}`; c.fillText('PROJETO DESTAQUE', px + 26, 1256); c.fillStyle = '#fff'; c.font = `700 28px ${F}`;
  let top = m.top ? m.top.description : 'Registre vendas pagas para destacar um projeto'; while (c.measureText(top).width > W - 2 * px - 60 && top.length > 4) top = top.slice(0, -2); if (top !== (m.top ? m.top.description : 'Registre vendas pagas para destacar um projeto')) top += '…'; c.fillText(top, px + 26, 1288);
  // rodapé
  c.fillStyle = MUT; c.font = `700 15px ${F}`; c.fillText(firstName(name).toUpperCase() + ' · NEVA GROWTH', px, 1342 - 6);
  c.textAlign = 'right'; c.fillText(`${dmy(m.range.start)} — ${dmy(m.range.end)}`, W - px, 1342 - 6); c.textAlign = 'left';
}

export function openSummary({ name, metrics, period }) {
  const data = { name, m: metrics, period }; const text = summaryText(data);
  const canvas = h('canvas', { class: 'sm-art', role: 'img', 'aria-label': `Arte do resultado: lucro de ${brl(metrics.profit)} no período` });
  const back = h('div', { class: 'sm-back' }); let closed = false;
  const close = () => { if (closed) return; closed = true; document.removeEventListener('keydown', esc); document.body.classList.remove('fs-open'); back.classList.add('out'); setTimeout(() => back.remove(), 200); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const png = () => new Promise((res) => canvas.toBlob(res, 'image/png'));
  const copyText = async () => { try { await navigator.clipboard.writeText(text); toast('Texto copiado.', 'ok'); } catch { const t = h('textarea', { style: 'position:fixed;opacity:0' }, text); document.body.append(t); t.select(); const ok = document.execCommand?.('copy'); t.remove(); toast(ok ? 'Texto copiado.' : 'Não consegui copiar neste navegador.', ok ? 'ok' : 'err'); } };
  const download = async () => { const b = await png(); const a = h('a', { href: URL.createObjectURL(b), download: `resultado-neva-${metrics.range.end}.png` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('PNG baixado.', 'ok'); };
  const share = async () => {
    try {
      const file = new File([await png()], 'resultado-neva.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    await copyText(); toast('Seu navegador não abre o compartilhamento: copiei o texto. Use "Baixar PNG" para a arte.', 'ok');
  };
  const whats = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  const card = h('section', { class: 'sm-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sm-title' },
    h('button', { type: 'button', class: 'sm-x', 'aria-label': 'Fechar', onclick: close }, icon('x')),
    h('div', { class: 'sm-left' }, canvas, h('small', 'Arte pronta para Stories e feed · 1080 × 1350 px')),
    h('div', { class: 'sm-right' },
      h('div', { class: 'sm-brand' }, h('img', { src: '/img/logo.png', alt: '', width: 64, height: 64, decoding: 'async' }), h('b', 'Neva Growth')),
      h('small', { class: 'sm-k' }, h('i'), 'SEU RESUMO ESTÁ PRONTO'),
      h('h2', { id: 'sm-title' }, 'Seu resultado.', h('br'), h('span', 'Pronto para mostrar.')),
      h('p', 'Uma arte com os números do período, pronta para compartilhar ou salvar.'),
      h('div', { class: 'sm-period' }, icon('trend'), h('div', h('small', 'PERÍODO SELECIONADO'), h('b', `${LABEL[period] || period} · ${dmy(metrics.range.start)} — ${dmy(metrics.range.end)}`))),
      h('button', { type: 'button', class: 'sm-main', onclick: share }, icon('arrow'), 'Compartilhar resultado'),
      h('div', { class: 'sm-row' },
        h('button', { type: 'button', onclick: whats }, icon('message'), 'WhatsApp'),
        h('button', { type: 'button', onclick: download }, icon('download'), 'Baixar PNG'),
        h('button', { type: 'button', onclick: copyText }, icon('copy'), 'Copiar texto')),
      h('button', { type: 'button', class: 'sm-back-btn', onclick: close }, 'Voltar para o painel')));
  back.append(card); back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc); document.body.append(back); document.body.classList.add('fs-open');
  drawArt(canvas, data); Promise.all([document.fonts?.ready, LOGO.ready]).then(() => !closed && drawArt(canvas, data));
  requestAnimationFrame(() => { back.classList.add('in'); card.scrollTop = 0; card.querySelector('.sm-main')?.focus({ preventScroll: true }); });
  return { close };
}
