import{c as y,i as Se,j as R,l as N,m as U}from"./chunks/chunk-6IYH4WPJ.js";var w=y(Se(),1),X=y(R(),1),k=8,A=7,ke=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Ae=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform vec3 uMotion;
uniform float uLevel;
uniform vec3 uColors[8];
uniform int uCount;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uSaturation;
uniform float uScale;
uniform float uGlass;
uniform float uRadius;
uniform float uRefraction;
uniform float uDispersion;
uniform float uRim;
uniform vec2 uLean;
uniform float uIntro;
uniform float uPulse;
uniform float uLight;
uniform float uOpacity;

out vec4 fragColor;

const int NB = 10;
const float PI = 3.14159265;

vec3 hueRotate(vec3 c, float a) {
  const mat3 toYiq = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRgb = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYiq * c;
  float ca = cos(a);
  float sa = sin(a);
  yiq.yz = mat2(ca, sa, -sa, ca) * yiq.yz;
  return max(toRgb * yiq, 0.0);
}

vec3 grade(vec3 c) {
  float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = clamp(mix(vec3(g), c, 1.5 * uSaturation), 0.0, 1.0);
  return hueRotate(c, uHueShift * 6.2831853);
}

vec3 lightInk(vec3 L, float halo, vec3 body) {
  vec3 Lg = grade(L);
  float lum = dot(Lg, vec3(0.2126, 0.7152, 0.0722));
  float cov = 1.0 - exp(-lum * 2.6);
  vec3 hue = Lg / max(max(Lg.r, max(Lg.g, Lg.b)), 1e-4);
  float white = pow(clamp(min(hue.r, min(hue.g, hue.b)), 0.0, 1.0), 1.4);
  vec3 ink = pow(hue, vec3(2.2)) * 0.88;
  float coreAmt = white * smoothstep(0.05, 2.2, lum) * 0.92;
  vec3 cream = mix(mix(uColors[3], vec3(1.0), 0.3), vec3(1.0, 0.985, 0.95), smoothstep(1.2, 3.5, lum));
  vec3 c = mix(body, vec3(0.66, 0.69, 0.76), halo * 0.32);
  c = mix(c, ink, cov * (1.0 - white));
  return mix(c, cream, clamp(coreAmt, 0.0, 1.0));
}

float sstep(float a, float b, float x) {
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

float erfa(float x) {
  float a = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * a);
  float y = 1.0 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return x < 0.0 ? -y : y;
}

vec3 grad4(vec3 c0, vec3 c1, vec3 c2, vec3 c3, float p1, float p2, float f) {
  vec3 c = mix(c0, c1, sstep(0.0, p1, f));
  c = mix(c, c2, sstep(p1, p2, f));
  return mix(c, c3, sstep(p2, 1.0, f));
}

float smaxk(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(a, b, h) + k * h * (1.0 - h);
}

vec2 sheetW(float tt, float H, float sig, float sigB, float ridges) {
  float ew = 0.04 * uThickness;
  float res0;
  float res1;
  for (int pass = 0; pass < 2; pass++) {
    float sg = pass == 0 ? sig : sigB;
    float fill = 0.5 * (erfa(tt / sg) - erfa((tt - H) / sg)) / H;
    float se = sqrt(sg * sg + 0.25 * ew * ew * H * H);
    float de = (tt - H + 0.5 * ew * H) / se;
    float eg = exp(-de * de) / (se * 1.7724539);
    float rgw = sqrt(sg * sg + 0.0025 * H * H);
    float d1 = (tt - 0.45 * H) / rgw;
    float d2 = (tt - 0.241 * H) / rgw;
    float rid = 0.04 * (exp(-d1 * d1) * step(1.5, ridges) + 0.7 * exp(-d2 * d2) * step(2.5, ridges)) / (rgw * 1.7724539);
    float v = 0.6 * fill * (1.0 - 0.55 * uLight) + (1.6 * ew * 0.886 * eg + rid) * (1.0 + 1.3 * uLight);
    if (pass == 0) res0 = v;
    else res1 = v;
  }
  return vec2(res0, res1);
}

float axis(float x) {
  float a = uAmplitude;
  return -0.2318 + uLean.y * 0.06 + (-0.2394 + uLean.x * 0.1) * x + 0.2815 * a * x * x + 0.3368 * a * x * x * x;
}

float softp(float z) {
  return 0.03 * log(1.0 + exp(clamp(z / 0.03, -60.0, 60.0)));
}

vec3 light(vec2 u, float fp, float bend, float level, out float halo) {
  float amp = level < 0.65 ? mix(0.25, 1.0, sstep(0.0, 0.65, level)) : mix(1.0, 1.12, (level - 0.65) / 0.35);
  float grow = clamp((amp - 0.25) / 0.75, 0.0, 1.25);
  float x = u.x / uScale;
  float uy = u.y;
  float ya = axis(x);
  float taper = max(uTaper, 0.05);
  float bx = 0.0437 + uMotion.z + uLean.x * 0.08;
  float bump = exp(-pow((x - bx) / (0.6879 * taper), 2.0));
  float hW = 0.02 + softp(-0.12 + 0.5324 * uAmplitude * grow * uMotion.y * bump - 0.02);
  float k = 1.0 * uWaviness;
  float cphi = cos(0.5 * PI + k * (x + 0.0664) + uMotion.x);
  float envC = (0.0886 + 0.3 * exp(-pow((x - 0.0634) / 0.6873, 2.0))) * uSpread * grow;
  float hC = -envC * tanh(cphi / 0.6);
  float th = 0.051 * uThickness * exp(-pow(cphi / 0.5, 2.0));
  float sig = sqrt(pow(0.005 + 0.05 * bend, 2.0) + fp * fp + th * th);
  float sigB = sqrt(0.0064 * max(uGlow, 0.05) * max(uGlow, 0.05) + fp * fp + th * th);
  float mend = exp(-pow(abs((x + 0.0421) / (0.4235 * taper)), 2.2689));
  vec3 red = uColors[0];
  vec3 orange = uColors[1];
  vec3 amber = uColors[2];
  vec3 warmWhite = uColors[3];
  vec3 cyan = uColors[4];
  vec3 blue = uColors[5];
  vec3 deep = uColors[6];
  vec3 orangeEdge = orange * vec3(1.0, 0.85, 0.77);
  vec3 coolCore = mix(warmWhite, vec3(1.0, 1.0, 0.7), 0.6);
  vec3 mint = clamp(mix(cyan, warmWhite, 0.35) * vec3(0.92, 1.05, 0.95), 0.0, 1.0);
  float ridges = float(uCount);
  float glow = max(uGlow, 0.0);
  vec3 L = vec3(0.0);
  vec3 Lb = vec3(0.0);
  {
    float H = max(abs(hW), 1e-4);
    float tt = uy - ya;
    vec2 w = sheetW(tt, H, sig, sigB, ridges);
    float f = clamp(tt / H, 0.0, 1.0);
    vec3 c = grad4(warmWhite, amber, orange, orangeEdge, 0.2351, 0.5643, f);
    c = mix(c, red, sstep(0.75, 1.0, f) * sstep(0.196, 0.3376, hW));
    vec3 mean = (grad4(warmWhite, amber, orange, orangeEdge, 0.2351, 0.5643, 0.1) + grad4(warmWhite, amber, orange, orangeEdge, 0.2351, 0.5643, 0.35) + grad4(warmWhite, amber, orange, orangeEdge, 0.2351, 0.5643, 0.6) + grad4(warmWhite, amber, orange, orangeEdge, 0.2351, 0.5643, 0.9)) * 0.25;
    L += mix(c, mean, sstep(0.3, 1.2, sig / H)) * (w.x * 0.2101 * mend);
    Lb += mix(c, mean, sstep(0.3, 1.2, sigB / H)) * (w.y * 0.2101 * mend);
  }
  {
    float H = max(abs(hC), 1e-4);
    float tt = (uy - ya) * (hC >= 0.0 ? 1.0 : -1.0);
    vec2 w = sheetW(tt, H, sig, sigB, 1.0);
    float f = clamp(tt / H, 0.0, 1.0);
    vec3 c = grad4(coolCore, cyan, blue, deep, 0.15, 0.7931, f);
    vec3 mean = (grad4(coolCore, cyan, blue, deep, 0.15, 0.7931, 0.1) + grad4(coolCore, cyan, blue, deep, 0.15, 0.7931, 0.35) + grad4(coolCore, cyan, blue, deep, 0.15, 0.7931, 0.6) + grad4(coolCore, cyan, blue, deep, 0.15, 0.7931, 0.9)) * 0.25;
    L += mix(c, mean, sstep(0.3, 1.2, sig / H)) * (w.x * 0.28 * mend);
    Lb += mix(c, mean, sstep(0.3, 1.2, sigB / H)) * (w.y * 0.28 * mend);
  }
  vec3 G = vec3(0.0);
  float wh = sqrt(0.0256 + envC * envC * cphi * cphi);
  float dg = (uy - ya) / wh;
  G += vec3(1.0, 0.97, 0.92) * (exp(-dg * dg) * 0.0315 / wh * mend * glow);
  float nx = -0.0664 - uMotion.x / k + 0.2168;
  float bxx = (x - nx) / 0.1849;
  float byy = (uy - axis(nx) - 0.0333) / (0.0544 * mix(0.7, 1.0, min(amp, 1.0)));
  G += mint * (exp(-bxx * bxx - byy * byy) * 1.4 * glow * sstep(0.0, 0.6, amp));
  float hb = (uy - ya - 0.3 * hW) / (0.07 + 0.45 * hW + 0.3 * envC);
  halo = exp(-hb * hb) * mend * smoothstep(0.0, 0.3, uIntro);
  vec3 total = L + 0.16 * glow * Lb + 1.16 * G;
  return total * 2.4 * uIntensity * smoothstep(0.0, 0.3, uIntro) * sstep(uIntro * 1.6, uIntro * 1.6 - 0.5, abs(x));
}

vec2 remap(vec2 p, float f, out float r, out float bend) {
  r = min(length(p), 0.9995);
  bend = pow(r, 5.17);
  float k = clamp(uRefraction, 0.0, 1.8);
  float sc = (1.0 - 0.278 * k * (1.0 - bend)) * (1.0 - 0.632 * k * bend) / (1.0 - 0.278 * k);
  return p * sc * f;
}

void main() {
  vec2 res = uResolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  float level = clamp(uLevel, 0.0, 1.0);
  float appear = smoothstep(0.0, 0.35, uIntro);

  if (uGlass > 0.5) {
    float R = uRadius * mix(0.94, 1.0, uIntro) * (1.0 + 0.03 * uPulse);
    float px = 1.0 / (min(res.x, res.y) * R);
    vec2 pc = p / R;
    float rho = length(pc);
    if (rho > 1.0 + 2.0 * px) {
      float sh = uLight * 0.07 * exp(-pow((rho - 0.985) / 0.07, 2.0)) * smoothstep(-0.6, 0.4, -pc.y) * appear * uOpacity;
      fragColor = vec4(0.0, 0.0, 0.0, sh);
      return;
    }
    float r;
    float bend;
    vec2 u = remap(pc, 1.0, r, bend);
    float fp = 0.5 * max(length(dFdx(u)), length(dFdy(u)));
    float halo;
    float skip;
    vec3 L = light(u, fp, bend, level, halo);
    float ca = 0.02 * uDispersion * bend;
    if (ca > 0.0015) {
      float r2;
      float b2;
      L.r = light(remap(pc, 1.0 - ca, r2, b2), fp, bend, level, skip).r;
      L.b = light(remap(pc, 1.0 + ca, r2, b2), fp, bend, level, skip).b;
    }
    vec3 col = 1.0 - exp(-L);
    vec2 d = pc / max(rho, 1e-6);
    float key = 0.4 * pow(max(0.0, d.x * 0.94 - d.y * 0.34), 6.0) + 0.2 * pow(max(0.0, -d.x * 0.5 + d.y * 0.87), 6.0);
    float ring = exp(-pow((r - 0.985) / 0.011, 2.0));
    float hzk = 0.25 + 0.7 * pow(max(0.0, -d.x * 0.6 + d.y * 0.8), 2.0) + pow(max(0.0, d.x * 0.8 - d.y * 0.6), 2.0);
    float haze = exp(-pow((1.0 - r) / 0.09, 2.0)) * hzk * 0.13 * uRim;
    vec3 orb;
    if (uLight > 0.5) {
      float lz = dot(d * r, vec2(-0.55, 0.83));
      vec3 body = mix(vec3(0.885, 0.893, 0.915), vec3(0.972, 0.975, 0.983), 0.5 + 0.5 * lz);
      float fres = smoothstep(0.8, 1.0, r);
      body = mix(body, vec3(0.82, 0.83, 0.86), fres * fres * 0.5);
      orb = lightInk(L, halo, body);
      float spec = exp(-pow((r - 0.955) / 0.03, 2.0)) * pow(max(0.0, dot(d, vec2(-0.55, 0.83))), 3.0);
      orb = mix(orb, vec3(1.0), clamp(spec * 0.85 * uRim + haze * 0.6, 0.0, 1.0));
      float edge = exp(-pow((1.0 - r) / (0.01 + 1.2 * px), 2.0));
      orb *= 1.0 - 0.12 * edge;
    } else {
      orb = vec3(0.04) + col * (1.0 + 0.1 * bend * uRim) + ring * key * uRim * (1.0 + 0.4 * level) + haze * vec3(1.0, 1.02, 1.04);
      orb = grade(clamp(orb, 0.0, 1.0));
    }
    float inside = clamp((1.0 - rho) / px + 0.5, 0.0, 1.0) * appear;
    vec3 rgb = orb * inside;
    fragColor = vec4(rgb, max(inside * mix(0.92, 1.0, uLight), max(max(rgb.r, rgb.g), rgb.b))) * uOpacity;
  } else {
    float span = 0.5 * res.x / min(res.x, res.y);
    vec2 u = p * (0.78 / span) + vec2(0.0, -0.15);
    float fp = 0.5 * max(length(dFdx(u)), length(dFdy(u)));
    float halo;
    float fade = sstep(0.82, 0.55, abs(u.x));
    vec3 L = light(u, fp, 0.0, level, halo) * fade;
    vec3 col = grade(1.0 - exp(-L)) * appear;
    if (uLight > 0.5) {
      vec3 c = lightInk(L, halo * fade * 0.6, vec3(1.0));
      float a = clamp(1.0 - min(c.r, min(c.g, c.b)), 0.0, 1.0) * appear;
      fragColor = vec4((c - (1.0 - a)) * appear, a) * uOpacity;
    } else {
      fragColor = vec4(col, max(max(col.r, col.g), col.b)) * uOpacity;
    }
  }
}
`,Te=o=>{let i=String(o).replace("#","").trim();i.length===3&&(i=i.replace(/(.)/g,"$1$1"));let s=parseInt(i.slice(0,6),16);return isFinite(s)?[(s>>16&255)/255,(s>>8&255)/255,(s&255)/255]:[1,1,1]},m=(o,i,s)=>Math.min(s,Math.max(i,o)),Y=(o,i,s)=>{let u=o.createShader(i);return o.shaderSource(u,s),o.compileShader(u),u},Ee=o=>{let i=o.createProgram();return o.attachShader(i,Y(o,o.VERTEX_SHADER,ke)),o.attachShader(i,Y(o,o.FRAGMENT_SHADER,Ae)),o.bindAttribLocation(i,0,"position"),o.linkProgram(i),o.getProgramParameter(i,o.LINK_STATUS)?i:null},Ie=(o,i,s)=>{let u=Math.min(1,Math.max(0,(s-o)/(i-o)));return u*u*(3-2*u)},He=o=>{let i=Ie(-.8,-.3,.6*Math.sin(o*2.7)+.5*Math.sin(o*1.53+1.2)),s=Math.max(0,Math.sin(o*17+1.6*Math.sin(o*5.3))),u=.6+.4*Math.sin(o*3.7+.7);return i*(.35+.65*s)*(.25+u)},K=["#d95b56","#ba5046","#ffa24c","#ffe0b3","#93f1ff","#3569fa","#193d9b"];function T({colors:o=K,count:i=3,speed:s=1,amplitude:u=1,waviness:$=1,thickness:j=1,glow:J=1,taper:Q=1,spread:Z=1,hueShift:ee=0,intensity:te=1,saturation:ae=1,opacity:oe=1,scale:re=1,glass:ne=!0,refraction:ie=1,dispersion:le=1,glassSize:se=1,rim:ce=1,energy:fe=.65,listening:ue=!1,level:pe,interactive:me=!0,clickPulse:he=!0,intro:de=!0,lightMode:ve=!1,maxDevicePixelRatio:ge=2,className:be="",style:xe}){let I=(0,w.useRef)(null),d=(0,w.useRef)(null);return d.current={colors:o,count:i,speed:s,amplitude:u,waviness:$,thickness:j,glow:J,taper:Q,spread:Z,hueShift:ee,intensity:te,saturation:ae,opacity:oe,scale:re,glass:ne,refraction:ie,dispersion:le,glassSize:se,rim:ce,energy:fe,listening:ue,level:pe,interactive:me,clickPulse:he,intro:de,lightMode:ve,maxDevicePixelRatio:ge},(0,w.useEffect)(()=>{let f=I.current;if(!f)return;let c=document.createElement("canvas");c.style.display="block",c.style.width="100%",c.style.height="100%",c.setAttribute("aria-hidden","true");let t=c.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!t)return;f.appendChild(c);let L=null,M=null,l={},ye=["uResolution","uMotion","uLevel","uColors","uCount","uAmplitude","uWaviness","uThickness","uGlow","uTaper","uSpread","uHueShift","uIntensity","uSaturation","uScale","uGlass","uRadius","uRefraction","uDispersion","uRim","uLean","uIntro","uPulse","uLight","uOpacity"],H=()=>{let a=Ee(t);return a?(L=a,M=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,M),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0),t.useProgram(a),l=Object.fromEntries(ye.map(r=>[r,t.getUniformLocation(a,r)])),t.disable(t.BLEND),t.clearColor(0,0,0,0),!0):!1};if(!H()){c.remove();return}let we=typeof window.matchMedia=="function"?window.matchMedia("(prefers-reduced-motion: reduce)"):null,e={clock:0,pace:0,activity:0,hover:0,hoverTarget:0,burst:0,lean:[0,0],leanTarget:[0,0],pulse:0,pulseV:0,introStart:-1,intro:d.current.intro?0:1,visible:typeof IntersectionObserver>"u",lost:!1,raf:0,last:0,width:0,height:0,speechT:0,paletteKey:"",palette:{flat:new Float32Array(k*3),count:1}},F=()=>{let a=Math.min(window.devicePixelRatio||1,Math.max(.5,d.current.maxDevicePixelRatio)),r=Math.max(1,Math.round(f.clientWidth*a)),n=Math.max(1,Math.round(f.clientHeight*a));(r!==e.width||n!==e.height)&&(e.width=r,e.height=n,c.width=r,c.height=n)},Le=a=>{let r=a.join(",");if(r===e.paletteKey)return;e.paletteKey=r;let n=(a.length?a:K).slice(0,k).map(Te),h=new Float32Array(k*3);for(let g=0;g<A;g++){let b=n.length>1?g/(A-1)*(n.length-1):0,x=Math.floor(b),p=Math.min(x+1,n.length-1),Re=b-x;h.set(n[x].map((V,Ce)=>V+(n[p][Ce]-V)*Re),g*3)}e.palette={flat:h,count:A}},W=()=>{if(e.lost||!L)return;let a=d.current;Le(Array.isArray(a.colors)?a.colors:[]),t.viewport(0,0,e.width,e.height),t.uniform2f(l.uResolution,e.width,e.height);let r=e.clock,n=.75+.45*e.pace;t.uniform3f(l.uMotion,(.26*Math.sin(.53*r)+.1*Math.sin(1.19*r+1.3))*n,1+(.06*Math.sin(.71*r)+.035*Math.sin(1.37*r+.4))*n,.06*Math.sin(.41*r+2)*n),t.uniform1f(l.uLevel,m(e.activity,0,1)),t.uniform3fv(l.uColors,e.palette.flat),t.uniform1i(l.uCount,m(Math.round(a.count),1,3)),t.uniform1f(l.uAmplitude,a.amplitude),t.uniform1f(l.uWaviness,a.waviness),t.uniform1f(l.uThickness,a.thickness),t.uniform1f(l.uGlow,a.glow),t.uniform1f(l.uTaper,Math.max(.05,a.taper)),t.uniform1f(l.uSpread,a.spread),t.uniform1f(l.uHueShift,a.hueShift),t.uniform1f(l.uIntensity,a.intensity),t.uniform1f(l.uSaturation,a.saturation),t.uniform1f(l.uScale,Math.max(.05,a.scale)),t.uniform1f(l.uGlass,a.glass?1:0),t.uniform1f(l.uRadius,.42*a.glassSize),t.uniform1f(l.uRefraction,a.refraction),t.uniform1f(l.uDispersion,a.dispersion),t.uniform1f(l.uRim,a.rim),t.uniform2f(l.uLean,e.lean[0],e.lean[1]),t.uniform1f(l.uIntro,e.intro),t.uniform1f(l.uPulse,e.pulse),t.uniform1f(l.uLight,a.lightMode?1:0),t.uniform1f(l.uOpacity,a.opacity),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLES,0,3)},B=a=>{e.raf=0;let r=d.current,n=e.last?m((a-e.last)/1e3,0,.05):0;e.last=a;let h=!!we?.matches;if(e.introStart<0&&e.visible&&(e.introStart=a),r.intro&&!h&&e.introStart>=0){let p=m((a-e.introStart)/1400,0,1);e.intro=1-Math.pow(1-p,3)}else e.intro=1;e.hover+=(e.hoverTarget-e.hover)*(1-Math.exp(-n/(e.hoverTarget>e.hover?.25:.6)));for(let p=0;p<2;p++)e.lean[p]+=(e.leanTarget[p]-e.lean[p])*(1-Math.exp(-n/.35));e.pulseV+=(-170*e.pulse-14*e.pulseV)*n,e.pulse+=e.pulseV*n,e.burst*=Math.exp(-n/.45),r.listening&&!h&&(e.speechT+=n);let g=typeof r.level=="number"?m(r.level,0,1):r.listening&&!h?He(e.speechT):0,b=Math.min(1.2,Math.max(m(r.energy,0,1),g)+e.hover*.18+e.burst);e.activity+=(b-e.activity)*(1-Math.exp(-n/(b>e.activity?.12:.4))),e.pace+=(Math.min(1,e.activity)-e.pace)*(1-Math.exp(-n/.8)),h||(e.clock+=n*r.speed*(.6+1.6*e.pace)),W();let x=h&&Math.abs(e.activity-b)<.001&&Math.abs(e.pulse)<.001&&Math.abs(e.pulseV)<.001&&e.burst<.001&&Math.abs(e.hover-e.hoverTarget)<.001&&Math.abs(e.lean[0]-e.leanTarget[0])<.001&&Math.abs(e.lean[1]-e.leanTarget[1])<.001;e.visible&&!document.hidden&&!e.lost&&!x&&(e.raf=requestAnimationFrame(B))},v=()=>{!e.raf&&e.visible&&!e.lost&&(e.last=0,e.raf=requestAnimationFrame(B))},Me=a=>{let r=f.getBoundingClientRect(),n=Math.min(r.width,r.height)||1;return[(a.clientX-r.left-r.width/2)/(n/2),(a.clientY-r.top-r.height/2)/(n/2)]},O=a=>{if(!d.current.interactive)return;let[r,n]=Me(a);e.hoverTarget=m(1.6-Math.hypot(r,n),0,1),e.leanTarget=[m(r,-1.2,1.2)*.8,m(-n,-1.2,1.2)*.8],v()},P=()=>{e.hoverTarget=0,e.leanTarget=[0,0],v()},G=()=>{d.current.clickPulse&&(e.pulseV+=5,e.burst=Math.min(1.2,e.burst+.9),v())},z=a=>{a.preventDefault(),e.lost=!0,e.raf&&cancelAnimationFrame(e.raf),e.raf=0},D=()=>{e.lost=!1,H()&&v()};c.addEventListener("webglcontextlost",z),c.addEventListener("webglcontextrestored",D),f.addEventListener("pointermove",O),f.addEventListener("pointerleave",P),f.addEventListener("pointerdown",G);let q=new ResizeObserver(()=>{F(),W()});q.observe(f),F();let S=null;typeof IntersectionObserver<"u"&&(S=new IntersectionObserver(a=>{e.visible=a[a.length-1].isIntersecting,e.visible&&v()}),S.observe(f));let _=()=>{document.hidden||v()};return document.addEventListener("visibilitychange",_),v(),()=>{e.raf&&cancelAnimationFrame(e.raf),c.removeEventListener("webglcontextlost",z),c.removeEventListener("webglcontextrestored",D),f.removeEventListener("pointermove",O),f.removeEventListener("pointerleave",P),f.removeEventListener("pointerdown",G),document.removeEventListener("visibilitychange",_),q.disconnect(),S?.disconnect(),L&&t.deleteProgram(L),M&&t.deleteBuffer(M),t.getExtension("WEBGL_lose_context")?.loseContext(),c.remove()}},[]),(0,X.jsx)("div",{ref:I,className:`relative h-full w-full bg-transparent [-webkit-tap-highlight-color:transparent] ${be}`.trim(),style:xe})}var E=y(R(),1),Fe=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],C=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],De=Fe.map((o,i)=>({id:i+1,image:o,src:o,img:o,url:o,title:C[i],text:C[i],label:C[i],alt:C[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function We({big:o}){return(0,E.jsx)(U,{big:o,dark:!0,center:!0,zoom:1,drive:!1,children:(0,E.jsx)(T,{})})}var qe=N(We);export{qe as default};
