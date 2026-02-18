/**
 * `@molecule/app-status-bar`
 * Presets tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyPreset, presets } from '../presets.js'
import { setProvider } from '../provider.js'
import type { StatusBarProvider } from '../types.js'

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

describe('Presets', () => {
  describe('presets object', () => {
    it('should have light preset', () => {
      expect(presets.light).toBeDefined()
      expect(presets.light.backgroundColor).toBe('#ffffff')
      expect(presets.light.style).toBe('dark')
      expect(presets.light.visible).toBe(true)
      expect(presets.light.overlaysWebView).toBe(false)
    })

    it('should have dark preset', () => {
      expect(presets.dark).toBeDefined()
      expect(presets.dark.backgroundColor).toBe('#000000')
      expect(presets.dark.style).toBe('light')
      expect(presets.dark.visible).toBe(true)
      expect(presets.dark.overlaysWebView).toBe(false)
    })

    it('should have transparent preset', () => {
      expect(presets.transparent).toBeDefined()
      expect(presets.transparent.backgroundColor).toBe('#00000000')
      expect(presets.transparent.style).toBe('light')
      expect(presets.transparent.visible).toBe(true)
      expect(presets.transparent.overlaysWebView).toBe(true)
    })

    it('should have hidden preset', () => {
      expect(presets.hidden).toBeDefined()
      expect(presets.hidden.visible).toBe(false)
    })
  })

  describe('applyPreset', () => {
    let mockProvider: StatusBarProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should apply light preset', async () => {
      await applyPreset('light')
      expect(mockProvider.configure).toHaveBeenCalledWith(presets.light)
    })

    it('should apply dark preset', async () => {
      await applyPreset('dark')
      expect(mockProvider.configure).toHaveBeenCalledWith(presets.dark)
    })

    it('should apply transparent preset', async () => {
      await applyPreset('transparent')
      expect(mockProvider.configure).toHaveBeenCalledWith(presets.transparent)
    })

    it('should apply hidden preset', async () => {
      await applyPreset('hidden')
      expect(mockProvider.configure).toHaveBeenCalledWith(presets.hidden)
    })
  })
})
