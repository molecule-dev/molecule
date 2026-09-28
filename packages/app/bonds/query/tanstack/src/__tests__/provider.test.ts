import { QueryClient } from '@tanstack/query-core'
import { describe, expect, it } from 'vitest'

import { createProvider, provider } from '../provider.js'
import { describeQueryClient } from './describeQueryClient.js'

describe('tanstack provider', () => {
  it('is named and can wrap an existing TanStack client', () => {
    expect(provider.name).toBe('tanstack')
    const shared = new QueryClient()
    const client = createProvider({ client: shared }).createClient()
    client.set(['k'], 'v')
    expect(shared.getQueryData(['k'])).toBe('v')
  })
})

describeQueryClient('tanstack', (config) => provider.createClient(config))
