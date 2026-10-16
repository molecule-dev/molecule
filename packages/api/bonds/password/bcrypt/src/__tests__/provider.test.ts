const { nativeHash, nativeCompare, jsHash, jsCompare } = vi.hoisted(() => ({
  nativeHash: vi.fn(),
  nativeCompare: vi.fn(),
  jsHash: vi.fn(),
  jsCompare: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: jsHash, compare: jsCompare },
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PasswordProvider } from '@molecule/api-password'

import { provider as realProvider } from '../provider.js'

/**
 * Loads the provider with `bcrypt` mocked by `factory`, on a fresh module
 * registry so the module-level native-load cache starts empty.
 *
 * @param factory - The mock factory for the native `bcrypt` module.
 * @returns The provider under test.
 */
const providerWithNative = async (factory: () => unknown): Promise<PasswordProvider> => {
  vi.resetModules()
  vi.doMock('bcrypt', factory as () => Record<string, unknown>)
  return (await import('../provider.js')).provider
}

/**
 * Loads the provider with the native import REJECTING, the way a platform with
 * no matching prebuild fails.
 *
 * @returns The provider under test.
 */
const providerWithNativeUnavailable = async (): Promise<PasswordProvider> => {
  vi.resetModules()
  vi.doMock('bcrypt', () => {
    throw new Error('No native build was found for platform=somewhere arch=mystery')
  })
  return (await import('../provider.js')).provider
}

describe('@molecule/api-password-bcrypt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.doUnmock('bcrypt')
    delete process.env.SALT_ROUNDS
  })

  afterEach(() => {
    vi.doUnmock('bcrypt')
    delete process.env.SALT_ROUNDS
    vi.restoreAllMocks()
  })

  describe('provider shape', () => {
    it('should have hash and compare methods', () => {
      expect(typeof realProvider.hash).toBe('function')
      expect(typeof realProvider.compare).toBe('function')
    })
  })

  describe('with the native bcrypt module available', () => {
    let provider: PasswordProvider

    beforeEach(async () => {
      provider = await providerWithNative(() => ({
        default: { hash: nativeHash, compare: nativeCompare },
        hash: nativeHash,
        compare: nativeCompare,
      }))
    })

    it('should delegate hashing to the native module, never to bcryptjs', async () => {
      nativeHash.mockResolvedValue('hashed-password')

      const result = await provider.hash('my-password')

      expect(nativeHash).toHaveBeenCalledWith('my-password', 12)
      expect(jsHash).not.toHaveBeenCalled()
      expect(result).toBe('hashed-password')
    })

    it('should delegate comparison to the native module, never to bcryptjs', async () => {
      nativeCompare.mockResolvedValue(true)

      const result = await provider.compare('password', '$2a$10$hash')

      expect(nativeCompare).toHaveBeenCalledWith('password', '$2a$10$hash')
      expect(jsCompare).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should use explicit salt rounds when provided', async () => {
      nativeHash.mockResolvedValue('hashed')

      await provider.hash('password', 13)

      expect(nativeHash).toHaveBeenCalledWith('password', 13)
    })

    it('should use SALT_ROUNDS env var when set', async () => {
      process.env.SALT_ROUNDS = '14'
      nativeHash.mockResolvedValue('hashed')

      await provider.hash('password')

      expect(nativeHash).toHaveBeenCalledWith('password', 14)
    })

    it('should fall back to 12 when SALT_ROUNDS is invalid', async () => {
      process.env.SALT_ROUNDS = 'not-a-number'
      nativeHash.mockResolvedValue('hashed')

      await provider.hash('password')

      expect(nativeHash).toHaveBeenCalledWith('password', 12)
    })

    it('should propagate errors from the native module', async () => {
      nativeHash.mockRejectedValue(new Error('bcrypt failure'))

      await expect(provider.hash('password')).rejects.toThrow('bcrypt failure')
    })

    it('should load the native module once no matter how many calls are made', async () => {
      nativeHash.mockResolvedValue('hashed')
      nativeCompare.mockResolvedValue(false)

      await Promise.all([provider.hash('a'), provider.hash('b'), provider.compare('c', 'd')])

      // Three concurrent calls, one load: the cached promise is what keeps a
      // per-request dynamic import from re-resolving the addon every time.
      expect(nativeHash).toHaveBeenCalledTimes(2)
      expect(nativeCompare).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the native module cannot be loaded', () => {
    let provider: PasswordProvider
    let warn: ReturnType<typeof vi.spyOn>

    beforeEach(async () => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      provider = await providerWithNativeUnavailable()
    })

    it('should still hash, via bcryptjs', async () => {
      jsHash.mockResolvedValue('$2b$12$from-bcryptjs')

      const result = await provider.hash('my-password')

      expect(jsHash).toHaveBeenCalledWith('my-password', 12)
      expect(result).toBe('$2b$12$from-bcryptjs')
    })

    it('should still compare, via bcryptjs', async () => {
      jsCompare.mockResolvedValue(true)

      await expect(provider.compare('password', '$2b$12$hash')).resolves.toBe(true)

      expect(jsCompare).toHaveBeenCalledWith('password', '$2b$12$hash')
    })

    it('should honour the same cost rules on the fallback path', async () => {
      process.env.SALT_ROUNDS = '4'
      jsHash.mockResolvedValue('hashed')

      await provider.hash('password')

      expect(jsHash).toHaveBeenCalledWith('password', 10)
    })

    it('should say so on console.warn, exactly once, naming the fallback', async () => {
      jsHash.mockResolvedValue('hashed')

      await provider.hash('a')
      await provider.hash('b')

      expect(warn).toHaveBeenCalledTimes(1)
      const [message] = warn.mock.calls[0] as [string]
      expect(message).toContain('fell back to bcryptjs')
      // The CAUSE is interpolated into the message (non-empty, and followed by
      // the consequence sentence). The error OBJECT is deliberately not passed,
      // so a Node-internals stack does not flood the logs — see provider.ts.
      expect(message).toMatch(/fell back to bcryptjs \(pure JS\): .+\. Hashes are identical/)
      expect(warn.mock.calls[0]).toHaveLength(1)
    })
  })
})
