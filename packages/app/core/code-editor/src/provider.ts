/**
 * Code editor bond accessor.
 *
 * Bond packages (e.g. a Monaco or CodeMirror wrapper) call `setProvider()`
 * during setup. Application code uses `requireProvider()` to mount an
 * editor, open files, and subscribe to changes.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { EditorProvider } from './types.js'

const BOND_TYPE = 'code-editor'

/**
 * Registers a code editor provider as the active singleton.
 *
 * @param provider - The editor provider implementation to bond.
 */
export function setProvider(provider: EditorProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded code editor provider, or `null` if none is bonded.
 *
 * @returns The bonded editor provider, or `null`.
 */
export function getProvider(): EditorProvider | null {
  return bondGet<EditorProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a code editor provider is currently bonded.
 *
 * @returns `true` if a code editor provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded code editor provider, throwing if none is configured.
 *
 * @returns The bonded editor provider.
 * @throws {Error} If no code editor provider has been bonded.
 */
export function requireProvider(): EditorProvider {
  const provider = bondGet<EditorProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('codeEditor.error.noProvider', undefined, {
        defaultValue: 'Code editor provider not configured. Bond a code editor provider first.',
      }),
    )
  }
  return provider
}
