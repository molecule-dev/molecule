import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlatformStores } from '../platform.js'

vi.mock('@molecule/app-platform', () => ({
  getPlatformInfo: vi.fn(),
  isPlatform: vi.fn(),
}))

import { getPlatformInfo, isPlatform } from '@molecule/app-platform'

const mockGetPlatformInfo = getPlatformInfo as ReturnType<typeof vi.fn>
const mockIsPlatform = isPlatform as ReturnType<typeof vi.fn>

describe('createPlatformStores', () => {
  beforeEach(() => {
    mockGetPlatformInfo.mockReturnValue({
      platform: 'web',
      isNative: false,
      isMobile: false,
      isDesktop: false,
      isWeb: true,
      isDevelopment: true,
      isProduction: false,
      userAgent: 'Mozilla/5.0',
    })
    mockIsPlatform.mockImplementation((...platforms: string[]) => platforms.includes('web'))
  })

  it('should return the current platform', () => {
    const { platform } = createPlatformStores()

    expect(platform).toBe('web')
  })

  it('should return isNative as false for web', () => {
    const { isNative } = createPlatformStores()

    expect(isNative).toBe(false)
  })

  it('should return isMobile as false for web', () => {
    const { isMobile } = createPlatformStores()

    expect(isMobile).toBe(false)
  })

  it('should return isDesktop as false for web', () => {
    const { isDesktop } = createPlatformStores()

    expect(isDesktop).toBe(false)
  })

  it('should return isWeb as true for web', () => {
    const { isWeb } = createPlatformStores()

    expect(isWeb).toBe(true)
  })

  it('should return isDevelopment from platform info', () => {
    const { isDevelopment } = createPlatformStores()

    expect(isDevelopment).toBe(true)
  })

  it('should return isProduction from platform info', () => {
    const { isProduction } = createPlatformStores()

    expect(isProduction).toBe(false)
  })

  it('should delegate isPlatform to the module function', () => {
    const stores = createPlatformStores()

    expect(stores.isPlatform('web')).toBe(true)
    expect(mockIsPlatform).toHaveBeenCalledWith('web')
  })

  it('should handle native platform info', () => {
    mockGetPlatformInfo.mockReturnValue({
      platform: 'ios',
      isNative: true,
      isMobile: true,
      isDesktop: false,
      isWeb: false,
      isDevelopment: false,
      isProduction: true,
    })

    const { platform, isNative, isMobile, isWeb } = createPlatformStores()

    expect(platform).toBe('ios')
    expect(isNative).toBe(true)
    expect(isMobile).toBe(true)
    expect(isWeb).toBe(false)
  })

  it('should support checking multiple platforms', () => {
    mockIsPlatform.mockReturnValue(true)
    const stores = createPlatformStores()

    expect(stores.isPlatform('ios', 'android')).toBe(true)
    expect(mockIsPlatform).toHaveBeenCalledWith('ios', 'android')
  })
})
