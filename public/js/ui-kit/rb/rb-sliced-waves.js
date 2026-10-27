import{c as H,i as xt,j as J,l as Ce,m as Ue}from"./chunks/chunk-6IYH4WPJ.js";var S=H(xt(),1),me=H(J(),1),gt=`#version 300 es
in vec2 aCorner;
in vec4 aShape;
in vec4 aTop;
in vec4 aBottom;
uniform vec2 uView;
uniform float uAngle;
out vec2 vLocal;
out vec4 vShape;
out vec4 vTop;
out vec4 vBottom;
void main() {
  float halo = aShape.z + 5.0;
  float reachX = aShape.z + max(aTop.w * 2.5, halo * 2.0);
  float reachY = aShape.w + max(aTop.w * 2.5, halo * 2.0);
  vec2 local = aCorner * vec2(reachX, reachY);
  vLocal = local;
  vShape = aShape;
  vTop = aTop;
  vBottom = aBottom;
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 p = aShape.xy + local - uView * 0.5;
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + uView * 0.5;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`,At=`#version 300 es
precision highp float;
in vec2 vLocal;
in vec4 vShape;
in vec4 vTop;
in vec4 vBottom;
uniform float uGlow;
uniform float uSlices;
uniform float uBase;
uniform float uHalfBar;
uniform float uScale;
out vec4 outColor;

float erfApprox(float x) {
  float a = x * x;
  float t = 1.0 - exp(-a * (1.2732395 + 0.147 * a) / (1.0 + 0.147 * a));
  return sign(x) * sqrt(max(t, 0.0));
}

float box(float d, float h, float s) {
  float k = 0.70710678 / max(s, 0.3);
  return 0.5 * (erfApprox((h - d) * k) + erfApprox((h + d) * k));
}

void main() {
  float blur = vTop.w;
  float body = box(vLocal.x, vShape.z, blur) * box(vLocal.y, vShape.w, blur * 1.15);
  float halo = vShape.z + 5.0;
  float glow = box(vLocal.x, vShape.z, halo) * box(vLocal.y, vShape.w, halo);
  float t = clamp(vLocal.y / max(vShape.w, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = mix(vTop.rgb, vBottom.rgb, t);
  float v = clamp(vLocal.y / max(vShape.w, 0.001), -1.0, 1.0);
  float core = exp(-pow(vLocal.x / max(vShape.z + blur * 0.5, 0.5), 2.0) * 1.5);
  body *= (1.0 + 0.35 * core) * (1.0 - 0.35 * v * v * v * v);
  if (uSlices > 0.0) {
    float cell = vShape.z / max(uHalfBar, 0.00001) / uSlices;
    float y = (uBase - vShape.y - vLocal.y) / max(cell, 0.001);
    float f = 1.0 - abs(fract(y) - 0.5) * 2.0;
    float soft = clamp(blur / max(cell, 0.001) * 1.6, 0.04, 1.0);
    body *= smoothstep(0.28 - soft, 0.28 + soft, f);
  }
  vec3 tint = color * color / max(max(color.r, max(color.g, color.b)), 0.05);
  outColor = vec4((color * body + tint * uGlow * glow * 0.16) * vBottom.w * uScale, 1.0);
}`,Et=`#version 300 es
in vec2 aCorner;
void main() {
  gl_Position = vec4(aCorner, 0.0, 1.0);
}`,Rt=`#version 300 es
precision highp float;
uniform sampler2D uLight;
uniform vec2 uResolution;
uniform float uScale;
uniform float uExposure;
uniform float uGrain;
uniform float uTime;
uniform float uFade;
uniform float uOpacity;
uniform float uLightMode;
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
  vec3 hdr = texelFetch(uLight, ivec2(gl_FragCoord.xy), 0).rgb / uScale * uExposure;
  vec2 uv = gl_FragCoord.xy / uResolution;
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  mask *= uOpacity;
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  float peak = max(hdr.r, max(hdr.g, hdr.b));
  if (uLightMode > 0.5) {
    vec3 hue = hdr / max(peak, 0.0001);
    float tone = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    vec3 color = pow(clamp(hue * min(1.0, 0.66 / max(tone, 0.001)), 0.0, 1.0), vec3(1.0 / 2.2));
    float alpha = clamp((1.0 - exp(-peak * 1.1)) * 0.85 * (1.0 + grain), 0.0, 1.0) * mask;
    outColor = vec4(color * alpha, alpha);
  } else {
    vec3 mapped = 1.0 - exp(-hdr);
    mapped = mix(mapped, vec3(1.0), smoothstep(1.1, 3.2, peak) * 0.75);
    float level = max(mapped.r, max(mapped.g, mapped.b));
    mapped = clamp(mapped + grain * (0.25 + level), 0.0, 1.0) * mask;
    outColor = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
  }
}`,de=Math.PI*2,Tt=6,wt=1.1,U=2.6,Mt=1.5,Ie=2560,E=(o,c,m)=>Math.min(m,Math.max(c,o)),Ve=o=>{let c=Math.sin(o*127.1+311.7)*43758.5453;return c-Math.floor(c)},St=o=>{let c=Math.floor(o),m=o-c,u=m*m*(3-2*m);return Ve(c)*(1-u)+Ve(c+1)*u},Xe=(o,c,m)=>{let u=o.createShader(c);return u?(o.shaderSource(u,m),o.compileShader(u),o.getShaderParameter(u,o.COMPILE_STATUS)?u:(o.deleteShader(u),null)):null},Oe=(o,c,m,u)=>{let w=Xe(o,o.VERTEX_SHADER,c),I=Xe(o,o.FRAGMENT_SHADER,m),g=o.createProgram();return!w||!I||!g?null:(o.attachShader(g,w),o.attachShader(g,I),u.forEach((ee,te)=>o.bindAttribLocation(g,te,ee)),o.linkProgram(g),o.deleteShader(w),o.deleteShader(I),o.getProgramParameter(g,o.LINK_STATUS)?g:(o.deleteProgram(g),null))},Ne=(o,c,m)=>{let u={};for(let w of m)u[w]=o.getUniformLocation(c,w);return u},yt=({color1:o="#ffd9a8",color2:c="#ff5fa2",color3:m="#5b8cff",ribbons:u=3,spacing:w=28,barWidth:I=.5,ribbonHeight:g=.26,spread:ee=.1,amplitude:te=.1,frequency:ke=1,speed:Ye=1,perspective:He=.45,curve:ze=.5,blur:We=.6,glow:qe=1,brightness:Ze=1.25,position:$e=.78,rotation:Ke=0,slices:Qe=0,grain:Je=.08,mouseInteraction:je=!0,intro:et=!0,fade:tt=0,opacity:ot=1,lightMode:at=!1,paused:rt=!1,dpr:nt,className:it="",...ct})=>{let be=(0,S.useRef)(null),ve=(0,S.useRef)(null),oe=(0,S.useRef)(null),xe={color1:String(o),color2:String(c),color3:String(m),ribbons:Math.round(E(u,1,Tt)),spacing:E(w,4,200),barWidth:E(I,.05,1),ribbonHeight:Math.max(0,g),spread:Math.max(0,ee),amplitude:Math.max(0,te),frequency:Math.max(0,ke),speed:Ye,perspective:E(He,0,1),curve:E(ze,0,1),blur:E(We,0,2),glow:Math.max(0,qe),brightness:Math.max(0,Ze),position:E($e,0,1),rotation:Ke,slices:Math.max(0,Math.round(Qe)),grain:Math.max(0,Je),mouseInteraction:je,intro:et,fade:E(tt,0,1),opacity:E(ot,0,1),lightMode:at,paused:rt,dpr:nt},V=(0,S.useRef)(xe);return V.current=xe,(0,S.useEffect)(()=>{let B=be.current,l=ve.current,e=l?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!B||!l||!e)return;let ge=!!e.getExtension("EXT_color_buffer_float"),Ae=ge?1:.25,z=Oe(e,gt,At,["aCorner","aShape","aTop","aBottom"]),W=Oe(e,Et,Rt,["aCorner"]);if(!z||!W)return;let y=Ne(e,z,["uView","uAngle","uGlow","uSlices","uBase","uHalfBar","uScale"]),R=Ne(e,W,["uLight","uResolution","uScale","uExposure","uGrain","uTime","uFade","uOpacity","uLightMode"]),ae=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ae),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);let re=e.createBuffer(),ne=e.createVertexArray();e.bindVertexArray(ne),e.bindBuffer(e.ARRAY_BUFFER,ae),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,re);for(let t=1;t<=3;t++)e.enableVertexAttribArray(t),e.vertexAttribPointer(t,4,e.FLOAT,!1,48,(t-1)*16),e.vertexAttribDivisor(t,1);let Ee=e.createBuffer(),ie=e.createVertexArray();e.bindVertexArray(ie),e.bindBuffer(e.ARRAY_BUFFER,Ee),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);let X=e.createTexture();e.bindTexture(e.TEXTURE_2D,X),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let ce=e.createFramebuffer(),_=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),q=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,se=new Map,A=new Float32Array(0),v={x:0,y:0,inside:!1},a={width:1,height:1,targetWidth:0,targetHeight:0,time:0,intro:V.current.intro&&!q?0:1,focus:U,focusVelocity:0,lift:0,liftX:0},F=0,L=0,Z=!0,le=!0,st=t=>{if(se.has(t))return se.get(t);let r=[1,1,1];if(_&&t){_.clearRect(0,0,1,1),_.fillStyle="#000000",_.fillStyle=/^[0-9a-f]{3,8}$/i.test(t)?`#${t}`:t,_.fillRect(0,0,1,1);let[n,i,s]=_.getImageData(0,0,1,1).data;r=[n,i,s].map(f=>Math.pow(f/255,2.2))}return se.set(t,r),r},Re=(t,r,n)=>{let i=t.length,s=(r%i+i)%i,f=Math.floor(s),d=s-f;d=d*d*(3-2*d);let x=t[f],p=t[(f+1)%i];for(let b=0;b<3;b++)A[n+b]=x[b]+(p[b]-x[b])*d},lt=()=>{a.targetWidth===l.width&&a.targetHeight===l.height||(a.targetWidth=l.width,a.targetHeight=l.height,e.bindTexture(e.TEXTURE_2D,X),ge?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,l.width,l.height,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,l.width,l.height,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,ce),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,X,0),e.bindFramebuffer(e.FRAMEBUFFER,null))},Te=t=>{let{width:r,height:n}=a,i=n*wt,s=i/U,f=t.spacing/s,d=f*t.barWidth*.5,x=t.perspective*.66,p=Math.cos(x),b=Math.sin(x),ue=t.curve*.6,$=t.rotation*Math.PI/180,O=Math.abs(Math.cos($))*r*.5+Math.abs(Math.sin($))*n*.5,N=Math.ceil(Math.max(r,n)/i*U*2.4/f),K=[];for(let P=-N;P<=N;P++){let C=P*f,G=ue*Math.sin(C*.9+.8),k=C*p-G*b,h=C*b+G*p+U;if(h<.45)continue;let Y=i/h,Q=r*.5+k*Y;Math.abs(Q-r*.5)>O+d*Y+80||K.push({i:P,x:C,Z:h,sx:Q,scale:Y})}return{bars:K,halfBar:d,centerScale:s}},ft=(t,r)=>{let{width:n,height:i}=a,{bars:s,halfBar:f,centerScale:d}=r,x=[t.color1,t.color2,t.color3].map(st),p=a.time,b=t.ribbonHeight*i*.5/d,ue=t.spread*i/d,$=t.amplitude*i/d,O=.22*t.frequency,N=i*t.position,K=a.focus,P=t.blur*16,C=1.6+.04*(t.ribbons-1),G=s.length*t.ribbons*12;G>A.length&&(A=new Float32Array(G+1200));let k=0;for(let h of s){let Y=f*h.scale,Q=h.sx/Math.max(n,1),ht=a.lift*Math.exp(-Math.pow((h.sx-a.liftX)/Math.max(n*.12,60),2)),dt=(.5+t.blur*.6+P*Math.abs(K/h.Z-1))*(t.lightMode?.55:1);for(let T=0;T<t.ribbons;T++){let mt=(T-(t.ribbons-1)/2)*ue,pt=.62*Math.sin(de*O*h.x-p*1.6+T*2.1)+.38*Math.sin(de*O*1.9*h.x+p*2.25+T*1.3),bt=mt+pt*$,vt=.5+.5*Math.sin(de*O*.7*h.x+p*1.1+T*2.7),he=E((a.intro*C-Q-T*.04)/.6,0,1),Le=he*he*(3-2*he),De=b*(.6+.4*vt)*Le*h.scale;if(De<.4)continue;let Pe=T*1.15+h.x*.3+p*.12,M=k*12;A[M]=h.sx,A[M+1]=N-bt*h.scale,A[M+2]=Y,A[M+3]=De,Re(x,Pe-.22,M+4),A[M+7]=dt,Re(x,Pe+.22,M+8),A[M+11]=(.75+.25*St(h.i*.9+T*7.7-p*1.2))*(1+ht*.6)*(.4+.6*Le),k++}}return{count:k,halfBar:f,base:N}},fe=(t,r=Te(t))=>{lt();let{count:n,halfBar:i,base:s}=ft(t,r);e.bindFramebuffer(e.FRAMEBUFFER,ce),e.viewport(0,0,l.width,l.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),n>0&&(e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE),e.useProgram(z),e.uniform2f(y.uView,a.width,a.height),e.uniform1f(y.uAngle,t.rotation*Math.PI/180),e.uniform1f(y.uGlow,t.lightMode?t.glow*.4:t.glow),e.uniform1f(y.uSlices,t.slices),e.uniform1f(y.uBase,s),e.uniform1f(y.uHalfBar,i),e.uniform1f(y.uScale,Ae),e.bindVertexArray(ne),e.bindBuffer(e.ARRAY_BUFFER,re),e.bufferData(e.ARRAY_BUFFER,A.subarray(0,n*12),e.DYNAMIC_DRAW),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,n),e.disable(e.BLEND)),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,l.width,l.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(W),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,X),e.uniform1i(R.uLight,0),e.uniform2f(R.uResolution,l.width,l.height),e.uniform1f(R.uScale,Ae),e.uniform1f(R.uExposure,1.6*t.brightness),e.uniform1f(R.uGrain,t.grain),e.uniform1f(R.uTime,a.time%1e3),e.uniform1f(R.uFade,t.fade),e.uniform1f(R.uOpacity,t.opacity),e.uniform1f(R.uLightMode,t.lightMode?1:0),e.bindVertexArray(ie),e.drawArrays(e.TRIANGLES,0,3),e.bindVertexArray(null)},ut=(t,r)=>{let n=null;for(let i of t.bars)(!n||Math.abs(i.sx-r)<Math.abs(n.sx-r))&&(n=i);return n?n.Z:U},we=t=>{if(F=0,!le||!Z||document.hidden)return;let r=V.current,n=L?Math.min(.05,(t-L)/1e3):1/60;L=t;let i=!r.paused&&!q;i&&(a.time+=n*r.speed),!r.intro||q?a.intro=1:a.intro<1&&(a.intro=Math.min(1,a.intro+n/Mt));let s=r.mouseInteraction&&v.inside&&!q,f=r.rotation*Math.PI/180,d=Math.cos(f)*(v.x-a.width*.5)+Math.sin(f)*(v.y-a.height*.5)+a.width*.5,x=Te(r),p=s?ut(x,d):U;a.focusVelocity+=(36*(p-a.focus)-11*a.focusVelocity)*n,a.focus+=a.focusVelocity*n,a.lift+=((s?1:0)-a.lift)*(1-Math.exp(-n/(s?.25:.6))),a.liftX+=(d-a.liftX)*(1-Math.exp(-n/.12)),fe(r,x);let b=a.intro<1||Math.abs(p-a.focus)>.001||Math.abs(a.focusVelocity)>.001||a.lift>.002||s;i||b?F=requestAnimationFrame(we):L=0},D=()=>{!F&&le&&Z&&!document.hidden&&(F=requestAnimationFrame(we))},Me=()=>{let t=V.current,r=Math.max(1,B.clientWidth),n=Math.max(1,B.clientHeight),i=Math.min(t.dpr||window.devicePixelRatio||1,2),s=Math.max(r,n)*i,f=s>Ie?i*Ie/s:i;a.width=r,a.height=n,l.width=Math.max(1,Math.round(r*f)),l.height=Math.max(1,Math.round(n*f)),F||fe(t),D()},Se=t=>{let r=B.getBoundingClientRect();v.x=t.clientX-r.left,v.y=t.clientY-r.top,v.inside=v.x>=0&&v.y>=0&&v.x<=r.width&&v.y<=r.height,D()},ye=()=>{v.inside=!1,D()},Fe=()=>{L=0,D()},Be=new ResizeObserver(Me);Be.observe(B);let _e=new IntersectionObserver(t=>{Z=t.some(r=>r.isIntersecting),Z&&(L=0,D())});return _e.observe(B),window.addEventListener("pointermove",Se,{passive:!0}),document.documentElement.addEventListener("pointerleave",ye),document.addEventListener("visibilitychange",Fe),Me(),oe.current=()=>{F||fe(V.current),D()},()=>{le=!1,cancelAnimationFrame(F),oe.current=null,Be.disconnect(),_e.disconnect(),window.removeEventListener("pointermove",Se),document.documentElement.removeEventListener("pointerleave",ye),document.removeEventListener("visibilitychange",Fe),e.deleteFramebuffer(ce),e.deleteTexture(X),e.deleteBuffer(ae),e.deleteBuffer(re),e.deleteBuffer(Ee),e.deleteVertexArray(ne),e.deleteVertexArray(ie),e.deleteProgram(z),e.deleteProgram(W)}},[]),(0,S.useEffect)(()=>{oe.current?.()}),(0,me.jsx)("div",{ref:be,className:["relative h-full w-full overflow-hidden",it].filter(Boolean).join(" "),...ct,children:(0,me.jsx)("canvas",{ref:ve,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ge=yt;var pe=H(J(),1),Ft=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],j=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],It=Ft.map((o,c)=>({id:c+1,image:o,src:o,img:o,url:o,title:j[c],text:j[c],label:j[c],alt:j[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Bt({big:o}){return(0,pe.jsx)(Ue,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,pe.jsx)(Ge,{})})}var Vt=Ce(Bt);export{Vt as default};
