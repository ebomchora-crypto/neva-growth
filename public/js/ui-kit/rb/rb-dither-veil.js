import{b as Oe,c as He,d as be,e as Me,f as qe,h as Ke}from"./chunks/chunk-M7BFARI7.js";import{c as le,i as it,j as ve,l as _e,m as We}from"./chunks/chunk-6IYH4WPJ.js";var V=le(it(),1);var Je=le(ve(),1),lt="https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1400&auto=format&fit=crop",ut={bayer:0,noise:1,lines:2},Ge={atkinson:[[1,0,1/8],[2,0,1/8],[-1,1,1/8],[0,1,1/8],[1,1,1/8],[0,2,1/8]],floyd:[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]]},Xe=.5,Ye=4,$e=1.2,Ve=1.6,ct=1100,Re=r=>{let a=String(r||"").replace("#","");a.length===3&&(a=a.replace(/./g,d=>d+d));let v=parseInt(a.slice(0,6),16);return Number.isNaN(v)?[0,0,0]:[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255]},ft=(r,a,v,d,x)=>{let l=r/a/(v/d);return x?l>1?[l,1]:[1,1/l]:l>1?[1,1/l]:[l,1]},vt=(r,a,v)=>[a*(.5+.33*Math.sin(r*.53)+.08*Math.sin(r*1.31+.6)),v*(.5+.28*Math.sin(r*.71+1.1)+.07*Math.cos(r*1.57))],mt=(r,a)=>{r.canvas.width=32,r.canvas.height=32,r.drawImage(a,0,0,32,32);let d=r.getImageData(0,0,32,32).data,x=[0,0,0],l=[0,0,0],h=0;for(let b=0;b<32;b++)for(let u=0;u<32;u++)if(!(u>0&&b>0&&u<31&&b<31)){for(let s=0;s<3;s++){let E=d[(b*32+u)*4+s]/255;x[s]+=E,l[s]+=E*E}h++}let M=[x[0]/h,x[1]/h,x[2]/h],R=M.reduce((b,u,s)=>b+Math.sqrt(Math.max(0,l[s]/h-u*u)),0)/3;return{matte:M,plain:R<.06}},ke=null,dt=()=>{if(ke)return ke;let r=64,a=r*r,v=r-1,d=[];for(let t=-6;t<=6;t++)for(let n=-6;n<=6;n++)d.push(n,t,Math.exp(-(n*n+t*t)/4.5));let x=new Float32Array(a),l=new Uint8Array(a),h=(t,n)=>{let S=t%r,A=(t-S)/r;for(let y=0;y<d.length;y+=3)x[(A+d[y+1]&v)*r+(S+d[y]&v)]+=n*d[y+2]},M=(t,n)=>{let S=0,A=n?-1/0:1/0;for(let y=0;y<a;y++)l[y]===t&&(n?x[y]>A:x[y]<A)&&(A=x[y],S=y);return S},R=7,b=()=>(R=R*16807%2147483647,R/2147483647),u=Math.round(a*.1);for(let t=0;t<u;){let n=Math.floor(b()*a);l[n]||(l[n]=1,h(n,1),t++)}for(let t=0;t<a;t++){let n=M(1,!0);l[n]=0,h(n,-1);let S=M(0,!1);if(l[S]=1,h(S,1),S===n)break}let s=l.slice(),E=x.slice(),I=new Uint16Array(a);for(let t=u-1;t>=0;t--){let n=M(1,!0);l[n]=0,h(n,-1),I[n]=t}l.set(s),x.set(E);for(let t=u;t<a;t++){let n=M(0,!1);l[n]=1,h(n,1),I[n]=t}let k=new Uint8Array(a*4);for(let t=0;t<a;t++){let n=Math.floor(I[t]/a*256);k[t*4]=n,k[t*4+1]=n,k[t*4+2]=n,k[t*4+3]=255}return ke=k,k},pt=(r,a,v,d,x,l,h)=>{let M=l?3:1,R=new Float32Array(a*v*M);for(let s=0;s<a*v;s++){let E=r[s*4]/255,I=r[s*4+1]/255,k=r[s*4+2]/255;l?(R[s*3]=h(E),R[s*3+1]=h(I),R[s*3+2]=h(k)):R[s]=h(.2126*E+.7152*I+.0722*k)}let b=x-1,u=new Uint8Array(a*v*4);for(let s=0;s<v;s++){let E=s&1?-1:1;for(let I=0;I<a;I++){let k=E>0?I:a-1-I,t=s*a+k;for(let n=0;n<M;n++){let S=R[t*M+n],A=Math.min(b,Math.max(0,Math.round(S*b)))/b,y=S-A,te=Math.round(A*255);l?u[t*4+n]=te:u[t*4]=u[t*4+1]=u[t*4+2]=te;for(let B=0;B<d.length;B++){let q=k+d[B][0]*E,m=s+d[B][1];q<0||q>=a||m>=v||(R[(m*a+q)*M+n]+=y*d[B][2])}}u[t*4+3]=255}}return u},ht=`#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,gt=`#version 300 es
precision highp float;

uniform sampler2D tPrev;
uniform vec2 uSize;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uSoftness;
uniform float uStrength;
uniform float uFade;
uniform float uHold;

in vec2 vUv;
out vec4 fragColor;

float strokeDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  return length(p - a - ab * h);
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float trail = max(texture(tPrev, vUv).r - uFade, 0.0);
  float band = max(uRadius * uSoftness, 1.0) * uHold;
  float d = strokeDistance(p, uFrom, uTo);
  trail = max(trail, clamp((uRadius - d) / band, 0.0, 1.0) * uStrength);
  fragColor = vec4(trail, 0.0, 0.0, 1.0);
}
`,xt=`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D tImage;
uniform sampler2D tMask;
uniform sampler2D tNoise;
uniform sampler2D tDiffused;
uniform vec2 uResolution;
uniform vec2 uCover;
uniform float uLod;
uniform float uCell;
uniform int uPattern;
uniform int uPalette;
uniform float uLevels;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uRimColor;
uniform float uRim;
uniform float uContrast;
uniform float uBrightness;
uniform float uReverse;
uniform float uIntro;
uniform float uHold;
uniform vec3 uMatte;
uniform float uKey;
uniform vec2 uSize;
uniform vec4 uBursts[4];
uniform float uBurstWidth;

in vec2 vUv;
out vec4 fragColor;

float bayer(vec2 cell) {
  ivec2 p = ivec2(mod(cell, 8.0));
  int v = p.x ^ p.y;
  int m = ((v & 1) << 5) | ((p.y & 1) << 4) | ((v & 2) << 2) | ((p.y & 2) << 1) | ((v & 4) >> 1) | ((p.y & 4) >> 2);
  return (float(m) + 0.5) / 64.0;
}

float blueNoise(vec2 cell) {
  return (texelFetch(tNoise, ivec2(mod(cell, 64.0)), 0).r * 255.0 + 0.5) / 256.0;
}

float engraving(vec2 cell) {
  float period = 6.0;
  float f = (mod(cell.x + cell.y, period) + 0.5) / period;
  return clamp(abs(f * 2.0 - 1.0) + (bayer(cell) - 0.5) * (2.0 / period), 0.0, 1.0);
}

vec2 imageUv(vec2 uv) {
  return (uv - 0.5) * uCover + 0.5;
}

float within(vec2 p) {
  vec2 s = step(vec2(0.0), p) * step(p, vec2(1.0));
  return s.x * s.y;
}

vec3 grade(vec3 c) {
  return pow(clamp((c - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0), vec3(1.6));
}

float shockwave(vec2 p) {
  float value = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 burst = uBursts[i];
    if (burst.w <= 0.0) continue;
    float offset = distance(p, burst.xy) - burst.z;
    float edge = offset > 0.0 ? offset / (uBurstWidth * 0.35) : -offset / uBurstWidth;
    value = max(value, clamp(1.0 - edge, 0.0, 1.0) * burst.w);
  }
  return value;
}

vec3 toned(vec3 c) {
  return uPalette == 1 ? grade(c) : grade(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))));
}

vec3 quantize(vec3 v, float t) {
  float steps = max(uLevels - 1.0, 1.0);
  vec3 s = v * steps;
  vec3 base = floor(s);
  return min(base + step(vec3(t), s - base), vec3(steps)) / steps;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cell = floor(px / uCell);
  vec2 center = (cell + 0.5) * uCell;
  vec2 cellUv = vec2(center.x / uResolution.x, 1.0 - center.y / uResolution.y);

  vec2 sampleUv = imageUv(cellUv);
  float framed = within(sampleUv);
  vec3 level;
  if (uPattern == 3) {
    level = texelFetch(tDiffused, ivec2(cell), 0).rgb;
  } else {
    vec3 c = mix(uMatte, textureLod(tImage, sampleUv, uLod).rgb, framed);
    float t = uPattern == 1 ? blueNoise(cell) : (uPattern == 2 ? engraving(cell) : bayer(cell));
    level = quantize(toned(c), t);
  }

  vec3 color = mix(uInk, mix(uInk, uPaper, level), max(framed, uKey));
  vec3 backdrop = mix(uInk, uPaper, toned(uMatte));
  vec2 photoUv = imageUv(vUv);
  vec3 raw = texture(tImage, photoUv).rgb;
  float plain = uKey * (1.0 - smoothstep(0.05, 0.22, distance(raw, uMatte)));
  vec3 photo = mix(mix(uInk, backdrop, uKey), mix(raw, backdrop, plain), within(photoUv));

  vec2 point = vec2(cellUv.x, 1.0 - cellUv.y) * uSize;
  float mask = max(clamp(texture(tMask, cellUv).r * uHold, 0.0, 1.0), shockwave(point));
  float shown = mix(mask, 1.0 - mask, uReverse);
  float order = bayer(cell.yx);
  float low = order * (1.0 - uRim);
  color = mix(color, uRimColor, step(low, shown) * step(0.001, uRim));
  color = mix(color, photo, step(low + uRim, shown));

  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float spread = length((cellUv - 0.5) * aspect) / length(aspect * 0.5);
  float appear = step(spread * 0.72 + bayer(cell + vec2(3.0, 5.0)) * 0.28, uIntro * 1.001);
  fragColor = vec4(mix(uInk, color, appear), 1.0);
}
`,yt=({src:r=lt,fit:a="contain",pattern:v="floyd",pixelSize:d=2,levels:x=2,palette:l="duotone",inkColor:h="#120f17",paperColor:M="#f4f1ea",contrast:R=1.15,brightness:b=0,revealRadius:u=200,softness:s=.6,linger:E=1,rimColor:I="#a78bfa",rim:k=0,reverse:t=!1,wander:n=!1,clickBurst:S=!0,className:A="",style:y})=>{let te=(0,V.useRef)(null),B=(0,V.useRef)(null),q=(0,V.useRef)(()=>{});return(0,V.useEffect)(()=>{B.current={fit:a,pattern:v,pixelSize:d,levels:x,palette:l,inkColor:h,paperColor:M,contrast:R,brightness:b,revealRadius:u,softness:s,linger:E,rimColor:I,rim:k,reverse:t,wander:n,clickBurst:S},q.current()}),(0,V.useEffect)(()=>{let m=te.current;if(!m)return;let Ze=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,K=new He({dpr:Math.min(window.devicePixelRatio||1,2),alpha:!1,antialias:!1}),c=K.gl,g=c.canvas;g.style.display="block",g.style.width="100%",g.style.height="100%",m.appendChild(g);let de=K.isWebgl2&&!!K.getExtension("EXT_color_buffer_float"),Ce=new Ke(c),Ee=()=>new Me(c,{image:new Uint8Array(4),width:1,height:1,generateMipmaps:!1,flipY:!1,minFilter:c.NEAREST,magFilter:c.NEAREST}),Ie=new Me(c,{minFilter:c.LINEAR_MIPMAP_LINEAR,magFilter:c.LINEAR}),Q=Ee(),ae=Ee(),ue=(o,e)=>new qe(c,{width:o,height:e,depth:!1,type:de?c.HALF_FLOAT:c.UNSIGNED_BYTE,internalFormat:de?c.RGBA16F:c.RGBA,minFilter:c.LINEAR,magFilter:c.LINEAR}),je=o=>{c.deleteFramebuffer(o.buffer),c.deleteTexture(o.texture.texture)},z=[ue(2,2),ue(2,2)],N={tPrev:{value:z[0].texture},uSize:{value:[1,1]},uFrom:{value:[0,0]},uTo:{value:[0,0]},uRadius:{value:1},uSoftness:{value:.5},uStrength:{value:0},uFade:{value:1},uHold:{value:Ve}},i={tImage:{value:Ie},tMask:{value:z[0].texture},tNoise:{value:Q},tDiffused:{value:ae},uResolution:{value:[1,1]},uCover:{value:[1,1]},uLod:{value:0},uCell:{value:3},uPattern:{value:0},uPalette:{value:0},uLevels:{value:2},uInk:{value:[0,0,0]},uPaper:{value:[1,1,1]},uRimColor:{value:[1,1,1]},uRim:{value:0},uContrast:{value:1},uBrightness:{value:0},uReverse:{value:0},uIntro:{value:0},uHold:{value:Ve},uMatte:{value:[0,0,0]},uKey:{value:0},uSize:{value:[1,1]},uBursts:{value:Array.from({length:Ye*4},()=>0)},uBurstWidth:{value:60}},Ue=(o,e)=>new Oe(c,{vertex:ht,fragment:o,uniforms:e,depthTest:!1,depthWrite:!1}),et=new be(c,{geometry:Ce,program:Ue(gt,N)}),tt=new be(c,{geometry:Ce,program:Ue(xt,i)}),pe=document.createElement("canvas"),T=pe.getContext("2d",{willReadFrequently:!0}),U=null,Fe=0,Le="",Ae=!1,D=1,_=1,he=!0,ne=0,ge=performance.now(),ze=0,J=0,Z=0,p={x:0,y:0,inside:!1,fresh:!0,placed:!1},w={x:0,y:0,px:0,py:0},W=[],Pe=()=>{D=Math.max(1,m.clientWidth),_=Math.max(1,m.clientHeight),K.setSize(D,_),i.uResolution.value=[g.width,g.height],N.uSize.value=[D,_],i.uSize.value=[D,_];let o=Math.max(2,Math.round(D*Xe)),e=Math.max(2,Math.round(_*Xe));(o!==z[0].width||e!==z[0].height)&&(z.forEach(je),z=[ue(o,e),ue(o,e)]),p.placed||(p.x=D/2,p.y=_/2)},at=(o,e)=>{if(!U||!T)return;let C=Math.ceil(g.width/o),F=Math.ceil(g.height/o),X=[e.pattern,e.levels,e.palette,e.contrast,e.brightness,e.fit,C,F,g.width,g.height].join("|");if(X===Le)return;Le=X;let[Y,H]=i.uCover.value,re=U.naturalWidth,se=U.naturalHeight;pe.width=C,pe.height=F,T.imageSmoothingEnabled=!0,T.imageSmoothingQuality="high";let[ie,j,xe]=i.uMatte.value;T.fillStyle=`rgb(${ie*255}, ${j*255}, ${xe*255})`,T.fillRect(0,0,C,F);let ee=(.5-.5*Y)*re,fe=(.5-.5*H)*se,f=C*o/g.width*Y*re,P=F*o/g.height*H*se,L=Math.max(ee,0),$=Math.max(fe,0),ye=Math.min(ee+f,re),we=Math.min(fe+P,se);ye>L&&we>$&&T.drawImage(U,L,$,ye-L,we-$,(L-ee)/f*C,($-fe)/P*F,(ye-L)/f*C,(we-$)/P*F);let ot=st=>Math.pow(Math.min(1,Math.max(0,(st-.5)*e.contrast+.5+e.brightness)),1.6),rt=T.getImageData(0,0,C,F).data;ae.image=pt(rt,C,F,Ge[e.pattern],e.levels,e.palette==="rgb",ot),ae.width=C,ae.height=F,ae.needsUpdate=!0},Be=o=>{ne=0;let e=B.current;if(!e)return;let C=Math.min(.05,Math.max(0,(o-ge)/1e3));ge=o;let F=e.wander&&!Ze,X=p.x,Y=p.y;if(!p.inside&&F){Z=Math.min(1,Z+C/1.2);let[f,P]=vt(o/1e3,D,_),L=Z*Z*(3-2*Z);X+=(f-X)*L,Y+=(P-Y)*L}else Z=0;if(J+=((p.inside||F?1:0)-J)*(1-Math.exp(-C/.16)),p.fresh)w.x=w.px=X,w.y=w.py=Y,p.fresh=!1;else{let f=1-Math.exp(-C/.035);w.x+=(X-w.x)*f,w.y+=(Y-w.y)*f}let H=i.uBursts.value;H.fill(0);for(let f=W.length-1;f>=0;f--)(o-W[f].start)/1e3>=$e&&W.splice(f,1);W.forEach((f,P)=>{let L=Math.max(0,(o-f.start)/1e3/$e),$=Math.hypot(Math.max(f.x,D-f.x),Math.max(f.y,_-f.y))+i.uBurstWidth.value;H[P*4]=f.x,H[P*4+1]=f.y,H[P*4+2]=$*Math.sin(L*Math.PI/2),H[P*4+3]=1-L*L*L}),J>.002&&(ze=o+e.linger*1e3+150);let re=de?0:1.5/255,se=e.linger>0?C/e.linger:1;N.tPrev.value=z[0].texture,N.uFrom.value=[w.px,w.py],N.uTo.value=[w.x,w.y],N.uRadius.value=e.revealRadius*(.45+.55*J),N.uSoftness.value=e.softness,N.uStrength.value=J,N.uFade.value=Math.max(se,re),i.uBurstWidth.value=Math.max(60,e.revealRadius*.9),K.render({scene:et,target:z[1]}),z.reverse(),w.px=w.x,w.py=w.y;let ie=Math.max(1,Math.round(e.pixelSize*K.dpr));U&&(i.uCover.value=ft(g.width,g.height,U.naturalWidth,U.naturalHeight,e.fit==="contain"));let j=ut[e.pattern]??0;if(Ge[e.pattern]&&(j=0,U&&!Ae))try{at(ie,e),j=3}catch{Ae=!0}j===1&&Q.width!==64&&(Q.image=dt(),Q.width=64,Q.height=64,Q.needsUpdate=!0);let xe=U?i.uCover.value[0]*U.naturalWidth/g.width:1;i.tMask.value=z[0].texture,i.uCell.value=ie,i.uLod.value=Math.log2(Math.max(ie*xe,1)),i.uPattern.value=j,i.uPalette.value=e.palette==="rgb"?1:0,i.uLevels.value=Math.max(2,Math.round(e.levels)),i.uInk.value=Re(e.inkColor),i.uPaper.value=Re(e.paperColor),i.uRimColor.value=Re(e.rimColor),i.uRim.value=Math.min(Math.max(e.rim,0),.95),i.uContrast.value=e.contrast,i.uBrightness.value=e.brightness,i.uReverse.value=e.reverse?1:0;let ee=U?Math.min(1,(o-Fe)/ct):0;i.uIntro.value=1-Math.pow(1-ee,2),K.render({scene:tt}),(p.inside||F||J>.002||W.length>0||o<ze||U&&ee<1)&&he&&(ne=requestAnimationFrame(Be))},G=()=>{ne||!he||(ge=performance.now(),ne=requestAnimationFrame(Be))};q.current=G;let O=new Image;O.crossOrigin="anonymous",O.decoding="async",O.onload=()=>{U=O,Ie.image=O;try{if(T){let o=mt(T,O);i.uMatte.value=o.matte,i.uKey.value=o.plain?1:0}}catch{}Fe=performance.now(),G()},O.src=r;let nt=o=>{let e=m.getBoundingClientRect();p.x=o.clientX-e.left,p.y=o.clientY-e.top,p.placed=!0},oe=o=>{nt(o),p.inside||(p.inside=!0,p.fresh=!0),G()},ce=()=>{p.inside=!1,G()},Ne=o=>{oe(o),!(!B.current?.clickBurst||o.pointerType==="mouse"&&o.button!==0)&&(W.push({x:p.x,y:p.y,start:performance.now()}),W.length>Ye&&W.shift())};m.addEventListener("pointermove",oe,{passive:!0}),m.addEventListener("pointerenter",oe,{passive:!0}),m.addEventListener("pointerdown",Ne,{passive:!0}),m.addEventListener("pointerleave",ce,{passive:!0}),m.addEventListener("pointercancel",ce,{passive:!0});let Te=new ResizeObserver(()=>{Pe(),G()});Te.observe(m);let De=new IntersectionObserver(([o])=>{he=o.isIntersecting,G()});return De.observe(m),Pe(),G(),()=>{cancelAnimationFrame(ne),q.current=()=>{},Te.disconnect(),De.disconnect(),O.onload=null,m.removeEventListener("pointermove",oe),m.removeEventListener("pointerenter",oe),m.removeEventListener("pointerdown",Ne),m.removeEventListener("pointerleave",ce),m.removeEventListener("pointercancel",ce),c.getExtension("WEBGL_lose_context")?.loseContext(),g.parentNode&&g.parentNode.removeChild(g)}},[r]),(0,Je.jsx)("div",{ref:te,className:`relative w-full h-full overflow-hidden touch-pan-y ${A}`.trim(),style:y})},Qe=yt;var Se=le(ve(),1),wt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],me=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],It=wt.map((r,a)=>({id:a+1,image:r,src:r,img:r,url:r,title:me[a],text:me[a],label:me[a],alt:me[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function bt({big:r}){return(0,Se.jsx)(We,{big:r,dark:!0,center:!0,zoom:1,drive:!1,children:(0,Se.jsx)(Qe,{})})}var Ut=_e(bt);export{Ut as default};
