import{c as V,i as qe,j as ee,l as Re,m as we}from"./chunks/chunk-6IYH4WPJ.js";var S=V(qe(),1),ie=V(ee(),1),Ye="https://images.unsplash.com/photo-1693250707557-a846a014b321?q=80&w=1400&auto=format&fit=crop",We=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ke=`#version 300 es
precision highp float;
uniform sampler2D uPrevious;
uniform vec2 uTexture;
uniform vec2 uView;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uSoftness;
uniform float uStrength;
uniform float uFade;
out vec4 outColor;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  return length(p - a - ab * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uTexture;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uView;
  float trail = max(texture(uPrevious, uv).r - uFade, 0.0);
  float band = max(uRadius * uSoftness, 1.0);
  float brush = clamp((uRadius - segment(p, uFrom, uTo)) / band, 0.0, 1.0);
  brush = brush * brush * (3.0 - 2.0 * brush);
  outColor = vec4(max(trail, brush * uStrength), 0.0, 0.0, 1.0);
}`,He=`#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uMask;
uniform vec2 uResolution;
uniform vec2 uView;
uniform float uDpr;
uniform vec4 uFrame;
uniform float uTexels;
uniform float uMode;
uniform float uShape;
uniform float uCell;
uniform float uAngle;
uniform float uScale;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec3 uPaper;
uniform float uContrast;
uniform float uBrightness;
uniform float uInvert;
uniform float uRough;
uniform float uShift;
uniform vec3 uMatte;
uniform float uKey;
uniform float uReverse;
uniform float uIntro;
uniform vec4 uBursts[4];
uniform float uBurstWidth;
out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 CYAN = vec3(0.0, 0.64, 0.93);
const vec3 MAGENTA = vec3(0.92, 0.07, 0.56);
const vec3 YELLOW = vec3(1.0, 0.91, 0.0);
const vec3 KEY = vec3(0.11, 0.1, 0.12);
const vec3 RED = vec3(1.0, 0.16, 0.12);
const vec3 GREEN = vec3(0.12, 1.0, 0.3);
const vec3 BLUE = vec3(0.16, 0.32, 1.0);

mat2 rotate(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec4 photo(vec2 p, float lod, float margin) {
  vec2 uv = (p - uFrame.xy) / uFrame.zw;
  vec4 c = textureLod(uImage, clamp(uv, 0.0, 1.0), lod);
  vec2 slack = margin * uCell / uFrame.zw;
  vec2 inside = step(-slack, uv) * step(uv, 1.0 + slack);
  float keep = inside.x * inside.y * c.a;
  keep *= mix(1.0, smoothstep(0.05, 0.2, distance(c.rgb, uMatte)), uKey);
  return vec4(c.rgb, keep);
}

float grade(float v) {
  v = clamp((v - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  return mix(v, 1.0 - v, uInvert);
}

vec3 gradeColor(vec3 c) {
  return vec3(grade(c.r), grade(c.g), grade(c.b));
}

vec3 tone(vec3 c) {
  return pow(max(c, 0.0), vec3(1.5));
}

float press(float t, float alpha) {
  return (0.05 + clamp(t, 0.0, 1.0) * 0.89) * alpha;
}

float plate(float t, float alpha) {
  return (0.02 + clamp(t, 0.0, 1.0) * 0.92) * alpha;
}

vec3 decode(vec3 c) {
  return pow(max(c, 0.0), vec3(2.2));
}

vec4 separate(vec3 color) {
  vec3 target = clamp(tone(gradeColor(color)) / max(tone(uPaper), vec3(0.02)), 0.0, 1.0);
  vec3 absorbC = 1.0 - decode(CYAN);
  vec3 absorbM = 1.0 - decode(MAGENTA);
  vec3 absorbY = 1.0 - decode(YELLOW);
  float bright = pow(max(max(target.r, target.g), target.b), 0.4545);
  float key = pow(clamp(1.0 - bright / 0.62, 0.0, 1.0), 1.4) * 0.95;
  vec3 rest = clamp(target / max(1.0 - key * (1.0 - decode(KEY)), vec3(0.03)), 0.0, 1.0);
  vec3 a = 1.0 - rest;
  for (int i = 0; i < 3; i++) {
    vec3 tc = 1.0 - a.x * absorbC;
    vec3 tm = 1.0 - a.y * absorbM;
    vec3 ty = 1.0 - a.z * absorbY;
    mat3 slope = mat3(-absorbC * tm * ty, -absorbM * tc * ty, -absorbY * tc * tm);
    if (abs(determinant(slope)) < 1e-6) break;
    a = clamp(a - inverse(slope) * (tc * tm * ty - rest), 0.0, 1.0);
  }
  return vec4(a, key);
}

vec3 emit(vec3 color) {
  vec3 target = max(tone(gradeColor(color)) - tone(uPaper), 0.0);
  mat3 lights = mat3(decode(RED), decode(GREEN), decode(BLUE));
  return clamp(inverse(lights) * target, 0.0, 1.0);
}

float metric(vec2 f) {
  if (uShape < 0.5) return length(f);
  if (uShape < 1.5) return length(f * vec2(0.8, 1.15));
  if (uShape < 2.5) return max(abs(f.x), abs(f.y));
  if (uShape < 3.5) return abs(f.x) + abs(f.y);
  if (uShape < 4.5) return abs(f.y);
  return min(abs(f.x), abs(f.y));
}

float reach(float t) {
  t = clamp(t, 0.0, 1.0);
  if (uShape < 0.5) return t < 0.785 ? sqrt(t / 3.14159) : mix(0.5, 0.72, (t - 0.785) / 0.215);
  if (uShape < 1.5) return t < 0.7 ? sqrt(t * 0.92 / 3.14159) : mix(0.4497, 0.72, (t - 0.7) / 0.3);
  if (uShape < 2.5) return 0.5 * sqrt(t) + 0.02 * t;
  if (uShape < 3.5) return t < 0.5 ? sqrt(t * 0.5) : 1.0 - sqrt((1.0 - t) * 0.5);
  if (uShape < 4.5) return 0.52 * t;
  return (1.0 - sqrt(1.0 - t)) * 0.5 + 0.02 * t;
}

vec2 center(vec2 p, float angle) {
  vec2 q = rotate(angle) * p / uCell;
  vec2 c = floor(q) + 0.5;
  if (uShape > 3.5 && uShape < 4.5) c.x = q.x;
  return rotate(-angle) * c * uCell;
}

float dots(vec2 p, float angle, float t, float seed, float grow) {
  vec2 q = rotate(angle) * p / uCell;
  float d = metric(fract(q) - 0.5);
  d += (noise(p * 0.42 + seed * 17.0) - 0.5) * uRough * 0.18;
  float r = reach(t) * uScale * grow;
  float w = max(fwidth(d), 0.0001) * 0.75;
  return smoothstep(r + w, r - w, d) * clamp(r / (w * 2.0), 0.0, 1.0);
}

float coverage(vec4 image) {
  float shade = dot(tone(gradeColor(image.rgb)), LUMA);
  float paper = dot(tone(uPaper), LUMA);
  float span = dot(tone(uInk), LUMA) - paper;
  float t = abs(span) < 0.02 ? 1.0 - shade : (shade - paper) / span;
  return press(t, image.a);
}

float burst(vec2 p) {
  float value = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 b = uBursts[i];
    if (b.w <= 0.0) continue;
    float offset = distance(p, b.xy) - b.z;
    float edge = offset > 0.0 ? offset / (uBurstWidth * 0.35) : -offset / uBurstWidth;
    value = max(value, clamp(1.0 - edge, 0.0, 1.0) * b.w);
  }
  return value;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  float lod = log2(max(uCell * uTexels, 1.0));
  float base = uAngle;
  vec2 drift = vec2(uShift, uShift * -0.6);

  vec2 field = p / max(uView.x, uView.y) - uView / max(uView.x, uView.y) * 0.5;
  float delay = length(field) * 1.15 + hash(floor(p / uCell)) * 0.06;
  float grow = smoothstep(0.0, 1.0, clamp((uIntro * 1.7 - delay) / 0.45, 0.0, 1.0));

  vec3 print = uPaper;
  if (uMode < 0.5) {
    float k = dots(p, base, coverage(photo(center(p, base), lod, 0.5)), 0.0, grow);
    print = mix(uPaper, uInk, k);
  } else if (uMode < 1.5) {
    float second = base + 0.5236;
    float tA = coverage(photo(center(p, base), lod, 0.5));
    float tB = coverage(photo(center(p + drift, second) - drift, lod, 0.5));
    float kA = dots(p, base, pow(tA, 1.9), 0.0, grow);
    float kB = dots(p + drift, second, clamp(tB * 1.3, 0.0, 1.0) * 0.8, 1.0, grow);
    if (dot(uPaper, LUMA) > 0.5) {
      print = uPaper * mix(vec3(1.0), uAccent, kB) * mix(vec3(1.0), uInk, kA);
    } else {
      print = min(uPaper + uAccent * kB + uInk * kA, vec3(1.0));
    }
  } else if (dot(uPaper, LUMA) > 0.5) {
    float ac = base - 0.5236;
    float am = base + 0.5236;
    float ay = base - 0.7854;
    vec4 sc = photo(center(p + drift, ac) - drift, lod, 0.5);
    vec4 sm = photo(center(p - drift, am) + drift, lod, 0.5);
    vec4 sy = photo(center(p + drift.yx, ay) - drift.yx, lod, 0.5);
    vec4 sk = photo(center(p, base), lod, 0.5);
    float kc = sc.a > 0.0 ? dots(p + drift, ac, plate(separate(sc.rgb).x, sc.a), 1.0, grow) : 0.0;
    float km = sm.a > 0.0 ? dots(p - drift, am, plate(separate(sm.rgb).y, sm.a), 2.0, grow) : 0.0;
    float ky = sy.a > 0.0 ? dots(p + drift.yx, ay, plate(separate(sy.rgb).z, sy.a), 3.0, grow) : 0.0;
    float kk = sk.a > 0.0 ? dots(p, base, plate(separate(sk.rgb).w, sk.a), 4.0, grow) : 0.0;
    print = uPaper;
    print *= mix(vec3(1.0), CYAN, kc);
    print *= mix(vec3(1.0), MAGENTA, km);
    print *= mix(vec3(1.0), YELLOW, ky);
    print *= mix(vec3(1.0), KEY, kk);
  } else {
    float ar = base - 0.5236;
    float ag = base + 0.5236;
    vec4 sr = photo(center(p + drift, ar) - drift, lod, 0.5);
    vec4 sg = photo(center(p - drift, ag) + drift, lod, 0.5);
    vec4 sb = photo(center(p, base), lod, 0.5);
    float kr = dots(p + drift, ar, plate(emit(sr.rgb).x, sr.a), 1.0, grow);
    float kg = dots(p - drift, ag, plate(emit(sg.rgb).y, sg.a), 2.0, grow);
    float kb = dots(p, base, plate(emit(sb.rgb).z, sb.a), 3.0, grow);
    print = min(uPaper + RED * kr + GREEN * kg + BLUE * kb, vec3(1.0));
  }

  vec2 maskUv = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  float shown = max(texture(uMask, maskUv).r, burst(p));
  shown = mix(shown, 1.0 - shown, uReverse);
  shown = shown * shown * (3.0 - 2.0 * shown);
  vec2 q = rotate(base) * p / uCell;
  float d = metric(fract(q) - 0.5);
  float r = reach(1.0) * 1.08 * shown;
  float w = max(fwidth(d), 0.0001) * 0.75;
  float k = smoothstep(r + w, r - w, d) * clamp(r / (w * 2.0), 0.0, 1.0);
  vec4 sharp = photo(p, 0.0, 0.0);
  vec3 real = mix(uPaper, sharp.rgb, sharp.a);
  outColor = vec4(mix(print, real, k), 1.0);
}`,$e={mono:0,duotone:1,color:2},Je={dot:0,ellipse:1,square:2,diamond:3,line:4,cross:5},Ae=4,ye=1.3,Qe=1.4,Me=.5,O=(r,s,v)=>Math.min(v,Math.max(s,r)),Se=(r,s,v)=>{let c=r.createShader(s);return c?(r.shaderSource(c,v),r.compileShader(c),r.getShaderParameter(c,r.COMPILE_STATUS)?c:(r.deleteShader(c),null)):null},_e=(r,s)=>{let v=Se(r,r.VERTEX_SHADER,We),c=Se(r,r.FRAGMENT_SHADER,s),u=r.createProgram();return!v||!c||!u?null:(r.attachShader(u,v),r.attachShader(u,c),r.bindAttribLocation(u,0,"aPosition"),r.linkProgram(u),r.deleteShader(v),r.deleteShader(c),r.getProgramParameter(u,r.LINK_STATUS)?u:(r.deleteProgram(u),null))},ke=(r,s,v)=>{let c={};for(let u of v)c[u]=r.getUniformLocation(s,u);return c},Ze=(r,s,v)=>[s*(.5+.32*Math.sin(r*.53)+.08*Math.sin(r*1.31+.6)),v*(.5+.27*Math.sin(r*.71+1.1)+.07*Math.cos(r*1.57))],je=(r,s)=>{r.canvas.width=32,r.canvas.height=32,r.clearRect(0,0,32,32),r.drawImage(s,0,0,32,32);let c=r.getImageData(0,0,32,32).data,u=[0,0,0],q=[0,0,0],A=0,Y=0;for(let b=0;b<32;b++)for(let E=0;E<32;E++){if(E>0&&b>0&&E<31&&b<31)continue;let P=(b*32+E)*4;c[P+3]<250&&Y++;for(let _=0;_<3;_++){let B=c[P+_]/255;u[_]+=B,q[_]+=B*B}A++}let W=[u[0]/A,u[1]/A,u[2]/A],re=W.reduce((b,E,P)=>b+Math.sqrt(Math.max(0,q[P]/A-E*E)),0)/3;return{matte:W,plain:Y<A*.5&&re<.06}},et=({src:r=Ye,fit:s="cover",mode:v="mono",shape:c="dot",cellSize:u=6,angle:q=45,dotScale:A=1,inkColor:Y="#120f17",accentColor:W="#ff4f2a",paperColor:re="#ffffff",contrast:b=1.1,brightness:E=0,invert:P=!1,roughness:_=0,misregistration:B=0,revealRadius:Pe=160,softness:Fe=.6,linger:Ie=1.2,reverse:Le=!1,wander:Ce=!1,clickBurst:De=!0,intro:Be=!0,className:Xe="",style:Ne})=>{let ce=(0,S.useRef)(null),ue=(0,S.useRef)(null),ae=(0,S.useRef)(null),fe={fit:s,mode:$e[v]??0,shape:Je[c]??0,cellSize:O(u,2,80),angle:q,dotScale:O(A,.2,2),inkColor:String(Y),accentColor:String(W),paperColor:String(re),contrast:b,brightness:E,invert:P,roughness:O(_,0,1),misregistration:O(B,0,1),revealRadius:Math.max(0,Pe),softness:O(Fe,0,1),linger:Math.max(0,Ie),reverse:Le,wander:Ce,clickBurst:De,intro:Be},K=(0,S.useRef)(fe);return K.current=fe,(0,S.useEffect)(()=>{let d=ce.current,x=ue.current,e=x?.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!d||!x||!e)return;let H=_e(e,Ke),$=_e(e,He);if(!H||!$)return;let T=ke(e,H,["uPrevious","uTexture","uView","uFrom","uTo","uRadius","uSoftness","uStrength","uFade"]),n=ke(e,$,["uImage","uMask","uResolution","uView","uDpr","uFrame","uTexels","uMode","uShape","uCell","uAngle","uScale","uInk","uAccent","uPaper","uContrast","uBrightness","uInvert","uRough","uShift","uMatte","uKey","uReverse","uIntro","uBursts","uBurstWidth"]),J=e.createVertexArray(),le=e.createBuffer();e.bindVertexArray(J),e.bindBuffer(e.ARRAY_BUFFER,le),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);let me=!!e.getExtension("EXT_color_buffer_float"),Q=e.createTexture();e.bindTexture(e.TEXTURE_2D,Q),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array(4)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let Z=(t,o)=>{let i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),me?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,o,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,o,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let l=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null),{texture:i,framebuffer:l,width:t,height:o}},de=t=>{e.deleteFramebuffer(t.framebuffer),e.deleteTexture(t.texture)},g=[Z(2,2),Z(2,2)],F=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),pe=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,oe=new Map,y=[],I=new Float32Array(Ae*4),f={x:0,y:0,inside:!1,fresh:!0,placed:!1},p={x:0,y:0,px:0,py:0},a={width:1,height:1,dpr:1,image:null,matte:[0,0,0],key:0,introStart:0,presence:0,drift:0,trailUntil:0},L=0,C=0,X=!0,N=!0,ne=t=>{if(oe.has(t))return oe.get(t);let o=[0,0,0];if(F&&t){F.clearRect(0,0,1,1),F.fillStyle="#000000",F.fillStyle=/^[0-9a-f]{3,8}$/i.test(t)?`#${t}`:t,F.fillRect(0,0,1,1);let[i,l,h]=F.getImageData(0,0,1,1).data;o=[i/255,l/255,h/255]}return oe.set(t,o),o},Ge=t=>{let{image:o,width:i,height:l}=a;if(!o)return[0,0,i,l];let h=(t.fit==="cover"?Math.max:Math.min)(i/o.naturalWidth,l/o.naturalHeight),R=o.naturalWidth*h,w=o.naturalHeight*h;return[(i-R)/2,(l-w)/2,R,w]},he=()=>{let t=Math.max(1,d.clientWidth),o=Math.max(1,d.clientHeight),i=Math.min(window.devicePixelRatio||1,2);a.width=t,a.height=o,a.dpr=i,x.width=Math.max(1,Math.round(t*i)),x.height=Math.max(1,Math.round(o*i));let l=Math.max(2,Math.round(t*Me)),h=Math.max(2,Math.round(o*Me));(l!==g[0].width||h!==g[0].height)&&(g.forEach(de),g=[Z(l,h),Z(l,h)]),f.placed||(f.x=t/2,f.y=o/2),k()},ze=(t,o)=>{let i=me?0:.0058823529411764705;e.bindFramebuffer(e.FRAMEBUFFER,g[1].framebuffer),e.viewport(0,0,g[1].width,g[1].height),e.useProgram(H),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,g[0].texture),e.uniform1i(T.uPrevious,0),e.uniform2f(T.uTexture,g[1].width,g[1].height),e.uniform2f(T.uView,a.width,a.height),e.uniform2f(T.uFrom,p.px,p.py),e.uniform2f(T.uTo,p.x,p.y),e.uniform1f(T.uRadius,t.revealRadius*(.45+.55*a.presence)),e.uniform1f(T.uSoftness,t.softness),e.uniform1f(T.uStrength,a.presence),e.uniform1f(T.uFade,Math.max(t.linger>0?o/t.linger:1,i)),e.bindVertexArray(J),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),g.reverse()},ve=(t,o)=>{let[i,l,h,R]=Ge(t),w=a.image,z=w?!t.intro||pe?1:Math.min(1,(o-a.introStart)/1e3/Qe):0;return e.viewport(0,0,x.width,x.height),e.useProgram($),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,Q),e.uniform1i(n.uImage,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,g[0].texture),e.uniform1i(n.uMask,1),e.uniform2f(n.uResolution,x.width,x.height),e.uniform2f(n.uView,a.width,a.height),e.uniform1f(n.uDpr,x.width/a.width),e.uniform4f(n.uFrame,i,l,h,R),e.uniform1f(n.uTexels,w?w.naturalWidth/h:1),e.uniform1f(n.uMode,t.mode),e.uniform1f(n.uShape,t.shape),e.uniform1f(n.uCell,t.cellSize),e.uniform1f(n.uAngle,t.angle*Math.PI/180),e.uniform1f(n.uScale,t.dotScale),e.uniform3fv(n.uInk,ne(t.inkColor)),e.uniform3fv(n.uAccent,ne(t.accentColor)),e.uniform3fv(n.uPaper,ne(t.paperColor)),e.uniform1f(n.uContrast,t.contrast),e.uniform1f(n.uBrightness,t.brightness),e.uniform1f(n.uInvert,t.invert?1:0),e.uniform1f(n.uRough,t.roughness),e.uniform1f(n.uShift,t.misregistration*t.cellSize*.35),e.uniform3fv(n.uMatte,a.matte),e.uniform1f(n.uKey,a.key),e.uniform1f(n.uReverse,t.reverse?1:0),e.uniform1f(n.uIntro,1-(1-z)*(1-z)),e.uniform4fv(n.uBursts,I),e.uniform1f(n.uBurstWidth,Math.max(60,t.revealRadius*.9)),e.bindVertexArray(J),e.drawArrays(e.TRIANGLES,0,3),e.bindVertexArray(null),z},ge=t=>{if(L=0,!N||!X||document.hidden)return;let o=K.current,i=C?Math.min(.05,Math.max(0,(t-C)/1e3)):1/60;C=t;let l=o.wander&&!pe,h=f.x,R=f.y;if(!f.inside&&l){a.drift=Math.min(1,a.drift+i/1.2);let[m,D]=Ze(t/1e3,a.width,a.height),U=a.drift*a.drift*(3-2*a.drift);h+=(m-h)*U,R+=(D-R)*U}else a.drift=0;let w=f.inside||l;if(a.presence+=((w?1:0)-a.presence)*(1-Math.exp(-i/.16)),f.fresh)p.x=p.px=h,p.y=p.py=R,f.fresh=!1;else{let m=1-Math.exp(-i/.035);p.x+=(h-p.x)*m,p.y+=(R-p.y)*m}I.fill(0);for(let m=y.length-1;m>=0;m--)(t-y[m].start)/1e3>=ye&&y.splice(m,1);y.forEach((m,D)=>{let U=Math.max(0,(t-m.start)/1e3/ye),Oe=Math.hypot(Math.max(m.x,a.width-m.x),Math.max(m.y,a.height-m.y))+80;I[D*4]=m.x,I[D*4+1]=m.y,I[D*4+2]=Oe*Math.sin(U*Math.PI/2),I[D*4+3]=1-U*U*U}),a.presence>.002&&(a.trailUntil=t+o.linger*1e3+200),ze(o,i),p.px=p.x,p.py=p.y;let z=ve(o,t);w||a.presence>.002||y.length>0||t<a.trailUntil||a.image&&z<1?L=requestAnimationFrame(ge):C=0},k=()=>{!L&&N&&X&&!document.hidden&&(L=requestAnimationFrame(ge))},M=new Image;M.crossOrigin="anonymous",M.decoding="async",M.onload=()=>{if(!N)return;e.bindTexture(e.TEXTURE_2D,Q),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,M),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR);let t=document.createElement("canvas").getContext("2d",{willReadFrequently:!0});if(t)try{let o=je(t,M);a.matte=o.matte,a.key=o.plain?1:0}catch{a.key=0}a.image=M,a.introStart=performance.now(),k()},M.src=r;let Ve=t=>{let o=d.getBoundingClientRect();f.x=t.clientX-o.left,f.y=t.clientY-o.top,f.placed=!0},G=t=>{Ve(t),f.inside||(f.inside=!0,f.fresh=!0),k()},j=()=>{f.inside=!1,k()},Ee=t=>{G(t),!(!K.current.clickBurst||t.pointerType==="mouse"&&t.button!==0)&&(y.push({x:f.x,y:f.y,start:performance.now()}),y.length>Ae&&y.shift())},be=()=>{C=0,k()};d.addEventListener("pointermove",G,{passive:!0}),d.addEventListener("pointerenter",G,{passive:!0}),d.addEventListener("pointerdown",Ee,{passive:!0}),d.addEventListener("pointerleave",j,{passive:!0}),d.addEventListener("pointercancel",j,{passive:!0}),document.addEventListener("visibilitychange",be);let xe=new ResizeObserver(he);xe.observe(d);let Te=new IntersectionObserver(t=>{X=t.some(o=>o.isIntersecting),X&&(C=0,k())});return Te.observe(d),he(),ae.current=()=>{!L&&N&&X&&(ve(K.current,performance.now()),k())},()=>{N=!1,cancelAnimationFrame(L),ae.current=null,M.onload=null,xe.disconnect(),Te.disconnect(),d.removeEventListener("pointermove",G),d.removeEventListener("pointerenter",G),d.removeEventListener("pointerdown",Ee),d.removeEventListener("pointerleave",j),d.removeEventListener("pointercancel",j),document.removeEventListener("visibilitychange",be),g.forEach(de),e.deleteTexture(Q),e.deleteBuffer(le),e.deleteVertexArray(J),e.deleteProgram(H),e.deleteProgram($)}},[r]),(0,S.useEffect)(()=>{ae.current?.()}),(0,ie.jsx)("div",{ref:ce,className:["relative h-full w-full overflow-hidden",Xe].filter(Boolean).join(" "),style:Ne,children:(0,ie.jsx)("canvas",{ref:ue,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ue=et;var se=V(ee(),1),tt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],te=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ut=tt.map((r,s)=>({id:s+1,image:r,src:r,img:r,url:r,title:te[s],text:te[s],label:te[s],alt:te[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function rt({big:r}){return(0,se.jsx)(we,{big:r,dark:!0,center:!0,zoom:1,drive:!1,children:(0,se.jsx)(Ue,{})})}var ft=Re(rt);export{ft as default};
