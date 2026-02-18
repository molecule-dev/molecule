const { mockSign, mockVerify, mockDecode } = vi.hoisted(() => ({
  mockSign: vi.fn(),
  mockVerify: vi.fn(),
  mockDecode: vi.fn(),
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
    verify: mockVerify,
    decode: mockDecode,
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '../provider.js'

describe('@molecule/api-jwt-jsonwebtoken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider shape', () => {
    it('should have sign, verify, and decode methods', () => {
      expect(typeof provider.sign).toBe('function')
      expect(typeof provider.verify).toBe('function')
      expect(typeof provider.decode).toBe('function')
    })
  })

  describe('sign', () => {
    it('should delegate to jsonwebtoken.sign with payload, key, and options', () => {
      mockSign.mockReturnValue('signed-token')

      const result = provider.sign({ sub: 'user-123' }, { expiresIn: '1h' }, 'private-key')

      expect(mockSign).toHaveBeenCalledWith({ sub: 'user-123' }, 'private-key', { expiresIn: '1h' })
      expect(result).toBe('signed-token')
    })

    it('should use empty string when no key is provided', () => {
      mockSign.mockReturnValue('token')

      provider.sign({ sub: '123' })

      expect(mockSign).toHaveBeenCalledWith({ sub: '123' }, '', undefined)
    })

    it('should pass undefined options when not provided', () => {
      mockSign.mockReturnValue('token')

      provider.sign({ sub: '123' }, undefined, 'key')

      expect(mockSign).toHaveBeenCalledWith({ sub: '123' }, 'key', undefined)
    })

    it('should propagate errors from jsonwebtoken', () => {
      mockSign.mockImplementation(() => {
        throw new Error('sign error')
      })

      expect(() => provider.sign({ sub: '123' }, undefined, 'key')).toThrow('sign error')
    })
  })

  describe('verify', () => {
    it('should delegate to jsonwebtoken.verify with token, key, and options', () => {
      const payload = { sub: 'user-123', iat: 1234567890 }
      mockVerify.mockReturnValue(payload)

      const result = provider.verify('token-string', { algorithms: ['RS256'] }, 'public-key')

      expect(mockVerify).toHaveBeenCalledWith('token-string', 'public-key', {
        algorithms: ['RS256'],
      })
      expect(result).toEqual(payload)
    })

    it('should use empty string when no key is provided', () => {
      mockVerify.mockReturnValue({ sub: '123' })

      provider.verify('token')

      expect(mockVerify).toHaveBeenCalledWith('token', '', undefined)
    })

    it('should propagate verification errors', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      expect(() => provider.verify('expired-token', undefined, 'key')).toThrow('jwt expired')
    })

    it('should return string payload for unsigned tokens', () => {
      mockVerify.mockReturnValue('raw-string-payload')

      const result = provider.verify('token', undefined, 'key')

      expect(result).toBe('raw-string-payload')
    })
  })

  describe('decode', () => {
    it('should delegate to jsonwebtoken.decode', () => {
      const payload = { sub: 'user-123', exp: 9999999999 }
      mockDecode.mockReturnValue(payload)

      const result = provider.decode('token-string')

      expect(mockDecode).toHaveBeenCalledWith('token-string', undefined)
      expect(result).toEqual(payload)
    })

    it('should return null for invalid tokens', () => {
      mockDecode.mockReturnValue(null)

      const result = provider.decode('invalid-token')

      expect(result).toBeNull()
    })

    it('should pass decode options', () => {
      mockDecode.mockReturnValue({ sub: '123' })

      provider.decode('token', { complete: true })

      expect(mockDecode).toHaveBeenCalledWith('token', { complete: true })
    })
  })
})
