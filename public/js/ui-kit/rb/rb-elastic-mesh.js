import{c as _e,i as Dt,j as Ye,l as ht,m as vt}from"./chunks/chunk-6IYH4WPJ.js";var ne=_e(Dt(),1),et=_e(Ye(),1),_t=`#version 300 es
in vec2 aPosition;
in vec2 aRest;
in vec4 aStrain;
in vec3 aDent;
uniform vec2 uViewport;
uniform vec2 uOffset;
out vec2 vRest;
out vec4 vStrain;
out vec3 vDent;
void main() {
  vRest = aRest;
  vStrain = aStrain;
  vDent = aDent;
  vec2 clip = (aPosition + uOffset) / uViewport * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`,Pt=`#version 300 es
precision highp float;
in vec2 vRest;
in vec4 vStrain;
in vec3 vDent;
uniform sampler2D uField;
uniform vec3 uShadowColor;
uniform float uShadow;
uniform vec4 uParts[64];
uniform float uClock;

float arrival(float delay) {
  float t = max(uClock - delay, 0.0);
  float omega = 15.0;
  float zeta = 0.38;
  float damped = omega * sqrt(1.0 - zeta * zeta);
  return 1.0 - exp(-zeta * omega * t) * (cos(damped * t) + zeta * omega / damped * sin(damped * t));
}

float owner(vec2 rest) {
  ivec2 size = textureSize(uField, 0);
  ivec2 texel = clamp(ivec2(rest * vec2(size)), ivec2(0), size - 1);
  return floor(texelFetch(uField, texel, 0).w + 0.5);
}

vec3 settle(vec2 rest) {
  if (uClock > 9.0) return vec3(rest, 1.0);
  float id = owner(rest);
  if (id < 0.5 || id > 64.5) return vec3(rest, 1.0);
  vec4 part = uParts[int(id) - 1];
  float presence = arrival(part.z);
  float size = max(mix(0.5, 1.0, presence), 0.05);
  vec2 moved = part.xy + (rest - part.xy) / size;
  return vec3(moved, presence * step(abs(owner(moved) - id), 0.5));
}
out vec4 outColor;
void main() {
  vec3 arrived = settle(vRest);
  float shade = texture(uField, arrived.xy).z * uShadow * clamp(arrived.z, 0.0, 1.0) * (1.0 - 0.35 * clamp(vDent.x, 0.0, 1.0));
  outColor = vec4(uShadowColor * shade, shade);
}`,It=`#version 300 es
precision highp float;
in vec2 vRest;
in vec4 vStrain;
in vec3 vDent;
uniform sampler2D uField;
uniform sampler2D uSlope;
uniform sampler2D uPaint;
uniform vec3 uColor;
uniform float uPaintMix;
uniform float uMaterial;
uniform float uLight;
uniform float uInflate;
uniform mat3 uTurn;
uniform vec4 uParts[64];
uniform float uClock;
out vec4 outColor;

float arrival(float delay) {
  float t = max(uClock - delay, 0.0);
  float omega = 15.0;
  float zeta = 0.38;
  float damped = omega * sqrt(1.0 - zeta * zeta);
  return 1.0 - exp(-zeta * omega * t) * (cos(damped * t) + zeta * omega / damped * sin(damped * t));
}

float owner(vec2 rest) {
  ivec2 size = textureSize(uField, 0);
  ivec2 texel = clamp(ivec2(rest * vec2(size)), ivec2(0), size - 1);
  return floor(texelFetch(uField, texel, 0).w + 0.5);
}

vec3 settle(vec2 rest) {
  if (uClock > 9.0) return vec3(rest, 1.0);
  float id = owner(rest);
  if (id < 0.5 || id > 64.5) return vec3(rest, 1.0);
  vec4 part = uParts[int(id) - 1];
  float presence = arrival(part.z);
  float size = max(mix(0.5, 1.0, presence), 0.05);
  vec2 moved = part.xy + (rest - part.xy) / size;
  return vec3(moved, presence * step(abs(owner(moved) - id), 0.5));
}
vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}

vec2 smoothSlope(vec2 uv) {
  vec2 size = vec2(textureSize(uSlope, 0));
  vec2 cell = uv * size - 0.5;
  vec2 f = fract(cell);
  cell -= f;
  vec4 xc = cubic(f.x);
  vec4 yc = cubic(f.y);
  vec4 corner = cell.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 sum = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 offset = (corner + vec4(xc.yw, yc.yw) / sum) / size.xxyy;
  vec2 a = texture(uSlope, offset.xz).xy;
  vec2 b = texture(uSlope, offset.yz).xy;
  vec2 c = texture(uSlope, offset.xw).xy;
  vec2 d = texture(uSlope, offset.yw).xy;
  float sx = sum.x / (sum.x + sum.y);
  float sy = sum.z / (sum.z + sum.w);
  return mix(mix(d, c, sx), mix(b, a, sx), sy);
}

float panel(vec3 r, vec3 center, vec2 size, float soft) {
  vec3 forward = normalize(center);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 lift = cross(forward, side);
  float facing = dot(r, forward);
  vec2 local = vec2(dot(r, side), dot(r, lift)) / max(facing, 0.1);
  vec2 q = abs(local) - size;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return smoothstep(soft, -soft, d) * smoothstep(0.05, 0.3, facing);
}

vec3 studio(vec3 r, float blur) {
  float y = r.y;
  vec3 skyLow = mix(vec3(0.92, 0.95, 1.0), vec3(1.0), uLight);
  vec3 skyHigh = mix(vec3(0.1, 0.11, 0.14), vec3(0.62, 0.64, 0.7), uLight);
  vec3 groundNear = mix(vec3(0.12, 0.11, 0.1), vec3(0.3, 0.29, 0.28), uLight);
  vec3 groundFar = mix(vec3(0.005), vec3(0.1), uLight);
  vec3 sky = mix(skyLow, skyHigh, smoothstep(0.0, 0.75, y));
  vec3 ground = mix(groundNear, groundFar, smoothstep(0.0, -0.4, y));
  float edge = 0.004 + blur;
  vec3 c = mix(ground, sky, smoothstep(-edge, edge, y));
  float glow = 0.035 + blur;
  c += vec3(2.2) * exp(-pow((y - 0.02) / glow, 2.0)) * (0.035 / glow);
  c += vec3(7.0) * panel(r, vec3(-0.55, 0.55, 0.62), vec2(0.36, 0.2), 0.025 + blur);
  c += vec3(4.5) * panel(r, vec3(0.9, 0.18, 0.4), vec2(0.045, 0.85), 0.01 + blur) * (0.045 / (0.045 + blur));
  c += vec3(3.2) * panel(r, vec3(-0.95, 0.1, 0.32), vec2(0.035, 0.7), 0.01 + blur) * (0.035 / (0.035 + blur));
  c += vec3(2.4) * panel(r, vec3(0.0, 0.92, 0.38), vec2(1.1, 0.045), 0.01 + blur) * (0.045 / (0.045 + blur));
  return c;
}

vec3 tone(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 arrived = settle(vRest);
  vec2 rest = arrived.xy;
  float presence = arrived.z;
  vec4 field = texture(uField, rest);
  float edge = field.y;
  float edgeWidth = max(fwidth(edge), 0.0001);
  if (edge < -3.0 * edgeWidth || presence <= 0.001) discard;
  float cover = clamp(edge / edgeWidth + 0.5, 0.0, 1.0);

  vec2 slope = smoothSlope(rest);
  mat2 strain = mat2(vStrain.xy, vStrain.zw);
  float area = max(determinant(strain), 0.2);
  float lift = uInflate * presence * inversesqrt(area);
  float keep = clamp(1.0 - vDent.x, 0.15, 1.6);
  vec2 restGradient = (slope * keep - field.x * vDent.yz) * lift;
  vec2 gradient = inverse(transpose(strain)) * restGradient;
  vec3 normal = normalize(vec3(-gradient.x, gradient.y, 1.0));
  float depth = field.x * keep * lift;

  vec3 turned = uTurn * normal;
  vec3 reflected = uTurn * reflect(vec3(0.0, 0.0, -1.0), normal);
  float footprint = length(fwidth(reflected));
  float facing = max(normal.z, 0.0);
  float fresnel = pow(1.0 - facing, 5.0);
  vec3 lightDir = normalize(vec3(-0.5, 0.62, 0.62));
  float wrap = max((dot(turned, lightDir) + 0.45) / 1.45, 0.0);
  float key = max(dot(turned, lightDir), 0.0);
  float occlusion = mix(0.55, 1.0, smoothstep(0.0, 12.0, depth));

  vec3 paint = texture(uPaint, rest).rgb;
  vec3 base = mix(uColor, paint, uPaintMix);
  vec3 color;
  if (uMaterial < 0.5) {
    vec3 env = studio(reflected, 0.04 + footprint * 0.6);
    float reflectance = 0.045 + 0.955 * fresnel;
    vec3 deep = base * base * 0.55;
    vec3 body = mix(deep, base * 1.08, wrap) * occlusion;
    body += base * pow(1.0 - facing, 2.0) * 0.18;
    color = body * (1.0 - reflectance) + tone(env * reflectance * 0.9);
  } else if (uMaterial < 1.5) {
    vec3 env = studio(reflected, footprint * 0.6);
    vec3 tint = mix(vec3(1.0), base, 0.6) * 0.92;
    vec3 reflectance = tint + (1.0 - tint) * fresnel;
    color = tone(env * reflectance * mix(0.55, 1.0, occlusion) * 1.1);
  } else if (uMaterial < 2.5) {
    vec3 env = studio(reflected, 0.03 + footprint * 0.6);
    float core = smoothstep(0.0, 1.0, facing);
    vec3 glow = mix(base * base * 0.35, min(base * 1.45 + 0.08, vec3(1.0)), core * core);
    vec3 body = glow * mix(0.7, 1.0, occlusion) + base * wrap * 0.18;
    float reflectance = 0.03 + 0.97 * fresnel;
    color = body * (1.0 - reflectance) + tone(env * reflectance * 0.85);
  } else {
    vec3 env = studio(reflected, 0.35 + footprint * 0.6);
    vec3 body = base * (0.3 + 0.7 * wrap) * mix(0.68, 1.0, occlusion);
    body += base * key * 0.12;
    color = body + tone(env * (0.012 + 0.18 * fresnel)) * 0.5;
  }
  float alpha = cover * smoothstep(0.0, 0.18, presence);
  outColor = vec4(color * alpha, alpha);
}`,Lt={balloon:0,chrome:1,jelly:2,clay:3},zt=720,Bt=5200,Qe=1/480,W=(d,f,_)=>Math.min(_,Math.max(f,d)),xt=(d,f,_)=>{let y=d.createShader(f);return y?(d.shaderSource(y,_),d.compileShader(y),d.getShaderParameter(y,d.COMPILE_STATUS)?y:(d.deleteShader(y),null)):null},yt=(d,f)=>{let _=xt(d,d.VERTEX_SHADER,_t),y=xt(d,d.FRAGMENT_SHADER,f),x=d.createProgram();return!_||!y||!x?null:(d.attachShader(x,_),d.attachShader(x,y),d.bindAttribLocation(x,0,"aPosition"),d.bindAttribLocation(x,1,"aRest"),d.bindAttribLocation(x,2,"aStrain"),d.bindAttribLocation(x,3,"aDent"),d.linkProgram(x),d.deleteShader(_),d.deleteShader(y),d.getProgramParameter(x,d.LINK_STATUS)?x:(d.deleteProgram(x),null))},pt=(d,f,_)=>{let y={};for(let x of _)y[x]=d.getUniformLocation(f,x);return y},gt=(d,f,_,y,x)=>{let g=0;y[0]=0,x[0]=-1/0,x[1]=1/0;for(let w=1;w<f;w++){let X=(d[w]+w*w-(d[y[g]]+y[g]*y[g]))/(2*w-2*y[g]);for(;X<=x[g];)g--,X=(d[w]+w*w-(d[y[g]]+y[g]*y[g]))/(2*w-2*y[g]);g++,y[g]=w,x[g]=X,x[g+1]=1/0}g=0;for(let w=0;w<f;w++){for(;x[g+1]<w;)g++;_[w]=(w-y[g])*(w-y[g])+d[y[g]]}},wt=(d,f,_)=>{let y=Math.max(f,_),x=new Float64Array(y),g=new Float64Array(y),w=new Int32Array(y),X=new Float64Array(y+1);for(let I=0;I<f;I++){for(let b=0;b<_;b++)x[b]=d[b*f+I];gt(x,_,g,w,X);for(let b=0;b<_;b++)d[b*f+I]=g[b]}for(let I=0;I<_;I++){for(let b=0;b<f;b++)x[b]=d[I*f+b];gt(x,f,g,w,X);for(let b=0;b<f;b++)d[I*f+b]=Math.sqrt(g[b])}return d},Ut=(d,f,_)=>{let x=new Float64Array(f*_),g=new Int32Array(f*_);for(let R=0;R<f;R++){let v=-1;for(let u=0;u<_;u++){let M=u*f+R;d[M]&&(v=u),g[M]=v,x[M]=v>=0?(u-v)*(u-v):1e20}v=-1;for(let u=_-1;u>=0;u--){let M=u*f+R;d[M]&&(v=u),v>=0&&(v-u)*(v-u)<x[M]&&(x[M]=(v-u)*(v-u),g[M]=v)}}let w=new Float32Array(f*_),X=new Float64Array(f),I=new Int32Array(f),b=new Float64Array(f+1);for(let R=0;R<_;R++){for(let u=0;u<f;u++)X[u]=x[R*f+u];let v=0;I[0]=0,b[0]=-1/0,b[1]=1/0;for(let u=1;u<f;u++){let M=(X[u]+u*u-(X[I[v]]+I[v]*I[v]))/(2*u-2*I[v]);for(;M<=b[v];)v--,M=(X[u]+u*u-(X[I[v]]+I[v]*I[v]))/(2*u-2*I[v]);v++,I[v]=u,b[v]=M,b[v+1]=1/0}v=0;for(let u=0;u<f;u++){for(;b[v+1]<u;)v++;let M=I[v],O=g[R*f+M];w[R*f+u]=O>=0?d[O*f+M]:0}}return w},Xt=(d,f,_)=>{let y=[{width:f,height:_,mask:d}];for(;Math.max(y[y.length-1].width,y[y.length-1].height)>48;){let g=y[y.length-1],w=Math.ceil(g.width/2),X=Math.ceil(g.height/2),I=new Float32Array(w*X);for(let b=0;b<X;b++)for(let R=0;R<w;R++){let v=0,u=0;for(let M=0;M<2;M++)for(let O=0;O<2;O++){let q=R*2+O,ce=b*2+M;q<g.width&&ce<g.height&&(v+=g.mask[ce*g.width+q],u++)}I[b*w+R]=v/u}y.push({width:w,height:X,mask:I})}let x=null;for(let g=y.length-1;g>=0;g--){let{width:w,height:X,mask:I}=y[g],b=new Float32Array(w*X);if(x){let u=y[g+1].width,M=y[g+1].height;for(let O=0;O<X;O++)for(let q=0;q<w;q++){let ce=W((q+.5)/2-.5,0,u-1),ye=W((O+.5)/2-.5,0,M-1),ue=Math.floor(ce),de=Math.floor(ye),Fe=Math.min(u-1,ue+1),Re=Math.min(M-1,de+1),me=ce-ue,pe=ye-de,re=x[de*u+ue]*(1-me)+x[de*u+Fe]*me,Z=x[Re*u+ue]*(1-me)+x[Re*u+Fe]*me;b[O*w+q]=re*(1-pe)+Z*pe}}let R=4**g,v=g===y.length-1?300:60;for(let u=0;u<v;u++)for(let M=0;M<X;M++)for(let O=0;O<w;O++){let q=M*w+O;if(I[q]<.5){b[q]=0;continue}let ce=O>0?b[q-1]:0,ye=O<w-1?b[q+1]:0,ue=M>0?b[q-w]:0,de=M<X-1?b[q+w]:0;b[q]+=((ce+ye+ue+de+R)*.25-b[q])*1.85}x=b}return x},Ze=(d,f,_,y)=>{let x=Math.max(1,Math.round(y)),g=x/2.5,w=[],X=0;for(let R=-x;R<=x;R++){let v=Math.exp(-(R*R)/(2*g*g));w.push(v),X+=v}for(let R=0;R<w.length;R++)w[R]/=X;let I=new Float32Array(f*_),b=new Float32Array(f*_);for(let R=0;R<_;R++)for(let v=0;v<f;v++){let u=0;for(let M=-x;M<=x;M++)u+=d[R*f+W(v+M,0,f-1)]*w[M+x];I[R*f+v]=u}for(let R=0;R<_;R++)for(let v=0;v<f;v++){let u=0;for(let M=-x;M<=x;M++)u+=I[W(R+M,0,_-1)*f+v]*w[M+x];b[R*f+v]=u}return b},Ct=({text:d="Squish",src:f="",fontFamily:_="system-ui, sans-serif",fontWeight:y=900,color:x="#3b5bff",imageColors:g=!0,material:w="balloon",inflate:X=1,stiffness:I=.5,wobble:b=.6,grabRadius:R=70,stretch:v=.5,press:u=.5,shadow:M=.5,intro:O=!0,theme:q="dark",dpr:ce,className:ye="",style:ue,...de})=>{let Fe=(0,ne.useRef)(null),Re=(0,ne.useRef)(null),me=(0,ne.useRef)(null),pe=(0,ne.useRef)(null),re={text:String(d),src:String(f||""),fontFamily:String(_),fontWeight:y,color:String(x),imageColors:g,material:Lt[w]??0,inflate:W(X,.1,3),stiffness:W(I,0,1),wobble:W(b,0,1),grabRadius:W(R,10,400),stretch:W(v,0,1),press:W(u,0,1),shadow:W(M,0,1),intro:O,light:q==="light",dpr:ce},Z=(0,ne.useRef)(re);Z.current=re;let Pe=`${re.text}|${re.src}|${re.fontFamily}|${re.fontWeight}`,nt=(0,ne.useRef)(Pe);return(0,ne.useEffect)(()=>{let ee=Fe.current,ge=Re.current,e=ge?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!ee||!ge||!e)return;let Ie=yt(e,It),Le=yt(e,Pt);if(!Ie||!Le)return;let K=pt(e,Ie,["uViewport","uOffset","uField","uPaint","uSlope","uColor","uPaintMix","uMaterial","uLight","uInflate","uTurn","uClock","uParts"]),he=pt(e,Le,["uViewport","uOffset","uField","uShadowColor","uShadow","uClock","uParts"]),ze=e.createTexture(),Be=e.createTexture(),Ue=e.createTexture();for(let r of[ze,Be,Ue])e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array(4));let Oe=e.createVertexArray(),qe=e.createBuffer(),Ge=e.createBuffer(),Ve=e.createBuffer();e.bindVertexArray(Oe),e.bindBuffer(e.ARRAY_BUFFER,qe),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,Ge),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,36,0),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,36,8),e.enableVertexAttribArray(3),e.vertexAttribPointer(3,3,e.FLOAT,!1,36,24),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,Ve),e.bindVertexArray(null);let Se=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),we=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,be=new Float32Array(256),oe=new Float32Array([1,0,0,0,1,0,0,0,1]),c={cols:0,rows:0,spacing:1,count:0,indices:0,restX:new Float32Array(0),restY:new Float32Array(0),x:new Float32Array(0),y:new Float32Array(0),vx:new Float32Array(0),vy:new Float32Array(0),dent:new Float32Array(0),dentV:new Float32Array(0),grip:new Float32Array(0),gripX:new Float32Array(0),gripY:new Float32Array(0),active:new Uint8Array(0),neighbors:new Int32Array(0),dynamic:new Float32Array(0),anchorX:new Float32Array(0),anchorY:new Float32Array(0),indexType:e.UNSIGNED_SHORT,activeCount:0,width:1,height:1},t={width:1,height:1,ready:!1,fieldWidth:1,fieldHeight:1,fieldScale:1,sdf:new Float32Array(0),parts:[],clock:Z.current.intro&&!we?0:10,colorKey:"",color:[.31,.42,1],pointer:{x:0,y:0,inside:!1,down:!1,startX:0,startY:0,startTime:0,dragging:!1},hover:{x:0,y:0,vx:0,vy:0,power:0},turn:{x:0,y:0,vx:0,vy:0},accumulator:0,energy:1,buildToken:0},Ae=0,Me=0,Xe=!0,We=!0,He=0,At=r=>{if(!Se||!r)return[.31,.42,1];Se.fillStyle="#000000",Se.fillStyle=/^[0-9a-f]{3,8}$/i.test(r)?`#${r}`:r,Se.fillRect(0,0,1,1);let[l,m,i]=Se.getImageData(0,0,1,1).data;return[l/255,m/255,i/255]},$e=(r,l)=>{let m=W(Math.round(r*t.fieldScale),0,t.fieldWidth-1),i=W(Math.round(l*t.fieldScale),0,t.fieldHeight-1);return t.sdf[i*t.fieldWidth+m]||-1e6},Mt=()=>{let{width:r,height:l}=t,m=Math.max(7,Math.sqrt(r*l/Bt)),i=Math.ceil(r/m)+1,s=Math.ceil(l/m)+1,n=i*s,p=r/(i-1),z=l/(s-1);c.cols=i,c.rows=s,c.width=r,c.height=l,c.spacing=(p+z)/2,c.count=n,c.restX=new Float32Array(n),c.restY=new Float32Array(n),c.x=new Float32Array(n),c.y=new Float32Array(n),c.vx=new Float32Array(n),c.vy=new Float32Array(n),c.dent=new Float32Array(n),c.dentV=new Float32Array(n),c.grip=new Float32Array(n),c.gripX=new Float32Array(n),c.gripY=new Float32Array(n),c.active=new Uint8Array(n),c.dynamic=new Float32Array(n*9);let k=new Float32Array(n*2),D=-2.5*c.spacing;for(let T=0;T<s;T++)for(let F=0;F<i;F++){let A=T*i+F,N=F*p,G=T*z;c.restX[A]=N,c.restY[A]=G,c.x[A]=N,c.y[A]=G,k[A*2]=N/r,k[A*2+1]=G/l,c.active[A]=t.ready&&$e(N,G)>D?1:0}let P=new Int32Array(n*8).fill(-1),o=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];for(let T=0;T<s;T++)for(let F=0;F<i;F++){let A=T*i+F;c.active[A]&&o.forEach(([N,G],le)=>{let ae=F+N,xe=T+G;if(ae<0||xe<0||ae>=i||xe>=s)return;let Te=xe*i+ae;c.active[Te]&&(P[A*8+le]=Te)})}c.neighbors=P,c.activeCount=c.active.reduce((T,F)=>T+F,0);let U=-(Math.min(r,l)*.14+c.spacing*3),S=new Uint8Array(n);for(let T=0;T<n;T++)S[T]=t.ready&&$e(c.restX[T],c.restY[T])>U?1:0;let B=[];for(let T=0;T<s-1;T++)for(let F=0;F<i-1;F++){let A=T*i+F,N=A+1,G=A+i,le=G+1;(S[A]||S[N]||S[G]||S[le])&&B.push(A,G,N,N,G,le)}let L=n>65535?new Uint32Array(B):new Uint16Array(B);c.indexType=n>65535?e.UNSIGNED_INT:e.UNSIGNED_SHORT,c.indices=B.length,e.bindBuffer(e.ARRAY_BUFFER,qe),e.bufferData(e.ARRAY_BUFFER,k,e.STATIC_DRAW),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,Ve),e.bufferData(e.ELEMENT_ARRAY_BUFFER,L,e.STATIC_DRAW),rt()},rt=()=>{let{cols:r,rows:l,x:m,y:i,dent:s,dynamic:n,spacing:p}=c,z=c.width/Math.max(1,r-1),k=c.height/Math.max(1,l-1);for(let D=0;D<l;D++)for(let P=0;P<r;P++){let o=D*r+P,U=P>0?o-1:o,S=P<r-1?o+1:o,B=D>0?o-r:o,L=D<l-1?o+r:o,T=(S-U)*z||p,F=(L-B)/r*k||p,A=o*9;n[A]=m[o],n[A+1]=i[o],n[A+2]=(m[S]-m[U])/T,n[A+3]=(i[S]-i[U])/T,n[A+4]=(m[L]-m[B])/F,n[A+5]=(i[L]-i[B])/F,n[A+6]=s[o],n[A+7]=(s[S]-s[U])/T,n[A+8]=(s[L]-s[B])/F}e.bindBuffer(e.ARRAY_BUFFER,Ge),e.bufferData(e.ARRAY_BUFFER,n,e.DYNAMIC_DRAW)},Ke=async()=>{let r=Z.current,l=++t.buildToken,{width:m,height:i}=t,s=Math.min(1,zt/Math.max(m,i)),n=Math.max(8,Math.round(m*s)),p=Math.max(8,Math.round(i*s)),z=document.createElement("canvas");z.width=n,z.height=p;let k=z.getContext("2d",{willReadFrequently:!0});if(!k)return;let D=!1;if(r.src){let a=new Image;a.crossOrigin="anonymous",a.decoding="async",a.src=r.src;try{await a.decode()}catch{return}if(l!==t.buildToken)return;let E=Math.min(n*.78/a.naturalWidth,p*.74/a.naturalHeight),H=a.naturalWidth*E,Y=a.naturalHeight*E;k.drawImage(a,(n-H)/2,(p-Y)/2,H,Y),D=!0}else{let a=r.fontFamily,E=r.fontWeight;if(document.fonts&&await document.fonts.load(`${E} 100px ${a}`).catch(()=>null),l!==t.buildToken)return;let H=r.text.split(`
`);k.font=`${E} 100px ${a}`;let Y=1,h=0,j=0;for(let J of H){let V=k.measureText(J||" ");Y=Math.max(Y,V.actualBoundingBoxLeft+V.actualBoundingBoxRight),h=Math.max(h,V.actualBoundingBoxAscent),j=Math.max(j,V.actualBoundingBoxDescent)}let fe=100*1.02,C=h+j+fe*(H.length-1),$=Math.min(n*.8/Y,p*.7/C)*100;k.font=`${E} ${$}px ${a}`,k.fillStyle="#ffffff",k.textAlign="center",k.textBaseline="alphabetic";let te=$/100,Je=(p-C*te)/2+h*te;H.forEach((J,V)=>{let ie=k.measureText(J||" "),kt=(ie.actualBoundingBoxLeft-ie.actualBoundingBoxRight)/2;k.fillText(J,n/2+kt,Je+V*fe*te)}),D=!0}if(!D||l!==t.buildToken)return;let P=k.getImageData(0,0,n,p).data,o=n*p,U=new Float32Array(o),S=new Float64Array(o),B=new Float64Array(o);for(let a=0;a<o;a++){let E=P[a*4+3]/255;U[a]=E,S[a]=E>.5?1e10:0,B[a]=E>.5?0:1e10}wt(S,n,p),wt(B,n,p);let L=new Float32Array(o),T=new Float32Array(o);for(let a=0;a<o;a++)L[a]=U[a]>.5?1:0,T[a]=U[a]>.02&&U[a]<.98?U[a]-.5:S[a]>0?S[a]-.5:.5-B[a];let F=new Int32Array(o),A=[],N=new Int32Array(o);for(let a=0;a<o;a++){if(!L[a]||F[a])continue;let E=A.length+1,H=0,Y=0,h=0,j=0,fe=1/0;for(N[Y++]=a,F[a]=E;H<Y;){let C=N[H++],$=C%n,te=(C-$)/n;h+=$,j+=te,$<fe&&(fe=$),$>0&&L[C-1]&&!F[C-1]&&(F[C-1]=E,N[Y++]=C-1),$<n-1&&L[C+1]&&!F[C+1]&&(F[C+1]=E,N[Y++]=C+1),te>0&&L[C-n]&&!F[C-n]&&(F[C-n]=E,N[Y++]=C-n),te<p-1&&L[C+n]&&!F[C+n]&&(F[C+n]=E,N[Y++]=C+n)}A.push({x:h/Y/s,y:j/Y/s,left:fe,size:Y,delay:0})}let G=[...A].sort((a,E)=>a.left-E.left),le=G.length>1?Math.min(.07,.5/(G.length-1)):0;G.forEach((a,E)=>{a.delay=E*le});let ae=A.length<=64?Ut(F,n,p):new Float32Array(o),xe=Ze(Xt(L,n,p),n,p,2),Te=Ze(T,n,p,2),ke=Ze(L,n,p,Math.max(4,Math.min(n,p)*.045)),ve=new Float32Array(o*4),De=new Float32Array(o),Q=new Float32Array(o);for(let a=0;a<o;a++){let E=Te[a]/s;De[a]=E,Q[a]=Math.sqrt(Math.max(0,2*xe[a]))/s,ve[a*4]=Q[a],ve[a*4+1]=E,ve[a*4+2]=ke[a],ve[a*4+3]=ae[a]}let Ee=new Float32Array(o*2);for(let a=0;a<p;a++)for(let E=0;E<n;E++){let H=a*n+E,Y=(Q[a*n+Math.min(n-1,E+1)]-Q[a*n+Math.max(0,E-1)])*.5*s,h=(Q[Math.min(p-1,a+1)*n+E]-Q[Math.max(0,a-1)*n+E])*.5*s,j=Math.hypot(Y,h);j>7&&(Y*=7/j,h*=7/j),Ee[H*2]=Y,Ee[H*2+1]=h}e.bindTexture(e.TEXTURE_2D,ze),e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,n,p,0,e.RGBA,e.FLOAT,ve),e.bindTexture(e.TEXTURE_2D,Ue),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,n,p,0,e.RG,e.FLOAT,Ee),e.bindTexture(e.TEXTURE_2D,Be),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,z),t.fieldWidth=n,t.fieldHeight=p,t.fieldScale=s,t.sdf=De,t.parts=A,be.fill(0),A.slice(0,64).forEach((a,E)=>{be[E*4]=a.x/m,be[E*4+1]=a.y/i,be[E*4+2]=a.delay}),t.ready=!0,Mt(),se()},Tt=(r,l)=>{let{count:m,x:i,y:s,vx:n,vy:p,restX:z,restY:k,dent:D,dentV:P,active:o,neighbors:U,grip:S,gripX:B,gripY:L,spacing:T}=c,F=.4+l.stiffness*1.2,A=350*F*F,N=A*(52/Math.sqrt(F)/T)**2,G=we?.8:.5-l.wobble*.42,le=2*G*Math.sqrt(A),ae=A*1.4,xe=ae*(18/T)**2,Te=2*(G+.06)*Math.sqrt(ae),ke=A*30,ve=1.2*Math.sqrt(ke),De=t.pointer.dragging?0:10,Q=t.hover,Ee=l.grabRadius*.32,a=1/(2*Ee*Ee),E=Q.power*l.press,H=t.pointer.dragging?1.6:1,Y=0;for(let h=0;h<m;h++){if(!o[h])continue;let j=i[h]-z[h],fe=s[h]-k[h],C=-A*j-le*n[h],$=-A*fe-le*p[h],te=-ae*D[h]-Te*P[h],Je=h*8;for(let J=0;J<8;J++){let V=U[Je+J];if(V<0)continue;let ie=J<4?1:.5;C+=N*ie*(i[V]-z[V]-j),$+=N*ie*(s[V]-k[V]-fe),te+=xe*ie*(D[V]-D[h])}if(E>.001){let J=i[h]-Q.x,V=s[h]-Q.y,ie=Math.exp(-(J*J+V*V)*a);te+=ae*2.6*H*E*ie,C+=(A*.3*J+De*Q.vx)*E*ie,$+=(A*.3*V+De*Q.vy)*E*ie}S[h]>0&&(C+=S[h]*(ke*(B[h]-i[h])-ve*n[h]),$+=S[h]*(ke*(L[h]-s[h])-ve*p[h])),n[h]+=C*r,p[h]+=$*r,P[h]+=te*r,Y+=Math.abs(n[h])+Math.abs(p[h])+Math.abs(P[h])*T}for(let h=0;h<m;h++)o[h]&&(i[h]+=n[h]*r,s[h]+=p[h]*r,D[h]=W(D[h]+P[h]*r,-.6,.85));return Y},Et=r=>{let{pointer:l}=t,{count:m,grip:i,gripX:s,gripY:n}=c;if(!l.dragging)return;let p=Math.max(20,Math.min(t.width,t.height)*(.08+r.stretch*.32)),z=l.x-l.startX,k=l.y-l.startY,D=Math.hypot(z,k),P=D>0?p*Math.tanh(D/p)/D:0;for(let o=0;o<m;o++)i[o]<=0||(s[o]=c.anchorX[o]+z*P,n[o]=c.anchorY[o]+k*P)},Ft=(r,l,m)=>{let{count:i,x:s,y:n,grip:p,active:z}=c,k=m.grabRadius*.3,D=1/(2*k*k);c.anchorX=new Float32Array(i),c.anchorY=new Float32Array(i);let P=0;for(let o=0;o<i;o++){if(!z[o])continue;let U=s[o]-r,S=n[o]-l,B=Math.exp(-(U*U+S*S)*D);p[o]=B>.03?B:0,c.anchorX[o]=s[o],c.anchorY[o]=n[o],P+=p[o]}return P>0},Rt=()=>{c.grip.fill(0),t.pointer.dragging=!1},St=(r,l,m)=>{let{count:i,x:s,y:n,vx:p,vy:z,dentV:k,active:D}=c,P=m.grabRadius,o=1/(2*P*P),U=.4+m.press;for(let S=0;S<i;S++){if(!D[S])continue;let B=s[S]-r,L=n[S]-l,T=Math.exp(-(B*B+L*L)*o);k[S]+=9*U*T,p[S]+=B*9*U*T,z[S]+=L*9*U*T}},ot=(r,l)=>{let{cols:m,rows:i,x:s,y:n,active:p,spacing:z}=c,k=1/0,D=-1,P=Math.ceil(80/z),o=W(Math.round(r/(c.width/Math.max(1,m-1))),0,m-1),U=W(Math.round(l/(c.height/Math.max(1,i-1))),0,i-1);for(let S=Math.max(0,U-P);S<=Math.min(i-1,U+P);S++)for(let B=Math.max(0,o-P);B<=Math.min(m-1,o+P);B++){let L=S*m+B;if(!p[L])continue;let T=Math.hypot(s[L]-r,n[L]-l);T<k&&(k=T,D=L)}return D<0?!1:$e(c.restX[D]+(r-s[D]),c.restY[D]+(l-n[D]))>-4},at=()=>{let r=Z.current,l=Math.max(1,ee.clientWidth),m=Math.max(1,ee.clientHeight),i=Math.min(r.dpr||window.devicePixelRatio||1,2);if(ge.width=Math.max(1,Math.round(l*i)),ge.height=Math.max(1,Math.round(m*i)),l!==t.width||m!==t.height){let s=!t.ready&&!t.buildToken;t.width=l,t.height=m,window.clearTimeout(He),s?Ke():He=window.setTimeout(Ke,160)}se()},it=()=>{let r=Z.current,l=r.color;if(l!==t.colorKey&&(t.colorKey=l,t.color=At(r.color)),e.viewport(0,0,ge.width,ge.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),!t.ready||!c.indices)return;if(e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.bindVertexArray(Oe),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,ze),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,Be),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,Ue),r.shadow>0){e.useProgram(Le),e.uniform2f(he.uViewport,c.width,c.height);let k=Math.min(c.width,c.height)*.035*r.inflate;e.uniform2f(he.uOffset,k*.25,k),e.uniform1i(he.uField,0),r.light?e.uniform3f(he.uShadowColor,.08,.08,.14):e.uniform3f(he.uShadowColor,0,0,0),e.uniform1f(he.uShadow,r.shadow*(r.light?.35:.7)),e.uniform1f(he.uClock,t.clock),e.uniform4fv(he.uParts,be),e.drawElements(e.TRIANGLES,c.indices,c.indexType,0)}e.useProgram(Ie),e.uniform2f(K.uViewport,c.width,c.height),e.uniform2f(K.uOffset,0,0),e.uniform1i(K.uField,0),e.uniform1i(K.uPaint,1),e.uniform1i(K.uSlope,2);let m=t.turn.x,i=t.turn.y,s=Math.cos(m),n=Math.sin(m),p=Math.cos(i),z=Math.sin(i);oe[0]=s,oe[1]=n*z,oe[2]=-n*p,oe[3]=0,oe[4]=p,oe[5]=z,oe[6]=n,oe[7]=-s*z,oe[8]=s*p,e.uniformMatrix3fv(K.uTurn,!1,oe),e.uniform3f(K.uColor,t.color[0],t.color[1],t.color[2]),e.uniform1f(K.uPaintMix,r.src&&r.imageColors?1:0),e.uniform1f(K.uMaterial,r.material),e.uniform1f(K.uLight,r.light?1:0),e.uniform1f(K.uInflate,r.inflate),e.uniform1f(K.uClock,t.clock),e.uniform4fv(K.uParts,be),e.drawElements(e.TRIANGLES,c.indices,c.indexType,0),e.bindVertexArray(null)},ct=r=>{if(Ae=0,!We||!Xe||document.hidden)return;let l=Z.current,m=Me?Math.min(.05,(r-Me)/1e3):1/60;Me=r,we||!l.intro?t.clock=10:t.ready&&t.clock<10&&(t.clock=t.clock+m>1.8?10:t.clock+m);let i=t.hover,s=t.pointer,n=t.ready&&(s.dragging||s.inside&&!s.down&&ot(s.x,s.y)),p=1-Math.exp(-m/.05),z=i.x+(s.x-i.x)*p,k=i.y+(s.y-i.y)*p,D=1-Math.exp(-m/.04);i.vx+=((z-i.x)/Math.max(m,.001)-i.vx)*D,i.vy+=((k-i.y)/Math.max(m,.001)-i.vy)*D,i.x=z,i.y=k;let P=n?1:0;i.power+=(P-i.power)*(1-Math.exp(-m/(n?.12:.25)));let o=t.turn,U=s.inside&&!we?(s.x/Math.max(1,c.width)-.5)*.7:0,S=s.inside&&!we?(s.y/Math.max(1,c.height)-.5)*.4:0;o.vx+=(28*(U-o.x)-10*o.vx)*m,o.vy+=(28*(S-o.y)-10*o.vy)*m,o.x+=o.vx*m,o.y+=o.vy*m;let B=Math.abs(U-o.x)>5e-4||Math.abs(S-o.y)>5e-4||Math.abs(o.vx)>.001||Math.abs(o.vy)>.001,L=0;if(t.ready){Et(l),t.accumulator+=m;let F=0;for(;t.accumulator>=Qe&&F<40;)L=Tt(Qe,l),t.accumulator-=Qe,F++;F===40&&(t.accumulator=0),rt()}t.energy=L,it(),!t.ready||t.clock<10||Math.abs(P-i.power)>.002||B||Math.hypot(s.x-i.x,s.y-i.y)>.1||s.dragging||L>.05*Math.max(1,c.activeCount)?Ae=requestAnimationFrame(ct):Me=0},se=()=>{!Ae&&We&&Xe&&!document.hidden&&(Ae=requestAnimationFrame(ct))},je=r=>{let l=ee.getBoundingClientRect();t.pointer.x=r.clientX-l.left,t.pointer.y=r.clientY-l.top,t.pointer.inside=t.pointer.x>=0&&t.pointer.y>=0&&t.pointer.x<=l.width&&t.pointer.y<=l.height},st=r=>{je(r),se()},lt=r=>{if(je(r),!t.ready||!ot(t.pointer.x,t.pointer.y))return;let l=Z.current;t.pointer.down=!0,t.pointer.startX=t.pointer.x,t.pointer.startY=t.pointer.y,t.pointer.startTime=performance.now(),t.pointer.dragging=Ft(t.pointer.x,t.pointer.y,l),ee.setPointerCapture?.(r.pointerId),se()},Ce=r=>{if(!t.pointer.down)return;je(r);let l=Z.current,m=Math.hypot(t.pointer.x-t.pointer.startX,t.pointer.y-t.pointer.startY),i=performance.now()-t.pointer.startTime<260;Rt(),m<8&&i&&St(t.pointer.x,t.pointer.y,l),t.pointer.down=!1,se()},ft=()=>{t.pointer.inside=!1,se()},ut=()=>{Me=0,se()},dt=new ResizeObserver(at);dt.observe(ee);let mt=new IntersectionObserver(r=>{Xe=r.some(l=>l.isIntersecting),Xe&&(Me=0,se())});return mt.observe(ee),ee.addEventListener("pointerdown",lt),window.addEventListener("pointermove",st,{passive:!0}),window.addEventListener("pointerup",Ce),window.addEventListener("pointercancel",Ce),ee.addEventListener("pointerleave",ft),document.addEventListener("visibilitychange",ut),at(),pe.current=()=>{t.ready=!1,t.clock=Z.current.intro&&!we?0:10,Ke()},me.current=()=>{Ae||it(),se()},()=>{We=!1,t.buildToken++,cancelAnimationFrame(Ae),window.clearTimeout(He),me.current=null,pe.current=null,dt.disconnect(),mt.disconnect(),ee.removeEventListener("pointerdown",lt),window.removeEventListener("pointermove",st),window.removeEventListener("pointerup",Ce),window.removeEventListener("pointercancel",Ce),ee.removeEventListener("pointerleave",ft),document.removeEventListener("visibilitychange",ut),e.deleteBuffer(qe),e.deleteBuffer(Ge),e.deleteBuffer(Ve),e.deleteVertexArray(Oe),e.deleteTexture(ze),e.deleteTexture(Be),e.deleteTexture(Ue),e.deleteProgram(Ie),e.deleteProgram(Le)}},[]),(0,ne.useEffect)(()=>{nt.current!==Pe&&(nt.current=Pe,pe.current?.())},[Pe]),(0,ne.useEffect)(()=>{me.current?.()}),(0,et.jsx)("div",{ref:Fe,className:["relative h-full w-full touch-pan-y select-none overflow-hidden",ye].filter(Boolean).join(" "),style:ue,role:"img","aria-label":re.src?"Elastic logo":re.text,...de,children:(0,et.jsx)("canvas",{ref:Re,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},bt=Ct;var tt=_e(Ye(),1),Yt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Ne=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ht=Yt.map((d,f)=>({id:f+1,image:d,src:d,img:d,url:d,title:Ne[f],text:Ne[f],label:Ne[f],alt:Ne[f],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][f],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Nt({big:d}){return(0,tt.jsx)(vt,{big:d,dark:!0,center:!0,zoom:1,drive:!1,children:(0,tt.jsx)(bt,{})})}var $t=ht(Nt);export{$t as default};
