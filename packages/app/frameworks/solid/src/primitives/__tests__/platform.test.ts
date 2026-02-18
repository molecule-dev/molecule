import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlatform } from '../platform.js'

const mockPlatformInfo = {
  platform: 'web' as const,
  isNative: false,
  isMobile: false,
  isDesktop: false,
  isWeb: true,
  isDevelopment: true,
  isProduction: false,
  userAgent: 'Mozilla/5.0',
}

vi.mock('@molecule/app-platform', () => ({
  platform: () => mockPlatformInfo,
  isPlatform: vi.fn((...platforms: string[]) => platforms.includes(mockPlatformInfo.platform)),
}))

describe('createPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
