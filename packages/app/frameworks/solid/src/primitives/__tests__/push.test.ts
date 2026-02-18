import { createRoot } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPush } from '../push.js'

const mockProvider = {
  checkPermission: vi.fn(),
  requestPermission: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  getToken: vi.fn(),
  onNotificationReceived: vi.fn(),
  onNotificationAction: vi.fn(),
  onTokenChange: vi.fn(),
  scheduleLocal: vi.fn(),
  cancelLocal: vi.fn(),
  cancelAllLocal: vi.fn(),
  getPendingLocal: vi.fn(),
  getDelivered: vi.fn(),
  removeDelivered: vi.fn(),
  removeAllDelivered: vi.fn(),
  setBadge: vi.fn(),
  getBadge: vi.fn(),
  clearBadge: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('@molecule/app-push', () => ({
  getProvider: () => mockProvider,
}))

describe('createPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for initial permission and token', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { permission, token } = createPush()

        expect(permission()).toBeNull()
        expect(token()).toBeNull()

        dispose()
        resolve()
      })
    })
  })

  it('updates permission signal after checkPermission', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockProvider.checkPermission.mockResolvedValue('granted')

        const { permission, checkPermission } = createPush()
        const result = await checkPermission()

        expect(result).toBe('granted')
        expect(permission()).toBe('granted')

        dispose()
        resolve()
      })
    })
  })

  it('updates permission signal after requestPermission', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockProvider.requestPermission.mockResolvedValue('denied')

        const { permission, requestPermission } = createPush()
        const result = await requestPermission()

        expect(result).toBe('denied')
        expect(permission()).toBe('denied')

        dispose()
        resolve()
      })
    })
  })

  it('updates token signal after register', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const mockToken = {
          value: 'token-abc-123',
          platform: 'web' as const,
          timestamp: Date.now(),
        }
        mockProvider.register.mockResolvedValue(mockToken)

        const { token, register } = createPush()
        const result = await register()

        expect(result).toEqual(mockToken)
        expect(token()).toEqual(mockToken)

        dispose()
        resolve()
      })
    })
  })

  it('clears token signal after unregister', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const mockToken = {
          value: 'token-abc-123',
          platform: 'web' as const,
          timestamp: Date.now(),
        }
        mockProvider.register.mockResolvedValue(mockToken)
        mockProvider.unregister.mockResolvedValue(undefined)

        const { token, register, unregister } = createPush()

        await register()
        expect(token()).toEqual(mockToken)

        await unregister()
        expect(token()).toBeNull()

        dispose()
        resolve()
      })
    })
  })

  it('delegates onNotificationReceived to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const unsubscribe = vi.fn()
        mockProvider.onNotificationReceived.mockReturnValue(unsubscribe)

        const { onNotificationReceived } = createPush()
        const listener = vi.fn()
        const unsub = onNotificationReceived(listener)

        expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
        expect(unsub).toBe(unsubscribe)

        dispose()
        resolve()
      })
    })
  })

  it('delegates onNotificationAction to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const unsubscribe = vi.fn()
        mockProvider.onNotificationAction.mockReturnValue(unsubscribe)

        const { onNotificationAction } = createPush()
        const listener = vi.fn()
        const unsub = onNotificationAction(listener)

        expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
        expect(unsub).toBe(unsubscribe)

        dispose()
        resolve()
      })
    })
  })

  it('delegates onTokenChange to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const unsubscribe = vi.fn()
        mockProvider.onTokenChange.mockReturnValue(unsubscribe)

        const { onTokenChange } = createPush()
        const listener = vi.fn()
        const unsub = onTokenChange(listener)

        expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
        expect(unsub).toBe(unsubscribe)

        dispose()
        resolve()
      })
    })
  })

  it('delegates setBadge to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockProvider.setBadge.mockResolvedValue(undefined)

        const { setBadge } = createPush()
        await setBadge(5)

        expect(mockProvider.setBadge).toHaveBeenCalledWith(5)

        dispose()
        resolve()
      })
    })
  })

  it('delegates clearBadge to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockProvider.clearBadge.mockResolvedValue(undefined)

        const { clearBadge } = createPush()
        await clearBadge()

        expect(mockProvider.clearBadge).toHaveBeenCalled()

        dispose()
        resolve()
      })
    })
  })
})
