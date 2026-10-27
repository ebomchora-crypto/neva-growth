import{c as te,i as Nt,j as ve,l as at,m as nt}from"./chunks/chunk-6IYH4WPJ.js";var D=te(Nt(),1),ke=te(ve(),1),Yt={circle:0,square:1,ring:2,sparkle:3},Ht={parallax:0,repel:1,attract:2},$t={none:0,up:1,down:2,forward:3},Gt=2e4,rt=900,it=9e3,oe=4,pe=10,we=1/Math.tan(7.5*Math.PI/180),lt=.1,N=100,Xt=1.8,Le=1.5,ut=520,dt=46,qt=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aPosition;
layout(location = 2) in vec4 aRandom;
layout(location = 3) in vec3 aColor;
uniform mat3 uRotation;
uniform vec3 uOffset;
uniform float uSpread;
uniform float uTime;
uniform float uCamera;
uniform float uAspect;
uniform vec2 uView;
uniform float uRatio;
uniform float uSize;
uniform float uRandomness;
uniform float uBlur;
uniform float uFocus;
uniform float uGlow;
uniform float uTwinkle;
uniform int uShape;
uniform int uDrift;
uniform float uTravel;
uniform vec4 uPointer;
uniform int uEffect;
uniform float uStrength;
uniform vec4 uBursts[${oe}];
uniform int uBurstCount;
uniform float uReveal;
out vec2 vLocal;
out float vRadius;
out float vBlur;
out float vAlpha;
out float vHalo;
out float vSeed;
out vec3 vColor;

vec3 bob(vec4 r, float t) {
  return vec3(
    sin(t * r.z + 6.28 * r.w) * mix(0.1, 1.5, r.x),
    sin(t * r.y + 6.28 * r.x) * mix(0.1, 1.5, r.w),
    sin(t * r.w + 6.28 * r.y) * mix(0.1, 1.5, r.z)
  );
}

void main() {
  vec3 pos = aPosition * uSpread;
  pos.z *= ${pe.toFixed(1)};
  vec3 wobble = bob(aRandom, uTime);
  vec3 world = uRotation * pos + uOffset + wobble;
  float edge = 1.0;
  if (uDrift == 1 || uDrift == 2) {
    float span = uSpread * 2.0 + 3.0;
    float k = mod(aRandom.w * span + uOffset.y + wobble.y + (uDrift == 1 ? uTravel : -uTravel), span);
    world.y = k - span * 0.5;
    edge = smoothstep(0.0, span * 0.12, k) * smoothstep(span, span * 0.88, k);
  } else if (uDrift == 3) {
    float span = uSpread * ${pe.toFixed(1)} * 2.0 + 3.0;
    float k = mod(aRandom.y * span + uOffset.z + wobble.z + uTravel, span);
    world.z = k - span * 0.5;
    edge = smoothstep(0.0, span * 0.1, k);
  }
  vec3 view = world - vec3(0.0, 0.0, uCamera);
  float dist = length(view);
  float ahead = -view.z;
  if (ahead < ${lt.toFixed(2)} || ahead > ${N.toFixed(1)}) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  edge *= smoothstep(1.0, 4.0, ahead);
  vec2 ndc = vec2(view.x * ${we.toFixed(6)} / uAspect, view.y * ${we.toFixed(6)}) / ahead;
  vec2 screen = (ndc * 0.5 + 0.5) * uView;

  vec2 shift = vec2(0.0);
  float flash = 0.0;
  if (uEffect != 0 && uPointer.z > 0.001) {
    vec2 delta = screen - uPointer.xy;
    float reach = length(delta);
    float falloff = exp(-dot(delta, delta) / (uPointer.w * uPointer.w));
    vec2 away = reach > 0.001 ? delta / reach : vec2(0.0);
    shift += (uEffect == 1 ? away * uPointer.w * 0.5 : -delta * 0.6) * falloff * uStrength * uPointer.z;
  }
  for (int i = 0; i < ${oe}; i++) {
    if (i >= uBurstCount) break;
    vec4 burst = uBursts[i];
    vec2 delta = screen - burst.xy;
    float reach = length(delta);
    float wave = exp(-pow((reach - burst.z * ${ut.toFixed(1)}) / ${dt.toFixed(1)}, 2.0));
    vec2 away = reach > 0.001 ? delta / reach : vec2(0.0);
    float fade = (1.0 - burst.z) * (1.0 - burst.z) * burst.w;
    shift += away * wave * fade * 56.0 * smoothstep(0.0, 30.0, reach);
    flash += wave * fade;
  }
  screen += shift;

  float diameter = (uRandomness <= 0.0 ? uSize : uSize * (1.0 + uRandomness * (aRandom.x - 0.5)) / dist) * (1.0 + min(flash, 1.0) * 0.6);
  float device = diameter * uRatio;
  float radius = max(diameter, 1.0 / uRatio) * 0.5;
  float coverage = min(1.0, device * device);
  float blur = uBlur * max(uFocus - dist, 0.0) / max(dist, 1.0);
  float halo = uGlow > 0.0 ? radius * 2.5 + 2.0 : 0.0;
  float extent = radius * (uShape == 3 ? 1.6 : 1.0) + blur + halo + 1.5;

  float twinkle = 1.0 - uTwinkle * 0.6 * (0.5 + 0.5 * sin(uTime * (6.0 + aRandom.y * 14.0) + aRandom.w * 40.0));
  float far = smoothstep(${N.toFixed(1)}, ${(N*.9).toFixed(1)}, ahead);
  float focus = radius / (radius + blur);
  float reveal = clamp(uReveal * 1.6 - aRandom.z * 0.6, 0.0, 1.0);

  vLocal = aCorner * extent;
  vRadius = radius;
  vBlur = blur;
  vHalo = halo;
  vSeed = aRandom.y;
  vAlpha = min(1.0, coverage * twinkle * (1.0 + flash * 1.4)) * far * edge * max(focus, 0.35) * reveal * reveal;
  vColor = aColor;
  gl_Position = vec4((screen + aCorner * extent) / uView * 2.0 - 1.0, 0.0, 1.0);
}`,Wt=`#version 300 es
precision highp float;
precision highp int;
uniform int uShape;
uniform float uGlow;
uniform float uRatio;
uniform float uTime;
uniform float uSoft;
uniform float uShimmer;
uniform float uOpacity;
in vec2 vLocal;
in float vRadius;
in float vBlur;
in float vAlpha;
in float vHalo;
in float vSeed;
in vec3 vColor;
out vec4 outColor;

float ray(vec2 q, float aa) {
  float width = 0.14 * max(0.0, 1.0 - q.x);
  return (1.0 - smoothstep(width - aa, width + aa, q.y)) * step(q.x, 1.0);
}

void main() {
  float soft = vBlur + 0.7 / uRatio + vRadius * uSoft;
  float d = length(vLocal);
  float shape;
  if (uShape == 1) {
    float box = max(abs(vLocal.x), abs(vLocal.y));
    shape = 1.0 - smoothstep(vRadius * 0.86 - soft, vRadius * 0.86 + soft, box);
  } else if (uShape == 2) {
    float edge = max(vRadius * 0.22, 0.6 / uRatio);
    shape = 1.0 - smoothstep(edge - soft, edge + soft, abs(d - vRadius * 0.8));
  } else if (uShape == 3) {
    float reach = vRadius * 1.6;
    vec2 q = abs(vLocal) / max(reach, 0.0001);
    float aa = soft / max(reach, 0.0001);
    shape = max(max(ray(q, aa), ray(q.yx, aa)), 1.0 - smoothstep(vRadius * 0.32 - soft, vRadius * 0.32 + soft, d));
  } else {
    shape = 1.0 - smoothstep(vRadius - soft, vRadius + soft, d);
  }
  float halo = vHalo > 0.0 ? exp(-d / (vHalo * 0.35)) * uGlow * 0.4 : 0.0;
  float alpha = clamp(shape + halo * (1.0 - shape), 0.0, 1.0) * vAlpha * uOpacity * (1.0 - uSoft);
  if (alpha < 0.002) discard;
  vec2 uv = vLocal / max(vRadius * 2.0, 0.0001) + 0.5;
  vec3 color = clamp(vColor + uShimmer * 0.2 * sin(uv.yxx + uTime + vSeed * 6.28), 0.0, 1.0);
  outColor = vec4(color * alpha, alpha);
}`,jt=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aEnds;
layout(location = 2) in vec4 aTint;
uniform vec2 uView;
uniform float uRatio;
uniform float uWidth;
out float vAcross;
out float vHalf;
out vec4 vTint;

void main() {
  vec2 a = aEnds.xy;
  vec2 b = aEnds.zw;
  vec2 along = b - a;
  float span = max(length(along), 0.0001);
  vec2 normal = vec2(-along.y, along.x) / span;
  float reach = uWidth * 0.5 + 1.0 / uRatio;
  vec2 point = mix(a, b, aCorner.x * 0.5 + 0.5) + normal * aCorner.y * reach;
  vAcross = aCorner.y * reach;
  vHalf = uWidth * 0.5;
  vTint = aTint;
  gl_Position = vec4(point / uView * 2.0 - 1.0, 0.0, 1.0);
}`,Kt=`#version 300 es
precision highp float;
uniform float uRatio;
uniform float uOpacity;
in float vAcross;
in float vHalf;
in vec4 vTint;
out vec4 outColor;

void main() {
  float edge = 0.6 / uRatio;
  float cover = 1.0 - smoothstep(vHalf - edge, vHalf + edge, abs(vAcross));
  float alpha = cover * vTint.a * uOpacity;
  outColor = vec4(vTint.rgb * alpha, alpha);
}`,S=(r,w,y)=>Math.min(y,Math.max(w,r)),st=(r,w,y)=>{let F=r.createShader(w);return F?(r.shaderSource(F,y),r.compileShader(F),r.getShaderParameter(F,r.COMPILE_STATUS)?F:(r.deleteShader(F),null)):null},ct=(r,w,y)=>{let F=st(r,r.VERTEX_SHADER,w),j=st(r,r.FRAGMENT_SHADER,y),T=r.createProgram();if(!F||!j||!T)return null;if(r.attachShader(T,F),r.attachShader(T,j),r.linkProgram(T),r.deleteShader(F),r.deleteShader(j),!r.getProgramParameter(T,r.LINK_STATUS))return r.deleteProgram(T),null;let ae={},ye=r.getProgramParameter(T,r.ACTIVE_UNIFORMS);for(let K=0;K<ye;K++){let Z=r.getActiveUniform(T,K);Z&&(ae[Z.name.replace("[0]","")]=r.getUniformLocation(T,Z.name))}return{program:T,uniforms:ae}},Zt=r=>{let w=r>>>0;return()=>{w=w+1831565813>>>0;let y=w;return y=Math.imul(y^y>>>15,y|1),y^=y+Math.imul(y^y>>>7,y|61),((y^y>>>14)>>>0)/4294967296}},Jt=r=>1-Math.pow(1-S(r,0,1),3),ft=(r,w)=>(r%w+w)%w,Qt=({particleCount:r=200,particleSpread:w=10,speed:y=.1,particleColors:F=["#ffffff"],moveParticlesOnHover:j=!0,particleHoverFactor:T=1,alphaParticles:ae=!1,particleBaseSize:ye=100,sizeRandomness:K=1,cameraDistance:Z=20,disableRotation:mt=!1,pixelRatio:vt,shape:pt="circle",glow:wt=.5,twinkle:xt=.3,depthOfField:yt=0,connections:Rt=!1,connectionDistance:bt=110,hoverEffect:At="parallax",hoverRadius:gt=140,clickBurst:Ft=!0,drift:Mt="none",driftSpeed:Et=1,variation:St=0,intro:Tt=!0,opacity:Bt=1,lightMode:_t=!1,paused:Ct=!1,className:Pt="",style:Lt})=>{let Ie=(0,D.useRef)(null),Oe=(0,D.useRef)(null),Re=(0,D.useRef)(null),ze=(Array.isArray(F)?F:[F]).filter(Boolean).map(String),Ve={count:S(Math.round(r),1,Gt),spread:Math.max(.1,w),speed:y,colors:ze.length?ze:["#ffffff"],mouse:j,hoverFactor:Math.max(0,T),soft:ae,size:Math.max(0,ye),randomness:Math.max(0,K),camera:Math.max(1,Z),rotate:!mt,dpr:vt,shape:Yt[pt]??0,glow:Math.max(0,wt),twinkle:S(xt,0,1),depthOfField:Math.max(0,yt),connections:Rt,connectionDistance:Math.max(10,bt),hoverEffect:Ht[At]??0,hoverRadius:Math.max(20,gt),clickBurst:Ft,drift:$t[Mt]??0,driftSpeed:Et,variation:Math.max(0,Math.round(St)),intro:Tt,opacity:S(Bt,0,1),lightMode:_t,paused:Ct},k=(0,D.useRef)(Ve);return k.current=Ve,(0,D.useEffect)(()=>{let Y=Ie.current,I=Oe.current,e=I?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!Y||!I||!e)return;let ne=ct(e,qt,Wt),O=ct(e,jt,Kt);if(!ne||!O)return;let re=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,re),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);let be=e.createBuffer(),Ae=e.createBuffer(),ge=e.createBuffer(),Fe=e.createVertexArray();e.bindVertexArray(Fe),e.bindBuffer(e.ARRAY_BUFFER,re),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Me=(t,o,n)=>{e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(o),e.vertexAttribPointer(o,n,e.FLOAT,!1,0,0),e.vertexAttribDivisor(o,1)};Me(be,1,3),Me(Ae,2,4),Me(ge,3,3);let Ee=e.createBuffer(),P=new Float32Array(it*8),Se=e.createVertexArray();e.bindVertexArray(Se),e.bindBuffer(e.ARRAY_BUFFER,re),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,Ee),e.bufferData(e.ARRAY_BUFFER,P.byteLength,e.DYNAMIC_DRAW),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,32,0),e.vertexAttribDivisor(1,1),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,32,16),e.vertexAttribDivisor(2,1),e.bindVertexArray(null);let H=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),J=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,Te=new Map,Ue=t=>{if(Te.has(t))return Te.get(t);let o=[1,1,1];if(H){H.clearRect(0,0,1,1),H.fillStyle="#ffffff",H.fillStyle=t,H.fillRect(0,0,1,1);let[n,i,f]=H.getImageData(0,0,1,1).data;o=[n/255,i/255,f/255]}return Te.set(t,o),o},kt=t=>{let o=t.map(f=>Math.pow(f,2.2)),n=.2126*o[0]+.7152*o[1]+.0722*o[2],i=Math.min(1,.06/Math.max(n,1e-4));return o.map(f=>Math.pow(f*i,1/2.2))},R={width:1,height:1,ratio:1},s={x:0,y:0,sx:0,sy:0,nx:0,ny:0,inside:!1,active:0},u={clock:0,spin:0,travel:0,offsetX:0,offsetY:0,reveal:k.current.intro&&!J?0:1},B=[],Ne=new Float32Array(oe*4),x={key:"",count:0,positions:new Float32Array(0),randoms:new Float32Array(0),colors:new Float32Array(0)},d={x:new Float32Array(0),y:new Float32Array(0),ahead:new Float32Array(0),alpha:new Float32Array(0)},$=0,G=0,ie=!0,Dt=t=>{let o=`${t.count}|${t.variation}|${t.colors.join(",")}|${t.lightMode?1:0}`;if(o===x.key)return;x.key=o;let n=Zt(t.variation*7919+1),i=t.count,f=new Float32Array(i*3),a=new Float32Array(i*4),h=new Float32Array(i*3),l=t.colors.map(m=>t.lightMode?kt(Ue(m)):Ue(m));for(let m=0;m<i;m++){let v,M,p,b;do v=n()*2-1,M=n()*2-1,p=n()*2-1,b=v*v+M*M+p*p;while(b>1||b===0);let _=Math.cbrt(n());f.set([v*_,M*_,p*_],m*3),a.set([n(),n(),n(),n()],m*4),h.set(l[Math.floor(n()*l.length)],m*3)}x.count=i,x.positions=f,x.randoms=a,x.colors=h;let c=Math.min(i,rt);d.x=new Float32Array(c),d.y=new Float32Array(c),d.ahead=new Float32Array(c),d.alpha=new Float32Array(c),e.bindBuffer(e.ARRAY_BUFFER,be),e.bufferData(e.ARRAY_BUFFER,f,e.STATIC_DRAW),e.bindBuffer(e.ARRAY_BUFFER,Ae),e.bufferData(e.ARRAY_BUFFER,a,e.STATIC_DRAW),e.bindBuffer(e.ARRAY_BUFFER,ge),e.bufferData(e.ARRAY_BUFFER,h,e.STATIC_DRAW)},It=t=>{let o=u.clock*1e3,n=t.rotate?Math.sin(o*2e-4)*.1:0,i=t.rotate?Math.cos(o*5e-4)*.15:0,f=t.rotate?u.spin:0,[a,h,l,c,m,v]=[Math.sin(n),Math.cos(n),Math.sin(i),Math.cos(i),Math.sin(f),Math.cos(f)];return[c*v+l*a*m,h*m,-l*v+c*a*m,-c*m+l*a*v,h*v,l*m+c*a*v,l*h,-a,c*h]},Ye=()=>[u.offsetX,u.offsetY,-(1-Jt(u.reveal))*70],Ot=(t,o)=>{let n=Math.min(x.count,rt),[i,f,a]=Ye(),h=R.width/R.height,l=u.clock,c=t.hoverRadius,m=t.hoverEffect!==0?s.active:0,v=t.spread*2+3,M=t.spread*pe*2+3;for(let p=0;p<n;p++){let b=x.positions[p*3]*t.spread,_=x.positions[p*3+1]*t.spread,E=x.positions[p*3+2]*t.spread*pe,Q=x.randoms[p*4],q=x.randoms[p*4+1],W=x.randoms[p*4+2],z=x.randoms[p*4+3],fe=Math.sin(l*W+6.28*z)*(.1+1.4*Q),C=Math.sin(l*q+6.28*Q)*(.1+1.4*z),Je=Math.sin(l*z+6.28*q)*(.1+1.4*W),Vt=o[0]*b+o[3]*_+o[6]*E+i+fe,Qe=o[1]*b+o[4]*_+o[7]*E+f+C,et=o[2]*b+o[5]*_+o[8]*E+a+Je,le=1;if(t.drift===1||t.drift===2){let g=ft(z*v+f+C+(t.drift===1?u.travel:-u.travel),v);Qe=g-v/2;let A=S(g/(v*.12),0,1),L=S((v-g)/(v*.12),0,1);le=A*A*(3-2*A)*L*L*(3-2*L)}else if(t.drift===3){let g=ft(q*M+a+Je+u.travel,M);et=g-M/2;let A=S(g/(M*.1),0,1);le=A*A*(3-2*A)}let V=t.camera-et;if(V<lt||V>N){d.alpha[p]=0;continue}let _e=S((V-1)/3,0,1);le*=_e*_e*(3-2*_e);let ue=Vt*we/h/V*.5*R.width+R.width/2,de=Qe*we/V*.5*R.height+R.height/2,he=0,me=0;if(m>.001){let g=ue-s.sx,A=de-s.sy,L=Math.hypot(g,A),U=Math.exp(-(g*g+A*A)/(c*c))*t.hoverFactor*m;t.hoverEffect===1&&L>.001?(he+=g/L*c*.5*U,me+=A/L*c*.5*U):t.hoverEffect===2&&(he-=g*.6*U,me-=A*.6*U)}for(let g of B){let A=g.age/Le,L=ue-g.x,U=de-g.y,ee=Math.hypot(L,U);if(ee<.001)continue;let Ut=Math.exp(-Math.pow((ee-A*ut)/dt,2)),Pe=S(ee/30,0,1),ot=Ut*(1-A)*(1-A)*56*Pe*Pe*(3-2*Pe);he+=L/ee*ot,me+=U/ee*ot}ue+=he,de+=me;let Ce=S((N-V)/(N-N*.9),0,1),tt=S(u.reveal*1.6-W*.6,0,1);d.x[p]=ue,d.y[p]=de,d.ahead[p]=V,d.alpha[p]=Ce*Ce*(3-2*Ce)*le*tt*tt}return n},zt=(t,o)=>{let n=Ot(t,o),i=t.connectionDistance,f=Math.max(1,Math.ceil(R.width/i)+2),a=new Map;for(let c=0;c<n;c++){if(d.alpha[c]<.02)continue;let m=(Math.floor(d.y[c]/i)+1)*f+Math.floor(d.x[c]/i)+1,v=a.get(m);v?v.push(c):a.set(m,[c])}let h=0,l=i*i;for(let[c,m]of a)for(let v of[0,1,f-1,f,f+1]){let M=v===0?m:a.get(c+v);if(M)for(let p=0;p<m.length;p++){let b=m[p];for(let _=v===0?p+1:0;_<M.length;_++){let E=M[_],Q=d.x[b]-d.x[E],q=d.y[b]-d.y[E],W=Q*Q+q*q;if(W>l)continue;let z=S(1-Math.abs(d.ahead[b]-d.ahead[E])/18,0,1);if(z<=0)continue;if(h>=it)return h;let fe=1-Math.sqrt(W)/i,C=h*8;P[C]=d.x[b],P[C+1]=d.y[b],P[C+2]=d.x[E],P[C+3]=d.y[E],P[C+4]=(x.colors[b*3]+x.colors[E*3])/2,P[C+5]=(x.colors[b*3+1]+x.colors[E*3+1])/2,P[C+6]=(x.colors[b*3+2]+x.colors[E*3+2])/2,P[C+7]=fe*fe*z*.7*Math.min(d.alpha[b],d.alpha[E]),h++}}}return h},se=()=>{let t=k.current;Dt(t);let o=It(t),[n,i,f]=Ye();if(e.viewport(0,0,I.width,I.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),t.connections){let l=zt(t,o);l&&(e.useProgram(O.program),e.bindVertexArray(Se),e.bindBuffer(e.ARRAY_BUFFER,Ee),e.bufferSubData(e.ARRAY_BUFFER,0,P.subarray(0,l*8)),e.uniform2f(O.uniforms.uView,R.width,R.height),e.uniform1f(O.uniforms.uRatio,R.ratio),e.uniform1f(O.uniforms.uWidth,1),e.uniform1f(O.uniforms.uOpacity,t.opacity),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,l))}let a=ne.uniforms,h=0;for(let l=B.length-1;l>=0&&h<oe;l--)Ne.set([B[l].x,B[l].y,B[l].age/Le,1],h*4),h++;e.useProgram(ne.program),e.bindVertexArray(Fe),e.uniformMatrix3fv(a.uRotation,!1,o),e.uniform3f(a.uOffset,n,i,f),e.uniform1f(a.uSpread,t.spread),e.uniform1f(a.uTime,u.clock),e.uniform1f(a.uCamera,t.camera),e.uniform1f(a.uAspect,R.width/R.height),e.uniform2f(a.uView,R.width,R.height),e.uniform1f(a.uRatio,R.ratio),e.uniform1f(a.uSize,t.size),e.uniform1f(a.uRandomness,t.randomness),e.uniform1f(a.uBlur,t.depthOfField*14),e.uniform1f(a.uFocus,t.camera+14),e.uniform1f(a.uGlow,t.lightMode?t.glow*.3:t.glow),e.uniform1f(a.uTwinkle,t.twinkle),e.uniform1i(a.uShape,t.shape),e.uniform1i(a.uDrift,t.drift),e.uniform1f(a.uTravel,u.travel),e.uniform4f(a.uPointer,s.sx,s.sy,s.active,t.hoverRadius),e.uniform1i(a.uEffect,t.hoverEffect),e.uniform1f(a.uStrength,t.hoverFactor),e.uniform4fv(a.uBursts,Ne),e.uniform1i(a.uBurstCount,h),e.uniform1f(a.uReveal,u.reveal),e.uniform1f(a.uSoft,t.soft?.2:0),e.uniform1f(a.uShimmer,t.lightMode?0:1),e.uniform1f(a.uOpacity,t.opacity),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,x.count),e.bindVertexArray(null)},He=t=>{if($=0,!ie||document.hidden)return;let o=k.current,n=G?S((t-G)/1e3,5e-4,.05):1/60;if(G=t,o.paused){u.reveal=1,se(),G=0;return}let i=J?0:1,f=n*o.speed*i;u.clock+=f,o.rotate&&(u.spin+=f*.6),u.travel+=n*o.driftSpeed*i*(o.drift===3?6:.9);let a=o.mouse&&s.inside&&!J,h=1-Math.exp(-n/.35),l=a&&o.hoverEffect===0?o.hoverFactor:0;u.offsetX+=(-s.nx*l-u.offsetX)*h,u.offsetY+=(-s.ny*l-u.offsetY)*h,s.sx+=(s.x-s.sx)*(1-Math.exp(-n/.06)),s.sy+=(s.y-s.sy)*(1-Math.exp(-n/.06)),s.active+=((a?1:0)-s.active)*(1-Math.exp(-n/.2));for(let c=B.length-1;c>=0;c--)B[c].age+=n,B[c].age>=Le&&B.splice(c,1);!o.intro||J?u.reveal=1:u.reveal<1&&(u.reveal=Math.min(1,u.reveal+n/Xt)),se(),$=requestAnimationFrame(He)},X=()=>{!$&&ie&&!document.hidden&&($=requestAnimationFrame(He))},Be=()=>{let t=k.current,o=Math.max(1,Y.clientWidth),n=Math.max(1,Y.clientHeight),i=Math.min(t.dpr||window.devicePixelRatio||1,2);R.width=o,R.height=n,I.width=Math.max(1,Math.round(o*i)),I.height=Math.max(1,Math.round(n*i)),R.ratio=I.width/o,se(),X()},$e=t=>{let o=Y.getBoundingClientRect(),n=t.clientX-o.left,i=t.clientY-o.top,f=s.inside;s.inside=n>=0&&i>=0&&n<=o.width&&i<=o.height,s.x=n,s.y=o.height-i,s.nx=n/Math.max(1,o.width)*2-1,s.ny=-(i/Math.max(1,o.height)*2-1),s.inside&&!f&&(s.sx=s.x,s.sy=s.y)},Ge=t=>{$e(t),k.current.paused||X()},Xe=t=>{let o=k.current;$e(t),!(!s.inside||!o.clickBurst||o.paused||J)&&(B.push({x:s.x,y:s.y,age:0}),B.length>oe&&B.shift(),X())},ce=t=>{t.pointerType!=="mouse"&&(s.inside=!1)},qe=()=>{s.inside=!1},We=()=>{G=0,X()},je=new ResizeObserver(Be);je.observe(Y);let Ke=new IntersectionObserver(t=>{ie=t.some(o=>o.isIntersecting),ie&&(G=0,X())});Ke.observe(Y),window.addEventListener("pointermove",Ge,{passive:!0}),window.addEventListener("pointerdown",Xe,{passive:!0}),window.addEventListener("pointerup",ce,{passive:!0}),window.addEventListener("pointercancel",ce,{passive:!0}),document.documentElement.addEventListener("pointerleave",qe),document.addEventListener("visibilitychange",We),Be();let Ze=k.current.dpr;return Re.current=()=>{let t=k.current;if(t.dpr!==Ze){Ze=t.dpr,Be();return}$||se(),X()},()=>{cancelAnimationFrame($),Re.current=null,je.disconnect(),Ke.disconnect(),window.removeEventListener("pointermove",Ge),window.removeEventListener("pointerdown",Xe),window.removeEventListener("pointerup",ce),window.removeEventListener("pointercancel",ce),document.documentElement.removeEventListener("pointerleave",qe),document.removeEventListener("visibilitychange",We),e.deleteProgram(ne.program),e.deleteProgram(O.program),[re,be,Ae,ge,Ee].forEach(t=>e.deleteBuffer(t)),e.deleteVertexArray(Fe),e.deleteVertexArray(Se),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,D.useEffect)(()=>{Re.current?.()}),(0,ke.jsx)("div",{ref:Ie,className:["relative h-full w-full overflow-hidden",Pt].filter(Boolean).join(" "),style:Lt,children:(0,ke.jsx)("canvas",{ref:Oe,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ht=Qt;var De=te(ve(),1),eo=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],xe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],so=eo.map((r,w)=>({id:w+1,image:r,src:r,img:r,url:r,title:xe[w],text:xe[w],label:xe[w],alt:xe[w],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][w],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function to({big:r}){return(0,De.jsx)(nt,{big:r,dark:!0,center:!1,zoom:1,drive:!1,children:(0,De.jsx)(ht,{})})}var co=at(to);export{co as default};
