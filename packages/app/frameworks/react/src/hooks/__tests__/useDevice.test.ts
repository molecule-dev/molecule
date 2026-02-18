// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DeviceInfo,
  DeviceProvider,
  FeatureSupport,
  HardwareInfo,
  ScreenInfo,
} from '@molecule/app-device'

vi.mock('@molecule/app-device', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-device'

import { useDevice } from '../useDevice.js'

const mockDeviceInfo: DeviceInfo = {
  name: 'macOS Chrome',
  browser: { name: 'Chrome', version: '120.0.0', majorVersion: 120, engine: 'Blink' },
  os: { name: 'macOS', version: '14.0', family: 'macOS' },
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  type: 'desktop',
  hasTouch: false,
  userAgent: 'Mozilla/5.0 (Macintosh)',
}

const mockScreenInfo: ScreenInfo = {
  width: 1920,
  height: 1080,
  availableWidth: 1920,
  availableHeight: 1040,
  pixelRatio: 2,
  colorDepth: 24,
  orientation: 'landscape',
  isDarkMode: false,
}

const mockHardwareInfo: HardwareInfo = {
  cpuCores: 8,
  memory: 16,
  maxTouchPoints: 0,
  hasWebGL: true,
  webGLRenderer: 'ANGLE (Apple, ANGLE Metal Renderer)',
}

const mockFeatureSupport: FeatureSupport = {
  serviceWorker: true,
  pushNotifications: true,
  webShare: true,
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

const createMockProvider = (): DeviceProvider => ({
  getDeviceInfo: vi.fn(() => mockDeviceInfo),
  getScreenInfo: vi.fn(() => mockScreenInfo),
  getHardwareInfo: vi.fn(() => mockHardwareInfo),
  getFeatureSupport: vi.fn(() => mockFeatureSupport),
  supports: vi.fn((feature: keyof FeatureSupport) => mockFeatureSupport[feature]),
  getUserAgent: vi.fn(() => 'Mozilla/5.0 (Macintosh)'),
  getPlatform: vi.fn(() => 'MacIntel'),
  getLanguage: vi.fn(() => 'en-US'),
  getLanguages: vi.fn(() => ['en-US', 'en']),
  isOnline: vi.fn(() => true),
  isStandalone: vi.fn(() => false),
})

describe('useDevice', () => {
  let mockProvider: DeviceProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('returns device info', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.deviceInfo).toEqual(mockDeviceInfo)
    expect(result.current.deviceInfo.isDesktop).toBe(true)
    expect(result.current.deviceInfo.isMobile).toBe(false)
  })

  it('returns screen info', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.screenInfo).toEqual(mockScreenInfo)
    expect(result.current.screenInfo.width).toBe(1920)
    expect(result.current.screenInfo.pixelRatio).toBe(2)
  })

  it('returns hardware info', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.hardwareInfo).toEqual(mockHardwareInfo)
    expect(result.current.hardwareInfo.cpuCores).toBe(8)
    expect(result.current.hardwareInfo.memory).toBe(16)
  })

  it('returns feature support', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.featureSupport).toEqual(mockFeatureSupport)
    expect(result.current.featureSupport.serviceWorker).toBe(true)
    expect(result.current.featureSupport.bluetooth).toBe(false)
  })

  it('supports() delegates to provider', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.supports('serviceWorker')).toBe(true)
    expect(result.current.supports('bluetooth')).toBe(false)
  })

  it('isOnline() delegates to provider', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.isOnline()).toBe(true)
  })

  it('isStandalone() delegates to provider', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.isStandalone()).toBe(false)
  })

  it('returns language and languages', () => {
    const { result } = renderHook(() => useDevice())

    expect(result.current.language).toBe('en-US')
    expect(result.current.languages).toEqual(['en-US', 'en'])
  })

  it('caches result with useMemo (same reference on rerender)', () => {
    const { result, rerender } = renderHook(() => useDevice())

    const first = result.current
    rerender()
    const second = result.current

    expect(first).toBe(second)
  })

  it('calls provider methods once via useMemo', () => {
    const { rerender } = renderHook(() => useDevice())

    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    rerender()

    // Should not call again after rerender
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
  })
})
