/**
 * AES-256-GCM encryption provider for molecule.dev.
 *
 * Uses Node.js built-in `crypto` for AES-256-GCM authenticated encryption,
 * SHA-256 hashing, and timing-safe verification. Supports key rotation with
 * versioned ciphertext format.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-encryption'
 * import { provider } from '@molecule/api-encryption-aes'
 *
 * // Wire the provider at startup (reads ENCRYPTION_KEY from env)
 * setProvider(provider)
 *
 * // Or create with explicit config
 * import { createProvider } from '@molecule/api-encryption-aes'
 * const customProvider = createProvider({ key: 'your-64-char-hex-key' })
 * setProvider(customProvider)
 *
 * // Stream a large file through chunked AES-256-GCM (1 MiB chunks by default)
 * import { createReadStream, createWriteStream } from 'node:fs'
 * import { pipeline } from 'node:stream/promises'
 * await pipeline(
 *   createReadStream('dump.sql'),
 *   customProvider.encryptStream({ context: 'backup:42', chunkBytes: 4 * 1024 * 1024 }),
 *   createWriteStream('dump.sql.enc'),
 * )
 * await pipeline(
 *   createReadStream('dump.sql.enc'),
 *   customProvider.decryptStream({ context: 'backup:42' }),
 *   createWriteStream('dump.sql'),
 * )
 * ```
 *
 * @remarks
 * - **`rotateKey()` is transition-safe — it never orphans data.** Keys live in
 *   a version-keyed keyring: `encrypt()` tags each ciphertext with the current
 *   `v{n}`, `decrypt()` reads that tag and selects the matching key, and
 *   `rotateKey(oldKey, newKey)` ADDS `newKey` at the next version while RETAINING
 *   the prior key(s). So ciphertext written before a rotation still decrypts
 *   afterward (the core contract's "previously encrypted data can still be
 *   decrypted during a transition period"). Once you have re-encrypted the old
 *   ciphertext under the new key, retire the old keys explicitly with
 *   `pruneKeyVersions()` — rotation alone deliberately keeps them.
 * - A ciphertext whose `v{n}` version is not in the keyring (unknown/pruned key)
 *   fails cleanly with a descriptive error — never a silent wrong decrypt.
 * - Rotation state is per-process and in-memory: the lazy `provider` singleton
 *   starts a fresh keyring at version 1 from `ENCRYPTION_KEY` on each process,
 *   so a rotation done in a prior process is not restored. For rotation that
 *   survives restarts, build with `createProvider({ key, priorKeys })`, seeding
 *   the historical `{ version, key }` entries from your secret store.
 * - `hash()`/`verify()` are plain unsalted SHA-256 — integrity checks only.
 *   NEVER use them for passwords; use `@molecule/api-password` with a bond
 *   like `@molecule/api-password-bcrypt`.
 * - `encrypt(plaintext, context)`: the optional `context` is GCM AAD — the
 *   SAME context string must be supplied to `decrypt()` or authentication
 *   fails.
 * - **`encryptStream()` / `decryptStream()`** implement the core's
 *   `mol-aead-chunked-v1` framing with AES-256-GCM. Header (54 bytes) =
 *   `MOLAEAD1` magic (8), key version (uint16 BE), chunk size (uint32 BE),
 *   32-byte random salt, 8-byte key id (first 8 bytes of
 *   HMAC-SHA256(key, `mol-aead-chunked-v1/kid`)). Each stream derives its own
 *   AES-256 key and 8-byte nonce prefix with HKDF-SHA256(key, salt,
 *   `mol-aead-chunked-v1`, 40 bytes) — the configured key (often shared with
 *   field encryption) never seals a chunk directly, and nonces cannot repeat
 *   across streams. Chunks of up to `chunkBytes` plaintext are sealed with
 *   nonce `prefix || counter` (uint32 BE, from 0) and AAD
 *   `header || context || counter || final` (every chunk) and followed by
 *   their 16-byte tag. Every chunk but the last is exactly `chunkBytes`; the
 *   last is always written and always shorter (empty when the input is an
 *   exact multiple).
 * - Chunk size: `chunkBytes` per call, else `streamChunkBytes` from
 *   `createProvider()`, else 1 MiB; allowed range 4 KiB to 16 MiB.
 *   Decryption reads it from the header. Memory use is about one chunk.
 * - Streams encrypt under the CURRENT key version (written in the header);
 *   `decryptStream()` picks the key by that version from the keyring, so
 *   streams written before `rotateKey()` (or seeded via `priorKeys`) still
 *   decrypt.
 * - `decryptStream()` emits a chunk's plaintext only after its tag
 *   verifies, and destroys itself with an `EncryptionStreamError` whose
 *   `code` says why: `bad-header` (wrong magic, invalid chunk size, short
 *   header), `unknown-key-version` (version not in the keyring — pruned or
 *   never seeded), `unknown-key` (the keyring holds that version but it is a
 *   different key: a mistyped or replaced `ENCRYPTION_KEY`, NOT tampering),
 *   `auth` (a flipped bit, reordered chunks, an edited or swapped header, a
 *   wrong context), `truncated` (ended at a chunk boundary before the final
 *   chunk — possibly a dropped connection). Write decrypted output to a temp
 *   location and use it only after the pipeline resolves.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
