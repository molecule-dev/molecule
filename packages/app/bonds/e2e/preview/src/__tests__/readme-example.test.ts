/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a REAL Vite dev server carrying the
 * REAL `molE2EPreviewPlugin()`, a headless Chromium tab standing in for the
 * person's preview tab, and the REAL bond bonded into `@molecule/app-e2e`,
 * discovering the dev server through `MOL_E2E_PREVIEW_PORT`.
 *
 * Chromium falls back to any build under `PLAYWRIGHT_BROWSERS_PATH` when the
 * exact revision Playwright expects is missing (an environment gap, not
 * something the example controls). Skips when no browser can launch at all,
 * like `browser.integration.test.ts`.
 *
 * @module
 */
import { existsSync, readdirSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'

import { type Browser, chromium, type Page } from '@playwright/test'
import { createServer, type Plugin, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-e2e'

import type { PreviewConnectOptions } from '../index.js'
import { provider } from '../index.js'
import { molE2EPreviewPlugin } from '../vite.js'

/**
 * The installed Playwright Chromium, or any Chromium under
 * `PLAYWRIGHT_BROWSERS_PATH` when the exact revision is missing.
 *
 * @returns An executable path, or `undefined` to let Playwright pick.
 */
function chromiumExecutable(): string | undefined {
  if (existsSync(chromium.executablePath())) return undefined
  const root = process.env['PLAYWRIGHT_BROWSERS_PATH'] ?? '/opt/pw-browsers'
  if (!existsSync(root)) return undefined
  for (const entry of readdirSync(root)) {
    const candidate = join(root, entry, 'chrome-linux', 'chrome')
    if (entry.startsWith('chromium-') && existsSync(candidate)) return candidate
  }
  return undefined
}

const APP_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><title>Field Notes</title></head><body>' +
  '<h1>Field Notes</h1><p style="font-size:20px">Hello</p>' +
  `<button onclick="document.getElementById('out').textContent='saved'">Save</button>` +
  '<div id="out"></div></body></html>'

/** The app's own dev route (the plugin tags every HTML response the dev server sends). */
const appRoute: Plugin = {
  name: 'test:app-route',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if ((req.url ?? '').split('?')[0] !== '/') return next()
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(APP_HTML)
    })
  },
}

let server: ViteDevServer
let browser: Browser | null = null
let tab: Page | null = null
let launchError = ''

beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: import.meta.dirname + '/fixtures/dev-app',
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1', strictPort: false },
    plugins: [appRoute, molE2EPreviewPlugin()],
  })
  await server.listen()
  const port = (server.httpServer?.address() as AddressInfo).port
  process.env['MOL_E2E_PREVIEW_PORT'] = String(port)
  try {
    const executablePath = chromiumExecutable()
    browser = await chromium.launch(executablePath ? { executablePath } : {})
    tab = await browser.newPage()
    await tab.goto(`http://127.0.0.1:${port}/`)
  } catch (error) {
    launchError = String((error as Error).message).split('\n')[0] ?? 'unknown'
    console.warn(`[app-e2e-preview] skipping the README example test: ${launchError}`)
  }
}, 60_000)

afterAll(async () => {
  delete process.env['MOL_E2E_PREVIEW_PORT']
  await tab?.close()
  await browser?.close()
  await server?.close()
})

describe('README @example', () => {
  it('drives the open preview tab through the bonded preview provider', async ({ skip }) => {
    if (!tab) skip()

    setProvider(provider)

    const options: PreviewConnectOptions = { connectTimeout: 5_000, timeout: 5_000 }
    const page = await requireProvider().connect(options)
    let heading: string | null
    let fontSize: string
    try {
      heading = await page.getByRole('heading', { level: 1 }).textContent()
      fontSize = await page
        .locator('p')
        .first()
        .evaluate((el) => getComputedStyle(el).fontSize)
      await page.getByRole('button', { name: 'Save' }).click()
    } finally {
      await page.close()
    }

    expect(heading).toBe('Field Notes')
    expect(fontSize).toBe('20px')
    // The click really happened in the person's tab, which is still open.
    expect(await tab?.locator('#out').textContent()).toBe('saved')
    expect(tab?.isClosed()).toBe(false)
  }, 60_000)
})
