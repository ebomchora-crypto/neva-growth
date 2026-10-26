// Demo do Dock (base: apple-style-dock.tsx).
import * as React from 'react';
import { Activity, Component, HomeIcon, Mail, Package, ScrollText, SunMoon } from 'lucide-react';
import { Dock, DockIcon, DockItem, DockLabel } from '@/components/core/dock';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range } from './_shared';

const data = [['Início', HomeIcon], ['Produtos', Package], ['Componentes', Component], ['Atividade', Activity], ['Novidades', ScrollText], ['E-mail', Mail], ['Tema', SunMoon]] as const;

function Demo({ big }: DemoProps) {
  const [mag, setMag] = React.useState(80);
  const [dist, setDist] = React.useState(150);
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 520px)').matches;
  return (
    <Frame className='items-end' controls={big && <>
      <Range label='Ampliação' value={mag} min={50} max={110} step={2} onChange={setMag} format={(v) => `${v}px`} />
      <Range label='Alcance' value={dist} min={60} max={300} step={10} onChange={setDist} format={(v) => `${v}px`} />
    </>}>
      <p className='absolute top-6 text-sm text-zinc-500'>Passe o mouse pelos ícones</p>
      <div className='max-w-full pb-2'>
        <Dock className='items-end pb-3' magnification={mag} distance={dist}>
          {(big && !narrow ? data : data.slice(0, 5)).map(([title, Icon], idx) => (
            <DockItem key={idx} className='aspect-square rounded-full bg-gray-200'>
              <DockLabel>{title}</DockLabel>
              <DockIcon><Icon className='h-full w-full text-neutral-600' /></DockIcon>
            </DockItem>
          ))}
        </Dock>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
