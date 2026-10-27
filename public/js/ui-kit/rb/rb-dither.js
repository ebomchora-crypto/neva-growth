import{c as B,i as We,j as G,l as be,m as Ee}from"./chunks/chunk-6IYH4WPJ.js";var b=B(We(),1),te=B(G(),1),Ge={bayer:0,bayer4:1,bayer2:2,halftone:3,lines:4,crosshatch:5,noise:6,none:7},Oe={erase:0,reveal:1,ripple:2},L=16,I=4,ee=8,Ve=1.8,Ae=1.6,qe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ye=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uScale;
uniform float uContrast;
uniform float uBrightness;
uniform int uEffect;
uniform float uRadius;
uniform float uStrength;
uniform vec3 uTrail[${L}];
uniform int uTrailCount;
uniform vec4 uRipples[${I}];
uniform int uRippleCount;
uniform float uIntro;
uniform float uReach;
out vec4 outColor;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(Pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(cnoise(p));
    p *= uWaveFrequency;
    amp *= uWaveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - uTime * uWaveSpeed;
  return fbm(p + fbm(p2));
}

void main() {
  vec2 corner = (gl_FragCoord.xy - 0.5) * uCell;
  vec2 uv = corner / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float touch = 0.0;
  for (int i = 0; i < ${L}; i++) {
    if (i >= uTrailCount) break;
    vec3 point = uTrail[i];
    float reach = uRadius * mix(0.55, 1.0, point.z);
    touch = max(touch, point.z * (1.0 - smoothstep(0.0, reach, length(uv - point.xy))));
  }

  vec2 warp = vec2(0.0);
  float ring = 0.0;
  for (int i = 0; i < ${I}; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = uv - ripple.xy;
    float dist = length(delta);
    float life = clamp(ripple.z / ${Ae.toFixed(2)}, 0.0, 1.0);
    float wave = exp(-pow((dist - ripple.z * 0.9) / 0.07, 2.0)) * (1.0 - life) * (1.0 - life) * ripple.w;
    warp += (dist > 0.0001 ? delta / dist : vec2(0.0)) * wave * 0.035;
    ring += wave;
  }

  if (uEffect == 2 && touch > 0.0) {
    vec3 head = uTrail[0];
    vec2 delta = uv - head.xy;
    float dist = length(delta);
    warp += (dist > 0.0001 ? delta / dist : vec2(0.0)) * sin(dist / max(uRadius, 0.001) * 16.0 - uTime * 7.0) * 0.04 * touch * uStrength;
  }

  float f = pattern((uv + warp) / uScale);
  if (uEffect == 0) f -= 0.5 * touch * uStrength;
  if (uEffect == 1) f += 0.5 * touch * uStrength;
  f += ring * 0.55;
  f = (f - 0.5) * uContrast + 0.5 + uBrightness;
  float show = clamp((uIntro * uReach - length(uv)) / 0.45, 0.0, 1.0);
  float v = clamp(f, 0.0, 1.0) * show * show * (3.0 - 2.0 * show);
  outColor = vec4(floor(v * 255.0) / 255.0, fract(v * 255.0), 0.0, 1.0);
}`,$e=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
uniform float uCellDevice;
uniform int uMode;
uniform float uColorNum;
uniform vec3 uWave;
uniform vec3 uBackground;
uniform vec3 uPalette[${ee}];
uniform int uPaletteCount;
uniform float uTransparent;
out vec4 outColor;

const float bayer8[64] = float[64](
  0.0 / 64.0, 48.0 / 64.0, 12.0 / 64.0, 60.0 / 64.0, 3.0 / 64.0, 51.0 / 64.0, 15.0 / 64.0, 63.0 / 64.0,
  32.0 / 64.0, 16.0 / 64.0, 44.0 / 64.0, 28.0 / 64.0, 35.0 / 64.0, 19.0 / 64.0, 47.0 / 64.0, 31.0 / 64.0,
  8.0 / 64.0, 56.0 / 64.0, 4.0 / 64.0, 52.0 / 64.0, 11.0 / 64.0, 59.0 / 64.0, 7.0 / 64.0, 55.0 / 64.0,
  40.0 / 64.0, 24.0 / 64.0, 36.0 / 64.0, 20.0 / 64.0, 43.0 / 64.0, 27.0 / 64.0, 39.0 / 64.0, 23.0 / 64.0,
  2.0 / 64.0, 50.0 / 64.0, 14.0 / 64.0, 62.0 / 64.0, 1.0 / 64.0, 49.0 / 64.0, 13.0 / 64.0, 61.0 / 64.0,
  34.0 / 64.0, 18.0 / 64.0, 46.0 / 64.0, 30.0 / 64.0, 33.0 / 64.0, 17.0 / 64.0, 45.0 / 64.0, 29.0 / 64.0,
  10.0 / 64.0, 58.0 / 64.0, 6.0 / 64.0, 54.0 / 64.0, 9.0 / 64.0, 57.0 / 64.0, 5.0 / 64.0, 53.0 / 64.0,
  42.0 / 64.0, 26.0 / 64.0, 38.0 / 64.0, 22.0 / 64.0, 41.0 / 64.0, 25.0 / 64.0, 37.0 / 64.0, 21.0 / 64.0
);

const float bayer4[16] = float[16](
  0.0 / 16.0, 8.0 / 16.0, 2.0 / 16.0, 10.0 / 16.0,
  12.0 / 16.0, 4.0 / 16.0, 14.0 / 16.0, 6.0 / 16.0,
  3.0 / 16.0, 11.0 / 16.0, 1.0 / 16.0, 9.0 / 16.0,
  15.0 / 16.0, 7.0 / 16.0, 13.0 / 16.0, 5.0 / 16.0
);

const float bayer2[4] = float[4](0.0 / 4.0, 2.0 / 4.0, 3.0 / 4.0, 1.0 / 4.0);

float threshold(vec2 cell) {
  if (uMode == 1) {
    ivec2 c = ivec2(mod(cell, 4.0));
    return bayer4[c.y * 4 + c.x];
  }
  if (uMode == 2) {
    ivec2 c = ivec2(mod(cell, 2.0));
    return bayer2[c.y * 2 + c.x];
  }
  if (uMode == 3) {
    vec2 r = vec2(cell.x + cell.y, cell.x - cell.y) * 0.70710678 / 4.0;
    return clamp(length(fract(r) - 0.5) * 1.41421356, 0.0, 0.999);
  }
  if (uMode == 4) {
    return abs(fract(cell.y / 4.0) - 0.5) * 2.0 * 0.999;
  }
  if (uMode == 5) {
    float a = abs(fract((cell.x + cell.y) / 6.0) - 0.5) * 2.0;
    float b = abs(fract((cell.x - cell.y) / 6.0) - 0.5) * 2.0;
    return min(a, b) * 0.999;
  }
  if (uMode == 6) {
    return fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715))));
  }
  if (uMode == 7) {
    return 0.25;
  }
  ivec2 c = ivec2(mod(cell, 8.0));
  return bayer8[c.y * 8 + c.x];
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCellDevice);
  vec4 sampleValue = texelFetch(uField, clamp(ivec2(cell), ivec2(0), uFieldSize - 1), 0);
  float f = sampleValue.r + sampleValue.g / 255.0;
  float t = threshold(cell) - 0.25;

  if (uPaletteCount > 1) {
    float n = float(uPaletteCount);
    float v = f + t / (n - 1.0);
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    int index = int(floor(v * (n - 1.0) + 0.5));
    outColor = vec4(toSrgb(uPalette[index]), 1.0);
    return;
  }

  float levels = max(uColorNum, 1.01) - 1.0;
  if (uTransparent > 0.5) {
    float v = f + t / levels;
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    float a = floor(v * levels + 0.5) / levels;
    outColor = vec4(toSrgb(uWave) * a, a);
    return;
  }

  float base = dot(uBackground, vec3(0.2126, 0.7152, 0.0722));
  vec3 offset = (uWave - vec3(base)) * f + t / levels;
  float luminance = dot(uBackground + offset, vec3(0.2126, 0.7152, 0.0722));
  offset -= mix(0.2, 0.0, smoothstep(0.45, 0.8, luminance));
  bool rising = dot(uWave, vec3(0.2126, 0.7152, 0.0722)) >= base;
  float lower = rising ? 0.0 : -max(uBackground.r, max(uBackground.g, uBackground.b));
  float upper = rising ? 1.0 - min(uBackground.r, min(uBackground.g, uBackground.b)) : 0.0;
  offset = floor(clamp(offset, lower, upper) * levels + 0.5) / levels;
  outColor = vec4(toSrgb(uBackground + offset), 1.0);
}`,j=(r,f,x)=>Math.min(x,Math.max(f,r)),Re=(r,f,x)=>{let h=r.createShader(f);return h?(r.shaderSource(h,x),r.compileShader(h),r.getShaderParameter(h,r.COMPILE_STATUS)?h:(r.deleteShader(h),null)):null},Te=(r,f)=>{let x=Re(r,r.VERTEX_SHADER,qe),h=Re(r,r.FRAGMENT_SHADER,f),m=r.createProgram();if(!x||!h||!m)return null;if(r.attachShader(m,x),r.attachShader(m,h),r.bindAttribLocation(m,0,"aPosition"),r.linkProgram(m),r.deleteShader(x),r.deleteShader(h),!r.getProgramParameter(m,r.LINK_STATUS))return r.deleteProgram(m),null;let U={},V=r.getProgramParameter(m,r.ACTIVE_UNIFORMS);for(let C=0;C<V;C++){let F=r.getActiveUniform(m,C);F&&(U[F.name.replace("[0]","")]=r.getUniformLocation(m,F.name))}return{program:m,uniforms:U}},He=r=>r<=.04045?r/12.92:Math.pow((r+.055)/1.055,2.4),Ke=({waveSpeed:r=.05,waveFrequency:f=3,waveAmplitude:x=.3,waveColor:h=[.5,.5,.5],backgroundColor:m=[0,0,0],colorNum:U=4,pixelSize:V=2,disableAnimation:C=!1,enableMouseInteraction:F=!0,mouseRadius:Se=1,ditherMode:Pe="bayer",palette:oe,scale:Ce=1,contrast:Fe=1,brightness:_e=0,mouseEffect:De="erase",mouseStrength:Be=1,trail:Le=.5,clickRipple:Ie=!0,intro:Ue=!0,dpr:Ne,className:ke="",style:ze})=>{let ne=(0,b.useRef)(null),ie=(0,b.useRef)(null),q=(0,b.useRef)(null),ae={waveSpeed:r,waveFrequency:f,waveAmplitude:x,waveColor:h,backgroundColor:m,colorNum:Math.max(2,U),pixelSize:Math.max(1,V),disableAnimation:C,enableMouseInteraction:F,mouseRadius:Math.max(.001,Se),mode:Ge[Pe]??0,palette:Array.isArray(oe)?oe.filter(Boolean).slice(0,ee):[],scale:Math.max(.05,Ce),contrast:Fe,brightness:_e,effect:Oe[De]??0,mouseStrength:Math.max(0,Be),trail:j(Le,0,1),clickRipple:Ie,intro:Ue,dpr:Ne},y=(0,b.useRef)(ae);return y.current=ae,(0,b.useEffect)(()=>{let R=ne.current,g=ie.current,e=g?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!R||!g||!e)return;let N=Te(e,Ye),k=Te(e,$e);if(!N||!k)return;let ce=e.createBuffer(),Y=e.createVertexArray();e.bindVertexArray(Y),e.bindBuffer(e.ARRAY_BUFFER,ce),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let _=e.createTexture();e.bindTexture(e.TEXTURE_2D,_),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let $=e.createFramebuffer(),T=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),E=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,H=new Map,K=t=>{if(Array.isArray(t))return[0,1,2].map(u=>j(Number(t[u])||0,0,1));let a=String(t);if(H.has(a))return H.get(a);let c=[0,0,0];if(T){T.clearRect(0,0,1,1),T.fillStyle="#000000",T.fillStyle=a,T.fillRect(0,0,1,1);let[u,W,o]=T.getImageData(0,0,1,1).data;c=[u,W,o].map(s=>He(s/255))}return H.set(a,c),c},n={width:1,height:1,ratio:1,cell:1,cellCss:1,cols:1,rows:1},l={x:0,y:0,inside:!1,set:!1},d=[],p=[],le=new Float32Array(L*3),ue=new Float32Array(I*4),se=new Float32Array(ee*3),i={time:0,hx:0,hy:0,presence:0,reveal:y.current.intro&&!E?0:1},A=0,M=0,z=!0,fe=()=>{let t=y.current;n.cell=Math.max(1,Math.round(t.pixelSize*n.ratio)),n.cellCss=n.cell/n.ratio,n.cols=Math.max(1,Math.ceil(g.width/n.cell)),n.rows=Math.max(1,Math.ceil(g.height/n.cell)),e.bindTexture(e.TEXTURE_2D,_),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,n.cols,n.rows,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,$),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,_,0),e.bindFramebuffer(e.FRAMEBUFFER,null)},J=(t,a)=>{let c=n.width/n.height;return[(t/n.width-.5)*c,-(a/n.height-.5)]},Q=()=>{let t=y.current;Math.max(1,Math.round(t.pixelSize*n.ratio))!==n.cell&&fe();let c=0;for(let v=0;v<d.length&&c<L;v++){let w=d[v];w.weight<=.01||(le.set([w.x,w.y,w.weight],c*3),c++)}let u=0;for(let v=p.length-1;v>=0&&u<I;v--)ue.set([p[v].x,p[v].y,p[v].age,1],u*4),u++;let W=t.intro&&!E?i.reveal*i.reveal*(3-2*i.reveal):1;e.bindVertexArray(Y),e.bindFramebuffer(e.FRAMEBUFFER,$),e.viewport(0,0,n.cols,n.rows),e.useProgram(N.program);let o=N.uniforms;e.uniform2f(o.uResolution,g.width/n.ratio,g.height/n.ratio),e.uniform1f(o.uCell,n.cellCss),e.uniform1f(o.uTime,i.time),e.uniform1f(o.uWaveSpeed,t.waveSpeed),e.uniform1f(o.uWaveFrequency,t.waveFrequency),e.uniform1f(o.uWaveAmplitude,t.waveAmplitude),e.uniform1f(o.uScale,t.scale),e.uniform1f(o.uContrast,t.contrast),e.uniform1f(o.uBrightness,t.brightness),e.uniform1i(o.uEffect,t.effect),e.uniform1f(o.uRadius,t.mouseRadius),e.uniform1f(o.uStrength,t.mouseStrength),e.uniform3fv(o.uTrail,le),e.uniform1i(o.uTrailCount,c),e.uniform4fv(o.uRipples,ue),e.uniform1i(o.uRippleCount,u),e.uniform1f(o.uIntro,W),e.uniform1f(o.uReach,.5*Math.hypot(n.width/n.height,1)+.45),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,g.width,g.height),e.useProgram(k.program);let s=k.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,_),e.uniform1i(s.uField,0),e.uniform2i(s.uFieldSize,n.cols,n.rows),e.uniform1f(s.uCellDevice,n.cell),e.uniform1i(s.uMode,t.mode),e.uniform1f(s.uColorNum,t.colorNum),e.uniform3fv(s.uWave,K(t.waveColor));let D=t.backgroundColor==="transparent";e.uniform3fv(s.uBackground,D?[0,0,0]:K(t.backgroundColor)),e.uniform1f(s.uTransparent,D?1:0),t.palette.forEach((v,w)=>se.set(K(v),w*3)),e.uniform3fv(s.uPalette,se),e.uniform1i(s.uPaletteCount,t.palette.length),e.drawArrays(e.TRIANGLES,0,3)},me=t=>{if(A=0,!z||document.hidden)return;let a=y.current,c=M?j((t-M)/1e3,5e-4,.05):1/60;M=t,!a.disableAnimation&&!E&&(i.time+=c);let u=a.enableMouseInteraction&&l.inside&&!E;if(i.presence+=((u?1:0)-i.presence)*(1-Math.exp(-c/(u?.12:.35))),l.set){let[o,s]=J(l.x,l.y),D=1-Math.exp(-c/.06),v=Math.hypot(o-i.hx,s-i.hy);i.hx+=(o-i.hx)*D,i.hy+=(s-i.hy)*D;let w=Math.exp(-c/(.08+a.trail*.7));d.forEach(Xe=>{Xe.weight*=w});let P=d[0];for(!P||Math.hypot(P.x-i.hx,P.y-i.hy)>.012||v>.012?d.unshift({x:i.hx,y:i.hy,weight:i.presence}):(P.x=i.hx,P.y=i.hy,P.weight=i.presence),a.trail<=.001&&(d.length=Math.min(d.length,1));d.length>L||d.length>1&&d[d.length-1].weight<.01;)d.pop()}for(let o=p.length-1;o>=0;o--)p[o].age+=c,p[o].age>=Ae&&p.splice(o,1);!a.intro||E?i.reveal=1:i.reveal<1&&(i.reveal=Math.min(1,i.reveal+c/Ve)),Q(),(!a.disableAnimation||i.reveal<1||p.length>0||i.presence>.002||d.some(o=>o.weight>.01))&&!E?A=requestAnimationFrame(me):M=0},S=()=>{!A&&z&&!document.hidden&&(A=requestAnimationFrame(me))},Z=()=>{let t=y.current,a=Math.max(1,R.clientWidth),c=Math.max(1,R.clientHeight),u=Math.min(t.dpr||window.devicePixelRatio||1,2);n.width=a,n.height=c,g.width=Math.max(1,Math.round(a*u)),g.height=Math.max(1,Math.round(c*u)),n.ratio=g.width/a,fe(),Q(),S()},de=t=>{let a=R.getBoundingClientRect();if(l.x=t.clientX-a.left,l.y=t.clientY-a.top,l.inside=l.x>=0&&l.y>=0&&l.x<=a.width&&l.y<=a.height,l.inside&&!l.set){let[c,u]=J(l.x,l.y);i.hx=c,i.hy=u,l.set=!0}},ve=t=>{de(t),S()},he=t=>{let a=y.current;if(de(t),!l.inside||!a.clickRipple||E)return;let[c,u]=J(l.x,l.y);p.push({x:c,y:u,age:0}),p.length>I&&p.shift(),S()},X=t=>{t.pointerType!=="mouse"&&(l.inside=!1)},pe=()=>{l.inside=!1},ge=()=>{M=0,S()},xe=new ResizeObserver(Z);xe.observe(R);let ye=new IntersectionObserver(t=>{z=t.some(a=>a.isIntersecting),z&&(M=0,S())});ye.observe(R),window.addEventListener("pointermove",ve,{passive:!0}),window.addEventListener("pointerdown",he,{passive:!0}),window.addEventListener("pointerup",X,{passive:!0}),window.addEventListener("pointercancel",X,{passive:!0}),document.documentElement.addEventListener("pointerleave",pe),document.addEventListener("visibilitychange",ge),Z();let we=y.current.dpr;return q.current=()=>{let t=y.current;if(t.dpr!==we){we=t.dpr,Z();return}A||Q(),S()},()=>{cancelAnimationFrame(A),q.current=null,xe.disconnect(),ye.disconnect(),window.removeEventListener("pointermove",ve),window.removeEventListener("pointerdown",he),window.removeEventListener("pointerup",X),window.removeEventListener("pointercancel",X),document.documentElement.removeEventListener("pointerleave",pe),document.removeEventListener("visibilitychange",ge),e.deleteProgram(N.program),e.deleteProgram(k.program),e.deleteBuffer(ce),e.deleteVertexArray(Y),e.deleteTexture(_),e.deleteFramebuffer($),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,b.useEffect)(()=>{q.current?.()}),(0,te.jsx)("div",{ref:ne,className:["relative h-full w-full overflow-hidden",ke].filter(Boolean).join(" "),style:ze,children:(0,te.jsx)("canvas",{ref:ie,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Me=Ke;var re=B(G(),1),Je=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],O=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ot=Je.map((r,f)=>({id:f+1,image:r,src:r,img:r,url:r,title:O[f],text:O[f],label:O[f],alt:O[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Qe({big:r}){return(0,re.jsx)(Ee,{big:r,dark:!0,center:!1,zoom:1,drive:!1,children:(0,re.jsx)(Me,{})})}var nt=be(Qe);export{nt as default};
