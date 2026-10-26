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
    o += min((cos(i * 0.1 + t + vec4(6.0, 1.0, 2.0, 0.0)) + 1.0) / max(d, 1e-3) / max(z, 1e-3), vec4(2e3));   // teto: evita infinito
  }
  o = tanh(clamp(o / 300.0, 0.0, 10.0));   // tanh de valor enorme vira NaN em algumas GPUs (pontinhos pretos)
  o = mix(o, vec4(1.0), vec4(isnan(o)));   // pontos singulares do túnel (NaN) viram brilho, não um buraco preto

  float l = clamp(max(o.r, max(o.g, o.b)), 0.0, 1.0);
  float hue = clamp(0.5 + 0.5 * (o.b - o.r), 0.0, 1.0);
  vec3 LIGHT = vec3(0.600, 0.808, 0.980);
  vec3 col = mix(vec3(0.030, 0.072, 0.135), NAVY * 0.85, smoothstep(0.25, 0.80, l));   // azul-marinho (mais claro), sem névoa cinza
  float hi = smoothstep(0.62, 1.0, l);
  col = mix(col, mix(SKY, LIGHT, hue) * 0.9, hi * hi);                                 // realces em azul claro
  vec2 uv = fragCoord / r;
  col *= mix(0.62, 1.0, smoothstep(0.05, 0.85, uv.y));
  col *= 0.72 + 0.28 * smoothstep(0.0, 0.5, abs(uv.x - 0.5));
  col = max(col, vec3(0.024, 0.060, 0.115));
  fragColor = vec4(col, 1.0);
}
void main(){ mainImage(fragColor, gl_FragCoord.xy); }
`;

/** Emblema: onda da Siri (variante "wave"), com os 4 fios em tons de azul da Neva. Fundo preto: o canvas soma luz (screen). */
export const SIRI_WAVE_NEVA = `${HEAD}
const float PI = 3.14159265359;
const float AMPLITUDE   = 0.32;
const float FREQ        = 1.1;
const float ABER_FREQ   = 1.0;
const float SPEED       = 2.4;
const float WAVE_SCALE  = 0.6;    // igual ao original (canvas quadrado, mesma proporção)
const float ABERRATION  = 2.6;
const float THICKNESS   = 3.0;
const float INTENSITY   = 2.;
const float FALLOFF     = 1.7;
const float EDGE_MASK   = 0.4;
const float EDGE_INSET  = 0.0;
const float BAND_FILL   = 30000.0;
const float BAND_THICK  = 0.08;
const float SOFTNESS    = 2.5;
const float LOW_AMP     = 6.0;
const float LOW_INT     = 1.5;
const float MID_ABER    = 0.8;
const float MID_ABAMP   = 0.05;
const float MID_BAND    = 20.0;
const float MID_SOFT    = 0.4;
const float HIGH_ABER   = 0.5;
const float HIGH_ABAMP  = 0.06;
const float RESOLVED    = 1.0;
const float UNRES_SCALE = 0.14;

// 4 fios, como no original (lá são 4 cores do espectro); aqui, 4 azuis bem diferentes entre si: gelo, céu, azul Neva e marinho profundo.
// Onde os fios se cruzam a luz soma e o miolo fica branco, como na onda original.
const int STRANDS = 4;
vec3 strand(int s){
  if (s == 0) return vec3(0.86, 0.95, 1.00);
  if (s == 1) return vec3(0.33, 0.74, 1.00);
  if (s == 2) return vec3(0.10, 0.44, 0.96);
  return vec3(0.05, 0.20, 0.92);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 R = iResolution.xy;
    float aspect = R.x / R.y;
    vec2 p = (fragCoord + 0.5) * 2.0 / R - 1.0;
    p.x *= aspect;
    float yScreen = p.y;
    p /= max(WAVE_SCALE, 0.1);

    float t   = iTime;
    float low  = clamp(0.45 + 0.45*sin(t*0.8)*sin(t*0.37+1.0), 0.0, 1.0);
    float mid  = clamp(0.40 + 0.40*sin(t*1.7+2.0)*sin(t*0.53), 0.0, 1.0);
    float high = clamp(0.30 + 0.30*sin(t*2.9+4.0)*sin(t*0.71+2.0), 0.0, 1.0);

    float res   = clamp(RESOLVED, 0.0, 1.0);
    float drift = mod(t, 20.0*PI) * SPEED;

    float xN  = p.x / max(aspect, 1.0);
    float env = cos(PI*0.5 * min(abs(0.9*xN), 1.0));
    env *= env;

    float A1    = AMPLITUDE + 0.01*low*LOW_AMP;
    float A2    = A1 + mid*MID_ABAMP + high*HIGH_ABAMP;
    float AB    = (ABERRATION + mid*MID_ABER + high*HIGH_ABER)*res;
    float th    = mix(0.1, 0.01*THICKNESS, res);
    float inten = mix(0.1, 0.01*(INTENSITY + low*LOW_INT), res);
    float soft  = 0.01*res*max(0.0, SOFTNESS + mid*MID_SOFT);

    float dUnres = max(length(p) - mix(0.14, UNRES_SCALE, res), 0.0);
    float yMain = A1 * env * res * sin(p.x*FREQ + drift);

    float bandFillTh = max(BAND_THICK, 1e-4);
    float bandAmt    = 1e-4 * BAND_FILL * inten;
    vec3 num = vec3(0.0); float den = 0.0;
    for(int s = 0; s < STRANDS; s++){
        vec3 hue = mix(vec3(1.0), strand(s), res);
        den += dot(hue, vec3(0.3333));          // normaliza pelo brilho: mantém o tom azul
        float ab = mix(-AB, AB, float(s)/float(STRANDS - 1));
        float yL = A2 * env * res * sin(p.x*ABER_FREQ + drift + ab);
        float d   = mix(dUnres, abs(p.y - yL), res);
        float lor = mix(1.0/(1.0 + (0.02*d)*(0.02*d)), 1.0, res);
        float line = inten / (sqrt(d*d + soft*soft) + th);
        float lo = min(yMain, yL), hi = max(yMain, yL);
        float dBand = max(0.0, max(p.y - hi, lo - p.y));
        float band  = bandAmt / (dBand + bandFillTh);
        num += hue * lor * (line + band);
    }
    vec3 col = num / den;

    float dM    = mix(dUnres, abs(p.y - yMain), res);
    float lorM  = mix(1.0/(1.0 + (0.02*dM)*(0.02*dM)), 1.0, res);
    float boost = (1.0 - res) * (14.0*low + 4.0);
    col += vec3(0.78, 0.90, 1.0) * 0.5 * inten * (lorM + boost) / (sqrt(dM*dM + soft*soft) + th);   // fio central gelo

    col = pow(max(col, 0.0), vec3(1.5));
    float emT = clamp((abs(yScreen) - 1.0 + EDGE_INSET) / (-max(EDGE_MASK, 1e-4)), 0.0, 1.0);
    float em  = emT*emT*(3.0 - 2.0*emT);
    float gauss = exp(-pow(xN*FALLOFF, 2.0));
    col *= mix(1.0, em*gauss, res);
    col *= res * 1.15;   // um pouco mais de brilho, sem lavar os azuis escuros
    float lum = max(col.r, max(col.g, col.b));
    float a = clamp((lum - 0.035) * 1.45, 0.0, 1.0);   // corta o brilho bem fraco: sem ele, o quadro da onda aparecia como uma mancha clara
    fragColor = vec4(min(col, 1.0) / max(a, 1e-3), a);   // preto = transparente; onde satura, o miolo clareia (como no original)
}
void main(){ mainImage(fragColor, gl_FragCoord.xy); }
`;
