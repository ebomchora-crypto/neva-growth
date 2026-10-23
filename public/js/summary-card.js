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
  const px = 84, inner = W - 2 * px;
  const rrect = (x, y, w, hh, r) => rr(c, x, y, w, hh, r);
  const glass = (x, y, w, hh, r, a = 0.09) => { c.save(); c.shadowColor = 'rgba(0,10,30,.35)'; c.shadowBlur = 40; c.shadowOffsetY = 16; c.fillStyle = `rgba(255,255,255,${a})`; rrect(x, y, w, hh, r); c.fill(); c.restore(); c.strokeStyle = 'rgba(190,225,255,.22)'; c.lineWidth = 2; rrect(x, y, w, hh, r); c.stroke(); };
  const text = (t, x, y, font, color, align = 'left') => { c.font = font; c.fillStyle = color; c.textAlign = align; c.fillText(t, x, y); c.textAlign = 'left'; };

  // fundo: azul-noite com brilhos suaves e grade de pontos que some nas bordas
  const bg = c.createLinearGradient(0, 0, W * 0.7, H); bg.addColorStop(0, '#0a2342'); bg.addColorStop(0.55, '#0f3a68'); bg.addColorStop(1, '#0b2a50'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const glow = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); };
  glow(W * 0.88, 140, 560, 'rgba(110,180,240,.42)'); glow(40, H * 0.72, 620, 'rgba(47,123,189,.38)'); glow(W * 0.5, H + 60, 520, 'rgba(127,190,245,.22)');
  c.fillStyle = 'rgba(190,225,255,.10)'; for (let y = 34; y < H; y += 36) for (let x = 34; x < W; x += 36) { const d = Math.hypot(x - W * 0.85, y - 180) / 900; const r = Math.max(0, 3.2 - d * 3.4); if (r > 0.35) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
  c.strokeStyle = 'rgba(190,225,255,.20)'; c.lineWidth = 2; rrect(36, 36, W - 72, H - 72, 48); c.stroke();

  // marca (logo oficial) + período
  c.textBaseline = 'middle';
  const lg = 118; if (LOGO.img) { c.save(); c.shadowColor = 'rgba(120,190,255,.55)'; c.shadowBlur = 36; c.drawImage(LOGO.img, px - 14, 84, lg, lg); c.restore(); }
  text('Neva Growth', px + lg - 4, 128, `800 40px ${F}`, '#ffffff'); text('REGISTRO DE RESULTADO', px + lg - 2, 168, `700 19px ${F}`, '#9fcdf5');
  const tag = (LABEL[period] || period).toUpperCase(); c.font = `800 22px ${F}`; const tw = c.measureText(tag).width + 52;
  c.fillStyle = 'rgba(255,255,255,.12)'; rrect(W - px - tw, 110, tw, 56, 28); c.fill(); c.strokeStyle = 'rgba(190,225,255,.35)'; c.lineWidth = 2; rrect(W - px - tw, 110, tw, 56, 28); c.stroke(); text(tag, W - px - tw / 2, 139, `800 22px ${F}`, '#d9ecff', 'center');

  // título
  text('EXECUÇÃO VIROU RESULTADO', px, 292, `800 23px ${F}`, '#7fb4e0');
  c.font = `800 76px ${F}`; c.fillStyle = '#ffffff'; wrap(c, `${firstName(name)}, resultado em movimento.`, inner).slice(0, 2).forEach((l, i) => c.fillText(l, px, 368 + i * 84));

  // lucro: número grande em degradê claro, com a variação ao lado
  text('LUCRO CONSTRUÍDO', px, 560, `800 23px ${F}`, '#9fcdf5');
  const value = brl(m.profit); let size = 168; do { c.font = `800 ${size}px ${F}`; size -= 4; } while (c.measureText(value).width > inner - 230 && size > 70);
  const vg = c.createLinearGradient(px, 0, px + 720, 0); vg.addColorStop(0, '#ffffff'); vg.addColorStop(1, '#a9d4fb'); c.fillStyle = vg; c.fillText(value, px, 660);
  const vw = c.measureText(value).width; const up = (m.profitVariation ?? 1) >= 0; const delta = m.profitVariation === null ? 'NOVO' : `${Math.abs(m.profitVariation).toLocaleString('pt-BR')}%`;
  const dtxt = (m.profitVariation === null ? '✦ ' : up ? '↗ ' : '↘ ') + delta; c.font = `800 30px ${F}`; const dw = c.measureText(dtxt).width + 52; const dx = Math.min(px + vw + 28, W - px - dw);
  c.fillStyle = up ? 'rgba(80,220,160,.18)' : 'rgba(255,110,120,.20)'; rrect(dx, 614, dw, 62, 31); c.fill(); text(dtxt, dx + 26, 646, `800 30px ${F}`, up ? '#7ff0c0' : '#ff9aa2');

  // gráfico: eixos, grade, área em degradê e valor do último ponto
  const gx = px, gy = 732, gw = inner, gh = 318; glass(gx, gy, gw, gh, 36);
  text('TRAÇO DE EXECUÇÃO', gx + 36, gy + 46, `800 19px ${F}`, '#9fcdf5'); text(`${m.sales} ${m.sales === 1 ? 'FECHAMENTO' : 'FECHAMENTOS'}`, gx + gw - 36, gy + 46, `800 19px ${F}`, '#9fcdf5', 'right');
  const ser = m.series.length ? m.series : [{ revenue: 0, label: '' }]; const max = Math.max(1, ...ser.map((q) => q.revenue));
  const ix = gx + 120, iw = gw - 120 - 44, iy = gy + 92, ih = gh - 92 - 62;
  c.strokeStyle = 'rgba(190,225,255,.16)'; c.lineWidth = 2; c.setLineDash([3, 10]); [0, 0.5, 1].forEach((t) => { const y = iy + ih * t; c.beginPath(); c.moveTo(ix, y); c.lineTo(ix + iw, y); c.stroke(); text(compact(max * (1 - t)).replace('R$ ', ''), ix - 18, y, `700 20px ${F}`, '#8fbfe8', 'right'); }); c.setLineDash([]);
  const X = (i) => ix + (ser.length > 1 ? (iw * i) / (ser.length - 1) : iw / 2), Y = (v) => iy + ih * (1 - v / max);
  const pts = ser.map((q, i) => [X(i), Y(q.revenue)]);
  if (m.sales && ser.length > 1) {
    const path = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
    const ar = c.createLinearGradient(0, iy, 0, iy + ih); ar.addColorStop(0, 'rgba(130,200,255,.50)'); ar.addColorStop(1, 'rgba(130,200,255,0)');
    path(); c.lineTo(pts[pts.length - 1][0], iy + ih); c.lineTo(pts[0][0], iy + ih); c.closePath(); c.fillStyle = ar; c.fill();
    path(); c.strokeStyle = '#bfe3ff'; c.lineWidth = 7; c.lineJoin = 'round'; c.lineCap = 'round'; c.shadowColor = 'rgba(140,205,255,.7)'; c.shadowBlur = 18; c.stroke(); c.shadowBlur = 0;
    const peak = ser.reduce((bi, q, i) => (q.revenue > ser[bi].revenue ? i : bi), 0); const [lx, ly] = pts[peak];
    c.beginPath(); c.arc(lx, ly, 15, 0, 7); c.fillStyle = '#0f3a68'; c.fill(); c.lineWidth = 7; c.strokeStyle = '#ffffff'; c.stroke();
    const tip = compact(ser[peak].revenue); c.font = `800 24px ${F}`; const tpw = c.measureText(tip).width + 36, tx = Math.min(Math.max(lx - tpw / 2, ix - 20), ix + iw - tpw + 40), ty = Math.max(ly - 70, gy + 62);
    c.fillStyle = '#ffffff'; rrect(tx, ty, tpw, 46, 23); c.fill(); text(tip, tx + tpw / 2, ty + 24, `800 24px ${F}`, '#0f3a68', 'center');
  } else {
    c.strokeStyle = 'rgba(190,225,255,.30)'; c.lineWidth = 5; c.setLineDash([2, 14]); c.lineCap = 'round'; c.beginPath(); c.moveTo(ix, iy + ih * 0.7); c.lineTo(ix + iw, iy + ih * 0.7); c.stroke(); c.setLineDash([]);
    text('Seus fechamentos aparecem aqui', ix + iw / 2, iy + ih * 0.35, `700 28px ${F}`, '#bfe0fb', 'center');
  }
  if (ser.length > 1) { text(ser[0].label || '', ix, gy + gh - 30, `700 20px ${F}`, '#8fbfe8'); text(ser[ser.length - 1].label || '', ix + iw, gy + gh - 30, `700 20px ${F}`, '#8fbfe8', 'right'); }

  // números
  const by = 1080, gap = 22, bw = (inner - 2 * gap) / 3;
  [['FATURAMENTO', compact(m.revenue)], ['TICKET MÉDIO', compact(m.ticket)], ['VENDAS', String(m.sales).padStart(2, '0')]].forEach(([l, v], i) => {
    const x = px + i * (bw + gap); glass(x, by, bw, 128, 30, 0.10);
    text(l, x + 28, by + 40, `800 18px ${F}`, '#9fcdf5'); let f = 46; do { c.font = `800 ${f}px ${F}`; f -= 2; } while (c.measureText(v).width > bw - 56 && f > 24); text(v, x + 28, by + 92, c.font, '#ffffff');
  });
  // projeto destaque
  const pg = c.createLinearGradient(px, 0, W - px, 0); pg.addColorStop(0, '#3b8fd6'); pg.addColorStop(1, '#6db4ee'); c.fillStyle = pg; rrect(px, 1232, inner, 82, 28); c.fill();
  text('PROJETO DESTAQUE', px + 30, 1258, `800 16px ${F}`, 'rgba(255,255,255,.82)');
  const fallback = 'Registre vendas pagas para destacar um projeto'; let top = m.top ? m.top.description : fallback; c.font = `800 30px ${F}`; while (c.measureText(top).width > inner - 150 && top.length > 4) top = top.slice(0, -2);
  if (top !== (m.top ? m.top.description : fallback)) top += '…'; text(top, px + 30, 1292, `800 30px ${F}`, '#ffffff'); if (m.top) text(compact(m.top.amount), W - px - 30, 1274, `800 30px ${F}`, '#ffffff', 'right');
  // rodapé
  text(`${firstName(name).toUpperCase()} · NEVA GROWTH`, px, 1336, `700 17px ${F}`, '#8fbfe8'); text(`${dmy(m.range.start)} — ${dmy(m.range.end)}`, W - px, 1336, `700 17px ${F}`, '#8fbfe8', 'right');
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
