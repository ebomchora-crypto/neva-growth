import{c as F,i as Be,j as U,l as xe,m as ve}from"./chunks/chunk-6IYH4WPJ.js";var C=F(Be(),1),D=F(U(),1),we={sm:"px-5 py-2.5 text-[0.875rem]",md:"px-7 py-3.5 text-[1rem]",lg:"px-[38px] py-[18px] text-[1.125rem]"},Fe="relative isolate m-0 inline-flex cursor-pointer items-center justify-center gap-[0.5em] border-0 [font-family:inherit] font-medium leading-none tracking-[0.01em] [color:var(--sb-text-color)] [border-radius:var(--sb-radius)] [background:color-mix(in_srgb,var(--sb-tint)_calc(var(--sb-tint-opacity)*100%),transparent)] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] [-webkit-backdrop-filter:blur(var(--sb-blur))] [backdrop-filter:blur(var(--sb-blur))] outline-none [-webkit-tap-highlight-color:transparent] transition-transform duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[3px] focus-visible:[outline-color:color-mix(in_srgb,var(--sb-text-color)_55%,transparent)] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100",L=24,ze=Math.PI*2,De=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ge=`#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`,Ne=["uCenter","uHalf","uRadius","uPx","uSpot","uEntry","uLineColor","uBaseColor","uIntensity","uWindow","uThickness","uGlow"],Z=(t,i,f)=>Math.min(f,Math.max(i,t)),z=t=>t-Math.floor(t),ge=(t,i,f,r,g)=>{let h=f-g,v=r-g,x=Math.PI/2*g,s=h+v+x,A=Math.abs(t),k=Math.abs(i),M=A-h,S=k-v,d;return M>0&&S>0?d=v+Math.atan2(S,M)*g:M>S?d=Math.min(k,v):d=v+x+h-Math.min(A,h),t<0?d=i>=0?2*s-d:2*s+d:i<0&&(d=4*s-d),z(d/Math.max(4*s,1e-4))},Ve=(t,i,f,r)=>{let g=i-r,h=f-r,v=Math.PI/2*r,x=g+h+v,s=z(t)*4*x,A=1,k=1;s>3*x?(s=4*x-s,k=-1):s>2*x?(s-=2*x,A=-1,k=-1):s>x&&(s=2*x-s,A=-1);let M=g-(s-h-v),S=f;if(s<=h)M=i,S=s;else if(s<=h+v){let d=(s-h)/Math.max(r,1e-4);M=g+Math.cos(d)*r,S=h+Math.sin(d)*r}return[M*A,S*k]},ye=(t,i,f)=>{let r=t.createShader(i);return r?(t.shaderSource(r,f),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(t.deleteShader(r),null)):null},He=t=>{let i=ye(t,t.VERTEX_SHADER,De),f=ye(t,t.FRAGMENT_SHADER,Ge),r=t.createProgram();return!i||!f||!r?null:(t.attachShader(r,i),t.attachShader(r,f),t.bindAttribLocation(r,0,"aPosition"),t.linkProgram(r),t.deleteShader(i),t.deleteShader(f),t.getProgramParameter(r,t.LINK_STATUS)?r:(t.deleteProgram(r),null))},Oe=({children:t="Get Started",size:i="lg",radius:f=18,tint:r="#ffffff",tintOpacity:g=.04,blur:h=0,textColor:v="#f5f5f5",lineColor:x="#ffffff",baseColor:s="#525252",intensity:A=1,idleIntensity:k=.35,shineSize:M=10,shineFade:S=34,thickness:d=1.2,glow:Se=1,speed:Re=.35,followMouse:Ae=!0,proximity:ke=250,autoAnimate:Ee=!1,disabled:j=!1,onClick:Pe,className:ee="",type:Ce="button",style:Ie,...Te})=>{let te=(0,C.useRef)(null),ne=(0,C.useRef)(null),X=(0,C.useRef)(null),oe={radius:Math.max(0,f),lineColor:String(x),baseColor:String(s),intensity:Math.max(0,A),idleIntensity:Z(k,0,1),shineSize:Math.max(0,M),shineFade:Math.max(0,S),thickness:Math.max(0,d),glow:Math.max(0,Se),speed:Re,followMouse:Ae,proximity:Math.max(1,ke),autoAnimate:Ee,disabled:j},G=(0,C.useRef)(oe);return G.current=oe,(0,C.useEffect)(()=>{let E=te.current,P=ne.current,n=P?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!E||!P||!n)return;let N=He(n);if(!N)return;let b={};for(let e of Ne)b[e]=n.getUniformLocation(N,e);let re=n.createBuffer(),Y=n.createVertexArray();n.bindVertexArray(Y),n.bindBuffer(n.ARRAY_BUFFER,re),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),n.STATIC_DRAW),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindVertexArray(null);let q=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),qe=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,$=new Map,l={width:1,height:1,ratio:1},w={x:0,y:0,known:!1},a={spot:0,level:0,press:0,ready:!1},_=0,B=0,V=!0,ie=e=>{if($.has(e))return $.get(e);let o=[1,1,1];if(q){q.clearRect(0,0,1,1),q.fillStyle="#000000",q.fillStyle=e,q.fillRect(0,0,1,1);let[c,u,m]=q.getImageData(0,0,1,1).data;o=[c/255,u/255,m/255]}return $.set(e,o),o},ae=e=>Math.min(e.radius,l.width/2,l.height/2),K=e=>{let o=ae(e),c=o*(1-Math.SQRT1_2);return ge(c-l.width/2,l.height/2-c,l.width/2,l.height/2,o)},Le=e=>{if(!e.followMouse||e.disabled||!w.known)return null;let o=E.getBoundingClientRect(),c=o.width/l.width||1,u=l.width/2,m=l.height/2,y=(w.x-o.left-o.width/2)/c,p=(o.top+o.height/2-w.y)/c,R=Math.hypot(Math.max(Math.abs(y)-u,0),Math.max(Math.abs(p)-m,0)),T=Z(1-R/e.proximity,0,1),he=T*T*(3-2*T),O=ge(y,p,u,m,ae(e));if(R>0)return{spot:O,near:he};let Q=Z(Math.min(u-Math.abs(y),m-Math.abs(p))/(m*.8),0,1),be=K(e)-y/u*.06-p/m*.02,_e=be-O-Math.round(be-O);return{spot:z(O+_e*Q*Q*(3-2*Q)),near:he}},se=e=>{let{width:o,height:c}=l,u=P.width/(o+L*2),m=P.height/(c+L*2);n.viewport(0,0,P.width,P.height),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),n.useProgram(N),n.uniform2f(b.uCenter,(L+o/2)*u,(L+c/2)*m),n.uniform2f(b.uHalf,o/2*u,c/2*m),n.uniform1f(b.uRadius,Math.min(e.radius,o/2,c/2)*u),n.uniform1f(b.uPx,l.ratio);let y=Math.min(e.radius,o/2,c/2),[p,R]=Ve(a.spot,o/2,c/2,y),T=1-Math.min(.35*(c/2),Math.hypot(p,R))/Math.max(Math.hypot(p,R),1e-4);n.uniform1f(b.uSpot,a.spot),n.uniform2f(b.uEntry,p*T*u,R*T*m),n.uniform3fv(b.uLineColor,ie(e.lineColor)),n.uniform3fv(b.uBaseColor,ie(e.baseColor)),n.uniform1f(b.uIntensity,e.intensity*(a.level+a.press*.8)),n.uniform2f(b.uWindow,e.shineSize/360+a.press*.06,e.shineFade/360+1e-4),n.uniform1f(b.uThickness,e.thickness),n.uniform1f(b.uGlow,e.glow),n.bindVertexArray(Y),n.drawArrays(n.TRIANGLES,0,3),n.bindVertexArray(null)},ce=e=>{if(_=0,!V)return;let o=G.current,c=B?Math.min(.05,(e-B)/1e3):1/60;B=e;let u=Le(o),m=o.autoAnimate&&!qe,y=!!u&&u.near>0;a.ready||(a.spot=K(o),a.level=o.autoAnimate?1:o.idleIntensity,a.ready=!0);let p=0;m&&!y?a.spot=z(a.spot+o.speed/ze*c):(p=(y?u.spot:K(o))-a.spot,p-=Math.round(p),a.spot=z(a.spot+p*(1-Math.exp(-c*8))));let R=o.autoAnimate?1:o.idleIntensity+(1-o.idleIntensity)*(u?u.near:0);a.level+=(R-a.level)*(1-Math.exp(-c*7)),a.press*=Math.exp(-c*5),se(o),Math.abs(p)>2e-4||Math.abs(R-a.level)>.001||a.press>.002||m&&!y?_=requestAnimationFrame(ce):B=0},I=()=>{!_&&V&&(_=requestAnimationFrame(ce))},le=e=>{let o=e?.borderBoxSize?.[0];l.width=Math.max(1,o?o.inlineSize:E.offsetWidth),l.height=Math.max(1,o?o.blockSize:E.offsetHeight),l.ratio=Math.min(window.devicePixelRatio||1,3),P.width=Math.max(1,Math.round((l.width+L*2)*l.ratio)),P.height=Math.max(1,Math.round((l.height+L*2)*l.ratio)),a.ready&&se(G.current),I()},ue=e=>{w.x=e.clientX,w.y=e.clientY,w.known=!0,I()},fe=e=>{w.x=e.clientX,w.y=e.clientY,w.known=!0,G.current.disabled||(a.press=1),I()},H=e=>{e.pointerType!=="mouse"&&(w.known=!1,I())},de=()=>{w.known=!1,I()},me=new ResizeObserver(e=>le(e[e.length-1]));me.observe(E);let pe=new IntersectionObserver(e=>{V=e.some(o=>o.isIntersecting),V&&(B=0,I())});return pe.observe(E),window.addEventListener("pointermove",ue,{passive:!0}),window.addEventListener("pointerup",H,{passive:!0}),window.addEventListener("pointercancel",H,{passive:!0}),document.documentElement.addEventListener("pointerleave",de),E.addEventListener("pointerdown",fe),le(),X.current=I,()=>{cancelAnimationFrame(_),X.current=null,me.disconnect(),pe.disconnect(),window.removeEventListener("pointermove",ue),window.removeEventListener("pointerup",H),window.removeEventListener("pointercancel",H),document.documentElement.removeEventListener("pointerleave",de),E.removeEventListener("pointerdown",fe),n.deleteBuffer(re),n.deleteVertexArray(Y),n.deleteProgram(N),n.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,C.useEffect)(()=>{X.current?.()}),(0,D.jsxs)("button",{ref:te,type:Ce,disabled:j,onClick:Pe,className:`${Fe} ${we[i]??we.lg}${ee?` ${ee}`:""}`,style:{"--sb-radius":`${f}px`,"--sb-tint":r,"--sb-tint-opacity":g,"--sb-blur":`${h}px`,"--sb-text-color":v,...Ie},...Te,children:[(0,D.jsx)("canvas",{ref:ne,className:"pointer-events-none absolute -inset-6 z-[1] block h-[calc(100%+48px)] w-[calc(100%+48px)]","aria-hidden":"true"}),(0,D.jsx)("span",{className:"relative z-[2] inline-flex items-center gap-[inherit]",children:t})]})},Me=Oe;var J=F(U(),1),Ue=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],W=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ze=Ue.map((t,i)=>({id:i+1,image:t,src:t,img:t,url:t,title:W[i],text:W[i],label:W[i],alt:W[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function We({big:t}){return(0,J.jsx)(ve,{big:t,dark:!0,center:!0,zoom:1,drive:!1,children:(0,J.jsx)(Me,{})})}var Je=xe(We);export{Je as default};
