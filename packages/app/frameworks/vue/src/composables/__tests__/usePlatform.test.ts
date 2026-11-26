// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, ref } from 'vue'

import type { UsePlatformResult } from '../usePlatform.js'
import { usePlatform } from '../usePlatform.js'

vi.mock('@molecule/app-platform', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

  it('returns platform info fields', () => {
    const scope = effectScope()
    let result!: UsePlatformResult

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.platform).toBe('web')
    expect(result.isWeb).toBe(true)
    expect(result.isNative).toBe(false)
    expect(result.isMobile).toBe(false)
    expect(result.isDesktop).toBe(false)
    expect(result.isDevelopment).toBe(true)
    expect(result.isProduction).toBe(false)

    scope.stop()
  })

  it('isPlatform delegates to module function', () => {
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('web'))

    const scope = effectScope()
    let result!: UsePlatformResult

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.isPlatform('web')).toBe(true)
    expect(isPlatform).toHaveBeenCalledWith('web')

    expect(result.isPlatform('ios', 'android')).toBe(false)
    expect(isPlatform).toHaveBeenCalledWith('ios', 'android')

    scope.stop()
  })

  it('does not call platform() again on rerender', async () => {
    const tick = ref(0)
    const Probe = defineComponent({
      setup() {
        const info = usePlatform()
        return () => {
          // Reading the ref makes this render tracked, so the bump re-renders.
          void tick.value
          return h('span', info.platform)
        }
      },
    })

    const wrapper = mount(Probe)
    const callCount = vi.mocked(platform).mock.calls.length
    expect(callCount).toBe(1)

    tick.value += 1
    await nextTick()

    // The composable read the platform once, on setup; a re-render adds no call.
    expect(vi.mocked(platform).mock.calls.length).toBe(callCount)

    wrapper.unmount()
  })

  it('returns correct values for native platform', () => {
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
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('ios'))

    const scope = effectScope()
    let result!: UsePlatformResult

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.platform).toBe('ios')
    expect(result.isNative).toBe(true)
    expect(result.isMobile).toBe(true)
    expect(result.isWeb).toBe(false)
    expect(result.isProduction).toBe(true)
    expect(result.isPlatform('ios')).toBe(true)
    expect(result.isPlatform('web')).toBe(false)

    scope.stop()
  })

  it('returns correct values for desktop platform', () => {
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
    let result!: UsePlatformResult

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.platform).toBe('electron')
    expect(result.isNative).toBe(true)
    expect(result.isDesktop).toBe(true)
    expect(result.isWeb).toBe(false)

    scope.stop()
  })

  it('returns false from isPlatform when no match', () => {
    vi.mocked(isPlatform).mockReturnValue(false)

    const scope = effectScope()
    let result!: UsePlatformResult

    scope.run(() => {
      result = usePlatform()
    })

    expect(result.isPlatform('electron')).toBe(false)

    scope.stop()
  })

  it('returns static values (not reactive)', () => {
    const scope = effectScope()
    let result!: UsePlatformResult

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
