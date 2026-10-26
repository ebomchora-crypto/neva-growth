// Demo do Magnetic (base: magnetic-basic.tsx e magnetic-nested.tsx).
import * as React from 'react';
import { Magnetic } from '@/components/core/magnetic';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select } from './_shared';

function Demo({ big }: DemoProps) {
  const [intensity, setIntensity] = React.useState(0.2);
  const [range, setRange] = React.useState(200);
  const [area, setArea] = React.useState<'self' | 'parent' | 'global'>('global');
  const springOptions = { bounce: 0.1 };
  return (
    <Frame controls={big && <>
      <Range label='Intensidade' value={intensity} min={0.05} max={0.8} step={0.05} onChange={setIntensity} format={(v) => v.toFixed(2)} />
      <Range label='Alcance' value={range} min={50} max={400} step={10} onChange={setRange} format={(v) => `${v}px`} />
      <Select label='Área' value={area} onChange={setArea} options={[['global', 'Tela inteira'], ['parent', 'Área pai'], ['self', 'Só o botão']]} />
    </>}>
      <div className='flex flex-col items-center gap-6'>
        <p className='text-sm text-zinc-500'>Aproxime o mouse do botão</p>
        <Magnetic key={area} intensity={intensity} springOptions={springOptions} actionArea={area} range={range}>
          <button type='button' className='inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-950 shadow-sm transition-all duration-200 hover:bg-zinc-100'>
            <Magnetic key={area} intensity={intensity / 2} springOptions={springOptions} actionArea={area} range={range}><span>Enviar proposta</span></Magnetic>
          </button>
        </Magnetic>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
