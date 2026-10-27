import{a as Mt,b as Et,d as re,e as Tt,f as Se,g as Oe,h as ne,i as Rt}from"./chunks/chunk-ZUF7KD7J.js";import{c as te,i as $t,j as ze,l as St,m as Pt}from"./chunks/chunk-6IYH4WPJ.js";var f=te($t(),1);var He=te(ze(),1),Ht={mixed:0,squares:1,circles:2,triangles:3},Wt=2,Nt=1024,Gt=32,Ut=.1,Be=1/60,Vt=.42,Xt=.94,Yt=.972,jt=.01,At=.2,$e=.3,_t=.16,ae=1+$e+_t+At,Jt=`
fn mod289v3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289v4(x: vec4f) -> vec4f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute(x: vec4f) -> vec4f { return mod289v4(((x * 34.0) + 10.0) * x); }
fn taylorInvSqrt(r: vec4f) -> vec4f { return 1.79284291400159 - 0.85373472095314 * r; }
fn fadeCurve(t: vec3f) -> vec3f { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

fn cnoise(P: vec3f) -> f32 {
  var Pi0 = floor(P);
  var Pi1 = Pi0 + vec3f(1.0);
  Pi0 = mod289v3(Pi0);
  Pi1 = mod289v3(Pi1);
  let Pf0 = fract(P);
  let Pf1 = Pf0 - vec3f(1.0);
  let ix = vec4f(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  let iy = vec4f(Pi0.yy, Pi1.yy);
  let iz0 = Pi0.zzzz;
  let iz1 = Pi1.zzzz;

  let ixy = permute(permute(ix) + iy);
  let ixy0 = permute(ixy + iz0);
  let ixy1 = permute(ixy + iz1);

  var gx0 = ixy0 * (1.0 / 7.0);
  var gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  let gz0 = vec4f(0.5) - abs(gx0) - abs(gy0);
  let sz0 = step(gz0, vec4f(0.0));
  gx0 -= sz0 * (step(vec4f(0.0), gx0) - 0.5);
  gy0 -= sz0 * (step(vec4f(0.0), gy0) - 0.5);

  var gx1 = ixy1 * (1.0 / 7.0);
  var gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  let gz1 = vec4f(0.5) - abs(gx1) - abs(gy1);
  let sz1 = step(gz1, vec4f(0.0));
  gx1 -= sz1 * (step(vec4f(0.0), gx1) - 0.5);
  gy1 -= sz1 * (step(vec4f(0.0), gy1) - 0.5);

  var g000 = vec3f(gx0.x, gy0.x, gz0.x);
  var g100 = vec3f(gx0.y, gy0.y, gz0.y);
  var g010 = vec3f(gx0.z, gy0.z, gz0.z);
  var g110 = vec3f(gx0.w, gy0.w, gz0.w);
  var g001 = vec3f(gx1.x, gy1.x, gz1.x);
  var g101 = vec3f(gx1.y, gy1.y, gz1.y);
  var g011 = vec3f(gx1.z, gy1.z, gz1.z);
  var g111 = vec3f(gx1.w, gy1.w, gz1.w);

  let norm0 = taylorInvSqrt(vec4f(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  let norm1 = taylorInvSqrt(vec4f(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  let n000 = dot(g000, Pf0);
  let n100 = dot(g100, vec3f(Pf1.x, Pf0.yz));
  let n010 = dot(g010, vec3f(Pf0.x, Pf1.y, Pf0.z));
  let n110 = dot(g110, vec3f(Pf1.xy, Pf0.z));
  let n001 = dot(g001, vec3f(Pf0.xy, Pf1.z));
  let n101 = dot(g101, vec3f(Pf1.x, Pf0.y, Pf1.z));
  let n011 = dot(g011, vec3f(Pf0.x, Pf1.yz));
  let n111 = dot(g111, Pf1);

  let f = fadeCurve(Pf0);
  let nz = mix(vec4f(n000, n100, n010, n110), vec4f(n001, n101, n011, n111), f.z);
  let ny = mix(nz.xy, nz.zw, f.y);
  return 2.2 * mix(ny.x, ny.y, f.x);
}

fn fbm(p: vec3f) -> f32 {
  var total = 0.0;
  var amplitude = 1.0;
  var weight = 0.0;
  var frequency = 1.0;
  for (var i = 0; i < 2; i++) {
    total += amplitude * cnoise(p * frequency);
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return total / weight;
}
`,Zt=`
struct Params {
  resolution: vec4f,
  placement: vec4f,
  grid: vec4f,
  field: vec4f,
  motion: vec4f,
  color: vec4f,
  hover: vec4f,
  background: vec4f,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var maskTexture: texture_2d<f32>;
@group(0) @binding(2) var maskSampler: sampler;
@group(0) @binding(3) var<storage, read> charges: array<f32>;

const SEED = vec2f(12.9898, 78.233);
const GLOW_THRESHOLD = 0.6;
${Jt}

fn sdIsoscelesTriangle(point: vec2f, q: vec2f) -> f32 {
  let p = vec2f(abs(point.x), point.y);
  let a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  let b = p - q * vec2f(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  let s = -sign(q.y);
  let d = min(vec2f(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2f(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

fn shapeDistance(p: vec2f, shape: i32, c: f32) -> f32 {
  if (shape == 0) { return max(abs(p.x), abs(p.y)) - c; }
  if (shape == 1) { return length(p) - c; }
  return sdIsoscelesTriangle(vec2f(p.x, p.y + c), vec2f(c, 2.0 * c));
}

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let resolution = params.resolution.xy;
  let cellPx = params.grid.x;
  let dotSize = params.grid.y;
  let mode = i32(params.grid.z + 0.5);
  let cols = i32(params.grid.w + 0.5);
  let background = params.background.rgb;
  let toSurface = params.hover.w < 0.5;

  let pixel = uv * resolution;
  let origin = params.placement.xy;
  let rows = i32(params.placement.z + 0.5);
  let cell = floor((pixel - origin) / cellPx);
  if (cell.y < 0.0 || i32(cell.y) >= rows || cell.x < 0.0 || i32(cell.x) >= cols) {
    return vec4f(background, select(0.0, 1.0, toSurface));
  }
  let center = origin + (cell + 0.5) * cellPx;
  let local = (pixel - center) / (cellPx * 0.5);
  let cellUv = center / resolution;

  if (params.motion.z > 0.5 && textureSampleLevel(maskTexture, maskSampler, cellUv, 0.0).r > 0.5) {
    return vec4f(background, select(0.0, 1.0, toSurface));
  }

  var level = 1.0;
  let fade = params.motion.w;
  if (fade > 0.0) {
    let q = abs(uv * 2.0 - 1.0);
    let radius = pow(pow(q.x, 2.5) + pow(q.y, 2.5), 1.0 / 2.5) / pow(2.0, 1.0 / 2.5);
    level = 1.0 - smoothstep(max(0.0, 1.0 - fade * 2.2), 1.0, radius);
  }
  let noise = fbm(vec3f((center + params.motion.xy) / params.field.x + SEED, params.field.w));
  let tone = clamp((noise * 0.5 + 0.5 - params.field.y) * params.field.z + 0.5, 0.0, 1.0);
  let band = i32(min(tone, 0.999999) * 3.0);

  var charge = 0.0;
  let index = i32(cell.y) * cols + i32(cell.x);
  if (index >= 0 && index < i32(arrayLength(&charges))) { charge = charges[index]; }
  let stepped = (band + i32(clamp(charge, 0.0, 0.999) * 3.0)) % 3;

  var shape = 2 - stepped;
  var size = dotSize;
  if (mode != 0) {
    shape = mode - 1;
    size = dotSize * mix(0.45, 1.0, f32(stepped) / 2.0);
  }
  let introProgress = params.placement.w;
  var front = 0.0;
  if (introProgress < ${ae.toFixed(2)}) {
    let radial = length((center - resolution * 0.5) / (resolution * 0.5)) * 0.70710678;
    let warp = cnoise(vec3f(cellUv * vec2f(3.2, 2.4) + SEED, 4.7)) * ${$e.toFixed(2)};
    let jitter = hash21(cell) * ${_t.toFixed(2)};
    let spread = radial + warp + jitter + ${$e.toFixed(2)};
    let band = ${At.toFixed(2)} * (0.6 + 0.8 * hash21(cell + vec2f(17.0, 9.0)));
    let t = clamp((introProgress - spread) / band, 0.0, 1.0);
    if (t <= 0.0) {
      return vec4f(background, select(0.0, 1.0, toSurface));
    }
    let back = t - 1.0;
    size = max(size * (1.0 + 2.70158 * back * back * back + 1.70158 * back * back), 0.02);
    front = 1.0 - smoothstep(0.0, 1.0, abs(introProgress - spread) / band);
  }
  let aa = 2.0 / cellPx;
  let coverage = smoothstep(aa, -aa, shapeDistance(local, shape, size));

  let tint = mix(params.color.rgb, params.hover.rgb, max(smoothstep(0.15, 0.85, charge), front * 0.35));

  let rgb = mix(background, tint, coverage * level);
  if (toSurface) { return vec4f(rgb, 1.0); }
  let luminance = dot(tint * level, vec3f(0.2126, 0.7152, 0.0722));
  let glow = max(0.0, (luminance - GLOW_THRESHOLD) / (1.0 - GLOW_THRESHOLD)) * coverage;
  return vec4f(rgb, glow);
}
`,kt=`
struct Blur { direction: vec4f }
@group(0) @binding(0) var<uniform> blur: Blur;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var sourceSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sigma = blur.direction.z;
  let radius = i32(ceil(3.0 * sigma));
  var sum = vec3f(0.0);
  var weight = 0.0;
  for (var i = -radius; i <= radius; i++) {
    let offset = f32(i);
    let w = exp(-(offset * offset) / (2.0 * sigma * sigma));
    let sample = textureSampleLevel(sourceTexture, sourceSampler, uv + offset * blur.direction.xy, 0.0);
    sum += select(sample.rgb, sample.rgb * sample.a, blur.direction.w > 0.5) * w;
    weight += w;
  }
  return vec4f(sum / weight, 1.0);
}
`,Qt=`
struct Composite { strength: vec4f }
@group(0) @binding(0) var<uniform> composite: Composite;
@group(0) @binding(1) var sceneTexture: texture_2d<f32>;
@group(0) @binding(2) var glowTexture: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let scene = textureSampleLevel(sceneTexture, linearSampler, uv, 0.0).rgb;
  let glow = textureSampleLevel(glowTexture, linearSampler, uv, 0.0).rgb;
  return vec4f(scene + glow * composite.strength.x, 1.0);
}
`,Fe=(d,x)=>{let oe=typeof d=="string"?d.trim():"",B=(/^#?([\da-f]{3}|[\da-f]{6})$/i.exec(oe)||/^#?([\da-f]{6})$/i.exec(x))[1];return B.length===3&&(B=B.replace(/./g,L=>L+L)),[0,2,4].map(L=>parseInt(B.slice(L,L+2),16)/255)};function We({text:d="",fontFamily:x='Geist, "Geist Sans", system-ui, sans-serif',fontWeight:oe=500,textSize:Me=.6,shapes:B="mixed",cellSize:L=10,dotSize:Ge=.75,color:Ue="#929292",hoverColor:Ve="#ffffff",backgroundColor:Ee="#000000",speed:Xe=1,scale:Ye=1,contrast:je=1,brightness:Je=.4,flow:Ze=0,direction:Qe=0,fade:Ke=.25,interactive:et=!0,splashRadius:tt=40,splashStrength:rt=.4,glow:nt=.35,intro:at=!0,introDuration:ot=1.6,introKey:Te=0,paused:st=!1,onError:it,className:It=""}){let ct=(0,f.useRef)(null),lt=(0,f.useRef)(null),[ft,ut]=(0,f.useState)(!1),p=(0,f.useRef)(null),se=(0,f.useRef)(()=>{}),ie=(0,f.useRef)(()=>{}),gt=(0,f.useRef)(it);p.current={text:String(d??""),fontFamily:x,fontWeight:oe,textSize:Me,shapes:B,cellSize:Math.max(2,L),dotSize:Ge,color:Ue,hoverColor:Ve,backgroundColor:Ee,speed:Xe,scale:Math.max(.05,Ye),contrast:je,brightness:Je,flow:Ze,direction:Qe,fade:Ke,interactive:et,splashRadius:tt,splashStrength:rt,glow:nt,intro:at,introDuration:Math.max(.1,ot),introKey:Te,paused:st},gt.current=it;let Lt=[B,L,Ge,Ue,Ve,Ee,Xe,Ye,je,Je,Ze,Qe,Ke,et,tt,rt,nt,at,ot,st].join("|"),qt=[d,x,oe,Me].join("|"),Re=(0,f.useRef)(()=>{});return(0,f.useEffect)(()=>{se.current()},[Lt]),(0,f.useEffect)(()=>{ie.current()},[qt]),(0,f.useEffect)(()=>{Te&&Re.current()},[Te]),(0,f.useEffect)(()=>{let ce=ct.current,le=lt.current;if(!ce||!le)return;let h=!1,T=!1,r,X,q,R=0,fe=0,mt=0,Y=[0,0],D=1,ue=!0,dt=!1,u=1,b=1,k=10,F=[0,0],P=new Float32Array(1),v=new Float32Array(1),$=new Float32Array(1),ge=0,pt=0,j=ae,me=!1,H=!1,W=null,ke,de,pe,C=()=>{},A={x:0,y:0,at:0,inside:!1},J=window.matchMedia("(prefers-reduced-motion: reduce)"),ve=document.createElement("canvas"),M=ve.getContext("2d"),xe=()=>C(),Ae=()=>{W=null},Dt=(a,E,i)=>{let g=p.current,y=Math.max(.5,g.splashRadius*D/k*.5),_=Math.ceil(y*2.5),w=(a*D-F[0])/k-.5,z=(E*D-F[1])/k-.5,Z=Math.max(0,Math.floor(z-_)),U=Math.min(b-1,Math.ceil(z+_)),V=Math.max(0,Math.floor(w-_)),he=Math.min(u-1,Math.ceil(w+_));for(let N=Z;N<=U;N++){let Q=N-z;for(let G=V;G<=he;G++){let K=G-w,be=i*Math.exp(-(K*K+Q*Q)/(2*y*y)),ee=N*u+G;v[ee]=Math.min(1.2,v[ee]+be)}}H=!0},vt=a=>{if(!p.current.interactive)return;W||(W=ce.getBoundingClientRect());let E=performance.now(),i=a.clientX-W.left,g=a.clientY-W.top,y=i>=0&&g>=0&&i<=W.width&&g<=W.height;if(y){let _=A.inside?Math.max(8,E-A.at):16,z=(A.inside?Math.hypot(i-A.x,g-A.y):0)/_*1e3;Dt(i,g,Math.min(1,.22+z*6e-4)*p.current.splashStrength),C()}A.x=i,A.y=g,A.at=E,A.inside=y},_e=a=>{if(h||T)return;T=!0,R&&cancelAnimationFrame(R),R=0,de?.disconnect(),pe?.disconnect(),ke?.(),se.current=()=>{},ie.current=()=>{};let E=r;r=void 0,E?.dispose(),ut(!1),gt.current?.(a instanceof Error?a:new Error(String(a)))},xt=()=>(D=Math.min(window.devicePixelRatio||1,Wt),[Math.max(1,Math.round(le.clientWidth*D)),Math.max(1,Math.round(le.clientHeight*D))]);return(async()=>{try{if(r=await Rt({powerPreference:"low-power"}),h)return r.dispose();ke=r.onError(_e);let a=xt(),E=navigator.gpu.getPreferredCanvasFormat(),i=Mt(r,le,{dpr:D,size:a,autoResize:!1,format:E}),g=ne(r,{resolution:[a[0],a[1],1/a[0],1/a[1]],placement:[0,0,1,0],grid:[10,.75,0,1],field:[320,.5,2.8,0],motion:[0,0,0,.25],color:[.573,.573,.573,1],hover:[1,1,1,0],background:[0,0,0,1]}),y=Et(r,{minFilter:"linear",magFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),_=(e,t)=>r.device.createTexture({size:[e,t],format:"rgba8unorm",usage:["texture_binding","copy_dst","render_attachment"],label:"shape-waves-mask"});X=_(1,1),q=Oe(r,4,"read"),q.write(P);let w=re(r,Zt,{label:"shape-waves-scene",set:{params:g,maskTexture:X,maskSampler:y,charges:q}}),z=Se(r,{size:a,format:"rgba8unorm",label:"shape-waves-scene"}),Z=e=>[Math.max(1,Math.ceil(e[0]/2)),Math.max(1,Math.ceil(e[1]/2))],U=Se(r,{size:Z(a),format:"rgba8unorm",label:"shape-waves-glow-a"}),V=Se(r,{size:Z(a),format:"rgba8unorm",label:"shape-waves-glow-b"}),he=ne(r,{direction:[0,0,4,1]}),N=ne(r,{direction:[0,0,4,0]}),Q=re(r,kt,{label:"shape-waves-glow-x",set:{blur:he,sourceTexture:z,sourceSampler:y}}),G=re(r,kt,{label:"shape-waves-glow-y",set:{blur:N,sourceTexture:U,sourceSampler:y}}),K=ne(r,{strength:[2,0,0,0]}),be=re(r,Qt,{label:"shape-waves-composite",set:{composite:K,sceneTexture:z,glowTexture:V,linearSampler:y}});if(await Promise.all([w.compile({colors:[E]}),w.compile(z),Q.compile(U),G.compile(V),be.compile({colors:[E]})]),h)return;let ee=()=>p.current.glow>0,ht=!1,Ct=()=>{let e=p.current,[t,s]=i.size,c=Math.max(1,Math.round(t/(e.cellSize*D)));k=t/c;let n=Math.max(1,Math.floor(s/k));if(F=[0,(s-n*k)/2],c===u&&n===b&&P.length===u*b)return;u=c,b=n,P=new Float32Array(u*b),v=new Float32Array(u*b),$=new Float32Array(u*b),H=!1;let S=Oe(r,P.byteLength,"read");S.write(P),w.set({charges:S}),q.destroy(),q=S},Ot=()=>{let e=u-1,t=b-1,s=0;for(let n=0;n<b;n++){let S=(n===0?n:n-1)*u,o=(n===t?n:n+1)*u,m=n*u;for(let l=0;l<u;l++){let I=m+l,ye=m+(l===0?l:l-1),we=m+(l===e?l:l+1),O=v[I],qe=v[ye]+v[we]+v[S+l]+v[o+l]-4*O,De=(O-$[I])*Xt,zt=(O+De+Vt*qe)*Yt;$[I]=zt;let Ce=Math.min(1,Math.max(0,zt));P[I]=Ce,Ce>s&&(s=Ce)}}let c=v;return v=$,$=c,s},Bt=e=>{if(!H)return!1;ge=Math.min(ge+e,Be*4);let t=1;for(;ge>=Be;)ge-=Be,t=Ot();return t<jt&&(v.fill(0),$.fill(0),P.fill(0),H=!1),q.write(P),H},Ft=()=>{let e=p.current;return ue&&!document.hidden&&!e.paused&&e.speed>0&&!J.matches},bt=e=>{if(R=0,h||T)return;let t=p.current,s=fe?Math.min(.1,(e-fe)/1e3):0;fe=e;let c=Ft();if(c){mt+=s*Ut*t.speed;let o=t.direction*Math.PI/180,m=t.flow*k*s;Y=[Y[0]+Math.cos(o)*m,Y[1]+Math.sin(o)*m]}let n=ue&&!document.hidden&&Bt(s);me&&(me=!1,pt=e,j=0);let S=j<ae;S&&(j=Math.min(ae,(e-pt)/1e3/t.introDuration*ae)),g.set({placement:[F[0],F[1],b,j]}),g.set({field:[Gt*k*t.scale,.5-(t.brightness-.5)*.4,2.8*t.contrast,mt]}),g.set({motion:[Y[0],Y[1],t.text.trim()?1:0,t.fade]});try{Tt(r,o=>{if(!ee()){o.pass(i,w);return}o.pass(z,w),o.pass(U,Q),o.pass(V,G),o.pass(i,be)})}catch(o){_e(o);return}dt||(dt=!0,ut(!0)),c||n||S?R=requestAnimationFrame(bt):fe=0};C=()=>{h||T||R||(R=requestAnimationFrame(bt))};let Ie=()=>{let e=p.current,t=e.text.trim(),[s,c]=i.size,n=t.length>0,S=n?Math.min(1,Nt/Math.max(s,c)):0,o=n?Math.max(1,Math.round(s*S)):1,m=n?Math.max(1,Math.round(c*S)):1;if(ve.width=o,ve.height=m,M.fillStyle="#000",M.fillRect(0,0,o,m),n){let I=Math.max(1,e.textSize*m);M.font=`${e.fontWeight} ${I}px ${e.fontFamily}`;let ye=M.measureText(t).width,we=o*.9;ye>we&&(I=Math.max(1,I*we/ye),M.font=`${e.fontWeight} ${I}px ${e.fontFamily}`),M.textAlign="center",M.textBaseline="alphabetic";let O=M.measureText(t),qe=(o+O.actualBoundingBoxLeft-O.actualBoundingBoxRight)/2,De=(m+O.actualBoundingBoxAscent-O.actualBoundingBoxDescent)/2;M.fillStyle="#fff",M.fillText(t,qe,De)}let l=_(o,m);r.gpu.queue.copyExternalImageToTexture({source:ve},{texture:l.gpu},[o,m]),w.set({maskTexture:l}),X.destroy(),X=l},Le=()=>{if(h||T)return;let e=p.current;Ct(),g.set({placement:[F[0],F[1],b,j],grid:[k,Math.min(1,Math.max(.1,e.dotSize)),Ht[e.shapes]??0,u],color:[...Fe(e.color,"#929292"),1],hover:[...Fe(e.hoverColor,"#ffffff"),ee()?1:0],background:[...Fe(e.backgroundColor,"#000000"),1]}),K.set({strength:[2*e.glow,0,0,0]}),e.intro!==ht&&(ht=e.intro,e.intro&&!J.matches&&(me=!0)),!e.interactive&&H&&(v.fill(0),$.fill(0),P.fill(0),H=!1,q.write(P)),C()},yt=()=>{if(h||T)return;Ie(),Le();let e=p.current;!e.text.trim()||!document.fonts?.load||document.fonts.load(`${e.fontWeight} 32px ${e.fontFamily}`).then(()=>{h||T||(Ie(),C())}).catch(()=>{})},wt=()=>{if(h||T)return;Ae();let e=xt();(e[0]!==i.size[0]||e[1]!==i.size[1])&&i.resize(e);let[t,s]=i.size;z.resize([t,s]);let c=Z([t,s]);U.resize(c),V.resize(c),he.set({direction:[1/c[0],0,4,1]}),N.set({direction:[0,1/c[1],4,0]}),g.set({resolution:[t,s,1/t,1/s]}),Ie(),Le()};se.current=Le,ie.current=yt,Re.current=()=>{h||T||!p.current.intro||J.matches||(me=!0,C())},de=new ResizeObserver(wt),de.observe(ce),pe=new IntersectionObserver(e=>{ue=e.some(t=>t.isIntersecting),ue&&C()},{threshold:0}),pe.observe(ce),document.addEventListener("visibilitychange",xe),J.addEventListener("change",xe),window.addEventListener("pointermove",vt,{passive:!0}),window.addEventListener("scroll",Ae,{capture:!0,passive:!0}),wt(),yt()}catch(a){_e(a)}})(),()=>{h=!0,C=()=>{},se.current=()=>{},ie.current=()=>{},Re.current=()=>{},document.removeEventListener("visibilitychange",xe),J.removeEventListener("change",xe),window.removeEventListener("pointermove",vt),window.removeEventListener("scroll",Ae,{capture:!0}),de?.disconnect(),pe?.disconnect(),ke?.(),R&&cancelAnimationFrame(R),X?.destroy(),q?.destroy(),r?.dispose()}},[]),(0,He.jsx)("div",{ref:ct,className:`pointer-events-none relative isolate h-full w-full overflow-hidden ${It}`,"data-ready":ft,style:{backgroundColor:Ee},"aria-hidden":"true",children:(0,He.jsx)("canvas",{ref:lt,className:`pointer-events-none absolute inset-0 block h-full w-full transition-opacity duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${ft?"opacity-100":"opacity-0"}`})})}var Ne=te(ze(),1),Kt=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Pe=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],ir=Kt.map((d,x)=>({id:x+1,image:d,src:d,img:d,url:d,title:Pe[x],text:Pe[x],label:Pe[x],alt:Pe[x],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][x],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function er({big:d}){return(0,Ne.jsx)(Pt,{big:d,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Ne.jsx)(We,{})})}var cr=St(er);export{cr as default};
