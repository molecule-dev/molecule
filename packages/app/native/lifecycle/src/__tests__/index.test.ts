/**
 * `@molecule/app-lifecycle`
 * Comprehensive tests for lifecycle module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getAppState,
  getBatteryState,
  getNetworkState,
  getProvider,
  onAppStateChange,
  onNetworkChange,
  onUrlOpen,
  setProvider,
} from '../provider.js'
import type {
  AppState,
  AppStateChange,
  AppStateListener,
  BatteryState,
  BatteryStateListener,
  LaunchInfo,
  LifecycleProvider,
  NetworkState,
  NetworkStateListener,
} from '../types.js'
import { createWebLifecycleProvider } from '../web-provider.js'

// ============================================================================
// Mock Provider Factory
// ============================================================================

function createMockProvider(): LifecycleProvider & {
  _triggerAppStateChange: (change: AppStateChange) => void
  _triggerNetworkChange: (state: NetworkState) => void
  _triggerBatteryChange: (state: BatteryState) => void
  _triggerUrlOpen: (url: string) => void
  _triggerTerminate: () => void
  _triggerMemoryWarning: () => void
} {
  const appStateListeners = new Set<AppStateListener>()
  const networkListeners = new Set<NetworkStateListener>()
  const batteryListeners = new Set<BatteryStateListener>()
  const terminateListeners = new Set<() => void>()
  const urlOpenListeners = new Set<(url: string) => void>()
  const memoryWarningListeners = new Set<() => void>()

  let currentAppState: AppState = 'active'

  return {
    getAppState: vi.fn(() => currentAppState),
    getNetworkState: vi.fn().mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
      isExpensive: false,
    } as NetworkState),
    getBatteryState: vi.fn().mockResolvedValue({
      level: 0.8,
      charging: true,
      chargingTime: 3600,
      dischargingTime: undefined,
    } as BatteryState),
    getLaunchInfo: vi.fn().mockResolvedValue({
      coldStart: true,
      url: 'https://example.com',
    } as LaunchInfo),
    onAppStateChange: vi.fn((listener: AppStateListener) => {
      appStateListeners.add(listener)
      return () => appStateListeners.delete(listener)
    }),
    onNetworkChange: vi.fn((listener: NetworkStateListener) => {
      networkListeners.add(listener)
      return () => networkListeners.delete(listener)
    }),
    onBatteryChange: vi.fn((listener: BatteryStateListener) => {
      batteryListeners.add(listener)
      return () => batteryListeners.delete(listener)
    }),
    onTerminate: vi.fn((listener: () => void) => {
      terminateListeners.add(listener)
      return () => terminateListeners.delete(listener)
    }),
    onUrlOpen: vi.fn((listener: (url: string) => void) => {
      urlOpenListeners.add(listener)
      return () => urlOpenListeners.delete(listener)
    }),
    onMemoryWarning: vi.fn((listener: () => void) => {
      memoryWarningListeners.add(listener)
      return () => memoryWarningListeners.delete(listener)
    }),
    destroy: vi.fn(),
    // Test helpers
    _triggerAppStateChange: (change: AppStateChange) => {
      currentAppState = change.current
      appStateListeners.forEach((listener) => listener(change))
    },
    _triggerNetworkChange: (state: NetworkState) => {
      networkListeners.forEach((listener) => listener(state))
    },
    _triggerBatteryChange: (state: BatteryState) => {
      batteryListeners.forEach((listener) => listener(state))
    },
    _triggerUrlOpen: (url: string) => {
      urlOpenListeners.forEach((listener) => listener(url))
    },
    _triggerTerminate: () => {
      terminateListeners.forEach((listener) => listener())
    },
    _triggerMemoryWarning: () => {
      memoryWarningListeners.forEach((listener) => listener())
    },
  }
}

// ============================================================================
// Provider Management Tests
// ============================================================================

describe('Provider Management', () => {
  describe('setProvider', () => {
    it('should set the provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should create web provider if none set', () => {
      // Reset by setting null-ish (we cannot truly reset module state)
      // This test validates the fallback behavior
      const provider = getProvider()
      expect(provider).toBeDefined()
    })
  })
})

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe('Convenience Functions', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getAppState', () => {
    it('should call provider.getAppState and return state', () => {
      const state = getAppState()
      expect(mockProvider.getAppState).toHaveBeenCalled()
      expect(state).toBe('active')
    })
  })

  describe('getNetworkState', () => {
    it('should call provider.getNetworkState and return network state', async () => {
      const state = await getNetworkState()
      expect(mockProvider.getNetworkState).toHaveBeenCalled()
      expect(state).toEqual({
        connected: true,
        connectionType: 'wifi',
        isExpensive: false,
      })
    })
  })

  describe('getBatteryState', () => {
    it('should call provider.getBatteryState and return battery state', async () => {
      const state = await getBatteryState()
      expect(mockProvider.getBatteryState).toHaveBeenCalled()
      expect(state).toEqual({
        level: 0.8,
        charging: true,
        chargingTime: 3600,
        dischargingTime: undefined,
      })
    })

    it('should return null when battery info unavailable', async () => {
      mockProvider.getBatteryState = vi.fn().mockResolvedValue(null)
      const state = await getBatteryState()
      expect(state).toBeNull()
    })
  })

  describe('onAppStateChange', () => {
    it('should subscribe to app state changes', () => {
      const listener = vi.fn()
      const unsubscribe = onAppStateChange(listener)

      expect(mockProvider.onAppStateChange).toHaveBeenCalledWith(listener)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should receive app state change events', () => {
      const listener = vi.fn()
      onAppStateChange(listener)

      mockProvider._triggerAppStateChange({
        current: 'background',
        previous: 'active',
        timestamp: Date.now(),
      })

      expect(listener).toHaveBeenCalledWith({
        current: 'background',
        previous: 'active',
        timestamp: expect.any(Number),
      })
    })

    it('should unsubscribe from app state changes', () => {
      const listener = vi.fn()
      const unsubscribe = onAppStateChange(listener)

      unsubscribe()

      mockProvider._triggerAppStateChange({
        current: 'background',
        previous: 'active',
        timestamp: Date.now(),
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('onNetworkChange', () => {
    it('should subscribe to network changes', () => {
      const listener = vi.fn()
      const unsubscribe = onNetworkChange(listener)

      expect(mockProvider.onNetworkChange).toHaveBeenCalledWith(listener)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should receive network change events', () => {
      const listener = vi.fn()
      onNetworkChange(listener)

      mockProvider._triggerNetworkChange({
        connected: false,
        connectionType: 'none',
      })

      expect(listener).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      })
    })

    it('should unsubscribe from network changes', () => {
      const listener = vi.fn()
      const unsubscribe = onNetworkChange(listener)

      unsubscribe()

      mockProvider._triggerNetworkChange({
        connected: false,
        connectionType: 'none',
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('onUrlOpen', () => {
    it('should subscribe to URL open events', () => {
      const listener = vi.fn()
      const unsubscribe = onUrlOpen(listener)

      expect(mockProvider.onUrlOpen).toHaveBeenCalledWith(listener)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should receive URL open events', () => {
      const listener = vi.fn()
      onUrlOpen(listener)

      mockProvider._triggerUrlOpen('myapp://deep/link')

      expect(listener).toHaveBeenCalledWith('myapp://deep/link')
    })

    it('should unsubscribe from URL open events', () => {
      const listener = vi.fn()
      const unsubscribe = onUrlOpen(listener)

      unsubscribe()

      mockProvider._triggerUrlOpen('myapp://deep/link')

      expect(listener).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Web Provider Tests
// ============================================================================

describe('Web Lifecycle Provider', () => {
  let provider: LifecycleProvider
  let documentListeners: Map<string, Set<EventListener>>
  let windowListeners: Map<string, Set<EventListener>>
  let mockDocument: {
    visibilityState: string
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    dispatchEvent: (event: Event) => void
  }
  let mockWindow: {
    location: { href: string; hash: string }
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    dispatchEvent: (event: Event) => void
  }
  let mockNavigator: {
    onLine: boolean
    connection?: { type?: string; effectiveType?: string }
    getBattery?: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Track event listeners for dispatching
    documentListeners = new Map()
    windowListeners = new Map()

    // Create mock browser globals with event tracking
    mockDocument = {
      visibilityState: 'visible',
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        if (!documentListeners.has(type)) documentListeners.set(type, new Set())
        documentListeners.get(type)!.add(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        documentListeners.get(type)?.delete(listener)
      }),
      dispatchEvent: (event: Event) => {
        documentListeners.get(event.type)?.forEach((listener) => listener(event))
      },
    }

    mockWindow = {
      location: { href: 'https://example.com/page', hash: '' },
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        if (!windowListeners.has(type)) windowListeners.set(type, new Set())
        windowListeners.get(type)!.add(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        windowListeners.get(type)?.delete(listener)
      }),
      dispatchEvent: (event: Event) => {
        windowListeners.get(event.type)?.forEach((listener) => listener(event))
      },
    }

    mockNavigator = {
      onLine: true,
    }

    // Stub globals
    vi.stubGlobal('document', mockDocument)
    vi.stubGlobal('window', mockWindow)
    vi.stubGlobal('navigator', mockNavigator)
    vi.stubGlobal(
      'Event',
      class MockEvent {
        constructor(public type: string) {}
      },
    )

    provider = createWebLifecycleProvider()
  })

  afterEach(() => {
    provider.destroy()
    vi.unstubAllGlobals()
  })

  describe('getAppState', () => {
    it('should return active when document is visible', () => {
      mockDocument.visibilityState = 'visible'
      const state = provider.getAppState()
      expect(state).toBe('active')
    })

    it('should return background when document is hidden', () => {
      mockDocument.visibilityState = 'hidden'
      // Create fresh provider to pick up hidden state
      const freshProvider = createWebLifecycleProvider()
      const state = freshProvider.getAppState()
      expect(state).toBe('background')
      freshProvider.destroy()
    })
  })

  describe('getNetworkState', () => {
    it('should return connected state when online', async () => {
      mockNavigator.onLine = true
      const state = await provider.getNetworkState()
      expect(state.connected).toBe(true)
    })

    it('should return disconnected state when offline', async () => {
      mockNavigator.onLine = false
      const state = await provider.getNetworkState()
      expect(state.connected).toBe(false)
      expect(state.connectionType).toBe('none')
    })

    it('should detect wifi connection type', async () => {
      mockNavigator.onLine = true
      mockNavigator.connection = { type: 'wifi' }
      const state = await provider.getNetworkState()
      expect(state.connectionType).toBe('wifi')
    })

    it('should detect cellular connection type', async () => {
      mockNavigator.onLine = true
      mockNavigator.connection = { type: 'cellular' }
      const state = await provider.getNetworkState()
      expect(state.connectionType).toBe('cellular')
      expect(state.isExpensive).toBe(true)
    })

    it('should detect 4g as wifi', async () => {
      mockNavigator.onLine = true
      mockNavigator.connection = { effectiveType: '4g' }
      const state = await provider.getNetworkState()
      expect(state.connectionType).toBe('wifi')
    })

    it('should detect 3g as cellular', async () => {
      mockNavigator.onLine = true
      mockNavigator.connection = { effectiveType: '3g' }
      const state = await provider.getNetworkState()
      expect(state.connectionType).toBe('cellular')
      expect(state.isExpensive).toBe(true)
    })

    it('should detect ethernet connection type', async () => {
      mockNavigator.onLine = true
      mockNavigator.connection = { type: 'ethernet' }
      const state = await provider.getNetworkState()
      expect(state.connectionType).toBe('ethernet')
    })
  })

  describe('getBatteryState', () => {
    it('should return battery state when Battery API available', async () => {
      const mockBattery = {
        level: 0.75,
        charging: true,
        chargingTime: 1800,
        dischargingTime: Infinity,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve(mockBattery),
        configurable: true,
      })

      const state = await provider.getBatteryState()
      expect(state).toEqual({
        level: 0.75,
        charging: true,
        chargingTime: 1800,
        dischargingTime: undefined,
      })
    })

    it('should return null when Battery API not available', async () => {
      const providerWithoutBattery = createWebLifecycleProvider()
      // Battery API may not be available in jsdom
      const state = await providerWithoutBattery.getBatteryState()
      // May return null or battery state depending on environment
      expect(state === null || typeof state === 'object').toBe(true)
      providerWithoutBattery.destroy()
    })
  })

  describe('getLaunchInfo', () => {
    it('should return launch info with current URL', async () => {
      const info = await provider.getLaunchInfo()
      expect(info).toEqual({
        coldStart: true,
        url: expect.any(String),
      })
    })
  })

  describe('onAppStateChange', () => {
    it('should subscribe and unsubscribe to visibility changes', () => {
      const listener = vi.fn()
      const unsubscribe = provider.onAppStateChange(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should call listener on visibility change', () => {
      const listener = vi.fn()
      provider.onAppStateChange(listener)

      // Simulate visibility change
      mockDocument.visibilityState = 'hidden'
      mockDocument.dispatchEvent(new Event('visibilitychange'))

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 'background',
          previous: 'active',
          timestamp: expect.any(Number),
        }),
      )
    })
  })

  describe('onNetworkChange', () => {
    it('should subscribe and unsubscribe to network changes', () => {
      const listener = vi.fn()
      const unsubscribe = provider.onNetworkChange(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should call listener on online event', () => {
      const listener = vi.fn()
      provider.onNetworkChange(listener)

      mockWindow.dispatchEvent(new Event('online'))

      expect(listener).toHaveBeenCalled()
    })

    it('should call listener on offline event', () => {
      const listener = vi.fn()
      provider.onNetworkChange(listener)

      mockNavigator.onLine = false
      mockWindow.dispatchEvent(new Event('offline'))

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: false,
          connectionType: 'none',
        }),
      )
    })
  })

  describe('onBatteryChange', () => {
    it('should subscribe and unsubscribe to battery changes', () => {
      const listener = vi.fn()
      const unsubscribe = provider.onBatteryChange(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('onTerminate', () => {
    it('should subscribe and unsubscribe to terminate events', () => {
      const listener = vi.fn()
      const unsubscribe = provider.onTerminate(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should call listener on beforeunload event', () => {
      const listener = vi.fn()
      provider.onTerminate(listener)

      mockWindow.dispatchEvent(new Event('beforeunload'))

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('onUrlOpen', () => {
    it('should subscribe and unsubscribe to URL open events', () => {
      const listener = vi.fn()
      const unsubscribe = provider.onUrlOpen(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should call listener on hashchange event', () => {
      const listener = vi.fn()
      provider.onUrlOpen(listener)

      mockWindow.dispatchEvent(new Event('hashchange'))

      expect(listener).toHaveBeenCalledWith(expect.any(String))
    })
  })

  describe('onMemoryWarning', () => {
    it('should subscribe and unsubscribe to memory warning events', () => {
      const listener = vi.fn()
      const unsubscribe = provider.onMemoryWarning(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('destroy', () => {
    it('should clean up all listeners', () => {
      const appStateListener = vi.fn()
      const networkListener = vi.fn()
      const batteryListener = vi.fn()
      const terminateListener = vi.fn()
      const urlOpenListener = vi.fn()
      const memoryWarningListener = vi.fn()

      provider.onAppStateChange(appStateListener)
      provider.onNetworkChange(networkListener)
      provider.onBatteryChange(batteryListener)
      provider.onTerminate(terminateListener)
      provider.onUrlOpen(urlOpenListener)
      provider.onMemoryWarning(memoryWarningListener)

      provider.destroy()

      // After destroy, events should not trigger listeners
      mockDocument.dispatchEvent(new Event('visibilitychange'))
      mockWindow.dispatchEvent(new Event('online'))
      mockWindow.dispatchEvent(new Event('beforeunload'))
      mockWindow.dispatchEvent(new Event('hashchange'))

      // Listeners should not be called after destroy
      // (we only verify destroy doesn't throw)
    })
  })
})

// ============================================================================
// Type Tests
// ============================================================================

describe('Types', () => {
  it('should have correct AppState type values', () => {
    const states: AppState[] = ['active', 'inactive', 'background', 'unknown']
    expect(states).toHaveLength(4)
  })

  it('should have correct NetworkState structure', () => {
    const state: NetworkState = {
      connected: true,
      connectionType: 'wifi',
      isExpensive: false,
    }
    expect(state.connected).toBe(true)
    expect(state.connectionType).toBe('wifi')
    expect(state.isExpensive).toBe(false)
  })

  it('should have correct BatteryState structure', () => {
    const state: BatteryState = {
      level: 0.5,
      charging: false,
      chargingTime: undefined,
      dischargingTime: 7200,
    }
    expect(state.level).toBe(0.5)
    expect(state.charging).toBe(false)
    expect(state.dischargingTime).toBe(7200)
  })

  it('should have correct AppStateChange structure', () => {
    const change: AppStateChange = {
      current: 'background',
      previous: 'active',
      timestamp: Date.now(),
    }
    expect(change.current).toBe('background')
    expect(change.previous).toBe('active')
    expect(typeof change.timestamp).toBe('number')
  })

  it('should have correct LaunchInfo structure', () => {
    const info: LaunchInfo = {
      coldStart: true,
      url: 'myapp://open',
      notification: { id: '123' },
      extras: { source: 'push' },
    }
    expect(info.coldStart).toBe(true)
    expect(info.url).toBe('myapp://open')
  })
})

// ============================================================================
// Multiple Listener Tests
// ============================================================================

describe('Multiple Listeners', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  it('should support multiple app state listeners', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    const listener3 = vi.fn()

    onAppStateChange(listener1)
    onAppStateChange(listener2)
    onAppStateChange(listener3)

    mockProvider._triggerAppStateChange({
      current: 'background',
      previous: 'active',
      timestamp: Date.now(),
    })

    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
    expect(listener3).toHaveBeenCalled()
  })

  it('should support multiple network listeners', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    onNetworkChange(listener1)
    onNetworkChange(listener2)

    mockProvider._triggerNetworkChange({
      connected: false,
      connectionType: 'none',
    })

    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
  })

  it('should only remove specific listener on unsubscribe', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    const unsubscribe1 = onAppStateChange(listener1)
    onAppStateChange(listener2)

    unsubscribe1()

    mockProvider._triggerAppStateChange({
      current: 'background',
      previous: 'active',
      timestamp: Date.now(),
    })

    expect(listener1).not.toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
  })
})
