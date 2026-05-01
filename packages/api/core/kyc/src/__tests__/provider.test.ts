/**
 * Tests for the KYC core provider singleton + convenience wrappers.
 *
 * @module
 */

vi.mock('@molecule/api-bond', () => {
  let store: Record<string, unknown> = {}
  return {
    bond: vi.fn((type: string, provider: unknown) => {
      store[type] = provider
    }),
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

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { CreateKycSessionOptions, KycProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getOptionalProvider: typeof ProviderModule.getOptionalProvider
let createVerificationSession: typeof ProviderModule.createVerificationSession
let getVerificationStatus: typeof ProviderModule.getVerificationStatus
let cancelVerificationSession: typeof ProviderModule.cancelVerificationSession
let processWebhook: typeof ProviderModule.processWebhook

const createMockProvider = (overrides: Partial<KycProvider> = {}): KycProvider => ({
  createVerificationSession: vi
    .fn()
    .mockResolvedValue({ sessionId: 'vs_1', url: 'https://verify.example.com/abc' }),
  getVerificationStatus: vi.fn().mockResolvedValue({ sessionId: 'vs_1', status: 'pending' }),
  cancelVerificationSession: vi.fn().mockResolvedValue({ sessionId: 'vs_1', status: 'canceled' }),
  processWebhook: vi.fn().mockResolvedValue({ type: 'verification.verified', sessionId: 'vs_1' }),
  ...overrides,
})

const sessionOptions: CreateKycSessionOptions = {
  userId: 'user-1',
  type: 'document',
  returnUrl: 'https://app.example.com/verify/done',
}

describe('kyc provider', () => {
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
    getOptionalProvider = providerModule.getOptionalProvider
    createVerificationSession = providerModule.createVerificationSession
    getVerificationStatus = providerModule.getVerificationStatus
    cancelVerificationSession = providerModule.cancelVerificationSession
    processWebhook = providerModule.processWebhook
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('throws with i18n message when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('KYC provider not configured. Call setProvider() first.')
    })

    it('bonds and retrieves a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })

    it('returns null from getOptionalProvider when no provider is bonded', () => {
      expect(getOptionalProvider()).toBeNull()
    })

    it('returns the bonded provider from getOptionalProvider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getOptionalProvider()).toBe(mockProvider)
    })
  })

  describe('convenience wrappers', () => {
    it('createVerificationSession throws when no provider is bonded', async () => {
      await expect(async () => createVerificationSession(sessionOptions)).rejects.toThrow(
        'KYC provider not configured. Call setProvider() first.',
      )
    })

    it('createVerificationSession delegates to the bonded provider', async () => {
      const mockProvider = createMockProvider({
        createVerificationSession: vi
          .fn()
          .mockResolvedValue({ sessionId: 'vs_2', url: 'https://x', expiresAt: 1234 }),
      })
      setProvider(mockProvider)

      const result = await createVerificationSession(sessionOptions)

      expect(mockProvider.createVerificationSession).toHaveBeenCalledWith(sessionOptions)
      expect(result).toEqual({ sessionId: 'vs_2', url: 'https://x', expiresAt: 1234 })
    })

    it('getVerificationStatus delegates with sessionId', async () => {
      const mockProvider = createMockProvider({
        getVerificationStatus: vi.fn().mockResolvedValue({ sessionId: 'vs_1', status: 'verified' }),
      })
      setProvider(mockProvider)

      const result = await getVerificationStatus('vs_1')

      expect(mockProvider.getVerificationStatus).toHaveBeenCalledWith('vs_1')
      expect(result.status).toBe('verified')
    })

    it('cancelVerificationSession delegates with sessionId', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const result = await cancelVerificationSession('vs_1')

      expect(mockProvider.cancelVerificationSession).toHaveBeenCalledWith('vs_1')
      expect(result.status).toBe('canceled')
    })

    it('processWebhook delegates with headers and body', async () => {
      const mockProvider = createMockProvider({
        processWebhook: vi
          .fn()
          .mockResolvedValue({ type: 'verification.requires_input', sessionId: 'vs_1' }),
      })
      setProvider(mockProvider)

      const headers = { 'stripe-signature': 't=1,v1=abc' }
      const body = '{"type":"identity.verification_session.requires_input"}'
      const result = await processWebhook(headers, body)

      expect(mockProvider.processWebhook).toHaveBeenCalledWith(headers, body)
      expect(result.type).toBe('verification.requires_input')
    })
  })
})
