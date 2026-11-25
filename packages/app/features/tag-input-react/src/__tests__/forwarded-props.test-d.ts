import { expectTypeOf } from 'vitest'

import type { TagListProps, UseTagInputResult } from '../index.js'

expectTypeOf<'onDragStart'>().not.toExtend<keyof TagListProps>()
expectTypeOf<{
  id: string
  value: readonly string[]
  'aria-label': string
}>().toExtend<TagListProps>()
expectTypeOf<keyof UseTagInputResult['fieldProps']>().toEqualTypeOf<
  'value' | 'onValueChange' | 'onKeyDown' | 'onBlur'
>()
expectTypeOf<keyof UseTagInputResult['inputProps']>().toEqualTypeOf<
  'value' | 'onChange' | 'onKeyDown' | 'onBlur'
>()
