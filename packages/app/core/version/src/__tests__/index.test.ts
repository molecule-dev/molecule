// @vitest-environment happy-dom
/**
 * Comprehensive tests for `@molecule/app-version` module.
 *
 * Tests version tracking, update detection, service worker management,
 * periodic checks, and provider management.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ServiceWorkerController,
  UpdateCheckOptions,
  VersionEvent,
  VersionEventHandler,
  VersionInfo,
  VersionProvider,
  VersionState,
} from '../index.js'
import {
  applyUpdate,
  checkForUpdates,
  createServiceWorkerController,
  createVersionChecker,
  createWebVersionProvider,
  DEFAULT_CHECK_INTERVAL,
  DEFAULT_VERSION_URL,
  dismissUpdate,
  getProvider,
  getServiceWorker,
  getState,
  setCurrentVersion,
  setProvider,
  startPeriodicChecks,
  stopPeriodicChecks,
} from '../index.js'

describe('@molecule/app-version', () => {
  // Store original window.location
  let originalLocation: Location
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalLocation = window.location
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
    // Reset provider
    setProvider(null as unknown as VersionProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile VersionInfo type', () => {
      const info: VersionInfo = {
        buildId: 'build-123',
        version: '1.0.0',
        buildTime: '2024-01-15T10:00:00Z',
        commitHash: 'abc123',
        branch: 'main',
      }
      expect(info.version).toBe('1.0.0')
    })

    it('should compile VersionState type', () => {
      const state: VersionState = {
        buildId: 'build-123',
        version: '1.0.0',
        isUpdateAvailable: false,
        isServiceWorkerWaiting: false,
        isChecking: false,
        lastChecked: new Date(),
        newBuildId: undefined,
        newVersion: undefined,
      }
      expect(state.isUpdateAvailable).toBe(false)
    })

    it('should compile UpdateCheckOptions type', () => {
      const options: UpdateCheckOptions = {
        versionUrl: '/custom-version.json',
        interval: 60000,
        immediate: true,
      }
      expect(options.interval).toBe(60000)
    })

    it('should compile VersionEvent type', () => {
      const events: VersionEvent[] = [
        'update-available',
        'service-worker-waiting',
        'service-worker-activated',
        'check-start',
        'check-complete',
        'check-error',
      ]
      expect(events).toHaveLength(6)
    })

    it('should compile VersionEventHandler type', () => {
      const handler: VersionEventHandler<{ version: string }> = (data) => {
        expect(data.version).toBeDefined()
      }
      handler({ version: '1.0.0' })
    })
  })

  describe('Constants', () => {
    it('should export DEFAULT_CHECK_INTERVAL', () => {
      expect(DEFAULT_CHECK_INTERVAL).toBe(5 * 60 * 1000) // 5 minutes
    })

    it('should export DEFAULT_VERSION_URL', () => {
      expect(DEFAULT_VERSION_URL).toBe('/version.json')
    })
  })

  describe('createVersionChecker', () => {
    it('should create a check function', () => {
      const getState = vi.fn().mockReturnValue({ buildId: '', version: '' })
      const updateState = vi.fn()
      const emit = vi.fn()

      const checker = createVersionChecker(getState, updateState, emit)

      expect(typeof checker).toBe('function')
    })

    it('should emit check-start event', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: 'current', version: '1.0.0' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'current', version: '1.0.0' }),
      })

      const checker = createVersionChecker(getState, updateState, emit)
      await checker()

      expect(emit).toHaveBeenCalledWith('check-start', {})
      expect(updateState).toHaveBeenCalledWith({ isChecking: true })
    })

    it('should detect update when buildId changes', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: 'old-build', version: '1.0.0' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new-build', version: '1.0.0' }),
      })

      const checker = createVersionChecker(getState, updateState, emit)
      const result = await checker()

      expect(result).toBe(true)
      expect(updateState).toHaveBeenCalledWith({
        newBuildId: 'new-build',
        newVersion: '1.0.0',
        isUpdateAvailable: true,
      })
      expect(emit).toHaveBeenCalledWith('update-available', expect.any(Object))
    })

    it('should detect update when version changes', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: 'build', version: '1.0.0' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '2.0.0' }),
      })

      const checker = createVersionChecker(getState, updateState, emit)
      const result = await checker()

      expect(result).toBe(true)
      expect(emit).toHaveBeenCalledWith(
        'update-available',
        expect.objectContaining({
          new: expect.objectContaining({ version: '2.0.0' }),
        }),
      )
    })

    it('should not detect update when versions match', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: 'build-123', version: '1.0.0' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build-123', version: '1.0.0' }),
      })

      const checker = createVersionChecker(getState, updateState, emit)
      const result = await checker()

      expect(result).toBe(false)
      expect(emit).toHaveBeenCalledWith('check-complete', { hasUpdate: false })
    })

    it('should initialize version if not set', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: '', version: '' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'initial-build', version: '1.0.0' }),
      })

      const checker = createVersionChecker(getState, updateState, emit)
      await checker()

      expect(updateState).toHaveBeenCalledWith({ buildId: 'initial-build' })
      expect(updateState).toHaveBeenCalledWith({ version: '1.0.0' })
    })

    it('should handle fetch error', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: 'build', version: '1.0.0' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockRejectedValue(new Error('Network error'))

      const checker = createVersionChecker(getState, updateState, emit)
      const result = await checker()

      expect(result).toBe(false)
      expect(updateState).toHaveBeenCalledWith({ isChecking: false })
      expect(emit).toHaveBeenCalledWith('check-error', { error: expect.any(Error) })
    })

    it('should handle non-ok response', async () => {
      const getState = vi.fn().mockReturnValue({ buildId: 'build', version: '1.0.0' })
      const updateState = vi.fn()
      const emit = vi.fn()

      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const checker = createVersionChecker(getState, updateState, emit)
      const result = await checker()

      expect(result).toBe(false)
      expect(emit).toHaveBeenCalledWith('check-error', { error: expect.any(Error) })
    })
  })

  describe('createServiceWorkerController', () => {
    let mockServiceWorker: {
      register: ReturnType<typeof vi.fn>
      controller: unknown
      addEventListener: ReturnType<typeof vi.fn>
    }
    let mockRegistration: {
      installing: unknown
      waiting: unknown
      addEventListener: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      unregister: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      mockRegistration = {
        installing: null,
        waiting: null,
        addEventListener: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        unregister: vi.fn().mockResolvedValue(true),
      }

      mockServiceWorker = {
        register: vi.fn().mockResolvedValue(mockRegistration),
        controller: null,
        addEventListener: vi.fn(),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        configurable: true,
      })
    })

    it('should create a controller', () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)

      expect(controller).toHaveProperty('register')
      expect(controller).toHaveProperty('unregister')
      expect(controller).toHaveProperty('update')
      expect(controller).toHaveProperty('skipWaiting')
      expect(controller).toHaveProperty('getRegistration')
      expect(controller).toHaveProperty('getWaiting')
      expect(controller).toHaveProperty('isWaiting')
      expect(controller).toHaveProperty('postMessage')
    })

    it('should register service worker', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      const registration = await controller.register('/sw.js')

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(registration).toBe(mockRegistration)
    })

    it('should use default service worker URL', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/service-worker.js')
    })

    it('should return null when service worker not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      })

      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      const registration = await controller.register()

      expect(registration).toBeNull()
    })

    it('should handle registration error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'))

      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      const registration = await controller.register()

      expect(registration).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Service worker registration failed:',
        expect.any(Error),
      )
    })

    it('should unregister service worker', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()
      const result = await controller.unregister()

      expect(result).toBe(true)
      expect(mockRegistration.unregister).toHaveBeenCalled()
    })

    it('should return false when unregistering without registration', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      const result = await controller.unregister()

      expect(result).toBe(false)
    })

    it('should update service worker', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()
      await controller.update()

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should get registration', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()

      expect(controller.getRegistration()).toBe(mockRegistration)
    })

    it('should get waiting service worker', async () => {
      const mockWaiting = { postMessage: vi.fn() }
      mockRegistration.waiting = mockWaiting

      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()

      expect(controller.getWaiting()).toBe(mockWaiting)
    })

    it('should check if waiting', async () => {
      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()

      expect(controller.isWaiting()).toBe(false)

      mockRegistration.waiting = { postMessage: vi.fn() }
      expect(controller.isWaiting()).toBe(true)
    })

    it('should post message to controller', async () => {
      const mockController = { postMessage: vi.fn() }
      mockServiceWorker.controller = mockController

      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      controller.postMessage({ type: 'TEST' })

      expect(mockController.postMessage).toHaveBeenCalledWith({ type: 'TEST' })
    })

    it('should send SKIP_WAITING message', async () => {
      const mockWaiting = { postMessage: vi.fn() }
      mockRegistration.waiting = mockWaiting

      const updateState = vi.fn()
      const emit = vi.fn()

      const { controller } = createServiceWorkerController(updateState, emit)
      await controller.register()
      controller.skipWaiting()

      expect(mockWaiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    })
  })

  describe('createWebVersionProvider', () => {
    beforeEach(() => {
      // Mock service worker
      const mockRegistration = {
        installing: null,
        waiting: null,
        addEventListener: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        unregister: vi.fn().mockResolvedValue(true),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          controller: null,
          addEventListener: vi.fn(),
        },
        configurable: true,
      })
    })

    it('should create a provider with initial state', () => {
      const provider = createWebVersionProvider()
      const state = provider.getState()

      expect(state.buildId).toBe('')
      expect(state.version).toBe('')
      expect(state.isUpdateAvailable).toBe(false)
      expect(state.isServiceWorkerWaiting).toBe(false)
      expect(state.isChecking).toBe(false)
    })

    it('should set current version', () => {
      const provider = createWebVersionProvider()

      provider.setCurrentVersion({
        buildId: 'build-123',
        version: '1.0.0',
        buildTime: '2024-01-15T10:00:00Z',
        commitHash: 'abc123',
        branch: 'main',
      })

      const state = provider.getState()
      expect(state.buildId).toBe('build-123')
      expect(state.version).toBe('1.0.0')
      expect(state.buildTime).toBe('2024-01-15T10:00:00Z')
      expect(state.commitHash).toBe('abc123')
      expect(state.branch).toBe('main')
    })

    it('should check for updates', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new-build', version: '2.0.0' }),
      })

      const provider = createWebVersionProvider()
      provider.setCurrentVersion({ buildId: 'old-build', version: '1.0.0' })

      const hasUpdate = await provider.checkForUpdates()

      expect(hasUpdate).toBe(true)
      expect(provider.getState().isUpdateAvailable).toBe(true)
    })

    it('should start and stop periodic checks', () => {
      const provider = createWebVersionProvider()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
      })

      provider.startPeriodicChecks({ interval: 1000 })

      vi.advanceTimersByTime(3000)

      // Should have been called multiple times
      expect(fetchMock).toHaveBeenCalled()

      provider.stopPeriodicChecks()
      fetchMock.mockClear()

      vi.advanceTimersByTime(3000)

      // Should not be called after stopping
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should check immediately when option is set', async () => {
      const provider = createWebVersionProvider()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
      })

      provider.startPeriodicChecks({ immediate: true })

      // Should be called immediately
      expect(fetchMock).toHaveBeenCalled()

      provider.stopPeriodicChecks()
    })

    it('should get service worker controller', () => {
      const provider = createWebVersionProvider()
      const sw = provider.getServiceWorker()

      expect(sw).toHaveProperty('register')
      expect(sw).toHaveProperty('unregister')
    })

    it('should apply update by reloading', () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
        configurable: true,
      })

      const provider = createWebVersionProvider()
      provider.setCurrentVersion({ buildId: 'old', version: '1.0.0' })

      // Set update available
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new', version: '2.0.0' }),
      })

      provider.checkForUpdates().then(() => {
        provider.applyUpdate()

        vi.advanceTimersByTime(200)
        expect(reloadMock).toHaveBeenCalled()
      })
    })

    it('should apply update with force option', () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
        configurable: true,
      })

      const provider = createWebVersionProvider()
      provider.applyUpdate({ force: true })

      expect(reloadMock).toHaveBeenCalled()
    })

    it('should dismiss update', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new', version: '2.0.0' }),
      })

      const provider = createWebVersionProvider()
      provider.setCurrentVersion({ buildId: 'old', version: '1.0.0' })

      await provider.checkForUpdates()
      expect(provider.getState().isUpdateAvailable).toBe(true)

      provider.dismissUpdate()
      expect(provider.getState().isUpdateAvailable).toBe(false)
    })

    it('should subscribe to events', async () => {
      const provider = createWebVersionProvider()
      const handler = vi.fn()

      const unsubscribe = provider.on('update-available', handler)

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new', version: '2.0.0' }),
      })

      provider.setCurrentVersion({ buildId: 'old', version: '1.0.0' })
      await provider.checkForUpdates()

      expect(handler).toHaveBeenCalled()

      unsubscribe()
    })

    it('should unsubscribe from events', async () => {
      const provider = createWebVersionProvider()
      const handler = vi.fn()

      provider.on('update-available', handler)
      provider.off('update-available', handler)

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new', version: '2.0.0' }),
      })

      provider.setCurrentVersion({ buildId: 'old', version: '1.0.0' })
      await provider.checkForUpdates()

      expect(handler).not.toHaveBeenCalled()
    })

    it('should destroy provider', () => {
      const provider = createWebVersionProvider()
      const handler = vi.fn()

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
      })

      provider.startPeriodicChecks({ interval: 1000 })
      provider.on('check-complete', handler)

      provider.destroy()

      vi.advanceTimersByTime(3000)

      // No more periodic checks after destroy
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('Provider Management', () => {
    beforeEach(() => {
      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            installing: null,
            waiting: null,
            addEventListener: vi.fn(),
          }),
          controller: null,
          addEventListener: vi.fn(),
        },
        configurable: true,
      })
    })

    it('should set and get custom provider', () => {
      const mockProvider: VersionProvider = {
        getState: vi.fn().mockReturnValue({} as VersionState),
        setCurrentVersion: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(false),
        startPeriodicChecks: vi.fn(),
        stopPeriodicChecks: vi.fn(),
        getServiceWorker: vi.fn().mockReturnValue({} as ServiceWorkerController),
        applyUpdate: vi.fn(),
        dismissUpdate: vi.fn(),
        on: vi.fn().mockReturnValue(() => {}),
        off: vi.fn(),
        destroy: vi.fn(),
      }

      setProvider(mockProvider)
      const provider = getProvider()

      expect(provider).toBe(mockProvider)
    })

    it('should auto-create provider if not set', () => {
      const provider = getProvider()

      expect(provider).toBeDefined()
      expect(typeof provider.getState).toBe('function')
    })
  })

  describe('Module-level Utility Functions', () => {
    beforeEach(() => {
      // Reset provider
      setProvider(null as unknown as VersionProvider)

      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            installing: null,
            waiting: null,
            addEventListener: vi.fn(),
          }),
          controller: null,
          addEventListener: vi.fn(),
        },
        configurable: true,
      })
    })

    it('getState should delegate to provider', () => {
      const state = getState()

      expect(state).toHaveProperty('buildId')
      expect(state).toHaveProperty('version')
      expect(state).toHaveProperty('isUpdateAvailable')
    })

    it('setCurrentVersion should delegate to provider', () => {
      setCurrentVersion({ buildId: 'test-build', version: '1.0.0' })

      const state = getState()
      expect(state.buildId).toBe('test-build')
      expect(state.version).toBe('1.0.0')
    })

    it('checkForUpdates should delegate to provider', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new', version: '2.0.0' }),
      })

      setCurrentVersion({ buildId: 'old', version: '1.0.0' })
      const hasUpdate = await checkForUpdates()

      expect(typeof hasUpdate).toBe('boolean')
    })

    it('startPeriodicChecks should delegate to provider', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
      })

      startPeriodicChecks({ interval: 1000 })

      vi.advanceTimersByTime(1000)
      expect(fetchMock).toHaveBeenCalled()

      stopPeriodicChecks()
    })

    it('stopPeriodicChecks should delegate to provider', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
      })

      startPeriodicChecks({ interval: 1000 })
      stopPeriodicChecks()

      fetchMock.mockClear()
      vi.advanceTimersByTime(3000)

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('getServiceWorker should delegate to provider', () => {
      const sw = getServiceWorker()

      expect(sw).toBeDefined()
      expect(typeof sw.register).toBe('function')
    })

    it('applyUpdate should delegate to provider', () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
        configurable: true,
      })

      applyUpdate({ force: true })

      expect(reloadMock).toHaveBeenCalled()
    })

    it('dismissUpdate should delegate to provider', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'new', version: '2.0.0' }),
      })

      setCurrentVersion({ buildId: 'old', version: '1.0.0' })
      await checkForUpdates()

      expect(getState().isUpdateAvailable).toBe(true)

      dismissUpdate()

      expect(getState().isUpdateAvailable).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      setProvider(null as unknown as VersionProvider)

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            installing: null,
            waiting: null,
            addEventListener: vi.fn(),
          }),
          controller: null,
          addEventListener: vi.fn(),
        },
        configurable: true,
      })
    })

    it('should handle empty version info', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      setCurrentVersion({ buildId: '', version: '' })
      const hasUpdate = await checkForUpdates()

      expect(hasUpdate).toBe(false)
    })

    it('should handle null values in version info', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: null, version: null }),
      })

      setCurrentVersion({ buildId: 'build', version: '1.0.0' })
      const hasUpdate = await checkForUpdates()

      expect(hasUpdate).toBe(false)
    })

    it('should handle concurrent update checks', async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
                }),
              100,
            ),
          ),
      )

      setCurrentVersion({ buildId: 'old', version: '1.0.0' })

      // Start multiple concurrent checks
      const checks = [checkForUpdates(), checkForUpdates(), checkForUpdates()]

      vi.advanceTimersByTime(100)

      const results = await Promise.all(checks)

      // All should complete without error
      expect(results.every((r) => typeof r === 'boolean')).toBe(true)
    })

    it('should handle rapid start/stop of periodic checks', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ buildId: 'build', version: '1.0.0' }),
      })

      for (let i = 0; i < 10; i++) {
        startPeriodicChecks({ interval: 100 })
        stopPeriodicChecks()
      }

      // Should not throw
      expect(true).toBe(true)
    })

    it('should return state as a copy', () => {
      setCurrentVersion({ buildId: 'build', version: '1.0.0' })

      const state1 = getState()
      const state2 = getState()

      // Should be different objects
      expect(state1).not.toBe(state2)
      // But with same values
      expect(state1).toEqual(state2)
    })
  })

  describe('Integration Tests', () => {
    beforeEach(() => {
      setProvider(null as unknown as VersionProvider)

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            installing: null,
            waiting: null,
            addEventListener: vi.fn(),
            update: vi.fn().mockResolvedValue(undefined),
          }),
          controller: null,
          addEventListener: vi.fn(),
        },
        configurable: true,
      })
    })

    it('should work end-to-end with version detection', async () => {
      // Set initial version
      setCurrentVersion({
        buildId: 'initial-build',
        version: '1.0.0',
        commitHash: 'abc123',
        branch: 'main',
      })

      // Subscribe to update events
      const updateHandler = vi.fn()
      getProvider().on('update-available', updateHandler)

      // Mock new version available
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            buildId: 'new-build',
            version: '2.0.0',
            commitHash: 'def456',
          }),
      })

      // Check for updates
      const hasUpdate = await checkForUpdates()

      expect(hasUpdate).toBe(true)
      expect(updateHandler).toHaveBeenCalled()

      // Verify state
      const state = getState()
      expect(state.isUpdateAvailable).toBe(true)
      expect(state.newVersion).toBe('2.0.0')
      expect(state.newBuildId).toBe('new-build')
    })

    it('should work with periodic checking flow', async () => {
      // This test validates that periodic checks run at configured intervals
      // Clear any previous fetch mock setup
      fetchMock.mockReset()

      // Create a fresh provider for this test
      const provider = createWebVersionProvider()
      setProvider(provider)

      provider.setCurrentVersion({ buildId: 'periodic-build', version: '1.0.0' })

      // Mock fetch to always return same version
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ buildId: 'periodic-build', version: '1.0.0' }),
        }),
      )

      const checkStartHandler = vi.fn()
      provider.on('check-start', checkStartHandler)

      provider.startPeriodicChecks({ interval: 1000 })

      // Advance time to trigger periodic checks
      // After each interval, check-start should be called
      vi.advanceTimersByTime(1000)
      await vi.runOnlyPendingTimersAsync()
      const countAfterFirst = checkStartHandler.mock.calls.length
      expect(countAfterFirst).toBeGreaterThanOrEqual(1)

      vi.advanceTimersByTime(1000)
      await vi.runOnlyPendingTimersAsync()
      const countAfterSecond = checkStartHandler.mock.calls.length
      expect(countAfterSecond).toBeGreaterThan(countAfterFirst)

      vi.advanceTimersByTime(1000)
      await vi.runOnlyPendingTimersAsync()
      const countAfterThird = checkStartHandler.mock.calls.length
      expect(countAfterThird).toBeGreaterThan(countAfterSecond)

      provider.stopPeriodicChecks()

      // No more checks after stopping
      const countAfterStop = checkStartHandler.mock.calls.length
      vi.advanceTimersByTime(3000)
      await vi.runOnlyPendingTimersAsync()
      expect(checkStartHandler.mock.calls.length).toBe(countAfterStop)
    })

    it('should handle service worker update flow', async () => {
      const sw = getServiceWorker()

      // Register service worker
      const registration = await sw.register()
      expect(registration).toBeDefined()

      // Update service worker
      await sw.update()

      // Get registration
      expect(sw.getRegistration()).toBeDefined()
    })
  })
})
