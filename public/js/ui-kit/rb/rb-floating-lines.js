import{c as _,i as dt,j as U,l as _e,m as Ie}from"./chunks/chunk-6IYH4WPJ.js";var M=_(dt(),1),oe=_(U(),1),R=24,mt=8,q=3,pt=1.8,X=["top","middle","bottom"],ht={top:{x:10,y:.5,rotate:-.4},middle:{x:5,y:0,rotate:.2},bottom:{x:2,y:-.7,rotate:-1}},gt={top:{offset:1,step:.2,light:.2,flip:1,depth:1,drift:.6},middle:{offset:2,step:.15,light:1,flip:0,depth:0,drift:1},bottom:{offset:1.5,step:.2,light:.32,flip:0,depth:.6,drift:1.4}},vt=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,xt=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uRatio;
uniform vec4 uWave[3];
uniform vec4 uShape[3];
uniform vec4 uParallax[3];
uniform int uCount[3];
uniform vec4 uLine[${R*3}];
uniform vec3 uLineColor[${R*3}];
uniform vec2 uMouseWarp[3];
uniform float uHaloReach;
uniform float uWidth;
uniform float uGlow;
uniform float uBrightness;
uniform float uFocus;
uniform float uEdgeFade;
uniform vec4 uMouse;
uniform float uBendRadius;
uniform float uBendStrength;
uniform vec4 uClicks[${q}];
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBackground;
uniform float uOpacity;
uniform float uStyle;
uniform float uSpacing;
out vec4 outColor;

vec3 toSrgb(vec3 c) {
  return pow(max(c, 0.0), vec3(1.0 / 2.2));
}

vec3 inkOf(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color * min(1.0, 0.16 / max(luma, 0.001));
}

vec2 warp(vec2 p, float rotate, float flip) {
  float angle = rotate * log(length(p) + 1.0);
  vec2 r = p * mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
  if (flip > 0.5) r.x = -r.x;
  return r;
}

void main() {
  vec2 screen = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  screen.y = -screen.y;
  for (int k = 0; k < ${q}; k++) {
    vec4 click = uClicks[k];
    if (click.w == 0.0) continue;
    float age = click.z;
    float turn = 1.9 * smoothstep(0.0, 0.23, age) * exp(-max(age - 0.23, 0.0) * 1.1) * click.w;
    float spread = 0.3 * (1.0 + age * 0.55);
    vec2 offset = screen - click.xy;
    float angle = turn * exp(-dot(offset, offset) / (spread * spread));
    screen = click.xy + mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * offset;
  }
  vec3 light = vec3(0.0);
  vec3 bloom = vec3(0.0);
  vec3 inkColor = vec3(0.0);
  float inkAlpha = 0.0;
  float aa = 0.75 * uRatio;
  float invSigma = 1.0 / max(uBendRadius * uBendRadius, 1e-4);
  float tight = 1.0 / (2.6 * uRatio);
  float wide = 1.0 / (11.0 * uRatio);

  for (int w = 0; w < 3; w++) {
    int count = uCount[w];
    if (count <= 0) continue;
    vec4 wave = uWave[w];
    vec4 shape = uShape[w];
    vec2 r = warp(screen + uParallax[w].xy, wave.z, shape.w);
    vec2 rm = uMouseWarp[w];
    float blur = uFocus * uParallax[w].z;
    float width = uWidth * (1.0 + blur * 2.5);
    float soft = aa * (1.0 + blur * 7.0);
    float energy = (uWidth + aa) / (width + soft) * shape.z;
    float cut = uHaloReach + width * 2.0 + soft;
    float sx = sin(r.x);
    float cx = cos(r.x);
    float along = r.x - rm.x;
    float pull = uMouse.z * exp(-along * along * invSigma);
    float level = r.y + wave.y;
    int first = w * ${R};

    for (int i = 0; i < ${R}; i++) {
      if (i >= count) break;
      vec4 line = uLine[first + i];
      float y = (sx * line.x + cx * line.y) * line.z;
      float near = 0.0;
      if (pull > 0.002) {
        float across = (y - wave.y) - rm.y;
        near = exp(-across * across * invSigma) * pull;
        float push = uBendStrength * near;
        y += across * (uBendStrength < 0.0 ? min(-push, 2.5) : -min(push, 0.9));
      }
      float m = level - y;
      float slope = length(vec2(dFdx(m), dFdy(m)));
      float d = abs(m) / max(slope, 1e-5);
      if (d < cut) {
        float gap = d;
        float size = width;
        if (uStyle > 0.5) {
          float period = uSpacing / (uResolution.y * 0.5);
          float cell = (fract((r.x + line.w) / period + float(i) * 0.37) - 0.5) * uSpacing;
          float span = uStyle > 1.5 ? max(uSpacing * 0.32 - width, 0.0) : 0.0;
          gap = length(vec2(max(abs(cell) - span, 0.0), d));
          size = uStyle > 1.5 ? width : width * 1.6;
        }
        float core = smoothstep(size + soft, size - soft, gap);
        float fall = 1.0 - d / cut;
        float halo = (exp(-gap * tight) * 0.3 + exp(-d * wide) * 0.02 * fall * fall) * uGlow;
        vec3 color = uLineColor[first + i];
        float lift = 1.0 + near * 0.8;
        light += color * core * energy * lift;
        bloom += color * halo * shape.z * lift;
        float a = clamp(clamp(core * energy * 1.15 + halo * shape.z * 0.12, 0.0, 1.0) * lift, 0.0, 1.0);
        inkColor = inkOf(color) * a + inkColor * (1.0 - a);
        inkAlpha = a + inkAlpha * (1.0 - a);
      }
    }
  }

  float edge = 1.0;
  if (uEdgeFade > 0.0) {
    float u = gl_FragCoord.x / uResolution.x;
    float fade = uEdgeFade * 0.45;
    float left = smoothstep(0.0, fade, u);
    float right = smoothstep(0.0, fade, 1.0 - u);
    edge = left * left * (3.0 - 2.0 * left) * right * right * (3.0 - 2.0 * right);
  }

  if (uLight > 0.5) {
    float alpha = inkAlpha * edge * uOpacity;
    vec3 ink = toSrgb(inkColor / max(inkAlpha, 1e-4));
    if (uOpaque > 0.5) {
      outColor = vec4(mix(uBackground, ink, alpha), 1.0);
    } else {
      outColor = vec4(ink * alpha, alpha);
    }
    return;
  }

  vec3 capped = 0.28 * (1.0 - exp(-bloom / 0.28));
  vec3 glow = toSrgb(1.0 - exp(-(light + capped) * uBrightness * 1.2)) * edge * uOpacity;
  if (uOpaque > 0.5) {
    outColor = vec4(uBackground + glow * (1.0 - uBackground), 1.0);
  } else {
    outColor = vec4(glow, max(glow.r, max(glow.g, glow.b)));
  }
}`,k=(e,s,h)=>Math.min(h,Math.max(s,e)),wt=(e,s,h,a)=>{let w=h*Math.log(Math.hypot(e,s)+1),F=Math.cos(w),y=Math.sin(w),b=e*F+s*y;return[a>.5?-b:b,s*F-e*y]},ze=(e,s,h)=>{let a=e.createShader(s);return a?(e.shaderSource(a,h),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:(e.deleteShader(a),null)):null},yt=e=>{let s=ze(e,e.VERTEX_SHADER,vt),h=ze(e,e.FRAGMENT_SHADER,xt),a=e.createProgram();if(!s||!h||!a)return null;if(e.attachShader(a,s),e.attachShader(a,h),e.bindAttribLocation(a,0,"aPosition"),e.linkProgram(a),e.deleteShader(s),e.deleteShader(h),!e.getProgramParameter(a,e.LINK_STATUS))return e.deleteProgram(a),null;let w={},F=e.getProgramParameter(a,e.ACTIVE_UNIFORMS);for(let y=0;y<F;y++){let b=e.getActiveUniform(a,y);b&&(w[b.name.replace("[0]","")]=e.getUniformLocation(a,b.name))}return{program:a,uniforms:w}},Ve=(e,s,h,a)=>{if(typeof e=="number")return e;if(!Array.isArray(e)||e.length===0)return a;let w=s.indexOf(h);return e[w]??e[e.length-1]??a},bt=({linesGradient:e=["#e945f5","#ffffff"],enabledWaves:s=["top","middle","bottom"],lineCount:h=10,lineDistance:a=6,topWavePosition:w,middleWavePosition:F,bottomWavePosition:y,animationSpeed:b=1,amplitude:Ue=1,lineWidth:Xe=1,lineStyle:ae="solid",glow:qe=1,brightness:Ge=1,depthOfField:He=.5,edgeFade:$e=0,interactive:Ye=!0,bendRadius:Ke=5,bendStrength:Je=-.5,mouseDamping:Qe=.05,parallax:Ze=!0,parallaxStrength:je=.2,clickSwirl:et=!0,intro:tt=!0,mixBlendMode:ot="screen",backgroundColor:re,lightMode:ie=!1,opacity:nt=1,dpr:at,className:rt="",style:it,...st})=>{let se=(0,M.useRef)(null),le=(0,M.useRef)(null),H=(0,M.useRef)(null),$=Array.isArray(s)?s.filter(m=>X.includes(m)):X,ce={stops:Array.isArray(e)&&e.length?e.slice(0,mt):["#ffffff"],waves:X.map(m=>{let g=$.includes(m),t={...ht[m],...m==="top"?w:m==="middle"?F:y};return{count:g?k(Math.round(Ve(h,$,m,10)),0,R):0,distance:Ve(a,$,m,6)*.01,position:t}}),animationSpeed:Math.max(0,b),amplitude:Math.max(0,Ue),lineWidth:Math.max(.1,Xe),style:ae==="dashed"?2:ae==="dotted"?1:0,glow:Math.max(0,qe),brightness:Math.max(0,Ge),depthOfField:k(He,0,1),edgeFade:k($e,0,1),interactive:Ye,bendRadius:Math.max(.1,Ke),bendStrength:Je,mouseDamping:k(Qe,0,1),parallax:Ze,parallaxStrength:Math.max(0,je),clickSwirl:et,intro:tt,backgroundColor:re,lightMode:ie,opacity:k(nt,0,1),dpr:at},S=(0,M.useRef)(ce);return S.current=ce,(0,M.useEffect)(()=>{let m=se.current,g=le.current,t=g?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!m||!g||!t)return;let I=yt(t);if(!I)return;let r=I.uniforms,fe=t.createBuffer(),Y=t.createVertexArray();t.bindVertexArray(Y),t.bindBuffer(t.ARRAY_BUFFER,fe),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);let C=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),K=new Map,ue=(o,n)=>{if(!o)return n;let i=String(o);if(K.has(i))return K.get(i);let u=n;if(C){C.clearRect(0,0,1,1),C.fillStyle="#000000",C.fillStyle=i,C.fillRect(0,0,1,1);let[p,d,W]=C.getImageData(0,0,1,1).data;u=[p/255,d/255,W/255]}return K.set(i,u),u},L=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,l={x:0,y:0,nx:0,ny:0,vx:0,inside:!1},c={x:0,y:0,influence:0,px:0,py:0},A=[],de=new Float32Array(12),me=new Float32Array(12),pe=new Float32Array(12),he=new Int32Array(3),ge=new Float32Array(R*3*4),ve=new Float32Array(R*3*3),xe=new Float32Array(6),J=new Float32Array(q*4),Q=0,E=S.current.intro&&!L?0:1,P=0,T=0,z=!0,Z=()=>{let o=S.current,n=g.width,i=g.height,u=E*E*(3-2*E),p=n/Math.max(1,m.clientWidth),d=o.stops.map(f=>ue(f,[1,1,1]).map(v=>Math.pow(v,2.2))),W=(2*c.x-n)/i,ee=-(2*c.y-i)/i;o.waves.forEach((f,v)=>{let x=gt[X[v]],{x:Fe,y:lt,rotate:Ce}=f.position,Le=c.px*x.drift,Pe=-c.py*x.drift;de.set([Fe,lt,Ce,0],v*4),me.set([x.offset,x.step,x.light,x.flip],v*4),pe.set([Le,Pe,x.depth,0],v*4),xe.set(wt(W+Le,ee+Pe,Ce,x.flip),v*2),he[v]=f.count;for(let D=0;D<f.count;D++){let Be=x.offset+x.step*D,De=f.distance*D+Fe,Oe=De+Be+Q*.1,ct=Math.sin(Be+Q*.2)*.3*o.amplitude*u,Te=v*R+D;ge.set([Math.cos(Oe),Math.sin(Oe),ct,De],Te*4);let We=(f.count>1?D/(f.count-1):0)*Math.max(d.length-1,0),N=Math.min(Math.floor(We),Math.max(d.length-2,0)),ft=Math.min(N+1,d.length-1),te=k(We-N,0,1),ut=te*te*(3-2*te);for(let O=0;O<3;O++)ve[Te*3+O]=d[N][O]+(d[ft][O]-d[N][O])*ut}}),J.fill(0),A.forEach((f,v)=>J.set([f.x,f.y,f.age,f.spin],v*4)),t.viewport(0,0,n,i),t.useProgram(I.program),t.bindVertexArray(Y),t.uniform2f(r.uResolution,n,i),t.uniform1f(r.uRatio,p),t.uniform4fv(r.uWave,de),t.uniform4fv(r.uShape,me),t.uniform4fv(r.uParallax,pe),t.uniform1iv(r.uCount,he),t.uniform4fv(r.uLine,ge),t.uniform3fv(r.uLineColor,ve),t.uniform2fv(r.uMouseWarp,xe),t.uniform1f(r.uHaloReach,11*p*Math.log(160*o.glow+1)),t.uniform1f(r.uWidth,o.lineWidth*.5*p),t.uniform1f(r.uGlow,o.glow),t.uniform1f(r.uBrightness,o.brightness*u),t.uniform1f(r.uFocus,o.depthOfField),t.uniform1f(r.uEdgeFade,o.edgeFade),t.uniform4f(r.uMouse,c.x,c.y,c.influence,0),t.uniform1f(r.uBendRadius,o.bendRadius*.09),t.uniform1f(r.uBendStrength,o.bendStrength*2.5),t.uniform4fv(r.uClicks,J),t.uniform1f(r.uLight,o.lightMode?1:0),t.uniform1f(r.uOpaque,o.backgroundColor?1:0),t.uniform3fv(r.uBackground,ue(o.backgroundColor,o.lightMode?[1,1,1]:[0,0,0])),t.uniform1f(r.uOpacity,o.opacity*u),t.uniform1f(r.uStyle,o.style),t.uniform1f(r.uSpacing,(o.style===2?22:9)*p),t.drawArrays(t.TRIANGLES,0,3)},we=o=>{if(P=0,!z||document.hidden)return;let n=S.current,i=T?k((o-T)/1e3,5e-4,.05):1/60;T=o;let u=L?0:1;Q+=i*n.animationSpeed*u,n.intro&&!L&&E<1?E=Math.min(1,E+i/pt):(!n.intro||L)&&(E=1);let p=1-Math.pow(1-n.mouseDamping,i*60),d=n.interactive&&l.inside&&!L;d&&(c.x+=(l.x-c.x)*p,c.y+=(l.y-c.y)*p),c.influence+=((d?1:0)-c.influence)*p;let W=n.parallax&&d?l.nx*n.parallaxStrength:0,ee=n.parallax&&d?l.ny*n.parallaxStrength:0;c.px+=(W-c.px)*p,c.py+=(ee-c.py)*p;for(let f=A.length-1;f>=0;f--)A[f].age+=i,A[f].age>4&&A.splice(f,1);Z(),P=requestAnimationFrame(we)},B=()=>{!P&&z&&!document.hidden&&(P=requestAnimationFrame(we))},j=()=>{let o=S.current,n=Math.max(1,m.clientWidth),i=Math.max(1,m.clientHeight),u=Math.min(o.dpr||window.devicePixelRatio||1,2);g.width=Math.max(1,Math.round(n*u)),g.height=Math.max(1,Math.round(i*u)),Z(),B()},ye=o=>{let n=m.getBoundingClientRect(),i=o.clientX-n.left,u=o.clientY-n.top,p=g.width/Math.max(1,n.width);l.inside=i>=0&&u>=0&&i<=n.width&&u<=n.height;let d=i*p;Math.abs(d-l.x)>.5&&(l.vx=d-l.x),l.x=d,l.y=(n.height-u)*p,l.nx=i/Math.max(1,n.width)-.5,l.ny=.5-u/Math.max(1,n.height)},be=o=>{let n=l.inside;ye(o),l.inside&&!n&&c.influence<.05&&(c.x=l.x,c.y=l.y),B()},Se=o=>{if(ye(o),!l.inside||!S.current.clickSwirl||L)return;let n=(2*l.x-g.width)/g.height,i=-(2*l.y-g.height)/g.height;A.unshift({x:n,y:i,age:0,spin:l.vx<0?-1:1}),A.length>q&&A.pop(),B()},V=o=>{o.pointerType!=="mouse"&&(l.inside=!1)},Ae=()=>{l.inside=!1},Me=()=>{T=0,B()},Re=new ResizeObserver(j);Re.observe(m);let Ee=new IntersectionObserver(o=>{z=o.some(n=>n.isIntersecting),z&&(T=0,B())});Ee.observe(m),window.addEventListener("pointermove",be,{passive:!0}),window.addEventListener("pointerdown",Se,{passive:!0}),window.addEventListener("pointerup",V,{passive:!0}),window.addEventListener("pointercancel",V,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ae),document.addEventListener("visibilitychange",Me),j();let ke=S.current.dpr;return H.current=()=>{let o=S.current;if(o.dpr!==ke){ke=o.dpr,j();return}P||Z(),B()},()=>{cancelAnimationFrame(P),H.current=null,Re.disconnect(),Ee.disconnect(),window.removeEventListener("pointermove",be),window.removeEventListener("pointerdown",Se),window.removeEventListener("pointerup",V),window.removeEventListener("pointercancel",V),document.documentElement.removeEventListener("pointerleave",Ae),document.removeEventListener("visibilitychange",Me),t.deleteProgram(I.program),t.deleteBuffer(fe),t.deleteVertexArray(Y),t.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,M.useEffect)(()=>{H.current?.()}),(0,oe.jsx)("div",{ref:se,className:["relative h-full w-full overflow-hidden",rt].filter(Boolean).join(" "),style:{...it,mixBlendMode:ie||re?"normal":ot},...st,children:(0,oe.jsx)("canvas",{ref:le,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Ne=bt;var ne=_(U(),1),St=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],G=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Lt=St.map((e,s)=>({id:s+1,image:e,src:e,img:e,url:e,title:G[s],text:G[s],label:G[s],alt:G[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function At({big:e}){return(0,ne.jsx)(Ie,{big:e,dark:!0,center:!1,zoom:1,drive:!1,children:(0,ne.jsx)(Ne,{})})}var Pt=_e(At);export{Pt as default};
