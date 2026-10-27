import{b as $,c as j,d as q,e as M,h as X}from"./chunks/chunk-M7BFARI7.js";import{a as w}from"./chunks/chunk-JMSEHRFU.js";import{c as d,i as oe,j as y,l as U,m as B}from"./chunks/chunk-6IYH4WPJ.js";var a=d(oe(),1);var n=d(y(),1),G={melt:0,ripple:1,shear:2,swirl:3},ne=[{image:"https://images.unsplash.com/photo-1782977389500-dd7adad33ebe?q=80&w=1600&auto=format&fit=crop",caption:"One"},{image:"https://images.unsplash.com/photo-1781499455083-6ccc3beb20cd?q=80&w=1600&auto=format&fit=crop",caption:"Two"},{image:"https://images.unsplash.com/photo-1776394254711-4a0d7345269a?q=80&w=1600&auto=format&fit=crop",caption:"Three"},{image:"https://images.unsplash.com/photo-1781242629922-6f39cc3671cd?q=80&w=1600&auto=format&fit=crop",caption:"Four"}],ae=`
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,ue=`
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform vec2 uCurrentSize;
uniform vec2 uNextSize;
uniform float uProgress;
uniform float uDir;
uniform int uMode;
uniform float uIntensity;
uniform float uScale;
uniform float uAberration;
uniform float uDrift;
uniform float uTime;
uniform float uReduce;
uniform vec2 uPointer;
uniform vec3 uOverlay;

varying vec2 vUv;

const float PI = 3.14159265359;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
  float rA = res.x / max(res.y, 1.0);
  float iA = img.x / max(img.y, 1.0);
  vec2 s = vec2(1.0);
  float ratio = rA / max(iA, 0.0001);
  if (ratio > 1.0) {
    s.y = 1.0 / ratio;
  } else {
    s.x = ratio;
  }
  return (uv - 0.5) * s + 0.5;
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float env = sin(p * PI);

  vec2 uv = vUv;

  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;
  uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;

  vec2 uvC = uv;
  vec2 uvN = uv;
  float m = smoothstep(0.0, 1.0, p);

  if (uReduce < 0.5) {
    if (uMode == 3) {
      vec2 c = uv - 0.5;
      float r = length(c);
      float ang = env * uIntensity * 3.5 * (1.0 - r);
      uvC = rot(ang) * c + 0.5;
      uvN = rot(-ang) * c + 0.5;
      m = smoothstep(0.0, 1.0, p);
    } else if (uMode == 1) {
      float d = distance(uv, uPointer);
      float ring = p * 1.6;
      float wave = sin((d - ring) * 30.0) * env;
      vec2 dir = normalize(uv - uPointer + 1e-4);
      vec2 disp = dir * wave * uIntensity * 0.25;
      uvC = uv + disp;
      uvN = uv + disp * 0.6;
      m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);
    } else if (uMode == 2) {
      float slices = 14.0;
      float row = floor(uv.y * slices);
      float rnd = hash11(row);
      vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);
      uvC = uv + disp;
      uvN = uv + disp;
      float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;
      float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;
      m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);
    } else {
      float nn = fbm(uv * uScale + uTime * 0.03);
      float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
      vec2 g = vec2(nn, warp) - 0.5;
      uvC = uv + g * uIntensity * 0.5 * p;
      uvN = uv - g * uIntensity * 0.5 * (1.0 - p);
      m = smoothstep(nn - 0.15, nn + 0.15, p);
    }
  }

  vec2 sC = coverUV(uvC, uResolution, uCurrentSize);
  vec2 sN = coverUV(uvN, uResolution, uNextSize);

  float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;

  vec3 colC = vec3(
    texture2D(tCurrent, sC + vec2(ca, 0.0)).r,
    texture2D(tCurrent, sC).g,
    texture2D(tCurrent, sC - vec2(ca, 0.0)).b
  );
  vec3 colN = vec3(
    texture2D(tNext, sN + vec2(ca, 0.0)).r,
    texture2D(tNext, sN).g,
    texture2D(tNext, sN - vec2(ca, 0.0)).b
  );

  vec3 col = mix(colC, colN, m);

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col = mix(col, uOverlay, (1.0 - vig) * 0.28);

  gl_FragColor = vec4(col, 1.0);
}
`;function le(s){let t=new Uint8Array(64);for(let r=0;r<4*4;r++)t[r*4]=24,t[r*4+1]=24,t[r*4+2]=28,t[r*4+3]=255;return new M(s,{image:t,width:4,height:4,generateMipmaps:!1})}function V(s){let e=(s||"#000000").replace("#","");e.length===3&&(e=e.split("").map(r=>r+r).join(""));let t=parseInt(e,16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}var P=class{constructor(e,{items:t,startIndex:r,reducedMotion:u,getOptions:c,onIndexChange:z,dprCap:N}){this.container=e,this.items=t,this.getOptions=c,this.onIndexChange=z,this.reducedMotion=u,this.current=r,this.animating=!1,this.dragging=!1,this.dragDir=0,this.shownIndex=r,this.tween=null,this.renderer=new j({alpha:!1,antialias:!0,dpr:Math.min(window.devicePixelRatio||1,N)}),this.gl=this.renderer.gl,this.gl.clearColor(.05,.05,.06,1),this.canvas=this.gl.canvas,this.canvas.className="block w-full h-full",e.appendChild(this.canvas),this.geometry=new X(this.gl),this.textures=this.items.map(()=>le(this.gl)),this.sizes=this.items.map(()=>[1,1]);let h=this.getOptions();this.program=new $(this.gl,{vertex:ae,fragment:ue,uniforms:{tCurrent:{value:this.textures[this.current]},tNext:{value:this.textures[this.current]},uResolution:{value:[1,1]},uCurrentSize:{value:this.sizes[this.current]},uNextSize:{value:this.sizes[this.current]},uProgress:{value:0},uDir:{value:1},uMode:{value:G[h.transition]??0},uIntensity:{value:h.intensity},uScale:{value:h.scale},uAberration:{value:h.aberration},uDrift:{value:h.drift},uTime:{value:0},uReduce:{value:u?1:0},uPointer:{value:[.5,.5]},uOverlay:{value:V(h.overlayColor)}}}),this.mesh=new q(this.gl,{geometry:this.geometry,program:this.program}),this.boundContextLost=this.onContextLost.bind(this),this.canvas.addEventListener("webglcontextlost",this.boundContextLost,!1),this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(e),this.resize(),this.loadTextures(),this.boundLoop=this.loop.bind(this),this.raf=requestAnimationFrame(this.boundLoop)}loadTextures(){this.items.forEach((e,t)=>{let r=new Image;r.crossOrigin="anonymous",r.src=e.image,r.onload=()=>{let u=new M(this.gl,{generateMipmaps:!1});u.image=r,this.textures[t]=u,this.sizes[t]=[r.naturalWidth||1,r.naturalHeight||1],t===this.current&&(this.program.uniforms.tCurrent.value=u,this.program.uniforms.uCurrentSize.value=this.sizes[t])},r.onerror=()=>{}})}resize(){let e=this.container.getBoundingClientRect(),t=Math.max(e.width,1),r=Math.max(e.height,1);this.renderer.setSize(t,r),this.program.uniforms.uResolution.value=[this.gl.canvas.width,this.gl.canvas.height]}syncOptions(){let e=this.getOptions();this.program.uniforms.uMode.value=G[e.transition]??0,this.program.uniforms.uIntensity.value=e.intensity,this.program.uniforms.uScale.value=e.scale,this.program.uniforms.uAberration.value=e.aberration,this.program.uniforms.uDrift.value=e.drift,this.program.uniforms.uOverlay.value=V(e.overlayColor)}loop(e){this.program.uniforms.uTime.value=e*.001,!this.dragging&&!this.animating&&this.syncOptions(),this.renderer.render({scene:this.mesh}),this.raf=requestAnimationFrame(this.boundLoop)}wrap(e){let t=this.items.length;return(e%t+t)%t}prepareNext(e){let t=this.wrap(this.current+e);return this.program.uniforms.tCurrent.value=this.textures[this.current],this.program.uniforms.uCurrentSize.value=this.sizes[this.current],this.program.uniforms.tNext.value=this.textures[t],this.program.uniforms.uNextSize.value=this.sizes[t],this.program.uniforms.uDir.value=e,t}goTo(e){if(this.animating||this.dragging||this.items.length<2)return;let t=this.getOptions();if(!t.loop){let c=this.current+e;if(c<0||c>this.items.length-1)return}this.syncOptions();let r=this.prepareNext(e);this.animating=!0,this.announce(r);let u=this.reducedMotion?Math.min(t.duration,.4):t.duration;this.tween=w.fromTo(this.program.uniforms.uProgress,{value:0},{value:1,duration:u,ease:t.ease,onComplete:()=>this.commit(r)})}announce(e){e!==this.shownIndex&&(this.shownIndex=e,this.onIndexChange&&this.onIndexChange(e))}commit(e){this.current=e,this.program.uniforms.tCurrent.value=this.textures[e],this.program.uniforms.uCurrentSize.value=this.sizes[e],this.program.uniforms.uProgress.value=0,this.animating=!1,this.tween=null,this.announce(e)}next(){this.goTo(1)}prev(){this.goTo(-1)}setPointer(e,t){this.program.uniforms.uPointer.value=[e,t]}beginDrag(){return this.animating||this.items.length<2?!1:(this.dragging=!0,this.dragDir=0,this.syncOptions(),!0)}drag(e){if(!this.dragging)return;let t=this.getOptions(),r=e<0?1:-1;if(!t.loop){let c=this.current+r;if(c<0||c>this.items.length-1){this.program.uniforms.uProgress.value=0;return}}r!==this.dragDir&&(this.dragDir=r,this.prepareNext(r));let u=Math.min(Math.abs(e),1);this.program.uniforms.uProgress.value=u,this.announce(u>.5?this.wrap(this.current+r):this.current)}endDrag(){if(!this.dragging)return;this.dragging=!1;let e=this.program.uniforms.uProgress.value;if(this.dragDir===0)return;let t=this.wrap(this.current+this.dragDir),r=this.reducedMotion?.3:.5;this.animating=!0,e>.4?(this.announce(t),this.tween=w.to(this.program.uniforms.uProgress,{value:1,duration:r,ease:"power2.out",onComplete:()=>this.commit(t)})):(this.announce(this.current),this.tween=w.to(this.program.uniforms.uProgress,{value:0,duration:r,ease:"power2.out",onComplete:()=>{this.animating=!1,this.tween=null}}))}onContextLost(e){e.preventDefault(),cancelAnimationFrame(this.raf)}destroy(){cancelAnimationFrame(this.raf),this.tween&&this.tween.kill(),this.resizeObserver.disconnect(),this.canvas.removeEventListener("webglcontextlost",this.boundContextLost),this.textures.forEach(t=>{t&&t.texture&&this.gl.deleteTexture(t.texture)}),this.program&&this.program.program&&this.gl.deleteProgram(this.program.program);let e=this.gl.getExtension("WEBGL_lose_context");e&&e.loseContext(),this.canvas.parentNode&&this.canvas.parentNode.removeChild(this.canvas)}};function S({items:s=ne,startIndex:e=0,transition:t="melt",duration:r=1.1,ease:u="power2.inOut",intensity:c=.55,scale:z=2.4,aberration:N=.35,drift:h=.4,autoplay:I=!1,autoplayDelay:L=4,loop:W=!0,radius:Y=16,overlayColor:H="#000000",showCaptions:K=!0,showControls:J=!0,showIndicators:Q=!0,className:Z="",...ee}){let b=(0,a.useRef)(null),l=(0,a.useRef)(null),[f,R]=(0,a.useState)(e),[O,A]=(0,a.useState)(!1),_=(0,a.useRef)();_.current={transition:t,duration:r,ease:u,intensity:c,scale:z,aberration:N,drift:h,overlayColor:H,loop:W},(0,a.useEffect)(()=>{if(!b.current)return;let i=window.matchMedia("(prefers-reduced-motion: reduce)").matches,o=new P(b.current,{items:s,startIndex:e,reducedMotion:i,dprCap:2,getOptions:()=>_.current,onIndexChange:R});return l.current=o,R(e),()=>{o.destroy(),l.current=null}},[s,e]);let D=(0,a.useCallback)(()=>l.current?.next(),[]),T=(0,a.useCallback)(()=>l.current?.prev(),[]);(0,a.useEffect)(()=>{if(!I||O)return;let i=setTimeout(()=>l.current?.next(),Math.max(L,1)*1e3);return()=>clearTimeout(i)},[I,L,O,f]),(0,a.useEffect)(()=>{let i=b.current;if(!i)return;let o=0,v=1,g=!1,E=p=>{let m=i.getBoundingClientRect();v=m.width||1,o=p.clientX;let ie=(p.clientX-m.left)/m.width,se=(p.clientY-m.top)/m.height;if(l.current?.setPointer(ie,1-se),g=l.current?.beginDrag()??!1,g&&i.setPointerCapture)try{i.setPointerCapture(p.pointerId)}catch{}},F=p=>{if(!g)return;let m=(p.clientX-o)/v;l.current?.drag(m)},x=()=>{g&&(g=!1,l.current?.endDrag())};return i.addEventListener("pointerdown",E),i.addEventListener("pointermove",F),i.addEventListener("pointerup",x),i.addEventListener("pointercancel",x),()=>{i.removeEventListener("pointerdown",E),i.removeEventListener("pointermove",F),i.removeEventListener("pointerup",x),i.removeEventListener("pointercancel",x)}},[]);let te=(0,a.useCallback)(i=>{i.key==="ArrowRight"?(i.preventDefault(),D()):i.key==="ArrowLeft"&&(i.preventDefault(),T())},[D,T]),re=s.some(i=>i.caption);return(0,n.jsxs)("div",{className:`relative w-full h-full overflow-hidden select-none bg-[#0c0c0e] ${Z}`.trim(),style:{borderRadius:`${Y}px`,"--ms-swap":`${(r*.66).toFixed(3)}s`,"--ms-dot":`${(r*.45).toFixed(3)}s`,touchAction:"pan-y"},onMouseEnter:()=>A(!0),onMouseLeave:()=>A(!1),...ee,children:[(0,n.jsx)("div",{ref:b,className:"absolute inset-0 cursor-grab active:cursor-grabbing outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.7)]",role:"group","aria-roledescription":"carousel","aria-label":"Image morph slider",tabIndex:0,onKeyDown:te}),K&&re&&(0,n.jsx)("div",{className:"morph-slider-caption pointer-events-none absolute bottom-[22px] left-[22px] z-[2] grid max-w-[70%]","aria-live":"polite",children:s.map((i,o)=>i.caption?(0,n.jsx)("span",{"aria-hidden":o===f?void 0:!0,className:`morph-slider-caption-text pointer-events-none inline-block rounded-[10px] bg-[rgba(10,10,12,0.42)] px-[14px] py-[8px] text-[15px] font-semibold tracking-[0.01em] text-white backdrop-blur-[8px] [grid-area:1/1] [justify-self:start] [transition:opacity_var(--ms-swap)_cubic-bezier(0.16,1,0.3,1),transform_var(--ms-swap)_cubic-bezier(0.16,1,0.3,1),filter_var(--ms-swap)_cubic-bezier(0.16,1,0.3,1)] ${o===f?"opacity-100 [transform:translateY(0)] [filter:blur(0)]":"opacity-0 [transform:translateY(12px)] [filter:blur(6px)]"}`,children:i.caption},o):null)}),J&&(0,n.jsxs)("div",{className:"absolute top-1/2 left-0 right-0 z-[3] flex justify-between px-4 -translate-y-1/2 pointer-events-none",children:[(0,n.jsx)("button",{type:"button",className:"pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-full text-white border border-white/20 bg-[rgba(12,12,14,0.4)] backdrop-blur-md cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-[rgba(24,24,28,0.6)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80","aria-label":"Previous slide",onClick:T,children:(0,n.jsx)("svg",{viewBox:"0 0 24 24",width:"18",height:"18","aria-hidden":"true",children:(0,n.jsx)("path",{d:"M15 5l-7 7 7 7",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})})}),(0,n.jsx)("button",{type:"button",className:"pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-full text-white border border-white/20 bg-[rgba(12,12,14,0.4)] backdrop-blur-md cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-[rgba(24,24,28,0.6)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80","aria-label":"Next slide",onClick:D,children:(0,n.jsx)("svg",{viewBox:"0 0 24 24",width:"18",height:"18","aria-hidden":"true",children:(0,n.jsx)("path",{d:"M9 5l7 7-7 7",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})})})]}),Q&&(0,n.jsx)("div",{className:"absolute left-0 right-0 bottom-[18px] z-[3] flex gap-2 justify-center items-center",role:"tablist","aria-label":"Slides",children:s.map((i,o)=>(0,n.jsx)("button",{type:"button",role:"tab","aria-selected":o===f,"aria-label":`Go to slide ${o+1}`,className:`h-2 rounded-full cursor-pointer [transition:width_var(--ms-dot)_cubic-bezier(0.16,1,0.3,1),background-color_var(--ms-dot)_ease] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 ${o===f?"w-[22px] bg-white/95":"w-2 bg-white/35"}`,onClick:()=>{let v=l.current;!v||o===f||v.goTo(o>f?1:-1)}},o))})]})}var k=d(y(),1),ce=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],C=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],xe=ce.map((s,e)=>({id:e+1,image:s,src:s,img:s,url:s,title:C[e],text:C[e],label:C[e],alt:C[e],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][e],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function he({big:s}){return(0,k.jsx)(B,{big:s,dark:!0,center:!0,zoom:1,drive:!1,children:(0,k.jsx)(S,{})})}var we=U(he);export{we as default};
