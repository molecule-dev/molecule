import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDeviceService } from '../device.service.js'

vi.mock('@molecule/app-device', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-device'

const mockGetProvider = vi.mocked(getProvider)

const mockDeviceInfo = {
  name: 'macOS Chrome',
  browser: { name: 'Chrome', version: '120.0.0', majorVersion: 120, engine: 'Blink' },
  os: { name: 'macOS', version: '14.0', family: 'macOS' },
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  type: 'desktop' as const,
  hasTouch: false,
  userAgent: 'Mozilla/5.0',
}

const mockScreenInfo = {
  width: 1920,
  height: 1080,
  availableWidth: 1920,
  availableHeight: 1040,
  pixelRatio: 2,
  colorDepth: 24,
  orientation: 'landscape' as const,
  isDarkMode: false,
}

const mockHardwareInfo = {
  cpuCores: 8,
  memory: 16,
  maxTouchPoints: 0,
  hasWebGL: true,
  webGLRenderer: 'ANGLE',
}

const mockFeatureSupport = {
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
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockProvider = () => ({
  getDeviceInfo: vi.fn().mockReturnValue(mockDeviceInfo),
  getScreenInfo: vi.fn().mockReturnValue(mockScreenInfo),
  getHardwareInfo: vi.fn().mockReturnValue(mockHardwareInfo),
  getFeatureSupport: vi.fn().mockReturnValue(mockFeatureSupport),
  supports: vi.fn(
    (feature: string) => mockFeatureSupport[feature as keyof typeof mockFeatureSupport] ?? false,
  ),
  getUserAgent: vi.fn().mockReturnValue('Mozilla/5.0'),
  getPlatform: vi.fn().mockReturnValue('MacIntel'),
  getLanguage: vi.fn().mockReturnValue('en-US'),
  getLanguages: vi.fn().mockReturnValue(['en-US', 'en']),
  isOnline: vi.fn().mockReturnValue(true),
  isStandalone: vi.fn().mockReturnValue(false),
})

describe('createDeviceService', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockGetProvider.mockReturnValue(mockProvider as never)
  })

  it('should return device info from provider', () => {
    const service = createDeviceService()

    expect(service.deviceInfo).toEqual(mockDeviceInfo)
    expect(service.deviceInfo.browser.name).toBe('Chrome')
    expect(service.deviceInfo.isDesktop).toBe(true)
  })

  it('should return screen info from provider', () => {
    const service = createDeviceService()

    expect(service.screenInfo).toEqual(mockScreenInfo)
    expect(service.screenInfo.width).toBe(1920)
    expect(service.screenInfo.pixelRatio).toBe(2)
  })

  it('should return hardware info from provider', () => {
    const service = createDeviceService()

    expect(service.hardwareInfo).toEqual(mockHardwareInfo)
    expect(service.hardwareInfo.cpuCores).toBe(8)
    expect(service.hardwareInfo.memory).toBe(16)
  })

  it('should return feature support from provider', () => {
    const service = createDeviceService()

    expect(service.featureSupport).toEqual(mockFeatureSupport)
    expect(service.featureSupport.serviceWorker).toBe(true)
    expect(service.featureSupport.bluetooth).toBe(false)
  })

  it('should delegate supports() to provider', () => {
    const service = createDeviceService()

    expect(service.supports('serviceWorker')).toBe(true)
    expect(service.supports('bluetooth')).toBe(false)
    expect(mockProvider.supports).toHaveBeenCalledWith('serviceWorker')
    expect(mockProvider.supports).toHaveBeenCalledWith('bluetooth')
  })

  it('should delegate isOnline() to provider', () => {
    const service = createDeviceService()

    expect(service.isOnline()).toBe(true)
    expect(mockProvider.isOnline).toHaveBeenCalled()
  })

  it('should delegate isStandalone() to provider', () => {
    const service = createDeviceService()

    expect(service.isStandalone()).toBe(false)
    expect(mockProvider.isStandalone).toHaveBeenCalled()
  })

  it('should return language from provider', () => {
    const service = createDeviceService()

    expect(service.language).toBe('en-US')
  })

  it('should return languages from provider', () => {
    const service = createDeviceService()

    expect(service.languages).toEqual(['en-US', 'en'])
  })

  it('should call provider methods at creation time for static fields', () => {
    createDeviceService()

    expect(mockProvider.getDeviceInfo).toHaveBeenCalledTimes(1)
    expect(mockProvider.getScreenInfo).toHaveBeenCalledTimes(1)
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledTimes(1)
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledTimes(1)
    expect(mockProvider.getLanguage).toHaveBeenCalledTimes(1)
    expect(mockProvider.getLanguages).toHaveBeenCalledTimes(1)
  })
})
