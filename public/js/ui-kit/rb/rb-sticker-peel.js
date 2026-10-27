import{c as Q,i as Mt,j as ce,l as Ye,m as $e}from"./chunks/chunk-6IYH4WPJ.js";var G=Q(Mt(),1),ee=Q(ce(),1),A=96,be=.18,St=1024,Ke=96,le=260,At={gloss:0,matte:1,holo:2},je=1,_t=`#version 300 es
in vec2 aGrid;
uniform vec2 uCanvas;
uniform vec2 uMesh;
uniform vec2 uCenter;
uniform vec2 uDir;
uniform float uFold;
uniform float uRadius;
uniform float uAngle;
uniform float uScale;
uniform float uLift;
uniform int uPass;
uniform vec2 uShadowOffset;
uniform vec2 uShadowSlope;
out vec2 vUv;
out float vFold;
out vec3 vNormal;
out vec3 vPos;
out float vHeight;
out float vCurl;
const float PI = 3.14159265;

void main() {
  vec2 local = (aGrid - 0.5) * uMesh;
  float s = dot(local, uDir);
  float d = uFold - s;
  vec3 normal = vec3(0.0, 0.0, 1.0);
  float z = 0.0;
  vec2 p = local;
  if (d > 0.0) {
    float theta = d / uRadius;
    float along = uFold + d - PI * uRadius;
    z = 2.0 * uRadius;
    normal = vec3(0.0, 0.0, -1.0);
    if (theta < PI) {
      along = uFold - uRadius * sin(theta);
      z = uRadius * (1.0 - cos(theta));
      normal = vec3(uDir * sin(theta), cos(theta));
    }
    p += (along - s) * uDir;
  }
  float c = cos(uAngle);
  float sn = sin(uAngle);
  vec2 turned = vec2(c * p.x - sn * p.y, sn * p.x + c * p.y) * uScale;
  vNormal = vec3(c * normal.x - sn * normal.y, sn * normal.x + c * normal.y, normal.z);
  vUv = aGrid;
  vFold = d;
  vCurl = z * uScale;
  float height = z * uScale + uLift;
  vec2 screen = uCenter + turned;
  float depth = 0.0;
  if (uPass == 0 || uPass == 2) {
    vHeight = uPass == 0 ? height : z * uScale;
    screen += uShadowOffset + uShadowSlope * vHeight;
  } else {
    vHeight = height;
    depth = clamp(-height / 1000.0, -1.0, 1.0);
  }
  vPos = vec3(uCenter + turned, height);
  gl_Position = vec4(screen.x / uCanvas.x * 2.0 - 1.0, 1.0 - screen.y / uCanvas.y * 2.0, depth, 1.0);
}`,Pt=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uImage;
uniform int uPass;
uniform int uFinish;
uniform vec3 uBack;
uniform vec3 uLight;
uniform float uShine;
uniform float uShadow;
uniform float uTexel;
uniform float uLod;
uniform float uRadius;
uniform vec2 uGlint;
in vec2 vUv;
in float vFold;
in vec3 vNormal;
in vec3 vPos;
in float vHeight;
in float vCurl;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 spectrum(float t) {
  t = fract(t) * 6.0;
  vec3 a = vec3(1.0, 0.478, 0.46);
  vec3 b = vec3(1.0, 0.928, 0.38);
  vec3 c = vec3(0.659, 1.0, 0.38);
  vec3 d = vec3(0.52, 1.0, 0.968);
  vec3 e = vec3(0.48, 0.584, 1.0);
  vec3 f = vec3(0.68, 0.52, 1.0);
  if (t < 1.0) return mix(a, b, t);
  if (t < 2.0) return mix(b, c, t - 1.0);
  if (t < 3.0) return mix(c, d, t - 2.0);
  if (t < 4.0) return mix(d, e, t - 3.0);
  if (t < 5.0) return mix(e, f, t - 4.0);
  return mix(f, a, t - 5.0);
}

float bars(float t) {
  t = fract(t) * 12.0;
  if (t < 3.8) return mix(0.08, 0.6, t / 3.8);
  if (t < 4.5) return mix(0.6, 0.72, (t - 3.8) / 0.7);
  if (t < 5.2) return mix(0.72, 0.6, (t - 4.5) / 0.7);
  if (t < 10.0) return mix(0.6, 0.08, (t - 5.2) / 4.8);
  return 0.08;
}

void main() {
  if (uPass == 0) {
    float alpha;
    if (vFold > 0.0) {
      alpha = textureLod(uImage, vUv, log2(max(1.5 * uTexel, 1.0))).a * (1.0 - smoothstep(0.0, uRadius, vCurl));
    } else {
      alpha = textureLod(uImage, vUv, log2(max((1.2 + vHeight * 0.55) * uTexel, 1.0))).a;
    }
    outColor = vec4(0.0, 0.0, 0.0, alpha * uShadow / (1.0 + vHeight * 0.03));
    return;
  }
  if (uPass == 2) {
    if (vFold <= 0.0) discard;
    float alpha = textureLod(uImage, vUv, log2(max(uTexel, 1.0))).a * smoothstep(0.0, uRadius, vCurl);
    outColor = vec4(alpha);
    return;
  }
  if (uPass == 1 && vFold > 0.0) discard;
  if (uPass == 3 && vFold <= 0.0) discard;
  vec4 art = textureLod(uImage, vUv, uLod);
  if (art.a < 0.004) discard;
  bool front = vNormal.z >= 0.0;
  vec3 n = normalize(front ? vNormal : -vNormal);
  vec3 toLight = normalize(uLight - vPos);
  vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
  float diffuse = max(dot(n, toLight), 0.0);
  float nh = max(dot(n, halfway), 0.0);
  vec3 key = normalize(vec3(-0.45, -0.6, 0.66));
  float shade = clamp(0.5 + 0.25 * dot(n, key) / key.z + 0.25 * n.z, 0.5, front ? 1.0 : 1.08);
  if (uPass == 1) shade = 1.0;
  vec3 color;
  if (!front) {
    float grain = hash(floor(vUv * 700.0)) * 0.06 - 0.03;
    color = uBack * (0.7 + 0.3 * diffuse + grain) * art.a + vec3(pow(nh, 24.0) * 0.2 * uShine) * art.a;
  } else if (uFinish == 1) {
    color = art.rgb * (0.8 + 0.22 * diffuse) + vec3(pow(nh, 8.0) * 0.08 * uShine) * art.a;
  } else if (uFinish == 2) {
    vec3 albedo = art.rgb / art.a;
    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
    float foil = smoothstep(0.5, 0.92, lum);
    vec2 q = vUv - uGlint;
    float near = exp(-dot(q, q) * 3.0);
    float tilt = dot(n.xy, vec2(0.6, 0.8)) * 1.6;
    vec3 rainbow = spectrum((vUv.x + vUv.y) * 0.85 - (uGlint.x + uGlint.y) * 1.2 + tilt);
    float streak = bars((vUv.x - vUv.y) * 2.6 + uGlint.x * 1.8 - uGlint.y * 0.6 + tilt * 0.5);
    float band = smoothstep(0.32, 0.7, streak);
    vec3 silver = vec3(0.8, 0.82, 0.86) * (0.88 + 0.16 * diffuse);
    vec3 film = mix(silver, rainbow * 1.08, clamp(band * (0.55 + 0.45 * near) + 0.18 * near, 0.0, 1.0));
    vec3 ink = albedo * (0.86 + 0.14 * diffuse) + rainbow * band * 0.22 * (0.4 + 0.6 * near);
    vec3 base = mix(albedo * (0.86 + 0.14 * diffuse), mix(ink, film, foil), uShine * 0.6 + 0.4);
    vec2 cell = floor(vUv * 180.0);
    vec2 jitter = vec2(hash(cell), hash(cell + 7.3)) * 0.6 + 0.2;
    float dist = length(fract(vUv * 180.0) - jitter);
    vec3 facet = normalize(vec3(vec2(hash(cell + 2.1), hash(cell + 5.7)) * 2.0 - 1.0, 1.6));
    float glint = pow(max(dot(facet, halfway), 0.0), 60.0) * smoothstep(0.32, 0.05, dist) * step(0.55, hash(cell + 3.1)) * (0.15 + 0.85 * foil);
    color = (base + spectrum(hash(cell) + uGlint.x) * glint * 1.6 * uShine + vec3(pow(nh, 140.0) * 0.4 * uShine)) * art.a;
  } else {
    color = art.rgb * (0.86 + 0.16 * diffuse) + vec3(pow(nh, 220.0) * 0.4 + pow(nh, 24.0) * 0.03) * uShine * art.a;
  }
  float bend = uPass == 3 ? smoothstep(0.0, uRadius * 0.6, vCurl) : 0.0;
  float glare = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * bend * (0.18 + 0.3 * uShine);
  outColor = vec4(min(color * shade + vec3(glare) * art.a, vec3(art.a)), art.a);
}`,Ut=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Ft=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
uniform float uSigma;
uniform float uStrength;
uniform int uMode;
in vec2 vUv;
out vec4 outColor;

void main() {
  if (uMode == 1) {
    outColor = vec4(0.0, 0.0, 0.0, texture(uSource, vUv).a * uStrength);
    return;
  }
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = -8; i <= 8; i++) {
    float offset = float(i);
    float weight = exp(-0.5 * offset * offset / (uSigma * uSigma));
    sum += texture(uSource, vUv + uStep * offset) * weight;
    total += weight;
  }
  outColor = sum / total;
}`,_=(i,d,P)=>Math.min(P,Math.max(d,i)),Ze=i=>Math.atan2(Math.sin(i),Math.cos(i)),Je=i=>i*Math.PI/180,we=(i,d,P,p,w,u)=>{let b=2*Math.PI*p,C=`${d}V`;i[C]+=(b*b*(P-i[d])-2*w*b*i[C])*u,i[d]+=i[C]*u},Qe=(i,d,P)=>{let p=i.createShader(d);return p?(i.shaderSource(p,P),i.compileShader(p),i.getShaderParameter(p,i.COMPILE_STATUS)?p:(i.deleteShader(p),null)):null},et=(i,d,P)=>{let p=Qe(i,i.VERTEX_SHADER,d),w=Qe(i,i.FRAGMENT_SHADER,P),u=i.createProgram();if(!p||!w||!u)return null;if(i.attachShader(u,p),i.attachShader(u,w),i.bindAttribLocation(u,0,"aGrid"),i.linkProgram(u),i.deleteShader(p),i.deleteShader(w),!i.getProgramParameter(u,i.LINK_STATUS))return i.deleteProgram(u),null;let b={},C=i.getProgramParameter(u,i.ACTIVE_UNIFORMS);for(let $=0;$<C;$++){let K=i.getActiveUniform(u,$);K&&(b[K.name]=i.getUniformLocation(u,K.name))}return{program:u,uniforms:b}},Lt=i=>{let d=[...i].sort((u,b)=>u[0]-b[0]||u[1]-b[1]);if(d.length<3)return d;let P=(u,b,C)=>(b[0]-u[0])*(C[1]-u[1])-(b[1]-u[1])*(C[0]-u[0]),p=[];d.forEach(u=>{for(;p.length>=2&&P(p[p.length-2],p[p.length-1],u)<=0;)p.pop();p.push(u)});let w=[];for(let u=d.length-1;u>=0;u--){let b=d[u];for(;w.length>=2&&P(w[w.length-2],w[w.length-1],b)<=0;)w.pop();w.push(b)}return p.slice(0,-1).concat(w.slice(0,-1))},It=({imageSrc:i,width:d=200,rotate:P=0,peelDirection:p=0,peelBackHoverPct:w=25,peelBackActivePct:u=40,curlRadius:b=12,finish:C="gloss",backColor:$="#d4d4d8",lightingIntensity:K=.5,shadowIntensity:nt=.6,followPointer:rt=!0,draggable:it=!0,swing:at=1,friction:st=.5,bounce:ct=.35,intro:lt=!0,initialPosition:ut="center",onDragStart:ft,onDragEnd:ht,dpr:dt,className:mt="",style:vt,...pt})=>{let Me=(0,G.useRef)(null),Se=(0,G.useRef)(null),Ae=(0,G.useRef)(null),fe=(0,G.useRef)(null),_e={imageSrc:i,width:Math.max(16,d),rotate:Je(P),peelDirection:Je(p),hoverPeel:_(w,0,100)/100,activePeel:_(u,0,100)/100,curlRadius:Math.max(2,b),finish:At[C]??0,backColor:$,lighting:_(K,0,1),shadow:_(nt,0,1),followPointer:rt,draggable:it,swing:_(at,0,3),friction:_(st,0,1),bounce:_(ct,0,1),intro:lt,initialPosition:ut,onDragStart:ft,onDragEnd:ht,dpr:dt},E=(0,G.useRef)(_e);return E.current=_e,(0,G.useEffect)(()=>{let H=Me.current,X=Se.current,x=Ae.current,B=H?.parentElement,e=X?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!0,stencil:!1});if(!H||!X||!x||!B||!e)return;let V=et(e,_t,Pt),j=et(e,Ut,Ft);if(!V||!j)return;let m=V.uniforms,k=j.uniforms,te=[0,1].map(()=>{let n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let o=e.createFramebuffer();return{texture:n,buffer:o,width:0,height:0}}),gt=()=>{let n=Math.max(1,Math.round(U.size/2)),o=n;te.forEach(r=>{r.width===n&&r.height===o||(r.width=n,r.height=o,e.bindTexture(e.TEXTURE_2D,r.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,n,o,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,r.buffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r.texture,0))}),e.bindFramebuffer(e.FRAMEBUFFER,null)},he=new Float32Array((A+1)*(A+1)*2);for(let n=0;n<=A;n++)for(let o=0;o<=A;o++){let r=(n*(A+1)+o)*2;he[r]=o/A,he[r+1]=n/A}let Pe=new Uint16Array(A*A*6),Ue=0;for(let n=0;n<A;n++)for(let o=0;o<A;o++){let r=n*(A+1)+o,a=r+1,s=r+A+1,c=s+1;Pe.set([r,a,c,r,c,s],Ue),Ue+=6}let de=e.createVertexArray();e.bindVertexArray(de);let Fe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Fe),e.bufferData(e.ARRAY_BUFFER,he,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Le=e.createBuffer();e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,Le),e.bufferData(e.ELEMENT_ARRAY_BUFFER,Pe,e.STATIC_DRAW);let me=e.createTexture(),D=document.createElement("canvas"),O=D.getContext("2d",{willReadFrequently:!0}),W=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),Ie=new Map,xt=n=>{let o=String(n),r=Ie.get(o);if(r)return r;let a=[.83,.83,.85];if(W){W.clearRect(0,0,1,1),W.fillStyle="#d4d4d8",W.fillStyle=o,W.fillRect(0,0,1,1);let[s,c,g]=W.getImageData(0,0,1,1).data;a=[s/255,c/255,g/255]}return Ie.set(o,a),a},De=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,l={ready:!1,aspect:1,meshX:1,meshY:1,texel:1,mask:null,maskW:1,maskH:1,hull:[]},U={ratio:1,size:1,density:0},F={width:1,height:1},t={x:0,y:0,vx:0,vy:0,placed:!1,swing:0,swingV:0,peel:0,peelV:0,lift:0,liftV:0,dir:E.current.peelDirection,hover:!1,local:{x:0,y:0},press:null,pivotV:{x:0,y:0},light:{x:0,y:0,z:le},pointer:{x:0,y:0,inside:!1},intro:E.current.intro&&!De?0:1};t.intro<1&&(t.lift=1.5,t.peel=.3,t.swing=.1,t.dir+=.6);let Z=0,q=0,oe=!0,ve=null,Ne=!0,Y=()=>E.current.width*l.aspect,Et=(n,o)=>{let a=E.current.width,s=Y();if(!l.hull.length){let y=(Math.abs(n)*a+Math.abs(o)*s)/2;return[-y,y]}let c=1/0,g=-1/0;return l.hull.forEach(([y,I])=>{let f=y*a*n+I*s*o;f<c&&(c=f),f>g&&(g=f)}),[c,g]},Ce=n=>{if(ve=n,l.ready=!1,!n)return;let o=new Image;o.crossOrigin="anonymous",o.decoding="async",o.onload=()=>{if(!Ne||ve!==n||!O)return;let r=o.naturalWidth||1,a=o.naturalHeight||1,s=Math.min(1,St/(Math.max(r,a)*(1+2*be))),c=Math.max(1,Math.round(r*s)),g=Math.max(1,Math.round(a*s)),y=Math.round(c*be),I=Math.round(g*be);D.width=c+y*2,D.height=g+I*2,O.clearRect(0,0,D.width,D.height),O.drawImage(o,y,I,c,g),e.bindTexture(e.TEXTURE_2D,me),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,D),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),l.aspect=a/r,l.meshX=D.width/c,l.meshY=D.height/g,l.texel=D.width;let f=Math.max(8,Math.round(Ke*Math.min(1,r/a))),T=Math.max(8,Math.round(Ke*Math.min(1,a/r)));D.width=f,D.height=T,O.clearRect(0,0,f,T),O.drawImage(o,0,0,f,T);let J=O.getImageData(0,0,f,T).data,S=new Uint8Array(f*T).fill(255),N=[],R=(h,v)=>{let M=v*f+h;S[M]===0||J[M*4+3]>100||(S[M]=0,N.push(M))};for(let h=0;h<f;h++)R(h,0),R(h,T-1);for(let h=0;h<T;h++)R(0,h),R(f-1,h);for(;N.length;){let h=N.pop(),v=h%f,M=(h-v)/f;v>0&&R(v-1,M),v<f-1&&R(v+1,M),M>0&&R(v,M-1),M<T-1&&R(v,M+1)}let z=[];for(let h=0;h<T;h++)for(let v=0;v<f;v++)J[(h*f+v)*4+3]>127&&z.push([(v+.5)/f-.5,(h+.5)/T-.5]);l.mask=S,l.maskW=f,l.maskH=T,l.hull=Lt(z),l.ready=!0,ne(),L()},o.src=n},ne=()=>{let n=E.current;U.ratio=Math.min(n.dpr||window.devicePixelRatio||1,2),F.width=Math.max(1,B.clientWidth),F.height=Math.max(1,B.clientHeight);let o=Y(),r=Math.ceil(Math.hypot(n.width,o)*1.16+2*(36+n.curlRadius));if((r!==U.size||U.ratio!==U.density)&&(U.size=r,U.density=U.ratio,H.style.width=`${r}px`,H.style.height=`${r}px`,X.width=Math.round(r*U.ratio),X.height=Math.round(r*U.ratio)),x.style.width=`${n.width}px`,x.style.height=`${o}px`,!t.placed){let a=n.initialPosition,s=a&&typeof a=="object"?a:{x:0,y:0};t.x=F.width/2+(s.x||0),t.y=F.height/2+(s.y||0),t.light={x:t.x-n.width*.45,y:t.y-o*.9,z:le*1.6},t.placed=!0}pe()},yt=()=>{let n=E.current,o=n.rotate+t.swing,r=1+.07*Math.max(0,t.lift),a=n.width/2*r,s=Y()/2*r,c=Math.abs(Math.cos(o)),g=Math.abs(Math.sin(o));return{x:a*c+s*g,y:a*g+s*c}},pe=()=>{let n=E.current,o=yt(),r=Math.min(o.x,F.width/2),a=Math.max(F.width-o.x,F.width/2),s=Math.min(o.y,F.height/2),c=Math.max(F.height-o.y,F.height/2);t.x<r?(t.x=r,t.vx<0&&(t.vx=-t.vx*n.bounce)):t.x>a&&(t.x=a,t.vx>0&&(t.vx=-t.vx*n.bounce)),t.y<s?(t.y=s,t.vy<0&&(t.vy=-t.vy*n.bounce)):t.y>c&&(t.y=c,t.vy>0&&(t.vy=-t.vy*n.bounce))},re=n=>{let o=B.getBoundingClientRect();return{x:n.clientX-o.left-B.clientLeft,y:n.clientY-o.top-B.clientTop}},ge=n=>{let r=-(E.current.rotate+t.swing),a=1+.07*Math.max(0,t.lift),s=n.x-t.x,c=n.y-t.y;return{x:(Math.cos(r)*s-Math.sin(r)*c)/a,y:(Math.sin(r)*s+Math.cos(r)*c)/a}},Tt=n=>{if(!l.mask)return!1;let o=E.current,r=Math.floor((n.x/o.width+.5)*l.maskW),a=Math.floor((n.y/Y()+.5)*l.maskH);return r<0||a<0||r>=l.maskW||a>=l.maskH?!1:l.mask[a*l.maskW+r]>100},bt=()=>{let n=E.current,o=U.size;H.style.transform=`translate3d(${t.x-o/2}px, ${t.y-o/2}px, 0)`;let r=n.rotate+t.swing,a=1+.07*Math.max(0,t.lift);if(x.style.transform=`translate(-50%, -50%) rotate(${r}rad) scale(${a})`,e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,X.width,X.height),e.clearColor(0,0,0,0),e.clearDepth(1),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),!l.ready)return;let s=n.width,c=Y(),g=-Math.sin(t.dir),y=Math.cos(t.dir),[I,f]=Et(g,y),T=_(t.peel,0,1),J=I+T*(f-I),S=Math.max(0,t.lift),N=o/2,R=A*A*6,z=T>.001;e.useProgram(V.program),e.bindVertexArray(de),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,me),e.uniform1i(m.uImage,0),e.uniform2f(m.uCanvas,o,o),e.uniform2f(m.uMesh,s*l.meshX,c*l.meshY),e.uniform2f(m.uCenter,N,N),e.uniform2f(m.uDir,g,y),e.uniform1f(m.uFold,J),e.uniform1f(m.uRadius,n.curlRadius),e.uniform1f(m.uAngle,r),e.uniform1f(m.uScale,a),e.uniform1f(m.uLift,S*26),e.uniform2f(m.uShadowOffset,1.2,2.4),e.uniform2f(m.uShadowSlope,.28,.55),e.uniform1i(m.uFinish,n.finish),e.uniform3fv(m.uBack,xt(n.backColor)),e.uniform3f(m.uLight,t.light.x-(t.x-N),t.light.y-(t.y-N),t.light.z),e.uniform1f(m.uShine,n.lighting),e.uniform1f(m.uShadow,n.shadow*.55),e.uniform1f(m.uTexel,l.texel/(s*l.meshX)),e.uniform1f(m.uLod,Math.max(0,Math.log2(l.texel/(s*l.meshX*a*U.ratio))));let h=ge(t.light);if(e.uniform2f(m.uGlint,h.x/(s*l.meshX)+.5,h.y/(c*l.meshY)+.5),e.disable(e.DEPTH_TEST),z){gt();let[v,M]=te;e.bindFramebuffer(e.FRAMEBUFFER,v.buffer),e.viewport(0,0,v.width,v.height),e.clear(e.COLOR_BUFFER_BIT),e.disable(e.BLEND),e.uniform1i(m.uPass,2),e.drawElements(e.TRIANGLES,R,e.UNSIGNED_SHORT,0),e.useProgram(j.program),e.uniform1i(k.uSource,1),e.uniform1i(k.uMode,0),e.uniform1f(k.uSigma,Math.min(4,(2.5+n.curlRadius*.15)/2)),e.activeTexture(e.TEXTURE1),e.bindFramebuffer(e.FRAMEBUFFER,M.buffer),e.bindTexture(e.TEXTURE_2D,v.texture),e.uniform2f(k.uStep,1/v.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,v.buffer),e.bindTexture(e.TEXTURE_2D,M.texture),e.uniform2f(k.uStep,0,1/v.height),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,X.width,X.height),e.useProgram(V.program),e.activeTexture(e.TEXTURE0)}e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.uniform1i(m.uPass,0),e.drawElements(e.TRIANGLES,R,e.UNSIGNED_SHORT,0),e.uniform1i(m.uPass,1),e.drawElements(e.TRIANGLES,R,e.UNSIGNED_SHORT,0),z&&(e.useProgram(j.program),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,te[0].texture),e.uniform1i(k.uMode,1),e.uniform1f(k.uStrength,n.shadow*.6),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(V.program),e.activeTexture(e.TEXTURE0),e.enable(e.DEPTH_TEST),e.depthFunc(e.LESS),e.uniform1i(m.uPass,3),e.drawElements(e.TRIANGLES,R,e.UNSIGNED_SHORT,0),e.disable(e.DEPTH_TEST))},Xe=n=>{if(Z=0,!oe||document.hidden)return;let o=E.current,r=q?_((n-q)/1e3,.001,1/30):1/60;q=n,o.imageSrc!==ve&&Ce(o.imageSrc);let a=Y();t.intro<1&&l.ready&&(t.intro=Math.min(1,t.intro+r/1.1));let s=t.press,c=s&&s.moving?s:null;if(c){let S=c.pointer,N=c.pivot,R=1-Math.exp(-r/.045),z=t.pivotV.x+((S.x-N.x)/r-t.pivotV.x)*R,h=t.pivotV.y+((S.y-N.y)/r-t.pivotV.y)*R,v=(z-t.pivotV.x)/r,M=(h-t.pivotV.y)/r;t.pivotV.x=z,t.pivotV.y=h,c.pivot={x:S.x,y:S.y};let ae=o.rotate+t.swing,Ee=-(Math.cos(ae)*c.grab.x-Math.sin(ae)*c.grab.y),ye=-(Math.sin(ae)*c.grab.x+Math.cos(ae)*c.grab.y),wt=(o.width*o.width+a*a)/12+Ee*Ee+ye*ye,Rt=(Ee*-_(M,-24e3,24e3)-ye*-_(v,-24e3,24e3))/wt,Te=2*Math.PI*1.5;t.swingV+=(Rt*1.1*o.swing-Te*Te*t.swing-2*.45*Te*t.swingV)*r,t.swing=_(t.swing+t.swingV*r,-1.2,1.2);let se=o.rotate+t.swing,qe=1+.07*Math.max(0,t.lift);t.x=S.x-(Math.cos(se)*c.grab.x-Math.sin(se)*c.grab.y)*qe,t.y=S.y-(Math.sin(se)*c.grab.x+Math.cos(se)*c.grab.y)*qe,pe()}else{we(t,"swing",0,1.4,.32,r);let S=Math.exp(-r*(1.5+9*o.friction));t.vx*=S,t.vy*=S,Math.hypot(t.vx,t.vy)<4&&(t.vx=0,t.vy=0),t.x+=t.vx*r,t.y+=t.vy*r,pe()}let g=t.intro<.2,y=g?.3:s?o.activePeel:t.hover?o.hoverPeel:0;we(t,"peel",y,s||t.hover?3:3.6,s||t.hover?.7:.62,r),we(t,"lift",c?1:0,3.2,.55,r);let I=o.peelDirection;s&&Math.hypot(s.grab.x,s.grab.y)>Math.min(o.width,a)*.12?I=Math.atan2(s.grab.x,-s.grab.y):o.followPointer&&t.hover&&Math.hypot(t.local.x,t.local.y)>Math.min(o.width,a)*.12&&(I=Math.atan2(t.local.x,-t.local.y)),g||(t.dir+=Ze(I-t.dir)*(1-Math.exp(-r/.12)));let f=t.pointer.inside?{x:t.pointer.x,y:t.pointer.y,z:le}:{x:t.x-o.width*.45,y:t.y-a*.9,z:le*1.6},T=1-Math.exp(-r/.08);t.light.x+=(f.x-t.light.x)*T,t.light.y+=(f.y-t.light.y)*T,t.light.z+=(f.z-t.light.z)*T,X.style.opacity=String(_(t.intro/.12,0,1)),bt(),t.intro<1&&l.ready||s||Math.abs(t.peel-y)>5e-4||Math.abs(t.peelV)>5e-4||Math.abs(t.lift-(c?1:0))>5e-4||Math.abs(t.liftV)>5e-4||Math.abs(t.swing)>5e-4||Math.abs(t.swingV)>5e-4||t.vx!==0||t.vy!==0||Math.abs(Ze(I-t.dir))>.002||Math.hypot(f.x-t.light.x,f.y-t.light.y,f.z-t.light.z)>.5?Z=requestAnimationFrame(Xe):q=0};function L(){!Z&&oe&&!document.hidden&&(Z=requestAnimationFrame(Xe))}let xe=n=>{let o=re(n);t.local=ge(o);let r=Tt(t.local);r!==t.hover&&(t.hover=r),x.style.cursor=r&&E.current.draggable?t.press?"grabbing":"grab":""},Ge=n=>{let o=re(n);t.pointer.x=o.x,t.pointer.y=o.y,t.pointer.inside=o.x>=0&&o.y>=0&&o.x<=F.width&&o.y<=F.height,L()},Be=n=>{let o=t.press;if(!o)xe(n);else if(o.id===n.pointerId){let r=re(n);o.pointer=r,!o.moving&&Math.hypot(r.x-o.origin.x,r.y-o.origin.y)>3&&(o.moving=E.current.draggable,o.moving&&E.current.onDragStart?.()),o.samples.push({x:r.x,y:r.y,t:performance.now()}),o.samples.length>8&&o.samples.shift()}L()},ze=()=>{t.press||(t.hover=!1,x.style.cursor="",L())},ke=n=>{let o=E.current;if(n.button!==0||!l.ready||(xe(n),!t.hover))return;let r=re(n);t.press={id:n.pointerId,grab:ge(r),origin:r,pointer:r,pivot:r,moving:!1,samples:[]},t.pivotV={x:0,y:0},t.vx=0,t.vy=0,x.setPointerCapture?.(n.pointerId),o.draggable&&(x.style.cursor="grabbing",je+=1,H.style.zIndex=String(je)),n.preventDefault(),L()},ie=n=>{let o=t.press;if(!o||o.id!==n.pointerId)return;t.press=null,x.hasPointerCapture?.(n.pointerId)&&x.releasePointerCapture(n.pointerId);let r=performance.now(),a=o.samples.filter(s=>r-s.t<90);if(o.moving&&a.length>1&&!De){let s=a[0],c=a[a.length-1],g=Math.max(c.t-s.t,16)/1e3,y=2600;t.vx=_((c.x-s.x)/g,-y,y),t.vy=_((c.y-s.y)/g,-y,y)}xe(n),n.pointerType!=="mouse"&&(t.hover=!1),o.moving&&E.current.onDragEnd?.(),L()},He=()=>{t.pointer.inside=!1,L()},Ve=()=>{q=0,L()},Oe=new ResizeObserver(()=>{ne(),L()});Oe.observe(B);let We=new IntersectionObserver(n=>{oe=n.some(o=>o.isIntersecting),oe&&(q=0,L())});return We.observe(B),window.addEventListener("pointermove",Ge,{passive:!0}),document.documentElement.addEventListener("pointerleave",He),document.addEventListener("visibilitychange",Ve),x.addEventListener("pointermove",Be),x.addEventListener("pointerleave",ze),x.addEventListener("pointerdown",ke),x.addEventListener("pointerup",ie),x.addEventListener("pointercancel",ie),Ce(E.current.imageSrc),ne(),fe.current=()=>{ne(),L()},L(),()=>{Ne=!1,cancelAnimationFrame(Z),fe.current=null,Oe.disconnect(),We.disconnect(),window.removeEventListener("pointermove",Ge),document.documentElement.removeEventListener("pointerleave",He),document.removeEventListener("visibilitychange",Ve),x.removeEventListener("pointermove",Be),x.removeEventListener("pointerleave",ze),x.removeEventListener("pointerdown",ke),x.removeEventListener("pointerup",ie),x.removeEventListener("pointercancel",ie),e.deleteTexture(me),te.forEach(n=>{e.deleteTexture(n.texture),e.deleteFramebuffer(n.buffer)}),e.deleteProgram(j.program),e.deleteBuffer(Fe),e.deleteBuffer(Le),e.deleteVertexArray(de),e.deleteProgram(V.program),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,G.useEffect)(()=>{fe.current?.()}),(0,ee.jsxs)("div",{ref:Me,className:["pointer-events-none absolute left-0 top-0 will-change-transform",mt].filter(Boolean).join(" "),style:vt,...pt,children:[(0,ee.jsx)("canvas",{ref:Se,className:"pointer-events-none block h-full w-full","aria-hidden":"true"}),(0,ee.jsx)("div",{ref:Ae,className:"pointer-events-auto absolute left-1/2 top-1/2 touch-none select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"})]})},tt=It;var Re=Q(ce(),1),ot=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],ue=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],zt=ot.map((i,d)=>({id:d+1,image:i,src:i,img:i,url:i,title:ue[d],text:ue[d],label:ue[d],alt:ue[d],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][d],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Dt({big:i}){return(0,Re.jsx)($e,{big:i,dark:!0,center:!0,zoom:1,drive:"move",children:(0,Re.jsx)(tt,{imageSrc:ot[0],width:220})})}var kt=Ye(Dt);export{kt as default};
