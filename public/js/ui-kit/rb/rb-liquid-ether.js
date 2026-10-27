import{c as z,i as qe,j as J,l as De,m as Le}from"./chunks/chunk-6IYH4WPJ.js";var b=z(qe(),1),ue=z(J(),1),je=24e5,Je=14e4,Ze=32,Z=256,Qe=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vUv = corners[gl_VertexID] * 0.5 + 0.5;
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,X=`#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uTexel;
`,et=`${X}
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec4 uSegment;
uniform vec2 uForce;
uniform float uRadius;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * t);
}

void main() {
  float d = segment(vUv * uSize, uSegment.xy, uSegment.zw) / uRadius;
  vec2 velocity = texture(uVelocity, vUv).xy + uForce * exp(-d * d * 6.0);
  fragColor = vec4(velocity, 0.0, 1.0);
}`,tt=`${X}
uniform sampler2D uVelocity;
uniform float uAmount;

void main() {
  vec2 center = texture(uVelocity, vUv).xy;
  vec2 around =
    texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).xy +
    texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).xy +
    texture(uVelocity, vUv - vec2(0.0, uTexel.y)).xy +
    texture(uVelocity, vUv + vec2(0.0, uTexel.y)).xy;
  fragColor = vec4(mix(center, around * 0.25, uAmount), 0.0, 1.0);
}`,rt=`${X}
uniform sampler2D uVelocity;
uniform float uWalls;

void main() {
  vec2 center = texture(uVelocity, vUv).xy;
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float down = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float up = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float edge = uWalls > 0.5 ? -1.0 : 0.0;
  if (vUv.x - uTexel.x < 0.0) left = edge * center.x;
  if (vUv.x + uTexel.x > 1.0) right = edge * center.x;
  if (vUv.y - uTexel.y < 0.0) down = edge * center.y;
  if (vUv.y + uTexel.y > 1.0) up = edge * center.y;
  fragColor = vec4(0.5 * (right - left + up - down), 0.0, 0.0, 1.0);
}`,Ie=`
uniform float uWalls;

float pressureAt(sampler2D field, vec2 uv) {
  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture(field, uv).x * mix(inside.x * inside.y, 1.0, uWalls);
}
`,ot=`${X}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
${Ie}
void main() {
  vec2 reach = uTexel * 2.0;
  float sum =
    pressureAt(uPressure, vUv - vec2(reach.x, 0.0)) +
    pressureAt(uPressure, vUv + vec2(reach.x, 0.0)) +
    pressureAt(uPressure, vUv - vec2(0.0, reach.y)) +
    pressureAt(uPressure, vUv + vec2(0.0, reach.y));
  fragColor = vec4(sum * 0.25 - texture(uDivergence, vUv).x, 0.0, 0.0, 1.0);
}`,nt=`${X}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
${Ie}
void main() {
  float left = pressureAt(uPressure, vUv - vec2(uTexel.x, 0.0));
  float right = pressureAt(uPressure, vUv + vec2(uTexel.x, 0.0));
  float down = pressureAt(uPressure, vUv - vec2(0.0, uTexel.y));
  float up = pressureAt(uPressure, vUv + vec2(0.0, uTexel.y));
  vec2 velocity = texture(uVelocity, vUv).xy - 0.5 * vec2(right - left, up - down);
  fragColor = vec4(velocity, 0.0, 1.0);
}`,it=`${X}
uniform sampler2D uVelocity;
uniform vec2 uStep;
uniform float uKeep;
uniform float uWalls;

vec2 at(vec2 uv) {
  vec2 outside = max(-uv, uv - 1.0) / uTexel;
  float open = clamp(1.0 - max(outside.x, outside.y) / 1.5, 0.0, 1.0);
  return texture(uVelocity, uv).xy * mix(open, 1.0, uWalls);
}

void main() {
  vec2 start = vUv - at(vUv) * uStep;
  vec2 back = start + at(start) * uStep;
  vec2 corrected = vUv - (back - vUv) * 0.5;
  vec2 origin = corrected - at(corrected) * uStep;
  vec2 a = at(origin + vec2(-0.5, -0.5) * uTexel);
  vec2 b = at(origin + vec2(0.5, -0.5) * uTexel);
  vec2 c = at(origin + vec2(-0.5, 0.5) * uTexel);
  vec2 d = at(origin + vec2(0.5, 0.5) * uTexel);
  vec2 velocity = clamp(at(origin), min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
  fragColor = vec4(velocity * uKeep, 0.0, 1.0);
}`,at=`${X}
uniform sampler2D uVelocity;
uniform sampler2D uPalette;
uniform vec2 uSimSize;
uniform float uSpeedScale;
uniform float uLight;
uniform vec4 uBackground;

vec2 velocityAt(vec2 uv) {
  vec2 st = uv * uSimSize - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 h0 = (i - 0.5 + w1 / g0) / uSimSize;
  vec2 h1 = (i + 1.5 + w3 / g1) / uSimSize;
  vec2 a = texture(uVelocity, vec2(h0.x, h0.y)).xy;
  vec2 b = texture(uVelocity, vec2(h1.x, h0.y)).xy;
  vec2 c = texture(uVelocity, vec2(h0.x, h1.y)).xy;
  vec2 d = texture(uVelocity, vec2(h1.x, h1.y)).xy;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

void main() {
  float speed = length(velocityAt(vUv)) * uSpeedScale;
  float level = speed < 0.75 ? speed : 0.75 + 0.25 * tanh((speed - 0.75) * 4.0);
  vec3 ink = texture(uPalette, vec2(level, 0.5)).rgb;
  float alpha = level;
  if (uLight > 0.5) {
    float hollow = smoothstep(0.7, 1.6, speed);
    alpha = smoothstep(0.08, 0.5, level) * mix(0.85, 0.1, hollow);
  } else {
    float hot = 1.0 - exp(-max(speed - 0.75, 0.0) * 1.2);
    ink = mix(ink, min(ink * 1.8 + 0.06, vec3(1.0)), hot);
  }
  vec3 color = ink * alpha + uBackground.rgb * uBackground.a * (1.0 - alpha);
  float coverage = alpha + uBackground.a * (1.0 - alpha);
  float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  color += (grain - 0.5) / 255.0 * step(0.002, coverage);
  fragColor = vec4(clamp(color, vec3(0.0), vec3(coverage)), coverage);
}`,y=(o,f,l)=>Math.min(l,Math.max(f,o)),Fe=(o,f)=>Math.pow(.5,f/(.35+o*o*12)),Xe=o=>{let f=String(o||"").trim(),l=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(f);if(l){let s=l[1].length===3?l[1].replace(/./g,m=>m+m):l[1];return[0,2,4].map(m=>parseInt(s.slice(m,m+2),16)/255)}let v=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(f);return v?[v[1],v[2],v[3]].map(s=>y(parseFloat(s)/255,0,1)):null},ct=o=>o<=.04045?o/12.92:Math.pow((o+.055)/1.055,2.4),st=o=>{let f=[];o.forEach(s=>{let m=Xe(s);m&&f.push(m)}),f.length||f.push([1,1,1]);let l=f.map(s=>s.map(ct)),v=new Uint8Array(Z*4);for(let s=0;s<Z;s++){let m=y(s/(Z-1)*l.length-.5,0,l.length-1),U=Math.min(Math.floor(m),Math.max(l.length-2,0)),P=Math.min(U+1,l.length-1),w=m-U,ee=w*w*(3-2*w);for(let A=0;A<3;A++){let te=l[U][A]+(l[P][A]-l[U][A])*ee;v[s*4+A]=Math.round(y(te,0,1)*255)}v[s*4+3]=255}return v},Ve=(o,f,l)=>{let v=o.createShader(f);return v?(o.shaderSource(v,l),o.compileShader(v),o.getShaderParameter(v,o.COMPILE_STATUS)?v:(console.error(o.getShaderInfoLog(v)),o.deleteShader(v),null)):null},I=(o,f)=>{let l=Ve(o,o.VERTEX_SHADER,Qe),v=Ve(o,o.FRAGMENT_SHADER,f),s=l&&v?o.createProgram():null;if(!l||!v||!s)return l&&o.deleteShader(l),v&&o.deleteShader(v),null;if(o.attachShader(s,l),o.attachShader(s,v),o.linkProgram(s),o.deleteShader(l),o.deleteShader(v),!o.getProgramParameter(s,o.LINK_STATUS))return console.error(o.getProgramInfoLog(s)),o.deleteProgram(s),null;let m={},U=o.getProgramParameter(s,o.ACTIVE_UNIFORMS);for(let P=0;P<U;P++){let w=o.getActiveUniform(s,P);w&&(m[w.name]=o.getUniformLocation(s,w.name))}return{program:s,uniforms:m}},ut=({colors:o=["#5227FF","#FF9FFC","#B497CF"],intensity:f=1,mouseForce:l=20,cursorSize:v=100,persistence:s=.75,viscosity:m=0,resolution:U=.5,bounceEdges:P=!1,clickBurst:w=!0,autoDemo:ee=!0,autoSpeed:A=.5,autoIntensity:te=2.2,autoResumeDelay:Ne=1e3,intro:ke=!0,lightMode:Be=!1,backgroundColor:ve="transparent",maxDevicePixelRatio:Oe=2,className:Ge="",style:We})=>{let fe=(0,b.useRef)(null),de=(0,b.useRef)(null),re=(0,b.useRef)(null),[me,ze]=(0,b.useState)(0),he=Array.isArray(o)?o:[o],xe=ve==="transparent"?null:Xe(ve),pe={colors:he,paletteKey:he.join(","),intensity:Math.max(0,f),force:Math.max(0,l),radius:y(v,4,600),persistence:y(s,0,1),viscosity:y(m,0,1),resolution:y(U,.05,1),walls:P,clickBurst:w,autoDemo:ee,autoSpeed:Math.max(0,A),autoIntensity:Math.max(0,te),autoResumeDelay:Math.max(0,Ne),intro:ke,light:Be,background:xe?[...xe,1]:[0,0,0,0],maxRatio:y(Oe,.5,3)},k=(0,b.useRef)(pe);return k.current=pe,(0,b.useEffect)(()=>{re.current?.()}),(0,b.useEffect)(()=>{let B=fe.current,g=de.current;if(!B||!g)return;let e=g.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!e||!e.getExtension("EXT_color_buffer_float")&&!e.getExtension("EXT_color_buffer_half_float"))return;let R={splat:I(e,et),smooth:I(e,tt),divergence:I(e,rt),pressure:I(e,ot),project:I(e,nt),advect:I(e,it),display:I(e,at)};if(Object.values(R).some(t=>!t))return;let Y=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ye=e.createVertexArray(),h={width:1,height:1},E={width:0,height:0},c={},a={x:0,y:0,fromX:0,fromY:0,dx:0,dy:0,inside:!1,ready:!1,moved:!1,last:0},x={phase:Math.random()*100,x:0,y:0,ready:!1,ramp:0},M={active:k.current.intro&&!Y&&me===0,time:0},$=[],O=[],C=1,H=-1/0,D=0,K=0,oe=!0,ne=document.visibilityState!=="hidden",ie=!1,ge="",q=e.createTexture();e.bindTexture(e.TEXTURE_2D,q),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let Ye=t=>{t.paletteKey!==ge&&(ge=t.paletteKey,e.bindTexture(e.TEXTURE_2D,q),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,Z,1,0,e.RGBA,e.UNSIGNED_BYTE,st(t.colors)))},G=(t,r,n)=>{let u=e.createTexture();e.bindTexture(e.TEXTURE_2D,u),e.texImage2D(e.TEXTURE_2D,0,n===2?e.RG16F:e.R16F,t,r,0,n===2?e.RG:e.RED,e.HALF_FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let i=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,u,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),{texture:u,framebuffer:i}},Ee=()=>{Object.keys(c).forEach(t=>{e.deleteTexture(c[t].texture),e.deleteFramebuffer(c[t].framebuffer),delete c[t]})},ae=()=>{let t=k.current,r=B.getBoundingClientRect(),n=Math.max(1,r.width),u=Math.max(1,r.height),i=Math.min(window.devicePixelRatio||1,t.maxRatio,Math.sqrt(je/(n*u))),d=Math.max(1,Math.round(n*i)),_=Math.max(1,Math.round(u*i));(g.width!==d||g.height!==_)&&(g.width=d,g.height=_),h.width=n,h.height=u;let p=t.resolution*.5,N=p*Math.min(1,Math.sqrt(Je/(n*u*p*p))),S=y(Math.round(n*N),16,1024),V=y(Math.round(u*N),16,1024);S===E.width&&V===E.height||(Ee(),E.width=S,E.height=V,c.velocity=G(S,V,2),c.velocityNext=G(S,V,2),c.divergence=G(S,V,1),c.pressure=G(S,V,1),c.pressureNext=G(S,V,1),e.bindFramebuffer(e.FRAMEBUFFER,null))},W=(t,r)=>{let n=c[t];c[t]=c[r],c[r]=n},T=(t,r,n)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r),e.uniform1i(n,t)},L=(t,r,n)=>{e.useProgram(t.program),e.uniform2f(t.uniforms.uTexel,1/E.width,1/E.height),n(t.uniforms),e.bindFramebuffer(e.FRAMEBUFFER,r?r.framebuffer:null),e.drawArrays(e.TRIANGLES,0,3)},$e=(t,r)=>{e.viewport(0,0,E.width,E.height);let n=t.walls?1:0;$.forEach(i=>{L(R.splat,c.velocityNext,d=>{T(0,c.velocity.texture,d.uVelocity),e.uniform2f(d.uSize,h.width,h.height),e.uniform4f(d.uSegment,i.ax,i.ay,i.bx,i.by),e.uniform2f(d.uForce,i.vx,i.vy),e.uniform1f(d.uRadius,i.radius)}),W("velocity","velocityNext")}),$.length=0;let u=Math.ceil(t.viscosity*4);for(let i=0;i<u;i++)L(R.smooth,c.velocityNext,d=>{T(0,c.velocity.texture,d.uVelocity),e.uniform1f(d.uAmount,Math.min(1,t.viscosity*4-i)*.9)}),W("velocity","velocityNext");L(R.divergence,c.divergence,i=>{T(0,c.velocity.texture,i.uVelocity),e.uniform1f(i.uWalls,n)});for(let i=0;i<Ze;i++)L(R.pressure,c.pressureNext,d=>{T(0,c.pressure.texture,d.uPressure),T(1,c.divergence.texture,d.uDivergence),e.uniform1f(d.uWalls,n)}),W("pressure","pressureNext");L(R.project,c.velocityNext,i=>{T(0,c.pressure.texture,i.uPressure),T(1,c.velocity.texture,i.uVelocity),e.uniform1f(i.uWalls,n)}),W("velocity","velocityNext"),L(R.advect,c.velocityNext,i=>{T(0,c.velocity.texture,i.uVelocity),e.uniform2f(i.uStep,r/h.width,r/h.height),e.uniform1f(i.uKeep,Fe(t.persistence,r)),e.uniform1f(i.uWalls,n)}),W("velocity","velocityNext")},He=t=>{e.viewport(0,0,g.width,g.height),L(R.display,null,r=>{T(0,c.velocity.texture,r.uVelocity),T(1,q,r.uPalette),e.uniform2f(r.uSimSize,E.width,E.height),e.uniform1f(r.uSpeedScale,1.25*t.intensity/(.84*Math.max(h.width,h.height))),e.uniform1f(r.uLight,t.light?1:0),e.uniform4f(r.uBackground,t.background[0],t.background[1],t.background[2],t.background[3])})},Ke=t=>{let r=.62*Math.sin(t*.83+1.3)+.38*Math.sin(t*1.71+.4),n=.6*Math.sin(t*1.07+2.1)+.4*Math.cos(t*.61+.7);return[(.5+.41*r)*h.width,(.5+.41*n)*h.height]},Te=t=>{let r=y(t/1.4,0,1),n=1-Math.pow(1-r,3),u=-.6+n*3.6,i=.08+.3*n;return[(.5+Math.cos(u)*i*1.1)*h.width,(.5+Math.sin(u)*i*(h.width/h.height)*.75)*h.height]},ce=(t,r,n,u,i)=>{$.push({ax:t[0],ay:t[1],bx:r[0],by:r[1],vx:y((r[0]-t[0])/n*u,-6e3,6e3),vy:y((r[1]-t[1])/n*u,-6e3,6e3),radius:i})},be=t=>{if(D=0,ie)return;let r=k.current;Ye(r);let n=y((t-K)/1e3||0,0,1/30);K=Math.max(K,t);let u=Math.min(1,n*60),i=t-H>r.autoResumeDelay&&!a.inside;if(M.active&&n>0){let p=Te(M.time);M.time+=n;let N=Math.sin(Math.min(1,M.time/1.4)*Math.PI);ce(p,Te(M.time),n,.2*N,r.radius),C=1,M.time>1.4&&(M.active=!1)}else if(r.autoDemo&&!Y&&i&&n>0){x.ramp=Math.min(1,x.ramp+n/.8),x.phase+=n*r.autoSpeed*1.6;let p=Ke(x.phase);if(x.ready){let N=.3+.7*Math.pow(.5+.5*Math.sin(x.phase*2.6),2),S=r.force/20*.45*r.autoIntensity*x.ramp*x.ramp*N*u;ce([x.x,x.y],p,n,S,r.radius)}x.x=p[0],x.y=p[1],x.ready=!0,C=1}else x.ramp=0;if(a.moved&&n>0){a.moved=!1;let p=Math.max(t-a.last,8)/1e3;ce([a.fromX,a.fromY],[a.x,a.y],p,r.force/20*.15*u,r.radius),a.fromX=a.x,a.fromY=a.y,a.last=t,C=1}let d=O.shift();d&&$.push(d),e.bindVertexArray(ye),e.disable(e.BLEND),n>0&&$e(r,n),He(r),C*=Fe(r.persistence,n),(M.active||r.autoDemo&&!Y||C>.002||O.length>0||a.moved)&&oe&&ne&&(D=requestAnimationFrame(be))},F=()=>{D||ie||!oe||!ne||(K=performance.now(),D=requestAnimationFrame(be))};re.current=()=>{ae(),F()};let we=t=>{let r=B.getBoundingClientRect();return{x:t.clientX-r.left,y:r.bottom-t.clientY,inside:t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom}},Re=t=>{let r=we(t);if(a.inside=r.inside,!r.inside){a.ready=!1;return}H=performance.now(),M.active=!1,a.ready||(a.fromX=r.x,a.fromY=r.y,a.x=r.x,a.y=r.y,a.last=H,a.ready=!0);let n=r.x-a.x,u=r.y-a.y;Math.hypot(n,u)>.5&&(a.dx=a.dx*.7+n*.3,a.dy=a.dy*.7+u*.3),a.x=r.x,a.y=r.y,a.moved=!0,F()},Me=t=>{let r=k.current,n=we(t);if(!n.inside||(H=performance.now(),!r.clickBurst||Y))return;let u=Math.hypot(a.dx,a.dy)>1?Math.atan2(a.dy,a.dx):Math.random()*Math.PI*2,i=Math.cos(u),d=Math.sin(u),_=r.radius*.5,p=1400*(r.force/20);O.push({ax:n.x-i*_,ay:n.y-d*_,bx:n.x+i*_,by:n.y+d*_,vx:i*p,vy:d*p,radius:r.radius*.9}),O.length>4&&O.shift(),C=1,F()},se=()=>{a.inside=!1,a.ready=!1},j=t=>{t.pointerType!=="mouse"&&se()};window.addEventListener("pointermove",Re,{passive:!0}),window.addEventListener("pointerdown",Me,{passive:!0}),window.addEventListener("pointerup",j,{passive:!0}),window.addEventListener("pointercancel",j,{passive:!0}),document.documentElement.addEventListener("pointerleave",se);let Se=t=>{t.preventDefault(),ie=!0,cancelAnimationFrame(D),D=0},Ue=()=>ze(t=>t+1);g.addEventListener("webglcontextlost",Se),g.addEventListener("webglcontextrestored",Ue);let Ae=new ResizeObserver(()=>{ae(),F()});Ae.observe(B);let _e=new IntersectionObserver(t=>{oe=t.some(r=>r.isIntersecting),F()});_e.observe(B);let Pe=()=>{ne=document.visibilityState!=="hidden",F()};return document.addEventListener("visibilitychange",Pe),ae(),F(),()=>{cancelAnimationFrame(D),re.current=null,Ae.disconnect(),_e.disconnect(),window.removeEventListener("pointermove",Re),window.removeEventListener("pointerdown",Me),window.removeEventListener("pointerup",j),window.removeEventListener("pointercancel",j),document.documentElement.removeEventListener("pointerleave",se),document.removeEventListener("visibilitychange",Pe),g.removeEventListener("webglcontextlost",Se),g.removeEventListener("webglcontextrestored",Ue),e.isContextLost()||(Ee(),e.deleteTexture(q),e.deleteVertexArray(ye),Object.values(R).forEach(t=>e.deleteProgram(t.program)))}},[me]),(0,ue.jsx)("div",{ref:fe,className:`relative h-full w-full overflow-hidden ${Ge}`.trim(),style:We,children:(0,ue.jsx)("canvas",{ref:de,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ce=ut;var le=z(J(),1),lt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Q=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],pt=lt.map((o,f)=>({id:f+1,image:o,src:o,img:o,url:o,title:Q[f],text:Q[f],label:Q[f],alt:Q[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function vt({big:o}){return(0,le.jsx)(Le,{big:o,dark:!0,center:!1,zoom:1,drive:"move",children:(0,le.jsx)(Ce,{})})}var yt=De(vt);export{yt as default};
