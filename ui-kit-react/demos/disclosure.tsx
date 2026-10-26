// Demo do Disclosure (base: disclosure-card.tsx).
import * as React from 'react';
import { motion } from 'motion/react';
import { Disclosure, DisclosureContent, DisclosureTrigger } from '@/components/core/disclosure';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, IMG } from './_shared';

function Demo({ big }: DemoProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [damping, setDamping] = React.useState(4.1);
  const [stiffness, setStiffness] = React.useState(26.7);
  const imageVariants = { collapsed: { scale: 1, filter: 'blur(0px)' }, expanded: { scale: 1.1, filter: 'blur(3px)' } };
  const contentVariants = { collapsed: { opacity: 0, y: 0 }, expanded: { opacity: 1, y: 0 } };
  const transition = { type: 'spring', stiffness, damping, mass: 0.2 } as const;
  return (
    <Frame controls={big && <>
      <Range label='Rigidez' value={stiffness} min={10} max={120} step={0.5} onChange={setStiffness} />
      <Range label='Amortecimento' value={damping} min={1} max={20} step={0.1} onChange={setDamping} />
    </>}>
      <div className='relative h-[260px] w-[260px] overflow-hidden rounded-xl'>
        <div onClick={() => setIsOpen(!isOpen)}>
          <motion.img src={IMG[3]} alt='Site de uma agência criativa' className='pointer-events-none h-[260px] w-full select-none object-cover object-left-top'
            animate={isOpen ? 'expanded' : 'collapsed'} variants={imageVariants} transition={transition} />
        </div>
        <Disclosure onOpenChange={setIsOpen} open={isOpen} className='absolute bottom-0 left-0 right-0 rounded-xl bg-zinc-900 px-4 pt-2' variants={contentVariants} transition={transition}>
          <DisclosureTrigger>
            <button className='w-full pb-2 text-left text-[14px] font-medium text-white' type='button' onClick={() => setIsOpen(!isOpen)}>agencia.criativa</button>
          </DisclosureTrigger>
          <DisclosureContent>
            <div className='flex flex-col pb-4 text-[13px] text-zinc-300'>
              <p>Site novo no ar 🚀</p>
              <p className='line-clamp-3'>Direção de arte em tons frios, tipografia grande no topo e uma vitrine dos projetos com filtro por área. Feito no Builder com IA da Neva Growth.</p>
              <button className='mt-3 w-full rounded-[4px] border border-zinc-700 bg-zinc-900 px-4 py-1 text-zinc-50 transition-colors duration-300 hover:bg-zinc-800' type='button'>Ver projeto</button>
            </div>
          </DisclosureContent>
        </Disclosure>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
