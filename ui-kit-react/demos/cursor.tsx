// Demo do Cursor (base: cursor-1.tsx e cursor-2.tsx).
import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlusIcon } from 'lucide-react';
import { Cursor } from '@/components/core/cursor';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, IMG } from './_shared';

const MouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns='http://www.w3.org/2000/svg' width={26} height={31} fill='none' {...props}>
    <g clipPath='url(#mp-cursor-a)'><path fill='#48c8f5' fillRule='evenodd' stroke='#fff' strokeLinecap='square' strokeWidth={2} d='M21.993 14.425 2.549 2.935l4.444 23.108 4.653-10.002z' clipRule='evenodd' /></g>
    <defs><clipPath id='mp-cursor-a'><path fill='#48c8f5' d='M0 0h26v31H0z' /></clipPath></defs>
  </svg>
);

function Bubble({ bounce }: { bounce: number }) {
  const [isHovering, setIsHovering] = React.useState(false);
  const targetRef = React.useRef<HTMLDivElement>(null);
  const handlePositionChange = (x: number, y: number) => {
    if (targetRef.current) { const r = targetRef.current.getBoundingClientRect(); setIsHovering(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom); }
  };
  return (
    <div className='flex h-full w-full items-center justify-center'>
      <Cursor attachToParent variants={{ initial: { scale: 0.3, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.3, opacity: 0 } }}
        springConfig={{ bounce }} transition={{ ease: 'easeInOut', duration: 0.15 }} onPositionChange={handlePositionChange}>
        <motion.div animate={{ width: isHovering ? 80 : 16, height: isHovering ? 32 : 16 }} className='flex items-center justify-center rounded-[24px] bg-gray-500/40 backdrop-blur-md'>
          <AnimatePresence>
            {isHovering ? (
              <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className='inline-flex w-full items-center justify-center'>
                <div className='inline-flex items-center text-sm text-white'>Ver <PlusIcon className='ml-1 h-4 w-4' /></div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </Cursor>
      <div ref={targetRef}><img src={IMG[2]} alt='Site de atendimento com IA' className='h-44 w-40 rounded-[8px] border border-zinc-100 object-cover object-left-top' /></div>
    </div>
  );
}

function Label() {
  return (
    <div className='overflow-hidden rounded-[12px] bg-white p-2 shadow-md'>
      <Cursor attachToParent variants={{ initial: { scale: 0.3, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.3, opacity: 0 } }}
        transition={{ ease: 'easeInOut', duration: 0.15 }} className='left-12 top-4'>
        <div><MouseIcon className='h-6 w-6' /><div className='ml-4 mt-1 rounded-[4px] bg-blue-500 px-2 py-0.5 text-neutral-50'>A loja de velas</div></div>
      </Cursor>
      <img src={IMG[6]} alt='Loja de velas' className='h-40 w-full max-w-36 rounded-[8px] object-cover object-left-top' />
    </div>
  );
}

function Demo({ big }: DemoProps) {
  const [style, setStyle] = React.useState<'bubble' | 'label'>('bubble');
  const [bounce, setBounce] = React.useState(0.001);
  return (
    <Frame controls={big && <>
      <Select label='Estilo' value={style} onChange={setStyle} options={[['bubble', 'Bolha que cresce'], ['label', 'Seta com rótulo']]} />
      {style === 'bubble' && <Range label='Bounce' value={bounce} min={0} max={0.5} step={0.01} onChange={setBounce} format={(v) => v.toFixed(2)} />}
    </>}>
      {style === 'bubble' ? <Bubble key={bounce} bounce={bounce} /> : <Label />}
    </Frame>
  );
}
export default defineDemo(Demo);
