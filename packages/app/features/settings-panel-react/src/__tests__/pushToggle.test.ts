/**
 * Tests for the push-toggle logic behind `NotificationsSection` — the full
 * receive-side enable chain: permission → runtime VAPID key fetch →
 * `register({ vapidPublicKey })` → PATCH the subscription onto the current
 * device row (the contract the api push fan-outs read).
 */

import { describe, expect, it, vi } from 'vitest'

import type { PushToggleDevice, PushToggleHttp, PushToggleToken } from '../pushToggle.js'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  findCurrentDevice,
  readCurrentDevicePushEnabled,
  subscriptionFromToken,
} from '../pushToggle.js'

const WEB_SUBSCRIPTION = {
  endpoint: 'https://push.example/sub-1',
  keys: { p256dh: 'p256', auth: 'auth' },
}

const webToken: PushToggleToken = {
  value: JSON.stringify(WEB_SUBSCRIPTION),
  platform: 'web',
}

interface HttpCall {
  method: 'get' | 'patch'
  url: string
  data?: unknown
}

/** Fake http client recording calls; per-URL responses/failures. */
const makeHttp = (options?: {
  publicKey?: string | null
  devices?: PushToggleDevice[]
  failPatch?: boolean
}): { http: PushToggleHttp; calls: HttpCall[] } => {
  const calls: HttpCall[] = []
  const http: PushToggleHttp = {
    async get<T>(url: string): Promise<{ data: T }> {
      calls.push({ method: 'get', url })
      if (url === '/api/devices/push/public-key') {
        if (options?.publicKey === null) throw new Error('404')
        return { data: { publicKey: options?.publicKey ?? 'vapid-public-key' } as T }
      }
      if (url === '/api/devices') {
        return { data: (options?.devices ?? [{ id: 'dev-1', isCurrent: true }]) as T }
      }
      throw new Error(`unexpected GET ${url}`)
    },
    async patch<T>(url: string, data?: unknown): Promise<{ data: T }> {
      calls.push({ method: 'patch', url, data })
      if (options?.failPatch) throw new Error('500')
      return { data: {} as T }
    },
  }
  return { http, calls }
}

describe('findCurrentDevice', () => {
  it('prefers the isCurrent row', () => {
    const devices = [{ id: 'a' }, { id: 'b', isCurrent: true }]
    expect(findCurrentDevice(devices)?.id).toBe('b')
  })

  it('falls back to the first row', () => {
    expect(findCurrentDevice([{ id: 'a' }, { id: 'b' }])?.id).toBe('a')
  })

  it('returns undefined for empty/absent lists', () => {
    expect(findCurrentDevice([])).toBeUndefined()
    expect(findCurrentDevice(undefined)).toBeUndefined()
  })
})

describe('subscriptionFromToken', () => {
  it('parses the web subscription JSON', () => {
    expect(subscriptionFromToken(webToken)).toEqual(WEB_SUBSCRIPTION)
  })

  it('wraps android tokens as FCM registrations', () => {
    expect(subscriptionFromToken({ value: 'fcm-token', platform: 'android' })).toEqual({
      registrationId: 'fcm-token',
      registrationType: 'FCM',
    })
  })

  it('wraps ios tokens as APNs registrations', () => {
    expect(subscriptionFromToken({ value: 'apns-token', platform: 'ios' })).toEqual({
      registrationId: 'apns-token',
    })
  })
})

describe('enablePushOnCurrentDevice', () => {
  it('runs the full chain: permission → key fetch → register(key) → PATCH device', async () => {
    const { http, calls } = makeHttp()
    const register = vi.fn(async () => webToken)

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'granted',
      register,
    })

    expect(result).toEqual({ ok: true })
    // The runtime key from the api reached register().
    expect(register).toHaveBeenCalledWith({ vapidPublicKey: 'vapid-public-key' })
    // The subscription was persisted on the CURRENT device row with the
    // exact contract the api fan-outs read.
    const patch = calls.find((c) => c.method === 'patch')
    expect(patch?.url).toBe('/api/devices/dev-1')
    expect(patch?.data).toEqual({
      pushSubscription: WEB_SUBSCRIPTION,
      hasPushSubscription: true,
    })
  })

  it('reports permission-denied without touching the network', async () => {
    const { http, calls } = makeHttp()

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'denied',
      register: vi.fn(),
    })

    expect(result).toEqual({ ok: false, reason: 'permission-denied' })
    expect(calls).toHaveLength(0)
  })

  it('reports server-unconfigured when the key endpoint 404s/503s', async () => {
    const { http } = makeHttp({ publicKey: null })

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'granted',
      register: vi.fn(),
    })

    expect(result).toEqual({ ok: false, reason: 'server-unconfigured' })
  })

  it('reports server-unconfigured when the endpoint responds without a key', async () => {
    const { http } = makeHttp({ publicKey: '' })

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'granted',
      register: vi.fn(),
    })

    expect(result).toEqual({ ok: false, reason: 'server-unconfigured' })
  })

  it('surfaces the provider message when register() throws (e.g. no service worker in dev)', async () => {
    const { http, calls } = makeHttp()

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'granted',
      register: vi.fn(async () => {
        throw new Error('No service worker is registered — production build required.')
      }),
    })

    expect(result).toEqual({
      ok: false,
      reason: 'register-failed',
      message: 'No service worker is registered — production build required.',
    })
    // No device PATCH happened.
    expect(calls.filter((c) => c.method === 'patch')).toHaveLength(0)
  })

  it('reports persist-failed when the device PATCH fails', async () => {
    const { http } = makeHttp({ failPatch: true })

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'granted',
      register: vi.fn(async () => webToken),
    })

    expect(result).toMatchObject({ ok: false, reason: 'persist-failed' })
  })

  it('reports persist-failed when the user has no device rows', async () => {
    const { http } = makeHttp({ devices: [] })

    const result = await enablePushOnCurrentDevice({
      http,
      requestPermission: async () => 'granted',
      register: vi.fn(async () => webToken),
    })

    expect(result).toEqual({ ok: false, reason: 'persist-failed' })
  })
})

describe('disablePushOnCurrentDevice', () => {
  it('unsubscribes and clears the server state', async () => {
    const { http, calls } = makeHttp()
    const unregister = vi.fn(async () => {})

    const result = await disablePushOnCurrentDevice({ http, unregister })

    expect(result).toEqual({ ok: true })
    expect(unregister).toHaveBeenCalledOnce()
    const patch = calls.find((c) => c.method === 'patch')
    expect(patch?.url).toBe('/api/devices/dev-1')
    expect(patch?.data).toEqual({ pushSubscription: null, hasPushSubscription: false })
  })

  it('still clears the server state when browser unsubscribe throws (dev builds)', async () => {
    const { http, calls } = makeHttp()

    const result = await disablePushOnCurrentDevice({
      http,
      unregister: vi.fn(async () => {
        throw new Error('no service worker')
      }),
    })

    expect(result).toEqual({ ok: true })
    expect(calls.some((c) => c.method === 'patch')).toBe(true)
  })

  it('reports persist-failed when the server clear fails', async () => {
    const { http } = makeHttp({ failPatch: true })

    const result = await disablePushOnCurrentDevice({ http, unregister: vi.fn(async () => {}) })

    expect(result).toMatchObject({ ok: false, reason: 'persist-failed' })
  })
})

describe('readCurrentDevicePushEnabled', () => {
  it('returns true when the current device has a stored subscription', async () => {
    const { http } = makeHttp({
      devices: [
        { id: 'other', hasPushSubscription: true },
        { id: 'dev-1', isCurrent: true, hasPushSubscription: true },
      ],
    })
    await expect(readCurrentDevicePushEnabled(http)).resolves.toBe(true)
  })

  it('returns false when the current device has none', async () => {
    const { http } = makeHttp({ devices: [{ id: 'dev-1', isCurrent: true }] })
    await expect(readCurrentDevicePushEnabled(http)).resolves.toBe(false)
  })

  it('returns false (never throws) when the endpoint is unavailable', async () => {
    const http: PushToggleHttp = {
      async get() {
        throw new Error('401')
      },
      async patch() {
        throw new Error('unexpected')
      },
    }
    await expect(readCurrentDevicePushEnabled(http)).resolves.toBe(false)
  })
})
