import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type { UsePushReturn } from '../usePush.js'
import { usePush } from '../usePush.js'

vi.mock('@molecule/app-push', () => ({
  getProvider: vi.fn(),
}))

vi.mock('@molecule/app-logger', () => ({
  getLogger: vi.fn(() => ({ warn: vi.fn() })),
}))

import { getLogger } from '@molecule/app-logger'
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

  it('forwards register options (runtime VAPID public key) to the provider', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush()
    })

    await result.register({ vapidPublicKey: 'runtime-key' })

    expect(mockProvider.register).toHaveBeenCalledWith({ vapidPublicKey: 'runtime-key' })

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

  it('makes no provider calls on mount without checkOnMount', () => {
    const scope = effectScope()

    scope.run(() => {
      usePush()
    })

    // React's usePush subscribes to nothing at mount; token changes flow only
    // through the hook's own register/unregister.
    expect(mockProvider.checkPermission).not.toHaveBeenCalled()
    expect(mockProvider.onTokenChange).not.toHaveBeenCalled()

    scope.stop()
  })

  it('onTokenChange is a pass-through returning the unsubscriber', () => {
    const scope = effectScope()
    let result!: UsePushReturn
    const unsub = vi.fn()
    mockProvider.onTokenChange.mockReturnValue(unsub)

    scope.run(() => {
      result = usePush()
    })

    const listener = vi.fn()
    expect(result.onTokenChange(listener)).toBe(unsub)
    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
    // The hook owns no token subscription of its own to tear down.
    scope.stop()
    expect(unsub).not.toHaveBeenCalled()
  })

  it('checkOnMount reads the permission once on mount', async () => {
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush({ checkOnMount: true })
    })

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(result.permission.value).toBe('default'))

    scope.stop()
  })

  it('a failing checkOnMount leaves permission unset and warns', async () => {
    const warn = vi.fn()
    vi.mocked(getLogger).mockReturnValue({ warn } as never)
    mockProvider.checkPermission.mockRejectedValue(new Error('permission API blocked'))
    const scope = effectScope()
    let result!: UsePushReturn

    scope.run(() => {
      result = usePush({ checkOnMount: true })
    })

    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce())
    expect(warn).toHaveBeenCalledWith('Checking push permission on mount failed', {
      error: expect.any(Error),
    })
    expect(result.permission.value).toBeNull()

    scope.stop()
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
