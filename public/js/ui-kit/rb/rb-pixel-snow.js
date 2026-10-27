import{c as J,i as ut,j as le,l as Ye,m as He}from"./chunks/chunk-6IYH4WPJ.js";var D=J(ut(),1),Se=J(le(),1),je={square:[["@"],["oo","oo"],["xox","o@o","xox"],["xoox","o@@o","o@@o","xoox"],["xooox","oo@oo","o@@@o","oo@oo","xooox"],["xox","o@o","xox"],["xoox","o@@o","o@@o","xoox"],["xooox","oo@oo","o@@@o","oo@oo","xooox"]],round:[["@"],[".x.","x@x",".x."],[".xx.","x@@x","x@@x",".xx."],[".xxx.","xo@ox","x@@@x","xo@ox",".xxx."],["..xxx..",".xooox.","xoo@oox","xo@@@ox","xoo@oox",".xooox.","..xxx.."],[".xx.","x@@x","x@@x",".xx."],[".xxx.","xo@ox","x@@@x","xo@ox",".xxx."],["..xxx..",".xooox.","xoo@oox","xo@@@ox","xoo@oox",".xooox.","..xxx.."]],snowflake:[["@"],[".x.","x@x",".x."],["..x..","x.o.x",".o@o.","x.o.x","..x.."],["...x...",".x.o.x.","..ooo..","xoo@oox","..ooo..",".x.o.x.","...x..."],["....x....",".x..o..x.","..o.o.o..","...ooo...","xooo@ooox","...ooo...","..o.o.o..",".x..o..x.","....x...."],["x...x",".o.o.","..@..",".o.o.","x...x"],["x..x..x",".o.o.o.","..ooo..","xoo@oox","..ooo..",".o.o.o.","x..x..x"],["x...x...x",".o..o..o.","..o.o.o..","...ooo...","xooo@ooox","...ooo...","..o.o.o..",".o..o..o.","x...x...x"]]},ue=["square","round","snowflake"],H=9,ce=5,fe=8,qe=4e3,ft=[.46,.27,.15,.08,.04],$e=[16,24,34,48,66],xt=[.42,.58,.76,.92,1],ht=1.4,se=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,dt=`#version 300 es
in vec2 aCorner;
in vec4 aFlake;
uniform vec2 uGrid;
uniform vec4 uSizes;
uniform float uLargest;
flat out ivec2 vOrigin;
flat out ivec2 vCell;
flat out int vSize;
flat out float vLight;
void main() {
  int index = int(aFlake.z + 0.5);
  int slot = index % ${fe};
  int variant = index / ${fe};
  int level = slot < ${ce} ? slot : slot - 3;
  float size = level == 0 ? 1.0 : (level == 1 ? uSizes.x : (level == 2 ? uSizes.y : (level == 3 ? uSizes.z : uLargest)));
  vec2 origin = floor(aFlake.xy) - floor(size * 0.5);
  origin.y = uGrid.y - origin.y - size;
  vec2 corner = origin + (aCorner * 0.5 + 0.5) * size;
  gl_Position = vec4(corner / uGrid * 2.0 - 1.0, 0.0, 1.0);
  vOrigin = ivec2(origin);
  vCell = ivec2(slot * ${H}, variant * ${H});
  vSize = int(size);
  vLight = aFlake.w;
}`,mt=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uAtlas;
flat in ivec2 vOrigin;
flat in ivec2 vCell;
flat in int vSize;
flat in float vLight;
out vec4 outColor;
void main() {
  ivec2 local = ivec2(gl_FragCoord.xy) - vOrigin;
  if (local.x < 0 || local.y < 0 || local.x >= vSize || local.y >= vSize) discard;
  vec4 texel = texelFetch(uAtlas, vCell + local, 0);
  if (texel.r < 0.5) discard;
  outColor = vec4(vLight, texel.g * vLight, 0.0, 1.0);
}`,vt=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uPile;
uniform float uTime;
uniform float uLight;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  float height = texelFetch(uPile, ivec2(cell.x, 0), 0).r;
  float row = float(cell.y);
  if (row >= floor(height + 0.5)) discard;
  float below = floor(height + 0.5) - row;
  float crest = below <= 1.0 ? 1.0 : 0.0;
  ivec2 bayerCell = cell & 3;
  int bayerIndex = bayerCell.x + bayerCell.y * 4;
  float bayer[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  float threshold = (bayer[bayerIndex] + 0.5) / 16.0;
  float shade = clamp((below - 1.0) / 9.0, 0.0, 1.0) * 3.0;
  float step3 = floor(shade) + step(threshold, fract(shade));
  float body = 0.94 - step3 * 0.13;
  float glint = below <= 3.0 ? step(0.992, hash(vec2(cell) + floor(uTime * 1.1 + hash(vec2(cell.yx)) * 9.0))) : 0.0;
  float core = crest * 0.6 + glint;
  outColor = vec4(body, core, 0.0, 1.0) * uLight;
}`,gt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 sum = texture(uSource, uv) * 4.0;
  sum += texture(uSource, uv - uTexel);
  sum += texture(uSource, uv + uTexel);
  sum += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  sum += texture(uSource, uv - vec2(uTexel.x, -uTexel.y));
  outColor = sum / 8.0;
}`,pt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec2 h = uTexel * 0.5;
  vec4 sum = texture(uSource, uv + vec2(-h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(0.0, -h.y * 2.0));
  sum += texture(uSource, uv + vec2(0.0, h.y * 2.0));
  sum += texture(uSource, uv + vec2(-h.x, h.y)) * 2.0;
  sum += texture(uSource, uv + h) * 2.0;
  sum += texture(uSource, uv + vec2(h.x, -h.y)) * 2.0;
  sum += texture(uSource, uv - h) * 2.0;
  outColor = (sum / 12.0 + texture(uBase, uv)) * 0.5;
}`,Et=`#version 300 es
precision highp float;
uniform sampler2D uSnow;
uniform sampler2D uGlowMap;
uniform vec2 uResolution;
uniform vec2 uGrid;
uniform float uPixel;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uGlow;
uniform float uFade;
uniform float uOpacity;
uniform float uLightMode;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  ivec2 cell = ivec2(floor(gl_FragCoord.xy / uPixel));
  vec4 snow = texelFetch(uSnow, clamp(cell, ivec2(0), ivec2(uGrid) - 1), 0);
  vec2 glow = texture(uGlowMap, gl_FragCoord.xy / (uGrid * uPixel)).rg;
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  mask *= uOpacity;
  float body = clamp(snow.r * uBrightness, 0.0, 1.0);
  float core = clamp(snow.g * uBrightness, 0.0, 1.0);
  float halo = clamp(glow.r * uGlow * uBrightness, 0.0, 1.0);
  if (uLightMode > 0.5) {
    vec3 tint = mix(uColor, vec3(1.0), clamp(core / max(body, 0.001), 0.0, 1.0) * 0.45);
    float alpha = body * 0.95;
    vec4 color = vec4(tint * alpha, alpha);
    float soft = halo * 0.22 * (1.0 - alpha);
    color += vec4(uColor * soft, soft);
    outColor = color * mask;
  } else {
    vec3 color = uColor * (body * 0.82 + core * 0.18) + uColor * halo * 0.55;
    color = 1.0 - exp(-color * 1.6);
    color *= mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,w=(a,d,x)=>Math.min(x,Math.max(d,a)),Tt=a=>{let d=a>>>0;return()=>{d=d+1831565813>>>0;let x=d;return x=Math.imul(x^x>>>15,x|1),x^=x+Math.imul(x^x>>>7,x|61),((x^x>>>14)>>>0)/4294967296}},Ke=(a,d,x)=>{let T=a.createShader(d);return T?(a.shaderSource(T,x),a.compileShader(T),a.getShaderParameter(T,a.COMPILE_STATUS)?T:(a.deleteShader(T),null)):null},Z=(a,d,x,T)=>{let C=Ke(a,a.VERTEX_SHADER,d),U=Ke(a,a.FRAGMENT_SHADER,x),p=a.createProgram();if(!C||!U||!p)return null;if(a.attachShader(p,C),a.attachShader(p,U),T.forEach((R,A)=>a.bindAttribLocation(p,A,R)),a.linkProgram(p),a.deleteShader(C),a.deleteShader(U),!a.getProgramParameter(p,a.LINK_STATUS))return a.deleteProgram(p),null;let I={},q=a.getProgramParameter(p,a.ACTIVE_UNIFORMS);for(let R=0;R<q;R++){let A=a.getActiveUniform(p,R);A&&(I[A.name]=a.getUniformLocation(p,A.name))}return{program:p,uniforms:I}},Rt=()=>{let a=H*fe,d=H*ue.length,x=new Uint8Array(a*d*4);return ue.forEach((T,C)=>{je[T].forEach((U,p)=>{U.forEach((I,q)=>{for(let R=0;R<I.length;R++){let A=I[R];if(A===".")continue;let $=((C*H+q)*a+p*H+R)*4;x[$]=255,x[$+1]=A==="@"?255:A==="o"?128:0,x[$+3]=255}})})}),{data:x,width:a,height:d}};function _e({color:a="#ffffff",variant:d="snowflake",density:x=.5,speed:T=1,wind:C=.25,sway:U=.5,flakeSize:p=1,pixelSize:I=3,depth:q=.6,brightness:R=1,glow:A=.8,twinkle:$=.35,accumulate:Qe=!1,mouseInteraction:Je=!0,intro:Ze=!0,fade:et=0,opacity:tt=1,lightMode:ot=!1,paused:rt=!1,dpr:it,className:nt="",...at}){let Fe=(0,D.useRef)(null),Le=(0,D.useRef)(null),he=(0,D.useRef)(null),Pe={color:String(a),variant:Math.max(0,ue.indexOf(d)),density:w(x,0,1),speed:T,wind:w(C,-2,2),sway:Math.max(0,U),flakeSize:w(p,0,2),pixelSize:Math.round(w(I,1,12)),depth:w(q,0,1),brightness:Math.max(0,R),glow:Math.max(0,A),twinkle:w($,0,1),accumulate:Qe,mouseInteraction:Je,intro:Ze,fade:w(et,0,1),opacity:w(tt,0,1),lightMode:ot,paused:rt,dpr:it},M=(0,D.useRef)(Pe);return M.current=Pe,(0,D.useEffect)(()=>{let X=Fe.current,F=Le.current,e=F?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!X||!F||!e)return;let v={flake:Z(e,dt,mt,["aCorner","aFlake"]),pile:Z(e,se,vt,["aPosition"]),down:Z(e,se,gt,["aPosition"]),up:Z(e,se,pt,["aPosition"]),composite:Z(e,se,Et,["aPosition"])};if(Object.values(v).some(t=>!t))return;let de=Rt(),me=e.createTexture();e.bindTexture(e.TEXTURE_2D,me),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,de.width,de.height,0,e.RGBA,e.UNSIGNED_BYTE,de.data),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST);let De=e.createBuffer(),ee=e.createVertexArray();e.bindVertexArray(ee),e.bindBuffer(e.ARRAY_BUFFER,De),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Ce=e.createBuffer(),ve=e.createBuffer(),ge=e.createVertexArray();e.bindVertexArray(ge),e.bindBuffer(e.ARRAY_BUFFER,Ce),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,ve),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(1,1),e.bindVertexArray(null);let z=t=>{let o={texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0};return e.bindTexture(e.TEXTURE_2D,o.texture),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),o},pe=(t,o,i)=>{t.width===o&&t.height===i||(t.width=o,t.height=i,e.bindTexture(e.TEXTURE_2D,t.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,o,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},y=z(e.NEAREST),te=e.createTexture();e.bindTexture(e.TEXTURE_2D,te),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let f=new Float32Array(0),oe=0,L=[z(e.LINEAR),z(e.LINEAR),z(e.LINEAR)],G=[z(e.LINEAR),z(e.LINEAR)],N=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),re=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,Ee=new Map,lt=t=>{if(Ee.has(t))return Ee.get(t);let o=[1,1,1];if(N){N.clearRect(0,0,1,1),N.fillStyle="#ffffff",N.fillStyle=t,N.fillRect(0,0,1,1);let[i,l,s]=N.getImageData(0,0,1,1).data;o=[i/255,l/255,s/255]}return Ee.set(t,o),o},b=Tt(4271),O=[],c={width:1,height:1,ratio:1,pixel:1,gridWidth:1,gridHeight:1},m={x:0,y:0,vx:0,vy:0,inside:!1,time:0},g={time:0,intro:M.current.intro&&!re?0:1,push:0},K=new Float32Array(qe*4),B=0,k=0,ie=!0,Ue=(t,o)=>{let i=o.flakeSize-1,l=0,s=ft.map((u,n)=>u*Math.pow(2.2,i*(n-1.5))),h=s.reduce((u,n)=>u+n,0);for(let u=0;u<ce;u++)if(l+=s[u]/h,t<=l)return u;return ce-1},Te=(t,o,i)=>{t.level=Ue(b(),o),t.x=b()*(c.width+40)-20,t.y=i?-10-b()*30:b()*c.height,t.vx=0,t.vy=$e[t.level],t.phase=b()*Math.PI*2,t.rate=.6+b()*.9,t.sparkle=b()*100,t.drift=.7+b()*.6,t.alt=b()<.5,t.reveal=b(),t.levelSize=o.flakeSize},Re=t=>{let o=Math.round(w(c.width*c.height*t.density/1100,0,qe));for(;O.length<o;){let i={};Te(i,t,!1),O.push(i)}O.length>o&&(O.length=o)},st=(t,o)=>{let i=t.speed,l=t.wind*46,s=120,h=g.push>.001&&m.inside,u=24,n=t.accumulate&&i>0&&f.length>0;for(let r of O){r.levelSize!==t.flakeSize&&(r.level=Ue(b(),t),r.levelSize=t.flakeSize);let E=r.level,ne=1-t.depth*(1-(E+1)/ce)*.75,Q=Math.sin(g.time*r.rate+r.phase)*t.sway*(6+E*7),ye=(l*ne+Q)*r.drift,W=$e[E]*ne*i*r.drift,Ve=1-Math.exp(-o*2.2);if(r.vx+=(ye-r.vx)*Ve,r.vy+=(W-r.vy)*Ve,h){let P=r.x-m.x,ae=r.y-m.y,_=Math.hypot(P,ae);if(_<s&&_>.001){let S=1-_/s,Y=S*S*S*g.push*1500*o,We=S*S*g.push*o*5;r.vx+=P/_*Y+m.vx*We,r.vy+=ae/_*Y+m.vy*We}}if(r.x+=r.vx*o,r.y+=r.vy*o,n){let P=Math.floor(r.x/c.pixel);if(P>=0&&P<f.length){let ae=c.height-f[P]*c.pixel;if(r.y>=ae&&f[P]>.5){let _=E;for(let S=-_;S<=_;S++){let Y=P+S;Y>=0&&Y<f.length&&(f[Y]+=(.35+E*.15)*(1-Math.abs(S)/(_+1)))}Te(r,t,!0),r.reveal=-1;continue}}}(i>=0?r.y>c.height+u:r.y<-u)&&(Te(r,t,!0),r.reveal=-1,i<0&&(r.y=c.height+10+b()*30)),r.x<-u?r.x+=c.width+u*2:r.x>c.width+u&&(r.x-=c.width+u*2)}},ct=(t,o)=>{if(!f.length)return;let i=Math.max(4,c.gridHeight*.08);if(t.accumulate&&t.speed>0){let l=(.25+t.density*.9)*o*Math.min(1,t.speed);for(let s=0;s<f.length;s++){let h=.55+.45*Math.sin(s*.045+Math.sin(s*.013)*2.1)*Math.sin(s*.021+1.3);f[s]<i*h&&(f[s]+=l*(.6+.8*h))}}for(let l=0;l<2;l++){let s=l===0;for(let h=0;h<f.length-1;h++){let u=s?h:f.length-2-h,n=f[u]-f[u+1];if(Math.abs(n)>1.2){let r=(Math.abs(n)-1.2)*.5*Math.sign(n);f[u]-=r,f[u+1]+=r}}}for(let l=0;l<f.length;l++){let s=Math.max(0,f[l]-i),h=t.accumulate&&t.speed>0?s*.8:2+f[l]*.6;f[l]=Math.max(0,f[l]-h*o)}},be=(t,o,i,l)=>{e.bindFramebuffer(e.FRAMEBUFFER,o?o.framebuffer:null),e.viewport(0,0,i,l),e.useProgram(t.program),e.drawArrays(e.TRIANGLES,0,3)},j=(t,o,i,l)=>{e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,l),e.uniform1i(t.uniforms[o],i)},we=()=>{let t=M.current;pe(y,c.gridWidth,c.gridHeight);let o=0,i=je[ue[t.variant]].map(n=>n.length),l=g.intro*1.75;for(let n of O){let r=n.level,E=1-t.depth*(1-xt[r]),ne=Math.pow(Math.max(0,Math.sin(g.time*.9+n.sparkle)),60)*t.twinkle,Q=n.reveal<0||g.intro>=1?1:w((l-n.y/c.height-n.reveal*.25)/.35,0,1);if(Q<=0)continue;let ye=r>=2&&n.alt?r+3:r,W=o*4;K[W]=n.x/c.pixel,K[W+1]=n.y/c.pixel,K[W+2]=t.variant*fe+ye,K[W+3]=Math.min(1,E*(.85+ne*.6))*Q*Q,o++}if(e.bindFramebuffer(e.FRAMEBUFFER,y.framebuffer),e.viewport(0,0,y.width,y.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),f.length&&f.some(n=>n>.4)){e.bindTexture(e.TEXTURE_2D,te),oe!==f.length?(oe=f.length,e.texImage2D(e.TEXTURE_2D,0,e.R32F,oe,1,0,e.RED,e.FLOAT,f)):e.texSubImage2D(e.TEXTURE_2D,0,0,0,oe,1,e.RED,e.FLOAT,f);let n=v.pile;e.useProgram(n.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,te),e.uniform1i(n.uniforms.uPile,0),e.uniform1f(n.uniforms.uTime,g.time),e.uniform1f(n.uniforms.uLight,1-t.depth*.1),e.bindVertexArray(ee),e.drawArrays(e.TRIANGLES,0,3)}if(o>0){let n=v.flake;e.useProgram(n.program),e.uniform2f(n.uniforms.uGrid,y.width,y.height),e.uniform4f(n.uniforms.uSizes,i[1],i[2],i[3],0),e.uniform1f(n.uniforms.uLargest,i[4]),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,me),e.uniform1i(n.uniforms.uAtlas,0),e.enable(e.BLEND),e.blendEquation(e.MAX),e.bindVertexArray(ge),e.bindBuffer(e.ARRAY_BUFFER,ve),e.bufferData(e.ARRAY_BUFFER,K.subarray(0,o*4),e.DYNAMIC_DRAW),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,o),e.blendEquation(e.FUNC_ADD),e.disable(e.BLEND)}e.bindVertexArray(ee);let s=y;for(let n=0;n<L.length;n++){let r=L[n];pe(r,Math.max(1,Math.ceil(s.width/2)),Math.max(1,Math.ceil(s.height/2))),e.useProgram(v.down.program),e.uniform2f(v.down.uniforms.uTexel,1/s.width,1/s.height),e.uniform2f(v.down.uniforms.uTarget,r.width,r.height),j(v.down,"uSource",0,s.texture),be(v.down,r,r.width,r.height),s=r}for(let n=G.length-1;n>=0;n--){let r=n===G.length-1?L[L.length-1]:G[n+1],E=G[n];pe(E,L[n].width,L[n].height),e.useProgram(v.up.program),e.uniform2f(v.up.uniforms.uTexel,1/r.width,1/r.height),e.uniform2f(v.up.uniforms.uTarget,E.width,E.height),j(v.up,"uSource",0,r.texture),j(v.up,"uBase",1,L[n].texture),be(v.up,E,E.width,E.height)}let h=v.composite,u=h.uniforms;e.useProgram(h.program),e.uniform2f(u.uResolution,F.width,F.height),e.uniform2f(u.uGrid,y.width,y.height),e.uniform1f(u.uPixel,c.pixel*c.ratio),e.uniform3fv(u.uColor,lt(t.color)),e.uniform1f(u.uBrightness,t.brightness),e.uniform1f(u.uGlow,t.glow),e.uniform1f(u.uFade,t.fade),e.uniform1f(u.uOpacity,t.opacity),e.uniform1f(u.uLightMode,t.lightMode?1:0),j(h,"uSnow",0,y.texture),j(h,"uGlowMap",1,G[0].texture),be(h,null,F.width,F.height)},Ie=t=>{if(B=0,!ie||document.hidden)return;let o=M.current,i=k?Math.min(.05,(t-k)/1e3):1/60;k=t;let l=!o.paused&&!re;!o.intro||re?g.intro=1:g.intro<1&&(g.intro=Math.min(1,g.intro+i/ht));let s=o.mouseInteraction&&m.inside&&!re?1:0;g.push+=(s-g.push)*(1-Math.exp(-i*(s?6:3))),m.vx*=Math.exp(-i*6),m.vy*=Math.exp(-i*6),Re(o),l&&(g.time+=i,st(o,i),ct(o,i)),we(),l||Math.abs(s-g.push)>.001?B=requestAnimationFrame(Ie):k=0},V=()=>{!B&&ie&&!document.hidden&&(B=requestAnimationFrame(Ie))},Ae=()=>{let t=M.current,o=Math.max(1,X.clientWidth),i=Math.max(1,X.clientHeight),l=Math.min(t.dpr||window.devicePixelRatio||1,2);c.width=o,c.height=i,c.ratio=l,c.pixel=Math.max(1,Math.round(t.pixelSize*l))/l,F.width=Math.max(1,Math.round(o*l)),F.height=Math.max(1,Math.round(i*l)),c.gridWidth=Math.max(1,Math.ceil(o/c.pixel)),c.gridHeight=Math.max(1,Math.ceil(i/c.pixel)),f.length!==c.gridWidth&&(f=new Float32Array(c.gridWidth)),Re(t),B||we(),V()},Be=t=>{let o=X.getBoundingClientRect(),i=t.clientX-o.left,l=t.clientY-o.top,s=performance.now();if(m.inside&&m.time){let h=Math.max(1,s-m.time)/1e3;m.vx=w((i-m.x)/h,-3e3,3e3),m.vy=w((l-m.y)/h,-3e3,3e3)}m.x=i,m.y=l,m.time=s,m.inside=i>=0&&l>=0&&i<=o.width&&l<=o.height,V()},Xe=()=>{m.inside=!1,V()},ze=()=>{k=0,V()},Ge=new ResizeObserver(Ae);Ge.observe(X);let Ne=new IntersectionObserver(t=>{ie=t.some(o=>o.isIntersecting),ie&&(k=0,V())});Ne.observe(X),window.addEventListener("pointermove",Be,{passive:!0}),document.documentElement.addEventListener("pointerleave",Xe),document.addEventListener("visibilitychange",ze),Ae();let Oe=M.current.pixelSize,ke=M.current.dpr;return he.current=()=>{let t=M.current;if(t.pixelSize!==Oe||t.dpr!==ke){Oe=t.pixelSize,ke=t.dpr,Ae();return}Re(t),B||we(),V()},()=>{cancelAnimationFrame(B),he.current=null,Ge.disconnect(),Ne.disconnect(),window.removeEventListener("pointermove",Be),document.documentElement.removeEventListener("pointerleave",Xe),document.removeEventListener("visibilitychange",ze);for(let t of[y,...L,...G])e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer);for(let t of Object.values(v))e.deleteProgram(t.program);e.deleteTexture(me),e.deleteTexture(te),e.deleteBuffer(De),e.deleteBuffer(Ce),e.deleteBuffer(ve),e.deleteVertexArray(ee),e.deleteVertexArray(ge),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,D.useEffect)(()=>{he.current?.()}),(0,Se.jsx)("div",{ref:Fe,className:["relative h-full w-full overflow-hidden",nt].filter(Boolean).join(" "),...at,children:(0,Se.jsx)("canvas",{ref:Le,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})}var Me=J(le(),1),bt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],xe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ft=bt.map((a,d)=>({id:d+1,image:a,src:a,img:a,url:a,title:xe[d],text:xe[d],label:xe[d],alt:xe[d],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][d],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function wt({big:a}){return(0,Me.jsx)(He,{big:a,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Me.jsx)(_e,{})})}var Lt=Ye(wt);export{Lt as default};
