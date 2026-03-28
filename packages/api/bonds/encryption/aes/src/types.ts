/**
 * AES-256-GCM encryption provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the AES-256-GCM encryption provider.
 */
export interface AesConfig {
  /** The 256-bit encryption key, hex-encoded (64 hex characters). */
  key: string

  /**
   * Optional key version for tracking which key encrypted a given value.
   * Used during key rotation to identify ciphertext that needs re-encryption.
   *
   * @default 1
   */
  keyVersion?: number
}
