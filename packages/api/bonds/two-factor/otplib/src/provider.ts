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
    const { secret, token, afterTimeStep, epochTolerance } = params
    // Tolerance `[past, future] = [60, 30]` by default: a code stays acceptable for
    // ~60–90s after it was shown, and one future step covers a fast client clock.
    // The old past-only `[30, 0]` was security-tidy but a live trap: any flow slower
    // than ~30s (a human typing a code from their phone, an agent's generate → fill →
    // click round-trips) saw legitimately generated codes "mysteriously" rejected — a
    // real executor concluded the LIBRARY was broken and bypassed this package.
    // Callers with a stricter threat model pass their own `epochTolerance`.
    //
    // `afterTimeStep` makes otplib reject any token whose time step is
    // `<= afterTimeStep`, enforcing single-use of a code (replay protection).
    // Pass it ONLY when it is a real integer: otplib 13 throws
    // AfterTimeStepNotIntegerError on any other value, and a first-time setup
    // reads `lastTwoFactorTimeStep` as NULL from the database — which made
    // enabling 2FA impossible for every user (caught by the e2e capability
    // matrix; unit tests passed `undefined`, which otplib tolerates).
    const tolerance = epochTolerance ?? ([60, 30] as [number, number])
    const result = verifySync({
      secret,
      token,
      epochTolerance: tolerance,
      ...(Number.isInteger(afterTimeStep) ? { afterTimeStep } : {}),
    })
    if (!result.valid) {
      // Distinguish "already used" from "wrong/expired": when the ONLY reason the token
      // failed is the replay guard (it verifies fine without `afterTimeStep`), say so.
      // An indistinguishable `valid:false` sent a debugging executor down a "the library
      // is broken" spiral when the correct action was "wait for the next code".
      if (Number.isInteger(afterTimeStep)) {
        const withoutReplayGuard = verifySync({ secret, token, epochTolerance: tolerance })
        if (withoutReplayGuard.valid) return { valid: false, reason: 'replay' }
      }
      return { valid: false }
    }
    // Surface the matched TOTP time step so the caller can persist it and reject
    // reuse. (`verifySync` returns a TOTP|HOTP union; only the TOTP result carries
    // `timeStep` — narrow rather than assume, since this provider is TOTP-only.)
    return { valid: true, timeStep: 'timeStep' in result ? result.timeStep : undefined }
  },
}
