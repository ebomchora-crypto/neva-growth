// Demo do Morphing Dialog (base: morphing-dialog-basic-1.tsx), com uma captura de site do acervo.
import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { MorphingDialog, MorphingDialogTrigger, MorphingDialogContent, MorphingDialogTitle, MorphingDialogImage, MorphingDialogSubtitle,
  MorphingDialogClose, MorphingDialogDescription, MorphingDialogContainer } from '@/components/core/morphing-dialog';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, IMG } from './_shared';

function Demo({ big }: DemoProps) {
  const [duration, setDuration] = React.useState(0.25);
  const [bounce, setBounce] = React.useState(0.05);
  return (
    <Frame controls={big && <>
      <Range label='Duração' value={duration} min={0.1} max={1} step={0.05} onChange={setDuration} format={(v) => `${v.toFixed(2)}s`} />
      <Range label='Bounce' value={bounce} min={0} max={0.5} step={0.05} onChange={setBounce} format={(v) => v.toFixed(2)} />
    </>}>
      <MorphingDialog transition={{ type: 'spring', bounce, duration }}>
        <MorphingDialogTrigger style={{ borderRadius: '12px' }} className='flex max-w-[250px] flex-col overflow-hidden border border-zinc-950/10 bg-white'>
          <MorphingDialogImage src={IMG[6]} alt='Captura do site de uma loja de velas' className='h-40 w-full object-cover object-top' />
          <div className='flex grow flex-row items-end justify-between px-3 py-2'>
            <div>
              <MorphingDialogTitle className='text-zinc-950'>Aather</MorphingDialogTitle>
              <MorphingDialogSubtitle className='text-zinc-700'>Velas e decoração</MorphingDialogSubtitle>
            </div>
            <button type='button' aria-label='Abrir detalhes' className='relative ml-1 flex h-6 w-6 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg border border-zinc-950/10 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 active:scale-[0.98]'>
              <PlusIcon size={12} />
            </button>
          </div>
        </MorphingDialogTrigger>
        <MorphingDialogContainer>
          <MorphingDialogContent style={{ borderRadius: '24px' }} className='pointer-events-auto relative flex h-auto w-full flex-col overflow-hidden border border-zinc-950/10 bg-white sm:w-[500px]'>
            <MorphingDialogImage src={IMG[6]} alt='Captura do site de uma loja de velas' className='h-full w-full' />
            <div className='p-6'>
              <MorphingDialogTitle className='text-2xl text-zinc-950'>Aather</MorphingDialogTitle>
              <MorphingDialogSubtitle className='text-zinc-700'>Velas e decoração</MorphingDialogSubtitle>
              <MorphingDialogDescription disableLayoutAnimation variants={{ initial: { opacity: 0, scale: 0.8, y: 100 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.8, y: 100 } }}>
                <p className='mt-2 text-zinc-500'>Uma das referências de design do acervo da Neva Growth: fotos grandes do produto, muito respiro e tipografia serifada.</p>
                <p className='text-zinc-500'>Use como base no Builder com IA para criar um site com a mesma direção de arte.</p>
              </MorphingDialogDescription>
            </div>
            <MorphingDialogClose className='text-zinc-50' />
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </Frame>
  );
}
export default defineDemo(Demo);
