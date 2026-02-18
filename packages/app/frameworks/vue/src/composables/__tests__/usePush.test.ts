import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type { UsePushReturn } from '../usePush.js'
import { usePush } from '../usePush.js'

vi.mock('@molecule/app-push', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-push'

const createMockProvider = (): ReturnType<typeof createMockProvider> => ({
  checkPermission: vi.fn().mockResolvedValue('default' as const),
  requestPermission: vi.fn().mockResolvedValue('granted' as const),
  register: vi.fn().mockResolvedValue({ value: 'token-abc', platform: 'web', timestamp: 1000 }),
  unregister: vi.fn().mockResolvedValue(undefined),
  getToken: vi.fn().mockResolvedValue(null),
  onNotificationReceived: vi.fn().mockReturnValue(vi.fn()),
  onNotificationAction: vi.fn().mockReturnValue(vi.fn()),
  onTokenChange: vi.fn().mockReturnValue(vi.fn()),
  scheduleLocal: vi.fn().mockResolvedValue('id-1'),
  cancelLocal: vi.fn().mockResolvedValue(undefined),
  cancelAllLocal: vi.fn().mockResolvedValue(undefined),
  getPendingLocal: vi.fn().mockResolvedValue([]),
  getDelivered: vi.fn().mockResolvedValue([]),
  removeDelivered: vi.fn().mockResolvedValue(undefined),
  removeAllDelivered: vi.fn().mockResolvedValue(undefined),
  setBadge: vi.fn().mockResolvedValue(undefined),
  getBadge: vi.fn().mockResolvedValue(0),
  clearBadge: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
})

describe('usePush', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider as never)
  })

  it('returns initial null state for permission and token', () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    expect(result.permission.value).toBeNull()
    expect(result.token.value).toBeNull()

    scope.stop()
  })

  it('updates permission ref on checkPermission', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    const status = await result.checkPermission()

    expect(status).toBe('default')
    expect(result.permission.value).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('updates permission ref on requestPermission', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    const status = await result.requestPermission()

    expect(status).toBe('granted')
    expect(result.permission.value).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('updates token ref on register', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    const pushToken = await result.register()

    expect(pushToken).toEqual({ value: 'token-abc', platform: 'web', timestamp: 1000 })
    expect(result.token.value).toEqual({ value: 'token-abc', platform: 'web', timestamp: 1000 })
    expect(mockProvider.register).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('clears token ref on unregister', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    // First register
    await result.register()
    expect(result.token.value).not.toBeNull()

    // Then unregister
    await result.unregister()
    expect(result.token.value).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('subscribes to token changes on creation', () => {
    const scope = effectScope()

    scope.run(() => {
      usePush()
    })

    expect(mockProvider.onTokenChange).toHaveBeenCalledOnce()
    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(expect.any(Function))

    scope.stop()
  })

  it('updates token when token change event fires', () => {
    const scope = effectScope()
    let result!: UsePushReturn
    let tokenChangeCallback:
      | ((token: { value: string; platform: string; timestamp: number }) => void)
      | null = null

    mockProvider.onTokenChange.mockImplementation((cb: typeof tokenChangeCallback) => {
      tokenChangeCallback = cb
      return vi.fn()
    })

    scope.run(() => {
      result = usePush()
    })

    expect(result.token.value).toBeNull()

    // Simulate token change
    const newToken = { value: 'new-token', platform: 'web' as const, timestamp: 2000 }
    tokenChangeCallback!(newToken)

    expect(result.token.value).toEqual(newToken)

    scope.stop()
  })

  it('unsubscribes from token changes on scope dispose', () => {
    const scope = effectScope()
    const unsub = vi.fn()
    mockProvider.onTokenChange.mockReturnValue(unsub)

    scope.run(() => {
      usePush()
    })

    expect(unsub).not.toHaveBeenCalled()

    scope.stop()

    expect(unsub).toHaveBeenCalledOnce()
  })

  it('delegates onNotificationReceived to provider', () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    const listener = vi.fn()
    result.onNotificationReceived(listener)
    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)

    scope.stop()
  })

  it('delegates onNotificationAction to provider', () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    const listener = vi.fn()
    result.onNotificationAction(listener)
    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)

    scope.stop()
  })

  it('delegates setBadge and clearBadge to provider', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    await result.setBadge(5)
    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)

    await result.clearBadge()
    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()

    scope.stop()
  })
})
