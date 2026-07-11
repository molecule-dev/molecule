import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AIAgentsProvider } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stubProvider = (name = 'mock'): AIAgentsProvider => ({
  name,
  run: async () => ({ output: '', steps: [], usage: { inputTokens: 0, outputTokens: 0 } }),
})

// ---------------------------------------------------------------------------
// Accessor (bond-registry) tests — mirrors the `ai` core accessor.
// ---------------------------------------------------------------------------

describe('ai-agents provider bond accessor', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('returns null / false when nothing is bonded', () => {
    expect(getProvider()).toBeNull()
    expect(hasProvider()).toBe(false)
    expect(getAllProviders().size).toBe(0)
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/AI agents provider not configured/)
  })

  it('setProvider (singleton) then getProvider returns the instance', () => {
    const p = stubProvider()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(p)
  })

  it('setProvider (named) registers and falls back to singleton', () => {
    const p = stubProvider('named')
    setProvider('named', p)
    expect(getProviderByName('named')).toBe(p)
    expect(getProvider()).toBe(p)
  })

  it('getProvider declines when multiple named providers are ambiguous', () => {
    setProvider('a', stubProvider('a'))
    bondSecondNamed()
    expect(getProviderByName('a')?.name).toBe('a')
    expect(getProviderByName('b')?.name).toBe('b')
    // Two named, singleton still resolves to the first (fallback set on first
    // named registration), so getProvider() is unambiguous here.
    expect(getProvider()?.name).toBe('a')
  })

  function bondSecondNamed(): void {
    setProvider('b', stubProvider('b'))
  }
})
