vi.mock('@molecule/api-bond', () => {
  let store: Record<string, unknown> = {}
  return {
    bond: vi.fn((type: string, provider: unknown) => {
      store[type] = provider
    }),
    expectBond: vi.fn(),
    getLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
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

// Stub out keys.ts entirely — its top-level side effects (auto-generate keys to
// disk) and crypto reads aren't relevant to provider delegation behavior.
vi.mock('../keys.js', () => ({
  JWT_PRIVATE_KEY: 'STUB_PRIVATE_KEY',
  JWT_PUBLIC_KEY: 'STUB_PUBLIC_KEY',
  generateKeyPairSync: vi.fn(),
  writeKeys: vi.fn(),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { JwtPayload, JwtProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let sign: typeof ProviderModule.sign
let verify: typeof ProviderModule.verify
let decode: typeof ProviderModule.decode

const createMockProvider = (overrides: Partial<JwtProvider> = {}): JwtProvider => ({
  sign: vi.fn().mockReturnValue('jwt.token.string'),
  verify: vi.fn().mockReturnValue({ sub: 'user-1', iat: 0, exp: 0 } satisfies JwtPayload),
  decode: vi.fn().mockReturnValue({ sub: 'user-1' } satisfies JwtPayload),
  ...overrides,
})

describe('jwt provider', () => {
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
    sign = providerModule.sign
    verify = providerModule.verify
    decode = providerModule.decode
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when nothing is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(/jwt/)
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

  describe('sign', () => {
    it('throws when no provider is bonded', () => {
      expect(() => sign({ sub: 'u' })).toThrow(/jwt/)
    })

    it('delegates to provider with payload, default algorithm + expiresIn, default private key', () => {
      const provider = createMockProvider()
      setProvider(provider)

      const result = sign({ sub: 'user-1' })

      expect(provider.sign).toHaveBeenCalledTimes(1)
      const [payload, opts, key] = (provider.sign as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(payload).toEqual({ sub: 'user-1' })
      expect(opts).toMatchObject({ algorithm: 'RS256', expiresIn: 604_800 })
      expect(key).toBe('STUB_PRIVATE_KEY')
      expect(result).toBe('jwt.token.string')
    })

    it('passes through caller-supplied algorithm + expiresIn + extra options', () => {
      const provider = createMockProvider()
      setProvider(provider)

      sign({ sub: 'u' }, { algorithm: 'HS256', expiresIn: 60, issuer: 'iss', subject: 'sub' })

      const [, opts] = (provider.sign as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(opts).toEqual({
        algorithm: 'HS256',
        expiresIn: 60,
        issuer: 'iss',
        subject: 'sub',
      })
    })

    it('forwards the caller-supplied private key', () => {
      const provider = createMockProvider()
      setProvider(provider)

      sign({}, {}, 'custom-private-key')

      const [, , key] = (provider.sign as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(key).toBe('custom-private-key')
    })

    it('forwards a Buffer private key unchanged', () => {
      const provider = createMockProvider()
      setProvider(provider)
      const buf = Buffer.from('binary-key')

      sign({}, {}, buf)

      const [, , key] = (provider.sign as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(key).toBe(buf)
    })
  })

  describe('verify', () => {
    it('throws when no provider is bonded', () => {
      expect(() => verify('token')).toThrow(/jwt/)
    })

    it('delegates with default algorithms [RS256] and default public key', () => {
      const provider = createMockProvider()
      setProvider(provider)

      const result = verify('the.jwt.string')

      expect(provider.verify).toHaveBeenCalledTimes(1)
      const [token, opts, key] = (provider.verify as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(token).toBe('the.jwt.string')
      expect(opts).toMatchObject({ algorithms: ['RS256'] })
      expect(key).toBe('STUB_PUBLIC_KEY')
      expect(result).toMatchObject({ sub: 'user-1' })
    })

    it('passes through caller-supplied algorithms + extra options', () => {
      const provider = createMockProvider()
      setProvider(provider)

      verify('tok', {
        algorithms: ['HS256', 'HS384'],
        audience: 'aud',
        clockTolerance: 5,
        ignoreExpiration: true,
      })

      const [, opts] = (provider.verify as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(opts).toEqual({
        algorithms: ['HS256', 'HS384'],
        audience: 'aud',
        clockTolerance: 5,
        ignoreExpiration: true,
      })
    })

    it('forwards the caller-supplied public key (string or Buffer)', () => {
      const provider = createMockProvider()
      setProvider(provider)
      const buf = Buffer.from('pub')

      verify('tok', {}, 'custom-pub-key')
      verify('tok', {}, buf)

      const calls = (provider.verify as ReturnType<typeof vi.fn>).mock.calls
      expect(calls[0]![2]).toBe('custom-pub-key')
      expect(calls[1]![2]).toBe(buf)
    })

    it('propagates provider verify-failure throws', () => {
      const provider = createMockProvider({
        verify: vi.fn().mockImplementation(() => {
          throw new Error('jwt expired')
        }),
      })
      setProvider(provider)

      expect(() => verify('expired.tok')).toThrow('jwt expired')
    })
  })

  describe('decode', () => {
    it('throws when no provider is bonded', () => {
      expect(() => decode('token')).toThrow(/jwt/)
    })

    it('delegates to provider with the token + options', () => {
      const provider = createMockProvider()
      setProvider(provider)

      const result = decode('tok', { complete: true })

      expect(provider.decode).toHaveBeenCalledWith('tok', { complete: true })
      expect(result).toMatchObject({ sub: 'user-1' })
    })

    it('returns null when provider returns null (unparseable token)', () => {
      const provider = createMockProvider({
        decode: vi.fn().mockReturnValue(null),
      })
      setProvider(provider)

      expect(decode('not-a-jwt')).toBeNull()
    })

    it('omits the options argument when caller does not pass one', () => {
      const provider = createMockProvider()
      setProvider(provider)

      decode('tok')

      expect(provider.decode).toHaveBeenCalledWith('tok', undefined)
    })
  })

  describe('exported config constants', () => {
    it('JWT_ALGORITHM defaults to RS256', async () => {
      const mod = await import('../provider.js')
      expect(mod.JWT_ALGORITHM).toBe('RS256')
    })

    it('JWT_EXPIRES_TIME defaults to 1 week (604800)', async () => {
      const mod = await import('../provider.js')
      expect(mod.JWT_EXPIRES_TIME).toBe(60 * 60 * 24 * 7)
    })

    it('JWT_REFRESH_TIME defaults to 1 hour (3600)', async () => {
      const mod = await import('../provider.js')
      expect(mod.JWT_REFRESH_TIME).toBe(60 * 60)
    })
  })
})
