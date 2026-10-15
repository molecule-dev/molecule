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

  // X1 sol-m10: the first visit's claim (clientsClaim) fired controllerchange
  // and reloaded the page under every fresh browser context.
  describe('reload on a worker change', () => {
    const saved = { window: globalThis.window, navigator: globalThis.navigator }
    const setUp = (
      controller: object | null,
    ): { sw: EventTarget & { controller: object | null }; reload: ReturnType<typeof vi.fn> } => {
      const sw = new EventTarget() as EventTarget & { controller: object | null }
      sw.controller = controller
      const reload = vi.fn()
      const win = new EventTarget() as EventTarget & { location: { reload: () => void } }
      win.location = { reload }
      Object.defineProperty(globalThis, 'window', {
        value: win,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: sw },
        configurable: true,
        writable: true,
      })
      registerPWA()
      return { sw, reload }
    }
    afterEach(() => {
      Object.defineProperty(globalThis, 'window', {
        value: saved.window,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: saved.navigator,
        configurable: true,
        writable: true,
      })
    })

    it('does not reload when the first worker claims a page that had none', () => {
      const { sw, reload } = setUp(null)
      sw.dispatchEvent(new Event('controllerchange'))
      expect(reload).not.toHaveBeenCalled()
      // A later change is a real update.
      sw.dispatchEvent(new Event('controllerchange'))
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads once when a page already under a worker gets a new one', () => {
      const { sw, reload } = setUp({})
      sw.dispatchEvent(new Event('controllerchange'))
      sw.dispatchEvent(new Event('controllerchange'))
      expect(reload).toHaveBeenCalledTimes(1)
    })
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
