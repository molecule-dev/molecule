import { expectTypeOf, it } from 'vitest'

import type { CaseResult, FrameworkAdapter } from '../ui/spec.js'

it('requires each framework adapter to return the same async case result', () => {
  expectTypeOf<FrameworkAdapter['run']>().returns.toEqualTypeOf<Promise<CaseResult>>()
})
