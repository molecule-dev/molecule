vi.mock('@molecule/api-bond', () => {
  let store: Record<string, unknown> = {}
  return {
    bond: vi.fn((type: string, provider: unknown) => {
      store[type] = provider
    }),
    expectBond: vi.fn(),
    get: vi.fn((type: string) => store[type]),
    isBonded: vi.fn((type: string) => type in store),
    require: vi.fn((type: string) => {
      if (!(type in store)) throw new Error(`No provider bonded for '${type}'`)
      return store[type]
    }),
    __reset: () => {
      store = {}
    },
  }
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { PasswordProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let hash: typeof ProviderModule.hash
let compare: typeof ProviderModule.compare

const createMockProvider = (overrides: Partial<PasswordProvider> = {}): PasswordProvider => ({
  hash: vi.fn().mockResolvedValue('hashed'),
  compare: vi.fn().mockResolvedValue(true),
  ...overrides,
})

describe('password provider', () => {
  const originalSaltRounds = process.env.SALT_ROUNDS

  beforeEach(async () => {
    vi.resetModules()

    const bondModule = (await import('@molecule/api-bond')) as typeof BondModule & {
      __reset: () => void
    }
    bondModule.__reset()

    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    hash = providerModule.hash
    compare = providerModule.compare
  })

  afterEach(() => {
    if (originalSaltRounds === undefined) {
      delete process.env.SALT_ROUNDS
    } else {
      process.env.SALT_ROUNDS = originalSaltRounds
    }
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when nothing is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(/password/)
    })

    it('bonds and retrieves a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })

    it('setProvider can replace an existing provider', () => {
      const first = createMockProvider()
      const second = createMockProvider()
      setProvider(first)
      setProvider(second)
      expect(getProvider()).toBe(second)
    })
  })

  describe('hash', () => {
    it('throws when no provider is bonded', async () => {
      await expect(async () => hash('pw')).rejects.toThrow(/password/)
    })

    it('delegates to the bonded provider with the given password + saltRounds', async () => {
      const provider = createMockProvider({
        hash: vi.fn().mockResolvedValue('$2b$12$abcdef'),
      })
      setProvider(provider)

      const result = await hash('secret', 14)

      expect(provider.hash).toHaveBeenCalledWith('secret', 14)
      expect(result).toBe('$2b$12$abcdef')
    })

    it('defaults saltRounds to 12 when neither argument nor env var is set', async () => {
      delete process.env.SALT_ROUNDS
      const provider = createMockProvider()
      setProvider(provider)

      await hash('pw')

      expect(provider.hash).toHaveBeenCalledWith('pw', 12)
    })

    it('reads SALT_ROUNDS env var as default when set', async () => {
      process.env.SALT_ROUNDS = '10'
      const provider = createMockProvider()
      setProvider(provider)

      await hash('pw')

      expect(provider.hash).toHaveBeenCalledWith('pw', 10)
    })

    it('falls back to 12 when SALT_ROUNDS is unparseable (NaN)', async () => {
      process.env.SALT_ROUNDS = 'not-a-number'
      const provider = createMockProvider()
      setProvider(provider)

      await hash('pw')

      // Number('not-a-number') → NaN; NaN || 12 → 12.
      expect(provider.hash).toHaveBeenCalledWith('pw', 12)
    })

    it('falls back to 12 when SALT_ROUNDS is "0" (falsy)', async () => {
      process.env.SALT_ROUNDS = '0'
      const provider = createMockProvider()
      setProvider(provider)

      await hash('pw')

      expect(provider.hash).toHaveBeenCalledWith('pw', 12)
    })

    it('passes provider rejection through unchanged', async () => {
      const provider = createMockProvider({
        hash: vi.fn().mockRejectedValue(new Error('bcrypt failed')),
      })
      setProvider(provider)

      await expect(hash('pw')).rejects.toThrow('bcrypt failed')
    })
  })

  describe('compare', () => {
    it('throws when no provider is bonded', async () => {
      await expect(async () => compare('pw', 'hash')).rejects.toThrow(/password/)
    })

    it('delegates to the bonded provider', async () => {
      const provider = createMockProvider({
        compare: vi.fn().mockResolvedValue(false),
      })
      setProvider(provider)

      const result = await compare('plain', '$2b$12$xyz')

      expect(provider.compare).toHaveBeenCalledWith('plain', '$2b$12$xyz')
      expect(result).toBe(false)
    })

    it('returns true when provider matches', async () => {
      const provider = createMockProvider({
        compare: vi.fn().mockResolvedValue(true),
      })
      setProvider(provider)

      expect(await compare('plain', 'hash')).toBe(true)
    })

    it('passes provider rejection through unchanged', async () => {
      const provider = createMockProvider({
        compare: vi.fn().mockRejectedValue(new Error('compare failed')),
      })
      setProvider(provider)

      await expect(compare('pw', 'hash')).rejects.toThrow('compare failed')
    })
  })
})
