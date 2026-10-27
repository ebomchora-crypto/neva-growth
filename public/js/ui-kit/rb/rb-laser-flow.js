import{c as B,i as nt,j as O,l as we,m as Ee}from"./chunks/chunk-6IYH4WPJ.js";var w=B(nt(),1),oe=B(O(),1),st=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,it=`#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uScale;
uniform float uTime;
uniform float uBeamX;
uniform vec4 uSurface;
uniform float uRadius;
uniform vec3 uIntro;
uniform vec4 uPour;
uniform vec2 uRun;
uniform vec4 uLens;
uniform sampler2D uReveal;
uniform vec4 uRevealMap;
uniform vec2 uRevealInfo;
uniform float uAtmosphere;
uniform vec4 uAmount;
uniform vec4 uShape;
uniform vec4 uExtra;
uniform float uTheme;
uniform vec3 uTint[16];

#define BEAM uTint[0]
#define LEFT uTint[1]
#define RIGHT uTint[2]
#define CYAN uTint[3]
#define PINK uTint[4]
#define LILAC uTint[5]
#define SKY uTint[6]
#define PURPLE uTint[7]
#define DEEP uTint[8]
#define MIST uTint[9]
#define NAVY uTint[10]
#define WARM uTint[11]
#define EMBER uTint[12]
#define WHITE uTint[13]
#define HAZE uTint[14]
#define LAVENDER uTint[15]

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

float sq(float x) {
  return x * x;
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 spill(float e, float fall, float strength, float front, float t, out vec3 glow) {
  glow = vec3(0.0);
  if (strength < 0.0005) return vec3(0.0);
  float f = max(fall, 0.0);
  float d = max(e, 0.0);
  float u = d / (6.0 + 0.28 * f);
  float start = smoothstep(-6.0, 12.0, fall);
  float fade = exp(-sq(max(f - 125.0, 0.0) / 40.0));
  float streak = 0.88 + 0.24 * noise(vec2(u * 6.0, f / 22.0 - t * 1.7));
  float bright = pow(strength, 1.5);
  float soft = sqrt(strength);
  float warmth = smoothstep(90.0, 130.0, f);
  vec3 coreK = mix(WHITE, WARM, warmth * exp(-d / 9.0));
  float core = mix(9.0, 2.6, warmth) * exp(-sq(d / (3.5 + 0.04 * f))) * exp(-sq(max(f - 130.0, 0.0) / 38.0));
  float wall = 24.0 * exp(-sq(d / 1.1)) * exp(-sq(max(f - 100.0, 0.0) / 30.0));
  float bandCenter = 0.7 - 0.3 * smoothstep(30.0, 110.0, f);
  float offset = u - bandCenter;
  float decay = (1.05 - bandCenter) / 1.31;
  float profile = offset < 0.0 ? exp(-sq(offset / 0.3)) : exp(-offset / decay);
  profile *= 1.0 - smoothstep(1.0, 1.4, u);
  vec3 bandA = mix(CYAN, PINK, smoothstep(50.0, 75.0, f));
  bandA = mix(bandA, LILAC, smoothstep(100.0, 125.0, f));
  vec3 bandB = mix(SKY, PURPLE, smoothstep(50.0, 75.0, f));
  vec3 fanK = mix(bandA, bandB, smoothstep(0.06, 0.18, offset));
  fanK = mix(fanK, DEEP, smoothstep(0.22, 0.42, offset));
  vec3 thread = WHITE * wall * bright + coreK * core * streak * bright;
  glow += fanK * 4.5 * profile * fade * streak * bright;
  glow += MIST * 0.7 * exp(-max(u - 1.0, 0.0) / 0.9) * smoothstep(0.7, 1.2, u) * fade * soft;
  glow += EMBER * 0.35 * exp(-sq((f - 165.0) / 22.0)) * exp(-d / 25.0) * bright;
  float lag = u * (6.0 + 0.28 * f) * 0.35;
  float reveal = 1.0 - smoothstep(front - 70.0, front + 8.0, f + lag);
  glow *= start * reveal;
  return thread * start * reveal;
}

vec3 easeLight(vec3 light, float amount) {
  return -log(max(1.0 - amount * (1.0 - exp(-light)), vec3(0.0001)));
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 p = frag / uScale;
  float t = uTime;
  float bx = uBeamX / uScale;
  float sl = uSurface.x / uScale;
  float sy = uSurface.y / uScale;
  float sr = uSurface.z / uScale;
  float sb = uSurface.w / uScale;
  float radius = uRadius / uScale;
  float dx = p.x - bx;
  float adx = abs(dx);
  float h = sy - p.y;
  float hp = max(h, 0.0);
  float above = smoothstep(-0.5, 0.5, h);
  float side = smoothstep(-24.0, 24.0, dx);
  vec3 sideK = mix(mix(LAVENDER, LEFT, smoothstep(40.0, 140.0, adx)), RIGHT, side);
  float beamWidth = uShape.x;
  float flare = uShape.y;
  float spread = 250.0 * uShape.z;
  float reachL = max(bx - sl, 1.0);
  float reachR = max(sr - bx, 1.0);
  float reach = dx < 0.0 ? reachL : reachR;
  float layerLen = clamp(0.29 * reach, 20.0, 100.0) * sqrt(uShape.z);
  float run = uRun.x;
  float runMask = 1.0 - smoothstep(run - 34.0, run + 6.0, adx);
  float bead = exp(-sq((adx - run + 16.0) / (18.0 + 0.04 * run))) * uRun.y;
  float flowMask = (1.0 - smoothstep(0.75 * spread, 1.1 * spread, adx)) * runMask;
  float edgeMask = (1.0 - smoothstep(0.8 * spread, 1.25 * spread, adx)) * runMask;
  float bloom = uIntro.y;
  vec2 center = vec2((sl + sr) * 0.5, (sy + sb) * 0.5);
  vec2 halfSize = vec2((sr - sl) * 0.5, (sb - sy) * 0.5);
  float sd = roundBox(p - center, halfSize, radius);
  float outline = max(sd, 0.0);
  float below = max(p.y - sy - radius, 0.0);
  float hug = smoothstep(-0.5, 0.5, sd) * exp(-sq(below / 14.0));
  float hugWide = smoothstep(-0.5, 0.5, sd) * exp(-sq(below / 40.0));

  vec3 col = vec3(0.0);

  float breathe = 1.0 + uExtra.x * (0.12 * sin(t * 1.5708) + 0.08 * (noise(vec2(t * 0.5, 3.0)) - 0.5));

  float front = uIntro.x / uScale;
  float drop = smoothstep(front + 10.0, front - 110.0, p.y);
  float falling = 1.0 - smoothstep(sy - 24.0, sy, front);
  float top = mix(0.3, 1.0, smoothstep(0.0, 0.3 * sy, p.y));
  float beamCore = 24.0 * exp(-adx / (2.0 * beamWidth));
  float beamHalo = 1.3 * exp(-adx / (6.0 * beamWidth)) + 0.3 * exp(-adx / (22.0 * beamWidth));
  vec3 haloK = mix(BEAM, sideK, exp(-hp / 80.0));
  col += (BEAM * beamCore + haloK * beamHalo) * top * above * drop;
  float head = exp(-sq((p.y - front) / 24.0)) * falling;
  col += mix(WHITE, BEAM, 0.35) * head * (7.0 * exp(-adx / (2.6 * beamWidth)) + 1.0 * exp(-adx / (14.0 * beamWidth)));

  float psi = adx * (outline + 1.0);
  float rise = max(hp - 17.9 * flare, 0.0);
  float skirtAmp = 16.6 * (exp(-sq(rise / (11.8 * flare))) + 0.3 * exp(-rise / (60.0 * flare)));
  float skirtSpread = mix(134.0, 155.0, side) * breathe * flare * flare * mix(0.35, 1.0, min(bloom, 1.0)) * max(bloom, 1.0);
  float skirt = skirtAmp * exp(-psi / skirtSpread) * exp(-sq(adx / (max(layerLen, 60.0 * sqrt(uShape.z)) * 1.48))) * hug;
  col += sideK * skirt * flowMask * min(bloom, 1.0);

  float layer = 12.0 * exp(-adx / layerLen) * exp(-outline / (0.19 * layerLen)) * (1.0 + 0.4 * bead);
  col += sideK * layer * hug * flowMask * min(bloom, 1.0);
  float washMask = smoothstep(sl - 60.0, sl + 6.0, p.x) * (1.0 - smoothstep(sr - 6.0, sr + 45.0, p.x));
  float wash = 1.4 * exp(-adx / 100.0) * exp(-outline / 30.0);
  col += mix(BEAM, sideK, 0.25) * wash * hugWide * washMask * flowMask * min(bloom, 1.0);
  float highWash = 0.7 * exp(-adx / 140.0) * exp(-outline / 60.0);
  col += mix(BEAM, NAVY, 0.5) * highWash * hugWide * washMask * runMask * min(bloom, 1.0);

  float sideSign = dx < 0.0 ? 0.0 : 1.0;
  float along = 0.5 * log((hp + 1.0) / (adx + 1.0));
  float lineScale = 6.0;
  float lp = log(max(psi, 1.0) / (120.0 * flare * flare)) * lineScale;
  float lineIndex = floor(lp) + sideSign * 97.0;
  float wobble = 0.22 * (noise(vec2(lineIndex * 3.7, t * 0.4 + along)) - 0.5);
  float lf = fract(lp + wobble) - 0.5;
  float gradient = lineScale * length(vec2(hp + 1.0, adx)) / max(psi, 1.0) / uScale;
  float halfWidth = max(0.35 * gradient, 0.0001);
  float drawWidth = max(halfWidth, 0.6 * gradient);
  float lineShape = exp(-lf * lf / (drawWidth * drawWidth)) * (halfWidth / drawWidth);
  float lineOn = step(0.3, hash(vec2(lineIndex, 1.3)));
  float lineFlow = smoothstep(0.25, 0.85, noise(vec2(lineIndex * 5.3 + 2.0, along * 3.0 + t * 1.1)));
  float flareArea = 120.0 * flare * flare;
  float lineEnvelope = smoothstep(0.85 * flareArea, 1.4 * flareArea, psi) * (1.0 - smoothstep(3.2 * flareArea, 7.5 * flareArea, psi));
  lineEnvelope *= exp(-adx / (layerLen * 1.5)) * hug * flowMask * (1.0 - smoothstep(35.0 * flare, 80.0 * flare, hp));
  float lineBright = mix(0.35, 1.0, hash(vec2(lineIndex, 4.0)));
  col += mix(sideK, WHITE, 0.6) * lineShape * lineOn * lineFlow * lineEnvelope * lineBright * 2.6 * uAmount.w * min(bloom, 1.0);

  float edgeGlow = 22.8 * exp(-sq(adx / (150.0 * uShape.z))) * edgeMask * (1.0 + 0.9 * bead);
  float onTop = 1.0 - smoothstep(sy + radius, sy + radius + 10.0, p.y);
  float edgeLine = (exp(-sq(max(sd, 0.0) / 0.9)) + 0.12 * exp(-max(sd, 0.0) / 3.0)) * edgeGlow * onTop;
  col += mix(sideK, WHITE, 0.6) * edgeLine * min(bloom, 1.0);

  float pour = uShape.w;
  float baseline = exp(-sq(130.0 / 150.0));
  float strengthR = exp(-sq(reachR / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachR)) / baseline * pour;
  float strengthL = exp(-sq(reachL / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachL)) / baseline * pour;
  float fallY = p.y - sy - 0.3 * radius;
  float rightHalf = smoothstep(center.x - 4.0, center.x + 4.0, p.x);
  float haloR = exp(-length(p - vec2(sr - 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthR);
  float haloL = exp(-length(p - vec2(sl + 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthL);
  vec3 glowR;
  vec3 glowL;
  col += spill(sd, fallY, strengthR, uPour.y, t, glowR) * rightHalf;
  col += spill(sd, fallY, strengthL, uPour.x, t, glowL) * (1.0 - rightHalf);
  col += easeLight(glowR * rightHalf + NAVY * 0.9 * haloR, uPour.w);
  col += easeLight(glowL * (1.0 - rightHalf) + NAVY * 0.9 * haloL, uPour.z);

  vec2 toLens = frag - uLens.xy;
  float lens = exp(-dot(toLens, toLens) / sq(uLens.z)) * uLens.w;
  col *= 1.0 + 0.35 * lens * hug;
  float fogAmount = uAmount.y * uAtmosphere;
  float near = exp(-adx / 150.0);
  float envelope = near * (0.3 + 0.4 * exp(-hp / 50.0) + 1.2 * exp(-p.y / 120.0));
  if (fogAmount > 0.001 && h > -2.0 && envelope * max(0.25, 6.0 * exp(-adx / 50.0)) > 0.002) {
    vec2 fq = vec2(dx / 1.7, h) / 85.0 + vec2(t * 0.012, -t * 0.03) + uExtra.zw;
    vec2 fw = vec2(fbm(fq * 1.3 + vec2(1.7, 9.2) + t * 0.03), fbm(fq * 1.3 + vec2(8.3, 2.8) - t * 0.025));
    float cloud = fbm(fq + 1.4 * fw);
    float density = smoothstep(0.5, 0.78, cloud);
    float lit = exp(-adx / 50.0);
    float fogMask = smoothstep(-2.0, 20.0, h);
    float reached = smoothstep(front + 80.0, front - 40.0, p.y);
    vec3 fog = (HAZE * 0.45 + BEAM * 6.0 * lit * reached) * density * envelope * fogMask;
    float surfaceLit = exp(-adx / (layerLen * 1.3)) * exp(-outline / 28.0) * hugWide * flowMask * washMask * min(bloom, 1.0);
    fog += sideK * 2.2 * surfaceLit * (smoothstep(0.38, 0.72, cloud) - 0.35) * fogMask;
    float smoke = smoothstep(0.3, 0.75, cloud);
    fog += BEAM * 0.35 * exp(-adx / (22.0 * beamWidth)) * (0.35 + 0.9 * smoke) * fogMask * top * drop;
    col += fog * fogAmount * (1.0 + 1.2 * lens) * mix(1.0, 0.45, uTheme);
  }

  if (uRevealInfo.y > 0.001 && uLens.w > 0.002) {
    vec2 toReveal = frag - uLens.xy;
    float reveal = exp(-dot(toReveal, toReveal) / sq(uRevealInfo.x)) * uLens.w;
    vec2 uv = frag * uRevealMap.xy + uRevealMap.zw;
    float onImage = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    vec4 ui = texture(uReveal, uv);
    float ink = max(ui.r, max(ui.g, ui.b)) * onImage;
    float lit = clamp(col.b * 0.9, 0.0, 1.0) * (1.0 - smoothstep(0.9, 2.2, col.b));
    float clearance = smoothstep(60.0 * sqrt(beamWidth), 150.0 * sqrt(beamWidth), adx);
    col += mix(BEAM, WHITE, 0.4) * ink * reveal * lit * clearance * uRevealInfo.y * 2.2;
  }

  float haze = col.b;
  float dotGrid = 1.0 - smoothstep(0.16, 0.32, length(fract(frag / 3.0) - 0.5));
  col += BEAM * dotGrid * clamp(haze, 0.0, 1.5) * (1.0 - smoothstep(1.5, 4.0, haze)) * (0.18 + 0.3 * lens) * uExtra.y;
  if (lens > 0.002) {
    vec2 drift = frag - vec2(0.0, t * 14.0);
    vec2 sparkCell = floor(drift / 7.0);
    vec2 sparkPos = (sparkCell + 0.2 + 0.6 * vec2(hash(sparkCell + 5.1), hash(sparkCell + 2.3))) * 7.0;
    float sparkDist = length(drift - sparkPos);
    float sparkOn = step(0.8, hash(sparkCell + 8.8));
    float sparkTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(sparkCell + 3.7) * 6.283);
    col += WHITE * exp(-sparkDist * sparkDist / 0.35) * sparkOn * sparkTwinkle * lens * clamp(haze * 1.5, 0.0, 1.0) * 1.6 * uAmount.z;
  }

  float dustAmount = uAmount.z;
  if (dustAmount > 0.001) {
    float dustLp = log(max(psi, 1.0) / (120.0 * flare * flare)) * 2.2;
    vec2 flowCell = vec2(dustLp / 1.1, (along + t * 0.22) / 0.06);
    vec2 cellId = floor(flowCell) + vec2(sideSign * 131.0, 0.0);
    vec2 cellJitter = vec2(hash(cellId + 1.7), hash(cellId + 8.3));
    vec2 particleFlow = (floor(flowCell) + 0.1 + cellJitter * 0.8) * vec2(1.1, 0.06);
    float particlePsi = 120.0 * flare * flare * exp(particleFlow.x / 2.2);
    float particleAlong = particleFlow.y - t * 0.22;
    float particleX = sqrt(particlePsi * exp(-2.0 * particleAlong)) - 1.0;
    float particleH = sqrt(particlePsi * exp(2.0 * particleAlong)) - 1.0;
    float particleDist = length(vec2(adx - particleX, hp - particleH)) * uScale;
    float particleOn = step(0.62, hash(cellId + 3.1));
    float particleTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(cellId + 9.2) * 6.283);
    float dustZone = exp(-sq(log(max(psi, 1.0) / (200.0 * flare * flare)) / 0.55)) * hug * flowMask * smoothstep(0.0, 6.0, outline);
    col += WHITE * exp(-particleDist * particleDist / 0.3) * particleOn * particleTwinkle * dustZone * 3.0 * dustAmount * min(bloom, 1.0);

    vec2 glitterCell = vec2(dx / 3.0, (p.y - t * 26.0) / 9.0);
    vec2 glitterId = floor(glitterCell);
    vec2 glitterJitter = vec2(hash(glitterId + 4.4), hash(glitterId + 2.9));
    vec2 glitterPos = (glitterId + 0.15 + glitterJitter * 0.7) * vec2(3.0, 9.0);
    float glitterDist = length(vec2(dx, p.y - t * 26.0) - glitterPos) * uScale;
    float glitterOn = step(0.7, hash(glitterId + 6.6));
    float glitterTwinkle = 0.5 + 0.5 * sin(t * 6.0 + hash(glitterId + 1.1) * 6.283);
    float glitterZone = exp(-adx / (5.0 * beamWidth)) * smoothstep(1.5, 4.0, adx / beamWidth) * above * smoothstep(25.0, 70.0, hp) * top * drop;
    col += WHITE * exp(-glitterDist * glitterDist / 0.25) * glitterOn * glitterTwinkle * glitterZone * 2.2 * dustAmount * uAtmosphere;
  }

  col *= uAmount.x * (1.0 + uIntro.z * 0.9 * exp(-length(vec2(dx, h * 1.6)) / 70.0));
  col *= smoothstep(-0.75, 0.25, sd * uScale);

  vec3 emit = 1.0 - exp(-col * mix(1.0, 0.6, uTheme));
  float peak = max(emit.r, max(emit.g, emit.b));
  if (uTheme > 0.5) {
    float low = min(emit.r, min(emit.g, emit.b));
    float chroma = peak - low;
    vec3 hue = (emit - low) / max(chroma, 0.0001);
    float alpha = clamp(pow(chroma, 1.35) * 1.3, 0.0, 1.0) * 0.9;
    outColor = vec4((hue * 0.82 + 0.06) * alpha, alpha);
  } else {
    outColor = vec4(emit, peak);
  }
}`,Ae=[[0,1],[-11.5,.77],[9.5,.95],[-53.5,.79],[39.5,.77],[16,.81],[-16.3,.92],[13.3,.96],[3,1.01],[1,.68],[1,1.15],[142.5,.51],[113.6,.28],[-7.5,.13],[-2.7,.32],[7.5,.81]],Me=.78,ye=2048,ae=1.25,X=5,v=(t,c,h)=>Math.min(h,Math.max(c,t)),ft=t=>1-Math.pow(1-v(t,0,1),3),ct=t=>{let r=8*Math.sqrt(.6155999999999999);return 1-Math.exp(-.62*8*t)*(Math.cos(r*t)+.62*8/r*Math.sin(r*t))},ut=([t,c,h])=>{let r=Math.max(t,c,h),m=Math.min(t,c,h),d=r-m,b=0;return d>0&&(r===t?b=(c-h)/d%6:r===c?b=(h-t)/d+2:b=(t-c)/d+4),[(b*60+360)%360,r>0?d/r:0]},ht=(t,c)=>{let h=(t%360+360)%360/60,r=c,m=r*(1-Math.abs(h%2-1)),d=1-r,[b,I,Y]=h<1?[r,m,0]:h<2?[m,r,0]:h<3?[0,r,m]:h<4?[0,m,r]:h<5?[m,0,r]:[r,0,m];return[b+d,I+d,Y+d]},Se=t=>{let[c,h]=ut(t),r=h/Me,m=new Float32Array(Ae.length*3);return Ae.forEach(([d,b],I)=>{m.set(ht(c+d,v(Me*b*r,0,1)),I*3)}),m},Le=(t,c,h)=>{let r=t.createShader(c);return r?(t.shaderSource(r,h),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(t.deleteShader(r),null)):null},dt=(t,c,h)=>{let r=Le(t,t.VERTEX_SHADER,c),m=Le(t,t.FRAGMENT_SHADER,h),d=t.createProgram();return!r||!m||!d?null:(t.attachShader(d,r),t.attachShader(d,m),t.linkProgram(d),t.deleteShader(r),t.deleteShader(m),t.getProgramParameter(d,t.LINK_STATUS)?d:(t.deleteProgram(d),null))},mt=(t,c,h)=>{let r={};for(let m of h)r[m]=t.getUniformLocation(c,m);return r},pt=({surfaceRef:t,beamPosition:c=.6,surfaceLevel:h=1,color:r="#3847ff",intensity:m=1.8,beamWidth:d=1.5,flare:b=1.5,spread:I=1.5,spill:Y=1,fog:ke=.2,dust:Pe=1.6,streaks:De=1.5,dots:We=1,pulse:_e=1.5,speed:Ce=1.5,seed:Be=3,mouseInteraction:qe=!0,revealImage:Ne,revealRadius:He=220,revealOpacity:ze=.6,intro:Fe=!0,theme:Ue="dark",paused:Ke=!1,dpr:Oe,...Xe})=>{let le=(0,w.useRef)(null),ne=(0,w.useRef)(null),q=(0,w.useRef)(null),se={surfaceRef:t,beamPosition:v(c,0,1),surfaceLevel:v(h,0,1),color:String(r),intensity:Math.max(0,m),beamWidth:v(d,.2,5),flare:v(b,.2,4),spread:v(I,.1,4),spill:Math.max(0,Y),fog:Math.max(0,ke),dust:Math.max(0,Pe),streaks:Math.max(0,De),dots:Math.max(0,We),pulse:Math.max(0,_e),speed:Ce,seed:Be,mouseInteraction:qe,revealImage:Ne,revealRadius:Math.max(1,He),revealOpacity:v(ze,0,1),intro:Fe,theme:Ue,paused:Ke,dpr:Oe},k=(0,w.useRef)(se);k.current=se,(0,w.useEffect)(()=>{let E=le.current,R=ne.current,e=R?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!E||!R||!e)return;let P=dt(e,st,it);if(!P)return;let p=mt(e,P,["uResolution","uDpr","uScale","uTime","uBeamX","uSurface","uRadius","uIntro","uPour","uRun","uLens","uReveal","uRevealMap","uRevealInfo","uAtmosphere","uAmount","uShape","uExtra","uTheme","uTint"]),V=e.createVertexArray(),fe=e.createBuffer();e.bindVertexArray(V),e.bindBuffer(e.ARRAY_BUFFER,fe),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let ce=e.getAttribLocation(P,"aPosition");e.enableVertexAttribArray(ce),e.vertexAttribPointer(ce,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);let N=e.createTexture();e.bindTexture(e.TEXTURE_2D,N),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let Z=document.createElement("canvas");Z.width=1,Z.height=1;let A=Z.getContext("2d",{willReadFrequently:!0}),J=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,i={time:0,introTime:k.current.intro&&!J?0:X,width:1,height:1,ratio:1,colorKey:"",tints:Se([.22,.28,1]),observed:null,pointer:{x:0,y:0,inside:!1},lens:{x:0,y:0,vx:0,vy:0,strength:0,placed:!1},reveal:{src:"",ready:!1,width:1,height:1,image:null}},M=0,y=0,H=!0,z=!0,Ye=a=>{if(!A)return[.22,.28,1];A.clearRect(0,0,1,1),A.fillStyle="#3847ff",A.fillStyle=a,A.fillRect(0,0,1,1);let[n,o,l]=A.getImageData(0,0,1,1).data;return[n/255,o/255,l/255]},Ve=a=>{a.color!==i.colorKey&&(i.colorKey=a.color,i.tints=Se(Ye(a.color)))},Ze=a=>{let n=a.revealImage?String(a.revealImage):"",o=i.reveal;if(n===o.src||(o.src=n,o.ready=!1,o.image&&(o.image.onload=null),!n))return;let l=new Image;l.crossOrigin="anonymous",l.decoding="async",l.onload=()=>{if(!z||o.src!==n)return;let f=l.naturalWidth||l.width||1,u=l.naturalHeight||l.height||1,s=Math.min(1,2048/Math.max(f,u)),x=document.createElement("canvas");x.width=Math.max(1,Math.round(f*s)),x.height=Math.max(1,Math.round(u*s)),x.getContext("2d")?.drawImage(l,0,0,x.width,x.height),e.bindTexture(e.TEXTURE_2D,N),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,x),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),o.width=x.width,o.height=x.height,o.ready=!0,q.current?.()},l.src=n,o.image=l},Je=(a,n,o)=>{let l=a.surfaceRef?.current??null;if(l!==i.observed&&(i.observed&&F.unobserve(i.observed),l&&F.observe(l),i.observed=l),l){let f=E.getBoundingClientRect(),u=l.getBoundingClientRect();if(u.width>0){let s=getComputedStyle(l),x=Math.max(parseFloat(s.borderTopLeftRadius)||0,parseFloat(s.borderTopRightRadius)||0);return{left:u.left-f.left,top:u.top-f.top,right:u.right-f.left,bottom:u.bottom-f.top,radius:Math.min(x,u.width/2,u.height/2),real:!0}}}return{left:-n*2,top:a.surfaceLevel*o,right:n*3,bottom:o*3,radius:0,real:!1}},ue=()=>{let a=Math.max(1,E.clientWidth),n=Math.max(1,E.clientHeight),o=k.current,l=Math.min(o.dpr||window.devicePixelRatio||1,2),f=Math.max(a,n)*l,u=f>ye?l*ye/f:l,s=Math.max(1,Math.round(a*u)),x=Math.max(1,Math.round(n*u));(R.width!==s||R.height!==x)&&(R.width=s,R.height=x),i.width=a,i.height=n,i.ratio=R.width/a,$()},$=()=>{let a=k.current;Ve(a);let{width:n,height:o}=i,l=Math.max(.2,Math.min(n/585,o/507)),f=Je(a,n,o),u=a.beamPosition*n;if(f.real){let W=f.radius+6;u>=f.left&&u<=f.right?u=v(u,f.left+W,f.right-W):f={left:-n*2,top:o,right:n*3,bottom:o*3,radius:0,real:!1}}let s=-.15*o,x=f.top-s+.3*o,L=i.introTime,T=L>=X,U=T?f.top+.3*o:s+x*Math.pow(v(L/ae,0,1),1.3),Q=ae*Math.pow(Math.max(0,f.top-s)/x,1/1.3),g=L-Q,$e=T?1:g<=0?0:ct(g),Qe=T||g<=0?0:Math.exp(-g/.35)*(1-Math.exp(-g/.05)),K=a.spread*250*1.3+80,ge=T?1e5:g<=0?-40:K*(1-Math.exp(-1.15*g)),je=T||g<=0?0:Math.exp(-1.15*g)*(1-Math.exp(-g/.08)),ve=W=>{if(T)return[1e3,1];if(g<=0)return[-W,0];let te=Math.min(W,K*.97),lt=-Math.log(1-te/K)/1.15,_=g-lt,C=v((_+.15)/.8,0,1),Te=C*C*C*(C*(C*6-15)+10);return _<=0?[ge-te,Te]:[1.15*(K-te)*_+260*_*_,Te]},[et,tt]=ve((u-f.left)/l),[at,ot]=ve((f.right-u)/l),rt=T?1:g<=0?.3*ft(L/ae):.3+.7*(1-Math.exp(-1.3*g)),be=Number(a.seed)||0;e.viewport(0,0,R.width,R.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(P),e.uniform2f(p.uResolution,n,o),e.uniform1f(p.uDpr,i.ratio),e.uniform1f(p.uScale,l),e.uniform1f(p.uTime,i.time),e.uniform1f(p.uBeamX,u),e.uniform4f(p.uSurface,f.left,f.top,f.right,f.bottom),e.uniform1f(p.uRadius,f.radius),e.uniform3f(p.uIntro,U,$e,Qe),e.uniform4f(p.uPour,et,at,tt,ot),e.uniform2f(p.uRun,ge,je),e.uniform4f(p.uLens,i.lens.x,i.lens.y,95*l,i.lens.strength),Ze(a);let{reveal:D}=i,Re=Math.max(n/D.width,o/D.height),j=D.width*Re,ee=D.height*Re;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,N),e.uniform1i(p.uReveal,0),e.uniform4f(p.uRevealMap,1/j,1/ee,(j-n)/2/j,(ee-o)/2/ee),e.uniform2f(p.uRevealInfo,a.revealRadius,D.ready?a.revealOpacity:0),e.uniform1f(p.uAtmosphere,rt),e.uniform4f(p.uAmount,a.intensity,a.fog,a.dust,a.streaks),e.uniform4f(p.uShape,a.beamWidth,a.flare,a.spread,a.spill),e.uniform4f(p.uExtra,a.pulse,a.dots,34.34+be*7.31,11.58+be*3.17),e.uniform1f(p.uTheme,a.theme==="light"?1:0),e.uniform3fv(p.uTint,i.tints),e.bindVertexArray(V),e.drawArrays(e.TRIANGLES,0,3),e.bindVertexArray(null)},he=a=>{if(M=0,!z||!H||document.hidden)return;let n=k.current,o=y?Math.min(.05,(a-y)/1e3):1/60;y=a;let l=!n.paused&&!J;l&&(i.time+=o*n.speed);let f=i.introTime<X;f&&(i.introTime=Math.min(X,i.introTime+o));let{pointer:u,lens:s}=i,x=n.mouseInteraction&&u.inside&&!J;x&&!s.placed&&(s.x=u.x,s.y=u.y,s.vx=0,s.vy=0,s.placed=!0);let L=120*(u.x-s.x)-19*s.vx,T=120*(u.y-s.y)-19*s.vy;s.vx+=L*o,s.vy+=T*o,s.x+=s.vx*o,s.y+=s.vy*o;let U=x?1:0;s.strength+=(U-s.strength)*(1-Math.exp(-o/(U>s.strength?.3:.55))),s.strength<.001&&!x&&(s.placed=!1),$();let Q=Math.abs(i.lens.strength-(n.mouseInteraction&&i.pointer.inside?1:0))>.002||Math.hypot(i.lens.vx,i.lens.vy)>.5;l||f||Q?M=requestAnimationFrame(he):y=0},S=()=>{!M&&z&&H&&!document.hidden&&(M=requestAnimationFrame(he))},de=a=>{let n=E.getBoundingClientRect(),o=a.clientX-n.left,l=a.clientY-n.top;i.pointer.x=o,i.pointer.y=l,i.pointer.inside=o>=0&&l>=0&&o<=n.width&&l<=n.height,S()},me=()=>{i.pointer.inside=!1,S()},pe=()=>{y=0,S()},F=new ResizeObserver(ue);F.observe(E);let xe=new IntersectionObserver(a=>{H=a.some(n=>n.isIntersecting),H&&(y=0,S())});return xe.observe(E),window.addEventListener("pointermove",de,{passive:!0}),document.documentElement.addEventListener("pointerleave",me),document.addEventListener("visibilitychange",pe),ue(),S(),q.current=()=>{M||$(),S()},()=>{z=!1,cancelAnimationFrame(M),q.current=null,F.disconnect(),xe.disconnect(),window.removeEventListener("pointermove",de),document.documentElement.removeEventListener("pointerleave",me),document.removeEventListener("visibilitychange",pe),e.deleteTexture(N),e.deleteBuffer(fe),e.deleteVertexArray(V),e.deleteProgram(P)}},[]),(0,w.useEffect)(()=>{q.current?.()});let{className:ie="",...Ge}=Xe;return(0,oe.jsx)("div",{ref:le,className:`pointer-events-none relative h-full w-full${ie?` ${ie}`:""}`,...Ge,children:(0,oe.jsx)("canvas",{ref:ne,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ie=pt;var re=B(O(),1),xt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],At=xt.map((t,c)=>({id:c+1,image:t,src:t,img:t,url:t,title:G[c],text:G[c],label:G[c],alt:G[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function gt({big:t}){return(0,re.jsx)(Ee,{big:t,dark:!0,center:!0,zoom:1,drive:!1,children:(0,re.jsx)(Ie,{})})}var Mt=we(gt);export{Mt as default};
