import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import type { UsePlatformReturn } from '../usePlatform.js'
import { usePlatform } from '../usePlatform.js'

vi.mock('@molecule/app-platform', () => ({
  platform: vi.fn(),
  isPlatform: vi.fn(),
}))

import { isPlatform, platform } from '@molecule/app-platform'

describe('usePlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(platform).mockReturnValue({
      platform: 'web',
      isNative: false,
      isMobile: false,
      isDesktop: false,
      isWeb: true,
      isDevelopment: true,
      isProduction: false,
      userAgent: 'Mozilla/5.0',
    })
    vi.mocked(isPlatform).mockReturnValue(false)
  })

  it('returns platform info from platform()', () => {
    const scope = effectScope()
    let result!: UsePlatformReturn

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.platform).toBe('web')
    expect(result.isNative).toBe(false)
    expect(result.isMobile).toBe(false)
    expect(result.isDesktop).toBe(false)
    expect(result.isWeb).toBe(true)
    expect(result.isDevelopment).toBe(true)
    expect(result.isProduction).toBe(false)

    scope.stop()
  })

  it('delegates isPlatform to the module function', () => {
    vi.mocked(isPlatform).mockReturnValue(true)

    const scope = effectScope()
    let result!: UsePlatformReturn

    scope.run(() => {
      result = usePlatform()
    })

    const matched = result.isPlatform('ios', 'android')
    expect(matched).toBe(true)
    expect(isPlatform).toHaveBeenCalledWith('ios', 'android')

    scope.stop()
  })

  it('returns false from isPlatform when no match', () => {
    vi.mocked(isPlatform).mockReturnValue(false)

    const scope = effectScope()
    let result!: UsePlatformReturn

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.isPlatform('electron')).toBe(false)

    scope.stop()
  })

  it('detects native mobile platform', () => {
    vi.mocked(platform).mockReturnValue({
      platform: 'ios',
      isNative: true,
      isMobile: true,
      isDesktop: false,
      isWeb: false,
      isDevelopment: false,
      isProduction: true,
      userAgent: 'Capacitor/iOS',
    })

    const scope = effectScope()
    let result!: UsePlatformReturn

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.platform).toBe('ios')
    expect(result.isNative).toBe(true)
    expect(result.isMobile).toBe(true)
    expect(result.isWeb).toBe(false)
    expect(result.isProduction).toBe(true)

    scope.stop()
  })

  it('detects desktop platform', () => {
    vi.mocked(platform).mockReturnValue({
      platform: 'electron',
      isNative: true,
      isMobile: false,
      isDesktop: true,
      isWeb: false,
      isDevelopment: true,
      isProduction: false,
    })

    const scope = effectScope()
    let result!: UsePlatformReturn

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.platform).toBe('electron')
    expect(result.isDesktop).toBe(true)
    expect(result.isMobile).toBe(false)
    expect(result.isNative).toBe(true)

    scope.stop()
  })

  it('returns static values (not reactive)', () => {
    const scope = effectScope()
    let result!: UsePlatformReturn

    scope.run(() => {
      result = usePlatform()
    })

    // Plain values, not refs
    expect(typeof result.platform).toBe('string')
    expect(typeof result.isWeb).toBe('boolean')
    expect(typeof result.isPlatform).toBe('function')

    scope.stop()
  })
})
