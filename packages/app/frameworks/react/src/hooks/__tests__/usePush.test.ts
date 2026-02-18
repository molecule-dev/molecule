// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'

vi.mock('@molecule/app-push', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-push'

import { usePush } from '../usePush.js'

const flush = (): Promise<unknown> => new Promise((r) => setTimeout(r, 0))

const mockToken: PushToken = {
  value: 'test-token-123',
  platform: 'web',
  timestamp: Date.now(),
}

const createMockProvider = (): PushProvider => ({
  checkPermission: vi.fn(async () => 'default' as PermissionStatus),
  requestPermission: vi.fn(async () => 'granted' as PermissionStatus),
  register: vi.fn(async () => mockToken),
  unregister: vi.fn(async () => {}),
  getToken: vi.fn(async () => null),
  onNotificationReceived: vi.fn((_listener: NotificationReceivedListener) => {
    return () => {}
  }),
  onNotificationAction: vi.fn((_listener: NotificationActionListener) => {
    return () => {}
  }),
  onTokenChange: vi.fn((_listener: TokenChangeListener) => {
    return () => {}
  }),
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
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('returns initial state with null permission and token', () => {
    const { result } = renderHook(() => usePush())

    expect(result.current.permission).toBeNull()
    expect(result.current.token).toBeNull()
  })

  it('checks permission on mount when checkOnMount is true', async () => {
    const { result } = renderHook(() => usePush({ checkOnMount: true }))

    await act(async () => {
      await flush()
    })

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
    expect(result.current.permission).toBe('default')
  })

  it('does not check permission on mount by default', async () => {
    renderHook(() => usePush())

    await act(async () => {
      await flush()
    })

    expect(mockProvider.checkPermission).not.toHaveBeenCalled()
  })

  it('checkPermission updates permission state', async () => {
    const { result } = renderHook(() => usePush())

    expect(result.current.permission).toBeNull()

    await act(async () => {
      const status = await result.current.checkPermission()
      expect(status).toBe('default')
    })

    expect(result.current.permission).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
  })

  it('requestPermission updates permission state', async () => {
    const { result } = renderHook(() => usePush())

    await act(async () => {
      const status = await result.current.requestPermission()
      expect(status).toBe('granted')
    })

    expect(result.current.permission).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()
  })

  it('register updates token state', async () => {
    const { result } = renderHook(() => usePush())

    expect(result.current.token).toBeNull()

    await act(async () => {
      const token = await result.current.register()
      expect(token).toEqual(mockToken)
    })

    expect(result.current.token).toEqual(mockToken)
    expect(mockProvider.register).toHaveBeenCalledOnce()
  })

  it('unregister clears token state', async () => {
    const { result } = renderHook(() => usePush())

    // First register to get a token
    await act(async () => {
      await result.current.register()
    })

    expect(result.current.token).toEqual(mockToken)

    // Then unregister
    await act(async () => {
      await result.current.unregister()
    })

    expect(result.current.token).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()
  })

  it('onNotificationReceived delegates to provider', () => {
    const { result } = renderHook(() => usePush())

    const listener = vi.fn()
    result.current.onNotificationReceived(listener)

    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
  })

  it('onNotificationAction delegates to provider', () => {
    const { result } = renderHook(() => usePush())

    const listener = vi.fn()
    result.current.onNotificationAction(listener)

    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
  })

  it('onTokenChange delegates to provider', () => {
    const { result } = renderHook(() => usePush())

    const listener = vi.fn()
    result.current.onTokenChange(listener)

    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
  })

  it('setBadge delegates to provider', async () => {
    const { result } = renderHook(() => usePush())

    await act(async () => {
      await result.current.setBadge(5)
    })

    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)
  })

  it('clearBadge delegates to provider', async () => {
    const { result } = renderHook(() => usePush())

    await act(async () => {
      await result.current.clearBadge()
    })

    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()
  })
})
