import{c as F,i as Oe,j as N,l as ge,m as pe}from"./chunks/chunk-6IYH4WPJ.js";var w=F(Oe(),1),Q=F(N(),1),ke=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Te=`
uniform vec2 uView;
uniform float uScale;
uniform float uRotation;
uniform float uTime;
uniform float uWave;
uniform float uRipple;
uniform float uFold;
uniform vec2 uShift;
uniform vec4 uPointer;
uniform vec2 uDrag;
uniform vec4 uWaves[4];

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

vec2 bend(vec2 uv) {
  vec2 aspect = vec2(uView.x / uView.y, 1.0);
  vec2 offset = (uv - uPointer.xy) * aspect;
  float touch = uPointer.z * exp(-dot(offset, offset) / (uPointer.w * uPointer.w));
  uv -= uDrag * touch;
  for (int i = 0; i < 4; i++) {
    vec4 wave = uWaves[i];
    if (wave.w <= 0.0) continue;
    vec2 q = (uv - wave.xy) * aspect;
    float dist = length(q);
    float front = dist - wave.z;
    float ring = exp(-front * front * 60.0) * wave.w;
    uv += q / max(dist, 0.0001) / aspect * ring * 0.034 * sin(front * 34.0);
  }
  return uv;
}

float silk(vec2 vUv) {
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale + uShift;
  float tOffset = uTime;
  tex.y += 0.03 * uWave * sin(8.0 * tex.x - tOffset);
  return 0.6 + 0.4 * uFold * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) + uRipple * sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));
}
`,ze=`#version 300 es
precision highp float;
${Te}
out vec4 outColor;

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  float pattern = silk(bend(vUv));
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);
  outColor = vec4(pow(n, 6.0), 0.0, 0.0, 1.0);
}`,We=`#version 300 es
precision highp float;
${Te}
uniform sampler2D uBloom;
uniform vec3 uColor;
uniform vec3 uSheenColor;
uniform float uNoiseIntensity;
uniform float uDepth;
uniform float uSheen;
uniform float uGlow;
uniform float uLightMode;
uniform vec3 uLight;
uniform vec2 uStep;
uniform float uPresence;
uniform float uFade;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 softClip(vec3 c) {
  vec3 over = max(c - 0.75, 0.0);
  return min(c, 0.75) + 0.25 * (1.0 - exp(-over * 4.0));
}

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  vec2 coord = bend(vUv);
  float pattern = silk(coord);
  float rnd = noise(gl_FragCoord.xy);
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);

  float gx = silk(coord + vec2(uStep.x, 0.0)) - pattern;
  float gy = silk(coord + vec2(0.0, uStep.y)) - pattern;
  vec3 normal = normalize(vec3(-gx * 26.0, -gy * 26.0, 1.0));
  vec3 toLight = normalize(vec3(uLight.xy, 0.85));
  float relief = 1.0 + (dot(normal, toLight) - toLight.z) * 1.8 * uDepth;
  vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
  float gloss = pow(max(dot(normal, halfway), 0.0), 48.0) * smoothstep(0.25, 0.85, n);
  float crest = pow(n, 5.0);
  float shine = (gloss * 0.85 + crest * 0.4) * uSheen * (1.0 + uLight.z * 0.6);

  float bloom = 0.0;
  if (uGlow > 0.0) {
    bloom += textureLod(uBloom, vUv, 1.0).r * 0.35;
    bloom += textureLod(uBloom, vUv, 2.0).r * 0.3;
    bloom += textureLod(uBloom, vUv, 3.0).r * 0.2;
    bloom += textureLod(uBloom, vUv, 4.0).r * 0.15;
  }

  vec3 result;
  if (uLightMode > 0.5) {
    float fold = smoothstep(0.28, 0.9, pattern);
    float specular = smoothstep(0.72, 0.98, pattern);
    vec3 shadowColor = uColor * (0.72 - 0.12 * uDepth);
    vec3 bodyColor = min(uColor * 1.18, vec3(1.0));
    vec3 lightBase = mix(shadowColor, bodyColor, fold) * mix(1.0, relief, 0.6);
    lightBase = mix(lightBase, vec3(1.0), clamp(specular * 0.92 + shine * 0.22 + bloom * uGlow * 0.2, 0.0, 1.0));
    float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
    float grainSignal = (rnd + fineNoise - 1.0);
    float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
    result = clamp(lightBase + grainSignal * grainStrength, 0.0, 1.0);
  } else {
    float grain = rnd / 15.0 * uNoiseIntensity;
    float floorValue = mix(0.2, 0.03, uDepth);
    float curve = uDepth > 0.0 ? pow(n, 1.0 + 1.4 * uDepth) : n;
    float shade = uDepth > 0.0 ? floorValue + (1.0 - floorValue) * curve : pattern;
    vec3 tone = mix(uColor, pow(uColor, vec3(1.45)), (1.0 - n) * uDepth);
    vec3 lit = tone * shade * relief - vec3(grain);
    vec3 tint = mix(uColor, uSheenColor, 0.8);
    vec3 extra = tint * (shine + bloom * uGlow * 0.55);
    float blend = clamp((uSheen + uGlow) * 4.0, 0.0, 1.0);
    result = mix(clamp(lit, 0.0, 1.0), clamp(softClip(lit + extra), 0.0, 1.0), blend);
  }

  float edge = uFade * 0.5;
  float mask = 1.0;
  if (edge > 0.0) {
    mask = smootherstep01(vUv.x / edge) * smootherstep01((1.0 - vUv.x) / edge);
    mask *= smootherstep01(vUv.y / edge) * smootherstep01((1.0 - vUv.y) / edge);
  }
  float alpha = uPresence * mask;
  outColor = vec4(result * alpha, alpha);
}`,He=2.2,qe=1.6,xe=1.6,S=[-.55,.7],we=Math.hypot(S[0],S[1]),G=(r,s,d)=>Math.min(d,Math.max(s,r)),$e=r=>r*r*r*(r*(r*6-15)+10),Ke=r=>{let s=Number(r)||0;if(!s)return[0,0];let d=u=>{let l=Math.sin(s*12.9898+u*78.233)*43758.5453;return l-Math.floor(l)-.5};return[d(1)*6,d(2)*6]},be=(r,s,d)=>{let u=r.createShader(s);return u?(r.shaderSource(u,d),r.compileShader(u),r.getShaderParameter(u,r.COMPILE_STATUS)?u:(r.deleteShader(u),null)):null},Ee=(r,s)=>{let d=be(r,r.VERTEX_SHADER,ke),u=be(r,r.FRAGMENT_SHADER,s),l=r.createProgram();if(!d||!u||!l)return null;if(r.attachShader(l,d),r.attachShader(l,u),r.bindAttribLocation(l,0,"aPosition"),r.linkProgram(l),r.deleteShader(d),r.deleteShader(u),!r.getProgramParameter(l,r.LINK_STATUS))return r.deleteProgram(l),null;let _={},Y=r.getProgramParameter(l,r.ACTIVE_UNIFORMS);for(let A=0;A<Y;A++){let L=r.getActiveUniform(l,A);L&&(_[L.name.replace(/\[0\]$/,"")]=r.getUniformLocation(l,L.name))}return{program:l,uniforms:_}},Je=({speed:r=5,scale:s=1,color:d="#7B7481",sheenColor:u="#ffffff",noiseIntensity:l=1.5,rotation:_=0,sheen:Y=.5,depth:A=.5,glow:L=.3,ripple:ye=1,wave:Me=1,variation:Se=0,mouseInteraction:Ae=!0,interactionStrength:Le=1,clickRipple:Pe=!0,intro:Ce=!0,fade:Fe=0,lightMode:_e=!1,paused:Ue=!1,dpr:De,className:Ie="",style:Xe})=>{let j=(0,w.useRef)(null),ee=(0,w.useRef)(null),O=(0,w.useRef)(null),g=(0,w.useRef)(null);return g.current={speed:r,scale:s,color:String(d),sheenColor:String(u),noiseIntensity:Math.max(0,l),rotation:_,sheen:Math.max(0,Y),depth:G(A,0,1),glow:Math.max(0,L),ripple:Math.max(0,ye),wave:Math.max(0,Me),variation:Se,mouseInteraction:Ae,interactionStrength:Math.max(0,Le),clickRipple:Pe,intro:Ce,fade:G(Fe,0,1),lightMode:_e,paused:Ue,dpr:De},(0,w.useEffect)(()=>{let T=j.current,m=ee.current,e=m?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!T||!m||!e)return;let U=Ee(e,ze),D=Ee(e,We);if(!U||!D)return;let te=e.createBuffer(),k=e.createVertexArray();e.bindVertexArray(k),e.bindBuffer(e.ARRAY_BUFFER,te),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let P=e.createTexture(),z=e.createFramebuffer(),p={width:0,height:0},Be=(t,n)=>{p.width===t&&p.height===n||(p.width=t,p.height=n,e.bindTexture(e.TEXTURE_2D,P),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,t,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,z),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,P,0))},R=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),W=new Map,oe=t=>{if(W.has(t))return W.get(t);let n=[1,1,1];if(R){R.clearRect(0,0,1,1),R.fillStyle="#ffffff",R.fillStyle=t,R.fillRect(0,0,1,1);let[a,i,f]=R.getImageData(0,0,1,1).data;n=[a/255,i/255,f/255]}return W.set(t,n),n},C=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,c={width:1,height:1,ratio:1},h={x:0,y:0,inside:!1},v=[],H=new Float32Array(16),o={flow:0,intro:g.current.intro&&!C?0:1,touch:0,x:0,y:0,dragX:0,dragY:0,lightX:S[0],lightY:S[1]},b=0,y=0,I=!0,re=(t,n,a,i,f)=>{let[M,K]=Ke(i.variation);e.uniform2f(t.uView,n,a),e.uniform1f(t.uScale,i.scale),e.uniform1f(t.uRotation,i.rotation),e.uniform1f(t.uTime,o.flow-qe*(1-f)),e.uniform1f(t.uWave,i.wave),e.uniform1f(t.uRipple,i.ripple),e.uniform1f(t.uFold,.25+.75*f),e.uniform2f(t.uShift,M,K),e.uniform4f(t.uPointer,o.x/c.width,1-o.y/c.height,o.touch*i.interactionStrength,.32),e.uniform2f(t.uDrag,o.dragX,o.dragY),e.uniform4fv(t.uWaves,H)},q=()=>{let t=g.current,n=$e(o.intro),a=1-Math.pow(1-o.intro,3);e.bindVertexArray(k),H.fill(0),v.slice(-4).forEach((f,M)=>{H.set([f.x,f.y,f.age*.6,Math.exp(-f.age/(xe*.45))],M*4)}),t.glow>0&&(Be(Math.max(1,Math.round(m.width/4)),Math.max(1,Math.round(m.height/4))),e.bindFramebuffer(e.FRAMEBUFFER,z),e.viewport(0,0,p.width,p.height),e.useProgram(U.program),re(U.uniforms,p.width,p.height,t,n),e.drawArrays(e.TRIANGLES,0,3),e.bindTexture(e.TEXTURE_2D,P),e.generateMipmap(e.TEXTURE_2D));let i=D.uniforms;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,m.width,m.height),e.useProgram(D.program),re(i,m.width,m.height,t,n),e.uniform3fv(i.uColor,oe(t.color)),e.uniform3fv(i.uSheenColor,oe(t.sheenColor)),e.uniform1f(i.uNoiseIntensity,t.noiseIntensity),e.uniform1f(i.uDepth,t.depth),e.uniform1f(i.uSheen,t.sheen),e.uniform1f(i.uGlow,t.glow),e.uniform1f(i.uLightMode,t.lightMode?1:0),e.uniform3f(i.uLight,o.lightX,o.lightY,o.touch*t.interactionStrength),e.uniform2f(i.uStep,c.ratio/m.width,c.ratio/m.height),e.uniform1f(i.uPresence,a),e.uniform1f(i.uFade,t.fade),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,P),e.uniform1i(i.uBloom,0),e.drawArrays(e.TRIANGLES,0,3)},ne=t=>{if(b=0,!I||document.hidden)return;let n=g.current,a=y?Math.min(.05,(t-y)/1e3):1/60;y=t;let i=!n.paused&&!C&&n.speed!==0;i&&(o.flow+=a*.1*n.speed),!n.intro||C?o.intro=1:o.intro<1&&(o.intro=Math.min(1,o.intro+a/He));let f=n.mouseInteraction&&h.inside&&!C;f&&o.touch<.01&&(o.x=h.x,o.y=h.y);let M=1-Math.exp(-a*10),K=o.x,Ne=o.y;o.x+=(h.x-o.x)*M,o.y+=(h.y-o.y)*M;let Ge=(o.x-K)/Math.max(a,.001)/c.height,Ve=(o.y-Ne)/Math.max(a,.001)/c.height,de=1-Math.exp(-a*4);o.dragX+=(G(Ge*.03,-.06,.06)-o.dragX)*de,o.dragY+=(G(-Ve*.03,-.06,.06)-o.dragY)*de,o.touch+=((f?1:0)-o.touch)*(1-Math.exp(-a*(f?3.5:1.4)));let X=S[0],B=S[1];if(f){let x=(h.x/c.width-.5)*(c.width/c.height),ve=.5-h.y/c.height,J=Math.hypot(x,ve);J>.04?(X=x/J*we,B=ve/J*we):(X=o.lightX,B=o.lightY)}let me=1-Math.exp(-a*3);o.lightX+=(X-o.lightX)*me,o.lightY+=(B-o.lightY)*me;for(let x=v.length-1;x>=0;x--)v[x].age+=a,v[x].age>xe*2.5&&v.splice(x,1);q();let Ye=o.intro<1||v.length>0||Math.abs((f?1:0)-o.touch)>.002||Math.abs(o.dragX)+Math.abs(o.dragY)>2e-4||Math.abs(h.x-o.x)+Math.abs(h.y-o.y)>.3||Math.abs(X-o.lightX)+Math.abs(B-o.lightY)>.001;i||Ye?b=requestAnimationFrame(ne):y=0},E=()=>{!b&&I&&!document.hidden&&(b=requestAnimationFrame(ne))},$=()=>{let t=g.current,n=Math.max(1,T.clientWidth),a=Math.max(1,T.clientHeight),i=Math.min(t.dpr||window.devicePixelRatio||1,2);c.width=n,c.height=a,c.ratio=i,m.width=Math.max(1,Math.round(n*i)),m.height=Math.max(1,Math.round(a*i)),b||q(),E()},ie=t=>{let n=T.getBoundingClientRect(),a=t.clientX-n.left,i=t.clientY-n.top;return{x:a,y:i,inside:a>=0&&i>=0&&a<=n.width&&i<=n.height}},ae=t=>{let n=ie(t);h.x=n.x,h.y=n.y,h.inside=n.inside,E()},se=t=>{if(!g.current.clickRipple||C)return;let a=ie(t);a.inside&&(v.push({x:a.x/c.width,y:1-a.y/c.height,age:0}),v.length>4&&v.shift(),E())},le=()=>{h.inside=!1,E()},ce=()=>{y=0,E()},fe=new ResizeObserver($);fe.observe(T);let ue=new IntersectionObserver(t=>{I=t.some(n=>n.isIntersecting),I&&(y=0,E())});ue.observe(T),window.addEventListener("pointermove",ae,{passive:!0}),window.addEventListener("pointerdown",se,{passive:!0}),document.documentElement.addEventListener("pointerleave",le),document.addEventListener("visibilitychange",ce),$();let he=g.current.dpr;return O.current=()=>{let t=g.current;if(t.dpr!==he){he=t.dpr,$();return}b||q(),E()},()=>{cancelAnimationFrame(b),O.current=null,fe.disconnect(),ue.disconnect(),window.removeEventListener("pointermove",ae),window.removeEventListener("pointerdown",se),document.documentElement.removeEventListener("pointerleave",le),document.removeEventListener("visibilitychange",ce),e.deleteTexture(P),e.deleteFramebuffer(z),e.deleteProgram(U.program),e.deleteProgram(D.program),e.deleteBuffer(te),e.deleteVertexArray(k),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,w.useEffect)(()=>{O.current?.()}),(0,Q.jsx)("div",{ref:j,className:`relative w-full h-full overflow-hidden ${Ie}`,style:Xe,children:(0,Q.jsx)("canvas",{ref:ee,className:"absolute inset-0 block w-full h-full","aria-hidden":"true"})})},Re=Je;var Z=F(N(),1),Qe=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],V=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],nt=Qe.map((r,s)=>({id:s+1,image:r,src:r,img:r,url:r,title:V[s],text:V[s],label:V[s],alt:V[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ze({big:r}){return(0,Z.jsx)(pe,{big:r,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Z.jsx)(Re,{})})}var it=ge(Ze);export{it as default};
