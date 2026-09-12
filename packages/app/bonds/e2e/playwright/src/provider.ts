/**
 * The bond: launches a real browser and returns its `Page`. Closing that page
 * also closes the context and the browser opened for it.
 *
 * @module
 */

import process from 'node:process'

import { chromium, firefox, type Page, webkit } from '@playwright/test'

import type { E2EProvider } from '@molecule/app-e2e'

import type { PlaywrightBrowserName, PlaywrightConnectOptions } from './types.js'

const BROWSERS = { chromium, firefox, webkit }

const browserName = (options: PlaywrightConnectOptions): PlaywrightBrowserName => {
  const name =
    options.browser ??
    (process.env['MOL_E2E_BROWSER'] as PlaywrightBrowserName | undefined) ??
    'chromium'
  if (!(name in BROWSERS))
    throw new Error(`unknown browser "${name}" — use chromium, firefox or webkit`)
  return name
}

/** The bond: `setProvider(provider)` in your `e2e/bonds.ts`. */
export const provider: E2EProvider = {
  name: 'playwright',
  async connect(options: PlaywrightConnectOptions = {}): Promise<Page> {
    const headless = !(options.headed ?? process.env['MOL_E2E_HEADED'] === '1')
    let browser
    try {
      browser = await BROWSERS[browserName(options)].launch({ headless, ...options.launchOptions })
    } catch (error) {
      const message = String((error as Error).message ?? error)
      if (/Executable doesn't exist|browserType\.launch/.test(message)) {
        throw new Error(
          `${message}\n\nInstall the browsers once with: npx playwright install ${browserName(options)}\n(inside a molecule sandbox use @molecule/app-e2e-preview instead — it drives the live preview and needs no browser).`,
          { cause: error },
        )
      }
      throw error
    }
    const context = await browser.newContext({
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
      ...(options.viewport === undefined ? {} : { viewport: options.viewport }),
    })
    if (options.timeout) context.setDefaultTimeout(options.timeout)
    if (options.navigationTimeout) context.setDefaultNavigationTimeout(options.navigationTimeout)
    const page = await context.newPage()
    const closePage = page.close.bind(page)
    page.close = async (closeOptions?: Parameters<Page['close']>[0]) => {
      await closePage(closeOptions).catch(() => undefined)
      await context.close().catch(() => undefined)
      await browser.close().catch(() => undefined)
    }
    return page
  },
}

/** Open a real browser page from any script. */
export const connectPlaywright = (options: PlaywrightConnectOptions = {}): Promise<Page> =>
  provider.connect(options)
