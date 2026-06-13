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
