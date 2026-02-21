/**
 * Tests for React Native splash screen provider.
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

const { mockPreventAutoHideAsync, mockHideAsync } = vi.hoisted(() => ({
  mockPreventAutoHideAsync: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  mockHideAsync: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}))

vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: mockPreventAutoHideAsync,
  hideAsync: mockHideAsync,
}))

vi.mock('@molecule/app-splash-screen', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativeSplashScreenProvider, provider } from '../provider.js'

describe('@molecule/app-splash-screen-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.show).toBeTypeOf('function')
      expect(provider.hide).toBeTypeOf('function')
      expect(provider.getState).toBeTypeOf('function')
      expect(provider.isVisible).toBeTypeOf('function')
      expect(provider.getCapabilities).toBeTypeOf('function')
    })
  })

  describe('createReactNativeSplashScreenProvider', () => {
    describe('initialization', () => {
      it('should prevent auto-hide by default', async () => {
        createReactNativeSplashScreenProvider()
        await vi.waitFor(() => {
          expect(mockPreventAutoHideAsync).toHaveBeenCalled()
        })
      })

      it('should not prevent auto-hide when configured', () => {
        vi.clearAllMocks()
        createReactNativeSplashScreenProvider({ preventAutoHide: false })
        // preventAutoHideAsync should not be called during initialization
        expect(mockPreventAutoHideAsync).not.toHaveBeenCalled()
      })
    })

    describe('show', () => {
      it('should call preventAutoHideAsync and mark as visible', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        vi.clearAllMocks()

        await p.show()
        expect(mockPreventAutoHideAsync).toHaveBeenCalled()

        const visible = await p.isVisible()
        expect(visible).toBe(true)
      })
    })

    describe('hide', () => {
      it('should call hideAsync and mark as not visible', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        await p.hide()

        expect(mockHideAsync).toHaveBeenCalled()
        const visible = await p.isVisible()
        expect(visible).toBe(false)
      })

      it('should set animating to false after completion', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        await p.hide()

        const state = await p.getState()
        expect(state.animating).toBe(false)
      })

      it('should set animating to false even on error', async () => {
        mockHideAsync.mockRejectedValueOnce(new Error('hide failed'))
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })

        await expect(p.hide()).rejects.toThrow('hide failed')

        const state = await p.getState()
        expect(state.animating).toBe(false)
      })
    })

    describe('getState', () => {
      it('should return initial state as visible and not animating', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        const state = await p.getState()
        expect(state).toEqual({
          visible: true,
          animating: false,
        })
      })

      it('should return not visible after hide', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        await p.hide()
        const state = await p.getState()
        expect(state.visible).toBe(false)
      })
    })

    describe('isVisible', () => {
      it('should return true initially', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        const visible = await p.isVisible()
        expect(visible).toBe(true)
      })

      it('should return false after hide', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        await p.hide()
        const visible = await p.isVisible()
        expect(visible).toBe(false)
      })

      it('should return true after show', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        await p.hide()
        await p.show()
        const visible = await p.isVisible()
        expect(visible).toBe(true)
      })
    })

    describe('getCapabilities', () => {
      it('should return splash screen capabilities', async () => {
        const p = createReactNativeSplashScreenProvider({ preventAutoHide: false })
        const caps = await p.getCapabilities()
        expect(caps).toEqual({
          supported: true,
          spinnerSupported: false,
          configurable: false,
          dynamicBackground: false,
        })
      })
    })
  })
})
