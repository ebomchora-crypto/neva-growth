import{c as X,i as nt,j as J,l as Le,m as Ie}from"./chunks/chunk-6IYH4WPJ.js";var w=X(nt(),1),fe=X(J(),1),ct=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,ut=`
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
`,ft=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uState;
uniform vec2 uSize;
uniform float uDt;
uniform float uTime;
uniform float uDecay;
uniform float uDrag;
uniform vec2 uDrift;
uniform float uTurbulence;
uniform float uSwirl;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uTrail;
uniform float uIdle;
uniform vec2 uVelocity;
uniform vec4 uPuff;
${ut}
float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}
vec2 curl(vec2 p) {
  vec3 a = gradientNoise(p * uSwirl + vec2(uTime * 0.11, -uTime * 0.07));
  vec3 b = gradientNoise(p * uSwirl * 2.03 + vec2(-uTime * 0.13, uTime * 0.09) + 17.3);
  vec2 g = a.yz + b.yz * 0.5;
  return vec2(g.y, -g.x);
}
vec4 fetch(vec2 p) {
  if (p.x < 0.0 || p.y < 0.0 || p.x > uSize.x || p.y > uSize.y) return vec4(0.0);
  return texture(uState, p / uSize);
}
void main() {
  vec2 p = gl_FragCoord.xy;
  vec4 here = texture(uState, vUv);
  vec2 flow = here.gb + curl(p) * uTurbulence + uDrift;
  vec4 state = fetch(p - flow * uDt);
  float density = state.r * uDecay;
  vec2 velocity = state.gb * uDrag;

  float sigma = max(uRadius, 0.5);
  vec2 ab = uTo - uFrom;
  float len = length(ab);
  float trail = 0.0;
  if (len > 0.25) {
    vec2 dir = ab / len;
    vec2 ap = p - uFrom;
    float along = dot(ap, dir);
    float across = dot(ap, vec2(-dir.y, dir.x));
    float k = 1.4142136 * sigma;
    trail = exp(-across * across / (2.0 * sigma * sigma)) * 0.5 * (erf(along / k) - erf((along - len) / k));
  }
  vec2 dh = p - uTo;
  float head = exp(-dot(dh, dh) / (2.0 * sigma * sigma));
  density += uTrail * trail + uIdle * uDt * head;
  velocity += (uVelocity - velocity) * clamp(trail * 0.65, 0.0, 1.0);

  if (uPuff.w > 0.0) {
    vec2 d = p - uPuff.xy;
    float r2 = dot(d, d);
    float g = exp(-r2 / (2.0 * uPuff.z * uPuff.z));
    density += uPuff.w * g;
    velocity += (r2 > 0.0001 ? d / sqrt(r2) : vec2(0.0)) * g * uPuff.w * uPuff.z * 2.2;
  }

  fragColor = vec4(clamp(density, 0.0, 6.0), velocity, 1.0);
}`,st=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uState;
uniform vec2 uSimSize;
uniform vec2 uView;
uniform vec2 uHead;
uniform float uHeadSize;
uniform float uHeadAmount;
uniform float uTime;
uniform vec3 uColor;
uniform float uDetail;
uniform float uNoiseScale;
uniform vec2 uFlow;
uniform float uBrightness;
uniform float uTheme;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8776, 0.4794, -0.4794, 0.8776);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p * 2.0;
    a *= 0.5;
  }
  return v;
}
float fbm5(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8776, 0.4794, -0.4794, 0.8776);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p * 2.0;
    a *= 0.52;
  }
  return v;
}
vec4 cubic(sampler2D tex, vec2 uv, vec2 size) {
  vec2 st = uv * size - 0.5;
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
  vec2 c0 = (i + 0.5 + w1 / g0 - 1.0) / size;
  vec2 c1 = (i + 0.5 + w3 / g1 + 1.0) / size;
  vec4 a = texture(tex, c0) * g0.x + texture(tex, vec2(c1.x, c0.y)) * g1.x;
  vec4 b = texture(tex, vec2(c0.x, c1.y)) * g0.x + texture(tex, c1) * g1.x;
  return a * g0.y + b * g1.y;
}
float field(vec2 uv, vec2 p) {
  vec2 d = p - uHead;
  return cubic(uState, uv, uSimSize).r + uHeadAmount * exp(-dot(d, d) / (2.0 * uHeadSize * uHeadSize));
}
void main() {
  vec2 p = vUv * uView;
  float density = field(vUv, p);
  if (density < 0.002) {
    fragColor = vec4(0.0);
    return;
  }
  vec2 step = vec2(1.5) / uSimSize;
  float dx = field(vUv + vec2(step.x, 0.0), p + vec2(step.x * uView.x, 0.0)) - field(vUv - vec2(step.x, 0.0), p - vec2(step.x * uView.x, 0.0));
  float dy = field(vUv + vec2(0.0, step.y), p + vec2(0.0, step.y * uView.y)) - field(vUv - vec2(0.0, step.y), p - vec2(0.0, step.y * uView.y));

  vec2 n = (p + uFlow) * uNoiseScale;
  float t = uTime;
  vec2 q = vec2(fbm(n + t * 0.1), fbm(n + vec2(5.2, 1.3) + t * 0.1));
  vec2 r = vec2(fbm(n + q * 1.8 + vec2(1.7, 9.2) + t * 0.15), fbm(n + q * 1.8 + vec2(8.3, 2.8) + t * 0.15));
  float smoke = fbm5(n + r * 1.1);
  float wisp = pow(smoothstep(0.18, 0.82, smoke), 2.0) * 2.8;
  float body = density * mix(1.0, wisp, uDetail);
  float cloud = body * smoothstep(0.0, 0.32, body) * 1.15;
  if (cloud <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  vec3 normal = normalize(vec3(-dx * 2.2, -dy * 2.2, 1.0) + vec3((q - 0.5) * 0.35 * uDetail, 0.0));
  float light = 0.7 + 0.5 * max(dot(normal, normalize(vec3(-0.35, 0.55, 0.75))), 0.0);
  float core = smoothstep(0.7, 2.2, cloud);

  vec3 tint = mix(uColor * light, mix(uColor, vec3(1.0), 0.55) * light, core);
  vec3 ink = mix(uColor, uColor * 0.78, core * 0.6) * (1.12 - 0.12 * light);
  vec3 color = mix(tint * uBrightness, ink, uTheme) * cloud;
  fragColor = vec4(color, cloud);
}`,lt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-0.5, -0.5));
  vec4 b = texture(uSource, vUv + uTexel * vec2(0.5, -0.5));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-0.5, 0.5));
  vec4 d = texture(uSource, vUv + uTexel * vec2(0.5, 0.5));
  vec4 color = (a + b + c + d) * 0.25;
  float peak = max(color.r, max(color.g, color.b));
  float keep = peak > 0.0 ? max(peak - uThreshold, 0.0) / peak : 0.0;
  fragColor = color * keep;
}`,mt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uDirection;
void main() {
  vec4 color = texture(uSource, vUv) * 0.181862;
  color += (texture(uSource, vUv + uDirection * 1.423135) + texture(uSource, vUv - uDirection * 1.423135)) * 0.284316;
  color += (texture(uSource, vUv + uDirection * 3.326702) + texture(uSource, vUv - uDirection * 3.326702)) * 0.106598;
  color += (texture(uSource, vUv + uDirection * 5.242989) + texture(uSource, vUv - uDirection * 5.242989)) * 0.018156;
  fragColor = color;
}`,vt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uShade;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform vec2 uShadeSize;
uniform vec3 uWeights;
uniform float uBloom;
uniform float uPresence;
uniform float uGrain;
uniform float uEdge;
uniform float uTime;
uniform float uTheme;
uniform vec3 uColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec4 cubic(sampler2D tex, vec2 uv, vec2 size) {
  vec2 st = uv * size - 0.5;
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
  vec2 c0 = (i + 0.5 + w1 / g0 - 1.0) / size;
  vec2 c1 = (i + 0.5 + w3 / g1 + 1.0) / size;
  vec4 a = texture(tex, c0) * g0.x + texture(tex, vec2(c1.x, c0.y)) * g1.x;
  vec4 b = texture(tex, vec2(c0.x, c1.y)) * g0.x + texture(tex, c1) * g1.x;
  return a * g0.y + b * g1.y;
}
void main() {
  vec4 shade = cubic(uShade, vUv, uShadeSize);
  vec4 bloom = texture(uBloom0, vUv) * uWeights.x + texture(uBloom1, vUv) * uWeights.y + texture(uBloom2, vUv) * uWeights.z;
  vec2 edge = min(vUv, 1.0 - vUv);
  float vignette = mix(1.0 - uEdge, 1.0, clamp(min(edge.x, edge.y) * 2.0, 0.0, 1.0));
  float fade = uPresence * vignette;
  float grain = hash(gl_FragCoord.xy + fract(uTime * 7.13) * 91.7) - 0.5;
  if (uTheme > 0.5) {
    float coverage = 1.0 - exp(-(shade.a + bloom.a * uBloom * 0.6) * 0.95);
    coverage = clamp(coverage * fade * (1.0 + grain * uGrain * 2.0), 0.0, 1.0);
    vec3 pigment = shade.a > 0.0001 ? clamp(shade.rgb / shade.a, 0.0, 1.0) : uColor;
    fragColor = vec4(pow(pigment, vec3(1.0 / 2.2)) * coverage, coverage);
    return;
  }
  vec3 color = (shade.rgb + bloom.rgb * uBloom) * fade;
  color = pow(1.0 - exp(-color * 0.95), vec3(1.0 / 2.2));
  color += color * grain * uGrain * 2.0;
  color = clamp(color + (hash(gl_FragCoord.xy * 1.37) - 0.5) / 255.0, 0.0, 1.0);
  fragColor = vec4(color, max(color.r, max(color.g, color.b)));
}`,dt=1900,E=(i,d,h)=>Math.min(h,Math.max(d,i)),ht=i=>{let d=String(i||"").trim(),h=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(d);if(h){let m=h[1].length===3?h[1].replace(/./g,T=>T+T):h[1];return[0,2,4].map(T=>parseInt(m.slice(T,T+2),16)/255)}let u=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(d);return u?[u[1],u[2],u[3]].map(m=>E(parseFloat(m)/255,0,1)):[.706,.592,.812]},ke=(i,d,h)=>{let u=i.createShader(d);return u?(i.shaderSource(u,h),i.compileShader(u),i.getShaderParameter(u,i.COMPILE_STATUS)?u:(console.error(i.getShaderInfoLog(u)),i.deleteShader(u),null)):null},H=(i,d)=>{let h=ke(i,i.VERTEX_SHADER,ct),u=ke(i,i.FRAGMENT_SHADER,d),m=h&&u?i.createProgram():null;if(!h||!u||!m)return h&&i.deleteShader(h),u&&i.deleteShader(u),null;if(i.attachShader(m,h),i.attachShader(m,u),i.bindAttribLocation(m,0,"aPosition"),i.linkProgram(m),i.deleteShader(h),i.deleteShader(u),!i.getProgramParameter(m,i.LINK_STATUS))return console.error(i.getProgramInfoLog(m)),i.deleteProgram(m),null;let T={},Z=i.getProgramParameter(m,i.ACTIVE_UNIFORMS);for(let k=0;k<Z;k++){let N=i.getActiveUniform(m,k);N&&(T[N.name]=i.getUniformLocation(m,N.name))}return{program:m,uniforms:T}},xt=({color:i="#B497CF",brightness:d=1,size:h=80,trailLength:u=50,inertia:m=.5,turbulence:T=.5,drift:Z=.3,detail:k=1,grainIntensity:N=.05,bloomStrength:Oe=.6,bloomRadius:Ge=1,bloomThreshold:Ve=.025,edgeIntensity:Xe=0,clickPuff:He=!0,intro:qe=!0,theme:We="dark",mixBlendMode:Ye,fadeDelayMs:$e,fadeDurationMs:Ke,maxDevicePixelRatio:Je=2,targetPixels:Qe,zIndex:Ze=10,className:je="",style:et})=>{let le=(0,w.useRef)(null),me=(0,w.useRef)(null),j=(0,w.useRef)(null),[ve,tt]=(0,w.useState)(0),[ee]=(0,w.useState)(()=>typeof window<"u"&&("ontouchstart"in window||navigator.maxTouchPoints>0)),de=We==="light",he={color:ht(i).map(U=>Math.pow(U,2.2)),brightness:Math.max(0,d),size:Math.max(8,h),trail:E(u,1,200),inertia:E(m,0,.99),turbulence:E(T,0,2),drift:Z,detail:E(k,0,1),grain:E(N,0,1),bloom:Math.max(0,Oe),bloomRadius:E(Ge,0,3),threshold:Math.max(0,Ve),edge:E(Xe,0,1),clickPuff:He,intro:qe,theme:de?1:0,fadeDelay:Math.max(0,$e??(ee?500:1e3)),fadeDuration:Math.max(1,Ke??(ee?1e3:1500)),maxRatio:E(Je,.25,3),budget:Math.max(5e4,Qe??(ee?3e5:6e5))},A=(0,w.useRef)(he);A.current=he,(0,w.useEffect)(()=>{j.current?.()}),(0,w.useEffect)(()=>{let U=le.current,g=me.current,F=U?.parentElement;if(!U||!g||!F)return;let te=F.style.position,q=getComputedStyle(F).position==="static";q&&(F.style.position="relative");let rt=window.matchMedia("(prefers-reduced-motion: reduce)").matches,e=g.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"default"});if(!e||!e.getExtension("EXT_color_buffer_float")){q&&(F.style.position=te);return}let xe=[H(e,ft),H(e,st),H(e,lt),H(e,mt),H(e,vt)],[pe,ge,ye,be,we]=xe;if(!pe||!ge||!ye||!be||!we){for(let o of xe)o&&e.deleteProgram(o.program);q&&(F.style.position=te);return}let C={sim:pe,shade:ge,down:ye,blur:be,composite:we},Te=e.createVertexArray();e.bindVertexArray(Te);let Se=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Se),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.disable(e.BLEND),e.disable(e.DEPTH_TEST);let R=()=>{let o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let t=e.createFramebuffer();return{texture:o,framebuffer:t,width:0,height:0}},O=(o,t,a)=>o.width===t&&o.height===a?!1:(o.width=t,o.height=a,e.bindTexture(e.TEXTURE_2D,o.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,a,0,e.RGBA,e.HALF_FLOAT,null),e.bindFramebuffer(e.FRAMEBUFFER,o.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o.texture,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),!0),M=[R(),R()],z=R(),S=[R(),R(),R()],G=[R(),R(),R()],I=(o,t)=>(e.bindFramebuffer(e.FRAMEBUFFER,o?o.framebuffer:null),e.viewport(0,0,o?o.width:g.width,o?o.height:g.height),e.useProgram(t.program),t.uniforms),D=(o,t)=>{e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,t)},v={width:1,height:1,ratio:1,sim:.25,shade:1},r={x:0,y:0,vx:0,vy:0,px:0,py:0,ready:!1},s={x:0,y:0,inside:!1,moved:-1e9},Ee={y:0},oe=[],y=0,_=0,B=0,W=0,Y=0,re=!0,ie=document.visibilityState!=="hidden",ae=!1,$=!0,V=A.current.intro&&!rt&&ve===0,ne=-1,Re=()=>{let o=A.current,t=U.getBoundingClientRect(),a=Math.max(1,Math.round(t.width)),l=Math.max(1,Math.round(t.height)),c=Math.min(window.devicePixelRatio||1,o.maxRatio);v.width=a,v.height=l,v.ratio=c;let x=Math.max(1,Math.round(a*c)),f=Math.max(1,Math.round(l*c));(g.width!==x||g.height!==f)&&(g.width=x,g.height=f),v.shade=Math.min(1,Math.sqrt(o.budget/(a*l)));let b=Math.max(8,Math.round(a*v.shade)),n=Math.max(8,Math.round(l*v.shade));O(z,b,n);let p=Math.max(4,Math.round(b/2)),L=Math.max(4,Math.round(n/2));for(let K=0;K<3;K++)O(S[K],p,L),O(G[K],p,L),p=Math.max(2,Math.round(p/2)),L=Math.max(2,Math.round(L/2));v.sim=Math.min(.35,220/Math.max(a,l));let _e=Math.max(16,Math.round(a*v.sim)),Be=Math.max(16,Math.round(l*v.sim));O(M[0],_e,Be),O(M[1],_e,Be),$=!0},it=(o,t)=>{let a=A.current,l=M[_],c=M[1-_],x=v.sim,f=a.size*x*.3,b=Math.exp(-o/(.12+a.trail*.022)),n=I(c,C.sim);D(0,l.texture),e.uniform1i(n.uState,0),e.uniform2f(n.uSize,c.width,c.height),e.uniform1f(n.uDt,o),e.uniform1f(n.uTime,Y),e.uniform1f(n.uDecay,b),e.uniform1f(n.uDrag,Math.exp(-o*2.4)),e.uniform2f(n.uDrift,0,a.drift*110*x),e.uniform1f(n.uTurbulence,a.turbulence*70*x),e.uniform1f(n.uSwirl,1/Math.max(1,a.size*x*2.2)),e.uniform2f(n.uFrom,r.px*x,(v.height-r.py)*x),e.uniform2f(n.uTo,r.x*x,(v.height-r.y)*x),e.uniform1f(n.uRadius,f),e.uniform1f(n.uTrail,t?.42*y:0),e.uniform1f(n.uIdle,t?.22*y:0),e.uniform2f(n.uVelocity,r.vx*x*.5,-r.vy*x*.5);let p=oe.shift();p?e.uniform4f(n.uPuff,p.x*x,(v.height-p.y)*x,f*1.4,.9):e.uniform4f(n.uPuff,0,0,1,0),e.drawArrays(e.TRIANGLES,0,3),_=1-_},at=()=>{let o=A.current,t=I(z,C.shade);D(0,M[_].texture),e.uniform1i(t.uState,0),e.uniform2f(t.uSimSize,M[_].width,M[_].height),e.uniform2f(t.uView,v.width,v.height),e.uniform2f(t.uHead,r.x,v.height-r.y),e.uniform1f(t.uHeadSize,o.size*.38),e.uniform1f(t.uHeadAmount,r.ready?.8*y:0),e.uniform1f(t.uTime,Y),e.uniform3fv(t.uColor,o.color),e.uniform1f(t.uDetail,o.detail),e.uniform1f(t.uNoiseScale,2.4/Math.max(20,o.size*2.6)),e.uniform2f(t.uFlow,0,Ee.y),e.uniform1f(t.uBrightness,o.brightness),e.uniform1f(t.uTheme,o.theme),e.drawArrays(e.TRIANGLES,0,3);let a=z;for(let c=0;c<3;c++)t=I(S[c],C.down),D(0,a.texture),e.uniform1i(t.uSource,0),e.uniform2f(t.uTexel,1/a.width,1/a.height),e.uniform1f(t.uThreshold,c===0?o.threshold:0),e.drawArrays(e.TRIANGLES,0,3),t=I(G[c],C.blur),D(0,S[c].texture),e.uniform1i(t.uSource,0),e.uniform2f(t.uDirection,1/S[c].width,0),e.drawArrays(e.TRIANGLES,0,3),t=I(S[c],C.blur),D(0,G[c].texture),e.uniform1i(t.uSource,0),e.uniform2f(t.uDirection,0,1/G[c].height),e.drawArrays(e.TRIANGLES,0,3),a=S[c];t=I(null,C.composite),D(0,z.texture),D(1,S[0].texture),D(2,S[1].texture),D(3,S[2].texture),e.uniform1i(t.uShade,0),e.uniform1i(t.uBloom0,1),e.uniform1i(t.uBloom1,2),e.uniform1i(t.uBloom2,3),e.uniform2f(t.uShadeSize,z.width,z.height);let l=o.bloomRadius;e.uniform3f(t.uWeights,1,.6+.4*l,.25+.75*Math.min(1,l*l*.5)),e.uniform1f(t.uBloom,o.bloom),e.uniform1f(t.uPresence,y),e.uniform1f(t.uGrain,o.grain),e.uniform1f(t.uEdge,o.edge),e.uniform1f(t.uTime,Y),e.uniform1f(t.uTheme,o.theme),e.uniform3fv(t.uColor,o.color),e.drawArrays(e.TRIANGLES,0,3)},Me=o=>{if(B=0,ae)return;let t=E((o-W)/1e3||0,0,.05);W=Math.max(W,o),Y+=t;let a=A.current;if($&&Re(),$=!1,V){ne<0&&(ne=o+280);let f=(o-ne)/dt;if(f>=0){let b=f<1?f*f*(3-2*f):1,n=v.width*(.16+.44*b+.05*Math.sin(b*Math.PI)),p=v.height*(.7-.24*b-.1*Math.sin(b*Math.PI*2));r.ready||(r.x=r.px=n,r.y=r.py=p,r.vx=r.vy=0,r.ready=!0),s.x=n,s.y=p,s.inside=!0,s.moved=o,f>=1&&(V=!1)}}let l=o-s.moved,c=r.ready?l<a.fadeDelay?1:Math.max(0,1-(l-a.fadeDelay)/a.fadeDuration):0;if(y+=(c-y)*(1-Math.exp(-t/(c>y?.12:.08))),Math.abs(c-y)<.002&&(y=c),r.px=r.x,r.py=r.y,r.ready)if(s.inside){let f=520*Math.pow(1-a.inertia,2)+26,b=2*Math.sqrt(f)*.92,n=Math.max(1,Math.ceil(t/(1/240))),p=t/n;for(let L=0;L<n;L++)r.vx+=(f*(s.x-r.x)-b*r.vx)*p,r.vy+=(f*(s.y-r.y)-b*r.vy)*p,r.x+=r.vx*p,r.y+=r.vy*p}else{let f=Math.pow(a.inertia,t*60);r.vx*=f,r.vy*=f,r.x+=r.vx*t,r.y+=r.vy*t}if(Ee.y-=a.drift*110*t,it(t,y>.01),at(),!(V||c>0||y>.001||oe.length>0)){for(let f of M)e.bindFramebuffer(e.FRAMEBUFFER,f.framebuffer),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,g.width,g.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);return}re&&ie&&(B=requestAnimationFrame(Me))},P=()=>{B||ae||!re||!ie||(W=performance.now(),B=requestAnimationFrame(Me))};j.current=P;let De=o=>{let t=U.getBoundingClientRect(),a=o.clientX-t.left,l=o.clientY-t.top;return{x:a,y:l,inside:a>=0&&l>=0&&a<=t.width&&l<=t.height}},ce=o=>{let t=De(o);if(t.inside&&(V=!1),!t.inside){s.inside&&ue();return}!s.inside&&!r.ready?(r.x=r.px=t.x,r.y=r.py=t.y,r.vx=r.vy=0,r.ready=!0):!s.inside&&y<.05&&(r.x=r.px=t.x,r.y=r.py=t.y,r.vx=r.vy=0),s.x=t.x,s.y=t.y,s.inside=!0,s.moved=performance.now(),P()},Ae=o=>{let t=De(o);t.inside&&(ce(o),A.current.clickPuff&&(oe.push({x:t.x,y:t.y}),P()))},ue=()=>{let o=performance.now();s.inside&&o-s.moved<A.current.fadeDelay&&(s.moved=o),s.inside=!1,P()};window.addEventListener("pointermove",ce,{passive:!0}),window.addEventListener("pointerdown",Ae,{passive:!0}),document.documentElement.addEventListener("pointerleave",ue);let Ue=o=>{o.preventDefault(),ae=!0,cancelAnimationFrame(B),B=0},Pe=()=>tt(o=>o+1);g.addEventListener("webglcontextlost",Ue),g.addEventListener("webglcontextrestored",Pe);let Fe=new ResizeObserver(()=>{$=!0,P()});Fe.observe(U);let Ce=new IntersectionObserver(o=>{re=o.some(t=>t.isIntersecting),P()});Ce.observe(U);let ze=()=>{ie=document.visibilityState!=="hidden",P()};return document.addEventListener("visibilitychange",ze),Re(),V&&P(),()=>{if(cancelAnimationFrame(B),j.current=null,Fe.disconnect(),Ce.disconnect(),window.removeEventListener("pointermove",ce),window.removeEventListener("pointerdown",Ae),document.documentElement.removeEventListener("pointerleave",ue),document.removeEventListener("visibilitychange",ze),g.removeEventListener("webglcontextlost",Ue),g.removeEventListener("webglcontextrestored",Pe),!e.isContextLost()){for(let o of[...M,z,...S,...G])e.deleteFramebuffer(o.framebuffer),e.deleteTexture(o.texture);e.deleteBuffer(Se),e.deleteVertexArray(Te);for(let o of Object.values(C))e.deleteProgram(o.program)}q&&(F.style.position=te)}},[ve]);let ot=Ye??(de?"normal":"screen");return(0,fe.jsx)("div",{ref:le,className:`pointer-events-none absolute inset-0 overflow-hidden ${je}`.trim(),style:{zIndex:Ze,...et},children:(0,fe.jsx)("canvas",{ref:me,className:"absolute inset-0 block h-full w-full",style:{mixBlendMode:ot},"aria-hidden":"true"})})},Ne=xt;var se=X(J(),1),pt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Q=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Et=pt.map((i,d)=>({id:d+1,image:i,src:i,img:i,url:i,title:Q[d],text:Q[d],label:Q[d],alt:Q[d],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][d],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function gt({big:i}){return(0,se.jsx)(Ie,{big:i,dark:!0,center:!0,zoom:1,drive:"move",children:(0,se.jsx)(Ne,{})})}var Rt=Le(gt);export{Rt as default};
