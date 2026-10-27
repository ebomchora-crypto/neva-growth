import{c as I,i as We,j as O,l as ue,m as fe}from"./chunks/chunk-6IYH4WPJ.js";var v=I(We(),1),U=I(O(),1),M=6,Ge=2,Ve={vertical:0,horizontal:1,diagonal:2},Be=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,ze=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uWave;
uniform float uSweep;
uniform float uSweepWidth;
uniform float uTrail;
uniform float uScale;
uniform float uFrequency;
uniform float uRipple;
uniform float uDensity;
uniform float uLineWidth;
uniform float uGlow;
uniform float uDirection;
uniform float uSpread;
uniform float uBrightness;
uniform float uVignette;
uniform float uOpacity;
uniform float uScanline;
uniform float uRatio;
uniform float uGrain;
uniform float uTime;
uniform vec2 uMouse;
uniform float uPresence;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uAttract;
uniform vec3 uPings[${M}];
uniform float uIntro;
uniform float uLightMode;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float signal(vec2 p, float t) {
  float w = sin(p.x * 1.3 + t * 0.7);
  w += sin(p.y * 1.7 - t * 0.52) * 0.8;
  w += sin((p.x + p.y) * 0.9 + t * 0.91) * 0.6;
  w += sin((p.x - p.y) * 1.53 - t * 0.63) * 0.42;
  return w * 0.35;
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

vec2 axes(vec2 p) {
  if (uDirection < 0.5) return vec2(p.y, p.x);
  if (uDirection < 1.5) return vec2(p.x, -p.y);
  return vec2((p.x + p.y) * 0.70710678, (p.x - p.y) * 0.70710678);
}

float coverage(float lc, float width) {
  float fw = max(fwidth(lc), 1e-5);
  float dist = abs(fract(lc + 0.5) - 0.5) / fw;
  float crowd = smoothstep(0.2, 0.55, fw);
  float cover = clamp(width * 0.5 + 0.5 - dist, 0.0, 1.0) * min(width, 1.0);
  return mix(cover, min(width * fw, 1.0), crowd);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / uResolution.y;
  vec2 p = uv / max(uScale, 0.001);
  vec2 ax = axes(p);

  float sig = signal(p * uFrequency, uWave);
  float coord = ax.x + sig * uRipple;

  vec2 mp = uMouse / max(uScale, 0.001);
  vec2 md = p - mp;
  float radius = max(uMouseRadius / max(uScale, 0.001), 0.01);
  float lens = exp(-dot(md, md) / (radius * radius)) * uPresence;
  float mouseAxis = axes(mp).x + signal(mp * uFrequency, uWave) * uRipple;
  coord -= (coord - mouseAxis) * lens * uMouseStrength * mix(0.55, -0.9, uAttract);

  float pingLight = 0.0;
  for (int i = 0; i < ${M}; i++) {
    vec3 ping = uPings[i];
    if (ping.z < 0.0) continue;
    float d = length(uv - ping.xy);
    float age = ping.z;
    float r = age * 1.1;
    float w = 0.12 + age * 0.1;
    float band = exp(-((d - r) * (d - r)) / (w * w));
    float fade = exp(-age * 0.9) * smoothstep(0.0, 0.12, age);
    coord += band * fade * 0.018 / max(uScale, 0.001);
    pingLight += band * fade;
  }

  float u = fract(uSweep - coord / max(uSweepWidth, 0.05));
  float tail = mix(11.0, 1.8, clamp(uTrail, 0.0, 1.0));
  float lead = smoothstep(0.84, 1.0, u);
  lead *= lead;
  float sweep = max(exp(-u * tail), lead);
  float head = max(exp(-u * 26.0), lead * lead * lead);

  float introFront = mix(-1.6, 1.6, smoother(uIntro)) / max(uScale, 0.001);
  float reveal = 1.0 - smoothstep(introFront - 0.05, introFront + 0.3, coord);
  float introHead = exp(-abs(coord - introFront) * 14.0) * (1.0 - uIntro) * step(0.0001, 1.0 - uIntro);
  reveal = mix(reveal, 1.0, step(0.9999, uIntro));

  float lit = clamp(sweep * 0.86 + lens * uMouseStrength * 0.7 + pingLight * 0.9 + introHead, 0.0, 1.6);
  float hot = clamp(head + introHead + pingLight * 0.35, 0.0, 1.0);

  float lc = coord * uDensity;
  float width = uLineWidth * (1.0 + lit * 1.4 + hot * 0.9);
  float thread = 0.62 + 0.38 * hash(vec2(floor(lc + 0.5), 3.7));
  float split = uSpread * (0.5 + lit * 1.3) * max(fwidth(lc), 1e-5);
  float cg = coverage(lc, width);
  float cr = coverage(lc + split, width);
  float cb = coverage(lc - split, width);

  float fw = max(fwidth(lc), 1e-5);
  float dist = abs(fract(lc + 0.5) - 0.5) / fw;
  float crowd = smoothstep(0.2, 0.55, fw);
  float halo = exp(-dist / (3.0 + uGlow * 9.0)) * (1.0 - crowd) * uGlow * lit * 1.15;

  float base = 0.11 * reveal;
  float level = (base + lit * (1.0 - base)) * thread * uBrightness;

  vec3 tone = mix(uColor1, uColor2, smoothstep(0.05, 0.75, lit));
  tone = mix(tone, uColor3, hot);
  vec3 haloTone = mix(uColor1, uColor2, 0.65);

  float vx = smoother((1.0 - abs(uv.x / (uResolution.x / uResolution.y))) / 0.6);
  float vy = smoother((1.0 - abs(uv.y)) / 0.6);
  float vignette = mix(1.0, vx * vy, uVignette);

  vec3 cover3 = vec3(cr, cg, cb);
  float alphaLine = max(max(cr, cg), cb) * level;
  vec3 colLine = tone * cover3 * level;

  float grain = (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * uGrain;
  float scan = 1.0 - uScanline * 0.55 * (0.5 + 0.5 * cos(gl_FragCoord.y * 6.2831853 / (3.0 * uRatio)));

  if (uLightMode > 0.5) {
    float ink = clamp(alphaLine * vignette * scan, 0.0, 1.0);
    float wash = clamp(halo * 0.28 * vignette, 0.0, 1.0);
    float alpha = clamp(ink + wash * (1.0 - ink) + grain * 0.5 * ink, 0.0, 1.0) * uOpacity;
    vec3 col = (tone * ink + haloTone * wash * (1.0 - ink)) / max(ink + wash * (1.0 - ink), 1e-4);
    fragColor = vec4(col * alpha, alpha);
    return;
  }

  vec3 col = (colLine + haloTone * halo) * vignette * scan;
  float alpha = clamp(max(alphaLine, halo) * vignette * scan + grain * max(alphaLine, 0.04), 0.0, 1.0);
  col = clamp(col + grain * 0.6 * alpha, 0.0, 1.0);
  col = min(col, vec3(alpha));
  fragColor = vec4(col * uOpacity, alpha * uOpacity);
}`,S=(o,i,c)=>Math.min(c,Math.max(i,o)),se=(o,i,c)=>{let a=o.createShader(i);return a?(o.shaderSource(a,c),o.compileShader(a),o.getShaderParameter(a,o.COMPILE_STATUS)?a:(o.deleteShader(a),null)):null},qe=o=>{let i=se(o,o.VERTEX_SHADER,Be),c=se(o,o.FRAGMENT_SHADER,ze),a=o.createProgram();if(!i||!c||!a)return null;if(o.attachShader(a,i),o.attachShader(a,c),o.linkProgram(a),o.deleteShader(i),o.deleteShader(c),!o.getProgramParameter(a,o.LINK_STATUS))return o.deleteProgram(a),null;let R={},G=o.getProgramParameter(a,o.ACTIVE_UNIFORMS);for(let F=0;F<G;F++){let L=o.getActiveUniform(a,F);L&&(R[L.name.replace(/\[0\]$/,"")]=o.getUniformLocation(a,L.name))}return{program:a,uniforms:R}},q=o=>{let i=String(o||"#ffffff").replace("#","").trim();(i.length===3||i.length===4)&&(i=i.slice(0,3).split("").map(a=>a+a).join(""));let c=parseInt(i.slice(0,6),16);return Number.isNaN(c)?[1,1,1]:[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255]},Ue=({color1:o="#5227FF",color2:i="#FF9FFC",color3:c="#FFFFFF",speed:a=.5,sweepSpeed:R=.25,sweepWidth:G=1.6,trail:F=.5,reverse:L=!1,scale:de=1.5,frequency:pe=2,ripple:he=.22,bandDensity:ve=11,lineWidth:ge=1.2,glow:xe=.6,scanDirection:we="vertical",colorSpread:ye=.7,brightness:be=1,vignette:Se=.3,scanline:Me=!0,scanlineIntensity:Re=.5,grain:Fe=!0,grainIntensity:Le=.04,opacity:Ce=1,mouseInteraction:Ee=!0,mouseRadius:Ae=.5,mouseStrength:Ie=.7,mouseMode:Pe="repel",clickEffect:Te="ping",intro:De=!0,lightMode:ke=!1,dpr:Ne,className:_e="",style:Oe})=>{let X=(0,v.useRef)(null),$=(0,v.useRef)(null),V=(0,v.useRef)(null),K={color1:o,color2:i,color3:c,speed:a,sweepSpeed:L?-R:R,sweepWidth:Math.max(.05,G),trail:S(F,0,1),scale:Math.max(.05,de),frequency:pe,ripple:he,bandDensity:Math.max(.5,ve),lineWidth:Math.max(.2,ge),glow:Math.max(0,xe),direction:Ve[we]??0,colorSpread:S(ye,0,1),brightness:Math.max(0,be),vignette:S(Se,0,1),scanline:Me?S(Re,0,1):0,grain:Fe?Math.max(0,Le):0,opacity:S(Ce,0,1),mouseInteraction:Ee,mouseRadius:Math.max(.05,Ae),mouseStrength:Math.max(0,Ie),attract:Pe==="attract",clickEffect:Te,intro:De,lightMode:ke,dpr:Ne},g=(0,v.useRef)(K);return g.current=K,(0,v.useEffect)(()=>{let y=X.current,p=$.current,e=p?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!y||!p||!e)return;let P=qe(e);if(!P)return;let n=P.uniforms,Y=e.createVertexArray(),T=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,u={width:1,height:1,ratio:1},h={x:0,y:0,inside:!1},s={x:0,y:0,ready:!1},d=new Float32Array(M*3);for(let t=0;t<M;t++)d[t*3+2]=-1;let C=0,D=0,j=0,J=-.39,Q=0,E=g.current.intro&&!T?0:1,A=0,k=0,N=!0,_=0,B=(t,r)=>[(t*2-u.width)/u.height,(u.height-r*2)/u.height],Z=()=>{let t=g.current;e.viewport(0,0,p.width,p.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(P.program),e.uniform2f(n.uResolution,p.width,p.height),e.uniform1f(n.uWave,j),e.uniform1f(n.uSweep,J),e.uniform1f(n.uSweepWidth,t.sweepWidth),e.uniform1f(n.uTrail,t.trail),e.uniform1f(n.uScale,t.scale),e.uniform1f(n.uFrequency,t.frequency),e.uniform1f(n.uRipple,t.ripple),e.uniform1f(n.uDensity,t.bandDensity),e.uniform1f(n.uLineWidth,t.lineWidth*u.ratio),e.uniform1f(n.uGlow,t.glow),e.uniform1f(n.uDirection,t.direction),e.uniform1f(n.uSpread,t.colorSpread),e.uniform1f(n.uBrightness,t.brightness),e.uniform1f(n.uVignette,t.vignette),e.uniform1f(n.uOpacity,t.opacity),e.uniform1f(n.uScanline,t.scanline),e.uniform1f(n.uRatio,u.ratio),e.uniform1f(n.uGrain,t.grain),e.uniform1f(n.uTime,Q),e.uniform2f(n.uMouse,s.x,s.y),e.uniform1f(n.uPresence,t.mouseInteraction?D:0),e.uniform1f(n.uMouseRadius,t.mouseRadius),e.uniform1f(n.uMouseStrength,t.mouseStrength),e.uniform1f(n.uAttract,t.attract?1:0),e.uniform3fv(n.uPings,d),e.uniform1f(n.uIntro,E),e.uniform1f(n.uLightMode,t.lightMode?1:0),e.uniform3fv(n.uColor1,q(t.color1)),e.uniform3fv(n.uColor2,q(t.color2)),e.uniform3fv(n.uColor3,q(t.color3)),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.bindVertexArray(Y),e.drawArrays(e.TRIANGLES,0,3)},ee=g.current.dpr,z=()=>{let t=g.current;ee=t.dpr,u.width=Math.max(1,y.clientWidth),u.height=Math.max(1,y.clientHeight),u.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),p.width=Math.max(1,Math.round(u.width*u.ratio)),p.height=Math.max(1,Math.round(u.height*u.ratio)),Z(),x()},te=t=>{if(A=0,!N||document.hidden)return;let r=g.current;r.dpr!==ee&&z();let l=k?S((t-k)/1e3,0,1/20):1/60;k=t,Q+=l,T||(j+=l*r.speed,J+=l*r.sweepSpeed),E<1&&(E=Math.min(1,E+l/Ge));let f=B(h.x,h.y),w=1-Math.exp(-l/.09);s.x+=(f[0]-s.x)*w,s.y+=(f[1]-s.y)*w,D+=((h.inside&&r.mouseInteraction?1:0)-D)*(1-Math.exp(-l/.3));let b=!T&&(r.speed!==0||r.sweepSpeed!==0)||E<1||D>.001;for(let m=0;m<M;m++)d[m*3+2]<0||(d[m*3+2]+=l,d[m*3+2]>4?d[m*3+2]=-1:b=!0);Z(),_=b?0:_+l,_<.5&&(A=requestAnimationFrame(te))};function x(){_=0,!A&&N&&!document.hidden&&(k=0,A=requestAnimationFrame(te))}let oe=t=>{let r=y.getBoundingClientRect(),l=t.clientX-r.left,f=t.clientY-r.top;return{x:l,y:f,inside:l>=0&&f>=0&&l<=r.width&&f<=r.height}},ne=t=>{let{x:r,y:l,inside:f}=oe(t),w=h.inside;if(h.inside=f,f&&(h.x=r,h.y=l,!w||!s.ready)){let[b,m]=B(r,l);s.x=b,s.y=m,s.ready=!0}(f||w)&&x()},ie=t=>{if(g.current.clickEffect!=="ping"||T)return;let{x:l,y:f,inside:w}=oe(t);if(!w)return;let[b,m]=B(l,f);d[C*3]=b,d[C*3+1]=m,d[C*3+2]=0,C=(C+1)%M,x()},ae=()=>{h.inside=!1,x()},re=()=>x(),le=new ResizeObserver(z);le.observe(y);let ce=new IntersectionObserver(t=>{N=t.some(r=>r.isIntersecting),N&&x()});return ce.observe(y),window.addEventListener("pointermove",ne,{passive:!0}),window.addEventListener("pointerdown",ie,{passive:!0}),document.documentElement.addEventListener("pointerleave",ae),document.addEventListener("visibilitychange",re),z(),V.current=x,()=>{cancelAnimationFrame(A),V.current=null,le.disconnect(),ce.disconnect(),window.removeEventListener("pointermove",ne),window.removeEventListener("pointerdown",ie),document.documentElement.removeEventListener("pointerleave",ae),document.removeEventListener("visibilitychange",re),e.deleteVertexArray(Y),e.deleteProgram(P.program),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,v.useEffect)(()=>{V.current?.()}),(0,U.jsx)("div",{ref:X,className:["relative w-full h-full overflow-hidden",_e].filter(Boolean).join(" "),style:Oe,children:(0,U.jsx)("canvas",{ref:$,className:"block w-full h-full","aria-hidden":"true"})})},me=Ue;var H=I(O(),1),He=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],W=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Qe=He.map((o,i)=>({id:i+1,image:o,src:o,img:o,url:o,title:W[i],text:W[i],label:W[i],alt:W[i],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][i],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Xe({big:o}){return(0,H.jsx)(fe,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,H.jsx)(me,{})})}var Ze=ue(Xe);export{Ze as default};
