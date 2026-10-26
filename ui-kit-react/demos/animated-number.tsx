// Demo do Animated Number (base: animated-number-counter.tsx).
import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { AnimatedNumber } from '@/components/core/animated-number';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range } from './_shared';

function Demo({ big }: DemoProps) {
  const [value, setValue] = React.useState(1000);
  const [duration, setDuration] = React.useState(1000);
  const [bounce, setBounce] = React.useState(0);
  return (
    <Frame controls={big && <>
      <Range label='Duração' value={duration} min={200} max={3000} step={100} onChange={setDuration} format={(v) => `${v} ms`} />
      <Range label='Bounce' value={bounce} min={0} max={0.5} step={0.05} onChange={setBounce} format={(v) => v.toFixed(2)} />
    </>}>
      <div className='flex flex-col items-center gap-3'>
        <span className='text-xs font-medium uppercase tracking-wider text-zinc-500'>Vendas no mês</span>
        <div className='flex w-full items-center justify-center space-x-3 text-zinc-800'>
          <button aria-label='Diminuir' onClick={() => setValue((p) => p - 100)} className='rounded-full p-1.5 hover:bg-zinc-100'><Minus className='h-4 w-4' /></button>
          <AnimatedNumber className='inline-flex items-center font-mono text-3xl font-light' springOptions={{ bounce, duration }} value={value} />
          <button aria-label='Aumentar' onClick={() => setValue((p) => p + 100)} className='rounded-full p-1.5 hover:bg-zinc-100'><Plus className='h-4 w-4' /></button>
        </div>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
