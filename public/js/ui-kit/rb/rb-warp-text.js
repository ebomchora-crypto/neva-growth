import{b as Le,c as Me,d as Pe,e as De,h as Te}from"./chunks/chunk-M7BFARI7.js";import{c as O,i as ze,j as Y,l as Se,m as Re}from"./chunks/chunk-6IYH4WPJ.js";var y=O(ze(),1);var ce=O(Y(),1),Ce={bulge:0,pinch:1,swirl:2},_e=1600,Ne=1.6,Oe=4,He=`#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Ge=`#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uChromatic;
uniform float uRipple;
uniform float uMotion;
uniform float uLens;
uniform float uIntro;
uniform float uReveal;
uniform float uBackdrop;
uniform vec4 uClicks[4];

in vec2 vUv;
out vec4 fragColor;

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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * (uWarpStrength * 0.045 * uMotion + uIntro * 0.18);

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = dir * rippleRing * bulge * uPointerStrength * 0.016;

  if (uLens > 1.5) {
    float twist = (1.0 - t) * (1.0 - t) * uPointerActive * uPointerStrength * 2.4;
    float s = sin(twist);
    float c = cos(twist);
    vec2 turned = vec2(aspectDelta.x * c - aspectDelta.y * s, aspectDelta.x * s + aspectDelta.y * c);
    pointerWarp += vec2(turned.x / aspect, turned.y) - pointerDelta;
  } else {
    float side = uLens > 0.5 ? -1.0 : 1.0;
    pointerWarp -= dir * side * bulge * uPointerStrength * 0.045;
  }

  vec2 shock = vec2(0.0);
  float shockLight = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 click = uClicks[i];
    if (click.w <= 0.0) continue;
    vec2 clickDelta = uv - click.xy;
    vec2 clickAspect = vec2(clickDelta.x * aspect, clickDelta.y);
    float clickDist = length(clickAspect);
    float age = click.z;
    float offset = (clickDist - age * 0.9) / (0.06 + age * 0.06);
    float fade = 1.0 - smoothstep(0.0, 1.6, age);
    float energy = exp(-offset * offset) * fade * smoothstep(0.0, 0.08, age) * click.w;
    vec2 clickDir = clickDist > 0.0001 ? vec2(clickAspect.x / aspect, clickAspect.y) / clickDist : vec2(0.0);
    shock -= clickDir * offset * energy * 0.09;
    shockLight += energy;
  }

  vec2 bend = pointerWarp + shock;
  vec2 rest = uv + ambient;
  vec2 splitDir = ambient + bend;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65 + uIntro * 3.0);
  float dispersion = uChromatic * 0.5;

  vec3 ink = vec3(0.0);
  vec3 cover = vec3(0.0);
  vec3 weight = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float k = 1.0 - float(i) / 3.0;
    vec4 tap = sampleText(rest + bend * (1.0 + dispersion * k) + split * k);
    vec3 band = vec3(max(k, 0.0), 1.0 - abs(k), max(-k, 0.0));
    ink += tap.rgb * band;
    cover += tap.a * band;
    weight += band;
  }
  ink /= weight;
  cover /= weight;
  float a = max(max(cover.r, cover.g), cover.b);
  vec3 color = ink + (a - cover) * uBackdrop;
  color = min(color + (lens + shockLight * 0.5) * cover.g * 0.055, vec3(a));
  fragColor = vec4(color, a) * uReveal;
}
`,Q=t=>typeof t=="number"?`${t}px`:t,Ue=t=>t*t*(3-2*t),qe=t=>{let e=document.createElement("canvas");e.width=1,e.height=1;let n=e.getContext("2d",{willReadFrequently:!0});if(!n)return 1;n.fillStyle=t,n.fillRect(0,0,1,1);let[d,r,f]=n.getImageData(0,0,1,1).data;return(.2126*d+.7152*r+.0722*f)/255},Ee=(t,e,n)=>{let d=Array.from(e);return d.reduce((f,a)=>f+t.measureText(a).width,0)+Math.max(0,d.length-1)*n},Ve=(t,e,n,d,r)=>{let f=Array.from(e),a=n-Ee(t,e,r)/2;f.forEach((h,p)=>{t.fillText(h,a,d),a+=t.measureText(h).width+(p===f.length-1?0:r)})},$e=({container:t,width:e,height:n,dpr:d,props:r})=>{let f=document.createElement("canvas");f.width=Math.max(1,Math.floor(e*d)),f.height=Math.max(1,Math.floor(n*d));let a=f.getContext("2d");if(!a)return{canvas:f,ink:r.color};let h=document.createElement("span");h.textContent=r.text,Object.assign(h.style,{position:"absolute",visibility:"hidden",pointerEvents:"none",whiteSpace:"pre",inset:"0 auto auto 0",color:r.color,fontFamily:r.fontFamily,fontSize:Q(r.fontSize),fontWeight:String(r.fontWeight),letterSpacing:Q(r.letterSpacing),lineHeight:typeof r.lineHeight=="number"?String(r.lineHeight):r.lineHeight}),t.appendChild(h);let p=window.getComputedStyle(h),L=parseFloat(p.fontSize)||96,A=p.color||r.color,F=p.fontFamily||"sans-serif",B=p.fontWeight||String(r.fontWeight),M=p.letterSpacing==="normal"?0:parseFloat(p.letterSpacing)||0,g=parseFloat(p.lineHeight);Number.isFinite(g)||(g=L*(typeof r.lineHeight=="number"?r.lineHeight:.92)),h.remove(),a.setTransform(d,0,0,d,0,0),a.clearRect(0,0,e,n),a.textAlign="left",a.textBaseline="middle",a.fillStyle=A,a.imageSmoothingEnabled=!0,a.imageSmoothingQuality="high";let w=String(r.text||"").split(`
`),S=()=>{a.font=`${B} ${L}px ${F}`};S();let P=e*.86,D=n*.78,j=Math.max(...w.map(k=>Ee(a,k,M)),1),J=Math.max(g*w.length,1),T=Math.min(1,P/j,D/J);T<1&&(L*=T,M*=T,g*=T,S());let l=n/2-g*(w.length-1)/2;return w.forEach((k,Z)=>Ve(a,k,e/2,l+Z*g,M)),{canvas:f,ink:A}},Ae=(t,e)=>{let n=t.uniforms;n.uWarpStrength.value=e.warpStrength,n.uWarpScale.value=e.warpScale,n.uSpeed.value=e.speed,n.uPointerInfluence.value=e.pointerInfluence,n.uPointerStrength.value=e.pointerStrength,n.uRefraction.value=e.refraction,n.uChromatic.value=e.chromatic,n.uRipple.value=e.ripple?1:0,n.uLens.value=Ce[e.lens]??0},Xe=({text:t="Bend the moment",color:e="currentColor",warpStrength:n=.08,warpScale:d=1.7,speed:r=.55,pointerInfluence:f=.42,pointerStrength:a=.38,refraction:h=.018,chromatic:p=0,ripple:L=!0,clickRipple:A=!0,idleDrift:F=.2,lens:B="bulge",intro:M=!0,fontSize:g="clamp(3rem, 10vw, 9rem)",fontWeight:w=800,fontFamily:S="inherit",letterSpacing:P="-0.06em",lineHeight:D=.9,className:j="",style:J})=>{let T=(0,y.useRef)(null),l=(0,y.useRef)({text:t,color:e,fontSize:g,fontWeight:w,fontFamily:S,letterSpacing:P,lineHeight:D,warpStrength:n,warpScale:d,speed:r,pointerInfluence:f,pointerStrength:a,refraction:h,chromatic:p,ripple:L,clickRipple:A,idleDrift:F,lens:B,intro:M}),k=(0,y.useRef)(null),[Z,se]=(0,y.useState)(!1);return(0,y.useEffect)(()=>{l.current={text:t,color:e,fontSize:g,fontWeight:w,fontFamily:S,letterSpacing:P,lineHeight:D,warpStrength:n,warpScale:d,speed:r,pointerInfluence:f,pointerStrength:a,refraction:h,chromatic:p,ripple:L,clickRipple:A,idleDrift:F,lens:B,intro:M},k.current&&Ae(k.current.program,l.current)},[t,e,g,w,S,P,D,n,d,r,f,a,h,p,L,A,F,B,M]),(0,y.useEffect)(()=>{k.current?.rasterize()},[t,e,g,w,S,P,D]),(0,y.useEffect)(()=>{let x=T.current;if(!x||typeof window>"u")return;let z,v,m,ee,ue,C,te,ne,s=0,_=!1,E=!1,H=!0,G=!document.hidden,R=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,fe=0,U=!1,W=l.current.intro&&!R?0:1,ie=0,de=0,ve="",u={x:.5,y:.5,tx:.5,ty:.5,active:0,activeTarget:0},q=Array.from({length:Oe},()=>[.5,.5,0,0]),re=0,Ie=performance.now();try{z=new Me({webgl:2,alpha:!0,premultipliedAlpha:!0,antialias:!0,dpr:Math.min(window.devicePixelRatio||1,2)}),v=z.gl}catch(i){console.warn("WarpText: WebGL could not be initialized.",i),se(!0);return}v.clearColor(0,0,0,0);let c=v.canvas;c.style.position="absolute",c.style.inset="0",c.style.width="100%",c.style.height="100%",c.style.display="block",c.setAttribute("aria-hidden","true"),x.appendChild(c),C=new De(v,{generateMipmaps:!1,premultiplyAlpha:!0,minFilter:v.LINEAR,magFilter:v.LINEAR,wrapS:v.CLAMP_TO_EDGE,wrapT:v.CLAMP_TO_EDGE}),ee=new Te(v),m=new Le(v,{vertex:He,fragment:Ge,transparent:!0,depthTest:!1,depthWrite:!1,uniforms:{uTextTexture:{value:C},uResolution:{value:new Float32Array([1,1])},uPointer:{value:new Float32Array([.5,.5])},uPointerActive:{value:0},uTime:{value:0},uWarpStrength:{value:l.current.warpStrength},uWarpScale:{value:l.current.warpScale},uSpeed:{value:l.current.speed},uPointerInfluence:{value:l.current.pointerInfluence},uPointerStrength:{value:l.current.pointerStrength},uRefraction:{value:l.current.refraction},uChromatic:{value:l.current.chromatic},uRipple:{value:l.current.ripple?1:0},uMotion:{value:R?0:1},uLens:{value:Ce[l.current.lens]??0},uIntro:{value:0},uReveal:{value:0},uBackdrop:{value:0},uClicks:{value:q}}}),ue=new Pe(v,{geometry:ee,program:m});let oe=()=>{_||E||z.render({scene:ue})},ae=async()=>{let i=++fe;if(document.fonts?.ready)try{await document.fonts.ready}catch(N){}if(_||E||i!==fe)return;let o=x.getBoundingClientRect();if(o.width<=0||o.height<=0)return;let b=Math.min(window.devicePixelRatio||1,2);ve=window.getComputedStyle(x).color;let I=$e({container:x,width:o.width,height:o.height,dpr:b,props:l.current});C.image=I.canvas,C.needsUpdate=!0,m.uniforms.uBackdrop.value=qe(I.ink)<.5?1:0,U=!0,oe()},me=()=>{if(_||E)return;let i=x.getBoundingClientRect();i.width<=0||i.height<=0||(z.dpr=Math.min(window.devicePixelRatio||1,2),z.setSize(i.width,i.height),m.uniforms.uResolution.value[0]=v.drawingBufferWidth,m.uniforms.uResolution.value[1]=v.drawingBufferHeight,ae())},pe=i=>{if(i.pointerType==="touch")return;let o=c.getBoundingClientRect();o.width<=0||o.height<=0||(u.tx=(i.clientX-o.left)/o.width,u.ty=1-(i.clientY-o.top)/o.height,u.activeTarget=1)},he=()=>{u.activeTarget=0},ge=i=>{if(!l.current.clickRipple)return;let o=c.getBoundingClientRect();if(o.width<=0||o.height<=0)return;let b=q[re];re=(re+1)%q.length,b[0]=(i.clientX-o.left)/o.width,b[1]=1-(i.clientY-o.top)/o.height,b[2]=0,b[3]=R?.35:1},xe=i=>{i.preventDefault(),E=!0,s&&cancelAnimationFrame(s),s=0,se(!0)},be=()=>{G=!document.hidden,G&&H&&!s&&(s=requestAnimationFrame(V)),!G&&s&&(cancelAnimationFrame(s),s=0)},we=window.matchMedia?.("(prefers-reduced-motion: reduce)"),ye=i=>{R=i.matches,R&&(W=1),m.uniforms.uMotion.value=R?0:1,oe()},V=i=>{if(_||E)return;let o=(i-Ie)*.001,b=ie?Math.min(i-ie,50):16;ie=i,de+=1,U&&W<1&&(W=Math.min(1,W+b/_e));let I=1-W;U&&de%15===0&&window.getComputedStyle(x).color!==ve&&ae();let N=Math.min(Math.max(l.current.idleDrift,0),1),$=u.activeTarget>0,Fe=.5+Math.sin(o*.33)*(.08+N*.2),Be=.5+Math.cos(o*.27)*(.06+N*.2),ke=1-Math.exp(-b/($?130:470));u.x+=(($?u.tx:Fe)-u.x)*ke,u.y+=(($?u.ty:Be)-u.y)*ke,u.active+=(($?1:N)-u.active)*(1-Math.exp(-b/270)),q.forEach(X=>{X[3]<=0||(X[2]+=b/1e3,X[2]>Ne&&(X[3]=0))}),m.uniforms.uPointer.value[0]=u.x,m.uniforms.uPointer.value[1]=u.y,m.uniforms.uPointerActive.value=R?u.active*.35:u.active,m.uniforms.uTime.value=R?0:o,m.uniforms.uIntro.value=I*I*I,m.uniforms.uReveal.value=U?Ue(Math.min(1,W/.45)):0,oe(),s=requestAnimationFrame(V)};return te=new ResizeObserver(me),te.observe(x),ne=new IntersectionObserver(([i])=>{H=i.isIntersecting,H&&G&&!s&&(s=requestAnimationFrame(V)),!H&&s&&(cancelAnimationFrame(s),s=0)},{threshold:0}),ne.observe(x),c.addEventListener("pointermove",pe),c.addEventListener("pointerleave",he),c.addEventListener("pointerdown",ge),c.addEventListener("webglcontextlost",xe,!1),document.addEventListener("visibilitychange",be),we?.addEventListener("change",ye),Ae(m,l.current),k.current={program:m,rasterize:ae},me(),s=requestAnimationFrame(V),()=>{if(_=!0,k.current=null,s&&cancelAnimationFrame(s),te?.disconnect(),ne?.disconnect(),c.removeEventListener("pointermove",pe),c.removeEventListener("pointerleave",he),c.removeEventListener("pointerdown",ge),c.removeEventListener("webglcontextlost",xe),document.removeEventListener("visibilitychange",be),we?.removeEventListener("change",ye),!E)try{C?.texture&&v.deleteTexture(C.texture),ee?.remove?.(),m?.remove?.(),v.getExtension("WEBGL_lose_context")?.loseContext()}catch(i){}c.parentNode===x&&x.removeChild(c)}},[]),(0,ce.jsx)("div",{ref:T,className:`relative block min-h-[220px] w-full overflow-hidden isolate rounded-[inherit] ${j}`.trim(),style:J,role:"img","aria-label":t,children:Z&&(0,ce.jsx)("span",{className:"absolute inset-0 flex items-center justify-center whitespace-pre-line px-[7%] text-center","aria-hidden":"true",style:{color:e,fontFamily:S,fontWeight:w,fontSize:Q(g),letterSpacing:Q(P),lineHeight:D},children:t})})},We=Xe;var le=O(Y(),1),Ye=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],K=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],nt=Ye.map((t,e)=>({id:e+1,image:t,src:t,img:t,url:t,title:K[e],text:K[e],label:K[e],alt:K[e],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][e],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Qe({big:t}){return(0,le.jsx)(Re,{big:t,dark:!1,center:!0,zoom:1,drive:!1,children:(0,le.jsx)(We,{})})}var it=Se(Qe);export{it as default};
