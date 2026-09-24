/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `posthog-node` SDK is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { flush, identify, setProvider, track } from '@molecule/api-analytics'

import { createProvider } from '../index.js'

const { PostHog, capture, posthogIdentify, posthogFlush } = vi.hoisted(() => {
  const capture = vi.fn()
  const posthogIdentify = vi.fn()
  const posthogFlush = vi.fn(async () => undefined)
  const PostHog = vi.fn(function () {
    return {
      identify: posthogIdentify,
      capture,
      groupIdentify: vi.fn(),
      flush: posthogFlush,
      shutdown: vi.fn(async () => undefined),
    }
  })
  return { PostHog, capture, posthogIdentify, posthogFlush }
})

vi.mock('posthog-node', () => ({ PostHog }))

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('identifies, captures and flushes through the PostHog client', async () => {
    process.env.POSTHOG_API_KEY = 'test-key'
    process.env.POSTHOG_HOST = 'https://eu.i.posthog.com'

    setProvider(
      createProvider({
        apiKey: process.env.POSTHOG_API_KEY,
        host: process.env.POSTHOG_HOST,
      }),
    )

    await identify({ userId: 'u_123', email: 'ada@example.com', name: 'Ada Lovelace' })
    await track({ name: 'purchase.completed', userId: 'u_123', properties: { plan: 'pro' } })
    await flush()

    expect(PostHog).toHaveBeenCalledWith('test-key', {
      host: 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    })
    expect(posthogIdentify).toHaveBeenCalledWith({
      distinctId: 'u_123',
      properties: { email: 'ada@example.com', name: 'Ada Lovelace' },
    })
    expect(capture).toHaveBeenCalledWith({
      distinctId: 'u_123',
      event: 'purchase.completed',
      properties: { plan: 'pro' },
      timestamp: undefined,
    })
    expect(posthogFlush).toHaveBeenCalledTimes(1)
  })
})
