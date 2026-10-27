import{c as Re,i as wt,j as Ie,l as ut,m as ft}from"./chunks/chunk-6IYH4WPJ.js";var Z=Re(wt(),1),K=Re(Ie(),1),W=1100,xt=380,gt=10,Q=W/(2*xt),kt=5,q=4,dt=.55,Qe=W*.75,Ze=.42,We={small:{h:36,px:16,fs:13,k:.82},medium:{h:44,px:22,fs:14,k:1},large:{h:52,px:26,fs:16,k:1.18},"extra-large":{h:60,px:30,fs:18,k:1.36}},M=(t,h,R)=>Math.min(R,Math.max(h,t)),le=(t,h)=>Number.isFinite(Number(t))&&t!==null&&t!==""?Number(t):h,ye=t=>{let h=M(t,0,1);return h*h*(3-2*h)},pt=t=>{let h=M(t,0,1);return h*h*h*(10+h*(6*h-15))},ht=t=>{let h=M(t,0,1);return 30*h*h*(1-h)*(1-h)},Tt=t=>{let h=M(t,0,1);return 60*h*(1-h)*(1-2*h)},Ve=(t,h)=>Math.sin(t*1.31+h)*.5+Math.sin(t*2.73+h*1.7)*.3+Math.sin(t*5.19+h*2.3)*.2,Mt=(t,h)=>Math.cos(t*1.31+h)*.655+Math.cos(t*2.73+h*1.7)*.819+Math.cos(t*5.19+h*2.3)*1.038,vt=t=>{let h=String(t||"").replace("#",""),R=h.length===3?h.replace(/(.)/g,"$1$1"):h.padEnd(6,"0").slice(0,6),J=parseInt(R,16);return Number.isFinite(J)?[(J>>16&255)/255,(J>>8&255)/255,(J&255)/255]:[1,1,1]},Ct=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,re=`#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
`,et=`
uniform vec4 uJetA[${q}];
uniform vec4 uJetB[${q}];
uniform float uJetBend[${q}];
float jetWeight(vec2 p, vec4 a, vec4 b, out float along) {
  vec2 rel = p - a.xy;
  along = dot(rel, a.zw);
  vec2 off = rel - a.zw * clamp(along, 0.0, b.z);
  return exp(-dot(off, off) / (b.y * b.y)) * smoothstep(-b.y, 0.0, along);
}
`,tt=`
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`,Lt=`${re}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uWorld;
uniform float uDt;
uniform float uKeep;
void main() {
  vec2 v = textureLod(uVelocity, vUv, 0.0).xy;
  if (!(abs(v.x) < 4000.0 && abs(v.y) < 4000.0)) v = vec2(0.0);
  vec4 c = textureLod(uSource, vUv - uDt * v / uWorld, 0.0) * uKeep;
  outColor = all(lessThan(abs(c), vec4(1e4))) ? c : vec4(0.0);
}`,Et=`${re}
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform vec2 uWorld;
uniform float uDt;
uniform float uBuoyancy;
uniform float uLift;
uniform float uDamping;
uniform float uSpread;
uniform float uSplash;
uniform float uFriction;
uniform float uWind;
uniform vec3 uKick;
uniform vec4 uCraft;
uniform vec4 uCraftMotion;
uniform vec2 uTurb;
uniform float uTime;
uniform float uObstacle;
${et}
${tt}
vec2 curlNoise(vec2 p) {
  float e = 0.35;
  float a = noise(p + vec2(0.0, e));
  float b = noise(p - vec2(0.0, e));
  float c = noise(p + vec2(e, 0.0));
  float d = noise(p - vec2(e, 0.0));
  return vec2(a - b, d - c) / (2.0 * e);
}
void main() {
  vec2 p = vUv * uWorld;
  vec2 v = textureLod(uVelocity, vUv, 0.0).xy;
  vec2 d = textureLod(uDye, vUv, 1.0).xy;
  float smokeHere = smoothstep(0.02, 0.4, d.x + d.y);
  vec2 tq = p / uTurb.y;
  vec2 turb = curlNoise(tq + vec2(uTime * 0.21, -uTime * 0.37)) + 0.5 * curlNoise(tq * 2.3 + vec2(-uTime * 0.53, uTime * 0.29) + 7.0);
  v += turb * uTurb.x * smokeHere * uDt;
  v.y += (uBuoyancy * d.y + uLift * d.x) * uDt;
  v /= 1.0 + uDamping * uDt;
  v.x /= 1.0 + uFriction * exp(-p.y / 18.0) * uDt;
  v.x += (uWind - v.x) * (1.0 - exp(-0.35 * uDt)) * smoothstep(0.0, 60.0, p.y);
  for (int i = 0; i < ${q}; i++) {
    vec4 b = uJetB[i];
    if (b.w <= 0.0) continue;
    vec4 a = uJetA[i];
    vec2 rel = p - a.xy;
    float along = dot(rel, a.zw);
    float across = dot(rel, vec2(-a.w, a.z));
    float reach = a.w < -0.2 ? a.y / -a.w : max(b.z, 1.0);
    float bn = clamp(along / max(reach, 1.0), 0.0, 1.0);
    across -= uJetBend[i] * bn * bn;
    vec2 dir = normalize(a.zw + vec2(-a.w, a.z) * (2.0 * uJetBend[i] * bn / max(reach, 1.0)));
    float sN = clamp(along / max(b.z, 1.0), 0.0, 1.0);
    float R = b.y + uSpread * clamp(along, 0.0, b.z);
    float wr = exp(-across * across / (R * R));
    float wa = smoothstep(-b.y, 0.0, along) * (1.0 - smoothstep(0.55, 1.0, sN));
    float rate = mix(46.0, 7.0, sN);
    float w = (1.0 - exp(-uDt * rate)) * wr * wa * clamp(b.w * 3.0, 0.0, 1.0);
    float U = b.x * sqrt(b.y / R);
    v = mix(v, dir * U, w);
  }
  for (int i = 0; i < ${q}; i++) {
    vec4 b = uJetB[i];
    if (b.w <= 0.0) continue;
    vec4 a = uJetA[i];
    if (a.w > -0.2) continue;
    float reach = a.y / -a.w;
    float gx = a.x + a.z * reach - a.w * uJetBend[i];
    float near = exp(-reach / uKick.x);
    float sx = uKick.y + reach * 0.25;
    float kx = (p.x - gx) / (sx * 1.6);
    float ky = p.y / (uKick.z * 1.5);
    float k = exp(-kx * kx - ky * ky);
    float side = clamp((p.x - gx) / sx, -1.0, 1.0);
    v += uDt * uSplash * b.w * near * k * vec2(side * 0.7, 0.9);
  }
  vec2 q = p - uCraft.xy;
  float c = cos(uCraftMotion.z);
  float s = sin(uCraftMotion.z);
  vec2 lq = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  vec2 e = abs(lq) - uCraft.zw + uCraft.w;
  float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - uCraft.w;
  float inside = smoothstep(2.0, -2.0, sd) * uObstacle;
  vec2 cv = uCraftMotion.xy + uCraftMotion.w * vec2(-q.y, q.x);
  v = mix(v, cv, inside);
  float speed = length(v);
  if (!(speed < 1e5)) v = vec2(0.0);
  else if (speed > 2600.0) v *= 2600.0 / speed;
  outColor = vec4(v, 0.0, 1.0);
}`,St=`${re}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = textureLod(uVelocity, vUv - vec2(uTexel.x, 0.0), 0.0).y;
  float R = textureLod(uVelocity, vUv + vec2(uTexel.x, 0.0), 0.0).y;
  float B = textureLod(uVelocity, vUv - vec2(0.0, uTexel.y), 0.0).x;
  float T = textureLod(uVelocity, vUv + vec2(0.0, uTexel.y), 0.0).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,Dt=`${re}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uStrength;
uniform float uDt;
void main() {
  float L = textureLod(uCurl, vUv - vec2(uTexel.x, 0.0), 0.0).x;
  float R = textureLod(uCurl, vUv + vec2(uTexel.x, 0.0), 0.0).x;
  float B = textureLod(uCurl, vUv - vec2(0.0, uTexel.y), 0.0).x;
  float T = textureLod(uCurl, vUv + vec2(0.0, uTexel.y), 0.0).x;
  float C = textureLod(uCurl, vUv, 0.0).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= uStrength * C;
  f.y *= -1.0;
  vec2 v = textureLod(uVelocity, vUv, 0.0).xy + f * uDt;
  if (!(abs(v.x) < 4000.0 && abs(v.y) < 4000.0)) v = vec2(0.0);
  outColor = vec4(v, 0.0, 1.0);
}`,Rt=`${re}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  vec2 C = textureLod(uVelocity, vUv, 0.0).xy;
  float L = textureLod(uVelocity, vUv - vec2(uTexel.x, 0.0), 0.0).x;
  float R = textureLod(uVelocity, vUv + vec2(uTexel.x, 0.0), 0.0).x;
  float B = textureLod(uVelocity, vUv - vec2(0.0, uTexel.y), 0.0).y;
  float T = textureLod(uVelocity, vUv + vec2(0.0, uTexel.y), 0.0).y;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,mt=`
float pressureAt(sampler2D tex, vec2 uv, vec2 texel, float c, int side) {
  if (side == 0 && uv.x - texel.x < 0.0) return 0.0;
  if (side == 1 && uv.x + texel.x > 1.0) return 0.0;
  if (side == 2 && uv.y - texel.y < 0.0) return c;
  if (side == 3 && uv.y + texel.y > 1.0) return 0.0;
  vec2 o = side == 0 ? vec2(-texel.x, 0.0) : side == 1 ? vec2(texel.x, 0.0) : side == 2 ? vec2(0.0, -texel.y) : vec2(0.0, texel.y);
  return textureLod(tex, uv + o, 0.0).x;
}
`,Ut=`${re}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
${mt}
void main() {
  float C = textureLod(uPressure, vUv, 0.0).x;
  float L = pressureAt(uPressure, vUv, uTexel, C, 0);
  float R = pressureAt(uPressure, vUv, uTexel, C, 1);
  float B = pressureAt(uPressure, vUv, uTexel, C, 2);
  float T = pressureAt(uPressure, vUv, uTexel, C, 3);
  float div = textureLod(uDivergence, vUv, 0.0).x;
  float pr = (L + R + B + T - div) * 0.25;
  outColor = vec4(abs(pr) < 1e6 ? pr : 0.0, 0.0, 0.0, 1.0);
}`,At=`${re}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
${mt}
void main() {
  float C = textureLod(uPressure, vUv, 0.0).x;
  float L = pressureAt(uPressure, vUv, uTexel, C, 0);
  float R = pressureAt(uPressure, vUv, uTexel, C, 1);
  float B = pressureAt(uPressure, vUv, uTexel, C, 2);
  float T = pressureAt(uPressure, vUv, uTexel, C, 3);
  vec2 v = textureLod(uVelocity, vUv, 0.0).xy - 0.5 * vec2(R - L, T - B);
  if (vUv.y - uTexel.y < 0.0) v.y = max(v.y, 0.0);
  if (!(abs(v.x) < 4000.0 && abs(v.y) < 4000.0)) v = vec2(0.0);
  outColor = vec4(v, 0.0, 1.0);
}`,jt=`${re}
uniform sampler2D uSource;
uniform vec2 uStep;
void main() {
  vec2 c = textureLod(uSource, vUv, 0.0).xy * 0.2270270;
  c += textureLod(uSource, vUv + uStep * 1.3846154, 0.0).xy * 0.3162162;
  c += textureLod(uSource, vUv - uStep * 1.3846154, 0.0).xy * 0.3162162;
  c += textureLod(uSource, vUv + uStep * 3.2307692, 0.0).xy * 0.0702703;
  c += textureLod(uSource, vUv - uStep * 3.2307692, 0.0).xy * 0.0702703;
  outColor = vec4(c, 0.0, 1.0);
}`,Nt=`${re}
uniform sampler2D uSource;
uniform float uScale;
void main() {
  outColor = textureLod(uSource, vUv, 0.0) * uScale;
}`,$t=`${re}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uWorld;
uniform float uDt;
uniform vec2 uKeep;
uniform vec4 uRate;
uniform vec4 uCol;
uniform vec3 uKick;
uniform float uDisperse;
uniform float uDispV;
uniform vec4 uCraft;
uniform vec4 uCraftMotion;
uniform vec2 uGap;
uniform float uJetX[${q}];
uniform float uJetN;
uniform float uFloor;
uniform float uTime;
${et}
${tt}
void main() {
  vec2 v = textureLod(uVelocity, vUv, 0.0).xy;
  vec2 val = textureLod(uSource, vUv - uDt * v / uWorld, 0.0).xy * uKeep;
  val.x *= exp(-uDisperse * max(length(v) - uDispV, 0.0) * 0.01 * uDt);
  {
    vec2 q = vUv * uWorld - uCraft.xy;
    float c = cos(uCraftMotion.z);
    float sn = sin(uCraftMotion.z);
    vec2 lq = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y);
    float belly = uCraft.y - uCraft.w - 7.0;
    float depth = 0.68 * belly * smoothstep(40.0, 110.0, belly);
    float below = -lq.y - uCraft.w;
    float wy = smoothstep(-4.0, 6.0, below) * (1.0 - smoothstep(depth * 0.7, depth, below));
    float nearest = 1e4;
    float outer = 0.0;
    for (int k = 0; k < ${q}; k++) {
      if (float(k) >= uJetN) break;
      nearest = min(nearest, abs(lq.x - uJetX[k]));
      outer = max(outer, abs(uJetX[k]));
    }
    float wx = uGap.x > 1.0 ? smoothstep(uGap.x * 0.22, uGap.x * 0.4, nearest) * (1.0 - smoothstep(outer - uGap.x * 0.1, outer, abs(lq.x))) : 0.0;
    val.x *= exp(-uGap.y * wx * wy * uDt);
  }
  val.x = max(val.x - uFloor * uDt, 0.0);
  vec2 p = vUv * uWorld;
  for (int i = 0; i < ${q}; i++) {
    vec4 jb = uJetB[i];
    if (jb.w <= 0.0) continue;
    vec4 ja = uJetA[i];
    vec2 rel = p - ja.xy;
    float along = dot(rel, ja.zw);
    float across = dot(rel, vec2(-ja.w, ja.z));
    vec2 off = rel - ja.zw * clamp(along, 0.0, 6.0);
    float wn = exp(-dot(off, off) / (jb.y * jb.y)) * smoothstep(-jb.y, 0.0, along);
    float pulse = 0.6 + 0.8 * noise(vec2(uTime * 6.0 + float(i) * 13.1, along * 0.06 + float(i)));
    val.x += uRate.x * jb.w * wn * pulse * uDt;
    val.y += uRate.y * jb.w * wn * uDt;
    float reach = ja.w < -0.2 ? ja.y / -ja.w : 1e4;
    float sN = clamp(along / max(reach, 1.0), 0.0, 1.0);
    across -= uJetBend[i] * sN * sN;
    float R = uCol.y + uCol.x * clamp(along, 0.0, reach);
    float wc = exp(-across * across / (R * R)) * smoothstep(0.45, 0.8, sN) * (1.0 - step(reach + 2.0, along));
    float grain = 0.45 + 1.1 * noise(vec2(across * 0.12 + float(i) * 3.0, along * 0.05 - uTime * 9.0));
    val.x += uRate.w * jb.w * wc * grain * uDt;
    val.y += uRate.y * 0.25 * jb.w * wc * uDt;
    if (reach < 1e3) {
      float gx = ja.x + ja.z * reach - ja.w * uJetBend[i];
      float near = exp(-reach / uKick.x);
      float spread = uKick.y + reach * 0.25;
      float kx = (p.x - gx) / spread;
      float ky = p.y / uKick.z;
      float k = exp(-kx * kx - ky * ky);
      float g2 = 0.5 + noise(vec2(p.x * 0.08, uTime * 4.0 + float(i) * 9.0));
      val.x += uRate.z * jb.w * near * k * g2 * uDt;
      val.y += uRate.y * 0.4 * jb.w * near * k * uDt;
    }
  }
  if (!(val.x < 1e3 && val.y < 1e3 && val.x >= 0.0 && val.y >= 0.0)) val = vec2(0.0);
  outColor = vec4(val, 0.0, 1.0);
}`,Pt=`${re}
uniform sampler2D uDye;
uniform vec2 uWorld;
uniform vec2 uDyeSize;
uniform float uTime;
uniform float uLightTheme;
uniform vec3 uSmoke;
uniform vec3 uShade;
uniform vec3 uThrust;
uniform vec4 uLook;
uniform vec4 uLook2;
uniform vec4 uLook3;
uniform vec4 uCol;
uniform float uGamma;
uniform float uTone;
uniform vec3 uLight2;
uniform float uThreshold;
uniform float uScale;
uniform vec4 uCraft;
uniform vec4 uCraftMotion;
${et}
${tt}
float dens(vec2 p, float lod) {
  return textureLod(uDye, p / uWorld, lod).x;
}
float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}
float fbm2(vec2 p) {
  return noise(p) * 0.65 + noise(p * 2.13 + 17.0) * 0.35;
}
float flowNoise(float q, float xn, float t, float id, float rate) {
  float c = t / 0.7;
  float f1 = fract(c);
  float f2 = fract(c + 0.5);
  float k1 = floor(c);
  float k2 = floor(c + 0.5);
  float n1 = fbm2(vec2(q - f1 * 0.7 * rate + hash1(k1 + id * 7.0) * 41.0, xn * 1.15 + id * 3.7));
  float n2 = fbm2(vec2(q - f2 * 0.7 * rate + hash1(k2 + id * 7.0 + 0.5) * 41.0, xn * 1.15 + id * 3.7 + 11.0));
  float w1 = 1.0 - abs(2.0 * f1 - 1.0);
  float w2 = 1.0 - w1;
  return 0.5 + (n1 * w1 + n2 * w2 - 0.5) / sqrt(w1 * w1 + w2 * w2);
}
float column(vec2 p, vec4 a, float str, float id, float t, float bend, out float xn, out float s) {
  vec2 rel = p - a.xy;
  s = dot(rel, a.zw);
  float x = dot(rel, vec2(-a.w, a.z));
  float S = a.w < -0.2 ? a.y / -a.w : 1e4;
  float bn = clamp(s / max(S, 1.0), 0.0, 1.0);
  x -= bend * bn * bn;
  xn = 0.0;
  if (s < -4.0 || s > S + 6.0) return 0.0;
  float sc = clamp(s, 0.0, S);
  float R = uCol.y + uCol.x * sc;
  float flare = smoothstep(S - 32.0 * uScale, S + 2.0, sc);
  R *= 1.0 + 1.3 * flare * flare;
  xn = x / R;
  if (abs(xn) > 3.2) return 0.0;
  float q = log(1.0 + 0.22 * sc / (9.0 * uScale)) / 0.22;
  float lam = 9.0 * uScale + 0.22 * sc;
  float U = uCol.w * sqrt(str) * sqrt(uCol.y / R);
  float n = flowNoise(q, xn, t, id, U / lam);
  float amp = 0.12 + 0.5 * smoothstep(4.0, 70.0, sc);
  float u = abs(xn) * (1.0 - amp * (n - 0.5) * 1.8);
  float prof = exp(-u * u * 1.7);
  float dil = pow(uCol.y / R, 0.5);
  float onset = smoothstep(2.0 * uScale, 16.0 * uScale, s);
  float tail = 1.0 - smoothstep(S - 2.0, S + 6.0, s);
  return uCol.z * str * prof * dil * onset * tail * (0.7 + 0.6 * n);
}
float shape(vec2 p, float lod) {
  return log(1.0 + 3.0 * dens(p, lod));
}
void main() {
  vec2 p = vUv * uWorld;
  float texel = uWorld.x / uDyeSize.x;
  float D = textureLod(uDye, vUv, uLook.w).x;
  float heat = textureLod(uDye, vUv, 0.5).y;

  float e = uLook3.x;
  float lodN = max(log2(e / texel), 0.0) + uLook3.y;
  vec2 g = vec2(shape(p + vec2(e, 0.0), lodN) - shape(p - vec2(e, 0.0), lodN), shape(p + vec2(0.0, e), lodN) - shape(p - vec2(0.0, e), lodN)) / (2.0 * e);
  float e2 = e * 3.0;
  float lodB = lodN + 1.6;
  vec2 g2 = vec2(shape(p + vec2(e2, 0.0), lodB) - shape(p - vec2(e2, 0.0), lodB), shape(p + vec2(0.0, e2), lodB) - shape(p - vec2(0.0, e2), lodB)) / (2.0 * e2);
  vec3 nS = normalize(vec3(-(g * uLook3.z + g2 * uLook3.w) * uLook.y, 1.0));

  float colD = 0.0;
  vec2 colN = vec2(0.0);
  float colHot = 0.0;
  float colNear = 0.0;
  for (int i = 0; i < ${q}; i++) {
    vec4 jb = uJetB[i];
    if (jb.w <= 0.0) continue;
    vec4 ja = uJetA[i];
    float xn;
    float sa;
    float cd = column(p, ja, min(jb.w, 1.6), float(i), uTime, uJetBend[i], xn, sa);
    colD += cd;
    colN += vec2(-ja.w, ja.z) * clamp(xn, -1.6, 1.6) * cd;
    colHot += cd * exp(-max(sa, 0.0) / 45.0);
    colNear += cd * exp(-max(sa, 0.0) / 16.0);
  }
  float Dt = D + colD;
  float alpha = 1.0 - exp(-uLook.x * pow(max(D - uThreshold, 0.0) + colD, uGamma));
  vec2 cn = colD > 1e-5 ? colN / colD : vec2(0.0);
  vec3 nC = normalize(vec3(cn * 0.85, sqrt(max(1.0 - dot(cn, cn) * 0.72, 0.08))));
  float wC = colD / max(Dt, 1e-5);
  vec3 n = normalize(mix(nS, nC, wC));
  vec3 L = normalize(vec3(-0.38, 0.6, 0.72));
  float diff = clamp((dot(n, L) + uLook2.z) / (1.0 + uLook2.z), 0.0, 1.0);

  vec2 ld = normalize(L.xy);
  float tau = 0.0;
  float dist = 2.0;
  float stepLen = 3.0;
  for (int i = 0; i < 9; i++) {
    float lod = max(log2(stepLen / texel), 0.0);
    tau += dens(p + ld * dist, lod) * stepLen;
    dist += stepLen;
    stepLen *= 1.4;
  }
  float sun = mix(exp(-uLook.z * tau), 1.0, wC * 0.6);
  float ao = mix(exp(-uLook2.w * dens(p, 4.5)), 1.0, wC);

  vec3 amb = vec3(0.84, 0.88, 1.0) * uLook2.x;
  vec3 key = vec3(1.0, 0.985, 0.96) * uLook2.y;
  vec3 lit = amb * ao + key * sun * diff;

  vec3 jl = vec3(0.0);
  vec3 core = vec3(0.0);
  for (int i = 0; i < ${q}; i++) {
    vec4 jb = uJetB[i];
    if (jb.w <= 0.0) continue;
    vec4 ja = uJetA[i];
    vec2 rel = p - ja.xy;
    float along = dot(rel, ja.zw);
    float across = dot(rel, vec2(-ja.w, ja.z));
    float str = min(jb.w, 1.6);
    float flick = 0.9 + 0.2 * noise(vec2(uTime * 38.0, float(i) * 5.0));
    float len = (8.0 + 12.0 * str) * flick * uScale;
    float sN = along / len;
    float wid = 3.2 * uScale * (0.9 - 0.5 * clamp(sN, 0.0, 1.0)) + 0.3;
    float radial = exp(-across * across / (wid * wid));
    float axial = smoothstep(-0.12, 0.04, sN) * pow(clamp(1.0 - sN, 0.0, 1.0), 1.5);
    float c = radial * axial * str;
    core += mix(uThrust, vec3(1.0), smoothstep(0.25, 0.9, c)) * c * 1.3;
    float d = length(rel - ja.zw * clamp(along, 0.0, len));
    core += uThrust * str * (0.22 * exp(-d / (5.0 * uScale)) + 0.06 * exp(-d / (18.0 * uScale)));
    jl += uThrust * str * uLight2.x * (exp(-d / (30.0 * uScale)) + 0.45 * exp(-d / (100.0 * uScale)));
  }

  vec3 jlNear = jl * 0.35 + uThrust * colNear / max(Dt, 1e-4) * 0.9;
  jl += uThrust * colHot / max(Dt, 1e-4) * 0.9;
  if (uLightTheme > 0.5) {
    float shade = dot(lit + jl * 0.8, vec3(0.3333)) * uLight2.z;
    vec3 ink = mix(uShade, uSmoke, smoothstep(0.15, 1.2, shade));
    alpha = 1.0 - pow(1.0 - alpha, 1.25);
    ink = mix(ink, uThrust, clamp(dot(jlNear, vec3(0.3333)) * 0.5, 0.0, 0.3));
    float ca = clamp(max(core.r, max(core.g, core.b)) * 0.85, 0.0, 1.0);
    vec3 coreInk = mix(uThrust, vec3(1.0), 0.35 * smoothstep(0.7, 1.0, ca));
    vec3 lc = ink * alpha * (1.0 - ca) + coreInk * ca;
    float la = alpha + ca * (1.0 - alpha);
    outColor = vec4(lc, la);
    return;
  }
  vec3 smoke = uSmoke * (lit + jl) * uLight2.z;
  smoke = mix(smoke / (1.0 + 0.35 * max(smoke - 0.8, 0.0)), 1.0 - exp(-smoke * 1.35), uTone);
  vec3 emit = mix(uThrust, vec3(1.0), 0.5) * heat * heat * uLight2.y;
  vec3 col = (smoke + emit) * alpha + core;
  float a = clamp(max(alpha, max(col.r, max(col.g, col.b))), 0.0, 1.0);
  col = min(col, vec3(a));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0 * a;
  outColor = vec4(max(col, 0.0), a);
}`,qe={colSpread:.1,colR:3.6,colD:1.25,colU:420,splash:400,friction:5,disperse:.6,dispV:60,gap:10,wind:8,turb:350,turbScale:34,jetLight:.3,threshold:.035,blur:3,emit:0,exposure:1.3,tone:1,gamma:.6,kickNear:45,kickW:18,kickH:14,vort:6,spread:.1,floor:.02,keepD:.3,keepIdle:.45,keepH:1.6,rateN:0,rateH:6,rateK:20,rateC:3,buoy:330,lift:22,damp:.55,radius:6,speed:380,reach:.9,forceMax:240,alphaK:4,relief:9,shadow:.026,alphaLod:0,ambient:.58,key:.82,wrap:.35,ao:.35,normalE:3,normalLod:-.8,fine:.35,broad:.9,iters:28};function _t({root:t,canvas:h,button:R,cursor:J,ramp:$,props:L}){let ne=h.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),ue=typeof window<"u"&&window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null,e={W:0,H:0,dpr:1,bw:0,bh:0,x:0,vx:0,y:-Q,vy:0,th:0,w:0,fvx:0,fvy:0,thrust:[0,0,0,0],delay:[0,0,0,0],phase:"rest",pt:0,clock:0,seed:Math.random()*100,wind:1,alt:160,climbT:1.6,y0:0,vrPrev:0,hold:2.4,xRef:0,landX:0,boost:!1,contact:!0,placed:!1,track:null,back:null,flip:null,rampKey:"",rampGeo:null,strip:null,u:0,v:0,target:{x:0,y:0},pointer:{in:!1,x:0,y:0,type:"mouse"},off:{x:0,y:0},attached:!1,hover:!1,armed:!0,carry:!1,pressed:!1,press:null,drag:null,suppress:!1,lastC:null,lastTh:0,quiet:0,running:!1,last:0,raf:0,simTime:0,activity:0},z=null;if(ne&&(ne.getExtension("EXT_color_buffer_float")||ne.getExtension("EXT_color_buffer_half_float")))try{z=Ft(ne)}catch{z=null}let f=()=>!!(ue&&ue.matches),H=()=>(We[L.current.size]||We.medium).k,I=()=>kt*H(),Te=()=>M(Math.round(le(L.current.jets,2)),1,q),ee=()=>{let o=Te();if(o===1)return[0];let a=e.bw*(o===2?.3:.34);return Array.from({length:o},(r,n)=>a*(2*n/(o-1)-1))},Me=()=>{let o=ee();return o.length>1?[o[0],o[o.length-1]]:[-.3*e.bw,.3*e.bw]},P=()=>e.thrust[0]+e.thrust[1]+e.thrust[2]+e.thrust[3],Ue=()=>e.phase==="ignite"||e.phase==="climb"||e.phase==="hover"||e.phase==="descend"||e.phase==="drag",Ce=()=>e.phase==="drive"||e.phase==="loop"||e.phase==="flip"||e.phase==="return",ce=()=>[e.bw/2+4,Math.max(e.bw/2+4,e.W-e.bw/2-4)],te=()=>!!L.current.ramp,y=()=>{let o=I()+e.bh/2,a=`${e.W}|${e.H}|${e.bw}|${o}`;if(e.rampKey===a&&e.rampGeo)return e.rampGeo;let r=Math.max(e.H*.24,I()+e.bh+40),n=1/r,u=r*.4,l=r*Math.PI/2-u,v=(S,D)=>{let B=[[u,0,n],[l,n,n],[u,n,0],[S,0,0],[u,0,n],[l,n,n],[u,n,0],[D,0,0]],A={ss:[0],xs:[0],ys:[0],ps:[0],ks:[0]},V=0,X=0,G=0,de=0;return B.forEach(([pe,ge,Le])=>{let xe=Math.max(1,Math.round(pe/1.5)),he=pe/xe;for(let me=0;me<xe;me+=1){let Ee=ge+(Le-ge)*((me+.5)/xe),Se=G+Ee*he/2;V+=Math.cos(Se)*he,X+=Math.sin(Se)*he,G+=Ee*he,de+=he,A.ss.push(de),A.xs.push(V),A.ys.push(X),A.ps.push(G),A.ks.push(ge+(Le-ge)*((me+1)/xe))}}),A},k=v(0,0),m=Math.max(0,e.H*.66-Math.max(...k.ys)),C=v(m,Math.max(48,e.W*.16)),g=M(r*.12,8,16),E=e.W-Math.max(18,e.W*.05)-g-Math.max(...C.xs),U=C.xs.map(S=>S+E),F=C.ss.length-1,x=C.ys.findIndex(S=>S>3),i=x<0?U[F]:U[x],T={...C,xs:U,r,T:g,x0:E,foot:i,S:C.ss[F],clear:Math.min(i,U[F])-12,ok:Math.max(...C.ys)+g<e.H-8};return e.rampKey=a,e.rampGeo=T,T},p=()=>{let[o,a]=ce();if(!te())return M(e.W/2,o,a);let r=y();return M(Math.min(r.foot*.5,r.x0-90,r.clear-e.bw/2-40),o,a)},s=()=>({x:e.x,y:I()+e.bh/2+e.y+Q}),d=()=>{let o=s(),a=Math.cos(e.th),r=Math.sin(e.th),n=L.current.thrusters?-(e.bh/2+I())+1:-(e.bh/2)+2;return ee().map(u=>({x:o.x+u*a-n*r,y:o.y+u*r+n*a,dx:r,dy:-a}))},b=()=>{let o=s();return{x:o.x,y:e.H-o.y}},_=(o,a,r,n,u,l,v)=>{let k=u[0]-l[0],m=v[0]-l[0],C=n[0]-u[0]+l[0]-v[0],g=u[1]-l[1],E=v[1]-l[1],U=n[1]-u[1]+l[1]-v[1],F=k*E-m*g||1e-6,x=(C*E-m*U)/F,i=(k*U-C*g)/F,T=u[0]-n[0]+x*u[0],S=v[0]-n[0]+i*v[0],D=u[1]-n[1]+x*u[1],B=v[1]-n[1]+i*v[1],A=n[0]-T*o/a,V=n[1]-D*o/a;return Math.abs(x)<1e-7&&Math.abs(i)<1e-7?`matrix(${[T/a,D/a,S/r,B/r,A,V].map(G=>G.toFixed(6)).join(",")})`:`matrix3d(${[T/a,D/a,0,x/a,S/r,B/r,0,i/r,0,0,1,0,A,V,0,1-x*o/a].map(G=>G.toFixed(6)).join(",")})`},j=()=>{e.strip&&(e.strip.wrap.remove(),e.strip.ink.remove(),e.strip=null,R.style.visibility="")},O=()=>{j();let o=e.track;if(!o)return;let a=o.geo,r=I()+e.bh/2,n=[0];for(let x=1;x<a.ss.length;x+=1){let i=(a.ks[x]+a.ks[x-1])/2;n.push(n[x-1]+(a.ss[x]-a.ss[x-1])*Math.max(1-i*r,.2))}let u=M(Math.round(e.bw/8),8,32),l=document.createElement("div");l.setAttribute("aria-hidden","true"),l.style.cssText="position:absolute;inset:0;z-index:1;pointer-events:none";let v=document.createElement("div");v.setAttribute("aria-hidden","true"),v.style.cssText="position:absolute;inset:0;z-index:2;pointer-events:none;will-change:transform";let k=Array.from(R.children),m=k[1],C=k.slice(2).map(x=>{let i=x.cloneNode(!0);return i.style.left="0px",i.style.top="0px",i.style.transformOrigin="0 0",l.appendChild(i),{el:i,x:x.offsetLeft,y:x.offsetTop+x.offsetHeight/2,k:1}}),g=[];for(let x=0;x<u;x+=1){let i=R.cloneNode(!0);i.removeAttribute("data-hover"),i.removeAttribute("data-pressed"),i.setAttribute("tabindex","-1"),i.setAttribute("inert",""),Array.from(i.children).slice(1).forEach(D=>{D.style.visibility="hidden"});let T=e.bw*x/u-(x?.75:2),S=e.bw*(x+1)/u+(x<u-1?.75:2);i.style.visibility="visible",i.style.transformOrigin="0 0",i.style.clipPath=`polygon(${T}px -2px, ${S}px -2px, ${S}px ${e.bh+2}px, ${T}px ${e.bh+2}px)`,l.appendChild(i),g.push(i)}let E=[],U=m&&m.textContent||"",F=document.createElement("canvas").getContext("2d");if(m&&F&&U.trim()&&!m.children.length){let x=getComputedStyle(m),i=`${x.fontStyle} ${x.fontWeight} ${x.fontSize} ${x.fontFamily}`;F.font=i;let T=Array.from(U),S=A=>F.measureText(T.slice(0,A).join("")).width,D=S(T.length)||1,B=m.offsetTop+m.offsetHeight/2;T.forEach((A,V)=>{let X=document.createElement("span");X.textContent=A,X.style.cssText=`position:absolute;left:0;top:0;white-space:pre;line-height:1;transform-origin:0 0;font:${i};color:${x.color}`,v.appendChild(X),E.push({el:X,x:m.offsetLeft+(S(V)+S(V+1))/2*(m.offsetWidth/D),y:B,k:.5})})}else if(m){let x=m.cloneNode(!0);x.style.position="absolute",x.style.left="0px",x.style.top="0px",x.style.transformOrigin="0 0",v.appendChild(x),E.push({el:x,x:m.offsetLeft+m.offsetWidth/2,y:m.offsetTop+m.offsetHeight/2,k:0})}t.appendChild(l),t.appendChild(v),R.style.visibility="hidden",e.strip={wrap:l,ink:v,parts:g,n:u,sn:n,pods:C,items:E}},oe=()=>{let o=e.strip,a=e.track;if(!o||!a)return;let r=a.geo,n=r.ss[r.ss.length-1],u=o.sn[o.sn.length-1],l=(i,T,S)=>{let D=0,B=i.length-1;for(;B-D>1;){let A=D+B>>1;i[A]<=S?D=A:B=A}return T[D]+(T[B]-T[D])*((S-i[D])/(i[B]-i[D]))},v=i=>i<=0?i:i>=n?u+i-n:l(r.ss,o.sn,i),k=i=>i<=0?i:i>=u?n+i-u:l(o.sn,r.ss,i),m=v(e.u),C=I(),g=(i,T)=>{let[S,D,B]=Ne(r,k(m+i-e.bw/2)),A=C+e.bh-T;return[S-Math.sin(B)*A,e.H-D-Math.cos(B)*A,B]},E=(i,T,S,D)=>{i.style.transform=`translate(${T.toFixed(2)}px, ${S.toFixed(2)}px) rotate(${(-D).toFixed(4)}rad) translate(-50%, -50%)`},U=e.bw/o.n,F=[],x=[];for(let i=0;i<=o.n;i+=1)F.push(g(i*U,0)),x.push(g(i*U,e.bh));o.parts.forEach((i,T)=>{i.style.transform=_(T*U,U,e.bh,F[T],F[T+1],x[T+1],x[T])}),o.pods.forEach(i=>{let[T,S,D]=g(i.x,i.y);E(i.el,T,S,D)}),o.items.forEach(i=>{let[T,S,D]=g(i.x,i.y),[B,A,V]=g(e.bw/2,i.y),X=i.x-e.bw/2,G=B+Math.cos(V)*X,de=A-Math.sin(V)*X;E(i.el,G+(T-G)*i.k,de+(S-de)*i.k,V+(D-V)*i.k)})},ie=()=>{e.strip&&oe();let o=s(),a=o.x-e.bw/2,r=e.H-o.y-e.bh/2;R.style.transform=`translate3d(${a.toFixed(2)}px, ${r.toFixed(2)}px, 0) rotate(${(-e.th).toFixed(5)}rad)`,t.style.setProperty("--fly-thrust",M(P()*.9,0,1.2).toFixed(3))},Ae=()=>{if(!$)return;let o=y(),a=$.querySelectorAll("path"),r=a[0],n=a[1],u=v=>v.toFixed(1),l=v=>{let k=[];for(let C=0;C<o.ss.length;C+=2){let g=o.ps[C];k.push(`${u(o.xs[C]+Math.sin(g)*v)} ${u(e.H-o.ys[C]+Math.cos(g)*v)}`)}let m=o.ps[o.ss.length-1];return k.push(`${u(o.xs[o.ss.length-1]+Math.sin(m)*v)} ${u(e.H-o.ys[o.ss.length-1]+Math.cos(m)*v)}`),`M ${k.join(" L ")}`};$.setAttribute("viewBox",`0 0 ${u(e.W)} ${u(e.H)}`),$.style.visibility=o.ok?"":"hidden",r&&(r.setAttribute("d",l(o.T/2)),r.setAttribute("stroke-width",u(o.T))),n&&n.setAttribute("d",l(.75))},He=o=>{let a=new Float32Array(q*4),r=new Float32Array(q*4),n=[0,0,0,0],u=o.length,l=qe,v=H();return o.forEach((k,m)=>{let C=M(e.thrust[m]*u,0,2),g=k.dy<-.2?k.y/-k.dy:l.forceMax;a.set([k.x,k.y,k.dx,k.dy],m*4),r.set([l.speed*Math.sqrt(C),l.radius*v,Math.min(l.forceMax,g*l.reach),C>.004?C:0],m*4);let E=e.fvx*-k.dy+e.fvy*k.dx;n[m]=M(-E*.22,-.55*g,.55*g)}),{a,b:r,bend:n}},be=o=>{if(!z)return;let a=L.current,r=d(),n=He(r),u=s(),l=ee(),v=H(),k=[u.x,u.y,e.bw/2,e.bh/2],m=[e.vx,e.vy,e.th,e.w],C=(1-ye((Math.abs(e.fvx)-40)/100))*(1-ye((Math.abs(e.th)-.1)/.2))*(Ce()?0:1);o>0&&(e.simTime+=o,z.step(o,{jets:n,craft:k,motion:m,calm:C,scale:v,activity:e.activity,jetX:[0,1,2,3].map(E=>E<l.length?l[E]:0),jetN:l.length,spacing:l.length>1?l[1]-l[0]:0,wind:e.wind*qe.wind,time:e.simTime,smoke:M(le(a.smoke,1),0,3),turbulence:M(le(a.turbulence,1),0,3)}));let g=vt(a.smokeColor);z.render(h.width,h.height,{jets:n,craft:k,motion:m,scale:v,activity:e.activity,time:e.simTime,light:a.theme==="light",smokeColor:g,shadeColor:g.map((E,U)=>E*.74+[0,.012,.045][U]),thrustColor:vt(a.thrustColor)})},we=()=>{let o=t.getBoundingClientRect(),a=e.W;if(e.W=Math.max(1,o.width),e.H=Math.max(1,o.height),e.bw=R.offsetWidth,e.bh=R.offsetHeight,e.placed?a>0&&a!==e.W&&(e.x*=e.W/a):(e.x=p(),e.placed=!0),!Ce()){let[u,l]=ce();e.x=M(e.x,u,l)}e.dpr=Math.min(window.devicePixelRatio||1,2);let r=Math.round(e.W*e.dpr),n=Math.round(e.H*e.dpr);(h.width!==r||h.height!==n)&&(h.width=r,h.height=n),z&&z.resize(e.W,e.H),Ae(),t.dataset.ready="",ie(),e.running||be(0)},je=(o,a,r=0)=>{let n=b(),u=e.th,l=o-n.x,v=a-n.y,k=l*Math.cos(u)-v*Math.sin(u),m=l*Math.sin(u)+v*Math.cos(u);return Math.abs(k)<=e.bw/2+2+r&&m>=-e.bh/2-2-r&&m<=e.bh/2+I()+r},se=()=>{e.pt=0,e.armed=!1,e.seed=Math.random()*100,e.wind=Math.random()<.5?-1-Math.random():1+Math.random(),e.vrPrev=0,e.quiet=0,e.boost=!1},ve=()=>{if(e.phase!=="rest"||f())return!1;let o=L.current;se(),e.phase="ignite",e.delay=e.delay.map(()=>Math.random()*.07);let a=e.H-e.bh-I()-30-Q;return e.alt=M(e.y+le(o.altitude,170),e.y+24,Math.max(e.y+24,a)),e.climbT=1.15+(e.alt-e.y)/420,e.hold=Math.max(0,le(o.hoverTime,2.4)),e.xRef=e.x,Ge(),!0},Ne=(o,a)=>{if(a<=0)return[o.x0+a,0,0,0];let r=0,n=o.ss.length-1;if(a>=o.ss[n]){let l=o.ps[n];return[o.xs[n]+Math.cos(l)*(a-o.ss[n]),o.ys[n]+Math.sin(l)*(a-o.ss[n]),l,0]}for(;n-r>1;){let l=r+n>>1;o.ss[l]<=a?r=l:n=l}let u=(a-o.ss[r])/(o.ss[n]-o.ss[r]);return[o.xs,o.ys,o.ps,o.ks].map(l=>l[r]+(l[n]-l[r])*u)},$e=(o,a)=>{let[r,n,u,l]=Ne(o.geo,a);return{x:r-Math.sin(u)*o.base,cy:n+Math.cos(u)*o.base,th:u,bend:l*o.base}},Pe=()=>{if(e.phase!=="rest"||f()||!te())return!1;let o=y(),a=o.x0-e.x;if(a<60||!o.ok)return ve();se();let r=I()+e.bh/2,n=Math.max(...o.ys)-2*r,u=Math.sqrt(2*Qe*n+2.2*Qe*(o.r-r));return e.track={geo:o,base:r,v0:u,acc:u*u/(2*a)},e.phase="drive",e.u=-a,e.v=0,e.thrust=[0,0,0,0],O(),Ge(),!0},fe=o=>{let[a,r]=ce(),n=e.x+o;te()&&(n=Math.min(n,y().clear-e.bw/2)),e.landX=M(n,a,r)},Xe=o=>{let a=L.current,r=M(le(a.wobble,1),0,3);if(e.pt+=o,e.clock+=o,e.phase==="return"){let c=e.back,w=Math.min(e.pt/c.time,1);e.x=c.from+(c.to-c.from)*pt(w),e.vx=(c.to-c.from)*ht(w)/c.time,e.y=-Q,e.vy=0,e.th=0,e.w=0,w>=1&&(e.phase="rest",e.pt=0,e.vx=0);return}if(e.phase==="drive"||e.phase==="loop"){let c=e.track,w=$e(c,e.u);e.phase==="drive"?e.v=Math.min(c.v0,e.v+c.acc*o):e.v=Math.sqrt(Math.max(c.v0*c.v0-2*Qe*(w.cy-c.base),.2*c.v0*c.v0)),e.u+=e.v*o/Math.max(1-w.bend,.25),e.phase==="drive"&&e.u>=0&&(e.phase="loop");let N=$e(c,e.u);e.vx=(N.x-w.x)/o,e.vy=(N.cy-w.cy)/o,e.w=(N.th-w.th)/o,e.x=N.x,e.y=N.cy-I()-e.bh/2-Q,e.th=N.th,e.thrust=e.thrust.map(ae=>ae*Math.exp(-o/.1)),e.phase==="loop"&&e.u>=c.geo.S&&(j(),e.phase="flip",e.pt=0,e.flip={th:e.th,w:e.w});return}let n=(e.bw*e.bw+e.bh*e.bh)/12,u=Math.max(Math.cos(e.th),.5),l=0,v=!1,k=e.xRef,m=3,C=3.6,g=null;if(e.phase==="flip"){let c=Math.min(e.pt/Ze,1),w=e.flip,N=Math.PI*2;g={th:(2*c*c*c-3*c*c+1)*w.th+(c*c*c-2*c*c+c)*Ze*w.w+(3*c*c-2*c*c*c)*N,w:(6*c*c-6*c)*(w.th-N)/Ze+(3*c*c-4*c+1)*w.w},l=2.4*ye((Math.cos(g.th)-.8)/.15);let ae=e.y+Q<e.bh*.6;(c>=1||ae)&&(g=null,e.th-=Math.PI*2*Math.round(e.th/(Math.PI*2)),e.phase="descend",e.pt=0,e.boost=!0,e.vrPrev=e.vy,fe(e.vx*Math.abs(e.vx)/700))}if(e.phase==="ignite"&&(l=.9*ye(e.pt/.5),e.pt>=.5&&(e.phase="climb",e.pt=0,e.y0=e.y)),e.phase==="climb"){let c=e.pt/e.climbT,w=e.alt-e.y0,N=e.y0+w*pt(c),ae=w*ht(c)/e.climbT,ke=w*Tt(c)/(e.climbT*e.climbT);l=(W+ke+30*(N-e.y)+8*(ae-e.vy))/(W*u),v=!0,c>=1&&(e.phase="hover",e.pt=0)}else if(e.phase==="hover"){let c=e.clock*.8,w=e.alt+3.5*r*Ve(c,e.seed),N=3.5*r*.8*Mt(c,e.seed);l=(W+30*(w-e.y)+8*(N-e.vy))/(W*u),v=!0,e.pt>=e.hold&&(e.phase="descend",e.pt=0,e.vrPrev=0,fe(0))}else if(e.phase==="drag"){let c=e.target.y-I()-e.bh/2-Q;l=(W+34*(c-e.y)-10*e.vy)/(W*u),v=!0}else if(e.phase==="descend"){k=e.landX,m=e.boost?5:4,C=e.boost?4.6:4.2;let c=170,w=32,N=e.boost?ye((Math.abs(e.landX-e.x)-20)/40):ye((Math.abs(e.landX-e.x)-3)/23),ae=Math.max(e.y+Q,0),ke=(w+(c-w)*(1-Math.exp(-ae/52)))*(1-(e.boost?.45:.88)*N),Ye=e.boost?c*3:c*ye(e.pt/.9)+1,De=-Math.min(ke,Ye),ze=M((De-e.vrPrev)/Math.max(o,1e-4),-600,600);e.vrPrev=De,l=(W+ze+(e.boost?9:7)*(De-e.vy))/(W*u),v=!0,e.contact&&e.pt>.3&&(e.phase="landed",e.pt=0,e.boost=!1)}else if(e.phase==="landed"&&(l=0,e.pt>.6&&P()<.03)){let c=te()&&e.track?p():e.x;e.phase=Math.abs(c-e.x)>6?"return":"rest",e.pt=0,e.thrust=[0,0,0,0],e.vy=0,e.w=0,e.vx=0,e.track=null,e.back={from:e.x,to:c,time:M(Math.abs(c-e.x)/200,.7,1.8)}}l=Number.isFinite(l)?M(l,0,e.boost||e.phase==="flip"?2.6:1.9):1;let E=ee(),U=E.length,F=E.reduce((c,w)=>c+w*w,0),x=e.phase==="drag"?M(100*(e.target.x-e.x)-17*e.vx,-2400,2400):0,i=0;if(v){let c=.8*r*Ve(e.clock*1.7,e.seed+3),w=e.phase==="drag"?x*.75:m*(k-e.x)-C*e.vx,N=e.boost?.45:.32,ae=M(-Math.atan2(w,W),-N,N);i=-81*(e.th-ae)-14*e.w-c}let T=(e.boost||e.phase==="flip"?2.6:2.4)/U,S=(c,w)=>c+(w-c)*(1-Math.exp(-o/(w>c?.08:.17))),D=F>1?i*n/(W*F):0,B=Math.abs(D)*Math.max(0,...E.map(Math.abs)),A=Math.min(l/U,Math.max(T-B,T*.5)),V=0;for(let c=0;c<q;c+=1){let w=0;c<U&&(w=M(A+D*E[c],0,T),e.phase==="ignite"&&e.pt<e.delay[c]&&(w=0)),e.thrust[c]=S(e.thrust[c],w),c<U&&(V+=e.thrust[c]*E[c])}let X=P()*W,G=e.phase==="drag"?x:-X*Math.sin(e.th)-.8*e.vx,de=X*Math.cos(e.th)-W-.3*e.vy,pe=e.phase==="flip"?0:V*W/n-1.2*e.w;v&&(e.phase!=="drag"&&(G+=12*r*Ve(e.clock*.7,e.seed+7)),pe+=.9*r*Ve(e.clock*2.3,e.seed+11),F<1&&(pe+=i),Math.abs(e.th)>.35&&(pe-=(e.th-Math.sign(e.th)*.35)*160));let ge=s(),Le=Math.cos(e.th),xe=Math.sin(e.th),he=-(e.bh/2+I()),me=!1;e.phase!=="flip"&&Me().forEach(c=>{let w=c*Le-he*xe,N=c*xe+he*Le,ae=ge.y+N,ke=Q-ae;if(ke>0){me=!0;let Ye=e.vy+e.w*w,De=e.vx-e.w*N,ze=Math.max(0,xt*ke-gt*Ye),lt=-10*De;de+=ze,G+=lt,pe+=(w*ze-N*lt)/n}}),e.contact=me,e.vx=M(e.vx+G*o,-1500,1500),e.vy=M(e.vy+de*o,-1500,1500),e.w=M(e.w+pe*o,-14,14),e.x+=e.vx*o,e.y+=e.vy*o,e.th+=e.w*o,g&&(e.th=g.th,e.w=g.w),e.phase!=="flip"&&Math.abs(e.th)>dt&&(e.th=Math.sign(e.th)*dt,e.w*e.th>0&&(e.w=0));let[Ee,Se]=ce();(e.x<Ee||e.x>Se)&&(e.x=M(e.x,Ee,Se),e.vx=0),e.y+Q<-40&&(e.y=-Q,e.vy=0),Number.isFinite(e.y+e.x+e.th+e.vy+e.vx+e.w+P())||(Object.assign(e,{x:e.W/2,vx:0,y:-Q,vy:0,th:0,w:0,thrust:[0,0,0,0],phase:"rest"}),e.drag=null)},Y=o=>{let a=L.current,r=e.pointer,n=b();if(e.attached&&!e.drag&&e.lastC){let m=r.x+e.off.x,C=r.y+e.off.y,g=-(e.th-e.lastTh),E=m-e.lastC.x,U=C-e.lastC.y,F=n.x+E*Math.cos(g)-U*Math.sin(g),x=n.y+E*Math.sin(g)+U*Math.cos(g);e.off.x+=F-m,e.off.y+=x-C}e.lastC=n,e.lastTh=e.th;let u=r.x+e.off.x,l=r.y+e.off.y,v=r.in&&je(u,l,e.attached||e.drag?10:0);if(v!==e.hover&&(e.hover=v,v?R.dataset.hover="":delete R.dataset.hover),!v&&!e.drag&&(e.attached=!1,e.phase==="rest"&&(e.armed=!0)),v&&e.armed&&e.phase==="rest"&&r.type==="mouse"&&a.trigger!=="click"&&!te()&&ve()&&(e.attached=!!a.carryCursor),e.phase==="rest"&&Math.abs(e.off.x)+Math.abs(e.off.y)<12){let m=Math.exp(-o*6);e.off.x*=m,e.off.y*=m}Math.abs(e.off.x)+Math.abs(e.off.y)<.3&&(!e.attached||e.phase==="rest")&&(e.off.x=0,e.off.y=0,e.phase==="rest"&&(e.attached=!1));let k=!!a.carryCursor&&r.in&&r.type==="mouse"&&(e.attached||!!e.drag||e.off.x!==0||e.off.y!==0);k!==e.carry&&(e.carry=k,k?t.dataset.carry="":delete t.dataset.carry),k&&J&&(J.style.transform=`translate3d(${(u-1.8).toFixed(2)}px, ${(l-1.75).toFixed(2)}px, 0)`)},_e=o=>{e.raf=0;let a=e.last?M((o-e.last)/1e3,0,1/30):1/60;if(e.last=o,a>0){if(e.phase!=="rest")for(let v=0;v<6;v+=1)Xe(a/6);let r=1-Math.exp(-a/.12);e.fvx+=(e.vx-e.fvx)*r,e.fvy+=(e.vy-e.fvy)*r,Y(a),ie(),be(a);let n=P();e.quiet=n>.01||e.phase!=="rest"?0:e.quiet+a;let u=n>.05?1:0;e.activity+=(u-e.activity)*(1-Math.exp(-a/(u?.25:1.6)))}e.phase!=="rest"||e.quiet<7||e.carry?e.raf=requestAnimationFrame(_e):(e.running=!1,e.last=0,z&&z.clear(),be(0))},Ge=()=>{e.raf||(e.running=!0,e.raf=requestAnimationFrame(_e))},rt=o=>{let a=t.getBoundingClientRect();return{x:o.clientX-a.left,y:o.clientY-a.top}},Ke=()=>{let o=e.pointer,a=o.type==="mouse";return{x:o.x+(a?e.off.x:0),y:o.y+(a?e.off.y:0)}},st=()=>{if(!e.drag)return;let o=Ke(),[a,r]=ce(),n=I()+e.bh/2;e.target.x=M(o.x-e.drag.gx,a,r),e.target.y=M(e.H-(o.y-e.drag.gy),n,Math.max(n,e.H-e.bh/2-6))},yt=o=>{let a=Ke(),r=b();e.drag={gx:a.x-r.x,gy:a.y-r.y},e.phase="drag",e.pt=0,e.attached=!1,e.pressed=!1,e.suppress=!0,e.boost=!1,delete R.dataset.pressed,t.dataset.dragging="";try{t.setPointerCapture(o.pointerId)}catch{}st()},bt=o=>{e.drag=null,e.press=null,delete t.dataset.dragging;try{t.releasePointerCapture(o.pointerId)}catch{}e.phase="hover",e.pt=0,e.alt=e.y;let[a,r]=ce();e.xRef=M(e.x+e.vx*.3,a,r),e.hold=Math.min(Math.max(0,le(L.current.hoverTime,2.4)),.9)},Fe=o=>{let a=rt(o),r=e.pointer;if(r.in&&!e.attached&&!e.drag&&(e.off.x||e.off.y)){let n=Math.exp(-Math.hypot(a.x-r.x,a.y-r.y)/110);e.off.x*=n,e.off.y*=n}r.x=a.x,r.y=a.y,r.in=!0,r.type=o.pointerType||"mouse",e.press&&!e.drag&&Ue()&&Math.hypot(a.x-e.press.x,a.y-e.press.y)>4&&yt(o),e.drag&&st(),Y(0),(e.carry||e.phase!=="rest")&&Ge()},nt=()=>{e.drag||(e.pointer.in=!1,e.attached=!1,e.off.x=0,e.off.y=0,Y(0))},ct=o=>{let a=rt(o),r=e.pointer;r.x=a.x,r.y=a.y,r.in=!0,r.type=o.pointerType||"mouse",e.suppress=!1;let n=Ke();je(n.x,n.y,e.attached?10:0)&&(r.type!=="mouse"&&e.phase==="rest"&&L.current.trigger!=="click"&&!te()&&ve(),e.press={x:a.x,y:a.y},e.carry&&r.type==="mouse"&&(e.pressed=!0,R.dataset.pressed=""))},Be=o=>{if(e.drag){bt(o);return}e.press=null,e.pressed&&(e.pressed=!1,delete R.dataset.pressed,e.carry&&e.hover&&(e.phase==="rest"&&te()?Pe():L.current.trigger==="click"&&ve()&&(e.attached=!!L.current.carryCursor),L.current.onClick&&L.current.onClick(o)))},it=o=>{if(e.suppress){e.suppress=!1,o.stopPropagation(),o.preventDefault();return}if(e.phase==="rest"){if(te()){Pe();return}ve()&&e.pointer.type==="mouse"&&e.pointer.in&&e.hover&&(e.attached=!!L.current.carryCursor)}};t.addEventListener("pointermove",Fe),t.addEventListener("pointerenter",Fe),t.addEventListener("pointerleave",nt),t.addEventListener("pointerdown",ct),t.addEventListener("pointerup",Be),t.addEventListener("pointercancel",Be),R.addEventListener("click",it);let Oe=new ResizeObserver(we);return Oe.observe(t),Oe.observe(R),we(),{refresh:we,rehome(){we(),e.phase==="rest"&&(e.x=p(),ie(),e.running||be(0))},destroy(){Oe.disconnect(),j(),e.raf&&cancelAnimationFrame(e.raf),t.removeEventListener("pointermove",Fe),t.removeEventListener("pointerenter",Fe),t.removeEventListener("pointerleave",nt),t.removeEventListener("pointerdown",ct),t.removeEventListener("pointerup",Be),t.removeEventListener("pointercancel",Be),R.removeEventListener("click",it),z&&z.dispose()}}}function Ft(t){let h=(y,p)=>{let s=t.createShader(y);if(t.shaderSource(s,p),t.compileShader(s),!t.getShaderParameter(s,t.COMPILE_STATUS)){let d=t.getShaderInfoLog(s);throw t.deleteShader(s),new Error(d)}return s},R=h(t.VERTEX_SHADER,Ct),J=[],$=y=>{let p=h(t.FRAGMENT_SHADER,y),s=t.createProgram();if(t.attachShader(s,R),t.attachShader(s,p),t.linkProgram(s),!t.getProgramParameter(s,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(s));t.deleteShader(p);let d={},b=t.getProgramParameter(s,t.ACTIVE_UNIFORMS);for(let j=0;j<b;j+=1){let O=t.getActiveUniform(s,j);d[O.name.replace(/\[0\]$/,"")]=t.getUniformLocation(s,O.name)}let _={p:s,u:d};return J.push(_),_},L={advect:$(Lt),force:$(Et),curl:$(St),vorticity:$(Dt),divergence:$(Rt),pressure:$(Ut),gradient:$(At),scale:$(Nt),blur:$(jt),dye:$($t),render:$(Pt)},ne=t.createVertexArray(),ue=[],e=(y,p,s,d)=>{let b=t.createTexture();t.bindTexture(t.TEXTURE_2D,b);let _=d?Math.floor(Math.log2(Math.max(y,p)))+1:1;t.texStorage2D(t.TEXTURE_2D,_,s,y,p),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,d?t.LINEAR_MIPMAP_LINEAR:t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE);let j=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,j),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,b,0),t.viewport(0,0,y,p),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT);let O={tex:b,fbo:j,w:y,h:p,mips:d};return ue.push(O),O},z=(y,p,s,d)=>{let b={read:e(y,p,s,d),write:e(y,p,s,d)};return b.swap=()=>{let _=b.read;b.read=b.write,b.write=_},b},f=null,H=[1,1],I=()=>{ue.forEach(y=>{t.deleteTexture(y.tex),t.deleteFramebuffer(y.fbo)}),ue.length=0},Te=(y,p)=>{let s=Math.max(2,y/520,p/300),d=Math.max(16,Math.round(y/s)),b=Math.max(16,Math.round(p/s)),_=Math.max(16,Math.round(y/(s/2))),j=Math.max(16,Math.round(p/(s/2)));H=[y,p],!(f&&f.vw===d&&f.vh===b&&f.dw===_&&f.dh===j)&&(I(),f={vw:d,vh:b,dw:_,dh:j,velocity:z(d,b,t.RG16F,!1),pressure:z(d,b,t.R16F,!1),divergence:e(d,b,t.R16F,!1),curl:e(d,b,t.R16F,!1),dye:z(_,j,t.RG16F,!1),soft:e(_,j,t.RG16F,!0),temp:e(_,j,t.RG16F,!1)})},ee=0,Me=(y,p)=>{t.useProgram(y.p),ee=0,Object.entries(p).forEach(([s,d])=>{let b=y.u[s];b!=null&&(typeof d=="number"?t.uniform1f(b,d):d.f1?t.uniform1fv(b,d.f1):d.tex?(t.activeTexture(t.TEXTURE0+ee),t.bindTexture(t.TEXTURE_2D,d.tex),t.uniform1i(b,ee),ee+=1):d.length===2?t.uniform2fv(b,d):d.length===3?t.uniform3fv(b,d):t.uniform4fv(b,d))})},P=(y,p,s)=>{Me(y,p),s&&(t.bindFramebuffer(t.FRAMEBUFFER,s.fbo),t.viewport(0,0,s.w,s.h)),t.bindVertexArray(ne),t.drawArrays(t.TRIANGLES,0,3)};return{step:(y,p)=>{if(!f)return;let s=qe;t.disable(t.BLEND);let d=[1/f.vw,1/f.vh];P(L.advect,{uVelocity:f.velocity.read,uSource:f.velocity.read,uWorld:H,uDt:y,uKeep:1},f.velocity.write),f.velocity.swap(),P(L.force,{uVelocity:f.velocity.read,uDye:f.soft,uWorld:H,uDt:y,uBuoyancy:s.buoy,uLift:s.lift,uDamping:s.damp,uSpread:s.spread,uSplash:s.splash,uFriction:s.friction,uWind:p.wind,uTurb:[s.turb*(.35+.65*p.activity),s.turbScale],uTime:p.time,uObstacle:p.calm,uKick:[s.kickNear*p.scale,s.kickW*p.scale,s.kickH*p.scale],uCraft:p.craft,uCraftMotion:p.motion,uJetA:p.jets.a,uJetB:p.jets.b,uJetBend:{f1:p.jets.bend}},f.velocity.write),f.velocity.swap(),P(L.curl,{uVelocity:f.velocity.read,uTexel:d},f.curl),P(L.vorticity,{uVelocity:f.velocity.read,uCurl:f.curl,uTexel:d,uStrength:s.vort*p.turbulence*(.4+.6*p.activity),uDt:y},f.velocity.write),f.velocity.swap(),P(L.divergence,{uVelocity:f.velocity.read,uTexel:d},f.divergence),P(L.scale,{uSource:f.pressure.read,uScale:.8},f.pressure.write),f.pressure.swap();for(let _=0;_<s.iters;_+=1)P(L.pressure,{uPressure:f.pressure.read,uDivergence:f.divergence,uTexel:d},f.pressure.write),f.pressure.swap();P(L.gradient,{uPressure:f.pressure.read,uVelocity:f.velocity.read,uTexel:d},f.velocity.write),f.velocity.swap(),P(L.dye,{uVelocity:f.velocity.read,uSource:f.dye.read,uWorld:H,uDt:y,uKeep:[Math.exp(-(s.keepD+s.keepIdle*(1-p.activity))*y),Math.exp(-s.keepH*y)],uRate:[s.rateN*p.smoke,s.rateH,s.rateK*p.smoke,s.rateC*p.smoke],uSpread:s.spread,uCol:[s.colSpread,s.colR*p.scale,s.colD,s.colU],uKick:[s.kickNear*p.scale,s.kickW*p.scale,s.kickH*p.scale],uDisperse:s.disperse,uDispV:s.dispV,uCraft:p.craft,uCraftMotion:p.motion,uGap:[p.spacing,s.gap*p.calm],uJetX:{f1:p.jetX},uJetN:p.jetN,uFloor:s.floor,uTime:p.time,uJetA:p.jets.a,uJetB:p.jets.b,uJetBend:{f1:p.jets.bend}},f.dye.write),f.dye.swap();let b=s.blur/2;P(L.blur,{uSource:f.dye.read,uStep:[b/f.dw,0]},f.temp),P(L.blur,{uSource:f.temp,uStep:[0,b/f.dh]},f.soft),t.bindTexture(t.TEXTURE_2D,f.soft.tex),t.generateMipmap(t.TEXTURE_2D)},render:(y,p,s)=>{if(!f)return;let d=qe;t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,y,p),t.disable(t.BLEND),P(L.render,{uDye:f.soft,uWorld:H,uDyeSize:[f.dw,f.dh],uTime:s.time,uLightTheme:s.light?1:0,uSmoke:s.smokeColor,uShade:s.shadeColor,uThrust:s.thrustColor,uLook:[d.alphaK*(.6+.4*s.activity),d.relief,d.shadow,d.alphaLod],uLook2:[d.ambient,d.key,d.wrap,d.ao],uLook3:[d.normalE,d.normalLod,d.fine,d.broad],uCol:[d.colSpread,d.colR*s.scale,d.colD,d.colU],uScale:s.scale,uGamma:d.gamma,uTone:d.tone,uLight2:[d.jetLight,d.emit,d.exposure],uThreshold:d.threshold*(.3+.7*s.activity),uCraft:s.craft,uCraftMotion:s.motion,uJetA:s.jets.a,uJetB:s.jets.b,uJetBend:{f1:s.jets.bend}})},resize:Te,clear:()=>{f&&([f.velocity.read,f.velocity.write,f.pressure.read,f.pressure.write,f.dye.read,f.dye.write,f.soft,f.temp].forEach(y=>{t.bindFramebuffer(t.FRAMEBUFFER,y.fbo),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT)}),t.bindTexture(t.TEXTURE_2D,f.soft.tex),t.generateMipmap(t.TEXTURE_2D))},dispose:()=>{I(),J.forEach(y=>t.deleteProgram(y.p)),t.deleteShader(R),t.deleteVertexArray(ne)}}}function ot({children:t="Take off",onClick:h,theme:R="dark",size:J="medium",radius:$,altitude:L=170,hoverTime:ne=2.4,jets:ue=2,thrusters:e=!0,trigger:z="hover",carryCursor:f=!0,ramp:H=!1,rampColor:I,smoke:Te=1,turbulence:ee=1,wobble:Me=1,thrustColor:P,smokeColor:Ue,buttonColor:Ce,textColor:ce,className:te="",style:y}){let p=(0,Z.useRef)(null),s=(0,Z.useRef)(null),d=(0,Z.useRef)(null),b=(0,Z.useRef)(null),_=(0,Z.useRef)(null),j=(0,Z.useRef)(null),O=(0,Z.useRef)({}),oe=R==="light",ie=We[J]||We.medium,Ae=P||(oe?"#4f8cff":"#8ec5ff"),He=Ue||(oe?"#e9ebf0":"#eef1f6"),be=Ce||(oe?"#18181b":"#27272a"),we=ce||(oe?"#fafafa":"#f5f5f5"),je=I||(oe?"#ececf0":"#25222b"),se=M(Math.round(le(ue,2)),1,q),ve=se===1?0:se===2?.3:.34,Ne=e?Array.from({length:se},(Y,_e)=>se===1?50:50+ve*100*(2*_e/(se-1)-1)):[];O.current={size:J,altitude:L,hoverTime:ne,jets:se,thrusters:!!e,trigger:z,carryCursor:f,ramp:!!H,smoke:Te,turbulence:ee,wobble:Me,thrustColor:Ae,smokeColor:He,theme:R,onClick:h},(0,Z.useEffect)(()=>{let Y=_t({root:p.current,canvas:s.current,button:d.current,cursor:b.current,ramp:_.current,props:O});return j.current=Y,()=>{j.current=null,Y.destroy()}},[]),(0,Z.useEffect)(()=>{j.current&&j.current.refresh()},[J,se,e,$]),(0,Z.useEffect)(()=>{j.current&&j.current.rehome()},[H]);let $e=oe?{background:"linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0) 50%), linear-gradient(0deg, color-mix(in srgb, var(--fly-glow) calc(var(--fly-thrust) * 30%), transparent), transparent 62%)",boxShadow:"inset 0 0 0 1px rgba(0, 0, 0, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.08)"}:{background:"linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0) 46%), linear-gradient(0deg, color-mix(in srgb, var(--fly-glow) calc(var(--fly-thrust) * 34%), transparent), transparent 62%)",boxShadow:"inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.25)"},Pe=oe?"data-[hover]:brightness-[0.97]":"data-[hover]:brightness-[1.12]",fe=ie.k,Xe=oe?"color-mix(in srgb, var(--fly-ramp) 82%, #000)":"color-mix(in srgb, var(--fly-ramp) 72%, #fff)";return(0,K.jsxs)("div",{ref:p,className:`group/fly relative isolate h-full min-h-[240px] w-full touch-manipulation overflow-hidden data-[carry]:cursor-none [&[data-dragging]:not([data-carry])]:cursor-grabbing ${te}`.trim(),"data-theme":R,"data-trigger":H?"click":z,style:{"--fly-bg":be,"--fly-ink":we,"--fly-glow":Ae,"--fly-ramp":je,"--fly-pod":"#18181b","--fly-thrust":0,...y},children:[(0,K.jsxs)("svg",{ref:_,className:"pointer-events-none absolute inset-0 block h-full w-full fill-none",style:H?void 0:{display:"none"},"aria-hidden":"true",children:[(0,K.jsx)("path",{style:{stroke:"var(--fly-ramp)",strokeLinejoin:"round"}}),(0,K.jsx)("path",{style:{stroke:Xe,strokeWidth:1.5,strokeLinejoin:"round"}})]}),(0,K.jsx)("canvas",{ref:s,className:"pointer-events-none absolute inset-0 block h-full w-full","aria-hidden":"true"}),(0,K.jsxs)("button",{ref:d,type:"button",className:`group/craft invisible absolute top-0 left-0 z-[1] m-0 inline-flex cursor-pointer touch-none items-center justify-center border-0 leading-none font-medium tracking-[0.01em] whitespace-nowrap outline-none select-none [-webkit-tap-highlight-color:transparent] [background:var(--fly-bg)] [color:var(--fly-ink)] [font-family:inherit] [transform-origin:50%_50%] [will-change:transform] focus-visible:[outline:2px_solid_color-mix(in_srgb,var(--fly-ink)_60%,transparent)] focus-visible:[outline-offset:3px] group-data-[ready]/fly:visible group-data-[trigger=hover]/fly:cursor-default group-data-[carry]/fly:pointer-events-none group-data-[carry]/fly:cursor-none ${Pe}`,style:{height:ie.h,padding:`0 ${ie.px}px`,fontSize:ie.fs,borderRadius:$!=null?le($,0):ie.h/2},onClick:Y=>O.current.onClick&&O.current.onClick(Y),children:[(0,K.jsx)("span",{className:"pointer-events-none absolute inset-0 rounded-[inherit]",style:$e,"aria-hidden":"true"}),(0,K.jsx)("span",{className:"relative group-data-[pressed]/craft:scale-[0.96]",children:t}),Ne.map(Y=>(0,K.jsx)("span",{className:"pointer-events-none absolute -z-10 -translate-x-1/2 rounded-[2px_2px_5px_5px]",style:{left:`${Y}%`,top:`calc(100% - ${3*fe}px)`,width:14*fe,height:8*fe,background:"linear-gradient(180deg, var(--fly-pod), color-mix(in srgb, var(--fly-pod) 80%, #000))"},"aria-hidden":"true",children:(0,K.jsx)("span",{className:"absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[2px_2px_1px_1px]",style:{width:7*fe,height:2*fe,background:`color-mix(in srgb, var(--fly-glow) calc(var(--fly-thrust) * 100%), ${oe?"#52525b":"#3f3f46"})`,boxShadow:"0 1px 4px color-mix(in srgb, var(--fly-glow) calc(var(--fly-thrust) * 90%), transparent)"}})},Y))]}),(0,K.jsx)("svg",{ref:b,className:"pointer-events-none absolute top-0 left-0 z-[3] hidden h-7 w-5 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.28))] [will-change:transform] group-data-[carry]/fly:block",viewBox:"0 0 24 34","aria-hidden":"true",children:(0,K.jsx)("path",{d:"M2.2 2.1v24.6l6.1-5.9 4.1 9.6 4.4-1.9-4.1-9.4h8.6z",fill:"#0a0a0c",stroke:"#fff",strokeWidth:"1.9",strokeLinejoin:"round"})})]})}var at=Re(Ie(),1),Bt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Je=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ht=Bt.map((t,h)=>({id:h+1,image:t,src:t,img:t,url:t,title:Je[h],text:Je[h],label:Je[h],alt:Je[h],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][h],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function zt({big:t}){return(0,at.jsx)(ft,{big:t,dark:!0,center:!0,zoom:1,drive:!1,children:(0,at.jsx)(ot,{})})}var Xt=ut(zt);export{Xt as default};
