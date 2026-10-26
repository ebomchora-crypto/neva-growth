// Demo do Animated Group (base: animated-group-preset.tsx), com todos os presets do componente.
import * as React from 'react';
import { AnimatedGroup, type PresetType } from '@/components/core/animated-group';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Select, IMG, IMG_LABEL, useReplay } from './_shared';

const PRESETS: [PresetType, string][] = [['scale', 'scale'], ['fade', 'fade'], ['slide', 'slide'], ['blur', 'blur'], ['blur-slide', 'blur-slide'], ['zoom', 'zoom'],
  ['flip', 'flip'], ['bounce', 'bounce'], ['rotate', 'rotate'], ['swing', 'swing']];

function Demo({ big }: DemoProps) {
  const [preset, setPreset] = React.useState<PresetType>('scale');
  const [k, replay] = useReplay();
  return (
    <Frame onReplay={replay} className='overflow-auto' controls={big && <Select label='Preset' value={preset} onChange={(v) => { setPreset(v); replay(); }} options={PRESETS} />}>
      <AnimatedGroup key={`${preset}-${k}`} className={big ? 'grid w-full grid-cols-2 gap-4 md:grid-cols-4' : 'grid w-full grid-cols-2 gap-3'} preset={preset}>
        {IMG.slice(0, big ? 8 : 4).map((src, i) => <img key={src} src={src} alt={IMG_LABEL[i]} className='aspect-[4/3] h-auto w-full rounded-[4px] object-cover object-top' />)}
      </AnimatedGroup>
    </Frame>
  );
}
export default defineDemo(Demo);
