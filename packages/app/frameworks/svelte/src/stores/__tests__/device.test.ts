import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDeviceStores } from '../device.js'

vi.mock('@molecule/app-device', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-device'

const mockGetProvider = getProvider as ReturnType<typeof vi.fn>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockProvider() {
  return {
    getDeviceInfo: vi.fn(() => ({
      name: 'macOS Chrome',
      browser: { name: 'Chrome', version: '120.0.0', majorVersion: 120 },
      os: { name: 'macOS', version: '14.0', family: 'macOS' },
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      type: 'desktop' as const,
      hasTouch: false,
      userAgent: 'Mozilla/5.0',
    })),
    getScreenInfo: vi.fn(() => ({
      width: 1920,
      height: 1080,
      availableWidth: 1920,
      availableHeight: 1040,
      pixelRatio: 2,
      colorDepth: 24,
      orientation: 'landscape' as const,
      isDarkMode: false,
    })),
    getHardwareInfo: vi.fn(() => ({
      cpuCores: 8,
      memory: 16,
      maxTouchPoints: 0,
      hasWebGL: true,
    })),
    getFeatureSupport: vi.fn(() => ({
      serviceWorker: true,
      pushNotifications: true,
      webShare: false,
      geolocation: true,
      mediaDevices: true,
      bluetooth: false,
      nfc: false,
      vibration: false,
      webUSB: false,
      webSerial: false,
      webAuthn: true,
      indexedDB: true,
      localStorage: true,
      webSocket: true,
      fullscreen: true,
      pictureInPicture: true,
      crypto: true,
      clipboard: true,
    })),
    supports: vi.fn((feature: string) => feature === 'serviceWorker'),
    isOnline: vi.fn(() => true),
    isStandalone: vi.fn(() => false),
    getUserAgent: vi.fn(() => 'Mozilla/5.0'),
    getPlatform: vi.fn(() => 'MacIntel'),
    getLanguage: vi.fn(() => 'en-US'),
    getLanguages: vi.fn(() => ['en-US', 'en']),
  }
}

describe('createDeviceStores', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockGetProvider.mockReturnValue(mockProvider)
  })

  it('should return device info from the provider', () => {
    const { deviceInfo } = createDeviceStores()

    expect(deviceInfo.name).toBe('macOS Chrome')
    expect(deviceInfo.browser.name).toBe('Chrome')
    expect(deviceInfo.os.family).toBe('macOS')
    expect(deviceInfo.isDesktop).toBe(true)
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
  })

  it('should return screen info from the provider', () => {
    const { screenInfo } = createDeviceStores()

    expect(screenInfo.width).toBe(1920)
    expect(screenInfo.height).toBe(1080)
    expect(screenInfo.pixelRatio).toBe(2)
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
  })

  it('should return hardware info from the provider', () => {
    const { hardwareInfo } = createDeviceStores()

    expect(hardwareInfo.cpuCores).toBe(8)
    expect(hardwareInfo.memory).toBe(16)
    expect(hardwareInfo.hasWebGL).toBe(true)
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()
  })

  it('should return feature support from the provider', () => {
    const { featureSupport } = createDeviceStores()

    expect(featureSupport.serviceWorker).toBe(true)
    expect(featureSupport.pushNotifications).toBe(true)
    expect(featureSupport.bluetooth).toBe(false)
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()
  })

  it('should delegate supports() to the provider', () => {
    const { supports } = createDeviceStores()

    expect(supports('serviceWorker')).toBe(true)
    expect(supports('bluetooth')).toBe(false)
    expect(mockProvider.supports).toHaveBeenCalledWith('serviceWorker')
    expect(mockProvider.supports).toHaveBeenCalledWith('bluetooth')
  })

  it('should delegate isOnline() to the provider', () => {
    const { isOnline } = createDeviceStores()

    expect(isOnline()).toBe(true)
    expect(mockProvider.isOnline).toHaveBeenCalledOnce()
  })

  it('should delegate isStandalone() to the provider', () => {
    const { isStandalone } = createDeviceStores()

    expect(isStandalone()).toBe(false)
    expect(mockProvider.isStandalone).toHaveBeenCalledOnce()
  })

  it('should return language from the provider', () => {
    const { language } = createDeviceStores()

    expect(language).toBe('en-US')
    expect(mockProvider.getLanguage).toHaveBeenCalledOnce()
  })

  it('should return languages from the provider', () => {
    const { languages } = createDeviceStores()

    expect(languages).toEqual(['en-US', 'en'])
    expect(mockProvider.getLanguages).toHaveBeenCalledOnce()
  })
})
