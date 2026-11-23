// @vitest-environment jsdom

/**
 * `useDevice` — the device provider's static info and its helpers, read once
 * per component instance. Angular's idiom for React's memoized hook: the
 * component field initializer runs once, and change detection re-reads nothing.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { useDevice } from '../use-native.js'

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

/**
 * Exposes the hook's result for the mounted component.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-device-probe',
  template: '',
})
class DeviceProbeComponent {
  readonly device = useDevice()
}

/**
 * Mounts the probe against the current mock provider.
 *
 * @returns The mounted fixture.
 */
function mount(): ComponentFixture<DeviceProbeComponent> {
  TestBed.configureTestingModule({
    imports: [DeviceProbeComponent],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(DeviceProbeComponent)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

let mockProvider: DeviceProvider

beforeEach(() => {
  mockProvider = createMockProvider()
  vi.mocked(getProvider).mockReturnValue(mockProvider)
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useDevice', () => {
  it('returns device info', () => {
    const device = mount().componentInstance.device

    expect(device.deviceInfo).toEqual(mockDeviceInfo)
    expect(device.deviceInfo.isDesktop).toBe(true)
    expect(device.deviceInfo.isMobile).toBe(false)
  })

  it('returns screen info', () => {
    const device = mount().componentInstance.device

    expect(device.screenInfo).toEqual(mockScreenInfo)
    expect(device.screenInfo.width).toBe(1920)
    expect(device.screenInfo.pixelRatio).toBe(2)
  })

  it('returns hardware info', () => {
    const device = mount().componentInstance.device

    expect(device.hardwareInfo).toEqual(mockHardwareInfo)
    expect(device.hardwareInfo.cpuCores).toBe(8)
    expect(device.hardwareInfo.memory).toBe(16)
  })

  it('returns feature support', () => {
    const device = mount().componentInstance.device

    expect(device.featureSupport).toEqual(mockFeatureSupport)
    expect(device.featureSupport.serviceWorker).toBe(true)
    expect(device.featureSupport.bluetooth).toBe(false)
  })

  it('supports() delegates to provider', () => {
    const device = mount().componentInstance.device

    expect(device.supports('serviceWorker')).toBe(true)
    expect(device.supports('bluetooth')).toBe(false)
  })

  it('isOnline() delegates to provider', () => {
    const device = mount().componentInstance.device

    expect(device.isOnline()).toBe(true)
  })

  it('isStandalone() delegates to provider', () => {
    const device = mount().componentInstance.device

    expect(device.isStandalone()).toBe(false)
  })

  it('returns language and languages', () => {
    const device = mount().componentInstance.device

    expect(device.language).toBe('en-US')
    expect(device.languages).toEqual(['en-US', 'en'])
  })

  it('caches result with useMemo (same reference on rerender)', () => {
    const fixture = mount()
    const first = fixture.componentInstance.device

    // React's `rerender()` commits again on the same instance; Angular's is
    // another change-detection pass on the same component.
    fixture.detectChanges()
    const second = fixture.componentInstance.device

    expect(first).toBe(second)
  })

  it('calls provider methods once via useMemo', () => {
    const fixture = mount()

    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    fixture.detectChanges()

    // Should not call again after rerender
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
  })
})
