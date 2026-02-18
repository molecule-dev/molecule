import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type { UseVersionReturn } from '../useVersion.js'
import { useVersion } from '../useVersion.js'

vi.mock('@molecule/app-version', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

const createMockProvider = (): ReturnType<typeof createMockProvider> => ({
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
})
