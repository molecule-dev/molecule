import { expectTypeOf, it } from 'vitest'

import type { TokenUsage } from '../index.js'

it('exposes an optional numeric reasoning output count', () => {
  expectTypeOf<TokenUsage['reasoningOutputTokens']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<{ inputTokens: number; outputTokens: number }>().toExtend<TokenUsage>()
})
