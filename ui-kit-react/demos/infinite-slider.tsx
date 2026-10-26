// Demo do Infinite Slider (base: infinite-slider-basic.tsx, -hover-speed.tsx e -vertical.tsx).
import * as React from 'react';
import { InfiniteSlider } from '@/components/core/infinite-slider';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, Toggle, IMG, IMG_LABEL } from './_shared';

function Demo({ big }: DemoProps) {
  const [speed, setSpeed] = React.useState(100);
  const [hover, setHover] = React.useState(20);
  const [dir, setDir] = React.useState<'horizontal' | 'vertical'>('horizontal');
  const [reverse, setReverse] = React.useState(false);
  const [gap, setGap] = React.useState(24);
  const vertical = dir === 'vertical';
  return (
    <Frame controls={big && <>
      <Range label='Velocidade' value={speed} min={20} max={300} step={10} onChange={setSpeed} />
      <Range label='No hover' value={hover} min={0} max={300} step={10} onChange={setHover} />
      <Range label='Espaço' value={gap} min={4} max={60} step={2} onChange={setGap} format={(v) => `${v}px`} />
      <Select label='Direção' value={dir} onChange={setDir} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} />
      <Toggle label='Inverter' checked={reverse} onChange={setReverse} />
    </>}>
      <div className={vertical ? 'h-full max-h-[420px] overflow-hidden' : 'w-full'}>
        <InfiniteSlider key={`${dir}-${reverse}`} speed={speed} speedOnHover={hover || undefined} gap={gap} direction={dir} reverse={reverse} className={vertical ? 'h-full' : ''}>
          {IMG.slice(0, 8).map((src, i) => <img key={src} src={src} alt={IMG_LABEL[i]} className='aspect-square w-[120px] rounded-[4px] object-cover object-top' />)}
        </InfiniteSlider>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
