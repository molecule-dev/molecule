/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  track: vi.fn(),
  people: { set: vi.fn() },
  set_group: vi.fn(),
  get_group: vi.fn(() => ({ set: vi.fn() })),
  reset: vi.fn(),
}))

// The outside world: the mixpanel-browser SDK (network), mocked like provider.test.ts.
vi.mock('mixpanel-browser', () => ({ default: sdk }))

import { hasProvider, identify, page, setProvider, track } from '@molecule/app-analytics'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds Mixpanel with the Vite token and sends identify/page/track through the core', async () => {
    const token: string | undefined = 'your_mixpanel_project_token'
    if (token) {
      setProvider(createProvider({ token }))
    }

    await identify({ userId: 'u_123', email: 'ada@example.com', name: 'Ada' })
    await page({ path: '/checkout', name: 'Checkout' })
    await track({ name: 'order_placed', properties: { total: 42.5, currency: 'USD' } })

    expect(hasProvider()).toBe(true)
    expect(sdk.init).toHaveBeenCalledWith('your_mixpanel_project_token', {
      debug: false,
      track_pageview: false,
    })
    expect(sdk.identify).toHaveBeenCalledWith('u_123')
    expect(sdk.people.set).toHaveBeenCalledWith({ $email: 'ada@example.com', $name: 'Ada' })
    expect(sdk.track).toHaveBeenCalledWith(
      'Page View',
      expect.objectContaining({ page_name: 'Checkout', page_path: '/checkout' }),
    )
    expect(sdk.track).toHaveBeenCalledWith('order_placed', { total: 42.5, currency: 'USD' })
  })
})
