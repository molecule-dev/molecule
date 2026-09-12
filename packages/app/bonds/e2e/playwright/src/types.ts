/**
 * Options for opening a real Playwright browser through the bond.
 *
 * @module
 */

import type { LaunchOptions } from '@playwright/test'

import type { E2EConnectOptions } from '@molecule/app-e2e'

/** Which Playwright browser to launch. */
export type PlaywrightBrowserName = 'chromium' | 'firefox' | 'webkit'

/** Options for `provider.connect()` beyond the core's. */
export interface PlaywrightConnectOptions extends E2EConnectOptions {
  /** Browser to launch; default `chromium` (also `MOL_E2E_BROWSER`). */
  browser?: PlaywrightBrowserName
  /** Show the browser window; default headless (also `MOL_E2E_HEADED=1`). */
  headed?: boolean
  /** Extra launch options passed through to Playwright. */
  launchOptions?: LaunchOptions
}
