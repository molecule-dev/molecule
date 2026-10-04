/**
 * AES-256-GCM encryption provider configuration.
 *
 * @module
 */

import type { Transform } from 'node:stream'

import type { EncryptionProvider, EncryptStreamOptions } from '@molecule/api-encryption'

/**
 * A historical (pre-rotation) key, retained so ciphertext encrypted under it
 * remains decryptable.
 *
 * Ciphertext is tagged with the `v{version}` of the key that produced it; the
 * provider selects the matching key from its keyring at decrypt time. Seed the
 * keyring with the app's prior keys (from a secret store) so rotations survive
 * a process restart — see {@link AesConfig.priorKeys}.
 */
export interface PriorKey {
  /** The key version tag this key decrypts (matches the `v{n}` ciphertext prefix). */
  version: number

  /** The 256-bit key, hex-encoded (64 hex characters). */
  key: string
}

/**
 * Configuration options for the AES-256-GCM encryption provider.
 */
export interface AesConfig {
  /** The current 256-bit encryption key, hex-encoded (64 hex characters). */
  key: string

  /**
   * Version of the current `key`. Ciphertext produced by `encrypt()` is tagged
   * with this version; `decrypt()` selects the key to use from the `v{n}` tag,
   * so it must be stable for a given key. `rotateKey()` advances it.
   *
   * @default 1
   */
  keyVersion?: number

  /**
   * Prior keys to seed the keyring with, so ciphertext encrypted before a
   * rotation still decrypts after this provider is (re)constructed — e.g. on a
   * process restart, when the in-memory rotation state would otherwise be lost.
   * Each entry maps a historical `v{n}` version to its key. The current `key`
   * (at {@link AesConfig.keyVersion}) always wins over any prior entry sharing
   * its version.
   *
   * @default []
   */
  priorKeys?: PriorKey[]

  /**
   * Default plaintext bytes per chunk for `encryptStream()` (4 KiB to 16 MiB).
   * A per-call `chunkBytes` overrides it. Decryption reads the size from the
   * stream header, so this never needs to match at decrypt time.
   *
   * @default 1048576 (1 MiB)
   */
  streamChunkBytes?: number
}

/**
 * Options for the AES bond's `encryptStream()`.
 */
export interface AesEncryptStreamOptions extends EncryptStreamOptions {
  /**
   * Plaintext bytes per chunk (4 KiB to 16 MiB). Larger chunks mean less
   * overhead (16 bytes per chunk) but more memory per chunk on both sides.
   *
   * @default AesConfig.streamChunkBytes, else 1048576 (1 MiB)
   */
  chunkBytes?: number
}

/**
 * AES-256-GCM encryption provider.
 *
 * Fully satisfies the core `EncryptionProvider` contract, so it bonds anywhere
 * an `EncryptionProvider` is expected. It additionally exposes
 * {@link AesEncryptionProvider.pruneKeyVersions} to explicitly retire old keys
 * once their ciphertext has been re-encrypted — rotation alone never drops a
 * key, so it can never orphan data.
 */
export interface AesEncryptionProvider extends EncryptionProvider {
  /**
   * Retires key versions from the in-memory keyring. Call this only AFTER every
   * ciphertext encrypted under those versions has been re-encrypted under the
   * current key — a pruned version can no longer decrypt its ciphertext.
   *
   * The current key version is ALWAYS retained (it cannot be pruned). By
   * default every non-current version is removed; pass `keep` to retain
   * specific older versions during a staged migration.
   *
   * @param keep - Old versions to retain in addition to the current one.
   * @returns The versions that were removed.
   */
  pruneKeyVersions(keep?: number[]): number[]

  /**
   * Encrypts a byte stream under the CURRENT key in the core's
   * `mol-aead-chunked-v2` framing (chunked AES-256-GCM).
   *
   * @param options - AAD context and chunk size.
   * @returns A Transform: plaintext in, ciphertext out.
   * @throws {Error} `EncryptionStreamError` (code `internal`) on an out-of-range chunk size.
   */
  encryptStream(options?: AesEncryptStreamOptions): Transform

  /**
   * Authenticates and decrypts a stream from {@link encryptStream}, picking
   * the key by the header's version from the keyring. Plaintext is emitted
   * only after each chunk's tag verifies; the stream errors with an
   * `EncryptionStreamError` whose `code` is `auth` (tampering, reordering,
   * a wrong context), `unknown-key-version`, `unknown-key` (a different key
   * under the same version), `bad-header` or `truncated`.
   *
   * @param options - The AAD context used to encrypt.
   * @returns A Transform: ciphertext in, plaintext out.
   */
  decryptStream(options?: EncryptStreamOptions): Transform
}
