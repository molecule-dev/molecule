/**
 * AES-256-GCM encryption provider for molecule.dev.
 *
 * Uses Node.js built-in `crypto` for AES-256-GCM authenticated encryption,
 * SHA-256 hashing, and timing-safe verification. Supports key rotation with
 * versioned ciphertext format.
 *
 * @example
 * ```typescript
 * import { decrypt, encrypt, setProvider } from '@molecule/api-encryption'
 * import { createProvider } from '@molecule/api-encryption-aes'
 *
 * // Startup: bond once. ENCRYPTION_KEY = 64 hex chars (`openssl rand -hex 32`).
 * const key = process.env.ENCRYPTION_KEY
 * if (!key) throw new Error('ENCRYPTION_KEY is not set')
 * setProvider(createProvider({ key }))
 *
 * // Encrypt a field before storing it; pass the SAME context (AAD) to decrypt.
 * const stored = await encrypt('4111 1111 1111 1111', 'user:42:card')
 * // 'v1:<iv hex>:<auth tag hex>:<ciphertext hex>'
 * const card = await decrypt(stored, 'user:42:card') // '4111 1111 1111 1111'
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
 * - `ENCRYPTION_KEY` must be exactly 64 hex characters (a 256-bit key) — a
 *   passphrase or base64 key throws at construction, not on first encrypt.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
