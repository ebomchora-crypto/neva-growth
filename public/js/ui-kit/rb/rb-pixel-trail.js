import{c as M,i as De,j as X,l as ue,m as me}from"./chunks/chunk-6IYH4WPJ.js";var b=M(De(),1),H=M(X(),1),E=512,I=256,Le={square:0,circle:1,diamond:2},ze={fade:0,shrink:1,dither:2},de=l=>l,Ge=`#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,Xe=`#version 300 es
precision highp float;
uniform sampler2D u_trail;
uniform sampler2D u_image;
uniform sampler2D u_age;
uniform vec2 u_resolution;
uniform float u_gridSize;
uniform float u_sigma;
uniform vec3 u_color;
uniform vec3 u_trailColor;
uniform float u_ramp;
uniform float u_shine;
uniform float u_glow;
uniform int u_shape;
uniform int u_decay;
uniform float u_gap;
uniform float u_sparkle;
uniform float u_time;
uniform float u_hasImage;
out vec4 outColor;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
const vec3 LIGHT = vec3(-0.42, 0.58, 0.7);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float erfApprox(float x) {
  float s = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}

float cellValue(ivec2 c) {
  vec2 center = (vec2(c) + 0.5) / u_gridSize;
  if (center.x < 0.0 || center.y < 0.0 || center.x > 1.0 || center.y > 1.0) return 0.0;
  float t = texelFetch(u_trail, clamp(ivec2(center * 512.0), ivec2(0), ivec2(511)), 0).r;
  if (t <= 0.0) return 0.0;
  if (u_sparkle > 0.0) {
    float n = hash(vec2(c) + floor(u_time * 14.0) * 7.31);
    float dim = 1.0 - t;
    if (n < u_sparkle * dim * 0.35) t = max(t, 0.85);
    else if (n > 1.0 - u_sparkle * dim * 0.5) t = 0.0;
  }
  if (u_decay == 2 && t * 2.2 <= (BAYER[(c.y & 3) * 4 + (c.x & 3)] + 0.5) / 16.0) return 0.0;
  return t;
}

vec3 baseColor(ivec2 owner, vec2 uv) {
  if (u_hasImage > 0.5) return texelFetch(u_image, clamp(owner, ivec2(0), ivec2(textureSize(u_image, 0)) - 1), 0).rgb;
  if (u_ramp > 0.5) return mix(u_trailColor, u_color, smoothstep(0.05, 0.95, texture(u_age, uv).r));
  return u_color;
}

vec3 tone(vec3 base, float strength) {
  vec3 body = mix(base * 0.55, base, smoothstep(0.3, 0.75, strength));
  return mix(body, mix(base, vec3(1.0), 0.22), smoothstep(0.85, 1.0, strength) * u_shine);
}

float seams(vec2 q, float cs) {
  if (u_gap <= 0.0) return 0.0;
  vec2 f = fract(q / cs);
  float border = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * cs;
  float width = max(1.0, u_gap * cs * 0.5);
  return 1.0 - smoothstep(width - 0.75, width + 0.75, border);
}

vec3 shade(vec3 base, vec3 n) {
  vec3 l = normalize(LIGHT);
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float lit = dot(n, l) - l.z;
  vec3 color = base * (1.0 + lit * 0.9 * u_shine);
  float spec = pow(max(dot(n, h), 0.0), 64.0) * 0.85 + pow(max(dot(n, h), 0.0), 10.0) * 0.08;
  color += spec * u_shine * mix(vec3(1.0), base, 0.15) * step(0.001, 1.0 - n.z);
  return clamp(color, 0.0, 1.0);
}

void main() {
  float maxRes = max(u_resolution.x, u_resolution.y);
  vec2 q = gl_FragCoord.xy - 0.5 * u_resolution + 0.5 * maxRes;
  vec2 uv = q / maxRes;
  float cs = maxRes / u_gridSize;
  ivec2 base = ivec2(floor(q / cs));

  float alpha = 0.0;
  vec3 color = vec3(0.0);

  if (u_sigma > 0.0) {
    float inv = 0.70710678 / u_sigma;
    float norm = 0.39894228 / u_sigma;
    float spread = 0.5 / (u_sigma * u_sigma);
    int reach = int(clamp(ceil(3.0 * u_sigma / cs), 1.0, 3.0));
    float field = 0.0;
    vec2 grad = vec2(0.0);
    float best = -1.0;
    ivec2 owner = base;
    float wx[7];
    float gx[7];
    float wy[7];
    float gy[7];
    for (int i = 0; i < 7; i++) {
      int offset = i - 3;
      if (abs(offset) > reach) continue;
      vec2 lo = vec2(base + ivec2(offset)) * cs - q;
      vec2 hi = lo + cs;
      wx[i] = 0.5 * (erfApprox(hi.x * inv) - erfApprox(lo.x * inv));
      wy[i] = 0.5 * (erfApprox(hi.y * inv) - erfApprox(lo.y * inv));
      gx[i] = norm * (exp(-lo.x * lo.x * spread) - exp(-hi.x * hi.x * spread));
      gy[i] = norm * (exp(-lo.y * lo.y * spread) - exp(-hi.y * hi.y * spread));
    }
    for (int j = 0; j < 7; j++) {
      if (abs(j - 3) > reach) continue;
      for (int i = 0; i < 7; i++) {
        if (abs(i - 3) > reach) continue;
        ivec2 c = base + ivec2(i - 3, j - 3);
        float t = cellValue(c);
        if (t <= 0.0) continue;
        float weight = t * wx[i] * wy[j];
        field += weight;
        grad += t * vec2(gx[i] * wy[j], wx[i] * gy[j]);
        if (weight > best) {
          best = weight;
          owner = c;
        }
      }
    }
    float edge = max(0.0263, length(grad) * 0.6);
    alpha = smoothstep(0.5 - edge, 0.5 + edge, field);
    if (alpha > 0.0) {
      vec3 n = normalize(vec3(-grad * cs * 0.55, 1.0));
      float strength = max(cellValue(base), field);
      vec3 body = tone(baseColor(owner, uv), strength);
      body *= 1.0 - seams(q, cs) * 0.32;
      color = shade(body, n);
    }
  } else {
    float t = cellValue(base);
    if (t > 0.0) {
      float halfSize = 0.5 * (1.0 - u_gap);
      float fade = t;
      if (u_decay == 1) {
        halfSize *= sqrt(clamp(t * 2.5, 0.0, 1.0));
        fade = 1.0;
      } else if (u_decay == 2) {
        fade = 1.0;
      }
      vec2 local = fract(q / cs) - 0.5;
      float d;
      vec2 dir;
      if (u_shape == 1) {
        d = length(local) - halfSize;
        dir = normalize(local + 1e-5);
      } else if (u_shape == 2) {
        d = (abs(local.x) + abs(local.y) - halfSize * 1.2) * 0.7071;
        dir = sign(local) * 0.7071;
      } else {
        vec2 a = abs(local) - halfSize;
        d = max(a.x, a.y);
        dir = a.x > a.y ? vec2(sign(local.x), 0.0) : vec2(0.0, sign(local.y));
      }
      float px = 1.0 / cs;
      float coverage = clamp(0.5 - d / px, 0.0, 1.0);
      alpha = coverage * fade;
      if (alpha > 0.0) {
        float bevel = smoothstep(-0.16 * (1.0 - u_gap), 0.0, d);
        vec3 n = normalize(vec3(dir * bevel * 0.9, 1.0));
        color = shade(tone(baseColor(base, uv), t), n);
      }
    }
  }

  vec4 pixel = vec4(color * alpha, alpha);
  if (u_glow > 0.0) {
    float glow = texture(u_trail, uv).r;
    float amount = smoothstep(0.0, 0.7, glow) * u_glow * 0.55 * (1.0 - alpha);
    vec3 tint = u_hasImage > 0.5 ? texture(u_image, uv).rgb : (u_ramp > 0.5 ? mix(u_trailColor, u_color, 0.5) : u_color);
    pixel += vec4(tint * amount, amount);
  }
  if (pixel.a <= 0.002) discard;
  outColor = pixel;
}
`,he=(()=>{let l=null;return(d,R)=>{if(typeof document>"u")return R;if(!l){let A=document.createElement("canvas");A.width=1,A.height=1,l=A.getContext("2d",{willReadFrequently:!0})}if(!l)return R;l.clearRect(0,0,1,1),l.fillStyle="#000",l.fillStyle=d,l.fillRect(0,0,1,1);let[g,F,C]=l.getImageData(0,0,1,1).data;return[g/255,F/255,C/255]}})(),ge=(l,d,R)=>{let g=l.createShader(d);return g?(l.shaderSource(g,R),l.compileShader(g),l.getShaderParameter(g,l.COMPILE_STATUS)?g:(l.deleteShader(g),null)):null};function $({gridSize:l=40,trailSize:d=.1,maxAge:R=250,interpolate:g=5,easingFunction:F=de,gooeyFilter:C={strength:2},color:A="#ffffff",trailColor:j,shape:xe="square",gap:ve=.08,decay:pe="fade",flow:_e=0,gravity:Ee=0,sparkle:Te=0,clickBurst:be=!1,shine:we=.6,glow:Re=.4,imageSrc:k,dpr:ye,className:Ae="",style:Se}){let K=(0,b.useRef)(null),Z=(0,b.useRef)(null),y=(0,b.useRef)(null),T=(0,b.useRef)(null);return T.current={gridSize:Math.max(1,l),trailSize:Math.max(0,d),maxAge:Math.max(1,R),interpolate:g,ease:F||de,goo:C?Math.max(0,C.strength??2):0,color:he(A,[1,1,1]),trailColor:j?he(j,[1,1,1]):null,shape:Le[xe]??0,gap:Math.min(Math.max(ve,0),.9),decay:ze[pe]??0,flow:Math.min(Math.max(_e,0),1),gravity:Math.min(Math.max(Ee,-1),1),sparkle:Math.min(Math.max(Te,0),1),clickBurst:be,shine:Math.min(Math.max(we,0),1),glow:Math.min(Math.max(Re,0),1),dpr:ye},(0,b.useEffect)(()=>{let x=K.current,u=Z.current;if(!x||!u)return;let e=u.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,powerPreference:"high-performance"});if(!e)return;let O=ge(e,e.VERTEX_SHADER,Ge),q=ge(e,e.FRAGMENT_SHADER,Xe),v=e.createProgram();if(!O||!q||!v||(e.attachShader(v,O),e.attachShader(v,q),e.linkProgram(v),e.deleteShader(O),e.deleteShader(q),!e.getProgramParameter(v,e.LINK_STATUS)))return;e.useProgram(v);let f={},Me=e.getProgramParameter(v,e.ACTIVE_UNIFORMS);for(let t=0;t<Me;t++){let r=e.getActiveUniform(v,t);r&&(f[r.name]=e.getUniformLocation(v,r.name))}let W=e.createVertexArray(),Q=e.createBuffer();e.bindVertexArray(W),e.bindBuffer(e.ARRAY_BUFFER,Q),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Y=t=>{let r=e.createTexture();return e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),r},J=Y(0);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let ee=Y(1),te=Y(2);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.uniform1i(f.u_trail,0),e.uniform1i(f.u_image,1),e.uniform1i(f.u_age,2);let U=document.createElement("canvas");U.width=E,U.height=E;let h=U.getContext("2d");if(!h)return;h.fillStyle="black",h.fillRect(0,0,E,E);let P=document.createElement("canvas");P.width=I,P.height=I;let p=P.getContext("2d");if(!p)return;let a={alive:!0,raf:0,last:0,time:0,visible:!0,width:1,height:1,ratio:1,points:[],force:0,image:null,imageReady:!1,imageCells:0,imageWidth:0,imageHeight:0,pointer:{x:0,y:0,at:0,vx:0,vy:0,inside:!1}},Ie=(t,r,n,i)=>{let o=T.current,{points:s}=a,m=s[s.length-1];if(m){let c=m.x-t,_=m.y-r,w=c*c+_*_,fe=Math.max(.3,Math.min(w*1e4,1));if(a.force=fe,o.interpolate){let z=Math.ceil(w/Math.pow(o.trailSize*.5/o.interpolate,2));if(z>1)for(let G=1;G<z;G++)s.push({x:m.x-c/z*G,y:m.y-_/z*G,age:0,force:fe,vx:n,vy:i})}}s.push({x:t,y:r,age:0,force:a.force,vx:n,vy:i})},Ce=t=>{let r=T.current,n=t.x*E,i=(1-t.y)*E,o=1;t.age<r.maxAge*.3?o=r.ease(t.age/(r.maxAge*.3)):o=r.ease(1-(t.age-r.maxAge*.3)/(r.maxAge*.7)),o*=t.force,h.globalCompositeOperation="screen";let s=E*r.trailSize*o,m=h.createRadialGradient(n,i,Math.max(0,s*.25),n,i,Math.max(0,s));if(m.addColorStop(0,"rgba(255, 255, 255, 0.2)"),m.addColorStop(1,"rgba(0, 0, 0, 0.0)"),h.beginPath(),h.fillStyle=m,h.arc(n,i,Math.max(0,s),0,Math.PI*2),h.fill(),!r.trailColor||s<=0)return;let c=I/E,_=Math.round(255*Math.min(Math.max(1-t.age/r.maxAge,0),1)),w=p.createRadialGradient(n*c,i*c,0,n*c,i*c,s*c);w.addColorStop(0,`rgb(${_}, ${_}, ${_})`),w.addColorStop(.75,`rgb(${_}, ${_}, ${_})`),w.addColorStop(1,"rgba(0, 0, 0, 0)"),p.globalCompositeOperation="lighten",p.beginPath(),p.fillStyle=w,p.arc(n*c,i*c,s*c,0,Math.PI*2),p.fill()},Ue=t=>{let r=T.current;if(h.globalCompositeOperation="source-over",h.fillStyle="black",h.fillRect(0,0,E,E),r.trailColor&&(p.globalCompositeOperation="source-over",p.fillStyle="black",p.fillRect(0,0,I,I)),a.points.forEach((n,i)=>{n.age+=t*1e3,n.age>r.maxAge&&a.points.splice(i,1)}),a.points.length||(a.force=0),r.flow>0||r.gravity!==0){let n=Math.exp(-3*t);for(let i of a.points)i.vx*=n,i.vy=i.vy*n-r.gravity*1.6*t,i.x+=i.vx*t,i.y+=i.vy*t}a.points.forEach(Ce)},Pe=(t,r)=>{for(let i=0;i<14;i++){let o=i/14*Math.PI*2+Math.random()*.3,s=.35+Math.random()*.25;a.points.push({x:t,y:r,age:0,force:1,vx:Math.cos(o)*s,vy:Math.sin(o)*s})}},ae=()=>{e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,ee);let t=a.image;if(!t){a.imageReady=!1;return}let r=T.current,n=Math.max(1,Math.round(r.gridSize)),i=document.createElement("canvas");i.width=n,i.height=n;let o=i.getContext("2d");if(!o)return;let s=Math.max(a.width,a.height),m=Math.max(a.width/t.naturalWidth,a.height/t.naturalHeight),c=s/m;o.imageSmoothingQuality="high",o.drawImage(t,(t.naturalWidth-c)/2,(t.naturalHeight-c)/2,c,c,0,0,n,n),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,i),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),a.imageReady=!0,a.imageCells=n,a.imageWidth=a.width,a.imageHeight=a.height},D=()=>{let t=T.current,r=t.dpr??Math.min(window.devicePixelRatio||1,2),n=Math.max(1,x.clientWidth),i=Math.max(1,x.clientHeight);a.width=n,a.height=i,a.ratio=r;let o=Math.max(1,Math.floor(n*r)),s=Math.max(1,Math.floor(i*r));(u.width!==o||u.height!==s)&&(u.width=o,u.height=s),a.image&&(a.imageCells!==Math.max(1,Math.round(t.gridSize))||a.imageWidth!==n||a.imageHeight!==i)&&ae()},S=()=>{let t=T.current;e.viewport(0,0,u.width,u.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,J),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,U),t.trailColor&&(e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,te),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,P)),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.uniform2f(f.u_resolution,a.width*a.ratio,a.height*a.ratio),e.uniform1f(f.u_gridSize,t.gridSize),e.uniform3fv(f.u_color,t.color),e.uniform3fv(f.u_trailColor,t.trailColor??t.color),e.uniform1f(f.u_ramp,t.trailColor?1:0),e.uniform1f(f.u_sigma,t.goo*a.ratio),e.uniform1f(f.u_shine,t.shine),e.uniform1f(f.u_glow,t.glow),e.uniform1i(f.u_shape,t.shape),e.uniform1i(f.u_decay,t.decay),e.uniform1f(f.u_gap,t.gap),e.uniform1f(f.u_sparkle,t.sparkle),e.uniform1f(f.u_time,a.time),e.uniform1f(f.u_hasImage,a.imageReady?1:0),e.bindVertexArray(W),e.drawArrays(e.TRIANGLE_STRIP,0,4)},re=t=>{if(a.raf=0,!a.alive)return;let r=a.last?(t-a.last)/1e3:1/60;a.last=t,a.time+=r,D(),Ue(r),S(),a.points.length&&a.visible?a.raf=requestAnimationFrame(re):a.last=0},V=()=>{!a.raf&&a.alive&&a.visible&&(a.raf=requestAnimationFrame(re))},ie=t=>{let r=x.getBoundingClientRect(),n=t.clientX-r.left,i=t.clientY-r.top,o=Math.max(r.width,r.height);return{x:(n-r.width/2)/o+.5,y:(r.height/2-i)/o+.5,inside:n>=0&&i>=0&&n<=r.width&&i<=r.height}},oe=t=>{let{x:r,y:n,inside:i}=ie(t),o=a.pointer,s=performance.now();if(i){let m=T.current,c=Math.max(.008,(s-o.at)/1e3);o.inside?(o.vx+=((r-o.x)/c-o.vx)*.5,o.vy+=((n-o.y)/c-o.vy)*.5):(o.vx=0,o.vy=0),Ie(r,n,o.vx*m.flow*.3,o.vy*m.flow*.3),V()}o.x=r,o.y=n,o.at=s,o.inside=i},ne=t=>{let{x:r,y:n,inside:i}=ie(t);!i||!T.current.clickBurst||(Pe(r,n),V())},L=()=>{a.pointer.inside=!1},le=new ResizeObserver(()=>{D(),S()});le.observe(x);let se=new IntersectionObserver(t=>{a.visible=t.some(r=>r.isIntersecting),a.visible&&V()});se.observe(x);let ce=t=>{t.preventDefault(),a.alive=!1,cancelAnimationFrame(a.raf)};return u.addEventListener("webglcontextlost",ce),window.addEventListener("pointermove",oe,{passive:!0}),window.addEventListener("pointerdown",ne,{passive:!0}),document.documentElement.addEventListener("pointerleave",L),window.addEventListener("blur",L),y.current={setImage:t=>{a.image=t,ae(),S()},redraw:()=>{D(),S()}},D(),S(),()=>{a.alive=!1,cancelAnimationFrame(a.raf),le.disconnect(),se.disconnect(),u.removeEventListener("webglcontextlost",ce),window.removeEventListener("pointermove",oe),window.removeEventListener("pointerdown",ne),document.documentElement.removeEventListener("pointerleave",L),window.removeEventListener("blur",L),y.current=null,e.deleteTexture(J),e.deleteTexture(ee),e.deleteTexture(te),e.deleteBuffer(Q),e.deleteVertexArray(W),e.deleteProgram(v)}},[]),(0,b.useEffect)(()=>{if(!k){y.current?.setImage(null);return}let x=!0,u=new Image;return u.crossOrigin="anonymous",u.decoding="async",u.onload=()=>{x&&y.current?.setImage(u)},u.onerror=()=>{x&&y.current?.setImage(null)},u.src=k,()=>{x=!1}},[k]),(0,b.useEffect)(()=>{y.current?.redraw()}),(0,H.jsx)("div",{ref:K,className:`absolute z-1 ${Ae}`.trim(),style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",pointerEvents:"none",...Se},children:(0,H.jsx)("canvas",{ref:Z,style:{display:"block",width:"100%",height:"100%"}})})}var N=M(X(),1),Be=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],B=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ye=Be.map((l,d)=>({id:d+1,image:l,src:l,img:l,url:l,title:B[d],text:B[d],label:B[d],alt:B[d],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][d],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ne({big:l}){return(0,N.jsx)(me,{big:l,dark:!0,center:!0,zoom:1,drive:"move",children:(0,N.jsx)("div",{className:"absolute inset-0",children:(0,N.jsx)($,{color:"#48c8f5"})})})}var Ve=ue(Ne);export{Ve as default};
