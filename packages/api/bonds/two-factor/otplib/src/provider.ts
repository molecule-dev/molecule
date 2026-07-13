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
 * Recognizes a failure that means "the stored secret itself is bad" (missing,
 * too short/long, or not valid base32) as opposed to a token-side failure.
 * otplib's own `Secret*Error` classes already say "Secret" in their name, but
 * a malformed base32 STRING is decoded by an internal scure plugin that
 * throws a plain, generically-named `Error` (`name === 'Error'`) with no
 * otplib branding at all — the most ambiguous case, and the one the audit
 * flagged. Detecting it here lets `verify()` rewrap it with a message that
 * names the side (secret, not token) and the fix (re-run setup), instead of
 * leaking an opaque scure/otplib stack trace.
 */
const isSecretDecodeError = (error: unknown): error is Error =>
  error instanceof Error && (error.name.startsWith('Secret') || /base32/i.test(error.message))

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
    const { secret, afterTimeStep, epochTolerance } = params
    // Authenticator apps DISPLAY codes with grouping whitespace ("123 456") and users
    // paste them verbatim (often with a trailing space) — strip it rather than fail
    // the paste.
    const token = params.token.replace(/\s+/g, '')
    // otplib 13 THROWS (TokenLengthError / TokenFormatError) on any non-6-digit token,
    // so an ordinary user typo would crash the request with an opaque stack instead of
    // returning a rejection the route can turn into a 4xx "invalid code". Pre-validate
    // here and label the failure so callers can say "re-enter the 6-digit code" rather
    // than debug their wiring.
    if (!/^\d{6}$/.test(token)) {
      return { valid: false, reason: 'format' }
    }
    // Tolerance `[past, future] = [60, 30]` by default: a code stays acceptable for
    // ~60–90s after it was shown, and one future step covers a fast client clock.
    // The old past-only `[30, 0]` was security-tidy but a live trap: any flow slower
    // than ~30s (a human typing a code from their phone, an agent's generate → fill →
    // click round-trips) saw legitimately generated codes "mysteriously" rejected — a
    // real executor concluded the LIBRARY was broken and bypassed this package.
    // Callers with a stricter threat model pass their own `epochTolerance`.
    const tolerance = epochTolerance ?? ([60, 30] as [number, number])
    //
    // `afterTimeStep` makes otplib reject any token whose time step is
    // `<= afterTimeStep`, enforcing single-use of a code (replay protection).
    // Use it ONLY when it is a real non-negative integer:
    // - otplib 13 throws AfterTimeStepNotIntegerError on any non-integer, and a
    //   first-time setup reads `lastTwoFactorTimeStep` as NULL from the database —
    //   which made enabling 2FA impossible for every user (caught by the e2e
    //   capability matrix; unit tests passed `undefined`, which otplib tolerates).
    // - otplib 13 throws AfterTimeStepNegativeError on a `-1` "no previous step"
    //   column-default sentinel. Both non-values mean the same thing: no code has
    //   been consumed yet, so verify without the replay guard.
    const replayCursor: number | undefined =
      typeof afterTimeStep === 'number' && Number.isInteger(afterTimeStep) && afterTimeStep >= 0
        ? afterTimeStep
        : undefined
    // otplib 13 ALSO throws AfterTimeStepRangeExceededError when `afterTimeStep` sits
    // further in the future than the current time step plus the tolerance window can
    // reach — a guardrail against a nonsensical replay cursor. In practice this fires
    // when the SERVER clock moves BACKWARD (VM snapshot restore, NTP correction,
    // container clock drift) after a successful verify persisted `timeStep`: every
    // subsequent login for that user would otherwise 500 with an opaque otplib-internal
    // error until wall-clock time catches back up — reading like "the library is
    // broken" rather than "the clock rolled back". Detect the unreachable range
    // ourselves and never pass a cursor that would trigger the throw.
    //
    // The bound MUST be computed exactly as otplib does internally (@otplib/totp:
    // `maxCounter = floor((epochSeconds + futureToleranceSeconds - t0) / period)`),
    // NOT as `currentStep + ceil(futureTolerance / period)`. The two differ for any
    // tolerance that is not an exact multiple of the 30s period, because otplib's
    // bound depends on where "now" falls WITHIN the current step (futureTolerance 45
    // reaches currentStep+1 during the first 15s of a step but currentStep+2 during
    // the last 15s) — the ceil() formula overshoots there, passing a cursor otplib
    // itself rejects, which re-crashed exactly the way this guard exists to prevent.
    // Our epoch sample is taken marginally BEFORE otplib samples its own, so our
    // bound is always <= otplib's: a cursor we allow through can never make otplib
    // throw, and the rare same-second boundary case we conservatively classify as
    // unreachable still gets the graceful `reason: 'replay'` path below.
    const maxReachableStep = Math.floor((Math.floor(Date.now() / 1000) + tolerance[1]) / 30)
    const replayCursorUnreachable = replayCursor !== undefined && replayCursor > maxReachableStep
    const replayGuard =
      replayCursor !== undefined && !replayCursorUnreachable ? { afterTimeStep: replayCursor } : {}
    try {
      const result = verifySync({
        secret,
        token,
        epochTolerance: tolerance,
        ...replayGuard,
      })
      if (replayCursorUnreachable) {
        // No time step otplib could possibly match right now (bounded by
        // `maxReachableStep`) can be NEWER than the persisted `afterTimeStep` —
        // that is exactly the condition the replay guard exists to reject. Report it the
        // same way `reason: 'replay'` would, rather than surfacing a raw library crash;
        // the caller's correct action either way is "wait", not "debug the wiring".
        return result.valid ? { valid: false, reason: 'replay' } : { valid: false }
      }
      if (!result.valid) {
        // Distinguish "already used" from "wrong/expired": when the ONLY reason the token
        // failed is the replay guard (it verifies fine without `afterTimeStep`), say so.
        // An indistinguishable `valid:false` sent a debugging executor down a "the library
        // is broken" spiral when the correct action was "wait for the next code".
        if ('afterTimeStep' in replayGuard) {
          const withoutReplayGuard = verifySync({ secret, token, epochTolerance: tolerance })
          if (withoutReplayGuard.valid) return { valid: false, reason: 'replay' }
        }
        return { valid: false }
      }
      // Surface the matched TOTP time step so the caller can persist it and reject
      // reuse. (`verifySync` returns a TOTP|HOTP union; only the TOTP result carries
      // `timeStep` — narrow rather than assume, since this provider is TOTP-only.)
      return { valid: true, timeStep: 'timeStep' in result ? result.timeStep : undefined }
    } catch (error) {
      // Correct to throw for genuine server-side data corruption (must never be masked
      // as an ordinary invalid code) — but a raw otplib/scure message doesn't say WHICH
      // side failed or that the fix is re-running setup, not retrying the code. Rewrap
      // only the secret-side failures with that context; anything else (e.g. a genuine
      // library bug) propagates unchanged.
      if (isSecretDecodeError(error)) {
        throw new Error(
          'Stored 2FA secret is not valid base32 — the record is corrupted; re-run setup.',
          { cause: error },
        )
      }
      throw error
    }
  },
}
