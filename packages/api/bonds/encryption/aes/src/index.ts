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
 */

export * from './provider.js'
export * from './types.js'
