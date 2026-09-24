/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Playwright bond with the
 * browser launch (`@playwright/test`'s `chromium`) mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const browser = vi.hoisted(() => {
  const evaluate = vi.fn(async () => '16px')
  const first = vi.fn(() => ({ evaluate }))
  const locator = vi.fn(() => ({ first }))
  const page = { goto: vi.fn(async () => null), locator, close: vi.fn(async () => undefined) }
  const context = { newPage: vi.fn(async () => page), close: vi.fn(async () => undefined) }
  const instance = { newContext: vi.fn(async () => context), close: vi.fn(async () => undefined) }
  const launch = vi.fn(async () => instance)
  return { launch, instance, context, page, locator, evaluate }
})

vi.mock('@playwright/test', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  chromium: { launch: browser.launch },
  firefox: { launch: browser.launch },
  webkit: { launch: browser.launch },
}))

import { provider as playwright } from '@molecule/app-e2e-playwright'
import { provider as preview } from '@molecule/app-e2e-preview'

import { getProvider, requireProvider, resolveE2EProviderName, setProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('MOL_E2E_PROVIDER', 'playwright')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('bonds the resolved provider and measures a page through it', async () => {
    setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
    expect(getProvider()).toBe(playwright)

    const page = await requireProvider().connect({
      baseURL: 'http://localhost:5173',
      viewport: { width: 390, height: 844 },
    })
    await page.goto('/blog/hello/')
    const fontSize = await page
      .locator('article p')
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize)
    await page.close()

    expect(fontSize).toBe('16px')
    expect(browser.launch).toHaveBeenCalledWith({ headless: true })
    expect(browser.instance.newContext).toHaveBeenCalledWith({
      baseURL: 'http://localhost:5173',
      viewport: { width: 390, height: 844 },
    })
    expect(browser.page.goto).toHaveBeenCalledWith('/blog/hello/')
    expect(browser.locator).toHaveBeenCalledWith('article p')
    expect(browser.context.close).toHaveBeenCalledTimes(1)
    expect(browser.instance.close).toHaveBeenCalledTimes(1)
  })

  it('picks the preview bond when MOL_E2E_PROVIDER=preview', () => {
    vi.stubEnv('MOL_E2E_PROVIDER', 'preview')
    setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
    expect(requireProvider()).toBe(preview)
  })
})
