import { describe, expect, it, vi } from 'vitest'

import { createProvider, IframePreviewProvider } from '../provider.js'

describe('@molecule/app-live-preview-iframe', () => {
  describe('constructor', () => {
    it('should create with default state', () => {
      const provider = new IframePreviewProvider()
      const state = provider.getState()

      expect(state.url).toBe('')
      expect(state.isLoading).toBe(false)
      expect(state.device).toBe('none')
      expect(state.error).toBeNull()
      expect(state.isConnected).toBe(false)
    })

    it('should accept custom defaults', () => {
      const provider = new IframePreviewProvider({
        defaultUrl: 'http://localhost:3000',
        defaultDevice: 'mobile',
      })
      const state = provider.getState()

      expect(state.url).toBe('http://localhost:3000')
      expect(state.device).toBe('mobile')
    })
  })

  describe('setUrl', () => {
    it('should update URL and set loading', () => {
      const provider = new IframePreviewProvider()
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.setUrl('http://localhost:5173')

      const state = callback.mock.calls[0][0]
      expect(state.url).toBe('http://localhost:5173')
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })
  })

  describe('getUrl', () => {
    it('should return current URL', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      expect(provider.getUrl()).toBe('http://localhost:3000')
    })
  })

  describe('refresh', () => {
    it('should increment refresh key', () => {
      const provider = new IframePreviewProvider()
      expect(provider.getRefreshKey()).toBe(0)

      provider.refresh()
      expect(provider.getRefreshKey()).toBe(1)

      provider.refresh()
      expect(provider.getRefreshKey()).toBe(2)
    })

    it('should set loading state and clear error', () => {
      const provider = new IframePreviewProvider()
      provider.notifyError('something failed')

      const callback = vi.fn()
      provider.subscribe(callback)

      provider.refresh()

      const state = callback.mock.calls[0][0]
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('reloads the CURRENT location (currentUrl), not the boot/load url', () => {
      // PV2: after navigating to /settings inside the preview, Refresh must reload
      // the route you are ON — not dump you back at the page you first opened.
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000/' })
      provider.recordNavigation('http://localhost:3000/settings')

      // Before refresh: the iframe's load target still points at the boot url
      // while the live route has moved ahead.
      expect(provider.getState().url).toBe('http://localhost:3000/')
      expect(provider.getState().currentUrl).toBe('http://localhost:3000/settings')

      provider.refresh()

      // After refresh: the load target is retargeted to the live route, so the
      // renderer reloads /settings (a real reload of where the user is).
      const state = provider.getState()
      expect(state.url).toBe('http://localhost:3000/settings')
      expect(state.currentUrl).toBe('http://localhost:3000/settings')
      expect(state.loadNonce).toBeGreaterThan(0)
    })
  })

  describe('setDevice', () => {
    it('should update device frame', () => {
      const provider = new IframePreviewProvider()
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.setDevice('tablet')

      const state = callback.mock.calls[0][0]
      expect(state.device).toBe('tablet')
    })
  })

  describe('navigateTo', () => {
    it('should append path to base URL', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.navigateTo('/about')

      expect(provider.getUrl()).toBe('http://localhost:3000/about')
    })

    it('should strip trailing slash from base URL', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000/' })
      provider.navigateTo('/contact')

      expect(provider.getUrl()).toBe('http://localhost:3000/contact')
    })

    it('should add leading slash if missing', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      provider.navigateTo('dashboard')

      expect(provider.getUrl()).toBe('http://localhost:3000/dashboard')
    })
  })

  describe('currentUrl', () => {
    it('should default currentUrl to the configured defaultUrl', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      expect(provider.getState().currentUrl).toBe('http://localhost:3000')
    })

    it('should default currentUrl to empty string with no config', () => {
      const provider = new IframePreviewProvider()
      expect(provider.getState().currentUrl).toBe('')
    })

    it('setUrl should optimistically update currentUrl to the load target', () => {
      const provider = new IframePreviewProvider()
      provider.setUrl('http://localhost:5173/foo')
      expect(provider.getState().currentUrl).toBe('http://localhost:5173/foo')
    })
  })

  describe('recordNavigation', () => {
    it('should update currentUrl (not the load target) and notify', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.recordNavigation('http://localhost:3000/about')

      const state = provider.getState()
      expect(state.currentUrl).toBe('http://localhost:3000/about')
      // The load target (iframe src) is unchanged — no reload.
      expect(state.url).toBe('http://localhost:3000')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should ignore a duplicate navigation (no notify)', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      const callback = vi.fn()
      provider.subscribe(callback)

      // currentUrl already equals defaultUrl
      provider.recordNavigation('http://localhost:3000')

      expect(callback).not.toHaveBeenCalled()
    })

    it.each([
      ['javascript: scheme', 'javascript:alert(1)'],
      ['data: scheme', 'data:text/html,<script>1</script>'],
      ['relative path', '/about'],
      ['empty string', ''],
      ['garbage', 'not a url'],
    ])('should ignore an unsafe/invalid URL: %s', (_label, badUrl) => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.recordNavigation(badUrl)

      expect(provider.getState().currentUrl).toBe('http://localhost:3000')
      expect(callback).not.toHaveBeenCalled()
    })

    it('should accept https URLs', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      provider.recordNavigation('https://example.com/page')
      expect(provider.getState().currentUrl).toBe('https://example.com/page')
    })

    it('strips the host internal _r cache-buster from the URL bar (PV2)', () => {
      // The renderer appends ?_r=<ts> to FORCE recovery reloads; the preview
      // echoes that full location.href back. It must not leak into the URL bar.
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000/' })
      provider.recordNavigation('http://localhost:3000/dashboard?_r=1718000000000')
      expect(provider.getState().currentUrl).toBe('http://localhost:3000/dashboard')
    })

    it('strips _r but preserves the app’s own query params + hash', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000/' })
      provider.recordNavigation('http://localhost:3000/list?tab=active&_r=42&page=2#row-9')
      expect(provider.getState().currentUrl).toBe(
        'http://localhost:3000/list?tab=active&page=2#row-9',
      )
    })

    it('strips _r before recording history (no _r leaks into Back/Forward)', () => {
      const provider = new IframePreviewProvider()
      provider.setUrl('http://localhost:3000/a')
      // A recovery reload reports the cache-busted href.
      provider.recordNavigation('http://localhost:3000/a?_r=999')
      // Cleaned to /a — which equals the existing entry, so it's a dedup no-op:
      // no phantom Back entry is created from the host's own cache-buster.
      expect(provider.canGoBack()).toBe(false)
      expect(provider.getState().currentUrl).toBe('http://localhost:3000/a')
    })
  })

  describe('navigation history (back/forward)', () => {
    it('starts with no history — back/forward are no-ops and flags are false', () => {
      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      expect(provider.canGoBack()).toBe(false)
      expect(provider.canGoForward()).toBe(false)

      const callback = vi.fn()
      provider.subscribe(callback)
      provider.back()
      provider.forward()
      expect(callback).not.toHaveBeenCalled()
      expect(provider.getState().canGoBack).toBe(false)
      expect(provider.getState().canGoForward).toBe(false)
    })

    it('records setUrl + reported navigations and walks back/forward', () => {
      const provider = new IframePreviewProvider()

      provider.setUrl('http://localhost:3000/')
      expect(provider.canGoBack()).toBe(false)

      provider.recordNavigation('http://localhost:3000/about')
      provider.recordNavigation('http://localhost:3000/contact')
      // Simulate the iframe finishing its load so isLoading is false — this lets
      // the assertion below prove Back does NOT flip it back to true (no reload).
      provider.notifyLoaded()

      // At /contact: can go back, not forward.
      let state = provider.getState()
      expect(state.currentUrl).toBe('http://localhost:3000/contact')
      expect(state.isLoading).toBe(false)
      expect(state.canGoBack).toBe(true)
      expect(state.canGoForward).toBe(false)

      // Back → /about. A client-side history move: the URL bar (currentUrl) +
      // nav flags update, but the load target (url), loadNonce, and isLoading stay
      // put — no cold reload. The renderer drives the nav via molecule:nav-command.
      const nonceBeforeBack = state.loadNonce
      provider.back()
      state = provider.getState()
      expect(state.currentUrl).toBe('http://localhost:3000/about')
      expect(state.url).toBe('http://localhost:3000/') // load target unchanged
      expect(state.loadNonce).toBe(nonceBeforeBack) // NOT a reload
      expect(state.isLoading).toBe(false)
      expect(state.canGoBack).toBe(true)
      expect(state.canGoForward).toBe(true)

      // Back → / (no further back).
      provider.back()
      state = provider.getState()
      expect(state.currentUrl).toBe('http://localhost:3000/')
      expect(state.canGoBack).toBe(false)
      expect(state.canGoForward).toBe(true)

      // Forward → /about.
      provider.forward()
      expect(provider.getState().currentUrl).toBe('http://localhost:3000/about')
      expect(provider.getState().canGoForward).toBe(true)
    })

    it('truncates the forward stack when a new navigation happens after going back', () => {
      const provider = new IframePreviewProvider()
      provider.setUrl('http://localhost:3000/a')
      provider.recordNavigation('http://localhost:3000/b')
      provider.recordNavigation('http://localhost:3000/c')

      provider.back() // → /b (forward stack holds /c)
      expect(provider.canGoForward()).toBe(true)

      // A fresh navigation from /b drops /c.
      provider.recordNavigation('http://localhost:3000/d')
      const state = provider.getState()
      expect(state.currentUrl).toBe('http://localhost:3000/d')
      expect(state.canGoForward).toBe(false)
      expect(state.canGoBack).toBe(true)

      // Forward is a no-op now.
      const callback = vi.fn()
      provider.subscribe(callback)
      provider.forward()
      expect(callback).not.toHaveBeenCalled()
    })

    it('does not add a history entry for a reload (consecutive duplicate)', () => {
      const provider = new IframePreviewProvider()
      provider.setUrl('http://localhost:3000/x')
      // Re-loading the same URL must not create a phantom back entry.
      provider.setUrl('http://localhost:3000/x')
      expect(provider.canGoBack()).toBe(false)
    })
  })

  describe('loadNonce (reload trigger)', () => {
    it('bumps on setUrl + refresh — but NOT on recordNavigation, back, or forward', () => {
      const provider = new IframePreviewProvider()
      expect(provider.getState().loadNonce).toBe(0)

      provider.setUrl('http://localhost:3000/a')
      expect(provider.getState().loadNonce).toBe(1)

      // recordNavigation is an in-app nav — the document already moved, no reload.
      provider.recordNavigation('http://localhost:3000/b')
      expect(provider.getState().loadNonce).toBe(1)

      provider.refresh()
      expect(provider.getState().loadNonce).toBe(2)

      // Back/Forward are client-side history moves (the renderer posts a
      // molecule:nav-command); they must NOT bump loadNonce / cold-reload.
      provider.back() // → /a
      expect(provider.getState().loadNonce).toBe(2)
      expect(provider.getState().currentUrl).toBe('http://localhost:3000/a')

      provider.forward() // → /b
      expect(provider.getState().loadNonce).toBe(2)
      expect(provider.getState().currentUrl).toBe('http://localhost:3000/b')
    })
  })

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const provider = new IframePreviewProvider()
      const callback = vi.fn()
      const unsubscribe = provider.subscribe(callback)

      provider.refresh()
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      provider.refresh()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should support multiple subscribers', () => {
      const provider = new IframePreviewProvider()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      provider.subscribe(cb1)
      provider.subscribe(cb2)

      provider.refresh()

      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })
  })

  describe('notifyLoaded', () => {
    it('should clear loading and set connected', () => {
      const provider = new IframePreviewProvider()
      provider.setUrl('http://localhost:3000')

      const callback = vi.fn()
      provider.subscribe(callback)

      provider.notifyLoaded()

      const state = callback.mock.calls[0][0]
      expect(state.isLoading).toBe(false)
      expect(state.isConnected).toBe(true)
      expect(state.error).toBeNull()
    })
  })

  describe('notifyError', () => {
    it('should set error and clear loading', () => {
      const provider = new IframePreviewProvider()
      provider.setUrl('http://localhost:3000')

      const callback = vi.fn()
      provider.subscribe(callback)

      provider.notifyError('Connection refused')

      const state = callback.mock.calls[0][0]
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Connection refused')
    })
  })

  describe('openExternal', () => {
    it('should call window.open with current URL', () => {
      const mockOpen = vi.fn()
      vi.stubGlobal('window', { open: mockOpen })

      const provider = new IframePreviewProvider({ defaultUrl: 'http://localhost:3000' })
      provider.openExternal()

      expect(mockOpen).toHaveBeenCalledWith(
        'http://localhost:3000',
        '_blank',
        'noopener,noreferrer',
      )
      vi.unstubAllGlobals()
    })

    it('should not call window.open when URL is empty', () => {
      const mockOpen = vi.fn()
      vi.stubGlobal('window', { open: mockOpen })

      const provider = new IframePreviewProvider()
      provider.openExternal()

      expect(mockOpen).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })

  describe('createProvider', () => {
    it('should return an IframePreviewProvider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(IframePreviewProvider)
    })

    it('should pass config through', () => {
      const provider = createProvider({ defaultUrl: 'http://localhost:4000' })
      expect(provider.getUrl()).toBe('http://localhost:4000')
    })
  })
})
