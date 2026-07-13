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

      // Default tolerance [60, 30]: a code stays valid ~60–90s (slow human/agent flows) plus
      // one future step of clock skew — the old past-only [30, 0] expired codes mid-flow.
      // afterTimeStep is OMITTED when the caller has no prior step — otplib 13
      // throws AfterTimeStepNotIntegerError on any non-integer value.
      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [60, 30],
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
        epochTolerance: [60, 30],
      })
      expect(result).toEqual({ valid: true, timeStep: 57600001 })
    })

    it('REGRESSION: a NEGATIVE afterTimeStep (-1 column sentinel) must not reach otplib', async () => {
      // otplib 13 throws AfterTimeStepNegativeError on -1; a schema defaulting
      // last_time_step to -1 instead of NULL means "no code consumed yet" —
      // verify without the replay guard, exactly like NULL/undefined.
      mockVerifySync.mockReturnValue({ valid: true, timeStep: 57600002, delta: 0, epoch: 0 })

      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        afterTimeStep: -1,
      })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [60, 30],
      })
      expect(result).toEqual({ valid: true, timeStep: 57600002 })
    })

    it('strips authenticator-app grouping whitespace ("123 456 ") before calling otplib', async () => {
      // otplib 13 throws TokenLengthError on the raw 8-char paste — the provider
      // normalizes so a verbatim paste from the authenticator app verifies.
      mockVerifySync.mockReturnValue({ valid: true, timeStep: 57600003, delta: 0, epoch: 0 })

      const result = await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '123 456 ' })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [60, 30],
      })
      expect(result).toEqual({ valid: true, timeStep: 57600003 })
    })

    it('answers { valid: false, reason: "format" } for a malformed token WITHOUT calling otplib', async () => {
      // otplib 13 throws TokenLengthError/TokenFormatError on these — an unhandled
      // user typo would 500 the route. The labeled rejection lets callers tell
      // "re-enter the 6-digit code" apart from "wrong/expired" and "already used".
      for (const token of ['12345', 'abcdef', '']) {
        expect(await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token })).toEqual({
          valid: false,
          reason: 'format',
        })
      }
      expect(mockVerifySync).not.toHaveBeenCalled()
    })

    it('should return { valid: false } for invalid token', async () => {
      mockVerifySync.mockReturnValue({ valid: false })

      const result = await provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '000000' })

      expect(result).toEqual({ valid: false })
    })

    it('REGRESSION (P2F-03): forwards afterTimeStep so an already-consumed code is rejected', async () => {
      // otplib rejects any token whose timeStep <= afterTimeStep. The provider
      // MUST forward the caller's last-consumed step — before the fix it passed
      // neither the step nor a tolerance, so a code was replayable in-window.
      mockVerifySync.mockReturnValue({ valid: false })

      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        afterTimeStep: 57600000,
      })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [60, 30],
        afterTimeStep: 57600000,
      })
      // The token is wrong/expired outright (fails even without the replay guard —
      // the mock returns false for the diagnostic re-check too): no reason attached.
      expect(result).toEqual({ valid: false })
    })

    it('says WHY when the only failure is the replay guard (reason: "replay")', async () => {
      // An indistinguishable valid:false sent a debugging executor down a "the library is
      // broken" spiral when the correct action was "wait for the next code". When the token
      // verifies fine WITHOUT afterTimeStep, the failure is single-use protection — say so.
      mockVerifySync
        .mockReturnValueOnce({ valid: false }) // with the replay guard → rejected
        .mockReturnValueOnce({ valid: true, timeStep: 57600000, delta: 0, epoch: 0 }) // without → fine

      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        afterTimeStep: 57600000,
      })

      expect(result).toEqual({ valid: false, reason: 'replay' })
      // The diagnostic re-check runs WITHOUT the replay guard, same tolerance.
      expect(mockVerifySync).toHaveBeenLastCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [60, 30],
      })
    })

    it('REGRESSION: an unreachable afterTimeStep (clock rollback) resolves reason:"replay" instead of throwing', async () => {
      // Raw otplib 13 throws AfterTimeStepRangeExceededError when afterTimeStep sits
      // further ahead than the current time step plus the tolerance window can reach —
      // the shape produced by a server clock rollback after a prior successful verify.
      // The provider must never pass a cursor that would trigger this throw; it should
      // fall back to verifying without the cursor and label the result 'replay'.
      mockVerifySync.mockReturnValue({ valid: true, timeStep: 1, delta: 0, epoch: 0 })

      const farFutureCursor = Math.floor(Date.now() / 1000 / 30) + 1_000_000
      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        afterTimeStep: farFutureCursor,
      })

      // Called WITHOUT afterTimeStep — passing the unreachable cursor would throw.
      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [60, 30],
      })
      expect(mockVerifySync).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ valid: false, reason: 'replay' })
    })

    it('REGRESSION: an unreachable afterTimeStep with a genuinely wrong code is a plain rejection', async () => {
      mockVerifySync.mockReturnValue({ valid: false })

      const farFutureCursor = Math.floor(Date.now() / 1000 / 30) + 1_000_000
      const result = await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '000000',
        afterTimeStep: farFutureCursor,
      })

      expect(result).toEqual({ valid: false })
    })

    it('REGRESSION: a corrupted (non-base32) stored secret throws a labeled error with cause', async () => {
      // otplib/scure throw a raw, generically-named Error for a malformed base32 secret —
      // server-side data corruption, correctly re-thrown (never masked as an invalid
      // code), but rewrapped so the message names the side (secret, not token) and the
      // fix (re-run setup) instead of leaking an opaque scure stack.
      const rawError = new Error('Invalid Base32 string: Unknown letter: "0". Allowed: ABC...')
      mockVerifySync.mockImplementation(() => {
        throw rawError
      })

      await expect(
        provider.verify({ secret: 'not-valid-base32!!!', token: '123456' }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('re-run setup'),
        cause: rawError,
      })
    })

    it('REGRESSION: an otplib Secret*Error (missing/too-short secret) is also rewrapped', async () => {
      const rawError = new Error('Secret must be at least 16 bytes (128 bits), got 2 bytes')
      rawError.name = 'SecretTooShortError'
      mockVerifySync.mockImplementation(() => {
        throw rawError
      })

      await expect(provider.verify({ secret: 'AAAA', token: '123456' })).rejects.toMatchObject({
        message: expect.stringContaining('re-run setup'),
        cause: rawError,
      })
    })

    it('does NOT rewrap unrelated otplib errors (e.g. a genuine library bug)', async () => {
      const rawError = new Error('Something else entirely broke')
      mockVerifySync.mockImplementation(() => {
        throw rawError
      })

      await expect(provider.verify({ secret: 'JBSWY3DPEHPK3PXP', token: '123456' })).rejects.toBe(
        rawError,
      )
    })

    it('honors a caller-supplied epochTolerance override (stricter threat models)', async () => {
      mockVerifySync.mockReturnValue({ valid: true, timeStep: 57600002, delta: 0, epoch: 0 })

      await provider.verify({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [30, 0],
      })

      expect(mockVerifySync).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
        epochTolerance: [30, 0],
      })
    })
  })
})
