import{c as Mt,i as to,j as Tt,l as ye,m as Me}from"./chunks/chunk-6IYH4WPJ.js";var rt=Mt(to(),1),Gt=Mt(Tt(),1),ge=50,lt=20,jt=1.5,ft=16,gt=12,be=.01,Ae={satin:{roughness:.42,metalness:0,coat:.35,coatRoughness:.22,scatter:1,frost:0},matte:{roughness:.92,metalness:0,coat:0,coatRoughness:.5,scatter:.5,frost:0},gloss:{roughness:.2,metalness:0,coat:1,coatRoughness:.08,scatter:1,frost:0},frosted:{roughness:.55,metalness:0,coat:.6,coatRoughness:.18,scatter:1.5,frost:1},metal:{roughness:.3,metalness:1,coat:0,coatRoughness:.2,scatter:0,frost:0}},eo=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aSphere;
layout(location = 2) in vec4 aColor;
layout(location = 3) in vec4 aShade;
uniform mat4 uProj;
uniform float uCameraZ;
uniform float uPixel;
out vec3 vPoint;
flat out vec3 vCenter;
flat out float vRadius;
flat out vec4 vColor;
flat out vec4 vShade;
void main() {
  vec3 c = vec3(aSphere.xy, aSphere.z - uCameraZ);
  float r = aSphere.w;
  float d = length(c);
  vec3 toCamera = -c / d;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
  vec3 up = cross(toCamera, right);
  float reach = r * d / sqrt(max(d * d - r * r, 1e-4)) + uPixel * d * 2.0;
  vec3 p = c + (right * aCorner.x + up * aCorner.y) * reach;
  vPoint = p;
  vCenter = c;
  vRadius = r;
  vColor = aColor;
  vShade = aShade;
  gl_Position = uProj * vec4(p, 1.0);
}`,oo=`#version 300 es
precision highp float;
in vec3 vPoint;
flat in vec3 vCenter;
flat in float vRadius;
flat in vec4 vColor;
flat in vec4 vShade;
uniform mat4 uProj;
uniform vec3 uLightPos;
uniform vec3 uLight;
uniform float uExposure;
uniform float uShadow;
uniform vec4 uSurface;
uniform vec2 uExtra;
out vec4 outColor;

const float PI = 3.14159265;

float lobe(vec3 d, vec3 axis, float sharp) {
  return pow(max(dot(d, axis), 0.0), sharp) * (sharp + 1.0) * 0.16;
}

vec3 studio(vec3 d, float rough) {
  float r = clamp(rough, 0.0, 1.0);
  float sharp = mix(60.0, 1.2, sqrt(r));
  vec3 col = mix(vec3(0.085, 0.085, 0.09), vec3(0.38, 0.38, 0.39), smoothstep(-0.7, 0.9, d.y));
  col += vec3(1.0, 0.99, 0.97) * 2.6 * lobe(d, normalize(vec3(-0.42, 0.78, 0.47)), sharp);
  col += vec3(0.97, 0.98, 1.0) * 1.1 * lobe(d, normalize(vec3(0.78, 0.22, 0.58)), sharp * 0.7);
  col += vec3(1.0) * 1.3 * lobe(d, normalize(vec3(0.15, 0.55, -0.82)), sharp * 0.8);
  return col;
}

vec2 envBRDF(float NoV, float rough) {
  vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough * c0 + c1;
  float a = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a + r.zw;
}

float ggx(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}

float smith(float NoV, float NoL, float a) {
  float k = a * 0.5;
  return 0.25 / max((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k), 1e-4);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 rd = normalize(vPoint);
  float b = dot(vCenter, rd);
  float h = length(vCenter - rd * b);
  float r = vRadius;
  float aa = max(fwidth(h), 1e-5);
  float cover = clamp((r - h) / aa + 0.5, 0.0, 1.0);
  if (cover <= 0.002) discard;
  float hc = min(h, r * 0.9995);
  float t = b - sqrt(r * r - hc * hc);
  vec3 pos = rd * t;
  vec3 n = normalize(pos - vCenter);
  vec4 clip = uProj * vec4(pos, 1.0);
  gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);

  vec3 v = -rd;
  vec3 albedo = vColor.rgb;
  bool lamp = vColor.a > 0.5;
  vec3 dn = fwidth(n);
  float rough = sqrt(min(uSurface.x * uSurface.x + dot(dn, dn) * 0.6, 1.0));
  float metal = uSurface.y;
  float coat = uSurface.z;
  float coatRough = sqrt(min(uSurface.w * uSurface.w + dot(dn, dn) * 0.6, 1.0));
  float NoV = clamp(dot(n, v), 1e-4, 1.0);
  vec3 R = reflect(-v, n);

  float occlusion = vShade.w * smoothstep(-0.15, 0.9, dot(n, vShade.xyz));
  float ao = 1.0 - uShadow * occlusion;
  float specAo = 1.0 - uShadow * occlusion * 0.7;

  vec3 L = uLightPos - pos;
  float dist2 = dot(L, L);
  L *= inversesqrt(dist2);
  vec3 radiance = lamp ? vec3(0.0) : uLight / (dist2 + 1.0);
  float NoL = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + v);
  float NoH = clamp(dot(n, H), 0.0, 1.0);
  float VoH = clamp(dot(v, H), 0.0, 1.0);

  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec2 ab = envBRDF(NoV, rough);
  vec3 Fr = max(vec3(1.0 - rough), F0) - F0;
  vec3 kS = F0 + Fr * pow(1.0 - NoV, 5.0);
  vec3 diffuseColor = albedo * (1.0 - metal);
  vec3 irradiance = studio(n, 1.0) * 1.15;
  vec3 envSpec = studio(R, rough) * (F0 * ab.x + ab.y);
  vec3 col = diffuseColor * irradiance * (1.0 - kS) * ao + envSpec * specAo;
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  float a = max(rough * rough, 0.06);
  vec3 spec = ggx(NoH, a) * smith(NoV, NoL, a) * F;
  float wrap = clamp((dot(n, L) + 0.3) / 1.3, 0.0, 1.0);
  col += (diffuseColor * (1.0 - F) / PI * wrap + spec * NoL) * radiance;
  vec3 sh = normalize(L + n * 0.1);
  float scatter = pow(clamp(dot(v, -sh), 0.0, 1.0), 2.0) * 10.0 + 0.04;
  col += scatter * albedo * radiance * 0.03 * uExtra.x;
  float alpha = 1.0;
  if (uExtra.y > 0.5) {
    float rim = pow(1.0 - NoV, 2.5);
    col += albedo * (studio(-R, 1.0) * 0.35 + 0.06) * (1.0 - rim);
    col += radiance * albedo * pow(max(dot(-v, L), 0.0), 3.0) * 0.08;
    alpha = mix(0.5, 0.96, rim);
  }
  if (coat > 0.0) {
    float Fc = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    float ca = max(coatRough * coatRough, 0.03);
    vec3 coatEnv = studio(R, coatRough) * Fc;
    float coatSpec = ggx(NoH, ca) * smith(NoV, NoL, ca) * (0.04 + 0.96 * pow(1.0 - VoH, 5.0)) * NoL;
    col = col * (1.0 - Fc * coat) + (coatEnv * specAo + radiance * coatSpec) * coat;
    alpha = mix(alpha, 1.0, Fc * coat);
  }
  if (lamp) col += uLight * 0.0025 * (0.4 + 0.6 * albedo);
  col = aces(col * uExposure);
  col = pow(col, vec3(1.0 / 2.2));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float a2 = alpha * cover;
  outColor = vec4(col * a2, a2);
}`,Y=(u,B,k)=>Math.min(k,Math.max(B,u)),ze=(u,B,k)=>{let E=u.createShader(B);return E?(u.shaderSource(E,k),u.compileShader(E),u.getShaderParameter(E,u.COMPILE_STATUS)?E:(u.deleteShader(E),null)):null},no=u=>{let B=ze(u,u.VERTEX_SHADER,eo),k=ze(u,u.FRAGMENT_SHADER,oo),E=u.createProgram();if(!B||!k||!E)return null;if(u.attachShader(E,B),u.attachShader(E,k),u.linkProgram(E),u.deleteShader(B),u.deleteShader(k),!u.getProgramParameter(E,u.LINK_STATUS))return u.deleteProgram(E),null;let Q={},Vt=u.getProgramParameter(E,u.ACTIVE_UNIFORMS);for(let mt=0;mt<Vt;mt++){let xt=u.getActiveUniform(E,mt);xt&&(Q[xt.name]=u.getUniformLocation(E,xt.name))}return{program:E,uniforms:Q}},Se=u=>{let B;if(typeof u=="number")B=[(u>>16&255)/255,(u>>8&255)/255,(u&255)/255];else{let k=String(u||"#ffffff").replace("#","").trim();(k.length===3||k.length===4)&&(k=k.slice(0,3).split("").map(Q=>Q+Q).join(""));let E=parseInt(k.slice(0,6),16);B=Number.isNaN(E)?[1,1,1]:[(E>>16&255)/255,(E>>8&255)/255,(E&255)/255]}return B.map(k=>Math.pow(k,2.2))},ao=({count:u=200,colors:B=["#ffffff"],material:k="satin",minSize:E=.5,maxSize:Q=1,gravity:Vt=.5,friction:mt=.9975,wallBounce:xt=.95,bounce:Fe=.85,depth:Ee=2,drift:Pe=0,followCursor:Le=!0,cursorSize:Ce=1,grab:Ie=!0,clickEffect:Ne="burst",lightColor:Be="#ffffff",lightIntensity:kt=1,exposure:He=1,shadows:Te=.6,intro:_e=!0,dpr:Ve,className:ke="",style:De})=>{let $t=(0,rt.useRef)(null),Kt=(0,rt.useRef)(null),Dt=(0,rt.useRef)(null),Qt={count:Math.round(Y(u,1,4e3)),colors:Array.isArray(B)&&B.length?B:["#ffffff"],material:Ae[k]?k:"satin",minSize:Math.max(.05,Math.min(E,Q)),maxSize:Math.max(.05,Math.max(E,Q)),gravity:Vt,friction:Y(mt,.5,1),wallBounce:Y(xt,0,1),bounce:Y(Fe,0,1),depth:Math.max(0,Ee),drift:Math.max(0,Pe),followCursor:Le,cursorSize:Math.max(0,Ce),grab:Ie,clickEffect:Ne,lightColor:Be,lightIntensity:kt>20?kt/200:Math.max(0,kt),exposure:Math.max(0,He),shadows:Y(Te,0,1),intro:_e,dpr:Ve},J=(0,rt.useRef)(Qt);return J.current=Qt,(0,rt.useEffect)(()=>{let ct=$t.current,st=Kt.current,s=st?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!0,stencil:!1,powerPreference:"high-performance"});if(!ct||!st||!s)return;let bt=no(s);if(!bt)return;let j=bt.uniforms,At=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,f={width:1,height:1,ratio:1,halfW:9,halfH:9,fit:1,tan:Math.tan(ge*Math.PI/360)},it=new Float32Array(16),Ut=s.createVertexArray();s.bindVertexArray(Ut);let Jt=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,Jt),s.bufferData(s.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),s.STATIC_DRAW),s.enableVertexAttribArray(0),s.vertexAttribPointer(0,2,s.FLOAT,!1,0,0);let zt=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,zt);for(let t=0;t<3;t++)s.enableVertexAttribArray(1+t),s.vertexAttribPointer(1+t,4,s.FLOAT,!1,gt*4,t*16),s.vertexAttribDivisor(1+t,1);s.bindVertexArray(null);let Yt=0,P=0,A=new Float32Array(0),y=new Float32Array(0),g=new Float32Array(0),v=new Float32Array(0),w=new Float32Array(0),M=new Float32Array(0),C=new Float32Array(0),tt=new Float32Array(0),pt=new Float32Array(0),St=new Float32Array(0),T=new Float32Array(0),et=new Float32Array(0),vt=new Uint16Array(0),G=new Uint8Array(0),Rt=new Int32Array(0),qt=new Int32Array(0),Z=new Int32Array(1),z=new Float32Array(gt),$=new Int32Array(2),Wt=new Int32Array(2),Ft=[],te="",ee="",Ue=t=>{let n=(o,c=1)=>{let i=new Float32Array(t*c);return i.set(o.subarray(0,Math.min(o.length,i.length))),i},r=o=>{let c=new Uint8Array(t);return c.set(o.subarray(0,Math.min(o.length,c.length))),c};A=n(A),y=n(y),g=n(g),v=n(v),w=n(w),M=n(M),C=n(C),tt=n(tt),pt=n(pt),St=n(St),T=n(T,4),et=n(et,3);let a=new Uint16Array(t);a.set(vt.subarray(0,Math.min(vt.length,t))),vt=a,G=r(G),Rt=new Int32Array(t),qt=new Int32Array(t),Z=new Int32Array(t+1),z=new Float32Array((t+1)*gt),Yt=t,s.bindBuffer(s.ARRAY_BUFFER,zt),s.bufferData(s.ARRAY_BUFFER,z.byteLength,s.DYNAMIC_DRAW)},H={x:0,y:0,inside:!1,down:!1,downX:0,downY:0,downAt:0,moved:!1},d={x:0,y:0,z:0,r:0,tx:0,ty:0,vx:0,vy:0},_={x:0,y:5,z:6,flash:0},p={index:-1,ox:0,oy:0,tx:0,ty:0,vx:0,vy:0},Et=0,wt=0,yt=0,Pt=0,Lt=!0,Ct=0,Ye=(t,n,r)=>{let a=C[t],o=Math.max(n.depth-a,0);if(G[t]=1,r&&n.gravity>.05)A[t]=(Math.random()*2-1)*Math.max(f.halfW-a,.01),y[t]=f.halfH+a+Math.random()*f.halfH*2.2,g[t]=(Math.random()*2-1)*o,v[t]=(Math.random()-.5)*2,w[t]=-(4+Math.random()*5),M[t]=0,G[t]=0;else if(r){let c=(Math.random()*2-1)*Math.max(f.halfW-a,.01),i=(Math.random()*2-1)*Math.max(f.halfH-a,.01),l=(Math.random()*2-1)*o;A[t]=(Math.random()*2-1)*.6,y[t]=(Math.random()*2-1)*.6,g[t]=(Math.random()*2-1)*Math.min(o,.3),v[t]=(c-A[t])*2.2,w[t]=(i-y[t])*2.2,M[t]=(l-g[t])*2.2,wt=1}else A[t]=(Math.random()*2-1)*Math.max(f.halfW-a,.01),y[t]=(Math.random()*2-1)*Math.max(f.halfH-a,.01),g[t]=(Math.random()*2-1)*o,v[t]=0,w[t]=0,M[t]=0},qe=t=>{for(let n=0;n<P;n++)C[n]=(t.minSize+pt[n]*(t.maxSize-t.minSize))*f.fit,tt[n]=1/(C[n]*C[n]*C[n])},We=t=>{Ft=t.colors.map(Se),te=t.colors.join("|")},oe=(t,n)=>{let r=`${t.minSize}:${t.maxSize}:${f.fit}`;if(t.count!==P){t.count>Yt&&Ue(Math.max(t.count,Math.ceil(Yt*1.5)));let a=P;P=t.count;for(let o=a;o<P;o++)pt[o]=Math.random(),vt[o]=o,St[o]=Math.random()*Math.PI*2,C[o]=(t.minSize+pt[o]*(t.maxSize-t.minSize))*f.fit,tt[o]=1/(C[o]*C[o]*C[o]),Ye(o,t,(n?t.intro:!0)&&!At);for(let o=0;o<=P;o++)Z[o]=o}r!==ee&&(ee=r,qe(t)),t.colors.join("|")!==te&&We(t)},m=new Float32Array(0),q=0,L={scale:1,x0:0,y0:0,z0:0,nx:1,ny:1,nz:1},Oe=(t,n)=>{L.scale=1/t,L.x0=-f.halfW-t,L.y0=-f.halfH-t,L.z0=-Math.max(n.depth,n.maxSize)-t,L.nx=Math.max(1,Math.ceil((f.halfW*2+t*2)*L.scale)+1),L.ny=Math.max(1,Math.ceil((f.halfH*2+t*2)*L.scale)+1),L.nz=Math.max(1,Math.ceil((Math.max(n.depth,n.maxSize)*2+t*2)*L.scale)+1);let r=L.nx*L.ny*L.nz;$.length<r+1&&($=new Int32Array(r+1),Wt=new Int32Array(r+1)),$.fill(0,0,r+1);for(let a=0;a<P;a++){let o=Y(Math.floor((A[a]-L.x0)*L.scale),0,L.nx-1),c=Y(Math.floor((y[a]-L.y0)*L.scale),0,L.ny-1),l=(Y(Math.floor((g[a]-L.z0)*L.scale),0,L.nz-1)*L.ny+c)*L.nx+o;Rt[a]=l,$[l+1]++}for(let a=1;a<=r;a++)$[a]+=$[a-1];Wt.set($.subarray(0,r+1));for(let a=0;a<P;a++)qt[Wt[Rt[a]]++]=a},ht=(t,n,r,a,o,c,i)=>{if(n>=i||q*8>=m.length)return;let l=v[t]*r+w[t]*a+M[t]*o,e=q*8;m[e]=t,m[e+1]=-2,m[e+2]=r,m[e+3]=a,m[e+4]=o,m[e+5]=n,m[e+6]=l<-1.5?-c*l:0,m[e+7]=0,q++},Xe=(t,n,r,a)=>{let o=p.index,{nx:c,ny:i,nz:l}=L;q=0;for(let e=0;e<P;e++){let h=Rt[e],x=h%c,R=Math.floor(h/c)%i,D=Math.floor(h/(c*i));for(let I=D>0?-1:0;I<=(D<l-1?1:0);I++)for(let F=R>0?-1:0;F<=(R<i-1?1:0);F++){let b=((D+I)*i+R+F)*c;for(let N=x>0?-1:0;N<=(x<c-1?1:0);N++){let V=b+x+N;for(let U=$[V];U<$[V+1];U++){let S=qt[U];if(S<=e)continue;let W=A[S]-A[e],K=y[S]-y[e],X=g[S]-g[e],O=W*W+K*K+X*X,dt=C[e]+C[S],ve=Math.max(dt+a,r?dt*1.4:0);if(O>=ve*ve||O<1e-12)continue;let ut=Math.sqrt(O),Nt=W/ut,Bt=K/ut,Ht=X/ut;if(r){let at=Y(1-(ut-dt)/(dt*.4),0,1);T[e*4]+=Nt*at,T[e*4+1]+=Bt*at,T[e*4+2]+=Ht*at,T[e*4+3]+=at,T[S*4]-=Nt*at,T[S*4+1]-=Bt*at,T[S*4+2]-=Ht*at,T[S*4+3]+=at}if(ut>=dt+a||q*8>=m.length||e===o&&S===o)continue;let we=(v[S]-v[e])*Nt+(w[S]-w[e])*Bt+(M[S]-M[e])*Ht,nt=q*8;m[nt]=e,m[nt+1]=S,m[nt+2]=Nt,m[nt+3]=Bt,m[nt+4]=Ht,m[nt+5]=ut-dt,m[nt+6]=we<-1.5?-t.bounce*we:0,m[nt+7]=0,q++}}}if(e!==o){let I=C[e],F=Math.max(t.depth-I,0);ht(e,A[e]+f.halfW-I,1,0,0,t.wallBounce,a),ht(e,f.halfW-I-A[e],-1,0,0,t.wallBounce,a),ht(e,y[e]+f.halfH-I,0,1,0,t.wallBounce,a),G[e]&&ht(e,f.halfH-I-y[e],0,-1,0,t.wallBounce,a),ht(e,g[e]+F,0,0,1,t.wallBounce,a),ht(e,F-g[e],0,0,-1,t.wallBounce,a)}if(d.r>.01&&e!==o&&q*8<m.length){let I=A[e]-d.x,F=y[e]-d.y,b=g[e]-d.z,N=C[e]+d.r,V=I*I+F*F+b*b;if(V<(N+a)*(N+a)&&V>1e-12){let U=Math.sqrt(V),S=I/U,W=F/U,K=b/U,X=(v[e]-d.vx)*S+(w[e]-d.vy)*W+M[e]*K,O=q*8;m[O]=e,m[O+1]=-1,m[O+2]=S,m[O+3]=W,m[O+4]=K,m[O+5]=U-N,m[O+6]=X<-1.5?-t.bounce*X:0,m[O+7]=0,q++}}}},je=t=>{let n=p.index,r=P>800?5:8;for(let a=0;a<r;a++)for(let o=0;o<q;o++){let c=o*8,i=m[c],l=m[c+1],e=m[c+2],h=m[c+3],x=m[c+4],R=m[c+5],D=R>0?-R/t:m[c+6],I=m[c+7];if(l<0){let W=l===-1?(v[i]-d.vx)*e+(w[i]-d.vy)*h+M[i]*x:v[i]*e+w[i]*h+M[i]*x,K=Math.max(I+D-W,0),X=K-I;m[c+7]=K,v[i]+=X*e,w[i]+=X*h,M[i]+=X*x;continue}let F=i===n?0:tt[i],b=l===n?0:tt[l],N=F+b;if(N<=0)continue;let V=(v[l]-v[i])*e+(w[l]-w[i])*h+(M[l]-M[i])*x,U=Math.max(I+(D-V)/N,0),S=U-I;m[c+7]=U,v[i]-=S*F*e,w[i]-=S*F*h,M[i]-=S*F*x,v[l]+=S*b*e,w[l]+=S*b*h,M[l]+=S*b*x}},Ge=()=>{let t=p.index;for(let n=0;n<2;n++)for(let r=0;r<q;r++){let a=r*8,o=m[a],c=m[a+1];if(c===-2)continue;if(c<0){let b=A[o]-d.x,N=y[o]-d.y,V=g[o]-d.z,U=Math.sqrt(b*b+N*N+V*V),S=C[o]+d.r-U-be;if(S<=0||U<1e-6)continue;let W=S*.5/U;A[o]+=b*W,y[o]+=N*W,g[o]+=V*W;continue}let i=A[c]-A[o],l=y[c]-y[o],e=g[c]-g[o],h=Math.sqrt(i*i+l*l+e*e),x=C[o]+C[c]-h-be;if(x<=0||h<1e-6)continue;let R=o===t?0:tt[o],D=c===t?0:tt[c],I=R+D;if(I<=0)continue;let F=x*.3/(h*I);A[o]-=i*F*R,y[o]-=l*F*R,g[o]-=e*F*R,A[c]+=i*F*D,y[c]+=l*F*D,g[c]+=e*F*D}},Ze=t=>{let n=f.halfW,r=f.halfH,a=t.wallBounce;for(let o=0;o<P;o++){let c=C[o];A[o]<-n+c?(A[o]=-n+c,v[o]<0&&(v[o]=v[o]<-1.5?-v[o]*a:0)):A[o]>n-c&&(A[o]=n-c,v[o]>0&&(v[o]=v[o]>1.5?-v[o]*a:0)),y[o]<-r+c?(y[o]=-r+c,w[o]<0&&(w[o]=w[o]<-1.5?-w[o]*a:0),v[o]*=.995,M[o]*=.995):G[o]&&y[o]>r-c&&(y[o]=r-c,w[o]>0&&(w[o]=w[o]>1.5?-w[o]*a:0)),!G[o]&&y[o]<r-c&&(G[o]=1);let i=Math.max(t.depth-c,0);g[o]<-i?(g[o]=-i,M[o]<0&&(M[o]=M[o]<-1.5?-M[o]*a:0)):g[o]>i&&(g[o]=i,M[o]>0&&(M[o]=M[o]>1.5?-M[o]*a:0))}},$e=(t,n,r)=>{let a=t.gravity*45,o=Math.pow(t.friction,n*60)*(wt>0?Math.exp(-2.2*n):1),c=At?0:t.drift*2.2,i=t.maxSize*f.fit,l=i*.3;m.length<P*96&&(m=new Float32Array(P*96));for(let e=0;e<P;e++){if(e===p.index){let x=1-Math.exp(-n/.02);v[e]=(p.tx-A[e])*x/n,w[e]=(p.ty-y[e])*x/n,M[e]=0;continue}if(w[e]-=a*n,c){let x=St[e];v[e]+=Math.sin(Et*.63+x)*c*n,w[e]+=Math.cos(Et*.47+x*1.7)*c*n,M[e]+=Math.sin(Et*.41+x*2.3)*c*n*.5}v[e]*=o,w[e]*=o,M[e]*=o;let h=v[e]*v[e]+w[e]*w[e]+M[e]*M[e];if(h>ft*ft){let x=ft/Math.sqrt(h);v[e]*=x,w[e]*=x,M[e]*=x}}Oe(i*(r?2.8:2.3),t),r&&T.fill(0,0,P*4),Xe(t,n,r,l),je(n);for(let e=0;e<P;e++)A[e]+=v[e]*n,y[e]+=w[e]*n,g[e]+=M[e]*n;if(Ge(),Ze(t),r)for(let e=0;e<P;e++){let h=y[e]-C[e]+f.halfH,x=C[e]*.5;if(h>=x)continue;let R=1-Math.max(h,0)/x;T[e*4+1]-=R,T[e*4+3]+=R}if(p.index>=0){let e=p.index;p.vx+=(v[e]-p.vx)*(1-Math.exp(-n/.05)),p.vy+=(w[e]-p.vy)*(1-Math.exp(-n/.05))}},ne=(t,n)=>{let r=ct.getBoundingClientRect(),a=(t-r.left)/Math.max(r.width,1)*2-1,o=1-(n-r.top)/Math.max(r.height,1)*2;return[a*f.tan*(f.width/f.height),o*f.tan,-1]},It=(t,n)=>{let r=(n-lt)/t[2];return[t[0]*r,t[1]*r]},Ke=t=>{let n=Math.hypot(t[0],t[1],t[2]),r=t[0]/n,a=t[1]/n,o=t[2]/n,c=-1,i=1/0;for(let l=0;l<P;l++){let e=-A[l],h=-y[l],x=lt-g[l],R=e*r+h*a+x*o,D=C[l]*1.15,I=e*e+h*h+x*x-D*D,F=R*R-I;if(F<0)continue;let b=-R-Math.sqrt(F);b>0&&b<i&&(i=b,c=l)}return c},Qe=(t,n)=>{let r=J.current,a=f.halfH*.7;for(let o=0;o<P;o++){let c=A[o]-t,i=y[o]-n,l=g[o],e=Math.hypot(c,i,l);if(e>=a||e<1e-4)continue;let h=Math.pow(1-e/a,2)*26*(1+.6/(C[o]+.4));v[o]+=c/e*h,w[o]+=i/e*h+h*.25,M[o]+=l/e*h*.5}_.x=t,_.y=n,_.z=Math.max(r.depth,1)+1.5,_.flash=1},ae=J.current.dpr,Ot=()=>{let t=J.current;ae=t.dpr,f.width=Math.max(1,ct.clientWidth),f.height=Math.max(1,ct.clientHeight),f.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),st.width=Math.max(1,Math.round(f.width*f.ratio)),st.height=Math.max(1,Math.round(f.height*f.ratio));let n=f.width/f.height,r=Math.tan(ge*Math.PI/360);f.tan=n>jt?r*jt/n:r,f.halfH=f.tan*lt,f.halfW=f.halfH*n,f.fit=Y(Math.sqrt(f.halfW*f.halfH/(r*r*lt*lt*jt)),.4,1);let a=1/f.tan,o=1,c=80;it.fill(0),it[0]=a/n,it[5]=a,it[10]=(c+o)/(o-c),it[11]=-1,it[14]=2*c*o/(o-c),P||oe(t,!0),re(),ot()},re=()=>{let t=J.current,n=Ae[t.material],r=0,a=P+1;for(let i=1;i<a;i++){let l=Z[i],e=l===P?d.z:g[l],h=i-1;for(;h>=0&&(Z[h]===P?d.z:g[Z[h]])>e;)Z[h+1]=Z[h],h--;Z[h+1]=l}for(let i=0;i<a;i++){let l=Z[i],e=r*gt;if(l===P){if(d.r<.01||!t.followCursor)continue;let h=Ft[0]||[1,1,1];z[e]=d.x,z[e+1]=d.y,z[e+2]=d.z,z[e+3]=d.r,z[e+4]=h[0],z[e+5]=h[1],z[e+6]=h[2],z[e+7]=1,z[e+8]=0,z[e+9]=0,z[e+10]=0,z[e+11]=0}else{let h=Ft[vt[l]%Ft.length];z[e]=A[l],z[e+1]=y[l],z[e+2]=g[l],z[e+3]=C[l],z[e+4]=h[0],z[e+5]=h[1],z[e+6]=h[2],z[e+7]=0;let x=T[l*4+3],R=Math.hypot(T[l*4],T[l*4+1],T[l*4+2])||1;z[e+8]=T[l*4]/R,z[e+9]=T[l*4+1]/R,z[e+10]=T[l*4+2]/R,z[e+11]=Math.min(x*.55,1)}r++}if(s.viewport(0,0,st.width,st.height),s.clearColor(0,0,0,0),s.clearDepth(1),s.clear(s.COLOR_BUFFER_BIT|s.DEPTH_BUFFER_BIT),!r)return;s.enable(s.DEPTH_TEST),s.depthFunc(s.LEQUAL),s.enable(s.BLEND),s.blendFunc(s.ONE,s.ONE_MINUS_SRC_ALPHA),s.useProgram(bt.program),s.uniformMatrix4fv(j.uProj,!1,it),s.uniform1f(j.uCameraZ,lt),s.uniform1f(j.uPixel,2*f.tan/st.height);let o=Se(t.lightColor),c=t.lightIntensity*60*(1+_.flash*3);s.uniform3f(j.uLight,o[0]*c,o[1]*c,o[2]*c),s.uniform3f(j.uLightPos,_.x,_.y,_.z-lt),s.uniform1f(j.uExposure,t.exposure),s.uniform1f(j.uShadow,t.shadows),s.uniform4f(j.uSurface,n.roughness,n.metalness,n.coat,n.coatRoughness),s.uniform2f(j.uExtra,n.scatter,n.frost),s.bindBuffer(s.ARRAY_BUFFER,zt),s.bufferSubData(s.ARRAY_BUFFER,0,z,0,r*gt),s.bindVertexArray(Ut),s.drawArraysInstanced(s.TRIANGLE_STRIP,0,4,r),s.bindVertexArray(null)},ce=t=>{if(yt=0,!Lt||document.hidden)return;let n=J.current;n.dpr!==ae&&Ot();let r=Pt?Y((t-Pt)/1e3,0,1/20):1/60;Pt=t,Et+=r,wt=Math.max(0,wt-r),oe(n,!1);let a=n.followCursor&&H.inside&&p.index<0?n.cursorSize*f.fit:0;d.r+=(a-d.r)*(1-Math.exp(-r/.12));let o=1-Math.exp(-r/.06),c=d.x,i=d.y;d.x+=(d.tx-d.x)*o,d.y+=(d.ty-d.y)*o,d.vx=Y((d.x-c)/Math.max(r,.001),-ft,ft),d.vy=Y((d.y-i)/Math.max(r,.001),-ft,ft);let l=0,e=f.halfH*.75,h=n.depth+4,x=H.inside?[d.x,d.y,n.followCursor?d.z:1.5]:_.flash>.05?[_.x,_.y,_.z]:[l,e,h],R=1-Math.exp(-r/.08);if(_.x+=(x[0]-_.x)*R,_.y+=(x[1]-_.y)*R,_.z+=(x[2]-_.z)*R,_.flash*=Math.exp(-r/.3),r>1e-4){let b=Math.min(6,Math.max(1,Math.ceil(r/.005555555555555556))),N=r/b;for(let V=0;V<b;V++)$e(n,N,V===b-1)}re();let D=0;for(let b=0;b<P;b++){let N=b*3,V=Math.abs(A[b]-et[N])+Math.abs(y[b]-et[N+1])+Math.abs(g[b]-et[N+2]);V>D&&(D=V),et[N]=A[b],et[N+1]=y[b],et[N+2]=g[b]}Ct=D/Math.max(r,.001)>.6||H.inside||p.index>=0||_.flash>.01||wt>0||d.r>.01||n.drift>0&&!At?0:Ct+r,Ct<.8&&(yt=requestAnimationFrame(ce))};function ot(){Ct=0,!yt&&Lt&&!document.hidden&&(Pt=0,yt=requestAnimationFrame(ce))}let Xt=t=>{let n=ct.getBoundingClientRect(),r=t.clientX-n.left,a=t.clientY-n.top;return r>=0&&a>=0&&r<=n.width&&a<=n.height},se=t=>{let n=ne(t.clientX,t.clientY),[r,a]=It(n,d.z);if(d.tx=r,d.ty=a,p.index>=0){let[o,c]=It(n,g[p.index]);p.tx=o-p.ox,p.ty=c-p.oy}return n},ie=t=>{let n=H.inside;H.inside=Xt(t)||p.index>=0,H.inside&&(se(t),n||(d.x=d.tx,d.y=d.ty),H.down&&Math.hypot(t.clientX-H.downX,t.clientY-H.downY)>6&&(H.moved=!0)),(H.inside||n)&&ot()},Je=t=>t instanceof Element&&t.closest('a, button, input, textarea, select, label, [role="button"]'),le=t=>{if(t.button!==0||!Xt(t)||Je(t.target))return;let n=J.current;H.down=!0,H.moved=!1,H.downX=t.clientX,H.downY=t.clientY,H.downAt=performance.now();let r=se(t);if(n.grab){let a=Ke(r);if(a>=0){let[o,c]=It(r,g[a]);p.index=a,p.ox=o-A[a],p.oy=c-y[a],p.tx=A[a],p.ty=y[a],p.vx=0,p.vy=0,t.pointerType==="mouse"&&t.preventDefault()}}ot()},fe=t=>{let n=J.current;if(p.index>=0){let r=p.index,a=Math.hypot(p.vx,p.vy),o=a>22?22/a:1;v[r]=p.vx*o,w[r]=p.vy*o,p.index=-1,G[r]=1}else if(t&&H.down&&!H.moved&&performance.now()-H.downAt<400&&n.clickEffect==="burst"&&!At&&Xt(t)){let[r,a]=It(ne(t.clientX,t.clientY),0);Qe(r,a)}H.down=!1,ot()},he=t=>fe(t),de=()=>fe(null),ue=()=>{H.inside=p.index>=0,ot()},me=()=>ot(),xe=new ResizeObserver(Ot);xe.observe(ct);let pe=new IntersectionObserver(t=>{Lt=t.some(n=>n.isIntersecting),Lt&&ot()});return pe.observe(ct),window.addEventListener("pointermove",ie,{passive:!0}),window.addEventListener("pointerdown",le),window.addEventListener("pointerup",he,{passive:!0}),window.addEventListener("pointercancel",de,{passive:!0}),document.documentElement.addEventListener("pointerleave",ue),document.addEventListener("visibilitychange",me),Ot(),Dt.current=ot,()=>{cancelAnimationFrame(yt),Dt.current=null,xe.disconnect(),pe.disconnect(),window.removeEventListener("pointermove",ie),window.removeEventListener("pointerdown",le),window.removeEventListener("pointerup",he),window.removeEventListener("pointercancel",de),document.documentElement.removeEventListener("pointerleave",ue),document.removeEventListener("visibilitychange",me),s.deleteBuffer(Jt),s.deleteBuffer(zt),s.deleteVertexArray(Ut),s.deleteProgram(bt.program),s.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,rt.useEffect)(()=>{Dt.current?.()}),(0,Gt.jsx)("div",{ref:$t,className:["relative w-full h-full overflow-hidden",ke].filter(Boolean).join(" "),style:De,children:(0,Gt.jsx)("canvas",{ref:Kt,className:"block w-full h-full","aria-hidden":"true"})})},Re=ao;var Zt=Mt(Tt(),1),ro=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],_t=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],uo=ro.map((u,B)=>({id:B+1,image:u,src:u,img:u,url:u,title:_t[B],text:_t[B],label:_t[B],alt:_t[B],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][B],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function co({big:u}){return(0,Zt.jsx)(Me,{big:u,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Zt.jsx)(Re,{})})}var mo=ye(co);export{mo as default};
