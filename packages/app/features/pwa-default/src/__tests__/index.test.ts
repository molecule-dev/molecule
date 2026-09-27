import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

/** Captured registerSW options, so a test can fire the PWA lifecycle callbacks. */
const swCallbacks = vi.hoisted(() => ({}) as Record<string, (...args: unknown[]) => unknown>)

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: Record<string, (...args: unknown[]) => unknown> = {}) => {
    Object.assign(swCallbacks, options)
    return () => {}
  },
}))

import { registerPWA } from '../index.js'

describe('@molecule/app-pwa-default', () => {
  it('exports a registerPWA function', () => {
    expect(typeof registerPWA).toBe('function')
    expect(registerPWA.name).toBe('registerPWA')
  })

  it('is a noop in non-browser environments (no window)', () => {
    expect(() => registerPWA()).not.toThrow()
  })

  // The banner test needs a real DOM. A per-file jsdom environment breaks the
  // `virtual:pwa-register` mock (the id only resolves through the mocker in
  // the node runner), so a JSDOM document is installed globally here instead.
  describe('update banner (real DOM via JSDOM)', () => {
    let closeDom: (() => void) | null = null

    beforeEach(() => {
      const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'https://app.test/',
      })
      globalThis.window = dom.window as unknown as Window & typeof globalThis
      globalThis.document = dom.window.document as unknown as Document
      closeDom = () => dom.window.close()
    })

    afterEach(() => {
      closeDom?.()
      closeDom = null
    })

    it('escapes t() values interpolated into the banner markup', () => {
      setProvider(
        createSimpleI18nProvider('en', [
          {
            code: 'en',
            name: 'English',
            direction: 'ltr',
            translations: {
              'pwa.updateAvailable': '<img src=x onerror="alert(1)"> Update available',
              'pwa.update': '"><script>alert(2)</script>',
            },
          },
        ]),
      )

      registerPWA()
      swCallbacks.onNeedRefresh?.()

      const banner = document.getElementById('pwa-update-banner')
      expect(banner).not.toBeNull()
      // Hostile markup in the locale strings renders as TEXT — the banner
      // minted no elements from it.
      expect(banner!.querySelector('img')).toBeNull()
      expect(banner!.querySelector('script')).toBeNull()
      const span = banner!.querySelector('span')
      expect(span!.textContent).toContain('<img src=x onerror="alert(1)"> Update available')
      const button = document.getElementById('pwa-update-btn')
      expect(button!.textContent).toContain('"><script>alert(2)</script>')
    })
  })
})
