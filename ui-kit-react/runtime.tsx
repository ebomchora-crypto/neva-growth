// Montador dos componentes do Motion Primitives (React + Motion) dentro da galeria em JavaScript puro.
// Cada demo vira um módulo `export default (stage, ctx) => cleanup`, o mesmo contrato dos componentes vanilla.
// Isolamento: o CSS (Tailwind) só vale dentro de `.mp-scope`; portais que o React cria no <body> (Dialog,
// Morphing Dialog) recebem essa classe ao entrar na página. MotionConfig respeita "reduzir movimento".
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionConfig } from 'motion/react';

declare const __MP_CSS__: string;
let cssReady: Promise<void> | null = null;
function ensureCss() {
  if (cssReady) return cssReady;
  cssReady = new Promise<void>((resolve) => {
    const id = 'mp-ui-kit-css';
    const old = document.getElementById(id) as HTMLLinkElement | null;
    if (old) { resolve(); return; }
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = __MP_CSS__;
    link.onload = () => resolve(); link.onerror = () => resolve();
    document.head.append(link);
  });
  return cssReady;
}

// Marca com .mp-scope os nós que portais do React colocam direto no <body>.
let mounted = 0; let portalObserver: MutationObserver | null = null;
const isReactNode = (n: Node) => n instanceof HTMLElement && Object.keys(n).some((k) => k.startsWith('__reactFiber') || k.startsWith('__reactContainer'));
function watchPortals(on: boolean) {
  mounted += on ? 1 : -1;
  if (mounted > 0 && !portalObserver) {
    portalObserver = new MutationObserver((list) => {
      for (const m of list) m.addedNodes.forEach((n) => { if (isReactNode(n)) (n as HTMLElement).classList.add('mp-scope'); });
    });
    portalObserver.observe(document.body, { childList: true });
  } else if (mounted <= 0 && portalObserver) { portalObserver.disconnect(); portalObserver = null; mounted = 0; }
}

class Guard extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error('[motion-primitives]', e); }
  render() {
    if (this.state.failed) return <p className='p-6 text-sm text-zinc-500'>Este componente falhou ao abrir.</p>;
    return this.props.children;
  }
}

export type DemoProps = { big: boolean };

export function defineDemo(Demo: React.ComponentType<DemoProps>) {
  return async function mount(stage: HTMLElement, ctx: { big?: boolean } = {}) {
    await ensureCss();
    const host = document.createElement('div');
    host.className = 'mp-scope mp-host';
    stage.append(host);
    watchPortals(true);
    let root: Root | null = createRoot(host);
    root.render(<MotionConfig reducedMotion='user'><Guard><Demo big={!!ctx.big} /></Guard></MotionConfig>);
    return () => {
      const r = root; root = null;
      // desmonta fora do ciclo atual do React (evita aviso de desmontagem síncrona durante render)
      setTimeout(() => { r?.unmount(); host.remove(); watchPortals(false); }, 0);
    };
  };
}
