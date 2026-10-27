import{c as be,i as Gt,j as Pe,l as It,m as Ct}from"./chunks/chunk-6IYH4WPJ.js";var V=be(Gt(),1),Ae=be(Pe(),1),Kt=`#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aCenter;
layout(location = 2) in vec4 aState;
uniform mat3 uView;
uniform vec2 uCanvas;
uniform vec2 uOffset;
uniform vec2 uLine;
uniform float uStretch;
uniform float uHead;
uniform float uPad;
uniform float uFar;
out vec2 vLocal;
out vec2 vHalf;
out float vEmphasis;
out float vFlash;
out float vAngle;
out float vShown;
void main() {
  float angle = aState.x;
  float emphasis = aState.y;
  float halfLength = uLine.x * (1.0 + uStretch * emphasis);
  float halfWidth = uLine.y;
  vec2 extent = vec2(halfLength + uPad, max(halfWidth, uHead * halfLength) + uPad);
  vec2 local = aCorner * extent;
  vec2 axis = vec2(cos(angle), sin(angle));
  vec2 point = aCenter + axis * local.x + vec2(-axis.y, axis.x) * local.y;
  vec3 screen = uView * vec3(point, 1.0);
  vec2 scale = vec2(2.0 / uCanvas.x, -2.0 / uCanvas.y);
  vec2 shift = vec2(-1.0 + 2.0 * uOffset.x / uCanvas.x, 1.0 - 2.0 * uOffset.y / uCanvas.y);
  gl_Position = vec4(screen.xy * scale + shift * screen.z, 0.0, screen.z);
  float depth = (uView * vec3(aCenter, 1.0)).z;
  vLocal = local;
  vHalf = vec2(halfLength, halfWidth);
  vEmphasis = emphasis;
  vFlash = aState.z;
  vAngle = angle;
  vShown = aState.w * (1.0 - smoothstep(uFar * 0.45, uFar, depth));
}`,jt=`#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vHalf;
in float vEmphasis;
in float vFlash;
in float vAngle;
in float vShown;
out vec4 fragColor;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uAccentMix;
uniform float uOpacity;
uniform float uFade;
uniform int uShape;
uniform float uHead;
uniform float uRainbow;
uniform float uTone;
uniform float uPeriod;
uniform vec2 uCanvas;
uniform vec2 uOffset;
uniform vec2 uPixels;
uniform vec2 uEdge;

float ndot(vec2 a, vec2 b) {
  return a.x * b.x - a.y * b.y;
}

float rhombus(vec2 p, vec2 b) {
  p = abs(p);
  float h = clamp(ndot(b - 2.0 * p, b) / dot(b, b), -1.0, 1.0);
  float d = length(p - 0.5 * b * vec2(1.0 - h, 1.0 + h));
  return d * sign(p.x * b.y + p.y * b.x - b.x * b.y);
}

float triangle(vec2 p, vec2 q) {
  p.x = abs(p.x);
  vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

float capsule(vec2 p, float from, float to, float radius) {
  float x = clamp(p.x, from, to);
  return length(vec2(p.x - x, p.y)) - radius;
}

float feather(float distance, float zone) {
  if (zone <= 0.0) return 1.0;
  float t = clamp(distance / zone, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 spectrum(float hue, float tone) {
  vec3 k = clamp(abs(fract(hue + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  float chroma = (1.0 - abs(2.0 * tone - 1.0)) * 0.92;
  return tone + chroma * (k - 0.5);
}

void main() {
  vec2 p = vLocal;
  float aa = max(length(fwidth(p)) * 0.7071, 0.0001);
  float halfWidth = max(vHalf.y, aa * 0.5);
  float thin = vHalf.y / halfWidth;
  float halfLength = max(vHalf.x, halfWidth);
  float d;
  if (uShape == 1) {
    float head = min(halfLength * 0.9, max(halfWidth * 4.5, halfLength * 0.55));
    float wing = max(uHead * halfLength, halfWidth * 2.2);
    float shaft = capsule(p, -halfLength + halfWidth, halfLength - head * 0.6, halfWidth);
    float tip = triangle(vec2(p.y, halfLength - p.x), vec2(wing, head));
    d = min(shaft, tip);
  } else if (uShape == 2) {
    d = rhombus(p, vec2(halfLength, max(uHead * halfLength, halfWidth)));
  } else {
    d = capsule(p, -halfLength + halfWidth, halfLength - halfWidth, halfWidth);
  }
  float coverage = clamp(0.5 - d / aa, 0.0, 1.0) * thin;
  if (coverage <= 0.0) discard;

  float emphasis = clamp(vEmphasis + vFlash, 0.0, 1.0);
  vec3 color = mix(uColor, uAccent, uAccentMix * emphasis);
  if (uShape == 2) {
    float north = smoothstep(-aa, aa, p.x);
    color = mix(uColor, uAccent, north);
  }
  if (uRainbow > 0.5) {
    float hue = fract(vAngle / uPeriod);
    vec3 tint = spectrum(hue, uTone);
    color = uShape == 2 ? mix(tint, uColor, 1.0 - smoothstep(-aa, aa, p.x)) : tint;
  }
  float alpha = uOpacity * mix(1.0 - uFade, 1.0, clamp(vEmphasis, 0.0, 1.0));
  alpha = clamp(alpha + vFlash * 0.6, 0.0, 1.0) * coverage * vShown;
  vec2 point = vec2(gl_FragCoord.x, uPixels.y - gl_FragCoord.y) * (uCanvas / uPixels) - uOffset;
  vec2 inside = min(point, uCanvas - 2.0 * uOffset - point);
  alpha *= feather(inside.x, uEdge.x) * feather(inside.y, uEdge.y);
  fragColor = vec4(color * alpha, alpha);
}`,Jt=["orbit","attract","spiral","dipole"],Bt={line:0,arrow:1,needle:2},Je=Math.PI*2,Ie=520,Qe=.34,_t=700,Qt=1.1,Zt=.65,et=4,Ce=3e4,E=(n,r,a)=>Math.min(a,Math.max(r,n)),Ze=n=>n*n*n*(n*(n*6-15)+10),oe=(n,r)=>{let a=r/2;return((n+a)%r+r)%r-a},en=(n,r)=>{let a=Math.imul(n+40503,2246822519)^Math.imul(r+9973,3266489917);return a=Math.imul(a^a>>>15,668265263),a=Math.imul(a^a>>>13,374761393),((a^a>>>16)>>>0)/4294967296*2-1},Be=n=>{let r=String(n||"").trim(),a=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(r);if(a){let h=a[1].length===3?a[1].replace(/./g,m=>m+m):a[1];return[0,2,4].map(m=>parseInt(h.slice(m,m+2),16)/255)}let o=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(r);if(o)return[o[1],o[2],o[3]].map(h=>E(parseFloat(h)/255,0,1));if(typeof document<"u"){let h=document.createElement("canvas").getContext("2d");if(h){h.fillStyle="#000000",h.fillStyle=r;let m=String(h.fillStyle);if(m!=="#000000"||/^(#0{3}|#0{6}|black)$/i.test(r))return Be(m)}}return[.94,.94,.94]},tn=n=>(Math.max(...n)+Math.min(...n))/2,Tt=(n,r,a)=>{let o=n.createShader(r);return o?(n.shaderSource(o,a),n.compileShader(o),n.getShaderParameter(o,n.COMPILE_STATUS)?o:(console.error(n.getShaderInfoLog(o)),n.deleteShader(o),null)):null},nn=n=>{let r=Tt(n,n.VERTEX_SHADER,Kt),a=Tt(n,n.FRAGMENT_SHADER,jt),o=r&&a?n.createProgram():null;if(!r||!a||!o)return r&&n.deleteShader(r),a&&n.deleteShader(a),null;if(n.attachShader(o,r),n.attachShader(o,a),n.linkProgram(o),n.deleteShader(r),n.deleteShader(a),!n.getProgramParameter(o,n.LINK_STATUS))return console.error(n.getProgramInfoLog(o)),n.deleteProgram(o),null;let h={},m=n.getProgramParameter(o,n.ACTIVE_UNIFORMS);for(let y=0;y<m;y++){let L=n.getActiveUniform(o,y);L&&(h[L.name]=n.getUniformLocation(o,L.name))}return{program:o,uniforms:h}},Ot=(n,r)=>{let a=[];for(let o=0;o<3;o++)for(let h=0;h<3;h++)a.push(n[o*3]*r[h]+n[o*3+1]*r[h+3]+n[o*3+2]*r[h+6]);return a},kt=n=>{let[r,a,o,h,m,y,L,Y,P]=n,_=m*P-y*Y,U=y*L-h*P,X=h*Y-m*L,z=r*_+a*U+o*X;return[_,o*Y-a*P,a*y-o*m,U,r*P-o*L,o*h-r*y,X,a*L-r*Y,r*m-a*h].map(g=>g/z)},we=(n,r,a)=>{let o=n[6]*r+n[7]*a+n[8];return[(n[0]*r+n[1]*a+n[2])/o,(n[3]*r+n[4]*a+n[5])/o,o]},an=(n,r,a,o,h)=>{let m=n*Math.PI/180,y=r*Math.PI/180,L=Math.max(a,o)*1.25,Y=[Math.cos(y),0,0,Math.sin(m)*Math.sin(y),Math.cos(m),0,Math.sin(y)*Math.cos(m)/L,-Math.sin(m)/L,1];if(h){let N=Ot([1,0,a/2,0,1,o/2,0,0,1],Y);return{forward:N,inverse:kt(N),minScale:1,maxScale:1}}let P=[[-a/2,-o/2],[a/2,-o/2],[a/2,o/2],[-a/2,o/2]].map(([N,Te])=>we(Y,N,Te)),_=P.map(N=>N[0]),U=P.map(N=>N[1]),X=Math.max(..._)-Math.min(..._),z=Math.max(...U)-Math.min(...U),g=Math.min(1,a/Math.max(1,X),o/Math.max(1,z)),$=(Math.max(..._)+Math.min(..._))/2,D=(Math.max(...U)+Math.min(...U))/2,Z=[g,0,a/2-$*g,0,g,o/2-D*g,0,0,1],re=Ot(Z,Y),se=P.map(N=>g/Math.abs(N[2]));return{forward:re,inverse:kt(re),minScale:Math.min(...se),maxScale:Math.max(...se)}},on=(n,r,a,o,h)=>{let m=n.inverse,y=Math.max(o,h)*2,L=[[-y,-y],[r+y,-y],[r+y,a+y],[-y,a+y]],Y=([g,$])=>m[6]*g+m[7]*$+m[8]-1/et,P=[];if(L.forEach((g,$)=>{let D=L[($+1)%L.length],Z=Y(g),re=Y(D);if(Z>=0&&P.push(g),Z>=0!=re>=0){let se=Z/(Z-re);P.push([g[0]+(D[0]-g[0])*se,g[1]+(D[1]-g[1])*se])}}),P.length<3)return null;let _=1/0,U=1/0,X=-1/0,z=-1/0;for(let[g,$]of P){let D=we(m,g,$);_=Math.min(_,D[0]),U=Math.min(U,D[1]),X=Math.max(X,D[0]),z=Math.max(z,D[1])}return{fromColumn:Math.floor((_+r/2)/o-.5)-1,toColumn:Math.ceil((X+r/2)/o-.5)+1,fromRow:Math.floor((U+a/2)/h-.5)-1,toRow:Math.ceil((z+a/2)/h-.5)+1}},rn=({spacing:n=30,rows:r,columns:a,containerSize:o,lineColor:h="#efefef",accentColor:m,lineWidth:y=2,lineHeight:L=18,baseAngle:Y=-10,mode:P="orbit",shape:_="line",rainbow:U=!1,radius:X=200,fade:z=.65,edgeFade:g=0,stretch:$=.4,reach:D=0,scatter:Z=0,inertia:re=.35,bounce:se=.3,ripple:N=.3,clickPulse:Te=!0,intro:Ut=!0,idle:Dt=!1,tiltX:Nt=0,tiltY:Wt=0,maxDevicePixelRatio:qt=2,className:nt="",style:at})=>{let ot=(0,V.useRef)(null),rt=(0,V.useRef)(null),st=(0,V.useRef)(null),Oe=(0,V.useRef)(null),[it,Ht]=(0,V.useState)(0),ct=typeof o=="number"?`${o}px`:o,ke=!!ct,Ye=Be(h),lt=m?Be(m):null,ft={square:ke,spacing:Math.max(4,Number(n)||30),rows:r?E(Math.round(r),1,400):0,columns:a?E(Math.round(a),1,400):0,lineWidth:y,lineHeight:L,baseAngle:Y*Math.PI/180,mode:Jt.includes(P)?P:"orbit",shape:Bt[_]!==void 0?_:"line",color:Ye,accent:lt??(_==="needle"?Be("#f43f5e"):Ye),accentMix:lt?1:0,rainbow:U,tone:E(tn(Ye),.42,.66),radius:Math.max(1,X),fade:E(z,0,1),edgeFade:E(g,0,1),stretch:E($,0,2),reach:Math.max(0,D),scatter:E(Z,0,1),inertia:E(re,0,1),bounce:E(se,0,1),ripple:E(N,0,1),clickPulse:Te,intro:Ut,idle:Dt,tiltX:E(Nt,-70,70),tiltY:E(Wt,-70,70),maxRatio:E(qt,.5,3)},ve=(0,V.useRef)(ft);return ve.current=ft,(0,V.useEffect)(()=>{Oe.current?.()}),(0,V.useEffect)(()=>{let xe=ot.current,b=rt.current,Ue=st.current;if(!xe||!b||!Ue)return;let e=b.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"default"}),Se=e?nn(e):null;if(!e||!Se)return;let ye=window.matchMedia("(prefers-reduced-motion: reduce)").matches,De=e.createVertexArray();e.bindVertexArray(De);let ut=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ut),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Ne=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Ne),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,2,e.FLOAT,!1,0,0),e.vertexAttribDivisor(1,1);let Fe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Fe),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(2,1),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA);let f={width:1,height:1,pad:0,ratio:1,view:null,length:20,thickness:2,fill:!0,edgePad:1,minScale:1,maxScale:1,introSpeed:_t,bounds:[0,0,0,0],key:""},u={x:0,y:0,vx:0,vy:0,time:0,seen:!1,inside:!1,away:0},w={x:0,y:0,heading:0},G=[],ie=0,me=new Float32Array(0),We=new Int32Array(0),ht=new Float32Array(0),qe=new Float32Array(0),dt=new Float32Array(0),K=new Float32Array(0),pe=new Float32Array(0),ce=new Float32Array(0),le=new Float32Array(0),He=new Uint8Array(0),fe=new Float32Array(0),Re=-1,ue=ve.current.intro&&!ye&&it===0,he=0,Ee=0,q=0,Ve=!0,Xe=document.visibilityState!=="hidden",ze=!1,Me=!0,mt=s=>typeof s=="number"?s:(Ue.style.width=String(s),Ue.getBoundingClientRect().width),Vt=(s,i,c,d,I,A)=>{let v=s/d,C=i/I,S=A?on(c,s,i,v,C):{fromColumn:0,toColumn:d-1,fromRow:0,toRow:I-1},H=we(c.forward,0,0),F=[];if(S)for(let l=S.fromRow;l<=S.toRow;l++){let M=(l+.5)*C-i/2;for(let R=S.fromColumn;R<=S.toColumn;R++){let Ge=(R+.5)*v-s/2,[t,te,ne]=we(c.forward,Ge,M);if(A){if(ne<=0||ne>et)continue;let de=.49*Math.min(v,C)/ne;if(t<-de||t>s+de||te<-de||te>i+de)continue}F.push({x:Ge,y:M,column:R,row:l,w:ne,distance:Math.hypot(t-H[0],te-H[1])})}}F.length>Ce&&(F.sort((l,M)=>l.w-M.w),F.length=Ce);let T=new Map;for(let l=0;l<ie;l++)T.set(We[l*2]*65536+We[l*2+1],l);let p=F.length,B={centers:new Float32Array(p*2),cells:new Int32Array(p*2),reveal:new Float32Array(p),seeds:new Float32Array(p),rests:new Float32Array(p),angles:new Float32Array(p),speeds:new Float32Array(p),seenX:new Float32Array(p),seenY:new Float32Array(p),pending:new Uint8Array(p)},J=0,W=1/0,ee=0,O=[1/0,1/0,-1/0,-1/0];F.forEach((l,M)=>{B.centers[M*2]=l.x,B.centers[M*2+1]=l.y,B.cells[M*2]=l.column,B.cells[M*2+1]=l.row,B.reveal[M]=l.distance,B.seeds[M]=en(l.column,l.row),J=Math.max(J,l.distance),W=Math.min(W,l.w),ee=Math.max(ee,l.w),O[0]=Math.min(O[0],l.x),O[1]=Math.min(O[1],l.y),O[2]=Math.max(O[2],l.x),O[3]=Math.max(O[3],l.y);let R=T.get(l.column*65536+l.row);if(R===void 0){B.pending[M]=1;return}B.angles[M]=K[R],B.speeds[M]=pe[R],B.seenX[M]=ce[R],B.seenY[M]=le[R]}),ie=p,{centers:me,cells:We,reveal:ht,seeds:dt,rests:qe,angles:K,speeds:pe,seenX:ce,seenY:le,pending:He}=B,fe=new Float32Array(p*4),f.introSpeed=Math.max(_t,J/Qt),f.bounds=p?O:[0,0,0,0],f.minScale=p?1/ee:1,f.maxScale=p?1/W:1,e.bindBuffer(e.ARRAY_BUFFER,Ne),e.bufferData(e.ARRAY_BUFFER,me,e.STATIC_DRAW),e.bindBuffer(e.ARRAY_BUFFER,Fe),e.bufferData(e.ARRAY_BUFFER,fe.byteLength||16,e.DYNAMIC_DRAW)},Xt=()=>{let s=ve.current,i=xe.getBoundingClientRect(),c=Math.max(1,i.width),d=Math.max(1,i.height),I=Math.max(1,mt(s.lineHeight)),A=Math.max(.25,mt(s.lineWidth)),v=!s.square,C=v&&(s.tiltX!==0||s.tiltY!==0),S=an(s.tiltX,s.tiltY,c,d,v),H=Math.min(window.devicePixelRatio||1,s.maxRatio),F=Math.max(1,Math.round(s.columns||(s.rows?s.rows*c/d:c/s.spacing))),T=Math.max(1,Math.round(s.rows||(s.columns?s.columns*d/c:d/s.spacing)));if(F*T>Ce){let R=Math.sqrt(F*T/Ce);F=Math.max(1,Math.floor(F/R)),T=Math.max(1,Math.floor(T/R))}let p=[v,F,T,c.toFixed(1),d.toFixed(1),C?`${s.tiltX},${s.tiltY}`:""].join("|");p!==f.key&&(f.key=p,Vt(c,d,S,F,T,C));let B=v?f.minScale:S.minScale,J=v?f.maxScale:S.maxScale,W=v?0:Math.ceil((I*(1+s.stretch)+A*2)*Math.max(1,J)+8),ee=c+W*2,O=d+W*2;b.style.left=`${-W}px`,b.style.top=`${-W}px`,b.style.width=`${ee}px`,b.style.height=`${O}px`;let l=Math.max(1,Math.round(ee*H)),M=Math.max(1,Math.round(O*H));(b.width!==l||b.height!==M)&&(b.width=l,b.height=M),Object.assign(f,{width:c,height:d,pad:W,ratio:H,view:S,length:I,thickness:A,fill:v,edgePad:2/(H*Math.max(.05,B))})},zt=(s,i,c,d)=>{let I=c-me[i*2],A=d-me[i*2+1];if(s.mode==="dipole"){let C=Math.hypot(I,A)||1,S=-I/C,H=-A/C,F=Math.cos(w.heading),T=Math.sin(w.heading),p=F*S+T*H;return Math.atan2(3*p*H-T,3*p*S-F)}let v=Math.atan2(A,I);return s.mode==="attract"?v:s.mode==="spiral"?v+Math.PI/4:v+Math.PI/2},pt=s=>{if(he=0,ze)return;let i=ve.current,c=E((s-Ee)/1e3||0,0,.05);Ee=Math.max(Ee,s),q+=c,Me&&Xt(),Me=!1;let d=i.shape==="line"?Math.PI:Je,I=i.scatter*Math.PI*.5;for(let t=0;t<ie;t++)qe[t]=i.baseAngle+Math.PI/2+dt[t]*I;let A=i.idle&&!ye&&(!u.seen||u.away>1.2);u.seen&&!u.inside&&(u.away+=c);let v=u.seen?u.x:0,C=u.seen?u.y:0;if(A){let t=Math.min(f.width,f.height)*.32;v=Math.cos(q*.37)*t+Math.sin(q*.21)*t*.35,C=Math.sin(q*.53+1.3)*t*.8}let S=1-Math.exp(-c/(u.seen&&!A?.035:.6));if(w.x+=(v-w.x)*S,w.y+=(C-w.y)*S,Math.hypot(u.vx,u.vy)>40){let t=oe(Math.atan2(u.vy,u.vx)-w.heading,Je);w.heading+=t*(1-Math.exp(-c/.25))}u.vx*=Math.exp(-c/.12),u.vy*=Math.exp(-c/.12),ue&&Re<0&&(Re=q);let F=ue?q-Re:1/0,T=!1,p=i.inertia<=0||ye?0:Math.pow(6+42*Math.pow(1-i.inertia,2),2),B=p?2*Math.sqrt(p)*(1-.75*i.bounce):0,J=p?Math.max(1,Math.ceil(c/(1/240))):0,W=J?c/J:0,ee=ye?0:i.ripple/900,O=i.radius,l=i.reach*.55,M=i.reach;for(let t=G.length-1;t>=0;t--)q-G[t].start>G[t].life&&G.splice(t,1);let R=!1;for(let t=0;t<ie;t++){let te=me[t*2],ne=me[t*2+1],de=He[t]===1;if(de)ce[t]=w.x,le[t]=w.y;else{let x=Math.hypot(w.x-te,w.y-ne),k=ee*x,ae=k>0?1-Math.exp(-c/k):1;ce[t]+=(w.x-ce[t])*ae,le[t]+=(w.y-le[t])*ae,Math.abs(w.x-ce[t])+Math.abs(w.y-le[t])>.05&&(R=!0)}let Ft=ce[t],Rt=le[t],Ke=Math.hypot(Ft-te,Rt-ne),Q=zt(i,t,Ft,Rt),ge=qe[t];if(M>0){let x=E((M-Ke)/Math.max(1,M-l),0,1);Q=ge+oe(Q-ge,d)*Ze(x)}let Le=1;if(ue){let x=(F-ht[t]/f.introSpeed)/Zt,k=Ze(E(x,0,1));x<1&&(T=!0),Q=ge+oe(Q-ge,d)*k,Le=E(x*2.5,0,1)}if(de)K[t]=ue?ge:Q,pe[t]=0,He[t]=0;else if(!p)K[t]=K[t]+oe(Q-K[t],d),pe[t]=0;else{let x=K[t],k=pe[t];for(let ae=0;ae<J;ae++)k+=(p*oe(Q-x,d)-B*k)*W,x+=k*W;Math.abs(k)<.002&&Math.abs(oe(Q-x,d))<5e-4?(x+=oe(Q-x,d),k=0):R=!0,(x>40||x<-40)&&(x=oe(x,Je)),K[t]=x,pe[t]=k}let Et=0,Lt=0;for(let x of G){let k=(q-x.start)*Ie,ae=Math.hypot(te-x.x,ne-x.y),je=(k-ae)/(Ie*Qe);je>0&&je<1&&(Et+=Ze(je)*d);let Pt=(k-ae-Ie*Qe*.5)/60;Lt+=Math.exp(-Pt*Pt)*Math.max(0,1-(q-x.start)/x.life)}let $t=Math.exp(-(Ke*Ke)/(O*O))*Le;fe[t*4]=K[t]+Et,fe[t*4+1]=$t,fe[t*4+2]=Math.min(1,Lt*.9)*Le,fe[t*4+3]=Le}if(ue&&!T&&q-Re>.2&&(ue=!1),Math.abs(v-w.x)+Math.abs(C-w.y)>.05&&(R=!0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,b.width,b.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),ie&&f.view){let t=Se.uniforms;e.useProgram(Se.program),e.uniformMatrix3fv(t.uView,!0,f.view.forward),e.uniform2f(t.uCanvas,f.width+f.pad*2,f.height+f.pad*2),e.uniform2f(t.uOffset,f.pad,f.pad),e.uniform2f(t.uLine,f.length/2,f.thickness/2),e.uniform1f(t.uStretch,i.stretch),e.uniform1f(t.uHead,i.shape==="needle"?.16:i.shape==="arrow"?.32:0),e.uniform1f(t.uPad,f.edgePad),e.uniform1f(t.uFar,f.fill?et:1e6),e.uniform3fv(t.uColor,i.color),e.uniform3fv(t.uAccent,i.accent),e.uniform1f(t.uAccentMix,i.accentMix),e.uniform1f(t.uOpacity,1),e.uniform1f(t.uFade,i.fade),e.uniform1i(t.uShape,Bt[i.shape]),e.uniform1f(t.uRainbow,i.rainbow?1:0),e.uniform1f(t.uTone,i.tone),e.uniform1f(t.uPeriod,d),e.uniform2f(t.uPixels,b.width,b.height),e.uniform2f(t.uEdge,i.edgeFade*.34*f.width,i.edgeFade*.44*f.height),e.bindVertexArray(De),e.bindBuffer(e.ARRAY_BUFFER,Fe),e.bufferSubData(e.ARRAY_BUFFER,0,fe),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,ie)}(R||ue||G.length>0||A)&&Ve&&Xe&&(he=requestAnimationFrame(pt))},j=()=>{he||ze||!Ve||!Xe||(Ee=performance.now(),he=requestAnimationFrame(pt))};Oe.current=()=>{Me=!0,j()};let vt=(s,i)=>{if(!f.view)return null;let c=xe.getBoundingClientRect(),[d,I,A]=we(f.view.inverse,s-c.left,i-c.top);if(A<=0)return null;let v=s>=c.left&&s<=c.right&&i>=c.top&&i<=c.bottom;return{x:d,y:I,inside:v}},$e=s=>{let i=vt(s.clientX,s.clientY);if(!i)return;let c=performance.now(),d=Math.max(1,c-u.time)/1e3;u.seen&&d<.2&&(u.vx=u.vx*.6+(i.x-u.x)/d*.4,u.vy=u.vy*.6+(i.y-u.y)/d*.4),u.time=c,u.x=i.x,u.y=i.y,u.seen=!0,u.inside=i.inside,i.inside&&(u.away=0),j()},xt=s=>{if($e(s),!ve.current.clickPulse||ye||!ie)return;let c=vt(s.clientX,s.clientY);if(!c||!(f.fill?c.inside:Math.abs(c.x)<=f.width/2&&Math.abs(c.y)<=f.height/2))return;let[I,A,v,C]=f.bounds,S=Math.max(Math.hypot(c.x-I,c.y-A),Math.hypot(c.x-v,c.y-A),Math.hypot(c.x-I,c.y-C),Math.hypot(c.x-v,c.y-C));G.push({x:c.x,y:c.y,start:q,life:Math.min(6,S/Ie+Qe+.1)}),G.length>6&&G.shift(),j()},yt=()=>{u.inside=!1,j()};window.addEventListener("pointermove",$e,{passive:!0}),window.addEventListener("pointerdown",xt,{passive:!0}),document.documentElement.addEventListener("pointerleave",yt);let Mt=s=>{s.preventDefault(),ze=!0,cancelAnimationFrame(he),he=0},gt=()=>Ht(s=>s+1);b.addEventListener("webglcontextlost",Mt),b.addEventListener("webglcontextrestored",gt);let bt=new ResizeObserver(()=>{Me=!0,j()});bt.observe(xe);let wt=()=>{Me=!0,j()};window.addEventListener("resize",wt);let At=new IntersectionObserver(s=>{Ve=s.some(i=>i.isIntersecting),j()});At.observe(xe);let St=()=>{Xe=document.visibilityState!=="hidden",j()};return document.addEventListener("visibilitychange",St),j(),()=>{cancelAnimationFrame(he),Oe.current=null,bt.disconnect(),At.disconnect(),window.removeEventListener("pointermove",$e),window.removeEventListener("pointerdown",xt),window.removeEventListener("resize",wt),document.documentElement.removeEventListener("pointerleave",yt),document.removeEventListener("visibilitychange",St),b.removeEventListener("webglcontextlost",Mt),b.removeEventListener("webglcontextrestored",gt),e.isContextLost()||(e.deleteBuffer(ut),e.deleteBuffer(Ne),e.deleteBuffer(Fe),e.deleteVertexArray(De),e.deleteProgram(Se.program))}},[it]),(0,Ae.jsxs)("div",{ref:ot,className:`relative ${ke?"aspect-square max-w-full":"h-full w-full overflow-hidden"}${nt?` ${nt}`:""}`,style:ke?{width:ct,...at}:at,children:[(0,Ae.jsx)("canvas",{ref:rt,className:"pointer-events-none absolute block","aria-hidden":"true"}),(0,Ae.jsx)("span",{ref:st,className:"pointer-events-none invisible absolute left-0 top-0 h-0","aria-hidden":"true"})]})},Yt=rn;var tt=be(Pe(),1),sn=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],_e=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],mn=sn.map((n,r)=>({id:r+1,image:n,src:n,img:n,url:n,title:_e[r],text:_e[r],label:_e[r],alt:_e[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function cn({big:n}){return(0,tt.jsx)(Ct,{big:n,dark:!0,center:!1,zoom:1,drive:"move",children:(0,tt.jsx)(Yt,{})})}var pn=It(cn);export{pn as default};
