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
 * ```
 *
 * @remarks
 * - **`rotateKey()` does NOT keep old ciphertexts readable.** It swaps the
 *   single in-memory key; `decrypt()` always uses the CURRENT key and ignores
 *   the `v{n}` ciphertext prefix (informational only). After rotation,
 *   anything encrypted under the old key fails to decrypt ("Unsupported state
 *   or unable to authenticate data") — re-encrypt every stored ciphertext
 *   with the new key as part of the rotation, or don't rotate. (The core
 *   contract's "previously encrypted data can still be decrypted during a
 *   transition period" is not implemented by this bond.)
 * - Rotation state is per-process and in-memory: on restart the lazy
 *   `provider` re-reads `ENCRYPTION_KEY` and the key version resets.
 * - `hash()`/`verify()` are plain unsalted SHA-256 — integrity checks only.
 *   NEVER use them for passwords; use `@molecule/api-password` with a bond
 *   like `@molecule/api-password-bcrypt`.
 * - `encrypt(plaintext, context)`: the optional `context` is GCM AAD — the
 *   SAME context string must be supplied to `decrypt()` or authentication
 *   fails.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
