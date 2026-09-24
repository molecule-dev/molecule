/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the PostHog bond with the
 * `posthog-js` SDK mocked.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
  group: vi.fn(),
  reset: vi.fn(),
  __loaded: false,
}))

vi.mock('posthog-js', () => ({ posthog: sdk }))

import { createProvider } from '@molecule/app-analytics-posthog'

import { hasProvider, identify, page, reset, setProvider, track } from '../index.js'

describe('README @example', () => {
  it('bonds PostHog and forwards identify, page, track and reset to the SDK', async () => {
    const apiKey = 'phc_your_project_key'
    setProvider(createProvider({ apiKey }))
    expect(hasProvider()).toBe(true)
    expect(sdk.init).toHaveBeenCalledWith('phc_your_project_key', {
      autocapture: false,
      capture_pageview: false,
    })

    const user = { id: 'u_123', email: 'ada@example.com', name: 'Ada' }
    await identify({ userId: user.id, email: user.email, name: user.name })
    await page({ path: '/checkout', name: 'Checkout' })
    await track({ name: 'order_placed', properties: { total: 42.5, currency: 'USD' } })
    await reset()

    expect(sdk.identify).toHaveBeenCalledWith('u_123', { email: 'ada@example.com', name: 'Ada' })
    expect(sdk.capture).toHaveBeenCalledWith(
      '$pageview',
      expect.objectContaining({ $pathname: '/checkout', page_name: 'Checkout' }),
    )
    expect(sdk.capture).toHaveBeenCalledWith('order_placed', { total: 42.5, currency: 'USD' })
    expect(sdk.reset).toHaveBeenCalledTimes(1)
  })
})
