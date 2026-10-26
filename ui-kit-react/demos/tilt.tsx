// Demo do Tilt (base: tilt-card-1.tsx e tilt-spotlight.tsx).
import * as React from 'react';
import { Tilt } from '@/components/core/tilt';
import { Spotlight } from '@/components/core/spotlight';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, Toggle, IMG } from './_shared';

function Demo({ big }: DemoProps) {
  const [style, setStyle] = React.useState<'card' | 'spotlight'>('card');
  const [factor, setFactor] = React.useState(8);
  const [reverse, setReverse] = React.useState(true);
  return (
    <Frame controls={big && <>
      <Select label='Exemplo' value={style} onChange={(v) => { setStyle(v); setFactor(v === 'card' ? 8 : 6); }} options={[['card', 'Cartão'], ['spotlight', 'Com luz (Spotlight)']]} />
      <Range label='Inclinação' value={factor} min={2} max={25} step={1} onChange={setFactor} format={(v) => `${v}°`} />
      <Toggle label='Inverter' checked={reverse} onChange={setReverse} />
    </>}>
      {style === 'card' ? (
        <Tilt rotationFactor={factor} isRevese={reverse}>
          <div style={{ borderRadius: '12px' }} className='flex max-w-[250px] flex-col overflow-hidden border border-zinc-950/10 bg-white'>
            <img src={IMG[8]} alt='Site de carros de luxo' className='h-40 w-full object-cover object-top' />
            <div className='p-2'><h1 className='font-mono leading-snug text-zinc-950'>Lamborghini.com</h1><p className='text-zinc-700'>Carros de luxo</p></div>
          </div>
        </Tilt>
      ) : (
        <div className='aspect-video w-full max-w-xs'>
          <Tilt rotationFactor={factor} isRevese={reverse} style={{ transformOrigin: 'center center' }} springOptions={{ stiffness: 26.7, damping: 4.1, mass: 0.2 }} className='group relative rounded-lg'>
            <Spotlight className='z-10 from-white/50 via-white/20 to-white/10 blur-2xl' size={248} springOptions={{ stiffness: 26.7, damping: 4.1, mass: 0.2 }} />
            <img src={IMG[9]} alt='Site de uma revista' className='h-32 w-full rounded-lg object-cover object-top grayscale duration-700 group-hover:grayscale-0' />
          </Tilt>
          <div className='flex flex-col space-y-0.5 pb-0 pt-3'><h3 className='font-mono text-sm font-medium text-zinc-500'>Kinfolk</h3><p className='text-sm text-black'>Revista e editorial</p></div>
        </div>
      )}
    </Frame>
  );
}
export default defineDemo(Demo);
