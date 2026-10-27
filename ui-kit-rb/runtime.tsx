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

/** Simula um ponteiro passeando pelo palco (só na miniatura; na versão ampliada vale o mouse de verdade). */
function useDrive(ref: React.RefObject<HTMLElement | null>, mode: false | 'move' | 'click', big: boolean) {
  React.useEffect(() => {
    const el = ref.current; if (!mode || big || !el) return;
    let raf = 0; let lastClick = 0; const t0 = performance.now();
    const fire = (type: string, x: number, y: number) => {
      const init = { clientX: x, clientY: y, bubbles: true, cancelable: true, view: window, pointerType: 'mouse', pointerId: 1, isPrimary: true } as PointerEventInit;
      el.dispatchEvent(new PointerEvent(type.replace('mouse', 'pointer'), init)); el.dispatchEvent(new MouseEvent(type, init));
    };
    const loop = (t: number) => {
      const r = el.getBoundingClientRect(); const a = (t - t0) / 1000;
      const x = r.left + r.width * (0.5 + 0.34 * Math.sin(a * 1.1)); const y = r.top + r.height * (0.5 + 0.3 * Math.sin(a * 1.7 + 1));
      fire('mousemove', x, y);
      if (mode === 'click' && t - lastClick > 1300) { lastClick = t; fire('mousedown', x, y); fire('mouseup', x, y); el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, view: window })); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [mode, big]);
}

/** Moldura padrão: ocupa o palco inteiro; `dark` põe o azul-marinho da Neva atrás; `center` centraliza o componente. */
export function Box({ children, dark, center, drive = false, big = false, boxRef, className = '', style }: { children?: React.ReactNode; dark?: boolean; center?: boolean; drive?: false | 'move' | 'click'; big?: boolean; boxRef?: React.RefObject<HTMLDivElement | null>; className?: string; style?: React.CSSProperties }) {
  const own = React.useRef<HTMLDivElement | null>(null); const ref = boxRef || own;
  useDrive(ref, drive, big);
  return (
    <div ref={ref} className={`relative h-full w-full overflow-hidden ${center ? 'flex items-center justify-center' : ''} ${className}`}
      style={{ background: dark ? '#071426' : '#ffffff', color: dark ? '#eaf6ff' : '#091629', ...style }}>
      {children}
    </div>
  );
}

/** Alterna `on` a cada `every` ms (para componentes que só reagem a hover/clique). */
export function Cycle({ every = 2200, children }: { every?: number; children: (on: boolean) => React.ReactNode }) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { const t = setInterval(() => setOn((v) => !v), every); return () => clearInterval(t); }, [every]);
  return <>{children(on)}</>;
}

/** Área rolável que anda sozinha (para efeitos que dependem de rolagem). */
export function ScrollStage({ children, big, pad = 360 }: { children: (ref: React.RefObject<HTMLDivElement | null>) => React.ReactNode; big?: boolean; pad?: number }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = ref.current; if (!el || big) return; let raf = 0; const t0 = performance.now();
    const loop = (t: number) => { const max = el.scrollHeight - el.clientHeight; el.scrollTop = max * (0.5 - 0.5 * Math.cos((t - t0) / 3200)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [big]);
  return <div ref={ref} className='h-full w-full overflow-auto'><div style={{ height: pad }} />{children(ref)}<div style={{ height: pad }} /></div>;
}
