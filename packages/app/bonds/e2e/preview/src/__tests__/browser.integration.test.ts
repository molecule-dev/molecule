/**
 * The whole preview bond in a REAL browser: an HTTP server carrying the hub and
 * the client script, headless Chromium showing the page (standing in for the
 * IDE's preview tab), and the driver turning that tab into a Playwright-shaped
 * page. Skips when no Playwright browser is installed on this machine.
 */
import { createServer, type Server } from 'node:http'

import { type Browser, chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, describe, it } from 'vitest'

import { E2EUnsupportedError } from '@molecule/app-e2e'
import { expect } from '@molecule/app-e2e-fixtures-default'

import { E2E_PREVIEW_CLIENT_SCRIPT } from '../client.js'
import { connectPreview, listPreviewPages } from '../provider.js'
import { attachE2EHub, type E2EHub } from '../server.js'
import { E2E_CLIENT_PATH } from '../types.js'

const html = (title: string, body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><script src="${E2E_CLIENT_PATH}"></script></head><body>${body}</body></html>`

const PAGES: Record<string, string> = {
  '/': html(
    'Home',
    `<h1>Field Notes</h1>
     <p id="lead" style="font-size:20px">Hello <span>world</span></p>
     <button id="go" onclick="document.getElementById('out').textContent='clicked'">Save</button>
     <div id="out"></div>
     <a href="/second">Second</a>
     <label for="q">Search</label><input id="q" />
     <div id="cover" style="position:fixed;left:0;top:0;width:100vw;height:100vh;display:none"></div>`,
  ),
  '/second': html('Second', `<h1>Second page</h1><a href="/">Back home</a>`),
}

let browserAvailable = true
let browser: Browser | null = null
let tab: Page | null = null
let server: Server
let hub: E2EHub
let port = 0

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    if (url === E2E_CLIENT_PATH) {
      res.setHeader('content-type', 'text/javascript')
      res.end(E2E_PREVIEW_CLIENT_SCRIPT)
      return
    }
    if (url === '/api/ping') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ pong: true, cookie: req.headers.cookie ?? '' }))
      return
    }
    const body = PAGES[url]
    if (!body) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(body)
  })
  hub = attachE2EHub(server)
  port = await new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })
  try {
    browser = await chromium.launch()
    tab = await browser.newPage({ viewport: { width: 1000, height: 700 } })
    await tab.goto(`http://127.0.0.1:${port}/`)
  } catch (error) {
    browserAvailable = false
    console.warn(
      `[app-e2e-preview] skipping the browser integration test: ${String((error as Error).message).split('\n')[0]}`,
    )
  }
}, 60_000)

afterAll(async () => {
  await tab?.close().catch(() => undefined)
  await browser?.close().catch(() => undefined)
  hub.close()
  await new Promise((r) => server.close(r))
})

describe('the preview bond in a real browser', () => {
  it('sees the tab as a connected page', async ({ skip }) => {
    if (!browserAvailable) skip()
    const pages = await listPreviewPages({ port, connectTimeout: 5_000 })
    expect(pages.length).toBeGreaterThanOrEqual(1)
    expect(pages[0].href).toBe(`http://127.0.0.1:${port}/`)
  })

  it('drives the tab like Playwright: locators, actions, expect, request, evaluate, navigation', async ({
    skip,
  }) => {
    if (!browserAvailable) skip()
    const page = await connectPreview({ port, connectTimeout: 5_000, timeout: 3_000 })
    try {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Field Notes')
      expect(
        await page.locator('#lead').evaluate((el: Element) => getComputedStyle(el).fontSize),
      ).toBe('20px')
      const box = await page.locator('#lead').boundingBox()
      expect(box?.width).toBeGreaterThan(50)

      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.locator('#out')).toHaveText('clicked')
      await page.getByLabel('Search').fill('git')
      await expect(page.getByLabel('Search')).toHaveValue('git')

      // A covered element is reported as intercepted, like Playwright does.
      await page.evaluate(() => {
        document.getElementById('cover')!.style.display = 'block'
      })
      await expect(
        page.getByRole('button', { name: 'Save' }).click({ timeout: 600 }),
      ).rejects.toThrow(/intercepts pointer events/)
      await page.evaluate(() => {
        document.getElementById('cover')!.style.display = 'none'
      })

      const res = await page.request.get('/api/ping')
      expect(res.status()).toBe(200)
      expect(await res.json()).toMatchObject({ pong: true })

      const seen: string[] = []
      page.on('console', (m) => seen.push(`${m.type()}:${m.text()}`))
      page.on('pageerror', (e) => seen.push(`pageerror:${e.message}`))
      await page.evaluate(() => {
        console.error('boom')
        setTimeout(() => {
          throw new Error('late failure')
        }, 0)
      })
      await new Promise((r) => setTimeout(r, 300))
      expect(seen).toContain('error:boom')
      expect(seen.some((s) => s.startsWith('pageerror:late failure'))).toBe(true)

      // A link click navigates; the driver follows to the new document.
      await page.getByRole('link', { name: 'Second' }).click()
      await expect(page).toHaveURL('/second')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Second page')
      await page.goto('/')
      await expect(page).toHaveTitle('Home')
      await page.goto(`http://localhost:${port}/second`) // a "local base URL" is rewritten to the page's origin
      await expect(page).toHaveURL('/second')
      await page.goBack()
      await expect(page).toHaveURL('/')
      expect(page.url()).toBe(`http://127.0.0.1:${port}/`)
      expect(await page.title()).toBe('Home')

      // Not framed by the IDE: the tab cannot be resized, and the call says so.
      await expect(page.setViewportSize({ width: 390, height: 844 })).rejects.toBeInstanceOf(
        E2EUnsupportedError,
      )
    } finally {
      await page.close()
    }
  }, 30_000)
})
