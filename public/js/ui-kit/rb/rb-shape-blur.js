import{c as H,i as He,j as Q,l as we,m as Ae}from"./chunks/chunk-6IYH4WPJ.js";var L=H(He(),1),V=H(Q(),1),Ge="relative h-full w-full",Ve="pointer-events-none absolute inset-0 block h-full w-full",We="relative z-[1] flex h-full w-full items-center justify-center",Ye=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ke=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uDpr;
uniform int uShape;
uniform float uSides;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uRound;
uniform sampler2D uFieldTexture;
uniform vec2 uField;
uniform float uThickness;
uniform float uFill;
uniform float uEchoes;
uniform float uSpacing;
uniform float uAngle;
out vec4 outColor;

const float PI = 3.14159265;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdPolygon(vec2 p, float r, float n) {
  float an = PI / n;
  vec2 acs = vec2(cos(an), sin(an));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p.y += clamp(-p.y, 0.0, r * acs.y);
  return length(p) * sign(p.x);
}

float sdStar(vec2 p, float r, float n, float m) {
  float an = PI / n;
  float en = PI / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

float shapeDistance(vec2 p) {
  if (uShape < 0) return 1e5;
  float c = cos(uAngle);
  float s = sin(uAngle);
  p = mat2(c, -s, s, c) * p;
  if (uShape == 0) return sdRoundBox(p, uHalf, uRound);
  if (uShape == 1) return length(p) - uRadius;
  if (uShape == 2) return sdPolygon(p, uRadius - uRound, uSides) - uRound;
  if (uShape == 3) return sdStar(p, uRadius - uRound, uSides, mix(2.0, uSides, 0.42)) - uRound;
  vec2 uv = p / (2.0 * uField.x) + 0.5;
  vec2 inside = clamp(uv, 0.0, 1.0);
  float d = texture(uFieldTexture, vec2(inside.x, 1.0 - inside.y)).r * uField.y;
  return d + length((uv - inside) * 2.0 * uField.x);
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr - 0.5 * uResolution;
  float d = shapeDistance(p);
  float aa = 1.0 / uDpr;
  float hw = 0.5 * uThickness;
  float cover = uFill > 0.5 ? clamp(0.5 - d / aa, 0.0, 1.0) : 0.0;
  for (int i = 0; i < 24; i++) {
    if (float(i) >= uEchoes) break;
    if (uFill > 0.5 && i == 0) continue;
    float x = uFill > 0.5 ? d - float(i) * uSpacing : d + float(i) * uSpacing;
    cover = max(cover, clamp((hw - abs(x)) / aa + 0.5, 0.0, 1.0));
  }
  outColor = vec4(cover, 0.0, 0.0, 1.0);
}`,$e=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform float uLod;
uniform vec2 uStep;
uniform vec2 uScale;
out vec4 outColor;

void main() {
  vec2 size = vec2(textureSize(uSource, int(uLod)));
  vec2 center = gl_FragCoord.xy * uScale;
  float sum = textureLod(uSource, center / size, uLod).r * 6.0;
  sum += textureLod(uSource, (center - uStep) / size, uLod).r * 4.0;
  sum += textureLod(uSource, (center + uStep) / size, uLod).r * 4.0;
  sum += textureLod(uSource, (center - 2.0 * uStep) / size, uLod).r;
  sum += textureLod(uSource, (center + 2.0 * uStep) / size, uLod).r;
  outColor = vec4(sum / 16.0, 0.0, 0.0, 1.0);
}`,je=`#version 300 es
precision highp float;
uniform sampler2D uPyramid;
uniform float uMaxLod;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uThickness;
uniform float uFill;
uniform float uEchoes;
uniform float uSpacing;
uniform vec3 uColor;
uniform float uBackdrop;
uniform float uBlur;
uniform vec3 uLens;
uniform vec2 uLensShape;
uniform float uFocus;
uniform float uChroma;
out vec4 outColor;

float bspline(vec2 uv, float lod) {
  vec2 size = vec2(textureSize(uPyramid, int(lod)));
  vec2 st = uv * size - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 p0 = (i - 0.5 + w1 / g0) / size;
  vec2 p1 = (i + 1.5 + w3 / g1) / size;
  float a = textureLod(uPyramid, p0, lod).r;
  float b = textureLod(uPyramid, vec2(p1.x, p0.y), lod).r;
  float c = textureLod(uPyramid, vec2(p0.x, p1.y), lod).r;
  float d = textureLod(uPyramid, p1, lod).r;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

float blurred(vec2 uv, float sigma) {
  if (sigma <= 0.6) return textureLod(uPyramid, uv, 0.0).r;
  float lod = sigma < 1.7 ? (sigma - 0.6) / 1.1 : log2(sigma / 0.866);
  lod = clamp(lod, 0.0, uMaxLod);
  float base = floor(lod);
  float t = lod - base;
  float a = base < 0.5 ? textureLod(uPyramid, uv, 0.0).r : bspline(uv, base);
  if (t < 0.001) return a;
  return mix(a, bspline(uv, min(base + 1.0, uMaxLod)), t);
}

void main() {
  vec2 texel = 1.0 / vec2(textureSize(uPyramid, 0));
  vec2 uv = gl_FragCoord.xy * texel;
  vec2 p = gl_FragCoord.xy / uDpr - 0.5 * uResolution;
  vec2 toLens = p - uLens.xy;
  float lensDistance = length(toLens);
  float lens = uLens.z * (1.0 - smoothstep(uLensShape.x * (1.0 - uLensShape.y), uLensShape.x, lensDistance));
  float amount = mix(lens, 1.0 - lens, uFocus);
  float sigma = uBlur * amount * uDpr;
  vec2 dir = lensDistance > 0.001 ? toLens / lensDistance : vec2(0.0);
  vec2 split = dir * uChroma * 0.3 * sigma * texel;
  vec3 cover = vec3(
    blurred(uv - split, sigma * (1.0 + uChroma * 0.25)),
    blurred(uv, sigma),
    blurred(uv + split, sigma * (1.0 - uChroma * 0.2))
  );
  if (uFill < 0.5) {
    float spread = sigma / uDpr;
    float reach = uEchoes > 1.5 ? min(spread, uSpacing) : spread;
    cover *= 1.0 + 0.6 * max(reach - 0.5, 0.0) / max(uThickness, 0.5);
  }
  cover = mix(cover, 0.85 + 0.15 * (1.0 - exp((0.85 - cover) / 0.15)), step(0.85, cover));
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  cover = clamp(cover + grain / 255.0, 0.0, 1.0);
  float alpha = max(max(cover.r, cover.g), cover.b);
  outColor = vec4(uColor * cover + (alpha - cover) * uBackdrop, alpha);
}`,Je=["rect","circle","polygon","star"],p=512,_e=.35,G=1e20,D=(r,i,h)=>Math.min(h,Math.max(i,r)),Me=(r,i,h)=>{let d=r.createShader(i);return d?(r.shaderSource(d,h),r.compileShader(d),r.getShaderParameter(d,r.COMPILE_STATUS)?d:(r.deleteShader(d),null)):null},ne=(r,i,h)=>{let d=Me(r,r.FRAGMENT_SHADER,h),l=r.createProgram();return!d||!l?null:(r.attachShader(l,i),r.attachShader(l,d),r.bindAttribLocation(l,0,"aPosition"),r.linkProgram(l),r.deleteShader(d),r.getProgramParameter(l,r.LINK_STATUS)?l:(r.deleteProgram(l),null))},ae=(r,i,h)=>{let d={};for(let l of h)d[l]=r.getUniformLocation(i,l);return d},Fe=(r,i,h,d,l,f,y)=>{for(let c=0;c<d;c++)l[c]=r[i+c*h];let m=0;f[0]=0,y[0]=-G,y[1]=G;for(let c=1;c<d;c++){let b=(l[c]+c*c-(l[f[m]]+f[m]*f[m]))/(2*(c-f[m]));for(;b<=y[m];)m--,b=(l[c]+c*c-(l[f[m]]+f[m]*f[m]))/(2*(c-f[m]));m++,f[m]=c,y[m]=b,y[m+1]=G}m=0;for(let c=0;c<d;c++){for(;y[m+1]<c;)m++;let b=c-f[m];r[i+c*h]=b*b+l[f[m]]}},Le=(r,i)=>{let h=new Float64Array(i),d=new Int32Array(i),l=new Float64Array(i+1);for(let f=0;f<i;f++)Fe(r,f,i,i,h,d,l);for(let f=0;f<i;f++)Fe(r,f*i,1,i,h,d,l)},Qe=r=>{let i=document.createElement("canvas");i.width=p,i.height=p;let h=i.getContext("2d",{willReadFrequently:!0});if(!h)return null;let d=r.naturalWidth||p,l=r.naturalHeight||p,f=p/(1+_e)/Math.max(d,l);h.drawImage(r,(p-d*f)/2,(p-l*f)/2,d*f,l*f);let y=h.getImageData(0,0,p,p).data,m=new Float64Array(p*p),c=new Float64Array(p*p);for(let g=0;g<p*p;g++){let P=y[g*4+3]/255,_=.5-P;m[g]=P>=.999?0:P<=.001?G:_>0?_*_:0,c[g]=P>=.999?G:P<=.001?0:_<0?_*_:0}Le(m,p),Le(c,p);let b=new Float32Array(p*p);for(let g=0;g<p*p;g++)b[g]=Math.sqrt(m[g])-Math.sqrt(c[g]);return b},Ze=({shape:r="rect",src:i,sides:h=6,size:d=.8,roundness:l=.2,thickness:f=2,fill:y=!1,echoes:m=1,spacing:c=12,color:b="#ffffff",blur:g=16,lensSize:P=.3,lensSoftness:_=.7,focus:Pe=!1,chroma:Ue=.3,rotation:Ce=0,spin:Xe=0,idle:Ie=!0,children:ue,className:se="",style:ke})=>{let ce=(0,L.useRef)(null),le=(0,L.useRef)(null),W=(0,L.useRef)(null),fe={shape:Math.max(0,Je.indexOf(r)),src:i||"",sides:D(Math.round(h),3,12),size:D(d,.05,1),roundness:D(l,0,1),thickness:D(f,.5,40),fill:y,echoes:D(Math.round(m),1,24),spacing:Math.max(1,c),color:b,blur:Math.max(0,g),lensSize:D(P,.02,2),lensSoftness:D(_,0,1),focus:Pe,chroma:D(Ue,0,1),rotation:Ce,spin:Xe,idle:Ie},I=(0,L.useRef)(fe);return I.current=fe,(0,L.useEffect)(()=>{let X=ce.current,R=le.current,e=R?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!X||!R||!e)return;let k=Me(e,e.VERTEX_SHADER,Ye);if(!k)return;let Y=ne(e,k,Ke),K=ne(e,k,$e),$=ne(e,k,je);if(!Y||!K||!$)return;let E=ae(e,Y,["uResolution","uDpr","uShape","uSides","uHalf","uRadius","uRound","uFieldTexture","uField","uThickness","uFill","uEchoes","uSpacing","uAngle"]),U=ae(e,K,["uSource","uLod","uStep","uScale"]),v=ae(e,$,["uPyramid","uMaxLod","uResolution","uDpr","uThickness","uFill","uEchoes","uSpacing","uColor","uBackdrop","uBlur","uLens","uLensShape","uFocus","uChroma"]),ee=e.createVertexArray();e.bindVertexArray(ee);let de=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,de),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let me=!!e.getExtension("EXT_color_buffer_float")?e.R16F:e.R8,pe=e.createFramebuffer(),j=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,j),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.R16F,1,1,0,e.RED,e.FLOAT,new Float32Array([1e4]));let te=document.createElement("canvas");te.width=1,te.height=1;let B=te.getContext("2d",{willReadFrequently:!0}),re=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,A={x:0,y:0,active:!1},T={x:0,y:0,power:0,placed:!1},a={texture:null,temps:[],sizes:[],levels:0,key:""},o={width:1,height:1,dpr:1,time:0,angle:0,color:[1,1,1],backdrop:0,colorKey:"",image:"none",request:0},z=0,N=0,J=!0,O=!0,Be=()=>{a.texture&&e.deleteTexture(a.texture),a.temps.forEach(s=>e.deleteTexture(s));let t=R.width,n=R.height;a.levels=Math.min(10,Math.floor(Math.log2(Math.max(t,n)))+1),a.sizes=[];for(let s=0;s<a.levels;s++)a.sizes.push([Math.max(1,t>>s),Math.max(1,n>>s)]);let u=()=>{e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)};a.texture=e.createTexture(),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,a.texture),e.texStorage2D(e.TEXTURE_2D,a.levels,me,t,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_NEAREST),u(),a.temps=[null];for(let s=1;s<a.levels;s++){let x=e.createTexture();e.bindTexture(e.TEXTURE_2D,x),e.texStorage2D(e.TEXTURE_2D,1,me,a.sizes[s][0],a.sizes[s-1][1]),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),u(),a.temps.push(x)}a.key=""},ze=t=>{if(t===o.colorKey)return;o.colorKey=t,R.style.color=t;let n=getComputedStyle(R).color;if(R.style.color="",!B)return;B.clearRect(0,0,1,1),B.fillStyle=n,B.fillRect(0,0,1,1);let[u,s,x]=B.getImageData(0,0,1,1).data;o.color=[u/255,s/255,x/255],o.backdrop=.2126*o.color[0]+.7152*o.color[1]+.0722*o.color[2]<.5?1:0},Ne=t=>{let n=I.current,u=Math.min(o.width,o.height)/2,s=(1-n.size)*u,x=n.shape===0&&!n.src?o.width/2-s:n.size*u,S=n.shape===0&&!n.src?o.height/2-s:n.size*u;return[x*(.75*Math.sin(t*.37)+.2*Math.sin(t*1.13+1.7)),S*(.7*Math.sin(t*.53+.9)+.2*Math.cos(t*.91+.4))]},Oe=t=>{let{width:n,height:u}=o,s=Math.min(n,u)/2,x=(1-t.size)*s,S=Math.max(1,n/2-x),M=Math.max(1,u/2-x),C=t.size*s,oe=C*(1+_e),q=t.shape;t.src&&(q=o.image==="ready"?4:o.image==="failed"?t.shape:-1);let be=q===0?t.roundness*Math.min(S,M):t.roundness*C*(q===3?.12:.3),Se=(t.rotation+o.angle)*Math.PI/180,ye=[R.width,R.height,q,t.sides,S,M,C,be,t.thickness,t.fill,t.echoes,t.spacing,Se.toFixed(5)].join("|");if(ye!==a.key){a.key=ye,e.bindFramebuffer(e.FRAMEBUFFER,pe),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a.texture,0),e.viewport(0,0,a.sizes[0][0],a.sizes[0][1]),e.useProgram(Y),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,j),e.uniform1i(E.uFieldTexture,0),e.uniform2f(E.uResolution,n,u),e.uniform1f(E.uDpr,o.dpr),e.uniform1i(E.uShape,q),e.uniform1f(E.uSides,t.sides),e.uniform2f(E.uHalf,S,M),e.uniform1f(E.uRadius,C),e.uniform1f(E.uRound,be),e.uniform2f(E.uField,oe,2*oe/p),e.uniform1f(E.uThickness,t.thickness),e.uniform1f(E.uFill,t.fill?1:0),e.uniform1f(E.uEchoes,t.echoes),e.uniform1f(E.uSpacing,t.spacing),e.uniform1f(E.uAngle,Se),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(K),e.uniform1i(U.uSource,0);for(let w=1;w<a.levels;w++)e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a.temps[w],0),e.viewport(0,0,a.sizes[w][0],a.sizes[w-1][1]),e.bindTexture(e.TEXTURE_2D,a.texture),e.uniform1f(U.uLod,w-1),e.uniform2f(U.uStep,1,0),e.uniform2f(U.uScale,2,1),e.drawArrays(e.TRIANGLES,0,3),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a.texture,w),e.viewport(0,0,a.sizes[w][0],a.sizes[w][1]),e.bindTexture(e.TEXTURE_2D,a.temps[w]),e.uniform1f(U.uLod,0),e.uniform2f(U.uStep,0,1),e.uniform2f(U.uScale,1,2),e.drawArrays(e.TRIANGLES,0,3);e.bindFramebuffer(e.FRAMEBUFFER,null)}},he=()=>{let t=I.current;if(!a.texture)return;ze(t.color),e.bindVertexArray(ee),e.disable(e.BLEND),Oe(t);let{width:n,height:u}=o;e.viewport(0,0,R.width,R.height),e.useProgram($),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,a.texture),e.uniform1i(v.uPyramid,0),e.uniform1f(v.uMaxLod,a.levels-1),e.uniform2f(v.uResolution,n,u),e.uniform1f(v.uDpr,o.dpr),e.uniform1f(v.uThickness,t.thickness),e.uniform1f(v.uFill,t.fill?1:0),e.uniform1f(v.uEchoes,t.echoes),e.uniform1f(v.uSpacing,t.spacing),e.uniform3f(v.uColor,o.color[0],o.color[1],o.color[2]),e.uniform1f(v.uBackdrop,o.backdrop),e.uniform1f(v.uBlur,t.blur),e.uniform3f(v.uLens,T.x,T.y,T.power),e.uniform2f(v.uLensShape,t.lensSize*Math.min(n,u),t.lensSoftness),e.uniform1f(v.uFocus,t.focus?1:0),e.uniform1f(v.uChroma,t.chroma),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)},xe=t=>{if(z=0,!O||!J)return;let n=I.current,u=N?Math.min(.05,(t-N)/1e3):1/60;N=t,o.time+=u,re||(o.angle=(o.angle+n.spin*u)%360);let s=!A.active&&n.idle&&!re,x=T.x,S=T.y,M=0;A.active?(x=A.x,S=A.y,M=1):s&&([x,S]=Ne(o.time),M=.85),T.placed||(T.x=x,T.y=S,T.placed=!0);let C=1-Math.exp(-u*(A.active?10:3));T.x+=(x-T.x)*C,T.y+=(S-T.y)*C,T.power+=(M-T.power)*(1-Math.exp(-u*4)),he(),!(Math.abs(x-T.x)<.1&&Math.abs(S-T.y)<.1&&Math.abs(M-T.power)<.002)||s||n.spin&&!re?z=requestAnimationFrame(xe):N=0},F=()=>{z||!O||!J||(z=requestAnimationFrame(xe))},qe=t=>{let n=++o.request;if(o.image=t?"loading":"none",F(),!t)return;let u=new Image;u.crossOrigin="anonymous",u.onload=()=>{if(!O||n!==o.request)return;let s=null;try{s=Qe(u)}catch{s=null}if(!s){o.image="failed",F();return}e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,j),e.texImage2D(e.TEXTURE_2D,0,e.R16F,p,p,0,e.RED,e.FLOAT,s),o.image="ready",F()},u.onerror=()=>{!O||n!==o.request||(o.image="failed",F())},u.src=t},Te=t=>{let n=X.getBoundingClientRect(),u=I.current.lensSize*Math.min(n.width,n.height),s=t.clientX-n.left,x=t.clientY-n.top;A.active=s>-u&&x>-u&&s<n.width+u&&x<n.height+u,A.x=s-n.width/2,A.y=n.height/2-x,F()},ve=()=>{A.active=!1,F()},Ee=()=>{o.dpr=Math.min(window.devicePixelRatio||1,2),o.width=Math.max(1,X.clientWidth),o.height=Math.max(1,X.clientHeight),R.width=Math.round(o.width*o.dpr),R.height=Math.round(o.height*o.dpr),Be(),he(),F()};W.current={load:qe,wake:F};let ge=new ResizeObserver(Ee);ge.observe(X);let Re=new IntersectionObserver(t=>{J=t.some(n=>n.isIntersecting),J&&(N=0,F())});return Re.observe(X),window.addEventListener("pointermove",Te,{passive:!0}),document.documentElement.addEventListener("pointerleave",ve),Ee(),()=>{O=!1,cancelAnimationFrame(z),W.current=null,ge.disconnect(),Re.disconnect(),window.removeEventListener("pointermove",Te),document.documentElement.removeEventListener("pointerleave",ve),a.texture&&e.deleteTexture(a.texture),a.temps.forEach(t=>e.deleteTexture(t)),e.deleteTexture(j),e.deleteFramebuffer(pe),e.deleteBuffer(de),e.deleteVertexArray(ee),e.deleteProgram(Y),e.deleteProgram(K),e.deleteProgram($),e.deleteShader(k)}},[]),(0,L.useEffect)(()=>{W.current?.load(i||"")},[i]),(0,L.useEffect)(()=>{W.current?.wake()}),(0,V.jsxs)("div",{ref:ce,className:`${Ge}${se?` ${se}`:""}`,style:ke,children:[(0,V.jsx)("canvas",{ref:le,className:Ve,"aria-hidden":"true"}),ue&&(0,V.jsx)("div",{className:We,children:ue})]})},De=Ze;var ie=H(Q(),1),et=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Z=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],st=et.map((r,i)=>({id:i+1,image:r,src:r,img:r,url:r,title:Z[i],text:Z[i],label:Z[i],alt:Z[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function tt({big:r}){return(0,ie.jsx)(Ae,{big:r,dark:!0,center:!0,zoom:1,drive:!1,children:(0,ie.jsx)(De,{})})}var ct=we(tt);export{ct as default};
