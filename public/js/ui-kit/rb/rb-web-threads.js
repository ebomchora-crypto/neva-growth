import{c as A,i as We,j as q,l as le,m as fe}from"./chunks/chunk-6IYH4WPJ.js";var v=A(We(),1),be=A(q(),1),He="relative h-full w-full overflow-hidden",Ke="absolute inset-0 block h-full w-full",P=24,k=6,R=3,xe=1.6,ve=.05,de=1.25,je=Math.PI*2,Je=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Qe=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uPhase;
uniform float uClock;
uniform int uCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uPinch;
uniform float uNodes;
uniform vec2 uAngle;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uDepth;
uniform float uPulses;
uniform float uFade;
uniform float uGrain;
uniform vec3 uColors[${k}];
uniform int uColorCount;
uniform vec3 uCore;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform vec4 uIntro;
uniform float uFocus[${P}];
uniform vec2 uFocusState;
uniform vec4 uSurges[${R}];
out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.28318530;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float easeInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
}

vec3 palette(float t) {
  if (uColorCount <= 1) return uColors[0];
  float scaled = clamp(t, 0.0, 1.0) * float(uColorCount - 1);
  int index = int(min(floor(scaled), float(uColorCount - 2)));
  return mix(uColors[index], uColors[index + 1], scaled - float(index));
}

vec2 envelope(float x) {
  float dx = x - uPinch;
  if (uNodes <= 1.0) return vec2(uSpread * abs(dx), uSpread * sign(dx));
  float k = PI * uNodes;
  float c = cos(k * (dx + 0.5));
  return vec2(uSpread * 0.5 * abs(c), -uSpread * 0.5 * k * sin(k * (dx + 0.5)) * sign(c));
}

vec2 space(vec2 p, float aspect) {
  vec2 q = (p - 0.5) * vec2(aspect, 1.0);
  q = vec2(q.x * uAngle.x + q.y * uAngle.y, -q.x * uAngle.y + q.y * uAngle.x);
  return vec2(q.x / aspect + 0.5, q.y + 0.5);
}

float hubAt(float x) {
  if (uNodes <= 1.0) return uPinch;
  float spacing = 1.0 / uNodes;
  return uPinch - 0.5 + (floor((x - uPinch + 0.5) / spacing) + 0.5) * spacing;
}

vec3 thread(float x, float i, float n) {
  float lane = uNodes <= 1.0 ? x - uPinch : (x - uPinch + 0.5) * uNodes - 0.5;
  float side = uMirror > 0.5 ? (mod(floor(lane), 2.0) < 0.5 ? -1.0 : 1.0) : 1.0;
  vec2 env = envelope(x);
  float amp = 1.0 + i * uTaper;
  float shimmer = uShimmer > 0.5 ? sin(uClock * 1.7 + i * 1.3) * 0.35 : 0.0;
  float angle = x * uFrequency + (uPhase + i * TAU / max(n, 1.0)) * side + shimmer;
  float wave = sin(angle);
  float y = uPosition - env.x * amp * wave;
  float slope = -(env.y * amp * wave + env.x * amp * cos(angle) * uFrequency);
  return vec3(y, slope, angle);
}

void main() {
  vec2 p = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 s = space(p, aspect);
  float x = s.x;
  float y = s.y;
  float n = float(uCount);
  float pixel = 1.0 / uResolution.y;
  float hub = hubAt(x);
  float presence = uFocusState.x;
  float settle = uFocusState.y;

  vec3 color = vec3(0.0);
  float energy = 0.0;
  float ink = 0.0;
  vec3 inkColor = vec3(0.0);

  for (int idx = 0; idx < ${P}; idx++) {
    if (idx >= uCount) break;
    float i = float(idx);
    float ci = n > 1.0 ? i / (n - 1.0) : 0.0;

    float head = 2.0;
    float bead = 0.0;
    float born = 1.0;
    if (uIntro.w > 0.5) {
      float progress = clamp((uIntro.x - i * uIntro.y) / uIntro.z, 0.0, 1.0);
      head = mix(-0.06, 1.06, easeInOut(progress));
      bead = sin(PI * progress);
      born = progress > 0.0 ? smoothstep(-0.05, 0.03, head) : 0.0;
    }
    if (born <= 0.0) continue;

    bool tip = x > head;
    vec3 lead = bead > 0.0 || tip ? thread(head, i, n) : vec3(0.0);
    vec3 t = tip ? lead : thread(x, i, n);

    float focus = uFocus[idx];
    float spot = tip ? head : x;
    float twist = uDepth * smoothstep(0.0, 0.07, abs(spot - hubAt(spot)));
    float depth = 0.5 + 0.5 * cos(t.z);
    float front = mix(1.0, 0.3 + 0.7 * depth, twist);
    float width = uThickness * mix(1.0, 0.55 + 0.7 * depth, twist) * (1.0 + 0.3 * focus * presence);

    float d;
    if (tip) {
      float back = head - 0.02;
      vec2 a = vec2(back * aspect, thread(back, i, n).x);
      vec2 b = vec2(head * aspect, lead.x);
      vec2 pa = vec2(x * aspect, y) - a;
      vec2 ba = b - a;
      d = length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
    } else {
      float bend = t.y * smoothstep(0.0, 0.04, abs(x - hub));
      d = abs(y - t.x) / sqrt(1.0 + bend * bend / (aspect * aspect));
    }
    float g = uGlow / pow(max(d / width, pixel * 0.35), uFalloff) * front * born;
    float onLine = exp(-d / (width * 0.012));

    if (bead > 0.0) {
      vec2 near = vec2((x - head) * aspect, y - lead.x);
      g *= 1.0 + bead * 1.6 * exp(-dot(near, near) / 0.0025);
    }

    float light = 0.0;
    for (int k = 0; k < ${R}; k++) {
      vec4 surge = uSurges[k];
      if (surge.w <= 0.0) continue;
      float progress = clamp((surge.y - i * ${ve.toFixed(3)}) / ${xe.toFixed(2)}, 0.0, 1.0);
      if (progress <= 0.0 || progress >= 1.0) continue;
      float lead = mix(surge.x, surge.z > 0.0 ? 1.12 : -0.12, easeInOut(progress));
      float along = (x - lead) * surge.z * aspect;
      float trail = along < 0.0 ? exp(along / 0.24) : exp(-along * along / 0.0009);
      light += trail * sin(PI * progress);
    }
    g *= 1.0 + light * (0.12 + 2.8 * onLine);

    if (uPulses > 0.0) {
      float travel = abs(x - hub);
      float pulse = pow(0.5 + 0.5 * sin(travel * 16.0 + uClock * 2.2 + i * 1.9), 24.0);
      g *= 1.0 + uPulses * 5.0 * pulse * onLine;
    }

    float sheen = pow(0.5 + 0.5 * sin(abs(x - hub) * 11.0 + uClock * 1.4), 10.0);
    float lift = focus * presence;
    g *= (1.0 - settle * (1.0 - focus)) * (1.0 + lift * (0.9 + 1.4 * sheen * onLine));

    vec3 tint = mix(palette(ci), uCore, 0.3 * lift);
    color += g * tint;
    energy += g;
    float stroke = smoothstep(0.45, 1.3, g);
    inkColor += tint * stroke;
    ink += stroke;
  }

  float fade = 1.0;
  if (uFade > 0.0) {
    float edge = min(x, 1.0 - x);
    float f = clamp(edge / max(uFade * 0.5, 0.001), 0.0, 1.0);
    fade = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  }
  float core = smoothstep(0.5, 2.2, energy);
  color = mix(color, uCore * energy, core * 0.5);
  color *= uBrightness * fade;
  float alpha = clamp(energy * fade, 0.0, 1.0) * uOpacity;
  float grain = (hash(gl_FragCoord.xy + fract(uClock) * 97.0) - 0.5) * uGrain;

  if (uLight < 0.5) {
    vec3 rgb = max(color * alpha * (1.0 + grain * 2.0), 0.0);
    if (uOpaque > 0.5) {
      outColor = vec4(min(uBackground * (1.0 - alpha) + rgb, 1.0), 1.0);
    } else {
      outColor = vec4(rgb, alpha);
    }
  } else {
    ink *= fade;
    vec3 hue = ink > 0.0001 ? inkColor / ink : palette(0.5);
    float body = clamp(ink, 0.0, 1.0);
    float haze = clamp(1.0 - exp(-energy * fade * 0.3), 0.0, 1.0) * 0.12;
    float focal = smoothstep(2.0, 9.0, energy * fade) * 0.25;
    float cover = clamp((body * 0.9 + (haze + focal) * (1.0 - body)) * (1.0 + grain * 2.0), 0.0, 0.95) * uOpacity;
    vec3 stroke = hue;
    if (uOpaque > 0.5) {
      outColor = vec4(mix(uBackground, stroke, cover), 1.0);
    } else {
      outColor = vec4(stroke * cover, cover);
    }
  }
}`,C=(n,i,u)=>Math.min(u,Math.max(i,n)),Ze=(n,i)=>(n%i+i)%i,M=null,$=(n,i)=>{if(n==="transparent")return null;if(typeof document>"u"||(M||(M=document.createElement("canvas").getContext("2d")),!M))return i;M.fillStyle="#000000",M.fillStyle=n;let u=M.fillStyle;if(u.startsWith("#")){let d=parseInt(u.slice(1),16);return[(d>>16&255)/255,(d>>8&255)/255,(d&255)/255]}let s=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(u);return s?s[4]!==void 0&&Number(s[4])===0?null:[Number(s[1])/255,Number(s[2])/255,Number(s[3])/255]:i},pe=n=>Math.min(.12,.9/Math.max(n-1,1)),he=(n,i,u)=>{let s=(n[0]-.5)*i,d=.5-n[1],y=Math.cos(u),w=Math.sin(u);return[(s*y+d*w)/i+.5,-s*w+d*y+.5]},et=(n,i,u,s,d)=>{let y=n.nodes<=1?i-n.pinch:(i-n.pinch+.5)*n.nodes-.5,w=n.mirror&&Ze(Math.floor(y),2)<.5?-1:1,E=i-n.pinch,O=n.nodes<=1?n.spread*Math.abs(E):n.spread*.5*Math.abs(Math.cos(Math.PI*n.nodes*(E+.5))),L=n.shimmer?Math.sin(d*1.7+u*1.3)*.35:0,N=i*n.frequency+(s+u*je/Math.max(n.count,1))*w+L;return n.position-O*(1+u*n.taper)*Math.sin(N)},me=(n,i,u)=>{let s=n.createShader(i);return s?(n.shaderSource(s,u),n.compileShader(s),n.getShaderParameter(s,n.COMPILE_STATUS)?s:(n.deleteShader(s),null)):null},ge=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1);function Y({colors:n=["#5227FF","#FF9FFC"],coreColor:i="#FFFFFF",backgroundColor:u="transparent",lightMode:s=!1,threadCount:d=6,speed:y=.2,frequency:w=5,spread:E=.18,taper:O=1,position:L=.5,pinch:N=.5,nodes:ye=1,angle:we=0,glow:Ce=.02,falloff:Me=.6,thickness:Se=1.1,brightness:Fe=.6,opacity:Ae=1,depth:ke=0,pulses:Pe=0,mirror:Re=!0,shimmer:Ee=!1,fade:Te=0,grain:B=.05,intro:qe=!0,mouseInteraction:Ie=!0,mouseStrength:Oe=.5,pulseOnClick:Le=!0,paused:Ne=!1,dpr:Be=2,className:Ge="",style:_e}){let H=(0,v.useRef)(null),K=n.join("|"),j=(0,v.useMemo)(()=>K.split("|").slice(0,k).map(g=>$(g,[1,1,1])??[1,1,1]),[K]),De=(0,v.useMemo)(()=>$(i,[1,1,1])??[1,1,1],[i]),Ue=(0,v.useMemo)(()=>$(u,null),[u]),J={palette:j.length?j:[[1,1,1]],core:De,paper:Ue,lightMode:s,count:C(Math.round(d),1,P),speed:y,frequency:w,spread:E,taper:O,position:L,pinch:N,nodes:C(Math.round(ye),1,6),angle:we*Math.PI/180,glow:Math.max(0,Ce),falloff:Math.max(.05,Me),thickness:Math.max(.05,Se),brightness:Math.max(0,Fe),opacity:C(Ae,0,1),depth:C(ke,0,1),pulses:Math.max(0,Pe),mirror:Re,shimmer:Ee,fade:C(Te,0,1),grain:typeof B=="number"?Math.max(0,B):B?.05:0,intro:qe,mouseInteraction:Ie,mouseStrength:C(Oe,0,1),pulseOnClick:Le,paused:Ne,dpr:Math.max(.5,Be)},S=(0,v.useRef)(J);return S.current=J,(0,v.useEffect)(()=>{let g=H.current;if(!g)return;let x=document.createElement("canvas");x.className=Ke,g.appendChild(x);let e=x.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!e){x.remove();return}let G=me(e,e.VERTEX_SHADER,Je),_=me(e,e.FRAGMENT_SHADER,Qe),p=e.createProgram();if(!G||!_||!p){x.remove();return}if(e.attachShader(p,G),e.attachShader(p,_),e.bindAttribLocation(p,0,"aPosition"),e.linkProgram(p),e.deleteShader(G),e.deleteShader(_),!e.getProgramParameter(p,e.LINK_STATUS)){e.deleteProgram(p),x.remove();return}let ze=["uResolution","uPhase","uClock","uCount","uFrequency","uSpread","uTaper","uPosition","uPinch","uNodes","uAngle","uGlow","uFalloff","uThickness","uBrightness","uOpacity","uMirror","uShimmer","uDepth","uPulses","uFade","uGrain","uColors","uColorCount","uCore","uBackground","uOpaque","uLight","uIntro","uFocus","uFocusState","uSurges"],a={};ze.forEach(r=>{a[r]=e.getUniformLocation(p,r)});let Q=e.createVertexArray();e.bindVertexArray(Q);let Z=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Z),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.useProgram(p);let D=new Float32Array(k*3),U=new Float32Array(R*4),T=new Float32Array(P),o={width:1,height:1,phase:0,clock:0,last:0,raf:0,visible:!1,introAt:-1,pointer:[.5,.5],inside:!1,presence:0,settle:0,target:-1,surges:[],quiet:0,seen:null},z=()=>{let r=S.current,t=Math.min(window.devicePixelRatio||1,r.dpr),c=Math.max(1,Math.round(g.clientWidth*t)),l=Math.max(1,Math.round(g.clientHeight*t));c===o.width&&l===o.height||(o.quiet=0,o.width=c,o.height=l,x.width=c,x.height=l)},ee=r=>(r.count-1)*pe(r.count)+de,Ve=(r,t,c)=>{let l=r.mouseInteraction&&o.inside;if(l){let m=o.width/Math.max(o.height,1),[V,$e]=he(o.pointer,m,r.angle),ue=-1,ce=1/0;for(let F=0;F<r.count;F++){let X=Math.abs(et(r,V,F,o.phase,c?0:o.clock)-$e),Ye=F===o.target?.11:.085;X<Ye&&X<ce&&(ue=F,ce=X)}o.target=ue}else o.target=-1;let h=1-Math.exp(-t/.22),f=0;for(let m=0;m<P;m++){let V=m===o.target?1:0;T[m]+=(V-T[m])*h,f=Math.max(f,T[m])}o.presence+=((l?1:0)-o.presence)*(1-Math.exp(-t/.3));let b=r.mouseStrength*.65*f*o.presence;return o.settle+=(b-o.settle)*(1-Math.exp(-t/.3)),f>.002||o.presence>.002||o.settle>.002},Xe=r=>{let t=S.current,c=o.introAt<0?0:o.clock-o.introAt,l=t.intro&&!r&&c<ee(t);e.viewport(0,0,o.width,o.height),e.uniform2f(a.uResolution,o.width,o.height),e.uniform1f(a.uPhase,o.phase),e.uniform1f(a.uClock,r?0:o.clock),e.uniform1i(a.uCount,t.count),e.uniform1f(a.uFrequency,t.frequency),e.uniform1f(a.uSpread,t.spread),e.uniform1f(a.uTaper,t.taper),e.uniform1f(a.uPosition,t.position),e.uniform1f(a.uPinch,t.pinch),e.uniform1f(a.uNodes,t.nodes),e.uniform2f(a.uAngle,Math.cos(t.angle),Math.sin(t.angle)),e.uniform1f(a.uGlow,t.glow*Math.sqrt(6/Math.max(t.count,6))),e.uniform1f(a.uFalloff,t.falloff),e.uniform1f(a.uThickness,t.thickness),e.uniform1f(a.uBrightness,t.brightness),e.uniform1f(a.uOpacity,t.opacity),e.uniform1f(a.uMirror,t.mirror?1:0),e.uniform1f(a.uShimmer,t.shimmer&&!r?1:0),e.uniform1f(a.uDepth,t.depth),e.uniform1f(a.uPulses,t.pulses),e.uniform1f(a.uFade,t.fade),e.uniform1f(a.uGrain,t.grain),D.fill(0),t.palette.slice(0,k).forEach((f,b)=>D.set(f,b*3)),e.uniform3fv(a.uColors,D),e.uniform1i(a.uColorCount,Math.min(t.palette.length,k)),e.uniform3f(a.uCore,t.core[0],t.core[1],t.core[2]);let h=t.paper??[0,0,0];e.uniform3f(a.uBackground,h[0],h[1],h[2]),e.uniform1f(a.uOpaque,t.paper?1:0),e.uniform1f(a.uLight,t.lightMode?1:0),e.uniform4f(a.uIntro,c,pe(t.count),de,l?1:0),e.uniform1fv(a.uFocus,T),e.uniform2f(a.uFocusState,o.presence*(.4+.6*t.mouseStrength),o.settle),U.fill(0),o.surges.slice(-R).forEach((f,b)=>{U.set([f.x,o.clock-f.at,f.direction,1],b*4)}),e.uniform4fv(a.uSurges,U),e.bindFramebuffer(e.FRAMEBUFFER,null),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)},te=r=>{if(o.raf=requestAnimationFrame(te),!o.visible||document.hidden){o.last=r;return}let t=S.current,c=o.last?Math.min((r-o.last)/1e3,.1):1/60;o.last=r;let l=ge();o.clock+=c,o.introAt<0&&(o.introAt=o.clock),!t.paused&&!l&&(o.phase+=c*t.speed);let h=Ve(t,c,l);o.surges=o.surges.filter(m=>o.clock-m.at<xe+(t.count-1)*ve);let f=t.paused||l,b=o.surges.length>0||t.intro&&!l&&o.clock-o.introAt<ee(t)||h;o.seen!==t||b||!f?o.quiet=0:o.quiet+=1,o.seen=t,!(o.quiet>3)&&(z(),Xe(l))},oe=r=>{let t=g.getBoundingClientRect();return{x:(r.clientX-t.left)/Math.max(t.width,1),y:(r.clientY-t.top)/Math.max(t.height,1),inside:r.clientX>=t.left&&r.clientX<=t.right&&r.clientY>=t.top&&r.clientY<=t.bottom}},ne=r=>{let t=oe(r);o.inside=t.inside,t.inside&&(o.pointer=[t.x,t.y])},re=()=>{o.inside=!1},ae=r=>{let t=S.current;if(!t.pulseOnClick||r.button!==0||ge()||r.target instanceof Element&&r.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let c=oe(r);if(!c.inside)return;let l=o.width/Math.max(o.height,1),[h]=he([c.x,c.y],l,t.angle),f=h<=t.pinch?1:-1;o.surges.push({x:h,direction:f,at:o.clock}),o.surges.length>R&&o.surges.shift()},ie=new IntersectionObserver(r=>{o.visible=r.some(t=>t.isIntersecting)});ie.observe(g);let se=new ResizeObserver(z);return se.observe(g),z(),window.addEventListener("pointermove",ne,{passive:!0}),window.addEventListener("pointerdown",ae),document.documentElement.addEventListener("pointerleave",re),o.raf=requestAnimationFrame(te),()=>{cancelAnimationFrame(o.raf),ie.disconnect(),se.disconnect(),window.removeEventListener("pointermove",ne),window.removeEventListener("pointerdown",ae),document.documentElement.removeEventListener("pointerleave",re),e.deleteProgram(p),e.deleteBuffer(Z),e.deleteVertexArray(Q),e.getExtension("WEBGL_lose_context")?.loseContext(),x.remove()}},[]),(0,be.jsx)("div",{ref:H,className:[He,Ge].filter(Boolean).join(" "),style:_e})}var W=A(q(),1),tt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],I=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ut=tt.map((n,i)=>({id:i+1,image:n,src:n,img:n,url:n,title:I[i],text:I[i],label:I[i],alt:I[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function ot({big:n}){return(0,W.jsx)(fe,{big:n,dark:!0,center:!1,zoom:1,drive:!1,children:(0,W.jsx)(Y,{})})}var ct=le(ot);export{ct as default};
