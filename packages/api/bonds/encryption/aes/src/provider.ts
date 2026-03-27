/**
 * AES-256-GCM implementation of `EncryptionProvider`.
 *
 * Uses Node.js built-in `crypto` module for all operations:
 * - **encrypt/decrypt**: AES-256-GCM with random IV and authentication tag
 * - **hash**: SHA-256
 * - **verify**: Timing-safe comparison of SHA-256 hashes
 * - **rotateKey**: Swaps the internal key for future operations
 *
 * Ciphertext format: `v{keyVersion}:{iv}:{authTag}:{ciphertext}` (all hex-encoded).
 *
 * @module
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

import type { EncryptionProvider } from '@molecule/api-encryption'

import type { AesConfig } from './types.js'

/** AES-256-GCM algorithm identifier. */
const ALGORITHM = 'aes-256-gcm'

/** IV length in bytes (96-bit / 12 bytes recommended for GCM). */
const IV_LENGTH = 12

/** Authentication tag length in bytes. */
const AUTH_TAG_LENGTH = 16

/**
 * Creates an AES-256-GCM encryption provider.
 *
 * @param config - Provider configuration including the hex-encoded 256-bit key.
 * @returns An `EncryptionProvider` using AES-256-GCM.
 */
export const createProvider = (config: AesConfig): EncryptionProvider => {
  let keyBuffer = Buffer.from(config.key, 'hex')
  let keyVersion = config.keyVersion ?? 1

  return {
    async encrypt(plaintext: string, context?: string): Promise<string> {
      const iv = randomBytes(IV_LENGTH)
      const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH })

      if (context) {
        cipher.setAAD(Buffer.from(context, 'utf-8'))
      }

      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
      const authTag = cipher.getAuthTag()

      return `v${keyVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
    },

    async decrypt(ciphertext: string, context?: string): Promise<string> {
      const parts = ciphertext.split(':')
      if (parts.length !== 4) {
        throw new Error('Invalid ciphertext format')
      }

      const iv = Buffer.from(parts[1], 'hex')
      const authTag = Buffer.from(parts[2], 'hex')
      const encrypted = Buffer.from(parts[3], 'hex')

      const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      })
      decipher.setAuthTag(authTag)

      if (context) {
        decipher.setAAD(Buffer.from(context, 'utf-8'))
      }

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
      return decrypted.toString('utf-8')
    },

    async hash(data: string): Promise<string> {
      return createHash('sha256').update(data, 'utf-8').digest('hex')
    },

    async verify(data: string, hashed: string): Promise<boolean> {
      const computed = createHash('sha256').update(data, 'utf-8').digest('hex')

      if (computed.length !== hashed.length) {
        return false
      }

      return timingSafeEqual(Buffer.from(computed, 'utf-8'), Buffer.from(hashed, 'utf-8'))
    },

    async rotateKey(oldKey: string, newKey: string): Promise<void> {
      const oldBuffer = Buffer.from(oldKey, 'hex')

      if (!timingSafeEqual(oldBuffer, keyBuffer)) {
        throw new Error('Old key does not match the current encryption key')
      }

      keyBuffer = Buffer.from(newKey, 'hex')
      keyVersion += 1
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: EncryptionProvider | null = null

/**
 * Default AES-256-GCM encryption provider instance.
 *
 * Lazily initializes on first property access using the `ENCRYPTION_KEY`
 * environment variable (hex-encoded 256-bit key).
 *
 * @throws {Error} If `ENCRYPTION_KEY` environment variable is not set.
 */
export const provider: EncryptionProvider = new Proxy({} as EncryptionProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      const key = process.env['ENCRYPTION_KEY']
      if (!key) {
        throw new Error(
          'ENCRYPTION_KEY environment variable is required for AES encryption provider',
        )
      }
      _provider = createProvider({ key })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
