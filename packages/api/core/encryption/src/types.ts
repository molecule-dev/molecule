/**
 * Type definitions for the encryption core interface.
 *
 * Defines the `EncryptionProvider` interface for field-level encryption,
 * decryption, hashing, and key rotation. Bond packages implement this
 * interface to provide concrete encryption algorithms (AES-256-GCM, etc.).
 *
 * @module
 */

import type { Transform } from 'node:stream'

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
 * Options for {@link EncryptionProvider.encryptStream} and
 * {@link EncryptionProvider.decryptStream}.
 */
export interface EncryptStreamOptions {
  /**
   * Optional additional authenticated data bound to every chunk of the
   * stream (e.g. a backup id). The identical context is required to
   * decrypt; a mismatch fails authentication on the first chunk.
   */
  context?: string
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

  /**
   * OPTIONAL. Creates a streaming encryptor: plaintext bytes in,
   * authenticated ciphertext bytes out, never holding more than one chunk
   * in memory. Providers that implement it use the
   * {@link ENCRYPTED_STREAM_FORMAT} framing. Check with
   * `hasStreamEncryption(provider)` before calling.
   *
   * @param options - Optional stream options (AAD context).
   * @returns A Node `Transform` stream.
   */
  encryptStream?(options?: EncryptStreamOptions): Transform

  /**
   * OPTIONAL. Creates a streaming decryptor, the reverse of
   * {@link EncryptionProvider.encryptStream}. It emits a chunk's plaintext
   * only after that chunk's authentication tag has verified, and destroys
   * itself with an `EncryptionStreamError` on a bad header, an unknown key
   * version, a failed tag (tampering or a wrong context), chunks out of
   * order, or input that ends before the final chunk (truncation).
   *
   * @param options - Optional stream options; `context` must match the one
   *   used to encrypt.
   * @returns A Node `Transform` stream.
   */
  decryptStream?(options?: EncryptStreamOptions): Transform
}
