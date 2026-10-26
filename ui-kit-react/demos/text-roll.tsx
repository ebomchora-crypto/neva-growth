// Demo do Text Roll (base: text-roll-basic.tsx e text-roll-custom-variants.tsx).
import * as React from 'react';
import { TextRoll } from '@/components/core/text-roll';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, useReplay } from './_shared';

const BLUR = { enter: { initial: { rotateX: 0, filter: 'blur(0px)' }, animate: { rotateX: 90, filter: 'blur(2px)' } }, exit: { initial: { rotateX: 90, filter: 'blur(2px)' }, animate: { rotateX: 0, filter: 'blur(0px)' } } };

function Demo({ big }: DemoProps) {
  const [style, setStyle] = React.useState<'basic' | 'blur'>('basic');
  const [duration, setDuration] = React.useState(0.5);
  const [k, replay] = useReplay();
  return (
    <Frame onReplay={replay} controls={big && <>
      <Select label='Estilo' value={style} onChange={(v) => { setStyle(v); replay(); }} options={[['basic', 'Padrão'], ['blur', 'Com desfoque']]} />
      <Range label='Duração' value={duration} min={0.2} max={1.5} step={0.1} onChange={(v) => { setDuration(v); replay(); }} format={(v) => `${v.toFixed(1)}s`} />
    </>}>
      <TextRoll key={`${style}-${duration}-${k}`} duration={duration} className='text-4xl font-semibold text-black' variants={style === 'blur' ? BLUR : undefined}>neva growth</TextRoll>
    </Frame>
  );
}
export default defineDemo(Demo);
