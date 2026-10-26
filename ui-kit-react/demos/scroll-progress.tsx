// Demo do Scroll Progress (base: scroll-progress-basic-1.tsx).
import * as React from 'react';
import { ScrollProgress } from '@/components/core/scroll-progress';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame, Range } from './_shared';

const TEXT = [
  'Um bom site começa pelo objetivo: o que a pessoa precisa fazer quando chegar? Pedir um orçamento, chamar no WhatsApp, comprar.',
  'Depois vem a hierarquia. O título diz o que você faz, o subtítulo diz para quem, e o botão principal aparece logo no topo.',
  'Prova social perto da chamada para ação: depoimentos curtos, logos de clientes e números reais do seu trabalho.',
  'Seções curtas, uma ideia por bloco, imagens que mostram o produto de verdade. Nada de banco de imagens genérico.',
  'No celular, o botão principal fica ao alcance do polegar e os textos não passam de quatro linhas por parágrafo.',
  'Por fim, velocidade: imagens leves, fontes enxutas e nada de vídeo pesado logo na primeira dobra.',
  'Publique, meça e ajuste. O primeiro site é um começo; os números dizem o que melhorar na próxima versão.',
];

function Demo({ big }: DemoProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [stiffness, setStiffness] = React.useState(200);
  const [damping, setDamping] = React.useState(50);
  return (
    <Frame className='p-0' controls={big && <>
      <Range label='Rigidez' value={stiffness} min={20} max={600} step={10} onChange={setStiffness} />
      <Range label='Amortecimento' value={damping} min={5} max={100} step={1} onChange={setDamping} />
    </>}>
      <div className='relative h-full w-full'>
        <div className='h-full overflow-auto px-8 pb-16 pt-12' ref={containerRef}>
          <h3 className='pb-4 text-lg font-semibold text-zinc-950'>Como montar um site que vende</h3>
          {[...TEXT, ...TEXT].map((t, i) => <p key={i} className='pb-4 text-sm text-zinc-500'>{t}</p>)}
        </div>
        <div className='pointer-events-none absolute bottom-0 left-0 h-12 w-full bg-white to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_top,white,transparent)]' />
        <div className='pointer-events-none absolute left-0 top-0 w-full'>
          <div className='absolute left-0 top-0 h-1 w-full bg-[#E6F4FE]' />
          <ScrollProgress key={`${stiffness}-${damping}`} containerRef={containerRef as React.RefObject<HTMLDivElement>} springOptions={{ stiffness, damping, restDelta: 0.001 }} className='absolute top-0 bg-[#48C8F5]' />
        </div>
      </div>
    </Frame>
  );
}
export default defineDemo(Demo);
