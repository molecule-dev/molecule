/**
 * `@molecule/app-status-bar`
 * Status bar convenience functions tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import {
  configure,
  getCapabilities,
  getHeight,
  getState,
  hide,
  setBackgroundColor,
  setOverlaysWebView,
  setStyle,
  show,
} from '../status-bar.js'
import type { StatusBarCapabilities, StatusBarProvider, StatusBarState } from '../types.js'

// Create a mock provider
function createMockProvider(): StatusBarProvider {
  return {
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setStyle: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({
      visible: true,
      backgroundColor: '#ffffff',
      style: 'dark',
      overlaysWebView: false,
      height: 44,
    } as StatusBarState),
    getHeight: vi.fn().mockResolvedValue(44),
    configure: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      canSetBackgroundColor: true,
      canSetStyle: true,
      canSetVisibility: true,
      canSetOverlay: true,
      supportsAnimation: true,
    } as StatusBarCapabilities),
  }
}

describe('Status Bar Functions', () => {
  let mockProvider: StatusBarProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('setBackgroundColor', () => {
    it('should call provider.setBackgroundColor with color', async () => {
      await setBackgroundColor('#ff0000')
      expect(mockProvider.setBackgroundColor).toHaveBeenCalledWith('#ff0000')
    })
  })

  describe('setStyle', () => {
    it('should call provider.setStyle with style', async () => {
      await setStyle('light')
      expect(mockProvider.setStyle).toHaveBeenCalledWith('light')
    })

    it('should support dark style', async () => {
      await setStyle('dark')
      expect(mockProvider.setStyle).toHaveBeenCalledWith('dark')
    })

    it('should support default style', async () => {
      await setStyle('default')
      expect(mockProvider.setStyle).toHaveBeenCalledWith('default')
    })
  })

  describe('show', () => {
    it('should call provider.show', async () => {
      await show()
      expect(mockProvider.show).toHaveBeenCalled()
    })

    it('should call provider.show with animation', async () => {
      await show('fade')
      expect(mockProvider.show).toHaveBeenCalledWith('fade')
    })

    it('should support slide animation', async () => {
      await show('slide')
      expect(mockProvider.show).toHaveBeenCalledWith('slide')
    })
  })

  describe('hide', () => {
    it('should call provider.hide', async () => {
      await hide()
      expect(mockProvider.hide).toHaveBeenCalled()
    })

    it('should call provider.hide with animation', async () => {
      await hide('fade')
      expect(mockProvider.hide).toHaveBeenCalledWith('fade')
    })
  })

  describe('setOverlaysWebView', () => {
    it('should call provider.setOverlaysWebView with true', async () => {
      await setOverlaysWebView(true)
      expect(mockProvider.setOverlaysWebView).toHaveBeenCalledWith(true)
    })

    it('should call provider.setOverlaysWebView with false', async () => {
      await setOverlaysWebView(false)
      expect(mockProvider.setOverlaysWebView).toHaveBeenCalledWith(false)
    })
  })

  describe('getState', () => {
    it('should call provider.getState and return state', async () => {
      const state = await getState()
      expect(mockProvider.getState).toHaveBeenCalled()
      expect(state.visible).toBe(true)
      expect(state.backgroundColor).toBe('#ffffff')
      expect(state.style).toBe('dark')
      expect(state.height).toBe(44)
    })
  })

  describe('getHeight', () => {
    it('should call provider.getHeight and return height', async () => {
      const height = await getHeight()
      expect(mockProvider.getHeight).toHaveBeenCalled()
      expect(height).toBe(44)
    })
  })

  describe('configure', () => {
    it('should call provider.configure with config', async () => {
      const config = {
        backgroundColor: '#000000',
        style: 'light' as const,
        visible: true,
      }
      await configure(config)
      expect(mockProvider.configure).toHaveBeenCalledWith(config)
    })
  })

  describe('getCapabilities', () => {
    it('should call provider.getCapabilities and return capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
      expect(capabilities.supported).toBe(true)
      expect(capabilities.canSetBackgroundColor).toBe(true)
    })
  })
})
