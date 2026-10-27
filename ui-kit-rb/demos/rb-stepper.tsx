// gerado por gen.mjs (Components/Stepper)
import * as React from 'react';
import Comp from '../src/Components/Stepper/Stepper';
import { defineDemo, Box, Cycle, ScrollStage, type DemoProps } from '../runtime';
import { Step } from '../src/Components/Stepper/Stepper';
const IMGS = ["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"];
const T = ['Interiores', 'Tecnologia', 'Atendimento com IA', 'Agência criativa', 'Moda e calçados', 'Beleza', 'Velas e decoração', 'Saúde e clínicas'];
const ITEMS = IMGS.map((image, i) => ({ id: i + 1, image, src: image, img: image, url: image, title: T[i], text: T[i], label: T[i], alt: T[i], subtitle: 'Referência Neva', description: 'Referência de design da Neva Growth.', link: '#', href: '#', height: [300, 420, 260, 380, 320, 280, 400, 340][i], handle: 'neva', borderColor: '#48c8f5', gradient: 'linear-gradient(145deg,#48c8f5,#091629)' }));

function Demo({ big }: DemoProps) {
  
  return (
    <Box big={big} dark={false} center={true} zoom={1} drive={false}>
      <Comp initialStep={1}><Step><h2 className='text-xl font-semibold'>Boas-vindas</h2><p>Comece pelo básico da sua conta.</p></Step><Step><h2 className='text-xl font-semibold'>Clientes</h2><p>Cadastre seus primeiros clientes.</p></Step><Step><h2 className='text-xl font-semibold'>Vendas</h2><p>Registre a primeira venda.</p></Step></Comp>
    </Box>
  );
}
export default defineDemo(Demo);
