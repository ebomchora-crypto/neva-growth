import{c as F,i as Le,j as k,l as ie,m as se}from"./chunks/chunk-6IYH4WPJ.js";var d=F(Le(),1),V=F(k(),1),Be=24e5,O=Math.PI*2,le={"top-right":{flipX:0,flipY:0,side:0},"top-left":{flipX:1,flipY:0,side:0},"bottom-right":{flipX:0,flipY:1,side:0},"bottom-left":{flipX:1,flipY:1,side:0},right:{flipX:0,flipY:0,side:1},left:{flipX:1,flipY:0,side:1}},Pe=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,Te=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uBlend;
uniform float uIntensity;
uniform float uSpread;
uniform float uDensity;
uniform float uSharpness;
uniform float uFalloff;
uniform float uGlow;
uniform float uSaturation;
uniform float uDust;
uniform float uOpacity;
uniform float uReveal;
uniform float uLight;
uniform vec3 uFrame;
uniform float uAim;
uniform vec3 uFocus;
uniform float uSway;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float shafts(float u, float t, float seed, float aa) {
  float sway = (0.4 * sin(t * 0.31 + seed) + 0.24 * sin(t * 0.17 + seed * 2.3)) * uSway;
  float n = 0.7 * noise(vec2(u + sway + seed, t * 0.3)) + 0.3 * noise(vec2(u * 2.4 + sway * 1.5 + seed * 1.7, t * 0.45 + 3.0));
  float width = mix(0.5, 0.1, uSharpness);
  float s = mix(smoothstep(0.5 - width, 0.5 + width, n), 0.5, aa);
  return mix(0.05, 1.0, s);
}

float motes(vec2 p, float cell, float t, float seed) {
  p += vec2(t * 0.021, -t * 0.013) + seed * 7.31;
  vec2 grid = p / cell;
  vec2 id = floor(grid);
  vec2 f = grid - id;
  float h = hash(id + seed);
  if (h > 0.5) return 0.0;
  vec2 center = 0.25 + 0.5 * vec2(hash(id + 1.7 + seed), hash(id + 3.1 + seed));
  center += 0.1 * vec2(sin(t * 0.7 + h * 31.0), cos(t * 0.6 + h * 23.0));
  float size = mix(0.035, 0.09, hash(id + 5.3 + seed));
  float edge = length(fwidth(grid)) * 0.7;
  float twinkle = 0.55 + 0.45 * sin(t * 1.9 + h * 41.0);
  return (1.0 - smoothstep(size - edge, size + edge, length(f - center))) * twinkle;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 q = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  if (uFrame.x > 0.5) q.x = -q.x;
  if (uFrame.y > 0.5) q.y = -q.y;
  vec2 source = uFrame.z > 0.5 ? vec2(aspect * 0.5 + 0.42, 0.3) : vec2(aspect * 0.5 + 0.1, 0.62);
  float heading = (uFrame.z > 0.5 ? 3.42 : -2.48) + uAim + 0.035 * sin(uTime * 0.21) * uSway;
  vec2 v = q - source;
  float r = length(v);
  float angle = mod(atan(v.y, v.x) - heading + 3.14159265, 6.28318531) - 3.14159265;
  float t = uTime;
  float u = angle * uDensity;
  float aa = smoothstep(0.12, 0.45, fwidth(u));
  float offset = uSpread * 0.22;
  float fanA = exp(-pow((angle + offset) / uSpread, 2.0) * 1.4);
  float fanB = exp(-pow((angle - offset) / (uSpread * 1.15), 2.0) * 1.4);
  float focus = 1.0 + uFocus.z * exp(-pow((angle - uFocus.x) / uFocus.y, 2.0));
  float lightA = fanA * shafts(u, t, 0.0, aa) * focus;
  float lightB = fanB * shafts(u * 0.83, t * 0.6, 17.0, aa) * focus;
  float reach = 1.0 / (1.0 + pow(r / 0.4, uFalloff));
  vec3 glowColor = mix(uColorA, uColorB, uBlend);
  vec3 light = (uColorA * lightA * (1.0 - uBlend) + uColorB * lightB * uBlend) * 2.0 * reach;
  light += glowColor * uGlow * exp(-pow(r / 0.4, 2.0));
  if (uDust > 0.0) {
    float sparkle = motes(q, 0.06, t, 0.0) + 0.7 * motes(q, 0.038, t * 0.8, 9.0);
    light += mix(glowColor, vec3(1.0), 0.6) * sparkle * (lightA + lightB) * reach * uDust * 2.5;
  }
  light *= uIntensity * (1.0 - smoothstep(uReveal * 2.6 - 0.45, uReveal * 2.6, r)) * smoothstep(0.0, 0.35, uReveal);
  float gray = dot(light, vec3(0.2126, 0.7152, 0.0722));
  light = max(mix(vec3(gray), light, uSaturation), 0.0);
  float peak = max(light.r, max(light.g, light.b));
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 ink = pow(light / max(peak, 1e-4), vec3(2.0)) * 0.75;
    float alpha = clamp(pow(1.0 - exp(-peak * 2.6), 2.5) * 0.9 * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(pow(ink, vec3(1.0 / 2.2)) * alpha, alpha);
    return;
  }
  float mapped = 1.0 - exp(-peak);
  vec3 tone = light * (mapped / max(peak, 1e-4));
  tone = mix(tone, vec3(mapped), smoothstep(0.7, 1.0, mapped) * 0.55);
  vec3 shown = clamp(tone * uOpacity, 0.0, 1.0);
  float alpha = max(shown.r, max(shown.g, shown.b));
  vec3 color = clamp(shown * alpha + grain, 0.0, 1.0);
  fragColor = vec4(min(color, vec3(alpha)), alpha);
}`,c=(t,n,s)=>Math.min(s,Math.max(n,t)),ke=t=>((t+Math.PI)%O+O)%O-Math.PI,ce=t=>{let n=String(t||"").trim(),s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(n);if(s){let p=s[1].length===3?s[1].replace(/./g,m=>m+m):s[1];return[0,2,4].map(m=>parseInt(p.slice(m,m+2),16)/255)}let a=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(n);return a?[a[1],a[2],a[3]].map(p=>c(parseFloat(p)/255,0,1)):[1,1,1]},De=(t,n)=>({source:t.side?[n*.5+.42,.3]:[n*.5+.1,.62],heading:t.side?3.42:-2.48}),fe=(t,n,s)=>{let a=t.createShader(n);return a?(t.shaderSource(a,s),t.compileShader(a),t.getShaderParameter(a,t.COMPILE_STATUS)?a:(console.error(t.getShaderInfoLog(a)),t.deleteShader(a),null)):null},Xe=t=>{let n=fe(t,t.VERTEX_SHADER,Pe),s=fe(t,t.FRAGMENT_SHADER,Te),a=n&&s?t.createProgram():null;if(!n||!s||!a)return n&&t.deleteShader(n),s&&t.deleteShader(s),null;if(t.attachShader(a,n),t.attachShader(a,s),t.linkProgram(a),t.deleteShader(n),t.deleteShader(s),!t.getProgramParameter(a,t.LINK_STATUS))return console.error(t.getProgramInfoLog(a)),t.deleteProgram(a),null;let p={},m=t.getProgramParameter(a,t.ACTIVE_UNIFORMS);for(let S=0;S<m;S++){let A=t.getActiveUniform(a,S);A&&(p[A.name]=t.getUniformLocation(a,A.name))}return{program:a,uniforms:p}},qe=({rayColor1:t="#FFC46B",rayColor2:n="#96c8ff",blend:s=.6,origin:a="top-right",speed:p=2.5,intensity:m=2,spread:S=2,density:A=5,sharpness:de=.5,tilt:me=0,falloff:he=1.6,glow:pe=1,saturation:ge=1,dust:ve=0,followMouse:we=!0,mouseInfluence:xe=.5,intro:ye=!0,lightMode:be=!1,opacity:Se=1,maxDevicePixelRatio:Ae=2,className:Me="",style:Re})=>{let U=(0,d.useRef)(null),H=(0,d.useRef)(null),X=(0,d.useRef)(null),[$,Ee]=(0,d.useState)(0),K={colorA:ce(t),colorB:ce(n),blend:c(s,0,1),frame:le[a]??le["top-right"],speed:Math.max(0,p)*.4,intensity:Math.max(0,m)*.75,spread:c(S,.1,8)*.225,density:c(A,1,40),sharpness:c(de,0,1),tilt:c(me,-180,180)*Math.PI/180,falloff:c(he,.2,6),glow:Math.max(0,pe)*1.2,saturation:Math.max(0,ge),dust:c(ve,0,1),followMouse:we,mouseInfluence:c(xe,0,1),intro:ye,light:be,opacity:c(Se,0,1),maxRatio:c(Ae,.5,3)},L=(0,d.useRef)(K);return L.current=K,(0,d.useEffect)(()=>{X.current?.()}),(0,d.useEffect)(()=>{let M=U.current,l=H.current;if(!M||!l)return;let o=l.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),B=o?Xe(o):null;if(!o||!B)return;let R=window.matchMedia("(prefers-reduced-motion: reduce)").matches,W=o.createVertexArray(),g={width:1,height:1},v={x:0,y:0,inside:!1},h={value:0,velocity:0},w={angle:0,strength:0},J=Math.random()*100,E=L.current.intro&&!R&&$===0?0:1,x=0,P=0,q=!0,z=document.visibilityState!=="hidden",G=!1,Y=()=>{let r=L.current,e=M.getBoundingClientRect(),f=Math.max(1,e.width),u=Math.max(1,e.height),b=Math.min(window.devicePixelRatio||1,r.maxRatio,Math.sqrt(Be/(f*u))),I=Math.max(1,Math.round(f*b)),C=Math.max(1,Math.round(u*b));(l.width!==I||l.height!==C)&&(l.width=I,l.height=C),g.width=f,g.height=u},Ie=r=>{let e=(v.x-g.width/2)/g.height,f=(g.height/2-v.y)/g.height;r.frame.flipX&&(e=-e),r.frame.flipY&&(f=-f);let{source:u,heading:b}=De(r.frame,g.width/g.height);return ke(Math.atan2(f-u[1],e-u[0])-b-r.tilt)},Q=r=>{if(x=0,G)return;let e=L.current,f=c((r-P)/1e3||0,0,.05);P=Math.max(P,r),J+=f*e.speed*(R?.3:1),E<1&&(E=Math.min(1,E+f/1.6));let u=e.followMouse&&v.inside&&!R,b=u?Ie(e):0,I=u?c(b,-e.spread,e.spread)*e.mouseInfluence:0,C=u?e.mouseInfluence:0,ne=1-Math.exp(-f*6);u&&(w.angle+=(c(b-h.value,-e.spread*1.5,e.spread*1.5)-w.angle)*ne),w.strength+=(C-w.strength)*ne;let re=18,Ce=2*Math.sqrt(re);h.velocity+=((I-h.value)*re-h.velocity*Ce)*f,h.value+=h.velocity*f,o.viewport(0,0,l.width,l.height),o.useProgram(B.program),o.bindVertexArray(W);let i=B.uniforms;o.uniform2f(i.uResolution,l.width,l.height),o.uniform1f(i.uTime,J),o.uniform3f(i.uColorA,e.colorA[0],e.colorA[1],e.colorA[2]),o.uniform3f(i.uColorB,e.colorB[0],e.colorB[1],e.colorB[2]),o.uniform1f(i.uBlend,e.blend),o.uniform1f(i.uIntensity,e.intensity),o.uniform1f(i.uSpread,e.spread),o.uniform1f(i.uDensity,e.density),o.uniform1f(i.uSharpness,e.sharpness),o.uniform1f(i.uFalloff,e.falloff),o.uniform1f(i.uGlow,e.glow),o.uniform1f(i.uSaturation,e.saturation),o.uniform1f(i.uDust,e.dust),o.uniform1f(i.uOpacity,e.opacity),o.uniform1f(i.uReveal,1-Math.pow(1-E,3)),o.uniform1f(i.uLight,e.light?1:0),o.uniform3f(i.uFrame,e.frame.flipX,e.frame.flipY,e.frame.side),o.uniform1f(i.uAim,e.tilt+h.value),o.uniform3f(i.uFocus,w.angle,Math.max(.06,e.spread*.25),w.strength*1.4),o.uniform1f(i.uSway,R?0:1),o.drawArrays(o.TRIANGLES,0,3);let Fe=Math.abs(I-h.value)>1e-4||Math.abs(h.velocity)>1e-4||Math.abs(C-w.strength)>.001;(e.speed>0&&!R||E<1||Fe)&&q&&z&&(x=requestAnimationFrame(Q))},y=()=>{x||G||!q||!z||(P=performance.now(),x=requestAnimationFrame(Q))};X.current=()=>{Y(),y()};let Z=r=>{let e=M.getBoundingClientRect();v.x=r.clientX-e.left,v.y=r.clientY-e.top,v.inside=r.clientX>=e.left&&r.clientX<=e.right&&r.clientY>=e.top&&r.clientY<=e.bottom,y()},N=()=>{v.inside=!1,y()},T=r=>{r.pointerType!=="mouse"&&N()};window.addEventListener("pointermove",Z,{passive:!0}),window.addEventListener("pointerup",T,{passive:!0}),window.addEventListener("pointercancel",T,{passive:!0}),document.documentElement.addEventListener("pointerleave",N);let j=r=>{r.preventDefault(),G=!0,cancelAnimationFrame(x),x=0},ee=()=>Ee(r=>r+1);l.addEventListener("webglcontextlost",j),l.addEventListener("webglcontextrestored",ee);let te=new ResizeObserver(()=>{Y(),y()});te.observe(M);let oe=new IntersectionObserver(r=>{q=r.some(e=>e.isIntersecting),y()});oe.observe(M);let ae=()=>{z=document.visibilityState!=="hidden",y()};return document.addEventListener("visibilitychange",ae),Y(),y(),()=>{cancelAnimationFrame(x),X.current=null,te.disconnect(),oe.disconnect(),window.removeEventListener("pointermove",Z),window.removeEventListener("pointerup",T),window.removeEventListener("pointercancel",T),document.documentElement.removeEventListener("pointerleave",N),document.removeEventListener("visibilitychange",ae),l.removeEventListener("webglcontextlost",j),l.removeEventListener("webglcontextrestored",ee),o.isContextLost()||(o.deleteVertexArray(W),o.deleteProgram(B.program))}},[$]),(0,V.jsx)("div",{ref:U,className:`pointer-events-none relative h-full w-full overflow-hidden ${Me}`.trim(),style:Re,children:(0,V.jsx)("canvas",{ref:H,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ue=qe;var _=F(k(),1),ze=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],D=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],He=ze.map((t,n)=>({id:n+1,image:t,src:t,img:t,url:t,title:D[n],text:D[n],label:D[n],alt:D[n],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][n],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ge({big:t}){return(0,_.jsx)(se,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,_.jsx)(ue,{})})}var $e=ie(Ge);export{$e as default};
