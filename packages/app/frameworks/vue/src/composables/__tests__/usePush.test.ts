import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'

import type { UsePushResult } from '../usePush.js'
import { usePush } from '../usePush.js'

const loggerMocks = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('@molecule/app-push', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: vi.fn(),
}))

vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getLogger: vi.fn(() => ({ warn: loggerMocks.warn })),
}))

import { getProvider } from '@molecule/app-push'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

const mockToken: PushToken = {
  value: 'test-token-123',
  platform: 'web',
  timestamp: 1000,
}

const createMockProvider = (): PushProvider => ({
  checkPermission: vi.fn(async () => 'default' as PermissionStatus),
  requestPermission: vi.fn(async () => 'granted' as PermissionStatus),
  register: vi.fn(async () => mockToken),
  unregister: vi.fn(async () => {}),
  getToken: vi.fn(async () => null),
  onNotificationReceived: vi.fn((_listener: NotificationReceivedListener) => () => {}),
  onNotificationAction: vi.fn((_listener: NotificationActionListener) => () => {}),
  onTokenChange: vi.fn((_listener: TokenChangeListener) => () => {}),
  scheduleLocal: vi.fn(async () => 'notif-id'),
  cancelLocal: vi.fn(async () => {}),
  cancelAllLocal: vi.fn(async () => {}),
  getPendingLocal: vi.fn(async () => []),
  getDelivered: vi.fn(async () => []),
  removeDelivered: vi.fn(async () => {}),
  removeAllDelivered: vi.fn(async () => {}),
  setBadge: vi.fn(async () => {}),
  getBadge: vi.fn(async () => 0),
  clearBadge: vi.fn(async () => {}),
  destroy: vi.fn(),
})

describe('usePush', () => {
  let mockProvider: PushProvider

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('returns initial state with null permission and token', () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    expect(result.permission.value).toBeNull()
    expect(result.token.value).toBeNull()

    scope.stop()
  })

  it('checks permission on mount when checkOnMount is true', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush({ checkOnMount: true })
    })

    await vi.waitFor(() => expect(result.permission.value).toBe('default'))

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('logs a permission check on mount that fails', async () => {
    vi.mocked(mockProvider.checkPermission).mockRejectedValueOnce(
      new Error('permission API unavailable'),
    )
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush({ checkOnMount: true })
    })

    await vi.waitFor(() => expect(loggerMocks.warn).toHaveBeenCalledOnce())
    expect(loggerMocks.warn).toHaveBeenCalledWith('Checking push permission on mount failed', {
      error: expect.objectContaining({ message: 'permission API unavailable' }),
    })
    expect(result.permission.value).toBeNull()

    scope.stop()
  })

  it('does not check permission on mount by default', async () => {
    const scope = effectScope()

    scope.run(() => {
      usePush()
    })

    await flush()

    expect(mockProvider.checkPermission).not.toHaveBeenCalled()

    scope.stop()
  })

  it('checkPermission updates permission state', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    expect(result.permission.value).toBeNull()

    const status = await result.checkPermission()

    expect(status).toBe('default')
    expect(result.permission.value).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('requestPermission updates permission state', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    const status = await result.requestPermission()

    expect(status).toBe('granted')
    expect(result.permission.value).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('register updates token state', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    expect(result.token.value).toBeNull()

    const token = await result.register()

    expect(token).toEqual(mockToken)
    expect(result.token.value).toEqual(mockToken)
    expect(mockProvider.register).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('register forwards options (runtime VAPID public key) to the provider', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    await result.register({ vapidPublicKey: 'runtime-key' })

    expect(mockProvider.register).toHaveBeenCalledWith({ vapidPublicKey: 'runtime-key' })

    scope.stop()
  })

  it('unregister clears token state', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    // First register to get a token
    await result.register()
    expect(result.token.value).toEqual(mockToken)

    // Then unregister
    await result.unregister()

    expect(result.token.value).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('onNotificationReceived delegates to provider', () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    const listener = vi.fn()
    result.onNotificationReceived(listener)

    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)

    scope.stop()
  })

  it('onNotificationAction delegates to provider', () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    const listener = vi.fn()
    result.onNotificationAction(listener)

    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)

    scope.stop()
  })

  it('onTokenChange delegates to provider', () => {
    const unsub = vi.fn()
    vi.mocked(mockProvider.onTokenChange).mockReturnValue(unsub)
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    const listener = vi.fn()
    expect(result.onTokenChange(listener)).toBe(unsub)
    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)

    scope.stop()
  })

  it('setBadge delegates to provider', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    await result.setBadge(5)

    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)

    scope.stop()
  })

  it('clearBadge delegates to provider', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush()
    })

    await result.clearBadge()

    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('makes no provider calls on mount without checkOnMount', () => {
    const scope = effectScope()

    scope.run(() => {
      usePush()
    })

    // The composable subscribes to nothing at mount; token changes flow only
    // through its own register/unregister.
    expect(mockProvider.checkPermission).not.toHaveBeenCalled()
    expect(mockProvider.onTokenChange).not.toHaveBeenCalled()

    scope.stop()
  })

  it('checkOnMount reads the permission once on mount', async () => {
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush({ checkOnMount: true })
    })

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(result.permission.value).toBe('default'))

    scope.stop()
  })

  it('a failing checkOnMount leaves permission unset and warns', async () => {
    vi.mocked(mockProvider.checkPermission).mockRejectedValue(new Error('permission API blocked'))
    const scope = effectScope()
    let result!: UsePushResult

    scope.run(() => {
      result = usePush({ checkOnMount: true })
    })

    await vi.waitFor(() => expect(loggerMocks.warn).toHaveBeenCalledOnce())
    expect(loggerMocks.warn).toHaveBeenCalledWith('Checking push permission on mount failed', {
      error: expect.any(Error),
    })
    expect(result.permission.value).toBeNull()

    scope.stop()
  })
})
