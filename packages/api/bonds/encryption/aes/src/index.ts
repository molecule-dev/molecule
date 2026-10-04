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
 *   `mol-aead-chunked-v1` framing with AES-256-GCM: header = `MOLAEAD1`
 *   magic, key version (uint16 BE), chunk size (uint32 BE), 8-byte random
 *   nonce prefix (22 bytes); then chunks of up to `chunkBytes` plaintext,
 *   each sealed with nonce `prefix || counter` (uint32 BE, from 0) and AAD
 *   `context || counter || final` and followed by its 16-byte tag. Every
 *   chunk but the last is exactly `chunkBytes`; the last is always written
 *   and always shorter (empty when the input is an exact multiple).
 * - Chunk size: `chunkBytes` per call, else `streamChunkBytes` from
 *   `createProvider()`, else 1 MiB; allowed range 4 KiB to 16 MiB.
 *   Decryption reads it from the header. Memory use is about one chunk.
 * - Streams encrypt under the CURRENT key version (written in the header);
 *   `decryptStream()` picks the key by that version from the keyring, so
 *   streams written before `rotateKey()` (or seeded via `priorKeys`) still
 *   decrypt. A pruned/unknown version fails with the same message as
 *   `decrypt()`.
 * - `decryptStream()` emits a chunk's plaintext only after its tag
 *   verifies, and destroys itself with an `EncryptionStreamError` on a bad
 *   header, unknown key version, failed tag (tampering, wrong key or wrong
 *   context), reordered chunks, or a stream that ends before its final chunk
 *   (truncation). Write decrypted output to a temp location and use it only
 *   after the pipeline resolves.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
