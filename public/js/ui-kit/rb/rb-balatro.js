import{c as N,i as Ze,j as J,l as De,m as Pe}from"./chunks/chunk-6IYH4WPJ.js";var F=N(Ze(),1),fe=N(J(),1),je=24e5,Z=4,Ue=8,Xe=90,et=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,tt=`#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;
uniform vec2 uCss;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uPush;
uniform float uRadius;
uniform float uDecay;
out vec4 fragColor;

void main() {
  vec2 cell = gl_FragCoord.xy / uSize;
  vec2 p = vec2(cell.x, 1.0 - cell.y) * uCss;
  vec2 seg = uTo - uFrom;
  float len2 = max(dot(seg, seg), 1e-6);
  float h = clamp(dot(p - uFrom, seg) / len2, 0.0, 1.0);
  vec2 gap = p - uFrom - seg * h;
  vec2 delta = uPush * exp(-dot(gap, gap) / (uRadius * uRadius));
  vec2 src = p - delta;
  vec2 prev = texture(uPrev, vec2(src.x / uCss.x, 1.0 - src.y / uCss.y)).xy;
  fragColor = vec4((prev + delta) * uDecay, 0.0, 1.0);
}`,rt=`#version 300 es
precision highp float;
uniform vec2 uCss;
uniform vec2 uCanvas;
uniform float uBlock;
uniform float uFlow;
uniform float uSpin;
uniform vec2 uOffset;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSwirl;
uniform float uScale;
uniform int uDetail;
uniform sampler2D uField;
uniform float uFieldOn;
uniform vec4 uTwirls[${Z}];
uniform float uReveal;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

vec3 paint(vec2 screenSize, vec2 coords) {
  vec2 uv = (coords - 0.5 * screenSize) / length(screenSize) - uOffset;
  float radius = length(uv);
  float speed = uSpin + 302.2;
  float angle = atan(uv.y, uv.x) + speed - 20.0 * (uSwirl * radius + (1.0 - uSwirl));
  vec2 mid = (screenSize / length(screenSize)) / 2.0;
  uv = vec2(radius * cos(angle) + mid.x, radius * sin(angle) + mid.y) - mid;

  uv *= 30.0 / uScale;
  speed = uFlow;
  vec2 uv2 = vec2(uv.x + uv.y);
  for (int i = 0; i < 8; i++) {
    if (i >= uDetail) break;
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));
    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
  }

  float contrastMod = 0.25 * uContrast + 0.5 * uSwirl + 1.2;
  float amount = min(2.0, max(0.0, length(uv) * 0.035 * contrastMod));
  float c1 = max(0.0, 1.0 - contrastMod * abs(1.0 - amount));
  float c2 = max(0.0, 1.0 - contrastMod * abs(amount));
  float c3 = 1.0 - min(1.0, c1 + c2);
  float light = (uLighting - 0.2) * max(c1 * 5.0 - 4.0, 0.0) + uLighting * max(c2 * 5.0 - 4.0, 0.0);
  vec3 gap = uLight > 0.5 ? mix(uColor3, vec3(1.0), 0.9) : uColor3;
  float base = 0.3 / uContrast;
  vec3 color = base * uColor1 + (1.0 - base) * (uColor1 * c1 + uColor2 * c2 + gap * c3) + light;
  return mix(gap, color, uReveal);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy) + 0.5;
  vec2 p = vec2(cell.x, uCanvas.y - cell.y) * uBlock;
  if (uFieldOn > 0.5) {
    p -= texture(uField, vec2(p.x / uCss.x, 1.0 - p.y / uCss.y)).xy;
  }
  for (int i = 0; i < ${Z}; i++) {
    vec4 twirl = uTwirls[i];
    if (twirl.w <= 0.0) continue;
    vec2 rel = p - twirl.xy;
    float turn = twirl.z * exp(-dot(rel, rel) / (twirl.w * twirl.w));
    float c = cos(turn);
    float s = sin(turn);
    p = twirl.xy + vec2(c * rel.x - s * rel.y, s * rel.x + c * rel.y);
  }
  vec3 color = paint(uCss, vec2(p.x, uCss.y - p.y));
  float grain = (fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  color = clamp(color + grain, 0.0, 1.0);
  fragColor = vec4(color * uOpacity, uOpacity);
}`,ot=`#version 300 es
precision highp float;
uniform sampler2D uPaint;
uniform vec2 uCanvas;
uniform vec2 uSource;
uniform float uDevice;
uniform float uCrt;
out vec4 fragColor;

float smoother(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 device = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 cell = floor(device / uDevice);
  vec4 texel = texture(uPaint, vec2((cell.x + 0.5) / uSource.x, 1.0 - (cell.y + 0.5) / uSource.y));
  vec3 color = texel.rgb;
  float glow = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float period = max(uDevice, 3.0);
  float row = fract(device.y / period);
  float line = smoother(0.5, 0.92, row) * (1.0 - smoother(0.92, 1.0, row));
  color *= 1.0 - uCrt * 0.34 * line * (1.0 - 0.7 * glow);
  vec2 screen = gl_FragCoord.xy / uCanvas;
  float edge = smoother(0.0, 0.18, screen.x) * smoother(0.0, 0.18, 1.0 - screen.x);
  edge *= smoother(0.0, 0.24, screen.y) * smoother(0.0, 0.24, 1.0 - screen.y);
  color *= mix(1.0, 0.78 + 0.22 * edge, uCrt);
  color *= 1.0 + uCrt * 0.1;
  fragColor = vec4(min(color, vec3(texel.a)), texel.a);
}`,g=(r,s,m)=>Math.min(m,Math.max(s,r)),ue=r=>{let s=String(r||"").trim(),m=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);if(m){let d=m[1].length===3?m[1].replace(/./g,y=>y+y):m[1];return[0,2,4].map(y=>parseInt(d.slice(y,y+2),16)/255)}let l=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);return l?[l[1],l[2],l[3]].map(d=>g(parseFloat(d)/255,0,1)):null},Ie=(r,s,m)=>{let l=r.createShader(s);return l?(r.shaderSource(l,m),r.compileShader(l),r.getShaderParameter(l,r.COMPILE_STATUS)?l:(console.error(r.getShaderInfoLog(l)),r.deleteShader(l),null)):null},le=(r,s)=>{let m=Ie(r,r.VERTEX_SHADER,et),l=Ie(r,r.FRAGMENT_SHADER,s),d=m&&l?r.createProgram():null;if(!m||!l||!d)return m&&r.deleteShader(m),l&&r.deleteShader(l),null;if(r.attachShader(d,m),r.attachShader(d,l),r.linkProgram(d),r.deleteShader(m),r.deleteShader(l),!r.getProgramParameter(d,r.LINK_STATUS))return console.error(r.getProgramInfoLog(d)),r.deleteProgram(d),null;let y={},ee=r.getProgramParameter(d,r.ACTIVE_UNIFORMS);for(let U=0;U<ee;U++){let X=r.getActiveUniform(d,U);X&&(y[X.name.replace(/\[0\]$/,"")]=r.getUniformLocation(d,X.name))}return{program:d,uniforms:y}},Q=r=>{let s=g(r,0,1);return s*s*s*(s*(s*6-15)+10)},nt=({color1:r="#DE443B",color2:s="#006BB4",color3:m="#162325",contrast:l=3.5,lighting:d=.4,swirl:y=.25,speed:ee=1,rotationSpeed:U=0,scale:X=1,detail:Oe=5,offset:te=[0,0],pixelSize:Ne=1.5,crt:Ge=0,mouseInteraction:ze=!0,mouseStrength:ke=1,clickSwirl:We=!0,intro:He=!0,lightMode:Ve=!1,opacity:Ye=1,maxDevicePixelRatio:$e=2,className:qe="",style:Ke})=>{let de=(0,F.useRef)(null),ve=(0,F.useRef)(null),re=(0,F.useRef)(null),[he,Je]=(0,F.useState)(0),ge={color1:ue(r)||[.871,.267,.231],color2:ue(s)||[0,.42,.706],color3:ue(m)||[.086,.137,.145],contrast:g(l,.5,10),lighting:g(d,0,1.5),swirl:g(y,0,1),speed:Math.max(0,ee),rotation:g(U,-10,10),scale:g(X,.2,5),detail:g(Math.round(Oe),1,8),offset:Array.isArray(te)?[Number(te[0])||0,Number(te[1])||0]:[0,0],pixelSize:g(Ne,0,24),crt:g(Ge,0,1),mouse:ze,strength:g(ke,0,3),clickSwirl:We,intro:He,light:Ve,opacity:g(Ye,0,1),maxRatio:g($e,.5,3)},I=(0,F.useRef)(ge);return I.current=ge,(0,F.useEffect)(()=>{re.current?.()}),(0,F.useEffect)(()=>{let B=de.current,v=ve.current;if(!B||!v)return;let e=v.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),G=e?le(e,rt):null,z=e?le(e,ot):null;if(!e||!G||!z)return;let S=!!(e.getExtension("EXT_color_buffer_float")||e.getExtension("EXT_color_buffer_half_float"))?le(e,tt):null,k=window.matchMedia("(prefers-reduced-motion: reduce)").matches,pe=e.createVertexArray(),u={cssWidth:1,cssHeight:1,block:1,device:1,width:1,height:1,crt:!1},b={texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0},i={width:0,height:0,targets:[],energy:0},a={x:0,y:0,lastX:0,lastY:0,vx:0,inside:!1,ready:!1},W={value:0},C=[],L=new Float32Array(Z*4),Ee=14,xe=0,D=I.current.intro&&!k&&he===0?0:1,A=0,H=0,oe=!0,ne=document.visibilityState!=="hidden",ie=!1,Te=(o,t)=>{let f=e.createTexture();e.bindTexture(e.TEXTURE_2D,f),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,o,t,0,e.RG,e.HALF_FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let w=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,w),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,f,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null),{texture:f,framebuffer:w}},we=()=>{i.targets.forEach(o=>{e.deleteTexture(o.texture),e.deleteFramebuffer(o.framebuffer)}),i.targets=[],i.width=0,i.height=0,i.energy=0},ae=()=>{let o=I.current,t=B.getBoundingClientRect(),f=Math.max(1,t.width),w=Math.max(1,t.height),x=Math.min(window.devicePixelRatio||1,o.maxRatio),P=Math.ceil(Math.sqrt(f*w*x*x/je)-.05),R=Math.max(o.pixelSize>0?Math.round(o.pixelSize*x):1,P,1),E=Math.max(1,Math.ceil(f*x/R)),n=Math.max(1,Math.ceil(w*x/R)),h=o.crt>0,se=h?E*R:E,c=h?n*R:n;if((v.width!==se||v.height!==c)&&(v.width=se,v.height=c),v.style.width=`${E*R/x}px`,v.style.height=`${n*R/x}px`,v.style.imageRendering=!h&&o.pixelSize>0&&R>=2?"pixelated":"auto",h&&(b.width!==E||b.height!==n)&&(e.bindTexture(e.TEXTURE_2D,b.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,E,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,b.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,b.texture,0),e.bindFramebuffer(e.FRAMEBUFFER,null),b.width=E,b.height=n),u.cssWidth=f,u.cssHeight=w,u.block=R/x,u.device=R,u.width=E,u.height=n,u.crt=h,!S)return;let p=g(Math.ceil(f/Ue),8,320),T=g(Math.ceil(w/Ue),8,320);p===i.width&&T===i.height||(we(),i.width=p,i.height=T,i.targets=[Te(p,T),Te(p,T)])},Qe=(o,t,f,w,x,P,R)=>{if(!S)return;let[E,n]=i.targets;e.bindFramebuffer(e.FRAMEBUFFER,n.framebuffer),e.viewport(0,0,i.width,i.height),e.useProgram(S.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,E.texture);let h=S.uniforms;e.uniform1i(h.uPrev,0),e.uniform2f(h.uSize,i.width,i.height),e.uniform2f(h.uCss,u.cssWidth,u.cssHeight),e.uniform2f(h.uFrom,o,t),e.uniform2f(h.uTo,f,w),e.uniform2f(h.uPush,x,P),e.uniform1f(h.uRadius,Xe),e.uniform1f(h.uDecay,R),e.drawArrays(e.TRIANGLES,0,3),i.targets=[n,E]},Re=o=>{if(A=0,ie)return;let t=I.current,f=g((o-H)/1e3||0,0,.05);H=Math.max(H,o);let w=k?.2:1;Ee+=f*t.speed*7*w,xe+=f*t.rotation*.2*w,D<1&&(D=Math.min(1,D+f/2.2));let x=t.mouse&&a.inside,P=x?(a.x/u.cssWidth-.5)*.35*t.strength:0;if(W.value+=(P-W.value)*(1-Math.exp(-f/.8)),e.bindVertexArray(pe),S&&i.targets.length){let c=a.x-a.lastX,p=a.y-a.lastY,T=x&&a.ready&&(c!==0||p!==0),Y=Math.exp(-f/1.6);if(T||i.energy>.05){let O=.85*t.strength*(k?.4:1),Le=T?Math.hypot(c,p)*O:0,$=Math.max(1,Math.ceil(Le/(Xe*.3)));for(let M=0;M<$;M++){let q=M/$,K=(M+1)/$;Qe(a.lastX+c*q,a.lastY+p*q,a.lastX+c*K,a.lastY+p*K,T?c*(K-q)*O:0,T?p*(K-q)*O:0,M===$-1?Y:1)}i.energy=i.energy*Y+Le,i.energy<=.05&&i.targets.forEach(M=>{e.bindFramebuffer(e.FRAMEBUFFER,M.framebuffer),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)})}}a.lastX=a.x,a.lastY=a.y;for(let c=C.length-1;c>=0;c--)C[c].age+=f,C[c].age>=3.2&&C.splice(c,1);L.fill(0),C.forEach((c,p)=>{let T=c.age,Y=Q(T/.25),O=1-Q((T-.25)/2.95);L[p*4]=c.x,L[p*4+1]=c.y,L[p*4+2]=c.direction*1.9*Y*O,L[p*4+3]=150*(1+.6*Q(T/3.2))});let E=1-(1-Math.pow(1-D,3));e.bindFramebuffer(e.FRAMEBUFFER,u.crt?b.framebuffer:null),e.viewport(0,0,u.width,u.height),e.useProgram(G.program);let n=G.uniforms;if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,i.targets.length?i.targets[0].texture:null),e.uniform1i(n.uField,0),e.uniform1f(n.uFieldOn,i.targets.length&&i.energy>.05?1:0),e.uniform2f(n.uCss,u.cssWidth,u.cssHeight),e.uniform2f(n.uCanvas,u.width,u.height),e.uniform1f(n.uBlock,u.block),e.uniform1f(n.uFlow,Ee),e.uniform1f(n.uSpin,-.4+xe+W.value+2.6*E*E),e.uniform2f(n.uOffset,t.offset[0],t.offset[1]),e.uniform3f(n.uColor1,t.color1[0],t.color1[1],t.color1[2]),e.uniform3f(n.uColor2,t.color2[0],t.color2[1],t.color2[2]),e.uniform3f(n.uColor3,t.color3[0],t.color3[1],t.color3[2]),e.uniform1f(n.uContrast,t.contrast),e.uniform1f(n.uLighting,t.lighting),e.uniform1f(n.uSwirl,Math.min(1,t.swirl+.55*E)),e.uniform1f(n.uScale,t.scale),e.uniform1i(n.uDetail,t.detail),e.uniform4fv(n.uTwirls,L),e.uniform1f(n.uReveal,Q(D/.45)),e.uniform1f(n.uLight,t.light?1:0),e.uniform1f(n.uOpacity,t.opacity),e.drawArrays(e.TRIANGLES,0,3),u.crt){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,v.width,v.height),e.useProgram(z.program);let c=z.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,b.texture),e.uniform1i(c.uPaint,0),e.uniform2f(c.uCanvas,v.width,v.height),e.uniform2f(c.uSource,u.width,u.height),e.uniform1f(c.uDevice,u.device),e.uniform1f(c.uCrt,t.crt),e.drawArrays(e.TRIANGLES,0,3)}let h=Math.abs(P-W.value)>5e-4||i.energy>.05||C.length>0;(t.speed>0||t.rotation!==0||D<1||h)&&oe&&ne&&(A=requestAnimationFrame(Re))},_=()=>{A||ie||!oe||!ne||(H=performance.now(),A=requestAnimationFrame(Re))};re.current=()=>{ae(),_()};let be=o=>{let t=B.getBoundingClientRect();return{x:o.clientX-t.left,y:o.clientY-t.top,inside:o.clientX>=t.left&&o.clientX<=t.right&&o.clientY>=t.top&&o.clientY<=t.bottom}},ye=o=>{let t=be(o);(!a.ready||!a.inside)&&(a.lastX=t.x,a.lastY=t.y),a.vx=t.x-a.x,a.x=t.x,a.y=t.y,a.inside=t.inside,a.ready=!0,_()},Fe=o=>{let t=I.current,f=be(o);!f.inside||!t.clickSwirl||k||(C.push({x:f.x,y:f.y,age:0,direction:a.vx<0?1:-1}),C.length>Z&&C.shift(),_())},ce=()=>{a.inside=!1,_()},V=o=>{o.pointerType!=="mouse"&&ce()};window.addEventListener("pointermove",ye,{passive:!0}),window.addEventListener("pointerdown",Fe,{passive:!0}),window.addEventListener("pointerup",V,{passive:!0}),window.addEventListener("pointercancel",V,{passive:!0}),document.documentElement.addEventListener("pointerleave",ce);let Ce=o=>{o.preventDefault(),ie=!0,cancelAnimationFrame(A),A=0},_e=()=>Je(o=>o+1);v.addEventListener("webglcontextlost",Ce),v.addEventListener("webglcontextrestored",_e);let Se=new ResizeObserver(()=>{ae(),_()});Se.observe(B);let Ae=new IntersectionObserver(o=>{oe=o.some(t=>t.isIntersecting),_()});Ae.observe(B);let Me=()=>{ne=document.visibilityState!=="hidden",_()};return document.addEventListener("visibilitychange",Me),ae(),_(),()=>{cancelAnimationFrame(A),re.current=null,Se.disconnect(),Ae.disconnect(),window.removeEventListener("pointermove",ye),window.removeEventListener("pointerdown",Fe),window.removeEventListener("pointerup",V),window.removeEventListener("pointercancel",V),document.documentElement.removeEventListener("pointerleave",ce),document.removeEventListener("visibilitychange",Me),v.removeEventListener("webglcontextlost",Ce),v.removeEventListener("webglcontextrestored",_e),e.isContextLost()||(we(),e.deleteTexture(b.texture),e.deleteFramebuffer(b.framebuffer),e.deleteVertexArray(pe),e.deleteProgram(G.program),e.deleteProgram(z.program),S&&e.deleteProgram(S.program))}},[he]),(0,fe.jsx)("div",{ref:de,className:`relative h-full w-full overflow-hidden ${qe}`.trim(),style:Ke,children:(0,fe.jsx)("canvas",{ref:ve,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Be=nt;var me=N(J(),1),it=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],j=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],dt=it.map((r,s)=>({id:s+1,image:r,src:r,img:r,url:r,title:j[s],text:j[s],label:j[s],alt:j[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function at({big:r}){return(0,me.jsx)(Pe,{big:r,dark:!0,center:!1,zoom:1,drive:!1,children:(0,me.jsx)(Be,{})})}var vt=De(at);export{vt as default};
