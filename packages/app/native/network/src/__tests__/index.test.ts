import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkConnectivity,
  getCapabilities,
  getConnectionType,
  getStatus,
  isConnected,
  onChange,
  onOffline,
  onOnline,
} from '../network.js'
import { getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  ConnectionType,
  NetworkCapabilities,
  NetworkChangeEvent,
  NetworkProvider,
  NetworkStatus,
} from '../types.js'
import {
  createNetworkAwareFetch,
  getConnectionTypeName,
  isSuitableForLargeDownload,
  waitForConnection,
  whenOnline,
} from '../utilities.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('network/provider', () => {
  let mockProvider: NetworkProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

describe('network/network', () => {
  let mockProvider: NetworkProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getStatus', () => {
    it('should delegate to provider', async () => {
      const result = await getStatus()
      expect(result.connected).toBe(true)
      expect(result.connectionType).toBe('wifi')
      expect(mockProvider.getStatus).toHaveBeenCalled()
    })

    it('should return full network status', async () => {
      const customStatus: NetworkStatus = {
        connected: true,
        connectionType: 'cellular',
        cellularGeneration: '5g',
        isMetered: true,
        downlinkSpeed: 100,
        uplinkSpeed: 50,
        rtt: 20,
        saveData: false,
      }
      mockProvider.getStatus = vi.fn().mockResolvedValue(customStatus)

      const result = await getStatus()
      expect(result).toEqual(customStatus)
    })
  })

  describe('isConnected', () => {
    it('should delegate to provider and return true when connected', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)
      const result = await isConnected()
      expect(result).toBe(true)
      expect(mockProvider.isConnected).toHaveBeenCalled()
    })

    it('should return false when disconnected', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(false)
      const result = await isConnected()
      expect(result).toBe(false)
    })
  })

  describe('getConnectionType', () => {
    it('should delegate to provider', async () => {
      const result = await getConnectionType()
      expect(result).toBe('wifi')
      expect(mockProvider.getConnectionType).toHaveBeenCalled()
    })

    it('should return various connection types', async () => {
      const connectionTypes: ConnectionType[] = [
        'wifi',
        'cellular',
        'ethernet',
        'bluetooth',
        'vpn',
        'other',
        'none',
        'unknown',
      ]

      for (const type of connectionTypes) {
        mockProvider.getConnectionType = vi.fn().mockResolvedValue(type)
        const result = await getConnectionType()
        expect(result).toBe(type)
      }
    })
  })

  describe('onChange', () => {
    it('should delegate to provider', () => {
      const callback = vi.fn()
      const unsubscribe = onChange(callback)
      expect(mockProvider.onChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return working unsubscribe function', () => {
      const mockUnsubscribe = vi.fn()
      mockProvider.onChange = vi.fn().mockReturnValue(mockUnsubscribe)
      setProvider(mockProvider)

      const callback = vi.fn()
      const unsubscribe = onChange(callback)

      unsubscribe()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('onOnline', () => {
    it('should delegate to provider', () => {
      const callback = vi.fn()
      const unsubscribe = onOnline(callback)
      expect(mockProvider.onOnline).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return working unsubscribe function', () => {
      const mockUnsubscribe = vi.fn()
      mockProvider.onOnline = vi.fn().mockReturnValue(mockUnsubscribe)
      setProvider(mockProvider)

      const callback = vi.fn()
      const unsubscribe = onOnline(callback)

      unsubscribe()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('onOffline', () => {
    it('should delegate to provider', () => {
      const callback = vi.fn()
      const unsubscribe = onOffline(callback)
      expect(mockProvider.onOffline).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return working unsubscribe function', () => {
      const mockUnsubscribe = vi.fn()
      mockProvider.onOffline = vi.fn().mockReturnValue(mockUnsubscribe)
      setProvider(mockProvider)

      const callback = vi.fn()
      const unsubscribe = onOffline(callback)

      unsubscribe()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('checkConnectivity', () => {
    it('should delegate to provider without URL', async () => {
      const result = await checkConnectivity()
      expect(result).toBe(true)
      expect(mockProvider.checkConnectivity).toHaveBeenCalledWith(undefined)
    })

    it('should delegate to provider with custom URL', async () => {
      await checkConnectivity('https://example.com')
      expect(mockProvider.checkConnectivity).toHaveBeenCalledWith('https://example.com')
    })

    it('should return false when connectivity check fails', async () => {
      mockProvider.checkConnectivity = vi.fn().mockResolvedValue(false)
      const result = await checkConnectivity()
      expect(result).toBe(false)
    })
  })

  describe('getCapabilities', () => {
    it('should delegate to provider', async () => {
      const result = await getCapabilities()
      expect(result.supported).toBe(true)
      expect(result.canDetectConnectionType).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })

    it('should return full capabilities object', async () => {
      const capabilities: NetworkCapabilities = {
        supported: true,
        canDetectConnectionType: true,
        canDetectCellularGeneration: true,
        canEstimateSpeed: true,
        canDetectMetered: true,
      }
      mockProvider.getCapabilities = vi.fn().mockResolvedValue(capabilities)

      const result = await getCapabilities()
      expect(result).toEqual(capabilities)
    })
  })
})

describe('network/utilities', () => {
  let mockProvider: NetworkProvider

  beforeEach(() => {
    vi.useFakeTimers()
    mockProvider = createMockProvider()
    setProvider(mockProvider)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('getConnectionTypeName', () => {
    it('should return Wi-Fi for wifi type', () => {
      expect(getConnectionTypeName('wifi')).toBe('Wi-Fi')
    })

    it('should return Cellular for cellular type', () => {
      expect(getConnectionTypeName('cellular')).toBe('Cellular')
    })

    it('should return Ethernet for ethernet type', () => {
      expect(getConnectionTypeName('ethernet')).toBe('Ethernet')
    })

    it('should return Bluetooth for bluetooth type', () => {
      expect(getConnectionTypeName('bluetooth')).toBe('Bluetooth')
    })

    it('should return VPN for vpn type', () => {
      expect(getConnectionTypeName('vpn')).toBe('VPN')
    })

    it('should return Other for other type', () => {
      expect(getConnectionTypeName('other')).toBe('Other')
    })

    it('should return Disconnected for none type', () => {
      expect(getConnectionTypeName('none')).toBe('Disconnected')
    })

    it('should return Unknown for unknown type', () => {
      expect(getConnectionTypeName('unknown')).toBe('Unknown')
    })
  })

  describe('isSuitableForLargeDownload', () => {
    it('should return true for unmetered wifi connection', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'wifi',
        isMetered: false,
        saveData: false,
      }
      expect(isSuitableForLargeDownload(status)).toBe(true)
    })

    it('should return false when disconnected', () => {
      const status: NetworkStatus = {
        connected: false,
        connectionType: 'none',
      }
      expect(isSuitableForLargeDownload(status)).toBe(false)
    })

    it('should return false for metered connections', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'wifi',
        isMetered: true,
      }
      expect(isSuitableForLargeDownload(status)).toBe(false)
    })

    it('should return false when save-data mode is enabled', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'wifi',
        isMetered: false,
        saveData: true,
      }
      expect(isSuitableForLargeDownload(status)).toBe(false)
    })

    it('should return false for cellular connections', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'cellular',
        cellularGeneration: '5g',
        isMetered: false,
        saveData: false,
      }
      expect(isSuitableForLargeDownload(status)).toBe(false)
    })

    it('should return true for ethernet connections', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'ethernet',
        isMetered: false,
        saveData: false,
      }
      expect(isSuitableForLargeDownload(status)).toBe(true)
    })
  })

  describe('waitForConnection', () => {
    it('should resolve immediately when already connected', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)

      const promise = waitForConnection()
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBe(true)
    })

    it('should wait and resolve when connection becomes available', async () => {
      let callCount = 0
      mockProvider.isConnected = vi.fn().mockImplementation(async () => {
        callCount++
        return callCount >= 3 // Connect on third call
      })

      const promise = waitForConnection(30000, 1000)

      // First check - not connected
      await vi.advanceTimersByTimeAsync(0)
      expect(mockProvider.isConnected).toHaveBeenCalledTimes(1)

      // Second check - not connected
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockProvider.isConnected).toHaveBeenCalledTimes(2)

      // Third check - connected
      await vi.advanceTimersByTimeAsync(1000)

      const result = await promise
      expect(result).toBe(true)
    })

    it('should resolve false on timeout', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(false)

      const promise = waitForConnection(3000, 1000)

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(4000)

      const result = await promise
      expect(result).toBe(false)
    })

    it('should use custom timeout and check interval', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(false)

      const promise = waitForConnection(5000, 500)

      await vi.advanceTimersByTimeAsync(6000)

      const result = await promise
      expect(result).toBe(false)
    })

    it('should handle errors during connectivity check', async () => {
      let callCount = 0
      mockProvider.isConnected = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network error')
        }
        return true
      })

      const promise = waitForConnection(30000, 1000)

      // First check - throws error
      await vi.advanceTimersByTimeAsync(0)

      // Second check - succeeds
      await vi.advanceTimersByTimeAsync(1000)

      const result = await promise
      expect(result).toBe(true)
    })
  })

  describe('whenOnline', () => {
    it('should execute callback immediately when connected', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)
      const callback = vi.fn().mockReturnValue('result')

      const promise = whenOnline(callback)
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBe('result')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should wait for connection before executing callback', async () => {
      // whenOnline calls isConnected() once, then waitForConnection calls it again
      // So we need callCount >= 3 to ensure it waits for the second check in waitForConnection
      let callCount = 0
      mockProvider.isConnected = vi.fn().mockImplementation(async () => {
        callCount++
        // First call from whenOnline - not connected
        // Second call from waitForConnection initial check - not connected
        // Third call after timeout - connected
        return callCount >= 3
      })
      const callback = vi.fn().mockReturnValue('delayed result')

      const promise = whenOnline(callback, 30000)

      // Advance time to allow the waitForConnection check interval to trigger
      await vi.advanceTimersByTimeAsync(1000)

      const result = await promise
      expect(result).toBe('delayed result')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should throw error on connection timeout', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(false)
      const callback = vi.fn()

      const promise = whenOnline(callback, 2000)

      // Attach a no-op catch to prevent unhandled rejection warning
      // (the actual assertion happens below)
      promise.catch(() => {})

      await vi.advanceTimersByTimeAsync(3000)

      await expect(promise).rejects.toThrow('Network connection timeout')
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle async callbacks', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)
      const asyncCallback = vi.fn().mockResolvedValue('async result')

      const promise = whenOnline(asyncCallback)
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBe('async result')
    })
  })

  describe('createNetworkAwareFetch', () => {
    beforeEach(() => {
      vi.useRealTimers()
    })

    it('should make fetch request when connected', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)
      mockFetch.mockResolvedValue(new Response('ok'))

      const networkFetch = createNetworkAwareFetch()
      const response = await networkFetch('https://example.com')

      expect(mockFetch).toHaveBeenCalledWith('https://example.com', undefined)
      expect(response).toBeInstanceOf(Response)
    })

    it('should throw error when disconnected and not queueing', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(false)

      const networkFetch = createNetworkAwareFetch()

      await expect(networkFetch('https://example.com')).rejects.toThrow('Network unavailable')
    })

    it('should pass request init options to fetch', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)
      mockFetch.mockResolvedValue(new Response('ok'))

      const networkFetch = createNetworkAwareFetch()
      const init: RequestInit = {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      }

      await networkFetch('https://example.com/api', init)

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', init)
    })

    it('should call onOffline callback when going offline', async () => {
      let offlineCallback: (() => void) | null = null
      mockProvider.onOffline = vi.fn().mockImplementation((cb) => {
        offlineCallback = cb
        return () => {}
      })
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)

      const onOfflineHandler = vi.fn()
      createNetworkAwareFetch({ onOffline: onOfflineHandler })

      // Simulate going offline
      offlineCallback?.()

      expect(onOfflineHandler).toHaveBeenCalled()
    })

    it('should call onReconnect callback when coming back online', async () => {
      let onlineCallback: (() => void) | null = null
      let offlineCallback: (() => void) | null = null

      mockProvider.onOnline = vi.fn().mockImplementation((cb) => {
        onlineCallback = cb
        return () => {}
      })
      mockProvider.onOffline = vi.fn().mockImplementation((cb) => {
        offlineCallback = cb
        return () => {}
      })
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)

      const onReconnectHandler = vi.fn()
      createNetworkAwareFetch({ onReconnect: onReconnectHandler })

      // Simulate going offline then online
      offlineCallback?.()
      onlineCallback?.()

      expect(onReconnectHandler).toHaveBeenCalled()
    })

    it('should not call onReconnect if was not offline', async () => {
      let onlineCallback: (() => void) | null = null

      mockProvider.onOnline = vi.fn().mockImplementation((cb) => {
        onlineCallback = cb
        return () => {}
      })
      mockProvider.onOffline = vi.fn().mockReturnValue(() => {})
      mockProvider.isConnected = vi.fn().mockResolvedValue(true)

      const onReconnectHandler = vi.fn()
      createNetworkAwareFetch({ onReconnect: onReconnectHandler })

      // Simulate online event without being offline first
      onlineCallback?.()

      expect(onReconnectHandler).not.toHaveBeenCalled()
    })

    it('should queue requests when offline with queueOfflineRequests option', async () => {
      mockProvider.isConnected = vi.fn().mockResolvedValue(false)

      const networkFetch = createNetworkAwareFetch({
        queueOfflineRequests: true,
      })

      // This should not throw, but instead queue the request
      const fetchPromise = networkFetch('https://example.com')

      // The promise should be pending (not resolved or rejected immediately)
      let resolved = false
      let rejected = false
      fetchPromise.then(() => (resolved = true)).catch(() => (rejected = true))

      // Give it a tick
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(resolved).toBe(false)
      expect(rejected).toBe(false)
    })

    it('should process queued requests when coming back online', async () => {
      let onlineCallback: (() => void) | null = null
      let offlineCallback: (() => void) | null = null
      let isOnline = true

      // Set up mocks before creating the fetch wrapper
      mockProvider.onOnline = vi.fn().mockImplementation((cb) => {
        onlineCallback = cb
        return () => {}
      })
      mockProvider.onOffline = vi.fn().mockImplementation((cb) => {
        offlineCallback = cb
        return () => {}
      })
      mockProvider.isConnected = vi.fn().mockImplementation(async () => isOnline)

      // Re-set the provider to ensure the updated mocks are used
      setProvider(mockProvider)

      const mockResponse = new Response('queued response')
      mockFetch.mockResolvedValue(mockResponse)

      const networkFetch = createNetworkAwareFetch({
        queueOfflineRequests: true,
      })

      // Go offline first (sets wasOffline = true)
      isOnline = false
      offlineCallback?.()

      // Queue a request while offline
      const fetchPromise = networkFetch('https://example.com/queued')

      // Allow the async isConnected() check to complete and queue the request
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Come back online - this should trigger queue processing
      isOnline = true
      onlineCallback?.()

      // Allow microtasks to flush (fetch mock's promise needs to resolve)
      await Promise.resolve()
      await Promise.resolve()

      // Wait for the queued request to be processed
      const response = await fetchPromise

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/queued', undefined)
      expect(response).toBe(mockResponse)
    })
  })
})

describe('network/types', () => {
  describe('NetworkStatus interface', () => {
    it('should allow minimal status object', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'wifi',
      }
      expect(status.connected).toBe(true)
      expect(status.connectionType).toBe('wifi')
    })

    it('should allow full status object', () => {
      const status: NetworkStatus = {
        connected: true,
        connectionType: 'cellular',
        cellularGeneration: '5g',
        isMetered: true,
        isAirplaneMode: false,
        downlinkSpeed: 100,
        uplinkSpeed: 50,
        rtt: 20,
        saveData: false,
      }
      expect(status.cellularGeneration).toBe('5g')
      expect(status.isMetered).toBe(true)
      expect(status.downlinkSpeed).toBe(100)
    })
  })

  describe('NetworkChangeEvent interface', () => {
    it('should track state transitions', () => {
      const event: NetworkChangeEvent = {
        previous: { connected: false, connectionType: 'none' },
        current: { connected: true, connectionType: 'wifi' },
        connectivityChanged: true,
        connectionTypeChanged: true,
      }
      expect(event.connectivityChanged).toBe(true)
      expect(event.connectionTypeChanged).toBe(true)
    })
  })

  describe('NetworkCapabilities interface', () => {
    it('should describe platform capabilities', () => {
      const capabilities: NetworkCapabilities = {
        supported: true,
        canDetectConnectionType: true,
        canDetectCellularGeneration: false,
        canEstimateSpeed: true,
        canDetectMetered: false,
      }
      expect(capabilities.supported).toBe(true)
      expect(capabilities.canDetectCellularGeneration).toBe(false)
    })
  })
})

// Helper function to create a mock provider
function createMockProvider(): NetworkProvider {
  const defaultStatus: NetworkStatus = {
    connected: true,
    connectionType: 'wifi',
  }

  const defaultCapabilities: NetworkCapabilities = {
    supported: true,
    canDetectConnectionType: true,
    canDetectCellularGeneration: true,
    canEstimateSpeed: false,
    canDetectMetered: true,
  }

  return {
    getStatus: vi.fn().mockResolvedValue(defaultStatus),
    isConnected: vi.fn().mockResolvedValue(true),
    getConnectionType: vi.fn().mockResolvedValue('wifi' as ConnectionType),
    onChange: vi.fn().mockReturnValue(() => {}),
    onOnline: vi.fn().mockReturnValue(() => {}),
    onOffline: vi.fn().mockReturnValue(() => {}),
    checkConnectivity: vi.fn().mockResolvedValue(true),
    getCapabilities: vi.fn().mockResolvedValue(defaultCapabilities),
  }
}
