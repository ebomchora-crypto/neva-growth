import{c as V,i as ft,j as re,l as Be,m as Ue}from"./chunks/chunk-6IYH4WPJ.js";var A=V(ft(),1),he=V(re(),1),S=1/3,K=1,st=2.4,ct=38*Math.PI/180,Ge={up:[0,1],down:[0,-1],left:[-1,0],right:[1,0],none:[0,0]},lt=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,dt=`#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uGridOrigin;
uniform float uCell;
uniform float uDt;
uniform float uTime;
uniform vec2 uFlow;
uniform float uTurbulence;
uniform float uMagnetism;
uniform float uFieldScale;
uniform vec2 uSeed;
uniform vec4 uCursor;
uniform vec4 uPulse;
uniform float uPulseSpeed;
uniform float uPulseWidth;
uniform vec3 uIntro;
uniform float uSpikeHeight;
uniform float uMound;
uniform float uStiffness;
uniform float uDamping;
uniform float uSettle;
out vec4 outState;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float flowField(vec2 p) {
  vec2 q = p / uFieldScale + uSeed;
  vec2 drift = uFlow * uTime * 0.55;
  vec2 warp = vec2(noise(q * 0.6 + vec2(uTime * 0.07, 3.1)), noise(q * 0.6 - vec2(7.3, uTime * 0.06))) - 0.5;
  vec2 r = q + warp * 1.8 * uTurbulence - drift;
  float n = noise(r) * 0.65 + noise(r * 2.03 + 11.7 - drift * 0.5) * 0.35;
  return smoothstep(0.44, 0.86, n);
}

void main() {
  vec2 texel = floor(gl_FragCoord.xy);
  vec2 p = uGridOrigin + (texel + 0.5) * uCell;
  vec4 prev = texelFetch(uState, ivec2(texel), 0);
  float swell = flowField(p);
  float field = uMagnetism * (0.03 + 1.0 * swell * swell);
  vec2 dc = p - uCursor.xy;
  float falloff = dot(dc, dc) / (uCursor.w * uCursor.w);
  field += uCursor.z * exp(-falloff);
  float mound = uCursor.z * exp(-falloff / 2.2);
  if (uPulse.w > 0.0) {
    float ring = length(p - uPulse.xy) - uPulse.z * uPulseSpeed;
    float envelope = smoothstep(0.0, 0.08, uPulse.z) * exp(-uPulse.z * 1.1);
    field += uPulse.w * envelope * exp(-ring * ring / (uPulseWidth * uPulseWidth));
  }
  float front = clamp((uIntro.z - length(p - uIntro.xy)) / 3.0, 0.0, 1.0);
  front = front * front * (3.0 - 2.0 * front);
  float target = uSpikeHeight * min(pow(max(field * front - 0.04, 0.0), 1.6), 1.0);
  float height = prev.x;
  float velocity = prev.y;
  if (uSettle > 0.5) {
    height = target;
    velocity = 0.0;
  } else {
    float steps = ceil(uDt / 0.008);
    float h = uDt / steps;
    for (int k = 0; k < 8; k++) {
      if (float(k) >= steps) break;
      velocity += (uStiffness * (target - height) - uDamping * velocity) * h;
      height += velocity * h;
    }
    if (height < 0.0) {
      height = 0.0;
      velocity = max(velocity, 0.0);
    }
  }
  outState = vec4(height, velocity, mound * front * uMound, 1.0);
}`,mt=`#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uGridOrigin;
uniform float uCell;
uniform vec2 uStateSize;
uniform float uBoundCell;
out vec4 outBound;

void main() {
  vec2 center = uGridOrigin + (floor(gl_FragCoord.xy) + 0.5) * uBoundCell;
  vec2 base = floor((center - uGridOrigin) / uCell);
  float top = 0.0;
  float peak = 0.0;
  for (int y = -4; y <= 4; y++) {
    for (int x = -4; x <= 4; x++) {
      vec2 texel = clamp(base + vec2(float(x), float(y)), vec2(0.0), uStateSize - 1.0);
      vec4 s = texelFetch(uState, ivec2(texel), 0);
      top = max(top, max(s.x, 0.0) * 1.05 + s.z);
      peak = max(peak, s.x);
    }
  }
  outBound = vec4(top, peak, 0.0, 1.0);
}`,pt=`#version 300 es
precision highp float;
uniform sampler2D uField;
uniform sampler2D uBound;
uniform vec2 uGridOrigin;
uniform vec2 uGridSpan;
uniform vec2 uBoundSpan;
uniform float uCellSize;
uniform vec2 uResolution;
uniform vec3 uCamera;
uniform vec3 uForward;
uniform vec3 uUpward;
uniform float uTanHalf;
uniform float uPixelAngle;
uniform float uFar;
uniform float uFogStart;
uniform float uTop;
uniform float uBottom;
uniform float uTime;
uniform vec4 uCursor;
uniform float uMound;
uniform float uRound;
uniform float uSpan;
uniform float uExponent;
uniform float uWarp;
uniform vec3 uKey;
uniform vec3 uStrip;
uniform vec3 uFill;
uniform float uExposure;
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBase;
uniform float uOpacity;
out vec4 outColor;

const float G = 7.2551975;
const vec2 E1 = vec2(0.8660254, 0.5);
const vec2 E2 = vec2(-0.8660254, 0.5);
const vec2 E3 = vec2(0.0, -1.0);
const mat2 TURN = mat2(0.9902681, 0.1391731, -0.1391731, 0.9902681);
const float F0 = 0.06;

vec3 mound(vec2 p) {
  vec2 d = p - uCursor.xy;
  float inv = 1.0 / (uCursor.w * uCursor.w * 2.2);
  float e = uCursor.z * exp(-dot(d, d) * inv);
  return vec3(e, -2.0 * inv * e * d) * uMound;
}

vec2 lattice(vec2 p) {
  vec2 q = TURN * p;
  float t = uTime * 0.35;
  return q + uWarp * vec2(sin(q.y * 0.9 + t), cos(q.x * 0.8 - t * 0.8));
}

float detail(float t) {
  return smoothstep(3.0, 8.0, 1.0 / max(t * uPixelAngle, 1e-5)) * (1.0 - smoothstep(uFogStart, mix(uFogStart, uFar, 0.7), t));
}

float profile(float u, out float rate) {
  float root = sqrt(max(1.0 - u, 0.0) + uRound * uRound);
  rate = 0.5 / (uSpan * root);
  return clamp(1.0 - (root - uRound) / uSpan, 0.0, 1.0);
}

float spikes(vec2 p, float a, float rise, out float clearance) {
  clearance = 10.0;
  if (a < 0.002) return 0.0;
  vec2 q = lattice(p);
  float u = (cos(G * dot(E1, q)) + cos(G * dot(E2, q)) + cos(G * dot(E3, q)) + 1.5) / 4.5;
  if (a > 0.05) {
    float root = uRound + (1.0 - pow(clamp(rise / a, 0.0, 1.0), 1.0 / uExponent)) * uSpan;
    clearance = sqrt(max(1.0 - u, 0.0) / 8.77) - sqrt(max(root * root - uRound * uRound, 0.0) / 8.77);
  }
  float rate;
  return a * pow(profile(u, rate), uExponent);
}

vec2 spikesSlope(vec2 p, float a, vec2 aSlope) {
  if (a < 0.002) return vec2(0.0);
  vec2 q = lattice(p);
  float c1 = G * dot(E1, q);
  float c2 = G * dot(E2, q);
  float c3 = G * dot(E3, q);
  float u = (cos(c1) + cos(c2) + cos(c3) + 1.5) / 4.5;
  vec2 du = -(G / 4.5) * (sin(c1) * E1 + sin(c2) * E2 + sin(c3) * E3) * TURN;
  float rate;
  float s = max(profile(u, rate), 1e-4);
  float shape = pow(s, uExponent);
  return a * uExponent * shape / s * rate * du + aSlope * shape;
}

float surface(vec2 p, float z, float t, out float clearance) {
  vec4 f = texture(uField, (p - uGridOrigin) / uGridSpan);
  return f.z + spikes(p, f.x * detail(t), z - f.z, clearance);
}

vec2 bound(vec2 p) {
  return texture(uBound, (p - uGridOrigin) / uBoundSpan).rg;
}

float panel(vec3 r, vec3 dir, vec3 up, vec2 extent, float soft) {
  vec3 side = normalize(cross(dir, up));
  vec3 top = cross(side, dir);
  float facing = dot(r, dir);
  if (facing <= 0.0) return 0.0;
  vec2 q = vec2(dot(r, side), dot(r, top)) / facing;
  vec2 e = smoothstep(extent + soft, extent - soft, abs(q));
  return e.x * e.y;
}

vec3 studio(vec3 r, vec3 rd, float soft) {
  vec3 z = vec3(0.0, 0.0, 1.0);
  vec3 col = uKey * 4.2 * panel(r, normalize(vec3(-0.3, -0.5, 0.81)), z, vec2(0.36, 0.22), 0.08 + soft);
  col += uStrip * 1.5 * panel(r, normalize(vec3(-0.9, -0.2, 0.38)), z, vec2(0.12, 0.7), 0.07 + soft);
  col += uStrip * 1.5 * panel(r, normalize(vec3(0.9, -0.1, 0.42)), z, vec2(0.12, 0.7), 0.07 + soft);
  float lift = asin(clamp(r.z, -1.0, 1.0)) - asin(clamp(-rd.z, -1.0, 1.0));
  col += uFill * 0.45 * smoothstep(0.08 - soft, 0.7 + soft, lift) * smoothstep(1.6, 1.0, lift);
  return col;
}

vec4 finish(vec3 light, vec3 paper, float alpha) {
  if (uLight > 0.5) {
    if (uOpaque > 0.5) return vec4(mix(uBase, paper, alpha) * uOpacity, uOpacity);
    vec3 shade = mix(vec3(1.0), paper, alpha * uOpacity);
    float cover = 1.0 - min(shade.r, min(shade.g, shade.b));
    return vec4(shade - (1.0 - cover), cover);
  }
  vec3 glow = light * alpha * uOpacity;
  if (uOpaque > 0.5) return vec4(uBase + glow, 1.0);
  return vec4(glow, max(glow.r, max(glow.g, glow.b)));
}

void main() {
  vec2 ndc = (gl_FragCoord.xy - 0.5 * uResolution) / (0.5 * uResolution.y);
  vec3 side = normalize(cross(uForward, uUpward));
  vec3 rd = normalize(uForward + (ndc.x * side + ndc.y * uUpward) * uTanHalf);
  if (rd.z > -0.004) {
    outColor = finish(vec3(0.0), vec3(1.0), 0.0);
    return;
  }
  float tTop = max((uTop - uCamera.z) / rd.z, 0.0);
  float tEnd = min((uBottom - uCamera.z) / rd.z, uFar);
  if (tTop >= tEnd) {
    outColor = finish(vec3(0.0), vec3(1.0), 0.0);
    return;
  }
  float sink = max(-rd.z, 0.2);
  float glide = max(length(rd.xy), 0.05);
  float chunk = 0.9 / glide;
  float t = tEnd;
  float tPrev = tEnd;
  bool found = false;
  bool smoothHit = false;
  float t0 = tTop;
  vec2 b0 = bound(uCamera.xy + rd.xy * t0);
  for (int c = 0; c < 64; c++) {
    if (t0 >= tEnd) break;
    float t1 = min(t0 + chunk, tEnd);
    vec2 b1 = bound(uCamera.xy + rd.xy * t1);
    float b = max(b0.x, b1.x) + 0.03;
    float z1 = uCamera.z + rd.z * t1;
    if (z1 > b) {
      t0 = t1;
      b0 = b1;
      continue;
    }
    float tt = max(t0, (b - uCamera.z) / rd.z);
    if (max(b0.y, b1.y) < 0.002) {
      for (int k = 0; k < 3; k++) {
        vec3 probe = uCamera + rd * tt;
        tt += (probe.z - mound(probe.xy).x) / sink * 0.95;
      }
      if (tt <= t1 + 0.02 || t1 >= tEnd) {
        t = tt;
        smoothHit = true;
        break;
      }
      t0 = t1;
      b0 = b1;
      continue;
    }
    float tp = tt;
    for (int k = 0; k < 48; k++) {
      vec3 pos = uCamera + rd * tt;
      float clearance;
      float gap = pos.z - surface(pos.xy, pos.z, tt, clearance);
      if (gap < 0.0) {
        found = true;
        break;
      }
      tp = tt;
      float pixel = tt * uPixelAngle;
      float limit = pos.z > bound(pos.xy).x + 0.02 ? 0.6 / glide : max(clearance * 0.9, pixel) / glide;
      tt += max(min(gap * 0.75 / sink, limit), pixel);
      if (tt > t1) break;
    }
    if (found) {
      t = tt;
      tPrev = tp;
      break;
    }
    t0 = t1;
    b0 = b1;
  }

  vec3 pos;
  vec2 slope;
  if (smoothHit || !found) {
    pos = uCamera + rd * t;
    slope = mound(pos.xy).yz;
  } else {
    float lo = tPrev;
    float hi = t;
    for (int k = 0; k < 4; k++) {
      float mid = 0.5 * (lo + hi);
      vec3 probe = uCamera + rd * mid;
      float clearance;
      if (probe.z - surface(probe.xy, probe.z, mid, clearance) < 0.0) hi = mid;
      else lo = mid;
    }
    t = hi;
    pos = uCamera + rd * t;
    vec2 uv = (pos.xy - uGridOrigin) / uGridSpan;
    vec2 step = uCellSize / uGridSpan;
    float fade = detail(t);
    float a = texture(uField, uv).x * fade;
    vec2 aSlope = vec2(
      texture(uField, uv + vec2(step.x, 0.0)).x - texture(uField, uv - vec2(step.x, 0.0)).x,
      texture(uField, uv + vec2(0.0, step.y)).x - texture(uField, uv - vec2(0.0, step.y)).x
    ) * fade / (2.0 * uCellSize);
    slope = mound(pos.xy).yz + spikesSlope(pos.xy, a, aSlope);
  }

  vec3 n = normalize(vec3(-slope, 1.0));
  vec3 r = reflect(rd, n);
  float soft = length(fwidth(r)) * 0.6;
  float facing = max(dot(n, -rd), 0.0);
  float fresnel = F0 + (1.0 - F0) * pow(1.0 - facing, 5.0);
  float rim = pow(1.0 - clamp(abs(dot(rd, n)), 0.0, 1.0), 3.0) * smoothstep(0.85, 0.4, n.z);
  float distance = 1.0 - smoothstep(uFogStart, uFar, t);

  if (uLight > 0.5) {
    vec3 key = normalize(vec3(-0.45, -0.55, 0.7));
    float lambert = clamp(dot(n, key) / key.z, 0.0, 1.0);
    float diffuse = mix(0.62, 1.0, lambert);
    float room = mix(0.3, 1.0, smoothstep(-0.25, 0.3, r.z));
    room -= 0.3 * rim;
    float lum = mix(diffuse, room, fresnel);
    lum = 1.0 - (1.0 - lum) * clamp(uExposure / 3.0, 0.0, 1.5);
    vec3 shadow = mix(vec3(0.0), uStrip, 0.45);
    vec3 paper = mix(shadow, vec3(1.0), clamp(lum, 0.0, 1.0));
    outColor = finish(vec3(0.0), paper, distance);
    return;
  }

  vec3 shine = 1.0 - exp(-(studio(r, rd, soft) * fresnel + uFill * rim * 0.35) * uExposure);
  outColor = finish(shine, vec3(1.0), distance);
}`,z=(r,d,x)=>Math.min(x,Math.max(d,r)),Oe=r=>{let d=z((r-1)/4,0,1),x=1-d*.7,g=1.05+d*1.2,h=Math.sqrt(1+x*x)-x;return{round:x,exponent:g,span:h}},Le=(r,d,x)=>{let g=r.createShader(d);return g?(r.shaderSource(g,x),r.compileShader(g),r.getShaderParameter(g,r.COMPILE_STATUS)?g:(r.deleteShader(g),null)):null},pe=(r,d)=>{let x=Le(r,r.VERTEX_SHADER,lt),g=Le(r,r.FRAGMENT_SHADER,d),h=r.createProgram();if(!x||!g||!h)return null;if(r.attachShader(h,x),r.attachShader(h,g),r.bindAttribLocation(h,0,"aPosition"),r.linkProgram(h),r.deleteShader(x),r.deleteShader(g),!r.getProgramParameter(h,r.LINK_STATUS))return r.deleteProgram(h),null;let J={},ie=r.getProgramParameter(h,r.ACTIVE_UNIFORMS);for(let O=0;O<ie;O++){let L=r.getActiveUniform(h,O);L&&(J[L.name.replace("[0]","")]=r.getUniformLocation(h,L.name))}return{program:h,uniforms:J}},ht=({colors:r=["#ffffff","#ffffff","#ffffff"],speed:d=.5,scale:x=1.6,spikeHeight:g=1,sharpness:h=2.5,turbulence:J=1,fluidity:ie=.5,tilt:O=48,magnetism:L=1,variation:Xe=0,flowDirection:qe="down",brightness:He=1,mouseInteraction:Ne=!0,mouseStrength:We=1,mouseRadius:Ye=.22,mouseDampening:Ve=.15,clickPulse:Ke=!0,intro:Je=!0,lightMode:Qe=!1,transparent:Ze=!0,color:$e,opacity:je=1,paused:et=!1,dpr:tt,mixBlendMode:xe,className:ot="",style:ge,...rt})=>{let Ee=(0,A.useRef)(null),be=(0,A.useRef)(null),ae=(0,A.useRef)(null),we={colors:Array.isArray(r)&&r.length?r.slice(0,3):["#ffffff"],speed:Math.max(0,d),scale:z(x,.2,6),spikeHeight:Math.max(0,g),sharpness:z(h,.6,6),turbulence:Math.max(0,J),fluidity:z(ie,0,1),tilt:z(O,10,70),magnetism:Math.max(0,L),variation:Xe,flow:Ge[qe]??Ge.down,brightness:Math.max(0,He),mouseInteraction:Ne,mouseStrength:Math.max(0,We),mouseRadius:z(Ye,.02,2),mouseDampening:Math.max(0,Ve),clickPulse:Ke,intro:Je,lightMode:Qe,transparent:Ze,color:$e,opacity:z(je,0,1),paused:et,dpr:tt},b=(0,A.useRef)(we);return b.current=we,(0,A.useEffect)(()=>{let C=Ee.current,k=be.current,e=k?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!C||!k||!e)return;let ye=!!e.getExtension("EXT_color_buffer_float"),Q=pe(e,dt),Z=pe(e,mt),$=pe(e,pt);if(!Q||!Z||!$)return;let Te=e.createBuffer(),ue=e.createVertexArray();e.bindVertexArray(ue),e.bindBuffer(e.ARRAY_BUFFER,Te),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let fe=(o,t,i)=>{let u=e.createTexture();e.bindTexture(e.TEXTURE_2D,u),ye?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,o,t,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,o,t,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let f=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,f),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,u,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),{texture:u,framebuffer:f}},j=o=>{o&&(e.deleteTexture(o.texture),e.deleteFramebuffer(o.framebuffer))},D=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),se=new Map,Se=(o,t)=>{if(!o)return t;let i=String(o);if(se.has(i))return se.get(i);let u=t;if(D){D.clearRect(0,0,1,1),D.fillStyle="#000000",D.fillStyle=i,D.fillRect(0,0,1,1);let[f,p,y]=D.getImageData(0,0,1,1).data;u=[f/255,p/255,y/255]}return se.set(i,u),u},I=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,X=Math.tan(ct/2),l={width:1,height:1,worldHeight:10,scale:0,tilt:-1,reach:1},c={x:0,y:0,z:1,forward:[0,1,0],upward:[0,0,1],far:10,distance:4},a={width:0,height:0,originX:0,originY:0,boundWidth:0,boundHeight:0},B=[],U=null,q=0,ce=!0,v={x:0,y:0,inside:!1},m={x:0,y:0,strength:0},R={x:0,y:0,age:10},le=0,H=b.current.intro&&!I?0:1,ee=Oe(b.current.sharpness),Re=b.current.sharpness,N=0,W=0,te=!0,nt=(o,t)=>{let i=l.width/l.height,u=o*i*X,f=t*X,[p,y,F]=c.forward,[,s,w]=c.upward,n=p+u,T=y+f*s,P=F+f*w,E=Math.hypot(n,T,P)||1;return[n/E,T/E,P/E]},G=(o,t)=>{let[i,u,f]=nt(o,t),p=f<-.004?Math.min(-c.z/f,c.far):c.far;return[c.x+i*p,c.y+u*p]},Fe=()=>{let o=b.current,t=Math.max(1,C.clientWidth),i=Math.max(1,C.clientHeight),u=Math.min(o.dpr||window.devicePixelRatio||1,2);k.width=Math.max(1,Math.round(t*u)),k.height=Math.max(1,Math.round(i*u)),l.width=k.width,l.height=k.height,l.worldHeight=22/o.scale,l.scale=o.scale,l.tilt=o.tilt;let f=(90-o.tilt)*Math.PI/180,p=l.worldHeight/(2*X);c.forward=[0,Math.cos(f),-Math.sin(f)],c.upward=[0,Math.sin(f),Math.cos(f)],c.x=0,c.y=-p*Math.cos(f),c.z=p*Math.sin(f),c.far=p*2.5,c.distance=p;let y=[G(-1,-1),G(1,-1),G(-1,1),G(1,1),G(0,1)],F=y.map(M=>M[0]),s=y.map(M=>M[1]),w=Math.min(...F)-3,n=Math.max(...F)+3,T=Math.min(...s)-3,P=Math.max(...s)+3;l.reach=Math.max(...y.map(M=>Math.hypot(M[0],M[1])))+4;let E=Math.ceil((n-w)/S)+2,_=Math.ceil((P-T)/S)+2;a.originX=w,a.originY=T,(E!==a.width||_!==a.height)&&(B.forEach(j),j(U),B=[fe(E,_,e.LINEAR),fe(E,_,e.LINEAR)],a.width=E,a.height=_,a.boundWidth=Math.ceil(E*S/K),a.boundHeight=Math.ceil(_*S/K),U=fe(a.boundWidth,a.boundHeight,e.NEAREST),q=0),ce=!0},it=(o,t)=>{let i=C.getBoundingClientRect(),u=(o-i.left)/Math.max(1,i.width)*2-1,f=1-(t-i.top)/Math.max(1,i.height)*2;return G(u,f)},at=o=>{let t=b.current;(t.scale!==l.scale||t.tilt!==l.tilt)&&Fe();let i=t.paused?0:1;le+=o*i*(I?0:t.speed),H=t.intro&&!I?Math.min(1,H+o*i/st):1,R.age+=o*i;let u=t.mouseInteraction&&v.inside,f=t.mouseDampening>0?1-Math.exp(-o/t.mouseDampening):1;u&&(m.x+=(v.x-m.x)*f,m.y+=(v.y-m.y)*f);let p=u?t.mouseStrength*1.4:0;m.strength+=(p-m.strength)*(1-Math.exp(-o/.35)),Math.abs(p-m.strength)<.001&&(m.strength=p)},Me=o=>{if(!U||B.length<2)return;let t=b.current,i=l.worldHeight,u=t.mouseRadius*i,f=1.2*t.spikeHeight;t.sharpness!==Re&&(Re=t.sharpness,ee=Oe(t.sharpness));let p=H*H*(3-2*H);e.bindVertexArray(ue),e.activeTexture(e.TEXTURE0);let y=B[q],F=B[1-q];e.bindFramebuffer(e.FRAMEBUFFER,F.framebuffer),e.viewport(0,0,a.width,a.height),e.useProgram(Q.program);let s=Q.uniforms;e.bindTexture(e.TEXTURE_2D,y.texture),e.uniform1i(s.uState,0),e.uniform2f(s.uGridOrigin,a.originX,a.originY),e.uniform1f(s.uCell,S),e.uniform1f(s.uDt,Math.max(o,.001)),e.uniform1f(s.uTime,le),e.uniform2f(s.uFlow,t.flow[0],t.flow[1]),e.uniform1f(s.uTurbulence,t.turbulence),e.uniform1f(s.uMagnetism,t.magnetism),e.uniform1f(s.uFieldScale,5.5),e.uniform2f(s.uSeed,t.variation*17.31,t.variation*9.73),e.uniform4f(s.uCursor,m.x,m.y,m.strength,u),e.uniform4f(s.uPulse,R.x,R.y,R.age,R.age<4?1.1:0),e.uniform1f(s.uPulseSpeed,i*.45),e.uniform1f(s.uPulseWidth,1.4),e.uniform3f(s.uIntro,0,0,p*(l.reach+3)),e.uniform1f(s.uSpikeHeight,f),e.uniform1f(s.uMound,.6),e.uniform1f(s.uStiffness,150),e.uniform1f(s.uDamping,22-t.fluidity*15),e.uniform1f(s.uSettle,ce||!ye||I?1:0),e.drawArrays(e.TRIANGLES,0,3),ce=!1,q=1-q,e.bindFramebuffer(e.FRAMEBUFFER,U.framebuffer),e.viewport(0,0,a.boundWidth,a.boundHeight),e.useProgram(Z.program);let w=Z.uniforms;e.bindTexture(e.TEXTURE_2D,F.texture),e.uniform1i(w.uState,0),e.uniform2f(w.uGridOrigin,a.originX,a.originY),e.uniform1f(w.uCell,S),e.uniform2f(w.uStateSize,a.width,a.height),e.uniform1f(w.uBoundCell,K),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,l.width,l.height),e.useProgram($.program);let n=$.uniforms;e.bindTexture(e.TEXTURE_2D,F.texture),e.uniform1i(n.uField,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,U.texture),e.uniform1i(n.uBound,1),e.activeTexture(e.TEXTURE0),e.uniform2f(n.uGridOrigin,a.originX,a.originY),e.uniform2f(n.uGridSpan,a.width*S,a.height*S),e.uniform2f(n.uBoundSpan,a.boundWidth*K,a.boundHeight*K),e.uniform1f(n.uCellSize,S),e.uniform2f(n.uResolution,l.width,l.height),e.uniform3f(n.uCamera,c.x,c.y,c.z),e.uniform3fv(n.uForward,c.forward),e.uniform3fv(n.uUpward,c.upward),e.uniform1f(n.uTanHalf,X),e.uniform1f(n.uPixelAngle,2*X/l.height),e.uniform1f(n.uFar,c.far),e.uniform1f(n.uFogStart,c.distance*.95),e.uniform1f(n.uTop,f*1.6+.6*3+.1),e.uniform1f(n.uBottom,-.05),e.uniform1f(n.uTime,le*2),e.uniform4f(n.uCursor,m.x,m.y,m.strength,u),e.uniform1f(n.uMound,.6),e.uniform1f(n.uRound,ee.round),e.uniform1f(n.uSpan,ee.span),e.uniform1f(n.uExponent,ee.exponent),e.uniform1f(n.uWarp,.06*t.turbulence);let T=t.colors.map(M=>Se(M,[1,1,1])),P=T[0],E=T[1]??P,_=T[2]??E;e.uniform3fv(n.uKey,P),e.uniform3fv(n.uStrip,E),e.uniform3fv(n.uFill,_),e.uniform1f(n.uExposure,3*t.brightness),e.uniform1f(n.uLight,t.lightMode?1:0),e.uniform1f(n.uOpaque,t.transparent?0:1),e.uniform3fv(n.uBase,Se(t.color,t.lightMode?[1,1,1]:[.0706,.0588,.0902])),e.uniform1f(n.uOpacity,t.opacity),e.drawArrays(e.TRIANGLES,0,3)},ze=o=>{if(N=0,!te||document.hidden)return;let t=W?z((o-W)/1e3,5e-4,.05):1/60;W=o,at(t),Me(t),N=requestAnimationFrame(ze)},Y=()=>{!N&&te&&!document.hidden&&(N=requestAnimationFrame(ze))},de=()=>{Fe(),Me(0),Y()},ut=o=>{let t=C.getBoundingClientRect(),i=o.clientX-t.left,u=o.clientY-t.top;v.inside=i>=0&&u>=0&&i<=t.width&&u<=t.height,[v.x,v.y]=it(o.clientX,o.clientY)},me=o=>{let t=v.inside;ut(o),v.inside&&!t&&m.strength<.05&&(m.x=v.x,m.y=v.y),Y()},Ae=o=>{me(o),!(!v.inside||!b.current.clickPulse||I)&&(R.x=v.x,R.y=v.y,R.age=0)},oe=o=>{o.pointerType!=="mouse"&&(v.inside=!1)},Ce=()=>{v.inside=!1},Pe=()=>{W=0,Y()},_e=new ResizeObserver(de);_e.observe(C);let ke=new IntersectionObserver(o=>{te=o.some(t=>t.isIntersecting),te&&(W=0,Y())});ke.observe(C),window.addEventListener("pointermove",me,{passive:!0}),window.addEventListener("pointerdown",Ae,{passive:!0}),window.addEventListener("pointerup",oe,{passive:!0}),window.addEventListener("pointercancel",oe,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ce),document.addEventListener("visibilitychange",Pe),de();let De=b.current.dpr;return ae.current=()=>{let o=b.current;if(o.dpr!==De){De=o.dpr,de();return}Y()},()=>{cancelAnimationFrame(N),ae.current=null,_e.disconnect(),ke.disconnect(),window.removeEventListener("pointermove",me),window.removeEventListener("pointerdown",Ae),window.removeEventListener("pointerup",oe),window.removeEventListener("pointercancel",oe),document.documentElement.removeEventListener("pointerleave",Ce),document.removeEventListener("visibilitychange",Pe),B.forEach(j),j(U),e.deleteProgram(Q.program),e.deleteProgram(Z.program),e.deleteProgram($.program),e.deleteBuffer(Te),e.deleteVertexArray(ue),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,A.useEffect)(()=>{ae.current?.()}),(0,he.jsx)("div",{ref:Ee,className:["relative h-full w-full overflow-hidden",ot].filter(Boolean).join(" "),style:xe?{...ge,mixBlendMode:xe}:ge,...rt,children:(0,he.jsx)("canvas",{ref:be,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ie=ht;var ve=V(re(),1),vt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],ne=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Tt=vt.map((r,d)=>({id:d+1,image:r,src:r,img:r,url:r,title:ne[d],text:ne[d],label:ne[d],alt:ne[d],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][d],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function xt({big:r}){return(0,ve.jsx)(Ue,{big:r,dark:!0,center:!1,zoom:1,drive:"move",children:(0,ve.jsx)(Ie,{})})}var St=Be(xt);export{St as default};
