/**
 * `createWebPushProvider` behavior tests — the receive-half contract:
 *
 * - `register()` must FAIL FAST (never hang) when no service worker is
 *   registered (dev builds ship none; awaiting `.ready` blocks forever).
 * - `register()` must subscribe with `applicationServerKey` when a VAPID
 *   public key is supplied — at construction or, taking precedence, at
 *   call time (`{ vapidPublicKey }`, e.g. fetched from
 *   `GET /api/devices/push/public-key`). Chromium rejects keyless subscribes.
 * - `unregister()` / `getToken()` / delivered-notification helpers must
 *   degrade gracefully (no-op / null / empty) without a registration.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWebPushProvider } from '../web-provider.js'

/** 'QUJD' is base64url for the bytes of 'ABC' — a tiny valid key stand-in. */
const KEY_ABC = 'QUJD'
const KEY_ABC_BYTES = [65, 66, 67]

interface FakeSubscribeCall {
  userVisibleOnly?: boolean
  applicationServerKey?: ArrayBuffer
}

const makeFakeRegistration = () => {
  const subscribeCalls: FakeSubscribeCall[] = []
  const subscription = {
    toJSON: () => ({
      endpoint: 'https://push.example/sub-1',
      keys: { p256dh: 'p', auth: 'a' },
    }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
  const registration = {
    pushManager: {
      subscribe: vi.fn(async (options: FakeSubscribeCall) => {
        subscribeCalls.push(options)
        return subscription
      }),
      getSubscription: vi.fn().mockResolvedValue(subscription),
    },
    getNotifications: vi.fn().mockResolvedValue([]),
  }
  return { registration, subscription, subscribeCalls }
}

/** Stub window/navigator with (or without) a service worker registration. */
const stubBrowser = (registration: unknown | undefined): void => {
  vi.stubGlobal('window', { PushManager: function PushManager() {}, Notification: {} })
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      // `.ready` NEVER settles when there is no registration — mirroring the
      // real browser behavior the fail-fast path exists for. When a
      // registration exists it resolves to it.
      ready: registration ? Promise.resolve(registration) : new Promise(() => {}),
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createWebPushProvider().register()', () => {
  it('throws the not-supported error when serviceWorker is missing entirely', async () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', {})
    const provider = createWebPushProvider()
    await expect(provider.register()).rejects.toThrow('Push notifications not supported')
  })

  it('fails fast with the no-service-worker error when none is registered (dev builds)', async () => {
    stubBrowser(undefined)
    const provider = createWebPushProvider()
    // Would previously await navigator.serviceWorker.ready forever; must now
    // reject promptly with an honest, i18n'd message.
    await expect(provider.register()).rejects.toThrow(
      'No service worker is registered — push notifications require the production app build.',
    )
  })

  it('subscribes with applicationServerKey from the runtime option', async () => {
    const { registration, subscribeCalls } = makeFakeRegistration()
    stubBrowser(registration)
    const provider = createWebPushProvider()

    const token = await provider.register({ vapidPublicKey: KEY_ABC })

    expect(subscribeCalls).toHaveLength(1)
    expect(subscribeCalls[0].userVisibleOnly).toBe(true)
    expect(subscribeCalls[0].applicationServerKey).toBeInstanceOf(ArrayBuffer)
    expect([...new Uint8Array(subscribeCalls[0].applicationServerKey!)]).toEqual(KEY_ABC_BYTES)
    expect(token.platform).toBe('web')
    expect(JSON.parse(token.value)).toMatchObject({ endpoint: 'https://push.example/sub-1' })
  })

  it('prefers the runtime key over the constructor key', async () => {
    const { registration, subscribeCalls } = makeFakeRegistration()
    stubBrowser(registration)
    // 'WFla' is base64url for 'XYZ' — the constructor key that must LOSE.
    const provider = createWebPushProvider('WFla')

    await provider.register({ vapidPublicKey: KEY_ABC })

    expect([...new Uint8Array(subscribeCalls[0].applicationServerKey!)]).toEqual(KEY_ABC_BYTES)
  })

  it('falls back to the constructor key when no runtime key is given', async () => {
    const { registration, subscribeCalls } = makeFakeRegistration()
    stubBrowser(registration)
    const provider = createWebPushProvider(KEY_ABC)

    await provider.register()

    expect([...new Uint8Array(subscribeCalls[0].applicationServerKey!)]).toEqual(KEY_ABC_BYTES)
  })

  it('subscribes without applicationServerKey when no key exists anywhere', async () => {
    const { registration, subscribeCalls } = makeFakeRegistration()
    stubBrowser(registration)
    const provider = createWebPushProvider()

    await provider.register()

    expect(subscribeCalls[0].applicationServerKey).toBeUndefined()
  })
})

describe('createWebPushProvider() without a registration (no-hang degradation)', () => {
  it('unregister() resolves as a no-op', async () => {
    stubBrowser(undefined)
    const provider = createWebPushProvider()
    await expect(provider.unregister()).resolves.toBeUndefined()
  })

  it('getToken() resolves null', async () => {
    stubBrowser(undefined)
    const provider = createWebPushProvider()
    await expect(provider.getToken()).resolves.toBeNull()
  })

  it('getDelivered() resolves empty and removeAllDelivered() no-ops', async () => {
    stubBrowser(undefined)
    const provider = createWebPushProvider()
    await expect(provider.getDelivered()).resolves.toEqual([])
    await expect(provider.removeAllDelivered()).resolves.toBeUndefined()
    await expect(provider.removeDelivered(['x'])).resolves.toBeUndefined()
  })
})

describe('register(options) pass-through', () => {
  it('module-level register(options) forwards options to the provider', async () => {
    const { setProvider, register } = await import('../index.js')
    const providerRegister = vi.fn().mockResolvedValue({
      value: 't',
      platform: 'web' as const,
      timestamp: Date.now(),
    })
    // Minimal provider stub — only register is exercised here.
    setProvider({ register: providerRegister } as never)
    await register({ vapidPublicKey: KEY_ABC })
    expect(providerRegister).toHaveBeenCalledWith({ vapidPublicKey: KEY_ABC })
  })
})
