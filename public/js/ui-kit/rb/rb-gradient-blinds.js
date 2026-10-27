import{c as P,i as He,j as B,l as pe,m as ve}from"./chunks/chunk-6IYH4WPJ.js";var x=P(He(),1),$=P(B(),1),F=8,U=4,Ke=1.8,X=1.6,Ue=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Xe=`#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform float uLightMode;
uniform float uShine;
uniform float uRelief;
uniform float uGlow;
uniform float uSway;
uniform float uSwayTime;
uniform float uHover;
uniform vec4 uWaves[4];
uniform float uIntro;
uniform float uGrainTime;
uniform vec3 uLightColor;
uniform float uPerspective;
uniform float uGradientShift;

out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 rotate2D(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec2 blindSpace(vec2 uv0) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = uv0 * 2.0 - 1.0;
  p.x *= aspect;
  vec2 pr = rotate2D(p, uAngle);
  pr.x /= aspect;
  vec2 uv = pr * 0.5 + 0.5;
  if (abs(uPerspective) > 0.001) {
    float k = uPerspective * 2.2;
    uv.x = (exp(k * uv.x) - 1.0) / (exp(k) - 1.0);
  }
  if (uDistort > 0.0) {
    float a = uv.y * 6.0;
    float b = uv.x * 6.0;
    float w = 0.01 * uDistort;
    uv.x += sin(a) * w;
    uv.y += cos(b) * w;
  }
  return uv;
}

vec3 gradientColor(float t) {
  float tt = clamp(t, 0.0, 1.0);
  int count = max(uColorCount, 2);
  float scaled = tt * float(count - 1);
  int seg = min(int(floor(scaled)), count - 2);
  float f = scaled - float(seg);
  if (tt >= 1.0) return uColors[count - 1];
  return mix(uColors[seg], uColors[seg + 1], f);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv0 = frag / uResolution;
  vec2 uvMod = blindSpace(uv0);

  float count = max(uBlindCount, 1.0);
  float stripePhase = uvMod.x * count;
  float pixel = max(fwidth(stripePhase), 1e-5);

  float t = uvMod.x;
  if (uGradientShift != 0.0) {
    t = 1.0 - abs(1.0 - fract((t + uGradientShift) * 0.5) * 2.0);
  }
  if (uMirror > 0.5) {
    t = 1.0 - abs(1.0 - 2.0 * fract(t));
  }
  vec3 base = gradientColor(t);

  vec2 offset = uMouse / uResolution;
  float d = length(uv0 - offset);
  float r = max(uSpotlightRadius, 1e-4);
  float spot = (1.0 - 2.0 * pow(d / r, uSpotlightSoftness)) * uSpotlightOpacity;

  float slat = floor(stripePhase);
  float s = stripePhase - slat;
  float stripeAA = clamp(count * 1.25 / min(uResolution.x, uResolution.y), 0.001, 0.12);
  float edgeBlend = 1.0 - smoothstep(0.0, stripeAA, min(s, 1.0 - s));
  float across = mix(s, 0.5, edgeBlend);
  float ramp = uShineFlip > 0.5 ? 1.0 - across : across;

  float unit = min(uResolution.x, uResolution.y);
  float reach = max(uSpotlightRadius, 0.05) * unit;
  vec2 toLight = uMouse - frag;
  float nearLight = exp(-dot(toLight, toLight) / (reach * reach));

  float tilt = 0.0;
  float pulse = 0.0;
  if (uSway > 0.0) {
    tilt += uSway * 0.5 * sin(uSwayTime * 0.9 + slat * 0.55) * (0.6 + 0.4 * sin(uSwayTime * 0.37 + slat * 0.21));
  }
  tilt += uHover * nearLight * 0.7;
  float aspect = uResolution.x / uResolution.y;
  for (int i = 0; i < 4; i++) {
    vec4 wave = uWaves[i];
    if (wave.w <= 0.0) continue;
    float age = uTime - wave.z;
    if (age < 0.0 || age > ${X.toFixed(2)}) continue;
    float life = age / ${X.toFixed(2)};
    vec2 origin = blindSpace(wave.xy / uResolution);
    float slats = abs(slat + 0.5 - origin.x * count);
    float front = age * max(count, 4.0) * 0.95;
    float k = (slats - front) / (0.8 + life * 1.2);
    float along = (uvMod.y - origin.y) / max(0.42 + life * 0.5, 0.01);
    float fade = (1.0 - life) * (1.0 - life);
    float ring = exp(-k * k) * exp(-along * along) * fade * smoothstep(0.0, 0.2, age);
    tilt += ring * 0.9;
    pulse += ring;
  }
  if (uIntro < 1.0) {
    float settle = smoothstep(0.0, 1.0, clamp(uIntro * 1.5 - uv0.x * 0.5, 0.0, 1.0));
    tilt -= (1.0 - settle) * 1.2;
  }

  float edge = ramp;
  float calm = 1.0 - 0.6 * clamp(spot, 0.0, 1.0);
  ramp = pow(clamp(ramp, 0.0, 1.0), exp(tilt * 0.9));
  ramp *= 1.0 - 0.3 * min(pulse, 1.0) * calm;
  float crease = uRelief * 0.38 * smoothstep(0.62, 1.0, ramp);
  float sheen = uShine * exp(-pow((edge - 0.035) / 0.07, 2.0)) * (0.3 + 0.7 * nearLight) * (1.0 - edgeBlend);

  vec3 lit = spot > 0.0 ? uLightColor * spot : vec3(spot);
  lit += uLightColor * min(pulse, 1.0) * 0.35 * calm;
  vec3 revealSignal = lit + base - vec3(ramp + crease);

  vec3 col;
  if (uLightMode > 0.5) {
    vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    float peak = max(base.r, max(base.g, base.b));
    float low = min(base.r, min(base.g, base.b));
    float chroma = (peak - low) / max(peak, 0.0001);
    vec3 hue = base / max(peak, 0.0001);
    hue = clamp(mix(vec3(dot(hue, luma)), hue, 1.3), 0.0, 1.0);
    hue *= mix(1.0, 0.82, smoothstep(0.55, 0.9, dot(hue, luma)));
    vec3 tint = mix(base, hue, smoothstep(0.06, 0.28, chroma));
    vec3 revealed = clamp(revealSignal, 0.0, 1.0);
    float coverage = max(revealed.r, max(revealed.g, revealed.b));
    float stroke = 1.0 - smoothstep(pixel, pixel * 2.2, edge);
    col = mix(vec3(1.0), tint, 0.72 * smoothstep(0.0, 1.0, coverage));
    col = mix(col, tint * 0.85, stroke * clamp(coverage * 1.5, 0.0, 1.0) * 0.7);
    col = mix(col, vec3(1.0), clamp(sheen, 0.0, 1.0) * 0.5);
    float grain = max(0.5 * (hash(frag + uGrainTime) + hash(frag.yx + uGrainTime * 1.7)) - 0.5, 0.0);
    col = clamp(col - vec3(grain * uNoise * 0.12 * coverage), 0.0, 1.0);
  } else {
    vec3 haze = base * uGlow * 0.4 * smoothstep(0.0, 1.0, spot) * (0.4 + 0.6 * ramp);
    col = revealSignal + haze + mix(base, uLightColor, 0.45) * sheen * 0.7;
    vec3 over = max(col - 0.8, 0.0);
    col = min(col, vec3(0.8)) + 0.2 * (1.0 - exp(-over / 0.2));
    float luma = dot(clamp(col, 0.0, 1.0), vec3(0.2126, 0.7152, 0.0722));
    float grain = 0.5 * (hash(frag + uGrainTime) + hash(frag.yx + uGrainTime * 1.7)) - 0.5;
    col += grain * uNoise * (0.45 + 0.55 * smoothstep(0.0, 0.5, luma));
  }

  float presence = smoothstep(0.0, 0.65, uIntro);
  col = uLightMode > 0.5 ? mix(vec3(1.0), col, presence) : col * presence;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,v=(t,n,f)=>Math.min(f,Math.max(n,t)),ge=(t,n,f)=>{let s=t.createShader(n);return s?(t.shaderSource(s,f),t.compileShader(s),t.getShaderParameter(s,t.COMPILE_STATUS)?s:(t.deleteShader(s),null)):null},$e=t=>{let n=ge(t,t.VERTEX_SHADER,Ue),f=ge(t,t.FRAGMENT_SHADER,Xe),s=t.createProgram();if(!n||!f||!s)return null;if(t.attachShader(s,n),t.attachShader(s,f),t.linkProgram(s),t.deleteShader(n),t.deleteShader(f),!t.getProgramParameter(s,t.LINK_STATUS))return t.deleteProgram(s),null;let m={},z=t.getProgramParameter(s,t.ACTIVE_UNIFORMS);for(let R=0;R<z;R++){let I=t.getActiveUniform(s,R);if(!I)continue;let k=I.name.replace(/\[0\]$/,"");m[k]=t.getUniformLocation(s,k)}return{program:s,uniforms:m}},we=t=>{let n=String(t||"").replace("#","").padEnd(6,"0"),f=parseInt(n.slice(0,2),16)/255,s=parseInt(n.slice(2,4),16)/255,m=parseInt(n.slice(4,6),16)/255;return[f||0,s||0,m||0]},xe=t=>{let n=(t&&t.length?t:["#FF9FFC","#5227FF"]).slice(0,F);for(n.length===1&&n.push(n[0]);n.length<F;)n.push(n[n.length-1]);let f=new Float32Array(F*3);for(let m=0;m<F;m++)f.set(we(n[m]),m*3);let s=Math.max(2,Math.min(F,t?.length??2));return{flat:f,count:s}},Ye=({className:t="",style:n,dpr:f,paused:s=!1,gradientColors:m,angle:z=0,noise:R=.3,blindCount:I=16,blindMinWidth:k=60,mouseDampening:be=.15,mirrorGradient:Se=!1,spotlightRadius:Me=.5,spotlightSoftness:Re=1,spotlightOpacity:Ce=1,distortAmount:Ae=0,shineDirection:Te="left",lightColor:Ee="#ffffff",perspective:Le=0,gradientSpeed:Pe=0,shine:Fe=.4,relief:Ie=.5,glow:ke=.4,sway:Ge=.35,speed:De=1,hoverTilt:Ne=.6,clickEffect:_e="ripple",idle:Oe="drift",intro:Be=!0,mixBlendMode:j="lighten",lightMode:J=!1})=>{let Q=(0,x.useRef)(null),Z=(0,x.useRef)(null),W=(0,x.useRef)(null),Ve=(m&&m.length?m:["#FF9FFC","#5227FF"]).join(","),ee={paused:s,colorKey:Ve,gradientColors:m,angle:z,noise:v(R,0,2),blindCount:Math.max(1,I||1),blindMinWidth:k,mouseDampening:Math.max(0,be),mirrorGradient:Se,spotlightRadius:Me,spotlightSoftness:Re,spotlightOpacity:Ce,distortAmount:Ae,shineDirection:Te,lightColor:Ee,perspective:v(Le,-1,1),gradientSpeed:Pe,shine:v(Fe,0,2),relief:v(Ie,0,1),glow:v(ke,0,2),sway:v(Ge,0,1),speed:v(De,0,4),hoverTilt:v(Ne,0,1.5),clickEffect:_e,idle:Oe,intro:Be,lightMode:J,dpr:f},w=(0,x.useRef)(ee);return w.current=ee,(0,x.useEffect)(()=>{let b=Q.current,g=Z.current,o=g?.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1});if(!b||!g||!o)return;let G=$e(o);if(!G)return;let a=G.uniforms,te=o.createVertexArray(),S=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,l={width:1,height:1,ratio:1,count:1},d={x:0,y:0,inside:!1},i={x:0,y:0,vx:0,vy:0,tx:0,ty:0,ready:!1},p=new Float32Array(U*4),q=0,D=0,C=0,M=0,H=0,oe=0,A=w.current.intro&&!S?0:1,ie="",K=xe(w.current.gradientColors),T=0,E=0,N=!0,ze=e=>{if(e.blindMinWidth&&e.blindMinWidth>0){let r=Math.max(1,Math.floor(l.width/e.blindMinWidth));return Math.max(1,e.blindCount?Math.min(e.blindCount,r):r)}return Math.max(1,e.blindCount)},ne=()=>{let e=w.current;ie!==e.colorKey&&(K=xe(e.gradientColors),ie=e.colorKey),o.viewport(0,0,g.width,g.height),o.useProgram(G.program),o.bindVertexArray(te),o.uniform2f(a.uResolution,g.width,g.height),o.uniform1f(a.uTime,C),o.uniform2f(a.uMouse,i.x*l.ratio,(l.height-i.y)*l.ratio),o.uniform1f(a.uAngle,e.angle*Math.PI/180),o.uniform1f(a.uNoise,e.noise),o.uniform1f(a.uBlindCount,ze(e)),o.uniform1f(a.uSpotlightRadius,e.spotlightRadius),o.uniform1f(a.uSpotlightSoftness,e.spotlightSoftness),o.uniform1f(a.uSpotlightOpacity,e.spotlightOpacity),o.uniform1f(a.uMirror,e.mirrorGradient?1:0),o.uniform1f(a.uDistort,e.distortAmount),o.uniform1f(a.uShineFlip,e.shineDirection==="right"?1:0),o.uniform3fv(a.uColors,K.flat),o.uniform1i(a.uColorCount,K.count),o.uniform1f(a.uLightMode,e.lightMode?1:0),o.uniform1f(a.uShine,e.shine),o.uniform1f(a.uRelief,e.relief),o.uniform1f(a.uGlow,e.glow),o.uniform1f(a.uSway,S?0:e.sway),o.uniform1f(a.uSwayTime,M),o.uniform1f(a.uHover,D*e.hoverTilt),o.uniform4fv(a.uWaves,p),o.uniform1f(a.uIntro,A),o.uniform1f(a.uGrainTime,oe),o.uniform3fv(a.uLightColor,we(e.lightColor||"#ffffff")),o.uniform1f(a.uPerspective,e.perspective),o.uniform1f(a.uGradientShift,H),o.drawArrays(o.TRIANGLES,0,3),o.bindVertexArray(null)},We=e=>{d.inside?(i.tx=d.x,i.ty=d.y):e.idle==="center"?(i.tx=l.width/2,i.ty=l.height/2):e.idle==="drift"&&!S&&(i.tx=l.width*(.5+.22*Math.sin(M*.23)+.05*Math.sin(M*.61+1.3)),i.ty=l.height*(.5+.16*Math.sin(M*.31+.7)+.04*Math.sin(M*.83)))},qe=(e,r)=>{let u=e.mouseDampening;if(u<=0){i.x=i.tx,i.y=i.ty,i.vx=0,i.vy=0;return}let h=2.4/u,L=h*h,c=2*h,_=Math.max(1,Math.ceil(r/.008)),O=r/_;for(let de=0;de<_;de++)i.vx+=(L*(i.tx-i.x)-c*i.vx)*O,i.vy+=(L*(i.ty-i.y)-c*i.vy)*O,i.x+=i.vx*O,i.y+=i.vy*O},ae=()=>{let e=w.current;l.width=Math.max(1,b.clientWidth),l.height=Math.max(1,b.clientHeight),l.ratio=Math.min(e.dpr||window.devicePixelRatio||1,2),g.width=Math.max(1,Math.round(l.width*l.ratio)),g.height=Math.max(1,Math.round(l.height*l.ratio)),i.ready||(i.ready=!0,i.x=i.tx=l.width/2,i.y=i.ty=l.height/2),ne(),y()},re=e=>{if(T=0,!N||document.hidden)return;let r=w.current,u=E?v((e-E)/1e3,.001,1/20):1/60;if(E=e,r.paused)return;C+=u,S||(M+=u*r.speed,H=(H+u*r.gradientSpeed*.06)%2),oe=Math.floor(C*24)*17.13,A<1&&(A=Math.min(1,A+u/Ke)),D+=((d.inside?1:0)-D)*(1-Math.exp(-u/.35)),We(r),qe(r,u);for(let c=0;c<U;c++)p[c*4+3]>0&&C-p[c*4+2]>X&&(p[c*4+3]=0);ne(),(Math.abs(i.tx-i.x)>.05||Math.abs(i.ty-i.y)>.05||Math.abs(i.vx)+Math.abs(i.vy)>.05||Math.abs((d.inside?1:0)-D)>.002||A<1||p.some((c,_)=>_%4===3&&c>0)||!S&&(r.noise>0||r.gradientSpeed!==0||r.sway>0&&r.speed>0||r.idle==="drift"&&!d.inside))&&(T=requestAnimationFrame(re))};function y(){!T&&N&&!document.hidden&&(E=0,T=requestAnimationFrame(re))}let se=e=>{let r=b.getBoundingClientRect(),u=e.clientX-r.left,h=e.clientY-r.top;return{x:u,y:h,inside:u>=0&&h>=0&&u<=r.width&&h<=r.height}},le=e=>{let{x:r,y:u,inside:h}=se(e);d.x=r,d.y=u,d.inside=h,h&&y()},ue=e=>{let r=w.current,{x:u,y:h,inside:L}=se(e);if(!L||S||r.clickEffect!=="ripple")return;let c=q*4;p[c]=u*l.ratio,p[c+1]=(l.height-h)*l.ratio,p[c+2]=C,p[c+3]=1,q=(q+1)%U,y()},ce=()=>{d.inside=!1,y()},fe=()=>{E=0,y()},me=new ResizeObserver(ae);me.observe(b);let he=new IntersectionObserver(e=>{N=e.some(r=>r.isIntersecting),N&&y()});return he.observe(b),window.addEventListener("pointermove",le,{passive:!0}),window.addEventListener("pointerdown",ue,{passive:!0}),document.documentElement.addEventListener("pointerleave",ce),document.addEventListener("visibilitychange",fe),ae(),W.current=y,()=>{cancelAnimationFrame(T),W.current=null,me.disconnect(),he.disconnect(),window.removeEventListener("pointermove",le),window.removeEventListener("pointerdown",ue),document.documentElement.removeEventListener("pointerleave",ce),document.removeEventListener("visibilitychange",fe),o.deleteVertexArray(te),o.deleteProgram(G.program),o.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,x.useEffect)(()=>{W.current?.()}),(0,$.jsx)("div",{ref:Q,className:["relative h-full w-full overflow-hidden",t].filter(Boolean).join(" "),style:{...!J&&j?{mixBlendMode:j}:null,...n},children:(0,$.jsx)("canvas",{ref:Z,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ye=Ye;var Y=P(B(),1),je=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],V=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],it=je.map((t,n)=>({id:n+1,image:t,src:t,img:t,url:t,title:V[n],text:V[n],label:V[n],alt:V[n],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][n],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Je({big:t}){return(0,Y.jsx)(ve,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Y.jsx)(ye,{})})}var nt=pe(Je);export{nt as default};
