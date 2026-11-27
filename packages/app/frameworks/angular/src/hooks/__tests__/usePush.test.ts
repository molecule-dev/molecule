// @vitest-environment jsdom

/**
 * `usePush` — push permission and token state with the provider-backed
 * actions, mirroring React's hook. Every title is React's (`usePush.test.ts`);
 * only the framework-forced mechanics change: the function runs in an
 * injection context (a component field initializer), a signal argument
 * replaces React's re-render with new options, and `fixture.destroy()` replaces
 * unmounting.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Logger, LogLevel } from '@molecule/app-logger'
import type {
  LocalNotificationOptions,
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushNotification,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'

vi.mock('@molecule/app-push', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: vi.fn(),
}))

vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getLogger: vi.fn(),
}))

import { getLogger } from '@molecule/app-logger'
import { getProvider } from '@molecule/app-push'

import { usePush, type UsePushOptions, type UsePushResult } from '../use-push.js'

/** The warning the hook logs when its mount check fails. */
const warnMock = vi.fn<(message: string, ...args: unknown[]) => void>()

const mockToken: PushToken = {
  value: 'test-token-123',
  platform: 'web',
  timestamp: Date.now(),
}

/**
 * A complete typed logger whose `warn` the failing-check case asserts on.
 *
 * @returns The logger.
 */
function createMockLogger(): Logger {
  const logger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: warnMock,
    error: vi.fn(),
    setLevel: vi.fn<(level: LogLevel) => void>(),
    getLevel: vi.fn<() => LogLevel>(() => 'info'),
    child: vi.fn(() => logger),
    withContext: vi.fn(() => logger),
    addTransport: vi.fn(() => () => {}),
    removeTransport: vi.fn(),
  }
  return logger
}

/**
 * A provider stand-in whose every method the cases assert on.
 *
 * @returns The mock provider.
 */
function createMockProvider(): PushProvider {
  return {
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
    scheduleLocal: vi.fn(async (_options: LocalNotificationOptions) => 'notif-id'),
    cancelLocal: vi.fn(async (_id: string) => {}),
    cancelAllLocal: vi.fn(async () => {}),
    getPendingLocal: vi.fn(async () => []),
    getDelivered: vi.fn(async (): Promise<PushNotification[]> => []),
    removeDelivered: vi.fn(async (_ids: string[]) => {}),
    removeAllDelivered: vi.fn(async () => {}),
    setBadge: vi.fn(async (_count: number) => {}),
    getBadge: vi.fn(async () => 0),
    clearBadge: vi.fn(async () => {}),
    destroy: vi.fn(),
  }
}

/** The options the probe is created with; a case replaces them, as React re-renders. */
const pushOptions = signal<UsePushOptions>({})

/** Exposes the hook's result for the mounted component. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-push-probe',
  template: '',
})
class PushProbeComponent {
  readonly push: UsePushResult = usePush(pushOptions)
}

/** Lets every pending promise chain run, including the mount effect's check. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mounts the probe against the current provider.
 *
 * @returns The mounted fixture.
 */
function mount(): ComponentFixture<PushProbeComponent> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [PushProbeComponent],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(PushProbeComponent)
  fixture.detectChanges()
  return fixture
}

let mockProvider: PushProvider

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.clearAllMocks()
  pushOptions.set({})
  mockProvider = createMockProvider()
  vi.mocked(getProvider).mockReturnValue(mockProvider)
  vi.mocked(getLogger).mockReturnValue(createMockLogger())
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('usePush', () => {
  it('returns initial state with null permission and token', () => {
    const push = mount().componentInstance.push

    expect(push.permission()).toBeNull()
    expect(push.token()).toBeNull()
  })

  it('checks permission on mount when checkOnMount is true', async () => {
    pushOptions.set({ checkOnMount: true })
    const push = mount().componentInstance.push

    await settle()

    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
    expect(push.permission()).toBe('default')
  })

  it('logs a permission check on mount that fails', async () => {
    vi.mocked(mockProvider.checkPermission).mockRejectedValueOnce(
      new Error('permission API unavailable'),
    )
    pushOptions.set({ checkOnMount: true })
    const push = mount().componentInstance.push

    await settle()

    expect(push.permission()).toBeNull()
    expect(warnMock).toHaveBeenCalledWith('Checking push permission on mount failed', {
      error: expect.objectContaining({ message: 'permission API unavailable' }),
    })
  })

  it('does not check permission on mount by default', async () => {
    mount()

    await settle()

    expect(mockProvider.checkPermission).not.toHaveBeenCalled()
  })

  it('checkPermission updates permission state', async () => {
    const push = mount().componentInstance.push

    expect(push.permission()).toBeNull()

    const status = await push.checkPermission()
    expect(status).toBe('default')

    expect(push.permission()).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
  })

  it('requestPermission updates permission state', async () => {
    const push = mount().componentInstance.push

    const status = await push.requestPermission()
    expect(status).toBe('granted')

    expect(push.permission()).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()
  })

  it('register updates token state', async () => {
    const push = mount().componentInstance.push

    expect(push.token()).toBeNull()

    const token = await push.register()
    expect(token).toEqual(mockToken)

    expect(push.token()).toEqual(mockToken)
    expect(mockProvider.register).toHaveBeenCalledOnce()
  })

  it('register forwards options (runtime VAPID public key) to the provider', async () => {
    const push = mount().componentInstance.push

    await push.register({ vapidPublicKey: 'runtime-key' })

    expect(mockProvider.register).toHaveBeenCalledWith({ vapidPublicKey: 'runtime-key' })
  })

  it('unregister clears token state', async () => {
    const push = mount().componentInstance.push

    // First register to get a token
    await push.register()

    expect(push.token()).toEqual(mockToken)

    // Then unregister
    await push.unregister()

    expect(push.token()).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()
  })

  it('onNotificationReceived delegates to provider', () => {
    const push = mount().componentInstance.push

    const listener = vi.fn()
    push.onNotificationReceived(listener)

    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
  })

  it('onNotificationAction delegates to provider', () => {
    const push = mount().componentInstance.push

    const listener = vi.fn()
    push.onNotificationAction(listener)

    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
  })

  it('onTokenChange delegates to provider', () => {
    const push = mount().componentInstance.push

    const listener = vi.fn()
    push.onTokenChange(listener)

    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
  })

  it('setBadge delegates to provider', async () => {
    const push = mount().componentInstance.push

    await push.setBadge(5)

    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)
  })

  it('clearBadge delegates to provider', async () => {
    const push = mount().componentInstance.push

    await push.clearBadge()

    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()
  })
})
