// Demo do Image Comparison (base: image-comparison-basic.tsx, -custom-slider.tsx, -hover.tsx e -spring.tsx).
import * as React from 'react';
import { ImageComparison, ImageComparisonImage, ImageComparisonSlider } from '@/components/core/image-comparison';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Toggle, IMG } from './_shared';

function Demo({ big }: DemoProps) {
  const [hover, setHover] = React.useState(false);
  const [bounce, setBounce] = React.useState(0);
  return (
    <Frame controls={big && <>
      <Toggle label='Seguir o mouse (sem arrastar)' checked={hover} onChange={setHover} />
      <Range label='Mola (bounce)' value={bounce} min={0} max={0.6} step={0.05} onChange={setBounce} format={(v) => v.toFixed(2)} />
    </>}>
      <div className='flex w-full max-w-2xl flex-col gap-2'>
        <ImageComparison key={`${hover}-${bounce}`} className='aspect-16/10 w-full rounded-lg border border-zinc-200' enableHover={hover}
          springOptions={bounce ? { bounce } : undefined}>
          <ImageComparisonImage src={IMG[10]} alt='Site de finanças com cores' position='left' />
          <ImageComparisonImage src={IMG[10]} alt='Site de finanças em preto e branco' position='right' className='grayscale' />
          <ImageComparisonSlider className='w-2 bg-white/50 backdrop-blur-xs transition-colors hover:bg-white/80'>
            <div className='absolute left-1/2 top-1/2 h-8 w-6 -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white' />
          </ImageComparisonSlider>
        </ImageComparison>
        <div className='flex justify-between text-xs font-medium text-zinc-500'><span>Antes</span><span>Depois</span></div>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
