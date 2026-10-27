import{c as C,i as Ge,j as z,l as me,m as pe}from"./chunks/chunk-6IYH4WPJ.js";var v=C(Ge(),1),M=C(z(),1),he=" .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",He="'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",$=40,w=64,P=256,O=4,ze=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`,De=`#version 300 es
precision highp float;
#define RIPPLES ${O}
uniform sampler2D uText;
uniform sampler2D uGlyphs;
uniform vec2 uSize;
uniform vec2 uCell;
uniform float uGlyphCount;
uniform float uTextAspect;
uniform float uPlaneHeight;
uniform vec2 uTilt;
uniform float uTime;
uniform float uWaves;
uniform float uWaveSpeed;
uniform float uChroma;
uniform float uBlocks;
uniform vec3 uColors[3];
uniform float uHue;
uniform vec2 uPointer;
uniform float uHover;
uniform float uScramble;
uniform vec4 uRipples[RIPPLES];
uniform float uIntro;
uniform float uLight;
uniform float uReady;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 hueRotate(vec3 color, float angle) {
  const vec3 axis = vec3(0.57735);
  float c = cos(angle);
  return color * c + cross(axis, color) * sin(angle) + axis * dot(axis, color) * (1.0 - c);
}

vec4 scene(vec2 pixel) {
  vec2 ndc = vec2(pixel.x / uSize.x * 2.0 - 1.0, 1.0 - pixel.y / uSize.y * 2.0);
  float tanHalf = 0.41421356;
  vec3 dir = normalize(vec3(ndc.x * tanHalf * uSize.x / uSize.y, ndc.y * tanHalf, -1.0));
  vec3 origin = vec3(0.0, 0.0, 30.0);
  float cx = cos(uTilt.x);
  float sx = sin(uTilt.x);
  float cy = cos(uTilt.y);
  float sy = sin(uTilt.y);
  mat3 rotation = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx) * mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  vec3 normal = rotation * vec3(0.0, 0.0, 1.0);
  float facing = dot(dir, normal);
  if (abs(facing) < 0.0001) return vec4(0.0);
  vec3 hit = origin + dir * (-dot(origin, normal) / facing);
  vec3 local = transpose(rotation) * hit;
  float planeHeight = 24.8528 * uPlaneHeight;
  float planeWidth = planeHeight * uTextAspect;
  float wave = 5.0 * sin(uTime * uWaveSpeed);
  local.x -= sin(wave + local.y) * 0.5 * uWaves;
  local.y -= cos(wave) * 0.15 * uWaves;
  local.xy /= 1.0 + sin(wave + local.x) * uWaves / 30.0;
  vec2 uv = vec2(local.x / planeWidth + 0.5, 0.5 - local.y / planeHeight);
  float t = sin(uTime);
  float red = texture(uText, uv + cos(t + uv.x) * 0.01 * uChroma).r;
  float green = texture(uText, uv + clamp(tan(uv.x - t * 0.5), -3.0, 3.0) * 0.01 * uChroma).g;
  float blue = texture(uText, uv - cos(t * 3.0 + uv.y) * 0.01 * uChroma).b;
  vec4 base = texture(uText, uv);
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  return vec4(red, green, blue, base.a) * inside;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec2 cell = floor(pixel / uCell);
  vec2 local = fract(pixel / uCell);
  vec2 center = (cell + 0.5) * uCell;
  float tick = floor(uTime * 18.0);

  float ring = 0.0;
  vec2 push = vec2(0.0);
  for (int i = 0; i < RIPPLES; i++) {
    vec4 ripple = uRipples[i];
    if (ripple.w <= 0.0) continue;
    float radius = ripple.z * max(uSize.x, uSize.y) * 0.75;
    float gap = abs(distance(center, ripple.xy) - radius);
    float band = max(uCell.y * 3.0, 24.0);
    float strength = (1.0 - smoothstep(0.0, 1.2, ripple.z)) * (1.0 - smoothstep(0.0, band, gap));
    ring = max(ring, strength);
    push += normalize(center - ripple.xy + 0.001) * strength * uCell.y * 1.5;
  }

  vec4 base = scene(center - push);
  float content = step(0.02, base.a);
  float gray = clamp(dot(base.rgb, vec3(0.3, 0.6, 0.1)), 0.0, 1.0);
  float index = content > 0.0 ? max(1.0, floor(gray * (uGlyphCount - 1.0) + 0.5)) : 0.0;
  float randomGlyph = 1.0 + floor(hash(cell * 1.7 + tick * 0.37) * (uGlyphCount - 1.0));

  float reach = uSize.y * 0.18 * (0.5 + uScramble);
  float scramble = uHover * uScramble * (1.0 - smoothstep(reach * 0.35, reach, distance(center, uPointer)));
  if (content > 0.0 && hash(cell + tick * 7.13) < scramble * 0.8) index = randomGlyph;
  if (hash(cell + tick * 3.1) < ring) index = randomGlyph;
  float decoding = step(hash(cell * 0.37 + 2.1), uIntro);
  if (content > 0.0 && decoding > 0.0) index = randomGlyph;

  float mask = texture(uGlyphs, vec2((index + local.x) / uGlyphCount, local.y)).a;
  float glyphAlpha = mask * max(content * (1.0 - decoding * 0.35), ring * 0.75);

  float spread = length((pixel - uSize * 0.5) / (uSize * 0.5)) * 0.7071;
  vec3 tint = mix(mix(uColors[0], uColors[1], smoothstep(0.0, 0.5, spread)), uColors[2], smoothstep(0.5, 1.0, spread));
  float blockAlpha = base.a * uBlocks * (1.0 - uIntro);
  vec3 under = base.rgb * blockAlpha;
  vec3 color = mix(under, abs(tint - under), glyphAlpha);
  float alpha = max(blockAlpha, glyphAlpha) * uReady;
  color = clamp(hueRotate(color, uHue), 0.0, 1.0) * uReady;
  if (uLight > 0.5) color = vec3(alpha) - color;
  fragColor = vec4(color, alpha);
}`,y=(r,c,s)=>Math.min(s,Math.max(c,r)),ve=(r,c,s)=>{let a=r.createShader(c);return a?(r.shaderSource(a,s),r.compileShader(a),r.getShaderParameter(a,r.COMPILE_STATUS)?a:(r.deleteShader(a),null)):null},ke=r=>{let c=document.createElement("canvas").getContext("2d");if(!c)return[1,1,1];c.fillStyle="#ffffff",c.fillStyle=r;let s=String(c.fillStyle);if(s.startsWith("#")){let u=parseInt(s.slice(1,7),16);return[(u>>16&255)/255,(u>>8&255)/255,(u&255)/255]}let a=s.match(/[\d.]+/g)?.map(Number)??[255,255,255];return[a[0]/255,a[1]/255,a[2]/255]},Ue=(r,c,s,a)=>{let u=document.createElement("canvas"),d=u.getContext("2d");if(!d)return null;let E=`${s} ${P}px ${c}`;d.font=E;let _=Math.max(P*.6,d.measureText(r||" ").width);return u.width=Math.ceil(_+P*.3),u.height=Math.ceil(P*1.3),d.font=E,d.fillStyle=a,d.textAlign="center",d.textBaseline="middle",d.fillText(r,u.width/2,u.height/2),u},Be=(r,c)=>{let s=document.createElement("canvas"),a=s.getContext("2d");return a?(s.width=r.length*$,s.height=w,a.font=`500 ${w*.74}px ${c}`,a.fillStyle="#ffffff",a.textAlign="center",a.textBaseline="middle",Array.from(r).forEach((u,d)=>{a.fillText(u,d*$+$/2,w/2+w*.04)}),s):null};function K({text:r="Hey!",asciiFontSize:c=8,charset:s=he,fontFamily:a=He,fontWeight:u=600,textColor:d="#fdf9f3",colors:E=["#ff6188","#fc9867","#ffd866"],textScale:_=1,blocks:xe=.9,waves:ge=1,waveSpeed:Te=1,chroma:be=1,tilt:ye=1,hueShift:Ee=1,scramble:Re=.6,clickRipple:Se=!0,intro:Ae=!0,idle:Ce=!0,interactive:we=!0,theme:Pe="dark",className:q="",style:Me}){let j=(0,v.useRef)(null),J=(0,v.useRef)(null),k=(0,v.useRef)(null),[_e,Le]=(0,v.useState)(!1),U=Array.from(s).length>1?s:he,b=(E?.length?E:["#ffffff"]).slice(0,3),Q={cellSize:Math.max(3,c),textScale:y(_,.1,3),blocks:y(xe,0,1),waves:Math.max(0,ge),waveSpeed:Math.max(0,Te),chroma:Math.max(0,be),tilt:Math.max(0,ye),hueShift:y(Ee,0,2),scramble:y(Re,0,1),clickRipple:Se,intro:Ae,idle:Ce,interactive:we,light:Pe==="light",colors:[b[0],b[1]??b[0],b[2]??b[1]??b[0]]},L=(0,v.useRef)(Q);return L.current=Q,(0,v.useEffect)(()=>{let f=j.current,m=J.current;if(!f||!m)return;let x=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,e=m.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1}),p=null,B=null,I=null,X=null,i={};if(e){let n=ve(e,e.VERTEX_SHADER,ze),o=ve(e,e.FRAGMENT_SHADER,De);if(n&&o&&(p=e.createProgram(),e.attachShader(p,n),e.attachShader(p,o),e.bindAttribLocation(p,0,"position"),e.linkProgram(p),e.deleteShader(n),e.deleteShader(o),e.getProgramParameter(p,e.LINK_STATUS)||(e.deleteProgram(p),p=null)),p){B=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,B),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),I=e.createTexture(),X=e.createTexture();for(let l of["uText","uGlyphs","uSize","uCell","uGlyphCount","uTextAspect","uPlaneHeight","uTilt","uTime","uWaves","uWaveSpeed","uChroma","uBlocks","uColors","uHue","uPointer","uHover","uScramble","uRipples","uIntro","uLight","uReady"])i[l]=e.getUniformLocation(p,l)}}if(!e||!p){Le(!0);return}let Z=(n,o,l)=>{e.bindTexture(e.TEXTURE_2D,n),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,o),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l?e.LINEAR_MIPMAP_LINEAR:e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,l?e.LINEAR:e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)},t={ready:!1,textAspect:1,glyphCount:1,time:0,tiltX:0,tiltY:0,hue:0,hover:0,intro:0,pointerX:0,pointerY:0,targetX:0,targetY:0,inside:!1,visible:!0,ripples:[],introPlayed:!1},Y=new Float32Array(O*4),ee=new Float32Array(9),te="",R=0,N=performance.now(),F=!0,Ie=(n,o,l,h,g,S)=>{let T=Ue(n,o,l,h),G=Be(g,o);!T||!G||(Z(I,T,!1),Z(X,G,!0),t.textAspect=T.width/T.height,t.glyphCount=Array.from(g).length,t.ready=!0,S&&L.current.intro&&!t.introPlayed&&!x&&(t.introPlayed=!0,t.intro=1))},oe=()=>{let n=Math.min(window.devicePixelRatio||1,2),o=Math.max(1,Math.round(f.clientWidth*n)),l=Math.max(1,Math.round(f.clientHeight*n));(m.width!==o||m.height!==l)&&(m.width=o,m.height=l)},re=n=>{if(R=0,!F)return;let o=L.current,l=Math.min(.05,Math.max(.001,(n-N)/1e3));N=n,t.time+=x?0:l;let h=m.width/Math.max(1,f.clientWidth),g=0,S=0;o.interactive&&t.inside?(g=t.targetY*.5*o.tilt,S=t.targetX*.5*o.tilt):o.idle&&!x&&(g=Math.sin(t.time*.55)*.12*o.tilt,S=Math.sin(t.time*.4+1.3)*.2*o.tilt);let T=1-Math.exp(-l/.3);t.tiltX+=(g-t.tiltX)*T,t.tiltY+=(S-t.tiltY)*T;let G=Math.atan2(t.targetY,t.targetX),H=(o.interactive&&t.inside?G*o.hueShift:t.hue)-t.hue;H=Math.atan2(Math.sin(H),Math.cos(H)),t.hue+=H*(1-Math.exp(-l/.25)),t.hover+=((o.interactive&&t.inside?1:0)-t.hover)*(1-Math.exp(-l/.2)),t.intro>0&&(t.intro=Math.max(0,t.intro-l/1.4)),Y.fill(0),t.ripples=t.ripples.filter(A=>(A.age+=l)<1.3),t.ripples.slice(-O).forEach((A,Xe)=>{Y.set([A.x*h,A.y*h,A.age,1],Xe*4)});let ue=m.width,fe=m.height;e.viewport(0,0,ue,fe),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(p),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,I),e.uniform1i(i.uText,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,X),e.uniform1i(i.uGlyphs,1),e.uniform2f(i.uSize,ue,fe),e.uniform2f(i.uCell,o.cellSize*.62*h,o.cellSize*h),e.uniform1f(i.uGlyphCount,t.glyphCount),e.uniform1f(i.uTextAspect,t.textAspect),e.uniform1f(i.uPlaneHeight,.5*o.textScale),e.uniform2f(i.uTilt,t.tiltX,t.tiltY),e.uniform1f(i.uTime,t.time),e.uniform1f(i.uWaves,o.waves),e.uniform1f(i.uWaveSpeed,o.waveSpeed),e.uniform1f(i.uChroma,o.chroma),e.uniform1f(i.uBlocks,o.blocks);let de=o.colors.join();de!==te&&(te=de,ee.set(o.colors.flatMap(ke))),e.uniform3fv(i.uColors,ee),e.uniform1f(i.uHue,t.hue),e.uniform2f(i.uPointer,t.pointerX*h,t.pointerY*h),e.uniform1f(i.uHover,t.hover),e.uniform1f(i.uScramble,o.scramble),e.uniform4fv(i.uRipples,Y),e.uniform1f(i.uIntro,t.intro),e.uniform1f(i.uLight,o.light?1:0),e.uniform1f(i.uReady,t.ready?1:0),e.drawArrays(e.TRIANGLES,0,3),t.visible&&(R=requestAnimationFrame(re))},W=()=>{R||!F||!t.visible||(N=performance.now(),R=requestAnimationFrame(re))};k.current=(n,o,l,h,g)=>{Ie(n,o,l,h,g,!0),W()};let ae=n=>{let o=f.getBoundingClientRect(),l=n.clientX-o.left,h=n.clientY-o.top;t.pointerX=l,t.pointerY=h,t.targetX=y(l/Math.max(1,o.width)*2-1,-1,1),t.targetY=y(h/Math.max(1,o.height)*2-1,-1,1)},ne=n=>{ae(n),t.inside=!0},ie=()=>{t.inside=!1},le=n=>{let o=L.current;!o.interactive||!o.clickRipple||(ae(n),t.ripples.push({x:t.pointerX,y:t.pointerY,age:0}))},ce=new ResizeObserver(oe);ce.observe(f);let se=new IntersectionObserver(n=>{t.visible=n.some(o=>o.isIntersecting),t.visible&&W()});return se.observe(f),f.addEventListener("pointermove",ne),f.addEventListener("pointerdown",le),f.addEventListener("pointerleave",ie),oe(),W(),()=>{F=!1,cancelAnimationFrame(R),k.current=null,ce.disconnect(),se.disconnect(),f.removeEventListener("pointermove",ne),f.removeEventListener("pointerdown",le),f.removeEventListener("pointerleave",ie),e.deleteTexture(I),e.deleteTexture(X),e.deleteBuffer(B),e.deleteProgram(p)}},[]),(0,v.useEffect)(()=>{let f=!1,m=()=>{f||k.current?.(r,a,u,d,U)};m();let x=document.fonts;return x?.load&&Promise.all([x.load(`${u} ${P}px ${a}`,r||"A"),x.load(`500 ${w}px ${a}`,U)]).catch(()=>null).then(m),x?.addEventListener?.("loadingdone",m),()=>{f=!0,x?.removeEventListener?.("loadingdone",m)}},[r,a,u,d,U]),(0,M.jsxs)("div",{ref:j,className:`absolute inset-0 touch-pan-y${q?` ${q}`:""}`,style:Me,"aria-label":r,role:"img",children:[(0,M.jsx)("canvas",{ref:J,className:"absolute inset-0 block h-full w-full"}),_e&&(0,M.jsx)("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:a,fontWeight:u,fontSize:`${8*_}vw`,color:d},children:r})]})}var V=C(z(),1),Ye=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],D=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],qe=Ye.map((r,c)=>({id:c+1,image:r,src:r,img:r,url:r,title:D[c],text:D[c],label:D[c],alt:D[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ne({big:r}){return(0,V.jsx)(pe,{big:r,dark:!1,center:!0,zoom:1,drive:!1,children:(0,V.jsx)(K,{text:"Neva",textColor:"#091629",colors:["#48c8f5","#2f7bbd","#091629"]})})}var je=me(Ne);export{je as default};
