import{a as ve,b as V,c as me,d as q,e as pe,f as de,h as he}from"./chunks/chunk-M7BFARI7.js";import{c as T,i as Ue,j as E,l as ue,m as fe}from"./chunks/chunk-6IYH4WPJ.js";var m=T(Ue(),1);var xe=T(E(),1),w=100,ge={low:.4,medium:.7,high:1},R=1.5,Oe=Math.log(500),Fe=`
precision highp float;

attribute vec2 position;
attribute vec2 uv;
attribute vec2 iOffset;
attribute vec2 iScale;
attribute float iOpacity;

varying vec2 vUv;
varying float vOpacity;

void main() {
  vUv = uv;
  vOpacity = iOpacity;
  gl_Position = vec4(iOffset + position * iScale, 0.0, 1.0);
}
`,_e=`
precision highp float;

varying vec2 vUv;
varying float vOpacity;

uniform float uRings;

const float PI = 3.141592653589793;
const float EDGE = 0.006737947;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;

  float brush = (exp(-r * 5.0) - EDGE) / (1.0 - EDGE);

  brush *= 0.55 + 0.45 * cos(sqrt(r) * PI * 2.0 * uRings);

  gl_FragColor = vec4(vec3(brush * vOpacity * vOpacity), 1.0);
}
`,Le=`
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Ce=`
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
uniform vec2 uResolution;
uniform vec2 uTextureSize;
uniform vec2 uTexel;
uniform vec3 uTint;
uniform vec3 uHighlight;
uniform float uStrength;
uniform float uSwirl;
uniform float uDispersion;
uniform float uGlint;
uniform float uTintAmount;
uniform float uGrayscale;

const float TAU = 6.283185307179586;

vec2 coverUV(vec2 uv) {
  vec2 safe = max(uTextureSize, vec2(1.0));
  vec2 s = uResolution / safe;
  vec2 scaledSize = safe * max(s.x, s.y);
  vec2 offset = (uResolution - scaledSize) * 0.5;
  return (uv * uResolution - offset) / scaledSize;
}

void main() {
  float amount = texture2D(uDisplacement, vUv).r;
  vec2 base = coverUV(vUv);

  float theta = amount * uSwirl * TAU;
  vec2 dir = vec2(sin(theta), cos(theta));
  vec2 push = dir * amount * uStrength;

  vec3 color;
  if (uDispersion > 0.001) {
    float split = uDispersion * 0.25;
    color.r = texture2D(uTexture, base + push * (1.0 + split)).r;
    color.g = texture2D(uTexture, base + push).g;
    color.b = texture2D(uTexture, base + push * (1.0 - split)).b;
  } else {
    color = texture2D(uTexture, base + push).rgb;
  }

  if (uGrayscale > 0.001) {
    color = mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), uGrayscale);
  }

  if (uTintAmount > 0.001) {
    color = mix(color, color * uTint * 1.9, clamp(amount * 1.6, 0.0, 1.0) * uTintAmount);
  }

  if (uGlint > 0.001) {
    float ex = texture2D(uDisplacement, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDisplacement, vUv - vec2(uTexel.x, 0.0)).r;
    float ey = texture2D(uDisplacement, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDisplacement, vUv - vec2(0.0, uTexel.y)).r;
    vec3 normal = normalize(vec3(-ex * 26.0, -ey * 26.0, 1.0));
    vec3 light = normalize(vec3(-0.35, 0.55, 1.0));
    float raw = pow(max(dot(normal, light), 0.0), 22.0);
    float flatSpec = pow(max(light.z, 0.0), 22.0);
    color += uHighlight * clamp((raw - flatSpec) / max(1.0 - flatSpec, 0.0001), 0.0, 1.0) * uGlint;
  }

  gl_FragColor = vec4(color, 1.0);
}
`,z=c=>{let r=c.replace("#",""),x=r.length===3?r.split("").map(p=>p+p).join(""):r,l=parseInt(x,16);return Number.isNaN(l)?[1,1,1]:[(l>>16&255)/255,(l>>8&255)/255,(l&255)/255]},Ne=({src:c="https://images.unsplash.com/photo-1782977389500-dd7adad33ebe?q=80&w=3416&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",brushSize:r=150,strength:x=.2,swirl:l=1,rings:p=4,spread:ye=5,fade:Te=3,spacing:De=15,dispersion:U=0,glint:O=0,tint:F="#a855f7",tintAmount:_=.1,grayscale:L=!0,highlightColor:C="#ffffff",trigger:Se="hover",clickStrength:Me=2,quality:X="low",enabled:Ae=!0,className:Ee="",style:Re})=>{let Q=(0,m.useRef)(null),b=(0,m.useRef)({}),N=(0,m.useRef)(null);return b.current={brushSize:r,spread:ye,fade:Te,spacing:De,clickStrength:Me,trigger:Se,enabled:Ae},(0,m.useEffect)(()=>{let a=Q.current;if(!a)return;let D=typeof window<"u"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,S=new me({alpha:!1,antialias:!1,dpr:Math.min(window.devicePixelRatio||1,2)}),t=S.gl;t.clearColor(0,0,0,1);let d=t.canvas;d.style.width="100%",d.style.height="100%",d.style.display="block",a.appendChild(d);let $=new pe(t,{generateMipmaps:!1,minFilter:t.LINEAR,magFilter:t.LINEAR,wrapS:t.CLAMP_TO_EDGE,wrapT:t.CLAMP_TO_EDGE}),j=!1,f=new window.Image;f.crossOrigin="anonymous",f.decoding="async",f.onload=()=>{j||($.image=f,y.uTextureSize.value=[f.naturalWidth||1,f.naturalHeight||1])},f.src=c;let I=new Float32Array(w*2),P=new Float32Array(w*2),M=new Float32Array(w),J=Array.from({length:w},()=>({x:0,y:0,scale:R,target:R,size:1,opacity:0})),H=0,A=new ve(t,{position:{size:2,data:new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1])},uv:{size:2,data:new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1])},iOffset:{instanced:1,size:2,data:I},iScale:{instanced:1,size:2,data:P},iOpacity:{instanced:1,size:1,data:M}}),K={uRings:{value:p}},Z=new V(t,{vertex:Fe,fragment:_e,uniforms:K,transparent:!0,depthTest:!1,depthWrite:!1,cullFace:!1});Z.setBlendFunc(t.ONE,t.ONE);let ze=new q(t,{geometry:A,program:Z,frustumCulled:!1}),B=new de(t,{width:2,height:2,depth:!1,minFilter:t.LINEAR,magFilter:t.LINEAR,wrapS:t.CLAMP_TO_EDGE,wrapT:t.CLAMP_TO_EDGE}),y={uTexture:{value:$},uDisplacement:{value:B.texture},uResolution:{value:[1,1]},uTextureSize:{value:[1,1]},uTexel:{value:[1,1]},uTint:{value:z(F)},uHighlight:{value:z(C)},uStrength:{value:x},uSwirl:{value:l},uDispersion:{value:U},uGlint:{value:O},uTintAmount:{value:_},uGrayscale:{value:L?1:0}},Ge=new q(t,{geometry:new he(t),program:new V(t,{vertex:Le,fragment:Ce,uniforms:y,depthTest:!1,depthWrite:!1})});N.current={wave:K,composite:y};let h=1,g=1,ee=()=>{h=Math.max(1,a.clientWidth),g=Math.max(1,a.clientHeight),S.setSize(h,g),y.uResolution.value=[h,g];let o=ge[X]||ge.high,i=Math.max(2,Math.round(h*o)),e=Math.max(2,Math.round(g*o));B.setSize(i,e),y.uTexel.value=[1/i,1/e]},te=new ResizeObserver(ee);te.observe(a),ee();let oe=(o,i,e)=>{let v=b.current,u=J[H];H=(H+1)%w,u.x=o,u.y=i,u.scale=R*e,u.target=R*Math.max(1,v.spread)*e,u.size=Math.max(1,v.brushSize),u.opacity=1},ae=(o,i)=>{let e=a.getBoundingClientRect();return e.width===0||e.height===0||o<e.left||o>e.right||i<e.top||i>e.bottom?null:[o-e.left,e.height-(i-e.top)]},ie=0,re=0,ne=o=>{let i=b.current;if(!i.enabled||D||i.trigger==="click")return;let e=ae(o.clientX,o.clientY);if(!e)return;let v=Math.max(1,i.spacing);(Math.abs(e[0]-ie)>v||Math.abs(e[1]-re)>v)&&(oe(e[0],e[1],1),ie=e[0],re=e[1])},ce=o=>{let i=b.current;if(!i.enabled||D||i.trigger==="hover")return;let e=ae(o.clientX,o.clientY);e&&oe(e[0],e[1],Math.max(1,i.clickStrength))};window.addEventListener("pointermove",ne,{passive:!0}),window.addEventListener("pointerdown",ce,{passive:!0});let W=0,k=0,se=o=>{W=requestAnimationFrame(se);let i=k?Math.min(.05,(o-k)/1e3):0;k=o;let e=b.current,v=D?0:1-Math.exp(-i*1.09),u=D?1:Math.exp(-i*Oe/Math.max(.15,e.fade));for(let s=0;s<w;s+=1){let n=J[s];if(n.opacity<=0){M[s]=0;continue}if(n.opacity*=u,n.scale+=(n.target-n.scale)*v,n.opacity<.002){n.opacity=0,M[s]=0;continue}let le=n.scale*n.size/2;I[s*2]=n.x/h*2-1,I[s*2+1]=n.y/g*2-1,P[s*2]=le/h*2,P[s*2+1]=le/g*2,M[s]=n.opacity}A.attributes.iOffset.needsUpdate=!0,A.attributes.iScale.needsUpdate=!0,A.attributes.iOpacity.needsUpdate=!0,S.render({scene:ze,target:B,clear:!0}),S.render({scene:Ge})};return W=requestAnimationFrame(se),()=>{j=!0,cancelAnimationFrame(W),te.disconnect(),window.removeEventListener("pointermove",ne),window.removeEventListener("pointerdown",ce),N.current=null,d.parentNode===a&&a.removeChild(d);let o=t.getExtension("WEBGL_lose_context");o&&o.loseContext()}},[c,X]),(0,m.useEffect)(()=>{let a=N.current;a&&(a.wave.uRings.value=p,a.composite.uStrength.value=x,a.composite.uSwirl.value=l,a.composite.uDispersion.value=U,a.composite.uGlint.value=O,a.composite.uTintAmount.value=_,a.composite.uGrayscale.value=L?1:0,a.composite.uHighlight.value=z(C),a.composite.uTint.value=z(F))},[p,x,l,U,O,_,L,C,F]),(0,xe.jsx)("div",{ref:Q,className:`relative w-full h-full overflow-hidden bg-black [&>canvas]:block [&>canvas]:w-full [&>canvas]:h-full ${Ee}`.trim(),style:Re})},we=Ne;var Y=T(E(),1),be=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],qe=be.map((c,r)=>({id:r+1,image:c,src:c,img:c,url:c,title:G[r],text:G[r],label:G[r],alt:G[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ie({big:c}){return(0,Y.jsx)(fe,{big:c,dark:!0,center:!0,zoom:1,drive:"move",children:(0,Y.jsx)(we,{src:be[1]})})}var Ye=ue(Ie);export{Ye as default};
