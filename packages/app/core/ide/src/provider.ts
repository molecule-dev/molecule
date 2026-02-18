/**
 * IDE workspace bond accessor.
 *
 * Bond packages call `setProvider()` during setup. Application code uses
 * `requireProvider()` to access IDE workspace operations (panels, tabs,
 * file tree, terminal, etc.).
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { WorkspaceProvider } from './types.js'

const BOND_TYPE = 'ide'

/**
 * Registers an IDE workspace provider as the active singleton.
 *
 * @param provider - The workspace provider implementation to bond.
 */
export function setProvider(provider: WorkspaceProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded IDE workspace provider, or `null` if none is bonded.
 *
 * @returns The bonded workspace provider, or `null`.
 */
export function getProvider(): WorkspaceProvider | null {
  return bondGet<WorkspaceProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an IDE workspace provider is currently bonded.
 *
 * @returns `true` if an IDE workspace provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded IDE workspace provider, throwing if none is configured.
 *
 * @returns The bonded workspace provider.
 * @throws {Error} If no IDE workspace provider has been bonded.
 */
export function requireProvider(): WorkspaceProvider {
  const provider = bondGet<WorkspaceProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('ide.error.noProvider', undefined, {
        defaultValue: 'IDE workspace provider not configured. Bond an IDE provider first.',
      }),
    )
  }
  return provider
}
