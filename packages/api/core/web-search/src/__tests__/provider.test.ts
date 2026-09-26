import { describe, expect, it } from 'vitest'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { WebSearchProvider } from '../types.js'

const fake: WebSearchProvider = {
  name: 'test',
  async search() {
    return { query: 'q', results: [{ title: 't', url: 'https://x.test/' }] }
  },
}

describe('web-search bond slot', () => {
  it('starts unbonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
    expect(() => requireProvider()).toThrow('Web search provider not configured')
  })

  it('bonds and requires a provider', () => {
    setProvider(fake)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(fake)
    expect(getProvider()).toBe(fake)
  })
})
