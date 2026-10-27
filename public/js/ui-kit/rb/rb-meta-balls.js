import{c as N,i as he,j as Y,l as Bt,m as Ft}from"./chunks/chunk-6IYH4WPJ.js";var A=N(he(),1),ot=N(Y(),1),O=50,k=O+1,me={solid:0,outline:1,contour:2},et=.877,E=i=>i-Math.floor(i),pe=i=>{let a=[i*.1031,i*.103,i*.0973].map(E),p=a[0]*(a[1]+33.33)+a[1]*(a[2]+33.33)+a[2]*(a[0]+33.33);return a.map(d=>E(d+p))},de=i=>{let a=[i[0]*.1031,i[1]*.103,i[2]*.0973].map(E),p=a[0]*(a[1]+33.33)+a[1]*(a[0]+33.33)+a[2]*(a[2]+33.33),d=a.map(J=>E(J+p));return[E((d[0]+d[1])*d[2]),E((d[0]+d[0])*d[1]),E((d[1]+d[0])*d[0])]},ve=i=>{let a=String(i||"").trim().replace("#","");return a.length===3&&(a=a.replace(/./g,p=>p+p)),/^[0-9a-f]{6}/i.test(a)?[0,2,4].map(p=>parseInt(a.slice(p,p+2),16)/255):[1,1,1]},x=(i,a,p)=>Math.min(p,Math.max(a,i)),K=(i,a,p)=>{let d=x((p-i)/(a-i),0,1);return d*d*(3-2*d)},ge=i=>1-Math.pow(1-x(i,0,1),3),Pt=i=>{let a=x(i,0,1);return a<.5?4*a*a*a:1-Math.pow(-2*a+2,3)/2},xe=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,ye=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uScale;
uniform vec4 uBalls[${k}];
uniform vec4 uShapes[${k}];
uniform int uCount;
uniform float uGamma;
uniform float uThreshold;
uniform vec3 uColor;
uniform vec3 uCursorColor;
uniform int uVariant;
uniform float uLine;
uniform float uSpacing;
uniform float uRings;
uniform float uOpaque;

out vec4 outColor;

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) * uScale;
  float field = 0.0;
  float tint = 0.0;
  float mass = 0.0;
  vec2 grad = vec2(0.0);
  bool classic = abs(uGamma - 1.0) < 0.001;
  for (int i = 0; i < ${k}; i++) {
    if (i >= uCount) break;
    vec4 ball = uBalls[i];
    vec4 shape = uShapes[i];
    vec2 d = p - ball.xy;
    vec2 q = vec2(shape.x * d.x + shape.y * d.y, shape.y * d.x + shape.z * d.y);
    float qq = max(dot(q, q), ball.z * 1e-4 + 1e-12);
    float v = ball.z / qq;
    float w = classic ? v : pow(v, uGamma);
    field += w;
    float weight = w / (1.0 + w / uThreshold);
    mass += weight;
    tint += weight * ball.w;
    grad -= 2.0 * uGamma * w / qq * vec2(shape.x * q.x + shape.y * q.y, shape.y * q.x + shape.z * q.y);
  }
  float slope = max(length(grad) * uScale, 1e-8);
  vec3 color = mix(uColor, uCursorColor, mass > 0.0 ? clamp(tint / mass, 0.0, 1.0) : 0.0);
  float alpha;
  if (uVariant == 0) {
    alpha = field > 3.0 * uThreshold ? 1.0 : clamp((field - uThreshold) / slope + 0.5, 0.0, 1.0);
  } else if (uVariant == 1) {
    alpha = field > 3.0 * uThreshold ? 0.0 : clamp(0.5 * uLine + 0.5 - abs((field - uThreshold) / slope), 0.0, 1.0);
  } else {
    float rho = pow(max(field / uThreshold, 1e-6), -0.5 / uGamma);
    float rate = rho * slope / (2.0 * uGamma * max(field, 1e-8));
    float u = (rho - 1.0) / uSpacing;
    float ring = floor(u + 0.5);
    float gap = (u - ring) * uSpacing / max(rate, 1e-8);
    alpha = clamp(0.5 * uLine + 0.5 - abs(gap), 0.0, 1.0);
    alpha *= ring < -0.5 || ring > uRings + 0.5 ? 0.0 : 1.0 - ring / (uRings + 1.0);
    if (ring > 0.5) alpha *= smoothstep(uLine * 6.0, uLine * 12.0, uSpacing / max(rate, 1e-8));
  }
  outColor = vec4(color * alpha, uOpaque > 0.5 ? 1.0 : alpha);
}
`,Vt=(i,a,p)=>{let d=i.createShader(a);return i.shaderSource(d,p),i.compileShader(d),d},Ot=i=>{let a=pe(i+1),p=de(a);return{start:a[0]*Math.PI*2,rate:.1*Math.PI+a[1]*.3*Math.PI,reach:5+a[1]*5,toggle:Math.floor(p[0]*2),radius:.5+p[2]*1.5,lane:p[1]*2-1,rise:.55+a[2]*.7,sway:p[0]*Math.PI*2,delay:.1+E(a[2]*7.31+p[1]*3.17)*.55,x:0,y:0,vx:0,vy:0,fx:0,fy:0,ax:0,ay:0,avx:0,avy:0,a:0,b:0,va:0,vb:0}},we=({className:i="",color:a="#ffffff",cursorBallColor:p="#ffffff",speed:d=.3,enableMouseInteraction:J=!0,hoverSmoothness:_t=.1,animationSize:Dt=30,ballCount:Nt=15,clumpFactor:kt=1,cursorBallSize:Ut=3,enableTransparency:Wt=!1,variant:Ht="solid",motion:$t="orbit",gooeyness:Xt=.5,stickiness:Yt=.5,stretch:Kt=.5,wobble:jt=.5,lineWidth:Jt=1.5,rings:Qt=4,clickBurst:Zt=!0,intro:te=!0,paused:ee=!1,dpr:oe,style:ne})=>{let at=(0,A.useRef)(null),rt=(0,A.useRef)(null),it={color:a,cursorBallColor:p,speed:d,enableMouseInteraction:J,hoverSmoothness:_t,animationSize:Dt,ballCount:Nt,clumpFactor:kt,cursorBallSize:Ut,enableTransparency:Wt,variant:Ht,motion:$t,gooeyness:Xt,stickiness:Yt,stretch:Kt,wobble:jt,lineWidth:Jt,rings:Qt,clickBurst:Zt,paused:ee,dpr:oe},q=(0,A.useRef)(it);q.current=it;let ae=(0,A.useRef)(te),Q=(0,A.useRef)(null);return(0,A.useEffect)(()=>{let G=at.current,b=rt.current;if(!G||!b)return;let r=b.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!0});if(!r)return;let C=r.createProgram();if(r.attachShader(C,Vt(r,r.VERTEX_SHADER,xe)),r.attachShader(C,Vt(r,r.FRAGMENT_SHADER,ye)),r.bindAttribLocation(C,0,"position"),r.linkProgram(C),!r.getProgramParameter(C,r.LINK_STATUS))return;r.useProgram(C);let st=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,st),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0);let v=t=>r.getUniformLocation(C,t),g={resolution:v("uResolution"),scale:v("uScale"),balls:v("uBalls"),shapes:v("uShapes"),count:v("uCount"),gamma:v("uGamma"),threshold:v("uThreshold"),color:v("uColor"),cursorColor:v("uCursorColor"),variant:v("uVariant"),line:v("uLine"),spacing:v("uSpacing"),rings:v("uRings"),opaque:v("uOpaque")},S=new Float32Array(k*4),Z=new Float32Array(k*4),I=Array.from({length:O},(t,e)=>Ot(e)),re=Ot(O+7),l={x:0,y:0,vx:0,vy:0,a:0,b:0,va:0,vb:0,pulse:0,pulseVelocity:0,ready:!1},L={x:0,y:0,inside:!1},ie=window.matchMedia("(prefers-reduced-motion: reduce)").matches,w={width:1,height:1,ratio:1},tt=new Map,ct=t=>(tt.has(t)||tt.set(t,ve(t)),tt.get(t)),B=0,U=0,lt=ae.current&&!ie?0:-1,W=!0,_=0,H=0,D=!0,ut=()=>{let t=G.getBoundingClientRect(),e=q.current,n=Math.max(.5,Math.min(e.dpr??window.devicePixelRatio??1,2));w.width=Math.max(1,t.width),w.height=Math.max(1,t.height),w.ratio=n,b.width=Math.max(1,Math.round(w.width*n)),b.height=Math.max(1,Math.round(w.height*n)),r.viewport(0,0,b.width,b.height),D=!0},ft=(t,e)=>{let n=G.getBoundingClientRect(),s=q.current.animationSize/Math.max(1,n.height);return{x:(t-n.left-n.width/2)*s,y:(n.top+n.height/2-e)*s,inside:t>=n.left&&t<=n.right&&e>=n.top&&e<=n.bottom}},ht=()=>{if(lt<0)return{size:1,time:1/0};let t=U-lt;return{size:ge(t/.5),time:t}},se=(t,e)=>e.time===1/0?1:Pt((e.time-t.delay)/1.15),mt=(t,e,n)=>{let s=e.animationSize*w.width/w.height/2,m=e.animationSize/2,h=Math.min(1.25,e.clumpFactor);if(e.motion==="lava"){let o=Math.sin(B*t.rise*1.6+t.start),u=t.lane*s*.8*h+Math.sin(B*.5*t.rise+t.sway)*s*.06,y=Math.sign(o)*Math.pow(Math.abs(o),.55)*m*.9;return[u*n,y*n]}if(e.motion==="drift"){let o=Math.sin(B*t.rise*.9+t.start)*s*.84*h,u=Math.sin(B*t.rate*1.3+t.sway)*m*.78*h;return[o*n,u*n]}let f=B*t.rate,c=t.start+f;return[Math.cos(c)*t.reach*e.clumpFactor*n,Math.sin(c+f*t.toggle)*t.reach*e.clumpFactor*n]},pt=(t,e,n)=>{let s=Math.hypot(t.vx,t.vy),m=.6*n.stretch*Math.tanh(s/14),h=0,f=0;s>1e-4&&(h=m*(t.vx*t.vx-t.vy*t.vy)/(s*s),f=m*2*t.vx*t.vy/(s*s));let c=13,o=.85-.68*x(n.wobble,0,1);t.va+=(c*c*(h-t.a)-2*o*c*t.va)*e,t.vb+=(c*c*(f-t.b)-2*o*c*t.vb)*e,t.a+=t.va*e,t.b+=t.vb*e},dt=t=>{let e=x(t.gooeyness,0,1),n=e<.5?1+(.5-e)*1.2:1-(e-.5)*.5;return{gamma:n,threshold:Math.pow(1.3,n),reach:Math.pow(2,.5/n)}},ce=(t,e,n,s)=>{let{reach:m}=dt(e),h=36*x(e.stickiness,0,1),f=e.cursorBallSize*et*s.size*(1+l.pulse);B+=t*e.speed;for(let c=0;c<n;c++){let o=I[c],[u,y]=mt(o,e,se(o,s));o.avx=x((u-o.ax)/t,-40,40),o.avy=x((y-o.ay)/t,-40,40),o.ax=u,o.ay=y,o.fx=20*(u-o.x)-5.4*(o.vx-o.avx),o.fy=20*(y-o.y)-5.4*(o.vy-o.avy)}for(let c=0;c<n;c++){let o=I[c],u=o.radius*et*s.size;for(let T=c+1;T<n;T++){let M=I[T],z=M.radius*et*s.size,At=M.x-o.x,Ct=M.y-o.y,P=Math.hypot(At,Ct)||1e-4,Lt=(u+z)*m;if(P>=Lt)continue;let X=(u+z)*.62,V;if(P<X)V=-60*(X-P);else{let It=(P-X)/(Lt-X);V=h*Math.min(u,z)*K(0,.6,It)*(1-K(.82,1,It))}let Tt=At/P,zt=Ct/P,Et=u*u+.05,qt=z*z+.05;o.fx+=Tt*V/Et,o.fy+=zt*V/Et,M.fx-=Tt*V/qt,M.fy-=zt*V/qt}let y=l.x-o.x,R=l.y-o.y,F=Math.hypot(y,R)||1e-4,Rt=(u+f)*m;if(F<Rt){let T=(u+f)*.62,M;if(F<T)M=-140*(T-F);else{let z=(F-T)/(Rt-T);M=h*.6*u*K(0,.6,z)*(1-K(.82,1,z))}o.fx+=y/F*M/(u*u+.05),o.fy+=R/F*M/(u*u+.05)}}for(let c=0;c<n;c++){let o=I[c];o.vx+=o.fx*t,o.vy+=o.fy*t,o.x+=o.vx*t,o.y+=o.vy*t,pt(o,t,e),Number.isFinite(o.x+o.y+o.vx+o.vy+o.a+o.b+o.va+o.vb)||Object.assign(o,{x:o.ax,y:o.ay,vx:0,vy:0,a:0,b:0,va:0,vb:0})}},le=(t,e,n)=>{let s,m;if(L.inside&&e.enableMouseInteraction)s=L.x,m=L.y;else{let u=n.time===1/0?1:Pt((n.time-.75)/1.3);if(e.motion==="lava"||e.motion==="drift")[s,m]=mt(re,e,u);else{let y=e.animationSize*w.width/w.height/2,R=e.animationSize/2;s=Math.cos(U*e.speed)*y*.3*u,m=Math.sin(U*e.speed)*R*.3*u}}l.ready||(l.x=s,l.y=m,l.ready=!0);let h=1-Math.pow(1-x(e.hoverSmoothness,.001,1),t*60),f=l.x+(s-l.x)*h,c=l.y+(m-l.y)*h,o=1-Math.exp(-t/.05);l.vx+=((f-l.x)/Math.max(t,1e-4)-l.vx)*o,l.vy+=((c-l.y)/Math.max(t,1e-4)-l.vy)*o,l.x=f,l.y=c},ue=(t,e)=>{let n=q.current,s=x(Math.round(n.ballCount),0,O),m=n.animationSize*.45;for(let h=0;h<s;h++){let f=I[h],c=f.x-t,o=f.y-e,u=Math.hypot(c,o)||1e-4;if(u>m)continue;let R=72*Math.pow(1-u/m,1.2);f.vx+=c/u*R-o/u*R*.3,f.vy+=o/u*R+c/u*R*.3}l.pulseVelocity+=9},vt=(t,e,n)=>{let s=Math.hypot(t.a,t.b),m=Math.cosh(s),h=s>1e-6?Math.sinh(s)/s:1;e[n]=m-h*t.a,e[n+1]=-h*t.b,e[n+2]=m+h*t.a,e[n+3]=0},fe=()=>{let t=q.current,e=x(Math.round(t.ballCount),0,O),n=ht(),{gamma:s,threshold:m}=dt(t);for(let f=0;f<e;f++){let c=I[f],o=c.radius*n.size;S[f*4]=c.x,S[f*4+1]=c.y,S[f*4+2]=o*o,S[f*4+3]=0,vt(c,Z,f*4)}let h=t.cursorBallSize*n.size*(1+l.pulse);S[e*4]=l.x,S[e*4+1]=l.y,S[e*4+2]=h*h,S[e*4+3]=1,vt(l,Z,e*4),r.uniform2f(g.resolution,b.width,b.height),r.uniform1f(g.scale,t.animationSize/b.height),r.uniform4fv(g.balls,S),r.uniform4fv(g.shapes,Z),r.uniform1i(g.count,e+1),r.uniform1f(g.gamma,s),r.uniform1f(g.threshold,m),r.uniform3fv(g.color,ct(t.color)),r.uniform3fv(g.cursorColor,ct(t.cursorBallColor)),r.uniform1i(g.variant,me[t.variant]??0),r.uniform1f(g.line,Math.max(.25,t.lineWidth)*w.ratio),r.uniform1f(g.spacing,.28),r.uniform1f(g.rings,x(Math.round(t.rings),0,12)),r.uniform1f(g.opaque,t.enableTransparency?0:1),r.clearColor(0,0,0,t.enableTransparency?0:1),r.clear(r.COLOR_BUFFER_BIT),r.drawArrays(r.TRIANGLES,0,3),D=!1},gt=t=>{if(_=0,!W)return;let e=Math.min(.05,H?(t-H)/1e3:1/60);H=t;let n=q.current;if(!n.paused&&e>1e-4){U+=e;let s=x(Math.round(n.ballCount),0,O),m=ht();le(e,n,m);let h=Math.max(1,Math.ceil(e/(1/240)));for(let f=0;f<h;f++)ce(e/h,n,s,m);pt(l,e,n),l.pulseVelocity+=(-170*l.pulse-2*.42*13*l.pulseVelocity)*e,l.pulse=Math.max(-.4,l.pulse+l.pulseVelocity*e),D=!0}D&&fe(),_=requestAnimationFrame(gt)},xt=()=>{_||!W||(H=0,_=requestAnimationFrame(gt))},yt=t=>{let e=ft(t.clientX,t.clientY);L.x=e.x,L.y=e.y,L.inside=e.inside},wt=t=>{t.relatedTarget||(L.inside=!1)},$=t=>{t.pointerType!=="mouse"&&(L.inside=!1)},Mt=t=>{let e=q.current;if(!e.clickBurst||!e.enableMouseInteraction||e.paused||t.button!==0)return;let n=ft(t.clientX,t.clientY);n.inside&&ue(n.x,n.y)},bt=new ResizeObserver(ut);bt.observe(G);let St=new IntersectionObserver(t=>{W=t.some(e=>e.isIntersecting),W&&xt()});return St.observe(G),window.addEventListener("pointermove",yt,{passive:!0}),window.addEventListener("pointerdown",Mt,{passive:!0}),window.addEventListener("pointerout",wt),window.addEventListener("pointerup",$),window.addEventListener("pointercancel",$),ut(),xt(),Q.current={refresh:()=>{D=!0}},()=>{cancelAnimationFrame(_),bt.disconnect(),St.disconnect(),window.removeEventListener("pointermove",yt),window.removeEventListener("pointerdown",Mt),window.removeEventListener("pointerout",wt),window.removeEventListener("pointerup",$),window.removeEventListener("pointercancel",$),r.deleteBuffer(st),r.deleteProgram(C),Q.current=null}},[]),(0,A.useEffect)(()=>{Q.current?.refresh()}),(0,ot.jsx)("div",{ref:at,className:`relative h-full w-full ${i}`.trim(),style:ne,children:(0,ot.jsx)("canvas",{ref:rt,className:"block h-full w-full"})})},Gt=we;var nt=N(Y(),1),Me=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],j=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Te=Me.map((i,a)=>({id:a+1,image:i,src:i,img:i,url:i,title:j[a],text:j[a],label:j[a],alt:j[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function be({big:i}){return(0,nt.jsx)(Ft,{big:i,dark:!0,center:!0,zoom:1,drive:!1,children:(0,nt.jsx)(Gt,{})})}var ze=Bt(be);export{ze as default};
