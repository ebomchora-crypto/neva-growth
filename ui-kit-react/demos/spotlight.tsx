// Demo do Spotlight (base: spotlight-basic.tsx, spotlight-border.tsx e spotlight-custom-color.tsx).
import * as React from 'react';
import { Spotlight } from '@/components/core/spotlight';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select } from './_shared';

const Logo = () => <img src='/img/logo-128.png' alt='Neva Growth' className='h-8 w-8 rounded-md' />;

function Demo({ big }: DemoProps) {
  const [mode, setMode] = React.useState<'border' | 'basic'>('border');
  const [size, setSize] = React.useState(124);
  return (
    <Frame controls={big && <>
      <Select label='Exemplo' value={mode} onChange={(v) => { setMode(v); setSize(v === 'border' ? 124 : 64); }} options={[['border', 'Borda iluminada'], ['basic', 'Luz no fundo']]} />
      <Range label='Tamanho' value={size} min={32} max={260} step={4} onChange={setSize} format={(v) => `${v}px`} />
    </>}>
      <div className='flex flex-col items-center gap-3'>
        {mode === 'border' ? (
          <div className='relative aspect-video h-[180px] overflow-hidden rounded-xl bg-zinc-300/30 p-[1px]'>
            <Spotlight className='from-blue-600 via-blue-500 to-blue-400 blur-3xl' size={size} />
            <div className='relative flex h-full w-full flex-col justify-between rounded-xl bg-white p-4'>
              <Logo /><div><p className='text-sm font-medium text-zinc-950'>Neva Growth</p><p className='text-xs text-zinc-500'>Passe o mouse pela borda</p></div>
            </div>
          </div>
        ) : (
          <div className='relative aspect-video h-[180px] rounded-sm border border-zinc-100 bg-white'>
            <Spotlight className='bg-zinc-700 blur-2xl' size={size} springOptions={{ bounce: 0.3, duration: 0.1 }} />
            <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white p-2'><Logo /></div>
          </div>
        )}
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
