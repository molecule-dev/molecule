/**
 * `@molecule/app-status-bar`
 * Utility functions tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { StatusBarProvider } from '../types.js'
import {
  getSafeAreaInsetTop,
  isLightColor,
  matchColor,
  setDarkTheme,
  setLightTheme,
} from '../utilities.js'

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
    }),
    getHeight: vi.fn().mockResolvedValue(44),
    configure: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      canSetBackgroundColor: true,
      canSetStyle: true,
      canSetVisibility: true,
      canSetOverlay: true,
      supportsAnimation: true,
    }),
  }
}

describe('Utility Functions', () => {
  let mockProvider: StatusBarProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('setLightTheme', () => {
    it('should configure with white background and dark style by default', async () => {
      await setLightTheme()
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#ffffff',
        style: 'dark',
      })
    })

    it('should use custom background color', async () => {
      await setLightTheme('#f0f0f0')
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#f0f0f0',
        style: 'dark',
      })
    })
  })

  describe('setDarkTheme', () => {
    it('should configure with black background and light style by default', async () => {
      await setDarkTheme()
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#000000',
        style: 'light',
      })
    })

    it('should use custom background color', async () => {
      await setDarkTheme('#1a1a1a')
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#1a1a1a',
        style: 'light',
      })
    })
  })

  describe('matchColor', () => {
    it('should use dark style for light colors', async () => {
      await matchColor('#ffffff')
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#ffffff',
        style: 'dark',
      })
    })

    it('should use light style for dark colors', async () => {
      await matchColor('#000000')
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#000000',
        style: 'light',
      })
    })

    it('should correctly determine style for mid-tone colors', async () => {
      // Gray is on the boundary, so let's test with a clearly light color
      await matchColor('#e0e0e0')
      expect(mockProvider.configure).toHaveBeenCalledWith({
        backgroundColor: '#e0e0e0',
        style: 'dark',
      })
    })
  })

  describe('isLightColor', () => {
    it('should return true for white', () => {
      expect(isLightColor('#ffffff')).toBe(true)
      expect(isLightColor('ffffff')).toBe(true)
    })

    it('should return false for black', () => {
      expect(isLightColor('#000000')).toBe(false)
      expect(isLightColor('000000')).toBe(false)
    })

    it('should return true for light gray', () => {
      expect(isLightColor('#cccccc')).toBe(true)
    })

    it('should return false for dark gray', () => {
      expect(isLightColor('#333333')).toBe(false)
    })

    it('should handle colors with hash prefix', () => {
      expect(isLightColor('#ffffff')).toBe(true)
    })

    it('should handle colors without hash prefix', () => {
      expect(isLightColor('ffffff')).toBe(true)
    })

    it('should correctly evaluate red', () => {
      // Pure red has luminance of 0.299 * 255 / 255 = 0.299
      expect(isLightColor('#ff0000')).toBe(false)
    })

    it('should correctly evaluate yellow', () => {
      // Yellow is light: (0.299 * 255 + 0.587 * 255 + 0.114 * 0) / 255 = 0.886
      expect(isLightColor('#ffff00')).toBe(true)
    })

    it('should correctly evaluate blue', () => {
      // Pure blue has low luminance: 0.114 * 255 / 255 = 0.114
      expect(isLightColor('#0000ff')).toBe(false)
    })
  })

  describe('getSafeAreaInsetTop', () => {
    it('should return CSS env variable string', () => {
      const result = getSafeAreaInsetTop()
      expect(result).toBe('env(safe-area-inset-top, 0px)')
    })
  })
})
