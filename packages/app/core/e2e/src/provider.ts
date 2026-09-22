/**
 * The e2e bond accessor: which provider opens pages, and which one the
 * current environment should use.
 *
 * @module
 */

import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
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
        'before the tests run. That file bonds @molecule/app-e2e-playwright (a real browser: baked into every molecule sandbox, ' +
        'and on your own machine once you run `npx playwright install chromium`) or @molecule/app-e2e-preview (the live IDE preview).',
    )
  }
  return provider
}

/** The molecule sandbox writes this marker at boot; its presence means "this is a molecule sandbox". */
export const SANDBOX_MARKER_PATH = '/etc/mol/app-root'

/** Whether this process runs inside a molecule sandbox (the marker file exists). */
export const isMoleculeSandbox = (): boolean => {
  try {
    return existsSync(SANDBOX_MARKER_PATH)
  } catch (_error) {
    return false // an unreadable filesystem is not a sandbox
  }
}

/**
 * Where Playwright keeps its browsers: `PLAYWRIGHT_BROWSERS_PATH` when set
 * (the molecule sandbox images bake Chromium under it), otherwise Playwright's
 * own default, `~/.cache/ms-playwright`.
 */
export const playwrightBrowsersPath = (): string => {
  const fromEnv = process.env['PLAYWRIGHT_BROWSERS_PATH']?.trim()
  if (fromEnv && fromEnv !== '0') return fromEnv
  return join(homedir(), '.cache', 'ms-playwright')
}

/**
 * Whether a Playwright Chromium (the full browser or the headless shell) is
 * installed where Playwright will look for it — that is, whether the
 * `playwright` bond can launch here. The `PLAYWRIGHT_BROWSERS_PATH=0` layout
 * (browsers inside `node_modules`) is not probed and reads as "not installed".
 */
export const hasInstalledBrowser = (): boolean => {
  try {
    return readdirSync(playwrightBrowsersPath()).some((entry) => /^chromium/u.test(entry))
  } catch (_error) {
    return false // no such directory: nothing is installed there
  }
}

/**
 * Which provider this environment should use: `MOL_E2E_PROVIDER` when set;
 * otherwise, inside a molecule sandbox, `playwright` when a Playwright browser
 * is installed there (every current sandbox image bakes one) and `preview` when
 * none is (an older image — the live IDE preview is then the only renderer);
 * and `playwright` everywhere else. Both `test` and the scaffolded
 * `e2e/bonds.ts` read this, so the runner's shape and the bonded provider
 * always agree.
 */
export const resolveE2EProviderName = (): E2EProviderName => {
  const fromEnv = process.env['MOL_E2E_PROVIDER']?.trim()
  if (fromEnv) return fromEnv
  if (isMoleculeSandbox()) return hasInstalledBrowser() ? 'playwright' : 'preview'
  return 'playwright'
}
