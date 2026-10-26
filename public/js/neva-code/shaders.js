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
  vec3  FC = vec3(fragCoord, t);
  vec4  o  = vec4(0.0);

  float s = 0.0;
  for (float i = 0.0, z = 0.0, d = 0.0; i++ < 8e1; o += (cos(s + vec4(0.0, 1.0, 8.0, 0.0)) + 1.0) / d)
  {
    vec3 p = z * normalize(FC.rgb * 2.0 - r.xyy);
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
  vec3 col = mix(NAVY, mix(BLUE, SKY, hue), smoothstep(0.06, 0.45, l));
  col = mix(col, ICE, smoothstep(0.62, 0.98, l));
  float a = smoothstep(0.10, 0.55, l);
  fragColor = vec4(col, a * a);
}
void main(){ mainImage(fragColor, gl_FragCoord.xy); }
`;

/** Fundo do palco: túnel "gigabit", mais lento e escurecido embaixo (onde fica o painel). */
export const GIGABIT_NEVA = `${HEAD}
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2  r  = iResolution.xy;
  float t  = iTime * 0.6;
  vec3  FC = vec3(fragCoord, t);
  vec4  o  = vec4(0.0);

  vec3 p = vec3(0.0), v = vec3(0.0);
  float z = 0.0, d = 1.0;
  for (float i = 0.0; i < 80.0; i++)
  {
    p = z * normalize(FC.rgb * 2.0 - r.xyy);
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
  vec3 col = mix(vec3(0.006, 0.020, 0.048), NAVY * 0.7, smoothstep(0.05, 0.55, l));
  col = mix(col, mix(BLUE, SKY, hue) * 0.85, smoothstep(0.55, 0.95, l));
  col = mix(col, ICE, smoothstep(0.96, 1.0, l) * 0.25);
  vec2 uv = fragCoord / r;
  col *= mix(0.35, 1.0, smoothstep(0.05, 0.85, uv.y));   // embaixo mais escuro: o painel continua legível
  col *= 0.62 + 0.38 * smoothstep(0.0, 0.5, abs(uv.x - 0.5));  // centro mais escuro (título e emblema em destaque)
  col = max(col, vec3(0.012, 0.040, 0.085));   // fundo do túnel fica marinho, nunca preto
  fragColor = vec4(col, 1.0);
}
void main(){ mainImage(fragColor, gl_FragCoord.xy); }
`;
