import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
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

    it('does not overwrite singleton when a second named provider is added', () => {
      setProvider('anthropic', mockAnthropicProvider)
      setProvider('openai', mockOpenAIProvider)
      // The singleton should still be the first one registered
      expect(getProvider()).toBe(mockAnthropicProvider)
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
