// @vitest-environment jsdom

/**
 * `usePlatform` — platform detection read once per component instance,
 * mirroring React's memoized hook. Every title is React's
 * (`usePlatform.test.ts`); only the framework-forced mechanics change: the
 * function runs in an injection context (a component field initializer), and
 * `detectChanges()` replaces a re-render.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlatformInfo } from '@molecule/app-platform'

vi.mock('@molecule/app-platform', () => ({
  platform: vi.fn(),
  isPlatform: vi.fn(),
}))

import { isPlatform, platform } from '@molecule/app-platform'

import { usePlatform, type UsePlatformResult } from '../use-native.js'

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

/** Exposes the hook's result for the mounted component. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-platform-probe',
  template: '',
})
class PlatformProbeComponent {
  readonly platform: UsePlatformResult = usePlatform()
}

/**
 * Mounts the probe against the current mocks.
 *
 * @returns The mounted fixture.
 */
function mount(): ComponentFixture<PlatformProbeComponent> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [PlatformProbeComponent],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(PlatformProbeComponent)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.mocked(platform).mockReturnValue(mockPlatformInfo)
  vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('web'))
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('usePlatform', () => {
  it('returns platform info fields', () => {
    const result = mount().componentInstance.platform

    expect(result.platform).toBe('web')
    expect(result.isWeb).toBe(true)
    expect(result.isNative).toBe(false)
    expect(result.isMobile).toBe(false)
    expect(result.isDesktop).toBe(false)
    expect(result.isDevelopment).toBe(true)
    expect(result.isProduction).toBe(false)
  })

  it('isPlatform delegates to module function', () => {
    const result = mount().componentInstance.platform

    expect(result.isPlatform('web')).toBe(true)
    expect(isPlatform).toHaveBeenCalledWith('web')

    expect(result.isPlatform('ios', 'android')).toBe(false)
    expect(isPlatform).toHaveBeenCalledWith('ios', 'android')
  })

  it('does not call platform() again on rerender', () => {
    const fixture = mount()

    const callCount = vi.mocked(platform).mock.calls.length
    // React's `rerender()` commits the same component again; Angular's is
    // another change-detection pass on the same component.
    fixture.detectChanges()

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

    const result = mount().componentInstance.platform

    expect(result.platform).toBe('ios')
    expect(result.isNative).toBe(true)
    expect(result.isMobile).toBe(true)
    expect(result.isWeb).toBe(false)
    expect(result.isProduction).toBe(true)
    expect(result.isPlatform('ios')).toBe(true)
    expect(result.isPlatform('web')).toBe(false)
  })

  it('returns correct values for desktop platform', () => {
    vi.mocked(platform).mockReturnValue({
      ...mockPlatformInfo,
      platform: 'electron',
      isNative: true,
      isDesktop: true,
      isWeb: false,
    })

    const result = mount().componentInstance.platform

    expect(result.platform).toBe('electron')
    expect(result.isNative).toBe(true)
    expect(result.isDesktop).toBe(true)
    expect(result.isWeb).toBe(false)
  })
})
