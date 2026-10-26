// Demo do Toolbar Expandable: o componente oficial já é um exemplo completo (export default), usado como está.
import * as React from 'react';
import ToolbarExpandable from '@/components/core/toolbar-expandable';
import { defineDemo, type DemoProps } from '../runtime';
import { Frame } from './_shared';

function Demo(_: DemoProps) {
  return <Frame className='items-end pb-8'><ToolbarExpandable /></Frame>;
}
export default defineDemo(Demo);
