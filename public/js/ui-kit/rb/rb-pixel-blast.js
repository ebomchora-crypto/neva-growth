import{c as V,i as Et,j as ee,l as Oe,m as Ve}from"./chunks/chunk-6IYH4WPJ.js";var I=V(Et(),1),ve=V(ee(),1),A=10,bt=1.8,wt={square:0,circle:1,triangle:2,diamond:3,cross:4,ring:5},Tt={none:0,grow:1,reveal:2},he=(o,r)=>(Math.floor(o)/2+Math.floor(r)*Math.floor(r)*.75)%1,St=(o,r)=>(he(o/4,r/4)*.25+he(o/2,r/2))*.25+he(o,r),At=Array.from({length:64},(o,r)=>St(r%8,Math.floor(r/8)).toFixed(6)).join(", "),Ft=-6,Ct=10,Pt=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Je=`
const float RANGE_MIN = ${Ft.toFixed(1)};
const float RANGE_MAX = ${Ct.toFixed(1)};

vec2 pack16(float value) {
  float x = floor(clamp((value - RANGE_MIN) / (RANGE_MAX - RANGE_MIN), 0.0, 1.0) * 65535.0 + 0.5);
  float hi = floor(x / 256.0);
  return vec2(hi, x - hi * 256.0) / 255.0;
}

float unpack16(vec2 c) {
  float x = floor(c.x * 255.0 + 0.5) * 256.0 + floor(c.y * 255.0 + 0.5);
  return RANGE_MIN + x / 65535.0 * (RANGE_MAX - RANGE_MIN);
}
`,kt=`#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform int uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform vec2 uClickPos[${A}];
uniform float uClickAge[${A}];
uniform ivec2 uOrigin;
uniform vec2 uDrift;
uniform int uHover;
uniform vec2 uMouse;
uniform float uMouseRadius;
uniform float uMousePresence;
uniform float uIntro;
uniform sampler2D uPrev;
uniform float uDecay;
uniform float uFresh;

out vec4 outCell;
${Je}
float hash11(float n) { return fract(sin(n) * 43758.5453); }

float vnoise(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n100 = hash11(dot(ip + vec3(1.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n010 = hash11(dot(ip + vec3(0.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n110 = hash11(dot(ip + vec3(1.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n001 = hash11(dot(ip + vec3(0.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n101 = hash11(dot(ip + vec3(1.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n011 = hash11(dot(ip + vec3(0.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n111 = hash11(dot(ip + vec3(1.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
  vec3 w = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0 = mix(x00, x10, w.y);
  float y1 = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t) {
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < 5; ++i) {
    sum += amp * vnoise(p * freq);
    freq *= 1.25;
    amp *= 1.0;
  }
  return sum * 0.5 + 0.5;
}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  float aspectRatio = uResolution.x / uResolution.y;
  float cellPixelSize = 8.0 * uPixelSize;
  vec2 cellId = vec2(texel + uOrigin);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv + uDrift, uTime * 0.05);
  base = base * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;
  if (uEnableRipples == 1) {
    for (int i = 0; i < ${A}; ++i) {
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      vec2 cuv = (((pos - uResolution * 0.5 - cellPixelSize * 0.5) / uResolution)) * vec2(aspectRatio, 1.0);
      float t = max(uClickAge[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = uRippleSpeed * t;
      float ring = exp(-pow((r - waveR) / uRippleThickness, 2.0));
      float atten = exp(-1.0 * t) * exp(-10.0 * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  if (uIntro < 1.0) {
    vec2 center = (-cellPixelSize * 0.5 / uResolution) * vec2(aspectRatio, 1.0);
    float reach = length(vec2(aspectRatio, 1.0)) * 0.5 + 0.2;
    float eased = 1.0 - pow(1.0 - uIntro, 2.4);
    float front = eased * reach;
    float r = distance(uv, center);
    float shown = smoothstep(front + 0.04, front - 0.06, r);
    float ring = exp(-pow((r - front) / 0.07, 2.0)) * (1.0 - uIntro);
    feed = mix(-1.0, feed, shown);
    feed = max(feed, ring * 1.4);
  }

  float brush = 0.0;
  if (uHover > 0) {
    vec2 d = (cellCoord + cellPixelSize * 0.5 + uResolution * 0.5 - uMouse) / max(uMouseRadius, 1.0);
    brush = exp(-dot(d, d)) * uMousePresence;
  }
  vec4 prev = texelFetch(uPrev, texel, 0) * (1.0 - uFresh);
  float trail = max(brush, max(prev.a * uDecay - 1.0 / 255.0, 0.0));
  if (uHover == 2) feed += trail * 0.9;

  outCell = vec4(pack16(feed), clamp((feed + 0.5) * 0.5, 0.0, 1.0), trail);
}`,It=`#version 300 es
precision highp float;
precision highp int;

uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec2 uResolution;
uniform float uTime;
uniform float uClock;
uniform float uPixelSize;
uniform float uPixelJitter;
uniform float uEdgeFade;
uniform int uShapeType;
uniform sampler2D uCells;
uniform ivec2 uOrigin;
uniform ivec2 uCellCount;
uniform float uSoftness;
uniform float uSmoothing;
uniform float uGlow;
uniform float uTwinkle;
uniform float uLightMode;
uniform float uTransparent;
uniform float uNoise;
uniform int uHover;
uniform mat3 uPlane;
uniform float uTilted;

out vec4 fragColor;
${Je}
const float BAYER[64] = float[64](${At});

vec2 gDx;
vec2 gDy;

float aaFrom(vec2 grad) {
  return abs(dot(grad, gDx)) + abs(dot(grad, gDy));
}

float maskSquare(vec2 p, float cov, float soft) {
  if (soft <= 0.0) return cov;
  float side = 0.5 * sqrt(clamp(cov, 0.0, 1.0));
  vec2 c = p - 0.5;
  vec2 q = abs(c) - side;
  float d = max(q.x, q.y);
  vec2 grad = q.x > q.y ? vec2(sign(c.x), 0.0) : vec2(0.0, sign(c.y));
  float aa = max(aaFrom(grad), 1e-4);
  return 1.0 - smoothstep(-aa * 0.5, aa * 0.5, d);
}

float maskCircle(vec2 p, float cov) {
  float r = sqrt(cov) * 0.25;
  vec2 c = p - 0.5;
  float len = length(c);
  float d = len - r;
  float aa = 0.5 * aaFrom(c / max(len, 1e-5));
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov) {
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d = p.y - r * (1.0 - p.x);
  float aa = max(aaFrom(vec2(flip ? -r : r, 1.0)), 1e-4);
  return cov * clamp(0.5 - d / aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov) {
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

float maskCross(vec2 p, float cov) {
  float s = sqrt(clamp(cov, 0.0, 1.0));
  vec2 c = p - 0.5;
  vec2 q = abs(c);
  float arm = 0.42 * s;
  float bar = 0.13 * s + 0.02;
  float a1 = max(q.x - arm, q.y - bar);
  float a2 = max(q.x - bar, q.y - arm);
  float d = min(a1, a2);
  bool horizontal = a1 < a2 ? q.x - arm > q.y - bar : q.x - bar > q.y - arm;
  vec2 grad = horizontal ? vec2(sign(c.x), 0.0) : vec2(0.0, sign(c.y));
  float aa = max(aaFrom(grad), 1e-4);
  return 1.0 - smoothstep(-aa * 0.5, aa * 0.5, d);
}

float maskRing(vec2 p, float cov) {
  float s = sqrt(clamp(cov, 0.0, 1.0));
  vec2 c = p - 0.5;
  float len = length(c);
  float d = abs(len - 0.3 * s) - 0.09 * s;
  vec2 grad = sign(len - 0.3 * s) * c / max(len, 1e-5);
  float aa = max(aaFrom(grad), 1e-4);
  return 1.0 - smoothstep(-aa * 0.5, aa * 0.5, d);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float pixelSize = uPixelSize;
  vec2 screen = gl_FragCoord.xy;
  vec4 empty = uTransparent < 0.5 ? vec4(vec3(uLightMode > 0.5 ? 1.0 : 0.0), 1.0) : vec4(0.0);

  float lod = 0.0;
  float depthFade = 1.0;
  if (uTilted > 0.5) {
    vec3 plane = uPlane * vec3(screen.x, uResolution.y - screen.y, 1.0);
    screen = vec2(plane.x, uResolution.y * plane.z - plane.y) / max(plane.z, 1e-4);
    float footprint = length(fwidth(screen));
    lod = smoothstep(0.3, 0.85, footprint / pixelSize);
    depthFade = (1.0 - smoothstep(0.45, 1.0, footprint / (8.0 * pixelSize))) * step(0.0, plane.z);
  }

  vec2 fragCoord = screen - uResolution * 0.5;
  gDx = dFdx(fragCoord) / pixelSize;
  gDy = dFdy(fragCoord) / pixelSize;
  if (depthFade <= 0.0) {
    fragColor = empty;
    return;
  }

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  ivec2 texel = clamp(ivec2(cellId) - uOrigin, ivec2(0), uCellCount - 1);
  vec2 smoothAt = (fragCoord / cellPixelSize - vec2(uOrigin)) / vec2(uCellCount);
  vec4 blended = texture(uCells, smoothAt);
  float smoothFeed = blended.b * 2.0 - 0.5;
  float feed = smoothFeed;
  float trail = uHover == 1 ? blended.a : 0.0;
  if (uSmoothing < 1.0) {
    vec4 cell = texelFetch(uCells, texel, 0);
    feed = mix(unpack16(cell.rg), smoothFeed, uSmoothing);
    if (uHover == 1) trail = mix(cell.a, blended.a, uSmoothing);
  }

  if (feed < -0.12 * uSoftness && smoothFeed < 0.2 && (lod <= 0.0 || smoothFeed <= 0.0)) {
    fragColor = empty;
    return;
  }

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fragCoord / pixelSize - pixelId;
  ivec2 cellBits = ivec2(mod(pixelId, 8.0));
  float bayer = BAYER[cellBits.y * 8 + cellBits.x] - 0.5;
  float margin = feed + bayer - 0.5;
  float bw = uSoftness > 0.0 ? smoothstep(-0.12 * uSoftness, 0.12 * uSoftness, margin) : step(0.0, margin);

  float h = uPixelJitter > 0.0 || uTwinkle > 0.0 ? fract(sin(dot(pixelId, vec2(127.1, 311.7))) * 43758.5453) : 0.5;
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float heat = max(trail, clamp((feed - 1.0) * 2.5, 0.0, 1.0) * min(uGlow * 2.0, 1.0));
  float coverage = bw * jitterScale * (1.0 + heat * 0.35);
  float M;
  float area;
  if (uShapeType == 1) {
    M = maskCircle(pixelUV, coverage);
    area = 0.196;
  } else if (uShapeType == 2) {
    M = maskTriangle(pixelUV, pixelId, coverage);
    area = 0.5;
  } else if (uShapeType == 3) {
    M = maskDiamond(pixelUV, coverage);
    area = 0.62;
  } else if (uShapeType == 4) {
    M = maskCross(pixelUV, coverage);
    area = 0.41;
  } else if (uShapeType == 5) {
    M = maskRing(pixelUV, coverage);
    area = 0.41;
  } else {
    M = maskSquare(pixelUV, coverage, uSoftness);
    area = 1.0;
  }
  if (lod > 0.0) {
    float average = clamp(smoothFeed, 0.0, 1.0) * area * (1.0 + heat * 0.35);
    M = mix(M, average, lod);
  }

  if (uTwinkle > 0.0) {
    float rate = 1.5 + 3.0 * fract(h * 7.31);
    float wave = 0.5 + 0.5 * sin(uClock * rate + h * 37.0);
    M *= 1.0 - uTwinkle * 0.55 * wave * wave;
  }

  float density = clamp(smoothFeed, 0.0, 1.0);
  float glow = 0.0;
  if (uGlow > 0.0) {
    float bloom = smoothstep(0.2, 1.0, density);
    glow = bloom * bloom * uGlow * (uLightMode > 0.5 ? 0.12 : 0.22) * depthFade;
  }

  float fade = depthFade;
  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    vec2 edgeA = clamp(norm / uEdgeFade, 0.0, 1.0);
    vec2 edgeB = clamp((1.0 - norm) / uEdgeFade, 0.0, 1.0);
    vec2 sa = edgeA * edgeA * edgeA * (edgeA * (edgeA * 6.0 - 15.0) + 10.0);
    vec2 sb = edgeB * edgeB * edgeB * (edgeB * (edgeB * 6.0 - 15.0) + 10.0);
    fade *= sa.x * sa.y * sb.x * sb.y;
  }
  M = clamp(M, 0.0, 1.0) * fade;
  glow *= fade;

  float hot = clamp(heat, 0.0, 1.0);
  float tone = smoothstep(0.3, 1.0, density) * 0.85;
  vec3 color = mix(uColor, uAccent, max(tone, hot));
  vec3 lit = uLightMode > 0.5 ? color * (1.0 - 0.35 * hot) : mix(color, vec3(1.0), 0.45 * hot);
  if (uNoise > 0.0) {
    float n = hash(floor(gl_FragCoord.xy) + floor(uTime * 60.0));
    lit = clamp(lit + (n - 0.5) * uNoise, 0.0, 1.0);
  }

  vec3 haze = uLightMode > 0.5 ? mix(color, vec3(1.0), 0.35) : color;
  float alpha = M + glow * (1.0 - M);
  vec3 premul = lit * M + haze * glow * (1.0 - M);
  if (uTransparent < 0.5) {
    vec3 paper = vec3(uLightMode > 0.5 ? 1.0 : 0.0);
    fragColor = vec4(premul + paper * (1.0 - alpha), 1.0);
    return;
  }
  fragColor = vec4(premul, alpha);
}`,k=(o,r,l)=>Math.min(l,Math.max(r,o)),$e=(o,r,l)=>{let n=o.createShader(r);return n?(o.shaderSource(n,l),o.compileShader(n),o.getShaderParameter(n,o.COMPILE_STATUS)?n:(o.deleteShader(n),null)):null},He=(o,r)=>{let l=$e(o,o.VERTEX_SHADER,Pt),n=$e(o,o.FRAGMENT_SHADER,r),f=o.createProgram();if(!l||!n||!f)return null;if(o.attachShader(f,l),o.attachShader(f,n),o.linkProgram(f),o.deleteShader(l),o.deleteShader(n),!o.getProgramParameter(f,o.LINK_STATUS))return o.deleteProgram(f),null;let R={},w=o.getProgramParameter(f,o.ACTIVE_UNIFORMS);for(let y=0;y<w;y++){let E=o.getActiveUniform(f,y);if(!E)continue;let T=E.name.replace(/\[0\]$/,"");R[T]=o.getUniformLocation(f,T)}return{program:f,uniforms:R}},te=new Map,Ye=o=>{let r=String(o),l=te.get(r);if(l)return l;let n=_t(o);return te.size>64&&te.clear(),te.set(r,n),n},_t=o=>{let r=String(o||"#ffffff").replace("#","").trim();(r.length===3||r.length===4)&&(r=r.slice(0,3).split("").map(n=>n+n).join(""));let l=parseInt(r.slice(0,6),16);return Number.isNaN(l)?[1,1,1]:[(l>>16&255)/255,(l>>8&255)/255,(l&255)/255]},Dt=()=>{if(typeof window<"u"&&window.crypto?.getRandomValues){let o=new Uint32Array(1);return window.crypto.getRandomValues(o),o[0]/4294967295}return Math.random()},Nt=o=>{let[r,l,n,f,R,w,y,E,T]=o,N=R*T-w*E,$=-(f*T-w*y),H=f*E-R*y,S=r*N+l*$+n*H||1;return[N/S,-(l*T-n*E)/S,(l*w-n*R)/S,$/S,(r*T-n*y)/S,-(r*w-n*f)/S,H/S,-(r*E-l*y)/S,(r*R-l*f)/S]},Ke=(o,r)=>{let l=new Array(9);for(let n=0;n<3;n++)for(let f=0;f<3;f++)l[n*3+f]=o[n*3]*r[f]+o[n*3+1]*r[3+f]+o[n*3+2]*r[6+f];return l},zt=(o,r,l,n)=>{let f=o*Math.PI/180,R=r*Math.PI/180,w=Math.max(l,n)*1.25,y=l/2,E=n/2,T=[Math.cos(R),0,0,Math.sin(f)*Math.sin(R),Math.cos(f),0,Math.sin(R)*Math.cos(f)/w,-Math.sin(f)/w,1],N=Ke(Ke([1,0,y,0,1,E,0,0,1],T),[1,0,-y,0,1,-E,0,0,1]);return Nt(N)},Ut=({variant:o="square",pixelSize:r=3,color:l="#B497CF",accentColor:n,className:f,style:R,patternScale:w=2,patternDensity:y=1,pixelSizeJitter:E=0,enableRipples:T=!0,rippleIntensityScale:N=1,rippleThickness:$=.1,rippleSpeed:H=.3,autoPauseOffscreen:S=!0,speed:je=.5,transparent:Qe=!0,edgeFade:Ze=.5,noiseAmount:et=0,softness:tt=.6,smoothing:ot=1,glow:at=.4,twinkle:rt=.25,drift:it=.2,driftAngle:nt=30,hoverEffect:lt="reveal",hoverRadius:ct=140,autoRipple:ft=0,tiltX:st=0,tiltY:ut=0,intro:mt=!0,variation:dt,lightMode:pt=!1,dpr:ht})=>{let ge=(0,I.useRef)(null),Re=(0,I.useRef)(null),ae=(0,I.useRef)(null),ye={variant:wt[o]??0,pixelSize:Math.max(.5,r),color:l,accentColor:n||l,patternScale:w,patternDensity:y,pixelSizeJitter:E,enableRipples:T,rippleIntensityScale:N,rippleThickness:Math.max(.001,$),rippleSpeed:H,autoPauseOffscreen:S,speed:je,transparent:Qe,edgeFade:k(Ze,0,1),noiseAmount:et,softness:k(tt,0,1),smoothing:k(ot,0,1),glow:k(at,0,2),twinkle:k(rt,0,1),drift:it,driftAngle:nt,hoverEffect:Tt[lt]??0,hoverRadius:Math.max(10,ct),autoRipple:Math.max(0,ft),tiltX:k(st,-70,70),tiltY:k(ut,-70,70),intro:mt,variation:dt,lightMode:pt,dpr:ht},P=(0,I.useRef)(ye);return P.current=ye,(0,I.useEffect)(()=>{let z=ge.current,d=Re.current,e=d?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!z||!d||!e)return;let Y=He(e,kt),K=He(e,It);if(!Y||!K)return;let p=Y.uniforms,m=K.uniforms,re=e.createVertexArray(),vt=t=>{let a=e.createTexture();return e.bindTexture(e.TEXTURE_2D,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,1,1,0,e.RGBA,e.UNSIGNED_BYTE,null),a},L=[0,1].map(()=>{let t=vt(e.LINEAR),a=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),{texture:t,framebuffer:a}});e.bindFramebuffer(e.FRAMEBUFFER,null);let _=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,c={width:1,height:1,ratio:1,plane:null,tiltKey:""},g={x:0,y:0,w:1,h:1,key:""},F={x:0,y:0,inside:!1},b={x:0,y:0,ready:!1},U=new Float32Array(A*2).fill(-1),Me=new Float32Array(A),ie=new Float32Array(A),X=0,G=0,ne=!0,Ee=P.current.variation,xt=typeof Ee=="number"?Ee*37:Dt()*1e3,be=0,J=0,W=0,we=0,Te=0,B=P.current.intro&&!_?0:1,le=1.2,q=0,j=0,Q=!0,Z=0,Se=t=>xt+be*t.speed,Ae=t=>{let i=8*(t.pixelSize*c.ratio),s=d.width,u=d.height,x=-s/2,v=s/2,C=-u/2,M=u/2;if(c.plane){let de=[[0,0],[s,0],[0,u],[s,u],[s/2,0],[s/2,u],[0,u/2],[s,u/2]];x=1/0,v=-1/0,C=1/0,M=-1/0;for(let[yt,Mt]of de){let[pe,qe]=ce(yt,Mt);pe<-1e5||(x=Math.min(x,pe-s/2),v=Math.max(v,pe-s/2),C=Math.min(C,qe-u/2),M=Math.max(M,qe-u/2))}Number.isFinite(x)||(x=-s/2,v=s/2,C=-u/2,M=u/2)}let h=i,fe=Math.floor((x-h)/i),gt=Math.floor((v+h)/i),se=Math.floor((C-h)/i),Rt=Math.floor((M+h)/i),ue=Math.max(1,Math.min(2048,gt-fe+1)),me=Math.max(1,Math.min(2048,Rt-se+1)),Ge=`${fe}:${se}:${ue}:${me}`;if(Ge!==g.key){g.key=Ge,g.x=fe,g.y=se,g.w=ue,g.h=me;for(let de of L)e.bindTexture(e.TEXTURE_2D,de.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,ue,me,0,e.RGBA,e.UNSIGNED_BYTE,null);ne=!0}},O=new Float32Array(A*2),Fe=(t,a)=>{for(let v=0;v<A;v++){if(U[v*2]<0){O[v*2]=-1,O[v*2+1]=-1;continue}let[C,M]=ce(U[v*2],U[v*2+1]);O[v*2]=Math.max(C,0),O[v*2+1]=M}let[i,s]=ce(b.x,b.y),u=L[G],x=L[1-G];e.bindFramebuffer(e.FRAMEBUFFER,x.framebuffer),e.viewport(0,0,g.w,g.h),e.disable(e.BLEND),e.useProgram(Y.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,u.texture),e.uniform1i(p.uPrev,0),e.uniform2f(p.uResolution,d.width,d.height),e.uniform1f(p.uTime,Se(t)),e.uniform1f(p.uPixelSize,t.pixelSize*c.ratio),e.uniform1f(p.uScale,t.patternScale),e.uniform1f(p.uDensity,t.patternDensity),e.uniform1i(p.uEnableRipples,t.enableRipples?1:0),e.uniform1f(p.uRippleSpeed,t.rippleSpeed),e.uniform1f(p.uRippleThickness,t.rippleThickness),e.uniform1f(p.uRippleIntensity,t.rippleIntensityScale),e.uniform2fv(p.uClickPos,O),e.uniform1fv(p.uClickAge,ie),e.uniform2i(p.uOrigin,g.x,g.y),e.uniform2f(p.uDrift,we,Te),e.uniform1i(p.uHover,t.hoverEffect),e.uniform2f(p.uMouse,i,s),e.uniform1f(p.uMouseRadius,t.hoverRadius*c.ratio),e.uniform1f(p.uMousePresence,W),e.uniform1f(p.uIntro,B),e.uniform1f(p.uDecay,a),e.uniform1f(p.uFresh,ne?1:0),e.bindVertexArray(re),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),G=1-G,ne=!1},Ce=()=>{let t=P.current;if(e.viewport(0,0,d.width,d.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(K.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,L[G].texture),e.uniform1i(m.uCells,0),e.uniform3fv(m.uColor,Ye(t.color)),e.uniform3fv(m.uAccent,Ye(t.accentColor)),e.uniform2f(m.uResolution,d.width,d.height),e.uniform1f(m.uTime,Se(t)),e.uniform1f(m.uClock,J),e.uniform1f(m.uPixelSize,t.pixelSize*c.ratio),e.uniform1f(m.uPixelJitter,t.pixelSizeJitter),e.uniform1f(m.uEdgeFade,t.edgeFade),e.uniform1i(m.uShapeType,t.variant),e.uniform2i(m.uOrigin,g.x,g.y),e.uniform2i(m.uCellCount,g.w,g.h),e.uniform1f(m.uSoftness,t.softness),e.uniform1f(m.uSmoothing,t.smoothing),e.uniform1f(m.uGlow,t.glow),e.uniform1f(m.uTwinkle,_?0:t.twinkle),e.uniform1f(m.uLightMode,t.lightMode?1:0),e.uniform1f(m.uTransparent,t.transparent?1:0),e.uniform1f(m.uNoise,t.noiseAmount),e.uniform1i(m.uHover,t.hoverEffect),e.uniform1f(m.uTilted,c.plane?1:0),c.plane){let a=c.plane;e.uniformMatrix3fv(m.uPlane,!1,[a[0],a[3],a[6],a[1],a[4],a[7],a[2],a[5],a[8]])}e.bindVertexArray(re),e.drawArrays(e.TRIANGLES,0,3),e.bindVertexArray(null)},ce=(t,a)=>{let i=c.plane;if(!i)return[t,a];let s=d.height,u=s-a,x=i[6]*t+i[7]*u+i[8];return x<=1e-4?[-1e6,-1e6]:[(i[0]*t+i[1]*u+i[2])/x,s-(i[3]*t+i[4]*u+i[5])/x]},Pe=t=>{c.plane=t.tiltX||t.tiltY?zt(t.tiltX,t.tiltY,d.width,d.height):null,c.tiltKey=`${t.tiltX}:${t.tiltY}:${d.width}:${d.height}`},ke=()=>{let t=P.current;c.width=Math.max(1,z.clientWidth),c.height=Math.max(1,z.clientHeight),c.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),d.width=Math.max(1,Math.round(c.width*c.ratio)),d.height=Math.max(1,Math.round(c.height*c.ratio)),b.ready||(b.ready=!0,b.x=d.width/2,b.y=d.height/2),Pe(t),Ae(t),Fe(t,0),Ce(),D()},Ie=t=>{q=0;let a=P.current;if(!Q&&a.autoPauseOffscreen||document.hidden)return;let i=j?k((t-j)/1e3,0,1/20):0;if(j=t,_||(be+=i),J+=i,!_&&a.drift){let h=a.driftAngle*Math.PI/180;we+=Math.cos(h)*a.drift*i*.05,Te+=Math.sin(h)*a.drift*i*.05}!_&&a.enableRipples&&a.autoRipple>0&&B>=1&&(le-=i,le<=0&&(le=a.autoRipple*(.7+Math.random()*.6),Ne((.15+Math.random()*.7)*c.width,(.15+Math.random()*.7)*c.height)));for(let h=0;h<A;h++)ie[h]=(J-Me[h])*.5;let s=F.x*c.ratio,u=(c.height-F.y)*c.ratio,x=1-Math.exp(-i/.08);F.inside&&(b.x+=(s-b.x)*x,b.y+=(u-b.y)*x),W+=((F.inside?1:0)-W)*(1-Math.exp(-i/.25)),`${a.tiltX}:${a.tiltY}:${d.width}:${d.height}`!==c.tiltKey&&Pe(a),Ae(a);let C=a.hoverEffect?Math.exp(-i/.45):0;Fe(a,C),Ce(),B<1&&(B=Math.min(1,B+i/bt));let M=!_&&(a.speed!==0||a.drift!==0||a.twinkle>0||a.autoRipple>0&&a.enableRipples);M=M||B<1||W>.001;for(let h=0;h<A;h++)M=M||U[h*2]>=0&&ie[h]<8;Z=M?0:Z+i,Z<1.5&&(q=requestAnimationFrame(Ie))};function D(){Z=0,!q&&(Q||!P.current.autoPauseOffscreen)&&!document.hidden&&(j=0,q=requestAnimationFrame(Ie))}let _e=t=>{let a=z.getBoundingClientRect(),i=t.clientX-a.left,s=t.clientY-a.top;return{x:i,y:s,inside:i>=0&&s>=0&&i<=a.width&&s<=a.height}},De=t=>{let{x:a,y:i,inside:s}=_e(t),u=F.inside;F.inside=s,s&&(F.x=a,F.y=i,u||(b.x=a*c.ratio,b.y=(c.height-i)*c.ratio)),(s||u)&&D()};function Ne(t,a){U[X*2]=t*c.ratio,U[X*2+1]=(c.height-a)*c.ratio,Me[X]=J,X=(X+1)%A,D()}let ze=t=>{let a=P.current,{x:i,y:s,inside:u}=_e(t);!u||_||!a.enableRipples||Ne(i,s)},Ue=()=>{F.inside=!1,D()},Be=()=>D(),Le=new ResizeObserver(ke);Le.observe(z);let Xe=new IntersectionObserver(t=>{Q=t.some(a=>a.isIntersecting),Q&&D()});return Xe.observe(z),window.addEventListener("pointermove",De,{passive:!0}),window.addEventListener("pointerdown",ze,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ue),document.addEventListener("visibilitychange",Be),ke(),ae.current=D,()=>{cancelAnimationFrame(q),ae.current=null,Le.disconnect(),Xe.disconnect(),window.removeEventListener("pointermove",De),window.removeEventListener("pointerdown",ze),document.documentElement.removeEventListener("pointerleave",Ue),document.removeEventListener("visibilitychange",Be);for(let t of L)e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer);e.deleteVertexArray(re),e.deleteProgram(Y.program),e.deleteProgram(K.program),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,I.useEffect)(()=>{ae.current?.()}),(0,ve.jsx)("div",{ref:ge,className:["relative h-full w-full overflow-hidden",f].filter(Boolean).join(" "),style:R,"aria-label":"PixelBlast interactive background",children:(0,ve.jsx)("canvas",{ref:Re,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},We=Ut;var xe=V(ee(),1),Bt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],oe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],$t=Bt.map((o,r)=>({id:r+1,image:o,src:o,img:o,url:o,title:oe[r],text:oe[r],label:oe[r],alt:oe[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Lt({big:o}){return(0,xe.jsx)(Ve,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,xe.jsx)(We,{})})}var Ht=Oe(Lt);export{Ht as default};
