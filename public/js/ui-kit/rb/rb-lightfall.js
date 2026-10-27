import{c as O,i as ut,j as Z,l as De,m as Fe}from"./chunks/chunk-6IYH4WPJ.js";var g=O(ut(),1),de=O(Z(),1),fe=8,Xe=4,st=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,ct=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uZoom;
uniform float uPhase;
uniform float uTwinkleClock;
uniform float uRings;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform int uStreakCount;
uniform int uColumns;
uniform float uWidth;
uniform float uTail;
uniform float uTwinkle;
uniform float uHead;
uniform float uDepth;
uniform vec4 uMouse;
uniform vec3 uLens;
uniform float uLightMode;
uniform float uEncode;
out vec4 outColor;

const vec3 CAMERA = vec3(0.0, -0.8888889, -0.2222222);
const float TAU = 6.28318530718;
const float SPACING = 0.005;
const float REACH = 0.32;

uint scramble(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

float unit(uint x) {
  return float(x & 0xffffu) / 65535.0;
}

float stroke(float d, float w) {
  float s = max(0.75 * w, 0.55);
  return 0.75 * w / s * exp(-0.5 * d * d / (s * s));
}

float orb(float d, float r) {
  float s = max(0.6 * r, 0.7);
  float e = 0.6 * r / s;
  return e * e * exp(-0.5 * d * d / (s * s));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 screen = (2.0 * frag - uView) / uView.x;
  vec2 p = screen;
  mat2 warp = mat2(1.0);
  if (uLens.z > 0.0) {
    vec2 o = p - uLens.xy;
    float e = uLens.z * exp(-dot(o, o) / (REACH * REACH));
    p -= o * e;
    warp = mat2(1.0 - e) + outerProduct(o, o) * (2.0 * e / (REACH * REACH));
  }

  vec3 dir = vec3(p, uZoom);
  vec3 exits = (1.0 - CAMERA * sign(dir)) / max(abs(dir), vec3(1e-6));
  float u = min(exits.x, min(exits.y, exits.z));
  for (int i = 0; i < 5; i++) {
    vec3 h = CAMERA + u * dir;
    vec3 h2 = h * h;
    u -= (dot(h2, h2) - 1.0) / (4.0 * dot(dir, h2 * h));
  }
  vec3 hit = CAMERA + u * dir;
  vec3 normal = hit * hit * hit;
  float facing = dot(normal, dir);
  vec3 stepX = u * (vec3(1.0, 0.0, 0.0) - dir * (normal.x / facing));
  vec3 stepY = u * (vec3(0.0, 1.0, 0.0) - dir * (normal.y / facing));
  float ring = hit.y * hit.y + hit.z * hit.z;
  float theta = atan(hit.z, hit.y);
  mat2 jacobian = mat2(
    stepX.x,
    (hit.y * stepX.z - hit.z * stepX.y) / ring,
    stepY.x,
    (hit.y * stepY.z - hit.z * stepY.y) / ring
  ) * warp * (2.0 / uView.x);

  vec2 gradX = vec2(jacobian[0][0], jacobian[1][0]);
  vec2 gradTheta = vec2(jacobian[0][1], jacobian[1][1]);
  float scale = max(length(gradX), 1e-8);
  float det = max(abs(gradX.x * gradTheta.y - gradX.y * gradTheta.x), 1e-12);
  float along = scale / det;
  float skew = dot(gradX, gradTheta) / det;
  float spacing = SPACING / scale;
  float detail = smoothstep(1.6, 3.2, spacing);
  if (detail <= 0.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float halfWidth = min(uWidth / scale, 0.2 * spacing);
  float headRadius = min(2.0 * uWidth / scale, 0.35 * spacing);
  float headReach = 4.0 * max(0.6 * headRadius, 0.7);
  float edge = uColumns > 1 ? 1.0 : 0.5;
  float period = TAU / uRings;
  float fog = exp(-max(u * length(dir) - 0.6, 0.0) * 1.6 * uDepth);

  float boost = 1.0;
  if (uMouse.z > 0.0) {
    vec2 m = screen - uMouse.xy;
    boost += 2.0 * uMouse.z * exp(-dot(m, m) / max(uMouse.w * uMouse.w, 1e-4));
  }

  int count = max(uColorCount, 1);
  vec3 total = vec3(0.0);
  for (int layer = 0; layer < 16; layer++) {
    if (layer >= uStreakCount) break;
    float x = hit.x + float(layer) * SPACING / 8.0;
    float nearest = floor(x / SPACING + 0.5);
    float side = x >= nearest * SPACING ? 1.0 : -1.0;
    for (int k = 0; k < 2; k++) {
      if (k >= uColumns) break;
      float column = nearest + side * float(k);
      float across = (x - column * SPACING) / scale;
      uint seed = scramble(uint(int(column) + 65536) + uint(layer) * 0x9e3779b9u);
      uint next = scramble(seed);
      float hue = unit(seed >> 16);
      float delta = theta - uPhase * (1.0 + floor(unit(seed) * 16.0) / 16.0) - unit(next) * period;
      delta -= period * floor(delta / period + 0.5);
      float ahead = delta * along - across * skew;
      if (abs(ahead) > headReach && (delta > 0.0 || -delta * uTail > 3.2)) continue;
      float behind = max(-delta, 0.0);
      float fall = exp(-uTail * behind) * (1.0 - smoothstep(0.5, 0.95, behind / (0.5 * period)));
      fall *= 1.0 - smoothstep(1.2, 3.2, uTail * behind);
      float reach = length(vec2(across, ahead));
      float trail = stroke(ahead > 0.0 ? reach : abs(across), halfWidth * mix(0.4, 1.0, fall)) * fall;
      float glint = orb(reach, headRadius) * mix(3.0, 1.8, uLightMode);
      float weight = mix(1.5, 1.0 + sin(uTwinkleClock + 7.0 * hue + 4.0), uTwinkle);
      weight *= 1.0 - smoothstep(0.72 * edge, edge, abs(across) / spacing);
      vec3 color = uColors[min(int(hue * float(count)), count - 1)];
      vec3 hot = mix(color, vec3(1.0), uHead * (1.0 - uLightMode));
      total += (trail * color + glint * hot) * weight;
    }
  }

  outColor = vec4(total * fog * boost * detail * uEncode, 1.0);
}`,lt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
uniform float uLimit;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv - uTexel).rgb;
  color += texture(uSource, uv + uTexel).rgb;
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y)).rgb;
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y)).rgb;
  outColor = vec4(min(color * 0.25, vec3(uLimit)), 1.0);
}`,ft=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv).rgb * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135).rgb + texture(uSource, uv - uStep * 1.423135).rgb) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702).rgb + texture(uSource, uv - uStep * 3.326702).rgb) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989).rgb + texture(uSource, uv - uStep * 5.242989).rgb) * 0.018156;
  outColor = vec4(color, 1.0);
}`,mt=`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uView;
uniform float uDecode;
uniform float uGlow;
uniform float uBloom;
uniform float uPresence;
uniform float uOpacity;
uniform float uFade;
uniform float uLightMode;
uniform vec3 uTopColor;
uniform float uTopGlow;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec3 light = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb;
  if (uBloom > 0.0) {
    vec3 halo = texture(uBloom0, uv).rgb * 0.42;
    halo += texture(uBloom1, uv).rgb * 0.3;
    halo += texture(uBloom2, uv).rgb * 0.18;
    halo += texture(uBloom3, uv).rgb * 0.1;
    light += halo * uBloom * (uLightMode > 0.5 ? 0.2 : 1.0);
  }
  light *= uDecode * uGlow * uPresence;

  if (uLightMode < 0.5 && uTopGlow > 0.0) {
    float aspect = uView.x / uView.y;
    vec2 q = vec2((uv.x - 0.5) * aspect, 1.04 - uv.y);
    float spread = 0.34 * max(aspect, 0.75);
    float core = exp(-q.x * q.x / (spread * spread) - q.y * q.y / 0.06);
    float halo = exp(-q.x * q.x / (3.6 * spread * spread) - q.y * q.y / 0.18);
    light += uTopColor * uTopGlow * (core * 0.85 + halo * 0.3) * uPresence;
  }

  vec3 lit = max(light, 0.0);
  vec3 mapped = sqrt(1.0 - exp(-1.3 * lit * lit / (lit + 0.025)));
  float peak = max(mapped.r, max(mapped.g, mapped.b));

  float mask = uOpacity;
  float edge = uFade * 0.5;
  if (edge > 0.0) {
    mask *= smootherstep01(uv.x / edge) * smootherstep01((1.0 - uv.x) / edge);
    mask *= smootherstep01(uv.y / edge) * smootherstep01((1.0 - uv.y) / edge);
  }
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    float coverage = clamp(smoothstep(0.0, 0.5, peak) * mask * 0.94 + grain, 0.0, 1.0);
    vec3 chroma = sqrt(clamp(lit / max(max(lit.r, max(lit.g, lit.b)), 1e-6), 0.0, 1.0));
    chroma = pow(chroma, vec3(1.35));
    chroma /= max(max(chroma.r, max(chroma.g, chroma.b)), 1e-4);
    float saturation = 1.0 - min(chroma.r, min(chroma.g, chroma.b));
    chroma = mix(vec3(0.3), chroma, smoothstep(0.08, 0.35, saturation));
    outColor = vec4(chroma * coverage, coverage);
  } else {
    vec3 color = clamp(mapped + grain, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,dt=2.6,ht=9,me=Math.PI*2,_=(r,l,v)=>Math.min(v,Math.max(l,r)),Ie=(r,l,v)=>{let h=r.createShader(l);return h?(r.shaderSource(h,v),r.compileShader(h),r.getShaderParameter(h,r.COMPILE_STATUS)?h:(r.deleteShader(h),null)):null},$=(r,l)=>{let v=Ie(r,r.VERTEX_SHADER,st),h=Ie(r,r.FRAGMENT_SHADER,l),f=r.createProgram();if(!v||!h||!f)return null;if(r.attachShader(f,v),r.attachShader(f,h),r.bindAttribLocation(f,0,"aPosition"),r.linkProgram(f),r.deleteShader(v),r.deleteShader(h),!r.getProgramParameter(f,r.LINK_STATUS))return r.deleteProgram(f),null;let V={},J=r.getProgramParameter(f,r.ACTIVE_UNIFORMS);for(let D=0;D<J;D++){let F=r.getActiveUniform(f,D);F&&(V[F.name.replace(/\[0\]$/,"")]=r.getUniformLocation(f,F.name))}return{program:f,uniforms:V}},pt=({colors:r=["#ffffff"],backgroundColor:l="#94a3b8",speed:v=.3,streakCount:h=2,streakWidth:f=.8,streakLength:V=1,glow:J=1,density:D=.6,twinkle:F=.3,zoom:Be=3,backgroundGlow:Ue=.1,headGlow:Ne=.6,depth:Oe=.5,bloom:Ve=.35,opacity:We=1,mouseInteraction:ze=!0,mouseStrength:Ye=.4,mouseRadius:He=.45,mouseDampening:qe=.15,lens:je=.5,holdToWarp:Ze=!0,intro:$e=!0,fade:Ke=0,lightMode:Je=!1,mixBlendMode:pe,paused:Qe=!1,dpr:et,className:tt="",style:ot})=>{let xe=(0,g.useRef)(null),ge=(0,g.useRef)(null),Q=(0,g.useRef)(null),E=(0,g.useRef)(null),[rt,nt]=(0,g.useState)(0);return E.current={colors:(Array.isArray(r)&&r.length?r:["#ffffff"]).slice(0,fe).map(String),backgroundColor:String(l),speed:v,streakCount:Math.round(_(h,1,16)),streakWidth:Math.max(.05,f),streakLength:Math.max(.05,V),glow:Math.max(0,J),density:D,twinkle:_(F,0,1),zoom:Math.max(.1,Be),backgroundGlow:Math.max(0,Ue),headGlow:_(Ne,0,1),depth:Math.max(0,Oe),bloom:Math.max(0,Ve),opacity:_(We,0,1),mouseInteraction:ze,mouseStrength:Math.max(0,Ye),mouseRadius:Math.max(.01,He),mouseDampening:Math.max(0,qe),lens:_(je,0,1),holdToWarp:Ze,intro:$e,fade:_(Ke,0,1),lightMode:Je,paused:Qe,dpr:et},(0,g.useEffect)(()=>{let x=xe.current,m=ge.current,e=m?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!x||!m||!e)return;let ve=!!e.getExtension("EXT_color_buffer_float"),ee=$(e,ct),te=$(e,lt),W=$(e,ft),oe=$(e,mt);if(!ee||!te||!W||!oe)return;let be=t=>{t.preventDefault()},we=()=>nt(t=>t+1);m.addEventListener("webglcontextlost",be),m.addEventListener("webglcontextrestored",we);let Ee=e.createBuffer(),re=e.createVertexArray();e.bindVertexArray(re),e.bindBuffer(e.ARRAY_BUFFER,Ee),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let at=ve?e.RGBA16F:e.RGBA8,ne=ve?1:.25,ae=()=>({texture:null,framebuffer:e.createFramebuffer(),width:0,height:0}),X=ae(),z=Array.from({length:Xe},()=>[ae(),ae()]),ie=(t,o,a)=>{t.texture&&t.width===o&&t.height===a||(t.texture&&e.deleteTexture(t.texture),t.texture=e.createTexture(),t.width=o,t.height=a,e.bindTexture(e.TEXTURE_2D,t.texture),e.texStorage2D(e.TEXTURE_2D,1,at,o,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},I=(t,o)=>(e.bindFramebuffer(e.FRAMEBUFFER,t?t.framebuffer:null),e.viewport(0,0,t?t.width:m.width,t?t.height:m.height),e.useProgram(o.program),o.uniforms),S=(t,o)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,o)},C=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),ue=new Map,it=t=>{if(ue.has(t))return ue.get(t);let o=[1,1,1];if(C){C.clearRect(0,0,1,1),C.fillStyle="#ffffff",C.fillStyle=t,C.fillRect(0,0,1,1);let[a,d,B]=C.getImageData(0,0,1,1).data;o=[a/255,d/255,B/255]}return ue.set(t,o),o},Te=t=>it(t).map(o=>o*o),G=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,se=new Float32Array(fe*3),c={x:0,y:0,inside:!1,held:!1},n={travel:0,intro:E.current.intro&&!G?0:1,mouseX:0,mouseY:0,lensX:0,lensY:0,touch:0,warp:0},T=0,y=0,Y=!0,ce=()=>{let t=E.current,o=m.width,a=m.height,d=Math.max(1,x.clientWidth),B=Math.max(1,x.clientHeight);e.bindVertexArray(re),ie(X,o,a),z.forEach((i,s)=>{let w=Math.max(1,Math.round(d/2**(s+1))),A=Math.max(1,Math.round(B/2**(s+1)));ie(i[0],w,A),ie(i[1],w,A)});let U=n.intro,q=Math.min(1,U*2.2),L=1+5*Math.pow(1-U,2)+2.5*n.warp,R=Math.max(1,Math.floor(me*Math.max(t.density,.05)+.5)),P=me/R,N=9+n.travel,k=t.colors.map(Te);se.fill(0);for(let i=0;i<fe;i++)se.set(k[Math.min(i,k.length-1)],i*3);let j=i=>(2*i-o)/o,_e=i=>(2*i-a)/o,u=I(X,ee);if(e.uniform2f(u.uView,o,a),e.uniform1f(u.uZoom,t.zoom),e.uniform1f(u.uPhase,N%(16*P)),e.uniform1f(u.uTwinkleClock,N%me),e.uniform1f(u.uRings,R),e.uniform3fv(u.uColors,se),e.uniform1i(u.uColorCount,k.length),e.uniform1i(u.uStreakCount,t.streakCount),e.uniform1i(u.uColumns,t.streakWidth>1?2:1),e.uniform1f(u.uWidth,5e-4*t.streakWidth),e.uniform1f(u.uTail,19/(t.streakLength*L)),e.uniform1f(u.uTwinkle,t.twinkle),e.uniform1f(u.uHead,t.headGlow),e.uniform1f(u.uDepth,t.depth),e.uniform4f(u.uMouse,j(n.mouseX),_e(n.mouseY),t.mouseInteraction?t.mouseStrength*n.touch:0,t.mouseRadius),e.uniform3f(u.uLens,j(n.lensX),_e(n.lensY),t.mouseInteraction?.5*t.lens*n.touch:0),e.uniform1f(u.uLightMode,t.lightMode?1:0),e.uniform1f(u.uEncode,ne),e.drawArrays(e.TRIANGLES,0,3),t.bloom>0){let i=X;z.forEach(([s,w])=>{let A=I(s,te);S(0,i.texture),e.uniform1i(A.uSource,0),e.uniform2f(A.uTarget,s.width,s.height),e.uniform2f(A.uTexel,1/i.width,1/i.height),e.uniform1f(A.uLimit,4*ne),e.drawArrays(e.TRIANGLES,0,3);let M=I(w,W);S(0,s.texture),e.uniform1i(M.uSource,0),e.uniform2f(M.uTarget,w.width,w.height),e.uniform2f(M.uStep,1/s.width,0),e.drawArrays(e.TRIANGLES,0,3),M=I(s,W),S(0,w.texture),e.uniform1i(M.uSource,0),e.uniform2f(M.uTarget,s.width,s.height),e.uniform2f(M.uStep,0,1/w.height),e.drawArrays(e.TRIANGLES,0,3),i=s})}let p=I(null,oe);S(0,X.texture),e.uniform1i(p.uScene,0),z.forEach(([i],s)=>{S(s+1,i.texture),e.uniform1i(p[`uBloom${s}`],s+1)}),e.uniform2f(p.uView,o,a),e.uniform1f(p.uDecode,1/ne),e.uniform1f(p.uGlow,t.glow),e.uniform1f(p.uBloom,t.bloom),e.uniform1f(p.uPresence,q),e.uniform1f(p.uOpacity,t.opacity),e.uniform1f(p.uFade,t.fade),e.uniform1f(p.uLightMode,t.lightMode?1:0),e.uniform3fv(p.uTopColor,Te(t.backgroundColor)),e.uniform1f(p.uTopGlow,t.backgroundGlow),e.drawArrays(e.TRIANGLES,0,3);for(let i=Xe;i>=0;i--)S(i,null)},Re=t=>{if(T=0,!Y||document.hidden)return;let o=E.current,a=y?Math.min(.05,(t-y)/1e3):1/60;y=t,!o.intro||G?n.intro=1:n.intro<1&&(n.intro=Math.min(1,n.intro+a/dt));let d=o.holdToWarp&&c.held&&c.inside&&!G;n.warp+=((d?1:0)-n.warp)*(1-Math.exp(-a*(d?2.2:1.6)));let B=ht*Math.pow(1-n.intro,2)+6*n.warp,U=!o.paused&&!G;U&&(n.travel+=a*.1*o.speed*(1+B));let q=m.width/Math.max(1,x.clientWidth),L=c.x*q,R=(x.clientHeight-c.y)*q,P=o.mouseInteraction&&c.inside&&!G;P&&n.touch<.01&&(n.mouseX=L,n.mouseY=R,n.lensX=L,n.lensY=R);let N=o.mouseDampening>0?1-Math.exp(-a/o.mouseDampening):1;n.mouseX+=(L-n.mouseX)*N,n.mouseY+=(R-n.mouseY)*N;let k=1-Math.exp(-a*6);n.lensX+=(L-n.lensX)*k,n.lensY+=(R-n.lensY)*k,n.touch+=((P?1:0)-n.touch)*(1-Math.exp(-a*(P?4:2))),ce();let j=n.intro<1||n.warp>.001||Math.abs((P?1:0)-n.touch)>.002;U&&o.speed!==0||j?T=requestAnimationFrame(Re):y=0},b=()=>{!T&&Y&&!document.hidden&&(T=requestAnimationFrame(Re))},le=()=>{let t=E.current,o=Math.max(1,x.clientWidth),a=Math.max(1,x.clientHeight),d=Math.min(t.dpr||window.devicePixelRatio||1,2);m.width=Math.max(1,Math.round(o*d)),m.height=Math.max(1,Math.round(a*d)),T||ce(),b()},Ae=t=>{let o=x.getBoundingClientRect(),a=t.clientX-o.left,d=t.clientY-o.top;return{x:a,y:d,inside:a>=0&&d>=0&&a<=o.width&&d<=o.height}},Me=t=>{let o=Ae(t);c.x=o.x,c.y=o.y,c.inside=o.inside,b()},Se=t=>{let o=Ae(t);o.inside&&(c.x=o.x,c.y=o.y,c.inside=!0,c.held=!0,b())},H=()=>{c.held=!1,b()},Ce=()=>{c.inside=!1,c.held=!1,b()},ye=()=>{y=0,b()},Le=new ResizeObserver(le);Le.observe(x);let Pe=new IntersectionObserver(t=>{Y=t.some(o=>o.isIntersecting),Y&&(y=0,b())});Pe.observe(x),window.addEventListener("pointermove",Me,{passive:!0}),window.addEventListener("pointerdown",Se,{passive:!0}),window.addEventListener("pointerup",H,{passive:!0}),window.addEventListener("pointercancel",H,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ce),document.addEventListener("visibilitychange",ye),le();let ke=E.current.dpr;return Q.current=()=>{let t=E.current;if(t.dpr!==ke){ke=t.dpr,le();return}T||ce(),b()},()=>{cancelAnimationFrame(T),Q.current=null,m.removeEventListener("webglcontextlost",be),m.removeEventListener("webglcontextrestored",we),Le.disconnect(),Pe.disconnect(),window.removeEventListener("pointermove",Me),window.removeEventListener("pointerdown",Se),window.removeEventListener("pointerup",H),window.removeEventListener("pointercancel",H),document.documentElement.removeEventListener("pointerleave",Ce),document.removeEventListener("visibilitychange",ye),[X,...z.flat()].forEach(t=>{t.texture&&e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}),[ee,te,W,oe].forEach(t=>e.deleteProgram(t.program)),e.deleteBuffer(Ee),e.deleteVertexArray(re),e.isContextLost()||e.getExtension("WEBGL_lose_context")?.loseContext()}},[rt]),(0,g.useEffect)(()=>{Q.current?.()}),(0,de.jsx)("div",{ref:xe,className:`relative w-full h-full overflow-hidden ${tt}`,style:{...pe?{mixBlendMode:pe}:null,...ot},children:(0,de.jsx)("canvas",{ref:ge,className:"absolute inset-0 block w-full h-full","aria-hidden":"true"})})},Ge=pt;var he=O(Z(),1),xt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],K=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Rt=xt.map((r,l)=>({id:l+1,image:r,src:r,img:r,url:r,title:K[l],text:K[l],label:K[l],alt:K[l],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][l],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function gt({big:r}){return(0,he.jsx)(Fe,{big:r,dark:!0,center:!1,zoom:1,drive:!1,children:(0,he.jsx)(Ge,{})})}var At=De(gt);export{At as default};
