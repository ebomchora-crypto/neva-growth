// Shaders da tela inicial do Builder, adaptados à identidade da Neva.
// O cálculo de cada um é o original (phosphor-30 e gigabit); só a cor final muda: o brilho de cada pixel vira
// o degradê da Neva (marinho #173f66 → azul #2f7bbd → céu #5aa3dc → gelo), em vez do arco-íris.

const HEAD = `#version 300 es
precision highp float;
out vec4 fragColor;
in vec2 v_uv;
uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;
uniform vec4  iMouse;
const vec3 NAVY = vec3(0.090, 0.247, 0.400);
const vec3 BLUE = vec3(0.184, 0.482, 0.741);
const vec3 SKY  = vec3(0.353, 0.639, 0.863);
const vec3 ICE  = vec3(0.920, 0.960, 1.000);
`;

/** Emblema: anel de fósforo (phosphor-30), com fundo transparente. */
export const PHOSPHOR_NEVA = `${HEAD}
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2  r  = iResolution.xy;
  float t  = iTime;
  vec4  o  = vec4(0.0);
  // câmera fixa: no original a 3ª coordenada era o tempo, e a bola crescia/encolhia sem parar
  vec3  dir = normalize(vec3(fragCoord * 2.0 - r, -r.y * 0.62));

  float s = 0.0;
  for (float i = 0.0, z = 0.0, d = 0.0; i++ < 8e1; o += (cos(s + vec4(0.0, 1.0, 8.0, 0.0)) + 1.0) / d)
  {
    vec3 p = z * dir;
    vec3 a = normalize(cos(vec3(5.0, 0.0, 1.0) + t - d * 4.0));
    p.z += 5.0;
    a = a * dot(a, p) - cross(a, p);
    for (d = 1.0; d++ < 9.0; )
      a -= sin(a * d + t).zxy / d;
    z += d = 0.1 * abs(length(p) - 3.0) + 0.07 * abs(cos(s = a.y));
  }
  o = tanh(o / 5e3);

  // cor da Neva: intensidade -> degradê; a diferença azul-vermelho do original vira variação entre azul e céu
  float l = clamp(max(o.r, max(o.g, o.b)), 0.0, 1.0);
  float hue = clamp(0.5 + 0.6 * (o.b - o.r), 0.0, 1.0);
  // azul claro que se destaca: céu -> azul-gelo -> branco (o fundo é escuro)
  vec3 LIGHT = vec3(0.600, 0.808, 0.980);
  vec3 col = mix(mix(SKY, LIGHT, hue), LIGHT, smoothstep(0.08, 0.45, l));
  col = mix(col, vec3(1.0), smoothstep(0.55, 0.95, l));
  float a = smoothstep(0.05, 0.38, l);
  fragColor = vec4(col * (0.8 + 0.5 * l), a);
}
void main(){ mainImage(fragColor, gl_FragCoord.xy); }
`;

/** Fundo do palco: túnel "gigabit", mais lento e escurecido embaixo (onde fica o painel). */
export const GIGABIT_NEVA = `${HEAD}
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2  r  = iResolution.xy;
  float t  = iTime * 0.6;
  vec4  o  = vec4(0.0);
  vec3  dir = normalize(vec3(fragCoord * 2.0 - r, -r.y));   // câmera fixa (sem zoom com o tempo)

  vec3 p = vec3(0.0), v = vec3(0.0);
  float z = 0.0, d = 1.0;
  for (float i = 0.0; i < 80.0; i++)
  {
    p = z * dir;
    v = normalize(cos(t * 0.25 - z * 0.1 + vec3(0.0, 2.0, 4.0)));
    p = dot(v, p) * v + cross(v, p);
    float zPulse = cos(p.z + t * 10.0) * 0.1;
    float xyComp = length(cos(p.xy)) - 0.6;
    d = 0.5 * length(vec2(zPulse, xyComp));
    z += d;
    o += (cos(i * 0.1 + t + vec4(6.0, 1.0, 2.0, 0.0)) + 1.0) / max(d, 1e-3) / max(z, 1e-3);
  }
  o = tanh(o / 300.0);
  o = mix(o, vec4(1.0), vec4(isnan(o)));   // pontos singulares do túnel (NaN) viram brilho, não um buraco preto

  float l = clamp(max(o.r, max(o.g, o.b)), 0.0, 1.0);
  float hue = clamp(0.5 + 0.5 * (o.b - o.r), 0.0, 1.0);
  vec3 LIGHT = vec3(0.600, 0.808, 0.980);
  vec3 col = mix(vec3(0.005, 0.015, 0.034), NAVY * 0.30, smoothstep(0.30, 0.80, l));   // quase tudo escuro (sem névoa cinza)
  float hi = smoothstep(0.62, 1.0, l);
  col = mix(col, mix(SKY, LIGHT, hue) * 0.75, hi * hi);                                 // realces em azul claro
  vec2 uv = fragCoord / r;
  col *= mix(0.40, 1.0, smoothstep(0.05, 0.85, uv.y));
  col *= 0.55 + 0.45 * smoothstep(0.0, 0.5, abs(uv.x - 0.5));
  col = max(col, vec3(0.008, 0.026, 0.058));
  fragColor = vec4(col, 1.0);
}
void main(){ mainImage(fragColor, gl_FragCoord.xy); }
`;
