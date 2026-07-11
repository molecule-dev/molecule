import { beforeEach, describe, expect, it } from 'vitest'

import { bond, configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AIRagProvider } from '../types.js'

// ---------------------------------------------------------------------------
// Fake AI RAG providers — the core ships no implementation, so the accessor is
// exercised with inert stubs. Behavior is tested in the bond package.
// ---------------------------------------------------------------------------

/**
 * Builds an inert `AIRagProvider` stub for accessor tests.
 *
 * @param name - The provider name to expose.
 * @returns A stub provider whose methods are never invoked by these tests.
 */
function makeStub(name: string): AIRagProvider {
  return {
    name,
    async ingest() {
      return { indexed: 0, dimension: 0 }
    },
    async query() {
      return { answer: '', sources: [] }
    },
    async remove() {
      /* no-op */
    },
  }
}

const providerA = makeStub('a')
const providerB = makeStub('b')

describe('ai-rag provider bond accessor', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  // -------------------------------------------------------------------------
  // Unbonded
  // -------------------------------------------------------------------------

  describe('unbonded', () => {
    it('starts unbonded', () => {
      expect(hasProvider()).toBe(false)
      expect(getProvider()).toBeNull()
      expect(getAllProviders().size).toBe(0)
    })

    it('requireProvider throws when nothing is bonded', () => {
      expect(() => requireProvider()).toThrow(/not configured/i)
    })
  })

  // -------------------------------------------------------------------------
  // setProvider (singleton)
  // -------------------------------------------------------------------------

  describe('setProvider(provider) — singleton', () => {
    it('registers a singleton provider resolvable via getProvider/requireProvider', () => {
      setProvider(providerA)
      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(providerA)
      expect(requireProvider()).toBe(providerA)
    })

    it('overwrites a previous singleton', () => {
      setProvider(providerA)
      setProvider(providerB)
      expect(getProvider()).toBe(providerB)
    })
  })

  // -------------------------------------------------------------------------
  // setProvider (named)
  // -------------------------------------------------------------------------

  describe('setProvider(name, provider) — named', () => {
    it('registers a named provider', () => {
      setProvider('a', providerA)
      expect(getProviderByName('a')).toBe(providerA)
      expect(hasProvider('a')).toBe(true)
    })

    it('auto-registers the first named provider as singleton fallback', () => {
      setProvider('a', providerA)
      expect(getProvider()).toBe(providerA)
    })

    it('declines the singleton fallback when multiple named providers are bonded', () => {
      bond('ai-rag', 'a', providerA)
      bond('ai-rag', 'b', providerB)
      // Two named bonds, no singleton → ambiguous, so getProvider declines.
      expect(getProvider()).toBeNull()
      expect(getProviderByName('a')).toBe(providerA)
      expect(getProviderByName('b')).toBe(providerB)
      expect(getAllProviders().size).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  // getProviderByName / hasProvider
  // -------------------------------------------------------------------------

  describe('getProviderByName / hasProvider', () => {
    it('returns null / false for unknown names', () => {
      expect(getProviderByName('nonexistent')).toBeNull()
      expect(hasProvider('nonexistent')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // bond() directly
  // -------------------------------------------------------------------------

  describe('bond("ai-rag", provider)', () => {
    it('is resolvable via the accessor', () => {
      bond('ai-rag', providerA)
      expect(requireProvider()).toBe(providerA)
    })
  })
})
