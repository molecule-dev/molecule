import { createEffect, createRoot, createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Platform, PlatformInfo } from '@molecule/app-platform'

const mockPlatformInfo: PlatformInfo = {
  platform: 'web',
  isNative: false,
  isMobile: false,
  isDesktop: false,
  isWeb: true,
  isDevelopment: true,
  isProduction: false,
  userAgent: 'Mozilla/5.0',
}

vi.mock('@molecule/app-platform', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  platform: vi.fn(() => mockPlatformInfo),
  isPlatform: vi.fn((...platforms: Platform[]) => platforms.includes('web')),
}))

import { isPlatform, platform } from '@molecule/app-platform'

import { createPlatform, usePlatform } from '../platform.js'

describe('createPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(platform).mockReturnValue(mockPlatformInfo)
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('web'))
  })

  it('returns the current platform', () => {
    const { platform } = createPlatform()

    expect(platform).toBe('web')
  })

  it('returns isWeb as true for web platform', () => {
    const { isWeb } = createPlatform()

    expect(isWeb).toBe(true)
  })

  it('returns isNative as false for web platform', () => {
    const { isNative } = createPlatform()

    expect(isNative).toBe(false)
  })

  it('returns isMobile as false for web platform', () => {
    const { isMobile } = createPlatform()

    expect(isMobile).toBe(false)
  })

  it('returns isDesktop as false for web platform', () => {
    const { isDesktop } = createPlatform()

    expect(isDesktop).toBe(false)
  })

  it('returns isDevelopment correctly', () => {
    const { isDevelopment, isProduction } = createPlatform()

    expect(isDevelopment).toBe(true)
    expect(isProduction).toBe(false)
  })

  it('delegates isPlatform to the core function', () => {
    const { isPlatform } = createPlatform()

    expect(isPlatform('web')).toBe(true)
    expect(isPlatform('ios', 'android')).toBe(false)
  })

  it('isPlatform returns true when current platform is in list', () => {
    const { isPlatform } = createPlatform()

    expect(isPlatform('web', 'ios')).toBe(true)
    expect(isPlatform('electron')).toBe(false)
  })

  it('returns all PlatformInfo fields', () => {
    const result = createPlatform()

    expect(result).toHaveProperty('platform')
    expect(result).toHaveProperty('isNative')
    expect(result).toHaveProperty('isMobile')
    expect(result).toHaveProperty('isDesktop')
    expect(result).toHaveProperty('isWeb')
    expect(result).toHaveProperty('isDevelopment')
    expect(result).toHaveProperty('isProduction')
    expect(result).toHaveProperty('isPlatform')
  })
})

describe('usePlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(platform).mockReturnValue(mockPlatformInfo)
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('web'))
  })

  it('returns platform info fields', () => {
    const info = usePlatform()

    expect(info.platform).toBe('web')
    expect(info.isWeb).toBe(true)
    expect(info.isNative).toBe(false)
    expect(info.isMobile).toBe(false)
    expect(info.isDesktop).toBe(false)
    expect(info.isDevelopment).toBe(true)
    expect(info.isProduction).toBe(false)
  })

  it('isPlatform delegates to module function', () => {
    const info = usePlatform()

    expect(info.isPlatform('web')).toBe(true)
    expect(isPlatform).toHaveBeenCalledWith('web')

    expect(info.isPlatform('ios', 'android')).toBe(false)
    expect(isPlatform).toHaveBeenCalledWith('ios', 'android')
  })

  it('does not call platform() again on rerender', () => {
    const [tick, setTick] = createSignal(0)
    const dispose = createRoot((disposeRoot) => {
      // A Solid component body runs once; the reactive update below reads the
      // same platform result without asking for the platform again.
      const info = usePlatform()
      createEffect(() => {
        void tick()
        void info.isWeb
      })
      return disposeRoot
    })

    const callCount = vi.mocked(platform).mock.calls.length
    setTick(1)

    expect(vi.mocked(platform).mock.calls.length).toBe(callCount)
    dispose()
  })

  it('returns correct values for native platform', () => {
    vi.mocked(platform).mockReturnValue({
      ...mockPlatformInfo,
      platform: 'ios',
      isNative: true,
      isMobile: true,
      isWeb: false,
      isDevelopment: false,
      isProduction: true,
    })
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('ios'))

    const info = usePlatform()

    expect(info.platform).toBe('ios')
    expect(info.isNative).toBe(true)
    expect(info.isMobile).toBe(true)
    expect(info.isWeb).toBe(false)
    expect(info.isProduction).toBe(true)
    expect(info.isPlatform('ios')).toBe(true)
    expect(info.isPlatform('web')).toBe(false)
  })

  it('returns correct values for desktop platform', () => {
    vi.mocked(platform).mockReturnValue({
      ...mockPlatformInfo,
      platform: 'electron',
      isNative: true,
      isDesktop: true,
      isWeb: false,
    })

    const info = usePlatform()

    expect(info.platform).toBe('electron')
    expect(info.isNative).toBe(true)
    expect(info.isDesktop).toBe(true)
    expect(info.isWeb).toBe(false)
  })
})
