// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the built-in web provider with
 * the browser's `navigator` / `matchMedia` values stubbed to an Android phone.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createWebDeviceProvider,
  getDeviceInfo,
  isStandalone,
  setProvider,
  supports,
} from '../index.js'

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects a mobile Chrome device, Web Share support, and a non-installed PWA', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_UA)
    Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true })
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)

    setProvider(createWebDeviceProvider())

    const device = getDeviceInfo()
    const layout = device.isMobile ? 'compact' : 'full'
    const showShareButton = supports('webShare')
    const showInstallBanner = !isStandalone()

    expect(device.type).toBe('mobile')
    expect(device.browser.name).toBe('Chrome')
    expect(device.os.name).toBe('Android')
    expect(layout).toBe('compact')
    expect(showShareButton).toBe(true)
    expect(showInstallBanner).toBe(true)
  })
})
