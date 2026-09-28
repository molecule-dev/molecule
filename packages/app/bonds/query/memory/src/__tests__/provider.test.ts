import { describe, expect, it } from 'vitest'

import { createProvider, provider } from '../provider.js'
import { describeQueryClient } from './describeQueryClient.js'

describe('memory provider', () => {
  it('is named and creates independent clients', () => {
    expect(provider.name).toBe('memory')
    const a = provider.createClient()
    const b = createProvider().createClient()
    a.set(['k'], 1)
    expect(b.get(['k'])).toBeUndefined()
  })
})

describeQueryClient('memory', (config) => provider.createClient(config))
