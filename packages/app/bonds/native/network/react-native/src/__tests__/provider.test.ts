/**
 * Tests for React Native network status provider.
 *
 * @module
 */

vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

vi.mock('@molecule/app-logger', () => ({
  getLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

const { mockFetchNetInfo, mockAddEventListener } = vi.hoisted(() => ({
  mockFetchNetInfo: vi.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: { isConnectionExpensive: false },
  }),
  mockAddEventListener: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: mockFetchNetInfo,
    addEventListener: mockAddEventListener,
  },
}))

vi.mock('@molecule/app-network', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativeNetworkProvider, provider } from '../provider.js'

describe('@molecule/app-network-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.getStatus).toBeTypeOf('function')
      expect(provider.isConnected).toBeTypeOf('function')
      expect(provider.getConnectionType).toBeTypeOf('function')
      expect(provider.onChange).toBeTypeOf('function')
      expect(provider.onOnline).toBeTypeOf('function')
      expect(provider.onOffline).toBeTypeOf('function')
      expect(provider.checkConnectivity).toBeTypeOf('function')
      expect(provider.getCapabilities).toBeTypeOf('function')
    })
  })

  describe('createReactNativeNetworkProvider', () => {
    let p: ReturnType<typeof createReactNativeNetworkProvider>

    beforeEach(() => {
      p = createReactNativeNetworkProvider()
    })

    describe('getStatus', () => {
      it('should return connected wifi status', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { isConnectionExpensive: false },
        })

        const status = await p.getStatus()
        expect(status.connected).toBe(true)
        expect(status.connectionType).toBe('wifi')
        expect(status.isMetered).toBe(false)
      })

      it('should return disconnected status', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        })

        const status = await p.getStatus()
        expect(status.connected).toBe(false)
        expect(status.connectionType).toBe('none')
      })

      it('should handle cellular connection with generation', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
          details: { cellularGeneration: '4g', isConnectionExpensive: true },
        })

        const status = await p.getStatus()
        expect(status.connected).toBe(true)
        expect(status.connectionType).toBe('cellular')
        expect(status.cellularGeneration).toBe('4g')
        expect(status.isMetered).toBe(true)
      })

      it('should handle null isConnected', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: null,
          isInternetReachable: null,
          type: 'unknown',
          details: null,
        })

        const status = await p.getStatus()
        expect(status.connected).toBe(false)
        expect(status.connectionType).toBe('unknown')
      })
    })

    describe('isConnected', () => {
      it('should return true when connected', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: null,
        })

        const connected = await p.isConnected()
        expect(connected).toBe(true)
      })

      it('should return false when disconnected', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        })

        const connected = await p.isConnected()
        expect(connected).toBe(false)
      })
    })

    describe('getConnectionType', () => {
      it('should return the connection type', async () => {
        mockFetchNetInfo.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'ethernet',
          details: null,
        })

        const type = await p.getConnectionType()
        expect(type).toBe('ethernet')
      })
    })

    describe('onChange', () => {
      it('should register listener and return cleanup', () => {
        const callback = vi.fn()
        const cleanup = p.onChange(callback)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should notify listener on network change', async () => {
        let netInfoCallback: ((state: Record<string, unknown>) => void) | undefined
        mockAddEventListener.mockImplementation(
          (callback: (state: Record<string, unknown>) => void) => {
            netInfoCallback = callback
            return vi.fn()
          },
        )

        const freshProvider = createReactNativeNetworkProvider()
        const listener = vi.fn()
        freshProvider.onChange(listener)

        await vi.waitFor(() => {
          expect(netInfoCallback).toBeDefined()
        })

        netInfoCallback!({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        })

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            connectivityChanged: true,
          }),
        )
      })
    })

    describe('onOnline', () => {
      it('should register listener and return cleanup', () => {
        const callback = vi.fn()
        const cleanup = p.onOnline(callback)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should notify listener when going online', async () => {
        let netInfoCallback: ((state: Record<string, unknown>) => void) | undefined
        mockFetchNetInfo.mockResolvedValue({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        })
        mockAddEventListener.mockImplementation(
          (callback: (state: Record<string, unknown>) => void) => {
            netInfoCallback = callback
            return vi.fn()
          },
        )

        const freshProvider = createReactNativeNetworkProvider()
        const onlineListener = vi.fn()
        freshProvider.onOnline(onlineListener)

        await vi.waitFor(() => {
          expect(netInfoCallback).toBeDefined()
        })

        // Transition from offline to online
        netInfoCallback!({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: null,
        })

        expect(onlineListener).toHaveBeenCalled()
      })
    })

    describe('onOffline', () => {
      it('should register listener and return cleanup', () => {
        const callback = vi.fn()
        const cleanup = p.onOffline(callback)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should notify listener when going offline', async () => {
        let netInfoCallback: ((state: Record<string, unknown>) => void) | undefined
        mockFetchNetInfo.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: null,
        })
        mockAddEventListener.mockImplementation(
          (callback: (state: Record<string, unknown>) => void) => {
            netInfoCallback = callback
            return vi.fn()
          },
        )

        const freshProvider = createReactNativeNetworkProvider()
        const offlineListener = vi.fn()
        freshProvider.onOffline(offlineListener)

        await vi.waitFor(() => {
          expect(netInfoCallback).toBeDefined()
        })

        // Transition from online to offline
        netInfoCallback!({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        })

        expect(offlineListener).toHaveBeenCalled()
      })
    })

    describe('checkConnectivity', () => {
      it('should return true on successful fetch', async () => {
        const mockGlobalFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
        vi.stubGlobal('fetch', mockGlobalFetch)

        const result = await p.checkConnectivity()
        expect(result).toBe(true)

        vi.unstubAllGlobals()
      })

      it('should return true for HTTP 204', async () => {
        const mockGlobalFetch = vi.fn().mockResolvedValue({ ok: false, status: 204 })
        vi.stubGlobal('fetch', mockGlobalFetch)

        const result = await p.checkConnectivity()
        expect(result).toBe(true)

        vi.unstubAllGlobals()
      })

      it('should return false on fetch failure', async () => {
        const mockGlobalFetch = vi.fn().mockRejectedValue(new Error('Network error'))
        vi.stubGlobal('fetch', mockGlobalFetch)

        const result = await p.checkConnectivity()
        expect(result).toBe(false)

        vi.unstubAllGlobals()
      })

      it('should use custom URL when provided', async () => {
        const mockGlobalFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
        vi.stubGlobal('fetch', mockGlobalFetch)

        await p.checkConnectivity('https://custom.url/check')
        expect(mockGlobalFetch).toHaveBeenCalledWith('https://custom.url/check', expect.any(Object))

        vi.unstubAllGlobals()
      })
    })

    describe('getCapabilities', () => {
      it('should return network capabilities', async () => {
        const caps = await p.getCapabilities()
        expect(caps).toEqual({
          supported: true,
          canDetectConnectionType: true,
          canDetectCellularGeneration: true,
          canEstimateSpeed: false,
          canDetectMetered: true,
        })
      })
    })
  })

  describe('connection type mapping', () => {
    it('should map bluetooth type', async () => {
      mockFetchNetInfo.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'bluetooth',
        details: null,
      })

      const p = createReactNativeNetworkProvider()
      const status = await p.getStatus()
      expect(status.connectionType).toBe('bluetooth')
    })

    it('should map vpn type', async () => {
      mockFetchNetInfo.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'vpn',
        details: null,
      })

      const p = createReactNativeNetworkProvider()
      const status = await p.getStatus()
      expect(status.connectionType).toBe('vpn')
    })

    it('should map other type', async () => {
      mockFetchNetInfo.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'other',
        details: null,
      })

      const p = createReactNativeNetworkProvider()
      const status = await p.getStatus()
      expect(status.connectionType).toBe('other')
    })

    it('should map unknown types to unknown', async () => {
      mockFetchNetInfo.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wimax',
        details: null,
      })

      const p = createReactNativeNetworkProvider()
      const status = await p.getStatus()
      expect(status.connectionType).toBe('unknown')
    })
  })

  describe('cellular generation mapping', () => {
    it.each(['2g', '3g', '4g', '5g'] as const)('should map %s generation', async (gen) => {
      mockFetchNetInfo.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { cellularGeneration: gen },
      })

      const p = createReactNativeNetworkProvider()
      const status = await p.getStatus()
      expect(status.cellularGeneration).toBe(gen)
    })

    it('should map unknown cellular generation', async () => {
      mockFetchNetInfo.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { cellularGeneration: '6g' },
      })

      const p = createReactNativeNetworkProvider()
      const status = await p.getStatus()
      expect(status.cellularGeneration).toBe('unknown')
    })
  })
})
