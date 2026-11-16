/**
 * Tests for the `pushPublicKey` handler (`GET /devices/push/public-key`).
 *
 * The route delivers the VAPID public key at RUNTIME so browsers can
 * subscribe with `applicationServerKey` (Chromium rejects keyless
 * subscriptions). Bond-gated like `oauthAuthorize`: no bonded
 * push-notifications provider → 404; bonded but unconfigured → 503. A provider
 * that keeps its key behind a service (the molecule.dev hosted bond) is asked
 * with fetchPublicKey(), since its getPublicKey() is empty until then.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

  it('asks a provider that fetches its key, whose getPublicKey is still empty', async () => {
    const fetchPublicKey = vi.fn(() => Promise.resolve(TEST_PUBLIC_KEY))
    bond('push-notifications', { getPublicKey: () => undefined, fetchPublicKey })
    const response = await pushPublicKey()()
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ publicKey: TEST_PUBLIC_KEY })
    expect(fetchPublicKey).toHaveBeenCalledTimes(1)
  })

  it('responds 503 when the provider cannot fetch its key', async () => {
    bond('push-notifications', {
      getPublicKey: () => undefined,
      fetchPublicKey: () => Promise.reject(new Error('molecule.dev push/vapid-key failed (401)')),
    })
    const response = await pushPublicKey()()
    expect(response.statusCode).toBe(503)
    expect(response.body).toMatchObject({ errorKey: 'device.error.pushNotConfigured' })
  })
})
