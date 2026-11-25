/**
 * Document text provider bond accessor and convenience function.
 *
 * Bond packages (e.g. `@molecule/api-document-text-pdfjs`) call
 * `setProvider()` during setup. Application code uses the
 * `extractDocumentText` convenience function, which delegates to the bonded
 * provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { DocumentTextOptions, DocumentTextProvider, DocumentTextResult } from './types.js'

const BOND_TYPE = 'document-text'
expectBond(BOND_TYPE)

/**
 * Registers a document text provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The document text provider implementation to bond.
 */
export const setProvider = (provider: DocumentTextProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded document text provider, throwing if none is configured.
 *
 * @returns The bonded document text provider.
 * @throws {Error} If no document text provider has been bonded.
 */
export const getProvider = (): DocumentTextProvider => {
  try {
    return bondRequire<DocumentTextProvider>(BOND_TYPE)
  } catch (_error) {
    throw new Error(
      t('document-text.error.noProvider', undefined, {
        defaultValue: 'Document text provider not configured. Call setProvider() first.',
      }),
      { cause: _error },
    )
  }
}

/**
 * Checks whether a document text provider is currently bonded.
 *
 * @returns `true` if a document text provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Extracts the text of one PDF document through the bonded provider.
 *
 * @param input - The document bytes (and an optional password for an
 *   encrypted document).
 * @param options - Extract options (page bound, per-page texts).
 * @returns The extracted text.
 * @throws {Error} If no document text provider has been bonded.
 */
export const extractDocumentText = async (
  input: { data: Uint8Array; password?: string },
  options?: DocumentTextOptions,
): Promise<DocumentTextResult> => {
  return getProvider().extract(input, options)
}
