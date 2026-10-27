import{c as D,i as Ne,j as Y,l as ye,m as Ee}from"./chunks/chunk-6IYH4WPJ.js";var x=D(Ne(),1),oe=D(Y(),1),Oe=24e5,Se=4,Te=1/120,Ge=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,Ye=`#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uSize;
uniform vec4 uStroke;
uniform vec2 uImpulse;
out vec4 fragColor;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * t);
}

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;
  vec2 state = texture(uState, uv).rg;
  vec2 around =
    texture(uState, uv - vec2(texel.x, 0.0)).rg +
    texture(uState, uv + vec2(texel.x, 0.0)).rg +
    texture(uState, uv - vec2(0.0, texel.y)).rg +
    texture(uState, uv + vec2(0.0, texel.y)).rg -
    4.0 * state;
  float next = state.r + (state.r - state.g) * 0.982 + 0.3 * around.r + 0.08 * (around.r - around.g);
  next *= 0.998;
  if (uImpulse.x != 0.0) {
    float d = segment(gl_FragCoord.xy, uStroke.xy, uStroke.zw) / uImpulse.y;
    next += uImpulse.x * exp(-d * d);
  }
  fragColor = vec4(next, state.r, 0.0, 1.0);
}`,Ve=`#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uSize;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;
  float left = texture(uState, uv - vec2(texel.x, 0.0)).r;
  float right = texture(uState, uv + vec2(texel.x, 0.0)).r;
  float down = texture(uState, uv - vec2(0.0, texel.y)).r;
  float up = texture(uState, uv + vec2(0.0, texel.y)).r;
  fragColor = vec4((right - left) * 0.5, (up - down) * 0.5, 0.0, 1.0);
}`,He=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uUnit;
uniform float uTime;
uniform float uAmplitude;
uniform vec2 uFrequency;
uniform float uDetail;
uniform float uSharpness;
uniform float uDepth;
uniform float uPresence;
uniform vec3 uTint;
uniform vec2 uShift;
uniform float uRoughness;
uniform float uExposure;
uniform float uLight;
uniform sampler2D uSlope;
uniform vec2 uSlopeSize;
uniform float uRipple;
out vec4 fragColor;

vec2 slopeAt(vec2 uv) {
  vec2 st = uv * uSlopeSize - 0.5;
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
  vec2 h0 = (i - 0.5 + w1 / g0) / uSlopeSize;
  vec2 h1 = (i + 1.5 + w3 / g1) / uSlopeSize;
  vec2 a = texture(uSlope, vec2(h0.x, h0.y)).rg;
  vec2 b = texture(uSlope, vec2(h1.x, h0.y)).rg;
  vec2 c = texture(uSlope, vec2(h0.x, h1.y)).rg;
  vec2 d = texture(uSlope, vec2(h1.x, h1.y)).rg;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

float lamp(vec2 p, vec2 center, vec2 size, float soft) {
  vec2 grown = size + soft;
  vec2 q = (p - center) / grown;
  q *= q;
  float d = sqrt(sqrt(dot(q, q)));
  float edge = soft / min(grown.x, grown.y);
  float shape = (1.0 - smoothstep(1.0 - edge, 1.0 + edge, d)) * (1.0 - 0.45 * d * d);
  return shape * size.x * size.y / (grown.x * grown.y);
}

vec3 studio(vec3 r, float blur) {
  vec2 p = r.xy / max(r.z + 1.0, 0.05);
  p += uShift * smoothstep(0.3, 1.0, length(p));
  float radius = length(p);
  float soft = 0.008 + blur;
  vec2 dir = p / max(radius, 1e-3);
  float key = lamp(p, vec2(-0.25, 0.42), vec2(0.3, 0.12), soft);
  float side = lamp(p, vec2(0.48, 0.12), vec2(0.06, 0.3), soft);
  float ground = lamp(p, vec2(-0.1, -0.55), vec2(0.45, 0.06), soft);
  float rise = smoothstep(-1.0, 1.0, dir.y);
  if (uLight > 0.5) {
    float edge = 0.008 + blur * 0.8;
    float lobe = smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(atan(dir.y, dir.x) * 2.0 + 0.9));
    float tone = mix(2.4, 0.95, smoothstep(0.5 - edge, 1.0 + edge, radius));
    tone = mix(tone, 0.02, smoothstep(0.98 - edge, 1.12 + edge, radius));
    tone = mix(tone, mix(0.03, 0.3, lobe) * (0.8 + 0.4 * rise), smoothstep(1.15 - edge, 1.3 + edge, radius));
    float width = 0.035 + edge;
    tone += 2.4 * exp(-pow((radius - 1.4) / width, 2.0)) * min(1.0, 0.06 / width) * (0.6 + 0.4 * rise);
    return vec3(tone) * (1.0 - 0.5 * side) * (1.0 - 0.3 * ground) + 0.8 * key;
  }
  float width = 0.015 + soft * 2.0;
  float rim = exp(-abs(radius - 1.0) / width) * 0.031 / width * (0.8 + smoothstep(-0.5, 0.8, p.y));
  float band = 1.0 - 0.95 * smoothstep(1.04 - soft, 1.12 + soft, radius);
  float wall = smoothstep(1.25, 1.55, radius) * (0.6 + 0.4 * rise);
  float streak = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(atan(dir.y, dir.x) * 3.0 + 0.6));
  vec3 color = vec3(0.004, 0.004, 0.005) + 0.02 * smoothstep(-0.4, 0.6, p.y);
  color += vec3(1.0, 0.97, 0.94) * key * 4.0 + vec3(0.9, 0.95, 1.0) * side * 3.0 + ground * 1.2;
  color += vec3(1.0, 0.98, 0.95) * rim;
  color *= band;
  return color + vec3(mix(0.45, 1.8, streak)) * wall;
}

vec3 shade(vec2 slope, vec3 v, float blur, vec3 f0) {
  float steep = length(slope);
  slope *= 3.0 * tanh(steep / 3.0) / max(steep, 1e-6);
  vec3 n = normalize(vec3(-slope, 1.0));
  vec3 r = reflect(v, n);
  float facing = clamp(dot(n, -v), 0.0, 1.0);
  return studio(r, blur) * (f0 + (1.0 - f0) * pow(1.0 - facing, 5.0));
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (2.0 * frag - uResolution) / uUnit;
  vec2 p = uv;
  vec2 rowX = vec2(1.0, 0.0);
  vec2 rowY = vec2(0.0, 1.0);
  float amplitude = uAmplitude * uPresence;
  for (float i = 1.0; i < 9.0; i++) {
    if (i > uDetail) break;
    float a = amplitude / i;
    float soften = exp(0.3 - 0.3 * i);
    float argX = i * uFrequency.x * p.y + uTime;
    p.x += a * cos(argX);
    rowX -= a * sin(argX) * i * uFrequency.x * soften * rowY;
    float argY = i * uFrequency.y * p.x + uTime;
    p.y += a * cos(argY);
    rowY -= a * sin(argY) * i * uFrequency.y * soften * rowX;
  }
  float phase = uTime - p.x - p.y;
  vec2 field = -(rowX + rowY);
  float density = max(length(field), 1e-3);
  vec2 across = field / density;
  float k = uSharpness;
  float sn = sin(phase);
  float cs = cos(phase);
  float th = tanh(k * sn);
  float bevel = (1.0 - th * th) / tanh(k);
  float fade = smoothstep(3.0, 9.0, 3.14159 * uUnit / density);
  float weight = uDepth * uPresence * fade;
  vec2 slope = k * cs * bevel * weight * across + slopeAt(frag / uResolution) * uRipple;
  vec2 sweep = -k * bevel * (sn + 2.0 * k * cs * cs * th) * weight * density * 2.0 / uUnit * across;
  vec2 stepX = dFdx(slope);
  vec2 stepY = dFdy(slope);
  vec2 crease = dot(stepX, stepX) > dot(stepY, stepY) ? stepX : stepY;
  if (dot(crease, crease) > dot(sweep, sweep)) sweep = crease;
  float bend = length(sweep);
  float alpha = smoothstep(0.0, 0.1, length(slope));
  vec3 f0 = mix(vec3(1.0), uTint, smoothstep(0.05, 0.6, length(slope))) * 0.92;
  vec3 v = normalize(vec3(uv * 0.08, -1.0));
  float blur = uRoughness * 0.35;
  vec3 light;
  if (bend < 0.01) {
    light = shade(slope, v, blur + bend * 0.5, f0);
  } else {
    light = vec3(0.0);
    for (float t = -0.375; t < 0.4; t += 0.25) {
      light += shade(slope + sweep * t, v, blur + bend * 0.15, f0);
    }
    light *= 0.25;
  }
  vec3 color = pow(aces(light * uExposure), vec3(1.0 / 2.2));
  float grain = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715))));
  color += (grain - 0.5) / 255.0;
  fragColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha);
}`,p=(n,s,c)=>Math.min(c,Math.max(s,n)),We=n=>{if(Array.isArray(n))return[0,1,2].map(a=>p(Number(n[a])||0,0,1));let s=String(n||"").trim(),c=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);if(c){let a=c[1].length===3?c[1].replace(/./g,h=>h+h):c[1];return[0,2,4].map(h=>parseInt(a.slice(h,h+2),16)/255)}let i=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);return i?[i[1],i[2],i[3]].map(a=>p(parseFloat(a)/255,0,1)):[1,1,1]},Re=(n,s,c)=>{let i=n.createShader(s);return i?(n.shaderSource(i,c),n.compileShader(i),n.getShaderParameter(i,n.COMPILE_STATUS)?i:(console.error(n.getShaderInfoLog(i)),n.deleteShader(i),null)):null},re=(n,s)=>{let c=Re(n,n.VERTEX_SHADER,Ge),i=Re(n,n.FRAGMENT_SHADER,s),a=c&&i?n.createProgram():null;if(!c||!i||!a)return c&&n.deleteShader(c),i&&n.deleteShader(i),null;if(n.attachShader(a,c),n.attachShader(a,i),n.linkProgram(a),n.deleteShader(c),n.deleteShader(i),!n.getProgramParameter(a,n.LINK_STATUS))return console.error(n.getProgramInfoLog(a)),n.deleteProgram(a),null;let h={},H=n.getProgramParameter(a,n.ACTIVE_UNIFORMS);for(let _=0;_<H;_++){let P=n.getActiveUniform(a,_);P&&(h[P.name]=n.getUniformLocation(a,P.name))}return{program:a,uniforms:h}},$e=({color:n="#ffffff",speed:s=.2,amplitude:c=.3,frequencyX:i=3,frequencyY:a=3,detail:h=4,thickness:H=1,depth:_=1,roughness:P=.3,exposure:Fe=1,interactive:Ae=!0,rippleStrength:Le=1,rippleSize:_e=1,tilt:Pe=1,intro:Ue=!0,lightMode:Ie=!1,maxDevicePixelRatio:De=2,className:Xe="",style:ze})=>{let ie=(0,x.useRef)(null),ae=(0,x.useRef)(null),W=(0,x.useRef)(null),[se,Ce]=(0,x.useState)(0),ce={tint:We(n).map(S=>Math.pow(S,2.2)),speed:Math.max(0,s),amplitude:p(c,0,2),frequency:[Math.max(.1,i),Math.max(.1,a)],detail:p(Math.round(h),1,8),thickness:p(H,.25,4),depth:Math.max(0,_),roughness:p(P,0,1),exposure:Math.max(0,Fe),interactive:Ae,rippleStrength:Math.max(0,Le),rippleSize:p(_e,.2,4),tilt:Math.max(0,Pe),intro:Ue,light:Ie,maxRatio:p(De,.5,3)},F=(0,x.useRef)(ce);return F.current=ce,(0,x.useEffect)(()=>{W.current?.()}),(0,x.useEffect)(()=>{let S=ie.current,l=ae.current;if(!S||!l)return;let e=l.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),X=e?re(e,He):null;if(!e||!X)return;let $=!!e.getExtension("EXT_color_buffer_float"),v=$?re(e,Ye):null,T=$?re(e,Ve):null,z=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ue=e.createVertexArray(),m={width:1,height:1},b=[],g=null,U=0,fe=1,u={x:0,y:0,inside:!1,ready:!1,nx:0,ny:0},f={yaw:0,pitch:0,vyaw:0,vpitch:0},I=[],C=Math.random()*40,k=F.current.intro&&!z&&se===0?0:1,q=0,K=0,R=0,B=0,J=!0,Q=document.visibilityState!=="hidden",Z=!1,j=(o,r)=>{let t=e.createTexture();e.bindTexture(e.TEXTURE_2D,t),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,o,r,0,e.RG,e.HALF_FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let d=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,d),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null),{texture:t,framebuffer:d}},N=o=>{o&&(e.deleteTexture(o.texture),e.deleteFramebuffer(o.framebuffer))},ee=()=>{let o=F.current,r=S.getBoundingClientRect(),t=Math.max(1,r.width),d=Math.max(1,r.height),M=Math.min(window.devicePixelRatio||1,o.maxRatio,Math.sqrt(Oe/(t*d))),A=Math.max(1,Math.round(t*M)),L=Math.max(1,Math.round(d*M));if((l.width!==A||l.height!==L)&&(l.width=A,l.height=L),fe=Math.min(A,L),!$||!v||!T)return;let w=p(Math.round(t/Se),16,512),E=p(Math.round(d/Se),16,512);w===m.width&&E===m.height&&b.length||(b.forEach(N),b.length=0,N(g),Object.assign(m,{width:w,height:E}),b.push(j(w,E),j(w,E)),g=j(w,E))},ke=o=>{if(!(!v||!T||!g)){e.useProgram(v.program),e.viewport(0,0,m.width,m.height),e.uniform2f(v.uniforms.uSize,m.width,m.height),e.activeTexture(e.TEXTURE0),e.uniform1i(v.uniforms.uState,0);for(let r=0;r<o;r++){let t=r===0?I.shift():null;t?(e.uniform4f(v.uniforms.uStroke,t.ax,t.ay,t.bx,t.by),e.uniform2f(v.uniforms.uImpulse,t.strength,t.radius)):e.uniform2f(v.uniforms.uImpulse,0,1);let d=b[U],M=b[1-U];e.bindTexture(e.TEXTURE_2D,d.texture),e.bindFramebuffer(e.FRAMEBUFFER,M.framebuffer),e.drawArrays(e.TRIANGLES,0,3),U=1-U}e.useProgram(T.program),e.uniform2f(T.uniforms.uSize,m.width,m.height),e.uniform1i(T.uniforms.uState,0),e.bindTexture(e.TEXTURE_2D,b[U].texture),e.bindFramebuffer(e.FRAMEBUFFER,g.framebuffer),e.drawArrays(e.TRIANGLES,0,3)}},qe=o=>{e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,l.width,l.height);let r=X.uniforms;e.useProgram(X.program),e.uniform2f(r.uResolution,l.width,l.height),e.uniform1f(r.uUnit,fe),e.uniform1f(r.uTime,C),e.uniform1f(r.uAmplitude,o.amplitude),e.uniform2f(r.uFrequency,o.frequency[0],o.frequency[1]),e.uniform1f(r.uDepth,o.depth),e.uniform1f(r.uDetail,o.detail),e.uniform1f(r.uSharpness,5/(3*o.thickness)),e.uniform1f(r.uPresence,1-Math.pow(1-k,3)),e.uniform3fv(r.uTint,o.tint),e.uniform2f(r.uShift,f.yaw,f.pitch),e.uniform1f(r.uRoughness,o.roughness),e.uniform1f(r.uExposure,o.exposure),e.uniform1f(r.uLight,o.light?1:0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,g?g.texture:null),e.uniform1i(r.uSlope,0),e.uniform2f(r.uSlopeSize,m.width,m.height),e.uniform1f(r.uRipple,g?o.rippleStrength*2.2:0),e.drawArrays(e.TRIANGLES,0,3)},le=o=>{if(R=0,Z)return;let r=F.current,t=p((o-B)/1e3||0,0,.05);B=Math.max(B,o),C+=t*r.speed*(z?.25:1),k=Math.min(1,k+t/1.8);let d=r.interactive&&u.inside,M=z?0:r.tilt,A=(d?u.nx*.35:.22*Math.sin(C*1.3))*M,L=(d?-u.ny*.28:.16*Math.sin(C*.9+1.7))*M,w=36,E=2*Math.sqrt(w)*.95;if(f.vyaw+=((A-f.yaw)*w-f.vyaw*E)*t,f.vpitch+=((L-f.pitch)*w-f.vpitch*E)*t,f.yaw+=f.vyaw*t,f.pitch+=f.vpitch*t,e.bindVertexArray(ue),g){K+=t;let G=Math.min(4,Math.floor(K/Te));K-=G*Te,G>0&&(ke(G),q=Math.max(0,q*Math.pow(.982,G)))}qe(r);let Be=Math.abs(f.vyaw)+Math.abs(f.vpitch)>1e-4||Math.abs(A-f.yaw)+Math.abs(L-f.pitch)>1e-4;(r.speed>0||k<1||Be||q>.002||I.length>0)&&J&&Q&&(R=requestAnimationFrame(le))},y=()=>{R||Z||!J||!Q||(B=performance.now(),R=requestAnimationFrame(le))};W.current=()=>{ee(),y()};let de=(o,r)=>{let t=S.getBoundingClientRect();return{x:(o-t.left)/t.width*m.width,y:(1-(r-t.top)/t.height)*m.height,nx:(o-t.left)/t.width*2-1,ny:(r-t.top)/t.height*2-1,inside:o>=t.left&&o<=t.right&&r>=t.top&&r<=t.bottom}},me=(o,r)=>{!g||!r.interactive||z||(I.push(o),I.length>6&&I.shift(),q=1)},pe=o=>{let r=F.current,t=de(o.clientX,o.clientY);if(u.nx=p(t.nx,-1,1),u.ny=p(t.ny,-1,1),u.inside=t.inside,t.inside&&u.ready){let d=Math.hypot(t.x-u.x,t.y-u.y);d>.25&&me({ax:u.x,ay:u.y,bx:t.x,by:t.y,strength:-Math.min(.45,.04+d*.045)*r.rippleSize,radius:4*r.rippleSize},r)}u.x=t.x,u.y=t.y,u.ready=t.inside,y()},he=o=>{let r=F.current,t=de(o.clientX,o.clientY);t.inside&&(me({ax:t.x,ay:t.y,bx:t.x,by:t.y,strength:-1.6*r.rippleSize,radius:6*r.rippleSize},r),y())},te=()=>{u.inside=!1,u.ready=!1,y()},O=o=>{o.pointerType!=="mouse"&&te()};window.addEventListener("pointermove",pe,{passive:!0}),window.addEventListener("pointerdown",he,{passive:!0}),window.addEventListener("pointerup",O,{passive:!0}),window.addEventListener("pointercancel",O,{passive:!0}),document.documentElement.addEventListener("pointerleave",te);let ve=o=>{o.preventDefault(),Z=!0,cancelAnimationFrame(R),R=0},ge=()=>Ce(o=>o+1);l.addEventListener("webglcontextlost",ve),l.addEventListener("webglcontextrestored",ge);let xe=new ResizeObserver(()=>{ee(),y()});xe.observe(S);let we=new IntersectionObserver(o=>{J=o.some(r=>r.isIntersecting),y()});we.observe(S);let be=()=>{Q=document.visibilityState!=="hidden",y()};return document.addEventListener("visibilitychange",be),ee(),y(),()=>{cancelAnimationFrame(R),W.current=null,xe.disconnect(),we.disconnect(),window.removeEventListener("pointermove",pe),window.removeEventListener("pointerdown",he),window.removeEventListener("pointerup",O),window.removeEventListener("pointercancel",O),document.documentElement.removeEventListener("pointerleave",te),document.removeEventListener("visibilitychange",be),l.removeEventListener("webglcontextlost",ve),l.removeEventListener("webglcontextrestored",ge),e.isContextLost()||(b.forEach(N),N(g),e.deleteVertexArray(ue),e.deleteProgram(X.program),v&&e.deleteProgram(v.program),T&&e.deleteProgram(T.program))}},[se]),(0,oe.jsx)("div",{ref:ie,className:`relative h-full w-full overflow-hidden ${Xe}`.trim(),style:ze,children:(0,oe.jsx)("canvas",{ref:ae,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Me=$e;var ne=D(Y(),1),Ke=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],V=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ot=Ke.map((n,s)=>({id:s+1,image:n,src:n,img:n,url:n,title:V[s],text:V[s],label:V[s],alt:V[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Je({big:n}){return(0,ne.jsx)(Ee,{big:n,dark:!0,center:!1,zoom:1,drive:!1,children:(0,ne.jsx)(Me,{})})}var nt=ye(Je);export{nt as default};
