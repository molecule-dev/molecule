/**
 * Type definitions for the two-factor authentication core interface.
 *
 * @module
 */

/**
 * Parameters for generating TOTP URLs and QR codes.
 */
export interface TwoFactorUrlParams {
  username: string
  service: string
  secret: string
}

/**
 * Result of generating TOTP URLs, including a scannable QR code.
 */
export interface TwoFactorUrls {
  keyUrl: string
  QRImageUrl: string
}

/**
 * Parameters for verifying a TOTP token against a secret.
 */
export interface TwoFactorVerifyParams {
  secret: string
  token: string
  /**
   * The last successfully-consumed TOTP time step for this user, if any
   * (RFC 6238 time step counter). The provider rejects any token whose time
   * step is `<= afterTimeStep`, enforcing single-use of a code within its
   * validity window (replay protection). Persist {@link TwoFactorVerifyResult.timeStep}
   * after each successful verification and pass it back here on the next one.
   */
  afterTimeStep?: number
  /**
   * Acceptance window in SECONDS as `[past, future]` around the current time
   * step. Defaults to the provider's `[60, 30]` — two steps of past skew (a
   * code stays valid ~60–90s after it was shown, tolerant of slow entry) and
   * one step of future skew (a fast client clock). Override only when your
   * threat model needs a tighter window (e.g. `[30, 0]`); tighter windows make
   * codes expire while a slow flow is still typing them.
   */
  epochTolerance?: [number, number]
}

/**
 * Result of verifying a TOTP token.
 */
export interface TwoFactorVerifyResult {
  /**
   * Whether the token is valid for the given secret.
   */
  valid: boolean
  /**
   * The RFC 6238 time step the token matched at — present only when
   * `valid` is `true`. Persist this and pass it back as
   * {@link TwoFactorVerifyParams.afterTimeStep} on the next verification so a
   * reused (same-step) or earlier code is rejected (single-use replay
   * protection).
   */
  timeStep?: number
  /**
   * Present only when `valid` is `false`, identifying failure modes a caller
   * should message differently (absent when the token is simply wrong or
   * expired):
   *
   * - `'replay'` — the token WOULD have verified but its time step is
   *   `<= afterTimeStep`: the code was already used (replay protection).
   *   Tell the user to wait for the NEXT code — this is not a wrong or
   *   expired code, and not a library fault. A provider MAY also report
   *   `'replay'` when the persisted `afterTimeStep` sits further ahead than
   *   the current time step plus the acceptance window can reach — this
   *   happens after the SERVER clock moves backward (VM snapshot restore,
   *   NTP correction, container clock drift) following a prior successful
   *   verify. In that case no token can be newer than the one already
   *   consumed until wall-clock time catches back up, so it is reported the
   *   same way rather than as a crash. See `@molecule/api-two-factor-otplib`'s
   *   provider for the reference implementation of this check.
   * - `'format'` — the token is not a syntactically valid one-time code
   *   (wrong length or non-digits; grouping whitespace from authenticator-app
   *   display formatting such as `"123 456"` is stripped before this check).
   *   Prompt the user to re-enter the code — nothing is wrong with the secret
   *   or the wiring, and the underlying library was never consulted.
   *
   * `verify()` may still REJECT (throw/reject the promise) instead of
   * returning `valid:false` when the STORED SECRET itself is unusable
   * (missing, malformed, not valid base32) — that is server-side data
   * corruption, not an invalid code, and must never be silently treated as
   * one. Catch it separately from a normal `!valid` result and steer the
   * user to re-run 2FA setup rather than re-enter a code.
   */
  reason?: 'replay' | 'format'
}

/**
 * Abstract two-factor authentication provider interface.
 *
 * Implementations must provide secret generation, URL/QR creation,
 * and token verification operations.
 */
export interface TwoFactorProvider {
  /**
   * Generates a new base32-encoded TOTP secret.
   */
  generateSecret(): string

  /**
   * Generates an `otpauth://` key URI and a QR code image URL for enrollment.
   */
  getUrls(params: TwoFactorUrlParams): Promise<TwoFactorUrls>

  /**
   * Verifies a TOTP token against a secret. Returns whether the token is valid
   * and, on success, the matched RFC 6238 time step so the caller can persist
   * it and reject reuse of the same/earlier code (replay protection).
   *
   * A rejected/wrong/expired code resolves to `{ valid: false }` (optionally
   * with {@link TwoFactorVerifyResult.reason}) — it never throws. `verify()`
   * MAY still reject the promise when the STORED `secret` itself is unusable
   * (missing or not valid base32): that is server-side data corruption, not
   * an invalid code, and callers must handle it separately (message "re-run
   * setup", not "wrong code").
   */
  verify(params: TwoFactorVerifyParams): Promise<TwoFactorVerifyResult>
}
