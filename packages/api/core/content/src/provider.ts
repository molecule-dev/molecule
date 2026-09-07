/**
 * Content provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-content-markdown`) call `setProvider()`
 * during setup. Application and build code uses the convenience functions,
 * which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  ContentProvider,
  ContentReadOptions,
  ContentRecord,
  ContentSource,
  ContentValidationError,
} from './types.js'

const BOND_TYPE = 'content'

expectBond(BOND_TYPE)

/**
 * Registers a content provider as the active singleton. Called by bond
 * packages during application startup, or by a build script.
 *
 * @param provider - The content provider implementation to bond.
 */
export const setProvider = (provider: ContentProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded content provider, throwing if none is configured.
 *
 * @returns The bonded content provider.
 * @throws {Error} If no content provider has been bonded.
 */
export const getProvider = (): ContentProvider => {
  try {
    return bondRequire<ContentProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('content.error.noProvider', undefined, {
        defaultValue: 'Content provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a content provider is currently bonded.
 *
 * @returns `true` if a content provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Parses one file's source into a record through the bonded provider.
 *
 * @param input - The file's source and path.
 * @param options - Validation options.
 * @returns The record.
 * @throws {ContentValidationError} When the file is malformed.
 */
export const parseContent = (input: ContentSource, options?: ContentReadOptions): ContentRecord => {
  return getProvider().parse(input, options)
}

/**
 * Reads every content file under a directory through the bonded provider.
 *
 * @param dir - The directory to read.
 * @param options - Validation and filtering options.
 * @returns The records, newest first, drafts excluded unless asked for.
 * @throws {ContentValidationError} On the first malformed file, or a duplicate slug.
 */
export const readContentDirectory = (
  dir: string,
  options?: ContentReadOptions,
): Promise<ContentRecord[]> => {
  return getProvider().readDirectory(dir, options)
}

/**
 * Whether an error is a content validation error, from any provider.
 *
 * @param error - The caught value.
 * @returns `true` when it carries `code: 'CONTENT_VALIDATION'`.
 */
export const isContentValidationError = (error: unknown): error is ContentValidationError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'CONTENT_VALIDATION' &&
    typeof (error as { path?: unknown }).path === 'string'
  )
}
