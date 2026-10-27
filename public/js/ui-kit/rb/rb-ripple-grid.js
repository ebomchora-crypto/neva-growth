import{c as k,i as ke,j as D,l as ue,m as de}from"./chunks/chunk-6IYH4WPJ.js";var b=k(ke(),1),K=k(D(),1),I=12,Ie={lines:0,dots:1,cross:2},Ve=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,ze=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform float uCell;
uniform float uLineWidth;
uniform float uGlow;
uniform float uTilt;
uniform float uFocal;
uniform vec2 uTurn;
uniform vec4 uRipples[${I}];
uniform int uRippleCount;
uniform float uWaveLength;
uniform float uWaveSpeed;
uniform float uStrength;
uniform vec3 uPointer;
uniform vec3 uColor;
uniform vec3 uInk;
uniform float uPresence;
uniform float uReveal;
uniform float uFade;
uniform float uOpacity;
uniform float uLightMode;
uniform int uVariant;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 css = gl_FragCoord.xy / uRatio;
  vec2 screen = vec2(css.x - uView.x * 0.5, uView.y * 0.5 - css.y);
  vec2 plane = screen;
  float horizon = 1.0;
  if (uTilt > 0.0001) {
    float depth = uFocal + screen.y * tan(uTilt);
    horizon = smoothstep(0.0, uFocal * 0.35, depth);
    float scale = uFocal / max(depth, 0.001);
    plane = vec2(screen.x * scale, screen.y * scale / cos(uTilt));
  }

  vec2 push = vec2(0.0);
  float lift = 0.0;
  for (int i = 0; i < ${I}; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = plane - ripple.xy;
    float dist = length(delta);
    float x = (dist - ripple.z * uWaveSpeed) / uWaveLength;
    float packet = exp(-x * x * 1.8);
    float spread = 1.0 / (1.0 + dist / (uWaveLength * 5.0));
    float calm = smoothstep(0.0, uWaveLength * 0.9, dist);
    float wave = sin(x * 6.28318) * packet * spread * calm * ripple.w;
    push += (dist > 0.001 ? delta / dist : vec2(0.0)) * wave;
    lift += wave;
  }

  vec2 bent = plane + push * uStrength * uCell * 0.22;
  vec2 grid = mat2(uTurn.x, uTurn.y, -uTurn.y, uTurn.x) * bent / uCell;
  vec2 fw = max(fwidth(grid), vec2(0.00001));
  vec2 offset = abs(fract(grid - 0.5) - 0.5);
  vec2 dist = offset / fw;
  float width = max(uLineWidth * uRatio, 1.0);
  float thin = min(uLineWidth * uRatio, 1.0);
  float shape = 0.0;
  float edge = min(dist.x, dist.y);
  if (uVariant == 1) {
    edge = length(dist);
    shape = (1.0 - smoothstep(width * 1.7 - 0.5, width * 1.7 + 0.5, edge)) * thin * 1.8;
  } else if (uVariant == 2) {
    float arm = 0.16;
    vec2 cover = (1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, dist)) * thin;
    vec2 reach = 1.0 - smoothstep(arm - fw * 0.5, arm + fw * 0.5, offset);
    shape = max(cover.x * reach.y, cover.y * reach.x);
    edge = max(min(dist.x, dist.y), length(max(offset - arm, 0.0) / fw));
  } else {
    vec2 cover = (1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, dist)) * thin;
    shape = max(cover.x, cover.y);
  }
  float halo = exp(-edge / (uRatio * 2.4)) * uGlow;
  float far = 1.0 - smoothstep(0.18, 0.5, max(fw.x, fw.y));

  vec2 toPointer = (plane - uPointer.xy) / (uCell * 3.2);
  float near = uPointer.z * exp(-dot(toPointer, toPointer));
  float shine = max(1.0 + lift * 3.4 * uStrength, 0.25) * (1.0 + near * 1.6);

  float radius = length(plane);
  float reveal = 1.0 - smoothstep(uReveal - uCell * 4.0, uReveal, radius);
  vec2 uv = gl_FragCoord.xy / (uView * uRatio);
  float edgeFade = uFade * 0.5;
  float mask = smootherstep(edgeFade, uv.x) * smootherstep(edgeFade, 1.0 - uv.x) * smootherstep(edgeFade, uv.y) * smootherstep(edgeFade, 1.0 - uv.y);
  mask *= horizon * far * reveal * uPresence * uOpacity;

  float level = (shape * 0.26 + halo * 0.1) * shine * mask;
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  if (uLightMode > 0.5) {
    float alpha = clamp(level * 1.2 + dither, 0.0, 1.0);
    outColor = vec4(uInk * alpha, alpha);
  } else {
    float alpha = clamp(level + dither, 0.0, 1.0);
    vec3 color = mix(uColor, vec3(1.0), clamp(level - 0.7, 0.0, 1.0));
    outColor = vec4(color * alpha, alpha);
  }
}`,We=1.6,$=(o,u,v)=>Math.min(v,Math.max(u,o)),he=(o,u,v)=>{let s=o.createShader(u);return s?(o.shaderSource(s,v),o.compileShader(s),o.getShaderParameter(s,o.COMPILE_STATUS)?s:(o.deleteShader(s),null)):null},_e=o=>{let u=he(o,o.VERTEX_SHADER,Ve),v=he(o,o.FRAGMENT_SHADER,ze),s=o.createProgram();if(!u||!v||!s)return null;if(o.attachShader(s,u),o.attachShader(s,v),o.bindAttribLocation(s,0,"aPosition"),o.linkProgram(s),o.deleteShader(u),o.deleteShader(v),!o.getProgramParameter(s,o.LINK_STATUS))return o.deleteProgram(s),null;let V={},O=o.getProgramParameter(s,o.ACTIVE_UNIFORMS);for(let L=0;L<O;L++){let E=o.getActiveUniform(s,L);E&&(V[E.name.replace("[0]","")]=o.getUniformLocation(s,E.name))}return{program:s,uniforms:V}},Be=({color:o="#ffffff",variant:u="lines",cellSize:v=48,lineWidth:s=1,glow:V=.6,rippleStrength:O=1,rippleSpeed:L=1,rippleSize:E=1,autoRipple:me="center",rippleInterval:ve=2.6,tilt:ge=0,rotation:we=0,mouseInteraction:xe=!0,clickRipple:be=!0,intro:Me=!0,fade:Re=.5,opacity:Se=1,lightMode:ye=!1,paused:Ae=!1,dpr:Pe,className:Ce="",...Le})=>{let Q=(0,b.useRef)(null),Z=(0,b.useRef)(null),G=(0,b.useRef)(null),j={color:String(o),variant:Ie[u]??0,cellSize:Math.max(8,v),lineWidth:Math.max(.25,s),glow:Math.max(0,V),rippleStrength:Math.max(0,O),rippleSpeed:Math.max(.05,L),rippleSize:Math.max(.2,E),autoRipple:me,rippleInterval:Math.max(.3,ve),tilt:$(ge,0,80),rotation:we,mouseInteraction:xe,clickRipple:be,intro:Me,fade:$(Re,0,1),opacity:$(Se,0,1),lightMode:ye,paused:Ae,dpr:Pe},m=(0,b.useRef)(j);return m.current=j,(0,b.useEffect)(()=>{let M=Q.current,R=Z.current,e=R?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!M||!R||!e)return;let z=_e(e);if(!z)return;let a=z.uniforms,ee=e.createBuffer(),X=e.createVertexArray();e.bindVertexArray(X),e.bindBuffer(e.ARRAY_BUFFER,ee),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let P=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),g=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,Y=new Map,Ee=t=>{if(Y.has(t))return Y.get(t);let n=[1,1,1];if(P){P.clearRect(0,0,1,1),P.fillStyle="#ffffff",P.fillStyle=t,P.fillRect(0,0,1,1);let[i,l,r]=P.getImageData(0,0,1,1).data;n=[i,l,r].map(f=>Math.pow(f/255,2.2))}return Y.set(t,n),n},p={width:1,height:1,ratio:1},d={x:0,y:0,inside:!1,planeX:0,planeY:0,lastX:0,lastY:0,travel:0},c={clock:0,intro:m.current.intro&&!g?0:1,glow:0,nextAuto:.4},w=[],F=new Float32Array(I*4),S=0,C=0,W=!0,te=()=>p.height*1.15,U=(t,n)=>{let i=m.current,l=t-p.width/2,r=n-p.height/2,f=i.tilt*Math.PI/180;if(f<=1e-4)return[l,r];let h=te(),x=h+r*Math.tan(f);if(x<=h*.05)return null;let _=h/x;return[l*_,r*_/Math.cos(f)]},T=(t,n,i)=>{w.push({x:t,y:n,born:c.clock,strength:i}),w.length>I&&w.shift()},q=()=>{let t=m.current,n=c.intro*c.intro*(3-2*c.intro),i=t.cellSize*2.4*t.rippleSize,l=240*t.rippleSpeed,r=0;for(let A=w.length-1;A>=0&&r<I;A--){let B=w[A],fe=c.clock-B.born;F[r*4]=B.x,F[r*4+1]=B.y,F[r*4+2]=fe,F[r*4+3]=B.strength*Math.exp(-fe*.55),r++}let f=t.rotation*Math.PI/180,h=Ee(t.color),x=.2126*h[0]+.7152*h[1]+.0722*h[2],_=Math.min(1,.12/Math.max(x,.001)),Fe=h.map(A=>Math.pow(Math.min(1,A*_),1/2.2)),Te=Math.hypot(p.width,p.height);e.bindVertexArray(X),e.viewport(0,0,R.width,R.height),e.useProgram(z.program),e.uniform2f(a.uView,p.width,p.height),e.uniform1f(a.uRatio,p.ratio),e.uniform1f(a.uCell,t.cellSize),e.uniform1f(a.uLineWidth,t.lineWidth),e.uniform1f(a.uGlow,t.glow),e.uniform1f(a.uTilt,t.tilt*Math.PI/180),e.uniform1f(a.uFocal,te()),e.uniform2f(a.uTurn,Math.cos(f),Math.sin(f)),e.uniform4fv(a.uRipples,F),e.uniform1i(a.uRippleCount,r),e.uniform1f(a.uWaveLength,i),e.uniform1f(a.uWaveSpeed,l),e.uniform1f(a.uStrength,t.rippleStrength),e.uniform3f(a.uPointer,d.planeX,d.planeY,c.glow),e.uniform3fv(a.uColor,h.map(A=>Math.pow(A,1/2.2))),e.uniform3fv(a.uInk,Fe),e.uniform1f(a.uPresence,Math.min(1,n*1.6)),e.uniform1f(a.uReveal,t.intro&&!g?n*Te*1.4+t.cellSize*4:1e6),e.uniform1f(a.uFade,t.fade),e.uniform1f(a.uOpacity,t.opacity),e.uniform1f(a.uLightMode,t.lightMode?1:0),e.uniform1i(a.uVariant,t.variant),e.drawArrays(e.TRIANGLES,0,3)},oe=t=>{if(S=0,!W||document.hidden)return;let n=m.current,i=C?Math.min(.05,(t-C)/1e3):1/60;C=t;let l=!n.paused&&!g;if(l&&(c.clock+=i),!n.intro||g?c.intro=1:c.intro<1&&(c.intro=Math.min(1,c.intro+i/We)),l&&n.autoRipple!=="none"&&c.clock>=c.nextAuto){if(n.autoRipple==="random"){let x=U(Math.random()*p.width,p.height*(.2+Math.random()*.7));x&&T(x[0],x[1],.75)}else T(0,0,1);c.nextAuto=c.clock+n.rippleInterval}let r=9/Math.max(.2,n.rippleSpeed);for(;w.length&&c.clock-w[0].born>r;)w.shift();let f=n.mouseInteraction&&d.inside&&!g;c.glow+=((f?1:0)-c.glow)*(1-Math.exp(-i*(f?6:2.5))),q();let h=c.intro<1||Math.abs((f?1:0)-c.glow)>.002;l||h?S=requestAnimationFrame(oe):C=0},y=()=>{!S&&W&&!document.hidden&&(S=requestAnimationFrame(oe))},H=()=>{let t=m.current,n=Math.max(1,M.clientWidth),i=Math.max(1,M.clientHeight),l=Math.min(t.dpr||window.devicePixelRatio||1,2);p.width=n,p.height=i,R.width=Math.max(1,Math.round(n*l)),R.height=Math.max(1,Math.round(i*l)),p.ratio=R.width/n,S||q(),y()},ne=t=>{let n=M.getBoundingClientRect(),i=t.clientX-n.left,l=t.clientY-n.top;d.inside=i>=0&&l>=0&&i<=n.width&&l<=n.height;let r=d.inside?U(i,l):null;if(r){let f=m.current,h=Math.hypot(r[0]-d.planeX,r[1]-d.planeY);d.planeX=r[0],d.planeY=r[1],f.mouseInteraction&&!g&&h<f.cellSize*6&&(d.travel+=h,d.travel>f.cellSize*1.6&&(d.travel=0,T(r[0],r[1],.32)))}else d.inside=!1;d.x=i,d.y=l,y()},re=t=>{if(!m.current.clickRipple||g)return;let i=M.getBoundingClientRect(),l=t.clientX-i.left,r=t.clientY-i.top;if(l<0||r<0||l>i.width||r>i.height)return;let f=U(l,r);f&&T(f[0],f[1],1.2),y()},ie=()=>{d.inside=!1,y()},ae=()=>{C=0,y()},le=new ResizeObserver(H);le.observe(M);let se=new IntersectionObserver(t=>{W=t.some(n=>n.isIntersecting),W&&(C=0,y())});se.observe(M),window.addEventListener("pointermove",ne,{passive:!0}),window.addEventListener("pointerdown",re,{passive:!0}),document.documentElement.addEventListener("pointerleave",ie),document.addEventListener("visibilitychange",ae),m.current.intro&&!g&&T(0,0,1.1),H();let ce=m.current.dpr;return G.current=()=>{let t=m.current;if(t.dpr!==ce){ce=t.dpr,H();return}S||q(),y()},()=>{cancelAnimationFrame(S),G.current=null,le.disconnect(),se.disconnect(),window.removeEventListener("pointermove",ne),window.removeEventListener("pointerdown",re),document.documentElement.removeEventListener("pointerleave",ie),document.removeEventListener("visibilitychange",ae),e.deleteProgram(z.program),e.deleteBuffer(ee),e.deleteVertexArray(X),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,b.useEffect)(()=>{G.current?.()}),(0,K.jsx)("div",{ref:Q,className:["relative h-full w-full overflow-hidden",Ce].filter(Boolean).join(" "),...Le,children:(0,K.jsx)("canvas",{ref:Z,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},pe=Be;var J=k(D(),1),De=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],N=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],qe=De.map((o,u)=>({id:u+1,image:o,src:o,img:o,url:o,title:N[u],text:N[u],label:N[u],alt:N[u],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][u],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ne({big:o}){return(0,J.jsx)(de,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,J.jsx)(pe,{})})}var He=ue(Ne);export{He as default};
