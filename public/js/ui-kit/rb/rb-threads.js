import{c as M,i as Oe,j as F,l as ce,m as le}from"./chunks/chunk-6IYH4WPJ.js";var x=M(Oe(),1),k=M(F(),1),Xe=`#version 300 es
precision highp float;
in vec2 aPoint;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFrame;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;
uniform float uCount;
uniform float uThickness;
uniform float uSoftness;
uniform float uWaves;
uniform float uSplit;
uniform float uFray;
uniform float uSeed;
uniform vec2 uTurn;
uniform vec4 uPart;
uniform float uTaper;
out float vEdge;
out float vBand;
out float vDraw;
out float vAlpha;
out float vIndex;

float Perlin2D(vec2 P) {
  vec2 Pi = floor(P);
  vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 hash_x = fract(Pt * (1.0 / 951.135664));
  vec4 hash_y = fract(Pt * (1.0 / 642.949883));
  vec4 grad_x = hash_x - 0.49999;
  vec4 grad_y = hash_y - 0.49999;
  vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y) * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
  grad_results *= 1.4142135623730950;
  vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
  vec4 blend2 = vec4(blend, vec2(1.0 - blend));
  return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

void main() {
  float perc = float(gl_InstanceID) / uCount;
  float x = aPoint.x;
  float pixel = 1.0 / max(uResolution.x, uResolution.y);
  float splitPoint = uSplit + perc * uFray;
  float amplitudeNormal = smoothstep(splitPoint, max(0.7, splitPoint + 0.2), x);
  float finalAmplitude = amplitudeNormal * 0.5 * uAmplitude * (1.0 + (uMouse.y - 0.5) * 0.2);
  float timeScaled = uTime / 10.0 + (uMouse.x - 0.5);
  float blur = smoothstep(splitPoint, splitPoint + 0.05, x) * perc;
  float xnoise = mix(
    Perlin2D(vec2(timeScaled * 2.5 + uSeed, (x * uWaves + perc) * 2.5)),
    Perlin2D(vec2(timeScaled * 3.5 + uSeed, (x * uWaves + timeScaled) * 3.5)) / 1.5,
    x * 0.3
  );
  float y = 0.5 + (perc - 0.5) * uDistance + xnoise / 2.0 * finalAmplitude;
  vec2 local = vec2((x - 0.5) * uFrame.x, (y - 0.5) * uFrame.y);
  if (uPart.z > 0.0) {
    vec2 delta = local - uPart.xy;
    float reach = uPart.w;
    float pull = exp(-dot(delta, delta) / (reach * reach));
    local.y += delta.y * pull * uPart.z;
  }
  float width = 7.0 * uThickness * pixel * (1.0 - perc);
  float band = (width / 2.0 + 10.0 * uSoftness * pixel * blur) * uFrame.y;
  float draw = max(band, 1.0);
  local.y += aPoint.y * draw;
  vec2 turned = vec2(local.x * uTurn.x - local.y * uTurn.y, local.x * uTurn.y + local.y * uTurn.x);
  gl_Position = vec4(turned / (uResolution * 0.5), 0.0, 1.0);
  vEdge = aPoint.y * draw;
  vBand = band;
  vDraw = draw;
  vAlpha = 1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3)) * uTaper;
  vIndex = perc;
}`,Ve=`#version 300 es
precision highp float;
in float vEdge;
in float vBand;
in float vDraw;
in float vAlpha;
in float vIndex;
uniform vec3 uColor;
uniform vec3 uAccent;
out vec4 outColor;
void main() {
  float coverage = (1.0 - smoothstep(0.0, vDraw, abs(vEdge))) * (vBand / vDraw) * vAlpha;
  outColor = vec4(mix(uColor, uAccent, vIndex) * coverage, coverage);
}`,ke=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,ze=`#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uLines;
uniform vec2 uResolution;
uniform float uFade;
uniform float uOpacity;
uniform float uCurve;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec4 lines = texture(uLines, vUv);
  float alpha = lines.a;
  vec3 color = alpha > 0.0001 ? lines.rgb / alpha : vec3(0.0);
  float mask = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * min(uResolution.x, uResolution.y) * 0.5;
    mask *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    mask *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(color * pow(alpha, uCurve), alpha) * mask;
}`,fe=1920,f=(o,i,d)=>Math.min(d,Math.max(i,o)),de=(o,i,d)=>{let l=o.createShader(i);return l?(o.shaderSource(l,d),o.compileShader(l),o.getShaderParameter(l,o.COMPILE_STATUS)?l:(o.deleteShader(l),null)):null},me=(o,i,d)=>{let l=de(o,o.VERTEX_SHADER,i),p=de(o,o.FRAGMENT_SHADER,d),m=o.createProgram();return!l||!p||!m?null:(o.attachShader(m,l),o.attachShader(m,p),o.linkProgram(m),o.deleteShader(l),o.deleteShader(p),o.getProgramParameter(m,o.LINK_STATUS)?m:(o.deleteProgram(m),null))},pe=(o,i,d)=>{let l={};for(let p of d)l[p]=o.getUniformLocation(i,p);return l},Ge=({color:o=[1,1,1],accentColor:i,amplitude:d=1.7,distance:l=.4,enableMouseInteraction:p=!1,lineCount:m=90,thickness:ve=.6,softness:xe=1.3,speed:be=.6,waves:ge=1.05,split:Pe=.04,fray:Ee=.5,angle:Re=25,seed:ye=0,parting:Ae=0,taper:Te=.85,brightness:_e=1.4,fade:Me=0,opacity:we=1,paused:Fe=!1,...Se})=>{let G=(0,x.useRef)(null),W=(0,x.useRef)(null),D=(0,x.useRef)(null),De=`${Array.isArray(o)?o.join(","):String(o)}|${Array.isArray(i)?i.join(","):String(i??"")}`,Y={color:o,accentColor:i,colorKey:De,amplitude:d,distance:l,enableMouseInteraction:p,lineCount:f(Math.round(m),1,400),thickness:Math.max(0,ve),softness:Math.max(0,xe),speed:be,waves:Math.max(0,ge),split:f(Pe,0,1),fray:f(Ee,0,1),angle:Re,seed:ye,parting:f(Ae,0,1),taper:f(Te,0,1),brightness:f(_e,.25,2),fade:f(Me,0,1),opacity:f(we,0,1),paused:Fe},C=(0,x.useRef)(Y);C.current=Y,(0,x.useEffect)(()=>{let b=G.current,h=W.current,e=h?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!b||!h||!e)return;let R=me(e,Xe,Ve),y=me(e,ke,ze);if(!R||!y)return;let s=pe(e,R,["uTime","uResolution","uFrame","uAmplitude","uDistance","uMouse","uCount","uThickness","uSoftness","uWaves","uSplit","uFray","uSeed","uTurn","uPart","uTaper","uColor","uAccent"]),A=pe(e,y,["uLines","uResolution","uFade","uOpacity","uCurve"]),U=e.createVertexArray(),B=e.createBuffer();e.bindVertexArray(U),e.bindBuffer(e.ARRAY_BUFFER,B);let H=e.getAttribLocation(R,"aPoint");e.enableVertexAttribArray(H),e.vertexAttribPointer(H,2,e.FLOAT,!1,0,0);let I=e.createVertexArray(),q=e.createBuffer();e.bindVertexArray(I),e.bindBuffer(e.ARRAY_BUFFER,q),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let $=e.getAttribLocation(y,"aPosition");e.enableVertexAttribArray($),e.vertexAttribPointer($,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);let T=e.createTexture(),L=e.createFramebuffer();e.bindTexture(e.TEXTURE_2D,T),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let N=document.createElement("canvas");N.width=1,N.height=1;let g=N.getContext("2d",{willReadFrequently:!0}),Ue=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,t={time:0,width:1,height:1,segments:0,colorKey:"",color:[1,1,1],accent:[1,1,1],mouse:[.5,.5],targetMouse:[.5,.5],pointer:[0,0],targetPointer:[0,0],presence:0,inside:!1},P=0,E=0,w=!0,O=!0,j=r=>{if(Array.isArray(r))return[0,1,2].map(c=>f(Number(r[c]??1),0,1));if(!g)return[1,1,1];g.clearRect(0,0,1,1),g.fillStyle="#ffffff",g.fillStyle=String(r),g.fillRect(0,0,1,1);let[n,a,u]=g.getImageData(0,0,1,1).data;return[n/255,a/255,u/255]},Be=r=>{r.colorKey!==t.colorKey&&(t.colorKey=r.colorKey,t.color=j(r.color),t.accent=r.accentColor===void 0||r.accentColor===null?t.color:j(r.accentColor))},Ie=r=>{if(r===t.segments)return;t.segments=r;let n=new Float32Array((r+1)*4);for(let a=0;a<=r;a++){let u=a/r;n.set([u,-1,u,1],a*4)}e.bindBuffer(e.ARRAY_BUFFER,B),e.bufferData(e.ARRAY_BUFFER,n,e.STATIC_DRAW)},J=()=>{let r=Math.max(1,b.clientWidth),n=Math.max(1,b.clientHeight),a=Math.min(window.devicePixelRatio||1,2),u=Math.max(r,n)*a,c=u>fe?a*fe/u:a;h.width=Math.max(1,Math.round(r*c)),h.height=Math.max(1,Math.round(n*c)),t.width=r,t.height=n,e.bindTexture(e.TEXTURE_2D,T),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,h.width,h.height,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,L),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,T,0),e.bindFramebuffer(e.FRAMEBUFFER,null),Ie(f(Math.round(r/3),96,640)),X()},X=()=>{let r=C.current;Be(r);let n=h.width,a=h.height,u=r.angle*Math.PI/180,c=Math.cos(u),v=Math.sin(u),V=Math.abs(n*c)+Math.abs(a*v),Le=Math.abs(n*v)+Math.abs(a*c),ne=n/t.width,ae=r.enableMouseInteraction?t.mouse:[.5,.5],Ne=r.parting*t.presence*2,ie=t.pointer[0]*ne,se=t.pointer[1]*ne,ue=[ie*c+se*v,-ie*v+se*c];e.bindFramebuffer(e.FRAMEBUFFER,L),e.viewport(0,0,n,a),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(R),e.uniform1f(s.uTime,t.time),e.uniform2f(s.uResolution,n,a),e.uniform2f(s.uFrame,V,Le),e.uniform1f(s.uAmplitude,r.amplitude),e.uniform1f(s.uDistance,r.distance),e.uniform2f(s.uMouse,ae[0],ae[1]),e.uniform1f(s.uCount,r.lineCount),e.uniform1f(s.uThickness,r.thickness),e.uniform1f(s.uSoftness,r.softness),e.uniform1f(s.uWaves,r.waves),e.uniform1f(s.uSplit,r.split),e.uniform1f(s.uFray,r.fray),e.uniform1f(s.uSeed,r.seed*13.37),e.uniform2f(s.uTurn,c,v),e.uniform4f(s.uPart,ue[0],ue[1],Ne,Math.min(n,a)*.16),e.uniform1f(s.uTaper,r.taper),e.uniform3f(s.uColor,t.color[0],t.color[1],t.color[2]),e.uniform3f(s.uAccent,t.accent[0],t.accent[1],t.accent[2]),e.bindVertexArray(U),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,(t.segments+1)*2,r.lineCount),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,n,a),e.disable(e.BLEND),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(y),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,T),e.uniform1i(A.uLines,0),e.uniform2f(A.uResolution,n,a),e.uniform1f(A.uFade,r.fade),e.uniform1f(A.uOpacity,r.opacity),e.uniform1f(A.uCurve,2/r.brightness),e.bindVertexArray(I),e.drawArrays(e.TRIANGLES,0,3),e.bindVertexArray(null)},Q=r=>{if(P=0,!O||!w||document.hidden)return;let n=C.current,a=E?Math.min(.05,(r-E)/1e3):1/60;E=r;let u=!n.paused&&!Ue;u&&(t.time+=a*n.speed);let c=1-Math.exp(-a*3);t.mouse[0]+=(t.targetMouse[0]-t.mouse[0])*c,t.mouse[1]+=(t.targetMouse[1]-t.mouse[1])*c;let v=1-Math.exp(-a*10);t.pointer[0]+=(t.targetPointer[0]-t.pointer[0])*v,t.pointer[1]+=(t.targetPointer[1]-t.pointer[1])*v,t.presence+=((t.inside&&n.parting>0?1:0)-t.presence)*(1-Math.exp(-a*4)),X();let V=Math.abs(t.targetMouse[0]-t.mouse[0])>5e-4||Math.abs(t.targetMouse[1]-t.mouse[1])>5e-4||Math.abs(t.targetPointer[0]-t.pointer[0])>.05||Math.abs(t.targetPointer[1]-t.pointer[1])>.05||Math.abs((t.inside&&n.parting>0?1:0)-t.presence)>.002;u||V?P=requestAnimationFrame(Q):E=0},_=()=>{!P&&O&&w&&!document.hidden&&(P=requestAnimationFrame(Q))},Z=r=>{let n=b.getBoundingClientRect(),a=(r.clientX-n.left)/Math.max(1,n.width),u=(r.clientY-n.top)/Math.max(1,n.height),c=a>=0&&a<=1&&u>=0&&u<=1;c?(t.targetMouse=[a,1-u],t.targetPointer=[r.clientX-n.left-n.width/2,n.height/2-(r.clientY-n.top)],!t.inside&&t.presence<.01&&(t.pointer=[...t.targetPointer])):t.inside&&(t.targetMouse=[.5,.5]),t.inside=c,_()},ee=()=>{t.inside=!1,t.targetMouse=[.5,.5],_()},te=()=>{E=0,_()},re=new ResizeObserver(J);re.observe(b);let oe=new IntersectionObserver(r=>{w=r.some(n=>n.isIntersecting),w&&(E=0,_())});return oe.observe(b),window.addEventListener("pointermove",Z,{passive:!0}),document.documentElement.addEventListener("pointerleave",ee),document.addEventListener("visibilitychange",te),J(),D.current=()=>{P||X(),_()},()=>{O=!1,cancelAnimationFrame(P),D.current=null,re.disconnect(),oe.disconnect(),window.removeEventListener("pointermove",Z),document.documentElement.removeEventListener("pointerleave",ee),document.removeEventListener("visibilitychange",te),e.deleteFramebuffer(L),e.deleteTexture(T),e.deleteBuffer(B),e.deleteBuffer(q),e.deleteVertexArray(U),e.deleteVertexArray(I),e.deleteProgram(R),e.deleteProgram(y)}},[]),(0,x.useEffect)(()=>{D.current?.()});let{className:K="",...Ce}=Se;return(0,k.jsx)("div",{ref:G,className:`relative h-full w-full${K?` ${K}`:""}`,...Ce,children:(0,k.jsx)("canvas",{ref:W,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},he=Ge;var z=M(F(),1),We=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],S=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Je=We.map((o,i)=>({id:i+1,image:o,src:o,img:o,url:o,title:S[i],text:S[i],label:S[i],alt:S[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ye({big:o}){return(0,z.jsx)(le,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,z.jsx)(he,{})})}var Qe=ce(Ye);export{Qe as default};
