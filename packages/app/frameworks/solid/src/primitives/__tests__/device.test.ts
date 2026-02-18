import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDevice } from '../device.js'

const mockProvider = {
  getDeviceInfo: vi.fn(),
  getScreenInfo: vi.fn(),
  getHardwareInfo: vi.fn(),
  getFeatureSupport: vi.fn(),
  supports: vi.fn(),
  getUserAgent: vi.fn(),
  getPlatform: vi.fn(),
  getLanguage: vi.fn(),
  getLanguages: vi.fn(),
  isOnline: vi.fn(),
  isStandalone: vi.fn(),
}

vi.mock('@molecule/app-device', () => ({
  getProvider: () => mockProvider,
}))

describe('createDevice', () => {
  const mockDeviceInfo = {
    name: 'Chrome on macOS',
    browser: { name: 'Chrome', version: '120.0.0', majorVersion: 120 },
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

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider.getDeviceInfo.mockReturnValue(mockDeviceInfo)
    mockProvider.getScreenInfo.mockReturnValue(mockScreenInfo)
    mockProvider.getHardwareInfo.mockReturnValue(mockHardwareInfo)
    mockProvider.getFeatureSupport.mockReturnValue(mockFeatureSupport)
    mockProvider.supports.mockImplementation(
      (feature: string) => mockFeatureSupport[feature as keyof typeof mockFeatureSupport],
    )
    mockProvider.getLanguage.mockReturnValue('en-US')
    mockProvider.getLanguages.mockReturnValue(['en-US', 'en'])
    mockProvider.isOnline.mockReturnValue(true)
    mockProvider.isStandalone.mockReturnValue(false)
  })

  it('returns device info from provider', () => {
    const { deviceInfo } = createDevice()

    expect(deviceInfo.browser.name).toBe('Chrome')
    expect(deviceInfo.os.name).toBe('macOS')
    expect(deviceInfo.isDesktop).toBe(true)
  })

  it('returns screen info from provider', () => {
    const { screenInfo } = createDevice()

    expect(screenInfo.width).toBe(1920)
    expect(screenInfo.height).toBe(1080)
    expect(screenInfo.pixelRatio).toBe(2)
  })

  it('returns hardware info from provider', () => {
    const { hardwareInfo } = createDevice()

    expect(hardwareInfo.cpuCores).toBe(8)
    expect(hardwareInfo.memory).toBe(16)
    expect(hardwareInfo.hasWebGL).toBe(true)
  })

  it('returns feature support from provider', () => {
    const { featureSupport } = createDevice()

    expect(featureSupport.serviceWorker).toBe(true)
    expect(featureSupport.pushNotifications).toBe(true)
    expect(featureSupport.bluetooth).toBe(false)
  })

  it('delegates supports() to provider', () => {
    const { supports } = createDevice()

    expect(supports('serviceWorker')).toBe(true)
    expect(supports('bluetooth')).toBe(false)
    expect(mockProvider.supports).toHaveBeenCalledWith('serviceWorker')
    expect(mockProvider.supports).toHaveBeenCalledWith('bluetooth')
  })

  it('delegates isOnline() to provider', () => {
    const { isOnline } = createDevice()

    expect(isOnline()).toBe(true)
    expect(mockProvider.isOnline).toHaveBeenCalled()
  })

  it('delegates isStandalone() to provider', () => {
    const { isStandalone } = createDevice()

    expect(isStandalone()).toBe(false)
    expect(mockProvider.isStandalone).toHaveBeenCalled()
  })

  it('returns language from provider', () => {
    const { language } = createDevice()

    expect(language).toBe('en-US')
  })

  it('returns languages from provider', () => {
    const { languages } = createDevice()

    expect(languages).toEqual(['en-US', 'en'])
  })

  it('returns fresh values from isOnline when called again', () => {
    const { isOnline } = createDevice()

    expect(isOnline()).toBe(true)

    mockProvider.isOnline.mockReturnValue(false)
    expect(isOnline()).toBe(false)
  })
})
