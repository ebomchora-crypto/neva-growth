// Banner das páginas com tipografia e espaçamento refinados (sem fundo animado: o fundo animado é o da PÁGINA, em page-waves.js).
export function heroWaves(el) {
  el?.classList.add('fx');
  return { destroy() { el?.classList.remove('fx'); } };
}
