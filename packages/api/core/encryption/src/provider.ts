/**
 * Encryption provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-encryption-aes`) call `setProvider()`
 * during setup. Application code uses the convenience functions which
 * delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { EncryptionProvider } from './types.js'

const BOND_TYPE = 'encryption'
expectBond(BOND_TYPE)

/**
 * Registers an encryption provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The encryption provider implementation to bond.
 */
export const setProvider = (provider: EncryptionProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded encryption provider, throwing if none is configured.
 *
 * @returns The bonded encryption provider.
 * @throws {Error} If no encryption provider has been bonded.
 */
export const getProvider = (): EncryptionProvider => {
  try {
    return bondRequire<EncryptionProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('encryption.error.noProvider', undefined, {
        defaultValue: 'Encryption provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an encryption provider is currently bonded.
 *
 * @returns `true` if an encryption provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Encrypts a plaintext string using the bonded provider.
 *
 * @param plaintext - The data to encrypt.
 * @param context - Optional additional authenticated data (AAD).
 * @returns The encrypted ciphertext string.
 * @throws {Error} If no encryption provider has been bonded.
 */
export const encrypt = async (plaintext: string, context?: string): Promise<string> => {
  return getProvider().encrypt(plaintext, context)
}

/**
 * Decrypts a ciphertext string using the bonded provider.
 *
 * @param ciphertext - The encrypted data to decrypt.
 * @param context - Optional additional authenticated data (AAD).
 * @returns The decrypted plaintext string.
 * @throws {Error} If no encryption provider has been bonded.
 */
export const decrypt = async (ciphertext: string, context?: string): Promise<string> => {
  return getProvider().decrypt(ciphertext, context)
}

/**
 * Produces a one-way hash of the given data using the bonded provider.
 *
 * @param data - The data to hash.
 * @returns The hash string.
 * @throws {Error} If no encryption provider has been bonded.
 */
export const hash = async (data: string): Promise<string> => {
  return getProvider().hash(data)
}

/**
 * Verifies that data matches a previously computed hash.
 *
 * @param data - The original data to verify.
 * @param hashed - The hash to verify against.
 * @returns `true` if the data matches the hash.
 * @throws {Error} If no encryption provider has been bonded.
 */
export const verify = async (data: string, hashed: string): Promise<boolean> => {
  return getProvider().verify(data, hashed)
}

/**
 * Rotates the encryption key using the bonded provider.
 *
 * @param oldKey - The current encryption key.
 * @param newKey - The new encryption key to rotate to.
 * @throws {Error} If no encryption provider has been bonded.
 */
export const rotateKey = async (oldKey: string, newKey: string): Promise<void> => {
  return getProvider().rotateKey(oldKey, newKey)
}
