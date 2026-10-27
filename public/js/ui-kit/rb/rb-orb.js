import{c as Y,i as Ye,j as $,l as xe,m as ye}from"./chunks/chunk-6IYH4WPJ.js";var A=Y(Ye(),1),oe=Y($(),1),Ne=1.1,N=3.2,_e=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ge=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRotation;
uniform vec2 uReach;
uniform float uNear;
uniform float uAwake;
uniform vec3 uBackground;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uScale;
uniform float uWobble;
uniform float uGlow;
uniform float uBleed;
uniform float uHighlight;
uniform float uSwirl;
uniform float uOrbit;
uniform vec2 uEcho;
uniform float uReveal;
uniform float uOpacity;
uniform float uTrail;
uniform vec2 uTilt;
out vec4 outColor;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
  return dot(vec4(31.316), n);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  float rawLen = length(uv);
  vec2 dir = rawLen > 0.0001 ? uv / rawLen : vec2(1.0, 0.0);
  float reachAmount = length(uReach);
  vec2 reachDir = reachAmount > 0.00001 ? uReach / reachAmount : vec2(1.0, 0.0);
  float facing = exp((dot(dir, reachDir) - 1.0) * 3.2);
  float len = max(rawLen - reachAmount * facing * smoothstep(0.25, 0.65, rawLen), 0.0);
  uv = dir * len;
  float ang = atan(dir.y, dir.x);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;
  float near = facing * uNear;
  float bgLuminance = dot(uBackground, vec3(0.299, 0.587, 0.114));

  float n0 = snoise3(vec3(uv * 0.65, uTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(0.8 - 0.04 * uWobble, 0.8 + 0.04 * uWobble, n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0 / uGlow, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float reach = max(uBleed, 0.04);
  float innerFade = smoothstep(r0 * (1.0 - 0.2 * reach), r0 * (1.0 - 0.05 * reach), len);
  v0 *= mix(innerFade, 1.0, bgLuminance * 0.7 * min(uBleed, 1.0));
  float body = smoothstep(0.8 - 0.2 * reach, 0.8, len);
  float cl = cos(ang + uSwirl) * 0.5 + 0.5;

  vec2 pos = vec2(cos(uOrbit), sin(uOrbit)) * r0;
  float d = distance(uv, pos);
  vec2 head = vec2(cos(uOrbit), sin(uOrbit));
  float lag = atan(head.x * dir.y - head.y * dir.x, dot(dir, head));
  float trail = uTrail > 0.0 ? smoothstep(0.0, 0.35, lag) * exp(-max(lag, 0.0) * 2.6 / uTrail) : 0.0;
  float v1 = (light2(1.5, 5.0, d) + trail * 0.6) * uHighlight;
  v1 *= light1(1.0, 50.0, d0);
  float band = v0 * smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len) * body;
  float heat = pow(clamp(band / 0.82, 0.0, 1.0), 3.0);
  float bloom = light2(1.0, 160.0 / uGlow, max(len - r0, 0.0)) * smoothstep(0.4, 0.0, len - r0) * step(r0, len);

  float v2 = smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len);
  float v3 = body;

  vec3 colBase = mix(uColor1, uColor2, cl);
  float fadeAmount = mix(1.0, 0.1, bgLuminance);

  float echoD = abs(len - r0 - uEcho.x);
  float echo = light1(1.0, 60.0, echoD) * smoothstep(0.12, 0.0, echoD) * uEcho.y;

  vec3 darkCol = mix(uColor3, colBase, v0);
  darkCol = (darkCol + v1) * v2 * v3 * (1.0 + uAwake + near * 0.35) + mix(colBase, vec3(1.0), 0.25) * heat * (0.28 + near * 0.3);
  darkCol = clamp(darkCol + colBase * (bloom * 0.1 + echo), 0.0, 1.0);

  vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
  lightCol = mix(uBackground, lightCol, clamp(v0 + echo, 0.0, 1.0));
  lightCol = mix(lightCol, colBase, clamp(v0, 0.0, 1.0) * clamp(near * 0.4 + uAwake, 0.0, 0.6));
  lightCol = clamp(mix(lightCol, vec3(1.0), clamp(v1 * 0.35, 0.0, 0.6)), 0.0, 1.0);

  vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
  float alpha = max(max(finalCol.r, finalCol.g), finalCol.b);
  return vec4(finalCol / (alpha + 1e-5), alpha);
}

vec2 toPlane(vec2 p, out float hit) {
  float cx = cos(uTilt.x);
  float sx = sin(uTilt.x);
  float cy = cos(uTilt.y);
  float sy = sin(uTilt.y);
  vec3 ex = vec3(cy, 0.0, -sy);
  vec3 ey = vec3(sy * sx, cx, cy * sx);
  vec3 normal = vec3(sy * cx, -sx, cy * cx);
  vec3 origin = vec3(0.0, 0.0, ${N.toFixed(1)});
  vec3 ray = vec3(p, -${N.toFixed(1)});
  float denom = dot(normal, ray);
  float t = -dot(normal, origin) / (abs(denom) > 0.00001 ? denom : -0.00001);
  hit = t > 0.0 ? 1.0 : 0.0;
  vec3 q = origin + ray * t;
  return vec2(dot(q, ex), dot(q, ey));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y) * 2.0;
  uv *= uScale;
  float hit = 1.0;
  if (abs(uTilt.x) + abs(uTilt.y) > 0.0001) uv = toPlane(uv, hit);

  float s = sin(uRotation);
  float c = cos(uRotation);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  vec4 col = draw(uv);
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float alpha = clamp(col.a * hit * uReveal * uOpacity + dither, 0.0, 1.0);
  outColor = vec4(col.rgb * alpha * alpha, alpha);
}`,w=(n,f,b)=>Math.min(b,Math.max(f,n)),we=(n,f,b)=>{let c=n.createShader(f);return c?(n.shaderSource(c,b),n.compileShader(c),n.getShaderParameter(c,n.COMPILE_STATUS)?c:(n.deleteShader(c),null)):null},Ve=n=>{let f=we(n,n.VERTEX_SHADER,_e),b=we(n,n.FRAGMENT_SHADER,Ge),c=n.createProgram();if(!f||!b||!c)return null;if(n.attachShader(c,f),n.attachShader(c,b),n.bindAttribLocation(c,0,"aPosition"),n.linkProgram(c),n.deleteShader(f),n.deleteShader(b),!n.getProgramParameter(c,n.LINK_STATUS))return n.deleteProgram(c),null;let _={},Q=n.getProgramParameter(c,n.ACTIVE_UNIFORMS);for(let I=0;I<Q;I++){let O=n.getActiveUniform(c,I);O&&(_[O.name]=n.getUniformLocation(c,O.name))}return{program:c,uniforms:_}},qe=({colors:n=["#9c43fe","#4cc2e9","#101499"],hue:f=0,backgroundColor:b="#000000",size:c=1,glow:_=1,bleed:Q=1,wobble:I=1,highlight:O=1,trail:Se=1,tiltX:Ce=0,tiltY:Ae=0,speed:Re=1,hoverIntensity:Ee=1,rotateOnHover:ke=!0,forceHoverState:Te=!1,followCursor:Le=!0,clickPulse:Pe=!0,intro:Be=!0,opacity:Ie=1,paused:Oe=!1,dpr:Fe,className:ze="",style:De})=>{let re=(0,A.useRef)(null),ae=(0,A.useRef)(null),Z=(0,A.useRef)(null),G=Array.isArray(n)?n:[],ie={colors:[G[0]??"#9c43fe",G[1]??G[0]??"#4cc2e9",G[2]??"#101499"].map(String),hue:f,backgroundColor:String(b),size:w(c,.1,3),glow:w(_,.1,5),bleed:w(Q,0,4),wobble:Math.max(0,I),highlight:Math.max(0,O),trail:Math.max(0,Se),tiltX:w(Ce,-70,70),tiltY:w(Ae,-70,70),speed:Re,hoverIntensity:Math.max(0,Ee),rotateOnHover:ke,forceHoverState:Te,followCursor:Le,clickPulse:Pe,intro:Be,opacity:w(Ie,0,1),paused:Oe,dpr:Fe},v=(0,A.useRef)(ie);return v.current=ie,(0,A.useEffect)(()=>{let E=re.current,M=ae.current,t=M?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!E||!M||!t)return;let V=Ve(t);if(!V)return;let i=V.uniforms,ce=t.createBuffer(),j=t.createVertexArray();t.bindVertexArray(j),t.bindBuffer(t.ARRAY_BUFFER,ce),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);let k=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),F=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,ee=new Map,le=o=>{if(ee.has(o))return ee.get(o);let r=[0,0,0];if(k){k.clearRect(0,0,1,1),k.fillStyle="#000000",k.fillStyle=o,k.fillRect(0,0,1,1);let[a,s,d,l]=k.getImageData(0,0,1,1).data;r=l?[a/255,s/255,d/255]:[0,0,0]}return ee.set(o,r),r},Xe=(o,r)=>{if(!r)return o;let a=r*Math.PI/180,s=Math.cos(a),d=Math.sin(a),[l,u,m]=o,p=.299*l+.587*u+.114*m,S=.596*l-.274*u-.322*m,R=.211*l-.523*u+.312*m,x=S*s-R*d,g=S*d+R*s;return[p+.956*x+.621*g,p-.272*x-.647*g,p-1.106*x+1.703*g]},T={width:1,height:1},h={x:0,y:0,inside:!1},e={time:0,swirl:0,orbit:0,echo:1,rotation:0,hover:0,near:0,reachX:0,reachY:0,reachSpeedX:0,reachSpeedY:0,pulse:0,pulseSpeed:0,kick:v.current.intro&&!F?2.5:0,reveal:v.current.intro&&!F?0:1},L=0,P=0,q=!0,se=(o,r)=>{let a=v.current,s=Math.min(T.width,T.height),d=1/(a.size*(1+e.pulse)),l=(o-T.width/2)/s*2*d,u=(T.height/2-r)/s*2*d;if(a.tiltX||a.tiltY){let S=-a.tiltX*Math.PI/180,R=a.tiltY*Math.PI/180,[x,g,z,D]=[Math.cos(S),Math.sin(S),Math.cos(R),Math.sin(R)],C=[D*x,-g,z*x],y=[l,u,-N],K=C[0]*y[0]+C[1]*y[1]+C[2]*y[2],W=-(C[2]*N)/(Math.abs(K)>1e-5?K:-1e-5);if(W<=0)return[99,99];let X=[y[0]*W,y[1]*W,N+y[2]*W];l=X[0]*z-X[2]*D,u=X[0]*D*g+X[1]*x+X[2]*z*g}let m=Math.sin(e.rotation),p=Math.cos(e.rotation);return[p*l-m*u,m*l+p*u]},H=()=>{let o=v.current,[r,a,s]=o.colors.map(m=>Xe(le(m),o.hue)),d=e.reveal,l=d-1,u=1+2.2*l*l*l+1.2*l*l;t.viewport(0,0,M.width,M.height),t.useProgram(V.program),t.bindVertexArray(j),t.uniform2f(i.uResolution,M.width,M.height),t.uniform1f(i.uTime,e.time),t.uniform2f(i.uReach,e.reachX,e.reachY),t.uniform1f(i.uNear,e.near),t.uniform1f(i.uAwake,e.hover*o.hoverIntensity*.18),t.uniform1f(i.uRotation,e.rotation),t.uniform3fv(i.uBackground,le(o.backgroundColor)),t.uniform3fv(i.uColor1,r),t.uniform3fv(i.uColor2,a),t.uniform3fv(i.uColor3,s),t.uniform1f(i.uScale,1/(o.size*(1+e.pulse)*(.62+.38*u))),t.uniform1f(i.uWobble,o.wobble),t.uniform1f(i.uGlow,o.glow),t.uniform1f(i.uBleed,o.bleed),t.uniform1f(i.uHighlight,o.highlight),t.uniform2f(i.uEcho,e.echo*.55,e.echo<1?(1-e.echo)*(1-e.echo):0),t.uniform1f(i.uSwirl,e.swirl),t.uniform1f(i.uOrbit,e.orbit),t.uniform1f(i.uReveal,Math.min(1,d/.55)*Math.min(1,d/.55)*(3-2*Math.min(1,d/.55))),t.uniform1f(i.uOpacity,o.opacity),t.uniform1f(i.uTrail,o.trail),t.uniform2f(i.uTilt,-o.tiltX*Math.PI/180,o.tiltY*Math.PI/180),t.drawArrays(t.TRIANGLES,0,3)},ue=o=>{if(L=0,!q||document.hidden)return;let r=v.current,a=P?w((o-P)/1e3,5e-4,.05):1/60;if(P=o,r.paused){e.reveal=1,H(),P=0;return}let s=F?0:1,[d,l]=se(h.x,h.y),u=Math.hypot(d,l),m=h.inside&&s?w((1.45-u)/.4,0,1):0,p=m*m*(3-2*m),S=p*w((u-.15)/.45,0,1),R=p>.5,x=r.forceHoverState?1:p;e.hover+=(x-e.hover)*(1-Math.exp(-a/.16));let g=.075*r.hoverIntensity*S,z=u>1e-4?d/u*g:0,D=u>1e-4?l/u*g:0;e.reachSpeedX+=(70*(z-e.reachX)-7*e.reachSpeedX)*a,e.reachSpeedY+=(70*(D-e.reachY)-7*e.reachSpeedY)*a,e.reachX+=e.reachSpeedX*a,e.reachY+=e.reachSpeedY*a,e.near+=(S*r.hoverIntensity-e.near)*(1-Math.exp(-a/.12));let C=a*r.speed*s;e.time+=C,e.swirl+=C*2*(1+e.kick),e.echo=Math.min(1,e.echo+a/1.2),r.rotateOnHover&&(e.rotation+=a*.3*e.hover*s);let y=Math.atan2(l,d);if(r.followCursor&&R&&s){let K=Math.atan2(Math.sin(y-e.orbit),Math.cos(y-e.orbit));e.orbit+=K*(1-Math.exp(-a*6))}else e.orbit-=C;e.orbit=Math.atan2(Math.sin(e.orbit),Math.cos(e.orbit)),e.pulseSpeed+=(-170*e.pulse-11*e.pulseSpeed)*a,e.pulse+=e.pulseSpeed*a,e.kick*=Math.exp(-a*2.5),!r.intro||F?e.reveal=1:e.reveal<1&&(e.reveal=Math.min(1,e.reveal+a/Ne)),H(),L=requestAnimationFrame(ue)},B=()=>{!L&&q&&!document.hidden&&(L=requestAnimationFrame(ue))},te=()=>{let o=v.current,r=Math.max(1,E.clientWidth),a=Math.max(1,E.clientHeight),s=Math.min(o.dpr||window.devicePixelRatio||1,2);T.width=r,T.height=a,M.width=Math.max(1,Math.round(r*s)),M.height=Math.max(1,Math.round(a*s)),H(),B()},fe=o=>{let r=E.getBoundingClientRect();h.x=o.clientX-r.left,h.y=o.clientY-r.top,h.inside=h.x>=0&&h.y>=0&&h.x<=r.width&&h.y<=r.height},de=o=>{fe(o),v.current.paused||B()},he=o=>{let r=v.current;if(fe(o),!h.inside||!r.clickPulse||r.paused||F)return;let[a,s]=se(h.x,h.y);Math.hypot(a,s)>1||(e.pulseSpeed+=.9,e.kick=2.2,e.echo=0,B())},U=o=>{o.pointerType!=="mouse"&&(h.inside=!1)},me=()=>{h.inside=!1},ve=()=>{P=0,B()},pe=new ResizeObserver(te);pe.observe(E);let ge=new IntersectionObserver(o=>{q=o.some(r=>r.isIntersecting),q&&(P=0,B())});ge.observe(E),window.addEventListener("pointermove",de,{passive:!0}),window.addEventListener("pointerdown",he,{passive:!0}),window.addEventListener("pointerup",U,{passive:!0}),window.addEventListener("pointercancel",U,{passive:!0}),document.documentElement.addEventListener("pointerleave",me),document.addEventListener("visibilitychange",ve),te();let be=v.current.dpr;return Z.current=()=>{let o=v.current;if(o.dpr!==be){be=o.dpr,te();return}L||H(),B()},()=>{cancelAnimationFrame(L),Z.current=null,pe.disconnect(),ge.disconnect(),window.removeEventListener("pointermove",de),window.removeEventListener("pointerdown",he),window.removeEventListener("pointerup",U),window.removeEventListener("pointercancel",U),document.documentElement.removeEventListener("pointerleave",me),document.removeEventListener("visibilitychange",ve),t.deleteProgram(V.program),t.deleteBuffer(ce),t.deleteVertexArray(j),t.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,A.useEffect)(()=>{Z.current?.()}),(0,oe.jsx)("div",{ref:re,className:["relative z-0 h-full w-full overflow-hidden",ze].filter(Boolean).join(" "),style:De,children:(0,oe.jsx)("canvas",{ref:ae,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Me=qe;var ne=Y($(),1),He=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],J=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ze=He.map((n,f)=>({id:f+1,image:n,src:n,img:n,url:n,title:J[f],text:J[f],label:J[f],alt:J[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ue({big:n}){return(0,ne.jsx)(ye,{big:n,dark:!0,center:!1,zoom:1,drive:"move",children:(0,ne.jsx)(Me,{})})}var je=xe(Ue);export{je as default};
