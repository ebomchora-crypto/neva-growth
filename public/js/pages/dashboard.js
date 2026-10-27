// Dashboard em blocos: os mesmos 4 cards de antes (lucro no período, carteira com vendas recentes, chamada para a próxima venda
// e lucro por período), no arranjo e com os gráficos do "Finance Bento" (21st.dev, de vasnev.art): fluxo de lucro e custo,
// cápsulas por período, cartões de vidro. Fonte do app (Inter) e azuis da Neva.
import { api } from '../api.js';
import { h, mount, toast, fail, dt, heroArt } from '../ui.js';
import { openSummary } from '../summary-card.js';
import { openInsight } from '../insight.js';
import { tiltCard } from '../tilt-card.js';

const PERIODS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['1m', '1 mês'], ['3m', '3 meses'], ['6m', '6 meses'], ['1a', '1 ano']];
const SINCE = { hoje: 'hoje', '7d': 'nos últimos 7 dias', '1m': 'no último mês', '3m': 'em 3 meses', '6m': 'em 6 meses', '1a': 'em 12 meses' };
const ease = (t) => 1 - Math.pow(1 - t, 3);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Interpolação cúbica monótona (Fritsch–Carlson): suave, mas nunca ultrapassa os valores dos pontos vizinhos.
function monotone(xs, ys, step = 3) {
  const n = xs.length; if (n < 2) return xs.map((x, i) => [x, ys[i]]);
  const d = []; for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]]; for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; } const a = m[i] / d[i]; const b = m[i + 1] / d[i]; const h2 = a * a + b * b; if (h2 > 9) { const t = 3 / Math.sqrt(h2); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[i]; const x1 = xs[i + 1]; const hh = x1 - x0; const steps = Math.max(2, Math.ceil(hh / step));
    for (let k = 0; k < steps; k++) { const t = k / steps; const t2 = t * t; const t3 = t2 * t;
      out.push([x0 + t * hh, (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hh * m[i + 1]]); }
  }
  out.push([xs[n - 1], ys[n - 1]]);
  return out;
}

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let period = (() => { try { return sessionStorage.getItem('dashPeriod') || '6m'; } catch { return '6m'; } })();
    if (!PERIODS.some(([k]) => k === period)) period = '6m';
    let currency = 'BRL'; let rates = null; let data = null; let alive = true;
    const aiOn = (await api.get('/integrations/status').catch(() => null))?.ai?.configured;

    // moeda: os dados ficam em BRL; USD/EUR só para exibir (cotação do BCE via frankfurter)
    const rate = () => (currency === 'BRL' ? 1 : rates?.[currency] || 1);
    const money = (v, { compact = false } = {}) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: compact ? 1 : 2, ...(compact ? { notation: 'compact' } : {}) }).format((Number(v) || 0) * rate());
    const axisMoney = (v) => money(v, { compact: true }).replace(/^(R\$|US\$|€)\s?/, '');

    const frames = new Set();
    const RAF = (cb) => { if (!alive) return 0; const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) cb(t); }); frames.add(id); return id; };
    const stopRaf = (id) => { cancelAnimationFrame(id); frames.delete(id); };
    const tween = (node, to, fmt, dur = 900) => { const from = Number(node.dataset.v) || 0; const t0 = performance.now(); node.dataset.v = to; const f = (now) => { const t = reduce ? 1 : Math.min(1, (now - t0) / dur); node.textContent = fmt(from + (to - from) * ease(t)); if (t < 1) RAF(f); }; f(t0); };

    // ---- tooltip
    const tip = h('div', { class: 'nb-tip', role: 'tooltip' });
    function showTip(x, y, title, rows) {
      tip.innerHTML = `<div class="t">${esc(title)}</div>` + rows.map(([k, v, c]) => `<div class="r"><span>${c ? `<i style="background:${c}"></i>` : ''}${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
      tip.classList.add('on'); const r = tip.getBoundingClientRect(); let L = x + 16; let T = y - r.height - 14;
      if (L + r.width > innerWidth - 8) L = x - r.width - 16; if (T < 8) T = y + 16; tip.style.left = L + 'px'; tip.style.top = T + 'px';
    }
    const hideTip = () => tip.classList.remove('on');

    // ---- topo: título, período, moeda e ações
    const seg = (items, value, onPick, label) => {
      const el = h('div', { class: 'nb-seg', role: 'group', 'aria-label': label }, items.map(([v, l]) => h('button', { type: 'button', 'data-v': v, 'aria-pressed': String(v === value), onclick: (e) => onPick(v, e.currentTarget) }, l)));
      return el;
    };
    const press = (host, b) => host.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const periodSeg = seg(PERIODS, period, async (v, b) => { if (v === period) return; period = v; press(periodSeg, b); try { sessionStorage.setItem('dashPeriod', v); } catch { /* ok */ } await load().catch(fail); }, 'Período');
    const ccySeg = seg([['BRL', 'BRL'], ['USD', 'USD'], ['EUR', 'EUR']], currency, async (v, b) => {
      if (v === currency) return;
      if (v !== 'BRL' && !rates) {
        try { const r = await fetch('https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD,EUR'); if (!r.ok) throw new Error(); const q = await r.json(); if (!q.rates?.USD || !q.rates?.EUR) throw new Error(); rates = { ...q.rates, date: q.date }; }
        catch { toast('Não foi possível obter a cotação agora.', 'err'); return; }
      }
      currency = v; press(ccySeg, b); if (data) drawAll(false);
    }, 'Moeda');
    const asof = h('span', { class: 'nb-asof' });
    const top = h('div', { class: 'nb-top' },
      h('div', { class: 'nb-head' }, h('h1', 'Visão geral'), asof),
      h('div', { class: 'nb-ctrls' }, periodSeg, ccySeg),
      h('div', { class: 'nb-acts' },
        h('button', { type: 'button', class: 'nb-btn', title: 'Abre a arte do seu resultado, pronta para compartilhar', onclick: () => data && openSummary({ name: ctx.user.name, metrics: data.metrics, period }) }, 'Resumo do período'),
        aiOn && h('button', { type: 'button', class: 'nb-btn', title: 'Resumo escrito por IA com base nos números do período', onclick: () => openInsight({ period, load: () => api.post('/dashboard/summary', { period }) }) }, 'Texto com IA')));

    // ================= card 1: Lucro no período (fluxo de lucro e custo) =================
    const profit = h('section', { class: 'nb-card nb-blue nb-profit', 'aria-label': 'Lucro no período' });
    profit.innerHTML = `<div class="nb-g"></div><i class="nb-glow" aria-hidden="true"></i><i class="nb-sheen" aria-hidden="true"></i><i class="nb-frame" aria-hidden="true"></i><div class="nb-in">
      <div class="nb-row nb-sb"><div class="nb-ttl">Lucro no período</div><div class="nb-legend"><span><i style="background:#fff"></i>Lucro</span><span><i style="background:#a9d6ff"></i>Custo</span></div></div>
      <div class="nb-row nb-num"><span class="nb-big dash-money pv">R$ 0</span><span class="nb-chip pd"></span></div>
      <div class="nb-cap pc"></div>
      <svg class="nb-stream" aria-hidden="true"></svg></div><div class="nb-rim"></div>`;
    let grow = 1; let growRaf = 0;
    function drawStream() {
      const m = data.metrics; const svg = profit.querySelector('.nb-stream'); const W = profit.clientWidth; if (W < 40) return; /* card oculto ou ainda sem largura */ const Hh = 210; const topY = 26; const bot = 26; const mid = topY + (Hh - topY - bot) / 2; const half = (Hh - topY - bot) / 2;
      svg.setAttribute('width', W); svg.setAttribute('height', Hh); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
      const S = m.series.length > 1 ? m.series : [m.series[0], m.series[0]]; const n = S.length; const mx = Math.max(0, ...S.map((p) => p.revenue));
      // todos os períodos dentro do card (o último não pode sair pela borda direita); a esquerda continua sumindo no degradê
      const L = 14; const R = W - 34; const X = (i) => L + (i / (n - 1)) * (R - L); const g = ease(grow);
      // espessura = receita do período (com um mínimo, para o fluxo nunca sumir); a parte branca é o lucro, o resto é custo
      const lay = S.map((p) => { const t = (mx > 0 ? (p.revenue > 0 ? 0.14 + 0.86 * (p.revenue / mx) : 0.04) : 0.04) * half * g; return { r: t, p: p.revenue > 0 ? t * (Math.max(0, p.profit) / p.revenue) : 0 }; });
      // interpolação monótona (sem passar do valor real entre dois meses, ao contrário da curva anterior)
      const band = (k) => { const pts = monotone([...S.map((_, i) => X(i)), W + 12], [...lay.map((l) => l[k]), lay[n - 1][k]]); return 'M' + pts.map(([x, t]) => `${x.toFixed(1)},${(mid - t).toFixed(1)}`).join('L') + 'L' + pts.reverse().map(([x, t]) => `${x.toFixed(1)},${(mid + t).toFixed(1)}`).join('L') + 'Z'; };
      // marcadores nos períodos de maior lucro (nunca num mês vazio), afastados entre si
      const want = W < 520 ? 2 : 3; const gap = W < 520 ? 110 : 150; const marks = [];
      for (const i of S.map((_, i) => i).filter((i) => S[i].profit > 0 || S[i].revenue > 0).sort((a, b) => S[b].profit - S[a].profit)) { if (marks.length >= want) break; if (marks.every((j) => Math.abs(X(j) - X(i)) >= gap)) marks.push(i); }
      const empty = !marks.length; // período sem vendas pagas: nenhum marcador (seria só "R$ 0"), e uma frase no lugar
      marks.sort((a, b) => a - b);
      svg.innerHTML = `<defs><linearGradient id="nbsf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff" stop-opacity="1"/><stop offset="${(R / W).toFixed(3)}" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="nbsm"><rect width="${W}" height="${Hh}" fill="url(#nbsf)"/></mask></defs>
        <g mask="url(#nbsm)"><path d="${band('r')}" fill="#a9d6ff" opacity=".95"/><path d="${band('p')}" fill="#fff" opacity=".96"/></g>
        ${marks.map((i, k) => { const x = X(i); const lx = Math.min(W - 44, Math.max(44, x)); return `<g style="opacity:${g > 0.6 ? 1 : 0};transition:opacity .4s ${k * 0.08}s">
          <line x1="${x}" x2="${x}" y1="${topY - 4}" y2="${Hh - bot + 4}" stroke="rgba(4,20,40,.45)" stroke-width="1.5"/>
          <rect x="${lx - 40}" y="${topY - 14}" width="80" height="22" rx="11" fill="#06182d"/><text x="${lx}" y="${topY + 1}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff">${esc(money(S[i].profit, { compact: true }))}</text>
          <rect x="${lx - 32}" y="${Hh - bot - 8}" width="64" height="22" rx="11" fill="#06182d"/><text x="${lx}" y="${Hh - bot + 7}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.75)">${esc(S[i].label)}</text></g>`; }).join('')}
        ${empty ? `<text x="${W / 2}" y="${mid - 18}" text-anchor="middle" font-size="12.5" font-weight="600" fill="rgba(255,255,255,.82)">Sem vendas pagas neste período</text>` : ''}
        <line class="hl" y1="${topY}" y2="${Hh - bot}" stroke="#fff" stroke-width="1.5" opacity="0"/><rect width="${W}" height="${Hh}" fill="transparent" class="hit"/>`;
      const hit = svg.querySelector('.hit'); const hl = svg.querySelector('.hl');
      hit.onpointermove = (e) => { const r = svg.getBoundingClientRect(); const z = r.width / W; const x = (e.clientX - r.left) / z; const i = Math.max(0, Math.min(n - 1, Math.round(((x - L) / (R - L)) * (n - 1)))); const p = S[i];
        hl.setAttribute('x1', X(i)); hl.setAttribute('x2', X(i)); hl.setAttribute('opacity', 1);
        showTip(r.left + X(i) * z, r.top + (mid - lay[i].r) * z, p.label, [['Lucro', money(p.profit), '#fff'], ['Custo', money(p.revenue - p.profit), '#a9d6ff'], ['Receita', money(p.revenue)]]); };
      hit.onpointerleave = () => { hl.setAttribute('opacity', 0); hideTip(); };
    }
    function drawProfit(animate) {
      const m = data.metrics; const v = m.profitVariation;
      const pv = profit.querySelector('.pv'); pv.dataset.base = m.profit; tween(pv, m.profit, (x) => money(x), animate ? 900 : 1);
      const pd = profit.querySelector('.pd'); pd.textContent = v === null ? 'novo' : `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toLocaleString('pt-BR')}%`; pd.classList.toggle('down', v !== null && v < 0);
      pd.title = v === null ? 'Sem lucro no período anterior para comparar' : 'Comparado ao período anterior';
      profit.querySelector('.pc').innerHTML = `Receita <b class="dash-money">${esc(money(m.revenue))}</b> · ${m.sales} ${m.sales === 1 ? 'venda paga' : 'vendas pagas'} · ticket médio <b class="dash-money">${esc(money(m.ticket))}</b>`;
      stopRaf(growRaf);
      if (!animate || reduce) { grow = 1; drawStream(); return; }
      const t0 = performance.now(); grow = 0; const f = (now) => { grow = Math.min(1, (now - t0) / 1100); drawStream(); if (grow < 1) growRaf = RAF(f); }; growRaf = RAF(f);
    }

    // ================= card 2: Minha carteira + vendas recentes =================
    const wallet = h('section', { class: 'nb-card nb-glass nb-wallet', 'aria-label': 'Minha carteira' });
    function drawWallet() {
      const m = data.metrics; const w = data.wallet; const v = m.profitVariation;
      mount(wallet, h('div', { class: 'nb-in nb-flow' },
        h('div', { class: 'nb-row nb-sb' }, h('div', { class: 'nb-ttl' }, 'Minha carteira'), canWrite && h('a', { class: 'nb-pill', href: '#/vendas' }, '+ Nova venda')),
        h('div', { class: 'cardstack' },
          h('div', { class: 'cardvis' }, h('span', { class: 'chipic' }), h('span', { class: 'mk' }, h('i', { class: 'logo' }, h('img', { src: '/img/logo-128.png', alt: '', width: 128, height: 128 }))),
            h('div', h('small', 'Lucro estimado'), h('div', { class: 'row', style: 'gap:10px' }, h('b', { class: 'dash-money' }, money(w.profitTotal)), v !== null && h('span', { class: 'nb-chip' + (v < 0 ? ' down' : '') }, `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toLocaleString('pt-BR')}%`)),
              h('small', { class: 'rc' }, 'Receita ', h('span', { class: 'dash-money' }, money(w.revenueTotal)), w.pending ? [' · a receber ', h('span', { class: 'dash-money' }, money(w.pending))] : '')))),
        canWrite && h('div', { class: 'nb-two' }, h('a', { class: 'nb-wbtn dark', href: '#/clientes' }, '↙ Cliente'), h('a', { class: 'nb-wbtn', href: '#/vendas' }, '↗ Venda')),
        h('div', { class: 'nb-row nb-sb', style: 'margin-top:4px' }, h('div', { class: 'nb-sub' }, 'Vendas recentes'), h('a', { class: 'nb-link', href: '#/vendas' }, 'Ver todas')),
        data.recentSales.length ? h('ul', { class: 'nb-list' }, data.recentSales.map((s) => h('li',
          h('span', { class: 'nb-av', 'aria-hidden': 'true' }, (s.client_name || s.description || 'V').slice(0, 2).toUpperCase()),
          h('span', { class: 'nb-li' }, h('strong', s.description), h('small', [s.client_name, s.sold_at ? dt(s.sold_at) : ''].filter(Boolean).join(' · ') + (s.status === 'pago' ? '' : ' · pendente'))),
          h('b', { class: 'dash-money' }, money(s.amount)))))
          : h('div', { class: 'nb-empty' }, h('b', 'Nenhuma venda registrada'), h('span', 'Seus resultados aparecerão aqui.'), canWrite && h('a', { class: 'nb-pill', href: '#/vendas' }, 'Registrar primeira venda'))));
      const card = wallet.querySelector('.cardvis'); if (card) tiltCard(card, { max: 10 });
    }

    // ================= card 3: chamada para a próxima venda =================
    const promo = h('section', { class: 'nb-card promo nb-promo', 'aria-label': 'Próxima venda' });
    function drawPromo() {
      const k = data.kpis;
      mount(promo, h('h2', 'Sua próxima venda começa agora.'), h('p', `${k.openLeads} ${k.openLeads === 1 ? 'empresa esperando' : 'empresas esperando'} seu próximo movimento.`),
        canWrite && h('a', { class: 'plus', href: '#/leads', title: 'Nova oportunidade no CRM', 'aria-label': 'Nova oportunidade no CRM' }, '+'),
        heroArt('dashboard'),
        canWrite && h('a', { class: 'bigwhite', href: '#/clientes' }, 'Registrar cliente'),
        h('i', { class: 'nb-glow', 'aria-hidden': 'true' }), h('i', { class: 'nb-sheen', 'aria-hidden': 'true' }), h('i', { class: 'nb-frame', 'aria-hidden': 'true' }), h('div', { class: 'nb-rim' }));
    }

    // ================= card 4: Lucro por período (cápsulas) =================
    const bars = h('section', { class: 'nb-card nb-glass nb-bars', 'aria-label': 'Lucro por período' });
    bars.innerHTML = `<div class="nb-in"><div class="nb-row nb-sb" style="align-items:flex-start"><div><div class="nb-ttl">Lucro por período</div>
      <div class="nb-row" style="margin-top:8px;gap:10px"><span class="nb-mid dash-money bv">R$ 0</span><span class="nb-chip light bd"></span></div></div><span class="bsel"></span></div>
      <svg class="nb-caps" aria-hidden="true"></svg></div>`;
    const monthsSel = h('select', { class: 'nb-select', 'aria-label': 'Período do gráfico', onchange: async (e) => { period = e.target.value; press(periodSeg, periodSeg.querySelector(`[data-v="${period}"]`)); try { sessionStorage.setItem('dashPeriod', period); } catch { /* ok */ } await load().catch(fail); } });
    bars.querySelector('.bsel').append(monthsSel);
    function drawBars(animate) {
      const m = data.metrics; const v = m.profitVariation;
      const opts = [['3m', '3 meses'], ['6m', '6 meses'], ['1a', '12 meses']]; if (!opts.some(([k]) => k === period)) opts.unshift([period, PERIODS.find(([k]) => k === period)[1]]);
      mount(monthsSel, opts.map(([k, l]) => h('option', { value: k, selected: k === period }, l)));
      const bv = bars.querySelector('.bv'); bv.dataset.base = m.profit; tween(bv, m.profit, (x) => money(x), animate ? 900 : 1);
      const bd = bars.querySelector('.bd'); bd.textContent = v === null ? 'novo' : `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toLocaleString('pt-BR')}%`; bd.classList.toggle('down', v !== null && v < 0);
      // mais de 12 períodos: soma os vizinhos (assim nenhuma venda some do gráfico)
      const size = Math.ceil(m.series.length / 12);
      const P = size > 1 ? Array.from({ length: Math.ceil(m.series.length / size) }, (_, i) => { const part = m.series.slice(i * size, i * size + size); return { label: part[0].label, full: part.length > 1 ? `${part[0].label} a ${part.at(-1).label}` : part[0].label, profit: part.reduce((a, x) => a + x.profit, 0), revenue: part.reduce((a, x) => a + x.revenue, 0) }; }) : m.series.map((s) => ({ ...s, full: s.label }));
      const svg = bars.querySelector('.nb-caps'); const W = Math.max(200, bars.clientWidth - 40); const Hh = 190; const pb = 20; const axis = 34; const n = P.length;
      const slot = (W - axis) / n; const bw = Math.max(8, Math.min(24, slot * 0.58)); const max = Math.max(1, ...P.map((p) => Math.max(0, p.profit)));
      svg.setAttribute('width', W); svg.setAttribute('height', Hh); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
      const Y = (x) => (Hh - pb) * (1 - x / max); const every = Math.ceil(n / 8); let s = '';
      [0, 0.5, 1].forEach((f) => { s += `<text x="0" y="${Math.max(10, Y(max * f) + 3.5)}" font-size="10" class="ax">${esc(f ? axisMoney(max * f) : '0')}</text>`; });
      P.forEach((p, i) => { const X = axis + i * slot + (slot - bw) / 2; const last = i === n - 1; const val = Math.max(0, p.profit); const yv = val > 0 ? Math.min(Y(val), Hh - pb - bw) : Hh - pb;
        s += `<rect x="${X}" y="0" width="${bw}" height="${Hh - pb}" rx="${bw / 2}" class="trk"/>
          <rect class="cap${last ? ' cur' : ''}" x="${X}" y="${animate && !reduce ? Hh - pb : yv}" width="${bw}" height="${animate && !reduce ? 0 : Hh - pb - yv}" rx="${bw / 2}" data-y="${yv}" data-h="${Hh - pb - yv}" style="transition:y .8s cubic-bezier(.32,.72,0,1) ${i * 50}ms,height .8s cubic-bezier(.32,.72,0,1) ${i * 50}ms"/>
          ${i % every === 0 || last ? `<text x="${X + bw / 2}" y="${Hh - 4}" text-anchor="middle" font-size="10" class="lb${last ? ' cur' : ''}">${esc(p.label)}</text>` : ''}
          <rect class="hit" x="${axis + i * slot}" y="0" width="${slot}" height="${Hh}" fill="transparent" data-i="${i}"/>`; });
      svg.innerHTML = `<defs><linearGradient id="nbcap" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5aa3dc"/><stop offset="1" stop-color="#2f6fb8"/></linearGradient><linearGradient id="nbcap2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2f7bbd"/><stop offset="1" stop-color="#0f3a66"/></linearGradient></defs>` + s;
      if (animate && !reduce) RAF(() => RAF(() => svg.querySelectorAll('.cap').forEach((b) => { b.setAttribute('y', b.dataset.y); b.setAttribute('height', b.dataset.h); })));
      svg.querySelectorAll('.hit').forEach((hb) => { hb.onpointermove = (e) => { const p = P[Number(hb.dataset.i)]; showTip(e.clientX, e.clientY, p.full, [['Lucro', money(p.profit), '#2f7bbd'], ['Receita', money(p.revenue)]]); }; hb.onpointerleave = hideTip; });
    }

    // luz suave que acompanha o mouse nos cards azuis (como nos banners das páginas)
    [profit, promo].forEach((card) => {
      card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', `${e.clientX - r.left}px`); card.style.setProperty('--my', `${e.clientY - r.top}px`); card.classList.add('lit'); });
      card.addEventListener('pointerleave', () => card.classList.remove('lit'));
    });

    // ---- montagem
    const grid = h('div', { class: 'nb-grid' }, profit, wallet, promo, bars);
    const root = h('div', { class: 'nb' }, top, grid, tip);
    function drawAll(animate) {
      asof.textContent = `Atualizado hoje, ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${currency !== 'BRL' && rates ? ` · cotação BCE ${dt(rates.date)}` : ''}`;
      drawProfit(animate); drawWallet(); drawPromo(); drawBars(animate);
    }
    async function load() { data = await api.get('/dashboard', { period }); if (alive) drawAll(true); }
    mount(box, root);
    let rz = 0; const ro = new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if (data && alive) { drawStream(); drawBars(false); } }, 120); });
    ro.observe(profit); ro.observe(bars);
    await load();
    [...grid.children].forEach((c, i) => { c.style.transitionDelay = i * 70 + 'ms'; });
    RAF(() => grid.classList.add('in'));
    return () => { alive = false; frames.forEach((f) => cancelAnimationFrame(f)); ro.disconnect(); clearTimeout(rz); hideTip(); };
  }
};
