import{a as we}from"./chunks/chunk-BVSU2NXD.js";import{A as it,o as ot}from"./chunks/chunk-Q2OCLWEB.js";import{c as ce,i as pt,j as ue,l as rt,m as at}from"./chunks/chunk-6IYH4WPJ.js";var p=ce(pt(),1);var f=ce(ue(),1),ht={dark:{"--rc-base":"#1d1c22","--rc-shadow":"0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)","--rc-ink":"#f4f4f5","--rc-muted":"rgba(244, 244, 245, 0.6)","--rc-tile":"linear-gradient(180deg, #3a3644 0%, #27242f 100%)","--rc-tile-edge":"rgba(255, 255, 255, 0.07)","--rc-tile-highlight":"rgba(255, 255, 255, 0.12)","--rc-tile-shadow":"0 4px 10px -4px rgba(0, 0, 0, 0.7)","--rc-rim":"rgba(255, 255, 255, 0.07)","--rc-rim-highlight":"rgba(255, 255, 255, 0.1)"},light:{"--rc-base":"#e7e7ea","--rc-shadow":"0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)","--rc-ink":"#18181b","--rc-muted":"rgba(24, 24, 27, 0.6)","--rc-tile":"linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)","--rc-tile-edge":"rgba(24, 24, 27, 0.08)","--rc-tile-highlight":"rgba(255, 255, 255, 1)","--rc-tile-shadow":"0 4px 10px -5px rgba(24, 24, 27, 0.25)","--rc-rim":"rgba(24, 24, 27, 0.08)","--rc-rim-highlight":"rgba(255, 255, 255, 0.8)"}},gt={borderRadius:"var(--rc-radius)",background:"var(--rc-base)",boxShadow:"var(--rc-shadow)",transform:"translate3d(0, var(--rc-lift, 0px), 0) rotateX(var(--rc-rotate-x, 0deg)) rotateY(var(--rc-rotate-y, 0deg))",opacity:"var(--rc-presence, 1)",isolation:"isolate",willChange:"transform"},xt={borderRadius:"var(--rc-tile-radius)",background:"var(--rc-tile)",boxShadow:"var(--rc-tile-shadow)",color:"var(--rc-muted)"},bt={boxShadow:"inset 0 0 0 1px var(--rc-tile-edge), inset 0 1px 0 var(--rc-tile-highlight)"},Et={boxShadow:"inset 0 0 0 1px var(--rc-rim), inset 0 1px 0 var(--rc-rim-highlight)"},wt=900,Te=1.2,yt=1400,Tt=.35,St=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Rt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVideo;
uniform sampler2D uCam;
uniform vec4 uVideoMap;
uniform vec4 uCamMap;
uniform vec2 uWeights;
uniform vec2 uLod;
float level(sampler2D source) {
  vec3 mean = pow(textureLod(source, vec2(0.5), 14.0).rgb, vec3(2.2));
  return pow(dot(mean, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
}
void main() {
  vec3 color = vec3(0.0);
  float mean = 0.0;
  if (uWeights.x > 0.0) {
    color += textureLod(uVideo, vUv * uVideoMap.xy + uVideoMap.zw, uLod.x).rgb * uWeights.x;
    mean += level(uVideo) * uWeights.x;
  }
  if (uWeights.y > 0.0) {
    color += textureLod(uCam, vUv * uCamMap.xy + uCamMap.zw, uLod.y).rgb * uWeights.y;
    mean += level(uCam) * uWeights.y;
  }
  fragColor = vec4(color, mean);
}`,Mt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uStep;
uniform float uSigma;
void main() {
  vec4 sum = texture(uTexture, vUv);
  if (uSigma < 0.35) {
    fragColor = sum;
    return;
  }
  float falloff = -0.5 / (uSigma * uSigma);
  int radius = int(min(ceil(uSigma * 2.8), 40.0));
  float total = 1.0;
  for (int i = 1; i <= 40; i++) {
    if (i > radius) break;
    float offset = float(i);
    float weight = exp(offset * offset * falloff);
    sum += (texture(uTexture, vUv + uStep * offset) + texture(uTexture, vUv - uStep * offset)) * weight;
    total += 2.0 * weight;
  }
  fragColor = sum / total;
}`,At=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uEnv;
uniform vec2 uEnvSize;
uniform vec2 uSize;
uniform float uRadius;
uniform float uScale;
uniform mat3 uRotate;
uniform float uCapture;
uniform float uBlur;
uniform float uRough;
uniform float uMetal;
uniform vec3 uTint;
uniform float uGray;
uniform float uWarp;
uniform float uWarpScale;
uniform float uShine;
uniform float uBevel;
uniform float uGlare;
uniform vec2 uPointer;
uniform float uTheme;

const float VIEW = ${wt.toFixed(1)};
const float OVERSCAN = ${Te.toFixed(2)};
const float CONTENT = 46.0;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash2(i);
  vec2 gb = hash2(i + vec2(1.0, 0.0));
  vec2 gc = hash2(i + vec2(0.0, 1.0));
  vec2 gd = hash2(i + vec2(1.0, 1.0));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  vec2 slope = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va);
  return vec3(value, slope);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

float band(float x, float halfWidth, float sigma) {
  float s = 1.4142136 * max(sigma, 0.0001);
  return 0.5 * (erf((x + halfWidth) / s) - erf((x - halfWidth) / s));
}

float strip(vec2 q, vec2 center, vec2 dir, float halfWidth, vec2 sigma) {
  vec2 normal = vec2(-dir.y, dir.x);
  return band(dot(q - center, normal), halfWidth, length(sigma * normal));
}

const vec2 SWEEP = vec2(0.5, 0.86);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float softbox(vec2 q, vec2 sigma) {
  float key = strip(q, vec2(-0.1, -0.16), normalize(SWEEP), 0.022, sigma + 0.018);
  float top = band(q.y + 0.6, 0.12, sigma.y + 0.05);
  float side = band(q.x - 0.46, 0.05, sigma.x + 0.05);
  return key + top * 0.8 + side * 0.35;
}

float room(vec2 q, vec2 sigma) {
  float fall = smoothstep(-0.55, 0.5, q.y);
  float flag = strip(q, vec2(0.24, -0.02), normalize(SWEEP), 0.09, sigma + 0.08);
  return mix(0.85, 0.12, fall) * (1.0 - 0.6 * flag);
}

vec4 sampleEnv(vec2 uv) {
  vec2 st = uv * uEnvSize - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 c0 = (i + 0.5 + w1 / g0 - 1.0) / uEnvSize;
  vec2 c1 = (i + 0.5 + w3 / g1 + 1.0) / uEnvSize;
  vec4 a = texture(uEnv, c0) * g0.x + texture(uEnv, vec2(c1.x, c0.y)) * g1.x;
  vec4 b = texture(uEnv, vec2(c0.x, c1.y)) * g0.x + texture(uEnv, c1) * g1.x;
  return a * g0.y + b * g1.y;
}

vec3 toLinear(vec3 c) {
  return pow(max(c, 0.0), vec3(2.2));
}

void main() {
  vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
  vec2 halfSize = uSize * 0.5;
  float r = min(uRadius, min(halfSize.x, halfSize.y));
  vec2 corner = abs(p) - halfSize + r;
  vec2 side = vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  float d;
  vec2 outward;
  if (corner.x > 0.0 && corner.y > 0.0) {
    d = length(corner) - r;
    outward = normalize(corner) * side;
  } else if (corner.x > corner.y) {
    d = corner.x - r;
    outward = vec2(side.x, 0.0);
  } else {
    d = corner.y - r;
    outward = vec2(0.0, side.y);
  }
  float coverage = clamp(0.5 - d * uScale, 0.0, 1.0);

  float chamferWidth = min(uBevel, max(r, 1.0));
  float chamfer = chamferWidth > 0.01 ? 1.0 - smoothstep(0.0, chamferWidth, -d) : 0.0;
  vec2 slope = outward * chamfer;

  vec2 wp = p / (220.0 * uWarpScale);
  vec3 w1 = gradientNoise(wp);
  vec3 w2 = gradientNoise(wp * 2.07 + 13.7);
  vec2 ripple = (w1.yz + w2.yz * 0.5) * uWarp;
  slope += ripple * 0.008;

  float grain = valueNoise(vec2(p.x * 0.008, p.y * 0.55)) * 0.45 + valueNoise(vec2(p.x * 0.019 + 3.7, p.y * 0.23)) * 0.35 + valueNoise(vec2(p.x * 0.004 + 9.2, p.y * 0.09)) * 0.2;
  float brush = uRough * uRough;
  slope.y += (grain - 0.5) * brush * 0.004;

  vec3 normal = uRotate * normalize(vec3(slope, 1.0));
  vec3 position = uRotate * vec3(p, 0.0);
  vec3 view = normalize(position - vec3(0.0, 0.0, VIEW));
  vec3 bounce = reflect(view, normal);
  vec2 q = bounce.xy / max(bounce.z, 0.2);

  vec2 footprint = fwidth(q);
  vec2 sigma = sqrt(vec2(uBlur / VIEW) * vec2(uBlur / VIEW) + footprint * footprint * 0.5);
  sigma += vec2(0.004, 0.05) * uRough;

  vec2 shift = clamp((q - p / VIEW) * CONTENT + ripple * 10.0, -uSize, uSize);
  vec2 cp = (p + shift) / (uSize * OVERSCAN);
  vec4 reflected = uCapture > 0.0 ? sampleEnv(vec2(0.5 + cp.x, 0.5 - cp.y)) : vec4(0.0, 0.0, 0.0, 1.0);
  vec3 captured = toLinear(reflected.rgb) * (0.5 / max(pow(reflected.a, 2.2), 0.02));
  captured = mix(vec3(dot(captured, LUMA)), captured, 1.0 - uGray);
  captured = pow(max(captured * 1.2, 0.0), vec3(mix(2.0, 1.5, uTheme)));

  vec3 scene = mix(vec3(room(q, sigma)), captured, uCapture * (1.0 - chamfer) * mix(1.0, 0.6, uTheme));
  scene *= 1.0 + (grain - 0.5) * brush * 0.3;

  vec2 toPointer = (uPointer - p) / (120.0 + uBlur * 4.0);
  vec2 spread = toPointer * vec2(1.0, 1.0 / (1.0 + 2.5 * uRough));
  float reach = dot(spread, spread);
  float glint = max(1.0 + 3.0 * dot(slope, toPointer), 0.0);
  float glare = (exp(-reach * 1.6) + exp(-reach * 0.35) * 0.15) * glint * uGlare * (1.0 + 0.8 * (grain - 0.5) * brush);
  float highlight = (softbox(q, sigma) * uShine + glare) * mix(0.4, 1.0, uMetal);

  vec3 dark = vec3(0.005, 0.005, 0.006) + uTint * (scene * 0.05 * uMetal + highlight * 0.36);
  vec3 light = uTint * (vec3(0.83, 0.83, 0.85) * (1.0 - 0.45 * uMetal * (1.0 - clamp(scene, 0.0, 1.0))) + highlight * 0.35);
  vec3 color = mix(dark, light, uTheme);
  color = min(color, 0.7) + 0.3 * (1.0 - exp(-max(color - 0.7, 0.0) / 0.3));
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

  color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(color * coverage, coverage);
}`,g=(t,e,s)=>Math.min(s,Math.max(e,t)),nt=t=>typeof t=="number"?`${t}px`:t,Lt=t=>{let e=String(t||"").trim(),s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(e);if(s){let l=s[1].length===3?s[1].replace(/./g,m=>m+m):s[1];return[0,2,4].map(m=>parseInt(l.slice(m,m+2),16)/255)}let n=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(e);return n?[n[1],n[2],n[3]].map(l=>g(parseFloat(l)/255,0,1)):[1,1,1]},ct=(t,e,s)=>{let n=t.createShader(e);return n?(t.shaderSource(n,s),t.compileShader(n),t.getShaderParameter(n,t.COMPILE_STATUS)?n:(console.error(t.getShaderInfoLog(n)),t.deleteShader(n),null)):null},ye=(t,e)=>{let s=ct(t,t.VERTEX_SHADER,St),n=ct(t,t.FRAGMENT_SHADER,e),l=s&&n?t.createProgram():null;if(!s||!n||!l)return s&&t.deleteShader(s),n&&t.deleteShader(n),null;if(t.attachShader(l,s),t.attachShader(l,n),t.bindAttribLocation(l,0,"aPosition"),t.linkProgram(l),t.deleteShader(s),t.deleteShader(n),!t.getProgramParameter(l,t.LINK_STATUS))return console.error(t.getProgramInfoLog(l)),t.deleteProgram(l),null;let m={},T=t.getProgramParameter(l,t.ACTIVE_UNIFORMS);for(let S=0;S<T;S++){let z=t.getActiveUniform(l,S);z&&(m[z.name]=t.getUniformLocation(l,z.name))}return{program:l,uniforms:m}},st=(t,e,s,n)=>{let l=t/Math.max(1,e),m=l>s?s/l:1,T=l>s?1:l/s,S=n?-m:m;return[S,-T,.5-S*.5,.5+T*.5]},lt=(t,e,s,n)=>{let l=t/Math.max(1,e),m=t*(l>n?n/l:1);return Math.max(0,Math.log2(Math.max(1,m/Math.max(1,s)))-.5)},Pt=t=>{let e=t.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"default"});if(!e)return null;let s=ye(e,Rt),n=ye(e,Mt),l=ye(e,At);if(!s||!n||!l){for(let i of[s,n,l])i&&e.deleteProgram(i.program);return null}let m=(i,d)=>{let E=e.createTexture();return e.bindTexture(e.TEXTURE_2D,E),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,i?e.LINEAR_MIPMAP_LINEAR:e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),E},T=()=>{let i=m(!1,e.MIRRORED_REPEAT),d=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,d),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.bindFramebuffer(e.FRAMEBUFFER,null),{texture:i,framebuffer:d,width:1,height:1}},S=(i,d,E)=>{i.width===d&&i.height===E||(i.width=d,i.height=E,e.bindTexture(e.TEXTURE_2D,i.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,d,E,0,e.RGBA,e.UNSIGNED_BYTE,null))},z=e.createVertexArray();e.bindVertexArray(z);let K=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,K),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.disable(e.BLEND),e.disable(e.DEPTH_TEST);let k={video:m(!0,e.CLAMP_TO_EDGE),cam:m(!0,e.CLAMP_TO_EDGE)},V=T(),J=T(),B=T(),se=new Float32Array(9),Q=(i,d)=>(e.bindFramebuffer(e.FRAMEBUFFER,i?i.framebuffer:null),e.viewport(0,0,i?i.width:t.width,i?i.height:t.height),e.useProgram(d.program),d.uniforms),X=(i,d)=>{e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,d)};return{upload:(i,d)=>{try{return e.bindTexture(e.TEXTURE_2D,k[i]),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,d),e.generateMipmap(e.TEXTURE_2D),!0}catch{return!1}},renderEnv:({width:i,height:d,scale:E,blur:G,roughness:Z,video:R,cam:b})=>{let O=g(2.5/Math.max(G,.01),.12,E),v=Math.max(8,Math.ceil(i*Te*O)),M=Math.max(8,Math.ceil(d*Te*O));S(V,v,M),S(J,v,M),S(B,v,M);let L=i/Math.max(1,d),U=1-(1-R.mix)*(1-b.mix),C=U>0?b.mix/U:0,o=Q(V,s);X(0,k.video),X(1,k.cam),e.uniform1i(o.uVideo,0),e.uniform1i(o.uCam,1),e.uniform4fv(o.uVideoMap,R.ready?st(R.width,R.height,L,!1):[1,1,0,0]),e.uniform4fv(o.uCamMap,b.ready?st(b.width,b.height,L,!0):[1,1,0,0]),e.uniform2f(o.uWeights,R.ready&&U>0?1-C:0,b.ready?C:0),e.uniform2f(o.uLod,R.ready?lt(R.width,R.height,v,L):0,b.ready?lt(b.width,b.height,v,L):0),e.drawArrays(e.TRIANGLES,0,3),o=Q(J,n),X(0,V.texture),e.uniform1i(o.uTexture,0),e.uniform2f(o.uStep,1/v,0),e.uniform1f(o.uSigma,G*O),e.drawArrays(e.TRIANGLES,0,3),o=Q(B,n),X(0,J.texture),e.uniform1i(o.uTexture,0),e.uniform2f(o.uStep,0,1/M),e.uniform1f(o.uSigma,(G*(1+1.5*Z)+10*Z)*O),e.drawArrays(e.TRIANGLES,0,3)},renderPlate:({width:i,height:d,rotateX:E,rotateY:G,capture:Z,glare:R,pointerX:b,pointerY:O,settings:v})=>{let M=Math.cos(E),L=Math.sin(E),U=Math.cos(G),C=Math.sin(G);se.set([U,L*C,-M*C,0,M,L,C,-L*U,M*U]);let o=Q(null,l);X(0,B.texture),e.uniform1i(o.uEnv,0),e.uniform2f(o.uEnvSize,B.width,B.height),e.uniform2f(o.uSize,i,d),e.uniform1f(o.uRadius,v.radius),e.uniform1f(o.uScale,t.width/Math.max(1,i)),e.uniformMatrix3fv(o.uRotate,!1,se),e.uniform1f(o.uCapture,Z),e.uniform1f(o.uBlur,v.blurStrength),e.uniform1f(o.uRough,v.roughness),e.uniform1f(o.uMetal,v.metalness),e.uniform3fv(o.uTint,v.tint),e.uniform1f(o.uGray,v.grayscale),e.uniform1f(o.uWarp,v.warp),e.uniform1f(o.uWarpScale,v.warpScale),e.uniform1f(o.uShine,v.shine),e.uniform1f(o.uBevel,v.bevel),e.uniform1f(o.uGlare,R),e.uniform2f(o.uPointer,b,O),e.uniform1f(o.uTheme,v.theme),e.drawArrays(e.TRIANGLES,0,3)},dispose:()=>{if(!e.isContextLost()){for(let i of[V,J,B])e.deleteFramebuffer(i.framebuffer),e.deleteTexture(i.texture);e.deleteTexture(k.video),e.deleteTexture(k.cam),e.deleteBuffer(K),e.deleteVertexArray(z);for(let i of[s,n,l])e.deleteProgram(i.program)}}}},Nt=({name:t="Alexander Doe",role:e="Senior Developer",badge:s="Verified",status:n="Active",statusColor:l="#22c55e",idLabel:m="ID number",idValue:T="8901 2345 6789",children:S,theme:z="dark",videoSrc:K,webcam:k=!1,onWebcamError:V,tint:J="#ffffff",metalness:B=1,roughness:se=.3,blurStrength:Q=6,grayscale:X=1,warp:Re=.6,warpScale:Me=1,shine:Ae=1,bevel:Le=3,glare:i=.5,enableTilt:d=!0,tiltStrength:E=12,intro:G=!0,width:Z=320,height:R=500,radius:b=24,className:O="",style:v})=>{let M=(0,p.useRef)(null),L=(0,p.useRef)(null),U=(0,p.useRef)(null),C=(0,p.useRef)(null),o=(0,p.useRef)(null),q=(0,p.useRef)(null),me=(0,p.useRef)(V),[Pe,ut]=(0,p.useState)(0),Ne=z==="light"?"light":"dark",Ie={tint:Lt(J).map(c=>Math.pow(c,2.2)),metalness:g(B,0,1),roughness:g(se,0,1),blurStrength:g(Q,0,40),grayscale:g(X,0,1),warp:g(Re,0,2),warpScale:g(Me,.2,4),shine:g(Ae,0,3),bevel:g(Le,0,16),glare:g(i,0,1),enableTilt:d,tiltStrength:g(E,0,30),radius:Math.max(0,b),theme:Ne==="light"?1:0,intro:G},oe=(0,p.useRef)(Ie);oe.current=Ie,me.current=V,(0,p.useEffect)(()=>{q.current?.()}),(0,p.useLayoutEffect)(()=>{let c=M.current;!c||!oe.current.intro||window.matchMedia("(prefers-reduced-motion: reduce)").matches||(c.style.setProperty("--rc-presence","0"),c.style.setProperty("--rc-lift","14px"))},[]),(0,p.useEffect)(()=>{let c=M.current,D=L.current,w=U.current,F=C.current,y=o.current;if(!c||!D||!w||!F||!y)return;let ee=window.matchMedia("(prefers-reduced-motion: reduce)").matches,te=Pt(w),P={p:0,v:0,target:0},N={p:0,v:0,target:0},A={p:0,target:0},re={x:0,y:0},h={width:D.offsetWidth,height:D.offsetHeight,scale:1},_e=r=>({element:r,src:"",time:-1,ready:!1,failed:!1,width:0,height:0,mix:0}),I={video:_e(F),cam:_e(y)},ie=1,Ue=0,pe=0,le=null,Y=0,he=0,ne=!0,ge=document.visibilityState!=="hidden",xe=!1,Ce="",$=!1,De=()=>{let{enableTilt:r,tiltStrength:a}=oe.current,u=r&&!ee?a:0,x=c.style;x.setProperty("--rc-rotate-x",`${(N.p*u).toFixed(3)}deg`),x.setProperty("--rc-rotate-y",`${(-P.p*u).toFixed(3)}deg`);let j=1-Math.pow(1-ie,3);x.setProperty("--rc-presence",j.toFixed(4)),x.setProperty("--rc-lift",`${((1-j)*14).toFixed(2)}px`)},Fe=(r,a)=>{let u=a.element,x=u.srcObject?"stream":u.currentSrc;if(x!==a.src&&(a.src=x,a.failed=!1,a.time=-1),!x)return a.ready=!1,!1;if(u.error)return a.failed=!0,!1;if(u.readyState<2||!u.videoWidth)return!1;let j=u.currentTime;return a.ready&&j===a.time?!1:!te||!te.upload(r,u)?(a.failed=!0,!1):(a.time=j,a.width=u.videoWidth,a.height=u.videoHeight,a.ready=!0,!0)},mt=(r,a)=>{let u=r.ready&&!r.failed&&r.src?1:0,x=r.mix;return r.mix+=(u-r.mix)*(1-Math.exp(-a/Tt)),Math.abs(u-r.mix)<.002&&(r.mix=u),r.mix!==x},We=()=>{h.width=D.offsetWidth,h.height=D.offsetHeight,h.scale=Math.min(window.devicePixelRatio||1,2);let r=Math.max(1,Math.round(h.width*h.scale)),a=Math.max(1,Math.round(h.height*h.scale));(w.width!==r||w.height!==a)&&(w.width=r,w.height=a),$=!0},ze=r=>{if(Y=0,xe)return;let a=Math.min(.05,(r-he)/1e3||0);he=r;let u=r<pe,x=u?24:120,j=u?9:16,Qe=Math.max(1,Math.ceil(a/(1/120))),Ze=a/Qe;for(let _=0;_<Qe;_++)for(let W of[P,N])W.v+=(x*(W.target-W.p)-j*W.v)*Ze,W.p+=W.v*Ze;let vt=A.target>A.p?.18:u?.9:.45;A.p+=(A.target-A.p)*(1-Math.exp(-a/vt)),ie<1&&(ie=g((r-Ue)/650,0,1));let et=Math.abs(P.target-P.p)>5e-4||Math.abs(N.target-N.p)>5e-4||Math.abs(P.v)>5e-4||Math.abs(N.v)>5e-4||Math.abs(A.target-A.p)>.002||ie<1;et||(P.p=P.target,N.p=N.target,P.v=0,N.v=0,A.p=A.target),De();let Ee=!1;if(te){I.cam.mix<1&&Fe("video",I.video)&&($=!0),Fe("cam",I.cam)&&($=!0);for(let ae of[I.video,I.cam])ae.src&&!ae.failed&&!ae.element.paused&&(Ee=!0),mt(ae,a)&&($=!0),ae.mix>0&&ae.mix<1&&(Ee=!0);let _=oe.current,W=`${_.blurStrength}|${_.roughness}|${h.width}|${h.height}|${h.scale}`;W!==Ce&&(Ce=W,$=!0),$&&(I.video.mix>0||I.cam.mix>0)&&te.renderEnv({width:h.width,height:h.height,scale:h.scale,blur:_.blurStrength,roughness:_.roughness,video:I.video,cam:I.cam}),$=!1;let tt=(_.enableTilt&&!ee?_.tiltStrength:0)*(Math.PI/180);te.renderPlate({width:h.width,height:h.height,rotateX:N.p*tt,rotateY:-P.p*tt,capture:1-(1-I.video.mix)*(1-I.cam.mix),glare:_.glare*A.p,pointerX:re.x,pointerY:re.y,settings:_})}(et||Ee)&&ne&&ge&&(Y=requestAnimationFrame(ze))},H=()=>{Y||xe||!ne||!ge||(he=performance.now(),Y=requestAnimationFrame(ze))};q.current=H;let ke=(r,a,u=!0)=>{P.target=g(r,-1,1),N.target=g(a,-1,1),A.target=u?1:0,pe=0,H()},be=r=>{let a=c.getBoundingClientRect();if(!a.width||!a.height)return;let u=(r.clientX-a.left)/a.width*2-1,x=(r.clientY-a.top)/a.height*2-1;re.x=u*h.width*.5,re.y=x*h.height*.5,ke(u,x)},Be=()=>ke(0,0,!1),Ge=r=>{r.pointerType==="mouse"&&be(r)},Oe=r=>{(r.pointerType==="mouse"||r.pointerId===le)&&be(r)},Ve=r=>{r.pointerType==="mouse"&&Be()},Xe=r=>{r.pointerType!=="mouse"&&(le=r.pointerId,be(r))},fe=r=>{r.pointerId===le&&(le=null,Be())};c.addEventListener("pointerenter",Ge),c.addEventListener("pointermove",Oe),c.addEventListener("pointerleave",Ve),c.addEventListener("pointerdown",Xe),c.addEventListener("pointerup",fe),c.addEventListener("pointercancel",fe);let qe=r=>{r.preventDefault(),xe=!0,cancelAnimationFrame(Y),Y=0},Ye=()=>ut(r=>r+1);w.addEventListener("webglcontextlost",qe),w.addEventListener("webglcontextrestored",Ye);let $e=new ResizeObserver(()=>{We(),H()});$e.observe(D),We();let He=new IntersectionObserver(r=>{if(ne=r.some(a=>a.isIntersecting),!ee)for(let a of[F,y])ne&&(a.currentSrc||a.srcObject)?a.play().catch(()=>{}):!ne&&a.currentSrc&&!a.srcObject&&a.pause();H()});He.observe(c);let je=()=>{ge=document.visibilityState!=="hidden",H()};document.addEventListener("visibilitychange",je);let Ke=()=>H(),Je=["loadeddata","playing","seeked","emptied","error"];for(let r of[F,y])for(let a of Je)r.addEventListener(a,Ke);return oe.current.intro&&!ee&&Pe===0&&(P.p=.62,N.p=-.55,A.p=1,re.x=.62*h.width*.5,re.y=-.55*h.height*.5,ie=0,Ue=performance.now(),pe=performance.now()+yt),De(),H(),()=>{cancelAnimationFrame(Y),q.current=null,$e.disconnect(),He.disconnect(),document.removeEventListener("visibilitychange",je),c.removeEventListener("pointerenter",Ge),c.removeEventListener("pointermove",Oe),c.removeEventListener("pointerleave",Ve),c.removeEventListener("pointerdown",Xe),c.removeEventListener("pointerup",fe),c.removeEventListener("pointercancel",fe),w.removeEventListener("webglcontextlost",qe),w.removeEventListener("webglcontextrestored",Ye);for(let r of[F,y])for(let a of Je)r.removeEventListener(a,Ke);te?.dispose()}},[Pe]),(0,p.useEffect)(()=>{let c=C.current;if(c){if(!K){c.removeAttribute("src"),c.load(),q.current?.();return}return c.src=K,window.matchMedia("(prefers-reduced-motion: reduce)").matches||c.play().catch(()=>{}),q.current?.(),()=>c.pause()}},[K]),(0,p.useEffect)(()=>{let c=o.current;if(!k||!c)return;let D=navigator.mediaDevices;if(!D||!D.getUserMedia){me.current?.(new Error("Camera access is not available in this browser."));return}let w=null,F=!1;return D.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:!1}).then(y=>{if(F){y.getTracks().forEach(ee=>ee.stop());return}w=y,c.srcObject=y,c.play().catch(()=>{}),q.current?.()}).catch(y=>{F||me.current?.(y)}),()=>{F=!0,w?.getTracks().forEach(y=>y.stop()),c.srcObject=null,q.current?.()}},[k]);let ve=Math.max(0,b),dt={...ht[Ne],"--rc-width":nt(Z),"--rc-height":nt(R),"--rc-radius":`${ve}px`,"--rc-pad":`${Math.round(g(ve*.8,16,22))}px`,"--rc-tile-radius":`${Math.round(g(ve*.5,8,14))}px`,"--rc-status":l,width:"var(--rc-width)",height:"var(--rc-height)",perspective:"900px",color:"var(--rc-ink)"};return(0,f.jsxs)("div",{ref:M,className:`relative box-border max-w-full touch-pan-y select-none ${O}`.trim(),style:{...dt,...v},children:[(0,f.jsxs)("div",{ref:L,className:"relative box-border h-full w-full overflow-hidden",style:gt,children:[(0,f.jsx)("canvas",{ref:U,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"}),(0,f.jsx)("div",{className:"relative z-[1] box-border flex h-full flex-col p-[var(--rc-pad)]",children:S??(0,f.jsxs)(f.Fragment,{children:[(s||n)&&(0,f.jsxs)("div",{className:"flex items-center gap-3 text-[13px] leading-5",children:[s&&(0,f.jsxs)("span",{className:"inline-flex items-center gap-1.5 font-medium [color:var(--rc-ink)]",children:[(0,f.jsx)(we,{icon:ot,size:16,strokeWidth:1.8}),s]}),n&&(0,f.jsxs)("span",{className:"ml-auto inline-flex items-center gap-2 [color:var(--rc-muted)]",children:[(0,f.jsx)("span",{className:"h-1.5 w-1.5 rounded-full [background:var(--rc-status)]"}),n]})]}),(0,f.jsxs)("div",{className:"mt-auto",children:[t&&(0,f.jsx)("h3",{className:"m-0 text-[24px] font-medium leading-[1.15] tracking-[-0.02em] [color:var(--rc-ink)] [text-wrap:balance]",children:t}),e&&(0,f.jsx)("p",{className:"mb-0 mt-1 text-[14px] leading-[1.4] [color:var(--rc-muted)]",children:e})]}),(m||T)&&(0,f.jsxs)("div",{className:"mt-6 flex items-end justify-between gap-4",children:[(0,f.jsxs)("div",{className:"flex min-w-0 flex-col gap-1",children:[m&&(0,f.jsx)("span",{className:"text-[12px] leading-4 [color:var(--rc-muted)]",children:m}),T&&(0,f.jsx)("span",{className:"overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[15px] leading-5 tracking-[0.02em] tabular-nums [color:var(--rc-ink)]",children:T})]}),(0,f.jsxs)("span",{className:"relative box-border flex h-11 w-11 flex-none items-center justify-center",style:xt,children:[(0,f.jsx)("span",{className:"pointer-events-none absolute inset-0 rounded-[inherit]",style:bt}),(0,f.jsx)(we,{icon:it,size:22,strokeWidth:1.6})]})]})]})}),(0,f.jsx)("span",{className:"pointer-events-none absolute inset-0 z-[2] rounded-[inherit]",style:Et})]}),(0,f.jsx)("video",{ref:C,className:"pointer-events-none absolute left-0 top-0 h-px w-px opacity-0",muted:!0,loop:!0,playsInline:!0,crossOrigin:"anonymous","aria-hidden":"true"}),(0,f.jsx)("video",{ref:o,className:"pointer-events-none absolute left-0 top-0 h-px w-px opacity-0",muted:!0,playsInline:!0,"aria-hidden":"true"})]})},ft=(0,p.memo)(Nt);var Se=ce(ue(),1),It=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],de=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Bt=It.map((t,e)=>({id:e+1,image:t,src:t,img:t,url:t,title:de[e],text:de[e],label:de[e],alt:de[e],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][e],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function _t({big:t}){return(0,Se.jsx)(at,{big:t,dark:!0,center:!0,zoom:1,drive:!1,children:(0,Se.jsx)(ft,{})})}var Gt=rt(_t);export{Gt as default};
