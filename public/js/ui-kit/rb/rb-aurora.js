import{c as L,i as be,j as _,l as re,m as ne}from"./chunks/chunk-6IYH4WPJ.js";var g=L(be(),1),U=L(_(),1),V=5,ie=3,Me=2.4,Se=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ae=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uStops[${V}];
uniform int uStopCount;
uniform float uAmplitude;
uniform float uBlend;
uniform float uHeight;
uniform float uScale;
uniform float uGlow;
uniform float uBrightness;
uniform int uLayers;
uniform float uFlip;
uniform vec3 uPointer;
uniform float uReveal;
uniform float uOpacity;
uniform float uLightMode;
out vec4 outColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 ramp(float t) {
  float x = clamp(t, 0.0, 1.0) * float(uStopCount - 1);
  int i = int(min(floor(x), float(uStopCount - 2)));
  float f = x - float(i);
  f = f * f * (3.0 - 2.0 * f);
  vec3 lch = mix(uStops[i], uStops[i + 1], f);
  lch.x = mix(lch.x, min(lch.x, 0.7), uLightMode);
  return toSrgb(oklabToLinear(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z))));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float y = 1.0 - frag.y / uResolution.y;
  y = mix(y, 1.0 - y, uFlip);
  float u = frag.x / uResolution.x;
  float X = (frag.x - uResolution.x * 0.5) / uResolution.y;
  float t = uTime;
  float reach = uPointer.z * exp(-pow((X - uPointer.x) / 0.38, 2.0));

  vec3 glow = vec3(0.0);
  float cover = 0.0;
  for (int k = 0; k < ${ie}; k++) {
    if (k >= uLayers) break;
    float layer = float(k);
    float seed = layer * 13.7;
    float pace = t * (1.0 - layer * 0.18);
    float warp = snoise(vec2(X * 0.45 * uScale + pace * 0.02 + seed, pace * 0.05 + seed));
    float wave = snoise(vec2(X * 0.75 * uScale + warp * 0.35 - pace * 0.03 + seed, pace * 0.07 - seed)) * 0.72
      + snoise(vec2(X * 1.6 * uScale + warp * 0.5 + pace * 0.04 - seed, pace * 0.1 + seed * 0.5)) * 0.28;
    float hem = uHeight + layer * 0.07 + wave * 0.15 * uAmplitude;
    hem += reach * 0.08 * (layer < 0.5 ? 1.0 : 0.4);
    hem = mix(-0.25, hem, uReveal);

    float soft = (0.04 + uBlend * 0.16) * (1.0 + layer * 0.9);
    float rise = hem - y;
    float low = -soft - uGlow * 0.14;
    float high = 0.26 + soft * 0.6;
    float body = pow(smootherstep(low, high, rise), 1.5 + uGlow * 0.6);
    float lobes = 0.86 + 0.14 * snoise(vec2(X * 0.9 * uScale - pace * 0.025 + seed, y * 0.3 + pace * 0.04));
    float alpha = body * lobes * (layer < 0.5 ? 1.0 : 0.32 / layer);
    alpha = clamp(alpha * (1.0 + reach * 0.25 * smootherstep(0.9, 0.0, abs(y - hem))), 0.0, 1.0);

    vec3 tint = ramp(u + 0.05 * sin(pace * 0.08 + layer * 2.3) + layer * 0.1 + max(rise, 0.0) * 0.05);
    glow = 1.0 - (1.0 - glow) * (1.0 - tint * alpha);
    cover = 1.0 - (1.0 - cover) * (1.0 - alpha);
  }

  float fade = smootherstep(0.0, 0.7, uReveal) * uOpacity;
  float strength = clamp(uBrightness, 0.0, 2.0);
  glow *= fade * min(strength, 1.0);
  cover *= fade * min(strength, 1.0);
  glow = 1.0 - pow(1.0 - glow, vec3(max(strength, 1.0)));
  float dither = (hash(frag) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    vec3 tint = cover > 0.0001 ? glow / cover : vec3(0.0);
    cover *= smootherstep(0.0, 0.25, cover);
    float alpha = cover * 0.7;
    outColor = vec4(tint * alpha + dither, clamp(alpha + dither, 0.0, 1.0));
    return;
  }
  outColor = vec4(glow + dither, clamp(cover + dither, 0.0, 1.0));
}`,C=(e,a,u)=>Math.min(u,Math.max(a,e)),Re=e=>{let[a,u,r]=e.map(A=>A<=.04045?A/12.92:Math.pow((A+.055)/1.055,2.4)),l=Math.cbrt(.4122214708*a+.5363325363*u+.0514459929*r),m=Math.cbrt(.2119034982*a+.6806995451*u+.1073969566*r),p=Math.cbrt(.0883024619*a+.2817188376*u+.6299787005*r),d=[.2104542553*l+.793617785*m-.0040720468*p,1.9779984951*l-2.428592205*m+.4505937099*p,.0259040371*l+.7827717662*m-.808675766*p];return[d[0],Math.hypot(d[1],d[2]),Math.atan2(d[2],d[1])]},Ee=e=>{let a=e.findIndex(l=>l[1]>.02),r=a===-1?0:e[a][2];return e.map(l=>{let m=l[1]>.02?l[2]:r;for(;m-r>Math.PI;)m-=Math.PI*2;for(;m-r<-Math.PI;)m+=Math.PI*2;return r=m,[l[0],l[1],m]})},ae=(e,a,u)=>{let r=e.createShader(a);return r?(e.shaderSource(r,u),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null},Pe=e=>{let a=ae(e,e.VERTEX_SHADER,Se),u=ae(e,e.FRAGMENT_SHADER,Ae),r=e.createProgram();if(!a||!u||!r)return null;if(e.attachShader(r,a),e.attachShader(r,u),e.bindAttribLocation(r,0,"aPosition"),e.linkProgram(r),e.deleteShader(a),e.deleteShader(u),!e.getProgramParameter(r,e.LINK_STATUS))return e.deleteProgram(r),null;let l={},m=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let p=0;p<m;p++){let d=e.getActiveUniform(r,p);d&&(l[d.name.replace("[0]","")]=e.getUniformLocation(r,d.name))}return{program:r,uniforms:l}},Le=({colorStops:e=["#5227FF","#7cff67","#5227FF"],amplitude:a=1,blend:u=.5,speed:r=1,time:l,height:m=.45,scale:p=1,glow:d=.6,brightness:A=1,layers:se=1,direction:le="top",mouseInteraction:fe=!0,intro:ue=!0,opacity:me=1,lightMode:de=!1,paused:he=!1,dpr:pe,className:ve="",style:xe})=>{let Y=(0,g.useRef)(null),q=(0,g.useRef)(null),D=(0,g.useRef)(null),R=(Array.isArray(e)?e:[]).filter(Boolean).map(String).slice(0,V),W={stops:R.length>=2?R:R.length===1?[R[0],R[0]]:["#5227FF","#7cff67"],amplitude:Math.max(0,a),blend:C(u,0,1),speed:r,time:l,height:C(m,0,1),scale:Math.max(.1,p),glow:Math.max(0,d),brightness:Math.max(0,A),layers:C(Math.round(se),1,ie),flip:le==="bottom"?1:0,mouseInteraction:fe,intro:ue,opacity:C(me,0,1),lightMode:de,paused:he,dpr:pe},v=(0,g.useRef)(W);return v.current=W,(0,g.useEffect)(()=>{let w=Y.current,x=q.current,t=x?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!w||!x||!t)return;let F=Pe(t);if(!F)return;let s=F.uniforms,$=t.createBuffer(),N=t.createVertexArray();t.bindVertexArray(N),t.bindBuffer(t.ARRAY_BUFFER,$),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);let y=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),T=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,X=new Map,ge=o=>{if(X.has(o))return X.get(o);let n=[1,1,1];if(y){y.clearRect(0,0,1,1),y.fillStyle="#ffffff",y.fillStyle=o,y.fillRect(0,0,1,1);let[f,h,P]=y.getImageData(0,0,1,1).data;n=[f/255,h/255,P/255]}return X.set(o,n),n},K=new Float32Array(V*3),b={width:1,height:1},c={x:0,y:0,inside:!1},i={clock:0,px:0,py:.5,reach:0,reveal:v.current.intro&&!T?0:1},M=0,S=0,I=!0,k=()=>{let o=v.current;Ee(o.stops.map(f=>Re(ge(f)))).forEach((f,h)=>K.set(f,h*3));let n=i.reveal;t.viewport(0,0,x.width,x.height),t.useProgram(F.program),t.bindVertexArray(N),t.uniform2f(s.uResolution,x.width,x.height),t.uniform1f(s.uTime,o.time!==void 0?o.time*o.speed*.1:i.clock),t.uniform3fv(s.uStops,K),t.uniform1i(s.uStopCount,o.stops.length),t.uniform1f(s.uAmplitude,o.amplitude),t.uniform1f(s.uBlend,o.blend),t.uniform1f(s.uHeight,o.height),t.uniform1f(s.uScale,o.scale),t.uniform1f(s.uGlow,o.glow),t.uniform1f(s.uBrightness,o.brightness),t.uniform1i(s.uLayers,o.layers),t.uniform1f(s.uFlip,o.flip),t.uniform3f(s.uPointer,i.px,i.py,i.reach),t.uniform1f(s.uReveal,1-Math.pow(1-n,3)),t.uniform1f(s.uOpacity,o.opacity),t.uniform1f(s.uLightMode,o.lightMode?1:0),t.drawArrays(t.TRIANGLES,0,3)},J=o=>{if(M=0,!I||document.hidden)return;let n=v.current,f=S?C((o-S)/1e3,5e-4,.05):1/60;if(S=o,n.paused){i.reveal=1,k(),S=0;return}let h=T?0:1;i.clock+=f*n.speed*h;let P=n.mouseInteraction&&c.inside&&!T,oe=1-Math.exp(-f/.6);if(P){let we=(c.x-b.width/2)/b.height,ye=n.flip?1-c.y/b.height:c.y/b.height;i.px+=(we-i.px)*oe,i.py+=(ye-i.py)*oe}i.reach+=((P?1:0)-i.reach)*(1-Math.exp(-f/(P?.9:1.4))),!n.intro||T?i.reveal=1:i.reveal<1&&(i.reveal=Math.min(1,i.reveal+f/Me)),k(),M=requestAnimationFrame(J)},E=()=>{!M&&I&&!document.hidden&&(M=requestAnimationFrame(J))},G=()=>{let o=v.current,n=Math.max(1,w.clientWidth),f=Math.max(1,w.clientHeight),h=Math.min(o.dpr||window.devicePixelRatio||1,2);b.width=n,b.height=f,x.width=Math.max(1,Math.round(n*h)),x.height=Math.max(1,Math.round(f*h)),k(),E()},z=o=>{let n=w.getBoundingClientRect();c.x=o.clientX-n.left,c.y=o.clientY-n.top;let f=c.inside;if(c.inside=c.x>=0&&c.y>=0&&c.x<=n.width&&c.y<=n.height,c.inside&&!f){let h=v.current;i.px=(c.x-n.width/2)/Math.max(1,n.height),i.py=h.flip?1-c.y/Math.max(1,n.height):c.y/Math.max(1,n.height)}v.current.paused||E()},B=o=>{o.pointerType!=="mouse"&&(c.inside=!1)},Q=()=>{c.inside=!1},Z=()=>{S=0,E()},j=new ResizeObserver(G);j.observe(w);let ee=new IntersectionObserver(o=>{I=o.some(n=>n.isIntersecting),I&&(S=0,E())});ee.observe(w),window.addEventListener("pointermove",z,{passive:!0}),window.addEventListener("pointerdown",z,{passive:!0}),window.addEventListener("pointerup",B,{passive:!0}),window.addEventListener("pointercancel",B,{passive:!0}),document.documentElement.addEventListener("pointerleave",Q),document.addEventListener("visibilitychange",Z),G();let te=v.current.dpr;return D.current=()=>{let o=v.current;if(o.dpr!==te){te=o.dpr,G();return}M||k(),E()},()=>{cancelAnimationFrame(M),D.current=null,j.disconnect(),ee.disconnect(),window.removeEventListener("pointermove",z),window.removeEventListener("pointerdown",z),window.removeEventListener("pointerup",B),window.removeEventListener("pointercancel",B),document.documentElement.removeEventListener("pointerleave",Q),document.removeEventListener("visibilitychange",Z),t.deleteProgram(F.program),t.deleteBuffer($),t.deleteVertexArray(N),t.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,g.useEffect)(()=>{D.current?.()}),(0,U.jsx)("div",{ref:Y,className:["relative h-full w-full overflow-hidden",ve].filter(Boolean).join(" "),style:xe,children:(0,U.jsx)("canvas",{ref:q,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ce=Le;var H=L(_(),1),Ce=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],O=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],_e=Ce.map((e,a)=>({id:a+1,image:e,src:e,img:e,url:e,title:O[a],text:O[a],label:O[a],alt:O[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Fe({big:e}){return(0,H.jsx)(ne,{big:e,dark:!0,center:!1,zoom:1,drive:"move",children:(0,H.jsx)(ce,{})})}var Oe=re(Fe);export{Oe as default};
