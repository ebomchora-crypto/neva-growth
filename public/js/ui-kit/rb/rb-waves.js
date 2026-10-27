import{c as ee,i as wt,j as le,l as He,m as We}from"./chunks/chunk-6IYH4WPJ.js";var F=ee(wt(),1),Se=ee(le(),1),yt={solid:0,dashed:1},P=12,Et=4,Mt=2.2,Ke=640,Te=64,bt=Te*Math.sqrt(Math.PI/2)/Ke,je=16e5,Tt=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uView;
uniform float uRatio;
uniform vec2 uAxis;
uniform float uSpacing;
uniform float uStep;
uniform vec2 uStart;
uniform float uAmplitude;
uniform vec2 uFrequency;
uniform vec2 uDrift;
uniform float uTwist;
uniform uint uSeed;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
uniform float uCell;
uniform float uLimit;
uniform float uReach;
uniform float uReveal;
uniform float uBand;
out float vAcross;
out float vAlong;
out float vEnergy;
out float vShow;
out float vPhase;

const vec2 GRADIENTS[12] = vec2[12](
  vec2(1.0, 1.0), vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(-1.0, -1.0),
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(-1.0, 0.0),
  vec2(0.0, 1.0), vec2(0.0, -1.0), vec2(0.0, 1.0), vec2(0.0, -1.0)
);

vec2 gradient(vec2 cell) {
  uvec2 q = uvec2(ivec2(cell) + 65536) + uvec2(uSeed * 7919u, uSeed * 104729u);
  q = 1103515245u * ((q >> 1u) ^ q.yx);
  uint n = 1103515245u * (q.x ^ (q.y >> 3u));
  return GRADIENTS[(n >> 16u) % 12u];
}

float ease(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float n00 = dot(gradient(i), f);
  float n10 = dot(gradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float n01 = dot(gradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float n11 = dot(gradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  vec2 u = vec2(ease(f.x), ease(f.y));
  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}

vec2 node(ivec2 cell) {
  return texelFetch(uField, clamp(cell, ivec2(0), uFieldSize - 1), 0).xy;
}

void weights(float f, out vec4 w, out vec4 d) {
  float g = 1.0 - f;
  float f2 = f * f;
  float f3 = f2 * f;
  w = vec4(g * g * g, 3.0 * f3 - 6.0 * f2 + 4.0, -3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0, f3) / 6.0;
  d = vec4(-g * g, 3.0 * f2 - 4.0 * f, -3.0 * f2 + 2.0 * f + 1.0, f2) * 0.5;
}

vec2 field(vec2 point, out mat2 slope) {
  vec2 t = point / uCell;
  vec2 base = floor(t);
  vec2 f = t - base;
  vec4 wx;
  vec4 dx;
  vec4 wy;
  vec4 dy;
  weights(f.x, wx, dx);
  weights(f.y, wy, dy);
  ivec2 origin = ivec2(base) - 1;
  vec2 value = vec2(0.0);
  vec2 alongX = vec2(0.0);
  vec2 alongY = vec2(0.0);
  for (int j = 0; j < 4; j++) {
    vec2 row = vec2(0.0);
    vec2 rowSlope = vec2(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 tap = node(origin + ivec2(i, j));
      row += tap * wx[i];
      rowSlope += tap * dx[i];
    }
    value += row * wy[j];
    alongX += rowSlope * wy[j];
    alongY += row * dy[j];
  }
  float size = length(value);
  float scale = size > 0.0001 ? uLimit * tanh(size / uLimit) / size : 1.0;
  slope = mat2(alongX, alongY) * (scale / uCell);
  return value * scale;
}

vec2 wave(vec2 rest) {
  float turn = perlin(rest * uFrequency + uDrift) * 12.0 * uTwist;
  vec2 local = rest + vec2(cos(turn), sin(turn) * 0.5) * uAmplitude;
  return uView * 0.5 + vec2(local.x * uAxis.x - local.y * uAxis.y, local.x * uAxis.y + local.y * uAxis.x);
}

void main() {
  int index = gl_VertexID >> 1;
  float side = float(gl_VertexID & 1) * 2.0 - 1.0;
  float u = uStart.x + float(gl_InstanceID) * uSpacing;
  float v = uStart.y + float(index) * uStep;
  vec2 flowing = wave(vec2(u, v));
  vec2 bend = wave(vec2(u, v + uStep)) - wave(vec2(u, v - uStep));
  mat2 slope;
  vec2 shift = field(flowing, slope);
  vec2 point = flowing + shift;
  float energy = length(shift);
  vec2 tangent = bend + slope * bend;
  float span = max(length(tangent), 0.0001);
  vec2 normal = vec2(-tangent.y, tangent.x) / span;
  vec2 corner = point + normal * side * uReach / uRatio;
  vAcross = side * uReach;
  vAlong = v;
  vEnergy = energy;
  vShow = clamp((uReveal - abs(u)) / uBand, 0.0, 1.0);
  uint line = uint(gl_InstanceID) * 747796405u + uSeed * 2891336453u + 1u;
  line = ((line >> ((line >> 28u) + 4u)) ^ line) * 277803737u;
  vPhase = float((line >> 22u) ^ line) / 4294967295.0;
  vec2 clip = corner / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`,St=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform float uHalf;
uniform float uThin;
uniform int uStyle;
uniform float uPeriod;
uniform float uFlow;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uBase;
uniform float uHeat;
uniform float uFade;
uniform float uOpacity;
in float vAcross;
in float vAlong;
in float vEnergy;
in float vShow;
in float vPhase;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  float coverage = clamp(uHalf + 0.5 - abs(vAcross), 0.0, 1.0) * uThin;
  if (uStyle == 1) {
    float phase = (vAlong + uFlow) / uPeriod + vPhase;
    float blur = max(fwidth(phase), 0.0001);
    coverage *= clamp((0.25 - abs(fract(phase) - 0.5)) / blur + 0.5, 0.0, 1.0);
  }
  float heat = smoothstep(0.0, uHeat, vEnergy);
  vec2 uv = gl_FragCoord.xy / (uView * uRatio);
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  float alpha = coverage * mix(uBase, 1.0, heat) * mask * vShow * uOpacity;
  outColor = vec4(mix(uColor, uAccent, heat) * alpha, alpha);
}`,b=(i,u,T)=>Math.min(T,Math.max(u,i)),be=i=>{let u=b(i,0,1);return u*u*u*(u*(u*6-15)+10)},Ye=(i,u,T)=>{let f=i.createShader(u);return f?(i.shaderSource(f,T),i.compileShader(f),i.getShaderParameter(f,i.COMPILE_STATUS)?f:(i.deleteShader(f),null)):null},Rt=i=>{let u=Ye(i,i.VERTEX_SHADER,Tt),T=Ye(i,i.FRAGMENT_SHADER,St),f=i.createProgram();if(!u||!T||!f)return null;if(i.attachShader(f,u),i.attachShader(f,T),i.linkProgram(f),i.deleteShader(u),i.deleteShader(T),!i.getProgramParameter(f,i.LINK_STATUS))return i.deleteProgram(f),null;let te={},fe=i.getProgramParameter(f,i.ACTIVE_UNIFORMS);for(let H=0;H<fe;H++){let W=i.getActiveUniform(f,H);W&&(te[W.name]=i.getUniformLocation(f,W.name))}return{program:f,uniforms:te}},At=({lineColor:i="#ffffff",accentColor:u,backgroundColor:T="transparent",lineStyle:f="solid",spacing:te=10,lineWidth:fe=1,rotation:H=0,amplitude:W=32,scale:Qe=1,twist:Ze=1,speed:$e=1,variation:et=0,mouseInteraction:tt=!0,mouseRadius:ot=175,mouseStrength:nt=1,bounce:it=.5,returnDuration:at=1.4,clickRipple:rt=!0,intro:st=!0,fade:ct=0,opacity:lt=1,lightMode:ut=!1,paused:ft=!1,dpr:mt,className:dt="",style:ht})=>{let Ae=(0,F.useRef)(null),Pe=(0,F.useRef)(null),me=(0,F.useRef)(null),_e={lineColor:String(i),accentColor:u?String(u):"",lineStyle:yt[f]??0,spacing:Math.max(2,te),lineWidth:Math.max(.25,fe),rotation:H,amplitude:Math.max(0,W),scale:Math.max(.05,Qe),twist:Math.max(0,Ze),speed:$e,variation:Math.max(0,Math.round(et)),mouseInteraction:tt,mouseRadius:Math.max(20,ot),mouseStrength:Math.max(0,nt),bounce:b(it,0,1),returnDuration:Math.max(.2,at),clickRipple:rt,intro:st,fade:b(ct,0,1),opacity:b(lt,0,1),lightMode:ut,paused:ft,dpr:mt},y=(0,F.useRef)(_e);return y.current=_e,(0,F.useEffect)(()=>{let B=Ae.current,C=Pe.current,e=C?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!B||!C||!e)return;let oe=Rt(e);if(!oe)return;let r=oe.uniforms,Ie=e.createVertexArray(),j=e.createTexture();e.bindTexture(e.TEXTURE_2D,j),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.pixelStorei(e.UNPACK_ALIGNMENT,1);let G=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),_=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,de=new Map,De=t=>{if(de.has(t))return de.get(t);let a=[1,1,1];if(G){G.clearRect(0,0,1,1),G.fillStyle="#ffffff",G.fillStyle=t,G.fillRect(0,0,1,1);let[s,l,c]=G.getImageData(0,0,1,1).data;a=[s/255,l/255,c/255]}return de.set(t,a),a},vt=t=>{let a=t.map(c=>Math.pow(c,2.2)),s=.2126*a[0]+.7152*a[1]+.0722*a[2],l=Math.min(1,.045/Math.max(s,1e-4));return a.map(c=>Math.pow(c*l,1/2.2))},v={width:1,height:1,ratio:1},o={cols:0,rows:0,shift:new Float32Array(0),speed:new Float32Array(0),top:0,bottom:-1,left:0,right:-1},n={x:0,y:0,sx:0,sy:0,vx:0,vy:0,inside:!1},U=[],E={flow:0,intro:y.current.intro&&!_?0:1},k=0,N=0,ne=!0,pt=t=>Math.max(12,t.mouseRadius*.5),gt=()=>{o.cols=Math.ceil(v.width/P)+2,o.rows=Math.ceil(v.height/P)+2,o.shift=new Float32Array(o.cols*o.rows*2),o.speed=new Float32Array(o.cols*o.rows*2),o.top=0,o.bottom=-1,o.left=0,o.right=-1,e.bindTexture(e.TEXTURE_2D,j),e.texImage2D(e.TEXTURE_2D,0,e.RG32F,o.cols,o.rows,0,e.RG,e.FLOAT,o.shift)},Le=(t,a,s,l)=>{let c=b(Math.floor(t/P),0,o.cols-1),d=b(Math.ceil(s/P),0,o.cols-1),S=b(Math.floor(a/P),0,o.rows-1),g=b(Math.ceil(l/P),0,o.rows-1),h=o.bottom<o.top;o.top=h?S:Math.min(o.top,S),o.bottom=h?g:Math.max(o.bottom,g),o.left=h?c:Math.min(o.left,c),o.right=h?d:Math.max(o.right,d)},xt=t=>{let a=y.current,s=1-Math.exp(-t/.045),l=n.sx+(n.x-n.sx)*s,c=n.sy+(n.y-n.sy)*s,d=1-Math.exp(-t/.06);n.vx+=((l-n.sx)/t-n.vx)*d,n.vy+=((c-n.sy)/t-n.vy)*d,n.sx=l,n.sy=c;let S=1-.85*a.bounce,g=4/(S*a.returnDuration),h=a.mouseRadius,R=Math.hypot(n.vx,n.vy),I=a.mouseInteraction&&n.inside&&!_?26e3*Math.tanh(R/1400)*a.mouseStrength:0;I>1&&Le(n.sx-h,n.sy-h,n.sx+h,n.sy+h);let D=[];for(let m=U.length-1;m>=0;m--){let x=U[m];x.age+=t;let L=x.age*Ke,z=1-L/x.range;if(z<=0){U.splice(m,1);continue}let p=L+Te*3;Le(x.x-p,x.y-p,x.x+p,x.y+p),D.push({x:x.x,y:x.y,front:L,power:150*g*z*Math.sqrt(z)/bt})}if(o.bottom<o.top)return!1;let Y=g*g,K=2*S*g,re=Math.min(16,Math.max(1,Math.ceil(t/Math.min(1/120,.6/g)))),O=t/re,ve=R>.001?n.vx/R:0,pe=R>.001?n.vy/R:0,{cols:w,shift:A,speed:V,left:q,right:ge}=o,xe=0;for(let m=o.top;m<=o.bottom;m++){let x=m*P;for(let L=q;L<=ge;L++){let z=L*P,p=(m*w+L)*2,ye=0,Ee=0;if(I>1){let M=Math.hypot(z-n.sx,x-n.sy);if(M<h){let Z=be(1-M/h)*I;ye+=ve*Z,Ee+=pe*Z}}for(let M of D){let Z=z-M.x,qe=x-M.y,$=Math.hypot(Z,qe),Me=($-M.front)/Te;if($>.001&&Math.abs(Me)<3){let ze=M.power*Math.exp(-Me*Me*2)*be($/56);ye+=Z/$*ze,Ee+=qe/$*ze}}let se=A[p],ce=A[p+1],J=V[p],Q=V[p+1];for(let M=0;M<re;M++)J+=(ye-Y*se-K*J)*O,Q+=(Ee-Y*ce-K*Q)*O,se+=J*O,ce+=Q*O;A[p]=se,A[p+1]=ce,V[p]=J,V[p+1]=Q,xe=Math.max(xe,Math.abs(se)+Math.abs(ce)+(Math.abs(J)+Math.abs(Q))*.05)}}let we=o.top,ke=o.bottom-o.top+1;if(xe<.02&&I<=1&&!D.length){for(let m=o.top;m<=o.bottom;m++)A.fill(0,(m*w+q)*2,(m*w+ge+1)*2),V.fill(0,(m*w+q)*2,(m*w+ge+1)*2);o.top=0,o.bottom=-1}return e.bindTexture(e.TEXTURE_2D,j),e.texSubImage2D(e.TEXTURE_2D,0,0,we,w,ke,e.RG,e.FLOAT,A.subarray(we*w*2,(we+ke)*w*2)),o.bottom>=o.top},ie=()=>{let t=y.current,a=t.rotation*Math.PI/180,s=Math.cos(a),l=Math.sin(a),c=pt(t),d=t.amplitude*1.1+c+t.spacing*2+8,S=(v.width*Math.abs(s)+v.height*Math.abs(l))/2+d,g=(v.width*Math.abs(l)+v.height*Math.abs(s))/2+d,h=Math.ceil(S/t.spacing),R=h*2+1,I=Et,D=Math.ceil(g*2/I)+1;R*D*2>je&&(D=Math.max(16,Math.floor(je/(R*2))),I=g*2/(D-1));let Y=t.lineWidth*v.ratio,K=Math.max(.5,Y/2),re=K+1,O=E.intro,ve=t.intro&&!_?(1-Math.pow(1-b(O/.7,0,1),3))*S*1.3:1e6,pe=t.intro&&!_?be((O-.1)/.9):1,w=De(t.lineColor),A=t.lightMode?vt(w):w,V=t.accentColor?De(t.accentColor):A,q=E.flow+t.variation*37.1;e.viewport(0,0,C.width,C.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(oe.program),e.bindVertexArray(Ie),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,j),e.uniform1i(r.uField,0),e.uniform2f(r.uView,v.width,v.height),e.uniform1f(r.uRatio,v.ratio),e.uniform2f(r.uAxis,s,l),e.uniform1f(r.uSpacing,t.spacing),e.uniform1f(r.uStep,I),e.uniform2f(r.uStart,-h*t.spacing,-g),e.uniform1f(r.uAmplitude,t.amplitude*pe),e.uniform2f(r.uFrequency,.002/t.scale,.0015/t.scale),e.uniform2f(r.uDrift,q*.025,q*.0075),e.uniform1f(r.uTwist,t.twist),e.uniform1ui(r.uSeed,t.variation),e.uniform2i(r.uFieldSize,o.cols,o.rows),e.uniform1f(r.uCell,P),e.uniform1f(r.uLimit,c),e.uniform1f(r.uReach,re),e.uniform1f(r.uReveal,ve),e.uniform1f(r.uBand,Math.max(1,S*.3)),e.uniform1f(r.uHalf,K),e.uniform1f(r.uThin,Math.min(1,Y)),e.uniform1i(r.uStyle,t.lineStyle),e.uniform1f(r.uPeriod,t.spacing*2.6),e.uniform1f(r.uFlow,E.flow*16%(t.spacing*2.6)),e.uniform3fv(r.uColor,A),e.uniform3fv(r.uAccent,V),e.uniform1f(r.uBase,.62),e.uniform1f(r.uHeat,c*.55),e.uniform1f(r.uFade,t.fade),e.uniform1f(r.uOpacity,t.opacity),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,D*2,R)},Fe=t=>{if(k=0,!ne||document.hidden)return;let a=y.current,s=N?b((t-N)/1e3,5e-4,.05):1/60;if(N=t,a.paused){E.intro=1,ie(),N=0;return}_||(E.flow+=s*a.speed),!a.intro||_?E.intro=1:E.intro<1&&(E.intro=Math.min(1,E.intro+s/Mt));let l=xt(s);ie();let c=n.inside&&a.mouseInteraction&&Math.hypot(n.vx,n.vy)>1;!_||l||c||U.length||E.intro<1?k=requestAnimationFrame(Fe):N=0},X=()=>{!k&&ne&&!document.hidden&&(k=requestAnimationFrame(Fe))},he=()=>{let t=y.current,a=Math.max(1,B.clientWidth),s=Math.max(1,B.clientHeight),l=Math.min(t.dpr||window.devicePixelRatio||1,2);v.width=a,v.height=s,C.width=Math.max(1,Math.round(a*l)),C.height=Math.max(1,Math.round(s*l)),v.ratio=C.width/a,gt(),ie(),X()},Ce=(t,a)=>{let s=B.getBoundingClientRect(),l=t.clientX-s.left,c=t.clientY-s.top,d=l>=0&&c>=0&&l<=s.width&&c<=s.height;return(a||d&&!n.inside)&&(n.sx=l,n.sy=c,n.vx=0,n.vy=0),n.inside=d,n.x=l,n.y=c,{x:l,y:c,rect:s,inside:d}},Ue=t=>{Ce(t,!1),y.current.paused||X()},Ne=t=>{let a=y.current,{x:s,y:l,rect:c,inside:d}=Ce(t,t.pointerType!=="mouse");d&&a.clickRipple&&!a.paused&&!_&&(U.push({x:s,y:l,age:0,range:Math.max(360,Math.hypot(c.width,c.height)*.55)}),U.length>6&&U.shift()),X()},ae=t=>{t.pointerType!=="mouse"&&(n.inside=!1)},Xe=()=>{n.inside=!1,X()},Oe=()=>{N=0,X()},Ve=new ResizeObserver(he);Ve.observe(B);let Be=new IntersectionObserver(t=>{ne=t.some(a=>a.isIntersecting),ne&&(N=0,X())});Be.observe(B),window.addEventListener("pointermove",Ue,{passive:!0}),window.addEventListener("pointerdown",Ne,{passive:!0}),window.addEventListener("pointerup",ae,{passive:!0}),window.addEventListener("pointercancel",ae,{passive:!0}),document.documentElement.addEventListener("pointerleave",Xe),document.addEventListener("visibilitychange",Oe),he();let Ge=y.current.dpr;return me.current=()=>{let t=y.current;if(t.dpr!==Ge){Ge=t.dpr,he();return}k||ie(),X()},()=>{cancelAnimationFrame(k),me.current=null,Ve.disconnect(),Be.disconnect(),window.removeEventListener("pointermove",Ue),window.removeEventListener("pointerdown",Ne),window.removeEventListener("pointerup",ae),window.removeEventListener("pointercancel",ae),document.documentElement.removeEventListener("pointerleave",Xe),document.removeEventListener("visibilitychange",Oe),e.deleteProgram(oe.program),e.deleteVertexArray(Ie),e.deleteTexture(j),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,F.useEffect)(()=>{me.current?.()}),(0,Se.jsx)("div",{ref:Ae,className:["absolute inset-0 overflow-hidden",dt].filter(Boolean).join(" "),style:{backgroundColor:T,...ht},children:(0,Se.jsx)("canvas",{ref:Pe,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Je=At;var Re=ee(le(),1),Pt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],ue=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ut=Pt.map((i,u)=>({id:u+1,image:i,src:i,img:i,url:i,title:ue[u],text:ue[u],label:ue[u],alt:ue[u],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][u],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function _t({big:i}){return(0,Re.jsx)(We,{big:i,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Re.jsx)(Je,{})})}var Nt=He(_t);export{Nt as default};
