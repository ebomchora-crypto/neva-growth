import{c as R,i as Ae,j as I,l as ne,m as ce}from"./chunks/chunk-6IYH4WPJ.js";var f=R(Ae(),1),x=R(I(),1),_e=["window","card"],ze=1.24,Ie="relative flex-none will-change-transform",Me="pointer-events-none absolute top-[-12%] left-[-12%] block h-[124%] w-[124%]",Ue="absolute top-[8.33%] left-[8.33%] h-[83.33%] w-[83.33%] object-cover",De="pointer-events-none absolute right-[8.33%] bottom-[8.33%] left-[8.33%] p-5 text-white",Ce=`#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`,Pe=`#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uSize;
uniform vec2 uImageSize;
uniform float uUnit;
uniform float uScale;
uniform float uIdle;
uniform float uFrequency;
uniform int uOctaves;
uniform float uSeed;
uniform float uRadius;
uniform float uTime;
uniform float uFlow;
uniform float uChroma;
uniform float uGray;
uniform float uReady;
in vec2 vUv;
out vec4 fragColor;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n = 1.0 / 7.0;
  vec3 ns = n * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float turbulence(vec2 p, float z) {
  float sum = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uOctaves) break;
    sum += abs(snoise(vec3(p, z))) * amp;
    p = p * 2.0 + 19.19;
    amp *= 0.5;
  }
  return clamp(sum * 0.45 + 0.231, 0.0, 1.0);
}

float roundedBox(vec2 p, vec2 extent, float r) {
  vec2 q = abs(p) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 sampleImage(vec2 view) {
  vec2 uv = view / vec2(600.0, 750.0);
  float card = 600.0 / 750.0;
  float image = uImageSize.x / max(1.0, uImageSize.y);
  vec2 scale = card > image ? vec2(1.0, image / card) : vec2(card / image, 1.0);
  return texture(uImage, (uv - 0.5) * scale + 0.5).rgb;
}

void main() {
  vec2 view = vec2(300.0, 375.0) + (vUv * uSize - uSize * 0.5) / uUnit;
  float inside = min(min(view.x, 600.0 - view.x), min(view.y, 750.0 - view.y));
  float rim = 1.0 - smoothstep(0.0, 160.0, inside);
  float drift = snoise(vec3(view * 0.004 + uSeed * 0.37, uTime * 0.12)) * 0.5 + 0.5;
  float idle = uIdle * mix(smoothstep(0.55, 0.95, drift) * 0.5, 0.25 + 0.75 * smoothstep(0.3, 0.8, drift), rim);
  float scale = uScale * mix(0.2, 1.0, rim) + idle * 120.0;
  vec2 offset = vec2(0.0);
  if (scale > 0.01) {
    vec2 p = view * uFrequency + vec2(uSeed * 17.31, uSeed * 9.17);
    float z = uTime * (uFlow * 0.35 + uIdle * 0.5) + uSeed * 3.1;
    float red = turbulence(p, z);
    float blue = turbulence(p + vec2(31.7, 47.3), z + 5.3);
    offset = scale * (vec2(red, blue) - 0.5);
  }
  vec2 source = view + offset;
  float edge = roundedBox(source - vec2(300.0, 375.0), vec2(300.0, 375.0), uRadius);
  float alpha = (1.0 - smoothstep(-0.75 / uUnit, 0.75 / uUnit, edge)) * uReady;
  vec3 color = sampleImage(source);
  if (uChroma > 0.0) {
    vec2 split = offset * uChroma * 0.08 + vec2(uChroma * min(scale, 200.0) * 0.012, 0.0);
    color.r = sampleImage(source + split).r;
    color.b = sampleImage(source - split).b;
  }
  color = mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), uGray);
  fragColor = vec4(color * alpha, alpha);
}`,l=(a,i,h)=>Math.min(h,Math.max(i,a)),se=(a,i)=>a>i?i+(a-i)*.2:a<-i?-i+(a+i)*.2:a,le=(a,i,h)=>{let m=a.createShader(i);return m?(a.shaderSource(m,h),a.compileShader(m),a.getShaderParameter(m,a.COMPILE_STATUS)?m:(a.deleteShader(m),null)):null},Le=({image:a="https://images.unsplash.com/photo-1762846818262-33c197852fa8?w=900&q=80&auto=format&fit=crop",width:i=300,height:h=400,intensity:m=.5,sensitivity:me=.5,hoverDecay:de=.05,recovery:ve=.6,grain:xe=.25,detail:he=5,pattern:pe=4,idle:ye=.35,flow:ge=0,chroma:we=0,travel:be=50,tilt:Ee=10,scope:G="window",radius:Y=0,grayscale:O=!1,children:q,className:W="",style:Te})=>{let H=(0,f.useRef)(null),k=(0,f.useRef)(null),U=(0,f.useRef)(null),D=(0,f.useRef)(null),[Re,p]=(0,f.useState)(!1),$={intensity:l(m,0,2),sensitivity:l(me,0,1),hoverDecay:l(de,0,1),recovery:Math.max(.05,ve),frequency:.003+l(xe,0,1)*.047,octaves:l(Math.round(he),1,8),seed:Math.round(pe),idle:l(ye,0,1),flow:l(ge,0,2),chroma:l(we,0,2),travel:Math.max(0,be),tilt:l(Ee,0,45),scope:_e.includes(G)?G:"window",radius:Math.max(0,Y),grayscale:O},C=(0,f.useRef)($);return C.current=$,(0,f.useEffect)(()=>{let d=H.current,u=k.current;if(!d||!u)return;let v=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,e=u.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1}),s=null,y=null,P=null,n={};if(e){let o=le(e,e.VERTEX_SHADER,Ce),r=le(e,e.FRAGMENT_SHADER,Pe);if(o&&r&&(s=e.createProgram(),e.attachShader(s,o),e.attachShader(s,r),e.bindAttribLocation(s,0,"position"),e.linkProgram(s),e.deleteShader(o),e.deleteShader(r),e.getProgramParameter(s,e.LINK_STATUS)||(e.deleteProgram(s),s=null)),s){P=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,P),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),y=e.createTexture(),e.bindTexture(e.TEXTURE_2D,y),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));for(let c of["uImage","uSize","uImageSize","uUnit","uScale","uIdle","uFrequency","uOctaves","uSeed","uRadius","uTime","uFlow","uChroma","uGray","uReady"])n[c]=e.getUniformLocation(s,c)}}s||p(!0);let t={x:0,y:0,rotate:0,level:0,time:0,cursorX:window.innerWidth/2,cursorY:window.innerHeight/2,lastX:window.innerWidth/2,lastY:window.innerHeight/2,seen:!1,hovered:!1,visible:!0,ready:!1,imageWidth:1,imageHeight:1},g=0,L=performance.now(),w=!0,S=0,X=0,A=()=>{if(!e||!s)return;let o=C.current,r=u.width,c=u.height;if(!r||!c)return;let E=Math.max(r/720,c/900)/ze;e.viewport(0,0,r,c),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(s),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,y),e.uniform1i(n.uImage,0),e.uniform2f(n.uSize,r,c),e.uniform2f(n.uImageSize,t.imageWidth,t.imageHeight),e.uniform1f(n.uUnit,E),e.uniform1f(n.uScale,t.level*o.intensity*440),e.uniform1f(n.uIdle,o.idle),e.uniform1f(n.uFrequency,o.frequency),e.uniform1i(n.uOctaves,o.octaves),e.uniform1f(n.uSeed,o.seed),e.uniform1f(n.uRadius,Math.min(300,o.radius*(r/Math.max(1,u.clientWidth))/E)),e.uniform1f(n.uTime,t.time),e.uniform1f(n.uFlow,v?0:o.flow),e.uniform1f(n.uChroma,o.chroma),e.uniform1f(n.uGray,o.grayscale?1:0),e.uniform1f(n.uReady,t.ready?1:0),e.drawArrays(e.TRIANGLES,0,3)},V=o=>{if(g=0,!w)return;let r=C.current,c=Math.min(.05,Math.max(.001,(o-L)/1e3));L=o,t.time+=c;let E=Math.hypot(t.cursorX-t.lastX,t.cursorY-t.lastY)/c;t.lastX=t.cursorX,t.lastY=t.cursorY;let _=0,F=0;if(r.scope==="card"){if(t.hovered){let z=d.getBoundingClientRect();_=l((t.cursorX-z.left)/Math.max(1,z.width)*2-1,-1,1),F=l((t.cursorY-z.top)/Math.max(1,z.height)*2-1,-1,1)}}else t.seen&&(_=l(t.cursorX/Math.max(1,window.innerWidth)*2-1,-1,1),F=l(t.cursorY/Math.max(1,window.innerHeight)*2-1,-1,1));let B=1-Math.exp(-c/.16),te=v?0:se(_*120,r.travel),re=v?0:se(F*120,r.travel),oe=v?0:_*r.tilt;t.x+=(te-t.x)*B,t.y+=(re-t.y)*B,t.rotate+=(oe-t.rotate)*B;let T=r.scope==="window"||t.hovered?l(E/(2400-2100*r.sensitivity),0,1)**2:0;t.hovered&&(T=Math.max(T,r.hoverDecay));let Se=T>t.level?.08:r.recovery;t.level+=(T-t.level)*(1-Math.exp(-c/Se)),d.style.transform=`translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0) rotate(${t.rotate.toFixed(3)}deg)`;let ae=Math.abs(te-t.x)+Math.abs(re-t.y)+Math.abs(oe-t.rotate)>.05||Math.abs(T-t.level)>.002||t.level>.002&&r.flow>0&&!v||E>1,ie=r.idle>0&&!v;X=(X+1)%2,(ae||!ie||X===0)&&A(),S=ae?0:S+c,t.visible&&(S<.25||ie)&&(g=requestAnimationFrame(V))},b=()=>{g||!w||!t.visible||(S=0,L=performance.now(),g=requestAnimationFrame(V))};D.current=b;let K=()=>{let o=Math.min(window.devicePixelRatio||1,2),r=Math.max(1,Math.round(u.clientWidth*o)),c=Math.max(1,Math.round(u.clientHeight*o));(u.width!==r||u.height!==c)&&(u.width=r,u.height=c),A()};U.current=o=>{if(t.ready=!1,A(),!o)return;let r=new Image;r.crossOrigin="anonymous",r.decoding="async",r.onload=()=>{if(w){if(!e||!s){p(!0);return}try{e.bindTexture(e.TEXTURE_2D,y),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r),e.generateMipmap(e.TEXTURE_2D),t.imageWidth=r.naturalWidth||1,t.imageHeight=r.naturalHeight||1,t.ready=!0,p(!1),A()}catch{p(!0)}}},r.onerror=()=>{w&&p(!0)},r.src=o};let j=o=>{t.cursorX=o.clientX,t.cursorY=o.clientY,t.seen||(t.seen=!0,t.lastX=o.clientX,t.lastY=o.clientY),b()},J=()=>{t.hovered=!0,b()},Q=()=>{t.hovered=!1,b()},Z=new ResizeObserver(K);Z.observe(u);let ee=new IntersectionObserver(o=>{t.visible=o.some(r=>r.isIntersecting),t.visible&&b()});return ee.observe(d),window.addEventListener("pointermove",j,{passive:!0}),d.addEventListener("pointerenter",J),d.addEventListener("pointerleave",Q),K(),()=>{w=!1,cancelAnimationFrame(g),D.current=null,U.current=null,Z.disconnect(),ee.disconnect(),window.removeEventListener("pointermove",j),d.removeEventListener("pointerenter",J),d.removeEventListener("pointerleave",Q),e&&(e.deleteTexture(y),e.deleteBuffer(P),e.deleteProgram(s))}},[]),(0,f.useEffect)(()=>{U.current?.(a)},[a]),(0,f.useEffect)(()=>{D.current?.()}),(0,x.jsxs)("div",{ref:H,className:`${Ie}${W?` ${W}`:""}`,style:{width:i,height:h,...Te},children:[(0,x.jsx)("canvas",{ref:k,className:Me,"aria-hidden":"true"}),Re&&a&&(0,x.jsx)("img",{className:Ue,src:a,alt:"",style:{borderRadius:Y,filter:O?"grayscale(1)":void 0}}),q&&(0,x.jsx)("div",{className:De,children:q})]})},ue=Le;var N=R(I(),1),fe=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],M=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],qe=fe.map((a,i)=>({id:i+1,image:a,src:a,img:a,url:a,title:M[i],text:M[i],label:M[i],alt:M[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Xe({big:a}){return(0,N.jsx)(ce,{big:a,dark:!0,center:!0,zoom:1,drive:"move",children:(0,N.jsx)(ue,{image:fe[2]})})}var We=ne(Xe);export{We as default};
