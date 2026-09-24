/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the web-push bond, with only
 * the `web-push` library (the network) mocked, as the bond's own unit tests do.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { setVapidDetails, sendNotification } = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock('web-push', () => ({
  default: { setVapidDetails, sendNotification, generateVAPIDKeys: vi.fn() },
}))

import { createProvider } from '@molecule/api-push-notifications-web-push'

import type { PushSubscription } from '../index.js'
import { configure, getPublicKey, sendMany, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('configures VAPID, serves the public key, sends, and finds gone endpoints in `error`', async () => {
    vi.stubEnv('VAPID_EMAIL', 'ops@example.com')
    vi.stubEnv('VAPID_PUBLIC_KEY', 'test-public-key')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    sendNotification.mockImplementation(async (subscription: PushSubscription) => {
      if (subscription.endpoint.endsWith('/gone')) {
        throw Object.assign(new Error('Received unexpected response code'), { statusCode: 410 })
      }
      return { statusCode: 201, headers: {}, body: '' }
    })

    setProvider(createProvider())
    configure({
      email: process.env.VAPID_EMAIL ?? 'ops@example.com',
      publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
      privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    })
    expect(setVapidDetails).toHaveBeenCalledWith(
      'mailto:ops@example.com',
      'test-public-key',
      'test-private-key',
    )

    const publicKey = getPublicKey()
    expect(publicKey).toBe('test-public-key')

    const subscriptions: PushSubscription[] = [
      { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'BNc', auth: 'tBH' } },
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/gone',
        keys: { p256dh: 'BNd', auth: 'tBI' },
      },
    ]

    const results = await sendMany(subscriptions, {
      title: 'New message',
      options: { body: 'Ada sent you a message', data: { url: '/inbox' } },
    })
    const gone = results
      .filter((r) => {
        const status = (r.error as { statusCode?: number } | undefined)?.statusCode
        return status === 404 || status === 410
      })
      .map((r) => r.subscription.endpoint)

    expect(results[0]?.result?.statusCode).toBe(201)
    expect(gone).toEqual(['https://fcm.googleapis.com/fcm/send/gone'])
    expect(JSON.parse(String(sendNotification.mock.calls[0]?.[1]))).toEqual({
      title: 'New message',
      options: { body: 'Ada sent you a message', data: { url: '/inbox' } },
    })
  })
})
