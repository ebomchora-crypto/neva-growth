import{c as D,i as Ke,j as N,l as Ae,m as Te}from"./chunks/chunk-6IYH4WPJ.js";var E=D(Ke(),1),J=D(N(),1),je="relative h-full w-full overflow-hidden",Ze="absolute inset-0 block h-full w-full cursor-grab active:cursor-grabbing",$e=`#version 300 es
in vec2 aPosition;
in vec4 aPoster;
uniform mat4 uProjection;
uniform float uCamera;
uniform vec2 uPoster;
uniform float uDepth;
uniform float uSpacing;
uniform float uLoop;
uniform float uColumnGap;
uniform float uColumns;
uniform float uScroll;
uniform float uAlternate;
uniform float uViewHeight;
uniform float uRotation;
uniform float uDistortion;
uniform vec3 uAxis;
uniform float uLean;
out vec2 vUv;
out float vItem;
out float vFacing;
out float vScreenY;

mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat4(
    oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
    oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
    oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  return (rotationMatrix(axis, angle) * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
  return t < 0.5 ? 16.0 * pow(t, 5.0) : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
  float column = aPoster.x;
  float direction = uAlternate > 0.5 && mod(column, 2.0) > 0.5 ? -1.0 : 1.0;
  float base = -uLoop * 0.5 + (aPoster.y + 0.5) * uSpacing + column * 0.41 * uSpacing;
  float y = mod(base - uScroll * direction + uLoop * 0.5, uLoop) - uLoop * 0.5;
  float x = (column - (uColumns - 1.0) * 0.5) * uColumnGap;
  float position = 5.0 + (y + uViewHeight) / (2.0 * uViewHeight) * 10.0;
  float offset = (dot(vec2(1.0, 1.0), aPosition) + 0.25) / 0.5;
  float progress = clamp(
    (clamp(position * 0.05, 0.0, 1.0) - 0.01 * uDistortion * offset) / (1.0 - 0.01 * uDistortion),
    0.0,
    2.0
  );
  float angle = qinticInOut(progress) * uRotation;
  vec3 local = rotate(vec3(aPosition, 0.0), uAxis, angle);
  vec3 normal = rotate(vec3(0.0, 0.0, 1.0), uAxis, angle);
  local = rotate(local * vec3(uPoster, uDepth), vec3(1.0, 0.0, 0.0), uLean * direction);
  normal = rotate(normal, vec3(1.0, 0.0, 0.0), uLean * direction);
  vec3 world = local + vec3(x, y, 0.0);
  gl_Position = uProjection * vec4(world.xy, world.z - uCamera, 1.0);
  vUv = aPosition + 0.5;
  vItem = aPoster.z;
  vFacing = normal.z;
  vScreenY = gl_Position.y / gl_Position.w;
}`,Je=`#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform float uCells;
uniform float uInset;
uniform vec2 uPoster;
uniform float uRadius;
uniform float uFade;
uniform float uShading;
uniform float uReveal;
in vec2 vUv;
in float vItem;
in float vFacing;
in float vScreenY;
out vec4 outColor;

void main() {
  vec2 p = (vUv - 0.5) * uPoster;
  float r = min(uRadius, 0.5 * min(uPoster.x, uPoster.y));
  vec2 q = abs(p) - (0.5 * uPoster - r);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float aa = max(fwidth(d), 0.0001);
  float mask = r > 0.0 ? 1.0 - smoothstep(-aa, aa, d) : 1.0;
  vec2 cell = vec2(mod(vItem, uCells), floor(vItem / uCells));
  vec2 local = vec2(vUv.x, 1.0 - vUv.y);
  vec4 sampled = texture(uAtlas, (cell + uInset + local * (1.0 - 2.0 * uInset)) / uCells);
  vec3 color = sampled.rgb;
  color *= mix(1.0, 0.4 + 0.6 * abs(vFacing), uShading);
  float t = clamp((1.0 - abs(vScreenY)) / max(uFade, 0.0001), 0.0, 1.0);
  float fade = uFade > 0.0 ? t * t * t * (t * (t * 6.0 - 15.0) + 10.0) : 1.0;
  float alpha = sampled.a * mask * fade * uReveal;
  if (alpha < 0.002) discard;
  outColor = vec4(color * alpha, alpha);
}`,be={vertical:[0,1,0],horizontal:[1,0,0],diagonal:[1,1,0]},Qe=45*Math.PI/180,et=20,y=100,$=1,T=(i,g,w)=>Math.min(w,Math.max(g,i)),ye=(i,g,w)=>{let b=i.createShader(g);return b?(i.shaderSource(b,w),i.compileShader(b),i.getShaderParameter(b,i.COMPILE_STATUS)?b:(i.deleteShader(b),null)):null},we=i=>typeof i=="string"?{image:i}:i||{image:""},tt=({items:i=[],planeWidth:g=320,planeHeight:w=320,distortion:b=3,scrollEase:Pe=.01,cameraFov:_e=45,cameraZ:Ie=20,gap:Se,columns:De=1,columnGap:Le=40,alternate:Fe=!0,radius:Ue=0,rotation:Ce=180,axis:ee="vertical",speed:Be=0,lean:Ye=0,fade:Xe=0,shading:Ne=0,wheel:Ge=!0,drag:z=!0,pageScroll:ze=0,onItemClick:te,className:oe="",style:He})=>{let ae=(0,E.useRef)(null),ne=(0,E.useRef)(null),L=(0,E.useRef)(null),re={planeWidth:Math.max(10,g),planeHeight:Math.max(10,w),distortion:T(b,0,50),scrollEase:T(Pe,.001,1),cameraFov:T(_e,10,120),cameraZ:Math.max(1,Ie),gap:Se,columns:T(Math.round(De),1,8),columnGap:Math.max(0,Le),alternate:Fe,radius:Math.max(0,Ue),rotation:Ce,axis:be[ee]?ee:"vertical",speed:Be,lean:T(Ye,0,2),fade:T(Xe,0,1),shading:T(Ne,0,1),wheel:Ge,drag:z,pageScroll:ze},R=(0,E.useRef)(re);R.current=re;let F=(0,E.useRef)(i);F.current=i;let H=(0,E.useRef)(te);return H.current=te,(0,E.useEffect)(()=>{let M=ae.current,f=ne.current,e=f?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!0});if(!M||!f||!e)return;let O=ye(e,e.VERTEX_SHADER,$e),V=ye(e,e.FRAGMENT_SHADER,Je),x=e.createProgram();if(!O||!V||!x||(e.attachShader(x,O),e.attachShader(x,V),e.linkProgram(x),!e.getProgramParameter(x,e.LINK_STATUS)))return;e.useProgram(x);let s={};for(let t of["uProjection","uCamera","uPoster","uDepth","uSpacing","uLoop","uColumnGap","uColumns","uScroll","uAlternate","uViewHeight","uRotation","uDistortion","uAxis","uLean","uAtlas","uCells","uInset","uRadius","uFade","uShading","uReveal"])s[t]=e.getUniformLocation(x,t);let ie=[],W=[];for(let t=0;t<=$;t++)for(let a=0;a<=y;a++)ie.push(a/y-.5,t/$-.5);for(let t=0;t<$;t++)for(let a=0;a<y;a++){let n=t*(y+1)+a;W.push(n+y+1,n,n+y+2,n,n+1,n+y+2)}let q=e.createVertexArray();e.bindVertexArray(q);let se=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,se),e.bufferData(e.ARRAY_BUFFER,new Float32Array(ie),e.STATIC_DRAW);let ce=e.getAttribLocation(x,"aPosition");e.enableVertexAttribArray(ce),e.vertexAttribPointer(ce,2,e.FLOAT,!1,0,0);let le=e.createBuffer();e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,le),e.bufferData(e.ELEMENT_ARRAY_BUFFER,new Uint16Array(W),e.STATIC_DRAW);let k=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,k);let K=e.getAttribLocation(x,"aPoster");e.enableVertexAttribArray(K),e.vertexAttribPointer(K,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(K,1),e.bindVertexArray(null);let U=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),e.uniform1i(s.uAtlas,0);let j=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,r={canvas:document.createElement("canvas"),cells:1,cell:512,images:[],aspect:0,dirty:!1},h={active:!1,id:-1,origin:0,startY:0,startX:0,start:0},o={width:1,height:1,dpr:1,scroll:0,target:0,velocity:0,lean:0,reveal:0,slots:0,count:0,layoutKey:"",pageY:window.scrollY},P=0,_=0,C=!0,B=!0,ue=0,I=()=>{let t=R.current,a=t.cameraFov*Math.PI/180,n=o.height/(2*Math.tan(Qe/2)*et),c=t.cameraZ*n,l=t.planeHeight+(t.gap??5*n),p=2*c*Math.tan(a/2)/o.height;return{fov:a,unit:n,spacing:l,distance:c,scale:p}},fe=()=>{let t=R.current,a=F.current,{spacing:n,scale:c}=I(),l=Math.max(a.length,Math.ceil((o.height*c+t.planeHeight)/n)+1),p=[l,t.columns,a.length].join("|");if(p===o.layoutKey)return;o.layoutKey=p,o.slots=l,o.count=l*t.columns;let m=Math.max(1,a.length),v=new Float32Array(o.count*4);for(let d=0;d<t.columns;d++)for(let u=0;u<l;u++)v.set([d,u,(u+d*2)%m,0],(d*l+u)*4);e.bindBuffer(e.ARRAY_BUFFER,k),e.bufferData(e.ARRAY_BUFFER,v,e.STATIC_DRAW)},Z=()=>{let t=R.current,a=t.planeWidth/t.planeHeight,n=r.canvas.getContext("2d");n&&(r.aspect=a,n.clearRect(0,0,r.canvas.width,r.canvas.height),r.images.forEach((c,l)=>{if(!c)return;let p=r.cell,m=c.naturalWidth,v=c.naturalHeight;m/v>a?m=v*a:v=m/a;let d=l%r.cells*p,u=Math.floor(l/r.cells)*p;n.drawImage(c,(c.naturalWidth-m)/2,(c.naturalHeight-v)/2,m,v,d,u,p,p)}),r.dirty=!0)},Oe=()=>{r.dirty=!1,e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r.canvas),e.generateMipmap(e.TEXTURE_2D)},Ve=t=>{let a=++ue,n=t.map(we),c=Math.max(1,n.length);r.cells=Math.ceil(Math.sqrt(c)),r.cell=T(Math.floor(4096/r.cells),128,1024),r.canvas.width=r.cells*r.cell,r.canvas.height=r.cells*r.cell,r.images=n.map(()=>null),Z(),o.layoutKey="",n.forEach((l,p)=>{let m=new Image;m.crossOrigin="anonymous",m.decoding="async",m.onload=()=>{!B||a!==ue||(r.images[p]=m,Z(),A())},m.src=l.image||""}),A()},We=(t,a)=>{let n=R.current,c=f.getBoundingClientRect(),{spacing:l,scale:p}=I(),m=(t-c.left-c.width/2)*p,v=(c.height/2-(a-c.top))*p,d=o.slots*l;for(let u=0;u<n.columns;u++){let S=n.alternate&&u%2===1?-1:1,qe=(u-(n.columns-1)/2)*(n.planeWidth+n.columnGap);if(!(Math.abs(m-qe)>n.planeWidth/2))for(let X=0;X<o.slots;X++){let ke=((-d/2+(X+.5)*l+u*.41*l-o.scroll*S+d/2)%d+d)%d-d/2;if(Math.abs(v-ke)<=n.planeHeight/2)return(X+u*2)%Math.max(1,F.current.length)}}return-1},de=()=>{let t=R.current,{fov:a,unit:n,spacing:c,distance:l}=I(),p=o.width/o.height,m=1/Math.tan(a/2),v=Math.max(.5,l*.02),d=l*4,u=new Float32Array(16);u[0]=m/p,u[5]=m,u[10]=(d+v)/(v-d),u[11]=-1,u[14]=2*d*v/(v-d);let S=be[t.axis];e.viewport(0,0,f.width,f.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.disable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(x),e.uniformMatrix4fv(s.uProjection,!1,u),e.uniform1f(s.uCamera,l),e.uniform2f(s.uPoster,t.planeWidth,t.planeHeight),e.uniform1f(s.uDepth,n),e.uniform1f(s.uSpacing,c),e.uniform1f(s.uLoop,o.slots*c),e.uniform1f(s.uColumnGap,t.planeWidth+t.columnGap),e.uniform1f(s.uColumns,t.columns),e.uniform1f(s.uScroll,o.scroll),e.uniform1f(s.uAlternate,t.alternate?1:0),e.uniform1f(s.uViewHeight,o.height),e.uniform1f(s.uRotation,t.rotation*Math.PI/180),e.uniform1f(s.uDistortion,t.distortion),e.uniform3f(s.uAxis,S[0],S[1],S[2]),e.uniform1f(s.uLean,o.lean),e.uniform1f(s.uCells,r.cells),e.uniform1f(s.uInset,1.5/r.cell),e.uniform1f(s.uRadius,t.radius),e.uniform1f(s.uFade,t.fade),e.uniform1f(s.uShading,t.shading),e.uniform1f(s.uReveal,o.reveal),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.bindVertexArray(q),e.drawElementsInstanced(e.TRIANGLES,W.length,e.UNSIGNED_SHORT,0,o.count),e.bindVertexArray(null)},me=t=>{if(P=0,!B||!C)return;let a=R.current,n=_?Math.min(.05,(t-_)/1e3):1/60;_=t,fe(),r.aspect!==a.planeWidth/a.planeHeight&&Z(),r.dirty&&Oe(),o.reveal=Math.min(1,o.reveal+n/(j?.01:.6)),!h.active&&!j&&(o.target-=a.speed*n);let c=o.scroll;o.scroll+=(o.target-o.scroll)*(1-Math.pow(1-a.scrollEase,n*60)),o.velocity+=((o.scroll-c)/n-o.velocity)*(1-Math.exp(-n*8));let l=j?0:T(-o.velocity*a.lean*6e-4,-.5,.5);o.lean+=(l-o.lean)*(1-Math.exp(-n*6)),de(),a.speed!==0||Math.abs(o.target-o.scroll)>.05||Math.abs(o.lean)>5e-4||o.reveal<1||r.dirty?P=requestAnimationFrame(me):_=0},A=()=>{P||!B||!C||(P=requestAnimationFrame(me))},he=t=>{if(!R.current.wheel)return;t.preventDefault();let a=t.deltaMode===1?16:t.deltaMode===2?o.height:1;o.target+=t.deltaY*a*.01*I().unit,A()},pe=t=>{t.pointerType==="mouse"&&t.button!==0||(h.startX=t.clientX,h.startY=t.clientY,h.start=performance.now(),R.current.drag&&(f.setPointerCapture?.(t.pointerId),h.active=!0,h.id=t.pointerId,h.origin=o.scroll,A()))},ve=t=>{!h.active||t.pointerId!==h.id||(o.target=h.origin+(h.startY-t.clientY)*.1*I().unit,A())},Y=t=>{let a=Math.hypot(t.clientX-h.startX,t.clientY-h.startY)<6&&performance.now()-h.start<450;if(h.active&&t.pointerId===h.id&&(h.active=!1,f.releasePointerCapture?.(t.pointerId)),a&&H.current){let n=We(t.clientX,t.clientY);n>=0&&H.current(we(F.current[n]),n)}A()},ge=()=>{let t=R.current.pageScroll,a=window.scrollY;t&&(o.target+=(a-o.pageY)*t,A()),o.pageY=a},xe=()=>{o.dpr=Math.min(window.devicePixelRatio||1,2),o.width=Math.max(1,M.clientWidth),o.height=Math.max(1,M.clientHeight),f.width=Math.round(o.width*o.dpr),f.height=Math.round(o.height*o.dpr),o.layoutKey="",fe(),de(),A()};L.current={loadItems:Ve,wake:A},f.addEventListener("wheel",he,{passive:!1}),f.addEventListener("pointerdown",pe),f.addEventListener("pointermove",ve),f.addEventListener("pointerup",Y),f.addEventListener("pointercancel",Y),window.addEventListener("scroll",ge,{passive:!0});let Ee=new ResizeObserver(xe);Ee.observe(M);let Re=new IntersectionObserver(t=>{C=t.some(a=>a.isIntersecting),C&&(_=0,A())});return Re.observe(M),xe(),()=>{B=!1,cancelAnimationFrame(P),L.current=null,f.removeEventListener("wheel",he),f.removeEventListener("pointerdown",pe),f.removeEventListener("pointermove",ve),f.removeEventListener("pointerup",Y),f.removeEventListener("pointercancel",Y),window.removeEventListener("scroll",ge),Ee.disconnect(),Re.disconnect(),e.deleteTexture(U),e.deleteBuffer(se),e.deleteBuffer(le),e.deleteBuffer(k),e.deleteVertexArray(q),e.deleteProgram(x),e.deleteShader(O),e.deleteShader(V)}},[]),(0,E.useEffect)(()=>{L.current?.loadItems(i)},[i]),(0,E.useEffect)(()=>{L.current?.wake()}),(0,J.jsx)("div",{ref:ae,className:`${je}${oe?` ${oe}`:""}`,style:He,children:(0,J.jsx)("canvas",{ref:ne,className:Ze,style:{touchAction:z?"none":"auto",cursor:z?void 0:"default"}})})},Me=tt;var Q=D(N(),1),ot=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],at=ot.map((i,g)=>({id:g+1,image:i,src:i,img:i,url:i,title:G[g],text:G[g],label:G[g],alt:G[g],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][g],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function nt({big:i}){return(0,Q.jsx)(Te,{big:i,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Q.jsx)(Me,{items:at})})}var dt=Ae(nt);export{dt as default};
