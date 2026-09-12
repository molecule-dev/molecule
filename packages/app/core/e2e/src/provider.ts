/**
 * The e2e bond accessor: which provider opens pages, and which one the
 * current environment should use.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import process from 'node:process'

import { bond, get } from '@molecule/app-bond'

import type { E2EProvider, E2EProviderName } from './types.js'

const BOND_TYPE = 'e2e'

/** Bond the provider that opens pages (call once, from the project's `e2e/bonds.ts`). */
export const setProvider = (provider: E2EProvider): void => {
  bond(BOND_TYPE, provider)
}

/** The bonded provider, or `null`. */
export const getProvider = (): E2EProvider | null => get<E2EProvider>(BOND_TYPE) ?? null

/** Whether a provider is bonded. */
export const hasProvider = (): boolean => get<E2EProvider>(BOND_TYPE) !== undefined

/** The bonded provider; throws with the fix when none is. */
export const requireProvider = (): E2EProvider => {
  const provider = get<E2EProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      "No e2e provider is bonded. Import your project's e2e/bonds.ts (or call setProvider() from @molecule/app-e2e) " +
        'before the tests run. In a molecule sandbox that file bonds @molecule/app-e2e-preview, which drives the live preview; ' +
        'on your own machine it bonds @molecule/app-e2e-playwright.',
    )
  }
  return provider
}

/** The sandbox writes this marker at boot; its presence means "drive the live preview". */
export const SANDBOX_MARKER_PATH = '/etc/mol/app-root'

/**
 * Which provider this environment should use: `MOL_E2E_PROVIDER` when set;
 * otherwise `preview` inside a molecule sandbox (the marker file exists) and
 * `playwright` everywhere else. Both `test` and the scaffolded `e2e/bonds.ts`
 * read this, so the runner's shape and the bonded provider always agree.
 */
export const resolveE2EProviderName = (): E2EProviderName => {
  const fromEnv = process.env['MOL_E2E_PROVIDER']?.trim()
  if (fromEnv) return fromEnv
  try {
    if (existsSync(SANDBOX_MARKER_PATH)) return 'preview'
  } catch (_error) {
    /* unreadable filesystem — not a sandbox */
  }
  return 'playwright'
}
