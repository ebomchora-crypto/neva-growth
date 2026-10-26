// Demo do Sliding Number (base: clock.tsx e sliding-slider.tsx).
import * as React from 'react';
import { SlidingNumber } from '@/components/core/sliding-number';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Select } from './_shared';

function Clock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className='flex items-center gap-0.5 font-mono text-3xl text-zinc-950'>
      <SlidingNumber value={time.getHours()} padStart={true} /><span className='text-zinc-500'>:</span>
      <SlidingNumber value={time.getMinutes()} padStart={true} /><span className='text-zinc-500'>:</span>
      <SlidingNumber value={time.getSeconds()} padStart={true} />
    </div>
  );
}
function Revenue() {
  const [value, setValue] = React.useState(12500);
  return (
    <div className='flex flex-col items-start gap-0'>
      <div className='flex items-center gap-2 font-mono text-sm text-zinc-500'>Receita do mês:</div>
      <div className='inline-flex items-center gap-1 font-mono text-3xl leading-none text-zinc-950'>R$<SlidingNumber value={value} /></div>
      <input type='range' value={value} min={500} max={100000} step={50} onChange={(e) => setValue(+e.target.value)} className='mt-3 w-56 accent-[#48c8f5]' aria-label='Receita do mês' />
    </div>
  );
}
function Demo({ big }: DemoProps) {
  const [mode, setMode] = React.useState<'clock' | 'slider'>('slider');
  return (
    <Frame controls={big && <Select label='Exemplo' value={mode} onChange={setMode} options={[['slider', 'Valor no controle'], ['clock', 'Relógio']]} />}>
      {mode === 'clock' ? <Clock /> : <Revenue />}
    </Frame>
  );
}
export default defineDemo(Demo);
