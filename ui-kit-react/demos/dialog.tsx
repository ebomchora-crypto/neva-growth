// Demo do Dialog (base: dialog-basic.tsx e dialog-custom-variants-transtion.tsx).
import * as React from 'react';
import type { Variants, Transition } from 'motion/react';
import { Dialog, DialogDescription, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/core/dialog';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Select } from './_shared';

const STYLES: Record<string, { variants?: Variants; transition?: Transition }> = {
  default: {},
  blur: { variants: { initial: { scale: 0.9, filter: 'blur(10px)', y: '100%' }, animate: { scale: 1, filter: 'blur(0px)', y: 0 } }, transition: { type: 'spring', bounce: 0, duration: 0.4 } },
};

function Demo({ big }: DemoProps) {
  const [style, setStyle] = React.useState<'default' | 'blur'>('default');
  const s = STYLES[style];
  return (
    <Frame controls={big && <Select label='Entrada' value={style} onChange={setStyle} options={[['default', 'Padrão (escala)'], ['blur', 'Sobe com desfoque']]} />}>
      <Dialog key={style} variants={s.variants} transition={s.transition}>
        <DialogTrigger className='rounded-lg bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-900'>Receber novidades</DialogTrigger>
        <DialogContent className='w-full max-w-md bg-white p-6'>
          <DialogHeader>
            <DialogTitle className='text-zinc-900'>Receber novidades</DialogTitle>
            <DialogDescription className='text-zinc-600'>Deixe seu e-mail para saber quando os novos recursos chegarem.</DialogDescription>
          </DialogHeader>
          <form className='mt-6 flex flex-col space-y-4' onSubmit={(e) => e.preventDefault()}>
            <label htmlFor='mp-dialog-email' className='sr-only'>E-mail</label>
            <input id='mp-dialog-email' type='email' className='h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-hidden focus:ring-2 focus:ring-black/5 sm:text-sm' placeholder='seu@email.com' />
            <button className='inline-flex items-center justify-center self-end rounded-lg bg-black px-4 py-2 text-sm font-medium text-zinc-50' type='submit'>Quero receber</button>
          </form>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </Frame>
  );
}
export default defineDemo(Demo);
