/**
 * `@molecule/app-status-bar`
 * Provider management tests
 */

import { describe, expect, it, vi } from 'vitest'

import { getProvider, hasProvider, setProvider } from '../provider.js'
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

describe('Provider Management', () => {
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
  })

  describe('hasProvider', () => {
    it('should return true when provider is set', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })
})
