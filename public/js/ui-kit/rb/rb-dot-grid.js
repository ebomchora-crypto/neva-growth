import{c as oe,i as yt,j as me,l as Qe,m as Ze}from"./chunks/chunk-6IYH4WPJ.js";var U=oe(yt(),1),Me=oe(me(),1),xt=`#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aMotion;
layout(location = 2) in vec2 aState;

uniform vec2 uResolution;
uniform float uSize;
uniform float uSwell;
uniform float uStretch;
uniform float uGlow;

out vec2 vLocal;
out vec2 vPoint;
out float vLength;
out float vRadius;
out float vEnergy;

void main() {
  float energy = aState.x;
  float radius = 0.5 * uSize * aState.y * (1.0 + uSwell * energy);
  float speed = length(aMotion.zw);
  float angle = speed > 0.001 ? atan(aMotion.w, aMotion.z) : 0.0;
  float axis = floor(angle / 1.5707963 + 0.5) * 1.5707963;
  angle = axis + (angle - axis) * smoothstep(8.0, 70.0, speed);
  vec2 dir = vec2(cos(angle), sin(angle));
  float halfLength = min(uSize * 2.0, speed * uStretch * 0.02);
  float pad = radius * (1.0 + uGlow * energy * 2.5) + 2.0;
  vec2 local = aCorner * vec2(halfLength + pad, pad);
  vec2 point = aMotion.xy + dir * local.x + vec2(-dir.y, dir.x) * local.y;
  vLocal = local;
  vPoint = point;
  vLength = halfLength;
  vRadius = radius;
  vEnergy = energy;
  vec2 clip = point / uResolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`,wt=`#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vPoint;
in float vLength;
in float vRadius;
in float vEnergy;

uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uActive;
uniform float uGlow;
uniform float uOpacity;
uniform float uFade;
uniform int uShape;

out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  float d;
  if (uShape == 1) {
    float corner = vRadius * 0.3;
    vec2 q = abs(vLocal) - vec2(vLength + vRadius, vRadius) + corner;
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  } else {
    d = length(vec2(max(abs(vLocal.x) - vLength, 0.0), vLocal.y)) - vRadius;
  }
  float aa = max(fwidth(d), 0.0001);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);
  float halo = uGlow * vEnergy * 0.5 * exp(-max(d, 0.0) / max(vRadius * 1.3, 0.6));
  float alpha = body + (1.0 - body) * halo;
  vec3 color = mix(uBase, uActive, clamp(vEnergy * 1.2, 0.0, 1.0));
  float fade = 1.0;
  if (uFade > 0.0) {
    vec2 edge = min(vPoint, uResolution - vPoint) / (uFade * 0.4 * min(uResolution.x, uResolution.y));
    fade = smootherstep01(edge.x) * smootherstep01(edge.y);
  }
  alpha *= uOpacity * fade;
  outColor = vec4(color * alpha, alpha);
}
`,et=u=>{let c=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(u).trim());if(!c)return[1,1,1];let S=c[1].length===3?c[1].replace(/./g,b=>b+b):c[1];return[0,2,4].map(b=>parseInt(S.slice(b,b+2),16)/255)},Ae=u=>{let c=Math.min(1,Math.max(0,u));return c*c*c*(c*(c*6-15)+10)},bt=u=>{let S=u-1;return 1+S*S*((1.9+1)*S+1.9)},tt=(u,c,S)=>{let b=u.createShader(c);return u.shaderSource(b,S),u.compileShader(b),b},At=({dotSize:u=5,gap:c=18,baseColor:S="#3a3446",activeColor:b="#ffffff",proximity:Fe=140,strength:ot=1,bounce:rt=.6,tension:at=.4,returnDuration:it=.8,shockRadius:ct=320,shockStrength:st=5,swell:Se=.8,stretch:Ee=.5,glow:Le=.5,shape:Be="circle",fade:Pe=0,opacity:Ie=1,intro:lt=!0,mouseInteraction:Te=!0,clickShock:ft=!0,paused:Oe=!1,dpr:ut,className:ht="",style:dt})=>{let _e=(0,U.useRef)(null),re=(0,U.useRef)(null),De={dotSize:u,gap:c,baseColor:S,activeColor:b,proximity:Fe,strength:ot,bounce:rt,tension:at,returnDuration:it,shockRadius:ct,shockStrength:st,swell:Se,stretch:Ee,glow:Le,shape:Be,fade:Pe,opacity:Ie,intro:lt,mouseInteraction:Te,clickShock:ft,paused:Oe,dpr:ut},M=(0,U.useRef)(De);return M.current=De,(0,U.useEffect)(()=>{let E=_e.current;if(!E)return;let e=E.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!e)return;let q=e.createProgram();if(e.attachShader(q,tt(e,e.VERTEX_SHADER,xt)),e.attachShader(q,tt(e,e.FRAGMENT_SHADER,wt)),e.linkProgram(q),!e.getProgramParameter(q,e.LINK_STATUS))return;let R={};for(let o of["uResolution","uSize","uSwell","uStretch","uGlow","uBase","uActive","uOpacity","uFade","uShape"])R[o]=e.getUniformLocation(q,o);let pe=e.createVertexArray();e.bindVertexArray(pe);let ze=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ze),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let ae=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ae),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,24,0),e.vertexAttribDivisor(1,1),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,2,e.FLOAT,!1,24,16),e.vertexAttribDivisor(2,1),e.bindVertexArray(null);let Q=window.matchMedia("(prefers-reduced-motion: reduce)").matches,m={width:0,height:0,left:0,top:0,ratio:1},p={count:0,cols:1,rows:1,cell:1,centerX:0,centerY:0,reach:1},I=new Float32Array(0),s=new Float32Array(0),l=new Float32Array(0),Z=new Float32Array(0),ie=new Float32Array(0),x=new Float32Array(0),ge=new Float32Array(0),T=new Float32Array(0),t={x:0,y:0,vx:0,vy:0,time:0,inside:!1,presence:0},X=[],F=M.current.intro&&!Q?-1:null,ce=!0,H=0,ye=0,Ce=()=>{let{dotSize:o,gap:n}=M.current,r=Math.max(2,o+n),v=Math.max(1,Math.floor((m.width+n)/r)),A=Math.max(1,Math.floor((m.height+n)/r)),L=(m.width-(v*r-n))/2+o/2,w=(m.height-(A*r-n))/2+o/2,h=v*A;I=new Float32Array(h*2),s=new Float32Array(h*2),l=new Float32Array(h*2),Z=new Float32Array(h*2),ie=new Float32Array(h*2),x=new Float32Array(h*4),ge=new Float32Array(h),T=new Float32Array(h*6);for(let y=0;y<A;y++)for(let d=0;d<v;d++){let B=(y*v+d)*2;I[B]=L+d*r,I[B+1]=w+y*r}Object.assign(p,{count:h,cols:v,rows:A,cell:r,centerX:m.width/2,centerY:m.height/2,reach:Math.hypot(m.width,m.height)/2}),e.bindBuffer(e.ARRAY_BUFFER,ae),e.bufferData(e.ARRAY_BUFFER,T.byteLength,e.DYNAMIC_DRAW)},Ye=()=>{let o=E.getBoundingClientRect(),n=Math.min(M.current.dpr??window.devicePixelRatio??1,2),r=Math.max(1,Math.round(o.width)),v=Math.max(1,Math.round(o.height));Object.assign(m,{width:r,height:v,left:o.left,top:o.top,ratio:n}),E.width=Math.round(r*n),E.height=Math.round(v*n),Ce(),se(performance.now())},mt=(o,n)=>{let r=M.current,v=Q?0:1,A=1-.85*Math.min(1,Math.max(0,r.bounce)),L=4/(A*Math.max(.2,r.returnDuration)),w=L*L,h=2*A*L,y=Math.max(1,r.proximity),d=Math.hypot(t.vx,t.vy),B=r.mouseInteraction&&t.inside?6500*Math.tanh(d/900)*r.strength*v:0,le=d>.001?t.vx/d:0,fe=d>.001?t.vy/d:0,_=p.cell*1.4,ee=650,D=X.map(f=>{let i=(n-f.start)/1e3*ee,g=Ae(1-i/Math.max(1,r.shockRadius));return{...f,front:i,amplitude:g*r.shockStrength*p.cell*.24*v}}),P=(Math.max(0,r.tension)*900)**2/(p.cell*p.cell),W=Math.sqrt(P)*.06,pt=Math.sqrt(w+8*P)+h+8*W,We=Math.min(24,Math.max(1,Math.ceil(o/Math.min(1/120,1.2/pt)))),we=o/We;for(let f=0;f<p.count;f++){let i=f*2,g=I[i],a=I[i+1],K=0,j=0;if(B>0){let z=g+s[i]-t.x,te=a+s[i+1]-t.y,C=Math.hypot(z,te);if(C<y){let $=Ae(1-C/y)*B,J=C>.001?z/C:0,ne=C>.001?te/C:0;K+=$*(le+J*.6),j+=$*(fe+ne*.6)}}let N=0,V=0,k=0,G=0;for(let z of D){if(z.amplitude<=0)continue;let te=g-z.x,C=a-z.y,$=Math.hypot(te,C),J=($-z.front)/_;if(Math.abs(J)<3&&$>.001){let ne=te/$,be=C/$,je=Math.exp(-J*J),de=z.amplitude*je,Je=z.amplitude*2*J*je/_*ee;N+=ne*de,V+=be*de,k+=ne*Je,G+=be*Je,K+=ne*de*w*.35,j+=be*de*w*.35}}Z[i]=K,Z[i+1]=j;let he=f*4;x[he]=N,x[he+1]=V,x[he+2]=k,x[he+3]=G}let{cols:ue,rows:$e}=p,Y=ue*2;for(let f=0;f<We;f++){for(let i=0;i<$e;i++)for(let g=0;g<ue;g++){let a=(i*ue+g)*2,K=Z[a]-w*s[a]-h*l[a],j=Z[a+1]-w*s[a+1]-h*l[a+1];if(P>0){let N=-4*s[a],V=-4*s[a+1],k=-4*l[a],G=-4*l[a+1];g>0&&(N+=s[a-2],V+=s[a-1],k+=l[a-2],G+=l[a-1]),g<ue-1&&(N+=s[a+2],V+=s[a+3],k+=l[a+2],G+=l[a+3]),i>0&&(N+=s[a-Y],V+=s[a-Y+1],k+=l[a-Y],G+=l[a-Y+1]),i<$e-1&&(N+=s[a+Y],V+=s[a+Y+1],k+=l[a+Y],G+=l[a+Y+1]),K+=P*N+W*k,j+=P*V+W*G}ie[a]=l[a]+K*we,ie[a+1]=l[a+1]+j*we}for(let i=0;i<s.length;i++)l[i]=ie[i],s[i]+=l[i]*we}for(let f=0;f<p.count;f++){let i=f*2,g=f*4;ge[f]=Math.min(1,Math.hypot(l[i]+x[g+2],l[i+1]+x[g+3])/380*.85+Math.hypot(s[i]+x[g],s[i+1]+x[g+1])/(p.cell*2.2)*.35)}for(let f=X.length-1;f>=0;f--)D[f].front>r.shockRadius+_*3&&X.splice(f,1);let Ke=1-Math.exp(-o/.08);t.vx-=t.vx*Ke,t.vy-=t.vy*Ke;let gt=r.mouseInteraction&&t.inside?1:0;t.presence+=(gt-t.presence)*(1-Math.exp(-o/.2))},se=o=>{let n=M.current,r=Math.max(1,n.proximity),A=(F===null?1/0:F<0?0:(o-F)/1e3)*p.reach*1.25,L=p.cell*4;for(let y=0;y<p.count;y++){let d=y*2,B=y*4,le=I[d]+s[d]+x[B],fe=I[d+1]+s[d+1]+x[B+1],_=ge[y];if(t.presence>.001){let P=Math.hypot(le-t.x,fe-t.y);P<r&&(_=Math.max(_,Ae(1-P/r)*.4*t.presence))}let ee=1;if(F!==null){let P=Math.hypot(I[d]-p.centerX,I[d+1]-p.centerY),W=Math.min(1,Math.max(0,(A-P)/L));ee=W>=1?1:Math.max(0,bt(W)),_=Math.max(_,Math.sin(W*Math.PI)*.6)}let D=y*6;T[D]=le,T[D+1]=fe,T[D+2]=l[d]+x[B+2],T[D+3]=l[d+1]+x[B+3],T[D+4]=_,T[D+5]=ee}let w=et(n.baseColor),h=et(n.activeColor);e.viewport(0,0,E.width,E.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(q),e.uniform2f(R.uResolution,m.width,m.height),e.uniform1f(R.uSize,Math.max(.5,n.dotSize)),e.uniform1f(R.uSwell,Q?0:Math.max(0,n.swell)),e.uniform1f(R.uStretch,Q?0:Math.max(0,n.stretch)),e.uniform1f(R.uGlow,Math.max(0,n.glow)),e.uniform3f(R.uBase,w[0],w[1],w[2]),e.uniform3f(R.uActive,h[0],h[1],h[2]),e.uniform1f(R.uOpacity,Math.min(1,Math.max(0,n.opacity))),e.uniform1f(R.uFade,Math.min(1,Math.max(0,n.fade))),e.uniform1i(R.uShape,n.shape==="square"?1:0),e.bindVertexArray(pe),e.bindBuffer(e.ARRAY_BUFFER,ae),e.bufferSubData(e.ARRAY_BUFFER,0,T),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,p.count),e.bindVertexArray(null)},vt=o=>{if(X.length)return!1;if(F!==null){if(F<0||(o-F)/1e3<1.6)return!1;F=null}if(Math.abs(t.vx)+Math.abs(t.vy)>1)return!1;let n=M.current.mouseInteraction&&t.inside?1:0;if(Math.abs(n-t.presence)>.002)return!1;for(let r=0;r<s.length;r++)if(Math.abs(s[r])>.02||Math.abs(l[r])>.5)return!1;return!0},Ne=o=>{if(H=0,M.current.paused||!ce)return;F!==null&&F<0&&(F=o);let n=Math.min(.05,(o-ye)/1e3||0);ye=o,mt(n,o),se(o),vt(o)||(H=requestAnimationFrame(Ne))},O=()=>{H||M.current.paused||!ce||(ye=performance.now(),H=requestAnimationFrame(Ne))},Ve=o=>{let n=E.getBoundingClientRect();return m.left=n.left,m.top=n.top,[o.clientX-n.left,o.clientY-n.top]},ke=o=>{if(!M.current.mouseInteraction)return;let[n,r]=Ve(o),v=n>=0&&r>=0&&n<=m.width&&r<=m.height,A=o.timeStamp||performance.now();if(v&&t.inside&&t.time){let L=Math.max(4,A-t.time)/1e3,w=(n-t.x)/L,h=(r-t.y)/L;t.vx+=(w-t.vx)*.6,t.vy+=(h-t.vy)*.6}else t.vx=0,t.vy=0;t.x=n,t.y=r,t.time=A,(v!==t.inside||v)&&(t.inside=v,O())},xe=()=>{t.inside=!1,t.time=0,O()},Ge=o=>{o.relatedTarget||xe()},Ue=o=>{if(!M.current.clickShock||Q)return;let[n,r]=Ve(o);n<0||r<0||n>m.width||r>m.height||(X.push({x:n,y:r,start:performance.now()}),X.length>6&&X.shift(),O())};window.addEventListener("pointermove",ke,{passive:!0}),window.addEventListener("pointerdown",Ue,{passive:!0}),window.addEventListener("pointerout",Ge),window.addEventListener("blur",xe);let qe=new ResizeObserver(()=>{Ye(),O()});qe.observe(E);let Xe=new IntersectionObserver(([o])=>{ce=o.isIntersecting,ce&&O()});Xe.observe(E);let He=()=>{document.hidden?(cancelAnimationFrame(H),H=0):O()};return document.addEventListener("visibilitychange",He),Ye(),O(),re.current={rebuild:()=>{Ce(),se(performance.now()),O()},refresh:()=>{se(performance.now()),O()}},()=>{cancelAnimationFrame(H),qe.disconnect(),Xe.disconnect(),window.removeEventListener("pointermove",ke),window.removeEventListener("pointerdown",Ue),window.removeEventListener("pointerout",Ge),window.removeEventListener("blur",xe),document.removeEventListener("visibilitychange",He),e.deleteBuffer(ze),e.deleteBuffer(ae),e.deleteVertexArray(pe),e.deleteProgram(q),re.current=null}},[]),(0,U.useEffect)(()=>{re.current?.rebuild()},[u,c]),(0,U.useEffect)(()=>{re.current?.refresh()},[S,b,Se,Ee,Le,Be,Pe,Ie,Oe,Fe,Te]),(0,Me.jsx)("div",{className:`relative h-full w-full ${ht}`.trim(),style:dt,children:(0,Me.jsx)("canvas",{ref:_e,className:"pointer-events-none absolute inset-0 block h-full w-full"})})},nt=At;var Re=oe(me(),1),Mt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],ve=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Pt=Mt.map((u,c)=>({id:c+1,image:u,src:u,img:u,url:u,title:ve[c],text:ve[c],label:ve[c],alt:ve[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Rt({big:u}){return(0,Re.jsx)(Ze,{big:u,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Re.jsx)(nt,{})})}var It=Qe(Rt);export{It as default};
