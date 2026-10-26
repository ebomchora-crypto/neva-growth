// Demo do Glow Effect (base: glow-effect-card-background.tsx, glow-effect-button.tsx e glow-effect-card-mode.tsx).
import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { GlowEffect, type GlowEffectProps } from '@/components/core/glow-effect';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select } from './_shared';

type Mode = NonNullable<GlowEffectProps['mode']>;
type Blur = 'softest' | 'soft' | 'medium' | 'strong' | 'stronger' | 'strongest' | 'none';
const COLORS = ['#48C8F5', '#2F7BBD', '#B9E8FF', '#1B4AA3'];

function Demo({ big }: DemoProps) {
  const [mode, setMode] = React.useState<Mode>('rotate');
  const [blur, setBlur] = React.useState<Blur>('medium');
  const [duration, setDuration] = React.useState(5);
  const [scale, setScale] = React.useState(1);
  return (
    <Frame controls={big && <>
      <Select label='Modo' value={mode} onChange={setMode} options={[['rotate', 'rotate'], ['pulse', 'pulse'], ['breathe', 'breathe'], ['colorShift', 'colorShift'], ['flowHorizontal', 'flowHorizontal'], ['static', 'static']]} />
      <Select label='Desfoque' value={blur} onChange={setBlur} options={[['softest', 'softest'], ['soft', 'soft'], ['medium', 'medium'], ['strong', 'strong'], ['stronger', 'stronger'], ['strongest', 'strongest'], ['none', 'none']]} />
      <Range label='Duração' value={duration} min={1} max={12} step={0.5} onChange={setDuration} format={(v) => `${v}s`} />
      <Range label='Escala' value={scale} min={0.8} max={1.2} step={0.01} onChange={setScale} format={(v) => v.toFixed(2)} />
    </>}>
      <div className='flex flex-col items-center gap-10'>
        <div className='relative h-36 w-56'>
          <GlowEffect key={`${mode}-${blur}-${duration}-${scale}`} colors={COLORS} mode={mode} blur={blur} duration={duration} scale={scale} />
          <div className='relative flex h-36 w-56 flex-col justify-between rounded-lg bg-zinc-950 p-4 text-white'>
            <span className='text-xs uppercase tracking-wider text-zinc-400'>Plano Pro</span>
            <span className='text-2xl font-light'>R$ 97<span className='text-sm text-zinc-400'>/mês</span></span>
          </div>
        </div>
        <div className='relative'>
          <GlowEffect colors={COLORS} mode='colorShift' blur='soft' duration={3} scale={0.9} />
          <button className='relative inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline outline-1 outline-[#fff2f21f]'>Começar <ArrowRight className='h-4 w-4' /></button>
        </div>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
