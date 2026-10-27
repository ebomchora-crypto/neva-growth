import{b as Qe,c as qt,d as Je,e as Ze,f as Tt,g as Nt,h as Ot}from"./chunks/chunk-M7BFARI7.js";import{c as de,i as Pn,j as Ie,l as Dt,m as Ft}from"./chunks/chunk-6IYH4WPJ.js";var S=de(Pn(),1);var M=de(Ie(),1),F=h=>`https://images.unsplash.com/${h}?w=1200&q=80&auto=format&fit=max`,Ht=[{src:F("photo-1737071371043-761e02b1ef95"),alt:"An iridescent chrome sculpture of a head",title:"Iridescence"},{src:F("photo-1693645325828-62cd35c8da8f"),alt:"A person in dark clothes standing in front of a white backdrop",title:"White Room"},{src:F("photo-1739056238917-d89cd05c48d5"),alt:"A twisted chrome form on black",title:"Liquid Metal"},{src:F("photo-1747191092806-c7da11881986"),alt:"A clay bust shown in profile",title:"Clay Study"},{src:F("photo-1605034313761-73ea4a0cfbf3"),alt:"Black and white low top sneakers",title:"Low Tops"},{src:F("photo-1495462911434-be47104d70fa"),alt:"A woman in a wide black hat",title:"Brim"},{src:F("photo-1786835568925-20cd20007ed0"),alt:"Three swirling shapes in white, gold and silver on grey",title:"Three Forms"},{src:F("photo-1770249196550-ff6c641165cb"),alt:"A chrome humanoid sculpture",title:"Automaton"},{src:F("photo-1787181875088-087d612262a7"),alt:"A black textured sculpture with an opening at its center",title:"Obsidian"},{src:F("photo-1770062422885-2dfcbe8fb65b"),alt:"A woman in a white shirt crouching on a dark set",title:"Poise"},{src:F("photo-1726910133626-9b573eca70ff"),alt:"Black curved shapes stacked like a fan",title:"Fins"},{src:F("photo-1604854574958-59047362c165"),alt:"A white plaster bust on a black table",title:"Plaster"}],Wt={liquid:{lensWidth:.74,lensHeight:1.18,tilt:62,roundness:1,bend:.34,reach:.38,curl:"twist",dispersion:.45,liquid:0,followCursor:!1},ribbon:{lensWidth:.8,lensHeight:.8,tilt:0,roundness:1,bend:.34,reach:.34,curl:"twist",dispersion:.4,liquid:0,followCursor:!1},vortex:{lensWidth:.7,lensHeight:.95,tilt:30,roundness:1,bend:.46,reach:.3,curl:"twist",dispersion:.5,liquid:0,followCursor:!1},arch:{lensWidth:.8,lensHeight:.8,tilt:0,roundness:1,bend:.3,reach:.36,curl:"rise",dispersion:.4,liquid:0,followCursor:!1}},_n=`
@keyframes flex-carousel-title { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes flex-carousel-reveal { from { opacity: 0; } to { opacity: 1; } }
`,Dn={portrait:.75,square:1,landscape:4/3},zt=12,Fn=45e5,Bt={rise:2.1,bloom:1.6,spin:2.2,deal:1.5,fade:.35},fe=(h,g)=>((h+g/2)%g+g)%g-g/2,Y=h=>Math.min(Math.max(h,0),1),U=h=>1-Math.pow(1-Y(h),3),qn=h=>1-Math.pow(1-Y(h),5),pe=h=>{let g=Y(h);return g<.5?4*g*g*g:1-Math.pow(-2*g+2,3)/2},Tn=`#version 300 es
in vec3 position;
in vec2 uv;
uniform vec4 uRect;
uniform vec2 uResolution;
out vec2 vUv;
out vec2 vLocal;
void main() {
  vUv = uv;
  vLocal = vec2(position.x, -position.y) * uRect.zw;
  vec2 px = uRect.xy + vLocal;
  gl_Position = vec4(px.x / uResolution.x * 2.0 - 1.0, 1.0 - px.y / uResolution.y * 2.0, 0.0, 1.0);
}
`,Nn=`#version 300 es
precision highp float;
uniform sampler2D tMap;
uniform vec2 uSize;
uniform vec2 uImage;
uniform float uRadius;
uniform float uAlpha;
uniform float uReady;
uniform float uShift;
uniform float uDpr;
uniform vec3 uPlaceholder;
in vec2 vUv;
in vec2 vLocal;
out vec4 fragColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float sd = roundedBox(vLocal, uSize * 0.5, min(uRadius, min(uSize.x, uSize.y) * 0.5));
  float mask = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  vec2 local = vLocal / uSize + 0.5;
  float cardAspect = uSize.x / uSize.y;
  float imageAspect = uImage.x / max(uImage.y, 1.0);
  vec2 scale = imageAspect > cardAspect ? vec2(cardAspect / imageAspect, 1.0) : vec2(1.0, imageAspect / cardAspect);
  scale /= 1.08;
  vec2 uv = vec2(local.x, 1.0 - local.y);
  uv = (uv - 0.5) * scale + 0.5;
  uv.x += uShift * (1.0 - scale.x) * 0.5;
  vec3 image = texture(tMap, uv).rgb;
  vec3 color = mix(uPlaceholder, image, uReady);
  float alpha = mask * uAlpha;
  fragColor = vec4(color * alpha, alpha);
}
`,On=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Hn=`#version 300 es
precision highp float;
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uDpr;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uAngle;
uniform float uExponent;
uniform float uInner;
uniform float uOuter;
uniform float uFlow;
uniform float uCurl;
uniform float uDispersion;
uniform float uStrength;
uniform float uSceneAlpha;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 uv = frag / uResolution;
  vec2 rel = frag - vec2(uCenter.x, uResolution.y - uCenter.y);
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  vec2 local = vec2(ca * rel.x + sa * rel.y, -sa * rel.x + ca * rel.y);
  vec2 k = max(abs(local) / uHalf, vec2(1e-5));
  float nd = pow(pow(k.x, uExponent) + pow(k.y, uExponent), 1.0 / uExponent);
  vec2 grad = pow(k, vec2(uExponent - 1.0)) * sign(local) / uHalf * pow(nd, 1.0 - uExponent);
  float glen = max(length(grad), 1e-6);
  float edge = (nd - 1.0) / glen;
  vec2 outward = grad / glen;
  vec2 normal = vec2(ca * outward.x - sa * outward.y, sa * outward.x + ca * outward.y);
  vec2 along = vec2(-normal.y, normal.x);

  float t = clamp((edge + uInner) / (uInner + uOuter), 0.0, 1.0);
  float ramp = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  float slope = 16.0 * t * t * (1.0 - t) * (1.0 - t);
  float reachX = rel.x / (uResolution.x * 0.5);
  float side = smoothstep(0.02, 0.3, abs(reachX)) * (uCurl == 0.0 ? sign(reachX) : uCurl);
  float lift = ramp * side * uFlow * uStrength;
  vec2 swirl = along * along.y * side * slope * uFlow * uStrength * 0.35;
  vec2 drift = vec2(0.0, -lift) - swirl;
  vec2 shifted = uv + drift / uResolution;

  vec2 texels = uResolution * uDpr;
  vec2 gx = dFdx(shifted);
  vec2 gy = dFdy(shifted);
  gx *= min(1.0, 3.0 / max(length(gx * texels), 1e-4));
  gy *= min(1.0, 3.0 / max(length(gy * texels), 1e-4));

  vec4 color = textureGrad(tScene, shifted, gx, gy);
  vec2 spread = vec2(0.0, side * slope * uFlow * uStrength) / uResolution * uDispersion;
  float spreadPx = length(spread * texels);
  if (color.a > 0.002 && spreadPx > 0.25) {
    vec3 base = color.rgb / color.a;
    vec3 sumColor = vec3(0.0);
    vec3 sumWeight = vec3(0.0);
    for (int i = 0; i < ${zt}; i++) {
      float s = (float(i) + 0.5) / float(${zt});
      vec4 c = textureGrad(tScene, shifted + spread * (s - 0.5), gx, gy);
      vec3 w = max(1.0 - abs(vec3(s) - vec3(0.15, 0.5, 0.85)) * 2.6, 0.0) * c.a;
      sumColor += c.rgb * (w / max(c.a, 0.002));
      sumWeight += w;
    }
    vec3 split = mix(base, sumColor / max(sumWeight, vec3(1e-4)), clamp(sumWeight * 2.0, 0.0, 1.0));
    color.rgb = mix(color.rgb, clamp(split, 0.0, 1.0) * color.a, smoothstep(0.25, 1.5, spreadPx));
  }

  fragColor = color * uSceneAlpha;
}
`,Wn=({value:h})=>(0,M.jsx)("span",{className:"inline-flex",children:String(h).padStart(2,"0").split("").map((g,Le)=>(0,M.jsx)("span",{className:"inline-block h-[1em] overflow-hidden",children:(0,M.jsx)("span",{className:"flex flex-col transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",style:{transform:`translateY(${-Number(g)*10}%)`},children:"0123456789".split("").map(ae=>(0,M.jsx)("span",{className:"h-[1em]",children:ae},ae))})},Le))}),zn=({items:h=Ht,preset:g="liquid",intro:Le="rise",cardHeight:ae=.5,gap:Ut=12,radius:Yt=0,fit:$t="natural",lensWidth:Gt,lensHeight:Kt,tilt:Vt,roundness:Qt,bend:Jt,reach:Zt,curl:jt,dispersion:en,liquid:tn,followCursor:nn,squeeze:an=.2,focusOnClick:on=!0,autoplay:rn=!1,interval:sn=4,captions:ln=!0,captureWheel:cn=!0,onChange:et,onSelect:tt,className:un="",style:dn})=>{let nt=(0,S.useRef)(null),K=(0,S.useRef)(null),V=(0,S.useRef)(h),he=(0,S.useRef)(null),me=(0,S.useRef)({onChange:et,onSelect:tt}),[oe,fn]=(0,S.useState)(0),[pn,at]=(0,S.useState)(!1),[hn,Pe]=(0,S.useState)(!1),mn=Wt[g]||Wt.liquid,T=(i,k)=>i??mn[k],Q=h&&h.length?h:Ht,gn=Q.map(i=>i.src).join("|");(0,S.useEffect)(()=>{V.current=Q,me.current={onChange:et,onSelect:tt},K.current={intro:Le,cardHeight:ae,gap:Ut,radius:Yt,fit:$t,lensWidth:T(Gt,"lensWidth"),lensHeight:T(Kt,"lensHeight"),tilt:T(Vt,"tilt"),roundness:T(Qt,"roundness"),bend:T(Jt,"bend"),reach:T(Zt,"reach"),curl:T(jt,"curl"),dispersion:T(en,"dispersion"),liquid:T(tn,"liquid"),followCursor:T(nn,"followCursor"),squeeze:an,focusOnClick:on,autoplay:rn,interval:sn,captureWheel:cn},he.current?.wake()}),(0,S.useEffect)(()=>{he.current?.setItems(V.current)},[gn]),(0,S.useEffect)(()=>{let i=nt.current;if(!i)return;let k=new qt({dpr:Math.min(window.devicePixelRatio||1,2),alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1}),m=k.gl;if(!k.isWebgl2){m.getExtension("WEBGL_lose_context")?.loseContext();return}m.clearColor(0,0,0,0);let W=m.canvas;W.style.display="block",W.style.width="100%",W.style.height="100%",W.setAttribute("aria-hidden","true"),i.prepend(W);let I=new Qe(m,{vertex:Tn,fragment:Nn,transparent:!0,depthTest:!1,depthWrite:!1,uniforms:{tMap:{value:new Ze(m)},uRect:{value:[0,0,1,1]},uResolution:{value:[1,1]},uSize:{value:[1,1]},uImage:{value:[1,1]},uRadius:{value:16},uAlpha:{value:1},uReady:{value:0},uShift:{value:0},uDpr:{value:1},uPlaceholder:{value:[.5,.5,.5]}}});I.setBlendFunc(m.ONE,m.ONE_MINUS_SRC_ALPHA);let xn=new Je(m,{geometry:new Nt(m),program:I}),z=new Tt(m,{width:2,height:2,depth:!1,minFilter:m.LINEAR_MIPMAP_LINEAR,magFilter:m.LINEAR}),A={tScene:{value:z.texture},uResolution:{value:[1,1]},uDpr:{value:1},uCenter:{value:[0,0]},uHalf:{value:[1,1]},uAngle:{value:0},uExponent:{value:2},uInner:{value:60},uOuter:{value:80},uFlow:{value:0},uCurl:{value:0},uDispersion:{value:0},uStrength:{value:0},uSceneAlpha:{value:0}},bn=new Je(m,{geometry:new Ot(m),program:new Qe(m,{vertex:On,fragment:Hn,uniforms:A,depthTest:!1,depthWrite:!1})}),J=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,wn=k.getExtension("EXT_texture_filter_anisotropic")?8:0,_=[],v=1,q=1,d=0,C=0,f=0,D="spring",ot=0,Z=0,_e=performance.now(),re=!0,se=!0,E=!0,B=-1,j=-1/0,rt=performance.now(),De=!1,ee=0,ge=0,te=null,Fe=!1,ve="",qe=1,ie=0,st=0,x={x:0,y:0,vx:0,vy:0,ready:!1},o={x:0,y:0,over:!1,down:!1,id:-1,startX:0,startY:0,startPos:0,dragging:!1,touch:!1,samples:[]},u={kind:"none",t:0,running:!1,done:!1,readyAt:0},c={index:-1,pending:-1,t:0,v:0,target:0},xe=[],yn=(e,t)=>{let a=new Ze(m,{generateMipmaps:!0,minFilter:m.LINEAR_MIPMAP_LINEAR,magFilter:m.LINEAR,anisotropy:wn}),n={item:e,index:t,texture:a,aspect:.8,loaded:!1,failed:!1,ready:0,color:[.5,.5,.5],image:[1,1],dispose:()=>{}},s=new Image;return s.crossOrigin="anonymous",s.decoding="async",s.onload=()=>{if(!(!se||!_.includes(n))){a.image=s,a.update(),n.image=[s.naturalWidth||1,s.naturalHeight||1],n.aspect=n.image[0]/n.image[1];try{let r=document.createElement("canvas");r.width=8,r.height=8;let l=r.getContext("2d",{willReadFrequently:!0});if(l){l.drawImage(s,0,0,8,8);let L=l.getImageData(0,0,8,8).data,P=[0,0,0];for(let w=0;w<L.length;w+=4)P[0]+=L[w],P[1]+=L[w+1],P[2]+=L[w+2];n.color=P.map(w=>w/64/255)}}catch{n.color=[.5,.5,.5]}n.loaded=!0,E=!0,b()}},s.onerror=()=>{se&&(n.failed=!0,E=!0,b())},s.src=e.src,n.dispose=()=>{s.onload=null,s.onerror=null,m.deleteTexture(a.texture)},n},it=e=>{_.forEach(t=>t.dispose()),_=e.map(yn),B=-1,te=null,Fe=!0,c.target=0,c.t=0,c.v=0,c.pending=-1,Pe(!1),u.readyAt=performance.now(),E=!0,b()},be=e=>{let t=Math.max(24,e.cardHeight*q),a=Dn[e.fit],n=_.map(l=>(a||l.aspect)*t),s=[],r=0;for(let l=0;l<n.length;l++)s.push(r+n[l]/2),r+=n[l]+e.gap;return{cardH:t,widths:n,centers:s,gap:e.gap,loop:Math.max(r,1)}},we=(e,t)=>{let a=0,n=1/0;for(let s=0;s<e.centers.length;s++){let r=Math.abs(fe(e.centers[s]-t,e.loop));r<n&&(n=r,a=s)}return a},$=(e,t)=>{let a=we(e,t);return t+fe(e.centers[a]-t,e.loop)},lt=(e,t,a)=>{let n=we(e,a),s=fe(a-e.centers[n],e.loop);return Math.round((a-s-e.centers[n])/e.loop)*t.loop+t.centers[n]+s*(t.widths[n]/e.widths[n])},ye=(e,t)=>{let a=$(e,f),n=we(e,a),s=e.centers.length;for(let r=0;r<Math.abs(t);r++){let l=(n+(t>0?1:s-1))%s,L=t>0?e.widths[n]/2+e.gap+e.widths[l]/2:-(e.widths[l]/2+e.gap+e.widths[n]/2);a+=L,n=l}f=a,D="spring",E=!0,b()},ct=(e,t)=>{let a=(t%e.centers.length+e.centers.length)%e.centers.length;f=f+fe(e.centers[a]-f,e.loop),D="spring",E=!0,b()},Te=e=>{c.index=e,c.pending=-1,c.target=1,Pe(!0),E=!0,b()},O=()=>(c.pending=-1,c.target===0?!1:(c.target=0,Pe(!1),E=!0,b(),!0)),Me=()=>{u.running&&(u.t=1)},Mn=()=>{let e=u.running?u.t:u.done?1:0,t={sceneAlpha:1,strength:1,card:null};if(!u.done&&!u.running)return t.sceneAlpha=0,t.strength=0,t;if(e>=1)return t;let a=u.kind;return a==="rise"?(t.strength=pe((e-.3)/.65),t.card=n=>{let s=Math.min(Math.abs(n)/(v*.6),1)*.34,r=Y((e-s)/.6);return{alpha:Y(r*4),x:0,y:(1-qn(r))*q*.62,scale:.5+.5*pe((r-.18)/.82)}}):a==="bloom"?(t.strength=pe((e-.2)/.8),t.card=n=>{let s=Math.min(Math.abs(n)/(v*.6),1)*.25,r=U((e-s)/.55);return{alpha:r,x:0,y:0,scale:.92+.08*r}}):a==="spin"?(t.sceneAlpha=U(e/.25),t.strength=U((e-.55)/.45)):a==="deal"?(t.strength=U((e-.45)/.5),t.card=n=>{let s=Math.min(Math.abs(n)/(v*.6),1)*.3,r=U((e-.12-s)/.5);return{alpha:U((e-s)/.12),x:-n*(1-r),y:0,scale:1}}):(t.sceneAlpha=U(e),t.strength=U(e)),t},An=(e,t)=>{let a=J&&e.intro!=="none"?"fade":e.intro;if(u.kind=Bt[a]?a:"none",u.running=u.kind!=="none",u.done=!u.running,u.t=0,u.done&&at(!0),u.kind==="spin"){let n=t.loop*1.6+v;d=f+n,C=-n*3,D="spring"}},ut=()=>{v=Math.max(1,i.clientWidth),q=Math.max(1,i.clientHeight),k.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(Fn/(v*q))),k.setSize(v,q),z.setSize(Math.max(2,Math.round(v*k.dpr)),Math.max(2,Math.round(q*k.dpr))),A.tScene.value=z.texture,E=!0,b()},Ne=e=>{if(Z=0,!se)return;let t=K.current,a=Math.min(.05,Math.max(.001,(e-_e)/1e3));if(_e=e,!t||!_.length){re&&(Z=requestAnimationFrame(Ne));return}let n=be(t),s=_.length,r=!1;if(Fe?(f=$(n,f),d=f,C=0,Fe=!1):te&&te.loop!==n.loop&&(d=lt(te,n,d),f=lt(te,n,f),o.startPos=d+(o.x-o.startX),r=!0),te=n,!u.running&&!u.done&&(_.every(y=>y.loaded||y.failed)||e-u.readyAt>3500)&&(f=$(n,f),d=f,An(t,n)),u.running&&(u.t=Math.min(1,u.t+a/(Bt[u.kind]||1)),u.t>=1&&(u.running=!1,u.done=!0,at(!0)),r=!0),D==="wheel"&&e-ot>150&&(f=$(n,f),D="spring"),o.dragging)r=!0;else{let y=u.running&&u.kind==="spin"?9:D==="wheel"?80:55,le=2*Math.sqrt(y),ne=Math.ceil(a/(1/240)),ce=a/ne;for(let ue=0;ue<ne;ue++){let Re=y*(f-d)-le*C;C+=Re*ce,d+=C*ce}Math.abs(f-d)<.05&&Math.abs(C)<.5?(d=f,C=0):r=!0}if(Math.abs(d)>n.loop*8){let R=Math.round(d/n.loop)*n.loop;d-=R,f-=R,o.startPos-=R}let l=we(n,d);l!==B&&(B=l,fn(l),me.current.onChange?.(l,V.current[l])),c.pending>=0&&D==="spring"&&Math.abs(f-d)<1.5&&Math.abs(C)<30&&(l===c.pending?Te(l):c.pending=-1),t.autoplay&&!J&&u.done&&c.target===0&&c.t<.01&&!o.over&&!o.down&&!De&&D==="spring"&&Math.abs(f-d)<1&&e-j>3e3&&e-rt>t.interval*1e3&&(rt=e,ye(n,1)),t.autoplay&&!J&&(r=!0);let L=Math.abs(d-st)/a;st=d;let P=J?0:Math.min(L/2600,1);ie+=(P-ie)*(1-Math.exp(-a/(P>ie?.07:.35))),ie>.001&&(r=!0);let w=J?0:t.liquid,Ae=Math.max(-1,Math.min(1,C/2200)),At=120,En=2*Math.sqrt(At)*.32;ge+=(At*(Ae-ee)-En*ge)*a,ee+=ge*a,(Math.abs(ee)>5e-4||Math.abs(ge)>.005)&&(r=!0);let Et=64;c.v+=(Et*(c.target-c.t)-2*Math.sqrt(Et)*c.v)*a,c.t+=c.v*a,Math.abs(c.target-c.t)<5e-4&&Math.abs(c.v)<.001?(c.t=c.target,c.v=0):r=!0;let He=Y(c.t),We=pe(He),kn=c.index>=0&&c.index<s?n.widths[c.index]:n.cardH,kt=Math.max(1,Math.min(1.3,q*.84/n.cardH,v*.92/kn)),Rt=1+(kt-1)*We;Math.abs(Rt-qe)>5e-4&&(qe=Rt,i.style.setProperty("--flex-carousel-lift",qe.toFixed(4)));let Ee=Mn(),ze=v/2,Be=q/2,St=t.followCursor&&o.over&&!o.dragging&&!o.touch&&c.target===0,It=St?o.x:ze,Ct=St?o.y:Be;x.ready||(x.x=ze,x.y=Be,x.ready=!0);let Xe=110,Lt=2*Math.sqrt(Xe)*.8;x.vx+=(Xe*(It-x.x)-Lt*x.vx)*a,x.vy+=(Xe*(Ct-x.y)-Lt*x.vy)*a,x.x+=x.vx*a,x.y+=x.vy*a,(Math.abs(It-x.x)+Math.abs(Ct-x.y)>.2||Math.abs(x.vx)+Math.abs(x.vy)>.5)&&(r=!0);let Rn=n.cardH,Ue=t.lensWidth*v/2,Ye=t.lensHeight*v/2,Pt=Math.abs(ee)*w;Ue*=1+Pt*.16,Ye*=1-Pt*.08;let Sn=x.x-ee*14*w;for(let R=0;R<s;R++){let y=_[R];y.loaded&&y.ready<1&&(y.ready=Math.min(1,y.ready+a/.45),r=!0)}let In=!u.done;if(E||r||o.dragging){E=!1,xe=[];let R=k.dpr;I.uniforms.uResolution.value=[v,q],I.uniforms.uDpr.value=R,I.uniforms.uRadius.value=t.radius;let y=1-Y(t.squeeze)*ie,le=[];for(let p=0;p<s;p++){let N=n.widths[p],Cn=fe(n.centers[p]-d,n.loop);for(let $e=-3;$e<=3;$e++){let G=Cn+$e*n.loop;if(Math.abs(G)-N/2>v+40)continue;let X=Ee.card?Ee.card(G):null,Se=ze+G+(X?X.x:0),Ge=y*(X?X.scale:1),Ke=X?X.alpha:1;if(He>0)if(p===c.index&&Math.abs(G)<N)Ge*=1+(kt-1)*We;else{let Ln=Math.min(Math.abs(G)/v,1)*.25,_t=pe(He*1.25-Ln);Se+=Math.sign(G)*_t*v*.7,Ke*=1-_t}let Ve=N*Ge;Ke<=.001||Se+Ve/2<-40||Se-Ve/2>v+40||le.push({i:p,rel:G,x:Se,y:Be+(X?X.y:0),cw:Ve,ch:Rn*Ge,alpha:Ke})}}le.sort((p,N)=>Math.abs(N.rel)-Math.abs(p.rel));let ne=!0;for(let p of le){let N=_[p.i];I.uniforms.tMap.value=N.texture,I.uniforms.uRect.value=[p.x,p.y,p.cw+2,p.ch+2],I.uniforms.uSize.value=[p.cw,p.ch],I.uniforms.uImage.value=N.image,I.uniforms.uAlpha.value=p.alpha,I.uniforms.uReady.value=N.ready,I.uniforms.uShift.value=J?0:Math.max(-1,Math.min(1,p.rel/(v*.75))),I.uniforms.uPlaceholder.value=N.color,k.render({scene:xn,target:z,clear:ne}),ne=!1,xe.push({index:p.i,x0:p.x-p.cw/2,x1:p.x+p.cw/2,y0:p.y-p.ch/2,y1:p.y+p.ch/2})}ne&&(k.bindFramebuffer(z),m.viewport(0,0,z.width,z.height),m.clear(m.COLOR_BUFFER_BIT)),k.bindFramebuffer(),z.texture.bind(),m.generateMipmap(m.TEXTURE_2D),A.uResolution.value=[v,q],A.uDpr.value=R,A.uCenter.value=[Sn,x.y],A.uHalf.value=[Math.max(Ue,1),Math.max(Ye,1)],A.uAngle.value=t.tilt*Math.PI/180,A.uExponent.value=2+Math.pow(1-Y(t.roundness),1.5)*10;let ce=Math.max(Ue,1),ue=Math.max(Ye,1),Re=Math.max(4,t.reach*(ce+ue)*.5);A.uInner.value=Re,A.uOuter.value=Re*1.6,A.uFlow.value=t.bend*(ce+ue)*.45,A.uCurl.value=t.curl==="rise"?1:t.curl==="fall"?-1:0,A.uDispersion.value=t.dispersion*.12*(1+Math.abs(ee)*w*1.2),A.uStrength.value=Ee.strength*(1-We),A.uSceneAlpha.value=Ee.sceneAlpha,k.render({scene:bn})}let ke="";if(o.over&&!o.dragging&&u.done&&t.focusOnClick){let R=xe.find(y=>o.x>=y.x0&&o.x<=y.x1&&o.y>=y.y0&&o.y<=y.y1);c.target>0?ke="close":R&&(ke="open")}ke!==ve&&(ve=ke,ve?i.setAttribute("data-hover",ve):i.removeAttribute("data-hover")),re&&(r||In||E||o.down)&&(Z=requestAnimationFrame(Ne))},b=()=>{Z||!re||!se||(_e=performance.now(),Z=requestAnimationFrame(Ne))},Oe=e=>{let t=i.getBoundingClientRect();return[e.clientX-t.left,e.clientY-t.top]},dt=e=>{if(e.button!==void 0&&e.button>0)return;Me();let[t,a]=Oe(e);o.down=!0,o.id=e.pointerId,o.touch=e.pointerType==="touch",o.startX=t,o.startY=a,o.x=t,o.y=a,o.startPos=d,o.dragging=!1,o.samples=[{x:t,t:performance.now()}],j=performance.now(),Math.abs(C)>40&&(f=d,C=0),E=!0,b()},ft=e=>{let[t,a]=Oe(e);if(o.x=t,o.y=a,o.over=!0,o.down&&e.pointerId===o.id){let n=t-o.startX,s=a-o.startY,r=o.touch?10:5;if(!o.dragging){if(o.touch&&Math.abs(s)>r&&Math.abs(s)>Math.abs(n)){o.down=!1;return}if(Math.abs(n)>r){o.dragging=!0,o.startX=t,o.startPos=d,O();try{i.setPointerCapture(e.pointerId)}catch{o.dragging=!0}i.setAttribute("data-dragging","")}}if(o.dragging){d=o.startPos-(t-o.startX),f=d,C=0;let l=performance.now();for(o.samples.push({x:t,t:l});o.samples.length>2&&l-o.samples[0].t>100;)o.samples.shift()}}E=!0,b()},pt=e=>{if(!o.down||e.pointerId!==o.id)return;o.down=!1,i.removeAttribute("data-dragging");let t=K.current;if(!t)return;let a=be(t);if(j=performance.now(),o.dragging){o.dragging=!1;let l=performance.now(),L=o.samples[0],P=o.samples[o.samples.length-1],w=0;L&&P&&P.t>L.t&&l-P.t<70&&(w=-((P.x-L.x)/(P.t-L.t))*1e3),C=w;let Ae=$(a,d+w*.32);f=Ae,Math.abs(w)>400&&Math.abs(Ae-d)<1&&ye(a,w>0?1:-1),D="spring",b();return}if(O())return;let[n,s]=Oe(e),r=xe.find(l=>n>=l.x0&&n<=l.x1&&s>=l.y0&&s<=l.y1);if(r)if(r.index===B&&Math.abs(f-d)<2)me.current.onSelect?.(r.index,V.current[r.index]),t.focusOnClick&&Te(r.index);else{let l=(r.x0+r.x1)/2-v/2;f=$(a,d+l),D="spring",t.focusOnClick&&(c.pending=r.index),b()}},ht=()=>{o.over=!1,E=!0,b()},mt=()=>{o.down=!1,o.dragging=!1,i.removeAttribute("data-dragging");let e=K.current;e&&(f=$(be(e),d),D="spring",b())},gt=e=>{let t=K.current;if(!t||e.ctrlKey)return;let a=e.deltaX,n=e.deltaY;e.shiftKey&&Math.abs(a)<Math.abs(n)&&(a=n,n=0);let s=e.deltaMode===1?16:e.deltaMode===2?q:1,r=Math.abs(a)>Math.abs(n);if(!r&&!t.captureWheel||(e.preventDefault(),Me(),j=performance.now(),O()))return;let l=Math.max(-120,Math.min(120,(r?a:n)*s));f+=l*1.25,D="wheel",ot=performance.now(),b()},vt=e=>{let t=K.current;if(!t)return;let a=be(t);if(e.key==="ArrowRight"||e.key==="ArrowDown")e.preventDefault(),Me(),O(),j=performance.now(),ye(a,1);else if(e.key==="ArrowLeft"||e.key==="ArrowUp")e.preventDefault(),Me(),O(),j=performance.now(),ye(a,-1);else if(e.key==="Home")e.preventDefault(),O(),ct(a,0);else if(e.key==="End")e.preventDefault(),O(),ct(a,_.length-1);else if(e.key==="Escape")O()&&e.preventDefault();else if(e.key==="Enter"||e.key===" "){if(e.preventDefault(),O()||B<0)return;me.current.onSelect?.(B,V.current[B]),t.focusOnClick&&Te(B)}},xt=()=>{De=!0},bt=()=>{De=!1},wt=()=>{document.hidden||b()};i.addEventListener("pointerdown",dt),i.addEventListener("pointermove",ft),i.addEventListener("pointerup",pt),i.addEventListener("pointerleave",ht),i.addEventListener("pointercancel",mt),i.addEventListener("wheel",gt,{passive:!1}),i.addEventListener("keydown",vt),i.addEventListener("focus",xt),i.addEventListener("blur",bt),document.addEventListener("visibilitychange",wt);let yt=new ResizeObserver(ut);yt.observe(i);let Mt=new IntersectionObserver(([e])=>{re=e.isIntersecting,b()});return Mt.observe(i),he.current={wake:()=>{E=!0,b()},setItems:it},ut(),it(V.current),()=>{se=!1,re=!1,he.current=null,cancelAnimationFrame(Z),yt.disconnect(),Mt.disconnect(),i.removeEventListener("pointerdown",dt),i.removeEventListener("pointermove",ft),i.removeEventListener("pointerup",pt),i.removeEventListener("pointerleave",ht),i.removeEventListener("pointercancel",mt),i.removeEventListener("wheel",gt),i.removeEventListener("keydown",vt),i.removeEventListener("focus",xt),i.removeEventListener("blur",bt),document.removeEventListener("visibilitychange",wt),_.forEach(e=>e.dispose()),_=[],m.getExtension("WEBGL_lose_context")?.loseContext(),W.parentNode&&W.parentNode.removeChild(W)}},[]);let H=Q[oe]||Q[0],vn=H?H.title||H.alt||`Image ${oe+1}`:"";return(0,M.jsxs)("div",{ref:nt,className:`relative h-full w-full cursor-grab touch-pan-y select-none overflow-hidden overscroll-contain outline-none [-webkit-tap-highlight-color:transparent] focus-visible:shadow-[inset_0_0_0_2px_rgba(128,128,140,0.55)] data-[hover=open]:cursor-zoom-in data-[hover=close]:cursor-zoom-out data-[dragging]:cursor-grabbing ${un}`.trim(),style:{...dn,"--flex-carousel-half":`${Math.min(Math.max(ae,.05),1)*50}%`},role:"region","aria-roledescription":"carousel","aria-label":"Image carousel",tabIndex:0,children:[(0,M.jsx)("style",{children:_n}),ln&&H&&pn&&(0,M.jsxs)("div",{className:"pointer-events-none absolute inset-x-0 top-[calc(50%_+_var(--flex-carousel-half)_*_var(--flex-carousel-lift,1)_+_22px)] flex flex-col items-center gap-1.5 px-4 text-center animate-[flex-carousel-reveal_900ms_ease_both] motion-reduce:animate-none","aria-hidden":"true",children:[(0,M.jsxs)("span",{className:"flex max-w-full flex-col items-center text-[15px] font-medium leading-[1.35] animate-[flex-carousel-title_520ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",children:[H.title||H.alt,H.subtitle&&(0,M.jsx)("span",{className:"font-normal opacity-60",children:H.subtitle})]},oe),(0,M.jsxs)("span",{className:"inline-flex items-center gap-[3px] text-[12px] leading-none tabular-nums opacity-50 transition-opacity duration-[400ms] data-[hidden]:opacity-0","data-hidden":hn?"":void 0,children:[(0,M.jsx)(Wn,{value:oe+1}),(0,M.jsx)("span",{className:"opacity-60",children:"/"}),(0,M.jsx)("span",{children:String(Q.length).padStart(2,"0")})]})]}),(0,M.jsx)("div",{className:"sr-only","aria-live":"polite","aria-atomic":"true",children:`${vn}, ${oe+1} of ${Q.length}`})]})},Xt=zn;var je=de(Ie(),1),Bn=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Ce=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Xn=Bn.map((h,g)=>({id:g+1,image:h,src:h,img:h,url:h,title:Ce[g],text:Ce[g],label:Ce[g],alt:Ce[g],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][g],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Un({big:h}){return(0,je.jsx)(Ft,{big:h,dark:!0,center:!1,zoom:1,drive:!1,children:(0,je.jsx)(Xt,{items:Xn})})}var Jn=Dt(Un);export{Jn as default};
