import { beforeEach, describe, expect, it } from 'vitest'

import { bond, reset } from '@molecule/api-bond'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { AISpeechProvider } from '../types.js'

const BOND_TYPE = 'ai-speech'

const stub = (name = 'mock'): AISpeechProvider => ({ name }) as AISpeechProvider

describe('ai-speech provider', () => {
  beforeEach(() => {
    // Isolate tests by clearing the shared @molecule/api-bond registry.
    reset()
  })

  it('starts with no provider bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/AISpeech provider not configured/)
  })

  it('setProvider then getProvider returns the bonded instance', () => {
    const p = stub()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
  })

  it('requireProvider returns the bonded instance', () => {
    const p = stub()
    setProvider(p)
    expect(requireProvider()).toBe(p)
  })

  it('setProvider replaces the previous provider', () => {
    const a = stub('a')
    const b = stub('b')
    setProvider(a)
    setProvider(b)
    expect(getProvider()).toBe(b)
  })

  it('bond() on the shared @molecule/api-bond registry is visible via the accessors', () => {
    // The exact bug this migration fixes: a generic bond(category, provider) call
    // was previously a silent no-op for this core. It must now be seen by the
    // core's own getProvider()/hasProvider()/requireProvider().
    const p = stub('via-registry')
    bond(BOND_TYPE, p)
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(p)
    expect(requireProvider()).toBe(p)
  })
})
