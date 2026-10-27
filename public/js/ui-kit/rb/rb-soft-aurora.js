import{c as F,i as He,j as O,l as ue,m as de}from"./chunks/chunk-6IYH4WPJ.js";var m=F(He(),1),Y=F(O(),1),q=4,Be=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,Oe=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uFlow;
uniform float uHue;
uniform float uScale;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uBandHeight;
uniform float uBandSpread;
uniform float uOctaveDecay;
uniform float uLayerOffset;
uniform vec2 uShift;
uniform vec4 uCursor;
uniform vec4 uPulses[${q}];
uniform float uSpectrum;
uniform float uTilt;
uniform vec3 uIntro;
uniform float uLightMode;
uniform float uOpacity;
out vec4 fragColor;

#define TAU 6.28318

vec3 gradientHash(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 234.6)),
    dot(p, vec3(269.5, 183.3, 198.3)),
    dot(p, vec3(169.5, 283.3, 156.9))
  );
  vec3 h = fract(sin(p) * 43758.5453123);
  float phi = acos(2.0 * h.x - 1.0);
  float theta = TAU * h.y;
  return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
}

float quinticSmooth(float t) {
  float t2 = t * t;
  float t3 = t * t2;
  return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3;
}

vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c * t + d));
}

float perlin3D(float amplitude, float frequency, float px, float py, float pz) {
  float x = px * frequency;
  float y = py * frequency;

  float fx = floor(x);
  float fy = floor(y);
  float fz = floor(pz);
  float cx = ceil(x);
  float cy = ceil(y);
  float cz = ceil(pz);

  vec3 g000 = gradientHash(vec3(fx, fy, fz));
  vec3 g100 = gradientHash(vec3(cx, fy, fz));
  vec3 g010 = gradientHash(vec3(fx, cy, fz));
  vec3 g110 = gradientHash(vec3(cx, cy, fz));
  vec3 g001 = gradientHash(vec3(fx, fy, cz));
  vec3 g101 = gradientHash(vec3(cx, fy, cz));
  vec3 g011 = gradientHash(vec3(fx, cy, cz));
  vec3 g111 = gradientHash(vec3(cx, cy, cz));

  float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz));
  float d100 = dot(g100, vec3(x - cx, y - fy, pz - fz));
  float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz));
  float d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
  float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz));
  float d101 = dot(g101, vec3(x - cx, y - fy, pz - cz));
  float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz));
  float d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));

  float sx = quinticSmooth(x - fx);
  float sy = quinticSmooth(y - fy);
  float sz = quinticSmooth(pz - fz);

  float lx00 = mix(d000, d100, sx);
  float lx10 = mix(d010, d110, sx);
  float lx01 = mix(d001, d101, sx);
  float lx11 = mix(d011, d111, sx);

  float ly0 = mix(lx00, lx10, sy);
  float ly1 = mix(lx01, lx11, sy);

  return amplitude * mix(ly0, ly1, sz);
}

float auroraGlow(float t, vec2 uv, float bend) {
  float noiseVal = 0.0;
  float freq = uNoiseFreq;
  float amp = uNoiseAmp;
  vec2 samplePos = uv * uScale;

  for (float i = 0.0; i < 3.0; i += 1.0) {
    noiseVal += perlin3D(amp, freq, samplePos.x, samplePos.y, t);
    amp *= uOctaveDecay;
    freq *= 2.0;
  }

  float yBand = uv.y * 10.0 - (uBandHeight + bend) * 10.0;
  return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * uIntro.y * abs(noiseVal * uIntro.z + yBand))), 0.0);
}

vec2 turn(vec2 p, vec2 center) {
  float c = cos(uTilt);
  float s = sin(uTilt);
  vec2 d = p - center;
  return center + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 center = vec2(0.5 * uResolution.x / uResolution.y, 0.5);
  vec2 screen = turn(gl_FragCoord.xy / uResolution.y, center);
  vec2 cursor = turn(uCursor.xy, center);
  vec2 field = screen + uShift;
  float t = 0.4 * uFlow;

  float reach = exp(-pow((screen.x - cursor.x) / 0.32, 2.0)) * uCursor.z;
  float gap = cursor.y + uShift.y - uBandHeight;
  float near = exp(-gap * gap / 0.16);
  float bend = reach * gap * near * 0.55;

  float pulse = 0.0;
  for (int i = 0; i < ${q}; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (abs(screen.x - turn(wave.xy, center).x) - wave.w * 0.55) / (0.1 + wave.w * 0.06);
    pulse += wave.z * exp(-x * x);
  }
  float boost = (1.0 + reach * near * 0.25 + pulse * 0.65) * uIntro.x;

  float glow1 = auroraGlow(t, field, bend) * boost;
  float glow2 = auroraGlow(t + uLayerOffset, field, bend) * boost;
  vec3 gradient1 = mix(vec3(1.0), cosineGradient(uv.x + uHue * 0.2, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.20, 0.20)), uSpectrum);
  vec3 gradient2 = mix(vec3(1.0), cosineGradient(uv.x + uHue * 0.1, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25)), uSpectrum);

  vec3 col = 0.99 * glow1 * gradient1 * uColor1;
  col += 0.99 * glow2 * gradient2 * uColor2;
  col *= uBrightness;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLightMode > 0.5) {
    float energy = max(col.r, max(col.g, col.b));
    vec3 hue = clamp(col / max(energy, 1e-4), 0.0, 1.0);
    vec3 average = (glow1 * uColor1 + glow2 * uColor2) / max(glow1 + glow2, 1e-4);
    float top = max(average.r, max(average.g, average.b));
    float spread = top - min(average.r, min(average.g, average.b));
    float core = smoothstep(0.55, 1.6, energy);
    float depth = 1.25 + 0.45 * core;
    vec3 tint = mix(average * 0.82, pow(average / max(top, 1e-4), vec3(depth + 0.6)), smoothstep(0.04, 0.2, spread));
    float vivid = smoothstep(0.12, 0.55, 1.0 - min(hue.r, min(hue.g, hue.b))) * smoothstep(0.04, 0.2, spread);
    vec3 ink = mix(tint, pow(hue, vec3(depth)), vivid) * mix(0.93, 0.8, core);
    float density = 0.88 * (1.0 - exp(-1.9 * pow(energy, 1.7)));
    density = clamp(density * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
  } else {
    float alpha = clamp(length(col), 0.0, 1.0);
    vec3 color = clamp(col, 0.0, 1.0);
    fragColor = vec4(clamp(color * alpha + grain, 0.0, alpha) * uOpacity, alpha * uOpacity);
  }
}`,w=(t,r,i)=>Math.min(i,Math.max(r,t)),me=t=>{let r=String(t||"").trim(),i=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(r);if(i){let g=i[1].length===3?i[1].replace(/./g,p=>p+p):i[1];return[0,2,4].map(p=>parseInt(g.slice(p,p+2),16)/255)}let n=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(r);return n?[n[1],n[2],n[3]].map(g=>w(parseFloat(g)/255,0,1)):null},pe=(t,r,i)=>{let n=t.createShader(r);return n?(t.shaderSource(n,i),t.compileShader(n),t.getShaderParameter(n,t.COMPILE_STATUS)?n:(console.error(t.getShaderInfoLog(n)),t.deleteShader(n),null)):null},qe=t=>{let r=pe(t,t.VERTEX_SHADER,Be),i=pe(t,t.FRAGMENT_SHADER,Oe),n=r&&i?t.createProgram():null;if(!r||!i||!n)return r&&t.deleteShader(r),i&&t.deleteShader(i),null;if(t.attachShader(n,r),t.attachShader(n,i),t.linkProgram(n),t.deleteShader(r),t.deleteShader(i),!t.getProgramParameter(n,t.LINK_STATUS))return console.error(t.getProgramInfoLog(n)),t.deleteProgram(n),null;let g={},p=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let E=0;E<p;E++){let L=t.getActiveUniform(n,E);L&&(g[L.name.replace(/\[0\]$/,"")]=t.getUniformLocation(n,L.name))}return{program:n,uniforms:g}},$=t=>{let r=w(t,0,1);return r*r*r*(r*(r*6-15)+10)},De=({speed:t=.6,scale:r=1.5,brightness:i=1,color1:n="#f7f7f7",color2:g="#e100ff",noiseFrequency:p=2.5,noiseAmplitude:E=1,bandHeight:L=.5,bandSpread:he=1,octaveDecay:ge=.1,layerOffset:xe=0,colorSpeed:ye=1,spectrum:we=1,tilt:be=0,enableMouseInteraction:Se=!0,mouseInfluence:ze=.25,clickPulse:Me=!0,intro:Ee=!0,lightMode:Le=!1,opacity:Ae=1,className:Ce="",style:Pe})=>{let W=(0,m.useRef)(null),J=(0,m.useRef)(null),N=(0,m.useRef)(null),[Q,Re]=(0,m.useState)(0),Z={speed:Math.max(0,t),scale:Math.max(.01,r),brightness:Math.max(0,i),color1:me(n)||[.969,.969,.969],color2:me(g)||[.882,0,1],noiseFrequency:Math.max(.01,p),noiseAmplitude:Math.max(0,E),bandHeight:L,bandSpread:Math.max(0,he),octaveDecay:Math.max(0,ge),layerOffset:xe,colorSpeed:ye,spectrum:w(we,0,1),tilt:w(be,-90,90)*Math.PI/180,mouse:Se,influence:Math.max(0,ze),clickPulse:Me,intro:Ee,light:Le,opacity:w(Ae,0,1)},A=(0,m.useRef)(Z);return A.current=Z,(0,m.useEffect)(()=>{N.current?.()}),(0,m.useEffect)(()=>{let C=W.current,s=J.current;if(!C||!s)return;let o=s.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),I=o?qe(o):null;if(!o||!I)return;let V=window.matchMedia("(prefers-reduced-motion: reduce)").matches,j=o.createVertexArray(),b={width:1,height:1},v={x:.5,y:.5,inside:!1},l={x:.5,y:.5,presence:0},h=[],S=new Float32Array(q*4),ee=0,te=0,z=A.current.intro&&!V&&Q===0?0:1,y=0,T=0,_=!0,G=document.visibilityState!=="hidden",k=!1,U=()=>{let a=A.current,e=C.getBoundingClientRect(),f=Math.max(1,e.width),P=Math.max(1,e.height),d=w(.35+.04*a.noiseFrequency*a.scale,.5,1),R=Math.max(1,Math.round(f*d)),M=Math.max(1,Math.round(P*d));(s.width!==R||s.height!==M)&&(s.width=R,s.height=M),b.width=f,b.height=P},oe=a=>{if(y=0,k)return;let e=A.current,f=w((a-T)/1e3||0,0,.05);T=Math.max(T,a);let P=V?.35:1;ee+=f*e.speed*P,te+=f*e.speed*e.colorSpeed*P,z<1&&(z=Math.min(1,z+f/2));let d=e.mouse&&v.inside,R=1-Math.exp(-f/.325);l.x+=((d?v.x:.5)-l.x)*R,l.y+=((d?v.y:.5)-l.y)*R,l.presence+=((d?1:0)-l.presence)*(1-Math.exp(-f/(d?.45:.8)));for(let u=h.length-1;u>=0;u--)h[u].age+=f,h[u].age>=2.6&&h.splice(u,1);S.fill(0),h.forEach((u,B)=>{S[B*4]=u.x,S[B*4+1]=u.y,S[B*4+2]=$(u.age/.18)*(1-$((u.age-.18)/2.42)),S[B*4+3]=u.age});let M=1-Math.pow(1-z,3),Fe=b.width/b.height,Ie=Math.min(1,e.influence*4)*l.presence;o.viewport(0,0,s.width,s.height),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.useProgram(I.program),o.bindVertexArray(j);let c=I.uniforms;o.uniform2f(c.uResolution,s.width,s.height),o.uniform1f(c.uFlow,ee),o.uniform1f(c.uHue,te),o.uniform1f(c.uScale,e.scale),o.uniform1f(c.uBrightness,e.brightness),o.uniform3f(c.uColor1,e.color1[0],e.color1[1],e.color1[2]),o.uniform3f(c.uColor2,e.color2[0],e.color2[1],e.color2[2]),o.uniform1f(c.uNoiseFreq,e.noiseFrequency),o.uniform1f(c.uNoiseAmp,e.noiseAmplitude),o.uniform1f(c.uBandHeight,e.bandHeight),o.uniform1f(c.uBandSpread,e.bandSpread),o.uniform1f(c.uOctaveDecay,e.octaveDecay),o.uniform1f(c.uLayerOffset,e.layerOffset),o.uniform2f(c.uShift,(l.x-.5)*e.influence*(e.mouse?1:0),(l.y-.5)*e.influence*(e.mouse?1:0)),o.uniform4f(c.uCursor,l.x*Fe,l.y,Ie,0),o.uniform4fv(c.uPulses,S),o.uniform1f(c.uSpectrum,e.spectrum),o.uniform1f(c.uTilt,e.tilt),o.uniform3f(c.uIntro,$(z/.7),1+3*(1-M)*(1-M),.25+.75*M),o.uniform1f(c.uLightMode,e.light?1:0),o.uniform1f(c.uOpacity,e.opacity),o.drawArrays(o.TRIANGLES,0,3);let Te=Math.abs(l.x-(d?v.x:.5))>1e-4||Math.abs(l.y-(d?v.y:.5))>1e-4||Math.abs((d?1:0)-l.presence)>.001||h.length>0;(e.speed>0||z<1||Te)&&_&&G&&(y=requestAnimationFrame(oe))},x=()=>{y||k||!_||!G||(T=performance.now(),y=requestAnimationFrame(oe))};N.current=()=>{U(),x()};let re=a=>{let e=C.getBoundingClientRect();return{x:(a.clientX-e.left)/Math.max(1,e.width),y:1-(a.clientY-e.top)/Math.max(1,e.height),inside:a.clientX>=e.left&&a.clientX<=e.right&&a.clientY>=e.top&&a.clientY<=e.bottom}},ne=a=>{let e=re(a);v.x=e.x,v.y=e.y,v.inside=e.inside,x()},ae=a=>{let e=A.current,f=re(a);!f.inside||!e.clickPulse||V||(h.push({x:f.x*(b.width/b.height),y:f.y,age:0}),h.length>q&&h.shift(),x())},X=()=>{v.inside=!1,x()},H=a=>{a.pointerType!=="mouse"&&X()};window.addEventListener("pointermove",ne,{passive:!0}),window.addEventListener("pointerdown",ae,{passive:!0}),window.addEventListener("pointerup",H,{passive:!0}),window.addEventListener("pointercancel",H,{passive:!0}),document.documentElement.addEventListener("pointerleave",X);let ce=a=>{a.preventDefault(),k=!0,cancelAnimationFrame(y),y=0},ie=()=>Re(a=>a+1);s.addEventListener("webglcontextlost",ce),s.addEventListener("webglcontextrestored",ie);let se=new ResizeObserver(()=>{U(),x()});se.observe(C);let le=new IntersectionObserver(a=>{_=a.some(e=>e.isIntersecting),x()});le.observe(C);let fe=()=>{G=document.visibilityState!=="hidden",x()};return document.addEventListener("visibilitychange",fe),U(),x(),()=>{cancelAnimationFrame(y),N.current=null,se.disconnect(),le.disconnect(),window.removeEventListener("pointermove",ne),window.removeEventListener("pointerdown",ae),window.removeEventListener("pointerup",H),window.removeEventListener("pointercancel",H),document.documentElement.removeEventListener("pointerleave",X),document.removeEventListener("visibilitychange",fe),s.removeEventListener("webglcontextlost",ce),s.removeEventListener("webglcontextrestored",ie),o.isContextLost()||(o.deleteVertexArray(j),o.deleteProgram(I.program))}},[Q]),(0,Y.jsx)("div",{ref:W,className:`relative h-full w-full overflow-hidden ${Ce}`.trim(),style:Pe,children:(0,Y.jsx)("canvas",{ref:J,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},ve=De;var K=F(O(),1),Ne=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],D=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ye=Ne.map((t,r)=>({id:r+1,image:t,src:t,img:t,url:t,title:D[r],text:D[r],label:D[r],alt:D[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ve({big:t}){return(0,K.jsx)(de,{big:t,dark:!0,center:!1,zoom:1,drive:!1,children:(0,K.jsx)(ve,{})})}var Ke=ue(Ve);export{Ke as default};
