// Peças comuns das demos: imagens locais (capturas do acervo da Neva, nada de imagem externa),
// moldura do palco e controles (só na visualização ampliada; no cartão fica apenas o "repetir").
import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const IMG = ['26a93f7d95a980e9', 'cb6de64949b0bec6', 'a93756f0c0cb59fc', '94d9841532f84af8', '3f5a569abcca0bbf', '0401e230bb9cda3a',
  'f64c0d544bffcec5', 'cfebfdafc08fb11d', '3b24baef47b41477', 'c595fd0b94371aa8', 'f99b584bac5ddeba', 'a685a334d586f159'].map((id) => `/img/refs/${id}.webp`);
export const IMG_LABEL = ['Design de interiores', 'Estúdio de tecnologia', 'Atendimento com IA', 'Agência criativa', 'Moda e calçados', 'Beleza e cosméticos',
  'Velas e decoração', 'Saúde e clínicas', 'Carros de luxo', 'Revista e editorial', 'Finanças e fintech', 'Software e SaaS'];

export function Frame({ children, controls, className, onReplay }: { children: React.ReactNode; controls?: React.ReactNode | false; className?: string; onReplay?: () => void }) {
  return (
    <div className='flex h-full w-full flex-col'>
      <div className={cn('relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4', className)}>
        {children}
        {onReplay && (
          <button type='button' onClick={onReplay} aria-label='Repetir animação' title='Repetir animação'
            className='absolute right-2.5 top-2.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-950/10 bg-white/80 text-zinc-600 shadow-sm backdrop-blur transition-colors hover:text-zinc-950'>
            <RotateCcw className='h-3.5 w-3.5' />
          </button>
        )}
      </div>
      {controls ? <div className='flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-zinc-950/10 bg-white/75 px-4 py-3 text-xs text-zinc-700'>{controls}</div> : null}
    </div>
  );
}

export function Range({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className='flex items-center gap-2'>
      <span className='font-medium'>{label}</span>
      <input type='range' min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className='w-28 accent-[#48c8f5]' />
      <span className='w-12 font-mono tabular-nums text-zinc-500'>{format ? format(value) : value}</span>
    </label>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <label className='flex items-center gap-2'>
      <span className='font-medium'>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className='h-8 rounded-lg border border-zinc-950/10 bg-white px-2 text-xs text-zinc-900'>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className='flex cursor-pointer items-center gap-2'>
      <input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} className='h-4 w-4 accent-[#48c8f5]' />
      <span className='font-medium'>{label}</span>
    </label>
  );
}

/** Chave que muda para remontar (repetir) uma animação de entrada. */
export function useReplay(): [number, () => void] {
  const [k, setK] = React.useState(0);
  return [k, () => setK((x) => x + 1)];
}
