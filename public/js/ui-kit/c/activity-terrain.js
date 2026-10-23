// Activity Terrain — porte em JS puro do componente "Activity Terrain" do Kokonut UI (MIT, @dorianbaffier, https://kokonutui.com).
import { h, ensureStyle, clamp, reduced, disposer } from '../kit.js';

const DAYS = 7, GAP = 0.18, MAX_HEIGHT = 4.2, DEG = Math.PI / 180;
const PITCH_TERRAIN = 56 * DEG, YAW_TERRAIN = 18 * DEG, YAW_LIMIT = 38 * DEG, PITCH_LIMIT = 66 * DEG;
const DRAG_YAW = 0.32 * DEG, DRAG_PITCH = 0.36 * DEG;
// O giro continua depois de um arremesso e perde metade da velocidade neste tempo (s).
const SPIN_HALF_LIFE = 0.16;
const SPIN_IN = (YAW_TERRAIN * Math.LN2) / SPIN_HALF_LIFE;
const PITCH_STIFFNESS = 140, PITCH_DAMPING = 2 * Math.sqrt(PITCH_STIFFNESS), EDGE_STIFFNESS = 180;
const BUMP_STIFFNESS = 400, BUMP_DAMPING = 2 * Math.sqrt(BUMP_STIFFNESS) * 0.7, BUMP = 0.45;
// As colunas sobem em onda a partir de onde você pegou; a ponta distante atrasa esta fração.
const WAVE = 0.7, PADDING = 28, REST_EPSILON = 0.0005;
const LABELS = ['Seg', '', 'Qua', '', 'Sex', '', ''];
// Escala de azuis da Neva (do vazio ao mais movimentado) e cor do destaque.
const LEVELS = ['#e3f0fb', '#a5cdee', '#4a95d2', '#1f5f9b', '#0f3560'];
const ACCENT = '#1e90ff';
const TEXT = '#4a6f93';

const easeOutBack = (t) => { const c = 1.4, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
// Resistência além da borda: quanto mais longe, menos se move.
const rubber = (v, min, max) => v < min ? min - 0.18 * (1 - Math.exp((v - min) / 0.18)) : v > max ? max + 0.18 * (1 - Math.exp((max - v) / 0.18)) : v;

// Dados de exemplo determinísticos: dias úteis movimentados, fins de semana calmos, algumas sequências boas.
function demoData(weeks) {
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = [];
  for (let i = 0; i < weeks * DAYS; i++) {
    const weekend = i % DAYS >= 5;
    const season = 0.55 + 0.45 * Math.sin(i / 23);
    const streak = random() > 0.82 ? 2.2 : 1;
    const quiet = random() < (weekend ? 0.55 : 0.12);
    out.push(quiet ? 0 : Math.round((weekend ? 3 : 9) * season * streak * random()));
  }
  return out;
}

function buildCells(data, end) {
  const start = new Date(end.getTime() - (data.length - 1) * 86400000);
  const offset = (start.getUTCDay() + 6) % 7; // linhas vão de segunda a domingo
  const max = Math.max(1, ...data);
  return data.map((count, index) => {
    const slot = index + offset, norm = count / max;
    return { index, col: Math.floor(slot / DAYS), row: slot % DAYS, count, level: count === 0 ? 0 : Math.ceil(norm * 4), height: 0.06 + norm ** 0.85 * MAX_HEIGHT, date: new Date(start.getTime() + index * 86400000) };
  });
}

const hexToRgb = (v) => { const n = parseInt(v.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const shade = ([r, g, b], a) => { const k = 1 - a; return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; };
const LEVEL_RGB = LEVELS.map(hexToRgb), ACCENT_RGB = hexToRgb(ACCENT);

function project(p, x, y, z) {
  const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
  const xr = x * cos - z * sin, zr = x * sin + z * cos;
  return [p.cx + xr * p.scale, p.cy + (zr * Math.cos(p.pitch) - y * Math.sin(p.pitch)) * p.scale];
}

// As faces da coluna voltadas para a câmera; o topo por último.
function visibleFaces(p, x0, z0, hh) {
  const x1 = x0 + 1 - GAP, z1 = z0 + 1 - GAP, P = (x, y, z) => project(p, x, y, z);
  const faces = [], sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  if (hh > 0.02 && p.pitch > 0.01) {
    if (cos > 0) faces.push({ points: [P(x0, 0, z1), P(x1, 0, z1), P(x1, hh, z1), P(x0, hh, z1)], tone: 0.22 });
    else faces.push({ points: [P(x0, 0, z0), P(x1, 0, z0), P(x1, hh, z0), P(x0, hh, z0)], tone: 0.22 });
    if (sin > 0.001) faces.push({ points: [P(x1, 0, z0), P(x1, 0, z1), P(x1, hh, z1), P(x1, hh, z0)], tone: 0.38 });
    else if (sin < -0.001) faces.push({ points: [P(x0, 0, z0), P(x0, 0, z1), P(x0, hh, z1), P(x0, hh, z0)], tone: 0.38 });
  }
  faces.push({ points: [P(x0, hh, z0), P(x1, hh, z0), P(x1, hh, z1), P(x0, hh, z1)], tone: 0 });
  return faces;
}

function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const fmtDay = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
const fmtMonth = (d) => d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');

export default function mount(stage, ctx) {
  ensureStyle('activity-terrain', `
.kk-activity-terrain-card{width:100%;border-radius:24px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);user-select:none;-webkit-user-select:none;overflow:hidden}
.kk-activity-terrain-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:16px 16px 0}
.kk-activity-terrain-head div:first-child{min-width:0;flex:1 1 150px}
.kk-activity-terrain-title{margin:0;font-weight:600;font-size:14px}
.kk-activity-terrain-read{margin:2px 0 0;font-size:13px;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-activity-terrain-seg{display:flex;padding:2px;border-radius:999px;background:var(--ice-100,#e3f0fb);flex-shrink:0}
.kk-activity-terrain-seg button{min-height:36px;padding:0 14px;border:0;border-radius:999px;background:none;font:600 12px/1 inherit;font-family:inherit;color:var(--mut,#4a6f93);cursor:pointer;transition:background .2s,color .2s}
.kk-activity-terrain-seg button[aria-pressed=true]{background:#fff;color:var(--ink,#0e2236);box-shadow:0 1px 2px rgba(15,53,96,.15)}
.kk-activity-terrain-seg button:focus-visible{outline:2px solid var(--ice-500,#4a95d2);outline-offset:1px}
.kk-activity-terrain-cv{display:block;width:100%;height:${ctx.big ? 380 : 270}px;touch-action:pan-y;cursor:grab;outline:none}
.kk-activity-terrain-cv.drag{cursor:grabbing}
.kk-activity-terrain-cv:focus-visible{box-shadow:inset 0 0 0 2px var(--ice-500,#4a95d2)}
.kk-activity-terrain-leg{display:flex;align-items:center;justify-content:flex-end;gap:4px;padding:0 16px 12px;font-size:12px;color:var(--mut,#4a6f93)}
.kk-activity-terrain-leg i{width:11px;height:11px;border-radius:3px;display:inline-block}
`);
  const dispose = disposer();
  const noMotion = reduced();
  const data = demoData(26);
  const end = new Date(Date.UTC(2026, 9, 11));
  const cells = buildCells(data, end);
  const weeks = cells[cells.length - 1].col + 1;
  const total = data.reduce((a, b) => a + b, 0);

  const s = {
    yaw: 0, yawSpeed: 0, pitch: 0, pitchSpeed: 0, pitchTarget: PITCH_TERRAIN,
    bumps: new Float64Array(cells.length), bumpSpeeds: new Float64Array(cells.length),
    hovered: -1, origin: { col: 0, row: 3 }, width: 0, height: 0, dpr: 1, drag: null,
    raf: 0, last: 0, visible: false, started: false,
  };
  let flat = false;

  const canvas = h('canvas', { class: 'kk-activity-terrain-cv', tabindex: '0', role: 'img' });
  const readEl = h('p', { class: 'kk-activity-terrain-read', 'aria-live': 'polite' });
  canvas.setAttribute('aria-label', `Pedidos por dia: ${total} em ${weeks} semanas. Use as setas do teclado para ler cada dia.`);
  const segBtns = [['Plano', true], ['Relevo', false]].map(([name, val]) => h('button', { type: 'button', onClick: () => { if (flat !== val) setView(val); } }, name));
  const syncSeg = () => segBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(flat === (i === 0))));
  const legend = h('div', { class: 'kk-activity-terrain-leg' }, h('span', {}, 'Menos'), ...LEVELS.map((c) => h('i', { style: `background:${c}` })), h('span', {}, 'Mais'));
  stage.append(h('div', { class: 'kk-activity-terrain-card' },
    h('div', { class: 'kk-activity-terrain-head', },
      h('div', {}, h('p', { class: 'kk-activity-terrain-title' }, 'Pedidos por dia'), readEl),
      h('div', { class: 'kk-activity-terrain-seg' }, ...segBtns)),
    canvas, legend));

  let active = null;
  const syncRead = () => {
    readEl.textContent = active
      ? `${active.count} ${active.count === 1 ? 'pedido' : 'pedidos'} em ${fmtDay(active.date)}`
      : `${total.toLocaleString('pt-BR')} pedidos nas últimas ${weeks} semanas`;
  };

  // Altura de cada coluna agora: a subida viaja em onda a partir da origem e cada uma passa um pouco do ponto ao pousar.
  const columnHeight = (cell, lift) => {
    const span = Math.hypot(weeks, DAYS) || 1;
    const d = Math.hypot(cell.col - s.origin.col, cell.row - s.origin.row) / span;
    return cell.height * easeOutBack(clamp(lift * (1 + WAVE) - d * WAVE, 0, 1)) + s.bumps[cell.index];
  };

  const pose = () => {
    const lift = clamp(s.pitch / PITCH_TERRAIN, 0, 1.2);
    // Encaixa o tabuleiro inteiro, na rotação e inclinação atuais, no canvas.
    const probe = { yaw: s.yaw, pitch: s.pitch, scale: 1, cx: 0, cy: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, z] of [[0, 0], [weeks, 0], [0, DAYS], [weeks, DAYS]]) {
      for (const y of [0, MAX_HEIGHT * Math.min(lift, 1)]) {
        const [px, py] = project(probe, x - weeks / 2, y, z - DAYS / 2);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }
    const scale = Math.min((s.width - PADDING * 2) / (maxX - minX), (s.height - PADDING * 2) / (maxY - minY));
    return { yaw: s.yaw, pitch: s.pitch, scale, cx: s.width / 2 - ((minX + maxX) / 2) * scale, cy: s.height / 2 - ((minY + maxY) / 2) * scale + 6, lift };
  };

  // De trás para a frente: quanto mais longe a base, mais cedo desenha.
  const ordered = (p) => {
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    const depth = (c) => (c.col + 0.5 - weeks / 2) * sin + (c.row + 0.5 - DAYS / 2) * cos;
    return [...cells].sort((a, b) => depth(a) - depth(b));
  };

  const cx2d = canvas.getContext('2d');
  const font = () => getComputedStyle(canvas).fontFamily;
  const drawLabels = (p, lift) => {
    // Os rótulos ficam no chão e sumiriam atrás das colunas; esmaecem quando o relevo sobe.
    const alpha = clamp(1 - lift * 1.6, 0, 1);
    if (alpha === 0) return;
    cx2d.globalAlpha = alpha; cx2d.fillStyle = TEXT; cx2d.font = `11px ${font()}`; cx2d.textBaseline = 'middle'; cx2d.textAlign = 'left';
    let month = -1;
    for (const cell of cells) {
      if (cell.row !== 0 && cell.index !== 0) continue;
      const m = cell.date.getUTCMonth();
      if (m !== month && cell.col < weeks - 1) {
        month = m;
        const [x, y] = project(p, cell.col - weeks / 2, 0, -0.75 - DAYS / 2);
        cx2d.fillText(fmtMonth(cell.date), x, y);
      }
    }
    cx2d.textAlign = 'right';
    for (let row = 0; row < DAYS; row++) {
      if (!LABELS[row]) continue;
      const [x, y] = project(p, -0.35 - weeks / 2, 0, row + 0.4 - DAYS / 2);
      cx2d.fillText(LABELS[row], x, y);
    }
    cx2d.globalAlpha = 1;
  };

  const draw = () => {
    if (!s.width) return;
    const p = pose();
    cx2d.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    cx2d.clearRect(0, 0, s.width, s.height);
    drawLabels(p, p.lift);
    cx2d.lineJoin = 'round';
    for (const cell of ordered(p)) {
      const hh = columnHeight(cell, p.lift);
      const color = cell.index === s.hovered ? ACCENT_RGB : LEVEL_RGB[cell.level];
      for (const face of visibleFaces(p, cell.col - weeks / 2, cell.row - DAYS / 2, hh)) {
        cx2d.beginPath();
        face.points.forEach(([x, y], i) => (i ? cx2d.lineTo(x, y) : cx2d.moveTo(x, y)));
        cx2d.closePath();
        const fill = shade(color, face.tone);
        cx2d.fillStyle = fill; cx2d.fill();
        cx2d.strokeStyle = fill; cx2d.lineWidth = 0.6; cx2d.stroke(); // fio da mesma cor fecha as frestas entre faces
      }
    }
  };

  const hitTest = (x, y) => {
    const p = pose(), list = ordered(p);
    for (let i = list.length - 1; i >= 0; i--) {
      const cell = list[i], hh = columnHeight(cell, p.lift);
      for (const face of visibleFaces(p, cell.col - weeks / 2, cell.row - DAYS / 2, hh)) if (inside(face.points, x, y)) return cell;
    }
    return null;
  };

  const stepSprings = (dt) => {
    let energy = 0;
    if (!s.drag) {
      s.yawSpeed *= 0.5 ** (dt / SPIN_HALF_LIFE);
      let target = s.yaw;
      if (s.pitchTarget === 0) target = 0; // plano sempre de frente
      else if (s.yaw > YAW_LIMIT) target = YAW_LIMIT;
      else if (s.yaw < -YAW_LIMIT) target = -YAW_LIMIT;
      if (target !== s.yaw) s.yawSpeed += ((target - s.yaw) * EDGE_STIFFNESS - s.yawSpeed * 2 * Math.sqrt(EDGE_STIFFNESS)) * dt;
      s.yaw += s.yawSpeed * dt;
      energy = Math.max(energy, Math.abs(s.yawSpeed), Math.abs(target - s.yaw));
      s.pitchSpeed += ((s.pitchTarget - s.pitch) * PITCH_STIFFNESS - s.pitchSpeed * PITCH_DAMPING) * dt;
      s.pitch += s.pitchSpeed * dt;
      energy = Math.max(energy, Math.abs(s.pitchSpeed), Math.abs(s.pitchTarget - s.pitch));
    }
    for (let i = 0; i < s.bumps.length; i++) {
      const target = i === s.hovered && s.pitch > 0.1 ? BUMP : 0;
      s.bumpSpeeds[i] += ((target - s.bumps[i]) * BUMP_STIFFNESS - s.bumpSpeeds[i] * BUMP_DAMPING) * dt;
      s.bumps[i] += s.bumpSpeeds[i] * dt;
      energy = Math.max(energy, Math.abs(s.bumpSpeeds[i]) * 0.1, Math.abs(target - s.bumps[i]));
    }
    return energy;
  };

  const tick = (now) => {
    s.raf = 0;
    const dt = s.last ? Math.min((now - s.last) / 1000, 1 / 30) : 1 / 60;
    s.last = now;
    const energy = stepSprings(dt);
    draw();
    if ((s.drag || energy > REST_EPSILON) && s.visible) s.raf = requestAnimationFrame(tick);
    else s.last = 0;
  };

  // Gira a partir de frente enquanto inclina, parando na rotação de repouso do relevo.
  const turnIn = () => {
    if (Math.abs(s.yaw) > 2 * DEG) return;
    if (noMotion) s.yaw = YAW_TERRAIN; else s.yawSpeed = SPIN_IN;
  };
  const wake = () => {
    if (noMotion) { // sem viagem: tudo cai direto no destino
      s.pitch = s.pitchTarget; s.yaw = clamp(s.yaw, -YAW_LIMIT, YAW_LIMIT); s.pitchSpeed = 0; s.yawSpeed = 0; s.bumps.fill(0); draw(); return;
    }
    if (!s.raf && s.visible) s.raf = requestAnimationFrame(tick);
  };

  dispose(onResize2());
  function onResize2() {
    const ro = new ResizeObserver(([e]) => {
      s.width = e.contentRect.width; s.height = e.contentRect.height;
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(s.width * s.dpr); canvas.height = Math.round(s.height * s.dpr);
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }
  let onScreen = false;
  const update = () => {
    s.visible = onScreen && !document.hidden;
    if (s.visible) {
      if (!s.started) { s.started = true; if (s.pitchTarget > 0) turnIn(); }
      wake();
    } else if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; }
  };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); });
  io.observe(canvas); dispose(() => io.disconnect());
  document.addEventListener('visibilitychange', update); dispose(() => document.removeEventListener('visibilitychange', update));
  dispose(() => cancelAnimationFrame(s.raf));

  function setView(nextFlat, origin) {
    flat = nextFlat; syncSeg();
    s.origin = origin ?? { col: nextFlat ? weeks : 0, row: 3 };
    s.pitchTarget = nextFlat ? 0 : PITCH_TERRAIN;
    s.yawSpeed = 0;
    if (!nextFlat) turnIn();
    wake();
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hover = (cell) => {
    const index = cell ? cell.index : -1;
    if (index === s.hovered) return;
    s.hovered = index; active = cell; syncRead();
    if (noMotion) draw(); else wake();
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const { x, y } = local(e);
    canvas.setPointerCapture(e.pointerId);
    const cell = hitTest(x, y);
    if (cell) s.origin = { col: cell.col, row: cell.row };
    s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: s.yaw, pitch: s.pitch, moved: false, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
    s.yawSpeed = 0; s.pitchSpeed = 0;
    canvas.classList.add('drag');
    hover(cell); wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    const d = s.drag;
    if (!d || d.id !== e.pointerId) {
      if (e.pointerType === 'mouse') { const { x, y } = local(e); hover(hitTest(x, y)); }
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    if (!d.moved) return;
    s.yaw = rubber(d.yaw + dx * DRAG_YAW, -YAW_LIMIT, YAW_LIMIT);
    s.pitch = rubber(d.pitch + dy * DRAG_PITCH, 0, PITCH_LIMIT);
    d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (d.samples.length > 5) d.samples.shift();
    if (noMotion) draw(); else wake();
  });
  const up = (e) => {
    const d = s.drag;
    if (!d || d.id !== e.pointerId) return;
    s.drag = null; canvas.classList.remove('drag');
    if (!d.moved) { wake(); return; }
    // Velocidade pelas últimas amostras, em px/s.
    const first = d.samples[0], last = d.samples[d.samples.length - 1] ?? first;
    const dt = Math.max((last.t - first.t) / 1000, 0.016);
    const recent = e.timeStamp - last.t < 80;
    s.yawSpeed = recent ? ((last.x - first.x) / dt) * DRAG_YAW : 0;
    s.pitchSpeed = recent ? ((last.y - first.y) / dt) * DRAG_PITCH : 0;
    // Pousa na vista para onde o arremesso está indo.
    flat = s.pitch + s.pitchSpeed * 0.15 < PITCH_TERRAIN / 2; syncSeg();
    s.pitchTarget = flat ? 0 : PITCH_TERRAIN;
    wake();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('pointerleave', (e) => { if (!s.drag && e.pointerType === 'mouse') hover(null); });
  canvas.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    const cur = cells[s.hovered] ?? cells[cells.length - 1];
    const next = cells.find((c) => c.col === cur.col + mv[0] && c.row === cur.row + mv[1]);
    hover(next ?? cur);
  });

  syncSeg(); syncRead();
  return () => dispose.run();
}
