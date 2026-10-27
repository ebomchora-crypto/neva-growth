import{c as D,i as He,j as W,l as ve,m as pe}from"./chunks/chunk-6IYH4WPJ.js";var p=D(He(),1),Q=D(W(),1),Ye=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,je=`#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uTarget;
uniform vec2 uRot;
uniform vec2 uPillarRot;
uniform vec2 uWave;
uniform float uShift;
uniform float uPillarWidth;
uniform float uPillarHeight;
uniform int uDetail;
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
uniform float uGlowAmount;
uniform float uWidthNorm;
out vec4 outColor;

void main() {
  vec2 vUv = gl_FragCoord.xy / uTarget;
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
  uv.x -= uShift;
  uv = vec2(uPillarRot.x * uv.x - uPillarRot.y * uv.y, uPillarRot.y * uv.x + uPillarRot.x * uv.y);

  vec3 ro = vec3(0.0, 0.0, -10.0);
  vec3 rd = normalize(vec3(uv, 1.0));
  vec3 origin = vec3(uRot.x * ro.x - uRot.y * ro.z, ro.y, uRot.y * ro.x + uRot.x * ro.z);
  vec3 dir = vec3(uRot.x * rd.x - uRot.y * rd.z, rd.y, uRot.y * rd.x + uRot.x * rd.z);

  float glow = 0.0;
  float lift = 0.0;
  float t = 0.1;
  for (int i = 0; i < 80; i++) {
    vec3 p = origin + dir * t;
    vec3 q = p;
    q.y = p.y * uPillarHeight + uTime;

    float freq = 1.0;
    float amp = 1.0;
    for (int j = 0; j < 6; j++) {
      if (j >= uDetail) break;
      q.xz = vec2(uWave.y * q.x - uWave.x * q.z, uWave.x * q.x + uWave.y * q.z);
      q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }

    float d = length(cos(q.xz)) - 0.2;
    float bound = length(p.xz) - uPillarWidth;
    float h = max(4.0 - abs(d - bound), 0.0);
    d = max(d, bound) + h * h * 0.015625;
    d = abs(d) * 0.15 + 0.01;

    float weight = 1.0 / d;
    glow += weight;
    lift += clamp((15.0 - p.y) / 30.0, 0.0, 1.0) * weight;

    t += d;
    if (t > 50.0) break;
  }

  vec3 col = tanh((uBottomColor * glow + (uTopColor - uBottomColor) * lift) * uGlowAmount / uWidthNorm);
  float peak = max(col.r, max(col.g, col.b));
  outColor = vec4(col, smoothstep(0.62, 1.0, peak));
}`,$e=`#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uFieldSize;
uniform vec2 uView;
uniform vec2 uAspect;
uniform vec2 uPillarRot;
uniform float uShift;
uniform float uIntensity;
uniform float uNoiseIntensity;
uniform float uLightMode;
uniform float uNeutral;
uniform float uBloom;
uniform float uFade;
uniform float uReveal;
uniform float uFlare;
uniform vec4 uPulses[3];
out vec4 outColor;

vec3 tap(vec2 uv) {
  return textureLod(uField, uv, 0.0).rgb;
}

vec3 bicubic(vec2 uv) {
  vec2 position = uv * uFieldSize;
  vec2 center = floor(position - 0.5) + 0.5;
  vec2 f = position - center;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (center - 1.0) / uFieldSize;
  vec2 t3 = (center + 2.0) / uFieldSize;
  vec2 t12 = (center + w2 / w12) / uFieldSize;
  vec3 result = vec3(0.0);
  result += tap(vec2(t0.x, t0.y)) * w0.x * w0.y;
  result += tap(vec2(t12.x, t0.y)) * w12.x * w0.y;
  result += tap(vec2(t3.x, t0.y)) * w3.x * w0.y;
  result += tap(vec2(t0.x, t12.y)) * w0.x * w12.y;
  result += tap(vec2(t12.x, t12.y)) * w12.x * w12.y;
  result += tap(vec2(t3.x, t12.y)) * w3.x * w12.y;
  result += tap(vec2(t0.x, t3.y)) * w0.x * w3.y;
  result += tap(vec2(t12.x, t3.y)) * w12.x * w3.y;
  result += tap(vec2(t3.x, t3.y)) * w3.x * w3.y;
  return max(result, 0.0);
}

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec3 col = bicubic(uv);

  if (uBloom > 0.0) {
    vec4 l3 = textureLod(uField, uv, 3.0);
    vec4 l4 = textureLod(uField, uv, 4.0);
    vec4 l5 = textureLod(uField, uv, 5.0);
    vec4 l6 = textureLod(uField, uv, 6.0);
    float halo = l3.a * 0.3 + l4.a * 0.3 + l5.a * 0.25 + l6.a * 0.15;
    vec3 tint = l4.rgb + l5.rgb;
    tint /= max(max(tint.r, max(tint.g, tint.b)), 0.001);
    vec3 glow = clamp(tint * halo * uBloom * 1.1, 0.0, 1.0);
    col = 1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - glow);
  }

  vec2 p = (uv * 2.0 - 1.0) * uAspect;
  p.x -= uShift;
  float axis = uPillarRot.y * p.x + uPillarRot.x * p.y;

  float boost = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 pulse = uPulses[i];
    if (pulse.y <= 0.0) continue;
    float offset = (axis - pulse.x) / 0.24;
    boost += exp(-offset * offset) * pulse.y;
  }
  float head = (axis - uReveal + 0.35) / 0.3;
  boost += exp(-head * head) * uFlare;
  float lum = max(col.r, max(col.g, col.b));
  col += mix(col, vec3(lum), 0.45) * boost * 1.8;

  col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;
  vec3 result = clamp(col * uIntensity, 0.0, 1.0);

  float mask = smoothstep(uReveal, uReveal - 0.9, axis);
  float edge = uFade * 0.5;
  if (edge > 0.0) {
    mask *= smootherstep01(uv.x / edge) * smootherstep01((1.0 - uv.x) / edge);
    mask *= smootherstep01(uv.y / edge) * smootherstep01((1.0 - uv.y) / edge);
  }

  if (uLightMode > 0.5) {
    float energy = max(result.r, max(result.g, result.b));
    vec3 hue = result / max(energy, 0.001);
    float coverage = smoothstep(0.025, 0.95, energy);
    hue = pow(clamp(hue, 0.0, 1.0), vec3(1.25));
    vec3 tinted = mix(vec3(1.0), hue, coverage * 0.94 * mask);
    vec3 ink = vec3(1.0) - pow(result, vec3(1.6)) * 0.85 * mask;
    result = mix(tinted, ink, uNeutral);
  } else {
    result *= mask;
  }
  outColor = vec4(result, 1.0);
}`,xe={low:.35,medium:.5,high:.6},Ke=2.1,ge=1.4,we=.25,X=(o,u,x)=>Math.min(x,Math.max(u,o)),Qe=o=>1-Math.pow(1-o,3),Je=o=>o*o*o*(o*(o*6-15)+10),be=(o,u,x)=>{let m=o.createShader(u);return m?(o.shaderSource(m,x),o.compileShader(m),o.getShaderParameter(m,o.COMPILE_STATUS)?m:(o.deleteShader(m),null)):null},Re=(o,u)=>{let x=be(o,o.VERTEX_SHADER,Ye),m=be(o,o.FRAGMENT_SHADER,u),f=o.createProgram();if(!x||!m||!f)return null;if(o.attachShader(f,x),o.attachShader(f,m),o.bindAttribLocation(f,0,"aPosition"),o.linkProgram(f),o.deleteShader(x),o.deleteShader(m),!o.getProgramParameter(f,o.LINK_STATUS))return o.deleteProgram(f),null;let U={},O=o.getProgramParameter(f,o.ACTIVE_UNIFORMS);for(let _=0;_<O;_++){let L=o.getActiveUniform(f,_);L&&(U[L.name.replace(/\[0\]$/,"")]=o.getUniformLocation(f,L.name))}return{program:f,uniforms:U}},Ze=({topColor:o="#5227FF",bottomColor:u="#FF9FFC",intensity:x=1,rotationSpeed:m=.3,flow:f=1,interactive:U=!0,clickPulse:O=!0,glowAmount:_=.002,bloom:L=.5,pillarWidth:ye=3,pillarHeight:Te=.4,pillarRotation:Me=25,twist:Ae=.4,detail:Fe=4,noiseIntensity:Pe=.5,fade:Se=0,intro:_e=!0,mixBlendMode:Le="screen",quality:Ce="high",resolution:Ie,lightMode:De=!1,paused:Ue=!1,className:ke="",style:Ne})=>{let Z=(0,p.useRef)(null),ee=(0,p.useRef)(null),V=(0,p.useRef)(null),C=(0,p.useRef)(null),[Be,ze]=(0,p.useState)(0);return C.current={topColor:String(o),bottomColor:String(u),intensity:Math.max(0,x),rotationSpeed:m,flow:f,interactive:U,clickPulse:O,glowAmount:Math.max(0,_),bloom:Math.max(0,L),pillarWidth:Math.max(.05,ye),pillarHeight:Te,pillarRotation:Me,twist:Ae,detail:Math.round(X(Fe,1,6)),noiseIntensity:Math.max(0,Pe),fade:X(Se,0,1),intro:_e,scale:X(Ie??xe[Ce]??xe.high,we,2),lightMode:De,paused:Ue},(0,p.useEffect)(()=>{let A=Z.current,d=ee.current,e=d?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!A||!d||!e)return;let qe=!!e.getExtension("EXT_color_buffer_float"),k=Re(e,je),N=Re(e,$e);if(!k||!N)return;let te=t=>{t.preventDefault()},oe=()=>ze(t=>t+1);d.addEventListener("webglcontextlost",te),d.addEventListener("webglcontextrestored",oe);let re=e.createBuffer(),H=e.createVertexArray();e.bindVertexArray(H),e.bindBuffer(e.ARRAY_BUFFER,re),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let g=null,Y=e.createFramebuffer(),h={width:0,height:0},We=(t,i)=>{if(h.width===t&&h.height===i)return;h.width=t,h.height=i,g&&e.deleteTexture(g),g=e.createTexture(),e.bindTexture(e.TEXTURE_2D,g);let n=Math.floor(Math.log2(Math.max(t,i)))+1;e.texStorage2D(e.TEXTURE_2D,n,qe?e.RGBA16F:e.RGBA8,t,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,Y),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,g,0)},F=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),j=new Map,B=t=>{if(j.has(t))return j.get(t);let i=[1,1,1];if(F){F.clearRect(0,0,1,1),F.fillStyle="#ffffff",F.fillStyle=t,F.fillRect(0,0,1,1);let[n,s,b]=F.getImageData(0,0,1,1).data;i=[n/255,s/255,b/255]}return j.set(t,i),i},I=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,a={width:1,height:1,ratio:1},P={x:0,y:0,inside:!1},w=[],$=new Float32Array(12),r={clock:0,intro:C.current.intro&&!I?0:1,touch:0,spin:0,lean:0,shift:0,governor:1,slow:0,quick:0},T=0,R=0,z=!0,Xe=(t,i,n)=>{let s=a.width/a.height,b=(t/a.width*2-1)*s-r.shift,v=1-i/a.height*2;return Math.sin(n)*b+Math.cos(n)*v},K=()=>{let t=C.current,i=Math.max(we,t.scale*r.governor),n=Math.max(1,Math.round(a.width*i)),s=Math.max(1,Math.round(a.height*i));We(n,s);let b=Je(r.intro),v=Qe(r.intro),E=(t.pillarRotation+r.lean)*Math.PI/180,q=r.clock*.3+r.spin,y=t.pillarWidth*(.3+.7*b);e.bindVertexArray(H);let c=k.uniforms;e.bindFramebuffer(e.FRAMEBUFFER,Y),e.viewport(0,0,h.width,h.height),e.useProgram(k.program),e.uniform1f(c.uTime,r.clock*t.flow),e.uniform2f(c.uResolution,a.width,a.height),e.uniform2f(c.uTarget,h.width,h.height),e.uniform2f(c.uRot,Math.cos(q),Math.sin(q)),e.uniform2f(c.uPillarRot,Math.cos(E),Math.sin(E)),e.uniform2f(c.uWave,Math.sin(t.twist),Math.cos(t.twist)),e.uniform1f(c.uShift,r.shift),e.uniform1f(c.uPillarWidth,y),e.uniform1f(c.uPillarHeight,t.pillarHeight),e.uniform1i(c.uDetail,t.detail),e.uniform3fv(c.uTopColor,B(t.topColor)),e.uniform3fv(c.uBottomColor,B(t.bottomColor)),e.uniform1f(c.uGlowAmount,t.glowAmount),e.uniform1f(c.uWidthNorm,y/3),e.drawArrays(e.TRIANGLES,0,3),e.bindTexture(e.TEXTURE_2D,g),t.bloom>0&&e.generateMipmap(e.TEXTURE_2D),$.fill(0),w.forEach((S,Ve)=>{$.set([S.axis+S.age*1.7,Math.exp(-S.age/(ge*.45)),0,0],Ve*4)});let l=N.uniforms;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,d.width,d.height),e.useProgram(N.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,g),e.uniform1i(l.uField,0),e.uniform2f(l.uFieldSize,h.width,h.height),e.uniform2f(l.uView,d.width,d.height),e.uniform2f(l.uAspect,a.width/a.height,1),e.uniform2f(l.uPillarRot,Math.cos(E),Math.sin(E)),e.uniform1f(l.uShift,r.shift),e.uniform1f(l.uIntensity,t.intensity*(.15+.85*v)*(1+.12*r.touch)),e.uniform1f(l.uNoiseIntensity,t.noiseIntensity),e.uniform1f(l.uLightMode,t.lightMode?1:0);let de=S=>Math.max(...S)-Math.min(...S),Oe=Math.max(de(B(t.topColor)),de(B(t.bottomColor)));e.uniform1f(l.uNeutral,1-X((Oe-.08)/.12,0,1)),e.uniform1f(l.uBloom,t.bloom),e.uniform1f(l.uFade,t.fade);let he=a.width/a.height+1.2;e.uniform1f(l.uReveal,r.intro>=1?1e4:-he+v*(he*2+1.2)),e.uniform1f(l.uFlare,r.intro>=1?0:(1-v)*1.3*Math.min(1,r.intro*8)),e.uniform4fv(l.uPulses,$),e.drawArrays(e.TRIANGLES,0,3)},Ge=t=>{t>1/40?(r.slow+=1,r.quick=0):t<1/55&&(r.quick+=1,r.slow=0),r.slow>20?(r.governor=Math.max(.5,r.governor*.85),r.slow=0):r.quick>180&&r.governor<1&&(r.governor=Math.min(1,r.governor*1.1),r.quick=0)},ie=t=>{if(T=0,!z||document.hidden)return;let i=C.current,n=R?Math.min(.05,(t-R)/1e3):1/60;R&&Ge((t-R)/1e3),R=t;let s=!i.paused&&!I&&i.rotationSpeed!==0;s&&(r.clock+=n*.96*i.rotationSpeed),!i.intro||I?r.intro=1:r.intro<1&&(r.intro=Math.min(1,r.intro+n/Ke));let b=i.interactive&&P.inside&&!I,v=b?P.x/a.width-.5:0,E=1-Math.exp(-n*2.4);r.spin+=(v*1.4-r.spin)*E,r.lean+=(v*9-r.lean)*E,r.shift+=(v*.35*(a.width/a.height)-r.shift)*E,r.touch+=((b?1:0)-r.touch)*(1-Math.exp(-n*3));for(let y=w.length-1;y>=0;y--)w[y].age+=n,w[y].age>ge*2.2&&w.splice(y,1);K();let q=r.intro<1||w.length>0||Math.abs(v*1.4-r.spin)>5e-4||Math.abs((b?1:0)-r.touch)>.002;s||q?T=requestAnimationFrame(ie):R=0},M=()=>{!T&&z&&!document.hidden&&(T=requestAnimationFrame(ie))},ne=()=>{let t=Math.max(1,A.clientWidth),i=Math.max(1,A.clientHeight),n=Math.min(window.devicePixelRatio||1,2);a.width=t,a.height=i,a.ratio=n,d.width=Math.max(1,Math.round(t*n)),d.height=Math.max(1,Math.round(i*n)),T||K(),M()},ae=t=>{let i=A.getBoundingClientRect(),n=t.clientX-i.left,s=t.clientY-i.top;return{x:n,y:s,inside:n>=0&&s>=0&&n<=i.width&&s<=i.height}},le=t=>{let i=ae(t);P.x=i.x,P.y=i.y,P.inside=i.inside,M()},ue=t=>{let i=C.current;if(!i.clickPulse||I)return;let n=ae(t);if(!n.inside)return;let s=(i.pillarRotation+r.lean)*Math.PI/180;w.push({axis:Xe(n.x,n.y,s),age:0}),w.length>3&&w.shift(),M()},se=()=>{P.inside=!1,M()},ce=()=>{R=0,M()},fe=new ResizeObserver(ne);fe.observe(A);let me=new IntersectionObserver(t=>{z=t.some(i=>i.isIntersecting),z&&(R=0,M())});return me.observe(A),window.addEventListener("pointermove",le,{passive:!0}),window.addEventListener("pointerdown",ue,{passive:!0}),document.documentElement.addEventListener("pointerleave",se),document.addEventListener("visibilitychange",ce),ne(),V.current=()=>{T||K(),M()},()=>{cancelAnimationFrame(T),V.current=null,d.removeEventListener("webglcontextlost",te),d.removeEventListener("webglcontextrestored",oe),fe.disconnect(),me.disconnect(),window.removeEventListener("pointermove",le),window.removeEventListener("pointerdown",ue),document.documentElement.removeEventListener("pointerleave",se),document.removeEventListener("visibilitychange",ce),g&&e.deleteTexture(g),e.deleteFramebuffer(Y),e.deleteProgram(k.program),e.deleteProgram(N.program),e.deleteBuffer(re),e.deleteVertexArray(H),e.isContextLost()||e.getExtension("WEBGL_lose_context")?.loseContext()}},[Be]),(0,p.useEffect)(()=>{V.current?.()}),(0,Q.jsx)("div",{ref:Z,className:`absolute top-0 left-0 w-full h-full overflow-hidden ${ke}`,style:{mixBlendMode:Le,...Ne},children:(0,Q.jsx)("canvas",{ref:ee,className:"absolute inset-0 block w-full h-full","aria-hidden":"true"})})},Ee=Ze;var J=D(W(),1),et=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],lt=et.map((o,u)=>({id:u+1,image:o,src:o,img:o,url:o,title:G[u],text:G[u],label:G[u],alt:G[u],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][u],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function tt({big:o}){return(0,J.jsx)(pe,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,J.jsx)(Ee,{})})}var ut=ve(tt);export{ut as default};
