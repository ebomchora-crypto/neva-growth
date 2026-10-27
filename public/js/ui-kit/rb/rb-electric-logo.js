import{b as qe,c as De,d as We,e as Fe,h as Ne}from"./chunks/chunk-M7BFARI7.js";import{c as ce,i as lt,j as pe,l as Ue,m as Be}from"./chunks/chunk-6IYH4WPJ.js";var K=ce(lt(),1);var Qe=ce(pe(),1),Oe=`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M39 3 12 37h17l-4 24 27-34H35z" fill="#fff"/></svg>')}`,rt=560,q=4,se=1e20,J=5,ue=3,it=4e6,$e=a=>{let o=String(a||"").replace("#","");o.length===3&&(o=o.replace(/./g,l=>l+l));let e=parseInt(o.slice(0,6),16);return Number.isNaN(e)?[1,1,1]:[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]},_e=(a,o,e,l,f)=>{let t=0;e[0]=0,l[0]=-se,l[1]=se;for(let n=1;n<f;n++){let w=(a[n]+n*n-(a[e[t]]+e[t]*e[t]))/(2*n-2*e[t]);for(;w<=l[t];)t--,w=(a[n]+n*n-(a[e[t]]+e[t]*e[t]))/(2*n-2*e[t]);t++,e[t]=n,l[t]=w,l[t+1]=se}t=0;for(let n=0;n<f;n++){for(;l[t+1]<n;)t++;o[n]=(n-e[t])*(n-e[t])+a[e[t]]}},Ye=(a,o,e)=>{let l=Math.max(o,e),f=new Float64Array(l),t=new Float64Array(l),n=new Int32Array(l),w=new Float64Array(l+1);for(let s=0;s<o;s++){for(let u=0;u<e;u++)f[u]=a[u*o+s];_e(f,t,n,w,e);for(let u=0;u<e;u++)a[u*o+s]=t[u]}for(let s=0;s<e;s++){for(let u=0;u<o;u++)f[u]=a[s*o+u];_e(f,t,n,w,o);for(let u=0;u<o;u++)a[s*o+u]=t[u]}},Xe=(a,o,e,l,f,t)=>{let n=1/(2*t+1),w=0;for(let s=0;s<=t&&s<f;s++)w+=a[e+s*l];for(let s=0;s<f;s++)o[e+s*l]=w*n,s+t+1<f&&(w+=a[e+(s+t+1)*l]),s-t>=0&&(w-=a[e+(s-t)*l])},Ve=(a,o,e,l)=>{let f=new Float32Array(o*e);for(let t=0;t<3;t++){for(let n=0;n<e;n++)Xe(a,f,n*o,1,o,l);for(let n=0;n<o;n++)Xe(f,a,n,o,e,l)}},ct=(a,o,e)=>{let l=new Float32Array(o*e),f=0;for(let i=0;i<o*e;i++)a[i*4+3]<250&&f++;if(f>o*e*.01){for(let i=0;i<o*e;i++)l[i]=a[i*4+3]/255;return l}let t=0,n=0,w=0,s=0,u=i=>{t+=a[i*4],n+=a[i*4+1],w+=a[i*4+2],s++};for(let i=0;i<o;i++)u(i),u((e-1)*o+i);for(let i=0;i<e;i++)u(i*o),u(i*o+o-1);t/=s,n/=s,w/=s;for(let i=0;i<o*e;i++){let R=Math.max(Math.abs(a[i*4]-t),Math.abs(a[i*4+1]-n),Math.abs(a[i*4+2]-w));l[i]=Math.min(1,Math.max(0,(R-24)/48))}return l},Je=(a,o,e)=>{let{field:l,width:f,height:t}=a,n=Math.min(Math.max(o,.5),f-.5),w=Math.min(Math.max(e,.5),t-.5),s=Math.min(Math.floor(n-.5),f-2),u=Math.min(Math.floor(w-.5),t-2),i=n-.5-s,R=w-.5-u,S=u*f+s,F=l[S]+(l[S+1]-l[S])*i,H=l[S+f]+(l[S+f+1]-l[S+f])*i;return F+(H-F)*R+Math.hypot(o-n,e-w)},st=a=>{let o=a.naturalWidth||a.width,e=a.naturalHeight||a.height;if(!o||!e)return null;let l=rt/Math.max(o,e),f=Math.max(2,Math.round(o*l)),t=Math.max(2,Math.round(e*l)),n=document.createElement("canvas");n.width=f,n.height=t;let w=n.getContext("2d",{willReadFrequently:!0});if(!w)return null;w.drawImage(a,0,0,f,t);let s=ct(w.getImageData(0,0,f,t).data,f,t),u=f,i=t,R=-1,S=-1;for(let r=0;r<t;r++)for(let v=0;v<f;v++)s[r*f+v]<=.01||(v<u&&(u=v),v>R&&(R=v),r<i&&(i=r),r>S&&(S=r));if(R<0)return null;let F=R-u+1,H=S-i+1,z=Math.ceil(Math.max(F,H)*.25)+2,y=F+z*2,j=H+z*2,P=new Float32Array(y*j),O=new Float32Array(y*j);for(let r=0;r<j;r++)for(let v=0;v<y;v++){let c=v-z+u,M=r-z+i,U=c>=0&&M>=0&&c<f&&M<t?s[M*f+c]:0,k=r*y+v;if(U>=1)P[k]=0,O[k]=se;else if(U<=0)P[k]=se,O[k]=0;else{let L=.5-U;P[k]=L>0?L*L:0,O[k]=L<0?L*L:0}}Ye(P,y,j),Ye(O,y,j);let T=new Float32Array(y*j);for(let r=0;r<y*j;r++)T[r]=Math.sqrt(P[r])-Math.sqrt(O[r]);let W=[];for(let r=1;r<j-1;r++)for(let v=1;v<y-1;v++){let c=r*y+v,M=T[c];if(M>0||T[c-1]<=0&&T[c+1]<=0&&T[c-y]<=0&&T[c+y]<=0)continue;let U=T[c+1]-T[c-1],k=T[c+y]-T[c-y],L=Math.hypot(U,k)||1;W.push(v+.5-M*U/L,r+.5-M*k/L)}let Y=Math.max(1,Math.ceil(W.length/2/3e3))*2,oe=[];for(let r=0;r<W.length;r+=Y)oe.push(W[r],W[r+1]);let b=Math.max(F,H),C=Math.ceil(b*.7/q),p=Math.ceil(F/q)+C*2,E=Math.ceil(H/q)+C*2,Q=new Float32Array(p*E);for(let r=0;r<j;r++){let v=Math.floor((r-z)/q)+C;for(let c=0;c<y;c++){let M=Math.floor((c-z)/q)+C;Q[v*p+M]+=Math.exp(-Math.abs(T[r*y+c])/1.5)/(q*q)}}let I=Q.slice(),$=Math.max(1,Math.round(b*.035/q)),_=Math.max(2,Math.round(b*.13/q));Ve(Q,p,E,$),Ve(I,p,E,_);let X=Math.sqrt(2*Math.PI*($*$+$))*q/3,m=Math.sqrt(2*Math.PI*(_*_+_))*q/3,ae=new Float32Array(p*E*2);for(let r=0;r<p*E;r++)ae[r*2]=Q[r]*X,ae[r*2+1]=I[r]*m;return{field:T,edges:oe,width:y,height:j,pad:z,logoWidth:F,logoHeight:H,glow:ae,glowWidth:p,glowHeight:E,glowOffset:z-C*q}},Ae=(a,o,e)=>{let{edges:l,logoWidth:f,logoHeight:t}=a,n=l.length/2;if(n<2)return null;let w=Math.max(f,t),s=Math.floor(Math.random()*n);if(e){let R=!1;for(let S=0;S<40&&!R;S++){let F=Math.floor(Math.random()*n);Math.hypot(l[F*2]-e.x,l[F*2+1]-e.y)<e.radius&&(s=F,R=!0)}if(!R)return null}let u=l[s*2],i=l[s*2+1];for(let R=0;R<24;R++){let S=Math.floor(Math.random()*n),F=l[S*2],H=l[S*2+1],z=Math.hypot(F-u,H-i);if(z<w*.08||z>w*.3)continue;let y=-(H-i)/z,j=(F-u)/z,P=z*(.2+Math.random()*.3),O=(u+F)/2,T=(i+H)/2,W=Je(a,O+y*P,T+j*P),Y=Je(a,O-y*P,T-j*P);if(!(Math.max(W,Y)<=0))return{ax:u,ay:i,bx:F,by:H,bow:W>=Y?P:-P,seed:1+Math.random()*60,born:o,life:.35+Math.random()*.45}}return null},ut=`#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,ft=`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D tFieldFrom;
uniform sampler2D tGlowFrom;
uniform sampler2D tFieldTo;
uniform sampler2D tGlowTo;
uniform vec4 uMapFrom;
uniform vec4 uSizeFrom;
uniform vec4 uMapTo;
uniform vec4 uSizeTo;
uniform float uMorph;
uniform vec2 uResolution;
uniform float uUnit;
uniform float uTime;
uniform float uPresence;
uniform vec3 uHover;
uniform float uHoverRadius;
uniform vec4 uPulses[${ue}];
uniform float uPulseBoost;
uniform float uFlash;
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uGlow;
uniform float uThickness;
uniform float uStrands;
uniform float uBend;
uniform float uCrackle;
uniform float uFlicker;
uniform float uFill;
uniform float uInk;
uniform vec4 uArcEnds[${J}];
uniform vec4 uArcShape[${J}];

in vec2 vUv;
out vec4 fragColor;

uint scramble(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

float fieldAt(sampler2D tex, vec4 map, vec4 size, vec2 p) {
  vec2 f = (p - map.xy) / map.z;
  vec2 c = clamp(f, vec2(0.5), size.xy - 0.5);
  return (textureLod(tex, c / size.xy, 0.0).r + length(f - c)) * map.z;
}

vec2 glowAt(sampler2D tex, vec4 map, vec4 size, vec2 p) {
  vec2 f = (p - map.xy) / map.z - map.w;
  return textureLod(tex, f / (size.zw * ${q}.0), 0.0).rg;
}

float shape(vec2 p, float k) {
  float to = fieldAt(tFieldTo, uMapTo, uSizeTo, p);
  if (k >= 1.0) return to;
  return mix(fieldAt(tFieldFrom, uMapFrom, uSizeFrom, p), to, k);
}

vec2 aura(vec2 p, float k) {
  vec2 to = glowAt(tGlowTo, uMapTo, uSizeTo, p);
  if (k >= 1.0) return to;
  return mix(glowAt(tGlowFrom, uMapFrom, uSizeFrom, p), to, k);
}

vec4 corner(ivec2 c, uint seed) {
  uint h = scramble(uint(c.x) * 0x8da6b343u + uint(c.y) * 0xd8163841u + seed * 0xcb1ab31fu);
  return vec4(uvec4(h, h >> 8u, h >> 16u, h >> 24u) & 255u) / 127.5 - 1.0;
}

vec2 drift(vec2 p, uint seed, out mat2 jac) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec2 c = ivec2(i);
  vec4 ga = corner(c, seed);
  vec4 gb = corner(c + ivec2(1, 0), seed);
  vec4 gc = corner(c + ivec2(0, 1), seed);
  vec4 gd = corner(c + ivec2(1, 1), seed);
  vec2 fb = f - vec2(1.0, 0.0);
  vec2 fc = f - vec2(0.0, 1.0);
  vec2 fd = f - vec2(1.0);
  vec2 va = vec2(dot(ga.xy, f), dot(ga.zw, f));
  vec2 vb = vec2(dot(gb.xy, fb), dot(gb.zw, fb));
  vec2 vc = vec2(dot(gc.xy, fc), dot(gc.zw, fc));
  vec2 vd = vec2(dot(gd.xy, fd), dot(gd.zw, fd));
  vec2 k = va - vb - vc + vd;
  vec4 g = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd);
  jac = mat2(
    g.xy + du * (u.yx * k.x + vec2(vb.x - va.x, vc.x - va.x)),
    g.zw + du * (u.yx * k.y + vec2(vb.y - va.y, vc.y - va.y))
  );
  return va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
}

float wobble(vec2 p, uint seed) {
  mat2 jac;
  return drift(p, seed, jac).x;
}

vec2 ripple(vec2 p, out float surge) {
  vec2 push = vec2(0.0);
  surge = 0.0;
  float width = uUnit * 10.0;
  for (int i = 0; i < ${ue}; i++) {
    vec4 pulse = uPulses[i];
    if (pulse.w <= 0.0) continue;
    vec2 d = p - pulse.xy;
    float dist = length(d);
    float front = (dist - pulse.z * uUnit * 150.0) / width;
    float env = exp(-front * front) * pulse.w * exp(-pulse.z * 1.7) * smoothstep(0.0, uUnit * 8.0, dist);
    push += d / max(dist, 1.0) * env * cos(front * 2.2) * uUnit * 7.5;
    surge += env;
  }
  return push;
}

vec2 wander(vec2 p, float t, uint seed, float reachScale, out mat2 jac, out vec2 sway) {
  vec2 q = p / uUnit;
  mat2 ja;
  mat2 jb;
  mat2 jc;
  mat2 jd;
  vec2 a = drift(q * 0.028 + vec2(t * 0.29, t * 0.21), seed, ja);
  vec2 b = drift(q * 0.085 + a * 0.4 + vec2(t * 0.83, -t * 0.61) + 17.0, seed + 1u, jb);
  vec2 c = drift(p / 9.0 + b * 0.6 + vec2(t * 1.9, t * 1.3) + 5.0, seed + 2u, jc);
  vec2 d = drift(p / 4.1 + vec2(-t * 2.7, t * 2.2) + 11.0, seed + 3u, jd);
  float bendAmp = uBend * 8.0 * reachScale;
  float rippleAmp = uBend * 3.2 * reachScale;
  float crinkleAmp = uCrackle * 1.5 * reachScale;
  jac = ja * (0.028 * bendAmp) + jb * (0.085 * rippleAmp) + jc * (crinkleAmp / 9.0) + jd * (crinkleAmp * 0.35 / 4.1);
  sway = (a * bendAmp + b * rippleAmp) * uUnit;
  return sway + (c + d * 0.35) * crinkleAmp;
}

vec2 glowShape(float line, float spread, float w) {
  float x = abs(line);
  float y = abs(spread);
  return vec2(exp(-x * x / (w * w * 0.5)) + exp(-y / (w * 2.2)) * 0.6, exp(-y / (w * 4.5)) * 0.5);
}

void addArc(vec2 p, vec4 ends, vec4 info, float t, inout vec3 light, inout float energy, inout float hot) {
  if (info.y < 0.002) return;
  vec2 ab = ends.zw - ends.xy;
  float len = max(length(ab), 1.0);
  vec2 dir = ab / len;
  vec2 rel = p - ends.xy;
  float s = dot(rel, dir);
  float h = dot(rel, vec2(-dir.y, dir.x));
  float margin = abs(info.x) + uCrackle * (2.0 + len * 0.08) + uThickness * 12.0 + 10.0;
  if (s < -margin || s > len + margin || abs(h) > margin) return;
  float u = clamp(s / len, 0.0, 1.0);
  float taper = sin(3.14159265 * u);
  float bendSlope = s > 0.0 && s < len ? 3.14159265 / len * cos(3.14159265 * u) : 0.0;
  float beyond = max(-s, 0.0) + max(s - len, 0.0);
  for (int c = 0; c < 2; c++) {
    uint seed = uint(info.z * 131.0) + uint(c) * 29u + 7u;
    float jag = 0.0;
    float jagSlope = 0.0;
    float wave = max(len * 0.3, 14.0);
    float weight = uCrackle * (1.5 + len * 0.05) * (c == 0 ? 1.0 : 1.5);
    for (int o = 0; o < 3; o++) {
      mat2 jac;
      float n = drift(vec2(s / wave + info.z * 3.0, t * (1.4 + float(o) * 1.1)), seed + uint(o), jac).x;
      jag += n * weight;
      jagSlope += jac[0].x * weight / wave;
      wave *= 0.42;
      weight *= 0.4;
    }
    float offset = (info.x + jag) * taper;
    float offsetSlope = (info.x + jag) * bendSlope + jagSlope * taper;
    float across = (h - offset) / sqrt(1.0 + offsetSlope * offsetSlope);
    float gap = length(vec2(beyond, across));
    float w = uThickness * (c == 0 ? 0.9 : 0.6);
    vec2 g = glowShape(gap, gap, w);
    float k = info.y * (c == 0 ? 1.0 : 0.45);
    light += (uColor * g.x + uGlowColor * g.y * uGlow) * k;
    energy += (g.x + g.y * uGlow) * k;
    hot += exp(-gap * gap / (w * w * 0.16)) * k * (c == 0 ? 1.0 : 0.0);
  }
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uResolution;
  float t = uTime;
  vec3 light = vec3(0.0);
  float energy = 0.0;
  float hot = 0.0;

  float surge;
  vec2 pr = p - ripple(p, surge);
  float k = uMorph >= 1.0 ? 1.0 : smoothstep(0.0, 1.0, clamp(uMorph * 1.7 - 0.35 + 0.35 * wobble(p / uUnit * 0.018, 41u), 0.0, 1.0));
  float transit = uMorph >= 1.0 ? 0.0 : sin(3.14159265 * uMorph);
  float base = shape(pr, k);

  vec2 toHover = p - uHover.xy;
  float heat = min(uHover.z * exp(-dot(toHover, toHover) / (uHoverRadius * uHoverRadius)) + surge * 1.4 + transit * 0.5, 2.0);
  float heatCap = min(uHover.z + uPulseBoost * 1.4 + transit * 0.5, 2.0);
  float breath = 1.0 + uFlicker * 0.6 * wobble(vec2(t * 2.1, 7.0), 3u);
  float grow = uPresence;

  float edge = abs(base);
  vec2 halo = aura(pr, k);
  float ink = uInk;
  float bloom = (halo.x * 0.16 + halo.y * 0.08) * (1.0 - ink * 0.65) * uGlow * (1.0 + heat * 1.2);
  float body = smoothstep(0.75, -0.75, base) * uFill * (0.06 + 1.2 * min(halo.x, 1.0)) * (1.0 + heat * 0.5);
  light += uGlowColor * bloom * grow * grow;
  energy += bloom * grow * grow;

  float reachScale = mix(0.15, 1.0, grow) * (1.0 + heat * 0.9);
  float reach = (uUnit * uBend * 16.0 + uCrackle * 3.0) * (1.0 + heatCap * 0.9) + uThickness * 20.0 + 8.0;
  if (edge < reach && grow > 0.0) {
    float fade = smoothstep(reach, reach * 0.55, edge);
    vec2 q = pr / uUnit;
    float count = min(uStrands + heat * 2.5, 6.0);
    float limit = min(uStrands + heatCap * 2.5, 6.0);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      if (fi >= limit) break;
      float present = clamp(count - fi, 0.0, 1.0);
      if (present <= 0.0) continue;
      uint seed = uint(i) * 7u + 3u;
      mat2 jac;
      vec2 sway;
      float lead = i == 0 ? 1.0 : 0.0;
      vec2 warped = pr + wander(pr, t * (1.0 + fi * 0.19), seed, reachScale * mix(0.6 + fi * 0.2, 0.7, lead), jac, sway);
      float dw = shape(warped, k);
      vec2 slope = vec2(shape(warped + vec2(1.0, 0.0), k), shape(warped + vec2(0.0, 1.0), k)) - dw;
      float d = dw / max(length(slope + jac * slope), 0.3);
      float spread = shape(pr + sway, k);
      float swell = 0.5 + 0.5 * wobble(q * 0.06 + vec2(t * 0.9, fi * 5.1 - t * 0.6), seed + 8u);
      float w = uThickness * mix(0.5, 1.0, lead) * (0.5 + swell);
      float vis = mix(0.3 + 0.45 * smoothstep(-0.25, 0.2, wobble(q * 0.035 + vec2(t * 0.21, fi * 3.7), seed + 5u)), 1.0, lead);
      float spark = 1.0 - uFlicker * 0.3 * (0.5 + 0.5 * wobble(vec2(t * 6.0, fi * 2.3), seed + 6u));
      float weight = max(vis, heat * 0.85) * spark * fade * present * (0.7 + 0.6 * swell);
      vec2 g = glowShape(d, spread, w) * weight;
      float soft = mix(1.0, mix(0.5, 1.0, lead), ink);
      vec3 stroke = mix(uColor, uGlowColor, ink * (1.0 - lead) * 0.65);
      float haze = uGlow * (1.0 + heat) * (1.0 - ink * 0.7);
      light += stroke * g.x * soft + uGlowColor * g.y * haze;
      energy += g.x * soft + g.y * haze;
      hot += exp(-d * d / (w * w * 0.16)) * lead * weight;
    }
    light *= grow;
    energy *= grow;
  }

  for (int i = 0; i < ${J}; i++) addArc(pr, uArcEnds[i], uArcShape[i], t, light, energy, hot);

  float gain = uIntensity * breath * (1.0 + heat * 0.45) * (1.0 + uFlash * 0.3) * 1.4;
  float alpha = 1.0 - exp(-energy * gain);
  vec3 color = mix(1.0 - exp(-light * gain), alpha * light / max(energy, 1e-4), ink);
  color = mix(color, vec3(alpha), clamp(hot * grow, 0.0, 1.0) * ink * 0.85);
  float tint = (1.0 - exp(-body * gain * 1.2)) * grow * grow * (1.0 - ink * 0.82);
  color += uGlowColor * tint * (1.0 - alpha);
  alpha += tint * (1.0 - alpha);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  alpha = clamp(alpha + grain, 0.0, 1.0);
  fragColor = vec4(clamp(color + grain, 0.0, alpha), alpha);
}
`,ht=({src:a=Oe,color:o="#ecc7ff",glowColor:e="#ad6dff",scale:l=.7,intensity:f=1,glow:t=1,thickness:n=1.5,strands:w=4,bend:s=.6,crackle:u=1.5,arcs:i=1,flicker:R=.6,fill:S=0,speed:F=2.5,interactive:H=!0,cursorIntensity:z=.75,cursorRadius:y=100,theme:j="dark",onRender:P,className:O="",style:T})=>{let W=(0,K.useRef)(null),Y=(0,K.useRef)(null),oe=(0,K.useRef)(null);return(0,K.useEffect)(()=>{Y.current={color:o,glowColor:e,scale:l,intensity:f,glow:t,thickness:n,strands:w,bend:s,crackle:u,arcs:i,flicker:R,fill:S,speed:F,interactive:H,cursorIntensity:z,cursorRadius:y,theme:j,onRender:P}}),(0,K.useEffect)(()=>{let b=!0,C=new Image;return C.crossOrigin="anonymous",C.decoding="async",C.onload=()=>{if(!b)return;let p=null;try{p=st(C)}catch{p=null}p&&(oe.current=p)},C.src=a||Oe,()=>{b=!1,C.onload=null}},[a]),(0,K.useEffect)(()=>{let b=W.current;if(!b)return;let C=new De({dpr:Math.min(window.devicePixelRatio||1,2),alpha:!0,premultipliedAlpha:!0,antialias:!1}),p=C.gl;if(!C.isWebgl2){p.getExtension("WEBGL_lose_context")?.loseContext();return}p.clearColor(0,0,0,0);let E=p.canvas;E.style.display="block",E.style.width="100%",E.style.height="100%",b.appendChild(E);let Q=()=>({shape:null,field:new Fe(p,{image:new Float32Array([1e3]),width:1,height:1,internalFormat:p.R16F,format:p.RED,type:p.FLOAT,minFilter:p.LINEAR,magFilter:p.LINEAR,generateMipmaps:!1,flipY:!1,unpackAlignment:1}),glow:new Fe(p,{image:new Float32Array([0,0]),width:1,height:1,internalFormat:p.RG16F,format:p.RG,type:p.FLOAT,minFilter:p.LINEAR,magFilter:p.LINEAR,generateMipmaps:!1,flipY:!1,unpackAlignment:1})}),I=[Q(),Q()],$=Array.from({length:J*4},()=>0),_=Array.from({length:J*4},()=>0),X=Array.from({length:ue*4},()=>0),m={tFieldFrom:{value:I[1].field},tGlowFrom:{value:I[1].glow},tFieldTo:{value:I[0].field},tGlowTo:{value:I[0].glow},uMapFrom:{value:[0,0,1,0]},uSizeFrom:{value:[1,1,1,1]},uMapTo:{value:[0,0,1,0]},uSizeTo:{value:[1,1,1,1]},uMorph:{value:1},uResolution:{value:[1,1]},uUnit:{value:1},uTime:{value:0},uPresence:{value:0},uHover:{value:[0,0,0]},uHoverRadius:{value:120},uPulses:{value:X},uPulseBoost:{value:0},uFlash:{value:0},uColor:{value:[1,1,1]},uGlowColor:{value:[.43,.48,1]},uIntensity:{value:1},uGlow:{value:1},uThickness:{value:1.8},uStrands:{value:3},uBend:{value:1},uCrackle:{value:1},uFlicker:{value:.4},uFill:{value:.5},uInk:{value:0},uArcEnds:{value:$},uArcShape:{value:_}},ae=new We(p,{geometry:new Ne(p),program:new qe(p,{vertex:ut,fragment:ft,uniforms:m,depthTest:!1,depthWrite:!1})}),r=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,v={x:0,y:0,over:!1},c={x:0,y:0,vx:0,vy:0,power:0},M=[],U=[],k=0,L=null,D=1,fe=null,ne=0,ge=0,he=[[1,1,1],[1,1,1]],Ce=!1,Z=0,ee=1,te=1,le=0,xe=performance.now(),de=!0,Ze=(g,h)=>{g.shape=h,g.field.image=h.field,g.field.width=h.width,g.field.height=h.height,g.field.needsUpdate=!0,g.glow.image=h.glow,g.glow.width=h.glowWidth,g.glow.height=h.glowHeight,g.glow.needsUpdate=!0},Re=(g,h)=>{let G=Math.max(1e-4,Math.min(ee*h.scale/g.logoWidth,te*h.scale/g.logoHeight));return{fit:G,ox:ee/2-(g.pad+g.logoWidth/2)*G,oy:te/2-(g.pad+g.logoHeight/2)*G,unit:Math.max(g.logoWidth,g.logoHeight)*G/100}},Te=()=>{ee=Math.max(1,b.clientWidth),te=Math.max(1,b.clientHeight),C.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(it/(ee*te))),C.setSize(ee,te),m.uResolution.value=[ee,te]},ze=g=>{le=0;let h=Y.current,G=Math.min(.05,Math.max(0,(g-xe)/1e3));xe=g;let ye=oe.current;ye&&ye!==I[k].shape&&(L=ye),L&&D>=1&&(I[k].shape&&(k=1-k,D=0,M.length=0),Ze(I[k],L),L=null),D<1&&(D=Math.min(1,D+G/(L?.3:1.6)));let N=I[k].shape,V=D<1?I[1-k].shape:null;N&&(ne=Math.min(1,ne+G/1.4));let be=ne*ne*(3-2*ne);if(N&&h){let A=Re(N,h),re=V?Re(V,h):A,et=D*D*(3-2*D),tt=re.unit+(A.unit-re.unit)*et,Me=h.interactive&&v.over;Me&&c.power<.01&&(c.x=v.x,c.y=v.y,c.vx=0,c.vy=0),c.vx+=((v.x-c.x)*120-c.vx*19)*G,c.vy+=((v.y-c.y)*120-c.vy*19)*G,c.x+=c.vx*G,c.y+=c.vy*G,c.power+=((Me?1:0)-c.power)*(1-Math.exp(-G/(Me?.3:.55)));let ot=r?.2:1;Z+=G*h.speed*ot;for(let d=M.length-1;d>=0;d--)Z-M[d].born>M[d].life&&M.splice(d,1);let Le=d=>({x:(d.x-A.ox)/A.fit,y:(d.y-A.oy)/A.fit,radius:Math.max(1,h.cursorRadius)/A.fit});if(fe&&D>=1&&h.arcs>0)for(let d=0;d<3&&M.length<J;d++){let x=Ae(N,Z,Le(fe));x&&M.push(x)}if(fe=null,!r&&be>.8&&D>=1&&M.length<J){let d=G*h.speed*h.arcs;if(Math.random()<d*6*c.power*h.cursorIntensity){let x=Ae(N,Z,Le(c));x&&M.push(x)}else if(Math.random()<d*2.2){let x=Ae(N,Z,null);x&&M.push(x)}}for(let d=0;d<J;d++){let x=d*4,B=M[d];if(!B){_[x+1]=0;continue}let ie=(Z-B.born)/B.life;$[x]=A.ox+B.ax*A.fit,$[x+1]=A.oy+B.ay*A.fit,$[x+2]=A.ox+B.bx*A.fit,$[x+3]=A.oy+B.by*A.fit,_[x]=B.bow*A.fit,_[x+1]=Math.sin(Math.PI*Math.min(1,Math.max(0,ie)))*be,_[x+2]=B.seed}let ke=0,He=0;for(let d=U.length-1;d>=0;d--)(g-U[d].born)/1e3>2&&U.splice(d,1);for(let d=0;d<ue;d++){let x=d*4,B=U[d];if(!B){X[x+3]=0;continue}let ie=(g-B.born)/1e3;X[x]=B.x,X[x+1]=B.y,X[x+2]=ie,X[x+3]=1,ke=Math.max(ke,Math.exp(-ie*1.7)),He+=Math.exp(-ie*7)}let Pe=I[1-k];m.tFieldTo.value=I[k].field,m.tGlowTo.value=I[k].glow,m.tFieldFrom.value=Pe.field,m.tGlowFrom.value=Pe.glow,m.uMapTo.value=[A.ox,A.oy,A.fit,N.glowOffset],m.uSizeTo.value=[N.width,N.height,N.glowWidth,N.glowHeight],V&&(m.uMapFrom.value=[re.ox,re.oy,re.fit,V.glowOffset],m.uSizeFrom.value=[V.width,V.height,V.glowWidth,V.glowHeight]),m.uMorph.value=D,m.uUnit.value=tt,m.uTime.value=Z,m.uPresence.value=be,m.uHover.value=[c.x,c.y,c.power*Math.max(0,h.cursorIntensity)],m.uHoverRadius.value=Math.max(1,h.cursorRadius),m.uPulseBoost.value=ke,m.uFlash.value=He;let at=[$e(h.color),$e(h.glowColor)],nt=Ce?1-Math.exp(-G/.35):1;Ce=!0;for(let d=0;d<2;d++)for(let x=0;x<3;x++)he[d][x]+=(at[d][x]-he[d][x])*nt;m.uColor.value=he[0].slice(),m.uGlowColor.value=he[1].slice(),m.uIntensity.value=h.intensity,m.uGlow.value=h.glow,m.uThickness.value=h.thickness,m.uStrands.value=Math.max(1,Math.min(6,Math.round(h.strands))),m.uBend.value=h.bend,m.uCrackle.value=h.crackle,m.uFlicker.value=r?0:h.flicker,ge+=((h.theme==="light"?1:0)-ge)*(1-Math.exp(-G/.25)),m.uFill.value=h.fill,m.uInk.value=ge,C.render({scene:ae}),h.onRender?.(E)}de&&(le=requestAnimationFrame(ze))},Ge=()=>{le||!de||(xe=performance.now(),le=requestAnimationFrame(ze))},we=g=>{let h=b.getBoundingClientRect();v.x=g.clientX-h.left,v.y=g.clientY-h.top,v.over=!0},je=g=>{we(g),!(!Y.current?.interactive||r)&&(U.push({x:v.x,y:v.y,born:performance.now()}),U.length>ue&&U.shift(),fe={x:v.x,y:v.y})},ve=()=>{v.over=!1};b.addEventListener("pointermove",we),b.addEventListener("pointerdown",je),b.addEventListener("pointerleave",ve),b.addEventListener("pointercancel",ve);let Ee=new ResizeObserver(Te);Ee.observe(b);let Ie=new IntersectionObserver(([g])=>{de=g.isIntersecting,Ge()});return Ie.observe(b),Te(),Ge(),()=>{de=!1,cancelAnimationFrame(le),Ee.disconnect(),Ie.disconnect(),b.removeEventListener("pointermove",we),b.removeEventListener("pointerdown",je),b.removeEventListener("pointerleave",ve),b.removeEventListener("pointercancel",ve),p.getExtension("WEBGL_lose_context")?.loseContext(),E.parentNode&&E.parentNode.removeChild(E)}},[]),(0,Qe.jsx)("div",{ref:W,className:`relative w-full h-full overflow-hidden ${O}`.trim(),style:T})},Ke=ht;var Se=ce(pe(),1),dt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],me=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],bt=dt.map((a,o)=>({id:o+1,image:a,src:a,img:a,url:a,title:me[o],text:me[o],label:me[o],alt:me[o],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][o],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function vt({big:a}){return(0,Se.jsx)(Be,{big:a,dark:!0,center:!0,zoom:1,drive:!1,children:(0,Se.jsx)(Ke,{})})}var Mt=Ue(vt);export{Mt as default};
