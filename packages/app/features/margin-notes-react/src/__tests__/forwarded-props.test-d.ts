import { expectTypeOf } from 'vitest'

import type { MarginNotesProps } from '../index.js'

expectTypeOf<'onDragStart'>().not.toExtend<keyof MarginNotesProps>()
expectTypeOf<'children'>().not.toExtend<keyof MarginNotesProps>()
expectTypeOf<{ blocks: []; id: string; style: { width: '80%' } }>().toExtend<MarginNotesProps>()
