/**
 * Encryption core interface for molecule.dev.
 *
 * Provides the `EncryptionProvider` interface for field-level encryption,
 * decryption, hashing, and key rotation. Bond a concrete provider
 * (e.g. `@molecule/api-encryption-aes`) at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, encrypt, decrypt, hash, verify } from '@molecule/api-encryption'
 * import { provider } from '@molecule/api-encryption-aes'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Field-level encryption for sensitive data at rest
 * const ciphertext = await encrypt(accessToken)
 * const plaintext = await decrypt(ciphertext)
 *
 * // Integrity hashing (checksums, dedupe keys) — NOT for passwords
 * const checksum = await hash(documentBody)
 * const untampered = await verify(documentBody, checksum)
 *
 * // Streaming encryption (optional capability) for large payloads such as
 * // backup archives — never whole in memory
 * import { createReadStream, createWriteStream } from 'node:fs'
 * import { pipeline } from 'node:stream/promises'
 * import { getProvider, hasStreamEncryption } from '@molecule/api-encryption'
 *
 * const enc = getProvider()
 * if (!hasStreamEncryption(enc)) throw new Error('bonded encryption provider cannot stream')
 * await pipeline(
 *   createReadStream('backup.tar'),
 *   enc.encryptStream({ context: 'backup:2026-10-04' }),
 *   createWriteStream('backup.tar.enc'),
 * )
 * await pipeline(
 *   createReadStream('backup.tar.enc'),
 *   enc.decryptStream({ context: 'backup:2026-10-04' }), // rejects on tampering/truncation
 *   createWriteStream('restored.tar'),
 * )
 * ```
 *
 * @remarks
 * - **NEVER hash passwords with `hash()`.** It is a fast, unsalted integrity
 *   hash (e.g. SHA-256 in the AES bond) — fine for checksums and dedupe keys,
 *   catastrophic for credentials. Passwords go through
 *   `@molecule/api-password` (salted, slow KDF).
 * - **The key is a server-side secret** (e.g. the AES bond's `ENCRYPTION_KEY`,
 *   auto-generated at scaffold). Never hardcode, log, or expose it — and a
 *   lost key makes every ciphertext permanently unreadable, so treat key
 *   changes as a rotation (`rotateKey`), never an edit.
 * - **Ciphertext is opaque.** An encrypted DB column cannot be filtered,
 *   sorted, or `like`-searched on its plaintext. Encrypt narrow sensitive
 *   fields (tokens, PII), not fields you query by.
 * - **`context` (AAD) must match at decrypt.** If you pass a context to
 *   `encrypt(value, context)`, the identical context is required to decrypt.
 *   Binding a ciphertext to e.g. its record id stops cross-row copy-paste —
 *   but then the id can never change.
 * - `decrypt()` throws on a wrong key or tampered ciphertext — treat that as
 *   corruption/misconfiguration to surface, not a condition to retry.
 * - **Stream encryption is OPTIONAL in the contract.** `encryptStream()` /
 *   `decryptStream()` return Node `Transform` streams for payloads too large
 *   to hold in memory (backup archives, exports). Not every bond implements
 *   them: call `hasStreamEncryption(provider)` first and fail clearly if it
 *   is false — never fall back to buffering the whole payload through
 *   `encrypt()` (strings only, and it would load gigabytes into memory).
 * - **Stream framing is `ENCRYPTED_STREAM_FORMAT` (`mol-aead-chunked-v1`),
 *   shared by every bond:** a 54-byte header (magic `MOLAEAD1`, key version
 *   uint16, chunk size uint32, 32-byte random salt, 8-byte key id), then
 *   chunks of ciphertext + 16-byte tag. Each stream encrypts under its own
 *   HKDF-SHA256 subkey and nonce prefix derived from the key and the salt
 *   (info `mol-aead-chunked-v1`), so the long-lived key is never used
 *   directly and is domain-separated from its other uses. Each chunk's nonce
 *   is `noncePrefix || counter` and its AAD is
 *   `header || context || counter || finalFlag`, so a flipped bit, an edited
 *   or swapped header, reordered/duplicated/dropped chunks or a wrong
 *   `context` all fail authentication.
 * - **`decryptStream()` releases plaintext only after each chunk's tag
 *   verifies**, and buffers at most one chunk. A failure destroys the stream
 *   with an `EncryptionStreamError` (`err.name === 'EncryptionStreamError'`;
 *   `isEncryptionStreamError(err)` narrows it), so `pipeline()` rejects.
 *   Chunks that verified before a later failure were already written
 *   downstream — write to a temp file and only rename or use it once the
 *   pipeline resolves.
 * - **Branch on `err.code`, not the message:**
 *   - `'auth'` (and `'bad-header'`, `'overflow'`) — the ciphertext is damaged,
 *     or it is not this key's/context's (a wrong `context` reads as `'auth'`).
 *     Treat the object as corrupt; do not retry.
 *   - `'unknown-key'` / `'unknown-key-version'` — the ENVIRONMENT, not the
 *     object: the header's key id does not match the configured key for that
 *     version (a mistyped or rotated key), or the keyring lacks the version.
 *     Fix the key configuration; the object is probably intact.
 *   - `'truncated'` — the stream ended at a chunk boundary before its final
 *     chunk. A dropped connection looks exactly like this; re-reading may
 *     succeed.
 *   - `'internal'` — misuse or a bug (e.g. an out-of-range chunk size at
 *     encrypt), never a property of the ciphertext.
 * - **Truncation is detected.** The encryptor always closes with a flagged
 *   final chunk (possibly holding zero bytes), so a stream cut at a chunk
 *   boundary still fails at the end instead of passing as a shorter file. A
 *   stream cut part way through a chunk fails that chunk's tag (`'auth'`).
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './stream.js'
export * from './types.js'
