// Demo do Progressive Blur (base: progressive-blur-hover.tsx e progressive-blur-basic.tsx).
import * as React from 'react';
import { motion } from 'motion/react';
import { ProgressiveBlur, GRADIENT_ANGLES } from '@/components/core/progressive-blur';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, Toggle, IMG } from './_shared';

const POS = { bottom: 'bottom-0 left-0 h-[75%] w-full', top: 'top-0 left-0 h-[75%] w-full', left: 'left-0 top-0 h-full w-[75%]', right: 'right-0 top-0 h-full w-[75%]' } as const;

function Demo({ big }: DemoProps) {
  const [isHover, setIsHover] = React.useState(false);
  const [always, setAlways] = React.useState(false);
  const [intensity, setIntensity] = React.useState(0.5);
  const [layers, setLayers] = React.useState(8);
  const [direction, setDirection] = React.useState<keyof typeof GRADIENT_ANGLES>('bottom');
  const on = always || isHover;
  return (
    <Frame controls={big && <>
      <Toggle label='Sempre visível' checked={always} onChange={setAlways} />
      <Range label='Intensidade' value={intensity} min={0.1} max={2} step={0.05} onChange={setIntensity} format={(v) => v.toFixed(2)} />
      <Range label='Camadas' value={layers} min={2} max={16} step={1} onChange={setLayers} />
      <Select label='Direção' value={direction} onChange={setDirection} options={[['bottom', 'De baixo'], ['top', 'De cima'], ['left', 'Da esquerda'], ['right', 'Da direita']]} />
    </>}>
      <div className='relative aspect-square h-[260px] max-h-full overflow-hidden rounded-[4px]' onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
        <img src={IMG[0]} alt='Site de design de interiores' className='absolute inset-0 h-full w-full object-cover object-left-top' />
        <ProgressiveBlur className={`pointer-events-none absolute ${POS[direction]}`}
          blurIntensity={intensity} blurLayers={layers} direction={direction} animate={on ? 'visible' : 'hidden'} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} transition={{ duration: 0.2, ease: 'easeOut' }} />
        <motion.div className='absolute bottom-0 left-0' animate={on ? 'visible' : 'hidden'} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <div className='flex flex-col items-start gap-0 px-5 py-4'>
            <p className='text-base font-medium text-white'>Anuc Home</p>
            <span className='text-base text-zinc-300'>Design de interiores</span>
          </div>
        </motion.div>
        {!on && <span className='absolute right-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-zinc-700'>Passe o mouse</span>}
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
