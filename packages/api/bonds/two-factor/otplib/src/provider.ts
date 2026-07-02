/**
 * Two-factor authentication provider implementation using otplib.
 *
 * @see https://www.npmjs.com/package/otplib
 * @see https://www.npmjs.com/package/qrcode
 *
 * @module
 */

import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'

import type {
  TwoFactorProvider,
  TwoFactorUrlParams,
  TwoFactorUrls,
  TwoFactorVerifyParams,
  TwoFactorVerifyResult,
} from '@molecule/api-two-factor'

/**
 * Two-factor authentication provider backed by otplib and qrcode.
 */
export const provider: TwoFactorProvider = {
  generateSecret(): string {
    return generateSecret()
  },

  async getUrls(params: TwoFactorUrlParams): Promise<TwoFactorUrls> {
    const { username, service, secret } = params
    const keyUrl = generateURI({ issuer: service, label: username, secret })
    const QRImageUrl = await QRCode.toDataURL(keyUrl)
    return { keyUrl, QRImageUrl }
  },

  async verify(params: TwoFactorVerifyParams): Promise<TwoFactorVerifyResult> {
    const { secret, token, afterTimeStep } = params
    // Past-only tolerance `[past, future] = [30, 0]`: accept up to 30s of client
    // clock skew in the PAST but never a future step. Per RFC 6238 this halves
    // the acceptance window vs. a symmetric ±30s while preserving skew tolerance.
    // `afterTimeStep` makes otplib reject any token whose time step is
    // `<= afterTimeStep`, enforcing single-use of a code (replay protection).
    // Pass it ONLY when it is a real integer: otplib 13 throws
    // AfterTimeStepNotIntegerError on any other value, and a first-time setup
    // reads `lastTwoFactorTimeStep` as NULL from the database — which made
    // enabling 2FA impossible for every user (caught by the e2e capability
    // matrix; unit tests passed `undefined`, which otplib tolerates).
    const result = verifySync({
      secret,
      token,
      epochTolerance: [30, 0],
      ...(Number.isInteger(afterTimeStep) ? { afterTimeStep } : {}),
    })
    if (!result.valid) {
      return { valid: false }
    }
    // Surface the matched TOTP time step so the caller can persist it and reject
    // reuse. (`verifySync` returns a TOTP|HOTP union; only the TOTP result carries
    // `timeStep` — narrow rather than assume, since this provider is TOTP-only.)
    return { valid: true, timeStep: 'timeStep' in result ? result.timeStep : undefined }
  },
}
