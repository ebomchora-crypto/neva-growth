// Avatar Picker — porte em JS puro do componente "Avatar Picker" .
import { h, svg, ensureStyle, loop, spring, disposer, clamp, lerp, reduced } from '../kit.js';
import { icon, toast } from '../../ui.js';

/* ---- Geração dos rostos: cada avatar é uma função pura de uma "semente" (texto).
   A semente vira um PRNG que escolhe valores contínuos (proporções, cabelo, olhos, boca)
   e cores de paletas pequenas. Como os traços são números, dois rostos podem ser misturados — é isso que permite o morph. */
const BACKGROUNDS = [
  { name: 'azul-gelo', rgb: [201, 225, 246] }, { name: 'névoa', rgb: [227, 240, 251] }, { name: 'céu claro', rgb: [190, 215, 238] },
  { name: 'azul-aço', rgb: [210, 226, 240] }, { name: 'azul-pálido', rgb: [218, 232, 246] }, { name: 'azul-porcelana', rgb: [200, 220, 236] },
];
const SKINS = [[246, 233, 222], [236, 210, 187], [214, 176, 142], [176, 128, 96], [128, 88, 66]];
const HAIRS = [[39, 39, 42], [63, 45, 36], [113, 84, 62], [161, 161, 170], [82, 82, 91]];
const SHIRTS = [[15, 53, 96], [31, 95, 155], [74, 149, 210], [244, 248, 254]];
const INK = '#0e2236';
const SHAPE_KEYS = ['headW', 'headH', 'headSquare', 'chin', 'hairVolume', 'hairFringe', 'hairPart', 'hairLength', 'eyeGap', 'eyeY', 'eyeRx', 'eyeRy', 'browTilt', 'browLift', 'browWeight', 'mouthW', 'mouthCurve', 'mouthOpen', 'nose', 'glasses', 'cheeks', 'shoulders'];

function hashString(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function mulberry32(seed) {
  let a = seed;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const round2 = (v) => Math.round(v * 100) / 100, n = round2;
const pick = (list, r) => list[Math.min(list.length - 1, Math.floor(r * list.length))];

function describe(s, bgName) {
  const hair = s.hairLength > 0.62 ? 'cabelo comprido' : s.hairVolume < 0.22 ? 'cabelo curtinho' : 'cabelo curto';
  const mouth = s.mouthOpen > 0.5 ? 'sorriso aberto' : s.mouthCurve > 3.2 ? 'sorriso largo' : s.mouthCurve < 1 ? 'expressão calma' : 'leve sorriso';
  return `${s.headSquare > 0.55 ? 'Rosto quadrado' : 'Rosto redondo'}, ${hair}${s.glasses > 0.5 ? ', óculos' : ''}, ${mouth}, fundo ${bgName}`;
}
/** Rosto determinístico para uma semente: mesma semente, mesmo rosto. */
function createFace(seed) {
  const r = mulberry32(hashString(seed)), bg = pick(BACKGROUNDS, r());
  const shape = {
    headW: 18 + r() * 5, headH: 22 + r() * 4, headSquare: r(), chin: 0.75 + r() * 0.25, hairVolume: r(), hairFringe: r(), hairPart: r() * 2 - 1, hairLength: r() ** 1.6,
    eyeGap: 7.5 + r() * 3, eyeY: -2 + r() * 4, eyeRx: 1.7 + r() * 0.9, eyeRy: 1.9 + r() * 1.4, browTilt: -2 + r() * 4, browLift: 4.2 + r() * 2,
    browWeight: r() < 0.65 ? 1.3 + r() * 0.8 : 0, mouthW: 3.5 + r() * 3, mouthCurve: r() * 4.5, mouthOpen: r() < 0.3 ? 0.6 + r() * 0.4 : 0,
    nose: r(), glasses: r() < 0.25 ? 1 : 0, cheeks: r(), shoulders: r(),
  };
  for (const k of SHAPE_KEYS) shape[k] = round2(shape[k]);
  return { shape, bg: bg.rgb, skin: pick(SKINS, r()), hair: pick(HAIRS, r()), shirt: pick(SHIRTS, r()), description: describe(shape, bg.name) };
}
const lerpRgb = (a, b, t) => a.map((v, i) => clamp(Math.round(lerp(v, b[i], t)), 0, 255));
function lerpFace(a, b, t) {
  const shape = { ...b.shape };
  for (const k of SHAPE_KEYS) shape[k] = lerp(a.shape[k], b.shape[k], t);
  const ct = Math.min(1, t);  // cores param no alvo; só as formas podem passar do ponto com a mola
  return { shape, bg: lerpRgb(a.bg, b.bg, ct), skin: lerpRgb(a.skin, b.skin, ct), hair: lerpRgb(a.hair, b.hair, ct), shirt: lerpRgb(a.shirt, b.shirt, ct), description: b.description };
}
const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)} ${Math.round(c[1] * k)} ${Math.round(c[2] * k)})`;

/** Blob arredondado: `square` mistura elipse e "squircle". */
function blobPath(cx, cy, w, top, bottom, square, chin = 1) {
  const k = 0.552 + square * 0.28, kb = k * chin;
  return [`M${n(cx)} ${n(cy - top)}`,
    `C${n(cx + k * w)} ${n(cy - top)} ${n(cx + w)} ${n(cy - k * top)} ${n(cx + w)} ${n(cy)}`,
    `C${n(cx + w)} ${n(cy + kb * bottom)} ${n(cx + kb * w)} ${n(cy + bottom)} ${n(cx)} ${n(cy + bottom)}`,
    `C${n(cx - kb * w)} ${n(cy + bottom)} ${n(cx - w)} ${n(cy + kb * bottom)} ${n(cx - w)} ${n(cy)}`,
    `C${n(cx - w)} ${n(cy - k * top)} ${n(cx - k * w)} ${n(cy - top)} ${n(cx)} ${n(cy - top)}Z`].join('');
}
function hairFrontPath(s, cx, cy) {
  const w = s.headW, hh = s.headH, v = s.hairVolume, temple = cy - hh * 0.12, crown = cy - hh - 1.5 - v * 4, side = w + 1.5 + v * 2.5, k = 0.552 + s.headSquare * 0.28;
  const fringeY = cy - hh * (0.66 - s.hairFringe * 0.36), partX = cx + s.hairPart * w * 0.55;
  return [`M${n(cx - side)} ${n(temple)}`,
    `C${n(cx - side)} ${n(cy - hh * k - v * 3)} ${n(cx - k * side)} ${n(crown)} ${n(cx)} ${n(crown)}`,
    `C${n(cx + k * side)} ${n(crown)} ${n(cx + side)} ${n(cy - hh * k - v * 3)} ${n(cx + side)} ${n(temple)}`,
    `L${n(cx + w - 1)} ${n(temple)}`,
    `Q${n(cx + w * 0.75)} ${n(fringeY + 1 - s.hairPart * 5)} ${n(partX)} ${n(fringeY - 2.5)}`,
    `Q${n(cx - w * 0.75)} ${n(fringeY + 1 + s.hairPart * 5)} ${n(cx - w + 1)} ${n(temple)}Z`].join('');
}
const mouthPath = (s, cx, y) => `M${n(cx - s.mouthW)} ${n(y)}Q${n(cx)} ${n(y + s.mouthCurve * 2)} ${n(cx + s.mouthW)} ${n(y)}Q${n(cx)} ${n(y + s.mouthCurve * 2 + s.mouthOpen * 5)} ${n(cx - s.mouthW)} ${n(y)}Z`;

/** O rosto em si: um SVG de 100×100 unidades, criado uma vez e atualizado por `paint(face)`. */
function makeFaceArt() {
  const S = (t, a) => svg(t, a);
  const bg = S('rect', { width: 100, height: 100 }), hairBack = S('path'), shirt = S('path'), neck = S('rect', { width: 12, rx: 3 });
  const earL = S('ellipse', { rx: 3, ry: 4.5 }), earR = S('ellipse', { rx: 3, ry: 4.5 }), head = S('path'), hairFront = S('path');
  const cheeks = svg('g', { fill: INK }, S('circle', { r: 3.4 }), S('circle', { r: 3.4 }));
  const browL = S('path'), browR = S('path');
  const brows = svg('g', { stroke: INK, 'stroke-linecap': 'round', 'stroke-opacity': .85 }, browL, browR);
  const eyeL = S('ellipse', { fill: INK }), eyeR = S('ellipse', { fill: INK });
  const blink = svg('g', { style: 'transform-box:fill-box;transform-origin:center;transition:transform 75ms ease-out' }, eyeL, eyeR);
  const look = svg('g', {}, blink);
  const nose = S('path', { fill: 'none', stroke: INK, 'stroke-linecap': 'round', 'stroke-opacity': .35, 'stroke-width': 1.2 });
  const mouth = S('path', { fill: INK, stroke: INK, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.6 });
  const gL = S('circle'), gR = S('circle'), gB = S('path');
  const glasses = svg('g', { fill: 'none', stroke: INK, 'stroke-width': 1.2 }, gL, gR, gB);
  const el = svg('svg', { viewBox: '12 14 76 76', 'aria-hidden': 'true', class: 'kk-avatar-picker-art' }, bg, hairBack, shirt, neck, earL, earR, head, hairFront, cheeks, brows, look, nose, mouth, glasses);
  const a = (e, o) => { for (const k in o) e.setAttribute(k, o[k]); };
  function paint(face) {
    const s = face.shape, cx = 50, cy = 50, eyeY = cy + s.eyeY, mouthY = cy + s.headH * 0.5, glassR = Math.max(s.eyeRx, s.eyeRy) + 3.2;
    const neckTop = cy + s.headH - 6, shoulderTop = cy + s.headH + 3, sw = 30 + s.shoulders * 8;
    a(bg, { fill: rgb(face.bg) });
    a(hairBack, { d: blobPath(cx, cy - s.headH * 0.15, s.headW + 1 + s.hairVolume * 2.5, s.headH * 0.85 + s.hairVolume * 4, s.headH * 0.15 + s.hairLength * (s.headH + 14), s.headSquare * 0.6), fill: rgb(face.hair, 0.9) });  // cabelo comprido fica atrás da cabeça
    a(shirt, { d: `M${n(cx - sw)} 100C${n(cx - sw)} ${n(shoulderTop + 6)} ${n(cx - sw * 0.55)} ${n(shoulderTop)} ${cx} ${n(shoulderTop)}C${n(cx + sw * 0.55)} ${n(shoulderTop)} ${n(cx + sw)} ${n(shoulderTop + 6)} ${n(cx + sw)} 100Z`, fill: rgb(face.shirt) });
    a(neck, { fill: rgb(face.skin, 0.9), height: n(shoulderTop - neckTop + 3), x: cx - 6, y: n(neckTop) });
    a(earL, { cx: n(cx - s.headW), cy: n(cy + 2), fill: rgb(face.skin, 0.95) }); a(earR, { cx: n(cx + s.headW), cy: n(cy + 2), fill: rgb(face.skin, 0.95) });
    a(head, { d: blobPath(cx, cy, s.headW, s.headH, s.headH, s.headSquare, s.chin), fill: rgb(face.skin) });
    a(hairFront, { d: hairFrontPath(s, cx, cy), fill: rgb(face.hair) });
    a(cheeks, { opacity: n(0.045 * s.cheeks) }); a(cheeks.children[0], { cx: n(cx - s.eyeGap - 3), cy: n(eyeY + 7) }); a(cheeks.children[1], { cx: n(cx + s.eyeGap + 3), cy: n(eyeY + 7) });
    a(brows, { 'stroke-width': n(Math.max(0, s.browWeight)) });
    a(browL, { d: `M${n(cx - s.eyeGap - 3.2)} ${n(eyeY - s.browLift + s.browTilt)}L${n(cx - s.eyeGap + 3.2)} ${n(eyeY - s.browLift - s.browTilt)}` });
    a(browR, { d: `M${n(cx + s.eyeGap - 3.2)} ${n(eyeY - s.browLift - s.browTilt)}L${n(cx + s.eyeGap + 3.2)} ${n(eyeY - s.browLift + s.browTilt)}` });
    a(eyeL, { cx: n(cx - s.eyeGap), cy: n(eyeY), rx: n(s.eyeRx), ry: n(s.eyeRy) }); a(eyeR, { cx: n(cx + s.eyeGap), cy: n(eyeY), rx: n(s.eyeRx), ry: n(s.eyeRy) });
    a(nose, { d: `M${n(cx - 1.5 - s.nose)} ${n(eyeY + 8 + s.nose * 1.5)}Q${cx} ${n(eyeY + 9.5 + s.nose * 1.5)} ${n(cx + 1.5 + s.nose)} ${n(eyeY + 8 + s.nose * 1.5)}` });
    a(mouth, { d: mouthPath(s, cx, mouthY) });
    a(glasses, { opacity: n(clamp(s.glasses, 0, 1)) });
    a(gL, { cx: n(cx - s.eyeGap), cy: n(eyeY), r: n(glassR) }); a(gR, { cx: n(cx + s.eyeGap), cy: n(eyeY), r: n(glassR) });
    a(gB, { d: `M${n(cx - s.eyeGap + glassR)} ${n(eyeY)}Q${cx} ${n(eyeY - 2)} ${n(cx + s.eyeGap - glassR)} ${n(eyeY)}` });
  }
  return { el, paint, look, blink };
}

/** Rosto que, ao trocar a semente, desliza cada traço do valor atual para o novo (em vez de um fade). */
function makeMorphingFace(seed, d, rm) {
  const art = makeFaceArt(); let shown = createFace(seed), stop = null, curSeed = seed; art.paint(shown);
  const halt = () => { stop?.(); stop = null; }; d(halt);
  return {
    el: art.el, art, get description() { return createFace(curSeed).description; },
    setSeed(next, morph = true) {
      if (next === curSeed) return; curSeed = next; halt();
      const target = createFace(next);
      if (!morph || rm) { shown = target; art.paint(shown); return; }
      const from = shown, sp = spring(0, { k: 224, c: 24 }); sp.to(1);  // ressalto leve (bounce ≈ .22)
      stop = loop((dt) => { const t = sp.step(dt); shown = lerpFace(from, target, t); art.paint(shown); if (sp.settled) { shown = target; art.paint(shown); halt(); } });
    },
  };
}

const SLOTS = 5, COIN = 128, BEZEL = 176, TICKS = 60, DEG_PER_PX = 180 / COIN, MAX_FLICK = 10, TAP_SLOP = 4, MIN_NAME = 2;
const avatarSeed = (name, v) => `${name.trim().toLowerCase()}:${v}`;
const pad3 = (v) => String(((v % 1000) + 1000) % 1000).padStart(3, '0');
const FLY_EASE = 'cubic-bezier(.34,1.35,.64,1)';

export default function mount(stage, ctx) {
  ensureStyle('avatar-picker', `
.kk-avatar-picker-root{width:100%;box-sizing:border-box;display:flex;justify-content:center;padding:12px 8px}
.kk-avatar-picker-card{position:relative;width:100%;max-width:360px;box-sizing:border-box;padding:18px;border-radius:16px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236)}
.kk-avatar-picker-card h3{margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em}
.kk-avatar-picker-card .sub{margin:4px 0 0;font-size:13px;color:var(--mut,#4a6f93)}
.kk-avatar-picker-top{margin-top:16px;display:flex;flex-direction:column;align-items:center}
.kk-avatar-picker-bezelbox{position:relative;width:${BEZEL}px;height:${BEZEL}px;display:grid;place-items:center}
.kk-avatar-picker-bezel{position:absolute;inset:0;color:var(--ice-300,#a5cdee)}
.kk-avatar-picker-index{position:absolute;top:0;left:50%;width:2px;height:12px;margin-left:-1px;border-radius:2px;background:var(--ink,#0e2236)}
.kk-avatar-picker-coin{position:relative;z-index:1;width:${COIN}px;height:${COIN}px;perspective:600px;border-radius:50%;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none;outline:none}
.kk-avatar-picker-coin:active{cursor:grabbing}
.kk-avatar-picker-coin:focus-visible{box-shadow:0 0 0 3px var(--ice-500,#4a95d2)}
.kk-avatar-picker-coin.hide{visibility:hidden}
.kk-avatar-picker-spin{position:relative;width:100%;height:100%;transform-style:preserve-3d}
.kk-avatar-picker-disc{position:absolute;inset:0;border-radius:50%;background:var(--ice-300,#a5cdee)}
.kk-avatar-picker-front{position:absolute;inset:0;overflow:hidden;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(14,34,54,.12)}
.kk-avatar-picker-art{display:block;width:100%;height:100%}
.kk-avatar-picker-shade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none}
.kk-avatar-picker-who{margin-top:8px;display:flex;align-items:baseline;gap:8px;font-size:12px}
.kk-avatar-picker-who b{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.kk-avatar-picker-who span{font:12px ui-monospace,Menlo,monospace;color:var(--mut,#4a6f93);font-variant-numeric:tabular-nums}
.kk-avatar-picker-row{margin-top:18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 12px}
.kk-avatar-picker-slots{display:flex;gap:6px}
.kk-avatar-picker-slot{position:relative;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;outline:none}
.kk-avatar-picker-slot:focus-visible,.kk-avatar-picker-dice:focus-visible,.kk-avatar-picker-go:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ice-600,#2f7bbd)}
.kk-avatar-picker-sock{position:absolute;inset:0;border-radius:50%;border:1px solid transparent;transition:border-color .15s,background .15s}
.sel .kk-avatar-picker-sock{border:1px dashed var(--ice-400,#7fb4e0);background:var(--ice-50,#f2f8fe)}
.kk-avatar-picker-dot{position:absolute;inset:0;margin:auto;width:6px;height:6px;border-radius:50%;background:var(--ice-400,#7fb4e0);display:none}
.sel .kk-avatar-picker-dot{display:block}
.kk-avatar-picker-sf{position:absolute;inset:0;overflow:hidden;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(14,34,54,.12);transition:box-shadow .15s}
.sel .kk-avatar-picker-sf{display:none}
.kk-avatar-picker-slot:not(.sel):hover .kk-avatar-picker-sf{box-shadow:0 0 0 2px var(--ice-300,#a5cdee),inset 0 0 0 1px rgba(14,34,54,.12)}
.kk-avatar-picker-slot.gone .kk-avatar-picker-sf{visibility:hidden}
.kk-avatar-picker-dice{width:40px;height:40px;flex-shrink:0;display:grid;place-items:center;border-radius:50%;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--mut,#4a6f93);cursor:pointer;padding:0;outline:none;transition:background .15s,color .15s}
.kk-avatar-picker-dice:hover{background:var(--ice-100,#e3f0fb);color:var(--ink,#0e2236)}
.kk-avatar-picker-dice span{display:grid;place-items:center}
.kk-avatar-picker-dice .ico{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.kk-avatar-picker-lab{display:block;margin-top:18px;font-size:13px;font-weight:600}
.kk-avatar-picker-in{display:block;box-sizing:border-box;width:100%;height:42px;margin-top:8px;padding:0 12px;border-radius:9px;border:1px solid var(--line,#d3e6f6);background:#fff;color:var(--ink,#0e2236);font:inherit;font-size:16px;outline:none;transition:border-color .15s,box-shadow .15s}
.kk-avatar-picker-in:focus-visible{border-color:var(--ice-500,#4a95d2);box-shadow:0 0 0 3px rgba(74,149,210,.2)}
.kk-avatar-picker-go{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:42px;margin-top:14px;border:0;border-radius:9px;background:var(--ice-700,#1f5f9b);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;outline:none;transition:background .15s}
.kk-avatar-picker-go:hover:not(:disabled){background:var(--ice-800,#164a7c)}
.kk-avatar-picker-go:disabled{opacity:.4;cursor:not-allowed}
.kk-avatar-picker-go .ico{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s}
.kk-avatar-picker-go:hover .ico{transform:translateX(2px)}
.kk-avatar-picker-fly{position:absolute;z-index:5;overflow:hidden;border-radius:50%;transform-origin:0 0;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(14,34,54,.12)}
.kk-avatar-picker-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.kk-avatar-picker-saved{margin:10px 0 0;font-size:12px;color:var(--mut,#4a6f93);text-align:center;min-height:16px}
`);
  const d = disposer(); const rm = reduced();
  let name = 'Marina Duarte', selected = 0, focusIndex = 0, slots = Array.from({ length: SLOTS }, (_, i) => i * 7);
  let angle = 0, curStep = 0, spinning = false, sp = null, dragSt = null, flying = 0;
  const variantNow = () => slots[selected];
  const seedAt = (v) => avatarSeed(name, v);

  // ---- moeda: discos empilhados em 3D que giram em torno do eixo vertical e trocam de rosto ao passar de lado
  const coinFace = makeMorphingFace(seedAt(slots[0]), d, rm);
  const shade = h('div', { class: 'kk-avatar-picker-shade', 'aria-hidden': 'true' });
  const spinEl = h('div', { class: 'kk-avatar-picker-spin', role: 'img' },
    [6, 5, 4, 3, 2, 1].map((z) => h('div', { class: 'kk-avatar-picker-disc', 'aria-hidden': 'true', style: `transform:translateZ(-${z}px)` })),
    h('div', { class: 'kk-avatar-picker-front' }, coinFace.el, shade));
  const coin = h('div', { class: 'kk-avatar-picker-coin', tabindex: '0', 'aria-label': 'Girar avatar (arraste, toque ou use as setas)' }, spinEl);

  const bezel = svg('svg', { class: 'kk-avatar-picker-bezel', viewBox: `0 0 ${BEZEL} ${BEZEL}`, 'aria-hidden': 'true' });
  for (let i = 0; i < TICKS; i++) {
    const a = i / TICKS * Math.PI * 2, long = i % 5 === 0, r1 = BEZEL / 2 - 3, r0 = r1 - (long ? 7 : 4), c = BEZEL / 2;
    bezel.append(svg('line', { x1: round2(c + Math.sin(a) * r0), y1: round2(c - Math.cos(a) * r0), x2: round2(c + Math.sin(a) * r1), y2: round2(c - Math.cos(a) * r1), stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-opacity': long ? 1 : .6, 'stroke-width': long ? 1.5 : 1 }));
  }
  const bezelBox = h('div', { class: 'kk-avatar-picker-bezelbox' }, bezel, h('div', { class: 'kk-avatar-picker-index', 'aria-hidden': 'true' }), coin);
  const whoName = h('b'), whoNo = h('span');
  const top = h('div', { class: 'kk-avatar-picker-top' }, bezelBox, h('div', { class: 'kk-avatar-picker-who' }, whoName, whoNo));

  // ---- opções (5 encaixes) e dado
  const slotEls = slots.map((v, i) => {
    const face = makeMorphingFace(seedAt(v), d, rm);
    const btn = h('button', { type: 'button', class: 'kk-avatar-picker-slot', 'aria-pressed': 'false', onclick: () => choose(i), onfocus: () => { focusIndex = i; paintSlots(); }, onkeydown: onSlotKey },
      h('span', { class: 'kk-avatar-picker-sock', 'aria-hidden': 'true' }), h('span', { class: 'kk-avatar-picker-dot', 'aria-hidden': 'true' }), h('span', { class: 'kk-avatar-picker-sf', 'aria-hidden': 'true' }, face.el));
    return { btn, face, sf: btn.querySelector('.kk-avatar-picker-sf') };
  });
  const dice = h('span'); dice.append(icon('sparkle'));
  const diceBtn = h('button', { type: 'button', class: 'kk-avatar-picker-dice', 'aria-label': 'Sortear outro avatar', title: 'Sortear', onclick: () => shuffle() }, dice);
  const row = h('div', { class: 'kk-avatar-picker-row' }, h('div', { class: 'kk-avatar-picker-slots', role: 'toolbar', 'aria-label': 'Opções de avatar' }, slotEls.map((s) => s.btn)), diceBtn);

  const uid = 'kk-avatar-picker-n' + Math.random().toString(36).slice(2, 7);
  const input = h('input', { class: 'kk-avatar-picker-in', id: uid, type: 'text', autocomplete: 'name', maxlength: 32, placeholder: 'Seu nome', spellcheck: 'false', value: name, oninput: () => setName(input.value) });
  const go = h('button', { type: 'button', class: 'kk-avatar-picker-go', onclick: () => finish() }, 'Continuar', icon('arrow'));
  const saved = h('p', { class: 'kk-avatar-picker-saved', 'aria-live': 'polite' });
  const live = h('p', { class: 'kk-avatar-picker-sr', 'aria-live': 'polite' });
  const card = h('div', { class: 'kk-avatar-picker-card' }, h('h3', 'Escolha seu avatar'), h('p', { class: 'sub' }, 'Criado a partir do seu nome. Gire a moeda ou escolha uma opção.'),
    top, row, h('label', { class: 'kk-avatar-picker-lab', for: uid }, 'Nome de exibição'), input, go, saved, live);
  const root = h('div', { class: 'kk-avatar-picker-root' }, card); stage.append(root); d(() => root.remove());

  function finish() {
    const label = `${name.trim()} · nº ${pad3(variantNow())}`;
    saved.textContent = `Avatar salvo: ${label}.`; toast(`Avatar salvo para ${name.trim()}.`, 'ok');
  }
  function paintSlots() {
    slotEls.forEach((s, i) => {
      s.btn.classList.toggle('sel', i === selected); s.btn.setAttribute('aria-pressed', String(i === selected)); s.btn.tabIndex = i === focusIndex ? 0 : -1;
      s.btn.setAttribute('aria-label', `Opção ${i + 1}: ${s.face.description}`);
    });
  }
  function onSlotKey(e) {
    const mv = { ArrowRight: focusIndex + 1, ArrowDown: focusIndex + 1, ArrowLeft: focusIndex - 1, ArrowUp: focusIndex - 1, Home: 0, End: SLOTS - 1 }[e.key];
    if (mv === undefined) return; e.preventDefault();
    focusIndex = (mv + SLOTS) % SLOTS; paintSlots(); slotEls[focusIndex].btn.focus();
  }
  function announce() { live.textContent = `Avatar: ${coinFace.description}`; }

  // ---- ângulo → visual (bisel gira por baixo, dado rola, moeda se dobra em -90..90)
  function setAngle(a) {
    angle = a;
    const step = Math.round(a / 180), tilt = a - 180 * Math.round(a / 180);
    if (step !== curStep) { curStep = step; coinFace.setSeed(seedAt(variantNow() + step), false); }
    spinEl.style.transform = `rotateY(${round2(tilt)}deg)`; shade.style.opacity = round2(Math.abs(tilt) / 90 * 0.35);
    bezel.style.transform = `rotate(${round2(a / 15)}deg)`; dice.style.transform = `rotate(${round2(a / 4)}deg)`;
    const shownV = variantNow() + curStep; whoNo.textContent = `Nº ${pad3(shownV)}`;
    spinEl.setAttribute('aria-label', `Avatar selecionado: ${createFace(seedAt(shownV)).description}`);
  }
  function stopSpin() { sp?.(); sp = null; }
  d(stopSpin);
  function land() {
    stopSpin();
    const s = Math.round(angle / 180); spinning = false;
    slots[selected] += s; angle = 0; curStep = 0;
    setAngle(0); slotEls[selected].face.setSeed(seedAt(variantNow()), false);
    if (s !== 0) announce();
  }
  function spinTo(steps, k, c, velocity) {
    stopSpin(); spinning = true; const target = steps * 180; let v = velocity;
    sp = loop((dt) => {
      const sub = Math.max(1, Math.ceil(dt / 0.008)), hh = dt / sub;
      for (let i = 0; i < sub; i++) { v += (-k * (angle - target) - c * v) * hh; angle += v * hh; }
      setAngle(angle);
      if (Math.abs(angle - target) < 0.5 && Math.abs(v) < 4) land();
    });
  }
  function jumpBy(steps) { stopSpin(); angle = steps * 180; land(); }

  // ---- arrastar a moeda de lado para girar; ao soltar ela segue com o embalo
  coin.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || flying) return;
    stopSpin(); spinning = true; coin.setPointerCapture(e.pointerId);
    dragSt = { id: e.pointerId, x: e.clientX, start: angle, moved: false, samples: [{ x: e.clientX, t: e.timeStamp }] };
  });
  coin.addEventListener('pointermove', (e) => {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    const dx = e.clientX - dragSt.x; if (Math.abs(dx) > TAP_SLOP) dragSt.moved = true;
    setAngle(dragSt.start + dx * DEG_PER_PX);
    dragSt.samples.push({ x: e.clientX, t: e.timeStamp }); if (dragSt.samples.length > 6) dragSt.samples.shift();
  });
  const dragEnd = (e) => {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    const s = dragSt; dragSt = null; const cur = angle; let target, velocity;
    if (s.moved) {
      const first = s.samples[0], dt = Math.max(16, e.timeStamp - first.t) / 1000; velocity = (e.clientX - first.x) / dt * DEG_PER_PX;
      const start = Math.round(s.start / 180), proj = Math.round((cur + velocity * 0.28) / 180);
      target = Math.max(start - MAX_FLICK, Math.min(start + MAX_FLICK, proj));
    } else { target = Math.round(cur / 180) + 1; velocity = 900; }  // toque vira para o próximo rosto
    rm ? jumpBy(target) : spinTo(target, 140, 22, velocity);
  };
  coin.addEventListener('pointerup', dragEnd); coin.addEventListener('pointercancel', dragEnd);
  coin.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); const dirn = e.key === 'ArrowLeft' ? -1 : 1, t = Math.round(angle / 180) + dirn;
      rm ? jumpBy(t) : spinTo(t, 140, 22, 900 * dirn);
    }
  });

  function shuffle() {
    const cur = Math.round(angle / 180), steps = 5 + Math.floor(Math.random() * 4);
    rm ? jumpBy(cur + steps) : spinTo(cur + steps, 50, 11, steps * 180 * 1.6);
  }

  // ---- escolher outra opção: o rosto voa do encaixe para a moeda e o anterior volta ao seu encaixe
  const rel = (el) => { const r = el.getBoundingClientRect(), b = card.getBoundingClientRect(); return { left: r.left - b.left, top: r.top - b.top, w: r.width }; };
  function fly(seed, from, to, done) {
    const art = makeMorphingFace(seed, d, true);
    const el = h('div', { class: 'kk-avatar-picker-fly', style: `left:${from.left}px;top:${from.top}px;width:${from.w}px;height:${from.w}px` }, art.el);
    card.append(el);
    const s = to.w / from.w;
    el.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${s})` }], { duration: 450, easing: FLY_EASE, fill: 'forwards' }).onfinish = () => { el.remove(); done(); };
  }
  function choose(index) {
    if (index === selected || flying) return;
    if (spinning) { stopSpin(); land(); }
    const prev = selected, prevSeed = seedAt(slots[prev]), nextSeed = seedAt(slots[index]);
    const coinR = rel(coin), fromSlot = rel(slotEls[index].sf), toSlot = rel(slotEls[prev].btn);
    selected = index; focusIndex = index; curStep = 0;
    coinFace.setSeed(nextSeed, false); setAngle(0); paintSlots(); announce();
    if (rm) return;
    flying = 2; coin.classList.add('hide'); slotEls[prev].btn.classList.add('gone');
    const end = () => { if (--flying) return; coin.classList.remove('hide'); slotEls[prev].btn.classList.remove('gone'); };
    fly(nextSeed, fromSlot, coinR, end); fly(prevSeed, coinR, { ...toSlot, w: toSlot.w }, end);
  }

  function setName(next) {
    name = next; whoName.textContent = name.trim() || 'Anônimo';
    coinFace.setSeed(seedAt(variantNow() + curStep), !spinning);
    slotEls.forEach((s, i) => s.face.setSeed(seedAt(i === selected ? variantNow() : slots[i]), true));
    go.disabled = name.trim().length < MIN_NAME; paintSlots();
  }

  // ---- olhos vivos: seguem o ponteiro e piscam de vez em quando, só enquanto o componente está visível
  const lx = spring(0, { k: 180, c: 18 }), ly = spring(0, { k: 180, c: 18 });
  let active = false, stopEyes = null, blinkT = 0, openT = 0, onScreen = false;
  const onMove = (e) => {
    const b = coin.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2), dist = Math.hypot(dx, dy) || 1, reach = Math.min(1, dist / 220);
    lx.to(dx / dist * reach * 1.8); ly.to(dy / dist * reach * 1.3);
  };
  const blinkLoop = () => {
    coinFace.art.blink.style.transform = 'scaleY(.1)';
    openT = setTimeout(() => { coinFace.art.blink.style.transform = ''; }, 120);
    blinkT = setTimeout(blinkLoop, 2600 + Math.random() * 3400);
  };
  function setActive(on) {
    if (on === active || rm) return; active = on;
    if (on) {
      window.addEventListener('pointermove', onMove, { passive: true }); blinkT = setTimeout(blinkLoop, 1800);
      stopEyes = loop((dt) => { coinFace.art.look.setAttribute('transform', `translate(${round2(lx.step(dt))} ${round2(ly.step(dt))})`); }, { fps: 30 });
    } else {
      window.removeEventListener('pointermove', onMove); clearTimeout(blinkT); clearTimeout(openT); stopEyes?.(); stopEyes = null; coinFace.art.blink.style.transform = '';
    }
  }
  const io = new IntersectionObserver(([en]) => { onScreen = !!en?.isIntersecting; setActive(onScreen && !document.hidden); });
  io.observe(root);
  const vis = () => setActive(onScreen && !document.hidden); document.addEventListener('visibilitychange', vis);
  d(() => { io.disconnect(); document.removeEventListener('visibilitychange', vis); setActive(false); });

  setName(name); setAngle(0); paintSlots();
  return () => d.run();
}
