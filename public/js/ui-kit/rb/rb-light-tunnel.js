import{c as E,i as He,j as I,l as fe,m as ce}from"./chunks/chunk-6IYH4WPJ.js";var v=E(He(),1),X=E(I(),1),Xe=1.8,Ye=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ke=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uRatio;
uniform float uTime;
uniform float uDrift;
uniform vec2 uSteer;
uniform float uBend;
uniform float uCount;
uniform float uSwing;
uniform float uWave;
uniform float uWidth;
uniform float uPulseWidth;
uniform float uHead;
uniform float uTail;
uniform float uChance;
uniform float uSpacing;
uniform float uPulseSpeed;
uniform float uFlow;
uniform float uHalo;
uniform float uGlow;
uniform float uBrightness;
uniform float uVariance;
uniform float uBody;
uniform float uFadeNear;
uniform float uFadeFar;
uniform vec3 uCable;
uniform vec3 uPulse;
uniform vec3 uTunnel;
uniform vec3 uSurge;
uniform float uReveal;
uniform float uGrain;
uniform float uSeed;
uniform float uLight;
uniform float uOpacity;
out vec4 outColor;

const float TAU = 6.2831853;

vec3 inkOf(vec3 color, float depthOfInk) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float peak = max(color.r, max(color.g, color.b));
  float chroma = (peak - min(color.r, min(color.g, color.b))) / max(peak, 0.001);
  return color * min(1.0, mix(depthOfInk, depthOfInk * 1.7, chroma) / max(luma, 0.001));
}

float hash(float n) {
  return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453);
}

vec2 bendAt(float depth) {
  float reach = 1.0 - exp(-max(depth, 0.0) * 0.55);
  vec2 wobble = vec2(sin(uDrift * 0.37 + depth * 0.31), cos(uDrift * 0.29 + depth * 0.23)) * uBend;
  return (wobble + uSteer) * reach;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution - uCenter) / uScale;
  float depth = -log(max(length(p), 1e-5));
  vec2 q = p;
  for (int i = 0; i < 4; i++) {
    q = p - bendAt(depth);
    depth = -log(max(length(q), 1e-5));
  }
  float r = length(q);
  float px = r * uScale;
  float turn = atan(q.y, q.x) / TAU;
  float s = turn - uSwing - uWave * sin(depth * 1.2 + uDrift * 0.5);
  float cell = floor(s * uCount);
  float spacing = TAU * px / uCount;
  float near = smoothstep(0.55, 1.25, r);
  float width = uWidth * (1.0 + near * 1.2);
  float soft = uRatio * (0.55 + near * 0.9);
  float tight = uRatio * uHalo * (1.0 + near);
  float wide = tight * 4.5;

  float lines = 0.0;
  float body = 0.0;
  vec3 glow = vec3(0.0);
  float strokes = 0.0;
  for (int k = -3; k <= 3; k++) {
    float i = cell + float(k);
    float id = mod(i, uCount);
    float h1 = hash(id);
    float h2 = hash(id + 17.0);
    float h3 = hash(id + 41.0);
    float h4 = hash(id + 73.0);
    float center = (i + 0.5 + (h1 - 0.5) * 0.55) / uCount;
    center += 0.12 * sin(depth * (0.8 + h2 * 0.9) + uDrift * (0.4 + h3 * 0.5) + h4 * TAU) / uCount;
    float d = abs(s - center) * TAU * px;
    float shade = 1.0 + uVariance * (h3 - 0.5) * 0.9;
    float reach = smoothstep(spacing * 2.4, spacing * 1.4, d);

    lines += smoothstep(width + soft, width - soft, d) * shade;
    body += exp(-d / max(spacing * 0.22, 0.001)) * shade * reach;

    float x = depth * uSpacing + uTime * uPulseSpeed * (0.55 + h2 * 0.6) * uFlow + h4 * 7.0;
    float lead = (fract(x) - 0.5) / uSpacing * uFlow;
    float lit = step(hash(id * 3.7 + floor(x) * 13.1), uChance);
    float limit = 0.5 / uSpacing;
    float head = exp(-pow(max(-lead, 0.0) / uHead, 2.0)) * smoothstep(-limit, -limit * 0.8, lead);
    float tail = exp(-max(lead, 0.0) / uTail) * smoothstep(limit, limit * 0.55, lead);
    float pulse = (lead < 0.0 ? head : tail) * lit;
    float ring = uSurge.y * exp(-pow((depth - uSurge.x) / uSurge.z, 2.0));
    pulse = max(pulse, ring);
    float hot = pulse * (lead < 0.0 ? 1.0 : exp(-max(lead, 0.0) / (uTail * 0.35)));

    float core = uPulseWidth * width + 0.35 * uRatio;
    float stroke = smoothstep(core + soft, core - soft, d);
    float bloom = (exp(-d / tight) * 0.7 + exp(-d / wide) * 0.18) * uGlow * reach;
    vec3 tint = mix(uPulse, vec3(1.0), hot * 0.55 * (1.0 - uLight));
    glow += tint * pulse * (stroke * 1.5 + bloom) * shade;
    strokes += pulse * stroke * shade;
  }

  float lod = smoothstep(4.0, 1.2, spacing);
  float average = min(2.0 * uWidth / max(spacing, 0.001), 1.0);
  lines = mix(lines, average, lod);
  glow = mix(glow, uPulse * average * 0.6 * uChance, lod);
  strokes = mix(strokes, average * 0.6 * uChance, lod);
  body = mix(body, 1.0, lod) * uBody;

  float rr = r * 0.25;
  float fade = smoothstep(0.0, uFadeNear, rr) * smoothstep(uFadeFar, uFadeFar * 0.55, rr);
  fade *= smoothstep(uReveal - 0.6, uReveal, depth);

  float grain = 1.0;
  if (uGrain > 0.0) {
    grain += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime * 7.0) * 43758.5453) - 0.5) * uGrain * 4.0;
  }

  if (uLight > 0.5) {
    float hairline = clamp(lines * 0.26 + body * 0.2, 0.0, 1.0);
    float stroke = clamp(strokes * 1.6, 0.0, 1.0);
    float haze = clamp(length(glow) * 0.12, 0.0, 0.25);
    float ink = clamp(hairline + stroke + haze, 0.0, 1.0) * fade * uOpacity * grain;
    vec3 tone = mix(inkOf(uCable, 0.3), inkOf(uPulse, 0.16), clamp(stroke + haze * 2.0, 0.0, 1.0));
    tone = mix(tone, inkOf(uTunnel, 0.3), clamp(body * uBody, 0.0, 1.0) * 0.5);
    outColor = vec4(tone * ink, ink);
    return;
  }

  vec3 light = (uCable * lines * 0.12 + uTunnel * body * 0.35 + glow) * uBrightness * fade * grain;
  vec3 mapped = (1.0 - exp(-light * 1.4)) * uOpacity;
  outColor = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
}`,f=(o,l,c)=>Math.min(c,Math.max(l,o)),de=(o,l,c)=>{let r=o.createShader(l);return r?(o.shaderSource(r,c),o.compileShader(r),o.getShaderParameter(r,o.COMPILE_STATUS)?r:(o.deleteShader(r),null)):null},Je=o=>{let l=de(o,o.VERTEX_SHADER,Ye),c=de(o,o.FRAGMENT_SHADER,Ke),r=o.createProgram();if(!l||!c||!r)return null;if(o.attachShader(r,l),o.attachShader(r,c),o.bindAttribLocation(r,0,"aPosition"),o.linkProgram(r),o.deleteShader(l),o.deleteShader(c),!o.getProgramParameter(r,o.LINK_STATUS))return o.deleteProgram(r),null;let F={},W=o.getProgramParameter(r,o.ACTIVE_UNIFORMS);for(let k=0;k<W;k++){let T=o.getActiveUniform(r,k);T&&(F[T.name]=o.getUniformLocation(r,T.name))}return{program:r,uniforms:F}},Qe=({cableColor:o="#ffffff",pulseColor:l="#ffffff",tunnelColor:c="#ffffff",tunnelOpacity:r=0,speed:F=.1,flowDirection:W="inward",pulseSpeed:k=2,pulseLength:T=.28,pulseBlend:he=.6,pulseWidth:pe=1,pulseDensity:ge=.5,cableCount:ve=56,thickness:we=.35,rimWidth:xe=.15,waviness:be=.3,sway:Se=.5,bend:ye=.4,size:Me=1,centerX:Re=0,centerY:Ae=0,glow:Ce=1,fadeNear:ke=.5,fadeFar:Te=2,brightness:Pe=1,colorVariance:Ee=!0,grain:Fe=!1,grainIntensity:Le=.05,opacity:Be=1,mouseInteraction:De=!0,mouseStrength:Ie=.1,clickSurge:Oe=!0,intro:We=!0,variation:Ne=0,lightMode:Ve=!1,dpr:_e,className:Ge="",style:Ue,...ze})=>{let K=(0,v.useRef)(null),J=(0,v.useRef)(null),N=(0,v.useRef)(null),Q={cableColor:o,pulseColor:l,tunnelColor:c,tunnelOpacity:f(r,0,1),speed:Math.max(0,F),flow:W==="outward"?1:-1,pulseSpeed:Math.max(0,k),pulseLength:f(T,.02,1),pulseBlend:f(he,0,1),pulseWidth:f(pe,.1,3),pulseDensity:f(ge,0,1),cableCount:f(Math.round(ve),4,200),thickness:f(we,.05,2),rimWidth:f(xe,0,1),waviness:Math.max(0,be),sway:Math.max(0,Se),bend:Math.max(0,ye),size:Math.max(.05,Me),centerX:Re,centerY:Ae,glow:Math.max(0,Ce),fadeNear:Math.max(.001,ke),fadeFar:Math.max(.01,Te),brightness:Math.max(0,Pe),colorVariance:Ee,grain:Fe,grainIntensity:Math.max(0,Le),opacity:f(Be,0,1),mouseInteraction:De,mouseStrength:Math.max(0,Ie),clickSurge:Oe,intro:We,variation:Ne,lightMode:Ve,dpr:_e},m=(0,v.useRef)(Q);return m.current=Q,(0,v.useEffect)(()=>{let w=K.current,S=J.current,e=S?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!w||!S||!e)return;let L=Je(e);if(!L)return;let n=L.uniforms,Z=e.createBuffer(),V=e.createVertexArray();e.bindVertexArray(V),e.bindBuffer(e.ARRAY_BUFFER,Z),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let y=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),_=new Map,G=(t,a)=>{if(!t)return a;let i=String(t);if(_.has(i))return _.get(i);let u=a;if(y){y.clearRect(0,0,1,1),y.fillStyle="#000000",y.fillStyle=i,y.fillRect(0,0,1,1);let[s,b,g]=y.getImageData(0,0,1,1).data;u=[s/255,b/255,g/255]}return _.set(i,u),u},M=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,d={x:0,y:0,inside:!1},h={x:0,y:0},x={age:10},$=0,U=0,p=m.current.intro&&!M?0:1,R=0,A=0,B=!0,z=()=>{let t=m.current,a=S.width,i=S.height,u=a/Math.max(1,w.clientWidth),s=Math.min(a,i),b=t.flow,g=3.4,P=x.age*2.6,H=b>0?g-P:-.6+P,le=x.age<2.4?Math.min(1,x.age/.12)*Math.exp(-x.age*1.1):0,qe=p*p*(3-2*p);e.viewport(0,0,a,i),e.useProgram(L.program),e.bindVertexArray(V),e.uniform2f(n.uResolution,a,i),e.uniform2f(n.uCenter,t.centerX*s,t.centerY*s),e.uniform1f(n.uScale,s*.5*t.size),e.uniform1f(n.uRatio,u),e.uniform1f(n.uTime,$),e.uniform1f(n.uDrift,U),e.uniform2f(n.uSteer,h.x,h.y),e.uniform1f(n.uBend,t.bend*.45),e.uniform1f(n.uCount,t.cableCount),e.uniform1f(n.uSwing,Math.sin(U*.9)*t.sway*.5/(Math.PI*2)),e.uniform1f(n.uWave,t.waviness*.15),e.uniform1f(n.uWidth,(.25+t.thickness*1.5)*u),e.uniform1f(n.uPulseWidth,.6+t.pulseWidth*.9);let se=t.pulseLength*1.2;e.uniform1f(n.uHead,se*(.08+t.pulseBlend*.22)),e.uniform1f(n.uTail,se*(.5+t.pulseBlend*.7)),e.uniform1f(n.uChance,t.pulseDensity),e.uniform1f(n.uSpacing,.4),e.uniform1f(n.uPulseSpeed,t.pulseSpeed*4),e.uniform1f(n.uFlow,b),e.uniform1f(n.uHalo,1.2+t.rimWidth*8),e.uniform1f(n.uGlow,t.glow),e.uniform1f(n.uBrightness,t.brightness),e.uniform1f(n.uVariance,t.colorVariance?1:0),e.uniform1f(n.uBody,t.tunnelOpacity),e.uniform1f(n.uFadeNear,t.fadeNear),e.uniform1f(n.uFadeFar,t.fadeFar),e.uniform3fv(n.uCable,G(t.cableColor,[1,1,1])),e.uniform3fv(n.uPulse,G(t.pulseColor,[1,1,1])),e.uniform3fv(n.uTunnel,G(t.tunnelColor,[1,1,1])),e.uniform3f(n.uSurge,H,le,.22),e.uniform1f(n.uReveal,1.7-qe*3.6),e.uniform1f(n.uGrain,t.grain?t.grainIntensity:0),e.uniform1f(n.uSeed,t.variation),e.uniform1f(n.uLight,t.lightMode?1:0),e.uniform1f(n.uOpacity,t.opacity),e.drawArrays(e.TRIANGLES,0,3)},j=t=>{if(R=0,!B||document.hidden)return;let a=m.current,i=A?f((t-A)/1e3,5e-4,.05):1/60;A=t;let u=M?0:1;$+=i*a.speed*u,U+=i*(a.speed+.2)*u,x.age+=i,a.intro&&!M&&p<1?p=Math.min(1,p+i/Xe):(!a.intro||M)&&(p=1);let s=a.mouseInteraction&&d.inside&&!M,b=a.mouseStrength*2.5,g=s?[d.x*b,d.y*b]:[0,0],P=1-Math.exp(-i/.6);h.x+=(g[0]-h.x)*P,h.y+=(g[1]-h.y)*P,z();let H=Math.abs(g[0]-h.x)<5e-4&&Math.abs(g[1]-h.y)<5e-4;u>0||!H||p<1||x.age<2.4?R=requestAnimationFrame(j):A=0},C=()=>{!R&&B&&!document.hidden&&(R=requestAnimationFrame(j))},q=()=>{let t=m.current,a=Math.max(1,w.clientWidth),i=Math.max(1,w.clientHeight),u=Math.min(t.dpr||window.devicePixelRatio||1,2);S.width=Math.max(1,Math.round(a*u)),S.height=Math.max(1,Math.round(i*u)),z(),C()},ee=t=>{let a=w.getBoundingClientRect(),i=t.clientX-a.left,u=t.clientY-a.top;d.inside=i>=0&&u>=0&&i<=a.width&&u<=a.height;let s=Math.min(a.width,a.height)*.5;d.x=(i-a.width/2)/Math.max(1,s),d.y=(a.height/2-u)/Math.max(1,s)},te=t=>{ee(t),C()},oe=t=>{ee(t),!(!d.inside||!m.current.clickSurge||M)&&(x.age=0,C())},D=t=>{t.pointerType!=="mouse"&&(d.inside=!1)},ne=()=>{d.inside=!1},ae=()=>{A=0,C()},re=new ResizeObserver(q);re.observe(w);let ie=new IntersectionObserver(t=>{B=t.some(a=>a.isIntersecting),B&&(A=0,C())});ie.observe(w),window.addEventListener("pointermove",te,{passive:!0}),window.addEventListener("pointerdown",oe,{passive:!0}),window.addEventListener("pointerup",D,{passive:!0}),window.addEventListener("pointercancel",D,{passive:!0}),document.documentElement.addEventListener("pointerleave",ne),document.addEventListener("visibilitychange",ae),q();let ue=m.current.dpr;return N.current=()=>{let t=m.current;if(t.dpr!==ue){ue=t.dpr,q();return}R||z(),C()},()=>{cancelAnimationFrame(R),N.current=null,re.disconnect(),ie.disconnect(),window.removeEventListener("pointermove",te),window.removeEventListener("pointerdown",oe),window.removeEventListener("pointerup",D),window.removeEventListener("pointercancel",D),document.documentElement.removeEventListener("pointerleave",ne),document.removeEventListener("visibilitychange",ae),e.deleteProgram(L.program),e.deleteBuffer(Z),e.deleteVertexArray(V),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,v.useEffect)(()=>{N.current?.()}),(0,X.jsx)("div",{ref:K,className:["relative h-full w-full overflow-hidden",Ge].filter(Boolean).join(" "),style:Ue,...ze,children:(0,X.jsx)("canvas",{ref:J,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},me=Qe;var Y=E(I(),1),Ze=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],O=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],at=Ze.map((o,l)=>({id:l+1,image:o,src:o,img:o,url:o,title:O[l],text:O[l],label:O[l],alt:O[l],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][l],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function $e({big:o}){return(0,Y.jsx)(ce,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Y.jsx)(me,{})})}var rt=fe($e);export{rt as default};
