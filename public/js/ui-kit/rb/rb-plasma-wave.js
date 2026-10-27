import{c as B,i as We,j as z,l as ge,m as we}from"./chunks/chunk-6IYH4WPJ.js";var b=B(We(),1),Z=B(z(),1),Ne=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,k=`#version 300 es
precision highp float;
const float PI = 3.14159265;
const float TAU = 6.28318531;
const float HALF_PI = 1.5707963;
`,Se=`
uniform vec2 uView;
uniform vec2 uOffset;
uniform float uRotation;
uniform float uFocalLength;
uniform float uTime;
uniform float uSpeed1;
uniform float uSpeed2;
uniform float uDir2;
uniform float uBend1;
uniform float uBend2;
uniform float uThickness;
uniform vec3 uHeat;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uCore;
uniform float uRange;

vec4 traceLight(vec2 pixel) {
  vec2 coord = pixel + uOffset - 0.5 * uView;
  float c = cos(uRotation);
  float sn = sin(uRotation);
  coord = mat2(c, -sn, sn, c) * coord;
  vec3 u = normalize(vec3(coord / uView.y, uFocalLength));
  vec3 o = vec3(0.0, 0.0, -7.0);
  float t = uTime * PI;
  float t1 = t * 0.7;
  float t2 = t * 0.9;
  float tSpeed1 = t * uSpeed1;
  float tSpeed2 = t * uSpeed2 * uDir2;
  float s = 1.0;
  float d = 0.0;
  vec2 k = vec2(0.0);
  for (int i = 0; i < 14; ++i) {
    vec3 p = o + u * d;
    p.x -= 15.0;
    float px = p.x;
    float swell = uHeat.y * exp(-pow((px - uHeat.x) / uHeat.z, 2.0));
    float wob1 = uBend1 + swell * (0.16 + 0.2 * uBend1) + sin(t1 + px * 0.8) * 0.1;
    float wob2 = uBend2 + swell * (0.16 + 0.2 * uBend2) + cos(t2 + px * 1.1) * 0.1;
    vec2 a = sin(vec2(px, px + HALF_PI) + tSpeed1) * wob1;
    vec2 b = cos(vec2(px, px + HALF_PI) + tSpeed2) * wob2;
    float cut = px + uThickness;
    k.x = max(cut, length(p.yz - a) - uThickness);
    k.y = max(cut, length(p.yz - b) - uThickness);
    s = min(s, min(k.x, k.y));
    if (s < 0.001 || d > 300.0) break;
    d += s * 0.7;
  }
  vec3 raw = max(cos(d * TAU) - s * sqrt(d) - vec3(k, 0.0), 0.0);
  float field = max(raw.r, max(raw.g, raw.b));
  raw.gb += 0.1;
  raw = raw * 0.4 + raw.brg * 0.6 + raw * raw;
  float lum = dot(raw, vec3(0.299, 0.587, 0.114));
  float w1 = max(0.0, 1.0 - k.x * 2.0) + 0.0001;
  float w2 = max(0.0, 1.0 - k.y * 2.0) + 0.0001;
  vec3 base = (uColor1 * w1 + uColor2 * w2) / (w1 + w2);
  float soft = smoothstep(0.03, 0.36, field);
  float hot = smoothstep(0.32, 0.8, field);
  vec3 light = base * lum * 2.6 * soft + mix(base, vec3(1.0), 0.55) * hot * uCore * 2.0;
  return vec4(light * uRange, field);
}
`,ze=`${k}
${Se}
uniform vec2 uScale;
out vec4 outColor;
void main() {
  outColor = traceLight(gl_FragCoord.xy * uScale);
}`,qe=`${k}
${Se}
uniform vec2 uScale;
uniform sampler2D uCoarse;
uniform vec2 uCoarseSize;
uniform vec2 uFineSize;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uFineSize;
  vec2 pos = uv * uCoarseSize - 0.5;
  ivec2 cell = ivec2(floor(pos));
  ivec2 last = ivec2(uCoarseSize) - 1;
  float a = texelFetch(uCoarse, clamp(cell, ivec2(0), last), 0).a;
  float b = texelFetch(uCoarse, clamp(cell + ivec2(1, 0), ivec2(0), last), 0).a;
  float c = texelFetch(uCoarse, clamp(cell + ivec2(0, 1), ivec2(0), last), 0).a;
  float d = texelFetch(uCoarse, clamp(cell + ivec2(1, 1), ivec2(0), last), 0).a;
  float high = max(max(a, b), max(c, d));
  float low = min(min(a, b), min(c, d));
  if (high > 0.02 && low < 0.4) outColor = traceLight(gl_FragCoord.xy * uScale);
  else outColor = texture(uCoarse, uv);
}`,Ye=`${k}
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 sum = texture(uSource, uv) * 4.0;
  sum += texture(uSource, uv - uTexel);
  sum += texture(uSource, uv + uTexel);
  sum += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  sum += texture(uSource, uv - vec2(uTexel.x, -uTexel.y));
  outColor = sum / 8.0;
}`,$e=`${k}
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec2 h = uTexel * 0.5;
  vec4 sum = texture(uSource, uv + vec2(-h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(0.0, -h.y * 2.0));
  sum += texture(uSource, uv + vec2(0.0, h.y * 2.0));
  sum += texture(uSource, uv + vec2(-h.x, h.y)) * 2.0;
  sum += texture(uSource, uv + h) * 2.0;
  sum += texture(uSource, uv + vec2(h.x, -h.y)) * 2.0;
  sum += texture(uSource, uv - h) * 2.0;
  outColor = sum / 12.0 + texture(uBase, uv);
}`,Qe=`${k}
uniform sampler2D uLight;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform float uExposure;
uniform float uGlow;
uniform float uCore;
uniform float uPresence;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
uniform float uTime;
uniform float uLightMode;
uniform vec3 uLens;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 offset = gl_FragCoord.xy - uLens.xy;
  float lens = uLens.z * exp(-dot(offset, offset) / (uResolution.y * uResolution.y * 0.045));
  vec4 source = texture(uLight, uv);
  vec3 hdr = source.rgb * uExposure * uPresence * (1.0 + lens * 0.35);
  hdr += texture(uBloom, uv).rgb * uExposure * uPresence * uGlow * (0.18 + lens * 0.08);
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  float peak = max(hdr.r, max(hdr.g, hdr.b));
  if (uLightMode > 0.5) {
    vec3 hue = hdr / max(peak, 0.0001);
    float tone = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = pow(clamp(hue * min(1.0, 0.6 / max(tone, 0.001)), 0.0, 1.0), vec3(1.0 / 2.2));
    float feather = max(fwidth(source.a) * 1.25, 0.02);
    float body = smoothstep(0.15 - feather, 0.15 + feather, source.a) * uPresence;
    vec3 color = mix(ink, vec3(1.0), smoothstep(12.0, 26.0, peak) * uCore);
    float halo = (1.0 - exp(-peak * 0.5)) * 0.3 * min(uGlow, 1.5);
    float alpha = clamp(body * 0.92 + (1.0 - body) * halo, 0.0, 1.0) * mask * uOpacity;
    color = mix(ink, color, body);
    outColor = vec4(clamp(color + grain, 0.0, 1.0) * alpha, alpha);
  } else {
    vec3 mapped = 1.0 - exp(-hdr);
    float level = max(mapped.r, max(mapped.g, mapped.b));
    mapped = clamp(mapped + grain * level, 0.0, 1.0) * mask * uOpacity;
    outColor = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
  }
}`,F=4,Te=3,je=1.8,be=24e5,O=(a,l,g)=>Math.min(g,Math.max(l,a)),Ee=(a,l,g)=>{let p=a.createShader(l);return p?(a.shaderSource(p,g),a.compileShader(p),a.getShaderParameter(p,a.COMPILE_STATUS)?p:(a.deleteShader(p),null)):null},I=(a,l)=>{let g=Ee(a,a.VERTEX_SHADER,Ne),p=Ee(a,a.FRAGMENT_SHADER,l),h=a.createProgram();if(!g||!p||!h)return null;if(a.attachShader(h,g),a.attachShader(h,p),a.bindAttribLocation(h,0,"aPosition"),a.linkProgram(h),a.deleteShader(g),a.deleteShader(p),!a.getProgramParameter(h,a.LINK_STATUS))return a.deleteProgram(h),null;let U={},Y=a.getProgramParameter(h,a.ACTIVE_UNIFORMS);for(let _=0;_<Y;_++){let L=a.getActiveUniform(h,_);L&&(U[L.name]=a.getUniformLocation(h,L.name))}return{program:h,uniforms:U}};function ee({colors:a=["#A855F7","#06B6D4"],speed:l=1,speed1:g=.05,speed2:p=.05,dir2:h=1,bend1:U=1,bend2:Y=.5,thickness:_=.3,focalLength:L=1.25,rotationDeg:Re=0,xOffset:ye=0,yOffset:Ae=0,brightness:Ce=1,glow:Me=1,core:Fe=.6,grain:_e=.03,quality:Le=1,mouseInteraction:Pe=!0,intro:De=!0,fade:Be=0,opacity:Oe=1,lightMode:Ie=!1,paused:ke=!1,dpr:Ue,className:Xe="",...He}){let oe=(0,b.useRef)(null),re=(0,b.useRef)(null),$=(0,b.useRef)(null),ae={color1:String(a?.[0]??"#A855F7"),color2:String(a?.[1]??a?.[0]??"#06B6D4"),speed:l,speed1:g,speed2:p,dir2:h,bend1:U,bend2:Y,thickness:Math.max(.02,_),focalLength:Math.max(.05,L),rotation:Re*Math.PI/180,xOffset:ye,yOffset:Ae,brightness:Math.max(0,Ce),glow:Math.max(0,Me),core:O(Fe,0,1),grain:Math.max(0,_e),quality:O(Le,.25,1),mouseInteraction:Pe,intro:De,fade:O(Be,0,1),opacity:O(Oe,0,1),lightMode:Ie,paused:ke,dpr:Ue},w=(0,b.useRef)(ae);return w.current=ae,(0,b.useEffect)(()=>{let S=oe.current,x=re.current,e=x?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!S||!x||!e)return;let ne=!!e.getExtension("EXT_color_buffer_float"),ie=ne?1:.25,f={coarse:I(e,ze),fine:I(e,qe),down:I(e,Ye),up:I(e,$e),composite:I(e,Qe)};if(Object.values(f).some(t=>!t))return;let ue=e.createBuffer(),Q=e.createVertexArray();e.bindVertexArray(Q),e.bindBuffer(e.ARRAY_BUFFER,ue),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let X=()=>({texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0}),H=(t,o,n)=>{t.width===o&&t.height===n||(t.width=o,t.height=n,e.bindTexture(e.TEXTURE_2D,t.texture),ne?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,o,n,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,o,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},G=X(),P=X(),R=Array.from({length:F+1},X),V=Array.from({length:F},X),y=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),W=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,j=new Map,ce=t=>{if(j.has(t))return j.get(t);let o=[1,1,1];if(y){y.clearRect(0,0,1,1),y.fillStyle="#000000",y.fillStyle=t,y.fillRect(0,0,1,1);let[n,i,c]=y.getImageData(0,0,1,1).data;o=[n,i,c].map(s=>Math.pow(s/255,2.2))}return j.set(t,o),o},r={width:1,height:1,fineWidth:1,fineHeight:1,coarseWidth:1,coarseHeight:1},d={x:0,y:0,inside:!1},u={time:0,intro:w.current.intro&&!W?0:1,heat:0,heatVelocity:0,heatX:0,lensX:0,lensY:0},E=0,A=0,N=!0,D=(t,o,n,i)=>{e.bindFramebuffer(e.FRAMEBUFFER,o?o.framebuffer:null),e.viewport(0,0,n,i),e.useProgram(t.program),e.drawArrays(e.TRIANGLES,0,3)},C=(t,o,n,i)=>{e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,i),e.uniform1i(t.uniforms[o],n)},fe=(t,o,n)=>{let i=t.uniforms;e.useProgram(t.program),e.uniform2f(i.uView,r.width,r.height),e.uniform2f(i.uOffset,o.xOffset,o.yOffset),e.uniform1f(i.uRotation,o.rotation),e.uniform1f(i.uFocalLength,o.focalLength),e.uniform1f(i.uTime,u.time),e.uniform1f(i.uSpeed1,o.speed1),e.uniform1f(i.uSpeed2,o.speed2),e.uniform1f(i.uDir2,o.dir2),e.uniform1f(i.uBend1,o.bend1*(.3+.7*n)),e.uniform1f(i.uBend2,o.bend2*(.3+.7*n)),e.uniform1f(i.uThickness,o.thickness),e.uniform3f(i.uHeat,u.heatX,u.heat,1.4),e.uniform3fv(i.uColor1,ce(o.color1)),e.uniform3fv(i.uColor2,ce(o.color2)),e.uniform1f(i.uCore,o.core),e.uniform1f(i.uRange,ie)},K=()=>{let t=w.current,o=u.intro*u.intro*(3-2*u.intro);e.bindVertexArray(Q),H(G,r.coarseWidth,r.coarseHeight),H(P,r.fineWidth,r.fineHeight),fe(f.coarse,t,o),e.uniform2f(f.coarse.uniforms.uScale,r.width/r.coarseWidth,r.height/r.coarseHeight),D(f.coarse,G,r.coarseWidth,r.coarseHeight);let n=f.fine;fe(n,t,o),e.uniform2f(n.uniforms.uScale,r.width/r.fineWidth,r.height/r.fineHeight),e.uniform2f(n.uniforms.uCoarseSize,r.coarseWidth,r.coarseHeight),e.uniform2f(n.uniforms.uFineSize,r.fineWidth,r.fineHeight),C(n,"uCoarse",0,G.texture),D(n,P,r.fineWidth,r.fineHeight);let i=P;for(let m=0;m<=F;m++){let v=R[m],T=m===0?Math.round(r.width/2):i.width>>1,Ve=m===0?Math.round(r.height/2):i.height>>1;H(v,Math.max(1,T),Math.max(1,Ve)),e.useProgram(f.down.program),e.uniform2f(f.down.uniforms.uTexel,1/i.width,1/i.height),e.uniform2f(f.down.uniforms.uTarget,v.width,v.height),C(f.down,"uSource",0,i.texture),D(f.down,v,v.width,v.height),i=v}for(let m=F-1;m>=1;m--){let v=m===F-1?R[F]:V[m+1],T=V[m];H(T,R[m].width,R[m].height),e.useProgram(f.up.program),e.uniform2f(f.up.uniforms.uTexel,1/v.width,1/v.height),e.uniform2f(f.up.uniforms.uTarget,T.width,T.height),C(f.up,"uSource",0,v.texture),C(f.up,"uBase",1,R[m].texture),D(f.up,T,T.width,T.height)}let c=f.composite,s=c.uniforms;e.useProgram(c.program),e.uniform2f(s.uResolution,x.width,x.height),e.uniform1f(s.uExposure,2.4*t.brightness/ie),e.uniform1f(s.uGlow,t.glow),e.uniform1f(s.uCore,t.core),e.uniform1f(s.uPresence,o*o),e.uniform1f(s.uGrain,t.grain),e.uniform1f(s.uFade,t.fade),e.uniform1f(s.uOpacity,t.opacity),e.uniform1f(s.uTime,u.time),e.uniform1f(s.uLightMode,t.lightMode?1:0),e.uniform3f(s.uLens,u.lensX*x.width/r.width,(r.height-u.lensY)*x.height/r.height,u.heat),C(c,"uLight",0,P.texture),C(c,"uBloom",1,V[1].texture),D(c,null,x.width,x.height)},Ge=t=>{if(!(t.mouseInteraction&&d.inside)||W)return null;let o=d.x+t.xOffset-r.width/2,n=r.height-d.y+t.yOffset-r.height/2,i=Math.cos(t.rotation),c=Math.sin(t.rotation);return 7*(i*o+c*n)/r.height/t.focalLength-15},se=t=>{if(E=0,!N||document.hidden)return;let o=w.current,n=A?Math.min(.05,(t-A)/1e3):1/60;A=t;let i=!o.paused&&!W;i&&(u.time+=n*o.speed),!o.intro||W?u.intro=1:u.intro<1&&(u.intro=Math.min(1,u.intro+n/je));let c=Ge(o);c!==null&&(u.heatX+=(c-u.heatX)*(1-Math.exp(-n*6))),u.heatVelocity+=(120*((c===null?0:1)-u.heat)-19*u.heatVelocity)*n,u.heat=O(u.heat+u.heatVelocity*n,0,1.15),u.lensX+=(d.x-u.lensX)*(1-Math.exp(-n*8)),u.lensY+=(d.y-u.lensY)*(1-Math.exp(-n*8)),K();let s=u.intro<1||u.heat>.001||Math.abs(u.heatVelocity)>.001;i||s?E=requestAnimationFrame(se):A=0},M=()=>{!E&&N&&!document.hidden&&(E=requestAnimationFrame(se))},J=()=>{let t=w.current,o=Math.max(1,S.clientWidth),n=Math.max(1,S.clientHeight),i=Math.min(t.dpr||window.devicePixelRatio||1,2);r.width=o,r.height=n,x.width=Math.max(1,Math.round(o*i)),x.height=Math.max(1,Math.round(n*i));let c=t.quality;o*n*c*c>be&&(c=Math.sqrt(be/(o*n))),r.fineWidth=Math.max(1,Math.round(o*c)),r.fineHeight=Math.max(1,Math.round(n*c)),r.coarseWidth=Math.max(1,Math.round(r.fineWidth/Te)),r.coarseHeight=Math.max(1,Math.round(r.fineHeight/Te)),E||K(),M()},le=t=>{let o=S.getBoundingClientRect();d.x=t.clientX-o.left,d.y=t.clientY-o.top,d.inside=d.x>=0&&d.y>=0&&d.x<=o.width&&d.y<=o.height,M()},me=()=>{d.inside=!1,M()},he=()=>{A=0,M()},de=new ResizeObserver(J);de.observe(S);let pe=new IntersectionObserver(t=>{N=t.some(o=>o.isIntersecting),N&&(A=0,M())});pe.observe(S),window.addEventListener("pointermove",le,{passive:!0}),document.documentElement.addEventListener("pointerleave",me),document.addEventListener("visibilitychange",he),J();let ve=w.current.quality,xe=w.current.dpr;return $.current=()=>{let t=w.current;if(t.quality!==ve||t.dpr!==xe){ve=t.quality,xe=t.dpr,J();return}E||K(),M()},()=>{cancelAnimationFrame(E),$.current=null,de.disconnect(),pe.disconnect(),window.removeEventListener("pointermove",le),document.documentElement.removeEventListener("pointerleave",me),document.removeEventListener("visibilitychange",he);for(let t of[G,P,...R,...V])e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer);for(let t of Object.values(f))e.deleteProgram(t.program);e.deleteBuffer(ue),e.deleteVertexArray(Q),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,b.useEffect)(()=>{$.current?.()}),(0,Z.jsx)("div",{ref:oe,className:["relative h-full w-full overflow-hidden",Xe].filter(Boolean).join(" "),...He,children:(0,Z.jsx)("canvas",{ref:re,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})}var te=B(z(),1),Ke=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],q=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],at=Ke.map((a,l)=>({id:l+1,image:a,src:a,img:a,url:a,title:q[l],text:q[l],label:q[l],alt:q[l],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][l],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Je({big:a}){return(0,te.jsx)(we,{big:a,dark:!0,center:!1,zoom:1,drive:!1,children:(0,te.jsx)(ee,{})})}var nt=ge(Je);export{nt as default};
