// Dashboard em blocos (porte do "Finance Bento" do 21st.dev, de vasnev.art), em JS puro e com os dados reais do Neva Growth:
// receita e lucro, funil do CRM, a receber, vendas recentes, progresso, receita × custo, melhores clientes e dias da semana.
// Gráficos em SVG desenhados à mão; cores trocadas para os azuis da Neva.
import { api } from '../api.js';
import { h, mount, toast, fail, dt } from '../ui.js';
import { openSummary } from '../summary-card.js';
import { openInsight } from '../insight.js';

const PERIODS = [['hoje', 'Hoje'], ['7d', '7d'], ['1m', '1m'], ['3m', '3m'], ['6m', '6m'], ['1a', '1a']];
const SINCE = { hoje: 'hoje', '7d': 'nos últimos 7 dias', '1m': 'no último mês', '3m': 'em 3 meses', '6m': 'em 6 meses', '1a': 'em 12 meses' };
const ACC = '#5AD2F4'; const T2 = 'rgba(255,255,255,.58)'; const T3 = 'rgba(255,255,255,.4)'; const HAIR = 'rgba(255,255,255,.14)';
const COL = { profit: '#FFFFFF', cost: '#9FD3FF', won: '#FFFFFF', open: '#8FB8FF', lost: 'rgba(255,255,255,.28)' };
// Degradês de cada bloco (no original: azul, grafite, lima, rosa, cobre e verde), todos na família de azuis da Neva
const GR = {
  blue: { top: '#9fd0ff', base: '#2f6fd0', bottom: '#5a9fe6', core: '#04101f' },
  graph: { top: '#9aa9bb', base: '#273445', bottom: '#425366', core: '#05080d' },
  ice: { top: '#c9f1ff', base: '#1b9ad0', bottom: '#5cc4ea', core: '#032334' },
  indigo: { top: '#c3c8ff', base: '#3a49cf', bottom: '#6b78ee', core: '#070a2e' },
  teal: { top: '#a8eef0', base: '#16879c', bottom: '#47b3c3', core: '#03181d' },
  royal: { top: '#a9c4ff', base: '#1b4aa3', bottom: '#4874cc', core: '#040c22' },
};
const NS = 'http://www.w3.org/2000/svg';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ease = (t) => 1 - Math.pow(1 - t, 3);
const WEEK = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
const WEEK_FULL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function smoothPath(P, move = true) {
  let d = (move ? 'M' : 'L') + `${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i]; const p1 = P[i]; const p2 = P[i + 1]; const p3 = P[i + 2] || p2; const k = 0.17;
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const polar = (r, a) => [r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180)];
const bgOf = ({ top, base, bottom, core }) => `<div class="fb-g" style="background:linear-gradient(180deg,${top} 0%,${base} 36%,${base} 74%,${bottom} 100%)"></div><div class="fb-core" style="background:${core}"></div>`;

// Número em matriz de pontos (como no original), com R, U, S e ponto para o formato brasileiro (R$ 12.345)
const GLYPH = { 0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], 2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], 3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'], 4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], 6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], 8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'], '€': ['00111', '01000', '11110', '01000', '11110', '01000', '00111'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  '.': ['0', '0', '0', '0', '0', '0', '1'], ',': ['0', '0', '0', '0', '0', '1', '1'], '-': ['000', '000', '000', '111', '000', '000', '000'], ' ': ['00', '00', '00', '00', '00', '00', '00'] };

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    if (!document.getElementById('geist-fonts')) document.head.append(h('link', { id: 'geist-fonts', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@200;300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap' }));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let period = (() => { try { return sessionStorage.getItem('dashPeriod') || '6m'; } catch { return '6m'; } })();
    if (!PERIODS.some(([k]) => k === period)) period = '6m';
    let currency = 'BRL'; let rates = null; let data = null; let alive = true;
    const aiOn = (await api.get('/integrations/status').catch(() => null))?.ai?.configured;

    // ---- moeda: dados sempre em BRL; USD/EUR só para exibir, com a cotação do BCE (frankfurter)
    const rate = () => (currency === 'BRL' ? 1 : rates?.[currency] || 1);
    const sym = () => ({ BRL: 'R$', USD: 'US$', EUR: '€' })[currency];
    const money = (v, { dec = 0, compact = false } = {}) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: dec, minimumFractionDigits: dec, ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}) }).format((Number(v) || 0) * rate());

    const axisMoney = (v) => money(v, { compact: true }).replace(/^(R\$|US\$|€)\s?/, '');

    // ---- quadros e observadores (tudo é cancelado ao sair da página)
    const frames = new Set();
    const RAF = (cb) => { if (!alive) return 0; const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) cb(t); }); frames.add(id); return id; };
    const tween = (node, to, fmt, dur = 900) => { const from = Number(node.dataset.v) || 0; const t0 = performance.now(); node.dataset.v = to; const f = (now) => { const t = reduce ? 1 : Math.min(1, (now - t0) / dur); node.textContent = fmt(from + (to - from) * ease(t)); if (t < 1) RAF(f); }; f(t0); };

    // ---- estrutura
    const root = h('div', { class: 'fpb' });
    const userName = String(ctx.user.name || '').trim();
    const initials = userName.split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || 'N';
    root.innerHTML = `<div class="fb-c">
      <div class="fb-top">
        <h1>Visão geral<span class="fb-asof"></span></h1>
        <div class="fb-ctrls"><div class="fb-seg" data-k="period" role="group" aria-label="Período"></div><div class="fb-seg" data-k="ccy" role="group" aria-label="Moeda"></div></div>
        <div class="fb-acts"></div>
        <span class="fb-ava" title="${esc(userName)}" aria-hidden="true">${esc(initials)}</span>
      </div>
      <div class="fb-grid">
        <section class="fb-card fb-h1" data-id="nw" aria-label="Receita"></section>
        <section class="fb-card fb-h1" data-id="alloc" aria-label="Funil de vendas"></section>
        <section class="fb-card fb-h2 fb-kpi" data-id="ret" aria-label="Lucro"></section>
        <section class="fb-card fb-glass fb-h2 fb-kpi" data-id="cash" aria-label="A receber"></section>
        <section class="fb-card fb-glass fb-h2 fb-kpi" data-id="pay" aria-label="Vendas recentes"></section>
        <section class="fb-card fb-glass fb-h2 fb-kpi" data-id="goals" aria-label="Progresso"></section>
        <section class="fb-card fb-h3" data-id="flow" aria-label="Receita e custo"></section>
        <section class="fb-card fb-h3" data-id="crypto" aria-label="Melhores clientes"></section>
        <section class="fb-card fb-h3" data-id="stocks" aria-label="Dias da semana"></section>
      </div>
    </div><div class="fb-tip" role="tooltip"></div>`;
    const $ = (id) => root.querySelector(`[data-id="${id}"]`);
    const tip = root.querySelector('.fb-tip');
    function showTip(x, y, title, rows) {
      tip.innerHTML = `<div class="t">${esc(title)}</div>` + rows.map(([k, v, c]) => `<div class="r"><span>${c ? `<i style="background:${c}"></i>` : ''}${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
      tip.classList.add('on'); const r = tip.getBoundingClientRect(); let L = x + 16; let T = y - r.height - 14;
      if (L + r.width > innerWidth - 8) L = x - r.width - 16; if (T < 8) T = y + 16; tip.style.left = L + 'px'; tip.style.top = T + 'px';
    }
    const hideTip = () => tip.classList.remove('on');

    // ---- topo: período, moeda, ações
    function seg(k, items, value, onPick) {
      const host = root.querySelector(`.fb-seg[data-k="${k}"]`);
      host.innerHTML = items.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === value}">${l}</button>`).join('');
      host.querySelectorAll('button').forEach((b) => { b.onclick = () => onPick(b.dataset.v, b); });
      return host;
    }
    const press = (host, b) => host.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const periodSeg = seg('period', PERIODS, period, async (v, b) => { if (v === period) return; period = v; press(periodSeg, b); try { sessionStorage.setItem('dashPeriod', v); } catch { /* ok */ } await load().catch(fail); });
    const ccySeg = seg('ccy', [['BRL', 'BRL'], ['USD', 'USD'], ['EUR', 'EUR']], currency, async (v, b) => {
      if (v === currency) return;
      if (v !== 'BRL' && !rates) {
        try { const r = await fetch('https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD,EUR'); if (!r.ok) throw new Error(); const q = await r.json(); if (!q.rates?.USD || !q.rates?.EUR) throw new Error(); rates = { ...q.rates, date: q.date }; }
        catch { toast('Não foi possível obter a cotação agora.', 'err'); return; }
      }
      currency = v; press(ccySeg, b); if (data) updateAll(false);
    });
    mount(root.querySelector('.fb-acts'),
      h('button', { type: 'button', class: 'fb-btn', title: 'Abre a arte do seu resultado, pronta para compartilhar', onclick: () => data && openSummary({ name: ctx.user.name, metrics: data.metrics, period }) }, 'Resumo do período'),
      aiOn && h('button', { type: 'button', class: 'fb-btn', title: 'Resumo escrito por IA com base nos números do período', onclick: () => openInsight({ period, load: () => api.post('/dashboard/summary', { period }) }) }, 'Texto com IA'),
      canWrite && h('a', { class: 'fb-btn solid', href: '#/vendas' }, '+ Nova venda'));

    // =============== blocos ===============

    // ---- Receita: fluxo de lucro (branco) e custo (azul claro) crescendo a partir da linha do meio
    const nw = $('nw');
    nw.innerHTML = `${bgOf(GR.blue)}<div class="fb-in">
      <div class="fb-row fb-hrow" style="justify-content:space-between"><div class="fb-ttl">Receita</div>
        <div class="fb-legend"><span><i style="background:${COL.profit}"></i>Lucro</span><span><i style="background:${COL.cost}"></i>Custo</span></div></div>
      <div class="fb-row fb-nrow" style="margin-top:16px;align-items:flex-end;gap:16px"><div class="nwn"></div>
        <div style="padding-bottom:6px"><div class="fb-delta nwd"></div><div class="fb-muted nwc" style="margin-top:3px"></div></div></div>
      <svg class="nws" style="position:absolute;left:0;right:0;bottom:0;display:block" aria-hidden="true"></svg></div><div class="fb-rim"></div>`;
    const dots = (() => {
      const host = nw.querySelector('.nwn'); const pitch = innerWidth < 520 ? 4.6 : 6.4; const cols = 76; const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'fb-dots'); svg.setAttribute('aria-hidden', 'true'); host.append(svg);
      const cells = [];
      for (let c = 0; c < cols; c++) for (let r = 0; r < 7; r++) { const ci = document.createElementNS(NS, 'circle'); ci.setAttribute('cx', c * pitch + pitch / 2); ci.setAttribute('cy', r * pitch + pitch / 2); ci.setAttribute('r', pitch * 0.36); ci.setAttribute('fill', '#fff'); ci.setAttribute('opacity', 0); ci.style.transitionDelay = c * 6 + 'ms'; svg.append(ci); cells.push([c, r, ci]); }
      const set = (t) => {
        const on = new Set(); let x = 0;
        for (const ch of t) { const g = GLYPH[ch] || GLYPH[' ']; const w = g[0].length; for (let r = 0; r < 7; r++) for (let k = 0; k < w; k++) if (g[r][k] === '1') on.add((x + k) * 8 + r); x += w + 1; }
        const used = Math.max(1, Math.min(cols, x - 1));
        for (const [c, r, ci] of cells) { const v = on.has(c * 8 + r); ci.setAttribute('opacity', v ? 1 : c < used ? 0.08 : 0); ci.style.transform = v ? 'none' : 'scale(.55)'; }
        svg.setAttribute('width', used * pitch); svg.setAttribute('height', 7 * pitch); svg.setAttribute('viewBox', `0 0 ${used * pitch} ${7 * pitch}`);
      };
      let cur = 0; let raf = 0;
      return { count(to, dur = 900) {
        cancelAnimationFrame(raf); frames.delete(raf); const from = cur; const t0 = performance.now(); let last = '';
        const f = (now) => { const t = reduce ? 1 : Math.min(1, (now - t0) / dur); cur = from + (to - from) * ease(t); const s = sym() + ' ' + Math.round(cur * rate()).toLocaleString('pt-BR'); if (s !== last) { set(s); last = s; } if (t < 1) raf = RAF(f); };
        raf = RAF(f);
      } };
    })();
    let nwGrow = 1; let nwRaf = 0; let D = [];
    function drawNW() {
      const svg = nw.querySelector('.nws'); const W = nw.clientWidth; const Hh = 226; const top = 26; const bot = 26; const mid = top + (Hh - top - bot) / 2; const half = (Hh - top - bot) / 2;
      svg.setAttribute('width', W); svg.setAttribute('height', Hh); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
      const S = D.length > 1 ? D : [D[0], D[0]]; const n = S.length; const mx = Math.max(0, ...S.map((p) => p.revenue));
      const X = (i) => -20 + (i / (n - 1)) * (W + 40); const g = ease(nwGrow);
      // espessura proporcional à receita (com um mínimo, para o fluxo nunca sumir); a parte branca é o lucro
      const lay = S.map((p) => { const thick = (mx > 0 ? (p.revenue > 0 ? 0.14 + 0.86 * (p.revenue / mx) : 0.04) : 0.04) * half * g; const pr = p.revenue > 0 ? Math.max(0, p.profit) / p.revenue : 0; return { r: thick, p: thick * pr }; });
      const band = (k) => smoothPath(S.map((p, i) => [X(i), mid - lay[i][k]])) + smoothPath(S.map((p, i) => [X(i), mid + lay[i][k]]).reverse(), false) + 'Z';
      const marks = D.length < 2 ? [n - 1] : W < 520 ? [...new Set([Math.round((n - 1) * 0.25), n - 1])] : [...new Set([Math.round((n - 1) * 0.18), Math.round((n - 1) * 0.55), n - 1])];
      svg.innerHTML = `<defs><linearGradient id="fbnwf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="fbnwm"><rect width="${W}" height="${Hh}" fill="url(#fbnwf)"/></mask></defs>
        <g mask="url(#fbnwm)"><path d="${band('r')}" fill="${COL.cost}" opacity=".95"/><path d="${band('p')}" fill="${COL.profit}" opacity=".95"/></g>
        ${marks.map((i, k) => { const x = Math.min(W - 48, Math.max(48, X(i))); return `<g style="opacity:${g > 0.6 ? 1 : 0};transition:opacity .4s ${k * 0.08}s">
          <line x1="${x}" x2="${x}" y1="${top - 4}" y2="${Hh - bot + 4}" stroke="rgba(0,0,0,.5)" stroke-width="1.5"/>
          <rect x="${x - 38}" y="${top - 14}" width="76" height="22" rx="11" fill="#030a14"/><text x="${x}" y="${top + 1}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff" font-family="Geist Mono,ui-monospace,monospace">${esc(money(S[i].revenue, { compact: true }))}</text>
          <rect x="${x - 32}" y="${Hh - bot - 8}" width="64" height="22" rx="11" fill="#030a14"/><text x="${x}" y="${Hh - bot + 7}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.72)" font-family="Geist Mono,ui-monospace,monospace">${esc(S[i].label)}</text></g>`; }).join('')}
        <line class="hl" y1="${top}" y2="${Hh - bot}" stroke="#fff" stroke-width="1.5" opacity="0"/><rect width="${W}" height="${Hh}" fill="transparent" class="hit"/>`;
      const hit = svg.querySelector('.hit'); const hl = svg.querySelector('.hl');
      hit.onpointermove = (e) => { const r = svg.getBoundingClientRect(); const z = r.width / W; const x = (e.clientX - r.left) / z; const i = Math.max(0, Math.min(n - 1, Math.round(((x + 20) / (W + 40)) * (n - 1)))); const p = S[i];
        hl.setAttribute('x1', X(i)); hl.setAttribute('x2', X(i)); hl.setAttribute('opacity', 1);
        showTip(r.left + X(i) * z, r.top + (mid - lay[i].r) * z, p.label, [['Receita', money(p.revenue)], ['Lucro', money(p.profit), COL.profit], ['Custo', money(p.revenue - p.profit), COL.cost]]); };
      hit.onpointerleave = () => { hl.setAttribute('opacity', 0); hideTip(); };
    }
    function updateNW(animate) {
      const m = data.metrics; D = m.series;
      dots.count(m.revenue, animate ? 900 : 1);
      const v = m.revenueVariation; const diff = m.revenue - (m.previous?.revenue || 0);
      nw.querySelector('.nwd').textContent = v === null ? 'novo' : (v >= 0 ? '↑ ' : '↓ ') + Math.abs(v).toLocaleString('pt-BR') + '%';
      nw.querySelector('.nwd').classList.toggle('down', v !== null && v < 0);
      nw.querySelector('.nwc').textContent = `${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))} vs. período anterior · ${m.sales} ${m.sales === 1 ? 'venda paga' : 'vendas pagas'}`;
      cancelAnimationFrame(nwRaf); frames.delete(nwRaf);
      if (!animate) { nwGrow = 1; drawNW(); return; }
      const t0 = performance.now(); nwGrow = 0; const f = (now) => { nwGrow = reduce ? 1 : Math.min(1, (now - t0) / 1100); drawNW(); if (nwGrow < 1) nwRaf = RAF(f); }; nwRaf = RAF(f);
    }

    // ---- Funil: meio-medidor de tracinhos (ganhos, em aberto, perdidos) com a conversão no centro
    const al = $('alloc');
    al.innerHTML = `${bgOf(GR.graph)}<div class="fb-in">
      <div class="fb-row" style="justify-content:space-between"><div class="fb-ttl">Funil de vendas</div><a class="fb-chip alc" href="#/leads"></a></div>
      <svg class="alg" width="300" height="168" viewBox="-150 -150 300 168" style="position:absolute;left:50%;margin-left:-150px;top:70px" aria-hidden="true"></svg>
      <div class="all" style="position:absolute;left:24px;right:24px;bottom:20px"></div></div><div class="fb-rim"></div>`;
    function updateAlloc(animate) {
      const st = data.stages || []; const sum = (kind, f) => st.filter((s) => s.kind === kind).reduce((a, s) => a + Number(s[f] || 0), 0);
      const won = sum('won', 'n'); const open = sum('open', 'n'); const lost = sum('lost', 'n'); const tot = won + open + lost;
      const fr = tot ? { won: won / tot, open: open / tot, lost: lost / tot } : { won: 0, open: 0, lost: 1 };
      const n = 56; let s = '';
      for (let i = 0; i <= n; i++) { const f = i / n; const a = 180 + f * 180; const cls = !tot ? 'lost' : f <= fr.won ? 'won' : f <= fr.won + fr.open ? 'open' : 'lost'; const [x1, y1] = polar(136, a); const [x2, y2] = polar(i % 7 === 0 ? 112 : 118, a);
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${COL[cls]}" stroke-width="3.2" stroke-linecap="round" style="${animate && !reduce ? `opacity:0;animation:fbtk .4s ${i * 12}ms forwards` : ''}"/>`; }
      s += `<text y="-22" text-anchor="middle" font-family="Geist,Inter,sans-serif" font-weight="200" font-size="52" fill="#fff" letter-spacing="-2">${data.kpis.conversion}<tspan font-size="17" dy="-24" fill="${T2}">%</tspan></text><text y="0" text-anchor="middle" font-size="12" font-weight="500" fill="${T3}" font-family="Geist,Inter,sans-serif">conversão</text>`;
      al.querySelector('.alg').innerHTML = s;
      al.querySelector('.alc').textContent = `${data.kpis.openLeads} em aberto`;
      al.querySelector('.all').innerHTML = [['Ganhos', won, sum('won', 'total'), 'won'], ['Em aberto', open, sum('open', 'total'), 'open'], ['Perdidos', lost, sum('lost', 'total'), 'lost']].map(([k, q, v, c], i) =>
        `<div class="fb-row" style="height:30px;${i ? 'border-top:1px solid rgba(255,255,255,.1)' : ''}"><i style="width:8px;height:8px;border-radius:50%;background:${COL[c]}"></i><span style="flex:1;font-size:13px;font-weight:600">${k}</span><span class="fb-mono fb-muted" style="width:44px;text-align:right">${q}</span><span class="fb-mono" style="width:92px;text-align:right;font-size:13px">${esc(money(v))}</span></div>`).join('');
    }

    // ---- Lucro (bloco de destaque)
    const ret = $('ret');
    ret.innerHTML = `${bgOf(GR.ice)}<div class="fb-in"><div class="fb-row" style="justify-content:space-between"><div class="fb-cap">Lucro no período</div><span class="fb-chip rtc"></span></div>
      <div style="position:absolute;left:22px;right:18px;bottom:34px;display:flex;align-items:center;gap:8px"><svg class="rta" width="26" height="32" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 37V5M5 17L17 5l12 12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="fb-big rtv" style="font-size:40px;white-space:nowrap">0</span></div>
      <div class="fb-muted rtp" style="position:absolute;left:24px;bottom:14px;font-size:11.5px;color:rgba(255,255,255,.7)"></div></div><div class="fb-rim"></div>`;
    function updateRet() {
      const m = data.metrics; const v = m.profitVariation;
      tween(ret.querySelector('.rtv'), m.profit, (x) => money(x));
      ret.querySelector('.rtc').textContent = v === null ? 'novo' : (v >= 0 ? '+' : '−') + Math.abs(v).toLocaleString('pt-BR') + '%';
      ret.querySelector('.rta').style.transform = m.profit < 0 || (v !== null && v < 0) ? 'rotate(180deg)' : 'none';
      const margin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0;
      ret.querySelector('.rtp').textContent = `Margem de ${margin}% · ${SINCE[period]}`;
    }

    // ---- A receber, com tracinhos das vendas pagas do período
    const cash = $('cash');
    cash.innerHTML = `<div class="fb-in"><div class="fb-row" style="justify-content:space-between"><div class="fb-cap">A receber</div><span class="fb-muted">Ticket médio</span></div>
      <div class="fb-row" style="margin-top:14px;align-items:baseline;justify-content:space-between;gap:10px"><span class="fb-big csv" style="font-size:34px;white-space:nowrap">0</span><span class="fb-mono ctk" style="font-size:15px;font-weight:500;white-space:nowrap"></span></div>
      <svg class="cst" height="22" style="position:absolute;left:24px;bottom:22px;width:calc(100% - 48px)" aria-hidden="true"></svg></div>`;
    function updateCash() {
      tween(cash.querySelector('.csv'), data.wallet.pending, (x) => money(x)); cash.querySelector('.ctk').textContent = money(data.metrics.ticket);
      const svg = cash.querySelector('.cst'); const W = svg.getBoundingClientRect().width || 220; const n = 36; const lit = Math.min(n, data.metrics.sales); let s = '';
      for (let i = 0; i < n; i++) { const x = 1 + (i * (W - 2)) / (n - 1); s += `<line x1="${x}" x2="${x}" y1="${i % 6 === 0 ? 2 : 8}" y2="20" stroke="${i < lit ? ACC : 'rgba(255,255,255,.26)'}" stroke-width="1.6" stroke-linecap="round" style="transition:stroke .2s ${i * 14}ms"/>`; }
      svg.innerHTML = s + `<text x="${W}" y="0" dy="-4" text-anchor="end" font-size="10" fill="${T3}" font-family="Geist Mono,ui-monospace,monospace">${data.metrics.sales} ${data.metrics.sales === 1 ? 'venda paga' : 'vendas pagas'}</text>`;
    }

    // ---- Vendas recentes
    const pay = $('pay');
    function updatePay() {
      const list = (data.recentSales || []).slice(0, 3);
      pay.innerHTML = `<div class="fb-in" style="padding-bottom:14px"><div class="fb-row" style="justify-content:space-between"><div class="fb-cap">Vendas recentes</div><a class="fb-muted fb-link" href="#/vendas">Ver todas</a></div>
        <div style="margin-top:10px">${list.length ? list.map((x, i) => { const who = x.client_name || x.description || 'Venda'; return `<div class="fb-row" style="height:34px;${i ? 'border-top:1px solid rgba(255,255,255,.08)' : ''}"><i class="fb-ini">${esc(who.slice(0, 1).toUpperCase())}</i><span class="fb-ell" style="flex:1;font-size:13px;font-weight:600" title="${esc(x.description)}">${esc(x.description || who)}</span><span class="fb-muted fb-mono" style="font-size:11px">${esc(x.status === 'pago' ? (x.sold_at ? dt(x.sold_at).slice(0, 5) : '') : 'pendente')}</span><span class="fb-mono" style="min-width:72px;text-align:right;font-size:13px">${esc(money(x.amount))}</span></div>`; }).join('')
          : `<p class="fb-muted" style="margin:14px 0 0">Nenhuma venda registrada ainda.${canWrite ? ' <a class="fb-link" href="#/vendas">Registrar a primeira</a>' : ''}</p>`}</div></div>`;
    }

    // ---- Progresso: conversão do funil e sites no ar
    const goals = $('goals');
    function updateGoals() {
      const k = data.kpis; const items = [['Conversão', k.conversion / 100, `${k.leads} ${k.leads === 1 ? 'lead' : 'leads'}`], ['Sites no ar', k.projects ? k.publishedSites / k.projects : 0, `${k.publishedSites} de ${k.projects}`]];
      goals.innerHTML = `<div class="fb-in"><div class="fb-row" style="justify-content:space-between"><div class="fb-cap">Progresso</div><span class="fb-muted">${k.clients} ${k.clients === 1 ? 'cliente' : 'clientes'}</span></div>
        ${items.map(([n, f, v], i) => `<div style="margin-top:${i ? 14 : 16}px"><div class="fb-row" style="justify-content:space-between;font-size:13px;font-weight:600"><span class="fb-ell">${n}</span><span class="fb-mono" style="font-weight:500;white-space:nowrap">${Math.round(f * 100)}%<span class="fb-muted"> · ${esc(v)}</span></span></div>
          <svg width="100%" height="12" style="margin-top:8px;display:block" class="gl" data-f="${f}" aria-hidden="true"></svg></div>`).join('')}</div>`;
      RAF(() => goals.querySelectorAll('.gl').forEach((svg, k2) => { const W = svg.getBoundingClientRect().width; const n = 40; const f = Number(svg.dataset.f); let s = '';
        for (let i = 0; i < n; i++) { const x = 1 + (i * (W - 2)) / (n - 1); const on = f > 0 && i / (n - 1) <= f; s += `<line x1="${x}" x2="${x}" y1="${i % 8 === 0 ? 0 : 4}" y2="12" stroke="${on ? ACC : 'rgba(255,255,255,.26)'}" stroke-width="1.6" stroke-linecap="round" style="${reduce ? '' : `opacity:0;animation:fbtk .3s ${300 + k2 * 150 + i * 12}ms forwards`}"/>`; }
        svg.innerHTML = s; }));
    }

    // ---- Receita × custo: ondas espelhadas, receita em cima e custo embaixo
    const flow = $('flow');
    flow.innerHTML = `${bgOf(GR.indigo)}<div class="fb-in">
      <div class="fb-row" style="justify-content:space-between;align-items:flex-start"><div><div class="fb-ttl">Receita × custo</div><div class="fb-muted fln" style="margin-top:4px"></div></div>
        <div class="fb-legend" style="flex-direction:column;gap:4px;align-items:flex-end"><span><i style="background:#fff"></i>Receita</span><span><i style="background:#C9D2FF"></i>Custo</span></div></div>
      <svg class="fls" style="position:absolute;left:0;bottom:12px" aria-hidden="true"></svg></div><div class="fb-rim"></div>`;
    let flowRaf = 0;
    function updateFlow(animate) {
      const m = data.metrics; const S = m.series.length > 1 ? m.series : [m.series[0], m.series[0]]; const cost = S.map((p) => Math.max(0, p.revenue - p.profit)); const inc = S.map((p) => p.revenue);
      flow.querySelector('.fln').innerHTML = `Lucro <span class="fb-mono" style="color:${ACC}">${m.profit >= 0 ? '+' : '−'}${esc(money(Math.abs(m.profit)))}</span> ${SINCE[period]}`;
      const svg = flow.querySelector('.fls'); const W = flow.clientWidth; const Hh = 246; const L = 66; const R = W - 24; const mid = Hh / 2; const lab = 16; const amp = mid - lab - 8;
      const max = Math.max(1, ...inc, ...cost);
      svg.setAttribute('width', W); svg.setAttribute('height', Hh); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
      const n = S.length; const X = (i) => L + (i / (n - 1)) * (R - L);
      const every = Math.max(1, Math.ceil(n / 6)); const labels = S.map((p, i) => (i % every === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < every / 2) ? i : -1).filter((i) => i >= 0);
      cancelAnimationFrame(flowRaf); frames.delete(flowRaf); const t0 = animate ? performance.now() : -1e9;
      const frame = (now) => {
        const g = ease(reduce ? 1 : Math.min(1, (now - t0) / 1200));
        const path = (arr, dir) => smoothPath(arr.map((v, i) => [X(i), mid + dir * (lab + (v / max) * amp * g)]));
        let s = '';
        [0, 1 / 3, 2 / 3, 1].forEach((f) => { const yT = mid - lab - f * amp; const yB = mid + lab + f * amp; const t = f ? axisMoney(max * f) : '0';
          s += `<line x1="${L}" x2="${R}" y1="${yT}" y2="${yT}" stroke="${HAIR}"/><line x1="${L}" x2="${R}" y1="${yB}" y2="${yB}" stroke="${HAIR}"/>
            <text x="${L - 10}" y="${yT + 3.5}" text-anchor="end" font-size="10" fill="${T3}" font-family="Geist Mono,ui-monospace,monospace">${esc(t)}</text><text x="${L - 10}" y="${yB + 3.5}" text-anchor="end" font-size="10" fill="${T3}" font-family="Geist Mono,ui-monospace,monospace">${esc(t)}</text>`; });
        labels.forEach((i) => { s += `<text x="${X(i)}" y="${mid + 4}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.78)" font-family="Geist Mono,ui-monospace,monospace">${esc(S[i].label)}</text>`; });
        s += `<path d="${path(inc, -1)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="${path(cost, 1)}" fill="none" stroke="#C9D2FF" stroke-width="2.4" stroke-linecap="round"/>`;
        s += `<line class="hl" y1="10" y2="${Hh - 10}" stroke="#fff" stroke-opacity=".5" opacity="0"/><rect class="hit" x="${L - 10}" width="${R - L + 20}" height="${Hh}" fill="transparent"/>`;
        svg.innerHTML = s;
        const hit = svg.querySelector('.hit'); const hl = svg.querySelector('.hl');
        hit.onpointermove = (e) => { const r = svg.getBoundingClientRect(); const z = r.width / W; const x = (e.clientX - r.left) / z; const i = Math.max(0, Math.min(n - 1, Math.round(((x - L) / (R - L)) * (n - 1))));
          hl.setAttribute('x1', X(i)); hl.setAttribute('x2', X(i)); hl.setAttribute('opacity', 1);
          showTip(r.left + X(i) * z, r.top + (mid - lab - (inc[i] / max) * amp) * z, S[i].label, [['Receita', money(inc[i]), '#fff'], ['Custo', money(cost[i]), '#C9D2FF'], ['Lucro', money(S[i].profit)]]); };
        hit.onpointerleave = () => { hl.setAttribute('opacity', 0); hideTip(); };
        if (g < 1) flowRaf = RAF(frame);
      };
      flowRaf = RAF(frame);
    }

    // ---- Melhores clientes do período: barra segmentada e a curva de cada um
    const cr = $('crypto');
    cr.innerHTML = `${bgOf(GR.teal)}<div class="fb-in"><div class="fb-row" style="justify-content:space-between"><div class="fb-ttl">Melhores clientes</div><a class="fb-muted fb-link" href="#/clientes">Clientes</a></div>
      <div class="fb-row" style="margin-top:14px;align-items:flex-end;justify-content:space-between"><span class="fb-big crv" style="white-space:nowrap">0</span><span style="padding-bottom:4px"><span class="fb-delta crd"></span><span class="fb-muted"> das vendas</span></span></div>
      <div class="crb" style="margin-top:16px"></div>
      <div class="crl" style="position:absolute;left:24px;right:24px;bottom:14px"></div></div><div class="fb-rim"></div>`;
    function spark(values, id) {
      const W = 92; const H = 30; const d = values.length > 1 ? values : [0, ...values]; const lo = Math.min(...d); const hi = Math.max(...d); const pad = (hi - lo) * 0.15 || 1;
      const Y = (v) => H - 3 - ((v - lo + pad) / (hi - lo + 2 * pad)) * (H - 6); const P = d.map((v, i) => [2 + (i / (d.length - 1)) * (W - 6), Y(v)]); const e = P[P.length - 1];
      return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
        <path d="${smoothPath(P)}L${e[0]},${H}L${P[0][0]},${H}Z" fill="url(#${id})"/><path d="${smoothPath(P)}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${e[0]}" cy="${e[1]}" r="3" fill="${ACC}" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>`;
    }
    function updateCrypto(animate) {
      const list = data.bento?.clients || []; const top = list.reduce((a, c) => a + c.total, 0); const share = list.reduce((a, c) => a + c.share, 0);
      tween(cr.querySelector('.crv'), top, (x) => money(x)); cr.querySelector('.crd').textContent = Math.round(share * 100) + '%';
      cr.querySelector('.crb').innerHTML = list.length ? `<div style="display:flex;gap:3px;height:6px">${list.map((c, i) => `<div class="crs" style="flex:0 0 calc(${Math.max(c.share * 100, 2)}% - 2px);border-radius:3px;background:rgba(255,255,255,${[0.95, 0.6, 0.32][i]});transform-origin:left;transform:scaleX(${animate && !reduce ? 0 : 1});transition:transform .8s var(--fb-ease) ${0.1 + i * 0.1}s"></div>`).join('')}</div>` : '<div style="height:6px;border-radius:3px;background:rgba(255,255,255,.14)"></div>';
      if (animate) RAF(() => RAF(() => cr.querySelectorAll('.crs').forEach((b) => { b.style.transform = 'scaleX(1)'; })));
      cr.querySelector('.crl').innerHTML = list.length ? list.map((c, i) => `<div class="fb-row" style="height:50px;${i ? 'border-top:1px solid rgba(255,255,255,.12)' : ''}">
        <div style="flex:1;min-width:0"><div class="fb-ell" style="font-size:13.5px;font-weight:600" title="${esc(c.name)}">${esc(c.name)}</div><div class="fb-mono fb-muted" style="font-size:11px">${c.sales} ${c.sales === 1 ? 'venda' : 'vendas'}</div></div>${spark(c.spark, 'fbsg' + i)}
        <div style="width:86px;text-align:right"><div class="fb-mono" style="font-size:13px">${esc(money(c.total, { compact: c.total * rate() >= 100000 }))}</div><div class="fb-mono" style="font-size:11px;color:${ACC}">${Math.round(c.share * 100)}%</div></div></div>`).join('')
        : '<p class="fb-muted" style="margin:0 0 10px">As vendas pagas do período aparecem aqui, por cliente.</p>';
    }

    // ---- Dias da semana: cápsulas com a receita de cada dia; hoje em destaque
    const st = $('stocks');
    st.innerHTML = `${bgOf(GR.royal)}<div class="fb-in"><div class="fb-ttl">Dias da semana</div>
      <div style="margin-top:14px"><span class="fb-big stv" style="font-size:30px">—</span></div><div class="fb-row" style="margin-top:6px;gap:8px"><span class="fb-delta std"></span><span class="fb-muted">dia mais forte</span></div>
      <svg class="sts" style="position:absolute;left:18px;bottom:14px" aria-hidden="true"></svg></div><div class="fb-rim"></div>`;
    function updateStocks(animate) {
      const wd = data.bento?.weekdays || Array(7).fill(0); const wc = data.bento?.weekCount || Array(7).fill(0); const vals = WEEK.map(([i]) => wd[i]);
      const best = wd.some((v) => v > 0) ? wd.indexOf(Math.max(...wd)) : -1;
      st.querySelector('.stv').textContent = best < 0 ? '—' : WEEK_FULL[best][0].toUpperCase() + WEEK_FULL[best].slice(1);
      st.querySelector('.std').textContent = best < 0 ? 'sem vendas' : money(wd[best], { compact: true });
      const svg = st.querySelector('.sts'); const W = st.clientWidth - 36; const Hh = 160; const pb = 18; const bw = W < 260 ? 16 : 20; const max = Math.max(1, ...vals); const gap = (W - 30 - bw * 7) / 6; const today = new Date(Date.now() - 3 * 3600e3).getUTCDay();
      svg.setAttribute('width', W); svg.setAttribute('height', Hh);
      const Y = (x) => (Hh - pb) * (1 - x / max); let s = '';
      [0, 0.5, 1].forEach((f) => { s += `<text x="0" y="${Y(max * f) + 3.5 + (f === 1 ? 6 : 0)}" font-size="9.5" fill="${T3}" font-family="Geist Mono,ui-monospace,monospace">${esc(f ? axisMoney(max * f) : '0')}</text>`; });
      vals.forEach((x, k) => { const X = 30 + k * (bw + gap); const isToday = WEEK[k][0] === today; const yv = x > 0 ? Math.min(Y(x), Hh - pb - bw) : Hh - pb;
        s += `<rect x="${X}" y="${Y(max)}" width="${bw}" height="${Hh - pb - Y(max)}" rx="${bw / 2}" fill="rgba(0,0,0,.26)"/>
          <rect class="sb" x="${X}" y="${animate && !reduce ? Hh - pb : yv}" width="${bw}" height="${animate && !reduce ? 0 : Hh - pb - yv}" rx="${bw / 2}" fill="${isToday ? ACC : '#fff'}" data-y="${yv}" data-h="${Hh - pb - yv}" style="transition:y .8s var(--fb-ease) ${k * 70}ms,height .8s var(--fb-ease) ${k * 70}ms"/>
          <text x="${X + bw / 2}" y="${Hh - 3}" text-anchor="middle" font-size="9.5" fill="${isToday ? '#fff' : T3}" font-family="Geist Mono,ui-monospace,monospace">${WEEK[k][1]}</text>
          <rect class="hit" x="${X - 4}" y="0" width="${bw + 8}" height="${Hh}" fill="transparent" data-k="${k}"/>`; });
      svg.innerHTML = s;
      if (animate && !reduce) RAF(() => RAF(() => svg.querySelectorAll('.sb').forEach((b) => { b.setAttribute('y', b.dataset.y); b.setAttribute('height', b.dataset.h); })));
      svg.querySelectorAll('.hit').forEach((hb) => { hb.onpointermove = (e) => { const k = Number(hb.dataset.k); const i = WEEK[k][0]; showTip(e.clientX, e.clientY, WEEK_FULL[i][0].toUpperCase() + WEEK_FULL[i].slice(1), [['Receita', money(wd[i]), '#fff'], ['Vendas', String(wc[i])]]); }; hb.onpointerleave = hideTip; });
    }

    // ---- tudo junto
    function updateAll(animate) {
      const now = new Date(); root.querySelector('.fb-asof').textContent = `Atualizado hoje, ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${currency !== 'BRL' && rates ? ` · cotação BCE ${dt(rates.date)}` : ''}`;
      updateNW(animate); updateAlloc(animate); updateRet(); updateCash(); updatePay(); updateGoals(); updateFlow(animate); updateCrypto(animate); updateStocks(animate);
    }
    async function load() { data = await api.get('/dashboard', { period }); if (alive) updateAll(true); }

    mount(box, root);
    box.classList.add('fb-box');
    let rz = 0; const ro = new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if (!data || !alive) return; drawNW(); updateFlow(false); updateStocks(false); updateCash(); updateGoals(); }, 120); });
    ['nw', 'flow', 'stocks', 'cash'].forEach((id) => ro.observe($(id)));
    await load();
    const grid = root.querySelector('.fb-grid'); root.querySelectorAll('.fb-card').forEach((c, i) => { c.style.transitionDelay = i * 60 + 'ms'; });
    (document.fonts?.ready || Promise.resolve()).then(() => RAF(() => grid.classList.add('in')));
    return () => { alive = false; frames.forEach((f) => cancelAnimationFrame(f)); ro.disconnect(); clearTimeout(rz); box.classList.remove('fb-box'); hideTip(); };
  }
};
