import{c as H,i as mt,j as ee,l as Ue,m as Oe}from"./chunks/chunk-6IYH4WPJ.js";var C=H(mt(),1),pe=H(ee(),1),te=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,He=`
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uViewHeight;
uniform float uFocal;
uniform float uDistance;
uniform float uTilt;
`,ht=`#version 300 es
precision highp float;
${He}
uniform float uMode;
uniform float uSweep;
uniform float uSwept;
uniform float uDirection;
uniform float uCycle;
uniform float uTrail;
uniform float uRings;
uniform float uSpokes;
uniform float uTicks;
uniform float uGrid;
uniform float uLine;
uniform float uClutter;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uHeat;
uniform float uIntro;
uniform float uRange;
uniform float uPixel;
out vec4 outColor;

const float TAU = 6.28318531;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float stroke(float distance, float width) {
  float w = max(width, 1.0) * 0.5;
  return clamp(w + 0.5 - distance, 0.0, 1.0) * min(width, 1.0);
}

void main() {
  vec2 s = (gl_FragCoord.xy - uCenter) / uViewHeight;
  float ct = cos(uTilt);
  float st = sin(uTilt);
  vec3 forward = vec3(0.0, st, -ct);
  vec3 up = vec3(0.0, ct, st);
  vec3 dir = forward * uFocal + vec3(s.x, 0.0, 0.0) + up * s.y;
  vec3 eye = vec3(0.0, -uDistance * st, uDistance * ct);
  float hit = -eye.z / min(dir.z, -0.00001);
  vec2 p = eye.xy + dir.xy * hit;
  float r = length(p);
  vec2 dpdx = dFdx(p);
  vec2 dpdy = dFdy(p);
  if (dir.z > -0.0001 || r > 1.3) {
    outColor = vec4(0.0);
    return;
  }
  vec2 radial = p / max(r, 0.00001);
  vec2 tangent = vec2(radial.y, -radial.x);
  float pxR = max(length(vec2(dot(radial, dpdx), dot(radial, dpdy))), 0.000001);
  float pxT = max(length(vec2(dot(tangent, dpdx), dot(tangent, dpdy))), 0.000001);
  float bearing = atan(p.x, p.y);
  float turn = fract(bearing / TAU + 1.0);
  float inside = 1.0 - smoothstep(1.0 - pxR, 1.0 + pxR, r);

  float ringCoord = r * uRings;
  float ringIndex = clamp(floor(ringCoord + 0.5), 1.0, max(uRings - 1.0, 1.0));
  float rings = stroke(abs(ringCoord - ringIndex) / uRings / pxR, uLine) * step(ringIndex, uRings - 0.5);
  float arc = clamp(uIntro * (uRings + 3.0) - ringIndex, 0.0, 1.0) * 1.02;
  rings *= 1.0 - smoothstep(arc - 0.01, arc, turn);
  float outerArc = clamp(uIntro * (uRings + 3.0) - uRings, 0.0, 1.0) * 1.02;
  float outer = stroke(abs(r - 1.0) / pxR, uLine * 1.15) * (1.0 - smoothstep(outerArc - 0.01, outerArc, turn));

  float tickCoord = turn * 180.0;
  float tickIndex = floor(tickCoord + 0.5);
  float major = 1.0 - step(0.5, mod(tickIndex, 15.0));
  float middle = 1.0 - step(0.5, mod(tickIndex, 5.0));
  float tickLength = mix(mix(0.016, 0.03, middle), 0.05, major);
  float tickRadial = clamp((r - 1.0) / pxR + 0.5, 0.0, 1.0) * clamp((1.0 + tickLength - r) / pxR + 0.5, 0.0, 1.0);
  float spacing = TAU / 180.0 * r / pxT;
  float ticks = stroke(abs(tickCoord - tickIndex) / 180.0 * TAU * r / pxT, uLine) * tickRadial;
  ticks *= mix(mix(0.42 * smoothstep(2.5, 5.0, spacing), 0.7, middle), 1.0, major) * uTicks;
  ticks *= smoothstep(0.55, 0.9, uIntro);

  float spokeTotal = max(uSpokes, 1.0);
  float spokeCoord = turn * spokeTotal;
  float spokeIndex = floor(spokeCoord + 0.5);
  float spokes = stroke(abs(spokeCoord - spokeIndex) / spokeTotal * TAU * r / pxT, uLine) * smoothstep(0.05, 0.16, r);
  spokes *= inside * step(0.5, uSpokes);
  float cardinalCoord = turn * 4.0;
  float cardinal = stroke(abs(cardinalCoord - floor(cardinalCoord + 0.5)) / 4.0 * TAU * r / pxT, uLine) * smoothstep(0.02, 0.08, r) * inside;
  float hub = stroke(abs(r - 0.022) / pxR, uLine);
  float spokesIn = smoothstep(0.35, 0.8, uIntro);
  float axisDistance = abs(cardinalCoord - floor(cardinalCoord + 0.5)) / 4.0 * TAU * r / pxT;
  float rangeCoord = r * uRings * 5.0;
  float rangeMark = stroke(abs(rangeCoord - floor(rangeCoord + 0.5)) / (uRings * 5.0) / pxR, uLine);
  rangeMark *= 1.0 - smoothstep(3.0 * uPixel - 0.5, 3.0 * uPixel + 0.5, axisDistance);
  rangeMark *= smoothstep(0.06, 0.12, r) * inside;
  float bezel = stroke(abs(r - 1.065) / pxR, uLine) * uTicks * smoothstep(0.6, 0.95, uIntro);

  float grid = rings * 0.12 + outer * 0.24 + ticks * 0.22 + bezel * 0.08;
  grid += (spokes * 0.05 + cardinal * 0.08 + hub * 0.22 + rangeMark * 0.16) * spokesIn;
  grid *= uGrid;

  float behind;
  float edge;
  float trail;
  float lastPass;
  if (uMode < 0.5) {
    float ahead = fract((bearing - uSweep) / TAU + 0.5) - 0.5;
    behind = fract(uDirection * (uSweep - bearing) / TAU) * TAU;
    edge = stroke(abs(ahead) * TAU * r / pxT, uLine * 1.4) * smoothstep(0.0, 0.04, r) * inside;
    trail = exp(-behind / uTrail) * (1.0 - smoothstep(uSwept - 0.15, uSwept, behind));
    lastPass = floor(uCycle - behind / TAU);
  } else {
    behind = uSweep - r;
    edge = stroke(abs(behind) / pxR, uLine * 1.4) * inside;
    trail = behind >= 0.0 ? exp(-behind / uTrail) : 0.0;
    lastPass = behind >= 0.0 ? uCycle : uCycle - 1.0;
  }
  float sweepIn = smoothstep(0.45, 1.0, uIntro);
  trail *= inside * sweepIn;
  edge *= sweepIn;
  float glowTrail = pow(trail, 0.45);

  float returns = 0.0;
  if (uClutter > 0.0 && trail > 0.004) {
    float radialBin = floor(r * 120.0);
    float count = max(8.0, floor(radialBin * 5.0));
    float angularBin = floor(turn * count);
    vec2 drift = vec2(lastPass * 0.173, lastPass * 0.291);
    float weather = noise(p * 3.2 + drift) * 0.65 + noise(p * 7.1 - drift) * 0.35;
    float cluster = smoothstep(0.5, 0.78, weather);
    float density = uClutter * (0.02 + 0.35 * cluster) * (1.0 - smoothstep(0.55, 1.0, r));
    vec2 binSeed = vec2(radialBin, angularBin) + lastPass * 17.13;
    float speck = step(1.0 - density, hash(binSeed));
    vec2 inBin = vec2(fract(r * 120.0), fract(turn * count)) - 0.5;
    float shape = 1.0 - smoothstep(0.18, 0.5, length(inBin));
    speck *= shape * (0.45 + 0.55 * hash(binSeed + 7.7));
    returns = (speck * 1.1 + cluster * 0.16 * uClutter) * trail;
  }

  float heat = uHeat.z * exp(-dot(p - uHeat.xy, p - uHeat.xy) / 0.035);
  float lit = clamp(glowTrail * 0.9 + heat * 0.55, 0.0, 1.0);
  vec3 lineColor = mix(vec3(1.0), uAccent, lit);
  vec3 light = lineColor * grid * (1.0 + glowTrail * 3.0 + heat * 2.4);
  float fill = trail * 0.11 * (0.35 + 0.65 * smoothstep(0.0, 0.6, r));
  light += uAccent * (fill + returns * 0.55);
  light += mix(uAccent, vec3(1.0), 0.3) * edge * 1.3;
  outColor = vec4(light * uRange, 1.0);
}`,pt=`#version 300 es
in vec2 aCorner;
in vec4 aSprite;
in vec4 aStyle;
${He}
out vec2 vLocal;
out vec4 vStyle;
out float vKind;
void main() {
  float ct = cos(uTilt);
  float st = sin(uTilt);
  float c = cos(aStyle.w);
  float s = sin(aStyle.w);
  vec2 local = aCorner * 1.25;
  vec2 offset = vec2(c * local.x - s * local.y, s * local.x + c * local.y) * aSprite.z;
  vec3 world = vec3(aSprite.xy + offset, 0.0);
  vec3 eye = vec3(0.0, -uDistance * st, uDistance * ct);
  vec3 rel = world - eye;
  float xc = rel.x;
  float yc = dot(rel, vec3(0.0, ct, st));
  float zc = max(dot(rel, vec3(0.0, st, -ct)), 0.0001);
  vec2 center = uCenter / uResolution * 2.0 - 1.0;
  gl_Position = vec4(center * zc + 2.0 * uFocal * uViewHeight * vec2(xc, yc) / uResolution, 0.0, zc);
  vLocal = local;
  vStyle = aStyle;
  vKind = aSprite.w;
}`,gt=`#version 300 es
precision highp float;
in vec2 vLocal;
in vec4 vStyle;
in float vKind;
uniform vec3 uAccent;
uniform float uRange;
out vec4 outColor;
void main() {
  float shape;
  vec3 tint;
  if (vKind < 0.5) {
    float d = length(vLocal * vec2(0.62, 1.0));
    float aa = max(fwidth(d), 0.0001);
    shape = clamp((1.0 - d) / aa + 0.5, 0.0, 1.0);
    shape *= 0.5 + 0.5 * exp(-d * d * 2.5);
    tint = mix(uAccent, vec3(1.0), vStyle.y * 0.45 * exp(-d * d * 5.0));
  } else {
    float d = length(vLocal);
    float aa = max(fwidth(d), 0.0001);
    shape = clamp(1.0 - abs(d - 1.0) / (aa * 0.75), 0.0, 1.0);
    tint = mix(uAccent, vec3(1.0), 0.2);
  }
  outColor = vec4(tint * shape * vStyle.x * uRange, 1.0);
}`,xt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 sum = texture(uSource, uv) * 4.0;
  sum += texture(uSource, uv - uTexel);
  sum += texture(uSource, uv + uTexel);
  sum += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  sum += texture(uSource, uv - vec2(uTexel.x, -uTexel.y));
  outColor = sum / 8.0;
}`,vt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec2 h = uTexel * 0.5;
  vec4 sum = texture(uSource, uv + vec2(-h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(0.0, -h.y * 2.0));
  sum += texture(uSource, uv + vec2(0.0, h.y * 2.0));
  sum += texture(uSource, uv + vec2(-h.x, h.y)) * 2.0;
  sum += texture(uSource, uv + h) * 2.0;
  sum += texture(uSource, uv + vec2(h.x, -h.y)) * 2.0;
  sum += texture(uSource, uv - h) * 2.0;
  outColor = sum / 12.0 + texture(uBase, uv);
}`,bt=`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform float uExposure;
uniform float uGlow;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
uniform float uTime;
uniform float uLightMode;
uniform vec4 uBackground;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 hdr = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb * uExposure;
  vec3 bloom = texture(uBloom, uv).rgb * uExposure * uGlow * 0.5;
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  mask *= uOpacity;
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  vec4 color;
  if (uLightMode > 0.5) {
    float bloomPeak = max(bloom.r, max(bloom.g, bloom.b));
    float bloomLow = min(bloom.r, min(bloom.g, bloom.b));
    vec3 total = hdr + bloom * 0.3 * (bloomPeak - bloomLow) / max(bloomPeak, 0.0001);
    float peak = max(total.r, max(total.g, total.b));
    vec3 hue = total / max(peak, 0.0001);
    float tone = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    float depth = mix(0.36, 0.09, smoothstep(0.06, 0.7, peak));
    vec3 ink = pow(clamp(hue * min(1.0, depth / max(tone, 0.001)), 0.0, 1.0), vec3(1.0 / 2.2));
    float alpha = clamp((1.0 - exp(-peak * 2.6)) * (1.0 + grain), 0.0, 1.0) * mask;
    color = vec4(ink * alpha, alpha);
  } else {
    vec3 mapped = 1.0 - exp(-(hdr + bloom));
    float level = max(mapped.r, max(mapped.g, mapped.b));
    mapped = clamp(mapped + grain * level, 0.0, 1.0) * mask;
    color = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
  }
  vec4 back = vec4(uBackground.rgb * uBackground.a, uBackground.a);
  outColor = color + back * (1.0 - color.a);
}`,k=Math.PI*2,Ve=16,Xe=4,Ne=2,Tt=2.2,Ge=2560,X=5,w=(a,m,d)=>Math.min(d,Math.max(m,a)),yt=a=>{let m=a>>>0;return()=>{m=m+1831565813>>>0;let d=m;return d=Math.imul(d^d>>>15,d|1),d^=d+Math.imul(d^d>>>7,d|61),((d^d>>>14)>>>0)/4294967296}},ze=(a,m,d)=>{let y=a.createShader(m);return y?(a.shaderSource(y,d),a.compileShader(y),a.getShaderParameter(y,a.COMPILE_STATUS)?y:(a.deleteShader(y),null)):null},W=(a,m,d,y)=>{let F=ze(a,a.VERTEX_SHADER,m),N=ze(a,a.FRAGMENT_SHADER,d),R=a.createProgram();if(!F||!N||!R)return null;if(a.attachShader(R,F),a.attachShader(R,N),y.forEach((P,_)=>a.bindAttribLocation(R,_,P)),a.linkProgram(R),a.deleteShader(F),a.deleteShader(N),!a.getProgramParameter(R,a.LINK_STATUS))return a.deleteProgram(R),null;let j={},re=a.getProgramParameter(R,a.ACTIVE_UNIFORMS);for(let P=0;P<re;P++){let _=a.getActiveUniform(R,P);_&&(j[_.name]=a.getUniformLocation(R,_.name))}return{program:R,uniforms:j}},Ye=(a,m)=>{let d=a()*k,y=m?.94:.2+a()*.68,F=m?d+Math.PI+(a()-.5)*1.6:a()*k;return{x:Math.sin(d)*y,y:Math.cos(d)*y,heading:F,velocity:.012+a()*.03,turn:(a()-.5)*.18}};function ge({color:a="#3ef09a",backgroundColor:m="transparent",mode:d="sweep",speed:y=1,trail:F=.35,scale:N=.9,ringCount:R=6,spokeCount:j=12,ticks:re=!0,targets:P=6,clutter:_=.35,glow:We=1,brightness:je=1,gridOpacity:qe=1,lineWidth:Ke=1,tilt:$e=0,centerX:Qe=.5,centerY:Je=.5,mouseInteraction:Ze=!0,intro:et=!0,grain:tt=.03,fade:ot=0,opacity:rt=1,lightMode:at=!1,paused:nt=!1,dpr:it,className:st="",...ut}){let ve=(0,C.useRef)(null),be=(0,C.useRef)(null),ae=(0,C.useRef)(null),Te={color:String(a),backgroundColor:String(m),mode:d==="pulse"?"pulse":"sweep",speed:y,trail:w(F,.02,1),scale:Math.max(.05,N),ringCount:Math.round(w(R,1,24)),spokeCount:Math.round(w(j,0,72)),ticks:re,targets:Math.round(w(P,0,Ve)),clutter:w(_,0,1),glow:Math.max(0,We),brightness:Math.max(0,je),gridOpacity:w(qe,0,2),lineWidth:w(Ke,.25,4),tilt:w($e,0,80)*Math.PI/180,centerX:Qe,centerY:Je,mouseInteraction:Ze,intro:et,grain:Math.max(0,tt),fade:w(ot,0,1),opacity:w(rt,0,1),lightMode:at,paused:nt,dpr:it},M=(0,C.useRef)(Te);return M.current=Te,(0,C.useEffect)(()=>{let L=ve.current,x=be.current,e=x?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!L||!x||!e)return;let G=!!e.getExtension("EXT_color_buffer_float"),ne=G?1:.25,b={scene:W(e,te,ht,["aPosition"]),sprite:W(e,pt,gt,["aCorner","aSprite","aStyle"]),down:W(e,te,xt,["aPosition"]),up:W(e,te,vt,["aPosition"]),composite:W(e,te,bt,["aPosition"])};if(Object.values(b).some(t=>!t))return;let ye=e.createBuffer(),q=e.createVertexArray();e.bindVertexArray(q),e.bindBuffer(e.ARRAY_BUFFER,ye),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Re=e.createBuffer(),ie=e.createBuffer(),se=e.createVertexArray();e.bindVertexArray(se),e.bindBuffer(e.ARRAY_BUFFER,Re),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,ie);for(let t=1;t<=2;t++)e.enableVertexAttribArray(t),e.vertexAttribPointer(t,4,e.FLOAT,!1,32,(t-1)*16),e.vertexAttribDivisor(t,1);e.bindVertexArray(null);let ue=()=>({texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0}),ce=(t,r,n)=>{t.width===r&&t.height===n||(t.width=r,t.height=n,e.bindTexture(e.TEXTURE_2D,t.texture),G?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,r,n,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,r,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},z=ue(),B=Array.from({length:X+1},ue),K=Array.from({length:X},ue),D=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),$=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,le=new Map,we=t=>{if(le.has(t))return le.get(t);let r=[1,1,1,1];if(D){D.clearRect(0,0,1,1),D.fillStyle="rgba(0, 0, 0, 0)",D.fillStyle=t,D.fillRect(0,0,1,1);let[n,c,o,l]=D.getImageData(0,0,1,1).data;r=l?[n/l,c/l,o/l,l/255]:[0,0,0,0]}return le.set(t,r),r},ct=t=>we(t).slice(0,3).map(r=>Math.pow(r,2.2)),Ae=yt(7919),Ee=Array.from({length:Ve},()=>({...Ye(Ae,!1),echoes:[]})),S={x:0,y:0,inside:!1,echoes:[]},A={x:0,y:0,inside:!1},T={width:1,height:1,ratio:1},s={time:0,sweep:0,swept:0,cycle:0,intro:M.current.intro&&!$?0:1,heat:0,heatVelocity:0,heatX:0,heatY:0},fe=new Float32Array(8*160),I=0,U=0,Q=!0,Se=t=>t.scale*Math.min(T.width,T.height)/T.height,Me=t=>({distance:2*Ne/Se(t),focal:Ne,tilt:t.tilt}),lt=(t,r,n)=>{let{distance:c,focal:o,tilt:l}=Me(t),h=(r-t.centerX*T.width)/T.height,p=(t.centerY*T.height-n)/T.height,f=Math.cos(l),g=Math.sin(l),i=h,u=o*g+p*f,v=-o*f+p*g;if(v>-1e-4)return null;let E=-c*g,Z=-(c*f)/v;return[i*Z,E+u*Z]},ke=t=>t.mode==="pulse"?3.2:6,ft=(t,r)=>{let n=r*Math.abs(t.speed),c=t.mode==="pulse",o=c?1.15:k,l=n/ke(t)*o,h=t.speed<0&&!c?-1:1,p=s.sweep;s.swept+=l;let f=i=>{i.echoes.unshift({x:i.x,y:i.y,time:s.time}),i.echoes.length>Xe&&(i.echoes.length=Xe)},g=(i,u)=>{if(c){let V=Math.hypot(i,u),Z=p,he=p+l;return V>Z&&V<=he||he>o&&V<=he-o}let v=Math.atan2(i,u),E=(h*(v-p)%k+k)%k;return E>0&&E<=l};for(let i=0;i<t.targets;i++){let u=Ee[i];u.heading+=u.turn*n,u.x+=Math.sin(u.heading)*u.velocity*n,u.y+=Math.cos(u.heading)*u.velocity*n,Math.hypot(u.x,u.y)>.96&&Object.assign(u,Ye(Ae,!0)),g(u.x,u.y)&&f(u)}for(S.inside&&g(S.x,S.y)&&f(S),s.sweep+=h*l;s.sweep>=o;)s.sweep-=o,s.cycle+=1;for(;s.sweep<0;)s.sweep+=o,s.cycle+=1},dt=t=>{let r=2/(Se(t)*T.height),n=ke(t)/Math.max(Math.abs(t.speed),.05)*1.1,c=0,o=(h,p,f,g,i,u,v)=>{c*8+8>fe.length||(fe.set([h,p,f,g,i,u,0,v],c*8),c++)},l=(h,p)=>{h.echoes.forEach((f,g)=>{let i=s.time-f.time,u=Math.exp(-i/n)*(g===0?1:.8);if(u<.01)return;let v=-Math.atan2(f.x,f.y);if(o(f.x,f.y,r*(g===0?3.4:2.4),0,u*p*2.2,g===0?1:.3,v),g===0&&i<1.4){let E=i/1.4,V=1-Math.pow(1-E,3);o(f.x,f.y,r*(4+26*V),1,(1-E)*(1-E)*p*1.4,0,0)}})};for(let h=0;h<t.targets;h++)l(Ee[h],1);return l(S,1.3),c},J=(t,r,n,c)=>{e.bindFramebuffer(e.FRAMEBUFFER,r?r.framebuffer:null),e.viewport(0,0,n,c),e.useProgram(t.program),e.drawArrays(e.TRIANGLES,0,3)},Y=(t,r,n,c)=>{e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,c),e.uniform1i(t.uniforms[r],n)},Ce=(t,r)=>{let n=t.uniforms,{distance:c,focal:o,tilt:l}=Me(r);e.uniform2f(n.uResolution,x.width,x.height),e.uniform2f(n.uCenter,r.centerX*x.width,(1-r.centerY)*x.height),e.uniform1f(n.uViewHeight,x.height),e.uniform1f(n.uFocal,o),e.uniform1f(n.uDistance,c),e.uniform1f(n.uTilt,l)},de=()=>{let t=M.current,r=ct(t.color),n=s.intro;ce(z,x.width,x.height);let c=b.scene,o=c.uniforms;e.useProgram(c.program),Ce(c,t),e.uniform1f(o.uMode,t.mode==="pulse"?1:0),e.uniform1f(o.uSweep,s.sweep),e.uniform1f(o.uSwept,Math.min(s.swept,k+1)),e.uniform1f(o.uDirection,t.speed<0&&t.mode!=="pulse"?-1:1),e.uniform1f(o.uCycle,s.cycle),e.uniform1f(o.uTrail,t.mode==="pulse"?t.trail*.22:t.trail*k*.5),e.uniform1f(o.uRings,t.ringCount),e.uniform1f(o.uSpokes,t.spokeCount),e.uniform1f(o.uTicks,t.ticks?1:0),e.uniform1f(o.uGrid,t.gridOpacity),e.uniform1f(o.uLine,t.lineWidth*T.ratio),e.uniform1f(o.uClutter,t.clutter*(t.lightMode?.6:1)),e.uniform1f(o.uTime,s.time),e.uniform3fv(o.uAccent,r),e.uniform3f(o.uHeat,s.heatX,s.heatY,s.heat),e.uniform1f(o.uIntro,n),e.uniform1f(o.uRange,ne),e.uniform1f(o.uPixel,T.ratio),e.bindVertexArray(q),J(c,z,x.width,x.height);let l=dt(t);if(l>0){let i=b.sprite;e.useProgram(i.program),Ce(i,t),e.uniform3fv(i.uniforms.uAccent,r),e.uniform1f(i.uniforms.uRange,ne*Math.min(1,n*2)),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE),e.bindVertexArray(se),e.bindBuffer(e.ARRAY_BUFFER,ie),e.bufferData(e.ARRAY_BUFFER,fe.subarray(0,l*8),e.DYNAMIC_DRAW),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,l),e.disable(e.BLEND)}e.bindVertexArray(q);let h=z;for(let i=0;G&&i<=X;i++){let u=B[i],v=i===0?Math.round(T.width/2):h.width>>1,E=i===0?Math.round(T.height/2):h.height>>1;ce(u,Math.max(1,v),Math.max(1,E)),e.useProgram(b.down.program),e.uniform2f(b.down.uniforms.uTexel,1/h.width,1/h.height),e.uniform2f(b.down.uniforms.uTarget,u.width,u.height),Y(b.down,"uSource",0,h.texture),J(b.down,u,u.width,u.height),h=u}for(let i=X-1;G&&i>=0;i--){let u=i===X-1?B[X]:K[i+1],v=K[i];ce(v,B[i].width,B[i].height),e.useProgram(b.up.program),e.uniform2f(b.up.uniforms.uTexel,1/u.width,1/u.height),e.uniform2f(b.up.uniforms.uTarget,v.width,v.height),Y(b.up,"uSource",0,u.texture),Y(b.up,"uBase",1,B[i].texture),J(b.up,v,v.width,v.height)}let p=b.composite,f=p.uniforms;e.useProgram(p.program),e.uniform2f(f.uResolution,x.width,x.height),e.uniform1f(f.uExposure,1.5*t.brightness/ne),e.uniform1f(f.uGlow,G?t.glow:0),e.uniform1f(f.uGrain,t.grain),e.uniform1f(f.uFade,t.fade),e.uniform1f(f.uOpacity,t.opacity),e.uniform1f(f.uTime,s.time%1e3),e.uniform1f(f.uLightMode,t.lightMode?1:0);let g=we(t.backgroundColor);e.uniform4f(f.uBackground,g[0],g[1],g[2],g[3]),Y(p,"uScene",0,z.texture),Y(p,"uBloom",1,K[0].texture),J(p,null,x.width,x.height)},Fe=t=>{if(I=0,!Q||document.hidden)return;let r=M.current,n=U?Math.min(.05,(t-U)/1e3):1/60;U=t;let c=!r.paused&&!$;!r.intro||$?s.intro=1:s.intro<1&&(s.intro=Math.min(1,s.intro+n/Tt));let o=r.mouseInteraction&&A.inside&&!$?lt(r,A.x,A.y):null;S.inside=!!o&&Math.hypot(o[0],o[1])<.98,o&&(S.x=o[0],S.y=o[1],s.heatX+=(o[0]-s.heatX)*(1-Math.exp(-n*10)),s.heatY+=(o[1]-s.heatY)*(1-Math.exp(-n*10)));let l=S.inside?1:0;if(s.heatVelocity+=(120*(l-s.heat)-19*s.heatVelocity)*n,s.heat=w(s.heat+s.heatVelocity*n,0,1.2),c){s.time+=n;let p=.25+.75*w((s.intro-.35)/.65,0,1);ft(r,n*p)}de();let h=s.intro<1||s.heat>.001||Math.abs(s.heatVelocity)>.001;c||h?I=requestAnimationFrame(Fe):U=0},O=()=>{!I&&Q&&!document.hidden&&(I=requestAnimationFrame(Fe))},me=()=>{let t=M.current,r=Math.max(1,L.clientWidth),n=Math.max(1,L.clientHeight),c=Math.min(t.dpr||window.devicePixelRatio||1,2),o=Math.max(r,n)*c,l=o>Ge?c*Ge/o:c;T.width=r,T.height=n,T.ratio=l,x.width=Math.max(1,Math.round(r*l)),x.height=Math.max(1,Math.round(n*l)),I||de(),O()},Pe=t=>{let r=L.getBoundingClientRect();A.x=t.clientX-r.left,A.y=t.clientY-r.top,A.inside=A.x>=0&&A.y>=0&&A.x<=r.width&&A.y<=r.height,O()},_e=()=>{A.inside=!1,O()},Ie=()=>{U=0,O()},Le=new ResizeObserver(me);Le.observe(L);let Be=new IntersectionObserver(t=>{Q=t.some(r=>r.isIntersecting),Q&&(U=0,O())});Be.observe(L),window.addEventListener("pointermove",Pe,{passive:!0}),document.documentElement.addEventListener("pointerleave",_e),document.addEventListener("visibilitychange",Ie),me();let De=M.current.dpr;return ae.current=()=>{if(M.current.dpr!==De){De=M.current.dpr,me();return}I||de(),O()},()=>{cancelAnimationFrame(I),ae.current=null,Le.disconnect(),Be.disconnect(),window.removeEventListener("pointermove",Pe),document.documentElement.removeEventListener("pointerleave",_e),document.removeEventListener("visibilitychange",Ie);for(let t of[z,...B,...K])e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer);for(let t of Object.values(b))e.deleteProgram(t.program);e.deleteBuffer(ye),e.deleteBuffer(Re),e.deleteBuffer(ie),e.deleteVertexArray(q),e.deleteVertexArray(se),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,C.useEffect)(()=>{ae.current?.()}),(0,pe.jsx)("div",{ref:ve,className:["relative h-full w-full overflow-hidden",st].filter(Boolean).join(" "),...ut,children:(0,pe.jsx)("canvas",{ref:be,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})}var xe=H(ee(),1),Rt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],oe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ct=Rt.map((a,m)=>({id:m+1,image:a,src:a,img:a,url:a,title:oe[m],text:oe[m],label:oe[m],alt:oe[m],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][m],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function wt({big:a}){return(0,xe.jsx)(Oe,{big:a,dark:!0,center:!1,zoom:1,drive:!1,children:(0,xe.jsx)(ge,{})})}var Ft=Ue(wt);export{Ft as default};
