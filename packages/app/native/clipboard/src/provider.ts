/**
 * `@molecule/app-clipboard`
 * Provider management for clipboard access
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { ClipboardProvider } from './types.js'

const BOND_TYPE = 'clipboard'

/**
 * Set the clipboard provider
 * @param provider - ClipboardProvider implementation
 */
export function setProvider(provider: ClipboardProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current clipboard provider
 * @throws {Error} Error if no provider is set
 * @returns The active clipboard provider instance.
 */
export function getProvider(): ClipboardProvider {
  const provider = bondGet<ClipboardProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('clipboard.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-clipboard: No provider set. Call setProvider() with a ClipboardProvider implementation (e.g., from @molecule/app-clipboard-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a clipboard provider is set
 * @returns Whether a clipboard provider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}
