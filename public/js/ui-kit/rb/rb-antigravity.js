import{c as Q,i as Ct,j as he,l as ft,m as dt}from"./chunks/chunk-6IYH4WPJ.js";var B=Q(Ct(),1),Le=Q(he(),1),Dt=24e5,_e=31.5,H=256,mt=["#5227FF","#FF9FFC","#B497CF"],ht={capsule:0,sphere:1,box:2,tetrahedron:3},pt={conic:0,radial:1,random:2},It=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aParticle;
layout(location = 2) in vec4 aSeed;
uniform vec2 uSize;
uniform float uPixel;
uniform vec2 uCursor;
uniform float uRing;
uniform float uBand;
uniform float uParticle;
uniform float uAmbient;
uniform float uTime;
uniform float uPulse;
uniform float uVariance;
uniform float uDepth;
uniform float uShape;
uniform float uColorMode;
uniform float uStops;
uniform float uHue;
uniform float uReveal;
uniform float uStreak;
uniform float uCharge;
out vec2 vLocal;
out vec2 vBounds;
out float vU;
out float vAlpha;
out float vSoft;

void main() {
  vec2 rel = aParticle.xy - uCursor;
  float dist = length(rel);
  vec2 radial = dist > 1e-3 ? rel / dist : vec2(1.0, 0.0);
  vec2 dir = radial;
  float speed = length(aParticle.zw);
  float streak = clamp(speed / uStreak, 0.0, 2.5);
  if (speed > 1e-3) {
    vec2 heading = aParticle.zw / speed * sign(dot(aParticle.zw, radial) + 1e-4);
    dir = normalize(mix(radial, heading, smoothstep(0.0, 1.0, streak)));
  }
  float ring = exp(-pow((dist - uRing) / uBand, 2.0));
  float z = aSeed.x;
  float depth = 1.0 + z * 0.32 * uDepth;
  float pulse = 1.0 + sin(uTime * uPulse + aSeed.y) * 0.22 * uVariance;
  float grow = uAmbient + (1.0 - uAmbient) * ring;
  float size = uParticle * depth * pulse * (0.85 + 0.3 * aSeed.w) * (1.0 + uCharge * 0.25 * ring);
  vec2 bounds;
  if (uShape < 0.5) {
    float width = size * 0.17 * mix(0.55, 1.0, ring);
    bounds = vec2(max(width, size * 0.5 * grow) * (1.0 + streak * 1.2), width);
  } else if (uShape < 1.5) {
    bounds = vec2(size * 0.22 * mix(0.45, 1.0, grow));
  } else {
    bounds = vec2(size * 0.26 * mix(0.45, 1.0, grow));
  }
  float soft = 1.0 + max(-z, 0.0) * 1.6 * uDepth;
  vec2 local = aCorner * (bounds + soft * 1.5 / uPixel);
  vec2 world = aParticle.xy + dir * local.x + vec2(-dir.y, dir.x) * local.y;
  gl_Position = vec4(world.x / uSize.x * 2.0 - 1.0, 1.0 - world.y / uSize.y * 2.0, 0.0, 1.0);
  vLocal = local * uPixel;
  vBounds = bounds * uPixel;
  vSoft = soft;
  if (uColorMode < 0.5) {
    vU = atan(radial.y, radial.x) / 6.28318530718 + uHue + (aSeed.z - 0.5) * 0.06;
  } else if (uColorMode < 1.5) {
    vU = clamp(dist / (uRing * 2.4), 0.0, 1.0) + (aSeed.z - 0.5) * 0.06;
  } else {
    vU = floor(aSeed.z * uStops) / max(uStops - 1.0, 1.0);
  }
  float fog = 1.0 - max(-z, 0.0) * 0.35 * uDepth;
  vAlpha = mix(uAmbient, 1.0, ring) * fog * uReveal;
}`,zt=`#version 300 es
precision highp float;
uniform sampler2D uPalette;
uniform float uShape;
uniform float uColorMode;
uniform float uOpacity;
in vec2 vLocal;
in vec2 vBounds;
in float vU;
in float vAlpha;
in float vSoft;
out vec4 fragColor;

void main() {
  vec2 p = vLocal;
  float d;
  if (uShape < 0.5) {
    float r = vBounds.y;
    d = length(vec2(max(abs(p.x) - max(vBounds.x - r, 0.0), 0.0), p.y)) - r;
  } else if (uShape < 1.5) {
    d = length(p) - vBounds.x;
  } else if (uShape < 2.5) {
    float r = vBounds.x * 0.28;
    vec2 q = abs(p) - (vBounds - r);
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  } else {
    float r = vBounds.x * 1.15;
    vec2 q = vec2(r * 0.5774 - p.x, abs(p.y));
    d = max(dot(q, vec2(0.5, 0.8660254)) - r * 0.5, -q.x - r * 0.5) * 1.2;
  }
  float alpha = clamp(0.5 - d / vSoft, 0.0, 1.0) * vAlpha * uOpacity;
  if (alpha < 0.002) discard;
  vec3 color = texture(uPalette, vec2(uColorMode < 0.5 ? fract(vU) : vU, uColorMode < 0.5 ? 0.25 : 0.75)).rgb;
  fragColor = vec4(color * alpha, alpha);
}`,T=(t,a,c)=>Math.min(c,Math.max(a,t)),Ot=t=>{let a=String(t||"").trim(),c=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(a);if(c){let y=c[1].length===3?c[1].replace(/./g,m=>m+m):c[1];return[0,2,4].map(m=>parseInt(y.slice(m,m+2),16)/255)}let i=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(a);return i?[i[1],i[2],i[3]].map(y=>T(parseFloat(y)/255,0,1)):null},Xt=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4),kt=t=>t<=.0031308?t*12.92:1.055*Math.pow(Math.max(t,0),1/2.4)-.055,vt=t=>{let[a,c,i]=t.map(Xt),y=Math.cbrt(.4122214708*a+.5363325363*c+.0514459929*i),m=Math.cbrt(.2119034982*a+.6806995451*c+.1073969566*i),g=Math.cbrt(.0883024619*a+.2817188376*c+.6299787005*i);return[.2104542553*y+.793617785*m-.0040720468*g,1.9779984951*y-2.428592205*m+.4505937099*g,.0259040371*y+.7827717662*m-.808675766*g]},Yt=([t,a,c])=>{let i=Math.pow(t+.3963377774*a+.2158037573*c,3),y=Math.pow(t-.1055613458*a-.0638541728*c,3),m=Math.pow(t-.0894841775*a-1.291485548*c,3);return[4.0767416621*i-3.3077115913*y+.2309699292*m,-1.2684380046*i+2.6097574011*y-.3413193965*m,-.0041960863*i-.7034186147*y+1.707614701*m].map(g=>T(kt(g),0,1))},Nt=(t,a)=>{let c=[];t.forEach(m=>{let g=Ot(m);if(!g)return;let x=vt(g),D=Math.atan2(x[2],x[1])*180/Math.PI,S=T(1-Math.abs(D-85)/40,0,1),_=.62+.14*S*S*(3-2*S);if(a&&x[0]>_){let P=1+(x[0]-_)*1.6;c.push([_,x[1]*P,x[2]*P])}else c.push(x)}),c.length||c.push(vt(a?[.1,.1,.12]:[1,1,1]));let i=new Uint8Array(H*2*4);return[[...c,c[0]],c.length>1?c:[c[0],c[0]]].forEach((m,g)=>{for(let x=0;x<H;x++){let D=x/(H-(g===0?0:1))*(m.length-1),S=Math.min(Math.floor(D),m.length-2),_=D-S,P=_*_*(3-2*_),F=m[S],I=m[S+1],ve=Math.hypot(F[1],F[2])*(1-P)+Math.hypot(I[1],I[2])*P,j=F[1]+(I[1]-F[1])*P,ee=F[2]+(I[2]-F[2])*P,te=Math.hypot(j,ee),ne=te>1e-4?ve/te:0,xe=Yt([F[0]+(I[0]-F[0])*P,j*ne,ee*ne]);for(let k=0;k<3;k++)i[(g*H+x)*4+k]=Math.round(xe[k]*255);i[(g*H+x)*4+3]=255}}),i},Vt=t=>()=>{t|=0,t=t+1831565813|0;let a=Math.imul(t^t>>>15,1|t);return a=a+Math.imul(a^a>>>7,61|a)^a,((a^a>>>14)>>>0)/4294967296},xt=(t,a,c)=>{let i=t.createShader(a);return i?(t.shaderSource(i,c),t.compileShader(i),t.getShaderParameter(i,t.COMPILE_STATUS)?i:(console.error(t.getShaderInfoLog(i)),t.deleteShader(i),null)):null},qt=t=>{let a=xt(t,t.VERTEX_SHADER,It),c=xt(t,t.FRAGMENT_SHADER,zt),i=a&&c?t.createProgram():null;if(!a||!c||!i)return a&&t.deleteShader(a),c&&t.deleteShader(c),null;if(t.attachShader(i,a),t.attachShader(i,c),t.linkProgram(i),t.deleteShader(a),t.deleteShader(c),!t.getProgramParameter(i,t.LINK_STATUS))return console.error(t.getProgramInfoLog(i)),t.deleteProgram(i),null;let y={},m=t.getProgramParameter(i,t.ACTIVE_UNIFORMS);for(let g=0;g<m;g++){let x=t.getActiveUniform(i,g);x&&(y[x.name]=t.getUniformLocation(i,x.name))}return{program:i,uniforms:y}},Gt=({count:t=1500,magnetRadius:a=9,ringRadius:c=7,waveSpeed:i=.4,waveAmplitude:y=1,waveCount:m=3,particleSize:g=.9,lerpSpeed:x=.05,color:D,colors:S=mt,colorMode:_="conic",colorSpeed:P=.05,autoAnimate:F=!0,particleVariance:I=1,rotationSpeed:ve=0,depthFactor:j=1,pulseSpeed:ee=3,particleShape:te="capsule",fieldStrength:ne=10,ambient:xe=.25,interactive:k=!0,clickBurst:yt=!0,intro:bt=!0,lightMode:Ce=!1,opacity:wt=1,maxDevicePixelRatio:At=2,className:Mt="",style:Rt})=>{let De=(0,B.useRef)(null),Ie=(0,B.useRef)(null),ge=(0,B.useRef)(null),[ze,Et]=(0,B.useState)(0),Oe=D?[D]:Array.isArray(S)&&S.length?S:mt,Xe={count:T(Math.round(t),1,2e4),magnet:Math.max(0,a),ring:Math.max(0,c),waveSpeed:i,waveAmplitude:Math.max(0,y),waveCount:Math.max(0,Math.round(m)),size:Math.max(0,g),follow:T(x,.001,1),palette:Oe,paletteKey:`${Oe.join(",")}|${Ce}`,colorMode:pt[_]??pt.conic,colorSpeed:P,autoAnimate:F,variance:Math.max(0,I),rotation:ve,depth:Math.max(0,j),pulse:ee,shape:ht[te]??ht.capsule,tightness:Math.max(0,ne),ambient:T(xe,0,1),interactive:k,clickBurst:yt,intro:bt,light:Ce,opacity:T(wt,0,1),maxRatio:T(At,.5,3)},Y=(0,B.useRef)(Xe);return Y.current=Xe,(0,B.useEffect)(()=>{ge.current?.()}),(0,B.useEffect)(()=>{let W=De.current,E=Ie.current;if(!W||!E)return;let e=E.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),oe=e?qt(e):null;if(!e||!oe)return;let K=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ye=e.createVertexArray();e.bindVertexArray(ye);let ke=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ke),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let re=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,re),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(1,1);let be=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,be),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(2,1);let ae=e.createTexture();e.bindTexture(e.TEXTURE_2D,ae),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let A={width:1,height:1,ratio:1},f={x:0,y:0,vx:0,vy:0,tx:0,ty:0,ready:!1},p={x:0,y:0,inside:!1,down:!1,moved:-1/0},R=null,Ye="",z=0,Ne=0,U=0,N=Y.current.intro&&!K&&ze===0?0:1/0,O=0,ie=0,we=!0,Ae=document.visibilityState!=="hidden",Me=!1,St=n=>{n.paletteKey!==Ye&&(Ye=n.paletteKey,e.bindTexture(e.TEXTURE_2D,ae),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,H,2,0,e.RGBA,e.UNSIGNED_BYTE,Nt(n.palette,n.light)))},Tt=(n,o,s,h)=>{let v=Vt(1337),b=.06,l=o*(1+b*2),V=s*(1+b*2),L=Math.max(1,Math.ceil(Math.sqrt(n*l/V))),X=Math.max(1,Math.ceil(n/L)),w=Array.from({length:L*X},(r,M)=>M);for(let r=w.length-1;r>0;r--){let M=Math.floor(v()*(r+1));[w[r],w[M]]=[w[M],w[r]]}let C=Array.from({length:n},()=>v()*2-1).sort((r,M)=>r-M),d={total:n,width:o,height:s,homeX:new Float32Array(n),homeY:new Float32Array(n),band:new Float32Array(n),phase:new Float32Array(n),agility:new Float32Array(n),delay:new Float32Array(n),orbit:new Float32Array(n),x:new Float32Array(n),y:new Float32Array(n),vx:new Float32Array(n),vy:new Float32Array(n),particles:new Float32Array(n*4),seeds:new Float32Array(n*4)};for(let r=0;r<n;r++){let M=w[r],Z=-o*b+(M%L+.5+(v()-.5)*.85)/L*l,J=-s*b+(Math.floor(M/L)+.5+(v()-.5)*.85)/X*V;d.homeX[r]=Z,d.homeY[r]=J,d.band[r]=v()*2-1,d.phase[r]=v()*Math.PI*2,d.agility[r]=.75+v()*.5,d.delay[r]=v(),h&&r<h.total?(d.x[r]=h.x[r]/h.width*o,d.y[r]=h.y[r]/h.height*s,d.vx[r]=h.vx[r],d.vy[r]=h.vy[r],d.orbit[r]=h.orbit[r]):(d.x[r]=Z,d.y[r]=N===0?J+s*(.45+d.delay[r]*.4):J),d.seeds[r*4]=C[r],d.seeds[r*4+1]=d.phase[r],d.seeds[r*4+2]=v(),d.seeds[r*4+3]=v()}return e.bindBuffer(e.ARRAY_BUFFER,be),e.bufferData(e.ARRAY_BUFFER,d.seeds,e.STATIC_DRAW),e.bindBuffer(e.ARRAY_BUFFER,re),e.bufferData(e.ARRAY_BUFFER,d.particles.byteLength,e.DYNAMIC_DRAW),d},Re=()=>{let n=Y.current,o=W.getBoundingClientRect(),s=Math.max(1,o.width),h=Math.max(1,o.height),v=Math.min(window.devicePixelRatio||1,n.maxRatio,Math.sqrt(Dt/(s*h))),b=Math.max(1,Math.round(s*v)),l=Math.max(1,Math.round(h*v));(E.width!==b||E.height!==l)&&(E.width=b,E.height=l),A.width=s,A.height=h,A.ratio=b/s,f.ready||(f.x=f.tx=s/2,f.y=f.ty=h/2,f.ready=!0),(!R||R.total!==n.count||Math.abs(R.width-s)>.5||Math.abs(R.height-h)>.5)&&(R=Tt(n.count,s,h,R))},Pt=(n,o)=>{if(!R)return;let s=A.height/_e,h=n.ring*s*(1-.38*U),v=Math.max(n.magnet*s,1),b=5/(n.tightness+.1)*s,l=n.waveAmplitude*s*.5,V=2.2+n.follow*80,L=(n.rotation+U*3)*(K?.3:1),X=A.width/2,w=A.height/2,C=v*.18,{homeX:d,homeY:r,band:M,phase:Z,agility:J,delay:Bt,orbit:je,x:Ee,y:Se,vx:ce,vy:le,particles:ue,seeds:_t,total:Lt}=R;for(let u=0;u<Lt;u++){let et=1-_t[u*4]*.12*n.depth,tt=X+(f.x-X)*et,nt=w+(f.y-w)*et,ot=d[u],rt=r[u]+Math.sin(z*.7+Z[u])*s*.12*n.waveAmplitude,Te=ot-tt,Pe=rt-nt,Fe=Math.sqrt(Te*Te+Pe*Pe),Be=1-T((Fe-(v-C))/(C*2),0,1),fe=Be*Be*(3-2*Be),q=je[u]+L*fe*o;q-=Math.atan2(Math.sin(q),Math.cos(q))*(1-fe)*Math.min(1,o*2.5),je[u]=q;let at=ot,it=rt;if(fe>0||Math.abs(q)>1e-4){let G=Math.atan2(Pe,Te)+q,Ut=l*(.6*Math.sin(G*n.waveCount-z*n.waveSpeed*2)+.4*Math.sin(Z[u]+z*n.waveSpeed*1.3)),ut=Fe+(h+Ut+M[u]*b-Fe)*fe;at=tt+Math.cos(G)*ut,it=nt+Math.sin(G)*ut}let de=N<Bt[u]*.9?0:V*J[u],st=1.64*de,ct=de*de,lt=Math.min(4,Math.max(1,Math.ceil(de*o*2))),me=o/lt;for(let G=0;G<lt;G++)ce[u]+=((at-Ee[u])*ct-ce[u]*st)*me,le[u]+=((it-Se[u])*ct-le[u]*st)*me,Ee[u]+=ce[u]*me,Se[u]+=le[u]*me;ue[u*4]=Ee[u],ue[u*4+1]=Se[u],ue[u*4+2]=ce[u],ue[u*4+3]=le[u]}},Ft=(n,o)=>{if(!R)return;let s=A.height/_e,h=Math.max(n.magnet,n.ring)*s*1.8,{x:v,y:b,vx:l,vy:V,agility:L,total:X}=R;for(let w=0;w<X;w++){let C=v[w]-f.x,d=b[w]-f.y,r=Math.sqrt(C*C+d*d)+.001,M=s*110*o*Math.exp(-Math.pow(r/h,2))*L[w];l[w]+=C/r*M,V[w]+=d/r*M}},Ve=n=>{if(O=0,Me||!R)return;let o=Y.current;St(o);let s=T((n-ie)/1e3||0,0,1/30);ie=Math.max(ie,n);let h=K?.3:1;z+=s*h,Ne+=s*o.colorSpeed*h,N<3&&(N+=s),U=p.down?Math.min(1,U+s/.9):Math.max(0,U-s*4);let v=performance.now()-p.moved>2e3||!p.inside;o.autoAnimate&&!K&&(v||!o.interactive)?(f.tx=A.width/2+Math.sin(z*.5)*(A.width/4),f.ty=A.height/2+Math.cos(z)*(A.height/4)):o.interactive&&p.inside&&(f.tx=p.x,f.ty=p.y),f.vx+=((f.tx-f.x)*49-f.vx*14)*s,f.vy+=((f.ty-f.y)*49-f.vy*14)*s,f.x+=f.vx*s,f.y+=f.vy*s,Pt(o,s);let b=A.height/_e;e.viewport(0,0,E.width,E.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(oe.program),e.bindVertexArray(ye),e.bindBuffer(e.ARRAY_BUFFER,re),e.bufferSubData(e.ARRAY_BUFFER,0,R.particles);let l=oe.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,ae),e.uniform1i(l.uPalette,0),e.uniform2f(l.uSize,A.width,A.height),e.uniform1f(l.uPixel,A.ratio),e.uniform2f(l.uCursor,f.x,f.y),e.uniform1f(l.uRing,o.ring*b*(1-.38*U)),e.uniform1f(l.uBand,Math.max(b*6,1)),e.uniform1f(l.uParticle,o.size*b*.6),e.uniform1f(l.uAmbient,o.ambient),e.uniform1f(l.uTime,z),e.uniform1f(l.uPulse,o.pulse),e.uniform1f(l.uVariance,o.variance),e.uniform1f(l.uDepth,o.depth),e.uniform1f(l.uShape,o.shape),e.uniform1f(l.uColorMode,o.colorMode),e.uniform1f(l.uStops,o.palette.length),e.uniform1f(l.uHue,Ne),e.uniform1f(l.uReveal,N<3?T(N/.6,0,1):1),e.uniform1f(l.uStreak,b*30),e.uniform1f(l.uCharge,U),e.uniform1f(l.uOpacity,o.opacity),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,R.total),we&&Ae&&(O=requestAnimationFrame(Ve))},$=()=>{O||Me||!we||!Ae||(ie=performance.now(),O=requestAnimationFrame(Ve))};ge.current=()=>{Re(),$()};let qe=n=>{let o=W.getBoundingClientRect();return{x:n.clientX-o.left,y:n.clientY-o.top,inside:n.clientX>=o.left&&n.clientX<=o.right&&n.clientY>=o.top&&n.clientY<=o.bottom}},Ge=n=>{let o=qe(n);p.inside=o.inside,o.inside&&(p.x=o.x,p.y=o.y,p.moved=performance.now())},He=n=>{let o=Y.current,s=qe(n);!s.inside||!o.interactive||(p.x=s.x,p.y=s.y,p.inside=!0,p.moved=performance.now(),o.clickBurst&&!K&&(p.down=!0))},se=n=>{p.down&&Ft(Y.current,.45+U),p.down=!1,n.pointerType!=="mouse"&&(p.inside=!1)},We=()=>{p.inside=!1,p.down=!1};window.addEventListener("pointermove",Ge,{passive:!0}),window.addEventListener("pointerdown",He,{passive:!0}),window.addEventListener("pointerup",se,{passive:!0}),window.addEventListener("pointercancel",se,{passive:!0}),document.documentElement.addEventListener("pointerleave",We);let Ke=n=>{n.preventDefault(),Me=!0,cancelAnimationFrame(O),O=0},$e=()=>Et(n=>n+1);E.addEventListener("webglcontextlost",Ke),E.addEventListener("webglcontextrestored",$e);let Ze=new ResizeObserver(()=>{Re(),$()});Ze.observe(W);let Je=new IntersectionObserver(n=>{we=n.some(o=>o.isIntersecting),$()});Je.observe(W);let Qe=()=>{Ae=document.visibilityState!=="hidden",$()};return document.addEventListener("visibilitychange",Qe),Re(),$(),()=>{cancelAnimationFrame(O),ge.current=null,Ze.disconnect(),Je.disconnect(),window.removeEventListener("pointermove",Ge),window.removeEventListener("pointerdown",He),window.removeEventListener("pointerup",se),window.removeEventListener("pointercancel",se),document.documentElement.removeEventListener("pointerleave",We),document.removeEventListener("visibilitychange",Qe),E.removeEventListener("webglcontextlost",Ke),E.removeEventListener("webglcontextrestored",$e),e.isContextLost()||(e.deleteBuffer(ke),e.deleteBuffer(re),e.deleteBuffer(be),e.deleteTexture(ae),e.deleteVertexArray(ye),e.deleteProgram(oe.program))}},[ze]),(0,Le.jsx)("div",{ref:De,className:`relative h-full w-full overflow-hidden ${Mt}`.trim(),style:Rt,children:(0,Le.jsx)("canvas",{ref:Ie,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},gt=Gt;var Ue=Q(he(),1),Ht=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],pe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],jt=Ht.map((t,a)=>({id:a+1,image:t,src:t,img:t,url:t,title:pe[a],text:pe[a],label:pe[a],alt:pe[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Wt({big:t}){return(0,Ue.jsx)(dt,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Ue.jsx)(gt,{})})}var en=ft(Wt);export{en as default};
