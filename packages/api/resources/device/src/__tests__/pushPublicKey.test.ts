/**
 * Tests for the `pushPublicKey` handler (`GET /devices/push/public-key`).
 *
 * The route delivers the VAPID public key at RUNTIME so browsers can
 * subscribe with `applicationServerKey` (Chromium rejects keyless
 * subscriptions). Bond-gated like `oauthAuthorize`: no bonded
 * push-notifications provider → 404; bonded but unconfigured → 503.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { bond, unbond } from '@molecule/api-bond'

import { pushPublicKey } from '../handlers/pushPublicKey.js'

const TEST_PUBLIC_KEY =
  'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM'

describe('pushPublicKey handler', () => {
  afterEach(() => {
    unbond('push-notifications')
  })

  it('responds 404 when no push-notifications provider is bonded', async () => {
    const handler = pushPublicKey()
    const response = await handler()
    expect(response.statusCode).toBe(404)
    expect(response.body).toMatchObject({ errorKey: 'device.error.pushNotConfigured' })
  })

  it('responds 404 when the bonded provider has no getPublicKey', async () => {
    bond('push-notifications', {})
    const handler = pushPublicKey()
    const response = await handler()
    expect(response.statusCode).toBe(404)
    expect(response.body).toMatchObject({ errorKey: 'device.error.pushNotConfigured' })
  })

  it('responds 503 when the provider is bonded but unconfigured (no key)', async () => {
    bond('push-notifications', { getPublicKey: () => undefined })
    const handler = pushPublicKey()
    const response = await handler()
    expect(response.statusCode).toBe(503)
    expect(response.body).toMatchObject({ errorKey: 'device.error.pushNotConfigured' })
  })

  it('responds 200 with the VAPID public key when configured', async () => {
    bond('push-notifications', { getPublicKey: () => TEST_PUBLIC_KEY })
    const handler = pushPublicKey()
    const response = await handler()
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ publicKey: TEST_PUBLIC_KEY })
  })
})
