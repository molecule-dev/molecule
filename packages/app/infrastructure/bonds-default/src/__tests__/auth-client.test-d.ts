import { expectTypeOf, it } from 'vitest'

import type { createDefaultAuthClientWithFetchClient } from '../index.js'

it('preserves the supplied profile type through the default auth and fetch wiring', () => {
  type Profile = { accountId: string }
  type Client = ReturnType<typeof createDefaultAuthClientWithFetchClient<Profile>>['authClient']

  expectTypeOf<Client['getUser']>().returns.toEqualTypeOf<Profile | null>()
})
