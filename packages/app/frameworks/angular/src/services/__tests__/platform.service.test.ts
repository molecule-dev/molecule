import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlatformService } from '../platform.service.js'

vi.mock('@molecule/app-platform', () => ({
  getPlatformInfo: vi.fn(),
  isPlatform: vi.fn(),
}))

import { getPlatformInfo, isPlatform } from '@molecule/app-platform'

const mockGetPlatformInfo = vi.mocked(getPlatformInfo)
const mockIsPlatform = vi.mocked(isPlatform)

describe('createPlatformService', () => {
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
    mockIsPlatform.mockImplementation((...platforms) => platforms.includes('web'))
  })

  it('should return platform from getPlatformInfo', () => {
    const service = createPlatformService()

    expect(service.platform).toBe('web')
  })

  it('should return isNative flag', () => {
    const service = createPlatformService()

    expect(service.isNative).toBe(false)
  })

  it('should return isMobile flag', () => {
    const service = createPlatformService()

    expect(service.isMobile).toBe(false)
  })

  it('should return isDesktop flag', () => {
    const service = createPlatformService()

    expect(service.isDesktop).toBe(false)
  })

  it('should return isWeb flag', () => {
    const service = createPlatformService()

    expect(service.isWeb).toBe(true)
  })

  it('should return isDevelopment flag', () => {
    const service = createPlatformService()

    expect(service.isDevelopment).toBe(true)
  })

  it('should return isProduction flag', () => {
    const service = createPlatformService()

    expect(service.isProduction).toBe(false)
  })

  it('should delegate isPlatform() to module function', () => {
    const service = createPlatformService()

    expect(service.isPlatform('web')).toBe(true)
    expect(mockIsPlatform).toHaveBeenCalledWith('web')
  })

  it('should support multiple platforms in isPlatform()', () => {
    mockIsPlatform.mockReturnValue(true)
    const service = createPlatformService()

    expect(service.isPlatform('ios', 'android', 'web')).toBe(true)
    expect(mockIsPlatform).toHaveBeenCalledWith('ios', 'android', 'web')
  })

  it('should reflect mobile platform info', () => {
    mockGetPlatformInfo.mockReturnValue({
      platform: 'ios',
      isNative: true,
      isMobile: true,
      isDesktop: false,
      isWeb: false,
      isDevelopment: false,
      isProduction: true,
    })

    const service = createPlatformService()

    expect(service.platform).toBe('ios')
    expect(service.isNative).toBe(true)
    expect(service.isMobile).toBe(true)
    expect(service.isWeb).toBe(false)
    expect(service.isProduction).toBe(true)
  })
})
