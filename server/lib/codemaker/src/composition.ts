// Camada de composição: o que os 26 blocos tinham fixo (largura do contêiner, respiro entre seções,
// caixa dos títulos, divisórias) vira decisão do site. Age sobre o Tailwind do site (tema + CSS), então
// vale para todos os blocos sem reescrevê-los.

export interface Composition {
  /** Largura do conteúdo: estreito (editorial), padrão ou largo (produto/vitrine). */
  container: 'narrow' | 'regular' | 'wide'
  /** Respiro vertical entre seções. */
  density: 'compact' | 'regular' | 'airy'
  /** Caráter dos títulos de seção. */
  headings: 'sentence' | 'upper' | 'tight' | 'heavy'
  /** Divisória entre seções: nenhuma ou fio fino. */
  rhythm: 'none' | 'rule'
}

export const COMPOSITION_OPTIONS = {
  container: ['narrow', 'regular', 'wide'],
  density: ['compact', 'regular', 'airy'],
  headings: ['sentence', 'upper', 'tight', 'heavy'],
  rhythm: ['none', 'rule'],
} as const

const MAX_W = { narrow: '68rem', regular: '80rem', wide: '96rem' } as const
const SPACE = { compact: ['4.25rem', '5.5rem'], regular: ['6rem', '8rem'], airy: ['7.5rem', '10rem'] } as const

// Pontos de partida por ramo (a IA e o pedido do usuário podem mudar).
const PRESETS: Record<string, Partial<Composition>> = {
  juridico: { container: 'narrow', density: 'airy', headings: 'tight', rhythm: 'rule' },
  contabilidade: { container: 'narrow', density: 'airy', headings: 'sentence', rhythm: 'rule' },
  saude: { container: 'regular', density: 'airy', headings: 'sentence', rhythm: 'none' },
  estetica: { container: 'regular', density: 'airy', headings: 'sentence', rhythm: 'none' },
  tecnologia: { container: 'wide', density: 'compact', headings: 'tight', rhythm: 'none' },
  energia: { container: 'regular', density: 'regular', headings: 'heavy', rhythm: 'none' },
  casa: { container: 'wide', density: 'regular', headings: 'sentence', rhythm: 'rule' },
  barbearia: { container: 'wide', density: 'compact', headings: 'upper', rhythm: 'rule' },
  fitness: { container: 'wide', density: 'compact', headings: 'upper', rhythm: 'none' },
  auto: { container: 'wide', density: 'compact', headings: 'upper', rhythm: 'rule' },
  restaurante: { container: 'regular', density: 'regular', headings: 'heavy', rhythm: 'none' },
  pizzaria: { container: 'regular', density: 'compact', headings: 'heavy', rhythm: 'none' },
  hamburgueria: { container: 'wide', density: 'compact', headings: 'upper', rhythm: 'none' },
  fotografia: { container: 'wide', density: 'airy', headings: 'sentence', rhythm: 'none' },
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function choose<T extends string>(options: readonly T[], avoid: (T | undefined)[], seed: string): T {
  const free = options.filter((option) => !avoid.includes(option))
  const pool = free.length ? free : options
  return pool[hash(seed) % pool.length]
}

/** Valida o que veio da IA: só valores conhecidos; campo ausente fica de fora. */
export function cleanComposition(input: unknown): Partial<Composition> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out: Partial<Composition> = {}
  for (const key of Object.keys(COMPOSITION_OPTIONS) as (keyof Composition)[]) {
    const value = raw[key]
    if (typeof value === 'string' && (COMPOSITION_OPTIONS[key] as readonly string[]).includes(value)) (out as Record<string, string>)[key] = value
  }
  return out
}

/** Composição sorteada para o site: parte do preset do ramo e foge do que a pessoa usou nos últimos sites. */
export function compositionFor(nicheId: string | undefined, seed: string, recent: (Partial<Composition> | undefined)[]): Composition {
  const preset = (nicheId && PRESETS[nicheId]) || {}
  const last = recent.slice(0, 3)
  const pickKey = <K extends keyof Composition>(key: K): Composition[K] =>
    (preset[key] as Composition[K] | undefined) ?? choose(COMPOSITION_OPTIONS[key] as readonly Composition[K][], last.map((c) => c?.[key]) as Composition[K][], `${seed}:${key}`)
  return { container: pickKey('container'), density: pickKey('density'), headings: pickKey('headings'), rhythm: pickKey('rhythm') }
}

export function completeComposition(partial: Partial<Composition> | undefined, base: Composition): Composition {
  return { ...base, ...(partial ?? {}) }
}

/** Trecho do `theme.extend` do Tailwind: troca o contêiner `max-w-7xl` e o respiro `py-24`/`py-32` dos blocos. */
export function compositionTheme(c: Composition): { maxWidth: Record<string, string>; spacing: Record<string, string> } {
  const [s24, s32] = SPACE[c.density]
  return { maxWidth: { '7xl': MAX_W[c.container] }, spacing: { '24': s24, '32': s32 } }
}

export function compositionCss(c: Composition): string {
  const rules: string[] = []
  if (c.headings === 'upper') rules.push('main section h2{text-transform:uppercase!important;letter-spacing:.015em!important;line-height:1.02!important;overflow-wrap:anywhere}')
  if (c.headings === 'tight') rules.push('main section h2{letter-spacing:-.035em!important;line-height:.98!important}')
  if (c.headings === 'heavy') rules.push('main section h2{font-weight:800!important;letter-spacing:-.015em!important}')
  if (c.rhythm === 'rule') rules.push('main>section+section{border-top:1px solid color-mix(in srgb,currentColor 14%,transparent)}')
  return rules.join('')
}

export function compositionMessage(c: Composition): string {
  const label = {
    container: { narrow: 'estreito (editorial, leitura focada)', regular: 'padrão', wide: 'largo (produto/vitrine)' },
    density: { compact: 'compacta (muita coisa na tela)', regular: 'padrão', airy: 'arejada (muito respiro, ar de luxo/calma)' },
    headings: { sentence: 'frase normal', upper: 'CAIXA ALTA', tight: 'apertados e densos', heavy: 'pesados (peso 800)' },
    rhythm: { none: 'sem divisórias', rule: 'fio fino entre as seções' },
  }
  return `- Composição (aplicada pelo sistema a todos os blocos; escreva títulos e textos que funcionem nela — títulos de seção em CAIXA ALTA pedem frases curtas): contêiner ${label.container[c.container]}; respiro ${label.density[c.density]}; títulos ${label.headings[c.headings]}; ${label.rhythm[c.rhythm]}. Pode trocar qualquer campo no JSON em "composition" se a direção de arte pedir outra coisa.`
}
