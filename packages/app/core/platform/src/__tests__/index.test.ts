import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Platform, PlatformInfo } from '../index.js'
import {
  detectPlatform,
  getPlatformInfo,
  isPlatform,
  onPlatform,
  platform,
  resetPlatformCache,
} from '../index.js'

describe('@molecule/app-platform', () => {
  describe('Types compile correctly', () => {
    it('should compile Platform type', () => {
      const platforms: Platform[] = [
        'web',
        'ios',
        'android',
        'electron',
        'macos',
        'windows',
        'linux',
      ]
      expect(platforms).toHaveLength(7)
    })

    it('should compile PlatformInfo type', () => {
      const info: PlatformInfo = {
        platform: 'web',
        isNative: false,
        isMobile: false,
        isDesktop: false,
        isWeb: true,
        isDevelopment: false,
        isProduction: true,
        userAgent: 'Mozilla/5.0',
        appVersion: '1.0.0',
      }
      expect(info.platform).toBe('web')
    })
  })

  describe('detectPlatform', () => {
    let originalWindow: typeof globalThis.window
    let originalNavigator: typeof globalThis.navigator

    beforeEach(() => {
      originalWindow = globalThis.window
      originalNavigator = globalThis.navigator
      resetPlatformCache()
    })

    afterEach(() => {
      // Restore original globals
      if (originalWindow !== undefined) {
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
          configurable: true,
        })
      }
      if (originalNavigator !== undefined) {
        Object.defineProperty(globalThis, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        })
      }
      resetPlatformCache()
    })

    it('should detect web platform by default in jsdom', () => {
      const platform = detectPlatform()
      expect(platform).toBe('web')
    })

    it('should detect iOS via Capacitor', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'ios',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('ios')
    })

    it('should detect Android via Capacitor', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'android',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('android')
    })

    it('should detect Electron on macOS', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        electron: {},
        Capacitor: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('macos')
    })

    it('should detect Electron on Windows', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        electron: {},
        Capacitor: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('windows')
    })

    it('should detect Electron on Linux', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        electron: {},
        Capacitor: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('linux')
    })

    it('should detect Electron without specific OS', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        electron: {},
        Capacitor: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Unknown',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('electron')
    })

    it('should detect web for iOS Safari', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...(globalThis.window ?? {}),
          Capacitor: undefined,
          electron: undefined,
        },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          product: 'Gecko',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('web')
    })

    it('should detect web for Android browser', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...(globalThis.window ?? {}),
          Capacitor: undefined,
          electron: undefined,
        },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10)',
          product: 'Gecko',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('web')
    })

    it('should handle React Native iOS detection', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...(globalThis.window ?? {}),
          Capacitor: undefined,
          electron: undefined,
        },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          product: 'ReactNative',
          userAgent: 'ios',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('ios')
    })

    it('should handle React Native Android detection', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...(globalThis.window ?? {}),
          Capacitor: undefined,
          electron: undefined,
        },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          product: 'ReactNative',
          userAgent: 'android',
        },
        writable: true,
        configurable: true,
      })

      const platform = detectPlatform()
      expect(platform).toBe('android')
    })
  })

  describe('getPlatformInfo', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      originalWindow = globalThis.window
      // Reset to clean window without Capacitor/Electron
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    afterEach(() => {
      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    it('should return comprehensive platform info', () => {
      const info = getPlatformInfo()

      expect(info).toHaveProperty('platform')
      expect(info).toHaveProperty('isNative')
      expect(info).toHaveProperty('isMobile')
      expect(info).toHaveProperty('isDesktop')
      expect(info).toHaveProperty('isWeb')
      expect(info).toHaveProperty('isDevelopment')
      expect(info).toHaveProperty('isProduction')
    })

    it('should set isWeb true for web platform', () => {
      const info = getPlatformInfo()
      expect(info.platform).toBe('web')
      expect(info.isWeb).toBe(true)
      expect(info.isNative).toBe(false)
      expect(info.isMobile).toBe(false)
      expect(info.isDesktop).toBe(false)
    })

    it('should include userAgent when navigator is available', () => {
      const info = getPlatformInfo()
      expect(info.userAgent).toBeDefined()
    })

    it('should correctly identify iOS as mobile and native', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'ios',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      const info = getPlatformInfo()
      expect(info.platform).toBe('ios')
      expect(info.isMobile).toBe(true)
      expect(info.isNative).toBe(true)
      expect(info.isDesktop).toBe(false)
      expect(info.isWeb).toBe(false)
    })

    it('should correctly identify Android as mobile and native', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'android',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      const info = getPlatformInfo()
      expect(info.platform).toBe('android')
      expect(info.isMobile).toBe(true)
      expect(info.isNative).toBe(true)
      expect(info.isDesktop).toBe(false)
      expect(info.isWeb).toBe(false)
    })

    it('should correctly identify desktop platforms', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        electron: {},
        Capacitor: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      const info = getPlatformInfo()
      expect(info.platform).toBe('macos')
      expect(info.isDesktop).toBe(true)
      expect(info.isNative).toBe(true)
      expect(info.isMobile).toBe(false)
      expect(info.isWeb).toBe(false)
    })
  })

  describe('platform (cached)', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      originalWindow = globalThis.window
      // Reset to clean window without Capacitor/Electron
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    afterEach(() => {
      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    it('should return cached platform info', () => {
      const info1 = platform()
      const info2 = platform()

      // Should be the same object reference due to caching
      expect(info1).toBe(info2)
    })

    it('should refresh after resetPlatformCache', () => {
      const info1 = platform()
      resetPlatformCache()
      const info2 = platform()

      // Should be different objects after reset
      expect(info1).not.toBe(info2)
      // But should have same values in default jsdom environment
      expect(info1.platform).toBe(info2.platform)
    })
  })

  describe('resetPlatformCache', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      originalWindow = globalThis.window
      // Reset to clean window without Capacitor/Electron
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    afterEach(() => {
      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    it('should clear the cached platform info', () => {
      const info1 = platform()
      resetPlatformCache()
      const info2 = platform()

      expect(info1).not.toBe(info2)
    })

    it('should allow re-detection after environment changes', () => {
      // Get initial platform (web in jsdom)
      const info1 = platform()
      expect(info1.platform).toBe('web')

      // Mock Capacitor
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'ios',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })

      // Without reset, should still return cached web
      const info2 = platform()
      expect(info2.platform).toBe('web')

      // After reset, should detect new platform
      resetPlatformCache()
      const info3 = platform()
      expect(info3.platform).toBe('ios')
    })
  })

  describe('onPlatform', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      originalWindow = globalThis.window
      // Reset to clean window without Capacitor/Electron
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    afterEach(() => {
      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    it('should execute handler for current platform', () => {
      const result = onPlatform({
        web: () => 'web result',
        default: () => 'default result',
      })

      expect(result).toBe('web result')
    })

    it('should execute default handler when no match', () => {
      const result = onPlatform({
        ios: () => 'ios result',
        android: () => 'android result',
        default: () => 'default result',
      })

      expect(result).toBe('default result')
    })

    it('should work with different platform handlers', () => {
      // Mock iOS
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'ios',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      const result = onPlatform({
        web: () => 'web result',
        ios: () => 'ios result',
        android: () => 'android result',
        default: () => 'default result',
      })

      expect(result).toBe('ios result')
    })

    it('should return different types based on handlers', () => {
      const stringResult = onPlatform({
        web: () => 'string',
        default: () => 'default string',
      })
      expect(typeof stringResult).toBe('string')

      const numberResult = onPlatform({
        web: () => 42,
        default: () => 0,
      })
      expect(typeof numberResult).toBe('number')

      const objectResult = onPlatform({
        web: () => ({ key: 'value' }),
        default: () => ({}),
      })
      expect(typeof objectResult).toBe('object')
    })

    it('should handle all platform types', () => {
      const platforms: Platform[] = [
        'web',
        'ios',
        'android',
        'electron',
        'macos',
        'windows',
        'linux',
      ]

      for (const p of platforms) {
        // This tests that each platform type can be used as a key
        const handlers: Partial<Record<Platform, () => string>> & { default: () => string } = {
          [p]: () => `${p} handler`,
          default: () => 'default',
        }
        // Type should compile correctly
        expect(handlers[p]).toBeDefined()
      }
    })
  })

  describe('isPlatform', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      originalWindow = globalThis.window
      // Reset to clean window without Capacitor/Electron
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    afterEach(() => {
      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()
    })

    it('should return true for current platform', () => {
      expect(isPlatform('web')).toBe(true)
    })

    it('should return false for non-matching platform', () => {
      expect(isPlatform('ios')).toBe(false)
      expect(isPlatform('android')).toBe(false)
    })

    it('should return true if any platform matches', () => {
      expect(isPlatform('web', 'ios')).toBe(true)
      expect(isPlatform('ios', 'android', 'web')).toBe(true)
    })

    it('should return false if no platform matches', () => {
      expect(isPlatform('ios', 'android')).toBe(false)
    })

    it('should work with platform changes', () => {
      expect(isPlatform('ios')).toBe(false)

      // Mock iOS
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'ios',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      expect(isPlatform('ios')).toBe(true)
      expect(isPlatform('web')).toBe(false)
    })

    it('should handle empty arguments', () => {
      expect(isPlatform()).toBe(false)
    })

    it('should handle all platform types', () => {
      // Test that all platform types can be checked
      isPlatform('web')
      isPlatform('ios')
      isPlatform('android')
      isPlatform('electron')
      isPlatform('macos')
      isPlatform('windows')
      isPlatform('linux')

      // Multiple platforms
      isPlatform('ios', 'android')
      isPlatform('macos', 'windows', 'linux')
      isPlatform('web', 'ios', 'android', 'electron', 'macos', 'windows', 'linux')
    })
  })

  describe('Edge cases', () => {
    beforeEach(() => {
      resetPlatformCache()
    })

    afterEach(() => {
      resetPlatformCache()
    })

    it('should handle missing window', () => {
      const originalWindow = globalThis.window
      // @ts-expect-error - Testing undefined window
      delete globalThis.window

      resetPlatformCache()
      const result = detectPlatform()
      expect(result).toBe('web')

      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
    })

    it('should handle Capacitor without getPlatform', () => {
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {},
        electron: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      const result = detectPlatform()
      expect(result).toBe('web')
    })

    it('should handle React Native with missing userAgent', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...(globalThis.window ?? {}),
          Capacitor: undefined,
          electron: undefined,
        },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          product: 'ReactNative',
          userAgent: undefined,
        },
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      // Should fall through to web since no platform-specific userAgent
      const result = detectPlatform()
      expect(result).toBe('web')
    })
  })

  describe('Integration scenarios', () => {
    beforeEach(() => {
      resetPlatformCache()
    })

    afterEach(() => {
      resetPlatformCache()
    })

    it('should work in a typical mobile app detection flow', () => {
      // Simulate initial web detection
      const webInfo = getPlatformInfo()
      expect(webInfo.isWeb).toBe(true)

      // Simulate app launch with Capacitor
      const mockWindow = {
        ...(globalThis.window ?? {}),
        Capacitor: {
          getPlatform: () => 'ios',
        },
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      // Check platform-specific behavior
      const iosInfo = getPlatformInfo()
      expect(iosInfo.platform).toBe('ios')
      expect(iosInfo.isMobile).toBe(true)
      expect(iosInfo.isNative).toBe(true)

      // Use onPlatform for conditional logic
      const hapticFeedback = onPlatform({
        ios: () => 'UIFeedbackGenerator',
        android: () => 'HapticFeedbackConstants',
        default: () => null,
      })
      expect(hapticFeedback).toBe('UIFeedbackGenerator')

      // Use isPlatform for guards
      if (isPlatform('ios', 'android')) {
        expect(true).toBe(true) // Mobile-specific code
      }
    })

    it('should work in a desktop app detection flow', () => {
      // Simulate Electron on macOS
      const mockWindow = {
        ...(globalThis.window ?? {}),
        electron: {
          ipcRenderer: {},
        },
        Capacitor: undefined,
      }
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        writable: true,
        configurable: true,
      })
      resetPlatformCache()

      const info = getPlatformInfo()
      expect(info.platform).toBe('macos')
      expect(info.isDesktop).toBe(true)
      expect(info.isNative).toBe(true)

      // Desktop-specific menu handling
      const menuShortcut = onPlatform({
        macos: () => 'Cmd+',
        windows: () => 'Ctrl+',
        linux: () => 'Ctrl+',
        default: () => '',
      })
      expect(menuShortcut).toBe('Cmd+')

      // Check for desktop platforms
      expect(isPlatform('macos', 'windows', 'linux')).toBe(true)
    })
  })
})
