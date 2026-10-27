import{c as D,i as Ke,j as k,l as xe,m as we}from"./chunks/chunk-6IYH4WPJ.js";var x=D(Ke(),1),Z=D(k(),1),He="relative h-full w-full overflow-hidden",Ve="absolute inset-0 block h-full w-full",qe=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ye=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uScale;
uniform float uRotation;
uniform int uDetail;
uniform float uWarp;
uniform float uHue;
uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;
uniform float uGrain;
uniform float uSeed;
uniform float uFade;
uniform float uOpacity;
uniform sampler2D uField;
uniform float uStir;
uniform vec3 uPointer;
uniform float uSheen;
uniform vec4 uSwirls[6];
in vec2 vUv;
out vec4 outColor;

vec3 hueRotate(vec3 c, float angle) {
  const vec3 k = vec3(0.57735027);
  float ca = cos(angle);
  return c * ca + cross(k, c) * sin(angle) + k * dot(k, c) * (1.0 - ca);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 aspect = uResolution / mr;
  vec2 st = vUv - texture(uField, vUv).rg * uStir;

  for (int k = 0; k < 6; k++) {
    vec4 swirl = uSwirls[k];
    if (swirl.w == 0.0) continue;
    vec2 delta = (st - swirl.xy) * aspect;
    float angle = swirl.w * exp(-dot(delta, delta) / (swirl.z * swirl.z));
    float ca = cos(angle);
    float sa = sin(angle);
    st = swirl.xy + vec2(ca * delta.x - sa * delta.y, sa * delta.x + ca * delta.y) / aspect;
  }

  vec2 uv = (st * 2.0 - 1.0) * aspect;
  float c = cos(uRotation);
  float s = sin(uRotation);
  uv = mat2(c, -s, s, c) * uv / uScale;
  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5;
  float a = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uDetail) break;
    float fi = float(i);
    a += cos(fi - d - a * uv.x * uWarp);
    d += sin(uv.y * fi + a);
  }
  d += uTime * 0.5;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

  vec2 toPointer = (vUv - uPointer.xy) * aspect;
  col += col * uPointer.z * uSheen * 0.8 * exp(-dot(toPointer, toPointer) / 0.09);

  col = hueRotate(col, uHue);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBrightness;
  col += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain * 0.12;
  col = clamp(col, 0.0, 1.0);

  float alpha = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * mr * 0.5;
    alpha *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    alpha *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(col * alpha, alpha);
}`,$e=48,Re=6,Q=3.2,T=(c,d,A)=>Math.min(A,Math.max(d,c)),Te=(c,d,A)=>{let g=c.createShader(d);return g?(c.shaderSource(g,A),c.compileShader(g),c.getShaderParameter(g,c.COMPILE_STATUS)?g:(c.deleteShader(g),null)):null},Je=({color:c=[1,1,1],speed:d=1,amplitude:A=.1,mouseReact:g=!0,scale:Ee=1,detail:Se=8,rotation:be=0,warp:ye=1,hueShift:Ae=0,saturation:Pe=1,brightness:Fe=1.5,contrast:_e=1,stir:De=.5,sheen:Ue=.3,clickSwirl:Ce=!0,grain:Le=0,fade:Ie=0,opacity:ke=1,resolution:Xe=1,paused:Oe=!1,className:ee="",style:Be})=>{let te=(0,x.useRef)(null),oe=(0,x.useRef)(null),O=(0,x.useRef)(null),re={colorKey:Array.isArray(c)?c.join(","):String(c),color:c,speed:d,amplitude:A,mouseReact:g,scale:Math.max(.05,Ee),detail:T(Math.round(Se),1,24),rotation:be,warp:ye,hueShift:Ae,saturation:Math.max(0,Pe),brightness:Math.max(0,Fe),contrast:Math.max(0,_e),stir:Math.max(0,De),sheen:Math.max(0,Ue),clickSwirl:Ce,grain:T(Le,0,1),fade:T(Ie,0,1),opacity:T(ke,0,1),resolution:T(Xe,.1,2),paused:Oe},w=(0,x.useRef)(re);return w.current=re,(0,x.useEffect)(()=>{let M=te.current,R=oe.current,e=R?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!M||!R||!e)return;let B=Te(e,e.VERTEX_SHADER,qe),G=Te(e,e.FRAGMENT_SHADER,Ye),v=e.createProgram();if(!B||!G||!v||(e.attachShader(v,B),e.attachShader(v,G),e.linkProgram(v),!e.getProgramParameter(v,e.LINK_STATUS)))return;e.useProgram(v);let ae=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ae),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let ie=e.getAttribLocation(v,"aPosition");e.enableVertexAttribArray(ie),e.vertexAttribPointer(ie,2,e.FLOAT,!1,0,0);let n={};for(let o of["uResolution","uTime","uColor","uMouse","uAmplitude","uScale","uRotation","uDetail","uWarp","uHue","uSaturation","uBrightness","uContrast","uGrain","uSeed","uFade","uOpacity","uField","uStir","uPointer","uSheen","uSwirls"])n[o]=e.getUniformLocation(v,o);let U=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.uniform1i(n.uField,0);let N=document.createElement("canvas");N.width=1,N.height=1;let E=N.getContext("2d",{willReadFrequently:!0}),W=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,u={x:.5,y:.5,px:0,py:0,inside:!1,tracked:!1},t={width:1,height:1,phase:0,mouse:[.5,.5],presence:0,color:[1,1,1],colorKey:"",cols:0,rows:0,field:new Float32Array(0),scratch:new Float32Array(0),fieldActive:!1,swirls:[],seed:0},z=new Float32Array(Re*4),S=0,P=0,C=!0,K=!0,Ge=o=>{if(o.colorKey===t.colorKey)return;if(t.colorKey=o.colorKey,Array.isArray(o.color)){t.color=[0,1,2].map(s=>T(Number(o.color[s]??1),0,1));return}if(!E)return;E.clearRect(0,0,1,1),E.fillStyle="#ffffff",E.fillStyle=String(o.color),E.fillRect(0,0,1,1);let[r,i,a]=E.getImageData(0,0,1,1).data;t.color=[r/255,i/255,a/255]},Ne=()=>{let o=$e,r=T(Math.round(o*t.height/t.width),6,96);o===t.cols&&r===t.rows||(t.cols=o,t.rows=r,t.field=new Float32Array(o*r*2),t.scratch=new Float32Array(o*r*2),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,o,r,0,e.RG,e.FLOAT,t.field))},We=(o,r,i,a)=>{let{cols:s,rows:m,field:p}=t,l=.22,h=t.width/t.height,F=Math.max(0,Math.floor((o-l/h)*s)),q=Math.min(s-1,Math.ceil((o+l/h)*s)),Y=Math.max(0,Math.floor((r-l)*m)),$=Math.min(m-1,Math.ceil((r+l)*m));for(let y=Y;y<=$;y++)for(let f=F;f<=q;f++){let L=((f+.5)/s-o)*h,me=(y+.5)/m-r,_=1-(L*L+me*me)/(l*l);if(_<=0)continue;let I=(y*s+f)*2,he=p[I]+i*_*_*3.2,pe=p[I+1]+a*_*_*3.2,J=Math.hypot(he,pe),ve=.4,ge=J>0?ve*Math.tanh(J/ve)/J:0;p[I]=he*ge,p[I+1]=pe*ge}t.fieldActive=!0},ze=o=>{let{cols:r,rows:i,field:a,scratch:s}=t,m=Math.exp(-o*1.4),p=0;for(let l=0;l<i;l++)for(let h=0;h<r;h++){let F=(l*r+h)*2,q=(l*r+Math.max(0,h-1))*2,Y=(l*r+Math.min(r-1,h+1))*2,$=(Math.max(0,l-1)*r+h)*2,y=(Math.min(i-1,l+1)*r+h)*2;for(let f=0;f<2;f++){let L=(a[F+f]*12+a[q+f]+a[Y+f]+a[$+f]+a[y+f])/16;s[F+f]=L*m,p=Math.max(p,Math.abs(s[F+f]))}}a.set(s),p<4e-4&&(a.fill(0),t.fieldActive=!1)},H=()=>{let o=w.current;Ge(o),Ne(),e.viewport(0,0,R.width,R.height),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.texSubImage2D(e.TEXTURE_2D,0,0,0,t.cols,t.rows,e.RG,e.FLOAT,t.field),z.fill(0),t.swirls.forEach((r,i)=>{let a=.21*(1+.4*r.age),s=Math.exp(-r.age*1.35)-Math.exp(-r.age*10),m=Math.min(1,(Q-r.age)/.8);z.set([r.x,r.y,a,3*s*m*(.21/a)**2],i*4)}),e.uniform2f(n.uResolution,t.width,t.height),e.uniform1f(n.uTime,t.phase),e.uniform3f(n.uColor,t.color[0],t.color[1],t.color[2]),e.uniform2f(n.uMouse,t.mouse[0],t.mouse[1]),e.uniform1f(n.uAmplitude,o.amplitude),e.uniform1f(n.uScale,o.scale),e.uniform1f(n.uRotation,o.rotation*Math.PI/180),e.uniform1i(n.uDetail,o.detail),e.uniform1f(n.uWarp,o.warp),e.uniform1f(n.uHue,o.hueShift*Math.PI/180),e.uniform1f(n.uSaturation,o.saturation),e.uniform1f(n.uBrightness,o.brightness),e.uniform1f(n.uContrast,o.contrast),e.uniform1f(n.uGrain,o.grain),e.uniform1f(n.uSeed,t.seed),e.uniform1f(n.uFade,o.fade),e.uniform1f(n.uOpacity,o.opacity),e.uniform1f(n.uStir,o.mouseReact?o.stir:0),e.uniform3f(n.uPointer,u.x,u.y,o.mouseReact?t.presence:0),e.uniform1f(n.uSheen,o.sheen),e.uniform4fv(n.uSwirls,z),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)},ne=o=>{if(S=0,!K||!C)return;let r=w.current,i=P?Math.min(.05,(o-P)/1e3):1/60;P=o;let a=!r.paused&&!W;a&&(t.phase+=i*r.speed);let s=r.mouseReact&&u.tracked?[u.x,u.y]:[.5,.5],m=1-Math.exp(-i*5);t.mouse[0]+=(s[0]-t.mouse[0])*m,t.mouse[1]+=(s[1]-t.mouse[1])*m,t.presence+=((u.inside?1:0)-t.presence)*(1-Math.exp(-i*4)),t.fieldActive&&ze(i),t.swirls=t.swirls.filter(l=>(l.age+=i)<Q),r.grain>0&&a&&(t.seed=Math.floor(o/42)%997),H();let p=Math.abs(s[0]-t.mouse[0])>5e-4||Math.abs(s[1]-t.mouse[1])>5e-4||Math.abs((u.inside?1:0)-t.presence)>.002;a||p||t.fieldActive||t.swirls.length?S=requestAnimationFrame(ne):P=0},b=()=>{S||!K||!C||(S=requestAnimationFrame(ne))},se=o=>{let r=M.getBoundingClientRect();return{x:(o.clientX-r.left)/Math.max(1,r.width),y:1-(o.clientY-r.top)/Math.max(1,r.height)}},ce=o=>{let r=w.current,{x:i,y:a}=se(o),s=i>=0&&i<=1&&a>=0&&a<=1;s&&r.mouseReact&&!W&&u.inside&&r.stir>0&&We(i,a,i-u.x,a-u.y),u.x=i,u.y=a,u.inside=s,s&&(u.tracked=!0),b()},le=()=>{u.inside=!1,b()},ue=o=>{if(!w.current.clickSwirl||W)return;let{x:i,y:a}=se(o);if(!(i<0||i>1||a<0||a>1)){if(t.swirls.length>=Re){if(t.swirls[0].age<Q-.4)return;t.swirls.shift()}t.swirls.push({x:i,y:a,age:0}),b()}},V=()=>{let o=w.current,r=Math.min(window.devicePixelRatio||1,2)*o.resolution;t.width=Math.max(1,M.clientWidth),t.height=Math.max(1,M.clientHeight),R.width=Math.max(1,Math.round(t.width*r)),R.height=Math.max(1,Math.round(t.height*r)),H(),b()};O.current=()=>{let o=Math.min(window.devicePixelRatio||1,2)*w.current.resolution;R.width!==Math.max(1,Math.round(t.width*o))?V():S||H(),b()};let fe=new ResizeObserver(V);fe.observe(M);let de=new IntersectionObserver(o=>{C=o.some(r=>r.isIntersecting),C&&(P=0,b())});return de.observe(M),window.addEventListener("pointermove",ce,{passive:!0}),window.addEventListener("pointerdown",ue,{passive:!0}),document.documentElement.addEventListener("pointerleave",le),V(),()=>{K=!1,cancelAnimationFrame(S),O.current=null,fe.disconnect(),de.disconnect(),window.removeEventListener("pointermove",ce),window.removeEventListener("pointerdown",ue),document.documentElement.removeEventListener("pointerleave",le),e.deleteTexture(U),e.deleteBuffer(ae),e.deleteProgram(v),e.deleteShader(B),e.deleteShader(G)}},[]),(0,x.useEffect)(()=>{O.current?.()}),(0,Z.jsx)("div",{ref:te,className:`${He}${ee?` ${ee}`:""}`,style:Be,children:(0,Z.jsx)("canvas",{ref:oe,className:Ve,"aria-hidden":"true"})})},Me=Je;var j=D(k(),1),Qe=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],X=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],it=Qe.map((c,d)=>({id:d+1,image:c,src:c,img:c,url:c,title:X[d],text:X[d],label:X[d],alt:X[d],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][d],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ze({big:c}){return(0,j.jsx)(we,{big:c,dark:!0,center:!1,zoom:1,drive:!1,children:(0,j.jsx)(Me,{})})}var nt=xe(Ze);export{nt as default};
