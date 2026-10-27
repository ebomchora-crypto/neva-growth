import{a as Tt,b as me,c as zt,d as pe,e as Ve,f as We,h as Ct}from"./chunks/chunk-M7BFARI7.js";import{c as de,i as na,j as ke,l as Rt,m as Ft}from"./chunks/chunk-6IYH4WPJ.js";var G=de(na(),1);var Lt=de(ke(),1),Pt={plasma:{color:"#F25BD0",strands:6,crackle:.85,flares:.65,glow:.9,sparks:.6,particleCount:15e3,fill:.5,motion:"rise",particleShape:"square",depth:.6,sway:.5,twinkle:.5,haze:.7,dustSpeed:1},aurora:{color:"#5CFFC8",strands:5,crackle:.6,flares:.5,glow:.8,sparks:.45,particleCount:15e3,fill:.5,motion:"rise",particleShape:"square",depth:.6,sway:.5,twinkle:.5,haze:.7,dustSpeed:1},nebula:{color:"#9478FF",strands:6,crackle:1,flares:.5,glow:.9,sparks:.6,particleCount:18e3,fill:.45,motion:"rise",particleShape:"square",depth:.5,sway:.4,twinkle:.6,haze:.8,dustSpeed:1.2},ember:{color:"#FF8A2A",strands:5,crackle:.9,flares:.8,glow:1,sparks:.8,particleCount:12e3,fill:.35,motion:"rise",particleShape:"round",depth:.7,sway:.3,twinkle:.7,haze:.9,dustSpeed:1.6},frost:{color:"#BFE6FF",strands:3,crackle:.3,flares:.3,glow:.6,sparks:.2,particleCount:16e3,fill:.6,motion:"fall",particleShape:"round",depth:.8,sway:.4,twinkle:.4,haze:.5,dustSpeed:.7},solar:{color:"#FFD36E",strands:6,crackle:.7,flares:1,glow:1.1,sparks:.5,particleCount:15e3,fill:.55,motion:"orbit",particleShape:"square",depth:.6,sway:.7,twinkle:.5,haze:.8,dustSpeed:1},eclipse:{color:"#FFFFFF",strands:4,crackle:.5,flares:.4,glow:.7,sparks:.35,particleCount:14e3,fill:.5,motion:"drift",particleShape:"square",depth:.7,sway:.5,twinkle:.5,haze:.5,dustSpeed:.8},abyss:{color:"#3F7BFF",strands:5,crackle:.55,flares:.6,glow:.9,sparks:.4,particleCount:2e4,fill:.8,motion:"orbit",particleShape:"round",depth:.8,sway:.8,twinkle:.5,haze:.6,dustSpeed:.9}},la={rise:0,fall:1,drift:2,orbit:3},ia={square:0,round:1},Bt=8,Ke=4,sa=4e4,V=256,ua=45e5,ca=2.2,fa=7,Se=[1,1,1],$e=[0,0,0],d=(e,a,t)=>Math.min(Math.max(e,a),t),O=(e,a,t)=>{let i=d((t-e)/(a-e),0,1);return i*i*(3-2*i)},Et=e=>1-Math.pow(1-e,3),ie=(e,a,t)=>e.map((i,s)=>i+(a[s]-i)*t),Dt=e=>e-Math.PI*2*Math.floor((e+Math.PI)/(Math.PI*2)),da=(e,a)=>{try{let t=document.createElement("canvas").getContext("2d");if(!t)return a;t.fillStyle="#000000",t.fillStyle=e;let i=t.fillStyle;if(i.startsWith("#")){let l=parseInt(i.slice(1),16);return[(l>>16&255)/255,(l>>8&255)/255,(l&255)/255]}let s=i.match(/[\d.]+/g);return!s||s.length<3?a:[Number(s[0])/255,Number(s[1])/255,Number(s[2])/255]}catch{return a}},ma=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),pa=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055,he=e=>{let[a,t,i]=e.map(ma),s=Math.cbrt(.4122214708*a+.5363325363*t+.0514459929*i),l=Math.cbrt(.2119034982*a+.6806995451*t+.1073969566*i),v=Math.cbrt(.0883024619*a+.2817188376*t+.6299787005*i);return[.2104542553*s+.793617785*l-.0040720468*v,1.9779984951*s-2.428592205*l+.4505937099*v,.0259040371*s+.7827717662*l-.808675766*v]},je=([e,a,t])=>{let i=Math.pow(e+.3963377774*a+.2158037573*t,3),s=Math.pow(e-.1055613458*a-.0638541728*t,3),l=Math.pow(e-.0894841775*a-1.291485548*t,3);return[4.0767416621*i-3.3077115913*s+.2309699292*l,-1.2684380046*i+2.6097574011*s-.3413193965*l,-.0041960863*i-.7034186147*s+1.707614701*l].map(v=>d(pa(d(v,0,1)),0,1))},At=(e,a,t)=>je(ie(he(e),he(a),t)),le=(e,a,t,i)=>{let[s,l,v]=he(e),w=Math.hypot(l,v)*i,x=Math.atan2(v,l)+a*Math.PI/180;return je([d(s+t,0,1),w*Math.cos(x),w*Math.sin(x)])},D=(e,a,t,i)=>{let[,s,l]=he(e),v=Math.max(Math.hypot(s,l)*i,.02),w=Math.atan2(l,s)+a*Math.PI/180;return je([d(t,0,1),v*Math.cos(w),v*Math.sin(w)])},ha=(e,a)=>{if(a){let t=D(e,0,Math.min(he(e)[0],.62),1.15);return{rim:t,rimHot:t,rimMid:t,rimDeep:D(e,0,.72,.8),spark:D(e,0,.6,1.2),sparkGlow:D(e,0,.78,.8),haze:D(e,0,.8,.6),edge:D(e,0,.72,.8),tones:[D(e,0,.56,1.1),D(e,16,.6,1.05),D(e,-16,.5,1.1),D(e,0,.66,.9),D(e,0,.74,.7)]}}return{rim:e,rimHot:ie(e,Se,.72),rimMid:ie(e,$e,.15),rimDeep:ie(e,$e,.45),spark:ie(e,Se,.45),sparkGlow:le(e,0,-.15,1),haze:ie(e,$e,.6),edge:le(e,0,-.3,.9),tones:[le(e,0,-.06,1),le(e,16,-.02,1),le(e,-16,-.12,1.05),le(At(e,Se,.25),0,.04,1),At(e,Se,.7)]}},Ye=e=>{let a=e>>>0;return()=>{a=a+1831565813>>>0;let t=a;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}},va=()=>{let e=Ye(99),a=[[6,12,.6,1.6],[18,34,1.5,3.5],[40,70,3,7],[80,130,6,12]],t={harmonics:[],rates:[],phases:[],flareHarmonics:[],flareRates:[],flarePhases:[]};for(let i=0;i<Bt;i++){a.forEach(([l,v,w,x])=>{t.harmonics.push(Math.round(l+e()*(v-l))),t.rates.push((w+e()*(x-w))*(e()<.5?-1:1)),t.phases.push(e()*Math.PI*2)});for(let l=0;l<3;l++)t.flareHarmonics.push(4+Math.floor(e()*6)),t.flareRates.push((.4+e()*.8)*(e()<.5?-1:1)),t.flarePhases.push(e()*Math.PI*2);let s=i===0;t.flareHarmonics.push(s?.75:.95+e()*.3),t.flareRates.push(s?1.15:.8+e()*.2),t.flarePhases.push(s?1:.7+e()*.25)}return t},wa=e=>{let a=Ye(1337),t=Math.max(1,Math.ceil(e/V)),i=new Float32Array(V*t*4),s=new Float32Array(V*t*4),l=0,v=0;for(;l<e&&v<e*80;){v++;let w,x,W;if(a()<.28){let K=a()*Math.PI*2,ee=.87+Math.sqrt(a())*.105;if(w=Math.cos(K)*ee,x=Math.sin(K)*ee,a()>O(-.6,.3,-x))continue;let te=a();W=te<.5?3:te<.8?2:1}else{w=a()*2-1,x=a()*2-1;let K=Math.hypot(w,x);if(K>.975)continue;let ee=Math.pow(O(-.25,.85,-x),1.3),te=O(.66,.96,K)*O(-.7,.3,-x),ve=Math.max(ee,te*.9);if(a()>.012+.988*ve)continue;if(ve<.12)W=4;else{let se=a();W=se<.32?0:se<.52?1:se<.8?2:3}}let Fe=Math.sqrt(Math.max(0,.95-w*w-x*x));i[l*4]=w,i[l*4+1]=x,i[l*4+2]=(a()*2-1)*Fe,i[l*4+3]=W,s[l*4]=W===4?1.8:a()<.22?2.1:1.3,s[l*4+1]=a(),s[l*4+2]=2.5+a()*3.5,s[l*4+3]=.16+a()*.26,l++}return{home:i,seed:s,count:l,rows:t}},Xe=`#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Je=`
uint scramble(uint v) {
  v = v * 747796405u + 2891336453u;
  uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return (w >> 22u) ^ w;
}

float random(uint v) {
  return float(scramble(v)) * (1.0 / 4294967295.0);
}
`,It=`
uniform float uDustTime;
uniform vec2 uTurn;
uniform float uMotion;
uniform float uFill;

vec3 settle(vec3 p, out float spread) {
  float bend = exp2((0.5 - uFill) * 1.8);
  float h = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);
  float y = 2.0 * pow(h, bend) - 1.0;
  float from = sqrt(max(1.0 - p.y * p.y, 1e-4));
  float to = sqrt(max(1.0 - y * y, 0.0));
  spread = clamp(bend * pow(max(h, 1e-3), bend - 1.0) * to / from, 0.25, 1.0);
  return vec3(p.xz * (to / from), y).xzy;
}

vec3 drift(vec4 home, vec4 seed, uint id, out float life, out float spread) {
  vec3 p = settle(home.xyz, spread);
  float t = uDustTime;
  float u = fract(t / seed.z + seed.y);
  life = sin(3.14159265 * u);
  float travel = seed.w;
  if (uMotion < 0.5) {
    p.y += travel * (u - 0.5);
  } else if (uMotion < 1.5) {
    p.y -= travel * (u - 0.5);
  } else if (uMotion < 2.5) {
    p += 0.045 * vec3(
      sin(t * 0.37 + seed.y * 17.0) + 0.5 * sin(t * 0.83 + seed.z * 5.0),
      sin(t * 0.29 + seed.z * 11.0) + 0.5 * sin(t * 0.61 + seed.w * 7.0),
      sin(t * 0.33 + seed.w * 23.0)
    );
  } else {
    float loop = t * (0.6 + 0.9 * random(id * 7u + 3u)) * (random(id * 7u + 10u) < 0.5 ? -1.0 : 1.0) + seed.y * 6.2831853;
    p.xy += (0.025 + 0.05 * random(id * 7u + 16u)) * vec2(cos(loop), sin(loop));
  }
  float wobble = 0.002 + 0.006 * random(id * 7u + 1u);
  float w1 = 0.8 + 2.4 * random(id * 7u + 2u);
  float w2 = 0.8 + 2.4 * random(id * 7u + 4u);
  p += wobble * vec3(sin(t * w1 + seed.y * 40.0), cos(t * w2 + seed.z * 30.0), sin(t * (w1 + w2) * 0.5 + seed.w * 20.0));
  float cy = cos(uTurn.x);
  float sy = sin(uTurn.x);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cx = cos(uTurn.y);
  float sx = sin(uTurn.y);
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  return p;
}
`,xa=`#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform float uRadius;
uniform float uDpr;
uniform float uLine;
uniform float uTime;
uniform float uFrame;
uniform float uBins;
uniform float uStrands;
uniform float uCrackle;
uniform float uFlares;
uniform float uGlow;
uniform float uHaze;
uniform float uFill;
uniform float uPresence;
uniform float uUnfold;
uniform float uBloom;
uniform float uInside;
uniform float uEncode;
uniform vec3 uRim;
uniform vec3 uRimHot;
uniform vec3 uRimMid;
uniform vec3 uRimDeep;
uniform vec3 uSpark;
uniform vec3 uSparkGlow;
uniform vec3 uHazeColor;
uniform vec3 uEdgeColor;
uniform vec4 uHeat;
uniform vec4 uHarmonics[8];
uniform vec4 uRates[8];
uniform vec4 uPhases[8];
uniform vec4 uFlareHarmonics[8];
uniform vec4 uFlareRates[8];
uniform vec4 uFlarePhases[8];
uniform vec4 uArcs[4];

out vec4 fragColor;
${Je}
const float PI = 3.14159265;
const float TAU = 6.28318531;
const vec4 AMPS = vec4(0.35, 0.3, 0.22, 0.13);

float bell(float d, float w) {
  float x = d / w;
  return exp(-x * x);
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

float pool(vec2 q) {
  float t = length(q - vec2(0.0, mix(-1.0, -0.66, uFill))) / mix(0.8, 1.35, uFill);
  return t < 0.6 ? mix(0.5, 0.22, t / 0.6) : mix(0.22, 0.0, clamp((t - 0.6) / 0.4, 0.0, 1.0));
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr - uCenter;
  float r = length(p);
  float R = uRadius;
  float theta = atan(p.y, p.x);
  float lift = p.y / max(r, 1e-3);
  float topDim = 1.0 - 0.35 * pow(max(lift, 0.0), 1.5);
  vec3 col = vec3(0.0);
  float hot = 0.0;
  uint frame = uint(uFrame);

  if (r < R) {
    vec2 q = p / R;
    float chord = sqrt(max(1.0 - dot(q, q), 0.0));
    float haze = pool(q) * (0.55 + 0.45 * chord);
    col += uHazeColor * haze * uHaze * uInside;
    float e = length(q - vec2(0.0, 0.2)) / 1.2;
    float edge = 0.5 * pow(smoothstep(0.62, 1.0, e), 1.4);
    col += uEdgeColor * edge * uInside * (0.5 + 0.5 * uHaze);
  }

  float dr = r - R;
  float halo = 1.0 - smoothstep(R * 0.05, R * 0.105, abs(dr - R * 0.0213));
  col += uRimDeep * 0.18 * halo * topDim * uGlow * uBloom;
  col += uRim * 0.12 * bell(dr + R * 0.0383, R * 0.032) * uGlow * uBloom;
  col += uRim * 0.32 * bell(dr, max(R * 0.0117, uLine)) * uPresence * uUnfold;

  float delta = mod(theta - uHeat.x + PI, TAU) - PI;
  float heat = uHeat.z * uHeat.y * exp(-delta * delta / 0.3);
  float crackle = uCrackle + heat * 0.9;
  float amp = R * 0.016 * (0.3 + 1.4 * crackle) * uUnfold;
  float jitterAmp = R * 0.0048 * (0.3 + 1.4 * uCrackle) * uUnfold * (1.0 + heat * 0.3);
  float flareAmp = R * 0.064 * (0.4 + 1.2 * crackle) * uFlares * 1.6 * uUnfold;

  if (abs(dr) < amp * 2.0 + flareAmp + R * 0.3) {
    float step = TAU / uBins;
    float binPos = (theta + PI) / step;
    float bin0 = floor(binPos);
    float binF = binPos - bin0;
    float th0 = bin0 * step - PI;
    float th1 = th0 + step;
    uint b0 = uint(mod(bin0, uBins));
    uint b1 = uint(mod(bin0 + 1.0, uBins));
    float gain = min(1.0, 2.4 / max(uStrands, 1.0));
    for (int k = 0; k < 8; k++) {
      if (float(k) >= uStrands) break;
      vec4 m = uHarmonics[k];
      vec4 lead = uRates[k] * uTime + uPhases[k];
      float wave0 = dot(AMPS, sin(m * th0 + lead));
      float wave1 = dot(AMPS, sin(m * th1 + lead));
      uint salt = uint(k) * 1013u + frame * 7919u;
      vec4 shape = uFlareHarmonics[k];
      vec4 look = uFlareRates[k];
      vec4 tone = uFlarePhases[k];
      float a = amp * shape.w;
      float off0 = a * wave0 + jitterAmp * (random(b0 + salt) - 0.5);
      float off1 = a * wave1 + jitterAmp * (random(b1 + salt) - 0.5);
      float rc = R + mix(off0, off1, binF);
      float grade = (off1 - off0) / (step * max(r, 1.0));
      float d = abs(r - rc) * inversesqrt(1.0 + grade * grade);
      float swell = 0.8 + 0.4 * (0.5 + 0.5 * sin(3.0 * theta + uTime * 0.7 + tone.x * 1.7));
      float width = uLine * look.w * swell * (1.0 + heat * 0.25);
      float core = exp(-d * d / (width * width));
      float sheath = exp(-d * d / (width * width * 3.0));
      float bright = tone.w * (1.0 + heat * 0.45) * uPresence;
      col += (uRimHot * core * 0.8 + uRim * sheath * 0.32) * bright;
      hot += core * bright;
      vec3 fargs = shape.xyz * theta + look.xyz * uTime + tone.xyz;
      float flare = max(0.0, (sin(fargs.x) + sin(fargs.y) + sin(fargs.z)) / 3.0);
      flare = (flare * flare + heat * 0.35) * flareAmp;
      float dw = abs(r - rc - flare);
      float dm = abs(r - rc - flare * 0.6);
      float dn = abs(r - rc - flare * 0.25);
      vec3 glow = uRimDeep * (0.07 * bell(dw, R * 0.09) + 0.16 * bell(dw, R * 0.05));
      glow += uRimMid * 0.28 * bell(dm, R * 0.027) + uRim * 0.38 * bell(dn, R * 0.013);
      col += glow * gain * topDim * uGlow * uBloom * (1.0 + heat * 1.4);
    }
  }

  for (int i = 0; i < 4; i++) {
    vec4 arc = uArcs[i];
    if (arc.w <= 0.002) continue;
    float mid = arc.x + arc.y * 0.5;
    vec2 center = R * 0.93 * vec2(cos(mid), sin(mid));
    if (distance(p, center) > R * (abs(arc.y) * 0.6 + 0.1) + 12.0) continue;
    float ar = R * 0.955;
    vec2 a0 = ar * vec2(cos(arc.x), sin(arc.x));
    vec2 a2 = ar * vec2(cos(arc.x + arc.y), sin(arc.x + arc.y));
    vec2 a1 = R * (0.955 - arc.z) * vec2(cos(mid), sin(mid));
    float dmin = 1e5;
    float along = 0.0;
    vec2 prev = a0;
    for (int s = 1; s <= 10; s++) {
      float u = float(s) / 10.0;
      vec2 b = mix(mix(a0, a1, u), mix(a1, a2, u), u);
      vec2 pa = p - prev;
      vec2 ba = b - prev;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
      float dist = length(pa - ba * h);
      if (dist < dmin) {
        dmin = dist;
        along = (float(s) - 1.0 + h) / 10.0;
      }
      prev = b;
    }
    float taper = sqrt(max(sin(PI * along), 0.0));
    float arcWidth = uLine * (0.55 + 0.6 * taper);
    float arcCore = exp(-dmin * dmin / (arcWidth * arcWidth));
    float arcGlow = exp(-dmin * dmin / (arcWidth * arcWidth * 12.0));
    col += (uSpark * 0.95 * arcCore + uSparkGlow * 0.4 * arcGlow) * arc.w * taper;
    hot += arcCore * arc.w * taper * 0.6;
  }

  fragColor = vec4(col, hot) * uEncode;
}
`,ga=`#version 300 es
precision highp float;

in float aIndex;

uniform sampler2D tHome;
uniform sampler2D tSeed;
uniform sampler2D tOffset;
uniform float uStirred;
uniform vec2 uCenter;
uniform vec2 uViewport;
uniform float uRadius;
uniform float uDpr;
uniform float uDepth;
uniform float uTwinkle;
uniform float uPointScale;
uniform float uReveal;
uniform float uEncode;
uniform vec3 uTones[5];
uniform vec3 uRimTone;

out vec3 vColor;
out float vSize;
${Je}
${It}
void main() {
  ivec2 cell = ivec2(int(mod(aIndex, ${V}.0)), int(floor(aIndex / ${V}.0)));
  uint id = uint(aIndex);
  vec4 home = texelFetch(tHome, cell, 0);
  vec4 seed = texelFetch(tSeed, cell, 0);
  float life;
  float spread;
  vec3 p = drift(home, seed, id, life, spread);
  if (uStirred > 0.5) p += texelFetch(tOffset, cell, 0).xyz;
  float len = length(p);
  float inside = 1.0 - smoothstep(0.955, 0.985, length(p.xy));
  if (len > 0.975) p *= 0.975 / len;

  float front = p.z * 0.5 + 0.5;
  float depthSize = mix(1.0, 0.7 + 0.6 * front, uDepth);
  float depthLight = mix(1.0, 0.35 + 0.8 * front, uDepth);
  float blink = sin(uDustTime * (2.0 + 6.0 * random(id * 7u + 5u)) + random(id * 7u + 6u) * 6.2831853);
  float twinkle = mix(1.0, smoothstep(-0.9, -0.6, blink), uTwinkle);
  float fade = smoothstep(0.04, 0.12, life);
  float order = (home.y + 1.0) * 0.5 * 0.55 + random(id * 7u + 8u) * 0.25;
  float reveal = smoothstep(order, order + 0.2, uReveal * 1.0);
  float alpha = random(id * 7u + 9u) < 0.5 || home.w > 3.5 ? 1.0 : 0.6;

  float size = seed.x * uPointScale * (0.35 + 0.95 * life) * depthSize * mix(0.5, 1.0, reveal);
  vec2 screen = uCenter + p.xy * uRadius;
  gl_Position = vec4(screen / uViewport * 2.0 - 1.0, 0.0, 1.0);
  float px = size * uDpr;
  gl_PointSize = px + 2.0;
  vSize = px;

  int tone = int(home.w + 0.5);
  float rimLit = smoothstep(0.8, 0.97, length(p.xy));
  vec3 color = uTones[tone] + uRimTone * rimLit * rimLit * 0.12;
  vColor = color * alpha * fade * twinkle * depthLight * reveal * inside * sqrt(spread) * uEncode;
}
`,ya=`#version 300 es
precision highp float;

uniform float uShape;

in vec3 vColor;
in float vSize;

out vec4 fragColor;

void main() {
  vec2 q = (gl_PointCoord - 0.5) * (vSize + 2.0);
  float half_ = max(vSize * 0.5, 0.5);
  float cover;
  if (uShape < 0.5) {
    vec2 c = clamp(half_ - abs(q) + 0.5, 0.0, 1.0);
    cover = c.x * c.y;
  } else {
    cover = clamp(half_ - length(q) + 0.5, 0.0, 1.0);
  }
  if (cover <= 0.0) discard;
  fragColor = vec4(vColor * cover, 0.0);
}
`,ba=`#version 300 es
precision highp float;

uniform sampler2D tHome;
uniform sampler2D tSeed;
uniform sampler2D tOffset;
uniform sampler2D tVelocity;
uniform float uDt;
uniform float uReset;
uniform vec4 uBrush;
uniform float uBrushPower;
uniform vec4 uKick;

layout(location = 0) out vec4 outOffset;
layout(location = 1) out vec4 outVelocity;
${Je}
${It}
vec3 swirl(vec3 p) {
  float t = uDustTime * 0.15;
  vec3 a = vec3(1.7, 1.9, 1.5) * p.yzx + vec3(t, 1.2, 2.1);
  vec3 b = vec3(2.3, 2.1, 2.7) * p.zxy + vec3(0.4, t * 1.3, 0.9);
  vec3 ca = cos(a) * vec3(1.7, 1.9, 1.5);
  vec3 cb = cos(b) * vec3(2.3, 2.1, 2.7);
  return vec3(ca.z - cb.x, cb.y - ca.x, ca.y - cb.z);
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  if (uReset > 0.5) {
    outOffset = vec4(0.0);
    outVelocity = vec4(0.0);
    return;
  }
  uint id = uint(cell.y * ${V} + cell.x);
  vec4 home = texelFetch(tHome, cell, 0);
  vec4 seed = texelFetch(tSeed, cell, 0);
  vec3 o = texelFetch(tOffset, cell, 0).xyz;
  vec3 v = texelFetch(tVelocity, cell, 0).xyz;
  float life;
  float spread;
  vec3 base = drift(home, seed, id, life, spread);
  vec3 p = base + o;

  float k = mix(0.8, 2.2, random(id * 7u + 11u));
  vec3 acc = -k * o - 1.5 * sqrt(k) * v;

  vec2 gap = p.xy - uBrush.xy;
  float touch = exp(-dot(gap, gap) / 0.07) * uBrushPower;
  acc += (vec3(uBrush.zw, 0.0) - v) * touch * 14.0;
  float pace = length(v);
  if (pace > 1e-4) {
    vec3 heading = v / pace;
    vec3 curl = swirl(p * 1.6);
    acc += (curl - heading * dot(curl, heading)) * min(pace, 2.0) * 1.8;
  }

  if (uKick.z > 0.0) {
    vec3 jolt = vec3(random(id * 7u + 12u), random(id * 7u + 13u), random(id * 7u + 14u)) - 0.5;
    float near = exp(-dot(p.xy - uKick.xy, p.xy - uKick.xy) / 0.4);
    vec3 spinKick = vec3(-p.z, 0.0, p.x) * 0.9;
    vec3 lift = vec3(0.0, 0.5 + 0.8 * random(id * 7u + 15u), 0.0) * (0.3 + 0.7 * smoothstep(0.2, -0.8, p.y));
    v += (jolt * 0.8 + spinKick + lift) * uKick.z * (0.4 + 0.45 * near);
  }

  v += acc * uDt;
  o += v * uDt;
  vec3 q = base + o;
  float len = length(q);
  if (len > 0.97) {
    vec3 n = q / len;
    o -= n * (len - 0.97);
    v -= n * max(dot(v, n), 0.0) * 1.5;
  }
  outOffset = vec4(o, 1.0);
  outVelocity = vec4(v, 1.0);
}
`,Ma=`#version 300 es
precision highp float;

uniform sampler2D tScene;
uniform float uLight;
uniform float uDecode;

in vec2 vUv;
out vec4 fragColor;

vec3 soften(vec3 x) {
  vec3 over = max(x - 0.6, 0.0);
  return min(x, 0.6) + 0.4 * (1.0 - exp(-over / 0.4));
}

void main() {
  vec4 scene = texture(tScene, vUv) * uDecode;
  vec3 light = max(scene.rgb, 0.0);
  float peak = max(light.r, max(light.g, light.b));
  if (uLight > 0.5) {
    vec3 hue = light / max(peak, 1e-4);
    float cover = 1.0 - exp(-peak * 2.4);
    vec3 ink = hue * mix(0.92, 0.72, cover);
    float core = clamp(scene.a * 0.7, 0.0, 1.0) * cover;
    vec3 tint = mix(vec3(1.0), hue, 0.22);
    fragColor = vec4(tint * core + ink * cover * (1.0 - core), core + cover * (1.0 - core));
    return;
  }
  light += vec3(max(peak - 1.8, 0.0) * 0.25);
  vec3 shown = soften(light);
  fragColor = vec4(shown, max(shown.r, max(shown.g, shown.b)));
}
`,ka=({preset:e="plasma",color:a,theme:t="dark",size:i=.7,strands:s,crackle:l,flares:v,glow:w,sparks:x,particleCount:W,fill:Fe,motion:K,particleShape:ee,depth:te,sway:ve,twinkle:se,haze:qt,speed:Ot=1,dustSpeed:Gt,interactive:_t=!0,hoverStrength:Nt=.7,intro:Ut=!0,paused:Vt=!1,className:Wt="",style:Kt})=>{let Ze=(0,G.useRef)(null),Te=(0,G.useRef)(null),ze=(0,G.useRef)(null),$t=Pt[e]||Pt.plasma,y=(M,S)=>M??$t[S],et=y(a,"color"),Xt=(0,G.useMemo)(()=>{let M=t==="light";return{light:M,palette:ha(da(et,[.95,.36,.82]),M)}},[et,t]);return(0,G.useEffect)(()=>{Te.current={...Xt,size:i,strands:y(s,"strands"),crackle:y(l,"crackle"),flares:y(v,"flares"),glow:y(w,"glow"),sparks:y(x,"sparks"),particleCount:y(W,"particleCount"),fill:y(Fe,"fill"),motion:y(K,"motion"),particleShape:y(ee,"particleShape"),depth:y(te,"depth"),sway:y(ve,"sway"),twinkle:y(se,"twinkle"),haze:y(qt,"haze"),dustSpeed:y(Gt,"dustSpeed"),speed:Ot,interactive:_t,hoverStrength:Nt,intro:Ut,paused:Vt},ze.current?.()}),(0,G.useEffect)(()=>{let M=Ze.current;if(!M)return;let S=new zt({alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1}),r=S.gl;if(!S.isWebgl2){r.getExtension("WEBGL_lose_context")?.loseContext();return}let _=r.canvas;_.style.display="block",_.style.width="100%",_.style.height="100%",_.setAttribute("aria-hidden","true"),M.appendChild(_);let Ce=!!r.getExtension("EXT_color_buffer_float"),we=Ce||!!r.getExtension("EXT_color_buffer_half_float"),Pe=we?1:.25,Ee=new Ct(r),N=new Ve(r),ae=va(),ue=new We(r,{width:1,height:1,depth:!1,type:we?r.HALF_FLOAT:r.UNSIGNED_BYTE,format:r.RGBA,internalFormat:we?r.RGBA16F:r.RGBA,minFilter:r.NEAREST,magFilter:r.NEAREST}),ce=new Array(Ke*4).fill(0),u={uCenter:{value:[0,0]},uRadius:{value:1},uDpr:{value:1},uLine:{value:.6},uTime:{value:0},uFrame:{value:0},uBins:{value:420},uStrands:{value:5},uCrackle:{value:.6},uFlares:{value:.5},uGlow:{value:.8},uHaze:{value:.7},uFill:{value:.5},uPresence:{value:0},uUnfold:{value:0},uBloom:{value:0},uInside:{value:0},uEncode:{value:Pe},uRim:{value:[1,1,1]},uRimHot:{value:[1,1,1]},uRimMid:{value:[1,1,1]},uRimDeep:{value:[1,1,1]},uSpark:{value:[1,1,1]},uSparkGlow:{value:[1,1,1]},uHazeColor:{value:[0,0,0]},uEdgeColor:{value:[0,0,0]},uHeat:{value:[0,0,0,0]},uHarmonics:{value:ae.harmonics},uRates:{value:ae.rates},uPhases:{value:ae.phases},uFlareHarmonics:{value:ae.flareHarmonics},uFlareRates:{value:ae.flareRates},uFlarePhases:{value:ae.flarePhases},uArcs:{value:ce}},$={uDustTime:{value:0},uTurn:{value:[0,0]},uMotion:{value:0},uFill:u.uFill,tHome:{value:N},tSeed:{value:N}},z={...$,tOffset:{value:N},uStirred:{value:0},uCenter:u.uCenter,uViewport:{value:[1,1]},uRadius:u.uRadius,uDpr:u.uDpr,uDepth:{value:.6},uTwinkle:{value:.5},uPointScale:{value:1},uReveal:{value:0},uEncode:{value:Pe},uTones:{value:new Array(15).fill(1)},uRimTone:{value:[1,1,1]},uShape:{value:0}},C={...$,tOffset:{value:N},tVelocity:{value:N},uDt:{value:.016},uReset:{value:1},uBrush:{value:[0,0,0,0]},uBrushPower:{value:0},uKick:{value:[0,0,0,0]}},tt={tScene:{value:ue.texture},uLight:{value:0},uDecode:{value:1/Pe}},at=c=>(c.setBlendFunc(r.ONE,r.ONE),c),jt=new pe(r,{geometry:Ee,program:at(new me(r,{vertex:Xe,fragment:xa,uniforms:u,transparent:!0,depthTest:!1,depthWrite:!1}))}),Yt=at(new me(r,{vertex:ga,fragment:ya,uniforms:z,transparent:!0,depthTest:!1,depthWrite:!1})),U=we?new pe(r,{geometry:Ee,program:new me(r,{vertex:Xe,fragment:ba,uniforms:C,depthTest:!1,depthWrite:!1})}):null,Jt=new pe(r,{geometry:Ee,program:new me(r,{vertex:Xe,fragment:Ma,uniforms:tt,depthTest:!1,depthWrite:!1})}),De=c=>{c&&(r.deleteFramebuffer(c.buffer),c.textures.forEach(o=>r.deleteTexture(o.texture)))},ot=c=>new We(r,{width:V,height:c,color:2,depth:!1,type:Ce?r.FLOAT:r.HALF_FLOAT,format:r.RGBA,internalFormat:Ce?r.RGBA32F:r.RGBA16F,minFilter:r.NEAREST,magFilter:r.NEAREST}),rt=(c,o)=>new Ve(r,{image:c,width:V,height:o,type:r.FLOAT,format:r.RGBA,internalFormat:r.RGBA32F,minFilter:r.NEAREST,magFilter:r.NEAREST,generateMipmaps:!1,flipY:!1}),m=null,nt=()=>{m&&(m.mesh.geometry.remove(),r.deleteTexture(m.home.texture),r.deleteTexture(m.seed.texture),De(m.read),De(m.write),m=null)},lt=()=>{!U||!m||!m.read||!m.write||(C.tOffset.value=N,C.tVelocity.value=N,C.uReset.value=1,S.render({scene:U,target:m.read,clear:!1}),S.render({scene:U,target:m.write,clear:!1}),C.uReset.value=0)},Qt=c=>{let o=d(Math.round(c/100)*100,0,sa);if(m&&m.requested===o)return;if(nt(),!o){m=null;return}let n=wa(o),F=new Float32Array(n.count);for(let B=0;B<n.count;B++)F[B]=B;let T=new Tt(r,{aIndex:{size:1,data:F}});m={requested:o,rows:n.rows,home:rt(n.home,n.rows),seed:rt(n.seed,n.rows),mesh:new pe(r,{mode:r.POINTS,geometry:T,program:Yt}),read:U?ot(n.rows):null,write:U?ot(n.rows):null},$.tHome.value=m.home,$.tSeed.value=m.seed,lt(),X=0},xe=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,R=Ye(913),H=1,L=1,fe=0,Ae=performance.now(),Be=0,it=0,Ie=0,q=0,ge=!0,He=!0,A=0,X=0,Le=0,j=null,qe=.3,Y=[],h={x:0,y:0,inside:!1,fresh:!0},f={angle:0,velocity:0,power:0,near:0},p={x:0,y:0,vx:0,vy:0},g={x:0,y:0,vx:0,vy:0},st=()=>{H=Math.max(1,M.clientWidth),L=Math.max(1,M.clientHeight),S.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(ua/(H*L))),S.setSize(H,L),ue.setSize(r.canvas.width,r.canvas.height),J()},Oe=(c,o)=>{Y.length>=Ke||Y.push({start:c,span:(.05+R()*.07)*(R()<.5?-1:1),curl:.02+R()*.04,life:0,duration:.2+R()*.2,drift:(R()-.5)*.3,strength:o})},ut=c=>{if(fe=0,!He)return;let o=Te.current,n=Math.min(.05,Math.max(1/240,(c-Ae)/1e3));if(Ae=c,!o)return;let F=!o.paused&&!xe;q=o.intro&&!xe?Math.min(1,q+n/ca):1;let T=Et(O(0,.42,q)),B=Et(O(0,.32,q)),Ge=Math.sin(Math.PI*O(.22,.78,q))*.35,P=Math.max(8,d(o.size,.1,1.5)*Math.min(H,L)/2),oe=o.interactive&&!xe?d(o.hoverStrength,0,1):0,be=h.x-H/2,Me=L/2-h.y,Zt=Math.hypot(be,Me),_e=h.inside?oe:0;f.power<.02&&(f.angle=Math.atan2(Me,be),f.velocity=0);let ea=Dt(Math.atan2(Me,be)-f.angle);f.velocity+=(120*ea-19*f.velocity)*n,f.angle=Dt(f.angle+f.velocity*n),f.power+=(_e-f.power)*(1-Math.exp(-n/(_e>f.power?.3:.55)));let ta=Math.exp(-Math.pow((Zt-P)/(P*.45),2));f.near+=(ta-f.near)*(1-Math.exp(-n/.15)),A*=Math.exp(-n/.7);let re=be/P,ne=Me/P;Math.hypot(re-p.x,ne-p.y)>.6&&(h.fresh=!0),h.fresh&&(p.x=re,p.y=ne,p.vx=0,p.vy=0,h.fresh=!1);let xt=1-Math.exp(-n/.05);p.vx+=((re-p.x)/n-p.vx)*xt,p.vy+=((ne-p.y)/n-p.vy)*xt,p.x=re,p.y=ne;let Ne=Math.hypot(p.vx,p.vy),gt=Ne>4?4/Ne:1,aa=Math.exp(-Math.max(0,Math.hypot(re,ne)-1)*6),yt=h.inside?oe*aa*T:0;if(Le=Le*Math.exp(-n/1.2)+yt*Math.min(Ne,4)*n,F){let E=1+A*.6+f.power*f.near*.3,b=n*Math.max(0,o.speed)*2*E;Be+=b,it+=n*Math.max(0,o.dustSpeed)*(1+A*.4),Ie+=n*Math.max(0,o.dustSpeed);let ra=d(o.crackle+A*.5,0,1.5);if(o.sparks>.01&&q>.55&&(qe-=b*o.sparks*2*(.6+ra*.6),qe<=0)){let Q=f.power*f.near,Z=R()<Q*.7?f.angle+(R()-.5)*.8:R()<.7?Math.PI/2+(R()-.5)*1.5:R()*Math.PI*2;Oe(Z,.8+Q*.6+A*.4),qe=.15+R()*.6}for(let Q=Y.length-1;Q>=0;Q--){let Z=Y[Q];Z.life+=b,Z.start+=Z.drift*b,Z.life>=Z.duration&&Y.splice(Q,1)}}else Y.length=0;for(let E=0;E<Ke;E++){let b=Y[E];ce[E*4]=b?b.start:0,ce[E*4+1]=b?b.span:0,ce[E*4+2]=b?b.curl:0,ce[E*4+3]=b?Math.sin(Math.PI*b.life/b.duration)*b.strength:0}Qt(o.particleCount);let I=o.palette;u.uCenter.value=[H/2,L/2],u.uRadius.value=P,u.uDpr.value=S.dpr,u.uLine.value=Math.max(.6,P*.0035),u.uTime.value=Be,u.uFrame.value=Math.floor(Be*24)%1e5,u.uBins.value=d(Math.round(Math.PI*2*P/2.6),240,900),u.uStrands.value=Math.round(d(o.strands,1,Bt)),u.uCrackle.value=d(o.crackle,0,1)+A*.5+Ge,u.uFlares.value=d(o.flares,0,1),u.uGlow.value=d(o.glow,0,2)*(1+A*.5+Ge)*(o.light?.35:1),u.uHaze.value=d(o.haze,0,2)*(o.light?.6:1),u.uFill.value=d(o.fill,0,1),u.uPresence.value=T,u.uUnfold.value=B,u.uBloom.value=T*T,u.uInside.value=O(.2,.95,q),u.uRim.value=I.rim,u.uRimHot.value=I.rimHot,u.uRimMid.value=I.rimMid,u.uRimDeep.value=I.rimDeep,u.uSpark.value=I.spark,u.uSparkGlow.value=I.sparkGlow,u.uHazeColor.value=I.haze,u.uEdgeColor.value=I.edge,u.uHeat.value=[f.angle,f.near,f.power*T,0],$.uDustTime.value=it;let bt=h.inside?oe*T:0,Mt=d(re,-1.6,1.6)*bt,kt=d(ne,-1.6,1.6)*bt;g.vx+=(40*(Mt-g.x)-11*g.vx)*n,g.vy+=(40*(kt-g.y)-11*g.vy)*n,g.x+=g.vx*n,g.y+=g.vy*n;let St=d(o.sway,0,1);$.uTurn.value=[St*.42*Math.sin(Ie*.23)+g.x*.3,St*.12*Math.sin(Ie*.17+1.3)-g.y*.16],$.uMotion.value=la[o.motion]??0,z.uViewport.value=[H,L],z.uDepth.value=d(o.depth,0,1),z.uTwinkle.value=d(o.twinkle,0,1),z.uPointScale.value=Math.max(1,P/491),z.uReveal.value=O(.18,1,q),z.uTones.value=I.tones.flat(),z.uRimTone.value=I.rim,z.uShape.value=ia[o.particleShape]??0;let k=m;k&&U&&(Le>.002||j)&&(X=fa);let Ue=!1;if(k&&k.read&&k.write&&U&&X>0){C.uDt.value=Math.min(n,1/30),C.uBrush.value=[p.x,p.y,p.vx*gt,p.vy*gt],C.uBrushPower.value=yt,C.uKick.value=j?[j.x,j.y,j.strength,0]:[0,0,0,0],C.tOffset.value=k.read.textures[0],C.tVelocity.value=k.read.textures[1],S.render({scene:U,target:k.write,clear:!1});let E=k.read;k.read=k.write,k.write=E,X-=n,Ue=X>0,Ue||(X=0,lt())}j=null,z.uStirred.value=Ue?1:0,z.tOffset.value=k&&k.read?k.read.textures[0]:N,r.clearColor(0,0,0,0),S.render({scene:jt,target:ue,clear:!0}),m&&S.render({scene:m.mesh,target:ue,clear:!1}),tt.uLight.value=o.light?1:0,S.render({scene:Jt,clear:!1});let oa=Math.abs(_e-f.power)>.002||A>.002||X>0||Math.abs(f.velocity)>.01||Math.hypot(g.vx,g.vy,g.x-Mt,g.y-kt)>.001;ge&&(F||q<1||oa)&&(fe=requestAnimationFrame(ut))},J=()=>{fe||!ge||!He||(Ae=performance.now(),fe=requestAnimationFrame(ut))},ct=c=>{let o=M.getBoundingClientRect(),n=c.clientX-o.left,F=c.clientY-o.top;return{x:n,y:F,inside:n>=0&&F>=0&&n<=o.width&&F<=o.height}},ft=c=>{let o=ct(c);o.inside&&!h.inside&&(h.fresh=!0),h.x=o.x,h.y=o.y,h.inside=o.inside,o.inside&&J()},dt=c=>{let o=Te.current,n=ct(c);if(!o||!o.interactive||xe||!n.inside)return;h.inside||(h.fresh=!0),h.x=n.x,h.y=n.y,h.inside=!0;let F=Math.max(8,d(o.size,.1,1.5)*Math.min(H,L)/2),T=(n.x-H/2)/F,B=(L/2-n.y)/F;if(Math.hypot(T,B)>1.3)return;let P=d(o.hoverStrength,0,1);j={x:T,y:B,strength:P*1.2},A=Math.max(A,P);let oe=Math.atan2(B,T);Oe(oe+(R()-.5)*.5,1.3),Oe(oe+Math.PI+(R()-.5)*1.2,1.1),J()},ye=()=>{h.inside=!1,J()},mt=c=>{c.relatedTarget||ye()},pt=c=>{c.pointerType==="touch"&&ye()},ht=()=>{document.hidden||J()};window.addEventListener("pointermove",ft,{passive:!0}),window.addEventListener("pointerdown",dt,{passive:!0}),window.addEventListener("pointerout",mt,{passive:!0}),window.addEventListener("pointerup",pt,{passive:!0}),window.addEventListener("blur",ye),document.addEventListener("visibilitychange",ht);let vt=new ResizeObserver(st);vt.observe(M);let wt=new IntersectionObserver(([c])=>{ge=c.isIntersecting,J()});return wt.observe(M),ze.current=J,st(),()=>{He=!1,ge=!1,cancelAnimationFrame(fe),vt.disconnect(),wt.disconnect(),window.removeEventListener("pointermove",ft),window.removeEventListener("pointerdown",dt),window.removeEventListener("pointerout",mt),window.removeEventListener("pointerup",pt),window.removeEventListener("blur",ye),document.removeEventListener("visibilitychange",ht),ze.current=null,nt(),De(ue),r.getExtension("WEBGL_lose_context")?.loseContext(),_.parentNode&&_.parentNode.removeChild(_)}},[]),(0,Lt.jsx)("div",{ref:Ze,className:`relative w-full h-full overflow-hidden ${Wt}`.trim(),style:Kt})},Ht=ka;var Qe=de(ke(),1),Sa=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Re=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Da=Sa.map((e,a)=>({id:a+1,image:e,src:e,img:e,url:e,title:Re[a],text:Re[a],label:Re[a],alt:Re[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ra({big:e}){return(0,Qe.jsx)(Ft,{big:e,dark:!0,center:!0,zoom:1,drive:!1,children:(0,Qe.jsx)(Ht,{})})}var Aa=Rt(Ra);export{Aa as default};
