import{c as F,i as Ue,j as D,l as pe,m as me}from"./chunks/chunk-6IYH4WPJ.js";var r=F(Ue(),1),p=F(D(),1),Xe=["bursts","stars","shards","cosmos","rainbow","swirl","glitter","gold"],ve=1100,Ie=63/88,ze=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,De=`#version 300 es
precision highp float;

uniform sampler2D uArt;
uniform vec2 uSize;
uniform float uAspect;
uniform vec2 uTilt;
uniform vec2 uLight;
uniform float uDistance;
uniform int uPreset;
uniform float uIntensity;
uniform float uScale;
uniform float uEdge;
uniform float uFrame;
uniform float uRadius;
uniform float uGlare;
uniform vec3 uFoil;
uniform float uReady;

out vec4 outColor;

const float TAU = 6.28318530718;

struct Foil {
  float mask;
  float angle;
  float jitter;
  vec2 facet;
};

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + 17.31));
}

vec3 hue(float t) {
  t = abs(fract(t * 0.5) * 2.0 - 1.0);
  vec3 c = mix(vec3(0.1, 0.25, 1.0), vec3(0.0, 0.85, 1.0), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.25, 1.0, 0.2), smoothstep(0.25, 0.45, t));
  c = mix(c, vec3(1.0, 0.92, 0.05), smoothstep(0.45, 0.65, t));
  c = mix(c, vec3(1.0, 0.45, 0.05), smoothstep(0.65, 0.85, t));
  return mix(c, vec3(0.95, 0.12, 0.3), smoothstep(0.85, 1.0, t));
}

Foil bursts(vec2 p) {
  vec2 q = mat2(0.7071068, 0.7071068, -0.7071068, 0.7071068) * (p - vec2(0.5, 0.5 * uAspect)) / (0.283 / uScale);
  vec2 d = fract(q) - 0.5;
  float u = length(d) / 0.49;
  float angle = atan(d.y, d.x);
  if (u < 0.12) {
    float ring = min(floor(u / 0.045 + 0.5), 2.0);
    float count = max(1.0, ring * 6.0);
    float spot = (floor(angle / TAU * count) + 0.5) / count * TAU;
    vec2 dot = vec2(cos(spot), sin(spot)) * ring * 0.045;
    float m = smoothstep(0.024, 0.012, length(d / 0.49 - dot));
    return Foil(m, angle, 0.5, vec2(0.0));
  }
  bool inner = u < 0.66;
  float slot = angle / TAU * (inner ? 56.0 : 72.0);
  bool shifted = mod(floor(slot), 2.0) > 0.5;
  vec2 band = inner ? (shifted ? vec2(0.45, 0.61) : vec2(0.33, 0.49)) : (shifted ? vec2(0.84, 0.99) : vec2(0.7, 0.85));
  float across = abs(u - (band.x + band.y) * 0.5) / ((band.y - band.x) * 0.5);
  float along = abs(fract(slot) - 0.5) * 2.0;
  float width = inner ? 0.72 : 0.6;
  float m = smoothstep(1.0, 0.78, across) * smoothstep(width, width - 0.2, along);
  return Foil(m, angle, 0.5, vec2(0.0));
}

Foil stars(vec2 p) {
  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.08 / uScale);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      float pick = hash(id + 1.3);
      vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.55);
      float m = smoothstep(0.07, 0.035, length(d));
      if (pick < 0.62) {
        float size = mix(0.16, 0.5, pow(hash(id + 9.0), 1.8));
        float sector = TAU / (pick < 0.3 ? 4.0 : 5.0);
        float k = abs(fract((atan(d.y, d.x) + hash(id + 4.0) * TAU) / sector) - 0.5) * 2.0;
        float edge = size * mix(1.0, 0.36, pow(k, 0.6));
        m = smoothstep(edge, edge * 0.8, length(d));
      }
      if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU, hash(id + 8.0), (hash2(id + 2.0) - 0.5) * 0.6);
    }
  }
  return best;
}

Foil shards(vec2 p) {
  vec2 g = p * 19.0 * uScale;
  vec2 base = floor(g);
  float best = 9.0;
  float second = 9.0;
  vec2 id = base;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      float d = length(cell + 0.08 + hash2(cell) * 0.84 - g);
      if (d < best) {
        second = best;
        best = d;
        id = cell;
      } else if (d < second) {
        second = d;
      }
    }
  }
  float crack = smoothstep(0.015, 0.07, second - best);
  float shine = 0.25 + 0.75 * pow(hash(id + 7.7), 2.0);
  return Foil((0.2 + 0.8 * crack) * shine, hash(id + 3.17) * TAU, hash(id + 11.73), (hash2(id + 5.0) - 0.5) * 0.5);
}

Foil cosmos(vec2 p) {
  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.16 / uScale);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.7);
      float size = mix(0.16, 0.52, hash(id + 2.0));
      float r = length(d);
      float m = max(smoothstep(0.05, 0.0, abs(r - size)), smoothstep(size, size - 0.04, r) * 0.22);
      if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU + atan(d.y, d.x) * 0.5, hash(id + 1.0), (hash2(id + 4.0) - 0.5) * 0.5);
    }
  }
  vec2 fine = p / (0.035 / uScale);
  vec2 cell = floor(fine);
  float dots = smoothstep(0.2, 0.1, length(fine - cell - 0.5 - (hash2(cell + 9.0) - 0.5) * 0.6)) * step(0.55, hash(cell + 2.0));
  if (dots > best.mask) best = Foil(dots, hash(cell) * TAU, hash(cell + 3.0), (hash2(cell + 7.0) - 0.5) * 0.6);
  return best;
}

Foil rainbow(vec2 p) {
  return Foil(0.86 + 0.14 * hash(floor(p * 700.0 * uScale)), 0.2, 0.5, vec2(0.0));
}

Foil swirl(vec2 p) {
  vec2 d = p - vec2(0.5, 0.42 * uAspect);
  float angle = atan(d.y, d.x);
  float rays = 0.55 + 0.45 * smoothstep(0.3, 0.7, abs(fract(angle / TAU * 60.0 * uScale) - 0.5) * 2.0);
  return Foil(rays, angle, length(d), vec2(0.0));
}

Foil glitter(vec2 p) {
  vec2 g = p * 72.0 * uScale;
  vec2 cell = floor(g);
  float size = mix(0.18, 0.4, hash(cell + 3.0));
  float m = smoothstep(size, size * 0.55, length(fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.5)) * step(0.25, hash(cell + 5.0));
  return Foil(m, hash(cell + 7.0) * TAU, hash(cell + 9.0), (hash2(cell + 11.0) - 0.5) * 0.9);
}

Foil gold(vec2 p) {
  Foil flake = glitter(p * 0.8);
  if (flake.mask > 0.5) return flake;
  float etch = 0.55 + 0.45 * smoothstep(0.2, 0.8, abs(fract((p.x * 0.6 + p.y) * 140.0 * uScale) - 0.5) * 2.0);
  return Foil(etch, 0.9, 0.4, vec2(0.0));
}

vec3 sparkles(vec2 p, vec3 halfway, vec2 sweep, float awake) {
  vec2 g = p * 62.0;
  vec2 cell = floor(g);
  vec2 d = fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.36;
  float spin = hash(cell + 3.0) * TAU;
  d = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * d;
  vec2 a = abs(d);
  float hexagon = max(a.x * 0.866 + a.y * 0.5, a.y);
  float size = mix(0.22, 0.38, hash(cell + 2.0));
  float piece = smoothstep(size, size - 0.07, hexagon) * step(0.42, hash(cell + 4.0));
  vec3 facet = normalize(vec3((hash2(cell + 6.0) - 0.5) * 0.9, 1.0));
  float flash = pow(max(dot(facet, halfway), 0.0), 6.0);
  vec3 tint = hue(dot(sweep, vec2(cos(spin), sin(spin))) * 1.2 + dot(sweep, vec2(0.8, 0.6)) * 0.8 + hash(cell + 8.0) * 0.5);
  vec3 color = piece * tint * (0.3 + 1.6 * flash) * awake;
  vec2 fine = p * 210.0;
  vec2 speckCell = floor(fine);
  float speck = smoothstep(0.24, 0.0, length(fract(fine) - 0.5 - (hash2(speckCell) - 0.5) * 0.5)) * step(0.72, hash(speckCell + 1.0));
  float speckFlash = pow(max(dot(normalize(vec3((hash2(speckCell + 2.0) - 0.5) * 0.9, 1.0)), halfway), 0.0), 10.0);
  return color + vec3(1.2) * speck * speckFlash * (1.0 - piece);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  vec2 p = vec2(uv.x, uv.y * uAspect);
  vec2 center = vec2(0.5, 0.5 * uAspect);
  vec2 q = abs(p - center) - center + uRadius;
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float pixel = 1.0 / uSize.x;
  float alpha = clamp(0.5 - outside / pixel, 0.0, 1.0);
  vec4 sampled = texture(uArt, uv);
  if (uReady > 0.5) alpha *= sampled.a;
  if (alpha <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  vec3 art = uReady > 0.5 ? pow(sampled.rgb, vec3(2.2)) : vec3(0.12);

  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(uTilt.x), sin(uTilt.x), 0.0, -sin(uTilt.x), cos(uTilt.x));
  mat3 ry = mat3(cos(uTilt.y), 0.0, -sin(uTilt.y), 0.0, 1.0, 0.0, sin(uTilt.y), 0.0, cos(uTilt.y));
  mat3 turn = rx * ry;
  vec3 world = turn * vec3(p - center, 0.0);
  vec3 view = normalize(transpose(turn) * (vec3(0.0, 0.0, uDistance) - world));
  vec3 lamp = vec3((uLight - 0.5) * vec2(1.1, 1.1 * uAspect), 0.9);
  vec3 light = normalize(transpose(turn) * (lamp - world));
  vec3 halfway = normalize(light + view);
  vec2 sweep = light.xy + view.xy;
  float sheen = pow(max(halfway.z, 0.0), 10.0);
  float shine = pow(max(halfway.z, 0.0), 80.0);
  float frame = 1.0 - smoothstep(uFrame - pixel, uFrame + pixel, -outside);

  Foil f;
  if (uPreset == 0) f = bursts(p);
  else if (uPreset == 1) f = stars(p);
  else if (uPreset == 2) f = shards(p);
  else if (uPreset == 3) f = cosmos(p);
  else if (uPreset == 4) f = rainbow(p);
  else if (uPreset == 5) f = swirl(p);
  else if (uPreset == 6) f = glitter(p);
  else f = gold(p);

  vec3 metal = uPreset == 7 ? vec3(1.0, 0.74, 0.38) * dot(uFoil, vec3(0.3333)) * 1.15 : uFoil;
  vec4 look = uPreset == 0 ? vec4(0.25, 1.9, 0.12, 1.0)
    : uPreset == 1 ? vec4(0.6, 1.4, 0.3, 1.0)
    : uPreset == 2 ? vec4(0.9, 0.9, 0.6, 0.5)
    : uPreset == 3 ? vec4(0.7, 1.2, 0.35, 0.85)
    : uPreset == 4 ? vec4(0.0, 2.2, 0.0, 0.45)
    : uPreset == 5 ? vec4(1.6, 0.3, 0.0, 0.4)
    : uPreset == 6 ? vec4(0.9, 1.0, 0.6, 1.0)
    : vec4(0.3, 1.0, 0.2, 0.95);
  vec2 dir = vec2(cos(f.angle), sin(f.angle));
  float phase = dot(sweep, dir) * look.x + dot(sweep, vec2(0.8, 0.6)) * look.y + f.jitter * look.z;
  float spoke = 1.0;
  if (uPreset == 5) {
    float facing = dot(normalize(sweep + 0.0001), dir);
    phase = f.jitter * 2.4 + facing * 0.6 + length(sweep) * 0.8;
    spoke = 0.3 + 0.7 * smoothstep(0.25, 0.95, abs(facing));
  }
  vec3 tint = hue(phase);
  if (uPreset == 7) tint = mix(tint, metal, 0.65);
  float glint = pow(max(dot(normalize(vec3(f.facet, 1.0)), halfway), 0.0), 24.0) * step(0.001, length(f.facet));
  bool layered = uPreset == 2 || uPreset == 4 || uPreset == 5 || uPreset == 7;
  vec3 foil = (layered ? tint : mix(tint, vec3(1.0), 0.12)) * (1.15 + 0.3 * sheen) + metal * glint * 1.2;
  float tilted = smoothstep(0.02, 0.21, length(sin(uTilt)));
  float awake = mix(0.2, 1.0, tilted);
  float strength = uIntensity * f.mask * (1.0 - frame) * awake;
  float band = uPreset == 5 ? spoke : layered ? 0.25 + 0.75 * smoothstep(0.3, 0.95, 0.5 + 0.5 * cos(phase * TAU * 0.5 + 1.3)) : 1.0;
  vec3 color = layered
    ? 1.0 - (1.0 - art) * (1.0 - clamp(foil * look.w * band * strength, 0.0, 1.0))
    : mix(art, foil, clamp(strength * look.w, 0.0, 1.0));
  color += sparkles(p, halfway, sweep, mix(0.55, 1.0, tilted)) * uEdge * frame;
  color += uFoil * sheen * 0.12 * frame;
  color += vec3(sheen * 0.07 + shine * 0.3) * uGlare;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  outColor = vec4(color * alpha, alpha);
}
`,g=(o,s,d)=>Math.min(d,Math.max(s,o)),Ye=o=>{let s=[.78,.8,.84];if(typeof document>"u")return s;let d=document.createElement("canvas").getContext("2d");if(!d)return s;d.fillStyle="#000000",d.fillStyle=o;let h=d.fillStyle;return!h.startsWith("#")||h.length!==7?s:[1,3,5].map(S=>Math.pow(parseInt(h.slice(S,S+2),16)/255,2.2))},ge=(o,s,d)=>{let h=o.createShader(s);return h?(o.shaderSource(h,d),o.compileShader(h),o.getShaderParameter(h,o.COMPILE_STATUS)?h:(o.deleteShader(h),null)):null};function q({image:o,backImage:s,alt:d="",preset:h="bursts",intensity:S=.85,scale:be=1,edgeSparkle:xe=.8,frame:we=4,glare:Te=.5,foilColor:ye="#e2e6ec",width:Re=320,radius:J=14,tiltMax:Ae=14,hoverScale:Ee=1.04,idle:ke=!0,shadow:Pe=!0,className:Q="",style:Fe}){let Z=(0,r.useRef)(null),ee=(0,r.useRef)(null),C=(0,r.useRef)(null),te=(0,r.useRef)(null),V=(0,r.useRef)(null),M=(0,r.useRef)({x:.5,y:.5,inside:!1}),E=(0,r.useRef)(null),_=(0,r.useRef)(null),L=(0,r.useRef)(!1),[Se,Me]=(0,r.useState)(Ie),[ae,ie]=(0,r.useState)(!1),[oe,_e]=(0,r.useState)(!1),m=!!s;V.current={preset:Math.max(0,Xe.indexOf(h)),intensity:g(S,0,1),scale:g(be,.25,4),edgeSparkle:g(xe,0,1),frame:g(we,0,20)/100,glare:g(Te,0,1),foil:Ye(ye),radius:Math.max(0,J),tiltMax:g(Ae,0,45),hoverScale:g(Ee,.8,1.3),idle:ke},L.current=m&&oe,(0,r.useEffect)(()=>{E.current?.()}),(0,r.useEffect)(()=>{_.current?.(o)},[o]),(0,r.useEffect)(()=>{let n=Z.current,b=ee.current,u=te.current;if(!n||!b||!u)return;let B=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,e=u.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1}),f=null,k=null,G=null,c={},U=!1;if(e){let i=ge(e,e.VERTEX_SHADER,ze),a=ge(e,e.FRAGMENT_SHADER,De);if(i&&a&&(f=e.createProgram(),e.attachShader(f,i),e.attachShader(f,a),e.bindAttribLocation(f,0,"position"),e.linkProgram(f),e.deleteShader(i),e.deleteShader(a),e.getProgramParameter(f,e.LINK_STATUS)||(e.deleteProgram(f),f=null)),f){G=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,G),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),k=e.createTexture(),e.bindTexture(e.TEXTURE_2D,k),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));for(let l of["uArt","uSize","uAspect","uTilt","uLight","uDistance","uPreset","uIntensity","uScale","uEdge","uFrame","uRadius","uGlare","uFoil","uReady"])c[l]=e.getUniformLocation(f,l)}}let t={tiltX:0,tiltY:0,tiltVX:0,tiltVY:0,lightX:.36,lightY:.26,lightVX:0,lightVY:0,lift:1,liftV:0,turn:0,turnV:0,clock:Math.random()*40},P=0,j=0,$=!0,X=!0,I=0,O=()=>{if(!e||!f)return;let i=V.current,a=u.width,l=u.height;!a||!l||(e.viewport(0,0,a,l),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(f),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,k),e.uniform1i(c.uArt,0),e.uniform2f(c.uSize,a,l),e.uniform1f(c.uAspect,l/a),e.uniform2f(c.uTilt,t.tiltX*Math.PI/180,(t.tiltY+t.turn)*Math.PI/180),e.uniform2f(c.uLight,t.lightX,t.lightY),e.uniform1f(c.uDistance,ve/Math.max(1,u.clientWidth)),e.uniform1i(c.uPreset,i.preset),e.uniform1f(c.uIntensity,i.intensity),e.uniform1f(c.uScale,i.scale),e.uniform1f(c.uEdge,i.edgeSparkle),e.uniform1f(c.uFrame,i.frame),e.uniform1f(c.uRadius,i.radius/Math.max(1,u.clientWidth)),e.uniform1f(c.uGlare,i.glare),e.uniform3f(c.uFoil,i.foil[0],i.foil[1],i.foil[2]),e.uniform1f(c.uReady,U?1:0),e.drawArrays(e.TRIANGLES,0,3))},T=(i,a,l,v,y,x)=>{let R=a+((l-i)*v-a*y)*x;return[i+R*x,R]},se=i=>{if(P=0,!X)return;let a=Math.min(1/30,Math.max(1/240,(i-j)/1e3));j=i;let l=V.current,v=M.current,y=0,x=0,R=.36,W=.26,ue=1,he=l.idle&&!B&&!v.inside;if(v.inside&&!B)y=(.5-v.y)*2*l.tiltMax,x=(v.x-.5)*2*l.tiltMax,R=v.x,W=v.y,ue=l.hoverScale;else if(he){t.clock+=a;let w=t.clock;y=Math.sin(w*.7)*l.tiltMax*.28,x=Math.sin(w*.53+1.2)*l.tiltMax*.4,R=.5+Math.sin(w*.41)*.42,W=.38+Math.sin(w*.33+.6)*.3}let de=Math.ceil(a/(1/240)),A=a/de;for(let w=0;w<de;w++)[t.tiltX,t.tiltVX]=T(t.tiltX,t.tiltVX,y,150,16,A),[t.tiltY,t.tiltVY]=T(t.tiltY,t.tiltVY,x,150,16,A),[t.lightX,t.lightVX]=T(t.lightX,t.lightVX,R,220,30,A),[t.lightY,t.lightVY]=T(t.lightY,t.lightVY,W,220,30,A),[t.lift,t.liftV]=T(t.lift,t.liftV,ue,320,30,A),[t.turn,t.turnV]=B?[L.current?180:0,0]:T(t.turn,t.turnV,L.current?180:0,170,20,A);b.style.transform=`perspective(${ve}px) scale(${t.lift}) rotateX(${t.tiltX}deg) rotateY(${t.tiltY+t.turn}deg)`,C.current&&(C.current.style.transform=`translate(${-t.tiltY*.7}px, ${t.tiltX*.7}px) scale(${.9+(t.lift-1)*1.5})`),Math.cos((t.tiltY+t.turn)*Math.PI/180)>-.05&&O(),I=Math.abs(t.tiltVX)+Math.abs(t.tiltVY)+Math.abs(t.liftV)*40+Math.abs(t.turnV)+(Math.abs(t.lightVX)+Math.abs(t.lightVY))*60+Math.abs(t.tiltX-y)+Math.abs(t.tiltY-x)>.02?0:I+a,!(!$||!he&&!v.inside&&I>.3)&&(P=requestAnimationFrame(se))},z=()=>{P||!X||(I=0,j=performance.now(),P=requestAnimationFrame(se))};E.current=z;let ne=()=>{let i=Math.min(window.devicePixelRatio||1,2),a=Math.max(1,Math.round(u.clientWidth*i)),l=Math.max(1,Math.round(u.clientHeight*i));(u.width!==a||u.height!==l)&&(u.width=a,u.height=l),O(),z()};_.current=i=>{if(U=!1,ie(!1),!i)return;let a=new Image;a.crossOrigin="anonymous",a.decoding="async",a.onload=()=>{if(X&&(a.naturalWidth&&a.naturalHeight&&Me(a.naturalWidth/a.naturalHeight),!(!e||!f)))try{e.bindTexture(e.TEXTURE_2D,k),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,a),e.generateMipmap(e.TEXTURE_2D),U=!0,ie(!0),O(),z()}catch{U=!1}},a.src=i},_.current(o);let ce=new ResizeObserver(ne);ce.observe(u);let fe=new IntersectionObserver(i=>{$=i.some(a=>a.isIntersecting),$&&z()});return fe.observe(n),ne(),()=>{X=!1,cancelAnimationFrame(P),E.current=null,_.current=null,ce.disconnect(),fe.disconnect(),e&&(e.deleteTexture(k),e.deleteBuffer(G),e.deleteProgram(f))}},[]);let N=n=>{if(n.pointerType==="touch"&&n.type==="pointermove"&&!n.buttons)return;let b=n.currentTarget.getBoundingClientRect();M.current={x:g((n.clientX-b.left)/b.width,0,1),y:g((n.clientY-b.top)/b.height,0,1),inside:!0},E.current?.()},le=()=>{M.current={...M.current,inside:!1},E.current?.()},re=()=>{m&&_e(n=>!n)};return(0,p.jsxs)("div",{ref:Z,className:`relative inline-block w-[var(--hc-w)] max-w-full aspect-[var(--hc-ratio)] rounded-[var(--hc-radius)] outline-none select-none touch-pan-y [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] ${m?"cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-current":""}${Q?` ${Q}`:""}`,role:m?"button":"img",tabIndex:m?0:void 0,"aria-label":d||void 0,"aria-pressed":m?oe:void 0,"data-ready":ae?"":void 0,"data-flippable":m?"":void 0,onPointerEnter:N,onPointerMove:N,onPointerDown:N,onPointerLeave:le,onPointerCancel:le,onClick:re,onKeyDown:n=>{!m||n.key!=="Enter"&&n.key!==" "||(n.preventDefault(),n.repeat||re())},style:{"--hc-w":`${Re}px`,"--hc-ratio":Se,"--hc-radius":`${J}px`,...Fe},children:[Pe?(0,p.jsx)("span",{ref:C,className:"absolute inset-[10%_7%_-4%] rounded-[var(--hc-radius)] bg-black/40 blur-[26px] pointer-events-none will-change-transform","aria-hidden":"true"}):null,(0,p.jsxs)("div",{ref:ee,className:"absolute inset-0 [transform-style:preserve-3d] will-change-transform",children:[(0,p.jsxs)("div",{className:"absolute inset-0 overflow-hidden rounded-[var(--hc-radius)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]",children:[o?(0,p.jsx)("img",{src:o,alt:"",draggable:!1,className:"absolute inset-0 block h-full w-full object-cover pointer-events-none [-webkit-user-drag:none]"}):null,(0,p.jsx)("canvas",{ref:te,className:`absolute inset-0 block h-full w-full transition-opacity duration-300 ${ae?"opacity-100":"opacity-0"}`})]}),m?(0,p.jsx)("div",{className:"absolute inset-0 overflow-hidden rounded-[var(--hc-radius)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]",children:(0,p.jsx)("img",{src:s,alt:"",draggable:!1,className:"absolute inset-0 block h-full w-full object-cover pointer-events-none [-webkit-user-drag:none]"})}):null]})]})}var K=F(D(),1),H=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],Y=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],$e=H.map((o,s)=>({id:s+1,image:o,src:o,img:o,url:o,title:Y[s],text:Y[s],label:Y[s],alt:Y[s],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][s],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Ce({big:o}){return(0,K.jsx)(me,{big:o,dark:!0,center:!0,zoom:1,drive:"move",children:(0,K.jsx)(q,{image:H[0],backImage:H[1]})})}var Oe=pe(Ce);export{Oe as default};
