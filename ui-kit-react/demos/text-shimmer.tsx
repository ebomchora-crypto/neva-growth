// Demo do Text Shimmer (base: text-shimmer-basic.tsx e text-shimmer-color.tsx).
import * as React from 'react';
import { TextShimmer } from '@/components/core/text-shimmer';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range } from './_shared';

function Demo({ big }: DemoProps) {
  const [duration, setDuration] = React.useState(1.2);
  const [spread, setSpread] = React.useState(2);
  return (
    <Frame controls={big && <>
      <Range label='Duração' value={duration} min={0.4} max={4} step={0.1} onChange={setDuration} format={(v) => `${v.toFixed(1)}s`} />
      <Range label='Largura do brilho' value={spread} min={1} max={6} step={0.5} onChange={setSpread} />
    </>}>
      <div className='flex flex-col items-center gap-5'>
        <TextShimmer key={`a${duration}-${spread}`} duration={duration} spread={spread} className='font-mono text-sm'>Gerando o código…</TextShimmer>
        <TextShimmer key={`b${duration}-${spread}`} duration={duration} spread={spread} className='text-xl font-medium [--base-color:var(--color-blue-600)] [--base-gradient-color:var(--color-blue-200)]'>Olá, como posso ajudar?</TextShimmer>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
