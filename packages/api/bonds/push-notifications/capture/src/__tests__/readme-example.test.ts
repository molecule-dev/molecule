/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real push-notifications
 * and activity cores. Intercept-only mode reaches no outside world, so nothing
 * is mocked.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import type { ActivityEvent } from '@molecule/api-activity'
import { setSink } from '@molecule/api-activity'
import { send, setProvider } from '@molecule/api-push-notifications'

import { createPushCaptureProvider } from '../index.js'

describe('README @example', () => {
  it('intercepts the send, returns a synthetic 201, and records a captured push event', async () => {
    const captured: ActivityEvent[] = []
    setSink({ record: async (event) => void captured.push(event) })
    setProvider(createPushCaptureProvider())

    const result = await send(
      {
        endpoint: 'https://push.example.com/sub/abc',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      },
      { title: 'Order shipped', options: { body: 'Your order is on the way' } },
    )

    expect(result.statusCode).toBe(201)
    expect(captured).toHaveLength(1)
    expect(captured[0]).toMatchObject({
      type: 'push',
      status: 'captured',
      recipient: 'https://push.example.com/sub/abc',
      summary: 'Order shipped',
    })
  })
})
