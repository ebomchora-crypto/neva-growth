// Resumo do período: modal no meio da tela com uma arte (1080 × 1350) pronta para compartilhar, baixar ou copiar.
// Os números são os do painel (vendas pagas do período). A arte é desenhada num <canvas>, então o PNG baixado é exatamente o que aparece.
import { h, toast, icon } from './ui.js';

const W = 1080, H = 1350;
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
  // fundo: azul-noite com brilho gelo (identidade Neva)
  const bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0a1d33'); bg.addColorStop(0.55, '#0f2f55'); bg.addColorStop(1, '#14497f'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W * 0.85, H * 0.05, 10, W * 0.85, H * 0.05, 620); glow.addColorStop(0, 'rgba(127,180,224,.45)'); glow.addColorStop(1, 'rgba(127,180,224,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(170,207,238,.22)'; c.lineWidth = 2; rr(c, 40, 40, W - 80, H - 80, 44); c.stroke();
  // marca
  const px = 96; c.fillStyle = '#7fb4e0'; rr(c, px, 100, 72, 72, 22); c.fill(); c.fillStyle = '#0a1d33'; c.font = `800 44px ${F}`; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('N', px + 36, 138); c.textAlign = 'left';
  c.fillStyle = '#fff'; c.font = `800 34px ${F}`; c.fillText('NEVA GROWTH', px + 94, 124); c.fillStyle = '#aacfee'; c.font = `600 20px ${F}`; c.fillText('REGISTRO DE RESULTADO', px + 94, 156);
  const tag = LABEL[period] || period; c.font = `700 22px ${F}`; const tw = c.measureText(tag).width + 44; c.fillStyle = 'rgba(170,207,238,.16)'; rr(c, W - 96 - tw, 112, tw, 52, 26); c.fill(); c.fillStyle = '#d3e6f6'; c.textAlign = 'center'; c.fillText(tag, W - 96 - tw / 2, 139); c.textAlign = 'left';
  // título
  c.fillStyle = '#7fb4e0'; c.font = `700 22px ${F}`; c.fillText('EXECUÇÃO VIROU RESULTADO', px, 250);
  c.fillStyle = '#fff'; c.font = `800 74px ${F}`; wrap(c, `${firstName(name)}, resultado em movimento.`, W - 2 * px).slice(0, 2).forEach((l, i) => c.fillText(l, px, 330 + i * 84));
  // lucro
  c.fillStyle = '#aacfee'; c.font = `700 22px ${F}`; c.fillText('LUCRO CONSTRUÍDO', px, 548);
  let size = 128; const value = brl(m.profit); do { c.font = `800 ${size}px ${F}`; size -= 4; } while (c.measureText(value).width > W - 2 * px - 190 && size > 56);
  c.fillStyle = '#fff'; c.fillText(value, px, 628);
  const vw = c.measureText(value).width; const delta = m.profitVariation === null ? 'novo' : `${Math.abs(m.profitVariation).toLocaleString('pt-BR')}%`; const up = (m.profitVariation ?? 1) >= 0;
  c.font = `700 24px ${F}`; const dw = c.measureText(delta).width + 64; const dx = Math.min(px + vw + 24, W - px - dw); c.fillStyle = up ? 'rgba(127,214,170,.18)' : 'rgba(240,138,144,.2)'; rr(c, dx, 590, dw, 54, 27); c.fill();
  c.fillStyle = up ? '#8fe0b5' : '#f6a3a8'; c.fillText((up ? '↗ ' : '↘ ') + delta, dx + 24, 618);
  // gráfico
  const gx = px, gy = 700, gw = W - 2 * px, gh = 250; c.fillStyle = 'rgba(8,26,46,.45)'; rr(c, gx, gy, gw, gh, 30); c.fill(); c.strokeStyle = 'rgba(170,207,238,.18)'; c.lineWidth = 2; rr(c, gx, gy, gw, gh, 30); c.stroke();
  c.fillStyle = '#aacfee'; c.font = `700 18px ${F}`; c.fillText('TRAÇO DE EXECUÇÃO', gx + 28, gy + 40); c.textAlign = 'right'; c.fillText(`${m.sales} ${m.sales === 1 ? 'FECHAMENTO' : 'FECHAMENTOS'}`, gx + gw - 28, gy + 40); c.textAlign = 'left';
  const ser = m.series.length ? m.series : [{ revenue: 0, profit: 0 }]; const max = Math.max(1, ...ser.map((s) => s.revenue)); const ix = gx + 34, iw = gw - 68, iy = gy + 70, ih = gh - 110;
  const X = (i) => ix + (ser.length > 1 ? (iw * i) / (ser.length - 1) : iw / 2), Y = (v) => iy + ih * (1 - v / max);
  const area = c.createLinearGradient(0, iy, 0, iy + ih); area.addColorStop(0, 'rgba(127,180,224,.5)'); area.addColorStop(1, 'rgba(127,180,224,0)');
  if (ser.length > 1) { c.beginPath(); ser.forEach((s, i) => (i ? c.lineTo(X(i), Y(s.revenue)) : c.moveTo(X(i), Y(s.revenue)))); c.lineTo(X(ser.length - 1), iy + ih); c.lineTo(X(0), iy + ih); c.closePath(); c.fillStyle = area; c.fill();
    c.beginPath(); ser.forEach((s, i) => (i ? c.lineTo(X(i), Y(s.revenue)) : c.moveTo(X(i), Y(s.revenue)))); c.strokeStyle = '#d3e6f6'; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke(); }
  ser.forEach((s, i) => { if (ser.length <= 14 || i === ser.length - 1) { c.beginPath(); c.arc(X(i), Y(s.revenue), 7, 0, 7); c.fillStyle = '#fff'; c.fill(); } });
  // números
  const bx = px, by = 990, bw = (W - 2 * px - 40) / 3; [['FATURAMENTO', compact(m.revenue)], ['TICKET MÉDIO', compact(m.ticket)], ['VENDAS', String(m.sales).padStart(2, '0')]].forEach(([l, v], i) => {
    const x = bx + i * (bw + 20); c.fillStyle = 'rgba(8,26,46,.45)'; rr(c, x, by, bw, 130, 26); c.fill(); c.strokeStyle = 'rgba(170,207,238,.18)'; rr(c, x, by, bw, 130, 26); c.stroke();
    c.fillStyle = '#aacfee'; c.font = `700 17px ${F}`; c.fillText(l, x + 24, by + 38); c.fillStyle = '#fff'; c.font = `800 40px ${F}`; c.fillText(v, x + 24, by + 92); });
  // projeto destaque
  c.fillStyle = 'rgba(127,180,224,.2)'; rr(c, px, 1136, W - 2 * px, 92, 26); c.fill(); c.fillStyle = '#aacfee'; c.font = `700 17px ${F}`; c.fillText('PROJETO DESTAQUE', px + 26, 1166);
  c.fillStyle = '#fff'; c.font = `700 30px ${F}`; let top = m.top ? m.top.description : 'Registre vendas pagas para destacar um projeto'; while (c.measureText(top).width > W - 2 * px - 60 && top.length > 4) top = top.slice(0, -2); if (top !== (m.top ? m.top.description : top)) top += '…'; c.fillText(top, px + 26, 1204);
  // rodapé
  c.fillStyle = '#7fb4e0'; c.font = `700 16px ${F}`; c.fillText('PERFORMANCE DE', px, 1258); c.fillStyle = '#fff'; c.font = `700 26px ${F}`; c.fillText(firstName(name), px, 1288);
  c.textAlign = 'right'; c.fillStyle = '#7fb4e0'; c.font = `700 16px ${F}`; c.fillText('PERÍODO', W - px, 1258); c.fillStyle = '#fff'; c.font = `700 22px ${F}`; c.fillText(`${dmy(m.range.start)} — ${dmy(m.range.end)}`, W - px, 1288); c.textAlign = 'left';
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
  drawArt(canvas, data); (document.fonts?.ready || Promise.resolve()).then(() => !closed && drawArt(canvas, data));
  requestAnimationFrame(() => { back.classList.add('in'); card.querySelector('.sm-main')?.focus(); });
  return { close };
}
