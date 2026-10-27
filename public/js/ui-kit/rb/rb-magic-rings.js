import{c as Q,i as Xt,j as de,l as mt,m as pt}from"./chunks/chunk-6IYH4WPJ.js";var L=Q(Xt(),1),Pe=Q(de(),1),Mt=12,St=3,pe=Mt+St,Z=128,Wt=`
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,qt=`
layout(location = 0) in vec2 aSegment;
uniform mat3 uForward;
uniform vec2 uResolution;
uniform float uUnit;
uniform vec2 uCenter;
uniform vec4 uShape[SLOTS];
uniform vec4 uFrame[SLOTS];
uniform float uReach;
uniform float uSplit;
flat out int vSlot;
out vec2 vPlane;
void main() {
  vec4 shape = uShape[gl_InstanceID];
  vec2 origin = uCenter + uFrame[gl_InstanceID].xy;
  float angle = aSegment.x * 6.2831853;
  vec2 direction = vec2(cos(angle), sin(angle));
  vec3 inner = uForward * vec3(origin + direction * shape.x, 1.0);
  vec3 outer = uForward * vec3(origin + direction * (shape.x + 0.01), 1.0);
  float pixels = length(outer.xy / outer.z - inner.xy / inner.z) * 100.0 * uUnit;
  float band = uReach / max(pixels, 1e-3) + uSplit * shape.x;
  vec2 plane = origin + direction * max(shape.x + aSegment.y * band, 0.0);
  vec3 screen = uForward * vec3(plane, 1.0);
  gl_Position = vec4(screen.xy * (2.0 * uUnit / uResolution), 0.0, screen.z);
  vPlane = plane;
  vSlot = gl_InstanceID;
}`,$t=`
uniform vec2 uResolution;
uniform vec2 uScale;
uniform float uUnit;
uniform mat3 uInverse;
uniform vec2 uCenter;
uniform int uCount;
uniform vec4 uShape[SLOTS];
uniform vec4 uFrame[SLOTS];
uniform vec4 uTint[SLOTS];
uniform vec4 uHover;
uniform vec2 uBounds;
uniform float uSplit;
uniform float uOpacity;

out vec4 fragColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float angleOf(vec2 v) {
  vec2 a = abs(v);
  float t = min(a.x, a.y) / max(max(a.x, a.y), 1e-6);
  float r = t * (0.5 + 0.1738 * (1.0 - t));
  return a.y > a.x ? 1.0 - r : r;
}

float nearness(vec2 plane) {
  vec2 offset = plane - uHover.xy;
  return uHover.z * exp(-dot(offset, offset) * uHover.w);
}

vec3 prismOf(vec3 tint) {
  return mix(tint, vec3(dot(tint, vec3(0.3333))), 0.65) * 0.85;
}

vec4 toneMap(vec3 light) {
  float peak = max(max(light.r, light.g), light.b);
  if (peak <= 0.0) return vec4(0.0);
  float level = 1.0 - exp(-peak);
  vec3 color = mix(light * (level / peak), vec3(level), smoothstep(1.4, 3.6, peak) * 0.4);
  return vec4(color, level);
}
`,Yt=`
uniform vec4 uHalo;
uniform vec3 uRange;

float haloOf(float d) {
  float fall = exp(-d * uHalo.y);
  float tight = fall * fall;
  tight *= tight;
  float window = clamp(1.0 - (d - uRange.x) * uRange.y, 0.0, 1.0);
  return (uHalo.z * tight + uHalo.w * fall) * window * window;
}

void main() {
  vec3 projected = uInverse * vec3((gl_FragCoord.xy * uScale - 0.5 * uResolution) / uUnit, 1.0);
  vec2 plane = projected.xy / projected.z;
  vec2 base = plane - uCenter;
  float reach = length(base);
  if (projected.z <= 0.0 || reach < uBounds.x || reach > uBounds.y) {
    fragColor = vec4(0.0);
    return;
  }
  float boost = 1.0 + 1.6 * nearness(plane);
  float limit = uRange.z + uSplit;
  vec3 light = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < SLOTS; i++) {
    if (i >= uCount) break;
    vec4 shape = uShape[i];
    vec4 frame = uFrame[i];
    vec2 w = base - frame.xy;
    float len = length(w);
    float d = abs(len - shape.x);
    if (d > limit) continue;
    float a = angleOf(vec2(dot(w, frame.zw), frame.z * w.y - frame.w * w.x));
    if (a > shape.w) continue;
    float energy = shape.y * max(exp(-shape.z * a * a * a) - 0.002, 0.0) * boost;
    vec3 tint = uTint[i].rgb;
#ifdef PRISM
    float offset = uSplit * shape.x;
    vec3 halo = vec3(haloOf(abs(len - shape.x - offset)), haloOf(d), haloOf(abs(len - shape.x + offset)));
#else
    vec3 halo = vec3(haloOf(d));
#endif
#ifdef LIGHT
    float layer = clamp(energy * dot(halo, vec3(0.3333)), 0.0, 1.0);
    light = tint * layer + light * (1.0 - layer);
    alpha = layer + alpha * (1.0 - layer);
#else
#ifdef PRISM
    tint = prismOf(tint);
#endif
    light += tint * energy * halo;
#endif
  }
#ifdef LIGHT
  fragColor = vec4(light, alpha);
#elif defined(PACKED)
  fragColor = vec4(1.0 - exp(-light), 1.0);
#else
  fragColor = vec4(light, 1.0);
#endif
}`,jt=`
uniform sampler2D uGlow;
uniform float uGrain;
uniform float uTime;

void main() {
  vec4 glow = texture(uGlow, gl_FragCoord.xy / uResolution);
  float grain = 1.0;
  if (uGrain > 0.0) grain += uGrain * (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 413.0) - 0.5) * 1.8;
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
#ifdef LIGHT
  float alpha = clamp(glow.a * grain, 0.0, 1.0);
  if (alpha <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 ink = glow.rgb * grain;
  alpha = clamp(alpha + dither, 0.0, 1.0);
  fragColor = vec4(min(ink, vec3(alpha)), alpha) * uOpacity;
#else
#ifdef PACKED
  vec3 light = -log(1.0 - min(glow.rgb, vec3(0.9995))) * grain;
#else
  vec3 light = glow.rgb * grain;
#endif
  vec4 color = toneMap(light);
  if (color.a <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  float alpha = clamp(color.a + dither, 0.0, 1.0);
  fragColor = vec4(min(color.rgb, vec3(alpha)), alpha) * uOpacity;
#endif
}`,Kt=`
flat in int vSlot;
in vec2 vPlane;
uniform float uWidth;

float coverage(float pixels, float halfWidth) {
  return clamp(max(halfWidth, 0.5) - pixels + 0.5, 0.0, 1.0) * min(halfWidth * 2.0, 1.0);
}

void main() {
  vec4 shape = uShape[vSlot];
  vec4 frame = uFrame[vSlot];
  vec4 tint = uTint[vSlot];
  vec2 w = vPlane - uCenter - frame.xy;
  float len = length(w);
  float stretch = 1.0 / max(length(vec2(dFdx(len), dFdy(len))), 1e-6);
  float a = angleOf(vec2(dot(w, frame.zw), frame.z * w.y - frame.w * w.x));
  float near = nearness(vPlane);
  float energy = shape.y * max(exp(-shape.z * a * a * a) - 0.002, 0.0) * (1.0 + 1.6 * near) * step(a, shape.w);
  float halfWidth = uWidth * (1.0 + 0.45 * near) * max(1.0 - a, 0.5) * tint.w;
  float pixels = abs(len - shape.x) * stretch;
#ifdef PRISM
  float offset = uSplit * shape.x;
  vec3 core = vec3(
    coverage(abs(len - shape.x - offset) * stretch, halfWidth),
    coverage(pixels, halfWidth),
    coverage(abs(len - shape.x + offset) * stretch, halfWidth)
  );
#else
  vec3 core = vec3(coverage(pixels, halfWidth));
#endif
#ifdef LIGHT
  float hot = core.g * clamp(1.0 - pixels / max(halfWidth * 0.35, 0.3), 0.0, 1.0);
  float layer = energy * max(max(core.r, core.g), core.b);
  if (layer <= 0.0) discard;
#ifdef PRISM
  vec3 color = clamp(1.0 - (1.0 - tint.rgb) * core * 1.4, 0.0, 1.0);
#else
  vec3 color = tint.rgb;
#endif
  color = mix(color, vec3(1.0), hot * 0.7);
  fragColor = vec4(color * layer, layer) * uOpacity;
#else
#ifdef PRISM
  vec4 color = toneMap(prismOf(tint.rgb) * energy * core * 1.7);
#else
  vec4 color = toneMap(tint.rgb * energy * core * 1.7);
#endif
  if (color.a <= 0.0) discard;
  fragColor = color * uOpacity;
#endif
}`,vt=(o,a)=>["#version 300 es","precision highp float;",`#define SLOTS ${pe}`,...a.map(s=>`#define ${s}`),o].join(`
`),Jt={glow:Yt,compose:jt,line:Kt},Qt=["pulse","ripple","breathe"],z=3.45,gt=.5,xt=2.6,me=1.1,wt=.9,T=(o,a,s)=>Math.min(s,Math.max(a,o)),q=(o,a,s)=>{let r=T((s-o)/(a-o),0,1);return r*r*(3-2*r)},Zt=o=>Math.min(q(0,.7,o),1-q(.5,3.25,o)),bt=o=>o<=.04045?o/12.92:Math.pow((o+.055)/1.055,2.4),Ce=o=>{let a=String(o||"").trim(),s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(a);if(s){let l=s[1].length===3?s[1].replace(/./g,i=>i+i):s[1];return[0,2,4].map(i=>parseInt(l.slice(i,i+2),16)/255)}let r=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(a);if(r)return[r[1],r[2],r[3]].map(l=>T(parseFloat(l)/255,0,1));if(typeof document<"u"){let l=document.createElement("canvas").getContext("2d");if(l){l.fillStyle="#000000",l.fillStyle=a;let i=String(l.fillStyle);if(i!=="#000000"||/^(#0{3}|#0{6}|black)$/i.test(a))return Ce(i)}}return[.66,.33,.97]},Et=(o,a,s)=>{let r=o.createShader(a);return r?(o.shaderSource(r,s),o.compileShader(r),o.getShaderParameter(r,o.COMPILE_STATUS)?r:(console.error(o.getShaderInfoLog(r)),o.deleteShader(r),null)):null},eo=(o,a,s)=>{let r=Et(o,o.VERTEX_SHADER,a),l=Et(o,o.FRAGMENT_SHADER,s),i=r&&l?o.createProgram():null;if(!r||!l||!i)return r&&o.deleteShader(r),l&&o.deleteShader(l),null;if(o.attachShader(i,r),o.attachShader(i,l),o.linkProgram(i),o.deleteShader(r),o.deleteShader(l),!o.getProgramParameter(i,o.LINK_STATUS))return console.error(o.getProgramInfoLog(i)),o.deleteProgram(i),null;let S={},y=o.getProgramParameter(i,o.ACTIVE_UNIFORMS);for(let w=0;w<y;w++){let F=o.getActiveUniform(i,w);F&&(S[F.name.replace(/\[0\]$/,"")]=o.getUniformLocation(i,F.name))}return{program:i,uniforms:S}},to=o=>{let[a,s,r,l,i,S,y,w,F]=o,ee=i*F-S*w,te=S*y-l*F,oe=l*w-i*y,ge=a*ee+s*te+r*oe;return[ee,r*w-s*F,s*S-r*i,te,a*F-r*y,r*l-a*S,oe,s*y-a*w,a*i-s*l].map(xe=>xe/ge)},oo=(o,a)=>{let s=o*Math.PI/180,r=a*Math.PI/180,l=Math.cos(s),i=Math.sin(s),S=Math.cos(r),y=Math.sin(r),w=[S,y*i,0,0,l,0,y*l/xt,-i/xt,1];return{forward:w,inverse:to(w)}},no=(o,a,s)=>{let r=o[6]*a+o[7]*s+o[8];return[(o[0]*a+o[1]*s+o[2])/r,(o[3]*a+o[4]*s+o[5])/r,r]},ro=({color:o="#A855F7",colorTwo:a="#6366F1",ringCount:s=6,motion:r="pulse",speed:l=1,lineThickness:i=2,glow:S=1,baseRadius:y=.35,radiusStep:w=.1,expansion:F=.1,taper:ee=1.5,rotation:te=0,spin:oe=0,tilt:ge=0,dispersion:xe=0,grain:Rt=0,opacity:Tt=1,followMouse:Ft=!1,mouseInfluence:At=.2,hoverScale:It=1.2,hoverIntensity:Lt=1,parallax:_t=.05,clickBurst:Ct=!0,intro:Pt=!0,theme:Ot="dark",maxDevicePixelRatio:Ut=2,className:Bt="",style:Dt})=>{let Ue=(0,L.useRef)(null),Be=(0,L.useRef)(null),we=(0,L.useRef)(null),[De,Nt]=(0,L.useState)(0),be=Ot==="light",Ne=Ce(o),Ge=Ce(a),ke={color:be?Ne:Ne.map(bt),colorTwo:be?Ge:Ge.map(bt),ringCount:T(Math.round(s),1,Mt),motion:Qt.includes(r)?r:"pulse",speed:Math.max(0,l),lineThickness:Math.max(.25,i),glow:T(S,0,3),baseRadius:Math.max(.01,y),radiusStep:Math.max(0,w),expansion:F,taper:Math.max(.5,ee),rotation:te*Math.PI/180,spin:oe,tilt:T(ge,-80,80),dispersion:T(xe,0,1),grain:T(Rt,0,1),opacity:T(Tt,0,1),followMouse:Ft,mouseInfluence:At,hoverScale:Math.max(.5,It),hoverIntensity:Math.max(0,Lt),parallax:_t,clickBurst:Ct,intro:Pt,light:be,maxRatio:T(Ut,.5,3)},D=(0,L.useRef)(ke);return D.current=ke,(0,L.useEffect)(()=>{we.current?.()}),(0,L.useEffect)(()=>{let $=Ue.current,m=Be.current;if(!$||!m)return;let e=m.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"default"});if(!e)return;let ne=new Map,H=(t,n)=>{let c=`${t}|${n.join(",")}`;if(!ne.has(c)){let d=vt(t==="line"?qt:Wt,n);ne.set(c,eo(e,d,vt(`${$t}${Jt[t]}`,n)))}return ne.get(c)};if(!H("glow",[])||!H("compose",[])||!H("line",[]))return;let Y=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ze=e.createVertexArray(),Ee=e.createVertexArray(),He=e.createBuffer(),Ve=new Float32Array((Z+1)*4);for(let t=0;t<=Z;t++)Ve.set([t/Z,-1,t/Z,1],t*4);e.bindVertexArray(Ee),e.bindBuffer(e.ARRAY_BUFFER,He),e.bufferData(e.ARRAY_BUFFER,Ve,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);let re=e.createTexture(),Me=e.createFramebuffer(),N={width:0,height:0},Se=!!e.getExtension("EXT_color_buffer_float"),Xe=new Float32Array(pe*4),We=new Float32Array(pe*4),qe=new Float32Array(pe*4),G={width:1,height:1,ratio:1,unit:1},h={x:0,y:0,inside:!1,touch:!1},u={x:0,y:0,vx:0,vy:0,hover:0,hoverVelocity:0},_=[],O=D.current.intro&&D.current.speed>0&&!Y&&De===0,U=O?0:1.6,V=0,k=0,ae=0,ye=!0,Re=document.visibilityState!=="hidden",Te=!1,Fe=()=>{let t=D.current,n=$.getBoundingClientRect(),c=Math.min(window.devicePixelRatio||1,t.maxRatio),d=Math.max(1,Math.round(n.width*c)),v=Math.max(1,Math.round(n.height*c));(m.width!==d||m.height!==v)&&(m.width=d,m.height=v),Object.assign(G,{width:d,height:v,ratio:c,unit:Math.max(1,Math.min(d,v))});let x=Math.max(1,Math.ceil(d/2)),b=Math.max(1,Math.ceil(v/2));if(N.width===x&&N.height===b)return;Object.assign(N,{width:x,height:b});let E=g=>{e.bindTexture(e.TEXTURE_2D,re),e.texImage2D(e.TEXTURE_2D,0,g?e.RGBA16F:e.RGBA8,x,b,0,e.RGBA,g?e.HALF_FLOAT:e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,Me),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,re,0);let A=e.checkFramebufferStatus(e.FRAMEBUFFER)===e.FRAMEBUFFER_COMPLETE;return e.bindFramebuffer(e.FRAMEBUFFER,null),A};E(Se)||(Se=!1,E(!1))},Gt=(t,n,c)=>{let d=c>1?n/(c-1):0;if(t.motion==="ripple"){let E=c*t.radiusStep+t.expansion,g=z*Math.max(1,c)*.32,A=U/g+n/c,M=A-Math.floor(A),R=U-M*g>=-1e-4||!O?q(0,.12,M)*(1-q(.62,1,M)):0,j=M*Math.max(1,c-1);return{radius:t.baseRadius+M*E,life:R,virtual:j,mix:M,opening:1}}if(t.motion==="breathe"){let E=Math.sin(U/4*Math.PI*2-n*.55),g=O?q(n*.12,n*.12+.9,U):1;return{radius:t.baseRadius+n*t.radiusStep+t.expansion*.5*(1+E),life:(.78+.22*E)*g,virtual:n,mix:d,opening:1}}let v=U-n*gt,x=(v%z+z)%z,b=O&&v<0?0:Zt(x);return{radius:t.baseRadius+n*t.radiusStep+(1-Math.pow(1-x/z,2))*t.expansion,life:b,virtual:n,mix:d,opening:O&&v<z?q(0,.9,v):1}},kt=()=>{let t=D.current,n=t.ringCount,c=u.hover,d=Y?0:1,v=1+(t.hoverScale-1)*c*d,x=u.x*d,b=u.y*d,E=t.tilt-b*t.parallax*260,g=x*t.parallax*260,A=oo(E,g),M=t.followMouse?[x*t.mouseInfluence,b*t.mouseInfluence]:[0,0],I=t.spin*U*.6,R=0,j=1/0,se=0,Ae=0,nt=(p,f,P,B,le,fe,W,ue)=>{if(f<=.002)return;let J=10*p*P*P*P;Xe.set([p,f,J,J>6.2?Math.cbrt(6.2/J):2],R*4),We.set([le,fe,Math.cos(B),Math.sin(B)],R*4),qe.set([t.color[0]+(t.colorTwo[0]-t.color[0])*W,t.color[1]+(t.colorTwo[1]-t.color[1])*W,t.color[2]+(t.colorTwo[2]-t.color[2])*W,ue],R*4),j=Math.min(j,p),se=Math.max(se,p),Ae=Math.max(Ae,Math.hypot(le,fe)),R++};for(let p=0;p<n;p++){let f=Gt(t,p,n),P=f.radius*v,B=f.life;for(let W of _){let ue=V-W.start,J=(W.radius+ue*wt)*v,dt=Math.pow(Math.max(0,1-ue/me),1.5),he=(J-P)/.08;P+=.04*Math.exp(-he*he)*dt,B=Math.min(1.6,B+.9*Math.exp(-he*he*1.6)*dt)}let le=Math.pow(t.taper,f.virtual)/Math.max(.08,f.opening),fe=t.rotation+I*(p%2?-1:1)*(1+p*.15);nt(P,B,le,fe,p*t.parallax*x,p*t.parallax*b,f.mix,1)}for(let p of _){let f=V-p.start,P=Math.pow(Math.max(0,1-f/me),1.5),B=(p.radius+f*wt)*v;nt(B,1.5*P,.85,t.rotation,0,0,T(f/me,0,1),1.15)}if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,m.width,m.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),!R)return;let X=[];t.light&&X.push("LIGHT"),t.dispersion>0&&X.push("PRISM"),Se||X.push("PACKED");let rt=H("glow",X),at=H("compose",X),it=H("line",X);if(!rt||!at||!it)return;let st=(t.light?.3:1)*(1-t.dispersion*.45),ct=.012+.033*t.glow,zt=.5*Math.min(1,t.glow)*st,Ht=.9*t.glow*st,ce=ct*4.5+.008,lt=t.dispersion*.03,ft=ce+lt*se+Ae+.01,ut=t.lineThickness*G.ratio,Vt=ut*(1+.45*t.hoverIntensity)*1.15+1.5,ht=no(A.inverse,h.x,h.y),Ie=p=>{let f=p.uniforms;return e.useProgram(p.program),e.uniform2f(f.uResolution,m.width,m.height),e.uniform1f(f.uUnit,G.unit),e.uniform2f(f.uCenter,M[0],M[1]),e.uniform1i(f.uCount,R),e.uniform4fv(f.uShape,Xe),e.uniform4fv(f.uFrame,We),e.uniform4fv(f.uTint,qe),e.uniform4f(f.uHover,ht[0]-M[0],ht[1]-M[1],c*t.hoverIntensity,1/.03),e.uniform1f(f.uSplit,lt),e.uniform1f(f.uOpacity,t.opacity),f};e.bindVertexArray(ze),e.bindFramebuffer(e.FRAMEBUFFER,Me),e.viewport(0,0,N.width,N.height),e.clear(e.COLOR_BUFFER_BIT);let K=Ie(rt);e.uniform2f(K.uScale,m.width/N.width,m.height/N.height),e.uniformMatrix3fv(K.uInverse,!0,A.inverse),e.uniform2f(K.uBounds,Math.max(0,j-ft),se+ft),e.uniform4f(K.uHalo,0,1/ct,zt,Ht),e.uniform3f(K.uRange,ce*.45,1/(ce*.55),ce),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,m.width,m.height);let Le=Ie(at);e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,re),e.uniform1i(Le.uGlow,0),e.uniform1f(Le.uGrain,t.grain),e.uniform1f(Le.uTime,V),e.drawArrays(e.TRIANGLES,0,3);let _e=Ie(it);e.uniformMatrix3fv(_e.uForward,!0,A.forward),e.uniform1f(_e.uReach,Vt),e.uniform1f(_e.uWidth,ut),e.enable(e.BLEND),t.light?e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_COLOR,e.ONE,e.ONE_MINUS_SRC_ALPHA),e.bindVertexArray(Ee),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,(Z+1)*2,R),e.disable(e.BLEND),e.bindVertexArray(null)},$e=t=>{if(k=0,Te)return;let n=D.current,c=T((t-ae)/1e3||0,0,.05);ae=Math.max(ae,t),V+=c,Y||(U+=c*n.speed);let d=h.inside?h.x/Math.max(1e-6,G.width/G.unit):0,v=h.inside?h.y/Math.max(1e-6,G.height/G.unit):0,x=70,b=2*Math.sqrt(x)*.9,E=Math.max(1,Math.ceil(c/(1/240))),g=c/E;for(let I=0;I<E;I++){u.vx+=(x*(d-u.x)-b*u.vx)*g,u.vy+=(x*(v-u.y)-b*u.vy)*g,u.x+=u.vx*g,u.y+=u.vy*g;let R=h.inside?1:0;u.hoverVelocity+=(40*(R-u.hover)-2*Math.sqrt(40)*u.hoverVelocity)*g,u.hover+=u.hoverVelocity*g}for(let I=_.length-1;I>=0;I--)V-_[I].start>me&&_.splice(I,1);O&&U>(n.ringCount+2)*gt+z&&(O=!1),kt();let A=Math.abs(u.vx)+Math.abs(u.vy)+Math.abs(u.hoverVelocity)>1e-4||Math.abs((h.inside?1:0)-u.hover)>.001;(n.speed>0&&!Y||A||_.length>0||O)&&ye&&Re&&(k=requestAnimationFrame($e))},C=()=>{k||Te||!ye||!Re||(ae=performance.now(),k=requestAnimationFrame($e))};we.current=()=>{Fe(),C()};let Ye=t=>{let n=$.getBoundingClientRect(),c=t.clientX>=n.left&&t.clientX<=n.right&&t.clientY>=n.top&&t.clientY<=n.bottom,d=Math.max(1,Math.min(n.width,n.height));return{x:(t.clientX-n.left-n.width/2)/d,y:(n.top+n.height/2-t.clientY)/d,inside:c}},je=t=>{if(t.pointerType==="touch"&&!h.touch)return;let n=Ye(t);h.x=n.x,h.y=n.y,h.inside=n.inside,C()},Ke=t=>{let n=Ye(t);if(!n.inside)return;h.x=n.x,h.y=n.y,h.inside=!0,h.touch=t.pointerType==="touch";let c=D.current;c.clickBurst&&!Y&&(_.push({start:V,radius:Math.max(.04,c.baseRadius*.45)}),_.length>St&&_.shift()),C()},ie=t=>{t.pointerType==="touch"&&(h.touch=!1,h.inside=!1,C())},Je=()=>{h.inside=!1,C()};window.addEventListener("pointermove",je,{passive:!0}),window.addEventListener("pointerdown",Ke,{passive:!0}),window.addEventListener("pointerup",ie,{passive:!0}),window.addEventListener("pointercancel",ie,{passive:!0}),document.documentElement.addEventListener("pointerleave",Je);let Qe=t=>{t.preventDefault(),Te=!0,cancelAnimationFrame(k),k=0},Ze=()=>Nt(t=>t+1);m.addEventListener("webglcontextlost",Qe),m.addEventListener("webglcontextrestored",Ze);let et=new ResizeObserver(()=>{Fe(),C()});et.observe($);let tt=new IntersectionObserver(t=>{ye=t.some(n=>n.isIntersecting),C()});tt.observe($);let ot=()=>{Re=document.visibilityState!=="hidden",C()};return document.addEventListener("visibilitychange",ot),Fe(),C(),()=>{cancelAnimationFrame(k),we.current=null,et.disconnect(),tt.disconnect(),window.removeEventListener("pointermove",je),window.removeEventListener("pointerdown",Ke),window.removeEventListener("pointerup",ie),window.removeEventListener("pointercancel",ie),document.documentElement.removeEventListener("pointerleave",Je),document.removeEventListener("visibilitychange",ot),m.removeEventListener("webglcontextlost",Qe),m.removeEventListener("webglcontextrestored",Ze),e.isContextLost()||(e.deleteVertexArray(ze),e.deleteTexture(re),e.deleteFramebuffer(Me),ne.forEach(t=>t&&e.deleteProgram(t.program)),e.deleteVertexArray(Ee),e.deleteBuffer(He))}},[De]),(0,Pe.jsx)("div",{ref:Ue,className:`relative h-full w-full overflow-hidden ${Bt}`.trim(),style:Dt,children:(0,Pe.jsx)("canvas",{ref:Be,className:"pointer-events-none absolute inset-0 block h-full w-full","aria-hidden":"true"})})},yt=ro;var Oe=Q(de(),1),ao=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],ve=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ho=ao.map((o,a)=>({id:a+1,image:o,src:o,img:o,url:o,title:ve[a],text:ve[a],label:ve[a],alt:ve[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function io({big:o}){return(0,Oe.jsx)(pt,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Oe.jsx)(yt,{})})}var mo=mt(io);export{mo as default};
