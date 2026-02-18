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
   * Verifies a TOTP token against a secret.
   */
  verify(params: TwoFactorVerifyParams): Promise<boolean>
}
