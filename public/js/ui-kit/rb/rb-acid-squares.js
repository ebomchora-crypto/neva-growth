import{c as U,i as lt,j as Q,l as Me,m as ke}from"./chunks/chunk-6IYH4WPJ.js";var z=U(lt(),1),le=U(Q(),1),J=8,Ge={low:150,medium:210,high:280},$=[-42,-76,84,94],ze=2400,N=3,st=2.6,ut=19,G=[0,-3],ft={press:1,lift:-1,none:0},Ce={split:[[7,4.2,-4,4,4],[-8,3.6,3,4,4]],backlit:[[6,1.6,-15,5,3],[-7,1.4,-13,5,3]],overhead:[[3,7.5,-4,3,3],[-3,7,-1,3,3]]},dt=Math.PI/180,Le=`
uniform vec4 uRipples[${J}];
uniform vec4 uWave;
uniform float uSquare;
uniform float uClock;
uniform vec4 uSwell;
uniform vec4 uHover;
uniform vec4 uIntro;

float reachOf(vec2 delta, out vec2 grad) {
  vec2 a = abs(delta);
  vec2 dir = vec2(delta.x < 0.0 ? -1.0 : 1.0, delta.y < 0.0 ? -1.0 : 1.0);
  float round_ = length(delta);
  vec2 roundGrad = delta / max(round_, 1e-4);
  float m = max(max(a.x, a.y), 1e-4);
  vec2 k = a / m;
  vec2 k3 = k * k * k;
  float sum = dot(k3, k);
  float root = sqrt(sqrt(sum));
  float square = m * root;
  vec2 squareGrad = dir * k3 / (root * root * root);
  float d = mix(round_, square, uSquare);
  vec2 g = mix(roundGrad, squareGrad, uSquare);
  float soft = sqrt(d * d + 0.36);
  grad = g * d / soft;
  return soft - 0.6;
}

vec3 field(vec2 p) {
  float t = uSwell.w;
  float f = uSwell.y;
  vec2 k1 = vec2(0.19, 0.11) * f;
  vec2 k2 = vec2(-0.09, 0.23) * f;
  vec2 k3 = vec2(0.29, -0.17) * f;
  float a1 = dot(p, k1) + t * 0.55;
  float a2 = dot(p, k2) - t * 0.42 + 1.3;
  float a3 = dot(p, k3) + t * 0.74 + 2.1;
  float h = 0.55 * sin(a1) + 0.4 * sin(a2) + 0.22 * sin(a3);
  vec2 g = 0.55 * cos(a1) * k1 + 0.4 * cos(a2) * k2 + 0.22 * cos(a3) * k3;
  h *= uSwell.x;
  g *= uSwell.x;
  vec2 dg;
  for (int i = 0; i < ${J}; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    float age = uClock - r.z;
    if (age <= 0.0) continue;
    float d = reachOf(p - r.xy, dg);
    float radius = age * uWave.y;
    float x = (d - radius) / uWave.z;
    float life = clamp(1.0 - radius / uWave.w, 0.0, 1.0);
    float strength = r.w * uWave.x * life * life * smoothstep(0.0, 1.5, radius);
    float bump = exp(-x * x);
    h += bump * strength;
    g += -2.0 * x * bump * strength / uWave.z * dg;
  }
  if (uIntro.w > 0.0) {
    float d = reachOf(p - uIntro.xy, dg);
    float x = (d - uIntro.z) / 2.2;
    float bump = exp(-x * x) * uIntro.w;
    h += bump;
    g += -2.0 * x * bump / 2.2 * dg;
  }
  vec2 hd = p - uHover.xy;
  float hr = max(uHover.z, 1e-3);
  float hover = exp(-dot(hd, hd) / (hr * hr)) * uHover.w;
  h -= hover;
  g += 2.0 * hd / (hr * hr) * hover;
  return vec3(h, g);
}
`,mt=`#version 300 es
precision highp float;
${Le}
layout(location = 0) in vec2 aGrid;
uniform mat4 uViewProj;
uniform vec4 uArea;
out vec2 vGround;
out vec3 vWorld;
void main() {
  vec2 ground = uArea.xy + aGrid * uArea.zw;
  vec3 f = field(ground);
  vWorld = vec3(ground.x, f.x, ground.y);
  vGround = ground;
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`,ht=`#version 300 es
precision highp float;
${Le}
uniform vec3 uEye;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uSecond;
uniform vec3 uLightA;
uniform vec3 uLightB;
uniform float uTile;
uniform float uAngle;
uniform float uGap;
uniform float uRound;
uniform float uSoftness;
uniform float uBulge;
uniform float uGloss;
uniform vec2 uRange;
uniform float uBrightness;
uniform float uGrain;
uniform float uGrainScale;
uniform float uLightMode;
uniform float uOpacity;
uniform vec4 uReveal;
uniform vec2 uView;
uniform float uFade;
uniform float uFrame;
in vec2 vGround;
in vec3 vWorld;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 f = field(vGround);
  vec3 n0 = normalize(vec3(-f.y, 1.0, -f.z));
  vec3 tx = normalize(vec3(1.0, f.y, 0.0));
  vec3 tz = normalize(cross(tx, n0));
  tx = normalize(cross(n0, tz));

  float c = cos(uAngle);
  float s = sin(uAngle);
  mat2 toTile = mat2(c, -s, s, c);
  vec2 q = toTile * vGround / uTile;
  vec2 cell = floor(q);
  vec2 local = q - cell - 0.5;
  float footprint = max(length(fwidth(q)), 1e-5);

  float on = 1.0;
  if (uReveal.w < 1.0) {
    vec2 centre = transpose(toTile) * (cell + 0.5) * uTile;
    vec2 dg;
    float d = reachOf(centre - uReveal.xy, dg);
    float delay = hash(vec3(cell, 7.0)) * 1.1;
    on = max(smoother((uReveal.z - d - delay) / 1.6), uReveal.w);
  }

  float half_ = (0.5 - uGap * 0.5) * mix(0.62, 1.0, on);
  float radius = min(uRound * half_, half_);
  vec2 dd = abs(local) - (half_ - radius);
  float d = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - radius;
  vec2 outward = dd.x > 0.0 || dd.y > 0.0 ? normalize(max(dd, 0.0) * sign(local)) : (dd.x > dd.y ? vec2(sign(local.x), 0.0) : vec2(0.0, sign(local.y)));

  float bevelWidth = max(mix(0.04, 0.42, uSoftness) * half_, footprint * 1.5);
  float edge = clamp((d + bevelWidth) / bevelWidth, 0.0, 1.0);
  float dome = uBulge * 0.5 * length(local) / max(half_, 1e-3);
  float theta = edge * edge * mix(0.7, 1.35, uSoftness) + dome;
  vec2 outwardGround = transpose(toTile) * outward;
  vec2 domeGround = transpose(toTile) * (local / max(length(local), 1e-4));
  vec3 bend = normalize(tx * mix(domeGround.x, outwardGround.x, edge) + tz * mix(domeGround.y, outwardGround.y, edge));
  float crowd = smoothstep(0.08, 0.3, footprint);
  theta *= 1.0 - crowd;
  vec3 n = normalize(n0 * cos(theta) + bend * sin(theta));

  float inside = 1.0 - smoothstep(-footprint * 0.75, footprint * 0.75, d);
  float area = (2.0 * half_) * (2.0 * half_) - (4.0 - 3.14159) * radius * radius;
  inside = mix(inside, area, crowd) * on;

  vec3 toEye = uEye - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 la = uLightA - vWorld;
  vec3 lb = uLightB - vWorld;
  float da = length(la);
  float db = length(lb);
  la /= da;
  lb /= db;
  float fa = 1.0 / (1.0 + da * da * 0.02);
  float fb = 1.0 / (1.0 + db * db * 0.02);

  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  vec3 ha = normalize(la + v);
  vec3 hb = normalize(lb + v);
  float shine = mix(10.0, 90.0, uGloss);
  float norm = (shine + 8.0) / 60.0;
  float specA = pow(max(dot(n, ha), 0.0), shine) * norm;
  float specB = pow(max(dot(n, hb), 0.0), shine) * norm;
  float sheenA = pow(max(dot(n, ha), 0.0), 8.0);
  float sheenB = pow(max(dot(n, hb), 0.0), 8.0);
  float diffA = max(dot(n, la), 0.0);
  float diffB = max(dot(n, lb), 0.0);
  vec3 r = reflect(-v, n);
  float rim = exp((dot(r, normalize(vec3(0.15, 0.55, -1.0))) - 1.0) * 6.0);
  float occlusion = mix(1.0, 0.35, edge * edge);
  float edgeLight = edge * edge;

  vec3 color;
  float alpha;
  if (uLightMode > 0.5) {
    float luma = dot(uColor, vec3(0.299, 0.587, 0.114));
    vec3 body = mix(vec3(luma), uColor, 0.5) * 0.96;
    vec3 keyDir = normalize(vec3(-0.35, 0.85, 0.45));
    float shade = clamp(dot(n, keyDir) * 0.6 + 0.5, 0.0, 1.0);
    float wa = clamp(diffA * fa * 9.0, 0.0, 1.0);
    float wb = clamp(diffB * fb * 9.0, 0.0, 1.0);
    vec3 hue = (uAccent * wa + uSecond * wb) / max(wa + wb, 1e-3);
    vec3 lit = body * mix(vec3(1.0), hue, clamp(wa + wb, 0.0, 1.0) * 0.42) * mix(0.7, 1.05, shade);
    lit += vec3(1.0) * (specA * fa + specB * fb) * 2.4 * uGloss;
    lit *= mix(1.0, 0.8, edgeLight * (1.0 - crowd));
    color = lit;
    alpha = inside;
  } else {
    float luma = dot(uColor, vec3(0.299, 0.587, 0.114));
    vec3 body = mix(vec3(luma), uColor, 0.35) + vec3(0.02);
    vec3 lit = body * 0.25;
    lit += body * (uAccent * diffA * fa + uSecond * diffB * fb) * 14.0;
    lit += uAccent * (specA * (0.55 + 1.6 * edgeLight) + sheenA * 0.3) * fa * 9.0 * uGloss;
    lit += uSecond * (specB * (0.55 + 1.6 * edgeLight) + sheenB * 0.3) * fb * 9.0 * uGloss;
    lit += mix(uSecond, vec3(1.0), 0.4) * rim * fresnel * 0.35 * uGloss;
    lit *= occlusion;
    color = lit * inside;
    alpha = inside;
  }

  float fade = 1.0 - smoother((dist - uRange.x) / max(uRange.y - uRange.x, 1e-3));
  alpha *= fade * uOpacity;
  color *= uBrightness;
  if (uLightMode < 0.5) color = 1.0 - exp(-color * 1.1);

  vec2 grainCell = floor(gl_FragCoord.xy / uGrainScale);
  float grain = hash(vec3(grainCell, uFrame)) + hash(vec3(grainCell + 17.0, uFrame + 3.0)) - 1.0;
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color += grain * uGrain * (uLightMode > 0.5 ? 0.6 : 0.25 + 0.75 * sqrt(clamp(lum, 0.0, 1.0)));
  color = clamp(color, 0.0, 1.0);

  vec2 uv = gl_FragCoord.xy / uView;
  float edgeFade = max(uFade * 0.5, 1e-4);
  float mask = uFade > 0.0 ? smoother(uv.x / edgeFade) * smoother((1.0 - uv.x) / edgeFade) * smoother(uv.y / edgeFade) * smoother((1.0 - uv.y) / edgeFade) : 1.0;
  alpha *= mask;
  outColor = vec4(color * alpha, alpha);
}`,vt=["uRipples","uWave","uSquare","uClock","uSwell","uHover","uIntro","uViewProj","uArea","uEye","uColor","uAccent","uSecond","uLightA","uLightB","uTile","uAngle","uGap","uRound","uSoftness","uBulge","uGloss","uRange","uBrightness","uGrain","uGrainScale","uLightMode","uOpacity","uReveal","uView","uFade","uFrame"],x=(e,c,f)=>Math.min(f,Math.max(c,e)),pt=e=>{let c=x(e,0,1);return 1-(1-c)*(1-c)*(1-c)},gt=e=>{let c=x(e,0,1);return c*c*c*(c*(c*6-15)+10)},xt=(e,c,f)=>{let l=x((f-e)/(c-e),0,1);return l*l*(3-2*l)},Fe=(e,c,f)=>{let l=e.createShader(c);return l?(e.shaderSource(l,f),e.compileShader(l),e.getShaderParameter(l,e.COMPILE_STATUS)?l:(e.deleteShader(l),null)):null},bt=(e,c,f)=>{let l=Fe(e,e.VERTEX_SHADER,c),d=Fe(e,e.FRAGMENT_SHADER,f),h=e.createProgram();if(!l||!d||!h)return null;if(e.attachShader(h,l),e.attachShader(h,d),e.linkProgram(h),e.deleteShader(l),e.deleteShader(d),!e.getProgramParameter(h,e.LINK_STATUS))return e.deleteProgram(h),null;let b={};for(let w of vt)b[w]=e.getUniformLocation(h,w);return{program:h,uniforms:b}},wt=(e,c,f,l)=>{let d=1/Math.tan(e/2),h=1/(f-l);return[d/c,0,0,0,0,d,0,0,0,0,(l+f)*h,-1,0,0,2*l*f*h,0]},yt=(e,c)=>{let f=e[0]-c[0],l=e[1]-c[1],d=e[2]-c[2],h=Math.hypot(f,l,d)||1;f/=h,l/=h,d/=h;let b=d,w=-f;h=Math.hypot(b,w)||1,b/=h,w/=h;let R=l*w,E=d*b-f*w,M=-l*b;return[b,R,f,0,0,E,l,0,w,M,d,0,-(b*e[0]+w*e[2]),-(R*e[0]+E*e[1]+M*e[2]),-(f*e[0]+l*e[1]+d*e[2]),1]},St=(e,c)=>{let f=new Array(16);for(let l=0;l<4;l+=1)for(let d=0;d<4;d+=1)f[l*4+d]=e[d]*c[l*4]+e[4+d]*c[l*4+1]+e[8+d]*c[l*4+2]+e[12+d]*c[l*4+3];return f},At=e=>{let c=e[0]*e[5]-e[1]*e[4],f=e[0]*e[6]-e[2]*e[4],l=e[0]*e[7]-e[3]*e[4],d=e[1]*e[6]-e[2]*e[5],h=e[1]*e[7]-e[3]*e[5],b=e[2]*e[7]-e[3]*e[6],w=e[8]*e[13]-e[9]*e[12],R=e[8]*e[14]-e[10]*e[12],E=e[8]*e[15]-e[11]*e[12],M=e[9]*e[14]-e[10]*e[13],C=e[9]*e[15]-e[11]*e[13],F=e[10]*e[15]-e[11]*e[14],j=c*F-f*C+l*M+d*E-h*R+b*w,p=j?1/j:0;return[(e[5]*F-e[6]*C+e[7]*M)*p,(e[2]*C-e[1]*F-e[3]*M)*p,(e[13]*b-e[14]*h+e[15]*d)*p,(e[10]*h-e[9]*b-e[11]*d)*p,(e[6]*E-e[4]*F-e[7]*R)*p,(e[0]*F-e[2]*E+e[3]*R)*p,(e[14]*l-e[12]*b-e[15]*f)*p,(e[8]*b-e[10]*l+e[11]*f)*p,(e[4]*C-e[5]*E+e[7]*w)*p,(e[1]*E-e[0]*C-e[3]*w)*p,(e[12]*h-e[13]*l+e[15]*c)*p,(e[9]*l-e[8]*h-e[11]*c)*p,(e[5]*R-e[4]*M-e[6]*w)*p,(e[0]*M-e[1]*R+e[2]*w)*p,(e[13]*f-e[12]*d-e[14]*c)*p,(e[8]*d-e[9]*f+e[10]*c)*p]},Rt=({color:e="#120f17",accentColor:c="#ff4fb8",secondaryColor:f="#3b6bff",tileSize:l=1,gap:d=.12,roundness:h=.25,softness:b=.5,bulge:w=.3,rotation:R=35,gloss:E=.6,waves:M=1,waveScale:C=1,speed:F=.6,shape:j="square",pulse:p=1,pulseSpeed:Te=.45,pulseSpacing:_e=1,pulseWidth:Ie=1,pulseOrigin:Pe="center",brightness:De=1,lighting:Oe="split",tilt:qe=.7,zoom:We=1,depth:Ve=10,grain:Ne=.12,fade:He=0,opacity:Ue=1,intro:$e=!0,mouseInteraction:je=!0,hoverEffect:Xe="press",mouseStrength:Ye=1,mouseRadius:Ke=.35,pulseOnClick:Qe=!0,detail:Je="medium",lightMode:Ze=!1,paused:et=!1,dpr:tt,...ot})=>{let ue=(0,z.useRef)(null),fe=(0,z.useRef)(null),ee=(0,z.useRef)(null),de={color:String(e),accentColor:String(c),secondaryColor:String(f),tileSize:x(l,.2,5),gap:x(d,0,.6),roundness:x(h,0,1),softness:x(b,0,1),bulge:x(w,0,1.5),rotation:R*dt,gloss:x(E,0,1),waves:Math.max(0,M),waveScale:x(C,.1,5),speed:Math.max(0,F),square:j==="round"?0:1,pulse:Math.max(0,p),pulseSpeed:Math.max(0,Te),pulseSpacing:x(_e,.2,6),pulseWidth:x(Ie,.1,5),randomOrigin:Pe==="random",brightness:Math.max(0,De),lights:Ce[Oe]||Ce.split,tilt:x(qe,0,1),zoom:x(We,.3,4),depth:x(Ve,2,40),grain:Math.max(0,Ne),fade:x(He,0,1),opacity:x(Ue,0,1),intro:$e,mouseInteraction:je,hover:ft[Xe]??1,mouseStrength:Math.max(0,Ye),mouseRadius:x(Ke,.02,2),pulseOnClick:Qe,mesh:Ge[Je]||Ge.medium,lightMode:Ze,paused:et,dpr:tt},_=(0,z.useRef)(de);_.current=de,(0,z.useEffect)(()=>{let L=ue.current,S=fe.current,n=S?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!0,stencil:!1});if(!L||!S||!n)return;let X=bt(n,mt,ht);if(!X)return;let te=n.createVertexArray(),me=n.createBuffer(),he=n.createBuffer(),ve=0,pe=0,it=o=>{if(o===ve)return;ve=o;let a=new Float32Array((o+1)*(o+1)*2),t=0;for(let u=0;u<=o;u+=1)for(let r=0;r<=o;r+=1)a[t]=r/o,a[t+1]=u/o,t+=2;let s=new Uint32Array(o*o*6);t=0;for(let u=0;u<o;u+=1)for(let r=0;r<o;r+=1){let m=u*(o+1)+r,g=m+1,v=m+o+1,y=v+1;s[t]=m,s[t+1]=v,s[t+2]=g,s[t+3]=g,s[t+4]=v,s[t+5]=y,t+=6}pe=s.length,n.bindVertexArray(te),n.bindBuffer(n.ARRAY_BUFFER,me),n.bufferData(n.ARRAY_BUFFER,a,n.STATIC_DRAW),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,he),n.bufferData(n.ELEMENT_ARRAY_BUFFER,s,n.STATIC_DRAW),n.bindVertexArray(null)},oe=document.createElement("canvas");oe.width=1,oe.height=1;let I=oe.getContext("2d",{willReadFrequently:!0}),Y=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,i={clock:0,swell:0,lights:0,frame:0,nextRipple:1.2,ripples:[],intro:_.current.intro&&!Y?0:N,width:1,height:1,colorKey:"",color:[.07,.06,.09],accent:[1,.31,.72],second:[.23,.42,1],pointer:{x:0,y:0,inside:!1},hover:{x:0,z:0,vx:0,vz:0,presence:0,placed:!1},look:{x:0,y:0,vx:0,vy:0},seed:1,camera:null},P=0,D=0,K=!0,ne=!0,re=(o,a)=>{if(!I||!o)return a;let t=/^[0-9a-f]{3,8}$/i.test(o)?`#${o}`:o;I.clearRect(0,0,1,1),I.fillStyle="#000000",I.fillStyle=t,I.fillRect(0,0,1,1);let[s,u,r]=I.getImageData(0,0,1,1).data;return[s/255,u/255,r/255]},at=o=>{let a=`${o.color}|${o.accentColor}|${o.secondaryColor}`;a!==i.colorKey&&(i.colorKey=a,i.color=re(o.color,[.07,.06,.09]),i.accent=re(o.accentColor,[1,.31,.72]),i.second=re(o.secondaryColor,[.23,.42,1]))},ge=()=>(i.seed=i.seed*16807%2147483647,(i.seed-1)/2147483646),ct=o=>{let a=i.width/Math.max(i.height,1),t=8/o.zoom,s=i.look.x*.16,u=1.5-o.tilt*1.26+i.look.y*.05,r=[G[0],0,G[1]],m=[r[0]+Math.sin(s)*Math.cos(u)*t,r[1]+Math.sin(u)*t,r[2]+Math.cos(s)*Math.cos(u)*t],g=wt(.8,a,.1,400),v=yt(m,r),y=St(g,v);return{eye:m,target:r,viewProj:y,inverse:At(y),distance:t}},O=new Float32Array(J*4),ie=()=>{let o=_.current;it(o.mesh),at(o);let a=ct(o);i.camera=a,n.viewport(0,0,S.width,S.height),n.clearColor(0,0,0,0),n.clearDepth(1),n.clear(n.COLOR_BUFFER_BIT|n.DEPTH_BUFFER_BIT),n.enable(n.DEPTH_TEST),n.depthFunc(n.LEQUAL),n.useProgram(X.program);let t=X.uniforms;O.fill(0),i.ripples.forEach((W,V)=>{O[V*4]=W.x,O[V*4+1]=W.z,O[V*4+2]=W.start,O[V*4+3]=W.strength});let s=i.intro,u=s<N,r=gt(s/st)*ut,m=pt(s/N);n.uniform4fv(t.uRipples,O),n.uniform4f(t.uWave,.55*o.pulse,3*Math.max(o.pulseSpeed,.05)+1.2,1.6*o.pulseWidth,46),n.uniform1f(t.uSquare,o.square),n.uniform1f(t.uClock,i.clock),n.uniform4f(t.uSwell,1.3*o.waves*(.25+.75*m),1.9/o.waveScale,0,i.swell),n.uniform4f(t.uHover,i.hover.x,i.hover.z,3*o.mouseRadius/.35,.7*i.hover.presence*o.mouseStrength*o.hover),n.uniform4f(t.uIntro,G[0],G[1],r,u?.9*(1-xt(.55,1,s/N)):0),n.uniformMatrix4fv(t.uViewProj,!1,a.viewProj),n.uniform4f(t.uArea,$[0]+G[0],$[1]+G[1],$[2],$[3]),n.uniform3f(t.uEye,a.eye[0],a.eye[1],a.eye[2]),n.uniform3f(t.uColor,i.color[0],i.color[1],i.color[2]),n.uniform3f(t.uAccent,i.accent[0],i.accent[1],i.accent[2]),n.uniform3f(t.uSecond,i.second[0],i.second[1],i.second[2]);let g=i.lights,v=a.distance/8,y=.35+.65*m,[k,A]=o.lights;n.uniform3f(t.uLightA,a.target[0]+(k[0]+Math.sin(g*.7)*k[3])*v,k[1]*v*y+.6,a.target[2]+(k[2]+Math.cos(g*.5)*k[4])*v),n.uniform3f(t.uLightB,a.target[0]+(A[0]+Math.cos(g*.6)*A[3])*v,A[1]*v*y+.6,a.target[2]+(A[2]+Math.sin(g*.45)*A[4])*v),n.uniform1f(t.uTile,1.2*o.tileSize),n.uniform1f(t.uAngle,o.rotation),n.uniform1f(t.uGap,o.gap),n.uniform1f(t.uRound,o.roundness),n.uniform1f(t.uSoftness,o.softness),n.uniform1f(t.uBulge,o.bulge),n.uniform1f(t.uGloss,o.gloss);let q=Math.min(o.depth*3.2*v,$[3]*.62);n.uniform2f(t.uRange,q*.5,q),n.uniform1f(t.uBrightness,o.brightness);let T=S.height/Math.max(i.height,1);n.uniform1f(t.uGrain,o.grain),n.uniform1f(t.uGrainScale,Math.max(1,T)),n.uniform1f(t.uLightMode,o.lightMode?1:0),n.uniform1f(t.uOpacity,o.opacity),n.uniform4f(t.uReveal,G[0],G[1],r,u?0:1),n.uniform2f(t.uView,S.width,S.height),n.uniform1f(t.uFade,o.fade),n.uniform1f(t.uFrame,i.frame%977),n.bindVertexArray(te),n.drawElements(n.TRIANGLES,pe,n.UNSIGNED_INT,0),n.bindVertexArray(null),n.disable(n.DEPTH_TEST)},xe=()=>{let o=_.current,a=Math.max(1,L.clientWidth),t=Math.max(1,L.clientHeight),s=Math.min(o.dpr||window.devicePixelRatio||1,2),u=Math.max(a,t)*s,r=u>ze?s*ze/u:s,m=Math.max(1,Math.round(a*r)),g=Math.max(1,Math.round(t*r));(S.width!==m||S.height!==g)&&(S.width=m,S.height=g),i.width=a,i.height=t,ie()},ae=(o,a)=>{let t=i.camera;if(!t)return null;let s=o/i.width*2-1,u=1-a/i.height*2,r=t.inverse,m=r[0]*s+r[4]*u+r[8]+r[12],g=r[1]*s+r[5]*u+r[9]+r[13],v=r[2]*s+r[6]*u+r[10]+r[14],y=r[3]*s+r[7]*u+r[11]+r[15],k=m/y-t.eye[0],A=g/y-t.eye[1],q=v/y-t.eye[2];if(A>=-1e-4)return null;let T=-t.eye[1]/A;return{x:t.eye[0]+k*T,z:t.eye[2]+q*T}},ce=(o,a,t)=>{for(i.ripples.push({x:o,z:a,start:i.clock,strength:t});i.ripples.length>J;)i.ripples.shift()},be=o=>{if(P=0,!ne||!K||document.hidden)return;let a=_.current,t=D?Math.min(.05,(o-D)/1e3):1/60;D=o;let s=!a.paused&&!Y;if(s){i.frame+=1,i.clock+=t,i.intro+=t,i.swell+=t*a.speed,i.lights+=t*a.speed*.6;let T=3*Math.max(a.pulseSpeed,.05)+1.2,W=10*a.pulseSpacing/T;if(a.pulse>0&&i.clock>=i.nextRipple){if(a.randomOrigin){let H=ae((.15+ge()*.7)*i.width,(.25+ge()*.6)*i.height);H&&ce(H.x,H.z,1)}else ce(G[0],G[1],1);i.nextRipple=i.clock+W*(a.randomOrigin?.6:1)}let V=46/T+1;i.ripples=i.ripples.filter(H=>i.clock-H.start<V)}else i.intro<N&&(i.intro=N);let{pointer:u,hover:r,look:m}=i,g=a.mouseInteraction&&u.inside&&!Y,v=g&&a.hover!==0?ae(u.x,u.y):null;v&&(r.placed||(r.x=v.x,r.z=v.z,r.vx=0,r.vz=0,r.placed=!0),r.vx+=(90*(v.x-r.x)-19*r.vx)*t,r.vz+=(90*(v.z-r.z)-19*r.vz)*t,r.x+=r.vx*t,r.z+=r.vz*t);let y=v?1:0;r.presence+=(y-r.presence)*(1-Math.exp(-t/(y>r.presence?.35:.6))),!v&&r.presence<.001&&(r.placed=!1);let k=g?(u.x/i.width-.5)*.5:0,A=g?(.5-u.y/i.height)*.5:0;m.vx+=(30*(k-m.x)-11*m.vx)*t,m.vy+=(30*(A-m.y)-11*m.vy)*t,m.x+=m.vx*t,m.y+=m.vy*t,ie();let q=Math.abs(y-r.presence)>.002||Math.hypot(r.vx,r.vz)>.01||Math.abs(k-m.x)>2e-4||Math.abs(A-m.y)>2e-4;s||q?P=requestAnimationFrame(be):D=0},B=()=>{!P&&ne&&K&&!document.hidden&&(P=requestAnimationFrame(be))},we=o=>{let a=L.getBoundingClientRect(),t=o.clientX-a.left,s=o.clientY-a.top;i.pointer.x=t,i.pointer.y=s,i.pointer.inside=t>=0&&s>=0&&t<=a.width&&s<=a.height,B()},ye=o=>{let a=_.current;if(!a.mouseInteraction||!a.pulseOnClick||o.button!==0||Y||o.target instanceof Element&&o.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let t=L.getBoundingClientRect(),s=o.clientX-t.left,u=o.clientY-t.top;if(s<0||u<0||s>t.width||u>t.height)return;let r=ae(s,u);r&&ce(r.x,r.z,1.15),B()},Se=()=>{i.pointer.inside=!1,B()},Ae=()=>{D=0,B()},Re=new ResizeObserver(xe);Re.observe(L);let Ee=new IntersectionObserver(o=>{K=o.some(a=>a.isIntersecting),K&&(D=0,B())});return Ee.observe(L),window.addEventListener("pointermove",we,{passive:!0}),window.addEventListener("pointerdown",ye),document.documentElement.addEventListener("pointerleave",Se),document.addEventListener("visibilitychange",Ae),xe(),B(),ee.current=()=>{P||ie(),B()},()=>{ne=!1,cancelAnimationFrame(P),ee.current=null,Re.disconnect(),Ee.disconnect(),window.removeEventListener("pointermove",we),window.removeEventListener("pointerdown",ye),document.documentElement.removeEventListener("pointerleave",Se),document.removeEventListener("visibilitychange",Ae),n.deleteBuffer(me),n.deleteBuffer(he),n.deleteVertexArray(te),n.deleteProgram(X.program)}},[]),(0,z.useEffect)(()=>{ee.current?.()});let{className:nt="",...rt}=ot;return(0,le.jsx)("div",{ref:ue,className:["relative h-full w-full overflow-hidden",nt].filter(Boolean).join(" "),...rt,children:(0,le.jsx)("canvas",{ref:fe,className:"absolute inset-0 block h-full w-full","aria-hidden":"true"})})},Be=Rt;var se=U(Q(),1),Et=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Z=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Lt=Et.map((e,c)=>({id:c+1,image:e,src:e,img:e,url:e,title:Z[c],text:Z[c],label:Z[c],alt:Z[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Mt({big:e}){return(0,se.jsx)(ke,{big:e,dark:!0,center:!1,zoom:1,drive:!1,children:(0,se.jsx)(Be,{})})}var Bt=Me(Mt);export{Bt as default};
