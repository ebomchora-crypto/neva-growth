import{c as A,i as Ce,j as U,l as ue,m as se}from"./chunks/chunk-6IYH4WPJ.js";var b=A(Ce(),1),Y=A(U(),1),Ue=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Xe=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform vec2 uScale;
uniform vec2 uTurn;
uniform float uTime;
uniform float uWidth;
uniform float uWave;
uniform float uDepth;
uniform float uRough;
uniform float uSeed;
uniform float uTwist;
uniform vec3 uLight;
uniform float uFill;
uniform float uCamera;
uniform vec4 uPointer;
out vec4 outColor;

const float PI = 3.141592653589793;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

float laneHash(float lane) {
  return fract(sin(lane * 91.3458 + uSeed * 17.17) * 47453.5453);
}

float lobe(float nh, float nl, float nv, float vh, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  float distribution = a2 / (PI * d * d);
  float gv = nl * sqrt(nv * nv * (1.0 - a2) + a2);
  float gl = nv * sqrt(nl * nl * (1.0 - a2) + a2);
  float visibility = 0.5 / max(gv + gl, 0.0001);
  float fresnel = 0.028 + 0.972 * pow(1.0 - vh, 5.0);
  return distribution * visibility * fresnel * nl;
}

vec2 glint(float lane, vec2 local) {
  float along = local.y / uWave - laneHash(lane) * 60.0;
  float step = 0.01;
  float slope = (cnoise(vec3(0.0, along + step, uTime)) - cnoise(vec3(0.0, along - step, uTime))) / (2.0 * step);
  slope *= 0.2 * uDepth;
  float spin = laneHash(lane + 0.37);
  float tilt = ((spin - 0.5) * 0.5 + sin(uTime * 2.1 + spin * 6.2831) * 0.06) * uTwist;
  vec3 normal = normalize(vec3(tilt, -slope, 1.0));
  vec3 view = normalize(vec3(-local, uCamera));
  float nv = max(dot(normal, view), 0.0001);
  vec3 light = normalize(uLight);
  vec3 halfway = normalize(light + view);
  float core = lobe(max(dot(normal, halfway), 0.0), max(dot(normal, light), 0.0), nv, max(dot(view, halfway), 0.0), uRough);
  vec3 fill = normalize(vec3(0.0, -uLight.y * 1.25, uLight.z));
  vec3 fillHalf = normalize(fill + view);
  core += uFill * lobe(max(dot(normal, fillHalf), 0.0), max(dot(normal, fill), 0.0), nv, max(dot(view, fillHalf), 0.0), uRough);
  return vec2(core, core);
}

void main() {
  vec2 css = gl_FragCoord.xy * uScale;
  vec2 centered = css - uView * 0.5;
  vec2 local = mat2(uTurn.x, -uTurn.y, uTurn.y, uTurn.x) * centered;

  float across = local.x / uWidth + 0.5;
  float lane = floor(across);
  float u = across - lane;
  vec2 value = glint(lane, local);

  float pixel = max(uScale.x, uScale.y);
  float seam = min(u, 1.0 - u) * uWidth;
  if (seam < pixel * 1.5) {
    float other = u < 0.5 ? lane - 1.0 : lane + 1.0;
    float blend = 0.5 * (1.0 - smoothstep(0.0, pixel * 1.5, seam));
    value = mix(value, glint(other, local), blend);
  }

  vec2 toPointer = css - uPointer.xy;
  float near = exp(-dot(toPointer, toPointer) / (2.0 * uPointer.w * uPointer.w)) * uPointer.z;
  value *= 1.0 + near * 0.8;
  float hot = max(value.y - 0.18, 0.0);
  outColor = vec4(value.x, value.y, min(hot, 6.0), 1.0);
}`,Ge=`#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec3 uInk;
uniform float uGain;
uniform float uGlow;
uniform float uPresence;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
uniform float uLightMode;
out vec4 outColor;

float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}

float grainNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 acesFilmic(vec3 color) {
  const mat3 inputMatrix = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777)
  );
  const mat3 outputMatrix = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602)
  );
  color = inputMatrix * (color / 0.6);
  vec3 a = color * (color + 0.0245786) - 0.000090537;
  vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
  color = outputMatrix * (a / b);
  return clamp(color, 0.0, 1.0);
}

vec3 toSrgb(vec3 color) {
  return mix(color * 12.92, 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), color));
}

float feather(float x, float edge) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float radiance = textureLod(uField, uv, 0.0).r;
  float bloom = 0.0;
  bloom += textureLod(uField, uv, 2.0).b * 0.3;
  bloom += textureLod(uField, uv, 3.0).b * 0.3;
  bloom += textureLod(uField, uv, 4.0).b * 0.22;
  bloom += textureLod(uField, uv, 5.0).b * 0.18;

  float hot = textureLod(uField, uv, 0.0).g;
  vec3 light = uColor * (radiance + bloom * uGlow) * uGain;
  light += mix(uColor, vec3(1.0), 0.7) * hot * hot * 0.12 * uGain;
  light *= uPresence;
  vec3 color = toSrgb(acesFilmic(light));
  color -= grainNoise(gl_FragCoord.xy) / 15.0 * uGrain;
  color = max(color, 0.0);

  float edge = uFade * 0.5;
  float mask = feather(uv.x, edge) * feather(1.0 - uv.x, edge) * feather(uv.y, edge) * feather(1.0 - uv.y, edge);
  mask *= uOpacity;
  float dither = (random(gl_FragCoord.yx + 31.7) - 0.5) / 255.0;

  float peak = max(color.r, max(color.g, color.b));
  if (uLightMode > 0.5) {
    float alpha = clamp(peak * 0.9 + dither, 0.0, 1.0) * mask;
    outColor = vec4(uInk * alpha, alpha);
  } else {
    color = clamp(color + dither, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,ke=1.6,me=16e5,E=(o,s,v)=>Math.min(v,Math.max(s,o)),de=(o,s,v)=>{let d=o.createShader(s);return d?(o.shaderSource(d,v),o.compileShader(d),o.getShaderParameter(d,o.COMPILE_STATUS)?d:(o.deleteShader(d),null)):null},ge=(o,s)=>{let v=de(o,o.VERTEX_SHADER,Ue),d=de(o,o.FRAGMENT_SHADER,s),m=o.createProgram();if(!v||!d||!m)return null;if(o.attachShader(m,v),o.attachShader(m,d),o.bindAttribLocation(m,0,"aPosition"),o.linkProgram(m),o.deleteShader(v),o.deleteShader(d),!o.getProgramParameter(m,o.LINK_STATUS))return o.deleteProgram(m),null;let S={},G=o.getProgramParameter(m,o.ACTIVE_UNIFORMS);for(let _=0;_<G;_++){let F=o.getActiveUniform(m,_);F&&(S[F.name]=o.getUniformLocation(m,F.name))}return{program:m,uniforms:S}},Ne=({color:o="#ffffff",beamWidth:s=140,rotation:v=30,speed:d=1,waveLength:m=233,depth:S=1,sharpness:G=.6,twist:_=0,fillLight:F=.3,glow:he=.6,brightness:xe=1.6,variation:pe=0,grain:ye=.35,quality:be=.75,mouseInteraction:Pe=!0,mouseStrength:we=1,intro:Ee=!0,fade:Te=0,opacity:Me=1,lightMode:ze=!1,backgroundColor:K,paused:Re=!1,dpr:_e,className:Fe="",style:J,...Ae})=>{let Z=(0,b.useRef)(null),$=(0,b.useRef)(null),k=(0,b.useRef)(null),j={color:String(o),beamWidth:Math.max(8,s),rotation:v,speed:d,waveLength:Math.max(20,m),depth:Math.max(0,S),sharpness:E(G,0,1),twist:E(_,0,2),fillLight:E(F,0,1.5),glow:Math.max(0,he),brightness:Math.max(0,xe),variation:Number(pe)||0,grain:Math.max(0,ye),quality:E(be,.25,1),mouseInteraction:Pe,mouseStrength:Math.max(0,we),intro:Ee,fade:E(Te,0,1),opacity:E(Me,0,1),lightMode:ze,paused:Re,dpr:_e},x=(0,b.useRef)(j);return x.current=j,(0,b.useEffect)(()=>{let T=Z.current,p=$.current,e=p?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!T||!p||!e)return;let Se=!!e.getExtension("EXT_color_buffer_float"),L=ge(e,Xe),I=ge(e,Ge);if(!L||!I)return;let ee=e.createBuffer(),N=e.createVertexArray();e.bindVertexArray(N),e.bindBuffer(e.ARRAY_BUFFER,ee),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let h=null,B=e.createFramebuffer(),y={width:0,height:0},Le=(t,a)=>{if(y.width===t&&y.height===a)return;y.width=t,y.height=a,h&&e.deleteTexture(h),h=e.createTexture(),e.bindTexture(e.TEXTURE_2D,h);let n=Math.floor(Math.log2(Math.max(t,a)))+1;e.texStorage2D(e.TEXTURE_2D,n,Se?e.RGBA16F:e.RGBA8,t,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,B),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,h,0)},M=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),D=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,te=new Map,Ie=t=>{let a=te.get(t);if(a)return a;let n=[1,1,1];if(M){M.clearRect(0,0,1,1),M.fillStyle="#ffffff",M.fillStyle=t,M.fillRect(0,0,1,1);let[g,u,i]=M.getImageData(0,0,1,1).data;n=[g,u,i].map(l=>Math.pow(l/255,2.2))}return te.set(t,n),n},c={width:1,height:1,fieldWidth:1,fieldHeight:1},f={x:0,y:0,inside:!1},r={clock:0,intro:x.current.intro&&!D?0:1,reach:0,x:0,y:0,lightY:0},P=0,z=0,C=!0,O=()=>{let t=x.current,a=r.intro*r.intro*r.intro*(r.intro*(r.intro*6-15)+10);e.bindVertexArray(N),Le(c.fieldWidth,c.fieldHeight);let n=t.rotation*Math.PI/180,g=(1-a)*-9,u=r.reach*t.mouseStrength,i=L.uniforms;e.bindFramebuffer(e.FRAMEBUFFER,B),e.viewport(0,0,y.width,y.height),e.useProgram(L.program),e.uniform2f(i.uView,c.width,c.height),e.uniform2f(i.uScale,c.width/y.width,c.height/y.height),e.uniform2f(i.uTurn,Math.cos(n),Math.sin(n)),e.uniform1f(i.uTime,r.clock*.12%289),e.uniform1f(i.uWidth,t.beamWidth),e.uniform1f(i.uWave,t.waveLength),e.uniform1f(i.uDepth,t.depth),e.uniform1f(i.uRough,.55-t.sharpness*.5),e.uniform1f(i.uSeed,t.variation),e.uniform1f(i.uTwist,t.twist),e.uniform1f(i.uFill,t.fillLight),e.uniform3f(i.uLight,0,3+g+r.lightY*u,10),e.uniform1f(i.uCamera,c.height*1.866),e.uniform4f(i.uPointer,r.x,c.height-r.y,u,Math.max(c.height,c.width)*.28),e.drawArrays(e.TRIANGLES,0,3),e.bindTexture(e.TEXTURE_2D,h),e.generateMipmap(e.TEXTURE_2D);let l=I.uniforms,w=Ie(t.color),q=.2126*w[0]+.7152*w[1]+.0722*w[2],H=Math.min(1,.18/Math.max(q,.001)),V=w.map(De=>Math.pow(Math.min(1,De*H),1/2.2));e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,p.width,p.height),e.useProgram(I.program),e.uniform2f(l.uResolution,p.width,p.height),e.uniform3fv(l.uColor,w),e.uniform3fv(l.uInk,V),e.uniform1f(l.uGain,t.brightness),e.uniform1f(l.uGlow,t.glow),e.uniform1f(l.uPresence,a),e.uniform1f(l.uGrain,t.grain*1.75),e.uniform1f(l.uFade,t.fade),e.uniform1f(l.uOpacity,t.opacity),e.uniform1f(l.uLightMode,t.lightMode?1:0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,h),e.uniform1i(l.uField,0),e.drawArrays(e.TRIANGLES,0,3)},oe=t=>{if(P=0,!C||document.hidden)return;let a=x.current,n=z?Math.min(.05,(t-z)/1e3):1/60;z=t;let g=!a.paused&&!D;g&&(r.clock+=n*a.speed),!a.intro||D?r.intro=1:r.intro<1&&(r.intro=Math.min(1,r.intro+n/ke));let u=a.mouseInteraction&&f.inside&&!D;u&&r.reach<.01&&(r.x=f.x,r.y=f.y);let i=1-Math.exp(-n*7);r.x+=(f.x-r.x)*i,r.y+=(f.y-r.y)*i,r.reach+=((u?1:0)-r.reach)*(1-Math.exp(-n*(u?3.2:1.8)));let l=a.rotation*Math.PI/180,w=r.x-c.width/2,q=c.height/2-r.y,H=-Math.sin(l)*w+Math.cos(l)*q;r.lightY=E(H/(c.height*.5)*3,-4,4),O();let V=r.intro<1||Math.abs((u?1:0)-r.reach)>.002||Math.abs(f.x-r.x)+Math.abs(f.y-r.y)>.3;g||V?P=requestAnimationFrame(oe):z=0},R=()=>{!P&&C&&!document.hidden&&(P=requestAnimationFrame(oe))},W=()=>{let t=x.current,a=Math.max(1,T.clientWidth),n=Math.max(1,T.clientHeight),g=Math.min(t.dpr||window.devicePixelRatio||1,2);c.width=a,c.height=n,p.width=Math.max(1,Math.round(a*g)),p.height=Math.max(1,Math.round(n*g));let u=t.quality*g;a*n*u*u>me&&(u=Math.sqrt(me/(a*n))),c.fieldWidth=Math.max(1,Math.round(a*u)),c.fieldHeight=Math.max(1,Math.round(n*u)),P||O(),R()},re=t=>{let a=T.getBoundingClientRect();f.x=t.clientX-a.left,f.y=t.clientY-a.top,f.inside=f.x>=0&&f.y>=0&&f.x<=a.width&&f.y<=a.height,R()},ae=()=>{f.inside=!1,R()},ne=()=>{z=0,R()},ie=new ResizeObserver(W);ie.observe(T);let ce=new IntersectionObserver(t=>{C=t.some(a=>a.isIntersecting),C&&(z=0,R())});ce.observe(T),window.addEventListener("pointermove",re,{passive:!0}),document.documentElement.addEventListener("pointerleave",ae),document.addEventListener("visibilitychange",ne),W();let le=x.current.quality,fe=x.current.dpr;return k.current=()=>{let t=x.current;if(t.quality!==le||t.dpr!==fe){le=t.quality,fe=t.dpr,W();return}P||O(),R()},()=>{cancelAnimationFrame(P),k.current=null,ie.disconnect(),ce.disconnect(),window.removeEventListener("pointermove",re),document.documentElement.removeEventListener("pointerleave",ae),document.removeEventListener("visibilitychange",ne),h&&e.deleteTexture(h),e.deleteFramebuffer(B),e.deleteProgram(L.program),e.deleteProgram(I.program),e.deleteBuffer(ee),e.deleteVertexArray(N),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,b.useEffect)(()=>{k.current?.()}),(0,Y.jsx)("div",{ref:Z,className:["relative h-full w-full overflow-hidden",Fe].filter(Boolean).join(" "),style:K?{background:K,...J}:J,...Ae,children:(0,Y.jsx)("canvas",{ref:$,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ve=Ne;var Q=A(U(),1),Be=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],X=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Qe=Be.map((o,s)=>({id:s+1,image:o,src:o,img:o,url:o,title:X[s],text:X[s],label:X[s],alt:X[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Oe({big:o}){return(0,Q.jsx)(se,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Q.jsx)(ve,{})})}var Ke=ue(Oe);export{Ke as default};
