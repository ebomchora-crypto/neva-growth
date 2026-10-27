import{c as _,i as Le,j as I,l as se,m as ue}from"./chunks/chunk-6IYH4WPJ.js";var b=_(Le(),1),z=_(I(),1),Ce=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,De=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform vec2 uScale;
uniform float uZoom;
uniform float uTime;
uniform float uTwist;
uniform float uWave;
uniform float uSharpness;
uniform vec2 uOrbit;
uniform float uDither;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 c = (gl_FragCoord.xy * uScale - 0.5 * uView) / uZoom;
  vec3 rd = normalize(vec3(c, uView.y));
  vec3 ro = vec3(0.0, 0.0, -4.0);
  float cy = cos(uOrbit.x);
  float sy = sin(uOrbit.x);
  float cx = cos(uOrbit.y);
  float sx = sin(uOrbit.y);
  mat3 orbit = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy) * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
  ro = orbit * ro;
  rd = orbit * rd;
  float z = 0.0;
  float density = 0.0;
  float band = 0.0;
  for (int i = 0; i < 60; i++) {
    vec3 p = ro + rd * z;
    vec3 s = p;
    float d = p.y - uTime;
    p.x += uWave * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
    vec2 q = p.xz *= mat2(cos(p.y * uTwist + vec4(0.0, 11.0, 33.0, 0.0) - uTime));
    float shell = abs(sqrt(length(q * q)) - 0.25 * (5.0 + s.y)) / 3.0;
    float stepLength = shell + 0.0008;
    z += stepLength;
    float phase = s.y + p.z * 0.5 + s.z - length(s - p);
    float weight = (1.0 + sin(phase + 8.0)) * exp(-shell * uSharpness) * stepLength;
    density += weight;
    band += weight * (0.5 + 0.5 * sin(phase * 0.5 + 1.0));
  }
  vec2 encoded = sqrt(vec2(density, band) / (1.0 + vec2(density, band)));
  encoded += (vec2(hash(gl_FragCoord.xy), hash(gl_FragCoord.yx + 17.0)) - 0.5) * uDither;
  outColor = vec4(encoded, 0.0, 1.0);
}`,Ie=`#version 300 es
precision highp float;
uniform sampler2D uVolume;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform vec3 uInk;
uniform float uGain;
uniform float uShine;
uniform float uPresence;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
uniform float uTime;
uniform float uLightMode;
uniform vec3 uHeat;
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
  vec2 encoded = clamp(texture(uVolume, uv).rg, 0.0, 0.9995);
  encoded *= encoded;
  vec2 volume = encoded / (1.0 - encoded);
  vec2 offset = (gl_FragCoord.xy - uHeat.xy) / uResolution.y;
  float heat = uHeat.z * exp(-dot(offset, offset) / 0.05);
  float density = volume.r * uGain * uPresence * (1.0 + heat * 0.35);
  float band = clamp(volume.g / max(volume.r, 0.00001), 0.0, 1.0);
  vec3 tint = mix(uColor, uHighlight, band * 0.35);
  vec3 hdr = tint * density + uHighlight * density * density * uShine;
  float peak = max(hdr.r, max(hdr.g, hdr.b));
  float level = 1.0 - exp(-peak);
  float hot = smoothstep(1.0, 3.0, peak);
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  mask *= uOpacity;
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  if (uLightMode > 0.5) {
    vec3 color = mix(uInk, vec3(1.0), hot * 0.75);
    float alpha = clamp(pow(level, 0.8) * 0.9 * (1.0 + grain), 0.0, 1.0) * mask;
    outColor = vec4(color * alpha, alpha);
  } else {
    vec3 hue = hdr / max(peak, 0.0001);
    vec3 color = mix(hue * level, vec3(level), hot * 0.6);
    color = pow(color, vec3(1.0 / 2.2));
    color = clamp(color + grain * level, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,Ue=1.6,le=16e5,U=(r,l,p)=>Math.min(p,Math.max(l,r)),fe=(r,l,p)=>{let h=r.createShader(l);return h?(r.shaderSource(h,p),r.compileShader(h),r.getShaderParameter(h,r.COMPILE_STATUS)?h:(r.deleteShader(h),null)):null},me=(r,l)=>{let p=fe(r,r.VERTEX_SHADER,Ce),h=fe(r,r.FRAGMENT_SHADER,l),f=r.createProgram();if(!p||!h||!f)return null;if(r.attachShader(f,p),r.attachShader(f,h),r.bindAttribLocation(f,0,"aPosition"),r.linkProgram(f),r.deleteShader(p),r.deleteShader(h),!r.getProgramParameter(f,r.LINK_STATUS))return r.deleteProgram(f),null;let F={},O=r.getProgramParameter(f,r.ACTIVE_UNIFORMS);for(let M=0;M<O;M++){let A=r.getActiveUniform(f,M);A&&(F[A.name]=r.getUniformLocation(f,A.name))}return{program:f,uniforms:F}},Ve=({color:r="#a6a3b8",speed:l=1,direction:p="forward",scale:h=1,twist:f=1,wave:F=1,softness:O=.5,shine:M=1,brightness:A=1,grain:de=.04,quality:pe=.75,mouseInteractive:ve=!0,intro:ge=!0,fade:xe=0,opacity:be=1,lightMode:ye=!1,paused:Ee=!1,dpr:we,className:Te="",...Re})=>{let Y=(0,b.useRef)(null),Z=(0,b.useRef)(null),k=(0,b.useRef)(null),Q={color:String(r),speed:l,direction:p,scale:Math.max(.1,h),twist:f,wave:Math.max(0,F),softness:U(O,0,1),shine:Math.max(0,M),brightness:Math.max(0,A),grain:Math.max(0,de),quality:U(pe,.25,1),mouseInteractive:ve,intro:ge,fade:U(xe,0,1),opacity:U(be,0,1),lightMode:ye,paused:Ee,dpr:we},g=(0,b.useRef)(Q);return g.current=Q,(0,b.useEffect)(()=>{let E=Y.current,d=Z.current,e=d?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!E||!d||!e)return;let K=!!e.getExtension("EXT_color_buffer_float"),J=me(e,De),$=me(e,Ie);if(!J||!$)return;let S={volume:J,composite:$},j=e.createBuffer(),X=e.createVertexArray();e.bindVertexArray(X),e.bindBuffer(e.ARRAY_BUFFER,j),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let P=e.createTexture(),B=e.createFramebuffer(),x={width:0,height:0},Me=(t,i)=>{x.width===t&&x.height===i||(x.width=t,x.height=i,e.bindTexture(e.TEXTURE_2D,P),K?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,i,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,B),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,P,0))},w=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),L=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,G=new Map,Ae=t=>{if(G.has(t))return G.get(t);let i=[1,1,1];if(w){w.clearRect(0,0,1,1),w.fillStyle="#ffffff",w.fillStyle=t,w.fillRect(0,0,1,1);let[a,n,c]=w.getImageData(0,0,1,1).data;i=[a,n,c].map(s=>Math.pow(s/255,2.2))}return G.set(t,i),i},u={width:1,height:1,volumeWidth:1,volumeHeight:1},m={x:0,y:0,inside:!1},o={clock:0,intro:g.current.intro&&!L?0:1,yaw:0,pitch:0,yawVelocity:0,pitchVelocity:0,heat:0,heatX:0,heatY:0},y=0,T=0,C=!0,_e=t=>{let i=o.clock*.4;if(t.direction==="reverse")return-i;if(t.direction!=="pingpong")return i;let a=10,n=o.clock%a/a,c=n*n*(3-2*n);return(Math.floor(o.clock/a)%2===0?c:1-c)*a*.4},N=()=>{let t=g.current,i=o.intro*o.intro*(3-2*o.intro);e.bindVertexArray(X),Me(u.volumeWidth,u.volumeHeight);let a=S.volume,n=a.uniforms;e.bindFramebuffer(e.FRAMEBUFFER,B),e.viewport(0,0,x.width,x.height),e.useProgram(a.program),e.uniform2f(n.uView,u.width,u.height),e.uniform2f(n.uScale,u.width/x.width,u.height/x.height),e.uniform1f(n.uZoom,t.scale),e.uniform1f(n.uTime,_e(t)+(1-i)*1.4),e.uniform1f(n.uTwist,t.twist),e.uniform1f(n.uWave,.4*t.wave),e.uniform1f(n.uSharpness,100-t.softness*90),e.uniform2f(n.uOrbit,o.yaw,o.pitch),e.uniform1f(n.uDither,K?0:1/255),e.drawArrays(e.TRIANGLES,0,3);let c=S.composite,s=c.uniforms,v=Ae(t.color),q=v.map(D=>D+(1-D)*.85),Fe=.2126*v[0]+.7152*v[1]+.0722*v[2],Se=Math.min(1,.16/Math.max(Fe,.001)),Pe=v.map(D=>Math.pow(Math.min(1,D*Se),1/2.2));e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,d.width,d.height),e.useProgram(c.program),e.uniform2f(s.uResolution,d.width,d.height),e.uniform3fv(s.uColor,v),e.uniform3fv(s.uHighlight,q),e.uniform3fv(s.uInk,Pe),e.uniform1f(s.uGain,4.8*t.brightness),e.uniform1f(s.uShine,.025*t.shine),e.uniform1f(s.uPresence,i),e.uniform1f(s.uGrain,t.grain),e.uniform1f(s.uFade,t.fade),e.uniform1f(s.uOpacity,t.opacity),e.uniform1f(s.uTime,o.clock%1e3),e.uniform1f(s.uLightMode,t.lightMode?1:0),e.uniform3f(s.uHeat,o.heatX*d.width/u.width,(u.height-o.heatY)*d.height/u.height,o.heat),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,P),e.uniform1i(s.uVolume,0),e.drawArrays(e.TRIANGLES,0,3)},ee=t=>{if(y=0,!C||document.hidden)return;let i=g.current,a=T?Math.min(.05,(t-T)/1e3):1/60;T=t;let n=!i.paused&&!L;n&&(o.clock+=a*i.speed),!i.intro||L?o.intro=1:o.intro<1&&(o.intro=Math.min(1,o.intro+a/Ue));let c=i.mouseInteractive&&m.inside&&!L,s=c?(m.x/u.width-.5)*.9:0,v=c?(m.y/u.height-.5)*.18:0;o.yawVelocity+=(40*(s-o.yaw)-11*o.yawVelocity)*a,o.pitchVelocity+=(40*(v-o.pitch)-11*o.pitchVelocity)*a,o.yaw+=o.yawVelocity*a,o.pitch+=o.pitchVelocity*a,o.heat+=((c?1:0)-o.heat)*(1-Math.exp(-a*(c?4:2))),o.heatX+=(m.x-o.heatX)*(1-Math.exp(-a*8)),o.heatY+=(m.y-o.heatY)*(1-Math.exp(-a*8)),N();let q=o.intro<1||Math.abs(s-o.yaw)>5e-4||Math.abs(o.yawVelocity)>5e-4||Math.abs(v-o.pitch)>5e-4||Math.abs(o.pitchVelocity)>5e-4||Math.abs((c?1:0)-o.heat)>.002;n||q?y=requestAnimationFrame(ee):T=0},R=()=>{!y&&C&&!document.hidden&&(y=requestAnimationFrame(ee))},H=()=>{let t=g.current,i=Math.max(1,E.clientWidth),a=Math.max(1,E.clientHeight),n=Math.min(t.dpr||window.devicePixelRatio||1,2);u.width=i,u.height=a,d.width=Math.max(1,Math.round(i*n)),d.height=Math.max(1,Math.round(a*n));let c=t.quality;i*a*c*c>le&&(c=Math.sqrt(le/(i*a))),u.volumeWidth=Math.max(1,Math.round(i*c)),u.volumeHeight=Math.max(1,Math.round(a*c)),y||N(),R()},te=t=>{let i=E.getBoundingClientRect();m.x=t.clientX-i.left,m.y=t.clientY-i.top,m.inside=m.x>=0&&m.y>=0&&m.x<=i.width&&m.y<=i.height,R()},oe=()=>{m.inside=!1,R()},re=()=>{T=0,R()},ie=new ResizeObserver(H);ie.observe(E);let ae=new IntersectionObserver(t=>{C=t.some(i=>i.isIntersecting),C&&(T=0,R())});ae.observe(E),window.addEventListener("pointermove",te,{passive:!0}),document.documentElement.addEventListener("pointerleave",oe),document.addEventListener("visibilitychange",re),H();let ne=g.current.quality,ce=g.current.dpr;return k.current=()=>{let t=g.current;if(t.quality!==ne||t.dpr!==ce){ne=t.quality,ce=t.dpr,H();return}y||N(),R()},()=>{cancelAnimationFrame(y),k.current=null,ie.disconnect(),ae.disconnect(),window.removeEventListener("pointermove",te),document.documentElement.removeEventListener("pointerleave",oe),document.removeEventListener("visibilitychange",re),e.deleteTexture(P),e.deleteFramebuffer(B),e.deleteProgram(S.volume.program),e.deleteProgram(S.composite.program),e.deleteBuffer(j),e.deleteVertexArray(X),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,b.useEffect)(()=>{k.current?.()}),(0,z.jsx)("div",{ref:Y,className:["relative h-full w-full overflow-hidden",Te].filter(Boolean).join(" "),...Re,children:(0,z.jsx)("canvas",{ref:Z,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},he=Ve;var W=_(I(),1),Oe=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],V=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],qe=Oe.map((r,l)=>({id:l+1,image:r,src:r,img:r,url:r,title:V[l],text:V[l],label:V[l],alt:V[l],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][l],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function ke({big:r}){return(0,W.jsx)(ue,{big:r,dark:!0,center:!1,zoom:1,drive:!1,children:(0,W.jsx)(he,{})})}var ze=se(ke);export{ze as default};
