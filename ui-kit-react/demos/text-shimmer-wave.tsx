// Demo do Text Shimmer Wave (base: text-shimmer-wave-basic.tsx e text-shimmer-wave-color.tsx).
import * as React from 'react';
import { TextShimmerWave } from '@/components/core/text-shimmer-wave';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range } from './_shared';

function Demo({ big }: DemoProps) {
  const [duration, setDuration] = React.useState(1);
  const [spread, setSpread] = React.useState(1);
  const [z, setZ] = React.useState(1);
  const [scale, setScale] = React.useState(1.1);
  const [rot, setRot] = React.useState(20);
  return (
    <Frame controls={big && <>
      <Range label='Duração' value={duration} min={0.4} max={3} step={0.1} onChange={setDuration} format={(v) => `${v.toFixed(1)}s`} />
      <Range label='Spread' value={spread} min={0.5} max={3} step={0.1} onChange={setSpread} format={(v) => v.toFixed(1)} />
      <Range label='Profundidade' value={z} min={0} max={20} step={1} onChange={setZ} />
      <Range label='Escala' value={scale} min={1} max={1.5} step={0.05} onChange={setScale} format={(v) => v.toFixed(2)} />
      <Range label='Giro Y' value={rot} min={0} max={60} step={2} onChange={setRot} format={(v) => `${v}°`} />
    </>}>
      <TextShimmerWave key={`${duration}-${spread}-${z}-${scale}-${rot}`} className='text-xl font-medium [--base-color:#1784b1] [--base-gradient-color:#48c8f5]'
        duration={duration} spread={spread} zDistance={z} scaleDistance={scale} rotateYDistance={rot}>
        Montando o seu site…
      </TextShimmerWave>
    </Frame>
  );
}
export default defineDemo(Demo);
