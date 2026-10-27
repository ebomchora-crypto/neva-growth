import{c as _,i as Ze,j as B,l as ve,m as pe}from"./chunks/chunk-6IYH4WPJ.js";var M=_(Ze(),1),Te=_(B(),1),$e="relative h-full w-full overflow-hidden",je="absolute inset-0 block h-full w-full",et={none:0,aperture:1,shadow:2,slot:3},tt=.56,U=1.6,he=.8,we=Math.PI*2,ot=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,rt=`#version 300 es
precision highp float;
uniform vec2 uGrid;
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uLevels;
uniform float uDecay;
uniform float uReveal;
uniform float uRise;
uniform vec4 uSeed;
uniform sampler2D uPrevious;
out vec4 outColor;

float field(vec2 uv, float t) {
  uv = (uv - 0.5) * uFrequency + 0.5;
  float f = 0.0;
  f += 0.7 * sin(0.5 * uv.x + t / 5.0 + uSeed.x);
  f += 3.0 * sin(1.6 * uv.y + t / 5.0 + uSeed.y);
  f += sin(10.0 * (uv.y * sin(t / 2.0 + uSeed.z) + uv.x * cos(t / 5.0)) + t / 2.0);
  float cx = uv.x + 0.5 * sin(t / 2.0 + uSeed.w);
  float cy = uv.y + 0.5 * cos(t / 4.0 + uSeed.x * 0.7);
  f += 0.4 * sin(sqrt(100.0 * cx * cx + 100.0 * cy * cy + 1.0) + t);
  f += 0.9 * sin(sqrt(75.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  f -= 1.4 * sin(sqrt(256.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  f += 0.3 * sin(0.5 * uv.y + uv.x + sin(t));
  return f;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell + 0.5) / uGrid;
  float s = (0.5 + 0.499 * sin(field(uv, uTime) * uAmplitude)) * mix(1.0 / uLevels, 1.0, uReveal);
  float level = floor(s * uLevels) / max(uLevels - 1.0, 1.0);
  float previous = texelFetch(uPrevious, ivec2(cell), 0).r;
  float lifted = min(level, previous + uRise);
  outColor = vec4(max(lifted, previous * uDecay - 0.004), level, 0.0, 1.0);
}`,it=`#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform vec2 uSize;
out vec4 outColor;

void main() {
  float v = texture(uContent, gl_FragCoord.xy / uSize).r;
  outColor = vec4(v * v, 0.0, 0.0, 1.0);
}`,nt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uSize;
uniform vec2 uDirection;
uniform float uSigma;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  float stride = max(uSigma * 0.55, 0.5);
  float total = 0.0;
  float sum = 0.0;
  for (int i = -7; i <= 7; i++) {
    float x = float(i) * stride;
    float w = exp(-0.5 * x * x / (uSigma * uSigma));
    sum += texture(uSource, uv + uDirection * x / uSize).r * w;
    total += w;
  }
  outColor = vec4(sum / total, 0.0, 0.0, 1.0);
}`,ut=`#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform sampler2D uGlow;
uniform vec2 uGrid;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform float uLines;
uniform float uScanline;
uniform float uCurve;
uniform float uCorners;
uniform int uMaskType;
uniform float uMask;
uniform float uBloom;
uniform float uBrightness;
uniform float uNoise;
uniform float uFlicker;
uniform float uInterference;
uniform float uVignette;
uniform float uShift;
uniform float uWarm;
uniform float uFocus;
uniform float uStatic;
uniform float uRoll;
uniform float uTear;
uniform float uGain;
uniform vec4 uMagnet;
uniform float uPurity;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 curve(vec2 uv) {
  if (uCurve <= 0.0) return uv;
  vec2 p = (uv - 0.5) * 2.0;
  float corner = uCurve / sqrt(max(uCurve * uCurve - 2.0, 0.001));
  p = uCurve * p / sqrt(max(uCurve * uCurve - dot(p, p), 0.001));
  p /= corner;
  return p * 0.5 + 0.5;
}

float lineValue(float x, float y) {
  if (x < 0.0 || x > 1.0 || y < 0.0 || y > 1.0) return 0.0;
  float cx = x * uGrid.x - 0.5;
  float c0 = floor(cx);
  int row = int(clamp(floor(y * uGrid.y), 0.0, uGrid.y - 1.0));
  float a = texelFetch(uContent, ivec2(int(clamp(c0, 0.0, uGrid.x - 1.0)), row), 0).r;
  float b = texelFetch(uContent, ivec2(int(clamp(c0 + 1.0, 0.0, uGrid.x - 1.0)), row), 0).r;
  float soft = mix(0.5, 0.14, uFocus);
  return pow(mix(a, b, smoothstep(0.5 - soft, 0.5 + soft, cx - c0)), 1.25);
}

float beam(vec2 uv) {
  float ly = uv.y * uLines - 0.5;
  float r0 = floor(ly);
  float f = ly - r0;
  float a = lineValue(uv.x, (r0 + 0.5) / uLines);
  float b = lineValue(uv.x, (r0 + 1.5) / uLines);
  float nearest = f < 0.5 ? a : b;
  float sa = mix(0.16, 0.34, sqrt(a));
  float sb = mix(0.16, 0.34, sqrt(b));
  float lit = a * exp(-0.5 * f * f / (sa * sa)) + b * exp(-0.5 * (1.0 - f) * (1.0 - f) / (sb * sb));
  return mix(nearest, lit * 1.18, uScanline * mix(0.3, 1.0, uFocus));
}

vec3 maskAt(vec2 px) {
  if (uMaskType == 0 || uMask <= 0.0) return vec3(1.0);
  float size = max(1.0, floor(uPixel + 0.5));
  vec2 q = floor(px / size);
  float low = 1.0 - uMask;
  vec3 m = vec3(low);
  float column = q.x;
  if (uMaskType == 2) column += mod(floor(q.y / 2.0), 2.0) * 1.5;
  int stripe = int(mod(floor(column), 3.0));
  if (stripe == 0) m.r = 1.0;
  else if (stripe == 1) m.g = 1.0;
  else m.b = 1.0;
  if (uMaskType == 2 && mod(q.y, 2.0) > 0.5) m *= mix(1.0, 0.72, uMask);
  if (uMaskType == 3) {
    float slot = mod(q.y + mod(floor(q.x / 3.0), 2.0) * 2.0, 4.0);
    if (slot < 1.0) m *= mix(1.0, 0.45, uMask);
  }
  return m / sqrt((1.0 + 2.0 * low) / 3.0);
}

vec3 phosphor(vec3 cov) {
  float peak = max(max(uColor.r, uColor.g), max(uColor.b, 0.001));
  vec3 weight = 1.0 - uColor / peak;
  return uColor * cov * pow(max(cov, vec3(0.0001)), 0.7 * weight);
}

void main() {
  vec2 frag = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = curve(frag);
  float shape = 1.0;
  if (uCorners > 0.0) {
    float margin = uCorners * 0.035;
    float radius = uCorners * 0.1;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    vec2 box = (0.5 - margin) * vec2(aspect, 1.0);
    vec2 q = abs(p) - box + radius;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    float aa = max(fwidth(sd), 0.0005);
    shape = (1.0 - smoothstep(-aa, aa, sd)) * mix(1.0, smoothstep(0.0, 0.06, -sd), 0.35);
    uv = (uv - 0.5) / (1.0 - 2.0 * margin) + 0.5;
  }
  float rolling = step(0.0001, abs(uRoll));
  uv.y += uRoll;
  float wrapped = fract(uv.y);
  uv.y = mix(uv.y, wrapped, rolling);
  float offset = fract(uRoll);
  float reach = smoothstep(0.0, 0.08, min(offset, 1.0 - offset));
  float blank = mix(1.0, smoothstep(0.0, 0.05, wrapped) * smoothstep(1.0, 0.95, wrapped), rolling * reach);

  float line = floor(uv.y * uLines);
  float tick = floor(uTime * 30.0);
  uv.x += uTear * (sin(uv.y * 21.0 + uTime * 37.0) * 0.6 + hash(vec2(line, tick)) - 0.5) * 0.05;
  uv.x += uInterference * 0.003 * (hash(vec2(line * 0.37, floor(uTime * 24.0))) - 0.5);

  vec2 dp = (frag - uMagnet.xy) * vec2(aspect, 1.0);
  float fall = exp(-dot(dp, dp) / max(uMagnet.w * uMagnet.w, 0.0001));
  vec2 swirl = vec2(-dp.y, dp.x) / vec2(aspect, 1.0) * fall * uMagnet.z * 0.5;
  vec3 spread = mix(vec3(0.85), vec3(1.0, 0.6, 0.2), uPurity);

  vec3 level = vec3(
    beam(uv + swirl * spread.r + vec2(uShift, 0.0)),
    beam(uv + swirl * spread.g),
    beam(uv + swirl * spread.b - vec2(uShift, 0.0))
  );

  float turn = uTime * 0.35;
  vec2 axis = vec2(cos(turn), sin(turn));
  float lobe = dot(dp, axis) / max(uMagnet.w, 0.0001);
  float side = dot(dp, vec2(-axis.y, axis.x)) / max(uMagnet.w, 0.0001);
  vec3 purity = vec3(lobe, -0.35 * lobe + 0.6 * side, -lobe);
  level *= 1.0 + uPurity * fall * uMagnet.z * 0.9 * purity;

  float glow = texture(uGlow, uv).r * uBloom;
  float hum = 1.0 - uInterference * 0.24 * smoothstep(0.2, 1.0, 0.5 + 0.5 * sin((frag.y - uTime * 0.09) * 6.2831853));
  float flick = 1.0 + uFlicker * 0.1 * (hash(vec2(floor(uTime * 60.0), 7.3)) - 0.5);
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 173.0) - 0.5;
  vec2 v = frag - 0.5;
  float vignette = mix(1.0, smoothstep(0.0, 1.0, clamp(1.0 - dot(v, v) * 2.0, 0.0, 1.0)), uVignette);
  float gain = uBrightness * hum * flick * vignette * blank * uGain * uWarm;

  float noise = hash(floor(gl_FragCoord.xy / (uPixel * 1.5)) + fract(uTime * 13.7) * 91.0);
  level = mix(level, vec3(noise * noise * 1.15), uStatic);
  level *= gain * (1.0 + grain * uNoise * 2.0);
  level *= maskAt(gl_FragCoord.xy);
  glow *= gain * shape * (1.0 + 0.6 * (1.0 - uFocus));
  level *= shape;

  vec3 color;
  float alpha;
  if (uLight < 0.5) {
    vec3 cov = clamp(level, 0.0, 1.0);
    vec3 light = phosphor(cov) + uColor * glow * 0.5 * (1.0 - cov);
    vec3 excess = max(level - 1.1, 0.0);
    light += (1.0 - light) * (1.0 - exp(-excess * 0.6));
    light = clamp(light, 0.0, 1.0);
    color = uBackground + light * (1.0 - uBackground);
    alpha = max(max(light.r, light.g), light.b);
    if (uOpaque < 0.5) color = light;
  } else {
    vec3 cov = clamp(level * 0.86, 0.0, 0.88);
    cov += clamp(glow * 0.12, 0.0, 0.2) * (1.0 - cov);
    color = mix(uBackground, uColor, cov);
    alpha = max(max(cov.r, cov.g), cov.b);
    if (uOpaque < 0.5) color = uColor * cov;
  }
  outColor = uOpaque > 0.5 ? vec4(color, 1.0) : vec4(color, alpha);
}`,p=(e,a,f)=>Math.min(f,Math.max(a,e)),H=e=>e*e*(3-2*e),at=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,C=null,xe=(e,a)=>{if(e==="transparent")return null;if(typeof document>"u"||(C||(C=document.createElement("canvas").getContext("2d")),!C))return a;C.fillStyle="#000000",C.fillStyle=e;let f=C.fillStyle;if(f.startsWith("#")){let v=parseInt(f.slice(1),16);return[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255]}let s=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(f);return s?s[4]!==void 0&&Number(s[4])===0?null:[Number(s[1])/255,Number(s[2])/255,Number(s[3])/255]:a},st=e=>{let a=Math.sin(e*12.9898+1.7)*43758.5453,f=Math.sin(e*78.233+4.1)*24634.6345,s=Math.sin(e*37.719+2.9)*17431.7731,v=Math.sin(e*91.113+.3)*31337.1337,m=y=>(y-Math.floor(y))*we;return e===0?[0,0,0,0]:[m(a),m(f),m(s),m(v)]},lt=e=>{if(e>=U)return[1,1,1];let a=H(p(e/U,0,1)),f=H(p(e/.6,0,1)),s=H(p((e-.15)/(U-.15),0,1));return[a,f,s]},ge=(e,a,f)=>{let s=e.createShader(a);return s?(e.shaderSource(s,f),e.compileShader(s),e.getShaderParameter(s,e.COMPILE_STATUS)?s:(e.deleteShader(s),null)):null},I=(e,a,f)=>{let s=ge(e,e.VERTEX_SHADER,ot),v=ge(e,e.FRAGMENT_SHADER,a);if(!s||!v)return null;let m=e.createProgram();if(!m)return null;if(e.attachShader(m,s),e.attachShader(m,v),e.bindAttribLocation(m,0,"aPosition"),e.linkProgram(m),e.deleteShader(s),e.deleteShader(v),!e.getProgramParameter(m,e.LINK_STATUS))return e.deleteProgram(m),null;let y={};return f.forEach(D=>{y[D]=e.getUniformLocation(m,D)}),{program:m,uniforms:y}},N=(e,a,f)=>{let s=e.createTexture();e.bindTexture(e.TEXTURE_2D,s),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,a,f,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let v=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,v),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,s,0),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),{texture:s,framebuffer:v,width:a,height:f}},O=(e,a)=>{a&&(e.deleteTexture(a.texture),e.deleteFramebuffer(a.framebuffer))},be=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1);function K({color:e="#c755f7",backgroundColor:a="#120f17",lightMode:f=!1,speed:s=.5,variation:v=0,waveAmplitude:m=.3,waveFrequency:y=2.5,levels:D=3,columns:Me=80,persistence:ye=.4,curvature:Q=.25,corners:Ee=0,scanlineStrength:Se=.6,scanlineFrequency:Re=200,mask:Ce="aperture",maskStrength:Ae=.3,bloom:ke=1.5,bloomRadius:Fe=1,rgbShift:Pe=.003,noise:Le=.1,flicker:_e=.15,interference:De=.2,vignette:qe=.3,brightness:Ge=1,intro:Be=!0,mouseReact:Ie=!0,mouseStrength:Ne=.5,changeOnClick:Oe=!0,dpr:Ue=2,fps:ze=60,paused:Xe=!1,className:Ve="",style:We}){let Z=(0,M.useRef)(null),Ye=(0,M.useMemo)(()=>xe(e,[.78,.33,.97])??[.78,.33,.97],[e]),He=(0,M.useMemo)(()=>xe(a,[.07,.06,.09]),[a]),$={ink:Ye,paper:He,lightMode:f,speed:s,variation:v,amplitude:Math.max(0,m)/.28,frequency:Math.max(.01,y)/2.2,levels:p(Math.round(D),2,12),columns:p(Math.round(Me),8,400),persistence:p(ye,0,.98),curve:Q>.001?1.1+.42/Q:0,corners:p(Ee,0,1),scanline:p(Se,0,1),lines:p(Re,20,1200),mask:et[Ce]??0,maskStrength:p(Ae,0,1),bloom:Math.max(0,ke),bloomRadius:Math.max(.05,Fe),rgbShift:Pe,noise:Math.max(0,Le),flicker:Math.max(0,_e),interference:Math.max(0,De),vignette:p(qe,0,1),brightness:Math.max(0,Ge),intro:Be,mouseReact:Ie,mouseStrength:Math.max(0,Ne),changeOnClick:Oe,dpr:Math.max(.5,Ue),fps:Math.max(1,ze),paused:Xe},S=(0,M.useRef)($);return S.current=$,(0,M.useEffect)(()=>{let E=Z.current;if(!E)return;let b=document.createElement("canvas");b.className=je,E.appendChild(b);let o=b.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!o){b.remove();return}let h=I(o,rt,["uGrid","uTime","uAmplitude","uFrequency","uLevels","uDecay","uReveal","uRise","uSeed","uPrevious"]),A=I(o,it,["uContent","uSize"]),w=I(o,nt,["uSource","uSize","uDirection","uSigma"]),q=I(o,ut,["uContent","uGlow","uGrid","uResolution","uPixel","uTime","uColor","uBackground","uOpaque","uLight","uLines","uScanline","uCurve","uCorners","uMaskType","uMask","uBloom","uBrightness","uNoise","uFlicker","uInterference","uVignette","uShift","uWarm","uFocus","uStatic","uRoll","uTear","uGain","uMagnet","uPurity"]);if(!h||!A||!w||!q){b.remove();return}let j=o.createVertexArray();o.bindVertexArray(j);let ee=o.createBuffer();o.bindBuffer(o.ARRAY_BUFFER,ee),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0);let t={width:1,height:1,pixel:1,grid:[0,0],cells:[null,null],glows:[null,null],flip:0,time:0,clock:0,last:0,frame:0,raf:0,visible:!1,introAt:-1,flipAt:-1,flipped:!0,channel:0,pointer:[.5,.5],magnet:[.5,.5,0,0,0],magnetGoal:0,lost:!1,quiet:0,seen:null},Ke=()=>{let r=S.current.columns,i=p(Math.round(r*tt*t.height/Math.max(t.width,1)),4,300);(r!==t.grid[0]||i!==t.grid[1])&&(t.cells.forEach(T=>O(o,T)),t.cells=[N(o,r,i),N(o,r,i)],t.grid=[r,i]);let c=Math.max(1,Math.round(t.width/4)),x=Math.max(1,Math.round(t.height/4)),l=t.glows[0];(!l||l.width!==c||l.height!==x)&&(t.glows.forEach(T=>O(o,T)),t.glows=[N(o,c,x),N(o,c,x)])},X=()=>{let n=S.current,r=Math.min(window.devicePixelRatio||1,n.dpr),i=Math.max(1,Math.round(E.clientWidth*r)),c=Math.max(1,Math.round(E.clientHeight*r));t.pixel=r,!(i===t.width&&c===t.height)&&(t.quiet=0,t.width=i,t.height=c,b.width=i,b.height=c)},k=(n,r,i)=>{o.bindFramebuffer(o.FRAMEBUFFER,n?n.framebuffer:null),o.viewport(0,0,r,i),o.drawArrays(o.TRIANGLES,0,3)},R=(n,r,i)=>{o.activeTexture(o.TEXTURE0+n),o.bindTexture(o.TEXTURE_2D,r),o.uniform1i(i,n)},Je=(n,r)=>{let i=S.current;Ke();let[c,x]=t.grid,l=st(i.variation+t.channel),T=t.introAt<0?0:t.clock-t.introAt,[F,V,W]=i.intro&&!r?lt(T):[1,1,1],G=t.cells[t.flip],g=t.cells[1-t.flip],[d,P]=t.glows;if(!G||!g||!d||!P)return;o.useProgram(h.program),o.uniform2f(h.uniforms.uGrid,c,x),o.uniform1f(h.uniforms.uTime,t.time),o.uniform1f(h.uniforms.uAmplitude,i.amplitude),o.uniform1f(h.uniforms.uFrequency,i.frequency),o.uniform1f(h.uniforms.uLevels,i.levels),o.uniform1f(h.uniforms.uDecay,r?0:i.persistence**(n*60)),o.uniform1f(h.uniforms.uReveal,F),o.uniform1f(h.uniforms.uRise,F<1?n/.22:1),o.uniform4f(h.uniforms.uSeed,l[0],l[1],l[2],l[3]),R(0,G.texture,h.uniforms.uPrevious),k(g,c,x),t.flip=1-t.flip,o.useProgram(A.program),o.uniform2f(A.uniforms.uSize,d.width,d.height),R(0,g.texture,A.uniforms.uContent),k(d,d.width,d.height);let Qe=Math.max(.6,d.height/48*i.bloomRadius);o.useProgram(w.program),o.uniform2f(w.uniforms.uSize,d.width,d.height),o.uniform1f(w.uniforms.uSigma,Qe),o.uniform2f(w.uniforms.uDirection,1,0),R(0,d.texture,w.uniforms.uSource),k(P,P.width,P.height),o.uniform2f(w.uniforms.uDirection,0,1),R(0,P.texture,w.uniforms.uSource),k(d,d.width,d.height);let le=0,fe=0,ce=0,me=1;if(t.flipAt>=0){let L=t.clock-t.flipAt;if(!t.flipped&&L>=.22&&(t.flipped=!0,t.channel+=1),L>=he)t.flipAt=-1;else{let de=L/he;le=at(de),fe=Math.sin(Math.PI*p(L/.5,0,1))*.6,ce=Math.sin(Math.PI*p(L/.55,0,1))*.75,me=1-.3*Math.sin(Math.PI*de)}}o.useProgram(q.program);let u=q.uniforms;R(0,g.texture,u.uContent),R(1,d.texture,u.uGlow),o.uniform2f(u.uGrid,c,x),o.uniform2f(u.uResolution,t.width,t.height),o.uniform1f(u.uPixel,t.pixel),o.uniform1f(u.uTime,r?0:t.clock),o.uniform3f(u.uColor,i.ink[0],i.ink[1],i.ink[2]);let Y=i.paper??[0,0,0];o.uniform3f(u.uBackground,Y[0],Y[1],Y[2]),o.uniform1f(u.uOpaque,i.paper?1:0),o.uniform1f(u.uLight,i.lightMode?1:0),o.uniform1f(u.uLines,i.lines),o.uniform1f(u.uScanline,i.scanline),o.uniform1f(u.uCurve,i.curve),o.uniform1f(u.uCorners,i.corners),o.uniform1i(u.uMaskType,i.mask),o.uniform1f(u.uMask,i.maskStrength),o.uniform1f(u.uBloom,i.bloom),o.uniform1f(u.uBrightness,i.brightness),o.uniform1f(u.uNoise,i.noise),o.uniform1f(u.uFlicker,r?0:i.flicker),o.uniform1f(u.uInterference,i.interference),o.uniform1f(u.uVignette,i.vignette),o.uniform1f(u.uShift,i.rgbShift),o.uniform1f(u.uWarm,V),o.uniform1f(u.uFocus,W),o.uniform1f(u.uStatic,ce),o.uniform1f(u.uRoll,le),o.uniform1f(u.uTear,fe),o.uniform1f(u.uGain,me),o.uniform4f(u.uMagnet,t.magnet[0],1-t.magnet[1],t.magnet[4]*i.mouseStrength*2,.24),o.uniform1f(u.uPurity,i.mask>0?1:0),k(null,t.width,t.height)},te=n=>{if(t.raf=requestAnimationFrame(te),!t.visible||document.hidden||t.lost){t.last=n;return}let r=S.current,i=1e3/r.fps;if(t.last&&n-t.last<i-1)return;let c=t.last?Math.min((n-t.last)/1e3,.1):1/60;t.last=n;let x=be();t.clock+=c,t.introAt<0&&(t.introAt=t.clock),!r.paused&&!x&&(t.time+=c*r.speed);let l=t.magnet,T=we/.3;for(let g=0;g<2;g++){let d=-T*T*(l[g]-t.pointer[g])-2*T*l[2+g];l[2+g]+=d*c,l[g]+=l[2+g]*c}let F=r.mouseReact&&!x?t.magnetGoal:0;l[4]+=(F-l[4])*(1-Math.exp(-c/.18));let V=r.paused||x,W=Math.abs(l[4]-F)>.002||l[4]>.002&&(Math.abs(l[2])+Math.abs(l[3])>5e-4||Math.abs(l[0]-t.pointer[0])>5e-4),G=t.flipAt>=0||r.intro&&!x&&t.clock-t.introAt<U||W;t.seen!==r||G||!V?t.quiet=0:t.quiet+=1,t.seen=r,!(t.quiet>90)&&(X(),Je(c,x))},oe=n=>{let r=E.getBoundingClientRect();return{x:(n.clientX-r.left)/Math.max(r.width,1),y:(n.clientY-r.top)/Math.max(r.height,1),inside:n.clientX>=r.left&&n.clientX<=r.right&&n.clientY>=r.top&&n.clientY<=r.bottom}},re=n=>{let r=oe(n);r.inside&&(t.magnetGoal===0&&t.magnet[4]<.02&&(t.magnet[0]=r.x,t.magnet[1]=r.y,t.magnet[2]=0,t.magnet[3]=0),t.pointer=[r.x,r.y]),t.magnetGoal=r.inside?1:0},ie=()=>{t.magnetGoal=0},ne=n=>{if(!(!S.current.changeOnClick||n.button!==0||n.target instanceof Element&&n.target.closest('a, button, input, textarea, select, label, [role="button"]')||!oe(n).inside)){if(be()){t.channel+=1;return}t.flipAt>=0||(t.flipAt=t.clock,t.flipped=!1)}},ue=n=>{n.preventDefault(),t.lost=!0},ae=new IntersectionObserver(n=>{t.visible=n.some(r=>r.isIntersecting)});ae.observe(E);let se=new ResizeObserver(X);return se.observe(E),X(),window.addEventListener("pointermove",re,{passive:!0}),window.addEventListener("pointerdown",ne),document.documentElement.addEventListener("pointerleave",ie),b.addEventListener("webglcontextlost",ue),t.raf=requestAnimationFrame(te),()=>{cancelAnimationFrame(t.raf),ae.disconnect(),se.disconnect(),window.removeEventListener("pointermove",re),window.removeEventListener("pointerdown",ne),document.documentElement.removeEventListener("pointerleave",ie),b.removeEventListener("webglcontextlost",ue),t.cells.forEach(n=>O(o,n)),t.glows.forEach(n=>O(o,n)),[h,A,w,q].forEach(n=>o.deleteProgram(n.program)),o.deleteBuffer(ee),o.deleteVertexArray(j),o.getExtension("WEBGL_lose_context")?.loseContext(),b.remove()}},[]),(0,Te.jsx)("div",{ref:Z,className:[$e,Ve].filter(Boolean).join(" "),style:We})}var J=_(B(),1),ft=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],z=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],xt=ft.map((e,a)=>({id:a+1,image:e,src:e,img:e,url:e,title:z[a],text:z[a],label:z[a],alt:z[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function ct({big:e}){return(0,J.jsx)(pe,{big:e,dark:!0,center:!1,zoom:1,drive:!1,children:(0,J.jsx)(K,{})})}var gt=ve(ct);export{gt as default};
