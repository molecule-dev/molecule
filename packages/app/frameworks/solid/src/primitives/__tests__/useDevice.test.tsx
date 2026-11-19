// @vitest-environment jsdom
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

import { type DevicePrimitives, useDevice } from '../device.js'

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

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

describe('useDevice', () => {
  let mockProvider: DeviceProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('returns device info', () => {
    const device = useDevice()

    expect(device.deviceInfo).toEqual(mockDeviceInfo)
    expect(device.deviceInfo.isDesktop).toBe(true)
    expect(device.deviceInfo.isMobile).toBe(false)
  })

  it('returns screen info', () => {
    const device = useDevice()

    expect(device.screenInfo).toEqual(mockScreenInfo)
    expect(device.screenInfo.width).toBe(1920)
    expect(device.screenInfo.pixelRatio).toBe(2)
  })

  it('returns hardware info', () => {
    const device = useDevice()

    expect(device.hardwareInfo).toEqual(mockHardwareInfo)
    expect(device.hardwareInfo.cpuCores).toBe(8)
    expect(device.hardwareInfo.memory).toBe(16)
  })

  it('returns feature support', () => {
    const device = useDevice()

    expect(device.featureSupport).toEqual(mockFeatureSupport)
    expect(device.featureSupport.serviceWorker).toBe(true)
    expect(device.featureSupport.bluetooth).toBe(false)
  })

  it('supports() delegates to provider', () => {
    const device = useDevice()

    expect(device.supports('serviceWorker')).toBe(true)
    expect(device.supports('bluetooth')).toBe(false)
  })

  it('isOnline() delegates to provider', () => {
    const device = useDevice()

    expect(device.isOnline()).toBe(true)
  })

  it('isStandalone() delegates to provider', () => {
    const device = useDevice()

    expect(device.isStandalone()).toBe(false)
  })

  it('returns language and languages', () => {
    const device = useDevice()

    expect(device.language).toBe('en-US')
    expect(device.languages).toEqual(['en-US', 'en'])
  })

  it('caches result with useMemo (same reference on rerender)', () => {
    // Solid runs a component body once; the hook's memoized result is the
    // one object the component keeps while its reactive DOM updates.
    const [tick, setTick] = createSignal(0)
    let first: DevicePrimitives | undefined
    let latest: DevicePrimitives | undefined
    mount(() => {
      const device = useDevice()
      first ??= device
      latest = device
      return <output>{tick()}</output>
    })

    setTick(1)

    expect(first).toBeDefined()
    expect(latest).toBe(first)
  })

  it('calls provider methods once via useMemo', () => {
    const [tick, setTick] = createSignal(0)
    mount(() => {
      useDevice()
      return <output>{tick()}</output>
    })

    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    setTick(1)

    // Should not call again after a reactive update
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
  })
})
