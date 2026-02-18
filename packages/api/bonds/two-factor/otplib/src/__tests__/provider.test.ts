const { mockGenerateSecret, mockGenerateURI, mockVerifySync, mockToDataURL } = vi.hoisted(() => ({
  mockGenerateSecret: vi.fn(),
  mockGenerateURI: vi.fn(),
  mockVerifySync: vi.fn(),
  mockToDataURL: vi.fn(),
}))

vi.mock('otplib', () => ({
  generateSecret: mockGenerateSecret,
  generateURI: mockGenerateURI,
  verifySync: mockVerifySync,
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: mockToDataURL,
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '../provider.js'

describe('@molecule/api-two-factor-otplib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider shape', () => {
    it('should have generateSecret, getUrls, and verify methods', () => {
      expect(typeof provider.generateSecret).toBe('function')
      expect(typeof provider.getUrls).toBe('function')
      expect(typeof provider.verify).toBe('function')
    })
  })

  describe('generateSecret', () => {
    it('should delegate to otplib generateSecret', () => {
      mockGenerateSecret.mockReturnValue('JBSWY3DPEHPK3PXP')

      const result = provider.generateSecret()

      expect(mockGenerateSecret).toHaveBeenCalled()
      expect(result).toBe('JBSWY3DPEHPK3PXP')
    })
  })

  describe('getUrls', () => {
    it('should generate keyUrl and QRImageUrl', async () => {
      mockGenerateURI.mockReturnValue(
        'otpauth://totp/MyApp:user@example.com?secret=ABC&issuer=MyApp',
      )
      mockToDataURL.mockResolvedValue('data:image/png;base64,QRcodedata')

      const result = await provider.getUrls({
        username: 'user@example.com',
        service: 'MyApp',
        secret: 'ABC',
      })

      expect(mockGenerateURI).toHaveBeenCalledWith({
        issuer: 'MyApp',
        label: 'user@example.com',
        secret: 'ABC',
      })
      expect(mockToDataURL).toHaveBeenCalledWith(
        'otpauth://totp/MyApp:user@example.com?secret=ABC&issuer=MyApp',
      )
      expect(result.keyUrl).toBe('otpauth://totp/MyApp:user@example.com?secret=ABC&issuer=MyApp')
      expect(result.QRImageUrl).toBe('data:image/png;base64,QRcodedata')
    })

    it('should propagate QR code generation errors', async () => {
      mockGenerateURI.mockReturnValue('otpauth://totp/test')
      mockToDataURL.mockRejectedValue(new Error('QR generation failed'))

      await expect(
        provider.getUrls({ username: 'user', service: 'app', secret: 'secret' }),
      ).rejects.toThrow('QR generation failed')
    })
  })

  describe('verify', () => {
    it('should return true for valid token', async () => {
      mockVerifySync.mockReturnValue({ valid: true })

      const result = await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '123456' })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
      })
      expect(result).toBe(true)
    })

    it('should return false for invalid token', async () => {
      mockVerifySync.mockReturnValue({ valid: false })

      const result = await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '000000' })

      expect(result).toBe(false)
    })
  })
})
