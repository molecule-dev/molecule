/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — in a plain browser-less runtime (web)
 * and inside a Capacitor iOS shell (stubbed `window.Capacitor`).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isPlatform, onPlatform, platform, resetPlatformCache } from '../index.js'

/**
 * Runs the README example steps and returns what it logs.
 *
 * @returns The detected platform, store URL, and the two capability flags.
 */
const runExample = (): [string, string, boolean, boolean] => {
  const info = platform()
  const storeUrl = onPlatform({
    ios: () => 'https://apps.apple.com/app/id000000000',
    android: () => 'https://play.google.com/store/apps/details?id=dev.example.app',
    default: () => '/download',
  })
  const showInstallBanner = info.isWeb
  const canUseNativeShare = isPlatform('ios', 'android')
  return [info.platform, storeUrl, showInstallBanner, canUseNativeShare]
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetPlatformCache()
  })

  it('branches to the web fallback outside a native shell', () => {
    resetPlatformCache()
    expect(runExample()).toEqual(['web', '/download', true, false])
  })

  it('treats a mobile browser as web, not ios', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
    })
    resetPlatformCache()
    expect(runExample()).toEqual(['web', '/download', true, false])
  })

  it('branches to the iOS handler inside a Capacitor iOS shell', () => {
    vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'ios' } })
    resetPlatformCache()
    expect(runExample()).toEqual(['ios', 'https://apps.apple.com/app/id000000000', false, true])
  })
})
