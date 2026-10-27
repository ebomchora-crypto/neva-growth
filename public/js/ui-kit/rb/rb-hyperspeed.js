import{A as Ct,E as Rt,G as se,H as Mt,I as $,K as Fe,L as St,N as Ie,P as R,S as At,T as Ht,U as Ft,V as Pe,X as It,ea as Pt,f as gt,g as Tt,ga as Lt,h as Et,i as Se,j as wt,k as b,ka as Wt,l as Ae,p as xt,q as bt,t as He,w as ue,y,z as yt}from"./chunks/chunk-QKNKE5BX.js";import{c as Y,i as vo,j as le,l as ht,m as pt}from"./chunks/chunk-6IYH4WPJ.js";var D=Y(vo(),1);var _t=Y(le(),1),j=400,V=160,K=80,q=1500,Z=8,Bt=["straight","gentle","winding","hills","racing","deep"],zt={dark:{background:"transparent",road:"#08080a",lines:"#25252d",tail:["#d856bf","#6750a2","#c247ac"],head:["#03b3c3","#0e5ea5","#324555"],poles:["#03b3c3"],dust:"#ffffff"},light:{background:"transparent",road:"#efeff2",lines:"#d0d0d7",tail:["#d856bf","#6750a2","#c247ac"],head:["#03b3c3","#0e5ea5","#324555"],poles:["#03b3c3"],dust:"#18181b"}},me=`
  uniform float uTime;
  uniform float uCurvature;
  uniform vec4 uCurveA;
  uniform float uCurveB;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uPixel;
  #define PI 3.14159265358979
  float nsin(float v) { return sin(v) * 0.5 + 0.5; }
  vec3 gentle(float p) {
    return vec3(
      cos(p * PI * 5.0 + uTime) * 25.0 - cos(0.02 * PI * 5.0 + uTime) * 25.0,
      sin(p * PI * 2.0 + PI * 0.5 + uTime) * 15.0 - sin(0.02 * PI * 2.0 + PI * 0.5 + uTime) * 15.0,
      0.0
    );
  }
  float windX(float p) { return cos(PI * p * 4.0 + uTime) * 25.0 + pow(cos(PI * p * 8.0 + uTime * 2.0), 2.0) * 5.0; }
  float windY(float p) { return -nsin(PI * p * 8.0 + uTime) * 10.0 - pow(nsin(PI * p + uTime / 8.0), 5.0) * 10.0; }
  vec3 winding(float p) { return vec3(windX(p) - windX(0.0125), windY(p) - windY(0.0125), 0.0); }
  vec3 hills(float p) {
    return vec3(
      cos(p * PI * 3.0 + uTime) * 30.0 - cos(0.02 * PI * 3.0 + uTime) * 30.0,
      nsin(p * PI * 6.0 + uTime) * 30.0 - nsin(0.02 * PI * 6.0 + uTime) * 30.0,
      nsin(p * PI * 10.0 + uTime) * 20.0 - nsin(0.02 * PI * 10.0 + uTime) * 20.0
    );
  }
  vec3 racing(float p) {
    return vec3(
      sin(p * PI * 2.0 + uTime) * 35.0 - sin(0.0125 * PI * 2.0 + uTime) * 35.0,
      sin(p * PI * 3.0 + uTime) * 10.0 - sin(0.0125 * PI * 3.0 + uTime) * 10.0,
      0.0
    );
  }
  float deepX(float p) { return sin(p * PI * 4.0 + uTime) * 10.0; }
  float deepY(float p) { return pow(abs(p * 10.0), 2.0) + sin(p * PI * 8.0 + uTime) * 20.0; }
  vec3 deep(float p) { return vec3(deepX(p) - deepX(0.02), deepY(p) - deepY(0.02), 0.0); }
  vec3 bend(float p) {
    vec3 d = gentle(p) * uCurveA.x + winding(p) * uCurveA.y + hills(p) * uCurveA.z + racing(p) * uCurveA.w + deep(p) * uCurveB;
    return d * uCurvature;
  }
`,fo=`
  ${me}
  attribute vec4 aSeedA;
  attribute vec4 aSeedB;
  attribute float aPair;
  attribute float aTone;
  uniform float uTravel;
  uniform float uRoadX;
  uniform float uRoadWidth;
  uniform float uLanes;
  uniform float uDirection;
  uniform vec2 uSpeedRange;
  uniform float uTrail;
  uniform float uStretch;
  uniform float uSize;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${Z}];
  uniform float uColorCount;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vThin;
  void main() {
    float laneWidth = uRoadWidth / uLanes;
    float lane = min(floor(aSeedA.x * uLanes), uLanes - 1.0);
    float laneX = (lane + 0.5) * laneWidth - uRoadWidth * 0.5 + (aSeedA.y - 0.5) * 0.5 * laneWidth;
    float carWidth = mix(0.3, 0.5, aSeedA.z) * laneWidth;
    float radius = mix(0.05, 0.14, aSeedA.w) * uSize;
    float len = mix(0.03, 0.2, aSeedB.x) * uTravel * uTrail * (1.0 + uStretch);
    float speed = mix(uSpeedRange.x, uSpeedRange.y, aSeedB.y) * uDirection;
    vec3 center = vec3(
      uRoadX + laneX + aPair * carWidth,
      aSeedB.w * 0.8 + radius * 1.3,
      position.z * len + len - mod(uTime * speed + aSeedB.z * uTravel, uTravel)
    );
    vAbove = center.y;
    center.y = mix(center.y, -center.y * 1.8, uMirror);
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = radius * uRadiusScale;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, position.y * shown * mix(1.0, 2.2, uMirror), 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vec3 n = normal;
    n.y *= 1.0 - 2.0 * uMirror;
    vNormal = normalize(normalMatrix * n);
    vView = -mv.xyz;
    vUv = uv;
    vColor = uColors[int(min(floor(aTone * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`,mo=`
  uniform vec2 uFade;
  uniform float uIntensity;
  uniform float uSharp;
  uniform float uCore;
  uniform float uMirror;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float alpha = pow(facing, uSharp) * smoothstep(uFade.x, uFade.y, vUv.x) * uIntensity * vThin * (1.0 - vFog);
    alpha *= mix(1.0, exp(-vAbove * 0.9), uMirror);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(facing, 12.0) * uCore), min(alpha, 1.0));
  }
`,ho=`
  ${me}
  attribute vec4 aSeed;
  attribute float aIndex;
  attribute float aSide;
  uniform float uTravel;
  uniform float uCount;
  uniform float uEdge;
  uniform float uHeight;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${Z}];
  uniform float uColorCount;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vHeight;
  varying float vThin;
  void main() {
    vHeight = position.y + 0.5;
    float width = mix(0.08, 0.22, aSeed.y);
    float height = mix(1.3, 1.9, aSeed.z) * uHeight;
    float spacing = uTravel / max(uCount, 1.0);
    vec3 center = vec3(
      aSide * uEdge,
      vHeight * height,
      -uTravel + mod(uTime * 120.0 + (aIndex + aSeed.x * 0.6) * spacing, uTravel)
    );
    vAbove = center.y;
    center.y = mix(center.y, -center.y * 1.6, uMirror);
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = width * uRadiusScale;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, 0.0, position.z * shown);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    vColor = uColors[int(min(floor(aSeed.w * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`,po=`
  uniform float uIntensity;
  uniform float uSharp;
  uniform float uCore;
  uniform float uMirror;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vHeight;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float ends = smoothstep(0.0, 0.08, vHeight) * smoothstep(1.0, 0.9, vHeight);
    float alpha = pow(facing, uSharp) * ends * uIntensity * vThin * (1.0 - vFog);
    alpha *= mix(1.0, exp(-vAbove * 0.6), uMirror);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(facing, 12.0) * uCore), min(alpha, 1.0));
  }
`,go=`
  ${me}
  attribute vec4 aSeed;
  attribute float aEnd;
  uniform float uTravel;
  uniform float uStretch;
  uniform float uSpread;
  varying float vAlpha;
  void main() {
    float x = (aSeed.x - 0.5) * uSpread;
    float y = mix(1.0, 42.0, aSeed.y * aSeed.y);
    float speed = mix(140.0, 260.0, aSeed.w);
    float z = -uTravel + mod(uTime * speed + aSeed.z * uTravel, uTravel);
    float len = (0.6 + uStretch * 7.0) * mix(0.6, 1.4, aSeed.w);
    vec3 p = vec3(x, y, z + aEnd * len);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = aEnd * (1.0 - smoothstep(uFogNear, uFogFar, -mv.z));
  }
`,To=`
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uIntensity);
  }
`,Eo=`
  ${me}
  uniform float uTravel;
  uniform float uWidth;
  varying vec2 vRoad;
  varying float vFog;
  void main() {
    vec3 p = position;
    p.x *= uWidth;
    vRoad = vec2(p.x, p.z);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`,wo=`
  uniform float uTime;
  uniform vec3 uRoadColor;
  uniform vec3 uLineColor;
  uniform vec3 uBackground;
  uniform float uRoadWidth;
  uniform float uMedian;
  uniform float uLanes;
  uniform float uTransparent;
  uniform float uOpacity;
  varying vec2 vRoad;
  varying float vFog;
  float stripe(float d, float w) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(w - aa, w + aa, d);
  }
  void main() {
    float rx = abs(vRoad.x) - uMedian * 0.5;
    vec3 color = rx < 0.0 ? mix(uRoadColor, uLineColor, 0.12) : uRoadColor;
    if (rx >= 0.0) {
      float laneWidth = uRoadWidth / uLanes;
      float shoulder = max(stripe(abs(rx - 0.3), 0.07), stripe(abs(rx - (uRoadWidth - 0.3)), 0.07));
      float nearest = floor(rx / laneWidth + 0.5);
      float inner = step(0.5, nearest) * step(nearest, uLanes - 0.5);
      float dash = step(0.5, fract((vRoad.y - uTime * 120.0) / 14.0));
      float marks = max(shoulder, stripe(abs(rx - nearest * laneWidth), 0.06) * inner * dash);
      color = mix(color, uLineColor, marks);
    }
    float alpha = mix(1.0, 1.0 - vFog, uTransparent) * uOpacity;
    gl_FragColor = vec4(mix(color, uBackground, vFog * (1.0 - uTransparent)), alpha);
  }
`,xo=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,bo=`
  uniform sampler2D uTexture;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec4 tap(vec2 offset) {
    return min(texture2D(uTexture, vUv + uTexel * offset), vec4(1.0));
  }
  void main() {
    vec4 sum = tap(vec2(0.0)) * 4.0 + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
    gl_FragColor = sum * 0.125;
  }
`,Vt=`
  uniform sampler2D uTexture;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec4 tent() {
    vec4 sum = texture2D(uTexture, vUv + uTexel * vec2(-1.0, 0.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(1.0, 0.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.0, -1.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.0, 1.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(-0.5, -0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.5, -0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(-0.5, 0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.5, 0.5)) * 2.0;
    return sum / 12.0;
  }
`,yo=`
  ${Vt}
  void main() {
    gl_FragColor = tent();
  }
`,Co=`
  ${Vt}
  uniform float uStrength;
  uniform float uCeiling;
  uniform float uLight;
  void main() {
    vec4 color = tent() * uStrength;
    float peak = max(uLight > 0.5 ? color.a : max(color.r, max(color.g, color.b)), 0.0001);
    color *= uCeiling * (1.0 - exp(-peak / uCeiling)) / peak;
    gl_FragColor = uLight > 0.5 ? color : vec4(color.rgb, 0.0);
  }
`,X=null,Q=a=>{if(X=X??document.createElement("canvas").getContext("2d"),!X)return[1,1,1];X.fillStyle="#000000",X.fillStyle=a;let o=String(X.fillStyle);if(o.startsWith("#")){let d=parseInt(o.slice(1,7),16);return[(d>>16&255)/255,(d>>8&255)/255,(d&255)/255]}let u=o.match(/[\d.]+/g)?.map(Number)??[0,0,0];return[u[0]/255,u[1]/255,u[2]/255]},Le=(a,o,u)=>{let d=u.length?u:["#ffffff"];for(let v=0;v<Z;v++)a.value[v].fromArray(Q(d[v%d.length]));o.value=Math.min(d.length,Z)},Ot=a=>{let o=new Lt;return o.setIndex(a.index),Object.entries(a.attributes).forEach(([u,d])=>o.setAttribute(u,d)),o},_=a=>Math.sin(a)*.5+.5,ce=(a,o)=>Math.cos(Math.PI*a*4+o)*25+Math.cos(Math.PI*a*8+o*2)**2*5,de=(a,o)=>-_(Math.PI*a*8+o)*10-_(Math.PI*a+o/8)**5*10,ve=(a,o)=>Math.sin(a*Math.PI*4+o)*10,fe=(a,o)=>Math.abs(a*10)**2+Math.sin(a*Math.PI*8+o)*20,Ro=(a,o)=>{let{PI:u,cos:d,sin:v}=Math;return[[d(a*u*5+o)*25-d(.02*u*5+o)*25,v(a*u*2+u*.5+o)*15-v(.02*u*2+u*.5+o)*15,0],[ce(a,o)-ce(.0125,o),de(a,o)-de(.0125,o),0],[d(a*u*3+o)*30-d(.02*u*3+o)*30,_(a*u*6+o)*30-_(.02*u*6+o)*30,_(a*u*10+o)*20-_(.02*u*10+o)*20],[v(a*u*2+o)*35-v(.0125*u*2+o)*35,v(a*u*3+o)*10-v(.0125*u*3+o)*10,0],[ve(a,o)-ve(.02,o),fe(a,o)-fe(.02,o),0]]},Mo=(a,o)=>{let[d,,v,J]=Ro(.025,a);return[[d[0]*o*2,d[1]*o*.4,-3],[(ce(.025,a)-ce(.025+.007,a))*o*-2,(de(.025,a)-de(.025+.007,a))*o*-5,-10],[v[0]*o*2,v[1]*o*2,v[2]*o*2-5],[J[0]*o,J[1]*o,-5],[(ve(.025,a)-ve(.025+.01,a))*o*-2,(fe(.025,a)-fe(.025+.01,a))*o*-4,-10]]},So="absolute inset-0 overflow-hidden touch-pan-y select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full",Ao=({curve:a="winding",curvature:o=1,speed:u=1,boost:d=3,fov:v=90,boostFov:J=130,lanes:Dt=3,roadWidth:kt=10,medianWidth:Nt=2,density:Ut=40,trailLength:Gt=1,lightSize:Yt=1,poles:$t=20,poleHeight:jt=1,dust:Kt=100,glow:qt=.6,reflections:Qt=.5,steer:Zt=.35,tailColors:Be,headColors:ze,poleColors:Oe,roadColor:Jt,roadOpacity:eo=.1,lineColor:to,background:oo,theme:Ve="dark",interactive:ao=!0,boosting:no=!1,onBoostStart:Xe,onBoostEnd:_e,className:De="",style:ro})=>{let ke=(0,D.useRef)(null),M=zt[Ve]??zt.dark,Ne={light:Ve==="light",curve:Bt.includes(a)?a:"winding",curvature:Math.max(0,o),speed:Math.max(0,u),boost:Math.max(1,d),fov:Math.min(170,Math.max(20,v)),boostFov:Math.min(170,Math.max(20,J)),lanes:Math.max(1,Math.round(Dt)),roadWidth:Math.max(1,kt),medianWidth:Math.max(0,Nt),density:Math.min(V,Math.max(0,Math.round(Ut))),trailLength:Math.max(.05,Gt),lightSize:Math.max(.1,Yt),poles:Math.min(K,Math.max(0,Math.round($t))),poleHeight:Math.max(.1,jt),dust:Math.min(q,Math.max(0,Math.round(Kt))),glow:Math.max(0,qt),reflections:Math.max(0,Qt),steer:Math.max(0,Zt),tailColors:Be?.length?Be:M.tail,headColors:ze?.length?ze:M.head,poleColors:Oe?.length?Oe:M.poles,roadColor:Jt??M.road,roadOpacity:Math.min(1,Math.max(0,eo)),lineColor:to??M.lines,background:oo??M.background,dustColor:M.dust,interactive:ao,boosting:no},L=(0,D.useRef)(Ne);L.current=Ne;let pe=(0,D.useRef)({onBoostStart:Xe,onBoostEnd:_e});return pe.current={onBoostStart:Xe,onBoostEnd:_e},(0,D.useEffect)(()=>{let m=ke.current;if(!m)return;let Ue=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,s=new Wt({antialias:!0,alpha:!0,powerPreference:"high-performance"});s.outputColorSpace=He,s.autoClear=!1,s.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),m.appendChild(s.domElement);let W=new Ie,p=new St(L.current.fov,1,.1,1e4);p.position.set(0,8,-5);let g={uTime:{value:0},uCurvature:{value:1},uCurveA:{value:new yt},uCurveB:{value:0},uFogNear:{value:j*.22},uFogFar:{value:j*.95},uTravel:{value:j},uStretch:{value:0},uPixel:{value:.001}},T=[],ee=[],te=(t,e,r,c={})=>{let h=new Fe({vertexShader:t,fragmentShader:e,uniforms:{...g,...r},transparent:!0,depthWrite:!1,...c});return T.push(h),h},Ge=()=>({value:Array.from({length:Z},()=>new y(1,1,1))}),oe=new Pe(1,j,1,220);oe.rotateX(-Math.PI/2),oe.translate(0,0,-j/2),T.push(oe);let E={uWidth:{value:1},uRoadColor:{value:new y},uLineColor:{value:new y},uBackground:{value:new y},uRoadWidth:{value:10},uMedian:{value:2},uLanes:{value:3},uTransparent:{value:0},uOpacity:{value:1}},ae=te(Eo,wo,E,{transparent:!0,depthWrite:!0}),ne=new $(oe,ae);ne.frustumCulled=!1,ne.renderOrder=0,ne.layers.enable(1),W.add(ne);let Ye=new It(new Ft(new y(0,0,0),new y(0,0,-1)),24,1,7,!1);T.push(Ye);let $e=(t,e,r)=>{let c=Ot(Ye),h=new Float32Array(V*2*4),f=new Float32Array(V*2*4),I=new Float32Array(V*2),N=new Float32Array(V*2);for(let C=0;C<V;C++){let O=[Math.random(),Math.random(),Math.random(),Math.random()],P=[Math.random(),Math.random(),Math.random(),Math.random()*Math.random()],G=Math.random();for(let i=0;i<2;i++){let l=C*2+i;h.set(O,l*4),f.set(P,l*4),I[l]=i?.5:-.5,N[l]=G}}c.setAttribute("aSeedA",new R(h,4)),c.setAttribute("aSeedB",new R(f,4)),c.setAttribute("aPair",new R(I,1)),c.setAttribute("aTone",new R(N,1)),c.instanceCount=0,T.push(c);let U={uRoadX:{value:0},uRoadWidth:{value:10},uLanes:{value:3},uDirection:{value:t},uSpeedRange:{value:new ue(...r)},uTrail:{value:1},uSize:{value:1},uColors:Ge(),uColorCount:{value:1},uFade:{value:new ue(...e)}},ie=(C,O,P,G)=>{let i=te(fo,mo,{...U,uRadiusScale:{value:C},uSharp:{value:O},uMirror:{value:P},uIntensity:{value:1},uCore:{value:0}},{depthTest:!P});ee.push(i);let l=new $(c,i);return l.frustumCulled=!1,l.renderOrder=G,P||l.layers.enable(1),W.add(l),i};return{geometry:c,uniforms:U,reflection:ie(2.1,1.2,1,1),core:ie(1,.85,0,3)}},ge=$e(1,[0,.6],[60,80]),Te=$e(-1,[1,.4],[120,160]),je=new Ht(1,1,1,8,1,!0);T.push(je);let S=Ot(je),Ke=new Float32Array(K*2*4),qe=new Float32Array(K*2),Qe=new Float32Array(K*2);for(let t=0;t<K;t++)for(let e=0;e<2;e++){let r=t*2+e;Ke.set([Math.random(),Math.random(),Math.random(),Math.random()],r*4),qe[r]=t+(e?.5:0),Qe[r]=e?1:-1}S.setAttribute("aSeed",new R(Ke,4)),S.setAttribute("aIndex",new R(qe,1)),S.setAttribute("aSide",new R(Qe,1)),S.instanceCount=0,T.push(S);let B={uCount:{value:20},uEdge:{value:11},uHeight:{value:1},uColors:Ge(),uColorCount:{value:1}},Ze=(t,e,r,c)=>{let h=te(ho,po,{...B,uRadiusScale:{value:t},uSharp:{value:e},uMirror:{value:r},uIntensity:{value:1},uCore:{value:0}},{depthTest:!r});ee.push(h);let f=new $(S,h);return f.frustumCulled=!1,f.renderOrder=c,r||f.layers.enable(1),W.add(f),h},Ee={reflection:Ze(2.4,1.2,1,1),core:Ze(1,.8,0,3)},A=new Mt,we=new Float32Array(q*2*4),Je=new Float32Array(q*2);for(let t=0;t<q;t++){let e=[Math.random(),Math.random(),Math.random(),Math.random()];we.set(e,t*8),we.set(e,t*8+4),Je[t*2+1]=1}A.setAttribute("position",new se(new Float32Array(q*2*3),3)),A.setAttribute("aSeed",new se(we,4)),A.setAttribute("aEnd",new se(Je,1)),A.setDrawRange(0,0),T.push(A);let re={uSpread:{value:140},uColor:{value:new y(1,1,1)},uIntensity:{value:.5}},et=te(go,To,re);ee.push(et);let xe=new At(A,et);xe.frustumCulled=!1,xe.renderOrder=4,W.add(xe);let io=s.extensions.has("EXT_color_buffer_float")||s.extensions.has("EXT_color_buffer_half_float"),w=Array.from({length:5},(t,e)=>{let r=new Ct(1,1,{type:io?bt:xt,depthBuffer:e===0});return T.push(r),r}),tt=new Ie,lo=new Pt(-1,1,1,-1,0,1),ot=new Pe(2,2);T.push(ot);let be=new $(ot);be.frustumCulled=!1,tt.add(be);let ye=(t,e)=>{let r=new Fe({vertexShader:xo,fragmentShader:t,uniforms:{uTexture:{value:null},uTexel:{value:new ue},uStrength:{value:1},uCeiling:{value:1},uLight:{value:0}},depthTest:!1,depthWrite:!1,...e});return T.push(r),r},uo=ye(bo,{blending:gt}),so=ye(yo,{blending:Se,blendSrc:b,blendDst:b,blendSrcAlpha:b,blendDstAlpha:b}),H=ye(Co,{blending:Se,blendSrc:b}),Ce=(t,e,r)=>{be.material=t,t.uniforms.uTexture.value=e.texture,t.uniforms.uTexel.value.set(1/e.width,1/e.height),s.setRenderTarget(r),s.render(tt,lo)},at=new Rt,nt=0,n={boost:0,held:!1,boosted:!1,fov:L.current.fov,fovVelocity:0,steerX:0,steerY:0,pointerX:0,pointerY:0,weights:[0,0,0,0,0],visible:!0},x={tail:"",head:"",poles:"",surface:"",light:null},F=new y,k=0,Re=performance.now(),Me=!0,co=t=>{let e=t.tailColors.join();e!==x.tail&&(x.tail=e,Le(ge.uniforms.uColors,ge.uniforms.uColorCount,t.tailColors));let r=t.headColors.join();r!==x.head&&(x.head=r,Le(Te.uniforms.uColors,Te.uniforms.uColorCount,t.headColors));let c=t.poleColors.join();c!==x.poles&&(x.poles=c,Le(B.uColors,B.uColorCount,t.poleColors));let h=[t.roadColor,t.lineColor,t.background,t.dustColor].join();if(h!==x.surface){x.surface=h,E.uRoadColor.value.fromArray(Q(t.roadColor)),E.uLineColor.value.fromArray(Q(t.lineColor)),re.uColor.value.fromArray(Q(t.dustColor));let f=t.background==="transparent",I=f?[0,0,0]:Q(t.background);E.uBackground.value.fromArray(I),E.uTransparent.value=f?1:0,at.setRGB(...I,He),nt=f?0:1}x.light!==t.light&&(x.light=t.light,ee.forEach(f=>{f.blending=t.light?Tt:Et,f.needsUpdate=!0}),H.blendDst=t.light?Ae:b,H.blendSrcAlpha=t.light?b:wt,H.blendDstAlpha=t.light?Ae:b,H.uniforms.uLight.value=t.light?1:0)},rt=()=>{let t=Math.max(1,m.clientWidth),e=Math.max(1,m.clientHeight);s.setSize(t,e,!1),w.forEach((r,c)=>r.setSize(Math.max(1,Math.round(t/2**(c+1))),Math.max(1,Math.round(e/2**(c+1))))),p.aspect=t/e,p.updateProjectionMatrix(),lt()},it=t=>{if(k=0,!Me)return;let e=L.current,r=Math.min(.05,Math.max(.001,(t-Re)/1e3));Re=t,co(e);let c=n.held&&e.interactive||e.boosting?1:0;n.boost+=(c-n.boost)*(1-Math.exp(-r/(c>n.boost?.28:.85)));let h=e.speed*(Ue?.3:1)*(1+(e.boost-1)*n.boost);g.uTime.value+=r*h,g.uStretch.value=n.boost*1.1,g.uCurvature.value=e.curvature;let f=Bt.indexOf(e.curve)-1,I=1-Math.exp(-r/.6);n.weights=n.weights.map((i,l)=>i+((l===f?1:0)-i)*I),g.uCurveA.value.set(n.weights[0],n.weights[1],n.weights[2],n.weights[3]),g.uCurveB.value=n.weights[4];let N=e.roadWidth/2+e.medianWidth/2,U=.45+.55*e.roadOpacity;[ge,Te].forEach((i,l)=>{i.geometry.instanceCount=e.density*2,i.uniforms.uRoadX.value=l?N:-N,i.uniforms.uRoadWidth.value=e.roadWidth,i.uniforms.uLanes.value=e.lanes,i.uniforms.uTrail.value=e.trailLength,i.uniforms.uSize.value=e.lightSize,i.core.uniforms.uIntensity.value=e.light?.95:1+.35*n.boost,i.core.uniforms.uCore.value=e.light?0:.75,i.reflection.uniforms.uIntensity.value=e.reflections*(e.light?.22:.42)*U}),S.instanceCount=e.poles*2,B.uCount.value=Math.max(1,e.poles),B.uEdge.value=e.roadWidth+e.medianWidth/2+.8,B.uHeight.value=e.poleHeight,Ee.core.uniforms.uIntensity.value=e.light?.9:1,Ee.core.uniforms.uCore.value=e.light?0:.6,Ee.reflection.uniforms.uIntensity.value=e.reflections*(e.light?.2:.38)*U,A.setDrawRange(0,e.dust*2),re.uIntensity.value=(e.light?.35:.45)*(1+n.boost),re.uSpread.value=(e.roadWidth*2+e.medianWidth)*5,E.uWidth.value=e.roadWidth*2+e.medianWidth+3,E.uRoadWidth.value=e.roadWidth,E.uMedian.value=e.medianWidth,E.uLanes.value=e.lanes,E.uOpacity.value=e.roadOpacity,ae.depthWrite=e.roadOpacity>.5;let ie=Ue?e.fov:e.fov+(e.boostFov-e.fov)*n.boost;n.fovVelocity+=((ie-n.fov)*90-n.fovVelocity*13)*r,n.fov+=n.fovVelocity*r,p.fov=n.fov,g.uPixel.value=2*Math.tan(n.fov*Math.PI/360)/Math.max(1,s.domElement.height);let C=1-Math.exp(-r/.35),O=e.interactive?e.steer:0;n.steerX+=(n.pointerX*O-n.steerX)*C,n.steerY+=(n.pointerY*O-n.steerY)*C,p.position.set(n.steerX*e.roadWidth*.45,8-n.steerY*2.5,-5);let P=Mo(g.uTime.value,e.curvature),G=1-n.weights.reduce((i,l)=>i+l,0);if(F.set(0,0,-10*G),P.forEach((i,l)=>{F.x+=i[0]*n.weights[l],F.y+=i[1]*n.weights[l],F.z+=i[2]*n.weights[l]}),F.x+=n.steerX*2.5,F.add(p.position),p.lookAt(F),p.updateProjectionMatrix(),s.setRenderTarget(null),s.setClearColor(at,nt),s.clear(),s.render(W,p),e.glow>0){let i=g.uPixel.value;g.uPixel.value=i*(s.domElement.height/w[0].height),p.layers.set(1),ae.colorWrite=!1,s.setRenderTarget(w[0]),s.setClearColor(0,0),s.clear(),s.render(W,p),ae.colorWrite=!0,p.layers.set(0),g.uPixel.value=i;for(let l=1;l<w.length;l++)Ce(uo,w[l-1],w[l]);for(let l=w.length-1;l>1;l--)Ce(so,w[l],w[l-1]);H.uniforms.uStrength.value=e.glow*(e.light?.5:1.4),H.uniforms.uCeiling.value=e.glow*(e.light?.3:.5),Ce(H,w[1],null)}n.visible&&(k=requestAnimationFrame(it))},lt=()=>{k||!Me||!n.visible||(Re=performance.now(),k=requestAnimationFrame(it))},ut=t=>{n.held!==t&&(n.held=t,L.current.interactive&&(t?pe.current.onBoostStart?.():pe.current.onBoostEnd?.()))},st=t=>{t.button!==0&&t.pointerType==="mouse"||ut(!0)},z=()=>ut(!1),ct=t=>{let e=m.getBoundingClientRect();n.pointerX=(t.clientX-e.left)/e.width*2-1,n.pointerY=(t.clientY-e.top)/e.height*2-1},dt=()=>{n.pointerX=0,n.pointerY=0},vt=t=>{L.current.interactive&&t.preventDefault()},ft=new ResizeObserver(rt);ft.observe(m);let mt=new IntersectionObserver(t=>{n.visible=t.some(e=>e.isIntersecting),n.visible&&lt()});return mt.observe(m),m.addEventListener("pointerdown",st),m.addEventListener("pointermove",ct),m.addEventListener("pointerleave",dt),m.addEventListener("contextmenu",vt),window.addEventListener("pointerup",z),window.addEventListener("pointercancel",z),window.addEventListener("blur",z),rt(),()=>{Me=!1,cancelAnimationFrame(k),ft.disconnect(),mt.disconnect(),m.removeEventListener("pointerdown",st),m.removeEventListener("pointermove",ct),m.removeEventListener("pointerleave",dt),m.removeEventListener("contextmenu",vt),window.removeEventListener("pointerup",z),window.removeEventListener("pointercancel",z),window.removeEventListener("blur",z),T.forEach(t=>t.dispose()),s.dispose(),s.domElement.remove()}},[]),(0,_t.jsx)("div",{ref:ke,className:`${So}${De?` ${De}`:""}`,style:ro})},Xt=Ao;var We=Y(le(),1),Ho=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],he=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Oo=Ho.map((a,o)=>({id:o+1,image:a,src:a,img:a,url:a,title:he[o],text:he[o],label:he[o],alt:he[o],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][o],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Fo({big:a}){return(0,We.jsx)(pt,{big:a,dark:!0,center:!1,zoom:1,drive:!1,children:(0,We.jsx)(Xt,{})})}var Vo=ht(Fo);export{Vo as default};
