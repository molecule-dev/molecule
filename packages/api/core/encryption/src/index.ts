/**
 * Encryption core interface for molecule.dev.
 *
 * Provides the `EncryptionProvider` interface for field-level encryption,
 * decryption, hashing, and key rotation. Bond a concrete provider
 * (e.g. `@molecule/api-encryption-aes`) at startup via `setProvider()`.
 *
 * @example
 * ```typescript
 * import { decrypt, encrypt, setProvider } from '@molecule/api-encryption'
 * // Reads ENCRYPTION_KEY (64 hex chars) from the environment on first use.
 * import { provider as aes } from '@molecule/api-encryption-aes'
 *
 * // Startup: bond once.
 * setProvider(aes)
 *
 * // Field-level encryption: bind the ciphertext to its record with a context string.
 * const userId = 'user-123'
 * const context = `user:${userId}:taxId`
 * const stored = await encrypt('123-45-6789', context) // 'v1:<iv>:<tag>:<data>' — save this
 *
 * // Later: decrypt with the SAME context.
 * const taxId = await decrypt(stored, context) // '123-45-6789'
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
 * - **Bond first:** `setProvider(provider)` at startup — every function throws until then.
 *   The AES bond's `provider` reads `ENCRYPTION_KEY` (exactly 64 hex chars = 256 bits,
 *   `openssl rand -hex 32`) on first use and throws when it is missing or malformed.
 * - `encrypt()` returns a self-describing STRING (`v1:iv:tag:data` in the AES bond) and
 *   is non-deterministic (random IV) — store it as text; the same plaintext never yields
 *   the same ciphertext twice.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
