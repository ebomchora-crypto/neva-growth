// Demo do Toolbar Dynamic: o componente oficial já é um exemplo completo (export default), usado como está.
import * as React from 'react';
import ToolbarDynamic from '@/components/core/toolbar-dynamic';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame } from './_shared';

function Demo(_: DemoProps) {
  return <Frame className='items-start pt-10'><ToolbarDynamic /></Frame>;
}
export default defineDemo(Demo);
