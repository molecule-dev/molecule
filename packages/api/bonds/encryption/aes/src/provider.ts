/**
 * AES-256-GCM implementation of `EncryptionProvider`.
 *
 * Uses Node.js built-in `crypto` module for all operations:
 * - **encrypt/decrypt**: AES-256-GCM with random IV and authentication tag
 * - **hash**: SHA-256
 * - **verify**: Timing-safe comparison of SHA-256 hashes
 * - **rotateKey**: Adds the new key to a versioned keyring (retaining prior
 *   keys) so ciphertext encrypted before the rotation still decrypts
 *
 * Ciphertext format: `v{keyVersion}:{iv}:{authTag}:{ciphertext}` (all
 * hex-encoded). `decrypt()` reads the `v{n}` tag and selects the matching key
 * from the keyring — so a rotation never orphans existing data.
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

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { AesConfig, AesEncryptionProvider } from './types.js'

/** AES-256-GCM algorithm identifier. */
const ALGORITHM = 'aes-256-gcm'

/** IV length in bytes (96-bit / 12 bytes recommended for GCM). */
const IV_LENGTH = 12

/** Authentication tag length in bytes. */
const AUTH_TAG_LENGTH = 16

/** Parses the `v{n}` key-version prefix of a ciphertext tag. */
const parseKeyVersion = (tag: string): number | null => {
  const match = /^v(\d+)$/.exec(tag)
  return match ? Number(match[1]) : null
}

/**
 * Creates an AES-256-GCM encryption provider.
 *
 * Rotation is transition-safe: keys are held in a version-keyed keyring.
 * `encrypt()` tags each ciphertext with the current key version, `decrypt()`
 * selects the key named by that tag, and `rotateKey()` ADDS the new key while
 * keeping prior keys — so ciphertext from before a rotation still decrypts.
 * Retire old keys explicitly (once their data is re-encrypted) via
 * `pruneKeyVersions()`.
 *
 * @param config - Provider configuration including the hex-encoded 256-bit key.
 * @returns An `AesEncryptionProvider` using AES-256-GCM.
 */
export const createProvider = (config: AesConfig): AesEncryptionProvider => {
  let currentVersion = config.keyVersion ?? 1
  let currentKey = Buffer.from(config.key, 'hex')

  // Version -> key buffer. Rotation adds a new version and retains prior keys,
  // so ciphertext tagged with an older `v{n}` still decrypts. Seed historical
  // keys first, then set the current one so it wins on any version collision.
  const keyring = new Map<number, Buffer>()
  for (const prior of config.priorKeys ?? []) {
    keyring.set(prior.version, Buffer.from(prior.key, 'hex'))
  }
  keyring.set(currentVersion, currentKey)

  return {
    async encrypt(plaintext: string, context?: string): Promise<string> {
      const iv = randomBytes(IV_LENGTH)
      const cipher = createCipheriv(ALGORITHM, currentKey, iv, { authTagLength: AUTH_TAG_LENGTH })

      if (context) {
        cipher.setAAD(Buffer.from(context, 'utf-8'))
      }

      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
      const authTag = cipher.getAuthTag()

      return `v${currentVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
    },

    async decrypt(ciphertext: string, context?: string): Promise<string> {
      const parts = ciphertext.split(':')
      if (parts.length !== 4) {
        throw new Error('Invalid ciphertext format')
      }

      const version = parseKeyVersion(parts[0])
      if (version === null) {
        throw new Error('Invalid ciphertext format: missing or malformed key version prefix')
      }

      // Select the key that ENCRYPTED this ciphertext by its version tag — not
      // the current key — so pre-rotation ciphertext decrypts with its own key.
      const key = keyring.get(version)
      if (!key) {
        throw new Error(
          `No encryption key available for key version ${version}; ` +
            `seed it via priorKeys or do not prune it before re-encrypting its ciphertext`,
        )
      }

      const iv = Buffer.from(parts[1], 'hex')
      const authTag = Buffer.from(parts[2], 'hex')
      const encrypted = Buffer.from(parts[3], 'hex')

      const decipher = createDecipheriv(ALGORITHM, key, iv, {
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

      if (oldBuffer.length !== currentKey.length || !timingSafeEqual(oldBuffer, currentKey)) {
        throw new Error('Old key does not match the current encryption key')
      }

      // Add the new key at the next version and make it current. The prior key
      // stays in the keyring so ciphertext tagged with the old version still
      // decrypts — rotation NEVER orphans existing data. Retire old keys
      // explicitly with pruneKeyVersions() once their data is re-encrypted.
      currentVersion += 1
      currentKey = Buffer.from(newKey, 'hex')
      keyring.set(currentVersion, currentKey)
    },

    pruneKeyVersions(keep?: number[]): number[] {
      const retained = new Set<number>([currentVersion, ...(keep ?? [])])
      const pruned: number[] = []

      for (const version of keyring.keys()) {
        if (!retained.has(version)) {
          pruned.push(version)
        }
      }
      for (const version of pruned) {
        keyring.delete(version)
      }

      return pruned
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: AesEncryptionProvider | null = null

/**
 * Default AES-256-GCM encryption provider instance.
 *
 * Lazily initializes on first property access using the `ENCRYPTION_KEY`
 * environment variable (hex-encoded 256-bit key). This singleton starts a
 * fresh keyring at version 1 on each process, so a rotation performed in a
 * prior process is NOT restored here — for rotation that survives restarts,
 * construct with `createProvider({ key, priorKeys })` seeding the historical
 * keys from your secret store.
 *
 * @throws {Error} If `ENCRYPTION_KEY` environment variable is not set.
 */
export const provider: AesEncryptionProvider = new Proxy({} as AesEncryptionProvider, {
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      const key = process.env['ENCRYPTION_KEY']
      if (!key) {
        throw new Error(
          'ENCRYPTION_KEY environment variable is required for AES encryption provider',
        )
      }
      _provider = createProvider({ key })
    }
    return Reflect.set(_provider, prop, value)
  },
})
