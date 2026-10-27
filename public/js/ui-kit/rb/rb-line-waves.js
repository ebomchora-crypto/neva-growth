import{c as F,i as _e,j as q,l as me,m as he}from"./chunks/chunk-6IYH4WPJ.js";var d=F(_e(),1),X=F(q(),1),ke=24e5,z=4,qe=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,ze=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uTime;
uniform float uLines;
uniform float uWidth;
uniform float uGlow;
uniform float uBrightness;
uniform float uHighlight;
uniform float uHighlightWidth;
uniform float uWarp;
uniform float uScale;
uniform float uRotation;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uCycle;
uniform float uEdge;
uniform vec4 uMouse;
uniform vec4 uRipples[${z}];
uniform float uReveal;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float bend(vec2 p, float t) {
  vec2 q = p * 2.0 / uScale;
  float w = 0.6 * sin(q.x * 0.55 + t * 0.4 + 0.6 * sin(q.y * 0.9 - t * 0.28));
  w += 0.21 * sin(q.x * 1.3 - t * 0.33 + q.y * 0.8 + 1.3);
  w += 0.12 * sin(q.y * 2.3 + q.x * 0.9 - t * 0.37 + 0.4);
  return w * uWarp * uScale * 0.46;
}

float river(vec2 p, float y, float t) {
  float drift = 0.7 * (0.18 * sin(p.x * 1.6 - t * 0.33 + 0.7) + 0.1 * sin(p.x * 3.1 + t * 0.21));
  float center = 0.5 * (0.2 * sin(t * 0.17) + 0.08 * sin(t * 0.29 + 1.3));
  float width = 0.13 * uHighlightWidth;
  float near = (y - center - drift) / width;
  float far = (y + 0.22 * sin(t * 0.13 + 2.0) - drift * 0.6 + 0.3) / (width * 0.55);
  return max(exp(-near * near), exp(-far * far) * 0.7);
}

vec3 palette(float x) {
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(uColor1, uColor2, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(uColor2, uColor3, smoothstep(1.0, 2.0, x));
  return mix(uColor3, uColor1, smoothstep(2.0, 3.0, x));
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = rotate((gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y, uRotation);
  float t = uTime;

  vec2 mouse = rotate(uMouse.xy, uRotation);
  vec2 toMouse = p - mouse;
  float lens = exp(-dot(toMouse, toMouse) / (uMouse.w * uMouse.w));
  p.y -= (p.y - mouse.y) * lens * uMouse.z;

  float ring = 0.0;
  for (int i = 0; i < ${z}; i++) {
    vec4 ripple = uRipples[i];
    if (ripple.w <= 0.0) continue;
    float x = (length(p - rotate(ripple.xy, uRotation)) - ripple.z * 0.6) / 0.08;
    float fade = exp(-ripple.z * 1.3) * smoothstep(0.0, 0.12, ripple.z);
    float bump = exp(-x * x);
    p.y -= x * bump * 0.07 * fade;
    ring += bump * fade;
  }

  float w = bend(p, t);
  float y = p.y + w;
  float phi = y * uLines;
  float fw = max(fwidth(phi), 1e-5);
  float crowd = smoothstep(0.18, 0.5, fw);

  float fold = smoothstep(1.3, 2.2, fw * uResolution.y / uLines);
  float shimmer = mix(1.0, smoothstep(0.15, 0.85, noise(vec2(y * 1.6 + t * 0.07, p.x * 0.55 - t * 0.22))), 0.5);
  float lit = max(river(p, y, t), fold * 0.9) * shimmer;
  float light = mix(1.0, 0.07 + 0.93 * lit, uHighlight);
  light += (1.0 - light) * min(lens * step(0.0001, uMouse.z) * 0.9 + ring * 0.6, 1.0);

  float dist = abs(fract(phi + 0.5) - 0.5) / fw;
  float width = uWidth * uPixel * (1.0 + mix(1.5, 0.6, uLight) * lit * uHighlight);
  float cover = clamp(min(dist + width * 0.5, 0.5) - max(dist - width * 0.5, -0.5), 0.0, 1.0);
  cover = mix(cover, min(width * fw, 1.0), crowd);
  float halo = exp(-dist / (2.2 * uPixel)) * (1.0 - crowd) * uGlow;
  float thread = mix(1.0, 0.55 + 0.45 * hash(vec2(floor(phi + 0.5), 7.3)), 0.45 * (1.0 - crowd));

  float span = 0.5 * sqrt(aspect * aspect + 1.0);
  float sweep = -span + (2.0 * span + 0.6) * uReveal;
  float reveal = 1.0 - smoothstep(sweep - 0.6, sweep, p.x);

  float edge = 1.0;
  if (uEdge > 0.0) {
    float ex = min(uv.x, 1.0 - uv.x) * aspect;
    float ey = min(uv.y, 1.0 - uv.y);
    edge = smootherstep(0.0, uEdge * 0.5, ex) * smootherstep(0.0, uEdge * 0.5, ey);
  }

  vec3 tint = palette(y * 0.3 + p.x * 0.2 + uCycle);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLight > 0.5) {
    float low = min(tint.r, min(tint.g, tint.b));
    float chroma = max(tint.r, max(tint.g, tint.b)) - low;
    vec3 hue = (tint - low) / max(chroma, 1e-3);
    vec3 ink = mix(vec3(0.08), hue * 0.56 + 0.06, smoothstep(0.04, 0.2, chroma));
    float alpha = (cover + halo * 0.35) * thread * light * uBrightness * reveal * edge * 0.78 * uOpacity;
    alpha = clamp(alpha + grain, 0.0, 1.0);
    fragColor = vec4(ink * alpha, alpha);
    return;
  }

  float strength = (cover + halo) * thread * light * uBrightness * reveal * edge;
  vec3 color = clamp(tint * strength * uOpacity, 0.0, 1.0);
  float alpha = max(color.r, max(color.g, color.b));
  color = clamp(color + grain, 0.0, 1.0);
  fragColor = vec4(min(color, vec3(alpha)), alpha);
}`,m=(t,a,s)=>Math.min(s,Math.max(a,t)),U=t=>{let a=String(t||"").trim(),s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(a);if(s){let v=s[1].length===3?s[1].replace(/./g,p=>p+p):s[1];return[0,2,4].map(p=>parseInt(v.slice(p,p+2),16)/255)}let r=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(a);return r?[r[1],r[2],r[3]].map(v=>m(parseFloat(v)/255,0,1)):[1,1,1]},de=(t,a,s)=>{let r=t.createShader(a);return r?(t.shaderSource(r,s),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(console.error(t.getShaderInfoLog(r)),t.deleteShader(r),null)):null},De=t=>{let a=de(t,t.VERTEX_SHADER,qe),s=de(t,t.FRAGMENT_SHADER,ze),r=a&&s?t.createProgram():null;if(!a||!s||!r)return a&&t.deleteShader(a),s&&t.deleteShader(s),null;if(t.attachShader(r,a),t.attachShader(r,s),t.linkProgram(r),t.deleteShader(a),t.deleteShader(s),!t.getProgramParameter(r,t.LINK_STATUS))return console.error(t.getProgramInfoLog(r)),t.deleteProgram(r),null;let v={},p=t.getProgramParameter(r,t.ACTIVE_UNIFORMS);for(let S=0;S<p;S++){let C=t.getActiveUniform(r,S);C&&(v[C.name.replace(/\[0\]$/,"")]=t.getUniformLocation(r,C.name))}return{program:r,uniforms:v}},Be=({color1:t="#ffffff",color2:a="#ffffff",color3:s="#ffffff",colorCycleSpeed:r=1,speed:v=.3,lineCount:p=72,lineWidth:S=1.3,glow:C=.6,brightness:ge=1,highlight:ve=1,highlightWidth:xe=1,warpIntensity:we=1,warpScale:ye=1,rotation:be=-33,edgeFade:Re=0,enableMouseInteraction:Me=!0,mouseInfluence:Ee=2,clickRipple:Le=!0,intro:Se=!0,lightMode:Ce=!1,opacity:Pe=1,maxDevicePixelRatio:Ae=2,className:Ie="",style:Te})=>{let Y=(0,d.useRef)(null),K=(0,d.useRef)(null),B=(0,d.useRef)(null),[J,Fe]=(0,d.useState)(0),Q={color1:U(t),color2:U(a),color3:U(s),cycleSpeed:r,speed:Math.max(0,v),lines:m(p,2,400),width:m(S,.25,12),glow:Math.max(0,C),brightness:Math.max(0,ge),highlight:m(ve,0,1),highlightWidth:m(xe,.2,5),warp:m(we,0,3),scale:m(ye,.2,4),rotation:be*Math.PI/180,edge:m(Re,0,1),mouse:Me,influence:m(Ee,0,3),clickRipple:Le,intro:Se,light:Ce,opacity:m(Pe,0,1),maxRatio:m(Ae,.5,3)},P=(0,d.useRef)(Q);return P.current=Q,(0,d.useEffect)(()=>{B.current?.()}),(0,d.useEffect)(()=>{let A=Y.current,f=K.current;if(!A||!f)return;let o=f.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),W=o?De(o):null;if(!o||!W)return;let I=window.matchMedia("(prefers-reduced-motion: reduce)").matches,Z=o.createVertexArray(),x={width:1,height:1,ratio:1},y={x:0,y:0,inside:!1},l={x:0,y:0,presence:0,ready:!1},g=[],E=new Float32Array(z*4),j=Math.random()*60,ee=0,T=P.current.intro&&!I&&J===0?0:1,b=0,_=0,G=!0,H=document.visibilityState!=="hidden",V=!1,N=()=>{let i=P.current,e=A.getBoundingClientRect(),c=Math.max(1,e.width),h=Math.max(1,e.height),R=Math.min(window.devicePixelRatio||1,i.maxRatio,Math.sqrt(ke/(c*h))),L=Math.max(1,Math.round(c*R)),n=Math.max(1,Math.round(h*R));(f.width!==L||f.height!==n)&&(f.width=L,f.height=n),x.width=c,x.height=h,x.ratio=L/c},te=(i,e)=>[(i-x.width/2)/x.height,(x.height/2-e)/x.height],oe=i=>{if(b=0,V)return;let e=P.current,c=m((i-_)/1e3||0,0,.05);_=Math.max(_,i),j+=c*e.speed*2.5*(I?.25:1),ee+=c*e.speed*e.cycleSpeed*.05,T<1&&(T=Math.min(1,T+c/1.8));let h=e.mouse&&y.inside&&!I;if(h){let[u,M]=te(y.x,y.y);l.ready||(l.x=u,l.y=M,l.ready=!0);let ue=1-Math.exp(-c*10);l.x+=(u-l.x)*ue,l.y+=(M-l.y)*ue}let R=h?1:0;l.presence+=(R-l.presence)*(1-Math.exp(-c*5)),l.presence<.002&&!h&&(l.ready=!1);for(let u=g.length-1;u>=0;u--)g[u].age+=c,g[u].age>2.6&&g.splice(u,1);E.fill(0),g.forEach((u,M)=>{E[M*4]=u.x,E[M*4+1]=u.y,E[M*4+2]=u.age,E[M*4+3]=1});let L=1-Math.pow(1-T,3);o.viewport(0,0,f.width,f.height),o.useProgram(W.program),o.bindVertexArray(Z);let n=W.uniforms;o.uniform2f(n.uResolution,f.width,f.height),o.uniform1f(n.uPixel,x.ratio),o.uniform1f(n.uTime,j),o.uniform1f(n.uLines,e.lines),o.uniform1f(n.uWidth,e.width),o.uniform1f(n.uGlow,e.glow),o.uniform1f(n.uBrightness,e.brightness),o.uniform1f(n.uHighlight,e.highlight),o.uniform1f(n.uHighlightWidth,e.highlightWidth),o.uniform1f(n.uWarp,e.warp*(.25+.75*L)),o.uniform1f(n.uScale,e.scale),o.uniform1f(n.uRotation,e.rotation),o.uniform3f(n.uColor1,e.color1[0],e.color1[1],e.color1[2]),o.uniform3f(n.uColor2,e.color2[0],e.color2[1],e.color2[2]),o.uniform3f(n.uColor3,e.color3[0],e.color3[1],e.color3[2]),o.uniform1f(n.uCycle,ee),o.uniform1f(n.uEdge,e.edge),o.uniform4f(n.uMouse,l.x,l.y,l.presence*e.influence*.16,.2),o.uniform4fv(n.uRipples,E),o.uniform1f(n.uReveal,L),o.uniform1f(n.uLight,e.light?1:0),o.uniform1f(n.uOpacity,e.opacity),o.drawArrays(o.TRIANGLES,0,3);let We=Math.abs(R-l.presence)>.002;(e.speed>0&&!I||T<1||We||g.length>0||h)&&G&&H&&(b=requestAnimationFrame(oe))},w=()=>{b||V||!G||!H||(_=performance.now(),b=requestAnimationFrame(oe))};B.current=()=>{N(),w()};let re=i=>{let e=A.getBoundingClientRect();return{x:i.clientX-e.left,y:i.clientY-e.top,inside:i.clientX>=e.left&&i.clientX<=e.right&&i.clientY>=e.top&&i.clientY<=e.bottom}},ie=i=>{let e=re(i);y.x=e.x,y.y=e.y,y.inside=e.inside,w()},ne=i=>{let e=P.current,c=re(i);if(!c.inside||!e.clickRipple||I)return;let[h,R]=te(c.x,c.y);g.push({x:h,y:R,age:0}),g.length>z&&g.shift(),w()},O=()=>{y.inside=!1,w()},k=i=>{i.pointerType!=="mouse"&&O()};window.addEventListener("pointermove",ie,{passive:!0}),window.addEventListener("pointerdown",ne,{passive:!0}),window.addEventListener("pointerup",k,{passive:!0}),window.addEventListener("pointercancel",k,{passive:!0}),document.documentElement.addEventListener("pointerleave",O);let ae=i=>{i.preventDefault(),V=!0,cancelAnimationFrame(b),b=0},se=()=>Fe(i=>i+1);f.addEventListener("webglcontextlost",ae),f.addEventListener("webglcontextrestored",se);let le=new ResizeObserver(()=>{N(),w()});le.observe(A);let ce=new IntersectionObserver(i=>{G=i.some(e=>e.isIntersecting),w()});ce.observe(A);let fe=()=>{H=document.visibilityState!=="hidden",w()};return document.addEventListener("visibilitychange",fe),N(),w(),()=>{cancelAnimationFrame(b),B.current=null,le.disconnect(),ce.disconnect(),window.removeEventListener("pointermove",ie),window.removeEventListener("pointerdown",ne),window.removeEventListener("pointerup",k),window.removeEventListener("pointercancel",k),document.documentElement.removeEventListener("pointerleave",O),document.removeEventListener("visibilitychange",fe),f.removeEventListener("webglcontextlost",ae),f.removeEventListener("webglcontextrestored",se),o.isContextLost()||(o.deleteVertexArray(Z),o.deleteProgram(W.program))}},[J]),(0,X.jsx)("div",{ref:Y,className:`relative h-full w-full overflow-hidden ${Ie}`.trim(),style:Te,children:(0,X.jsx)("canvas",{ref:K,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},pe=Be;var $=F(q(),1),Ge=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],D=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ye=Ge.map((t,a)=>({id:a+1,image:t,src:t,img:t,url:t,title:D[a],text:D[a],label:D[a],alt:D[a],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][a],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function He({big:t}){return(0,$.jsx)(he,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,$.jsx)(pe,{})})}var Ke=me(He);export{Ke as default};
