// Demo do Text Scramble (base: text-scramble-basic.tsx, -custom-char-duration.tsx e -custom-trigger.tsx).
import * as React from 'react';
import { TextScramble } from '@/components/core/text-scramble';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range, Select, useReplay } from './_shared';

const SETS: [string, string][] = [['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'Letras e números'], ['01', 'Binário'], ['.:/\\|_-=+*#', 'Símbolos']];

function Demo({ big }: DemoProps) {
  const [duration, setDuration] = React.useState(0.8);
  const [speed, setSpeed] = React.useState(0.04);
  const [chars, setChars] = React.useState(SETS[0][0]);
  const [hoverTrigger, setHoverTrigger] = React.useState(false);
  const [k, replay] = useReplay();
  return (
    <Frame onReplay={replay} controls={big && <>
      <Range label='Duração' value={duration} min={0.2} max={3} step={0.1} onChange={(v) => { setDuration(v); replay(); }} format={(v) => `${v.toFixed(1)}s`} />
      <Range label='Troca' value={speed} min={0.01} max={0.12} step={0.01} onChange={(v) => { setSpeed(v); replay(); }} format={(v) => `${v.toFixed(2)}s`} />
      <Select label='Caracteres' value={chars} onChange={(v) => { setChars(v); replay(); }} options={SETS} />
    </>}>
      <div className='flex flex-col items-center gap-6'>
        <TextScramble key={`${duration}-${speed}-${chars}-${k}`} duration={duration} speed={speed} characterSet={chars} className='font-mono text-xl uppercase text-zinc-950'>Gerando sua proposta</TextScramble>
        <a href='#' onClick={(e) => e.preventDefault()} className='text-zinc-500 transition-colors hover:text-black'>
          <TextScramble className='text-sm' as='span' speed={0.01} trigger={hoverTrigger} onHoverStart={() => setHoverTrigger(true)} onScrambleComplete={() => setHoverTrigger(false)}>
            Passe o mouse: Clínica Sorriso Vivo · site publicado
          </TextScramble>
        </a>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
