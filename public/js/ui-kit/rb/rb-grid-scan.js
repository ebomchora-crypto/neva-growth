import{c as te,i as pt,j as le,l as He,m as Ve}from"./chunks/chunk-6IYH4WPJ.js";var T=te(pt(),1),W=te(le(),1),se=4,We=2.4,xt=2.2,ue=1.25,gt="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js",yt="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights",wt={solid:0,dashed:1,dotted:2},bt=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Et=`#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uPixel;
uniform vec3 uEye;
uniform float uDepth;
uniform vec3 uCell;
uniform float uThick;
uniform float uDot;
uniform int uStyle;
uniform vec3 uLineColor;
uniform vec3 uScanColor;
uniform vec3 uCoreColor;
uniform float uFade;
uniform float uScanZ;
uniform float uScanDir;
uniform float uScanAlpha;
uniform float uScanWidth;
uniform float uTrail;
uniform float uReveal;
uniform float uPoints;
uniform float uReflect;
uniform float uHaze;
uniform float uShade;
uniform float uLight;
uniform vec4 uPing[4];
uniform float uPingAlpha[4];
uniform vec4 uHover;
uniform float uTime;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outGlow;

struct Light {
  float grid;
  float fade;
  float core;
  float trail;
  float spill;
  float ping;
  float wake;
  float reveal;
};

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float lines(float across, float along, float period, float dash, float fa, float fb) {
  float u = across / period;
  float du = fa / period;
  float d = abs(fract(u + 0.5) - 0.5) / max(du, 1e-5);
  float dense = smoothstep(0.1, 0.4, du);
  if (uStyle == 2) {
    float c = along / dash * 5.0;
    float dc = fb / dash * 5.0;
    float e = abs(fract(c + 0.5) - 0.5) / max(dc, 1e-5);
    float cov = clamp(uThick + 1.0 - length(vec2(d, e)), 0.0, 1.0);
    float mean = min(1.0, 3.1416 * (uThick + 0.5) * (uThick + 0.5) * du * dc);
    return mix(cov, mean, max(dense, smoothstep(0.1, 0.4, dc)));
  }
  float cov = clamp(uThick + 0.5 - d, 0.0, 1.0);
  float mean = min(1.0, 2.0 * uThick * du);
  if (uStyle == 1) {
    float c = along / dash * 4.0;
    float dc = fb / dash * 4.0;
    float e = abs(fract(c + 0.5) - 0.5);
    float m = clamp((0.25 - e) / max(dc, 1e-5) + 0.5, 0.0, 1.0);
    cov *= mix(m, 0.5, smoothstep(0.1, 0.4, dc));
    mean *= 0.5;
  }
  return mix(cov, mean, dense);
}

float depthFade(float z) {
  float n = clamp(z / uDepth, 0.0, 1.0);
  return mix(1.0, (exp(-3.0 * n) - 0.0497871) / 0.9502129, uFade);
}

vec3 project(vec3 eye, vec3 o, int face, float plane) {
  vec3 d = o - eye;
  float t = face == 0 ? (plane - o.x) / d.x : (face == 1 ? (plane - o.y) / d.y : (plane - o.z) / d.z);
  return o + d * t;
}

void trace(vec3 o, vec3 d, out int face, out float plane, out vec3 h) {
  float sx = d.x > 0.0 ? 0.5 * uAspect : -0.5 * uAspect;
  float sy = d.y > 0.0 ? 0.5 : -0.5;
  float tx = abs(d.x) > 1e-6 ? (sx - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? (sy - o.y) / d.y : 1e9;
  float t = (uDepth - o.z) / d.z;
  face = 2;
  plane = uDepth;
  if (tx < t) {
    face = 0;
    plane = sx;
    t = tx;
  }
  if (ty < t) {
    face = 1;
    plane = sy;
    t = ty;
  }
  h = o + d * t;
}

vec2 faceUv(vec3 h, int face) {
  if (face == 0) return vec2(h.z, h.y + 0.5);
  if (face == 1) return vec2(h.x + 0.5 * uAspect, h.z);
  return vec2(h.x + 0.5 * uAspect, h.y + 0.5);
}

Light illuminate(vec3 h, int face, vec2 uv, vec2 foot, float blur) {
  Light l;
  vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
  vec2 f = foot * blur;
  float minor = max(lines(uv.x, uv.y, cell.x, cell.y, f.x, f.y), lines(uv.y, uv.x, cell.y, cell.x, f.y, f.x));
  float major = max(
    lines(uv.x, uv.y, cell.x * 4.0, cell.y, f.x, f.y),
    lines(uv.y, uv.x, cell.y * 4.0, cell.x, f.y, f.x)
  );
  l.grid = max(minor * 0.75, major) / blur;
  float z = h.z;
  l.fade = depthFade(z);
  l.reveal = smoothstep(uReveal, uReveal - 0.2, z);
  float zFoot = face == 0 ? f.x : (face == 1 ? f.y : 0.0);
  float width = max(uScanWidth, zFoot * 1.1);
  float dz = z - uScanZ;
  l.core = exp(-dz * dz / (width * width)) * (face == 2 ? 0.45 : 1.0) * uScanAlpha;
  float behind = -dz * uScanDir;
  l.trail = exp(-max(behind, 0.0) / uTrail) * smoothstep(-width, width * 0.5, behind) * uScanAlpha;
  l.spill = exp(-dz * dz / 0.05) * uScanAlpha;
  l.ping = 0.0;
  l.wake = 0.0;
  for (int i = 0; i < 4; i++) {
    float alpha = uPingAlpha[i];
    if (alpha <= 0.0) continue;
    float dist = length(h - uPing[i].xyz) - uPing[i].w;
    l.ping += exp(-dist * dist / 0.0012) * alpha;
    l.wake += exp(min(dist, 0.0) / 0.22) * smoothstep(0.03, -0.03, dist) * alpha;
  }
  return l;
}

void over(inout vec4 acc, vec3 color, float alpha) {
  alpha = clamp(alpha, 0.0, 1.0);
  acc = vec4(color * alpha, alpha) + acc * (1.0 - alpha);
}

void paint(inout vec4 color, inout float energy, Light l, float gain, float lift, float hover) {
  float base = l.grid * l.fade * l.reveal * lift;
  float far = l.fade * l.reveal * gain;
  float lit = l.grid * (l.core * 1.2 + l.trail * 0.75 + l.ping * 1.4 + l.wake * 0.5 + hover * 0.5) * far;
  float sheen = (l.core * 0.14 + l.spill * 0.05 + l.trail * 0.03 + l.ping * 0.2 + l.wake * 0.04) * far;
  float laser = (l.core + l.ping * 0.35) * far;
  over(color, uLineColor, base);
  over(color, uScanColor, sheen);
  over(color, uScanColor, lit);
  over(color, uCoreColor, laser * 0.9);
  energy += laser * 0.9 + lit * 0.5;
}

void main() {
  vec3 p = vec3((vUv.x - 0.5) * uAspect, vUv.y - 0.5, 0.0);
  vec3 d = p - uEye;
  int face;
  float plane;
  vec3 h;
  trace(p, d, face, plane, h);
  vec3 hx = project(uEye, p + vec3(uPixel, 0.0, 0.0), face, plane);
  vec3 hy = project(uEye, p + vec3(0.0, uPixel, 0.0), face, plane);
  vec2 uv = faceUv(h, face);
  vec2 ux = faceUv(hx, face) - uv;
  vec2 uy = faceUv(hy, face) - uv;
  vec2 foot = vec2(length(vec2(ux.x, uy.x)), length(vec2(ux.y, uy.y)));
  Light l = illuminate(h, face, uv, foot, 1.0);

  vec4 color = vec4(0.0);
  float energy = 0.0;

  if (uShade > 0.0) {
    vec2 gaps = face == 0
      ? vec2(0.5 - abs(h.y), uDepth - h.z)
      : (face == 1 ? vec2(0.5 * uAspect - abs(h.x), uDepth - h.z) : vec2(0.5 * uAspect - abs(h.x), 0.5 - abs(h.y)));
    vec2 crease = 1.0 - exp(-max(gaps, 0.0) / 0.16);
    float occlusion = crease.x * crease.y;
    float lamp = 1.0 / (1.0 + h.z * h.z * 0.9);
    float tilt = face == 1 ? (plane < 0.0 ? 1.1 : 0.85) : (face == 2 ? 0.8 : 1.0);
    float glowSpill = (l.spill * 0.5 + l.trail * 0.12) * l.reveal * l.fade;
    if (uLight > 0.5) {
      float shadow = (1.0 - lamp * tilt) * 0.09 + (1.0 - occlusion) * 0.2;
      over(color, vec3(0.0), shadow * uShade * l.reveal * l.fade);
    } else {
      over(color, vec3(1.0), lamp * tilt * occlusion * 0.11 * uShade * l.reveal * l.fade);
    }
    over(color, uScanColor, glowSpill * uShade * occlusion * 0.35);
  }

  if (face == 1 && plane < 0.0 && uReflect > 0.0) {
    vec3 mirror = vec3(uEye.x, -1.0 - uEye.y, uEye.z);
    vec3 r = h - mirror;
    int face2;
    float plane2;
    vec3 h2;
    trace(h, r, face2, plane2, h2);
    vec2 uv2 = faceUv(h2, face2);
    vec2 ux2 = faceUv(project(mirror, hx, face2, plane2), face2) - uv2;
    vec2 uy2 = faceUv(project(mirror, hy, face2, plane2), face2) - uv2;
    vec2 foot2 = vec2(length(vec2(ux2.x, uy2.x)), length(vec2(ux2.y, uy2.y)));
    float travel = length(h2 - h);
    Light m = illuminate(h2, face2, uv2, foot2, 1.0 + travel * 4.0);
    m.reveal *= l.reveal;
    float grazing = 1.0 - normalize(r).y;
    float gain = (0.3 + 0.7 * grazing * grazing * grazing * grazing) * uReflect * exp(-travel * 1.1) * (uLight > 0.5 ? 0.6 : 1.0);
    float reflected = 0.0;
    paint(color, reflected, m, gain, 0.0, 0.0);
    energy += reflected * 0.6;
  }

  vec3 near = h - uHover.xyz;
  float hover = exp(-dot(near, near) / 0.08) * uHover.w;
  paint(color, energy, l, 1.0, 1.0, hover);

  if (uPoints > 0.5) {
    vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
    vec2 spacing = cell / 2.5;
    vec2 q = uv / spacing;
    vec2 id = floor(q);
    vec2 seed = id + vec2(float(face) * 13.7 + plane * 5.3, float(face) * 3.1);
    vec2 delta = (q - id - (0.2 + 0.6 * hash2(seed))) * spacing;
    float det = ux.x * uy.y - ux.y * uy.x;
    vec2 s = vec2(delta.x * uy.y - delta.y * uy.x, ux.x * delta.y - ux.y * delta.x) / det;
    float radius = uDot * mix(1.0, 0.55, clamp(h.z / uDepth, 0.0, 1.0));
    float spot = clamp(radius + 0.5 - length(s), 0.0, 1.0);
    float gap = min(spacing.x / foot.x, spacing.y / foot.y);
    float r = hash(seed + 7.7);
    float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + r * 5.0) + r * 40.0);
    float dots = spot * smoothstep(5.0, 10.0, gap) * smoothstep(0.25, 0.6, r) * (0.3 + 0.7 * r * r) * flicker;
    float hot = l.core * 2.5 + l.ping * 1.6;
    float warm = l.trail * l.trail * 1.3 + l.wake * 0.6 + hover * 1.3;
    float spark = dots * (hot + warm) * l.fade * l.reveal;
    over(color, mix(uScanColor, uCoreColor, clamp(hot / max(hot + warm, 1e-4), 0.0, 1.0)), spark);
    energy += spark * 0.9;
  }

  if (uHaze > 0.0 && uScanAlpha > 0.0 && uScanZ > 0.0 && h.z > uScanZ) {
    vec3 c = p + d * (uScanZ / d.z);
    float grain = hash(floor(c.xy * 180.0) + floor(uTime * 24.0) * 7.0);
    float edge = min(0.5 * uAspect - abs(c.x), 0.5 - abs(c.y));
    float rim = exp(-edge / 0.06);
    float veil = uHaze * uScanAlpha * (0.45 + 0.9 * grain) * (0.55 + rim * 1.6);
    over(color, uScanColor, veil * depthFade(uScanZ) * l.reveal);
  }

  energy = clamp(energy, 0.0, 1.0);
  outColor = color;
  outGlow = vec4(uScanColor * energy, energy);
}`,Tt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 o = uTexel;
  outColor = 0.25 * (
    texture(uSource, vUv + vec2(-o.x, -o.y)) +
    texture(uSource, vUv + vec2(o.x, -o.y)) +
    texture(uSource, vUv + vec2(-o.x, o.y)) +
    texture(uSource, vUv + vec2(o.x, o.y))
  );
}`,St=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.1964825501511404;
  sum += (texture(uSource, vUv + uStep * 1.411764705882353) + texture(uSource, vUv - uStep * 1.411764705882353)) * 0.2969069646728344;
  sum += (texture(uSource, vUv + uStep * 3.2941176470588234) + texture(uSource, vUv - uStep * 3.2941176470588234)) * 0.09447039785044732;
  sum += (texture(uSource, vUv + uStep * 5.176470588235294) + texture(uSource, vUv - uStep * 5.176470588235294)) * 0.010381362401148057;
  outColor = sum;
}`,Rt=`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uGlow;
in vec2 vUv;
out vec4 outColor;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
void main() {
  vec4 scene = texture(uScene, vUv);
  vec4 bloom = texture(uBloom, vUv) * uGlow;
  bloom.a = min(bloom.a, 1.0);
  bloom.rgb = min(bloom.rgb, vec3(bloom.a));
  vec4 color = scene + bloom * (1.0 - scene.a);
  float noise = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color.a = clamp(color.a + noise, 0.0, 1.0);
  color.rgb = clamp(color.rgb + noise, vec3(0.0), vec3(color.a));
  outColor = color;
}`,g=(o,s,h)=>Math.min(h,Math.max(s,o)),Ze=(o,s,h)=>{let p=o.createShader(s);return p?(o.shaderSource(p,h),o.compileShader(p),o.getShaderParameter(p,o.COMPILE_STATUS)?p:(o.deleteShader(p),null)):null},fe=(o,s)=>{let h=Ze(o,o.VERTEX_SHADER,bt),p=Ze(o,o.FRAGMENT_SHADER,s),S=o.createProgram();if(!h||!p||!S)return null;if(o.attachShader(S,h),o.attachShader(S,p),o.linkProgram(S),o.deleteShader(h),o.deleteShader(p),!o.getProgramParameter(S,o.LINK_STATUS))return o.deleteProgram(S),null;let oe={},pe=o.getProgramParameter(S,o.ACTIVE_UNIFORMS);for(let $=0;$<pe;$++){let ae=o.getActiveUniform(S,$);if(!ae)continue;let re=ae.name.replace(/\[0\]$/,"");oe[re]=o.getUniformLocation(S,re)}return{program:S,uniforms:oe}},de=o=>{let s=o.createTexture();return o.bindTexture(o.TEXTURE_2D,s),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),{texture:s,width:0,height:0}},he=(o,s,h,p)=>{s.width===h&&s.height===p||(s.width=h,s.height=p,o.bindTexture(o.TEXTURE_2D,s.texture),o.texImage2D(o.TEXTURE_2D,0,o.RGBA8,h,p,0,o.RGBA,o.UNSIGNED_BYTE,null))},me=null,At=()=>window.faceapi?Promise.resolve(window.faceapi):(me||(me=new Promise((o,s)=>{let h=document.createElement("script");h.src=gt,h.async=!0,h.onload=()=>window.faceapi?o(window.faceapi):s(new Error("face-api.js")),h.onerror=()=>{me=null,s(new Error("face-api.js"))},document.head.appendChild(h)})),me),Mt={loading:"Loading face tracking",searching:"Looking for a face",tracking:"Tracking",blocked:"Camera unavailable"},Ft=({linesColor:o,scanColor:s,cells:h=8,lineThickness:p=1,lineStyle:S="solid",depth:oe=3,depthFade:pe=.6,parallax:$=1,points:ae=!0,reflection:re=.35,shading:Ke=.7,scanDirection:$e="forward",scanDuration:Je=2.4,scanDelay:Qe=1.6,scanWidth:et=1,trail:tt=.5,glow:ot=.6,autoScan:at=!0,interactive:rt=!0,clickEffect:nt="ping",enableWebcam:xe=!1,showPreview:Se=!1,modelsPath:Re=yt,enableGyro:it=!1,intro:ct=!0,lightMode:ge=!1,dpr:lt,className:st="",style:ut,...ft})=>{let Ae=(0,T.useRef)(null),Me=(0,T.useRef)(null),Fe=(0,T.useRef)(null),ye=(0,T.useRef)(null),k=(0,T.useRef)(null),[dt,J]=(0,T.useState)("loading"),Ue={linesColor:o??(ge?"#d4d4d8":"#4d4757"),scanColor:s??(ge?"#0284c7":"#7dd3fc"),cells:g(h,2,40),thickness:g(p,.5,4),style:wt[S]??0,depth:g(oe,.5,12),depthFade:g(pe,0,1),parallax:g($,0,3),points:ae,reflection:g(re,0,1),shading:g(Ke,0,1),direction:$e,duration:g(Je,.3,20),delay:g(Qe,0,30),scanWidth:g(et,.2,5),trail:g(tt,0,1),glow:g(ot,0,1.5),autoScan:at,interactive:rt,clickEffect:nt,enableGyro:it,intro:ct,lightMode:ge,dpr:lt},U=(0,T.useRef)(Ue);return U.current=Ue,(0,T.useEffect)(()=>{let w=Ae.current,d=Me.current,e=d?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!w||!d||!e)return;let q=fe(e,Et),P=fe(e,Tt),m=fe(e,St),X=fe(e,Rt);if(!q||!P||!m||!X)return;let z=e.createVertexArray(),O=de(e),D=de(e),x=de(e),R=de(e),_=e.createFramebuffer(),G=e.createFramebuffer(),Q=e.createFramebuffer(),B=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),ne=new Map,ie=t=>{let r=String(t),a=ne.get(r);if(a)return a;let l=[1,1,1];if(B){B.clearRect(0,0,1,1),B.fillStyle="#000000",B.fillStyle=r,B.fillRect(0,0,1,1);let[u,E,F]=B.getImageData(0,0,1,1).data;l=[u/255,E/255,F/255]}return ne.set(r,l),l},y=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,b={width:1,height:1,ratio:1},i={x:0,y:0,vx:0,vy:0,tx:0,ty:0,f:ue,vf:0,tf:ue},I={x:0,y:0,inside:!1},M={x:0,y:0,held:!1},Z={gamma:0,beta:0,ready:!1,asked:!1},v={x:0,y:0,z:0,strength:0,ready:!1},c={z:0,dir:1,alpha:0,start:0,sweeps:0,waiting:!1},L=[],ze=new Float32Array(se*4),we=new Float32Array(se),C=0,N=U.current.intro&&!y?0:1,ee=0,Y=0,ce=!0,K=0,be=()=>{let t=U.current,r=b.width/b.height,a=1/Math.round(t.cells),l=r/Math.max(1,Math.round(r/a)),u=Math.max(a,Math.round(t.depth/a)*a);return{aspect:r,cx:l,cy:a,roomDepth:u}},Ce=(t,r)=>{let{aspect:a,roomDepth:l}=be(),u=(t-.5)*a,E=r-.5,F=u-i.x,f=E-i.y,n=i.f,j=F>0?.5*a:-.5*a,H=f>0?.5:-.5,V=l/n;return Math.abs(F)>1e-6&&(V=Math.min(V,(j-u)/F)),Math.abs(f)>1e-6&&(V=Math.min(V,(H-E)/f)),{x:u+F*V,y:E+f*V,z:n*V}},De=t=>{c.dir=t.direction==="backward"||t.direction==="pingpong"&&c.sweeps%2===1?-1:1,c.start=C,c.waiting=!1,c.sweeps+=1},ht=(t,r)=>{if(N<1){let u=N;c.dir=1,c.z=u*(r+.4)-.2,c.alpha=Math.min(1,u*6)*(1-Math.max(0,u-.85)/.15);return}if(c.sweeps===0&&!c.waiting&&(c.waiting=!0,c.start=C,c.alpha=0),c.waiting){c.alpha=0,t.autoScan&&!y&&C-c.start>=t.delay&&De(t);return}let a=(C-c.start)/t.duration;if(a>=1){c.waiting=!0,c.start=C,c.alpha=0;return}let l=a*(r+.3)-.15;c.z=c.dir>0?l:r-l,c.alpha=Math.min(1,a/.12)*Math.min(1,(1-a)/.12)},mt=t=>{let r=Math.max(1,Math.ceil(t/.008333333333333333)),a=t/r;for(let l=0;l<r;l++)i.vx+=((i.tx-i.x)*42-i.vx*11)*a,i.vy+=((i.ty-i.y)*42-i.vy*11)*a,i.vf+=((i.tf-i.f)*42-i.vf*11)*a,i.x+=i.vx*a,i.y+=i.vy*a,i.f+=i.vf*a},Ee=(t,r,a)=>{M.x=g(t,-1,1),M.y=g(r,-1,1),M.held=a},vt=t=>{let r=b.width/b.height,a=y?0:1,l=M.held?M.x:(Math.sin(C*.21)*.2+Math.sin(C*.083+1.3)*.12)*a,u=M.held?M.y:Math.sin(C*.17+2.1)*.16*a;i.tx=l*t.parallax*.22*r,i.ty=u*t.parallax*.22},_e=()=>{let t=U.current;b.width=Math.max(1,w.clientWidth),b.height=Math.max(1,w.clientHeight),b.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),d.width=Math.max(1,Math.round(b.width*b.ratio)),d.height=Math.max(1,Math.round(b.height*b.ratio)),he(e,O,d.width,d.height),he(e,D,d.width,d.height),e.bindFramebuffer(e.FRAMEBUFFER,_),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,O.texture,0),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT1,e.TEXTURE_2D,D.texture,0);let r=Math.max(1,Math.round(d.width/4)),a=Math.max(1,Math.round(d.height/4));he(e,x,r,a),he(e,R,r,a),e.bindFramebuffer(e.FRAMEBUFFER,G),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,x.texture,0),e.bindFramebuffer(e.FRAMEBUFFER,Q),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,R.texture,0),e.bindFramebuffer(e.FRAMEBUFFER,null),Le(),A()},Le=()=>{let t=U.current,{aspect:r,cx:a,cy:l,roomDepth:u}=be(),E=ie(t.linesColor),F=ie(t.scanColor),f=t.lightMode?F:F.map(H=>H+(1-H)*.65),n=q.uniforms;e.bindVertexArray(z),e.disable(e.BLEND),e.bindFramebuffer(e.FRAMEBUFFER,_),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]),e.viewport(0,0,d.width,d.height),e.useProgram(q.program),e.uniform1f(n.uAspect,r),e.uniform1f(n.uPixel,1/d.height),e.uniform3f(n.uEye,i.x,i.y,-i.f),e.uniform1f(n.uDepth,u),e.uniform3f(n.uCell,a,l,l),e.uniform1f(n.uThick,t.thickness*b.ratio*.5),e.uniform1f(n.uDot,1.8*b.ratio),e.uniform1i(n.uStyle,t.style),e.uniform3fv(n.uLineColor,E),e.uniform3fv(n.uScanColor,F),e.uniform3fv(n.uCoreColor,f),e.uniform1f(n.uFade,t.depthFade),e.uniform1f(n.uScanZ,c.z),e.uniform1f(n.uScanDir,c.dir),e.uniform1f(n.uScanAlpha,c.alpha),e.uniform1f(n.uScanWidth,.006*t.scanWidth),e.uniform1f(n.uTrail,.04+t.trail*1.1),e.uniform1f(n.uReveal,N<1?c.z+.05:1e4),e.uniform1f(n.uPoints,t.points?1:0),e.uniform1f(n.uReflect,t.reflection),e.uniform1f(n.uHaze,t.lightMode?.03:.05),e.uniform1f(n.uShade,t.shading),e.uniform1f(n.uLight,t.lightMode?1:0),e.uniform4fv(n.uPing,ze),e.uniform1fv(n.uPingAlpha,we),e.uniform4f(n.uHover,v.x,v.y,v.z,v.strength),e.uniform1f(n.uTime,C),e.drawArrays(e.TRIANGLES,0,3);let j=t.glow>0;if(j){e.bindFramebuffer(e.FRAMEBUFFER,G),e.viewport(0,0,x.width,x.height),e.useProgram(P.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,D.texture),e.uniform1i(P.uniforms.uSource,0),e.uniform2f(P.uniforms.uTexel,1/D.width,1/D.height),e.drawArrays(e.TRIANGLES,0,3);let H=2.2*b.ratio/2;e.useProgram(m.program),e.uniform1i(m.uniforms.uSource,0),e.bindFramebuffer(e.FRAMEBUFFER,Q),e.bindTexture(e.TEXTURE_2D,x.texture),e.uniform2f(m.uniforms.uStep,H/x.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,G),e.bindTexture(e.TEXTURE_2D,R.texture),e.uniform2f(m.uniforms.uStep,0,H/x.height),e.drawArrays(e.TRIANGLES,0,3)}e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,d.width,d.height),e.useProgram(X.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,O.texture),e.uniform1i(X.uniforms.uScene,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,x.texture),e.uniform1i(X.uniforms.uBloom,1),e.uniform1f(X.uniforms.uGlow,j?t.glow*(t.lightMode?.8:1.6):0),e.drawArrays(e.TRIANGLES,0,3),e.activeTexture(e.TEXTURE0)},ke=t=>{if(ee=0,!ce||document.hidden)return;let r=U.current,a=Y?g((t-Y)/1e3,.001,.05):1/60;Y=t,C+=a,N<1&&(N=Math.min(1,N+a/xt));let{roomDepth:l}=be();ht(r,l),vt(r),mt(a);let u=r.interactive&&I.inside&&!y?1:0;if(u){let f=Ce(I.x,I.y);v.ready||Object.assign(v,f,{ready:!0});let n=1-Math.exp(-a/.08);v.x+=(f.x-v.x)*n,v.y+=(f.y-v.y)*n,v.z+=(f.z-v.z)*n}v.strength+=(u-v.strength)*(1-Math.exp(-a/.25)),!u&&v.strength<.01&&(v.ready=!1);for(let f=L.length-1;f>=0;f--)L[f].age+=a,L[f].age>We&&L.splice(f,1);for(let f=0;f<se;f++){let n=L[f];if(!n){we[f]=0;continue}let j=n.age/We;ze.set([n.x,n.y,n.z,n.age*1.15],f*4),we[f]=Math.min(1,n.age/.05)*(1-j)*(1-j)}Le();let E=Math.abs(i.tx-i.x)+Math.abs(i.ty-i.y)+Math.abs(i.tf-i.f)>1e-4||Math.abs(i.vx)+Math.abs(i.vy)+Math.abs(i.vf)>1e-4;N<1||!y&&r.autoScan||!c.waiting||L.length>0||E||v.strength>.002||!y&&r.parallax>0&&!M.held||r.points&&!y&&c.alpha>0?ee=requestAnimationFrame(ke):Y=0};function A(){!ee&&ce&&!document.hidden&&(ee=requestAnimationFrame(ke))}let Pe=t=>{let r=w.getBoundingClientRect(),a=(t.clientX-r.left)/Math.max(1,r.width),l=1-(t.clientY-r.top)/Math.max(1,r.height);return{u:a,v:l,inside:a>=0&&a<=1&&l>=0&&l<=1}},Oe=t=>{let r=U.current,{u:a,v:l,inside:u}=Pe(t);I.x=a,I.y=l;let E=I.inside;I.inside=u,u?(window.clearTimeout(K),K=0,!k.current?.active&&r.interactive&&!y&&Ee(a*2-1,l*2-1,!0),A()):E&&!K&&(K=window.setTimeout(()=>{K=0,k.current?.active||(M.held=!1),A()},220),A())},Be=t=>{let r=U.current,{u:a,v:l,inside:u}=Pe(t);if(!(!u||y||r.clickEffect==="none")){if(r.clickEffect==="scan")N>=1&&De(r);else{let E=Ce(a,l);L.unshift({...E,age:0}),L.length>se&&L.pop()}A()}},Ie=()=>{I.inside=!1,k.current?.active||(M.held=!1),A()},Ne=t=>{!U.current.enableGyro||k.current?.active||y||t.gamma===null||t.beta===null||(Z.ready||Object.assign(Z,{gamma:t.gamma,beta:t.beta,ready:!0}),Ee((t.gamma-Z.gamma)/25,(t.beta-Z.beta)/-25,!0),A())},qe=()=>{let t=U.current,r=window.DeviceOrientationEvent?.requestPermission;!t.enableGyro||Z.asked||typeof r!="function"||(Z.asked=!0,r.call(window.DeviceOrientationEvent).catch(()=>{}))},Xe=()=>{Y=0,A()},Ge=new ResizeObserver(_e);Ge.observe(w);let je=new IntersectionObserver(t=>{ce=t.some(r=>r.isIntersecting),ce&&(Y=0,A())});return je.observe(w),window.addEventListener("pointermove",Oe,{passive:!0}),window.addEventListener("pointerdown",Be,{passive:!0}),window.addEventListener("deviceorientation",Ne),window.addEventListener("click",qe),document.documentElement.addEventListener("pointerleave",Ie),document.addEventListener("visibilitychange",Xe),k.current={active:!1,move:(t,r,a)=>{y||(Ee(t*1.3,r*1.3,!0),i.tf=ue*g(a,.6,1.6),A())},release:()=>{i.tf=ue,M.held=!1,A()}},_e(),ye.current=A,()=>{cancelAnimationFrame(ee),window.clearTimeout(K),ye.current=null,k.current=null,Ge.disconnect(),je.disconnect(),window.removeEventListener("pointermove",Oe),window.removeEventListener("pointerdown",Be),window.removeEventListener("deviceorientation",Ne),window.removeEventListener("click",qe),document.documentElement.removeEventListener("pointerleave",Ie),document.removeEventListener("visibilitychange",Xe),[O,D,x,R].forEach(t=>e.deleteTexture(t.texture)),[_,G,Q].forEach(t=>e.deleteFramebuffer(t)),e.deleteVertexArray(z),[q,P,m,X].forEach(t=>e.deleteProgram(t.program)),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,T.useEffect)(()=>{ye.current?.()}),(0,T.useEffect)(()=>{if(!xe)return;let w=Fe.current;if(!w)return;let d=!1,e=null,q=0,P=0,m={x:0,y:0,near:1,ready:!1};return J("loading"),(async()=>{try{let z=await At();if(await z.nets.tinyFaceDetector.loadFromUri(Re),d)return;if(e=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:!1}),d){e.getTracks().forEach(x=>x.stop());return}w.srcObject=e,await w.play(),J("searching");let O=new z.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:.45}),D=async()=>{if(d)return;let x=null;try{x=await z.detectSingleFace(w,O)}catch{x=null}if(d)return;let R=k.current;if(x&&R){let _=x.box,G=w.videoWidth||1,Q=w.videoHeight||1,B=-((_.x+_.width/2)/G-.5)*2,ne=-((_.y+_.height/2)/Q-.5)*2,ie=.32/Math.max(.08,_.width/G),y=m.ready?.45:1;m.x+=(B-m.x)*y,m.y+=(ne-m.y)*y,m.near+=(ie-m.near)*y,m.ready=!0,P=0,R.active=!0,R.move(m.x,m.y,m.near),J("tracking")}else R&&++P>12&&R.active&&(R.active=!1,m.ready=!1,R.release(),J("searching"));q=window.setTimeout(D,40)};D()}catch{d||J("blocked")}})(),()=>{d=!0,window.clearTimeout(q),e?.getTracks().forEach(O=>O.stop()),w.srcObject=null;let z=k.current;z?.active&&(z.active=!1,z.release())}},[xe,Re]),(0,W.jsxs)("div",{ref:Ae,className:["relative h-full w-full overflow-hidden",st].filter(Boolean).join(" "),style:ut,...ft,children:[(0,W.jsx)("canvas",{ref:Me,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"}),xe&&(0,W.jsxs)("div",{className:Se?"pointer-events-none absolute bottom-3 right-3 aspect-[4/3] w-[168px] overflow-hidden rounded-[14px] bg-[#0b0b0e] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)]":"pointer-events-none absolute h-px w-px overflow-hidden opacity-0",children:[(0,W.jsx)("video",{ref:Fe,className:"block h-full w-full -scale-x-100 object-cover",muted:!0,playsInline:!0}),Se&&(0,W.jsx)("span",{className:"absolute bottom-2 left-2 rounded-lg bg-[rgba(10,10,12,0.6)] px-2 py-[3px] font-sans text-[11px] font-medium leading-[1.4] text-white backdrop-blur-sm",children:Mt[dt]})]})]})},Ye=Ft;var Te=te(le(),1),Ut=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],ve=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Pt=Ut.map((o,s)=>({id:s+1,image:o,src:o,img:o,url:o,title:ve[s],text:ve[s],label:ve[s],alt:ve[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function zt({big:o}){return(0,Te.jsx)(Ve,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Te.jsx)(Ye,{})})}var Ot=He(zt);export{Ot as default};
