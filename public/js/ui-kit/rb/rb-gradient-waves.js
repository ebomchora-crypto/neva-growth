import{c as W,i as Ye,j as D,l as xe,m as we}from"./chunks/chunk-6IYH4WPJ.js";var d=W(Ye(),1),ke=W(D(),1),Ue="relative h-full w-full overflow-hidden",Ze="absolute inset-0 block h-full w-full",G=4,ye=3.2,$e=2.8,be=8,Ke=2.6,Re=30,Se={low:56,medium:84,high:120},Qe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Je=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uClock;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uHeight;
uniform float uTilt;
uniform float uZoom;
uniform vec2 uLook;
uniform float uFogDepth;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform vec3 uHorizon;
uniform vec3 uWave;
uniform vec3 uCrest;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform vec3 uSun;
uniform float uRelief;
uniform float uSheen;
uniform float uSteps;
uniform float uStride;
uniform vec3 uIntro;
uniform vec3 uSwells[${G}];
uniform float uSwellWidth;
out vec4 outColor;

const float FAR = 4000.0;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 surface(vec2 xy) {
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(uTime / 0.130, uTime / 0.810, uTime / 0.200, uTime / 0.710);
  float a = xy.x + tc.x;
  float swellPhase = (xy.y + a) / 20.0 + tc.y;
  float bend = uSwell * cos(swellPhase) / 20.0;
  float mx = a + uSwell * sin(swellPhase);
  float crossPhase = xy.x / 23.0 + tc.w;
  float my = xy.y - tc.z + uTurbulence * cos(crossPhase);
  float twist = -uTurbulence * sin(crossPhase) / 23.0;
  float cx = cos(mx * freq.x);
  float cy = cos(my * freq.y);
  float rise = 1.0;
  if (uIntro.z > 0.0) rise = mix(1.0, smoothstep(uIntro.y * 0.45, uIntro.y * 1.6, xy.x), uIntro.z);
  float amp = uAmplitude * rise;
  float h = (sin(mx * freq.x) + sin(my * freq.y)) * amp + uHeight;
  float dx = amp * (freq.x * cx * (1.0 + bend) + freq.y * cy * twist);
  float dy = amp * (freq.x * cx * bend + freq.y * cy);
  for (int k = 0; k < ${G}; k++) {
    vec3 sw = uSwells[k];
    if (sw.z <= 0.0) continue;
    float u = (xy.x - sw.x) / uSwellWidth;
    float v = (xy.y - sw.y) / (uSwellWidth * 3.5);
    float bump = sw.z * exp(-u * u - v * v);
    h += bump;
    dx += bump * (-2.0 * u / uSwellWidth);
    dy += bump * (-2.0 * v / (uSwellWidth * 3.5));
  }
  return vec3(h, dx, dy);
}

float march(vec3 origin, vec3 dir) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float gap = origin.z + dist * dir.z - surface(origin.xy + dist * dir.xy).x;
    if (abs(gap) < 0.002 * dist + 0.01) break;
    dist += uStride * gap;
    if (!(abs(dist) < FAR)) return FAR;
  }
  return dist;
}

void main() {
  float c;
  float s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, ${Re.toFixed(1)});
  vec2 uv = gl_FragCoord.xy / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot);
  s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  dir = mat3(nuv.x, -nuv.y, 0.0, nuv.y, nuv.x, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt + uLook.y);
  s = sin(uTilt + uLook.y);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
  c = cos(uLook.x);
  s = sin(uLook.x);
  dir = mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0) * dir;

  float dist = march(cam, dir);
  vec3 pos = cam + dist * dir;
  vec3 field = surface(pos.xy);
  vec3 view = -dir;

  float crest = clamp((field.x - uHeight) / max(2.0 * uAmplitude, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  vec3 body = mix(uWave, uCrest, smoothstep(0.45, 1.0, crest) * 0.5);
  vec3 normal = normalize(vec3(-field.yz * (1.0 + 1.5 * uRelief), 1.0));
  float diffuse = clamp(dot(normal, uSun) * 0.5 + 0.5, 0.0, 1.0);
  float lightness = mix(1.0, diffuse * diffuse * (3.0 - 2.0 * diffuse), uRelief);
  float sheen = pow(clamp(dot(normal, normalize(uSun + view)), 0.0, 1.0), 14.0) * uSheen * (0.4 + 0.6 * uRelief);
  float rim = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.0);

  vec3 col;
  float alpha;
  float haze = 1.0 - exp(-dist / (uFogDepth * 5.0));
  float fade = 1.0 - smoothstep(0.35, 1.0, haze);
  if (uLight < 0.5) {
    vec3 lit = mix(uHorizon * 0.18, body, lightness) + uCrest * sheen;
    lit = mix(lit, uHorizon, rim * 0.15 * uRelief);
    col = mix(lit, uHorizon, smoothstep(0.0, 1.0, haze)) * 0.85 * uBrightness;
    alpha = fade;
  } else {
    vec3 hue = mix(uHorizon, body, 0.35 + 0.65 * lightness);
    float density = mix(0.16, 0.9, 1.0 - lightness);
    density *= 1.0 - clamp(sheen, 0.0, 1.0) * 0.85;
    density *= 1.0 - 0.5 * smoothstep(0.0, 1.0, haze);
    col = hue;
    alpha = fade * clamp(density * uBrightness, 0.0, 1.0);
  }

  float reveal = uIntro.x;
  col = clamp(col, 0.0, 1.0);
  float grain = (hash(gl_FragCoord.xy + fract(uClock) * 64.0) - 0.5) * uGrain;
  alpha = clamp(alpha * (1.0 + grain), 0.0, 1.0) * reveal * uOpacity;
  if (uOpaque > 0.5) {
    outColor = vec4(mix(uBackground, col, alpha), 1.0);
  } else {
    outColor = vec4(col * alpha, alpha);
  }
}`,L=(n,s,c)=>Math.min(c,Math.max(s,n)),je=n=>n<.5?2*n*n:1-Math.pow(-2*n+2,2)/2,T=null,N=(n,s)=>{if(n==="transparent")return null;if(typeof document>"u"||(T||(T=document.createElement("canvas").getContext("2d")),!T))return s;T.fillStyle="#000000",T.fillStyle=n;let c=T.fillStyle;if(c.startsWith("#")){let m=parseInt(c.slice(1),16);return[(m>>16&255)/255,(m>>8&255)/255,(m&255)/255]}let a=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c);return a?a[4]!==void 0&&Number(a[4])===0?null:[Number(a[1])/255,Number(a[2])/255,Number(a[3])/255]:s},Me=(n,s,c)=>{let a=n.createShader(s);return a?(n.shaderSource(a,c),n.compileShader(a),n.getShaderParameter(a,n.COMPILE_STATUS)?a:(console.error(n.getShaderInfoLog(a)),n.deleteShader(a),null)):null},et=(n,s,c,a)=>{let m=(n[0]-.5)*s,g=n[1]-.5,X=Math.PI/2.3/Math.max(c.zoom,.05),x=Math.hypot(m,g),I=X*x,u=[0,-Math.sin(I),-Math.cos(I)],z=x>1e-5?m/x:1,C=x>1e-5?g/x:0;u=[z*u[0]+C*u[1],-C*u[0]+z*u[1],u[2]];let P=c.tilt+a[1],B=Math.cos(P),q=Math.sin(P);u=[B*u[0]-q*u[2],u[1],q*u[0]+B*u[2]];let H=Math.cos(a[0]),O=Math.sin(a[0]);return u=[H*u[0]-O*u[1],O*u[0]+H*u[1],u[2]],u},tt=(n,s,c,a)=>{let m=et(n,s,c,a);if(m[2]>-.02)return null;let g=(Re-c.height)/-m[2];return[m[0]*g,m[1]*g]},Ae=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1);function oe({horizonColor:n="#5227FF",waveColor:s="#FF9FFC",crestColor:c="#FFFFFF",backgroundColor:a="transparent",lightMode:m=!1,speed:g=.4,amplitude:X=2.5,waveScale:x=.6,waveRatio:I=.9,swell:u=35,turbulence:z=20,tilt:C=64,zoom:P=1,height:B=5.5,fogDepth:q=15,relief:H=1,lightAngle:O=120,sheen:Ee=0,brightness:Le=1,opacity:Te=1,grain:Y=.2,quality:Fe="medium",intro:We=!0,mouseInteraction:Ie=!0,parallaxStrength:ze=.5,mouseStrength:Ce=.6,swellOnClick:Pe=!0,paused:Be=!1,dpr:qe=2,className:He="",style:Oe}){let ie=(0,d.useRef)(null),_e=(0,d.useMemo)(()=>N(n,[.32,.15,1])??[.32,.15,1],[n]),De=(0,d.useMemo)(()=>N(s,[1,.62,.99])??[1,.62,.99],[s]),Ne=(0,d.useMemo)(()=>N(c,[1,1,1])??[1,1,1],[c]),Ge=(0,d.useMemo)(()=>N(a,null),[a]),re={horizon:_e,wave:De,crest:Ne,paper:Ge,lightMode:m,speed:g,amplitude:Math.max(0,X),waveScale:Math.max(.01,x),waveRatio:Math.max(.01,I),swell:u,turbulence:z,tilt:L(C,10,85)*Math.PI/180,zoom:Math.max(.05,P),height:B,fogDepth:Math.max(.5,q),relief:L(H,0,1),lightAngle:O*Math.PI/180,sheen:Math.max(0,Ee),brightness:Math.max(0,Le),opacity:L(Te,0,1),grain:typeof Y=="number"?Math.max(0,Y):Y?.05:0,steps:Se[Fe]??Se.medium,intro:We,mouseInteraction:Ie,parallaxStrength:Math.max(0,ze),mouseStrength:L(Ce,0,1),swellOnClick:Pe,paused:Be,dpr:Math.max(.5,qe)},y=(0,d.useRef)(re);y.current=re;let U=(0,d.useRef)(null);return(0,d.useEffect)(()=>{U.current?.()}),(0,d.useEffect)(()=>{let w=ie.current;if(!w)return;let p=document.createElement("canvas");p.className=Ze,w.appendChild(p);let t=p.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!t){p.remove();return}let Z=Me(t,t.VERTEX_SHADER,Qe),$=Me(t,t.FRAGMENT_SHADER,Je),h=t.createProgram();if(!Z||!$||!h){p.remove();return}if(t.attachShader(h,Z),t.attachShader(h,$),t.bindAttribLocation(h,0,"aPosition"),t.linkProgram(h),t.deleteShader(Z),t.deleteShader($),!t.getProgramParameter(h,t.LINK_STATUS)){t.deleteProgram(h),p.remove();return}let Ve=["uResolution","uTime","uClock","uAmplitude","uWaveScale","uWaveRatio","uSwell","uTurbulence","uHeight","uTilt","uZoom","uLook","uFogDepth","uBrightness","uOpacity","uGrain","uHorizon","uWave","uCrest","uBackground","uOpaque","uLight","uSun","uRelief","uSheen","uSteps","uStride","uIntro","uSwells","uSwellWidth"],i={};Ve.forEach(r=>{i[r]=t.getUniformLocation(h,r)});let ae=t.createVertexArray();t.bindVertexArray(ae);let se=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,se),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0),t.useProgram(h);let K=new Float32Array(G*3),e={width:1,height:1,cssWidth:0,cssHeight:0,time:0,clock:0,last:0,raf:0,visible:!1,introAt:-1,pointer:[.5,.5],inside:!1,look:[0,0],steer:[0,0],swells:[],quiet:0,seen:null},ue=()=>{let r=y.current,o=Math.min(window.devicePixelRatio||1,r.dpr),l=Math.max(1,Math.round(e.cssWidth*o)),f=Math.max(1,Math.round(e.cssHeight*o));l===e.width&&f===e.height||(e.quiet=0,e.width=l,e.height=f,p.width=l,p.height=f)},le=()=>{e.cssWidth=w.clientWidth,e.cssHeight=w.clientHeight,ue(),v()},ce=(r,o)=>!r.intro||o||e.introAt<0?1:L((e.clock-e.introAt)/Ke,0,1),Xe=r=>{let o=y.current;t.viewport(0,0,e.width,e.height),t.uniform2f(i.uResolution,e.width,e.height),t.uniform1f(i.uTime,e.time),t.uniform1f(i.uClock,e.clock),t.uniform1f(i.uAmplitude,o.amplitude),t.uniform1f(i.uWaveScale,o.waveScale),t.uniform1f(i.uWaveRatio,o.waveRatio),t.uniform1f(i.uSwell,o.swell),t.uniform1f(i.uTurbulence,o.turbulence),t.uniform1f(i.uHeight,o.height),t.uniform1f(i.uTilt,o.tilt),t.uniform1f(i.uZoom,o.zoom),t.uniform2f(i.uLook,e.look[0],e.look[1]),t.uniform1f(i.uFogDepth,o.fogDepth),t.uniform1f(i.uBrightness,o.brightness),t.uniform1f(i.uOpacity,o.opacity),t.uniform1f(i.uGrain,o.grain),t.uniform3fv(i.uHorizon,o.horizon),t.uniform3fv(i.uWave,o.wave),t.uniform3fv(i.uCrest,o.crest);let l=o.paper??[0,0,0];t.uniform3f(i.uBackground,l[0],l[1],l[2]),t.uniform1f(i.uOpaque,o.paper?1:0),t.uniform1f(i.uLight,o.lightMode?1:0);let f=.52,b=o.lightAngle+e.steer[0]*o.mouseStrength*2,S=f-e.steer[1]*o.mouseStrength*.7;t.uniform3f(i.uSun,Math.cos(S)*Math.cos(b),Math.cos(S)*Math.sin(b),Math.sin(S)),t.uniform1f(i.uRelief,o.relief),t.uniform1f(i.uSheen,o.sheen),t.uniform1f(i.uSteps,o.steps);let _=o.amplitude*(o.waveScale/7*(1+Math.abs(o.swell)/20)+o.waveScale*o.waveRatio/3*(1+Math.abs(o.turbulence)/23)),M=ce(o,r),A=Math.min(1,M/.22),J=160*Math.pow(3/160,je(Math.max(0,(M-.1)/.9))),R=L((M-.75)/.25,0,1);t.uniform3f(i.uIntro,A*A*(3-2*A),J,1-R*R*(3-2*R)),K.fill(0);let k=0;e.swells.forEach((E,j)=>{let F=e.clock-E.at,ee=F/ye,te=(1-Math.exp(-F/.25))*Math.pow(1-ee,1.6),ge=o.amplitude*$e*te;K.set([E.x-F*12,E.y,ge],j*3),k=Math.max(k,ge)}),t.uniform3fv(i.uSwells,K),t.uniform1f(i.uSwellWidth,be),t.uniform1f(i.uStride,.9/Math.max(1,(_+k*.86/be)/1.5)),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLES,0,3)},Q=r=>{if(e.raf=0,!e.visible||document.hidden)return;let o=y.current,l=e.last?Math.min((r-e.last)/1e3,.1):0;e.last=r;let f=Ae();e.clock+=l,e.introAt<0&&(e.introAt=e.clock),!o.paused&&!f&&(e.time+=l*o.speed);let b=o.mouseInteraction&&e.inside&&!f,S=b?e.pointer:[.5,.5],_=1-Math.exp(-l/.45),M=(S[0]-.5)*o.parallaxStrength*.35,A=(S[1]-.5)*o.parallaxStrength*.18;e.look[0]+=(M-e.look[0])*_,e.look[1]+=(A-e.look[1])*_;let J=Math.abs(M-e.look[0])+Math.abs(A-e.look[1])>2e-4,R=1-Math.exp(-l/.6),k=b?e.pointer[0]-.5:0,E=b?.5-e.pointer[1]:0;e.steer[0]+=(k-e.steer[0])*R,e.steer[1]+=(E-e.steer[1])*R;let j=Math.abs(k-e.steer[0])+Math.abs(E-e.steer[1])>5e-4;e.swells=e.swells.filter(te=>e.clock-te.at<ye);let F=o.paused||f,ee=J||j||e.swells.length>0||ce(o,f)<1;e.seen!==o||ee||!F?e.quiet=0:e.quiet+=1,e.seen=o,!(e.quiet>3)&&(e.raf=requestAnimationFrame(Q),ue(),Xe(f))},v=()=>{e.raf||!e.visible||document.hidden||(e.last=0,e.raf=requestAnimationFrame(Q))};U.current=v;let fe=r=>{let o=w.getBoundingClientRect();return{x:(r.clientX-o.left)/Math.max(o.width,1),y:(r.clientY-o.top)/Math.max(o.height,1),inside:r.clientX>=o.left&&r.clientX<=o.right&&r.clientY>=o.top&&r.clientY<=o.bottom}},me=r=>{let o=fe(r),l=e.inside;e.inside=o.inside,o.inside&&(e.pointer=[o.x,o.y]),(o.inside||l)&&y.current.mouseInteraction&&v()},de=()=>{e.inside=!1,v()},he=r=>{let o=y.current;if(!o.swellOnClick||r.button!==0||Ae()||r.target instanceof Element&&r.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let l=fe(r);if(!l.inside)return;let f=tt([l.x,l.y],e.width/Math.max(e.height,1),o,e.look);f&&(e.swells.push({x:f[0],y:f[1],at:e.clock}),e.swells.length>G&&e.swells.shift(),v())},pe=new IntersectionObserver(r=>{e.visible=r.some(o=>o.isIntersecting),v()});pe.observe(w);let ve=new ResizeObserver(le);return ve.observe(w),le(),document.addEventListener("visibilitychange",v),window.addEventListener("pointermove",me,{passive:!0}),window.addEventListener("pointerdown",he),document.documentElement.addEventListener("pointerleave",de),e.raf=requestAnimationFrame(Q),()=>{cancelAnimationFrame(e.raf),U.current=null,document.removeEventListener("visibilitychange",v),pe.disconnect(),ve.disconnect(),window.removeEventListener("pointermove",me),window.removeEventListener("pointerdown",he),document.documentElement.removeEventListener("pointerleave",de),t.deleteProgram(h),t.deleteBuffer(se),t.deleteVertexArray(ae),t.getExtension("WEBGL_lose_context")?.loseContext(),p.remove()}},[]),(0,ke.jsx)("div",{ref:ie,className:[Ue,He].filter(Boolean).join(" "),style:Oe})}var ne=W(D(),1),ot=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],V=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],lt=ot.map((n,s)=>({id:s+1,image:n,src:n,img:n,url:n,title:V[s],text:V[s],label:V[s],alt:V[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function nt({big:n}){return(0,ne.jsx)(we,{big:n,dark:!0,center:!1,zoom:1,drive:!1,children:(0,ne.jsx)(oe,{})})}var ct=xe(nt);export{ct as default};
