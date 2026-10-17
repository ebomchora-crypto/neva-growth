// Fundo da plataforma: shader WebGL de ondas suaves (port em JavaScript puro do componente "ShaderBackground"
// do 21st.dev: este projeto não usa React/Tailwind/TypeScript). Paleta claro-gelo da Neva, sem dependências.
// Anima só quando as animações estão ligadas; senão desenha um único quadro estático.
const VERT = `attribute vec2 a_position;
void main(){ gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 u_colors[8];
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, unused
uniform vec4 u_space;      // offset.xy
#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_offset u_space.xy

float hash21(vec2 p){
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y);
}
float grainHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.2); a *= 0.5; } return v; }
vec3 palette(float x){
  float n = max(u_colorCount - 1.0, 1.0); float f = clamp(x, 0.0, 1.0) * n; vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++){ if (float(i) < n) col = mix(col, u_colors[i + 1], smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0))); }
  return col;
}
vec3 hueRotate(vec3 col, float a){
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col; float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca); return toRGB * yiq;
}
vec3 shade(vec2 uv, vec2 p, float t){
  float y = uv.y + sin(uv.x * (3.0 + u_intensity * 9.0) + t * 0.8) * 0.08 + (fbm(p * 2.0 + t * 0.1) - 0.5) * u_intensity * 0.6;
  return palette(y);
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy; vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  if (abs(u_rotate) > 0.0001){ float cr = cos(u_rotate), sr = sin(u_rotate); p = mat2(cr, -sr, sr, cr) * p; }
  p += u_offset;
  if (u_drift > 0.0001) p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) p += u_warp * (vec2(fbm(p * u_detail + u_seed), fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  vec3 col;
  if (u_blur > 0.0){
    float e = u_blur; float pe = e * u_scale; vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else col = shade(uv, p, u_time);
  if (abs(u_contrast - 1.0) > 0.0001) col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001){ float luma = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(luma), col, u_saturation); }
  if (abs(u_hue) > 0.0001) col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001) col += u_brightness;
  if (u_vignette > 0.0001){ float vd = length(screenUv - 0.5) * 1.41421356; col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd); }
  if (u_grain > 0.0001) col += (grainHash(gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
// mesmas ondas do componente original, com a paleta clara e delicada da Neva (azul-gelo → branco)
const U = {
  colors: ['#cfe3f6', '#bcd8f1', '#dcebf9', '#f2f8fd', '#e4f0fb', '#f2f8fd', '#f2f8fd', '#f2f8fd'].map(hex), colorCount: 5,
  scale: 2.0, intensity: 0.54, paramA: 0.47, warp: 0.042, detail: 1.536, contrast: 1.3, brightness: 0.0, saturation: 1.0, hue: 0.0,
  vignette: 0.0, blur: 0.0, grain: 0.03, seed: 4012.0, rotate: 5.6549, offsetX: 0.11, offsetY: -0.19, drift: 0.116, timeScale: -0.727
};

let state = null;
export const shaderBg = {
  /** Cria o canvas fixo atrás de tudo. `animate` liga a animação; sem WebGL, mantém só a cor de fundo. */
  init(animate = true) {
    if (navigator.webdriver) animate = false; // automação de testes: um quadro só (renderização por software é lenta)
    if (state) return this.setAnimated(animate);
    const canvas = document.createElement('canvas'); canvas.className = 'shaderbg'; canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); const vs = compile(gl.VERTEX_SHADER, VERT); const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[shader] falha ao compilar; usando cor sólida'); return; }
    gl.deleteShader(vs); gl.deleteShader(fs); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(['colors', 'scene', 'shape', 'surface', 'finish', 'transform', 'space'].map((k) => [k, gl.getUniformLocation(prog, 'u_' + k)]));
    gl.uniform3fv(u.colors, new Float32Array(U.colors.flat()));
    gl.uniform4f(u.shape, U.scale, U.intensity, U.paramA, U.warp); gl.uniform4f(u.surface, U.detail, U.contrast, U.brightness, U.saturation);
    gl.uniform4f(u.finish, U.hue, U.vignette, U.blur, U.grain); gl.uniform4f(u.transform, U.seed, U.rotate, U.drift, 0); gl.uniform4f(u.space, U.offsetX, U.offsetY, 0, 0);
    document.body.prepend(canvas);
    const S = state = { canvas, gl, u, raf: 0, animate, t0: performance.now(), frozen: 0, visible: document.visibilityState === 'visible' };
    const size = () => {
      // ao fundo e sem detalhes finos, 0,5–0,9 Mpx bastam (e poupam bateria no celular)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); const rw = Math.max(1, Math.round(innerWidth * dpr)); const rh = Math.max(1, Math.round(innerHeight * dpr));
      const k = Math.min(1, Math.sqrt((innerWidth < 860 ? 250000 : 500000) / (rw * rh))); const w = Math.max(1, Math.round(rw * k)); const h = Math.max(1, Math.round(rh * k));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    S.draw = (now) => {
      size(); const t = S.animate ? ((now - S.t0) / 1000) * U.timeScale : S.frozen;
      gl.uniform4f(u.scene, canvas.width, canvas.height, t, U.colorCount); gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    S.last = 0;
    S.loop = (now) => { S.raf = 0; if (!S.animate || !S.visible) return; if (now - S.last >= 33) { S.last = now; S.draw(now); } S.raf = requestAnimationFrame(S.loop); };
    addEventListener('resize', () => { if (!S.animate) S.draw(performance.now()); });
    document.addEventListener('visibilitychange', () => { S.visible = document.visibilityState === 'visible'; if (S.visible && S.animate && !S.raf) S.raf = requestAnimationFrame(S.loop); });
    this.setAnimated(animate);
  },
  setAnimated(on) {
    const S = state; if (!S) return; if (navigator.webdriver) on = false; S.animate = !!on; cancelAnimationFrame(S.raf); S.raf = 0;
    if (S.animate) { S.t0 = performance.now() - S.frozen / (U.timeScale || -1) * 1000; S.raf = requestAnimationFrame(S.loop); }
    else { S.draw(performance.now()); }
  }
};
