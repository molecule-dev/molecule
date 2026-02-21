/**
 * Tests for React Native lifecycle provider.
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

const { mockAppStateAddEventListener, mockLinkingAddEventListener, mockLinkingGetInitialURL } =
  vi.hoisted(() => ({
    mockAppStateAddEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
    mockLinkingAddEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
    mockLinkingGetInitialURL: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
  }))

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: mockAppStateAddEventListener,
  },
  Linking: {
    addEventListener: mockLinkingAddEventListener,
    getInitialURL: mockLinkingGetInitialURL,
  },
}))

vi.mock('@molecule/app-lifecycle', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativeLifecycleProvider, provider } from '../provider.js'

describe('@molecule/app-lifecycle-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // NOTE: Do not use vi.restoreAllMocks() here — it resets vi.fn() implementations
    // from vi.hoisted(), breaking mock modules for subsequent tests.
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.getAppState).toBeTypeOf('function')
      expect(provider.getNetworkState).toBeTypeOf('function')
      expect(provider.getBatteryState).toBeTypeOf('function')
      expect(provider.getLaunchInfo).toBeTypeOf('function')
      expect(provider.onAppStateChange).toBeTypeOf('function')
      expect(provider.onNetworkChange).toBeTypeOf('function')
      expect(provider.onBatteryChange).toBeTypeOf('function')
      expect(provider.onTerminate).toBeTypeOf('function')
      expect(provider.onUrlOpen).toBeTypeOf('function')
      expect(provider.onMemoryWarning).toBeTypeOf('function')
      expect(provider.destroy).toBeTypeOf('function')
    })
  })

  describe('createReactNativeLifecycleProvider', () => {
    let p: ReturnType<typeof createReactNativeLifecycleProvider>

    beforeEach(async () => {
      p = createReactNativeLifecycleProvider()
      // Wait for initialization to complete
      await vi.waitFor(() => {
        expect(mockAppStateAddEventListener).toHaveBeenCalled()
      })
    })

    describe('getAppState', () => {
      it('should return current app state mapped from RN', () => {
        const state = p.getAppState()
        expect(state).toBe('active')
      })
    })

    describe('getNetworkState', () => {
      it('should return connected state on successful fetch', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
        vi.stubGlobal('fetch', mockFetch)

        const state = await p.getNetworkState()
        expect(state.connected).toBe(true)
        expect(state.connectionType).toBe('unknown')

        vi.unstubAllGlobals()
      })

      it('should return disconnected state on fetch failure', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
        vi.stubGlobal('fetch', mockFetch)

        const state = await p.getNetworkState()
        expect(state.connected).toBe(false)
        expect(state.connectionType).toBe('unknown')

        vi.unstubAllGlobals()
      })

      it('should return connected for HTTP 204 response', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 204 })
        vi.stubGlobal('fetch', mockFetch)

        const state = await p.getNetworkState()
        expect(state.connected).toBe(true)

        vi.unstubAllGlobals()
      })
    })

    describe('getBatteryState', () => {
      it('should return null (not supported by RN core)', async () => {
        const battery = await p.getBatteryState()
        expect(battery).toBeNull()
      })
    })

    describe('getLaunchInfo', () => {
      it('should return launch info with initial URL', async () => {
        mockLinkingGetInitialURL.mockResolvedValue('myapp://deep-link')
        const info = await p.getLaunchInfo()
        expect(info).toEqual({
          coldStart: true,
          url: 'myapp://deep-link',
        })
      })

      it('should return launch info without URL when none set', async () => {
        mockLinkingGetInitialURL.mockResolvedValue(null)
        const info = await p.getLaunchInfo()
        expect(info).toEqual({
          coldStart: true,
          url: undefined,
        })
      })
    })

    describe('onAppStateChange', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onAppStateChange(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should notify listener when app state changes', async () => {
        // Capture the change handler registered with AppState
        let changeHandler: ((state: string) => void) | undefined
        mockAppStateAddEventListener.mockImplementation(
          (type: string, handler: (state: string) => void) => {
            if (type === 'change') {
              changeHandler = handler
            }
            return { remove: vi.fn() }
          },
        )

        const freshProvider = createReactNativeLifecycleProvider()
        await vi.waitFor(() => {
          expect(changeHandler).toBeDefined()
        })

        const listener = vi.fn()
        freshProvider.onAppStateChange(listener)

        changeHandler!('background')

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            current: 'background',
            previous: 'active',
          }),
        )

        freshProvider.destroy()
      })
    })

    describe('onNetworkChange', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onNetworkChange(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })
    })

    describe('onBatteryChange', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onBatteryChange(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })
    })

    describe('onTerminate', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onTerminate(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })
    })

    describe('onUrlOpen', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onUrlOpen(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should notify listener on URL open events', async () => {
        let urlHandler: ((event: { url: string }) => void) | undefined
        mockLinkingAddEventListener.mockImplementation(
          (type: string, handler: (event: { url: string }) => void) => {
            if (type === 'url') {
              urlHandler = handler
            }
            return { remove: vi.fn() }
          },
        )

        const freshProvider = createReactNativeLifecycleProvider({ trackUrlOpen: true })
        await vi.waitFor(() => {
          expect(urlHandler).toBeDefined()
        })

        const listener = vi.fn()
        freshProvider.onUrlOpen(listener)

        urlHandler!({ url: 'myapp://page' })
        expect(listener).toHaveBeenCalledWith('myapp://page')

        freshProvider.destroy()
      })
    })

    describe('onMemoryWarning', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onMemoryWarning(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should notify listener on memory warning', async () => {
        let memoryHandler: (() => void) | undefined
        mockAppStateAddEventListener.mockImplementation((type: string, handler: () => void) => {
          if (type === 'memoryWarning') {
            memoryHandler = handler
          }
          return { remove: vi.fn() }
        })

        const freshProvider = createReactNativeLifecycleProvider({ trackMemoryWarnings: true })
        await vi.waitFor(() => {
          expect(memoryHandler).toBeDefined()
        })

        const listener = vi.fn()
        freshProvider.onMemoryWarning(listener)

        memoryHandler!()
        expect(listener).toHaveBeenCalled()

        freshProvider.destroy()
      })
    })

    describe('destroy', () => {
      it('should clean up all listeners', async () => {
        const removeMock = vi.fn()
        mockAppStateAddEventListener.mockReturnValue({ remove: removeMock })
        mockLinkingAddEventListener.mockReturnValue({ remove: removeMock })

        // Clear call records from beforeEach's p initialization so we can
        // detect freshProvider's own initialization calls
        mockAppStateAddEventListener.mockClear()

        const freshProvider = createReactNativeLifecycleProvider()
        await vi.waitFor(() => {
          expect(mockAppStateAddEventListener).toHaveBeenCalled()
        })

        freshProvider.destroy()
        expect(removeMock).toHaveBeenCalled()
      })
    })
  })

  describe('app state mapping', () => {
    it('should map unknown states to unknown', async () => {
      let changeHandler: ((state: string) => void) | undefined
      mockAppStateAddEventListener.mockImplementation(
        (type: string, handler: (state: string) => void) => {
          if (type === 'change') {
            changeHandler = handler
          }
          return { remove: vi.fn() }
        },
      )

      const p = createReactNativeLifecycleProvider()
      await vi.waitFor(() => {
        expect(changeHandler).toBeDefined()
      })

      changeHandler!('some-unknown-state')
      expect(p.getAppState()).toBe('unknown')

      p.destroy()
    })

    it('should map inactive state correctly', async () => {
      let changeHandler: ((state: string) => void) | undefined
      mockAppStateAddEventListener.mockImplementation(
        (type: string, handler: (state: string) => void) => {
          if (type === 'change') {
            changeHandler = handler
          }
          return { remove: vi.fn() }
        },
      )

      const p = createReactNativeLifecycleProvider()
      await vi.waitFor(() => {
        expect(changeHandler).toBeDefined()
      })

      changeHandler!('inactive')
      expect(p.getAppState()).toBe('inactive')

      p.destroy()
    })
  })
})
