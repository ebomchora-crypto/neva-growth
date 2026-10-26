// Demo do Text Effect (base: text-effect-preset.tsx, -per-char.tsx, -speed.tsx e text-effect-exit.tsx).
import * as React from 'react';
import { TextEffect, type PresetType, type PerType } from '@/components/core/text-effect';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, Toggle, useReplay } from './_shared';

const BLUR_SLIDE = {
  container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.01 } }, exit: { transition: { staggerChildren: 0.01, staggerDirection: 1 } } },
  item: { hidden: { opacity: 0, filter: 'blur(10px) brightness(0%)', y: 0 }, visible: { opacity: 1, y: 0, filter: 'blur(0px) brightness(100%)', transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -30, filter: 'blur(10px) brightness(0%)', transition: { duration: 0.4 } } },
};

function Demo({ big }: DemoProps) {
  const [preset, setPreset] = React.useState<PresetType>('slide');
  const [per, setPer] = React.useState<PerType>('word');
  const [speed, setSpeed] = React.useState(1);
  const [exitLoop, setExitLoop] = React.useState(false);
  const [trigger, setTrigger] = React.useState(true);
  const [k, replay] = useReplay();
  React.useEffect(() => { if (!exitLoop) { setTrigger(true); return; } const id = setInterval(() => setTrigger((p) => !p), 2000); return () => clearInterval(id); }, [exitLoop]);
  return (
    <Frame onReplay={replay} controls={big && <>
      <Select label='Preset' value={preset} onChange={(v) => { setPreset(v); replay(); }} options={[['slide', 'slide'], ['blur', 'blur'], ['fade-in-blur', 'fade-in-blur'], ['scale', 'scale'], ['fade', 'fade']]} />
      <Select label='Por' value={per} onChange={(v) => { setPer(v); replay(); }} options={[['word', 'palavra'], ['char', 'letra'], ['line', 'linha']]} />
      <Range label='Velocidade' value={speed} min={0.25} max={3} step={0.25} onChange={(v) => { setSpeed(v); replay(); }} format={(v) => `${v}×`} />
      <Toggle label='Entrar e sair (variants com exit)' checked={exitLoop} onChange={setExitLoop} />
    </>}>
      <div className='max-w-md px-4 text-center text-2xl font-semibold leading-snug text-zinc-950'>
        {exitLoop ? (
          <TextEffect className='inline-flex flex-wrap justify-center' per='char' variants={BLUR_SLIDE} trigger={trigger}>Seu próximo cliente começa aqui</TextEffect>
        ) : (
          <TextEffect key={`${preset}-${per}-${speed}-${k}`} per={per} as='h3' preset={preset} speedReveal={speed} speedSegment={speed}>
            {per === 'line' ? 'Capte clientes\nfeche vendas\ne acompanhe o lucro' : 'Capte clientes, feche vendas e acompanhe o lucro'}
          </TextEffect>
        )}
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
