/**
 * Tests for the external-auth core: bond accessor + `verifyUserToken`
 * delegate. `@molecule/api-bond` is mocked with an in-memory store.
 */
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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { ExternalAuthProvider, ExternalAuthUser } from '../types.js'
import type * as VerifyModule from '../verify.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let verifyUserToken: typeof VerifyModule.verifyUserToken

const verifiedUser: ExternalAuthUser = { userId: 'user-123', email: 'user@example.com' }

const createMockProvider = (
  overrides: Partial<ExternalAuthProvider> = {},
): ExternalAuthProvider => ({
  verifyUserToken: vi.fn().mockResolvedValue(verifiedUser),
  ...overrides,
})

describe('external-auth provider', () => {
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

    const verifyModule = await import('../verify.js')
    verifyUserToken = verifyModule.verifyUserToken
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when nothing is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(/external-auth/)
    })

    it('bonds and retrieves a provider', () => {
      const provider = createMockProvider()
      setProvider(provider)
      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(provider)
    })

    it('setProvider replaces the existing provider', () => {
      const first = createMockProvider()
      const second = createMockProvider()
      setProvider(first)
      setProvider(second)
      expect(getProvider()).toBe(second)
    })
  })

  describe('verifyUserToken', () => {
    it('throws the helpful wiring message when no provider is bonded', async () => {
      await expect(verifyUserToken('some-token')).rejects.toThrow(
        'No external-auth provider bonded — setProvider(provider) from a bond like @molecule/api-external-auth-supabase at startup.',
      )
    })

    it('delegates to the bonded provider and returns the verified user', async () => {
      const provider = createMockProvider()
      setProvider(provider)

      const user = await verifyUserToken('valid-token')

      expect(provider.verifyUserToken).toHaveBeenCalledWith('valid-token')
      expect(user).toEqual(verifiedUser)
    })

    it('passes through null for an unverifiable token', async () => {
      const provider = createMockProvider({
        verifyUserToken: vi.fn().mockResolvedValue(null),
      })
      setProvider(provider)

      await expect(verifyUserToken('expired-token')).resolves.toBeNull()
    })
  })
})
