/**
 * Code sandbox bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-sandbox-docker`) call `setProvider()`
 * during setup. Application code uses `requireProvider()` to access the
 * sandbox lifecycle API (create, get, list, destroy).
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { SandboxProvider } from './types.js'

const BOND_TYPE = 'code-sandbox'

/**
 * Registers a sandbox provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The sandbox provider implementation to bond.
 */
export function setProvider(provider: SandboxProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded sandbox provider, or `null` if none is bonded.
 *
 * @returns The bonded sandbox provider, or `null`.
 */
export function getProvider(): SandboxProvider | null {
  return bondGet<SandboxProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a sandbox provider is currently bonded.
 *
 * @returns `true` if a sandbox provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded sandbox provider, throwing if none is configured.
 *
 * @returns The bonded sandbox provider.
 * @throws {Error} If no sandbox provider has been bonded.
 */
export function requireProvider(): SandboxProvider {
  try {
    return bondRequire<SandboxProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('codeSandbox.error.noProvider', undefined, {
        defaultValue: 'Code sandbox provider not configured. Bond a code-sandbox provider first.',
      }),
    )
  }
}
