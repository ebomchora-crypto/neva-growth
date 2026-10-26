// Demo do Spinning Text (base: spinning-text-basic.tsx e spinning-text-custom-variants.tsx).
import * as React from 'react';
import { SpinningText } from '@/components/core/spinning-text';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, Toggle } from './_shared';

const BLUR_VARIANTS = {
  container: { hidden: { opacity: 1 }, visible: { opacity: 1, rotate: 360, transition: { type: 'spring', bounce: 0, duration: 6, repeat: Infinity, staggerChildren: 0.03 } } },
  item: { hidden: { opacity: 0, filter: 'blur(4px)' }, visible: { opacity: 1, filter: 'blur(0px)' } },
};

function Demo({ big }: DemoProps) {
  const [style, setStyle] = React.useState<'basic' | 'blur'>('basic');
  const [duration, setDuration] = React.useState(10);
  const [radius, setRadius] = React.useState(5);
  const [reverse, setReverse] = React.useState(false);
  return (
    <Frame controls={big && <>
      <Select label='Estilo' value={style} onChange={setStyle} options={[['basic', 'Contínuo'], ['blur', 'Entrada com desfoque']]} />
      {style === 'basic' && <><Range label='Volta' value={duration} min={2} max={30} step={1} onChange={setDuration} format={(v) => `${v}s`} />
        <Toggle label='Inverter' checked={reverse} onChange={setReverse} /></>}
      <Range label='Raio' value={radius} min={3} max={8} step={0.5} onChange={setRadius} />
    </>}>
      <div className='relative flex h-48 w-48 items-center justify-center text-zinc-950'>
        {style === 'basic'
          ? <SpinningText radius={radius} fontSize={1.2} duration={duration} reverse={reverse} className='font-medium leading-none'>{'pré-venda • pré-venda • pré-venda • '}</SpinningText>
          : <SpinningText radius={radius + 0.5} fontSize={1} variants={BLUR_VARIANTS} className='font-[450]'>{'pré-venda • pré-venda • pré-venda • '}</SpinningText>}
        <span className='absolute h-10 w-10 rounded-full bg-[#48c8f5]' />
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
