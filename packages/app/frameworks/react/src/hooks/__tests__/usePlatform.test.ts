// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlatformInfo } from '@molecule/app-platform'

vi.mock('@molecule/app-platform', () => ({
  platform: vi.fn(),
  isPlatform: vi.fn(),
}))

import { isPlatform, platform } from '@molecule/app-platform'

import { usePlatform } from '../usePlatform.js'

const mockPlatformInfo: PlatformInfo = {
  platform: 'web',
  isNative: false,
  isMobile: false,
  isDesktop: false,
  isWeb: true,
  isDevelopment: true,
  isProduction: false,
  userAgent: 'Mozilla/5.0 (Macintosh)',
}

describe('usePlatform', () => {
  beforeEach(() => {
    vi.mocked(platform).mockReturnValue(mockPlatformInfo)
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('web'))
  })

  it('returns platform info fields', () => {
    const { result } = renderHook(() => usePlatform())

    expect(result.current.platform).toBe('web')
    expect(result.current.isWeb).toBe(true)
    expect(result.current.isNative).toBe(false)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.isDevelopment).toBe(true)
    expect(result.current.isProduction).toBe(false)
  })

  it('isPlatform delegates to module function', () => {
    const { result } = renderHook(() => usePlatform())

    expect(result.current.isPlatform('web')).toBe(true)
    expect(isPlatform).toHaveBeenCalledWith('web')

    expect(result.current.isPlatform('ios', 'android')).toBe(false)
    expect(isPlatform).toHaveBeenCalledWith('ios', 'android')
  })

  it('caches result with useMemo (same reference on rerender)', () => {
    const { result, rerender } = renderHook(() => usePlatform())

    const first = result.current
    rerender()
    const second = result.current

    expect(first).toBe(second)
  })

  it('does not call platform() again on rerender', () => {
    const { rerender } = renderHook(() => usePlatform())

    const callCount = vi.mocked(platform).mock.calls.length
    rerender()

    // Should not call again after rerender
    expect(vi.mocked(platform).mock.calls.length).toBe(callCount)
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

    const { result } = renderHook(() => usePlatform())

    expect(result.current.platform).toBe('ios')
    expect(result.current.isNative).toBe(true)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isWeb).toBe(false)
    expect(result.current.isProduction).toBe(true)
    expect(result.current.isPlatform('ios')).toBe(true)
    expect(result.current.isPlatform('web')).toBe(false)
  })

  it('returns correct values for desktop platform', () => {
    vi.mocked(platform).mockReturnValue({
      ...mockPlatformInfo,
      platform: 'electron',
      isNative: true,
      isDesktop: true,
      isWeb: false,
    })

    const { result } = renderHook(() => usePlatform())

    expect(result.current.platform).toBe('electron')
    expect(result.current.isNative).toBe(true)
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isWeb).toBe(false)
  })
})
