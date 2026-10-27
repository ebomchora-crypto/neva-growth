import{c as L,i as We,j as I,l as ve,m as he}from"./chunks/chunk-6IYH4WPJ.js";var g=L(We(),1),Y=L(I(),1),ge=8,X=4,qe=2.2,Ve=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ke=`#version 300 es
precision highp float;
precision highp int;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uGloss;
uniform float uDepth;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uStarGlow;
uniform float uFlareGain;
uniform float uSquash;
uniform float uSaturation;
uniform float uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationAngle;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform int uLayers;
uniform vec3 uColors[${X}];
uniform int uColorCount;
uniform float uWarp;
uniform float uReveal;
uniform float uMode;
uniform vec3 uBackground;
uniform float uOpacity;
out vec4 outColor;

#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare, vec2 radial, float invReach) {
#ifdef WARP
  float along = dot(uv, radial);
  float d = sqrt(max(dot(uv, uv) - uSquash * along * along, 0.0));
#else
  float d = length(uv);
#endif
  float m = uStarGlow / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uFlareGain;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uFlareGain;
  m *= smoothstep(1.0, 0.2, d * invReach);
#ifdef WARP
  m *= mix(1.0, smoothstep(1.0, 0.55, length(uv) * invReach), min(uWarp * 4.0, 1.0));
#endif
  return m;
}

vec3 StarLayer(vec2 uv, vec2 radial, vec2 repelAt, float pushCells, float spread) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uGloss / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

#ifdef PALETTE
      float pick = Hash21(si + 7.0) * float(uColorCount);
      vec3 base = uColors[int(min(floor(pick), float(uColorCount - 1)))];
#else
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
#endif

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      vec2 shift = vec2(0.0);
      float invReach = 1.0;
#ifdef REPEL
      vec2 away = si + 0.5 + pad - repelAt;
      float dist = length(away);
      float q = dist * spread;
      float cells = pushCells * exp(-q * q);
      float moved = cells * inversesqrt(1.0 + cells * cells * 2.78);
      shift = away * (moved / max(dist, 0.0001));
      invReach = 1.0 / (1.0 - moved);
#endif
      float star = Star(gv - offset - pad - shift, flareSize, radial, invReach);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      col += star * twinkle * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution;
  vec2 uv = (gl_FragCoord.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);

  vec2 repelAt = vec2(0.0);
  float strength = 0.0;
  float push = 0.0;
  if (uAutoCenterRepulsion > 0.0) {
    strength = uAutoCenterRepulsion;
    push = strength * 0.05;
  } else if (uMouseRepulsion > 0.5) {
    repelAt = (uMouse * uResolution - focalPx) / uResolution.y;
    strength = max(uRepulsionStrength, 0.0);
    push = strength * 0.05 * uMouseActiveFactor;
  } else {
    uv += mouseNorm * 0.1 * uMouseActiveFactor;
  }
  float radius = 0.16 + 0.04 * strength;

  vec2 radial = length(uv) > 0.0001 ? normalize(uv) : vec2(1.0, 0.0);
  float angle = uRotationAngle;
  uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
  radial = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * radial;
  radial = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * radial;
  repelAt = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * repelAt;
  repelAt = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * repelAt;

  vec3 col = vec3(0.0);
  float layers = float(uLayers);
  for (int k = 0; k < ${ge}; k++) {
    if (k >= uLayers) break;
    float i = float(k) / layers;
    float depth = fract(i + uDepth);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    vec2 offset = vec2(i * 453.32);
    col += StarLayer(uv * scale + offset, radial, repelAt * scale + offset, push * scale, 1.0 / (scale * radius)) * fade;
  }
  col *= uReveal;

  if (uMode > 1.5) {
    vec3 lit = col * smoothstep(0.0, 0.3, length(col));
    float energy = max(max(lit.r, lit.g), lit.b);
    vec3 tint = lit / max(energy, 0.0001);
    vec3 ink = tint * (0.16 / max(dot(tint, vec3(0.2126, 0.7152, 0.0722)), 0.16));
    float coverage = pow(min(energy * 1.3, 1.0), 1.3) * 0.92 * uOpacity;
    outColor = uMode > 2.5 ? vec4(ink * coverage, coverage) : vec4(mix(uBackground, ink, coverage), 1.0);
  } else if (uMode > 0.5) {
    float alpha = min(smoothstep(0.0, 0.3, length(col)), 1.0) * uOpacity;
    outColor = vec4(col * alpha, alpha);
  } else {
    outColor = vec4(mix(uBackground, col, uOpacity), 1.0);
  }
}`,D=(n,l,f)=>Math.min(f,Math.max(l,n)),$e=(n,l,f)=>(n?4:0)+(l?2:0)+(f?1:0),Xe=(n,l,f,k)=>{let y=`${l?`#define PALETTE
`:""}${f?`#define REPEL
`:""}${k?`#define WARP
`:""}`,c=n.createProgram(),R=n.createShader(n.VERTEX_SHADER),b=n.createShader(n.FRAGMENT_SHADER);return!c||!R||!b?null:(n.shaderSource(R,Ve),n.shaderSource(b,Ke.replace(`
`,`
${y}`)),n.compileShader(R),n.compileShader(b),n.attachShader(c,R),n.attachShader(c,b),n.bindAttribLocation(c,0,"aPosition"),n.linkProgram(c),n.deleteShader(R),n.deleteShader(b),c)},Ye=(n,l)=>{if(!n.getProgramParameter(l,n.LINK_STATUS))return null;let f={},k=n.getProgramParameter(l,n.ACTIVE_UNIFORMS);for(let y=0;y<k;y++){let c=n.getActiveUniform(l,y);c&&(f[c.name.replace("[0]","")]=n.getUniformLocation(l,c.name))}return{program:l,uniforms:f}},Je=({focal:n=[.5,.5],rotation:l=[1,0],starSpeed:f=.5,density:k=1,hueShift:y=140,disableAnimation:c=!1,speed:R=1,mouseInteraction:b=!0,glowIntensity:Re=.3,saturation:be=0,mouseRepulsion:xe=!0,repulsionStrength:we=2,twinkleIntensity:Ae=.3,rotationSpeed:Se=.1,autoCenterRepulsion:Me=0,transparent:Ce=!0,lightMode:Ee=!1,starColors:Q,starSize:Te=1,flareIntensity:ke=1,layers:Le=4,direction:Fe="forward",clickWarp:Pe=!0,intro:Oe=!0,backgroundColor:_e,opacity:Ie=1,dpr:De,className:Ge="",style:Be,...ze})=>{let Z=(0,g.useRef)(null),j=(0,g.useRef)(null),B=(0,g.useRef)(null),Ne=Array.isArray(Q)?Q.filter(Boolean).slice(0,X):[],ee={focal:Array.isArray(n)?n:[.5,.5],rotation:Array.isArray(l)?l:[1,0],starSpeed:f,density:Math.max(.01,k),hueShift:y,disableAnimation:c,speed:R,mouseInteraction:b,glowIntensity:Math.max(0,Re),saturation:Math.max(0,be),mouseRepulsion:xe,repulsionStrength:we,twinkleIntensity:D(Ae,0,1),rotationSpeed:Se,autoCenterRepulsion:Math.max(0,Me),transparent:Ce,lightMode:Ee,palette:Ne,starSize:Math.max(0,Te),flareIntensity:Math.max(0,ke),layers:D(Math.round(Le),2,ge),reverse:Fe==="backward",clickWarp:Pe,intro:Oe,backgroundColor:_e,opacity:D(Ie,0,1),dpr:De},m=(0,g.useRef)(ee);return m.current=ee,(0,g.useEffect)(()=>{let A=Z.current,p=j.current,t=p?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!A||!p||!t)return;let te=t.getExtension("KHR_parallel_shader_compile"),F=new Map,P=(e,a,i)=>{let s=$e(e,a,i),u=F.get(s);return u||(u={program:Xe(t,e,a,i),linked:null,done:!1},F.set(s,u)),u},z=(e,a,i,s)=>{let u=P(e,a,i);if(!u.done&&u.program){if(!s&&te&&!t.getProgramParameter(u.program,te.COMPLETION_STATUS_KHR))return null;u.linked=Ye(t,u.program),u.done=!0}return u.linked},v=m.current;if(!z(v.palette.length>0,!1,!1,!0)){F.forEach(e=>e.program&&t.deleteProgram(e.program));return}let oe=t.createBuffer(),N=t.createVertexArray();t.bindVertexArray(N),t.bindBuffer(t.ARRAY_BUFFER,oe),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);let S=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),M=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,H=new Map,ne=(e,a)=>{if(!e)return a;let i=String(e);if(H.has(i))return H.get(i);let s=a;if(S){S.clearRect(0,0,1,1),S.fillStyle="#000000",S.fillStyle=i,S.fillRect(0,0,1,1);let[u,h,x]=S.getImageData(0,0,1,1).data;s=[u/255,h/255,x/255]}return H.set(i,s),s},ae=new Float32Array(X*3),d={x:.5,y:.5,inside:!1},o={time:0,gloss:0,depth:0,angle:0,mx:.5,my:.5,active:0,boost:0,reveal:m.current.intro&&!M?0:1},C=0,E=0,O=!0,U=()=>{let e=m.current;e.palette.forEach((He,Ue)=>ae.set(ne(He,[1,1,1]),Ue*3));let a=e.lightMode?e.transparent?3:2:e.transparent?1:0,i=ne(e.backgroundColor,e.lightMode?[1,1,1]:[0,0,0]),s=o.reveal,u=e.palette.length>0,h=e.autoCenterRepulsion>0||e.mouseRepulsion&&e.repulsionStrength>0&&o.active>0,x=o.boost>0,w=z(u,!1,!1,!0);if(!w)return;let V=(h||x?z(u,h,x,!1):null)??w,r=V.uniforms;t.viewport(0,0,p.width,p.height),t.useProgram(V.program),t.bindVertexArray(N),t.uniform1f(r.uTime,o.time),t.uniform2f(r.uResolution,p.width,p.height),t.uniform2f(r.uFocal,e.focal[0],e.focal[1]),t.uniform2f(r.uRotation,e.rotation[0],e.rotation[1]),t.uniform1f(r.uGloss,o.gloss),t.uniform1f(r.uDepth,o.depth),t.uniform1f(r.uDensity,e.density),t.uniform1f(r.uHueShift,e.hueShift),t.uniform1f(r.uSpeed,e.speed),t.uniform2f(r.uMouse,o.mx,o.my);let K=1+o.boost*5;t.uniform1f(r.uStarGlow,.05*e.glowIntensity*e.starSize/Math.pow(K,.6)),t.uniform1f(r.uFlareGain,e.glowIntensity*e.flareIntensity),t.uniform1f(r.uSquash,1-1/(K*K)),t.uniform1f(r.uSaturation,e.saturation),t.uniform1f(r.uMouseRepulsion,e.mouseRepulsion?1:0),t.uniform1f(r.uTwinkleIntensity,e.twinkleIntensity),t.uniform1f(r.uRotationAngle,o.angle),t.uniform1f(r.uRepulsionStrength,e.repulsionStrength),t.uniform1f(r.uMouseActiveFactor,o.active),t.uniform1f(r.uAutoCenterRepulsion,e.autoCenterRepulsion),t.uniform1i(r.uLayers,e.layers),t.uniform3fv(r.uColors,ae),t.uniform1i(r.uColorCount,e.palette.length),t.uniform1f(r.uWarp,o.boost);let $=Math.min(1,s/.35);t.uniform1f(r.uReveal,$*$*(3-2*$)),t.uniform1f(r.uMode,a),t.uniform3fv(r.uBackground,i),t.uniform1f(r.uOpacity,e.opacity),t.drawArrays(t.TRIANGLES,0,3)},re=e=>{if(C=0,!O||document.hidden)return;let a=m.current,i=E?D((e-E)/1e3,5e-4,.05):1/60;E=e;let s=a.disableAnimation||M?0:1;a.intro&&!M&&o.reveal<1?(o.reveal=Math.min(1,o.reveal+i/qe),o.boost=Math.max(o.boost,Math.pow(1-o.reveal,2)*1.4)):(!a.intro||M)&&(o.reveal=1);let u=a.starSpeed/10*(a.reverse?-1:1);o.time+=i*s,o.gloss+=i*u*s,o.depth+=i*u*a.speed*s*(1+o.boost*14),o.angle+=i*a.rotationSpeed*s,o.boost*=Math.exp(-i*1.3),o.boost<.001&&(o.boost=0);let h=1-Math.exp(-i/.325),x=a.mouseInteraction&&d.inside&&!M;x&&(o.mx+=(d.x-o.mx)*h,o.my+=(d.y-o.my)*h);let w=x?1:0;o.active+=(w-o.active)*h,Math.abs(w-o.active)<.001&&(o.active=w),U(),s>0||o.boost>0||o.active!==w||o.reveal<1?C=requestAnimationFrame(re):E=0},T=()=>{!C&&O&&!document.hidden&&(C=requestAnimationFrame(re))},W=()=>{let e=m.current,a=Math.max(1,A.clientWidth),i=Math.max(1,A.clientHeight),s=Math.min(e.dpr||window.devicePixelRatio||1,2);p.width=Math.max(1,Math.round(a*s)),p.height=Math.max(1,Math.round(i*s)),U(),T()},ie=e=>{let a=A.getBoundingClientRect(),i=e.clientX-a.left,s=e.clientY-a.top;d.inside=i>=0&&s>=0&&i<=a.width&&s<=a.height,d.x=i/Math.max(1,a.width),d.y=1-s/Math.max(1,a.height)},se=e=>{ie(e),T()},le=e=>{let a=m.current;ie(e),!(!d.inside||!a.clickWarp||M)&&(o.boost=Math.min(1.6,o.boost+1),T())},_=e=>{e.pointerType!=="mouse"&&(d.inside=!1)},ue=()=>{d.inside=!1},ce=()=>{E=0,T()},fe=new ResizeObserver(W);fe.observe(A);let me=new IntersectionObserver(e=>{O=e.some(a=>a.isIntersecting),O&&(E=0,T())});me.observe(A),window.addEventListener("pointermove",se,{passive:!0}),window.addEventListener("pointerdown",le,{passive:!0}),window.addEventListener("pointerup",_,{passive:!0}),window.addEventListener("pointercancel",_,{passive:!0}),document.documentElement.addEventListener("pointerleave",ue),document.addEventListener("visibilitychange",ce),W();let de=v.autoCenterRepulsion>0||v.mouseInteraction&&v.mouseRepulsion,q=v.palette.length>0;(v.clickWarp||v.intro)&&P(q,!1,!0),de&&P(q,!0,!1),de&&v.clickWarp&&P(q,!0,!0);let pe=m.current.dpr;return B.current=()=>{let e=m.current;if(e.dpr!==pe){pe=e.dpr,W();return}C||U(),T()},()=>{cancelAnimationFrame(C),B.current=null,fe.disconnect(),me.disconnect(),window.removeEventListener("pointermove",se),window.removeEventListener("pointerdown",le),window.removeEventListener("pointerup",_),window.removeEventListener("pointercancel",_),document.documentElement.removeEventListener("pointerleave",ue),document.removeEventListener("visibilitychange",ce),F.forEach(e=>e.program&&t.deleteProgram(e.program)),t.deleteBuffer(oe),t.deleteVertexArray(N),t.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,g.useEffect)(()=>{B.current?.()}),(0,Y.jsx)("div",{ref:Z,className:["relative h-full w-full overflow-hidden",Ge].filter(Boolean).join(" "),style:Be,...ze,children:(0,Y.jsx)("canvas",{ref:j,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ye=Je;var J=L(I(),1),Qe=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],at=Qe.map((n,l)=>({id:l+1,image:n,src:n,img:n,url:n,title:G[l],text:G[l],label:G[l],alt:G[l],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][l],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ze({big:n}){return(0,J.jsx)(he,{big:n,dark:!0,center:!1,zoom:1,drive:!1,children:(0,J.jsx)(ye,{})})}var rt=ve(Ze);export{rt as default};
