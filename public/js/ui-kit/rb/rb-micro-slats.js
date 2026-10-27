import{b as Q,c as We,d as j,e as qe,f as J,h as $e}from"./chunks/chunk-M7BFARI7.js";import{c as H,i as kt,j as Y,l as He,m as Oe}from"./chunks/chunk-6IYH4WPJ.js";var F=H(kt(),1);var Je=H(Y(),1),Xe={swell:{scale:1.5,speed:.6,direction:250,chop:.55,stretch:0,glint:.7,contrast:1.25,perspective:.55,fog:.55},tide:{scale:1.3,speed:.5,direction:262,chop:.2,stretch:.12,glint:.45,contrast:1.1,perspective:.5,fog:.4},storm:{scale:.55,speed:1.6,direction:236,chop:1,stretch:.3,glint:1.3,contrast:1.8,perspective:.8,fog:.35},signal:{scale:.85,speed:1.2,direction:180,chop:.6,stretch:.85,glint:.25,contrast:1.2,perspective:0,fog:0}},Z=96,Lt=16,pe=6900,Ye=3,zt=45e5,v=(d,c,S)=>Math.min(Math.max(d,c),S),ge=(d,c)=>{try{let S=document.createElement("canvas").getContext("2d");if(!S)return c;S.fillStyle="#000000",S.fillStyle=d;let M=S.fillStyle;if(M.startsWith("#")){let I=parseInt(M.slice(1),16);return[(I>>16&255)/255,(I>>8&255)/255,(I&255)/255,1]}let b=M.match(/[\d.]+/g);return!b||b.length<3?c:[Number(b[0])/255,Number(b[1])/255,Number(b[2])/255,b[3]?Number(b[3]):1]}catch{return c}},Qe=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Gt=`#version 300 es
in vec2 position;
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = position * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position, 0.0, 1.0);
}
`,D=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
`,It=`${D}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
void main() {
  vec2 offset = vUv - uPoint;
  offset.x *= uAspect;
  float falloff = exp(-dot(offset, offset) / uRadius);
  fragColor = vec4(texture(uTarget, vUv).xyz + uValue * falloff, 1.0);
}
`,Ut=`${D}
uniform sampler2D uVelocity;
void main() {
  float left = texture(uVelocity, vL).y;
  float right = texture(uVelocity, vR).y;
  float top = texture(uVelocity, vT).x;
  float bottom = texture(uVelocity, vB).x;
  fragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
}
`,At=`${D}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uSwirl;
uniform float uDt;
void main() {
  float left = texture(uCurl, vL).x;
  float right = texture(uCurl, vR).x;
  float top = texture(uCurl, vT).x;
  float bottom = texture(uCurl, vB).x;
  float middle = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  force = force / (length(force) + 0.0001) * uSwirl * middle;
  force.y = -force.y;
  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;
  fragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`,_t=`${D}
uniform sampler2D uVelocity;
void main() {
  vec2 middle = texture(uVelocity, vUv).xy;
  float left = vL.x < 0.0 ? -middle.x : texture(uVelocity, vL).x;
  float right = vR.x > 1.0 ? -middle.x : texture(uVelocity, vR).x;
  float top = vT.y > 1.0 ? -middle.y : texture(uVelocity, vT).y;
  float bottom = vB.y < 0.0 ? -middle.y : texture(uVelocity, vB).y;
  fragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}
`,Bt=`${D}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((left + right + top + bottom - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`,Nt=`${D}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`,Ht=`${D}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uFade;
void main() {
  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  fragColor = texture(uSource, from) / (1.0 + uFade * uDt);
}
`,Ot=`${D}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  fragColor = texture(uSource, vUv) * uValue;
}
`,Wt=`#version 300 es
precision highp float;
uniform vec2 uSize;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uTime;
uniform float uScale;
uniform float uDirection;
uniform float uChop;
uniform float uStretch;
uniform float uGlint;
uniform float uContrast;
uniform float uPerspective;
uniform float uFog;
uniform float uIntro;
uniform sampler2D tVelocity;
uniform sampler2D tInk;
uniform vec2 uFluidTexel;
uniform float uFluid;
uniform float uInk;
uniform float uLean;
out vec4 fragColor;

const float TURN[4] = float[4](0.0, -0.95, 0.78, 1.62);
const float LENGTH[4] = float[4](2.6, 1.7, 1.12, 0.76);
const float HEIGHT[4] = float[4](1.0, 0.75, 0.5, 0.3);
const float SHIFT[4] = float[4](0.0, 2.3, 4.1, 1.1);

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = uGrid.y - 1.0 - cell.y;
  vec2 center = uOrigin + vec2(cell.x, row) * uGrid.zw + uSlat * 0.5;
  float v = clamp(center.y / uSize.y, 0.0, 1.0);

  vec2 flow = vec2(0.0);
  float ink = 0.0;
  if (uFluid > 0.5) {
    vec2 fluidUv = clamp(vec2(center.x / uSize.x, 1.0 - center.y / uSize.y), 0.0, 1.0);
    flow = texture(tVelocity, fluidUv).xy * uFluidTexel * uSize;
    ink = texture(tInk, fluidUv).x;
  }

  float horizon = mix(8.0, 0.5, uPerspective);
  float depth = (1.0 + horizon) / (v + horizon);
  vec2 world = vec2((center.x - uSize.x * 0.5) / uSize.y * depth, (depth - 1.0) * horizon * 2.2);
  world -= flow * 0.00018 * depth;
  world /= max(uScale, 0.05);

  float meander = 0.55 * sin(dot(world, vec2(0.23, 0.41)) * 0.9 + uTime * 0.13)
    + 0.3 * sin(dot(world, vec2(-0.37, 0.19)) * 1.4 - uTime * 0.09);

  float steep = uChop * 0.45;
  float height = 0.0;
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    float angle = uDirection + TURN[i];
    vec2 heading = vec2(cos(angle), sin(angle));
    float k = 6.2831853 / LENGTH[i];
    float omega = sqrt(9.81 * k) * 0.35;
    float theta = k * dot(world, heading) - omega * uTime + SHIFT[i] + meander * (0.6 + 0.3 * float(i));
    height += HEIGHT[i] * (cos(theta) + steep * cos(2.0 * theta));
    total += HEIGHT[i] * (1.0 + steep);
  }
  float level = clamp(0.5 + 0.5 * height / (total * 0.85), 0.0, 1.0);
  float crest = smoothstep(0.6, 1.0, level);
  float glint = crest * crest * uGlint;

  float haze = mix(1.0, 1.0 - uFog, pow(1.0 - v, 1.4));
  float light = (pow(level, uContrast) + glint * 0.8) * haze;
  float glow = 1.0 - exp(-max(ink, 0.0) * uInk * 1.6);
  light = 1.0 - (1.0 - clamp(light, 0.0, 1.0)) * (1.0 - glow);

  float front = uIntro * 1.35;
  float reveal = 1.0 - smoothstep(front - 0.35, front, v);
  float sweep = exp(-pow((v - front + 0.22) / 0.07, 2.0)) * (1.0 - uIntro);
  light = (light + sweep * 0.8) * reveal;
  light = max(light, 0.045 * reveal);
  float span = mix(1.0 - uStretch, 1.0, level) + glow * 0.3;
  span = clamp(span, 0.08, 1.0) * mix(0.1, 1.0, reveal);
  float tint = clamp(max(glint * 1.4, glow * 0.9) + sweep, 0.0, 1.0);
  float lean = clamp(flow.x / 1400.0, -1.0, 1.0) * uLean * reveal;

  fragColor = vec4(clamp(light, 0.0, 1.0), span, tint, 0.5 + 0.5 * lean);
}
`,qt=`#version 300 es
precision highp float;
uniform sampler2D tField;
uniform vec2 uSize;
uniform float uDpr;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uRound;
uniform float uTilt;
uniform vec3 uColor;
uniform vec3 uGlintColor;
uniform vec4 uBackground;
out vec4 fragColor;

float pill(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 local = p - uOrigin;
  vec2 cell = floor(local / uGrid.zw);
  vec4 background = vec4(uBackground.rgb * uBackground.a, uBackground.a);
  vec4 slat = vec4(0.0);
  int reach = uTilt > 0.0 ? 1 : 0;
  for (int dx = -1; dx <= 1; dx++) {
    if (abs(dx) > reach) continue;
    vec2 neighbour = cell + vec2(float(dx), 0.0);
    if (neighbour.x < 0.0 || neighbour.y < 0.0 || neighbour.x >= uGrid.x || neighbour.y >= uGrid.y) continue;
    vec4 field = texelFetch(tField, ivec2(int(neighbour.x), int(uGrid.y - 1.0 - neighbour.y)), 0);
    vec2 offset = local - neighbour * uGrid.zw - uSlat * 0.5;
    float angle = (field.a - 0.5) * 2.0 * uTilt;
    float c = cos(angle);
    float s = sin(angle);
    vec2 turned = vec2(c * offset.x + s * offset.y, c * offset.y - s * offset.x);
    vec2 halfSize = vec2(uSlat.x * 0.5, uSlat.y * 0.5 * field.g);
    float radius = uRound * min(halfSize.x, halfSize.y);
    float alpha = clamp(0.5 - pill(turned, halfSize, radius) * uDpr, 0.0, 1.0) * field.r;
    if (alpha > slat.a) slat = vec4(mix(uColor, uGlintColor, field.b) * alpha, alpha);
  }
  fragColor = slat + background * (1.0 - slat.a);
}
`,$t=({preset:d="swell",color:c="#A855F7",glintColor:S="#ffffff",backgroundColor:M="#000000",slatWidth:b=10,slatHeight:I=25,gap:Ze=3,roundness:Ke=.75,scale:et,speed:tt,direction:ot,chop:rt,stretch:lt,glint:it,contrast:ut,perspective:at,fog:nt,interactive:st=!0,cursorStrength:ct=1,cursorSize:vt=40,swirl:ft=0,trail:dt=1.4,lean:mt=0,intro:pt=!0,introDuration:gt=1.5,paused:ht=!1,className:xt="",style:yt})=>{let xe=(0,F.useRef)(null),U=(0,F.useRef)(null),ee=(0,F.useRef)(null),wt=Xe[d]||Xe.swell,T=(p,h)=>p??wt[h],St=(0,F.useMemo)(()=>({color:ge(c,[.66,.33,.97,1]),glintColor:ge(S,[1,1,1,1]),backgroundColor:ge(M,[0,0,0,1])}),[c,S,M]);return(0,F.useEffect)(()=>{U.current={...St,slatWidth:b,slatHeight:I,gap:Ze,roundness:Ke,scale:T(et,"scale"),speed:T(tt,"speed"),direction:T(ot,"direction"),chop:T(rt,"chop"),stretch:T(lt,"stretch"),glint:T(it,"glint"),contrast:T(ut,"contrast"),perspective:T(at,"perspective"),fog:T(nt,"fog"),interactive:st,cursorStrength:ct,cursorSize:vt,swirl:ft,trail:dt,lean:mt,intro:pt,introDuration:gt,paused:ht},ee.current?.()}),(0,F.useEffect)(()=>{let p=xe.current;if(!p)return;let h=new We({alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1}),r=h.gl;if(!h.isWebgl2){r.getExtension("WEBGL_lose_context")?.loseContext();return}r.clearColor(0,0,0,0);let C=r.canvas;C.style.display="block",C.style.width="100%",C.style.height="100%",C.setAttribute("aria-hidden","true"),p.appendChild(C);let te=new $e(r),s=new qe(r),bt=!!(r.getExtension("EXT_color_buffer_float")||r.getExtension("EXT_color_buffer_half_float")),R=e=>{r.deleteFramebuffer(e.buffer),r.deleteTexture(e.texture.texture)},E=new J(r,{width:1,height:1,depth:!1,minFilter:r.NEAREST,magFilter:r.NEAREST}),n={uSize:{value:[1,1]},uGrid:{value:[1,1,1,1]},uOrigin:{value:[0,0]},uSlat:{value:[1,1]},uTime:{value:0},uScale:{value:1},uDirection:{value:0},uChop:{value:.5},uStretch:{value:.3},uGlint:{value:1},uContrast:{value:1},uPerspective:{value:.7},uFog:{value:.5},uIntro:{value:0},tVelocity:{value:s},tInk:{value:s},uFluidTexel:{value:[1,1]},uFluid:{value:0},uInk:{value:1},uLean:{value:.5}},Tt=new j(r,{geometry:te,program:new Q(r,{vertex:Qe,fragment:Wt,uniforms:n,depthTest:!1,depthWrite:!1})}),m={tField:{value:E.texture},uSize:{value:[1,1]},uDpr:{value:1},uGrid:{value:[1,1,1,1]},uOrigin:{value:[0,0]},uSlat:{value:[1,1]},uRound:{value:1},uTilt:{value:0},uColor:{value:[1,1,1]},uGlintColor:{value:[1,1,1]},uBackground:{value:[0,0,0,1]}},Ft=new j(r,{geometry:te,program:new Q(r,{vertex:Qe,fragment:qt,uniforms:m,depthTest:!1,depthWrite:!1})}),oe={value:[1,1]},P=(e,t)=>new j(r,{geometry:te,program:new Q(r,{vertex:Gt,fragment:e,uniforms:{uTexel:oe,...t},depthTest:!1,depthWrite:!1})}),ye=P(It,{uTarget:{value:s},uAspect:{value:1},uPoint:{value:[0,0]},uValue:{value:[0,0,0]},uRadius:{value:.01}}),we=P(Ut,{uVelocity:{value:s}}),Se=P(At,{uVelocity:{value:s},uCurl:{value:s},uSwirl:{value:20},uDt:{value:.016}}),be=P(_t,{uVelocity:{value:s}}),re=P(Bt,{uPressure:{value:s},uDivergence:{value:s}}),le=P(Nt,{uPressure:{value:s},uVelocity:{value:s}}),ie=P(Ht,{uVelocity:{value:s},uSource:{value:s},uDt:{value:.016},uFade:{value:1}}),V=P(Ot,{uSource:{value:s},uValue:{value:0}}),A=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,x=1,g=1,_=0,ue=performance.now(),Te=0,O=0,W=!0,ae=!0,l=null,Fe=0,q=!1,Ce=0,k=[],y={x:0,y:0,tracked:!1},w=(e,t)=>h.render({scene:e,target:t,clear:!1}),$=(e,t)=>new J(r,{width:e,height:t,depth:!1,type:r.HALF_FLOAT,format:r.RGBA,internalFormat:r.RGBA16F,minFilter:r.LINEAR,magFilter:r.LINEAR}),ne=(e,t)=>({read:$(e,t),write:$(e,t),swap(){let o=this.read;this.read=this.write,this.write=o}}),Ee=()=>{l&&([l.velocity,l.ink,l.pressure].forEach(e=>{R(e.read),R(e.write)}),R(l.divergence),R(l.curl),l=null)},Ct=()=>{if(!bt)return;let e=x/g,t=Math.max(8,Math.round(e>=1?Z*e:Z)),o=Math.max(8,Math.round(e>=1?Z:Z/e));l&&l.width===t&&l.height===o||(Ee(),l={width:t,height:o,velocity:ne(t,o),ink:ne(t,o),pressure:ne(t,o),divergence:$(t,o),curl:$(t,o)},oe.value=[1/t,1/o])},Pe=()=>{x=Math.max(1,p.clientWidth),g=Math.max(1,p.clientHeight),h.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(zt/(x*g))),h.setSize(x,g),Ct(),N()},Et=e=>{let t=v(e.slatWidth,1,64),o=v(e.slatHeight,2,240),u=v(e.gap,0,64),i=t+u,a=o+u,f=Math.min(2048,Math.ceil((x+u)/i)+1),L=Math.min(2048,Math.ceil((g+u)/a)+1),z=(x-(f*i-u))/2,ce=(g-(L*a-u))/2;(E.width!==f||E.height!==L)&&(R(E),E=new J(r,{width:f,height:L,depth:!1,minFilter:r.NEAREST,magFilter:r.NEAREST}),m.tField.value=E.texture);let G=Math.min(.42,Math.asin(v((i*1.5-t*.5)/(o*.5),0,1)));return{slatW:t,slatH:o,tilt:G,grid:[f,L,i,a],origin:[z,ce]}},B=(e,t,o,u)=>{let i=ye.program.uniforms;i.uTarget.value=e.read.texture,i.uAspect.value=x/g,i.uPoint.value=t,i.uValue.value=o,i.uRadius.value=u,w(ye,e.write),e.swap()},Pt=(e,t,o)=>{if(o.swirl>0){we.program.uniforms.uVelocity.value=e.velocity.read.texture,w(we,e.curl);let a=Se.program.uniforms;a.uVelocity.value=e.velocity.read.texture,a.uCurl.value=e.curl.texture,a.uSwirl.value=v(o.swirl,0,2)*40,a.uDt.value=t,w(Se,e.velocity.write),e.velocity.swap()}be.program.uniforms.uVelocity.value=e.velocity.read.texture,w(be,e.divergence),V.program.uniforms.uSource.value=e.pressure.read.texture,V.program.uniforms.uValue.value=.8,w(V,e.pressure.write),e.pressure.swap(),re.program.uniforms.uDivergence.value=e.divergence.texture;for(let a=0;a<Lt;a++)re.program.uniforms.uPressure.value=e.pressure.read.texture,w(re,e.pressure.write),e.pressure.swap();le.program.uniforms.uPressure.value=e.pressure.read.texture,le.program.uniforms.uVelocity.value=e.velocity.read.texture,w(le,e.velocity.write),e.velocity.swap();let u=1/v(o.trail,.1,10),i=ie.program.uniforms;i.uDt.value=t,i.uVelocity.value=e.velocity.read.texture,i.uSource.value=e.velocity.read.texture,i.uFade.value=u*1.4,w(ie,e.velocity.write),e.velocity.swap(),i.uVelocity.value=e.velocity.read.texture,i.uSource.value=e.ink.read.texture,i.uFade.value=u,w(ie,e.ink.write),e.ink.swap()},Dt=e=>{V.program.uniforms.uValue.value=0,[e.velocity,e.ink,e.pressure].forEach(t=>{V.program.uniforms.uSource.value=t.read.texture,w(V,t.write),t.swap()})},De=e=>{if(_=0,!ae)return;let t=U.current,o=Math.min(.05,Math.max(0,(e-ue)/1e3));if(ue=e,!t)return;!t.paused&&!A&&(Te+=o*t.speed),O=t.intro&&!A?O+o/Math.max(.2,t.introDuration):1;let u=Math.min(O,1),i=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;if(l&&k.length){let z=Math.pow(v(t.cursorSize,4,600)/g,2)*.35,ce=x/g;for(let[G,X,Mt,Rt,Ue]of k){if(Ue===null){B(l.velocity,[G,X],[Mt*pe,Rt*pe,0],z),B(l.ink,[G,X],[.13,0,0],z);continue}let ve=z*.55,Ae=Math.sqrt(ve*.5)*1.9,_e=pe*.08;for(let fe=0;fe<Ye;fe++){let Be=Ue+fe/Ye*Math.PI*2,de=Math.cos(Be),me=Math.sin(Be),Ne=[G+de*Ae/ce,X+me*Ae],Vt=[(de-me)*Math.SQRT1_2*_e,(me+de)*Math.SQRT1_2*_e,0];B(l.velocity,Ne,Vt,ve),B(l.ink,Ne,[.75,0,0],ve)}B(l.ink,[G,X],[.45,0,0],z)}k.length=0,q=!0}let a=l!==null&&e<Fe;l&&(a?Pt(l,Math.min(Math.max(o,1/240),1/30),t):q&&(Dt(l),q=!1));let f=Et(t);n.uSize.value=[x,g],n.uGrid.value=f.grid,n.uOrigin.value=f.origin,n.uSlat.value=[f.slatW,f.slatH],n.uTime.value=Te,n.uScale.value=t.scale,n.uDirection.value=t.direction*Math.PI/180,n.uChop.value=v(t.chop,0,1.5),n.uStretch.value=v(t.stretch,0,.95),n.uGlint.value=Math.max(0,t.glint),n.uContrast.value=v(t.contrast,.2,4),n.uPerspective.value=v(t.perspective,0,1),n.uFog.value=v(t.fog,0,1),n.uIntro.value=i,n.uFluid.value=a?1:0,n.tVelocity.value=l?l.velocity.read.texture:s,n.tInk.value=l?l.ink.read.texture:s,n.uFluidTexel.value=oe.value,n.uInk.value=v(t.cursorStrength,0,3),n.uLean.value=v(t.lean,0,1),h.render({scene:Tt,target:E}),m.uSize.value=[x,g],m.uDpr.value=h.dpr,m.uGrid.value=f.grid,m.uOrigin.value=f.origin,m.uSlat.value=[f.slatW,f.slatH],m.uRound.value=v(t.roundness,0,1),m.uTilt.value=a&&t.lean>0?f.tilt:0,m.uColor.value=t.color.slice(0,3),m.uGlintColor.value=t.glintColor.slice(0,3),m.uBackground.value=t.backgroundColor,h.render({scene:Ft});let L=!t.paused&&!A&&t.speed!==0||O<1;W&&(L||a||q)&&(_=requestAnimationFrame(De))},N=()=>{_||!W||!ae||(ue=performance.now(),_=requestAnimationFrame(De))},Me=e=>{let t=p.getBoundingClientRect(),o=e.clientX-t.left,u=e.clientY-t.top,i=Math.max(1,t.width),a=Math.max(1,t.height);return{x:o,y:u,u:o/i,v:1-u/a,h:a,inside:o>=0&&u>=0&&o<=i&&u<=a}},Re=(e,t,o,u,i)=>{k.length>32&&k.shift(),k.push([e,t,o,u,i]);let a=U.current;Fe=performance.now()+Math.max(1.5,(a?a.trail:1.4)*5)*1e3,N()},Ve=e=>{let t=U.current,o=Me(e);if(!l||!t||!t.interactive||A||!o.inside){y.tracked=!1;return}y.tracked&&(o.x!==y.x||o.y!==y.y)&&Re(o.u,o.v,(o.x-y.x)/o.h,(y.y-o.y)/o.h,null),y.x=o.x,y.y=o.y,y.tracked=!0},ke=e=>{let t=U.current,o=Me(e);!l||!t||!t.interactive||A||!o.inside||(Ce+=2.39996,Re(o.u,o.v,0,0,Ce))},se=()=>{y.tracked=!1},Le=e=>{e.relatedTarget||se()},ze=()=>{document.hidden||N()};window.addEventListener("pointermove",Ve,{passive:!0}),window.addEventListener("pointerdown",ke,{passive:!0}),window.addEventListener("pointerout",Le,{passive:!0}),window.addEventListener("blur",se),document.addEventListener("visibilitychange",ze);let Ge=new ResizeObserver(Pe);Ge.observe(p);let Ie=new IntersectionObserver(([e])=>{W=e.isIntersecting,N()});return Ie.observe(p),ee.current=N,Pe(),()=>{ae=!1,W=!1,cancelAnimationFrame(_),Ge.disconnect(),Ie.disconnect(),window.removeEventListener("pointermove",Ve),window.removeEventListener("pointerdown",ke),window.removeEventListener("pointerout",Le),window.removeEventListener("blur",se),document.removeEventListener("visibilitychange",ze),ee.current=null,Ee(),R(E),r.getExtension("WEBGL_lose_context")?.loseContext(),C.parentNode&&C.parentNode.removeChild(C)}},[]),(0,Je.jsx)("div",{ref:xe,className:`relative h-full w-full overflow-hidden ${xt}`.trim(),style:yt})},je=$t;var he=H(Y(),1),Xt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],K=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],to=Xt.map((d,c)=>({id:c+1,image:d,src:d,img:d,url:d,title:K[c],text:K[c],label:K[c],alt:K[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Yt({big:d}){return(0,he.jsx)(Oe,{big:d,dark:!0,center:!1,zoom:1,drive:!1,children:(0,he.jsx)(je,{})})}var oo=He(Yt);export{oo as default};
