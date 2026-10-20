/**
 * Web content provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-web-content-readability`) call
 * `setProvider()` during setup. Application code uses the `fetchContent` /
 * `extractContent` convenience functions, which delegate to the bonded
 * provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  WebContentOptions,
  WebContentProvider,
  WebContentResult,
  WebContentSource,
} from './types.js'

const BOND_TYPE = 'web-content'
expectBond(BOND_TYPE)

/**
 * Registers a web content provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The web content provider implementation to bond.
 */
export const setProvider = (provider: WebContentProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded web content provider, throwing if none is configured.
 *
 * @returns The bonded web content provider.
 * @throws {Error} If no web content provider has been bonded.
 */
export const getProvider = (): WebContentProvider => {
  try {
    return bondRequire<WebContentProvider>(BOND_TYPE)
  } catch (_error) {
    throw new Error(
      t('web-content.error.noProvider', undefined, {
        defaultValue: 'Web content provider not configured. Call setProvider() first.',
      }),
      { cause: _error },
    )
  }
}

/**
 * Checks whether a web content provider is currently bonded.
 *
 * @returns `true` if a web content provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Fetches a URL and returns its readable content through the bonded provider.
 *
 * @param source - The page to read (`url` required).
 * @param options - Read options (mode, format, links, settle).
 * @returns The readable content.
 * @throws {Error} If no web content provider has been bonded.
 */
export const fetchContent = async (
  source: { url: string } & Partial<WebContentSource>,
  options?: WebContentOptions,
): Promise<WebContentResult> => {
  return getProvider().fetch(source, options)
}

/**
 * Extracts readable content from HTML the caller already has, through the
 * bonded provider.
 *
 * @param source - The HTML to read (`html` required; optional `baseUrl`).
 * @param options - Extract options (format, links).
 * @returns The readable content.
 * @throws {Error} If no web content provider has been bonded.
 */
export const extractContent = async (
  source: { html: string; baseUrl?: string } & Partial<WebContentSource>,
  options?: WebContentOptions,
): Promise<WebContentResult> => {
  return getProvider().extract(source, options)
}
