import{b as L,c as P,d as k,e as D,h as U}from"./chunks/chunk-M7BFARI7.js";import{c as h,i as V,j as R,l as F,m as N}from"./chunks/chunk-6IYH4WPJ.js";var M=h(V(),1),O=h(R(),1);function _(o){let t=o.replace("#","");return[parseInt(t.slice(0,2),16)/255,parseInt(t.slice(2,4),16)/255,parseInt(t.slice(4,6),16)/255]}function Y(o=256){let t=new Uint8Array(o*o*4);function p(c,s,r){let n=c*374761393+s*668265263+r*1274126177;return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296}function w(c,s,r,n){let v=c/o*r,f=s/o*r,l=Math.floor(v),a=Math.floor(f),i=v-l,m=f-a,e=r|0,G=p((l%e+e)%e,(a%e+e)%e,n),g=p(((l+1)%e+e)%e,(a%e+e)%e,n),u=p((l%e+e)%e,((a+1)%e+e)%e,n),y=p(((l+1)%e+e)%e,((a+1)%e+e)%e,n);return G*(1-i)*(1-m)+g*i*(1-m)+u*(1-i)*m+y*i*m}for(let c=0;c<o;c++)for(let s=0;s<o;s++){let r=0,n=.4,v=0;for(let a=0;a<8;a++){let i=32*(1<<a);r+=n*w(s,c,i,a*31),v+=n,n*=.65}r/=v,r=(r-.5)*2.2+.5,r=Math.max(0,Math.min(1,r));let f=Math.round(r*255),l=(c*o+s)*4;t[l]=f,t[l+1]=f,t[l+2]=f,t[l+3]=255}return t}var H=`
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`,X=`
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform sampler2D uNoiseTexture;
uniform float uPupilSize;
uniform float uIrisWidth;
uniform float uGlowIntensity;
uniform float uIntensity;
uniform float uScale;
uniform float uNoiseScale;
uniform vec2 uMouse;
uniform float uPupilFollow;
uniform float uFlameSpeed;
uniform vec3 uEyeColor;
uniform vec3 uBgColor;
uniform bool uLightMode;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
  uv /= uScale;
  float ft = uTime * uFlameSpeed;

  float polarRadius = length(uv) * 2.0;
  float polarAngle = (2.0 * atan(uv.x, uv.y)) / 6.28 * 0.3;
  vec2 polarUv = vec2(polarRadius, polarAngle);

  vec4 noiseA = texture2D(uNoiseTexture, polarUv * vec2(0.2, 7.0) * uNoiseScale + vec2(-ft * 0.1, 0.0));
  vec4 noiseB = texture2D(uNoiseTexture, polarUv * vec2(0.3, 4.0) * uNoiseScale + vec2(-ft * 0.2, 0.0));
  vec4 noiseC = texture2D(uNoiseTexture, polarUv * vec2(0.1, 5.0) * uNoiseScale + vec2(-ft * 0.1, 0.0));

  float distanceMask = 1.0 - length(uv);

  // Inner ring
  float innerRing = clamp(-1.0 * ((distanceMask - 0.7) / uIrisWidth), 0.0, 1.0);
  innerRing = (innerRing * distanceMask - 0.2) / 0.28;
  innerRing += noiseA.r - 0.5;
  innerRing *= 1.3;
  innerRing = clamp(innerRing, 0.0, 1.0);

  float outerRing = clamp(-1.0 * ((distanceMask - 0.5) / 0.2), 0.0, 1.0);
  outerRing = (outerRing * distanceMask - 0.1) / 0.38;
  outerRing += noiseC.r - 0.5;
  outerRing *= 1.3;
  outerRing = clamp(outerRing, 0.0, 1.0);

  innerRing += outerRing;

  // Inner eye
  float innerEye = distanceMask - 0.1 * 2.0;
  innerEye *= noiseB.r * 2.0;

  // Pupil with cursor tracking
  vec2 pupilOffset = uMouse * uPupilFollow * 0.12;
  vec2 pupilUv = uv - pupilOffset;
  float pupil = 1.0 - length(pupilUv * vec2(9.0, 2.3));
  pupil *= uPupilSize;
  pupil = clamp(pupil, 0.0, 1.0);
  pupil /= 0.35;

  // Outer eye
  float outerEyeGlow = 1.0 - length(uv * vec2(0.5, 1.5));
  outerEyeGlow = clamp(outerEyeGlow + 0.5, 0.0, 1.0);
  outerEyeGlow += noiseC.r - 0.5;
  float outerBgGlow = outerEyeGlow;
  outerEyeGlow = pow(outerEyeGlow, 2.0);
  outerEyeGlow += distanceMask;
  outerEyeGlow *= uGlowIntensity;
  outerEyeGlow = clamp(outerEyeGlow, 0.0, 1.0);
  outerEyeGlow *= pow(1.0 - distanceMask, 2.0) * 2.5;

  // Outer eye bg glow
  outerBgGlow += distanceMask;
  outerBgGlow = pow(outerBgGlow, 0.5);
  outerBgGlow *= 0.15;

  vec3 eyeEnergy = uEyeColor * uIntensity * clamp(max(innerRing + innerEye, outerEyeGlow + outerBgGlow) - pupil, 0.0, 3.0);
  vec3 color;
  if (uLightMode) {
    vec3 mapped = vec3(1.0) - exp(-max(eyeEnergy, vec3(0.0)) * 1.3);
    float energy = clamp(max(mapped.r, max(mapped.g, mapped.b)), 0.0, 1.0);
    vec3 hue = mapped / max(energy, 0.0001);
    hue = pow(clamp(hue, 0.0, 1.0), vec3(1.2));
    color = mix(uBgColor, hue, smoothstep(0.02, 0.82, energy) * 0.96);
  } else {
    color = eyeEnergy + uBgColor;
  }

  gl_FragColor = vec4(color, 1.0);
}
`;function T({eyeColor:o="#FF6F37",intensity:t=1.5,pupilSize:p=.6,irisWidth:w=.25,glowIntensity:c=.35,scale:s=.8,noiseScale:r=1,pupilFollow:n=1,flameSpeed:v=1,backgroundColor:f="#000000",lightMode:l=!1}){let a=(0,M.useRef)(null);return(0,M.useEffect)(()=>{if(!a.current)return;let i=a.current,m=new P({alpha:!0,premultipliedAlpha:!1}),e=m.gl;e.clearColor(0,0,0,0);let G=Y(256),g=new D(e,{image:G,width:256,height:256,generateMipmaps:!1,flipY:!1});g.minFilter=e.LINEAR,g.magFilter=e.LINEAR,g.wrapS=e.REPEAT,g.wrapT=e.REPEAT;let u={x:0,y:0,tx:0,ty:0};function y(x){let E=i.getBoundingClientRect();u.tx=(x.clientX-E.left)/E.width*2-1,u.ty=-((x.clientY-E.top)/E.height*2-1)}function A(){u.tx=0,u.ty=0}i.addEventListener("mousemove",y),i.addEventListener("mouseleave",A);let d;function I(){m.setSize(i.offsetWidth,i.offsetHeight),d&&(d.uniforms.uResolution.value=[e.canvas.width,e.canvas.height,e.canvas.width/e.canvas.height])}window.addEventListener("resize",I),I();let W=new U(e);d=new L(e,{vertex:H,fragment:X,uniforms:{uTime:{value:0},uResolution:{value:[e.canvas.width,e.canvas.height,e.canvas.width/e.canvas.height]},uNoiseTexture:{value:g},uPupilSize:{value:p},uIrisWidth:{value:w},uGlowIntensity:{value:c},uIntensity:{value:t},uScale:{value:s},uNoiseScale:{value:r},uMouse:{value:[0,0]},uPupilFollow:{value:n},uFlameSpeed:{value:v},uEyeColor:{value:_(o)},uBgColor:{value:_(f)},uLightMode:{value:l}}});let z=new k(e,{geometry:W,program:d});i.appendChild(e.canvas);let S;function B(x){S=requestAnimationFrame(B),u.x+=(u.tx-u.x)*.05,u.y+=(u.ty-u.y)*.05,d.uniforms.uMouse.value=[u.x,u.y],d.uniforms.uTime.value=x*.001,m.render({scene:z})}return S=requestAnimationFrame(B),()=>{cancelAnimationFrame(S),window.removeEventListener("resize",I),i.removeEventListener("mousemove",y),i.removeEventListener("mouseleave",A),i.removeChild(e.canvas),e.getExtension("WEBGL_lose_context")?.loseContext()}},[o,t,p,w,c,s,r,n,v,f,l]),(0,O.jsx)("div",{ref:a,className:"w-full h-full"})}var C=h(R(),1),q=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],b=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],oe=q.map((o,t)=>({id:t+1,image:o,src:o,img:o,url:o,title:b[t],text:b[t],label:b[t],alt:b[t],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][t],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function J({big:o}){return(0,C.jsx)(N,{big:o,dark:!0,center:!1,zoom:1,drive:!1,children:(0,C.jsx)(T,{})})}var te=F(J);export{te as default};
