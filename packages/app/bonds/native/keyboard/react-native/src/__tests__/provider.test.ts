/**
 * Tests for React Native keyboard provider.
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

const { mockDismiss, mockAddListener } = vi.hoisted(() => ({
  mockDismiss: vi.fn(),
  mockAddListener: vi
    .fn<(event: string, callback: (e: Record<string, unknown>) => void) => { remove(): void }>()
    .mockReturnValue({ remove: vi.fn() }),
}))

vi.mock('react-native', () => ({
  Keyboard: {
    dismiss: mockDismiss,
    addListener: mockAddListener,
  },
  Dimensions: {
    get: vi.fn().mockReturnValue({ height: 812, width: 375 }),
  },
}))

vi.mock('@molecule/app-keyboard', () => ({}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativeKeyboardProvider, provider } from '../provider.js'

describe('@molecule/app-keyboard-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.show).toBeTypeOf('function')
      expect(provider.hide).toBeTypeOf('function')
      expect(provider.toggle).toBeTypeOf('function')
      expect(provider.getState).toBeTypeOf('function')
      expect(provider.isVisible).toBeTypeOf('function')
      expect(provider.setResizeMode).toBeTypeOf('function')
      expect(provider.setStyle).toBeTypeOf('function')
      expect(provider.setAccessoryBar).toBeTypeOf('function')
      expect(provider.setScroll).toBeTypeOf('function')
      expect(provider.onShow).toBeTypeOf('function')
      expect(provider.onHide).toBeTypeOf('function')
      expect(provider.getCapabilities).toBeTypeOf('function')
    })
  })

  describe('createReactNativeKeyboardProvider', () => {
    let p: ReturnType<typeof createReactNativeKeyboardProvider>

    beforeEach(() => {
      p = createReactNativeKeyboardProvider()
    })

    describe('show', () => {
      it('should resolve without error (no-op in RN)', async () => {
        await expect(p.show()).resolves.toBeUndefined()
      })
    })

    describe('hide', () => {
      it('should dismiss the keyboard', async () => {
        await p.hide()
        expect(mockDismiss).toHaveBeenCalled()
      })
    })

    describe('toggle', () => {
      it('should call hide when keyboard is visible', async () => {
        // Simulate keyboard being shown by triggering onShow listener
        const removeMock = vi.fn()
        mockAddListener.mockImplementation((event, callback) => {
          if (event === 'keyboardDidShow') {
            callback({ endCoordinates: { height: 300 }, duration: 250 })
          }
          return { remove: removeMock }
        })

        const showProvider = createReactNativeKeyboardProvider()
        showProvider.onShow(vi.fn())

        // Wait for the async listener setup
        await vi.waitFor(() => {
          expect(mockAddListener).toHaveBeenCalled()
        })

        await showProvider.toggle()
        expect(mockDismiss).toHaveBeenCalled()
      })
    })

    describe('getState', () => {
      it('should return keyboard state', async () => {
        const state = await p.getState()
        expect(state).toEqual({
          isVisible: false,
          height: 0,
          screenHeight: 812,
        })
      })
    })

    describe('isVisible', () => {
      it('should return false initially', async () => {
        const visible = await p.isVisible()
        expect(visible).toBe(false)
      })
    })

    describe('setResizeMode', () => {
      it('should resolve without error (no-op)', async () => {
        await expect(p.setResizeMode('native' as never)).resolves.toBeUndefined()
      })
    })

    describe('setStyle', () => {
      it('should resolve without error (no-op)', async () => {
        await expect(p.setStyle('dark' as never)).resolves.toBeUndefined()
      })
    })

    describe('setAccessoryBar', () => {
      it('should resolve without error (no-op)', async () => {
        await expect(p.setAccessoryBar({ visible: true } as never)).resolves.toBeUndefined()
      })
    })

    describe('setScroll', () => {
      it('should resolve without error (no-op)', async () => {
        await expect(p.setScroll({} as never)).resolves.toBeUndefined()
      })
    })

    describe('onShow', () => {
      it('should register a keyboard show listener and return cleanup', async () => {
        const callback = vi.fn()
        const cleanup = p.onShow(callback)
        expect(cleanup).toBeTypeOf('function')

        await vi.waitFor(() => {
          expect(mockAddListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function))
        })

        cleanup()
      })

      it('should call callback with keyboard event data', async () => {
        const removeMock = vi.fn()
        let capturedCallback: ((e: Record<string, unknown>) => void) | undefined
        mockAddListener.mockImplementation((event, callback) => {
          if (event === 'keyboardDidShow') {
            capturedCallback = callback
          }
          return { remove: removeMock }
        })

        const onShowCallback = vi.fn()
        const showProvider = createReactNativeKeyboardProvider()
        showProvider.onShow(onShowCallback)

        await vi.waitFor(() => {
          expect(capturedCallback).toBeDefined()
        })

        capturedCallback!({ endCoordinates: { height: 300 }, duration: 250 })

        expect(onShowCallback).toHaveBeenCalledWith({
          keyboardHeight: 300,
          animationDuration: 250,
        })
      })
    })

    describe('onHide', () => {
      it('should register a keyboard hide listener and return cleanup', async () => {
        const callback = vi.fn()
        const cleanup = p.onHide(callback)
        expect(cleanup).toBeTypeOf('function')

        await vi.waitFor(() => {
          expect(mockAddListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function))
        })

        cleanup()
      })

      it('should call callback with animation duration', async () => {
        let capturedCallback: ((e: Record<string, unknown>) => void) | undefined
        mockAddListener.mockImplementation((event, callback) => {
          if (event === 'keyboardDidHide') {
            capturedCallback = callback
          }
          return { remove: vi.fn() }
        })

        const onHideCallback = vi.fn()
        const hideProvider = createReactNativeKeyboardProvider()
        hideProvider.onHide(onHideCallback)

        await vi.waitFor(() => {
          expect(capturedCallback).toBeDefined()
        })

        capturedCallback!({ duration: 200 })

        expect(onHideCallback).toHaveBeenCalledWith({
          animationDuration: 200,
        })
      })
    })

    describe('getCapabilities', () => {
      it('should return capabilities with limited support', async () => {
        const caps = await p.getCapabilities()
        expect(caps).toEqual({
          supported: true,
          canShowHide: false,
          canSetResizeMode: false,
          canSetStyle: false,
          canControlAccessoryBar: false,
          canControlScroll: false,
        })
      })
    })
  })

  describe('config', () => {
    it('should accept defaultScrollPadding config', () => {
      const p = createReactNativeKeyboardProvider({ defaultScrollPadding: 40 })
      expect(p).toBeDefined()
    })
  })
})
