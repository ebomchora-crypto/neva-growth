import{c as ee,i as Mt,j as ce,l as et,m as tt}from"./chunks/chunk-6IYH4WPJ.js";var B=ee(Mt(),1),Re=ee(ce(),1),St=`#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUv;
in vec2 aCenter;
in vec4 aRotation;
in vec2 aState;
uniform mat4 uProjection;
uniform float uSize;
out vec3 vNormal;
out vec2 vUv;
out float vFlash;

vec3 turn(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void main() {
  vec3 local = turn(aRotation, aPosition * uSize * aState.y);
  vNormal = turn(aRotation, aNormal);
  vUv = aUv;
  vFlash = aState.x;
  gl_Position = uProjection * vec4(vec3(aCenter, 0.0) + local, 1.0);
}`,Et=`#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
in float vFlash;
uniform vec3 uFace;
uniform vec3 uEdge;
uniform vec3 uRipple;
uniform vec3 uLight;
uniform float uShading;
uniform float uEdgeWidth;
uniform float uStyle;
uniform float uMarks;
uniform float uOpacity;
out vec4 outColor;

void main() {
  vec2 span = max(fwidth(vUv), vec2(0.00001));
  vec2 border = min(vUv, 1.0 - vUv) / span;
  bool vertical = border.x < border.y;
  float distance = min(border.x, border.y);
  float halfWidth = uEdgeWidth * 0.5;
  float cover = 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, distance);
  float along = vertical ? vUv.y : vUv.x;
  float phase = along * uMarks;
  float step = max(vertical ? span.y : span.x, 0.00001) * uMarks;
  float offset = abs(fract(phase + 0.5) - 0.5);
  if (uStyle > 0.5 && uStyle < 1.5) {
    cover *= 1.0 - smoothstep(0.25 - step, 0.25 + step, offset);
  } else if (uStyle > 1.5 && uStyle < 2.5) {
    float radius = max(uEdgeWidth * 0.9, 1.0);
    float dot = length(vec2(offset / step, distance));
    cover = 1.0 - smoothstep(radius - 0.75, radius + 0.75, dot);
  } else if (uStyle > 2.5) {
    cover = 0.0;
  }
  vec3 normal = normalize(vNormal);
  cover *= smoothstep(0.06, 0.28, abs(normal.z));
  float side = clamp(1.0 - normal.z, 0.0, 1.0);
  float toward = clamp(0.6 + 0.6 * dot(normalize(normal.xy + vec2(0.00001)), normalize(uLight.xy)), 0.0, 1.0);
  vec3 face = mix(uFace, uEdge, side * mix(0.12, 0.42, toward) * uShading);
  face = mix(face, uRipple, vFlash * 0.22);
  vec3 edge = mix(uEdge, uRipple, vFlash);
  vec3 color = mix(face, edge, cover);
  float alpha = mix(uOpacity, 1.0, cover);
  outColor = vec4(color * alpha, alpha);
}`,Rt=[[0,0,1,1,0,0,0,1,0],[0,0,-1,-1,0,0,0,1,0],[1,0,0,0,0,-1,0,1,0],[-1,0,0,0,0,1,0,1,0],[0,1,0,1,0,0,0,0,-1],[0,-1,0,1,0,0,0,0,1]],Ft=()=>{let n=[],s=[];return Rt.forEach(([i,o,d,h,m,v,A,g,b],w)=>{[[0,0],[1,0],[1,1],[0,1]].forEach(([O,z])=>{n.push(i*.5+(O-.5)*h+(z-.5)*A,o*.5+(O-.5)*m+(z-.5)*g,d*.5+(O-.5)*v+(z-.5)*b,i,o,d,O,z)});let S=w*4;s.push(S,S+1,S+2,S,S+2,S+3)}),{vertices:new Float32Array(n),indices:new Uint16Array(s)}},Ct={solid:0,dashed:1,dotted:2,none:3},nt=1.1,K=(n,s,i)=>Math.min(i,Math.max(s,n)),rt=(n,s,i)=>{let o=n.createShader(s);return o?(n.shaderSource(o,i),n.compileShader(o),n.getShaderParameter(o,n.COMPILE_STATUS)?o:(n.deleteShader(o),null)):null},Tt=n=>{let s=rt(n,n.VERTEX_SHADER,St),i=rt(n,n.FRAGMENT_SHADER,Et),o=n.createProgram();if(!s||!i||!o)return null;if(n.attachShader(o,s),n.attachShader(o,i),["aPosition","aNormal","aUv","aCenter","aRotation","aState"].forEach((m,v)=>n.bindAttribLocation(o,v,m)),n.linkProgram(o),n.deleteShader(s),n.deleteShader(i),!n.getProgramParameter(o,n.LINK_STATUS))return n.deleteProgram(o),null;let d={},h=n.getProgramParameter(o,n.ACTIVE_UNIFORMS);for(let m=0;m<h;m++){let v=n.getActiveUniform(o,m);v&&(d[v.name]=n.getUniformLocation(o,v.name))}return{program:o,uniforms:d}},Nt=(n,s,i,o)=>{let d=Math.hypot(n,s);if(d<1e-6){i[o]=0,i[o+1]=0,i[o+2]=0,i[o+3]=1;return}let h=Math.sin(d/2)/d;i[o]=n*h,i[o+1]=s*h,i[o+2]=0,i[o+3]=Math.cos(d/2)},Pt=(n,s,i,o)=>{let[d,h,m,v]=n,[A,g,b,w]=s;i[o]=v*A+d*w+h*b-m*g,i[o+1]=v*g-d*b+h*w+m*A,i[o+2]=v*b+d*g-h*A+m*w,i[o+3]=v*w-d*A-h*g-m*b},Bt=(n,s,i,o)=>{let d=n/2/i,h=s/2/i,m=Math.max(d,h)*4+4;if(o<=.001)return new Float32Array([1/d,0,0,0,0,1/h,0,0,0,0,-1/m,0,0,0,0,1]);let v=(8+o*52)*Math.PI/180,A=h/Math.tan(v/2),g=Math.max(.1,A-m),b=A+m,w=1/Math.tan(v/2),S=d/h;return new Float32Array([w/S,0,0,0,0,w,0,0,0,0,(b+g)/(g-b),-1,0,0,2*b*g/(g-b)-(b+g)/(g-b)*A,A])},Lt=({gridSize:n=10,gap:s=.18,faceColor:i="#120F17",edgeColor:o="#ffffff",edgeWidth:d=1,edgeStyle:h="solid",faceOpacity:m=1,shading:v=.6,maxAngle:A=45,radius:g=3,speed:b=1,bounce:w=.4,brush:S=1,perspective:O=0,autoAnimate:z=!0,rippleOnClick:ot=!0,rippleColor:it="#ffffff",rippleSpeed:ct=1,intro:st=!0,paused:lt=!1,dpr:ft,className:dt="",...ut})=>{let Ce=(0,B.useRef)(null),Te=(0,B.useRef)(null),le=(0,B.useRef)(null),Ne={gridSize:Math.round(K(n,1,40)),gap:K(s,0,.9),faceColor:String(i),edgeColor:String(o),edgeWidth:Math.max(0,d),edgeStyle:h,faceOpacity:K(m,0,1),shading:Math.max(0,v),maxAngle:A,radius:Math.max(.5,g),speed:Math.max(.05,b),bounce:K(w,0,1),brush:Math.max(0,S),perspective:K(O,0,1),autoAnimate:z,rippleOnClick:ot,rippleColor:String(it),rippleSpeed:Math.max(.05,ct),intro:st,paused:lt,dpr:ft},E=(0,B.useRef)(Ne);return E.current=Ne,(0,B.useEffect)(()=>{let F=Ce.current,D=Te.current,e=D?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!0,stencil:!1});if(!F||!D||!e)return;let te=Tt(e);if(!te)return;let Pe=Ft(),fe=e.createVertexArray();e.bindVertexArray(fe);let Be=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Be),e.bufferData(e.ARRAY_BUFFER,Pe.vertices,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,32,0),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,3,e.FLOAT,!1,32,12),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,2,e.FLOAT,!1,32,24);let Le=e.createBuffer();e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,Le),e.bufferData(e.ELEMENT_ARRAY_BUFFER,Pe.indices,e.STATIC_DRAW);let de=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,de),[[3,2,0],[4,4,8],[5,2,24]].forEach(([t,r,l])=>{e.enableVertexAttribArray(t),e.vertexAttribPointer(t,r,e.FLOAT,!1,32,l),e.vertexAttribDivisor(t,1)});let k=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),ue=new Map,he=t=>{if(ue.has(t))return ue.get(t);let r=[1,1,1];if(k){k.clearRect(0,0,1,1),k.fillStyle="#ffffff",k.fillStyle=t,k.fillRect(0,0,1,1);let[l,f,y]=k.getImageData(0,0,1,1).data;r=[l/255,f/255,y/255]}return ue.set(t,r),r},J=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,x={width:1,height:1,ratio:1,scale:1},p={x:0,y:0,inside:!1,moved:0},c={x:0,y:0,vx:0,vy:0,weight:0,primed:!1},u={size:0,count:0},W=new Float32Array(0),Y=new Float32Array(0),N=new Float32Array(0),P=new Float32Array(0),V=new Float32Array(0),C=[],me=new Float32Array(0),L=new Float32Array(0),R=0,U=E.current.intro&&!J?0:99,_=0,G=0,ne=!0,Ue=t=>{if(u.size===t)return;u.size=t,u.count=t*t,W=new Float32Array(u.count),Y=new Float32Array(u.count),N=new Float32Array(u.count),P=new Float32Array(u.count),V=new Float32Array(u.count),me=new Float32Array(u.count),L=new Float32Array(u.count*8);let r=(t-1)/2;for(let l=0;l<u.count;l++){let f=l%t,y=Math.floor(l/t);me[l]=Math.hypot(f-r,y-r)/Math.max(1,t/2)}},ht=t=>{let r=u.size,l=(r-1)/2;return[t%r-l,l-Math.floor(t/r)]},_e=(t,r)=>[(t-x.width/2)/x.scale,(x.height/2-r)/x.scale],mt=(t,r)=>{if(!E.current.rippleOnClick||J)return;let[f,y]=_e(t,r);C.push({x:f,y,born:R}),C.length>6&&C.shift(),I()},ve=()=>{let t=E.current,r=D.width,l=D.height;if(e.viewport(0,0,r,l),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),!u.count)return;e.useProgram(te.program),e.bindVertexArray(fe),e.bindBuffer(e.ARRAY_BUFFER,de),e.bufferData(e.ARRAY_BUFFER,L,e.DYNAMIC_DRAW);let f=te.uniforms;e.uniformMatrix4fv(f.uProjection,!1,Bt(x.width,x.height,x.scale,t.perspective)),e.uniform1f(f.uSize,1-t.gap),e.uniform3fv(f.uFace,he(t.faceColor)),e.uniform3fv(f.uEdge,he(t.edgeColor)),e.uniform3fv(f.uRipple,he(t.rippleColor));let y=[-.42,.55,.72],M=Math.hypot(...y);e.uniform3f(f.uLight,y[0]/M,y[1]/M,y[2]/M),e.uniform1f(f.uShading,t.shading),e.uniform1f(f.uEdgeWidth,t.edgeWidth*x.ratio),e.uniform1f(f.uStyle,Ct[t.edgeStyle]??0);let re=(1-t.gap)*x.scale,be=t.edgeStyle==="dotted"?Math.max(4,t.edgeWidth*4):Math.max(6,t.edgeWidth*6);e.uniform1f(f.uMarks,Math.max(1,Math.round(re/be))),e.uniform1f(f.uOpacity,t.faceOpacity),e.enable(e.DEPTH_TEST),e.enable(e.CULL_FACE),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),t.faceOpacity>=.999?(e.depthMask(!0),e.cullFace(e.BACK),e.drawElementsInstanced(e.TRIANGLES,36,e.UNSIGNED_SHORT,0,u.count)):(e.depthMask(!1),e.cullFace(e.FRONT),e.drawElementsInstanced(e.TRIANGLES,36,e.UNSIGNED_SHORT,0,u.count),e.cullFace(e.BACK),e.drawElementsInstanced(e.TRIANGLES,36,e.UNSIGNED_SHORT,0,u.count),e.depthMask(!0))},pe=t=>{let r=E.current;Ue(r.gridSize),R+=t,U<99&&(U+=t);let l=r.autoAnimate&&!J&&(!p.inside||R-p.moved>3),f=c.x,y=c.y,M=!1;if(p.inside&&R-p.moved<=3)[f,y]=_e(p.x,p.y),M=!0;else if(l){let a=u.size*.42;f=Math.sin(R*.37)*a*Math.cos(R*.11),y=Math.sin(R*.53+1.2)*a,M=!0}!c.primed&&M&&(c.x=f,c.y=y,c.primed=!0);let re=1-Math.exp(-t*18),be=c.x,vt=c.y;c.x+=(f-c.x)*re,c.y+=(y-c.y)*re;let He=1-Math.exp(-t*10);c.vx+=((c.x-be)/Math.max(t,.001)-c.vx)*He,c.vy+=((c.y-vt)/Math.max(t,.001)-c.vy)*He,c.weight+=((M?1:0)-c.weight)*(1-Math.exp(-t*(M?6:2.5)));let xe=160*r.speed*r.speed,qe=2*(1-.82*r.bounce)*Math.sqrt(xe),pt=r.maxAngle*Math.PI/180,gt=.8,ye=8*r.rippleSpeed,bt=Math.exp(-t*3.2),xt=u.size*1.5+2;for(let a=C.length-1;a>=0;a--)(R-C[a].born)*ye>xt&&C.splice(a,1);let H=Math.hypot(c.vx,c.vy),yt=H>1e-4?-c.vy/H:0,At=H>1e-4?c.vx/H:0,Ae=J?0:Math.min(H,40)*r.brush*1.6,ae=!1;for(let a=0;a<u.count;a++){let[we,Me]=ht(a),Xe=we-c.x,je=Me-c.y,q=Math.hypot(Xe,je),Q=q/r.radius,Z=Q<1?(1-Q*Q)*(1-Q*Q)*c.weight:0,oe=0,ie=0;if(Z>0&&q>1e-4){let T=pt*Z*(q/Math.hypot(q,gt));oe=je/q*T,ie=-Xe/q*T}Z>0&&Ae>0&&(N[a]+=yt*Ae*Z*t*4,P[a]+=At*Ae*Z*t*4),V[a]*=bt;for(let T=0;T<C.length;T++){let X=C[T],Qe=we-X.x,Ze=Me-X.y,j=Math.hypot(Qe,Ze),$e=(R-X.born)*ye;if(j>$e||j<=$e-ye*t||j<1e-4)continue;let Ee=Math.exp(-j/(u.size*.8));N[a]-=Ze/j*13*Ee,P[a]+=Qe/j*13*Ee,V[a]=Math.max(V[a],Ee)}V[a]>.01&&(ae=!0),J?(W[a]=oe,Y[a]=ie,N[a]=0,P[a]=0):(N[a]+=(xe*(oe-W[a])-qe*N[a])*t,P[a]+=(xe*(ie-Y[a])-qe*P[a])*t,W[a]+=N[a]*t,Y[a]+=P[a]*t),(Math.abs(oe-W[a])+Math.abs(ie-Y[a])>5e-4||Math.abs(N[a])+Math.abs(P[a])>5e-4)&&(ae=!0);let Ke=1,Se=0;if(U<99){let T=K((U-me[a]*.55)/nt,0,1),X=1-Math.pow(1-T,3);Ke=X,Se=(1-X)*(Math.PI/2),T<1&&(ae=!0)}let Je=[0,0,0,1];Nt(W[a],Y[a],Je,0);let wt=[Math.sin(Se/2),0,0,Math.cos(Se/2)],$=a*8;L[$]=we,L[$+1]=Me,Pt(Je,wt,L,$+2),L[$+6]=V[a],L[$+7]=Ke}return U>=nt+.6&&U<99&&(U=99),ae||l||C.length>0||M&&H>.01||Math.abs((M?1:0)-c.weight)>.002},Ie=t=>{if(_=0,!ne||document.hidden)return;let r=E.current,l=G?Math.min(.05,(t-G)/1e3):1/60;G=t;let f=r.paused?!1:pe(l);ve(),f?_=requestAnimationFrame(Ie):G=0},I=()=>{!_&&ne&&!document.hidden&&(_=requestAnimationFrame(Ie))},ge=()=>{let t=E.current,r=Math.max(1,F.clientWidth),l=Math.max(1,F.clientHeight);x.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),x.width=r,x.height=l,x.scale=Math.min(r,l)/(t.gridSize+.9),D.width=Math.max(1,Math.round(r*x.ratio)),D.height=Math.max(1,Math.round(l*x.ratio)),Ue(t.gridSize),_||(pe(0),ve()),I()},Oe=t=>{let r=F.getBoundingClientRect();p.x=t.clientX-r.left,p.y=t.clientY-r.top,p.inside=p.x>=0&&p.y>=0&&p.x<=r.width&&p.y<=r.height,p.inside&&(p.moved=R),I()},ze=()=>{p.inside=!1,I()},De=t=>{let r=F.getBoundingClientRect();mt(t.clientX-r.left,t.clientY-r.top)},ke=()=>{G=0,I()},We=new ResizeObserver(ge);We.observe(F);let Ye=new IntersectionObserver(t=>{ne=t.some(r=>r.isIntersecting),ne&&(G=0,I())});Ye.observe(F),window.addEventListener("pointermove",Oe,{passive:!0}),document.documentElement.addEventListener("pointerleave",ze),F.addEventListener("pointerdown",De),document.addEventListener("visibilitychange",ke),ge();let Ve=E.current.gridSize,Ge=E.current.dpr;return le.current=()=>{let t=E.current;if(t.gridSize!==Ve||t.dpr!==Ge){Ve=t.gridSize,Ge=t.dpr,ge();return}_||(pe(0),ve()),I()},()=>{cancelAnimationFrame(_),le.current=null,We.disconnect(),Ye.disconnect(),window.removeEventListener("pointermove",Oe),document.documentElement.removeEventListener("pointerleave",ze),F.removeEventListener("pointerdown",De),document.removeEventListener("visibilitychange",ke),e.deleteBuffer(Be),e.deleteBuffer(Le),e.deleteBuffer(de),e.deleteVertexArray(fe),e.deleteProgram(te.program)}},[]),(0,B.useEffect)(()=>{le.current?.()}),(0,Re.jsx)("div",{ref:Ce,className:["relative h-full w-full touch-pan-y overflow-hidden",dt].filter(Boolean).join(" "),...ut,children:(0,Re.jsx)("canvas",{ref:Te,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},at=Lt;var Fe=ee(ce(),1),Ut=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],se=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Wt=Ut.map((n,s)=>({id:s+1,image:n,src:n,img:n,url:n,title:se[s],text:se[s],label:se[s],alt:se[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function _t({big:n}){return(0,Fe.jsx)(tt,{big:n,dark:!0,center:!0,zoom:1,drive:!1,children:(0,Fe.jsx)(at,{})})}var Yt=et(_t);export{Yt as default};
