import { expectTypeOf, it } from 'vitest'

import type { bootstrapApp } from '../index.js'

it('allows synchronous and asynchronous bond setup before mounting the app', () => {
  expectTypeOf<Parameters<typeof bootstrapApp>[0]['setupProviders']>().toEqualTypeOf<
    () => void | Promise<void>
  >()
})
