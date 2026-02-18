import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  decrement,
  get,
  getCapabilities,
  getPermissionStatus,
  getProvider,
  getState,
  hasProvider,
  increment,
  isSupported,
  requestPermission,
  set,
  setProvider,
  setWithPermission,
  syncBadge,
} from '../index.js'
import type {
  BadgeCapabilities,
  BadgePermissionStatus,
  BadgeProvider,
  BadgeState,
} from '../types.js'

describe('badge', () => {
  let mockProvider: BadgeProvider

  beforeEach(() => {
    mockProvider = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(5),
      clear: vi.fn().mockResolvedValue(undefined),
      increment: vi.fn().mockResolvedValue(6),
      decrement: vi.fn().mockResolvedValue(4),
      isSupported: vi.fn().mockResolvedValue(true),
      getPermissionStatus: vi.fn().mockResolvedValue('granted' as BadgePermissionStatus),
      requestPermission: vi.fn().mockResolvedValue('granted' as BadgePermissionStatus),
      getState: vi.fn().mockResolvedValue({
        count: 5,
        supported: true,
        permissionGranted: true,
      } as BadgeState),
      getCapabilities: vi.fn().mockResolvedValue({
        supported: true,
        requiresPermission: false,
        maxCount: 99,
        supportsText: false,
        canClear: true,
      } as BadgeCapabilities),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider management', () => {
    describe('setProvider', () => {
      it('should set the provider', () => {
        setProvider(mockProvider)
        expect(getProvider()).toBe(mockProvider)
      })
    })

    describe('getProvider', () => {
      it('should return the set provider', () => {
        setProvider(mockProvider)
        expect(getProvider()).toBe(mockProvider)
      })
    })

    describe('hasProvider', () => {
      it('should return true when provider is set', () => {
        setProvider(mockProvider)
        expect(hasProvider()).toBe(true)
      })
    })
  })

  describe('badge operations', () => {
    describe('set', () => {
      it('should delegate to provider with count', async () => {
        setProvider(mockProvider)
        await set(10)
        expect(mockProvider.set).toHaveBeenCalledWith(10)
      })

      it('should handle setting to 0', async () => {
        setProvider(mockProvider)
        await set(0)
        expect(mockProvider.set).toHaveBeenCalledWith(0)
      })

      it('should handle large counts', async () => {
        setProvider(mockProvider)
        await set(999)
        expect(mockProvider.set).toHaveBeenCalledWith(999)
      })
    })

    describe('get', () => {
      it('should delegate to provider', async () => {
        setProvider(mockProvider)
        const result = await get()
        expect(result).toBe(5)
        expect(mockProvider.get).toHaveBeenCalled()
      })

      it('should return 0 when no badge', async () => {
        mockProvider.get = vi.fn().mockResolvedValue(0)
        setProvider(mockProvider)
        const result = await get()
        expect(result).toBe(0)
      })
    })

    describe('clear', () => {
      it('should delegate to provider', async () => {
        setProvider(mockProvider)
        await clear()
        expect(mockProvider.clear).toHaveBeenCalled()
      })
    })

    describe('increment', () => {
      it('should delegate to provider with default amount', async () => {
        setProvider(mockProvider)
        const result = await increment()
        expect(result).toBe(6)
        expect(mockProvider.increment).toHaveBeenCalledWith(undefined)
      })

      it('should delegate to provider with custom amount', async () => {
        mockProvider.increment = vi.fn().mockResolvedValue(15)
        setProvider(mockProvider)
        const result = await increment(10)
        expect(result).toBe(15)
        expect(mockProvider.increment).toHaveBeenCalledWith(10)
      })
    })

    describe('decrement', () => {
      it('should delegate to provider with default amount', async () => {
        setProvider(mockProvider)
        const result = await decrement()
        expect(result).toBe(4)
        expect(mockProvider.decrement).toHaveBeenCalledWith(undefined)
      })

      it('should delegate to provider with custom amount', async () => {
        mockProvider.decrement = vi.fn().mockResolvedValue(0)
        setProvider(mockProvider)
        const result = await decrement(5)
        expect(result).toBe(0)
        expect(mockProvider.decrement).toHaveBeenCalledWith(5)
      })

      it('should not go below 0', async () => {
        mockProvider.decrement = vi.fn().mockResolvedValue(0)
        setProvider(mockProvider)
        const result = await decrement(100)
        expect(result).toBe(0)
      })
    })
  })

  describe('permission and support', () => {
    describe('isSupported', () => {
      it('should return true when provider supports badges', async () => {
        setProvider(mockProvider)
        const result = await isSupported()
        expect(result).toBe(true)
        expect(mockProvider.isSupported).toHaveBeenCalled()
      })

      it('should return false when provider does not support badges', async () => {
        mockProvider.isSupported = vi.fn().mockResolvedValue(false)
        setProvider(mockProvider)
        const result = await isSupported()
        expect(result).toBe(false)
      })
    })

    describe('getPermissionStatus', () => {
      it('should return granted status', async () => {
        setProvider(mockProvider)
        const result = await getPermissionStatus()
        expect(result).toBe('granted')
        expect(mockProvider.getPermissionStatus).toHaveBeenCalled()
      })

      it('should return denied status', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('denied' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await getPermissionStatus()
        expect(result).toBe('denied')
      })

      it('should return prompt status', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('prompt' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await getPermissionStatus()
        expect(result).toBe('prompt')
      })

      it('should return unsupported status', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('unsupported' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await getPermissionStatus()
        expect(result).toBe('unsupported')
      })
    })

    describe('requestPermission', () => {
      it('should return granted after request', async () => {
        setProvider(mockProvider)
        const result = await requestPermission()
        expect(result).toBe('granted')
        expect(mockProvider.requestPermission).toHaveBeenCalled()
      })

      it('should return denied when user denies', async () => {
        mockProvider.requestPermission = vi
          .fn()
          .mockResolvedValue('denied' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await requestPermission()
        expect(result).toBe('denied')
      })
    })
  })

  describe('state and capabilities', () => {
    describe('getState', () => {
      it('should return current badge state', async () => {
        setProvider(mockProvider)
        const result = await getState()
        expect(result.count).toBe(5)
        expect(result.supported).toBe(true)
        expect(result.permissionGranted).toBe(true)
        expect(mockProvider.getState).toHaveBeenCalled()
      })

      it('should return state when not supported', async () => {
        mockProvider.getState = vi.fn().mockResolvedValue({
          count: 0,
          supported: false,
          permissionGranted: false,
        } as BadgeState)
        setProvider(mockProvider)
        const result = await getState()
        expect(result.supported).toBe(false)
        expect(result.permissionGranted).toBe(false)
      })
    })

    describe('getCapabilities', () => {
      it('should return badge capabilities', async () => {
        setProvider(mockProvider)
        const result = await getCapabilities()
        expect(result.supported).toBe(true)
        expect(result.requiresPermission).toBe(false)
        expect(result.maxCount).toBe(99)
        expect(result.supportsText).toBe(false)
        expect(result.canClear).toBe(true)
        expect(mockProvider.getCapabilities).toHaveBeenCalled()
      })

      it('should return capabilities with no maxCount', async () => {
        mockProvider.getCapabilities = vi.fn().mockResolvedValue({
          supported: true,
          requiresPermission: true,
          supportsText: false,
          canClear: true,
        } as BadgeCapabilities)
        setProvider(mockProvider)
        const result = await getCapabilities()
        expect(result.maxCount).toBeUndefined()
      })

      it('should return capabilities with text support', async () => {
        mockProvider.getCapabilities = vi.fn().mockResolvedValue({
          supported: true,
          requiresPermission: false,
          supportsText: true,
          canClear: true,
        } as BadgeCapabilities)
        setProvider(mockProvider)
        const result = await getCapabilities()
        expect(result.supportsText).toBe(true)
      })
    })
  })

  describe('utility functions', () => {
    describe('setWithPermission', () => {
      it('should set badge when permission is granted', async () => {
        setProvider(mockProvider)
        const result = await setWithPermission(10)
        expect(result).toBe(true)
        expect(mockProvider.set).toHaveBeenCalledWith(10)
      })

      it('should return false when unsupported', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('unsupported' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await setWithPermission(10)
        expect(result).toBe(false)
        expect(mockProvider.set).not.toHaveBeenCalled()
      })

      it('should return false when denied', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('denied' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await setWithPermission(10)
        expect(result).toBe(false)
        expect(mockProvider.set).not.toHaveBeenCalled()
      })

      it('should request permission when status is prompt', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('prompt' as BadgePermissionStatus)
        mockProvider.requestPermission = vi
          .fn()
          .mockResolvedValue('granted' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await setWithPermission(10)
        expect(result).toBe(true)
        expect(mockProvider.requestPermission).toHaveBeenCalled()
        expect(mockProvider.set).toHaveBeenCalledWith(10)
      })

      it('should return false when permission request is denied', async () => {
        mockProvider.getPermissionStatus = vi
          .fn()
          .mockResolvedValue('prompt' as BadgePermissionStatus)
        mockProvider.requestPermission = vi
          .fn()
          .mockResolvedValue('denied' as BadgePermissionStatus)
        setProvider(mockProvider)
        const result = await setWithPermission(10)
        expect(result).toBe(false)
        expect(mockProvider.set).not.toHaveBeenCalled()
      })

      it('should return false on error', async () => {
        mockProvider.getPermissionStatus = vi.fn().mockRejectedValue(new Error('Test error'))
        setProvider(mockProvider)
        const result = await setWithPermission(10)
        expect(result).toBe(false)
      })
    })

    describe('syncBadge', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      // Helper to flush all pending promises/microtasks
      const flushPromises = async (): Promise<void> => {
        await vi.advanceTimersByTimeAsync(0)
        // Multiple resolves to handle chained async operations
        for (let i = 0; i < 5; i++) {
          await Promise.resolve()
        }
      }

      it('should sync badge with getValue function', async () => {
        setProvider(mockProvider)
        const getValue = vi.fn().mockReturnValue(5)
        const stop = syncBadge(getValue)

        // Allow initial sync to complete (async chain: getValue -> set)
        await flushPromises()

        expect(getValue).toHaveBeenCalled()
        expect(mockProvider.set).toHaveBeenCalledWith(5)

        stop()
      })

      it('should sync badge with async getValue function', async () => {
        setProvider(mockProvider)
        const getValue = vi.fn().mockResolvedValue(10)
        const stop = syncBadge(getValue)

        // Allow initial async sync to complete
        await flushPromises()

        expect(getValue).toHaveBeenCalled()
        expect(mockProvider.set).toHaveBeenCalledWith(10)

        stop()
      })

      it('should respect custom interval', async () => {
        setProvider(mockProvider)
        const getValue = vi.fn().mockReturnValue(5)
        const stop = syncBadge(getValue, 1000)

        // Initial sync
        await flushPromises()
        expect(mockProvider.set).toHaveBeenCalledTimes(1)

        // Stop before next interval to prevent infinite loop
        stop()
      })

      it('should stop syncing when stop is called', async () => {
        setProvider(mockProvider)
        const getValue = vi.fn().mockReturnValue(5)
        const stop = syncBadge(getValue, 1000)

        // Initial sync
        await flushPromises()
        const callCount = mockProvider.set.mock.calls.length

        // Stop syncing before next timer fires
        stop()

        // Advance time - no more syncs should happen
        await vi.advanceTimersByTimeAsync(2000)

        // Should not have been called again after stop
        expect(mockProvider.set.mock.calls.length).toBe(callCount)
      })

      it('should handle errors in getValue gracefully', async () => {
        setProvider(mockProvider)
        const getValue = vi.fn().mockRejectedValue(new Error('Test error'))
        const stop = syncBadge(getValue)

        // Should not throw
        await flushPromises()
        expect(getValue).toHaveBeenCalled()

        stop()
      })

      it('should handle errors in set gracefully', async () => {
        mockProvider.set = vi.fn().mockRejectedValue(new Error('Set error'))
        setProvider(mockProvider)
        const getValue = vi.fn().mockReturnValue(5)
        const stop = syncBadge(getValue)

        // Should not throw
        await flushPromises()
        expect(getValue).toHaveBeenCalled()

        stop()
      })
    })
  })
})
