// @vitest-environment jsdom
/**
 * `useDevice`: React's `useDevice` cases in Svelte's idiom. Its result is a
 * plain object made once during component init (React's `useMemo` with no
 * dependencies), so a component update re-reads the same object and the
 * provider is asked once per mount.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DeviceInfo,
  DeviceProvider,
  FeatureSupport,
  HardwareInfo,
  ScreenInfo,
} from '@molecule/app-device'

vi.mock('@molecule/app-device', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-device'

import { useDevice, type UseDeviceResult } from '../useDevice.js'
import DeviceProbe from './DeviceProbe.svelte'

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

/** The mounted fixtures this file tears down after each case. */
const mounts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of mounts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts {@link DeviceProbe}, which runs `useDevice()` during its init.
 *
 * @returns The container, the results it handed over, and the update trigger.
 */
function mountProbe(): {
  container: HTMLDivElement
  read: UseDeviceResult[]
  update: () => void
} {
  const read: UseDeviceResult[] = []
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(DeviceProbe, {
    target: container,
    props: {
      onRead: (result: UseDeviceResult) => {
        read.push(result)
      },
    },
  })
  flushSync()
  mounts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return {
    container,
    read,
    update: () => {
      const button = container.querySelector('button')
      if (button === null) throw new Error('the probe rendered no button')
      button.click()
      flushSync()
    },
  }
}

describe('useDevice', () => {
  let mockProvider: DeviceProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('returns device info', () => {
    const result = useDevice()

    expect(result.deviceInfo).toEqual(mockDeviceInfo)
    expect(result.deviceInfo.isDesktop).toBe(true)
    expect(result.deviceInfo.isMobile).toBe(false)
  })

  it('returns screen info', () => {
    const result = useDevice()

    expect(result.screenInfo).toEqual(mockScreenInfo)
    expect(result.screenInfo.width).toBe(1920)
    expect(result.screenInfo.pixelRatio).toBe(2)
  })

  it('returns hardware info', () => {
    const result = useDevice()

    expect(result.hardwareInfo).toEqual(mockHardwareInfo)
    expect(result.hardwareInfo.cpuCores).toBe(8)
    expect(result.hardwareInfo.memory).toBe(16)
  })

  it('returns feature support', () => {
    const result = useDevice()

    expect(result.featureSupport).toEqual(mockFeatureSupport)
    expect(result.featureSupport.serviceWorker).toBe(true)
    expect(result.featureSupport.bluetooth).toBe(false)
  })

  it('supports() delegates to provider', () => {
    const result = useDevice()

    expect(result.supports('serviceWorker')).toBe(true)
    expect(result.supports('bluetooth')).toBe(false)
    expect(mockProvider.supports).toHaveBeenCalledWith('serviceWorker')
    expect(mockProvider.supports).toHaveBeenCalledWith('bluetooth')
  })

  it('isOnline() delegates to provider', () => {
    const result = useDevice()

    expect(result.isOnline()).toBe(true)
    expect(mockProvider.isOnline).toHaveBeenCalledOnce()
  })

  it('isStandalone() delegates to provider', () => {
    const result = useDevice()

    expect(result.isStandalone()).toBe(false)
    expect(mockProvider.isStandalone).toHaveBeenCalledOnce()
  })

  it('returns language and languages', () => {
    const result = useDevice()

    expect(result.language).toBe('en-US')
    expect(result.languages).toEqual(['en-US', 'en'])
  })

  it('caches result with useMemo (same reference on rerender)', () => {
    const probe = mountProbe()
    const first = probe.read[0]

    probe.update()
    const second = probe.read[probe.read.length - 1]

    expect(probe.read.length).toBe(2)
    expect(first).toBe(second)
  })

  it('calls provider methods once via useMemo', () => {
    const probe = mountProbe()

    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    probe.update()

    // Should not call again after the component updates
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
  })
})
