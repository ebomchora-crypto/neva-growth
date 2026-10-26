// Demo do Border Trail (base: border-trail-card-1.tsx e border-trail-textarea.tsx).
import * as React from 'react';
import { BorderTrail } from '@/components/core/border-trail';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select } from './_shared';

function Demo({ big }: DemoProps) {
  const [mode, setMode] = React.useState<'textarea' | 'card'>('textarea');
  const [size, setSize] = React.useState(120);
  const [duration, setDuration] = React.useState(5);
  const transition = { repeat: Infinity, duration, ease: 'linear' } as const;
  return (
    <Frame controls={big && <>
      <Select label='Exemplo' value={mode} onChange={setMode} options={[['textarea', 'Campo de texto'], ['card', 'Cartão carregando']]} />
      <Range label='Tamanho' value={size} min={40} max={200} step={10} onChange={setSize} format={(v) => `${v}px`} />
      <Range label='Volta' value={duration} min={1} max={12} step={0.5} onChange={setDuration} format={(v) => `${v}s`} />
    </>}>
      {mode === 'textarea' ? (
        <div className='relative h-[160px] w-[260px] overflow-hidden rounded-md border border-zinc-950/10 bg-white text-zinc-700 outline-hidden'>
          <textarea className='h-full w-full resize-none rounded-md bg-transparent px-4 py-3 text-sm outline-hidden' placeholder='Escreva sua mensagem…' />
          <BorderTrail key={`${size}-${duration}`} className='bg-linear-to-l from-blue-200 via-blue-500 to-blue-200' size={size} transition={transition} />
        </div>
      ) : (
        <div className='relative flex h-[200px] w-[300px] flex-col items-center justify-center rounded-md bg-zinc-200 px-5 py-2'>
          <BorderTrail key={`${size}-${duration}`} style={{ boxShadow: '0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)' }} size={size} transition={transition} />
          <div className='flex h-full animate-pulse flex-col items-start justify-center space-y-2' role='status' aria-label='Carregando…'>
            <div className='h-1 w-4 rounded-[4px] bg-zinc-600'></div><div className='h-1 w-10 rounded-[4px] bg-zinc-600'></div>
            <div className='h-1 w-12 rounded-[4px] bg-zinc-600'></div><div className='h-1 w-12 rounded-[4px] bg-zinc-600'></div><div className='h-1 w-12 rounded-[4px] bg-zinc-600'></div>
          </div>
        </div>
      )}
    </Frame>
  );
}
export default defineDemo(Demo);
