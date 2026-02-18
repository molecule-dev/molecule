/**
 * Live preview bond accessor.
 *
 * Bond packages call `setProvider()` during setup. Application code uses
 * `requireProvider()` to render live previews of user projects in an
 * iframe or sandboxed environment.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { PreviewProvider } from './types.js'

const BOND_TYPE = 'live-preview'

/**
 * Registers a live preview provider as the active singleton.
 *
 * @param provider - The preview provider implementation to bond.
 */
export function setProvider(provider: PreviewProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded live preview provider, or `null` if none is bonded.
 *
 * @returns The bonded preview provider, or `null`.
 */
export function getProvider(): PreviewProvider | null {
  return bondGet<PreviewProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a live preview provider is currently bonded.
 *
 * @returns `true` if a live preview provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded live preview provider, throwing if none is configured.
 *
 * @returns The bonded preview provider.
 * @throws {Error} If no live preview provider has been bonded.
 */
export function requireProvider(): PreviewProvider {
  const provider = bondGet<PreviewProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('livePreview.error.noProvider', undefined, {
        defaultValue: 'Live preview provider not configured. Bond a live preview provider first.',
      }),
    )
  }
  return provider
}
