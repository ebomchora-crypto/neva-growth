// Fundo "Gradient Wave" (componente gradient-wave.tsx, malha WebGL com ruído simplex), em JS puro.
// Mesmas ideias do original: plano com ceil(w*0.02) x ceil(h*0.05) segmentos, cor por vértice em camadas
// (u_waveLayers), tempo avançando min(dt, 1000/15). Aqui o canvas segue o tamanho do próprio contêiner,
// pausa fora da tela/aba oculta, reconstrói após perda de contexto e, com "reduzir movimento", desenha um quadro só.
const VERT = `
precision highp float;
attribute vec2 a_uv;
uniform vec2 u_size;
uniform float u_time;
uniform vec3 u_colors[8];
uniform float u_count;
uniform vec2 u_freq;
uniform float u_flow;
uniform float u_speed;
uniform float u_incline;
uniform float u_shadow;
uniform float u_darken;
varying vec3 v_color;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec2 p = a_uv * u_size;
  p.y += (a_uv.x - 0.5) * u_size.x * u_incline;          // inclinação das faixas
  vec3 col = u_colors[0];
  for (int i = 1; i < 8; i++) {
    if (float(i) >= u_count) break;
    float fi = float(i);
    float k = 1.0 + fi * 0.18;
    float n = snoise(vec3(p.x * u_freq.x * k + u_time * u_flow * u_speed * 40.0 + fi * 11.7,
                          p.y * u_freq.y * k * 0.55 - fi * 3.1,
                          u_time * u_speed + fi * 5.3)) * 0.5 + 0.5;
    col = mix(col, u_colors[i], smoothstep(0.38, 0.78, n));
  }
  float edge = abs(a_uv.y - 0.5) * 2.0;
  col *= 1.0 - 0.45 * pow(edge, max(u_shadow, 1.0) * 0.5);   // sombra nas bordas, p/ o texto respirar
  col *= 1.0 - u_darken * pow(1.0 - a_uv.y, 2.0);
  v_color = col;
  gl_Position = vec4(a_uv.x * 2.0 - 1.0, 1.0 - a_uv.y * 2.0, 0.0, 1.0);
}`;
const FRAG = `precision mediump float; varying vec3 v_color; void main(){ gl_FragColor = vec4(v_color, 1.0); }`;

const DEF = { colors: ['#38bdf8', '#ffffff', '#38bdf8', '#ffffff', '#38bdf8', '#ffffff'], shadowPower: 8, darkenTop: false,
  noiseSpeed: 0.00001, noiseFrequency: [0.0001, 0.0009], deform: { incline: 0.5, noiseAmp: 250, noiseFlow: 5 } };

function rgb(hex) {
  const s = String(hex).replace('#', ''); const v = s.length === 3 ? s.replace(/./g, (c) => c + c) : s;
  const n = parseInt(v, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

/** Retorna { el, destroy } ou null sem WebGL. opts: colors, shadowPower, darkenTop, noiseSpeed, noiseFrequency, deform, pixelRatio, className, onFirstFrame. */
export function gradientWave(opts = {}) {
  const o = { ...DEF, ...opts, deform: { ...DEF.deform, ...(opts.deform || {}) } };
  const colors = (o.colors.length ? o.colors : DEF.colors).slice(0, 8);
  const canvas = document.createElement('canvas');
  canvas.className = o.className || ''; canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;

  let prog = null; let loc = {}; let vbo = null; let ibo = null; let count = 0;
  let w = 0; let h = 0; let cols = 0; let rows = 0;
  let time = 0; let last = 0; let raf = 0; let visible = true; let disposed = false; let first = false; let lost = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat = new Float32Array(24); colors.forEach((c, i) => flat.set(rgb(c), i * 3));

  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  function init() {
    const vs = shader(gl.VERTEX_SHADER, VERT); const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    loc = {}; for (const n of ['u_size', 'u_time', 'u_colors', 'u_count', 'u_freq', 'u_flow', 'u_speed', 'u_incline', 'u_shadow', 'u_darken']) loc[n] = gl.getUniformLocation(prog, n);
    loc.a = gl.getAttribLocation(prog, 'a_uv');
    vbo = gl.createBuffer(); ibo = gl.createBuffer(); cols = rows = 0; // malha refeita no próximo resize
    gl.uniform3fv(loc.u_colors, flat); gl.uniform1f(loc.u_count, colors.length);
    gl.uniform2f(loc.u_freq, o.noiseFrequency[0], o.noiseFrequency[1]);
    gl.uniform1f(loc.u_flow, o.deform.noiseFlow); gl.uniform1f(loc.u_speed, o.noiseSpeed);
    gl.uniform1f(loc.u_incline, o.deform.incline); gl.uniform1f(loc.u_shadow, o.shadowPower); gl.uniform1f(loc.u_darken, o.darkenTop ? 0.5 : 0);
    return true;
  }
  function mesh(cw, ch) { // ceil(w*0.02) x ceil(h*0.05) segmentos, com teto p/ não pesar em telas grandes
    const c = Math.min(60, Math.max(8, Math.ceil(cw * 0.02))); const r = Math.min(60, Math.max(8, Math.ceil(ch * 0.05)));
    if (c === cols && r === rows) return; cols = c; rows = r;
    const v = new Float32Array((c + 1) * (r + 1) * 2); let k = 0;
    for (let y = 0; y <= r; y++) for (let x = 0; x <= c; x++) { v[k++] = x / c; v[k++] = y / r; }
    const idx = new Uint16Array(c * r * 6); k = 0;
    for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) { const a = y * (c + 1) + x; const b = a + 1; const d = a + c + 1; const e = d + 1; idx.set([a, b, d, b, e, d], k); k += 6; }
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.a); gl.vertexAttribPointer(loc.a, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW); count = idx.length;
  }
  function draw() {
    if (lost || !prog) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(loc.u_size, w, h); gl.uniform1f(loc.u_time, time);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    if (!first) { first = true; o.onFirstFrame?.(); }
  }
  function size() {
    const cw = canvas.clientWidth; const ch = canvas.clientHeight; if (!cw || !ch) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2) * (o.pixelRatio ?? 0.5);
    canvas.width = Math.max(2, Math.round(cw * ratio)); canvas.height = Math.max(2, Math.round(ch * ratio));
    w = cw; h = ch; mesh(cw, ch);
    if (reduced || !raf) draw();
  }
  function loop(now) {
    raf = 0; if (disposed || !visible || document.hidden) return;
    const dt = last ? Math.min(now - last, 1000 / 15) : 0; last = now; time += dt;
    draw(); raf = requestAnimationFrame(loop);
  }
  function play() { if (reduced || raf || disposed || !visible || document.hidden) return; last = 0; raf = requestAnimationFrame(loop); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  if (!init()) return null;
  time = reduced ? 60000 : 20000; // começa já "no meio" da onda
  const ro = new ResizeObserver(size); ro.observe(canvas);
  const io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; visible ? play() : stop(); });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : play()); document.addEventListener('visibilitychange', onVis);
  const onLost = (e) => { e.preventDefault(); lost = true; stop(); };
  const onRestored = () => { if (disposed) return; lost = false; first = false; if (init()) { size(); play(); } };
  canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
  requestAnimationFrame(() => { size(); play(); });

  return { el: canvas, destroy() {
    disposed = true; stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } };
}
