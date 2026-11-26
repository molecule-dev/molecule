// @vitest-environment jsdom
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, type EffectScope, effectScope, h, nextTick, ref, shallowRef } from 'vue'

import type { UseDeviceResult } from '../useDevice.js'
import { useDevice } from '../useDevice.js'

vi.mock('@molecule/app-device', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

describe('useDevice', () => {
  let mockProvider: ReturnType<typeof createMockProvider>
  const scopes: EffectScope[] = []
  const wrappers: VueWrapper[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider as never)
  })

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop()
    for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  })

  /** Runs the composable inside an effect scope, the way a component setup runs it. */
  function open(): UseDeviceResult {
    const scope = effectScope()
    let result!: UseDeviceResult
    scope.run(() => {
      result = useDevice()
    })
    scopes.push(scope)
    return result
  }

  /**
   * Mounts one component that reads the composable in setup, with a reactive
   * value its render reads: assigning it re-renders the component, Vue's
   * counterpart of React's `rerender()`.
   *
   * @returns The last result the composable produced and an update trigger.
   */
  function mountDevice(): { current: () => UseDeviceResult; update: () => Promise<void> } {
    const holder = shallowRef<UseDeviceResult | null>(null)
    const tick = ref(0)
    const Page = defineComponent({
      setup() {
        holder.value = useDevice()
        return () => h('div', String(tick.value))
      },
    })
    wrappers.push(mount(Page))
    return {
      current: () => {
        if (holder.value === null) throw new Error('useDevice() has not run')
        return holder.value
      },
      update: async () => {
        tick.value++
        await nextTick()
      },
    }
  }

  it('returns device info from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceResult

    scope.run(() => {
      result = useDevice()
    })

    expect(result.deviceInfo).toEqual(mockDeviceInfo)
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('returns screen info from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceResult

    scope.run(() => {
      result = useDevice()
    })

    expect(result.screenInfo).toEqual(mockScreenInfo)
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('returns hardware info from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceResult

    scope.run(() => {
      result = useDevice()
    })

    expect(result.hardwareInfo).toEqual(mockHardwareInfo)
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('returns feature support from provider', () => {
    const scope = effectScope()
    let result!: UseDeviceResult

    scope.run(() => {
      result = useDevice()
    })

    expect(result.featureSupport).toEqual(mockFeatureSupport)
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('delegates supports() to provider', () => {
    const scope = effectScope()
    let result!: UseDeviceResult

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
    let result!: UseDeviceResult

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
    let result!: UseDeviceResult

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
    let result!: UseDeviceResult

    scope.run(() => {
      result = useDevice()
    })

    expect(result.language).toBe('en-US')
    expect(result.languages).toEqual(['en-US', 'en'])

    scope.stop()
  })

  it('returns static values (not reactive)', () => {
    const scope = effectScope()
    let result!: UseDeviceResult

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

  it('returns device info', () => {
    const device = open()

    expect(device.deviceInfo).toEqual(mockDeviceInfo)
    expect(device.deviceInfo.isDesktop).toBe(true)
    expect(device.deviceInfo.isMobile).toBe(false)
  })

  it('returns screen info', () => {
    const device = open()

    expect(device.screenInfo).toEqual(mockScreenInfo)
    expect(device.screenInfo.width).toBe(1920)
    expect(device.screenInfo.pixelRatio).toBe(2)
  })

  it('returns hardware info', () => {
    const device = open()

    expect(device.hardwareInfo).toEqual(mockHardwareInfo)
    expect(device.hardwareInfo.cpuCores).toBe(8)
    expect(device.hardwareInfo.memory).toBe(16)
  })

  it('returns feature support', () => {
    const device = open()

    expect(device.featureSupport).toEqual(mockFeatureSupport)
    expect(device.featureSupport.serviceWorker).toBe(true)
    expect(device.featureSupport.bluetooth).toBe(false)
  })

  it('supports() delegates to provider', () => {
    const device = open()

    expect(device.supports('serviceWorker')).toBe(true)
    expect(device.supports('bluetooth')).toBe(false)
  })

  it('isOnline() delegates to provider', () => {
    const device = open()

    expect(device.isOnline()).toBe(true)
  })

  it('isStandalone() delegates to provider', () => {
    const device = open()

    expect(device.isStandalone()).toBe(false)
  })

  it('returns language and languages', () => {
    const device = open()

    expect(device.language).toBe('en-US')
    expect(device.languages).toEqual(['en-US', 'en'])
  })

  it('caches result with useMemo (same reference on rerender)', async () => {
    const device = mountDevice()
    const first = device.current()

    // React's `rerender()` commits the same component again; Vue's is another
    // render of the same instance, whose setup (and so the composable) ran once.
    await device.update()

    expect(device.current()).toBe(first)
  })

  it('calls provider methods once via useMemo', async () => {
    const device = mountDevice()

    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getHardwareInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getFeatureSupport).toHaveBeenCalledOnce()

    await device.update()

    // Should not call again after rerender
    expect(mockProvider.getDeviceInfo).toHaveBeenCalledOnce()
    expect(mockProvider.getScreenInfo).toHaveBeenCalledOnce()
  })
})
