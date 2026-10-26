// Demo do Animated Background (base: animated-tabs.tsx e animated-card-background-hover.tsx).
import * as React from 'react';
import { Home, PhoneCall, Settings, User } from 'lucide-react';
import { AnimatedBackground } from '@/components/core/animated-background';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select } from './_shared';

const TABS = [{ label: 'Início', icon: <Home className='h-5 w-5' /> }, { label: 'Perfil', icon: <User className='h-5 w-5' /> },
  { label: 'Serviços', icon: <Settings className='h-5 w-5' /> }, { label: 'Contato', icon: <PhoneCall className='h-5 w-5' /> }];
const ITEMS = [['Clientes', 'Carteira e histórico de cada cliente.'], ['Vendas', 'Lucro, margem e entregas.'], ['CRM', 'Funil com etapas arrastáveis.'],
  ['Sites', 'Vitrine das entregas publicadas.'], ['Builder', 'Sites criados com IA.'], ['Academia', 'Cursos com progresso.']];

function Demo({ big }: DemoProps) {
  const [mode, setMode] = React.useState<'tabs' | 'cards'>('tabs');
  const [bounce, setBounce] = React.useState(0.2);
  const [active, setActive] = React.useState<string | null>(TABS[0].label);
  return (
    <Frame controls={big && <>
      <Select label='Exemplo' value={mode} onChange={setMode} options={[['tabs', 'Abas (clique)'], ['cards', 'Cartões (hover)']]} />
      <Range label='Bounce' value={bounce} min={0} max={0.6} step={0.05} onChange={setBounce} format={(v) => v.toFixed(2)} />
    </>}>
      {mode === 'tabs' ? (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-sm text-zinc-500'>Selecionado: <b className='text-zinc-950'>{active}</b></p>
          <div className='flex w-full space-x-2 rounded-xl border border-zinc-950/10 bg-white p-2'>
            <AnimatedBackground defaultValue={TABS[0].label} onValueChange={setActive} className='rounded-lg bg-zinc-100' transition={{ type: 'spring', bounce, duration: 0.3 }}>
              {TABS.map((tab) => (
                <button key={tab.label} data-id={tab.label} type='button' aria-label={tab.label}
                  className='inline-flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors duration-100 focus-visible:outline-2 data-[checked=true]:text-zinc-950'>
                  {tab.icon}
                </button>
              ))}
            </AnimatedBackground>
          </div>
        </div>
      ) : (
        <div className='grid w-full grid-cols-2 md:grid-cols-3'>
          <AnimatedBackground className='rounded-lg bg-zinc-100' transition={{ type: 'spring', bounce, duration: 0.6 }} enableHover>
            {ITEMS.map(([title, d], i) => (
              <div key={i} data-id={`card-${i}`}>
                <div className='flex select-none flex-col space-y-1 p-4'>
                  <h3 className='text-base font-medium text-zinc-800'>{title}</h3>
                  <p className='text-sm text-zinc-600'>{d}</p>
                </div>
              </div>
            ))}
          </AnimatedBackground>
        </div>
      )}
    </Frame>
  );
}
export default defineDemo(Demo);
