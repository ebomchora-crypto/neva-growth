import{c as A,i as Ge,j as S,l as te,m as oe}from"./chunks/chunk-6IYH4WPJ.js";var x=A(Ge(),1),se=A(S(),1),He="relative h-full w-full overflow-hidden",ze="absolute inset-0 block h-full w-full",I=6,v=16,T=8,re=.06,le=.9,fe=1.8,We=2.4,Ve=.4,$e={molten:.5,ember:.3,frost:.7},Xe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ue=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uClock;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uThickness;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uBalance;
uniform float uGrain;
uniform float uOpacity;
uniform vec2 uOffset;
uniform vec2 uRotation;
uniform vec2 uDrift;
uniform vec3 uColors[${I}];
uniform int uColorCount;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform vec3 uReveal;
uniform vec4 uTrail[${v}];
uniform float uTrailWeight[${v}];
uniform int uTrailCount;
uniform vec4 uFlares[${T}];
uniform int uFlareCount;
uniform vec4 uHeat;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 palette(float g) {
  if (uColorCount <= 1) return uColors[0];
  float t = g < uBalance ? 0.5 * g / uBalance : 0.5 + 0.5 * (g - uBalance) / (1.0 - uBalance);
  float scaled = t * float(uColorCount - 1);
  int index = int(min(floor(scaled), float(uColorCount - 2)));
  return mix(uColors[index], uColors[index + 1], smoothstep(0.0, 1.0, scaled - float(index)));
}

float warmth(float age, float weight, vec2 offset) {
  float life = clamp(age / ${le.toFixed(2)}, 0.0, 1.0);
  vec2 spread = offset / (uHeat.z * (1.0 + 0.8 * life));
  return weight * (1.0 - life) * (1.0 - life) * exp(-dot(spread, spread));
}

float trailHeat(vec2 q) {
  float heat = 0.0;
  for (int k = 0; k < ${v}; k++) {
    if (k >= uTrailCount) break;
    vec4 a = uTrail[k];
    float weight = uTrailWeight[k];
    heat = max(heat, warmth(a.z, weight, q - a.xy));
    int next = min(k + 1, ${v-1});
    if (next == k || next >= uTrailCount) continue;
    vec4 b = uTrail[next];
    float older = uTrailWeight[next];
    vec2 ab = b.xy - a.xy;
    float span = dot(ab, ab);
    float t = span > 1e-10 ? clamp(dot(q - a.xy, ab) / span, 0.0, 1.0) : 0.0;
    float even = smoothstep(0.0, uHeat.z, sqrt(span));
    float age = mix(min(a.w, b.z), mix(a.w, b.z, t), even);
    float strength = mix(max(weight, older), mix(weight, older, t), even);
    heat = max(heat, warmth(age, strength, q - a.xy - ab * t));
  }
  return heat;
}

float flareHeat(vec2 q) {
  float heat = 0.0;
  for (int k = 0; k < ${T}; k++) {
    if (k >= uFlareCount) break;
    vec4 f = uFlares[k];
    float life = clamp(f.z / ${fe.toFixed(2)}, 0.0, 1.0);
    float rise = 1.0 - exp(-f.z / 0.07);
    float fall = exp(-3.0 * life) * (1.0 - life) * (1.0 - life);
    vec2 offset = (q - f.xy) / (uHeat.z * (0.9 + 1.6 * sqrt(life)));
    heat += rise * fall * exp(-dot(offset, offset));
  }
  return heat;
}

void main() {
  float time = uTime;
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec2 q = uv - uOffset;
  vec2 view = vec2(q.x * uRotation.x - q.y * uRotation.y, q.x * uRotation.y + q.y * uRotation.x);
  vec2 p = uScale * view - 0.5;
  p += uDrift;

  float heat = 0.0;
  float flare = 0.0;
  if (uHeat.w > 0.5) {
    heat = trailHeat(uv) * uHeat.x;
    flare = flareHeat(uv) * uHeat.y;
  }
  float power = uThickness * (1.0 + (heat + flare) * 0.45);

  vec2 i = p;
  float c = 0.0;
  float blurred = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;
  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float layers = ceil(uDetail);

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= layers) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    float l = length(vec2(sin(i.x + t), cos(i.y + t)));
    float footprint = 0.5 * length(vec2(dFdx(l), dFdy(l)));
    l = sqrt(l * l + footprint * footprint);
    float weight = clamp(uDetail - n, 0.0, 1.0);
    c += weight * uGlow / (power == 1.0 ? l : pow(max(l, 1e-6), power));
    if (uReveal.y > 0.5) blurred += weight * uGlow / sqrt(l * l + 0.0025);
  }

  c /= 6.0;
  c *= 1.0 + heat * 0.25 + flare * 0.6;

  float reveal = 1.0;
  float front = 0.0;
  if (uReveal.y > 0.5) {
    float level = log(max(blurred / 6.0, 1e-5)) - uReveal.x;
    reveal = smoothstep(-1.0, 1.0, level) * smoothstep(0.0, 0.08, uReveal.z);
    front = 0.2 * exp(-level * level * 1.5) * smoothstep(-2.6, -0.6, uReveal.x);
  }

  float g = clamp(max(c - uBlackPoint, 0.0) * uBrightness + front, 0.0, 1.0);
  vec3 col = palette(g);
  float noise = hash(gl_FragCoord.xy + fract(uClock) * 97.0) - 0.5;
  float a;
  if (uLight < 0.5) {
    a = g + noise * uGrain;
  } else {
    float lift = max(g - 0.03, 0.0) / 0.97;
    a = (1.0 - exp(-6.0 * lift)) / (1.0 - exp(-6.0)) + noise * uGrain * g;
  }
  a = clamp(a + noise / 255.0, 0.0, 1.0) * reveal * uOpacity;

  if (uOpaque > 0.5) {
    outColor = vec4(mix(uBackground, col, a), 1.0);
  } else {
    outColor = vec4(col * a, a);
  }
}`,b=(n,f,m)=>Math.min(m,Math.max(f,n)),R=null,ae=(n,f)=>{if(n==="transparent")return null;if(typeof document>"u"||(R||(R=document.createElement("canvas").getContext("2d")),!R))return f;R.fillStyle="#000000",R.fillStyle=n;let m=R.fillStyle;if(m.startsWith("#")){let C=parseInt(m.slice(1),16);return[(C>>16&255)/255,(C>>8&255)/255,(C&255)/255]}let s=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(m);return s?s[4]!==void 0&&Number(s[4])===0?null:[Number(s[1])/255,Number(s[2])/255,Number(s[3])/255]:f},ie=(n,f,m)=>{let s=n.createShader(f);return s?(n.shaderSource(s,m),n.compileShader(s),n.getShaderParameter(s,n.COMPILE_STATUS)?s:(n.deleteShader(s),null)):null},ne=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1);function N({colors:n=["#5227FF","#FF9FFC"],coreColor:f="#FFFFFF",backgroundColor:m="transparent",lightMode:s=!1,speed:C=.35,scale:ue=4,detail:ce=3,glow:me=1.6,thickness:de=1,swirl:he=1,turbulence:pe=.2,haze:ge=.75,brightness:ve=1.3,colorMode:xe="molten",rotation:we=0,offsetX:be=0,offsetY:Re=0,drift:Ce=.3,grain:E=.05,opacity:ke=1,intro:ye=!0,mouseInteraction:Fe=!0,mouseStrength:Ae=.5,flareOnClick:Se=!0,paused:Te=!1,dpr:Me=2,className:Ee="",style:Be}){let H=(0,x.useRef)(null),z=[...n.slice(0,I-1),f].join("|"),Oe=(0,x.useMemo)(()=>z.split("|").map(h=>ae(h,[1,1,1])??[1,1,1]),[z]),Le=(0,x.useMemo)(()=>ae(m,null),[m]),W={palette:Oe,paper:Le,lightMode:s,speed:C,scale:Math.max(.1,ue),detail:b(ce,1,8),glow:Math.max(0,me),thickness:b(de,.2,3),swirl:he,fold:-pe,blackPoint:.2*(1-b(ge,0,1)),brightness:Math.max(0,ve),balance:$e[xe]??.5,rotation:we*Math.PI/180,offset:[be,Re],drift:Math.max(0,Ce),grain:typeof E=="number"?Math.max(0,E):E?.05:0,opacity:b(ke,0,1),intro:ye,mouseInteraction:Fe,mouseStrength:b(Ae,0,1),flareOnClick:Se,paused:Te,dpr:Math.max(.5,Me)},k=(0,x.useRef)(W);return k.current=W,(0,x.useEffect)(()=>{let h=H.current;if(!h)return;let p=document.createElement("canvas");p.className=ze,h.appendChild(p);let t=p.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!t){p.remove();return}let B=ie(t,t.VERTEX_SHADER,Xe),O=ie(t,t.FRAGMENT_SHADER,Ue),d=t.createProgram();if(!B||!O||!d){p.remove();return}if(t.attachShader(d,B),t.attachShader(d,O),t.bindAttribLocation(d,0,"aPosition"),t.linkProgram(d),t.deleteShader(B),t.deleteShader(O),!t.getProgramParameter(d,t.LINK_STATUS)){t.deleteProgram(d),p.remove();return}let Pe=["uResolution","uTime","uClock","uScale","uDetail","uGlow","uThickness","uSwirl","uFold","uBlackPoint","uBrightness","uBalance","uGrain","uOpacity","uOffset","uRotation","uDrift","uColors","uColorCount","uBackground","uOpaque","uLight","uReveal","uTrail","uTrailWeight","uTrailCount","uFlares","uFlareCount","uHeat"],a={};Pe.forEach(r=>{a[r]=t.getUniformLocation(d,r)});let V=t.createVertexArray();t.bindVertexArray(V);let $=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,$),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0),t.useProgram(d);let L=new Float32Array(I*3),P=new Float32Array(v*4),q=new Float32Array(v),D=new Float32Array(T*4),e={width:1,height:1,time:Ve,clock:0,last:0,raf:0,visible:!1,introAt:-1,pointer:[.5,.5],inside:!1,presence:0,drift:[0,0],trail:[],flares:[],quiet:0,seen:null},_=()=>{let r=k.current,o=Math.min(window.devicePixelRatio||1,r.dpr),l=Math.max(1,Math.round(h.clientWidth*o)),i=Math.max(1,Math.round(h.clientHeight*o));l===e.width&&i===e.height||(e.quiet=0,e.width=l,e.height=i,p.width=l,p.height=i)},X=r=>[(r[0]-.5)*(e.width/Math.max(e.height,1)),.5-r[1]],U=(r,o)=>!r.intro||o||e.introAt<0?1:b((e.clock-e.introAt)/We,0,1),qe=r=>{let o=k.current,l=U(o,r),i=e.width/Math.max(e.height,1);t.viewport(0,0,e.width,e.height),t.uniform2f(a.uResolution,e.width,e.height),t.uniform1f(a.uTime,e.time),t.uniform1f(a.uClock,e.clock),t.uniform1f(a.uScale,o.scale),t.uniform1f(a.uDetail,o.detail),t.uniform1f(a.uGlow,o.glow*.1),t.uniform1f(a.uThickness,o.thickness),t.uniform1f(a.uSwirl,o.swirl),t.uniform1f(a.uFold,o.fold),t.uniform1f(a.uBlackPoint,o.blackPoint),t.uniform1f(a.uBrightness,o.brightness),t.uniform1f(a.uBalance,o.balance),t.uniform1f(a.uGrain,o.grain),t.uniform1f(a.uOpacity,o.opacity),t.uniform2f(a.uOffset,o.offset[0]*i,-o.offset[1]),t.uniform2f(a.uRotation,Math.cos(o.rotation),Math.sin(o.rotation)),t.uniform2f(a.uDrift,e.drift[0],e.drift[1]),L.fill(0),o.palette.forEach((c,g)=>L.set(c,g*3)),t.uniform3fv(a.uColors,L),t.uniform1i(a.uColorCount,o.palette.length);let u=o.paper??[0,0,0];t.uniform3f(a.uBackground,u[0],u[1],u[2]),t.uniform1f(a.uOpaque,o.paper?1:0),t.uniform1f(a.uLight,o.lightMode?1:0),t.uniform3f(a.uReveal,Math.log(1.6)+Math.log(.01/1.6)*l,l<1?1:0,l),P.fill(0),q.fill(0),e.trail.forEach((c,g)=>{let[y,F]=X(c.at);P.set([y,F,e.clock-c.time,e.clock-c.arrive],g*4),q[g]=c.weight}),t.uniform4fv(a.uTrail,P),t.uniform1fv(a.uTrailWeight,q),t.uniform1i(a.uTrailCount,e.trail.length),D.fill(0),e.flares.forEach((c,g)=>{let[y,F]=X(c.at);D.set([y,F,e.clock-c.time,1],g*4)}),t.uniform4fv(a.uFlares,D),t.uniform1i(a.uFlareCount,e.flares.length);let w=e.trail.length>0||e.flares.length>0;t.uniform4f(a.uHeat,o.mouseStrength*2,3.2,.2,w?1:0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLES,0,3)},De=(r,o)=>{let l=r.mouseInteraction&&e.inside&&r.mouseStrength>0;e.presence+=((l?1:0)-e.presence)*(1-Math.exp(-o/.25)),e.trail=e.trail.filter(u=>u.live||e.clock-u.time<le);let i=e.trail[0];if(!l)return i?.live&&(i.live=!1),e.trail.length>0;if(!i?.live)e.trail.unshift({at:[...e.pointer],time:e.clock,arrive:e.clock,weight:e.presence,live:!0});else{if(i.at[0]!==e.pointer[0]||i.at[1]!==e.pointer[1]){let u=e.trail[1],w=u?Math.hypot(u.at[0]-i.at[0],u.at[1]-i.at[1]):1/0,c=e.clock-i.arrive>re;w>.004&&(!u||c||e.clock-u.time>=re)&&e.trail.splice(1,0,{...i,at:[...i.at],time:e.clock,live:!1}),i.at=[...e.pointer],i.arrive=e.clock}i.time=e.clock,i.weight=e.presence}return e.trail.length>v&&(e.trail.length=v),e.trail.length>0},Y=r=>{if(e.raf=requestAnimationFrame(Y),!e.visible||document.hidden){e.last=r;return}let o=k.current,l=e.last?Math.min((r-e.last)/1e3,.1):0;e.last=r;let i=ne();e.clock+=l,e.introAt<0&&(e.introAt=e.clock),!o.paused&&!i&&(e.time+=l*o.speed);let u=o.mouseInteraction&&e.inside&&!i,w=u?(e.pointer[0]-.5)*o.drift*2:0,c=u?(.5-e.pointer[1])*o.drift*2:0,g=1-Math.exp(-l/.33);e.drift[0]+=(w-e.drift[0])*g,e.drift[1]+=(c-e.drift[1])*g;let y=Math.abs(w-e.drift[0])+Math.abs(c-e.drift[1])>5e-4,F=De(o,l);e.flares=e.flares.filter(Ne=>e.clock-Ne.time<fe);let _e=o.paused||i,Ie=F||y||e.flares.length>0||U(o,i)<1;e.seen!==o||Ie||!_e?e.quiet=0:e.quiet+=1,e.seen=o,!(e.quiet>3)&&(_(),qe(i))},K=r=>{let o=h.getBoundingClientRect();return{x:(r.clientX-o.left)/Math.max(o.width,1),y:(r.clientY-o.top)/Math.max(o.height,1),inside:r.clientX>=o.left&&r.clientX<=o.right&&r.clientY>=o.top&&r.clientY<=o.bottom}},j=r=>{let o=K(r);e.inside=o.inside,o.inside&&(e.pointer=[o.x,o.y])},J=()=>{e.inside=!1},Q=r=>{if(!k.current.flareOnClick||r.button!==0||ne()||r.target instanceof Element&&r.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let l=K(r);l.inside&&(e.flares.push({at:[l.x,l.y],time:e.clock}),e.flares.length>T&&e.flares.shift())},Z=new IntersectionObserver(r=>{e.visible=r.some(o=>o.isIntersecting)});Z.observe(h);let ee=new ResizeObserver(_);return ee.observe(h),_(),window.addEventListener("pointermove",j,{passive:!0}),window.addEventListener("pointerdown",Q),document.documentElement.addEventListener("pointerleave",J),e.raf=requestAnimationFrame(Y),()=>{cancelAnimationFrame(e.raf),Z.disconnect(),ee.disconnect(),window.removeEventListener("pointermove",j),window.removeEventListener("pointerdown",Q),document.documentElement.removeEventListener("pointerleave",J),t.deleteProgram(d),t.deleteBuffer($),t.deleteVertexArray(V),t.getExtension("WEBGL_lose_context")?.loseContext(),p.remove()}},[]),(0,se.jsx)("div",{ref:H,className:[He,Ee].filter(Boolean).join(" "),style:Be})}var G=A(S(),1),Ye=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],M=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],tt=Ye.map((n,f)=>({id:f+1,image:n,src:n,img:n,url:n,title:M[f],text:M[f],label:M[f],alt:M[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ke({big:n}){return(0,G.jsx)(oe,{big:n,dark:!0,center:!1,zoom:1,drive:!1,children:(0,G.jsx)(N,{})})}var ot=te(Ke);export{ot as default};
