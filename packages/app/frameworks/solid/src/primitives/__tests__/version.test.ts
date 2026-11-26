import { createRoot } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VersionEvent } from '@molecule/app-version'

import { createVersion, useVersion } from '../version.js'

const mockProvider = {
  getState: vi.fn(),
  setCurrentVersion: vi.fn(),
  checkForUpdates: vi.fn(),
  startPeriodicChecks: vi.fn(),
  stopPeriodicChecks: vi.fn(),
  getServiceWorker: vi.fn(),
  applyUpdate: vi.fn(),
  dismissUpdate: vi.fn(),
  // The snapshot subscription (`useVersion`) always passes a no-arg state-change handler.
  on: vi.fn<(event: VersionEvent, handler: () => void) => () => void>(),
  off: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('@molecule/app-version', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: () => mockProvider,
}))

describe('createVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider.getState.mockReturnValue({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    })
    mockProvider.on.mockReturnValue(vi.fn())
  })

  it('returns initial state from provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state } = createVersion()

        expect(state().version).toBe('1.0.0')
        expect(state().buildId).toBe('abc123')
        expect(state().isUpdateAvailable).toBe(false)

        dispose()
        resolve()
      })
    })
  })

  it('returns derived accessors for convenience properties', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { isUpdateAvailable, isChecking, isServiceWorkerWaiting, newVersion } =
          createVersion()

        expect(isUpdateAvailable()).toBe(false)
        expect(isChecking()).toBe(false)
        expect(isServiceWorkerWaiting()).toBe(false)
        expect(newVersion()).toBeUndefined()

        dispose()
        resolve()
      })
    })
  })

  it('subscribes to all version events on creation', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        createVersion()

        const events = mockProvider.on.mock.calls.map((call: [string, () => void]) => call[0])
        expect(events).toContain('update-available')
        expect(events).toContain('service-worker-waiting')
        expect(events).toContain('service-worker-activated')
        expect(events).toContain('check-start')
        expect(events).toContain('check-complete')
        expect(events).toContain('check-error')
        expect(mockProvider.on).toHaveBeenCalledTimes(6)

        dispose()
        resolve()
      })
    })
  })

  it('updates state when version event fires', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state } = createVersion()

        // Simulate an event firing by calling the handler
        const handler = mockProvider.on.mock.calls[0][1]
        mockProvider.getState.mockReturnValue({
          buildId: 'abc123',
          version: '1.0.0',
          isUpdateAvailable: true,
          isServiceWorkerWaiting: false,
          isChecking: false,
          newVersion: '2.0.0',
        })
        handler()

        // The snapshot engine renders on the scheduler (React's
        // useSyncExternalStore cadence), so the new state commits on the next
        // microtask rather than inside the notification.
        queueMicrotask(() => {
          expect(state().isUpdateAvailable).toBe(true)
          expect(state().newVersion).toBe('2.0.0')

          dispose()
          resolve()
        })
      })
    })
  })

  it('delegates checkForUpdates to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockProvider.checkForUpdates.mockResolvedValue(true)

        const { checkForUpdates } = createVersion()
        const result = await checkForUpdates()

        expect(result).toBe(true)
        expect(mockProvider.checkForUpdates).toHaveBeenCalled()

        dispose()
        resolve()
      })
    })
  })

  it('delegates applyUpdate to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { applyUpdate } = createVersion()
        applyUpdate({ force: true })

        expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })

        dispose()
        resolve()
      })
    })
  })

  it('delegates dismissUpdate to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { dismissUpdate } = createVersion()
        dismissUpdate()

        expect(mockProvider.dismissUpdate).toHaveBeenCalled()

        dispose()
        resolve()
      })
    })
  })

  it('delegates startPeriodicChecks to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { startPeriodicChecks } = createVersion()
        startPeriodicChecks({ interval: 60000, immediate: true })

        expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({
          interval: 60000,
          immediate: true,
        })

        dispose()
        resolve()
      })
    })
  })

  it('delegates stopPeriodicChecks to provider', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { stopPeriodicChecks } = createVersion()
        stopPeriodicChecks()

        expect(mockProvider.stopPeriodicChecks).toHaveBeenCalled()

        dispose()
        resolve()
      })
    })
  })

  it('cleans up event subscriptions on dispose', () => {
    return new Promise<void>((resolve) => {
      const unsubscribeFns = Array.from({ length: 6 }, () => vi.fn())
      let callIdx = 0
      mockProvider.on.mockImplementation(() => {
        const fn = unsubscribeFns[callIdx]
        callIdx++
        return fn
      })

      createRoot((dispose) => {
        createVersion()

        dispose()

        for (const unsub of unsubscribeFns) {
          expect(unsub).toHaveBeenCalled()
        }

        resolve()
      })
    })
  })
})

describe('useVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider.getState.mockReturnValue({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    })
    mockProvider.on.mockReturnValue(vi.fn())
  })

  it('subscribes to all 6 version events', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        useVersion()

        const onCalls = mockProvider.on.mock.calls
        const subscribedEvents = onCalls.map(([event]) => event)

        expect(subscribedEvents).toContain('update-available')
        expect(subscribedEvents).toContain('service-worker-waiting')
        expect(subscribedEvents).toContain('service-worker-activated')
        expect(subscribedEvents).toContain('check-start')
        expect(subscribedEvents).toContain('check-complete')
        expect(subscribedEvents).toContain('check-error')
        expect(onCalls).toHaveLength(6)

        dispose()
        resolve()
      })
    })
  })

  it('updates state when events fire', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { isUpdateAvailable, newVersion } = useVersion()

        expect(isUpdateAvailable()).toBe(false)

        // Simulate the provider announcing a change: the same handler the
        // subscription registered, then the provider's new snapshot.
        const handler = mockProvider.on.mock.calls[0][1]
        mockProvider.getState.mockReturnValue({
          buildId: 'abc123',
          version: '1.0.0',
          isUpdateAvailable: true,
          isServiceWorkerWaiting: false,
          isChecking: false,
          newVersion: '2.0.0',
        })
        handler()

        // The snapshot engine renders on the scheduler (React's
        // useSyncExternalStore cadence), so the new state commits on the next
        // microtask rather than inside the notification.
        queueMicrotask(() => {
          expect(isUpdateAvailable()).toBe(true)
          expect(newVersion()).toBe('2.0.0')

          dispose()
          resolve()
        })
      })
    })
  })

  it('caches snapshot for referential stability', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        // A fresh object per read, like React's fixture: only the hook's cache
        // can make two reads agree on the reference.
        mockProvider.getState.mockImplementation(() => ({
          buildId: 'abc123',
          version: '1.0.0',
          isUpdateAvailable: false,
          isServiceWorkerWaiting: false,
          isChecking: false,
        }))

        const { state } = useVersion()

        const firstState = state()
        // Solid's stand-in for React's rerender: the subscription's change
        // callback runs again with an equal snapshot.
        const handler = mockProvider.on.mock.calls[0][1]
        handler()

        queueMicrotask(() => {
          // Same reference since nothing changed
          expect(state()).toBe(firstState)

          dispose()
          resolve()
        })
      })
    })
  })

  it('unsubscribes from all events on unmount', () => {
    return new Promise<void>((resolve) => {
      const unsubFns = Array.from({ length: 6 }, () => vi.fn())
      let callIndex = 0
      mockProvider.on.mockImplementation(() => {
        const unsub = unsubFns[callIndex]
        callIndex++
        return unsub
      })

      createRoot((dispose) => {
        useVersion()

        unsubFns.forEach((fn) => expect(fn).not.toHaveBeenCalled())

        dispose()

        unsubFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce())

        resolve()
      })
    })
  })
})
