/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the REAL bond is bonded into the REAL
 * `@molecule/app-e2e` core and opens a REAL headless Chromium against a local
 * HTTP server standing in for the app's dev server.
 *
 * The only addition is `launchOptions.executablePath` when this machine lacks the
 * exact Chromium revision the installed Playwright expects (an environment gap,
 * not something the example controls) — the same fallback
 * `@molecule/app-e2e-fixtures-default`'s README test uses.
 *
 * @module
 */
import { existsSync, readdirSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'

import { chromium } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-e2e'

import type { PlaywrightConnectOptions } from '../index.js'
import { provider } from '../index.js'

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

let server: Server
let baseURL: string

beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><html><body><h1>Welcome back</h1></body></html>')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('README @example', () => {
  it('bonds the playwright provider, opens a phone-sized page, reads it, screenshots, and closes the browser', async () => {
    setProvider(provider)

    const executablePath = chromiumExecutable()
    const options: PlaywrightConnectOptions = {
      baseURL,
      viewport: { width: 390, height: 844 },
      timeout: 10_000,
      ...(executablePath ? { launchOptions: { executablePath } } : {}),
    }
    const page = await requireProvider().connect(options)
    const browser = page.context().browser()
    let heading: string | null
    let bytes: number
    try {
      await page.goto('/')
      heading = await page.locator('h1').first().textContent()
      const screenshot = await page.screenshot({ fullPage: true })
      bytes = screenshot.length
      expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
      expect(screenshot.subarray(1, 4).toString('ascii')).toBe('PNG')
    } finally {
      await page.close()
    }

    expect(heading).toBe('Welcome back')
    expect(bytes).toBeGreaterThan(0)
    expect(browser?.isConnected()).toBe(false)
  }, 60_000)
})
