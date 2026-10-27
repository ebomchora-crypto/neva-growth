import{c as N,i as st,j as Y,l as Le,m as De}from"./chunks/chunk-6IYH4WPJ.js";var S=N(st(),1),me=N(Y(),1),Ie=8,ce=4,se=24,Ge=1.2,Pe=.7,Oe=.015,lt=2.4,J=60,z=100,ut=16,ft=.78,ke=["#1e3fd8","#f6f8ff","#a5d8ff","#38bdf8"],Xe=" =+xX0S8#@",Ne='"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',mt={horizon:0,pinch:1,rise:2,eclipse:3},dt={none:0,wave:1,burst:2},ht=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,qe=`
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
`,pt=`#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uTime;
uniform int uShape;
uniform vec3 uRamp[8];
uniform int uCount;
uniform float uScale;
uniform float uSoftness;
uniform float uFlow;
uniform vec2 uSeed;
uniform vec4 uTrail[24];
uniform float uRadius;
uniform vec4 uClicks[4];
uniform int uClickEffect;
uniform float uIntro;
uniform float uFrame;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outAux;
${qe}
vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 horizon(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 1.0);
  float x = p.x / span;
  float arch = -0.17 - 0.2 * x * x + 0.02 * sin(time * 0.6);
  float soft = mix(0.05, 0.22, uSoftness);
  float edge = p.y - arch;
  float rim = 0.38 * smoothstep(-soft, 0.42, edge);
  vec2 sun = vec2(0.08 * sin(time * 0.31) * span, 0.58);
  float spread = length((p - sun) / vec2(0.95 * span, 0.75));
  float sky = mix(0.55, 1.0, smoothstep(0.2, 0.95, spread));
  order = clamp(edge * 1.3, 0.0, 1.0);
  return vec3(rim, sky, smoothstep(0.18, 0.62, edge));
}

vec3 pinch(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 0.75);
  float x = p.x / span;
  float sway = 0.02 * sin(x * 1.7 + time * 0.55);
  float breathe = 1.0 + 0.06 * sin(time * 0.8);
  float width = (0.13 + 0.22 * x * x) * breathe * mix(0.85, 1.2, uSoftness);
  float y = abs(p.y - sway) / width;
  float t = exp(-pow(y, 2.2)) * (0.42 + 0.58 * exp(-x * x * 1.8));
  order = clamp(abs(p.y - sway) * 2.4 + abs(x) * 0.3, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec3 rise(vec2 p, float time, out float order) {
  float wide = max(uAspect, 0.9);
  vec2 center = vec2(0.05 * sin(time * 0.45) * wide, -0.7);
  vec2 radius = vec2(0.82 * wide, 0.64 * (1.0 + 0.04 * sin(time * 0.8)));
  float d = length((p - center) / radius);
  float soft = mix(0.6, 1.15, uSoftness);
  float t = clamp(pow(clamp(1.0 - d, 0.0, 1.0), soft) * 1.35, 0.0, 1.0);
  order = clamp((d - 0.2) * 1.3, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec3 eclipse(vec2 p, float time, out float order) {
  float fit = min(1.0, uAspect * 1.25);
  float r = 0.23 * fit * (1.0 + 0.015 * sin(time * 0.9));
  float angle = atan(p.y, p.x);
  float rays = noise(vec2(cos(angle), sin(angle)) * 2.2 + time * 0.08) * 0.8 + 0.6;
  float d = length(p) - r;
  float reach = mix(0.07, 0.15, uSoftness) * rays * fit;
  float t = smoothstep(-0.006, 0.006 + 0.02 * uSoftness, d) * exp(-max(d, 0.0) / reach);
  order = clamp(d * 2.0, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec4 tone(float t) {
  float x = smoothstep(0.3, 1.0, t) * float(uCount - 1);
  int index = int(floor(x));
  return vec4(mix(uRamp[index], uRamp[min(index + 1, uCount - 1)], fract(x)), smoothstep(0.0, 0.38, t));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float time = uTime;
  vec2 q = p / uScale;
  vec2 warp = vec2(
    noise(q * 1.6 + uSeed + vec2(0.0, time * 0.3)),
    noise(q * 1.6 + uSeed.yx + vec2(4.3, -time * 0.24))
  ) - 0.5;
  q += warp * uFlow * (uShape == 3 ? 0.04 : 0.18);
  float order = 0.0;
  vec3 shape;
  if (uShape == 0) shape = horizon(q, time, order);
  else if (uShape == 1) shape = pinch(q, time, order);
  else if (uShape == 2) shape = rise(q, time, order);
  else shape = eclipse(q, time, order);

  float reveal = clamp((uIntro * 1.45 - order) / 0.45, 0.0, 1.0);
  reveal = reveal * reveal * (3.0 - 2.0 * reveal);

  float scramble = 0.0;
  for (int i = 0; i < 24; i++) {
    vec4 point = uTrail[i];
    if (point.z <= 0.0) continue;
    vec2 d = p - point.xy;
    scramble = max(scramble, point.z * exp(-dot(d, d) / (uRadius * uRadius)));
  }
  for (int i = 0; i < 4; i++) {
    vec4 c = uClicks[i];
    if (c.w <= 0.0) continue;
    float d = length(p - c.xy);
    if (uClickEffect == 1) {
      scramble = max(scramble, exp(-pow((d - c.z * 0.75) / 0.06, 2.0)) * c.w);
    } else if (uClickEffect == 2) {
      float size = 0.08 + 0.22 * (1.0 - exp(-c.z * 5.0));
      scramble = max(scramble, (1.0 - smoothstep(size * 0.6, size, d)) * c.w);
    }
  }
  vec2 t = clamp(shape.xy * mix(0.7, 1.0, reveal), 0.0, 1.0);
  vec4 mixed = mix(tone(t.x), tone(t.y), shape.z);
  vec3 color = encode(labToRgb(mixed.rgb));
  float alpha = mixed.a * reveal;
  float dither = (hash12(gl_FragCoord.xy + uFrame * 13.7) - 0.5) / 255.0;
  outColor = clamp(vec4(color * alpha + dither, alpha + dither), 0.0, 1.0);
  outAux = vec4(reveal, scramble, 0.0, 1.0);
}`,He=`
uniform sampler2D uField;
uniform sampler2D uAux;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform vec2 uOffset;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform float uDensity;
uniform float uOpacity;
uniform float uFlicker;
uniform float uDepth;
uniform float uGlyphTime;
uniform float uSeedValue;
uniform float uLight;
${qe}
float sampleGlyph(float index, vec2 local, vec2 coord, float soft) {
  float column = mod(index, uAtlasGrid.x);
  float row = floor(index / uAtlasGrid.x);
  vec2 atlasUv = vec2((column + local.x) / uAtlasGrid.x, (row + 1.0 - local.y) / uAtlasGrid.y);
  vec2 continuous = coord / uAtlasGrid;
  float scale = exp2(soft);
  return textureGrad(uAtlas, atlasUv, dFdx(continuous) * scale, dFdy(continuous) * scale).a;
}

vec4 glyphAt(vec2 px) {
  vec2 coord = (px - uOffset) / uCell;
  vec2 cell = floor(coord);
  vec2 local = coord - cell;
  vec2 uv = clamp(((cell + 0.5) * uCell + uOffset) / uResolution, vec2(0.0), vec2(1.0));
  vec4 field = texture(uField, uv);
  vec4 aux = texture(uAux, uv);
  vec3 visible = uLight > 0.5 ? field.rgb + (1.0 - field.a) : field.rgb;
  float luma = dot(visible, vec3(0.2126, 0.7152, 0.0722));
  float value = uLight > 0.5 ? clamp((1.0 - luma) * 1.5, 0.0, 1.0) : luma;
  float pick = hash12(cell + uSeedValue * 7.31);
  float level = hash12(cell * 1.73 + 4.1 + uSeedValue);
  float tick = floor(uGlyphTime * 9.0 + level * 9.0);
  float wobble = (hash12(cell * 2.31 + tick * 17.7) - 0.5) * uFlicker * 0.4 + (level - 0.5) * 0.1;
  float tone = clamp(pow(value, 0.75) + wobble, 0.0, 1.0);
  float index = floor(tone * (uCount - 1.0) + 0.5);
  float decode = max(aux.g, 1.0 - aux.r);
  if (decode > 0.02) {
    float frame = floor(uGlyphTime * 20.0);
    if (hash12(cell * 3.7 + frame * 5.3) < decode * 1.25) index = 1.0 + floor(hash12(cell + frame * 1.37) * (uCount - 1.0));
  }
  float present = step(pick, uDensity * mix(1.0, 0.3 + tone * 1.1, 0.55));
  float cutoff = smoothstep(0.03, 0.1, value);
  float focus = step(hash12(cell * 0.71 + 9.2 + uSeedValue), uDepth);
  float coverage = sampleGlyph(index, local, coord, focus * 1.2);
  float alpha = uOpacity * present * cutoff * coverage * mix(1.0, 0.35 + 0.65 * level, 0.55) * (1.0 - focus * 0.5);
  if (uLight < 0.5) {
    vec3 light = field.rgb * 0.55 + vec3(0.03) * field.a;
    return vec4(light * alpha, 0.6 * field.a * alpha);
  }
  vec3 ink = visible * 0.8;
  return vec4(ink * alpha, alpha);
}
`,vt=`#version 300 es
precision highp float;
uniform float uDownscale;
in vec2 vUv;
out vec4 outColor;
${He}
void main() {
  outColor = glyphAt(gl_FragCoord.xy * uDownscale);
}`,xt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += texture(uSource, vUv + uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv - uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv + uStep * 3.2307692308) * 0.0702702703;
  sum += texture(uSource, vUv - uStep * 3.2307692308) * 0.0702702703;
  outColor = sum;
}`,Et=`#version 300 es
precision highp float;
uniform sampler2D uHalo;
uniform float uGlow;
uniform float uGradient;
uniform float uGrain;
uniform float uFrame;
in vec2 vUv;
out vec4 outColor;
${He}
void main() {
  vec4 base = texture(uField, vUv) * uGradient;
  vec4 glyph = glyphAt(gl_FragCoord.xy);
  vec4 halo = texture(uHalo, vUv) * uGlow;
  vec4 color;
  if (uLight < 0.5) {
    color = base + glyph + halo;
  } else {
    color = glyph + base * (1.0 - glyph.a);
    color += halo * 0.6 * (1.0 - color.a);
  }
  float grain = (hash12(gl_FragCoord.xy + uFrame * vec2(17.0, 59.0)) + hash12(gl_FragCoord.xy * 1.31 + uFrame * 7.0) - 1.0) * uGrain;
  float body = clamp(color.a, 0.0, 1.0);
  color.rgb += grain * (0.25 + body) * 0.5;
  color.a = clamp(color.a, 0.0, 1.0);
  color.rgb = clamp(color.rgb, 0.0, color.a);
  outColor = color;
}`,x=(t,s,u)=>Math.min(u,Math.max(s,t)),le=t=>t<=.04045?t/12.92:((t+.055)/1.055)**2.4,Tt=([t,s,u])=>{let i=le(t),l=le(s),f=le(u),b=Math.cbrt(.4122214708*i+.5363325363*l+.0514459929*f),h=Math.cbrt(.2119034982*i+.6806995451*l+.1073969566*f),m=Math.cbrt(.0883024619*i+.2817188376*l+.6299787005*f);return[.2104542553*b+.793617785*h-.0040720468*m,1.9779984951*b-2.428592205*h+.4505937099*m,.0259040371*b+.7827717662*h-.808675766*m]},ze=(t,s,u)=>{let i=t.createShader(s);return i?(t.shaderSource(i,u),t.compileShader(i),t.getShaderParameter(i,t.COMPILE_STATUS)?i:(t.deleteShader(i),null)):null},j=(t,s)=>{let u=ze(t,t.VERTEX_SHADER,ht),i=ze(t,t.FRAGMENT_SHADER,s),l=t.createProgram();if(!u||!i||!l)return null;if(t.attachShader(l,u),t.attachShader(l,i),t.linkProgram(l),t.deleteShader(u),t.deleteShader(i),!t.getProgramParameter(l,t.LINK_STATUS))return t.deleteProgram(l),null;let f={},b=t.getProgramParameter(l,t.ACTIVE_UNIFORMS);for(let h=0;h<b;h++){let m=t.getActiveUniform(l,h);if(!m)continue;let F=m.name.replace(/\[0\]$/,"");f[F]=t.getUniformLocation(l,F)}return{program:l,uniforms:f}},ue=(t,s)=>({textures:Array.from({length:s},()=>{let i=t.createTexture();return t.bindTexture(t.TEXTURE_2D,i),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),i}),framebuffer:t.createFramebuffer(),width:0,height:0}),fe=(t,s,u,i)=>{s.width===u&&s.height===i||(s.width=u,s.height=i,t.bindFramebuffer(t.FRAMEBUFFER,s.framebuffer),s.textures.forEach((l,f)=>{t.bindTexture(t.TEXTURE_2D,l),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,u,i,0,t.RGBA,t.UNSIGNED_BYTE,null),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+f,t.TEXTURE_2D,l,0)}),t.bindFramebuffer(t.FRAMEBUFFER,null))},Be=(t,s,u)=>{let i=[...new Set([...s].filter(C=>C!==`
`&&C!=="\r"))];i.length||i.push(" ");let l=`300 ${Math.round(z*ft)}px ${u}`,f=Math.min(ut,i.length),b=Math.ceil(i.length/f),h=document.createElement("canvas");h.width=J*f,h.height=z*b;let m=h.getContext("2d");m&&(m.font=l,m.textAlign="center",m.textBaseline="middle",m.fillStyle="#fff",i.forEach((C,B)=>{let Z=B%f,ee=Math.floor(B/f);m.fillText(C,Z*J+J/2,ee*z+z/2+3)}));let F=t.createTexture();return t.bindTexture(t.TEXTURE_2D,F),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,h),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),{texture:F,count:i.length,grid:[f,b]}},bt=({colors:t=ke,shape:s="horizon",characters:u=Xe,cellSize:i=18,density:l=.8,glyphOpacity:f=.85,glow:b=.2,depthOfField:h=0,flicker:m=.2,softness:F=.5,scale:C=1,flow:B=.5,speed:Z=1,gradientOpacity:ee=.9,grain:We=.08,variation:$e=0,mouseInteraction:Ke=!0,scrambleRadius:Ye=.1,clickEffect:je="wave",intro:Je=!0,lightMode:Qe=!1,fontFamily:Ze=Ne,dpr:et,className:tt="",style:ot,...rt})=>{let he=(0,S.useRef)(null),pe=(0,S.useRef)(null),te=(0,S.useRef)(null),q=(Array.isArray(t)&&t.length?t:ke).slice(0,Ie),ve={colors:q.length>1?q:[q[0],q[0]],shape:mt[s]??0,characters:u||Xe,cellSize:x(i,6,64),density:x(l,0,1),glyphOpacity:x(f,0,1),glow:x(b,0,2),depthOfField:x(h,0,1),flicker:x(m,0,1),softness:x(F,0,1),scale:x(C,.4,2.5),flow:x(B,0,2),speed:Math.max(0,Z),gradientOpacity:x(ee,0,1),grain:x(We,0,.4),variation:Math.max(0,$e),mouseInteraction:Ke,scrambleRadius:x(Ye,.02,.4),clickEffect:dt[je]??1,intro:Je,lightMode:Qe,fontFamily:Ze||Ne,dpr:et},y=(0,S.useRef)(ve);return y.current=ve,(0,S.useEffect)(()=>{let U=he.current,d=pe.current,e=d?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!U||!d||!e)return;let H=j(e,pt),P=j(e,vt),L=j(e,xt),O=j(e,Et);if(!H||!P||!L||!O)return;let xe=e.createVertexArray(),_=ue(e,2),T=ue(e,1),V=ue(e,1),D=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),Ee=new Map,at=a=>{let r=String(a),o=Ee.get(r);if(o)return o;let n=[0,0,0];if(D){D.clearRect(0,0,1,1),D.fillStyle="#000000",D.fillStyle=r,D.fillRect(0,0,1,1);let[c,w,g]=D.getImageData(0,0,1,1).data;n=[c/255,w/255,g/255]}return Ee.set(r,n),n},M=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,A={width:1,height:1,ratio:1},Te=new Float32Array(Ie*3),oe=new Float32Array(ce*4),R=[],re=new Float32Array(se*4),E=[],v={x:0,y:0,inside:!1},p=null,ae="",be="",ye=0,Ae=0,k=y.current.intro&&!M?0:1,W=0,ie=0,X=0,I=0,$=!0,K=!1,it=()=>{let a=y.current,r=`${a.fontFamily}|${a.characters}`;r===ae&&p||(ae=r,p&&e.deleteTexture(p.texture),p=Be(e,a.characters,a.fontFamily),document.fonts?.load?.(`300 64px ${a.fontFamily}`,a.characters).then(()=>{K||ae!==r||(p&&e.deleteTexture(p.texture),p=Be(e,a.characters,a.fontFamily),ne())},()=>{}))},nt=()=>{let a=y.current,r=a.colors.join(",");r!==be&&(be=r,a.colors.forEach((o,n)=>Te.set(Tt(at(o)),n*3)))},Re=(a,r,o)=>{if(!p)return;let n=y.current,c=a.uniforms,w=n.cellSize*A.ratio,g=w*(J/z);e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,_.textures[0]),e.uniform1i(c.uField,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,_.textures[1]),e.uniform1i(c.uAux,1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,p.texture),e.uniform1i(c.uAtlas,2),e.uniform2f(c.uResolution,r,o),e.uniform2f(c.uCell,g,w),e.uniform2f(c.uOffset,(r-Math.ceil(r/g)*g)/2,(o-Math.ceil(o/w)*w)/2),e.uniform2f(c.uAtlasGrid,p.grid[0],p.grid[1]),e.uniform1f(c.uCount,p.count),e.uniform1f(c.uDensity,n.density),e.uniform1f(c.uOpacity,n.glyphOpacity),e.uniform1f(c.uFlicker,M?0:n.flicker),e.uniform1f(c.uDepth,n.depthOfField),e.uniform1f(c.uGlyphTime,Ae),e.uniform1f(c.uSeedValue,n.variation),e.uniform1f(c.uLight,n.lightMode?1:0)},ne=()=>{let a=y.current,r=A.width/A.height;it(),nt(),e.bindVertexArray(xe),e.disable(e.BLEND),e.bindFramebuffer(e.FRAMEBUFFER,_.framebuffer),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]),e.viewport(0,0,_.width,_.height),e.useProgram(H.program);let o=H.uniforms;e.uniform1f(o.uAspect,r),e.uniform1f(o.uTime,ye),e.uniform1i(o.uShape,a.shape),e.uniform3fv(o.uRamp,Te),e.uniform1i(o.uCount,a.colors.length),e.uniform1f(o.uScale,a.scale),e.uniform1f(o.uSoftness,a.softness),e.uniform1f(o.uFlow,a.flow),e.uniform2f(o.uSeed,a.variation*3.17,a.variation*1.91),e.uniform4fv(o.uTrail,re),e.uniform1f(o.uRadius,a.scrambleRadius),e.uniform4fv(o.uClicks,oe),e.uniform1i(o.uClickEffect,a.clickEffect),e.uniform1f(o.uIntro,k),e.uniform1f(o.uFrame,W),e.drawArrays(e.TRIANGLES,0,3);let n=a.glow>.001;n&&(e.bindFramebuffer(e.FRAMEBUFFER,T.framebuffer),e.drawBuffers([e.COLOR_ATTACHMENT0]),e.viewport(0,0,T.width,T.height),e.useProgram(P.program),Re(P,d.width,d.height),e.uniform1f(P.uniforms.uDownscale,d.width/T.width),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(L.program),e.activeTexture(e.TEXTURE0),e.uniform1i(L.uniforms.uSource,0),e.bindFramebuffer(e.FRAMEBUFFER,V.framebuffer),e.bindTexture(e.TEXTURE_2D,T.textures[0]),e.uniform2f(L.uniforms.uStep,1/T.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,T.framebuffer),e.bindTexture(e.TEXTURE_2D,V.textures[0]),e.uniform2f(L.uniforms.uStep,0,1/T.height),e.drawArrays(e.TRIANGLES,0,3)),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,d.width,d.height),e.useProgram(O.program),Re(O,d.width,d.height);let c=O.uniforms;e.activeTexture(e.TEXTURE3),e.bindTexture(e.TEXTURE_2D,T.textures[0]),e.uniform1i(c.uHalo,3),e.uniform1f(c.uGlow,n?a.glow:0),e.uniform1f(c.uGradient,a.gradientOpacity),e.uniform1f(c.uGrain,a.grain),e.uniform1f(c.uFrame,W),e.drawArrays(e.TRIANGLES,0,3)},we=()=>{let a=y.current;A.width=Math.max(1,U.clientWidth),A.height=Math.max(1,U.clientHeight),A.ratio=Math.min(a.dpr||window.devicePixelRatio||1,2),d.width=Math.max(1,Math.round(A.width*A.ratio)),d.height=Math.max(1,Math.round(A.height*A.ratio)),fe(e,_,Math.max(1,Math.round(d.width/2)),Math.max(1,Math.round(d.height/2)));let r=Math.max(1,Math.round(d.width/4)),o=Math.max(1,Math.round(d.height/4));fe(e,T,r,o),fe(e,V,r,o),ne(),G()},ct=a=>{for(E.forEach(r=>{r.age+=a});E.length&&E[E.length-1].age>Pe;)E.pop();for(let r=0;r<se;r++){let o=E[r];if(!o){re[r*4+2]=0;continue}let n=1-o.age/Pe;re.set([o.x,o.y,n*n,0],r*4)}for(R.forEach(r=>{r.age+=a});R.length&&R[R.length-1].age>Ge;)R.pop();for(let r=0;r<ce;r++){let o=R[r];if(!o){oe[r*4+3]=0;continue}let n=o.age/Ge,c=Math.min(1,o.age/.08)*(1-n)*(1-n);oe.set([o.x,o.y,o.age,c],r*4)}},ge=a=>{if(X=0,K||!$||document.hidden)return;let r=y.current,o=I?x((a-I)/1e3,.001,.05):1/60;I=a,M||(ye+=o*r.speed*.5,Ae+=o*Math.max(r.speed,.15)),k<1&&(k=Math.min(1,k+o/lt)),ie+=o,!M&&ie>1/24&&(ie=0,W=(W+1)%97),ct(o),ne(),!M||k<1||R.length>0||E.length>0?X=requestAnimationFrame(ge):I=0};function G(){!X&&!K&&$&&!document.hidden&&(X=requestAnimationFrame(ge))}let Se=a=>{let r=U.getBoundingClientRect(),o=(a.clientX-r.left)/Math.max(1,r.width),n=1-(a.clientY-r.top)/Math.max(1,r.height),c=r.width/Math.max(1,r.height);v.inside=o>=0&&o<=1&&n>=0&&n<=1,v.x=(o-.5)*c,v.y=n-.5},Fe=a=>{Se(a);let r=y.current;if(!v.inside||!r.mouseInteraction||M)return;let o=E[0],n=o?Math.hypot(v.x-o.x,v.y-o.y):1/0;if(!(n<Oe)){if(o&&o.age<.1){let c=Math.min(6,Math.floor(n/(Oe*2)));for(let w=1;w<=c;w++){let g=w/(c+1);E.unshift({x:o.x+(v.x-o.x)*g,y:o.y+(v.y-o.y)*g,age:0})}}E.unshift({x:v.x,y:v.y,age:0}),E.length=Math.min(E.length,se),G()}},_e=a=>{Se(a);let r=y.current;!v.inside||!r.clickEffect||M||(R.unshift({x:v.x,y:v.y,age:0}),R.length>ce&&R.pop(),G())},Me=()=>{I=0,G()},Ce=new ResizeObserver(we);Ce.observe(U);let Ue=new IntersectionObserver(a=>{$=a.some(r=>r.isIntersecting),$&&(I=0,G())});return Ue.observe(U),window.addEventListener("pointermove",Fe,{passive:!0}),window.addEventListener("pointerdown",_e,{passive:!0}),document.addEventListener("visibilitychange",Me),we(),te.current=G,()=>{K=!0,cancelAnimationFrame(X),te.current=null,Ce.disconnect(),Ue.disconnect(),window.removeEventListener("pointermove",Fe),window.removeEventListener("pointerdown",_e),document.removeEventListener("visibilitychange",Me),[_,T,V].forEach(a=>{a.textures.forEach(r=>e.deleteTexture(r)),e.deleteFramebuffer(a.framebuffer)}),p&&e.deleteTexture(p.texture),e.deleteVertexArray(xe),[H,P,L,O].forEach(a=>e.deleteProgram(a.program)),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,S.useEffect)(()=>{te.current?.()}),(0,me.jsx)("div",{ref:he,className:["relative h-full w-full overflow-hidden",tt].filter(Boolean).join(" "),style:ot,...rt,children:(0,me.jsx)("canvas",{ref:pe,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ve=bt;var de=N(Y(),1),yt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Q=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],_t=yt.map((t,s)=>({id:s+1,image:t,src:t,img:t,url:t,title:Q[s],text:Q[s],label:Q[s],alt:Q[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function At({big:t}){return(0,de.jsx)(De,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,de.jsx)(Ve,{})})}var Mt=Le(At);export{Mt as default};
