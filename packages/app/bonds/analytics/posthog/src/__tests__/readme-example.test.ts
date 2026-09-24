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
  capture: vi.fn(),
  group: vi.fn(),
  reset: vi.fn(),
  __loaded: false,
}))

// The outside world: the posthog-js SDK (network), mocked like provider.test.ts.
vi.mock('posthog-js', () => ({ posthog: sdk }))

import {
  group,
  hasProvider,
  identify,
  page,
  reset,
  setProvider,
  track,
} from '@molecule/app-analytics'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds PostHog with key + host and forwards core calls to the SDK', async () => {
    const apiKey: string | undefined = 'phc_your_project_key'
    const host: string | undefined = 'https://eu.i.posthog.com'
    if (apiKey) {
      setProvider(createProvider({ apiKey, ...(host ? { host } : {}) }))
    }

    await identify({ userId: 'u_123', email: 'ada@example.com', name: 'Ada' })
    await group('org_42', { name: 'Acme' })
    await page({ path: '/checkout', name: 'Checkout' })
    await track({ name: 'order_placed', properties: { total: 42.5, currency: 'USD' } })
    await reset()

    expect(hasProvider()).toBe(true)
    expect(sdk.init).toHaveBeenCalledWith('phc_your_project_key', {
      api_host: 'https://eu.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
    })
    expect(sdk.identify).toHaveBeenCalledWith('u_123', { email: 'ada@example.com', name: 'Ada' })
    expect(sdk.group).toHaveBeenCalledWith('company', 'org_42', { name: 'Acme' })
    expect(sdk.capture).toHaveBeenCalledWith(
      '$pageview',
      expect.objectContaining({ $pathname: '/checkout', page_name: 'Checkout' }),
    )
    expect(sdk.capture).toHaveBeenCalledWith('order_placed', { total: 42.5, currency: 'USD' })
    expect(sdk.reset).toHaveBeenCalledTimes(1)
  })
})
