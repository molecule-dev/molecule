import { expectTypeOf } from 'vitest'

import type {
  AuthShellCardColumnProps,
  AuthShellPanelProps,
  AuthShellSplitProps,
  AuthShellSplitRowProps,
} from '../index.js'

expectTypeOf<'onDragStart'>().not.toExtend<keyof AuthShellSplitProps>()
expectTypeOf<'lang'>().not.toExtend<keyof AuthShellSplitRowProps>()
expectTypeOf<'dangerouslySetInnerHTML'>().not.toExtend<keyof AuthShellPanelProps>()
expectTypeOf<'as'>().not.toExtend<keyof AuthShellPanelProps>()
expectTypeOf<AuthShellCardColumnProps['as']>().toEqualTypeOf<'section' | 'main' | undefined>()
expectTypeOf<{
  children: string
  style: { width: '80%' }
  'data-panel': string
}>().toExtend<AuthShellPanelProps>()
