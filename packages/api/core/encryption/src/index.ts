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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
