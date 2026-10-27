import{b as X,c as We,d as Y,e as ue,f as fe,h as He}from"./chunks/chunk-M7BFARI7.js";import{c as C,i as St,j as q,l as Ge,m as Ue}from"./chunks/chunk-6IYH4WPJ.js";var x=C(St(),1);var Je=C(q(),1),qe={silk:{pattern:"dot",wave:"silk",spacing:9,markSize:.95,depth:.95,light:0,shine:.8,contrast:1.2,speed:.35,scale:1,direction:20},ocean:{pattern:"dot",wave:"swell",spacing:10,markSize:.9,depth:.42,light:0,shine:1,contrast:1.2,speed:.5,scale:1,direction:100},pond:{pattern:"dot",wave:"ripple",spacing:10,markSize:.9,depth:.55,light:0,shine:1.2,contrast:1.2,speed:.5,scale:1,direction:35},lines:{pattern:"line",wave:"silk",spacing:12,markSize:.42,depth:.9,light:0,shine:.6,contrast:1.2,speed:.3,scale:1,direction:20},terminal:{pattern:"glyph",wave:"ripple",spacing:13,markSize:.95,depth:.75,light:0,shine:.9,contrast:1.4,speed:.3,scale:1.1,direction:200},mesh:{pattern:"plus",wave:"silk",spacing:14,markSize:.8,depth:.95,light:0,shine:1,contrast:1.45,speed:.4,scale:1.1,direction:325}},kt={dot:0,square:1,plus:2,line:3,glyph:4},At={silk:0,swell:1,ripple:2},Ft={none:0,edges:1,center:2,bottom:3,top:4},$e=".:-=+*#%@",Mt="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",z=128,Xe=520,Ye=8,zt=60,Tt=45e5,Et=2,c=(o,r,s)=>Math.min(Math.max(o,r),s),ve=o=>.2126*o[0]+.7152*o[1]+.0722*o[2],Ve=(o,r)=>{try{let s=document.createElement("canvas").getContext("2d");if(!s)return r;s.fillStyle="#000000",s.fillStyle=o;let w=s.fillStyle;if(w.startsWith("#")){let f=parseInt(w.slice(1),16);return[(f>>16&255)/255,(f>>8&255)/255,(f&255)/255,1]}let u=w.match(/[\d.]+/g);return!u||u.length<3?r:[Number(u[0])/255,Number(u[1])/255,Number(u[2])/255,u[3]?Number(u[3]):1]}catch{return r}},Pt=o=>{let r=Array.from(o&&o.length?o:$e),s=Math.ceil(Math.sqrt(r.length)),w=Math.ceil(r.length/s),u=document.createElement("canvas");u.width=s*z,u.height=w*z;let f=u.getContext("2d");return f?(f.fillStyle="#ffffff",f.textAlign="center",f.textBaseline="middle",f.font=`500 ${Math.round(z*.86)}px ${Mt}`,r.forEach(($,I)=>{let K=I%s*z+z/2,J=Math.floor(I/s)*z+z/2;f.fillText($,K,J)}),{canvas:u,columns:s,lines:w,count:r.length}):null},pe=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Rt=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uSize;
uniform float uDpr;
uniform vec2 uOrigin;
uniform vec2 uPitch;
uniform int uWave;
uniform float uTime;
uniform float uUnit;
uniform vec2 uHeading;
uniform float uAmp;
uniform float uDepth;
uniform vec3 uLight;
uniform float uShine;
uniform float uContrast;
uniform float uInk;
uniform float uOpacity;
uniform int uFade;
uniform float uFadeSize;
uniform float uAppear;
uniform sampler2D tRipple;
uniform float uRipple;
out vec4 fragColor;

const float FOLDS = 5.5;

uvec3 scramble(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

vec3 lattice(vec3 corner) {
  uvec3 h = scramble(uvec3(ivec3(corner) + 4096));
  return vec3(h & 65535u) / 32767.5 - 1.0;
}

float gradientNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(lattice(i), f);
  float n100 = dot(lattice(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(lattice(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(lattice(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(lattice(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(lattice(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(lattice(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(lattice(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

vec2 turn(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

float surface(vec2 p, float t) {
  if (uWave == 0) {
    vec2 side = vec2(-uHeading.y, uHeading.x);
    float u = dot(p, uHeading);
    float v = dot(p, side);
    float bend = gradientNoise(vec3(v * 0.85, u * 0.3, t * 0.05)) * 1.7 + 0.4 * sin(v * 1.6 + t * 0.2);
    float phase = u * FOLDS + bend - t * 0.45;
    float swell = 0.6 + 0.4 * gradientNoise(vec3(u * 0.55 + 3.0, v * 0.45, t * 0.04));
    float fold = sin(phase) + 0.32 * sin(2.0 * phase + 1.3);
    float ripple = 0.16 * sin(u * FOLDS * 2.5 + bend * 1.9 - t * 0.9 + 2.1);
    return (fold + ripple) * swell;
  }
  if (uWave == 1) {
    float bend = gradientNoise(vec3(p * 0.6, t * 0.05)) * 0.6;
    float phase = dot(p, uHeading) * 15.0 + bend * 2.2 - t * 1.4;
    float swell = sin(phase) + 0.3 * sin(2.0 * phase - 0.8);
    float roll = 0.75 + 0.25 * gradientNoise(vec3(p * 0.9 + 11.0, t * 0.05));
    return 0.8 * swell * roll;
  }
  float r = length(p + uHeading * 1.2);
  float bend = gradientNoise(vec3(p * 1.2, t * 0.05)) * 0.1;
  return sin((r + bend) * 9.0 - t * 1.8) * (0.45 + 0.55 * exp(-(r - 0.6) * 0.8));
}

float heightAt(vec2 css) {
  float h = surface((css - 0.5 * uSize) / uUnit, uTime) * uAmp;
  if (uRipple > 0.0) h += texture(tRipple, css / uSize).r * uRipple;
  return h;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 center = uOrigin + (cell + 0.5) * uPitch;
  vec2 css = center / uDpr;
  vec2 uv = css / uSize;
  float e = max(uPitch.y / uDpr, 4.0);
  float h = heightAt(css);
  float hx = (heightAt(css + vec2(e, 0.0)) - heightAt(css - vec2(e, 0.0))) / (2.0 * e);
  float hy = (heightAt(css + vec2(0.0, e)) - heightAt(css - vec2(0.0, e))) / (2.0 * e);
  vec2 grad = vec2(hx, hy) * uUnit * uDepth * 0.4;
  vec3 n = normalize(vec3(-grad, 1.0));

  float diffuse = clamp(dot(n, uLight), 0.0, 1.0);
  vec3 halfway = normalize(uLight + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, halfway), 0.0, 1.0), 160.0) * uShine * 1.15;
  float hollow = 0.7 + 0.3 * clamp(h * 0.5 + 0.5, 0.0, 1.0);
  float tone = clamp(diffuse * hollow * 0.78 + spec, 0.0, 1.0);
  tone = clamp((tone - 0.42) * uContrast + 0.42, 0.0, 1.0);

  float level = uInk > 0.5 ? pow(clamp(1.0 - tone / 0.46, 0.0, 1.0), 2.4) * 0.72 : pow(tone, 2.2);
  float emphasis = uInk > 0.5 ? smoothstep(0.55, 0.95, level) : clamp(spec * 1.6, 0.0, 1.0);

  float fade = 1.0;
  vec2 c = uv * 2.0 - 1.0;
  if (uFade == 1) {
    fade = 1.0 - smoothstep(1.0 - uFadeSize, 1.18, length(c));
  } else if (uFade == 2) {
    fade = mix(0.05, 1.0, smoothstep(0.08, 0.08 + uFadeSize, length(c * vec2(1.0, 1.35))));
  } else if (uFade == 3) {
    fade = smoothstep(0.0, uFadeSize, uv.y);
  } else if (uFade == 4) {
    fade = smoothstep(0.0, uFadeSize, 1.0 - uv.y);
  }

  float reach = length(css - 0.5 * uSize) / max(0.5 * length(uSize), 1.0);
  float appear = smoothstep(reach - 0.05, reach + 0.3, uAppear * 1.35);

  float alpha = uOpacity * fade * appear * (0.22 + 0.78 * level);
  float lift = clamp(h * uDepth * 0.42, -0.48, 0.48);
  fragColor = vec4(level, alpha, emphasis, lift + 0.5);
}
`,Lt=`#version 300 es
precision highp float;
uniform sampler2D tState;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uImpulse;
uniform float uDamping;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 state = texture(tState, uv).rg;
  float left = texture(tState, uv - vec2(uTexel.x, 0.0)).r;
  float right = texture(tState, uv + vec2(uTexel.x, 0.0)).r;
  float below = texture(tState, uv - vec2(0.0, uTexel.y)).r;
  float above = texture(tState, uv + vec2(0.0, uTexel.y)).r;
  float next = ((left + right + below + above) * 0.5 - state.g) * uDamping;
  vec2 p = uv * uSize;
  vec2 segment = uTo - uFrom;
  float along = clamp(dot(p - uFrom, segment) / max(dot(segment, segment), 1e-4), 0.0, 1.0);
  float d = length(p - uFrom - segment * along) / uRadius;
  next -= uImpulse * exp(-d * d * 2.0);
  fragColor = vec4(next, state.r, 0.0, 1.0);
}
`,Ct=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D tField;
uniform sampler2D tAtlas;
uniform vec2 uOrigin;
uniform vec2 uPitch;
uniform vec2 uGrid;
uniform int uPattern;
uniform float uMarkSize;
uniform float uStroke;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec4 uBackground;
uniform vec3 uAtlas;
out vec4 fragColor;

float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float coverage(vec2 local, float level) {
  float span = uPitch.y * uMarkSize;
  float area = max(sqrt(level), 0.14);
  if (uPattern == 0) {
    return clamp(0.5 - (length(local) - 0.5 * span * area), 0.0, 1.0);
  }
  if (uPattern == 1) {
    float extent = 0.5 * span * area;
    return clamp(0.5 - box(local, vec2(extent), extent * 0.3), 0.0, 1.0);
  }
  if (uPattern == 2) {
    float arm = 0.5 * span * mix(0.3, 1.0, level);
    float width = 0.5 * uStroke;
    return clamp(0.5 - min(box(local, vec2(arm, width), width), box(local, vec2(width, arm), width)), 0.0, 1.0);
  }
  if (uAtlas.z < 1.0) return 0.0;
  vec2 g = local / span + 0.5;
  if (g.x < 0.0 || g.y < 0.0 || g.x > 1.0 || g.y > 1.0) return 0.0;
  float index = min(floor(level * uAtlas.z), uAtlas.z - 1.0);
  vec2 tile = vec2(mod(index, uAtlas.x), floor(index / uAtlas.x));
  vec2 atlasUv = (tile + vec2(g.x, 1.0 - g.y)) / uAtlas.xy;
  vec2 texel = 1.0 / (span * uAtlas.xy);
  return textureGrad(tAtlas, atlasUv, vec2(texel.x, 0.0), vec2(0.0, texel.y)).a;
}

vec4 lineInk(vec2 rel) {
  float fx = rel.x / uPitch.x - 0.5;
  float c0 = clamp(floor(fx), 0.0, uGrid.x - 1.0);
  float c1 = min(c0 + 1.0, uGrid.x - 1.0);
  float t = clamp(fx - c0, 0.0, 1.0);
  float row = floor(rel.y / uPitch.y);
  vec4 ink = vec4(0.0);
  for (int k = -1; k <= 1; k++) {
    float cy = row + float(k);
    if (cy < 0.0 || cy >= uGrid.y) continue;
    vec4 a = texelFetch(tField, ivec2(int(c0), int(cy)), 0);
    vec4 b = texelFetch(tField, ivec2(int(c1), int(cy)), 0);
    vec4 f = mix(a, b, t);
    if (f.g < 0.002) continue;
    float y = (cy + 0.5 + f.a - 0.5) * uPitch.y;
    float slope = (b.a - a.a) * uPitch.y / uPitch.x;
    float thickness = max(uStroke, uPitch.y * uMarkSize * f.r);
    float d = abs(rel.y - y) / sqrt(1.0 + slope * slope) - 0.5 * thickness;
    float alpha = clamp(0.5 - d, 0.0, 1.0) * f.g;
    if (alpha > ink.a) ink = vec4(mix(uColor, uAccent, f.b) * alpha, alpha);
  }
  return ink;
}

void main() {
  vec2 rel = gl_FragCoord.xy - uOrigin;
  vec4 background = vec4(uBackground.rgb * uBackground.a, uBackground.a);
  vec4 ink = vec4(0.0);
  if (uPattern == 3) {
    ink = lineInk(rel);
  } else {
    float cx = floor(rel.x / uPitch.x);
    float row = floor(rel.y / uPitch.y);
    if (cx >= 0.0 && cx < uGrid.x) {
      for (int k = -1; k <= 1; k++) {
        float cy = row + float(k);
        if (cy < 0.0 || cy >= uGrid.y) continue;
        vec4 f = texelFetch(tField, ivec2(int(cx), int(cy)), 0);
        if (f.g < 0.002) continue;
        vec2 center = (vec2(cx, cy) + 0.5) * uPitch + vec2(0.0, (f.a - 0.5) * uPitch.y);
        float alpha = coverage(rel - center, f.r) * f.g;
        if (alpha > ink.a) ink = vec4(mix(uColor, uAccent, f.b) * alpha, alpha);
      }
    }
  }
  fragColor = ink + background * (1.0 - ink.a);
}
`,It=({preset:o="silk",pattern:r,wave:s,spacing:w,markSize:u,depth:f,light:$,shine:I,contrast:K,speed:J,scale:Qe,direction:Ze,color:he="#ffffff",backgroundColor:me="#000000",opacity:je=1,fade:et="edges",fadeSize:tt=.5,characters:at=$e,interactive:it=!0,cursorSize:nt=50,cursorStrength:ot=.6,intro:rt=!0,paused:lt=!1,className:ct="",style:st})=>{let ge=(0,x.useRef)(null),xe=(0,x.useRef)(null),Q=(0,x.useRef)(null),ut=qe[o]||qe.silk,p=(d,h)=>d??ut[h],ft=(0,x.useMemo)(()=>({color:Ve(he,[1,1,1,1]),background:Ve(me,[0,0,0,1])}),[he,me]);return(0,x.useEffect)(()=>{xe.current={...ft,pattern:p(r,"pattern"),wave:p(s,"wave"),spacing:p(w,"spacing"),markSize:p(u,"markSize"),depth:p(f,"depth"),light:p($,"light"),shine:p(I,"shine"),contrast:p(K,"contrast"),speed:p(J,"speed"),scale:p(Qe,"scale"),direction:p(Ze,"direction"),opacity:je,fade:et,fadeSize:tt,characters:at,interactive:it,cursorSize:nt,cursorStrength:ot,intro:rt,paused:lt},Q.current?.()}),(0,x.useEffect)(()=>{let d=ge.current;if(!d)return;let h=new We({alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1}),i=h.gl;if(!h.isWebgl2){i.getExtension("WEBGL_lose_context")?.loseContext();return}i.clearColor(0,0,0,0);let y=i.canvas;y.style.display="block",y.style.width="100%",y.style.height="100%",y.setAttribute("aria-hidden","true"),d.appendChild(y);let Z=new He(i),j=new ue(i),vt=!!i.getExtension("EXT_color_buffer_float"),T=t=>{i.deleteFramebuffer(t.buffer),i.deleteTexture(t.texture.texture)},we=(t,e)=>new fe(i,{width:t,height:e,depth:!1,minFilter:i.NEAREST,magFilter:i.NEAREST}),ye=(t,e)=>new fe(i,{width:t,height:e,depth:!1,type:i.HALF_FLOAT,format:i.RGBA,internalFormat:i.RGBA16F,minFilter:i.LINEAR,magFilter:i.LINEAR}),b=we(1,1),l=null,ee=new ue(i,{generateMipmaps:!0,minFilter:i.LINEAR_MIPMAP_LINEAR,magFilter:i.LINEAR,flipY:!1}),n={uSize:{value:[1,1]},uDpr:{value:1},uOrigin:{value:[0,0]},uPitch:{value:[1,1]},uWave:{value:0},uTime:{value:0},uUnit:{value:Xe},uHeading:{value:[1,0]},uAmp:{value:0},uDepth:{value:.5},uLight:{value:[0,0,1]},uShine:{value:.8},uContrast:{value:1},uInk:{value:0},uOpacity:{value:1},uFade:{value:0},uFadeSize:{value:.5},uAppear:{value:0},tRipple:{value:j},uRipple:{value:0}},pt=new Y(i,{geometry:Z,program:new X(i,{vertex:pe,fragment:Rt,uniforms:n,depthTest:!1,depthWrite:!1})}),S={tState:{value:j},uTexel:{value:[1,1]},uSize:{value:[1,1]},uFrom:{value:[0,0]},uTo:{value:[0,0]},uRadius:{value:40},uImpulse:{value:0},uDamping:{value:.975}},dt=new Y(i,{geometry:Z,program:new X(i,{vertex:pe,fragment:Lt,uniforms:S,depthTest:!1,depthWrite:!1})}),v={tField:{value:b.texture},tAtlas:{value:ee},uOrigin:{value:[0,0]},uPitch:{value:[1,1]},uGrid:{value:[1,1]},uPattern:{value:0},uMarkSize:{value:.9},uStroke:{value:2},uColor:{value:[1,1,1]},uAccent:{value:[1,1,1]},uBackground:{value:[0,0,0,1]},uAtlas:{value:[1,1,0]}},ht=new Y(i,{geometry:Z,program:new X(i,{vertex:pe,fragment:Ct,uniforms:v,depthTest:!1,depthWrite:!1})}),te=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,A=1,k=1,R=0,ae=performance.now(),be=0,L=0,D=!0,ie=!0,N=!0,Se=0,E=!1,O=0,ke="",a={x:0,y:0,inside:!1,placed:!1,lastX:0,lastY:0,burst:0},mt=()=>{if(!vt)return;let t=c(Math.ceil(A/Ye),4,512),e=c(Math.ceil(k/Ye),4,512);l&&l.width===t&&l.height===e||(l&&(T(l.read),T(l.write)),l={width:t,height:e,read:ye(t,e),write:ye(t,e)},E=!1)},gt=()=>{l&&([l.read,l.write].forEach(t=>{h.bindFramebuffer(t),i.viewport(0,0,t.width,t.height),i.clear(i.COLOR_BUFFER_BIT)}),h.bindFramebuffer())},xt=t=>{if(t.characters===ke)return;ke=t.characters;let e=Pt(t.characters);e&&(ee.image=e.canvas,v.uAtlas.value=[e.columns,e.lines,e.count])},Ae=()=>{A=Math.max(1,d.clientWidth),k=Math.max(1,d.clientHeight),h.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(Tt/(A*k))),h.setSize(A,k),mt(),N=!0,F()},wt=(t,e,m)=>{O=Math.min(O+m*zt,4);let g=c(e.cursorStrength,0,1),ne=Math.hypot(a.x-a.lastX,a.y-a.lastY),P=(a.inside?Math.min(ne/14,1)*.35*g:0)+a.burst*g;for(a.burst=0,S.uTexel.value=[1/t.width,1/t.height],S.uSize.value=[A,k],S.uFrom.value=[a.lastX,k-a.lastY],S.uTo.value=[a.x,k-a.y],S.uRadius.value=c(e.cursorSize,8,400);O>=1;){O-=1,S.tState.value=t.read.texture,S.uImpulse.value=P,h.render({scene:dt,target:t.write,clear:!1});let oe=t.read;t.read=t.write,t.write=oe,P=0}a.lastX=a.x,a.lastY=a.y},Fe=t=>{if(R=0,!ie)return;let e=xe.current,m=Math.min(.05,Math.max(1/240,(t-ae)/1e3));if(ae=t,!e)return;let g=!e.paused&&!te&&e.speed!==0;g&&(be+=m*e.speed),L=e.intro&&!te?Math.min(1,L+m/Et):1;let ne=1-Math.pow(1-c(L/.75,0,1),3),P=c((L-.1)/.9,0,1),oe=P*P*(3-2*P),re=e.interactive&&!te&&!!l&&e.cursorStrength>0;re&&a.inside&&!a.placed&&(a.lastX=a.x,a.lastY=a.y,a.placed=!0),re&&(a.inside||a.burst>0)&&(Se=t+5e3);let Ie=re&&t<Se;Ie&&l?(wt(l,e,m),E=!0):E&&(gt(),E=!1);let B=kt[e.pattern]??0;B===4&&xt(e);let le=i.canvas.width,De=i.canvas.height,G=le/A,M=Math.max(4,Math.round(c(e.spacing,4,120)*G)),U=B===3?Math.max(2,Math.round(M/4)):M,W=Math.min(4096,Math.ceil(le/U)+1),H=Math.min(4096,Math.ceil(De/M)+2),Ne=[Math.floor((le-W*U)/2),Math.floor((De-H*M)/2)];(b.width!==W||b.height!==H)&&(T(b),b=we(W,H),v.tField.value=b.texture);let Oe=e.direction*Math.PI/180,_e=(e.direction+180+c(e.light,-90,90))*Math.PI/180,ce=e.background,se=ce[3]>.02?ve(e.color)<ve(ce):ve(e.color)<.5;n.uSize.value=[A,k],n.uDpr.value=G,n.uOrigin.value=Ne,n.uPitch.value=[U,M],n.uWave.value=At[e.wave]??0,n.uTime.value=be,n.uUnit.value=Xe*c(e.scale,.2,5),n.uHeading.value=[Math.cos(Oe),Math.sin(Oe)],n.uAmp.value=oe,n.uDepth.value=c(e.depth,0,1.5),n.uLight.value=[Math.cos(_e)*.78,Math.sin(_e)*.78,.62],n.uShine.value=c(e.shine,0,2),n.uContrast.value=c(e.contrast,.3,3),n.uInk.value=se?1:0,n.uOpacity.value=c(e.opacity,0,1),n.uFade.value=Ft[e.fade]??0,n.uFadeSize.value=c(e.fadeSize,.05,1),n.uAppear.value=ne,n.tRipple.value=l&&E?l.read.texture:j,n.uRipple.value=E?.32:0,h.render({scene:pt,target:b}),v.uOrigin.value=Ne,v.uPitch.value=[U,M],v.uGrid.value=[W,H],v.uPattern.value=B,v.uMarkSize.value=c(e.markSize,.05,1),v.uStroke.value=B===3?.9*G:Math.max(1.1*G,M*.08);let yt=se?0:1,bt=se?.35:.55;v.uColor.value=e.color.slice(0,3),v.uAccent.value=e.color.slice(0,3).map(Be=>Be+(yt-Be)*bt),v.uBackground.value=ce,h.render({scene:ht}),N=!1,D&&(g||L<1||Ie||N)&&(R=requestAnimationFrame(Fe))},F=()=>{R||!D||!ie||(ae=performance.now(),R=requestAnimationFrame(Fe))},Me=t=>{let e=d.getBoundingClientRect(),m=t.clientX-e.left,g=t.clientY-e.top;return{x:m,y:g,inside:m>=0&&g>=0&&m<=e.width&&g<=e.height}},ze=t=>{let e=Me(t);a.x=e.x,a.y=e.y,e.inside!==a.inside&&(a.placed=!1),a.inside=e.inside,e.inside&&F()},Te=t=>{let e=Me(t);e.inside&&(a.x=e.x,a.y=e.y,a.inside||(a.lastX=e.x,a.lastY=e.y),a.burst=1.2,F())},_=()=>{a.inside=!1,a.placed=!1,F()},Ee=t=>{t.relatedTarget||_()},Pe=t=>{t.pointerType==="touch"&&_()},Re=()=>{document.hidden||F()};window.addEventListener("pointermove",ze,{passive:!0}),window.addEventListener("pointerdown",Te,{passive:!0}),window.addEventListener("pointerout",Ee,{passive:!0}),window.addEventListener("pointerup",Pe,{passive:!0}),window.addEventListener("blur",_),document.addEventListener("visibilitychange",Re);let Le=new ResizeObserver(Ae);Le.observe(d);let Ce=new IntersectionObserver(([t])=>{D=t.isIntersecting,F()});return Ce.observe(d),Q.current=()=>{N=!0,F()},Ae(),()=>{ie=!1,D=!1,cancelAnimationFrame(R),Le.disconnect(),Ce.disconnect(),window.removeEventListener("pointermove",ze),window.removeEventListener("pointerdown",Te),window.removeEventListener("pointerout",Ee),window.removeEventListener("pointerup",Pe),window.removeEventListener("blur",_),document.removeEventListener("visibilitychange",Re),Q.current=null,l&&(T(l.read),T(l.write)),T(b),i.deleteTexture(ee.texture),i.getExtension("WEBGL_lose_context")?.loseContext(),y.parentNode&&y.parentNode.removeChild(y)}},[]),(0,Je.jsx)("div",{ref:ge,className:`relative h-full w-full overflow-hidden ${ct}`.trim(),style:st})},Ke=It;var de=C(q(),1),Dt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],V=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ht=Dt.map((o,r)=>({id:r+1,image:o,src:o,img:o,url:o,title:V[r],text:V[r],label:V[r],alt:V[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Nt({big:o}){return(0,de.jsx)(Ue,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,de.jsx)(Ke,{})})}var qt=Ge(Nt);export{qt as default};
