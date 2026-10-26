// Demo do Accordion (base: app/docs/accordion/accordion-basic.tsx e accordion-icons.tsx).
import * as React from 'react';
import { ChevronUp } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/core/accordion';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Select } from './_shared';

const FAQ = [
  ['primeiros-passos', 'Primeiros passos', 'Cadastre seus clientes, registre a primeira venda e acompanhe o lucro no painel. Em poucos minutos a Neva Growth já mostra o resultado do seu negócio.'],
  ['crm', 'CRM e funil', 'Organize oportunidades em etapas, arraste os cards conforme a negociação avança e veja quanto está em aberto em cada fase.'],
  ['sites', 'Criação de sites', 'Descreva o site que você quer e o Builder com IA monta a estrutura, as seções e a direção de arte. Depois é só publicar.'],
  ['suporte', 'Suporte', 'Fale com a equipe pelo chat do painel. As respostas chegam no mesmo dia útil, com o passo a passo para o seu caso.'],
];
const TRANSITIONS = { spring: { type: 'spring', stiffness: 120, damping: 20 }, ease: { duration: 0.25, ease: 'easeInOut' } } as const;

function Demo({ big }: DemoProps) {
  const [t, setT] = React.useState<'spring' | 'ease'>('spring');
  return (
    <Frame className='items-start overflow-auto pt-12' controls={big && <Select label='Transição' value={t} onChange={setT} options={[['spring', 'Mola'], ['ease', 'Suave']]} />}>
      <Accordion key={t} className='flex w-full max-w-lg flex-col divide-y divide-zinc-200 py-2' transition={TRANSITIONS[t]}>
        {FAQ.map(([v, title, text]) => (
          <AccordionItem key={v} value={v} className='py-2'>
            <AccordionTrigger className='w-full text-left text-zinc-950'>
              <div className='flex items-center justify-between'>
                <div className='font-medium'>{title}</div>
                <ChevronUp className='h-4 w-4 text-zinc-950 transition-transform duration-200 group-data-expanded:-rotate-180' />
              </div>
            </AccordionTrigger>
            <AccordionContent><p className='pt-1 text-sm text-zinc-500'>{text}</p></AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Frame>
  );
}
export default defineDemo(Demo);
