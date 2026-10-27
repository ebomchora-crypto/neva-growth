import{c as G,i as Ze,j as $,l as Ae,m as Fe}from"./chunks/chunk-6IYH4WPJ.js";var S=G(Ze(),1),ce=G($(),1),_e=8,K=24,re=4,De=1.3,et=.06,Le=2.6,tt=1.6,Ie=["#120f17","#2a0f0a","#9a3412","#f97316","#fed7aa"],ot={linear:0,radial:1},ie=.2,nt=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,rt=`#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uTime;
uniform vec3 uRamp[8];
uniform int uCount;
uniform int uType;
uniform vec2 uDir;
uniform float uExtent;
uniform float uBands;
uniform float uSoftness;
uniform float uFlow;
uniform float uScale;
uniform float uSilk;
uniform vec4 uStir[24];
uniform float uStirWeight[24];
uniform vec4 uTwirl[4];
uniform vec2 uSeed;
uniform float uContrast;
uniform float uSaturation;
uniform float uSettle;
uniform float uReveal;
in vec2 vUv;
out vec4 outColor;

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec2 drift(vec2 p, float t) {
  vec2 w1 = vec2(
    noise(p * 0.85 + vec2(t * 0.11, t * 0.07)),
    noise(p * 0.85 + vec2(4.1, 1.7) - vec2(t * 0.08, t * 0.12))
  );
  vec2 w2 = vec2(
    noise(p * 1.55 + w1 * 1.8 + vec2(1.3, 7.1) + t * 0.05),
    noise(p * 1.55 + w1 * 1.8 + vec2(6.4, 2.2) - t * 0.06)
  );
  return (w1 - 0.5) * 1.1 + (w2 - 0.5) * 0.55;
}

vec2 warp(vec2 p) {
  vec2 q = p / uScale;
  if (uType == 1) {
    float turn = uTime * 0.35;
    q = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * q;
  } else {
    q += vec2(-uDir.y, uDir.x) * uTime * 0.45;
  }
  return p + drift(q + uSeed, uTime) * uFlow * uScale * uSettle;
}

float coord(vec2 p) {
  vec2 w = warp(p);
  return uType == 1 ? 1.0 - length(w) * 1.1 : dot(w, uDir) / uExtent + 0.5;
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  for (int i = 0; i < 24; i++) {
    float w = uStirWeight[i];
    if (w <= 0.0) continue;
    vec2 d = p - uStir[i].xy;
    p -= uStir[i].zw * w * exp(-dot(d, d) / 0.045);
  }
  for (int i = 0; i < 4; i++) {
    float angle = uTwirl[i].z;
    if (angle == 0.0) continue;
    vec2 d = p - uTwirl[i].xy;
    float a = angle * exp(-dot(d, d) / (uTwirl[i].w * uTwirl[i].w));
    float c = cos(a);
    float s = sin(a);
    p = uTwirl[i].xy + mat2(c, -s, s, c) * d;
  }
  float raw = coord(p);
  float s = raw;
  if (uBands > 1.0) {
    s *= uBands;
    float cycle = floor(s);
    s = fract(s);
    if (mod(cycle, 2.0) > 0.5) s = 1.0 - s;
  }
  s = clamp(s, 0.0, 1.0);
  float scaled = s * float(uCount - 1);
  int index = int(min(floor(scaled), float(uCount - 2)));
  float f = scaled - float(index);
  float edge = max(uSoftness * 0.5, fwidth(scaled) * 0.75);
  float shaped = smoothstep(0.5 - edge, 0.5 + edge, f);
  vec3 from = uRamp[0];
  vec3 to = uRamp[1];
  for (int i = 0; i < 7; i++) {
    if (i == index) {
      from = uRamp[i];
      to = uRamp[i + 1];
    }
  }
  vec3 lab = mix(from, to, shaped);
  if (uSilk > 0.0) {
    vec2 grad = vec2(coord(p + vec2(0.004, 0.0)) - raw, coord(p + vec2(0.0, 0.004)) - raw) / 0.004;
    vec2 slope = grad * sin(3.14159265 * clamp(raw, 0.0, 1.0) * uBands) * uSilk * 4.0;
    vec3 normal = normalize(vec3(-slope, 1.0));
    vec3 light = normalize(vec3(-uDir.y, uDir.x, 1.2));
    float diffuse = dot(normal, light) - light.z;
    lab = uRamp[0] + (lab - uRamp[0]) * (1.0 + (diffuse * 0.35 + max(diffuse, 0.0) * diffuse * 0.6) * uSilk);
  }
  lab = mix(uRamp[0], lab, smoothstep(0.0, 1.0, uReveal * 1.5 - length(vUv - 0.5) * 0.6));
  lab.x = (lab.x - 0.55) * uContrast + 0.55;
  lab.yz *= uSaturation;
  outColor = vec4(encode(labToRgb(lab)), 1.0);
}`,it=`#version 300 es
precision highp float;
uniform sampler2D uField;
uniform float uGrain;
uniform float uGrainSize;
uniform float uFrame;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float clump(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec3 color = texture(uField, vUv).rgb;
  vec2 pixel = gl_FragCoord.xy + uFrame * vec2(17.0, 59.0);
  float fine = hash(pixel) + hash(pixel + 7.13) - 1.0;
  float coarse = (clump(pixel / max(uGrainSize, 1.0)) - 0.5) * 2.0;
  float grain = mix(fine, coarse, clamp(uGrainSize - 1.0, 0.0, 1.0) * 0.8);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color += grain * uGrain * (0.45 + 2.2 * luma * (1.0 - luma));
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`,p=(t,f,v)=>Math.min(v,Math.max(f,t)),ae=t=>t<=.04045?t/12.92:((t+.055)/1.055)**2.4,at=([t,f,v])=>{let u=ae(t),m=ae(f),b=ae(v),M=Math.cbrt(.4122214708*u+.5363325363*m+.0514459929*b),w=Math.cbrt(.2119034982*u+.6806995451*m+.1073969566*b),E=Math.cbrt(.0883024619*u+.2817188376*m+.6299787005*b);return[.2104542553*M+.793617785*w-.0040720468*E,1.9779984951*M-2.428592205*w+.4505937099*E,.0259040371*M+.7827717662*w-.808675766*E]},Pe=(t,f,v)=>{let u=t.createShader(f);return u?(t.shaderSource(u,v),t.compileShader(u),t.getShaderParameter(u,t.COMPILE_STATUS)?u:(t.deleteShader(u),null)):null},Ue=(t,f)=>{let v=Pe(t,t.VERTEX_SHADER,nt),u=Pe(t,t.FRAGMENT_SHADER,f),m=t.createProgram();if(!v||!u||!m)return null;if(t.attachShader(m,v),t.attachShader(m,u),t.linkProgram(m),t.deleteShader(v),t.deleteShader(u),!t.getProgramParameter(m,t.LINK_STATUS))return t.deleteProgram(m),null;let b={},M=t.getProgramParameter(m,t.ACTIVE_UNIFORMS);for(let w=0;w<M;w++){let E=t.getActiveUniform(m,w);if(!E)continue;let X=E.name.replace(/\[0\]$/,"");b[X]=t.getUniformLocation(m,X)}return{program:m,uniforms:b}},ct=({colors:t=Ie,type:f="linear",angle:v=55,bands:u=1,speed:m=1,flow:b=.8,scale:M=1,softness:w=1,silk:E=.35,grainAmount:X=.08,grainSize:ze=1.2,grainAnimated:qe=!0,contrast:ke=1,saturation:Be=1,variation:Ge=0,interactive:Xe=!0,stir:Ne=1,clickSwirl:Oe=!0,intro:Ve=!0,lightMode:We=!1,dpr:He,className:Ye="",style:$e,...Ke})=>{let le=(0,S.useRef)(null),fe=(0,S.useRef)(null),J=(0,S.useRef)(null),N=(Array.isArray(t)&&t.length?t:Ie).slice(0,_e),ue={colors:N.length>1?N:[N[0],N[0]],type:ot[f]??0,angle:v,bands:p(u,1,8),speed:Math.max(0,m),flow:p(b,0,3),scale:p(M,.25,3),softness:p(w,0,1),silk:p(E,0,1),grainAmount:p(X,0,.5),grainSize:p(ze,.5,4),grainAnimated:qe,contrast:p(ke,.2,2),saturation:p(Be,0,2),variation:Math.max(0,Ge),interactive:Xe,stir:p(Ne,0,2),clickSwirl:Oe,intro:Ve,lightMode:We,dpr:He},T=(0,S.useRef)(ue);return T.current=ue,(0,S.useEffect)(()=>{let _=le.current,y=fe.current,e=y?.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1});if(!_||!y||!e)return;let O=Ue(e,rt),V=Ue(e,it);if(!O||!V)return;let c=O.uniforms,W=V.uniforms,me=e.createVertexArray(),z=e.createTexture();e.bindTexture(e.TEXTURE_2D,z),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let Q=e.createFramebuffer(),D={width:0,height:0},L=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),de=new Map,je=o=>{let n=String(o),r=de.get(n);if(r)return r;let s=[0,0,0];if(L){L.clearRect(0,0,1,1),L.fillStyle="#000000",L.fillStyle=n,L.fillRect(0,0,1,1);let[A,F,x]=L.getImageData(0,0,1,1).data;s=[A/255,F/255,x/255]}return de.set(n,s),s},I=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,d={width:1,height:1,ratio:1},Z=new Float32Array(_e*3),he=new Float32Array(K*4),ee=new Float32Array(K),te=new Float32Array(re*4),h=[],g=[],i={x:.5,y:.5,sx:.5,sy:.5,vx:0,inside:!1,fresh:!0},ve="",pe=0,R=T.current.intro&&!I?0:1,oe=0,ne=0,q=0,P=0,H=!0,Je=()=>{let o=T.current,n=`${o.colors.join(",")}|${o.lightMode}`;if(n===ve)return;ve=n;let r=o.colors.map(s=>at(je(s)));if(!o.lightMode)r.forEach((s,A)=>Z.set(s,A*3));else{let s=r.map(([F])=>Math.abs(F-r[0][0])<.1),A=r.filter((F,x)=>!s[x]).reverse();r.forEach((F,x)=>{let[k,C,a]=s[x]?[1,0,0]:A.shift();Z.set([k+(1-k)*ie,C*(1-ie),a*(1-ie)],x*3)})}},ge=()=>{let o=T.current,n=d.width/d.height;Je(),e.bindVertexArray(me),e.disable(e.BLEND),e.bindFramebuffer(e.FRAMEBUFFER,Q),e.viewport(0,0,D.width,D.height),e.useProgram(O.program),e.uniform1f(c.uAspect,n),e.uniform1f(c.uTime,pe),e.uniform3fv(c.uRamp,Z),e.uniform1i(c.uCount,o.colors.length);let r=o.angle*Math.PI/180;e.uniform1i(c.uType,o.type),e.uniform2f(c.uDir,Math.sin(r),Math.cos(r)),e.uniform1f(c.uExtent,n*Math.abs(Math.sin(r))+Math.abs(Math.cos(r))),e.uniform1f(c.uBands,o.bands),e.uniform1f(c.uSoftness,o.softness),e.uniform1f(c.uFlow,o.flow),e.uniform1f(c.uScale,o.scale),e.uniform1f(c.uSilk,o.silk),e.uniform4fv(c.uStir,he),e.uniform1fv(c.uStirWeight,ee),e.uniform4fv(c.uTwirl,te),e.uniform2f(c.uSeed,o.variation*3.17,o.variation*1.91),e.uniform1f(c.uContrast,o.contrast),e.uniform1f(c.uSaturation,o.saturation),e.uniform1f(c.uSettle,R*R*(3-2*R)),e.uniform1f(c.uReveal,R),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,y.width,y.height),e.useProgram(V.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,z),e.uniform1i(W.uField,0),e.uniform1f(W.uGrain,o.grainAmount),e.uniform1f(W.uGrainSize,o.grainSize*d.ratio),e.uniform1f(W.uFrame,oe),e.drawArrays(e.TRIANGLES,0,3)},xe=()=>{let o=T.current;d.width=Math.max(1,_.clientWidth),d.height=Math.max(1,_.clientHeight),d.ratio=Math.min(o.dpr||window.devicePixelRatio||1,2),y.width=Math.max(1,Math.round(d.width*d.ratio)),y.height=Math.max(1,Math.round(d.height*d.ratio));let n=Math.max(1,Math.round(y.width/2)),r=Math.max(1,Math.round(y.height/2));(n!==D.width||r!==D.height)&&(D.width=n,D.height=r,e.bindTexture(e.TEXTURE_2D,z),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,n,r,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,Q),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,z,0),e.bindFramebuffer(e.FRAMEBUFFER,null)),ge(),U()},Qe=(o,n)=>{let r=T.current,s=1-Math.exp(-o/.06),A=i.sx,F=i.sy;i.sx+=(i.x-i.sx)*s,i.sy+=(i.y-i.sy)*s;let x=(i.sx-A)/o*n,k=(i.sy-F)/o;i.vx=x;let C=h[0];if(h.forEach(a=>{a.done&&(a.age+=o)}),r.interactive&&i.inside&&Math.hypot(x,k)>.02&&!I){(!C||C.done)&&(h.unshift({x:0,y:0,vx:0,vy:0,age:0,grow:0,done:!1}),h.length>K&&h.pop());let a=h[0];a.x=(i.sx-.5)*n,a.y=i.sy-.5,a.vx=x,a.vy=k,a.grow=Math.min(1,a.grow+o/et),a.done=a.grow>=1}else C&&(C.done=!0);for(;h.length&&h[h.length-1].age>De;)h.pop();for(let a=0;a<K;a++){let l=h[a];if(!l){ee[a]=0;continue}let B=1-l.age/De,Y=Math.min(1,2.2/Math.max(Math.hypot(l.vx,l.vy),.001));he.set([l.x,l.y,l.vx*Y,l.vy*Y],a*4),ee[a]=B*B*l.grow*r.stir*.05}for(g.forEach(a=>{a.age+=o});g.length&&g[g.length-1].age>Le;)g.pop();for(let a=0;a<re;a++){let l=g[a];if(!l){te[a*4+2]=0;continue}let B=l.age/Le,Y=Math.min(1,l.age/.18)*(1-B)*(1-B);te.set([l.x,l.y,l.direction*2.4*Y,.16+.1*Math.min(1,l.age/.5)],a*4)}},we=o=>{if(q=0,!H||document.hidden)return;let n=T.current,r=P?p((o-P)/1e3,.001,.05):1/60;P=o,I||(pe+=r*n.speed*.16),R<1&&(R=Math.min(1,R+r/tt)),ne+=r,n.grainAnimated&&!I&&ne>1/24&&(ne=0,oe=(oe+1)%97),Qe(r,d.width/d.height),ge(),!I&&(n.speed>0||n.grainAnimated)||R<1||h.length>0||g.length>0?q=requestAnimationFrame(we):P=0};function U(){!q&&H&&!document.hidden&&(q=requestAnimationFrame(we))}let be=o=>{let n=_.getBoundingClientRect(),r=(o.clientX-n.left)/Math.max(1,n.width),s=1-(o.clientY-n.top)/Math.max(1,n.height);i.inside=r>=0&&r<=1&&s>=0&&s<=1,i.x=r,i.y=s,(i.fresh||!i.inside)&&(i.sx=r,i.sy=s,i.fresh=!1)},Ee=o=>{be(o),(i.inside||h.length)&&U()},Te=o=>{be(o);let n=T.current;!i.inside||!n.clickSwirl||I||(g.unshift({x:(i.x-.5)*(d.width/d.height),y:i.y-.5,age:0,direction:i.vx<0?1:-1}),g.length>re&&g.pop(),U())},ye=()=>{i.inside=!1},Re=()=>{P=0,U()},Se=new ResizeObserver(xe);Se.observe(_);let Me=new IntersectionObserver(o=>{H=o.some(n=>n.isIntersecting),H&&(P=0,U())});return Me.observe(_),window.addEventListener("pointermove",Ee,{passive:!0}),window.addEventListener("pointerdown",Te,{passive:!0}),document.documentElement.addEventListener("pointerleave",ye),document.addEventListener("visibilitychange",Re),xe(),J.current=U,()=>{cancelAnimationFrame(q),J.current=null,Se.disconnect(),Me.disconnect(),window.removeEventListener("pointermove",Ee),window.removeEventListener("pointerdown",Te),document.documentElement.removeEventListener("pointerleave",ye),document.removeEventListener("visibilitychange",Re),e.deleteTexture(z),e.deleteFramebuffer(Q),e.deleteVertexArray(me),e.deleteProgram(O.program),e.deleteProgram(V.program),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,S.useEffect)(()=>{J.current?.()}),(0,ce.jsx)("div",{ref:le,className:["relative h-full w-full overflow-hidden",Ye].filter(Boolean).join(" "),style:$e,...Ke,children:(0,ce.jsx)("canvas",{ref:fe,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ce=ct;var se=G($(),1),st=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],j=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],vt=st.map((t,f)=>({id:f+1,image:t,src:t,img:t,url:t,title:j[f],text:j[f],label:j[f],alt:j[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function lt({big:t}){return(0,se.jsx)(Fe,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,se.jsx)(Ce,{})})}var pt=Ae(lt);export{pt as default};
