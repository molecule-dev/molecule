import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createVersionService } from '../version.service.js'

vi.mock('@molecule/app-version', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

const mockGetProvider = vi.mocked(getProvider)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockProvider = () => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>()

  return {
    getState: vi.fn().mockReturnValue({
      buildId: 'build-1',
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
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler)
      return () => {
        handlers.get(event)?.delete(handler)
      }
    }),
    off: vi.fn(),
    setCurrentVersion: vi.fn(),
    getServiceWorker: vi.fn(),
    destroy: vi.fn(),
    _emit: (event: string, data?: unknown) => {
      handlers.get(event)?.forEach((h) => h(data))
    },
    _handlers: handlers,
  }
}

describe('createVersionService', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockGetProvider.mockReturnValue(mockProvider as never)
  })

  it('should return initial state from provider', async () => {
    const service = createVersionService()
    const state = await firstValueFrom(service.state$)

    expect(state.buildId).toBe('build-1')
    expect(state.version).toBe('1.0.0')
    expect(state.isUpdateAvailable).toBe(false)
  })

  it('should derive isUpdateAvailable$ from state', async () => {
    const service = createVersionService()
    const isAvailable = await firstValueFrom(service.isUpdateAvailable$)

    expect(isAvailable).toBe(false)
  })

  it('should derive isChecking$ from state', async () => {
    const service = createVersionService()
    const isChecking = await firstValueFrom(service.isChecking$)

    expect(isChecking).toBe(false)
  })

  it('should derive isServiceWorkerWaiting$ from state', async () => {
    const service = createVersionService()
    const isWaiting = await firstValueFrom(service.isServiceWorkerWaiting$)

    expect(isWaiting).toBe(false)
  })

  it('should derive newVersion$ from state', async () => {
    const service = createVersionService()
    const newVersion = await firstValueFrom(service.newVersion$)

    expect(newVersion).toBeUndefined()
  })

  it('should subscribe to all version events', () => {
    createVersionService()

    const events = [
      'update-available',
      'service-worker-waiting',
      'service-worker-activated',
      'check-start',
      'check-complete',
      'check-error',
    ]

    expect(mockProvider.on).toHaveBeenCalledTimes(6)
    for (const event of events) {
      expect(mockProvider.on).toHaveBeenCalledWith(event, expect.any(Function))
    }
  })

  it('should update state$ when events fire', async () => {
    const service = createVersionService()

    const states: unknown[] = []
    service.state$.subscribe((s) => states.push(s))

    // Simulate an event causing state change
    mockProvider.getState.mockReturnValue({
      buildId: 'build-2',
      version: '2.0.0',
      isUpdateAvailable: true,
      isServiceWorkerWaiting: false,
      isChecking: false,
      newVersion: '2.0.0',
    })

    mockProvider._emit('update-available')

    expect(states.length).toBe(2)
    expect((states[1] as { isUpdateAvailable: boolean }).isUpdateAvailable).toBe(true)
  })

  it('should delegate checkForUpdates to provider', async () => {
    const service = createVersionService()

    await service.checkForUpdates()
    expect(mockProvider.checkForUpdates).toHaveBeenCalled()
  })

  it('should delegate applyUpdate to provider', () => {
    const service = createVersionService()

    service.applyUpdate({ force: true })
    expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })
  })

  it('should delegate dismissUpdate to provider', () => {
    const service = createVersionService()

    service.dismissUpdate()
    expect(mockProvider.dismissUpdate).toHaveBeenCalled()
  })

  it('should delegate startPeriodicChecks to provider', () => {
    const service = createVersionService()

    service.startPeriodicChecks({ interval: 5000 })
    expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({ interval: 5000 })
  })

  it('should delegate stopPeriodicChecks to provider', () => {
    const service = createVersionService()

    service.stopPeriodicChecks()
    expect(mockProvider.stopPeriodicChecks).toHaveBeenCalled()
  })

  it('should delegate getState to provider', () => {
    const service = createVersionService()

    service.getState()
    expect(mockProvider.getState).toHaveBeenCalled()
  })

  it('should unsubscribe from events and complete subject on destroy', () => {
    const service = createVersionService()

    let completed = false
    service.state$.subscribe({ complete: () => (completed = true) })

    service.destroy()

    expect(completed).toBe(true)
    // Verify unsubscribe functions were created for all 6 events
    expect(mockProvider.on).toHaveBeenCalledTimes(6)
  })
})
