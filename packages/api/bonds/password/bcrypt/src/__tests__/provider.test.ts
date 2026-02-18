const { mockHash, mockCompare } = vi.hoisted(() => ({
  mockHash: vi.fn(),
  mockCompare: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '../provider.js'

describe('@molecule/api-password-bcrypt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SALT_ROUNDS
  })

  afterEach(() => {
    delete process.env.SALT_ROUNDS
  })

  describe('provider shape', () => {
    it('should have hash and compare methods', () => {
      expect(typeof provider.hash).toBe('function')
      expect(typeof provider.compare).toBe('function')
    })
  })

  describe('hash', () => {
    it('should delegate to bcrypt.hash with default salt rounds', async () => {
      mockHash.mockResolvedValue('hashed-password')

      const result = await provider.hash('my-password')

      expect(mockHash).toHaveBeenCalledWith('my-password', 10)
      expect(result).toBe('hashed-password')
    })

    it('should use explicit salt rounds when provided', async () => {
      mockHash.mockResolvedValue('hashed')

      await provider.hash('password', 12)

      expect(mockHash).toHaveBeenCalledWith('password', 12)
    })

    it('should use SALT_ROUNDS env var when set', async () => {
      process.env.SALT_ROUNDS = '14'
      mockHash.mockResolvedValue('hashed')

      await provider.hash('password')

      expect(mockHash).toHaveBeenCalledWith('password', 14)
    })

    it('should fall back to 10 when SALT_ROUNDS is invalid', async () => {
      process.env.SALT_ROUNDS = 'not-a-number'
      mockHash.mockResolvedValue('hashed')

      await provider.hash('password')

      expect(mockHash).toHaveBeenCalledWith('password', 10)
    })

    it('should propagate errors from bcrypt', async () => {
      mockHash.mockRejectedValue(new Error('bcrypt failure'))

      await expect(provider.hash('password')).rejects.toThrow('bcrypt failure')
    })
  })

  describe('compare', () => {
    it('should delegate to bcrypt.compare', async () => {
      mockCompare.mockResolvedValue(true)

      const result = await provider.compare('password', '$2a$10$hash')

      expect(mockCompare).toHaveBeenCalledWith('password', '$2a$10$hash')
      expect(result).toBe(true)
    })

    it('should return false when passwords do not match', async () => {
      mockCompare.mockResolvedValue(false)

      const result = await provider.compare('wrong-password', '$2a$10$hash')

      expect(result).toBe(false)
    })

    it('should propagate errors from bcrypt', async () => {
      mockCompare.mockRejectedValue(new Error('compare failure'))

      await expect(provider.compare('password', 'hash')).rejects.toThrow('compare failure')
    })
  })
})
