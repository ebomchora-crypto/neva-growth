import{c as W,i as go,j as Q,l as Ie,m as Ae}from"./chunks/chunk-6IYH4WPJ.js";var P=W(go(),1),ge=W(Q(),1),Ge=2400,pe=5,Z=2.6,H=7.5,Be=.56,xe=24,wo={focus:0,part:1,none:2},bo={dots:0,dashes:.45,lines:1},yo={depth:0,along:1,across:2},To=[0,.75,.35],Ve=[[0,0,0,0],[1.9,-4.6,-.08,2.4],[-1.05,2,.12,4.1]],Eo=[1,.5,.55],Ro=Math.PI/180,So=1/(2*Math.tan(Be/2)),C=`#version 300 es
precision highp float;
`,Mo=`
uniform float uTime;
uniform float uTwist;
uniform float uRoll;
uniform float uWaves;
uniform float uWidth;
uniform float uRibbon;
uniform mat3 uOrient;
uniform float uScale;
uniform vec4 uPlace;
uniform float uVolume;

float hash11(float n) {
  return fract(sin(n * 91.3458) * 47453.5453);
}

vec3 centerLocal(float s) {
  float t = uTime;
  float ph = uPlace.w;
  float x = s * ${xe.toFixed(1)};
  float y = uWaves * (0.52 * sin(x * 0.43 + t * 0.31 + ph) + 0.26 * sin(x * 0.79 - t * 0.23 + 1.3 + ph * 0.7)) + uPlace.x + x * uPlace.z;
  float z = uWaves * 0.65 * sin(x * 0.33 + t * 0.19 + 0.7 + ph * 1.3) + uPlace.y;
  return vec3(x, y, z);
}

float twistAt(float s, float layer) {
  float x = s * ${xe.toFixed(1)};
  return uTwist * 0.483 * x + uRoll + uPlace.w * 0.6 + layer * uVolume * 0.42 + 0.5 * sin(x * 0.26 + uTime * 0.27 + uPlace.w);
}

vec3 ribbonPoint(float s, float v, float n, float layer, out vec3 normal) {
  vec3 c0 = centerLocal(s);
  vec3 c1 = centerLocal(s + 0.004);
  vec3 tangent = normalize(c1 - c0);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 n0 = normalize(up - tangent * dot(up, tangent));
  vec3 b0 = cross(tangent, n0);
  float th = twistAt(s, layer);
  vec3 across = cos(th) * n0 + sin(th) * b0;
  vec3 sheet = -sin(th) * n0 + cos(th) * b0;
  float halfWidth = uWidth * (0.78 + 0.22 * cos(s * 3.14159));
  vec3 local = c0 + across * v * halfWidth + sheet * (n + layer * uVolume * 0.16) * halfWidth;
  normal = uOrient * sheet;
  return uOrient * (local * uScale);
}
`,Do=`${C}
${Mo}
uniform mat4 uViewProj;
uniform vec3 uEye;
uniform vec2 uViewport;
uniform float uDpr;
uniform float uFibers;
uniform float uDots;
uniform float uFlow;
uniform float uSize;
uniform float uFocus;
uniform float uDof;
uniform float uMaxCoc;
uniform float uFocal;
uniform float uIntro;
uniform vec4 uPulse;
uniform vec4 uHover;
uniform float uPart;
uniform float uDotLength;
uniform float uSparkle;
uniform float uDepthSpread;
uniform float uGain;
uniform float uTips;
uniform float uTint;
uniform float uGradient;
uniform float uFold;

out vec2 vLocal;
out float vRadius;
out float vSegment;
out vec3 vLight;
out float vTint;

vec3 project(vec3 world, out float depth) {
  vec4 clip = uViewProj * vec4(world, 1.0);
  depth = clip.w;
  vec2 ndc = clip.xy / clip.w;
  return vec3((ndc * 0.5 + 0.5) * uViewport, clip.w);
}

vec2 part(vec2 px) {
  if (uPart <= 0.0 || uHover.w <= 0.0) return px;
  vec2 away = px - uHover.xy;
  float dist = length(away);
  float radius = uHover.z;
  float push = uPart * uHover.w * radius * 0.55 * exp(-dist * dist / (radius * radius));
  return px + away / max(dist, 1e-3) * push * smoothstep(0.0, radius * 0.25, dist);
}

void main() {
  int perFiber = int(uDots);
  int fiber = gl_InstanceID / perFiber;
  int bead = gl_InstanceID - fiber * perFiber;
  float fi = float(fiber);
  float fk = float(bead);

  float seed = hash11(fi * 1.731 + uRibbon * 17.0);
  float s = fract((fk + uFlow + seed * uDots) / uDots) - 0.5;
  float sNext = s + 1.0 / uDots;
  float layer = mod(fi, 3.0) - 1.0;
  float slot = floor(fi / 3.0);
  float perLayer = max(floor(uFibers / 3.0), 1.0);
  float v = ((slot + 0.5) / perLayer) * 2.0 - 1.0 + (hash11(fi * 3.113 + 4.0) - 0.5) * (1.6 / perLayer) + layer * 0.12 / perLayer;
  float depthOffset = (hash11(fi * 7.919 + 2.0) - 0.5) * uDepthSpread * (0.35 + 6.0 * s * s);

  vec3 normal;
  vec3 world = ribbonPoint(s, v, depthOffset, layer, normal);
  vec3 nextNormal;
  vec3 nextWorld = ribbonPoint(sNext, v, depthOffset, layer, nextNormal);

  float depth;
  vec3 p0 = project(world, depth);
  float nextDepth;
  vec3 p1 = project(nextWorld, nextDepth);
  vec2 px = part(p0.xy);
  vec2 pxNext = part(p1.xy);

  float baseRadius = max(0.5 * uSize * uDpr * uFocal / max(depth, 0.1), 0.45);
  float coc = min(uDof * abs(1.0 - uFocus / max(depth, 0.1)) * uViewport.y * 0.035, uMaxCoc * uDpr);
  float radius = baseRadius + coc;
  float spill = max(10.0 * uDpr, baseRadius);
  float energy = pow(baseRadius / min(radius, spill), 1.25) * pow(min(1.0, spill / radius), 2.0);

  vec3 toEye = normalize(uEye - world);
  float facing = abs(dot(normalize(normal), toEye));
  float focalPx = uViewport.y * ${So.toFixed(5)} / max(depth, 0.1);
  float widthPx = 2.0 * uWidth * uScale * focalPx;
  float stack = (widthPx * facing + 2.0 * baseRadius) / (widthPx + 2.0 * baseRadius);
  float spacingFace = length(nextWorld - world) * focalPx;
  float trail = (length(p1.xy - p0.xy) + 2.0 * baseRadius) / (spacingFace + 2.0 * baseRadius);
  float crowd = sqrt(clamp(stack * trail, 0.002, 1.0));
  float fold = pow(1.0 - facing, 6.0) * uFold;
  float endFade = smoothstep(0.5, 0.4, abs(s)) * smoothstep(1.6, 4.2, depth);
  float tipEnd = mix(0.6, 0.06 + 0.26 * hash11(fi * 9.137 + uPlace.w * 3.0), uTips);
  float tip = exp(-pow((s - tipEnd) / 0.0065, 2.0)) * uTips;
  endFade *= smoothstep(tipEnd + 0.003, tipEnd - 0.001, s);
  float appear = smoothstep(0.0, 0.12, uIntro * 1.3 - (s + 0.5) - seed * 0.12);
  float twinklePhase = hash11(fi * 13.7 + fk * 0.917 + uRibbon * 3.0);
  float twinkle = pow(max(sin(uTime * (1.2 + 2.6 * twinklePhase) * 3.0 + twinklePhase * 61.0), 0.0), 36.0) * uSparkle * (1.0 - 0.85 * uDotLength);
  float pulseGap = abs(s - uPulse.x) - uPulse.y * 0.42;
  float pulse = uPulse.z * exp(-pulseGap * pulseGap / 0.0018) * (abs(uPulse.w - uRibbon) < 0.5 ? 1.0 : 0.35);
  float strength = mix(0.45, 1.0, hash11(fi * 5.37 + 1.0)) * mix(1.0, 0.72, abs(layer) * uVolume);
  float intensity = energy * crowd * strength * endFade * appear * 0.8 * uGain * (1.0 + fold * 7.0 + twinkle * 5.0 + pulse * 4.0 + tip * 7.0);
  float highlight = clamp(fold * 0.55 + twinkle + pulse + tip, 0.0, 1.0);

  vec2 segment = (pxNext - px) * uDotLength;
  float segmentLength = length(segment);
  intensity *= mix(1.0, (2.0 * radius) / (segmentLength + 2.0 * radius) * 1.6, uDotLength);
  vec2 axis = segmentLength > 1e-3 ? segment / segmentLength : vec2(1.0, 0.0);
  vec2 perp = vec2(-axis.y, axis.x);
  vec2 corner = vec2(gl_VertexID == 1 || gl_VertexID == 3 ? 1.0 : 0.0, gl_VertexID >= 2 ? 1.0 : 0.0);
  float along = mix(-radius, segmentLength + radius, corner.x);
  float across = mix(-radius, radius, corner.y);
  vec2 position = px + axis * along + perp * across;

  vLocal = vec2(along, across);
  vRadius = radius;
  vSegment = segmentLength;
  vLight = vec3(intensity, highlight, coc / max(radius, 1e-3));
  float depthTint = clamp(uTint + smoothstep(uFocus, uFocus + 5.0, depth) * 0.5, 0.0, 1.0);
  vTint = uGradient < 0.5 ? depthTint : uGradient < 1.5 ? smoothstep(-0.42, 0.42, s) : clamp(v * 0.5 + 0.5, 0.0, 1.0);
  if (intensity < 0.0005) position = vec2(-1e4);
  gl_Position = vec4(position / uViewport * 2.0 - 1.0, 0.0, 1.0);
}`,Fo=`${C}
uniform mat4 uViewProj;
uniform vec2 uViewport;
uniform float uDpr;
uniform float uTime;
uniform float uSize;
uniform float uFocus;
uniform float uDof;
uniform float uMaxCoc;
uniform float uFocal;
uniform float uIntro;
uniform float uSparkle;
uniform float uScale;
uniform float uGradient;
uniform float uGain;

out vec2 vLocal;
out float vRadius;
out float vSegment;
out vec3 vLight;
out float vTint;

float hash11(float n) {
  return fract(sin(n * 91.3458) * 47453.5453);
}

void main() {
  float id = float(gl_InstanceID);
  vec3 seed = vec3(hash11(id * 1.37 + 0.3), hash11(id * 2.91 + 1.7), hash11(id * 4.17 + 2.9));
  vec3 box = vec3(9.0, 5.4, 6.0);
  vec3 p = (seed - 0.5) * box;
  p.z -= 0.6;
  p += 0.18 * vec3(sin(uTime * 0.21 + seed.x * 40.0), sin(uTime * 0.17 + seed.y * 40.0), sin(uTime * 0.13 + seed.z * 40.0));
  p *= mix(1.0, uScale, 0.5);
  vec4 clip = uViewProj * vec4(p, 1.0);
  float depth = clip.w;
  vec2 px = (clip.xy / clip.w * 0.5 + 0.5) * uViewport;
  float size = uSize * mix(0.5, 1.4, hash11(id * 7.7));
  float baseRadius = max(0.5 * size * uDpr * uFocal / max(depth, 0.1), 0.45);
  float coc = min(uDof * abs(1.0 - uFocus / max(depth, 0.1)) * uViewport.y * 0.035, uMaxCoc * uDpr * 1.6);
  float radius = baseRadius + coc;
  float spill = max(10.0 * uDpr, baseRadius);
  float energy = pow(baseRadius / min(radius, spill), 0.9) * pow(min(1.0, spill / radius), 2.0);
  float twinkle = pow(max(sin(uTime * (0.8 + 1.6 * seed.y) * 2.0 + seed.z * 50.0), 0.0), 8.0);
  float intensity = energy * (0.35 + 0.65 * twinkle) * mix(0.4, 1.0, seed.x) * smoothstep(0.3, 1.0, uIntro) * (depth > 0.2 ? 1.0 : 0.0);
  vec2 corner = vec2(gl_VertexID == 1 || gl_VertexID == 3 ? 1.0 : 0.0, gl_VertexID >= 2 ? 1.0 : 0.0) * 2.0 - 1.0;
  vec2 position = px + corner * radius;
  vLocal = corner * radius;
  vRadius = radius;
  vSegment = 0.0;
  vLight = vec3(intensity * 0.8 * uGain, 0.3 + 0.6 * twinkle * uSparkle, coc / max(radius, 1e-3));
  vTint = uGradient < 0.5 ? 0.45 + 0.55 * seed.y : seed.y;
  gl_Position = vec4(position / uViewport * 2.0 - 1.0, 0.0, 1.0);
}`,Oe=`${C}
uniform vec3 uGlowColor;
uniform vec3 uLineColor;
uniform vec3 uSecondaryColor;
in vec2 vLocal;
in float vRadius;
in float vSegment;
in vec3 vLight;
in float vTint;
out vec4 outColor;
void main() {
  float along = clamp(vLocal.x, 0.0, vSegment);
  float d = length(vec2(vLocal.x - along, vLocal.y));
  float rho = d / max(vRadius, 1e-3);
  if (rho > 1.0) discard;
  float soft = clamp(2.6 / max(vRadius, 1e-3), 0.14, 1.0);
  float disk = 1.0 - smoothstep(1.0 - soft, 1.0, rho);
  float bokeh = disk * (0.94 + 0.08 * smoothstep(0.55, 0.95, rho));
  float core = exp(-rho * rho * 3.2);
  float shape = mix(core, bokeh, smoothstep(0.25, 0.7, vLight.z));
  vec3 color = mix(mix(uGlowColor, uSecondaryColor, vTint), uLineColor, vLight.y);
  outColor = vec4(color * shape * vLight.x, shape * vLight.x);
}`,ee=`${C}
out vec2 vUv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`,Lo=`${C}
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
vec3 pick(vec2 uv) {
  vec3 c = texture(uSource, uv).rgb;
  float peak = max(max(c.r, c.g), c.b);
  return c * smoothstep(0.35, 1.2, peak);
}
void main() {
  vec2 o = uTexel;
  vec3 c = pick(vUv + vec2(-o.x, -o.y)) + pick(vUv + vec2(o.x, -o.y)) + pick(vUv + vec2(-o.x, o.y)) + pick(vUv + vec2(o.x, o.y));
  outColor = vec4(c * 0.25, 1.0);
}`,Po=`${C}
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 o = uTexel;
  vec3 c = texture(uSource, vUv).rgb * 4.0;
  c += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb;
  c += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;
  c += texture(uSource, vUv + vec2(-o.x, o.y)).rgb;
  c += texture(uSource, vUv + vec2(o.x, o.y)).rgb;
  outColor = vec4(c / 8.0, 1.0);
}`,Co=`${C}
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 o = uTexel;
  vec3 c = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
  c += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  c += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;
  c += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
  c += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;
  c += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  c += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  c += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  outColor = vec4(c / 12.0, 1.0);
}`,_o=`${C}
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uGlow;
uniform float uBrightness;
uniform float uLightMode;
uniform float uGrain;
uniform float uVignette;
uniform float uFrame;
uniform vec2 uView;
uniform float uDpr;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void main() {
  vec4 scene = texture(uScene, vUv);
  vec3 bloom = texture(uBloom, vUv).rgb;
  vec3 light = (scene.rgb + bloom * uGlow) * uBrightness;
  float reach = max(uVignette * 0.3, 1e-4);
  float mask = uVignette > 0.0 ? smoother(vUv.x / reach) * smoother((1.0 - vUv.x) / reach) * smoother(vUv.y / reach) * smoother((1.0 - vUv.y) / reach) : 1.0;
  vec2 cell = floor(vUv * uView / max(uDpr, 1.0));
  float grain = hash(cell + uFrame * 17.31) + hash(cell * 1.31 + uFrame * 3.7 + 9.1) - 1.0;
  if (uLightMode > 0.5) {
    float amount = scene.a * uBrightness;
    float ink = (1.0 - exp(-amount * 1.5)) * mask;
    ink = clamp(ink * (1.0 + grain * uGrain * 2.0), 0.0, 1.0);
    vec3 hue = clamp(scene.rgb / max(scene.a, 1e-4), 0.0, 1.0);
    vec3 tone = hue * mix(1.0, 0.72, clamp(amount * 0.35, 0.0, 1.0));
    outColor = vec4(tone * ink, ink);
    return;
  }
  vec3 color = (1.0 - exp(-light * 1.25)) * mask;
  float peak = max(color.r, max(color.g, color.b));
  color = max(color + grain * uGrain * (0.25 + 0.75 * sqrt(peak)), 0.0);
  outColor = vec4(color, max(color.r, max(color.g, color.b)));
}`,Uo=["uTime","uTwist","uRoll","uWaves","uWidth","uRibbon","uOrient","uScale","uPlace","uVolume"],ko=[...Uo,"uViewProj","uEye","uViewport","uDpr","uFibers","uDots","uFlow","uSize","uFocus","uDof","uMaxCoc","uFocal","uIntro","uPulse","uHover","uPart","uDotLength","uSparkle","uDepthSpread","uGain","uTips","uTint","uGradient","uFold","uGlowColor","uLineColor","uSecondaryColor"],Io=["uViewProj","uViewport","uDpr","uTime","uSize","uFocus","uDof","uMaxCoc","uFocal","uIntro","uSparkle","uScale","uGradient","uGain","uGlowColor","uLineColor","uSecondaryColor"],ve=["uSource","uTexel"],Ao=["uScene","uBloom","uGlow","uBrightness","uLightMode","uGrain","uVignette","uFrame","uView","uDpr"],g=(i,c,x)=>Math.min(x,Math.max(c,i)),Ne=(i,c,x)=>{let d=i.createShader(c);return d?(i.shaderSource(d,x),i.compileShader(d),i.getShaderParameter(d,i.COMPILE_STATUS)?d:(i.deleteShader(d),null)):null},N=(i,c,x,d)=>{let v=Ne(i,i.VERTEX_SHADER,c),E=Ne(i,i.FRAGMENT_SHADER,x),b=i.createProgram();if(!v||!E||!b)return null;if(i.attachShader(b,v),i.attachShader(b,E),i.linkProgram(b),i.deleteShader(v),i.deleteShader(E),!i.getProgramParameter(b,i.LINK_STATUS))return i.deleteProgram(b),null;let _={};for(let U of d)_[U]=i.getUniformLocation(b,U);return{program:b,uniforms:_}},Go=(i,c,x,d)=>{let v=1/Math.tan(i/2),E=1/(x-d);return[v/c,0,0,0,0,v,0,0,0,0,(d+x)*E,-1,0,0,2*d*x*E,0]},Vo=(i,c)=>{let x=new Array(16);for(let d=0;d<4;d+=1)for(let v=0;v<4;v+=1)x[d*4+v]=i[v]*c[d*4]+i[4+v]*c[d*4+1]+i[8+v]*c[d*4+2]+i[12+v]*c[d*4+3];return x},Oo=(i,c,x)=>{let d=Math.cos(i),v=Math.sin(i),E=Math.cos(c),b=Math.sin(c),_=Math.cos(x),U=Math.sin(x),te=[d,0,-v,0,1,0,v,0,d],re=[1,0,0,0,E,b,0,-b,E],ne=[_,U,0,-U,_,0,0,0,1],$=(B,z)=>{let j=new Array(9);for(let D=0;D<3;D+=1)for(let F=0;F<3;F+=1)j[D*3+F]=B[F]*z[D*3]+B[3+F]*z[D*3+1]+B[6+F]*z[D*3+2];return j};return $(ne,$(re,te))},No=(i,c)=>[i[0]*c[0]+i[3]*c[1]+i[6]*c[2],i[1]*c[0]+i[4]*c[1]+i[7]*c[2],i[2]*c[0]+i[5]*c[1]+i[8]*c[2]],Bo=({glowColor:i="#8b5cf6",lineColor:c,secondaryColor:x,gradient:d="depth",speed:v=.5,scale:E=1,rotation:b=18,rollSpeed:_=.15,layers:U=3,waves:te=1,twist:re=1.2,threads:ne=72,volume:$=.7,spread:B=1,density:z=1,thickness:j=1,flow:D=.4,fiberStyle:F="dots",tips:Xe=0,foldGlow:We=1,perspective:He=.65,depthOfField:$e=.85,focusDepth:je=0,particles:qe=.5,sparkle:Ke=.5,glow:Ye=.8,brightness:Je=1,vignette:Qe=.3,grain:Ze=.06,mouseInteraction:eo=!0,hoverEffect:oo="focus",mouseStrength:to=1,pulseOnClick:ro=!0,intro:no=!0,lightMode:io=!1,paused:ao=!1,dpr:uo,...so})=>{let be=(0,P.useRef)(null),ye=(0,P.useRef)(null),ie=(0,P.useRef)(null),Te={glowColor:String(i),lineColor:c?String(c):"",secondaryColor:x?String(x):"",gradient:yo[d]??0,speed:Math.max(0,v),scale:g(E,.3,3),rotation:b*Ro,rollSpeed:_,layers:g(Math.round(U),1,3),waves:Math.max(0,te),twist:Math.max(0,re),threads:g(Math.round(ne),6,180),volume:g($,0,2),spread:g(B,.2,3),density:g(z,.2,3),thickness:g(j,.2,4),flow:D,dotLength:bo[F]??0,tips:g(Xe,0,1),foldGlow:g(We,0,3),perspective:g(He,0,1),depthOfField:g($e,0,2),focusDepth:g(je,-1,1),particles:g(qe,0,2),sparkle:g(Ke,0,2),glow:Math.max(0,Ye),brightness:Math.max(0,Je),vignette:g(Qe,0,1),grain:Math.max(0,Ze),mouseInteraction:eo,hover:wo[oo]??0,mouseStrength:Math.max(0,to),pulseOnClick:ro,intro:no,lightMode:io,paused:ao,dpr:uo},k=(0,P.useRef)(Te);k.current=Te,(0,P.useEffect)(()=>{let I=be.current,p=ye.current,e=p?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!I||!p||!e)return;let fo=!!e.getExtension("EXT_color_buffer_float"),q=N(e,Do,Oe,ko),K=N(e,Fo,Oe,Io),ae=N(e,ee,Lo,ve),ue=N(e,ee,Po,ve),se=N(e,ee,Co,ve),Y=N(e,ee,_o,Ao);if(!q||!K||!ae||!ue||!se||!Y)return;let mo=fo?e.RGBA16F:e.RGBA8,Ee=()=>({texture:null,framebuffer:e.createFramebuffer(),width:0,height:0}),Re=(o,r,n)=>{if(o.texture&&o.width===r&&o.height===n)return;o.texture&&e.deleteTexture(o.texture);let a=e.createTexture();e.bindTexture(e.TEXTURE_2D,a),e.texStorage2D(e.TEXTURE_2D,1,mo,r,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,o.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a,0),o.texture=a,o.width=r,o.height=n},L=Ee(),y=Array.from({length:pe},Ee),ce=e.createVertexArray(),le=document.createElement("canvas");le.width=1,le.height=1;let G=le.getContext("2d",{willReadFrequently:!0}),X=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,t={time:0,roll:0,flow:0,frame:0,intro:k.current.intro&&!X?0:Z,width:1,height:1,fit:1,colorKey:"",glow:[.55,.36,.96],line:[1,.85,.98],secondary:[.44,.29,.77],pointer:{x:0,y:0,inside:!1},hover:{x:0,y:0,presence:0,placed:!1},look:{x:0,y:0,vx:0,vy:0},focus:H+k.current.focusDepth*3,pulse:{s:0,age:9,strength:0,ribbon:0},camera:null},V=0,O=0,J=!0,fe=!0,me=(o,r)=>{if(!G||!o)return r;let n=/^[0-9a-f]{3,8}$/i.test(o)?`#${o}`:o;G.clearRect(0,0,1,1),G.fillStyle="#000000",G.fillStyle=n,G.fillRect(0,0,1,1);let[a,m,l]=G.getImageData(0,0,1,1).data;return[a/255,m/255,l/255]},ho=o=>{let r=`${o.glowColor}|${o.lineColor}|${o.secondaryColor}|${o.lightMode}`;r!==t.colorKey&&(t.colorKey=r,t.glow=me(o.glowColor,[.55,.36,.96]),t.secondary=o.secondaryColor?me(o.secondaryColor,t.glow):t.glow.map(n=>n*.8),o.lineColor?t.line=me(o.lineColor,t.glow):t.line=o.lightMode?t.glow:t.glow.map(n=>n+(1-n)*.72))},po=(o,r,n,a)=>{let m=Ve[n],l=m[3],f=o*xe,h=a*(.52*Math.sin(f*.43+r*.31+l)+.26*Math.sin(f*.79-r*.23+1.3+l*.7))+m[0]+f*m[2],T=a*.65*Math.sin(f*.33+r*.19+.7+l*1.3)+m[1];return[f,h,T]},vo=o=>{let r=t.width/Math.max(t.height,1),n=[0,0,H],a=Go(Be,r,.1,60),m=[1,0,0,0,0,1,0,0,0,0,1,0,-n[0],-n[1],-n[2],1],l=Oo(o.perspective*.85+t.look.x*.22,.12-t.look.y*.14,o.rotation);return{eye:n,viewProj:Vo(a,m),orient:l}},xo=(o,r)=>{let n=o.viewProj,a=n[0]*r[0]+n[4]*r[1]+n[8]*r[2]+n[12],m=n[1]*r[0]+n[5]*r[1]+n[9]*r[2]+n[13],l=n[3]*r[0]+n[7]*r[1]+n[11]*r[2]+n[15];return{x:(a/l*.5+.5)*t.width,y:(.5-m/l*.5)*t.height,depth:l}},Se=(o,r,n)=>{let a=t.camera;if(!a)return null;let m=null;for(let l=0;l<o.layers;l+=1)for(let f=0;f<=96;f+=1){let h=f/96-.5,T=po(h,t.time,l,o.waves).map(w=>w*o.scale*t.fit),s=No(a.orient,T),R=xo(a,s),S=Math.hypot(R.x-r,R.y-n);(!m||S<m.gap)&&(m={gap:S,s:h,ribbon:l,depth:R.depth})}return m},Me=()=>{let o=k.current,r=Math.max(1,I.clientWidth),n=Math.max(1,I.clientHeight),a=Math.min(o.dpr||window.devicePixelRatio||1,2),m=Math.max(r,n)*a,l=m>Ge?a*Ge/m:a,f=Math.max(1,Math.round(r*l)),h=Math.max(1,Math.round(n*l));(p.width!==f||p.height!==h)&&(p.width=f,p.height=h),t.width=r,t.height=n,t.fit=g(r/n/1.5,.6,1),he()},de=(o,r,n,a)=>{e.bindFramebuffer(e.FRAMEBUFFER,r.framebuffer),e.viewport(0,0,r.width,r.height),e.useProgram(o.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,n.texture),e.uniform1i(o.uniforms.uSource,0),e.uniform2f(o.uniforms.uTexel,a[0],a[1]),e.drawArrays(e.TRIANGLES,0,3)},he=()=>{let o=k.current;ho(o);let r=vo(o);t.camera=r;let n=p.height/Math.max(t.height,1),a=o.paused||X?1:g(t.intro/Z,0,1),m=1-(1-a)*(1-a)*(1-a);Re(L,p.width,p.height),e.bindVertexArray(ce),e.bindFramebuffer(e.FRAMEBUFFER,L.framebuffer),e.viewport(0,0,p.width,p.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);let l=Math.round(260*o.density),f=22*g(Math.sqrt(56e3/(o.threads*l*o.layers)),.45,1),h=Math.max(.8*o.thickness,.45)**2/.64,T=Math.pow(o.threads/72*o.density*h,-.75);e.useProgram(q.program);let s=q.uniforms;e.uniform1f(s.uTime,t.time),e.uniform1f(s.uTwist,o.twist),e.uniform1f(s.uRoll,t.roll),e.uniform1f(s.uWaves,o.waves),e.uniform1f(s.uWidth,.62*o.spread),e.uniformMatrix3fv(s.uOrient,!1,r.orient),e.uniform1f(s.uScale,o.scale*t.fit),e.uniformMatrix4fv(s.uViewProj,!1,r.viewProj),e.uniform3f(s.uEye,r.eye[0],r.eye[1],r.eye[2]),e.uniform2f(s.uViewport,p.width,p.height),e.uniform1f(s.uDpr,n),e.uniform1f(s.uFibers,o.threads),e.uniform1f(s.uDots,l),e.uniform1f(s.uFlow,t.flow),e.uniform1f(s.uSize,1.6*o.thickness),e.uniform1f(s.uFocus,t.focus),e.uniform1f(s.uDof,o.depthOfField),e.uniform1f(s.uMaxCoc,f),e.uniform1f(s.uFocal,H),e.uniform1f(s.uIntro,m),e.uniform4f(s.uPulse,t.pulse.s,t.pulse.age,t.pulse.strength,t.pulse.ribbon),e.uniform4f(s.uHover,t.hover.x*n,(t.height-t.hover.y)*n,140*n,t.hover.presence*o.mouseStrength),e.uniform1f(s.uPart,o.hover===1?1:0),e.uniform1f(s.uDotLength,o.dotLength),e.uniform1f(s.uSparkle,o.sparkle),e.uniform1f(s.uDepthSpread,.12),e.uniform1f(s.uVolume,o.volume),e.uniform3f(s.uGlowColor,t.glow[0],t.glow[1],t.glow[2]),e.uniform3f(s.uLineColor,t.line[0],t.line[1],t.line[2]),e.uniform3f(s.uSecondaryColor,t.secondary[0],t.secondary[1],t.secondary[2]),e.uniform1f(s.uTips,o.tips),e.uniform1f(s.uGradient,o.gradient),e.uniform1f(s.uFold,o.foldGlow);for(let u=0;u<o.layers;u+=1){let M=Ve[u];e.uniform1f(s.uRibbon,u),e.uniform4f(s.uPlace,M[0],M[1],M[2],M[3]),e.uniform1f(s.uGain,Eo[u]*T),e.uniform1f(s.uTint,To[u]),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,o.threads*l)}let R=Math.round(420*o.particles);if(R>0){e.useProgram(K.program);let u=K.uniforms;e.uniformMatrix4fv(u.uViewProj,!1,r.viewProj),e.uniform2f(u.uViewport,p.width,p.height),e.uniform1f(u.uDpr,n),e.uniform1f(u.uTime,t.time),e.uniform1f(u.uSize,2.2*o.thickness),e.uniform1f(u.uFocus,t.focus),e.uniform1f(u.uDof,o.depthOfField),e.uniform1f(u.uMaxCoc,22),e.uniform1f(u.uFocal,H),e.uniform1f(u.uIntro,m),e.uniform1f(u.uSparkle,o.sparkle),e.uniform1f(u.uScale,o.scale*t.fit),e.uniform1f(u.uGradient,o.gradient),e.uniform1f(u.uGain,1/o.thickness),e.uniform3f(u.uGlowColor,t.glow[0],t.glow[1],t.glow[2]),e.uniform3f(u.uLineColor,t.line[0],t.line[1],t.line[2]),e.uniform3f(u.uSecondaryColor,t.secondary[0],t.secondary[1],t.secondary[2]),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,R)}e.disable(e.BLEND);let S=o.glow>.001&&!o.lightMode;if(e.bindVertexArray(ce),S){y.forEach((u,M)=>{Re(u,Math.max(1,Math.round(p.width/2**(M+1))),Math.max(1,Math.round(p.height/2**(M+1))))}),de(ae,y[0],L,[.5/L.width,.5/L.height]);for(let u=1;u<pe;u+=1)de(ue,y[u],y[u-1],[1/y[u-1].width,1/y[u-1].height]);e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);for(let u=pe-1;u>0;u-=1)de(se,y[u-1],y[u],[.5/y[u].width,.5/y[u].height]);e.disable(e.BLEND)}e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,p.width,p.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(Y.program);let w=Y.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,L.texture),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,S?y[0].texture:L.texture),e.uniform1i(w.uScene,0),e.uniform1i(w.uBloom,1),e.uniform1f(w.uGlow,S?o.glow:0),e.uniform1f(w.uBrightness,o.brightness),e.uniform1f(w.uLightMode,o.lightMode?1:0),e.uniform1f(w.uGrain,o.grain),e.uniform1f(w.uVignette,o.vignette),e.uniform1f(w.uFrame,t.frame%977),e.uniform2f(w.uView,p.width,p.height),e.uniform1f(w.uDpr,n),e.drawArrays(e.TRIANGLES,0,3),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,null),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,null),e.bindVertexArray(null)},De=o=>{if(V=0,!fe||!J||document.hidden)return;let r=k.current,n=O?(o-O)/1e3:1/60,a=Math.min(.05,n);O=o;let m=!r.paused&&!X;m?(t.frame+=1,t.time+=a*r.speed,t.roll+=a*r.speed*r.rollSpeed,t.flow+=a*r.flow*12,t.intro+=Math.min(n,1)):t.intro<Z&&(t.intro=Z),t.pulse.age+=a,t.pulse.strength=Math.max(0,1-t.pulse.age/1.8)**2;let{pointer:l,hover:f,look:h}=t,T=r.mouseInteraction&&l.inside&&!X;T&&!f.placed&&(f.x=l.x,f.y=l.y,f.placed=!0),f.x+=(l.x-f.x)*(1-Math.exp(-a/.08)),f.y+=(l.y-f.y)*(1-Math.exp(-a/.08));let s=T?1:0;f.presence+=(s-f.presence)*(1-Math.exp(-a/(s>f.presence?.3:.6))),!T&&f.presence<.001&&(f.placed=!1);let R=T?(l.x/t.width-.5)*.5:0,S=T?(.5-l.y/t.height)*.5:0;h.vx+=(30*(R-h.x)-11*h.vx)*a,h.vy+=(30*(S-h.y)-11*h.vy)*a,h.x+=h.vx*a,h.y+=h.vy*a;let w=H+r.focusDepth*3,u=w;if(T&&r.hover===0){let ke=Se(r,f.x,f.y);ke&&(u=w+(ke.depth-w)*f.presence*Math.min(1,r.mouseStrength))}t.focus+=(u-t.focus)*(1-Math.exp(-a/.35)),he();let M=Math.abs(s-f.presence)>.002||Math.abs(R-h.x)>2e-4||Math.abs(S-h.y)>2e-4||Math.abs(u-t.focus)>.001||t.pulse.strength>.001;m||M?V=requestAnimationFrame(De):O=0},A=()=>{!V&&fe&&J&&!document.hidden&&(V=requestAnimationFrame(De))},Fe=o=>{let r=I.getBoundingClientRect(),n=o.clientX-r.left,a=o.clientY-r.top;t.pointer.x=n,t.pointer.y=a,t.pointer.inside=n>=0&&a>=0&&n<=r.width&&a<=r.height,A()},Le=o=>{let r=k.current;if(!r.mouseInteraction||!r.pulseOnClick||o.button!==0||X||o.target instanceof Element&&o.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let n=I.getBoundingClientRect(),a=o.clientX-n.left,m=o.clientY-n.top;if(a<0||m<0||a>n.width||m>n.height)return;let l=Se(r,a,m);l&&(t.pulse={s:l.s,age:0,strength:1,ribbon:l.ribbon}),A()},Pe=()=>{t.pointer.inside=!1,A()},Ce=()=>{O=0,A()},_e=new ResizeObserver(Me);_e.observe(I);let Ue=new IntersectionObserver(o=>{J=o.some(r=>r.isIntersecting),J&&(O=0,A())});return Ue.observe(I),window.addEventListener("pointermove",Fe,{passive:!0}),window.addEventListener("pointerdown",Le),document.documentElement.addEventListener("pointerleave",Pe),document.addEventListener("visibilitychange",Ce),Me(),A(),ie.current=()=>{V||he(),A()},()=>{fe=!1,cancelAnimationFrame(V),ie.current=null,_e.disconnect(),Ue.disconnect(),window.removeEventListener("pointermove",Fe),window.removeEventListener("pointerdown",Le),document.documentElement.removeEventListener("pointerleave",Pe),document.removeEventListener("visibilitychange",Ce),e.deleteVertexArray(ce),[L,...y].forEach(o=>{o.texture&&e.deleteTexture(o.texture),e.deleteFramebuffer(o.framebuffer)}),[q,K,ae,ue,se,Y].forEach(o=>e.deleteProgram(o.program))}},[]),(0,P.useEffect)(()=>{ie.current?.()});let{className:co="",...lo}=so;return(0,ge.jsx)("div",{ref:be,className:["relative h-full w-full overflow-hidden",co].filter(Boolean).join(" "),...lo,children:(0,ge.jsx)("canvas",{ref:ye,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ze=Bo;var we=W(Q(),1),zo=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],oe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ko=zo.map((i,c)=>({id:c+1,image:i,src:i,img:i,url:i,title:oe[c],text:oe[c],label:oe[c],alt:oe[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Xo({big:i}){return(0,we.jsx)(Ae,{big:i,dark:!0,center:!1,zoom:1,drive:!1,children:(0,we.jsx)(ze,{})})}var Yo=Ie(Xo);export{Yo as default};
