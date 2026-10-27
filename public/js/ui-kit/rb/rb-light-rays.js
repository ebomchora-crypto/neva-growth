import{c as N,i as Qe,j as H,l as Ae,m as Le}from"./chunks/chunk-6IYH4WPJ.js";var m=N(Qe(),1),ee=N(H(),1),Ze=24e5,Y=4,Ee={"top-left":{anchor:[0,-.2],dir:[0,1]},"top-center":{anchor:[.5,-.2],dir:[0,1]},"top-right":{anchor:[1,-.2],dir:[0,1]},left:{anchor:[-.2,.5],dir:[1,0]},right:{anchor:[1.2,.5],dir:[-1,0]},"bottom-left":{anchor:[0,1.2],dir:[0,-1]},"bottom-center":{anchor:[.5,1.2],dir:[0,-1]},"bottom-right":{anchor:[1,1.2],dir:[0,-1]}},je=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,et=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uPulsating;
uniform float uNoise;
uniform float uDistortion;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec4 uShadow;
uniform vec4 uPulses[${Y}];
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle + uDistortion * sin(uTime * 2.0 + distance * 0.02) * 0.2;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float pulseA = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 4.5) : 1.0;
  float pulseB = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 3.3) : 1.0;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) * pulseA + 0.4 * shape(strengthB, widthB) * pulseB);

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  if (uShadow.z > 0.0) {
    vec2 toCursor = uShadow.xy - uSource;
    float cursorDistance = length(toCursor);
    float along = dot(delta, toCursor) / max(cursorDistance * cursorDistance, 1e-4);
    float side = abs(delta.x * toCursor.y - delta.y * toCursor.x) / max(cursorDistance, 1e-4);
    float trail = max(along - 1.0, 0.0);
    float width = uShadow.w * along + 0.22 * trail * cursorDistance;
    float behind = smoothstep(0.97, 1.25, along) * exp(-trail * 1.1);
    float shade = (1.0 - smoothstep(width * 0.3, width * 1.6, side)) * behind;
    rayLight *= 1.0 - uShadow.z * 0.62 * shade;
  }

  float boost = 0.0;
  for (int i = 0; i < ${Y}; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (depth - wave.x) / wave.y;
    boost += wave.z * exp(-x * x);
  }
  float light = (rayLight * (1.0 + boost) + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 color = hue * light;
    float energy = max(color.r, max(color.g, color.b));
    vec3 tone = clamp(1.0 - (1.0 - hue / max(max(hue.r, max(hue.g, hue.b)), 1e-4)) * 1.8, 0.0, 1.0);
    float warm = clamp((min(tone.r, tone.g) - tone.b) * 2.0, 0.0, 1.0);
    vec3 ink = tone * (mix(0.66, 0.94, warm) - 0.1 * smoothstep(0.4, 1.2, energy));
    float density = clamp(0.82 * (1.0 - exp(-1.5 * energy * energy)) * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}`,f=(t,n,s)=>Math.min(s,Math.max(n,t)),tt=t=>{let n=String(t||"").trim(),s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(n);if(s){let v=s[1].length===3?s[1].replace(/./g,p=>p+p):s[1];return[0,2,4].map(p=>parseInt(v.slice(p,p+2),16)/255)}let r=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(n);return r?[r[1],r[2],r[3]].map(v=>f(parseFloat(v)/255,0,1)):null},Re=(t,n,s)=>{let r=t.createShader(n);return r?(t.shaderSource(r,s),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(console.error(t.getShaderInfoLog(r)),t.deleteShader(r),null)):null},ot=t=>{let n=Re(t,t.VERTEX_SHADER,je),s=Re(t,t.FRAGMENT_SHADER,et),r=n&&s?t.createProgram():null;if(!n||!s||!r)return n&&t.deleteShader(n),s&&t.deleteShader(s),null;if(t.attachShader(r,n),t.attachShader(r,s),t.linkProgram(r),t.deleteShader(n),t.deleteShader(s),!t.getProgramParameter(r,t.LINK_STATUS))return console.error(t.getProgramInfoLog(r)),t.deleteProgram(r),null;let v={},p=t.getProgramParameter(r,t.ACTIVE_UNIFORMS);for(let P=0;P<p;P++){let C=t.getActiveUniform(r,P);C&&(v[C.name.replace(/\[0\]$/,"")]=t.getUniformLocation(r,C.name))}return{program:r,uniforms:v}},j=t=>{let n=f(t,0,1);return n*n*n*(n*(n*6-15)+10)},nt=({raysOrigin:t="top-center",raysColor:n="#ffffff",raysSpeed:s=1,lightSpread:r=.5,rayLength:v=3,rayDensity:p=1,tilt:P=0,raySharpness:C=.35,glow:Ce=.6,haze:De=.25,atmosphere:Ie=1,intensity:Te=1,pulsating:Fe=!1,fadeDistance:Ne=1,saturation:Be=1,followMouse:ze=!0,mouseInfluence:_e=.1,cursorShadow:Oe=!0,clickPulse:Ge=!0,noiseAmount:ke=0,distortion:Ve=0,intro:Xe=!0,lightMode:Ue=!1,opacity:He=1,maxDevicePixelRatio:Ye=2,className:$e="",style:qe})=>{let oe=(0,m.useRef)(null),ne=(0,m.useRef)(null),q=(0,m.useRef)(null),[re,Ke]=(0,m.useState)(0),ie={origin:Ee[t]||Ee["top-center"],color:tt(n)||[1,1,1],speed:Math.max(0,s),spread:Math.max(.001,r),length:Math.max(.01,v),density:f(p,.1,6),tilt:f(P,-90,90)*Math.PI/180,sharpness:f(C,0,1),glow:Math.max(0,Ce),haze:f(De,0,1),atmosphere:f(Ie,0,1),intensity:Math.max(0,Te),pulsating:Fe,fade:Math.max(.01,Ne),saturation:Math.max(0,Be),follow:ze,influence:f(_e,0,1),cursorShadow:Oe,clickPulse:Ge,noise:f(ke,0,1),distortion:Ve,intro:Xe,light:Ue,opacity:f(He,0,1),maxRatio:f(Ye,.5,3)},D=(0,m.useRef)(ie);return D.current=ie,(0,m.useEffect)(()=>{q.current?.()}),(0,m.useEffect)(()=>{let I=oe.current,u=ne.current;if(!I||!u)return;let o=u.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),B=o?ot(o):null;if(!o||!B)return;let z=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ae=o.createVertexArray(),A={width:1,height:1,ratio:1},c={x:.5,y:.5,inside:!1,seen:!1},x={x:.5,y:.5},l={x:.5,y:.5,presence:0},g=[],T=new Float32Array(Y*4),se=0,L=D.current.intro&&!z&&re===0?0:1,y=0,_=0,K=!0,W=document.visibilityState!=="hidden",J=!1,Q=()=>{let i=D.current,e=I.getBoundingClientRect(),h=Math.max(1,e.width),E=Math.max(1,e.height),G=i.density*(.35+.65*i.sharpness),k=Math.max(f(.35+.3*G,.5,2),i.noise>0?1:0),F=Math.min(window.devicePixelRatio||1,i.maxRatio,k,Math.sqrt(Ze/(h*E))),b=Math.max(1,Math.round(h*F)),S=Math.max(1,Math.round(E*F));(u.width!==b||u.height!==S)&&(u.width=b,u.height=S),A.width=h,A.height=E,A.ratio=b/h},ce=i=>{if(y=0,J)return;let e=D.current,h=f((i-_)/1e3||0,0,.05);_=Math.max(_,i),se+=h*e.speed*(z?.35:1),L<1&&(L=Math.min(1,L+h/1.8));let E=1-Math.exp(-h/.2),G=e.follow&&c.seen?c.x:.5,k=e.follow&&c.seen?c.y:.5;x.x+=(G-x.x)*E,x.y+=(k-x.y)*E;let F=1-Math.exp(-h/.08);l.x+=(c.x-l.x)*F,l.y+=(c.y-l.y)*F;let b=c.inside&&e.cursorShadow&&!z;l.presence+=((b?1:0)-l.presence)*(1-Math.exp(-h/(b?.25:.5)));for(let d=g.length-1;d>=0;d--)g[d].age+=h,g[d].age>=2&&g.splice(d,1);T.fill(0),g.forEach((d,R)=>{let M=d.age;T[R*4]=.05+M*1.05,T[R*4+1]=.14+M*.14,T[R*4+2]=.9*j(M/.15)*(1-j(M/2))});let S=A.width,V=A.height,ve=e.origin.anchor[0]*S,xe=e.origin.anchor[1]*V,we=Math.cos(e.tilt),ye=Math.sin(e.tilt),X=e.origin.dir[0]*we-e.origin.dir[1]*ye,U=e.origin.dir[0]*ye+e.origin.dir[1]*we;if(e.follow&&e.influence>0){let d=x.x*S-ve,R=x.y*V-xe,M=Math.hypot(d,R)||1,be=X+(d/M-X)*e.influence,Se=U+(R/M-U)*e.influence,Me=Math.hypot(be,Se)||1;X=be/Me,U=Se/Me}let We=1-Math.pow(1-L,3);o.viewport(0,0,u.width,u.height),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.useProgram(B.program),o.bindVertexArray(ae);let a=B.uniforms;o.uniform2f(a.uResolution,u.width,u.height),o.uniform1f(a.uScale,A.ratio),o.uniform1f(a.uTime,se),o.uniform2f(a.uSource,ve,xe),o.uniform2f(a.uAim,X,U),o.uniform1f(a.uReach,Math.max(S,V)),o.uniform3f(a.uColor,e.color[0],e.color[1],e.color[2]),o.uniform1f(a.uSpread,e.spread),o.uniform1f(a.uLength,e.length),o.uniform1f(a.uFade,e.fade),o.uniform1f(a.uSaturation,e.saturation),o.uniform1f(a.uPulsating,e.pulsating?1:0),o.uniform1f(a.uNoise,e.noise),o.uniform1f(a.uDistortion,e.distortion),o.uniform1f(a.uDensity,e.density),o.uniform1f(a.uSharpness,e.sharpness),o.uniform1f(a.uGlow,e.glow),o.uniform1f(a.uHaze,e.haze),o.uniform1f(a.uAtmosphere,e.atmosphere),o.uniform1f(a.uIntensity,e.intensity),o.uniform4f(a.uShadow,l.x*S,l.y*V,l.presence,16),o.uniform4fv(a.uPulses,T),o.uniform2f(a.uIntro,We*2.6,j(L/.5)),o.uniform1f(a.uLight,e.light?1:0),o.uniform1f(a.uOpacity,e.opacity),o.drawArrays(o.TRIANGLES,0,3);let Je=Math.abs(x.x-G)>1e-4||Math.abs(x.y-k)>1e-4||l.presence>.001&&Math.abs(l.x-c.x)+Math.abs(l.y-c.y)>1e-4||Math.abs((b?1:0)-l.presence)>.001||g.length>0;(e.speed>0||L<1||Je)&&K&&W&&(y=requestAnimationFrame(ce))},w=()=>{y||J||!K||!W||(_=performance.now(),y=requestAnimationFrame(ce))};q.current=()=>{Q(),w()};let le=i=>{let e=I.getBoundingClientRect();return{x:(i.clientX-e.left)/Math.max(1,e.width),y:(i.clientY-e.top)/Math.max(1,e.height),inside:i.clientX>=e.left&&i.clientX<=e.right&&i.clientY>=e.top&&i.clientY<=e.bottom}},ue=i=>{let e=le(i);!c.inside&&e.inside&&(l.x=e.x,l.y=e.y),c.x=e.x,c.y=e.y,c.inside=e.inside,c.seen=!0,w()},fe=i=>{let e=D.current;!le(i).inside||!e.clickPulse||z||(g.push({age:0}),g.length>Y&&g.shift(),w())},Z=()=>{c.inside=!1,w()},O=i=>{i.pointerType!=="mouse"&&Z()};window.addEventListener("pointermove",ue,{passive:!0}),window.addEventListener("pointerdown",fe,{passive:!0}),window.addEventListener("pointerup",O,{passive:!0}),window.addEventListener("pointercancel",O,{passive:!0}),document.documentElement.addEventListener("pointerleave",Z);let he=i=>{i.preventDefault(),J=!0,cancelAnimationFrame(y),y=0},de=()=>Ke(i=>i+1);u.addEventListener("webglcontextlost",he),u.addEventListener("webglcontextrestored",de);let me=new ResizeObserver(()=>{Q(),w()});me.observe(I);let pe=new IntersectionObserver(i=>{K=i.some(e=>e.isIntersecting),w()});pe.observe(I);let ge=()=>{W=document.visibilityState!=="hidden",w()};return document.addEventListener("visibilitychange",ge),Q(),w(),()=>{cancelAnimationFrame(y),q.current=null,me.disconnect(),pe.disconnect(),window.removeEventListener("pointermove",ue),window.removeEventListener("pointerdown",fe),window.removeEventListener("pointerup",O),window.removeEventListener("pointercancel",O),document.documentElement.removeEventListener("pointerleave",Z),document.removeEventListener("visibilitychange",ge),u.removeEventListener("webglcontextlost",he),u.removeEventListener("webglcontextrestored",de),o.isContextLost()||(o.deleteVertexArray(ae),o.deleteProgram(B.program))}},[re]),(0,ee.jsx)("div",{ref:oe,className:`pointer-events-none relative h-full w-full overflow-hidden ${$e}`.trim(),style:qe,children:(0,ee.jsx)("canvas",{ref:ne,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Pe=nt;var te=N(H(),1),rt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],$=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ht=rt.map((t,n)=>({id:n+1,image:t,src:t,img:t,url:t,title:$[n],text:$[n],label:$[n],alt:$[n],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][n],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function it({big:t}){return(0,te.jsx)(Le,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,te.jsx)(Pe,{})})}var dt=Ae(it);export{dt as default};
