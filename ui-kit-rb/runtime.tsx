// Montador das pré-visualizações do React Bits (React 19) dentro da galeria em JavaScript puro.
// Mesmo contrato dos outros componentes: `export default (stage, ctx) => cleanup`. O CSS (Tailwind) só vale dentro de `.rb-scope`.
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';

declare const __RB_CSS__: string;
let cssReady: Promise<void> | null = null;
function ensureCss() {
  if (cssReady) return cssReady;
  cssReady = new Promise<void>((resolve) => {
    const id = 'rb-ui-kit-css';
    if (document.getElementById(id)) { resolve(); return; }
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = __RB_CSS__;
    link.onload = () => resolve(); link.onerror = () => resolve();
    document.head.append(link);
  });
  return cssReady;
}

class Guard extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error('[react-bits]', e); }
  render() {
    if (this.state.failed) return <p style={{ padding: 24, fontSize: 14, color: '#5e7f9c' }}>Este componente falhou ao abrir.</p>;
    return this.props.children;
  }
}

export type DemoProps = { big: boolean };

export function defineDemo(Demo: React.ComponentType<DemoProps>) {
  return async function mount(stage: HTMLElement, ctx: { big?: boolean } = {}) {
    await ensureCss();
    const host = document.createElement('div');
    host.className = 'rb-scope rb-host';
    stage.append(host);
    let root: Root | null = createRoot(host);
    root.render(<Guard><Demo big={!!ctx.big} /></Guard>);
    return () => {
      const r = root; root = null;
      setTimeout(() => { r?.unmount(); host.remove(); }, 0);
    };
  };
}

/** Moldura padrão: ocupa o palco inteiro; `dark` põe o azul-marinho da Neva atrás (fundos e efeitos de luz). */
export function Box({ children, dark, className = '', style }: { children?: React.ReactNode; dark?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ background: dark ? '#071426' : 'transparent', color: dark ? '#eaf6ff' : '#091629', ...style }}>
      {children}
    </div>
  );
}
