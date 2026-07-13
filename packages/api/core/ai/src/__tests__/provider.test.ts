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
import type { AIProvider } from '../types.js'

// ---------------------------------------------------------------------------
// Mock AI providers
// ---------------------------------------------------------------------------

const mockAnthropicProvider: AIProvider = {
  name: 'anthropic',
  async *chat() {
    yield { type: 'done' as const, usage: { inputTokens: 0, outputTokens: 0 } }
  },
}

const mockOpenAIProvider: AIProvider = {
  name: 'openai',
  async *chat() {
    yield { type: 'done' as const, usage: { inputTokens: 0, outputTokens: 0 } }
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AI provider bond', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  // -------------------------------------------------------------------------
  // setProvider (singleton)
  // -------------------------------------------------------------------------

  describe('setProvider(provider) — singleton', () => {
    it('registers a singleton provider', () => {
      setProvider(mockAnthropicProvider)
      expect(getProvider()).toBe(mockAnthropicProvider)
    })

    it('overwrites a previous singleton', () => {
      setProvider(mockAnthropicProvider)
      setProvider(mockOpenAIProvider)
      expect(getProvider()).toBe(mockOpenAIProvider)
    })
  })

  // -------------------------------------------------------------------------
  // setProvider (named)
  // -------------------------------------------------------------------------

  describe('setProvider(name, provider) — named', () => {
    it('registers a named provider', () => {
      setProvider('anthropic', mockAnthropicProvider)
      expect(getProviderByName('anthropic')).toBe(mockAnthropicProvider)
    })

    it('supports multiple named providers', () => {
      setProvider('anthropic', mockAnthropicProvider)
      setProvider('openai', mockOpenAIProvider)
      expect(getProviderByName('anthropic')).toBe(mockAnthropicProvider)
      expect(getProviderByName('openai')).toBe(mockOpenAIProvider)
    })

    it('auto-registers the first named provider as singleton fallback', () => {
      setProvider('anthropic', mockAnthropicProvider)
      expect(getProvider()).toBe(mockAnthropicProvider)
    })

    it('DECLINES (returns null) once a second differently-named provider is registered — the ambiguity bug', () => {
      // Regression: registration order used to silently decide which
      // provider answered forever (the FIRST named provider auto-promoted to
      // the singleton, and a later distinct name never displaced it). Now
      // getProvider() declines instead of returning a stale first-registered
      // pick — matching the documented "ambiguous → null" rule that already
      // applied to the no-singleton-at-all case.
      setProvider('anthropic', mockAnthropicProvider)
      expect(getProvider()).toBe(mockAnthropicProvider) // single named provider: unambiguous
      setProvider('openai', mockOpenAIProvider)
      expect(getProvider()).toBeNull() // now ambiguous: two distinct named providers, no explicit default
      // Both remain reachable by name — callers must disambiguate explicitly.
      expect(getProviderByName('anthropic')).toBe(mockAnthropicProvider)
      expect(getProviderByName('openai')).toBe(mockOpenAIProvider)
    })

    it('an explicit singleton set BEFORE named providers is unaffected by later ambiguity', () => {
      const explicitDefault: AIProvider = {
        name: 'explicit',
        async *chat() {
          yield { type: 'done' as const, usage: { inputTokens: 0, outputTokens: 0 } }
        },
      }
      setProvider(explicitDefault)
      setProvider('anthropic', mockAnthropicProvider)
      setProvider('openai', mockOpenAIProvider)
      // An explicit setProvider(provider) singleton always wins — it was never
      // an auto-promotion, so the "second name → decline" rule does not apply.
      expect(getProvider()).toBe(explicitDefault)
    })

    it('an explicit singleton set AFTER auto-promotion also always wins', () => {
      setProvider('anthropic', mockAnthropicProvider) // auto-promotes anthropic
      setProvider('openai', mockOpenAIProvider) // now ambiguous
      expect(getProvider()).toBeNull()
      const explicitDefault: AIProvider = {
        name: 'explicit',
        async *chat() {
          yield { type: 'done' as const, usage: { inputTokens: 0, outputTokens: 0 } }
        },
      }
      setProvider(explicitDefault) // explicit call clears the auto-promoted flag
      expect(getProvider()).toBe(explicitDefault)
    })
  })

  // -------------------------------------------------------------------------
  // getProvider
  // -------------------------------------------------------------------------

  describe('getProvider', () => {
    it('returns null when no provider is bonded', () => {
      expect(getProvider()).toBeNull()
    })

    it('returns the singleton provider', () => {
      setProvider(mockAnthropicProvider)
      expect(getProvider()).toBe(mockAnthropicProvider)
    })
  })

  // -------------------------------------------------------------------------
  // requireProvider
  // -------------------------------------------------------------------------

  describe('requireProvider', () => {
    it('throws the generic "not configured" message when nothing is bonded', () => {
      expect(() => requireProvider()).toThrow(/not configured/i)
    })

    it('returns the resolved provider when unambiguous', () => {
      setProvider('anthropic', mockAnthropicProvider)
      expect(requireProvider()).toBe(mockAnthropicProvider)
    })

    it('throws a DISTINCT, actionable message when declining due to ambiguity — disambiguated from "nothing bonded"', () => {
      setProvider('anthropic', mockAnthropicProvider)
      setProvider('openai', mockOpenAIProvider)
      // Pre-fix, this threw the same generic "not configured" message as the
      // true-nothing-bonded case even though two real providers ARE bonded —
      // an executor debugging this had no way to tell "bond something" from
      // "pick one of the two already-bonded providers".
      expect(() => requireProvider()).toThrow(/getProviderByName/)
      expect(() => requireProvider()).not.toThrow(/not configured/i)
    })
  })

  // -------------------------------------------------------------------------
  // getProviderByName
  // -------------------------------------------------------------------------

  describe('getProviderByName', () => {
    it('returns null for unknown name', () => {
      expect(getProviderByName('nonexistent')).toBeNull()
    })

    it('returns the named provider', () => {
      setProvider('anthropic', mockAnthropicProvider)
      expect(getProviderByName('anthropic')).toBe(mockAnthropicProvider)
    })
  })

  // -------------------------------------------------------------------------
  // getAllProviders
  // -------------------------------------------------------------------------

  describe('getAllProviders', () => {
    it('returns empty map when none bonded', () => {
      expect(getAllProviders().size).toBe(0)
    })

    it('returns all named providers', () => {
      setProvider('anthropic', mockAnthropicProvider)
      setProvider('openai', mockOpenAIProvider)
      const all = getAllProviders()
      expect(all.size).toBe(2)
      expect(all.get('anthropic')).toBe(mockAnthropicProvider)
      expect(all.get('openai')).toBe(mockOpenAIProvider)
    })
  })

  // -------------------------------------------------------------------------
  // hasProvider
  // -------------------------------------------------------------------------

  describe('hasProvider', () => {
    it('returns false when no singleton is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('returns true when a singleton is bonded', () => {
      setProvider(mockAnthropicProvider)
      expect(hasProvider()).toBe(true)
    })

    it('returns false for unknown named provider', () => {
      expect(hasProvider('nonexistent')).toBe(false)
    })

    it('returns true for bonded named provider', () => {
      setProvider('anthropic', mockAnthropicProvider)
      expect(hasProvider('anthropic')).toBe(true)
    })

    it('returns false for different name', () => {
      setProvider('anthropic', mockAnthropicProvider)
      expect(hasProvider('openai')).toBe(false)
    })

    it('returns true for singleton after auto-fallback from named registration', () => {
      setProvider('openai', mockOpenAIProvider)
      expect(hasProvider()).toBe(true)
    })
  })
})
