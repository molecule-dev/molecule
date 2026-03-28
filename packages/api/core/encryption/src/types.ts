/**
 * Type definitions for the encryption core interface.
 *
 * Defines the `EncryptionProvider` interface for field-level encryption,
 * decryption, hashing, and key rotation. Bond packages implement this
 * interface to provide concrete encryption algorithms (AES-256-GCM, etc.).
 *
 * @module
 */

/**
 * Configuration options for an encryption provider.
 */
export interface EncryptionConfig {
  /** The encryption key (or key identifier for KMS-backed providers). */
  key: string

  /** Optional algorithm identifier (provider-specific). */
  algorithm?: string

  /** Optional key version for rotation tracking. */
  keyVersion?: number
}

/**
 * Encryption provider interface.
 *
 * All encryption providers must implement this interface to provide
 * field-level encryption, decryption, hashing, and key rotation.
 */
export interface EncryptionProvider {
  /**
   * Encrypts a plaintext string.
   *
   * @param plaintext - The data to encrypt.
   * @param context - Optional additional authenticated data (AAD) for
   *   authenticated encryption schemes.
   * @returns The encrypted ciphertext string (typically base64-encoded).
   */
  encrypt(plaintext: string, context?: string): Promise<string>

  /**
   * Decrypts a ciphertext string.
   *
   * @param ciphertext - The encrypted data to decrypt.
   * @param context - Optional additional authenticated data (AAD) that was
   *   used during encryption.
   * @returns The decrypted plaintext string.
   */
  decrypt(ciphertext: string, context?: string): Promise<string>

  /**
   * Produces a one-way hash of the given data.
   *
   * @param data - The data to hash.
   * @returns The hash string (hex or base64 encoded).
   */
  hash(data: string): Promise<string>

  /**
   * Verifies that data matches a previously computed hash.
   *
   * @param data - The original data to verify.
   * @param hash - The hash to verify against.
   * @returns `true` if the data matches the hash.
   */
  verify(data: string, hash: string): Promise<boolean>

  /**
   * Rotates the encryption key. Re-encrypts internal state or markers
   * so that future operations use the new key while previously encrypted
   * data can still be decrypted during a transition period.
   *
   * @param oldKey - The current encryption key.
   * @param newKey - The new encryption key to rotate to.
   */
  rotateKey(oldKey: string, newKey: string): Promise<void>
}
