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
import type {
  TwoFactorProvider,
  TwoFactorUrlParams,
  TwoFactorUrls,
  TwoFactorVerifyParams,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let generateSecret: typeof ProviderModule.generateSecret
let getUrls: typeof ProviderModule.getUrls
let verify: typeof ProviderModule.verify

const urls: TwoFactorUrls = {
  keyUrl: 'otpauth://totp/Service:user?secret=ABCDEF&issuer=Service',
  QRImageUrl: 'data:image/png;base64,QR_PLACEHOLDER',
}

const createMockProvider = (overrides: Partial<TwoFactorProvider> = {}): TwoFactorProvider => ({
  generateSecret: vi.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
  getUrls: vi.fn().mockResolvedValue(urls),
  verify: vi.fn().mockResolvedValue({ valid: true, timeStep: 57600000 }),
  ...overrides,
})

describe('two-factor provider', () => {
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
    generateSecret = providerModule.generateSecret
    getUrls = providerModule.getUrls
    verify = providerModule.verify
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when nothing is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(/two-factor/)
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

  describe('generateSecret', () => {
    it('throws when no provider is bonded', () => {
      expect(() => generateSecret()).toThrow(/two-factor/)
    })

    it('returns the value from the bonded provider', () => {
      const provider = createMockProvider({
        generateSecret: vi.fn().mockReturnValue('CUSTOMSECRETABCDEF'),
      })
      setProvider(provider)

      expect(generateSecret()).toBe('CUSTOMSECRETABCDEF')
      expect(provider.generateSecret).toHaveBeenCalledTimes(1)
    })

    it('is synchronous (no Promise)', () => {
      setProvider(createMockProvider())
      const out = generateSecret()
      expect(typeof out).toBe('string')
      expect((out as unknown) instanceof Promise).toBe(false)
    })
  })

  describe('getUrls', () => {
    const params: TwoFactorUrlParams = {
      username: 'user@example.com',
      service: 'Acme',
      secret: 'JBSWY3DPEHPK3PXP',
    }

    it('throws when no provider is bonded', async () => {
      await expect(async () => getUrls(params)).rejects.toThrow(/two-factor/)
    })

    it('delegates with the same params reference', async () => {
      const provider = createMockProvider()
      setProvider(provider)

      const result = await getUrls(params)

      expect(provider.getUrls).toHaveBeenCalledWith(params)
      expect(result).toEqual(urls)
    })

    it('passes provider rejection through unchanged', async () => {
      const provider = createMockProvider({
        getUrls: vi.fn().mockRejectedValue(new Error('qr failed')),
      })
      setProvider(provider)

      await expect(getUrls(params)).rejects.toThrow('qr failed')
    })
  })

  describe('verify', () => {
    const params: TwoFactorVerifyParams = {
      secret: 'JBSWY3DPEHPK3PXP',
      token: '123456',
    }

    it('throws when no provider is bonded', async () => {
      await expect(async () => verify(params)).rejects.toThrow(/two-factor/)
    })

    it('delegates and returns the result (valid + timeStep) on match', async () => {
      const provider = createMockProvider()
      setProvider(provider)

      expect(await verify(params)).toEqual({ valid: true, timeStep: 57600000 })
      expect(provider.verify).toHaveBeenCalledWith(params)
    })

    it('returns { valid: false } when provider rejects the token', async () => {
      const provider = createMockProvider({
        verify: vi.fn().mockResolvedValue({ valid: false }),
      })
      setProvider(provider)

      expect(await verify({ secret: 's', token: '000000' })).toEqual({ valid: false })
    })

    it('forwards afterTimeStep (replay protection) to the provider', async () => {
      const provider = createMockProvider()
      setProvider(provider)

      await verify({ secret: 's', token: '123456', afterTimeStep: 57600000 })
      expect(provider.verify).toHaveBeenCalledWith({
        secret: 's',
        token: '123456',
        afterTimeStep: 57600000,
      })
    })

    it('passes provider rejection through unchanged', async () => {
      const provider = createMockProvider({
        verify: vi.fn().mockRejectedValue(new Error('verify failed')),
      })
      setProvider(provider)

      await expect(verify(params)).rejects.toThrow('verify failed')
    })
  })
})
