// @vitest-environment jsdom
/**
 * `useVersion`: React's `useVersion.test.ts` cases in Svelte's idiom.
 *
 * A Svelte hook runs once, during component init, and publishes through
 * stores; `useSyncExternalStore` there reads `provider.getState()` with React's
 * own cadence. This file stubs the `svelte` lifecycle the same way the
 * package's `hooks.test.ts` does, so `renderHook`/`unmount` read like React's
 * and the state is read with `get()`.
 *
 * @module
 */

import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ServiceWorkerController,
  VersionEvent,
  VersionEventHandler,
  VersionProvider,
  VersionState,
} from '@molecule/app-version'

vi.mock('@molecule/app-version', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

import { useVersion } from '../useVersion.js'

// --- Mock svelte's lifecycle ---
const svelteLifecycle = vi.hoisted(() => ({
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

/** Lets the store's scheduled render run. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Runs `run` once, the way a component's init does.
 *
 * @param run - Calls the hook under test; its return value is kept.
 * @returns The hook's result, plus the teardown that runs its destroy callbacks.
 */
function renderHook<T>(run: () => T): { result: T; unmount: () => void } {
  svelteLifecycle.destroyCallbacks.length = 0
  const result = run()
  return {
    result,
    unmount: () => {
      for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
    },
  }
}

/** A `VersionProvider` whose events the test fires by hand. */
interface MockVersionProvider extends VersionProvider {
  /** Replaces the state fields the next `getState()` reports. */
  setState(partial: Partial<VersionState>): void
  /** Fires one lifecycle event. */
  emit(event: VersionEvent): void
  /** Every event the hook subscribed, in order. */
  subscribed: VersionEvent[]
  /** Every unsubscribe the hook received. */
  unsubscribers: Array<() => void>
}

/**
 * The service worker controller the provider hands out (never used here).
 *
 * @returns A no-op controller.
 */
function createController(): ServiceWorkerController {
  return {
    register: async () => null,
    unregister: async () => false,
    update: async () => {},
    skipWaiting: () => {},
    getRegistration: () => null,
    getWaiting: () => null,
    isWaiting: () => false,
    postMessage: () => {},
  }
}

/**
 * A version provider whose listeners and state the test drives.
 *
 * @param initialState - State fields to start from.
 * @returns The provider.
 */
function createMockProvider(initialState?: Partial<VersionState>): MockVersionProvider {
  let state: VersionState = {
    buildId: 'abc123',
    version: '1.0.0',
    isUpdateAvailable: false,
    isServiceWorkerWaiting: false,
    isChecking: false,
    ...initialState,
  }

  const listeners = new Map<VersionEvent, Set<VersionEventHandler<unknown>>>()
  const subscribed: VersionEvent[] = []
  const unsubscribers: Array<() => void> = []

  /**
   * Fires one lifecycle event to the current listeners.
   *
   * @param event - The event to fire.
   */
  const emit = (event: VersionEvent): void => {
    listeners.get(event)?.forEach((handler) => handler(undefined))
  }

  const provider: MockVersionProvider = {
    getState: () => ({ ...state }),
    setCurrentVersion: vi.fn(),
    checkForUpdates: vi.fn(async () => {
      state = { ...state, isChecking: true }
      emit('check-start')
      state = { ...state, isChecking: false }
      emit('check-complete')
      return false
    }),
    startPeriodicChecks: vi.fn(),
    stopPeriodicChecks: vi.fn(),
    getServiceWorker: () => createController(),
    applyUpdate: vi.fn(),
    dismissUpdate: vi.fn(() => {
      state = { ...state, isUpdateAvailable: false }
    }),
    on: <T>(event: VersionEvent, handler: VersionEventHandler<T>): (() => void) => {
      const slot = handler as VersionEventHandler<unknown>
      const set = listeners.get(event) ?? new Set<VersionEventHandler<unknown>>()
      set.add(slot)
      listeners.set(event, set)
      subscribed.push(event)
      const unsubscribe = vi.fn(() => {
        set.delete(slot)
      })
      unsubscribers.push(unsubscribe)
      return unsubscribe
    },
    off: <T>(_event: VersionEvent, _handler: VersionEventHandler<T>): void => {},
    destroy: vi.fn(),
    setState: (partial) => {
      state = { ...state, ...partial }
    },
    emit,
    subscribed,
    unsubscribers,
  }

  return provider
}

describe('useVersion', () => {
  let mockProvider: MockVersionProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('subscribes to all 6 version events', () => {
    const { unmount } = renderHook(() => useVersion())

    const subscribedEvents = mockProvider.subscribed

    expect(subscribedEvents).toContain('update-available')
    expect(subscribedEvents).toContain('service-worker-waiting')
    expect(subscribedEvents).toContain('service-worker-activated')
    expect(subscribedEvents).toContain('check-start')
    expect(subscribedEvents).toContain('check-complete')
    expect(subscribedEvents).toContain('check-error')
    expect(subscribedEvents).toHaveLength(6)
    unmount()
  })

  it('updates state when events fire', async () => {
    const { result, unmount } = renderHook(() => useVersion())

    expect(get(result.isUpdateAvailable)).toBe(false)

    mockProvider.setState({ isUpdateAvailable: true, newVersion: '2.0.0' })
    mockProvider.emit('update-available')
    // The notification schedules a render, as React's scheduler does.
    await flush()

    expect(get(result.isUpdateAvailable)).toBe(true)
    expect(get(result.newVersion)).toBe('2.0.0')
    unmount()
  })

  it('caches snapshot for referential stability', async () => {
    const { result, unmount } = renderHook(() => useVersion())

    const firstState = get(result.state)
    // The provider reports a FRESH object with the same fields, as a real
    // provider does; the cached snapshot must keep the previous reference.
    mockProvider.setState({})
    mockProvider.emit('update-available')
    await flush()

    expect(get(result.state)).toBe(firstState)
    unmount()
  })

  it('delegates checkForUpdates to provider', async () => {
    const { result, unmount } = renderHook(() => useVersion())

    await result.checkForUpdates()

    expect(mockProvider.checkForUpdates).toHaveBeenCalledOnce()
    unmount()
  })

  it('delegates applyUpdate to provider', () => {
    const { result, unmount } = renderHook(() => useVersion())

    result.applyUpdate({ force: true })

    expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })
    unmount()
  })

  it('delegates dismissUpdate to provider', () => {
    const { result, unmount } = renderHook(() => useVersion())

    result.dismissUpdate()

    expect(mockProvider.dismissUpdate).toHaveBeenCalledOnce()
    unmount()
  })

  it('delegates startPeriodicChecks to provider', () => {
    const { result, unmount } = renderHook(() => useVersion())

    result.startPeriodicChecks({ interval: 30000, immediate: true })

    expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({
      interval: 30000,
      immediate: true,
    })
    unmount()
  })

  it('delegates stopPeriodicChecks to provider', () => {
    const { result, unmount } = renderHook(() => useVersion())

    result.stopPeriodicChecks()

    expect(mockProvider.stopPeriodicChecks).toHaveBeenCalledOnce()
    unmount()
  })

  it('unsubscribes from all events on unmount', () => {
    const { unmount } = renderHook(() => useVersion())

    const unsubFns = mockProvider.unsubscribers
    expect(unsubFns).toHaveLength(6)
    unsubFns.forEach((fn) => expect(fn).not.toHaveBeenCalled())

    unmount()

    unsubFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce())
  })
})
