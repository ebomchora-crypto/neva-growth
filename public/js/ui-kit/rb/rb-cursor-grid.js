import{c as Y,i as $e,j as $,l as Te,m as Ae}from"./chunks/chunk-6IYH4WPJ.js";var C=Y($e(),1),B=Y($(),1),et=1.4,tt={lines:0,dashed:1,dots:2,crosses:3},Ce={linear:o=>o,smooth:o=>o*o*(3-2*o),sharp:o=>o*o*o},ot=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,it=`#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform vec2 uOffset;
uniform float uCellSize;
uniform sampler2D uState;
uniform ivec2 uCells;
uniform vec3 uColor;
uniform vec3 uGridColor;
uniform float uLineWidth;
uniform float uMaxOpacity;
uniform float uFillOpacity;
uniform float uGridOpacity;
uniform float uCellRadius;
uniform float uCellGap;
uniform int uGridStyle;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uSpotlight;
uniform float uPresence;
uniform float uEdgeFade;
uniform float uReveal;

out vec4 outColor;

float level(vec2 cell) {
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= float(uCells.x) || cell.y >= float(uCells.y)) return 0.0;
  float v = texelFetch(uState, ivec2(cell), 0).r;
  return v * v * (3.0 - 2.0 * v);
}

float line(float d, float width) {
  float w = max(width, 1.0);
  return clamp(w * 0.5 + 0.5 - d, 0.0, 1.0) * (width / w);
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 pos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 g = (pos - uOffset) / uCellSize;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  vec2 edge = min(f, 1.0 - f) * uCellSize;

  float vx = line(edge.x, uLineWidth);
  float vy = line(edge.y, uLineWidth);
  if (uGridStyle == 1) {
    float dash = uCellSize / 6.0;
    vx *= step(0.5, fract((pos.y - uOffset.y) / dash + 0.25));
    vy *= step(0.5, fract((pos.x - uOffset.x) / dash + 0.25));
  } else if (uGridStyle == 2) {
    float r = max(uLineWidth * 1.25, 1.2);
    float d = length(edge);
    vx = clamp(r + 0.5 - d, 0.0, 1.0);
    vy = 0.0;
  } else if (uGridStyle == 3) {
    float arm = uCellSize * 0.1 + uLineWidth;
    vx *= step(edge.y, arm);
    vy *= step(edge.x, arm);
  }
  float mark = max(vx, vy);

  vec2 toMouse = pos - uMouse;
  float spot = exp(-dot(toMouse, toMouse) / max(uRadius * uRadius, 1.0) * 1.6) * uSpotlight * uPresence;

  vec2 center = uResolution * 0.5;
  float reach = length(center);
  float shown = smoothstep(uReveal * (reach + uCellSize * 2.0), uReveal * (reach + uCellSize * 2.0) - uCellSize * 2.0, length(pos - center));
  shown = uReveal >= 1.0 ? 1.0 : shown;

  float fade = 1.0;
  if (uEdgeFade > 0.0) {
    vec2 norm = pos / uResolution;
    vec2 a = clamp(norm / uEdgeFade, 0.0, 1.0);
    vec2 b = clamp((1.0 - norm) / uEdgeFade, 0.0, 1.0);
    vec2 sa = a * a * a * (a * (a * 6.0 - 15.0) + 10.0);
    vec2 sb = b * b * b * (b * (b * 6.0 - 15.0) + 10.0);
    fade = sa.x * sa.y * sb.x * sb.y;
  }

  float own = level(cell);
  float gridAlpha = mark * min(uGridOpacity + spot * 0.45, 1.0) * fade * shown;
  float litAlpha = 0.0;
  float fillAlpha = 0.0;

  if (uCellGap <= 0.0 && uCellRadius <= 0.0) {
    vec2 side = step(0.5, f) * 2.0 - 1.0;
    float nx = level(cell + vec2(side.x, 0.0));
    float ny = level(cell + vec2(0.0, side.y));
    float nc = level(cell + side);
    float ex = max(own, nx);
    float ey = max(own, ny);
    float joint = max(max(ex, ey), nc);
    float lit;
    if (uGridStyle == 2) lit = vx * joint;
    else if (uGridStyle == 3) lit = max(vx * (edge.y < uLineWidth ? joint : ex), vy * (edge.x < uLineWidth ? joint : ey));
    else lit = max(vx * (edge.y < uLineWidth ? joint : ex), vy * (edge.x < uLineWidth ? joint : ey));
    litAlpha = lit * uMaxOpacity;
    fillAlpha = own * uFillOpacity;
  } else if (own > 0.0) {
    vec2 local = (f - 0.5) * uCellSize;
    float halfSize = uCellSize * 0.5 - max(uCellGap, 0.0);
    float radius = min(uCellRadius, halfSize);
    float sd = roundBox(local, vec2(halfSize), radius);
    float inside = clamp(0.5 - sd, 0.0, 1.0);
    float border = line(abs(sd + uLineWidth * 0.5), uLineWidth) * inside;
    litAlpha = border * own * uMaxOpacity;
    fillAlpha = inside * own * uFillOpacity;
  }
  litAlpha *= fade;
  fillAlpha *= fade;

  float cellAlpha = clamp(max(litAlpha, fillAlpha), 0.0, 1.0);
  float alpha = cellAlpha + gridAlpha * (1.0 - cellAlpha);
  vec3 premul = uColor * cellAlpha + uGridColor * gridAlpha * (1.0 - cellAlpha);
  outColor = vec4(premul, alpha);
}`,A=(o,r,m)=>Math.min(m,Math.max(r,o)),_e=(o,r,m)=>{let s=o.createShader(r);return s?(o.shaderSource(s,m),o.compileShader(s),o.getShaderParameter(s,o.COMPILE_STATUS)?s:(o.deleteShader(s),null)):null},nt=o=>{let r=_e(o,o.VERTEX_SHADER,ot),m=_e(o,o.FRAGMENT_SHADER,it),s=o.createProgram();if(!r||!m||!s)return null;if(o.attachShader(s,r),o.attachShader(s,m),o.linkProgram(s),o.deleteShader(r),o.deleteShader(m),!o.getProgramParameter(s,o.LINK_STATUS))return o.deleteProgram(s),null;let V={},oe=o.getProgramParameter(s,o.ACTIVE_UNIFORMS);for(let X=0;X<oe;X++){let U=o.getActiveUniform(s,X);U&&(V[U.name]=o.getUniformLocation(s,U.name))}return{program:s,uniforms:V}},ee=new Map,lt=o=>{let r=String(o||"#ffffff").replace("#","").trim();(r.length===3||r.length===4)&&(r=r.slice(0,3).split("").map(s=>s+s).join(""));let m=parseInt(r.slice(0,6),16);return Number.isNaN(m)?[1,1,1]:[(m>>16&255)/255,(m>>8&255)/255,(m&255)/255]},Fe=o=>{let r=String(o),m=ee.get(r);if(m)return m;let s=lt(o);return ee.size>64&&ee.clear(),ee.set(r,s),s},at=({cellSize:o=60,color:r,gridColor:m,radius:s=140,falloff:V="smooth",highlight:oe="area",holdTime:X=400,fadeDuration:U=800,lineWidth:ze=1,maxOpacity:Oe=1,fillOpacity:Ge=.06,gridOpacity:Pe=.08,gridStyle:De="lines",cellRadius:Xe=0,cellGap:Ue=0,spotlight:Ne=.6,clickPulse:Ie=!0,pulseSpeed:We=600,ambient:ke=0,edgeFade:Ye=.2,intro:Be=!0,lightMode:Ve=!1,dpr:je,children:ce,className:qe="",style:He})=>{let fe=(0,C.useRef)(null),ue=(0,C.useRef)(null),ie=(0,C.useRef)(null),de=Ve?"#18181b":"#ffffff",he={cellSize:Math.max(8,o),color:r||de,gridColor:m||de,radius:Math.max(1,s),falloff:V,highlight:oe,holdTime:Math.max(0,X),fadeDuration:Math.max(16,U),lineWidth:Math.max(.25,ze),maxOpacity:A(Oe,0,1),fillOpacity:A(Ge,0,1),gridOpacity:A(Pe,0,1),gridStyle:tt[De]??0,cellRadius:Math.max(0,Xe),cellGap:Math.max(0,Ue),spotlight:A(Ne,0,1),clickPulse:Ie,pulseSpeed:Math.max(1,We),ambient:A(ke,0,1),edgeFade:A(Ye,0,.5),intro:Be,dpr:je},E=(0,C.useRef)(he);return E.current=he,(0,C.useEffect)(()=>{let G=fe.current,S=ue.current,e=S?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!G||!S||!e)return;let j=nt(e);if(!j)return;let u=j.uniforms,me=e.createVertexArray(),q=e.createTexture();e.bindTexture(e.TEXTURE_2D,q),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.pixelStorei(e.UNPACK_ALIGNMENT,1);let H=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,h={width:1,height:1,ratio:1,cellSize:0},a={cols:0,rows:0,offX:0,offY:0},g={x:0,y:0,inside:!1},w={x:0,y:0},_=[],v=new Float32Array(0),R=new Float32Array(0),P=new Float32Array(0),ne=new Float32Array(0),K=new Uint8Array(0),N=0,I=0,F=E.current.intro&&!H?0:1,W=0,J=0,Q=!0,L=!0,le=()=>{let i=E.current;h.width=Math.max(1,G.clientWidth),h.height=Math.max(1,G.clientHeight),h.ratio=Math.min(i.dpr||window.devicePixelRatio||1,2),S.width=Math.max(1,Math.round(h.width*h.ratio)),S.height=Math.max(1,Math.round(h.height*h.ratio));let t=i.cellSize,l=Math.ceil(h.width/t)+1,n=Math.ceil(h.height/t)+1,c=l!==a.cols||n!==a.rows||t!==h.cellSize;a.cols=l,a.rows=n,a.offX=(h.width-l*t)/2,a.offY=(h.height-n*t)/2,h.cellSize=t,c&&(v=new Float32Array(l*n),R=new Float32Array(l*n),P=new Float32Array(l*n),ne=new Float32Array(l*n).fill(-1e9),K=new Uint8Array(l*n),e.bindTexture(e.TEXTURE_2D,q),e.texImage2D(e.TEXTURE_2D,0,e.R8,l,n,0,e.RED,e.UNSIGNED_BYTE,K)),L=!0},ae=(i,t)=>{t>P[i]&&(P[i]=t),ne[i]=I},Ke=(i,t)=>{let l=E.current,n=l.cellSize;if(l.highlight==="cell"){let d=Math.floor((i-a.offX)/n),p=Math.floor((t-a.offY)/n);d>=0&&p>=0&&d<a.cols&&p<a.rows&&ae(p*a.cols+d,1);return}let c=l.radius,b=Ce[l.falloff]??Ce.linear,x=Math.max(0,Math.floor((i-c-a.offX)/n)),M=Math.min(a.cols-1,Math.floor((i+c-a.offX)/n)),T=Math.max(0,Math.floor((t-c-a.offY)/n)),f=Math.min(a.rows-1,Math.floor((t+c-a.offY)/n));for(let d=T;d<=f;d++)for(let p=x;p<=M;p++){let D=a.offX+p*n+n/2,re=a.offY+d*n+n/2,z=Math.hypot(D-i,re-t);if(z>c)continue;let O=b(1-z/c);O>0&&ae(d*a.cols+p,O)}},Je=i=>{let t=i.cellSize,l=t*.6,n=t*1.4,c=Math.hypot(h.width,h.height);R.fill(0);for(let b=_.length-1;b>=0;b--){let x=_[b],M=(I-x.t0)*i.pulseSpeed;if(M-n*2>c){_.splice(b,1);continue}if(M<0)continue;let T=x.strength*Math.pow(Math.max(0,1-M/(c+n)),.6),f=M+l*2,d=Math.max(0,Math.floor((x.x-f-a.offX)/t)),p=Math.min(a.cols-1,Math.floor((x.x+f-a.offX)/t)),D=Math.max(0,Math.floor((x.y-f-a.offY)/t)),re=Math.min(a.rows-1,Math.floor((x.y+f-a.offY)/t));for(let z=D;z<=re;z++)for(let O=d;O<=p;O++){let Qe=a.offX+O*t+t/2,Ze=a.offY+z*t+t/2,k=Math.hypot(Qe-x.x,Ze-x.y)-M;if(k>l*2||k<-n*2)continue;let Se=k>0?k/l:k/n,Re=T*Math.exp(-Se*Se),be=z*a.cols+O;Re>R[be]&&(R[be]=Re)}}L=!0},Z=()=>{let i=E.current,t=h.ratio;if(e.viewport(0,0,S.width,S.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(j.program),e.bindVertexArray(me),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,q),L){for(let c=0;c<v.length;c++)K[c]=Math.round(A(Math.max(v[c],R[c]),0,1)*255);e.texSubImage2D(e.TEXTURE_2D,0,0,0,a.cols,a.rows,e.RED,e.UNSIGNED_BYTE,K),L=!1}let l=i.lineWidth*t,n=Math.round(l)%2===1?.5:0;e.uniform1i(u.uState,0),e.uniform2f(u.uResolution,S.width,S.height),e.uniform2f(u.uOffset,Math.round(a.offX*t)+n,Math.round(a.offY*t)+n),e.uniform1f(u.uCellSize,i.cellSize*t),e.uniform2i(u.uCells,a.cols,a.rows),e.uniform3fv(u.uColor,Fe(i.color)),e.uniform3fv(u.uGridColor,Fe(i.gridColor)),e.uniform1f(u.uLineWidth,l),e.uniform1f(u.uMaxOpacity,i.maxOpacity),e.uniform1f(u.uFillOpacity,i.fillOpacity),e.uniform1f(u.uGridOpacity,i.gridOpacity),e.uniform1f(u.uCellRadius,i.cellRadius*t),e.uniform1f(u.uCellGap,i.cellGap*t),e.uniform1i(u.uGridStyle,i.gridStyle),e.uniform2f(u.uMouse,w.x*t,w.y*t),e.uniform1f(u.uRadius,i.radius*t),e.uniform1f(u.uSpotlight,i.spotlight),e.uniform1f(u.uPresence,N),e.uniform1f(u.uEdgeFade,i.edgeFade),e.uniform1f(u.uReveal,F>=1?1:1-Math.pow(1-F,2.2)),e.drawArrays(e.TRIANGLES,0,3),e.bindVertexArray(null)},pe=i=>{if(W=0,!Q||document.hidden)return;let t=E.current,l=J?A((i-J)/1e3,0,1/20):1/60;J=i,I+=l,F<1&&(F=Math.min(1,F+l/et));let n=1-Math.exp(-l/.07);w.x+=(g.x-w.x)*n,w.y+=(g.y-w.y)*n;let c=g.inside?1:0;if(N+=(c-N)*(1-Math.exp(-l/.25)),t.ambient>0&&!H&&v.length){let f=t.ambient*l*v.length*.04,d=Math.floor(f)+(Math.random()<f%1?1:0);for(;d-- >0;)ae(Math.floor(Math.random()*v.length),.25+Math.random()*.45)}_.length?Je(t):R.length&&R.some(f=>f>0)&&(R.fill(0),L=!0);let b=t.holdTime/1e3,x=l/(t.fadeDuration/1e3),M=1-Math.exp(-l/.045),T=_.length>0||F<1||Math.abs(N-c)>.002;for(let f=0;f<v.length;f++){let d=P[f];if(d<=0&&v[f]<=0)continue;I-ne[f]>b&&(d=Math.max(0,d-x)),P[f]=d;let p=v[f],D=d>p?p+(d-p)*M:d;v[f]=D<.002?0:D,v[f]!==p&&(L=!0),(v[f]>0||P[f]>0)&&(T=!0)}Math.abs(w.x-g.x)+Math.abs(w.y-g.y)>.05&&N>.002&&(T=!0),t.ambient>0&&!H&&(T=!0),Z(),T&&(W=requestAnimationFrame(pe))};function y(){!W&&Q&&!document.hidden&&(J=0,W=requestAnimationFrame(pe))}let ve=i=>{let t=G.getBoundingClientRect(),l=i.clientX-t.left,n=i.clientY-t.top;return{x:l,y:n,inside:l>=0&&n>=0&&l<=t.width&&n<=t.height}},xe=i=>{let{x:t,y:l,inside:n}=ve(i),c=g.inside;if(g.inside=n,!n){c&&y();return}g.x=t,g.y=l,c||(w.x=t,w.y=l),Ke(t,l),y()},ge=i=>{let t=E.current,{x:l,y:n,inside:c}=ve(i);!c||!t.clickPulse||H||(_.push({x:l,y:n,t0:I,strength:1}),y())},we=()=>{g.inside=!1,y()},ye=()=>y(),Me=new ResizeObserver(()=>{le(),Z(),y()});Me.observe(G);let Ee=new IntersectionObserver(i=>{Q=i.some(t=>t.isIntersecting),Q&&y()});return Ee.observe(G),window.addEventListener("pointermove",xe,{passive:!0}),window.addEventListener("pointerdown",ge,{passive:!0}),document.documentElement.addEventListener("pointerleave",we),document.addEventListener("visibilitychange",ye),le(),F<1&&_.push({x:h.width/2,y:h.height/2,t0:.15,strength:.6}),Z(),y(),ie.current=()=>{E.current.cellSize!==h.cellSize&&le(),L=!0,Z(),y()},()=>{cancelAnimationFrame(W),ie.current=null,Me.disconnect(),Ee.disconnect(),window.removeEventListener("pointermove",xe),window.removeEventListener("pointerdown",ge),document.documentElement.removeEventListener("pointerleave",we),document.removeEventListener("visibilitychange",ye),e.deleteTexture(q),e.deleteVertexArray(me),e.deleteProgram(j.program),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,C.useEffect)(()=>{ie.current?.()}),(0,B.jsxs)("div",{ref:fe,className:["relative h-full w-full overflow-hidden",qe].filter(Boolean).join(" "),style:He,children:[(0,B.jsx)("canvas",{ref:ue,className:"pointer-events-none absolute inset-0 block h-full w-full","aria-hidden":"true"}),ce?(0,B.jsx)("div",{className:"relative h-full w-full",children:ce}):null]})},Le=at;var se=Y($(),1),rt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],te=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],mt=rt.map((o,r)=>({id:r+1,image:o,src:o,img:o,url:o,title:te[r],text:te[r],label:te[r],alt:te[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function st({big:o}){return(0,se.jsx)(Ae,{big:o,dark:!0,center:!0,zoom:1,drive:"move",children:(0,se.jsx)(Le,{})})}var pt=Te(st);export{pt as default};
