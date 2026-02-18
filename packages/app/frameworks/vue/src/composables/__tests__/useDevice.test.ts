import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type { UseDeviceReturn } from '../useDevice.js'
import { useDevice } from '../useDevice.js'

vi.mock('@molecule/app-device', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-device'

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

const createMockProvider = (): ReturnType<typeof createMockProvider> => ({
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

describe('useDevice', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider as never)
  })

  it('returns device info from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.deviceInfo).toEqual(mockDeviceInfo)
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('returns screen info from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.screenInfo).toEqual(mockScreenInfo)
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('returns hardware info from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.hardwareInfo).toEqual(mockHardwareInfo)
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('returns feature support from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.featureSupport).toEqual(mockFeatureSupport)
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('delegates supports() to provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.supports('serviceWorker')).toBe(true)
    expect(result.supports('bluetooth')).toBe(false)
    expect(mockProvider.supports).toHaveBeenCalledWith('serviceWorker')
    expect(mockProvider.supports).toHaveBeenCalledWith('bluetooth')

    scope.stop()
  })

  it('delegates isOnline() to provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.isOnline()).toBe(true)

    mockProvider.isOnline.mockReturnValue(false)
    expect(result.isOnline()).toBe(false)

    scope.stop()
  })

  it('delegates isStandalone() to provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.isStandalone()).toBe(false)

    mockProvider.isStandalone.mockReturnValue(true)
    expect(result.isStandalone()).toBe(true)

    scope.stop()
  })

  it('returns language and languages from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    expect(result.language).toBe('en-US')
    expect(result.languages).toEqual(['en-US', 'en'])

    scope.stop()
  })

  it('returns static values (not reactive)', () => {
    const scope = effectScope()
    let result!: UseDeviceReturn

    scope.run(() => {
      result = useDevice()
    })

    // The values are plain objects, not refs
    expect(result.deviceInfo.browser.name).toBe('Chrome')
    expect(result.screenInfo.width).toBe(1920)
    expect(result.hardwareInfo.cpuCores).toBe(8)
    expect(result.featureSupport.serviceWorker).toBe(true)

    scope.stop()
  })
})
