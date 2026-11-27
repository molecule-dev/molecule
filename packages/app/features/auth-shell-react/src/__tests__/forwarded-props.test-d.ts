import { expectTypeOf } from 'vitest'

import type {
  AuthShellCardColumnProps,
  AuthShellPanelProps,
  AuthShellSplitProps,
  AuthShellSplitRowProps,
} from '../index.js'

expectTypeOf<'onDragStart'>().not.toExtend<keyof AuthShellSplitProps>()
// A DOM-only attribute the kit's elements do not carry. (`lang` was the example until
// @molecule/app-ui made it an element prop that every renderer applies, 2026-11-27.)
expectTypeOf<'contentEditable'>().not.toExtend<keyof AuthShellSplitRowProps>()
expectTypeOf<'dangerouslySetInnerHTML'>().not.toExtend<keyof AuthShellPanelProps>()
expectTypeOf<'as'>().not.toExtend<keyof AuthShellPanelProps>()
expectTypeOf<AuthShellCardColumnProps['as']>().toEqualTypeOf<'section' | 'main' | undefined>()
expectTypeOf<{
  children: string
  style: { width: '80%' }
  'data-panel': string
}>().toExtend<AuthShellPanelProps>()
