import{c as N,i as mt,j as H,l as Ie,m as Ve}from"./chunks/chunk-6IYH4WPJ.js";var y=N(mt(),1),me=N(H(),1),le={low:{sim:64,dye:512,iterations:10},medium:{sim:96,dye:1024,iterations:16},high:{sim:128,dye:1440,iterations:20}},qe=256,vt=4,fe=.3,ht=.7,xt="pointer-events-none fixed inset-0 data-[contained]:absolute",pt="block h-full w-full",gt=`#version 300 es
precision highp float;
in vec2 aPosition;
uniform vec2 texelSize;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Tt=`#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
`,Et={copy:`uniform sampler2D uTexture;
void main() {
  outColor = texture(uTexture, vUv);
}`,clear:`uniform sampler2D uTexture;
uniform float value;
void main() {
  outColor = value * texture(uTexture, vUv);
}`,splat:`uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 pointA;
uniform vec2 pointB;
uniform float radius;
void main() {
  vec2 scale = vec2(aspectRatio, 1.0);
  vec2 pa = (vUv - pointA) * scale;
  vec2 ba = (pointB - pointA) * scale;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0);
  vec2 d = pa - ba * h;
  vec3 base = texture(uTarget, vUv).xyz;
  outColor = vec4(base + exp(-dot(d, d) / radius) * color, 1.0);
}`,burst:`uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec2 point;
uniform float radius;
uniform float strength;
uniform float seed;
void main() {
  vec2 d = (vUv - point) * vec2(aspectRatio, 1.0);
  float distance = length(d);
  vec2 direction = d / max(distance, 0.00001);
  float angle = atan(d.y, d.x);
  float petals = 0.78 + 0.22 * sin(angle * 5.0 + seed) * sin(angle * 3.0 - seed * 1.7);
  vec2 twist = vec2(-direction.y, direction.x) * 0.3 * sin(angle * 4.0 + seed * 2.3);
  float falloff = exp(-dot(d, d) / radius) * distance / sqrt(radius);
  outColor = vec4(texture(uTarget, vUv).xy + (direction * petals + twist) * falloff * strength, 0.0, 1.0);
}`,crown:`uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec2 point;
uniform float radius;
uniform vec3 colorA;
uniform vec3 colorB;
uniform float seed;
void main() {
  vec2 d = (vUv - point) * vec2(aspectRatio, 1.0);
  vec3 ink = exp(-dot(d, d) / (radius * 0.45)) * colorA;
  for (int i = 0; i < 7; i++) {
    float index = float(i);
    float angle = seed + index * 0.8975979 + sin(seed * 3.0 + index * 1.9) * 0.35;
    float reach = sqrt(radius) * (0.75 + 0.45 * fract(sin(seed * 7.1 + index * 3.7) * 43.7));
    float drop = radius * (0.08 + 0.12 * fract(sin(seed * 2.9 + index * 5.3) * 31.9));
    vec2 q = d - vec2(cos(angle), sin(angle)) * reach;
    ink += exp(-dot(q, q) / drop) * mix(colorA, colorB, fract(index * 0.37 + 0.2));
  }
  outColor = vec4(texture(uTarget, vUv).xyz + ink, 1.0);
}`,advection:`uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  outColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`,divergence:`uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,curl:`uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,vorticity:`uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy + force * dt;
  outColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}`,pressure:`uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`,gradient:`uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  outColor = vec4(velocity, 0.0, 1.0);
}`,prefilter:`uniform sampler2D uTexture;
uniform vec3 curve;
uniform float threshold;
void main() {
  vec3 c = texture(uTexture, vUv).rgb;
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - curve.x, 0.0, curve.y);
  rq = curve.z * rq * rq;
  c *= max(rq, br - threshold) / max(br, 0.0001);
  outColor = vec4(c, 0.0);
}`,blur:`uniform sampler2D uTexture;
uniform float intensity;
void main() {
  vec4 sum = texture(uTexture, vL) + texture(uTexture, vR) + texture(uTexture, vT) + texture(uTexture, vB);
  outColor = sum * 0.25 * intensity;
}`,display:`uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform vec2 texelSize;
uniform float shading;
uniform float bloom;
uniform float light;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
void main() {
  vec3 c = texture(uTexture, vUv).rgb;
  if (shading > 0.0) {
    float dx = length(texture(uTexture, vR).rgb) - length(texture(uTexture, vL).rgb);
    float dy = length(texture(uTexture, vT).rgb) - length(texture(uTexture, vB).rgb);
    vec3 n = normalize(vec3(dx, dy, length(texelSize)));
    c *= mix(1.0, clamp(n.z + 0.7, 0.7, 1.0), shading);
  }
  if (bloom > 0.0) {
    c += max(texture(uBloom, vUv).rgb, 0.0) * bloom;
  }
  c = max(c, 0.0);
  float peak = max(c.r, max(c.g, c.b));
  float grain = (hash(gl_FragCoord.xy) - 0.5) / 255.0 * smoothstep(0.0, 0.03, peak);
  if (light > 0.5) {
    vec3 transmit = exp(-2.4 * c);
    float low = min(transmit.r, min(transmit.g, transmit.b));
    float alpha = clamp(1.0 - low + grain, 0.0, 1.0);
    outColor = vec4(min(transmit - low, vec3(alpha)), alpha);
  } else {
    c = max(c + grain, 0.0);
    float alpha = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    outColor = vec4(min(c, vec3(alpha)), alpha);
  }
}`},de=(h,f,d)=>Math.min(d,Math.max(f,h)),bt=h=>{let f=String(h).replace("#","").trim();f.length===3&&(f=[...f].map(L=>L+L).join(""));let d=parseInt(f.slice(0,6),16);return Number.isNaN(d)?[1,1,1]:[(d>>16&255)/255,(d>>8&255)/255,(d&255)/255]},yt=(h,f,d)=>{let L=Math.floor(h*6),O=h*6-L,w=d*(1-f),P=d*(1-O*f),X=d*(1-(1-O)*f),B=(L%6+6)%6;return B===0?[d,X,w]:B===1?[P,d,w]:B===2?[w,d,X]:B===3?[w,P,d]:B===4?[X,w,d]:[d,w,P]};function Rt({colors:h=["#4f8cff","#2dd4bf","#ffd166"],rainbow:f=!0,colorSpeed:d=1,intensity:L=1,size:O=1,force:w=1,swirl:P=3,trail:X=1,momentum:B=1,shading:Ye=1,glow:He=0,quality:he="high",clickSplash:Ge=!0,intro:We=!0,contained:I=!1,theme:$e="dark",zIndex:je=50,className:Ke="",style:Qe}){let xe=(0,y.useRef)(null),pe=(0,y.useRef)(null),[Je,Ze]=(0,y.useState)(0),ge={palette:(Array.isArray(h)&&h.length?h:["#ffffff"]).map(bt),rainbow:f,colorSpeed:Math.max(0,d),intensity:Math.max(0,L),size:Math.max(.05,O),force:Math.max(0,w),swirl:Math.max(0,P),trail:Math.max(.05,X),momentum:Math.max(.05,B),shading:de(Ye,0,1),glow:de(He,0,1),quality:le[he]?he:"high",clickSplash:Ge,contained:I,light:$e==="light"},g=(0,y.useRef)(ge);g.current=ge;let et=(0,y.useRef)(We);return(0,y.useEffect)(()=>{let u=xe.current?.parentElement;if(!I||!u||getComputedStyle(u).position!=="static")return;let e=u.style.position;return u.style.position="relative",()=>{u.style.position=e}},[I]),(0,y.useEffect)(()=>{let u=pe.current;if(!u)return;let e=u.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!e)return;e.getExtension("EXT_color_buffer_float"),e.getExtension("EXT_color_buffer_half_float");let W=(t,r)=>{let i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,t,4,4,0,r,e.HALF_FLOAT,null);let o=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,o),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0);let n=e.checkFramebufferStatus(e.FRAMEBUFFER)===e.FRAMEBUFFER_COMPLETE;return e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(o),e.deleteTexture(i),n},F={internal:e.RGBA16F,format:e.RGBA};if(!W(F.internal,F.format))return;let $=W(e.RG16F,e.RG)?{internal:e.RG16F,format:e.RG}:F,U=W(e.R16F,e.RED)?{internal:e.R16F,format:e.RED}:$,Te=(t,r)=>{let i=e.createShader(t);return e.shaderSource(i,r),e.compileShader(i),i},Ee=Te(e.VERTEX_SHADER,gt),j={},be=!1;Object.entries(Et).forEach(([t,r])=>{let i=Te(e.FRAGMENT_SHADER,Tt+r),o=e.createProgram();e.attachShader(o,Ee),e.attachShader(o,i),e.bindAttribLocation(o,0,"aPosition"),e.linkProgram(o),e.deleteShader(i),e.getProgramParameter(o,e.LINK_STATUS)||(be=!0);let n={},c=e.getProgramParameter(o,e.ACTIVE_UNIFORMS);for(let a=0;a<c;a++){let l=e.getActiveUniform(o,a);l&&(n[l.name]=e.getUniformLocation(o,l.name))}j[t]={program:o,uniforms:n}}),e.deleteShader(Ee);let ye=e.createBuffer(),Re=e.createVertexArray();e.bindVertexArray(Re),e.bindBuffer(e.ARRAY_BUFFER,ye),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let V=new Set,K=!1,Q=!1,we=()=>{e.isContextLost()||(V.forEach(t=>{e.deleteFramebuffer(t.fbo),e.deleteTexture(t.texture)}),V.clear(),Object.values(j).forEach(t=>e.deleteProgram(t.program)),e.deleteBuffer(ye),e.deleteVertexArray(Re))};if(be){we();return}let p=t=>{let r=j[t];return e.useProgram(r.program),r.uniforms},m=t=>{t?(e.viewport(0,0,t.width,t.height),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo)):(e.viewport(0,0,e.drawingBufferWidth,e.drawingBufferHeight),e.bindFramebuffer(e.FRAMEBUFFER,null)),e.drawArrays(e.TRIANGLE_STRIP,0,4)},M=(t,r,i,o)=>{e.activeTexture(e.TEXTURE0);let n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,i.internal,t,r,0,i.format,e.HALF_FLOAT,null);let c=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,c),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0),e.viewport(0,0,t,r),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);let a={texture:n,fbo:c,width:t,height:r,texelX:1/t,texelY:1/r,attach:l=>(e.activeTexture(e.TEXTURE0+l),e.bindTexture(e.TEXTURE_2D,n),l)};return V.add(a),a},J=t=>{t&&(e.deleteFramebuffer(t.fbo),e.deleteTexture(t.texture),V.delete(t))},q=(t,r,i,o)=>{e.bindTexture(e.TEXTURE_2D,t.texture),e.texImage2D(e.TEXTURE_2D,0,o.internal,r,i,0,o.format,e.HALF_FLOAT,null),t.width=r,t.height=i,t.texelX=1/r,t.texelY=1/i},Z=(t,r,i,o)=>{let n={read:M(t,r,i,o),write:M(t,r,i,o),width:t,height:r,texelX:1/t,texelY:1/r,swap:()=>{let c=n.read;n.read=n.write,n.write=c}};return n},ee=(t,r,i,o,n,c)=>{if(c){let a=M(r,i,o,n),l=p("copy");e.uniform1i(l.uTexture,t.read.attach(0)),m(a),J(t.read),t.read=a}else q(t.read,r,i,o);q(t.write,r,i,o),t.width=r,t.height=i,t.texelX=1/r,t.texelY=1/i},k=t=>{let r=e.drawingBufferWidth,i=e.drawingBufferHeight,o=Math.max(r,i)/Math.max(1,Math.min(r,i)),n=Math.round(t),c=Math.round(t*o);return r>i?{width:c,height:n}:{width:n,height:c}},Ae=()=>{let t=Math.min(window.devicePixelRatio||1,2),r=Math.max(1,Math.floor(u.clientWidth*t)),i=Math.max(1,Math.floor(u.clientHeight*t));u.width===r&&u.height===i||(u.width=r,u.height=i)},Le=()=>{let t=le[g.current.quality],r=Math.min(e.drawingBufferWidth,e.drawingBufferHeight);return{sim:k(t.sim),ink:k(Math.max(t.sim,Math.min(t.dye,r)))}};Ae();let E=Le(),x=Z(E.ink.width,E.ink.height,F,e.LINEAR),s=Z(E.sim.width,E.sim.height,$,e.LINEAR),A=Z(E.sim.width,E.sim.height,U,e.NEAREST),te=M(E.sim.width,E.sim.height,U,e.NEAREST),re=M(E.sim.width,E.sim.height,U,e.NEAREST),R=null,S=[],tt=()=>{J(R),S.forEach(J),R=null,S=[]},rt=()=>{if(R)return R;let t=k(qe),r=M(t.width,t.height,F,e.LINEAR);for(let i=0;i<vt;i++){let o=t.width>>i+1,n=t.height>>i+1;if(o<2||n<2)break;S.push(M(o,n,F,e.LINEAR))}return R=r,r},Be=()=>{Ae();let t=Le();(x.width!==t.ink.width||x.height!==t.ink.height)&&ee(x,t.ink.width,t.ink.height,F,e.LINEAR,!0),(s.width!==t.sim.width||s.height!==t.sim.height)&&(ee(s,t.sim.width,t.sim.height,$,e.LINEAR,!0),ee(A,t.sim.width,t.sim.height,U,e.NEAREST,!1),q(te,t.sim.width,t.sim.height,U),q(re,t.sim.width,t.sim.height,U));let r=k(qe);R&&(R.width!==r.width||R.height!==r.height)&&tt()},oe=t=>{let r=u.width/u.height;return .2*g.current.size*t/100*(r>1?r:1)},ot=(t,r,i,o,n,c,a,l)=>{let v=p("splat");e.uniform1i(v.uTarget,s.read.attach(0)),e.uniform1f(v.aspectRatio,u.width/u.height),e.uniform2f(v.pointA,t,r),e.uniform2f(v.pointB,i,o),e.uniform3f(v.color,n,c,0),e.uniform1f(v.radius,l),m(s.write),s.swap(),e.uniform1i(v.uTarget,x.read.attach(0)),e.uniform3f(v.color,a[0],a[1],a[2]),m(x.write),x.swap()},ie=(t,r)=>{let i=g.current,o=((t+r/1e3*i.colorSpeed*.6)%1+1)%1;if(i.rainbow)return yt(o,1,1);let n=i.palette;if(n.length===1)return n[0];let c=o*n.length,a=n[Math.floor(c)%n.length],l=n[(Math.floor(c)+1)%n.length],v=c-Math.floor(c),b=v*v*(3-2*v);return[a[0]+(l[0]-a[0])*b,a[1]+(l[1]-a[1])*b,a[2]+(l[2]-a[2])*b]},ne=(t,r)=>t.map(i=>(g.current.light?1-i:i)*r),Fe=(t,r,i)=>{let o=g.current,n=u.width/u.height,c=Math.hypot((t.x-t.px)*n,t.y-t.py);if(c>.35){t.px=t.x,t.py=t.y;return}let a=t.x-t.px,l=t.y-t.py;n<1?a*=n:l/=n;let v=oe(1),b=1+c/(1.77*Math.sqrt(v)),C=6e3*o.force/Math.sqrt(b),ft=.15*o.intensity*Math.min(r*60,1)/Math.sqrt(b),dt=ne(ie(t.offset,i),ft);ot(t.px,t.py,t.x,t.y,a*C,l*C,dt,v),t.px=t.x,t.py=t.y},it=(t,r,i)=>{let o=g.current,n=Math.random()*Math.PI*2,c=u.width/u.height,a=p("burst");e.uniform1i(a.uTarget,s.read.attach(0)),e.uniform1f(a.aspectRatio,c),e.uniform2f(a.point,t,r),e.uniform1f(a.radius,oe(3)),e.uniform1f(a.strength,1100*o.force),e.uniform1f(a.seed,n),m(s.write),s.swap();let l=Math.random(),v=1.6*o.intensity,b=ne(ie(l,i),v),C=ne(ie(l+.3,i),v);a=p("crown"),e.uniform1i(a.uTarget,x.read.attach(0)),e.uniform1f(a.aspectRatio,c),e.uniform2f(a.point,t,r),e.uniform1f(a.radius,oe(1.6)),e.uniform3f(a.colorA,b[0],b[1],b[2]),e.uniform3f(a.colorB,C[0],C[1],C[2]),e.uniform1f(a.seed,n),m(x.write),x.swap()},nt=t=>{let r=g.current,i=le[r.quality].iterations;e.disable(e.BLEND);let o=p("curl");e.uniform2f(o.texelSize,s.texelX,s.texelY),e.uniform1i(o.uVelocity,s.read.attach(0)),m(re),o=p("vorticity"),e.uniform2f(o.texelSize,s.texelX,s.texelY),e.uniform1i(o.uVelocity,s.read.attach(0)),e.uniform1i(o.uCurl,re.attach(1)),e.uniform1f(o.curl,r.swirl),e.uniform1f(o.dt,t),m(s.write),s.swap(),o=p("divergence"),e.uniform2f(o.texelSize,s.texelX,s.texelY),e.uniform1i(o.uVelocity,s.read.attach(0)),m(te),o=p("clear"),e.uniform1i(o.uTexture,A.read.attach(0)),e.uniform1f(o.value,.1),m(A.write),A.swap(),o=p("pressure"),e.uniform2f(o.texelSize,s.texelX,s.texelY),e.uniform1i(o.uDivergence,te.attach(0));for(let n=0;n<i;n++)e.uniform1i(o.uPressure,A.read.attach(1)),m(A.write),A.swap();o=p("gradient"),e.uniform2f(o.texelSize,s.texelX,s.texelY),e.uniform1i(o.uPressure,A.read.attach(0)),e.uniform1i(o.uVelocity,s.read.attach(1)),m(s.write),s.swap(),o=p("advection"),e.uniform2f(o.texelSize,s.texelX,s.texelY),e.uniform1i(o.uVelocity,s.read.attach(0)),e.uniform1i(o.uSource,s.read.attach(0)),e.uniform1f(o.dt,t),e.uniform1f(o.dissipation,2/r.momentum),m(s.write),s.swap(),e.uniform1i(o.uVelocity,s.read.attach(0)),e.uniform1i(o.uSource,x.read.attach(1)),e.uniform1f(o.dissipation,3.5/r.trail),m(x.write),x.swap()},at=t=>{let r=rt();if(!S.length)return;e.disable(e.BLEND);let i=p("prefilter"),o=fe*ht+1e-4;e.uniform3f(i.curve,fe-o,o*2,.25/o),e.uniform1f(i.threshold,fe),e.uniform1i(i.uTexture,x.read.attach(0)),m(r),i=p("blur"),e.uniform1f(i.intensity,1);let n=r;S.forEach(c=>{e.uniform2f(i.texelSize,n.texelX,n.texelY),e.uniform1i(i.uTexture,n.attach(0)),m(c),n=c}),e.blendFunc(e.ONE,e.ONE),e.enable(e.BLEND);for(let c=S.length-2;c>=0;c--){let a=S[c];e.uniform2f(i.texelSize,n.texelX,n.texelY),e.uniform1i(i.uTexture,n.attach(0)),m(a),n=a}e.disable(e.BLEND),e.uniform1f(i.intensity,t),e.uniform2f(i.texelSize,n.texelX,n.texelY),e.uniform1i(i.uTexture,n.attach(0)),m(r)},st=()=>{let t=g.current;t.glow>0&&at(2*t.glow),e.disable(e.BLEND);let r=p("display");e.uniform2f(r.texelSize,1/e.drawingBufferWidth,1/e.drawingBufferHeight),e.uniform1i(r.uTexture,x.read.attach(0)),e.uniform1i(r.uBloom,(R??x.read).attach(1)),e.uniform1f(r.shading,t.shading),e.uniform1f(r.bloom,t.glow>0?1:0),e.uniform1f(r.light,t.light?1:0),m(null)},ct=()=>{e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,e.drawingBufferWidth,e.drawingBufferHeight),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)},_=new Map,Me=[],ut=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,T={x:0,y:0,px:0,py:0,ready:!1,moved:!1,offset:Math.random()},z=et.current&&!ut?performance.now()+150:-1,D=0,ae=0,se=performance.now(),lt=t=>{if(z<0)return;let r=(t-z)/1100;if(r<0)return;let i=Math.min(r,1),o=i*i*(3-2*i),n=.2+.6*o,c=.5+.12*Math.sin(o*Math.PI*2);T.ready?(T.x=n,T.y=c,T.moved=!0):(T.x=T.px=n,T.y=T.py=c,T.ready=!0),i>=1&&(z=-1),se=t},Se=t=>{if(D=0,K||Q)return;let r=g.current,i=de((t-ae)/1e3,0,1/60);ae=t,Be(),lt(t),T.moved&&(T.moved=!1,Fe(T,i,t)),_.forEach(n=>{n.moved&&(n.moved=!1,Fe(n,i,t))}),Me.splice(0).forEach(n=>it(n.x,n.y,t)),nt(i),st();let o=(2.2*r.trail+.4)*1e3;z>=0||t-se<o?D=requestAnimationFrame(Se):ct()},ce=()=>{se=performance.now(),!(D||K||Q)&&(ae=performance.now(),D=requestAnimationFrame(Se))},De=(t,r)=>{let i=u.getBoundingClientRect();if(!i.width||!i.height)return null;let o=(t-i.left)/i.width,n=1-(r-i.top)/i.height;return g.current.contained&&(o<0||o>1||n<0||n>1)?null:{x:o,y:n}},ue=(t,r,i)=>{let o=De(r,i),n=_.get(t);if(!o){n&&(n.ready=!1);return}if(n||(n={x:0,y:0,px:0,py:0,ready:!1,moved:!1,offset:Math.random()},_.set(t,n)),!n.ready){n.x=n.px=o.x,n.y=n.py=o.y,n.ready=!0;return}n.x=o.x,n.y=o.y,n.moved=!0,ce()},Ue=(t,r)=>{if(!g.current.clickSplash)return;let i=De(t,r);i&&(Me.push(i),ce())},_e=t=>{t.pointerType!=="touch"&&ue(`p${t.pointerId}`,t.clientX,t.clientY)},Ce=t=>{t.pointerType!=="touch"&&Ue(t.clientX,t.clientY)},Pe=t=>{Array.from(t.changedTouches).forEach(r=>{_.delete(`t${r.identifier}`),ue(`t${r.identifier}`,r.clientX,r.clientY),Ue(r.clientX,r.clientY)})},Xe=t=>{Array.from(t.changedTouches).forEach(r=>ue(`t${r.identifier}`,r.clientX,r.clientY))},Y=t=>{Array.from(t.changedTouches).forEach(r=>_.delete(`t${r.identifier}`))},ze=()=>{_.forEach(t=>{t.ready=!1})},Ne=t=>{t.preventDefault(),Q=!0,cancelAnimationFrame(D),D=0},Oe=()=>Ze(t=>t+1);return window.addEventListener("pointermove",_e,{passive:!0}),window.addEventListener("pointerdown",Ce,{passive:!0}),window.addEventListener("touchstart",Pe,{passive:!0}),window.addEventListener("touchmove",Xe,{passive:!0}),window.addEventListener("touchend",Y,{passive:!0}),window.addEventListener("touchcancel",Y,{passive:!0}),document.documentElement.addEventListener("pointerleave",ze),u.addEventListener("webglcontextlost",Ne),u.addEventListener("webglcontextrestored",Oe),Be(),z>=0&&ce(),()=>{K=!0,cancelAnimationFrame(D),window.removeEventListener("pointermove",_e),window.removeEventListener("pointerdown",Ce),window.removeEventListener("touchstart",Pe),window.removeEventListener("touchmove",Xe),window.removeEventListener("touchend",Y),window.removeEventListener("touchcancel",Y),document.documentElement.removeEventListener("pointerleave",ze),u.removeEventListener("webglcontextlost",Ne),u.removeEventListener("webglcontextrestored",Oe),we()}},[Je]),(0,me.jsx)("div",{ref:xe,className:[xt,Ke].filter(Boolean).join(" "),style:{zIndex:je,...Qe},"data-contained":I?"":void 0,"aria-hidden":"true",children:(0,me.jsx)("canvas",{ref:pe,className:pt})})}var ke=Rt;var ve=N(H(),1),wt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Dt=wt.map((h,f)=>({id:f+1,image:h,src:h,img:h,url:h,title:G[f],text:G[f],label:G[f],alt:G[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function At({big:h}){return(0,ve.jsx)(Ve,{big:h,dark:!0,center:!0,zoom:1,drive:"move",children:(0,ve.jsx)(ke,{contained:!0,colors:["#48c8f5","#2f7bbd","#b9e8ff"],rainbow:!1})})}var Ut=Ie(At);export{Ut as default};
