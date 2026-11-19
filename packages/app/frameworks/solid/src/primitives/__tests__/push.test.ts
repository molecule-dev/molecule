import { createRoot } from 'solid-js'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import {
  getProvider as getLoggerProvider,
  type Logger,
  type LoggerProvider,
  setProvider as setLoggerProvider,
} from '@molecule/app-logger'
import type { PushToken } from '@molecule/app-push'

import { createPush, type PushPrimitives, usePush, type UsePushOptions } from '../push.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

const mockToken: PushToken = {
  value: 'test-token-123',
  platform: 'web',
  timestamp: Date.now(),
}

/** A full `Logger` whose `warn` the test can inspect. */
function createMockLogger(warn: Mock<Logger['warn']>): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn,
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: () => 'info',
    child: () => createMockLogger(warn),
    withContext: () => createMockLogger(warn),
    addTransport: () => () => {},
    removeTransport: () => {},
  }
}

/** A full `LoggerProvider` that hands out the given logger. */
function createMockLoggerProvider(logger: Logger): LoggerProvider {
  return {
    getLogger: () => logger,
    createLogger: () => logger,
    setLevel: vi.fn(),
    getLevel: () => 'info',
    addTransport: () => () => {},
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: () => true,
  }
}

/** Mounts `usePush` in a reactive root and keeps its disposal. */
function mountPush(options?: UsePushOptions) {
  let push!: PushPrimitives
  const dispose = createRoot((disposeRoot) => {
    push = usePush(options)
    return disposeRoot
  })
  return { push, dispose }
}

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

describe('usePush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider.checkPermission.mockResolvedValue('default')
    mockProvider.requestPermission.mockResolvedValue('granted')
    mockProvider.register.mockResolvedValue(mockToken)
    mockProvider.unregister.mockResolvedValue(undefined)
    mockProvider.setBadge.mockResolvedValue(undefined)
    mockProvider.clearBadge.mockResolvedValue(undefined)
  })

  it('returns initial state with null permission and token', () => {
    const { push, dispose } = mountPush()

    expect(push.permission()).toBeNull()
    expect(push.token()).toBeNull()

    dispose()
  })

  it('checks permission on mount when checkOnMount is true', async () => {
    const { push, dispose } = mountPush({ checkOnMount: true })

    await flush()

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
    expect(push.permission()).toBe('default')

    dispose()
  })

  it('logs a permission check on mount that fails', async () => {
    const warn = vi.fn<Logger['warn']>()
    const previous = getLoggerProvider()
    setLoggerProvider(createMockLoggerProvider(createMockLogger(warn)))
    mockProvider.checkPermission.mockRejectedValueOnce(new Error('permission API unavailable'))

    const { push, dispose } = mountPush({ checkOnMount: true })

    try {
      await flush()

      expect(push.permission()).toBeNull()
      expect(warn).toHaveBeenCalledWith('Checking push permission on mount failed', {
        error: expect.objectContaining({ message: 'permission API unavailable' }),
      })
    } finally {
      setLoggerProvider(previous)
      dispose()
    }
  })

  it('does not check permission on mount by default', async () => {
    const { dispose } = mountPush()

    await flush()

    expect(mockProvider.checkPermission).not.toHaveBeenCalled()

    dispose()
  })

  it('checkPermission updates permission state', async () => {
    const { push, dispose } = mountPush()

    expect(push.permission()).toBeNull()

    const status = await push.checkPermission()
    expect(status).toBe('default')

    expect(push.permission()).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()

    dispose()
  })

  it('requestPermission updates permission state', async () => {
    const { push, dispose } = mountPush()

    const status = await push.requestPermission()
    expect(status).toBe('granted')

    expect(push.permission()).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()

    dispose()
  })

  it('register updates token state', async () => {
    const { push, dispose } = mountPush()

    expect(push.token()).toBeNull()

    const token = await push.register()
    expect(token).toEqual(mockToken)

    expect(push.token()).toEqual(mockToken)
    expect(mockProvider.register).toHaveBeenCalledOnce()

    dispose()
  })

  it('register forwards options (runtime VAPID public key) to the provider', async () => {
    const { push, dispose } = mountPush()

    await push.register({ vapidPublicKey: 'runtime-key' })

    expect(mockProvider.register).toHaveBeenCalledWith({ vapidPublicKey: 'runtime-key' })

    dispose()
  })

  it('unregister clears token state', async () => {
    const { push, dispose } = mountPush()

    // First register to get a token
    await push.register()

    expect(push.token()).toEqual(mockToken)

    // Then unregister
    await push.unregister()

    expect(push.token()).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()

    dispose()
  })

  it('onNotificationReceived delegates to provider', () => {
    const { push, dispose } = mountPush()

    const listener = vi.fn()
    push.onNotificationReceived(listener)

    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)

    dispose()
  })

  it('onNotificationAction delegates to provider', () => {
    const { push, dispose } = mountPush()

    const listener = vi.fn()
    push.onNotificationAction(listener)

    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)

    dispose()
  })

  it('onTokenChange delegates to provider', () => {
    const { push, dispose } = mountPush()

    const listener = vi.fn()
    push.onTokenChange(listener)

    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)

    dispose()
  })

  it('setBadge delegates to provider', async () => {
    const { push, dispose } = mountPush()

    await push.setBadge(5)

    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)

    dispose()
  })

  it('clearBadge delegates to provider', async () => {
    const { push, dispose } = mountPush()

    await push.clearBadge()

    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()

    dispose()
  })
})
