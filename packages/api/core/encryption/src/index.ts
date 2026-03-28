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
 * // Encrypt and decrypt data
 * const ciphertext = await encrypt('sensitive data')
 * const plaintext = await decrypt(ciphertext)
 *
 * // Hash and verify data
 * const hashed = await hash('password')
 * const isValid = await verify('password', hashed)
 * ```
 */

export * from './provider.js'
export * from './types.js'
