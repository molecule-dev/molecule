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
    it('should return valid + the matched timeStep for a valid token', async () => {
      mockVerifySync.mockReturnValue({ valid: true, timeStep: 57600000, delta: 0, epoch: 0 })

      const result = await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '123456' })

      // Past-only tolerance [30, 0] halves the acceptance window (no future step);
      // afterTimeStep is OMITTED when the caller has no prior step — otplib 13
      // throws AfterTimeStepNotIntegerError on any non-integer value.
      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [30, 0],
      })
      // The matched time step is surfaced so the caller can persist it for replay protection.
      expect(result).toEqual({ valid: true, timeStep: 57600000 })
    })

    it('REGRESSION: a NULL afterTimeStep (fresh 2FA setup row) must not reach otplib', async () => {
      // First-time setup reads lastTwoFactorTimeStep as NULL from the database;
      // otplib 13 throws AfterTimeStepNotIntegerError on null, which made
      // enabling 2FA impossible for every user (caught by the e2e capability
      // matrix). Non-integer values are dropped at this boundary.
      mockVerifySync.mockReturnValue({ valid: true, timeStep: 57600001, delta: 0, epoch: 0 })

      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        afterTimeStep: null as unknown as number,
      })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [30, 0],
      })
      expect(result).toEqual({ valid: true, timeStep: 57600001 })
    })

    it('should return { valid: false } for invalid token', async () => {
      mockVerifySync.mockReturnValue({ valid: false })

      const result = await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '000000' })

      expect(result).toEqual({ valid: false })
    })

    it('REGRESSION (P2F-03): forwards afterTimeStep so an already-consumed code is rejected', async () => {
      // otplib rejects any token whose timeStep <= afterTimeStep. The provider
      // MUST forward the caller's last-consumed step (and use past-only tolerance)
      // — before the fix it passed neither, so a code was replayable in-window.
      mockVerifySync.mockReturnValue({ valid: false })

      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        afterTimeStep: 57600000,
      })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [30, 0],
        afterTimeStep: 57600000,
      })
      expect(result).toEqual({ valid: false })
    })
  })
})
