import{c as ae,i as Ye,j as de,l as $e,m as Oe}from"./chunks/chunk-6IYH4WPJ.js";var E=ae(Ye(),1),he=ae(de(),1),q=4,ne=3,x=64,Ke=3e6,Je=560,me=Math.PI/2,Qe=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,Ze=`#version 300 es
precision highp float;
precision highp int;

uniform vec2 uSize;
uniform float uRatio;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform vec3 uParam;
uniform float uPerimeter;
uniform vec4 uCells;
uniform vec2 uSoft;
uniform float uTime;
uniform float uPower;
uniform float uReveal;
uniform vec3 uHover;
uniform float uHoverRadius;
uniform vec4 uPulses[${ne}];
uniform vec3 uCore;
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uGlow;
uniform float uThickness;
uniform float uStrands;
uniform float uChaos;
uniform float uSpread;
uniform float uFlicker;
uniform float uInk;
uniform vec4 uArcEnds[${q}];
uniform vec4 uArcShape[${q}];

out vec4 fragColor;

uint scramble(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

vec2 slant(uint x, uint y, uint seed) {
  uint h = scramble(x * 0x8da6b343u + y * 0xd8163841u + seed * 0xcb1ab31fu);
  return vec2(uvec2(h, h >> 8u) & 255u) / 127.5 - 1.0;
}

vec2 ring(vec2 p, float period, uint seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float du = 30.0 * f.x * f.x * (f.x * (f.x - 2.0) + 1.0);
  uint x0 = uint(mod(i.x, period));
  uint x1 = uint(mod(i.x + 1.0, period));
  uint y0 = uint(i.y + 65536.0);
  vec2 ga = slant(x0, y0, seed);
  vec2 gb = slant(x1, y0, seed);
  vec2 gc = slant(x0, y0 + 1u, seed);
  vec2 gd = slant(x1, y0 + 1u, seed);
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  float gx = ga.x + u.x * (gb.x - ga.x) + u.y * (gc.x - ga.x) + u.x * u.y * (ga.x - gb.x - gc.x + gd.x);
  return vec2(value, gx + du * (vb - va + u.y * k));
}

float wobble(float x, uint seed) {
  return ring(vec2(x, 0.5), 1048576.0, seed).x;
}

vec2 frameAt(vec2 p) {
  vec2 inner = max(uHalf - uRadius, 0.0);
  vec2 q = abs(p) - inner;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float quarter = uPerimeter * 0.25;
  vec2 v = abs(p) - uParam.xy;
  float t;
  if (v.x > 0.0 && v.y > 0.0) t = uParam.x + uParam.z * atan(v.x, v.y);
  else if (v.x > v.y) t = uParam.x + 1.5707963 * uParam.z + uParam.y - abs(p.y);
  else t = abs(p.x);
  t = clamp(t, 0.0, quarter);
  float s = p.x >= 0.0 ? (p.y < 0.0 ? t : 2.0 * quarter - t) : (p.y < 0.0 ? 4.0 * quarter - t : 2.0 * quarter + t);
  return vec2(s, d);
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
  float along = dot(rel, dir);
  float side = dot(rel, vec2(-dir.y, dir.x));
  float margin = abs(info.x) + (0.6 + uChaos) * (2.0 + len * 0.08) + uThickness * 12.0 + 10.0;
  if (along < -margin || along > len + margin || abs(side) > margin) return;
  float u = clamp(along / len, 0.0, 1.0);
  float taper = sin(3.14159265 * u);
  float settle = smoothstep(0.0, 0.15, u) * smoothstep(1.0, 0.85, u);
  float bendSlope = 3.14159265 / len * cos(3.14159265 * u) * settle;
  float beyond = max(-along, 0.0) + max(along - len, 0.0);
  for (int c = 0; c < 2; c++) {
    uint seed = uint(info.z * 131.0) + uint(c) * 29u + 7u;
    float jag = 0.0;
    float jagSlope = 0.0;
    float wave = max(len * 0.3, 14.0);
    float weight = (0.6 + uChaos) * (1.5 + len * 0.05) * (c == 0 ? 1.0 : 1.5);
    for (int o = 0; o < 3; o++) {
      vec2 n = ring(vec2(along / wave + info.z * 3.0, t * (1.4 + float(o) * 1.1)), 1048576.0, seed + uint(o));
      jag += n.x * weight;
      jagSlope += n.y * weight / wave;
      wave *= 0.42;
      weight *= 0.4;
    }
    float offset = (info.x + jag) * taper;
    float offsetSlope = (info.x + jag) * bendSlope + jagSlope * taper * settle;
    float across = (side - offset) / sqrt(1.0 + offsetSlope * offsetSlope);
    float gap = length(vec2(beyond, across));
    float w = uThickness * (c == 0 ? 0.9 : 0.6);
    vec2 g = glowShape(gap, gap, w);
    float k = info.y * (c == 0 ? 1.0 : 0.45);
    light += (uCore * g.x + uGlowColor * g.y * uGlow) * k;
    energy += (g.x + g.y * uGlow) * k;
    hot += exp(-gap * gap / (w * w * 0.16)) * k * (c == 0 ? 1.0 : 0.0);
  }
}

void main() {
  vec2 p = vec2(gl_FragCoord.x / uRatio, uSize.y - gl_FragCoord.y / uRatio);
  vec2 frame = frameAt(p - uCenter);
  float s = frame.x;
  float d = frame.y;
  float t = uTime;
  vec3 light = vec3(0.0);
  float energy = 0.0;
  float hot = 0.0;

  float along = min(s, uPerimeter - s);
  float front = uReveal * (uPerimeter * 0.5 + 80.0);
  float shown = smoothstep(front, front - 70.0, along) * uPower;
  float flare = uReveal < 1.0 ? exp(-pow((along - front + 30.0) / 26.0, 2.0)) * uPower : 0.0;

  vec2 toHover = p - uHover.xy;
  float heat = uHover.z * exp(-dot(toHover, toHover) / (uHoverRadius * uHoverRadius));
  float surge = 0.0;
  for (int i = 0; i < ${ne}; i++) {
    vec4 pulse = uPulses[i];
    if (pulse.z <= 0.0) continue;
    float gap = abs(s - pulse.x);
    gap = min(gap, uPerimeter - gap);
    float wave = (gap - pulse.y * ${Je}.0) / 46.0;
    surge += exp(-wave * wave) * pulse.z * exp(-pulse.y * 1.2);
  }
  heat = min(heat * 0.7 + surge * 0.8 + flare * 0.6, 1.2);
  vec2 inset = min(p, uSize - p);
  float frameFade = smoothstep(0.0, 14.0, min(inset.x, inset.y));

  float edge = abs(d);
  float inward = d < 0.0 ? exp(d / 14.0) : 1.0;
  float bloom = (exp(-edge / 3.0) * 0.1 + exp(-edge / 16.0) * 0.05 * inward) * uGlow * (1.0 + heat * 0.6) * shown;
  light += uGlowColor * bloom;
  energy += bloom;

  float bendAmp = uSpread * 16.0 * (1.0 + heat * 0.35);
  float rippleAmp = uSpread * 6.0 * (1.0 + heat * 0.3);
  float crinkleAmp = uChaos * 4.5 * (1.0 + heat * 0.3);
  float squeeze = min(1.0, 34.0 / max((bendAmp + rippleAmp) * 1.6 + crinkleAmp, 1e-3));
  bendAmp *= squeeze;
  rippleAmp *= squeeze;
  crinkleAmp *= squeeze;
  float reach = (bendAmp * 1.9 + rippleAmp + crinkleAmp * 1.6) * 1.3 + uThickness * 14.0 + 8.0;
  if (edge < reach && shown > 0.0) {
    float fade = smoothstep(reach, reach * 0.55, edge);
    float count = min(uStrands + heat * 1.2, 6.0);
    float slopeScale = 1.0 / uPerimeter;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      if (fi >= ceil(count)) break;
      float present = clamp(count - fi, 0.0, 1.0);
      uint seed = uint(i) * 7u + 3u;
      float lead = i == 0 ? 1.0 : 0.0;
      float range = mix(1.35 + fi * 0.18, 0.7, lead);
      float x = s * slopeScale;
      vec2 a = ring(vec2(x * uCells.x, t * 0.7 + fi * 3.1), uCells.x, seed);
      vec2 b = ring(vec2(x * uCells.y, t * 1.9 + fi * 1.7), uCells.y, seed + 1u);
      vec2 c = ring(vec2(x * uCells.z, t * 4.6 + fi * 0.9), uCells.z, seed + 2u);
      vec2 e = ring(vec2(x * uCells.w, t * 6.8), uCells.w, seed + 3u);
      float offset = (a.x * bendAmp + b.x * rippleAmp) * range + (c.x + e.x * 0.35) * crinkleAmp;
      float slope =
        ((a.y * uCells.x * bendAmp + b.y * uCells.y * rippleAmp) * range +
          (c.y * uCells.z + e.y * 0.35 * uCells.w) * crinkleAmp) *
        slopeScale;
      float drift = lead > 0.5 ? 0.0 : wobble(fi * 7.3, seed + 9u) * 2.5 * uSpread;
      offset += drift;
      float across = (d - offset) / sqrt(1.0 + slope * slope);
      float spread = d - a.x * bendAmp * range - drift;
      float swell = 0.5 + 0.5 * ring(vec2(x * uSoft.y, t * 2.0 + fi * 5.1), uSoft.y, seed + 8u).x;
      float w = uThickness * mix(0.55, 1.0, lead) * (0.5 + swell);
      float vis = mix(0.3 + 0.45 * smoothstep(-0.25, 0.2, ring(vec2(x * uSoft.x, t * 0.5 + fi * 3.7), uSoft.x, seed + 5u).x), 1.0, lead);
      float spark = 1.0 - uFlicker * 0.3 * (0.5 + 0.5 * wobble(t * 13.0 + fi * 2.3, seed + 6u));
      float weight = max(vis, heat * 0.6) * spark * fade * present * (0.7 + 0.6 * swell);
      vec2 g = glowShape(across, spread, w) * weight;
      g.y *= inward;
      float haze = uGlow * (1.0 + heat * 0.5) * (1.0 - uInk * 0.7);
      light += uCore * g.x + uGlowColor * g.y * haze;
      energy += g.x + g.y * haze;
      hot += exp(-across * across / (w * w * 0.16)) * lead * weight;
    }
    light *= shown;
    energy *= shown;
    hot *= shown;
  }

  for (int i = 0; i < ${q}; i++) addArc(p, uArcEnds[i], uArcShape[i], t, light, energy, hot);

  float breath = 1.0 + uFlicker * 0.5 * wobble(t * 4.6 + 7.0, 3u);
  float gain = uIntensity * breath * (1.0 + heat * 0.25) * 1.4;
  light *= frameFade;
  energy *= frameFade;
  hot *= frameFade;
  float alpha = 1.0 - exp(-energy * gain);
  vec3 color = mix(1.0 - exp(-light * gain), alpha * light / max(energy, 1e-4), uInk);
  color = mix(color, vec3(alpha), clamp(hot, 0.0, 1.0) * uInk * 0.85);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  alpha = clamp(alpha + grain, 0.0, 1.0);
  fragColor = vec4(clamp(color + grain, 0.0, alpha), alpha);
}`,R=(e,n,i)=>Math.min(i,Math.max(n,e)),Pe=e=>{let n=String(e||"").trim(),i=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(n);if(i){let l=i[1].length===3?i[1].replace(/./g,f=>f+f):i[1];return[0,2,4].map(f=>parseInt(l.slice(f,f+2),16)/255)}let o=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(n);if(o)return[o[1],o[2],o[3]].map(l=>R(parseFloat(l)/255,0,1));if(typeof document<"u"){let l=document.createElement("canvas").getContext("2d");if(l){l.fillStyle="#000000",l.fillStyle=n;let f=String(l.fillStyle);if(f!=="#000000"||/^(#0{3}|#0{6}|black)$/i.test(n))return Pe(f)}}return[.49,.98,1]},Ve=(e,n,i)=>{let o=e.createShader(n);return o?(e.shaderSource(o,i),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)?o:(console.error(e.getShaderInfoLog(o)),e.deleteShader(o),null)):null},et=e=>{let n=Ve(e,e.VERTEX_SHADER,Qe),i=Ve(e,e.FRAGMENT_SHADER,Ze),o=n&&i?e.createProgram():null;if(!n||!i||!o)return n&&e.deleteShader(n),i&&e.deleteShader(i),null;if(e.attachShader(o,n),e.attachShader(o,i),e.linkProgram(o),e.deleteShader(n),e.deleteShader(i),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(e.getProgramInfoLog(o)),e.deleteProgram(o),null;let l={},f=e.getProgramParameter(o,e.ACTIVE_UNIFORMS);for(let u=0;u<f;u++){let p=e.getActiveUniform(o,u);p&&(l[p.name.replace(/\[0\]$/,"")]=e.getUniformLocation(o,p.name))}return{program:o,uniforms:l}},re=(e,n,i,o,l)=>{let f=Math.abs(e)-(i-l),u=Math.abs(n)-(o-l);return Math.hypot(Math.max(f,0),Math.max(u,0))+Math.min(Math.max(f,u),0)-l},Be=(e,n,i,o)=>{let l=Math.max(1,e/2+o),f=Math.max(1,n/2+o),u=R(i+o,0,Math.min(l,f)),p=Math.min(u+48,Math.min(l,f)),S=l-p,v=f-p,F=S+v+me*p;return{hx:l,hy:f,r:u,vr:p,ax:S,ay:v,quarter:F,perimeter:F*4}},ke=(e,n)=>{let{hx:i,hy:o,r:l,vr:f,ax:u,ay:p,quarter:S,perimeter:v}=e,F=(n%v+v)%v,L=Math.min(3,Math.floor(F/S)),W=F-L*S,T=L%2?S-W:W,B,U;if(T<=u)B=T,U=-o;else if(T<=u+me*f){let j=f>0?(T-u)/f:0,J=Math.sin(j),se=-Math.cos(j),_=0,Q=f+l+2;for(let I=0;I<18;I++){let w=(_+Q)/2;re(u+J*w,-p+se*w,i,o,l)<0?_=w:Q=w}B=u+J*_,U=-p+se*_}else B=i,U=-p+(T-u-me*f);let xe=L>=2?-1:1,ge=L===1||L===2?-1:1,G=B*xe,H=U*ge,ie=re(G+.5,H,i,o,l)-re(G-.5,H,i,o,l),Y=re(G,H+.5,i,o,l)-re(G,H-.5,i,o,l),K=Math.hypot(ie,Y)||1;return{x:G,y:H,nx:ie/K,ny:Y/K}},Ue=(e,n,i)=>{let{ax:o,ay:l,vr:f,quarter:u}=e,p=Math.abs(n)-o,S=Math.abs(i)-l,v;return p>0&&S>0?v=o+f*Math.atan2(p,S):p>S?v=o+me*f+l-Math.abs(i):v=Math.abs(n),v=R(v,0,u),n>=0?i<0?v:2*u-v:i<0?4*u-v:2*u+v},tt=({children:e,color:n="#7df9ff",glowColor:i,speed:o=1,chaos:l=.5,spread:f=.6,thickness:u=1.5,strands:p=3,glow:S=.6,intensity:v=.8,arcs:F=1,flicker:L=.5,borderRadius:W=24,offset:T=0,active:B=!0,intro:U=!0,interactive:xe=!0,cursorRadius:ge=90,theme:G="dark",className:H="",style:ie})=>{let Y=(0,E.useRef)(null),K=(0,E.useRef)(null),j=(0,E.useRef)(null),[J,se]=(0,E.useState)(0),_=Pe(n),Q={core:_.map(w=>w+(1-w)*.55),glowColor:i?Pe(i):_,speed:Math.max(0,o),chaos:R(l,0,2),spread:R(f,0,2),thickness:Math.max(.25,u),strands:R(Math.round(p),1,6),glow:R(S,0,3),intensity:Math.max(0,v),arcs:Math.max(0,F),flicker:R(L,0,1),borderRadius:Math.max(0,W),offset:T,active:B,intro:U,interactive:xe,cursorRadius:Math.max(1,ge),light:G==="light"},I=(0,E.useRef)(Q);return I.current=Q,(0,E.useEffect)(()=>{j.current?.()}),(0,E.useEffect)(()=>{let w=Y.current,b=K.current;if(!w||!b)return;let a=b.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"default"}),le=a?et(a):null;if(!a||!le)return;let X=window.matchMedia("(prefers-reduced-motion: reduce)").matches,Re=a.createVertexArray(),Z=new Float32Array(q*4),ee=new Float32Array(q*4),te=new Float32Array(ne*4),A={width:1,height:1,ratio:1},d={x:0,y:0,over:!1,near:!1},m={x:0,y:0,vx:0,vy:0,power:0},C=[],D=[],ce=I.current,k=ce.active&&!(ce.intro&&!X&&J===0)?1:0,oe=k,Ee=ce.active,ye=ce.light?1:0,h=Be(1,1,0,0),N=Math.random()*100,$=0,fe=0,we=!0,be=document.visibilityState!=="hidden",Me=!1,Se=()=>{let s=I.current,r=Math.max(1,w.offsetWidth),t=Math.max(1,w.offsetHeight),P=r+x*2,M=t+x*2,V=Math.min(window.devicePixelRatio||1,2,Math.sqrt(Ke/(P*M))),z=Math.max(1,Math.round(P*V)),c=Math.max(1,Math.round(M*V));(b.width!==z||b.height!==c)&&(b.width=z,b.height=c),b.style.width=`${P}px`,b.style.height=`${M}px`,Object.assign(A,{width:r,height:t,ratio:z/P}),h=Be(r,t,s.borderRadius,s.offset)},Ae=(s,r)=>{let t=Math.min(h.perimeter*.3,60+Math.random()*90),M=(r??Math.random()*h.perimeter)-t*(.2+Math.random()*.6),V=M+t,z=ke(h,M),c=ke(h,V),g=ke(h,(M+V)/2),y=c.x-z.x,ue=c.y-z.y,Ce=Math.hypot(y,ue)||1,We=-ue/Ce*g.nx+y/Ce*g.ny,Ne=Math.min(x-30,Ce*(.14+Math.random()*.16)+5);return{ax:z.x,ay:z.y,bx:c.x,by:c.y,bow:We>=0?Ne:-Ne,seed:1+Math.random()*60,born:s,life:.35+Math.random()*.45}},Xe=(s,r)=>{let t=le.uniforms,P=A.width+x*2,M=A.height+x*2;a.viewport(0,0,b.width,b.height),a.clearColor(0,0,0,0),a.clear(a.COLOR_BUFFER_BIT),!(k<=.001&&!C.length)&&(a.useProgram(le.program),a.uniform2f(t.uSize,P,M),a.uniform1f(t.uRatio,A.ratio),a.uniform2f(t.uCenter,P/2,M/2),a.uniform2f(t.uHalf,h.hx,h.hy),a.uniform1f(t.uRadius,h.r),a.uniform3f(t.uParam,h.ax,h.ay,h.vr),a.uniform1f(t.uPerimeter,h.perimeter),a.uniform4f(t.uCells,Math.max(1,Math.round(h.perimeter/75)),Math.max(2,Math.round(h.perimeter/25)),Math.max(3,Math.round(h.perimeter/9)),Math.max(4,Math.round(h.perimeter/4))),a.uniform2f(t.uSoft,Math.max(1,Math.round(h.perimeter/150)),Math.max(1,Math.round(h.perimeter/50))),a.uniform1f(t.uTime,N),a.uniform1f(t.uPower,k*k*(3-2*k)),a.uniform1f(t.uReveal,oe),a.uniform3f(t.uHover,m.x+x,m.y+x,r),a.uniform1f(t.uHoverRadius,s.cursorRadius),a.uniform4fv(t.uPulses,te),a.uniform3fv(t.uCore,s.core),a.uniform3fv(t.uGlowColor,s.glowColor),a.uniform1f(t.uIntensity,s.intensity),a.uniform1f(t.uGlow,s.glow),a.uniform1f(t.uThickness,s.thickness),a.uniform1f(t.uStrands,s.strands),a.uniform1f(t.uChaos,s.chaos),a.uniform1f(t.uSpread,s.spread),a.uniform1f(t.uFlicker,X?0:s.flicker),a.uniform1f(t.uInk,ye),a.uniform4fv(t.uArcEnds,Z),a.uniform4fv(t.uArcShape,ee),a.bindVertexArray(Re),a.drawArrays(a.TRIANGLES,0,3))},ze=s=>{if($=0,Me)return;let r=I.current,t=R((s-fe)/1e3||0,0,.05);fe=Math.max(fe,s);let P=X?.2:1;N+=t*r.speed*P,r.active&&!Ee&&(oe=0),Ee=r.active,k+=((r.active?1:0)-k)*(1-Math.exp(-t/(r.active?.28:.4))),r.active&&(oe=X?1:Math.min(1,oe+t/.9)),ye+=((r.light?1:0)-ye)*(1-Math.exp(-t/.25));let M=r.interactive&&d.near&&r.active;M&&m.power<.01&&(m.x=d.x,m.y=d.y,m.vx=0,m.vy=0),m.vx+=((d.x-m.x)*120-m.vx*19)*t,m.vy+=((d.y-m.y)*120-m.vy*19)*t,m.x+=m.vx*t,m.y+=m.vy*t,m.power+=((M?1:0)-m.power)*(1-Math.exp(-t/(M?.3:.55)));for(let c=C.length-1;c>=0;c--)N-C[c].born>C[c].life&&C.splice(c,1);if(!X&&r.active&&oe>=1&&r.arcs>0&&C.length<q){let c=t*r.speed*r.arcs;Math.random()<c*5*m.power?C.push(Ae(N,Ue(h,m.x-A.width/2,m.y-A.height/2))):Math.random()<c*(.6+h.perimeter/2400)&&C.push(Ae(N,null))}let V=k*k*(3-2*k);for(let c=0;c<q;c++){let g=c*4,y=C[c];if(!y){ee[g+1]=0;continue}let ue=R((N-y.born)/y.life,0,1);Z[g]=y.ax+A.width/2+x,Z[g+1]=y.ay+A.height/2+x,Z[g+2]=y.bx+A.width/2+x,Z[g+3]=y.by+A.height/2+x,ee[g]=y.bow,ee[g+1]=Math.sin(Math.PI*ue)*V,ee[g+2]=y.seed}for(let c=D.length-1;c>=0;c--)s-D[c].born>2200&&D.splice(c,1);for(let c=0;c<ne;c++){let g=c*4,y=D[c];if(!y){te[g+2]=0;continue}te[g]=y.s,te[g+1]=(s-y.born)/1e3,te[g+2]=1}Xe(r,m.power*(r.interactive?1:0)),(k>.002||r.active||C.length>0)&&we&&be&&($=requestAnimationFrame(ze))},O=()=>{$||Me||!we||!be||(fe=performance.now(),$=requestAnimationFrame(ze))};j.current=()=>{Se(),O()};let Ie=s=>{let r=w.getBoundingClientRect();d.x=s.clientX-r.left,d.y=s.clientY-r.top,d.over=d.x>=0&&d.y>=0&&d.x<=r.width&&d.y<=r.height,d.near=d.x>=-x/2&&d.y>=-x/2&&d.x<=r.width+x/2&&d.y<=r.height+x/2},qe=s=>{Ie(s),d.near&&O()},Fe=s=>{Ie(s);let r=I.current;if(!d.over||!r.interactive||!r.active||X)return;let t=Ue(h,d.x-A.width/2,d.y-A.height/2);D.push({s:t,born:performance.now()}),D.length>ne&&D.shift(),C.length<q&&C.push(Ae(N,t)),O()},Le=()=>{d.over=!1,d.near=!1};window.addEventListener("pointermove",qe,{passive:!0}),window.addEventListener("pointerdown",Fe,{passive:!0}),document.documentElement.addEventListener("pointerleave",Le);let Te=s=>{s.preventDefault(),Me=!0,cancelAnimationFrame($),$=0},Ge=()=>se(s=>s+1);b.addEventListener("webglcontextlost",Te),b.addEventListener("webglcontextrestored",Ge);let He=new ResizeObserver(()=>{Se(),O()});He.observe(w);let _e=new IntersectionObserver(s=>{we=s.some(r=>r.isIntersecting),O()});_e.observe(w);let De=()=>{be=document.visibilityState!=="hidden",O()};return document.addEventListener("visibilitychange",De),Se(),O(),()=>{cancelAnimationFrame($),j.current=null,He.disconnect(),_e.disconnect(),window.removeEventListener("pointermove",qe),window.removeEventListener("pointerdown",Fe),document.documentElement.removeEventListener("pointerleave",Le),document.removeEventListener("visibilitychange",De),b.removeEventListener("webglcontextlost",Te),b.removeEventListener("webglcontextrestored",Ge),a.isContextLost()||(a.deleteVertexArray(Re),a.deleteProgram(le.program))}},[J]),(0,he.jsxs)("div",{ref:Y,className:`relative isolate ${H}`.trim(),style:{borderRadius:W,...ie},children:[e,(0,he.jsx)("canvas",{ref:K,className:"pointer-events-none absolute z-[1] block",style:{top:-x,left:-x},"aria-hidden":"true"})]})},je=tt;var ve=ae(de(),1),ot=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],pe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ct=ot.map((e,n)=>({id:n+1,image:e,src:e,img:e,url:e,title:pe[n],text:pe[n],label:pe[n],alt:pe[n],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][n],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function at({big:e}){return(0,ve.jsx)(Oe,{big:e,dark:!0,center:!0,zoom:1,drive:!1,children:(0,ve.jsx)(je,{color:"#48c8f5",children:(0,ve.jsx)("div",{className:"px-10 py-8 text-center text-lg font-semibold",children:"Neva Growth"})})})}var ft=$e(at);export{ft as default};
