/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real push-notifications
 * core. Only the `web-push` library (which would reach the push services) is
 * mocked, the same way `provider.test.ts` does.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PushSubscription } from '@molecule/api-push-notifications'
import { getPublicKey, sendMany, setProvider } from '@molecule/api-push-notifications'

import { createProvider } from '../index.js'

const { sendNotification, setVapidDetails } = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}))

vi.mock('web-push', () => ({
  default: { sendNotification, setVapidDetails, generateVAPIDKeys: vi.fn() },
}))

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('VAPID_EMAIL', 'ops@example.com')
    vi.stubEnv('VAPID_PUBLIC_KEY', 'test-public-key')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('serves the public key and fans a notification out, reporting dead subscriptions', async () => {
    const gone = Object.assign(new Error('Received unexpected response code'), { statusCode: 410 })
    sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
      if (subscription.endpoint.includes('mozilla')) throw gone
      return { statusCode: 201, headers: {}, body: '' }
    })

    setProvider(createProvider())

    const applicationServerKey = getPublicKey()

    const subscriptions: PushSubscription[] = [
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keys: { p256dh: 'BNc...', auth: 'tBH...' },
      },
      {
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/def456',
        keys: { p256dh: 'BPx...', auth: 'k3r...' },
      },
    ]
    const results = await sendMany(subscriptions, {
      title: 'New message',
      options: { body: 'Ada sent you a message', data: { url: '/inbox' } },
    })
    const failedEndpoints = results
      .filter((entry) => entry.error)
      .map((entry) => entry.subscription.endpoint)

    expect(applicationServerKey).toBe('test-public-key')
    expect(setVapidDetails).toHaveBeenCalledWith(
      'mailto:ops@example.com',
      'test-public-key',
      'test-private-key',
    )
    expect(sendNotification).toHaveBeenCalledWith(
      subscriptions[0],
      JSON.stringify({
        title: 'New message',
        options: { body: 'Ada sent you a message', data: { url: '/inbox' } },
      }),
    )
    expect(results[0]?.result?.statusCode).toBe(201)
    expect(failedEndpoints).toEqual(['https://updates.push.services.mozilla.com/wpush/v2/def456'])
    expect(results[1]?.error).toBe(gone)
  })
})
