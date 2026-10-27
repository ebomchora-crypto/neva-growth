// Fundo do Builder e das páginas: o Gradient Wave, em azuis escuros da Neva (marinho -> azul -> ciano).
// Mantém o contrato antigo (wavesBackground -> { el, destroy } | null), então quem usa não muda.
import { gradientWave } from './gradient-wave.js';

const NEVA_DARK = ['#02101c', '#06304d', '#0e4a78', '#1b6ca8', '#082c48', '#2f9ad0'];

export function wavesBackground(opts = {}) {
  return gradientWave({ colors: NEVA_DARK, shadowPower: 8, ...opts });
}
