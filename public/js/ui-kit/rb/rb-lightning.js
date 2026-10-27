import{c as C,i as Ce,j as D,l as be,m as we}from"./chunks/chunk-6IYH4WPJ.js";var R=C(Ce(),1),Pe=C(D(),1),Me=4,M=4,ye=.11,N=1.3,Oe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,Te=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uPhase;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uSize;
uniform float uThickness;
uniform float uGlow;
uniform float uFlicker;
uniform float uBranches;
uniform float uXOffset;
uniform float uAngle;
uniform float uSpread;
uniform int uBolts;
uniform vec4 uPointer;
uniform vec4 uStrikes[${M}];
uniform vec4 uStrikeInfo[${M}];
uniform float uFlash;
uniform float uIntro;
uniform float uLight;
uniform float uFade;
uniform float uOpacity;

out vec4 outColor;

const float TAU = 6.28318530718;
const float PERIOD = 8.0;
const float WARP = 2.1;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float gnoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(mod(i, period)), f);
  float b = dot(hash22(mod(i + vec2(1.0, 0.0), period)), f - vec2(1.0, 0.0));
  float c = dot(hash22(mod(i + vec2(0.0, 1.0), period)), f - vec2(0.0, 1.0));
  float d = dot(hash22(mod(i + vec2(1.0, 1.0), period)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float period = PERIOD;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * gnoise(p, period);
    p = p * 2.0 + vec2(17.0, 31.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float warpField(vec2 q, float base, float reach, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float period = PERIOD;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float weight = 1.0;
    if (i >= 3) {
      float estimate = abs(base + value * WARP);
      weight = 1.0 - smoothstep(reach * 0.6, reach, estimate);
      if (weight <= 0.0) break;
      reach *= 0.62;
    }
    value += amplitude * gnoise(q, period) * weight;
    q = q * 2.0 + vec2(17.0, 31.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return value * WARP;
}

float flicker(float seed) {
  float steady = 0.82 + 0.18 * sin(TAU * (uPhase * 13.0 + seed)) * sin(TAU * (uPhase * 7.0 + seed * 1.7));
  float burst = 0.0;
  for (int j = 0; j < 3; j++) {
    float at = hash11(seed * 17.0 + float(j) * 5.3);
    float since = fract(uPhase - at) * 10.0;
    burst += exp(-since * 7.0) * (0.75 + 0.45 * sin(since * 70.0));
  }
  return mix(1.0, steady + burst * 0.9, uFlicker);
}

float glow(float d, float width) {
  float reach = d / (width * 3.5);
  return width / (d + width * 0.08) / (1.0 + reach * reach);
}

vec2 gDrift;
float gWidth;
float gCore;
float gPixel;

vec3 bolt(
  vec2 p,
  vec2 offset,
  float seed,
  float pinned,
  float front,
  float strength,
  float branches,
  float blink,
  float branchGain,
  vec2 range,
  float heat,
  int octaves
) {
  vec2 q = p * uSize + gDrift + offset;
  float pin = pinned > 0.5 ? fbm(gDrift + offset, octaves) * WARP : 0.0;
  float warp = warpField(q, p.x - pin, 1.3 * max(1.0, uGlow), octaves) - pin;
  float crackle = heat > 0.001 ? heat * 0.012 * gnoise(q * 9.0 + vec2(41.0, 7.0), PERIOD * 9.0) : 0.0;
  float x = p.x + warp + crackle;
  float d = length(vec2(x, max(front - p.y, 0.0)));
  float energy = glow(d, gWidth * (1.0 + heat * 0.6)) * strength;
  float core = (1.0 - smoothstep(gCore - gPixel, gCore + gPixel, d)) * min(strength, 1.6);
  float line = glow(d, gWidth * 0.55) * strength;

  for (int k = 0; k < 6; k++) {
    float order = float(k) + 0.5;
    if (order > branches + heat * 2.0) break;
    float h = seed * 31.0 + float(k) * 13.7;
    float start = mix(range.x, range.y, hash11(h));
    float span = mix(0.22, 0.7, hash11(h + 3.0));
    if (pinned > 0.5) span = min(span, max(start - 0.04, 0.06));
    float along = (start - p.y) / span;
    if (along <= 0.0 || along >= 1.0) continue;
    float side = hash11(h + 1.0) > 0.5 ? 1.0 : -1.0;
    float slope = mix(0.35, 1.15, hash11(h + 2.0));
    float offset = x - side * slope * (start - p.y);
    if (abs(offset) - 0.12 * along > gWidth * 13.0) continue;
    float gain = branchGain;
    if (blink > 0.5) {
      float window = fract(uPhase * 3.0 + hash11(h + 4.0));
      float shown = smoothstep(0.0, 0.03, window) * (1.0 - smoothstep(0.3, 0.42, window));
      gain *= max(shown, heat * 0.8);
      if (gain <= 0.001) continue;
      gain *= flicker(seed + order);
    }
    if (gain <= 0.001) continue;
    vec2 jq = q * 3.0 + vec2(order * 11.0, order * 5.0);
    float jag = (gnoise(jq, PERIOD * 3.0) * 0.12 + gnoise(jq * 3.0 + vec2(5.0, 9.0), PERIOD * 9.0) * 0.035) * along;
    float bd = abs(offset - jag);
    float taper = pow(1.0 - along, 1.6) * smoothstep(0.0, 0.2, along) * smoothstep(front, front + 0.08, p.y);
    energy += glow(bd, gWidth * 0.4) * taper * gain;
    line += glow(bd, gWidth * 0.2) * taper * gain;
    core += (1.0 - smoothstep(gCore * 0.6 - gPixel, gCore * 0.6 + gPixel, bd)) * taper * min(gain, 1.0) * 0.8;
  }
  return vec3(energy, core, line);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  gPixel = 2.0 / uResolution.y;
  gDrift = vec2(PERIOD) * uPhase;
  gWidth = 0.07 * uGlow;
  gCore = 0.0032 * uThickness;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  mat2 turn = mat2(ca, -sa, sa, ca);
  vec2 local = turn * uv;
  vec2 pointer = turn * uPointer.xy;
  vec2 toPointer = uv - uPointer.xy;
  float heat = uPointer.z * exp(-dot(toPointer, toPointer) / 0.09);
  int octaves = uResolution.y > 1400.0 ? 8 : 7;

  float energy = 0.0;
  float core = 0.0;
  float line = 0.0;

  for (int b = 0; b < ${Me}; b++) {
    if (b >= uBolts) break;
    float seed = float(b) * 7.13 + 0.37;
    float lane = uXOffset + (float(b) - 0.5 * float(uBolts - 1)) * uSpread;
    vec2 p = local - vec2(lane, 0.0);
    float near = exp(-pow(pointer.x - lane, 2.0) / 0.5);
    float lean = uPointer.z * uPointer.w * near * exp(-pow(p.y - pointer.y, 2.0) / 0.14);
    p.x -= lean * clamp(pointer.x - lane, -0.45, 0.45) * 0.55;
    float reveal = uIntro >= 1.0 ? 1.0 : smoothstep(0.0, 0.08, uv.y - (1.1 - 2.4 * uIntro));
    float strength = flicker(seed) * reveal * (1.0 + heat * 1.4) * (1.0 + uFlash);
    vec3 hit = bolt(
      p,
      vec2(float(b) * 3.0, float(b) * 5.0),
      seed,
      0.0,
      -1000.0,
      strength,
      uBranches * 6.0,
      1.0,
      reveal,
      vec2(-0.75, 0.9),
      heat,
      octaves
    );
    energy += hit.x;
    core += hit.y;
    line += hit.z;
  }

  for (int j = 0; j < ${M}; j++) {
    vec4 strike = uStrikes[j];
    if (strike.w <= 0.001) continue;
    vec4 info = uStrikeInfo[j];
    vec2 p = local - turn * strike.xy;
    if (p.y < strike.z - 1.6) continue;
    vec3 hit = bolt(
      p,
      vec2(info.x * 0.731, info.x * 1.377),
      info.x,
      1.0,
      strike.z,
      strike.w,
      uBranches * 6.0,
      0.0,
      strike.w,
      vec2(0.12, info.y),
      heat,
      octaves
    );
    energy += hit.x + info.z * strike.w * glow(length(p), gWidth * 0.5) * 0.12;
    core += hit.y;
    line += hit.z;
  }

  float e = energy * uIntensity * 0.6;
  float hot = clamp(core + smoothstep(6.0, 20.0, e) * 0.55, 0.0, 1.0);
  vec2 edge = min(gl_FragCoord.xy, uResolution - gl_FragCoord.xy) / (uResolution.y * max(uFade, 0.0001) * 0.5);
  float fade = uFade > 0.0 ? smoothstep(0.0, 1.0, edge.x) * smoothstep(0.0, 1.0, edge.y) : 1.0;

  vec3 rgb;
  float alpha;
  if (uLight > 0.5) {
    float stroke = smoothstep(1.0, 3.6, line * uIntensity);
    float halo = 1.0 - exp(-e * 0.35);
    vec3 ink = uColor * 0.82;
    alpha = clamp(stroke + halo * 0.15, 0.0, 1.0);
    rgb = mix(ink, vec3(1.0), hot * 0.85) * alpha;
  } else {
    vec3 lit = 1.0 - exp(-uColor * e * 0.9);
    rgb = mix(lit, vec3(1.0), hot);
    alpha = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0);
  }
  float keep = fade * uOpacity;
  outColor = vec4(rgb * keep, alpha * keep);
}
`,De=l=>{let i=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(l).trim());if(!i)return[.5,.6,1];let P=i[1].length===3?i[1].replace(/./g,u=>u+u):i[1];return[0,2,4].map(u=>parseInt(P.slice(u,u+2),16)/255)},Le=l=>{let i=Math.min(1,Math.max(0,l));return i*i*i*(i*(i*6-15)+10)},ke=(l,i,P)=>{let u=l.createShader(i);return l.shaderSource(u,P),l.compileShader(u),u},ze=["uResolution","uPhase","uColor","uIntensity","uSize","uThickness","uGlow","uFlicker","uBranches","uXOffset","uAngle","uSpread","uBolts","uPointer","uStrikes","uStrikeInfo","uFlash","uIntro","uLight","uFade","uOpacity"],_e=({color:l="#4d6bff",bolts:i=1,spread:P=.6,branches:u=.5,xOffset:V=0,angle:Y=0,size:H=1,thickness:K=1,glow:J=1,intensity:Q=1,speed:Z=1,flicker:ee=.6,mouseInteraction:Ae=!0,mouseStrength:Ie=1,clickStrike:Se=!0,intro:Fe=!0,fade:te=0,opacity:oe=1,lightMode:ae=!1,paused:ne=!1,dpr:ie,className:Ee="",style:Be})=>{let re=(0,R.useRef)(null),z=(0,R.useRef)(null),se={color:l,bolts:i,spread:P,branches:u,xOffset:V,angle:Y,size:H,thickness:K,glow:J,intensity:Q,speed:Z,flicker:ee,mouseInteraction:Ae,mouseStrength:Ie,clickStrike:Se,intro:Fe,fade:te,opacity:oe,lightMode:ae,paused:ne,dpr:ie},x=(0,R.useRef)(se);return x.current=se,(0,R.useEffect)(()=>{let c=re.current;if(!c)return;let e=c.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!e)return;let b=e.createProgram();if(e.attachShader(b,ke(e,e.VERTEX_SHADER,Oe)),e.attachShader(b,ke(e,e.FRAGMENT_SHADER,Te)),e.linkProgram(b),!e.getProgramParameter(b,e.LINK_STATUS))return;let r=Object.fromEntries(ze.map(a=>[a,e.getUniformLocation(b,a)])),_=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,_),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);let fe=e.getAttribLocation(b,"aPosition"),A=window.matchMedia("(prefers-reduced-motion: reduce)").matches,h={width:1,height:1,left:0,top:0},o={x:0,y:0,vx:0,vy:0,tx:0,ty:0,presence:0,inside:!1},j=Array.from({length:M},()=>({x:0,y:0,born:-1,seed:0,reach:2})),I=new Float32Array(M*4),S=new Float32Array(M*4),q=0,W=.21,w=x.current.intro&&!A?-1:null,O=!0,E=0,G=0,U=!1,X=()=>{let a=c.getBoundingClientRect(),t=Math.min(x.current.dpr??window.devicePixelRatio??1,2);h.width=Math.max(1,a.width),h.height=Math.max(1,a.height),h.left=a.left,h.top=a.top;let s=Math.max(1,Math.round(h.width*t)),f=Math.max(1,Math.round(h.height*t));(c.width!==s||c.height!==f)&&(c.width=s,c.height=f)},le=(a,t)=>[(2*a-h.width)/h.height,(h.height-2*t)/h.height],T=a=>{let t=x.current,s=De(t.color),f=0;for(let g=0;g<M;g++){let d=j[g],v=d.born<0?-1:(a-d.born)/1e3,n=g*4;if(v<0||v>N){I.fill(0,n,n+4),S.fill(0,n,n+4);continue}let xe=Math.min(1,v/ye),p=v-ye,B=.45+.35*xe;p>=0&&(B=1.8*Math.exp(-p*5.5)*(.85+.2*Math.sin(p*70)),p>.17&&(B+=Math.exp(-(p-.17)*9)),p>.33&&(B+=.7*Math.exp(-(p-.33)*10)),f+=.5*Math.exp(-p*9),p>.17&&(f+=.25*Math.exp(-(p-.17)*12))),B*=1-Le((v-(N-.4))/.4),I[n]=d.x,I[n+1]=d.y,I[n+2]=d.reach*(1-xe**1.6),I[n+3]=B,S[n]=d.seed,S[n+1]=d.reach,S[n+2]=p>=0?1:0,S[n+3]=0}let m=w===null?1:w<0?0:Math.min(1,(a-w)/420),[k,F]=le(o.x,o.y);e.viewport(0,0,c.width,c.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(b),e.bindBuffer(e.ARRAY_BUFFER,_),e.enableVertexAttribArray(fe),e.vertexAttribPointer(fe,2,e.FLOAT,!1,0,0),e.uniform2f(r.uResolution,c.width,c.height),e.uniform1f(r.uPhase,W),e.uniform3f(r.uColor,s[0],s[1],s[2]),e.uniform1f(r.uIntensity,Math.max(0,t.intensity)),e.uniform1f(r.uSize,Math.max(.05,t.size)),e.uniform1f(r.uThickness,Math.max(0,t.thickness)),e.uniform1f(r.uGlow,Math.max(.01,t.glow)),e.uniform1f(r.uFlicker,A?0:Math.min(1,Math.max(0,t.flicker))),e.uniform1f(r.uBranches,Math.min(1,Math.max(0,t.branches))),e.uniform1f(r.uXOffset,t.xOffset),e.uniform1f(r.uAngle,t.angle*Math.PI/180),e.uniform1f(r.uSpread,t.spread),e.uniform1i(r.uBolts,Math.min(Me,Math.max(1,Math.round(t.bolts)))),e.uniform4f(r.uPointer,k,F,o.presence,Math.max(0,t.mouseStrength)),e.uniform4fv(r.uStrikes,I),e.uniform4fv(r.uStrikeInfo,S),e.uniform1f(r.uFlash,Math.min(1,f)),e.uniform1f(r.uIntro,m),e.uniform1f(r.uLight,t.lightMode?1:0),e.uniform1f(r.uFade,Math.min(1,Math.max(0,t.fade))),e.uniform1f(r.uOpacity,Math.min(1,Math.max(0,t.opacity))),e.drawArrays(e.TRIANGLE_STRIP,0,4)},ce=a=>{if(E=0,U||!O||document.hidden)return;let t=x.current,s=Math.min(.05,(a-G)/1e3||0);G=a,w!==null&&w<0&&(w=a),!t.paused&&!A&&(W=(W+s*Math.max(0,t.speed)/10)%1);let f=Math.max(1,Math.ceil(s/(1/120))),m=s/f;for(let n=0;n<f;n++)o.vx+=(120*(o.tx-o.x)-19*o.vx)*m,o.vy+=(120*(o.ty-o.y)-19*o.vy)*m,o.x+=o.vx*m,o.y+=o.vy*m;let k=t.mouseInteraction&&o.inside&&!A?1:0;o.presence+=(k-o.presence)*(1-Math.exp(-s/(k>o.presence?.3:.55))),T(a);let F=j.some(n=>n.born>=0&&a-n.born<N*1e3+50),g=w!==null&&a-w<450,d=!t.paused&&!A&&t.speed>0,v=Math.abs(k-o.presence)>.002||Math.abs(o.vx)+Math.abs(o.vy)>.5;(d||F||g||v)&&(E=requestAnimationFrame(ce))},y=()=>{E||U||!O||document.hidden||(G=performance.now(),E=requestAnimationFrame(ce))},ue=a=>{let t=c.getBoundingClientRect(),s=a.clientX-t.left,f=a.clientY-t.top;return[s,f,s>=0&&f>=0&&s<=t.width&&f<=t.height]},he=a=>{let[t,s,f]=ue(a);f&&!o.inside&&o.presence<.02&&(o.x=t,o.y=s,o.vx=o.vy=0),o.tx=t,o.ty=s,o.inside=f,x.current.mouseInteraction&&y()},de=a=>{a.relatedTarget||(o.inside=!1,y())},pe=a=>{if(!x.current.clickStrike||A)return;let[t,s,f]=ue(a);if(!f)return;let[m,k]=le(t,s),F=x.current.angle*Math.PI/180,g=Math.sin(F),d=Math.cos(F),v=h.width/h.height*Math.abs(g)+Math.abs(d),n=j[q];q=(q+1)%M,n.x=m,n.y=k,n.reach=v-(-g*m+d*k)+.2,n.born=performance.now(),n.seed=Math.random()*100,y()};window.addEventListener("pointermove",he,{passive:!0}),window.addEventListener("pointerdown",pe,{passive:!0}),window.addEventListener("pointerout",de);let me=new ResizeObserver(()=>{X(),T(performance.now()),y()});me.observe(c);let ge=new IntersectionObserver(([a])=>{O=a.isIntersecting,O&&y()});ge.observe(c);let ve=()=>{document.hidden||y()};return document.addEventListener("visibilitychange",ve),X(),T(performance.now()),y(),z.current={refresh:()=>{X(),T(performance.now()),y()}},()=>{U=!0,cancelAnimationFrame(E),me.disconnect(),ge.disconnect(),window.removeEventListener("pointermove",he),window.removeEventListener("pointerdown",pe),window.removeEventListener("pointerout",de),document.removeEventListener("visibilitychange",ve),e.deleteBuffer(_),e.deleteProgram(b),z.current=null}},[]),(0,R.useEffect)(()=>{z.current?.refresh()},[l,i,P,u,V,Y,H,K,J,Q,Z,ee,te,oe,ae,ne,ie]),(0,Pe.jsx)("canvas",{ref:re,className:`relative block h-full w-full ${Ee}`.trim(),style:Be})},Re=_e;var $=C(D(),1),je=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],L=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],$e=je.map((l,i)=>({id:i+1,image:l,src:l,img:l,url:l,title:L[i],text:L[i],label:L[i],alt:L[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function qe({big:l}){return(0,$.jsx)(we,{big:l,dark:!0,center:!1,zoom:1,drive:!1,children:(0,$.jsx)(Re,{})})}var Ve=be(qe);export{Ve as default};
