// Demo do Text Loop (base: text-loop-basic.tsx e text-loop-custom-variants-transition.tsx).
import * as React from 'react';
import { TextLoop } from '@/components/core/text-loop';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select } from './_shared';

function Demo({ big }: DemoProps) {
  const [style, setStyle] = React.useState<'flip' | 'basic'>('flip');
  const [interval, setIntervalS] = React.useState(2);
  return (
    <Frame controls={big && <>
      <Select label='Estilo' value={style} onChange={setStyle} options={[['flip', 'Gira com desfoque'], ['basic', 'Padrão']]} />
      <Range label='Intervalo' value={interval} min={0.8} max={5} step={0.2} onChange={setIntervalS} format={(v) => `${v.toFixed(1)}s`} />
    </>}>
      {style === 'flip' ? (
        <p className='inline-flex whitespace-pre-wrap text-xl text-zinc-950'>
          {'Sites prontos para '}
          <TextLoop key={interval} interval={interval} className='overflow-y-clip font-semibold text-[#1784b1]'
            transition={{ type: 'spring', stiffness: 900, damping: 80, mass: 10 }}
            variants={{ initial: { y: 20, rotateX: 90, opacity: 0, filter: 'blur(4px)' }, animate: { y: 0, rotateX: 0, opacity: 1, filter: 'blur(0px)' }, exit: { y: -20, rotateX: -90, opacity: 0, filter: 'blur(4px)' } }}>
            <span>clínicas</span><span>lojas</span><span>agências</span><span>restaurantes</span>
          </TextLoop>
        </p>
      ) : (
        <TextLoop key={interval} interval={interval} className='font-mono text-sm text-zinc-700'>
          <span>Como posso ajudar hoje?</span><span>Criar um site</span><span>Montar uma proposta</span><span>Resumir as vendas</span>
        </TextLoop>
      )}
    </Frame>
  );
}
export default defineDemo(Demo);
