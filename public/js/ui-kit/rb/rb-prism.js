import{c as H,i as Ue,j as O,l as ue,m as le}from"./chunks/chunk-6IYH4WPJ.js";var w=H(Ue(),1),K=H(O(),1),Ne=1.4,L=64,Ce=[.299,.587,.114,.299,.587,.114,.299,.587,.114],De=[.701,-.587,-.114,-.299,.413,-.114,-.3,-.588,.886],He=[.168,-.331,.5,.328,.035,-.5,-.497,.296,.201],Le=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Xe=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform mat3 uRay;
uniform float uGlow;
uniform vec2 uOffset;
uniform float uColorFreq;
uniform float uCenterShift;
uniform float uInvBaseHalf;
uniform float uInvHeight;
uniform float uMinAxis;
uniform float uPxScale;
uniform sampler2D uPalette;
uniform int uUsePalette;
uniform float uTime;
uniform float uNoise;
uniform float uSaturation;
uniform mat3 uHue;
uniform int uUseHue;
uniform float uLight;
uniform float uNeutral;
out vec4 outColor;

const vec4 PHASE_COS = vec4(1.0, 0.5403023058681398, -0.4161468365471424, -0.9899924966004454);
const vec4 PHASE_SIN = vec4(0.0, 0.8414709848078965, 0.9092974268256817, 0.1411200080598672);

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
}

float pyramid(vec3 p) {
  vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
  return max((q.x + q.y + q.z - 1.0) * uMinAxis * 0.5773502691896258, -p.y);
}

vec3 grade(vec3 col, vec2 seed) {
  col += (rand(seed) - 0.5) * uNoise;
  col = clamp(col, 0.0, 1.0);
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);
  if (uUseHue == 1) col = clamp(uHue * col, 0.0, 1.0);
  return col;
}

void main() {
  vec2 f = (gl_FragCoord.xy - 0.5 * uResolution - uOffset) * uPxScale;
  vec3 origin = uRay * vec3(f, 0.0);
  vec3 axis = uRay[2];
  float z = 5.0;
  vec4 o = vec4(0.0);
  for (int i = 0; i < 100; i++) {
    vec3 p = origin + axis * z;
    float d = 0.1 + 0.2 * abs(pyramid(p + vec3(0.0, uCenterShift, 0.0)));
    z -= d;
    float phase = (p.y + z) * uColorFreq;
    vec4 band = sin(phase) * PHASE_COS + cos(phase) * PHASE_SIN + 1.0;
    if (uUsePalette == 1) band.rgb = texture(uPalette, vec2(phase * 0.15915494309189535, 0.5)).rgb * 2.0;
    o += band / d;
  }
  vec4 raw = o * o * uGlow / 1e5;
  vec4 e = exp(2.0 * raw);
  vec4 mapped = (e - 1.0) / (e + 1.0);
  vec2 seed = gl_FragCoord.xy + vec2(uTime);
  if (uLight > 0.5) {
    float peak = max(raw.r, max(raw.g, raw.b));
    vec3 hue = grade(raw.rgb / max(peak, 1e-6), seed);
    vec3 ink = pow(hue, vec3(1.5)) * mix(0.86, 0.32, uNeutral);
    float strength = max(mapped.r, max(mapped.g, mapped.b)) * mapped.a;
    float cover = clamp(strength * 0.95 + (rand(seed.yx) - 0.5) * uNoise * 0.5, 0.0, 1.0);
    outColor = vec4(ink * cover, cover);
  } else {
    outColor = vec4(grade(mapped.rgb, seed) * mapped.a, mapped.a);
  }
}`,X=(t,i,f)=>Math.min(f,Math.max(i,t)),fe=(t,i,f)=>{let o=t.createShader(i);return o?(t.shaderSource(o,f),t.compileShader(o),t.getShaderParameter(o,t.COMPILE_STATUS)?o:(t.deleteShader(o),null)):null},Be=t=>{let i=fe(t,t.VERTEX_SHADER,Le),f=fe(t,t.FRAGMENT_SHADER,Xe),o=t.createProgram();if(!i||!f||!o)return null;if(t.attachShader(o,i),t.attachShader(o,f),t.linkProgram(o),t.deleteShader(i),t.deleteShader(f),!t.getProgramParameter(o,t.LINK_STATUS))return t.deleteProgram(o),null;let s={},E=t.getProgramParameter(o,t.ACTIVE_UNIFORMS);for(let p=0;p<E;p++){let v=t.getActiveUniform(o,p);v&&(s[v.name]=t.getUniformLocation(o,v.name))}return{program:o,uniforms:s}},me=(t,i,f)=>{let o=Math.cos(t),s=Math.sin(t),E=Math.cos(i),p=Math.sin(i),v=Math.cos(f),T=Math.sin(f);return[o*v+s*p*T,E*T,-s*v+o*p*T,-o*T+s*p*v,E*v,s*T+o*p*v,s*E,-p,o*E]},de=(t,i)=>{let f=new Array(9);for(let o=0;o<3;o++)for(let s=0;s<3;s++)f[o*3+s]=t[s]*i[o*3]+t[3+s]*i[o*3+1]+t[6+s]*i[o*3+2];return f},Fe=({height:t=3.5,baseWidth:i=5.5,animationType:f="rotate",glow:o=1,offset:s,noise:E=0,scale:p=3.6,hueShift:v=0,colorFrequency:T=1,colors:j,saturation:pe=1.5,timeScale:ve=.5,interactive:ge=!0,hoverStrength:xe=2,inertia:Ee=.05,intro:Me=!0,resolution:be=.5,lightMode:we=!1,dpr:Te,className:Se="",style:ye,...Re})=>{let J=(0,w.useRef)(null),Q=(0,w.useRef)(null),V=(0,w.useRef)(null),Pe=Array.isArray(j)?j.filter(Boolean).slice(0,8):[],$={height:Math.max(.1,t),baseWidth:Math.max(.1,i),animationType:f==="rotate3d"?"3drotate":f,glow:Math.max(0,o),offsetX:s?.x??0,offsetY:s?.y??0,noise:Math.max(0,E),scale:Math.max(.1,p),hueShift:(v||0)*Math.PI/180,colorFrequency:Math.max(0,T),colors:Pe,saturation:Math.max(0,pe),timeScale:Math.max(0,ve),interactive:ge,hoverStrength:Math.max(0,xe),inertia:X(Ee,.001,1),intro:Me,resolution:X(be,.25,1),lightMode:we,dpr:Te},P=(0,w.useRef)($);return P.current=$,(0,w.useEffect)(()=>{let A=J.current,g=Q.current,e=g?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!A||!g||!e)return;let B=Be(e);if(!B)return;let c=B.uniforms,ee=e.createVertexArray(),F=e.createTexture();e.bindTexture(e.TEXTURE_2D,F),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,L,1,0,e.RGBA,e.UNSIGNED_BYTE,null);let _=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),Ae=n=>{if(!_)return[255,255,255];_.clearRect(0,0,1,1),_.fillStyle="#000000",_.fillStyle=String(n),_.fillRect(0,0,1,1);let[r,a,u]=_.getImageData(0,0,1,1).data;return[r,a,u]},te="",W=0,_e=n=>{let r=n.join(",");if(r===te||(te=r,W=0,!n.length))return;let a=n.map(Ae);W=1-a.reduce((l,[d,h,M])=>{let b=Math.max(d,h,M);return l+(b>0?(b-Math.min(d,h,M))/b:0)},0)/a.length;let u=new Uint8Array(L*4);for(let l=0;l<L;l++){let d=l/L*a.length,h=Math.floor(d),M=a[h%a.length],b=a[(h+1)%a.length],D=d-h,se=D*D*(3-2*D);for(let R=0;R<3;R++)u[l*4+R]=Math.round(M[R]+(b[R]-M[R])*se);u[l*4+3]=255}e.bindTexture(e.TEXTURE_2D,F),e.texSubImage2D(e.TEXTURE_2D,0,0,0,L,1,e.RGBA,e.UNSIGNED_BYTE,u)},N=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,x={width:1,height:1,scale:1},m={yaw:0,pitch:0,roll:0},S={x:0,y:0,inside:!1},G=0,y=P.current.intro&&!N?0:1,C=0,I=0,k=!0,Ie=n=>{let r=me(m.yaw,m.pitch,m.roll);if(n.animationType==="rotate"){let a=G*n.timeScale,u=Math.cos(a),l=Math.cos(a+33),d=Math.cos(a+11);return de(r,[u,0,d,0,1,0,l,0,u])}if(n.animationType==="3drotate"){let a=G*n.timeScale;return de(r,me(a*.55,Math.sin(a*.6+.6)*.6,Math.sin(a*.35+1.9)*.5))}return r},ne=()=>{let n=P.current;_e(n.colors);let r=n.baseWidth*.5,a=y*y*(3-2*y),u=Math.cos(n.hueShift),l=Math.sin(n.hueShift);e.bindVertexArray(ee),e.viewport(0,0,g.width,g.height),e.useProgram(B.program),e.uniform2f(c.uResolution,g.width,g.height),e.uniformMatrix3fv(c.uRay,!1,Ie(n)),e.uniform1f(c.uGlow,n.glow*a*a),e.uniform2f(c.uOffset,n.offsetX*x.scale,-n.offsetY*x.scale),e.uniform1f(c.uColorFreq,n.colorFrequency),e.uniform1f(c.uCenterShift,n.height*.25),e.uniform1f(c.uInvBaseHalf,1/r),e.uniform1f(c.uInvHeight,1/n.height),e.uniform1f(c.uMinAxis,Math.min(r,n.height)),e.uniform1f(c.uPxScale,1/(g.height*.1*n.scale)),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,F),e.uniform1i(c.uPalette,0),e.uniform1i(c.uUsePalette,n.colors.length?1:0),e.uniform1f(c.uTime,G),e.uniform1f(c.uNoise,n.noise),e.uniform1f(c.uSaturation,n.saturation),e.uniformMatrix3fv(c.uHue,!1,Ce.map((d,h)=>d+De[h]*u+He[h]*l)),e.uniform1i(c.uUseHue,Math.abs(n.hueShift)>1e-4?1:0),e.uniform1f(c.uLight,n.lightMode?1:0),e.uniform1f(c.uNeutral,W),e.drawArrays(e.TRIANGLES,0,3)},Y=()=>{let n=P.current;x.width=Math.max(1,A.clientWidth),x.height=Math.max(1,A.clientHeight),x.scale=Math.min(n.dpr||window.devicePixelRatio||1,2)*n.resolution,g.width=Math.max(1,Math.round(x.width*x.scale)),g.height=Math.max(1,Math.round(x.height*x.scale)),ne(),U()},oe=n=>{if(C=0,!k||document.hidden)return;let r=P.current;if(Math.round(x.width*Math.min(r.dpr||window.devicePixelRatio||1,2)*r.resolution)!==g.width){Y();return}let a=I?X((n-I)/1e3,.001,.05):1/60;I=n,N||(G+=a),y<1&&(y=Math.min(1,y+a/Ne));let u=r.animationType==="hover",l=S.inside&&!N&&(u||r.interactive),d=(u?.6:.09)*r.hoverStrength,h=l?-S.x*d:0,M=l?S.y*d:0,b=1-Math.pow(1-r.inertia,a*60);m.yaw+=(h-m.yaw)*b,m.pitch+=(M-m.pitch)*b,m.roll+=(0-m.roll)*(1-Math.pow(.9,a*60)),ne();let D=Math.abs(h-m.yaw)+Math.abs(M-m.pitch)+Math.abs(m.roll)>1e-4;!N&&!u&&r.animationType!=="static"&&r.timeScale>0||D||y<1||!N&&r.noise>0?C=requestAnimationFrame(oe):I=0};function U(){!C&&k&&!document.hidden&&(C=requestAnimationFrame(oe))}let re=n=>{let r=A.getBoundingClientRect(),a=(n.clientX-r.left)/Math.max(1,r.width)*2-1,u=(n.clientY-r.top)/Math.max(1,r.height)*2-1;S.inside=Math.abs(a)<=1&&Math.abs(u)<=1,S.x=X(a,-1,1),S.y=X(u,-1,1);let l=P.current;(l.interactive||l.animationType==="hover")&&U()},z=()=>{S.inside=!1,U()},ae=()=>{I=0,U()},ie=new ResizeObserver(Y);ie.observe(A);let ce=new IntersectionObserver(n=>{k=n.some(r=>r.isIntersecting),k&&(I=0,U())});return ce.observe(A),window.addEventListener("pointermove",re,{passive:!0}),window.addEventListener("blur",z),document.documentElement.addEventListener("pointerleave",z),document.addEventListener("visibilitychange",ae),Y(),V.current=U,()=>{cancelAnimationFrame(C),V.current=null,ie.disconnect(),ce.disconnect(),window.removeEventListener("pointermove",re),window.removeEventListener("blur",z),document.documentElement.removeEventListener("pointerleave",z),document.removeEventListener("visibilitychange",ae),e.deleteTexture(F),e.deleteVertexArray(ee),e.deleteProgram(B.program),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,w.useEffect)(()=>{V.current?.()}),(0,K.jsx)("div",{ref:J,className:["relative h-full w-full overflow-hidden",Se].filter(Boolean).join(" "),style:ye,...Re,children:(0,K.jsx)("canvas",{ref:Q,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},he=Fe;var Z=H(O(),1),Ge=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],q=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ye=Ge.map((t,i)=>({id:i+1,image:t,src:t,img:t,url:t,title:q[i],text:q[i],label:q[i],alt:q[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function ke({big:t}){return(0,Z.jsx)(le,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Z.jsx)(he,{})})}var Ke=ue(ke);export{Ke as default};
