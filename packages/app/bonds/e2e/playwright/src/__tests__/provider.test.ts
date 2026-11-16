import { describe, expect, it } from 'vitest'

import { connectPlaywright, provider } from '../provider.js'
import type { PlaywrightBrowserName, PlaywrightConnectOptions } from '../types.js'

describe('the playwright bond', () => {
  it('is named playwright and rejects an unknown browser before launching', async () => {
    expect(provider.name).toBe('playwright')
    // 'edge' is deliberately invalid input: the bond must reject it before launching.
    const browser = 'edge' as PlaywrightBrowserName
    const options: PlaywrightConnectOptions = { browser }
    await expect(provider.connect(options)).rejects.toThrow(/unknown browser "edge"/)
  })

  it('opens a real page when a browser is installed, closing browser + context with the page', async ({
    skip,
  }) => {
    let page
    try {
      page = await connectPlaywright({ viewport: { width: 500, height: 400 } })
    } catch (error) {
      console.warn(
        `[app-e2e-playwright] skipping the launch test: ${String((error as Error).message).split('\n')[0]}`,
      )
      skip()
      return
    }
    expect(page.viewportSize()).toEqual({ width: 500, height: 400 })
    await page.setContent('<h1>hi</h1>')
    expect(await page.locator('h1').textContent()).toBe('hi')
    const browser = page.context().browser()
    await page.close()
    expect(browser?.isConnected()).toBe(false)
  }, 30_000)
})
