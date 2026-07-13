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
   * Present only when `valid` is `false` and the token WOULD have verified but
   * its time step is `<= afterTimeStep`: the code was already used (replay
   * protection). Callers should tell the user to wait for the NEXT code — this
   * is not a wrong or expired code, and not a library fault.
   */
  reason?: 'replay'
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
   */
  verify(params: TwoFactorVerifyParams): Promise<TwoFactorVerifyResult>
}
