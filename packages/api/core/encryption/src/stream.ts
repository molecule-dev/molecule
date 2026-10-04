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
 * - **Header, 54 bytes**: ASCII magic `MOLAEAD1` (8) · key version uint16 (2)
 *   · chunk size in plaintext bytes uint32 (4, 4 KiB to 16 MiB) · random salt
 *   (32) · key id (8).
 * - **Key id**: the first 8 bytes of HMAC-SHA256(key = the raw key for that
 *   version, data = UTF-8 `mol-aead-chunked-v1/kid`). It lets a reader tell
 *   "this stream was written under a different key" from tampering.
 * - **Per-stream material**: HKDF-SHA256(ikm = the raw key, salt = the
 *   header's salt, info = UTF-8 `mol-aead-chunked-v1`, length 40). Bytes 0–31
 *   are the stream's own AEAD key, bytes 32–39 its nonce prefix. Every stream
 *   therefore runs under a fresh subkey, domain-separated from any other use
 *   of the same long-lived key.
 * - **Body**: a sequence of chunks, each the ciphertext of up to `chunkSize`
 *   plaintext bytes followed by its 16-byte AEAD tag. Every chunk except the
 *   last holds exactly `chunkSize` plaintext bytes.
 * - **Per-chunk nonce, 12 bytes**: nonce prefix (8) || chunk counter uint32
 *   (4), the counter starting at 0 and increasing by one per chunk.
 * - **Per-chunk AAD** (every chunk): the 54 header bytes || UTF-8 bytes of the
 *   caller's `context` (empty when absent) || counter uint32 || final flag
 *   (1 byte: `0x01` on the last chunk, `0x00` otherwise). Binding the header
 *   means an edited chunk size or key version, or another stream's header,
 *   fails authentication.
 * - **The final chunk is always written**, even when it holds zero plaintext
 *   bytes (empty input, or input an exact multiple of `chunkSize`), so a
 *   reader can tell a stream that ended from one that was cut short.
 *
 * Reordered, dropped, duplicated or truncated chunks and any flipped bit fail;
 * plaintext is released only after its chunk verifies.
 */
export const ENCRYPTED_STREAM_FORMAT = 'mol-aead-chunked-v1' as const

/** Error name every stream decryptor uses when it rejects its input. */
export const ENCRYPTION_STREAM_ERROR_NAME = 'EncryptionStreamError' as const

/**
 * Why a stream encryptor/decryptor failed. Three groups matter to a caller:
 *
 * **The object is damaged, or is not this key's/context's**
 * - `'auth'` — a chunk failed authentication: a flipped bit, reordered or
 *   duplicated chunks, an edited or swapped header, a final chunk cut part
 *   way, or a `context` that does not match the one used to encrypt.
 * - `'bad-header'` — the input does not start with a valid header (wrong
 *   magic, out-of-range chunk size, or fewer header bytes than required). It
 *   is not an encrypted stream in this format, or its first bytes are lost.
 * - `'overflow'` — the chunk counter would exceed 2^32 (the stream is longer
 *   than the format allows).
 *
 * **The environment, not the object**
 * - `'unknown-key-version'` — the header names a key version the keyring
 *   does not hold (never seeded, or pruned).
 * - `'unknown-key'` — the keyring holds that version, but it is a different
 *   key from the one that wrote the stream (a mistyped or rotated key under
 *   the same version number). Fix the configuration; the object may be fine.
 *
 * **The stream ended early — may be transport**
 * - `'truncated'` — the input ended at a chunk boundary without its final
 *   chunk. A dropped connection produces this as readily as an attacker; a
 *   retry of the read can succeed.
 *
 * **A bug or misuse**
 * - `'internal'` — the caller or the bond did something invalid (e.g. an
 *   out-of-range chunk size or key version at encrypt), or an unexpected
 *   error inside the transform. Never a property of the ciphertext.
 */
export type EncryptionStreamErrorCode =
  | 'bad-header'
  | 'unknown-key-version'
  | 'unknown-key'
  | 'auth'
  | 'truncated'
  | 'overflow'
  | 'internal'

const ERROR_CODES: ReadonlySet<string> = new Set<EncryptionStreamErrorCode>([
  'bad-header',
  'unknown-key-version',
  'unknown-key',
  'auth',
  'truncated',
  'overflow',
  'internal',
])

/**
 * The error a stream encryptor/decryptor destroys itself with when the input
 * cannot be authenticated or parsed. `name` is always `'EncryptionStreamError'`;
 * `code` says why (see {@link EncryptionStreamErrorCode}).
 */
export class EncryptionStreamError extends Error {
  /** Why the stream failed. */
  readonly code: EncryptionStreamErrorCode

  /**
   * Creates the error.
   *
   * @param code - Why the stream failed.
   * @param message - Plain-English description of what was wrong.
   * @param options - Optional `cause`.
   */
  constructor(code: EncryptionStreamErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = ENCRYPTION_STREAM_ERROR_NAME
    this.code = code
  }
}

/**
 * Recognizes an {@link EncryptionStreamError}, including one thrown by a
 * second copy of this package (checks `name` and `code`, not `instanceof`).
 *
 * @param error - Any thrown value.
 * @returns `true` when it is a stream error with a known `code`.
 */
export const isEncryptionStreamError = (error: unknown): error is EncryptionStreamError => {
  if (!(error instanceof Error) || error.name !== ENCRYPTION_STREAM_ERROR_NAME) return false
  const code: unknown = (error as Error & { code?: unknown }).code
  return typeof code === 'string' && ERROR_CODES.has(code)
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
