/**
 * Streaming-encryption contract shared by every encryption bond.
 *
 * `encryptStream`/`decryptStream` are OPTIONAL on `EncryptionProvider`;
 * callers check {@link hasStreamEncryption} first. Bonds that implement them
 * use the framing described by {@link ENCRYPTED_STREAM_FORMAT} so a stream
 * written by one implementation reads back through another holding the same
 * key.
 *
 * @module
 */

import type { EncryptionProvider } from './types.js'

/**
 * Identifier of the chunked-AEAD stream framing (`mol-aead-chunked-v1`).
 *
 * Layout (all integers big-endian):
 *
 * - **Header, 22 bytes**: ASCII magic `MOLAEAD1` (8) · key version uint16 (2)
 *   · chunk size in plaintext bytes uint32 (4, 4 KiB to 16 MiB) · random
 *   nonce prefix (8).
 * - **Body**: a sequence of chunks, each the ciphertext of up to `chunkSize`
 *   plaintext bytes followed by its 16-byte AEAD tag. Every chunk except the
 *   last holds exactly `chunkSize` plaintext bytes.
 * - **Per-chunk nonce, 12 bytes**: nonce prefix (8) || chunk counter uint32
 *   (4), the counter starting at 0 and increasing by one per chunk.
 * - **Per-chunk AAD**: UTF-8 bytes of the caller's `context` (empty when
 *   absent) || counter uint32 || final flag (1 byte: `0x01` on the last
 *   chunk, `0x00` otherwise).
 * - **The final chunk is always written**, even when it holds zero plaintext
 *   bytes (empty input, or input an exact multiple of `chunkSize`), so a
 *   reader can tell a stream that ended from one that was cut short.
 *
 * Reordered, dropped, duplicated or truncated chunks and any flipped bit fail
 * authentication; plaintext is released only after its chunk verifies.
 */
export const ENCRYPTED_STREAM_FORMAT = 'mol-aead-chunked-v1' as const

/** Error name every stream decryptor uses when it rejects its input. */
export const ENCRYPTION_STREAM_ERROR_NAME = 'EncryptionStreamError' as const

/**
 * The error a stream encryptor/decryptor destroys itself with when the input
 * cannot be authenticated or parsed. `name` is always `'EncryptionStreamError'`.
 */
export class EncryptionStreamError extends Error {
  /**
   * Creates the error.
   *
   * @param message - Plain-English description of what was wrong.
   * @param options - Optional `cause`.
   */
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = ENCRYPTION_STREAM_ERROR_NAME
  }
}

/**
 * Narrows a provider to one that implements both streaming methods.
 * Streaming is optional in the contract, so check before calling.
 *
 * @param provider - The encryption provider to inspect.
 * @returns `true` when both `encryptStream` and `decryptStream` are functions.
 */
export const hasStreamEncryption = (
  provider: EncryptionProvider,
): provider is EncryptionProvider &
  Required<Pick<EncryptionProvider, 'encryptStream' | 'decryptStream'>> =>
  typeof provider.encryptStream === 'function' && typeof provider.decryptStream === 'function'
