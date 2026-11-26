// @vitest-environment jsdom
/**
 * `usePush`: React's `usePush` cases in Svelte's idiom. The hook runs during
 * component init; `permission` and `token` are readable stores its own actions
 * update, and the module-level push provider is the singleton React uses.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import {
  getProvider as getLoggerProvider,
  setProvider as setLoggerProvider,
} from '@molecule/app-logger'
import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'

vi.mock('@molecule/app-push', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-push'

import { setMoleculeContext } from '../../context.js'
import { usePush, type UsePushOptions, type UsePushResult } from '../usePush.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

const mockToken: PushToken = {
  value: 'test-token-123',
  platform: 'web',
  timestamp: Date.now(),
}

/**
 * A push provider whose calls the test inspects.
 *
 * @returns The provider.
 */
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

/**
 * A `Logger` whose `warn` records what it is called with.
 *
 * @param warn - The recording `warn` implementation.
 * @returns The logger.
 */
function createLogger(warn: Logger['warn']): Logger {
  const logger: Logger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn,
    error: () => {},
    setLevel: () => {},
    getLevel: () => 'info',
    child: () => logger,
    withContext: () => logger,
    addTransport: () => () => {},
    removeTransport: () => {},
  }
  return logger
}

/** The mounted hosts this file tears down after each case. */
const mounts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of mounts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls `usePush` once during a child's init.
 *
 * @param options - The hook options (or a store of them).
 * @returns The hook's result.
 */
function mountHook(options?: UsePushOptions): UsePushResult {
  const captured: { result?: UsePushResult } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = usePush(options)
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  mounts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return result
}

describe('usePush', () => {
  let mockProvider: PushProvider
  let loggerProvider: LoggerProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
    loggerProvider = getLoggerProvider()
  })

  afterEach(() => {
    setLoggerProvider(loggerProvider)
  })

  it('returns initial state with null permission and token', () => {
    const result = mountHook()

    expect(get(result.permission)).toBeNull()
    expect(get(result.token)).toBeNull()
  })

  it('checks permission on mount when checkOnMount is true', async () => {
    const result = mountHook({ checkOnMount: true })

    await flush()

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
    expect(get(result.permission)).toBe('default')
  })

  it('logs a permission check on mount that fails', async () => {
    const warn = vi.fn()
    const logger = createLogger(warn)
    const failingLoggerProvider: LoggerProvider = {
      getLogger: () => logger,
      createLogger: () => logger,
      setLevel: () => {},
      getLevel: () => 'info',
      addTransport: () => () => {},
      enable: () => {},
      disable: () => {},
      isEnabled: () => true,
    }
    setLoggerProvider(failingLoggerProvider)
    vi.mocked(mockProvider.checkPermission).mockRejectedValueOnce(
      new Error('permission API unavailable'),
    )
    const result = mountHook({ checkOnMount: true })

    await flush()

    expect(get(result.permission)).toBeNull()
    expect(warn).toHaveBeenCalledWith('Checking push permission on mount failed', {
      error: expect.objectContaining({ message: 'permission API unavailable' }),
    })
  })

  it('does not check permission on mount by default', async () => {
    mountHook()

    await flush()

    expect(mockProvider.checkPermission).not.toHaveBeenCalled()
  })

  it('checkPermission updates permission state', async () => {
    const result = mountHook()

    expect(get(result.permission)).toBeNull()

    const status = await result.checkPermission()
    expect(status).toBe('default')

    expect(get(result.permission)).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
  })

  it('requestPermission updates permission state', async () => {
    const result = mountHook()

    const status = await result.requestPermission()
    expect(status).toBe('granted')

    expect(get(result.permission)).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()
  })

  it('register updates token state', async () => {
    const result = mountHook()

    expect(get(result.token)).toBeNull()

    const token = await result.register()
    expect(token).toEqual(mockToken)

    expect(get(result.token)).toEqual(mockToken)
    expect(mockProvider.register).toHaveBeenCalledOnce()
  })

  it('register forwards options (runtime VAPID public key) to the provider', async () => {
    const result = mountHook()

    await result.register({ vapidPublicKey: 'runtime-key' })

    expect(mockProvider.register).toHaveBeenCalledWith({ vapidPublicKey: 'runtime-key' })
  })

  it('unregister clears token state', async () => {
    const result = mountHook()

    // First register to get a token
    await result.register()

    expect(get(result.token)).toEqual(mockToken)

    // Then unregister
    await result.unregister()

    expect(get(result.token)).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()
  })

  it('onNotificationReceived delegates to provider', () => {
    const result = mountHook()

    const listener = vi.fn()
    result.onNotificationReceived(listener)

    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
  })

  it('onNotificationAction delegates to provider', () => {
    const result = mountHook()

    const listener = vi.fn()
    result.onNotificationAction(listener)

    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
  })

  it('onTokenChange delegates to provider', () => {
    const result = mountHook()

    const listener = vi.fn()
    result.onTokenChange(listener)

    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
  })

  it('setBadge delegates to provider', async () => {
    const result = mountHook()

    await result.setBadge(5)

    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)
  })

  it('clearBadge delegates to provider', async () => {
    const result = mountHook()

    await result.clearBadge()

    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()
  })
})
