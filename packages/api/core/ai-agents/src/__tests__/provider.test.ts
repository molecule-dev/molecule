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

  it('DECLINES (returns null) once a second differently-named provider is registered — the ambiguity bug', () => {
    // Regression: registration order used to silently decide which
    // provider ran forever (the FIRST named provider auto-promoted to the
    // singleton, and a later distinct name never displaced it). Now
    // getProvider() declines instead of returning a stale first-registered
    // pick — matching the documented "ambiguous → null" rule that already
    // applied to the no-singleton-at-all case.
    setProvider('a', stubProvider('a'))
    expect(getProvider()?.name).toBe('a') // single named provider: unambiguous
    setProvider('b', stubProvider('b'))
    expect(getProvider()).toBeNull() // now ambiguous: two distinct named providers, no explicit default
    // Both remain reachable by name — callers must disambiguate explicitly.
    expect(getProviderByName('a')?.name).toBe('a')
    expect(getProviderByName('b')?.name).toBe('b')
  })

  it('an explicit singleton set BEFORE named providers is unaffected by later ambiguity', () => {
    const explicitDefault = stubProvider('explicit')
    setProvider(explicitDefault)
    setProvider('a', stubProvider('a'))
    setProvider('b', stubProvider('b'))
    // An explicit setProvider(provider) singleton always wins — it was never
    // an auto-promotion, so the "second name → decline" rule does not apply.
    expect(getProvider()).toBe(explicitDefault)
  })

  it('an explicit singleton set AFTER auto-promotion also always wins', () => {
    setProvider('a', stubProvider('a')) // auto-promotes 'a'
    setProvider('b', stubProvider('b')) // now ambiguous
    expect(getProvider()).toBeNull()
    const explicitDefault = stubProvider('explicit')
    setProvider(explicitDefault) // explicit call clears the auto-promoted flag
    expect(getProvider()).toBe(explicitDefault)
  })

  it('requireProvider throws a DISTINCT, actionable message when declining due to ambiguity — disambiguated from "nothing bonded"', () => {
    setProvider('a', stubProvider('a'))
    setProvider('b', stubProvider('b'))
    // Pre-fix, this threw the same generic "not configured" message as the
    // true-nothing-bonded case even though two real providers ARE bonded —
    // an executor debugging this had no way to tell "bond something" from
    // "pick one of the two already-bonded providers".
    expect(() => requireProvider()).toThrow(/getProviderByName/)
    expect(() => requireProvider()).not.toThrow(/not configured/i)
  })
})
