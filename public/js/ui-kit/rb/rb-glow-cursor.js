import{c as k,i as Ye,j as H,l as Ae,m as Me}from"./chunks/chunk-6IYH4WPJ.js";var V=k(Ye(),1),$=k(H(),1),Ke=`#version 300 es
in vec2 aPosition;
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,M=`#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
`,je=`${M}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
uniform float uWide;
uniform vec3 uValue;
uniform float uMode;
uniform float uStrength;
float erf(float x) {
  float x2 = x * x;
  float a = 0.147;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + a * x2) / (1.0 + a * x2)));
}
float sweep(float along, float length, float across, float radius) {
  return exp(-across * across / (radius * radius)) * 0.5 * (erf(along / radius) - erf((along - length) / radius));
}
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uA.x * uAspect, uA.y);
  vec2 ab = vec2(uB.x * uAspect, uB.y) - a;
  float len = length(ab);
  vec2 dir = len > 1e-6 ? ab / len : vec2(1.0, 0.0);
  vec2 ap = p - a;
  vec3 base = texture(uTarget, vUv).xyz;
  if (uMode > 1.5) {
    float along = dot(ap, dir);
    float across = dot(ap, vec2(-dir.y, dir.x));
    if (uMode > 2.5) {
      outColor = vec4(mix(base, uValue, sweep(along, len, across, uRadius) * uStrength), 1.0);
      return;
    }
    vec3 add = vec3(uValue.xy * sweep(along, len, across, uRadius), uValue.z * sweep(along, len, across, uWide));
    outColor = vec4(base + add, 1.0);
    return;
  }
  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  vec2 d = ap - ab * h;
  float r2 = dot(d, d);
  float falloff = exp(-r2 / (uRadius * uRadius));
  float wide = exp(-r2 / (uWide * uWide));
  vec3 result = uMode > 0.5 ? mix(base, uValue, falloff * uStrength) : base + vec3(uValue.xy * falloff, uValue.z * wide);
  outColor = vec4(result, 1.0);
}`,Qe=`${M}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  outColor = texture(uSource, coord) * uDecay;
}`,Je=`${M}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uForward;
uniform sampler2D uBack;
uniform vec2 uVelocityTexel;
uniform vec2 uSourceTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  vec4 forward = texture(uForward, vUv);
  vec4 corrected = forward + 0.5 * (texture(uSource, vUv) - texture(uBack, vUv));
  vec2 base = (floor(coord / uSourceTexel - 0.5) + 0.5) * uSourceTexel;
  vec4 a = texture(uSource, base);
  vec4 b = texture(uSource, base + vec2(uSourceTexel.x, 0.0));
  vec4 c = texture(uSource, base + vec2(0.0, uSourceTexel.y));
  vec4 d = texture(uSource, base + uSourceTexel);
  vec4 low = min(min(a, b), min(c, d));
  vec4 high = max(max(a, b), max(c, d));
  outColor = clamp(corrected, low, high) * uDecay;
}`,Ze=`${M}
uniform sampler2D uVelocity;
void main() {
  float left = texture(uVelocity, vL).x;
  float right = texture(uVelocity, vR).x;
  float top = texture(uVelocity, vT).y;
  float bottom = texture(uVelocity, vB).y;
  vec2 center = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) left = -center.x;
  if (vR.x > 1.0) right = -center.x;
  if (vT.y > 1.0) top = -center.y;
  if (vB.y < 0.0) bottom = -center.y;
  outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}`,et=`${M}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  outColor = texture(uSource, vUv) * uValue;
}`,tt=`${M}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}`,ot=`${M}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  outColor = vec4(velocity, 0.0, 1.0);
}`,Be=`
uniform vec3 uColor;
uniform vec3 uSecondary;
uniform float uIntensity;
uniform float uHotspot;
vec3 shade(vec3 dye) {
  float energy = max(dye.x, 0.0);
  float heat = clamp(dye.y, 0.0, energy);
  float gas = max(dye.z, 0.0);
  float fresh = heat / max(energy, 0.0001);
  vec3 tint = mix(uSecondary, uColor, fresh);
  return (tint * energy + uSecondary * gas + vec3(heat * heat * 0.3 * uHotspot)) * uIntensity;
}
`,rt=`${M}${Be}
uniform sampler2D uDye;
uniform vec2 uDyeTexel;
void main() {
  vec2 o = uDyeTexel * 0.5;
  vec3 light = shade(texture(uDye, vUv + vec2(-o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(-o.x, o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, o.y)).xyz);
  outColor = vec4(light * 0.25, 1.0);
}`,it=`${M}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv).rgb * 4.0;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb;
  outColor = vec4(color / 8.0, 1.0);
}`,nt=`${M}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
  outColor = vec4(color / 12.0, 1.0);
}`,at=`${M}${Be}
uniform sampler2D uDye;
uniform sampler2D uBloom;
uniform float uGlow;
uniform float uGrain;
uniform float uTime;
uniform float uLight;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec3 dye = texture(uDye, vUv).xyz;
  vec3 light = shade(dye);
  vec3 bloom = texture(uBloom, vUv).rgb * uGlow;
  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float grain = 1.0 + (hash(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0) - 0.5) * uGrain * 2.0;
  if (uLight > 0.5) {
    float energy = max(dye.x, 0.0);
    float heat = clamp(dye.y, 0.0, energy);
    float gas = max(dye.z, 0.0);
    float fresh = heat / max(energy, 0.0001);
    vec3 tint = mix(uSecondary, uColor, fresh);
    float halo = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
    float density = 1.0 - exp(-((energy * 1.1 + gas * 0.8) * uIntensity + halo * 0.25));
    float tone = dot(tint, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = tint * min(1.0, 0.5 / max(tone, 0.001)) * mix(0.95, 0.72, smoothstep(0.5, 3.0, energy));
    ink = mix(ink, vec3(1.0), clamp(heat * heat * 0.05 * uHotspot, 0.0, 0.45));
    density = clamp(density * grain, 0.0, 1.0) * edge;
    outColor = vec4(ink * density, density);
  } else {
    vec3 color = 1.0 - exp(-(light + bloom) * grain);
    color *= edge;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,Ue={low:{sim:96,dye:384},medium:{sim:128,dye:576},high:{sim:160,dye:768}},ut=20,ct=.75,Fe=5,te=(f,x,E)=>Math.min(E,Math.max(x,f)),Pe=(f,x,E)=>{let v=f.createShader(x);return v?(f.shaderSource(v,E),f.compileShader(v),f.getShaderParameter(v,f.COMPILE_STATUS)?v:(f.deleteShader(v),null)):null},lt=([f,x,E])=>{let v=Math.max(f,x,E),S=Math.min(f,x,E),T=v-S,U=0;return T>0&&(v===f?U=(x-E)/T%6:v===x?U=(E-f)/T+2:U=(f-x)/T+4),[(U*60+360)%360,v>0?T/v:0,v]},st=(f,x,E)=>{let v=(f%360+360)%360/60,S=E*x,T=S*(1-Math.abs(v%2-1)),U=E-S,[z,q,Y]=v<1?[S,T,0]:v<2?[T,S,0]:v<3?[0,S,T]:v<4?[0,T,S]:v<5?[T,0,S]:[S,0,T];return[z+U,q+U,Y+U]},ft=({color:f="#5f8bff",secondaryColor:x,intensity:E=1.3,trailWidth:v=3,linger:S=1.4,glow:T=1.2,hotspot:U=.8,followSpeed:z=.6,grain:q=0,clickBurst:Y=!0,quality:re="high",theme:ie="dark",blendMode:Le,maxDevicePixelRatio:Ve=2,enabled:_e=!0,children:ne,className:Ie="",style:Ge,...Ne})=>{let ae=(0,V.useRef)(null),ue=(0,V.useRef)(null),_=(0,V.useRef)(null);_.current={color:String(f),secondaryColor:x?String(x):"",intensity:Math.max(0,E),trailWidth:te(v,.5,40),linger:te(S,.1,10),glow:Math.max(0,T),hotspot:Math.max(0,U),followSpeed:te(z,0,1),grain:Math.max(0,q),clickBurst:Y,quality:Ue[re]?re:"high",theme:ie,maxDevicePixelRatio:Ve,enabled:_e},(0,V.useEffect)(()=>{let F=ae.current,g=ue.current,e=g?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!F||!g||!e||!e.getExtension("EXT_color_buffer_float"))return;let K=Pe(e,e.VERTEX_SHADER,Ke);if(!K)return;let D=t=>{let i=Pe(e,e.FRAGMENT_SHADER,t),o=e.createProgram();if(!i||!o)return null;if(e.attachShader(o,K),e.attachShader(o,i),e.bindAttribLocation(o,0,"aPosition"),e.linkProgram(o),e.deleteShader(i),!e.getProgramParameter(o,e.LINK_STATUS))return e.deleteProgram(o),null;let r={},a=e.getProgramParameter(o,e.ACTIVE_UNIFORMS);for(let u=0;u<a;u++){let l=e.getActiveUniform(o,u);l&&(r[l.name]=e.getUniformLocation(o,l.name))}return{program:o,uniforms:r}},p={splat:D(je),advect:D(Qe),maccormack:D(Je),divergence:D(Ze),scale:D(et),pressure:D(tt),gradient:D(ot),prefilter:D(rt),down:D(it),up:D(nt),display:D(at)};if(Object.values(p).some(t=>!t))return;let j=e.createVertexArray(),ce=e.createBuffer();e.bindVertexArray(j),e.bindBuffer(e.ARRAY_BUFFER,ce),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Q=document.createElement("canvas");Q.width=1,Q.height=1;let B=Q.getContext("2d",{willReadFrequently:!0}),I=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,n={width:1,height:1,ratio:1,colorKey:"",color:[.37,.55,1],secondary:[.25,.3,1],pointer:{x:0,y:0,inside:!1},emitter:{x:0,y:0,vx:0,vy:0,px:0,py:0,travelled:0},ready:!1,bursts:[],active:-1/0,time:0,allocated:"",targets:null},G=0,C=0,J=!0,X=!0,le=(t,i)=>{if(!B||!t)return i;let o=/^[0-9a-f]{3,8}$/i.test(t)?`#${t}`:t;B.clearRect(0,0,1,1),B.fillStyle="#000000",B.fillStyle=o,B.fillRect(0,0,1,1);let[r,a,u]=B.getImageData(0,0,1,1).data;return[r/255,a/255,u/255]},ke=t=>{let i=`${t.color}|${t.secondaryColor}`;if(i!==n.colorKey)if(n.colorKey=i,n.color=le(t.color,[.37,.55,1]),t.secondaryColor)n.secondary=le(t.secondaryColor,n.color);else{let[o,r,a]=lt(n.color);n.secondary=st(o+8,Math.min(1,r*1.1+.05),a)}},L=(t,i,o,r,a)=>{let u=e.createTexture();e.bindTexture(e.TEXTURE_2D,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,o,t,i,0,r,e.HALF_FLOAT,null);let l=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,u,0),e.viewport(0,0,t,i),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),{texture:u,fbo:l,width:t,height:i,texel:[1/t,1/i]}},Z=(t,i,o,r,a)=>{let u=L(t,i,o,r,a),l=L(t,i,o,r,a);return{get read(){return u},get write(){return l},swap(){let m=u;u=l,l=m},targets(){return[u,l]}}},$e=t=>{e.deleteTexture(t.texture),e.deleteFramebuffer(t.fbo)},se=()=>{let t=n.targets;t&&([...t.velocity.targets(),...t.dye.targets(),...t.pressure.targets(),t.divergence,t.forward,t.back,...t.bloom].forEach($e),n.targets=null)},Xe=()=>{let t=n.targets;t&&(e.clearColor(0,0,0,0),[...t.velocity.targets(),...t.dye.targets(),...t.pressure.targets()].forEach(i=>{e.bindFramebuffer(e.FRAMEBUFFER,i.fbo),e.clear(e.COLOR_BUFFER_BIT)}))},fe=()=>{let t=_.current,i=`${t.quality}|${n.width}|${n.height}|${g.width}|${g.height}`;if(i===n.allocated&&n.targets)return;se(),n.allocated=i;let o=Ue[t.quality],r=n.width/n.height,a=b=>r>=1?[Math.round(b*r),b]:[b,Math.round(b/r)],[u,l]=a(o.sim),[m,y]=a(o.dye),s=Math.min(1,g.width/m,g.height/y);m=Math.max(2,Math.round(m*s)),y=Math.max(2,Math.round(y*s));let c=[],h=m>>1,A=y>>1;for(let b=0;b<Fe;b++)c.push(L(Math.max(1,h),Math.max(1,A),e.RGBA16F,e.RGBA,e.LINEAR)),h>>=1,A>>=1;n.targets={velocity:Z(u,l,e.RG16F,e.RG,e.LINEAR),dye:Z(m,y,e.RGBA16F,e.RGBA,e.LINEAR),forward:L(m,y,e.RGBA16F,e.RGBA,e.LINEAR),back:L(m,y,e.RGBA16F,e.RGBA,e.LINEAR),pressure:Z(u,l,e.R16F,e.RED,e.NEAREST),divergence:L(u,l,e.R16F,e.RED,e.NEAREST),bloom:c}},ee=()=>{let t=_.current,i=Math.max(1,F.clientWidth),o=Math.max(1,F.clientHeight),r=Math.min(window.devicePixelRatio||1,Math.max(.5,t.maxDevicePixelRatio||2)),a=Math.max(1,Math.round(i*r)),u=Math.max(1,Math.round(o*r));(g.width!==a||g.height!==u)&&(g.width=a,g.height=u),n.width=i,n.height=o,n.ratio=r,fe()},R=t=>{t?(e.bindFramebuffer(e.FRAMEBUFFER,t.fbo),e.viewport(0,0,t.width,t.height)):(e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,g.width,g.height)),e.drawArrays(e.TRIANGLES,0,3)},w=(t,i)=>(e.useProgram(t.program),t.uniforms.uTexel&&e.uniform2f(t.uniforms.uTexel,i[0],i[1]),t.uniforms),d=(t,i)=>(e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,i.texture),t),N=(t,i,o,r,a,u,l,m,y,s=u)=>{let c=w(p.splat,t.read.texel);e.uniform1i(c.uTarget,d(0,t.read)),e.uniform1f(c.uAspect,n.width/n.height),e.uniform2f(c.uA,i/n.width,1-o/n.height),e.uniform2f(c.uB,r/n.width,1-a/n.height),e.uniform1f(c.uRadius,u/n.height),e.uniform1f(c.uWide,s/n.height),e.uniform3f(c.uValue,l[0],l[1],l[2]),e.uniform1f(c.uMode,m),e.uniform1f(c.uStrength,y),R(t.write),t.swap()},de=(t,i)=>{let{velocity:o}=n.targets;return[t*o.read.width/n.width,-i*o.read.height/n.height]},me=t=>Math.max(t.trailWidth*.5,n.height/n.targets.dye.read.height*.9),He=(t,i,o)=>{let{emitter:r,pointer:a}=n,{velocity:u,dye:l}=n.targets;if(r.px=r.x,r.py=r.y,I||t.followSpeed>=1)r.x=a.x,r.y=a.y;else{let h=10+t.followSpeed*50,A=Math.max(1,Math.ceil(i/.004)),b=i/A;for(let O=0;O<A;O++)r.vx+=(h*h*(a.x-r.x)-2*h*r.vx)*b,r.vy+=(h*h*(a.y-r.y)-2*h*r.vy)*b,r.x+=r.vx*b,r.y+=r.vy*b}let m=r.x-r.px,y=r.y-r.py;if(Math.hypot(m,y)<.05||!t.enabled)return;let c=me(t);if(!I){let h=de(m/Math.max(i,.001),y/Math.max(i,.001));N(u,r.px,r.py,r.x,r.y,c*4+18,[h[0],h[1],0],3,ct*.6)}N(l,r.px,r.py,r.x,r.y,c,[5.6,5.6,.7],2,1,c*5+6),n.active=o},We=(t,i,o,r)=>{let{velocity:a,dye:u}=n.targets,l=me(t),m=6,y=Math.random()*Math.PI*2;for(let s=0;s<m;s++){let c=y+s/m*Math.PI*2+(Math.random()-.5)*.5,h=Math.cos(c),A=Math.sin(c),b=20+Math.random()*14,O=i+h*3,Ee=o+A*3,we=i+h*b,Se=o+A*b;if(!I){let De=de(Math.cos(c+.6)*760,Math.sin(c+.6)*760);N(a,O,Ee,we,Se,18,[De[0],De[1],0],1,.9)}N(u,O,Ee,we,Se,l*1.1,[2.4,2.4,.3],0,1,l*5+6)}N(u,i,o,i+.01,o,l*2.2,[1.8,1.8,.4],0,1,l*7+10),n.active=r},ze=(t,i)=>{let{velocity:o,dye:r,pressure:a,divergence:u}=n.targets;if(!I){let c=w(p.divergence,o.read.texel);e.uniform1i(c.uVelocity,d(0,o.read)),R(u),c=w(p.scale,a.read.texel),e.uniform1i(c.uSource,d(0,a.read)),e.uniform1f(c.uValue,.8),R(a.write),a.swap(),c=w(p.pressure,a.read.texel),e.uniform1i(c.uDivergence,d(1,u));for(let A=0;A<ut;A++)e.uniform1i(c.uPressure,d(0,a.read)),R(a.write),a.swap();c=w(p.gradient,o.read.texel),e.uniform1i(c.uPressure,d(0,a.read)),e.uniform1i(c.uVelocity,d(1,o.read)),R(o.write),o.swap(),c=w(p.advect,o.read.texel),e.uniform2f(c.uVelocityTexel,o.read.texel[0],o.read.texel[1]),e.uniform1i(c.uVelocity,d(0,o.read)),e.uniform1i(c.uSource,d(0,o.read)),e.uniform1f(c.uDt,i);let h=Math.exp(-i*1.2);e.uniform4f(c.uDecay,h,h,1,1),R(o.write),o.swap()}let l=[Math.exp(-i*4.6/(t.linger*.8)),Math.exp(-i*4.6/(t.linger*.2)),Math.exp(-i*4.6/(t.linger*1.2)),1],{forward:m,back:y}=n.targets;if(I){let c=w(p.advect,r.read.texel);e.uniform2f(c.uVelocityTexel,o.read.texel[0],o.read.texel[1]),e.uniform1i(c.uVelocity,d(0,o.read)),e.uniform1i(c.uSource,d(1,r.read)),e.uniform1f(c.uDt,0),e.uniform4f(c.uDecay,l[0],l[1],l[2],l[3]),R(r.write),r.swap();return}let s=w(p.advect,r.read.texel);e.uniform2f(s.uVelocityTexel,o.read.texel[0],o.read.texel[1]),e.uniform1i(s.uVelocity,d(0,o.read)),e.uniform1i(s.uSource,d(1,r.read)),e.uniform1f(s.uDt,i),e.uniform4f(s.uDecay,1,1,1,1),R(m),e.uniform1i(s.uSource,d(1,m)),e.uniform1f(s.uDt,-i),R(y),s=w(p.maccormack,r.read.texel),e.uniform2f(s.uVelocityTexel,o.read.texel[0],o.read.texel[1]),e.uniform2f(s.uSourceTexel,r.read.texel[0],r.read.texel[1]),e.uniform1i(s.uVelocity,d(0,o.read)),e.uniform1i(s.uSource,d(1,r.read)),e.uniform1i(s.uForward,d(2,m)),e.uniform1i(s.uBack,d(3,y)),e.uniform1f(s.uDt,i),e.uniform4f(s.uDecay,l[0],l[1],l[2],l[3]),R(r.write),r.swap()},ve=(t,i)=>{e.uniform3f(t.uColor,n.color[0],n.color[1],n.color[2]),e.uniform3f(t.uSecondary,n.secondary[0],n.secondary[1],n.secondary[2]),e.uniform1f(t.uIntensity,i.intensity),e.uniform1f(t.uHotspot,i.hotspot)},qe=t=>{let{dye:i,bloom:o}=n.targets;if(t.glow>0){let a=w(p.prefilter,o[0].texel);e.uniform1i(a.uDye,d(0,i.read)),e.uniform2f(a.uDyeTexel,i.read.texel[0],i.read.texel[1]),ve(a,t),R(o[0]),a=w(p.down,o[0].texel);for(let u=1;u<o.length;u++)e.uniform1i(a.uSource,d(0,o[u-1])),e.uniform2f(a.uSourceTexel,o[u-1].texel[0],o[u-1].texel[1]),R(o[u]);e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE),a=w(p.up,o[0].texel);for(let u=o.length-1;u>0;u--)e.uniform1i(a.uSource,d(0,o[u])),e.uniform2f(a.uSourceTexel,o[u].texel[0],o[u].texel[1]),R(o[u-1]);e.disable(e.BLEND)}let r=w(p.display,[1/g.width,1/g.height]);e.uniform1i(r.uDye,d(0,i.read)),e.uniform1i(r.uBloom,d(1,o[0])),ve(r,t),e.uniform1f(r.uGlow,t.glow>0?t.glow*1.4/Fe:0),e.uniform1f(r.uGrain,t.grain),e.uniform1f(r.uTime,n.time),e.uniform1f(r.uLight,t.theme==="light"?1:0),R(null)},xe=()=>{e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,g.width,g.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)},he=t=>{if(G=0,!J||!X||document.hidden)return;let i=_.current,o=C?Math.min(1/30,(t-C)/1e3):1/60;C=t,n.time+=o;let r=Math.min(window.devicePixelRatio||1,Math.max(.5,i.maxDevicePixelRatio||2));for(Math.abs(r-n.ratio)>.01&&ee(),fe(),ke(i),e.bindVertexArray(j),e.disable(e.BLEND),n.ready&&He(i,o,t);n.bursts.length;){let[l,m]=n.bursts.shift();We(i,l,m,t)}ze(i,o),qe(i);let a=t-n.active>i.linger*1200+900,u=Math.hypot(n.emitter.vx,n.emitter.vy)<1;if(a&&u){Xe(),xe(),C=0;return}G=requestAnimationFrame(he)},P=()=>{!G&&J&&X&&!document.hidden&&(G=requestAnimationFrame(he))},ye=t=>{let i=F.getBoundingClientRect(),o=t.clientX-i.left,r=t.clientY-i.top;if(!(o>=0&&r>=0&&o<=i.width&&r<=i.height)){n.pointer.inside&&(n.pointer.inside=!1,n.ready=!1,P());return}n.ready||(n.emitter.x=o,n.emitter.y=r,n.emitter.px=o,n.emitter.py=r,n.emitter.vx=0,n.emitter.vy=0,n.ready=!0),n.pointer.x=o,n.pointer.y=r,n.pointer.inside=!0,P()},ge=t=>{let i=_.current;if(!i.clickBurst||!i.enabled)return;let o=F.getBoundingClientRect(),r=t.clientX-o.left,a=t.clientY-o.top;r<0||a<0||r>o.width||a>o.height||(n.bursts.push([r,a]),P())},pe=()=>{n.pointer.inside=!1,n.ready=!1,P()},be=()=>{C=0,P()},Te=new ResizeObserver(()=>{ee(),P()});Te.observe(F);let Re=new IntersectionObserver(t=>{X=t.some(i=>i.isIntersecting),X&&(C=0,P())});return Re.observe(F),window.addEventListener("pointermove",ye,{passive:!0}),window.addEventListener("pointerdown",ge,{passive:!0}),document.documentElement.addEventListener("pointerleave",pe),document.addEventListener("visibilitychange",be),ee(),xe(),()=>{J=!1,cancelAnimationFrame(G),Te.disconnect(),Re.disconnect(),window.removeEventListener("pointermove",ye),window.removeEventListener("pointerdown",ge),document.documentElement.removeEventListener("pointerleave",pe),document.removeEventListener("visibilitychange",be),se(),Object.values(p).forEach(t=>e.deleteProgram(t.program)),e.deleteShader(K),e.deleteBuffer(ce),e.deleteVertexArray(j)}},[]);let Oe=Le??(ie==="light"?"normal":"screen");return(0,$.jsxs)("div",{ref:ae,className:["relative h-full w-full overflow-hidden",Ie].filter(Boolean).join(" "),style:Ge,...Ne,children:[(0,$.jsx)("canvas",{ref:ue,className:"pointer-events-none absolute inset-0 block h-full w-full select-none",style:{mixBlendMode:Oe},"aria-hidden":"true"}),ne&&(0,$.jsx)("div",{className:"relative z-[1] h-full w-full",children:ne})]})},Ce=ft;var oe=k(H(),1),dt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],W=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],pt=dt.map((f,x)=>({id:x+1,image:f,src:f,img:f,url:f,title:W[x],text:W[x],label:W[x],alt:W[x],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][x],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function mt({big:f}){return(0,oe.jsx)(Me,{big:f,dark:!0,center:!0,zoom:1,drive:"move",children:(0,oe.jsx)(Ce,{})})}var bt=Ae(mt);export{bt as default};
