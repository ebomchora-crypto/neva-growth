// Demo do Carousel (base: carousel-basic.tsx e carousel-custom-sizes.tsx), com imagens locais.
import * as React from 'react';
import { Carousel, CarouselContent, CarouselNavigation, CarouselIndicator, CarouselItem } from '@/components/core/carousel';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Select, Toggle, IMG, IMG_LABEL } from './_shared';

function Demo({ big }: DemoProps) {
  const [basis, setBasis] = React.useState<'full' | 'half' | 'third'>('full');
  const [always, setAlways] = React.useState(true);
  const [noDrag, setNoDrag] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const cls = { full: 'basis-full', half: 'basis-1/2', third: 'basis-1/3' }[basis];
  return (
    <Frame controls={big && <>
      <Select label='Itens por vez' value={basis} onChange={(v) => { setBasis(v); setIndex(0); }} options={[['full', '1'], ['half', '2'], ['third', '3']]} />
      <Toggle label='Setas sempre visíveis' checked={always} onChange={setAlways} />
      <Toggle label='Desligar arrasto' checked={noDrag} onChange={setNoDrag} />
      <span className='text-zinc-500'>Índice: <b className='text-zinc-950'>{index + 1}</b></span>
    </>}>
      <div className={big ? 'relative w-full max-w-md' : 'relative w-full max-w-xs'}>
        <Carousel index={index} onIndexChange={setIndex} disableDrag={noDrag}>
          <CarouselContent>
            {IMG.slice(0, 6).map((src, i) => (
              <CarouselItem key={src} className={`${cls} p-2`}>
                <div className='overflow-hidden rounded-lg border border-zinc-200 bg-white'>
                  <img src={src} alt={IMG_LABEL[i]} draggable={false} className='aspect-[4/3] w-full select-none object-cover object-top' />
                  <p className='truncate px-2.5 py-1.5 text-xs font-medium text-zinc-700'>{IMG_LABEL[i]}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNavigation alwaysShow={always} />
          <CarouselIndicator />
        </Carousel>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
