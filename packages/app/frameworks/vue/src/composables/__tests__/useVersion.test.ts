import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type { VersionState } from '@molecule/app-version'

import type { UseVersionReturn } from '../useVersion.js'
import { useVersion } from '../useVersion.js'

vi.mock('@molecule/app-version', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

const createMockProvider = () => ({
  getState: vi.fn().mockReturnValue({
    buildId: 'abc123',
    version: '1.0.0',
    isUpdateAvailable: false,
    isServiceWorkerWaiting: false,
    isChecking: false,
  }),
  checkForUpdates: vi.fn().mockResolvedValue(false),
  applyUpdate: vi.fn(),
  dismissUpdate: vi.fn(),
  startPeriodicChecks: vi.fn(),
  stopPeriodicChecks: vi.fn(),
  on: vi.fn().mockReturnValue(vi.fn()),
  off: vi.fn(),
  destroy: vi.fn(),
  setCurrentVersion: vi.fn(),
  getServiceWorker: vi.fn(),
})

describe('useVersion', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider as never)
  })

  it('returns initial state from provider', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    scope.run(() => {
      result = useVersion()
    })

    expect(result.state.value).toEqual({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    })
    expect(result.isUpdateAvailable.value).toBe(false)
    expect(result.isChecking.value).toBe(false)
    expect(result.isServiceWorkerWaiting.value).toBe(false)
    expect(result.newVersion.value).toBeUndefined()

    scope.stop()
  })

  it('subscribes to all version events on creation', () => {
    const scope = effectScope()

    scope.run(() => {
      useVersion()
    })

    expect(mockProvider.on).toHaveBeenCalledTimes(6)
    expect(mockProvider.on).toHaveBeenCalledWith('update-available', expect.any(Function))
    expect(mockProvider.on).toHaveBeenCalledWith('service-worker-waiting', expect.any(Function))
    expect(mockProvider.on).toHaveBeenCalledWith('service-worker-activated', expect.any(Function))
    expect(mockProvider.on).toHaveBeenCalledWith('check-start', expect.any(Function))
    expect(mockProvider.on).toHaveBeenCalledWith('check-complete', expect.any(Function))
    expect(mockProvider.on).toHaveBeenCalledWith('check-error', expect.any(Function))

    scope.stop()
  })

  it('updates state reactively when events fire', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    // Capture the event callback
    const eventCallbacks: Array<() => void> = []
    mockProvider.on.mockImplementation((_event: string, cb: () => void) => {
      eventCallbacks.push(cb)
      return vi.fn()
    })

    scope.run(() => {
      result = useVersion()
    })

    expect(result.isUpdateAvailable.value).toBe(false)

    // Simulate update-available event by changing provider state and calling callback
    mockProvider.getState.mockReturnValue({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: true,
      isServiceWorkerWaiting: false,
      isChecking: false,
      newVersion: '2.0.0',
    })

    // Call the first event callback (update-available)
    eventCallbacks[0]()

    expect(result.isUpdateAvailable.value).toBe(true)
    expect(result.newVersion.value).toBe('2.0.0')

    scope.stop()
  })

  it('unsubscribes from all events on scope dispose', () => {
    const scope = effectScope()
    const unsubs = Array.from({ length: 6 }, () => vi.fn())
    let callIndex = 0

    mockProvider.on.mockImplementation(() => {
      return unsubs[callIndex++]
    })

    scope.run(() => {
      useVersion()
    })

    // Verify none called before stop
    for (const unsub of unsubs) {
      expect(unsub).not.toHaveBeenCalled()
    }

    scope.stop()

    // All unsubscribers should be called
    for (const unsub of unsubs) {
      expect(unsub).toHaveBeenCalledOnce()
    }
  })

  it('delegates checkForUpdates to provider', async () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    mockProvider.checkForUpdates.mockResolvedValue(true)

    scope.run(() => {
      result = useVersion()
    })

    const found = await result.checkForUpdates()
    expect(found).toBe(true)
    expect(mockProvider.checkForUpdates).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('delegates applyUpdate to provider', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    scope.run(() => {
      result = useVersion()
    })

    result.applyUpdate({ force: true })
    expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })

    scope.stop()
  })

  it('delegates dismissUpdate to provider', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    scope.run(() => {
      result = useVersion()
    })

    result.dismissUpdate()
    expect(mockProvider.dismissUpdate).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('delegates startPeriodicChecks to provider', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    scope.run(() => {
      result = useVersion()
    })

    result.startPeriodicChecks({ interval: 5000, immediate: true })
    expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({
      interval: 5000,
      immediate: true,
    })

    scope.stop()
  })

  it('delegates stopPeriodicChecks to provider', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    scope.run(() => {
      result = useVersion()
    })

    result.stopPeriodicChecks()
    expect(mockProvider.stopPeriodicChecks).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('reflects isChecking state changes', () => {
    const scope = effectScope()
    let result!: UseVersionReturn

    const eventCallbacks: Array<() => void> = []
    mockProvider.on.mockImplementation((_event: string, cb: () => void) => {
      eventCallbacks.push(cb)
      return vi.fn()
    })

    scope.run(() => {
      result = useVersion()
    })

    expect(result.isChecking.value).toBe(false)

    mockProvider.getState.mockReturnValue({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: true,
    })

    // Fire check-start event (4th subscription)
    eventCallbacks[3]()

    expect(result.isChecking.value).toBe(true)

    scope.stop()
  })

  it('subscribes to all 6 version events', () => {
    const scope = effectScope()

    scope.run(() => {
      useVersion()
    })

    const subscribedEvents: string[] = mockProvider.on.mock.calls.map(([event]) => event)

    expect(subscribedEvents).toContain('update-available')
    expect(subscribedEvents).toContain('service-worker-waiting')
    expect(subscribedEvents).toContain('service-worker-activated')
    expect(subscribedEvents).toContain('check-start')
    expect(subscribedEvents).toContain('check-complete')
    expect(subscribedEvents).toContain('check-error')
    expect(mockProvider.on.mock.calls).toHaveLength(6)

    scope.stop()
  })

  it('updates state when events fire', () => {
    const scope = effectScope()
    let result!: UseVersionReturn
    const eventCallbacks: Array<() => void> = []
    mockProvider.on.mockImplementation((_event: string, cb: () => void) => {
      eventCallbacks.push(cb)
      return vi.fn()
    })

    scope.run(() => {
      result = useVersion()
    })

    expect(result.isUpdateAvailable.value).toBe(false)

    mockProvider.getState.mockReturnValue({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: true,
      isServiceWorkerWaiting: false,
      isChecking: false,
      newVersion: '2.0.0',
    })
    // `update-available` is the first subscription.
    eventCallbacks[0]()

    expect(result.isUpdateAvailable.value).toBe(true)
    expect(result.newVersion.value).toBe('2.0.0')

    scope.stop()
  })

  it('caches snapshot for referential stability', () => {
    const scope = effectScope()
    let result!: UseVersionReturn
    const eventCallbacks: Array<() => void> = []
    // The provider hands out a NEW object per read, exactly like the real one;
    // equal fields must still resolve to the object the composable already has.
    const readState = (): VersionState => ({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    })
    mockProvider.getState.mockImplementation(readState)
    mockProvider.on.mockImplementation((_event: string, cb: () => void) => {
      eventCallbacks.push(cb)
      return vi.fn()
    })

    scope.run(() => {
      result = useVersion()
    })

    const firstState = result.state.value
    // An event with unchanged contents: no new snapshot is adopted.
    eventCallbacks[0]()
    const secondState = result.state.value

    expect(firstState).toBe(secondState)

    scope.stop()
  })

  it('unsubscribes from all events on unmount', () => {
    const unsubFns = Array.from({ length: 6 }, () => vi.fn())
    let callIndex = 0
    mockProvider.on.mockImplementation(() => {
      const unsub = unsubFns[callIndex]
      callIndex++
      return unsub
    })
    // A component's unmount disposes the effect scope it owns, which is where a
    // composable registers its disposal — the Vue form of React's unmount cleanup.
    const scope = effectScope()

    scope.run(() => {
      useVersion()
    })

    unsubFns.forEach((fn) => expect(fn).not.toHaveBeenCalled())

    scope.stop()

    unsubFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce())
  })
})
