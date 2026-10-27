import{I as K,K as Q,N as Z,V as ee,ea as re,ha as oe,ka as ne,s as J,w as v,y as W}from"./chunks/chunk-QKNKE5BX.js";import{c as p,i as fe,j as k,l as $,m as Y}from"./chunks/chunk-6IYH4WPJ.js";var n=p(fe(),1);var te=p(k(),1),M=8,me=`
#define MAX_COLORS ${M}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer; // in NDC [-1,1]
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

    for (int j = 0; j < 5; j++) {
      if (j >= uIterations - 1) break;
      vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
      q += (rr - q) * 0.15;
    }

    vec3 col = vec3(0.0);
    float a = 1.0;

    if (uColorCount > 0) {
      vec2 s = q;
      vec3 sumCol = vec3(0.0);
      float cover = 0.0;
      for (int i = 0; i < MAX_COLORS; ++i) {
            if (i >= uColorCount) break;
            s -= 0.01;
            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
            float kBelow = clamp(uWarpStrength, 0.0, 1.0);
            float kMix = pow(kBelow, 0.3); // strong response across 0..1
            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0); // allow >1 to amplify displacement
            vec2 disp = (r - s) * kBelow;
            vec2 warped = s + disp * gain;
            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
            float m = mix(m0, m1, kMix);
            float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
            sumCol += uColors[i] * w;
            cover = max(cover, w);
      }
      col = clamp(sumCol, 0.0, 1.0);
      a = uTransparent > 0 ? cover : 1.0;
    } else {
        vec2 s = q;
        for (int k = 0; k < 3; ++k) {
            s -= 0.01;
            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
            float kBelow = clamp(uWarpStrength, 0.0, 1.0);
            float kMix = pow(kBelow, 0.3);
            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
            vec2 disp = (r - s) * kBelow;
            vec2 warped = s + disp * gain;
            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
            float m = mix(m0, m1, kMix);
            col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
        }
        a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
    }

    col *= uIntensity;

    if (uNoise > 0.0001) {
      float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
      col += (n - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);
    }

    vec3 rgb = (uTransparent > 0) ? col * a : col;
    gl_FragColor = vec4(rgb, a);
}
`,ve=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;function O({className:l,style:c,rotation:I=90,speed:g=.2,colors:z=[],transparent:f=!0,autoRotate:F=0,scale:w=1,frequency:h=1,warpStrength:R=1,mouseInfluence:C=1,parallax:E=.5,noise:y=.15,iterations:x=1,intensity:b=1.5,bandWidth:T=6}){let P=(0,n.useRef)(null),N=(0,n.useRef)(null),S=(0,n.useRef)(null),H=(0,n.useRef)(null),A=(0,n.useRef)(null),V=(0,n.useRef)(I),_=(0,n.useRef)(F),D=(0,n.useRef)(new v(0,0)),ae=(0,n.useRef)(new v(0,0)),ue=(0,n.useRef)(8);return(0,n.useEffect)(()=>{let e=P.current,a=new Z,m=new re(-1,1,1,-1,0,1),u=new ee(2,2),t=Array.from({length:M},()=>new W(0,0,0)),r=new Q({vertexShader:ve,fragmentShader:me,uniforms:{uCanvas:{value:new v(1,1)},uTime:{value:0},uSpeed:{value:g},uRot:{value:new v(1,0)},uColorCount:{value:0},uColors:{value:t},uTransparent:{value:f?1:0},uScale:{value:w},uFrequency:{value:h},uWarpStrength:{value:R},uPointer:{value:new v(0,0)},uMouseInfluence:{value:C},uParallax:{value:E},uNoise:{value:y},uIterations:{value:x},uIntensity:{value:b},uBandWidth:{value:T}},premultipliedAlpha:!0,transparent:!0});H.current=r;let i=new K(u,r);a.add(i);let o=new ne({antialias:!1,powerPreference:"high-performance",alpha:!0});N.current=o,o.outputColorSpace=J,o.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),o.setClearColor(0,f?0:1),o.domElement.style.width="100%",o.domElement.style.height="100%",o.domElement.style.display="block",e.appendChild(o.domElement);let G=new oe,q=()=>{let s=e.clientWidth||1,d=e.clientHeight||1;o.setSize(s,d,!1),r.uniforms.uCanvas.value.set(s,d)};if(q(),"ResizeObserver"in window){let s=new ResizeObserver(q);s.observe(e),A.current=s}else window.addEventListener("resize",q);let X=()=>{let s=G.getDelta(),d=G.elapsedTime;r.uniforms.uTime.value=d;let U=(V.current%360+_.current*d)*Math.PI/180,le=Math.cos(U),ce=Math.sin(U);r.uniforms.uRot.value.set(le,ce);let j=ae.current,ie=D.current,se=Math.min(1,s*ue.current);j.lerp(ie,se),r.uniforms.uPointer.value.copy(j),o.render(a,m),S.current=requestAnimationFrame(X)};return S.current=requestAnimationFrame(X),()=>{S.current!==null&&cancelAnimationFrame(S.current),A.current?A.current.disconnect():window.removeEventListener("resize",q),u.dispose(),r.dispose(),o.dispose(),o.forceContextLoss(),o.domElement&&o.domElement.parentElement===e&&e.removeChild(o.domElement)}},[T,h,b,x,C,y,E,w,g,f,R]),(0,n.useEffect)(()=>{let e=H.current,a=N.current;if(!e)return;V.current=I,_.current=F,e.uniforms.uSpeed.value=g,e.uniforms.uScale.value=w,e.uniforms.uFrequency.value=h,e.uniforms.uWarpStrength.value=R,e.uniforms.uMouseInfluence.value=C,e.uniforms.uParallax.value=E,e.uniforms.uNoise.value=y,e.uniforms.uIterations.value=x,e.uniforms.uIntensity.value=b,e.uniforms.uBandWidth.value=T;let m=t=>{let r=t.replace("#","").trim(),i=r.length===3?[parseInt(r[0]+r[0],16),parseInt(r[1]+r[1],16),parseInt(r[2]+r[2],16)]:[parseInt(r.slice(0,2),16),parseInt(r.slice(2,4),16),parseInt(r.slice(4,6),16)];return new W(i[0]/255,i[1]/255,i[2]/255)},u=(z||[]).filter(Boolean).slice(0,M).map(m);for(let t=0;t<M;t++){let r=e.uniforms.uColors.value[t];t<u.length?r.copy(u[t]):r.set(0,0,0)}e.uniforms.uColorCount.value=u.length,e.uniforms.uTransparent.value=f?1:0,a&&a.setClearColor(0,f?0:1)},[I,F,g,w,h,R,C,E,y,x,b,T,z,f]),(0,n.useEffect)(()=>{let e=H.current,a=P.current;if(!e||!a)return;let m=u=>{let t=a.getBoundingClientRect(),r=(u.clientX-t.left)/(t.width||1)*2-1,i=-((u.clientY-t.top)/(t.height||1)*2-1);D.current.set(r,i)};return a.addEventListener("pointermove",m),()=>{a.removeEventListener("pointermove",m)}},[]),(0,te.jsx)("div",{ref:P,className:`w-full h-full relative overflow-hidden ${l}`,style:c})}var L=p(k(),1),de=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],B=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],xe=de.map((l,c)=>({id:c+1,image:l,src:l,img:l,url:l,title:B[c],text:B[c],label:B[c],alt:B[c],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][c],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function pe({big:l}){return(0,L.jsx)(Y,{big:l,dark:!0,center:!1,zoom:1,drive:!1,children:(0,L.jsx)(O,{})})}var be=$(pe);export{be as default};
