/**
 * Tests for React Native status bar provider.
 *
 * @module
 */

vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

const { mockSetBarStyle, mockSetBackgroundColor, mockSetHidden, mockSetTranslucent, mockPlatform } =
  vi.hoisted(() => ({
    mockSetBarStyle: vi.fn(),
    mockSetBackgroundColor: vi.fn(),
    mockSetHidden: vi.fn(),
    mockSetTranslucent: vi.fn(),
    // Mutable so individual tests can drive per-platform behavior.
    mockPlatform: { OS: 'android' as 'ios' | 'android' | 'web' },
  }))

vi.mock('react-native', () => ({
  StatusBar: {
    setBarStyle: mockSetBarStyle,
    setBackgroundColor: mockSetBackgroundColor,
    setHidden: mockSetHidden,
    setTranslucent: mockSetTranslucent,
    currentHeight: 44,
  },
  Platform: mockPlatform,
}))

vi.mock('@molecule/app-status-bar', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativeStatusBarProvider, provider } from '../provider.js'

describe('@molecule/app-status-bar-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.setBackgroundColor).toBeTypeOf('function')
      expect(provider.setStyle).toBeTypeOf('function')
      expect(provider.show).toBeTypeOf('function')
      expect(provider.hide).toBeTypeOf('function')
      expect(provider.setOverlaysWebView).toBeTypeOf('function')
      expect(provider.getState).toBeTypeOf('function')
      expect(provider.getHeight).toBeTypeOf('function')
      expect(provider.configure).toBeTypeOf('function')
      expect(provider.getCapabilities).toBeTypeOf('function')
    })
  })

  describe('createReactNativeStatusBarProvider', () => {
    let p: ReturnType<typeof createReactNativeStatusBarProvider>

    beforeEach(() => {
      p = createReactNativeStatusBarProvider()
    })

    describe('setBackgroundColor', () => {
      it('should set background color with animation', async () => {
        await p.setBackgroundColor('#FF0000')
        expect(mockSetBackgroundColor).toHaveBeenCalledWith('#FF0000', true)
      })

      it('should not animate when configured', async () => {
        const noAnimProvider = createReactNativeStatusBarProvider({ animated: false })
        await noAnimProvider.setBackgroundColor('#00FF00')
        expect(mockSetBackgroundColor).toHaveBeenCalledWith('#00FF00', false)
      })
    })

    describe('setStyle', () => {
      it('should set dark style as dark-content', async () => {
        await p.setStyle('dark' as never)
        expect(mockSetBarStyle).toHaveBeenCalledWith('dark-content', true)
      })

      it('should set light style as light-content', async () => {
        await p.setStyle('light' as never)
        expect(mockSetBarStyle).toHaveBeenCalledWith('light-content', true)
      })

      it('should set default style', async () => {
        await p.setStyle('default' as never)
        expect(mockSetBarStyle).toHaveBeenCalledWith('default', true)
      })
    })

    describe('show', () => {
      it('should show status bar with no animation by default', async () => {
        await p.show()
        expect(mockSetHidden).toHaveBeenCalledWith(false, 'none')
      })

      it('should show with fade animation', async () => {
        await p.show('fade' as never)
        expect(mockSetHidden).toHaveBeenCalledWith(false, 'fade')
      })

      it('should show with slide animation', async () => {
        await p.show('slide' as never)
        expect(mockSetHidden).toHaveBeenCalledWith(false, 'slide')
      })
    })

    describe('hide', () => {
      it('should hide status bar with no animation by default', async () => {
        await p.hide()
        expect(mockSetHidden).toHaveBeenCalledWith(true, 'none')
      })

      it('should hide with fade animation', async () => {
        await p.hide('fade' as never)
        expect(mockSetHidden).toHaveBeenCalledWith(true, 'fade')
      })

      it('should hide with slide animation', async () => {
        await p.hide('slide' as never)
        expect(mockSetHidden).toHaveBeenCalledWith(true, 'slide')
      })
    })

    describe('setOverlaysWebView', () => {
      it('should set translucent to true for overlay', async () => {
        await p.setOverlaysWebView(true)
        expect(mockSetTranslucent).toHaveBeenCalledWith(true)
      })

      it('should set translucent to false to disable overlay', async () => {
        await p.setOverlaysWebView(false)
        expect(mockSetTranslucent).toHaveBeenCalledWith(false)
      })
    })

    describe('getState', () => {
      it('should return initial state', async () => {
        const state = await p.getState()
        expect(state).toEqual({
          visible: true,
          backgroundColor: '#000000',
          style: 'default',
          overlaysWebView: false,
          height: 44,
        })
      })

      it('should reflect changes after setStyle', async () => {
        await p.setStyle('dark' as never)
        const state = await p.getState()
        expect(state.style).toBe('dark')
      })

      it('should reflect changes after setBackgroundColor', async () => {
        await p.setBackgroundColor('#FF0000')
        const state = await p.getState()
        expect(state.backgroundColor).toBe('#FF0000')
      })

      it('should reflect changes after hide', async () => {
        await p.hide()
        const state = await p.getState()
        expect(state.visible).toBe(false)
      })

      it('should reflect changes after show', async () => {
        await p.hide()
        await p.show()
        const state = await p.getState()
        expect(state.visible).toBe(true)
      })

      it('should reflect changes after setOverlaysWebView', async () => {
        await p.setOverlaysWebView(true)
        const state = await p.getState()
        expect(state.overlaysWebView).toBe(true)
      })
    })

    describe('getHeight', () => {
      it('should return status bar height from RN', async () => {
        const height = await p.getHeight()
        expect(height).toBe(44)
      })
    })

    describe('configure', () => {
      it('should apply all configuration options', async () => {
        await p.configure({
          backgroundColor: '#FFFFFF',
          style: 'light' as never,
          visible: false,
          overlaysWebView: true,
        })

        expect(mockSetBackgroundColor).toHaveBeenCalledWith('#FFFFFF', true)
        expect(mockSetBarStyle).toHaveBeenCalledWith('light-content', true)
        expect(mockSetHidden).toHaveBeenCalledWith(true, 'none')
        expect(mockSetTranslucent).toHaveBeenCalledWith(true)
      })

      it('should only apply provided options', async () => {
        await p.configure({ backgroundColor: '#123456' })

        expect(mockSetBackgroundColor).toHaveBeenCalledWith('#123456', true)
        expect(mockSetBarStyle).not.toHaveBeenCalled()
        expect(mockSetHidden).not.toHaveBeenCalled()
        expect(mockSetTranslucent).not.toHaveBeenCalled()
      })

      it('should show status bar when visible is true', async () => {
        await p.configure({ visible: true })
        expect(mockSetHidden).toHaveBeenCalledWith(false, 'none')
      })
    })

    describe('getCapabilities', () => {
      it('reports background-color/overlay as unsupported on iOS (Android-only no-op APIs)', async () => {
        mockPlatform.OS = 'ios'
        const caps = await p.getCapabilities()
        expect(caps).toEqual({
          supported: true,
          canSetBackgroundColor: false,
          canSetStyle: true,
          canSetVisibility: true,
          canSetOverlay: false,
          supportsAnimation: true,
        })
      })

      it('reports background-color/overlay as supported on Android', async () => {
        mockPlatform.OS = 'android'
        const caps = await p.getCapabilities()
        expect(caps).toEqual({
          supported: true,
          canSetBackgroundColor: true,
          canSetStyle: true,
          canSetVisibility: true,
          canSetOverlay: true,
          supportsAnimation: true,
        })
      })
    })
  })

  describe('config options', () => {
    it('should use initial style from config', async () => {
      const p = createReactNativeStatusBarProvider({ initialStyle: 'dark' })
      const state = await p.getState()
      expect(state.style).toBe('dark')
    })

    it('should use initial background color from config', async () => {
      const p = createReactNativeStatusBarProvider({ initialBackgroundColor: '#AABBCC' })
      const state = await p.getState()
      expect(state.backgroundColor).toBe('#AABBCC')
    })

    it('should apply initial style to the native bar on setup', async () => {
      mockPlatform.OS = 'android'
      createReactNativeStatusBarProvider({ initialStyle: 'light' })
      await vi.waitFor(() => expect(mockSetBarStyle).toHaveBeenCalledWith('light-content', true))
    })

    it('should apply initial background color to the native bar on Android at setup', async () => {
      mockPlatform.OS = 'android'
      createReactNativeStatusBarProvider({ initialBackgroundColor: '#AABBCC' })
      await vi.waitFor(() => expect(mockSetBackgroundColor).toHaveBeenCalledWith('#AABBCC', true))
    })

    it('should not apply initial background color on iOS at setup (Android-only API)', async () => {
      mockPlatform.OS = 'ios'
      createReactNativeStatusBarProvider({ initialBackgroundColor: '#AABBCC' })
      // Give the fire-and-forget setup a chance to run, then assert it stayed a no-op.
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockSetBackgroundColor).not.toHaveBeenCalled()
    })

    it('should not touch the native bar when no initial values are configured', async () => {
      mockPlatform.OS = 'android'
      createReactNativeStatusBarProvider()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockSetBarStyle).not.toHaveBeenCalled()
      expect(mockSetBackgroundColor).not.toHaveBeenCalled()
    })
  })
})
