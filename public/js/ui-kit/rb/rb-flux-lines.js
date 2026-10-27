import{c as C,i as Te,j as O,l as se,m as le}from"./chunks/chunk-6IYH4WPJ.js";var g=C(Te(),1),U=C(O(),1),G=8,Pe=1.8,fe={up:[0,1],down:[0,-1],left:[-1,0],right:[1,0]},Oe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ie=`
float hash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smin(float a, float b, float k) {
  float r = exp2(-a / k) + exp2(-b / k);
  return -k * log2(r);
}

float sinlerp(float a, float b, float w) {
  return mix(a, b, (sin(w * 3.14159265 - 3.14159265 / 2.0) + 1.0) / 2.0);
}

float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s);
  vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed));
  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));
  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));
  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s);
  float tx = sinlerp(g4, g3, relp.x / s);
  return sinlerp(bx, tx, relp.y / s);
}

float dbn(vec2 p, float s, float seed) {
  float o = s / 2.0;
  float n0 = vn(p, s, seed);
  float n1 = vn(p + vec2(o, o), s, seed + 0.1);
  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);
  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);
  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);
  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;
}
`,Be=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uTurbulence;
uniform float uFluidity;
uniform float uRimWidth;
uniform float uSharpness;
uniform float uShimmer;
uniform float uGlow;
uniform float uLine;
uniform float uMaxHalf;
uniform vec3 uColors[${G}];
uniform int uColorCount;
uniform vec4 uMagnet;
uniform vec4 uSwirl;
uniform float uReveal;
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBackground;
uniform float uOpacity;
out vec4 outColor;
${Ie}

vec3 palette(float h) {
  float x = clamp(h, 0.0, 1.0) * float(uColorCount - 1);
  int i = int(floor(x));
  int j = min(i + 1, uColorCount - 1);
  return mix(uColors[i], uColors[j], smoothstep(0.0, 1.0, x - float(i)));
}

void main() {
  float ref = 700.0 / max(uScale, 0.05);
  vec2 frag = gl_FragCoord.xy;
  vec2 toMagnet = (frag - uMagnet.xy) / uResolution.y;
  float pull = uMagnet.z * exp(-dot(toMagnet, toMagnet) / (uMagnet.w * uMagnet.w));
  if (pull > 0.001) {
    float angle = pull * 0.55;
    float c = cos(angle);
    float s = sin(angle);
    frag = uMagnet.xy + mat2(c, s, -s, c) * (frag - uMagnet.xy);
  }
  if (uSwirl.w > 0.0) {
    vec2 d = frag - uSwirl.xy;
    float reach = uSwirl.z;
    float angle = uSwirl.w * exp(-dot(d, d) / (reach * reach));
    float c = cos(angle);
    float s = sin(angle);
    frag = uSwirl.xy + mat2(c, s, -s, c) * d;
  }
  vec2 p = frag / uResolution.y * ref;

  float spd = 200.0 * uSpeed;
  float t = uTime;
  vec2 dir = uFlow;
  vec2 perp = vec2(-dir.y, dir.x);
  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;
  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;
  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);
  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);
  float field = smin(peaks, peaks2, max(uFluidity, 0.001));

  float slope = length(vec2(dFdx(field), dFdy(field)));
  float gap = abs(field - 0.4);
  float pixels = gap / max(slope, 1e-6);
  float halfBand = max(uRimWidth, 0.001) * 0.5;
  float across = max(gap / halfBand, pixels / uMaxHalf);
  float band = 5.0 * uRimWidth * (1.0 - across);
  float reveal = smoothstep(0.2, 0.85, pull);
  float shimmer = vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer * (1.0 - reveal * 0.75);
  float lit = clamp(band - shimmer, 0.0, 1.0);
  float glow = pow(lit, uSharpness) * uGlow * (1.0 + reveal * 0.25);
  float core = uLine > 0.0 ? smoothstep(uLine + 0.75, uLine - 0.75, pixels) * max(smoothstep(0.08, 0.6, glow), reveal) : 0.0;
  float shine = clamp(glow, 0.0, 1.0);
  float energy = max(shine * shine, core * 0.85) * uReveal;

  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 tint = palette(h);

  if (uLight > 0.5) {
    float chroma = max(tint.r, max(tint.g, tint.b)) - min(tint.r, min(tint.g, tint.b));
    vec3 ink = mix(vec3(0.07, 0.07, 0.08), tint * 0.55, clamp(chroma * 1.6, 0.0, 1.0));
    float cover = energy * uOpacity;
    outColor = uOpaque > 0.5 ? vec4(mix(uBackground, ink, cover), 1.0) : vec4(ink * cover, cover);
    return;
  }

  vec3 light = tint * energy * uOpacity;
  outColor = uOpaque > 0.5 ? vec4(uBackground + light, 1.0) : vec4(light, max(light.r, max(light.g, light.b)));
}`,ce=(o,l,m)=>Math.min(m,Math.max(l,o)),ue=(o,l,m)=>{let a=o.createShader(l);return a?(o.shaderSource(a,m),o.compileShader(a),o.getShaderParameter(a,o.COMPILE_STATUS)?a:(o.deleteShader(a),null)):null},De=o=>{let l=ue(o,o.VERTEX_SHADER,Oe),m=ue(o,o.FRAGMENT_SHADER,Be),a=o.createProgram();if(!l||!m||!a)return null;if(o.attachShader(a,l),o.attachShader(a,m),o.bindAttribLocation(a,0,"aPosition"),o.linkProgram(a),o.deleteShader(l),o.deleteShader(m),!o.getProgramParameter(a,o.LINK_STATUS))return o.deleteProgram(a),null;let k={},B=o.getProgramParameter(a,o.ACTIVE_UNIFORMS);for(let A=0;A<B;A++){let E=o.getActiveUniform(a,A);E&&(k[E.name.replace("[0]","")]=o.getUniformLocation(a,E.name))}return{program:a,uniforms:k}},_e=({colors:o=["#ffffff","#ffffff","#ffffff"],speed:l=.5,scale:m=1.6,turbulence:a=1,fluidity:k=.1,rimWidth:B=.2,sharpness:A=2.5,shimmer:E=1.5,glow:de=2,lineWidth:pe=1,flowDirection:he="down",opacity:ve=1,mouseInteraction:ge=!0,mouseStrength:xe=1,mouseRadius:we=.35,mouseDampening:be=.15,clickSwirl:ye=!0,intro:Me=!0,lightMode:Se=!1,transparent:Re=!0,backgroundColor:Ae,paused:Ee=!1,dpr:Le,mixBlendMode:H,className:Ce="",style:X,...ke})=>{let Y=(0,g.useRef)(null),$=(0,g.useRef)(null),D=(0,g.useRef)(null),j={colors:Array.isArray(o)&&o.length?o.slice(0,G):["#ffffff"],speed:l,scale:Math.max(.05,m),turbulence:a,fluidity:Math.max(.001,k),rimWidth:Math.max(.001,B),sharpness:Math.max(.1,A),shimmer:Math.max(0,E),glow:Math.max(0,de),lineWidth:Math.max(0,pe),flow:fe[he]??fe.down,opacity:ce(ve,0,1),mouseInteraction:ge,mouseStrength:Math.max(0,xe),mouseRadius:Math.max(.01,we),mouseDampening:Math.max(0,be),clickSwirl:ye,intro:Me,lightMode:Se,transparent:Re,backgroundColor:Ae,paused:Ee,dpr:Le},p=(0,g.useRef)(j);return p.current=j,(0,g.useEffect)(()=>{let x=Y.current,u=$.current,e=u?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!x||!u||!e)return;let F=De(e);if(!F)return;let r=F.uniforms,K=e.createBuffer(),_=e.createVertexArray();e.bindVertexArray(_),e.bindBuffer(e.ARRAY_BUFFER,K),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let w=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),W=new Map,J=(t,n)=>{if(!t)return n;let i=String(t);if(W.has(i))return W.get(i);let s=n;if(w){w.clearRect(0,0,1,1),w.fillStyle="#000000",w.fillStyle=i,w.fillRect(0,0,1,1);let[d,R,v]=w.getImageData(0,0,1,1).data;s=[d/255,R/255,v/255]}return W.set(i,s),s},Q=new Float32Array(G*3),L=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,f={x:0,y:0,inside:!1},c={x:0,y:0,active:0},h={x:0,y:0,age:10},Z=0,b=p.current.intro&&!L?0:1,y=0,M=0,T=!0,N=()=>{let t=p.current,n=u.width/Math.max(1,x.clientWidth);t.colors.forEach((R,v)=>Q.set(J(R,[1,1,1]),v*3));let i=Math.min(1,b);e.viewport(0,0,u.width,u.height),e.useProgram(F.program),e.bindVertexArray(_),e.uniform2f(r.uResolution,u.width,u.height),e.uniform1f(r.uTime,Z),e.uniform2f(r.uFlow,t.flow[0],t.flow[1]),e.uniform1f(r.uSpeed,t.speed),e.uniform1f(r.uScale,t.scale),e.uniform1f(r.uTurbulence,t.turbulence),e.uniform1f(r.uFluidity,t.fluidity),e.uniform1f(r.uRimWidth,t.rimWidth),e.uniform1f(r.uSharpness,t.sharpness),e.uniform1f(r.uShimmer,t.shimmer),e.uniform1f(r.uGlow,t.glow),e.uniform1f(r.uLine,t.lineWidth*n*.5),e.uniform1f(r.uMaxHalf,28*n),e.uniform3fv(r.uColors,Q),e.uniform1i(r.uColorCount,t.colors.length),e.uniform4f(r.uMagnet,c.x,c.y,c.active*t.mouseStrength,t.mouseRadius);let s=h.age,d=1.9*Math.min(1,s/.23)*Math.exp(-Math.max(0,s-.23)*1.1);e.uniform4f(r.uSwirl,h.x,h.y,u.height*.22*(1+s*.5),s<6?d:0),e.uniform1f(r.uReveal,i*i*(3-2*i)),e.uniform1f(r.uLight,t.lightMode?1:0),e.uniform1f(r.uOpaque,t.transparent?0:1),e.uniform3fv(r.uBackground,J(t.backgroundColor,t.lightMode?[1,1,1]:[.0706,.0588,.0902])),e.uniform1f(r.uOpacity,t.opacity),e.drawArrays(e.TRIANGLES,0,3)},ee=t=>{if(y=0,!T||document.hidden)return;let n=p.current,i=M?ce((t-M)/1e3,5e-4,.05):1/60;M=t;let s=n.paused||L?0:1;Z+=i*s,h.age+=i,n.intro&&!L&&b<1?b=Math.min(1,b+i/Pe):(!n.intro||L)&&(b=1);let d=n.mouseInteraction&&f.inside,R=n.mouseDampening>0?1-Math.exp(-i/n.mouseDampening):1;d&&(c.x+=(f.x-c.x)*R,c.y+=(f.y-c.y)*R);let v=d?1:0;c.active+=(v-c.active)*(1-Math.exp(-i/.3)),Math.abs(v-c.active)<.001&&(c.active=v),N(),s>0||c.active!==v||b<1||h.age<6?y=requestAnimationFrame(ee):M=0},S=()=>{!y&&T&&!document.hidden&&(y=requestAnimationFrame(ee))},V=()=>{let t=p.current,n=Math.max(1,x.clientWidth),i=Math.max(1,x.clientHeight),s=Math.min(t.dpr||window.devicePixelRatio||1,2);u.width=Math.max(1,Math.round(n*s)),u.height=Math.max(1,Math.round(i*s)),N(),S()},Fe=t=>{let n=x.getBoundingClientRect(),i=t.clientX-n.left,s=t.clientY-n.top,d=u.width/Math.max(1,n.width);f.inside=i>=0&&s>=0&&i<=n.width&&s<=n.height,f.x=i*d,f.y=(n.height-s)*d},z=t=>{let n=f.inside;Fe(t),f.inside&&!n&&c.active<.05&&(c.x=f.x,c.y=f.y),S()},te=t=>{z(t),!(!f.inside||!p.current.clickSwirl||L)&&(h.x=f.x,h.y=f.y,h.age=0,S())},P=t=>{t.pointerType!=="mouse"&&(f.inside=!1)},oe=()=>{f.inside=!1},ne=()=>{M=0,S()},re=new ResizeObserver(V);re.observe(x);let ae=new IntersectionObserver(t=>{T=t.some(n=>n.isIntersecting),T&&(M=0,S())});ae.observe(x),window.addEventListener("pointermove",z,{passive:!0}),window.addEventListener("pointerdown",te,{passive:!0}),window.addEventListener("pointerup",P,{passive:!0}),window.addEventListener("pointercancel",P,{passive:!0}),document.documentElement.addEventListener("pointerleave",oe),document.addEventListener("visibilitychange",ne),V();let ie=p.current.dpr;return D.current=()=>{let t=p.current;if(t.dpr!==ie){ie=t.dpr,V();return}y||N(),S()},()=>{cancelAnimationFrame(y),D.current=null,re.disconnect(),ae.disconnect(),window.removeEventListener("pointermove",z),window.removeEventListener("pointerdown",te),window.removeEventListener("pointerup",P),window.removeEventListener("pointercancel",P),document.documentElement.removeEventListener("pointerleave",oe),document.removeEventListener("visibilitychange",ne),e.deleteProgram(F.program),e.deleteBuffer(K),e.deleteVertexArray(_),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,g.useEffect)(()=>{D.current?.()}),(0,U.jsx)("div",{ref:Y,className:["relative h-full w-full overflow-hidden",Ce].filter(Boolean).join(" "),style:H?{...X,mixBlendMode:H}:X,...ke,children:(0,U.jsx)("canvas",{ref:$,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},me=_e;var q=C(O(),1),We=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],I=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Xe=We.map((o,l)=>({id:l+1,image:o,src:o,img:o,url:o,title:I[l],text:I[l],label:I[l],alt:I[l],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][l],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ne({big:o}){return(0,q.jsx)(le,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,q.jsx)(me,{})})}var Ye=se(Ne);export{Ye as default};
