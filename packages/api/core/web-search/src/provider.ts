/**
 * Web search provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  isBonded,
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { WebSearchProvider } from './types.js'

const BOND_TYPE = 'web-search'
expectBond(BOND_TYPE)

/**
 * Registers a web search provider.
 *
 * @param provider - The web search provider to bond.
 */
export function setProvider(provider: WebSearchProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded web search provider, or `null` if none is bonded.
 *
 * @returns The bonded provider, or `null`.
 */
export function getProvider(): WebSearchProvider | null {
  return bondGet<WebSearchProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a web search provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded web search provider, throwing if none is bonded.
 * Use this when web search functionality is required.
 *
 * @returns The bonded web search provider.
 */
export function requireProvider(): WebSearchProvider {
  try {
    return bondRequire<WebSearchProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('webSearch.error.noProvider', undefined, {
        defaultValue:
          'Web search provider not configured. Bond a web-search provider first (e.g. @molecule/api-web-search-brave).',
      }),
      { cause: error },
    )
  }
}
