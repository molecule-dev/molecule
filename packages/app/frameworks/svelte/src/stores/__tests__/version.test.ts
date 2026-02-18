import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createVersionStores } from '../version.js'

vi.mock('@molecule/app-version', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

const mockGetProvider = getProvider as ReturnType<typeof vi.fn>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockProvider() {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>()

  return {
    getState: vi.fn(() => ({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    })),
    checkForUpdates: vi.fn(() => Promise.resolve(false)),
    applyUpdate: vi.fn(),
    dismissUpdate: vi.fn(),
    startPeriodicChecks: vi.fn(),
    stopPeriodicChecks: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler)
      return () => handlers.get(event)?.delete(handler)
    }),
    off: vi.fn(),
    destroy: vi.fn(),
    setCurrentVersion: vi.fn(),
    getServiceWorker: vi.fn(),
    _emit(event: string) {
      handlers.get(event)?.forEach((h) => h({}))
    },
  }
}

describe('createVersionStores', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockGetProvider.mockReturnValue(mockProvider)
  })

  it('should return initial state from the provider', () => {
    const { state } = createVersionStores()

    expect(get(state)).toEqual({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    })
  })

  it('should derive isUpdateAvailable from state', () => {
    const { isUpdateAvailable } = createVersionStores()

    expect(get(isUpdateAvailable)).toBe(false)
  })

  it('should derive isChecking from state', () => {
    const { isChecking } = createVersionStores()

    expect(get(isChecking)).toBe(false)
  })

  it('should derive isServiceWorkerWaiting from state', () => {
    const { isServiceWorkerWaiting } = createVersionStores()

    expect(get(isServiceWorkerWaiting)).toBe(false)
  })

  it('should derive newVersion from state', () => {
    const { newVersion } = createVersionStores()

    expect(get(newVersion)).toBeUndefined()
  })

  it('should update state when version events fire', () => {
    const { state } = createVersionStores()

    // Subscribe to activate the readable store
    const values: unknown[] = []
    const unsub = state.subscribe((v) => values.push(v))

    // Simulate an update-available event
    mockProvider.getState.mockReturnValue({
      buildId: 'abc123',
      version: '1.0.0',
      isUpdateAvailable: true,
      isServiceWorkerWaiting: false,
      isChecking: false,
      newVersion: '2.0.0',
    })
    mockProvider._emit('update-available')

    expect(get(state).isUpdateAvailable).toBe(true)
    expect(get(state).newVersion).toBe('2.0.0')

    unsub()
  })

  it('should subscribe to all 6 version events', () => {
    const { state } = createVersionStores()
    const unsub = state.subscribe(() => {})

    const expectedEvents = [
      'update-available',
      'service-worker-waiting',
      'service-worker-activated',
      'check-start',
      'check-complete',
      'check-error',
    ]

    expect(mockProvider.on).toHaveBeenCalledTimes(6)
    for (const event of expectedEvents) {
      expect(mockProvider.on).toHaveBeenCalledWith(event, expect.any(Function))
    }

    unsub()
  })

  it('should delegate checkForUpdates to provider', async () => {
    mockProvider.checkForUpdates.mockResolvedValue(true)
    const { checkForUpdates } = createVersionStores()

    const result = await checkForUpdates()

    expect(result).toBe(true)
    expect(mockProvider.checkForUpdates).toHaveBeenCalledOnce()
  })

  it('should delegate applyUpdate to provider', () => {
    const { applyUpdate } = createVersionStores()

    applyUpdate({ force: true })

    expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })
  })

  it('should delegate dismissUpdate to provider', () => {
    const { dismissUpdate } = createVersionStores()

    dismissUpdate()

    expect(mockProvider.dismissUpdate).toHaveBeenCalledOnce()
  })

  it('should delegate startPeriodicChecks to provider', () => {
    const { startPeriodicChecks } = createVersionStores()

    startPeriodicChecks({ interval: 5000 })

    expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({ interval: 5000 })
  })

  it('should delegate stopPeriodicChecks to provider', () => {
    const { stopPeriodicChecks } = createVersionStores()

    stopPeriodicChecks()

    expect(mockProvider.stopPeriodicChecks).toHaveBeenCalledOnce()
  })
})
