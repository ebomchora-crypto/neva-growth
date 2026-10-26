// Demo do Transition Panel (base: transition-panel-tabs.tsx e transition-panel-card.tsx).
import * as React from 'react';
import useMeasure from 'react-use-measure';
import { TransitionPanel } from '@/components/core/transition-panel';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Select } from './_shared';

const TABS = [
  { title: 'Estética', subtitle: 'Harmonia visual', content: 'Ritmo, espaçamento e tipografia trabalhando juntos para o site parecer feito sob medida, não montado a partir de um modelo.' },
  { title: 'Conteúdo', subtitle: 'Narrativa e clareza', content: 'Cada seção responde a uma dúvida do cliente, na ordem em que ela aparece: o que é, para quem, quanto custa, como contratar.' },
  { title: 'Técnica', subtitle: 'Velocidade e acesso', content: 'Imagens leves, fontes enxutas e boa leitura no celular. O site carrega rápido e funciona bem com teclado e leitor de tela.' },
];
const STEPS = [
  { title: 'Marca', description: 'Uma identidade com logo, cores e tom de voz definidos, para tudo falar a mesma língua.' },
  { title: 'Produto', description: 'Telas pensadas para o uso real, com fluxos curtos e interações que fazem sentido.' },
  { title: 'Site', description: 'Um site bonito e funcional, que apresenta o negócio e leva o visitante até o contato.' },
  { title: 'Design system', description: 'Componentes e regras que mantêm tudo consistente quando o projeto cresce.' },
];

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} type='button' className='relative flex h-8 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg border border-zinc-950/10 bg-transparent px-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 active:scale-[0.98]'>{children}</button>;
}

function Tabs() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  return (
    <div className='w-full max-w-md'>
      <div className='mb-4 flex space-x-2'>
        {TABS.map((item, i) => (
          <button key={i} onClick={() => setActiveIndex(i)} className={`rounded-md px-3 py-1 text-sm font-medium ${activeIndex === i ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>{item.title}</button>
        ))}
      </div>
      <div className='overflow-hidden border-t border-zinc-200'>
        <TransitionPanel activeIndex={activeIndex} transition={{ duration: 0.2, ease: 'easeInOut' }}
          variants={{ enter: { opacity: 0, y: -50, filter: 'blur(4px)' }, center: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: 50, filter: 'blur(4px)' } }}>
          {TABS.map((item, i) => <div key={i} className='py-2'><h3 className='mb-2 font-medium text-zinc-800'>{item.subtitle}</h3><p className='text-sm text-zinc-600'>{item.content}</p></div>)}
        </TransitionPanel>
      </div>
    </div>
  );
}

function Card() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [ref, bounds] = useMeasure();
  const W = 320;
  const go = (n: number) => { setDirection(n > activeIndex ? 1 : -1); setActiveIndex(n); };
  return (
    <div className='overflow-hidden rounded-xl border border-zinc-950/10 bg-white' style={{ width: W, maxWidth: '100%' }}>
      <TransitionPanel activeIndex={activeIndex} custom={direction}
        variants={{
          enter: (d: number) => ({ x: d > 0 ? W : -W, opacity: 0, height: bounds.height > 0 ? bounds.height : 'auto', position: 'initial' }),
          center: { zIndex: 1, x: 0, opacity: 1, height: bounds.height > 0 ? bounds.height : 'auto' },
          exit: (d: number) => ({ zIndex: 0, x: d < 0 ? W : -W, opacity: 0, position: 'absolute', top: 0, width: '100%' }),
        }}
        transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}>
        {STEPS.map((s, i) => <div key={i} className='px-4 pt-4' ref={ref}><h3 className='mb-0.5 font-medium text-zinc-800'>{s.title}</h3><p className='text-sm text-zinc-600'>{s.description}</p></div>)}
      </TransitionPanel>
      <div className='flex justify-between p-4'>
        {activeIndex > 0 ? <Btn onClick={() => go(activeIndex - 1)}>Voltar</Btn> : <div />}
        <Btn onClick={() => (activeIndex === STEPS.length - 1 ? go(0) : go(activeIndex + 1))}>{activeIndex === STEPS.length - 1 ? 'Recomeçar' : 'Próximo'}</Btn>
      </div>
    </div>
  );
}

function Demo({ big }: DemoProps) {
  const [mode, setMode] = React.useState<'tabs' | 'card'>('tabs');
  return (
    <Frame controls={big && <Select label='Exemplo' value={mode} onChange={setMode} options={[['tabs', 'Abas'], ['card', 'Passo a passo']]} />}>
      {mode === 'tabs' ? <Tabs /> : <Card />}
    </Frame>
  );
}
export default defineDemo(Demo);
