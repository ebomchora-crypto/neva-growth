import{c as he,i as br,j as Le,l as kt,m as qt}from"./chunks/chunk-6IYH4WPJ.js";var L=he(br(),1),Q=he(Le(),1),yr={none:"pointer-events-none absolute left-0 top-0 h-0 w-0 rounded-full will-change-transform",drag:"absolute left-0 top-0 h-0 w-0 cursor-grab touch-none rounded-full will-change-transform group-data-[grabbing]:cursor-grabbing",button:"absolute left-0 top-0 h-0 w-0 cursor-pointer rounded-full will-change-transform"},wr=5e6,$=160,Pe=["lens","blob","cube","pill","torus","prism","diamond"],et={lens:1.02,blob:1.08,cube:1.32,pill:1.02,torus:1,prism:1.18,diamond:1.05},Ct={lens:[0,0,0],blob:[.2,0,0],cube:[-.48,.62,0],pill:[0,0,0],torus:[-.5,.18,0],prism:[-.3,.45,0],diamond:[-.35,.5,0]},oe={lens:[0,0],blob:[1,0],cube:[1,0],pill:[0,0],torus:[0,1],prism:[1,0],diamond:[1,0]},Tr=/\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i,Er=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,Rr=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform sampler2D uMedia;
uniform vec4 uMediaRect;
uniform float uMediaOn;
uniform sampler2D uText;
uniform float uTextOn;
uniform vec4 uBackground;
out vec4 fragColor;

void main() {
  vec2 w = gl_FragCoord.xy / uRatio;
  vec2 uv = vec2(w.x, uView.y - w.y) / uView;
  vec4 color = uBackground;
  if (uMediaOn > 0.5) {
    vec2 m = (uv - uMediaRect.xy) / uMediaRect.zw;
    if (m.x >= 0.0 && m.y >= 0.0 && m.x <= 1.0 && m.y <= 1.0) {
      vec4 media = texture(uMedia, m);
      color = media + color * (1.0 - media.a);
    }
  }
  if (uTextOn > 0.5) {
    vec4 text = texture(uText, uv);
    color = text + color * (1.0 - text.a);
  }
  fragColor = color;
}`,Nt={lens:`{
    float a = length(p - vec3(0.0, 0.0, -1.85)) - 2.13;
    float b = length(p - vec3(0.0, 0.0, 1.85)) - 2.13;
    float h = clamp(0.5 - 0.5 * (b - a) / 0.2, 0.0, 1.0);
    return mix(b, a, h) + 0.2 * h * (1.0 - h);
  }`,blob:`{
    vec3 q = p * 1.6;
    float t = uTime;
    float n = sin(q.x + t * 1.1) * sin(q.y * 1.15 - t * 0.9) * sin(q.z * 0.95 + t * 0.8);
    n += 0.45 * sin(q.x * 1.6 - t * 0.6 + q.z) * sin(q.y * 1.9 + t * 1.2 + q.x * 0.5);
    return (length(p) - 0.92 - 0.085 * n) * 0.78;
  }`,cube:`{
    vec3 q = abs(p) - vec3(0.6);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.16;
  }`,pill:`{
    float outline = length(vec2(max(abs(p.x) - 0.58, 0.0), p.y)) - 0.42;
    vec2 q = vec2(outline + 0.16, abs(p.z) - 0.16);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.16;
  }`,torus:`{
    vec2 q = vec2(length(p.xy) - 0.68, p.z);
    return length(q) - 0.3;
  }`,prism:`{
    vec3 q = abs(p);
    float side = max(q.x * 0.866025 + p.y * 0.5, -p.y) - 0.5;
    float d = max(q.z - 0.34, side);
    return d - 0.08;
  }`,diamond:`{
    vec3 q = abs(p);
    return (q.x + q.y * 0.92 + q.z * 1.25 - 0.98) * 0.5;
  }`},Mr=`
  float rim = tr.mode > 1.5 ? 1.0 - smoothstep(0.3, 0.55, clamp(-dot(rd, tr.n), 0.0, 1.0)) : tr.mode;
  if (rim > 0.0) {
    vec2 offsets[3] = vec2[3](vec2(0.33, 0.33), vec2(-0.33, 0.25), vec2(0.25, -0.33));
    float scatter = (length(tx) + length(ty)) / max(uBound, 1.0);
    for (int k = 0; k < 3; k++) {
      vec2 sub = w + offsets[k] * pixel;
      vec3 subDir = normalize(vec3(sub, 0.0) - camera);
      Trace st = traceSurface(ro, subDir, eps, pixel);
      if (st.mode > 1.5 && (uTint.a > 0.0 || bandOf(clamp(-dot(subDir, st.n), 0.0, 1.0), scatter) < 1.0)) {
        traceInterior(st, subDir, eps);
      }
      color += shadeTrace(st, subDir, background, tone, sub, tx, ty, rx, ry);
    }
    color *= 0.25;
  }`,Ar=(a,i,h)=>`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform float uFocal;
uniform vec3 uCenter;
uniform mat3 uInverse;
uniform float uScale;
uniform float uBound;
uniform float uMorph;
uniform float uRipple;
uniform float uTime;
uniform float uIor;
uniform float uDispersion;
uniform float uReflection;
uniform float uFrost;
uniform vec4 uTint;
uniform float uShadow;
uniform vec3 uLight;
uniform float uPresence;
uniform sampler2D uMedia;
uniform vec4 uMediaRect;
uniform float uMediaOn;
uniform sampler2D uText;
uniform float uTextOn;
uniform vec4 uBackground;
uniform float uPass;
uniform sampler2D uShadowMap;
uniform vec4 uShadowBox;
uniform vec2 uShadowSize;
out vec4 fragColor;

float shapeA(vec3 p) ${Nt[a]}
float shapeB(vec3 p) ${Nt[i]}

float field(vec3 p) {
  float d = shapeA(p);
  ${a!==i?"d = mix(d, shapeB(p), uMorph);":""}
  if (uRipple > 0.0) {
    d += uRipple * sin(p.x * 3.1 + uTime * 2.3) * sin(p.y * 3.4 - uTime * 1.9) * sin(p.z * 2.9 + uTime * 1.6);
  }
  return d;
}

float map(vec3 w) {
  return field(uInverse * (w - uCenter)) * uScale;
}

vec3 normalAt(vec3 w) {
  float e = 0.35;
  vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * map(w + k.xyy * e) +
    k.yyx * map(w + k.yyx * e) +
    k.yxy * map(w + k.yxy * e) +
    k.xxx * map(w + k.xxx * e)
  );
}

vec4 content(vec2 w, vec2 gx, vec2 gy) {
  vec2 uv = vec2(w.x, uView.y - w.y) / uView;
  vec2 dx = vec2(gx.x, -gx.y) / uView;
  vec2 dy = vec2(gy.x, -gy.y) / uView;
  vec4 color = uBackground;
  if (uMediaOn > 0.5) {
    vec2 m = (uv - uMediaRect.xy) / uMediaRect.zw;
    vec2 inside = step(vec2(0.0), m) * step(m, vec2(1.0));
    vec4 media = textureGrad(uMedia, m, dx / uMediaRect.zw, dy / uMediaRect.zw) * inside.x * inside.y;
    color = media + color * (1.0 - media.a);
  }
  if (uTextOn > 0.5) {
    vec4 text = textureGrad(uText, uv, dx, dy);
    color = text + color * (1.0 - text.a);
  }
  return color;
}

vec4 frosted(vec2 w, vec2 gx, vec2 gy) {
  if (uFrost <= 0.0) return content(w, gx, gy);
  float r = uFrost * 16.0;
  vec2 bx = gx + vec2(r * 0.35, 0.0);
  vec2 by = gy + vec2(0.0, r * 0.35);
  vec4 sum = content(w, bx, by) * 0.2;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398 + 0.3;
    sum += content(w + vec2(cos(a), sin(a)) * r * (0.55 + 0.45 * float(i & 1)), bx, by) * 0.1;
  }
  return sum;
}

vec3 studio(vec3 d) {
  vec2 a = vec2(atan(d.x, d.z), d.y);
  float key = smoothstep(0.42, 0.22, abs(a.x + 0.62)) * smoothstep(0.3, 0.12, abs(a.y - 0.5));
  float strip = smoothstep(0.12, 0.05, abs(a.x - 0.95)) * smoothstep(0.8, 0.35, abs(a.y - 0.05));
  float dome = smoothstep(0.0, 1.0, d.z) * 0.04;
  return vec3(18.0) * key + vec3(8.0) * strip + vec3(dome);
}

vec4 light(vec3 d, float weight) {
  vec3 c = studio(d) * weight;
  float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
  return vec4(min(c, vec3(a)), a);
}

vec2 landing(vec3 o, vec3 d, vec2 fallback) {
  if (d.z > -0.0005) return fallback;
  return o.xy + d.xy * (-o.z / d.z);
}

float shadowAt(vec2 w, out float caustic) {
  caustic = 0.0;
  if (uShadow <= 0.0) return 0.0;
  vec3 p = vec3(w, 0.0);
  vec2 footprint = uCenter.xy + uLight.xy / uLight.z * uCenter.z;
  if (length(w - footprint) > uBound * 1.6) return 0.0;
  float t = 2.0;
  float occlusion = 1.0;
  float deepest = 1e5;
  for (int i = 0; i < 28; i++) {
    float h = map(p + uLight * t);
    deepest = min(deepest, h);
    if (h > 0.0) occlusion = min(occlusion, 6.0 * h / t);
    if (t > uCenter.z * 2.6 + uBound * 2.0) break;
    t += clamp(abs(h) * 0.8, 2.0, uBound * 0.25);
  }
  if (deepest > 0.0) return (1.0 - clamp(occlusion, 0.0, 1.0)) * 0.36;
  float depth = -deepest / max(uBound, 1.0);
  caustic = smoothstep(0.12, 0.5, depth) * (uIor - 1.0) * 2.0;
  return exp(-depth * 14.0) * 0.42;
}

vec2 shadowSample(vec2 w) {
  if (uShadow <= 0.0) return vec2(0.0);
  vec2 uv = (w - uShadowBox.xy) / uShadowBox.zw;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec2(0.0);
  vec2 s = textureLod(uShadowMap, uv, 0.0).rg;
  return vec2(s.x * 0.42, s.y * 2.0);
}

vec2 lighting(vec2 w, float under) {
  vec2 s = shadowSample(w);
  float dark = s.x * uShadow * uPresence;
  float glow = clamp(s.y * uShadow * uPresence, 0.0, 1.0) * mix(0.12, 0.3, under);
  return vec2(dark * mix(0.45, 1.0, under), glow);
}

vec4 shade(vec4 color, vec2 factors) {
  vec3 rgb = color.rgb * (1.0 - factors.x);
  float alpha = color.a + factors.x - color.a * factors.x;
  rgb = vec3(factors.y) + rgb * (1.0 - factors.y);
  alpha = factors.y + alpha * (1.0 - factors.y);
  return vec4(rgb, alpha);
}

struct Trace {
  float mode;
  float cover;
  vec3 p;
  vec3 n;
  vec3 q;
  vec3 inside;
  vec3 exitNormal;
  vec3 exitDir;
  float escaped;
  float travel;
  float bounces;
};

Trace traceSurface(vec3 ro, vec3 rd, float eps, float pixel) {
  Trace tr;
  tr.mode = 0.0;
  tr.cover = 0.0;
  tr.p = vec3(0.0);
  tr.n = vec3(0.0, 0.0, 1.0);
  tr.q = vec3(0.0);
  tr.inside = vec3(0.0, 0.0, -1.0);
  tr.exitNormal = vec3(0.0, 0.0, 1.0);
  tr.exitDir = vec3(0.0, 0.0, -1.0);
  tr.escaped = 0.0;
  tr.travel = 0.0;
  tr.bounces = 0.0;
  vec3 oc = ro - uCenter;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - uBound * uBound;
  float disc = b * b - c;
  if (disc <= 0.0 || uPresence <= 0.0) return tr;
  float sq = sqrt(disc);
  float t = max(-b - sq, 0.0);
  float tEnd = -b + sq;
  float closest = 1e5;
  float closestT = t;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    float d = map(ro + rd * t);
    if (d < closest) {
      closest = d;
      closestT = t;
    }
    if (d < eps) {
      hit = true;
      break;
    }
    t += d * 0.9;
    if (t > tEnd) break;
  }
  if (!hit && closest < pixel * 0.35) {
    hit = true;
    t = closestT;
  }
  if (!hit) {
    tr.cover = clamp(1.0 - closest / (pixel * 1.2), 0.0, 1.0) * uPresence;
    if (tr.cover > 0.0) {
      tr.mode = 1.0;
      tr.p = ro + rd * closestT;
      tr.n = normalAt(tr.p);
    }
    return tr;
  }
  tr.mode = 2.0;
  tr.p = ro + rd * t;
  tr.n = normalAt(tr.p);
  return tr;
}

void traceInterior(inout Trace tr, vec3 rd, float eps) {
  vec3 inside = refract(rd, tr.n, 1.0 / uIor);
  vec3 q = tr.p + inside * eps * 4.0;
  vec3 exitDir = inside;
  bool escaped = false;
  for (int bounce = 0; bounce < 3; bounce++) {
    for (int i = 0; i < 64; i++) {
      float d = map(q);
      if (d > -eps) break;
      float stepLength = max(-d * 0.9, eps);
      q += inside * stepLength;
      tr.travel += stepLength;
    }
    vec3 n2 = normalAt(q);
    tr.exitNormal = n2;
    vec3 out1 = refract(inside, -n2, uIor);
    if (dot(out1, out1) > 0.0) {
      exitDir = out1;
      escaped = true;
      break;
    }
    inside = reflect(inside, -n2);
    q += inside * eps * 4.0;
    tr.bounces += 1.0;
  }
  if (!escaped) exitDir = inside;
  if (exitDir.z > -0.2) exitDir = normalize(vec3(exitDir.xy, -0.2 - abs(exitDir.z)));
  tr.q = q;
  tr.inside = inside;
  tr.exitDir = exitDir;
  tr.escaped = escaped ? 1.0 : 0.0;
}

float bandOf(float cosi, float scatter) {
  return max(smoothstep(0.42, 0.12, cosi), smoothstep(0.06, 0.24, scatter));
}

vec4 shadeTrace(Trace tr, vec3 rd, vec4 background, vec4 tone, vec2 w, vec2 tx, vec2 ty, vec2 rx, vec2 ry) {
  if (tr.mode < 0.5) return background;
  vec3 mirrorDir = reflect(rd, tr.n);
  if (tr.mode < 1.5) {
    vec4 edgeTone = tone * uReflection * 0.8 + light(mirrorDir, uReflection) * 0.5;
    return mix(background, edgeTone + background * (1.0 - edgeTone.a), tr.cover * 0.7);
  }
  float cosi = clamp(-dot(rd, tr.n), 0.0, 1.0);
  float f0 = pow((uIor - 1.0) / (uIor + 1.0), 2.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - cosi, 5.0);
  float band = bandOf(cosi, (length(tx) + length(ty)) / max(uBound, 1.0));

  vec4 mirror = tone * uReflection;
  vec4 transmitted = tone;
  if (band < 1.0) {
    mirror = mirrorDir.z < -0.0005 ? frosted(landing(tr.p, mirrorDir, w), rx, ry) * uReflection : light(mirrorDir, uReflection);
    vec2 hitT = landing(tr.q, tr.exitDir, w);
    vec4 green = frosted(hitT, tx, ty);
    vec4 red = green;
    vec4 blue = green;
    if (tr.escaped > 0.5 && uDispersion > 0.0) {
      vec3 spread = vec3(-1.0, 0.0, 1.0) * uDispersion * 0.06;
      vec3 dirR = refract(tr.inside, -tr.exitNormal, uIor + spread.x);
      vec3 dirB = refract(tr.inside, -tr.exitNormal, uIor + spread.z);
      if (dot(dirR, dirR) > 0.0 && dirR.z < -0.2) red = frosted(landing(tr.q, dirR, hitT), tx, ty);
      if (dot(dirB, dirB) > 0.0 && dirB.z < -0.2) blue = frosted(landing(tr.q, dirB, hitT), tx, ty);
    }
    vec2 factors = lighting(hitT, 0.0);
    red = shade(red, factors);
    green = shade(green, factors);
    blue = shade(blue, factors);
    transmitted = mix(vec4(red.r, green.g, blue.b, green.a), tone, band);
    mirror = mix(mirror, tone * uReflection, band);
  }

  vec3 tint = pow(max(uTint.rgb, vec3(0.001)), vec3(uTint.a * tr.travel / max(uBound, 1.0)));
  transmitted.rgb *= tint;
  float body = (1.0 - dot(tint, vec3(0.3333))) * 0.7;
  transmitted += vec4(uTint.rgb * body, body) * (1.0 - transmitted.a);

  vec4 reflected = mirrorDir.z < -0.0005 ? mirror * fresnel : light(mirrorDir, uReflection * fresnel);
  vec4 glass = reflected + transmitted * (1.0 - reflected.a);
  float edge = 1.0 - smoothstep(0.04, 0.3, cosi);
  glass = mix(glass, mirror + background * (1.0 - mirror.a), edge);
  vec2 facing = normalize(vec2(-0.42, 0.55));
  float rimLight = pow(1.0 - cosi, 3.0) * (0.25 + 0.75 * abs(dot(normalize(tr.n.xy + 1e-5), facing))) * 0.55 * uReflection;
  rimLight *= smoothstep(0.0, 0.08, cosi);
  glass = vec4(rimLight) + glass * (1.0 - rimLight);
  return mix(background, glass, uPresence);
}

void main() {
  if (uPass > 0.5) {
    float caustic;
    float dark = shadowAt(uShadowBox.xy + gl_FragCoord.xy / uShadowSize * uShadowBox.zw, caustic);
    fragColor = vec4(dark / 0.42, caustic * 0.5, 0.0, 1.0);
    return;
  }
  vec2 w = gl_FragCoord.xy / uRatio;
  vec3 camera = vec3(uView * 0.5, uFocal);
  vec3 ro = camera;
  vec3 rd = normalize(vec3(w, 0.0) - camera);
  float pixel = 1.0 / uRatio;
  float eps = 0.25 * pixel;

  Trace tr = traceSurface(ro, rd, eps, pixel);
  if (tr.mode > 1.5) traceInterior(tr, rd, eps);
  vec2 hitT = tr.mode > 1.5 ? landing(tr.q, tr.exitDir, w) : w;
  vec2 hitR = tr.mode > 0.5 ? landing(tr.p, reflect(rd, tr.n), w) : w;
  vec2 tx = dFdx(hitT);
  vec2 ty = dFdy(hitT);
  vec2 rx = dFdx(hitR);
  vec2 ry = dFdy(hitR);
  vec2 wx = dFdx(w);
  vec2 wy = dFdy(w);

  vec4 background = shade(content(w, wx, wy), lighting(w, 1.0));
  vec4 tone = tr.mode > 0.5 ? content(uCenter.xy, vec2(uBound * 1.4, 0.0), vec2(0.0, uBound * 1.4)) : vec4(0.0);
  vec4 color = shadeTrace(tr, rd, background, tone, w, tx, ty, rx, ry);
  ${h?Mr:""}
  fragColor = color;
}`,g=(a,i,h)=>Math.min(h,Math.max(i,a)),zt=a=>{let i=String(a||"").trim(),h=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(i);if(h){let M=h[1].length===3?h[1].replace(/./g,T=>T+T):h[1];return[0,2,4].map(T=>parseInt(M.slice(T,T+2),16)/255).concat(1)}let d=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/i.exec(i);if(d){let M=d[4]===void 0?1:d[4].endsWith("%")?parseFloat(d[4])/100:parseFloat(d[4]);return[d[1],d[2],d[3]].map(T=>g(parseFloat(T)/255,0,1)).concat(g(M,0,1))}return null},Gt=(a,i,h)=>{let d=a.createShader(i);return d?(a.shaderSource(d,h),a.compileShader(d),d):null},_r=a=>{let i=g(a,0,1);return i*i*i*(i*(i*6-15)+10)},ne=(a,i,h)=>{let d=Math.cos(a/2),M=Math.sin(a/2),T=Math.cos(i/2),X=Math.sin(i/2),Y=Math.cos(h/2),F=Math.sin(h/2);return[M*T*Y-d*X*F,d*X*Y+M*T*F,d*T*F-M*X*Y,d*T*Y+M*X*F]},Be=(a,i)=>[a[3]*i[0]+a[0]*i[3]+a[1]*i[2]-a[2]*i[1],a[3]*i[1]-a[0]*i[2]+a[1]*i[3]+a[2]*i[0],a[3]*i[2]+a[0]*i[1]-a[1]*i[0]+a[2]*i[3],a[3]*i[3]-a[0]*i[0]-a[1]*i[1]-a[2]*i[2]],tt=(a,i,h)=>{let d=a[0]*i[0]+a[1]*i[1]+a[2]*i[2]+a[3]*i[3],M=d<0?i.map(P=>-P):i;if(d=Math.abs(d),d>.9995){let P=a.map((j,Ie)=>j+(M[Ie]-j)*h),ie=Math.hypot(...P);return P.map(j=>j/ie)}let T=Math.acos(d),X=Math.sin(T),Y=Math.sin((1-h)*T)/X,F=Math.sin(h*T)/X;return a.map((P,ie)=>P*Y+M[ie]*F)},Yt=(a,i)=>[Math.sin(a*.37)*i*.35+Math.sin(a*.71+1.3)*i*.12,Math.sin(a*.29+.8)*i*.2+Math.cos(a*.53)*i*.08],Dr=([a,i,h,d])=>[1-2*(i*i+h*h),2*(a*i+h*d),2*(a*h-i*d),2*(a*i-h*d),1-2*(a*a+h*h),2*(i*h+a*d),2*(a*h+i*d),2*(i*h-a*d),1-2*(a*a+i*i)],Sr=({text:a="Look closer.",textColor:i,fontFamily:h,fontWeight:d=600,fontSize:M,src:T,fit:X="cover",background:Y="transparent",shape:F="torus",shapes:P,size:ie=260,refraction:j=1,dispersion:Ie=.35,reflection:$t=1,frost:Vt=0,color:Ht="#ffffff",tint:Wt=0,shadow:Kt=.5,elevation:Zt=.4,interaction:pe="follow",smoothness:Jt=.5,wobble:Qt=.5,spin:jt=.3,idle:er=!0,morphOnClick:Xe=!0,onShapeChange:tr,position:ot=[.5,.5],intro:rr=!0,maxDevicePixelRatio:or=2,className:nr="",style:ir,children:nt})=>{let it=(0,L.useRef)(null),at=(0,L.useRef)(null),ct=(0,L.useRef)(null),Fe=(0,L.useRef)(null),[st,ar]=(0,L.useState)(0),lt=Array.isArray(P)&&P.length?P.filter(D=>Pe.includes(D)):Pe,ut={text:String(a??""),textColor:i,fontFamily:h,fontWeight:d,fontSize:M,src:T,fit:X,background:zt(Y)||[0,0,0,0],shape:Pe.includes(F)?F:"torus",cycle:lt.length?lt:Pe,size:Math.max(16,ie),ior:1+.5*g(j,0,2),dispersion:g(Ie,0,1),reflection:g($t,0,2),frost:g(Vt,0,1),color:zt(Ht)||[1,1,1,1],tint:g(Wt,0,1),shadow:g(Kt,0,1),elevation:g(Zt,0,3),interaction:pe,smoothness:g(Jt,0,1),wobble:g(Qt,0,1),spin:jt,idle:er,morphOnClick:Xe,onShapeChange:tr,position:[g(ot?.[0]??.5,0,1),g(ot?.[1]??.5,0,1)],intro:rr,maxRatio:g(or,.5,3)},R=(0,L.useRef)(ut);return R.current=ut,(0,L.useEffect)(()=>{Fe.current?.()}),(0,L.useEffect)(()=>{let D=it.current,E=at.current;if(!D||!E)return;let e=E.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!e)return;let dt=e.getExtension("KHR_parallel_shader_compile"),ft=Gt(e,e.VERTEX_SHADER,Er),ve=new Map,V=t=>{let n=t==="content"?t:`${t}>${v.ratio<1.75?1:0}`;if(ve.has(n))return ve.get(n);let[o,s,l]=n.split(">"),f=Gt(e,e.FRAGMENT_SHADER,n==="content"?Rr:Ar(o,s,l==="1")),y=e.createProgram();e.attachShader(y,ft),e.attachShader(y,f),e.linkProgram(y);let x={program:y,fragment:f,uniforms:null,failed:!1};return ve.set(n,x),x},ke=t=>{if(t.failed)return!1;if(t.uniforms)return!0;if(dt&&!e.getProgramParameter(t.program,dt.COMPLETION_STATUS_KHR))return!1;if(!e.getProgramParameter(t.program,e.LINK_STATUS))return console.error(e.getShaderInfoLog(t.fragment)||e.getProgramInfoLog(t.program)),t.failed=!0,!1;let n={},o=e.getProgramParameter(t.program,e.ACTIVE_UNIFORMS);for(let s=0;s<o;s++){let l=e.getActiveUniform(t.program,s);l&&(n[l.name]=e.getUniformLocation(t.program,l.name))}return t.uniforms=n,!0},B=window.matchMedia("(prefers-reduced-motion: reduce)").matches,qe=e.createVertexArray(),mt=()=>{let t=e.createTexture();return e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array(4)),e.generateMipmap(e.TEXTURE_2D),t},xe=mt(),Ce=mt(),ge=e.createTexture();e.bindTexture(e.TEXTURE_2D,ge),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,$,$,0,e.RGBA,e.UNSIGNED_BYTE,null);let Ne=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,Ne),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,ge,0),e.bindFramebuffer(e.FRAMEBUFFER,null);let be=document.createElement("canvas"),v={width:1,height:1,ratio:1},p={src:null,clip:null,image:null,ready:!1,width:1,height:1},ae={key:"",ready:!1},u={x:0,y:0,inside:!1,down:!1,grabbed:!1,offsetX:0,offsetY:0,startX:0,startY:0},r={x:0,y:0,vx:0,vy:0,spin:0,ripple:0,dirX:1,dirY:0,anchorX:0,anchorY:0},b={stretch:1,vstretch:0,tiltX:0,vtiltX:0,tiltY:0,vtiltY:0,scale:0,vscale:0},ht=!1,H=!1,c={from:R.current.shape,to:R.current.shape,t:1,pending:null},pt=R.current.shape,ee=R.current.intro&&!B&&st===0?0:1;ee===1&&(b.scale=1);let vt=0,ze=Math.random()*20,k=0,ye=0,xt=0,Ge=1e3/60,Ye=0,W=!1,te=!0,re=document.visibilityState!=="hidden",Oe=!1,ce=null,$e=()=>{let t=R.current,n=getComputedStyle(D),o=t.fontFamily||n.fontFamily||"sans-serif",s=t.textColor||n.color||"#ffffff",l=E.width,f=E.height,y=[t.text,o,s,t.fontWeight,t.fontSize,l,f].join("|");if(y===ae.key)return;ae.key=y,be.width=l,be.height=f;let x=be.getContext("2d");x.clearRect(0,0,l,f);let _=t.text.split(`
`);if(t.text.trim()){let q=v.ratio,C=S=>`${t.fontWeight} ${S}px ${o}`,U=t.fontSize?t.fontSize*q:f*.36;if(!t.fontSize){x.font=C(100);let S=Math.max(..._.map(Je=>x.measureText(Je).width),1);U=Math.min(l*.84*100/S,f*.64/(_.length*1.02))}x.font=C(U),x.fillStyle=s,x.textAlign="center",x.textBaseline="alphabetic","letterSpacing"in x&&(x.letterSpacing=`${-.03*U}px`);let I=x.measureText("Hg"),K=I.actualBoundingBoxAscent||U*.72,Ke=I.actualBoundingBoxDescent||U*.2,le=U*1.02,Ze=le*(_.length-1)+K+Ke,ue=(f-Ze)/2+K;_.forEach(S=>{x.fillText(S,l/2,ue),ue+=le})}e.bindTexture(e.TEXTURE_2D,Ce),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,be),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.generateMipmap(e.TEXTURE_2D),ae.ready=!!t.text.trim()},gt=()=>{p.clip&&(p.clip.pause(),p.clip.removeAttribute("src"),p.clip.load(),p.clip=null)},bt=()=>{let t=R.current;if(t.src!==p.src&&(gt(),p.src=t.src,p.ready=!1,p.image=null,!!t.src))if(Tr.test(t.src)){let n=document.createElement("video");n.crossOrigin="anonymous",n.muted=!0,n.loop=!0,n.playsInline=!0,n.autoplay=!0,n.preload="auto",n.src=t.src,n.addEventListener("loadeddata",()=>{p.clip===n&&(p.width=n.videoWidth||1,p.height=n.videoHeight||1,p.ready=!0,A())}),n.play().catch(()=>{}),p.clip=n}else{let n=new Image;n.crossOrigin="anonymous",n.decoding="async",n.onload=()=>{p.image===n&&(p.width=n.naturalWidth||1,p.height=n.naturalHeight||1,e.bindTexture(e.TEXTURE_2D,xe),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,n),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.generateMipmap(e.TEXTURE_2D),p.ready=!0,A())},n.src=t.src,p.image=n}},Ve=()=>{let t=R.current,n=D.getBoundingClientRect(),o=Math.max(1,n.width),s=Math.max(1,n.height),l=Math.min(window.devicePixelRatio||1,t.maxRatio,Math.sqrt(wr/(o*s))),f=Math.max(1,Math.round(o*l)),y=Math.max(1,Math.round(s*l));if((E.width!==f||E.height!==y)&&(E.width=f,E.height=y),v.width=o,v.height=s,v.ratio=f/o,!ht)r.x=t.position[0]*o,r.y=t.position[1]*s,r.anchorX=r.x,r.anchorY=r.y,ht=!0;else if(t.interaction==="drag"){let x=se()*1.08;r.anchorX=g(r.anchorX,x,Math.max(x,o-x)),r.anchorY=g(r.anchorY,x,Math.max(x,s-x))}$e()},se=()=>{let t=R.current;return Math.min(t.size/2,Math.min(v.width,v.height)*.36)},yt=(t,n)=>{e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,xe),e.uniform1i(t.uMedia,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,Ce),e.uniform1i(t.uText,1),e.uniform2f(t.uView,v.width,v.height),e.uniform1f(t.uRatio,v.ratio);let o=[0,0,1,1];if(p.ready){let l=v.width/v.height,f=p.width/p.height;if(f>l==(n.fit!=="contain")){let y=f/l;o=[(1-y)/2,0,y,1]}else{let y=l/f;o=[0,(1-y)/2,1,y]}}e.uniform4f(t.uMediaRect,o[0],o[1],o[2],o[3]),e.uniform1f(t.uMediaOn,p.ready?1:0),e.uniform1f(t.uTextOn,ae.ready?1:0);let s=n.background;e.uniform4f(t.uBackground,s[0]*s[3],s[1]*s[3],s[2]*s[3],s[3])},He=()=>{let t=R.current,n=se(),o=t.idle&&!B?Yt(ze,n):[0,0],s=n*1.08;r.anchorX=g(r.x,s,Math.max(s,v.width-s))-o[0],r.anchorY=g(r.y,s,Math.max(s,v.height-s))-o[1]},we=(t,n,o,s,l)=>{let f=`v${t}`,y=Math.max(1,Math.ceil(l/(1/240))),x=l/y;for(let q=0;q<y;q++)b[f]+=(o*o*(n-b[t])-2*s*o*b[f])*x,b[t]+=b[f]*x;let _=Math.abs(n-b[t])<5e-4&&Math.abs(b[f])<.002;return _&&(b[t]=n,b[f]=0),!_},Te=t=>{if(k=0,Oe)return;let n=t-xt;if(xt=t,n>2&&n<100&&(Ge+=(n-Ge)*.1),W&&Ye<Math.round(12/Ge)-1){Ye+=1,te&&re&&(k=requestAnimationFrame(Te));return}Ye=0;let o=R.current,s=g((t-ye)/1e3||0,0,.05);ye=Math.max(ye,t),vt+=s;let l=!1;if(o.shape!==pt&&(pt=o.shape,c.pending=o.shape),c.pending&&c.t>=1){let m=`${c.to}>${c.pending}`,G=V(m);ke(G)&&(V(`${c.pending}>${c.pending}`),c.from=c.to,c.to=c.pending,c.pending=null,c.t=0,b.vstretch-=2.5*o.wobble,c.to!==c.from&&o.onShapeChange?.(c.to)),l=!0}if(c.t<1&&(c.t=Math.min(1,c.t+s/(B?.35:.85)),l=!0),o.morphOnClick&&o.cycle.length>1&&!c.pending){let m=o.cycle.indexOf(c.to);V(`${c.to}>${o.cycle[(m+1)%o.cycle.length]}`)}let f=se();!u.grabbed&&o.interaction!=="drag"&&(r.anchorX=o.position[0]*v.width,r.anchorY=o.position[1]*v.height);let y=o.idle&&!B;y&&!u.grabbed&&(ze+=s,l=!0);let x=y?Yt(ze,f):[0,0],_=r.anchorX+x[0],q=r.anchorY+x[1];o.interaction==="follow"&&u.inside&&(_=u.x,q=u.y);let C=(u.grabbed?34:24)*Math.pow(.18,o.smoothness)*(B?1.6:1),U=Math.max(1,Math.ceil(s/(1/240))),I=s/U;if(u.grabbed&&(_=u.x-u.offsetX,q=u.y-u.offsetY,H=!1),H){let m=f*1.08;for(let G=0;G<U;G++){r.x+=r.vx*I,r.y+=r.vy*I;let me=Math.exp(-I*1.4);r.vx*=me,r.vy*=me,(r.x<m||r.x>v.width-m)&&(r.x=g(r.x,m,Math.max(m,v.width-m)),b.vstretch-=Math.min(4,Math.abs(r.vx)*.0016)*o.wobble,r.vx*=-.62),(r.y<m||r.y>v.height-m)&&(r.y=g(r.y,m,Math.max(m,v.height-m)),b.vstretch-=Math.min(4,Math.abs(r.vy)*.0016)*o.wobble,r.vy*=-.62)}Math.hypot(r.vx,r.vy)<30&&(H=!1,He()),l=!0}else{for(let m=0;m<U;m++)r.vx+=(C*C*(_-r.x)-2*.86*C*r.vx)*I,r.vy+=(C*C*(q-r.y)-2*.86*C*r.vy)*I,r.x+=r.vx*I,r.y+=r.vy*I;(Math.abs(_-r.x)+Math.abs(q-r.y)>.05||Math.hypot(r.vx,r.vy)>.5)&&(l=!0)}let K=Math.hypot(r.vx,r.vy);K>1&&(r.dirX=r.vx/K,r.dirY=r.vy/K);let Ke=1+g(K/1800,0,.55)*o.wobble*(B?0:1);l=we("stretch",Ke,13,.32,s)||l;let le=B?0:45e-5;l=we("tiltX",g(r.vy*le,-.7,.7),9,.5,s)||l,l=we("tiltY",g(r.vx*le,-.7,.7),9,.5,s)||l,!B&&(c.to==="blob"||c.from==="blob"&&c.t<1)&&(l=!0),!B&&o.spin&&(r.spin+=s*o.spin,l=!0);let Ze=c.t<1?`${c.from}>${c.to}`:`${c.to}>${c.to}`,ue=V(Ze);if(ke(ue)?ce=ue:l=!0,ce&&(ee<1&&(ee=Math.min(1,ee+s/.5),l=!0),l=we("scale",1,11,.52,s)||l),r.ripple+=((c.t<1?.05*o.wobble*Math.sin(Math.PI*c.t):0)-r.ripple)*(1-Math.exp(-s/.08)),p.clip&&p.ready&&!p.clip.paused&&(e.bindTexture(e.TEXTURE_2D,xe),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,p.clip),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.generateMipmap(e.TEXTURE_2D),l=!0),!ce){let m=V("content");ke(m)&&(e.viewport(0,0,E.width,E.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(m.program),e.bindVertexArray(qe),yt(m.uniforms,o),e.drawArrays(e.TRIANGLES,0,3)),te&&re&&(k=requestAnimationFrame(Te));return}let S=_r(c.t),Je=et[c.from]+(et[c.to]-et[c.from])*S,Qe=f/Je,Re=Math.max(.001,b.scale),cr=ne(...Ct[c.from]),sr=ne(...Ct[c.to]),Z=tt(cr,sr,S),Pt=oe[c.from][0]+(oe[c.to][0]-oe[c.from][0])*S,lr=oe[c.from][1]+(oe[c.to][1]-oe[c.from][1])*S,Bt=r.spin%(Math.PI*2),ur=tt([0,0,0,1],ne(0,Bt,0),Pt),dr=tt([0,0,0,1],ne(0,0,Bt),lr);Z=Be(Be(ne(Math.sin(r.spin*.6)*.18*Pt,0,0),ur),Z),Z=Be(dr,Z),Z=Be(ne(b.tiltX,b.tiltY,0),Z);let N=Dr(Z),J=Math.max(.2,b.stretch),z=1/Math.sqrt(J),Me=r.dirX,Ae=-r.dirY,fr=[1/z+(1/J-1/z)*Me*Me,(1/J-1/z)*Me*Ae,0,(1/J-1/z)*Me*Ae,1/z+(1/J-1/z)*Ae*Ae,0,0,0,1/z],mr=[N[0],N[3],N[6],N[1],N[4],N[7],N[2],N[5],N[8]],Ut=new Float32Array(9);for(let m=0;m<3;m++)for(let G=0;G<3;G++){let me=0;for(let Se=0;Se<3;Se++)me+=mr[Se*3+G]*fr[m*3+Se];Ut[m*3+G]=me/(Qe*Re)}let hr=Math.min(J,z),pr=Math.max(J,z),de=Math.max(v.width,v.height)*1.6,fe=Qe*(.35+o.elevation),vr=v.height-r.y,It=v.width/2+(r.x-v.width/2)*((de-fe)/de),Xt=v.height/2+(vr-v.height/2)*((de-fe)/de),_e=ct.current;if(_e){let m=f*Re*2;_e.style.width=`${m.toFixed(1)}px`,_e.style.height=`${m.toFixed(1)}px`,_e.style.transform=`translate3d(${(r.x-m/2).toFixed(1)}px, ${(r.y-m/2).toFixed(1)}px, 0)`}let w=ce.uniforms;e.useProgram(ce.program),e.bindVertexArray(qe),yt(w,o),e.uniform1f(w.uFocal,de),e.uniform3f(w.uCenter,It,Xt,fe),e.uniformMatrix3fv(w.uInverse,!1,Ut),e.uniform1f(w.uScale,Qe*Re*hr);let Ft=f*Re*pr*1.08+2;e.uniform1f(w.uBound,Ft),e.uniform1f(w.uMorph,S),e.uniform1f(w.uRipple,r.ripple),e.uniform1f(w.uTime,B?0:vt),e.uniform1f(w.uIor,o.ior),e.uniform1f(w.uDispersion,o.dispersion),e.uniform1f(w.uReflection,o.reflection),e.uniform1f(w.uFrost,o.frost),e.uniform4f(w.uTint,o.color[0],o.color[1],o.color[2],o.tint*1.6),e.uniform1f(w.uShadow,o.shadow);let O=[-.42,.55,1],je=Math.hypot(...O);e.uniform3f(w.uLight,O[0]/je,O[1]/je,O[2]/je),e.uniform1f(w.uPresence,ee);let De=Ft*1.6*($/($-6))+1,xr=It+O[0]/O[2]*fe,gr=Xt+O[1]/O[2]*fe;e.uniform4f(w.uShadowBox,xr-De,gr-De,De*2,De*2),e.uniform2f(w.uShadowSize,$,$),e.uniform1i(w.uShadowMap,2),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,null),o.shadow>0&&(e.bindFramebuffer(e.FRAMEBUFFER,Ne),e.viewport(0,0,$,$),e.uniform1f(w.uPass,1),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,ge)),e.viewport(0,0,E.width,E.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.uniform1f(w.uPass,0),e.drawArrays(e.TRIANGLES,0,3),W=!u.grabbed&&!H&&c.t>=1&&!c.pending&&ee>=1&&Math.abs(o.spin)<=1&&Math.hypot(r.vx,r.vy)<120&&Math.abs(b.vstretch)+Math.abs(b.vtiltX)+Math.abs(b.vtiltY)+Math.abs(b.vscale)<.05,l&&te&&re&&(k=requestAnimationFrame(Te))},A=()=>{k||Oe||!te||!re||(ye=performance.now(),k=requestAnimationFrame(Te))};Fe.current=()=>{W=!1,bt(),Ve(),A()};let We=t=>{let n=D.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top,inside:t.clientX>=n.left&&t.clientX<=n.right&&t.clientY>=n.top&&t.clientY<=n.bottom}},wt=t=>{let n=We(t);u.x=n.x,u.y=n.y,u.inside=n.inside,(n.inside||u.grabbed)&&(W=!1),A()},Tt=t=>{let n=R.current,o=We(t);if(!o.inside)return;u.x=o.x,u.y=o.y,u.inside=!0,u.down=!0;let s=Math.hypot(o.x-r.x,o.y-r.y)<se()*1.1;n.interaction==="drag"&&s&&(u.grabbed=!0,D.setAttribute("data-grabbing",""),H=!1,u.offsetX=o.x-r.x,u.offsetY=o.y-r.y),u.startX=o.x,u.startY=o.y,W=!1,A()},Et=t=>{let n=R.current;if(!u.down)return;u.down=!1;let o=We(t),s=Math.hypot(o.x-u.startX,o.y-u.startY)>6,l=Math.hypot(o.x-r.x,o.y-r.y)<se()*1.1;if(u.grabbed&&(u.grabbed=!1,D.removeAttribute("data-grabbing"),H=Math.hypot(r.vx,r.vy)>60,H||He()),!s&&l&&o.inside&&(b.vstretch-=3*n.wobble,n.morphOnClick&&n.cycle.length>1)){let f=n.cycle.indexOf(c.pending||c.to);c.pending=n.cycle[(f+1)%n.cycle.length]}t.pointerType!=="mouse"&&(u.inside=!1),W=!1,A()},Ee=()=>{W=!1,u.inside=!1,u.down=!1,u.grabbed&&(u.grabbed=!1,D.removeAttribute("data-grabbing"),He()),A()};window.addEventListener("pointermove",wt,{passive:!0}),window.addEventListener("pointerdown",Tt,{passive:!0}),window.addEventListener("pointerup",Et,{passive:!0}),window.addEventListener("pointercancel",Ee,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ee);let Rt=t=>{t.preventDefault(),Oe=!0,cancelAnimationFrame(k),k=0},Mt=()=>ar(t=>t+1);E.addEventListener("webglcontextlost",Rt),E.addEventListener("webglcontextrestored",Mt);let At=new ResizeObserver(()=>{Ve(),A()});At.observe(D);let _t=()=>{p.clip&&(te&&re?p.clip.play().catch(()=>{}):p.clip.pause())},Dt=new IntersectionObserver(t=>{te=t.some(n=>n.isIntersecting),_t(),A()});Dt.observe(D);let St=()=>{re=document.visibilityState!=="hidden",_t(),A()};document.addEventListener("visibilitychange",St);let Lt=new MutationObserver(()=>{$e(),A()});return Lt.observe(document.documentElement,{attributes:!0,attributeFilter:["class","style","data-theme"]}),document.fonts?.ready&&document.fonts.ready.then(()=>{ae.key="",$e(),A()}),Ve(),V("content"),V(`${R.current.shape}>${R.current.shape}`),bt(),A(),()=>{cancelAnimationFrame(k),Fe.current=null,At.disconnect(),Dt.disconnect(),Lt.disconnect(),window.removeEventListener("pointermove",wt),window.removeEventListener("pointerdown",Tt),window.removeEventListener("pointerup",Et),window.removeEventListener("pointercancel",Ee),document.documentElement.removeEventListener("pointerleave",Ee),document.removeEventListener("visibilitychange",St),E.removeEventListener("webglcontextlost",Rt),E.removeEventListener("webglcontextrestored",Mt),gt(),e.isContextLost()||(ve.forEach(t=>{e.deleteProgram(t.program),e.deleteShader(t.fragment)}),e.deleteShader(ft),e.deleteTexture(xe),e.deleteTexture(Ce),e.deleteTexture(ge),e.deleteFramebuffer(Ne),e.deleteVertexArray(qe))}},[st]),(0,Q.jsxs)("div",{ref:it,className:`group relative h-full w-full overflow-hidden ${nr}`.trim(),style:ir,"data-interaction":pe,"data-clickable":Xe?"":void 0,children:[(0,Q.jsx)("canvas",{ref:at,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"}),(0,Q.jsx)("div",{ref:ct,className:yr[pe==="drag"?"drag":pe==="static"&&Xe?"button":"none"],"aria-hidden":"true"}),a?(0,Q.jsx)("p",{className:"sr-only whitespace-pre-line",children:a}):null,nt?(0,Q.jsx)("div",{className:"pointer-events-none absolute inset-0 [&>*]:pointer-events-auto",children:nt}):null]})},Ot=Sr;var rt=he(Le(),1),Lr=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Ue=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],kr=Lr.map((a,i)=>({id:i+1,image:a,src:a,img:a,url:a,title:Ue[i],text:Ue[i],label:Ue[i],alt:Ue[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Pr({big:a}){return(0,rt.jsx)(qt,{big:a,dark:!0,center:!0,zoom:1,drive:!1,children:(0,rt.jsx)(Ot,{})})}var qr=kt(Pr);export{qr as default};
