// Demo do In View (base: in-view-images-grid.tsx e in-view-basic.tsx): role a área até a grade entrar na tela.
import * as React from 'react';
import { motion } from 'motion/react';
import { InView } from '@/components/core/in-view';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Toggle, IMG, IMG_LABEL, useReplay } from './_shared';

function Demo({ big }: DemoProps) {
  const [once, setOnce] = React.useState(true);
  const [k, replay] = useReplay();
  const box = React.useRef<HTMLDivElement>(null);
  return (
    <Frame className='p-0' onReplay={() => { box.current?.scrollTo({ top: 0 }); replay(); }} controls={big && <Toggle label='Animar só uma vez' checked={once} onChange={(v) => { setOnce(v); replay(); }} />}>
      <div ref={box} key={`${once}-${k}`} className='h-full w-full overflow-auto'>
        <div className='py-10 text-center text-sm text-zinc-500'>Role para baixo ↓</div>
        <div className={`flex items-end justify-center pb-10 ${big ? 'h-[900px]' : 'h-[640px]'}`}>
          <InView viewOptions={{ once, margin: '0px 0px -120px 0px', root: box as React.RefObject<Element> }}
            once={once} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.09 } } }}>
            <div className='columns-2 gap-4 px-6 sm:columns-3'>
              {IMG.slice(0, big ? 9 : 6).map((src, i) => (
                <motion.div key={src} className='mb-4' variants={{ hidden: { opacity: 0, scale: 0.8, filter: 'blur(10px)' }, visible: { opacity: 1, scale: 1, filter: 'blur(0px)' } }}>
                  <img src={src} alt={IMG_LABEL[i]} className='size-full rounded-lg object-contain' />
                </motion.div>
              ))}
            </div>
          </InView>
        </div>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
