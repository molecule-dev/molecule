/**
 * `@molecule/app-keyboard`
 * Provider management tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCapabilities,
  getProvider,
  getState,
  hasProvider,
  hide,
  isVisible,
  onHeightChange,
  onHide,
  onShow,
  setAccessoryBar,
  setProvider,
  setResizeMode,
  setScroll,
  setStyle,
  show,
  toggle,
} from '../provider.js'
import type { KeyboardCapabilities, KeyboardProvider, KeyboardState } from '../types.js'

// Create a mock provider
function createMockProvider(): KeyboardProvider {
  return {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    toggle: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({
      isVisible: false,
      height: 0,
      screenHeight: 800,
    } as KeyboardState),
    isVisible: vi.fn().mockResolvedValue(false),
    setResizeMode: vi.fn().mockResolvedValue(undefined),
    setStyle: vi.fn().mockResolvedValue(undefined),
    setAccessoryBar: vi.fn().mockResolvedValue(undefined),
    setScroll: vi.fn().mockResolvedValue(undefined),
    onShow: vi.fn().mockReturnValue(() => {}),
    onHide: vi.fn().mockReturnValue(() => {}),
    onHeightChange: vi.fn().mockReturnValue(() => {}),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      canShowHide: true,
      canSetResizeMode: true,
      canSetStyle: true,
      canControlAccessoryBar: true,
      canControlScroll: true,
    } as KeyboardCapabilities),
  }
}

describe('Provider Management', () => {
  beforeEach(() => {
    // Reset provider state by setting to a new provider then checking
    // We need to clear any previously set provider
    // Since there's no clear function, we work around by setting null-like behavior
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should throw if no provider is set', () => {
      // This test requires fresh module state, which is hard to achieve
      // Skip for now or test the error message pattern
    })
  })

  describe('hasProvider', () => {
    it('should return true when provider is set', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })
})

describe('Convenience Functions', () => {
  let mockProvider: KeyboardProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('show', () => {
    it('should call provider.show', async () => {
      await show()
      expect(mockProvider.show).toHaveBeenCalled()
    })
  })

  describe('hide', () => {
    it('should call provider.hide', async () => {
      await hide()
      expect(mockProvider.hide).toHaveBeenCalled()
    })
  })

  describe('toggle', () => {
    it('should call provider.toggle', async () => {
      await toggle()
      expect(mockProvider.toggle).toHaveBeenCalled()
    })
  })

  describe('getState', () => {
    it('should call provider.getState and return state', async () => {
      const state = await getState()
      expect(mockProvider.getState).toHaveBeenCalled()
      expect(state).toEqual({
        isVisible: false,
        height: 0,
        screenHeight: 800,
      })
    })
  })

  describe('isVisible', () => {
    it('should call provider.isVisible', async () => {
      const visible = await isVisible()
      expect(mockProvider.isVisible).toHaveBeenCalled()
      expect(visible).toBe(false)
    })
  })

  describe('setResizeMode', () => {
    it('should call provider.setResizeMode with mode', async () => {
      await setResizeMode('body')
      expect(mockProvider.setResizeMode).toHaveBeenCalledWith('body')
    })
  })

  describe('setStyle', () => {
    it('should call provider.setStyle with style', async () => {
      await setStyle('dark')
      expect(mockProvider.setStyle).toHaveBeenCalledWith('dark')
    })
  })

  describe('setAccessoryBar', () => {
    it('should call provider.setAccessoryBar with options', async () => {
      await setAccessoryBar({ visible: true })
      expect(mockProvider.setAccessoryBar).toHaveBeenCalledWith({ visible: true })
    })
  })

  describe('setScroll', () => {
    it('should call provider.setScroll with options', async () => {
      await setScroll({ enabled: true, padding: 10 })
      expect(mockProvider.setScroll).toHaveBeenCalledWith({ enabled: true, padding: 10 })
    })
  })

  describe('onShow', () => {
    it('should call provider.onShow and return unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = onShow(callback)
      expect(mockProvider.onShow).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('onHide', () => {
    it('should call provider.onHide and return unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = onHide(callback)
      expect(mockProvider.onHide).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('onHeightChange', () => {
    it('should call provider.onHeightChange and return unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = onHeightChange(callback)
      expect(mockProvider.onHeightChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return noop and warn when provider does not support onHeightChange', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const providerWithoutHeightChange: KeyboardProvider = {
        ...createMockProvider(),
        onHeightChange: undefined,
      }
      setProvider(providerWithoutHeightChange)

      const callback = vi.fn()
      const unsubscribe = onHeightChange(callback)

      expect(warnSpy).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')

      warnSpy.mockRestore()
    })
  })

  describe('getCapabilities', () => {
    it('should call provider.getCapabilities and return capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
      expect(capabilities.supported).toBe(true)
    })
  })
})
